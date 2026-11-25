"""Paper #34 (SVTRv2, ICCV 2025): the authors' SVTRv2 model code (OpenOCR, pinned commit) trained on our Bangla
plate crops, with the paper's multi-size resizing (MSR) or a fixed 32 x 128 input.

  python p34_svtrv2.py setup --dir /kaggle/working/openocr --fetch T S   (clone the pinned commit, get the English weights)
  python p34_svtrv2.py train --size T --resize msr --name svtrv2_t_msr --project runs --epochs 60 [--pretrained]
  python p34_svtrv2.py time --runs runs/svtrv2_t_msr runs/crnn ...       (batch-1 ms with nothing else on the GPU)

- Model: OpenOCR `openrec.modeling.build_model` with the authors' SVTRv2-T / -S encoder settings
  (configs/rec/svtrv2/svtrv2_tiny_rctc.yml, svtrv2_small_rctc.yml) and the RCTC decoder = the feature rearrangement
  module (FRM) + CTC classifier (paper p.4). The semantic guidance module (SGM, p.4-5) is a training-only second phase
  in the paper; it is left out here (plate text has almost no language context, see the notes).
- Classes: one per Bangla plate token (district, মেট্রো, letter, digit; lprkit/vocab.py), CTC blank = 0, so the model
  never has to spell conjuncts (the same labels as seq.py's CRNN).
- MSR (paper p.3): aspect ratio R = w / h of the crop -> 64x64 (R < 1.5), 48x96 (1.5 <= R < 2.5), 40x112
  (2.5 <= R < 3.5), 32 x (floor(R) * 32) for R >= 3.5, capped at 32x128 (OpenOCR's max_ratio 4); every batch comes
  from one size bucket. Two-line plates (R ~ 1.5-2.2) keep their shape instead of being squashed to 32x128.
  --resize fixed = everything at 32x128 (the paper's Fixed32x128 ablation, Table 1, p.6).
- Training: AdamW lr 5e-4 (paper 6.5e-4 at batch 1024), weight decay 0.05, one-cycle with 7.5 % warm-up (paper
  1.5 of 20 epochs), batch 64, fp16, gradient clip 5; best epoch on val PLATE EXACT (ties: lower val loss). The
  26 Oct v1.1 run picked on val loss, which rises once CTC gets over-confident while accuracy still climbs, so it kept
  checkpoints from epochs 23-55 (fixed 32x128: epoch 23, at 93 % of the peak learning rate); its 100-epoch schedule
  was also cut at epoch 63-66 by the 1.6 h cap (about 90 s per epoch: the PIL augmentation on the shared Kaggle
  CPU, not the GPU). Hence 60 epochs, crops cached in RAM, and the `time` mode after all training.
- --pretrained: the authors' English Union14M-Filter weights (Google Drive folders in configs/rec/svtrv2/readme.md);
  the encoder and the FRM head are loaded, the classifier is new. If the download fails the run trains from scratch.
- Output like seq.py: results.json (ocr_test with by_condition / extra_tests, ms per plate), ocr_preds_test.csv and
  ocr_preds_val.csv (joins the paper #24 fusion), plate exact per MSR bucket and, for every run (also the fixed
  32x128 one), per MSR size group of the crop (`by_msr_group`: 64x64 = near-square, 48x96 = wider plates; both are
  mostly two-line plates in our data).
- `time` (run it after all training, nothing else on the GPU): batch-1 FP32 / FP16 model time per input size, and the
  mix of the test crops, for SVTRv2 runs and the CRNN; written into each run's results.json as `speed_alone`.
"""
import argparse
import csv
import glob
import os
import random
import subprocess
import sys
import time
from pathlib import Path

import cv2
import numpy as np
import torch
import torch.nn as nn

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common
import metrics
import seq
import vocab

REPO = 'https://github.com/Topdu/OpenOCR.git'
COMMIT = '1ccfc6ee6161f7133b192e16af3a9265273997ba'          # main, 21 Sep 2026
ENC = {   # the authors' configs: configs/rec/svtrv2/svtrv2_{tiny,small}_rctc.yml
    'T': dict(dims=[64, 128, 256], depths=[3, 6, 3], num_heads=[2, 4, 8]),
    'S': dict(dims=[96, 192, 384], depths=[3, 6, 3], num_heads=[3, 6, 12]),
    'B': dict(dims=[128, 256, 384], depths=[6, 6, 6], num_heads=[4, 8, 12]),
}
MIXER = {'T': [['Conv'] * 3, ['Conv', 'Conv', 'Conv', 'FGlobal', 'Global', 'Global'], ['Global'] * 3],
         'S': [['Conv'] * 3, ['Conv', 'Conv', 'Conv', 'FGlobal', 'Global', 'Global'], ['Global'] * 3],
         'B': [['Conv'] * 6, ['Conv', 'Conv', 'FGlobal', 'Global', 'Global', 'Global'], ['Global'] * 6]}
# the authors' Union14M-Filter weights (configs/rec/svtrv2/readme.md, "Config&Model&Log")
PRETRAINED = {'T': 'https://drive.google.com/drive/folders/12ZUGkCS7tEhFhWa2RKKtyB0tPjhH4d9s',
              'S': 'https://drive.google.com/drive/folders/1mOG3EUAOsmD16B-VIelVDYf_O64q0G3M',
              'B': 'https://drive.google.com/drive/folders/11u11ptDzQ4BF9RRsOYdZnXl6ell2h4jN'}
BUCKETS = [(64, 64), (48, 96), (40, 112), (32, 128)]


def setup(a):
    d = Path(a.dir)
    if not (d / 'openrec').exists():
        subprocess.run(['git', 'clone', '-q', REPO, str(d)], check=True)
    subprocess.run(['git', '-C', str(d), 'checkout', '-q', COMMIT], check=True)
    sys.path.insert(0, str(d))
    from openrec.modeling import build_model                      # noqa: F401  (import check)
    print('OpenOCR ready at', d, 'commit', COMMIT)
    for size in a.fetch:                                          # pre-download, so parallel jobs never race
        if os.environ.get('LPR_LOCAL_TEST'):
            print(f'SVTRv2-{size} English weights: skipped in a local test')
            continue
        try:
            print(f'SVTRv2-{size} English weights:', fetch_pretrained(size, common.WORK))
        except Exception as e:
            print(f'SVTRv2-{size} English weights NOT downloaded ({str(e)[:200]}): those runs train from scratch')


def openocr_path():
    d = os.environ.get('OPENOCR_DIR', os.path.join(common.WORK, 'openocr'))
    if not os.path.exists(os.path.join(d, 'openrec')):
        raise FileNotFoundError(f'OpenOCR not found at {d}: run `p34_svtrv2.py setup --dir {d}` first')
    sys.path.insert(0, d)
    return d


def build(size, n_out):
    from openrec.modeling import build_model
    cfg = {'model_type': 'rec', 'algorithm': 'SVTRv2', 'Transform': None,
           'Encoder': {'name': 'SVTRv2LNConvTwo33', 'use_pos_embed': False, **ENC[size], 'mixer': MIXER[size],
                       'local_k': [[5, 5], [5, 5], [-1, -1]], 'sub_k': [[1, 1], [2, 1], [-1, -1]],
                       'last_stage': False, 'feat2d': True},
           'Decoder': {'name': 'RCTCDecoder', 'out_channels': n_out}}
    return build_model(cfg)


def bucket(h, w, resize):
    if resize == 'fixed':
        return 3
    r = w / max(1, h)
    return 0 if r < 1.5 else 1 if r < 2.5 else 2 if r < 3.5 else 3


def fetch_pretrained(size, work):
    """download the authors' English checkpoint folder once (setup cell); returns the .pth path."""
    d = Path(work) / f'svtrv2_{size}_u14m'
    hits = lambda: sorted(glob.glob(str(d / '**' / 'best*.pth'), recursive=True) or glob.glob(str(d / '**' / '*.pth'), recursive=True))
    if not hits():
        try:
            import gdown
        except ImportError:
            subprocess.run([sys.executable, '-m', 'pip', 'install', '-q', 'gdown'], check=False)
            import gdown
        gdown.download_folder(PRETRAINED[size], output=str(d), quiet=True)
    return hits()[0]


def load_pretrained(model, size, work):
    """encoder weights of the authors' English model; returns a note for results.json."""
    if os.environ.get('LPR_LOCAL_TEST'):
        return 'skipped (local test: third-party checkpoints are only loaded on Kaggle)'
    try:
        f = fetch_pretrained(size, work)
        ck = torch.load(f, map_location='cpu', weights_only=True)
        sd = ck.get('state_dict', ck)
        # the released model was trained with SGM (GTCDecoder): its RCTC branch = our decoder; the classifier `fc`
        # (94 English characters) does not fit our token classes and stays new
        sd = {('decoder.' + k[len('decoder.ctc_decoder.'):] if k.startswith('decoder.ctc_decoder.') else k): v for k, v in sd.items()}
        own = model.state_dict()
        keep = {k: v for k, v in sd.items() if k in own and own[k].shape == v.shape}
        model.load_state_dict(keep, strict=False)
        n_enc = sum(k.startswith('encoder.') for k in keep)
        return (f'{os.path.basename(f)}: encoder {n_enc} of {sum(k.startswith("encoder.") for k in own)} tensors, '
                f'FRM head {len(keep) - n_enc} of {sum(k.startswith("decoder.") for k in own)} (classifier new)')
    except Exception as e:
        return f'failed ({str(e)[:160]}): trained from scratch'


class DS(torch.utils.data.Dataset):
    def __init__(self, rows, cls, resize, train):
        self.rows, self.idx, self.resize, self.train = rows, {c: i + 1 for i, c in enumerate(cls)}, resize, train
        self.b, self.g, self.imgs = [], [], []        # bucket used, MSR group of the crop, decoded crops (RAM cache)
        for r in rows:
            img = cv2.imread(r['path'])
            img = np.zeros((40, 120, 3), np.uint8) if img is None else img
            h, w = img.shape[:2]
            self.b.append(bucket(h, w, resize))
            self.g.append(bucket(h, w, 'msr'))
            self.imgs.append(img)
        import torchvision.transforms as T
        self.aug = T.Compose([T.RandomApply([T.RandomAffine(degrees=5, translate=(0.03, 0.05), scale=(0.9, 1.05), shear=5)], p=0.7),
                              T.RandomApply([T.ColorJitter(0.4, 0.4, 0.3, 0.05)], p=0.7),
                              T.RandomApply([T.GaussianBlur(3, sigma=(0.1, 1.2))], p=0.3)])

    def __len__(self):
        return len(self.rows)

    def __getitem__(self, i):
        from PIL import Image
        import torchvision.transforms.functional as TF
        r = self.rows[i]
        pil = Image.fromarray(self.imgs[i][:, :, ::-1])
        if self.train:
            pil = self.aug(pil)
        H, W = BUCKETS[self.b[i]]
        x = TF.normalize(TF.to_tensor(pil.resize((W, H), Image.BICUBIC)), [0.5] * 3, [0.5] * 3)
        if self.train and random.random() < 0.3:
            x = x + 0.04 * torch.randn_like(x)
        y = [self.idx[t] for t in vocab.text_tokens(r['text']) if t in self.idx]
        return x, torch.tensor(y, dtype=torch.long), i


class BucketSampler(torch.utils.data.Sampler):
    """batches of indices from one MSR size bucket (shuffled per epoch when training)."""
    def __init__(self, buckets, batch, shuffle):
        self.groups = {}
        for i, b in enumerate(buckets):
            self.groups.setdefault(b, []).append(i)
        self.batch, self.shuffle = batch, shuffle

    def batches(self):
        out = []
        for g in self.groups.values():
            g = g[:]
            if self.shuffle:
                random.shuffle(g)
            out += [g[k:k + self.batch] for k in range(0, len(g), self.batch)]
        if self.shuffle:
            random.shuffle(out)
        return out

    def __iter__(self):
        return iter(self.batches())

    def __len__(self):
        return sum((len(g) + self.batch - 1) // self.batch for g in self.groups.values())


def loader(rows, cls, resize, train, batch):
    ds = DS(rows, cls, resize, train)
    return torch.utils.data.DataLoader(ds, batch_sampler=BucketSampler(ds.b, batch, train), num_workers=common.WORKERS,
                                       collate_fn=seq.collate), ds


def decode(probs):
    """greedy CTC on probabilities (the RCTC head returns softmax in eval mode)."""
    best = probs.argmax(-1).cpu().numpy()
    pmax = probs.max(-1).values.cpu().numpy()
    out = []
    for s, p in zip(best, pmax):
        toks, cs, prev = [], [], 0
        for c, q in zip(s, p):
            if c != 0 and c != prev:
                toks.append(int(c)); cs.append(float(q))
            prev = c
        out.append((toks, float(np.prod(cs)) if cs else 0.0))
    return out


def epoch(model, dl, opt, sched, dev, scaler, train, cls=None):
    """mean CTC loss; for a val pass (train=False) also the plate exact % of the greedy decode."""
    model.train(train)
    ctc = nn.CTCLoss(blank=0, zero_infinity=True)
    tot = n = right = 0
    for x, ys, _ in dl:
        x = x.to(dev)
        with torch.set_grad_enabled(train), torch.autocast('cuda', enabled=dev.type == 'cuda'):
            out = model(x).float()
        # the RCTC head returns logits in train mode and probabilities in eval mode
        lp = (out.log_softmax(-1) if train else out.clamp_min(1e-8).log()).permute(1, 0, 2)
        loss = ctc(lp, torch.cat(ys).to(dev), torch.full((x.shape[0],), lp.shape[0], dtype=torch.long),
                   torch.tensor([len(y) for y in ys], dtype=torch.long))
        if train:
            opt.zero_grad(set_to_none=True)
            scaler.scale(loss).backward(); scaler.unscale_(opt)
            nn.utils.clip_grad_norm_(model.parameters(), 5.0)
            scaler.step(opt); scaler.update(); sched.step()
        else:     # the same text comparison as metrics.score_rows (token order normalised by tokens_to_text)
            txt = lambda ids: vocab.norm_text(vocab.tokens_to_text([cls[k - 1] for k in ids]))
            right += sum(txt(t) == txt(y.tolist()) for (t, _), y in zip(decode(out), ys))
        tot += float(loss.detach()) * x.shape[0]; n += x.shape[0]
    return (tot / max(1, n)) if train else (tot / max(1, n), 100 * right / max(1, n))


@torch.no_grad()
def predict(model, rows, cls, resize, dev):
    model.eval()
    dl, ds = loader(rows, cls, resize, False, 64)
    preds = [None] * len(rows)
    for x, _, ids in dl:
        for i, (t, c) in zip(ids, decode(model(x.to(dev)).float())):
            r = rows[i]
            preds[i] = {'file': r['file'], 'true': r['text'], 'pred': vocab.tokens_to_text([cls[k - 1] for k in t]),
                        'conf': round(c, 4), 'source': r['source'], 'bucket': '%dx%d' % BUCKETS[ds.b[i]],
                        'msr_group': '%dx%d' % BUCKETS[ds.g[i]]}
    ms = []
    for i in range(min(120, len(rows))):
        x = ds[i][0][None].to(dev)
        if dev.type == 'cuda':
            torch.cuda.synchronize()
        t0 = time.perf_counter(); model(x)
        if dev.type == 'cuda':
            torch.cuda.synchronize()
        ms.append(1000 * (time.perf_counter() - t0))
    return preds, float(np.median(ms[20:])) if len(ms) > 20 else float(np.median(ms or [0]))


def train(a):
    openocr_path()
    random.seed(a.seed); np.random.seed(a.seed); torch.manual_seed(a.seed)
    dev = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    run = Path(a.project) / a.name
    run.mkdir(parents=True, exist_ok=True)
    cls = seq.class_list()
    tr, va, te = seq.load_rows('train'), seq.load_rows('val'), seq.load_rows('test')[:a.max_test]
    if a.fraction < 1:
        random.Random(a.seed).shuffle(tr)
        tr, va = tr[:max(64, int(len(tr) * a.fraction))], va[:a.max_test]
    model = build(a.size, len(cls) + 1)
    note = load_pretrained(model, a.size, common.WORK) if a.pretrained else 'from scratch'
    print('init:', note, flush=True)
    model.to(dev)
    dl, dtr = loader(tr, cls, a.resize, True, a.batch)
    dv, _ = loader(va, cls, a.resize, False, a.batch)
    opt = torch.optim.AdamW(model.parameters(), lr=a.lr, weight_decay=0.05)
    sched = torch.optim.lr_scheduler.OneCycleLR(opt, max_lr=a.lr, total_steps=a.epochs * max(1, len(dl)), pct_start=0.075)
    scaler = torch.amp.GradScaler(enabled=dev.type == 'cuda')
    best, best_ep, log, t0 = (-1.0, 1e9), 0, [], time.time()
    for ep in range(a.epochs):
        tl = epoch(model, dl, opt, sched, dev, scaler, True)
        with torch.no_grad():
            vl, ve = epoch(model, dv, None, None, dev, scaler, False, cls)
        log.append({'epoch': ep + 1, 'train_loss': round(tl, 4), 'val_loss': round(vl, 4), 'val_exact_%': round(ve, 2)})
        if (ve, -vl) > (best[0], -best[1]):            # best val plate exact, ties -> lower val loss
            best, best_ep = (ve, vl), ep + 1
            torch.save(model.state_dict(), run / 'best.pt')
        print(f'epoch {ep + 1}/{a.epochs} train {tl:.4f} val {vl:.4f} val exact {ve:.2f}', flush=True)
        if a.max_hours and time.time() - t0 > a.max_hours * 3600:
            print(f'[time cap] {a.max_hours} h reached after epoch {ep + 1}: stopping', flush=True)
            break
    train_min = (time.time() - t0) / 60
    model.load_state_dict(torch.load(run / 'best.pt', map_location=dev))
    preds, ms = predict(model, te, cls, a.resize, dev)
    vpred, _ = predict(model, va, cls, a.resize, dev)
    root = common.find_dataset()
    sizes, groups = {}, {}
    for p in preds:
        sizes.setdefault(p['bucket'], []).append(p)
        groups.setdefault(p['msr_group'], []).append(p)
    r = {'run': a.name, 'kind': f'svtrv2-{a.size}', 'note': a.note,
         'settings': {'model': f'SVTRv2-{a.size} + RCTC (FRM), no SGM', 'resize': a.resize, 'epochs': a.epochs,
                      'batch': a.batch, 'lr': a.lr, 'optimizer': 'AdamW wd 0.05 + OneCycle 7.5 % warm-up',
                      'init': note, 'openocr_commit': COMMIT, 'train_rows': len(tr), 'seed': a.seed,
                      'train_buckets': {'%dx%d' % BUCKETS[b]: dtr.b.count(b) for b in sorted(set(dtr.b))}},
         'epochs_planned': a.epochs, 'epochs_run': len(log), 'train_minutes': round(train_min, 1),
         'best_epoch': best_ep, 'selected_on': 'val plate exact (ties: val loss)',
         'params_M': round(sum(p.numel() for p in model.parameters()) / 1e6, 2),
         'val_ocr': metrics.score_rows((p['pred'], p['true']) for p in vpred),
         'ocr_test': {'rows_decoder': metrics.score_rows((p['pred'], p['true']) for p in preds),
                      'ms_per_plate': round(ms, 2),
                      'by_source': {s: metrics.score_rows((p['pred'], p['true']) for p in preds if p['source'] == s)
                                    for s in sorted({p['source'] for p in preds})},
                      'by_bucket': {k: {**metrics.score_rows((p['pred'], p['true']) for p in v), 'n': len(v)}
                                    for k, v in sorted(sizes.items())},
                      'by_msr_group': {k: {**metrics.score_rows((p['pred'], p['true']) for p in v), 'n': len(v)}
                                       for k, v in sorted(groups.items())}},
         'log': log, 'env': common.env_info()}
    r['ocr_test']['by_condition'] = metrics.condition_scores(preds, root)
    r['ocr_test']['extra_tests'] = {}
    for sp in metrics.extra_splits(root):
        ep_, _ = predict(model, seq.load_rows(sp)[:a.max_test], cls, a.resize, dev)
        r['ocr_test']['extra_tests'][sp] = metrics.score_rows((p['pred'], p['true']) for p in ep_)
    common.save_json(r, run / 'results.json')
    for name, rows in (('test', preds), ('val', vpred)):
        with open(run / f'ocr_preds_{name}.csv', 'w', newline='', encoding='utf-8') as f:
            w = csv.DictWriter(f, fieldnames=['file', 'true', 'pred', 'conf', 'source', 'bucket', 'msr_group'])
            w.writeheader(); w.writerows(rows)
    print('DONE', a.name, r['ocr_test']['rows_decoder'], f'{train_min:.1f} min', r['ocr_test']['by_bucket'])


def time_runs(a):
    """batch-1 model time (median of 200 after 30 warm-up calls), FP32 and FP16, per input size, plus the mix of the
    test crops (weights = the run's by_bucket counts); call it when no other job uses the GPU."""
    openocr_path()
    dev = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    cls = seq.class_list()

    def med(fn):
        for _ in range(30):
            fn()
        ms = []
        for _ in range(200):
            if dev.type == 'cuda':
                torch.cuda.synchronize()
            t0 = time.perf_counter(); fn()
            if dev.type == 'cuda':
                torch.cuda.synchronize()
            ms.append(1000 * (time.perf_counter() - t0))
        return round(float(np.median(ms)), 3)

    for d in a.runs:
        f = Path(d) / 'results.json'
        if not f.exists():
            print('SKIP', d, '(no results.json)'); continue
        r = common.load_json(f)
        if r.get('kind', '').startswith('svtrv2'):
            m = build(r['kind'][-1], len(cls) + 1)
            m.load_state_dict(torch.load(Path(d) / 'best.pt', map_location='cpu', weights_only=True))
            shapes = {k: BUCKETS[i] for i, k in enumerate(['64x64', '48x96', '40x112', '32x128'])}
            shapes = {k: v for k, v in shapes.items() if r['settings']['resize'] == 'msr' or k == '32x128'}
            mix = {k: v['n'] for k, v in r['ocr_test'].get('by_bucket', {}).items()}
            chans = 3
        elif (Path(d) / 'model_full.pt').exists():                 # seq.py CRNN
            ck = torch.load(Path(d) / 'model_full.pt', map_location='cpu', weights_only=True)
            m = seq.CRNN(len(ck['classes']), ck['H']); m.load_state_dict(ck['state_dict'])
            shapes, mix, chans = {f"{ck['H']}x{ck['W']}": (ck['H'], ck['W'])}, None, 1
        else:
            print('SKIP', d, '(not an SVTRv2 or CRNN run)'); continue
        m = m.eval().to(dev)
        sp = {'device': torch.cuda.get_device_name(0) if dev.type == 'cuda' else 'cpu', 'batch': 1, 'per_size': {}}
        with torch.inference_mode():
            for k, (h, w) in shapes.items():
                x = torch.randn(1, chans, h, w, device=dev)
                sp['per_size'][k] = {'fp32_ms': med(lambda: m(x))}
                if dev.type == 'cuda':
                    m16, x16 = m.half(), x.half()
                    sp['per_size'][k]['fp16_ms'] = med(lambda: m16(x16))
                    m = m.float()
        for prec in ('fp32_ms', 'fp16_ms'):
            if mix and all(prec in sp['per_size'].get(k, {}) for k in mix):
                sp[f'test_mix_{prec}'] = round(sum(n * sp['per_size'][k][prec] for k, n in mix.items()) / sum(mix.values()), 3)
            elif not mix and prec in next(iter(sp['per_size'].values())):
                sp[f'test_mix_{prec}'] = next(iter(sp['per_size'].values()))[prec]
        r['speed_alone'] = sp
        common.save_json(r, f)
        print('speed', Path(d).name, sp, flush=True)


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('mode', choices=['setup', 'train', 'time'])
    p.add_argument('--runs', nargs='*', default=[], help='time: run folders (SVTRv2 runs and seq.py CRNN runs)')
    p.add_argument('--dir', default=os.path.join(common.WORK, 'openocr'))
    p.add_argument('--size', choices=list(ENC), default='T')
    p.add_argument('--resize', choices=['msr', 'fixed'], default='msr')
    p.add_argument('--pretrained', action='store_true')
    p.add_argument('--fetch', nargs='*', default=[], help='setup: also download the English weights of these sizes')
    p.add_argument('--epochs', type=int, default=60)
    p.add_argument('--batch', type=int, default=64)
    p.add_argument('--lr', type=float, default=5e-4)
    p.add_argument('--seed', type=int, default=42)
    p.add_argument('--fraction', type=float, default=1.0)
    p.add_argument('--max-test', type=int, default=None)
    p.add_argument('--max-hours', type=float, default=None)
    p.add_argument('--note', default='')
    p.add_argument('--name', default='svtrv2')
    p.add_argument('--project', default=os.path.join(common.WORK, 'runs'))
    a = p.parse_args()
    {'setup': setup, 'train': train, 'time': time_runs}[a.mode](a)

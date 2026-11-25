"""Sequence OCR on plate crops (ocr/{split}.csv): CRNN-CTC or a small ViTSTR, trained from the human plate texts.

  python seq.py --model crnn   --name crnn   --project runs --epochs 60
  python seq.py --model vitstr --name vitstr --project runs --epochs 60
  python seq.py ... --train-extra synth.csv      (extra training rows: file paths + text, e.g. synthetic plates)

Labels are TOKENS (district, মেট্রো, letter, digits; vocab.text_tokens), one class each, so Bangla conjuncts and
vowel signs never have to be spelled. Two-line plates: the crop is cut into top and bottom halves that are placed side
by side ("stack" = rows -> one line, so a left-to-right CTC can read the top row then the bottom row).
Writes results.json + ocr_preds_test.csv (for fusion, paper #24).
"""
import argparse
import csv
import json
import math
import os
import random
import sys
import time
from pathlib import Path

import cv2
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common
import metrics
import vocab


def load_rows(split, extra=None):
    root = common.find_dataset()
    rows = []
    with open(os.path.join(root, 'ocr', f'{split}.csv'), encoding='utf-8') as f:
        for r in csv.DictReader(f):
            rows.append({'path': os.path.join(root, 'ocr', 'images', split, r['file']), 'text': r['text'],
                         'source': r['source'], 'file': r['file']})
    if extra:
        with open(extra, encoding='utf-8') as f:
            for r in csv.DictReader(f):
                rows.append({'path': r['path'], 'text': r['text'], 'source': r.get('source', 'extra'), 'file': r['path']})
    return rows


def class_list():
    root = common.find_dataset()
    return json.load(open(os.path.join(root, 'vocab.json'), encoding='utf-8'))['classes']


def prep(img, H, W, stack, train, flip=False):
    """grey, optional augment, two-line stacking, aspect-kept resize + pad to H x W, float tensor."""
    g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if img.ndim == 3 else img
    if train:
        h, w = g.shape
        ang = random.uniform(-4, 4)
        M = cv2.getRotationMatrix2D((w / 2, h / 2), ang, random.uniform(0.92, 1.05))
        M[:, 2] += [random.uniform(-0.04, 0.04) * w, random.uniform(-0.05, 0.05) * h]
        g = cv2.warpAffine(g, M, (w, h), borderMode=cv2.BORDER_REPLICATE)
        g = np.clip(g.astype(np.float32) * random.uniform(0.6, 1.3) + random.uniform(-30, 30), 0, 255).astype(np.uint8)
        if random.random() < 0.3:
            k = random.choice([3, 5]); g = cv2.GaussianBlur(g, (k, k), 0)
        if random.random() < 0.3:
            g = np.clip(g + np.random.normal(0, random.uniform(3, 12), g.shape), 0, 255).astype(np.uint8)
        if random.random() < 0.2:
            s = random.uniform(0.35, 0.7)
            g = cv2.resize(cv2.resize(g, None, fx=s, fy=s), (g.shape[1], g.shape[0]))
        if flip:
            g = g[:, ::-1]
    h, w = g.shape
    if stack and w / max(1, h) < 2.6:                 # two-line plate -> one line
        top, bot = g[: h // 2], g[h // 2:]
        g = np.concatenate([top, cv2.resize(bot, (w, top.shape[0]))], 1)
        h, w = g.shape
    s = min(H / h, W / w)
    nh, nw = max(1, int(h * s)), max(1, int(w * s))
    canvas = np.full((H, W), 127, np.uint8)
    y0, x0 = (H - nh) // 2, (W - nw) // 2
    canvas[y0:y0 + nh, x0:x0 + nw] = cv2.resize(g, (nw, nh), interpolation=cv2.INTER_AREA)
    return torch.from_numpy(canvas).float().div(255).sub(0.5).div(0.5)[None]


class DS(torch.utils.data.Dataset):
    def __init__(self, rows, cls, H, W, stack, train, flip=False):
        self.rows, self.idx, self.H, self.W, self.stack, self.train, self.flip = rows, {c: i + 1 for i, c in enumerate(cls)}, H, W, stack, train, flip

    def __len__(self):
        return len(self.rows)

    def __getitem__(self, i):
        r = self.rows[i]
        img = cv2.imread(r['path'])
        if img is None:
            img = np.zeros((40, 120, 3), np.uint8)
        x = prep(img, self.H, self.W, self.stack, self.train, self.flip and random.random() < 0.5)
        y = [self.idx[t] for t in vocab.text_tokens(r['text']) if t in self.idx]
        return x, torch.tensor(y, dtype=torch.long), i


def collate(b):
    xs, ys, ids = zip(*b)
    return torch.stack(xs), list(ys), list(ids)


class CRNN(nn.Module):
    """VGG-style CNN -> height collapsed -> 2-layer BiLSTM -> per-column classes (CTC, class 0 = blank)."""
    def __init__(self, n_cls, H=48):
        super().__init__()
        def blk(i, o, pool):
            return [nn.Conv2d(i, o, 3, 1, 1), nn.BatchNorm2d(o), nn.ReLU(True)] + ([nn.MaxPool2d(pool)] if pool else [])
        self.cnn = nn.Sequential(*blk(1, 64, (2, 2)), *blk(64, 128, (2, 2)), *blk(128, 256, None),
                                 *blk(256, 256, (2, 1)), *blk(256, 384, None), *blk(384, 384, (2, 1)))
        self.rnn = nn.LSTM(384 * (H // 16), 256, num_layers=2, bidirectional=True, batch_first=True, dropout=0.2)
        self.fc = nn.Linear(512, n_cls + 1)

    def forward(self, x):
        f = self.cnn(x)                               # B, C, H/16, W/4
        b, c, h, w = f.shape
        f = f.permute(0, 3, 1, 2).reshape(b, w, c * h)
        return self.fc(self.rnn(f)[0])                # B, T, n+1


class ViTSTR(nn.Module):
    """ViTSTR-style: a small pretrained ViT (timm) reads the image; the first L output tokens are classified
    (position i -> token i of the plate, 0 = end/padding)."""
    def __init__(self, n_cls, H, W, L=12, name='vit_tiny_patch16_224'):
        super().__init__()
        import timm
        self.vit = timm.create_model(name, pretrained=True, img_size=(H, W), in_chans=1, num_classes=0)
        self.L = L
        self.head = nn.Linear(self.vit.num_features, n_cls + 1)

    def forward(self, x):
        f = self.vit.forward_features(x)              # B, 1+N, D
        return self.head(f[:, 1:self.L + 1])          # B, L, n+1


class SlotCNN(nn.Module):
    """fast-plate-ocr style (papers #18, #24): plain CNN on a 64x128 grey crop, then L fixed character slots, each a
    softmax over the alphabet (0 = empty slot). No CTC, no attention: very fast."""
    def __init__(self, n_cls, L=9, width=1.0):
        super().__init__()
        c = lambda x: int(x * width)
        def blk(i, o):
            return [nn.Conv2d(i, o, 3, 1, 1), nn.BatchNorm2d(o), nn.ReLU(True)]
        self.f = nn.Sequential(*blk(1, c(32)), nn.MaxPool2d(2), *blk(c(32), c(64)), nn.MaxPool2d(2),
                               *blk(c(64), c(128)), *blk(c(128), c(128)), nn.MaxPool2d(2),
                               *blk(c(128), c(256)), *blk(c(256), c(256)), nn.MaxPool2d(2),
                               nn.Conv2d(c(256), c(512), 1), nn.ReLU(True))
        self.L, self.n = L, n_cls + 1
        self.head = nn.Conv2d(c(512), L * (n_cls + 1), 1)

    def forward(self, x):
        y = self.head(self.f(x))                         # B, L*(n+1), h, w
        y = y.amax(dim=(2, 3))                           # global max pool (fast-plate-ocr)
        return y.view(x.shape[0], self.L, self.n)


def ctc_decode(logits):
    best = logits.argmax(-1).cpu().numpy()
    out, conf = [], []
    probs = logits.softmax(-1).max(-1).values.cpu().numpy()
    for seq, pr in zip(best, probs):
        toks, cs, prev = [], [], 0
        for k, (c, p) in enumerate(zip(seq, pr)):
            if c != 0 and c != prev:
                toks.append(int(c)); cs.append(float(p))
            prev = c
        out.append(toks); conf.append(float(np.mean(cs)) if cs else 0.0)
    return out, conf


def fixed_decode(logits):
    best = logits.argmax(-1).cpu().numpy()
    probs = logits.softmax(-1).max(-1).values.cpu().numpy()
    out, conf = [], []
    for seq, pr in zip(best, probs):
        toks, cs = [], []
        for c, p in zip(seq, pr):
            if c == 0:
                break
            toks.append(int(c)); cs.append(float(p))
        out.append(toks); conf.append(float(np.mean(cs)) if cs else 0.0)
    return out, conf


def run_epoch(model, dl, opt, sched, kind, device, scaler, train):
    model.train(train)
    tot, n = 0.0, 0
    ctc = nn.CTCLoss(blank=0, zero_infinity=True)
    for x, ys, _ in dl:
        x = x.to(device)
        with torch.autocast('cuda', enabled=device.type == 'cuda'):
            out = model(x)
        out = out.float()
        if kind == 'crnn':
            lp = out.log_softmax(-1).permute(1, 0, 2)
            tgt = torch.cat([y for y in ys]).to(device)
            loss = ctc(lp, tgt, torch.full((x.shape[0],), lp.shape[0], dtype=torch.long),
                       torch.tensor([len(y) for y in ys], dtype=torch.long))
        else:
            L = out.shape[1]
            tgt = torch.zeros((x.shape[0], L), dtype=torch.long)
            for i, y in enumerate(ys):
                tgt[i, :min(L, len(y))] = y[:L]
            loss = F.cross_entropy(out.reshape(-1, out.shape[-1]), tgt.to(device).reshape(-1), label_smoothing=0.05)
        if train:
            opt.zero_grad(set_to_none=True)
            scaler.scale(loss).backward()
            scaler.unscale_(opt)
            nn.utils.clip_grad_norm_(model.parameters(), 5.0)
            scaler.step(opt); scaler.update(); sched.step()
        tot += float(loss.detach()) * x.shape[0]; n += x.shape[0]
    return tot / max(1, n)


@torch.no_grad()
def predict(model, rows, cls, kind, a, device):
    model.eval()
    ds = DS(rows, cls, a.H, a.W, a.stack, False)
    dl = torch.utils.data.DataLoader(ds, batch_size=64, shuffle=False, num_workers=min(2, common.WORKERS), collate_fn=collate)
    preds = []
    for x, ys, ids in dl:
        out = model(x.to(device)).float()
        toks, conf = ctc_decode(out) if kind == 'crnn' else fixed_decode(out)
        for i, t, c in zip(ids, toks, conf):
            text = vocab.tokens_to_text([cls[k - 1] for k in t])
            r = rows[i]
            preds.append({'file': r['file'], 'true': r['text'], 'pred': text, 'conf': round(c, 4), 'source': r['source']})
    # batch-1 latency
    ms = []
    for r in rows[:120]:
        x = ds[rows.index(r)][0][None].to(device)
        if device.type == 'cuda':
            torch.cuda.synchronize()
        t0 = time.perf_counter()
        model(x)
        if device.type == 'cuda':
            torch.cuda.synchronize()
        ms.append(1000 * (time.perf_counter() - t0))
    return preds, float(np.mean(ms[20:])) if len(ms) > 20 else 0.0


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--model', default='crnn', choices=['crnn', 'vitstr', 'slot'])
    p.add_argument('--name', required=True)
    p.add_argument('--project', required=True)
    p.add_argument('--epochs', type=int, default=60)
    p.add_argument('--batch', type=int, default=64)
    p.add_argument('--lr', type=float, default=None)
    p.add_argument('--H', type=int, default=48)
    p.add_argument('--W', type=int, default=256)
    p.add_argument('--no-stack', dest='stack', action='store_false')
    p.add_argument('--flip', action='store_true', help='random horizontal flip (only to show why it is wrong)')
    p.add_argument('--train-extra', default='', help='csv with path,text[,source] rows added to training')
    p.add_argument('--real-fraction', type=float, default=1.0, help='use only this fraction of the real train rows')
    p.add_argument('--seed', type=int, default=42)
    p.add_argument('--max-test', type=int, default=None)
    p.add_argument('--note', default='')
    a = p.parse_args()
    random.seed(a.seed); np.random.seed(a.seed); torch.manual_seed(a.seed)
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    run = Path(a.project) / a.name
    run.mkdir(parents=True, exist_ok=True)
    cls = class_list()
    tr = load_rows('train')
    if a.real_fraction < 1:
        random.Random(a.seed).shuffle(tr)
        tr = tr[:max(1, int(len(tr) * a.real_fraction))]
    n_real = len(tr)
    if a.train_extra:
        tr += load_rows('train', a.train_extra)[len(load_rows('train')):]
    va, te = load_rows('val'), load_rows('test')[:a.max_test]
    if a.model == 'crnn':
        model, lr = CRNN(len(cls), a.H), a.lr or 1e-3
    elif a.model == 'slot':
        a.H, a.W = (64, 128) if a.H == 48 else (a.H, a.W)
        a.stack = False                                   # the CNN sees the whole two-line plate
        model, lr = SlotCNN(len(cls)), a.lr or 1e-3
    else:
        a.H, a.W = (32, 256) if a.H == 48 else (a.H, a.W)
        model, lr = ViTSTR(len(cls), a.H, a.W), a.lr or 3e-4
    model.to(device)
    dl = torch.utils.data.DataLoader(DS(tr, cls, a.H, a.W, a.stack, True, a.flip), batch_size=a.batch, shuffle=True,
                                     num_workers=common.WORKERS, collate_fn=collate, drop_last=True)
    dv = torch.utils.data.DataLoader(DS(va, cls, a.H, a.W, a.stack, False), batch_size=a.batch, num_workers=min(2, common.WORKERS),
                                     collate_fn=collate)
    opt = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    sched = torch.optim.lr_scheduler.OneCycleLR(opt, max_lr=lr, total_steps=a.epochs * max(1, len(dl)), pct_start=0.1)
    scaler = torch.amp.GradScaler(enabled=device.type == 'cuda')
    t0, best, log = time.time(), 1e9, []
    for ep in range(a.epochs):
        tl = run_epoch(model, dl, opt, sched, a.model, device, scaler, True)
        with torch.no_grad():
            vl = run_epoch(model, dv, None, None, a.model, device, scaler, False)
        log.append({'epoch': ep + 1, 'train_loss': round(tl, 4), 'val_loss': round(vl, 4)})
        if vl < best:
            best = vl
            torch.save(model.state_dict(), run / 'best.pt')
        print(f'epoch {ep + 1}/{a.epochs} train {tl:.4f} val {vl:.4f}', flush=True)
    train_min = (time.time() - t0) / 60
    model.load_state_dict(torch.load(run / 'best.pt', map_location=device))
    preds, ms = predict(model, te, cls, a.model, a, device)
    vpred, _ = predict(model, va, cls, a.model, a, device)
    r = {'run': a.name, 'kind': a.model, 'note': a.note,
         'settings': {'epochs': a.epochs, 'batch': a.batch, 'lr': lr, 'input': [a.H, a.W], 'stack_two_lines': a.stack,
                      'flip': a.flip, 'train_rows': len(tr), 'real_rows': n_real, 'extra': a.train_extra,
                      'optimizer': 'AdamW + OneCycle', 'seed': a.seed},
         'train_minutes': round(train_min, 1), 'params_M': round(sum(p.numel() for p in model.parameters()) / 1e6, 2),
         'val_ocr': metrics.score_rows((p['pred'], p['true']) for p in vpred),
         'ocr_test': {'rows_decoder': metrics.score_rows((p['pred'], p['true']) for p in preds),
                      'ms_per_plate': round(ms, 2),
                      'by_source': {s: metrics.score_rows((p['pred'], p['true']) for p in preds if p['source'] == s)
                                    for s in sorted({p['source'] for p in preds})}},
         'log': log, 'env': common.env_info()}
    root = common.find_dataset()
    r['ocr_test']['by_condition'] = metrics.condition_scores(preds, root)
    r['ocr_test']['extra_tests'] = {}
    for sp in metrics.extra_splits(root):            # real fog crops, synthetic rain copies
        ep, _ = predict(model, load_rows(sp)[:a.max_test], cls, a.model, a, device)
        r['ocr_test']['extra_tests'][sp] = metrics.score_rows((p['pred'], p['true']) for p in ep)
    common.save_json(r, run / 'results.json')
    for name, rows in (('test', preds), ('val', vpred)):
        with open(run / f'ocr_preds_{name}.csv', 'w', newline='', encoding='utf-8') as f:
            w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
            w.writeheader(); w.writerows(rows)
    torch.save({'state_dict': model.state_dict(), 'kind': a.model, 'classes': cls, 'H': a.H, 'W': a.W,
                'stack': a.stack}, run / 'model_full.pt')
    print('DONE', a.name, r['ocr_test']['rows_decoder'], f'{train_min:.1f} min')


if __name__ == '__main__':
    main()

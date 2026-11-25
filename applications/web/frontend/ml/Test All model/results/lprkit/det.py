"""Train + test one plate DETECTOR (or character detector) with Ultralytics, then write results.json.

  python det.py --data det.yaml --model yolov8s.pt --name v8s --project runs
  python det.py --data det.yaml --model rtdetr-l.pt --rtdetr --optimizer AdamW --lr0 1e-4 --batch 8 --name rtdetr
  python det.py --data det.yaml --name v8s --project runs --fps-only [--trt] [--cpu]
  python det.py ... --stages '[{"epochs":12,"freeze":12,"hyp":{...}}, ...]'      (multi-stage schedule, paper #1)

The test split is used once, at the end, with best.pt (best on val). Speed is measured separately (--fps-only) on an
idle GPU at batch 1 so two trainings running at the same time do not distort it.
results.json: settings, epochs, best epoch, minutes, params, GFLOPs, val/test P R mAP50 mAP50-95, plate counts at
conf 0.25 (found %, correct %, recall by plate size, "IoU>0.7 accuracy" of paper #1), speed, versions.
"""
import argparse
import json
import os
import platform
import sys
import time
from pathlib import Path

import numpy as np
import torch
import yaml

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common


def iou_matrix(a, b):
    if len(a) == 0 or len(b) == 0:
        return np.zeros((len(a), len(b)))
    x1 = np.maximum(a[:, None, 0], b[None, :, 0]); y1 = np.maximum(a[:, None, 1], b[None, :, 1])
    x2 = np.minimum(a[:, None, 2], b[None, :, 2]); y2 = np.minimum(a[:, None, 3], b[None, :, 3])
    inter = np.clip(x2 - x1, 0, None) * np.clip(y2 - y1, 0, None)
    area = lambda z: (z[:, 2] - z[:, 0]) * (z[:, 3] - z[:, 1])
    return inter / (area(a)[:, None] + area(b)[None, :] - inter + 1e-9)


def split_files(data_yaml, split):
    d = yaml.safe_load(Path(data_yaml).read_text(encoding='utf-8'))
    src = Path(d['path']) / d[split]
    if src.suffix == '.txt':
        imgs = [Path(d['path']) / l.strip() for l in src.read_text(encoding='utf-8').splitlines() if l.strip()]
        img_dir = imgs[0].parent if imgs else src.parent
    else:
        img_dir = src
        imgs = sorted(p for p in img_dir.iterdir() if p.suffix.lower() in {'.jpg', '.jpeg', '.png'})
    lab = lambda p: Path(str(p.parent).replace('images', 'labels', 1)) / (p.stem + '.txt')
    return imgs, lab


def gt_boxes(label_file, w, h, cls=None):
    if not label_file.exists():
        return np.zeros((0, 4)), np.zeros(0, int)
    rows = [l.split() for l in label_file.read_text().splitlines() if l.strip()]
    if not rows:
        return np.zeros((0, 4)), np.zeros(0, int)
    c = np.array([int(r[0]) for r in rows])
    b = np.array([[float(v) for v in r[1:5]] for r in rows])
    xyxy = np.stack([(b[:, 0] - b[:, 2] / 2) * w, (b[:, 1] - b[:, 3] / 2) * h,
                     (b[:, 0] + b[:, 2] / 2) * w, (b[:, 1] + b[:, 3] / 2) * h], 1)
    return xyxy, c


def plate_counts(model, data_yaml, split, imgsz, device, conf=0.25, iou_thr=0.5, max_images=None):
    """Plain-language numbers at one working threshold (conf 0.25, IoU 0.5), plus:
       recall by plate size (COCO areas on the stored image: small < 32^2, medium < 96^2, large) and
       paper #1's metric: share of photos where EVERY plate has a box with IoU > 0.7 (iou70_acc_%), mean IoU."""
    imgs, lab = split_files(data_yaml, split)
    imgs = imgs[:max_images] if max_images else imgs
    tp = fp = fn = ok = 0
    size_tp, size_n = {'small': 0, 'medium': 0, 'large': 0}, {'small': 0, 'medium': 0, 'large': 0}
    iou70 = n_with_gt = 0
    ious = []
    src = {}
    for s in range(0, len(imgs), 32):                 # a list source is one batch in Ultralytics 8.4: feed in chunks
        for r in model.predict([str(p) for p in imgs[s:s + 32]], imgsz=imgsz, conf=conf, device=device, verbose=False):
            h, w = r.orig_shape
            g, _ = gt_boxes(lab(Path(r.path)), w, h)
            p = r.boxes.xyxy.cpu().numpy()
            order = np.argsort(-r.boxes.conf.cpu().numpy())
            m = iou_matrix(p[order], g)
            used, t = {}, 0
            for i in range(len(order)):
                j = int(np.argmax(m[i])) if m.shape[1] else -1
                if j >= 0 and m[i, j] >= iou_thr and j not in used:
                    used[j] = m[i, j]
                    t += 1
            tp, fp, fn = tp + t, fp + len(p) - t, fn + len(g) - t
            sname = Path(r.path).name.split('_')[0]
            sc = src.setdefault(sname, [0, 0, 0])
            sc[0] += t; sc[1] += len(g); sc[2] += 1
            ok += int(t == len(g) and t == len(p))
            for j, gb in enumerate(g):
                a = (gb[2] - gb[0]) * (gb[3] - gb[1])
                k = 'small' if a < 32 ** 2 else 'medium' if a < 96 ** 2 else 'large'
                size_n[k] += 1
                size_tp[k] += int(j in used)
            if len(g):
                n_with_gt += 1
                best = m.max(0) if m.shape[0] else np.zeros(len(g))
                ious.extend(best.tolist())
                iou70 += int(bool(np.all(best > 0.7)))
    return {'images': len(imgs), 'plates': tp + fn, 'found_%': round(100 * tp / max(1, tp + fn), 2),
            'correct_%': round(100 * tp / max(1, tp + fp), 2), 'img_all_ok_%': round(100 * ok / max(1, len(imgs)), 2),
            'recall_by_size_%': {k: (round(100 * size_tp[k] / size_n[k], 2) if size_n[k] else None) for k in size_n},
            'plates_by_size': size_n, 'iou70_acc_%': round(100 * iou70 / max(1, n_with_gt), 2),
            'mean_best_iou_%': round(100 * float(np.mean(ious)), 2) if ious else None, 'conf': conf, 'iou': iou_thr,
            'found_%_by_source': {k: {'found_%': round(100 * v[0] / max(1, v[1]), 2), 'plates': v[1], 'images': v[2]}
                                  for k, v in sorted(src.items())}}


def condition_metrics(model, data_yaml, imgsz, device, run_dir, max_images=None):
    """Test results per condition when the dataset has detection/conditions.json (498R All-in-One):
    real subsets (clear, night, blurry, small_plates) and synthetic rain / fog copies of the whole test split -> mAP;
    no_plate photos -> false-alarm rate (share of plate-free photos with a box at conf 0.25)."""
    y = yaml.safe_load(open(data_yaml, encoding='utf-8'))
    root = Path(y['path'])
    cfile = root / 'conditions.json'
    if not cfile.exists():
        return None
    cond = json.loads(cfile.read_text(encoding='utf-8'))
    out = {}
    tmp = Path(run_dir) / 'cond_yaml'
    tmp.mkdir(parents=True, exist_ok=True)
    jobs = [(k, v['list']) for k, v in cond['real'].items() if k != 'no_plate'] + \
           [(k, 'images/' + v['split']) for k, v in cond['synthetic'].items()]
    for name, test in jobs:
        f = tmp / f'{name}.yaml'
        f.write_text(yaml.safe_dump({**{k: y[k] for k in ('path', 'train', 'val', 'names') if k in y}, 'test': test}),
                     encoding='utf-8')
        try:
            out[name] = val_metrics(model, str(f), 'test', imgsz, device, Path(run_dir) / 'cond', batch=16)
            out[name]['plates'] = plate_counts(model, str(f), 'test', imgsz, device, max_images=max_images)['found_%']
        except Exception as e:                       # e.g. an empty subset
            out[name] = f'skipped: {e}'[:120]
    neg = [l.strip() for l in open(root / cond['real']['no_plate']['list'], encoding='utf-8') if l.strip()]
    neg = [str(root / l[2:]) for l in neg][:max_images]
    if neg:
        hits = 0
        for s in range(0, len(neg), 32):
            hits += sum(len(r.boxes) > 0 for r in model.predict(neg[s:s + 32], imgsz=imgsz, conf=0.25, device=device,
                                                                 verbose=False))
        out['no_plate'] = {'photos': len(neg), 'false_alarm_%': round(100 * hits / len(neg), 2)}
    return out


def val_metrics(model, data_yaml, split, imgsz, device, run_dir, batch=16):
    m = model.val(data=data_yaml, split=split, imgsz=imgsz, batch=batch, device=device, plots=True, workers=common.WORKERS,
                  project=str(run_dir), name=f'eval_{split}', exist_ok=True, verbose=False)
    b = m.box
    out = {'P': round(float(b.mp), 4), 'R': round(float(b.mr), 4), 'mAP50': round(float(b.map50), 4),
           'mAP50-95': round(float(b.map), 4)}
    try:
        out['speed_ms'] = {k: round(v, 2) for k, v in m.speed.items()}
    except Exception:
        pass
    return out


def prec(bits):
    """Ultralytics 8.4 uses quantize=16/32; older versions (e.g. the official YOLOv12 fork) use half=True."""
    try:
        from ultralytics.cfg import DEFAULT_CFG_DICT
        if 'quantize' in DEFAULT_CFG_DICT:
            return {'quantize': bits}
    except Exception:
        pass
    return {'half': bits == 16}


def load_model(weights, rtdetr=False):
    if rtdetr:
        from ultralytics import RTDETR
        return RTDETR(str(weights))
    from ultralytics import YOLO
    return YOLO(str(weights))


def legacy_onnx_export():
    """torch >= 2.9 exports with the new dynamo exporter unless told otherwise (it needs onnxscript); older
    Ultralytics code such as the official YOLOv12 fork does not say, so default it to the TorchScript exporter."""
    import inspect
    import torch.onnx as tox
    if getattr(tox.export, '_lpr_legacy', False) or 'dynamo' not in inspect.signature(tox.export).parameters:
        return
    orig = tox.export

    def export(*args, **kw):
        kw.setdefault('dynamo', False)
        return orig(*args, **kw)
    export._lpr_legacy = True
    tox.export = export


def measure_speed(weights, data_yaml, imgsz, device, rtdetr=False, n=200, trt=False, cpu=False):
    """Batch-1 latency on the test images: preprocess + inference + postprocess (NMS included for YOLOs).
    Per precision: ms_per_image / fps (mean), ms_median / fps_median, slow_calls (timed calls > 3x the median, should
    be 0) and ms_breakdown (median of each part). PyTorch letterboxes every photo to its own shape and the first call
    at a new shape is slow (FP16: ~0.6 s per new shape; it made the old FP16 means up to 8x too slow), so every timed
    photo is run once untimed first, per precision. TensorRT and ONNX use one fixed shape."""
    imgs = [str(p) for p in split_files(data_yaml, 'test')[0][:n]]
    out = {'batch': 1, 'imgsz': imgsz, 'images': len(imgs)}

    def bench(model, dev, kw, k):
        timed = imgs if dev != 'cpu' else imgs[:50]
        for f in timed if dev != 'cpu' else timed[:10]:          # warm-up: every letterbox shape seen once
            model.predict(f, imgsz=imgsz, device=dev, verbose=False, **kw)
        ms, parts = [], []
        for f in timed:
            r = model.predict(f, imgsz=imgsz, device=dev, verbose=False, **kw)[0]
            ms.append(sum(r.speed.values()))
            parts.append(r.speed)
        mean, med = float(np.mean(ms)), float(np.median(ms))
        out[k] = {'ms_per_image': round(mean, 2), 'fps': round(1000 / mean, 1),
                  'ms_median': round(med, 2), 'fps_median': round(1000 / med, 1),
                  'slow_calls': int(sum(m > 3 * med for m in ms)),
                  'ms_breakdown': {kk: round(float(np.median([p[kk] for p in parts])), 2) for kk in parts[0]}}

    if torch.cuda.is_available() and not cpu:
        out['device'] = torch.cuda.get_device_name(0)
        for bits in (32, 16):                           # Ultralytics 8.4: quantize=16/32 replaces half=True
            bench(load_model(weights, rtdetr), device, prec(bits), f'fp{bits}')
        if trt:
            try:
                eng = load_model(weights, rtdetr).export(format='engine', imgsz=imgsz, device=device, **prec(16))
                bench(load_model(eng, rtdetr), device, {}, 'tensorrt_fp16')
            except Exception as e:
                out['tensorrt_fp16'] = f'failed: {e}'[:300]
        if trt == 'int8':
            try:
                kw = {'quantize': 8} if 'quantize' in prec(16) else {'int8': True}
                eng = load_model(weights, rtdetr).export(format='engine', imgsz=imgsz, device=device, data=data_yaml,
                                                         fraction=0.3, **kw)
                m8 = load_model(eng, rtdetr)
                bench(m8, device, {}, 'tensorrt_int8')
                out['tensorrt_int8']['test_mAP50'] = round(float(m8.val(data=data_yaml, split='test', imgsz=imgsz, workers=common.WORKERS,
                                                           batch=1, device=device, verbose=False).box.map50), 4)
            except Exception as e:
                out['tensorrt_int8'] = f'failed: {e}'[:300]
    try:
        out['cpu_device'] = platform.processor() or 'cpu'
        legacy_onnx_export()
        onnx = load_model(weights, rtdetr).export(format='onnx', imgsz=imgsz, simplify=False, dynamic=False)
        bench(load_model(onnx, rtdetr), 'cpu', {}, 'cpu_onnx')
    except Exception as e:
        out['cpu_onnx'] = f'failed: {e}'[:300]
    return out


def add_time_cap(model, hours):
    """Safety net for the 12 h Kaggle limit: stop after the epoch that passes `hours` (epochs stay as set, unlike
    Ultralytics' own `time`, which re-plans the epoch count)."""
    if not hours:
        return
    t0 = time.time()

    def cb(trainer):
        if time.time() - t0 > hours * 3600:
            trainer.stop = True
            print(f'[time cap] {hours} h reached after epoch {trainer.epoch + 1}: stopping', flush=True)
    model.add_callback('on_fit_epoch_end', cb)


def train_once(a, weights, name, epochs, extra):
    model = load_model(weights, a.rtdetr)
    add_time_cap(model, a.max_hours)
    kw = dict(data=a.data, epochs=epochs, imgsz=a.imgsz, batch=a.batch, device=a.device, workers=a.workers,
              seed=a.seed, patience=a.patience, optimizer=a.optimizer, cache=a.cache if a.cache != 'none' else False,
              fraction=a.fraction, project=a.project, name=name, exist_ok=True, plots=True, verbose=True)
    if a.lr0 is not None:
        kw['lr0'] = a.lr0
    if a.time:
        kw['time'] = a.time
    kw.update(extra)
    model.train(**kw)
    return Path(a.project) / name


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--data', required=True)
    p.add_argument('--model', default='yolov8s.pt')
    p.add_argument('--rtdetr', action='store_true')
    p.add_argument('--name', required=True)
    p.add_argument('--project', required=True)
    p.add_argument('--epochs', type=int, default=100)
    p.add_argument('--imgsz', type=int, default=640)
    p.add_argument('--batch', type=int, default=16)
    p.add_argument('--device', default='0')
    p.add_argument('--workers', type=int, default=common.WORKERS)
    p.add_argument('--seed', type=int, default=42)
    p.add_argument('--patience', type=int, default=100)
    p.add_argument('--optimizer', default='SGD', help="SGD by default: Ultralytics 8.4 'auto' picks MuSGD (YOLO26)")
    p.add_argument('--lr0', type=float, default=None)
    p.add_argument('--time', type=float, default=None, help='hours; caps training time (Ultralytics adjusts epochs)')
    p.add_argument('--max-hours', type=float, default=None, help='stop after this many hours (keeps the epoch plan)')
    p.add_argument('--cache', default='none')
    p.add_argument('--fraction', type=float, default=1.0, help='<1 only for the quick test')
    p.add_argument('--hyp', default='{}', help='JSON of extra Ultralytics train arguments (augmentation etc.)')
    p.add_argument('--stages', default='', help='JSON list of {epochs, freeze, hyp}: trained one after another')
    p.add_argument('--labels', default='human+auto', help='which labels were used (written to results.json)')
    p.add_argument('--note', default='')
    p.add_argument('--fps-only', action='store_true')
    p.add_argument('--trt', nargs='?', const='fp16', default='', help='also TensorRT FP16 (--trt) or FP16+INT8 (--trt int8)')
    p.add_argument('--cpu', action='store_true')
    p.add_argument('--test-max', type=int, default=None, help='quick test: score only N test images')
    a = p.parse_args()

    from ultralytics import __version__ as ul_version
    run = Path(a.project) / a.name
    res_file = run / 'results.json'
    if a.fps_only:
        r = json.loads(res_file.read_text())
        r['speed'] = measure_speed(run / 'weights' / 'best.pt', a.data, a.imgsz, a.device, a.rtdetr, trt=a.trt, cpu=a.cpu)
        res_file.write_text(json.dumps(r, indent=2))
        print(a.name, 'speed:', json.dumps(r['speed']))
        return

    hyp = json.loads(a.hyp)
    t0 = time.time()
    stage_runs = []
    if a.stages:
        weights = a.model
        for i, st in enumerate(json.loads(a.stages)):
            extra = dict(hyp, **st.get('hyp', {}))
            if 'freeze' in st:
                extra['freeze'] = st['freeze']
            sname = f'{a.name}_stage{i + 1}'
            rd = train_once(a, weights, sname, st['epochs'], extra)
            weights = rd / 'weights' / 'best.pt'
            stage_runs.append(sname)
        run.mkdir(parents=True, exist_ok=True)
        (run / 'weights').mkdir(exist_ok=True)
        import shutil
        shutil.copy2(weights, run / 'weights' / 'best.pt')
        shutil.copy2(Path(a.project) / stage_runs[-1] / 'weights' / 'last.pt', run / 'weights' / 'last.pt')
        shutil.copy2(Path(a.project) / stage_runs[-1] / 'args.yaml', run / 'args.yaml')
        import pandas as pd
        logs = []
        for i, sname in enumerate(stage_runs):
            df = pd.read_csv(Path(a.project) / sname / 'results.csv')
            df.columns = [c.strip() for c in df.columns]
            df['stage'] = i + 1
            logs.append(df)
        log = pd.concat(logs, ignore_index=True)
        log['epoch'] = range(1, len(log) + 1)
        log.to_csv(run / 'results.csv', index=False)
    else:
        train_once(a, a.model, a.name, a.epochs, hyp)
        import pandas as pd
        log = pd.read_csv(run / 'results.csv')
        log.columns = [c.strip() for c in log.columns]
    train_min = (time.time() - t0) / 60
    key50 = [c for c in log.columns if 'mAP50(B)' in c][0]
    key95 = [c for c in log.columns if 'mAP50-95(B)' in c][0]
    fit = 0.1 * log[key50] + 0.9 * log[key95]

    best = load_model(run / 'weights' / 'best.pt', a.rtdetr)
    try:
        from ultralytics.utils.torch_utils import get_flops, get_num_params
        n_params, gflops = get_num_params(best.model), get_flops(best.model, imgsz=a.imgsz)
    except Exception:
        n_params, gflops = 0, 0
    r = {
        'run': a.name, 'labels': a.labels, 'note': a.note, 'stages': stage_runs,
        'settings': {**yaml.safe_load((run / 'args.yaml').read_text()), 'start_weights': a.model, 'hyp': hyp,
                     'stages': json.loads(a.stages) if a.stages else None},
        'epochs_planned': a.epochs, 'epochs_run': int(len(log)), 'best_epoch': int(log['epoch'].iloc[int(fit.idxmax())]),
        'train_minutes': round(train_min, 1), 'params_M': round(n_params / 1e6, 2), 'GFLOPs': round(float(gflops), 1),
        'val': val_metrics(best, a.data, 'val', a.imgsz, a.device, run),
        'test': val_metrics(best, a.data, 'test', a.imgsz, a.device, run),
        'test_plates': plate_counts(best, a.data, 'test', a.imgsz, a.device, max_images=a.test_max),
        'test_by_condition': condition_metrics(best, a.data, a.imgsz, a.device, run, max_images=a.test_max),
        'versions': {'ultralytics': ul_version, 'torch': torch.__version__, 'python': platform.python_version()},
        'train_device': torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'cpu',
        'peak_gpu_mem_GB': round(torch.cuda.max_memory_reserved() / 2 ** 30, 2) if torch.cuda.is_available() else None,
    }
    res_file.write_text(json.dumps(r, indent=2))
    print('DONE', a.name, '| test:', r['test'], '| plates:', r['test_plates'], f"| {r['train_minutes']} min")


if __name__ == '__main__':
    main()

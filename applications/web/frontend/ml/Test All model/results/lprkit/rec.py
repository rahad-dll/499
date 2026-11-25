"""Character-level YOLO OCR ("detect every Bangla token as an object", paper #2 style): train, test, read plates.

  python rec.py --data rec.yaml --model yolov8n.pt --name chars_v8n --project runs --epochs 100 --imgsz 320
  python rec.py --data rec.yaml --name chars_v8n --project runs --ocr-only        (score the OCR again)

After training: character-box mAP on the recognition test split, then every plate crop of ocr/test.csv is read:
tokens (district, মেট্রো, letter, digits) are joined two ways and scored against the human text:
  rows : words above, digits below (vocab.plate_text)  - our decoder
  xsort: all tokens left to right (what paper #2 describes)
Writes results.json (+ ocr_preds_test.csv with one line per plate for fusion, paper #24).
"""
import argparse
import csv
import json
import os
import platform
import sys
import time
from pathlib import Path

import numpy as np
import torch

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common
import metrics
import vocab
from det import add_time_cap, val_metrics


def read_csv(path):
    with open(path, encoding='utf-8') as f:
        return list(csv.DictReader(f))


def decode(names, xyxy, conf, cls, min_conf=0.25):
    keep = [(names[int(c)], b, float(s)) for b, s, c in zip(xyxy, conf, cls) if s >= min_conf]
    toks = [[n] + list(map(float, b)) for n, b, s in keep]
    text, ok = vocab.plate_text(toks)
    xs = ' '.join(n for n, b, s in sorted(keep, key=lambda k: (k[1][0] + k[1][2]) / 2))
    mean_conf = float(np.mean([s for _, _, s in keep])) if keep else 0.0
    return text, xs, ok, mean_conf


def read_plates(weights, split='test', imgsz=320, device='0', max_n=None, rtdetr=False):
    from ultralytics import YOLO
    root = common.find_dataset()
    rows = read_csv(os.path.join(root, 'ocr', f'{split}.csv'))[:max_n]
    model = YOLO(str(weights))
    names = model.names
    out, ms = [], []
    paths = [os.path.join(root, 'ocr', 'images', split, r['file']) for r in rows]
    for s in range(0, len(paths), 64):
        for r, res in zip(rows[s:s + 64], model.predict(paths[s:s + 64], imgsz=imgsz, conf=0.10, device=device,
                                                         verbose=False)):
            b = res.boxes
            text, xs, ok, mc = decode(names, b.xyxy.cpu().numpy(), b.conf.cpu().numpy(), b.cls.cpu().numpy())
            out.append({'file': r['file'], 'true': r['text'], 'pred': text, 'pred_xsort': xs, 'valid': ok,
                        'conf': round(mc, 4), 'source': r['source']})
    for p in paths[:100]:                                       # batch-1 latency per plate
        res = model.predict(p, imgsz=imgsz, device=device, verbose=False)[0]
        ms.append(sum(res.speed.values()))
    return out, float(np.mean(ms[10:])) if len(ms) > 10 else float(np.mean(ms or [0]))


def ocr_report(preds, ms):
    rep = {'rows_decoder': metrics.score_rows((p['pred'], p['true']) for p in preds),
           'xsort_decoder': metrics.score_rows((p['pred_xsort'], p['true']) for p in preds),
           'valid_format_%': round(100 * np.mean([p['valid'] for p in preds]), 2) if preds else 0,
           'ms_per_plate': round(ms, 2)}
    by_src = {}
    for src in sorted({p['source'] for p in preds}):
        by_src[src] = metrics.score_rows((p['pred'], p['true']) for p in preds if p['source'] == src)
    rep['by_source'] = by_src
    return rep


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--data', required=True)
    p.add_argument('--model', default='yolov8n.pt')
    p.add_argument('--name', required=True)
    p.add_argument('--project', required=True)
    p.add_argument('--epochs', type=int, default=100)
    p.add_argument('--imgsz', type=int, default=320)
    p.add_argument('--batch', type=int, default=32)
    p.add_argument('--device', default='0')
    p.add_argument('--workers', type=int, default=common.WORKERS)
    p.add_argument('--seed', type=int, default=42)
    p.add_argument('--optimizer', default='SGD')
    p.add_argument('--lr0', type=float, default=None)
    p.add_argument('--time', type=float, default=None)
    p.add_argument('--max-hours', type=float, default=None)
    p.add_argument('--fraction', type=float, default=1.0)
    p.add_argument('--hyp', default='{}')
    p.add_argument('--ocr-only', action='store_true')
    p.add_argument('--ocr-max', type=int, default=None)
    p.add_argument('--note', default='')
    a = p.parse_args()

    from ultralytics import YOLO, __version__ as ul_version
    run = Path(a.project) / a.name
    res_file = run / 'results.json'
    if not a.ocr_only:
        hyp = {'fliplr': 0.0, 'mosaic': 0.5, 'degrees': 3.0, 'shear': 2.0, 'scale': 0.3}   # never mirror text
        hyp.update(json.loads(a.hyp))
        model = YOLO(a.model)
        add_time_cap(model, a.max_hours)
        t0 = time.time()
        kw = dict(data=a.data, epochs=a.epochs, imgsz=a.imgsz, batch=a.batch, device=a.device, workers=a.workers,
                  seed=a.seed, optimizer=a.optimizer, fraction=a.fraction, project=a.project, name=a.name,
                  exist_ok=True, plots=True, verbose=True, patience=100, **hyp)
        if a.lr0 is not None:
            kw['lr0'] = a.lr0
        if a.time:
            kw['time'] = a.time
        model.train(**kw)
        import pandas as pd
        log = pd.read_csv(run / 'results.csv')
        log.columns = [c.strip() for c in log.columns]
        best = YOLO(run / 'weights' / 'best.pt')
        r = {'run': a.name, 'kind': 'char-yolo', 'note': a.note,
             'settings': {'start_weights': a.model, 'epochs': a.epochs, 'imgsz': a.imgsz, 'batch': a.batch,
                          'optimizer': a.optimizer, 'hyp': hyp},
             'epochs_planned': a.epochs, 'epochs_run': int(len(log)), 'train_minutes': round((time.time() - t0) / 60, 1),
             'val_boxes': val_metrics(best, a.data, 'val', a.imgsz, a.device, run, batch=32),
             'test_boxes': val_metrics(best, a.data, 'test', a.imgsz, a.device, run, batch=32),
             'versions': {'ultralytics': ul_version, 'torch': torch.__version__, 'python': platform.python_version()},
             'train_device': torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'cpu'}
    else:
        r = json.loads(res_file.read_text(encoding='utf-8'))
    preds, ms = read_plates(run / 'weights' / 'best.pt', 'test', a.imgsz, a.device, a.ocr_max)
    r['ocr_test'] = ocr_report(preds, ms)
    root = common.find_dataset()
    r['ocr_test']['by_condition'] = metrics.condition_scores(preds, root)
    r['ocr_test']['extra_tests'] = {}
    for sp in metrics.extra_splits(root):            # real fog crops, synthetic rain copies
        ep, _ = read_plates(run / 'weights' / 'best.pt', sp, a.imgsz, a.device, a.ocr_max)
        r['ocr_test']['extra_tests'][sp] = metrics.score_rows((p['pred'], p['true']) for p in ep)
    vpreds, _ = read_plates(run / 'weights' / 'best.pt', 'val', a.imgsz, a.device, a.ocr_max)
    r['ocr_val'] = metrics.score_rows((p['pred'], p['true']) for p in vpreds)
    for name, rows in (('test', preds), ('val', vpreds)):
        with open(run / f'ocr_preds_{name}.csv', 'w', newline='', encoding='utf-8') as f:
            w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
            w.writeheader()
            w.writerows(rows)
    res_file.write_text(json.dumps(r, indent=2, ensure_ascii=False), encoding='utf-8')
    print('DONE', a.name, '| boxes:', r.get('test_boxes'), '| OCR:', r['ocr_test']['rows_decoder'])


if __name__ == '__main__':
    main()

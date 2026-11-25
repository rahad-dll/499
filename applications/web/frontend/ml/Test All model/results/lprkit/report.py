"""Write results_vs_paper.md and pack the outputs zip at the end of a paper notebook.

paper_rows: list of (metric label, paper value as text, page, key) where key is a dotted path inside a run's
results.json (e.g. 'test.mAP50', 'ocr_test.rows_decoder.CER_%', 'speed.fp32.fps'); values in 0..1 for
P/R/mAP are shown in %. 'a|b' = the first of a, b with a number (e.g. 'speed.tensorrt_fp16.fps|speed.fp32.fps':
TensorRT, else PyTorch FP32 when the export failed); a fallback value is marked with its source, e.g. '52.90 (fp32)'.
"""
import glob
import json
import os
import shutil
import zipfile

try:
    from . import common
except ImportError:
    import common

PCT_KEYS = ('P', 'R', 'mAP50', 'mAP50-95', 'test_mAP50', 'test_mAP50-95')   # test_*: TensorRT INT8 scores


def get(d, key):
    for k in key.split('.'):
        if not isinstance(d, dict) or k not in d:
            return None
        d = d[k]
    return d


def fmt(v, key):
    if v is None:
        return '–'
    if isinstance(v, (int, float)):
        last = key.split('.')[-1]
        if last in PCT_KEYS and v <= 1.0:
            return f'{100 * v:.1f}'
        if isinstance(v, float):
            return f'{v:.4f}' if 0 < abs(v) < 0.1 else f'{v:.2f}'
        return str(v)
    return str(v)[:60]


def cell(d, key):
    """(text, used a fallback) for key 'a|b|...': the first alternative with a number; if none has one, the first value
    found (e.g. 'failed: ...' when the TensorRT export failed)."""
    alts = key.split('|')
    for i, k in enumerate(alts):
        v = get(d, k)
        if isinstance(v, (int, float)) and not isinstance(v, bool):
            return (fmt(v, k), False) if i == 0 else (f"{fmt(v, k)} ({k.split('.')[-2] if '.' in k else k})", True)
    v = next((x for x in (get(d, k) for k in alts) if x is not None), None)
    return fmt(v, alts[0]), False


def compare_table(runs_dir, paper_rows, runs, title, notes='', same_data=False):
    """key 'run::path' fills only that run's column (for rows that belong to one run)."""
    res = {}
    for r in runs:
        p = os.path.join(runs_dir, r, 'results.json')
        if os.path.exists(p):
            res[r] = common.load_json(p)
    cols = ['Metric', 'Paper (page)'] + list(res)
    lines = [f'# {title}', '', '| ' + ' | '.join(cols) + ' |', '|' + '---|' * len(cols)]
    fallbacks = []
    for label, pval, page, key in paper_rows:
        row = [label, f'{pval} ({page})' if page else str(pval)]
        only, k = key.split('::', 1) if key and '::' in key else (None, key)
        for r, d in res.items():
            if k and (only is None or only == r):
                text, fb = cell(d, k)
                row.append(text)
                if fb and k not in fallbacks:
                    fallbacks.append(k)
            else:
                row.append('')
        lines.append('| ' + ' | '.join(row) + ' |')
    for k in fallbacks:
        first, rest = k.split('|', 1)
        lines += ['', f'A value marked with (...) comes from `{rest}`: that run has no number at `{first}` '
                      '(e.g. the TensorRT export failed or was not run).']
    missing = [r for r in runs if r not in res]
    if missing:
        lines += ['', f'Runs without results.json (failed or not run): {", ".join(missing)}']
    if same_data:
        lines += ['', "Same data and split as the paper (its own published data / weights), so this IS a direct check of",
                  "the paper's numbers. Remaining differences come from software versions, hardware and randomness."]
    else:
        lines += ['', 'The paper used its own data; our numbers are on the 498R All-in-One test split (different data),',
                  'so the comparison shows the direction and size of the gap, not a head-to-head result.']
    if notes:
        lines += ['', notes]
    return '\n'.join(lines) + '\n'


def condition_table(runs_dir, runs):
    """Results by condition (498R condition test sets): detectors -> mAP50 % per subset and the false-alarm rate on
    plate-free photos; OCR models -> plate exact % per tag, on the real fog crops and on synthetic rain copies."""
    det_cols = ['clear', 'night', 'blurry', 'small_plates', 'rain_synth', 'fog_synth']
    det_rows, ocr_rows = [], []
    for r in runs:
        p = os.path.join(runs_dir, r, 'results.json')
        if not os.path.exists(p):
            continue
        d = common.load_json(p)
        c = d.get('test_by_condition')
        if isinstance(c, dict):
            cells = [fmt(get(c, f'{k}.mAP50'), 'mAP50') for k in det_cols]
            det_rows.append(f"| {r} | {fmt(get(d, 'test.mAP50'), 'mAP50')} | " + ' | '.join(cells) +
                            f" | {fmt(get(c, 'no_plate.false_alarm_%'), 'x')} |")
        o = get(d, 'ocr_test')
        if isinstance(o, dict) and (o.get('by_condition') or o.get('extra_tests')):
            b, e = o.get('by_condition') or {}, o.get('extra_tests') or {}
            base = get(o, 'rows_decoder.plate_exact_%')
            ocr_rows.append(f"| {r} | {fmt(base, 'x')} | " + ' | '.join(fmt(get(b, f'{k}.plate_exact_%'), 'x')
                                                                       for k in ('clear', 'night', 'blurry')) +
                            f" | {fmt(get(e, 'test_fog.plate_exact_%'), 'x')} | {fmt(get(e, 'test_rain_synth.plate_exact_%'), 'x')} |")
    out = []
    if det_rows:
        out += ['', '## Results by condition: detectors (test mAP50 %)', '',
                '| Run | all test | clear | night | blurry | small plates | rain (synthetic) | fog (synthetic) | '
                'false alarms on plate-free photos (%) |', '|' + '---|' * 9] + det_rows
    if ocr_rows:
        out += ['', '## Results by condition: plate readers (plate exact %)', '',
                '| Run | all test | clear | night | blurry | fog (real fog copies) | rain (synthetic) |',
                '|' + '---|' * 7] + ocr_rows
    if out:
        out += ['', 'Condition subsets are fixed for the whole team (detection/conditions.json, ocr/conditions.json); '
                    'rain and detection-fog copies are synthetic.']
    return '\n'.join(out) + ('\n' if out else '')


def pack(work, name, extra_globs=()):
    """Zip runs/*/(weights, results.json, args.yaml, results.csv, preds), logs, the md tables and env info."""
    zpath = os.path.join(work, f'{name}_outputs.zip')
    keep = ('results.json', 'args.yaml', 'results.csv', 'ocr_preds_test.csv', 'best.pt', 'last.pt', 'config.json',
            'model.safetensors', 'results.png', 'confusion_matrix.png', 'labels.jpg', 'BoxPR_curve.png')
    with zipfile.ZipFile(zpath, 'w', zipfile.ZIP_DEFLATED) as z:
        for f in glob.glob(os.path.join(work, 'runs', '**', '*'), recursive=True):
            ok_ext = ('.md', '.json', '.pt', '.ckpt', '.onnx', '.safetensors', '.csv', '.yaml')
            if os.path.isfile(f) and (os.path.basename(f) in keep or f.endswith(ok_ext)) and os.path.getsize(f) < 1.5e9:
                if '/eval_' in f.replace('\\', '/') and not f.endswith('.json'):
                    continue
                z.write(f, os.path.relpath(f, work))
        for pat in ('logs/*.log', '*.md', 'environment.json', 'code/*.py') + tuple(extra_globs):
            for f in glob.glob(os.path.join(work, pat)):
                z.write(f, os.path.relpath(f, work))
    print('packed', zpath, round(os.path.getsize(zpath) / 1e6, 1), 'MB')
    # small copy without model files, for the team GitHub repo (weights/ folder; web upload limit 25 MB per file)
    spath = os.path.join(work, f'{name}_results.zip')
    model_ext = ('.pt', '.ckpt', '.onnx', '.safetensors', '.engine', '.bin', '.pth')
    with zipfile.ZipFile(zpath) as src, zipfile.ZipFile(spath, 'w', zipfile.ZIP_DEFLATED) as dst:
        for n in src.namelist():
            if not n.endswith(model_ext) and not n.endswith('/predictions.json'):   # COCO predictions: 10-15 MB each
                dst.writestr(n, src.read(n))
    print('packed', spath, round(os.path.getsize(spath) / 1e6, 1), 'MB (no weights: for GitHub weights/)')
    return zpath

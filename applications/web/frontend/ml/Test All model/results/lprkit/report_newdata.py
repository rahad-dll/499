"""Collect the new-dataset runs into results/RESULTS.md, results/results_table.csv and results/results.json.

  * every finished run: test plate exact / char acc (fair test = real plates only, no plate shared with train),
    val plate exact, box mAP50 (char-YOLO), ms per plate, epochs, train minutes
  * the fair test has several crops per plate (Roboflow copies), so plate exact is also given per PLATE (mean over
    plates) with a 95 % cluster-bootstrap interval (resampling plates, 2,000 draws, seed 42)
  * V2-style vote of the fair readers (metrics.fuse 'MV-BM+format': majority of layout-valid readings, tie -> the
    reader that is best on val). Which readers join the vote is chosen on VAL (all subsets of >= 2 readers); test is
    scored once for the chosen subset. Oracle = any reader right.
  * published split: the same char-YOLOv8n recipe; its test is split into crops whose plate number is / is not in
    its own train split ("seen" / "unseen"), and real / synthetic
  * exact McNemar test between the best fair reader and each other reader on the same test crops (crop-level; the
    crops are not independent, so read p as optimistic)
Usage: <_dataset_build venv python> report.py
"""
import csv
import itertools
import json
import os
import random
import sys
from collections import defaultdict

sys.stdout.reconfigure(encoding='utf-8')
R = os.environ.get('NDT_ROOT', 'D:/498R/NewData_Training')         # on Kaggle the notebook sets NDT_* paths
sys.path.insert(0, os.environ.get('NDT_KIT', f'{R}/kit'))
import metrics  # noqa: E402
import vocab  # noqa: E402

RUNS = os.environ.get('NDT_RUNS', f'{R}/runs')
OUT = os.environ.get('NDT_OUT', f'{R}/results')
DATA = os.environ.get('NDT_DATA', f'{R}/data')
os.makedirs(OUT, exist_ok=True)
LABEL = {'chars_v8n': 'char-YOLOv8n, 320 px', 'chars_v10n': 'char-YOLOv10n, 320 px',
         'lpnr_v12n': 'LPNR char-YOLO12n, 640 px', 'crnn': 'CRNN-CTC', 'svtrv2_t_msr': 'SVTRv2-T (MSR)',
         'svtrv2_s_msr': 'SVTRv2-S (MSR)'}
STUDY = {'chars_v8n': 'YOLOv10 / Video-LPR studies', 'chars_v10n': 'YOLOv10 study',
         'lpnr_v12n': 'Cascaded-YOLO study', 'crnn': 'Super-resolution / LPLCv2 studies',
         'svtrv2_t_msr': 'SVTRv2 study', 'svtrv2_s_msr': 'SVTRv2 study'}


def rcsv(p):
    return list(csv.DictReader(open(p, encoding='utf-8-sig')))


def ok(pred, true):
    return vocab.norm_text(pred or '') == vocab.norm_text(true)


def plate_ci(rows, key=lambda r: ok(r['pred'], r['true'])):
    by = defaultdict(list)
    for r in rows:
        by[vocab.norm_text(r['true'])].append(key(r))
    plates = list(by.values())
    per = [sum(v) / len(v) for v in plates]
    mean = 100 * sum(per) / len(per)
    rng = random.Random(42)
    draws = []
    for _ in range(2000):
        s = [per[rng.randrange(len(per))] for _ in per]
        draws.append(100 * sum(s) / len(s))
    draws.sort()
    return round(mean, 2), round(draws[49], 2), round(draws[1949], 2), len(plates)


def mcnemar(a, b):
    x = sum(1 for i, j in zip(a, b) if i and not j)
    y = sum(1 for i, j in zip(a, b) if j and not i)
    return x, y, metrics.mcnemar_exact(x, y)


runs = {}
for var in ('fair', 'published'):
    d = f'{RUNS}/{var}'
    for name in sorted(os.listdir(d)) if os.path.isdir(d) else []:
        f = f'{d}/{name}/results.json'
        if os.path.exists(f):
            runs[(var, name)] = json.load(open(f, encoding='utf-8'))

table = []
for (var, name), r in runs.items():
    t = r['ocr_test']['rows_decoder']
    val = r.get('ocr_val') or r.get('val_ocr') or {}
    preds = rcsv(f'{RUNS}/{var}/{name}/ocr_preds_test.csv')
    pm, lo, hi, n_pl = plate_ci(preds)
    table.append(dict(split=var, run=name, model=LABEL.get(name, name), study=STUDY.get(name, ''),
                      test_crops=t['plates'], test_exact=t['plate_exact_%'], test_char_acc=t['char_acc_%'],
                      test_plates=n_pl, per_plate_exact=pm, ci95=f'{lo}-{hi}',
                      val_exact=val.get('plate_exact_%'), box_mAP50=(r.get('test_boxes') or {}).get('mAP50'),
                      ms_per_plate=r['ocr_test'].get('ms_per_plate'), epochs_run=r.get('epochs_run'),
                      train_minutes=r.get('train_minutes'), params_M=r.get('params_M')))
table.sort(key=lambda x: (x['split'], -(x['test_exact'] or 0)))
with open(f'{OUT}/results_table.csv', 'w', newline='', encoding='utf-8-sig') as fh:
    w = csv.DictWriter(fh, fieldnames=list(table[0].keys()))
    w.writeheader()
    w.writerows(table)

out = dict(table=table)

# ---- V2-style vote over fair readers (subset chosen on val)
fair_names = [n for (v, n) in runs if v == 'fair']
P = {}
for split in ('val', 'test'):
    for n in fair_names:
        P[(n, split)] = {r['file']: r for r in rcsv(f'{RUNS}/fair/{n}/ocr_preds_{split}.csv')}
if len(fair_names) >= 2:
    val_exact = {n: next(t['val_exact'] for t in table if t['split'] == 'fair' and t['run'] == n) or 0
                 for n in fair_names}
    best = max(fair_names, key=lambda n: val_exact[n])

    COMMON = {sp: sorted(set.intersection(*[set(P[(n, sp)]) for n in fair_names])) for sp in ('val', 'test')}
    for sp in ('val', 'test'):
        if any(len(P[(n, sp)]) != len(COMMON[sp]) for n in fair_names):
            print(f'WARNING: readers scored different {sp} crops; vote uses the {len(COMMON[sp])} they share')

    def vote(names, split):
        files = COMMON[split]
        rows = []
        for f in files:
            reads = [(n, P[(n, split)][f]['pred'], float(P[(n, split)][f].get('conf') or 0)) for n in names]
            rows.append(dict(file=f, true=P[(names[0], split)][f]['true'],
                             pred=metrics.fuse(reads, 'MV-BM+format', best_model=best if best in names else names[0])))
        return rows

    cands = []
    for k in range(2, len(fair_names) + 1):
        for sub in itertools.combinations(sorted(fair_names), k):
            rows = vote(list(sub), 'val')
            cands.append((100 * sum(ok(r['pred'], r['true']) for r in rows) / len(rows), -k, sub))
    cands.sort(reverse=True)
    vexact, _, chosen = cands[0]
    trows = vote(list(chosen), 'test')
    texact = 100 * sum(ok(r['pred'], r['true']) for r in trows) / len(trows)
    pm, lo, hi, n_pl = plate_ci(trows)
    files = COMMON['test']
    oracle =100 * sum(any(ok(P[(n, 'test')][f]['pred'], P[(n, 'test')][f]['true']) for n in fair_names)
                       for f in files) / len(files)
    best_test = [ok(P[(best, 'test')][f]['pred'], P[(best, 'test')][f]['true']) for f in files]
    vote_ok = {r['file']: ok(r['pred'], r['true']) for r in trows}
    x, y, p = mcnemar([vote_ok[f] for f in files], best_test)
    out['vote'] = dict(rule='MV-BM+format', chosen_on='val', readers=list(chosen), tie_reader=best,
                       val_exact=round(vexact, 2), test_exact=round(texact, 2), per_plate_exact=pm, ci95=f'{lo}-{hi}',
                       test_oracle=round(oracle, 2), vs_best_single=dict(best=best, vote_only_right=x,
                                                                         best_only_right=y, mcnemar_p=round(p, 4)),
                       top5_on_val=[dict(readers=list(c[2]), val_exact=round(c[0], 2)) for c in cands[:5]])
    # McNemar: best single (on test) vs each other
    best_t = max(fair_names, key=lambda n: next(t['test_exact'] for t in table if t['split'] == 'fair' and t['run'] == n))
    bt = [ok(P[(best_t, 'test')][f]['pred'], P[(best_t, 'test')][f]['true']) for f in files]
    out['mcnemar_vs_best_test_reader'] = {
        n: dict(zip(('best_only', 'other_only', 'p'), mcnemar(bt, [ok(P[(n, 'test')][f]['pred'], P[(n, 'test')][f]['true'])
                                                                   for f in files])))
        for n in fair_names if n != best_t}
    out['best_test_reader'] = best_t

# ---- published split: seen / unseen, real / synthetic
if ('published', 'chars_v8n') in runs:
    pub = f'{DATA}/published/ocr'
    train_txt = {vocab.norm_text(r['text']) for r in rcsv(f'{pub}/train.csv')}
    meta = {r['file']: r for r in rcsv(f'{pub}/test.csv')}
    preds = rcsv(f'{RUNS}/published/chars_v8n/ocr_preds_test.csv')
    groups = defaultdict(list)
    for r in preds:
        m = meta.get(r['file'])
        if m is None:
            continue
        seen = vocab.norm_text(r['true']) in train_txt
        groups[('real' if m['label_source'] == 'human' else 'synthetic', 'seen' if seen else 'unseen')].append(r)
        groups[('all', 'seen' if seen else 'unseen')].append(r)
        groups[('real' if m['label_source'] == 'human' else 'synthetic', 'all')].append(r)
    out['published_breakdown'] = {f'{a}/{b}': metrics.score_rows((r['pred'], r['true']) for r in rs)
                                  for (a, b), rs in sorted(groups.items())}

json.dump(out, open(f'{OUT}/results.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

# ---- markdown
L = ['# New-dataset training: results', '',
     f'Built by `scripts/report.py` from the run folders. Runs finished: {len(runs)}.', '',
     '## Fair split (no plate number in two splits; test = real plates only)', '',
     '| Reader | From the study | Test exact % (crops) | Per-plate exact % [95 % CI] | Char acc % | Val exact % '
     '| Box mAP50 | ms / plate | Epochs | Train min |', '|---|---|---|---|---|---|---|---|---|---|']
for t in table:
    if t['split'] == 'fair':
        L.append(f"| {t['model']} | {t['study']} | {t['test_exact']} | {t['per_plate_exact']} [{t['ci95']}] | "
                 f"{t['test_char_acc']} | {t['val_exact']} | {t['box_mAP50'] if t['box_mAP50'] is not None else '-'} | "
                 f"{t['ms_per_plate']} | {t['epochs_run'] or '-'} | {t['train_minutes']} |")
if 'vote' in out:
    v = out['vote']
    L += ['', f"**V2-style vote** ({v['rule']}, readers chosen on val: {', '.join(v['readers'])}; ties -> "
          f"{v['tie_reader']}): val {v['val_exact']} %, **test {v['test_exact']} %** (per plate {v['per_plate_exact']} "
          f"[{v['ci95']}]). Oracle (any reader right): {v['test_oracle']} %. Vote vs {v['vs_best_single']['best']}: "
          f"{v['vs_best_single']['vote_only_right']} crops only the vote reads, {v['vs_best_single']['best_only_right']} "
          f"only the single reader, McNemar p = {v['vs_best_single']['mcnemar_p']} (crop level, optimistic)."]
pubs = [t for t in table if t['split'] == 'published']
if pubs:
    L += ['', "## Published split (the dataset's own train / val / test)", '',
          '| Reader | Test exact % (crops) | Char acc % | Val exact % |', '|---|---|---|---|']
    for t in pubs:
        L.append(f"| {t['model']} | {t['test_exact']} | {t['test_char_acc']} | {t['val_exact']} |")
    if 'published_breakdown' in out:
        L += ['', '| Published test subset | Crops | Plate exact % | Char acc % |', '|---|---|---|---|']
        for k, s in out['published_breakdown'].items():
            L.append(f"| {k} | {s['plates']} | {s['plate_exact_%']} | {s['char_acc_%']} |")
open(f'{OUT}/RESULTS.md', 'w', encoding='utf-8').write('\n'.join(L) + '\n')
print('\n'.join(L))

# Best plate readers retrained on the "Bangla Plate Reading" dataset: results

**Run:** Kaggle, 2 x Tesla T4, started 23 Nov 2026 15:26, training wall time 4.95 h (notebook
`kaggle/newdata_kaggle.ipynb`, full run, `FAST = False`). Downloaded to `kaggle/After Train/` and checked on
24 Nov 2026. Every number below comes from the run files (`kaggle/After Train/extracted/runs/`) and from
`results/RESULTS.md`, `results/results.json`, `results/extra_stats.json`.

## 1. Checks done before reading any number

| Check | Result |
|---|---|
| Data = the checked split | yes: both SHA-1 tests in the notebook log match (fair 7,926 crops, published 7,936 crops) |
| Full run | yes: every YOLO reader ran 70 / 70 epochs, both SVTRv2 runs 60 / 60, CRNN 60; all 7 exit codes 0 |
| Same code as tested on this PC | yes: the 8 kit files in the output equal `NewData_Training/kit` (line endings only differ) |
| Full val / test scored | yes: every run read all 976 fair val and 974 fair test crops (published 1,371 / 740) |
| Labels | the plate texts in every prediction file equal this PC's build |
| Scores | plate exact recomputed from the prediction files = the reported numbers; the results table rebuilt on this PC is identical to Kaggle's; the vote recomputes to 89.01 % |

## 2. The data in one paragraph

"Bangla Plate Reading" (Kaggle, raahad) has 8,520 plate crops with character boxes, from BLPD and LPDB-A material.
It was cleaned like the team's own dataset (549 incomplete plates removed, 129 "চট্ট মেট্রো" labels fixed,
1,439 computer-made template plates kept in train only) and re-split so that **no plate number is in two splits**
(fair split: 5,976 train / 976 val / 974 test crops, 268 test plates, all real). The dataset's own split
(published) was kept for one comparison run. Important: this is **not a new set of plates**: 1,910 of its 1,937 real
plates are also in the team's All-in-One dataset (`New Dataset/NEW_DATASET_AUDIT.md`).

## 3. Each reader on the fair test (974 real crops, 268 plates)

| Reader (study it comes from) | Plate exact % (crops) | Per plate % [95 % CI] | Char acc % | Val exact % | ms / plate (T4) |
|---|---|---|---|---|---|
| LPNR char-YOLO12n, 640 px (Cascaded YOLO) | **83.88** | 81.32 [77.0-85.5] | 96.05 | 81.15 | 37.7 |
| char-YOLOv8n, 320 px (YOLOv10 / Video-based LPR) | **83.37** | 81.52 [77.2-85.8] | 96.17 | 80.43 | 14.3 |
| char-YOLOv10n, 320 px (YOLOv10) | 79.67 | 77.36 [72.5-82.0] | 96.12 | 80.12 | 12.6 |
| SVTRv2-S, MSR, English start weights (SVTRv2) | 78.85 | 75.57 [70.6-80.3] | 96.07 | 80.12 | 8.3 |
| SVTRv2-T, MSR, English start weights (SVTRv2) | 75.05 | 72.26 [67.4-77.2] | 94.92 | 77.05 | 8.1 |
| CRNN-CTC (Super-resolution / LPLCv2) | 55.44 | 49.72 [44.1-55.3] | 87.03 | 56.25 | 6.2 |

- **Best single reader: a tie** between LPNR char-YOLO12n and char-YOLOv8n (51 crops only YOLO12n reads, 46 only
  YOLOv8n reads, exact McNemar p = 0.68). char-YOLOv8n is 2.6 x faster.
- The **order of the readers is the same as on the team's All-in-One dataset** (YOLO12n >= YOLOv8n > YOLOv10n >
  SVTRv2-S > SVTRv2-T > CRNN). The two test sets are different, so the numbers themselves are not compared.
- The ms column was measured on Kaggle while the other GPU was training (shared CPU), so it is a rough guide only.

## 4. The V2-style vote (readers checking each other)

The vote rule of BanglaLPR V2 (majority of readings that fit the BRTA layout, tie -> best reader). Which readers vote
was chosen on **val** only (best: YOLOv10n + YOLOv8n + YOLO12n + SVTRv2-S, val 88.73 %); test was scored once.

| | Test plate exact % (crops) | Per plate % [95 % CI] |
|---|---|---|
| Vote (4 readers) | **89.01** | **86.71 [83.0-90.2]** |
| Best single reader (LPNR char-YOLO12n) | 83.88 | 81.32 [77.0-85.5] |
| Oracle (any of the 6 readers right) | 92.20 | - |

- Gain over the best single reader, plate as the unit (paired, 5,000 plate bootstrap draws): **+5.4 points, 95 % CI
  +3.1 to +7.9**. Over char-YOLOv8n: +5.2 [+2.9, +7.7]. On crops: 56 crops only the vote reads, 6 only YOLO12n.
- So the main idea of the team's system, cheap readers checking each other, **holds again on a second labelling
  and split** of Bangladeshi plates (+5 points here; V2 on the team's own test set gained about +4 points over its
  best single reader).
- By source: bd-lpr crops 93.10 % (vote) vs 87.69 % (YOLO12n); BLPD crops 84.02 % vs 79.22 %.

## 5. The dataset's own (published) split inflates the score

char-YOLOv8n trained on the published split, test = its 558 real test crops:

| Published test crops | Crops | Plates | Plate exact % (crops) | Per plate % |
|---|---|---|---|---|
| plate number also in its train split ("seen") | 233 | 191 | 90.56 | 91.40 |
| plate number not in its train split ("unseen") | 325 | 303 | 79.38 | 79.37 |

- Seen plates are read **+12.0 points better** (per plate; 95 % plate bootstrap CI +6.2 to +18.0). A model scored
  on the published split partly reads plates it has already seen in training.
- This repeats the team's Near-Duplicates study (seen +10.5 points on the KUET split) on a second public dataset.
- The overall published score (84.73 %) is not much above the fair one (83.37 %) only because 58 % of its real test
  crops are unseen plates and 182 of its 740 test crops are computer-made plates (read 86.81 %). Numbers on the
  published split should not be reported as accuracy on new plates.

## 6. Other findings

- **BLPD crops are harder for every reader**: 5-15 points lower than bd-lpr crops (e.g. YOLO12n 79.22 vs 87.69 %).
  All BLPD crops in this dataset are 640 x 640 squares (bd-lpr crops are wide).
- **CRNN is weak here** (55.44 %): its training loss falls to 0.04 while its val loss stays at about 0.44 from epoch
  30 on, so it over-fits. The cause was not tested (possible reasons: the 24 % computer-made plates in train, the
  square BLPD crops); it was not chosen for the vote.
- Box mAP50 of the character detectors: 0.90-0.92 (YOLO12n 0.904, YOLOv8n 0.922, YOLOv10n 0.920).

## 7. What can and cannot be claimed

- Can claim: on a cleaned, leak-free split of a public Bangla plate dataset, the best single readers reach about
  84 % exact plates; a vote of 4 readers reaches 89.0 % (+5.4 points per plate, CI +3.1 to +7.9); the dataset's
  published split rewards memorised plates (+12 points).
- Cannot claim: that these are new plates (1,910 of its 1,937 real plates, 98.6 %, are in the team's All-in-One
  dataset); any
  comparison of these numbers with V1/V2 numbers (different test set); scoring these models on the team's old test
  set (214 of its 302 plates are inside this dataset); any plate-detector result (this dataset has only crops).

## 8. Files

| Path | What |
|---|---|
| `kaggle/After Train/results.zip`, `notebook8b00aea1c0.ipynb`, `.log` | what Kaggle produced (kept as downloaded) |
| `kaggle/After Train/extracted/runs/fair/<reader>/` | weights (`weights/best.pt` or `best.pt`), results.json, val/test predictions |
| `kaggle/After Train/extracted/runs/published/chars_v8n/` | the published-split run |
| `results/RESULTS.md`, `results_table.csv`, `results.json` | the results table (rebuilt here, identical to Kaggle's) |
| `results/extra_stats.json` | plate-level statistics of sections 4-5 (`scripts/analyze_kaggle.py`) |

# New-dataset training: results

Built by `scripts/report.py` from the run folders. Runs finished: 7.

## Fair split (no plate number in two splits; test = real plates only)

| Reader | From the study | Test exact % (crops) | Per-plate exact % [95 % CI] | Char acc % | Val exact % | Box mAP50 | ms / plate | Epochs | Train min |
|---|---|---|---|---|---|---|---|---|---|
| LPNR char-YOLO12n, 640 px | Cascaded-YOLO study | 83.88 | 81.32 [77.0-85.49] | 96.05 | 81.15 | 0.904 | 37.73 | 70 | 133.7 |
| char-YOLOv8n, 320 px | YOLOv10 / Video-LPR studies | 83.37 | 81.52 [77.22-85.76] | 96.17 | 80.43 | 0.9218 | 14.3 | 70 | 39.7 |
| char-YOLOv10n, 320 px | YOLOv10 study | 79.67 | 77.36 [72.46-81.97] | 96.12 | 80.12 | 0.9204 | 12.55 | 70 | 45.7 |
| SVTRv2-S (MSR) | SVTRv2 study | 78.85 | 75.57 [70.64-80.28] | 96.07 | 80.12 | - | 8.26 | 60 | 77.3 |
| SVTRv2-T (MSR) | SVTRv2 study | 75.05 | 72.26 [67.37-77.23] | 94.92 | 77.05 | - | 8.06 | 60 | 97.8 |
| CRNN-CTC | Super-resolution / LPLCv2 studies | 55.44 | 49.72 [44.07-55.29] | 87.03 | 56.25 | - | 6.17 | - | 31.2 |

**V2-style vote** (MV-BM+format, readers chosen on val: chars_v10n, chars_v8n, lpnr_v12n, svtrv2_s_msr; ties -> lpnr_v12n): val 88.73 %, **test 89.01 %** (per plate 86.71 [83.04-90.24]). Oracle (any reader right): 92.2 %. Vote vs lpnr_v12n: 56 crops only the vote reads, 6 only the single reader, McNemar p = 0.0 (crop level, optimistic).

## Published split (the dataset's own train / val / test)

| Reader | Test exact % (crops) | Char acc % | Val exact % |
|---|---|---|---|
| char-YOLOv8n, 320 px | 84.73 | 95.58 | 85.7 |

| Published test subset | Crops | Plate exact % | Char acc % |
|---|---|---|---|
| all/seen | 309 | 90.29 | 97.35 |
| all/unseen | 431 | 80.74 | 94.27 |
| real/all | 558 | 84.05 | 95.09 |
| real/seen | 233 | 90.56 | 97.03 |
| real/unseen | 325 | 79.38 | 93.66 |
| synthetic/all | 182 | 86.81 | 97.22 |
| synthetic/seen | 76 | 89.47 | 98.43 |
| synthetic/unseen | 106 | 84.91 | 96.31 |

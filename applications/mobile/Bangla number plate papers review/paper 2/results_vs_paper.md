# Paper #3: ours vs. the paper

| Metric | Paper (page) | v8n_640 | v8n_416 | hybrid |
|---|---|---|---|---|
| Hybrid F1 (%) | 93 (p.6, Table II) | – | – | 4.19 |
| Hybrid precision (%) | 94 (p.6, Table II) | – | – | 13.81 |
| Hybrid recall (%) | 93 (p.6, Table II) | – | – | 2.47 |
| Hybrid FPS (CPU) | 30 (Ryzen 3 2200G) (p.6, Table II) | – | – | 13.30 |
| YOLO alone F1 (%) | 92 (p.6, Table II) | – | – | 95.25 |
| YOLO alone FPS (CPU) | 40 (p.6, Table II) | – | – | 22.30 |
| Haar alone F1 (%) | 73 (p.6, Table II) | – | – | 4.43 |
| Haar alone FPS (CPU) | 19 (p.6, Table II) | – | – | 21.70 |
| Vehicle YOLO -> our YOLO F1 (%) | - | – | – | 83.93 |
| Detector mAP50 (%) | not reported | 98.7 | 98.8 | – |
| Detector mAP50-95 (%) | not reported | 45.2 | 45.8 | – |
| Detector FPS T4 FP16 | - | – | 76.40 | – |
| Training time (min) | not reported | 108.20 | 102.50 | – |

The paper used its own data; our numbers are on the 498R All-in-One test split (different data),
so the comparison shows the direction and size of the gap, not a head-to-head result.

Their test is their own BRTA video; ours is the still-photo test split.

## Results by condition: detectors (test mAP50 %)

| Run | all test | clear | night | blurry | small plates | rain (synthetic) | fog (synthetic) | false alarms on plate-free photos (%) |
|---|---|---|---|---|---|---|---|---|
| v8n_416 | 98.8 | 99.0 | 97.4 | 98.1 | 88.6 | 86.1 | 97.7 | 5.00 |
| v8n_640 | 98.7 | 99.0 | 94.5 | 97.8 | 92.8 | 83.8 | 96.3 | 6.88 |

Condition subsets are fixed for the whole team (detection/conditions.json, ocr/conditions.json); rain and detection-fog copies are synthetic.

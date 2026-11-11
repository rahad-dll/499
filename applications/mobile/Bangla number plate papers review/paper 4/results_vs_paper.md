# Paper #27: ours vs. the paper

| Metric | Paper (page) | v10n | v10s | v8n | v8s | chars_v10n | chars_v8n |
|---|---|---|---|---|---|---|---|
| mAP50 (%) | - | 98.7 | 98.2 | 98.7 | 98.5 | – | – |
| mAP50-95 (%) | COCO: v10-N 38.5, v10-S 46.3, v8-N 37.3, v8-S 44.9 (p.7, Table 1) | 45.1 | 45.4 | 45.2 | 45.8 | – | – |
| End-to-end ms, TensorRT FP16 (T4) | v10-N 1.84, v10-S 2.49, v8-N 6.16, v8-S 7.07 (p.7, Table 1) | 6.00 | 7.08 | 6.87 | 8.19 | – | – |
| End-to-end ms, PyTorch FP16 | - | 243.04 | 191.99 | 15.18 | 18.11 | – | – |
| End-to-end ms, PyTorch FP32 | - | 12.28 | 13.69 | 11.07 | 11.87 | – | – |
| End-to-end ms, CPU ONNX | - | 61.50 | 140.07 | 110.76 | 267.50 | – | – |
| Params (M) | v10-N 2.3, v10-S 7.2 (p.7, Table 1) | 2.71 | 8.07 | 3.01 | 11.14 | – | – |
| GFLOPs | v10-N 6.7, v10-S 21.6 (p.7) | 8.50 | 24.90 | 8.20 | 28.60 | – | – |
| Small plates: recall (%) | - | 20.00 | 40.00 | 60.00 | 40.00 | – | – |
| Character detector plate exact (%) | - | – | – | – | – | 81.57 | 84.02 |
| Training time (min) | not reported | 159.40 | 152.60 | 105.90 | 123.70 | 27.80 | 31.80 |

The paper used its own data; our numbers are on the test split (different data),
so the comparison shows the direction and size of the gap, not a head-to-head result.

## Results by condition: detectors (test mAP50 %)

| Run | all test | clear | night | blurry | small plates | rain (synthetic) | fog (synthetic) | false alarms on plate-free photos (%) |
|---|---|---|---|---|---|---|---|---|
| v10n | 98.7 | 98.9 | 96.7 | 98.3 | 92.3 | 78.5 | 96.4 | 3.75 |
| v10s | 98.2 | 97.8 | 96.9 | 99.4 | 96.8 | 81.2 | 95.5 | 6.88 |
| v8n | 98.7 | 99.0 | 94.5 | 97.8 | 92.8 | 83.8 | 96.3 | 6.88 |
| v8s | 98.5 | 99.0 | 94.3 | 95.2 | 84.5 | 82.5 | 97.9 | 5.62 |

## Results by condition: plate readers (plate exact %)

| Run | all test | clear | night | blurry | fog (real fog copies) | rain (synthetic) |
|---|---|---|---|---|---|---|
| chars_v10n | 81.57 | 83.75 | 78.46 | 75.00 | 73.08 | 68.51 |
| chars_v8n | 84.02 | 87.71 | 73.85 | 75.00 | 73.08 | 71.27 |

Condition subsets are fixed for the whole team (detection/conditions.json, ocr/conditions.json); rain and detection-fog copies are synthetic.

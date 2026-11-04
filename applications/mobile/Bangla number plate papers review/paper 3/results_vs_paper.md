# Paper #26: ours vs. the paper

| Metric | Paper (page) | v12s_official | v12s_ultra | v11s | chars_v12n | chars_v11n |
|---|---|---|---|---|---|---|
| mAP50 (%) | - | 98.6 | 98.9 | 99.0 | – | – |
| mAP50-95 (%) | COCO: v12-S 48.0, v11-S 46.9 (p.5, Table 1) | 48.5 | 46.2 | 46.2 | – | – |
| T4 TensorRT FP16 ms | v12-S 2.61, v11-S 2.5 (p.5, Table 1) | – | 7.87 | 7.56 | – | – |
| T4 PyTorch FP16 ms (incl. NMS) | - | 232.96 | 153.37 | 162.99 | – | – |
| CPU ONNX ms | - | 281.32 | 175.55 | 184.53 | – | – |
| Params (M) / GFLOPs | v12-S 9.3 M / 21.4 G (p.5, Table 1) | 9.10 | 9.25 | 9.43 | – | – |
| GFLOPs | 21.4 (p.5) | 19.60 | 23.50 | 21.70 | – | – |
| Peak GPU memory (GB) | not reported | 7.94 | 7.75 | 5.19 | – | – |
| Character detector mAP50 | - | – | – | – | 92.3 | 96.2 |
| Character detector plate exact (%) | - | – | – | – | 82.80 | 83.56 |
| Training time (min) | not reported (600 epochs from scratch) (p.6) | 256.10 | 175.60 | 127.10 | 51.10 | 25.90 |

The paper used its own data; our numbers are on the 498R All-in-One test split (different data),
so the comparison shows the direction and size of the gap, not a head-to-head result.

On the T4 the official code cannot use FlashAttention (Ampere+ only) and falls back to plain attention.

## Results by condition: detectors (test mAP50 %)

| Run | all test | clear | night | blurry | small plates | rain (synthetic) | fog (synthetic) | false alarms on plate-free photos (%) |
|---|---|---|---|---|---|---|---|---|
| v11s | 99.0 | 99.2 | 95.6 | 98.2 | 93.2 | 86.3 | 97.6 | 8.75 |
| v12s_official | 98.6 | 99.0 | 91.0 | 96.8 | 95.2 | 88.2 | 97.4 | 8.12 |
| v12s_ultra | 98.9 | 99.2 | 98.4 | 99.2 | 93.2 | 83.1 | 97.5 | 10.00 |

## Results by condition: plate readers (plate exact %)

| Run | all test | clear | night | blurry | fog (real fog copies) | rain (synthetic) |
|---|---|---|---|---|---|---|
| chars_v11n | 83.56 | 87.92 | 78.46 | 67.86 | 69.23 | 69.59 |
| chars_v12n | 82.80 | 85.83 | 73.85 | 75.00 | 65.38 | 74.04 |

Condition subsets are fixed for the whole team (detection/conditions.json, ocr/conditions.json); rain and detection-fog copies are synthetic.

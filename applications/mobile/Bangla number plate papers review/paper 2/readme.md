# README.md — Paper #3: Bangla Licence-Plate Detectors and Hybrid-Pipeline Study

> **Document name:** `README.md`
> **Project:** 498R BanglaLPR — re-implementation of *"A Cloud-Based Hybrid Model for Real-Time Detection of BRTA-Approved Licence Plates Using YOLO Tiny and Haar Cascade"* (Paper #3, arXiv:2609.06507)
> **Author / maintainer:** Md. Yousuf
> **Date:** 18 October 2026
> **Full technical report:** [`Paper03_Report.md`](Paper03_Report.md)

This package contains two trained **YOLOv8n Bangla licence-plate detectors** (416 px and 640 px), the evaluation results, logs and code, and the comparison of the paper's *vehicle → Haar cascade* pipeline with single-stage detection. All numbers come from the saved run files in `paper03_results.zip`.

---

## Table of Contents

1. [At a Glance](#1-at-a-glance)
2. [What Is in This Package](#2-what-is-in-this-package)
3. [Quick Start](#3-quick-start)
4. [Model Cards](#4-model-cards)
5. [Results Summary](#5-results-summary)
6. [Choosing Between the Two Models](#6-choosing-between-the-two-models)
7. [Reproducing the Results](#7-reproducing-the-results)
8. [Limitations](#8-limitations)
9. [Differences from the Original Paper](#9-differences-from-the-original-paper)
10. [File Integrity](#10-file-integrity)
11. [Licence and Data Notes](#11-licence-and-data-notes)
12. [Citation](#12-citation)

---

## 1. At a Glance

| | |
|---|---|
| **Task** | Detect one class — `plate` — in photos of Bangladeshi vehicles |
| **Architecture** | YOLOv8n (3.01 M parameters), fine-tuned from COCO `yolov8n.pt` |
| **Models** | `best_v8n_416.pt` (3.5 GFLOPs) · `best_v8n_640.pt` (8.2 GFLOPs) |
| **Test mAP@0.5** | **98.80 %** (416 px) · **98.73 %** (640 px) |
| **Plates found (conf 0.25)** | 98.02 % (416 px) · 98.12 % (640 px) |
| **Best pipeline** | Plate YOLO on the whole image: **P 93.35 %, R 97.23 %, F1 95.25 %** |
| **Paper's design with generic Russian Haar cascade** | **F1 4.19 %** |
| **Detector speed (416 px, T4, batch 1)** | 106.4 FPS PyTorch FP32 · 177.4 FPS TensorRT FP16 |
| **Whole-pipeline CPU speed (4 threads)** | 22.3 FPS |
| **Training** | 60 epochs; 102.5 min (416 px) / 108.2 min (640 px) on a Tesla T4 |
| **Environment** | Python 3.13.15 · PyTorch 2.11.0+cu128 · Ultralytics 8.4.170 |

---

## 2. What Is in This Package

### 2.1 Files

| File | Size | Description |
|---|---|---|
| `README.md` | — | This guide |
| `Paper03_Report.md` | — | Full technical report |
| `best_v8n_416.pt` | 5.9 MiB | Plate detector trained at 416 px |
| `best_v8n_640.pt` | 5.9 MiB | Plate detector trained at 640 px |
| `paper03_results.zip` | 2.1 MiB | Results archive (no model weights) |
| `results_vs_paper.md` | — | Short ours-vs-paper table |

### 2.2 Contents of `paper03_results.zip`

```text
├── environment.json            # Python, PyTorch, CUDA, GPU and library versions
├── results_vs_paper.md         # ours vs the paper's reported numbers
├── runs/
│   ├── v8n_416/                # 416 px detector
│   │   ├── results.json        # val, test, per-condition and speed metrics
│   │   ├── results.csv         # per-epoch metrics (60 rows)
│   │   ├── args.yaml           # full Ultralytics training arguments
│   │   ├── results.png  BoxPR_curve.png  confusion_matrix.png  labels.jpg
│   │   └── cond_yaml/          # condition-subset test configs (clear, night, blurry,
│   │                           #   small_plates, rain_synth, fog_synth)
│   ├── v8n_640/                # same structure for the 640 px detector
│   └── hybrid/results.json     # four-pipeline results
├── logs/
│   ├── v8n_416.log  v8n_640.log    # training logs
│   ├── speed_v8n_416.log           # ONNX / TensorRT export and speed benchmark
│   └── hybrid.log                  # hybrid-test log
└── code/
    ├── p03_hybrid.py           # Paper #3 four-pipeline test
    ├── det.py                  # detector training, evaluation, speed benchmark
    ├── common.py               # shared helpers
    ├── report.py               # writes results_vs_paper.md and packs the zip
    └── metrics.py vocab.py seq.py rec.py ved.py   # team OCR toolkit; not used for Paper #3
```

---

## 3. Quick Start

### 3.1 Install

```bash
pip install "ultralytics==8.4.170"      # version used for training and evaluation
```

### 3.2 Detect plates in an image

Use the `imgsz` the model was trained at (416 for `best_v8n_416.pt`, 640 for `best_v8n_640.pt`) and `conf=0.25`, the threshold used for the plate-level numbers in the report.

```python
from ultralytics import YOLO

model = YOLO("best_v8n_640.pt")                       # or "best_v8n_416.pt"
result = model.predict("car.jpg", imgsz=640, conf=0.25, verbose=False)[0]

for box, conf in zip(result.boxes.xyxy.tolist(), result.boxes.conf.tolist()):
    x1, y1, x2, y2 = map(int, box)
    print(f"plate at ({x1},{y1})-({x2},{y2})  confidence {conf:.2f}")
```

The class map is `{0: "plate"}`.

### 3.3 Crop detected plates (optional margin)

```python
import cv2
from ultralytics import YOLO

model = YOLO("best_v8n_640.pt")
img = cv2.imread("car.jpg")
h, w = img.shape[:2]
pad = 0.10                                            # optional margin; set 0 for exact boxes

result = model.predict(img, imgsz=640, conf=0.25, verbose=False)[0]
for i, (x1, y1, x2, y2) in enumerate(result.boxes.xyxy.tolist()):
    bw, bh = x2 - x1, y2 - y1
    x1, x2 = max(0, int(x1 - pad * bw)), min(w, int(x2 + pad * bw))
    y1, y2 = max(0, int(y1 - pad * bh)), min(h, int(y2 + pad * bh))
    cv2.imwrite(f"plate_{i}.jpg", img[y1:y2, x1:x2])
```

### 3.4 Folder or video

```bash
yolo predict model=best_v8n_416.pt source=path/to/images imgsz=416 conf=0.25 save=True
yolo predict model=best_v8n_416.pt source=traffic.mp4   imgsz=416 conf=0.25 save=True
```

### 3.5 Export

```bash
yolo export model=best_v8n_416.pt format=onnx   imgsz=416 simplify=True
yolo export model=best_v8n_416.pt format=engine imgsz=416 half=True      # TensorRT FP16, NVIDIA GPU
```

The speed figures in Section 5.4 were measured with these two exports of the 416 px model.

### 3.6 Re-run the four-pipeline test

Needs the 498R BanglaLPR All-in-One dataset and an OpenCV 4.x build with Haar cascade support (`common.cv2_with_cascade()` installs OpenCV 4.x if the installed one has none).

```bash
python code/p03_hybrid.py --plate best_v8n_640.pt --data <path/to/detection/yaml> \
                          --name hybrid --project runs
```

`--max N` evaluates only the first N test images.

---

## 4. Model Cards

### 4.1 Shared details

| Item | Value |
|---|---|
| Model type | Single-stage object detector, YOLOv8n |
| Base weights | COCO-pretrained `yolov8n.pt` |
| Output | Boxes + confidence for class `plate` |
| Parameters | 3.01 M |
| Training data | 498R BanglaLPR All-in-One v1.0, detection split: 8,574 images (4,067 human-annotated + 4,507 auto-annotated; 466 backgrounds) |
| Validation data | 896 human-annotated images (99 backgrounds) |
| Test data | 1,153 human-annotated images, 1,011 plates, including 160 plate-free photos; scored once at the end |
| Optimiser | SGD, lr0 0.01, momentum 0.937, weight decay 5e-4, 60 epochs, batch 16, AMP, seed 42 |
| Augmentation | Mosaic (off for the last 10 epochs), HSV, translate 0.1, scale 0.5, flip-LR 0.5, erasing 0.4, RandAugment |
| Hardware | One Tesla T4 per model |
| Versions | Ultralytics 8.4.170, PyTorch 2.11.0+cu128, Python 3.13.15 |

### 4.2 `best_v8n_416.pt`

| Metric | Value |
|---|---|
| Input size | 416 × 416 |
| Compute | 3.5 GFLOPs |
| Checkpoint | epoch 53 of 60 |
| Training | 102.5 min · peak GPU memory 1.12 GB |
| Test P / R | 97.20 % / 96.24 % |
| Test mAP@0.5 / mAP@0.5:0.95 | 98.80 % / 45.78 % |
| Plates found (conf 0.25) | 98.02 % |
| False alarms on 160 plate-free photos | 5.00 % |
| Night / synthetic-rain mAP@0.5 | 97.4 % / 86.1 % |
| Speed (T4, batch 1) | 106.4 FPS FP32 · 76.4 FPS FP16 · 177.4 FPS TensorRT FP16 |

### 4.3 `best_v8n_640.pt`

| Metric | Value |
|---|---|
| Input size | 640 × 640 |
| Compute | 8.2 GFLOPs |
| Checkpoint | epoch 56 of 60 |
| Training | 108.2 min · peak GPU memory 2.59 GB |
| Test P / R | 97.22 % / 96.68 % |
| Test mAP@0.5 / mAP@0.5:0.95 | 98.73 % / 45.23 % |
| Plates found (conf 0.25) | 98.12 % |
| False alarms on 160 plate-free photos | 6.88 % |
| Night / synthetic-rain mAP@0.5 | 94.5 % / 83.8 % |
| Small-plates subset mAP@0.5 | 92.8 % |
| Speed | Not benchmarked in isolation |

### 4.4 Evaluated scope

Evaluated: still photos of Bangladeshi vehicles from the 498R sources; clear, night, blurry and small-plate subsets; synthetic rain and synthetic fog; 160 plate-free photos.

Not evaluated: plate-text reading (these models only localise plates), plates from other countries, real rain or fog, live video, other camera setups.

---

## 5. Results Summary

All numbers: 498R BanglaLPR All-in-One **test split** (1,153 photos), IoU ≥ 0.5 unless stated. Details are in [`Paper03_Report.md`](../../../report/Md.Yousuf/Paper03_Report.md).

### 5.1 Detector accuracy

| Metric | `v8n_416` | `v8n_640` |
|---|---|---|
| Precision | 97.20 % | 97.22 % |
| Recall | 96.24 % | 96.68 % |
| mAP@0.5 | 98.80 % | 98.73 % |
| mAP@0.5:0.95 | 45.78 % | 45.23 % |
| Plates found (conf 0.25) | 98.02 % | 98.12 % |
| Predictions correct | 93.93 % | 92.36 % |
| IoU ≥ 0.7 accuracy | 65.16 % | 65.86 % |
| Mean best IoU | 75.83 % | 76.40 % |

### 5.2 mAP@0.5 by condition (%)

| Run | All | Clear | Night | Blurry | Small plates | Rain (synthetic) | Fog (synthetic) | False alarms (160 plate-free photos) |
|---|---|---|---|---|---|---|---|---|
| `v8n_416` | 98.8 | 99.0 | 97.4 | 98.1 | 88.6 | 86.1 | 97.7 | 5.00 % |
| `v8n_640` | 98.7 | 99.0 | 94.5 | 97.8 | 92.8 | 83.8 | 96.3 | 6.88 % |

### 5.3 Pipelines compared with the paper

| Pipeline | Precision (%) | Recall (%) | **F1 (%)** | GPU FPS | CPU FPS (4 thr) |
|---|---|---|---|---|---|
| Plate YOLO, whole image | 93.35 | 97.23 | **95.25** | 94.1 | 22.3 |
| Haar cascade only (generic Russian) | 11.07 | 2.77 | 4.43 | — | 21.7 |
| Vehicle → Haar (paper's design) | 13.81 | 2.47 | 4.19 | 21.0 | 13.3 |
| Vehicle → plate YOLO | 84.18 | 83.68 | 83.93 | 39.0 | 6.5 |
| *Paper: YOLO Tiny v4* | *93* | *91* | *92* | *—* | *40* |
| *Paper: Haar cascade* | *75* | *70* | *73* | *—* | *19* |
| *Paper: hybrid* | *94* | *93* | *93* | *—* | *30* |

The paper's rows come from its own gate-camera video, its own Bangla Haar cascade and a protocol it does not fully define; our rows come from still photos and a generic Russian cascade. They show scale and direction, not a like-for-like comparison.

### 5.4 Detector-only speed (`v8n_416`, batch 1, 416 px, Tesla T4 / Xeon CPU)

| Backend | ms / image | FPS |
|---|---|---|
| PyTorch FP32 | 9.40 | 106.4 |
| PyTorch FP16 | 13.08 | 76.4 |
| TensorRT FP16 | 5.64 | 177.4 |
| ONNX, CPU (Xeon 2.0 GHz) | 113.20 | 8.8 |

---

## 6. Choosing Between the Two Models

Based on the test results in Section 5:

| Criterion | `best_v8n_416.pt` | `best_v8n_640.pt` |
|---|---|---|
| Overall mAP@0.5 | 98.80 % | 98.73 % |
| Compute | 3.5 GFLOPs | 8.2 GFLOPs |
| False alarms (160 plate-free photos) | 5.00 % | 6.88 % |
| Night mAP@0.5 | 97.4 % | 94.5 % |
| Synthetic-rain mAP@0.5 | 86.1 % | 83.8 % |
| Small-plates subset mAP@0.5 | 88.6 % | 92.8 % |
| Medium-plate found rate | 96.63 % | 97.38 % |

Each model was trained once and the condition subsets are small; differences of a few points come from single runs.

### Suggested use (derived from the table above)

| Situation | Suggested model | Reason from the results |
|---|---|---|
| GPU or CPU with limited compute, or false alarms matter | `best_v8n_416.pt` | 3.5 vs 8.2 GFLOPs; 5.00 % vs 6.88 % false alarms |
| Night scenes | `best_v8n_416.pt` | Night mAP@0.5 97.4 % vs 94.5 % (single run) |
| Small or distant plates | `best_v8n_640.pt` | Small-plates subset mAP@0.5 92.8 % vs 88.6 % (small subset; a larger input keeps more pixels on a small plate — a hypothesis not tested separately) |
| Feeding an OCR stage | Either | Mean best IoU is about 76 %, so check box tightness on your data first |

### Interpretation of the main results (hypotheses are labelled)

- **Evidence.** `veh+haar` recall (2.47 %) cannot exceed `haar` alone (2.77 %), so the Haar stage is the limiting step. The cascade used is OpenCV's Russian-plate cascade, not a Bangla-trained one. *Hypothesis:* its features do not match Bangla plates; training a Bangla cascade would test this.
- **Evidence.** In `veh+yolo`, a plate can only be found if a vehicle is detected first and the plate lies inside its box. *Hypotheses:* missed or clipped vehicle boxes, rescaling of crops and duplicate detections from overlapping boxes explain the recall and precision loss; counting plates inside vehicle boxes would test this.
- **Evidence.** Test mAP@0.5 is 98.8 % but test mAP@0.5:0.95 is 45–46 %: plates are found reliably but boxes are less tight. *Hypothesis:* the validation and test splits differ in source mix or annotation tightness; per-source mAP@0.5:0.95 would test this.

For the same plate detector, adding COCO vehicle boxes in front of it lowered F1 from 95.25 % to 83.93 % and CPU speed from 22.3 to 6.5 FPS in our tests (Section 5.3).

---

## 7. Reproducing the Results

### 7.1 Environment

Exact versions are in `environment.json` (Python 3.13.15, PyTorch 2.11.0+cu128, Ultralytics 8.4.170, OpenCV 4.14.0). Training used a Tesla T4.

### 7.2 Train

```bash
python code/det.py --data detection_all.yaml --model yolov8n.pt --imgsz 640 --epochs 60 \
                   --batch 16 --optimizer SGD --seed 42 --name v8n_640 --project runs --labels human+auto
python code/det.py --data detection_all.yaml --model yolov8n.pt --imgsz 416 --epochs 60 \
                   --batch 16 --optimizer SGD --seed 42 --name v8n_416 --project runs --labels human+auto
```

`det.py` scores the best-on-validation checkpoint once on the test split and writes `results.json`. The full argument set is in each `args.yaml`. The commands are taken from `args.yaml`, `results.json` and the scripts' argument parsers; adjust the data-yaml path to your copy of the dataset.

### 7.3 Speed benchmark

```bash
python code/det.py --data detection_all.yaml --name v8n_416 --project runs --fps-only --trt   # GPU + TensorRT
python code/det.py --data detection_all.yaml --name v8n_416 --project runs --fps-only --cpu   # CPU / ONNX
```

---

## 8. Limitations

1. One training run per model; run-to-run variation is not measured.
2. Condition subsets are small, and their sizes are not recorded in the saved results. The plate-size group "small" has 5 test plates.
3. Rain and fog test images are synthetic.
4. 4,507 of 8,574 training images use auto-generated labels; validation and test labels are human-made.
5. Test mAP@0.5:0.95 (45–46 %) is 13–14 points below validation mAP@0.5:0.95 (59–60 %); this was not investigated. Mean best IoU is about 76 %.
6. The saved hybrid result does not record which plate weights were used; the usage line in the script names the 640 px model, and the 416 px model was not run through the hybrid test.
7. Hybrid settings differ from the paper (vehicle confidence 0.5 vs 0.8; Haar minSize (24, 10) vs (60, 80); 464 px rounded to 480 by Ultralytics) and were not varied.
8. CPU speed: 22.3 FPS is a single run on 115 timed photos on an Intel Xeon @ 2.00 GHz, 4 threads. The ONNX-CPU figure (8.8 FPS) is one measurement; OpenVINO was not tested.
9. Only the 416 px model was benchmarked in isolation for detector speed.
10. Not replicated from the paper: dynamic retraining pipeline, cloud (Flask/RTSP) deployment, augmentation study, video evaluation. The paper's custom Haar cascade and dataset were not available.

---

## 9. Differences from the Original Paper

| Component | Paper | This study |
|---|---|---|
| Vehicle detector | YOLOv4-tiny | YOLOv8n, COCO classes car / motorcycle / bus / truck |
| Plate localiser | Custom BRTA Haar cascade | OpenCV generic Russian-plate cascade |
| Plate YOLO fine-tuning | Head layers only | All layers |
| Data | Own gate-camera video and phone images | Team's 498R BanglaLPR All-in-One still photos |
| Pipeline input size | 464 × 464 | Long side 464 px (rounded to 480 by Ultralytics) |
| CPU for speed | Ryzen 3 2200G, 3.5 GHz | Xeon 2.0 GHz, 4 threads |
| Deployment | Flask on cloud + RTSP | Offline evaluation |
| Retraining pipeline | Described | Not implemented |

---

## 10. File Integrity

SHA-256 of the files as supplied:

```text
6bcd0a4b02516b3a18c1b75ddf1135e96654ef0e6f45fd381f8d1ec6844e5e4b  best_v8n_640.pt
b1c6d35d92ea7f5d4f7c047c9a8006858bd40c6b37625a64258ee99555da109f  best_v8n_416.pt
082da4e93c6528bb0248ee8913c7206620e2ca42d134f6a4f2d940a27606fcc7  paper03_results.zip
```

```bash
sha256sum best_v8n_640.pt best_v8n_416.pt paper03_results.zip
```

`.pt` files are PyTorch pickle archives; load them only from sources you trust.

---

## 11. Licence and Data Notes

- **Software.** Ultralytics YOLO is released under AGPL-3.0 (with a separate enterprise licence); check its terms for your use of the weights.
- **Dataset.** The 498R BanglaLPR All-in-One dataset combines several sources (`kuet`, `lpdba`, `ridoykj`, `nightlpbd`, `mahedi`, `tusar`, `towniyan`). The licence terms of each source were not checked in this study; verify them before redistributing images. The dataset is not included in this package.
- **Privacy.** Licence plates can be personal data; follow the rules that apply where you use these models.
- **Error rates in our tests.** About 2 % of test plates were not found (conf 0.25) and 5.00–6.88 % of plate-free photos produced a false alarm, so detections should be checked by a person where mistakes matter.

---

## 12. Citation

```bibtex
@article{suvra2026hybrid,
  title   = {A Cloud-Based Hybrid Model for Real-Time Detection of BRTA-Approved
             Licence Plates Using {YOLO} Tiny and Haar Cascade},
  author  = {Suvra, Debashis Kar and Sanam, Tahsina Farah},
  journal = {arXiv preprint arXiv:2609.06507},
  year    = {2026}
}

@misc{yousuf2026paper03,
  title  = {Re-implementation and Evaluation of Paper \#3 on the 498R BanglaLPR Dataset},
  author = {Md. Yousuf},
  year   = {2026},
  month  = oct,
  note   = {Paper03\_Report.md and README.md}
}
```

---

*End of `README.md` — Md. Yousuf, 18 October 2026.*

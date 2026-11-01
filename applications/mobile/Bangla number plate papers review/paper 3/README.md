# Paper26_README.md — Paper #26: Attention-Centric YOLOv12 vs YOLO11 for Bangla Licence-Plate Detection

> **Project:** 498R BanglaLPR — re-implementation and evaluation of *“YOLOv12: Attention-Centric Real-Time Object Detectors”* (Paper #26, arXiv:2502.12524)  
> **Author / maintainer:** Md. Yousuf  
> **Date:** 1 November 2026  
> **Notebook:** [`paper26_run.ipynb`](https://github.com/Rokib-Hasan-Oli/CSE498R/blob/main/notebooks/Md.Yousuf/paper26_run.ipynb)  
> **Output archive:** [`paper26_outputs.zip`](https://github.com/Rokib-Hasan-Oli/CSE498R/blob/main/output/paper26_outputs.zip)  
> **Weights / results location:** [`weights/paper26/Md.Yousuf`](https://github.com/Rokib-Hasan-Oli/CSE498R/tree/main/weights/paper26/Md.Yousuf) in [`Rokib-Hasan-Oli/CSE498R`](https://github.com/Rokib-Hasan-Oli/CSE498R)

This package documents a controlled project-level comparison of **YOLOv12-S trained with the authors’ own code, YOLO12-S in Ultralytics 8.4.170, and YOLO11-S** for detecting Bangla BRTA licence plates, plus an additional comparison of **YOLOv12-N and YOLO11-N as character detectors**. The notebook records training, test-set metrics, condition-specific results, latency measurements, environment information, logs, and code in `paper26_outputs.zip`.

**Important scope note:** this is a fine-tuning and evaluation study on the 498R BanglaLPR All-in-One dataset. It is not a reproduction of the paper’s original COCO experiment. All project metrics below are transcribed from the completed Paper #26 notebook output and the per-run `results.json` files; they should be interpreted within this dataset and experimental setup.

---

## Table of Contents

1. [At a Glance](#1-at-a-glance)
2. [What Is in This Package](#2-what-is-in-this-package)
3. [Quick Start](#3-quick-start)
4. [Model Cards](#4-model-cards)
5. [Results Summary](#5-results-summary)
6. [How to Read These Results](#6-how-to-read-these-results)
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
| **Task** | Detect Bangla BRTA licence plates as one object class (`plate`) and compare attention-centric YOLOv12 with YOLO11 |
| **Additional task** | Compare YOLOv12-N and YOLO11-N character detectors on the recognition/character dataset |
| **Detection models** | YOLOv12-S (authors’ code), YOLO12-S (Ultralytics), YOLO11-S (Ultralytics) |
| **Best detection mAP50** | YOLO11-S: **99.0%** (0.9895); YOLO12-S (Ultralytics): 98.9%; YOLOv12-S (authors’ code): 98.6% |
| **Best detection mAP50-95** | YOLOv12-S (authors’ code): **48.5%**; YOLO12-S (Ultralytics) and YOLO11-S: 46.2% each |
| **Small-plate recall** | YOLO12-S (Ultralytics): 80.0%; YOLOv12-S (authors’ code): 60.0%; YOLO11-S: 40.0% — all on only **5 plates** |
| **Fastest reported TensorRT FP16 latency** | YOLO11-S: **7.56 ms/image** on Tesla T4; YOLO12-S (Ultralytics): 7.87 ms/image; authors’ code: TensorRT export failed |
| **Fastest reported CPU ONNX latency** | YOLO12-S (Ultralytics): **175.55 ms/image**; YOLO11-S: 184.53 ms/image (different ONNX Runtime versions) |
| **Lowest training memory / time** | YOLO11-S: **5.19 GB** peak and **127.10 min**; YOLO12-S (Ultralytics): 7.75 GB and 175.60 min |
| **Character-detector plate-exact result** | YOLO11-N: **83.56%**; YOLOv12-N: **82.80%** |
| **Dataset** | 498R BanglaLPR All-in-One v1.1; 1,153 human-labelled detection test images (1,011 plates) and 896 human-labelled validation images |
| **Training configuration** | 640 px detection input, batch 16, 60 planned epochs, SGD, COCO-pretrained weights, seed 42 |
| **Character-detector configuration** | 320 px input, batch 32, 70 planned epochs |
| **Hardware** | Kaggle, 2 × NVIDIA Tesla T4; official-code queue on GPU 0, Ultralytics queue on GPU 1 |
| **Software recorded by notebook** | Python 3.13.15, PyTorch 2.11.0+cu128, Ultralytics 8.4.170 (official fork: 8.3.63) |

The top-line accuracy figures are rounded to one decimal place in the generated comparison table. Consult the archived `runs/<run>/results.json` files for the full saved precision of individual metrics. Latency values are the notebook’s reported end-to-end measurements; see Section 6 before using the FP16 figures for deployment decisions.

---

## 2. What Is in This Package

### 2.1 Repository links

| Resource | Purpose |
|---|---|
| [`notebooks/Md.Yousuf/paper26_run.ipynb`](https://github.com/Rokib-Hasan-Oli/CSE498R/blob/main/notebooks/Md.Yousuf/paper26_run.ipynb) | Executable Kaggle notebook, training orchestration, evaluation and packaging |
| [`output/paper26_outputs.zip`](https://github.com/Rokib-Hasan-Oli/CSE498R/blob/main/output/paper26_outputs.zip) | Full output archive, including model weights and experiment artefacts |
| [`weights/paper26/Md.Yousuf`](https://github.com/Rokib-Hasan-Oli/CSE498R/tree/main/weights/paper26/Md.Yousuf) | Personal Paper #26 weights/results folder in the team repository |

The notebook’s packaging cell reported:

- `paper26_outputs.zip`: **260.5 MB**, containing model files and selected experiment outputs.
- `paper26_results.zip`: **5.1 MB**, a smaller archive with model-weight files excluded (for the GitHub `weights/` folder).

The linked repository output is the full output archive. The smaller `paper26_results.zip` is generated by the notebook as a convenience copy; verify its presence in the repository before linking to it separately.

### 2.2 Expected output structure

The notebook’s `report.pack()` function collects selected files from the run folders and adds logs, Markdown summaries, environment information and Python helper scripts. The archive is expected to contain items in the following general structure (exact files depend on which runs produced outputs):

```text
paper26_outputs.zip
├── environment.json
├── results_vs_paper.md
├── code/
│   ├── common.py
│   ├── det.py
│   ├── report.py
│   ├── rec.py
│   ├── p26_official.py
│   └── other shared toolkit modules
├── logs/
│   ├── v12s_official.log
│   ├── v12s_ultra.log
│   ├── v11s.log
│   ├── chars_v12n.log
│   ├── chars_v11n.log
│   ├── speed_v12s_official.log
│   ├── speed_v12s_ultra.log
│   └── speed_v11s.log
└── runs/
    ├── v12s_official/
    ├── v12s_ultra/
    ├── v11s/
    ├── chars_v12n/
    └── chars_v11n/
```

A run folder may include `results.json`, `results.csv`, `args.yaml`, `best.pt`, `last.pt`, plots (`results.png`, `labels.jpg`, `confusion_matrix.png`, `BoxPR_curve.png`), `cond_yaml/` (detectors), `ocr_preds_val.csv` and `ocr_preds_test.csv` (character detectors), or other files selected by the packer. Do not assume every optional file exists in every run; inspect the archive itself.

### 2.3 Main experiment runs

| Run name | Model / task | Planned epochs | Input size | Batch |
|---|---|---:|---:|---:|
| `v12s_official` | YOLOv12-S plate detection, **authors’ code** (`sunsmarterjie/yolov12`) | 60 (50 run) | 640 | 16 |
| `v12s_ultra` | YOLO12-S plate detection, Ultralytics 8.4.170 | 60 | 640 | 16 |
| `v11s` | YOLO11-S plate detection, Ultralytics 8.4.170 (baseline) | 60 | 640 | 16 |
| `chars_v12n` | YOLOv12-N character detection for plate reading | 70 | 320 | 32 |
| `chars_v11n` | YOLO11-N character detection for plate reading | 70 | 320 | 32 |

The notebook’s time limits were 4.2 hours for the official-code detection run, 3.8 hours for `v12s_ultra`, 3.4 hours for `v11s`, and 1.4 hours for each character-detector run. The official-code run hit its cap after epoch 50 of 60. The logged wall times are reported in the Report (Appendix A).

---

## 3. Quick Start

### 3.1 Download the output archive

Download [`paper26_outputs.zip`](https://github.com/Rokib-Hasan-Oli/CSE498R/blob/main/output/paper26_outputs.zip) from the repository. If GitHub identifies this file as a Git LFS object (as it did for the Paper #27 archive), use the repository’s **View raw / Download raw file** action or an authenticated Git LFS-capable client if the normal page does not provide the archive bytes.

Extract it locally:

```bash
unzip paper26_outputs.zip -d paper26_outputs
```

On Windows, use File Explorer’s **Extract All** action or PowerShell:

```powershell
Expand-Archive -Path .\paper26_outputs.zip -DestinationPath .\paper26_outputs
```

### 3.2 Install the detector dependency

The notebook pins Ultralytics:

```bash
pip install ultralytics==8.4.170
```

The notebook itself was run in a Kaggle environment with PyTorch 2.11.0+cu128 and Python 3.13.15. Installing Ultralytics alone does not guarantee that every exported format or GPU backend will work on another machine. TensorRT requires a compatible NVIDIA/CUDA/TensorRT stack; CPU ONNX evaluation requires ONNX Runtime.

The **official-code** checkpoint (`v12s_official`) was trained and evaluated with the authors’ own Ultralytics fork (reports version 8.3.63), not with 8.4.170. Set the fork up exactly as the notebook did, using the helper that is in the archive’s `code/` folder (it clones `sunsmarterjie/yolov12`, checks out the pinned commit `2abab7153a065fb2925e8088e9ca2b19016ab7d6`, patches `np.trapz` for NumPy 2, and downloads the authors’ `yolov12n.pt` and `yolov12s.pt`):

```bash
python paper26_outputs/code/p26_official.py --dir yolov12_official
```

### 3.3 Run plate detection with a saved checkpoint

After extracting the archive, locate the corresponding `best.pt` file under the relevant run directory. The example below assumes the YOLO12-S (Ultralytics) checkpoint is at `paper26_outputs/runs/v12s_ultra/weights/best.pt`; adjust the path to match the extracted archive. The `v11s` checkpoint loads the same way.

```python
from ultralytics import YOLO

model = YOLO("paper26_outputs/runs/v12s_ultra/weights/best.pt")
results = model.predict(
    source="image.jpg",
    imgsz=640,
    conf=0.25,
    verbose=False
)

for result in results:
    boxes = result.boxes.xyxy.cpu().numpy()
    scores = result.boxes.conf.cpu().numpy()
    classes = result.boxes.cls.cpu().numpy().astype(int)

    print("Class names:", model.names)
    print("Boxes [x1, y1, x2, y2]:", boxes)
    print("Confidence:", scores)
    print("Class IDs:", classes)
```

For the **official-code** checkpoint, put the fork first on `PYTHONPATH`, as the notebook did, and run the same script (it was not tested here with Ultralytics 8.4.170):

```bash
# Linux / macOS
PYTHONPATH=$PWD/yolov12_official python predict.py
```

```powershell
# Windows PowerShell
$env:PYTHONPATH = "$PWD\yolov12_official"; python predict.py
```

This is a practical inference example using the Ultralytics interface. The saved notebook metrics were produced by the notebook’s own evaluation code and configuration; this short example is not a claim that the example itself was separately benchmarked.

**Detection is not full licence-plate recognition.** The three `v12s_official`, `v12s_ultra` and `v11s` runs detect plate bounding boxes. The `chars_v12n` and `chars_v11n` runs are a separate character-detection component used in the project’s plate-reading experiment.

### 3.4 Re-evaluate a detector

The dataset YAML generated by the notebook uses the detection directory and its train/validation/test splits. A typical evaluation call is:

```python
from ultralytics import YOLO

model = YOLO("paper26_outputs/runs/v12s_ultra/weights/best.pt")
metrics = model.val(
    data="path/to/detection_all.yaml",
    split="test",
    imgsz=640,
    batch=16
)

print("Precision:", metrics.box.mp)
print("Recall:", metrics.box.mr)
print("mAP50:", metrics.box.map50)
print("mAP50-95:", metrics.box.map)
```

`path/to/detection_all.yaml` is a placeholder: recreate it using the notebook’s `common.data_yaml("detection", "all")` helper or supply a valid YAML file for your local dataset. The dataset is not bundled inside the output archive. Each run was scored by the Ultralytics version that trained it, so re-evaluating all three checkpoints with **one** version may change mAP50-95 (see Section 6).

---

## 4. Model Cards

### 4.1 YOLOv12-S, authors’ code — `v12s_official`

| Item | Value |
|---|---|
| Model | YOLOv12-S (Small), attention-centric detector, authors’ code (`sunsmarterjie/yolov12`, Ultralytics fork 8.3.63) |
| Task | One-class Bangla licence-plate detection (`plate`) |
| Initial weights | `yolov12s.pt` (authors’ COCO-pretrained release) |
| Input size | 640 × 640 |
| Batch size | 16 |
| Planned epochs | 60 (50 run: stopped by the 4.2 h time cap) |
| Optimiser | SGD |
| Seed | 42 |
| Training time | 256.10 min (5.12 min per epoch) |
| Peak GPU memory | 7.94 GB |
| Test mAP50 | 98.6% (0.9859) |
| Test mAP50-95 | 48.5% (0.4853) |
| Parameters | 9.10 M |
| GFLOPs | 19.60 |
| Small-plate recall | 60.00% (3 of 5 plates) |
| False alarms on plate-free photos | 8.12% (13 of 160) |
| TensorRT FP16 end-to-end latency (T4) | not available (export failed: `No module named 'onnxscript'`) |
| PyTorch FP32 end-to-end latency (T4) | 21.86 ms/image |
| PyTorch FP16 end-to-end latency (T4) | 232.96 ms/image |
| CPU ONNX latency | 281.32 ms/image |

**Observed strengths:** highest test mAP50-95 of the three detectors; best mAP50 on synthetic rain (88.2%) and on the small-plate condition list (95.2%); fewest false alarms on plate-free photos (8.12%).

**Observed weaknesses:** lowest mAP50 (98.6%) and lowest box precision at conf 0.25 (87.36%); weakest at night (91.0% mAP50); trained for only 50 of 60 planned epochs, so it never reached the no-mosaic final phase; slowest training and highest memory; no TensorRT number; its CPU latency was measured while another job was running and is not reliable; the FP16 latency (232.96 ms) is anomalous (Section 6).

### 4.2 YOLO12-S, Ultralytics — `v12s_ultra`

| Item | Value |
|---|---|
| Model | YOLO12-S (Small), attention-centric detector, Ultralytics 8.4.170 |
| Task | One-class Bangla licence-plate detection (`plate`) |
| Initial weights | `yolo12s.pt` (COCO-pretrained) |
| Input size | 640 × 640 |
| Batch size | 16 |
| Planned epochs | 60 (60 run) |
| Optimiser | SGD |
| Seed | 42 |
| Training time | 175.60 min (2.93 min per epoch) |
| Peak GPU memory | 7.75 GB |
| Test mAP50 | 98.9% (0.9887) |
| Test mAP50-95 | 46.2% (0.4618) |
| Parameters | 9.25 M |
| GFLOPs | 23.50 |
| Small-plate recall | 80.00% (4 of 5 plates) |
| False alarms on plate-free photos | 10.00% (16 of 160) |
| TensorRT FP16 end-to-end latency (T4) | 7.87 ms/image |
| PyTorch FP32 end-to-end latency (T4) | 20.60 ms/image |
| PyTorch FP16 end-to-end latency (T4) | 153.37 ms/image |
| CPU ONNX latency | 175.55 ms/image |

**Observed strengths:** best mAP50 at night (98.4%) and on blurry plates (99.2%); highest share of plates found at conf 0.25 (98.32%); lowest CPU ONNX latency of the three (with an ONNX Runtime caveat).

**Observed weaknesses:** worst on synthetic rain (83.1% mAP50); most false alarms on plate-free photos (10.00%); highest GFLOPs (23.50); 39% slower than YOLO11-S in PyTorch FP32 and 4.1% slower under TensorRT FP16; 49% more training memory than YOLO11-S. The reported PyTorch FP16 latency (153.37 ms) is anomalous.

### 4.3 YOLO11-S — `v11s`

| Item | Value |
|---|---|
| Model | YOLO11-S (Small), the paper’s baseline, Ultralytics 8.4.170 |
| Task | One-class Bangla licence-plate detection (`plate`) |
| Initial weights | `yolo11s.pt` (COCO-pretrained) |
| Input size | 640 × 640 |
| Batch size | 16 |
| Planned epochs | 60 (60 run) |
| Optimiser | SGD |
| Seed | 42 |
| Training time | 127.10 min (2.12 min per epoch) |
| Peak GPU memory | 5.19 GB |
| Test mAP50 | 99.0% (0.9895) |
| Test mAP50-95 | 46.2% (0.4621) |
| Parameters | 9.43 M |
| GFLOPs | 21.70 |
| Small-plate recall | 40.00% (2 of 5 plates) |
| False alarms on plate-free photos | 8.75% (14 of 160) |
| TensorRT FP16 end-to-end latency (T4) | 7.56 ms/image |
| PyTorch FP32 end-to-end latency (T4) | 14.82 ms/image |
| PyTorch FP16 end-to-end latency (T4) | 162.99 ms/image |
| CPU ONNX latency | 184.53 ms/image |

**Observed strengths:** highest mAP50 (99.0%), highest box precision at conf 0.25 (92.26%) and fewest extra boxes; shortest training time, lowest memory, and the lowest PyTorch FP32 and TensorRT FP16 latency of the three.

**Observed weaknesses:** lowest small-plate recall (2 of 5 plates, not reliable); lower than YOLO12-S at night (95.6% vs 98.4% mAP50); mAP50-95 is not higher than the Ultralytics YOLO12-S. Its PyTorch FP16 latency (162.99 ms) is anomalous.

### 4.4 Character-detector comparison

The notebook also trains `chars_v12n` and `chars_v11n` using the recognition data YAML, with 320 px input, batch 32 and 70 planned epochs. These are character-detector runs within the project’s plate-reading pipeline; do not confuse their plate-exact result with the plate-box detector mAP.

| Metric | `chars_v12n` | `chars_v11n` |
|---|---:|---:|
| Plate exact (%) | 82.80 | 83.56 |
| Clear (%) | 85.83 | 87.92 |
| Night (%) | 73.85 | 78.46 |
| Blurry (%) | 75.00 | 67.86 |
| Fog condition (%) | 65.38 | 69.23 |
| Synthetic rain (%) | 74.04 | 69.59 |
| Character error rate, CER (%) | 3.58 | 3.09 |
| Character-box mAP50 on `rec/test` (%) | 92.27 | 96.21 |
| Reading time per plate (ms) | 17.24 | 13.40 |
| Training time (min) | 51.10 | 25.90 |

In the reported experiment, `chars_v11n` achieved the higher overall plate-exact score and was higher in four of the five condition columns, while `chars_v12n` was higher on blurry plates and synthetic rain. The overall gap is 5 plates of 651. These figures describe the notebook’s character-detection/plate-reading evaluation and should not be presented as a general OCR benchmark without the project’s decoding and evaluation details.

### 4.5 Evaluated scope

**Evaluated in the notebook:**

- Three plate detectors: YOLOv12-S (authors’ code), YOLO12-S (Ultralytics) and YOLO11-S.
- Test-set precision, recall, mAP50 and mAP50-95.
- Plate counts at confidence 0.25 and IoU 0.5, plus plate-size analysis and found-plates by source dataset.
- Condition subsets: clear, night, blurry, small plates, synthetic rain and synthetic fog.
- False alarms on plate-free photos.
- Peak GPU memory and training time.
- End-to-end batch-1 latency on Tesla T4 using PyTorch FP32, PyTorch FP16 and TensorRT FP16 (not available for the official run), plus CPU ONNX.
- Two character-detector runs and their plate-exact, CER and character-box results.

**Not established by the available comparison table:** multi-seed statistical significance, confidence intervals, performance on arbitrary external datasets, production performance on other hardware, FlashAttention speed (the T4 cannot use it in the official fork), or equivalence to the original paper’s COCO benchmark.

---

## 5. Results Summary

The tables in this section reproduce the values printed by the completed notebook’s `results_vs_paper.md` output and the per-run `results.json` files. Accuracy metrics are percentages. Detection mAP figures are rounded to one decimal place in that report.

### 5.1 Accuracy, model size, memory and training time

| Metric | YOLOv12-S, authors’ code (`v12s_official`) | YOLO12-S, Ultralytics (`v12s_ultra`) | YOLO11-S (`v11s`) |
|---|---:|---:|---:|
| Test mAP50 (%) | 98.6 | 98.9 | **99.0** |
| Test mAP50-95 (%) | **48.5** | 46.2 | 46.2 |
| Parameters (M) | 9.10 | 9.25 | 9.43 |
| GFLOPs | 19.60 | 23.50 | 21.70 |
| Peak GPU memory (GB) | 7.94 | 7.75 | **5.19** |
| Small-plate recall (%) (5 plates) | 60.00 | **80.00** | 40.00 |
| Training time (min) | 256.10 | 175.60 | **127.10** |
| Epochs run | 50 | 60 | 60 |

Box fit at conf 0.25, IoU 0.5 (test, 1,011 plates):

| Metric | `v12s_official` | `v12s_ultra` | `v11s` |
|---|---:|---:|---:|
| Plates found (%) | 97.73 | **98.32** | 97.92 |
| Correct boxes, i.e. precision (%) | 87.36 | 89.47 | **92.26** |
| Images with all plates right, no extra box (%) | 88.90 | 90.81 | **92.89** |
| IoU > 0.7 accuracy (%) | 65.66 | 66.77 | **67.27** |

**Interpretation:** YOLO12-S (Ultralytics) and YOLO11-S are tied in accuracy (−0.08 points of mAP50, −0.03 points of mAP50-95). The authors’-code run is 2.3 points higher in mAP50-95 but is lower in mAP50 and in every box-fit measure above, and it differs from the other two runs in code version, starting weights, augmentation defaults and epochs run; its advantage should not be read as a clean architecture effect. YOLO11-S is the cheapest to train.

### 5.2 Results by condition

Detection mAP50 on the condition subsets:

| Run | All test | Clear | Night | Blurry | Small plates | Rain (synthetic) | Fog (synthetic) | False alarms on plate-free photos (%) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| YOLOv12-S, authors’ code (`v12s_official`) | 98.6 | 99.0 | 91.0 | 96.8 | **95.2** | **88.2** | 97.4 | **8.12** |
| YOLO12-S, Ultralytics (`v12s_ultra`) | 98.9 | **99.2** | **98.4** | **99.2** | 93.2 | 83.1 | 97.5 | 10.00 |
| YOLO11-S (`v11s`) | **99.0** | **99.2** | 95.6 | 98.2 | 93.2 | 86.3 | **97.6** | 8.75 |

The rain and detection-fog subsets are **synthetic copies**; they are not evidence of equivalent performance under every real-world weather condition. The condition subsets are fixed team-wide lists from the dataset’s condition metadata. Back-computed from the “found %” values, the night, blurry and small-plate lists hold 71, 53 and 24 plates, so one or two plates move these numbers noticeably.

### 5.3 End-to-end latency (batch 1, input 640)

| Run | PyTorch FP32 (T4) | PyTorch FP16 (T4) | TensorRT FP16 (T4) | CPU ONNX |
|---|---:|---:|---:|---:|
| YOLOv12-S, authors’ code (`v12s_official`) | 21.86 ms | 232.96 ms | not available | 281.32 ms |
| YOLO12-S, Ultralytics (`v12s_ultra`) | 20.60 ms | 153.37 ms | 7.87 ms | **175.55 ms** |
| YOLO11-S (`v11s`) | **14.82 ms** | 162.99 ms | **7.56 ms** | 184.53 ms |

The notebook describes these as end-to-end latency measurements at batch 1, including preprocessing, inference and postprocessing, with NMS in all paths. Each value is the mean over 200 test images (CPU: 50). They are measurements from one reported run on the stated hardware/software setup, not universal speed guarantees.

**Measurement cautions:**

- The PyTorch FP16 values (153–233 ms) are 7–11 × the same models’ FP32 values, while the single-image stage split saved next to them sums to only 15–23 ms. They are reproduced as reported rather than silently corrected; do not use them for model selection.
- The official-code TensorRT export failed (`No module named 'onnxscript'`), so there is no TensorRT value for it. Its CPU value ran while another speed job shared the machine.
- The `v11s` CPU job used ONNX Runtime 1.24.4; the other two used 1.31.1.
- The `ms_breakdown` saved in `results.json` is the stage split of the **last image only**, not an average.

### 5.4 Character-detector plate-exact results

| Run | Overall plate exact (%) | Clear | Night | Blurry | Fog condition | Synthetic rain |
|---|---:|---:|---:|---:|---:|---:|
| `chars_v12n` | 82.80 | 85.83 | 73.85 | **75.00** | 65.38 | **74.04** |
| `chars_v11n` | **83.56** | **87.92** | **78.46** | 67.86 | **69.23** | 69.59 |

These are the plate-exact percentages generated by the project’s character/plate-reading evaluation (the “rows” decoder), not mAP50 values for the plate detector. The “xsort” decoder (all tokens left to right) reads 0.00% of plates exactly with both models.

### 5.5 Comparison with the original paper

| Metric | Original paper (COCO, Table 1) | This study on 498R BanglaLPR |
|---|---|---|
| YOLOv12-S mAP50-95 / AP | 48.0% | 48.5% (authors’ code), 46.2% (Ultralytics) |
| YOLO11-S mAP50-95 / AP | 46.9% | 46.2% |
| YOLOv12-S parameters | 9.3 M | 9.10 M (authors’ code), 9.25 M (Ultralytics) |
| YOLO11-S parameters | 9.4 M | 9.43 M |
| YOLOv12-S GFLOPs | 21.4 G | 19.60 G (authors’ code), 23.50 G (Ultralytics) |
| YOLO11-S GFLOPs | 21.5 G | 21.70 G |
| YOLOv12-S TensorRT FP16 latency | 2.61 ms | not available (authors’ code), 7.87 ms (Ultralytics) |
| YOLO11-S TensorRT FP16 latency | 2.5 ms | 7.56 ms |
| YOLOv12-S slower than YOLO11-S, TensorRT | +4.4% | +4.1% (Ultralytics) |

The original paper’s numbers are from its COCO experiment (600 epochs from scratch, TensorRT FP16 with FlashAttention); this project’s numbers are from a fine-tuned one-class licence-plate task. Differences in dataset, model implementation/version, hardware, evaluation pipeline and measurement procedure mean this is **not a head-to-head reproduction of the paper’s benchmark**. The comparison is context, not a claim that this study supersedes or directly reproduces the COCO results. The paper’s own ablation (Table 5h) reports 3.02 ms for YOLOv12-S without FlashAttention.

---

## 6. How to Read These Results

- **mAP50** measures detection average precision at an IoU threshold of 0.50. **mAP50-95** averages across IoU thresholds from 0.50 to 0.95 and is generally stricter about box localisation.
- **Precision** describes the share of predicted detections that are correct; **recall** describes the share of ground-truth objects detected. A high mAP50 alone does not capture every operational error mode.
- **The authors’-code run is not a clean control.** It was trained with a different Ultralytics version (8.3.63 vs 8.4.170), different starting weights, copy-paste 0.1 instead of 0.0, and was stopped at epoch 50. Its higher mAP50-95 is not matched by its precision, IoU > 0.7 accuracy or mAP50. Re-evaluate all three checkpoints with one Ultralytics version before comparing mAP50-95 across the two code bases.
- **Test mAP50-95 is 12–15 points below validation mAP50-95** for all three detectors (about 46–49% vs 60–61%) while mAP50 is high (98.6–99.0% on test). About one image in three has at least one plate with IoU ≤ 0.7 against the label.
- **Small-plate recall is not a differentiator here.** The COCO-area “small” bucket holds only 5 plates (YOLO12-S found 4, authors’ code 3, YOLO11-S 2). The separate small-plate condition list (24 plates) gives different numbers; these are different calculations and should not be treated as interchangeable metrics.
- **Weather subsets are not fully real-world tests.** The notebook identifies rain and detection-fog copies as synthetic; performance on those subsets does not establish performance under all real weather, camera, motion or lighting conditions.
- **False alarms matter.** The reported false-alarm rate on plate-free photos ranges from 8.12% to 10.00% (13 to 16 of 160 photos). A detector may achieve high mAP on positive test images and still produce unwanted detections on images with no plate.
- **Latency depends on the runtime.** TensorRT, PyTorch FP32, PyTorch FP16 and CPU ONNX are different execution paths. Do not compare these values without preserving the runtime, device, input size, batch size, library versions and timing method. YOLO12-S is only 4.1% slower than YOLO11-S under TensorRT but 39% slower in eager PyTorch FP32.
- **The FP16 figures need verification.** They are included exactly as printed by the notebook, but are anomalously high compared with the corresponding FP32 and TensorRT results and with the single-image stage split saved next to them.
- **Training cost is part of the picture.** YOLO12-S used 49% more peak GPU memory and 38% more time per epoch than YOLO11-S in this run; the paper does not report training cost.
- **Character plate-exact accuracy is a separate outcome.** `chars_v12n` and `chars_v11n` are evaluated as part of the project’s character/plate-reading pipeline. Their percentages should not be compared directly with detector mAP, and the character-box mAP ranking flips between validation and test.
- **One run is not a statistical study.** The notebook sets seed 42, but the available comparison does not report multiple independent seeds or confidence intervals. Small differences in rounded metrics should not be over-interpreted.

---

## 7. Reproducing the Results

### 7.1 Environment and hardware

The notebook output records:

- Python **3.13.15**
- PyTorch **2.11.0+cu128**
- Ultralytics **8.4.170** (official YOLOv12 fork: **8.3.63**, pinned to commit `2abab7153a065fb2925e8088e9ca2b19016ab7d6`)
- Kaggle with **two NVIDIA Tesla T4 GPUs**
- Internet enabled, to install dependencies, fetch the official code and weights, and retrieve the team dataset
- Detection input size **640**, batch **16**, 60 planned epochs
- Character-detector input size **320**, batch **32**, 70 planned epochs
- SGD optimiser and seed **42**

For exact package versions beyond those stated above, inspect `environment.json` in the output archive (it also lists transformers 5.16.1, numpy 2.1.3, OpenCV 4.14.0, timm 1.0.29 and peft 0.20.0). Hardware and software differences may change both training and inference results.

### 7.2 Dataset

The notebook uses the **498R BanglaLPR All-in-One v1.1** dataset. It attempts to download the dataset from the team Google Drive if it is not already attached or available locally.

The completed notebook printed these manifest counts:

| Dataset component | Count |
|---|---:|
| Detection test, human-labelled | 1,153 images |
| Detection validation, human-labelled | 896 images |
| Detection training, human-labelled | 4,067 images |
| Detection training, auto-labelled | 4,507 images |
| Plate-reading (OCR) test, human-labelled | 651 |
| Plate-reading (OCR) validation, human-labelled | 766 |
| Plate-reading (OCR) training, human-labelled | 3,471 |
| Plate-reading (OCR) training, auto-labelled | 2,136 |
| Character-box (recognition) test, human-labelled | 467 |
| Character-box (recognition) validation, human-labelled | 536 |
| Character-box (recognition) training, human-labelled | 2,399 |
| Character-box (recognition) training, auto-labelled | 2,136 (+ 930 auto-verified listed in the manifest) |

The detection training set therefore combines human and auto-labelled examples, while the notebook comments specify that validation/test labels are human-labelled. The dataset itself is not packaged inside `paper26_outputs.zip`.

Team Google Drive folder referenced by the notebook (v1.1):  
https://drive.google.com/drive/folders/11psdzW5Cpr7tXwqzqNxNt3LA-qeDSOQl

### 7.3 Run the notebook

1. Open the [Paper #26 notebook](https://github.com/Rokib-Hasan-Oli/CSE498R/blob/main/notebooks/Md.Yousuf/paper26_run.ipynb) in Kaggle or download it and import it into a Kaggle notebook.
2. Select **GPU T4 × 2** and enable **Internet** in the notebook session settings.
3. The notebook pins `ultralytics==8.4.170`, prepares shared helper scripts under `/kaggle/working/lprkit`, and fetches the official YOLOv12 code with `p26_official.py`.
4. For a smoke test, set `FAST = True` and run all cells to check setup and data access. This mode uses one epoch, approximately 3% of the training data and capped test subsets; **it is not the full experiment**.
5. Set `FAST = False`, then use **Save Version → Save & Run All** for the full configured experiment (the notebook banner plans about 8.5 hours; the reported run took about 5.9 hours).
6. Confirm that training and speed-test logs show successful completion. Review `results_vs_paper.md`, the per-run `results.json` files and the environment record.
7. Download `paper26_outputs.zip` from the notebook’s **Output** tab and place it in the project’s output location as appropriate.

The notebook schedules YOLOv12-S with the official code, then the two character-detector runs, on GPU 0, and YOLO12-S followed by YOLO11-S (Ultralytics) on GPU 1. Runs assigned to the same GPU execute sequentially; different GPU queues can run concurrently.

### 7.4 Training commands used by the notebook

The notebook’s job builders generate commands equivalent to the following. They are shown for transparency; in the notebook the commands are assembled through `DETJOB`, `RECJOB` and the `RUN` helper.

```bash
# Official YOLOv12 code, pinned commit, authors' weights
python lprkit/p26_official.py --dir /kaggle/working/yolov12_official

# Official-code run: the fork is placed first on PYTHONPATH
PYTHONPATH=/kaggle/working/yolov12_official:/kaggle/working/lprkit \
python lprkit/det.py \
  --data /kaggle/working/yaml/detection_all.yaml \
  --model /kaggle/working/yolov12_official/yolov12s.pt --name v12s_official --project /kaggle/working/runs \
  --epochs 60 --imgsz 640 --batch 16 --fraction 1.0 --max-hours 4.2 \
  --note "official sunsmarterjie/yolov12 code"

python lprkit/det.py \
  --data /kaggle/working/yaml/detection_all.yaml \
  --model yolo12s.pt --name v12s_ultra --project /kaggle/working/runs \
  --epochs 60 --imgsz 640 --batch 16 --fraction 1.0 --max-hours 3.8

python lprkit/det.py \
  --data /kaggle/working/yaml/detection_all.yaml \
  --model yolo11s.pt --name v11s --project /kaggle/working/runs \
  --epochs 60 --imgsz 640 --batch 16 --fraction 1.0 --max-hours 3.4
```

Character-detector jobs:

```bash
python lprkit/rec.py \
  --data /kaggle/working/yaml/recognition_all.yaml \
  --model yolo12n.pt --name chars_v12n --project /kaggle/working/runs \
  --epochs 70 --imgsz 320 --batch 32 --fraction 1.0 --max-hours 1.4

python lprkit/rec.py \
  --data /kaggle/working/yaml/recognition_all.yaml \
  --model yolo11n.pt --name chars_v11n --project /kaggle/working/runs \
  --epochs 70 --imgsz 320 --batch 32 --fraction 1.0 --max-hours 1.4
```

These commands assume the notebook-created helper scripts and dataset YAML files exist at the specified paths. For local use, change the paths and make sure the dataset is available.

### 7.5 Re-run speed measurements

The notebook uses its `det.py` speed-only mode, with TensorRT FP16 enabled for the recorded TensorRT comparison. Conceptually, the commands are:

```bash
PYTHONPATH=/kaggle/working/yolov12_official:/kaggle/working/lprkit \
python lprkit/det.py --data /kaggle/working/yaml/detection_all.yaml \
  --name v12s_official --project /kaggle/working/runs --imgsz 640 --fps-only --trt

python lprkit/det.py --data /kaggle/working/yaml/detection_all.yaml \
  --name v12s_ultra --project /kaggle/working/runs --imgsz 640 --fps-only --trt

python lprkit/det.py --data /kaggle/working/yaml/detection_all.yaml \
  --name v11s --project /kaggle/working/runs --imgsz 640 --fps-only --trt
```

The speed script requires the trained run directories and their saved checkpoints. TensorRT measurements also require a compatible TensorRT environment. For a fair comparison, rerun all models **one at a time** on the same idle device with the same input size, warm-up, batch size and library versions (including the ONNX Runtime version). In `det.py`, the patch `legacy_onnx_export()` is applied only before the CPU-ONNX export, after the TensorRT attempt; the official-code TensorRT export failed with `No module named 'onnxscript'`, so call the patch earlier (or install `onnxscript`) before repeating that measurement. Investigate the unusually large PyTorch FP16 means rather than assuming they are valid steady-state latency.

---

## 8. Limitations

1. **Dataset-specific results.** The evaluation uses the 498R BanglaLPR All-in-One dataset and a one-class plate detector. Results may not transfer to other countries’ plates, cameras, or data distributions.
2. **Fine-tuning rather than the original training protocol.** The models start from COCO-pretrained weights and are fine-tuned on the project dataset; this is not the original paper’s full COCO training experiment (600 epochs from scratch).
3. **Three different code paths.** The authors’-code run, the Ultralytics YOLO12-S run and the YOLO11-S run differ in Ultralytics version, starting weights, augmentation defaults and evaluator version; the authors’-code run is not a clean control.
4. **Single reported run per configuration.** The comparison does not provide multi-seed means, standard deviations or confidence intervals.
5. **Incomplete official run.** The authors’-code run stopped after epoch 50 of 60 because of the time cap and never reached the no-mosaic final phase. The other runs completed all 60 epochs.
6. **Limited small-plate sample.** The COCO-area small-plate bucket holds 5 plates and the small-plate condition list 24 plates; night (71) and blurry (53) lists are also small. Check the archived run metrics and dataset condition definitions before drawing broad conclusions.
7. **Synthetic weather.** Rain and detection-fog subsets are synthetic copies, so they do not replace testing on independently collected adverse-weather footage.
8. **Latency portability and protocol.** The reported speeds are specific to the Tesla T4, runtime versions and measurement procedure (Ultralytics pre/postprocessing included, no FlashAttention). Real deployment latency will vary with hardware, image pipeline, batch size and software stack.
9. **Speed-test conditions.** The official-code CPU value overlapped with another job, its TensorRT export failed, and the ONNX Runtime version differs between the `v11s` job and the other two.
10. **FP16 timing anomaly.** The reported PyTorch FP16 latency values of all three detectors are much higher than the corresponding FP32 and TensorRT FP16 values and than the single-image split saved with them. They must be verified before use in performance claims.
11. **Auto-labelled training data.** Detection training combines 4,067 human-labelled and 4,507 auto-labelled images. Annotation quality can affect learned behaviour.
12. **Model-size counts.** Parameters and GFLOPs come from two Ultralytics versions that report different sizes for the same model name; GFLOPs are not directly comparable.
13. **Detection and recognition are different tasks.** Plate-box mAP and character/plate-exact percentages are not directly comparable. End-to-end recognition quality depends on the full detection, crop, character and decoding pipeline.
14. **No broad deployment claim.** The results do not establish reliability under all lighting, weather, occlusion, motion blur, camera, or plate-format conditions.
15. **No direct COCO benchmark reproduction.** Original-paper metrics and this study’s licence-plate metrics come from different datasets and setups.

---

## 9. Differences from the Original Paper

| Component | Original YOLOv12 paper | Paper #26 project experiment |
|---|---|---|
| Paper | *YOLOv12: Attention-Centric Real-Time Object Detectors* | Project-level re-implementation/evaluation inspired by Paper #26 |
| Dataset | MS COCO 2017 (80 object classes) for the paper’s benchmark | 498R BanglaLPR All-in-One v1.1 detection split (one class: `plate`) |
| Starting point | From scratch | COCO-pretrained checkpoints (authors’ release and Ultralytics) |
| Training schedule | 600 epochs, batch 32 × 8, scale 0.9 / Mixup 0.05 / copy-paste 0.15 (S), close-mosaic 10 | 60 planned epochs for plate detection (50 run for the authors’-code run), batch 16, scale 0.5 / Mixup 0.0 / copy-paste 0.1 or 0.0; 70 planned for character-detector runs, with time caps |
| Models compared | YOLOv12 N / S / M / L / X against YOLO11 and other detector baselines | YOLOv12-S (authors’ code), YOLO12-S and YOLO11-S (Ultralytics); N for characters |
| Input size | 640 for the reported model comparison | 640 for plate detection; 320 for character detection |
| Hardware | Paper’s reported benchmark setup (T4 TensorRT FP16 latency) | Kaggle with two NVIDIA Tesla T4 GPUs |
| Attention kernel | FlashAttention in the default latency | FlashAttention not available in the authors’ code on the T4 (falls back to PyTorch `scaled_dot_product_attention`) |
| Metrics | COCO AP and efficiency measurements under the paper’s protocol | mAP50, mAP50-95, plate counts, size/condition subsets, false alarms, latency, memory and character/plate-exact results |
| End-to-end latency | Paper’s reported benchmark values | Project measurements using PyTorch FP32/FP16, TensorRT FP16 (not for the authors’ code) and CPU ONNX |
| Character-detector experiment | Not the core benchmark in the cited paper | Additional YOLOv12-N vs YOLO11-N project experiment |

YOLOv12’s research contribution includes area attention, residual efficient layer aggregation networks (R-ELAN), and several architecture changes that make attention fit YOLO (FlashAttention, no positional encoding, MLP ratio 1.2, a 7 × 7 position perceiver). This project compares the available YOLOv12 and YOLO11 model implementations after fine-tuning on a separate task. The experiment does **not** isolate the contribution of each architectural component, nor does it prove that every observed difference is caused only by the attention-centric design.

Paper-level COCO figures in Section 5.5 are included as context. They should not be described as directly comparable benchmark scores because dataset, training protocol, model implementation, attention kernel and timing environment differ.

---

## 10. File Integrity

The notebook output shown in the repository does not publish SHA-256 hashes for the individual checkpoint files in the comparison table. Therefore, this README does not invent hashes.

To calculate hashes after extracting the archive:

**Linux / macOS**
```bash
sha256sum paper26_outputs/runs/v12s_official/weights/best.pt \
          paper26_outputs/runs/v12s_ultra/weights/best.pt \
          paper26_outputs/runs/v11s/weights/best.pt \
          paper26_outputs/runs/chars_v12n/weights/best.pt \
          paper26_outputs/runs/chars_v11n/weights/best.pt \
          paper26_outputs.zip
```

**Windows PowerShell**
```powershell
Get-FileHash .\paper26_outputs.zip -Algorithm SHA256
Get-FileHash .\paper26_outputs\runs\v12s_official\weights\best.pt -Algorithm SHA256
Get-FileHash .\paper26_outputs\runs\v12s_ultra\weights\best.pt -Algorithm SHA256
Get-FileHash .\paper26_outputs\runs\v11s\weights\best.pt -Algorithm SHA256
Get-FileHash .\paper26_outputs\runs\chars_v12n\weights\best.pt -Algorithm SHA256
Get-FileHash .\paper26_outputs\runs\chars_v11n\weights\best.pt -Algorithm SHA256
```

Adjust paths to match the extracted archive. Keep the generated hash list with the released artefacts if reproducible file verification is required.

**Security note:** PyTorch `.pt` checkpoints may use pickle-based serialization. Load model files only from sources you trust, and avoid loading untrusted checkpoint files in privileged environments. The same applies to the official-code fork and its downloaded weights.

---

## 11. Licence and Data Notes

- **Dataset:** The 498R BanglaLPR All-in-One dataset combines data from multiple sources. The notebook’s dataset is stored separately from the output archive. Check the licence and redistribution conditions of each upstream dataset before redistributing images or annotations.
- **Original paper:** YOLOv12 is described in the paper cited below. The paper, official implementation (`sunsmarterjie/yolov12`) and any reused code/checkpoints have their own licensing terms.
- **Ultralytics and pretrained weights:** Ultralytics software and the COCO-pretrained weights are governed by their respective licences and terms; the official YOLOv12 fork and its weights are governed by the licence in that repository. Review those terms before commercial use or redistribution.
- **Project code and outputs:** The repository owner’s terms apply to the project files; do not assume that all bundled checkpoints, source data and third-party components share one licence.
- **Privacy:** Vehicle registration plates may be sensitive or regulated data depending on context and jurisdiction. Apply appropriate privacy, access-control and retention practices.
- **Operational safety:** Reported detector results include false alarms and missed plates. If a deployment decision affects people or enforcement, use human review and additional validation rather than relying only on these metrics.

---

## 12. Citation

### Original paper

```bibtex
@article{tian2025yolov12,
  title         = {YOLOv12: Attention-Centric Real-Time Object Detectors},
  author        = {Tian, Yunjie and Ye, Qixiang and Doermann, David},
  journal       = {arXiv preprint arXiv:2502.12524},
  year          = {2025},
  eprint        = {2502.12524},
  archivePrefix = {arXiv},
  primaryClass  = {cs.CV}
}
```

Paper: https://arxiv.org/abs/2502.12524  
Official implementation: https://github.com/sunsmarterjie/yolov12

### Project artefact

```bibtex
@misc{yousuf2026paper26,
  title        = {Paper #26: Attention-Centric YOLOv12 versus YOLO11 for Bangla Licence-Plate Detection},
  author       = {Md. Yousuf},
  year         = {2026},
  month        = nov,
  howpublished = {498R BanglaLPR project notebook and experiment outputs},
  note         = {CSE498R, Rokib-Hasan-Oli/CSE498R; Paper #26}
}
```

Project notebook:  
https://github.com/Rokib-Hasan-Oli/CSE498R/blob/main/notebooks/Md.Yousuf/paper26_run.ipynb

Project outputs:  
https://github.com/Rokib-Hasan-Oli/CSE498R/blob/main/output/paper26_outputs.zip

---

*End of `Paper26_README.md` — Md. Yousuf, 1 November 2026.*

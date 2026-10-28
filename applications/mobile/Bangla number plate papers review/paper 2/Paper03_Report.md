# Paper03_Report.md — Re-implementation and Evaluation Report

> **Document name:** `Paper03_Report.md`
> **Title:** Re-implementation and Evaluation of *"A Cloud-Based Hybrid Model for Real-Time Detection of BRTA-Approved Licence Plates Using YOLO Tiny and Haar Cascade"* (Paper #3)
> **Author / Implementer:** Md. Yousuf
> **Project:** 498R BanglaLPR — team paper re-implementation study
> **Date:** 18 October 2026
> **Companion file:** `README.md` (model card, usage guide, file manifest)
> **Environment:** Kaggle Notebook, 2 × Tesla T4, Python 3.13.15, PyTorch 2.11.0+cu128, Ultralytics 8.4.170

**Source of every number.** All results in this report come from the saved run files: `runs/<run>/results.json`, `runs/<run>/results.csv`, `runs/<run>/args.yaml`, `runs/hybrid/results.json`, `environment.json`, the logs in `logs/`, and the code in `code/`. Statements about the original paper come from the paper itself (arXiv:2609.06507). Where this study did not measure something, the report says so.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Objectives](#2-objectives)
3. [The Original Paper](#3-the-original-paper)
4. [Implementation versus the Paper](#4-implementation-versus-the-paper)
5. [Experimental Setup](#5-experimental-setup)
6. [Results A — Detector Training and Test Performance](#6-results-a--detector-training-and-test-performance)
7. [Results B — Performance by Condition](#7-results-b--performance-by-condition)
8. [Results C — Pipeline Comparison](#8-results-c--pipeline-comparison)
9. [Results D — Speed](#9-results-d--speed)
10. [Discussion and Interpretation](#10-discussion-and-interpretation)
11. [Limitations of This Study](#11-limitations-of-this-study)
12. [Conclusions and Recommendations](#12-conclusions-and-recommendations)
13. [Reproducibility](#13-reproducibility)
- [Appendix A — Full Training Arguments](#appendix-a--full-training-arguments)
- [Appendix B — Per-source Results](#appendix-b--per-source-results)
- [Appendix C — Training Milestones](#appendix-c--training-milestones)
- [Appendix D — Artefact Manifest](#appendix-d--artefact-manifest)
- [References](#references)

---

## 1. Executive Summary

Paper #3 proposes a two-stage pipeline for Bangladeshi (BRTA) licence plates: a COCO-pretrained **YOLOv4-tiny** detects vehicles, then a **Haar cascade** locates the plate inside each vehicle box. The paper reports F1 = 93 % at 30 FPS on a Ryzen 3 CPU.

This study re-implements the pipeline with the assets available to us, trains two YOLOv8n plate detectors (416 px and 640 px) on the team's 498R BanglaLPR All-in-One dataset, and evaluates four pipelines on the 1,153-image test split.

### 1.1 Headline results

| Quantity | Result |
|---|---|
| Plate YOLO on the whole image | **P 93.35 %, R 97.23 %, F1 95.25 %** (IoU ≥ 0.5) |
| Paper's design (COCO vehicle detector → generic Haar cascade) | **P 13.81 %, R 2.47 %, F1 4.19 %** |
| Vehicle detector → our plate YOLO inside each vehicle box | **P 84.18 %, R 83.68 %, F1 83.93 %** |
| Detector test mAP@0.5 | **98.80 %** (416 px) · **98.73 %** (640 px) |
| Detector test mAP@0.5:0.95 | 45.78 % (416 px) · 45.23 % (640 px) |
| Plates found at conf 0.25 | 98.02 % (416 px) · 98.12 % (640 px) |
| False alarms on 160 plate-free photos | 5.00 % (416 px) · 6.88 % (640 px) |
| Detector speed, 416 px, T4, batch 1 | 106.4 FPS (PyTorch FP32) · 76.4 FPS (PyTorch FP16) · 177.4 FPS (TensorRT FP16) |
| Whole-pipeline CPU speed (4 threads) | 22.3 FPS (YOLO alone) · 13.3 FPS (vehicle + Haar) · 6.5 FPS (vehicle + YOLO) |

### 1.2 Findings

1. A YOLOv8n trained on Bangla plates and run on the whole image gives F1 95.25 % on our test split.
2. The paper's design, built with OpenCV's generic Russian plate cascade, gives F1 4.19 %. The paper's own Bangla cascade and dataset were not available to us, so the paper's reported 93 % F1 was not reproduced.
3. Running the same plate YOLO inside COCO vehicle boxes lowered recall from 97.23 % to 83.68 % and F1 from 95.25 % to 83.93 %, and reduced CPU speed from 22.3 to 6.5 FPS.
4. The 416 px and 640 px detectors have equal test mAP@0.5 (98.80 % vs 98.73 %). The 416 px model needs 3.5 GFLOPs versus 8.2 GFLOPs; it scores higher on the night and synthetic-rain subsets and the 640 px model scores higher on the small-plates subset.
5. Plate localisation is less tight than plate finding: mean best IoU is 75.83 % (416 px) and 76.40 % (640 px); IoU ≥ 0.7 is reached for 65.16 % and 65.86 % of plates.
6. Not tested in this study: the paper's dynamic retraining pipeline, its cloud (Flask/RTSP) deployment, its augmentation study, and video-based evaluation.

---

## 2. Objectives

Re-implement Paper #3 as closely as the available assets allow, evaluate it on the team's Bangla dataset, and report how it compares with a single-stage plate detector.

| ID | Question | Answered in |
|---|---|---|
| RQ1 | How does a COCO vehicle detector followed by a Haar cascade perform on Bangla plates? | §8 |
| RQ2 | How does a plate-trained YOLO perform alone versus inside vehicle boxes? | §6, §8 |
| RQ3 | How do 416 px and 640 px input sizes compare in accuracy, conditions and cost? | §6, §7, §9 |
| RQ4 | What CPU and GPU speeds are measured? | §9 |
| RQ5 | How do our numbers relate to the paper's? | §8.3 |

---

## 3. The Original Paper

**Citation.** D. K. Suvra and T. F. Sanam, "A Cloud-Based Hybrid Model for Real-Time Detection of BRTA-Approved Licence Plates Using YOLO Tiny and Haar Cascade," Institute of Appropriate Technology, BUET, Dhaka. arXiv:2609.06507v1 [cs.CV], 6 Sep 2026.

### 3.1 Contributions claimed by the paper

1. A hybrid pipeline: YOLOv4-tiny for vehicle detection, Haar cascade for plate localisation inside the vehicle box.
2. A dynamic retraining pipeline that collects low-confidence detections (60–79 %) and retrains the model.
3. A dataset of BRTA-compliant plates (images and video), described as publicly accessible.
4. A cloud deployment: Flask server, RTSP stream from an IP camera.

### 3.2 Method as described in the paper

| Item | Paper's setting |
|---|---|
| Vehicle detector | YOLOv4-tiny, pre-trained on MS COCO; only the detection-head layers fine-tuned, earlier layers frozen |
| Fine-tuning | batch size 16, learning rate 0.001, anchors chosen from plate aspect ratio |
| Vehicle detection thresholds | confidence 0.8, NMS 0.1 |
| Haar cascade | scale factor 1.05, minNeighbors 5, minimum plate size (60, 80) px |
| Input frames | standardised to 464 × 464 px |
| Plate acceptance | highest-confidence plate above 80 % is stored |
| Camera | Cruiser SE+ 4 MP IP camera, BUET-IAT main gate, 1.5 m height, 6 mm focal length |
| Test machine | AMD Ryzen 3 2200G, 3.5 GHz, 16 GB RAM, Ubuntu 22.04 LTS |

### 3.3 Results reported by the paper

**Table II — model comparison**

| Model | Precision (%) | Recall (%) | F1 (%) | Accuracy (%) | FPS |
|---|---|---|---|---|---|
| YOLO Tiny v4 | 93 | 91 | 92 | 89 | 40 |
| Haar-Cascade | 75 | 70 | 73 | 70 | 19 |
| YOLO Tiny v4 + Cascade (Hybrid) | 94 | 93 | 93 | 91 | 30 |

**Table I — augmentation applied to the hybrid**

| Augmentation | Precision (%) | Recall (%) | F1 (%) | Accuracy (%) | FPS |
|---|---|---|---|---|---|
| None | 76 | 74 | 75 | 72 | 10 |
| Scaling | 80 | 78 | 79 | 76 | 19 |
| Contrast adjustment | 75 | 72 | 73 | 69 | 18 |
| Dynamic range enhancement | 82 | 80 | 81 | 78 | 16 |
| Noise reduction | 79 | 77 | 78 | 75 | 15 |

### 3.4 Points about the paper's text that affect comparison

- The paper's Table II gives hybrid F1 93 % and YOLO-tiny F1 92 % (+1 point) at 30 FPS versus 40 FPS.
- In Table I the un-augmented hybrid has F1 75 % and the best augmented hybrid has F1 81 %; Table II reports hybrid F1 93 %. The paper does not state which configuration produced Table II.
- The paper does not state what "YOLO Tiny v4" detects in Table II, the IoU threshold used to count a true positive, how "accuracy" is computed, or the size of the test set.
- The paper's dataset and Haar cascade were not available to us.
- The dynamic retraining pipeline is described as a block diagram; the paper reports no result that isolates its effect.

---

## 4. Implementation versus the Paper

| Component | Paper | This study |
|---|---|---|
| Vehicle detector | YOLOv4-tiny (COCO) | YOLOv8n (COCO `yolov8n.pt`), vehicle classes car / motorcycle / bus / truck (COCO ids 2, 3, 5, 7) |
| Vehicle confidence threshold | 0.8 | 0.5 |
| Plate localiser | Custom Haar cascade for BRTA plates | OpenCV `haarcascade_russian_plate_number.xml` (the paper's cascade is not public) |
| Haar parameters | scale 1.05, minNeighbors 5, minSize (60, 80) | scale 1.05, minNeighbors 5, minSize (24, 10) |
| Plate YOLO training | Head layers only, earlier layers frozen | All layers trained (`freeze: null`) |
| Training / test data | Own gate-camera video and phone images | Team's 498R BanglaLPR All-in-One still photos |
| Pipeline input size | 464 × 464 | Long side resized to 464 px; Ultralytics rounds `imgsz=464` up to 480 (multiple of stride 32, per the run log) |
| Detector training sizes | — | 416 px and 640 px |
| CPU for speed | Ryzen 3 2200G, 3.5 GHz | Kaggle CPU, 4 threads (Intel Xeon @ 2.00 GHz per the speed log) |
| Deployment | Flask on cloud, live RTSP | Offline evaluation on still images |
| Dynamic retraining pipeline | Described | Not implemented |
| Augmentation study (Table I) | Reported | Not replicated |

**Added in this study:** two detector resolutions; four pipelines evaluated on the same images (`yolo`, `haar`, `veh+haar`, `veh+yolo`); condition subsets (clear, night, blurry, small plates, synthetic rain, synthetic fog); a plate-free false-alarm set; a TensorRT / ONNX speed measurement for the 416 px model.

---

## 5. Experimental Setup

### 5.1 Dataset — 498R BanglaLPR All-in-One v1.0

| Property | Value |
|---|---|
| Task | One-class detection, class `0: plate` |
| Train | 8,574 images — 4,067 human-annotated + 4,507 auto-annotated; 466 background images |
| Validation | 896 human-annotated images; 99 background images |
| Test | 1,153 human-annotated images, 1,011 plates; includes 160 plate-free photos used for the false-alarm rate |
| Test plates by size | small 5 · medium 267 · large 739 |
| Test sources (images / plates) | `kuet` 540 / 387 · `lpdba` 205 / 211 · `ridoykj` 274 / 274 · `nightlpbd` 60 / 60 · `mahedi` 32 / 32 · `tusar` 29 / 29 · `towniyan` 13 / 18 |
| Training label policy | `human+auto` |
| Test usage | The test split is scored once, at the end, with the best-on-validation weights |

Condition subsets (clear, night, blurry, small plates, synthetic rain, synthetic fog) are fixed team-wide (`detection/conditions.json`). Rain and fog copies are synthetic. The number of plates in each condition subset is not recorded in the saved results.

### 5.2 Hardware and software

| Item | Value |
|---|---|
| Run date | 18 Oct 2026 |
| Platform | Kaggle notebook, Linux 6.18.48, x86-64 |
| Training GPUs | 2 × Tesla T4; the two trainings ran at the same time, one per GPU |
| Python / PyTorch / CUDA | 3.13.15 / 2.11.0+cu128 / 12.8 |
| Ultralytics | 8.4.170 |
| OpenCV | 4.14.0 |
| Other libraries | numpy 2.1.3, transformers 5.16.1, timm 1.0.29, peft 0.20.0 |
| Seed | 42, `deterministic = True` |

### 5.3 Training configuration

Both detectors start from COCO `yolov8n.pt` and differ only in input size.

| Setting | `v8n_416` | `v8n_640` |
|---|---|---|
| Image size | 416 | 640 |
| Epochs | 60 planned, 60 run (`time: null`) | 60 planned, 60 run |
| Batch size | 16 | 16 |
| Optimiser | SGD, lr0 0.01, lrf 0.01, momentum 0.937, weight decay 5e-4 | same |
| Warm-up | 3 epochs | same |
| Mosaic | 1.0, off for the last 10 epochs (`close_mosaic = 10`) | same |
| Other augmentation | HSV 0.015 / 0.7 / 0.4, translate 0.1, scale 0.5, flip-LR 0.5, erasing 0.4, RandAugment | same |
| AMP | on | on |
| Parameters | 3.01 M | 3.01 M |
| Compute | 3.5 GFLOPs | 8.2 GFLOPs |
| Peak GPU memory (training) | 1.12 GB | 2.59 GB |
| Best epoch | 53 | 56 |
| Training time | 102.5 min | 108.2 min |

All arguments are listed in [Appendix A](#appendix-a--full-training-arguments).

### 5.4 Evaluation protocol

**Detector metrics.** Precision, recall, mAP@0.5 and mAP@0.5:0.95 from Ultralytics validation on the test split.

**Plate-level metrics (conf 0.25, IoU 0.5), from `det.py`:**

| Metric | Meaning |
|---|---|
| found % | share of ground-truth plates matched by a prediction |
| correct % | share of predictions that match a ground-truth plate |
| img_all_ok % | share of images in which every plate is found and there are no extra boxes |
| IoU ≥ 0.7 accuracy | share of plates localised with IoU ≥ 0.7 |
| mean best IoU | mean over plates of the highest IoU among predictions |

**Pipeline test (`p03_hybrid.py`).** Test photos are resized so the long side is 464 px. A prediction is a true positive when its IoU with a not-yet-used ground-truth box is ≥ 0.5; other predictions are false positives and unmatched ground-truth boxes are false negatives. Precision, recall and F1 are computed over all images. Pipelines:

| Pipeline | Definition |
|---|---|
| `yolo` | our plate YOLO on the whole photo, conf 0.25 |
| `haar` | OpenCV Russian-plate Haar cascade on the whole photo |
| `veh+haar` | COCO YOLOv8n vehicles (conf ≥ 0.5) → Haar cascade inside each vehicle box (the paper's design) |
| `veh+yolo` | COCO YOLOv8n vehicles → our plate YOLO inside each vehicle box |

**Speed measurement.**
- GPU FPS (pipelines): Tesla T4, all 1,153 test photos, first 5 photos excluded.
- CPU FPS (pipelines): 4 threads, the first 120 test photos only, first 5 excluded. The CPU precision/recall stored in the results file are the values from the GPU run.
- Detector-only speed (§9.1): batch 1, 200 images, idle GPU.

**Plate weights used by the hybrid test.** The usage line in `p03_hybrid.py` names `runs/v8n_640/weights/best.pt`; the saved `results.json` does not record the weight path. The 416 px model was not run through the hybrid test.

---

## 6. Results A — Detector Training and Test Performance

### 6.1 Validation and test

| Metric | `v8n_416` val | `v8n_416` **test** | `v8n_640` val | `v8n_640` **test** |
|---|---|---|---|---|
| Precision | 97.00 % | **97.20 %** | 95.56 % | **97.22 %** |
| Recall | 95.02 % | **96.24 %** | 94.82 % | **96.68 %** |
| mAP@0.5 | 96.66 % | **98.80 %** | 96.22 % | **98.73 %** |
| mAP@0.5:0.95 | 58.71 % | **45.78 %** | 59.73 % | **45.23 %** |
| Inference (ms/img, Ultralytics val) | 3.31 | 2.47 | 3.03 | 2.88 |
| Post-process (ms/img) | 2.21 | 2.00 | 1.01 | 0.91 |

- Test mAP@0.5 is higher than validation mAP@0.5 by 2.14 points (416 px) and 2.51 points (640 px).
- Test mAP@0.5:0.95 is lower than validation mAP@0.5:0.95 by 12.93 points (416 px) and 14.50 points (640 px). The cause was not investigated in this study.
- The two models differ by 0.07 points in test mAP@0.5 and 0.55 points in test mAP@0.5:0.95.

### 6.2 Plate-level results (conf 0.25, IoU 0.5; 1,153 images, 1,011 plates)

| Metric | `v8n_416` | `v8n_640` |
|---|---|---|
| Plates found | 98.02 % | 98.12 % |
| Predictions correct | 93.93 % | 92.36 % |
| Images with every plate right and no extra box | 93.58 % | 93.24 % |
| IoU ≥ 0.7 accuracy | 65.16 % | 65.86 % |
| Mean best IoU | 75.83 % | 76.40 % |

| Plate size | Plates | Found, 416 px | Found, 640 px |
|---|---|---|---|
| Small | 5 | 40.00 % | 60.00 % |
| Medium | 267 | 96.63 % | 97.38 % |
| Large | 739 | 98.92 % | 98.65 % |

The "small" group has only 5 plates, so its percentages rest on 2 and 3 plates.

### 6.3 Training behaviour (from `results.csv`)

- After epoch 1, validation mAP@0.5 is 90.75 % (416 px) and 91.02 % (640 px).
- Between epochs 40 and 60, validation mAP@0.5:0.95 changes from 57.46 % to 58.45 % (416 px) and from 58.62 % to 59.16 % (640 px).
- Between epochs 50 and 60, training box loss falls from 0.918 to 0.769 (416 px) and from 0.858 to 0.710 (640 px); validation box loss changes from 1.340 to 1.324 and from 1.292 to 1.282.
- Both runs completed all 60 epochs with exit code 0.
- Training time per epoch is about 1.7 min (416 px) and 1.8 min (640 px).

Plots are in `results.png`, `BoxPR_curve.png`, `confusion_matrix.png` and `labels.jpg` for each run.

---

## 7. Results B — Performance by Condition

### 7.1 mAP@0.5 on test subsets (%)

| Run | All test | Clear | Night | Blurry | Small plates | Rain (synthetic) | Fog (synthetic) | False alarms on 160 plate-free photos |
|---|---|---|---|---|---|---|---|---|
| `v8n_416` | 98.8 | 99.0 | 97.4 | 98.1 | 88.6 | 86.1 | 97.7 | 5.00 % |
| `v8n_640` | 98.7 | 99.0 | 94.5 | 97.8 | 92.8 | 83.8 | 96.3 | 6.88 % |

### 7.2 Full per-condition metrics

| Condition | Run | Precision | Recall | mAP@0.5 | mAP@0.5:0.95 | Plates found % |
|---|---|---|---|---|---|---|
| Clear | 416 | 97.67 | 97.96 | 99.01 | 44.11 | 98.87 |
| Clear | 640 | 97.99 | 98.08 | 98.97 | 43.85 | 98.76 |
| Night | 416 | 96.38 | 94.37 | 97.39 | 65.42 | 91.55 |
| Night | 640 | 90.58 | 88.73 | 94.54 | 60.55 | 90.14 |
| Blurry | 416 | 96.07 | 96.23 | 98.08 | 62.74 | 94.34 |
| Blurry | 640 | 97.95 | 90.10 | 97.75 | 62.32 | 92.45 |
| Small plates | 416 | 90.27 | 83.33 | 88.63 | 51.86 | 83.33 |
| Small plates | 640 | 86.99 | 87.50 | 92.79 | 51.43 | 95.83 |
| Rain (synthetic) | 416 | 93.77 | 81.50 | 86.13 | 35.52 | 76.36 |
| Rain (synthetic) | 640 | 95.80 | 78.87 | 83.76 | 34.10 | 72.50 |
| Fog (synthetic) | 416 | 97.25 | 94.31 | 97.70 | 43.09 | 94.26 |
| Fog (synthetic) | 640 | 96.15 | 93.77 | 96.26 | 41.69 | 93.67 |

### 7.3 Observations

- Clear images: both models reach about 99.0 % mAP@0.5.
- Synthetic rain is the lowest-scoring condition for both models (86.13 % and 83.76 % mAP@0.5).
- Night: 97.39 % (416 px) versus 94.54 % (640 px).
- Small plates: 88.63 % (416 px) versus 92.79 % (640 px).
- False alarms on the 160 plate-free photos: 5.00 % (8 photos) for 416 px and 6.88 % (11 photos) for 640 px.
- Each model was trained once, and the condition subsets are small, so these differences come from single runs on small subsets.

---

## 8. Results C — Pipeline Comparison

### 8.1 Four pipelines (1,153 test photos, long side 464 px, IoU ≥ 0.5)

| Pipeline | Precision (%) | Recall (%) | **F1 (%)** | GPU FPS (T4) | CPU FPS (4 threads) |
|---|---|---|---|---|---|
| `yolo` — plate YOLO, whole image | 93.35 | 97.23 | **95.25** | 94.1 | 22.3 |
| `haar` — generic Haar, whole image | 11.07 | 2.77 | 4.43 | 12.0 † | 21.7 |
| `veh+haar` — paper's design | 13.81 | 2.47 | 4.19 | 21.0 | 13.3 |
| `veh+yolo` — vehicle boxes → plate YOLO | 84.18 | 83.68 | 83.93 | 39.0 | 6.5 |

† The Haar cascade runs on the CPU; the "GPU FPS" value of 12.0 for `haar` is the figure stored by the GPU-run pass of the script and is lower than its CPU value of 21.7.

### 8.2 Next to the paper's Table II

| Metric | Paper: YOLO-tiny | Ours: `yolo` | Paper: Haar | Ours: `haar` | Paper: hybrid | Ours: `veh+haar` | Ours: `veh+yolo` |
|---|---|---|---|---|---|---|---|
| Precision (%) | 93 | 93.35 | 75 | 11.07 | 94 | 13.81 | 84.18 |
| Recall (%) | 91 | 97.23 | 70 | 2.77 | 93 | 2.47 | 83.68 |
| F1 (%) | 92 | 95.25 | 73 | 4.43 | 93 | 4.19 | 83.93 |
| CPU FPS | 40 | 22.3 | 19 | 21.7 | 30 | 13.3 | 6.5 |

### 8.3 What can and cannot be compared

| Aspect | Paper | This study |
|---|---|---|
| Test data | Own gate-camera video and phone images (not available to us) | Still photos from the 498R dataset sources |
| What "YOLO Tiny" detects in Table II | Not stated | Plates (trained on Bangla plates) |
| Haar cascade | Custom (not available to us) | OpenCV generic Russian-plate cascade |
| IoU / matching rule | Not stated | IoU ≥ 0.5, one-to-one matching |
| Test size | Not stated | 1,153 images, 1,011 plates |
| CPU | Ryzen 3 2200G, 3.5 GHz | Xeon 2.0 GHz, 4 threads |

Because the data, the cascade and the protocol differ, the two sets of numbers show scale and direction, not a like-for-like comparison.

### 8.4 Observations on the pipelines

- **Generic Haar cascade (`haar`, `veh+haar`).** Recall is 2.77 % on the whole image and 2.47 % inside vehicle boxes; precision is 11.07 % and 13.81 %. The cascade used is `haarcascade_russian_plate_number.xml`, which was not trained on Bangla plates. Whether a Bangla-trained cascade would perform differently was not tested.
- **Vehicle boxes around our plate detector (`veh+yolo` versus `yolo`).** The plate detector is the same in both. Recall falls by 13.55 points (97.23 → 83.68), precision by 9.17 points (93.35 → 84.18) and F1 by 11.32 points (95.25 → 83.93). CPU speed falls from 22.3 to 6.5 FPS because two networks run, the second once per vehicle box. This study did not measure how many ground-truth plates lie inside detected vehicle boxes, so the cause of the recall drop was not isolated.
- **Single-stage `yolo`** has the highest F1, the highest recall, and the highest CPU FPS among the pipelines that produced usable detections.

---

## 9. Results D — Speed

### 9.1 Detector-only speed — `v8n_416`, batch 1, 416 px, 200 images, Tesla T4

| Backend | End-to-end ms / image | FPS | Pre / inference / post (ms) |
|---|---|---|---|
| PyTorch FP32 | 9.40 | 106.4 | 1.06 / 7.37 / 1.31 |
| PyTorch FP16 | 13.08 | 76.4 | 0.94 / 7.63 / 1.13 |
| TensorRT FP16 | 5.64 | 177.4 | 2.28 / 2.45 / 2.73 |
| ONNX on CPU (Xeon 2.0 GHz) | 113.20 | 8.8 | 1.74 / 95.06 / 4.27 |

- At batch 1, PyTorch FP16 (13.08 ms) was slower than PyTorch FP32 (9.40 ms) in this run.
- With TensorRT FP16, pre-processing plus post-processing (5.01 ms) exceeds inference time (2.45 ms).
- Only the 416 px model was benchmarked in isolation. OpenVINO was not tested.

### 9.2 Whole-pipeline speed (§8.1)

| Pipeline | GPU FPS | CPU FPS, 4 threads |
|---|---|---|
| `yolo` | 94.1 | 22.3 |
| `haar` | — | 21.7 |
| `veh+haar` | 21.0 | 13.3 |
| `veh+yolo` | 39.0 | 6.5 |

CPU values are one run over 115 timed photos.

### 9.3 Against the paper's speed figures

| Pipeline | Paper (Ryzen 3 2200G, 3.5 GHz) | This study (Xeon 2.0 GHz, 4 threads) |
|---|---|---|
| Single-stage YOLO | 40 FPS | 22.3 FPS |
| Haar alone | 19 FPS | 21.7 FPS |
| Hybrid | 30 FPS | 13.3 FPS (vehicle + Haar) · 6.5 FPS (vehicle + YOLO) |

The two columns come from different CPUs, different models and different inputs.

---

## 10. Discussion and Interpretation

This section explains the results in §6–§9. Each statement is marked **Evidence** (follows directly from the saved numbers or code) or **Hypothesis** (a reasoned explanation that this study did not test). A hypothesis is listed together with the check that would confirm or reject it.

### 10.1 Why the paper's design failed with the generic cascade

- **Evidence.** `veh+haar` (recall 2.47 %) cannot exceed `haar` on the whole image (recall 2.77 %), because vehicle gating only removes candidate regions. The Haar stage is therefore the limiting step: it finds fewer than 3 in 100 plates even when it is given the whole image.
- **Evidence.** The cascade is `haarcascade_russian_plate_number.xml`; it was not trained on Bangla plates. The team's recognition code treats Bangla plates as including two-line layouts (`seq.py`: two-line plates are cut into top and bottom halves), and the scripts handle Bangla script tokens (`vocab.py`).
- **Hypothesis.** The cascade's features are tuned to Russian plate appearance (script, layout, aspect ratio), so they match few Bangla plates. *Check:* train a Haar cascade on Bangla plate crops from the train split and rerun `haar` and `veh+haar`.
- **Evidence.** The paper's own Haar-alone figure (F1 73 %) used a cascade trained on BRTA plates, which is a different component from the one used here, so the 73 % and our 4.43 % are not measurements of the same classifier.

### 10.2 Why vehicle boxes lowered the plate YOLO's score

- **Evidence.** The plate detector is identical in `yolo` and `veh+yolo`; only its inputs differ (whole image versus vehicle crops). Recall fell 13.55 points and precision 9.17 points.
- **Evidence (logical consequence).** In `veh+yolo` a plate can only be found if the COCO detector first detects a vehicle at confidence ≥ 0.5 and the plate lies inside that vehicle box. Any plate that fails either condition is lost, regardless of how good the plate detector is. The single-stage pipeline has no such condition.
- **Hypothesis 1 (stage-1 misses).** Some vehicles are not detected at confidence 0.5 (for example small, distant, dark, blurred or partly visible vehicles), so their plates are never examined. *Check:* count the share of ground-truth plates that lie inside at least one detected vehicle box; this is an upper bound on `veh+yolo` recall.
- **Hypothesis 2 (clipped boxes).** A vehicle box can end just short of a plate near its edge, so the crop contains only part of the plate. *Check:* repeat with the vehicle boxes enlarged by a margin (for example 0 %, 10 %, 20 %).
- **Hypothesis 3 (scale change).** The detector resizes each crop to its input size, so plate size in pixels differs from what the same detector saw on whole images. *Check:* compare plate-box sizes in crops against whole images.
- **Hypothesis 4 (duplicates).** Overlapping vehicle boxes can contain the same plate twice, producing two detections of one plate; the second is counted as a false positive and lowers precision. *Check:* count duplicate matches per ground-truth plate.
- **Evidence (speed).** `veh+yolo` runs two networks, and the second network runs once per detected vehicle; its CPU speed (6.5 FPS) is 3.4 times lower than `yolo` (22.3 FPS).

### 10.3 416 px versus 640 px

- **Evidence.** Overall mAP@0.5 differs by 0.07 points; the models differ by up to 2.85 points (night) and 4.16 points (small plates) on subsets.
- **Hypothesis (small plates).** A larger input keeps more pixels on a small plate, which would explain the 640 px model's higher small-plates score (92.8 % vs 88.6 %). This is the usual expectation for detectors; here the subset is small (§5.1), so *check:* evaluate on a larger set of small plates.
- **Hypothesis (night and synthetic rain).** The 416 px model's higher night and rain scores may reflect the resolution, or may be ordinary variation between two single training runs. The data cannot tell the two apart. *Check:* train each size with several seeds and compare the spread.
- **Evidence (cost).** 416 px needs 3.5 GFLOPs and 1.12 GB peak training memory versus 8.2 GFLOPs and 2.59 GB for 640 px.

### 10.4 Detection is strong, localisation is weaker

- **Evidence.** Test mAP@0.5 is 98.8 % but test mAP@0.5:0.95 is 45–46 %, mean best IoU is about 76 %, and about 35 % of plates have IoU < 0.7 with their best prediction. Plates are found far more reliably than they are tightly boxed.
- **Why it matters.** A plate-recognition stage reads from the detected box, so a box that is loose or cuts the plate can affect the reading. The effect on OCR was not measured here.
- **Hypothesis (val-to-test gap).** Test mAP@0.5 is above validation (98.80 vs 96.66) while test mAP@0.5:0.95 is below it (45.78 vs 58.71). One possible explanation is that the two splits differ in source mix or in how tightly boxes were annotated. *Check:* compute mAP@0.5:0.95 per source on both splits (the per-source split is already available in `results.json` for found %).

### 10.5 Speed observations

- **Evidence.** For `v8n_416` at batch 1, the per-stage times of PyTorch FP16 (inference 7.63 ms) and FP32 (7.37 ms) are almost equal, yet end-to-end time is 13.08 ms versus 9.40 ms. The extra ≈ 3.4 ms in FP16 lies outside the listed pre / inference / post stages; its cause was not identified.
- **Evidence.** With TensorRT FP16, inference is 2.45 ms but pre- plus post-processing is 5.01 ms, so most of the remaining time is outside the network.
- **Evidence.** The paper's CPU (Ryzen 3 2200G at 3.5 GHz) and ours (Xeon at 2.00 GHz) differ, as do the models, so 40 FPS vs 22.3 FPS is not a like-for-like comparison.
- **Hypothesis.** The paper's Darknet-based YOLOv4-tiny and our PyTorch-based YOLOv8n may carry different CPU overhead. *Check:* run both on the same CPU.
- **Evidence.** The ONNX CPU figure (113.2 ms, 8.8 FPS, detector only, 416 px) and the pipeline CPU figure (22.3 FPS, whole `yolo` pipeline, 480 px input, PyTorch) come from different scripts and settings and should not be read as a like-for-like backend comparison. *Check:* time PyTorch, ONNX Runtime and OpenVINO with the same script, thread count and input size.

---

## 11. Limitations of This Study

1. **Different data from the paper.** The paper's dataset was not available; this study used still photos from the team's dataset.
2. **Generic cascade.** The paper's Bangla Haar cascade was not available; the OpenCV Russian-plate cascade was used.
3. **One training run per model.** No seeds were repeated, so run-to-run variation is not measured.
4. **Small subsets.** The plate-size group "small" has 5 test plates. Condition-subset sizes are not recorded in the saved results.
5. **Synthetic weather.** Rain and fog test copies are synthetic.
6. **Hybrid-test weights.** The weight path is not recorded in the hybrid `results.json`; the 416 px model was not run through the hybrid test.
7. **Hybrid settings differ from the paper.** Vehicle confidence 0.5 (paper 0.8); Haar minSize (24, 10) (paper (60, 80)); input rounded from 464 to 480 by Ultralytics. None of these were varied.
8. **CPU timing.** CPU FPS is one run on 115 timed photos on a Xeon @ 2.00 GHz, not on the paper's CPU.
9. **Auto-labelled training images.** 4,507 of 8,574 training images use auto-generated labels; validation and test labels are human-made.
10. **Test mAP@0.5:0.95 versus validation.** The 13–14 point gap (§6.1) was not investigated; see §10.4 for a hypothesis.
11. **Localisation.** Mean best IoU is about 76 % and IoU ≥ 0.7 accuracy is about 65 % (§6.2).
12. **Not replicated:** dynamic retraining pipeline, cloud Flask/RTSP deployment, augmentation study, video evaluation.
13. **Not measured:** speed of the 640 px model in isolation; OpenVINO; ONNX Runtime settings beyond the single CPU run in §9.1.

---

## 12. Conclusions and Recommendations

1. The paper's reported result (F1 93 %) was not reproduced: its custom cascade and dataset were not available, and the design built with a generic Russian plate cascade scored F1 4.19 %.
2. A YOLOv8n trained on Bangla plates reached F1 95.25 % (P 93.35 %, R 97.23 %) on the whole image and test mAP@0.5 of 98.80 % (416 px) and 98.73 % (640 px), with 98.02 % and 98.12 % of plates found.
3. For the same plate detector, running inside vehicle boxes gave F1 83.93 % and 6.5 CPU FPS, versus F1 95.25 % and 22.3 CPU FPS on the whole image.
4. The 416 px and 640 px models are equal on overall mAP@0.5. By these test results, 416 px is cheaper (3.5 vs 8.2 GFLOPs), has fewer false alarms and scores higher at night and in synthetic rain; 640 px scores higher on the small-plates subset.
5. Box tightness is lower than detection rate: mean best IoU ≈ 76 %, IoU ≥ 0.7 for ≈ 65 % of plates.

### Recommendations

Each recommendation follows from the numbers above and applies to this dataset and these test conditions.

| # | Recommendation | Based on |
|---|---|---|
| 1 | Use single-stage YOLOv8n on the whole image as the plate detector rather than the vehicle-box + Haar design | F1 95.25 % vs 4.19 % (§8.1) |
| 2 | Do not put COCO vehicle boxes in front of the plate detector unless the loss is diagnosed and recovered | F1 83.93 % and 6.5 CPU FPS vs 95.25 % and 22.3 CPU FPS (§8.1) |
| 3 | Prefer `best_v8n_416.pt` when compute or false alarms matter, or for night scenes | 3.5 vs 8.2 GFLOPs; 5.00 % vs 6.88 % false alarms; night mAP@0.5 97.4 % vs 94.5 % (§7) |
| 4 | Prefer `best_v8n_640.pt` when small plates matter | Small-plates mAP@0.5 92.8 % vs 88.6 % (§7) |
| 5 | Check box tightness (IoU) on the target data before chaining to OCR | Mean best IoU ≈ 76 %, IoU ≥ 0.7 for ≈ 65 % of plates (§6.2) |
| 6 | Use TensorRT FP16 for GPU deployment of the 416 px model | 177.4 FPS vs 106.4 FPS (FP32) and 76.4 FPS (FP16) (§9.1) |
| 7 | Treat comparisons with the paper as indicative only | Different data, cascade and protocol (§8.3) |

### Experiments that would settle the open questions

| # | Experiment | Settles |
|---|---|---|
| 1 | Share of ground-truth plates inside detected vehicle boxes; vehicle-detector recall | Hypotheses 1–2 in §10.2 |
| 2 | `veh+yolo` with vehicle confidence 0.25 / 0.5 / 0.8 and vehicle-box margins 0 / 10 / 20 % | Whether the F1 loss in `veh+yolo` can be recovered |
| 3 | Three or more seeds per detector size, reported as mean ± standard deviation | Whether the 416 vs 640 differences are real (§10.3) |
| 4 | mAP@0.5:0.95 per source on validation and test | The validation-to-test gap (§10.4) |
| 5 | Train a Haar cascade on Bangla plate crops; rerun `haar` and `veh+haar` | The paper's central claim with a Bangla-trained cascade (§10.1) |
| 6 | PyTorch, ONNX Runtime and OpenVINO on the same CPU with the same script and thread counts | Whether CPU speed can approach the paper's 40 FPS (§10.5) |
| 7 | Benchmark the 640 px model with the §9.1 protocol | Completes the accuracy-versus-speed table |
| 8 | Record condition-subset sizes; add real rain and fog photos and more small plates | Strengthens §7 |
| 9 | Evaluate on video with tracking | The paper's streaming setting |

---

## 13. Reproducibility

### 12.1 Commands (from `args.yaml`, `results.json` and the scripts' argument parsers)

```bash
# Training (one model per GPU)
python det.py --data detection_all.yaml --model yolov8n.pt --imgsz 640 --epochs 60 \
              --batch 16 --optimizer SGD --seed 42 --name v8n_640 --project runs --labels human+auto
python det.py --data detection_all.yaml --model yolov8n.pt --imgsz 416 --epochs 60 \
              --batch 16 --optimizer SGD --seed 42 --name v8n_416 --project runs --labels human+auto

# Detector speed (idle GPU, batch 1)
python det.py --data detection_all.yaml --name v8n_416 --project runs --fps-only --trt

# Four-pipeline test
python p03_hybrid.py --plate runs/v8n_640/weights/best.pt --data <detection yaml> \
                     --name hybrid --project runs
```

### 12.2 Files

Every number in this report is in `paper03_results.zip`; model weights are the separate files `best_v8n_416.pt` and `best_v8n_640.pt`. Library versions are in `environment.json`.

---

## Appendix A — Full Training Arguments

Identical for both runs except `imgsz`, `name` and `save_dir`.

| Group | Argument | Value |
|---|---|---|
| Task | task / mode / model | detect / train / `yolov8n.pt` |
| | classes | 1 (`plate`); `cls_remap = true` |
| Schedule | epochs / patience / time | 60 / 100 / none |
| | batch / workers / device | 16 / 4 / `0` |
| | seed / deterministic | 42 / true |
| | amp / cache / rect / cos_lr | true / false / false / false |
| | imgsz | 416 or 640 |
| | close_mosaic | 10 |
| Optimiser | optimizer | SGD |
| | lr0 / lrf | 0.01 / 0.01 |
| | momentum / weight_decay | 0.937 / 0.0005 |
| | warmup_epochs / warmup_momentum / warmup_bias_lr | 3.0 / 0.8 / 0.1 |
| | nbs | 64 |
| Loss gains | box / cls / dfl | 7.5 / 0.5 / 1.5 |
| Augmentation | hsv_h / hsv_s / hsv_v | 0.015 / 0.7 / 0.4 |
| | translate / scale | 0.1 / 0.5 |
| | degrees / shear / perspective | 0 / 0 / 0 |
| | flipud / fliplr | 0 / 0.5 |
| | mosaic / mixup / cutmix / copy_paste | 1.0 / 0 / 0 / 0 |
| | auto_augment / erasing | randaugment / 0.4 |
| Validation | iou / max_det | 0.7 / 300 |

---

## Appendix B — Per-source Results

Plates found (conf 0.25, IoU 0.5), test split.

| Source | Images | Plates | `v8n_416` found % | `v8n_640` found % |
|---|---|---|---|---|
| `kuet` | 540 | 387 | 98.71 | 99.48 |
| `ridoykj` | 274 | 274 | 99.27 | 98.91 |
| `lpdba` | 205 | 211 | 97.63 | 97.63 |
| `nightlpbd` | 60 | 60 | 90.00 | 88.33 |
| `mahedi` | 32 | 32 | 100.00 | 100.00 |
| `tusar` | 29 | 29 | 100.00 | 96.55 |
| `towniyan` | 13 | 18 | 88.89 | 94.44 |

`nightlpbd` has the lowest found rate for the 640 px model (88.33 %), and `towniyan` for the 416 px model (88.89 %) followed by `nightlpbd` (90.00 %).

---

## Appendix C — Training Milestones

Validation metrics from `results.csv`.

| Epoch | 416 px mAP@0.5 | 416 px mAP@0.5:0.95 | 640 px mAP@0.5 | 640 px mAP@0.5:0.95 |
|---|---|---|---|---|
| 1 | 90.75 | 50.04 | 91.02 | 51.33 |
| 10 | 92.45 | 51.50 | 93.40 | 53.51 |
| 20 | 93.31 | 54.71 | 95.44 | 56.14 |
| 30 | 95.87 | 57.11 | 96.79 | 57.46 |
| 40 | 95.94 | 57.46 | 96.93 | 58.62 |
| 50 | 96.44 | 57.51 | 96.17 | 59.24 |
| 60 | 96.15 | 58.45 | 96.20 | 59.16 |
| Best epoch | 53 | | 56 | |

---

## Appendix D — Artefact Manifest

| Path | Description |
|---|---|
| `Paper03_Report.md` | This report |
| `README.md` | Model card, usage guide, file manifest |
| `best_v8n_416.pt` | YOLOv8n plate detector, 416 px (epoch 53) |
| `best_v8n_640.pt` | YOLOv8n plate detector, 640 px (epoch 56) |
| `paper03_results.zip` | Results archive (no weights) |
| `results_vs_paper.md` | Short comparison table |
| `runs/v8n_416/`, `runs/v8n_640/` | `results.json`, `results.csv`, `args.yaml`, `results.png`, `BoxPR_curve.png`, `confusion_matrix.png`, `labels.jpg`, `cond_yaml/*.yaml` |
| `runs/hybrid/results.json` | Four-pipeline results |
| `logs/v8n_416.log`, `logs/v8n_640.log` | Training logs |
| `logs/speed_v8n_416.log` | ONNX / TensorRT export and speed log |
| `logs/hybrid.log` | Hybrid-test log |
| `environment.json` | Library and hardware versions |
| `code/p03_hybrid.py`, `code/det.py`, `code/common.py`, `code/report.py` | Scripts used for Paper #3 |
| `code/metrics.py`, `code/vocab.py`, `code/seq.py`, `code/rec.py`, `code/ved.py` | Team recognition (OCR) toolkit; not used for Paper #3 |

---

## References

1. D. K. Suvra and T. F. Sanam, "A Cloud-Based Hybrid Model for Real-Time Detection of BRTA-Approved Licence Plates Using YOLO Tiny and Haar Cascade," arXiv:2609.06507v1 [cs.CV], 6 Sep 2026.
2. P. Viola and M. Jones, "Rapid object detection using a boosted cascade of simple features," *CVPR*, 2001. (Cited by the paper.)
3. A. Bochkovskiy, C.-Y. Wang, and H.-Y. M. Liao, "YOLOv4: Optimal speed and accuracy of object detection," arXiv:2004.10934, 2020. (Cited by the paper.)
4. Ultralytics YOLO, version 8.4.170, https://github.com/ultralytics/ultralytics.
5. OpenCV, `haarcascade_russian_plate_number.xml` and Cascade Classifier documentation, https://docs.opencv.org/.
6. 498R BanglaLPR All-in-One v1.0 — team dataset.

---

*End of `Paper03_Report.md` — Md. Yousuf, 18 October 2026.*

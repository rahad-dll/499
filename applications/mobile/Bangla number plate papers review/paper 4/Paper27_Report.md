# Paper27_Report.md — Re-implementation and Evaluation Report

> **Document name:** `Paper27_Report.md`
> **Title:** Re-implementation and Evaluation of *"YOLOv10: Real-Time End-to-End Object Detection"* (Paper #27) on Bangla Licence Plates
> **Author / Implementer:** Md. Yousuf
> **Project:** Team paper re-implementation study
> **Date:** 21 October 2026
> **Companion file:** `Paper27_README.md` (model card, usage guide, file manifest)
> **Source folder:** `weights/paper27/Md.Yousuf` in the team repository
> **Environment:** Kaggle Notebook, 2 × Tesla T4, Python 3.13.15, PyTorch 2.11.0+cu128, Ultralytics 8.4.170

**Source of every number.** All results in this report come from the completed notebook output (`paper27_run.ipynb`: run log and the generated `results_vs_paper.md`) and from the code written by the notebook (`lprkit/det.py`, `rec.py`, `common.py`, `report.py`). Statements about the original paper come from the paper itself (arXiv:2405.14458v2, NeurIPS 2024). The per-run `results.json` files were **not available** while this report was written (the results archive is stored with Git LFS); every value that would come only from them is marked "not available" or "to verify". Numbers marked *derived* are simple arithmetic on the printed values (for example a difference or a count back-computed from a percentage). Where this study did not measure something, the report says so.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Objectives](#2-objectives)
3. [The Original Paper](#3-the-original-paper)
4. [Implementation versus the Paper](#4-implementation-versus-the-paper)
5. [Experimental Setup](#5-experimental-setup)
6. [Results A — Plate Detection Accuracy, Size and Training Cost](#6-results-a--plate-detection-accuracy-size-and-training-cost)
7. [Results B — Detection by Condition](#7-results-b--detection-by-condition)
8. [Results C — Small Plates and False Alarms](#8-results-c--small-plates-and-false-alarms)
9. [Results D — Character Detectors for Plate Reading](#9-results-d--character-detectors-for-plate-reading)
10. [Results E — End-to-End Latency](#10-results-e--end-to-end-latency)
11. [Discussion and Interpretation](#11-discussion-and-interpretation)
12. [Limitations of This Study](#12-limitations-of-this-study)
13. [Conclusions and Recommendations](#13-conclusions-and-recommendations)
14. [Reproducibility](#14-reproducibility)
- [Appendix A — Training Arguments and Run Timeline](#appendix-a--training-arguments-and-run-timeline)
- [Appendix B — Latency Comparison and Derived Figures](#appendix-b--latency-comparison-and-derived-figures)
- [Appendix C — Full Metrics of All Six Runs](#appendix-c--full-metrics-of-all-six-runs)
- [Appendix D — Paper Tables Used for Comparison](#appendix-d--paper-tables-used-for-comparison)
- [Appendix E — Artefact Manifest](#appendix-e--artefact-manifest)
- [References](#references)

---

## 1. Executive Summary

Paper #27 introduces **YOLOv10**, a real-time detector that removes non-maximum suppression (NMS) from inference. It trains with *consistent dual assignments* (a one-to-many head for rich supervision and a one-to-one head used at inference) and redesigns the YOLOv8 architecture for efficiency and accuracy. On COCO, trained from scratch, it reports 38.5 % AP (N) and 46.3 % AP (S) at 1.84 ms and 2.49 ms on a T4 with TensorRT FP16, against YOLOv8-N/S at 37.3 % / 44.9 % AP and 6.16 / 7.07 ms.

This study tests the claim on **Bangla (BRTA) licence plates** from the team's dataset. It is a **fine-tuning study**, not a COCO reproduction: COCO-pretrained YOLOv10-N/S and YOLOv8-N/S were fine-tuned as one-class plate detectors (60 epochs, 640 px), evaluated on 1,153 human-labelled test images, and then timed end-to-end at batch 1 under four runtimes. As an extra, YOLOv10-N and YOLOv8-N were also trained as character detectors for plate reading.

### 1.1 Headline results (detection test split, 1,153 images)

| Metric | YOLOv10-N | YOLOv10-S | YOLOv8-N | YOLOv8-S |
|---|---|---|---|---|
| mAP50 (%) | **98.7** | 98.2 | **98.7** | 98.5 |
| mAP50-95 (%) | 45.1 | 45.4 | 45.2 | **45.8** |
| Parameters (M) | 2.71 | 8.07 | 3.01 | 11.14 |
| GFLOPs | 8.50 | 24.90 | 8.20 | 28.60 |
| End-to-end ms, TensorRT FP16 (T4) | **6.00** | 7.08 | 6.87 | 8.19 |
| End-to-end ms, PyTorch FP32 (T4) | 12.28 | 13.69 | **11.07** | 11.87 |
| End-to-end ms, PyTorch FP16 (T4) | 243.04 ⚠ | 191.99 ⚠ | 15.18 | 18.11 |
| End-to-end ms, CPU ONNX | **61.50** | 140.07 | 110.76 | 267.50 |
| Small-plate recall (%) | 20.00 | 40.00 | **60.00** | 40.00 |
| False alarms on plate-free photos (%) | **3.75** | 6.88 | 6.88 | 5.62 |
| Training time (min) | 159.40 | 152.60 | **105.90** | 123.70 |

| Character detector (plate reading) | `chars_v10n` | `chars_v8n` |
|---|---|---|
| Plate exact (%) | 81.57 | **84.02** |
| Training time (min) | **27.80** | 31.80 |

### 1.2 Findings

1. **Accuracy is a tie.** All four detectors reach 98.2–98.7 % mAP50 and 45.1–45.8 % mAP50-95. The largest gap between the YOLOv10 and YOLOv8 model of the same size is 0.4 points of mAP50-95 (S, in favour of YOLOv8). The paper's +1.2 / +1.4 AP advantage on COCO is **not reproduced** here; with one seed and a saturated task, the differences are within what noise could produce (§11.1).
2. **Speed: the direction is confirmed, the size is not.** With TensorRT FP16, YOLOv10 is faster than YOLOv8 at both sizes (−12.7 % for N, −13.6 % for S, *derived*), against −70 % and −65 % in the paper. On the CPU (ONNX) the gap is larger (−44.5 % / −47.6 %, *derived*). In eager PyTorch FP32, YOLOv10 is **slower** than YOLOv8 (12.28 vs 11.07 ms for N; 13.69 vs 11.87 ms for S).
3. **Two PyTorch FP16 measurements are anomalous** (YOLOv10-N 243.04 ms, YOLOv10-S 191.99 ms, about 14–20 × their FP32 time). They are reported as printed and flagged; they must be re-measured before anyone uses them (§11.3).
4. **YOLOv10 is smaller than YOLOv8 at S** (8.07 M vs 11.14 M parameters, 24.9 vs 28.6 GFLOPs) and about 10 % smaller at N in parameters, but at N it has *more* GFLOPs (8.50 vs 8.20). The checkpoint sizes are above the paper's 2.3 M / 7.2 M, most likely because the training checkpoint still carries the one-to-many head (§11.4).
5. **Conditions split the models.** YOLOv10 is better at night (+2.2 / +2.6 points mAP50 over YOLOv8 for N / S) and for blurry S; YOLOv8 is better on synthetic rain. Every model loses 15–20 points of mAP50 on synthetic rain, the hardest condition.
6. **Small-plate recall (20 / 40 / 60 / 40 %) is not reliable evidence.** Its steps of exactly 20 points suggest a handful of plates (§8, §11.5).
7. **As character detectors**, YOLOv8-N reads more plates exactly than YOLOv10-N (84.02 vs 81.57 %, a 16-plate difference out of 651, *derived*), except at night, where YOLOv10-N leads by 3 plates.
8. **The paper's numbers come from a different task**: COCO, 80 classes, 500 epochs from scratch, a latency protocol with a TensorRT NMS plugin and without I/O overhead. The comparison shows direction and scale only.

---

## 2. Objectives

Re-implement the paper's comparison — NMS-free YOLOv10 against its YOLOv8 baseline — on Bangla plates, using the assets available, and report what the results do and do not show.

| ID | Question | Answered in |
|---|---|---|
| RQ1 | Does YOLOv10 detect Bangla plates as accurately as, or better than, YOLOv8 at the same size? | §6, §7 |
| RQ2 | Is YOLOv10 smaller and faster, as the paper claims, under four runtimes? | §6, §10 |
| RQ3 | How do the models behave in night, blur, small-plate, synthetic rain/fog conditions and on plate-free photos? | §7, §8 |
| RQ4 | Does the YOLOv10 vs YOLOv8 relation carry over to character detection for plate reading? | §9 |
| RQ5 | How do the results relate to the paper's? | §3, §6.3, §11 |

---

## 3. The Original Paper

**Citation.** A. Wang, H. Chen, L. Liu, K. Chen, Z. Lin, J. Han and G. Ding, "YOLOv10: Real-Time End-to-End Object Detection," 38th Conference on Neural Information Processing Systems (NeurIPS 2024), arXiv:2405.14458v2 [cs.CV], 30 Oct 2024.

### 3.1 Contributions claimed

1. **Consistent dual assignments for NMS-free training.** A one-to-many head gives rich supervision during training; a one-to-one head (top-one selection, same performance as Hungarian matching with less training time) is the only head used at inference, so no NMS is needed. A *consistent matching metric* (α_o2o = r·α_o2m, β_o2o = r·β_o2m) reduces the supervision gap between the two heads.
2. **A holistic efficiency–accuracy driven design** of the YOLO architecture: lightweight classification head, spatial-channel decoupled downsampling and rank-guided block design (efficiency); large-kernel convolution and partial self-attention (PSA) (accuracy).
3. **YOLOv10** in N / S / M / B / L / X sizes with state-of-the-art accuracy–latency trade-offs on COCO.

### 3.2 Dataset and protocol as described in the paper

| Item | Paper's setting |
|---|---|
| Baseline | YOLOv8, same N / S / M / L / X variants (plus a new B variant) |
| Dataset | COCO (80 classes) |
| Training | From scratch, SGD, **500 epochs**, momentum 0.937, weight decay 5×10⁻⁴, initial lr 1×10⁻² decaying linearly to 1×10⁻⁴, Mosaic / Mixup / copy-paste augmentation |
| Hardware (training) | 8 × NVIDIA 3090 |
| Latency protocol | T4 GPU, TensorRT FP16, batch 1, COCO val images; TensorRT `efficientNMSPlugin` appended for the NMS-based models; **I/O overhead omitted**; average over all images |
| Metrics | COCO AP (val), parameters, FLOPs, latency, and latency of the forward pass without post-processing (Latency^f) |

### 3.3 Results reported by the paper

**Table 1 (extract) — COCO, comparison with YOLOv8**

| Model | Params (M) | FLOPs (G) | AP^val (%) | Latency (ms) | Latency^f (ms) |
|---|---|---|---|---|---|
| YOLOv8-N | 3.2 | 8.7 | 37.3 | 6.16 | 1.77 |
| YOLOv10-N | 2.3 | 6.7 | 38.5 (39.5†) | 1.84 | 1.79 |
| YOLOv8-S | 11.2 | 28.6 | 44.9 | 7.07 | 2.33 |
| YOLOv10-S | 7.2 | 21.6 | 46.3 (46.8†) | 2.49 | 2.39 |

† = YOLOv10 with the original one-to-many training and NMS.

**Table 2 — Ablation on COCO with YOLOv10-S (#1 is YOLOv8-S)**

| # | NMS-free | Efficiency | Accuracy | Params (M) | FLOPs (G) | AP (%) | Latency (ms) |
|---|---|---|---|---|---|---|---|
| 1 | | | | 11.2 | 28.6 | 44.9 | 7.07 |
| 2 | ✓ | | | 11.2 | 28.6 | 44.3 | 2.44 |
| 3 | ✓ | ✓ | | 6.2 | 20.8 | 44.5 | 2.31 |
| 4 | ✓ | ✓ | ✓ | 7.2 | 21.6 | 46.3 | 2.49 |

The paper summarises the N / S gains over YOLOv8 as +1.2 / +1.4 AP with 28 % / 36 % fewer parameters, 23 % / 24 % fewer FLOPs and 70 % / 65 % lower latency.

### 3.4 Points in the paper that affect comparison

- **The latency claim is about end-to-end time with NMS.** Latency^f (no post-processing) is nearly the same for YOLOv8 and YOLOv10 (1.77 vs 1.79 ms for N); almost all the gap in Table 1 (6.16 vs 1.84 ms) is NMS time. The paper states that NMS time depends on the input, and measures it on COCO with an NMS plugin.
- **The paper admits an accuracy gap.** In the Limitation section, one-to-many training with NMS beats NMS-free training by 1.0 AP (N) and 0.5 AP (S); the gap shrinks as the model grows.
- **Small models carry the largest cost of NMS-free training**, because the one-to-one head needs more discriminative features (paper §4.3).
- **The paper does not evaluate** licence plates, one-class tasks, fine-tuning from COCO weights, night/blur/rain conditions, CPU runtimes, or eager PyTorch latency.

---

## 4. Implementation versus the Paper

| Component | Paper | This study |
|---|---|---|
| Task | COCO, 80 classes | One class (`plate`) on the detection split |
| Training start | From scratch | **COCO-pretrained** weights (`yolov10n/s.pt`, `yolov8n/s.pt`) fine-tuned |
| Epochs | 500 | 60 (planned) |
| Batch / input | per paper (8 GPUs) | 16 / 640 × 640, one T4 per run |
| Optimiser | SGD (lr 1e-2 → 1e-4) | SGD (set explicitly because Ultralytics 8.4 `auto` would pick MuSGD); other arguments left at Ultralytics defaults |
| Implementation | Authors' YOLOv10 code | Ultralytics 8.4.170 implementation of YOLOv10 and YOLOv8 |
| Sizes | N / S / M / B / L / X | N and S only |
| Accuracy metric | COCO AP (val) | mAP50, mAP50-95 on the test split, plus P / R |
| Latency | T4, TensorRT FP16, NMS plugin, I/O omitted, COCO val | T4 at batch 1 on 200 test images (CPU: 50): **preprocessing + inference + postprocessing** as reported by Ultralytics, NMS included for YOLOv8; PyTorch FP32, PyTorch FP16, TensorRT FP16, and ONNX on the CPU |
| Model size | Inference graph | Parameters and GFLOPs of the saved `best.pt` model (§11.4) |
| Extra | — | Per-condition test, plate-free false alarms, and YOLOv10-N vs YOLOv8-N as character detectors (320 px, 70 epochs) |
| Hardware | 8 × 3090 (train), T4 (latency) | 2 × Tesla T4 (train and latency) |
| Not replicated | — | COCO training, M/B/L/X sizes, ablations (dual assignment, matching metric, efficiency/accuracy modules), Latency^f, multiple seeds |

**What YOLOv10 changes in code.** The Ultralytics YOLOv10 detection head keeps two branches while training and uses the one-to-one branch at inference, with a top-k selection instead of NMS. The YOLOv8 path in this study ends with the standard NMS.

---

## 5. Experimental Setup

### 5.1 Dataset

Detection (one class, `plate`), as printed by the notebook:

| Split | Images | Notes |
|---|---|---|
| `det/train` human | 4,067 | |
| `det/train` auto | 4,507 | Auto-labelled; training uses human + auto (`detection_all.yaml`), i.e. **8,574** training images (*derived*) |
| `det/val` human | 896 | Model selection |
| `det/test` human | 1,153 | All reported test results |

Recognition (character detectors):

| Split | Human | Auto | Used for |
|---|---|---|---|
| `rec/train` | 2,399 | 2,136 (+ 930 auto-verified listed in the manifest) | Training the character detectors (`recognition_all.yaml`) |
| `rec/val` | 536 | — | Model selection |
| `rec/test` | 467 | — | Character-box mAP (not reported in the comparison table) |
| `ocr/test` | 651 | — | Plate reading: the 651 plates scored for **plate exact** |

Condition subsets are fixed team-wide lists (`detection/conditions.json`, `ocr/conditions.json`): real **clear, night, blurry, small plates** and **no-plate** photos; **synthetic** rain and fog copies of the whole test split. Rain (detection and OCR) and detection-fog copies are synthetic; the OCR fog set is real.

The dataset (3.39 GB) was downloaded from the team Google Drive folder at the start of the run (about 55 s; 21.8 s → 76.1 s in the log). The manifest also lists "leaky" KUET splits (`leaky_kuet|…`); the notebook trains on `detection_all.yaml` only and does not use them.

### 5.2 Hardware and software

| Item | Value |
|---|---|
| Platform | Kaggle notebook, 2 × Tesla T4 |
| Python / PyTorch | 3.13.15 / 2.11.0+cu128 (printed as `2.11.0+cu128`) |
| Ultralytics | 8.4.170 (pinned by `pip install`) |
| GPU assignment | Queue on GPU 0: `v10n` → `v10s` → `chars_v10n`; queue on GPU 1: `v8n` → `v8s` → `chars_v8n`; the two queues ran at the same time |
| Seed | 42 (all trainings) |
| Run date | Notebook ended 21 Oct 2026 (`end_time` 2026-10-21 04:42 UTC for the first cell) |
| Wall time | Total 21,463 s ≈ **5.96 h** until the results table; plus packing |

### 5.3 Models and training

**Plate detectors (`det.py`, runs `v10n`, `v10s`, `v8n`, `v8s`)**

| Setting | Value |
|---|---|
| Models | `yolov10n.pt`, `yolov10s.pt`, `yolov8n.pt`, `yolov8s.pt` (COCO-pretrained) |
| Input / batch / epochs | 640 / 16 / 60 |
| Optimiser | SGD (Ultralytics default learning-rate schedule) |
| Seed / patience | 42 / 100 (early stopping effectively off) |
| Time cap | `--max-hours` 2.6 for N, 3.6 for S: stop after the epoch that passes the cap |
| Checkpoint | `best.pt`, chosen by Ultralytics fitness (0.1 × mAP50 + 0.9 × mAP50-95) on the validation split |
| Test | The test split is used once, at the end, with `best.pt` |

**Character detectors (`rec.py`, runs `chars_v10n`, `chars_v8n`)**

| Setting | Value |
|---|---|
| Models | `yolov10n.pt`, `yolov8n.pt` |
| Input / batch / epochs | 320 / 32 / 70 |
| Time cap | 1.2 h |
| Reading | Every plate of `ocr/test` is read: tokens (district, *Metro*, series letter, six digits) are detected at conf ≥ 0.25 (`min_conf`) from predictions at conf 0.10, then joined with the "rows" decoder (words above, digits below) and scored against the human text |

### 5.4 Evaluation protocol

- **Accuracy.** `model.val` on the test split: precision P, recall R, mAP50, mAP50-95 (mean over IoU 0.50–0.95).
- **Plate counts.** At conf 0.25 and IoU 0.5: plates found, correct detections, share of images with all plates right, recall by plate size (COCO areas on the stored image: small < 32², medium < 96², large), and the paper-#1 metric "IoU > 0.7 on every plate".
- **Conditions.** `val_metrics` on each condition list (clear, night, blurry, small plates) and on synthetic rain and fog copies; **false alarms** are the share of plate-free photos with at least one box at conf 0.25.
- **Latency.** `--fps-only --trt`, run on an otherwise idle pair of GPUs (the four models, two at a time, one per GPU): batch 1, 640 px, the first 200 test images (15 warm-up predictions), `sum(r.speed.values())` = preprocess + inference + postprocess. Four paths: PyTorch FP32, PyTorch FP16, TensorRT FP16 (exported engine) and ONNX on the CPU (first 50 images). Image decoding is not part of `r.speed`.
- **Plate exact (character detectors).** Whole plate right after normalising text (NFC, Bangla digits, no spaces/hyphens).

---

## 6. Results A — Plate Detection Accuracy, Size and Training Cost

### 6.1 Test accuracy

| Run | mAP50 (%) | mAP50-95 (%) | Params (M) | GFLOPs | Training time (min) |
|---|---|---|---|---|---|
| `v10n` | 98.7 | 45.1 | 2.71 | 8.50 | 159.40 |
| `v10s` | 98.2 | 45.4 | 8.07 | 24.90 | 152.60 |
| `v8n` | 98.7 | 45.2 | 3.01 | 8.20 | 105.90 |
| `v8s` | 98.5 | 45.8 | 11.14 | 28.60 | 123.70 |

Precision, recall, the validation scores, the best epoch and the number of epochs run are stored in each run's `results.json` and were **not available** for this report. mAP values are printed to one decimal in the generated table (the speed cell printed four decimals: 0.4511, 0.4539, 0.4523, 0.4582 for mAP50-95).

### 6.2 Differences between YOLOv10 and YOLOv8 (points, *derived*)

| Size | mAP50 (v10 − v8) | mAP50-95 (v10 − v8) | Params | GFLOPs |
|---|---|---|---|---|
| N | 0.0 | −0.1 | −10.0 % (2.71 vs 3.01) | +3.7 % (8.50 vs 8.20) |
| S | −0.3 | −0.4 | −27.6 % (8.07 vs 11.14) | −12.9 % (24.9 vs 28.6) |

Larger model (S vs N): YOLOv10 +0.3 mAP50-95 (45.1 → 45.4), YOLOv8 +0.6 (45.2 → 45.8); mAP50 goes *down* from N to S for YOLOv10 (98.7 → 98.2) and for YOLOv8 (98.7 → 98.5).

### 6.3 Next to the paper's Table 1

| Metric | Paper (COCO) | This study (plates) |
|---|---|---|
| YOLOv10-N AP / mAP50-95 | 38.5 | 45.1 |
| YOLOv10-S AP / mAP50-95 | 46.3 | 45.4 |
| YOLOv8-N AP / mAP50-95 | 37.3 | 45.2 |
| YOLOv8-S AP / mAP50-95 | 44.9 | 45.8 |
| v10 − v8, N | +1.2 AP | −0.1 |
| v10 − v8, S | +1.4 AP | −0.4 |
| YOLOv10-N / S params | 2.3 M / 7.2 M | 2.71 M / 8.07 M |
| YOLOv10-N / S GFLOPs | 6.7 / 21.6 | 8.50 / 24.90 |
| YOLOv8-N / S params | 3.2 M / 11.2 M | 3.01 M / 11.14 M |
| YOLOv8-N / S GFLOPs | 8.7 / 28.6 | 8.20 / 28.60 |

The comparison shows scale and direction only: COCO AP (80 classes, from scratch, 500 epochs) and one-class fine-tuned mAP50-95 are different quantities. The absolute values are not comparable; the **v10 − v8 differences** are the relevant row.

### 6.4 Training behaviour

- Training time per epoch (*derived*, 60 epochs): 2.66 min (`v10n`), 2.54 (`v10s`), 1.77 (`v8n`), 2.06 (`v8s`). The two queues ran concurrently on one Kaggle machine with four data-loader workers each, so these times include CPU contention and are not clean cost estimates (§11.6).
- `v10n` used 159.4 min, **3.4 min more than its 2.6 h (156 min) time cap**; the cap fires after the first epoch that ends past 156 min. `v10n` therefore either finished 60 epochs just past the cap or was stopped at the cap in epoch 59 or 60. `epochs_run` in its `results.json` settles this (§11.6).
- The per-epoch curves (`results.csv`) were not available for this report.

---

## 7. Results B — Detection by Condition

### 7.1 Detection mAP50 (%) on the condition subsets (test)

| Run | All test | Clear | Night | Blurry | Small plates | Rain (synthetic) | Fog (synthetic) |
|---|---|---|---|---|---|---|---|
| `v10n` | 98.7 | 98.9 | 96.7 | 98.3 | 92.3 | 78.5 | 96.4 |
| `v10s` | 98.2 | 97.8 | 96.9 | **99.4** | **96.8** | 81.2 | 95.5 |
| `v8n` | 98.7 | **99.0** | 94.5 | 97.8 | 92.8 | **83.8** | 96.3 |
| `v8s` | 98.5 | **99.0** | 94.3 | 95.2 | 84.5 | 82.5 | **97.9** |

### 7.2 YOLOv10 minus YOLOv8 (points of mAP50, *derived*)

| Condition | N (v10n − v8n) | S (v10s − v8s) |
|---|---|---|
| All test | 0.0 | −0.3 |
| Clear | −0.1 | −1.2 |
| Night | **+2.2** | **+2.6** |
| Blurry | +0.5 | **+4.2** |
| Small plates | −0.5 | **+12.3** |
| Rain (synthetic) | **−5.3** | −1.3 |
| Fog (synthetic) | +0.1 | −2.4 |

### 7.3 Drop from "all test" to synthetic rain (points, *derived*)

`v10n` −20.2 · `v10s` −17.0 · `v8n` −14.9 · `v8s` −16.0.

The rain and detection-fog copies are **synthetic**: they show sensitivity to the team's rendering of rain and fog, not to real weather.

---

## 8. Results C — Small Plates and False Alarms

### 8.1 Small-plate recall (conf 0.25, IoU 0.5, COCO "small" area < 32² on the stored image)

| Run | Recall (%) |
|---|---|
| `v10n` | 20.00 |
| `v10s` | 40.00 |
| `v8n` | **60.00** |
| `v8s` | 40.00 |

All four values are multiples of 20 points. This is consistent with a very small number of plates in the "small" bucket (for example five plates, where one plate is 20 points). The count `plates_by_size.small` is stored in `results.json` and was not available; until it is checked, **these recalls should not be used to rank the models**. They also disagree in ranking with the small-plate *mAP50* column of §7 (where `v10s` is best at 96.8 % and `v8s` worst at 84.5 %); the two numbers come from different calculations and different plate sets (the condition list vs the COCO-area bucket).

### 8.2 False alarms on plate-free photos (conf 0.25)

| Run | False alarms (%) | Photos (*derived*) |
|---|---|---|
| `v10n` | **3.75** | 6 of 160 |
| `v10s` | 6.88 | 11 of 160 |
| `v8n` | 6.88 | 11 of 160 |
| `v8s` | 5.62 | 9 of 160 |

The percentages are exactly 6, 11, 11 and 9 photos of **160** (3.75 % = 6/160, 6.88 % = 11/160, 5.62 % = 9/160); the size of the plate-free set (`no_plate.photos`) is stored in `results.json` and should be confirmed. NMS-free inference did **not** give fewer false alarms across the board: `v10s` equals `v8n`, and `v8s` is better than `v10s`.

---

## 9. Results C′ — Character Detectors for Plate Reading

> This section is "Results D" in the table of contents: the extra experiment on character detection. Section numbers follow the contents list above.

### 9.1 Plate exact (%) on the 651 `ocr/test` plates

| Run | All test | Clear | Night | Blurry | Fog (real fog copies) | Rain (synthetic) |
|---|---|---|---|---|---|---|
| `chars_v10n` | 81.57 | 83.75 | **78.46** | 75.00 | 73.08 | 68.51 |
| `chars_v8n` | **84.02** | **87.71** | 73.85 | 75.00 | 73.08 | **71.27** |

### 9.2 The same results as plate counts (*derived*)

| Subset | Plates | `chars_v10n` | `chars_v8n` | Difference |
|---|---|---|---|---|
| All test | 651 | 531 | 547 | v8n +16 |
| Clear | 480 | 402 | 421 | v8n +19 |
| Night | 65 | 51 | 48 | v10n +3 |
| Blurry | 112 | 84 | 84 | 0 |
| Fog (real) | 26 | 19 | 19 | 0 |
| Rain (synthetic) | 651 | 446 | 464 | v8n +18 |

| Training time | `chars_v10n` | `chars_v8n` |
|---|---|---|
| Minutes (70 epochs) | **27.80** | 31.80 |

One plate equals 0.154 points on the 651-plate set. The night, blurry and fog subsets (65, 112, 26 plates) are small; a 3-plate difference there is not meaningful. These percentages are plate-exact scores of the whole reading pipeline (character boxes + rows decoder), not mAP; the character-box mAP and the "xsort" decoder results are in the runs' `results.json` and were not available.

---

## 10. Results D′ — End-to-End Latency

> This section is "Results E" in the table of contents: speed.

### 10.1 Batch 1, 640 px, preprocessing + inference + postprocessing (ms per image)

| Run | PyTorch FP32 (T4) | PyTorch FP16 (T4) | TensorRT FP16 (T4) | CPU ONNX |
|---|---|---|---|---|
| `v10n` | 12.28 | **243.04 ⚠** | **6.00** | **61.50** |
| `v10s` | 13.69 | **191.99 ⚠** | 7.08 | 140.07 |
| `v8n` | **11.07** | 15.18 | 6.87 | 110.76 |
| `v8s` | 11.87 | 18.11 | 8.19 | 267.50 |

TensorRT FP16 corresponds to (*derived*) 166.7 / 141.2 / 145.6 / 122.1 images per second for `v10n` / `v10s` / `v8n` / `v8s`.

### 10.2 YOLOv10 vs YOLOv8, and next to the paper

| Comparison | This study | Paper (Table 1) |
|---|---|---|
| TensorRT FP16, N | 6.00 vs 6.87 ms: **−12.7 %** | 1.84 vs 6.16 ms: −70.1 % |
| TensorRT FP16, S | 7.08 vs 8.19 ms: **−13.6 %** | 2.49 vs 7.07 ms: −64.8 % |
| CPU ONNX, N | 61.50 vs 110.76 ms: −44.5 % | not measured |
| CPU ONNX, S | 140.07 vs 267.50 ms: −47.6 % | not measured |
| PyTorch FP32, N | 12.28 vs 11.07 ms: **+10.9 % (slower)** | not measured |
| PyTorch FP32, S | 13.69 vs 11.87 ms: **+15.3 % (slower)** | not measured |
| PyTorch FP16, N / S | 243.04 vs 15.18; 191.99 vs 18.11 ms: **anomalous** | not measured |
| YOLOv10-N absolute (TensorRT) | 6.00 ms | 1.84 ms |

The paper's and this study's timings differ in more than hardware: the paper omits I/O overhead, appends a TensorRT NMS plugin and measures on COCO images; this study measures Ultralytics' own preprocessing, inference and postprocessing per image on a one-class task (§11.2).

---

## 11. Discussion and Interpretation

Each statement is marked **Evidence** (follows from the saved numbers or code) or **Hypothesis** (a reasoned explanation not tested here), with the check that would settle it.

### 11.1 Why accuracy does not separate the models

- **Evidence.** mAP50 lies between 98.2 and 98.7 % for all four; mAP50-95 between 45.1 and 45.8 %. YOLOv10 minus YOLOv8 is 0.0 / −0.1 (N) and −0.3 / −0.4 (S). The paper reports +1.2 / +1.4 AP.
- **Evidence.** Each model was trained once (seed 42) on a task where mAP50 is near 99 %; the test split has 1,153 images. No confidence interval was computed.
- **Evidence.** The setting differs from the paper's on the points that matter most for the paper's accuracy claim: pretrained instead of from scratch, 60 instead of 500 epochs, one class instead of 80, and the Ultralytics implementation.
- **Hypothesis.** Fine-tuning from COCO weights on a one-class task erases most architecture-driven differences; and the paper itself says the NMS-free head hurts small models (−1.0 AP at N), which could offset the architectural gain. *Check:* three or more seeds per model, a bootstrap confidence interval on the test images, and a from-scratch run of N.
- **Consequence.** The accuracy question (RQ1) is answered as "no measurable difference on this data", not as "YOLOv10 is worse".

### 11.2 Why the speed gap is 13 %, not 65–70 %

- **Evidence.** The paper's Latency^f shows no forward-pass difference (1.77 vs 1.79 ms at N); the claimed gain is NMS time on COCO. In this study the NMS-based model is YOLOv8 with **one class**, where candidate boxes and NMS cost are much smaller than with 80 classes.
- **Evidence.** The measured time includes Ultralytics' CPU preprocessing (letterbox resize) and Python-side postprocessing, which the paper omits ("I/O overhead is omitted"). A fixed cost of this kind compresses a ratio: YOLOv10-N takes 6.00 ms here against 1.84 ms in the paper.
- **Hypothesis.** These two differences explain most of the shrinkage. *Check:* the `ms_breakdown` (preprocess / inference / postprocess) saved in each `results.json`; if preprocessing is several ms for both models, the inference-plus-postprocess gap is what to compare with the paper.
- **Evidence (CPU).** On the CPU the YOLOv10 advantage is 44.5 % (N) and 47.6 % (S). Here NMS runs on the same slow device and the models differ more, so the direction of the paper's claim holds. The CPU numbers come from 50 images and two jobs running at once (§11.6).

### 11.3 PyTorch FP32 and the FP16 anomaly

- **Evidence.** In eager PyTorch FP32, YOLOv10 is slower than YOLOv8 at both sizes (+1.2 ms and +1.8 ms), opposite to the paper's claim. The paper only measures TensorRT FP16.
- **Hypothesis.** Eager execution runs the extra YOLOv10 modules (partial self-attention, large-kernel and decoupled-downsampling layers) without the fusion that TensorRT applies, so the architectural cost is visible without the engine; the NMS saving is too small on one class to compensate. *Check:* the `ms_breakdown` of the FP32 runs.
- **Evidence.** In PyTorch FP16, `v10n` takes 243.04 ms and `v10s` 191.99 ms, 19.8 × and 14.0 × their FP32 time, while YOLOv8 FP16 (15.18, 18.11 ms) is 1.4–1.5 × its FP32 time. FP16 is normally not slower than FP32 on a T4; a 14–20 × slowdown specific to YOLOv10 points to something other than arithmetic speed.
- **Hypothesis.** A YOLOv10-specific operation in half precision (for example the post-processing or a layer that falls back to a slow path), or the first-call autotuning not covered by the 15 warm-up images, is the cause. *Check:* the FP16 `ms_breakdown` (which stage grew), a longer warm-up, and a repeat of the measurement with the two YOLOv10 jobs not running at the same time as the YOLOv8 jobs.
- **Consequence.** The FP16 figures are reported as printed but **excluded from every conclusion**.

### 11.4 Model size: 2.71 M versus the paper's 2.3 M

- **Evidence.** The parameter and GFLOP counts are taken from the saved `best.pt` model. YOLOv8-N with one class has 3.01 M parameters (the paper's 3.2 M has 80 classes), so a one-class head should *lower* the count; YOLOv10-N shows 2.71 M, **above** the paper's 2.3 M, and 8.50 GFLOPs against 6.7 (and above YOLOv8-N's 8.20).
- **Hypothesis.** The checkpoint still contains the **one-to-many head** used only in training, and the counter includes it. The paper's numbers describe the deployed one-to-one graph. The same would explain 8.07 M vs 7.2 M and 24.9 vs 21.6 GFLOPs at S. *Check:* count parameters after fusing/removing the one-to-many branch, or read the count that Ultralytics prints for the exported engine.
- **Consequence.** The 10 % (N) and 27.6 % (S) parameter advantage in §6.2 is probably an *underestimate* of the deployed advantage for YOLOv10-N; with the paper's counts the advantage would be 28 % and 36 %.

### 11.5 Conditions, small plates and false alarms

- **Evidence.** YOLOv10 is better at night at both sizes (+2.2, +2.6 points mAP50) and clearly better for blurry S (+4.2). YOLOv8 is better on synthetic rain (−5.3 for N, −1.3 for S) and, for S, in fog (−2.4 for v10s) and clear (−1.2).
- **Evidence.** Every model loses 15–20 points of mAP50 on synthetic rain, far more than for any other condition.
- **Evidence.** Small-plate recall (20/40/60/40 %) moves in steps of 20 points; the small-plate mAP50 values (92.3/96.8/92.8/84.5) point in a different direction. The 12.3-point gap between `v10s` and `v8s` for small plates is the largest model difference in the study, and it is based on an unknown, probably small, number of plates.
- **Hypothesis.** Night and blur differences could come from the one-to-one head's different handling of low-contrast, repeated candidate boxes; rain differences from the synthetic rain texture producing many false candidate boxes that NMS removes more easily. Neither was tested. *Check:* the per-condition counts of plates and a seed repeat; for rain, view the predictions on a few rain images.
- **Evidence.** False alarms are 6, 11, 11 and 9 photos of 160; NMS-free does not mean fewer false alarms at the confidence threshold used.

### 11.6 Training time and the time cap

- **Evidence.** `v10n` needed 159.4 min against `v8n`'s 105.9 min, but `v10s` (152.6 min) needed less than `v10n`. The jobs shared one machine's CPU for data loading, and the pairs overlapping in time changed over the run (`v10n` with `v8n`, then `v10s` with `v8s` and with the lighter character jobs). The training-time column is therefore not a clean cost comparison.
- **Evidence.** `v10n` ended 3.4 min past its 156-min cap.
- **Hypothesis.** `v10n` completed 60 epochs (2.66 min per epoch → 159.4 min), or was stopped at epoch 59 or 60. *Check:* `epochs_run` and `best_epoch` in `runs/v10n/results.json`. If it was stopped, `v10n` has had at most one epoch fewer than the others, which cannot explain a 0.1-point difference but should be stated.

### 11.7 Character detectors

- **Evidence.** `chars_v8n` reads 16 more plates exactly than `chars_v10n` (547 vs 531 of 651), mostly on clear plates (+19) and synthetic rain (+18). `chars_v10n` is ahead at night by 3 plates; blurry and fog are equal.
- **Evidence.** A 16-plate difference on one seed is about 2.5 points, comparable with the seed-to-seed variation one expects from a single training run.
- **Hypothesis.** At 320 px with many small, touching Bangla characters, the one-to-one head's single prediction per object may drop or merge neighbours, which costs whole-plate accuracy even when per-box accuracy is similar. *Check:* compare character-box mAP and the `rows` vs `xsort` decoders in `results.json`, and repeat with three seeds.

### 11.8 What the study says about the paper

- **Evidence.** The NMS-free idea works: YOLOv10 matches YOLOv8's accuracy at both sizes with a smaller model at S, and is faster under TensorRT FP16 and on the CPU.
- **Evidence.** The size of the speed-up and the accuracy gain depend on the protocol; here, with one class and a different timing method, they are far below the paper's headline numbers.
- **Evidence.** In eager PyTorch the YOLOv10 advantage disappears, so the claim is a deployment claim (compiled engine, or CPU with NMS cost), not a framework-level one.

---

## 12. Limitations of This Study

1. **Fine-tuning, not reproduction.** COCO-pretrained weights, one class, 60 epochs; the paper's COCO from-scratch 500-epoch results are not reproduced.
2. **Different implementation.** Ultralytics 8.4.170 YOLOv10 and YOLOv8, not the authors' code and not necessarily their model definitions.
3. **Single run.** One seed (42) per model; no confidence intervals. On 1,153 test images the mAP differences of ≤ 0.8 points are within plausible noise.
4. **N and S only.** M, B, L and X, and all of the paper's ablations (dual assignments, matching metric, efficiency/accuracy modules), were not run.
5. **Latency protocol differs from the paper** (§10.2): Ultralytics preprocessing and postprocessing included, one-class NMS, T4 shared by nothing but with two jobs on the machine, 200 images (CPU: 50 images).
6. **PyTorch FP16 anomaly** for both YOLOv10 models is unexplained and excluded from conclusions.
7. **Concurrent runs.** Trainings and timings ran in pairs on one machine; training times and CPU latency may be affected by CPU contention.
8. **Possible time-cap stop of `v10n`** at epoch 59 or 60 (§11.6), to verify.
9. **Small subsets.** Small-plate recall (probably five plates), night (65 plates in OCR), fog (26), and the 160-photo plate-free set.
10. **Synthetic conditions.** Rain and detection-fog copies are synthetic and show nothing about real weather.
11. **Auto-labelled training data.** 4,507 of 8,574 detection training images carry automatic labels; test and validation are human-labelled.
12. **Parameter and GFLOP counts** probably include the training-only head (§11.4).
13. **Values not available** for this report: P, R, validation results, best epoch, epochs run, `ms_breakdown`, plates per size, character-box mAP.

---

## 13. Conclusions and Recommendations

### Conclusions

1. On Bangla plates, fine-tuned YOLOv10-N/S and YOLOv8-N/S are **equal in accuracy**: 98.2–98.7 % mAP50 and 45.1–45.8 % mAP50-95. The paper's AP advantage is not reproduced in this setting.
2. YOLOv10 is **faster under TensorRT FP16 (−12.7 % N, −13.6 % S) and on the CPU (−44.5 % N, −47.6 % S)**, but not in eager PyTorch FP32, where it is 11–15 % slower. The size of the TensorRT advantage is far below the paper's 65–70 %.
3. YOLOv10-S is **27.6 % smaller** than YOLOv8-S in parameters; YOLOv10-N is 10 % smaller, probably understated by a training-only head in the checkpoint.
4. The models differ by condition: YOLOv10 is better at night and blur, YOLOv8 on synthetic rain. All models degrade strongly on synthetic rain.
5. As a character detector for plate reading, YOLOv8-N is ahead of YOLOv10-N by 2.45 points (16 plates of 651).
6. The YOLOv10 PyTorch FP16 latencies (243.04 / 191.99 ms) are measurement anomalies to be re-run; the small-plate recall values rest on too few plates to rank the models.

### Recommendations

| # | Recommendation | Based on |
|---|---|---|
| 1 | Choose YOLOv10-N when the deployment is TensorRT or CPU ONNX and plate-free false alarms matter (3.75 % in this run) | §8.2, §10.1 |
| 2 | Choose YOLOv8-N when eager PyTorch is the runtime, or when the plate-reading pipeline uses character detectors | §10.1, §9.1 |
| 3 | Do not use the PyTorch FP16 figures of the YOLOv10 models for any decision until re-measured | §11.3 |
| 4 | Do not claim a YOLOv10 accuracy advantage or disadvantage on this data from single-seed numbers | §11.1 |
| 5 | Prefer YOLOv10-S where night or blur plates are common; do not rely on its small-plate numbers yet | §7.2, §8.1 |
| 6 | State the latency protocol next to every latency number (what is included, which runtime, how many images) | §10.2 |
| 7 | Report the plate counts behind every per-condition percentage | §8, §9.2 |

### Experiments that would settle the open questions

| # | Experiment | Settles |
|---|---|---|
| 1 | Read `results.json` of all six runs: `epochs_run`, `best_epoch`, P, R, `ms_breakdown`, `plates_by_size`, `no_plate.photos` | §6.4, §8.1, §11.2, §11.6 |
| 2 | Re-run the PyTorch FP16 speed test of `v10n` and `v10s` alone on an idle machine with a longer warm-up; log the stage breakdown | §11.3 |
| 3 | Measure latency like the paper (model + NMS plugin, no I/O) and with the one-class NMS replaced by an 80-class setting | §11.2 |
| 4 | Count parameters/FLOPs of the deployed one-to-one graph | §11.4 |
| 5 | Three or more seeds per model; bootstrap confidence intervals on the 1,153 test images | §11.1, §11.7 |
| 6 | Train N from scratch for 500 epochs, or at least without COCO weights | §11.1 |
| 7 | Enlarge the small-plate test set (or add synthetic downscaling of real plates) | §8.1 |
| 8 | Re-run the speed tests with one job at a time, 1,000 images on GPU and 200 on CPU | §10, §12 |
| 9 | Compare character-box mAP, the `rows` and `xsort` decoders and three seeds for the character detectors | §11.7 |

---

## 14. Reproducibility

### 14.1 Commands (from the notebook)

```bash
pip install ultralytics==8.4.170

# GPU 0 queue (YOLOv10) and GPU 1 queue (YOLOv8) run at the same time
python lprkit/det.py --data yaml/detection_all.yaml --model yolov10n.pt --name v10n --project runs --epochs 60 --imgsz 640 --batch 16 --fraction 1.0 --max-hours 2.6
python lprkit/det.py --data yaml/detection_all.yaml --model yolov10s.pt --name v10s --project runs --epochs 60 --imgsz 640 --batch 16 --fraction 1.0 --max-hours 3.6
python lprkit/rec.py --data yaml/recognition_all.yaml --model yolov10n.pt --name chars_v10n --project runs --epochs 70 --imgsz 320 --batch 32 --fraction 1.0 --max-hours 1.2

python lprkit/det.py --data yaml/detection_all.yaml --model yolov8n.pt --name v8n --project runs --epochs 60 --imgsz 640 --batch 16 --fraction 1.0 --max-hours 2.6
python lprkit/det.py --data yaml/detection_all.yaml --model yolov8s.pt --name v8s --project runs --epochs 60 --imgsz 640 --batch 16 --fraction 1.0 --max-hours 3.6
python lprkit/rec.py --data yaml/recognition_all.yaml --model yolov8n.pt --name chars_v8n --project runs --epochs 70 --imgsz 320 --batch 32 --fraction 1.0 --max-hours 1.2

# Speed (after training; one run per GPU)
python lprkit/det.py --data yaml/detection_all.yaml --name v10n --project runs --imgsz 640 --fps-only --trt
```

The notebook has a `FAST = True` smoke-test mode (1 epoch, about 3 % of the images, 40 test images); the reported results use `FAST = False` (Save Version → Save & Run All).

### 14.2 Supplied artefacts

`paper27_outputs.zip` (248.9 MB, with weights), `paper27_results.zip` (6.3 MB, no weights), the six `best.pt` files (`paper27_v10n_best.pt`, `paper27_v10s_best.pt`, `paper27_v8n_best.pt`, `paper27_v8s_best.pt`, `paper27_chars_v10n_best.pt`, `paper27_chars_v8n_best.pt`), `results_vs_paper.md`, `README.md` and the paper PDF. See [Appendix E](#appendix-e--artefact-manifest).

### 14.3 Determinism

Seed 42 was set for every training. GPU training with Ultralytics is not bit-exact, and speed tests depend on the machine's state, so repeating the notebook gives similar but not identical numbers. The dataset is downloaded from a fixed team Drive file; the condition lists are fixed team-wide files.

---

## Appendix A — Training Arguments and Run Timeline

| Argument | Detectors (`det.py`) | Character detectors (`rec.py`) |
|---|---|---|
| Epochs (planned) | 60 | 70 |
| Input size / batch | 640 / 16 | 320 / 32 |
| Optimiser | SGD | Ultralytics default of `rec.py` (see `code/rec.py`) |
| Initial weights | COCO-pretrained `.pt` | COCO-pretrained `.pt` |
| Seed / patience | 42 / 100 | 42 / see `rec.py` |
| Time cap | 2.6 h (N), 3.6 h (S) | 1.2 h |
| Training images | 8,574 (human 4,067 + auto 4,507) | recognition_all (see §5.1) |

**Timeline (seconds in the notebook log)**

| Time (s) | Event |
|---|---|
| 76 | Dataset ready |
| 102 | `v10n` (GPU 0) and `v8n` (GPU 1) start |
| 6,662 | `v8n` done after 109.3 min; `v8s` starts |
| 9,882 | `v10n` done after 163.0 min; `v10s` starts |
| 14,303 | `v8s` done after 127.3 min; `chars_v8n` starts |
| 16,263 | `chars_v8n` done after 32.7 min |
| 19,233 | `v10s` done after 155.8 min; `chars_v10n` starts |
| 20,943 | `chars_v10n` done after 28.5 min; speed tests start |
| 21,463 | Speed tests done; results table written |
| 21,476 | Output archives packed (248.9 MB and 6.3 MB) |

The log wall times (109.3, 163.0, 127.3, 155.8 min) are slightly larger than the `train_minutes` of the comparison table (105.9, 159.4, 123.7, 152.6) because the wall time includes the final validation, test and condition evaluation.

---

## Appendix B — Latency Comparison and Derived Figures

All values in milliseconds per image, batch 1, 640 px.

| Run | FP32 | FP16 | TensorRT FP16 | CPU ONNX | TensorRT speed-up over FP32 |
|---|---|---|---|---|---|
| `v10n` | 12.28 | 243.04 ⚠ | 6.00 | 61.50 | 2.05 × |
| `v10s` | 13.69 | 191.99 ⚠ | 7.08 | 140.07 | 1.93 × |
| `v8n` | 11.07 | 15.18 | 6.87 | 110.76 | 1.61 × |
| `v8s` | 11.87 | 18.11 | 8.19 | 267.50 | 1.45 × |

| Derived | N | S |
|---|---|---|
| TensorRT, v10 faster than v8 by | 12.7 % | 13.6 % |
| CPU ONNX, v10 faster than v8 by | 44.5 % | 47.6 % |
| FP32, v10 slower than v8 by | 10.9 % | 15.3 % |
| FP16, v10 / v8 time ratio | 16.0 × | 10.6 × |
| Paper: v10 faster than v8 by | 70.1 % | 64.8 % |
| Paper: parameter reduction | 28.1 % | 35.7 % |
| Paper: FLOP reduction | 23.0 % | 24.5 % |
| This study: parameter reduction | 10.0 % | 27.6 % |
| This study: FLOP reduction | −3.7 % | 12.9 % |

The per-stage `ms_breakdown` (preprocess / inference / postprocess) is saved in each run's `results.json` and was not available.

---

## Appendix C — Full Metrics of All Six Runs

**Detectors (test)**

| Run | mAP50 | mAP50-95 | Params (M) | GFLOPs | Small-plate recall | Train min | FP32 | FP16 | TRT FP16 | CPU ONNX |
|---|---|---|---|---|---|---|---|---|---|---|
| `v10n` | 98.7 | 45.1 | 2.71 | 8.50 | 20.00 | 159.40 | 12.28 | 243.04 | 6.00 | 61.50 |
| `v10s` | 98.2 | 45.4 | 8.07 | 24.90 | 40.00 | 152.60 | 13.69 | 191.99 | 7.08 | 140.07 |
| `v8n` | 98.7 | 45.2 | 3.01 | 8.20 | 60.00 | 105.90 | 11.07 | 15.18 | 6.87 | 110.76 |
| `v8s` | 98.5 | 45.8 | 11.14 | 28.60 | 40.00 | 123.70 | 11.87 | 18.11 | 8.19 | 267.50 |

**Detectors by condition (mAP50 %) and false alarms**

| Run | All | Clear | Night | Blurry | Small | Rain | Fog | False alarms % |
|---|---|---|---|---|---|---|---|---|
| `v10n` | 98.7 | 98.9 | 96.7 | 98.3 | 92.3 | 78.5 | 96.4 | 3.75 |
| `v10s` | 98.2 | 97.8 | 96.9 | 99.4 | 96.8 | 81.2 | 95.5 | 6.88 |
| `v8n` | 98.7 | 99.0 | 94.5 | 97.8 | 92.8 | 83.8 | 96.3 | 6.88 |
| `v8s` | 98.5 | 99.0 | 94.3 | 95.2 | 84.5 | 82.5 | 97.9 | 5.62 |

**Character detectors (plate exact %)**

| Run | All | Clear | Night | Blurry | Fog (real) | Rain (synthetic) | Train min |
|---|---|---|---|---|---|---|---|
| `chars_v10n` | 81.57 | 83.75 | 78.46 | 75.00 | 73.08 | 68.51 | 27.80 |
| `chars_v8n` | 84.02 | 87.71 | 73.85 | 75.00 | 73.08 | 71.27 | 31.80 |

---

## Appendix D — Paper Tables Used for Comparison

**Table 1 (extract) — COCO val, T4, TensorRT FP16**

| Model | Params (M) | FLOPs (G) | AP^val (%) | Latency (ms) | Latency^f (ms) |
|---|---|---|---|---|---|
| YOLOv8-N | 3.2 | 8.7 | 37.3 | 6.16 | 1.77 |
| YOLOv10-N | 2.3 | 6.7 | 38.5 / 39.5† | 1.84 | 1.79 |
| YOLOv8-S | 11.2 | 28.6 | 44.9 | 7.07 | 2.33 |
| YOLOv10-S | 7.2 | 21.6 | 46.3 / 46.8† | 2.49 | 2.39 |

**Table 2 — Ablation, YOLOv10-S / YOLOv10-M (COCO)**

| # | Model | NMS-free | Efficiency | Accuracy | Params (M) | FLOPs (G) | AP (%) | Latency (ms) |
|---|---|---|---|---|---|---|---|---|
| 1 | S | | | | 11.2 | 28.6 | 44.9 | 7.07 |
| 2 | S | ✓ | | | 11.2 | 28.6 | 44.3 | 2.44 |
| 3 | S | ✓ | ✓ | | 6.2 | 20.8 | 44.5 | 2.31 |
| 4 | S | ✓ | ✓ | ✓ | 7.2 | 21.6 | 46.3 | 2.49 |
| 5 | M | | | | 25.9 | 78.9 | 50.6 | 9.50 |
| 6 | M | ✓ | | | 25.9 | 78.9 | 50.3 | 5.22 |
| 7 | M | ✓ | ✓ | | 14.1 | 58.1 | 50.4 | 4.57 |
| 8 | M | ✓ | ✓ | ✓ | 15.4 | 59.1 | 51.1 | 4.74 |

**Training hyper-parameters (paper, Appendix A.1 / Table 14, extract):** 500 epochs, SGD, momentum 0.937, weight decay 5×10⁻⁴, 3 warm-up epochs, initial learning rate 1×10⁻² decaying to 1×10⁻⁴, 8 × NVIDIA 3090.

---

## Appendix E — Artefact Manifest

| Path | Description |
|---|---|
| `Paper27_Report.md` | This report |
| `Paper27_README.md` | Model card, usage guide, file manifest |
| `paper27_v10n_best.pt`, `paper27_v10s_best.pt` | YOLOv10-N / S plate detectors (`best.pt`) |
| `paper27_v8n_best.pt`, `paper27_v8s_best.pt` | YOLOv8-N / S plate detectors (`best.pt`) |
| `paper27_chars_v10n_best.pt`, `paper27_chars_v8n_best.pt` | YOLOv10-N / YOLOv8-N character detectors |
| `paper27_results.zip` | Results archive (6.3 MB, no weights) |
| `paper27_outputs.zip` (repository `output/`) | Full output archive (248.9 MB, with weights) |
| `results_vs_paper.md` | Comparison table generated by the notebook |
| `27_2024_YOLOv10 Real-Time End-to-End Object Detection.pdf` | The paper (arXiv:2405.14458) |
| `runs/<run>/results.json`, `results.csv`, `args.yaml` | Per-run summary, per-epoch log and Ultralytics arguments (inside the archive) |
| `logs/<run>.log`, `environment.json` | Run logs and library/hardware versions (inside the archive) |
| `code/det.py`, `rec.py` | Detector and character-detector training/evaluation |
| `code/common.py`, `report.py`, `metrics.py`, `vocab.py` | Shared toolkit |
| `code/seq.py`, `ved.py` | Toolkit modules (sequence and transformer OCR) not used for Paper #27 |
| `notebooks/Md.Yousuf/paper27_run.ipynb` | Executable Kaggle notebook |

---

## References

1. A. Wang, H. Chen, L. Liu, K. Chen, Z. Lin, J. Han and G. Ding, "YOLOv10: Real-Time End-to-End Object Detection," NeurIPS 2024, arXiv:2405.14458v2 [cs.CV], 2024. (Paper #27.)
2. G. Jocher et al., Ultralytics YOLOv8 / Ultralytics 8.4.170 (YOLOv8 baseline and the implementation used here).
3. Y. Zhao et al., "DETRs Beat YOLOs on Real-time Object Detection" (RT-DETR). (Latency protocol followed by the paper.)
4. T.-Y. Lin et al., "Microsoft COCO: Common Objects in Context." (Pre-training data and the paper's benchmark.)
5. Team dataset (detection and recognition parts).

---

*End of `Paper27_Report.md` — Md. Yousuf, 21 October 2026.*

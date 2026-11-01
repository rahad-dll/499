# Paper26_Report.md — Re-implementation and Evaluation Report

> **Document name:** `Paper26_Report.md`
> **Title:** Re-implementation and Evaluation of *"YOLOv12: Attention-Centric Real-Time Object Detectors"* (Paper #26) on Bangla Licence Plates
> **Author / Implementer:** Md. Yousuf
> **Project:** 498R BanglaLPR — team paper re-implementation study
> **Date:** 1 November 2026 (notebook run: 31 October 2026)
> **Companion file:** `Paper26_README.md` (model card, usage guide, file manifest)
> **Source folder:** `weights/paper26/Md.Yousuf` in the team repository `Rokib-Hasan-Oli/CSE498R`
> **Environment:** Kaggle Notebook, 2 × Tesla T4, Python 3.13.15, PyTorch 2.11.0+cu128, Ultralytics 8.4.170 (and the official YOLOv12 fork, which reports Ultralytics 8.3.63)

**Source of every number.** All results in this report come from the completed notebook output (`paper26_run.ipynb`: run log, the generated `results_vs_paper.md`), from the per-run `results.json`, `results.csv`, `args.yaml` and log files inside `paper26_results.zip`, from `environment.json`, and from the code written by the notebook (`lprkit/det.py`, `rec.py`, `common.py`, `report.py`, `p26_official.py`). Statements about the original paper come from the paper itself (arXiv:2502.12524v1, 18 Feb 2025, technical report; Tables 1, 2, 3, 5, 6, 7 and the text of §1–§5 were read). Numbers marked *derived* are simple arithmetic on the printed values (for example a difference, a ratio, or a count back-computed from a percentage). Where this study did not measure something, the report says so. The model weights (`best.pt`), the full outputs archive, and the team file `detection/conditions.json` were **not available** while this report was written; every value that would come only from them is marked "not available".

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
- [Appendix C — Full Metrics of All Five Runs](#appendix-c--full-metrics-of-all-five-runs)
- [Appendix D — Paper Tables Used for Comparison](#appendix-d--paper-tables-used-for-comparison)
- [Appendix E — Artefact Manifest](#appendix-e--artefact-manifest)
- [References](#references)

---

## 1. Executive Summary

Paper #26 introduces **YOLOv12**, an attention-centric real-time detector. It adds an *area attention* module (A2) that splits the feature map into l = 4 areas to cut the cost of self-attention, *residual efficient layer aggregation networks* (R-ELAN), and several changes that make attention fit YOLO (FlashAttention, no positional encoding, MLP ratio 1.2, a 7×7 separable "position perceiver" convolution). On COCO, trained from scratch for 600 epochs, it reports 40.6 % AP (N) and 48.0 % AP (S) at 1.64 ms and 2.61 ms on a T4 with TensorRT FP16, against YOLO11-N/S at 39.4 % / 46.9 % AP and 1.5 / 2.5 ms.

This study tests the claim on **Bangla (BRTA) licence plates** from the team's 498R BanglaLPR All-in-One dataset (v1.1). It is a **fine-tuning study**, not a COCO reproduction. Three COCO-pretrained S-size one-class plate detectors were fine-tuned under the same split and settings (60 epochs planned, 640 px, SGD, seed 42): **YOLOv12-S trained with the authors' own code** (`v12s_official`), **YOLO12-S in Ultralytics 8.4.170** (`v12s_ultra`), and **YOLO11-S** as the baseline (`v11s`). They were evaluated on 1,153 human-labelled test images (1,011 plates) and timed end-to-end at batch 1. As an extra, YOLOv12-N and YOLO11-N were trained as character detectors for plate reading (`chars_v12n`, `chars_v11n`).

### 1.1 Headline results (detection test split, 1,153 images)

| Metric | YOLOv12-S, official code (`v12s_official`) | YOLO12-S, Ultralytics (`v12s_ultra`) | YOLO11-S (`v11s`) |
|---|---|---|---|
| mAP50 (%) | 98.6 | 98.9 | **99.0** |
| mAP50-95 (%) | **48.5** | 46.2 | 46.2 |
| Parameters (M) | 9.10 | 9.25 | 9.43 |
| GFLOPs | 19.60 | 23.50 | 21.70 |
| Peak GPU memory in training (GB) | 7.94 | 7.75 | **5.19** |
| End-to-end ms, TensorRT FP16 (T4) | – (export failed) | 7.87 | **7.56** |
| End-to-end ms, PyTorch FP32 (T4) | 21.86 | 20.60 | **14.82** |
| End-to-end ms, PyTorch FP16 (T4) | 232.96 ⚠ | 153.37 ⚠ | 162.99 ⚠ |
| End-to-end ms, CPU ONNX | 281.32 † | **175.55** | 184.53 |
| Small-plate recall (%) (5 plates) | 60.00 | **80.00** | 40.00 |
| False alarms on plate-free photos (%) | **8.12** | 10.00 | 8.75 |
| Training time (min) | 256.10 (50 epochs) | 175.60 | **127.10** |
| Epochs run (of 60 planned) | 50 | 60 | 60 |

† Measured while another job shared the machine; see §10 and §11.3. ⚠ Anomalous; excluded from conclusions (§11.4).

| Character detector (plate reading) | `chars_v12n` | `chars_v11n` |
|---|---|---|
| Plate exact (%) | 82.80 | **83.56** |
| Character-box mAP50 on `rec/test` (%) | 92.3 | **96.2** |
| Character error rate, CER (%) | 3.58 | **3.09** |
| Training time (min) | 51.10 | **25.90** |

### 1.2 Findings

1. **Accuracy: the Ultralytics YOLO12-S ties YOLO11-S; the official-code run leads only on mAP50-95.** All three reach 98.6–99.0 % mAP50. YOLO12-S (Ultralytics) minus YOLO11-S is −0.08 points of mAP50 and −0.03 points of mAP50-95 (*derived*), against the paper's +1.1 AP on COCO. The official-code run is +2.3 points of mAP50-95 over YOLO11-S but −0.4 points of mAP50, and it is not ahead on any box-fit measure computed by the same code for all runs (precision 87.4 % vs 92.3 %, IoU > 0.7 accuracy 65.7 % vs 67.3 %). The official run is also not like-for-like (50 instead of 60 epochs, a different code version, different starting weights, different augmentation defaults) (§11.2).
2. **Speed: "comparable speed" is confirmed under TensorRT, but YOLO12 is much slower in eager PyTorch.** With TensorRT FP16, YOLO12-S takes 7.87 ms against 7.56 ms for YOLO11-S: **+4.1 %** (*derived*), almost the same as the paper's 2.61 vs 2.5 ms (+4.4 %). In eager PyTorch FP32 it is **+39.0 %** slower (20.60 vs 14.82 ms). On the CPU (ONNX) it is 4.9 % faster, but the two jobs used different ONNX Runtime versions (§11.3). The official-code TensorRT export failed (`No module named 'onnxscript'`), so no TensorRT number exists for it.
3. **All three PyTorch FP16 latencies are anomalous** (153.37 / 232.96 / 162.99 ms, 7–11 × their FP32 time, while the single-image stage breakdown saved in the same file sums to only 15–23 ms). They are reported as printed, flagged, and excluded from every conclusion (§11.4).
4. **Attention costs memory and training time.** Peak training memory is 7.75 GB for YOLO12-S against 5.19 GB for YOLO11-S (+49 %, *derived*); time per epoch is 2.93 against 2.12 min (+38 %, *derived*). The official run is the heaviest (7.94 GB, 5.12 min per epoch). The paper does not report training cost.
5. **Size and FLOPs do not match the paper's exactly.** YOLO12-S (Ultralytics) has 9.25 M parameters (paper 9.3 M) but 23.5 GFLOPs (paper 21.4); the official fork reports 9.10 M and 19.6 GFLOPs. The two implementations of the same model do not report the same size (§11.5).
6. **Conditions split the models.** YOLO12-S (Ultralytics) is best at night (98.4 % mAP50) and on blur (99.2 %) but worst on synthetic rain (83.1 %); the official run is best on synthetic rain (88.2 %) and on small plates (95.2 %) but worst at night (91.0 %) and on blur (96.8 %). Night, blurry and small-plate subsets hold only 71, 53 and 24 plates (*derived*), so single-plate steps move the numbers.
7. **Small-plate recall (60 / 80 / 40 %) rests on 5 plates** (3, 4 and 2 plates found, *derived*) and must not be used to rank the models (§8.1).
8. **As character detectors**, YOLO11-N reads 5 more plates exactly than YOLOv12-N (544 vs 539 of 651, *derived*; 83.56 vs 82.80 %), trains in half the time (25.9 vs 51.1 min) and reads a plate faster (13.40 vs 17.24 ms). The character-box mAP50 ranking on the test split (92.3 vs 96.2 %) is the reverse of the validation ranking (92.45 vs 91.87 %).
9. **The official run was stopped by its time cap after epoch 50 of 60**, so it never reached the last 10 epochs (the no-mosaic phase) of its schedule and ended with a learning rate of 1.9 × 10⁻³ instead of 2.7 × 10⁻⁴ (§11.7).
10. **The paper's numbers come from a different task**: COCO, 80 classes, 600 epochs from scratch, TensorRT FP16 with FlashAttention, 8 × batch 32. The comparison shows direction and scale only.

---

## 2. Objectives

Re-implement the paper's comparison — attention-centric YOLOv12 against its YOLO11 baseline — on Bangla plates, with both the authors' code and the Ultralytics implementation, and report what the results do and do not show.

| ID | Question | Answered in |
|---|---|---|
| RQ1 | Does YOLOv12-S detect Bangla plates more accurately than YOLO11-S (paper: +1.1 AP), with the authors' code and with the Ultralytics implementation? | §6, §7 |
| RQ2 | Is YOLOv12-S as fast as YOLO11-S, as the paper claims (2.61 vs 2.5 ms), and what does attention cost in memory and training time? | §6, §10 |
| RQ3 | How do the models behave in night, blur, small-plate, synthetic rain/fog conditions and on plate-free photos? | §7, §8 |
| RQ4 | Does the YOLOv12 vs YOLO11 relation carry over to character detection for plate reading? | §9 |
| RQ5 | Does the authors' code give the same result as the Ultralytics implementation, and how do the results relate to the paper's? | §3, §6.3, §11 |

---

## 3. The Original Paper

**Citation.** Y. Tian, Q. Ye and D. Doermann, "YOLOv12: Attention-Centric Real-Time Object Detectors," technical report, arXiv:2502.12524v1 [cs.CV], 18 Feb 2025. Code: github.com/sunsmarterjie/yolov12.

### 3.1 Contributions claimed

1. **An attention-centric YOLO framework with area attention (A2).** The feature map of size (H, W) is divided into l = 4 vertical or horizontal areas (default l = 4) with a simple reshape, no window partitioning. The cost of attention falls from 2n²hd to ½n²hd while a large receptive field is kept (the receptive field is reduced to ¼ of the original).
2. **Residual efficient layer aggregation networks (R-ELAN).** A block-level residual shortcut with a scaling factor (default 0.01), and a redesigned aggregation: a transition layer adjusts the channels and produces a single feature map, which goes through the blocks and is concatenated (a bottleneck structure with fewer FLOPs and parameters). The residual is needed for stable training of L and X models.
3. **Architecture changes that make attention fit YOLO.** FlashAttention to remove the memory-access bottleneck; no positional encoding; MLP ratio lowered from 4 to 1.2 (2 for N/S/M); `Conv2d + BN` instead of `Linear + LN`; a 7 × 7 separable convolution as "position perceiver"; a single R-ELAN block in the last backbone stage instead of three stacked blocks; the first two backbone stages inherited from YOLO11.
4. **YOLOv12** in N / S / M / L / X sizes with a state-of-the-art accuracy–latency and accuracy–FLOPs trade-off on COCO, without extra tricks such as pre-training.

### 3.2 Dataset and protocol as described in the paper

| Item | Paper's setting |
|---|---|
| Baseline | YOLO11 (same N / S / M / L / X variants; the model scaling strategy and the training settings follow YOLO11); YOLOv6-3.0, Gold-YOLO, YOLOv8, YOLOv9, YOLOv10, RT-DETR and RT-DETRv2 are compared in Table 1 |
| Dataset | MS COCO 2017 (80 classes) |
| Training | From scratch, SGD, **600 epochs**, momentum 0.937, weight decay 5×10⁻⁴, initial lr 1×10⁻², linear decay to 1×10⁻⁴, 3 warm-up epochs, batch size 32 × 8, Mosaic 1.0, close-mosaic 10 epochs; scale 0.5 / 0.9 / 0.9 / 0.9 / 0.9, Mixup 0.0 / 0.05 / 0.15 / 0.15 / 0.2 and copy-paste 0.1 / 0.15 / 0.4 / 0.5 / 0.6 for N / S / M / L / X (Table 7) |
| Latency protocol | T4 GPU, TensorRT FP16, as in YOLOv10 and RT-DETR; FlashAttention used (Table 5h). Speed on other GPUs (RTX 3080, A5000, A6000, FP32 and FP16) is in Table 4; CPU latency is measured with ONNX on an Intel Core i7-10700K @ 3.80 GHz (Figure 4 right, Table 3) |
| Metrics | COCO AP (val), AP50, AP75, AP by object size, parameters, FLOPs, latency |

### 3.3 Results reported by the paper

**Table 1 (extract) — COCO val, 640 × 640, T4 TensorRT FP16**

| Model | FLOPs (G) | Params (M) | AP^val 50:95 (%) | AP^val 50 (%) | AP^val 75 (%) | Latency (ms) |
|---|---|---|---|---|---|---|
| YOLO11-N | 6.5 | 2.6 | 39.4 | 55.3 | 42.8 | 1.5 |
| YOLOv12-N | 6.5 | 2.6 | 40.6 | 56.7 | 43.8 | 1.64 |
| YOLOv8-S | 28.6 | 11.2 | 45.0 | 61.8 | 48.7 | 2.33 |
| RT-DETRv2-R18 | 60.0 | 20.0 | 47.9 | 64.9 | – | 4.58 |
| YOLOv10-S | 21.6 | 7.2 | 46.3 | 63.0 | 50.4 | 2.49 |
| YOLO11-S | 21.5 | 9.4 | 46.9 | 63.9 | 50.6 | 2.5 |
| YOLOv12-S | 21.4 | 9.3 | 48.0 | 65.0 | 51.8 | 2.61 |

The paper summarises the N gains as +3.6 / +3.3 / +2.1 / +1.2 AP over YOLOv6-3.0-N / YOLOv8-N / YOLOv10-N / YOLO11-N, and the S gains as +3.0 / +1.2 / +1.7 / +1.1 AP over YOLOv8-S / YOLOv9-S / YOLOv10-S / YOLO11-S. YOLOv12-S beats RT-DETR-R18 / RT-DETRv2-R18 by 1.5 / 0.1 AP while being 42 % faster, with 36 % of the computation and 45 % of the parameters.

**Table 3 (extract) — Area attention ablation (without FlashAttention; CUDA values are RTX 3080 / A5000, ms)**

| Model | Area attention | CUDA FP32 | CUDA FP16 | CPU (ms) |
|---|---|---|---|---|
| YOLOv12-N | ✗ | 2.7 / 2.5 | 1.5 / 1.5 | 62.9 |
| YOLOv12-N | ✓ | 2.0 / 2.0 | 1.3 / 1.3 | 31.4 |
| YOLOv12-S | ✗ | 5.1 / 4.4 | 2.5 / 2.2 | 130.0 |
| YOLOv12-S | ✓ | 3.5 / 3.1 | 1.7 / 1.7 | 78.4 |

### 3.4 Points in the paper that affect comparison

- **"Comparable speed" means slightly slower than YOLO11.** In Table 1 YOLOv12-S takes 2.61 ms against 2.5 ms for YOLO11-S (+4.4 %, *derived*) and YOLOv12-N 1.64 against 1.5 ms (+9.3 %, *derived*). The paper's advantage is accuracy at a similar cost, not speed.
- **The default latency uses FlashAttention.** Table 5h: without FlashAttention YOLOv12-N takes 1.92 ms (1.64 with) and YOLOv12-S 3.02 ms (2.61 with). The paper states that FlashAttention saves about 0.3 ms (N) and 0.4 ms (S).
- **Long training.** The paper trains for 600 epochs from scratch; the best AP is reached at about 600 epochs (Table 5c: S 47.0 / 47.8 / 48.0 / 47.7 AP at 300 / 500 / 600 / 800 epochs), more than YOLOv8–YOLOv10 need.
- **Large models are hard to optimise.** Without the residual shortcut, L and X models do not converge or are unstable (Table 2); X needs a scaling factor of 0.01.
- **Attention speed gain.** Area attention makes YOLOv12-S 3.5 vs 5.1 ms (RTX 3080, FP32) and 78.4 vs 130.0 ms on the CPU (Table 3), measured without FlashAttention.
- **The paper does not evaluate** licence plates, one-class tasks, fine-tuning from COCO weights, night/blur/rain conditions, training cost, or eager PyTorch latency on a T4. The paper has no separate limitations section.

---

## 4. Implementation versus the Paper

| Component | Paper | This study |
|---|---|---|
| Task | COCO, 80 classes | One class (`plate`) on the 498R BanglaLPR All-in-One v1.1 detection split |
| Training start | From scratch | **COCO-pretrained** weights: the authors' release `yolov12s.pt` (official run, "turbo" release, 18,270 KB), Ultralytics `yolo12s.pt` and `yolo11s.pt`, fine-tuned |
| Epochs | 600 | 60 (planned); the official run stopped after **50** (time cap) |
| Batch / input | 32 × 8 / 640 | 16 / 640 × 640, one T4 per run |
| Optimiser | SGD (lr 1e-2 → 1e-4), momentum 0.937, weight decay 5e-4, 3 warm-up epochs | SGD (set explicitly because Ultralytics 8.4 `auto` would pick MuSGD); lr0 0.01, lrf 0.01, momentum 0.937, weight decay 5e-4, 3 warm-up epochs |
| Augmentation | Mosaic 1.0, scale 0.9, Mixup 0.05, copy-paste 0.15 (S), close-mosaic 10 | Mosaic 1.0, scale 0.5, Mixup 0.0, close-mosaic 10; copy-paste **0.1 in the official fork, 0.0 in Ultralytics 8.4.170**; warm-up bias lr 0.0 (fork) vs 0.1 (8.4.170); RandAugment and random erasing 0.4 in both |
| Implementation | Authors' YOLOv12 code | Three arms: (a) the authors' code (`sunsmarterjie/yolov12`, pinned commit `2abab71`, HEAD on 12 Oct 2026, its own Ultralytics fork 8.3.63); (b) Ultralytics 8.4.170 `yolo12s`; (c) Ultralytics 8.4.170 `yolo11s` |
| Sizes | N / S / M / L / X | S for plate detection; N for character detection |
| Baseline | YOLO11 and others | YOLO11-S (and YOLO11-N for characters) |
| Accuracy metric | COCO AP (val) | mAP50, mAP50-95 on the test split, plus P / R |
| Latency | T4, TensorRT FP16, FlashAttention, COCO val | T4 at batch 1 on 200 test images (CPU: 50): **preprocessing + inference + postprocessing** as reported by Ultralytics, NMS included; PyTorch FP32, PyTorch FP16, TensorRT FP16, and ONNX on the CPU. **FlashAttention was not used by the official fork on the T4** (the fork prints "FlashAttention is not available on this device. Using scaled_dot_product_attention instead.") |
| Model size | Inference graph | Parameters and GFLOPs of the saved `best.pt` model before fusing (§11.5) |
| Extra | — | Per-condition test, plate-free false alarms, peak GPU memory, found-plates by source, and YOLOv12-N vs YOLO11-N as character detectors (320 px, 70 epochs) |
| Hardware | 8 GPUs (batch 32 × 8), T4 for latency | 2 × Tesla T4 (train and latency) |
| Not replicated | — | COCO training, N / M / L / X detection, ablations (area attention, R-ELAN, MLP ratio, position perceiver), FlashAttention on, multiple seeds |

**What YOLOv12 changes in code.** The architecture swaps the last stages' convolutional blocks for area-attention blocks (`A2C2f`) built on `Conv2d + BN`. The official fork uses FlashAttention when the GPU allows it and otherwise falls back to PyTorch `scaled_dot_product_attention`; on the T4 the log shows the fallback. The model printed 497 layers (9.10 M parameters, 19.6 GFLOPs) in the official fork and 272 layers (9.25 M, 23.5 GFLOPs) in Ultralytics 8.4.170, for the same model name (§11.5). Both YOLOv12 and YOLO11 are NMS-based in this study.

---

## 5. Experimental Setup

### 5.1 Dataset — 498R BanglaLPR All-in-One v1.1

Detection (one class, `plate`), as printed by the notebook:

| Split | Images | Notes |
|---|---|---|
| `det/train` human | 4,067 | |
| `det/train` auto | 4,507 | Auto-labelled; training uses human + auto (`detection_all.yaml`), i.e. **8,574** training images (*derived*) |
| `det/val` human | 896 | Model selection |
| `det/test` human | 1,153 | All reported test results; 1,011 plates (small 5, medium 267, large 739, by COCO area) |

Recognition (character detectors):

| Split | Human | Auto | Used for |
|---|---|---|---|
| `rec/train` | 2,399 | 2,136 (+ 930 auto-verified listed in the manifest) | Training the character detectors (`recognition_all.yaml`) |
| `rec/val` | 536 | — | Model selection |
| `rec/test` | 467 | — | Character-box mAP |
| `ocr/val` | 766 | — | Plate reading on validation plates (`ocr_val`) |
| `ocr/test` | 651 | — | Plate reading: the 651 plates scored for **plate exact** |

Condition subsets are fixed team-wide lists (`detection/conditions.json`, `ocr/conditions.json`): real **clear, night, blurry, small plates** and **no-plate** photos; **synthetic** rain and fog copies of the whole test split. Rain (detection and OCR) and detection-fog copies are synthetic; the OCR fog set (`extras_fog`, 26 test plates) is real. The number of plates per detection condition is not stored in `results.json`; it can be back-computed from the printed "found %" values: night **71**, blurry **53**, small plates **24**, synthetic rain and fog **1,011** (*derived*). The size of the clear list is ambiguous (884 or 885, *derived*).

The dataset (3.38 GB as printed by the downloader; the code comment gives 3.63 GB, the two agree if the printed unit is GiB) was downloaded from the team Google Drive folder "All In One 1.1" at the start of the run (23.1 s → 90.3 s in the log, about 67 s including unpacking). The manifest also lists "leaky" KUET splits (`leaky_kuet|…`), end-to-end test images (`e2e|test`, 204) and real fog copies (`extras_fog`); the notebook trains on `detection_all.yaml` and `recognition_all.yaml` only and does not use the leaky splits. The dataset version differs from Paper #27 (v1.0); the detection and recognition counts printed are the same.

### 5.2 Hardware and software

| Item | Value |
|---|---|
| Platform | Kaggle notebook, 2 × Tesla T4; CPU Intel Xeon @ 2.00 GHz; Linux 6.18.55+ |
| Python / PyTorch / CUDA | 3.13.15 / 2.11.0+cu128 / 12.8 |
| Ultralytics | 8.4.170 (pinned by `pip install`) for `v12s_ultra`, `v11s`, `chars_v12n`, `chars_v11n`; the official fork at commit `2abab7153a06…` reporting 8.3.63 for `v12s_official` |
| Other libraries (`environment.json`) | transformers 5.16.1, numpy 2.1.3, OpenCV 4.14.0, timm 1.0.29, peft 0.20.0 |
| ONNX Runtime (CPU speed test) | 1.31.1 for `v12s_official` and `v12s_ultra`; 1.24.4 for `v11s` (as printed in the speed logs) |
| GPU assignment | Queue on GPU 0: `v12s_official` → `chars_v12n` → `chars_v11n`; queue on GPU 1: `v12s_ultra` → `v11s`; the two queues ran at the same time |
| Seed | 42 (all trainings; `deterministic: true`) |
| Run date | 31 October 2026: `environment.json` time 14:25, TensorRT log timestamps 20:12–20:17 |
| Wall time | Until the results table: 21,219 s ≈ **5.89 h** (planned "about 8.5 h" in the notebook banner); packing finished at 21,233 s |

### 5.3 Models and training

**Plate detectors (`det.py`, runs `v12s_official`, `v12s_ultra`, `v11s`)**

| Setting | Value |
|---|---|
| Models | `yolov12s.pt` (authors' release, official fork), `yolo12s.pt`, `yolo11s.pt` (Ultralytics) — all COCO-pretrained |
| Input / batch / epochs | 640 / 16 / 60 |
| Optimiser | SGD, lr0 0.01, lrf 0.01, momentum 0.937, weight decay 5e-4, 3 warm-up epochs, AMP on |
| Seed / patience | 42 / 100 (early stopping effectively off) |
| Time cap | `--max-hours` 4.2 for `v12s_official`, 3.8 for `v12s_ultra`, 3.4 for `v11s`: stop after the epoch that passes the cap (the planned epoch count is kept) |
| Pretrained weights loaded | 733 / 739 items (official), 685 / 691 (`yolo12s`), 493 / 499 (`yolo11s`) |
| Checkpoint | `best.pt`, chosen by Ultralytics fitness (0.1 × mAP50 + 0.9 × mAP50-95) on the validation split |
| Test | The test split is used once, at the end, with `best.pt` |

**Character detectors (`rec.py`, runs `chars_v12n`, `chars_v11n`)**

| Setting | Value |
|---|---|
| Models | `yolo12n.pt`, `yolo11n.pt` (Ultralytics, COCO-pretrained) |
| Input / batch / epochs | 320 / 32 / 70 |
| Augmentation | no horizontal flip, mosaic 0.5, rotation 3°, shear 2°, scale 0.3 |
| Time cap | 1.4 h |
| Pretrained weights loaded | 640 / 691 (`yolo12n`), 448 / 499 (`yolo11n`) items |
| Reading | Every plate of `ocr/test` is read: tokens (district, *Metro*, series letter, six digits) are detected at conf ≥ 0.25 (`min_conf`), then joined with the "rows" decoder (words above, digits below) and scored against the human text; an "xsort" decoder (all tokens left to right, as in paper #2) is scored as well |

### 5.4 Evaluation protocol

- **Accuracy.** `model.val` on the test split: precision P, recall R, mAP50, mAP50-95 (mean over IoU 0.50–0.95). Each run is scored by the Ultralytics version that trained it (8.3.63 for the official run, 8.4.170 for the others).
- **Plate counts.** At conf 0.25 and IoU 0.5: plates found (recall), `correct %` (the share of predicted boxes that match a plate, i.e. precision), the share of images with all plates right and no extra box, recall by plate size (COCO areas on the stored image: small < 32², medium < 96², large), the paper-#1 metric "IoU > 0.7 on every plate", the mean best IoU (missed plates count as 0), and found % by source dataset.
- **Conditions.** `val_metrics` on each condition list (clear, night, blurry, small plates) and on synthetic rain and fog copies; **false alarms** are the share of the 160 plate-free photos with at least one box at conf 0.25.
- **Latency.** `--fps-only --trt`, batch 1, 640 px, the first 200 test images (15 warm-up predictions), `sum(r.speed.values())` = preprocess + inference + postprocess, **averaged over the images**. Four paths: PyTorch FP32, PyTorch FP16, TensorRT FP16 (exported engine) and ONNX on the CPU (first 50 images). Image decoding is not part of `r.speed`. The `ms_breakdown` saved next to each value is the stage split of the **last image only** (a single-image sample), not an average (code in `measure_speed`). The three speed jobs were not run one at a time: `speed_v12s_official` (GPU 0) and `speed_v12s_ultra` (GPU 1) started together and overlapped for the 2.0 min that the official job took; `speed_v11s` then ran alone on GPU 1.
- **Plate exact (character detectors).** Whole plate right after normalising text (NFC, Bangla digits, no spaces/hyphens); CER, character accuracy, token accuracy and WER are from the same pipeline.
- **Peak GPU memory.** Recorded during training (`peak_gpu_mem_GB`); the two queues shared the machine but not a GPU.

---

## 6. Results A — Plate Detection Accuracy, Size and Training Cost

### 6.1 Test accuracy

| Run | mAP50 (%) | mAP50-95 (%) | P (%) | R (%) | Params (M) | GFLOPs | Peak GPU mem (GB) | Training time (min) | Epochs run |
|---|---|---|---|---|---|---|---|---|---|
| `v12s_official` | 98.6 | 48.5 | 96.92 | 96.14 | 9.10 | 19.60 | 7.94 | 256.10 | 50 |
| `v12s_ultra` | 98.9 | 46.2 | 96.72 | 96.22 | 9.25 | 23.50 | 7.75 | 175.60 | 60 |
| `v11s` | 99.0 | 46.2 | 97.27 | 97.23 | 9.43 | 21.70 | 5.19 | 127.10 | 60 |

Four-decimal values from `results.json`: mAP50 0.9859 / 0.9887 / 0.9895; mAP50-95 0.4853 / 0.4618 / 0.4621. Validation (best checkpoint): mAP50 97.26 / 96.80 / 97.33 %, mAP50-95 61.36 / 60.43 / 60.61 %, P 96.57 / 96.40 / 95.98 %, R 93.88 / 94.47 / 95.51 %. Test mAP50-95 is 12–15 points below validation mAP50-95 for all three runs although mAP50 is similar (§11.1).

### 6.2 Differences between the models (points, *derived*)

| Comparison | mAP50 | mAP50-95 | Val mAP50-95 | Params | GFLOPs | Peak memory | Time per epoch |
|---|---|---|---|---|---|---|---|
| YOLO12-S (Ultralytics) − YOLO11-S | −0.08 | −0.03 | −0.18 | −1.9 % | +8.3 % | +49.3 % | +38.2 % |
| YOLOv12-S (official) − YOLO11-S | −0.36 | **+2.32** | +0.75 | −3.5 % | −9.7 % | +53.0 % | +141.8 % |
| YOLOv12-S (official) − YOLO12-S (Ultralytics) | −0.28 | **+2.35** | +0.93 | −1.6 % | −16.6 % | +2.5 % | +75.0 % |
| Paper, YOLOv12-S − YOLO11-S (COCO) | +1.1 AP (50:95) | | | −1.1 % (9.3 vs 9.4 M) | −0.5 % (21.4 vs 21.5 G) | not reported | not reported |

Time per epoch is training time divided by epochs run: 5.12 (`v12s_official`), 2.93 (`v12s_ultra`), 2.12 min (`v11s`).

### 6.3 Next to the paper's Table 1

| Metric | Paper (COCO) | This study (plates) |
|---|---|---|
| YOLOv12-S AP / mAP50-95 | 48.0 | 48.5 (official), 46.2 (Ultralytics) |
| YOLO11-S AP / mAP50-95 | 46.9 | 46.2 |
| YOLOv12-S − YOLO11-S | +1.1 AP | +2.3 (official), −0.03 (Ultralytics) |
| YOLOv12-S params / GFLOPs | 9.3 M / 21.4 G | 9.10 M / 19.60 G (official), 9.25 M / 23.50 G (Ultralytics) |
| YOLO11-S params / GFLOPs | 9.4 M / 21.5 G | 9.43 M / 21.70 G |
| YOLOv12-S TensorRT FP16 latency | 2.61 ms | – (official), 7.87 ms (Ultralytics) |
| YOLO11-S TensorRT FP16 latency | 2.5 ms | 7.56 ms |
| YOLOv12-S vs YOLO11-S latency | +4.4 % | +4.1 % (Ultralytics) |

The comparison shows scale and direction only: COCO AP (80 classes, from scratch, 600 epochs) and one-class fine-tuned mAP50-95 are different quantities. The absolute values are not comparable; the **v12 − v11 differences** are the relevant rows. Only the latency ratio agrees closely with the paper.

### 6.4 Training behaviour

| Run | Epochs run / planned | Best epoch | Val mAP50-95 at epoch 10 (%) | at epoch 30 (%) | best (%) | last (%) | Learning rate at last epoch | Time per epoch (min) |
|---|---|---|---|---|---|---|---|---|
| `v12s_official` | 50 / 60 | 39 | 55.85 | 59.97 | 61.50 | 60.71 | 1.9 × 10⁻³ | 5.12 |
| `v12s_ultra` | 60 / 60 | 36 | 53.58 | 58.40 | 60.27 | 59.69 | 2.7 × 10⁻⁴ | 2.93 |
| `v11s` | 60 / 60 | 47 | 55.27 | 58.91 | 60.50 | 60.10 | 2.7 × 10⁻⁴ | 2.12 |

(Validation values are the in-training values of `results.csv`; the saved `val` block of `results.json` re-evaluates `best.pt` and differs slightly, e.g. 61.36 vs 61.50 % for `v12s_official`.)

- All three runs reach their best validation score between epoch 36 and 47 and then drift down by 0.4–0.8 points, so the planned 60 epochs were not needed for the best checkpoint.
- The official run was stopped by its 4.2 h cap (252 min): the log shows `[time cap] 4.2 h reached after epoch 50: stopping` and `50 epochs completed in 4.248 hours`. Its log has **no** "Closing dataloader mosaic" line, whereas the other four logs have one. By the 60-epoch schedule, mosaic would be switched off for the last 10 epochs (epochs 51–60); the official run therefore trained with mosaic on throughout.
- Training time per run, from `results.json`: 256.10 / 175.60 / 127.10 min; the wall times in the notebook log (262.2 / 179.7 / 130.8 min) are larger because they include the final validation, test and condition evaluation. The two queues ran concurrently on one Kaggle machine with four data-loader workers each, so these times include CPU contention and are not clean cost estimates (§11.7).

---

## 7. Results B — Detection by Condition

### 7.1 Detection mAP50 (%) on the condition subsets (test)

| Run | All test | Clear | Night | Blurry | Small plates | Rain (synthetic) | Fog (synthetic) |
|---|---|---|---|---|---|---|---|
| `v12s_official` | 98.6 | 99.0 | 91.0 | 96.8 | **95.2** | **88.2** | 97.4 |
| `v12s_ultra` | 98.9 | **99.2** | **98.4** | **99.2** | 93.2 | 83.1 | 97.5 |
| `v11s` | **99.0** | **99.2** | 95.6 | 98.2 | 93.2 | 86.3 | **97.6** |

Subset sizes in plates (*derived*): night 71, blurry 53, small plates 24, synthetic rain and fog 1,011.

### 7.2 Differences between the models (points of mAP50, *derived* from the four-decimal values in `results.json`)

| Condition | YOLO12-S (Ultralytics) − YOLO11-S | YOLOv12-S (official) − YOLO11-S | YOLOv12-S (official) − YOLO12-S (Ultralytics) |
|---|---|---|---|
| All test | −0.1 | −0.4 | −0.3 |
| Clear | 0.0 | −0.2 | −0.2 |
| Night | **+2.8** | **−4.6** | **−7.4** |
| Blurry | +1.0 | −1.4 | −2.4 |
| Small plates | 0.0 | +2.1 | +2.1 |
| Rain (synthetic) | **−3.2** | +1.9 | **+5.1** |
| Fog (synthetic) | −0.1 | −0.2 | −0.1 |

### 7.3 Drops from "all test" (points, *derived*)

| Run | to synthetic rain | to night |
|---|---|---|
| `v12s_official` | −10.4 | −7.6 |
| `v12s_ultra` | −15.7 | −0.5 |
| `v11s` | −12.6 | −3.3 |

The rain and detection-fog copies are **synthetic**: they show sensitivity to the team's rendering of rain and fog, not to real weather. Test mAP50-95 per condition (four-decimal values, %): clear 47.86 / 44.73 / 44.64; night 64.28 / 68.13 / 65.87; blurry 62.43 / 63.50 / 62.84; small 55.57 / 55.27 / 56.21; rain 40.75 / 33.78 / 35.30; fog 44.97 / 41.11 / 42.37 (order `v12s_official` / `v12s_ultra` / `v11s`). The official run is +3.1 above Ultralytics YOLO12-S in clear photos, +7.0 in synthetic rain and +3.9 in synthetic fog, but 3.9 below at night (§11.2).

### 7.4 Found plates by source dataset (conf 0.25, IoU 0.5, %)

| Source | Plates | Images | `v12s_official` | `v12s_ultra` | `v11s` |
|---|---|---|---|---|---|
| kuet | 387 | 540 | 98.97 | 99.74 | 99.22 |
| lpdba | 211 | 205 | 98.10 | 97.63 | 97.16 |
| mahedi | 32 | 32 | 100.00 | 100.00 | 100.00 |
| nightlpbd | 60 | 60 | 80.00 | 85.00 | 86.67 |
| ridoykj | 274 | 274 | 99.64 | 100.00 | 99.64 |
| towniyan | 18 | 13 | 94.44 | 100.00 | 88.89 |
| tusar | 29 | 29 | 96.55 | 93.10 | 96.55 |
| **All** | 1,011 | 1,153 | 97.73 | 98.32 | 97.92 |

`nightlpbd` (night photos) is the weakest source for every model (80.0–86.7 %); the sources `towniyan` (18 plates) and `tusar` (29 plates) are too small to rank the models.

---

## 8. Results C — Small Plates and False Alarms

### 8.1 Small-plate recall (conf 0.25, IoU 0.5, COCO "small" area < 32² on the stored image)

| Run | Small (5 plates) | Medium (267 plates) | Large (739 plates) |
|---|---|---|---|
| `v12s_official` | 60.00 % (3) | 95.88 % (256) | 98.65 % (729) |
| `v12s_ultra` | **80.00 %** (4) | **97.00 %** (259) | 98.92 % (731) |
| `v11s` | 40.00 % (2) | 95.88 % (256) | **99.05 %** (732) |

(The counts in brackets are the plates found, *derived* from the percentages; they add up to the 988 / 994 / 990 plates found in §8.3.)

The "small" bucket holds **5 plates**; one plate is 20 points. The 60 / 80 / 40 % values therefore differ by one or two plates and **must not be used to rank the models**. The separate small-plate *condition* list (24 plates, *derived*) gives a different picture: found at conf 0.25 22 / 24 / 23 plates (91.67 / 100.00 / 95.83 %), and mAP50 95.2 / 93.2 / 93.2 % (§7.1). The two calculations use different plate sets (the condition list vs the COCO-area bucket) and different thresholds.

### 8.2 False alarms on plate-free photos (conf 0.25)

| Run | False alarms (%) | Photos |
|---|---|---|
| `v12s_official` | **8.12** | 13 of 160 |
| `v12s_ultra` | 10.00 | 16 of 160 |
| `v11s` | 8.75 | 14 of 160 |

The plate-free set has 160 photos (`no_plate.photos`). The three values differ by at most 3 photos; the attention-based YOLO12-S (Ultralytics) has the most false alarms.

### 8.3 Plate counts and box fit at conf 0.25, IoU 0.5 (test, 1,011 plates in 1,153 images)

| Metric | `v12s_official` | `v12s_ultra` | `v11s` |
|---|---|---|---|
| Plates found (recall, %) | 97.73 | **98.32** | 97.92 |
| Plates found / missed (*derived*) | 988 / 23 | 994 / 17 | 990 / 21 |
| Correct boxes (precision, %) | 87.36 | 89.47 | **92.26** |
| Extra (false-positive) boxes (*derived*) | 143 | 117 | **83** |
| Images with all plates right and no extra box (%) | 88.90 | 90.81 | **92.89** |
| Same, in images (*derived*) | 1,025 | 1,047 | 1,071 |
| IoU > 0.7 accuracy (paper-#1 metric, %) | 65.66 | 66.77 | **67.27** |
| Mean best IoU (%) | 76.28 | **76.64** | 76.54 |

At conf 0.25 YOLO11-S produces the fewest extra boxes and the official YOLOv12-S the most. About one photo in three has at least one plate whose box has IoU ≤ 0.7 with the label, for all three models, which is consistent with the low test mAP50-95 (≈ 46–48 %) next to a mAP50 of 98.6–99.0 %.

---

## 9. Results D — Character Detectors for Plate Reading

### 9.1 Plate exact (%) on the 651 `ocr/test` plates

| Run | All test | Clear | Night | Blurry | Fog (real fog copies) | Rain (synthetic) |
|---|---|---|---|---|---|---|
| `chars_v12n` | 82.80 | 85.83 | 73.85 | **75.00** | 65.38 | **74.04** |
| `chars_v11n` | **83.56** | **87.92** | **78.46** | 67.86 | **69.23** | 69.59 |

### 9.2 The same results as plate counts (*derived*)

| Subset | Plates | `chars_v12n` | `chars_v11n` | Difference |
|---|---|---|---|---|
| All test | 651 | 539 | 544 | v11n +5 |
| Clear | 480 | 412 | 422 | v11n +10 |
| Night | 65 | 48 | 51 | v11n +3 |
| Blurry | 112 | 84 | 76 | v12n +8 |
| Fog (real) | 26 | 17 | 18 | v11n +1 |
| Rain (synthetic) | 651 | 482 | 453 | v12n +29 |

One plate equals 0.154 points on the 651-plate set. The night, blurry and fog subsets (65, 112, 26 plates) are small; a 3-plate or 1-plate difference there is not meaningful. The overall 5-plate gap (0.77 points) is also within what one seed can produce.

### 9.3 Further reading metrics (rows decoder, test, 651 plates)

| Metric | `chars_v12n` | `chars_v11n` |
|---|---|---|
| Plate exact (%) | 82.80 | **83.56** |
| Character error rate, CER (%) | 3.58 | **3.09** |
| Character accuracy (%) | 96.42 | **96.91** |
| Token accuracy (%) | **97.09** | 96.44 |
| Word error rate, WER (%) | **5.46** | 5.78 |
| Valid plate format (%) | 88.33 | **88.94** |
| Reading time per plate (ms) | 17.24 | **13.40** |
| Plate exact on validation plates (`ocr/val`, 766 plates, %) | 78.46 | **78.98** |
| "xsort" decoder, plate exact (%) | 0.00 | 0.00 |
| "xsort" decoder, CER (%) | 48.52 | 48.32 |

The "xsort" decoder (all tokens left to right, as described for paper #2) reads **no** plate exactly with either model (CER about 48 %); the "rows" decoder (words above, digits below) is the one that works on Bangla two-line plates.

### 9.4 Plate exact by source (%, rows decoder, test)

| Source | Plates | `chars_v12n` | `chars_v11n` |
|---|---|---|---|
| anpr | 184 | 79.89 | **81.52** |
| blpd | 30 | 70.00 | **80.00** |
| kuet | 183 | **83.61** | 76.50 |
| lpdba | 202 | 89.11 | **94.06** |
| nightlpbd | 52 | 73.08 | **76.92** |

### 9.5 Character-box detection (mAP, %)

| Split | Metric | `chars_v12n` | `chars_v11n` |
|---|---|---|---|
| `rec/val` (536 images) | mAP50 / mAP50-95 | **92.45** / **64.08** | 91.87 / 63.15 |
| `rec/test` (467 images) | mAP50 / mAP50-95 | 92.27 / 62.61 | **96.21** / **64.68** |
| `rec/test` | P / R | **91.16** / 84.21 | 83.86 / **94.60** |

| Training time | `chars_v12n` | `chars_v11n` |
|---|---|---|
| Minutes (70 epochs) | 51.10 | **25.90** |

These percentages are plate-exact scores of the whole reading pipeline (character boxes + rows decoder), not mAP. The validation ranking of the character-box mAP50 (v12n ahead) is the reverse of the test ranking (v11n ahead by 3.9 points); the precision/recall balance also flips. The box mAP is therefore not a reliable ranker for these two models.

---

## 10. Results E — End-to-End Latency

### 10.1 Batch 1, 640 px, preprocessing + inference + postprocessing (ms per image, mean)

| Run | PyTorch FP32 (T4) | PyTorch FP16 (T4) | TensorRT FP16 (T4) | CPU ONNX |
|---|---|---|---|---|
| `v12s_official` | 21.86 | **232.96 ⚠** | – (failed: `No module named 'onnxscript'`) | 281.32 † |
| `v12s_ultra` | 20.60 | **153.37 ⚠** | 7.87 | **175.55** |
| `v11s` | **14.82** | **162.99 ⚠** | **7.56** | 184.53 |

TensorRT FP16 corresponds to (*derived*) 127.0 and 132.3 images per second for `v12s_ultra` and `v11s`. Single-image stage splits saved next to the means (preprocess / inference / postprocess, **last image only**): FP32 3.03 / 15.31 / 1.19 (`v12s_official`), 2.62 / 15.54 / 1.45 (`v12s_ultra`), 2.07 / 9.70 / 1.31 (`v11s`); TensorRT 2.02 / 4.45 / 1.10 (`v12s_ultra`), 2.37 / 4.12 / 1.69 (`v11s`).

† The official CPU job ran during the 2.0 min that overlapped with `speed_v12s_ultra` (§5.4), and its single-image split shows preprocessing 11.91 ms and postprocessing 9.99 ms against 4.45 and 1.39 ms for `v12s_ultra` (§11.3).

### 10.2 YOLO12 vs YOLO11, and next to the paper

| Comparison | This study | Paper |
|---|---|---|
| TensorRT FP16, S (Ultralytics) | 7.87 vs 7.56 ms: **+4.1 %** (YOLO12 slower) | Table 1: 2.61 vs 2.5 ms: +4.4 % |
| TensorRT FP16, S (official) | not available (export failed) | 2.61 ms |
| PyTorch FP32, S (Ultralytics) | 20.60 vs 14.82 ms: **+39.0 %** | not measured on T4 (Table 4 uses RTX 3080 / A5000 / A6000) |
| PyTorch FP32, S (official) | 21.86 vs 14.82 ms: +47.5 %; +6.1 % over Ultralytics YOLO12-S | not measured on T4 |
| CPU ONNX, S (Ultralytics) | 175.55 vs 184.53 ms: −4.9 % (YOLO12 faster; different ONNX Runtime versions) | CPU ONNX on a desktop i7-10700K, Figure 4 right (values not tabulated) |
| CPU ONNX, S (official) | 281.32 vs 184.53 ms: +52.4 % (job overlapped, §11.3) | not measured |
| PyTorch FP16, S | 232.96 / 153.37 / 162.99 ms: **anomalous** | not measured |
| TensorRT speed-up over FP32 | 2.62 × (YOLO12-S), 1.96 × (YOLO11-S) | not reported |
| YOLO12-S absolute (TensorRT) | 7.87 ms | 2.61 ms |

The paper's and this study's timings differ in more than hardware: the paper uses FlashAttention, COCO images and no preprocessing, while this study measures Ultralytics' own preprocessing, inference and postprocessing per image on a one-class task (§11.3).

---

## 11. Discussion and Interpretation

Each statement is marked **Evidence** (follows from the saved numbers or code) or **Hypothesis** (a reasoned explanation not tested here), with the check that would settle it.

### 11.1 Why accuracy does not separate YOLO12 from YOLO11

- **Evidence.** mAP50 lies between 98.6 and 99.0 % for all three; YOLO12-S (Ultralytics) minus YOLO11-S is −0.08 (mAP50) and −0.03 (mAP50-95) points, against +1.1 AP in the paper.
- **Evidence.** Each model was trained once (seed 42) on a task where mAP50 is near 99 %; the test split has 1,153 images and 1,011 plates. No confidence interval was computed.
- **Evidence.** The setting differs from the paper's on the points that matter most for its accuracy claim: pretrained instead of from scratch, 60 instead of 600 epochs (the paper itself reports the best AP only at about 600 epochs), one class instead of 80, and lighter augmentation (scale 0.5, Mixup 0.0 against 0.9 and 0.05).
- **Evidence.** Test mAP50-95 (46–49 %) is 12–15 points below validation mAP50-95 (60–61 %) for all three runs while mAP50 is similar (validation 96.8–97.3 %, test 98.6–99.0 %). At conf 0.25 about one image in three has a plate with IoU ≤ 0.7 (IoU > 0.7 accuracy 65.7–67.3 %).
- **Hypothesis.** Fine-tuning from COCO weights on a one-class task erases most architecture-driven differences, and the auto-labelled half of the training boxes limits the achievable box tightness for every model. The val–test gap may come from a different source mix in the two splits. *Check:* three or more seeds per model, a bootstrap confidence interval on the test images, a from-scratch run, and the per-source mAP50-95 of the val and test splits.
- **Consequence.** RQ1 is answered for the Ultralytics implementation as "no measurable difference on this data", not as "YOLOv12 is worse".

### 11.2 The official-code run: why +2.3 points of mAP50-95 is not a clean architecture effect

- **Evidence.** The official run is ahead of YOLO11-S by 2.32 points of test mAP50-95 and ahead of Ultralytics YOLO12-S by 2.35, but behind both on mAP50 (−0.36, −0.28), precision (87.36 vs 92.26 and 89.47 %), IoU > 0.7 accuracy (65.66 vs 67.27 and 66.77 %), and found-plates at night (§7.4). The mean best IoU (76.28 %) is also the lowest of the three. These box-fit numbers come from the same `det.py` code for all runs, while mAP50-95 comes from each run's own Ultralytics version.
- **Evidence.** The official run differs from the Ultralytics YOLO12-S run in much more than the code base: 50 instead of 60 epochs and no no-mosaic phase (§6.4), the authors' pretrained `yolov12s.pt` instead of Ultralytics `yolo12s.pt`, copy-paste 0.1 vs 0.0 and warm-up bias lr 0.0 vs 0.1, the fork's `scaled_dot_product_attention` fallback vs the Ultralytics attention implementation, and a different model graph (497 vs 272 layers; 9.10 vs 9.25 M parameters; 19.6 vs 23.5 GFLOPs).
- **Evidence.** The +2.3 gap appears in clear photos (+3.1), synthetic rain (+7.0) and synthetic fog (+3.9) but reverses at night (−3.9) and on blur (−1.1) (§7.3). It is a broad shift on the bulk of the test photos rather than a gain on one difficult subset.
- **Hypothesis.** Part of the mAP50-95 gap comes from how the two Ultralytics versions compute the metric (NMS settings, box handling), not from better localisation by the model. The box-fit diagnostics do not support a better localisation. *Check:* re-evaluate the three `best.pt` files with the same Ultralytics version on the same split, and compare the number of predictions at conf 0.001.
- **Hypothesis.** The weights or the augmentation (copy-paste 0.1) of the authors' recipe add to the gap. *Check:* train `yolo12s.pt` with copy-paste 0.1, and the official fork with the Ultralytics defaults, for the full 60 epochs.
- **Consequence.** The official run shows that the two implementations of "the same" model give results 2.35 points apart under almost the same settings. This difference is larger than any YOLO12-vs-YOLO11 difference measured with one implementation, so implementation and recipe matter more here than the architecture itself.

### 11.3 Speed: TensorRT agrees with the paper, eager PyTorch does not

- **Evidence.** TensorRT FP16: +4.1 % for YOLO12-S over YOLO11-S (7.87 vs 7.56 ms), against +4.4 % in the paper (2.61 vs 2.5 ms). The absolute times are 3× the paper's (preprocessing and postprocessing are included; the paper omits I/O).
- **Evidence.** The paper's own ablation puts YOLOv12-S at 3.02 ms without FlashAttention, i.e. +20.8 % over YOLO11-S (*derived*); the TensorRT engine measured here shows no such penalty although the official fork ran without FlashAttention. Whether the Ultralytics engine used any fused attention path is not recorded.
- **Hypothesis.** TensorRT fuses the attention operations of the exported graph, so the missing FlashAttention costs little under TensorRT; in eager PyTorch the attention is executed operation by operation. The eager FP32 gap (+39.0 % for Ultralytics, +47.5 % for the official fork, against YOLO11-S) is then the real cost of the attention blocks without compilation. *Check:* time the three models in eager PyTorch with `torch.compile`, and time the official fork with FlashAttention on an Ampere GPU.
- **Evidence (CPU).** YOLO12-S (Ultralytics) is 4.9 % faster than YOLO11-S on the CPU (175.55 vs 184.53 ms). The two jobs used different ONNX Runtime versions (1.31.1 vs 1.24.4) and the CPU numbers come from 50 images. The paper's claim that area attention helps on the CPU (Table 3, with vs without area attention) cannot be tested here, because no YOLOv12 model without area attention was run.
- **Evidence.** The official CPU number (281.32 ms) is 60 % above the Ultralytics YOLO12-S number although the eager GPU numbers of the two are close (21.86 vs 20.60 ms). The official job overlapped with the TensorRT export of `speed_v12s_ultra`, and the single-image split of the official run has preprocessing 11.91 ms and postprocessing 9.99 ms against 4.45 and 1.39 ms, although both steps are independent of the network.
- **Hypothesis.** The official CPU number was inflated by CPU contention, and possibly by the older ONNX export path of the fork. *Check:* repeat the CPU test of the three models one at a time, with the same ONNX Runtime version.
- **Evidence (code).** The TensorRT export of the official fork failed with `No module named 'onnxscript'`. In `measure_speed` the patch `legacy_onnx_export()` (which forces the TorchScript ONNX exporter that does not need `onnxscript`) is applied only in the CPU-ONNX block, **after** the TensorRT attempt, and the CPU ONNX export of the same model then succeeded. *Check:* call the patch before the TensorRT export (or install `onnxscript`) and repeat `speed_v12s_official`.

### 11.4 The PyTorch FP16 anomaly

- **Evidence.** The mean latency of the FP16 runs is 232.96, 153.37 and 162.99 ms, i.e. 10.7 ×, 7.4 × and 11.0 × the FP32 means. The stage split saved in the same `results.json` entries (one image) sums to 23.43, 21.07 and 14.77 ms, similar to FP32 (19.53, 19.61, 13.08 ms).
- **Evidence.** The mean is over 200 images; the stage split is from the last image (code). A mean 7–11 × larger than a single image's time means that a minority of predictions is extremely slow.
- **Hypothesis.** A few FP16 predictions (for example the first call for each new input shape, or one-time kernel selection not covered by the 15 warm-up images) cost hundreds of milliseconds and dominate the mean; the steady-state FP16 latency is close to the single-image value (15–23 ms). *Check:* store the per-image times, report the median and the 95th percentile, and use a longer warm-up with images of all shapes.
- **Consequence.** The FP16 figures are reported as printed but **excluded from every conclusion**. The single-image splits are only indicative.

### 11.5 Model size: the two YOLOv12-S implementations report different sizes

- **Evidence.** From the logs, before fusing: official 497 layers, 9,096,851 parameters, 19.6 GFLOPs; Ultralytics `yolo12s` 272 layers, 9,253,523 parameters, 23.5 GFLOPs; `yolo11s` 181 layers, 9,428,179 parameters, 21.7 GFLOPs. After fusing: 376 / 159 / 100 layers and 9,074,595 / 9,231,267 / 9,413,187 parameters, 19.3 / 23.2 / 21.4 GFLOPs.
- **Evidence.** The paper reports 9.3 M / 21.4 G (YOLOv12-S) and 9.4 M / 21.5 G (YOLO11-S) on COCO. The one-class head removes only about 0.03 M parameters. The Ultralytics YOLO12-S is 8.3 % above YOLO11-S in GFLOPs here (+23.5 vs 21.7), against −0.5 % in the paper; the official fork is 9.7 % below.
- **Hypothesis.** The model graphs of the two code bases differ, or the FLOP counter used by the two Ultralytics versions treats the attention matrix products differently (the official fork runs attention through PyTorch `scaled_dot_product_attention` here), so the 19.6 GFLOPs may leave out part of the attention cost. *Check:* count the FLOPs of both models with one tool (for example `torch.utils.flop_counter`) at 640 × 640.
- **Consequence.** GFLOPs of the three runs are not directly comparable. The parameter counts (9.10, 9.25, 9.43 M) are within 3.5 % of each other and match the paper's scale.

### 11.6 Conditions, small plates and false alarms

- **Evidence.** YOLO12-S (Ultralytics) is the best at night (+2.8 over YOLO11-S) and the worst on synthetic rain (−3.2). The official run shows the opposite pattern (night −4.6, rain +1.9). The two runs differ by 7.4 points at night and 5.1 points in rain.
- **Evidence.** The night subset has 71 plates; the three models find 59, 62 and 63 of them at conf 0.25 (*derived*). A 7-point mAP50 difference at night corresponds to a difference of 3–4 plates found.
- **Evidence.** Every model loses 10–16 points of mAP50 on synthetic rain, far more than for any other condition.
- **Evidence.** The small-plate recall values (60 / 80 / 40 %) are 3, 4 and 2 of 5 plates; the small-plate condition list (24 plates) gives mAP50 95.2 / 93.2 / 93.2 %.
- **Hypothesis.** Condition differences between YOLO12 and YOLO11 are within the variation between two runs of the same architecture (the official and Ultralytics YOLO12-S differ more from each other, at night and in rain, than either does from YOLO11-S). *Check:* a seed repeat for each model and the per-condition counts of plates.
- **Evidence.** False alarms are 13, 16 and 14 photos of 160; the attention-based YOLO12-S (Ultralytics) has the most.

### 11.7 Training time, memory and the time cap

- **Evidence.** Time per epoch: 5.12 (`v12s_official`), 2.93 (`v12s_ultra`), 2.12 min (`v11s`); peak memory 7.94, 7.75, 5.19 GB. YOLO12-S needs 38 % more time per epoch and 49 % more memory than YOLO11-S under the same settings.
- **Evidence.** The jobs shared one machine's CPU for data loading, and the overlap changed over the run (`v12s_official` ran with `v12s_ultra`, then with `v11s`, and finally with `chars_v12n` and `chars_v11n` on GPU 0; `v11s` ran from 10,918 s to 18,769 s). The training-time column is therefore not a clean cost comparison.
- **Evidence.** The official run hit its 4.2 h cap after epoch 50. The learning rate ended at 1.9 × 10⁻³ (the schedule reaches 2.7 × 10⁻⁴ at epoch 60), and the no-mosaic phase was never entered (no "Closing dataloader mosaic" line in its log). The best validation epoch was 39, before the cap, so the missing epochs probably did not cost accuracy, but the run is not a complete 60-epoch run.
- **Hypothesis.** The official run is slower per epoch than the Ultralytics run because it runs without FlashAttention on the T4, and executes 497 layers (more kernel launches) instead of 272. *Check:* time one training epoch of each arm alone on one GPU.

### 11.8 Character detectors

- **Evidence.** `chars_v11n` reads 5 more plates exactly than `chars_v12n` (544 vs 539 of 651), mostly on clear plates (+10); `chars_v12n` is ahead on blurry plates (+8) and synthetic rain (+29). Token accuracy and WER favour `chars_v12n` (97.09 % and 5.46 %), CER and character accuracy favour `chars_v11n`.
- **Evidence.** A 5-plate difference on one seed is 0.77 points, much smaller than the seed-to-seed variation one expects from a single training run. The character-box mAP50 ranking flips between validation and test (§9.5).
- **Evidence.** YOLOv12-N takes 1.97 × longer to train (51.1 vs 25.9 min) and 29 % longer to read a plate (17.24 vs 13.40 ms).
- **Hypothesis.** At 320 px the last feature map has only about 100 positions, so the large receptive field of area attention brings little and its cost remains. *Check:* train both at 640 px and repeat with three seeds.

### 11.9 What the study says about the paper

- **Evidence.** The "comparable speed" claim holds under TensorRT FP16 (+4.1 % here, +4.4 % in the paper) and is a deployment claim: in eager PyTorch, YOLO12 is 39 % slower.
- **Evidence.** The accuracy gain of +1.1 AP is not reproduced with the Ultralytics implementation on this one-class, fine-tuned task (−0.03 points of mAP50-95), while the authors' code gives +2.3 points of mAP50-95 under a different recipe and evaluator version. The paper's advantage cannot be confirmed or rejected from these single-seed numbers.
- **Evidence.** Attention costs 49 % more training memory and 38 % more time per epoch in this study, a cost the paper does not report.
- **Evidence.** The FlashAttention fallback on the T4 and the failed TensorRT export of the official fork show that the authors' code needs a modern GPU and a matching toolchain to reproduce its speed claims.

---

## 12. Limitations of This Study

1. **Fine-tuning, not reproduction.** COCO-pretrained weights, one class, 60 epochs; the paper's COCO from-scratch 600-epoch results are not reproduced.
2. **Three different code paths.** The official run, the Ultralytics YOLO12-S run and the YOLO11-S run differ in code version (8.3.63 vs 8.4.170), starting weights, augmentation defaults and evaluator version; the official run is not a clean control (§11.2).
3. **Single run.** One seed (42) per model; no confidence intervals. On 1,153 test images the differences of ≤ 0.4 points of mAP50 are within plausible noise.
4. **S for detection, N for characters only.** N, M, L and X detectors, and all of the paper's ablations (area attention, R-ELAN, MLP ratio, position perceiver), were not run.
5. **Latency protocol differs from the paper** (§10.2): Ultralytics preprocessing and postprocessing included, one-class NMS, 200 images (CPU: 50 images), **no FlashAttention** on the T4.
6. **PyTorch FP16 anomaly** for all three models is unexplained and excluded from conclusions; the stage split saved with each latency is a single-image sample, not an average.
7. **Official-run speed gaps.** No TensorRT value for the official run; its CPU value overlapped with another job; the ONNX Runtime version differs between the `v11s` job (1.24.4) and the other two (1.31.1).
8. **Concurrent runs.** Trainings ran in pairs on one machine, and the first two speed jobs overlapped; training times, peak memory comparisons and CPU latency may be affected by contention.
9. **Official run stopped at epoch 50** by the time cap, without the last 10 (no-mosaic) epochs (§6.4).
10. **Small subsets.** Small-plate recall (5 plates), small-plate list (24), blurry (53), night (71 in detection, 65 in OCR), real fog (26), and the 160-photo plate-free set.
11. **Synthetic conditions.** Rain and detection-fog copies are synthetic and show nothing about real weather.
12. **Auto-labelled training data.** 4,507 of 8,574 detection training images carry automatic labels; test and validation are human-labelled.
13. **Parameter and GFLOP counts** come from two Ultralytics versions and may not be comparable (§11.5).
14. **Values not available** for this report: model weights, per-image latencies, the plate counts of the clear list, the image counts of the condition lists.

---

## 13. Conclusions and Recommendations

### Conclusions

1. On Bangla plates, fine-tuned YOLO12-S (Ultralytics) and YOLO11-S are **equal in accuracy**: 98.9 vs 99.0 % mAP50 and 46.2 vs 46.2 % mAP50-95. The paper's +1.1 AP advantage is not reproduced with this implementation. The authors' code is 2.3 points higher in mAP50-95 but not on mAP50 or on the box-fit measures, and under a different recipe.
2. YOLO12-S is **4.1 % slower than YOLO11-S under TensorRT FP16** (7.87 vs 7.56 ms), as in the paper (+4.4 %), but **39 % slower in eager PyTorch FP32** (20.60 vs 14.82 ms). On the CPU it is 4.9 % faster, with a caveat on the ONNX Runtime version.
3. Attention costs **49 % more training memory and 38 % more time per epoch** (7.75 vs 5.19 GB; 2.93 vs 2.12 min), with the authors' code even more (7.94 GB, 5.12 min).
4. The models differ by condition: YOLO12-S (Ultralytics) is best at night and on blur and worst on synthetic rain; the official run shows the opposite. All models degrade strongly on synthetic rain (10–16 points).
5. As a character detector for plate reading, YOLO11-N is ahead of YOLOv12-N by 0.77 points (5 plates of 651) while training in half the time.
6. The PyTorch FP16 latencies (153–233 ms) are measurement anomalies to be re-run; the official TensorRT and CPU values are missing or unreliable; the small-plate recall values rest on 5 plates.

### Recommendations

| # | Recommendation | Based on |
|---|---|---|
| 1 | Choose YOLO11-S when memory, training time or eager PyTorch speed matter; it is equal in accuracy here | §6.2, §10.2 |
| 2 | Consider YOLO12-S (Ultralytics) where night and blurry plates dominate and TensorRT or CPU ONNX is the runtime, but treat its night/blur advantage as unconfirmed (single seed, 71 and 53 plates) | §7.2, §10.1 |
| 3 | Do not use the PyTorch FP16 figures for any decision until re-measured | §11.4 |
| 4 | Do not claim a YOLOv12 accuracy advantage or disadvantage on this data from single-seed numbers | §11.1 |
| 5 | Do not rank the models on small-plate recall (5 plates) or on the 24-plate small list | §8.1 |
| 6 | State the latency protocol, the runtime and the library versions next to every latency number | §10.2 |
| 7 | Report the plate counts behind every per-condition percentage | §7.1, §9.2 |
| 8 | Evaluate all `best.pt` files with the same Ultralytics version before comparing mAP50-95 across the two code bases | §11.2 |

### Experiments that would settle the open questions

| # | Experiment | Settles |
|---|---|---|
| 1 | Re-evaluate `v12s_official`, `v12s_ultra` and `v11s` with one Ultralytics version on the test split | §11.2 |
| 2 | Train `v12s_official` for the full 60 epochs, and `v12s_ultra` with the official recipe (copy-paste 0.1, warm-up bias lr 0.0, authors' weights) | §11.2, §11.7 |
| 3 | Re-run the speed tests one job at a time, store per-image times, report median and 95th percentile; call the ONNX patch before the TensorRT export; same ONNX Runtime version for all | §11.3, §11.4 |
| 4 | Time the official fork with FlashAttention on an Ampere GPU, and the three models with `torch.compile` | §11.3 |
| 5 | Count FLOPs of the three models with one tool | §11.5 |
| 6 | Three or more seeds per model; bootstrap confidence intervals on the 1,153 test images | §11.1, §11.6, §11.8 |
| 7 | Train YOLOv12-S from scratch (or at least without COCO weights), with the paper's augmentation | §11.1 |
| 8 | Enlarge the small-plate test set (or add synthetic downscaling of real plates) | §8.1 |
| 9 | Train the character detectors at 640 px and with three seeds; compare box mAP and the `rows` and `xsort` decoders | §11.8 |

---

## 14. Reproducibility

### 14.1 Commands (from the notebook)

```bash
pip install ultralytics==8.4.170

# Official YOLOv12 code (pinned commit) and the authors' COCO weights
python lprkit/p26_official.py --dir /kaggle/working/yolov12_official

# GPU 0 queue (official code first on PYTHONPATH) and GPU 1 queue run at the same time
PYTHONPATH=/kaggle/working/yolov12_official:/kaggle/working/lprkit python lprkit/det.py --data yaml/detection_all.yaml --model /kaggle/working/yolov12_official/yolov12s.pt --name v12s_official --project runs --epochs 60 --imgsz 640 --batch 16 --fraction 1.0 --max-hours 4.2 --note "official sunsmarterjie/yolov12 code"
python lprkit/rec.py --data yaml/recognition_all.yaml --model yolo12n.pt --name chars_v12n --project runs --epochs 70 --imgsz 320 --batch 32 --fraction 1.0 --max-hours 1.4
python lprkit/rec.py --data yaml/recognition_all.yaml --model yolo11n.pt --name chars_v11n --project runs --epochs 70 --imgsz 320 --batch 32 --fraction 1.0 --max-hours 1.4

python lprkit/det.py --data yaml/detection_all.yaml --model yolo12s.pt --name v12s_ultra --project runs --epochs 60 --imgsz 640 --batch 16 --fraction 1.0 --max-hours 3.8
python lprkit/det.py --data yaml/detection_all.yaml --model yolo11s.pt --name v11s --project runs --epochs 60 --imgsz 640 --batch 16 --fraction 1.0 --max-hours 3.4

# Speed (after training; one run per GPU)
PYTHONPATH=/kaggle/working/yolov12_official:/kaggle/working/lprkit python lprkit/det.py --data yaml/detection_all.yaml --name v12s_official --project runs --imgsz 640 --fps-only --trt
python lprkit/det.py --data yaml/detection_all.yaml --name v12s_ultra --project runs --imgsz 640 --fps-only --trt
python lprkit/det.py --data yaml/detection_all.yaml --name v11s --project runs --imgsz 640 --fps-only --trt
```

The notebook has a `FAST = True` smoke-test mode (1 epoch, about 3 % of the images, 40 test images); the reported results use `FAST = False` (Save Version → Save & Run All).

### 14.2 Supplied artefacts

`paper26_outputs.zip` (260.5 MB, with weights; not supplied for this report), `paper26_results.zip` (5.1 MB, no weights; supplied and read), `results_vs_paper.md`, `README.md` and the paper PDF. The `best.pt` files are inside the outputs archive (`runs/<run>/weights/best.pt`). See [Appendix E](#appendix-e--artefact-manifest).

### 14.3 Determinism

Seed 42 was set for every training (`deterministic: true`). GPU training with Ultralytics is not bit-exact, and speed tests depend on the machine's state, so repeating the notebook gives similar but not identical numbers. The dataset is downloaded from a fixed team Drive file; the condition lists are fixed team-wide files. The official code is pinned to commit `2abab7153a065fb2925e8088e9ca2b19016ab7d6`; the notebook patches one line of the fork (`np.trapz` → `np.trapezoid`, required by NumPy 2).

---

## Appendix A — Training Arguments and Run Timeline

| Argument | Detectors (`det.py`) | Character detectors (`rec.py`) |
|---|---|---|
| Epochs (planned) | 60 | 70 |
| Input size / batch | 640 / 16 | 320 / 32 |
| Optimiser | SGD (lr0 0.01, lrf 0.01, momentum 0.937, weight decay 5e-4) | SGD (same) |
| Initial weights | COCO-pretrained `.pt` | COCO-pretrained `.pt` |
| Seed / patience | 42 / 100 | 42 / see `rec.py` |
| Time cap | 4.2 h (official), 3.8 h (`v12s_ultra`), 3.4 h (`v11s`) | 1.4 h |
| Training images | 8,574 (human 4,067 + auto 4,507) | recognition_all (see §5.1) |
| Augmentation | mosaic 1.0, scale 0.5, translate 0.1, HSV 0.015 / 0.7 / 0.4, fliplr 0.5, erasing 0.4, RandAugment, close-mosaic 10 | no flip, mosaic 0.5, degrees 3, shear 2, scale 0.3 |
| Copy-paste / warm-up bias lr | 0.1 / 0.0 (official fork); 0.0 / 0.1 (Ultralytics 8.4.170) | Ultralytics 8.4.170 defaults |
| Workers / AMP | 4 / on | 4 / on |

**Timeline (seconds in the notebook log)**

| Time (s) | Event |
|---|---|
| 90 | Dataset ready |
| 138 | Official weights and fork ready (`yolov12n.pt` 5,386 KB, `yolov12s.pt` 18,270 KB; fork reports 8.3.63); `v12s_official` (GPU 0) and `v12s_ultra` (GPU 1) start |
| 10,918 | `v12s_ultra` done after 179.7 min; `v11s` starts |
| 15,869 | `v12s_official` done after 262.2 min; `chars_v12n` starts |
| 18,769 | `v11s` done after 130.8 min |
| 18,979 | `chars_v12n` done after 51.8 min; `chars_v11n` starts |
| 20,579 | `chars_v11n` done after 26.7 min; `speed_v12s_official` (GPU 0) and `speed_v12s_ultra` (GPU 1) start |
| 20,699 | `speed_v12s_official` done after 2.0 min |
| 20,969 | `speed_v12s_ultra` done after 6.5 min; `speed_v11s` starts |
| 21,219 | `speed_v11s` done after 4.2 min; results table written |
| 21,233 | Output archives packed (260.5 MB and 5.1 MB) |

The log wall times (262.2, 179.7, 130.8, 51.8, 26.7 min) are larger than the `train_minutes` in the results files (256.1, 175.6, 127.1, 51.1, 25.9) because the wall time includes the final validation, test and condition evaluation.

---

## Appendix B — Latency Comparison and Derived Figures

All values in milliseconds per image, batch 1, 640 px, mean over 200 images (CPU: 50).

| Run | FP32 | FP16 | TensorRT FP16 | CPU ONNX | FP16 / FP32 ratio | TensorRT speed-up over FP32 |
|---|---|---|---|---|---|---|
| `v12s_official` | 21.86 | 232.96 ⚠ | – | 281.32 | 10.7 × | – |
| `v12s_ultra` | 20.60 | 153.37 ⚠ | 7.87 | 175.55 | 7.4 × | 2.62 × |
| `v11s` | 14.82 | 162.99 ⚠ | 7.56 | 184.53 | 11.0 × | 1.96 × |

Single-image stage splits saved in `results.json` (preprocess / inference / postprocess, **last image only**):

| Run | FP32 | FP16 | TensorRT FP16 | CPU ONNX |
|---|---|---|---|---|
| `v12s_official` | 3.03 / 15.31 / 1.19 | 3.14 / 18.91 / 1.38 | – | 11.91 / 293.45 / 9.99 |
| `v12s_ultra` | 2.62 / 15.54 / 1.45 | 2.22 / 17.48 / 1.37 | 2.02 / 4.45 / 1.10 | 4.45 / 184.28 / 1.39 |
| `v11s` | 2.07 / 9.70 / 1.31 | 2.20 / 11.14 / 1.43 | 2.37 / 4.12 / 1.69 | 4.37 / 180.31 / 1.42 |

| Derived | Ultralytics YOLO12-S vs YOLO11-S | Official YOLOv12-S vs YOLO11-S |
|---|---|---|
| TensorRT, YOLO12 slower than YOLO11 by | 4.1 % | not available |
| FP32, YOLO12 slower than YOLO11 by | 39.0 % | 47.5 % |
| CPU ONNX, YOLO12 vs YOLO11 | −4.9 % (faster) | +52.4 % (slower) |
| Paper: YOLOv12-S slower than YOLO11-S by (TensorRT) | 4.4 % | 4.4 % |
| Paper: parameter difference | −1.1 % | −1.1 % |
| This study: parameter difference | −1.9 % | −3.5 % |
| Paper: FLOP difference | −0.5 % | −0.5 % |
| This study: FLOP difference | +8.3 % | −9.7 % |
| Peak training memory vs YOLO11-S | +49.3 % | +53.0 % |
| Training time per epoch vs YOLO11-S | +38.2 % | +141.8 % |

---

## Appendix C — Full Metrics of All Five Runs

**Detectors (test)**

| Run | mAP50 | mAP50-95 | P | R | Params (M) | GFLOPs | Peak mem (GB) | Small-plate recall | Train min | Epochs run | Best epoch | FP32 | FP16 | TRT FP16 | CPU ONNX |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `v12s_official` | 98.59 | 48.53 | 96.92 | 96.14 | 9.10 | 19.60 | 7.94 | 60.00 | 256.10 | 50 | 39 | 21.86 | 232.96 | – | 281.32 |
| `v12s_ultra` | 98.87 | 46.18 | 96.72 | 96.22 | 9.25 | 23.50 | 7.75 | 80.00 | 175.60 | 60 | 36 | 20.60 | 153.37 | 7.87 | 175.55 |
| `v11s` | 98.95 | 46.21 | 97.27 | 97.23 | 9.43 | 21.70 | 5.19 | 40.00 | 127.10 | 60 | 47 | 14.82 | 162.99 | 7.56 | 184.53 |

**Detectors, validation (best checkpoint)**

| Run | mAP50 | mAP50-95 | P | R |
|---|---|---|---|---|
| `v12s_official` | 97.26 | 61.36 | 96.57 | 93.88 |
| `v12s_ultra` | 96.80 | 60.43 | 96.40 | 94.47 |
| `v11s` | 97.33 | 60.61 | 95.98 | 95.51 |

**Detectors by condition (mAP50 % / mAP50-95 %) and false alarms**

| Run | All | Clear | Night | Blurry | Small | Rain | Fog | False alarms % |
|---|---|---|---|---|---|---|---|---|
| `v12s_official` | 98.59 / 48.53 | 99.02 / 47.86 | 91.02 / 64.28 | 96.82 / 62.43 | 95.23 / 55.57 | 88.20 / 40.75 | 97.41 / 44.97 | 8.12 |
| `v12s_ultra` | 98.87 / 46.18 | 99.23 / 44.73 | 98.40 / 68.13 | 99.25 / 63.50 | 93.15 / 55.27 | 83.14 / 33.78 | 97.50 / 41.11 | 10.00 |
| `v11s` | 98.95 / 46.21 | 99.24 / 44.64 | 95.61 / 65.87 | 98.22 / 62.84 | 93.15 / 56.21 | 86.33 / 35.30 | 97.64 / 42.37 | 8.75 |

**Plates found at conf 0.25 by condition (%, recall at IoU 0.5)**

| Run | Clear | Night (71) | Blurry (53) | Small (24) | Rain (1,011) | Fog (1,011) |
|---|---|---|---|---|---|---|
| `v12s_official` | 98.98 | 83.10 | 90.57 | 91.67 | 77.15 | 96.04 |
| `v12s_ultra` | 99.10 | 87.32 | 92.45 | 100.00 | 72.90 | 95.65 |
| `v11s` | 98.64 | 88.73 | 96.23 | 95.83 | 73.00 | 95.55 |

**Character detectors (plate exact %, rows decoder)**

| Run | All | Clear | Night | Blurry | Fog (real) | Rain (synthetic) | CER % | Train min |
|---|---|---|---|---|---|---|---|---|
| `chars_v12n` | 82.80 | 85.83 | 73.85 | 75.00 | 65.38 | 74.04 | 3.58 | 51.10 |
| `chars_v11n` | 83.56 | 87.92 | 78.46 | 67.86 | 69.23 | 69.59 | 3.09 | 25.90 |

Best epoch of the character detectors by the Ultralytics fitness formula on `results.csv` (*derived*): `chars_v12n` 57, `chars_v11n` 53.

---

## Appendix D — Paper Tables Used for Comparison

**Table 1 (extract) — COCO val, 640 × 640, T4 TensorRT FP16**

| Model | FLOPs (G) | Params (M) | AP^val 50:95 (%) | AP^val 50 (%) | AP^val 75 (%) | Latency (ms) |
|---|---|---|---|---|---|---|
| YOLOv8-N | 8.7 | 3.2 | 37.4 | 52.6 | 40.5 | 1.77 |
| YOLOv10-N | 6.7 | 2.3 | 38.5 | 53.8 | 41.7 | 1.84 |
| YOLO11-N | 6.5 | 2.6 | 39.4 | 55.3 | 42.8 | 1.5 |
| YOLOv12-N | 6.5 | 2.6 | 40.6 | 56.7 | 43.8 | 1.64 |
| YOLOv8-S | 28.6 | 11.2 | 45.0 | 61.8 | 48.7 | 2.33 |
| RT-DETR-R18 | 60.0 | 20.0 | 46.5 | 63.8 | – | 4.58 |
| RT-DETRv2-R18 | 60.0 | 20.0 | 47.9 | 64.9 | – | 4.58 |
| YOLOv9-S | 26.4 | 7.1 | 46.8 | 63.4 | 50.7 | – |
| YOLOv10-S | 21.6 | 7.2 | 46.3 | 63.0 | 50.4 | 2.49 |
| YOLO11-S | 21.5 | 9.4 | 46.9 | 63.9 | 50.6 | 2.5 |
| YOLOv12-S | 21.4 | 9.3 | 48.0 | 65.0 | 51.8 | 2.61 |

**Table 2 (extract) — R-ELAN ablation (COCO)**

| Model | Vanilla | Re-Aggr. | Resi. | Scaling | Converges | FLOPs (G) | Params (M) | AP (%) |
|---|---|---|---|---|---|---|---|---|
| YOLOv12-N | ✓ | | | – | ✓ | 6.9 | 2.7 | 40.8 |
| YOLOv12-N | | ✓ | | – | ✓ | 6.5 | 2.6 | 40.6 |
| YOLOv12-N | | ✓ | ✓ | 0.1 | ✓ | 6.5 | 2.6 | 40.3 |
| YOLOv12-L | ✓ | | | – | ✗ | – | – | – |
| YOLOv12-L | | ✓ | ✓ | 0.1 | ✓ | 88.9 | 26.4 | 53.3 |
| YOLOv12-L | | ✓ | ✓ | 0.01 | ✓ | 88.9 | 26.4 | 53.7 |
| YOLOv12-X | | ✓ | ✓ | 0.1 | ✗ | – | – | – |
| YOLOv12-X | | ✓ | ✓ | 0.01 | ✓ | 199.0 | 59.1 | 55.2 |

**Table 5 (extract) — Diagnostic studies, YOLOv12-N unless stated (AP^val 50:95 %, latency ms)**

| Study | Setting | AP | Latency |
|---|---|---|---|
| Attention implementation | Linear+LN / Linear+BN / **Conv+BN** / Conv+LN | 40.5 / 39.5 / **40.6** / 40.3 | 1.68 / 1.70 / **1.64** / 1.66 |
| Position perceiver kernel | 3×3 / 5×5 / **7×7** / 9×9 | 40.4 / 40.4 / **40.6** / 40.7 | 1.60 / 1.61 / **1.64** / 1.79 |
| Position embedding | RPE / APE / **none** | 40.3 / 40.5 / **40.6** | 1.76 / 1.69 / **1.64** |
| Area attention | ✗ / **✓** | 40.8 / **40.6** | 1.70 / **1.64** |
| MLP ratio (L model) | **1.2** / 2.0 / 4.0 | **53.8** / 53.6 / 53.1 | **6.77** / 6.75 / 6.68 |
| FlashAttention | N: ✗ / **✓**; S: ✗ / **✓** | – | N 1.92 / **1.64**; S 3.02 / **2.61** |
| Training epochs (N / S AP) | 300 / 500 / **600** / 800 | N 39.5 / 40.3 / **40.6** / 40.4; S 47.0 / 47.8 / **48.0** / 47.7 | – |

**Training hyper-parameters (paper, Table 7, YOLOv12-N/S/M/L/X on COCO, extract):** 600 epochs, SGD, momentum 0.937, batch size 32 × 8, weight decay 5×10⁻⁴, 3 warm-up epochs (momentum 0.8, bias lr 0.0), initial learning rate 1×10⁻² decaying linearly to 1×10⁻⁴, loss gains box 7.5 / cls 0.5 / DFL 1.5, HSV 0.7 / 0.4 / 0.015, translation 0.1, scale 0.5 / 0.9 / 0.9 / 0.9 / 0.9, Mosaic 1.0, Mixup 0.0 / 0.05 / 0.15 / 0.15 / 0.2, copy-paste 0.1 / 0.15 / 0.4 / 0.5 / 0.6, close-mosaic 10 epochs.

**Table 6 (extract) — YOLOv12 COCO AP by size (%):** N 20.2 (small) / 45.2 (medium) / 58.4 (large); S 29.8 / 53.2 / 65.6.

---

## Appendix E — Artefact Manifest

| Path | Description |
|---|---|
| `Paper26_Report.md` | This report |
| `Paper26_README.md` | Model card, usage guide, file manifest |
| `paper26_outputs.zip` (repository `output/`) | Full output archive (260.5 MB, with weights; not supplied for this report) |
| `paper26_results.zip` | Results archive (5.1 MB, no weights; for GitHub `weights/`) |
| `results_vs_paper.md` | Comparison table generated by the notebook |
| `26_2025_YOLOv12_Attention-Centric_Real-Time_Detectors.pdf` | The paper (arXiv:2502.12524) |
| `runs/<run>/results.json`, `results.csv`, `args.yaml` | Per-run summary, per-epoch log and Ultralytics arguments (all five runs) |
| `runs/<run>/results.png`, `labels.jpg`, `confusion_matrix.png`, `BoxPR_curve.png` | Training curves, label statistics, confusion matrix and box precision–recall curve |
| `runs/<detector run>/cond_yaml/*.yaml` | Data files for the six condition subsets (clear, night, blurry, small plates, rain, fog) |
| `runs/chars_*/ocr_preds_val.csv`, `ocr_preds_test.csv` | One line per plate read by the character detectors |
| `logs/<run>.log`, `logs/speed_<run>.log`, `environment.json` | Run logs, speed-test logs, and library/hardware versions |
| `code/det.py`, `rec.py` | Detector and character-detector training/evaluation |
| `code/p26_official.py` | Fetches and pins the official YOLOv12 code and weights |
| `code/common.py`, `report.py`, `metrics.py`, `vocab.py` | Shared toolkit |
| `code/seq.py`, `ved.py` | Toolkit modules (sequence and transformer OCR) not used for Paper #26 |
| `notebooks/Md.Yousuf/paper26_run.ipynb` | Executable Kaggle notebook |
| `runs/<run>/weights/best.pt` | Best checkpoints (inside `paper26_outputs.zip`) |

---

## References

1. Y. Tian, Q. Ye and D. Doermann, "YOLOv12: Attention-Centric Real-Time Object Detectors," arXiv:2502.12524v1 [cs.CV], 2025. (Paper #26.)
2. G. Jocher and J. Qiu, Ultralytics YOLO11 / Ultralytics 8.4.170 (YOLO11 baseline and the implementation used here).
3. `sunsmarterjie/yolov12`, official YOLOv12 code, commit `2abab7153a065fb2925e8088e9ca2b19016ab7d6`.
4. T. Dao, D. Y. Fu, S. Ermon, A. Rudra and C. Ré, "FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness," NeurIPS 2022. (Attention kernel used by the paper.)
5. T.-Y. Lin et al., "Microsoft COCO: Common Objects in Context." (Pre-training data and the paper's benchmark.)
6. 498R BanglaLPR All-in-One v1.1 — team dataset (detection and recognition parts).

---

*End of `Paper26_Report.md` — Md. Yousuf, 1 November 2026.*

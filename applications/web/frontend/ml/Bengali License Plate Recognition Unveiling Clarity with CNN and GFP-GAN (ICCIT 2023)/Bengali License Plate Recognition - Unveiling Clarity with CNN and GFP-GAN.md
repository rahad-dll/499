# README.md — Paper #8: Bengali LPR with CNN and GFP-GAN 

This package contains our two trained symbol classifiers from the paper — the **paper's 4-layer CNN (28x28)** and a
**frozen ImageNet ResNet-50 with a trained Dense head (150x150)** — trained on every labelled symbol of our dataset
(101 Bangla tokens: digits, মেট্রো, series letters, district words), plus the results of the paper's full plate
pipeline (GFP-GAN → Otsu → contours → CNN) on our 651 test plates, logs, per-plate predictions and code. All numbers
come from the run files in `paper08_results.zip` and the local checks in `local_checks.json`.

---

## Table of Contents

1. [At a Glance](#1-at-a-glance)
2. [What Is in This Package](#2-what-is-in-this-package)
3. [Quick Start](#3-quick-start)
4. [Model Cards](#4-model-cards)
5. [Results Summary](#5-results-summary)
6. [Reproducing the Results](#6-reproducing-the-results)
7. [Limitations](#7-limitations)
8. [Differences from the Original Paper](#8-differences-from-the-original-paper)
9. [File Integrity](#9-file-integrity)
10. [Licence and Data Notes](#10-licence-and-data-notes)
11. [Citation](#11-citation)

---

## 1. At a Glance

| | |
|---|---|
| **Task** | The paper reads a plate crop by restoring it (GFP-GAN), cutting it into symbols (Otsu + contours) and classifying each symbol (CNN) |
| **Models** | `best_cnn28.pt` — paper CNN, 3.71 M parameters · `best_resnet50_head.pt` — trained head of a frozen ImageNet ResNet-50 (28.7 M parameters in total, 5.17 M trained) |
| **Symbol classification, 4,107 test symbols** | CNN **93.08 %** · ResNet-50 **92.89 %** (paper: 92.38 % on 17 classes and a leaky test) |
| **Common vs rare tokens (CNN)** | 95.4 % on the 21 tokens with ≥ 20 test crops · 23.9 % on 39 rare tokens (ResNet-50: 45.5 %) |
| **Paper's full plate reader, 651 test plates** | exact **0.15 %** (1 plate) · mean similarity 54.3 % (paper: 88 % on 30 plates) |
| **Why** | the contour step finds only 52.4 % of the symbols; with perfect human boxes the CNN reads 59.5 % of plates vs 88.9 % for our paper #2 character detector on the same 467 plates |
| **GFP-GAN (on plates = Real-ESRGAN x2)** | +4.8 similarity points (p < 10⁻¹⁰), +1 exact plate, worse at night, 205.6 ms per plate (34x the reading time) |
| **Speed (Tesla T4, batch 1, model only)** | CNN 760.9 FPS (1.31 ms) · ResNet-50 171.5 FPS (5.83 ms) |
| **Training** | CNN 40 epochs, 151.8 min · ResNet-50 25 of 30 epochs (3.2 h cap), 198.2 min · Kaggle Tesla T4 x2 (one job per GPU) |
| **Environment** | Python 3.13.15 · PyTorch 2.11.0+cu128 · dataset v1.1 |

---

## 2. What Is in This Package

### 2.1 Files

| File | Size | Description |
|---|---|---|
| `README.md` | — | This guide |
| `Paper08_Study_Report.pdf` | 5.3 MiB | Full study report (paper, results, analysis, faculty guide) |
| `best_cnn28.pt` | 14.1 MiB | Paper CNN, PyTorch `state_dict`, best-validation epoch 5 of 40 |
| `best_resnet50_head.pt` | 19.7 MiB | ResNet-50 **head only** (`fc.1.weight/bias`) + the 101 token names + settings; best-validation epoch 20 |
| `paper08_results.zip` | 0.14 MiB | Results archive, **no model weights** (see 2.2) |
| `results_vs_paper.md` | — | The kit's ours-vs-paper table |
| `local_checks.json` | — | Local checks of 24 Oct 2026: where the plate reader fails, same plates vs paper #2, the original-paper check |

**Why only the ResNet-50 head?** The full `best.pt` is 115 MB (over GitHub's 25 MB web and 100 MB git limits). The
backbone was frozen during training (BatchNorm in eval mode), and we checked that all 318 backbone tensors are
bit-identical to torchvision's `ResNet50_Weights.IMAGENET1K_V1`. So the head plus torchvision rebuild the exact model
(tested: identical outputs, see Quick Start). The full file is in `paper08_outputs.zip` on the team Drive.

### 2.2 Inside `paper08_results.zip`

| Path | What |
|---|---|
| `runs/cnn28/`, `runs/resnet50/` | `results.json` (accuracy, macro/weighted P/R/F1, confusion matrix, speed, settings), `log.csv` (per-epoch curves) |
| `runs/plates_cnn28/` | `results.json` (plate scores for GFP-GAN off/on × paper order/two-line order, perfect segmentation, per condition, ms) and `per_plate.csv` (one line per plate and setting: truth, prediction, similarity) |
| `logs/` | the five job logs |
| `code/` | the exact kit code used (`p08_train.py`, `p08_chars.py`, `p08_plates.py`, `vocab.py`, `metrics.py`, ...) |
| `environment.json`, `results_vs_paper.md` | versions (incl. `dataset_version: 1.1`) and the comparison table |

### 2.3 Not in this folder

`paper08_outputs.zip` (230 MiB: everything above plus the full `best.pt` and `last.pt` of both models) is on the team
Drive: **`498R / weights / paper08 /`**.

---

## 3. Quick Start

```bash
pip install torch torchvision scikit-learn pillow numpy
unzip paper08_results.zip "code/*"        # the model classes are in code/p08_train.py
```

```python
import sys; sys.path.insert(0, "code")
import numpy as np, torch
from PIL import Image
from p08_train import PaperCNN, PaperResNet50

info = torch.load("best_resnet50_head.pt", map_location="cpu", weights_only=True)
tokens = info["tokens"]                         # 101 Bangla tokens, same order for both models

cnn = PaperCNN(len(tokens), 28).eval()
cnn.load_state_dict(torch.load("best_cnn28.pt", map_location="cpu", weights_only=True))

res = PaperResNet50(len(tokens), 150, pretrained=True).eval()     # downloads torchvision's ImageNet ResNet-50
res.load_state_dict(info["head_state_dict"], strict=False)        # adds the trained head (backbone stays frozen ImageNet)

def load(path, size):                           # as in training: RGB, bilinear resize, /255, no normalisation
    im = Image.open(path).convert("RGB").resize((size, size), Image.BILINEAR)
    return torch.from_numpy(np.asarray(im).copy()).permute(2, 0, 1)[None].float() / 255

with torch.no_grad():
    p = "char.png"                              # ONE symbol cut from a plate (a digit, a letter, মেট্রো or a district word)
    print("CNN:", tokens[cnn(load(p, 28)).argmax(1).item()], "| ResNet-50:", tokens[res(load(p, 150)).argmax(1).item()])
```

The input is a single symbol crop, as in the paper. To read whole plates, do **not** use the paper's contour
segmentation (it finds about half the symbols on real plates, see 5.3); use a character detector such as our paper #2
model (`weights/paper02/MD.Rokib.Hasan.Oli/best_lpnr_v12n.pt`). We ran this code on 4 test symbols and checked that the
rebuilt ResNet-50 gives exactly the same logits as the full 115 MB `best.pt` (max difference 0.0).

---

## 4. Model Cards

### 4.1 `best_cnn28.pt` — the paper's CNN

| | |
|---|---|
| Architecture | 4 conv layers (16/32/64/128 filters, kernels 22/16/8/4, "same"), max-pool 4, dense 512, dropout 0.4, dense 128, 101 outputs (authors' Code/CNN.ipynb, ported to PyTorch) |
| Data | 498R All-in-One v1.1 recognition: every symbol box cut out with 4 % padding — train 47,992 crops (99 classes; human + verified + auto boxes), val 4,643, test 4,107 (human boxes only) |
| Training | 28x28 RGB / 255, batch 1, Adam lr 1e-4, 40 epochs, ±10 % shifts, seed 42 (the paper's settings) |
| Best epoch | 5 (validation 90.20 %). After epoch 5 the batch-1 recipe became unstable (training accuracy 92 % → 52 %), so the last epoch scores only 36.67 %: **use this best-validation file** |
| Test | accuracy **93.08 %** · weighted F1 92.31 % · macro F1 36.42 % (all 60 test classes) / 89.06 % (21 tokens with ≥ 20 test crops) |
| By group | digits 96.9 % · মেট্রো 97.6 % · series letters 81.8 % · district words 77.9 % · rare tokens 23.9 % |
| Speed | 760.9 FPS, 1.31 ms per symbol (T4, batch 1, FP32, model only) |

### 4.2 `best_resnet50_head.pt` — frozen ResNet-50 + Dense head

| | |
|---|---|
| Architecture | torchvision ResNet-50 (ImageNet IMAGENET1K_V1, all layers frozen) → Flatten (2048×5×5) → Dense(101) (authors' Code/resnet50.ipynb) |
| Training | 150x150 RGB / 255 (no ImageNet normalisation, as the authors), batch 1, Adam lr 1e-3, shear/zoom/flip, 25 of 30 epochs (3.2 h time cap), seed 42 |
| Best epoch | 20 (validation 91.71 %); last epoch test 92.06 % |
| Test | accuracy **92.89 %** · weighted F1 92.75 % · macro F1 43.90 % / 89.27 % (21 common tokens) |
| By group | digits 95.2 % · মেট্রো 98.9 % · series letters 85.9 % · district words 81.2 % · rare tokens 45.5 % |
| Speed | 171.5 FPS, 5.83 ms per symbol (T4, batch 1, FP32, model only) |

---

## 5. Results Summary

### 5.1 Ours vs the paper (different data: a reference, not a duel)

| Metric | Paper (page) | Ours (v1.1) |
|---|---|---|
| Classes | 17 (p.3) | 101 |
| Symbol test accuracy, CNN / ResNet-50 | 92.38 / 87.50 % (p.4, last epoch) | 93.08 / 92.89 % (best-val checkpoint) |
| Whole plates, mean similarity (GFP-GAN + x order) | 88 % on 30 plates (p.5) | 44.95 % on 651 plates (two-line order: 54.30 %) |
| Plates with similarity ≥ 0.95 / ≥ 0.90 | 57 / 80 % (p.5) | 0.0 / 0.0 % (two-line order: 1.23 / 6.91 %) |
| Whole plates read exactly | not reported | 0.15 % (1 of 651) |
| Without GFP-GAN | never tested | similarity 49.49 % (two-line order), exact 0.0 % |

### 5.2 GFP-GAN on the same 651 plates (two-line order)

| | Without | With GFP-GAN |
|---|---|---|
| Mean similarity | 49.49 % | 54.30 % (343 plates better, 224 worse; Wilcoxon p = 4.2e-11) |
| Plates exact | 0 | 1 |
| Night (65 plates), similarity | 43.51 % | 41.22 % |
| Time per plate (T4) | 6.1 ms | 211.7 ms |

GFP-GAN restores faces; on a plate (no face) only its Real-ESRGAN x2 background upsampler acts, so we run that network.

### 5.3 Where the plate reader fails (local check, 467 test plates with symbol boxes)

| Step | Result |
|---|---|
| CNN on colour crops from human boxes | 92.91 % of 4,107 symbols |
| CNN on the paper's black-and-white blobs, human boxes | 82.40 % |
| Symbols found by the paper's contours (IoU ≥ 0.5) | 52.42 % (all symbols found on 8.57 % of plates; 15 blobs per plate for 8.8 symbols) |
| Whole plates exact, CNN + human boxes | 59.53 % |
| Whole plates exact, paper #2 char-YOLO (same v1.1 data, same plates) | 88.87 % (144 plates only char-YOLO right, 7 only the CNN; McNemar p < 0.0001) |

### 5.4 Original-paper check (the authors' Data.zip, run locally)

The kit's `paper08_original_check.ipynb` commands, run one job at a time on a local RTX 5060 Ti (24 Oct 2026): the
authors' own `Data.zip` (commit 8dc72c7, checksum-verified), their split and settings, 3 seeds. Last epoch, as the paper reports:

| On the authors' data | Paper (page) | Ours |
|---|---|---|
| CNN test accuracy, 28x28 (as in their code) | 92.38 % (p.4) | 88.23 ± 1.48 % (3 seeds) |
| CNN test accuracy, 32x32 (as in their text) | 92.38 % (p.4) | 93.40 % (1 seed) |
| ResNet-50 test accuracy | 87.50 % (p.4; their notebook prints 73.93 %) | 87.46 ± 3.27 % (3 seeds) |
| CNN on the 255 clean test crops (copies removed) | not checked | 86.01 ± 1.76 % |
| Test / validation crops that copy a training crop | not discussed | 48 of 303 / 320 of 429 |

All test crops of ঢাকা, মেট্রো, নারায়ণগঞ্জ and ঝ are copies of training crops (the CNN scores 100 % on the region words).
The synthetic-plate test of that notebook (needs the Kaggle input `furcifer/bangla-license-plates-synthetic`) was not run.

---

## 6. Reproducing the Results

1. Notebook `paper08_kaggle.ipynb` (kit folder `docs/Rokib Hasna/8_Bengali License Plate Recognition - Unveiling Clarity with CNN and GFP-GAN/kaggle/` in the team workspace; generated by `docs/_kit/build_kits.py`).
2. Kaggle: Accelerator **GPU T4 x2**, Internet on. The notebook downloads dataset v1.1 from the team Drive by itself.
3. *Save Version → Save & Run All*. About 3.5 h. Download `paper08_outputs.zip` from the Output tab.
4. Fill the team table: `python docs/results/add_results.py paper08_results.zip --member "<your name>"`.
5. The local checks: `report_src/seg_check.py` (CPU, needs the run's `results.zip` and the dataset) and the original check `kaggle/paper08_original_check.ipynb`.

---

## 7. Limitations

- **Last-epoch CNN:** the paper's batch-1 recipe is unstable on 48k crops; only the best-validation checkpoint (epoch 5) is meaningful.
- **Rare tokens:** 39 test tokens have fewer than 20 test crops; one (মুন্সিগঞ্জ) has no training crop at all.
- **ResNet-50** stopped at epoch 25 of 30 (time cap); it had been flat since about epoch 12.
- **One seed** on our data; the plate test uses the 651 OCR test crops (65 night, 112 blurry), no video.
- **GFP-GAN** is represented by its Real-ESRGAN x2 step (exactly what acts on a face-free image).
- The **original-paper check** was run on a local RTX 5060 Ti (24 Oct 2026), not yet on Kaggle; its synthetic-plate test was not run.

---

## 8. Differences from the Original Paper

| | Paper | Ours |
|---|---|---|
| Data | 2,024 hand-cut symbol crops, 17 classes, split 1,292/429/303 (48 test crops copy training crops) | 498R All-in-One v1.1: 56,742 symbol crops from human/auto boxes, 101 tokens, grouped duplicate-free split |
| Input size | text 32x32; code 28x28 (CNN), 150x150 (ResNet-50) | as the code |
| ResNet-50 lr | text 1e-4; code Keras default 1e-3 | 1e-3 (as the code) |
| Checkpoint | last epoch | best validation (last epoch also reported) |
| GFP-GAN | GFPGAN v1.3 -s 2 | RealESRGAN_x2plus (the part of GFPGAN that acts on plates), FP16 |
| Plate order | x only | x only, two-line order, and our BRTA decoder |
| Plate metric | mean SequenceMatcher similarity | the same + plate exact, CER, token accuracy |

---

## 9. File Integrity

SHA-256 checksums of the files in this folder (and the Drive file):

| File | SHA-256 |
|---|---|
| `best_cnn28.pt` | `217ec0eba17cd46ef5c3d8d5e15cf93b326c2e35a49f71184aa94f02265f7fee` |
| `best_resnet50_head.pt` | `a4dd3b4b84c392b092bfdd3ea0673c42f7c8af5b299fa8c6366759fa389442f5` |
| `paper08_results.zip` | `c5cc734f30524aae322ef12190ee9c366613172cda28ec6d4b40ba448d98e658` |
| `results_vs_paper.md` | `48f84b070a9e9836b7573257a115ee2d66633dc7a648e83acd4e468f4132225f` |
| `local_checks.json` | `7cabc1c16e320a9a476ded62467b0f3f4e6f75d850b9f5232a35e1bc7246609c` |
| `Paper08_Study_Report.pdf` | `bf81ee86647784bb9a63dd17b3f63d75be5f1a19cc21f1e709f28a53bc5a2f67` |
| `paper08_outputs.zip` (Drive) | `0c2cfd62bff6b1634f8db219db892ca073cf0130584ab87dd45a800482aaf0ec` |

Check on Windows: `certutil -hashfile best_cnn28.pt SHA256` · Linux/macOS: `sha256sum best_cnn28.pt`.

---

## 10. Licence and Data Notes

- The model code is a PyTorch port of the authors' notebooks (MIT licence, github.com/mhtusher131/Bengali-License-Plate-Recognition_Unveling-Clarity-with-CNN-and-GFP-GAN).
- The ResNet-50 backbone is torchvision's ImageNet model (BSD-3-Clause code; ImageNet weights for research use). RealESRGAN_x2plus (BSD-3-Clause) is downloaded by the notebook and not redistributed here.
- Training data: 498R BanglaLPR All-in-One v1.1, built from public Bangla plate datasets; each source keeps its own licence (see the dataset's README and `docs/DATASET_SHARING_GUIDE.md`).

---

## 11. Citation

```bibtex
@inproceedings{afrin2023bengali,
  title     = {Bengali License Plate Recognition: Unveiling Clarity with {CNN} and {GFP-GAN}},
  author    = {Afrin, Noushin and Hasan, Md Mahamudul and Safin, Mohammed Fazlay Elahi and Amin, Khondakar Rifat
               and Haque, Md Zahidul and Ahmed, Farzad and Shawon, Md Tanvir Rouf},
  booktitle = {2023 26th International Conference on Computer and Information Technology (ICCIT)},
  address   = {Cox's Bazar, Bangladesh},
  year      = {2023},
  note      = {arXiv:2312.10701}
}
```

# Paper: Bengali License Plate Recognition: Unveiling Clarity with CNN and GFP-GAN


## Bengali License Plate Recognition: Unveiling Clarity with CNN and GFP-GAN (2023)
```
Problem:   Read the characters of Bangladeshi number plates from blurry, low-resolution images
           (street-camera quality), where earlier Bangla LPR work assumed clean images.
Method:    Enhance the plate image with GFPGAN, then classic OpenCV steps (grey, top-hat/black-hat contrast,
           Otsu threshold, erode/dilate) and contour-based segmentation into single symbols. Each symbol is
           classified by a small CNN (4 large-kernel conv layers, 17 classes); ResNet-50 is tried as an alternative.
           No plate detector: the input is already a plate image.
Data:      Own character dataset: 2,024 crops (32x32 RGB) in 17 classes (digits 0-9; series letters ka, ga, jha,
           la; Dhaka, Metro, Narayanganj), split 1,292 / 429 / 303 (p.3 Table I, p.4). Crops were cut by hand from
           a Kaggle synthetic plate set and the BLRPS set (p.2 footnotes). Public, MIT licence:
           https://github.com/mhtusher131/Bengali-License-Plate-Recognition_Unveling-Clarity-with-CNN-and-GFP-GAN (Data.zip)
Results:   Character test set: CNN accuracy = 92.38 %, precision 0.9667, recall 0.9162, F1 0.9476;
           ResNet-50 accuracy = 87.50 %, F1 0.8984 (p.4, Table II). Whole plates: mean SequenceMatcher
           similarity = 88 % on 30 plates; 17/30 >= 0.95 and 24/30 >= 0.90 (p.5). Hardware, FPS and
           training time: not reported.
Limits:    Leaky split: 48 of 303 test crops and 320 of 429 validation crops are byte-identical copies of training
           crops. Every test crop of Dhaka, Metro, Narayanganj and jha is a copy (my audit of Data.zip), so the
           letter/word part of 92.38 % is partly memorisation and 98.8 % val is inflated. Other limits:
           - no detector;
           - only 17 symbols, so most districts and series letters cannot be read;
           - x-only character ordering mixes the two plate lines;
           - no with/without-GFPGAN ablation, so the restoration benefit is unproven;
           - 30-plate test;
           - paper and code disagree on several numbers (see "Paper vs. code" below).
For us:    A ready, labelled 17-class Bangla character set and a baseline (CNN 92.4 % char accuracy, 88 % plate
           similarity) to beat. It also gives us a clear question to test properly: does restoration help, and what does it cost?
Code:      https://github.com/mhtusher131/Bengali-License-Plate-Recognition_Unveling-Clarity-with-CNN-and-GFP-GAN
           (official, linked on p.1). The short link in our research plan (…/Bengali-License-Plate-Recognition) is a 404.
BibTeX:    afrin2023bengali  (full entry at the bottom; confirm the key on Google Scholar)
```

---

## Pass 1: survey
1. **Problem:** read Bangla plate characters when the image is blurry and low-resolution.
2. **How:** GFPGAN restoration → OpenCV contrast/threshold/contours → per-symbol CNN classifier (17 classes).
3. **How well:** 92.38 % symbol accuracy on their own crops (p.4), 88 % average string similarity on 30 plates (p.5).

**Useful for us?** Partly. It's a weak venue and a small test. But it has working code and a public labelled
character set, and it asks the restoration question we need to answer. Use it as a how-to and as a baseline. Don't cite it as strong evidence.

## Pass 2: method and results
| Item | Detail | Page |
|---|---|---|
| Dataset | 2,024 symbol crops, 17 classes, 32×32 RGB; train/val/test = 1,292 / 429 / 303 | p.3 (Table I), p.4 |
| Source of crops | Kaggle `furcifer/bangla-license-plates-synthetic` + GitHub `mmshaifur/BLRPS`; manual cropping | p.2 |
| Class balance | digits 90–140 train images each; letters and city words only 13–30 | p.3 |
| CNN | 4 conv layers (16/32/64/128 filters, kernels 22/16/8/4, "same"), max-pool 4, dense 512 → dropout 0.4 → 128 → 17 | code (CNN.ipynb) |
| ResNet-50 | ImageNet weights, **all layers frozen**, Flatten → Dense(17); 150×150 input | p.2, code |
| Training | lr 1e-4, batch size 1, CNN 40 epochs, ResNet-50 30 epochs; no GPU named | p.4, p.5 |
| Enhancement | GFPGAN v1.3, ×2, Real-ESRGAN background upsampler | p.3, code (GFPGAN.ipynb) |
| Segmentation | resize 333×335, Otsu, erode/dilate, 15 largest contours, sorted by x | p.4, code |
| Plate metric | `difflib.SequenceMatcher` ratio between expected and predicted strings, averaged | p.5 |

**Every result number**
| Result | Value | Page |
|---|---|---|
| CNN test accuracy / precision / recall / F1 | 92.38 % / 0.9667 / 0.9162 / 0.9476 | p.4, Table II |
| ResNet-50 test accuracy / precision / recall / F1 | 87.50 % / 0.9343 / 0.8827 / 0.8984 | p.4, Table II |
| CNN validation accuracy / loss (40 epochs) | 98.80 % / 0.0303 (the same paragraph also says "92 %") | p.4 |
| Plate-level similarity (30 plates) | 88 % average | p.1, p.5 |
| Plates ≥ 0.95 / ≥ 0.90 similarity | 17/30 (≈57 %) / 24/30 (80 %) | p.5 |
| Example plate scores | 1.00, 0.95, 0.86, 0.84 | p.5, Table III |
| Comparison table | Proposed CNN 88 %, ResNet-50 83 %, Kabiraj et al. (CNN + ESRGAN) 84 %, Haque et al. (ESRGAN) 78 %. Different datasets, so this is not a fair comparison. | p.6, Table IV |
| FPS, latency, GPU, training time | not reported | – |

Terms I looked up:
- **GFPGAN:** a GAN that restores *faces*, using a pretrained StyleGAN as a "facial prior" (Wang et al., CVPR 2021). The paper describes it wrongly as a flow-based probabilistic graphical model (p.2) and cites StyleHEAT [12] for it.
- **SequenceMatcher ratio:** 2 × matching characters ÷ total characters of both strings. It gives partial credit, so 0.9 does **not** mean 90 % of plates were correct.

## Pass 3: rebuild it
```
plate image ─► GFPGAN ×2 ─► grey ─► top-hat/black-hat ─► 333×335 ─► Otsu ─► erode/dilate
   (already      (on a plate:    (contrast)                                   │
   cropped)       Real-ESRGAN x2                                              ▼
                  does the work)              15 largest contours ─► sort by x ─► each crop 28×28
                                                                              │
                                                     CNN (17 classes) ◄───────┘
                                                          │
                                       join names ─► "9dhaka94metro773jha7" ─► SequenceMatcher vs. truth
```
**Assumptions:** the plate is already cut out and nearly frontal, and each symbol is one connected blob. The plate holds only the 17 known symbols, and the contour order is a usable reading order.

**What would fail on our Bangladeshi plates:**
- **Two lines:** sorting by x alone interleaves the top and bottom lines. Their "expected" strings follow that mixed order (p.5, Table III), so the 88 % is easier than true reading.
- **Bangla letters:** only 4 series letters and 3 region words. Our DIU photos already show চ and যশোর, which the model cannot output.
- **Night and blur:** Otsu on a dark or glared plate breaks the contours. GFPGAN can sharpen edges but can also invent strokes.
- **Full photos:** there is no detector, and our dataset is whole-vehicle photos (640×640), so a YOLO plate detector must come first.
- **Mātrā:** a word like ঢাকা is one connected blob, and a broken মাত্রা splits it, which the paper itself admits (p.5–6).

**How I reproduce it:** use the authors' Data.zip and settings, ported to PyTorch for Kaggle T4 (Part A). Then train on our dataset with the team split (Part B), and read 30 of our plates with and without GFPGAN (Part C). See the [Kaggle guide](Kaggle_Training_Guide.md).


## Paper vs. code (checked 2026-10-09 in the repo, commit `8dc72c7`)
| Topic | Paper | Authors' code / data |
|---|---|---|
| Input size | 32×32×3 (p.3–4) | CNN 28×28, ResNet-50 150×150 |
| Dataset size | "1,292 images" (p.1) | that is only the train split; Data.zip holds 2,024 |
| Class 9 count | 1 train / 45 val (p.3, Table I) | 100 train / 35 val |
| ResNet-50 test accuracy | 87.50 % (p.4) | notebook prints 73.93 % |
| Plate score | average of 30 plates (p.5) | notebook averages 10 hard-coded scores = 87.56 % |
| ResNet-50 learning rate | 1e-4 (p.4) | `optimizer='adam'` = Keras default 1e-3 |
| Plate demo | – | index→label list doesn't match the class order; crops are not scaled by 1/255 before the CNN |
| GFPGAN | "restores" plates (p.3) | face model; with no face on a plate, only its Real-ESRGAN ×2 background step changes the image |
| Image size in the data | "standardized to 32x32" (p.3) | 1,729 of 2,024 crops are 32×32; 295 are other sizes (up to 191×147) |
| Train/test separation | not discussed | 48/303 test and 320/429 val crops are byte-identical to a training crop. All test crops of Dhaka (12), Metro (10), Narayanganj (10) and jha (14) are copies; digits are clean (1 of 229) |

## Team literature table row
| Paper | Year | Venue | Dataset (size) | Detector | OCR method | Metrics | Code? | Limitation | How it helps us |
|---|---|---|---|---|---|---|---|---|---|
| Bengali LPR: Unveiling Clarity with CNN and GFP-GAN (Afrin et al.) | 2023 | ICCIT 2023 (IEEE) / arXiv 2312.10701 | Own 17-class Bangla symbol crops, 2,024 (1,292/429/303), public | None (plate image given); OpenCV contours segment the symbols | GFPGAN enhance + 4-layer CNN per symbol (ResNet-50 tried) | Symbol acc 92.38 %, F1 0.9476 (p.4); plate similarity 88 % on 30 plates (p.5); no FPS | Yes (TF/Keras Colab notebooks + data, MIT) | Leaky split (48/303 test, 320/429 val crops copied from train), 17 symbols only, no detector, x-only ordering mixes lines, no GFPGAN ablation, tiny plate test | Public char crops for pre-training; a baseline to beat; we test whether restoration helps and what it costs |

## Code check → Research board
- **Repository:** https://github.com/mhtusher131/Bengali-License-Plate-Recognition_Unveling-Clarity-with-CNN-and-GFP-GAN
- **Last update:** 13 Sep 2023, licence MIT, 3 stars, 0 open issues.
- **Contents:** 5 Colab notebooks (TensorFlow 2.12): CNN, ResNet-50, GFPGAN, image processing, SequenceMatcher. Also `Data.zip`.
- **Missing:** no `requirements.txt`, no trained weights, and the README links (installation.md, usage.md …) are dead.
- **Runs?** The notebooks are Colab-only (hard-coded Drive paths) and were written for TF 2.12 / Keras 2, not checked on today's Keras 3. I ported the CNN and ResNet-50 to PyTorch. It runs on Kaggle T4 and on CPU, and a local CPU run gave 90.4 % test accuracy (paper: 92.38 %).

Paste into the board (Code link + Short note, ≤ 300 chars):
```
https://github.com/mhtusher131/Bengali-License-Plate-Recognition_Unveling-Clarity-with-CNN-and-GFP-GAN
```
```
Official repo, MIT, last update Sep 2023: 5 Colab notebooks (TF 2.12) + Data.zip (2,024 char crops, 17 classes). No requirements.txt or weights. Runs on Kaggle T4 via my PyTorch port. CNN 92.38% char acc (p.4), 88% plate similarity (p.5).
```

## Results: ours vs. the paper
Fill the "Ours" column from `outputs/results_table.md` and `outputs/results_plates.md` after the Kaggle run.
Rows marked **different task** are not comparable with the paper (team rule: mark them separately).

| Run | Data | Model | Metric | Paper (page) | Ours (Kaggle T4) | FPS (bs 1, T4) | Train time | Notes |
|---|---|---|---|---|---|---|---|---|
| A_cnn | paper chars, 17 cls | CNN 28×28 | test accuracy | 92.38 % (p.4) | | | | authors' notebook: 93.40 %; my local CPU check: 90.43 % (best-val) / 91.42 % (last epoch), 14 min |
| A_cnn | paper chars | CNN | macro P / R / F1 | 0.9667 / 0.9162 / 0.9476 (p.4) | | | | CPU check: 0.910 / 0.922 / 0.910 |
| A_resnet50 | paper chars, 17 cls | ResNet-50 frozen, 150×150 | test accuracy | 87.50 % (p.4) | | | | authors' notebook: 73.93 % |
| **Kaggle code 2** (`paper08_reproduce_kaggle.ipynb`) | | | | | | | | paste `results_vs_paper.md` here |
| A_cnn ×3 seeds | paper chars | CNN 28×28 | test acc, last epoch (paper protocol), mean ± std | 92.38 % (p.4) | | | | |
| A_cnn ×3 seeds | paper chars | CNN | best val acc | 98.80 % (p.4) | | – | – | 320/429 val crops are copies of train crops |
| A_cnn ×3 seeds | paper chars, **clean test** (255 crops, copies removed) | CNN | test acc | – (not checked in the paper) | | – | – | CPU check: 88.6 % (best-val) / 89.8 % (last) |
| A_resnet50 ×3 seeds | paper chars | ResNet-50 frozen | test acc, last epoch, mean ± std | 87.50 % (p.4) | | | | |
| A_cnn32 | paper chars | CNN **32×32** (paper text) | test acc | 92.38 % (p.4) | | | | does 28 vs 32 matter? |
| A_resnet50norm | paper chars | ResNet-50 + ImageNet normalisation | test acc | – (our fix) | | | | why is their ResNet weak? |
| C paper30 | 30 synthetic plates (authors' plate source), only 17 known symbols | paper pipeline + GFP-GAN, x order | mean similarity / ≥0.95 / ≥0.90 | 88 % / 57 % / 80 % (p.5) | | GFP-GAN ms/plate: | – | closest repeat of the paper's plate test |
| C paper30, no GFP-GAN | same | paper pipeline only | mean similarity | – (never tested in the paper) | | – | – | the missing ablation |
| C any200 | 200 synthetic plates, any symbol | paper pipeline + GFP-GAN | mean similarity | – | | | – | cost of knowing only 17 symbols |
| B_cnn | **our DIU set, 5 vehicle types** | CNN 28×28 | test accuracy, macro F1 | – (different task) | | | | team split 70/15/15 by pHash group |
| B_resnet50 | **our DIU set, 5 vehicle types** | ResNet-50 frozen | test accuracy, macro F1 | – (different task) | | | | |
| C none·paper | 30 of our plates | paper pipeline, no GFPGAN | mean similarity | 88 % (p.5, their plates, with GFPGAN) | | – | – | the ablation the paper never ran |
| C gfpgan·paper | 30 of our plates | paper pipeline + GFPGAN | mean similarity / ≥0.95 / ≥0.90 | 88 % / 57 % / 80 % (p.5) | | ms per plate: | – | |
| C gfpgan·fixed | 30 of our plates | + 2-line order, size filter | mean similarity | – | | | – | my fix for the two-line problem |

## BibTeX
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
*
Document Verification Report

• Document Title: Bengali License Plate Recognition: Unveiling Clarity with CNN and GFP-GAN
• Authors: Noushin Afrin, Md Mahamudul Hasan, Mohammed Fazlay Elahi Safin, Khondakar Rifat Amin, Md Zahidul Haque, Farzad Ahmed, and Md. Tanvir Rouf Shawon
• Indexed Publication Platform: IEEE Xplore Digital Library
• Conference: 2023 26th International Conference on Computer and Information Technology (ICCIT)
• IEEE Record Sequence Number: Document ID 10441040*

# Paper: HVI- A New Color Space for Low-light Image Enhancement (HVI-CIDNet)


## HVI: A New Color Space for Low-light Image Enhancement (2025)
```
Problem:   Low-light enhancers that work in sRGB shift colours (brightness and colour are coupled); those that work
           in HSV get red artifacts (hue wraps around at red) and black-noise artifacts (dark pixels have unstable
           hue / saturation) (p.1-3, Fig. 1).
Method:    HVI colour space: polarise hue into (cos, sin) so red is continuous, and a trainable "intensity collapse"
           Ck that shrinks the colour plane of dark pixels to zero (p.3-4). CIDNet: a dual-branch U-Net in HVI (an
           HV colour branch and an intensity branch) linked by six Lighten Cross-Attention blocks, then the inverse
           transform back to sRGB (p.4-5, Fig. 2). Loss in both HVI and sRGB (Eq. 7, p.5).
Data:      LOLv1, LOLv2-Real / Synthetic (paired), SICE, Sony-Total-Dark, and 5 unpaired sets (DICM, LIME, MEF,
           NPE, VV) (p.5). Adam, lr 1e-4 -> 1e-7 cosine; LOL: 400x400 crops, 1,500 epochs, batch 8 (p.5).
Results:   1.88 M params, 7.57 GFLOPs (256x256). LOLv1 28.201 dB / 0.889 SSIM / 0.079 LPIPS (with "GT mean"),
           LOLv2-Real 24.111 / 0.871 / 0.108, LOLv2-Syn 25.705 / 0.942 / 0.045, best on all (p.6, Table 1);
           Sony-Total-Dark 22.904 dB, +6.7 dB over the next method (p.6, Table 2); 0.053 s GPU time (p.7, Table 3).
Limits:    Image-quality scores only (PSNR / SSIM against a well-lit twin); LOLv1 numbers use the ground truth's mean
           brightness at test time ("GT mean"); the authors' README says the weights behind the LOLv2-Real 24.111
           were lost (public: 23.904); separate weights per dataset; never tested on a downstream task like
           detection or OCR.
For us:    Night plates are our weakest case (#2, #21). A small, public, state-of-the-art enhancer to put in front of
           the plate detector / reader, behind a "dark photo" gate, and a clear yes / no for the report.
Code:      https://github.com/Fediory/HVI-CIDNet (MIT) · weights https://huggingface.co/Fediory
BibTeX:    yan2025hvi  (full entry at the bottom; confirm on Google Scholar)
```

---

## Pass 1: survey (3 lines)
1. **Problem:** brighten dark photos without colour shifts and noise artifacts.
2. **How:** a new colour space (polarised hue + learnable dark-pixel collapse) and a small dual-branch network in it.
3. **How well:** best PSNR / SSIM / LPIPS on LOLv1, LOLv2 and 8 more sets with only 1.88 M parameters (p.6).

**Useful for us?** Yes, as a pre-processing candidate. It is peer-reviewed (CVPR 2025), small and fast, MIT-licensed,
and its weights are on Hugging Face as safetensors (no pickle). The paper never asks whether enhanced images help a
detector or an OCR: that is our question.

## Pass 2: method and results
| Item | Detail | Page |
|---|---|---|
| Venue | CVPR 2025 (Northwestern Polytechnical University and others) | p.1, README |
| Intensity | I_max = max(R, G, B) per pixel (Max-RGB, the V of HSV) | p.3, Eq. 1 |
| Polarised HS | h → (cos(πh/3), sin(πh/3)): red at h = 0 and h = 6 becomes one point | p.3-4 |
| Collapse Ck | trainable darkness density k: the HV radius of dark pixels goes to 0, grows with intensity | p.4 |
| CIDNet | dual-branch U-Net (HV branch, intensity branch), 6 Lighten Cross-Attention blocks, PHVIT back to sRGB | p.4-5, Fig. 2 |
| Test-time knobs | `gated` (saturation x1.3) for LOLv1, `gated2` + `alpha` (brightness 0.8-0.84) for LOLv2 in eval.py | code |
| Loss | λ·l(HVI) + l(sRGB) (p.5, Eq. 7); in train.py l = L1 + SSIM + edge + VGG perceptual | p.5, code |
| Training | Adam (0.9, 0.999), lr 1e-4 → 1e-7 cosine; LOLv1 / v2-Real 400x400 crops, 1,500 epochs, batch 8; one 2080Ti / 3090 | p.5 |

**Every result number** (p.6, Table 1; p.7, Tables 3-4)
| Method | Params (M) | GFLOPs | LOLv1 PSNR / SSIM / LPIPS | LOLv2-Real | LOLv2-Syn |
|---|---|---|---|---|---|
| RetinexFormer | 1.53 | 15.85 | 27.140 / 0.850 / 0.129 | 22.794 / 0.840 / 0.171 | 25.670 / 0.930 / 0.059 |
| GSAD (diffusion) | 17.36 | 442.02 | 27.605 / 0.876 / 0.092 | 20.153 / 0.846 / 0.113 | 24.472 / 0.929 / 0.051 |
| Zero-DCE | 0.075 | 4.83 | 21.880 / 0.640 / 0.335 | 16.059 / 0.580 / 0.313 | 17.712 / 0.815 / 0.169 |
| **CIDNet (HVI)** | **1.88** | **7.57** | **28.201 / 0.889 / 0.079** | **24.111 / 0.871 / 0.108** | **25.705 / 0.942 / 0.045** |
| GPU time per LOLv2 image | CIDNet 0.053 s vs GSAD 0.315 s, DiffLight 0.578 s | | | | p.7, Table 3 |
| Ablation (LOLv2-Real PSNR) | sRGB 20.06, HSV 21.35, HVI full 24.11; single-branch U-Net 19.31 | | | | p.7, Table 4 |
| Unpaired sets (BRISQUE / NIQE) | 23.521 / 3.523 | | | | p.6, Table 2 |

Terms I looked up:
- **PSNR / SSIM / LPIPS:** pixel error (dB, higher is better), structural similarity (0-1, higher is better), learned
  perceptual distance (lower is better). All need the well-lit ground-truth photo of the same scene.
- **GT mean:** before scoring, the output is scaled so its mean grey equals the ground truth's (authors' measure.py).
  It removes the brightness error, which a real system cannot do.
- **Max-RGB:** the brightness of a pixel is its largest colour channel.

**Weak points I found:**
- **GT mean on LOLv1.** The LOLv1 column (28.201) is computed with the ground truth's brightness (Table 1 caption,
  p.6); without it the authors' README gives 23.50-23.81 dB. Our local check also shows that the row mixes two
  weight files: PSNR / SSIM come from the model trained without perceptual loss, the LPIPS 0.079 from the one
  trained with it (see the preview at the end).
- **Lost weights.** The README says the weights behind the LOLv2-Real 24.111 are lost; the public best-PSNR weights
  give 23.904.
- **Only image quality.** There is no test of detection or recognition on enhanced images; a "nicer" image can still
  hurt a detector trained on normal photos.
- **Parameter count.** The released `CIDNet()` (default channels [36, 36, 72, 144]) has 1.98 M parameters when counted
  in PyTorch (our local test, 25 Oct 2026), not the 1.88 M of Table 1; the check notebook reports it again.
- **Speed in practice.** 79 ms per 640 x 640 photo and 17 ms per plate crop on our RTX 5060 Ti test PC (batch 1, FP32):
  too slow to run on every frame, so a dark-photo gate is needed.

## Pass 3: rebuild it
```
dark photo (sRGB) ─► HVIT: I = max(R,G,B); hue polarised (cos, sin); HV plane collapsed by Ck(I) ─► (H, V, I) map
   ─► CIDNet: HV branch ⇄ 6 Lighten Cross-Attention ⇄ intensity branch (U-Net) ─► light-up HVI ─► PHVIT ─► sRGB
our use: photo ─► mean grey < 60 ? (the team's night rule) ─► yes: HVI-CIDNet ─► plate detector ─► crop ─► CRNN
```
**Assumptions:** the enhancer trained on LOL (indoor / outdoor scenes, not traffic) generalises to street photos;
enhancement does not invent edges or erase characters; it is cheap enough per photo.

**What would fail on our Bangladeshi plates:**
- **Headlight glare and reflective plates:** LOL has no bright point lights in the dark; the enhancer may over-expose
  plates under headlights.
- **Noise amplification:** night phone photos are noisy; brightening can turn noise into fake strokes in Bangla
  characters.
- **Domain:** our detector already trained on NightLPBD night photos; it may do better on raw night photos than on
  enhanced ones it never saw.

**How I reproduce it:**
- **The authors' code** (pinned commit `eb43d7d`) and their Hugging Face weights (generalization model, LOLv2-Real
  best-PSNR), with the switches of their eval.py.
- **Main kit:** YOLOv8s plate detector and CRNN trained on our data; then none / gamma 0.5 / CLAHE / HVI-CIDNet x2 on
  the night photos, 200 clear photos and the whole test with a dark-photo gate (mAP50, plates found), and the same for
  the night OCR crops (plate exact); ms per photo and per crop.
- **Original check:** the released weights on LOLv1 eval15 and LOLv2-Real test (public Hugging Face copies), PSNR /
  SSIM exactly as their measure.py, + LPIPS, with and without GT mean.
- See the [Kaggle guide](../../../src/MD.Rokib.Hasan.Oli/paper35/Kaggle_Training_Guide.md) and the [original-check guide](../../../src/MD.Rokib.Hasan.Oli/paper35/Original_Check_Guide.md).

## Check yourself (2-minute version)
> HVI-CIDNet brightens dark photos in a new colour space (polarised hue so red does not wrap, plus a learnable
> collapse of dark pixels' colour) with a small dual-branch network: 1.88 M parameters, best PSNR / SSIM on LOL and
> 8 other sets, 0.05 s per image. The LOLv1 number uses ground-truth brightness, and one set of weights is lost. It
> was never tested on detection or OCR. For us: a zero-shot test in front of our night plate detector and reader,
> against plain CLAHE and gamma, with a gate so day photos are untouched.

## Team literature table row
| Paper | Year | Venue | Dataset (size) | Detector | OCR method | Metrics | Code? | Limitation | How it helps us |
|---|---|---|---|---|---|---|---|---|---|
| HVI: A New Color Space for Low-light Image Enhancement — HVI-CIDNet (Yan et al.) | 2025 | CVPR 2025 | LOLv1 (500 pairs), LOLv2-Real (789) / Syn, SICE, SID, 5 unpaired sets | – | – (pre-processing) | LOLv2-Real 24.11 dB / 0.871 SSIM; LOLv1 28.20 (GT mean); 1.88 M params, 0.053 s (p.6-7) | Yes (MIT, HF weights) | Image-quality metrics only; GT-mean trick; LOLv2 weights lost | Night-plate pre-processing behind a dark gate; vs CLAHE / gamma |

## Code check → Research board
- **Official code:** https://github.com/Fediory/HVI-CIDNet (MIT, 855 stars, last push 9 Mar 2026); the kit pins commit
  `eb43d7d91e9a336c66856824ff9e4603ae41f408` (`net/CIDNet.py`, needs `einops`).
- **Weights:** Hugging Face `Fediory/HVI-CIDNet-*` (safetensors; pinned revisions in `extras/p35_lowlight.py`):
  Generalization, LOLv1 w/wo perceptual loss, LOLv2-Real best-PSNR / best-SSIM, LOLv2-Syn, SICE, Sony-Total-Dark.

Paste into the board (Code link + Short note, ≤ 300 chars):
```
https://github.com/Fediory/HVI-CIDNet
```
```
MIT code + HF weights. My T4x2 kit: HVI-CIDNet (zero-shot) vs CLAHE/gamma before our YOLOv8s + CRNN on night photos/crops, with a dark gate: mAP50, plate exact, ms. Check: LOL PSNR/SSIM ±GT mean. Paper: LOLv2-Real 24.11 dB, 1.88 M params (p.6).
```

## BibTeX
```bibtex
@inproceedings{yan2025hvi,
  title     = {{HVI}: A New Color Space for Low-light Image Enhancement},
  author    = {Yan, Qingsen and Feng, Yixu and Zhang, Cheng and Pang, Guansong and Shi, Kangbiao and Wu, Peng and Dong, Wei and Sun, Jinqiu and Zhang, Yanning},
  booktitle = {Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR)},
  year      = {2025}
}
```
*Add pages from the CVPR 2025 open-access page before the report.*

## Settings I trained with
<!-- settings:start -->
| Item | Setting |
|---|---|
| Notebook | [`kaggle/paper35_kaggle.ipynb`](../../../src/MD.Rokib.Hasan.Oli/paper35/kaggle/paper35_kaggle.ipynb), steps in [Kaggle_Training_Guide.md](../../../src/MD.Rokib.Hasan.Oli/paper35/Kaggle_Training_Guide.md) |
| Data | 498R BanglaLPR All-in-One v1.1 (downloaded by the notebook from the team Drive, or the Kaggle dataset `498r-bangla-lpr-all-in-one`): detection 8574 / 896 / 1153 photos (train: 4067 human + 4507 auto boxes); character boxes 5465 / 536 / 467 crops; OCR text 5607 / 766 / 651 crops; e2e test 204 photos |
| Split | team rule: grouped 70/15/15, seed 42, no near-duplicate across splits; val/test = human labels only |
| Hardware | Kaggle GPU T4 x2: one job per GPU at the same time (no DataParallel), CPU numbers on the Kaggle CPU |
| Software | ultralytics==8.4.170, einops; PyTorch, CUDA and all versions are saved in `environment.json` and each `results.json` |
| Seed / optimiser | seed 42; YOLO runs use SGD (Ultralytics 8.4's `auto` would pick MuSGD), other settings in the table below |
| Time cap | every training job stops after the epoch that passes its `--max-hours` cap (12 h Kaggle limit); `epochs_run` in results.json shows if it did |
| Planned time | 4 h for the full run |

| Run | GPU | What |
|---|---|---|
| `det_v8s` | 0 | YOLOv8s plate detector, 60 epochs |
| `crnn` | 1 | CRNN plate reader, 60 epochs |
| `lowlight` | 0 (after) | none / gamma / CLAHE / HVI-CIDNet x2 on night, clear and gated photos and crops; ms |

The exact arguments of every run are in its `results.json` (`settings`) and, for YOLO runs, `args.yaml` inside
`paper35_outputs.zip` (team Drive `498R / weights / paper35 /`).
<!-- settings:end -->

## Results: ours vs. the paper
<!-- results:start -->
### Paper #35: ours vs. the paper

| Metric | Paper (page) | det_v8s | crnn | lowlight |
|---|---|---|---|---|
| Night photos: mAP50, no enhancement (%) | - |  |  | 94.4 |
| Night photos: mAP50 after HVI-CIDNet generalization (%) | - |  |  | 95.7 |
| Night photos: mAP50 after HVI-CIDNet LOLv2-Real (%) | - |  |  | 94.7 |
| Night photos: mAP50 after CLAHE (%) | - |  |  | 96.1 |
| Night photos: mAP50 after gamma 0.5 (%) | - |  |  | 93.8 |
| Gain on night photos, HVI generalization (pp) | - |  |  | 1.25 |
| Night photos: plates found after HVI (%) | - |  |  | 90.14 |
| Whole test with the dark gate: mAP50 gain, HVI (pp) | - |  |  | -0.0100 |
| Clear photos: mAP50 after HVI (does it hurt day?) (%) | - |  |  | 99.0 |
| Night crops: plate exact, no enhancement (%) | - |  |  | 61.54 |
| Night crops: plate exact after HVI (%) | - |  |  | 55.38 |
| Gain on night crops, HVI (pp) | - |  |  | -6.16 |
| HVI-CIDNet ms per 640x640 photo (T4) | 53 ms per LOLv2 image (GPU not named) (p.7, Table 3) |  |  | 154.87 |
| HVI-CIDNet ms per plate crop (T4) | - |  |  | 37.55 |
| HVI-CIDNet params (M) | 1.88 (7.57 GFLOPs at 256x256) (p.6, Table 1) |  |  | 1.98 |
| Plate detector mAP50, all test (%) | - | 98.5 |  |  |
| CRNN plate exact, all test (%) | - |  | 73.43 |  |
| LOLv2-Real PSNR / SSIM (paper only, see the check) | 24.111 / 0.871 (p.6, Table 1) |  |  |  |

The paper used its own data; our numbers are on the 498R All-in-One test split (different data),
so the comparison shows the direction and size of the gap, not a head-to-head result.

The paper scores image quality (PSNR / SSIM against a well-lit photo of the same scene) on LOL; we have no well-lit twin of our night photos, so we score what we care about: plates found and plates read.

## Results by condition: detectors (test mAP50 %)

| Run | all test | clear | night | blurry | small plates | rain (synthetic) | fog (synthetic) | false alarms on plate-free photos (%) |
|---|---|---|---|---|---|---|---|---|
| det_v8s | 98.5 | 99.0 | 94.3 | 95.2 | 84.5 | 82.5 | 97.9 | 5.62 |

## Results by condition: plate readers (plate exact %)

| Run | all test | clear | night | blurry | fog (real fog copies) | rain (synthetic) |
|---|---|---|---|---|---|---|
| crnn | 73.43 | 77.50 | 61.54 | 64.29 | 50.00 | 67.13 |

Condition subsets are fixed for the whole team (detection/conditions.json, ocr/conditions.json); rain and detection-fog copies are synthetic.

<!-- results:end -->

**How to read this table (hand note, 26 Oct; kept outside the markers so a re-run of add_results does not remove it).**
Run checked: 4 jobs code=0 in 2.0 h, dataset v1.1, detector 60/60 epochs (best 55), no NaN; the CRNN file is
byte-identical to the paper #24 run's (same SHA-256). Local re-scoring (RTX 5060 Ti, same weights): plates found and
plates read identical, mAP50 within 0.04. 

- **Detector:** no enhancer finds an extra night plate (64 / 71 with none, gamma, CLAHE, HVI-gen; LOLv2-Real 63).
  Night mAP50 gains are inside the noise: HVI-gen +1.28 (95 % CI -0.1 to +2.8), CLAHE +1.68 (-0.3 to +4.6), paired
  photo bootstrap on val's own boxes. Predict-vs-val letterbox alone moves night AP50 by up to 1.6 and reorders them.
- **Reader:** night crops 40 → 36 right with HVI-gen (7 broken / 3 fixed, n.s.); gamma 29 (p .003); CLAHE 40.
  Every crop enhanced: HVI-gen loses 20 of 586 day plates (p .007), CLAHE 16 (p .02).
- **End to end (new, local; 60 NightLPBD photos):** none 31; best CLAHE on the photo 35 and HVI-gen for the detector
  only (read original pixels) 35 (both n.s.); LOLv2-Real on photo / crop 26. The same 6 photos are unfound in every
  setting.
- **Why:** night photos are not dark (median mean grey 85; 17 / 71 below the gate of 60; 6 / 60 NightLPBD); the 6 night
  plates nobody finds are small (5.6-9.3 k px²) or close-ups. The gate enhances only 20 of 1,153 photos.
- **Cost:** HVI 155 ms per 640 photo on a T4 (detector 6.5 ms TRT); FP16 2.6x faster locally, no NaN. CLAHE on every
  photo doubles false boxes on plate-free photos (9 → 17, p .008).
- **For us:** no enhancer in the pipeline; report this as the RQ4 / G4 "CLAHE and enhancement" ablation (negative
  result); next: CRNN trained with enhanced copies, night-style augmentation, bigger night test set.

## Original-paper check (the paper's own data)
<!-- check:start -->
### Paper #35 on its own data: ours vs. the paper

| Metric | Paper (page) | lolv1 | lolv2_real |
|---|---|---|---|
| LOLv1, GT mean: PSNR (dB), wo-perc weights | 28.201 (README: 28.1405) (p.6, Table 1) | 28.23 |  |
| LOLv1, GT mean: SSIM | 0.889 (README: 0.8887) (p.6, Table 1) | 0.89 |  |
| LOLv1, GT mean: LPIPS | 0.079 (README: 0.0988; w-perc 0.0791) (p.6, Table 1) | 0.0988 |  |
| LOLv1, no GT mean: PSNR (dB), wo-perc weights | README: 23.5000 (the paper gives none) | 23.61 |  |
| LOLv1, w-perc weights, GT mean: PSNR (dB) | README: 27.7146 | 27.73 |  |
| LOLv2-Real: PSNR (dB), best-PSNR weights, no GT mean | 24.111 (README: lost weights; public 23.9040) (p.6, Table 1) |  | 23.89 |
| LOLv2-Real: SSIM, best-PSNR weights | 0.871 (README: 0.8656) (p.6, Table 1) |  | 0.87 |
| LOLv2-Real: LPIPS, best-PSNR weights | 0.108 (README: 0.1219) (p.6, Table 1) |  | 0.12 |
| LOLv2-Real: SSIM, best-SSIM weights | README: 0.8705 |  | 0.87 |
| LOLv2-Real: PSNR, generalization weights (used in the main kit) | - |  | 21.30 |
| Params (M) | 1.88 (p.6, Table 1) | 1.98 |  |
| GPU ms per LOLv2 image (600 x 400) | 53 (GPU not named) (p.7, Table 3) |  | 83.24 |

Same data and split as the paper (its own published data / weights), so this IS a direct check of
the paper's numbers. Remaining differences come from software versions, hardware and randomness.

'GT mean' uses the ground truth at test time (brightness taken from the target image), so it is not something a real system can do; the plain rows are the honest numbers.

<!-- check:end -->

**Hand note (26 Oct).** The Kaggle T4 check equals the local preview below to 0.01 dB: the released weights reproduce
the README (LOLv1 GT mean 28.23; LOLv2-Real best-PSNR 23.89 vs the paper's 24.111 from lost weights). The paper's
LOLv1 row needs GT mean (23.61 without) and mixes two files (LPIPS 0.079 is the w-perc model's). 1.976 M parameters;
82-87 ms per 600 x 400 image on a T4 (paper 53 ms, GPU not named). Code facts found on 26 Oct: the code's
`density_k` is 1 / paper k (learned: generalization 1.02, LOLv2-Real 2.84, LOLv1 2.53, LOLv1-perc 0.89; start 5);
eval.py multiplies LOLv2-Real outputs by 0.80 / 0.82 / 0.84 per weight file and boosts LOLv1 saturation x1.3 (values
not in the paper); the supplement's GT-mean formula (Eq. 21, p.17) has the ratio upside down (measure.py is right).

<!-- preview:start -->
### Local preview of the original-paper check (25 Oct 2026, my PC: RTX 5060 Ti, the kit's `c35_lol.py`; accuracy only)
The released Hugging Face weights on the full LOLv1 eval15 (15 pairs) and LOLv2-Real test (100 pairs), scored with the
authors' measure.py formulas. Accuracy does not depend on the GPU, so this already checks the paper; the T4 timing
comes from the Kaggle run.

| Weights (HF) | Test set | PSNR / SSIM / LPIPS, plain | PSNR / SSIM / LPIPS, GT mean | Paper (p.6, Table 1) | Authors' README |
|---|---|---|---|---|---|
| LOLv1 wo-perc | LOLv1 | 23.61 / 0.870 / 0.105 | **28.23 / 0.889** / 0.099 | 28.201 / 0.889 / **0.079** | 23.50 plain; 28.14 / 0.889 / 0.099 GT mean |
| LOLv1 w-perc | LOLv1 | 23.84 / 0.857 / 0.086 | 27.73 / 0.876 / **0.079** | (same row) | 23.81 plain; 27.71 / 0.876 / 0.079 GT mean |
| LOLv2-Real best-PSNR | LOLv2-Real | **23.89 / 0.866 / 0.122** | 27.95 / 0.883 / 0.116 | 24.111 / 0.871 / 0.108 | 23.904 / 0.866 / 0.122 |
| LOLv2-Real best-SSIM | LOLv2-Real | 23.89 / 0.870 / 0.119 | 28.39 / 0.887 / 0.114 | – | 23.898 / 0.871 / 0.119 |
| Generalization (used in the main kit) | LOLv2-Real | 21.31 / 0.849 / 0.119 | 27.83 / 0.886 / 0.108 | – | – |

What it shows: the released weights reproduce the authors' README to about 0.1 dB. The paper's LOLv1 row combines
two weight files (PSNR / SSIM of the model trained without perceptual loss, LPIPS 0.079 of the one trained with it),
and both need GT mean; without it LOLv1 is about 23.6-23.8 dB. The LOLv2-Real row (24.111 dB) cannot be reproduced
with public weights (23.89 dB; the README says those weights were lost). Every model has 1.98 M parameters in
PyTorch (paper: 1.88 M). GPU time on this PC: 42-53 ms per 600 x 400 image (paper: 53 ms, GPU not named).
<!-- preview:end -->

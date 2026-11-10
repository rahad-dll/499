# Paper #34: SVTRv2: CTC Beats Encoder-Decoder Models in Scene Text Recognition

*Reader: MD. Rokib Hasan Oli · new5 (added 25 Oct 2026) · Board group: Model backbones / OCR methods*
*PDF: `Papers/6_6 Added papers (new5)/34_2025_SVTRv2 CTC Beats Encoder-Decoder Models in STR.pdf`
(arXiv 2411.15858 v2, 15 Jul 2025, 17 pages incl. supplement; ICCV 2025). Page numbers below are the PDF pages.*

---

## SVTRv2: CTC Beats Encoder-Decoder Models in Scene Text Recognition (2025)
```
Problem:   CTC readers (CRNN, SVTR) are fast but lose to encoder-decoder readers (PARSeq, MAERec) on curved,
           rotated, occluded text: they squash every crop to one fixed size, CTC assumes left-to-right order, and
           they have no language context (p.1-2, Fig. 1).
Method:    SVTRv2 = a 3-stage visual model (local mixing = grouped convs, global mixing = self-attention) + CTC, with
           (1) multi-size resizing (MSR): 64x64, 48x96, 40x112 or 32x(R*32) chosen by the crop's aspect ratio R
           (p.3); (2) a feature rearrangement module (FRM): horizontal then vertical attention that maps 2-D features
           to a reading-order sequence for CTC (p.4); (3) a semantic guidance module (SGM): during training only, the
           visual features must predict each character from its left / right context strings (p.4-5).
Data:      Trained on U14M-Filter (Union14M-L with the test-overlapping samples removed: millions of real crops; p.2, p.5);
           tested on 6 Common benchmarks, Union14M-Benchmark, OST (occluded), LTB (long text), Chinese BCTR.
Results:   SVTRv2-B: Common 96.57, U14M 86.14, OST 80.0, LTB 50.2, 19.8 M params, 143 FPS (1080Ti) vs PARSeq 96.40 /
           84.26 / 79.9 / 0.0, 23.8 M, 52.6 FPS and CRNN 90.21 / 49.24, 172 FPS (p.7, Table 3). SVTRv2-T 94.78 / 79.05,
           5.1 M, 201 FPS; -S 96.13 / 83.70, 11.3 M, 189 FPS. MSR vs fixed 32x128: +15.3 (R < 1.5), +5.2 (1.5-2.5) on
           irregular text (p.6, Table 1). SGM: +0.41 Common, +2.28 U14M, +5.11 OST (p.6, Table 2).
Limits:    English (94 characters) and Chinese only; big real training set (millions of crops, 20 epochs, batch 1024, 4 x
           RTX 4090); FPS on a 1080Ti; the SGM gain is mostly on occluded text that needs language context.
For us:    A reader that may give PARSeq-level accuracy (#31) at CRNN-level speed, and MSR keeps two-line Bangla plates
           (aspect ratio ~1.5-2.2) at 48x96 instead of squashing them into 32x128.
Code:      https://github.com/Topdu/OpenOCR (Apache-2.0; configs/rec/svtrv2, weights on Google Drive)
BibTeX:    du2025svtrv2  (full entry at the bottom; confirm on Google Scholar)
```

---

## Pass 1: survey (3 lines)
1. **Problem:** fast CTC readers are less accurate than attention-decoder readers on irregular text.
2. **How:** aspect-ratio-aware resizing, a CTC-friendly feature rearrangement, and a training-only language guide.
3. **How well:** SVTRv2-B beats every encoder-decoder reader on U14M (86.14 vs PARSeq 84.26) at 2.7x PARSeq's FPS (p.7).

**Useful for us?** Yes. Peer-reviewed (ICCV 2025), official Apache-2.0 code, and it targets our exact trade-off
(accuracy vs ms per plate). Our token labels fit CTC directly (as in the CRNN of seq.py), and two-line plates are the
"irregular text" case MSR was designed for.

## Pass 2: method and results
| Item | Detail | Page |
|---|---|---|
| Venue | ICCV 2025 (Fudan, USTC, BJTU) | p.1 |
| MSR | R < 1.5 → 64x64; 1.5 ≤ R < 2.5 → 48x96; 2.5 ≤ R < 3.5 → 40x112; R ≥ 3.5 → 32 x (⌊R⌋·32) | p.3 |
| Visual model | 3 stages, output H/8 x W/4; local mixing = 2 grouped convs, global = MHSA; no absolute position embedding | p.3-4 |
| Variants | T / S / B (dims, depths in the supplement; configs svtrv2_{tiny,small}_rctc.yml, svtrv2_rctc.yml) | p.4 |
| FRM | horizontal rearrangement (row-wise MHSA) + vertical (a selecting token attends over each column) → W/4 sequence | p.4 |
| SGM | left / right context strings (window 5) attend to the visual features to predict the character; dropped at test | p.4-5 |
| Loss | 0.1 · CTC + 1 · SGM cross-entropy | p.5 |
| Training | AdamW wd 0.05, lr 6.5e-4, batch 1024, one-cycle (1.5 / 20 epochs warm-up), max length 25; first without SGM, then with it | p.5 |
| Data | U14M-Filter (filtered Union14M-L) for English, BCTR for Chinese; 24 other readers retrained on the same data | p.2, p.5 |

**Every result number**
| Model | Common avg | U14M avg | LTB | OST | Size (M) | FPS (1080Ti) | Page |
|---|---|---|---|---|---|---|---|
| CRNN | 90.21 | 49.24 | 47.2 | 58.0 | 16.2 | 172 | p.7, Table 3 |
| SVTR-B | 94.58 | 71.17 | 45.1 | 69.6 | 18.1 | 161 | p.7, Table 3 |
| PARSeq | 96.40 | 84.26 | 0.0 | 79.9 | 23.8 | 52.6 | p.7, Table 3 |
| MAERec | 96.36 | 85.17 | 9.8 | 76.4 | 35.7 | 17.1 | p.7, Table 3 |
| **SVTRv2-T** | 94.78 | 79.05 | 47.8 | 71.4 | 5.1 | 201 | p.7, Table 3 |
| **SVTRv2-S** | 96.13 | 83.70 | 47.6 | 78.0 | 11.3 | 189 | p.7, Table 3 |
| **SVTRv2-B** | 96.57 | 86.14 | 50.2 | 80.0 | 19.8 | 143 | p.7, Table 3 |
| MSR vs Fixed32x128 (SVTRv2, irregular text by R bucket) | R1 87.4 vs 72.1; R2 88.3 vs 83.1 | | | | | | p.6, Table 1 |
| w/o SGM → SGM | Common 96.16 → 96.57; U14M 83.86 → 86.14; OST 74.92 → 80.03 | | | | | | p.6, Table 2 |
| With pre-training (MJ+ST then Real) | Common 97.8, OST 86.9 | | | | | | p.8 |

Terms I looked up:
- **CTC (connectionist temporal classification):** a loss that aligns a per-column prediction sequence with a shorter
  label without character positions; decoding = take the best class per column, merge repeats, drop blanks.
- **EDTR:** encoder-decoder text recogniser (attention decoder, e.g. PARSeq); slower because it decodes step by step.
- **Union14M-Benchmark (U14M):** 7 hard subsets (curve, multi-oriented, artistic, contextless, salient, multi-word,
  general).

**Weak points I found:**
- **Data hunger.** Every number comes from millions of real training crops; nothing tells us how it behaves with ~5.6 k
  crops (our case), where attention-heavy models can overfit.
- **Speed on old hardware.** FPS is measured on a 1080Ti at batch 1 without TensorRT; the ranking may differ on a T4.
- **SGM needs language.** Its gain is largest on occluded words (OST); plate text (random digits + a district from a
  list of 64) has little language context, so we leave SGM out and say so.

## Pass 3: rebuild it
```
plate crop ─► aspect ratio R ─► MSR size (64x64 / 48x96 / 40x112 / 32x128)
          ─► SVTRv2 encoder (conv stages, then attention) ─► H/8 x W/4 features
          ─► RCTC head = FRM (row attention + column "selecting token") ─► W/4 x (tokens + blank)
          ─► CTC greedy decode ─► Bangla tokens (district, মেট্রো, letter, digits) ─► plate text
```
**Assumptions:** enough training data for the attention stages; the reading order can be learned by FRM; batches can
be grouped by MSR size.

**What would fail on our Bangladeshi plates:**
- **Two-line plates** are the strength of MSR (48x96 keeps both rows readable), but FRM must learn to read the top
  row first, then the bottom row; with few two-line examples it may mix the rows.
- **Tiny data:** 5.6 k crops vs millions; pre-training on English (as in the kit) or synthetic plates (#17) may be needed.
- **64x64 bucket:** square plates give only 16 CTC steps; 9 tokens with repeated digits still fit, but barely. And
  it is common: in the local test, 93 of 280 training crops fell into 64x64, 176 into 48x96 and only 11 into 40x112
  (none at 32x128), i.e. our plates are mostly two-line and near-square, the case MSR was built for.

**How I reproduce it:**
- **The authors' model code** (OpenOCR, pinned commit `1ccfc6e`): `build_model` with the SVTRv2-T / -S encoder
  settings and the RCTC (FRM) head; our token classes; MSR buckets in our own data loader (batches from one size).
- **Runs:** SVTRv2-T and -S with MSR from the authors' English weights; SVTRv2-T fixed 32x128 (MSR ablation);
  SVTRv2-T from scratch; CRNN baseline. AdamW wd 0.05, lr 5e-4, one-cycle 7.5 % warm-up, batch 64, 100 epochs.
- **Report:** plate exact, CER, plate exact per MSR size (64x64, 48x96, 40x112), by condition, ms per plate; the
  prediction files join the #24 fusion.
- See the [Kaggle guide](Kaggle_Training_Guide.md). No original-paper check was built (see its section below).

## Check yourself (2-minute version)
> SVTRv2 is a CTC text reader that closes the accuracy gap to attention-decoder readers: it resizes each crop to one
> of four sizes by aspect ratio, rearranges 2-D features into reading order for CTC, and uses a training-only module
> that injects language context. SVTRv2-B beats PARSeq on hard English benchmarks (86.1 vs 84.3) at almost 3x the
> speed. For us: a fast reader for Bangla plates whose resizing suits two-line plates; we test it against CRNN and
> PARSeq on our crops, with and without English pre-training.

## Team literature table row
| Paper | Year | Venue | Dataset (size) | Detector | OCR method | Metrics | Code? | Limitation | How it helps us |
|---|---|---|---|---|---|---|---|---|---|
| SVTRv2: CTC Beats Encoder-Decoder Models in STR (Du et al.) | 2025 | ICCV 2025 | U14M-Filter (filtered Union14M-L, millions of real crops), 6 benchmarks + U14M + OST + LTB | – | SVTRv2 (MSR + FRM + SGM, CTC) | B: 96.57 Common / 86.14 U14M at 143 FPS; T 94.78 at 201 FPS (p.7) | Yes (OpenOCR, Apache-2.0) | Needs millions of crops; 1080Ti FPS; SGM needs language | Fast CTC reader for Bangla plates; MSR for two-line plates |

## Code check → Research board
- **Official code:** https://github.com/Topdu/OpenOCR (Apache-2.0, 1.5 k stars, last push 21 Sep 2026). The kit pins
  commit `1ccfc6ee6161f7133b192e16af3a9265273997ba` and imports `openrec.modeling.build_model` (encoder
  `SVTRv2LNConvTwo33`, decoder `RCTCDecoder`); SVTRv2-T builds with 5.13 M parameters, the paper's 5.1 M.
- **Weights:** Google Drive folders per size (configs/rec/svtrv2/readme.md); the kit downloads the T and S folders with
  gdown in its setup cell (checked: the T folder has `best.pth`, 22.9 MB, + `config.yml`) and loads the encoder and the
  RCTC / FRM head (`decoder.ctc_decoder.*`, released with SGM); only the English classifier is replaced
  (`torch.load(..., weights_only=True)`).

Paste into the board (Code link + Short note, ≤ 300 chars):
```
https://github.com/Topdu/OpenOCR
```
```
Official OpenOCR model code (pinned). My T4x2 kit: SVTRv2-T/S (MSR + FRM, CTC) on our Bangla tokens from English weights vs fixed 32x128, from scratch and CRNN: plate exact, two-line plates, ms/plate. Paper: SVTRv2-B 86.1 U14M vs PARSeq 84.3 (p.7).
```

## BibTeX
```bibtex
@inproceedings{du2025svtrv2,
  title     = {{SVTRv2}: {CTC} Beats Encoder-Decoder Models in Scene Text Recognition},
  author    = {Du, Yongkun and Chen, Zhineng and Xie, Hongtao and Jia, Caiyan and Jiang, Yu-Gang},
  booktitle = {Proceedings of the IEEE/CVF International Conference on Computer Vision (ICCV)},
  pages     = {20147--20156},
  year      = {2025}
}
```
*Pages from the ICCV 2025 open-access listing; confirm on Google Scholar before the report.*

## Settings I trained with
<!-- settings:start -->
| Item | Setting |
|---|---|
| Notebook | [`kaggle/paper34_kaggle.ipynb`](kaggle/paper34_kaggle.ipynb), steps in [Kaggle_Training_Guide.md](Kaggle_Training_Guide.md) |
| Data | 498R BanglaLPR All-in-One v1.1 (downloaded by the notebook from the team Drive, or the Kaggle dataset `498r-bangla-lpr-all-in-one`): detection 8574 / 896 / 1153 photos (train: 4067 human + 4507 auto boxes); character boxes 5465 / 536 / 467 crops; OCR text 5607 / 766 / 651 crops; e2e test 204 photos |
| Split | team rule: grouped 70/15/15, seed 42, no near-duplicate across splits; val/test = human labels only |
| Hardware | Kaggle GPU T4 x2: one job per GPU at the same time (no DataParallel), CPU numbers on the Kaggle CPU |
| Software | ultralytics==8.4.170, gdown; PyTorch, CUDA and all versions are saved in `environment.json` and each `results.json` |
| Seed / optimiser | seed 42; YOLO runs use SGD (Ultralytics 8.4's `auto` would pick MuSGD), other settings in the table below |
| Time cap | every training job stops after the epoch that passes its `--max-hours` cap (12 h Kaggle limit); `epochs_run` in results.json shows if it did |
| Planned time | 3.5 h for the full run |

| Run | GPU | What |
|---|---|---|
| `svtrv2_t_msr` | 0 | SVTRv2-T, MSR, from the authors' English weights, 60 epochs |
| `svtrv2_s_msr` | 0 (after) | SVTRv2-S, MSR, from the authors' English weights, 60 epochs |
| `svtrv2_t_fixed` | 1 | SVTRv2-T, fixed 32x128 (Table 1 ablation), English weights, 60 epochs |
| `svtrv2_t_scratch` | 1 (after) | SVTRv2-T, MSR, from scratch, 60 epochs |
| `crnn` | 1 (after) | CRNN-CTC baseline (seq.py), 60 epochs |
| `timing` | 0 (after all) | batch-1 ms of every reader with nothing else on the GPUs |

The exact arguments of every run are in its `results.json` (`settings`) and, for YOLO runs, `args.yaml` inside
`paper34_outputs.zip` (team Drive `498R / weights / paper34 /`).
<!-- settings:end -->


## Results: ours vs. the paper
<!-- results:start -->
### Paper #34: ours vs. the paper

| Metric | Paper (page) | svtrv2_t_msr | svtrv2_s_msr | svtrv2_t_fixed | svtrv2_t_scratch | crnn |
|---|---|---|---|---|---|---|
| Plate exact (%) | word accuracy, Common benchmarks: T 94.78, S 96.13 (English) (p.7, Table 3) | 81.26 | 81.87 | 74.50 | 61.75 | 73.43 |
| CER (%) | - | 2.49 | 3.07 | 4.47 | 8.55 | 5.53 |
| Token accuracy (%) | - | 97.16 | 97.12 | 95.49 | 92.47 | 95.05 |
| Two-line plates (48x96 MSR size): plate exact (%) | MSR vs fixed 32x128: +5.2 (1.5 <= R < 2.5) (p.6, Table 1) | 84.54 | 86.12 | – | 70.35 | – |
| Near-square plates (64x64 MSR size): plate exact (%) | MSR vs fixed 32x128: +15.3 (R < 1.5) (p.6, Table 1) | 78.42 | 78.12 | – | 53.50 | – |
| Fixed 32x128 (all plates): plate exact (%) | - | 100.00 | 0.00 | 74.50 | 0.00 | – |
| Night crops: plate exact (%) | - | 69.23 | 67.69 | 52.31 | 40.00 | 61.54 |
| ms per plate (T4, batch 1) | FPS: T 201, S 189, CRNN 172 (1080Ti) (p.7, Table 3) | 7.62 | 15.34 | 14.15 | 14.99 | 4.58 |
| Params (M) | T 5.1, S 11.3, CRNN 16.2 (p.7, Table 3) | 5.13 | 11.25 | 5.13 | 5.13 | 7.69 |
| Start weights | trained on U14M-Filter (English) (p.5) | best.pth: encoder 164 of 164 tensors, FRM head 14 of 16 (cla | best.pth: encoder 164 of 164 tensors, FRM head 14 of 16 (cla | best.pth: encoder 164 of 164 tensors, FRM head 14 of 16 (cla | from scratch | – |
| Epochs run | 20 (English, batch 1024) (p.5) | 63 | 66 | 64 | 65 | – |
| Training time (min) | not reported (4 x RTX 4090) (p.5) | 96.30 | 96.90 | 96.10 | 96.30 | 16.50 |

The paper used its own data; our numbers are on the 498R All-in-One test split (different data),
so the comparison shows the direction and size of the gap, not a head-to-head result.

The paper reads English words (94 characters, millions of real training crops); we read Bangla plate tokens with about 5.6 k training crops. The semantic guidance module (SGM) is not trained here (plate text has almost no language context; see the notes). Compare svtrv2_t_msr with svtrv2_t_fixed for MSR, with svtrv2_t_scratch for the English pre-training, and every run with crnn and with PARSeq (#31).

## Results by condition: plate readers (plate exact %)

| Run | all test | clear | night | blurry | fog (real fog copies) | rain (synthetic) |
|---|---|---|---|---|---|---|
| crnn | 73.43 | 77.50 | 61.54 | 64.29 | 50.00 | 67.13 |
| svtrv2_s_msr | 81.87 | 84.58 | 67.69 | 79.46 | 57.69 | 76.80 |
| svtrv2_t_fixed | 74.50 | 79.17 | 52.31 | 67.86 | 53.85 | 66.97 |
| svtrv2_t_msr | 81.26 | 85.00 | 69.23 | 73.21 | 57.69 | 75.27 |
| svtrv2_t_scratch | 61.75 | 66.46 | 40.00 | 54.46 | 26.92 | 59.60 |

Condition subsets are fixed for the whole team (detection/conditions.json, ocr/conditions.json); rain and detection-fog copies are synthetic.

<!-- results:end -->

### How to read this table (run checked 27 Oct 2026)
- **The run is sound:** dataset v1.1, 5 / 5 jobs `code=0` in 3.57 h, no NaN; every `best.pt` re-read on our PC gives
  the same plate exact on test and val for all 5 runs (same text in 7,079 of 7,085 readings); the CRNN is byte-identical to
  the Model Fusion (#24) run's; the English start weights are the paper's Table 3 models (their result files: T 94.78 /
  S 96.13 Common).
- **Epochs run 63-66 of 100:** every SVTRv2 run hit the 1.6 h time cap (about 90 s per epoch, CPU-bound augmentation),
  so the one-cycle learning rate never came down; the kept checkpoints (lowest val **loss**) are epochs 55 / 35 / 23 / 54
  (T-MSR / S-MSR / T-fixed / T-scratch). The MSR and T-vs-S comparisons are therefore partly checkpoint comparisons.
- **"Fixed 32x128 (all plates)" row:** for the MSR runs it is the ONE test plate in the 32x128 size group (100.00 /
  0.00), not a fixed-size result; only `svtrv2_t_fixed`'s 74.50 is the fixed-size score.
- **"ms per plate (T4)" row:** measured while the other T4 was training (the same SVTRv2-T network: 7.62 / 14.15 /
  14.99 ms); use the timings in `SVTRv2_Study_Report.pdf`, section 16.
- **Paired tests (exact McNemar, same 651 plates):** T-MSR vs CRNN +7.83 (87 vs 36, p < 0.0001); S vs T +0.61 (n.s.);
  MSR vs fixed +6.76 (77 vs 33, p < 0.0001), but +9.78 on the 48x96 group and only +3.95 (n.s.) on the near-square 64x64
  group, the opposite of the paper's Table 1; English start vs scratch +19.51; scratch is 11.67 below CRNN; character
  YOLO (#24) is 5.53 above T-MSR (p = 0.0004).
- **Fusion with our earlier readers** (kit `p24_fusion.py`, chosen on val): character YOLO + SVTRv2-T fallback **90.17 %**
  (22 fixed / 0 broken vs character YOLO; 11 / 2 vs the best fusion so far, 88.79 %, p = 0.02); four-reader vote
  (character YOLO + LPNR (#2) + SVTRv2-T + S, MV-BM+format) **90.94 %** (16 / 2 vs 88.79 %, p = 0.001).
- **Kit fixed 27 Oct** (60 epochs, checkpoint on val plate exact, crops cached, timing at the end with both GPUs idle,
  per-MSR-group scores for every run); a re-run takes about 3.5 h. Full study: [SVTRv2_Study_Report.pdf](SVTRv2_Study_Report.pdf)
  (sources in `report_src/`).

## Original-paper check (the paper's own data)
<!-- check:start -->
*Not possible: possible but not built: the released SVTRv2 weights (Google Drive) and the benchmark LMDBs (the #31 check downloads them) are public, but the authors' pickled checkpoints cannot be loaded on our test PC, so no untested notebook was shipped; the main kit uses their model code.* The main kit above runs the paper's method on our data instead.
<!-- check:end -->

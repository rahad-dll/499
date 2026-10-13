# Paper Notes — *Optimizing YOLOv8 for Parking Space Detection: Comparative Analysis of Custom Backbone Architectures*

Reference notes extracted for reproduction. Everything here is either quoted from the paper,
read out of the authors' repo, or **verified locally** (marked ✅ / ⚠️).

| | |
|---|---|
| **Authors** | Apar Pokhrel, Gia Dao (UT Arlington) |
| **arXiv** | https://arxiv.org/abs/2505.17364 |
| **Code** | https://github.com/pokhrelapar/yolov8-pklot |
| **Local PDF** | `ml/yolov8-pklot-main/yolov8-pklot-main/Optimizing_YOLOv8_...pdf` (8 pages) |
| **Local code** | `ml/yolov8-pklot-main/yolov8-pklot-main/` |

---

## 1. What the paper actually does

One idea, executed five times: **keep YOLOv8's neck + detection head, swap the backbone**, train
each variant on PKLot under identical settings, and compare accuracy vs. compute.

| # | Variant | Backbone | Source of backbone |
|---|---------|----------|--------------------|
| 1 | **YOLOv8n** (baseline) | CSPDarknet53 (stock) | `yolov8n.pt`, fine-tuned |
| 2 | **YOLO-ResNet-18** | ResNet-18 | `torchvision.models`, ImageNet pretrained |
| 3 | **YOLO-VGG16** | VGG-16 | `torchvision.models`, ImageNet pretrained |
| 4 | **YOLO-EfficientNetV2** | EfficientNetV2-S | `torchvision.models`, ImageNet pretrained |
| 5 | **YOLO-Ghost-P2** | GhostConv / C3Ghost + extra P2 head | Ultralytics stock `yolov8-ghost-p2.yaml` |

There is **no new architecture, no new loss, no new dataset.** The contribution is the
benchmark table. That makes it a clean reproduction target — every number should be reachable.

---

## 2. Dataset

- **PKLot** (de Almeida et al., 2015): 12,417 images @ 1280×720, 695,899 segmented parking spaces.
- Captured at UFPR and PUCPR (Curitiba, Brazil), >30 days, 5-min time-lapse, sunny/cloudy/rainy.
- Original XML annotations converted to YOLO format **via Roboflow**.
- Label format: `<class_id> <x_center> <y_center> <width> <height>` (normalized).
- **Resized to 640×640**; split **70 % train / 20 % val / 10 % test**.

**Which Roboflow export:** the notebooks all unzip `PKLot.v2-640.yolov8.zip`, i.e.
[public.roboflow.com/object-detection/pklot](https://public.roboflow.com/object-detection/pklot)
→ workspace `brad-dwyer`, project `pklot-1tros`, **version 2 ("640")**, format `yolov8`.
12,416 images, 2 classes.

⚠️ **Class names.** Roboflow's export names the classes `space-empty` / `space-occupied`, but the
authors' confusion matrices are labelled **`e` / `o`** — they renamed them in `data.yaml`.
Index order is the same (0 = empty, 1 = occupied), so this is cosmetic and does not affect metrics.

**Test-set size** (read off the baseline confusion matrix): ~36,584 `e` + ~34,100 `o`
≈ 70.7 k instances over ~1,242 images.

Augmentation used = Ultralytics defaults (HSV, translate 0.1, scale 0.5, fliplr 0.5,
mosaic 1.0 with `close_mosaic=10`, erasing 0.4). The paper additionally claims "blur"; that is
**not** in `args.yaml` — no blur augmentation was actually configured.

---

## 3. Architecture details (all four custom configs)

The three torchvision variants share **one** template. Only the backbone line and the three
`Index` picks change:

```yaml
backbone:
  - [-1, 1, TorchVision, [2048, "<name>", "DEFAULT", True, 2, True]]  # 0  full backbone, split outputs
  - [0,  1, Index, [<c>, <i3>]]   # 1  P3 = 1/8
  - [0,  1, Index, [<c>, <i4>]]   # 2  P4 = 1/16
  - [0,  1, Index, [<c>, <i5>]]   # 3  P5 = 1/32
  - [-1, 1, SPPF,  [1024, 5]]     # 4
head:                             # stock YOLOv8 PANet neck, Detect on layers 10, 13, 16
```

`TorchVision(..., unwrap=True, truncate=2, split=True)` strips the classifier + pooling head and
returns a **list** of every intermediate activation, with `y[0] = input`, so `y[i]` = output of
sub-module `i-1`. `Index` then picks the P3/P4/P5 taps.

✅ **Verified locally** (torchvision 0.28) — every index in the paper/repo is correct:

| Backbone | P3 (1/8) | P4 (1/16) | P5 (1/32) |
|---|---|---|---|
| ResNet-18 | `y[6]` → 128×80×80 | `y[7]` → 256×40×40 | `y[8]` → 512×20×20 |
| EfficientNetV2-S | `y[4]` → 64×80×80 | `y[6]` → 160×40×40 | `y[8]` → 1280×20×20 |
| VGG-16 | `y[23]` → 512×80×80 | `y[30]` → 512×40×40 | `y[31]` → 512×20×20 |

The VGG-16 numbers "23, 30, 31" in §5.6 of the paper look like typos but are **exactly right**
(they are the last ReLU before each max-pool, plus the final pool).

**Ghost-P2** is the odd one out: it is not a backbone swap at all, it is Ultralytics' stock
`yolov8-ghost-p2.yaml` — GhostConv/C3Ghost throughout **and a fourth detection head at P2/4**
(`Detect(P2, P3, P4, P5)`). The paper's §5.7 describes the Ghost module but never mentions the
extra high-resolution head, which is the main reason its layer count is 290.

---

## 4. Training setup

Paper Table 2 vs. what the runs actually recorded in `runs/*/args.yaml`:

| Parameter | Paper Table 2 | Actual `args.yaml` | Note |
|---|---|---|---|
| Input size | 640×640 | `imgsz: 640` | ✔ |
| Epochs | 20 | `epochs: 20` | ✔ |
| Batch | 16 | `batch: 16` | ✔ |
| Optimizer | AdamW (auto-selected) | `optimizer: auto` | ✔ same thing |
| Initial LR | 0.001667 (auto-tuned) | `lr0: 0.01` | both true — see below |
| Momentum | 0.9 (auto-tuned) | `momentum: 0.937` | both true — see below |
| Weight decay | 0.0005 conv / 0.0 bias / 0.0 other | `weight_decay: 0.0005` | ✔ Ultralytics' 3-group default |
| **Dataloader workers** | **2** | **`workers: 8`** | ⚠️ paper is wrong |
| Seed | — | `seed: 0`, `deterministic: true` | use these |
| `close_mosaic` | — | `10` | mosaic off for last 10 epochs |
| Log dir | `runs/detect/train` | ✔ | |

**On the LR/momentum "conflict":** with `optimizer='auto'` Ultralytics ignores the requested
`lr0`/`momentum` and prints `optimizer: AdamW(lr=0.001667, momentum=0.9)`. `args.yaml` stores the
*requested* values, the paper reports the *effective* ones. Both are correct — just set
`optimizer='auto'` and you get the paper's behaviour.

**Hardware:** NVIDIA A100-SXM4-40GB, CUDA 12.4, PyTorch 2.6, Ultralytics YOLOv8.
⚠️ "Some experiments were conducted using an NVIDIA Tesla T4 GPU to reduce GPU compute cost."
**This makes the inference-ms column in Table 4 non-comparable across rows** — see §7.

Wall-clock from the logged `results.csv` (`time` at epoch 20):

| Model | Train time |
|---|---|
| YOLOv8n | 1,274 s (21 min) |
| Ghost-P2 | 2,012 s (34 min) |
| VGG16 | 2,447 s (41 min) |
| EfficientNetV2 | 2,663 s (44 min) |
| ResNet-18 | 4,146 s (69 min) |
| **Total** | **≈ 3.5 h** |

---

## 5. Metrics

- **IoU** = |A∩B| / |A∪B|
- **AP_c** = area under the precision–recall curve for class *c*; **mAP** = mean over classes.
- **mAP@50** at IoU 0.5; **mAP@50:95** averaged over IoU 0.50→0.95 step 0.05.
- **Precision** = TP/(TP+FP), **Recall** = TP/(TP+FN).
- TP = correctly identified occupied space, TN = correctly identified empty,
  FP = empty predicted as occupied, FN = occupied predicted as empty.

⚠️ Paper erratum: Eq. (5) is labelled "Precision" but is the **Recall** formula.
⚠️ Paper erratum §4.0.3: the third Detect block is said to detect "small" objects — should be **large**.

---

## 6. Headline results (the numbers to beat)

### Table 3 — accuracy (paper, test split)

| Model | Precision | Recall | mAP50 | mAP50:95 |
|---|---|---|---|---|
| YOLOv8n | 0.996 | 0.996 | 0.994 | 0.970 |
| YOLO-ResNet-18 | 0.998 | 0.997 | 0.994 | 0.976 |
| YOLO-VGG16 | 0.998 | 0.985 | 0.991 | 0.985 |
| YOLO-EfficientNet | **0.998** | **0.997** | **0.994** | **0.986** |
| YOLO-Ghost-P2 | 0.968 | 0.978 | 0.991 | 0.896 |

### Table 4 — complexity (paper)

| Model | Params (M) | Layers | Inference (ms) | GFLOPs |
|---|---|---|---|---|
| YOLOv8n | 3.01 | 129 | 0.9 | 8.2 |
| YOLO-ResNet-18 | 13.32 | 132 | 9.0 | 35.2 |
| YOLO-VGG16 | 17.78 | 113 | 3.3 | 262.1 |
| YOLO-EfficientNet | 23.40 | 564 | 4.1 | 56.4 |
| YOLO-Ghost-P2 | 1.60 | 290 | 1.5 | 8.8 |

### What the repo's own logs say (final epoch, **val** split, `results.csv`)

| Model | Precision | Recall | mAP50 | mAP50:95 |
|---|---|---|---|---|
| YOLOv8n | 0.99773 | 0.99797 | 0.99448 | 0.96595 |
| YOLO-ResNet-18 | 0.99846 | 0.99838 | 0.99455 | 0.97269 |
| YOLO-VGG16 | 0.99845 | 0.99869 | 0.99454 | **0.98613** |
| YOLO-EfficientNetV2 | 0.99874 | 0.99865 | 0.99460 | 0.98269 |
| YOLO-Ghost-P2 | 0.96797 | 0.98073 | 0.99207 | 0.89303 |

**Use this as your primary target** — it is the raw logged output, not a retyped table.

---

## 7. Discrepancies found — read before comparing

Ordered by how much they can bite you.

### 7.1 ⚠️ The committed YAMLs do **not** build the models in Table 4

The three custom-backbone YAMLs in the repo have **no `scales:` block**. Without it Ultralytics
falls back to `depth = width = 1.0`, so the PANet neck is built at **4× the width and 3× the depth**
of yolov8n's neck. Built locally with `nc=2`:

| Variant | Repo YAML as committed | With `scales: n:[0.33,0.25,1024]` | **Paper Table 4** |
|---|---|---|---|
| YOLOv8n | — | 3.01 M / 129 L / 8.2 G | 3.01 M / 129 L / 8.2 G ✅ |
| Ghost-P2 | — | 1.61 M / 290 L / 8.8 G | 1.60 M / 290 L / 8.8 G ✅ |
| ResNet-18 | 51.39 M / 164 L / 122.2 G ❌ | **13.33 M / 132 L / 35.2 G** | 13.32 M / 132 L / 35.2 G ✅ |
| EfficientNetV2-S | 62.59 M / 596 L / 144.1 G ❌ | **23.40 M / 564 L / 56.4 G** | 23.40 M / 564 L / 56.4 G ✅ |
| VGG-16 | 55.16 M / 145 L / 344.7 G ❌ | **16.93 M / 113 L / 256.4 G** | 17.78 M / 113 L / 262.1 G ~ |

The scaled column reproduces Table 4 to 4 significant figures for ResNet-18 and EfficientNetV2.
**Conclusion: the authors trained with a `scales:` block that never made it into the committed
YAMLs.** If you train the repo files as-is you get a ~4× larger model and your Table 4 will not
match. The configs in `ml/colab/cfg/` have the `scales:` block restored.

### 7.2 ⚠️ The VGG-16 config is missing from the repo entirely

`args.yaml` records `model: /content/drive/My Drive/VGG_16.yaml` — a Drive path that was never
committed. `ml/colab/cfg/yolov8n-vgg16.yaml` is a **reconstruction** from §5.6 of the paper.
It is structurally confirmed (**113 layers — exact match**) but lands at 16.93 M / 256.4 GFLOPs
vs. the paper's 17.78 M / 262.1 GFLOPs (−4.8 % params, −2.2 % GFLOPs). Some head channel width
in the original differs slightly. Expect VGG16 accuracy to reproduce; expect its Table 4 row to be
a few percent light.

### 7.3 ⚠️ Table 3's VGG16 / EfficientNet rows look swapped

Paper says EfficientNet wins mAP50:95 (0.986) over VGG16 (0.985). The repo's own logs say the
opposite: **VGG16 0.98613 > EfficientNet 0.98269**. The paper's two values (0.986 / 0.985) are
exactly the pair you get by rounding the logged VGG16 number and mis-assigning it.
Also Table 3 gives VGG16 recall 0.985 while the log says 0.99869 — a 1.4-point gap far outside
val↔test noise for this dataset. **Treat the paper's "EfficientNetV2 is best" conclusion as
unverified**; your run will settle it.

### 7.4 ⚠️ Table 3 is test-split, `results.csv` is val-split

`results.csv` only ever logs validation. The paper's Table 3 comes from
`model.val(split='test')`, run separately. Compare like with like — the notebook reports **both**.

### 7.5 ⚠️ The inference-ms column is not a fair comparison

The paper says some runs were moved to a T4 to save cost, and it shows: ResNet-18 is listed at
**9.0 ms with 35 GFLOPs** while VGG16 is **3.3 ms with 262 GFLOPs** — 7.5× the compute at
one third the latency. That ordering is only possible if the two were timed on different GPUs.
Re-time all five on one device before drawing any speed conclusion.

### 7.6 Ghost-P2's validation classification loss diverges

`yolov8n-ghostp2/.../results.csv` ends with `val/cls_loss = 64.755` (every other model is ≈0.16–0.20).
Train cls_loss is normal at 0.419. This is not commented on anywhere in the paper, and Ghost-P2 is
also the only variant with visibly worse precision/mAP50:95. Worth watching in your run — it may
explain the whole Ghost-P2 result.

### 7.7 Minor

- `nc: 80` is left in every custom YAML. Harmless — Ultralytics overrides it from `data.yaml`.
- Notebook loads `yolov8n-efficientnetv2_S.yaml`; the committed file is `yolov8n-efficientnet-v2.yaml`.
  Filenames drifted, so the committed file may not be byte-identical to the one trained.
- Ghost-P2 was trained twice (`train/` and `train2/`); only `train2/` has `results.csv`.
- The VGG16 run's `args.yaml` says `save_dir: runs/detect/train3` but is stored under `runs/train/`.
- Paper says "blur" augmentation was applied; no blur setting exists in `args.yaml`.
- §5.4 comments in the ResNet-18 YAML describe channel counts (512/1024/2048) that don't match
  the actual tensors (128/256/512). Comments only — the `Index` c2 args are right.

---

## 8. Reproduction checklist

1. PKLot Roboflow **v2 (640)**, yolov8 format, 70/20/10 — not v1, not v4.
2. Rewrite `data.yaml` paths to absolute (Roboflow's `../train/images` breaks under Colab).
3. Use the configs in `ml/colab/cfg/` (with `scales:`), **not** the repo's committed YAMLs.
4. `epochs=20, batch=16, imgsz=640, optimizer='auto', seed=0, deterministic=True, workers=8`.
5. Baseline starts from `yolov8n.pt`; custom variants start from YAML with ImageNet backbone weights.
6. Report **both** val (final epoch of `results.csv`) and test (`model.val(split='test')`).
7. Time all five variants on the **same** GPU before comparing latency.
8. Capture params / layers / GFLOPs from a freshly built `nc=2` model to line up with Table 4.

**Expected divergence even in a perfect reproduction:** ±0.002 on precision/recall/mAP50 (they are
saturated at ~0.99), up to ±0.01 on mAP50:95, and completely different ms figures.
mAP50:95 is the only metric in this paper with enough dynamic range to rank the models.

---

## 9. Where the paper is weak (useful if you are writing this up)

- **20 epochs, one seed, no repeats.** Differences of 0.001–0.002 in Table 3 are inside run-to-run
  noise. Only the Ghost-P2 gap (−0.08 mAP50:95) and the mAP50:95 spread (0.896 → 0.986) are real signal.
- **PKLot is saturated.** Four of five models sit at 0.99+ precision/recall/mAP50. The paper's own
  motivation — partially visible vehicles, motorcycles, poor lighting — is never actually measured;
  there is no per-condition (sunny/cloudy/rainy) or per-lot breakdown, and no small-object analysis,
  even though that is exactly what the extra P2 head in Ghost-P2 was for.
- **Backbone is not the only variable.** Because the neck is rebuilt at scale `n` for every variant but the
  backbones differ hugely in width, "backbone choice" is confounded with total capacity (1.6 M → 23.4 M).
- **The authors acknowledge** limited hyperparameter tuning and compute (§9), and fixed camera
  angles / limited lot types in PKLot.

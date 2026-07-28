# PKLot / YOLOv8 reproduction — Colab

Reproduces all five variants from *Optimizing YOLOv8 for Parking Space Detection*
([arXiv:2505.17364](https://arxiv.org/abs/2505.17364)) and diffs the results against the paper.

```
colab/
├── YOLOv8_PKLot_Reproduce.ipynb   <- upload this to Colab, it is self-contained
├── cfg/                            <- same configs, standalone (the notebook writes its own)
│   ├── yolov8n-resnet18.yaml
│   ├── yolov8n-efficientnetv2_S.yaml
│   ├── yolov8n-vgg16.yaml          (reconstructed — original was never committed)
│   └── yolov8n-ghost-p2.yaml
└── README.md
```

Read [`../PAPER_NOTES.md`](../PAPER_NOTES.md) first — it has the target numbers and the list of
places where the paper and the authors' repo disagree with each other.

## Run it

1. Upload `YOLOv8_PKLot_Reproduce.ipynb` to [Colab](https://colab.research.google.com).
2. **Runtime → Change runtime type → GPU.**
3. In the config cell, paste a free [Roboflow](https://roboflow.com) API key
   (or switch `DATASET_MODE` to `"drive_zip"` if you already have `PKLot.v2-640.yolov8.zip`).
4. Leave `QUICK_TEST = True` and run everything — ~5 minutes, proves the pipeline works.
5. Set `QUICK_TEST = False` and run again for the real thing.

## Time budget

| GPU | Full 5-model run |
|---|---|
| A100 (paper's) | ~3.5 h |
| T4 (free Colab) | ~8–10 h |

Colab will disconnect before a full T4 run completes. The notebook handles it: results are
written straight to Drive, finished models are skipped on re-run, and interrupted ones resume
from `last.pt`. Either re-run after each disconnect, or set `MODELS_TO_RUN` to one variant per
session. Per-model times from the authors' logs: yolov8n 21 min, ghostp2 34, vgg16 41,
efficientnetv2 44, resnet18 69.

## What comes out

Written to `<PROJECT>/` on Drive:

| File | Contents |
|---|---|
| `<key>_train/` | weights, `results.csv`, Ultralytics' own plots |
| `<key>_test/` | test-split PR/F1 curves, confusion matrix |
| `my_results.csv` | one row per model: test + val precision/recall/mAP50/mAP50:95, latency |
| `comparison_vs_paper.csv` | your numbers vs. Table 3 vs. the authors' logged val numbers |
| `comparison_plots.png` | 8-panel training curves across all variants |

## Notes on the configs

Two fixes were needed to make the repo's code reproduce its own paper:

**The `scales:` block.** The authors' committed YAMLs omit it, so Ultralytics builds the PANet
neck at `depth=width=1.0` instead of `0.33/0.25` — a ~4× larger model than Table 4 describes.
Restoring it reproduces Table 4 to 4 significant figures:

| Variant | repo YAML as committed | configs here | paper Table 4 |
|---|---|---|---|
| YOLOv8n | — | 3.01 M / 129 L / 8.2 G | 3.01 M / 129 L / 8.2 G |
| Ghost-P2 | — | 1.61 M / 290 L / 8.8 G | 1.60 M / 290 L / 8.8 G |
| ResNet-18 | 51.39 M / 164 L / 122.2 G | 13.33 M / 132 L / 35.2 G | 13.32 M / 132 L / 35.2 G |
| EfficientNetV2-S | 62.59 M / 596 L / 144.1 G | 23.40 M / 564 L / 56.4 G | 23.40 M / 564 L / 56.4 G |
| VGG-16 | *(not in repo)* | 16.93 M / 113 L / 256.4 G | 17.78 M / 113 L / 262.1 G |

**The VGG-16 config.** Never committed — `args.yaml` points at a Drive path. Rebuilt from §5.6 of
the paper. Layer count matches exactly (113), params land 4.8 % light, so some head channel width
in the original differed slightly.

All five were verified locally against Ultralytics 8.3.100: each builds, forward-passes at
640×640, and emits the expected detection strides ( `[8,16,32]`, or `[4,8,16,32]` for Ghost-P2,
which carries an extra P2 head).

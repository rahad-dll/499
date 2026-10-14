# Bangla Licence Plate Recognition

Licence plate recognition in two stages:

1. **Plate detection** — a YOLOv8 detector locates licence plates in camera frames.
2. **Plate reading** — each detected plate is read into text.

## Notebooks

| Notebook | Description |
|---|---|
| [`00_download_datasets.ipynb`](notebooks/kaggle/00_download_datasets.ipynb) | Collects and verifies the datasets on Kaggle for saving as the private dataset `bangla-licence-plates` |
| [`01_build_detection_dataset.ipynb`](notebooks/kaggle/01_build_detection_dataset.ipynb) | Merges the plate annotations into one single-class YOLO dataset without train/test duplicates, published as `bangla-plate-detection` |
| [`02_lpr-train-plate-detector-stock.ipynb`](notebooks/kaggle/02_lpr-train-plate-detector-stock.ipynb) | Trains the YOLO26 detectors on the merged dataset |
| [`02_lpr-train-plate-detector-paper.ipynb`](notebooks/kaggle/02_lpr-train-plate-detector-paper.ipynb) | Trains YOLOv8m with the paper setup (single-stage or two-stage) on the Hossain localization dataset |
| [`02_lpr-train-plate-detector-paper-v2.ipynb`](notebooks/kaggle/02_lpr-train-plate-detector-paper-v2.ipynb) | The same notebook with the outputs of the two-stage run |
| [`03_lpr-test-plate-detector.ipynb`](notebooks/kaggle/03_lpr-test-plate-detector.ipynb) | Evaluates all trained detectors on the same test sets and compares them with published results |

## Datasets

Combined into the private Kaggle dataset `bangla-licence-plates`. Local copies go in `applications/ai/data/bangladeshi-lpr/` and are excluded from Git.

| Dataset | Content | Folder |
|---|---|---|
| [Bangladeshi License Plate Recognition](https://www.kaggle.com/datasets/syednahinhossain/bangladeshi-license-plate-recognition-dataset) | Full frames with plate boxes; plate crops with character boxes | `bd-lpr/` |
| [Bangla License Plate (images and videos)](https://tinyurl.com/p7e8tszk) | Full frames of vehicles; traffic videos | `bd-lpr-dhaka/` |
| [BLPD](https://github.com/prosensarker4/BLPD) | Full frames with plate boxes; plate crops with character boxes (YOLO) | `bd-lpr-blpd/` |
| Roboflow Universe ([1](https://universe.roboflow.com/bangla-license-plate-detection-by-yolov8/bangla-license-plate-detection-dkqe3), [2](https://universe.roboflow.com/bangla-car-license-plate-detection/bangla-license-plate-detection-p3xyb)) | Full frames with plate boxes (YOLO) | `roboflow-*/` |

## Usage

1. In a Kaggle notebook, add the Kaggle dataset as an input and enable Internet. For the Roboflow datasets, add the secret `ROBOFLOW_API_KEY`.
2. Run `00_download_datasets.ipynb` with **Save & Run All**.
3. From the saved version's **Output**, create a **private** dataset named `Bangla Licence Plates`.

## Results

### Training

Validation results of each run's best checkpoint.

| Model | Training data | Train images | Epochs | Val images | Precision | Recall | mAP@0.5 | mAP@0.5:0.95 | Params | Inference (ms) |
|---|---|---|---|---|---|---|---|---|---|---|
| YOLO26n | Merged | 8,236 | 88 of 100 (early stop) | 831 | 0.977 | 0.960 | 0.971 | 0.731 | **2.4M** | **1.3** |
| YOLO26s | Merged | 8,236 | 100 | 831 | 0.978 | 0.953 | 0.971 | 0.737 | 9.5M | 2.5 |
| YOLO26m | Merged | 8,236 | 78 of 100 (early stop) | 831 | **0.979** | 0.946 | 0.969 | 0.736 | 20.4M | 5.3 |
| YOLOv8m (paper setup) | Hossain localization | 5,687 | 78 of 80 (early stop) | 277 | 0.973 | 0.979 | 0.988 | 0.754 | 25.8M | 4.0 |
| YOLOv8m two-stage, stage 1 | Hossain localization | 5,687 | 34 of 35 (early stop) | 277 | 0.952 | 0.979 | 0.986 | 0.717 | 25.8M | 8.2 |
| YOLOv8m two-stage, stage 2 (final) | Hossain localization | 5,687 | 45 | 277 | 0.960 | **0.984** | **0.990** | **0.776** | 25.8M | 7.9 |

### Test

**Paper test split** — 553 images, 398 plates (Hossain localization test split). Paper rows are the results published by Hasin et al. (2026), who do not report mAP.

| Model | Source | Precision | Recall | F1 | Accuracy | IoU | mAP@0.5 | mAP@0.5:0.95 |
|---|---|---|---|---|---|---|---|---|
| YOLOv8m | Paper | **99.93%** | 95.68% | 97.79% | 97.11% | 89.7% | – | – |
| YOLOv8m + multi-stage | Paper | 99.44% | 96.31% | **98.37%** | **97.83%** | **91.3%** | – | – |
| YOLOv8m | Ours | 91.03% | **99.50%** | 95.08% | 97.11% | 87.1% | 99.14% | **76.29%** |
| YOLOv8m + multi-stage | Ours | 94.51% | **99.50%** | 96.94% | 96.93% | 86.6% | **99.38%** | 76.26% |
| YOLO26n | Ours | 93.56% | 98.49% | 95.96% | 96.20% | 85.0% | 99.15% | 72.84% |
| YOLO26s | Ours | 95.33% | 97.49% | 96.40% | 96.20% | 84.8% | 98.97% | 74.28% |
| YOLO26m | Ours | 90.14% | 98.74% | 94.24% | 96.02% | 85.9% | 98.75% | 74.35% |

**Full test split** — 865 images, 742 plates (all three sources).

| Model | Precision | Recall | F1 | mAP@0.5 | mAP@0.5:0.95 | Inference (ms) |
|---|---|---|---|---|---|---|
| YOLOv8m | 94.6% | 85.3% | 89.7% | 91.0% | 61.0% | 20.9 |
| YOLOv8m + multi-stage | 95.1% | 87.2% | 91.0% | 91.2% | 58.7% | 20.4 |
| YOLO26n | **98.1%** | 95.4% | 96.7% | **98.1%** | 73.0% | **3.0** |
| YOLO26s | 97.8% | **96.6%** | **97.2%** | 98.0% | 73.7% | 7.7 |
| YOLO26m | 96.5% | 95.8% | 96.1% | 97.8% | **73.9%** | 23.7 |

Accuracy is the share of images in which every plate is detected with IoU > 0.7. IoU is the mean overlap between each plate and its best detection. Precision, recall, and F1 use IoU ≥ 0.5.

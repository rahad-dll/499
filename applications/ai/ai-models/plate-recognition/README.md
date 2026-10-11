# Bangla Licence Plate Recognition

Licence plate recognition in two stages:

1. **Plate detection** — a YOLOv8 detector locates licence plates in camera frames.
2. **Plate reading** — each detected plate is read into text.

## Notebooks

| Notebook | Description |
|---|---|
| [`00_download_datasets.ipynb`](notebooks/00_download_datasets.ipynb) | Collects and verifies the datasets on Kaggle for saving as the private dataset `bangla-licence-plates` |

## Datasets

| Dataset | Content | Folder |
|---|---|---|
| [Bangladeshi License Plate Recognition](https://www.kaggle.com/datasets/syednahinhossain/bangladeshi-license-plate-recognition-dataset) | Full frames with plate boxes; plate crops with character boxes | `bd-lpr/` |
| [Bangla License Plate (images and videos)](https://tinyurl.com/p7e8tszk) | Full frames of vehicles; traffic videos | `bd-lpr-dhaka/` |
| [BLPD](https://github.com/prosensarker4/BLPD) | Full frames with plate boxes; plate crops with character boxes (YOLO) | `bd-lpr-blpd/` |
| Roboflow Universe ([1](https://universe.roboflow.com/bangla-license-plate-detection-by-yolov8/bangla-license-plate-detection-dkqe3), [2](https://universe.roboflow.com/bangla-car-license-plate-detection/bangla-license-plate-detection-p3xyb)) | Full frames with plate boxes (YOLO) | `roboflow-*/` |

## Usage

1. In a Kaggle notebook, add the Kaggle dataset as an input and enable Internet. For the Roboflow datasets, add the secret `ROBOFLOW_API_KEY`.
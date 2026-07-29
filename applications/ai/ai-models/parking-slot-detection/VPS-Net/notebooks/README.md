# VPS-Net Training Notebooks

## Overview
Kaggle notebooks for training VPS-Net parking slot detection + occupancy classification.

## Notebooks

### vps_net_train.ipynb
Main training notebook for VPS-Net.

**Requirements:**
- ps2.0 dataset (download from https://cslinzhang.github.io/deepps/)

**Training Steps:**
1. Clone VPS-Net repo
2. Download ps2.0 dataset
3. Train CustomizedAlexNet for occupancy classification
4. (Optional) Train YOLOv3 for detection
5. Evaluate and save weights

**Output:**
- `weights/Customized.pth` - Best occupancy classifier
- `weights/Customized_final.pth` - Final occupancy classifier
- `training_history.png` - Training curves

## Dataset
- **ps2.0:** 12,165 AVM images
  - Training: 9,827 images
  - Testing: 2,338 images
  - Annotations: Marking points + occupancy labels

## Performance
- Expected accuracy: >99% on ps2.0 dataset

## Usage
1. Upload notebook to Kaggle
2. Enable GPU acceleration
3. Download ps2.0 dataset
4. Run all cells
5. Download trained weights

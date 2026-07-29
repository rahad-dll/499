# VPS-Net: Parking Slot Detection + Occupancy Classification

## Overview

Vacant Parking Slot Detection in the Around View Image Based on Deep Learning

- **Paper:** Sensors (MDPI) 2020
- **GitHub:** https://github.com/weili1457355863/VPS-Net
- **Stars:** 101
- **Task:** Detection + Occupancy (BOTH)

## Architecture

```
Stage 1: YOLOv3 → Detect slot locations (bounding boxes)
Stage 2: CustomizedAlexNet → Classify each slot (occupied/free)
```

## Dataset

- **ps2.0:** 12,165 AVM images (indoor + outdoor) - PRIMARY (Google Drive)
- **PSV:** 4,249 images - link dead
- **Annotations:** VPS-Net extra annotations (vacant slot labels included)

## Performance

- Precision: 99.63%
- Recall: 99.31%
- Inference: 20.5ms per frame

## Project Structure

```
VPS-Net/
├── repo/               # Original VPS-Net code
│   ├── models/
│   │   ├── Yolov3.py           # Detection network
│   │   ├── Customized.py       # Occupancy classifier
│   │   └── BasicModule.py      # Base class
│   ├── config/                 # YOLO config files
│   ├── utils/                  # Utility functions
│   ├── vps_detect/             # Detection utilities
│   ├── vps_net.py              # Main inference script
│   └── requirements.txt        # Dependencies
├── notebooks/          # Kaggle training notebooks
├── weights/            # Trained model weights
├── configs/            # Configuration files
└── README.md           # This file
```

## Training

1. Download ps2.0 dataset
2. Run `python vps_net.py --input_folder data/ps2.0/testing/all --save_files 1`

## References

- Li et al., "Vacant Parking Slot Detection in the Around View Image Based on Deep Learning," Sensors 2020
- Paper: https://www.mdpi.com/1424-8220/20/7/2138

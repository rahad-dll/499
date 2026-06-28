# A Real-Time Parking Space Occupancy Detection Using Deep Learning Model

## Citation and Metadata

- Full title: A Real-Time Parking Space Occupancy Detection Using Deep Learning Model
- Authors: Raktim Raihan Prova, Title Shinha, Anamika Basak Pew, Rashedur M. Rahman
- Year: 2022
- Institution: North South University, Bashundhara, Dhaka, Bangladesh
- Published in: 2022 IEEE International IOT, Electronics and Mechatronics Conference (IEMTRONICS)
- DOI: 10.1109/IEMTRONICS55184.2022.9795771

## Summary

This paper proposes a binary CNN-based classifier to detect parking slot occupancy in real time on low-powered edge hardware. It is written by a Dhaka-based team at North South University and is one of the few parking occupancy studies that includes real indoor and outdoor CCTV footage collected from Bangladeshi apartment complexes. The authors validate their model on PKLot and CNRPark+EXT and then test it against locally collected Dhaka footage, achieving 86.1 percent accuracy on indoor and 90.5 percent on outdoor Dhaka parking scenarios without any Dhaka-specific training data.

## Problem and Motivation

Traditional sensor-based parking detection systems require hardware installation at every slot and carry high maintenance costs. The authors argue that a camera-based approach using a single CCTV covering multiple slots is more scalable and cost-effective. The challenge is making such a model robust to obstacles including shadow, low light, human interference, and adjacent vehicle occlusion — all of which are common in Bangladeshi parking environments.

## Datasets

The paper uses three data sources.

**PKLot** contains roughly 695,899 labeled patches from three parking lots in Brazil. Images are organized by weather condition and capture date. The authors split PKLot into PKLot2Days (training, 69,058 images) and PKLotNot2Days (testing, 626,841 images) to prevent data leakage from same-day near-duplicate frames.

| Subset | Unoccupied | Occupied | Total |
|--------|-----------|---------|-------|
| PKLot2Days | 27,314 | 41,744 | 69,058 |
| PKLotNot2Days | 310,466 | 316,375 | 626,841 |
| PKLot total | 337,780 | 358,119 | 695,899 |

**CNRPark+EXT** contains roughly 12,584 labeled patches from nine cameras in Italy. The authors split it into CNRPark-Odd and CNRPark-Even by parking lot number to create non-overlapping train and test subsets.

| Subset | Unoccupied | Occupied | Total |
|--------|-----------|---------|-------|
| CNRPark-Odd | 2,201 | 3,970 | 6,171 |
| CNRPark-Even | 1,980 | 4,433 | 6,413 |
| CNRPark total | 4,181 | 8,403 | 12,584 |

**Dhaka Indoor and Outdoor dataset** is collected by the authors themselves from CCTV cameras installed in Dhaka apartments. 60 minutes of footage at 1280x720 at 30fps. One frame extracted every 5 seconds (approximately every 150 frames). Each frame is cropped into per-slot patches using manually defined masks. Three parking slots per camera. Labeled manually.

| Dataset | Unoccupied | Occupied | Total |
|---------|-----------|---------|-------|
| Indoor | 310 | 230 | 540 |
| Outdoor | 312 | 246 | 558 |

## Methodology

### Patch Preparation

Full parking lot images are not fed directly to the model. A mask is defined for each parking space that crops the full image into individual patches of 150x150 pixels, one patch per slot. These patches are then resized to 224x224 RGB for model input. Each patch is labeled 0 for unoccupied and 1 for occupied. This patch-per-slot approach is consistent with both PKLot and CNRPark dataset conventions.

## Strengths

The paper is directly relevant to the Bangladeshi deployment context. The authors collected real CCTV footage from Dhaka apartment parking lots and tested their model on it, which no other reviewed paper does. The indoor dataset specifically covers low-light conditions, shadow, human interference, and adjacent vehicle occlusion — all conditions present in Bangladeshi underground and covered parking structures.

The day-based splitting of PKLot is a sound methodological choice that prevents inflated accuracy from near-duplicate frames captured minutes apart on the same day.

The model runs on a Raspberry Pi 4, which confirms edge deployment feasibility at the hardware level the project targets.

The cross-dataset experiment is the most important result: training only on PKLot and CNRPark achieves 86 to 90 percent on Dhaka footage. This validates using those two benchmark datasets as pretraining before fine-tuning on locally collected data.

## Limitations

The Dhaka dataset is very small: 540 indoor and 558 outdoor images total. This is insufficient to draw strong conclusions about generalization. The model may have overfit to the specific camera angles and lighting of those two locations.

The paper does not report inference speed in FPS on the Raspberry Pi, only confirming that it is operable. No specific latency figure is given.

The mask definition for each new parking lot is manual and case-specific. This is the main scalability bottleneck: every new camera deployment requires a human to define slot boundaries before the system can classify occupancy.

The authors do not explore fine-tuning on Dhaka data. The 86 percent indoor accuracy may improve significantly with even a few hundred locally labeled images added to the training set.


# CNRPark+EXT — Parking Lot Occupancy Dataset

## Overview

CNRPark+EXT is a dataset for visual occupancy detection of parking lots. It was built by the Visual and Multimedia Lab at CNR (Italy's National Research Council). The dataset is notable for its multi-camera design and weather diversity, making it a stronger test for model generalization across different viewpoints.

- Paper: Deep Learning for Decentralized Parking Lot Occupancy Detection
- Authors: Giuseppe Amato, Fabio Carrara, Fabrizio Falchi, Claudio Gennaro, Carlo Meghini, Claudio Vairo
- Year: 2017
- Source: http://cnrpark.it
- Kaggle mirror: https://www.kaggle.com/datasets/ddsshubham/cnrpark-ext
- Paper link: https://www.sciencedirect.com/science/article/pii/S0957417416304031

## Dataset Statistics

| Property | Value |
|----------|-------|
| Total labeled patches | ~150,000 |
| Parking spaces covered | 164 |
| Cameras | 9 (distinct angles and positions) |
| Capture period | November 2015 to February 2016 |
| Weather conditions | Sunny, overcast, rainy, foggy |
| Time of day | Daytime only |
| Labels | Free (empty), Busy (occupied) |
| Image format | JPEG patches (one per parking space per frame) |

## Dataset Variants

| Variant | Description |
|---------|-------------|
| CNRPark | Original dataset — 2 cameras, ~12,000 patches |
| CNRPark-EXT | Extended version — 9 cameras, ~150,000 patches |

Use CNRPark-EXT for training. The original CNRPark is included for comparison only.

## Folder Structure After Download

```
CNRPark/
    data/
        CNRPark-EXT/
            LABELS/
                camera1/
                camera2/
                ...
                camera9/
            splits/
                train.txt
                val.txt
                test.txt
    README.md
    download.py
```

Each camera folder contains JPEG patches labeled as free or busy. The splits directory provides the official train/validation/test file lists used in the original paper.

## Key Differences from PKLot

| Aspect | PKLot | CNRPark+EXT |
|--------|-------|-------------|
| Cameras | 3 fixed views | 9 distinct angles |
| Patches | 695,899 | ~150,000 |
| Country | Brazil | Italy |
| Season | Summer only | Winter (Nov-Feb) |
| Generalization test | Within-lot | Cross-camera |

CNRPark+EXT is the better choice for testing whether a model generalizes across different camera angles, which is the scenario when deploying across multiple parking lots with varying CCTV positions.

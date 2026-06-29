# PKLot — Parking Lot Dataset

## Overview

PKLot is a benchmark dataset for parking space occupancy classification. It was introduced by Almeida et al. (2015) from the Federal University of Parana (UFPR), Brazil. It is the most widely used public dataset for training and evaluating parking occupancy detection models.

- Paper: PKLot — A Robust Dataset for Parking Lot Classification
- Authors: Paulo R. L. de Almeida, Luiz S. Oliveira, Jeovane S. Alves, Eunelson J. Silva, Alessandro L. Koerich
- Year: 2015
- Source: https://web.inf.ufpr.br/vri/databases/parking-lot-database/
- Hugging Face mirror: https://huggingface.co/datasets/Voxel51/PKLot

## Dataset Statistics

| Property | Value |
|----------|-------|
| Total full images | 12,417 |
| Total space patches | 695,899 |
| Parking lots | 3 (PUCPR, UFPR04, UFPR05) |
| Camera views | 3 distinct elevated angles |
| Capture interval | Every 5 minutes during daylight |
| Capture duration | ~30 days per lot |
| Weather conditions | Sunny, overcast, rainy |
| Labels | Occupied, Empty |
| Annotation format | XML per image (bounding boxes + label) |

## Parking Lot Details

| Lot | Location | Spaces | Notes |
|-----|----------|--------|-------|
| PUCPR | Pontifical Catholic University of Parana | 100 | Outdoor surface lot |
| UFPR04 | Federal University of Parana (view 04) | 28 | Outdoor surface lot |
| UFPR05 | Federal University of Parana (view 05) | 45 | Outdoor surface lot |

## Folder Structure After Download

```
PKLot/
    data/
        PKLot/
            PUCPR/
                Cloudy/
                Rainy/
                Sunny/
            UFPR04/
                Cloudy/
                Rainy/
                Sunny/
            UFPR05/
                Cloudy/
                Rainy/
                Sunny/
    README.md
    download.py
```

Each weather subfolder contains full parking lot images. Each image has a corresponding XML annotation file listing individual space bounding boxes and their occupied/empty status.

# parking-occupancy-merged

Merged parking slot occupancy dataset combining PKLot and CNRPark+EXT, prepared for binary image classification training.

- Kaggle: https://www.kaggle.com/datasets/raahad/parking-occupancy-merged

## Dataset Statistics

| Split | Occupied | Empty | Total |
|-------|---------|-------|-------|
| train | 287,970 | 336,589 | 624,559 |
| val | 110,841 | 73,591 | 184,432 |
| **Total** | **398,811** | **410,180** | **808,991** |

## Folder Structure

```
parking-occupancy-merged/
    train/
        occupied/   <- pklot_*.jpg + cnr_*.jpg
        empty/      <- pklot_*.jpg + cnr_*.jpg
    val/
        occupied/
        empty/
```

Folder name = label. Load directly with `torchvision.datasets.ImageFolder`.

## Sources

**PKLot** (695,851 patches)
- Source: http://www.inf.ufpr.br/vri/databases/PKLot.tar.gz
- Lots: PUCPR, UFPR04, UFPR05
- Weather: Sunny, Overcast, Rainy
- Split: PUCPR + UFPR04 → train, UFPR05 → val (lot-based, no day leakage)
- Reference: de Almeida et al., Expert Systems with Applications, 2015

**CNRPark+EXT** (113,140 patches)
- Source: https://www.kaggle.com/datasets/ddsshubham/cnrpark-ext
- Cameras: 9 distinct angles
- Weather: Overcast, Rainy, Sunny
- Split: official LABELS/train.txt and LABELS/val.txt
- Reference: Amato et al., Expert Systems with Applications, 2017

## Split Strategy

PKLot uses a lot-based split rather than random splitting. Images from the same parking lot on the same day are captured every 5 minutes and are near-identical — a random split would cause data leakage. Training on PUCPR + UFPR04 and validating on UFPR05 forces the model to generalize to an unseen camera angle, which gives a more honest validation score.

CNRPark uses the official splits provided by the dataset authors.

## Usage

```python
from torchvision import datasets, transforms
from torch.utils.data import DataLoader

transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225]),
])

train_dataset = datasets.ImageFolder("train", transform=transform)
val_dataset   = datasets.ImageFolder("val",   transform=transform)

print(train_dataset.classes)        # ['empty', 'occupied']
print(train_dataset.class_to_idx)   # {'empty': 0, 'occupied': 1}
```

## Download

```
pip install kagglehub
python download.py
```

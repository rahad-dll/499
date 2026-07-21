# Parking Occupancy — MobileNetV2

Given a cropped image of a single parking slot, the model says whether it is empty or occupied. One input image, one output label.

---

## Why MobileNetV2

A custom CNN from scratch needs to learn low-level visual features entirely from the training data. MobileNetV2 arrives with those features already learned from 1.28 million ImageNet images. We only need to teach it the difference between an empty and occupied slot on top of what it already knows.

It is also lightweight — designed to run on phones and small devices. That matters because inference runs on a Raspberry Pi 4 or Pi 5 at the parking site.

Other papers using custom CNNs on the same dataset get around 93% accuracy. Pretrained MobileNet variants consistently reach 97–98%. The gap is transfer learning, not architecture.

---

## Dataset

Merged dataset from Kaggle combining PKLot and CNRPark+EXT.

- PKLot: 695,851 images from 3 Brazilian lots across sunny, overcast, and rainy conditions
- CNRPark+EXT: 113,140 images from 9 Italian camera angles

Total ~808,000 images in `train/` and `val/` folders. Folder name is the label.

Validation uses UFPR05 — an entirely different lot not seen during training. Stricter than a date-based split.

Dataset: https://www.kaggle.com/datasets/raahad/parking-occupancy-merged

---

## Model Structure

```
input (224x224 RGB)
  -> MobileNetV2 feature extractor   (locked in phase 1, unlocked in phase 2)
  -> AdaptiveAvgPool2d
  -> Dropout(0.2)
  -> Linear(1280 -> 2)
  -> Softmax -> argmax -> {empty, occupied}
```

Input normalized with ImageNet stats: mean `[0.485, 0.456, 0.406]`, std `[0.229, 0.224, 0.225]`.

---

## Training

Two phases, each in a separate Kaggle notebook.

### Phase 1 — Train the head only

All MobileNetV2 layers frozen. Only the new 2-class output head trains. Gets the classifier to a stable starting point without touching pretrained weights.

| Setting | Value |
|---|---|
| Batch size | 128 |
| Learning rate | 1e-3 |
| Epochs | 5 |
| Optimizer | Adam |
| GPU | Single Tesla T4 |

Results (val on UFPR05):

| Epoch | Train Loss | Train Acc | Val Loss | Val Acc |
|---|---|---|---|---|
| 1 | 0.0466 | 0.9848 | 0.1094 | 0.9631 |
| 2 | 0.0421 | 0.9862 | 0.0916 | 0.9698 |
| 3 | 0.0423 | 0.9861 | 0.1057 | 0.9655 |
| 4 | 0.0414 | 0.9864 | 0.1178 | 0.9624 |
| 5 | 0.0416 | 0.9866 | 0.0803 | **0.9728** |

Best: epoch 5, val acc **0.9728**. Weights saved as `phase1_weights.pth`.

### Phase 2 — Full fine-tune

All layers unlocked. Trained at a much lower learning rate so the backbone adapts to parking patterns without overwriting ImageNet features. Mixed precision (AMP float16) and gradient checkpointing used to keep RAM flat and speed up training.

| Setting | Value |
|---|---|
| Batch size | 128 |
| Learning rate | 1e-5 |
| Epochs | 10 |
| Optimizer | Adam |
| AMP | float16 |
| Gradient checkpointing | 2-segment backbone split |

Results (val on UFPR05):

| Epoch | Train Loss | Train Acc | Val Loss | Val Acc |
|---|---|---|---|---|
| 1  | 0.0134 | 0.9966 | 0.0560 | 0.9816 |
| 2  | 0.0074 | 0.9984 | 0.0253 | 0.9915 |
| 3  | 0.0056 | 0.9987 | 0.0314 | 0.9900 |
| 4  | 0.0046 | 0.9990 | 0.0285 | 0.9910 |
| 5  | 0.0040 | 0.9991 | 0.0403 | 0.9870 |
| 6  | 0.0034 | 0.9992 | 0.0374 | 0.9886 |
| 7  | 0.0032 | 0.9992 | 0.0868 | 0.9729 |
| 8  | 0.0027 | 0.9993 | 0.0385 | 0.9897 |
| 9  | 0.0024 | 0.9993 | 0.0306 | **0.9918** |
| 10 | 0.0022 | 0.9994 | 0.0378 | 0.9893 |

Best: epoch 9, val acc **0.9918**. Weights saved as `phase2_weights.pth`.

Phase 2 improves on phase 1 by +1.90 percentage points on the held-out lot.

---

## Weights

| File | Phase | Val Acc | Status |
|---|---|---|---|
| `weights/phase1_weights.pth` | Head-only | 0.9728 | archived |
| `weights/phase2_weights.pth` | Full fine-tune | 0.9918 | **active** |

The inference service uses `phase2_weights.pth`.

---

## Local Fine-Tuning

Prova et al. (NSU 2022) showed that a model trained only on international data transfers to Bangladeshi footage at 86–90% accuracy with no local training. Phase 2 already exceeds that on the international benchmark. Once local footage is collected and annotated, a third fine-tuning pass on the combined dataset is expected to close the remaining distribution gap for Dhaka conditions.

---

## References

- Prova et al., IEEE IEMTRONICS 2022, DOI 10.1109/IEMTRONICS55184.2022.9795771
- PKLot: de Almeida et al., Expert Systems with Applications, 2015
- CNRPark+EXT: Amato et al., Expert Systems with Applications, 2017
- MobileNetV2: Sandler et al., CVPR 2018
- Improved MobileNetV3 parking: Yuldashev et al., Sensors 2023, DOI 10.3390/s23177642

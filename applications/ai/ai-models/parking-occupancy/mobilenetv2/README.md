# Parking Occupancy - MobileNetV2

The goal here is simple. Given a cropped image of a single parking slot, the model says whether it is empty or occupied. That is it. One input image, one output label.

We are using MobileNetV2 for this. It was originally trained on ImageNet which means it already knows how to look at images and pick out useful patterns like edges, shapes, and textures. We take that knowledge and retrain the last layer to understand parking slots instead of the 1000 ImageNet categories.

---

## Why MobileNetV2

A custom CNN built from scratch needs a lot of data and time to learn even basic visual patterns. MobileNetV2 skips all of that because it already learned those patterns from 1.28 million images. We just need to teach it what an occupied versus empty parking slot looks like on top of what it already knows.

It is also a lightweight model designed to run on phones and small devices. That matters because we plan to run inference on a Raspberry Pi 4 or Pi 5 at the parking site.

Other papers tried custom CNNs on the same dataset and got around 93% accuracy. Papers using pretrained MobileNet variants got 97-98%. The difference is not the architecture, it is the pretrained weights.

---

## Dataset

We use the merged dataset from Kaggle that combines PKLot and CNRPark+EXT.

- PKLot: 695,851 images from 3 parking lots in Brazil across sunny, overcast, and rainy conditions
- CNRPark+EXT: 113,140 images from 9 camera angles in Italy

Total is around 808,000 images split into train and val folders. The folder name is the label so empty images go in the empty folder and occupied images go in the occupied folder.

The validation set uses UFPR05, which is an entirely different parking lot from the training lots. The model has never seen that camera angle during training. This is a stricter test than just splitting by date.

Dataset link: https://www.kaggle.com/datasets/raahad/parking-occupancy-merged

---

## Training - Two Phases

Training is split into two notebooks on purpose.

**Phase 1 - Train the head only** (phase1_train_head.ipynb)

We lock all the MobileNetV2 layers and only train the new 2-class output layer we added. This gets the classifier to a reasonable starting point without touching the pretrained weights.

- Batch size: 128
- Learning rate: 1e-3
- Epochs: 5
- Optimizer: Adam
- Single GPU (no DataParallel)
- `num_workers=0` (no multiprocessing to avoid RAM growth on Kaggle)

Results (merged PKLot + CNRPark, val on UFPR05):

| Epoch | Train Loss | Train Acc | Val Loss | Val Acc |
|-------|-----------|-----------|----------|---------|
| 1     | 0.0466    | 0.9848    | 0.1094   | 0.9631  |
| 2     | 0.0421    | 0.9862    | 0.0916   | 0.9698  |
| 3     | 0.0423    | 0.9861    | 0.1057   | 0.9655  |
| 4     | 0.0414    | 0.9864    | 0.1178   | 0.9624  |
| 5     | 0.0416    | 0.9866    | 0.0803   | **0.9728** |

Best: epoch 5, val accuracy 0.9728.

**Phase 2 - Fine-tune everything** (phase2_finetune.ipynb)

We load the phase 1 weights, unlock all layers, and train the whole network at a much lower learning rate. The low learning rate is important, if you use the same rate as phase 1 you will overwrite the useful patterns the backbone learned. Runs for 10 epochs. Saves the best checkpoint based on validation accuracy, not the final epoch.

---

## Model Structure

Input image of 224x224 goes into the MobileNetV2 feature extractor. That produces a 1280-dimensional vector. Then it goes through dropout to reduce overfitting, then a linear layer that maps 1280 values down to 2 output scores. The higher score wins and gives the final prediction.

```
input (224x224 image)
  -> MobileNetV2 feature extractor   (locked in phase 1, unlocked in phase 2)
  -> AdaptiveAvgPool2d               (collapses the spatial map to a fixed vector)
  -> Dropout 0.2                     (randomly drops 20% of values prevent overfitting)
  -> Linear 1280 -> 2                (the actual classifier we added)
  -> Softmax                         (converts scores to probabilities that add up to 1)
  -> argmax -> empty or occupied
```

---

## Local Fine-Tuning

After training on PKLot and CNRPark, a paper from North South University showed that the model transfers to Bangladeshi parking footage and gets 86-90% accuracy with no local training at all. 

We plan to collect local footage and fine-tune on it to push that number higher. That data collection has not happened yet so this step is pending.

---

## References

- Prova et al., IEEE IEMTRONICS 2022, DOI 10.1109/IEMTRONICS55184.2022.9795771
- PKLot dataset: de Almeida et al., Expert Systems with Applications, 2015
- CNRPark+EXT: Amato et al., Expert Systems with Applications, 2017
- MobileNetV2: Sandler et al., CVPR 2018

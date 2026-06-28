# A Robust Deep Learning Framework for Bangla License Plate Recognition Using YOLO and Vision-Language OCR

## Citation and Metadata

- Full title: A Robust Deep Learning Framework for Bangla License Plate Recognition Using YOLO and Vision-Language OCR
- Authors: Nayeb Hasin, Md. Arafath Rahman Nishat, Mainul Islam, Khandakar Shakib Al Hasan, Asif Newaz
- Year: 2026 (May)
- Institution: Islamic University of Technology (IUT), BUET, Bangladesh
- ArXiv ID: 2603.10267v2
- Link: https://arxiv.org/abs/2603.10267

## Summary

This paper presents the current state-of-the-art for Bangla automatic license plate recognition. It achieves 97.83 percent localization accuracy and a character error rate of 13.23 percent, which is a substantial improvement over earlier work. The system combines a two-stage YOLOv8m training strategy with a Vision Transformer encoder and BanglaBERT decoder for OCR. The training dataset covers all 64 districts of Bangladesh, and the system is validated on external toll booth footage captured under low-light and adverse-weather conditions.

## Problem and Motivation

Earlier Bangla ALPR systems suffer from limited accuracy, small datasets, and lack of geographic diversity. The specific challenges include Bangla script complexity, a large character class space of 102 symbols, plate format variation across all districts, and extreme lighting conditions caused by the tropical environment. The authors argue that addressing these challenges requires a system that is both architecturally strong in detection and capable of language-aware character recognition, rather than relying on a generic OCR model.

## Methodology

### Plate Localization

The paper evaluates six architectures: U-Net, YOLOv5m, YOLOv7m, YOLOv8m, YOLOv9m, and YOLOv11m. YOLOv8m is selected as the base model for its balance of accuracy and practical usability.

The training applies a two-stage adaptive strategy rather than a single training run.

Stage 1 runs for 35 epochs with aggressive learning rates. It focuses on feature learning and applies spatial augmentation: rotation up to plus or minus 8 degrees, translation up to 15 percent, scale down to 0.7x, and 100 percent mosaic augmentation.

Stage 2 runs for 45 to 55 epochs with adaptive learning rates. It focuses on fine-tuning and switches to photometric augmentation: hue variation of plus or minus 2 percent, saturation variation of plus or minus 90 percent, and brightness variation of plus or minus 70 percent.

The training also uses progressive layer unfreezing. Epochs 1 through 20 unfreeze 12 layers, epochs 21 through 40 unfreeze 8 layers, and epochs 41 onward unfreeze 4 layers. This approach prevents catastrophic forgetting and allows the model to adapt gradually.

The localization dataset contains 6,517 images: 5,687 for training, 277 for validation, and 553 for testing. It covers all regions of Bangladesh with YOLO-compatible bounding box annotations.

Localization results across models:

| Model | Accuracy | Precision | Recall | F1 Score | IoU |
|-------|----------|-----------|--------|----------|-----|
| U-Net | 91.43% | 93.19% | 89.71% | 91.41% | 82.1% |
| YOLOv5m | 94.19% | 96.58% | 92.01% | 94.25% | 84.9% |
| YOLOv7m | 95.76% | 98.12% | 93.98% | 96.03% | 87.2% |
| YOLOv8m | 97.11% | 99.93% | 95.68% | 97.79% | 89.7% |
| YOLOv8m Multi-Stage | 97.83% | 99.87% | 96.21% | 97.53% | 91.3% |

### Character Recognition

The OCR stage uses a vision-encoder-decoder architecture. A ViT-Base encoder extracts visual features from the cropped plate image. A Transformer decoder converts those features into a text sequence. A BanglaBERT tokenizer processes the output to handle Bangla script correctly. Beam search with a width of 3 handles ambiguous characters by ranking candidates probabilistically. The model also supports n-gram repetition, which is necessary for Bangla plate formats such as "৩৩ঢ ১০ ১০" where digits repeat.

Training uses AdamW optimizer with a learning rate of 5e-5, batch size of 6, mixed precision fp16, and 7,800 training iterations.

The OCR training dataset is the MMHQ Bangla License Plate Dataset: 13,629 images covering all 64 districts of Bangladesh, with 102 character classes including digits zero through nine in Bangla, the full Bengali alphabet, and the Metro designation. The split is 12,680 training images, 564 validation, and 385 test images.

OCR model comparison:

| Model | Character Error Rate | Word Error Rate |
|-------|---------------------|-----------------|
| ViT + BanglaBERT | 13.23% | 10.68% |
| TrOCR-Base | 13.63% | 15.83% |
| ViT + mBART | 44.38% | 9.35% |

The external validation dataset contains 276 images taken from toll booth CCTV footage under low-light, night, dusk, and weather-degraded conditions. This is the closest available analog to parking lot CCTV feeds.

## Key Results

The two-stage training strategy raises localization accuracy from 97.11 percent to 97.83 percent compared to standard YOLOv8m fine-tuning, a gain of 0.72 percentage points. More importantly, the ViT and BanglaBERT OCR combination achieves 13.23 percent CER compared to 60.8 percent F1 reported in the 2021 baseline paper. That is a substantial gap in practical recognition quality.

Geographic robustness is verified through training on the 64-district dataset and testing on external toll booth data that was not part of training. The system handles a lighting range from 0.1 lux to 100,000 lux, which covers nighttime parking scenarios.

## Strengths

The training strategy is the paper's most transferable contribution. Phase-aware augmentation and progressive layer unfreezing together produce a more robust model than vanilla fine-tuning, and both techniques are applicable to other detection tasks such as parking slot occupancy detection.

The BanglaBERT integration is significant because it treats OCR as a language-aware task rather than a purely visual one. That distinction matters for Bangla because character sequences follow script-specific patterns that a language model can exploit.

The 64-district training coverage means the system has seen plate formats from across the entire country, which reduces the risk of failures on plates from outside Dhaka.

The external validation on toll booth footage provides evidence of real-world robustness under conditions similar to what a parking lot camera would capture.

## Limitations

The paper does not report inference time or frame rate. This is the most important missing piece for deployment planning. Without knowing whether the model runs at 5 FPS or 25 FPS on a given device, it is not possible to decide between edge and cloud deployment without running independent benchmarks.

GPU requirements are not specified, so the feasibility of Raspberry Pi or NVIDIA Jetson deployment is unknown. There is also no comparison with commercial systems such as OpenALPR or Google Vision API, which would help calibrate how much accuracy the team gains by using this system instead of a ready-made product.

No parking lot deployment results are reported. Toll booth footage is a reasonable proxy, but parking lots present different challenges such as vehicles parked at angles, partially obscured plates, and camera positions that differ from highway toll configurations.


# Real-time Bangla License Plate Recognition System for Low Resource Video-based Applications

## Citation and Metadata

- Full title: Real-time Bangla License Plate Recognition System for Low Resource Video-based Applications
- Authors: Alif Ashrafee, Akib Mohammed Khan, Mohammad Sabik Irbaz, MD Abdullah Al Nasim
- Year: 2021 (version 3)
- Institution: Islamic University of Technology (Dhaka), Pioneer Alpha Ltd.
- ArXiv ID: 2108.08339v3
- Link: https://arxiv.org/abs/2108.08339

## Summary

This paper is the first to release publicly available Bangla license plate datasets in both image and video form. It proposes a lightweight two-stage detection pipeline designed to run in real time on low-cost CPU hardware. The system reaches 27.2 FPS on an Intel Core i5-7200U without any GPU, which is a concrete baseline for practical deployment. The authors address a real gap: most existing ALPR systems assume western script and mid-range or high-end hardware, neither of which holds in a Bangladeshi context.

## Problem and Motivation

Bangla automatic license plate recognition remains less developed than systems built for Latin-script plates. Practical deployments in Bangladesh face additional constraints: parking management systems, toll collection, and vehicle tracking often run on commodity hardware with no GPU budget. The system must therefore balance recognition accuracy with real-time speed under those constraints.

The authors explicitly target applications such as parking management, toll collection, vehicle tracking, and guest vehicle management, which makes this paper directly relevant to systems operating in a Dhaka urban environment.

## Methodology

The pipeline runs in two stages with a post-processing step.

Stage 1 uses a Haar-cascade classifier as a wake-up filter. Its job is to quickly discard frames that contain no license plate, so the heavier model is never called unnecessarily.

Stage 2 applies a MobileNet SSDv2 detection model only on frames that passed the first filter. This produces higher-precision bounding boxes around plate regions.

The final step sends the cropped plate region to a Vision API for OCR and character recognition.

Two additional design decisions matter for video-based use. First, the system applies temporal frame separation to distinguish between multiple vehicles that appear in the same clip. Second, it keeps the top three most confident detection frames per vehicle rather than processing every frame. These two choices reduce noise and improve the quality of the final recognized text.

The image dataset contains 1,000 labeled Bangla license plate images in BRTA format, split 80 percent for training and 20 percent for validation, with annotations in YOLO format. The video dataset contains 79 video clips covering 98 unique license plates captured in real Dhaka traffic. This is the first publicly released Bangla video dataset for license plate recognition.

## Key Results

| Metric | Value |
|--------|-------|
| Training AP at IoU 0.5 | 86% |
| Video detection rate | 82.7% |
| OCR F1 score | 60.8% |
| Processing speed | 27.2 FPS |
| Hardware | Intel Core i5-7200U, single-threaded CPU, no GPU |

The detection rate of 82.7 percent on real video clips demonstrates that the pipeline is viable for continuous surveillance settings. The OCR F1 score of 60.8 percent is weaker and reflects both the difficulty of Bangla script and the loss of plate detail caused by resizing plates to 480 by 480 pixels before recognition.

## Strengths

The paper's primary contribution is practical. It does not present a theoretical model but delivers a working system under realistic constraints. The 27.2 FPS throughput on a CPU means the system can be deployed without specialized hardware, which reduces cost significantly in a parking or toll environment.

The release of the first Bangla video dataset is also a lasting contribution. Future work can use those 79 clips as a concrete benchmark rather than collecting data from scratch.

The temporal frame separation and best-frame selection logic are sound engineering decisions that make video-based recognition more reliable than naive frame-by-frame processing.

The authors also report that the system is wrapped in a Flask web application, which means it is ready for integration without requiring major engineering work.

## Limitations

The OCR accuracy at 60.8 percent F1 is the most significant weakness. It creates errors in the final recognized plate string, which is problematic for billing and access control. The reliance on a Vision API for OCR introduces external latency and recurring costs, and it requires constant internet connectivity.

The image dataset of 1,000 images and the video dataset of 79 clips are small relative to the diversity of real-world plate conditions across different Dhaka locations, lighting levels, and camera angles. The 480 by 480 resizing also discards detail that could help the OCR stage.

The evaluation was conducted only in Dhaka City, so generalization to other regions or plate formats is not validated.


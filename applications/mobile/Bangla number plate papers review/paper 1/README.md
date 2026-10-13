# Bangladeshi License Plate Recognition using YOLOv8 and Roboflow

This repository contains the implementation, training scripts, and evaluation pipelines for the paper:

**"Enhancing Bangladeshi License Plate Recognition: A YOLOv8 Approach with Roboflow Integration for Accuracy and Speed Optimization"**  
*Published in IJRASET, Volume 12 Issue V, May 2024.*  
DOI: [10.22214/ijraset.2024.61520](https://doi.org/10.22214/ijraset.2024.61520)

---

## Overview

Automatic License Plate Recognition (ALPR) for Bangladeshi vehicles faces unique challenges due to the complex Bangla script, varied plate designs, and low-resolution CCTV footage. This project presents a robust and efficient ALPR system using **YOLOv8** for real-time license plate detection, integrated with **Roboflow** for dataset management, annotation, and augmentation.

The model is specifically optimized to handle:
- Corner-angle detections
- Low-resolution and obscured plates
- Multiple plates in cluttered scenes (e.g., buses with banners)

---

## Key Contributions

1. **Automated Dataset Pipeline:** Leveraged Roboflow API for downloading, preprocessing, and augmenting the dataset directly in the cloud.
2. **YOLOv8 Training:** Fine-tuned YOLOv8 with dual-GPU support and Automatic Mixed Precision (AMP) for fast and stable convergence.
3. **Robust Detection:** Achieved high accuracy across diverse real-world conditions, including broken plates, dust, and multi-plate scenarios.

---

## Performance Metrics

The model was trained for 30 epochs on a dataset of **10,412 training images** and **2,968 validation images**. Final evaluation on the validation set (`best.pt`) yielded:

| Metric | Value |
|---|---:|
| **mAP@50** | `0.988` |
| **mAP@50-95** | `0.784` |
| **Precision** | `0.971` |
| **Recall** | `0.980` |

*Note: These metrics are from the fine-tuned model on the `Bangladeshi-license-plate-2` dataset (Roboflow version 2).*

---

## Repository Structure

```text
Paper-1-YOLOv8-Roboflow/
├── notebooks/
│   └── train_and_inference.ipynb   # Complete Kaggle Notebook (training + inference)
├── weights/
│   └── best.pt                     # Trained YOLOv8 model weights
├── paper/
│   └── IJRASET2024_61520.pdf       # Published research paper (PDF)
├── results/
│   └── (optional) evaluation logs or metrics
└── README.md                       # Project documentation
```

---

## Installation & Setup

Ensure you have Python 3.8+ and the required libraries:

```bash
pip install ultralytics roboflow easyocr opencv-python matplotlib
```

For GPU training, install PyTorch with CUDA support from [pytorch.org](https://pytorch.org/).

---

## Dataset Preparation (Roboflow)

The dataset is hosted on Roboflow and can be downloaded programmatically:

```python
from roboflow import Roboflow

rf = Roboflow(api_key="YOUR_API_KEY")
project = rf.workspace("masudvision").project("bangladeshi-license-plate-oyj2h")
version = project.version(2)
dataset = version.download("yolov8")
```

This downloads the dataset in YOLOv8 format and creates `train`, `valid`, and `test` splits.

---

## Training the YOLOv8 Model

Use the following code to fine-tune YOLOv8 on the Bangladeshi license plate dataset:

```python
import os
from ultralytics import YOLO

# Path to the downloaded dataset
dataset_path = dataset.location
yaml_path = os.path.join(dataset_path, 'data.yaml')

# Load pretrained YOLOv8n model
model = YOLO('yolov8n.pt')

# Train the model
results = model.train(
    data=yaml_path,
    epochs=30,
    imgsz=640,
    batch=32,        # Safe batch size for dual GPU
    workers=2,
    device='0,1',    # Use both GPUs if available
    amp=True         # Mixed precision training
)
```

The training script automatically saves the best model to `runs/detect/train/weights/best.pt`.

---

## Inference & Detection

After training, load the fine-tuned model and run predictions:

```python
from ultralytics import YOLO
from PIL import Image

# Load your trained model
model = YOLO('weights/best.pt')

# Run prediction on a test image
results = model.predict(source='path_to_image.jpg', conf=0.5, save=True)

# Display the result
result_image_path = results[0].save_dir + '/' + os.path.basename('path_to_image.jpg')
Image.open(result_image_path).show()
```

The model outputs bounding boxes around detected license plates. For character recognition (OCR), the paper integrates EasyOCR, but this repository currently provides the **detection** module only.

---

## Notes on Character Recognition

The complete system in the paper uses **EasyOCR** to read Bangla characters from the detected plates. While the provided weights are for detection, you can integrate EasyOCR as follows:

```python
import easyocr

reader = easyocr.Reader(['bn', 'en'])
result = reader.readtext('cropped_plate.jpg')
```

This will return the recognized text from the license plate.

---

## Uploading the Paper

Place the published paper PDF inside the `paper/` folder. The recommended filename is `IJRASET2024_61520.pdf` or any descriptive name. This keeps the repository organized and provides direct access to the research article.

---

## References

1. Ahamed Istiak, Wang Feng. "Enhancing Bangladeshi License Plate Recognition: A YOLOv8 Approach with Roboflow Integration for Accuracy and Speed Optimization." *IJRASET*, vol. 12, no. V, May 2024. DOI: [10.22214/ijraset.2024.61520](https://doi.org/10.22214/ijraset.2024.61520)
2. Ultralytics YOLOv8: [https://github.com/ultralytics/ultralytics](https://github.com/ultralytics/ultralytics)
3. Roboflow: [https://roboflow.com](https://roboflow.com)
4. EasyOCR: [https://github.com/JaidedAI/EasyOCR](https://github.com/JaidedAI/EasyOCR)

---

## License

This project is released under the **CC BY 4.0** license, as per the original paper. You are free to share and adapt with attribution.

---

## Acknowledgements

- The authors of the paper for their valuable research.
- Roboflow for providing the dataset management platform.
- Ultralytics for the YOLOv8 implementation.

---

*For questions or collaborations, please open an issue or contact the repository maintainer.*

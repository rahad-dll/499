import io

import torch
from PIL import Image
from torchvision import models, transforms

from config import MODEL_DIR, OCCUPANCY_MODEL

# must match training order — ImageFolder sorts alphabetically
CLASS_NAMES = ["empty", "occupied"]

# ImageNet stats — matches MobileNetV2 pretraining
INPUT_SIZE = (224, 224)
MEAN = [0.485, 0.456, 0.406]
STD  = [0.229, 0.224, 0.225]

# loaded once on first request, reused for every call after
_model     = None
_transform = None


def load_model():
    """Load weights and put the model in eval mode. Singleton — loads once per process."""
    global _model, _transform

    if _model is not None:
        return _model

    # same architecture used during training
    model = models.mobilenet_v2(weights=None)
    model.classifier = torch.nn.Sequential(
        torch.nn.Dropout(p=0.2),
        torch.nn.Linear(model.last_channel, 2),
    )

    weights_path = f"{MODEL_DIR}/{OCCUPANCY_MODEL}"
    model.load_state_dict(torch.load(weights_path, map_location="cpu"))
    model.eval()
    _model = model

    _transform = transforms.Compose([
        transforms.Resize(INPUT_SIZE),
        transforms.ToTensor(),
        transforms.Normalize(mean=MEAN, std=STD),
    ])

    return _model


def predict(image_bytes: bytes) -> dict:
    """Classify a single slot image. Expects a pre-cropped slot patch, not a full frame.

    Returns:
        label      — "empty" or "occupied"
        confidence — winning class probability (0.0–1.0)
    """
    model = load_model()

    # force RGB to handle RGBA / greyscale inputs
    img    = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    tensor = _transform(img).unsqueeze(0)  # add batch dimension

    with torch.no_grad():
        probs = torch.softmax(model(tensor), dim=1).squeeze()

    confidence, idx = probs.max(dim=0)

    return {
        "label":      CLASS_NAMES[idx.item()],
        "confidence": round(confidence.item(), 4),
    }

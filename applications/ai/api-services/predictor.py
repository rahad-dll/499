import io
import re

import torch
from PIL import Image
from torchvision import models, transforms

from config import MODEL_DIR, OCCUPANCY_MODEL

# must match training order — ImageFolder sorts alphabetically
CLASS_NAMES = ["empty", "occupied"]

INPUT_SIZE = (224, 224)
MEAN = [0.485, 0.456, 0.406]
STD  = [0.229, 0.224, 0.225]

_model     = None
_transform = None


def _remap_checkpoint(state_dict: dict) -> dict:
    """Phase 2 weights were saved with a CheckpointedFeatures wrapper that split
    the backbone into seg1 / seg2. Remap those keys back to the standard
    features.N.* layout that torchvision expects.

    seg1 holds features[0 .. mid-1], seg2 holds features[mid .. end].
    We reconstruct the original index by counting layers per segment.
    """
    # check if remapping is needed
    if not any(k.startswith("features.seg") for k in state_dict):
        return state_dict  # phase1 or already standard layout

    seg1_keys = sorted(
        [k for k in state_dict if k.startswith("features.seg1.")],
        key=lambda k: k
    )
    seg2_keys = sorted(
        [k for k in state_dict if k.startswith("features.seg2.")],
        key=lambda k: k
    )

    # extract unique layer indices within each segment
    def layer_indices(keys, prefix):
        indices = []
        for k in keys:
            m = re.match(rf"{re.escape(prefix)}\.(\d+)\.", k)
            if m and m.group(1) not in indices:
                indices.append(m.group(1))
        return indices

    seg1_layers = layer_indices(seg1_keys, "features.seg1")
    seg2_layers = layer_indices(seg2_keys, "features.seg2")

    # seg1 maps to features[0..len(seg1_layers)-1]
    # seg2 maps to features[len(seg1_layers)..]
    offset = len(seg1_layers)

    new_sd = {}
    for k, v in state_dict.items():
        if k.startswith("features.seg1."):
            # features.seg1.IDX.rest -> features.IDX.rest
            new_k = re.sub(r"features\.seg1\.(\d+)\.", lambda m: f"features.{m.group(1)}.", k)
            new_sd[new_k] = v
        elif k.startswith("features.seg2."):
            # features.seg2.IDX.rest -> features.(IDX+offset).rest
            new_k = re.sub(
                r"features\.seg2\.(\d+)\.",
                lambda m: f"features.{int(m.group(1)) + offset}.",
                k
            )
            new_sd[new_k] = v
        else:
            new_sd[k] = v

    return new_sd


def load_model():
    """Load weights and put the model in eval mode. Singleton — loads once per process."""
    global _model, _transform

    if _model is not None:
        return _model

    model = models.mobilenet_v2(weights=None)
    model.classifier = torch.nn.Sequential(
        torch.nn.Dropout(p=0.2),
        torch.nn.Linear(model.last_channel, 2),
    )

    weights_path = f"{MODEL_DIR}/{OCCUPANCY_MODEL}"
    raw = torch.load(weights_path, map_location="cpu")
    state_dict = _remap_checkpoint(raw)
    model.load_state_dict(state_dict)
    model.eval()
    _model = model

    _transform = transforms.Compose([
        transforms.Resize(INPUT_SIZE),
        transforms.ToTensor(),
        transforms.Normalize(mean=MEAN, std=STD),
    ])

    return _model


def predict(image_bytes: bytes) -> dict:
    """Classify a single slot image. Returns label and confidence."""
    model = load_model()

    img    = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    tensor = _transform(img).unsqueeze(0)

    with torch.no_grad():
        probs = torch.softmax(model(tensor), dim=1).squeeze()

    confidence, idx = probs.max(dim=0)

    return {
        "label":      CLASS_NAMES[idx.item()],
        "confidence": round(confidence.item(), 4),
    }

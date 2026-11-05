import io
import json
import re
from pathlib import Path

import torch
from PIL import Image
from torchvision import models, transforms

from config import (
    DEFAULT_MODEL,
    DEFAULT_OCCUPANCY_MODEL,
    MODEL_DIR,
    MODEL_PATHS,
    PLATE_DETECTOR_MODEL,
    PLATE_MIN_CONFIDENCE,
    PLATE_READER_CLASSES,
    PLATE_READER_MODEL,
)

# must match training order — ImageFolder sorts alphabetically
CLASS_NAMES = ["empty", "occupied"]

INPUT_SIZE = (224, 224)
MEAN = [0.485, 0.456, 0.406]
STD  = [0.229, 0.224, 0.225]

_model = None
_transform = None
_model_name = None

def resolve_model_path(model_name: str | None = None) -> str:
    """Resolve the requested selector to the configured weight path from the env file."""
    if not model_name:
        default_alias = DEFAULT_MODEL.strip().lower()
        if default_alias in MODEL_PATHS:
            return MODEL_PATHS[default_alias]
        return MODEL_PATHS.get("occupancy", DEFAULT_OCCUPANCY_MODEL)

    normalized = model_name.strip().lower().replace(" ", "")
    if normalized in MODEL_PATHS:
        return MODEL_PATHS[normalized]

    if normalized in {"slot-occupancy"}:
        return MODEL_PATHS["slot-occupancy"]

    if normalized.endswith(".pth") or normalized.endswith(".pt"):
        return normalized

    return MODEL_PATHS.get("occupancy", DEFAULT_OCCUPANCY_MODEL)


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


def load_model(model_name: str | None = None):
    """Load weights and put the model in eval mode. Singleton — loads once per process."""
    global _model, _transform, _model_name

    resolved_model = resolve_model_path(model_name)
    if _model is not None and _model_name == resolved_model:
        return _model

    model = models.mobilenet_v2(weights=None)
    model.classifier = torch.nn.Sequential(
        torch.nn.Dropout(p=0.2),
        torch.nn.Linear(model.last_channel, 2),
    )

    weights_path = str(Path(MODEL_DIR) / resolved_model)
    raw = torch.load(weights_path, map_location="cpu")
    state_dict = _remap_checkpoint(raw)
    model.load_state_dict(state_dict)
    model.eval()
    _model = model
    _model_name = resolved_model

    _transform = transforms.Compose([
        transforms.Resize(INPUT_SIZE),
        transforms.ToTensor(),
        transforms.Normalize(mean=MEAN, std=STD),
    ])

    return _model


def predict(image_bytes: bytes, model_name: str | None = None) -> dict:
    """Classify a single slot image. Returns label and confidence."""
    model = load_model(model_name)

    img    = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    tensor = _transform(img).unsqueeze(0)

    with torch.no_grad():
        probs = torch.softmax(model(tensor), dim=1).squeeze()

    confidence, idx = probs.max(dim=0)

    return {
        "label":      CLASS_NAMES[idx.item()],
        "confidence": round(confidence.item(), 4),
    }


# ── licence plates

_plate_models = None

# The reader's class names "Da"/"DA" (ড/দ) and "Tha"/"THA" (থ/ঠ) differ only in case.
# Plate text is compared case-insensitively, so these get spellings that stay distinct.
PLATE_ENGLISH_SPELLING = {"Da": "Dda", "DA": "Da", "THA": "Ttha"}


def load_plate_models():
    """Load the plate detector, the character reader and the reader's class list. Loads once per process."""
    global _plate_models

    if _plate_models is None:
        from ultralytics import YOLO  # imported here so occupancy-only setups do not need it

        classes = json.loads((Path(MODEL_DIR) / PLATE_READER_CLASSES).read_text(encoding="utf-8"))
        _plate_models = {
            "detector": YOLO(str(Path(MODEL_DIR) / PLATE_DETECTOR_MODEL)),
            "reader":   YOLO(str(Path(MODEL_DIR) / PLATE_READER_MODEL)),
            "bangla":   [c["bangla"] for c in classes],
            "english":  [PLATE_ENGLISH_SPELLING.get(c["name"], c["name"]) for c in classes],
            "kind":     [c["kind"] for c in classes],
        }

    return _plate_models


def plate_text(boxes: list[tuple[int, float]], labels: list[str], kind: list[str]) -> str:
    """Turn (class_id, x1) character boxes into plate text.

    District, word and letter come first, then the digits, each left to right;
    six digits are written as 12-3456.
    """
    ordered = sorted(boxes, key=lambda b: b[1])
    head = " ".join(labels[c] for c, _ in ordered if kind[c] != "digit")
    digits = "".join(labels[c] for c, _ in ordered if kind[c] == "digit")
    if len(digits) == 6:
        digits = f"{digits[:2]}-{digits[2:]}"
    return " ".join(part for part in (head, digits) if part)


def read_plates(image_bytes: bytes, min_confidence: float = PLATE_MIN_CONFIDENCE) -> list[dict]:
    """Find every licence plate in an image and read it. Most confident plate first."""
    plate_models = load_plate_models()
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")

    detection = plate_models["detector"].predict(img, conf=min_confidence, verbose=False)[0]

    plates = []
    for box in sorted(detection.boxes, key=lambda b: -float(b.conf)):
        x1, y1, x2, y2 = (round(v) for v in box.xyxy[0].tolist())
        reading = plate_models["reader"].predict(img.crop((x1, y1, x2, y2)), conf=0.25, verbose=False)[0]
        chars = [(int(c), float(b[0])) for c, b in zip(reading.boxes.cls, reading.boxes.xyxy)]

        plates.append({
            "box":        {"x1": x1, "y1": y1, "x2": x2, "y2": y2},
            "confidence": round(float(box.conf), 4),
            "text_en":    plate_text(chars, plate_models["english"], plate_models["kind"]),
            "text_bn":    plate_text(chars, plate_models["bangla"], plate_models["kind"]),
        })

    return plates

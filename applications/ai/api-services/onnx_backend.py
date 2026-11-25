"""Runs the inference models with onnxruntime, without PyTorch."""

from pathlib import Path

import cv2
import numpy as np
import onnxruntime as ort
from PIL import Image

from config import MODEL_DIR

ONNX_DIR = Path(MODEL_DIR) / "onnx"
MEAN = np.array([0.485, 0.456, 0.406], np.float32)
STD = np.array([0.229, 0.224, 0.225], np.float32)

_sessions: dict[str, ort.InferenceSession] = {}


def _run(name: str, x: np.ndarray) -> list[np.ndarray]:
    if name not in _sessions:
        _sessions[name] = ort.InferenceSession(str(ONNX_DIR / f"{name}.onnx"), providers=["CPUExecutionProvider"])
    s = _sessions[name]
    return s.run(None, {s.get_inputs()[0].name: x})


def classify(img: Image.Image) -> tuple[int, float]:
    """Occupancy class index and its probability."""
    x = np.asarray(img.convert("RGB").resize((224, 224), Image.BILINEAR), np.float32) / 255
    x = ((x - MEAN) / STD).transpose(2, 0, 1)[None].astype(np.float32)
    logits = _run("occupancy", x)[0][0]
    p = np.exp(logits - logits.max())
    p /= p.sum()
    i = int(p.argmax())
    return i, float(p[i])


def _letterbox(img: Image.Image, size: int):
    """Scale to fit a size x size square, pad with grey; returns input, scale and padding."""
    a = np.asarray(img.convert("RGB"))
    h, w = a.shape[:2]
    r = min(size / h, size / w)
    nw, nh = round(w * r), round(h * r)
    if (nw, nh) != (w, h):
        a = cv2.resize(a, (nw, nh), interpolation=cv2.INTER_LINEAR)
    dw, dh = (size - nw) / 2, (size - nh) / 2
    top, bottom, left, right = round(dh - 0.1), round(dh + 0.1), round(dw - 0.1), round(dw + 0.1)
    a = cv2.copyMakeBorder(a, top, bottom, left, right, cv2.BORDER_CONSTANT, value=(114, 114, 114))
    x = np.ascontiguousarray((a.astype(np.float32) / 255).transpose(2, 0, 1)[None])
    return x, r, left, top


def detect(name: str, img: Image.Image, size: int, conf: float, max_det: int = 300):
    """Boxes (pixels of img), confidences and classes, most confident first."""
    x, r, left, top = _letterbox(img, size)
    out = _run(name, x)[0][0]                       # (300, 6): x1, y1, x2, y2, conf, class
    out = out[out[:, 4] >= conf]
    out = out[np.argsort(-out[:, 4])][:max_det]
    boxes = (out[:, :4] - [left, top, left, top]) / r
    w, h = img.size
    boxes[:, [0, 2]] = boxes[:, [0, 2]].clip(0, w)
    boxes[:, [1, 3]] = boxes[:, [1, 3]].clip(0, h)
    return boxes, out[:, 4], out[:, 5].astype(int)


def reader_guesses(crop: Image.Image, size: int, conf: float, max_det: int) -> list[dict]:
    """All character guesses on a plate crop, in the same form as the PyTorch path."""
    boxes, confs, classes = detect("plate-reader", crop, size, conf, max_det)
    w, h = crop.size
    return [
        {"cls": int(c), "conf": float(p), "x": float((b[0] + b[2]) / 2 / w),
         "box": [float(b[0] / w), float(b[1] / h), float(b[2] / w), float(b[3] / h)]}
        for b, p, c in zip(boxes, confs, classes)
    ]


def layout_probabilities(crop: Image.Image, size: int) -> list[np.ndarray]:
    """Character count probabilities for a plate crop."""
    x, *_ = _letterbox(crop, size)
    return [p[0] for p in _run("plate-layout", x)]

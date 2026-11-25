"""The demo camera video, played on a shared clock so every camera shows the same moment."""

import threading
import time
from datetime import datetime
from pathlib import Path

import cv2
from PIL import Image

from config import VIDEO_CLOCK_START, VIDEO_PATH

_lock = threading.Lock()
_video = None


def _open():
    global _video
    if _video is None:
        if not Path(VIDEO_PATH).exists():
            raise FileNotFoundError(f"demo video not found: {VIDEO_PATH}")
        _video = cv2.VideoCapture(str(VIDEO_PATH))
    return _video


def info() -> dict:
    """Length of the video and the moment the shared clock started."""
    with _lock:
        v = _open()
        fps = v.get(cv2.CAP_PROP_FPS) or 1
        duration = v.get(cv2.CAP_PROP_FRAME_COUNT) / fps
    return {"duration_s": round(duration, 3), "clock_start": VIDEO_CLOCK_START, "position_s": position(duration)}


def position(duration: float) -> float:
    """Where the video is now on the shared clock."""
    start = datetime.fromisoformat(VIDEO_CLOCK_START.replace("Z", "+00:00")).timestamp()
    return round((time.time() - start) % duration, 3)


def frame_at(seconds: float | None = None) -> tuple[Image.Image, float]:
    """The frame at a position (default: now on the shared clock) and that position."""
    duration = info()["duration_s"]
    at = position(duration) if seconds is None else seconds % duration
    with _lock:
        v = _open()
        v.set(cv2.CAP_PROP_POS_MSEC, at * 1000)
        ok, frame = v.read()
    if not ok:
        raise RuntimeError(f"could not read the video at {at:.1f} s")
    return Image.fromarray(frame[:, :, ::-1]), at

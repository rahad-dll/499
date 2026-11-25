"""Picks the best plate reading from the character guesses."""

import math

import numpy as np

KINDS = ["digit", "district", "letter", "word"]

IMAGE_SIZE = 320
GUESS_CONFIDENCE = 0.05
READ_CONFIDENCE = 0.25
LAYOUT_WEIGHT = 0.25
OVERLAP = 0.5
OPTIONS = 3
BEAM = 256


def reader_guesses(reader, crop) -> list[dict]:
    """All character guesses on a plate crop."""
    boxes = reader.predict(crop, imgsz=IMAGE_SIZE, conf=GUESS_CONFIDENCE, max_det=100, rect=False, verbose=False)[0].boxes
    return [
        {"cls": c, "conf": p, "x": xywh[0], "box": xyxy}
        for c, p, xywh, xyxy in zip(boxes.cls.int().tolist(), boxes.conf.tolist(),
                                    boxes.xywhn.tolist(), boxes.xyxyn.tolist())
    ]


def layout_probabilities(core, crop) -> list[np.ndarray]:
    """Character count probabilities for a plate crop."""
    import torch
    from ultralytics.data.augment import LetterBox

    image = LetterBox((IMAGE_SIZE, IMAGE_SIZE), auto=False)(image=np.asarray(crop.convert("RGB")))
    x = torch.from_numpy(image.copy()).permute(2, 0, 1).float()[None] / 255
    p = next(core.parameters())
    with torch.no_grad():
        return [logits[0].float().softmax(0).cpu().numpy() for logits in core.layout_logits(x.to(p.device, p.dtype))]


def iou(a, b) -> float:
    w = max(0.0, min(a[2], b[2]) - max(a[0], b[0]))
    h = max(0.0, min(a[3], b[3]) - max(a[1], b[1]))
    inter = w * h
    union = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - inter
    return inter / union if union else 0.0


def positions(guesses: list[dict]) -> list[list[dict]]:
    """Group overlapping guesses, left to right."""
    groups = []
    for g in sorted(guesses, key=lambda g: -g["conf"]):
        for group in groups:
            if iou(group[0]["box"], g["box"]) > OVERLAP:
                group.append(g)
                break
        else:
            groups.append([g])
    return sorted(groups, key=lambda group: group[0]["x"])


def decode(guesses: list[dict], kind: list[str], caps: list[int], probs: list[np.ndarray]) -> list[dict]:
    """Guesses of the best reading."""
    states = [(0.0, (0, 0, 0, 0), ())]   # score, counts, chosen
    for group in positions(guesses):
        options = group[:OPTIONS]
        new_states = []
        for score, counts, chosen in states:
            new_states.append((score + math.log(max(1e-4, 1 - options[0]["conf"])), counts, chosen))   # skip
            for g in options:
                j = KINDS.index(kind[g["cls"]])
                if counts[j] < caps[j]:
                    c = counts[:j] + (counts[j] + 1,) + counts[j + 1:]
                    new_states.append((score + math.log(max(1e-4, g["conf"])), c, chosen + (g,)))
        states = sorted(new_states, key=lambda s: -s[0])[:BEAM]

    def total(state):
        score, counts, _ = state
        return score + LAYOUT_WEIGHT * sum(math.log(max(1e-6, float(probs[j][n]))) for j, n in enumerate(counts))

    best = max((s for s in states if s[2]), key=total, default=None)
    if best is None:
        return [g for g in guesses if g["conf"] >= READ_CONFIDENCE]
    return list(best[2])

"""Custom layers of the plate reader (YOLO26s with a layout head).

The trained weights refer to these classes by this module name, so the file must stay
importable as `plate_layers`. Training-only code is in notebook 13_reader_layout.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from ultralytics.nn.tasks import DetectionModel


class Tap(nn.Module):
    """Wraps one backbone layer and keeps its last output, so the layout head can read it."""

    def __init__(self, m):
        super().__init__()
        self.m = m
        self.f, self.i, self.type, self.np = m.f, m.i, m.type, m.np
        self.out = None

    def forward(self, x):
        self.out = self.m(x)
        return self.out

    def __getstate__(self):
        state = self.__dict__.copy()
        state["out"] = None
        return state


class LayoutHead(nn.Module):
    """Predicts how many digits, districts, letters and words the plate has."""

    def __init__(self, c, caps, hidden=256):
        super().__init__()
        self.fc = nn.Sequential(nn.Linear(2 * c, hidden), nn.SiLU())
        self.heads = nn.ModuleList(nn.Linear(hidden, cap + 1) for cap in caps)

    def forward(self, x):
        x = torch.cat([F.adaptive_avg_pool2d(x, 1), F.adaptive_max_pool2d(x, 1)], 1).flatten(1)
        h = self.fc(x)
        return [head(h) for head in self.heads]


class LayoutModel(DetectionModel):
    """YOLO detector with an extra head that predicts the plate layout."""

    def layout_logits(self):
        return self.layout_head(self.model[self.layout_layer].out)

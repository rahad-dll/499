"""Custom layers of the plate reader. The weights need this module name."""

import torch
import torch.nn as nn
import torch.nn.functional as F
from ultralytics.nn.tasks import DetectionModel


class Tap(nn.Module):
    """Keeps the output of one layer."""

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
    """Predicts the character counts of a plate."""

    def __init__(self, c, caps, hidden=256):
        super().__init__()
        self.fc = nn.Sequential(nn.Linear(2 * c, hidden), nn.SiLU())
        self.heads = nn.ModuleList(nn.Linear(hidden, cap + 1) for cap in caps)

    def forward(self, x):
        x = torch.cat([F.adaptive_avg_pool2d(x, 1), F.adaptive_max_pool2d(x, 1)], 1).flatten(1)
        h = self.fc(x)
        return [head(h) for head in self.heads]


class LayoutModel(DetectionModel):
    """Plate reader with a layout head."""

    def layout_logits(self, x):
        for layer in self.model[: self.layout_layer + 1]:
            x = layer(x)
        return self.layout_head(x)

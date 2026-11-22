import json
from pathlib import Path

import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision.ops import deform_conv2d
from ultralytics.models.yolo.detect import DetectionTrainer
from ultralytics.nn.modules import Conv
from ultralytics.nn.modules.block import Bottleneck
from ultralytics.nn.tasks import DetectionModel
from ultralytics.utils import RANK
import ultralytics.utils.torch_utils as torch_utils

KINDS = ["digit", "district", "letter", "word"]


# ---------------------------------------------------------------- deformable convolution (notebook 10)

class DConv(nn.Module):
    """Deformable 3x3 convolution (DCNv2) made from a pretrained Conv.

    The offsets start at zero and the mask at one, so before training it gives exactly the same output
    as the Conv it replaces; training then learns where each kernel tap should look.
    """

    def __init__(self, conv):
        super().__init__()
        c = conv.conv
        self.weight = nn.Parameter(c.weight.detach().clone())
        self.stride, self.padding, self.dilation = c.stride, c.padding, c.dilation
        taps = c.kernel_size[0] * c.kernel_size[1]
        self.offset = nn.Conv2d(c.in_channels, 3 * taps, c.kernel_size, c.stride, c.padding)
        nn.init.zeros_(self.offset.weight)
        nn.init.zeros_(self.offset.bias)
        self.bn = conv.bn
        self.act = conv.act

    def forward(self, x):
        dy_dx_1, dy_dx_2, mask = self.offset(x).chunk(3, dim=1)
        offset = torch.cat([dy_dx_1, dy_dx_2], dim=1)
        y = deform_conv2d(x, offset, self.weight, None, self.stride, self.padding, self.dilation, 2 * torch.sigmoid(mask))
        return self.act(self.bn(y))


# Ultralytics counts FLOPs with thop on an uninitialised tensor and the deformable op crashes on it.
# The count is only for the printed summary, so it is skipped for models with deformable convs.
_get_flops = torch_utils.get_flops


def _get_flops_safe(model, imgsz=640):
    if any(isinstance(m, DConv) for m in model.modules()):
        return 0.0
    return _get_flops(model, imgsz)


torch_utils.get_flops = _get_flops_safe


def add_dcn(model, layers=(6, 8)):
    """Swap the 3x3 conv of every bottleneck in backbone layers 6 and 8 (P4 and P5) for a DConv."""
    swapped = 0
    for i in layers:
        for m in model.model[i].modules():
            if isinstance(m, Bottleneck) and isinstance(m.cv2, Conv) and m.cv2.conv.kernel_size == (3, 3) \
                    and m.cv2.conv.stride == (1, 1) and m.cv2.conv.groups == 1:
                m.cv2 = DConv(m.cv2)
                swapped += 1
    return swapped


class DCNTrainer(DetectionTrainer):
    def get_model(self, cfg=None, weights=None, verbose=True):
        model = super().get_model(cfg, weights, verbose)
        print("deformable convs:", add_dcn(model))
        return model


# ---------------------------------------------------------------- SPD-Conv (notebook 12)

class SPDConv(nn.Module):
    """Space-to-depth then a stride-1 conv: halves the size without dropping any pixel (SPD-Conv)."""

    def __init__(self, c1, c2):
        super().__init__()
        self.conv = Conv(4 * c1, c2, 3, 1)

    def forward(self, x):
        x = torch.cat([x[..., ::2, ::2], x[..., 1::2, ::2], x[..., ::2, 1::2], x[..., 1::2, 1::2]], dim=1)
        return self.conv(x)


def add_spd(model, layers=(1, 3, 5, 7)):
    """Replace the stride-2 Conv layers of the backbone (the downsampling to P2, P3, P4 and P5) with SPDConv."""
    for i in layers:
        old = model.model[i]
        new = SPDConv(old.conv.in_channels, old.conv.out_channels)
        new.f, new.i, new.type = old.f, old.i, "SPDConv"
        new.np = sum(p.numel() for p in new.parameters())
        model.model[i] = new
    return len(layers)


class SPDTrainer(DetectionTrainer):
    def get_model(self, cfg=None, weights=None, verbose=True):
        model = super().get_model(cfg, weights, verbose)
        print("SPD layers:", add_spd(model))
        return model


# ---------------------------------------------------------------- layout head (notebook 13)

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
        state["out"] = None   # never save a feature map with the model
        return state


class LayoutHead(nn.Module):
    """Predicts how many digits, districts, letters and words the plate has, from pooled backbone features."""

    def __init__(self, c, caps, hidden=256):
        super().__init__()
        self.fc = nn.Sequential(nn.Linear(2 * c, hidden), nn.SiLU())
        self.heads = nn.ModuleList(nn.Linear(hidden, cap + 1) for cap in caps)

    def forward(self, x):
        x = torch.cat([F.adaptive_avg_pool2d(x, 1), F.adaptive_max_pool2d(x, 1)], 1).flatten(1)
        h = self.fc(x)
        return [head(h) for head in self.heads]


def plate_layout_info(data_dir):
    """Kind of every class (0 digit, 1 district, 2 letter, 3 word) and the largest count of each kind in training."""
    data_dir = Path(data_dir)
    classes = json.loads((data_dir / "classes.json").read_text(encoding="utf-8"))
    kinds = [KINDS.index(c["kind"]) for c in classes]
    caps = [0, 0, 0, 0]
    for label in (data_dir / "labels" / "train").glob("*.txt"):
        counts = [0, 0, 0, 0]
        for line in label.read_text().splitlines():
            if line.strip():
                counts[kinds[int(line.split()[0])]] += 1
        caps = [max(a, b) for a, b in zip(caps, counts)]
    return kinds, caps


class LayoutModel(DetectionModel):
    """YOLO detector with an extra head that predicts the plate layout, trained together with detection."""

    def add_layout(self, kinds, caps, layer=10, weight=1.0):
        self.model[layer] = Tap(self.model[layer])
        self.layout_layer = layer
        self.layout_caps = list(caps)
        self.layout_weight = weight
        self.register_buffer("kind_index", torch.tensor(kinds, dtype=torch.long))
        with torch.no_grad():
            p = next(self.parameters())
            s = int(self.stride.max())
            self.model.eval()
            self.forward(torch.zeros(1, 3, 2 * s, 2 * s, device=p.device, dtype=p.dtype))
            self.model.train()
        c = self.model[layer].out.shape[1]
        self.model[layer].out = None
        self.layout_head = LayoutHead(c, caps)

    def layout_logits(self):
        return self.layout_head(self.model[self.layout_layer].out)

    def layout_targets(self, batch, n):
        counts = torch.zeros(n, 4, dtype=torch.long, device=self.kind_index.device)
        if len(batch["cls"]):
            img = batch["batch_idx"].long().to(counts.device)
            kind = self.kind_index[batch["cls"].view(-1).long().to(counts.device)]
            counts.index_put_((img, kind), torch.ones_like(img), accumulate=True)
        caps = torch.tensor(self.layout_caps, device=counts.device)
        return torch.minimum(counts, caps)

    def loss(self, batch, preds=None):
        if preds is None:
            preds = self.forward(batch["img"])
        det, items = super().loss(batch, preds)
        logits = self.layout_logits()
        self.model[self.layout_layer].out = None
        n = batch["img"].shape[0]
        target = self.layout_targets(batch, n)
        layout = sum(F.cross_entropy(l.float(), target[:, j]) for j, l in enumerate(logits))
        return torch.cat([det.view(-1), (self.layout_weight * layout * n).view(1)]), items


class LayoutTrainer(DetectionTrainer):
    def get_model(self, cfg=None, weights=None, verbose=True):
        model = LayoutModel(cfg, nc=self.data["nc"], ch=self.data["channels"], verbose=verbose and RANK == -1)
        if weights:
            model.load(weights)
        kinds, caps = plate_layout_info(Path(self.args.data).parent)
        model.add_layout(kinds, caps)
        print("layout head: caps (digit, district, letter, word) =", caps)
        return model


def layout_probabilities(core, images, imgsz, device):
    """Layout probabilities per image from a trained LayoutModel: list of 4 arrays (one per kind) per image."""
    import cv2
    from ultralytics.data.augment import LetterBox

    box = LetterBox((imgsz, imgsz), auto=False)
    out = []
    core = core.to(device).float().eval()
    with torch.no_grad():
        for start in range(0, len(images), 64):
            batch = []
            for path in images[start:start + 64]:
                img = box(image=cv2.imread(str(path)))[:, :, ::-1].copy()
                batch.append(torch.from_numpy(img).permute(2, 0, 1).float() / 255)
            core(torch.stack(batch).to(device))
            probs = [p.softmax(1).cpu().numpy() for p in core.layout_logits()]
            core.model[core.layout_layer].out = None
            for k in range(len(batch)):
                out.append([p[k] for p in probs])
    return out

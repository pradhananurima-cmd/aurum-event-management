#!/usr/bin/env python3
"""
Generative art builder for the AURUM event platform.

Paints the ABSTRACT layers of the site (hero backdrop) as procedural gradient-mesh compositions with a crisp
geometric overlay. Event tiles and gallery frames are NOT built here - they are
rendered scenes cropped by ./tools/make_assets.sh, so re-running this script can
never overwrite a photograph.

    python3 tools/gen_art.py
"""

from __future__ import annotations

import math
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets")
os.makedirs(OUT, exist_ok=True)

BASE = np.array([10, 11, 15], dtype=np.float32)
CHAMPAGNE = np.array([236, 205, 143], dtype=np.float32)
VIOLET = np.array([126, 100, 255], dtype=np.float32)
MINT = np.array([88, 228, 194], dtype=np.float32)
ROSE = np.array([255, 118, 156], dtype=np.float32)
AMBER = np.array([255, 174, 80], dtype=np.float32)
AZURE = np.array([96, 172, 255], dtype=np.float32)


# --------------------------------------------------------------------------- #
#  soft colour field
# --------------------------------------------------------------------------- #
def color_field(shape, spots, blur):
    h, w = shape
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    field = np.zeros((h, w, 3), dtype=np.float32)
    field[:] = BASE
    for cx, cy, radius, colour, power in spots:
        d2 = (xx - cx * w) ** 2 + (yy - cy * h) ** 2
        g = np.exp(-d2 / (2.0 * (radius * min(w, h)) ** 2))
        field += colour[None, None, :] * (g * power)[..., None]
    if blur:
        img = Image.fromarray(np.clip(field, 0, 255).astype(np.uint8))
        img = img.filter(ImageFilter.GaussianBlur(blur))
        field = np.asarray(img, dtype=np.float32)
    return field


# --------------------------------------------------------------------------- #
#  crisp line motifs — drawn at 2x then downsampled so hairlines stay smooth
# --------------------------------------------------------------------------- #
def motif(kind, w, h, colour, seed=0, ss=2):
    """Return an RGB array + alpha mask for a geometric overlay."""
    W, H = w * ss, h * ss
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    c = (int(colour[0]), int(colour[1]), int(colour[2]))
    lw = max(1, int(1.4 * ss))

    if kind == "rings":
        cx, cy = 0.78 * W, 0.26 * H
        maxr = math.hypot(max(cx, W - cx), max(cy, H - cy))
        for i in range(15):
            r = 30 * ss + i * 42 * ss
            if r > maxr:
                break
            a = int(150 * max(0.06, 1.0 - i / 15))
            d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=c + (a,), width=lw)
        # crosshair through the ring centre
        d.line([cx - 130 * ss, cy, cx - 44 * ss, cy], fill=c + (90,), width=lw)
        d.line([cx + 44 * ss, cy, cx + 130 * ss, cy], fill=c + (90,), width=lw)

    elif kind == "diagonals":
        step = 46 * ss
        for i in range(-int(H / step), int((W + H) / step)):
            x0 = i * step
            a = 66 if i % 5 == 0 else 26
            d.line([x0, H, x0 + H, 0], fill=c + (a,), width=lw)

    elif kind == "bars":
        # vertical "audio spectrum" bars rising from the baseline
        rng = np.random.default_rng(seed)
        n = 34
        for i in range(n):
            x = int((i + 0.5) * W / n)
            hh = int(H * (0.08 + 0.42 * float(rng.random())))
            a = 40 + int(140 * (hh / (0.5 * H)))
            bw = max(2, int(W / n * 0.34))
            d.rectangle([x - bw // 2, H - hh, x + bw // 2, H], fill=c + (min(a, 190),))
        d.line([0, H - 1, W, H - 1], fill=c + (120,), width=lw)

    elif kind == "grid":
        step = 62 * ss
        for x in range(0, W + step, step):
            d.line([x, 0, x, H], fill=c + (22,), width=lw)
        for y in range(0, H + step, step):
            d.line([0, y, W, y], fill=c + (22,), width=lw)
        # one emphasized column + node dots
        d.line([int(W * 0.68), 0, int(W * 0.68), H], fill=c + (110,), width=lw)
        for k in range(4):
            y = int(H * (0.16 + k * 0.23))
            r = 5 * ss
            d.ellipse([W * 0.68 - r, y - r, W * 0.68 + r, y + r], fill=c + (200,))

    elif kind == "orbit":
        cx, cy = 0.30 * W, 0.74 * H
        d.ellipse([cx - 150 * ss, cy - 150 * ss, cx + 150 * ss, cy + 150 * ss],
                  outline=c + (150,), width=lw)
        for k in range(9):
            ang = math.radians(k * 40 + 12)
            rx, ry = 300 * ss, 118 * ss
            px = cx + rx * math.cos(ang) * math.cos(math.radians(24)) - ry * math.sin(ang) * math.sin(math.radians(24))
            py = cy + rx * math.cos(ang) * math.sin(math.radians(24)) + ry * math.sin(ang) * math.cos(math.radians(24))
            r = (3.4 if k % 3 else 6.5) * ss
            d.ellipse([px - r, py - r, px + r, py + r], fill=c + (190,))
        # faint swept ellipse
        d.ellipse([cx - 300 * ss, cy - 118 * ss, cx + 300 * ss, cy + 118 * ss],
                  outline=c + (58,), width=lw)

    elif kind == "tri":
        cx, cy = 0.5 * W, 0.56 * H
        for i in range(7):
            s = (0.10 + i * 0.075) * min(W, H)
            a = int(165 - i * 18)
            pts = [(cx, cy - s), (cx + s * 0.88, cy + s * 0.62), (cx - s * 0.88, cy + s * 0.62)]
            d.polygon(pts, outline=c + (max(a, 22),))
        d.line([0, cy + 0.62 * min(W, H) * 0.55, W, cy + 0.62 * min(W, H) * 0.55],
               fill=c + (60,), width=lw)

    rgba = np.asarray(img.resize((w, h), Image.LANCZOS), dtype=np.float32)
    return rgba[..., :3], rgba[..., 3:4] / 255.0


def frame_marks(w, h, colour, inset=0.045):
    """Thin corner registration brackets — a recurring signature of the site."""
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    c = (int(colour[0]), int(colour[1]), int(colour[2]), 150)
    ix, iy = int(w * inset), int(h * inset)
    ln = int(min(w, h) * 0.075)
    for (x, y, sx, sy) in [(ix, iy, 1, 1), (w - ix, iy, -1, 1), (ix, h - iy, 1, -1), (w - ix, h - iy, -1, -1)]:
        d.line([x, y, x + ln * sx, y], fill=c, width=2)
        d.line([x, y, x, y + ln * sy], fill=c, width=2)
    arr = np.asarray(img, dtype=np.float32)
    return arr[..., :3], arr[..., 3:4] / 255.0


def grain(h, w, amount, seed):
    rng = np.random.default_rng(seed)
    return rng.normal(0.0, amount, size=(h, w, 1)).repeat(3, axis=2)


def vignette(h, w, power=0.55, strength=0.55):
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    nx = (xx / (w - 1) - 0.5) * 2
    ny = (yy / (h - 1) - 0.5) * 2
    d = np.sqrt(nx ** 2 + ny ** 2) / math.sqrt(2)
    return (1.0 - strength * np.clip((d - (1 - power)) / power, 0, 1))[..., None]


def save(arr, name, quality):
    img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    path = os.path.join(OUT, name)
    img.save(path, "JPEG", quality=quality, optimize=True, progressive=True)
    kb = os.path.getsize(path) / 1024
    print(f"  {name:22s} {img.size[0]}x{img.size[1]}  {kb:6.0f} KB")


def compose(name, size, spots, *, motif_kind, accent, seed=11, grain_amt=5.0,
            blur=70, marks=True, quality=72, contrast=1.03, lift=4.0):
    w, h = size
    field = color_field((h, w), spots, blur)

    rgb, m = motif(motif_kind, w, h, accent, seed=seed)
    field = field * (1 - m * 0.85) + rgb * (m * 0.85)

    if marks:
        rgb, m = frame_marks(w, h, accent)
        field = field * (1 - m * 0.9) + rgb * (m * 0.9)

    field = field * contrast + lift
    field += grain(h, w, grain_amt, seed)
    field *= vignette(h, w)
    save(field, name, quality)


# --------------------------------------------------------------------------- #
print("AURUM · generating artwork")

compose("hero-backdrop.jpg", (1800, 1130), [
    (0.10, 0.16, 0.55, CHAMPAGNE * 0.42, 0.95),
    (0.88, 0.08, 0.44, VIOLET * 0.34, 0.85),
    (0.74, 0.94, 0.50, MINT * 0.14, 0.55),
    (0.28, 0.92, 0.40, ROSE * 0.09, 0.35),
], motif_kind="grid", accent=CHAMPAGNE, seed=3, blur=90, quality=76, grain_amt=4.0)

total = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT)) / 1024
print(f"done -> {OUT}  ({total:.0f} KB of abstract layers)")

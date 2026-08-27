#!/usr/bin/env python3
"""Paint the orbit-reel mark into PNG and a multi-size Windows ICO.

A vertical capsule (the reel) with two crescent arms (the crew).
Needs Pillow. From this repo: local_studio/.venv/bin/python scripts/build-app-icon.py
"""

from __future__ import annotations

import io
import math
import struct
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "desktop" / "icons"
ICO_SIZES = (16, 24, 32, 48, 64, 128, 256)
START = (0x5D, 0x57, 0xEF, 255)
END = (0x91, 0x8B, 0xFF, 255)


def mix(start: tuple[int, ...], end: tuple[int, ...], t: float) -> tuple[int, ...]:
    t = min(1.0, max(0.0, t))
    return tuple(int(a + (b - a) * t) for a, b in zip(start, end, strict=True))


def squircle(size: int) -> Image.Image:
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    pad = max(1, round(size * 0.04))
    radius = max(2, round((size - 2 * pad) * (10 / 32)))
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [pad, pad, size - 1 - pad, size - 1 - pad],
        radius=radius,
        fill=255,
    )
    pixels = image.load()
    last = max(1, size - 1)
    for y in range(size):
        for x in range(size):
            if mask.getpixel((x, y)):
                pixels[x, y] = mix(START, END, (x + y) / (2 * last))
    return image


def stamp_arc(
    draw: ImageDraw.ImageDraw,
    cx: float,
    cy: float,
    rx: float,
    ry: float,
    start_deg: float,
    end_deg: float,
    stamp: float,
) -> None:
    sweep = end_deg - start_deg
    steps = max(14, int(abs(sweep) * max(rx, ry) / 10))
    for index in range(steps + 1):
        angle = math.radians(start_deg + sweep * index / steps)
        x = cx + rx * math.sin(angle)
        y = cy - ry * math.cos(angle)
        draw.ellipse([x - stamp, y - stamp, x + stamp, y + stamp], fill=255)


def orbit_mark(size: int) -> Image.Image:
    """Vertical reel with two crew arms."""
    mark = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mark)
    cx = cy = (size - 1) / 2
    tight = 1.08 if size <= 24 else 1.0

    slot_w = max(3 if size >= 16 else 2, size * (0.155 if size <= 32 else 0.138))
    slot_h = size * 0.39 * tight
    draw.rounded_rectangle(
        [cx - slot_w / 2, cy - slot_h / 2, cx + slot_w / 2, cy + slot_h / 2],
        radius=slot_w / 2,
        fill=255,
    )

    stamp = max(2.0, size * (0.074 if size <= 24 else 0.072))
    rx = size * 0.262 * tight
    ry = size * 0.282 * tight
    stamp_arc(draw, cx, cy, rx, ry, 208, 332, stamp)
    stamp_arc(draw, cx, cy, rx, ry, 28, 152, stamp)
    return mark


def paint(size: int) -> Image.Image:
    tile = squircle(size)
    mark = orbit_mark(size)
    white = Image.new("RGBA", (size, size), (255, 255, 255, 255))
    cut = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    emblem = Image.composite(white, cut, mark)
    return Image.alpha_composite(tile, emblem)


def save_ico(path: Path, images: list[Image.Image]) -> None:
    """Write a PNG-in-ICO so each size keeps its own painted geometry."""
    entries: list[tuple[int, int, bytes]] = []
    for image in images:
        buffer = io.BytesIO()
        image.save(buffer, format="PNG")
        width, height = image.size
        entries.append((0 if width >= 256 else width, 0 if height >= 256 else height, buffer.getvalue()))
    offset = 6 + 16 * len(entries)
    out = bytearray(struct.pack("<HHH", 0, 1, len(entries)))
    blobs = bytearray()
    for width, height, blob in entries:
        out += struct.pack("<BBBBHHII", width, height, 0, 0, 1, 32, len(blob), offset)
        blobs += blob
        offset += len(blob)
    path.write_bytes(out + blobs)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    master = paint(512)
    master.save(OUT / "icon.png", format="PNG")
    save_ico(OUT / "icon.ico", [paint(size) for size in ICO_SIZES])
    print(f"Wrote {OUT / 'icon.png'} and {OUT / 'icon.ico'}")


if __name__ == "__main__":
    main()

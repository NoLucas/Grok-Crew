#!/usr/bin/env python3
"""Paint the crew-and-reel mark into PNG and a multi-size Windows ICO.

Three overlapping discs (the crew) with a vertical capsule punched out (the reel).
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


def crew_mark(size: int) -> Image.Image:
    """Connected three-lobe crew with a vertical reel slot."""
    mark = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mark)
    cx = cy = (size - 1) / 2
    # Tiny icons need a slightly tighter, thicker glyph so lobes stay one shape.
    tight = 1.05 if size <= 24 else 1.0
    radius = size * 0.198 * tight
    offset = size * 0.122 * tight
    for degrees in (0.0, 120.0, 240.0):
        radians = math.radians(degrees)
        x = cx + offset * math.sin(radians)
        y = cy - offset * math.cos(radians)
        draw.ellipse([x - radius, y - radius, x + radius, y + radius], fill=255)

    slot_w = max(3 if size >= 16 else 2, size * (0.145 if size <= 32 else 0.108))
    slot_h = max(slot_w * 2.2, size * 0.285)
    draw.rounded_rectangle(
        [cx - slot_w / 2, cy - slot_h / 2, cx + slot_w / 2, cy + slot_h / 2],
        radius=slot_w / 2,
        fill=0,
    )
    return mark


def paint(size: int) -> Image.Image:
    tile = squircle(size)
    mark = crew_mark(size)
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

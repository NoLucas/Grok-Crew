#!/usr/bin/env python3
"""Fit the shutter-play mark onto a light squircle PNG and a multi-size ICO.

Needs Pillow. From this repo: local_studio/.venv/bin/python scripts/build-app-icon.py
Source art: desktop/icons/mark-source.png
"""

from __future__ import annotations

import io
import struct
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "desktop" / "icons"
PUBLIC = ROOT / "public"
SOURCE = OUT / "mark-source.png"
ICO_SIZES = (16, 24, 32, 48, 64, 128, 256)
TILE = (247, 247, 247, 255)


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
    tile = Image.new("RGBA", (size, size), TILE)
    return Image.composite(tile, image, mask), mask


def fit_mark(size: int, mark: Image.Image) -> Image.Image:
    # Small icons: fill more of the tile so the shutter still reads.
    inset = 0.03 if size <= 32 else 0.045
    inner = max(1, round(size * (1 - 2 * inset)))
    fitted = mark.resize((inner, inner), Image.Resampling.LANCZOS)
    if size <= 32:
        fitted = fitted.filter(ImageFilter.UnsharpMask(radius=1.2, percent=110, threshold=2))
    return fitted


def paint(size: int, mark: Image.Image) -> Image.Image:
    tile, mask = squircle(size)
    fitted = fit_mark(size, mark)
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    x = (size - fitted.size[0]) // 2
    y = (size - fitted.size[1]) // 2
    layer.paste(fitted, (x, y))
    composed = Image.alpha_composite(tile, layer)
    cut = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    return Image.composite(composed, cut, mask)


def save_ico(path: Path, images: list[Image.Image]) -> None:
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
    if not SOURCE.exists():
        raise SystemExit(f"Missing {SOURCE}")
    mark = Image.open(SOURCE).convert("RGBA")
    OUT.mkdir(parents=True, exist_ok=True)
    PUBLIC.mkdir(parents=True, exist_ok=True)
    master = paint(512, mark)
    master.save(OUT / "icon.png", format="PNG")
    save_ico(OUT / "icon.ico", [paint(size, mark) for size in ICO_SIZES])
    header = paint(128, mark)
    header.save(PUBLIC / "app-mark.png", format="PNG")
    favicon = paint(32, mark)
    favicon.save(PUBLIC / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32)])
    print(f"Wrote {OUT / 'icon.png'}, {OUT / 'icon.ico'}, {PUBLIC / 'app-mark.png'}")


if __name__ == "__main__":
    main()

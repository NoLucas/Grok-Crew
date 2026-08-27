#!/usr/bin/env python3
"""Paint the desk G mark into PNG and a multi-size Windows ICO.

Needs Pillow. From this repo: local_studio/.venv/bin/python scripts/build-app-icon.py
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "desktop" / "icons"
ICO_SIZES = ((16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256))
START = (0x5D, 0x57, 0xEF, 255)
END = (0x91, 0x8B, 0xFF, 255)
FONTS = (
    Path("/usr/share/fonts/truetype/macos/Inter-Bold.ttf"),
    Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
)


def mix(start: tuple[int, ...], end: tuple[int, ...], t: float) -> tuple[int, ...]:
    t = min(1.0, max(0.0, t))
    return tuple(int(a + (b - a) * t) for a, b in zip(start, end, strict=True))


def font_for(size: int) -> ImageFont.FreeTypeFont:
    path = next((item for item in FONTS if item.is_file()), None)
    if path is None:
        raise SystemExit("Inter or DejaVu Bold is required to draw the G mark.")
    return ImageFont.truetype(str(path), max(8, round(size * 0.58)))


def paint(size: int) -> Image.Image:
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    pad = max(1, round(size * 0.04))
    box = [pad, pad, size - 1 - pad, size - 1 - pad]
    radius = max(2, round((size - 2 * pad) * (10 / 32)))
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle(box, radius=radius, fill=255)
    pixels = image.load()
    last = max(1, size - 1)
    for y in range(size):
        for x in range(size):
            if mask.getpixel((x, y)):
                pixels[x, y] = mix(START, END, (x + y) / (2 * last))
    draw = ImageDraw.Draw(image)
    mark = font_for(size)
    letter = "G"
    left, top, right, bottom = draw.textbbox((0, 0), letter, font=mark)
    draw.text(
        ((size - (right - left)) / 2 - left, (size - (bottom - top)) / 2 - top - size * 0.02),
        letter,
        font=mark,
        fill=(255, 255, 255, 255),
    )
    return image


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    master = paint(512)
    master.save(OUT / "icon.png", format="PNG")
    master.save(OUT / "icon.ico", format="ICO", sizes=list(ICO_SIZES))
    print(f"Wrote {OUT / 'icon.png'} and {OUT / 'icon.ico'}")


if __name__ == "__main__":
    main()

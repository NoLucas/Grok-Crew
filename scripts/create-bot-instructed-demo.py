#!/usr/bin/env python3
"""Wrap the real bot-instructed render with title/closing cards for the README demo.

The middle clip is the actual, unmodified local render a bot produced from a
plain-language request. Only the surrounding cards are added for presentation.
"""

from __future__ import annotations

import subprocess
from pathlib import Path

import imageio_ffmpeg
from moviepy import ImageClip, VideoFileClip, concatenate_videoclips
from numpy import asarray
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent.parent
SOURCE_CLIP = ROOT / "public" / "demo" / "bot-instructed-edit-source.mp4"
OUTPUT = ROOT / "public" / "demo" / "bot-instructed-edit.mp4"
PREVIEW = ROOT / "public" / "demo" / "bot-instructed-edit.gif"
SIZE = (1080, 1920)
FPS = 30
YELLOW = "#f4c400"
LIME = "#b8f85a"
BACKGROUND = "#090909"


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    names = [
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
        "/Library/Fonts/Arial Bold.ttf" if bold else "/Library/Fonts/Arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for name in names:
        if Path(name).exists():
            return ImageFont.truetype(name, size)
    return ImageFont.load_default()


def card(kicker: str, headline: str, body: str, accent: str = YELLOW) -> Image.Image:
    image = Image.new("RGB", SIZE, BACKGROUND)
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, SIZE[0], 10), fill=accent)
    draw.text((90, 700), kicker.upper(), font=font(30, True), fill=accent)
    draw.multiline_text((90, 780), headline, font=font(72, True), fill="#f2f2ec", spacing=14)
    draw.multiline_text((94, 1120), body, font=font(34), fill="#b9b9b0", spacing=12)
    draw.rounded_rectangle((94, 1720, SIZE[0] - 94, 1800), radius=16, outline="#46463e", width=2)
    draw.text((124, 1744), "LOCAL-FIRST · NO CLOUD UPLOAD", font=font(20, True), fill=LIME)
    return image


def clip(image: Image.Image, duration: float) -> ImageClip:
    return ImageClip(asarray(image)).with_duration(duration)


def main() -> None:
    if not SOURCE_CLIP.exists():
        raise FileNotFoundError(f"Missing source render: {SOURCE_CLIP}")
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)

    intro = card(
        "GROK CREW · BOT INSTRUCTED",
        "A bot, told in\nplain language:\n\u201cEdit this and\nhand it back.\u201d",
        "No API calls typed by a person.\nThe bot read the Bot Guide\nand did the rest itself.",
    )
    real_render = VideoFileClip(str(SOURCE_CLIP))
    outro = card(
        "RENDERED LOCALLY",
        "8 seconds.\nTwo clips.\nNever left this PC.",
        "No Instagram upload.\nNo cloud backend.\nJust a local MP4.",
        LIME,
    )

    video = concatenate_videoclips(
        [clip(intro, 2.2), real_render, clip(outro, 2.2)],
        method="compose",
    )
    video.write_videofile(str(OUTPUT), fps=FPS, codec="libx264", audio=False, logger=None)
    video.close()
    real_render.close()

    subprocess.run(
        [
            imageio_ffmpeg.get_ffmpeg_exe(),
            "-y",
            "-i",
            str(OUTPUT),
            "-vf",
            "fps=12,scale=380:-2:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer",
            "-loop",
            "0",
            str(PREVIEW),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    print(OUTPUT)
    print(PREVIEW)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Create the README tutorial that shows how to brief a same-PC Grok bot.

The central clip is a real local render. The surrounding cards turn that edit
into a short, reusable prompt → bot workflow → delivered file lesson.
"""

from __future__ import annotations

import subprocess
from pathlib import Path

import imageio_ffmpeg
import numpy as np
from moviepy import CompositeVideoClip, ImageClip, VideoFileClip, concatenate_videoclips
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "public" / "demo" / "bot-instructed-edit-source.mp4"
OUTPUT = ROOT / "public" / "demo" / "bot-command-tutorial.mp4"
PREVIEW = ROOT / "public" / "demo" / "bot-command-tutorial.gif"
SIZE = (1280, 720)
FPS = 30
BG = "#090909"
PANEL = "#151515"
PANEL_2 = "#1b1b1b"
WHITE = "#f4f4ef"
MUTED = "#b9b9b0"
YELLOW = "#f4c400"
LIME = "#b8f85a"
LINE = "#3d3d38"


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",
        "/Library/Fonts/Arial Bold.ttf" if bold else "/Library/Fonts/Arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for candidate in candidates:
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default()


def base() -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGB", SIZE, BG)
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, SIZE[0], 8), fill=YELLOW)
    draw.text((58, 34), "GROK CREW", font=font(20, True), fill=YELLOW)
    draw.text((205, 35), "BOT COMMAND TUTORIAL", font=font(18, True), fill=MUTED)
    draw.line((58, 76, SIZE[0] - 58, 76), fill=LINE, width=1)
    return image, draw


def rounded_panel(draw: ImageDraw.ImageDraw, bounds: tuple[int, int, int, int], fill: str = PANEL) -> None:
    draw.rounded_rectangle(bounds, radius=22, fill=fill, outline=LINE, width=1)


def clip(image: Image.Image, duration: float) -> ImageClip:
    return ImageClip(np.asarray(image)).with_duration(duration)


def intro_card() -> Image.Image:
    image, draw = base()
    draw.text((62, 166), "HOW TO BRIEF", font=font(22, True), fill=YELLOW)
    draw.multiline_text(
        (58, 220),
        "Tell your Grok bot\nthe outcome — not the API.",
        font=font(62, True),
        fill=WHITE,
        spacing=4,
    )
    draw.text((62, 392), "원하는 결과와 조건을 자연어로 알려주세요.", font=font(26), fill=MUTED)
    rounded_panel(draw, (58, 510, 1222, 622), PANEL_2)
    draw.text((90, 540), "SAME PC  ·  LOCAL WORKSPACE  ·  PRIVATE MEDIA", font=font(24, True), fill=LIME)
    return image


def prompt_card() -> Image.Image:
    image, draw = base()
    draw.text((58, 118), "1  ·  SEND A CLEAR OUTCOME", font=font(20, True), fill=YELLOW)
    draw.text((58, 156), "Copy a brief like this into your Grok bot chat.", font=font(35, True), fill=WHITE)
    rounded_panel(draw, (58, 224, 1222, 620), "#121212")
    draw.rounded_rectangle((87, 255, 163, 291), radius=18, fill="#2d2d29")
    draw.text((107, 262), "YOU", font=font(15, True), fill=YELLOW)
    prompt = (
        "Use Grok Crew on this PC to turn inputs/source.mp4 into a\n"
        "vertical 9:16 social edit. Keep the strongest lines, add\n"
        "captions, and render outputs/final.mp4. Do not upload it.\n\n"
        "First read the local Bot Guide if you need details. When\n"
        "finished, report the changes you made and the output path."
    )
    draw.multiline_text((88, 322), prompt, font=font(27), fill=WHITE, spacing=12)
    draw.text((88, 655), "Be specific about source, format, style, delivery, and upload preference.", font=font(18), fill=MUTED)
    return image


def workflow_card() -> Image.Image:
    image, draw = base()
    draw.text((58, 118), "2  ·  THE BOT FOLLOWS THE LOCAL GUIDE", font=font(20, True), fill=YELLOW)
    draw.text((58, 156), "One request becomes a visible production workflow.", font=font(35, True), fill=WHITE)
    entries = [
        ("01", "Read", "Bot Guide + project rules", YELLOW),
        ("02", "Plan", "Inspect media + cut map", LIME),
        ("03", "Edit", "Method + render settings", YELLOW),
        ("04", "Deliver", "Local MP4 + change summary", LIME),
    ]
    width = 272
    for index, (number, title, detail, accent) in enumerate(entries):
        x = 58 + index * (width + 18)
        rounded_panel(draw, (x, 254, x + width, 500))
        draw.text((x + 24, 281), number, font=font(18, True), fill=accent)
        draw.text((x + 24, 334), title, font=font(32, True), fill=WHITE)
        draw.multiline_text((x + 24, 394), detail, font=font(18), fill=MUTED, spacing=6)
    rounded_panel(draw, (58, 548, 1222, 626), PANEL_2)
    draw.text((86, 574), "The bot checks in, keeps its edit reasoning, and works only on this computer.", font=font(22), fill=WHITE)
    return image


def result_backdrop() -> Image.Image:
    image, draw = base()
    draw.text((58, 116), "3  ·  THE RESULT IS A LOCAL FILE", font=font(20, True), fill=YELLOW)
    draw.text((58, 154), "A real bot-instructed render.", font=font(35, True), fill=WHITE)
    rounded_panel(draw, (783, 225, 1222, 532), PANEL)
    draw.text((817, 264), "WHAT THE BOT DID", font=font(17, True), fill=LIME)
    result_lines = [
        "• chose two keep segments",
        "• set a vertical output",
        "• added the requested style",
        "• rendered locally",
        "• returned the file location",
    ]
    draw.multiline_text((817, 306), "\n".join(result_lines), font=font(19), fill=WHITE, spacing=14)
    draw.text((58, 655), "REAL LOCAL RENDER · NO CLOUD MEDIA UPLOAD", font=font(17, True), fill=MUTED)
    return image


def closing_card() -> Image.Image:
    image, draw = base()
    draw.text((58, 178), "ASK FOR THE FILE", font=font(22, True), fill=LIME)
    draw.multiline_text(
        (58, 226),
        "“Give me the final file\nand a change summary.”",
        font=font(60, True),
        fill=WHITE,
        spacing=6,
    )
    rounded_panel(draw, (58, 500, 1222, 610), PANEL_2)
    draw.text((90, 529), "START LOCALLY → npm run local   |   THEN BRIEF YOUR SAME-PC BOT", font=font(24, True), fill=YELLOW)
    return image


def main() -> None:
    if not SOURCE.exists():
        raise FileNotFoundError(f"Missing real render: {SOURCE}")
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)

    source = VideoFileClip(str(SOURCE), audio=False)
    rendered = source.resized(height=478).with_position((390, 190))
    result = CompositeVideoClip(
        [clip(result_backdrop(), source.duration), rendered],
        size=SIZE,
    ).with_duration(source.duration)
    tutorial = concatenate_videoclips(
        [
            clip(intro_card(), 2.4),
            clip(prompt_card(), 6.8),
            clip(workflow_card(), 5.4),
            result,
            clip(closing_card(), 2.6),
        ],
        method="compose",
    )
    tutorial.write_videofile(
        str(OUTPUT),
        fps=FPS,
        codec="libx264",
        audio=False,
        logger=None,
        ffmpeg_params=["-movflags", "+faststart"],
    )
    tutorial.close()
    source.close()

    subprocess.run(
        [
            imageio_ffmpeg.get_ffmpeg_exe(),
            "-y",
            "-i",
            str(OUTPUT),
            "-vf",
            "fps=10,scale=640:-2:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer",
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

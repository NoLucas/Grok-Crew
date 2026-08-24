"""Local Video Studio: MoviePy-based EDL rendering."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Callable

from config import PLATFORM_PRESETS, caption_font, workspace_path

def render_moviepy(project: dict[str, Any], progress_cb: Callable[[int], None] | None = None, should_cancel: Callable[[], bool] | None = None) -> dict[str, Any]:
    try:
        from moviepy import AudioFileClip, ColorClip, CompositeAudioClip, CompositeVideoClip, TextClip, VideoFileClip, afx, concatenate_videoclips, vfx
    except ImportError as exc:
        raise RuntimeError("MoviePy is not installed. Install local_studio/requirements.txt first.") from exc
    timeline = project["timeline_json"]
    raw_settings = timeline.get("render_settings", {})
    settings = raw_settings if isinstance(raw_settings, dict) else {}

    def bounded(name: str, default: float, minimum: float, maximum: float) -> float:
        try:
            return min(max(float(settings.get(name, default)), minimum), maximum)
        except (TypeError, ValueError):
            return default

    def enabled(name: str, default: bool = False) -> bool:
        value = settings.get(name, default)
        return value if isinstance(value, bool) else default

    fps = int(bounded("fps", 30, 24, 60))
    if fps not in {24, 30, 60}:
        fps = 30
    quality = str(settings.get("quality", "balanced"))
    bitrate = {"compact": "3500k", "balanced": "6000k", "high": "9000k"}.get(quality, "6000k")
    # libx264 encoder preset: trades file-size efficiency for encode speed. "compact" is
    # meant for quick review/draft renders, so it uses the fastest preset rather than the
    # ffmpeg default ("medium"), which is a large, low-risk win for iteration speed.
    encoder_preset = {"compact": "veryfast", "balanced": "medium", "high": "slow"}.get(quality, "medium")
    crop_anchor = str(settings.get("crop_anchor", "center"))
    if crop_anchor not in {"left", "center", "right"}:
        crop_anchor = "center"
    speed = bounded("speed", 1, .5, 2)
    volume = bounded("volume", 100, 0, 200) / 100
    fade_in, fade_out = bounded("fade_in", .08, 0, 2), bounded("fade_out", .08, 0, 2)
    look = str(settings.get("look", "natural"))
    if look not in {"natural", "punchy", "mono", "night"}:
        look = "natural"
    brightness, contrast, gamma = bounded("brightness", 0, -40, 40), bounded("contrast", 0, -40, 55), bounded("gamma", 1, .65, 1.55)
    platform = str(settings.get("platform", "reels_tiktok_shorts"))
    dims = PLATFORM_PRESETS.get(platform, PLATFORM_PRESETS["reels_tiktok_shorts"])
    target_w, target_h = int(dims["width"]), int(dims["height"])
    captions_enabled = enabled("captions_enabled", True)
    caption_color = str(settings.get("caption_color", "#FFFFFF"))
    if not (caption_color.startswith("#") and len(caption_color) in {4, 7, 9}):
        caption_color = "#FFFFFF"
    caption_size = int(bounded("caption_size", 78, 38, 110))
    caption_center_y = int(bounded("caption_y", 74, 48, 84) * target_h / 100)
    caption_stroke = int(bounded("caption_stroke", 3, 0, 8))
    caption_bg = enabled("caption_bg", False)
    caption_bg_color = str(settings.get("caption_bg_color", "#000000"))
    if not (caption_bg_color.startswith("#") and len(caption_bg_color) in {4, 7, 9}):
        caption_bg_color = "#000000"
    font_path = caption_font()
    if captions_enabled and not font_path:
        raise RuntimeError("No usable local font was found for captions. Set LOCAL_STUDIO_FONT to a .ttf/.otf file path, install a system font, or disable captions for this render.")
    source = Path(project["source_path"])
    output = Path(project["output_path"])
    if not source.exists():
        raise RuntimeError(f"Source file does not exist: {source}")
    output.parent.mkdir(parents=True, exist_ok=True)
    clips_data = timeline.get("clips", [])
    cuts = []
    total_entries = max(len(clips_data), 1)
    with VideoFileClip(str(source)) as source_clip:
        for position, entry in enumerate(clips_data):
            if should_cancel and should_cancel():
                raise RuntimeError("Render cancelled.")
            if not entry.get("keep", True):
                continue
            start, end = float(entry["in"]), float(entry["out"])
            if end <= start or start < 0 or end > source_clip.duration + .05:
                continue
            cut = source_clip.subclipped(start, end)
            effects = []
            if speed != 1:
                effects.append(vfx.MultiplySpeed(speed))
            if look == "punchy":
                effects.append(vfx.LumContrast(lum=4, contrast=24))
            elif look == "night":
                effects.append(vfx.LumContrast(lum=11, contrast=-8))
            elif look == "mono":
                effects.append(vfx.BlackAndWhite())
            if brightness or contrast:
                effects.append(vfx.LumContrast(lum=brightness, contrast=contrast))
            if gamma != 1:
                effects.append(vfx.GammaCorrection(gamma))
            if enabled("mirror"):
                effects.append(vfx.MirrorX())
            if fade_in:
                effects.append(vfx.FadeIn(fade_in))
            if fade_out:
                effects.append(vfx.FadeOut(fade_out))
            if effects:
                cut = cut.with_effects(effects)
            if (int(cut.w), int(cut.h)) != (target_w, target_h):
                scale = min(target_w / float(cut.w), target_h / float(cut.h))
                new_w = max(2, int(cut.w * scale) // 2 * 2)
                new_h = max(2, int(cut.h * scale) // 2 * 2)
                cut = cut.resized(new_size=(new_w, new_h))
                if (new_w, new_h) != (target_w, target_h):
                    x = 0 if crop_anchor == "left" else (target_w - new_w) if crop_anchor == "right" else (target_w - new_w) // 2
                    y = (target_h - new_h) // 2
                    bg = ColorClip(size=(target_w, target_h), color=(0, 0, 0)).with_duration(cut.duration)
                    cut = CompositeVideoClip([bg, cut.with_position((x, y))], size=(target_w, target_h))
            if cut.audio:
                if enabled("mute_audio"):
                    cut = cut.without_audio()
                else:
                    audio_effects = [afx.AudioFadeIn(fade_in), afx.AudioFadeOut(fade_out)]
                    if enabled("normalize_audio"):
                        audio_effects.insert(0, afx.AudioNormalize())
                    if volume != 1:
                        audio_effects.append(afx.MultiplyVolume(volume))
                    cut = cut.with_audio(cut.audio.with_effects(audio_effects))
            caption = str(entry.get("caption", "")).strip()
            word_timings = entry.get("word_timings")
            caption_layers = []

            def caption_layer(text: str, duration: float, start: float = 0) -> TextClip:
                horizontal_margin = max(8, int(caption_size * .18))
                vertical_margin = max(6, int(caption_size * .14))
                text_width = max(200, int(target_w * .85) - horizontal_margin * 2)
                text_height = max(int(caption_size * 1.45), int(target_h * .055))
                layer = TextClip(
                    font=font_path,
                    text=text,
                    font_size=caption_size,
                    color=caption_color,
                    bg_color=caption_bg_color if caption_bg else None,
                    stroke_color="black",
                    stroke_width=caption_stroke,
                    size=(text_width, text_height),
                    margin=(horizontal_margin, vertical_margin),
                    method="caption",
                    vertical_align="center",
                )
                top = max(0, min(int(caption_center_y - layer.h / 2), target_h - int(layer.h)))
                return layer.with_start(start).with_duration(duration).with_position(("center", top))

            if captions_enabled and isinstance(word_timings, list) and word_timings:
                for word_entry in word_timings[:200]:
                    if not isinstance(word_entry, dict):
                        continue
                    word_text = str(word_entry.get("text", "")).strip()
                    try:
                        word_start, word_end = float(word_entry.get("start")), float(word_entry.get("end"))
                    except (TypeError, ValueError):
                        continue
                    if not word_text or word_end <= word_start or word_start < 0 or word_start > cut.duration:
                        continue
                    word_duration = min(word_end, cut.duration) - word_start
                    if word_duration <= 0:
                        continue
                    caption_layers.append(caption_layer(word_text, word_duration, word_start))
            elif caption and captions_enabled:
                caption_layers.append(caption_layer(caption, cut.duration))
            if caption_layers:
                cut = CompositeVideoClip([cut, *caption_layers], size=(target_w, target_h))
            cuts.append(cut)
            if progress_cb:
                progress_cb(min(90, int(90 * (position + 1) / total_entries)))
        if not cuts:
            raise RuntimeError("No valid kept clips are available to render.")
        if should_cancel and should_cancel():
            raise RuntimeError("Render cancelled.")
        final = concatenate_videoclips(cuts, method="compose")
        music_value = str(settings.get("music_track", "")).strip()
        if music_value:
            music_path = workspace_path(music_value)
            if not music_path.exists():
                raise RuntimeError(f"Music track does not exist: {music_path}")
            music_gain = bounded("music_volume", 30, 0, 100) / 100
            with AudioFileClip(str(music_path)) as music_clip:
                music = music_clip.with_effects([afx.MultiplyVolume(music_gain)])
                music = music.with_effects([afx.AudioLoop(duration=final.duration)]) if enabled("music_loop", True) else music.subclipped(0, min(music.duration, final.duration))
                final = final.with_audio(CompositeAudioClip([final.audio, music]) if final.audio else music)
        has_audio = bool(final.audio)
        if progress_cb:
            progress_cb(92)
        final.write_videofile(str(output), fps=fps, codec="libx264", audio_codec="aac", bitrate=bitrate, threads=4, logger=None, ffmpeg_params=["-preset", encoder_preset, "-movflags", "+faststart"])
        final.close()
    if progress_cb:
        progress_cb(100)
    return {"output_path": str(output), "format": "mp4", "video": "H.264", "audio": "AAC" if has_audio else "none", "width": target_w, "height": target_h, "platform": platform, "fps": fps, "bitrate": bitrate, "render_settings": {"crop_anchor": crop_anchor, "speed": speed, "look": look, "captions_enabled": captions_enabled, "quality": quality}}



"""Local-only media analysis for encrypted Runner editing packages."""

from __future__ import annotations

import json
import os
import shutil
import struct
import subprocess
import tempfile
import wave
from pathlib import Path
from typing import Any

import config
from config import require_path, utc_now
from db import db, row_dict


def _run(args: list[str], timeout: int = 300) -> subprocess.CompletedProcess[str]:
    return subprocess.run(args, capture_output=True, text=True, timeout=timeout, check=False)


def _ffmpeg_binary() -> str:
    value = shutil.which("ffmpeg")
    if value:
        return value
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except (ImportError, RuntimeError):
        return ""


def _probe(source: Path) -> dict[str, Any]:
    ffprobe = shutil.which("ffprobe")
    if not ffprobe:
        try:
            from moviepy import VideoFileClip
            with VideoFileClip(str(source)) as clip:
                return {"status": "ready", "duration": float(clip.duration), "format": {"size": source.stat().st_size}, "streams": [{"codec_type": "video", "width": int(clip.w), "height": int(clip.h), "r_frame_rate": str(clip.fps)}, *([{"codec_type": "audio"}] if clip.audio else [])]}
        except Exception as exc:
            return {"status": "unavailable", "reason": f"ffprobe_not_found: {exc}"}
    result = _run([ffprobe, "-v", "error", "-show_entries", "format=duration,size:stream=index,codec_type,codec_name,width,height,r_frame_rate,sample_rate,channels", "-of", "json", str(source)], 60)
    if result.returncode:
        return {"status": "failed", "reason": result.stderr.strip()[:800]}
    value = json.loads(result.stdout)
    duration = float((value.get("format") or {}).get("duration") or 0)
    return {"status": "ready", "duration": duration, "format": value.get("format", {}), "streams": value.get("streams", [])}


def _thumbnails(project_id: str, source: Path, duration: float, count: int = 6) -> list[dict[str, Any]]:
    ffmpeg = _ffmpeg_binary()
    if not ffmpeg or duration <= 0:
        return []
    root = config.DATA_DIR / "analysis" / project_id / "thumbnails"
    root.mkdir(parents=True, exist_ok=True)
    values: list[dict[str, Any]] = []
    for index in range(count):
        at = duration * (index + 1) / (count + 1)
        destination = root / f"scene-{index + 1:02d}.jpg"
        result = _run([ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-ss", f"{at:.3f}", "-i", str(source), "-frames:v", "1", "-vf", "scale=320:-2", "-q:v", "5", str(destination)], 90)
        if result.returncode == 0 and destination.exists():
            values.append({"id": f"scene-{index + 1:02d}", "at": round(at, 3), "path": str(destination), "size_bytes": destination.stat().st_size})
    return values


def _parse_whisper_json(value: dict[str, Any]) -> list[dict[str, Any]]:
    words: list[dict[str, Any]] = []
    source = value.get("transcription") or value.get("segments") or []
    for segment in source if isinstance(source, list) else []:
        if not isinstance(segment, dict):
            continue
        timestamps = segment.get("timestamps") if isinstance(segment.get("timestamps"), dict) else {}
        try:
            start = float(timestamps.get("from", segment.get("start", 0)))
            end = float(timestamps.get("to", segment.get("end", start)))
            if start > 1000 or end > 1000:
                start, end = start / 1000, end / 1000
        except (TypeError, ValueError):
            continue
        text = str(segment.get("text", "")).strip()
        if text and end > start:
            words.append({"start": round(start, 3), "end": round(end, 3), "text": text})
    return words


def _whisper_language(value: dict[str, Any]) -> str:
    result = value.get("result") if isinstance(value.get("result"), dict) else {}
    raw = str(result.get("language") or value.get("language") or "").strip().lower()
    return raw[:8]


def skipped_transcript(reason: str) -> dict[str, Any]:
    return {"status": "skipped", "engine": "off", "words": [], "caption_cues": [], "reason": reason}


def project_wants_captions(project: dict[str, Any]) -> bool:
    spec_id = str(project.get("edit_spec_id") or "").strip()
    if not spec_id:
        return False
    with db() as conn:
        row = conn.execute("SELECT spec_json FROM edit_specs WHERE id = ?", (spec_id,)).fetchone()
    if not row:
        return False
    raw = row["spec_json"] if isinstance(row, dict) or hasattr(row, "keys") else row[0]
    spec = raw if isinstance(raw, dict) else json.loads(raw or "{}")
    return bool(spec.get("captions"))


def project_caption_language(project: dict[str, Any]) -> str:
    spec_id = str(project.get("edit_spec_id") or "").strip()
    if spec_id:
        with db() as conn:
            row = conn.execute("SELECT spec_json FROM edit_specs WHERE id = ?", (spec_id,)).fetchone()
        if row:
            raw = row["spec_json"] if isinstance(row, dict) or hasattr(row, "keys") else row[0]
            spec = raw if isinstance(raw, dict) else json.loads(raw or "{}")
            language = str(spec.get("language") or "").strip().lower()[:8]
            if language:
                return language
    return str(project.get("language") or "ko").strip().lower()[:8] or "ko"


def _merge_windows(windows: list[dict[str, float]], gap: float = 0.2, min_len: float = 0.25) -> list[dict[str, float]]:
    ordered = sorted((item for item in windows if item.get("end", 0) > item.get("start", 0)), key=lambda item: item["start"])
    merged: list[dict[str, float]] = []
    for window in ordered:
        if merged and window["start"] - merged[-1]["end"] <= gap:
            merged[-1]["end"] = max(merged[-1]["end"], window["end"])
        else:
            merged.append({"start": float(window["start"]), "end": float(window["end"])})
    return [item for item in merged if item["end"] - item["start"] >= min_len]


def _energy_windows(wav_path: Path) -> list[dict[str, float]]:
    with wave.open(str(wav_path), "rb") as handle:
        rate = handle.getframerate() or 16000
        frames = handle.readframes(handle.getnframes())
        width = handle.getsampwidth()
    if width != 2 or len(frames) < 4:
        return []
    samples = struct.unpack("<%dh" % (len(frames) // 2), frames)
    hop = max(1, int(rate * 0.03))
    energies: list[float] = []
    for index in range(0, len(samples), hop):
        chunk = samples[index:index + hop]
        if not chunk:
            break
        energies.append((sum(sample * sample for sample in chunk) / len(chunk)) ** 0.5)
    peak = max(energies) if energies else 0.0
    if peak <= 0:
        return []
    thresh = peak * 0.15
    windows: list[dict[str, float]] = []
    start: float | None = None
    for index, energy in enumerate(energies):
        at = index * hop / rate
        if energy >= thresh:
            if start is None:
                start = at
        elif start is not None:
            windows.append({"start": round(start, 3), "end": round(at, 3)})
            start = None
    if start is not None:
        windows.append({"start": round(start, 3), "end": round(len(samples) / rate, 3)})
    return _merge_windows(windows)


def _silero_windows(wav_path: Path) -> list[dict[str, float]]:
    try:
        from silero_vad import get_speech_timestamps, load_silero_vad, read_audio
    except ImportError:
        return []
    model = load_silero_vad()
    wav = read_audio(str(wav_path))
    stamps = get_speech_timestamps(wav, model, return_seconds=True)
    windows = []
    for item in stamps if isinstance(stamps, list) else []:
        if isinstance(item, dict) and float(item.get("end", 0)) > float(item.get("start", 0)):
            windows.append({"start": round(float(item["start"]), 3), "end": round(float(item["end"]), 3)})
    return _merge_windows(windows)


def speech_windows(wav_path: Path) -> tuple[list[dict[str, float]], str]:
    silero = _silero_windows(wav_path)
    if silero:
        return silero, "silero"
    energy = _energy_windows(wav_path)
    return energy, "energy" if energy else "none"


def caption_cues_from_words(words: list[dict[str, Any]], max_seconds: float = 2.4) -> list[dict[str, Any]]:
    cues: list[dict[str, Any]] = []
    buf: list[dict[str, Any]] = []
    start: float | None = None
    last_end: float | None = None
    for word in words:
        try:
            word_start, word_end = float(word["start"]), float(word["end"])
        except (KeyError, TypeError, ValueError):
            continue
        text = str(word.get("text") or "").strip()
        if not text or word_end <= word_start:
            continue
        if start is None:
            start = word_start
        if last_end is not None and (word_start - last_end > 0.45 or word_end - start >= max_seconds):
            cues.append({"start": round(start, 3), "end": round(last_end, 3), "text": " ".join(str(item.get("text") or "").strip() for item in buf)})
            buf = []
            start = word_start
        buf.append({"start": word_start, "end": word_end, "text": text})
        last_end = word_end
    if buf and start is not None and last_end is not None:
        cues.append({"start": round(start, 3), "end": round(last_end, 3), "text": " ".join(str(item.get("text") or "").strip() for item in buf)})
    return cues


def apply_caption_cues_to_timeline(timeline: dict[str, Any], cues: list[dict[str, Any]]) -> tuple[dict[str, Any], bool]:
    if not isinstance(timeline, dict) or not cues:
        return timeline, False
    clips = timeline.get("clips")
    if not isinstance(clips, list):
        return timeline, False
    changed = False
    for clip in clips:
        if not isinstance(clip, dict) or not clip.get("keep", True):
            continue
        try:
            start, end = float(clip.get("in", 0)), float(clip.get("out", 0))
        except (TypeError, ValueError):
            continue
        overlapping = [cue for cue in cues if float(cue.get("end", 0)) > start and float(cue.get("start", 0)) < end]
        if not overlapping:
            continue
        clip["caption"] = " ".join(str(cue.get("text") or "").strip() for cue in overlapping if str(cue.get("text") or "").strip())
        clip["word_timings"] = [
            {
                "text": str(cue.get("text") or "").strip(),
                "start": round(max(0.0, float(cue["start"]) - start), 3),
                "end": round(max(0.0, float(cue["end"]) - start), 3),
            }
            for cue in overlapping
            if str(cue.get("text") or "").strip()
        ]
        changed = True
    return timeline, changed


def _offset_words(words: list[dict[str, Any]], offset: float) -> list[dict[str, Any]]:
    shifted: list[dict[str, Any]] = []
    for word in words:
        try:
            shifted.append({**word, "start": round(float(word["start"]) + offset, 3), "end": round(float(word["end"]) + offset, 3)})
        except (KeyError, TypeError, ValueError):
            continue
    return shifted


def _run_whisper(wav: Path, prefix: Path, language: str = "") -> dict[str, Any]:
    whisper = os.getenv("WHISPER_CPP_BINARY", "").strip() or shutil.which("whisper-cli") or ""
    model = os.getenv("WHISPER_CPP_MODEL", "").strip()
    if not whisper or not Path(whisper).exists() or not model or not Path(model).exists():
        return {"status": "unavailable", "engine": "whisper.cpp", "words": [], "reason": "Set WHISPER_CPP_BINARY and WHISPER_CPP_MODEL; ffmpeg is also required."}
    args = [whisper, "-m", model, "-f", str(wav), "-oj", "-ojf", "-of", str(prefix)]
    vad_model = os.getenv("WHISPER_CPP_VAD_MODEL", "").strip()
    if vad_model and Path(vad_model).exists():
        args.extend(["--vad", "--vad-model", vad_model])
    hint = language[:2] if language[:2] in {"ko", "en", "zh", "ja"} else ""
    if hint:
        args.extend(["-l", hint])
    transcribed = _run(args, 3600)
    json_path = prefix.with_suffix(".json")
    if transcribed.returncode or not json_path.exists():
        return {"status": "failed", "engine": "whisper.cpp", "words": [], "reason": transcribed.stderr.strip()[:800]}
    payload = json.loads(json_path.read_text(encoding="utf-8"))
    words = _parse_whisper_json(payload)
    return {
        "status": "ready",
        "engine": "whisper.cpp",
        "words": words,
        "text": " ".join(item["text"] for item in words),
        "language": _whisper_language(payload) or hint,
    }


def _transcript(source: Path, language: str = "") -> dict[str, Any]:
    ffmpeg = _ffmpeg_binary()
    if not ffmpeg:
        return {"status": "unavailable", "engine": "whisper.cpp", "words": [], "caption_cues": [], "reason": "Set WHISPER_CPP_BINARY and WHISPER_CPP_MODEL; ffmpeg is also required."}
    with tempfile.TemporaryDirectory(prefix="grok-crew-whisper-") as folder:
        wav, prefix = Path(folder) / "audio.wav", Path(folder) / "transcript"
        extracted = _run([ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-i", str(source), "-vn", "-ac", "1", "-ar", "16000", str(wav)], 600)
        if extracted.returncode:
            return {"status": "failed", "engine": "whisper.cpp", "words": [], "caption_cues": [], "reason": extracted.stderr.strip()[:800]}
        windows, vad_engine = speech_windows(wav)
        vad_model = os.getenv("WHISPER_CPP_VAD_MODEL", "").strip()
        use_builtin_vad = bool(vad_model and Path(vad_model).exists())
        if use_builtin_vad or not windows:
            result = _run_whisper(wav, prefix, language)
            result["vad"] = "whisper-vad" if use_builtin_vad else vad_engine
            if result.get("status") == "ready":
                result["caption_cues"] = caption_cues_from_words(result.get("words") or [])
            else:
                result["caption_cues"] = []
            return result
        words: list[dict[str, Any]] = []
        detected = ""
        for index, window in enumerate(windows[:80]):
            clip = Path(folder) / f"speech-{index:02d}.wav"
            cut = _run([
                ffmpeg, "-hide_banner", "-loglevel", "error", "-y",
                "-ss", f"{window['start']:.3f}", "-to", f"{window['end']:.3f}",
                "-i", str(wav), "-ac", "1", "-ar", "16000", str(clip),
            ], 120)
            if cut.returncode or not clip.exists():
                continue
            piece = _run_whisper(clip, Path(folder) / f"speech-{index:02d}", language)
            if piece.get("status") != "ready":
                continue
            words.extend(_offset_words(piece.get("words") or [], float(window["start"])))
            detected = detected or str(piece.get("language") or "")
        if not words:
            return {"status": "failed", "engine": "whisper.cpp", "words": [], "caption_cues": [], "vad": vad_engine, "reason": "No speech windows produced text."}
        return {
            "status": "ready",
            "engine": "whisper.cpp",
            "vad": vad_engine,
            "words": words,
            "text": " ".join(item["text"] for item in words),
            "language": detected or language[:2],
            "caption_cues": caption_cues_from_words(words),
        }


def get_analysis(project_id: str) -> dict[str, Any] | None:
    with db() as conn:
        return row_dict(conn.execute("SELECT * FROM project_analysis WHERE project_id = ?", (project_id,)).fetchone())


def analyze_project(project: dict[str, Any], want_transcript: bool | None = None) -> dict[str, Any]:
    source = require_path(project["source_path"], "source_path")
    if not source.exists():
        raise ValueError("Project source does not exist.")
    media = _probe(source)
    thumbnails = _thumbnails(project["id"], source, float(media.get("duration", 0)))
    dest_language = project_caption_language(project)
    if want_transcript is None:
        want_transcript = project_wants_captions(project)
    if want_transcript:
        transcript = _transcript(source, dest_language)
        source_language = str(transcript.get("language") or "").strip().lower()[:2]
        dest = dest_language[:2]
        transcript["translate"] = bool(source_language and dest and source_language != dest)
        transcript["caption_language"] = dest_language
        if transcript.get("status") == "ready":
            cues = transcript.get("caption_cues") or caption_cues_from_words(transcript.get("words") or [])
            transcript["caption_cues"] = cues
            raw_timeline = project.get("timeline_json")
            timeline = raw_timeline if isinstance(raw_timeline, dict) else {}
            updated, changed = apply_caption_cues_to_timeline(timeline, cues)
            if changed:
                with db() as conn:
                    conn.execute(
                        "UPDATE projects SET timeline_json = ?, updated_at = ? WHERE id = ?",
                        (json.dumps(updated), utc_now(), project["id"]),
                    )
    else:
        transcript = skipped_transcript("Auto captions are off. Speech recognition stays unused.")
    status = "ready" if media.get("status") == "ready" and thumbnails else "partial"
    now = utc_now()
    with db() as conn:
        conn.execute("""INSERT INTO project_analysis
            (project_id, status, media_json, transcript_json, thumbnails_json, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(project_id) DO UPDATE SET status = excluded.status, media_json = excluded.media_json,
            transcript_json = excluded.transcript_json, thumbnails_json = excluded.thumbnails_json,
            error_text = NULL, updated_at = excluded.updated_at""",
            (project["id"], status, json.dumps(media), json.dumps(transcript), json.dumps(thumbnails), now, now))
    return get_analysis(project["id"]) or {}

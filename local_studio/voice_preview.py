"""Kokoro-82M greeting previews for the Start TTS picker.

Bundled wavs are rendered with hexgrad/Kokoro-82M. Live synthesis is optional
and only used when a wav is missing and a synthesizer (or the kokoro package)
is available. This module never invents a second engine.
"""

from __future__ import annotations

import shutil
import sys
import wave
from pathlib import Path
from typing import Any, Callable, Iterable

import config

SCHEMA = "grok-crew.voice-preview/v1"
ENGINE = "kokoro-82m"
REPO = "hexgrad/Kokoro-82M"
SAMPLE_RATE = 24000
MIN_WAV_BYTES = 44 + 800

GENDERS = ("female", "male")
FEELS = ("warm", "clear", "bright", "calm")
ACCENTS = ("ko", "en-us", "en-gb", "zh", "ja")

DEFAULT_GENDER = "female"
DEFAULT_FEEL = "warm"
DEFAULT_ACCENT = "ko"
DEFAULT_SPEAKER_ID = "af_heart"

PHRASES: dict[str, str] = {
    "ko": "안녕하세요 Grok Crew 입니다 잘부탁드려요",
    "en-us": "Hello. This is Grok Crew. Nice to meet you.",
    "en-gb": "Hello. This is Grok Crew. Nice to meet you.",
    "zh": "你好，我是 Grok Crew，请多关照。",
    "ja": "こんにちは。Grok Crewです。よろしくお願いします。",
}

LANG_CODE: dict[str, str] = {
    "ko": "a",
    "en-us": "a",
    "en-gb": "b",
    "zh": "z",
    "ja": "j",
}

SPEED: dict[str, float] = {
    "warm": 0.94,
    "clear": 1.0,
    "bright": 1.08,
    "calm": 0.88,
}

SPEAKERS: dict[str, str] = {
    "female:warm:ko": "af_heart",
    "female:warm:en-us": "af_heart",
    "female:warm:en-gb": "bf_emma",
    "female:warm:zh": "zf_xiaoxiao",
    "female:warm:ja": "jf_alpha",
    "female:clear:ko": "af_sarah",
    "female:clear:en-us": "af_sarah",
    "female:clear:en-gb": "bf_alice",
    "female:clear:zh": "zf_xiaoyi",
    "female:clear:ja": "jf_nezumi",
    "female:bright:ko": "af_nova",
    "female:bright:en-us": "af_nova",
    "female:bright:en-gb": "bf_lily",
    "female:bright:zh": "zf_xiaoni",
    "female:bright:ja": "jf_tebukuro",
    "female:calm:ko": "af_river",
    "female:calm:en-us": "af_river",
    "female:calm:en-gb": "bf_isabella",
    "female:calm:zh": "zf_xiaobei",
    "female:calm:ja": "jf_gongitsune",
    "male:warm:ko": "am_liam",
    "male:warm:en-us": "am_liam",
    "male:warm:en-gb": "bm_george",
    "male:warm:zh": "zm_yunxia",
    "male:warm:ja": "jm_kumo",
    "male:clear:ko": "am_michael",
    "male:clear:en-us": "am_michael",
    "male:clear:en-gb": "bm_daniel",
    "male:clear:zh": "zm_yunxi",
    "male:clear:ja": "jm_kumo",
    "male:bright:ko": "am_puck",
    "male:bright:en-us": "am_puck",
    "male:bright:en-gb": "bm_fable",
    "male:bright:zh": "zm_yunyang",
    "male:bright:ja": "jm_kumo",
    "male:calm:ko": "am_onyx",
    "male:calm:en-us": "am_onyx",
    "male:calm:en-gb": "bm_lewis",
    "male:calm:zh": "zm_yunjian",
    "male:calm:ja": "jm_kumo",
}

SynthesizeFn = Callable[..., list[float]]
_pipelines: dict[str, Any] = {}


def resolve_gender(value: Any = None) -> str:
    raw = str(value or "").strip().lower()
    return raw if raw in GENDERS else DEFAULT_GENDER


def resolve_feel(value: Any = None) -> str:
    raw = str(value or "").strip().lower()
    return raw if raw in FEELS else DEFAULT_FEEL


def resolve_accent(value: Any = None) -> str:
    raw = str(value or "").strip().lower()
    return raw if raw in ACCENTS else DEFAULT_ACCENT


def resolve_speaker_id(gender: str, feel: str, accent: str) -> str:
    return SPEAKERS.get(f"{gender}:{feel}:{accent}", DEFAULT_SPEAKER_ID)


def preview_phrase(accent: str) -> str:
    return PHRASES.get(accent, PHRASES[DEFAULT_ACCENT])


def preview_lang_code(accent: str) -> str:
    return LANG_CODE.get(accent, "a")


def preview_speed(feel: str) -> float:
    return SPEED.get(feel, 1.0)


def preview_filename(gender: str, feel: str, accent: str) -> str:
    return f"{resolve_gender(gender)}__{resolve_feel(feel)}__{resolve_accent(accent)}.wav"


def preview_workspace_dir() -> Path:
    return (config.WORKSPACE_DIR / "voice-previews").resolve()


def bundled_preview_dir() -> Path:
    here = Path(__file__).resolve().parent
    candidates = [
        here / "assets" / "voice-previews",
        here.parent / "public" / "voice-previews",
    ]
    if getattr(sys, "frozen", False):
        candidates.insert(0, Path(sys.executable).resolve().parent / "assets" / "voice-previews")
        meipass = getattr(sys, "_MEIPASS", None)
        if meipass:
            candidates.insert(0, Path(meipass) / "assets" / "voice-previews")
    for candidate in candidates:
        if candidate.is_dir():
            return candidate
    return here / "assets" / "voice-previews"


def write_pcm16_wav(path: Path, samples: Iterable[float], sample_rate: int = SAMPLE_RATE) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    frames = bytearray()
    count = 0
    for value in samples:
        clipped = max(-1.0, min(1.0, float(value)))
        frames.extend(int(round(clipped * 32767.0)).to_bytes(2, "little", signed=True))
        count += 1
    if count < 160:
        raise ValueError("Kokoro-82M preview audio was too short.")
    with wave.open(str(path), "wb") as handle:
        handle.setnchannels(1)
        handle.setsampwidth(2)
        handle.setframerate(int(sample_rate))
        handle.writeframes(frames)


def wav_is_ready(path: Path) -> bool:
    return path.is_file() and path.stat().st_size >= MIN_WAV_BYTES


def _as_floats(audio: Any) -> list[float]:
    if audio is None:
        return []
    if hasattr(audio, "detach"):
        audio = audio.detach().cpu().numpy()
    if hasattr(audio, "reshape"):
        audio = audio.reshape(-1)
    if hasattr(audio, "tolist"):
        return [float(item) for item in audio.tolist()]
    return [float(item) for item in audio]


def synthesize_with_kokoro(text: str, speaker_id: str, lang_code: str, speed: float) -> list[float]:
    try:
        from kokoro import KPipeline
    except ImportError as exc:
        raise ValueError("Kokoro-82M is not installed on this PC.") from exc
    pipeline = _pipelines.get(lang_code)
    if pipeline is None:
        pipeline = KPipeline(lang_code=lang_code, repo_id=REPO)
        _pipelines[lang_code] = pipeline
    chunks: list[float] = []
    for _gs, _ps, audio in pipeline(text, voice=speaker_id, speed=float(speed)):
        chunks.extend(_as_floats(audio))
    if len(chunks) < 160:
        raise ValueError("Kokoro-82M returned no preview audio.")
    return chunks


def provision_preview_audio() -> int:
    """Copy bundled Kokoro greetings into the workspace so /media can serve them."""
    root = bundled_preview_dir()
    if not root.is_dir():
        return 0
    dest = preview_workspace_dir()
    dest.mkdir(parents=True, exist_ok=True)
    copied = 0
    for src in sorted(root.glob("*.wav")):
        target = dest / src.name
        if wav_is_ready(target):
            continue
        if not wav_is_ready(src):
            continue
        shutil.copy2(src, target)
        copied += 1
    return copied


def _copy_bundled(name: str) -> Path | None:
    bundled = bundled_preview_dir() / name
    if not wav_is_ready(bundled):
        return None
    dest = preview_workspace_dir() / name
    dest.parent.mkdir(parents=True, exist_ok=True)
    if not wav_is_ready(dest) or dest.stat().st_mtime < bundled.stat().st_mtime:
        shutil.copy2(bundled, dest)
    return dest if wav_is_ready(dest) else None


def make_voice_preview(
    body: dict[str, Any] | None = None,
    *,
    synthesize: SynthesizeFn | None = None,
) -> dict[str, Any]:
    payload = body if isinstance(body, dict) else {}
    gender = resolve_gender(payload.get("gender"))
    feel = resolve_feel(payload.get("feel"))
    accent = resolve_accent(payload.get("accent"))
    speaker_id = str(payload.get("speaker_id") or payload.get("speakerId") or "").strip()
    if not speaker_id:
        speaker_id = resolve_speaker_id(gender, feel, accent)
    text = preview_phrase(accent)
    lang_code = preview_lang_code(accent)
    speed = preview_speed(feel)
    name = preview_filename(gender, feel, accent)
    dest = preview_workspace_dir() / name
    source = "cache"
    if wav_is_ready(dest):
        source = "cache"
    else:
        copied = _copy_bundled(name)
        if copied is not None:
            dest = copied
            source = "bundled"
        else:
            synth = synthesize if synthesize is not None else synthesize_with_kokoro
            try:
                samples = synth(text=text, speaker_id=speaker_id, lang_code=lang_code, speed=speed)
            except TypeError:
                samples = synth(text, speaker_id, lang_code, speed)
            write_pcm16_wav(dest, samples)
            source = "synthesized"
    if not wav_is_ready(dest):
        raise ValueError("Kokoro-82M preview audio is not on this PC.")
    return {
        "schema": SCHEMA,
        "engine": ENGINE,
        "repo": REPO,
        "speaker_id": speaker_id,
        "gender": gender,
        "feel": feel,
        "accent": accent,
        "lang_code": lang_code,
        "speed": speed,
        "text": text,
        "sample_rate": SAMPLE_RATE,
        "source": source,
        "path": str(dest),
        "url": f"/media/voice-previews/{name}",
    }

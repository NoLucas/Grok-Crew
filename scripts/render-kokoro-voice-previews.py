#!/usr/bin/env python3
"""Render Start TTS greetings with hexgrad/Kokoro-82M. Run from a venv that has kokoro."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "local_studio"))

from voice_preview import (  # noqa: E402
    ACCENTS,
    ENGINE,
    FEELS,
    GENDERS,
    REPO,
    SAMPLE_RATE,
    SCHEMA,
    preview_filename,
    preview_lang_code,
    preview_phrase,
    preview_speed,
    resolve_speaker_id,
    synthesize_with_kokoro,
    write_pcm16_wav,
)


def main() -> int:
    dest = ROOT / "local_studio" / "assets" / "voice-previews"
    dest.mkdir(parents=True, exist_ok=True)
    public = ROOT / "public" / "voice-previews"
    public.mkdir(parents=True, exist_ok=True)
    rendered: list[dict[str, object]] = []
    failed: list[str] = []
    for gender in GENDERS:
        for feel in FEELS:
            for accent in ACCENTS:
                name = preview_filename(gender, feel, accent)
                path = dest / name
                speaker_id = resolve_speaker_id(gender, feel, accent)
                text = preview_phrase(accent)
                lang_code = preview_lang_code(accent)
                speed = preview_speed(feel)
                print(f"render {name} speaker={speaker_id} lang={lang_code}", flush=True)
                try:
                    samples = synthesize_with_kokoro(text, speaker_id, lang_code, speed)
                    write_pcm16_wav(path, samples)
                    public_path = public / name
                    public_path.write_bytes(path.read_bytes())
                    rendered.append(
                        {
                            "file": name,
                            "speaker_id": speaker_id,
                            "gender": gender,
                            "feel": feel,
                            "accent": accent,
                            "lang_code": lang_code,
                            "text": text,
                            "bytes": path.stat().st_size,
                        }
                    )
                except Exception as exc:  # noqa: BLE001
                    failed.append(f"{name}: {exc}")
                    print(f"FAIL {name}: {exc}", flush=True)
    manifest = {
        "schema": SCHEMA,
        "engine": ENGINE,
        "repo": REPO,
        "sample_rate": SAMPLE_RATE,
        "count": len(rendered),
        "files": rendered,
        "failed": failed,
    }
    (dest / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (public / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {len(rendered)} Kokoro-82M previews; failed {len(failed)}", flush=True)
    return 0 if rendered and not failed else 1


if __name__ == "__main__":
    raise SystemExit(main())

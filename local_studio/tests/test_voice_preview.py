import json
from pathlib import Path
from urllib.request import Request, urlopen

import voice_preview
from tests.test_api import post
from voice_preview import (
    DEFAULT_SPEAKER_ID,
    ENGINE,
    make_voice_preview,
    preview_filename,
    preview_lang_code,
    preview_phrase,
    preview_workspace_dir,
    provision_preview_audio,
    resolve_requested_speaker_id,
    resolve_speaker_id,
    write_pcm16_wav,
)


def fake_synth(**_kwargs):
    return [0.2, -0.2] * 240


def test_repo_ships_real_kokoro_wavs():
    root = Path(__file__).resolve().parents[1] / "assets" / "voice-previews"
    manifest = json.loads((root / "manifest.json").read_text(encoding="utf-8"))
    assert manifest["engine"] == ENGINE
    assert manifest["count"] == 40
    sample = root / "female__warm__ko.wav"
    assert sample.read_bytes()[:4] == b"RIFF"
    assert sample.stat().st_size > 10_000


def test_preview_maps_match_desk_personas():
    assert resolve_speaker_id("female", "warm", "ko") == DEFAULT_SPEAKER_ID
    assert resolve_speaker_id("male", "calm", "en-gb") == "bm_lewis"
    assert resolve_speaker_id("female", "bright", "zh") == "zf_xiaoni"
    assert preview_lang_code("en-gb") == "b"
    assert preview_lang_code("zh") == "z"
    assert preview_lang_code("ja") == "j"
    assert preview_lang_code("ko") == "a"
    assert preview_phrase("ko").startswith("안녕하세요")
    assert preview_filename("female", "warm", "ko") == "female__warm__ko.wav"
    assert voice_preview.resolve_accent("ko") == "en-us"
    assert voice_preview.resolve_accent("ko", "kokoro-82m") == "en-us"
    assert voice_preview.resolve_accent("ja", "kokoro-82m") == "ja"


def test_preview_copies_bundled_kokoro_wav(studio, tmp_path, monkeypatch):
    assets = tmp_path / "bundled"
    assets.mkdir()
    write_pcm16_wav(assets / "female__warm__en-us.wav", [0.1, -0.1] * 400)
    monkeypatch.setattr(voice_preview, "bundled_preview_dir", lambda: assets)
    payload = make_voice_preview({"gender": "female", "feel": "warm", "accent": "en-us"})
    assert payload["schema"] == "grok-crew.voice-preview/v1"
    assert payload["engine"] == ENGINE
    assert payload["speaker_id"] == "af_heart"
    assert payload["text"].startswith("Hello")
    assert payload["source"] == "bundled"
    assert payload["url"] == "/media/voice-previews/female__warm__en-us.wav"
    assert "path" not in payload
    assert (preview_workspace_dir() / "female__warm__en-us.wav").is_file()


def test_preview_clamps_korean_when_kokoro_has_no_pack(studio, tmp_path, monkeypatch):
    assets = tmp_path / "bundled"
    assets.mkdir()
    write_pcm16_wav(assets / "female__warm__en-us.wav", [0.1, -0.1] * 400)
    write_pcm16_wav(assets / "female__warm__ko.wav", [0.2, -0.2] * 400)
    monkeypatch.setattr(voice_preview, "bundled_preview_dir", lambda: assets)
    payload = make_voice_preview({"gender": "female", "feel": "warm", "accent": "ko"})
    assert payload["accent"] == "en-us"
    assert payload["text"].startswith("Hello")
    assert payload["url"] == "/media/voice-previews/female__warm__en-us.wav"
    assert "path" not in payload
    assert (preview_workspace_dir() / "female__warm__en-us.wav").is_file()


def test_preview_ignores_unknown_speaker_id(studio, tmp_path, monkeypatch):
    monkeypatch.setattr(voice_preview, "bundled_preview_dir", lambda: tmp_path / "missing")
    seen = {}

    def synth(*, text, speaker_id, lang_code, speed):
        seen["speaker_id"] = speaker_id
        return [0.2, -0.2] * 240

    payload = make_voice_preview(
        {
            "accent": "en-us",
            "gender": "female",
            "feel": "warm",
            "speaker_id": "../../secret.pt",
        },
        synthesize=synth,
    )
    assert payload["speaker_id"] == "af_heart"
    assert seen["speaker_id"] == "af_heart"
    assert resolve_requested_speaker_id("am_liam", "female", "warm", "en-us") == "am_liam"
    assert resolve_requested_speaker_id("af_bella", "female", "warm", "en-us") == "af_heart"


def test_preview_uses_injected_kokoro_synthesizer(studio, tmp_path, monkeypatch):
    monkeypatch.setattr(voice_preview, "bundled_preview_dir", lambda: tmp_path / "missing")
    payload = make_voice_preview({"accent": "en-us", "feel": "bright"}, synthesize=fake_synth)
    assert payload["engine"] == ENGINE
    assert payload["source"] == "synthesized"
    assert payload["speaker_id"] == "af_nova"
    assert "path" not in payload
    assert (preview_workspace_dir() / "female__bright__en-us.wav").stat().st_size > 44


def test_preview_errors_when_kokoro_audio_is_missing(studio, tmp_path, monkeypatch):
    monkeypatch.setattr(voice_preview, "bundled_preview_dir", lambda: tmp_path / "missing")

    def boom(**_kwargs):
        raise ValueError("Kokoro-82M is not installed on this PC.")

    try:
        make_voice_preview({"accent": "ja"}, synthesize=boom)
    except ValueError as exc:
        assert "Kokoro-82M" in str(exc)
    else:
        raise AssertionError("missing Kokoro audio must fail")


def test_provision_copies_bundled_wavs(studio, tmp_path, monkeypatch):
    assets = tmp_path / "bundled"
    assets.mkdir()
    write_pcm16_wav(assets / "male__clear__en-gb.wav", [0.15, -0.15] * 300)
    monkeypatch.setattr(voice_preview, "bundled_preview_dir", lambda: assets)
    assert provision_preview_audio() == 1
    assert provision_preview_audio() == 0


def test_http_voice_preview_serves_kokoro_wav(live_server, tmp_path, monkeypatch):
    import handlers

    assets = tmp_path / "bundled"
    assets.mkdir()
    write_pcm16_wav(assets / "female__warm__ja.wav", [0.12, -0.12] * 500)
    monkeypatch.setattr(voice_preview, "bundled_preview_dir", lambda: assets)
    monkeypatch.setattr(handlers, "make_voice_preview", make_voice_preview)
    payload = post(live_server, "/api/v2/first-run/voice-preview", {"accent": "ja"})
    assert payload["engine"] == "kokoro-82m"
    assert payload["speaker_id"] == "jf_alpha"
    assert "path" not in payload
    with urlopen(Request(f"{live_server}{payload['url']}"), timeout=10) as response:
        raw = response.read()
    assert response.status == 200
    assert raw[:4] == b"RIFF"
    assert b"WAVE" in raw[:16]
    assert json.loads(json.dumps(payload))["repo"] == "hexgrad/Kokoro-82M"

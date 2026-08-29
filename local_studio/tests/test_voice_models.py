import first_run
import voice_models
from tests.test_api import get_status, post
from voice_models import (
    DEFAULT_MODEL_ID,
    accents_for_model,
    huggingface_url_allowed,
    reset_voice_models,
    resolve_model_id,
    select_voice_model,
    status,
)


def fake_fetch(_url: str) -> bytes:
    return b"voice-weight"


def test_voice_download_stays_on_huggingface_https():
    assert huggingface_url_allowed("https://huggingface.co/hexgrad/Kokoro-82M/resolve/main/config.json")
    assert huggingface_url_allowed("https://cdn-lfs.huggingface.co/repos/xx")
    assert huggingface_url_allowed("https://cas-bridge.xethub.hf.co/x")
    assert huggingface_url_allowed("https://huggingface.co.evil.example/x") is False
    assert huggingface_url_allowed("http://huggingface.co/x") is False
    assert huggingface_url_allowed("https://evil.example/x") is False
    assert huggingface_url_allowed("file:///tmp/weights.pth") is False


def test_kokoro_catalog_uses_huggingface_weight_name():
    item = voice_models.CATALOG["kokoro-82m"]
    assert item["weight_files"] == ("kokoro-v1_0.pth",)
    assert "kokoro-v1.0.pth" in item["fallbacks"]


def test_shipped_models_have_no_korean_pack():
    reset_voice_models()
    for model_id in voice_models.MODEL_IDS:
        accents = accents_for_model(model_id)
        assert "ko" not in accents
        assert "en-us" in accents
        assert accents == ("en-us", "en-gb", "zh", "ja")
    payload = status()
    assert "ko" not in payload["accents"]
    kokoro = next(item for item in payload["models"] if item["id"] == "kokoro-82m")
    assert "ko" not in kokoro["accents"]
    assert kokoro["accents"] == ["en-us", "en-gb", "zh", "ja"]


def test_next_defaults_to_kokoro_and_keeps_one_model(studio, monkeypatch):
    reset_voice_models()
    monkeypatch.setenv("GROK_CREW_VOICE_WEIGHTS", "0")
    assert resolve_model_id(None) == DEFAULT_MODEL_ID
    assert resolve_model_id("") == "kokoro-82m"
    assert resolve_model_id("nope") == "kokoro-82m"
    first = select_voice_model({}, fetch=fake_fetch, wait=True)
    assert first["active"] == "kokoro-82m"
    assert first["chosen"] is True
    assert first["one_active"] is True
    assert sum(1 for item in first["models"] if item["active"]) == 1
    kokoro = next(item for item in first["models"] if item["id"] == "kokoro-82m")
    assert kokoro["installed"] is True
    second = select_voice_model({"model_id": "zonos-v0.1"}, fetch=fake_fetch, wait=True)
    assert second["active"] == "zonos-v0.1"
    assert sum(1 for item in second["models"] if item["active"]) == 1
    assert not (voice_models.model_dir("kokoro-82m") / "chosen.json").is_file()
    assert (voice_models.model_dir("zonos-v0.1") / "chosen.json").is_file()


def test_first_run_status_includes_voice_model(studio):
    reset_voice_models()
    payload = first_run.first_run_status()
    assert payload["schema"] == "grok-crew.first-run/v1"
    assert payload["voice_model"]["default"] == "kokoro-82m"
    assert payload["voice_model"]["active"] is None


def test_http_first_run_downloads_only_the_chosen_model(live_server, monkeypatch):
    import handlers

    reset_voice_models()
    monkeypatch.setenv("GROK_CREW_VOICE_WEIGHTS", "0")

    def choose(body=None, **_kwargs):
        return select_voice_model(body, fetch=fake_fetch, wait=True)

    monkeypatch.setattr(handlers, "select_voice_model", choose)
    code, before = get_status(live_server, "/api/v2/first-run")
    assert code == 200
    assert before["voice_model"]["default"] == "kokoro-82m"
    selected = post(live_server, "/api/v2/first-run/voice-model", {})
    assert selected["active"] == "kokoro-82m"
    switched = post(live_server, "/api/v2/first-run/voice-model", {"model_id": "step-audio-editx"})
    assert switched["active"] == "step-audio-editx"
    assert status()["active"] == "step-audio-editx"

import analysis
import config


def test_caption_cues_group_speech_windows():
    cues = analysis.caption_cues_from_words([
        {"start": 0.0, "end": 0.4, "text": "카페"},
        {"start": 0.4, "end": 0.8, "text": "오픈"},
        {"start": 3.0, "end": 3.4, "text": "간판"},
    ])
    assert cues[0]["text"] == "카페 오픈"
    assert cues[-1]["text"] == "간판"


def test_apply_caption_cues_writes_word_timings():
    timeline = {"clips": [{"in": 0, "out": 4, "keep": True, "caption": ""}]}
    updated, changed = analysis.apply_caption_cues_to_timeline(
        timeline,
        [{"start": 0.2, "end": 1.1, "text": "훅"}],
    )
    assert changed is True
    assert updated["clips"][0]["caption"] == "훅"
    assert updated["clips"][0]["word_timings"][0]["text"] == "훅"


def test_analyze_skips_transcript_when_captions_are_off(studio, monkeypatch):
    source = config.WORKSPACE_DIR / "inputs" / "source.mp4"
    source.parent.mkdir(parents=True, exist_ok=True)
    source.write_bytes(b"fixture")
    project = studio.new_project({
        "title": "No captions",
        "source_path": "inputs/source.mp4",
        "output_path": "outputs/final-video.mp4",
        "timeline": {"clips": [{"in": 0, "out": 4, "keep": True, "caption": ""}]},
    })
    monkeypatch.setattr(analysis, "_probe", lambda _source: {"status": "ready", "duration": 4.0})
    monkeypatch.setattr(analysis, "_thumbnails", lambda *_args: [{"id": "scene-01", "at": 1.0, "path": "x", "size_bytes": 1}])
    called = {"transcript": False}

    def mark_transcript(_source, _language=""):
        called["transcript"] = True
        return {"status": "ready", "engine": "whisper.cpp", "words": [], "caption_cues": []}

    monkeypatch.setattr(analysis, "_transcript", mark_transcript)
    result = analysis.analyze_project(project)
    assert called["transcript"] is False
    assert result["transcript_json"]["status"] == "skipped"

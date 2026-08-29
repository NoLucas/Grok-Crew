import assert from 'node:assert/strict';
import { register } from 'node:module';
import { describe, it } from 'node:test';

register('./timeline/ts-resolver.helper.mjs', import.meta.url);

const {
  VOICE_PREVIEW_ENGINE,
  playVoicePreview,
  voicePreviewFileName,
  voicePreviewLang,
  voicePreviewMediaUrl,
  voicePreviewPhrase,
  voicePreviewRate,
} = await import('./desktop-voice-preview.ts');

describe('voice preview lines', () => {
  it('keeps one Grok Crew greeting in each language', () => {
    assert.equal(voicePreviewPhrase('ko'), '안녕하세요 Grok Crew 입니다 잘부탁드려요');
    assert.equal(voicePreviewPhrase('en-us'), 'Hello. This is Grok Crew. Nice to meet you.');
    assert.equal(voicePreviewPhrase('en-gb'), 'Hello. This is Grok Crew. Nice to meet you.');
    assert.equal(voicePreviewPhrase('zh'), '你好，我是 Grok Crew，请多关照。');
    assert.equal(voicePreviewPhrase('ja'), 'こんにちは。Grok Crewです。よろしくお願いします。');
    assert.equal(voicePreviewLang('ko'), 'ko-KR');
    assert.equal(voicePreviewLang('en-us'), 'en-US');
    assert.equal(voicePreviewLang('en-gb'), 'en-GB');
    assert.equal(voicePreviewLang('zh'), 'zh-CN');
    assert.equal(voicePreviewLang('ja'), 'ja-JP');
    assert.equal(voicePreviewRate('bright') > voicePreviewRate('calm'), true);
    assert.equal(voicePreviewFileName({ gender: 'female', feel: 'warm', accent: 'ko' }), 'female__warm__ko.wav');
    assert.equal(voicePreviewFileName({ gender: 'female', feel: 'warm', accent: 'en-us' }), 'female__warm__en-us.wav');
    assert.equal(VOICE_PREVIEW_ENGINE, 'kokoro-82m');
  });

  it('plays the Kokoro-82M wav from Local Studio, never speechSynthesis', () => {
    const played = [];
    const request = async (path, init) => {
      assert.equal(path, '/api/v2/first-run/voice-preview');
      assert.equal(init.method, 'POST');
      const body = JSON.parse(init.body);
      assert.equal(body.accent, 'en-us');
      assert.equal(body.model_id, 'kokoro-82m');
      assert.equal(body.speaker_id, 'af_heart');
      return {
        engine: 'kokoro-82m',
        speaker_id: 'af_heart',
        text: voicePreviewPhrase('en-us'),
        url: '/media/voice-previews/female__warm__en-us.wav',
      };
    };
    return playVoicePreview(
      { accent: 'en-us', gender: 'female', feel: 'warm', modelId: 'kokoro-82m' },
      {
        request,
        studioOrigin: 'http://127.0.0.1:7214',
        play: async (url) => { played.push(url); },
      },
    ).then(async (status) => {
      assert.equal(status, 'playing');
      assert.equal(played[0], 'http://127.0.0.1:7214/media/voice-previews/female__warm__en-us.wav');
      assert.equal(voicePreviewMediaUrl({ accent: 'ja', gender: 'female', feel: 'warm' }, 'http://127.0.0.1:7214'), 'http://127.0.0.1:7214/media/voice-previews/female__warm__ja.wav');
      const clamped = [];
      const clampedStatus = await playVoicePreview(
        { accent: 'ko', gender: 'female', feel: 'warm', modelId: 'kokoro-82m' },
        {
          request: async (_path, init) => {
            const body = JSON.parse(init.body);
            assert.equal(body.accent, 'en-us');
            assert.equal(body.model_id, 'kokoro-82m');
            return {
              engine: 'kokoro-82m',
              url: '/media/voice-previews/female__warm__en-us.wav',
            };
          },
          studioOrigin: 'http://127.0.0.1:7214',
          play: async (url) => { clamped.push(url); },
        },
      );
      assert.equal(clampedStatus, 'playing');
      assert.equal(clamped[0], 'http://127.0.0.1:7214/media/voice-previews/female__warm__en-us.wav');
      const missing = await playVoicePreview(
        { accent: 'zh' },
        { request: async () => { throw new Error('Kokoro-82M is not installed on this PC.'); } },
      );
      assert.equal(missing, 'missing');
      const otherEngine = await playVoicePreview(
        { accent: 'en-us' },
        { request: async () => ({ engine: 'speechSynthesis', url: '/nope.wav' }), play: async () => {} },
      );
      assert.equal(otherEngine, 'blocked');
    });
  });
});

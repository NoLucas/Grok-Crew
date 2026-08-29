import assert from 'node:assert/strict';
import { register } from 'node:module';
import { describe, it } from 'node:test';

register('./timeline/ts-resolver.helper.mjs', import.meta.url);

const {
  pickPreviewVoice,
  playVoicePreview,
  voicePreviewLang,
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
  });

  it('plays the greeting on the matching language voice', () => {
    const spoken = [];
    const speech = {
      cancel() { spoken.push('cancel'); },
      speak(utterance) { spoken.push(utterance); },
      getVoices() {
        return [
          { lang: 'en-US', name: 'Samantha' },
          { lang: 'ko-KR', name: 'Yuna' },
          { lang: 'ja-JP', name: 'Kyoko' },
        ];
      },
    };
    assert.equal(playVoicePreview({ accent: 'ko', gender: 'female' }, speech), 'playing');
    assert.equal(spoken[0], 'cancel');
    assert.equal(spoken[1].text, '안녕하세요 Grok Crew 입니다 잘부탁드려요');
    assert.equal(spoken[1].lang, 'ko-KR');
    assert.equal(spoken[1].voice.name, 'Yuna');
    assert.equal(playVoicePreview({ accent: 'ja' }, { cancel() {}, speak() { throw new Error('no'); }, getVoices() { return []; } }), 'blocked');
    assert.equal(playVoicePreview({ accent: 'zh' }, null), 'blocked');
    assert.equal(pickPreviewVoice([{ lang: 'en-GB', name: 'Daniel' }], 'en-GB', 'male')?.name, 'Daniel');
  });
});

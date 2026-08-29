import assert from 'node:assert/strict';
import { register } from 'node:module';
import { describe, it } from 'node:test';

register('./timeline/ts-resolver.helper.mjs', import.meta.url);

const {
  DEFAULT_VOICE_MODEL_ID,
  VOICE_MODELS,
  VOICE_SETUP_KEY,
  VOICE_WIZARD_BODY_CLASS,
  confirmVoiceChoice,
  dubbingMustKeep,
  operatorDubMustKeep,
  resolveVoiceAccentForModel,
  voiceAccentsForModel,
  voiceModelLanguageLine,
  voiceMustKeep,
  downloadPercent,
  emptyVoiceSetup,
  needsFirstVoiceSetup,
  readVoiceSetup,
  resolveVoiceModelId,
  voiceModelLabel,
  writeVoiceSetup,
} = await import('./desktop-voice-models.ts');

const memory = new Map();

globalThis.window = {
  localStorage: {
    getItem: (key) => (memory.has(key) ? memory.get(key) : null),
    setItem: (key, value) => { memory.set(key, String(value)); },
    removeItem: (key) => { memory.delete(key); },
  },
};

describe('voice model picker', () => {
  it('defaults Next and junk values to Kokoro-82M and keeps one id', () => {
    assert.equal(DEFAULT_VOICE_MODEL_ID, 'kokoro-82m');
    assert.equal(confirmVoiceChoice(), 'kokoro-82m');
    assert.equal(confirmVoiceChoice(''), 'kokoro-82m');
    assert.equal(confirmVoiceChoice('nope'), 'kokoro-82m');
    assert.equal(resolveVoiceModelId('STEP-AUDIO-EDITX'), 'step-audio-editx');
    assert.equal(resolveVoiceModelId('zonos-v0.1'), 'zonos-v0.1');
    assert.equal(VOICE_WIZARD_BODY_CLASS, 'desktop-body desktop-voice-first');
    assert.doesNotMatch(VOICE_WIZARD_BODY_CLASS, /local-first/);
    assert.equal(VOICE_MODELS.length, 3);
    assert.equal(VOICE_MODELS.filter((item) => item.recommended).length, 1);
    assert.match(VOICE_MODELS.find((item) => item.id === 'kokoro-82m').warning.ko, /4GB/);
    assert.match(VOICE_MODELS.find((item) => item.id === 'step-audio-editx').warning.ko, /12GB/);
    assert.match(VOICE_MODELS.find((item) => item.id === 'zonos-v0.1').warning.ko, /6GB/);
    assert.match(VOICE_MODELS.find((item) => item.id === 'zonos-v0.1').warning.ko, /한국어 언어팩/);
    assert.deepEqual(voiceAccentsForModel('kokoro-82m'), ['en-us', 'en-gb', 'zh', 'ja']);
    assert.equal(voiceAccentsForModel('kokoro-82m').includes('ko'), false);
    assert.equal(voiceAccentsForModel('step-audio-editx').includes('ko'), false);
    assert.equal(voiceAccentsForModel('zonos-v0.1').includes('ko'), false);
    assert.equal(resolveVoiceAccentForModel('ko', 'kokoro-82m', 'ko'), 'en-us');
    assert.equal(resolveVoiceAccentForModel(undefined, 'kokoro-82m', 'zh'), 'zh');
    assert.match(voiceModelLanguageLine('kokoro-82m', 'ko'), /미국 영어 · 영국 영어 · 중국어 · 일본어/);
    assert.match(voiceModelLanguageLine('kokoro-82m', 'en'), /US English · UK English · Chinese · Japanese/);
    assert.match(voiceModelLanguageLine('kokoro-82m', 'zh'), /美式英语 · 英式英语 · 中文 · 日语/);
    assert.match(voiceModelLanguageLine('kokoro-82m', 'ja'), /アメリカ英語 · イギリス英語 · 中国語 · 日本語/);
    assert.doesNotMatch(voiceModelLanguageLine('kokoro-82m', 'ko'), /한국어/);
    assert.doesNotMatch(voiceModelLanguageLine('kokoro-82m', 'en'), /Korean/);
    assert.match(VOICE_MODELS.find((item) => item.id === 'kokoro-82m').warning.en, /Korean language pack/);
    assert.match(VOICE_MODELS.find((item) => item.id === 'kokoro-82m').warning.zh, /韩语语言包/);
    assert.match(VOICE_MODELS.find((item) => item.id === 'kokoro-82m').warning.ja, /韓国語の言語パック/);
    assert.match(VOICE_MODELS.find((item) => item.id === 'kokoro-82m').warning.ko, /한국어 언어팩은 없습니다/);
  });

  it('persists one chosen model after Next', () => {
    memory.clear();
    assert.deepEqual(readVoiceSetup(), emptyVoiceSetup());
    assert.equal(needsFirstVoiceSetup(emptyVoiceSetup()), false);
    assert.equal(needsFirstVoiceSetup({ done: true, modelId: 'kokoro-82m' }), false);
    assert.equal(needsFirstVoiceSetup(emptyVoiceSetup(), { active: 'kokoro-82m', chosen: true }), false);
    assert.equal(needsFirstVoiceSetup(emptyVoiceSetup(), { active: null }), false);
    const next = writeVoiceSetup({ done: true, modelId: confirmVoiceChoice() });
    assert.equal(next.done, true);
    assert.equal(next.modelId, 'kokoro-82m');
    assert.equal(JSON.parse(memory.get(VOICE_SETUP_KEY)).modelId, 'kokoro-82m');
    assert.equal(writeVoiceSetup({ modelId: 'zonos-v0.1' }).modelId, 'zonos-v0.1');
    assert.equal(readVoiceSetup().modelId, 'zonos-v0.1');
    assert.equal(voiceModelLabel('step-audio-editx'), 'Step Audio EditX');
    assert.match(dubbingMustKeep('kokoro-82m'), /Kokoro-82M 하나만/);
    assert.equal(voiceMustKeep({}), undefined);
    assert.equal(voiceMustKeep({ wantDubbing: false, wantTts: false }), undefined);
    assert.equal(voiceMustKeep({ wantDubbing: true }), operatorDubMustKeep());
    assert.doesNotMatch(String(voiceMustKeep({ wantDubbing: true })), /Kokoro-82M/);
    assert.match(String(voiceMustKeep({ wantTts: true })), /Kokoro-82M 하나만/);
    assert.match(String(voiceMustKeep({ wantTts: true, voiceModelId: 'zonos-v0.1' })), /Zonos-v0.1 하나만/);
    assert.match(String(voiceMustKeep({ wantDubbing: true, wantTts: true })), /Kokoro-82M 하나만/);
    assert.equal(downloadPercent({ received_bytes: 25, total_bytes: 100 }), 25);
  });
});

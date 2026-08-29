import assert from 'node:assert/strict';
import { register } from 'node:module';
import { describe, it } from 'node:test';

register('./timeline/ts-resolver.helper.mjs', import.meta.url);

const {
  DEFAULT_VOICE_SPEAKER_ID,
  resolveVoicePersona,
  voicePersonaKeep,
  voicePersonaLabel,
} = await import('./desktop-voice-personas.ts');

describe('voice personas', () => {
  it('defaults to a warm US-English woman and keeps one speaker', () => {
    const next = resolveVoicePersona();
    assert.equal(next.gender, 'female');
    assert.equal(next.feel, 'warm');
    assert.equal(next.accent, 'en-us');
    assert.equal(next.speakerId, DEFAULT_VOICE_SPEAKER_ID);
    assert.equal(resolveVoicePersona({ gender: 'nope', feel: 'x', accent: '' }).speakerId, 'af_heart');
    assert.equal(resolveVoicePersona({ gender: 'male', feel: 'calm', accent: 'en-gb' }).speakerId, 'bm_lewis');
    assert.equal(resolveVoicePersona({ gender: 'female', feel: 'bright', accent: 'zh' }).speakerId, 'zf_xiaoni');
    assert.match(voicePersonaLabel(next, 'ko'), /따뜻한 여자 · 미국 영어/);
    assert.equal(resolveVoicePersona({ accent: 'ko' }).accent, 'ko');
    assert.equal(resolveVoicePersona({
      accent: 'ko',
      allowedAccents: ['en-us', 'en-gb', 'zh', 'ja'],
    }).accent, 'en-us');
    assert.match(voicePersonaKeep(next), /af_heart 하나만/);
    assert.match(voicePersonaKeep(next), /사람을 복제하지 않는다/);
  });
});

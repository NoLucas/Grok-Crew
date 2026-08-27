import assert from 'node:assert/strict';
import { register } from 'node:module';
import { describe, it } from 'node:test';

register('./timeline/ts-resolver.helper.mjs', import.meta.url);

const {
  AUTO_PREFS_KEY,
  DEFAULT_RECIPE_ID,
  attachedBotName,
  autoHeaderDot,
  autoJobPayload,
  autoSourceMode,
  autoDeskStage,
  autoMachineState,
  autoPhaseLamps,
  botSeenSeconds,
  canStartAuto,
  formatElapsed,
  formatSince,
  readAutoPrefs,
  rememberRecentTitle,
  shouldAskReplaceCut,
  shouldPingCut,
  suggestRecipeId,
  titleFromPrompt,
  waitElapsedSeconds,
  writeAutoPrefs,
} = await import('./desktop-auto-state.ts');

const memory = new Map();

globalThis.window = {
  localStorage: {
    getItem: (key) => (memory.has(key) ? memory.get(key) : null),
    setItem: (key, value) => { memory.set(key, String(value)); },
    removeItem: (key) => { memory.delete(key); },
  },
};

describe('auto desk start rules', () => {
  it('refuses to start without a title or a connection', () => {
    assert.deepEqual(canStartAuto({ title: '', attached: true }), { ok: false, reason: 'title' });
    assert.deepEqual(canStartAuto({ title: '   ', attached: true }), { ok: false, reason: 'title' });
    assert.deepEqual(canStartAuto({ title: '15초 훅 릴', attached: false }), { ok: false, reason: 'connect' });
    assert.deepEqual(canStartAuto({ title: '15초 훅 릴', attached: true }), { ok: false, reason: 'materials' });
    assert.deepEqual(canStartAuto({
      title: '15초 훅 릴',
      attached: true,
      useScrape: true,
      collectQuery: '',
    }), { ok: false, reason: 'materials' });
    assert.deepEqual(canStartAuto({
      title: '15초 훅 릴',
      attached: true,
      useOwn: true,
      ownedPaths: [],
    }), { ok: false, reason: 'materials' });
    assert.deepEqual(canStartAuto({
      title: '15초 훅 릴',
      attached: true,
      useScrape: true,
      collectQuery: '카페 오픈 손·간판',
    }), { ok: true });
    assert.deepEqual(canStartAuto({
      title: '15초 훅 릴',
      attached: true,
      useOwn: true,
      ownedPaths: ['/tmp/sign.png'],
    }), { ok: true });
    assert.equal(titleFromPrompt('', '카페 오픈 15초\n손과 간판'), '카페 오픈 15초');
    assert.deepEqual(canStartAuto({
      title: '',
      goal: 'https://example.com/open',
      attached: true,
      useScrape: true,
    }), { ok: true });
  });
});

describe('auto desk job payload', () => {
  it('records own files, the scrape list, or both on the existing spec fields', () => {
    assert.equal(autoSourceMode({ useOwn: true, useScrape: true }), 'own_and_collect');
    assert.deepEqual(autoJobPayload({
      title: '카페 오픈',
      goal: '손과 간판',
      recipeId: 'tiktok_tight',
      language: 'ko',
      useScrape: true,
      collectQuery: '  카페 오픈 공개 클립  ',
    }), {
      title: '카페 오픈',
      goal: '손과 간판',
      recipe_id: 'tiktok_tight',
      source_mode: 'collect',
      language: 'ko',
      upload: false,
      captions: false,
      collect_query: '카페 오픈 공개 클립',
    });
    assert.deepEqual(autoJobPayload({
      title: '',
      goal: 'https://example.com/open',
      recipeId: 'instagram_reel',
      language: 'ko',
      useScrape: true,
    }), {
      title: 'https://example.com/open',
      goal: 'https://example.com/open',
      recipe_id: 'instagram_reel',
      source_mode: 'collect',
      language: 'ko',
      upload: false,
      captions: false,
      collect_query: 'https://example.com/open',
    });
    assert.deepEqual(autoJobPayload({
      title: '내 컷',
      recipeId: 'instagram_reel',
      language: 'ko',
      useOwn: true,
      ownedPaths: ['/tmp/talk.mp4', '/tmp/sign.png'],
    }), {
      title: '내 컷',
      goal: '내 컷',
      recipe_id: 'instagram_reel',
      source_mode: 'own',
      language: 'ko',
      upload: false,
      captions: false,
      owned_paths: ['/tmp/talk.mp4', '/tmp/sign.png'],
    });
    assert.deepEqual(autoJobPayload({
      title: '둘 다',
      recipeId: 'youtube_short',
      language: 'ko',
      useOwn: true,
      useScrape: true,
      ownedPaths: ['/tmp/talk.mp4'],
      collectQuery: '간판 클로즈업',
    }).source_mode, 'own_and_collect');
    assert.equal(autoJobPayload({
      title: '자막 켬',
      recipeId: 'instagram_reel',
      language: 'ko',
      useScrape: true,
      collectQuery: '간판',
      wantCaptions: true,
    }).captions, true);
    const dubOnly = autoJobPayload({
      title: '더빙 켬',
      recipeId: 'instagram_reel',
      language: 'ko',
      useScrape: true,
      collectQuery: '간판',
      wantDubbing: true,
    });
    assert.match(String(dubOnly.must_keep), /운영자가 넣은 음성/);
    assert.doesNotMatch(String(dubOnly.must_keep), /Kokoro-82M/);
    assert.equal(autoJobPayload({
      title: '둘 다 끔',
      recipeId: 'instagram_reel',
      language: 'ko',
      useScrape: true,
      collectQuery: '간판',
    }).must_keep, undefined);
    assert.match(String(autoJobPayload({
      title: 'TTS 켬',
      recipeId: 'instagram_reel',
      language: 'ko',
      useScrape: true,
      collectQuery: '간판',
      wantTts: true,
    }).must_keep), /Kokoro-82M 하나만/);
    assert.match(String(autoJobPayload({
      title: 'TTS 켬',
      recipeId: 'instagram_reel',
      language: 'ko',
      useScrape: true,
      collectQuery: '간판',
      wantTts: true,
      voiceGender: 'male',
      voiceFeel: 'calm',
      voiceAccent: 'en-gb',
    }).must_keep), /차분한 남자 · 영국 영어/);
    assert.match(String(autoJobPayload({
      title: 'TTS 켬',
      recipeId: 'instagram_reel',
      language: 'ko',
      useScrape: true,
      collectQuery: '간판',
      wantTts: true,
      voiceGender: 'male',
      voiceFeel: 'calm',
      voiceAccent: 'en-gb',
    }).must_keep), /bm_lewis 하나만/);
    assert.match(String(autoJobPayload({
      title: 'TTS 켬',
      recipeId: 'instagram_reel',
      language: 'ko',
      useScrape: true,
      collectQuery: '간판',
      wantTts: true,
      voiceModelId: 'zonos-v0.1',
    }).must_keep), /Zonos-v0.1 하나만/);
  });
});

describe('auto desk style guess', () => {
  it('suggests a style from the words and does not invent a new one', () => {
    assert.equal(suggestRecipeId('15초 훅 릴'), 'instagram_reel');
    assert.equal(suggestRecipeId('instagram reel hook'), 'instagram_reel');
    assert.equal(suggestRecipeId('틱톡으로 올려'), 'tiktok_tight');
    assert.equal(suggestRecipeId('YouTube Shorts'), 'youtube_short');
    assert.equal(suggestRecipeId('유튜브 쇼츠'), 'youtube_short');
    assert.equal(suggestRecipeId('그냥 오늘 말', 'tiktok_tight'), 'tiktok_tight');
    assert.equal(suggestRecipeId(''), DEFAULT_RECIPE_ID);
  });
});

describe('auto desk stages', () => {
  it('keeps the first screen on write, then wait, then the arrived cut', () => {
    assert.equal(autoDeskStage({}), 'compose');
    assert.equal(autoDeskStage({
      wait: { specId: 'spec-1', title: '카페', copiedAt: '2026-08-27T03:00:00.000Z', pasteTarget: 'Grok' },
      pull: 'none',
    }), 'waiting');
    assert.equal(autoDeskStage({
      wait: { specId: 'spec-1', title: '카페', copiedAt: '2026-08-27T03:00:00.000Z', pasteTarget: 'Grok' },
      pull: 'arrived',
      hasProject: true,
    }), 'arrived');
    assert.equal(autoDeskStage({
      wait: { specId: 'spec-1', title: '카페', copiedAt: '2026-08-27T03:00:00.000Z', pasteTarget: 'Grok' },
      pull: 'arrived',
      hasProject: true,
      stayOnCompose: true,
    }), 'compose');
  });
});

describe('auto desk lamps', () => {
  it('keeps the cut lamp off until a cut is really here', () => {
    const idle = autoPhaseLamps({
      attached: true,
      studioReady: true,
      wait: null,
      pull: 'idle',
      hasProject: false,
      outputReady: false,
    });
    assert.equal(idle.connect, 'green');
    assert.equal(idle.sent, 'off');
    assert.equal(idle.working, 'off');
    assert.equal(idle.cut, 'off');
    assert.equal(idle.save, 'off');
    assert.equal(autoMachineState({
      attached: true,
      studioReady: true,
      wait: null,
      pull: 'idle',
      hasProject: false,
      outputReady: false,
    }), 'idle');
  });

  it('turns sent green and working yellow after a copy, not arrived', () => {
    const waiting = autoPhaseLamps({
      attached: true,
      studioReady: true,
      wait: {
        specId: 'spec-1',
        title: '15초 훅 릴',
        copiedAt: '2026-08-27T03:00:00.000Z',
        pasteTarget: 'Cursor',
      },
      pull: 'none',
      hasProject: false,
      outputReady: false,
    });
    assert.equal(waiting.sent, 'green');
    assert.equal(waiting.working, 'yellow');
    assert.equal(waiting.cut, 'off');
    assert.equal(autoMachineState({
      attached: true,
      studioReady: true,
      wait: {
        specId: 'spec-1',
        title: '15초 훅 릴',
        copiedAt: '2026-08-27T03:00:00.000Z',
        pasteTarget: 'Cursor',
      },
      pull: 'none',
      hasProject: false,
      outputReady: false,
    }), 'waiting');
  });

  it('marks the cut green only after arrival and save green only after a file', () => {
    const arrived = autoPhaseLamps({
      attached: true,
      studioReady: true,
      wait: null,
      pull: 'arrived',
      hasProject: true,
      outputReady: false,
    });
    assert.equal(arrived.cut, 'green');
    assert.equal(arrived.save, 'off');
    assert.equal(autoMachineState({
      attached: true,
      studioReady: true,
      wait: null,
      pull: 'arrived',
      hasProject: true,
      outputReady: false,
    }), 'arrived');

    const saved = autoPhaseLamps({
      attached: true,
      studioReady: true,
      wait: null,
      pull: 'arrived',
      hasProject: true,
      outputReady: true,
    });
    assert.equal(saved.save, 'green');
    assert.equal(autoMachineState({
      attached: true,
      studioReady: true,
      wait: null,
      pull: 'arrived',
      hasProject: true,
      outputReady: true,
    }), 'done');
  });

  it('uses red for a dead studio, a failed send, a failed pull, or a failed save', () => {
    assert.equal(autoPhaseLamps({
      attached: false,
      studioReady: false,
      wait: null,
      pull: 'idle',
      hasProject: false,
      outputReady: false,
    }).connect, 'red');
    assert.equal(autoPhaseLamps({
      attached: true,
      studioReady: true,
      wait: null,
      pull: 'idle',
      hasProject: false,
      outputReady: false,
      sendFailed: true,
    }).sent, 'red');
    assert.equal(autoPhaseLamps({
      attached: true,
      studioReady: true,
      wait: {
        specId: 'spec-1',
        title: 'x',
        copiedAt: '2026-08-27T03:00:00.000Z',
        pasteTarget: 'Cursor',
      },
      pull: 'failed',
      hasProject: false,
      outputReady: false,
    }).working, 'red');
    assert.equal(autoPhaseLamps({
      attached: true,
      studioReady: true,
      wait: null,
      pull: 'arrived',
      hasProject: true,
      outputReady: false,
      saveFailed: true,
    }).save, 'red');
  });
});

describe('auto desk prefs and names', () => {
  it('remembers the last style on this computer only', () => {
    memory.clear();
    assert.equal(readAutoPrefs().recipeId, DEFAULT_RECIPE_ID);
    assert.equal(readAutoPrefs().wantTts, false);
    writeAutoPrefs({ recipeId: 'tiktok_tight' });
    assert.equal(readAutoPrefs().recipeId, 'tiktok_tight');
    rememberRecentTitle('15초 훅 릴');
    rememberRecentTitle('틱톡으로 올려');
    rememberRecentTitle('15초 훅 릴');
    assert.deepEqual(readAutoPrefs().recentTitles, ['15초 훅 릴', '틱톡으로 올려']);
    assert.equal(JSON.parse(memory.get(AUTO_PREFS_KEY)).recipeId, 'tiktok_tight');
  });

  it('uses the bot name, not a role name', () => {
    assert.equal(attachedBotName({ bots: [{ display_name: 'Grok', presence: 'active' }] }), 'Grok');
    assert.equal(attachedBotName(undefined, ['Claude']), 'Claude');
    assert.equal(attachedBotName(undefined, []), '');
  });
});

describe('auto desk wait honesty', () => {
  it('counts elapsed wait time from the copy stamp', () => {
    const copiedAt = '2026-08-27T03:00:00.000Z';
    const now = Date.parse('2026-08-27T03:12:00.000Z');
    assert.equal(waitElapsedSeconds(copiedAt, now), 12 * 60);
    assert.equal(formatElapsed(12 * 60, 'ko'), '12분');
    assert.equal(formatElapsed(9, 'en'), '9s');
    assert.equal(formatSince(125, 'ko'), '2분 전');
  });

  it('reads last-seen from check-in seconds or a connect stamp, not from a guessed read', () => {
    assert.equal(botSeenSeconds({ bots: [{ display_name: 'Grok', presence: 'active', seconds_since_checkin: 95 }] }), 95);
    const now = Date.parse('2026-08-27T03:10:00.000Z');
    assert.equal(botSeenSeconds(undefined, '2026-08-27T03:00:00.000Z', now), 10 * 60);
    assert.equal(botSeenSeconds(undefined), null);
  });

  it('puts one header dot on wait, cut, or failure — never a fake percent', () => {
    const waiting = {
      attached: true,
      studioReady: true,
      wait: {
        specId: 'spec-1',
        title: '15초 훅 릴',
        copiedAt: '2026-08-27T03:00:00.000Z',
        pasteTarget: 'Cursor',
      },
      pull: 'none',
      hasProject: false,
      outputReady: false,
    };
    assert.equal(autoHeaderDot(waiting), 'yellow');
    assert.equal(autoHeaderDot({ ...waiting, pull: 'arrived', hasProject: true }), 'green');
    assert.equal(autoHeaderDot({ ...waiting, pull: 'failed' }), 'red');
    assert.equal(autoHeaderDot({
      attached: true,
      studioReady: true,
      wait: null,
      pull: 'idle',
      hasProject: false,
      outputReady: false,
    }), 'off');
  });

  it('pings a cut only when the window is hidden and the spec is new', () => {
    assert.equal(shouldPingCut({ pull: 'arrived', hidden: true, specId: 'spec-1' }), true);
    assert.equal(shouldPingCut({ pull: 'arrived', hidden: false, specId: 'spec-1' }), false);
    assert.equal(shouldPingCut({ pull: 'none', hidden: true, specId: 'spec-1' }), false);
    assert.equal(shouldPingCut({ pull: 'arrived', hidden: true, specId: 'spec-1', lastPingedSpecId: 'spec-1' }), false);
    assert.equal(shouldAskReplaceCut(true), true);
    assert.equal(shouldAskReplaceCut(false), false);
  });
});

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
  autoSeatRows,
  autoSourceMode,
  autoDeskStage,
  autoMachineState,
  autoPhaseLamps,
  autoWaitHeadline,
  autoWorkingNote,
  botSeenSeconds,
  heartbeatActionLabel,
  recentActivityLines,
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
      studioReady: true,
      connectWaiting: true,
      wait: null,
      pull: 'idle',
      hasProject: false,
      outputReady: false,
    }).connect, 'off');
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
    writeAutoPrefs({ market: 'cn', marketTouched: true });
    assert.equal(readAutoPrefs().market, 'cn');
    assert.equal(readAutoPrefs().marketTouched, true);
  });

  it('names connected seats, never a mystery active bot', () => {
    assert.equal(attachedBotName({ bots: [{ display_name: 'Grok', presence: 'active' }] }), '');
    assert.equal(attachedBotName({
      bots: [{ bot_id: 'grok-planner', display_name: 'Grok', presence: 'active' }],
    }), 'Grok Bot 기획자');
    assert.equal(attachedBotName({
      bots: [{ display_name: 'Grok Bot 기획자', presence: 'active' }],
    }), 'Grok Bot 기획자');
    assert.equal(attachedBotName({
      bots: [
        { bot_id: 'grok-planner', display_name: 'Grok', presence: 'active' },
        { bot_id: 'grok-scraper', display_name: 'Grok', presence: 'active' },
      ],
    }), 'Grok Bot 기획자 · Grok Bot 스크래핑');
    assert.equal(attachedBotName(undefined, ['Claude']), '');
    assert.equal(attachedBotName(undefined, ['Grok Bot 기획자']), 'Grok Bot 기획자');
    assert.equal(attachedBotName(undefined, []), '');
    assert.doesNotMatch(attachedBotName({ bots: [{ display_name: 'Grok ???', presence: 'active' }] }), /\?\?\?/);
  });
});

describe('auto desk who and what', () => {
  it('shows one seat row when only the planner is attached', () => {
    const rows = autoSeatRows({
      roster: {
        bots: [{
          bot_id: 'grok-planner',
          display_name: 'Grok Bot 기획자',
          presence: 'active',
          last_action: 'still_here',
          seconds_since_checkin: 20,
        }],
      },
      language: 'ko',
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].name, 'Grok Bot 기획자');
    assert.equal(rows[0].mark, 'current');
    assert.match(rows[0].detail, /할 일은 아직 안 적음/);
    assert.doesNotMatch(rows[0].name, /\?\?\?/);
    assert.equal(heartbeatActionLabel('still_here', 'ko'), '이 자리에 있음 · 할 일은 아직 안 적음');
    assert.equal(autoWaitHeadline(rows, 'ko').showUnknownRead, false);
  });

  it('shows three rows for three seats and keeps still_here honest', () => {
    const rows = autoSeatRows({
      roster: {
        bots: [
          { bot_id: 'grok-planner', display_name: 'Grok Bot 기획자', presence: 'active', last_action: 'still_here', seconds_since_checkin: 12 },
          { bot_id: 'grok-scraper', display_name: 'Grok Bot 스크래핑', presence: 'active', last_action: 'still_here', seconds_since_checkin: 40 },
          { bot_id: 'grok-editor', display_name: 'Grok Bot 편집자', presence: 'active', last_action: 'entered_local_studio', seconds_since_checkin: 8 },
        ],
      },
      language: 'ko',
    });
    assert.equal(rows.length, 3);
    assert.deepEqual(rows.map((row) => row.name), ['Grok Bot 기획자', 'Grok Bot 스크래핑', 'Grok Bot 편집자']);
    assert.match(rows[0].detail, /할 일은 아직 안 적음/);
    assert.equal(rows[1].detail, '대기 · 연결됨');
    assert.equal(rows[2].detail, '대기 · 연결됨');
  });

  it('makes the planner current on plan_started and leaves others waiting', () => {
    const rows = autoSeatRows({
      roster: {
        bots: [
          { bot_id: 'grok-planner', display_name: 'Grok Bot 기획자', presence: 'active', last_action: 'plan_started', seconds_since_checkin: 60 },
          { bot_id: 'grok-scraper', display_name: 'Grok Bot 스크래핑', presence: 'active', last_action: 'still_here', seconds_since_checkin: 10 },
          { bot_id: 'grok-editor', display_name: 'Grok Bot 편집자', presence: 'idle' },
        ],
      },
      links: {
        pairCode: '7K2M9Q',
        bots: [{
          id: 'g-editor',
          name: 'Grok Bot 편집자',
          kind: 'grok',
          role: 'editor',
          place: 'other_pc',
          status: 'waiting',
          pairCode: '7K2M9Q',
        }],
      },
      language: 'ko',
    });
    assert.equal(rows.length, 3);
    assert.equal(rows[0].current, true);
    assert.match(rows[0].detail, /컷 계획 쓰는 중/);
    assert.equal(rows[1].detail, '대기 · 연결됨');
    assert.equal(rows[2].detail, '아직 연결되지않음');
    const headline = autoWaitHeadline(rows, 'ko');
    assert.equal(headline.title, 'Grok Bot 기획자가 컷 계획을 쓰는 중 · 창을 끄지 마세요');
    assert.equal(headline.showUnknownRead, false);
    assert.equal(autoWorkingNote({
      elapsedLabel: '10분',
      rows,
      language: 'ko',
    }), '10분째 · Grok Bot 기획자 · 컷 계획 쓰는 중');
  });

  it('keeps unknown only when that seat has no heartbeat', () => {
    const rows = autoSeatRows({
      roster: {
        bots: [{ bot_id: 'grok-planner', display_name: 'Grok Bot 기획자', presence: 'active' }],
      },
      language: 'ko',
      lastCheckedLabel: '12:01:00',
    });
    assert.equal(rows.length, 1);
    assert.match(rows[0].detail, /모름/);
    assert.match(rows[0].detail, /12:01:00/);
    assert.equal(autoWaitHeadline(rows, 'ko').showUnknownRead, true);
    assert.doesNotMatch(heartbeatActionLabel('plan_started', 'ko'), /plan_started/);
  });

  it('folds the last three named activity lines without raw actions', () => {
    const lines = recentActivityLines([
      { id: '1', bot_id: 'grok-planner', action: 'plan_started', created_at: new Date(Date.now() - 60_000).toISOString() },
      { id: '2', bot_id: 'mystery', action: 'hacked', created_at: new Date().toISOString() },
      { id: '3', bot_id: 'grok-scraper', action: 'still_here', created_at: new Date().toISOString() },
      { id: '4', bot_id: 'grok-editor', action: 'cut_ready', created_at: new Date().toISOString() },
    ], 'ko', 3);
    assert.equal(lines.length, 3);
    assert.equal(lines[0].name, 'Grok Bot 기획자');
    assert.equal(lines[0].text, '컷 계획 쓰는 중');
    assert.equal(lines[1].name, 'Grok Bot 스크래핑');
    assert.doesNotMatch(JSON.stringify(lines), /plan_started|still_here|cut_ready|hacked|\?\?\?/);
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

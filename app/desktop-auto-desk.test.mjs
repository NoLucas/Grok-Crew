import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { register } from 'node:module';
import { describe, it } from 'node:test';

register('./timeline/ts-resolver.helper.mjs', import.meta.url);

const {
  AUTO_PREFS_KEY,
  DEFAULT_RECIPE_ID,
  attachedBotName,
  autoHeaderDot,
  autoJobPayload,
  alwaysCrewSeats,
  autoSeatRows,
  autoSourceMode,
  importedEditSpecId,
  pickArrivedImport,
  pasteTargetForSeats,
  pasteTargetRole,
  samePcInviteReady,
  inboxDoorStamp,
  inboxStampChanged,
  misplacedInboxDoor,
  preferredSeatFamily,
  shouldAutoPullInbox,
  shouldClearWaitForImport,
  autoDeskStage,
  autoMachineState,
  autoPhaseLamps,
  autoWaitHeadline,
  autoWorkingNote,
  botSeenSeconds,
  heartbeatActionLabel,
  recentActivityLines,
  recipeFallbackLabel,
  canStartAuto,
  collectQueryIsUrlList,
  collectUrlLines,
  isAbsoluteOwnedPath,
  resolveOwnedPath,
  resolveOwnedPaths,
  formatElapsed,
  formatSince,
  readAutoPrefs,
  rememberRecentTitle,
  shouldAskReplaceCut,
  shouldPingCut,
  suggestRecipeId,
  leftoverJobTitle,
  libraryPreviewUrl,
  titleFromPrompt,
  waitElapsedSeconds,
  writeAutoPrefs,
  ownedFileExtension,
  ownedMediaKind,
  shortOwnedFileName,
  localFilePreviewUrl,
  safeWorkspaceRel,
  safeStudioOrigin,
  writeAnotherComposeReset,
} = await import('./desktop-auto-state.ts');

const memory = new Map();
const sessionMemory = new Map();

globalThis.window = {
  localStorage: {
    getItem: (key) => (memory.has(key) ? memory.get(key) : null),
    setItem: (key, value) => { memory.set(key, String(value)); },
    removeItem: (key) => { memory.delete(key); },
  },
  sessionStorage: {
    getItem: (key) => (sessionMemory.has(key) ? sessionMemory.get(key) : null),
    setItem: (key, value) => { sessionMemory.set(key, String(value)); },
    removeItem: (key) => { sessionMemory.delete(key); },
  },
};

describe('auto desk start rules', () => {
  it('refuses to start without a title or a connection', () => {
    assert.deepEqual(canStartAuto({ title: '', attached: true }), { ok: false, reason: 'title' });
    assert.deepEqual(canStartAuto({ title: '   ', attached: true }), { ok: false, reason: 'title' });
    assert.deepEqual(canStartAuto({ title: '15초 훅 릴', attached: false }), { ok: false, reason: 'connect' });
    assert.deepEqual(canStartAuto({ title: '15초 훅 릴', attached: true }), { ok: true });
    assert.deepEqual(canStartAuto({ title: '', goal: '카페 오픈 15초', attached: true }), { ok: true });
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
    }), { ok: false, reason: 'materials' });
    assert.deepEqual(canStartAuto({
      title: '15초 훅 릴',
      attached: true,
      useScrape: true,
      collectQuery: 'https://example.com/open.mp4',
    }), { ok: true });
    assert.deepEqual(canStartAuto({
      title: '15초 훅 릴',
      attached: true,
      useOwn: true,
      ownedPaths: ['/tmp/sign.png'],
    }), { ok: true });
    assert.equal(titleFromPrompt('', '카페 오픈 15초\n손과 간판'), '카페 오픈 15초');
    assert.equal(leftoverJobTitle('ㅇ'), true);
    assert.equal(leftoverJobTitle('ㅇㅇ'), true);
    assert.equal(leftoverJobTitle('타르코프 게임 영상을 만들어줘'), false);
    assert.equal(titleFromPrompt('ㅇ', '타르코프 게임 영상을 만들어줘'), '타르코프 게임 영상을 만들어줘');
    assert.equal(titleFromPrompt('타르코프', '다른 말'), '타르코프');
    assert.deepEqual(canStartAuto({
      title: '',
      goal: 'https://example.com/open',
      attached: true,
      useScrape: true,
    }), { ok: false, reason: 'materials' });
    assert.equal(collectQueryIsUrlList('카페 오픈 손·간판'), false);
    assert.equal(collectQueryIsUrlList('https://example.com/a.mp4\nhttps://example.com/b.jpg'), true);
    assert.deepEqual(collectUrlLines('  https://example.com/a.mp4  \n손과 간판\nhttps://example.com/b.jpg'), [
      'https://example.com/a.mp4',
      'https://example.com/b.jpg',
    ]);
    assert.deepEqual(collectUrlLines('file:///etc/passwd\nhttp://127.0.0.1/secret.mp4\nhttps://example.com/ok.mp4'), [
      'https://example.com/ok.mp4',
    ]);
    assert.equal(collectQueryIsUrlList('http://169.254.169.254/latest/meta-data'), false);
    assert.equal(collectQueryIsUrlList('http://[fd12:3456::1]/clip.mp4'), false);
    assert.equal(collectQueryIsUrlList('http://[fe80::1]/clip.mp4'), false);
    assert.equal(collectQueryIsUrlList('http://[::ffff:127.0.0.1]/secret.mp4'), false);
    assert.equal(collectQueryIsUrlList('http://[::ffff:169.254.169.254]/latest/meta-data'), false);
    assert.equal(collectQueryIsUrlList('http://[::ffff:7f00:1]/secret.mp4'), false);
    assert.equal(collectQueryIsUrlList('http://2130706433/secret.mp4'), false);
    assert.equal(collectQueryIsUrlList('http://metadata.goog/latest'), false);
    assert.equal(collectQueryIsUrlList('http://127.1/secret.mp4'), false);
    assert.equal(collectQueryIsUrlList('https://example.com/ok.mp4'), true);
  });
});

describe('auto desk job payload', () => {
  it('records own files, the scrape list, or both on the existing spec fields', () => {
    assert.equal(autoSourceMode({ useOwn: true, useScrape: true }), 'own_and_collect');
    assert.equal(autoJobPayload({
      title: '',
      goal: '카페 오픈 15초, 손과 간판',
      recipeId: 'instagram_reel',
      language: 'ko',
    }).source_mode, 'bot');
    assert.deepEqual(autoJobPayload({
      title: '카페 오픈',
      goal: '손과 간판',
      recipeId: 'tiktok_tight',
      language: 'ko',
      useScrape: true,
      collectQuery: '  https://example.com/open.mp4  ',
    }), {
      title: '카페 오픈',
      goal: '손과 간판',
      recipe_id: 'tiktok_tight',
      source_mode: 'collect',
      language: 'ko',
      upload: false,
      captions: false,
      collect_query: 'https://example.com/open.mp4',
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
    });
    assert.equal(autoJobPayload({
      title: '카페 오픈',
      goal: '손과 간판',
      recipeId: 'tiktok_tight',
      language: 'ko',
      useScrape: true,
      collectQuery: '카페 오픈 공개 클립',
    }).collect_query, undefined);
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
      collectQuery: 'https://example.com/sign.mp4',
    }).source_mode, 'own_and_collect');
    assert.deepEqual(autoJobPayload({
      title: '상대 경로',
      recipeId: 'instagram_reel',
      language: 'ko',
      useOwn: true,
      ownedPaths: ['inputs\\hero.png'],
      workspaceDir: 'C:\\Users\\a\\Videos\\Grok Crew',
    }).owned_paths, ['C:\\Users\\a\\Videos\\Grok Crew\\inputs\\hero.png']);
    assert.equal(isAbsoluteOwnedPath('inputs\\hero.png'), false);
    assert.equal(isAbsoluteOwnedPath('C:\\Users\\a\\Pictures\\hero.png'), true);
    assert.equal(resolveOwnedPath('inputs/hero.png', '/tmp/Grok Crew'), '/tmp/Grok Crew/inputs/hero.png');
    assert.equal(resolveOwnedPath('inputs/../secret.png', '/tmp/Grok Crew'), 'inputs/../secret.png');
    assert.deepEqual(resolveOwnedPaths(['/tmp/talk.mp4', 'inputs/sign.png'], '/tmp/Grok Crew'), [
      '/tmp/talk.mp4',
      '/tmp/Grok Crew/inputs/sign.png',
    ]);
    assert.equal(autoJobPayload({
      title: '자막 켬',
      recipeId: 'instagram_reel',
      language: 'ko',
      useScrape: true,
      collectQuery: 'https://example.com/a.mp4',
      wantCaptions: true,
    }).captions, true);
    const dubOnly = autoJobPayload({
      title: '더빙 켬',
      recipeId: 'instagram_reel',
      language: 'ko',
      useScrape: true,
      collectQuery: 'https://example.com/a.mp4',
      wantDubbing: true,
    });
    assert.match(String(dubOnly.must_keep), /운영자가 넣은 음성/);
    assert.doesNotMatch(String(dubOnly.must_keep), /Kokoro-82M/);
    assert.equal(autoJobPayload({
      title: '둘 다 끔',
      recipeId: 'instagram_reel',
      language: 'ko',
      useScrape: true,
      collectQuery: 'https://example.com/a.mp4',
    }).must_keep, undefined);
    assert.match(String(autoJobPayload({
      title: 'TTS 켬',
      recipeId: 'instagram_reel',
      language: 'ko',
      useScrape: true,
      collectQuery: 'https://example.com/a.mp4',
      wantTts: true,
    }).must_keep), /Kokoro-82M 하나만/);
    assert.match(String(autoJobPayload({
      title: 'TTS 켬',
      recipeId: 'instagram_reel',
      language: 'ko',
      useScrape: true,
      collectQuery: 'https://example.com/a.mp4',
      wantTts: true,
    }).must_keep), /따뜻한 여자 · 미국 영어/);
    assert.doesNotMatch(String(autoJobPayload({
      title: 'TTS 켬',
      recipeId: 'instagram_reel',
      language: 'ko',
      useScrape: true,
      collectQuery: 'https://example.com/a.mp4',
      wantTts: true,
      voiceAccent: 'ko',
    }).must_keep), /한국어/);
    assert.match(String(autoJobPayload({
      title: 'TTS 켬',
      recipeId: 'instagram_reel',
      language: 'ko',
      useScrape: true,
      collectQuery: 'https://example.com/a.mp4',
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
      collectQuery: 'https://example.com/a.mp4',
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
      collectQuery: 'https://example.com/a.mp4',
      wantTts: true,
      voiceModelId: 'zonos-v0.1',
    }).must_keep), /Zonos-v0.1 하나만/);
    assert.match(String(autoJobPayload({
      title: 'TTS on',
      recipeId: 'instagram_reel',
      language: 'en',
      useScrape: true,
      collectQuery: 'https://example.com/a.mp4',
      wantTts: true,
    }).must_keep), /TTS uses only Kokoro-82M/);
    assert.doesNotMatch(String(autoJobPayload({
      title: 'TTS on',
      recipeId: 'instagram_reel',
      language: 'en',
      useScrape: true,
      collectQuery: 'https://example.com/a.mp4',
      wantTts: true,
    }).must_keep), /하나만/);
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
    assert.equal(recipeFallbackLabel('youtube_long', 'ko'), '유튜브 본편');
    assert.equal(recipeFallbackLabel('youtube_long', 'en'), 'YouTube long');
    assert.equal(recipeFallbackLabel('youtube_long', 'zh'), 'YouTube 长视频');
    assert.equal(recipeFallbackLabel('youtube_long', 'ja'), 'YouTube 本編');
    assert.equal(recipeFallbackLabel('instagram_reel', 'ko'), '릴스');
    assert.equal(recipeFallbackLabel('instagram_reel', 'en'), 'Reels');
    assert.equal(recipeFallbackLabel('instagram_reel', 'ja'), 'リール');
    assert.equal(recipeFallbackLabel('tiktok_tight', 'ko'), '틱톡');
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

  it('returns to waiting when 다시 말하기 copied a new spec over an old cut', () => {
    const wait = { specId: 'spec-2', title: '다시 말하기', copiedAt: '2026-08-27T04:00:00.000Z', pasteTarget: 'Grok' };
    assert.equal(autoDeskStage({
      wait,
      pull: 'none',
      hasProject: true,
      watchSpecId: 'spec-2',
    }), 'waiting');
    assert.equal(autoDeskStage({
      wait,
      pull: 'arrived',
      hasProject: true,
      watchSpecId: 'spec-2',
    }), 'arrived');
    assert.equal(autoDeskStage({
      wait,
      pull: 'none',
      hasProject: true,
    }), 'arrived');
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
    memory.set(AUTO_PREFS_KEY, JSON.stringify({
      voiceModelId: 'kokoro-82m',
      voiceAccent: 'ko',
    }));
    assert.equal(readAutoPrefs().voiceAccent, 'en-us');
    assert.equal(readAutoPrefs().voiceModelId, 'kokoro-82m');
  });

  it('names connected seats, never a mystery active bot', () => {
    assert.equal(attachedBotName({ bots: [{ display_name: 'Grok', presence: 'active' }] }), '');
    assert.equal(attachedBotName({
      bots: [{ bot_id: 'grok-planner', display_name: 'Grok', presence: 'active' }],
    }), 'Grok Bot 1 -기획자');
    assert.equal(attachedBotName({
      bots: [{ display_name: 'Grok Bot 기획자', presence: 'active' }],
    }), 'Grok Bot 1 -기획자');
    assert.equal(attachedBotName({
      bots: [
        { bot_id: 'grok-planner', display_name: 'Grok', presence: 'active' },
        { bot_id: 'grok-scraper', display_name: 'Grok', presence: 'active' },
      ],
    }), 'Grok Bot 1 -기획자 · Grok Bot 2 -스크래핑');
    assert.equal(attachedBotName({
      bots: [{ bot_id: 'grok-editor', display_name: 'Grok Bot ???', presence: 'active' }],
    }), 'Grok Bot 1 -편집자');
    assert.equal(attachedBotName(undefined, ['Claude']), '');
    assert.equal(attachedBotName(undefined, ['Grok Bot 기획자']), 'Grok Bot 기획자');
    assert.equal(attachedBotName(undefined, []), '');
    assert.doesNotMatch(attachedBotName({ bots: [{ display_name: 'Grok ???', presence: 'active' }] }), /\?\?\?/);
  });

  it('shows image thumbs and a short mp4 name, and resets compose after 새로 만들기', () => {
    assert.equal(ownedMediaKind('C:/Users/a/Pictures/sign.png'), 'image');
    assert.equal(ownedMediaKind('C:/Users/a/Videos/talk.mp4'), 'video');
    assert.equal(ownedFileExtension('talk.mp4'), 'MP4');
    assert.equal(shortOwnedFileName('grok3e7089c-very-long-name-6db00e5e.mp4'), 'grok3e7089c....mp4');
    assert.equal(localFilePreviewUrl('C:\\Users\\a\\Pictures\\sign.png'), 'file:///C:/Users/a/Pictures/sign.png');
    assert.equal(localFilePreviewUrl('file:///etc/passwd'), '');
    assert.equal(localFilePreviewUrl('C:\\Users\\a\\Videos\\talk.mp4'), '');
    assert.equal(libraryPreviewUrl('C:\\Users\\a\\Videos\\talk.mp4'), 'file:///C:/Users/a/Videos/talk.mp4');
    assert.equal(libraryPreviewUrl('inputs/sign.png', 'http://127.0.0.1:7214/media/inputs/sign.png'), 'http://127.0.0.1:7214/media/inputs/sign.png');
    assert.equal(localFilePreviewUrl('/tmp/../etc/passwd.png'), '');
    assert.equal(localFilePreviewUrl('/tmp/%2e%2e/etc/passwd.png'), '');
    assert.equal(localFilePreviewUrl('C:/Users/a/Pictures/sign.png?x=1'), '');
    assert.equal(safeWorkspaceRel('/workspace/local_studio/workspace/inputs/a.mp4'), 'inputs/a.mp4');
    assert.equal(safeWorkspaceRel('../etc/passwd'), '');
    assert.equal(safeWorkspaceRel('https://evil.example/a.mp4'), '');
    assert.equal(safeWorkspaceRel('javascript:alert(1)'), '');
    assert.equal(safeStudioOrigin('https://evil.example/api'), 'http://127.0.0.1:7214');
    assert.equal(safeStudioOrigin('http://127.0.0.1:9001/steal'), 'http://127.0.0.1:9001');
    assert.equal(safeStudioOrigin('http://user:pass@127.0.0.1:7214'), 'http://127.0.0.1:7214');
    assert.equal(safeStudioOrigin('http://127.0.0.1:7214@evil.example/'), 'http://127.0.0.1:7214');
    const csp = readFileSync(new URL('../next.config.ts', import.meta.url), 'utf8');
    assert.match(csp, /object-src 'none'/);
    assert.match(csp, /frame-src 'none'/);
    assert.match(csp, /Permissions-Policy/);
    assert.deepEqual(writeAnotherComposeReset(), {
      stayOnCompose: true,
      ownedPaths: [],
      useOwn: false,
      useScrape: false,
      collectQuery: '',
      title: '',
      goal: '',
    });
    assert.equal(autoDeskStage({
      wait: { specId: 'spec-1', title: '카페', copiedAt: '2026-08-27T03:00:00.000Z', pasteTarget: 'Grok' },
      pull: 'arrived',
      hasProject: true,
      stayOnCompose: writeAnotherComposeReset().stayOnCompose,
    }), 'compose');
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
    assert.equal(rows[0].mark, 'idle');
    assert.match(rows[0].detail, /대기 · 연결됨/);
    assert.doesNotMatch(rows[0].detail, /할 일은 아직 안 적음/);
    assert.doesNotMatch(rows[0].name, /\?\?\?/);
    assert.equal(heartbeatActionLabel('still_here', 'ko'), '이 자리에 있음 · 할 일은 아직 안 적음');
    assert.equal(autoWaitHeadline(rows, 'ko').showUnknownRead, true);
    assert.match(autoWaitHeadline(rows, 'ko').title, /할 일을 남긴 자리가 아직 없습니다/);
  });

  it('uses a work heartbeat over still_here for the current seat', () => {
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
      activity: [{
        id: 'work-1',
        bot_id: 'grok-planner',
        action: 'plan_started',
        created_at: '2026-08-27T03:01:30.000Z',
      }],
    });
    assert.equal(rows[0].mark, 'current');
    assert.match(rows[0].detail, /컷 계획 쓰는 중/);
    assert.equal(autoWaitHeadline(rows, 'ko').showUnknownRead, false);
    assert.match(autoWaitHeadline(rows, 'ko').title, /컷 계획을 쓰는 중/);
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
    assert.deepEqual(rows.map((row) => row.mark), ['idle', 'idle', 'idle']);
    assert.equal(rows[0].detail, '대기 · 연결됨');
    assert.equal(rows[1].detail, '대기 · 연결됨');
    assert.equal(rows[2].detail, '대기 · 연결됨');
    assert.equal(autoWaitHeadline(rows, 'ko').showUnknownRead, true);
  });

  it('makes the planner current on plan_started and leaves others waiting', () => {
    const rows = autoSeatRows({
      roster: {
        bots: [
          { bot_id: 'grok-planner', display_name: 'Grok Bot 기획자', presence: 'active', last_action: 'plan_started', seconds_since_checkin: 60 },
          { bot_id: 'grok-scraper', display_name: 'Grok Bot 스크래핑', presence: 'active', last_action: 'still_here', seconds_since_checkin: 10 },
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
    assert.equal(lines.length, 2);
    assert.equal(lines[0].name, 'Grok Bot 기획자');
    assert.equal(lines[0].text, '컷 계획 쓰는 중');
    assert.equal(lines[1].name, 'Grok Bot 편집자');
    assert.equal(lines[1].text, '컷을 이 창에 두는 중');
    assert.doesNotMatch(JSON.stringify(lines), /plan_started|still_here|cut_ready|hacked|\?\?\?|이 자리에 있음/);
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
    assert.equal(botSeenSeconds({
      bots: [{
        bot_id: 'grok-planner',
        display_name: 'Grok Bot 기획자',
        presence: 'active',
        last_action: 'plan_started',
        seconds_since_checkin: 95,
      }],
    }), 95);
    assert.equal(botSeenSeconds({ bots: [{ display_name: 'Cursor', presence: 'active', seconds_since_checkin: 95 }] }), null);
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

describe('auto desk seats and inbox guards', () => {
  it('keeps three job seats when only the planner is attached', () => {
    const rows = alwaysCrewSeats({
      roster: {
        bots: [{
          bot_id: 'grok-planner',
          display_name: 'Grok Bot 기획자',
          presence: 'active',
          last_action: 'still_here',
        }],
      },
      language: 'ko',
    });
    assert.equal(rows.length, 3);
    assert.deepEqual(rows.map((row) => row.role), ['planner', 'scraper', 'editor']);
    assert.equal(rows[0].connected, true);
    assert.equal(rows[1].connected, false);
    assert.equal(rows[2].connected, false);
    assert.equal(rows[1].name, 'Grok Bot 스크래핑');
    assert.equal(autoSeatRows({
      roster: {
        bots: [{ bot_id: 'grok-planner', display_name: 'Grok Bot 기획자', presence: 'active' }],
      },
    }).length, 1);
  });

  it('names Agent seats when only Agent is attached', () => {
    const links = {
      pairCode: 'QDWAVN',
      bots: [{
        id: 'c-planner',
        name: 'Agent 기획자',
        kind: 'custom',
        role: 'planner',
        place: 'other_pc',
        status: 'connected',
        pairCode: 'QDWAVN',
      }],
    };
    assert.equal(preferredSeatFamily(undefined, links), 'custom');
    const rows = alwaysCrewSeats({ links, language: 'ko' });
    assert.equal(rows[0].name, 'Agent 기획자');
    assert.equal(rows[1].name, 'Agent 스크래핑');
    assert.equal(rows[2].connected, false);
  });

  it('moves the paste target to the next seat after a ready handoff', () => {
    const idle = alwaysCrewSeats({
      roster: {
        bots: [{ bot_id: 'grok-planner', display_name: 'Grok Bot 기획자', presence: 'active', last_action: 'still_here' }],
      },
      language: 'ko',
    });
    assert.equal(pasteTargetForSeats(idle, 'ko'), 'Grok Bot 기획자');
    const afterPlan = alwaysCrewSeats({
      roster: {
        bots: [
          { bot_id: 'grok-planner', display_name: 'Grok Bot 기획자', presence: 'active', last_action: 'plan_ready' },
          { bot_id: 'grok-scraper', display_name: 'Grok Bot 스크래핑', presence: 'active', last_action: 'still_here' },
        ],
      },
      language: 'ko',
    });
    assert.equal(pasteTargetForSeats(afterPlan, 'ko'), 'Grok Bot 스크래핑');
    assert.equal(pasteTargetRole(idle), 'planner');
    assert.equal(pasteTargetRole(afterPlan), 'scraper');
    const afterCollect = alwaysCrewSeats({
      roster: {
        bots: [
          { bot_id: 'grok-planner', display_name: 'Grok Bot 기획자', presence: 'active', last_action: 'plan_ready' },
          { bot_id: 'grok-scraper', display_name: 'Grok Bot 스크래핑', presence: 'active', last_action: 'collect_ready' },
        ],
      },
      language: 'ko',
    });
    assert.equal(pasteTargetRole(afterCollect), 'planner');
    assert.equal(pasteTargetForSeats(afterCollect, 'ko'), 'Grok Bot 기획자');
  });

  it('hides the human paste when the current Grok seat is checked in on this PC', () => {
    const roster = {
      bots: [{ bot_id: 'grok-planner', display_name: 'Grok Bot 기획자', presence: 'active', last_action: 'still_here' }],
    };
    const rows = alwaysCrewSeats({ roster, language: 'ko' });
    assert.equal(samePcInviteReady(rows, roster), false);
    const deskEntered = {
      pairCode: 'QDWAVN',
      bots: [{
        id: 'p1',
        name: 'Grok Bot 기획자',
        kind: 'grok',
        role: 'planner',
        place: 'other_pc',
        status: 'connected',
        pairCode: 'QDWAVN',
        confirmedAt: '2026-08-29T16:00:00.000Z',
        confirmedFrom: 'ok-reply',
      }],
    };
    assert.equal(samePcInviteReady(rows, roster, deskEntered), false);
    memory.set('grok-crew-last-connect-bundle', JSON.stringify({
      market: 'kr',
      recipeId: 'instagram_reel',
      language: 'ko',
      copiedAt: '2026-08-29T15:00:00.000Z',
      generation: 'desk-connect-1|QDWAVN|kr|instagram_reel|ko',
    }));
    sessionMemory.delete('grok-crew-desk-session');
    assert.equal(samePcInviteReady(rows, roster, deskEntered), false);
    memory.delete('grok-crew-last-connect-bundle');
    sessionMemory.delete('grok-crew-desk-session');
    assert.equal(samePcInviteReady(rows, roster, deskEntered, {
      sessionStartedAt: '2026-08-30T07:00:00.000Z',
    }), false);
    assert.equal(samePcInviteReady(rows, roster, {
      ...deskEntered,
      bots: [{ ...deskEntered.bots[0], confirmedAt: '2026-08-30T07:05:00.000Z', connectedAt: '2026-08-30T07:05:00.000Z' }],
    }, {
      sessionStartedAt: '2026-08-30T07:00:00.000Z',
      connectCopiedAt: '2026-08-30T07:01:00.000Z',
      connectGeneration: 'desk-connect-1|QDWAVN|kr|instagram_reel|ko',
      currentGeneration: 'desk-connect-1|QDWAVN|kr|instagram_reel|ko',
    }), true);
    assert.equal(samePcInviteReady(rows, roster, {
      ...deskEntered,
      bots: [{ ...deskEntered.bots[0], confirmedAt: '2026-08-30T07:05:00.000Z', connectedAt: '2026-08-30T07:05:00.000Z' }],
    }, {
      sessionStartedAt: '2026-08-30T07:00:00.000Z',
      connectCopiedAt: '2026-08-30T07:01:00.000Z',
      connectGeneration: 'desk-connect-1|OLD|kr|instagram_reel|ko',
      currentGeneration: 'desk-connect-1|QDWAVN|kr|instagram_reel|ko',
    }), false);
    const auto = readFileSync(new URL('./desktop-auto-desk.tsx', import.meta.url), 'utf8');
    assert.match(auto, /완성되면 여기에 영상이 올라옵니다/);
    assert.match(auto, /jobTitle=\{titleFromPrompt\(wait\?\.title \|\| title, goal\)\}/);
    assert.equal(auto.includes('끝난 파일을 직접 놓기'), false);
    assert.equal(auto.includes('어제 인박스에 혼자 남은 컷'), false);
    assert.equal(auto.includes('퍼센트는 없습니다'), false);
    assert.match(auto, /desktop-auto-new/);
    assert.match(auto, /samePcInviteReady/);
    assert.match(auto, /sessionStartedAt: ensureDeskSessionStartedAt\(\)/);
    assert.match(auto, /다시 복사 · \$\{pasteTarget\}/);
    assert.match(auto, /samePcPull \|\| showArrived \? null/);
    assert.match(auto, /desktop-auto-place/);
    assert.match(auto, /desktop-auto-drop is-here/);
    assert.match(auto, /data-arrived/);
    assert.match(auto, /여기에 놓기 · 최근기록에도 같은 컷입니다/);
    assert.match(auto, /다시 옮기기/);
    assert.match(auto, /deskNotice/);
    const workspace = readFileSync(new URL('./desktop-workspace.tsx', import.meta.url), 'utf8');
    assert.match(workspace, /수집함에 파일이 있습니다/);
    assert.match(workspace, /다시 옮기기|onRetryRecent/);
    assert.doesNotMatch(auto, /desktop-auto-preview desktop-auto-canvas/);
    assert.match(auto, /사람 손길/);
    assert.match(auto, /불이 켜져 있어도 이 자리 글이 안 갔으면/);
    assert.match(auto, /봇이 읽을 글 보기/);
    assert.match(auto, /hasWaitingCopiedSeat/);
    assert.match(auto, /연결에서 붙일 글을 먼저 복사하세요/);
    assert.doesNotMatch(auto, /봇이 읽는 중/);
    const pasted = alwaysCrewSeats({
      links: {
        pairCode: 'QDWAVN',
        bots: [{
          id: 'p1',
          name: 'Grok Bot 기획자',
          kind: 'grok',
          role: 'planner',
          place: 'other_pc',
          status: 'connected',
          pairCode: 'QDWAVN',
        }],
      },
      language: 'ko',
    });
    assert.equal(samePcInviteReady(pasted, undefined), false);
    const agent = alwaysCrewSeats({
      links: {
        pairCode: 'QDWAVN',
        bots: [{
          id: 'c1',
          name: 'Agent 기획자',
          kind: 'custom',
          role: 'planner',
          place: 'other_pc',
          status: 'connected',
          pairCode: 'QDWAVN',
        }],
      },
      language: 'ko',
    });
    assert.equal(samePcInviteReady(agent, undefined), false);
    const workingEditor = alwaysCrewSeats({
      roster: {
        bots: [
          { bot_id: 'grok-planner', display_name: 'Grok Bot 기획자', presence: 'active', last_action: 'plan_ready' },
          { bot_id: 'grok-scraper', display_name: 'Grok Bot 스크래핑', presence: 'active', last_action: 'collect_ready' },
          { bot_id: 'grok-editor', display_name: 'Grok Bot 편집자', presence: 'active', last_action: 'cut_started' },
        ],
      },
      links: {
        pairCode: 'QDWAVN',
        bots: [{
          id: 'e1',
          name: 'Grok Bot 편집자',
          kind: 'grok',
          role: 'editor',
          place: 'other_pc',
          status: 'waiting',
          pairCode: 'QDWAVN',
        }],
      },
      language: 'ko',
    });
    assert.equal(pasteTargetRole(workingEditor), 'editor');
    assert.equal(samePcInviteReady(workingEditor, {
      bots: [
        { bot_id: 'grok-planner', display_name: 'Grok Bot 기획자', presence: 'active', last_action: 'plan_ready' },
        { bot_id: 'grok-scraper', display_name: 'Grok Bot 스크래핑', presence: 'active', last_action: 'collect_ready' },
        { bot_id: 'grok-editor', display_name: 'Grok Bot 편집자', presence: 'active', last_action: 'cut_started' },
      ],
    }, {
      pairCode: 'QDWAVN',
      bots: [{
        id: 'e1',
        name: 'Grok Bot 편집자',
        kind: 'grok',
        role: 'editor',
        place: 'other_pc',
        status: 'waiting',
        pairCode: 'QDWAVN',
      }],
    }), true);
  });

  it('does not auto-pull leftover inbox files or close a wait for a wrap_loose cut', () => {
    const wait = { specId: 'spec-today', title: '오늘', copiedAt: '2026-08-28T03:00:00.000Z', pasteTarget: 'Grok Bot 기획자' };
    assert.equal(shouldAutoPullInbox({
      connectOpen: true,
      wait,
      pending: 2,
      pendingAtWaitStart: 0,
    }), false);
    assert.equal(shouldAutoPullInbox({
      connectOpen: false,
      wait: null,
      pending: 1,
      pendingAtWaitStart: null,
    }), false);
    assert.equal(shouldAutoPullInbox({
      connectOpen: false,
      wait,
      pending: 1,
      pendingAtWaitStart: 1,
    }), false);
    assert.equal(shouldAutoPullInbox({
      connectOpen: false,
      wait,
      pending: 2,
      pendingAtWaitStart: 1,
    }), true);
    const leftoverStamp = inboxDoorStamp({
      pending_count: 1,
      pending: ['drop-old-2026-08-28T01-00-00Z'],
      newest_mtime: '2026-08-28T01:00:00+00:00',
      total_bytes: 40,
    });
    const overwritten = inboxDoorStamp({
      pending_count: 1,
      pending: ['drop-old-2026-08-28T01-00-00Z'],
      newest_mtime: '2026-08-30T07:10:00+00:00',
      total_bytes: 96,
    });
    assert.equal(inboxStampChanged(leftoverStamp, leftoverStamp), false);
    assert.equal(inboxStampChanged(leftoverStamp, overwritten), true);
    assert.equal(shouldAutoPullInbox({
      connectOpen: false,
      wait,
      pending: 1,
      pendingAtWaitStart: 1,
      stamp: leftoverStamp,
      stampAtWaitStart: leftoverStamp,
    }), false);
    assert.equal(shouldAutoPullInbox({
      connectOpen: false,
      wait,
      pending: 1,
      pendingAtWaitStart: 1,
      stamp: overwritten,
      stampAtWaitStart: leftoverStamp,
    }), true);
    assert.equal(misplacedInboxDoor({ editorPending: 0, collectorPending: 1, materialsPending: 0 }), 'collector');
    assert.equal(misplacedInboxDoor({ editorPending: 1, collectorPending: 2, materialsPending: 0 }), '');
    assert.equal(misplacedInboxDoor({ editorPending: 0, collectorPending: 0, materialsPending: 2 }), 'materials');
    assert.equal(shouldClearWaitForImport({ waitSpecId: 'spec-today', importedSpecId: '', importedProjectId: 'proj-1' }), true);
    assert.equal(shouldClearWaitForImport({ waitSpecId: 'spec-today', importedSpecId: 'spec-old', importedProjectId: 'proj-1' }), false);
    assert.equal(shouldClearWaitForImport({ waitSpecId: 'spec-today', importedSpecId: 'spec-today', importedProjectId: 'proj-1' }), true);
    assert.equal(shouldClearWaitForImport({ waitSpecId: 'spec-today', importedSpecId: '', importedProjectId: '' }), false);
    const leftover = pickArrivedImport([
      { project: { id: 'old' }, folder: 'drop-old-2026-08-28T01-00-00Z' },
      { project: { id: 'fresh' }, folder: 'drop-fresh-2026-08-29T17-00-00Z' },
      { project: { id: 'match' }, edit_spec_id: 'spec-today', folder: 'drop-match' },
    ], 'spec-today');
    assert.equal(leftover?.project?.id, 'match');
    const loose = pickArrivedImport([
      { project: { id: 'old' }, folder: 'drop-old-2026-08-28T01-00-00Z' },
      { project: { id: 'fresh' }, folder: 'drop-fresh-2026-08-29T17-00-00Z' },
    ], 'spec-today');
    assert.equal(loose?.project?.id, 'fresh');
    const afterWait = pickArrivedImport([
      { project: { id: 'old' }, folder: 'drop-old-2026-08-28T01-00-00Z' },
      { project: { id: 'leftover' }, folder: 'drop-leftover-2026-08-29T17-00-00Z' },
      { project: { id: 'new' }, folder: 'drop-new-2026-08-30T07-00-00Z' },
    ], 'spec-today', '2026-08-30T06:00:00.000Z');
    assert.equal(afterWait?.project?.id, 'new');
    assert.equal(pickArrivedImport([
      { project: { id: 'old' }, folder: 'drop-old-2026-08-28T01-00-00Z' },
    ], 'spec-today', '2026-08-30T06:00:00.000Z'), null);
    assert.equal(pickArrivedImport([
      { project: { id: 'over' }, folder: 'drop-old-2026-08-28T01-00-00Z', updated_at: '2026-08-30T07:10:00+00:00' },
    ], 'spec-today', '2026-08-30T06:00:00.000Z')?.project?.id, 'over');
    assert.equal(importedEditSpecId([{ project: { id: 'p1' }, edit_spec_id: 'spec-today' }]), 'spec-today');
    assert.equal(importedEditSpecId([{ project: { id: 'p1' } }]), '');
  });
});

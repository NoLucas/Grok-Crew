import assert from 'node:assert/strict';
import { register } from 'node:module';
import { describe, it } from 'node:test';

register('./timeline/ts-resolver.helper.mjs', import.meta.url);

const {
  AUTO_PREFS_KEY,
  DEFAULT_RECIPE_ID,
  attachedBotName,
  autoMachineState,
  autoPhaseLamps,
  canStartAuto,
  readAutoPrefs,
  suggestRecipeId,
  writeAutoPrefs,
} = await import('./desktop-auto-desk.ts');

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
    assert.deepEqual(canStartAuto({ title: '15초 훅 릴', attached: true }), { ok: true });
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
    writeAutoPrefs({ recipeId: 'tiktok_tight' });
    assert.equal(readAutoPrefs().recipeId, 'tiktok_tight');
    assert.equal(memory.get(AUTO_PREFS_KEY), '{"recipeId":"tiktok_tight"}');
  });

  it('uses the bot name, not a role name', () => {
    assert.equal(attachedBotName({ bots: [{ display_name: 'Grok', presence: 'active' }] }), 'Grok');
    assert.equal(attachedBotName(undefined, ['Claude']), 'Claude');
    assert.equal(attachedBotName(undefined, []), '');
  });
});

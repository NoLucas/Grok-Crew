import assert from 'node:assert/strict';
import { register } from 'node:module';
import { describe, it } from 'node:test';

register('./timeline/ts-resolver.helper.mjs', import.meta.url);

const {
  DESK_WAIT_KEY,
  FIRST_CUT_KEY,
  clearDeskWait,
  formatCheckTime,
  markFirstCutArrived,
  readDeskWait,
  readFirstCutArrived,
  writeDeskWait,
} = await import('./desktop-wait-state.ts');

const memory = new Map();

globalThis.window = {
  localStorage: {
    getItem: (key) => (memory.has(key) ? memory.get(key) : null),
    setItem: (key, value) => { memory.set(key, String(value)); },
    removeItem: (key) => { memory.delete(key); },
  },
};

describe('desk wait state', () => {
  it('keeps a copied wait and forgets junk', () => {
    memory.clear();
    assert.equal(readDeskWait(), null);
    writeDeskWait({
      specId: 'spec-1',
      title: '15s hook',
      copiedAt: '2026-08-27T03:00:00.000Z',
      pasteTarget: 'Cursor',
    });
    assert.deepEqual(readDeskWait(), {
      specId: 'spec-1',
      title: '15s hook',
      copiedAt: '2026-08-27T03:00:00.000Z',
      pasteTarget: 'Cursor',
    });
    memory.set(DESK_WAIT_KEY, '{"nope":true}');
    assert.equal(readDeskWait(), null);
    writeDeskWait({
      specId: 'spec-2',
      title: 'Again',
      copiedAt: '2026-08-27T03:01:00.000Z',
      pasteTarget: 'Cursor',
    });
    clearDeskWait();
    assert.equal(readDeskWait(), null);
    memory.set(DESK_WAIT_KEY, JSON.stringify({
      specId: 'spec-3',
      title: 'No target',
      copiedAt: '2026-08-27T03:02:00.000Z',
    }));
    assert.equal(readDeskWait()?.pasteTarget, 'Grok Bot');
    writeDeskWait({
      specId: 'spec-4',
      title: 'Keep invite',
      copiedAt: '2026-08-27T03:03:00.000Z',
      pasteTarget: 'Grok Bot',
      inviteText: '  봇 창에 붙일 글  ',
    });
    assert.equal(readDeskWait()?.inviteText, '봇 창에 붙일 글');
    memory.set(DESK_WAIT_KEY, JSON.stringify({
      specId: 'spec-5',
      title: 'Old wait',
      copiedAt: '2026-08-27T03:04:00.000Z',
      pasteTarget: 'Grok Bot',
    }));
    assert.equal(readDeskWait()?.inviteText, undefined);
  });

  it('remembers the first arrived cut', () => {
    memory.clear();
    assert.equal(readFirstCutArrived(), false);
    markFirstCutArrived();
    assert.equal(readFirstCutArrived(), true);
    assert.equal(memory.get(FIRST_CUT_KEY), '1');
  });

  it('prints a clock the person can read', () => {
    assert.equal(formatCheckTime('', 'ko'), '');
    assert.equal(formatCheckTime('not-a-date', 'en'), '');
    assert.match(formatCheckTime('2026-08-27T03:04:05.000Z', 'en'), /\d/);
  });
});

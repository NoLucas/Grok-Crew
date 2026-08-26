import assert from 'node:assert/strict';
import { register } from 'node:module';
import { describe, it } from 'node:test';

register('./timeline/ts-resolver.helper.mjs', import.meta.url);

const {
  DEFAULT_NOTE_FOLDS,
  normalizeNoteFolds,
  statusNoteOpen,
} = await import('./desktop-note-folds.ts');

describe('desktop note folds', () => {
  it('starts with the three helper notes folded', () => {
    assert.deepEqual(DEFAULT_NOTE_FOLDS, { lock: false, status: false, remote: false });
    assert.deepEqual(normalizeNoteFolds(null), DEFAULT_NOTE_FOLDS);
    assert.deepEqual(normalizeNoteFolds({ lock: true, extra: 1 }), {
      lock: true,
      status: false,
      remote: false,
    });
  });

  it('keeps error and loading status visible even when the note is folded', () => {
    assert.equal(statusNoteOpen(false, 'ready'), false);
    assert.equal(statusNoteOpen(false, 'error'), true);
    assert.equal(statusNoteOpen(false, 'loading'), true);
    assert.equal(statusNoteOpen(true, 'ready'), true);
  });
});

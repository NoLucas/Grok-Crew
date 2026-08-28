import assert from 'node:assert/strict';
import { register } from 'node:module';
import { describe, it } from 'node:test';

register('./timeline/ts-resolver.helper.mjs', import.meta.url);

const {
  LANGUAGE_CHOSEN_KEY,
  LANGUAGE_STORAGE_KEY,
  hasChosenLanguage,
  isAppLanguage,
  needsLanguageGate,
} = await import('./language-choice.ts');

const memory = new Map();
globalThis.window = {
  localStorage: {
    getItem: (key) => (memory.has(key) ? memory.get(key) : null),
    setItem: (key, value) => { memory.set(key, String(value)); },
    removeItem: (key) => { memory.delete(key); },
  },
};

describe('desktop language gate', () => {
  it('does not guess a browser locale and waits for an explicit pick', () => {
    memory.clear();
    assert.equal(isAppLanguage('ko'), true);
    assert.equal(isAppLanguage('fr'), false);
    assert.equal(needsLanguageGate(), true);
    assert.equal(hasChosenLanguage(), false);
    memory.set(LANGUAGE_STORAGE_KEY, 'en');
    assert.equal(hasChosenLanguage(), true);
    assert.equal(needsLanguageGate(), false);
    memory.clear();
    memory.set(LANGUAGE_CHOSEN_KEY, '1');
    assert.equal(hasChosenLanguage(), true);
  });
});

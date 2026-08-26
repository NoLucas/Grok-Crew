import assert from 'node:assert/strict';
import { register } from 'node:module';
import { describe, it } from 'node:test';

register('./timeline/ts-resolver.helper.mjs', import.meta.url);

const {
  APPEARANCE_STORAGE_KEY,
  DEFAULT_APPEARANCE,
  appearanceDataAttrs,
  loadAppearance,
  normalizeAppearance,
  saveAppearance,
} = await import('./desktop-appearance.ts');

describe('desktop appearance', () => {
  it('keeps the current light desk as the default', () => {
    assert.deepEqual(DEFAULT_APPEARANCE, { theme: 'light', emphasize: true, typeSize: 'm' });
    assert.deepEqual(normalizeAppearance(null), DEFAULT_APPEARANCE);
    assert.deepEqual(normalizeAppearance({}), DEFAULT_APPEARANCE);
  });

  it('accepts the four themes and drops unknown values', () => {
    assert.equal(normalizeAppearance({ theme: 'dark', emphasize: false, typeSize: 'l' }).theme, 'dark');
    assert.equal(normalizeAppearance({ theme: 'low-light' }).theme, 'low-light');
    assert.equal(normalizeAppearance({ theme: 'low-dark' }).theme, 'low-dark');
    assert.deepEqual(
      normalizeAppearance({ theme: 'neon', emphasize: 'yes', typeSize: 4 }),
      DEFAULT_APPEARANCE,
    );
    assert.deepEqual(
      normalizeAppearance({ theme: 'neon', emphasize: false, typeSize: 's' }),
      { theme: 'light', emphasize: false, typeSize: 's' },
    );
  });

  it('maps prefs onto the shell data attributes', () => {
    assert.deepEqual(appearanceDataAttrs({ theme: 'low-dark', emphasize: false, typeSize: 's' }), {
      'data-theme': 'low-dark',
      'data-emphasize': 'off',
      'data-type-size': 's',
    });
    assert.equal(appearanceDataAttrs(DEFAULT_APPEARANCE)['data-emphasize'], 'on');
  });

  it('round-trips through localStorage when window exists', () => {
    const store = new Map();
    globalThis.window = globalThis;
    globalThis.localStorage = {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => { store.set(key, String(value)); },
    };
    saveAppearance({ theme: 'low-light', emphasize: false, typeSize: 'l' });
    assert.equal(JSON.parse(store.get(APPEARANCE_STORAGE_KEY)).theme, 'low-light');
    assert.deepEqual(loadAppearance(), { theme: 'low-light', emphasize: false, typeSize: 'l' });
    store.set(APPEARANCE_STORAGE_KEY, '{not-json');
    assert.deepEqual(loadAppearance(), DEFAULT_APPEARANCE);
  });
});

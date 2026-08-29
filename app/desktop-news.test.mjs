import assert from 'node:assert/strict';
import { register } from 'node:module';
import { describe, it } from 'node:test';

register('./timeline/ts-resolver.helper.mjs', import.meta.url);

const {
  NEWS_PREFS_KEY,
  isNewsEmail,
  newsFormUrl,
  newsPayload,
  readNewsPrefs,
  rememberNewsDismissed,
  rememberNewsSent,
  shouldShowNewsCard,
} = await import('./desktop-news.ts');

const { canStartAuto } = await import('./desktop-auto-state.ts');

const memory = new Map();

globalThis.window = {
  localStorage: {
    getItem: (key) => (memory.has(key) ? memory.get(key) : null),
    setItem: (key, value) => { memory.set(key, String(value)); },
    removeItem: (key) => { memory.delete(key); },
  },
};

describe('news card stays off the start door', () => {
  it('accepts only a simple email', () => {
    assert.equal(isNewsEmail('you@example.com'), true);
    assert.equal(isNewsEmail('  you@example.com  '), true);
    assert.equal(isNewsEmail(''), false);
    assert.equal(isNewsEmail('not-an-email'), false);
  });

  it('hides the card after send or skip', () => {
    memory.clear();
    assert.equal(shouldShowNewsCard(), true);
    rememberNewsDismissed('2026-08-27T00:00:00.000Z');
    assert.equal(shouldShowNewsCard(), false);
    memory.clear();
    rememberNewsSent('2026-08-27T00:00:00.000Z');
    assert.equal(shouldShowNewsCard(), false);
    assert.equal(readNewsPrefs().sentAt, '2026-08-27T00:00:00.000Z');
  });

  it('never asks Auto to wait for news', () => {
    memory.set(NEWS_PREFS_KEY, JSON.stringify({}));
    assert.deepEqual(canStartAuto({
      title: '오늘 릴',
      attached: true,
      useOwn: true,
      ownedPaths: ['/tmp/a.mp4'],
    }), { ok: true });
    assert.deepEqual(canStartAuto({ title: '오늘 릴', attached: true }), { ok: true });
  });

  it('keeps the form URL empty until the operator sets one', () => {
    assert.equal(newsFormUrl(''), '');
    assert.equal(newsFormUrl(' https://form.example/news '), 'https://form.example/news');
    assert.deepEqual(newsPayload(' you@example.com '), { email: 'you@example.com', source: 'grok-crew-desk' });
  });
});

import assert from 'node:assert/strict';
import { register } from 'node:module';
import { describe, it } from 'node:test';

register('./timeline/ts-resolver.helper.mjs', import.meta.url);

const {
  BOT_LINKS_KEY,
  emptyBotLinks,
  hasConnectedBot,
  linkedByKind,
  linkedBySeat,
  makePairCode,
  parseConnectReply,
  readBotLinks,
  remoteConnectPaste,
  suggestedConnectReply,
  upsertLinkedBot,
} = await import('./desktop-bot-links.ts');

const memory = new Map();
globalThis.window = {
  localStorage: {
    getItem: (key) => (memory.has(key) ? memory.get(key) : null),
    setItem: (key, value) => { memory.set(key, String(value)); },
    removeItem: (key) => { memory.delete(key); },
  },
};

describe('remote bot links', () => {
  it('accepts a one-line connect reply with the pair code', () => {
    assert.deepEqual(parseConnectReply('GROK_CREW_OK 7K2M9Q Grok', '7K2M9Q'), { name: 'Grok' });
    assert.deepEqual(parseConnectReply('grok_crew_ok 7k2m9q My Agent', '7K2M9Q'), { name: 'My Agent' });
    assert.equal(parseConnectReply('GROK_CREW_OK 7K2M9Q Grok', 'AAAAAA'), null);
    assert.equal(parseConnectReply('GROK_CREW_OK 7K2M9Q Grok', ''), null);
    assert.equal(parseConnectReply('hello', '7K2M9Q'), null);
    assert.equal(parseConnectReply('', '7K2M9Q'), null);
    assert.deepEqual(
      parseConnectReply('first line\nGROK_CREW_OK 7K2M9Q Grok\n', '7K2M9Q'),
      { name: 'Grok' },
    );
    assert.equal(suggestedConnectReply('grok', '7K2M9Q', 'planner'), 'GROK_CREW_OK 7K2M9Q Grok Bot 기획자');
    assert.equal(suggestedConnectReply('custom', '7K2M9Q', 'scraper'), 'GROK_CREW_OK 7K2M9Q Agent 스크래핑');
    assert.equal(suggestedConnectReply('grok', '7K2M9Q', 'editor'), 'GROK_CREW_OK 7K2M9Q Grok Bot 편집자');
  });

  it('remote paste includes the role skill and never points at a clone or this PC API', () => {
    for (const language of ['ko', 'en', 'zh', 'ja']) {
      const text = remoteConnectPaste('grok', '7K2M9Q', language, 'planner');
      assert.match(text, /Grok Bot/);
      assert.match(text, /7K2M9Q/);
      assert.match(text, /GROK_CREW_OK 7K2M9Q Grok Bot/);
      assert.match(text, /127\.0\.0\.1/);
      assert.match(text, /grok-crew-planner/);
      assert.match(text, /grok-crew-edit-plan/);
      assert.doesNotMatch(text, /Claude/);
      assert.doesNotMatch(text, /Cursor/);
      assert.doesNotMatch(text, /git clone/);
      assert.doesNotMatch(text, /bot-entry/);
    }
    assert.match(remoteConnectPaste('custom', '7K2M9Q', 'ko', 'scraper'), /Agent 스크래핑/);
    assert.match(remoteConnectPaste('custom', '7K2M9Q', 'ko', 'scraper'), /grok-crew-scraper/);
    assert.match(remoteConnectPaste('custom', '7K2M9Q', 'ko', 'scraper'), /grok-crew-public-pick/);
    assert.match(remoteConnectPaste('grok', '7K2M9Q', 'ko', 'editor'), /grok-crew-cut-to-plan/);
  });

  it('treats a linked remote bot as connected and ignores waiting', () => {
    const empty = emptyBotLinks();
    assert.equal(hasConnectedBot(undefined, empty), false);
    const waiting = upsertLinkedBot(empty, {
      id: 'wait',
      name: 'Grok',
      kind: 'grok',
      place: 'other_pc',
      status: 'waiting',
      pairCode: '7K2M9Q',
    });
    assert.equal(hasConnectedBot(undefined, waiting), false);
    const next = upsertLinkedBot(empty, {
      id: 'b1',
      name: 'Grok',
      kind: 'grok',
      place: 'other_pc',
      status: 'connected',
      pairCode: empty.pairCode || '7K2M9Q',
      connectedAt: '2026-08-27T06:00:00.000Z',
    });
    assert.equal(hasConnectedBot(undefined, next), true);
    assert.equal(hasConnectedBot({ bots: [{ display_name: 'Cursor', presence: 'active' }] }, empty), true);
  });

  it('prefers the connected row for a kind', () => {
    const waiting = upsertLinkedBot(emptyBotLinks(), {
      id: 'g-wait',
      name: 'Grok',
      kind: 'grok',
      place: 'other_pc',
      status: 'waiting',
      pairCode: '7K2M9Q',
    });
    const mixed = upsertLinkedBot(waiting, {
      id: 'g-ok',
      name: 'Grok',
      kind: 'grok',
      place: 'other_pc',
      status: 'connected',
      pairCode: '7K2M9Q',
    });
    assert.equal(linkedByKind(mixed.bots, 'grok')?.status, 'connected');
    assert.equal(linkedByKind(waiting.bots, 'cursor'), undefined);
    const seated = upsertLinkedBot(emptyBotLinks(), {
      id: 'g-plan',
      name: 'Grok Bot 기획자',
      kind: 'grok',
      role: 'planner',
      place: 'other_pc',
      status: 'connected',
      pairCode: '7K2M9Q',
    });
    assert.equal(linkedBySeat(seated.bots, 'grok', 'planner')?.name, 'Grok Bot 기획자');
    assert.equal(linkedBySeat(seated.bots, 'grok', 'editor'), undefined);
    assert.equal(linkedBySeat(mixed.bots, 'grok', 'editor')?.status, 'connected');
  });

  it('makes a pair code from a CSPRNG alphabet', () => {
    const first = makePairCode();
    const second = makePairCode();
    assert.match(first, /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
    assert.match(second, /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
    assert.notEqual(first, second);
  });

  it('drops stored bots that are not a known seat', () => {
    memory.set(BOT_LINKS_KEY, JSON.stringify({
      pairCode: '7K2M9Q',
      bots: [
        { id: 'x', name: 'Evil', kind: 'admin', place: 'other_pc', status: 'connected', pairCode: '7K2M9Q' },
        { id: 'ok', name: 'Grok', kind: 'grok', place: 'other_pc', status: 'connected', pairCode: '7K2M9Q' },
      ],
    }));
    const next = readBotLinks();
    assert.equal(next.pairCode, '7K2M9Q');
    assert.deepEqual(next.bots.map((item) => item.id), ['ok']);
  });
});

import assert from 'node:assert/strict';
import { register } from 'node:module';
import { describe, it } from 'node:test';

register('./timeline/ts-resolver.helper.mjs', import.meta.url);

const {
  emptyBotLinks,
  hasConnectedBot,
  linkedByKind,
  parseConnectReply,
  remoteConnectPaste,
  suggestedConnectReply,
  upsertLinkedBot,
} = await import('./desktop-bot-links.ts');

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
    assert.equal(suggestedConnectReply('grok', '7K2M9Q'), 'GROK_CREW_OK 7K2M9Q Grok');
  });

  it('remote paste never points at a clone or this PC API', () => {
    for (const language of ['ko', 'en', 'zh', 'ja']) {
      const text = remoteConnectPaste('grok', '7K2M9Q', language);
      assert.match(text, /Grok/);
      assert.match(text, /7K2M9Q/);
      assert.match(text, /GROK_CREW_OK 7K2M9Q Grok/);
      assert.match(text, /127\.0\.0\.1/);
      assert.doesNotMatch(text, /git clone/);
      assert.doesNotMatch(text, /bot-entry/);
    }
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
  });
});

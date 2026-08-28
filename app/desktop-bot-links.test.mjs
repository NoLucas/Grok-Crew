import assert from 'node:assert/strict';
import { register } from 'node:module';
import { describe, it } from 'node:test';

register('./timeline/ts-resolver.helper.mjs', import.meta.url);

const {
  BOT_LINKS_KEY,
  emptyBotLinks,
  forgetBotLinksOnQuit,
  hasConnectedBot,
  linkedByKind,
  linkedBySeat,
  makePairCode,
  markRemoteCopied,
  parseConnectReply,
  readBotLinks,
  remoteConnectPaste,
  replyMatchesSeat,
  suggestedConnectReply,
  confirmRemoteReplies,
  upsertLinkedBot,
  activeRosterSeat,
  familyIsConnected,
  grokSeatBotId,
  seatIsConnected,
  seatPurpose,
  connectedRemoteNames,
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

  it('Grok paste asks for a Windows check-in and keeps the OK line as fallback', () => {
    for (const language of ['ko', 'en', 'zh', 'ja']) {
      const text = remoteConnectPaste('grok', '7K2M9Q', language, 'planner');
      assert.match(text, /Grok Bot/);
      assert.match(text, /7K2M9Q/);
      assert.match(text, /GROK_CREW_OK 7K2M9Q Grok Bot/);
      assert.match(text, /127\.0\.0\.1:7214\/api\/bot-entry/);
      assert.match(text, /Invoke-RestMethod/);
      assert.match(text, /grok-planner/);
      assert.match(text, /plan_edit/);
      assert.match(text, /heartbeat/);
      assert.match(text, /grok-crew-planner/);
      assert.match(text, /grok-crew-edit-plan/);
      assert.doesNotMatch(text, /Claude/);
      assert.doesNotMatch(text, /Cursor/);
      assert.doesNotMatch(text, /git clone/);
      assert.doesNotMatch(text, /DESKTOP-LJFJI0U/);
    }
    const agent = remoteConnectPaste('custom', '7K2M9Q', 'ko', 'scraper');
    assert.match(agent, /Agent 스크래핑/);
    assert.match(agent, /grok-crew-scraper/);
    assert.match(agent, /grok-crew-public-pick/);
    assert.doesNotMatch(agent, /bot-entry/);
    assert.doesNotMatch(agent, /Invoke-RestMethod/);
    assert.match(remoteConnectPaste('grok', '7K2M9Q', 'ko', 'editor'), /grok-crew-cut-to-plan/);
    assert.match(remoteConnectPaste('grok', '7K2M9Q', 'ko', 'editor'), /grok-editor/);
    assert.equal(grokSeatBotId('editor'), 'grok-editor');
    assert.equal(seatPurpose('scraper'), 'collect');
  });

  it('turns a Grok seat green from an active same-PC check-in', () => {
    const empty = emptyBotLinks();
    const roster = {
      bots: [
        { bot_id: 'grok-editor', display_name: 'Grok Bot 편집자', presence: 'active' },
        { bot_id: 'grok-planner', display_name: 'Grok Bot 기획자', presence: 'idle' },
      ],
    };
    assert.equal(activeRosterSeat(roster, 'editor')?.bot_id, 'grok-editor');
    assert.equal(activeRosterSeat(roster, 'planner'), null);
    assert.equal(seatIsConnected('grok', 'editor', empty, roster), true);
    assert.equal(seatIsConnected('grok', 'planner', empty, roster), false);
    assert.equal(seatIsConnected('grok', 'scraper', empty, roster), false);
    assert.equal(seatIsConnected('custom', 'editor', empty, roster), false);
    assert.equal(familyIsConnected('grok', empty, roster), true);
    assert.equal(familyIsConnected('custom', empty, roster), false);
    assert.deepEqual(connectedRemoteNames(empty, roster), ['Grok Bot 편집자']);
    assert.equal(hasConnectedBot(roster, empty), true);
    const byName = { bots: [{ display_name: 'Grok Bot Planner', presence: 'active' }] };
    assert.equal(seatIsConnected('grok', 'planner', empty, byName), true);
    assert.equal(seatIsConnected('grok', 'editor', empty, byName), false);
  });

  it('marks a copied remote seat as waiting, not connected', () => {
    const empty = { pairCode: '7K2M9Q', bots: [] };
    const next = markRemoteCopied(empty, { kind: 'grok', role: 'planner', language: 'ko' });
    assert.equal(next.bots.length, 1);
    assert.equal(next.bots[0].status, 'waiting');
    assert.equal(next.bots[0].place, 'other_pc');
    assert.equal(hasConnectedBot(undefined, next), false);
  });

  it('attaches a seat when the operator pastes the bot GROK_CREW_OK line', () => {
    const waiting = markRemoteCopied({ pairCode: 'QDWAVN', bots: [] }, { kind: 'grok', role: 'editor', language: 'ko' });
    const miss = confirmRemoteReplies(waiting, 'GROK_CREW_OK AAAAAA Grok Bot 편집자', 'ko');
    assert.equal(miss.confirmed.length, 0);
    assert.equal(hasConnectedBot(undefined, miss.next), false);
    const wrongSeat = confirmRemoteReplies(waiting, 'GROK_CREW_OK QDWAVN Grok Bot 기획자', 'ko');
    assert.equal(wrongSeat.confirmed.length, 1);
    assert.equal(wrongSeat.confirmed[0].role, 'planner');
    const hit = confirmRemoteReplies(waiting, 'GROK_CREW_OK QDWAVN Grok Bot 편집자', 'ko');
    assert.deepEqual(hit.confirmed, [{ kind: 'grok', role: 'editor' }]);
    assert.equal(hit.next.bots[0].status, 'connected');
    assert.ok(hit.next.bots[0].confirmedAt);
    assert.equal(hasConnectedBot(undefined, hit.next), true);
    assert.equal(replyMatchesSeat('Grok Bot 편집자', 'grok', 'editor'), true);
    assert.equal(replyMatchesSeat('Grok Bot 편집자', 'grok', 'planner'), false);
  });

  it('attaches every named seat from a pasted bot chat', () => {
    const empty = { pairCode: 'QDWAVN', bots: [] };
    const chat = [
      'GROK_CREW_OK QDWAVN Grok Bot 편집자',
      '지금은 Grok Crew 편집자로 붙어 있습니다.',
      'GROK_CREW_OK QDWAVN Grok Bot 스크래핑',
      'GROK_CREW_OK QDWAVN Grok Bot 기획자',
    ].join('\n');
    const hit = confirmRemoteReplies(empty, chat, 'ko');
    assert.equal(hit.confirmed.length, 3);
    assert.equal(hit.next.bots.filter((item) => item.status === 'connected').length, 3);
    assert.equal(hasConnectedBot(undefined, hit.next), true);
    const stored = JSON.stringify(hit.next);
    memory.set(BOT_LINKS_KEY, stored);
    const again = readBotLinks();
    assert.equal(again.bots.filter((item) => item.status === 'connected' && item.confirmedAt).length, 3);
    const recopy = markRemoteCopied(again, { kind: 'grok', role: 'editor', language: 'ko' });
    assert.equal(linkedBySeat(recopy.bots, 'grok', 'editor')?.status, 'connected');
  });

  it('does not treat a stored other-PC copy as a live connection', () => {
    memory.set(BOT_LINKS_KEY, JSON.stringify({
      pairCode: '7K2M9Q',
      bots: [{
        id: 'fake',
        name: 'Grok Bot 기획자',
        kind: 'grok',
        role: 'planner',
        place: 'other_pc',
        status: 'connected',
        pairCode: '7K2M9Q',
        connectedAt: '2026-08-28T01:00:00.000Z',
      }],
    }));
    const next = readBotLinks();
    assert.equal(next.bots[0].status, 'waiting');
    assert.equal(next.bots[0].connectedAt, undefined);
    assert.equal(hasConnectedBot(undefined, next), false);
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

  it('forgets every seat when the desk quits', () => {
    memory.set(BOT_LINKS_KEY, JSON.stringify({
      pairCode: '7K2M9Q',
      bots: [{
        id: 'g-plan',
        name: 'Grok Bot 기획자',
        kind: 'grok',
        role: 'planner',
        place: 'other_pc',
        status: 'connected',
        pairCode: '7K2M9Q',
      }],
    }));
    const next = forgetBotLinksOnQuit();
    assert.deepEqual(next, { pairCode: '', bots: [] });
    assert.equal(memory.get(BOT_LINKS_KEY), undefined);
    assert.equal(hasConnectedBot(undefined, next), false);
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

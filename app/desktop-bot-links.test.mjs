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
  studioPortFromApiBase,
  threeSeatConnectPaste,
  writeLastConnectBundle,
  readLastConnectBundle,
  LAST_CONNECT_BUNDLE_KEY,
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
  grokSeatLampRows,
  seatLampRows,
  seatIsConnected,
  seatIsReleased,
  releaseLinkedSeat,
  releaseHeldSeats,
  seatPurpose,
  connectedRemoteNames,
  heartbeatWorkPair,
  lostConnectedSeats,
  seatConnectSnapshot,
  shouldKeepConnectOpenAfterReady,
  shouldLandAutoAfterLinkChange,
  shouldPingLostSeat,
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
      assert.match(text, /1분마다|每 1 分钟|1 分ごと|every minute/);
      assert.doesNotMatch(text, /5분마다|每 5 分钟|5 分ごと|every five minutes/);
      assert.match(text, /plan_started/);
      assert.match(text, /plan_ready/);
      assert.match(text, /detail\.note/);
      assert.match(text, /없는 말은 만들지 마세요|不要编造没有的话|ない言葉は作らない|Do not invent a line/);
      assert.match(text, /grok-crew-planner/);
      assert.match(text, /grok-crew-edit-plan/);
      if (language === 'en') {
        assert.match(text, /You are the planner/);
        assert.match(text, /Destination country: United States/);
        assert.doesNotMatch(text, /당신은 기획자/);
        assert.doesNotMatch(text, /네이버 TV/);
      }
      assert.match(text, /7214가 없다|没有 7214|7214 がない|7214 is missing/);
      assert.match(text, /GROK_CREW_OK 한 줄만|只发 GROK_CREW_OK|GROK_CREW_OK の一行だけ|only the GROK_CREW_OK line/);
      assert.match(text, /디스크에서 스크립트를 찾지 마세요|不要在磁盘上找脚本|ディスクでスクリプトを探さない|Do not search the disk for the script/);
      assert.doesNotMatch(text, /스크립트를 찾는 중|searching for the script/);
      assert.doesNotMatch(text, /Claude/);
      assert.doesNotMatch(text, /Cursor/);
      assert.doesNotMatch(text, /git clone/);
      assert.doesNotMatch(text, /DESKTOP-LJFJI0U/);
    }
    const fallback = remoteConnectPaste('grok', '7K2M9Q', 'ko', 'planner', 8123);
    assert.match(fallback, /127\.0\.0\.1:8123\/api\/bot-entry/);
    assert.match(fallback, /8123가 없다/);
    assert.doesNotMatch(fallback, /127\.0\.0\.1:7214/);
    assert.equal(studioPortFromApiBase('http://127.0.0.1:8123'), 8123);
    assert.equal(studioPortFromApiBase('https://evil.example:7214'), 7214);
    const agent = remoteConnectPaste('custom', '7K2M9Q', 'ko', 'scraper');
    assert.match(agent, /Agent 스크래핑/);
    assert.match(agent, /grok-crew-scraper/);
    assert.match(agent, /grok-crew-public-pick/);
    assert.doesNotMatch(agent, /bot-entry/);
    assert.doesNotMatch(agent, /Invoke-RestMethod/);
    assert.doesNotMatch(agent, /plan_started|collect_started|still_here/);
    const scraper = remoteConnectPaste('grok', '7K2M9Q', 'ko', 'scraper');
    assert.match(scraper, /collect_started/);
    assert.match(scraper, /collect_ready/);
    assert.doesNotMatch(scraper, /plan_started/);
    const china = remoteConnectPaste('grok', '7K2M9Q', 'en', 'scraper', 7214, 'cn');
    assert.match(china, /Bilibili public pages/);
    assert.match(china, /Destination country: China/);
    assert.doesNotMatch(china, /Vimeo public pages/);
    assert.doesNotMatch(china, /당신은/);
    const editor = remoteConnectPaste('grok', '7K2M9Q', 'ko', 'editor');
    assert.match(editor, /grok-crew-cut-to-plan/);
    assert.match(editor, /grok-editor/);
    assert.match(editor, /cut_started/);
    assert.match(editor, /cut_ready/);
    assert.equal(grokSeatBotId('editor'), 'grok-editor');
    assert.equal(seatPurpose('scraper'), 'collect');
    assert.deepEqual(heartbeatWorkPair('planner'), { start: 'plan_started', ready: 'plan_ready' });
  });

  it('alarms once when a live seat drops, not on the first snapshot', () => {
    const empty = emptyBotLinks();
    const live = {
      bots: [{ bot_id: 'grok-planner', display_name: 'Grok Bot 기획자', presence: 'active' }],
    };
    const first = seatConnectSnapshot(empty, live);
    assert.equal(first['grok:planner'], true);
    assert.deepEqual(lostConnectedSeats(null, first), []);
    const gone = seatConnectSnapshot(empty, { bots: [] });
    const lost = lostConnectedSeats(first, gone);
    assert.equal(lost.length, 1);
    assert.equal(lost[0].role, 'planner');
    assert.equal(shouldPingLostSeat({ hidden: true, key: lost[0].key }), true);
    assert.equal(shouldPingLostSeat({ hidden: false, key: lost[0].key }), false);
    assert.equal(shouldPingLostSeat({ hidden: true, key: lost[0].key, pinged: true }), false);
  });

  it('does not keep a pasted Grok seat green after the roster goes idle', () => {
    const pasted = confirmRemoteReplies(
      { pairCode: 'QDWAVN', bots: [] },
      'GROK_CREW_OK QDWAVN Grok Bot 스크래핑',
      'ko',
    ).next;
    assert.equal(seatIsConnected('grok', 'scraper', pasted, undefined), true);
    assert.equal(hasConnectedBot(undefined, pasted), true);
    const idle = {
      bots: [{
        bot_id: 'grok-scraper',
        display_name: 'Grok Bot 스크래핑',
        presence: 'idle',
        last_action: 'disconnected',
      }],
    };
    assert.equal(seatIsConnected('grok', 'scraper', pasted, idle), false);
    assert.equal(hasConnectedBot(idle, pasted), false);
    assert.equal(familyIsConnected('grok', pasted, idle), false);
    assert.equal(seatIsConnected('grok', 'scraper', pasted, {
      bots: [{ bot_id: 'grok-scraper', display_name: 'Grok Bot 스크래핑', presence: 'active', last_action: 'still_here' }],
    }), true);
  });

  it('keeps a checked-in seat connected through idle ticks until the operator releases it', () => {
    const empty = emptyBotLinks();
    const idle = {
      bots: [{
        bot_id: 'grok-planner',
        display_name: 'Grok Bot 기획자',
        presence: 'idle',
        last_action: 'still_here',
      }],
    };
    assert.equal(seatIsConnected('grok', 'planner', empty, idle), true);
    const released = releaseLinkedSeat(empty, 'grok', 'planner');
    assert.equal(seatIsReleased(released, 'grok', 'planner'), true);
    assert.equal(seatIsConnected('grok', 'planner', released, idle), false);
    const copied = markRemoteCopied({ ...released, pairCode: 'QDWAVN' }, { kind: 'grok', role: 'planner', language: 'ko' });
    assert.equal(seatIsReleased(copied, 'grok', 'planner'), false);
    assert.equal(seatIsConnected('grok', 'planner', copied, idle), true);
    const held = releaseHeldSeats(empty, idle);
    assert.equal(seatIsConnected('grok', 'planner', held, idle), false);
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
    assert.equal(seatIsConnected('grok', 'planner', empty, roster), true);
    assert.equal(seatIsConnected('grok', 'scraper', empty, roster), false);
    assert.equal(seatIsConnected('custom', 'editor', empty, roster), false);
    assert.equal(familyIsConnected('grok', empty, roster), true);
    assert.equal(familyIsConnected('custom', empty, roster), false);
    assert.deepEqual(connectedRemoteNames(empty, roster), ['Grok Bot 기획자', 'Grok Bot 편집자']);
    assert.equal(hasConnectedBot(roster, empty), true);
    assert.deepEqual(grokSeatLampRows(roster, empty), [
      { role: 'planner', connected: true },
      { role: 'scraper', connected: false },
      { role: 'editor', connected: true },
    ]);
    const byName = { bots: [{ display_name: 'Grok Bot Planner', presence: 'active' }] };
    assert.equal(seatIsConnected('grok', 'planner', empty, byName), true);
    assert.equal(seatIsConnected('grok', 'editor', empty, byName), false);
  });

  it('does not leave Connect when the operator copies connect text', () => {
    assert.equal(shouldLandAutoAfterLinkChange({
      previousConnected: true,
      nextConnected: true,
      cause: 'copy',
      connectOpen: true,
    }), false);
    assert.equal(shouldLandAutoAfterLinkChange({
      previousConnected: false,
      nextConnected: true,
      cause: 'copy',
      connectOpen: true,
    }), false);
    assert.equal(shouldLandAutoAfterLinkChange({
      previousConnected: false,
      nextConnected: true,
      cause: 'attach',
      connectOpen: true,
    }), false);
    assert.equal(shouldLandAutoAfterLinkChange({
      previousConnected: false,
      nextConnected: true,
      cause: 'attach',
      connectOpen: false,
    }), true);
    assert.equal(shouldLandAutoAfterLinkChange({
      previousConnected: false,
      nextConnected: true,
      cause: 'release',
      connectOpen: false,
    }), false);
    assert.equal(shouldKeepConnectOpenAfterReady({
      wasForcedConnect: true,
      nextForcedConnect: false,
      peekAuto: false,
    }), true);
    assert.equal(shouldKeepConnectOpenAfterReady({
      wasForcedConnect: true,
      nextForcedConnect: false,
      peekAuto: true,
    }), false);
    assert.equal(shouldKeepConnectOpenAfterReady({
      wasForcedConnect: false,
      nextForcedConnect: false,
      peekAuto: false,
    }), false);
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
    assert.equal(hasConnectedBot({ bots: [{ display_name: 'Cursor', presence: 'active' }] }, empty), false);
    assert.deepEqual(seatLampRows({
      bots: [{ bot_id: 'desk-bot', display_name: 'Cursor', presence: 'active' }],
    }, empty).map((row) => row.connected), [false, false, false]);
    const agent = confirmRemoteReplies(
      { pairCode: 'QDWAVN', bots: [] },
      'GROK_CREW_OK QDWAVN Agent 기획자',
      'ko',
    ).next;
    assert.equal(hasConnectedBot(undefined, agent), true);
    assert.deepEqual(seatLampRows(undefined, agent), [
      { role: 'planner', connected: true, family: 'custom' },
      { role: 'scraper', connected: false, family: 'none' },
      { role: 'editor', connected: false, family: 'none' },
    ]);
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
    assert.deepEqual(next, { pairCode: '', bots: [], released: [] });
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

  it('builds one clipboard with three Grok seats and no token', () => {
    const text = threeSeatConnectPaste('7K2M9Q', 'ko', 7214, 'kr');
    assert.match(text, /===== Grok Bot 기획자 =====/);
    assert.match(text, /===== Grok Bot 스크래핑 =====/);
    assert.match(text, /===== Grok Bot 편집자 =====/);
    assert.match(text, /자리마다 해당 덩어리만/);
    assert.match(text, /127\.0\.0\.1:7214/);
    assert.doesNotMatch(text, /LOCAL_STUDIO_TOKEN|Bearer |token=/i);
    const saved = writeLastConnectBundle({ market: 'kr', recipeId: 'instagram_reel', language: 'ko' });
    assert.equal(saved?.market, 'kr');
    assert.equal(readLastConnectBundle()?.recipeId, 'instagram_reel');
    assert.ok(memory.get(LAST_CONNECT_BUNDLE_KEY));
    assert.doesNotMatch(String(memory.get(LAST_CONNECT_BUNDLE_KEY)), /Invoke-RestMethod|LOCAL_STUDIO/);
  });
});

import assert from 'node:assert/strict';
import { register } from 'node:module';
import { describe, it } from 'node:test';

register('./timeline/ts-resolver.helper.mjs', import.meta.url);

const {
  BOT_LINKS_KEY,
  emptyBotLinks,
  forgetBotLinksOnQuit,
  hasConnectedBot,
  hasWaitingCopiedSeat,
  confirmedGrokRoles,
  confirmedCustomRoles,
  connectEssayGeneration,
  connectEssayIsCurrent,
  CONNECT_ESSAY_REVISION,
  DESK_SESSION_KEY,
  ensureDeskSessionStartedAt,
  linkFreshForThisRun,
  seatReadyToStart,
  connectReadyLine,
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
  isBareConnectReply,
  upsertLinkedBot,
  activeRosterSeat,
  familyIsConnected,
  grokSeatBotId,
  SEAT_KEEP_SECONDS,
  SEAT_ACTIVE_SECONDS,
  DISCONNECT_ACTION,
  disconnectHeartbeatBody,
  grokSeatsToDisconnect,
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
const sessionMemory = new Map();
globalThis.window = {
  localStorage: {
    getItem: (key) => (memory.has(key) ? memory.get(key) : null),
    setItem: (key, value) => { memory.set(key, String(value)); },
    removeItem: (key) => { memory.delete(key); },
  },
  sessionStorage: {
    getItem: (key) => (sessionMemory.has(key) ? sessionMemory.get(key) : null),
    setItem: (key, value) => { sessionMemory.set(key, String(value)); },
    removeItem: (key) => { sessionMemory.delete(key); },
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
      assert.match(text, /Invoke-RestMethod/);
      assert.match(text, /grok-planner/);
      assert.match(text, /plan_edit/);
      assert.match(text, /heartbeat/);
      assert.equal(SEAT_KEEP_SECONDS, 60);
      assert.equal(SEAT_ACTIVE_SECONDS, 300);
      assert.match(text, /루틴을 만들지 마세요|Do not create a Grok Routine|不要做 Routine|ルーチンを作らない/);
      assert.match(text, /예약 작업을 만들지 마세요|Do not create a chat scheduled|不要在聊天里做 still_here|予約作業を作らない/);
      assert.match(text, /그 Windows가 아니|cannot be verified|不是那台 Windows|その Windows ではない/);
      assert.match(text, /책상이 합니다|happen on that Windows desk|书桌来做|机がします/);
      assert.match(text, /disconnected/);
      assert.doesNotMatch(text, /grok-crew.py keep/);
      assert.doesNotMatch(text, /Start-Sleep/);
      assert.match(text, /next-invite/);
      assert.doesNotMatch(text, /1분마다 같은 Windows에서 still_here heartbeat를 남기세요/);
      assert.doesNotMatch(text, /Leave a still_here heartbeat on the same Windows every minute so this desk knows the window is open/);
      assert.doesNotMatch(text, /5분마다|每 5 分钟|5 分ごと|every five minutes/);
      assert.match(text, /plan_started/);
      assert.match(text, /plan_ready/);
      assert.match(text, /detail\.note/);
      assert.match(text, /크루 보드 대화|crew board chat|组员看板对话|クルーボードの会話/);
      assert.match(text, /일을 시작한다는 한 줄|one spoken line that work has started|开工时对下一位子说的一行|始めたことを次の席に言う一行/);
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
      assert.match(text, /이 대화가 그 Windows가 아니면|If this conversation is not that Windows|若这段对话不是那台 Windows|この会話がその Windows でなければ/);
      assert.match(text, /창이 없다고 하지 마세요|Do not say the window is missing|不要说没有窗口|窓がないと言わないでください/);
      assert.match(text, /GROK_CREW_OK만 보내고 멈추면 실패|只发 GROK_CREW_OK 就停下来算失败|GROK_CREW_OK だけ送って止まると失敗|Sending only GROK_CREW_OK and stopping is a failure/);
      assert.match(text, /첫 답은 아래 두 줄|第一句回复必须是下面两行|最初の返事は次の二行|The first reply must be these two lines/);
      assert.match(text, /한 줄만 쓰면 실패한|只写一行就是失败|一行だけなら失敗|One line only is a failure/);
      assert.match(text, /시작을 누르면 할 일|一点开始就会有工作|開始を押すと仕事|After connect, Start creates the job/);
      assert.match(text, /다시 붙이지 않습니다|will not paste the invite again|不会再粘贴邀请|もう一度貼ることはありません/);
      assert.match(text, /위 역할대로|按上面的角色|上の役割どおり|with the role above/);
      assert.match(text, /기획 준비됨|策划已就绪|企画の準備ができました|Planner ready/);
      assert.doesNotMatch(text, /연결에 그 줄을 붙이면|pastes that line on Connect|贴到连接后|接続にその行を貼ると/);
      assert.doesNotMatch(text, /한 줄만 보내고 멈추세요|Send only the GROK_CREW_OK line and stop|只发 GROK_CREW_OK 那一行然后停下|一行だけ送って止まってください/);
      assert.doesNotMatch(text, /첫 답은 아래 한 줄|第一句回复是下面这一行|最初の返事は次の一行|The first reply is this one line/);
      assert.doesNotMatch(text, /시작 글이 할 일|开始文字才是工作|開始の文が仕事|Start invite the operator pastes is the job/);
      assert.match(text, /디스크에서 스크립트를 찾지 마세요|不要在磁盘上找脚本|ディスクでスクリプトを探さない|Do not search the disk for the script/);
      assert.doesNotMatch(text, /스크립트를 찾는 중|searching for the script/);
      assert.doesNotMatch(text, /Claude/);
      assert.doesNotMatch(text, /Cursor/);
      assert.doesNotMatch(text, /git clone/);
      assert.doesNotMatch(text, /DESKTOP-LJFJI0U/);
    }
    const fallback = remoteConnectPaste('grok', '7K2M9Q', 'ko', 'planner', 8123);
    assert.match(fallback, /8123가 없다/);
    assert.doesNotMatch(fallback, /127\.0\.0\.1:7214/);
    assert.doesNotMatch(fallback, /grok-crew.py keep/);
    assert.equal(studioPortFromApiBase('http://127.0.0.1:8123'), 8123);
    assert.equal(studioPortFromApiBase('https://evil.example:7214'), 7214);
    const agent = remoteConnectPaste('custom', '7K2M9Q', 'ko', 'scraper');
    assert.match(agent, /Agent 스크래핑/);
    assert.match(agent, /grok-crew-scraper/);
    assert.match(agent, /grok-crew-public-pick/);
    assert.doesNotMatch(agent, /bot-entry/);
    assert.doesNotMatch(agent, /Invoke-RestMethod/);
    assert.doesNotMatch(agent, /next-invite/);
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
    const planner = remoteConnectPaste('grok', '7K2M9Q', 'ko', 'planner');
    const editor = remoteConnectPaste('grok', '7K2M9Q', 'ko', 'editor');
    assert.match(editor, /grok-crew-cut-to-plan/);
    assert.match(editor, /grok-editor/);
    assert.match(editor, /cut_started/);
    assert.match(editor, /cut_ready/);
    assert.ok(planner.indexOf('grok-crew-planner') < planner.indexOf('Invoke-RestMethod'));
    assert.ok(scraper.indexOf('grok-crew-scraper') < scraper.indexOf('Invoke-RestMethod'));
    assert.ok(editor.indexOf('grok-crew-cut-to-plan') < editor.indexOf('Invoke-RestMethod'));
    assert.match(planner, /당신은 기획자입니다/);
    assert.match(scraper, /당신은 스크래핑 봇입니다/);
    assert.match(editor, /당신은 편집자입니다/);
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
    assert.deepEqual(confirmedGrokRoles(pasted), ['scraper']);
    assert.equal(seatReadyToStart(pasted), true);
    assert.equal(seatIsConnected('grok', 'scraper', pasted, undefined), false);
    assert.equal(hasConnectedBot(undefined, pasted), false);
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

  it('lights a Grok lamp only after this-PC roster entry, not clipboard OK alone', () => {
    const pasted = confirmRemoteReplies(
      { pairCode: 'QDWAVN', bots: [] },
      'GROK_CREW_OK QDWAVN Grok Bot 기획자',
      'ko',
    ).next;
    assert.deepEqual(confirmedGrokRoles(pasted), ['planner']);
    assert.equal(seatIsConnected('grok', 'planner', pasted, undefined), false);
    assert.equal(hasConnectedBot(undefined, pasted), false);
    const entered = {
      bots: [{
        bot_id: 'grok-planner',
        display_name: 'Grok Bot 기획자',
        presence: 'active',
        last_action: 'entered_local_studio',
      }],
    };
    assert.equal(seatIsConnected('grok', 'planner', pasted, entered), true);
    assert.equal(hasConnectedBot(entered, pasted), true);
    const still = {
      bots: [{
        bot_id: 'grok-planner',
        display_name: 'Grok Bot 기획자',
        presence: 'idle',
        last_action: 'still_here',
      }],
    };
    assert.equal(seatIsConnected('grok', 'planner', pasted, still), true);
    assert.equal(confirmedGrokRoles(pasted).includes('planner'), true);
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
    assert.equal(seatIsReleased(copied, 'grok', 'planner'), true);
    assert.equal(seatIsConnected('grok', 'planner', copied, idle), false);
    const held = releaseHeldSeats(empty, idle);
    assert.equal(seatIsConnected('grok', 'planner', held, idle), false);
    assert.deepEqual(grokSeatsToDisconnect(empty, idle), ['planner']);
    assert.deepEqual(disconnectHeartbeatBody('planner', idle, 'ko'), {
      bot_id: 'grok-planner',
      display_name: 'Grok Bot 기획자',
      action: DISCONNECT_ACTION,
    });
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
    assert.deepEqual(connectedRemoteNames(empty, roster), ['Grok Bot 1 -기획자', 'Grok Bot 2 -편집자']);
    assert.deepEqual(connectedRemoteNames(empty, {
      bots: [{ bot_id: 'grok-editor', display_name: 'Grok Bot ???', presence: 'active' }],
    }), ['Grok Bot 1 -편집자']);
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
    assert.equal(hasWaitingCopiedSeat(next), true);
    assert.equal(seatReadyToStart(next), true);
    assert.equal(hasWaitingCopiedSeat(empty), false);
    assert.equal(seatReadyToStart(empty), false);
    assert.equal(connectReadyLine('planner', 'ko'), '기획 준비됨. 시작을 누르면 이 Windows에서 일을 바로 받습니다.');
    assert.match(connectReadyLine('scraper', 'en'), /Scraper ready/);
    assert.match(connectReadyLine('editor', 'zh'), /剪辑已就绪/);
  });

  it('does not light a copied scraper from a leftover idle roster', () => {
    const idle = {
      bots: [{
        bot_id: 'grok-scraper',
        display_name: 'Grok Bot 스크래핑',
        presence: 'idle',
        last_action: 'still_here',
      }],
    };
    const released = releaseLinkedSeat({ pairCode: 'QDWAVN', bots: [] }, 'grok', 'scraper');
    const copied = markRemoteCopied(released, { kind: 'grok', role: 'scraper', language: 'ko' });
    assert.equal(copied.bots[0].status, 'waiting');
    assert.equal(seatIsReleased(copied, 'grok', 'scraper'), true);
    assert.equal(seatIsConnected('grok', 'scraper', copied, idle), false);
    assert.equal(hasConnectedBot(idle, copied), false);
    assert.equal(seatIsConnected('grok', 'scraper', copied, {
      bots: [{
        bot_id: 'grok-scraper',
        display_name: 'Grok Bot 스크래핑',
        presence: 'active',
        last_action: 'collect_started',
      }],
    }), true);
  });

  it('treats only a short bot OK line as a reply, not the connect essay', () => {
    const essay = remoteConnectPaste('grok', 'QDWAVN', 'ko', 'planner');
    assert.equal(isBareConnectReply(essay, 'QDWAVN'), false);
    assert.equal(isBareConnectReply('GROK_CREW_OK QDWAVN Grok Bot 기획자', 'QDWAVN'), true);
    assert.equal(isBareConnectReply(`GROK_CREW_OK QDWAVN Grok Bot 기획자\n${connectReadyLine('planner', 'ko')}`, 'QDWAVN'), true);
    assert.equal(isBareConnectReply('GROK_CREW_OK AAAAAA Grok Bot 기획자', 'QDWAVN'), false);
    assert.equal(isBareConnectReply('', 'QDWAVN'), false);
  });

  it('does not light an other-pc copy from leftover desk still_here', () => {
    const copied = markRemoteCopied({ pairCode: 'QDWAVN', bots: [] }, { kind: 'grok', role: 'planner', language: 'ko' });
    const leftover = {
      bots: [{
        bot_id: 'grok-planner',
        display_name: 'Grok Bot 기획자',
        presence: 'active',
        last_action: 'still_here',
      }],
    };
    assert.equal(seatIsConnected('grok', 'planner', copied, leftover), false);
    assert.equal(hasConnectedBot(leftover, copied), false);
    const working = {
      bots: [{
        bot_id: 'grok-planner',
        display_name: 'Grok Bot 기획자',
        presence: 'active',
        last_action: 'plan_started',
      }],
    };
    assert.equal(seatIsConnected('grok', 'planner', copied, working), true);
  });

  it('drops a copied fake confirm that never came from a bot OK line', () => {
    memory.set(BOT_LINKS_KEY, JSON.stringify({
      pairCode: 'QDWAVN',
      bots: [{
        id: 'grok-planner-QDWAVN',
        name: 'Grok Bot 기획자',
        kind: 'grok',
        role: 'planner',
        place: 'other_pc',
        status: 'connected',
        pairCode: 'QDWAVN',
        connectedAt: '2026-08-29T16:00:00.000Z',
        confirmedAt: '2026-08-29T16:00:00.000Z',
      }],
    }));
    const next = readBotLinks();
    assert.equal(next.bots[0].status, 'waiting');
    assert.equal(next.bots[0].confirmedAt, undefined);
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
    assert.equal(hit.next.bots[0].place, 'this_pc');
    assert.ok(hit.next.bots[0].confirmedAt);
    assert.equal(hit.next.bots[0].confirmedFrom, 'ok-reply');
    assert.equal(hasConnectedBot(undefined, hit.next), false);
    assert.deepEqual(confirmedGrokRoles(hit.next), ['editor']);
    assert.equal(seatReadyToStart(hit.next), true);
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
    assert.equal(hasConnectedBot(undefined, hit.next), false);
    assert.equal(confirmedGrokRoles(hit.next).length, 3);
    assert.equal(seatReadyToStart(hit.next), true);
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
    const fake = upsertLinkedBot(empty, {
      id: 'b1',
      name: 'Grok',
      kind: 'grok',
      place: 'other_pc',
      status: 'connected',
      pairCode: empty.pairCode || '7K2M9Q',
      connectedAt: '2026-08-27T06:00:00.000Z',
    });
    assert.equal(hasConnectedBot(undefined, fake), false);
    const next = confirmRemoteReplies(
      { pairCode: '7K2M9Q', bots: [] },
      'GROK_CREW_OK 7K2M9Q Grok Bot 기획자',
      'ko',
    ).next;
    assert.equal(hasConnectedBot(undefined, next), false);
    assert.deepEqual(confirmedGrokRoles(next), ['planner']);
    assert.equal(seatReadyToStart(next), true);
    assert.equal(hasConnectedBot({ bots: [{ display_name: 'Cursor', presence: 'active' }] }, empty), false);
    assert.deepEqual(seatLampRows({
      bots: [{ bot_id: 'desk-bot', display_name: 'Cursor', presence: 'active' }],
    }, empty).map((row) => row.connected), [false, false, false]);
    const agent = confirmRemoteReplies(
      { pairCode: 'QDWAVN', bots: [] },
      'GROK_CREW_OK QDWAVN Agent 기획자',
      'ko',
    ).next;
    assert.equal(hasConnectedBot(undefined, agent), false);
    assert.equal(seatReadyToStart(agent), true);
    assert.deepEqual(confirmedCustomRoles(agent), ['planner']);
    assert.deepEqual(seatLampRows(undefined, agent), [
      { role: 'planner', connected: false, family: 'none' },
      { role: 'scraper', connected: false, family: 'none' },
      { role: 'editor', connected: false, family: 'none' },
    ]);
    const agentEntered = {
      bots: [{ display_name: 'Agent 기획자', presence: 'active', last_action: 'entered_local_studio' }],
    };
    assert.equal(seatIsConnected('custom', 'planner', agent, agentEntered), true);
    assert.equal(hasConnectedBot(agentEntered, agent), true);
    assert.deepEqual(seatLampRows(agentEntered, agent), [
      { role: 'planner', connected: true, family: 'custom' },
      { role: 'scraper', connected: false, family: 'none' },
      { role: 'editor', connected: false, family: 'none' },
    ]);
  });

  it('does not treat a leftover saved OK as a fresh connect for this run', () => {
    const session = ensureDeskSessionStartedAt(window.sessionStorage, Date.parse('2026-08-30T07:00:00.000Z'));
    assert.equal(session, '2026-08-30T07:00:00.000Z');
    assert.equal(window.sessionStorage.getItem(DESK_SESSION_KEY), session);
    const leftover = {
      confirmedAt: '2026-08-29T16:00:00.000Z',
      connectedAt: '2026-08-29T16:00:00.000Z',
    };
    assert.equal(linkFreshForThisRun(leftover, { sessionStartedAt: session }), false);
    assert.equal(linkFreshForThisRun({
      confirmedAt: '2026-08-30T07:05:00.000Z',
    }, { sessionStartedAt: session }), true);
    assert.equal(linkFreshForThisRun({
      confirmedAt: '2026-08-30T07:05:00.000Z',
    }, { sessionStartedAt: session, connectCopiedAt: '2026-08-30T07:10:00.000Z' }), false);
    const generation = connectEssayGeneration({
      pairCode: 'QDWAVN',
      market: 'kr',
      recipeId: 'instagram_reel',
      language: 'ko',
    });
    assert.match(generation, new RegExp(`^${CONNECT_ESSAY_REVISION}\\|QDWAVN\\|`));
    assert.equal(connectEssayIsCurrent(generation, generation), true);
    assert.equal(connectEssayIsCurrent(generation, `${CONNECT_ESSAY_REVISION}|OLD|kr|instagram_reel|ko`), false);
    assert.equal(connectEssayIsCurrent(generation, ''), true);
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
    const saved = writeLastConnectBundle({ market: 'kr', recipeId: 'instagram_reel', language: 'ko', pairCode: '7K2M9Q' });
    assert.equal(saved?.market, 'kr');
    assert.equal(readLastConnectBundle()?.recipeId, 'instagram_reel');
    assert.equal(saved?.generation, connectEssayGeneration({
      pairCode: '7K2M9Q',
      market: 'kr',
      recipeId: 'instagram_reel',
      language: 'ko',
    }));
    assert.ok(memory.get(LAST_CONNECT_BUNDLE_KEY));
    assert.doesNotMatch(String(memory.get(LAST_CONNECT_BUNDLE_KEY)), /Invoke-RestMethod|LOCAL_STUDIO/);
  });
});

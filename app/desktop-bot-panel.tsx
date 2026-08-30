'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { type CrewRoster } from './desktop-bot-connect';
import { BOT_ROLES, seatName, type BotRole } from './bot-skills';
import { marketLabel, resolveCrewMarket } from './crew-market';
import { readAutoPrefs } from './desktop-auto-state';
import {
  type BotLinkState,
  type LinkChangeCause,
  confirmRemoteReplies,
  connectedRemoteNames,
  disconnectHeartbeatBody,
  familyIsConnected,
  grokSeatsToDisconnect,
  hasConnectedBot,
  isBareConnectReply,
  markRemoteCopied,
  readLastConnectBundle,
  remoteConnectPaste,
  releaseHeldSeats,
  releaseLinkedSeat,
  seatIsConnected,
  studioPortFromApiBase,
  writeBotLinks,
  writeLastConnectBundle,
} from './desktop-bot-links';
import { useLanguage } from './language';

export type ConnectServices = {
  studioReady: boolean;
  github: {
    authenticated: boolean;
    login?: string | null;
    oauth_available?: boolean;
    relay_connected?: boolean;
    remote?: string | null;
  };
  githubToken: string;
  runnerPaired: boolean;
  runnerName?: string;
  desktopApp: boolean;
  busy: boolean;
  onGithubToken: (value: string) => void;
  onLoginGitHub: (mode: 'device' | 'token') => void;
  onPairRunner: () => void;
  onExportDesktopKey: () => void;
  onConnectRelay: () => void;
  onRefreshStudio: () => void;
};

type BotPanelProps = {
  roster?: CrewRoster;
  links: BotLinkState;
  studioReady: boolean;
  services?: ConnectServices;
  onLinksChange: (next: BotLinkState, cause?: LinkChangeCause) => void;
  onRefresh: () => Promise<void>;
  onSeatCommand?: (body: { bot_id: string; display_name: string; action: string }) => Promise<void>;
  onEnterConfirmedGrok?: (roles: BotRole[]) => Promise<void>;
};

const OTHER_FAMILIES: Array<{ id: 'grok' | 'custom'; ko: string; en: string; zh: string; ja: string }> = [
  { id: 'grok', ko: 'Grok Bot', en: 'Grok Bot', zh: 'Grok Bot', ja: 'Grok Bot' },
  { id: 'custom', ko: 'Agent', en: 'Agent', zh: 'Agent', ja: 'Agent' },
];

type OtherSeat = { kind: 'grok' | 'custom'; role: BotRole };

function Lamp({ on, label }: { on: boolean; label: string }) {
  return (
    <span className={`desktop-connect-lamp${on ? ' is-on' : ''}`}>
      <i aria-hidden="true" />
      {label}
    </span>
  );
}

function lampText(
  on: boolean,
  t: (ko: string, en: string, zh: string, ja: string) => string,
) {
  return on
    ? t('연결됨', 'Connected', '已连接', '接続済み')
    : t('연결되지않음', 'Not connected', '未连接', '未接続');
}

export function DesktopBotPanel({
  roster,
  links,
  studioReady,
  services,
  onLinksChange,
  onRefresh,
  onSeatCommand,
  onEnterConfirmedGrok,
}: BotPanelProps) {
  const { language, t } = useLanguage();
  const [openSeat, setOpenSeat] = useState<OtherSeat>({ kind: 'grok', role: 'planner' });
  const [familyId, setFamilyId] = useState<(typeof OTHER_FAMILIES)[number]['id']>('grok');
  const [copied, setCopied] = useState('');
  const [blockedKind, setBlockedKind] = useState('');
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const [disconnecting, setDisconnecting] = useState('');
  const [lastBundle, setLastBundle] = useState(() => readLastConnectBundle());
  const [releasedNote, setReleasedNote] = useState('');
  const connected = hasConnectedBot(roster, links);
  const studioPort = studioPortFromApiBase(
    typeof window !== 'undefined' ? window.grokCrew?.apiBase : undefined,
  );
  const prefs = readAutoPrefs();
  const market = resolveCrewMarket(prefs.market, language);
  const destName = marketLabel(market, language);
  const recipeId = lastBundle?.recipeId || prefs.recipeId || 'instagram_reel';
  const connectedNames = connectedRemoteNames(links, roster, language);

  const connectText = useMemo(
    () => remoteConnectPaste(openSeat.kind, links.pairCode, language, openSeat.role, studioPort, market),
    [language, links.pairCode, market, openSeat.kind, openSeat.role, studioPort],
  );

  const rememberBundle = (nextMarket = market, nextRecipe = recipeId) => {
    const saved = writeLastConnectBundle({
      market: nextMarket,
      recipeId: nextRecipe,
      language,
    });
    if (saved) setLastBundle(saved);
  };

  const linksRef = useRef(links);
  linksRef.current = links;
  const languageRef = useRef(language);
  languageRef.current = language;

  const attachBareOk = async (text: string) => {
    const current = linksRef.current;
    if (!current.pairCode || !isBareConnectReply(text, current.pairCode)) return false;
    const { next, confirmed } = confirmRemoteReplies(current, text, languageRef.current);
    const fresh = confirmed.filter((item) => {
      const bot = current.bots.find((row) => row.kind === item.kind && row.role === item.role);
      return !(bot?.status === 'connected' && bot.confirmedFrom === 'ok-reply');
    });
    if (!fresh.length) return false;
    writeBotLinks(next);
    onLinksChange(next, 'attach');
    const grokRoles = fresh.filter((item) => item.kind === 'grok').map((item) => item.role);
    if (grokRoles.length && onEnterConfirmedGrok) {
      setAttaching(true);
      try {
        await onEnterConfirmedGrok(grokRoles);
        setReleasedNote(t(
          `${fresh.map((item) => seatName(item.kind, item.role, languageRef.current)).join(' · ')} 자리를 이 책상에 입장했습니다.`,
          `Entered ${fresh.map((item) => seatName(item.kind, item.role, languageRef.current)).join(' · ')} on this desk.`,
          `已让 ${fresh.map((item) => seatName(item.kind, item.role, languageRef.current)).join(' · ')} 在这张书桌签到。`,
          `${fresh.map((item) => seatName(item.kind, item.role, languageRef.current)).join(' · ')} をこの机に入場しました。`,
        ));
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : t(
          '이 책상에서 입장하지 못했습니다.',
          'This desk could not enter that seat.',
          '这张书桌没能签到。',
          'この机で入場できませんでした。',
        ));
      } finally {
        setAttaching(false);
      }
    }
    await onRefresh();
    return true;
  };

  const attachBareOkRef = useRef(attachBareOk);
  attachBareOkRef.current = attachBareOk;

  const copyRemote = async (seat: OtherSeat) => {
    setError('');
    setBlockedKind('');
    setOpenSeat(seat);
    setFamilyId(seat.kind);
    if (!links.pairCode) {
      setError(t('연결 코드가 아직 없습니다. 잠시 후 다시 눌러 주세요.', 'The connect code is not ready yet. Try again in a moment.', '连接代码还没好。请稍后再按。', '接続コードがまだありません。少ししてから押してください。'));
      return;
    }
    const text = remoteConnectPaste(seat.kind, links.pairCode, language, seat.role, studioPort, market);
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(text);
      setCopied(`${seat.kind}-${seat.role}`);
      window.setTimeout(() => setCopied(''), 4000);
    } catch {
      setBlockedKind(`${seat.kind}-${seat.role}`);
    }
    const next = markRemoteCopied(links, { kind: seat.kind, role: seat.role, language });
    writeBotLinks(next);
    onLinksChange(next, 'copy');
    if (seat.kind === 'grok') rememberBundle();
    setReleasedNote(t(
      '복사했습니다. 그 글을 봇 창에 붙이세요. 복사만으로는 연결되지 않습니다.',
      'Copied. Paste that text in the bot window. Copying is not a connection.',
      '已复制。请贴到机器人窗口。只复制不算已连接。',
      'コピーしました。その文をボット窓に貼ってください。コピーしただけでは接続されません。',
    ));
    await onRefresh();
  };

  useEffect(() => {
    if (!studioReady || !links.pairCode) return;
    let cancelled = false;
    let busy = false;
    const tick = async () => {
      if (cancelled || busy || !navigator.clipboard?.readText) return;
      let text = '';
      try {
        text = await navigator.clipboard.readText();
      } catch {
        return;
      }
      busy = true;
      try {
        await attachBareOkRef.current(text);
      } finally {
        busy = false;
      }
    };
    const id = window.setInterval(() => { void tick(); }, 2000);
    const onFocus = () => { void tick(); };
    window.addEventListener('focus', onFocus);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [studioReady, links.pairCode]);

  const refreshNow = async () => {
    if (refreshing) return;
    setRefreshing(true);
    const started = Date.now();
    try {
      await onRefresh();
    } finally {
      const wait = 400 - (Date.now() - started);
      if (wait > 0) await new Promise((resolve) => window.setTimeout(resolve, wait));
      setRefreshing(false);
    }
  };

  const sendDisconnect = async (roles: BotRole[]) => {
    if (!onSeatCommand) return;
    for (const role of roles) {
      await onSeatCommand(disconnectHeartbeatBody(role, roster, language));
    }
  };

  const disconnectSeat = async (seat: OtherSeat) => {
    setError('');
    setDisconnecting(`${seat.kind}-${seat.role}`);
    try {
      if (seat.kind === 'grok') await sendDisconnect([seat.role]);
      const next = releaseLinkedSeat(links, seat.kind, seat.role);
      writeBotLinks(next);
      onLinksChange(next, 'release');
      setReleasedNote(t(
        '연결 해제 명령을 보냈습니다. 다시 쓰려면 연결 글을 붙이세요.',
        'The disconnect command was sent. Paste the connect text to use this seat again.',
        '已发送断开命令。要再用请贴连接文字。',
        '切断の命令を送りました。もう一度使うには接続文を貼ってください。',
      ));
      await onRefresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t(
        '연결 해제 명령을 보내지 못했습니다.',
        'Could not send the disconnect command.',
        '没能发送断开命令。',
        '切断の命令を送れませんでした。',
      ));
    } finally {
      setDisconnecting('');
    }
  };

  const disconnectAll = async () => {
    setError('');
    setDisconnecting('all');
    try {
      await sendDisconnect(grokSeatsToDisconnect(links, roster));
      const next = releaseHeldSeats(links, roster);
      writeBotLinks(next);
      onLinksChange(next, 'release');
      setReleasedNote(t(
        '모든 자리에 연결 해제 명령을 보냈습니다. 다시 쓰려면 연결 글을 붙이세요.',
        'The disconnect command was sent to every seat. Paste the connect text to use them again.',
        '已向所有位子发送断开命令。要再用请贴连接文字。',
        'すべての席に切断の命令を送りました。もう一度使うには接続文を貼ってください。',
      ));
      await onRefresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t(
        '연결 해제 명령을 보내지 못했습니다.',
        'Could not send the disconnect command.',
        '没能发送断开命令。',
        '切断の命令を送れませんでした。',
      ));
    } finally {
      setDisconnecting('');
    }
  };

  return (
    <div className="desktop-spec-desk desktop-bot-room" data-stage="compose">
      <header className="desktop-auto-lead">
        <h1>{t('연결', 'Connect', '连接', '接続')}</h1>
        <p>{t('연결 글을 봇 창에 붙이세요. 봇이 GROK_CREW_OK만 보내고 멈추면 아직 일이 안 간 겁니다. 두 줄로 답하면 이 책상이 입장합니다. 불은 이 Windows에 들어온 뒤에만 켜집니다. 채팅에 루틴·keep을 만들지 마세요.', 'Paste the connect text in the bot window. If the bot only sends GROK_CREW_OK and stops, the job has not arrived. A two-line reply lets this desk enter. The lamp turns on only after this Windows check-in. Do not make a Routine or keep in chat.', '把连接文字贴到机器人窗口。机器人只发 GROK_CREW_OK 就停下，说明工作还没送到。两行回复后这张书桌会签到。灯只在进入这台 Windows 后亮。不要在聊天里做 Routine 或 keep。', '接続文をボット窓に貼る。ボットが GROK_CREW_OK だけ送って止まるなら、仕事はまだ届いていません。二行で答えればこの机が入場します。ランプはこの Windows に入ってから点きます。チャットにルーチンや keep を作らないでください。')}</p>
      </header>

      <section className={`desktop-auto-connect${connected ? ' is-ready' : ''}`} aria-live="polite">
        <Lamp
          on={connected}
          label={connected && connectedNames.length
            ? t(`연결됨 · ${connectedNames.join(' · ')}`, `Connected · ${connectedNames.join(' · ')}`, `已连接 · ${connectedNames.join(' · ')}`, `接続済み · ${connectedNames.join(' · ')}`)
            : lampText(connected, t)}
        />
        <div className="desktop-connect-toolbar">
          <button
            type="button"
            className="desktop-secondary"
            disabled={!studioReady || refreshing || Boolean(disconnecting)}
            aria-busy={refreshing}
            onClick={() => { void refreshNow(); }}
          >
            {refreshing ? <span className="desktop-spinner desktop-spinner-inline" aria-hidden="true" /> : null}
            {refreshing
              ? t('확인 중', 'Checking', '确认中', '確認中')
              : t('연결 새로고침', 'Refresh connection', '刷新连接', '接続を更新')}
          </button>
          <button
            type="button"
            className="desktop-secondary"
            disabled={!connected || refreshing || Boolean(disconnecting)}
            aria-busy={disconnecting === 'all'}
            onClick={() => { void disconnectAll(); }}
          >
            {disconnecting === 'all'
              ? t('끊는 중', 'Disconnecting', '断开中', '切断中')
              : t('연결 해제', 'Disconnect', '断开连接', '接続を外す')}
          </button>
        </div>
      </section>
      {releasedNote ? <p className="desktop-spec-meta" role="status">{releasedNote}</p> : null}

      {studioPort === 7214 ? (
        <p className="desktop-spec-meta">{t('이 창의 체크인 주소는 127.0.0.1:7214입니다.', 'This window check-in address is 127.0.0.1:7214.', '这个窗口的签到地址是 127.0.0.1:7214。', 'この窓のチェックインアドレスは 127.0.0.1:7214 です。')}</p>
      ) : (
        <p className="desktop-port-banner" role="status">
          {t(`이 창은 7214가 아니라 127.0.0.1:${studioPort}를 엽니다. 연결 글은 그 주소를 씁니다.`, `This window opened 127.0.0.1:${studioPort}, not 7214. The connect text uses that address.`, `这个窗口开的是 127.0.0.1:${studioPort}，不是 7214。连接文字用这个地址。`, `この窓は 7214 ではなく 127.0.0.1:${studioPort} を開いています。接続文はそのアドレスを使います。`)}
        </p>
      )}
      <p className="desktop-spec-meta">{t('자리 확인은 이 책상이 합니다. 채팅에 루틴·매 분 예약 작업을 만들지 마세요. 1분을 놓치면 보드에 마지막 확인이 나고, 5분이 지나면 자리는 한가합니다.', 'This desk does the seat check. Do not make a Grok Routine or a chat every-minute job. After one missed minute the board shows last check. After five minutes the seat is idle.', '位子确认由这张书桌做。不要在聊天里做 Routine 或每分钟预约。错过 1 分钟看板会写上次确认，过 5 分钟位子空闲。', '席の確認はこの机がします。チャットにルーチンや毎分の予約作業を作らないでください。1分逃すとボードに最後の確認が出て、5分で席は待機です。')}</p>

      <section className="desktop-auto-composer-card">
        <h2>{t('봇 붙이기', 'Attach a bot', '接上机器人', 'ボットを付ける')}</h2>
        <p>{t('쓸 봇만 고르면 됩니다. Agent는 옆 칩에서 엽니다.', 'Pick the bot you will use. Agent is on the other chip.', '只选要用的机器人。Agent 在旁边的芯片里。', '使うボットだけ選ぶ。Agent は横のチップで開く。')}</p>
        <div className="desktop-auto-options" role="tablist" aria-label={t('봇 종류', 'Bot type', '机器人种类', 'ボットの種類')}>
          {OTHER_FAMILIES.map((family) => (
            <button
              key={family.id}
              type="button"
              role="tab"
              aria-selected={familyId === family.id}
              className={`desktop-auto-option${familyId === family.id ? ' is-open' : ''}${familyIsConnected(family.id, links, roster) ? ' is-set' : ''}`}
              onClick={() => setFamilyId(family.id)}
            >
              <span>{t(family.ko, family.en, family.zh, family.ja)}</span>
              <b>{lampText(familyIsConnected(family.id, links, roster), t)}</b>
            </button>
          ))}
        </div>
        {links.pairCode ? <p className="desktop-spec-meta">{t(`연결 코드 ${links.pairCode}`, `Code ${links.pairCode}`, `连接代码 ${links.pairCode}`, `接続コード ${links.pairCode}`)}</p> : null}
        <p className="desktop-spec-meta">
          {t(`이 글은 ${destName}용입니다. 업로드 위치는 시작에서 바꿉니다. 바꿨으면 다시 복사하세요.`, `This text is for ${destName}. Change the upload location in Start. Copy again after a change.`, `这段文字是给 ${destName} 的。上传位置在开始里改。改了请再复制。`, `この文は ${destName} 用です。アップロード位置は開始で変えます。変えたらコピーし直してください。`)}
        </p>
        {OTHER_FAMILIES.filter((family) => family.id === familyId).map((family) => (
          <div key={family.id} className="desktop-bot-family">
            <h3>{t(family.ko, family.en, family.zh, family.ja)}</h3>
            <ul className="desktop-bot-list">
              {BOT_ROLES.map((role) => {
                const seat: OtherSeat = { kind: family.id, role };
                const on = seatIsConnected(seat.kind, seat.role, links, roster);
                const key = `${seat.kind}-${seat.role}`;
                const label = seatName(seat.kind, seat.role, language);
                return (
                  <li key={key} className={on ? 'is-connected' : ''}>
                    <div className="desktop-connect-row">
                    <div>
                      <b>{label}</b>
                      <Lamp on={on} label={lampText(on, t)} />
                    </div>
                    <div className="desktop-simple-copy-row">
                      {on ? (
                        <button
                          type="button"
                          className="desktop-secondary"
                          disabled={refreshing || Boolean(disconnecting)}
                          aria-busy={disconnecting === key}
                          onClick={() => { void disconnectSeat(seat); }}
                        >
                          {disconnecting === key
                            ? t('끊는 중', 'Disconnecting', '断开中', '切断中')
                            : t('연결 해제', 'Disconnect', '断开连接', '接続を外す')}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="desktop-primary"
                          disabled={!studioReady || !links.pairCode || Boolean(disconnecting)}
                          onClick={() => { void copyRemote(seat); }}
                        >
                          {copied === key ? t('복사했습니다', 'Copied', '已复制', 'コピーしました') : t('연결 글 복사', 'Copy the connect text', '复制连接文字', '接続文をコピー')}
                        </button>
                      )}
                    </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        {blockedKind ? (
          <textarea className="desktop-bot-paste" value={connectText} readOnly rows={8} onFocus={(event) => event.currentTarget.select()} />
        ) : null}
        {error ? <p className="desktop-spec-error" role="alert">{error}</p> : null}
      </section>

      {services ? (
        <details className="desktop-auto-help">
          <summary>{t('이 창의 다른 연결', 'Other links on this window', '这个窗口的其他连接', 'この窓のほかの接続')}</summary>
          <ul className="desktop-bot-list">
            <li className={services.studioReady ? 'is-connected' : ''}>
              <div className="desktop-connect-row">
              <div>
                <b>Local Studio</b>
                <Lamp on={services.studioReady} label={lampText(services.studioReady, t)} />
              </div>
              {services.studioReady ? null : (
                <button type="button" className="desktop-secondary" onClick={services.onRefreshStudio}>{t('다시 연결', 'Reconnect', '重新连接', '再接続')}</button>
              )}
              </div>
            </li>
          </ul>
        </details>
      ) : null}
    </div>
  );
}

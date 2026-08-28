'use client';

import { useEffect, useMemo, useState } from 'react';
import { connectPaste, connectedBot, type CrewRoster } from './desktop-bot-connect';
import { BOT_ROLES, seatName, type BotRole } from './bot-skills';
import { marketLabel, resolveCrewMarket } from './crew-market';
import { autoSeatRows, readAutoPrefs, recipeFallbackLabel, writeAutoPrefs, type BotActivityItem } from './desktop-auto-state';
import { DesktopCrewBoard } from './desktop-crew-board';
import { DesktopInstallHelp } from './desktop-install-help';
import { readDeskWait, type DeskWaitState } from './desktop-wait-state';
import { crewBoardScope, type CrewLoadState } from './desktop-crew-log';
import {
  type BotLinkState,
  confirmRemoteReplies,
  familyIsConnected,
  linkedBySeat,
  markRemoteCopied,
  readLastConnectBundle,
  remoteConnectPaste,
  removeLinkedBot,
  seatIsConnected,
  studioPortFromApiBase,
  threeSeatConnectPaste,
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
  allowOwnFile?: boolean;
  services?: ConnectServices;
  wait?: DeskWaitState | null;
  onLinksChange: (next: BotLinkState) => void;
  onRefresh: () => Promise<void>;
  onOpenOwnFile?: () => void;
  request?: (path: string, init?: RequestInit) => Promise<Record<string, unknown>>;
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
  allowOwnFile = false,
  services,
  wait,
  onLinksChange,
  onRefresh,
  onOpenOwnFile,
  request,
}: BotPanelProps) {
  const { language, t } = useLanguage();
  const [openSeat, setOpenSeat] = useState<OtherSeat>({ kind: 'grok', role: 'planner' });
  const [familyId, setFamilyId] = useState<(typeof OTHER_FAMILIES)[number]['id']>('grok');
  const [copied, setCopied] = useState('');
  const [blockedKind, setBlockedKind] = useState('');
  const [error, setError] = useState('');
  const [replyText, setReplyText] = useState('');
  const [replyError, setReplyError] = useState('');
  const [activity, setActivity] = useState<BotActivityItem[]>([]);
  const [activityState, setActivityState] = useState<CrewLoadState>('loading');
  const [lastBundle, setLastBundle] = useState(() => readLastConnectBundle());
  const [bundleText, setBundleText] = useState('');
  const local = connectedBot(roster);
  const liveLink = links.bots.find((item) => item.status === 'connected');
  const connected = Boolean(local) || Boolean(liveLink);
  const studioPort = studioPortFromApiBase(
    typeof window !== 'undefined' ? window.grokCrew?.apiBase : undefined,
  );
  const prefs = readAutoPrefs();
  const market = resolveCrewMarket(prefs.market, language);
  const destName = marketLabel(market, language);
  const recipeId = lastBundle?.recipeId || prefs.recipeId || 'instagram_reel';
  const recipeName = recipeFallbackLabel(recipeId, language);
  const lastMarketName = marketLabel(resolveCrewMarket(lastBundle?.market || market, language), language);
  const liveWait = wait !== undefined ? wait : readDeskWait();
  const seatRows = autoSeatRows({ roster, links, language });
  const boardScope = crewBoardScope(liveWait, activity);

  const connectText = useMemo(
    () => remoteConnectPaste(openSeat.kind, links.pairCode, language, openSeat.role, studioPort, market),
    [language, links.pairCode, market, openSeat.kind, openSeat.role, studioPort],
  );
  const localText = useMemo(() => connectPaste(language, studioPort), [language, studioPort]);
  const yesterdayText = useMemo(
    () => threeSeatConnectPaste(links.pairCode, language, studioPort, lastBundle?.market || market),
    [language, lastBundle?.market, links.pairCode, market, studioPort],
  );

  useEffect(() => {
    if (!request) {
      setActivityState('ready');
      return undefined;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const data = await request('/api/bot-activity') as { activity?: BotActivityItem[] };
        if (cancelled) return;
        setActivity(Array.isArray(data.activity) ? data.activity : []);
        setActivityState('ready');
      } catch {
        if (cancelled) return;
        setActivityState('error');
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 8000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [request]);

  const rememberBundle = (nextMarket = market, nextRecipe = recipeId) => {
    const saved = writeLastConnectBundle({
      market: nextMarket,
      recipeId: nextRecipe,
      language,
    });
    if (saved) setLastBundle(saved);
  };

  const markCopied = (seat: OtherSeat) => {
    const next = markRemoteCopied(links, { kind: seat.kind, role: seat.role, language });
    writeBotLinks(next);
    onLinksChange(next);
  };

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
    markCopied(seat);
    if (seat.kind === 'grok') rememberBundle();
    await onRefresh();
  };

  const copyYesterday = async () => {
    setError('');
    setBlockedKind('');
    if (!links.pairCode) {
      setError(t('연결 코드가 아직 없습니다. 잠시 후 다시 눌러 주세요.', 'The connect code is not ready yet. Try again in a moment.', '连接代码还没好。请稍后再按。', '接続コードがまだありません。少ししてから押してください。'));
      return;
    }
    const dest = resolveCrewMarket(lastBundle?.market || market, language);
    const text = threeSeatConnectPaste(links.pairCode, language, studioPort, dest);
    writeAutoPrefs({
      market: dest,
      marketTouched: true,
      recipeId,
    });
    rememberBundle(dest, recipeId);
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(text);
      setCopied('yesterday');
      setBundleText('');
      window.setTimeout(() => setCopied(''), 4000);
    } catch {
      setBlockedKind('yesterday');
      setBundleText(text);
    }
    await onRefresh();
  };

  const copyLocal = async () => {
    setError('');
    setBlockedKind('');
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(localText);
      setCopied('same_pc');
      window.setTimeout(() => setCopied(''), 4000);
    } catch {
      setBlockedKind('same_pc');
    }
    await onRefresh();
  };

  const forget = (id: string) => {
    const next = removeLinkedBot(links, id);
    writeBotLinks(next);
    onLinksChange(next);
  };

  const attachReply = () => {
    setReplyError('');
    setError('');
    if (!links.pairCode) {
      setReplyError(t('연결 코드가 아직 없습니다. 잠시 후 다시 붙여 주세요.', 'The connect code is not ready yet. Paste again in a moment.', '连接代码还没好。请稍后再贴。', '接続コードがまだありません。少ししてから貼ってください。'));
      return;
    }
    const result = confirmRemoteReplies(links, replyText, language);
    if (!result.confirmed.length) {
      setReplyError(t('GROK_CREW_OK 와 이 창의 연결 코드, 자리 이름이 같은 한 줄이 필요합니다.', 'Need one line with GROK_CREW_OK, this window connect code, and the seat name.', '需要一行 GROK_CREW_OK、这个窗口的连接代码和座位名。', 'GROK_CREW_OK とこの窓の接続コード、席の名前がある一行が必要です。'));
      return;
    }
    writeBotLinks(result.next);
    onLinksChange(result.next);
    setReplyText('');
  };

  const openFamily = OTHER_FAMILIES.find((family) => family.id === familyId) ?? OTHER_FAMILIES[0];
  const familyHasOpenSeat = BOT_ROLES.some((role) => !seatIsConnected(openFamily.id, role, links, roster));

  return (
    <div className="desktop-spec-desk desktop-bot-room" data-stage="compose">
      <header className="desktop-auto-lead">
        <h1>{t('연결', 'Connect', '连接', '接続')}</h1>
        <p>{t('연결 글을 복사해 봇 창에 붙이세요. Grok Bot은 등록된 Windows에서 승인 후 체크인하면 램프가 켜집니다. 안 되면 봇이 보낸 GROK_CREW_OK 한 줄을 여기 붙입니다. 복사만으로는 연결되지 않습니다.', 'Copy the connect text into the bot window. Grok Bot turns the lamp on after an approved check-in on the registered Windows. If that fails, paste the bot GROK_CREW_OK line here. Copying is not a connection.', '把连接文字贴到机器人窗口。Grok Bot 在已登记的 Windows 上批准签到后灯会亮。不行就把机器人回的 GROK_CREW_OK 贴到这里。只复制不算已连接。', '接続文をボット窓に貼る。Grok Bot は登録した Windows で承認してチェックインするとランプが付く。だめならボットの GROK_CREW_OK をここに貼る。コピーしただけでは接続されない。')}</p>
      </header>

      <section className={`desktop-auto-connect${connected ? ' is-ready' : ''}`} aria-live="polite">
        <Lamp on={connected} label={lampText(connected, t)} />
      </section>

      {studioPort === 7214 ? (
        <p className="desktop-spec-meta">{t('이 창의 체크인 주소는 127.0.0.1:7214입니다.', 'This window check-in address is 127.0.0.1:7214.', '这个窗口的签到地址是 127.0.0.1:7214。', 'この窓のチェックイン住所は 127.0.0.1:7214 です。')}</p>
      ) : (
        <p className="desktop-port-banner" role="status">
          {t(`이 창은 7214가 아니라 127.0.0.1:${studioPort}를 엽니다. 연결 글은 그 주소를 씁니다.`, `This window opened 127.0.0.1:${studioPort}, not 7214. The connect text uses that address.`, `这个窗口开的是 127.0.0.1:${studioPort}，不是 7214。连接文字用这个地址。`, `この窓は 7214 ではなく 127.0.0.1:${studioPort} を開いています。接続文はその住所を使います。`)}
        </p>
      )}

      <section className="desktop-recopy-card">
        <div>
          <b>{t('어제랑 같게', 'Same as yesterday', '和昨天一样', '昨日と同じ')}</b>
          <p>{t(
            `${lastMarketName} · ${recipeName} · Grok 자리 세 개. 자리 이름대로 나눠 붙이세요. 토큰은 없습니다.`,
            `${lastMarketName} · ${recipeName} · the three Grok seats. Paste each block into that window. There is no token.`,
            `${lastMarketName} · ${recipeName} · 三个 Grok 位子。按位子名分开贴。没有令牌。`,
            `${lastMarketName} · ${recipeName} · Grok の三席。席の名前どおり分けて貼る。トークンはありません。`,
          )}</p>
        </div>
        <button
          type="button"
          className="desktop-primary desktop-recopy-btn"
          disabled={!studioReady || !links.pairCode}
          onClick={() => { void copyYesterday(); }}
        >
          {copied === 'yesterday'
            ? t('복사했습니다. 나눠 붙이세요.', 'Copied. Split it into the three windows.', '已复制。请分开贴。', 'コピーしました。分けて貼ってください。')
            : t('세 자리 다시 복사', 'Copy the three seats again', '再复制三个位子', '三席をもう一度コピー')}
        </button>
        {blockedKind === 'yesterday' ? (
          <textarea className="desktop-bot-paste" value={bundleText || yesterdayText} readOnly rows={10} onFocus={(event) => event.currentTarget.select()} />
        ) : null}
      </section>

      <section className="desktop-auto-composer-card">
        <h2>{t('봇 붙이기', 'Attach a bot', '接上机器人', 'ボットを付ける')}</h2>
        <p>{t('쓸 봇만 고르면 됩니다. Agent는 옆 칩에서 엽니다.', 'Pick the bot you will use. Agent is on the other chip.', '只选要用的机器人。Agent 在旁边的芯片里。', '使うボットだけ選ぶ。Agent は横のチップで開く。')}</p>
        <div className="desktop-auto-options" role="tablist" aria-label={t('봇 종류', 'Bot kind', '机器人种类', 'ボットの種類')}>
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
          {t(`이 글은 ${destName}용입니다. 보낼 나라는 자동에서 바꿉니다. 바꿨으면 다시 복사하세요.`, `This text is for ${destName}. Change the destination country in Auto. Copy again after a change.`, `这段文字是给 ${destName} 的。要发往的国家在自动里改。改了请再复制。`, `この文は ${destName} 用です。送る国は自動で変えます。変えたらコピーし直してください。`)}
        </p>
        {OTHER_FAMILIES.filter((family) => family.id === familyId).map((family) => (
          <div key={family.id} className="desktop-bot-family">
            <h3>{t(family.ko, family.en, family.zh, family.ja)}</h3>
            <ul className="desktop-bot-list">
              {BOT_ROLES.map((role) => {
                const seat: OtherSeat = { kind: family.id, role };
                const row = linkedBySeat(links.bots, seat.kind, seat.role);
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
                      {on && row?.status === 'connected' ? (
                        <button type="button" className="desktop-secondary" onClick={() => forget(row.id)}>{t('끊기', 'Remove', '断开', '切る')}</button>
                      ) : on ? null : (
                        <button
                          type="button"
                          className="desktop-primary"
                          disabled={!studioReady || !links.pairCode}
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
            {familyHasOpenSeat && family.id === familyId ? (
              <div className="desktop-bot-confirm">
                <b>{t('봇이 보낸 한 줄로 붙이기', 'Attach with the bot line', '用机器人回的那一行接上', 'ボットが返した一行で付ける')}</b>
                <p>{t(`Windows 체크인이 안 되면 봇 창의 GROK_CREW_OK ${links.pairCode} … 줄을 붙이세요. 세 자리를 한꺼번에 붙여도 됩니다.`, `If the Windows check-in does not land, paste the GROK_CREW_OK ${links.pairCode} … line from the bot window. You can paste all three seats at once.`, `Windows 签到没到的话，把机器人窗口里的 GROK_CREW_OK ${links.pairCode} … 贴过来。三个座位可以一次贴。`, `Windows のチェックインが来なければ、ボット窓の GROK_CREW_OK ${links.pairCode} … を貼ってください。三席まとめて貼ってもよいです。`)}</p>
                <textarea
                  className="desktop-bot-paste"
                  value={replyText}
                  rows={5}
                  spellCheck={false}
                  placeholder={`GROK_CREW_OK ${links.pairCode} ${seatName(family.id, 'planner', language)}`}
                  onChange={(event) => {
                    setReplyText(event.target.value);
                    if (replyError) setReplyError('');
                  }}
                />
                <button type="button" className="desktop-primary" disabled={!studioReady || !replyText.trim()} onClick={attachReply}>
                  {t('이 줄로 붙이기', 'Attach with this line', '用这行接上', 'この行で付ける')}
                </button>
                {replyError ? <p className="desktop-spec-error" role="alert">{replyError}</p> : null}
              </div>
            ) : null}
          </div>
        ))}
        {blockedKind && blockedKind !== 'same_pc' && blockedKind !== 'yesterday' ? (
          <textarea className="desktop-bot-paste" value={connectText} readOnly rows={8} onFocus={(event) => event.currentTarget.select()} />
        ) : null}
        {error ? <p className="desktop-spec-error" role="alert">{error}</p> : null}
      </section>

      <DesktopCrewBoard
        rows={seatRows}
        activity={activity}
        loadState={activityState}
        specId={boardScope.specId}
        jobTitle={boardScope.jobTitle}
        onRetry={request ? () => {
          setActivityState('loading');
          void request('/api/bot-activity').then((data) => {
            const payload = data as { activity?: BotActivityItem[] };
            setActivity(Array.isArray(payload.activity) ? payload.activity : []);
            setActivityState('ready');
          }).catch(() => setActivityState('error'));
        } : undefined}
      />

      <details className="desktop-auto-help">
        <summary>{t('이 PC에서 봇 쓰기', 'Use a bot on this PC', '在这台电脑用机器人', 'この PC でボットを使う')}</summary>
        <p>{t('같은 PC 봇은 체크인 글을 그 창에 붙이면 이름이 여기 뜹니다. 창을 끄지 마세요.', 'A bot on this PC pastes the check-in line and its name appears here. Do not close this window.', '这台电脑上的机器人贴签到文字后，名字会出现在这里。不要关掉窗口。', '同じ PC のボットはチェックイン文を貼ると名前が出ます。窓を閉じないでください。')}</p>
        <div className={`desktop-connect-row${local ? ' is-connected' : ''}`}>
          <div>
            <b>{local ? (local.display_name || local.bot_id) : t('이 PC 봇', 'This PC bot', '这台电脑的机器人', 'この PC のボット')}</b>
            <Lamp on={Boolean(local)} label={lampText(Boolean(local), t)} />
          </div>
          {local ? null : (
            <button type="button" className="desktop-primary" disabled={!studioReady} onClick={() => void copyLocal()}>
              {copied === 'same_pc' ? t('복사했습니다', 'Copied', '已复制', 'コピーしました') : t('연결 글 복사', 'Copy the connect text', '复制连接文字', '接続文をコピー')}
            </button>
          )}
        </div>
        {blockedKind === 'same_pc' ? (
          <textarea className="desktop-bot-paste" value={localText} readOnly rows={8} onFocus={(event) => event.currentTarget.select()} />
        ) : null}
      </details>

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
            <li className={services.github.authenticated ? 'is-connected' : ''}>
              <div className="desktop-connect-row">
              <div>
                <b>GitHub</b>
                <Lamp on={services.github.authenticated} label={lampText(services.github.authenticated, t)} />
                <span>{services.github.relay_connected
                  ? services.github.remote
                  : t('relay 저장소는 아직입니다.', 'No relay repository yet.', '还没有 relay 仓库。', 'relay リポジトリはまだです。')}</span>
              </div>
              <div className="desktop-simple-copy-row">
                {services.desktopApp ? (
                  <>
                    {services.github.authenticated ? null : (
                      <button type="button" className="desktop-secondary" disabled={services.busy || !services.github.oauth_available} onClick={() => services.onLoginGitHub('device')}>
                        {t('브라우저로 로그인', 'Browser login', '浏览器登录', 'ブラウザでログイン')}
                      </button>
                    )}
                    <button type="button" className="desktop-secondary" disabled={services.busy} onClick={services.onConnectRelay}>
                      {services.github.relay_connected ? t('relay 바꾸기', 'Change relay', '更换 relay', 'relay を変える') : t('relay 연결', 'Connect relay', '连接 relay', 'relay 接続')}
                    </button>
                  </>
                ) : (
                  <span>{t('데스크톱 앱에서만 됩니다.', 'Only in the desktop app.', '仅桌面应用可用。', 'デスクトップアプリだけです。')}</span>
                )}
              </div>
              </div>
              {services.desktopApp && !services.github.authenticated ? (
                <label className="desktop-spec-field desktop-spec-wide">
                  <span>{t('또는 GitHub 토큰', 'Or a GitHub token', '或 GitHub 令牌', 'または GitHub トークン')}</span>
                  <input
                    type="password"
                    autoComplete="off"
                    value={services.githubToken}
                    onChange={(event) => services.onGithubToken(event.currentTarget.value)}
                  />
                  <button type="button" className="desktop-secondary" disabled={services.busy || services.githubToken.length < 20} onClick={() => services.onLoginGitHub('token')}>
                    {t('토큰으로 연결', 'Connect with token', '用令牌连接', 'トークンで接続')}
                  </button>
                </label>
              ) : null}
            </li>
            <li className={services.runnerPaired ? 'is-connected' : ''}>
              <div className="desktop-connect-row">
              <div>
                <b>{t('Grok 제작기', 'Grok builder', 'Grok 制作器', 'Grok 制作機')}</b>
                <Lamp on={services.runnerPaired} label={lampText(services.runnerPaired, t)} />
                <span>{t('이 창의 타임라인을 Grok Build가 고칩니다. AWS·GitHub Actions가 아닙니다. 글을 붙이는 Grok Bot과도 다릅니다.', 'Grok Build edits this window’s timeline. Not AWS or GitHub Actions. Different from Grok Bot, the chat you paste into.', '让 Grok Build 改这个窗口的时间线。不是 AWS 或 GitHub Actions。也不是你粘贴文字的 Grok Bot。', 'この窓のタイムラインを Grok Build が直します。AWS・GitHub Actions ではありません。文章を貼る Grok Bot とも違います。')}</span>
              </div>
              {services.desktopApp ? (
                <div className="desktop-simple-copy-row">
                  <button type="button" className="desktop-secondary" disabled={services.busy} onClick={services.onPairRunner}>{t('제작기 연결', 'Pair the builder', '连接制作器', '制作機を接続')}</button>
                  <button type="button" className="desktop-secondary" disabled={services.busy} onClick={services.onExportDesktopKey}>{t('데스크톱 키', 'Desktop key', '桌面密钥', 'デスクトップ鍵')}</button>
                </div>
              ) : (
                <span>{t('데스크톱 앱에서만 됩니다.', 'Only in the desktop app.', '仅桌面应用可用。', 'デスクトップアプリだけです。')}</span>
              )}
              </div>
            </li>
          </ul>
        </details>
      ) : null}

      <DesktopInstallHelp variant={connected ? 'fold' : 'open'} />

      {allowOwnFile && onOpenOwnFile ? (
        <details className="desktop-auto-help">
          <summary>{t('봇 없이 영상 열기', 'Open a video with no bot', '不用机器人打开视频', 'ボットなしで映像を開く')}</summary>
          <p>{t('이 PC 영상을 바로 엽니다. 그러면 설정·편집·내보내기가 켜집니다.', 'Open a video on this PC. Setup, Edit, and Export then turn on.', '直接打开这台电脑上的视频。设置、编辑、导出就会打开。', 'この PC の映像を開く。設定・編集・書き出しが付く。')}</p>
          <button type="button" className="desktop-secondary" onClick={onOpenOwnFile}>
            {t('영상 고르기', 'Pick a video', '选择视频', '映像を選ぶ')}
          </button>
        </details>
      ) : null}
    </div>
  );
}

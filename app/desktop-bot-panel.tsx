'use client';

import { useMemo, useState } from 'react';
import { type CrewRoster } from './desktop-bot-connect';
import { BOT_ROLES, seatName, type BotRole } from './bot-skills';
import { marketLabel, resolveCrewMarket } from './crew-market';
import { readAutoPrefs } from './desktop-auto-state';
import {
  type BotLinkState,
  type LinkChangeCause,
  confirmRemoteReplies,
  connectedRemoteNames,
  familyIsConnected,
  hasConnectedBot,
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
}: BotPanelProps) {
  const { language, t } = useLanguage();
  const [openSeat, setOpenSeat] = useState<OtherSeat>({ kind: 'grok', role: 'planner' });
  const [familyId, setFamilyId] = useState<(typeof OTHER_FAMILIES)[number]['id']>('grok');
  const [copied, setCopied] = useState('');
  const [blockedKind, setBlockedKind] = useState('');
  const [error, setError] = useState('');
  const [replyText, setReplyText] = useState('');
  const [replyError, setReplyError] = useState('');
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
  const connectedNames = connectedRemoteNames(links, roster);

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

  const markCopied = (seat: OtherSeat) => {
    const next = markRemoteCopied(links, { kind: seat.kind, role: seat.role, language });
    writeBotLinks(next);
    onLinksChange(next, 'copy');
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
    setReleasedNote('');
    await onRefresh();
  };

  const disconnectSeat = (seat: OtherSeat) => {
    const next = releaseLinkedSeat(links, seat.kind, seat.role);
    writeBotLinks(next);
    onLinksChange(next, 'release');
    setReleasedNote(t(
      '이 창에서 끊었습니다. 봇 창이 켜져 있으면 그 쪽은 그대로일 수 있습니다.',
      'This window released the seat. The bot window may still be open.',
      '这个窗口已断开。机器人窗口可能还开着。',
      'この窓で外しました。ボットの窓は開いたままのことがあります。',
    ));
  };

  const disconnectAll = () => {
    const next = releaseHeldSeats(links, roster);
    writeBotLinks(next);
    onLinksChange(next, 'release');
    setReleasedNote(t(
      '이 창에서 모든 자리를 끊었습니다. 다시 쓰려면 연결 글을 붙이세요.',
      'This window released every seat. Paste the connect text to use them again.',
      '这个窗口已断开所有位子。要再用请贴连接文字。',
      'この窓ですべての席を外しました。もう一度使うには接続文を貼ってください。',
    ));
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
    onLinksChange(result.next, 'attach');
    setReplyText('');
    setReleasedNote('');
  };

  const openFamily = OTHER_FAMILIES.find((family) => family.id === familyId) ?? OTHER_FAMILIES[0];
  const familyHasOpenSeat = BOT_ROLES.some((role) => !seatIsConnected(openFamily.id, role, links, roster));

  return (
    <div className="desktop-spec-desk desktop-bot-room" data-stage="compose">
      <header className="desktop-auto-lead">
        <h1>{t('연결', 'Connect', '连接', '接続')}</h1>
        <p>{t('연결 글을 봇 창에 붙이세요. 복사만으로는 연결되지 않고, 이 탭에 머뭅니다. 자리마다 연결 글을 복사한 뒤 시작으로 가세요. 램프가 켜지면 연결됨입니다.', 'Paste the connect text in the bot window. Copying is not a connection, and this tab stays open. Copy each seat, then go to Start. The lamp means connected.', '把连接文字贴到机器人窗口。只复制不算已连接，也不会离开这个页。每个位子复制后再去开始。灯亮就是已连接。', '接続文をボット窓に貼る。コピーしただけでは接続されず、このタブに留まります。席ごとにコピーしてから開始へ。ランプが付けば接続済み。')}</p>
      </header>

      <section className={`desktop-auto-connect${connected ? ' is-ready' : ''}`} aria-live="polite">
        <Lamp
          on={connected}
          label={connected && connectedNames.length
            ? t(`연결됨 · ${connectedNames.join(' · ')}`, `Connected · ${connectedNames.join(' · ')}`, `已连接 · ${connectedNames.join(' · ')}`, `接続済み · ${connectedNames.join(' · ')}`)
            : lampText(connected, t)}
        />
        <div className="desktop-connect-toolbar">
          <button type="button" className="desktop-secondary" disabled={!studioReady} onClick={() => { void onRefresh(); }}>
            {t('연결 새로고침', 'Refresh connection', '刷新连接', '接続を更新')}
          </button>
          <button type="button" className="desktop-secondary" disabled={!connected} onClick={disconnectAll}>
            {t('연결 해제', 'Disconnect', '断开连接', '接続を外す')}
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
          {t(`이 글은 ${destName}용입니다. 보낼 나라는 시작에서 바꿉니다. 바꿨으면 다시 복사하세요.`, `This text is for ${destName}. Change the destination country in Start. Copy again after a change.`, `这段文字是给 ${destName} 的。要发往的国家在开始里改。改了请再复制。`, `この文は ${destName} 用です。送る国は開始で変えます。変えたらコピーし直してください。`)}
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
                        <button type="button" className="desktop-secondary" onClick={() => disconnectSeat(seat)}>{t('연결 해제', 'Disconnect', '断开连接', '接続を外す')}</button>
                      ) : (
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
                  <button type="button" className="desktop-secondary" disabled={services.busy} onClick={services.onExportDesktopKey}>{t('데스크톱 키', 'Desktop key', '桌面密钥', 'デスクトップキー')}</button>
                </div>
              ) : (
                <span>{t('데스크톱 앱에서만 됩니다.', 'Only in the desktop app.', '仅桌面应用可用。', 'デスクトップアプリだけです。')}</span>
              )}
              </div>
            </li>
          </ul>
        </details>
      ) : null}
    </div>
  );
}

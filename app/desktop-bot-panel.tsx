'use client';

import { useMemo, useState } from 'react';
import { connectPaste, connectedBot, type CrewRoster } from './desktop-bot-connect';
import { botSeenSeconds, formatSince } from './desktop-auto-state';
import {
  type BotKind,
  type BotLinkState,
  type LinkedBot,
  linkedByKind,
  parseConnectReply,
  remoteConnectPaste,
  removeLinkedBot,
  suggestedConnectReply,
  upsertLinkedBot,
  writeBotLinks,
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
  onLinksChange: (next: BotLinkState) => void;
  onRefresh: () => Promise<void>;
  onOpenOwnFile?: () => void;
};

const OTHER_KINDS: Array<{ id: Exclude<BotKind, 'same_pc'>; ko: string; en: string; zh: string; ja: string }> = [
  { id: 'grok', ko: 'Grok', en: 'Grok', zh: 'Grok', ja: 'Grok' },
  { id: 'cursor', ko: 'Cursor', en: 'Cursor', zh: 'Cursor', ja: 'Cursor' },
  { id: 'claude', ko: 'Claude', en: 'Claude', zh: 'Claude', ja: 'Claude' },
  { id: 'custom', ko: '내가 만든 에이전트', en: 'My agent', zh: '我做的智能体', ja: '自分のエージェント' },
];

function Lamp({ on, label }: { on: boolean; label: string }) {
  return (
    <span className={`desktop-connect-lamp${on ? ' is-on' : ''}`}>
      <i aria-hidden="true" />
      {label}
    </span>
  );
}

export function DesktopBotPanel({
  roster,
  links,
  studioReady,
  allowOwnFile = false,
  services,
  onLinksChange,
  onRefresh,
  onOpenOwnFile,
}: BotPanelProps) {
  const { language, t } = useLanguage();
  const [openKind, setOpenKind] = useState<Exclude<BotKind, 'same_pc'>>('grok');
  const [copied, setCopied] = useState('');
  const [blockedKind, setBlockedKind] = useState('');
  const [paste, setPaste] = useState('');
  const [error, setError] = useState('');
  const local = connectedBot(roster);
  const liveLink = links.bots.find((item) => item.status === 'connected');
  const connected = Boolean(local) || Boolean(liveLink);
  const seenSeconds = botSeenSeconds(roster, liveLink?.connectedAt);
  const seenLabel = seenSeconds === null ? '' : formatSince(seenSeconds, language);

  const connectText = useMemo(
    () => remoteConnectPaste(openKind, links.pairCode, language),
    [language, links.pairCode, openKind],
  );
  const localText = useMemo(() => connectPaste(language), [language]);

  const markWaiting = (kind: Exclude<BotKind, 'same_pc'>) => {
    if (!links.pairCode) return;
    const found = OTHER_KINDS.find((item) => item.id === kind);
    const waiting: LinkedBot = {
      id: `${kind}-${links.pairCode}`,
      name: found ? t(found.ko, found.en, found.zh, found.ja) : kind,
      kind,
      place: 'other_pc',
      status: 'waiting',
      pairCode: links.pairCode,
    };
    const next = upsertLinkedBot(links, waiting);
    writeBotLinks(next);
    onLinksChange(next);
  };

  const copyRemote = async (kind: Exclude<BotKind, 'same_pc'>) => {
    setError('');
    setBlockedKind('');
    setOpenKind(kind);
    if (links.pairCode) setPaste(suggestedConnectReply(kind, links.pairCode));
    const text = remoteConnectPaste(kind, links.pairCode, language);
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      window.setTimeout(() => setCopied(''), 4000);
      markWaiting(kind);
    } catch {
      setBlockedKind(kind);
      markWaiting(kind);
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

  const confirmReply = (kind: Exclude<BotKind, 'same_pc'>) => {
    const source = paste.trim() || (links.pairCode ? suggestedConnectReply(kind, links.pairCode) : '');
    const parsed = parseConnectReply(source, links.pairCode);
    if (!parsed) {
      if (!links.pairCode) {
        setError(t('연결 코드가 아직 없습니다. 잠시 후 다시 눌러 주세요.', 'The connect code is not ready yet. Try again in a moment.', '连接代码还没好。请稍后再按。', '接続コードがまだありません。少ししてから押してください。'));
      } else if (!/GROK_CREW_OK/i.test(source)) {
        setError(t(`한 줄이 GROK_CREW_OK ${links.pairCode} 이름 이어야 합니다.`, `The line must be GROK_CREW_OK ${links.pairCode} name.`, `必须是 GROK_CREW_OK ${links.pairCode} 名称 这一行。`, `GROK_CREW_OK ${links.pairCode} 名前 の一行にしてください。`));
      } else {
        setError(t(`코드가 ${links.pairCode} 이어야 합니다.`, `The code must be ${links.pairCode}.`, `代码必须是 ${links.pairCode}。`, `コードは ${links.pairCode} にしてください。`));
      }
      return;
    }
    const next = upsertLinkedBot(links, {
      id: `${kind}-${links.pairCode}`,
      name: parsed.name,
      kind,
      place: 'other_pc',
      status: 'connected',
      pairCode: links.pairCode,
      connectedAt: new Date().toISOString(),
    });
    writeBotLinks(next);
    onLinksChange(next);
    setPaste('');
    setError('');
  };

  const forget = (id: string) => {
    const next = removeLinkedBot(links, id);
    writeBotLinks(next);
    onLinksChange(next);
  };

  return (
    <div className="desktop-spec-desk desktop-bot-room">
      <div className="desktop-spec-hero">
        <span>✦</span>
        <h1>{t('연결', 'Connect', '连接', '接続')}</h1>
        <p>{t('봇·Runner·GitHub 연결은 전부 여기서 합니다. 다른 PC가 맨 위입니다. 설정·편집·내보내기는 봇이 붙은 뒤에 켜집니다.', 'Every bot, Runner, and GitHub link lives here. Other PCs stay at the top. Setup, Edit, and Export turn on after a bot is attached.', '机器人、Runner、GitHub 都在这里连接。另一台电脑在最上面。设置、编辑、导出要等机器人接上后才打开。', 'ボット・Runner・GitHub の接続は全部ここです。別 PC が一番上。設定・編集・書き出しはボットが付いてから開きます。')}</p>
      </div>

      <section className={`desktop-simple-card desktop-connect-summary${connected ? ' is-ready' : ''}`} aria-live="polite">
        <Lamp
          on={connected}
          label={connected
            ? t(`연결됨${local?.display_name || liveLink?.name ? ` · ${local?.display_name || liveLink?.name}` : ''}${seenLabel ? ` · ${seenLabel}` : ''}`, `Connected${local?.display_name || liveLink?.name ? ` · ${local?.display_name || liveLink?.name}` : ''}${seenLabel ? ` · ${seenLabel}` : ''}`, `已连接${local?.display_name || liveLink?.name ? ` · ${local?.display_name || liveLink?.name}` : ''}${seenLabel ? ` · ${seenLabel}` : ''}`, `接続済み${local?.display_name || liveLink?.name ? ` · ${local?.display_name || liveLink?.name}` : ''}${seenLabel ? ` · ${seenLabel}` : ''}`)
            : t('아직 연결되지 않음', 'Not connected yet', '尚未连接', 'まだ接続されていない')}
        />
        <p>{connected
          ? t('붙은 이름 옆의 초록불과 마지막 확인이 연결됨입니다. 끊기는 각 줄에서 합니다.', 'The green light and last check next to a name mean connected. Remove it on that row.', '名字旁边的绿灯和上次确认就是已连接。断开在该行操作。', '名前の横の緑と最後の確認が接続済みです。切るはその行で。')
          : t('다른 PC의 Grok·Cursor·Claude·내가 만든 에이전트부터 붙이세요.', 'Attach Grok, Cursor, Claude, or your agent on another PC first.', '先接另一台电脑上的 Grok、Cursor、Claude 或自己的智能体。', '先に別 PC の Grok・Cursor・Claude・自分のエージェントを付けてください。')}</p>
      </section>

      <section className="desktop-simple-card">
        <h2>{t('다른 PC', 'Other PC', '另一台电脑', '別の PC')}</h2>
        <p>{t('Grok, Cursor, Claude, 내가 만든 에이전트는 연결 글을 그 창에 붙인 뒤, 봇이 보낸 한 줄을 다시 붙입니다. 그 봇은 이 주소를 열 수 없습니다.', 'Grok, Cursor, Claude, or your agent pastes the connect line, then you paste its one-line reply. That bot cannot open this address.', 'Grok、Cursor、Claude 或自己的智能体先贴连接文字，再把它们回的一行贴回来。那个机器人打不开这个地址。', 'Grok・Cursor・Claude・自分のエージェントは接続文を貼り、返ってきた一行を戻します。そのボットはこの住所を開けません。')}</p>
        {links.pairCode ? <p className="desktop-spec-meta">{t(`연결 코드 ${links.pairCode}`, `Code ${links.pairCode}`, `连接代码 ${links.pairCode}`, `接続コード ${links.pairCode}`)}</p> : null}
        <ul className="desktop-bot-list">
          {OTHER_KINDS.map((item) => {
            const row = linkedByKind(links.bots, item.id);
            const on = row?.status === 'connected';
            const open = openKind === item.id && !on;
            return (
              <li key={item.id} className={on ? 'is-connected' : ''}>
                <div className="desktop-connect-row">
                <div>
                  <b>{t(item.ko, item.en, item.zh, item.ja)}</b>
                  <Lamp
                    on={on}
                    label={on
                      ? t(`연결됨 · ${row?.name || item.ko}`, `Connected · ${row?.name || item.en}`, `已连接 · ${row?.name || item.zh}`, `接続済み · ${row?.name || item.ja}`)
                      : row?.status === 'waiting'
                        ? t('답 기다리는 중', 'Waiting for the reply', '等待回复', '返信待ち')
                        : t('아직 아님', 'Not yet', '还没有', 'まだ')}
                  />
                </div>
                <div className="desktop-simple-copy-row">
                  {on ? (
                    <button type="button" className="desktop-secondary" onClick={() => forget(row.id)}>{t('끊기', 'Remove', '断开', '切る')}</button>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="desktop-primary"
                        disabled={!studioReady || !links.pairCode}
                        onClick={() => { setOpenKind(item.id); void copyRemote(item.id); }}
                      >
                        {copied === item.id ? t('복사했습니다', 'Copied', '已复制', 'コピーしました') : t('연결 글 복사', 'Copy the connect text', '复制连接文字', '接続文をコピー')}
                      </button>
                      {open ? null : (
                        <button type="button" className="desktop-secondary" onClick={() => {
                          setOpenKind(item.id);
                          setError('');
                          if (links.pairCode) setPaste(suggestedConnectReply(item.id, links.pairCode));
                        }}>
                          {t('답 붙이기', 'Paste the reply', '贴回复', '返信を貼る')}
                        </button>
                      )}
                    </>
                  )}
                </div>
                </div>
                {open ? (
                  <label className="desktop-spec-field desktop-spec-wide">
                    <span>{t('봇이 보낸 한 줄', 'The one line the bot sent', '机器人回的一行', 'ボットが返した一行')}</span>
                    <input
                      value={paste}
                      onChange={(event) => setPaste(event.currentTarget.value)}
                      placeholder={links.pairCode ? suggestedConnectReply(item.id, links.pairCode) : `GROK_CREW_OK CODE ${item.en}`}
                    />
                    <button type="button" className="desktop-secondary" disabled={!links.pairCode} onClick={() => confirmReply(item.id)}>
                      {t('이 줄로 연결', 'Connect with this line', '用这行连接', 'この行で接続')}
                    </button>
                  </label>
                ) : null}
              </li>
            );
          })}
        </ul>
        {blockedKind && blockedKind !== 'same_pc' ? (
          <textarea className="desktop-bot-paste" value={connectText} readOnly rows={8} onFocus={(event) => event.currentTarget.select()} />
        ) : null}
        {error ? <p className="desktop-spec-error" role="alert">{error}</p> : null}
      </section>

      <section className="desktop-simple-card">
        <h2>{t('이 PC', 'This PC', '这台电脑', 'この PC')}</h2>
        <p>{t('같은 PC 봇은 체크인 글을 그 창에 붙이면 이름이 여기 뜹니다. 창을 끄지 마세요.', 'A bot on this PC pastes the check-in line and its name appears here. Do not close this window.', '这台电脑上的机器人贴签到文字后，名字会出现在这里。不要关掉窗口。', '同じ PC のボットはチェックイン文を貼ると名前が出ます。窓を閉じないでください。')}</p>
        <div className={`desktop-connect-row${local ? ' is-connected' : ''}`}>
          <div>
            <b>{local ? (local.display_name || local.bot_id) : t('이 PC 봇', 'This PC bot', '这台电脑的机器人', 'この PC のボット')}</b>
            <Lamp
              on={Boolean(local)}
              label={local
                ? t('연결됨', 'Connected', '已连接', '接続済み')
                : t('아직 아님', 'Not yet', '还没有', 'まだ')}
            />
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
      </section>

      {services ? (
        <section className="desktop-simple-card">
          <h2>{t('이 창의 다른 연결', 'Other links on this window', '这个窗口的其他连接', 'この窓のほかの接続')}</h2>
          <ul className="desktop-bot-list">
            <li className={services.studioReady ? 'is-connected' : ''}>
              <div className="desktop-connect-row">
              <div>
                <b>Local Studio</b>
                <Lamp
                  on={services.studioReady}
                  label={services.studioReady
                    ? t('연결됨', 'Connected', '已连接', '接続済み')
                    : t('아직 아님', 'Not yet', '还没有', 'まだ')}
                />
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
                <Lamp
                  on={services.github.authenticated}
                  label={services.github.authenticated
                    ? t(`연결됨 · ${services.github.login || 'GitHub'}`, `Connected · ${services.github.login || 'GitHub'}`, `已连接 · ${services.github.login || 'GitHub'}`, `接続済み · ${services.github.login || 'GitHub'}`)
                    : t('아직 아님', 'Not yet', '还没有', 'まだ')}
                />
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
                <b>Runner</b>
                <Lamp
                  on={services.runnerPaired}
                  label={services.runnerPaired
                    ? t(`연결됨 · ${services.runnerName || 'Runner'}`, `Connected · ${services.runnerName || 'Runner'}`, `已连接 · ${services.runnerName || 'Runner'}`, `接続済み · ${services.runnerName || 'Runner'}`)
                    : t('아직 아님', 'Not yet', '还没有', 'まだ')}
                />
              </div>
              {services.desktopApp ? (
                <div className="desktop-simple-copy-row">
                  <button type="button" className="desktop-secondary" disabled={services.busy} onClick={services.onPairRunner}>{t('Runner 페어링', 'Pair Runner', '配对 Runner', 'Runner ペアリング')}</button>
                  <button type="button" className="desktop-secondary" disabled={services.busy} onClick={services.onExportDesktopKey}>{t('데스크톱 키', 'Desktop key', '桌面密钥', 'デスクトップ鍵')}</button>
                </div>
              ) : (
                <span>{t('데스크톱 앱에서만 됩니다.', 'Only in the desktop app.', '仅桌面应用可用。', 'デスクトップアプリだけです。')}</span>
              )}
              </div>
            </li>
          </ul>
        </section>
      ) : null}

      {allowOwnFile && onOpenOwnFile ? (
        <section className="desktop-simple-card">
          <h2>{t('내가 열기', 'Open it myself', '自己打开', '自分で開く')}</h2>
          <p>{t('봇 없이 이 PC 영상을 바로 엽니다. 그러면 설정·편집·내보내기가 켜집니다.', 'Open a video on this PC with no bot. Setup, Edit, and Export then turn on.', '不用机器人，直接打开这台电脑上的视频。设置、编辑、导出就会打开。', 'ボットなしでこの PC の映像を開きます。設定・編集・書き出しが付きます。')}</p>
          <button type="button" className="desktop-secondary" onClick={onOpenOwnFile}>
            {t('영상 고르기', 'Pick a video', '选择视频', '映像を選ぶ')}
          </button>
        </section>
      ) : null}
    </div>
  );
}

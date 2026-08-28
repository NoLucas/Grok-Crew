'use client';

import { useMemo, useState } from 'react';
import { connectPaste, connectedBot, type CrewRoster } from './desktop-bot-connect';
import { BOT_ROLES, seatName, type BotRole } from './bot-skills';
import {
  type BotLinkState,
  linkedBySeat,
  markRemoteCopied,
  remoteConnectPaste,
  removeLinkedBot,
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
  onLinksChange,
  onRefresh,
  onOpenOwnFile,
}: BotPanelProps) {
  const { language, t } = useLanguage();
  const [openSeat, setOpenSeat] = useState<OtherSeat>({ kind: 'grok', role: 'planner' });
  const [familyId, setFamilyId] = useState<(typeof OTHER_FAMILIES)[number]['id']>('grok');
  const [copied, setCopied] = useState('');
  const [blockedKind, setBlockedKind] = useState('');
  const [error, setError] = useState('');
  const local = connectedBot(roster);
  const liveLink = links.bots.find((item) => item.status === 'connected');
  const connected = Boolean(local) || Boolean(liveLink);

  const connectText = useMemo(
    () => remoteConnectPaste(openSeat.kind, links.pairCode, language, openSeat.role),
    [language, links.pairCode, openSeat.kind, openSeat.role],
  );
  const localText = useMemo(() => connectPaste(language), [language]);

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
    const text = remoteConnectPaste(seat.kind, links.pairCode, language, seat.role);
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(text);
      setCopied(`${seat.kind}-${seat.role}`);
      window.setTimeout(() => setCopied(''), 4000);
    } catch {
      setBlockedKind(`${seat.kind}-${seat.role}`);
    }
    markCopied(seat);
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

  return (
    <div className="desktop-spec-desk desktop-bot-room" data-stage="compose">
      <header className="desktop-auto-lead">
        <h1>{t('연결', 'Connect', '连接', '接続')}</h1>
        <p>{t('연결 글을 복사해 봇 창에 붙이세요. 복사만으로는 연결되지 않습니다. 그 봇은 이 주소를 열 수 없습니다.', 'Copy the connect text and paste it in the bot window. Copying is not a connection. That bot cannot open this address.', '复制连接文字并贴到机器人窗口。只复制不算已连接。那个机器人打不开这个地址。', '接続文をコピーしてボットの窓に貼る。コピーしただけでは接続されない。そのボットはこの住所を開けない。')}</p>
      </header>

      <section className={`desktop-auto-connect${connected ? ' is-ready' : ''}`} aria-live="polite">
        <Lamp on={connected} label={lampText(connected, t)} />
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
              className={`desktop-auto-option${familyId === family.id ? ' is-open' : ''}${links.bots.some((item) => item.kind === family.id && item.status === 'connected') ? ' is-set' : ''}`}
              onClick={() => setFamilyId(family.id)}
            >
              <span>{t(family.ko, family.en, family.zh, family.ja)}</span>
              <b>{lampText(links.bots.some((item) => item.kind === family.id && item.status === 'connected'), t)}</b>
            </button>
          ))}
        </div>
        {links.pairCode ? <p className="desktop-spec-meta">{t(`연결 코드 ${links.pairCode}`, `Code ${links.pairCode}`, `连接代码 ${links.pairCode}`, `接続コード ${links.pairCode}`)}</p> : null}
        {OTHER_FAMILIES.filter((family) => family.id === familyId).map((family) => (
          <div key={family.id} className="desktop-bot-family">
            <h3>{t(family.ko, family.en, family.zh, family.ja)}</h3>
            <ul className="desktop-bot-list">
              {BOT_ROLES.map((role) => {
                const seat: OtherSeat = { kind: family.id, role };
                const row = linkedBySeat(links.bots, seat.kind, seat.role);
                const on = row?.status === 'connected';
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
                        <button type="button" className="desktop-secondary" onClick={() => forget(row.id)}>{t('끊기', 'Remove', '断开', '切る')}</button>
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
          </div>
        ))}
        {blockedKind && blockedKind !== 'same_pc' ? (
          <textarea className="desktop-bot-paste" value={connectText} readOnly rows={8} onFocus={(event) => event.currentTarget.select()} />
        ) : null}
        {error ? <p className="desktop-spec-error" role="alert">{error}</p> : null}
      </section>

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

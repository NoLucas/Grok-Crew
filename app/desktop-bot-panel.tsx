'use client';

import { useMemo, useState } from 'react';
import { connectPaste, connectedBot, type CrewRoster } from './desktop-bot-connect';
import {
  type BotKind,
  type BotLinkState,
  type LinkedBot,
  parseConnectReply,
  remoteConnectPaste,
  removeLinkedBot,
  upsertLinkedBot,
  writeBotLinks,
} from './desktop-bot-links';
import { useLanguage } from './language';

type BotPanelProps = {
  roster?: CrewRoster;
  links: BotLinkState;
  studioReady: boolean;
  allowOwnFile?: boolean;
  onLinksChange: (next: BotLinkState) => void;
  onRefresh: () => Promise<void>;
  onOpenOwnFile?: () => void;
};

const KINDS: Array<{ id: BotKind; place: 'this_pc' | 'other_pc'; ko: string; en: string; zh: string; ja: string }> = [
  { id: 'same_pc', place: 'this_pc', ko: '이 PC', en: 'This PC', zh: '这台电脑', ja: 'この PC' },
  { id: 'grok', place: 'other_pc', ko: '다른 PC · Grok', en: 'Other PC · Grok', zh: '另一台电脑 · Grok', ja: '別 PC · Grok' },
  { id: 'cursor', place: 'other_pc', ko: '다른 PC · Cursor', en: 'Other PC · Cursor', zh: '另一台电脑 · Cursor', ja: '別 PC · Cursor' },
  { id: 'claude', place: 'other_pc', ko: '다른 PC · Claude', en: 'Other PC · Claude', zh: '另一台电脑 · Claude', ja: '別 PC · Claude' },
  { id: 'custom', place: 'other_pc', ko: '다른 PC · 내가 만든 에이전트', en: 'Other PC · my agent', zh: '另一台电脑 · 我做的智能体', ja: '別 PC · 自分のエージェント' },
];

function kindLabel(kind: BotKind, t: (ko: string, en: string, zh: string, ja: string) => string) {
  const found = KINDS.find((item) => item.id === kind);
  return found ? t(found.ko, found.en, found.zh, found.ja) : kind;
}

export function DesktopBotPanel({
  roster,
  links,
  studioReady,
  allowOwnFile = false,
  onLinksChange,
  onRefresh,
  onOpenOwnFile,
}: BotPanelProps) {
  const { language, t } = useLanguage();
  const [kind, setKind] = useState<BotKind>('grok');
  const [copied, setCopied] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [paste, setPaste] = useState('');
  const [error, setError] = useState('');
  const local = connectedBot(roster);
  const remote = links.bots;
  const selected = KINDS.find((item) => item.id === kind) || KINDS[1];
  const copyReady = studioReady && (kind === 'same_pc' || Boolean(links.pairCode));

  const connectText = useMemo(
    () => (kind === 'same_pc' ? connectPaste(language) : remoteConnectPaste(kind, links.pairCode, language)),
    [kind, language, links.pairCode],
  );

  const markWaiting = () => {
    if (kind === 'same_pc' || !links.pairCode) return;
    const waiting: LinkedBot = {
      id: `${kind}-${links.pairCode}`,
      name: kindLabel(kind, t),
      kind,
      place: 'other_pc',
      status: 'waiting',
      pairCode: links.pairCode,
    };
    const next = upsertLinkedBot(links, waiting);
    writeBotLinks(next);
    onLinksChange(next);
  };

  const copyText = async () => {
    setError('');
    setBlocked(false);
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(connectText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 4000);
      markWaiting();
    } catch {
      setBlocked(true);
      markWaiting();
    }
    await onRefresh();
  };

  const confirmReply = () => {
    const parsed = parseConnectReply(paste, links.pairCode);
    if (!parsed) {
      setError(t('한 줄이 GROK_CREW_OK 코드 이름 이어야 합니다.', 'The line must be GROK_CREW_OK code name.', '必须是 GROK_CREW_OK 代码 名称 这一行。', 'GROK_CREW_OK コード 名前 の一行にしてください。'));
      return;
    }
    const next = upsertLinkedBot(links, {
      id: `${kind === 'same_pc' ? 'custom' : kind}-${links.pairCode}`,
      name: parsed.name,
      kind: kind === 'same_pc' ? 'custom' : kind,
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
        <h1>{t('봇과 연결', 'Connect a bot', '连接机器人', 'ボットと接続')}</h1>
        <p>{t('설정·편집·내보내기는 봇이 붙은 뒤에 켜집니다. 이 PC와 다른 PC(Grok·Cursor·직접 만든 에이전트) 연결은 전부 여기서 합니다.', 'Setup, Edit, and Export turn on after a bot is attached. Same-PC and other-PC bots (Grok, Cursor, your agent) all connect here.', '设置、编辑、导出要等机器人接上后才打开。这台电脑和另一台电脑（Grok、Cursor、自己的智能体）都在这里连接。', '設定・編集・書き出しはボットが付いてから開きます。この PC も別 PC（Grok・Cursor・自分のエージェント）もここでつなぎます。')}</p>
      </div>

      <section className="desktop-simple-card" aria-live="polite">
        <h2>{t('연결 상태', 'Connection status', '连接状态', '接続状態')}</h2>
        <ul className="desktop-bot-list">
          {local ? (
            <li>
              <div>
                <b>{local.display_name || local.bot_id}</b>
                <span>{t('이 PC · 체크인됨', 'This PC · checked in', '这台电脑 · 已签到', 'この PC · チェックイン済み')}</span>
              </div>
            </li>
          ) : null}
          {remote.map((bot) => (
            <li key={bot.id}>
              <div>
                <b>{bot.name}</b>
                <span>
                  {kindLabel(bot.kind, t)}
                  {' · '}
                  {bot.status === 'connected'
                    ? t('연결됨', 'Connected', '已连接', '接続済み')
                    : t('답 기다리는 중', 'Waiting for the reply', '等待回复', '返信待ち')}
                </span>
              </div>
              <button type="button" className="desktop-secondary" onClick={() => forget(bot.id)}>{t('끊기', 'Remove', '断开', '切る')}</button>
            </li>
          ))}
          {!local && !remote.length ? (
            <li className="is-empty">{t('아직 붙은 봇이 없습니다.', 'No bot is attached yet.', '还没有接上的机器人。', 'まだ付いているボットはありません。')}</li>
          ) : null}
        </ul>
      </section>

      <section className="desktop-simple-card">
        <h2>{t('어떻게 붙이나', 'How to attach', '怎么接上', 'どう付けるか')}</h2>
        <p>{t('이 PC 봇은 체크인 글을 그 창에 붙이면 이름이 여기 뜹니다. 다른 PC의 Grok이나 내가 만든 에이전트는 연결 글을 그 창에 붙인 뒤, 봇이 보낸 한 줄을 아래에 다시 붙입니다. 그 봇은 이 주소를 열 수 없습니다.', 'A bot on this PC pastes the check-in line and its name appears here. Grok or your agent on another PC pastes the connect line, then you paste its one-line reply below. That bot cannot open this address.', '这台电脑上的机器人贴签到文字后，名字会出现在这里。另一台电脑上的 Grok 或自己的智能体先贴连接文字，再把它们回的一行贴到下面。那个机器人打不开这个地址。', 'この PC のボットはチェックイン文を貼ると名前が出ます。別 PC の Grok や自分のエージェントは接続文を貼り、返ってきた一行を下に貼ります。そのボットはこの住所を開けません。')}</p>
        <div className="desktop-bot-kinds" role="group" aria-label={t('봇 종류', 'Bot kind', '机器人种类', 'ボットの種類')}>
          {KINDS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={item.id === kind ? 'is-selected' : ''}
              aria-pressed={item.id === kind}
              onClick={() => { setKind(item.id); setError(''); }}
            >
              {t(item.ko, item.en, item.zh, item.ja)}
            </button>
          ))}
        </div>
        {selected.place === 'other_pc' && links.pairCode ? (
          <p className="desktop-spec-meta">{t(`연결 코드 ${links.pairCode}`, `Code ${links.pairCode}`, `连接代码 ${links.pairCode}`, `接続コード ${links.pairCode}`)}</p>
        ) : null}
        <div className="desktop-simple-copy-row">
          <button type="button" className="desktop-primary" disabled={!copyReady} onClick={() => void copyText()}>
            {copied ? t('복사했습니다', 'Copied', '已复制', 'コピーしました') : t('연결 글 복사', 'Copy the connect text', '复制连接文字', '接続文をコピー')}
          </button>
        </div>
        {blocked ? <textarea className="desktop-bot-paste" value={connectText} readOnly rows={8} onFocus={(event) => event.currentTarget.select()} /> : null}
        {selected.place === 'other_pc' ? (
          <label className="desktop-spec-field desktop-spec-wide">
            <span>{t('봇이 보낸 한 줄', 'The one line the bot sent', '机器人回的一行', 'ボットが返した一行')}</span>
            <input
              value={paste}
              onChange={(event) => setPaste(event.currentTarget.value)}
              placeholder={`GROK_CREW_OK ${links.pairCode || 'CODE'} Grok`}
            />
            <button type="button" className="desktop-secondary" disabled={!links.pairCode} onClick={confirmReply}>{t('이 줄로 연결', 'Connect with this line', '用这行连接', 'この行で接続')}</button>
          </label>
        ) : (
          <p className="desktop-spec-meta">{t('이 PC면 체크인 후 이 목록에 이름이 자동으로 납니다. 창을 끄지 마세요.', 'On this PC the name appears here after check-in. Do not close this window.', '这台电脑签到后，名字会自动出现在列表里。不要关掉窗口。', 'この PC ならチェックイン後に名前が自動で出ます。窓を閉じないでください。')}</p>
        )}
        {error ? <p className="desktop-spec-error" role="alert">{error}</p> : null}
      </section>

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

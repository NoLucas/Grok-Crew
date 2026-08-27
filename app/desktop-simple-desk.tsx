'use client';

import { useMemo, useRef, useState, type DragEvent } from 'react';
import { connectPaste, connectedBot, type CrewRoster } from './desktop-bot-connect';
import { DesktopInstallHelp } from './desktop-install-help';
import { useLanguage } from './language';
import { formatCheckTime, type DeskPullStatus, type DeskWaitState } from './desktop-wait-state';

type StyleRecipe = {
  id: string;
  name?: { ko?: string; en?: string; zh?: string; ja?: string };
};

type JsonObject = Record<string, unknown>;

type SimpleDeskProps = {
  recipes?: StyleRecipe[];
  busy: boolean;
  studioReady: boolean;
  sampleAvailable: boolean;
  showAdvanced: boolean;
  roster?: CrewRoster;
  wait: DeskWaitState | null;
  lastCheckedAt: string;
  pullStatus: DeskPullStatus;
  onOpenSample: () => void;
  onOpenOwnFootage: () => void;
  onPickedFile?: (path: string) => void;
  onOpenAdvanced: () => void;
  onCopied: (wait: DeskWaitState) => void;
  onRefresh: () => Promise<void>;
  request: (path: string, init?: RequestInit) => Promise<JsonObject>;
};

const RECIPE_ORDER = ['instagram_reel', 'tiktok_tight', 'youtube_short', 'youtube_long'] as const;
const PASTE_TARGET = 'Cursor';

function localized(map: { ko?: string; en?: string; zh?: string; ja?: string } | undefined, language: string, fallback: string) {
  if (!map) return fallback;
  const key = language.slice(0, 2) as 'ko' | 'en' | 'zh' | 'ja';
  return map[key] || map.en || fallback;
}

function studioDownloadBase() {
  return typeof window !== 'undefined' && window.grokCrew?.apiBase ? window.grokCrew.apiBase : 'http://127.0.0.1:7214';
}

function droppedFilePath(file: File): string {
  const grok = typeof window !== 'undefined' ? window.grokCrew : undefined;
  if (grok?.getPathForFile) {
    try {
      const value = grok.getPathForFile(file);
      if (value) return value;
    } catch {
      /* fall through to File.path */
    }
  }
  return (file as File & { path?: string }).path || '';
}

function pullLabel(
  status: DeskPullStatus,
  t: (ko: string, en: string, zh: string, ja: string) => string,
) {
  if (status === 'arrived') return t('도착함', 'Arrived', '已到达', '到着');
  if (status === 'failed') return t('실패', 'Failed', '失败', '失敗');
  if (status === 'none') return t('아직 없음', 'Not yet', '还没有', 'まだない');
  return t('아직 없음', 'Not yet', '还没有', 'まだない');
}

export function SimpleDesk({
  recipes = [],
  busy,
  studioReady,
  sampleAvailable,
  showAdvanced,
  roster,
  wait,
  lastCheckedAt,
  pullStatus,
  onOpenSample,
  onOpenOwnFootage,
  onPickedFile,
  onOpenAdvanced,
  onCopied,
  onRefresh,
  request,
}: SimpleDeskProps) {
  const { language, t } = useLanguage();
  const [title, setTitle] = useState(wait?.title ?? '');
  const [goal, setGoal] = useState('');
  const [recipeId, setRecipeId] = useState('instagram_reel');
  const [saving, setSaving] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [clipboardBlocked, setClipboardBlocked] = useState(false);
  const [error, setError] = useState('');
  const [inviteText, setInviteText] = useState('');
  const [connectText, setConnectText] = useState('');
  const [connectCopied, setConnectCopied] = useState(false);
  const [connectBlocked, setConnectBlocked] = useState(false);
  const [ownOver, setOwnOver] = useState(false);
  const [cutOver, setCutOver] = useState(false);
  const cutInputRef = useRef<HTMLInputElement>(null);
  const bot = connectedBot(roster);

  const cards = useMemo(() => {
    const byId = new Map(recipes.map((item) => [item.id, item]));
    return RECIPE_ORDER.map((id) => byId.get(id)).filter((item): item is StyleRecipe => Boolean(item));
  }, [recipes]);

  const selected = cards.find((item) => item.id === recipeId) || cards[0];
  const locked = busy || saving || accepting || !studioReady;
  const titleEmpty = !title.trim();
  const pasteTarget = wait?.pasteTarget || PASTE_TARGET;
  const checkedClock = formatCheckTime(lastCheckedAt, language);

  const copyConnect = async () => {
    const text = connectPaste(language);
    setConnectText(text);
    setConnectBlocked(false);
    setError('');
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(text);
      setConnectCopied(true);
      window.setTimeout(() => setConnectCopied(false), 4000);
    } catch {
      setConnectBlocked(true);
    }
    await onRefresh();
  };

  const copyInvite = async () => {
    const heading = title.trim();
    if (!heading) {
      setError(t('제목을 적어 주세요.', 'Write a title first.', '请先写标题。', '先にタイトルを書いてください。'));
      return;
    }
    setSaving(true);
    setError('');
    setClipboardBlocked(false);
    try {
      const created = await request('/api/v2/edit-specs', {
        method: 'POST',
        body: JSON.stringify({
          title: heading,
          goal: goal.trim() || heading,
          recipe_id: recipeId,
          source_mode: 'bot',
          language,
          upload: false,
        }),
      });
      const record = created.edit_spec as { id?: string };
      if (!record?.id) throw new Error(t('규격을 저장하지 못했습니다.', 'Could not save the spec.', '无法保存规格。', '仕様を保存できませんでした。'));
      const invite = await request(`/api/v2/edit-specs/${record.id}/invite?lang=${encodeURIComponent(language)}`);
      const text = String(invite.text || '');
      if (!text) throw new Error(t('초대문을 만들지 못했습니다.', 'Could not make the invite.', '无法生成邀请。', '招待文を作れませんでした。'));
      setInviteText(text);
      const nextWait: DeskWaitState = {
        specId: record.id,
        title: heading,
        copiedAt: new Date().toISOString(),
        pasteTarget: PASTE_TARGET,
      };
      try {
        if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable');
        await navigator.clipboard.writeText(text);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 4000);
        onCopied(nextWait);
      } catch {
        setClipboardBlocked(true);
        onCopied(nextWait);
      }
      await onRefresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('복사하지 못했습니다.', 'Could not copy.', '无法复制。', 'コピーできませんでした。'));
    } finally {
      setSaving(false);
    }
  };

  const takeOwnFile = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setOwnOver(false);
    const file = event.dataTransfer.files?.[0];
    const path = file ? droppedFilePath(file) : '';
    if (path && onPickedFile) {
      onPickedFile(path);
      return;
    }
    onOpenOwnFootage();
  };

  const pickOwnFile = async () => {
    const picker = typeof window !== 'undefined' ? window.grokCrew?.selectMedia : undefined;
    if (!picker) {
      onOpenOwnFootage();
      return;
    }
    const picked = await picker();
    if (picked && onPickedFile) onPickedFile(picked);
    else if (picked) onOpenOwnFootage();
  };

  const acceptFinished = async (file: File | undefined) => {
    if (!file) return;
    setAccepting(true);
    setError('');
    try {
      const path = droppedFilePath(file);
      if (path) {
        await request('/api/v2/handoff/accept-drop', {
          method: 'POST',
          body: JSON.stringify({
            path,
            door: 'editor',
            edit_spec_id: wait?.specId || '',
          }),
        });
      } else if (typeof window !== 'undefined' && window.grokCrew) {
        throw new Error(t('이 창에서 놓으세요. 브라우저에서는 파일 위치를 알 수 없습니다.', 'Drop it in this window. The browser cannot see the file path.', '请放到这个窗口。浏览器看不到文件位置。', 'この窓に置いてください。ブラウザでは場所が分かりません。'));
      } else {
        const query = new URLSearchParams({ door: 'editor' });
        if (wait?.specId) query.set('edit_spec_id', wait.specId);
        const response = await fetch(`${studioDownloadBase()}/api/v2/handoff/accept-file?${query.toString()}`, {
          method: 'POST',
          headers: {
            'X-Filename': file.name,
            'Content-Type': 'application/octet-stream',
          },
          body: file,
        });
        const data = await response.json() as { error?: string };
        if (!response.ok) throw new Error(String(data.error || t('파일을 받지 못했습니다.', 'Could not take the file.', '无法接收文件。', 'ファイルを受け取れませんでした。')));
      }
      await onRefresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('파일을 받지 못했습니다.', 'Could not take the file.', '无法接收文件。', 'ファイルを受け取れませんでした。'));
    } finally {
      setAccepting(false);
      setCutOver(false);
    }
  };

  return (
    <div className="desktop-spec-desk desktop-simple-desk">
      <div className="desktop-spec-hero">
        <span>✦</span>
        <h1>{t('먼저 이 PC의 봇과 연결하세요', 'Connect a bot on this PC first', '请先连接这台电脑上的机器人', '先にこの PC のボットと接続してください')}</h1>
        <p>{t('이름이 이 창에 보이면 연결된 겁니다. 그다음 맡기거나 내가 엽니다. 다른 PC 봇은 여기 붙을 수 없습니다.', 'When the name shows here, it is connected. Then hand it off or open a file. A bot on another PC cannot attach here.', '窗口里出现名字就是已连接。然后再交给它或自己打开。另一台电脑上的机器人连不上这里。', 'この窓に名前が出れば接続です。それから任せるか自分で開く。別 PC のボットはここには付けません。')}</p>
      </div>

      {!studioReady ? (
        <p className="desktop-simple-banner" role="status">
          {t('Local Studio에 연결하는 중이면 잠시 기다리세요. 안 되면 아래 다시 시도를 누르세요.', 'If Local Studio is connecting, wait a moment. If not, retry below.', '若正在连接 Local Studio，请稍候。不行就点下面的重试。', 'Local Studio に接続中なら少し待ってください。だめなら下の再試行を押してください。')}
        </p>
      ) : null}

      <section className={`desktop-simple-connect${bot ? ' is-ready' : ''}`} aria-live="polite">
        <div>
          <b>{bot
            ? t(`연결됨 · ${bot.display_name || bot.bot_id}`, `Connected · ${bot.display_name || bot.bot_id}`, `已连接 · ${bot.display_name || bot.bot_id}`, `接続済み · ${bot.display_name || bot.bot_id}`)
            : t('아직 연결되지 않음', 'Not connected yet', '尚未连接', 'まだ接続されていない')}</b>
          <p>{bot
            ? t('이제 제목을 적고 일을 맡기거나, 영상을 직접 여세요.', 'Now write a title and hand it off, or open a video yourself.', '现在写标题交给它，或自己打开视频。', 'タイトルを書いて任せるか、映像を自分で開いてください。')
            : t('같은 PC의 Cursor·Claude·ChatGPT 창에 아래 글을 붙이세요. 체크인되면 이름이 여기 뜹니다.', 'Paste the line below in Cursor, Claude, or ChatGPT on this PC. The name appears here after check-in.', '把下面的文字贴到这台电脑的 Cursor、Claude 或 ChatGPT。签到后名字会出现在这里。', '同じ PC の Cursor・Claude・ChatGPT に下の文を貼る。チェックインすると名前が出ます。')}</p>
        </div>
        {bot ? null : (
          <button type="button" className="desktop-primary" disabled={locked} onClick={() => void copyConnect()}>
            {connectCopied
              ? t('연결 글을 복사했습니다', 'Connect text copied', '已复制连接文字', '接続文をコピーしました')
              : t('연결 글 복사', 'Copy the connect text', '复制连接文字', '接続文をコピー')}
          </button>
        )}
      </section>
      {connectBlocked ? (
        <details className="desktop-spec-advanced desktop-simple-invite" open>
          <summary>{t('연결 글 보기', 'Show the connect text', '查看连接文字', '接続文を見る')}</summary>
          <p className="desktop-spec-error">{t('아래 글을 직접 복사하세요. 클립보드를 쓰지 못했습니다.', 'Copy the text below. The clipboard was blocked.', '请手动复制下面的文字。无法使用剪贴板。', '下の文を自分でコピーしてください。クリップボードを使えませんでした。')}</p>
          <textarea value={connectText} readOnly rows={8} onFocus={(event) => event.currentTarget.select()} />
        </details>
      ) : null}

      {wait ? (
        <section className={`desktop-simple-wait is-${pullStatus === 'failed' ? 'failed' : pullStatus === 'arrived' ? 'arrived' : 'busy'}`} role="status">
          <b>{t('봇이 작업 중 · 창을 끄지 마세요', 'The bot is working · do not close this window', '机器人正在工作 · 不要关掉这个窗口', 'ボットが作業中 · この窓を閉じないでください')}</b>
          <p>{t(`복사했습니다. ${pasteTarget} 창에 붙이세요. 끝나면 이 창이 열립니다.`, `Copied. Paste it in the ${pasteTarget} window. This window opens when it is done.`, `已复制。请粘贴到 ${pasteTarget} 窗口。完成后此窗口会打开。`, `コピーしました。${pasteTarget} の窓に貼ってください。終わるとこの窓が開きます。`)}</p>
          <p>
            {t('마지막 확인', 'Last check', '上次检查', '最後の確認')}
            {' · '}
            {checkedClock || t('아직', 'soon', '稍后', 'まもなく')}
            {' · '}
            {pullLabel(pullStatus === 'idle' ? 'none' : pullStatus, t)}
          </p>
        </section>
      ) : null}

      <div className="desktop-simple-paths">
        <section className="desktop-simple-card">
          <h2>{t('맡기기', 'Hand it off', '交给它', '任せる')}</h2>
          <p>{t('제목 → 복사 → 기다림', 'Title → copy → wait', '标题 → 复制 → 等待', 'タイトル → コピー → 待ち')}</p>
          <form
            className="desktop-spec-form"
            onSubmit={(event) => {
              event.preventDefault();
              void copyInvite();
            }}
          >
            <label className="desktop-spec-field">
              <span>{t('제목', 'Title', '标题', 'タイトル')}</span>
              <input
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  if (error) setError('');
                }}
                placeholder={t('15초 훅 릴', '15s hook Reel', '15秒钩子 Reel', '15秒フックのリール')}
                aria-invalid={Boolean(error) && titleEmpty}
                disabled={saving}
              />
            </label>
            <label className="desktop-spec-field desktop-spec-wide">
              <span>{t('무엇을 말할까', 'What should it say', '要讲什么', '何を言うか')}</span>
              <textarea
                value={goal}
                onChange={(event) => setGoal(event.target.value)}
                placeholder={t('비워 두면 제목과 같습니다.', 'Leave empty to use the title.', '留空则与标题相同。', '空ならタイトルと同じ。')}
                rows={3}
                disabled={saving}
              />
            </label>

            <p className="desktop-spec-meta">
              {selected
                ? t(`${localized(selected.name, language, selected.id)} · 다른 스타일은 아래에서`, `${localized(selected.name, language, selected.id)} · more styles below`, `${localized(selected.name, language, selected.id)} · 下面可换风格`, `${localized(selected.name, language, selected.id)} · 他のスタイルは下`)
                : t('인스타 릴', 'Instagram Reel', 'Instagram Reel', 'Instagram リール')}
            </p>

            <details className="desktop-spec-advanced">
              <summary>{t('다른 스타일', 'Another style', '换风格', '他のスタイル')}</summary>
              <div className="desktop-spec-recipe-grid">
                {cards.length ? cards.map((recipe) => (
                  <button
                    key={recipe.id}
                    type="button"
                    className={recipe.id === recipeId ? 'desktop-spec-recipe is-selected' : 'desktop-spec-recipe'}
                    aria-pressed={recipe.id === recipeId}
                    onClick={() => setRecipeId(recipe.id)}
                  >
                    <b>{localized(recipe.name, language, recipe.id)}</b>
                  </button>
                )) : (
                  <p className="desktop-spec-meta">{t('스타일 목록을 아직 읽지 못했습니다.', 'Could not load styles yet.', '还没读到风格列表。', 'スタイル一覧をまだ読めません。')}</p>
                )}
              </div>
            </details>

            {!bot ? (
              <p className="desktop-spec-meta">{t('이 PC 봇이면 먼저 위에서 연결하세요. 다른 PC 봇이면 일을 복사해 그 창에 붙이고, 완성 파일만 다시 가져옵니다.', 'If the bot is on this PC, connect above first. If it is on another PC, copy the job, paste it there, and bring the finished file back.', '若机器人在这台电脑，请先在上面连接。若在另一台电脑，复制任务贴过去，再把完成文件带回来。', 'この PC のボットなら先に上で接続。別 PC なら仕事をコピーして向こうに貼り、完成ファイルだけ戻す。')}</p>
            ) : null}
            <div className="desktop-simple-copy-row">
              <button type="submit" className="desktop-primary" disabled={locked}>
                {saving
                  ? t('저장 중…', 'Saving…', '保存中…', '保存中…')
                  : copied
                    ? t('복사했습니다', 'Copied', '已复制', 'コピーしました')
                    : t('봇에게 이 말 복사', 'Copy this for the bot', '复制给机器人', 'ボットにこの文をコピー')}
              </button>
              <details className="desktop-spec-advanced desktop-simple-no-bot">
                <summary>{t('아직 봇이 없어요', 'No bot yet', '还没有机器人', 'まだボットがない')}</summary>
                <p>{t(`같은 PC면 ${PASTE_TARGET} 창에 붙이세요. 끝나면 이 창이 열립니다.`, `On this PC, paste it in the ${PASTE_TARGET} window. This window opens when it is done.`, `同一电脑请粘贴到 ${PASTE_TARGET} 窗口。完成后此窗口会打开。`, `同じ PC なら ${PASTE_TARGET} の窓に貼る。終わるとこの窓が開く。`)}</p>
                <input
                  ref={cutInputRef}
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm,.m4v,.mkv"
                  hidden
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    event.currentTarget.value = '';
                    void acceptFinished(file);
                  }}
                />
                <button
                  type="button"
                  className={cutOver ? 'desktop-simple-drop is-over' : 'desktop-simple-drop'}
                  disabled={locked}
                  onClick={() => cutInputRef.current?.click()}
                  onDragEnter={(event) => { event.preventDefault(); setCutOver(true); }}
                  onDragOver={(event) => { event.preventDefault(); setCutOver(true); }}
                  onDragLeave={() => setCutOver(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    void acceptFinished(event.dataTransfer.files?.[0]);
                  }}
                >
                  <b>{cutOver
                    ? t('여기에 놓기', 'Drop it here', '放在这里', 'ここに置く')
                    : t('완성 파일을 여기 놓기', 'Drop the finished file here', '把完成文件放这里', '完成ファイルをここに置く')}</b>
                  <span>{t('다른 PC에서 온 컷입니다. 경로는 적지 마세요.', 'A cut from another PC. Do not type a path.', '来自另一台电脑的成片。不要填写路径。', '別の PC からのカット。パスは書かない。')}</span>
                </button>
              </details>
              {!studioReady ? (
                <button type="button" className="desktop-secondary" onClick={() => void onRefresh()}>
                  {t('다시 연결', 'Reconnect', '重新连接', '再接続')}
                </button>
              ) : null}
            </div>
          </form>

          {clipboardBlocked ? (
            <details className="desktop-spec-advanced desktop-simple-invite" open>
              <summary>{t('봇이 읽을 글 보기', 'Show the text the bot reads', '查看机器人要读的文字', 'ボットが読む文を見る')}</summary>
              <p className="desktop-spec-error">{t('아래 글을 직접 복사하세요. 클립보드를 쓰지 못했습니다.', 'Copy the text below. The clipboard was blocked.', '请手动复制下面的文字。无法使用剪贴板。', '下の文を自分でコピーしてください。クリップボードを使えませんでした。')}</p>
              <textarea value={inviteText} readOnly rows={8} onFocus={(event) => event.currentTarget.select()} />
            </details>
          ) : null}
        </section>

        <section className="desktop-simple-card">
          <h2>{t('내가 열기', 'Open it myself', '自己打开', '自分で開く')}</h2>
          <p>{t('영상 놓기 → 바로 편집', 'Drop a video → edit now', '放进视频 → 立刻编辑', '映像を置く → すぐ編集')}</p>
          <button
            type="button"
            className={ownOver ? 'desktop-simple-drop is-over' : 'desktop-simple-drop'}
            disabled={locked}
            onClick={() => void pickOwnFile()}
            onDragEnter={(event) => { event.preventDefault(); setOwnOver(true); }}
            onDragOver={(event) => { event.preventDefault(); setOwnOver(true); }}
            onDragLeave={() => setOwnOver(false)}
            onDrop={takeOwnFile}
          >
            <b>{ownOver
              ? t('여기에 놓기', 'Drop it here', '放在这里', 'ここに置く')
              : t('영상을 여기 놓거나 고르기', 'Drop a video here, or pick one', '把视频放这里，或选择', '映像をここに置くか選ぶ')}</b>
            <span>{t('내 파일이면 봇 없이 타임라인이 열립니다.', 'Your file opens on the timeline. No bot.', '自己的文件会直接打开时间线。不用机器人。', '自分のファイルならボットなしでタイムラインが開く。')}</span>
          </button>
        </section>
      </div>

      <div className="desktop-empty-actions">
        {sampleAvailable ? (
          <button type="button" className="desktop-secondary" disabled={busy || !studioReady} onClick={onOpenSample}>
            {t('샘플로 화면 보기', 'See it with the sample', '用示例查看画面', 'サンプルで画面を見る')}
          </button>
        ) : null}
        {showAdvanced ? (
          <button type="button" className="desktop-secondary" onClick={onOpenAdvanced}>
            {t('더 자세히', 'More detail', '更详细', 'もっと詳しく')}
          </button>
        ) : null}
      </div>

      {error ? <p className="desktop-spec-error" role="alert">{error}</p> : null}

      <DesktopInstallHelp />
    </div>
  );
}

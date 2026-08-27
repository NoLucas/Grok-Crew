'use client';

import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import type { CrewRoster } from './desktop-bot-connect';
import {
  DEFAULT_RECIPE_ID,
  PASTE_TARGET,
  RECIPE_ORDER,
  attachedBotName,
  autoMachineState,
  autoPhaseLamps,
  canStartAuto,
  droppedFilePath,
  readAutoPrefs,
  studioDownloadBase,
  suggestRecipeId,
  writeAutoPrefs,
  type AutoLamp,
  type AutoMode,
  type AutoPhaseId,
} from './desktop-auto-desk';
import { DesktopInstallHelp } from './desktop-install-help';
import { useLanguage } from './language';
import { formatCheckTime, type DeskPullStatus, type DeskWaitState } from './desktop-wait-state';

type StyleRecipe = {
  id: string;
  name?: { ko?: string; en?: string; zh?: string; ja?: string };
};

type JsonObject = Record<string, unknown>;

type AutoDeskProps = {
  recipes?: StyleRecipe[];
  busy: boolean;
  studioReady: boolean;
  sampleAvailable: boolean;
  showAdvanced: boolean;
  roster?: CrewRoster;
  remoteNames?: string[];
  connectWaiting?: boolean;
  wait: DeskWaitState | null;
  lastCheckedAt: string;
  pullStatus: DeskPullStatus;
  previewUrl?: string;
  projectTitle?: string;
  outputReady?: boolean;
  savingFile?: boolean;
  saveFailed?: boolean;
  onOpenSample: () => void;
  onOpenOwnFootage: () => void;
  onPickedFile?: (path: string) => void;
  onOpenBots: () => void;
  onOpenAdvanced: () => void;
  onOpenEdit: () => void;
  onOpenExport: () => void;
  onSaveLocal: () => Promise<boolean>;
  onCopied: (wait: DeskWaitState) => void;
  onRefresh: () => Promise<void>;
  request: (path: string, init?: RequestInit) => Promise<JsonObject>;
};

function localized(map: { ko?: string; en?: string; zh?: string; ja?: string } | undefined, language: string, fallback: string) {
  if (!map) return fallback;
  const key = language.slice(0, 2) as 'ko' | 'en' | 'zh' | 'ja';
  return map[key] || map.en || fallback;
}

export function AutoDesk({
  recipes = [],
  busy,
  studioReady,
  sampleAvailable,
  showAdvanced,
  roster,
  remoteNames = [],
  connectWaiting = false,
  wait,
  lastCheckedAt,
  pullStatus,
  previewUrl = '',
  projectTitle = '',
  outputReady = false,
  savingFile = false,
  saveFailed = false,
  onOpenSample,
  onOpenOwnFootage,
  onPickedFile,
  onOpenBots,
  onOpenAdvanced,
  onOpenEdit,
  onOpenExport,
  onSaveLocal,
  onCopied,
  onRefresh,
  request,
}: AutoDeskProps) {
  const { language, t } = useLanguage();
  const prefs = useMemo(() => readAutoPrefs(), []);
  const [mode, setMode] = useState<AutoMode>('hand_off');
  const [title, setTitle] = useState(wait?.title ?? '');
  const [goal, setGoal] = useState('');
  const [recipeId, setRecipeId] = useState(prefs.recipeId || DEFAULT_RECIPE_ID);
  const [recipeTouched, setRecipeTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [clipboardBlocked, setClipboardBlocked] = useState(false);
  const [sendFailed, setSendFailed] = useState(false);
  const [error, setError] = useState('');
  const [inviteText, setInviteText] = useState('');
  const [ownOver, setOwnOver] = useState(false);
  const [cutOver, setCutOver] = useState(false);
  const [askPublish, setAskPublish] = useState(false);
  const cutInputRef = useRef<HTMLInputElement>(null);
  const attachedName = attachedBotName(roster, remoteNames);
  const attached = Boolean(attachedName);
  const hasProject = Boolean(previewUrl || projectTitle);
  const cards = useMemo(() => {
    const byId = new Map(recipes.map((item) => [item.id, item]));
    return RECIPE_ORDER.map((id) => byId.get(id)).filter((item): item is StyleRecipe => Boolean(item));
  }, [recipes]);
  const selected = cards.find((item) => item.id === recipeId) || cards[0];
  const locked = busy || saving || accepting || savingFile || !studioReady;
  const pasteTarget = wait?.pasteTarget || PASTE_TARGET;
  const checkedClock = formatCheckTime(lastCheckedAt, language);
  const lamps = autoPhaseLamps({
    attached,
    studioReady,
    connectWaiting,
    wait,
    pull: pullStatus,
    hasProject,
    outputReady,
    sending: saving,
    sendFailed,
    clipboardBlocked,
    saving: savingFile,
    saveFailed,
  });
  const machine = autoMachineState({
    attached,
    studioReady,
    wait,
    pull: pullStatus,
    hasProject,
    outputReady,
    sending: saving,
    saving: savingFile,
  });
  const styleLabel = selected
    ? localized(selected.name, language, selected.id)
    : t('인스타 릴', 'Instagram Reel', 'Instagram Reel', 'Instagram リール');

  useEffect(() => {
    if (recipeTouched) return;
    setRecipeId(suggestRecipeId(title, prefs.recipeId));
  }, [prefs.recipeId, recipeTouched, title]);

  const startJob = async () => {
    const check = canStartAuto({ title, attached });
    if (!check.ok) {
      setError(check.reason === 'title'
        ? t('오늘 올릴 말을 적어 주세요.', 'Write what you will post today.', '请写下今天要发的话。', '今日出す言葉を書いてください。')
        : t('먼저 연결하세요.', 'Connect first.', '请先连接。', '先に接続してください。'));
      return;
    }
    const heading = title.trim();
    setSaving(true);
    setError('');
    setSendFailed(false);
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
      writeAutoPrefs({ recipeId });
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
      setSendFailed(true);
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

  const saveLocal = async () => {
    const ok = await onSaveLocal();
    if (ok) setAskPublish(true);
  };

  const phases: { id: AutoPhaseId; label: string; note: string }[] = [
    {
      id: 'connect',
      label: t('연결', 'Connect', '连接', '接続'),
      note: !studioReady
        ? t('Local Studio가 끊겼습니다', 'Local Studio is down', 'Local Studio 已断开', 'Local Studio が切れています')
        : attached
          ? t(`됨 · ${attachedName}`, `On · ${attachedName}`, `已连接 · ${attachedName}`, `済み · ${attachedName}`)
          : connectWaiting
            ? t('답 기다림', 'Waiting for a reply', '等待回复', '返事待ち')
            : t('아직 아님', 'Not yet', '还没有', 'まだ'),
    },
    {
      id: 'sent',
      label: t('일 보냄', 'Job sent', '已发送', '仕事を送った'),
      note: sendFailed
        ? t('규격을 저장하지 못했습니다', 'Could not save the spec', '无法保存规格', '仕様を保存できませんでした')
        : wait
          ? t(`복사함 · ${pasteTarget} 창에 붙이면 됩니다`, `Copied · paste it in the ${pasteTarget} window`, `已复制 · 请贴到 ${pasteTarget} 窗口`, `コピー済み · ${pasteTarget} の窓に貼ってください`)
          : clipboardBlocked
            ? t('아래 글을 직접 복사하세요', 'Copy the text below yourself', '请手动复制下面的文字', '下の文を自分でコピー')
            : t('아직', 'Not yet', '还没有', 'まだ'),
    },
    {
      id: 'working',
      label: t('작업 중', 'Working', '工作中', '作業中'),
      note: pullStatus === 'failed'
        ? t('실패 · 다시 확인', 'Failed · check again', '失败 · 再检查', '失敗 · 再確認')
        : wait
          ? t(`마지막 확인 ${checkedClock || t('아직', 'soon', '稍后', 'まもなく')} · ${pullStatus === 'arrived' ? t('도착함', 'arrived', '已到达', '到着') : t('아직 없음', 'not yet', '还没有', 'まだない')}`, `Last check ${checkedClock || 'soon'} · ${pullStatus === 'arrived' ? 'arrived' : 'not yet'}`, `上次检查 ${checkedClock || '稍后'} · ${pullStatus === 'arrived' ? '已到达' : '还没有'}`, `最後の確認 ${checkedClock || 'まもなく'} · ${pullStatus === 'arrived' ? '到着' : 'まだない'}`)
          : t('일을 보낸 뒤 기다립니다', 'Wait after you send the job', '发送任务后等待', '仕事を送ってから待ちます'),
    },
    {
      id: 'cut',
      label: t('컷 도착', 'Cut arrived', '成片到达', 'カット到着'),
      note: hasProject || pullStatus === 'arrived'
        ? t('미리보기', 'Preview', '预览', 'プレビュー')
        : t('아직', 'Not yet', '还没有', 'まだ'),
    },
    {
      id: 'save',
      label: t('이 PC에', 'On this PC', '在这台电脑', 'この PC に'),
      note: saveFailed
        ? t('저장 실패', 'Save failed', '保存失败', '保存に失敗')
        : savingFile
          ? t('저장 중', 'Saving', '保存中', '保存中')
          : outputReady
            ? t('이 PC에 남김', 'Saved here', '已留在这台电脑', 'この PC に残した')
            : t('저장할까요?', 'Save it?', '要保存吗？', '保存しますか？'),
    },
  ];

  return (
    <div className="desktop-spec-desk desktop-auto-desk">
      <div className="desktop-spec-hero desktop-auto-hero">
        <span>✦</span>
        <h1>{t('오늘 올릴 말만 적습니다', 'Write only what you will post today', '只写今天要发的话', '今日出す言葉だけ書く')}</h1>
        <p>{t('연결은 연결 메뉴에서만 합니다. 이 화면은 보내고, 기다리고, 저장합니다.', 'Connections stay in Connect. This screen sends, waits, and saves.', '连接只在连接菜单里做。这个画面负责发送、等待和保存。', '接続は接続メニューだけです。この画面は送って、待って、保存します。')}</p>
      </div>

      {!studioReady ? (
        <p className="desktop-simple-banner" role="status">
          {t('Local Studio에 연결하는 중이면 잠시 기다리세요. 안 되면 아래 다시 시도를 누르세요.', 'If Local Studio is connecting, wait a moment. If not, retry below.', '若正在连接 Local Studio，请稍候。不行就点下面的重试。', 'Local Studio に接続中なら少し待ってください。だめなら下の再試行を押してください。')}
        </p>
      ) : null}

      <section className={`desktop-auto-status${attached ? ' is-ready' : ''}`} aria-live="polite">
        <div>
          <b className={attached ? 'desktop-connect-lamp is-on' : 'desktop-connect-lamp'}>
            <i aria-hidden="true" />
            {attached
              ? t(`연결됨 · ${attachedName}`, `Connected · ${attachedName}`, `已连接 · ${attachedName}`, `接続済み · ${attachedName}`)
              : t('먼저 연결', 'Connect first', '请先连接', '先に接続')}
          </b>
          <p>{attached
            ? t(`마지막 스타일 · ${styleLabel}`, `Last style · ${styleLabel}`, `上次风格 · ${styleLabel}`, `前回のスタイル · ${styleLabel}`)
            : t('붙이거나 끊는 것은 연결에서만 합니다. 여기에는 초록불만 둡니다.', 'Attach or remove a bot only in Connect. This screen only shows the light.', '接上或断开只在连接里做。这里只留绿灯。', '付ける・切るは接続だけです。ここには緑のランプだけ置きます。')}</p>
        </div>
        <button type="button" className="desktop-secondary" onClick={onOpenBots}>
          {t('연결 열기', 'Open Connect', '打开连接', '接続を開く')}
        </button>
      </section>

      <div className="desktop-auto-modes" role="tablist" aria-label={t('시작 방법', 'How to start', '开始方式', '始め方')}>
        <button type="button" role="tab" aria-selected={mode === 'hand_off'} className={mode === 'hand_off' ? 'is-selected' : ''} onClick={() => setMode('hand_off')}>
          {t('맡겨서 만들기', 'Hand it off', '交给它来做', '任せて作る')}
        </button>
        <button type="button" role="tab" aria-selected={mode === 'own_file'} className={mode === 'own_file' ? 'is-selected' : ''} onClick={() => setMode('own_file')}>
          {t('내 파일로 시작', 'Start with my file', '用自己的文件开始', '自分のファイルで始める')}
        </button>
      </div>

      {mode === 'own_file' ? (
        <section className="desktop-auto-own">
          <p>{t('원본이 이 PC에 있으면 봇 없이 타임라인이 열립니다.', 'If the footage is on this PC, the timeline opens without a bot.', '若原片在这台电脑，不用机器人也会打开时间线。', '原本がこの PC にあれば、ボットなしでタイムラインが開きます。')}</p>
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
            <span>{t('경로는 적지 마세요.', 'Do not type a path.', '不要填写路径。', 'パスは書かないでください。')}</span>
          </button>
        </section>
      ) : (
        <form
          className="desktop-spec-form desktop-auto-form"
          onSubmit={(event) => {
            event.preventDefault();
            void startJob();
          }}
        >
          <label className="desktop-spec-field">
            <span>{t('오늘 올릴 말', 'What you will post today', '今天要发的话', '今日出す言葉')}</span>
            <input
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                if (error) setError('');
              }}
              placeholder={t('15초 훅 릴', '15s hook Reel', '15秒钩子 Reel', '15秒フックのリール')}
              aria-invalid={Boolean(error) && !title.trim()}
              disabled={saving}
            />
          </label>
          <details className="desktop-spec-advanced">
            <summary>{t('무엇을 말할까', 'What should it say', '要讲什么', '何を言うか')}</summary>
            <textarea
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
              placeholder={t('비워 두면 제목과 같습니다.', 'Leave empty to use the title.', '留空则与标题相同。', '空ならタイトルと同じ。')}
              rows={3}
              disabled={saving}
            />
          </details>
          <p className="desktop-spec-meta">
            {t(`${styleLabel}로 보여요. 화질은 여기서 고르지 않습니다.`, `This looks like ${styleLabel}. Quality is not chosen here.`, `看起来像 ${styleLabel}。画质不在这里选。`, `${styleLabel} に見えます。画質はここでは選びません。`)}
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
                  onClick={() => {
                    setRecipeTouched(true);
                    setRecipeId(recipe.id);
                  }}
                >
                  <b>{localized(recipe.name, language, recipe.id)}</b>
                </button>
              )) : (
                <p className="desktop-spec-meta">{t('스타일 목록을 아직 읽지 못했습니다.', 'Could not load styles yet.', '还没读到风格列表。', 'スタイル一覧をまだ読めません。')}</p>
              )}
            </div>
          </details>
          {!attached ? (
            <p className="desktop-auto-gate">{t('아직 안 붙었으면 시작이 안 됩니다. 연결 열기를 누르세요. 다른 PC 봇은 일을 복사해 그 창에 붙이고, 끝난 파일만 이 창에 놓습니다.', 'Nothing is attached, so Start stays off. Open Connect. An other-PC bot gets the job as text and drops the finished file here.', '还没接上就不能开始。请打开连接。另一台电脑的机器人只收任务文字，再把完成文件放到这里。', 'まだ付いていなければ始まりません。接続を開いてください。別 PC のボットは仕事を貼り、完成ファイルだけこの窓に置きます。')}</p>
          ) : null}
          <button type="submit" className="desktop-primary" disabled={locked || !attached || !title.trim()}>
            {saving
              ? t('보내는 중…', 'Sending…', '发送中…', '送信中…')
              : copied
                ? t('복사했습니다', 'Copied', '已复制', 'コピーしました')
                : t('이걸로 시작', 'Start with this', '用这个开始', 'これで始める')}
          </button>
        </form>
      )}

      <ol className="desktop-auto-phases">
        {phases.map((phase) => (
          <li key={phase.id} className={`desktop-auto-phase is-${lamps[phase.id]}`}>
            <span className={`desktop-auto-lamp is-${lamps[phase.id]}`} aria-hidden="true" />
            <div>
              <b>{phase.label}</b>
              <p>{phase.note}</p>
            </div>
          </li>
        ))}
      </ol>

      {wait && machine === 'waiting' ? (
        <section className={`desktop-simple-wait is-${pullStatus === 'failed' ? 'failed' : 'busy'}`} role="status">
          <b>{t('봇이 작업 중 · 창을 끄지 마세요', 'The bot is working · do not close this window', '机器人正在工作 · 不要关掉这个窗口', 'ボットが作業中 · この窓を閉じないでください')}</b>
          <p>{t(`복사했습니다. ${pasteTarget} 창에 붙이세요. 끝나면 이 탭에 미리보기가 생깁니다.`, `Copied. Paste it in the ${pasteTarget} window. A preview appears in this tab when it is done.`, `已复制。请粘贴到 ${pasteTarget} 窗口。完成后预览会出现在这个标签。`, `コピーしました。${pasteTarget} の窓に貼ってください。終わるとこのタブにプレビューが出ます。`)}</p>
        </section>
      ) : null}

      {wait || machine === 'waiting' ? (
        <section className="desktop-auto-drop">
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
              : t('끝난 파일을 여기 놓기', 'Drop the finished file here', '把完成文件放这里', '終わったファイルをここに置く')}</b>
            <span>{t('다른 PC에서 온 컷입니다. 경로는 적지 마세요. 그 창은 이 주소를 열 수 없습니다.', 'A cut from another PC. Do not type a path. That window cannot open this address.', '来自另一台电脑的成片。不要填写路径。那个窗口打不开这个地址。', '別の PC からのカット。パスは書かない。あの窓はこの住所を開けません。')}</span>
          </button>
        </section>
      ) : null}

      {hasProject || pullStatus === 'arrived' ? (
        <section className="desktop-auto-preview">
          <b>{projectTitle || wait?.title || t('도착한 컷', 'Arrived cut', '已到达的成片', '届いたカット')}</b>
          {previewUrl ? (
            <video controls preload="metadata" src={previewUrl} />
          ) : (
            <p>{t('컷이 열렸습니다. 미리보기를 아직 읽지 못했습니다.', 'The cut is open. The preview has not loaded yet.', '成片已打开。预览还没读到。', 'カットは開いています。プレビューはまだ読めません。')}</p>
          )}
          <div className="desktop-auto-preview-actions">
            <button type="button" className="desktop-primary" disabled={busy || savingFile || !hasProject} onClick={() => void saveLocal()}>
              {savingFile
                ? t('저장 중…', 'Saving…', '保存中…', '保存中…')
                : outputReady
                  ? t('다시 이 PC에 저장', 'Save to this PC again', '再次保存到这台电脑', 'もう一度この PC に保存')
                  : t('이 PC에 저장', 'Save to this PC', '保存到这台电脑', 'この PC に保存')}
            </button>
            <button type="button" className="desktop-secondary" disabled={!hasProject} onClick={onOpenEdit}>
              {t('타임라인에서 손질', 'Trim on the timeline', '在时间线上修一下', 'タイムラインで整える')}
            </button>
          </div>
          {askPublish || outputReady ? (
            <div className="desktop-auto-publish-ask">
              <p>{t('파일은 이 PC에 남습니다. 올리려면 한 번 더 고릅니다. 자동은 올리지 않습니다.', 'The file stays on this PC. Posting asks once more. Auto does not post.', '文件留在这台电脑。要发布需再选一次。自动不会发布。', 'ファイルはこの PC に残ります。上げるならもう一度選びます。自動では上げません。')}</p>
              <button type="button" className="desktop-secondary" onClick={onOpenExport}>
                {t('올릴까요?', 'Post it?', '要发布吗？', '上げますか？')}
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      {clipboardBlocked ? (
        <details className="desktop-spec-advanced desktop-simple-invite" open>
          <summary>{t('봇이 읽을 글 보기', 'Show the text the bot reads', '查看机器人要读的文字', 'ボットが読む文を見る')}</summary>
          <p className="desktop-spec-error">{t('아래 글을 직접 복사하세요. 클립보드를 쓰지 못했습니다.', 'Copy the text below. The clipboard was blocked.', '请手动复制下面的文字。无法使用剪贴板。', '下の文を自分でコピーしてください。クリップボードを使えませんでした。')}</p>
          <textarea value={inviteText} readOnly rows={8} onFocus={(event) => event.currentTarget.select()} />
        </details>
      ) : null}

      <div className="desktop-empty-actions">
        {!studioReady ? (
          <button type="button" className="desktop-secondary" onClick={() => void onRefresh()}>
            {t('다시 연결', 'Reconnect', '重新连接', '再接続')}
          </button>
        ) : null}
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

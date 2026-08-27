'use client';

import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import type { CrewRoster } from './desktop-bot-connect';
import {
  DEFAULT_RECIPE_ID,
  PASTE_TARGET,
  RECIPE_ORDER,
  attachedBotName,
  autoJobPayload,
  autoSourceMode,
  autoMachineState,
  autoPhaseLamps,
  botSeenSeconds,
  canStartAuto,
  droppedFilePath,
  titleFromPrompt,
  formatElapsed,
  formatSince,
  readAutoPrefs,
  rememberRecentTitle,
  rememberSave,
  shouldAskReplaceCut,
  shouldPingCut,
  studioDownloadBase,
  suggestRecipeId,
  waitElapsedSeconds,
  writeAutoPrefs,
  ownedFileName,
  type AutoMode,
  type AutoPhaseId,
} from './desktop-auto-state';
import { withCrewInvite } from './bot-skills';
import { DesktopInstallHelp } from './desktop-install-help';
import { DesktopNewsCard } from './desktop-news-card';
import { DesktopVoiceSetup } from './desktop-voice-setup';
import { confirmVoiceChoice, type VoiceDownloadStatus, type VoiceModelId } from './desktop-voice-models';
import {
  VOICE_ACCENTS,
  VOICE_FEELS,
  VOICE_GENDERS,
  resolveVoiceAccent,
  resolveVoiceFeel,
  resolveVoiceGender,
  resolveVoicePersona,
  voiceAccentLabel,
  voiceFeelLabel,
  voiceGenderLabel,
  voicePersonaLabel,
  type VoiceAccent,
  type VoiceFeel,
  type VoiceGender,
} from './desktop-voice-personas';
import { useLanguage } from './language';
import { formatCheckTime, type DeskPullStatus, type DeskWaitState } from './desktop-wait-state';

type StyleRecipe = {
  id: string;
  name?: { ko?: string; en?: string; zh?: string; ja?: string };
  summary?: { ko?: string; en?: string; zh?: string; ja?: string };
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
  savePath?: string;
  connectedAt?: string;
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
  voiceDownload?: VoiceDownloadStatus | null;
  onChangeVoiceModel?: (id: VoiceModelId) => Promise<void> | void;
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
  savePath = '',
  connectedAt = '',
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
  voiceDownload = null,
  onChangeVoiceModel,
}: AutoDeskProps) {
  const { language, t } = useLanguage();
  const [prefs, setPrefs] = useState(() => readAutoPrefs());
  const [mode, setMode] = useState<AutoMode>('hand_off');
  const [title, setTitle] = useState(wait?.title ?? '');
  const [goal, setGoal] = useState('');
  const [useOwn, setUseOwn] = useState(false);
  const [useScrape, setUseScrape] = useState(true);
  const [ownedPaths, setOwnedPaths] = useState<string[]>([]);
  const [collectQuery, setCollectQuery] = useState('');
  const [wantCaptions, setWantCaptions] = useState(Boolean(prefs.wantCaptions));
  const [wantDubbing, setWantDubbing] = useState(Boolean(prefs.wantDubbing));
  const [wantTts, setWantTts] = useState(Boolean(prefs.wantTts));
  const [voiceModelId, setVoiceModelId] = useState<VoiceModelId>(() => confirmVoiceChoice(prefs.voiceModelId));
  const [voiceGender, setVoiceGender] = useState<VoiceGender>(() => resolveVoiceGender(prefs.voiceGender));
  const [voiceFeel, setVoiceFeel] = useState<VoiceFeel>(() => resolveVoiceFeel(prefs.voiceFeel));
  const [voiceAccent, setVoiceAccent] = useState<VoiceAccent>(() => resolveVoiceAccent(prefs.voiceAccent));
  const [voiceSaved, setVoiceSaved] = useState(Boolean(prefs.voiceSaved));
  const [engineOpen, setEngineOpen] = useState(false);
  const voicePersona = resolveVoicePersona({ gender: voiceGender, feel: voiceFeel, accent: voiceAccent });
  const [ownOver, setOwnOver] = useState(false);
  const [pickedRecipeId, setPickedRecipeId] = useState(prefs.recipeId || DEFAULT_RECIPE_ID);
  const [recipeTouched, setRecipeTouched] = useState(false);
  const recipeId = recipeTouched ? pickedRecipeId : suggestRecipeId(`${title} ${goal}`, prefs.recipeId);
  const [revisePrompt, setRevisePrompt] = useState('');
  const [saving, setSaving] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [clipboardBlocked, setClipboardBlocked] = useState(false);
  const [sendFailed, setSendFailed] = useState(false);
  const [error, setError] = useState('');
  const [inviteText, setInviteText] = useState('');
  const [cutOver, setCutOver] = useState(false);
  const [askPublish, setAskPublish] = useState(false);
  const [replaceAsk, setReplaceAsk] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const pingedSpecRef = useRef('');
  const pendingCutRef = useRef<File | null>(null);
  const cutInputRef = useRef<HTMLInputElement>(null);
  const ownInputRef = useRef<HTMLInputElement>(null);
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
  const sourceMode = autoSourceMode({ useOwn, useScrape });
  const wayLabel = sourceMode === 'own_and_collect'
    ? t('내 영상 + 공개 장면', 'My clips + public scenes', '我的影像 + 公开镜头', '自分の映像 + 公開の場面')
    : sourceMode === 'collect'
      ? t('공개 장면을 찾아옴', 'Find public scenes', '去找公开镜头', '公開の場面を探す')
      : sourceMode === 'own'
        ? t('내가 넣은 영상', 'Clips I put in', '我放进的影像', '自分が入れた映像')
        : t('화면 아직 없음', 'No pictures yet', '还没有画面', '画面はまだない');
  const startReady = canStartAuto({
    title,
    goal,
    attached,
    useOwn,
    useScrape,
    ownedPaths,
    collectQuery,
  }).ok;
  const seenSeconds = botSeenSeconds(roster, connectedAt, nowMs);
  const seenLabel = seenSeconds === null ? '' : formatSince(seenSeconds, language);
  const elapsedLabel = wait ? formatElapsed(waitElapsedSeconds(wait.copiedAt, nowMs), language) : '';
  const recentTitles = prefs.recentTitles.filter((item) => item !== title.trim());
  const waitingHandOff = mode === 'hand_off' && Boolean(wait) && machine === 'waiting';
  const showCutDrop = mode === 'hand_off' && (Boolean(wait) || machine === 'waiting');

  useEffect(() => {
    if (!waitingHandOff) return;
    const timer = window.setInterval(() => setNowMs(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, [waitingHandOff]);

  useEffect(() => {
    if (!shouldPingCut({
      pull: pullStatus,
      hidden: typeof document !== 'undefined' && document.hidden,
      specId: wait?.specId,
      lastPingedSpecId: pingedSpecRef.current,
    })) return;
    if (typeof Notification === 'undefined') return;
    const specId = String(wait?.specId || '');
    const heading = wait?.title || t('컷이 왔습니다', 'The cut is here', '成片到了', 'カットが届きました');
    const fire = () => {
      pingedSpecRef.current = specId;
      try {
        new Notification(t('Grok Crew', 'Grok Crew', 'Grok Crew', 'Grok Crew'), {
          body: t(`${heading} · 이 탭에서 저장하세요.`, `${heading} · Save it in this tab.`, `${heading} · 请在这个标签保存。`, `${heading} · このタブで保存してください。`),
        });
      } catch {
        /* permission or OS block */
      }
    };
    if (Notification.permission === 'granted') fire();
    else if (Notification.permission === 'default') {
      void Notification.requestPermission().then((permission) => {
        if (permission === 'granted') fire();
      });
    }
  }, [language, pullStatus, t, wait?.specId, wait?.title]);

  const startJob = async (again = '') => {
    const nextGoal = again.trim()
      ? t(`다시: ${again.trim()}${goal.trim() ? `\n\n${goal.trim()}` : ''}`, `Again: ${again.trim()}${goal.trim() ? `\n\n${goal.trim()}` : ''}`, `再来：${again.trim()}${goal.trim() ? `\n\n${goal.trim()}` : ''}`, `やり直し: ${again.trim()}${goal.trim() ? `\n\n${goal.trim()}` : ''}`)
      : goal;
    const check = canStartAuto({ title, goal: nextGoal, attached, useOwn, useScrape, ownedPaths, collectQuery });
    if (!check.ok) {
      setError(check.reason === 'title'
        ? t('만들고 싶은 영상을 적어 주세요. 주소여도 됩니다.', 'Write the video you want. A URL is fine.', '请写下想做的视频。地址也可以。', '作りたい映像を書いてください。住所でもよいです。')
        : check.reason === 'materials'
          ? !useOwn && !useScrape
            ? t('내 영상·사진을 넣을지, 공개 장면을 찾아올지 고르세요.', 'Choose your files, public scenes, or both.', '请选择放自己的影像，或找公开镜头，或两者。', '自分の映像を入れるか、公開の場面を探すか、両方を選んでください。')
            : useOwn && !ownedPaths.length
              ? t('영상이나 사진을 넣으세요.', 'Put in a video or an image.', '请放入视频或图片。', '映像か写真を入れてください。')
              : t('어떤 장면을 찾아올지 적어 주세요. 그걸 알아야 자를 수 있습니다.', 'Write which scenes to find. The cut needs that list.', '请写下要找的镜头。剪辑需要这份清单。', 'どの場面を探すか書いてください。それが分からないと切れません。')
        : t('먼저 연결하세요.', 'Connect first.', '请先连接。', '先に接続してください。'));
      return;
    }
    const heading = titleFromPrompt(title, nextGoal);
    setSaving(true);
    setError('');
    setSendFailed(false);
    setClipboardBlocked(false);
    try {
      const created = await request('/api/v2/edit-specs', {
        method: 'POST',
        body: JSON.stringify(autoJobPayload({
          title: heading,
          goal: nextGoal,
          recipeId,
          language,
          useOwn,
          useScrape,
          ownedPaths,
          collectQuery,
          wantCaptions,
          wantDubbing,
          wantTts,
          voiceModelId,
          voiceGender,
          voiceFeel,
          voiceAccent,
        })),
      });
      const record = created.edit_spec as { id?: string };
      if (!record?.id) throw new Error(t('규격을 저장하지 못했습니다.', 'Could not save the spec.', '无法保存规格。', '仕様を保存できませんでした。'));
      const invite = await request(`/api/v2/edit-specs/${record.id}/invite?lang=${encodeURIComponent(language)}`);
      const text = withCrewInvite(String(invite.text || ''), language, {
        captions: wantCaptions,
        dubbing: wantDubbing,
        tts: wantTts,
        voiceModelId,
        voiceGender,
        voiceFeel,
        voiceAccent,
      });
      if (!text.trim()) throw new Error(t('초대문을 만들지 못했습니다.', 'Could not make the invite.', '无法生成邀请。', '招待文を作れませんでした。'));
      setInviteText(text);
      if (again.trim()) {
        setGoal(nextGoal);
        setRevisePrompt('');
      }
      setPrefs(writeAutoPrefs({
        recipeId,
        wantCaptions,
        wantDubbing,
        wantTts,
        voiceModelId,
        voiceGender,
        voiceFeel,
        voiceAccent,
        voiceSaved: wantTts ? true : voiceSaved,
      }));
      if (wantTts) setVoiceSaved(true);
      if (wantTts && onChangeVoiceModel) void onChangeVoiceModel(confirmVoiceChoice(voiceModelId));
      setPrefs(rememberRecentTitle(heading));
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

  const addOwnedFiles = (files: FileList | File[] | null | undefined) => {
    if (!files || !files.length) return;
    const next: string[] = [];
    for (const file of Array.from(files)) {
      const path = droppedFilePath(file);
      if (!path) {
        setError(t('이 창에서 놓으세요. 브라우저에서는 파일 위치를 알 수 없습니다.', 'Drop it in this window. The browser cannot see the file path.', '请放到这个窗口。浏览器看不到文件位置。', 'この窓に置いてください。ブラウザでは場所が分かりません。'));
        return;
      }
      next.push(path);
    }
    setOwnedPaths((current) => {
      const seen = new Set(current);
      const merged = [...current];
      for (const path of next) {
        if (seen.has(path)) continue;
        seen.add(path);
        merged.push(path);
        if (merged.length >= 40) break;
      }
      return merged;
    });
    setUseOwn(true);
    if (error) setError('');
  };

  const takeMaterialFiles = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setOwnOver(false);
    addOwnedFiles(event.dataTransfer.files);
  };

  const pickMaterialFiles = async () => {
    const picker = typeof window !== 'undefined' ? window.grokCrew?.selectMedia : undefined;
    if (picker) {
      const picked = await picker();
      if (picked) {
        setOwnedPaths((current) => current.includes(picked) || current.length >= 40 ? current : [...current, picked]);
        setUseOwn(true);
        if (error) setError('');
      }
      return;
    }
    ownInputRef.current?.click();
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

  const acceptFinished = async (file: File | undefined, confirmed = false) => {
    if (!file) return;
    if (shouldAskReplaceCut(hasProject) && !confirmed) {
      pendingCutRef.current = file;
      setReplaceAsk(true);
      return;
    }
    pendingCutRef.current = null;
    setReplaceAsk(false);
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
    if (ok) {
      setPrefs(rememberSave(savePath));
      setAskPublish(true);
    }
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
      label: t('보냄', 'Sent', '已发送', '送った'),
      note: sendFailed
        ? t('일을 저장하지 못했습니다', 'Could not save the job', '无法保存任务', '仕事を保存できませんでした')
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
        ? t('실패 · 같은 말로 다시', 'Failed · send the same line again', '失败 · 再用同一句话', '失敗 · 同じ言葉でもう一度')
        : wait && pullStatus === 'arrived'
          ? t('컷이 이 탭에 있음', 'The cut is in this tab', '成片在这个标签', 'カットはこのタブにあります')
          : wait
            ? t(`${elapsedLabel ? `${elapsedLabel}째` : t('방금', 'just now', '刚刚', 'たった今')} · 이 창은 봇이 읽었는지 모름 · 마지막 확인 ${checkedClock || t('아직', 'soon', '稍后', 'まもなく')}`, `${elapsedLabel || 'just now'} · this window does not know if the bot read it · last check ${checkedClock || 'soon'}`, `${elapsedLabel || '刚刚'} · 这个窗口不知道机器人读没读 · 上次检查 ${checkedClock || '稍后'}`, `${elapsedLabel || 'たった今'} · この窓はボットが読んだか知らない · 最後の確認 ${checkedClock || 'まもなく'}`)
            : t('일을 보낸 뒤 기다립니다', 'Wait after you send the job', '发送任务后等待', '仕事を送ってから待ちます'),
    },
    {
      id: 'cut',
      label: t('영상 도착', 'Video arrived', '视频到了', '映像到着'),
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
        <h1>{t('오늘 만들 영상을 적으세요', 'Write the video you want today', '写下今天要做的视频', '今日作る映像を書いてください')}</h1>
        <p>{t('적고, 화면을 넣고, 만들기를 누르면 됩니다.', 'Write it, add pictures, then press Make.', '写下、放画面、再按开始即可。', '書いて、画面を入れて、作るを押せばよい。')}</p>
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
              ? t(`연결됨 · ${attachedName}${seenLabel ? ` · ${seenLabel}` : ''}`, `Connected · ${attachedName}${seenLabel ? ` · ${seenLabel}` : ''}`, `已连接 · ${attachedName}${seenLabel ? ` · ${seenLabel}` : ''}`, `接続済み · ${attachedName}${seenLabel ? ` · ${seenLabel}` : ''}`)
              : t('먼저 연결', 'Connect first', '请先连接', '先に接続')}
          </b>
          <p>{attached
            ? t(`마지막 스타일 · ${styleLabel}. 붙이거나 끊는 것은 연결에서만 합니다.`, `Last style · ${styleLabel}. Attach or remove a bot only in Connect.`, `上次风格 · ${styleLabel}。接上或断开只在连接里做。`, `前回のスタイル · ${styleLabel}。付ける・切るは接続だけです。`)
            : t('아직 봇이 없습니다. 먼저 연결하세요.', 'No bot yet. Connect first.', '还没有机器人。请先连接。', 'まだボットがありません。先に接続してください。')}</p>
        </div>
        <button type="button" className="desktop-secondary" onClick={onOpenBots}>
          {t('연결 열기', 'Open Connect', '打开连接', '接続を開く')}
        </button>
      </section>

      <div className="desktop-auto-modes" role="tablist" aria-label={t('시작 방법', 'How to start', '开始方式', '始め方')}>
        <button type="button" role="tab" aria-selected={mode === 'hand_off'} className={mode === 'hand_off' ? 'is-selected' : ''} onClick={() => setMode('hand_off')}>
          {t('봇에게 맡기기', 'Ask the bot', '交给机器人', 'ボットに任せる')}
        </button>
        <button type="button" role="tab" aria-selected={mode === 'own_file'} className={mode === 'own_file' ? 'is-selected' : ''} onClick={() => setMode('own_file')}>
          {t('내 영상으로 바로 열기', 'Open my video now', '马上打开我的视频', '自分の映像で開く')}
        </button>
      </div>

      {mode === 'own_file' ? (
        <section className="desktop-auto-own">
          <p>{t('이 컴퓨터에 영상이 있으면, 봇 없이 바로 잘라 볼 화면이 열립니다.', 'If the video is on this computer, the cut screen opens without a bot.', '若视频在这台电脑，不用机器人也会打开剪辑画面。', 'このパソコンに映像があれば、ボットなしで切る画面が開きます。')}</p>
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
          <section className="desktop-auto-step desktop-auto-composer">
            <label className="desktop-spec-field desktop-spec-wide">
              <span>{t('어떤 영상을 만들까요?', 'What video should we make?', '要做什么样的视频？', 'どんな映像を作りますか？')}</span>
              <textarea
                value={goal}
                onChange={(event) => {
                  setGoal(event.target.value);
                  if (error) setError('');
                }}
                placeholder={t('예: 카페 오픈 15초, 손과 간판이 먼저. 주소여도 됩니다.', 'Example: a 15s cafe open, hands and the sign first. A URL is fine.', '例如：咖啡馆开业 15 秒，手先出、再出招牌。地址也可以。', '例: カフェ開店15秒、手と看板が先。住所でもよい。')}
                rows={4}
                aria-invalid={Boolean(error) && !titleFromPrompt(title, goal)}
                disabled={saving}
              />
            </label>
            <p className="desktop-spec-meta">
              {t('하고 싶은 말만 적으면 됩니다. 주소여도 됩니다.', 'Just write what you want. A URL is fine.', '想说的话就行。地址也可以。', 'したいことだけ書けばよい。住所でもよい。')}
            </p>
            <label className="desktop-spec-field desktop-auto-name">
              <span>{t('이름', 'Name', '名字', '名前')} <em>{t('없어도 됨', 'optional', '可以不填', 'なくてもよい')}</em></span>
              <input
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  if (error) setError('');
                }}
                placeholder={t('비우면 위의 첫 줄', 'First line above if empty', '留空就用上面第一行', '空なら上の一行目')}
                disabled={saving}
              />
            </label>
            {recentTitles.length ? (
              <div className="desktop-auto-chips" aria-label={t('최근 이름', 'Recent names', '最近名字', '最近の名前')}>
                {recentTitles.map((item) => (
                  <button key={item} type="button" className="desktop-auto-chip" onClick={() => { setTitle(item); if (error) setError(''); }}>
                    {item}
                  </button>
                ))}
              </div>
            ) : null}
          </section>
          <fieldset className="desktop-spec-sources desktop-auto-step">
            <legend>{t('화면 넣기', 'Add pictures', '放入画面', '画面を入れる')}</legend>
            <p className="desktop-spec-meta">
              {t('내 파일을 넣거나, 찾고 싶은 장면을 적으세요. 둘 다 해도 됩니다.', 'Add your files, or write the scenes to find. You can do both.', '放自己的文件，或写下要找的镜头。也可以两个都做。', '自分のファイルを入れるか、探したい場面を書く。両方でもよい。')}
            </p>
            <div className="desktop-spec-source-grid">
              <button
                type="button"
                className={useOwn ? 'desktop-spec-source is-selected' : 'desktop-spec-source'}
                aria-pressed={useOwn}
                onClick={() => {
                  setUseOwn((value) => !value);
                  if (error) setError('');
                }}
              >
                <b>{t('내 영상·사진 넣기', 'Add my video or photos', '放入我的视频或照片', '自分の映像・写真を入れる')}</b>
                <span>{t('이 컴퓨터에 있는 파일을 고릅니다.', 'Pick files on this computer.', '选择这台电脑上的文件。', 'このパソコンのファイルを選ぶ。')}</span>
              </button>
              <button
                type="button"
                className={useScrape ? 'desktop-spec-source is-selected' : 'desktop-spec-source'}
                aria-pressed={useScrape}
                onClick={() => {
                  setUseScrape((value) => !value);
                  if (error) setError('');
                }}
              >
                <b>{t('장면 찾아오기', 'Find scenes', '找镜头', '場面を探す')}</b>
                <span>{t('찾고 싶은 장면을 적으면, 붙은 봇이 공개된 것만 모읍니다.', 'Write the scenes you want. The attached bot gathers public clips only.', '写下想找的镜头。接上的机器人只收集公开的。', '探したい場面を書く。付けるボットが公開のものだけ集める。')}</span>
              </button>
            </div>
            {useOwn ? (
              <section className="desktop-auto-own desktop-auto-nested">
                <input
                  ref={ownInputRef}
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm,image/png,image/jpeg,image/webp,.mp4,.mov,.webm,.m4v,.mkv,.png,.jpg,.jpeg,.webp"
                  multiple
                  hidden
                  onChange={(event) => {
                    addOwnedFiles(event.currentTarget.files);
                    event.currentTarget.value = '';
                  }}
                />
                <button
                  type="button"
                  className={ownOver ? 'desktop-simple-drop is-over' : 'desktop-simple-drop'}
                  disabled={locked}
                  onClick={() => void pickMaterialFiles()}
                  onDragEnter={(event) => { event.preventDefault(); setOwnOver(true); }}
                  onDragOver={(event) => { event.preventDefault(); setOwnOver(true); }}
                  onDragLeave={() => setOwnOver(false)}
                  onDrop={takeMaterialFiles}
                >
                  <b>{ownOver
                    ? t('여기에 놓기', 'Drop it here', '放在这里', 'ここに置く')
                    : t('여기 놓거나 눌러서 고르기', 'Drop here, or tap to pick', '放这里，或点一下选择', 'ここに置くか、押して選ぶ')}</b>
                  <span>{t('여러 장을 넣을 수 있습니다.', 'You can add more than one.', '可以放多份。', '何枚でも置けます。')}</span>
                </button>
                {ownedPaths.length ? (
                  <ul className="desktop-auto-owned-list">
                    {ownedPaths.map((path) => (
                      <li key={path}>
                        <span>{ownedFileName(path)}</span>
                        <button
                          type="button"
                          className="desktop-auto-chip"
                          onClick={() => setOwnedPaths((current) => current.filter((item) => item !== path))}
                        >
                          {t('빼기', 'Remove', '去掉', '外す')}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ) : null}
            {useScrape ? (
              <label className="desktop-spec-field desktop-spec-wide desktop-auto-nested">
                <span>{t('찾고 싶은 장면', 'Scenes to find', '要找的镜头', '探したい場面')}</span>
                <textarea
                  value={collectQuery}
                  onChange={(event) => {
                    setCollectQuery(event.target.value);
                    if (error) setError('');
                  }}
                  placeholder={t('예: 카페 오픈, 손과 간판. 비우면 위에서 적은 말로 찾습니다.', 'Example: cafe open, hands and the sign. Empty uses the words above.', '例如：咖啡馆开业、手和招牌。留空就用上面的话。', '例: カフェ開店、手と看板。空なら上の言葉で探す。')}
                  rows={2}
                  aria-invalid={Boolean(error) && !collectQuery.trim()}
                  disabled={saving}
                />
                <small className="desktop-spec-meta">
                  {t('이 프로그램은 사이트를 긁지 않습니다. 로그인해야 하는 인스타·틱톡은 적지 마세요.', 'This program does not scrape. Do not name login-walled Instagram or TikTok.', '这个程序不抓站。不要写必须登录的 Instagram 或 TikTok。', 'このプログラムは掻きません。ログインが要る Instagram や TikTok は書かない。')}
                </small>
              </label>
            ) : null}
          </fieldset>
          <fieldset className="desktop-auto-step desktop-auto-shapes">
            <legend>{t('어디에 올릴까요', 'Where will you post it?', '要发到哪里？', 'どこに上げますか')}</legend>
            <div className="desktop-auto-chips desktop-auto-shape-chips" role="radiogroup" aria-label={t('올릴 곳', 'Where to post', '发布到', '上げる先')}>
              {cards.length ? cards.map((recipe) => (
                <button
                  key={recipe.id}
                  type="button"
                  role="radio"
                  aria-checked={recipe.id === recipeId}
                  className={recipe.id === recipeId ? 'desktop-auto-chip is-selected' : 'desktop-auto-chip'}
                  onClick={() => {
                    setRecipeTouched(true);
                    setPickedRecipeId(recipe.id);
                  }}
                >
                  {localized(recipe.name, language, recipe.id)}
                </button>
              )) : (
                <p className="desktop-spec-meta">{t('모양 목록을 아직 읽지 못했습니다.', 'Could not load the shapes yet.', '还没读到样子列表。', '形の一覧をまだ読めません。')}</p>
              )}
            </div>
          </fieldset>
          <fieldset className="desktop-spec-sources desktop-auto-voice desktop-auto-step">
            <legend>{t('글자와 소리', 'Words and sound', '字和声音', '文字と音')}</legend>
            <div className="desktop-auto-switches">
              <button
                type="button"
                className={wantCaptions ? 'is-on' : ''}
                aria-pressed={wantCaptions}
                onClick={() => setWantCaptions((value) => !value)}
              >
                <b>{t('자막', 'Captions', '字幕', '字幕')}</b>
                <span>{wantCaptions ? t('켬 · 말하는 구간에 글자', 'On · words on speech', '开 · 说话处加字', 'オン · 話しているところに字') : t('끔', 'Off', '关', 'オフ')}</span>
              </button>
              <button
                type="button"
                className={wantDubbing ? 'is-on' : ''}
                aria-pressed={wantDubbing}
                onClick={() => setWantDubbing((value) => !value)}
              >
                <b>{t('내 목소리', 'My voice', '我的声音', '自分の声')}</b>
                <span>{wantDubbing ? t('켬 · 내가 넣은 소리', 'On · audio I added', '开 · 我放的声音', 'オン · 入れた音') : t('끔', 'Off', '关', 'オフ')}</span>
              </button>
              <button
                type="button"
                className={wantTts ? 'is-on' : ''}
                aria-pressed={wantTts}
                onClick={() => setWantTts((value) => !value)}
              >
                <b>{t('목소리 만들기', 'Make a voice', '做声音', '声を作る')}</b>
                <span>{wantTts ? t('켬 · 이 컴퓨터가 말함', 'On · this computer speaks', '开 · 这台电脑说话', 'オン · このパソコンが話す') : t('끔', 'Off', '关', 'オフ')}</span>
              </button>
            </div>
            {wantTts ? (
              <div className="desktop-auto-voice-pick">
                <section className="desktop-voice-persona" aria-label={t('어떤 목소리', 'Which voice', '哪种声音', 'どんな声')}>
                  <b>{t('어떤 목소리로 시작할까요', 'How should the voice start', '用哪种声音开始', 'どんな声で始めますか')}</b>
                  <p>{t('성별, 느낌, 말투를 고릅니다. 사람을 복제하지 않습니다. 마음에 들면 저장하세요. 다음에도 그 목소리입니다.', 'Pick gender, feel, and how it sounds. It does not clone a person. Save the one you like. Next time it stays.', '选性别、感觉、听起来像哪国话。不克隆人。喜欢就保存。下次还是这个。', '性別・感じ・話し方を選ぶ。人の声は複製しない。気に入ったら保存。次もその声。')}</p>
                  <div className="desktop-auto-filter">
                    <span>{t('성별', 'Gender', '性别', '性別')}</span>
                    <div className="desktop-auto-chips" role="radiogroup" aria-label={t('성별', 'Gender', '性别', '性別')}>
                      {VOICE_GENDERS.map((item) => (
                        <button
                          key={item}
                          type="button"
                          role="radio"
                          aria-checked={voiceGender === item}
                          className={voiceGender === item ? 'desktop-auto-chip is-selected' : 'desktop-auto-chip'}
                          onClick={() => { setVoiceGender(item); setVoiceSaved(false); }}
                        >
                          {voiceGenderLabel(item, language)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="desktop-auto-filter">
                    <span>{t('느낌', 'Feel', '感觉', '感じ')}</span>
                    <div className="desktop-auto-chips" role="radiogroup" aria-label={t('느낌', 'Feel', '感觉', '感じ')}>
                      {VOICE_FEELS.map((item) => (
                        <button
                          key={item}
                          type="button"
                          role="radio"
                          aria-checked={voiceFeel === item}
                          className={voiceFeel === item ? 'desktop-auto-chip is-selected' : 'desktop-auto-chip'}
                          onClick={() => { setVoiceFeel(item); setVoiceSaved(false); }}
                        >
                          {voiceFeelLabel(item, language)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="desktop-auto-filter">
                    <span>{t('말투', 'How it sounds', '听起来', '話し方')}</span>
                    <div className="desktop-auto-chips" role="radiogroup" aria-label={t('말투', 'How it sounds', '听起来', '話し方')}>
                      {VOICE_ACCENTS.map((item) => (
                        <button
                          key={item}
                          type="button"
                          role="radio"
                          aria-checked={voiceAccent === item}
                          className={voiceAccent === item ? 'desktop-auto-chip is-selected' : 'desktop-auto-chip'}
                          onClick={() => { setVoiceAccent(item); setVoiceSaved(false); }}
                        >
                          {voiceAccentLabel(item, language)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className={`desktop-voice-saved${voiceSaved ? ' is-saved' : ''}`}>
                    <p>
                      {t(
                        `지금 목소리 · ${voicePersonaLabel(voicePersona, language)}`,
                        `This voice · ${voicePersonaLabel(voicePersona, language)}`,
                        `现在的声音 · ${voicePersonaLabel(voicePersona, language)}`,
                        `今の声 · ${voicePersonaLabel(voicePersona, language)}`,
                      )}
                    </p>
                    <button
                      type="button"
                      className="desktop-primary"
                      onClick={() => {
                        setPrefs(writeAutoPrefs({
                          wantTts: true,
                          voiceGender,
                          voiceFeel,
                          voiceAccent,
                          voiceModelId,
                          voiceSaved: true,
                        }));
                        setVoiceSaved(true);
                      }}
                    >
                      {voiceSaved
                        ? t('이 목소리로 저장됨', 'Saved this voice', '已保存这个声音', 'この声で保存した')
                        : t('이 목소리로 저장', 'Save this voice', '保存这个声音', 'この声で保存')}
                    </button>
                  </div>
                  <p className="desktop-spec-meta">
                    {voiceSaved
                      ? t('이 컴퓨터에 기억했습니다. 다음에 열어도 이 목소리로 시작합니다.', 'Remembered on this computer. Next open starts with this voice.', '已记在这台电脑。下次打开还用这个声音。', 'このパソコンに覚えました。次に開いてもこの声で始まります。')
                      : t('미리듣기는 이 창에서 재생하지 않습니다. 고른 값은 저장하면 남고, 만들기를 눌러도 남습니다.', 'This window does not play a preview. Save keeps the pick. Start keeps it too.', '这个窗口不播放试听。保存会留下选择。按开始也会留下。', 'この窓では試し聞きしません。保存すれば残る。作り始めても残る。')}
                  </p>
                </section>
                {onChangeVoiceModel ? (
                  <>
                    <button type="button" className="desktop-secondary" onClick={() => setEngineOpen((value) => !value)}>
                      {engineOpen
                        ? t('엔진 접기', 'Hide engine', '收起引擎', 'エンジンを閉じる')
                        : t('고급 · 이 컴퓨터 엔진', 'Advanced · this PC’s engine', '高级 · 这台电脑的引擎', '上級 · このパソコンのエンジン')}
                    </button>
                    {engineOpen ? (
                      <DesktopVoiceSetup
                        variant="panel"
                        selected={voiceModelId}
                        studioReady={studioReady}
                        download={voiceDownload}
                        onSelect={setVoiceModelId}
                        onConfirm={() => {
                          const next = confirmVoiceChoice(voiceModelId);
                          setVoiceModelId(next);
                          setPrefs(writeAutoPrefs({ wantTts: true, voiceModelId: next, voiceGender, voiceFeel, voiceAccent, voiceSaved }));
                          void onChangeVoiceModel(next);
                        }}
                      />
                    ) : null}
                  </>
                ) : null}
              </div>
            ) : null}
          </fieldset>
          {attached && titleFromPrompt(title, goal) ? (
            <section className="desktop-auto-card" aria-label={t('이렇게 만듭니다', 'This is what we will make', '就这样做', 'こう作ります')}>
              <b>{t('이렇게 만듭니다', 'This is what we will make', '就这样做', 'こう作ります')}</b>
              <p>{`${attachedName} · ${styleLabel} · ${wayLabel}`}</p>
              <p>{t(`자막 ${wantCaptions ? '켬' : '끔'} · 내 목소리 ${wantDubbing ? '켬' : '끔'} · 목소리 만들기 ${wantTts ? `켬 · ${voicePersonaLabel(voicePersona, language)}` : '끔'}`, `Captions ${wantCaptions ? 'on' : 'off'} · My voice ${wantDubbing ? 'on' : 'off'} · Make a voice ${wantTts ? `on · ${voicePersonaLabel(voicePersona, language)}` : 'off'}`, `字幕${wantCaptions ? '开' : '关'} · 我的声音${wantDubbing ? '开' : '关'} · 做声音 ${wantTts ? `开 · ${voicePersonaLabel(voicePersona, language)}` : '关'}`, `字幕${wantCaptions ? 'オン' : 'オフ'} · 自分の声${wantDubbing ? 'オン' : 'オフ'} · 声を作る ${wantTts ? `オン · ${voicePersonaLabel(voicePersona, language)}` : 'オフ'}`)}</p>
              {useOwn && ownedPaths.length ? <p>{ownedPaths.map(ownedFileName).join(', ')}</p> : null}
              {useScrape && collectQuery.trim() ? <p>{t(`찾아올 장면 · ${collectQuery.trim()}`, `Scenes · ${collectQuery.trim()}`, `要找的镜头 · ${collectQuery.trim()}`, `探す場面 · ${collectQuery.trim()}`)}</p> : null}
              <p>{t('하지 않음: 올리지 않음 · 화질은 그대로 · 이 컴퓨터에만 저장 · 이 프로그램이 사이트를 긁지 않음', 'Will not: post · change quality · leave this computer · scrape a site', '不会：发布 · 改画质 · 离开这台电脑 · 抓站', 'しないこと: 上げない · 画質はそのまま · このパソコンだけに保存 · このプログラムは掻かない')}</p>
            </section>
          ) : null}
          {!attached ? (
            <p className="desktop-auto-gate">{t('봇을 먼저 연결해야 만들 수 있습니다. 연결 열기를 누르세요.', 'Connect a bot first, then you can make it. Open Connect.', '请先连接机器人，才能开始做。请打开连接。', '先にボットを接続すると作れます。接続を開いてください。')}</p>
          ) : null}
          <button type="submit" className="desktop-primary" disabled={locked || !startReady}>
            {saving
              ? t('보내는 중…', 'Sending…', '发送中…', '送信中…')
              : copied
                ? t('복사했습니다', 'Copied', '已复制', 'コピーしました')
                : t('이걸로 만들기', 'Make this', '用这个做', 'これで作る')}
          </button>
        </form>
      )}

      {mode === 'hand_off' && wait ? (
        <section className="desktop-auto-card" aria-live="polite">
          <b>{t('아까 적은 말', 'What you asked', '刚才写的话', 'さっき書いた言葉')}</b>
          <p>{wait.title || title}</p>
          <p>{attached
            ? `${attachedName}${seenLabel ? ` · ${seenLabel}` : ''} · ${pullStatus === 'arrived' || hasProject
              ? t('컷이 와 있음', 'the cut is here', '成片已到', 'カット到着')
              : t(`아직 없음 · ${elapsedLabel || t('방금', 'just now', '刚刚', 'たった今')}째`, `not yet · ${elapsedLabel || 'just now'}`, `还没有 · ${elapsedLabel || '刚刚'}`, `まだない · ${elapsedLabel || 'たった今'}`)}`
            : t('연결이 끊겼습니다. 연결 열기를 누르세요.', 'The bot is gone. Open Connect.', '连接断了。请打开连接。', '接続が切れています。接続を開いてください。')}</p>
          <p>{t('안 누르면 이 탭에 미리보기만 남습니다. 올리지는 않습니다. 이 창은 봇이 읽었는지 모릅니다.', 'If you do nothing, only the preview stays in this tab. It does not post. This window does not know if the bot read it.', '不点的话只有预览留在这个标签。不会发布。这个窗口不知道机器人读没读。', '押さなければこのタブにプレビューだけ残ります。上げません。この窓はボットが読んだか知りません。')}</p>
        </section>
      ) : null}

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

      {waitingHandOff ? (
        <section className={`desktop-simple-wait is-${pullStatus === 'failed' ? 'failed' : 'busy'}`} role="status">
          <b>{t('봇이 작업 중 · 창을 끄지 마세요', 'The bot is working · do not close this window', '机器人正在工作 · 不要关掉这个窗口', 'ボットが作業中 · この窓を閉じないでください')}</b>
          <p>{t(`복사했습니다. 먼저 ${pasteTarget} 창에 붙이세요. 끝나면 이 탭에 미리보기가 생깁니다.`, `Copied. Paste it in the ${pasteTarget} window first. A preview appears in this tab when it is done.`, `已复制。先贴到 ${pasteTarget} 窗口。完成后预览会出现在这个标签。`, `コピーしました。まず ${pasteTarget} の窓に貼ってください。終わるとこのタブにプレビューが出ます。`)}</p>
        </section>
      ) : null}

      {showCutDrop ? (
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

      {replaceAsk ? (
        <section className="desktop-auto-card" role="dialog" aria-label={t('덮을까요', 'Replace the cut', '要替换吗', '置き換えますか')}>
          <b>{t('이미 컷이 있습니다', 'A cut is already here', '已经有成片了', 'すでにカットがあります')}</b>
          <p>{t('지금 놓은 파일로 바꿀까요? 자동으로 덮지 않습니다.', 'Replace it with the file you just dropped? Auto will not overwrite by itself.', '要用刚放的文件替换吗？自动不会自己覆盖。', '今置いたファイルに換えますか。自動では上書きしません。')}</p>
          <div className="desktop-auto-preview-actions">
            <button type="button" className="desktop-primary" onClick={() => void acceptFinished(pendingCutRef.current || undefined, true)}>
              {t('이 파일로 바꾸기', 'Replace with this file', '换成这个文件', 'このファイルに換える')}
            </button>
            <button type="button" className="desktop-secondary" onClick={() => { pendingCutRef.current = null; setReplaceAsk(false); }}>
              {t('그대로 두기', 'Keep the current cut', '留着现在的', '今のまま')}
            </button>
          </div>
        </section>
      ) : null}

      {waitingHandOff && !hasProject && pullStatus !== 'arrived' ? (
        <section className="desktop-auto-empty" aria-live="polite">
          <b>{t('컷이 오면 여기', 'The cut will land here', '成片会到这里', 'カットが来たらここ')}</b>
          <p>{t('지금은 비어 있습니다. 기다리는 중입니다. 로딩 실패가 아닙니다.', 'It is empty because we are still waiting. This is not a failed load.', '现在是空的，因为还在等。不是加载失败。', '待っているので空です。読み込み失敗ではありません。')}</p>
        </section>
      ) : null}

      {hasProject || pullStatus === 'arrived' ? (
        <section className="desktop-auto-preview">
          <b>{projectTitle || wait?.title || t('도착한 컷', 'Arrived cut', '已到达的成片', '届いたカット')}</b>
          <p className="desktop-auto-preview-note">
            {outputReady
              ? t('이 PC에 두었음. 자동은 올리지 않았습니다.', 'Saved on this PC. Auto did not post it.', '已留在这台电脑。自动没有发布。', 'この PC に残しました。自動では上げていません。')
              : t('첫 컷 · 더 올 수도 있음. 저장은 지금 해도 됩니다.', 'First cut · another may still arrive. You can save now.', '第一份成片 · 可能还会来。现在就可以保存。', '最初のカット · まだ来ることもあります。今保存してよい。')}
          </p>
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
            <section className="desktop-auto-card desktop-auto-save-card">
              <b>{t('이 PC에 두었음', 'Saved on this PC', '已留在这台电脑', 'この PC に残した')}</b>
              <p>{t(`폴더 · ${savePath || prefs.lastSavePath || t('출력 폴더', 'output folder', '输出文件夹', '出力フォルダ')}`, `Folder · ${savePath || prefs.lastSavePath || 'output folder'}`, `文件夹 · ${savePath || prefs.lastSavePath || '输出文件夹'}`, `フォルダ · ${savePath || prefs.lastSavePath || '出力フォルダ'}`)}</p>
              {wait && elapsedLabel ? <p>{t(`시작에서 지금까지 · ${elapsedLabel}`, `Since start · ${elapsedLabel}`, `从开始到现在 · ${elapsedLabel}`, `開始から今まで · ${elapsedLabel}`)}</p> : null}
              <p>{t('올리려면 한 번 더 고릅니다. 자동은 올리지 않습니다.', 'Posting asks once more. Auto does not post.', '要发布需再选一次。自动不会发布。', '上げるならもう一度選びます。自動では上げません。')}</p>
              <div className="desktop-auto-preview-actions">
                <button type="button" className="desktop-secondary" onClick={onOpenExport}>
                  {t('올릴까요?', 'Post it?', '要发布吗？', '上げますか？')}
                </button>
                <button type="button" className="desktop-secondary" onClick={() => { setTitle(''); setAskPublish(false); setGoal(''); setRevisePrompt(''); }}>
                  {t('다른 제목', 'Another title', '换个标题', '別のタイトル')}
                </button>
              </div>
            </section>
          ) : null}
          <section className="desktop-auto-card" aria-label={t('마음에 안 들면 다시', 'If you do not like it, say it again', '不满意就再说', '気に入らなければもう一度')}>
            <b>{t('마음에 안 들면 다시 말하기', 'If you do not like it, say it again', '不满意就再说一遍', '気に入らなければもう一度言う')}</b>
            <p>{t('넣고 싶은 장면이나 고칠 점만 적으면 다시 자릅니다.', 'Write the scene you want or what to fix, and it will cut again.', '写下想加的镜头或要改的地方，就会再剪。', '入れたい場面や直したい点だけ書けば、もう一度切ります。')}</p>
            <label className="desktop-spec-field desktop-spec-wide">
              <span>{t('고칠 점', 'What to change', '要改的', '直したい点')}</span>
              <textarea
                value={revisePrompt}
                onChange={(event) => setRevisePrompt(event.target.value)}
                placeholder={t('예: 간판 클로즈업을 두 번, 손 장면은 빼 주세요.', 'Example: two sign close-ups, drop the hands.', '例如：招牌特写两次，不要手的镜头。', '例: 看板クローズアップを二回、手の場面は外す。')}
                rows={3}
                disabled={saving}
              />
            </label>
            <button
              type="button"
              className="desktop-primary"
              disabled={locked || !revisePrompt.trim() || !attached}
              onClick={() => void startJob(revisePrompt)}
            >
              {saving
                ? t('보내는 중…', 'Sending…', '发送中…', '送信中…')
                : t('이 말로 다시 만들기', 'Make it again with this', '用这句话再做', 'この言葉でもう一度作る')}
            </button>
          </section>
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
      {sendFailed || pullStatus === 'failed' || saveFailed ? (
        <button type="button" className="desktop-secondary" disabled={locked || !startReady} onClick={() => void startJob()}>
          {t('같은 말로 다시', 'Send the same line again', '再用同一句话', '同じ言葉でもう一度')}
        </button>
      ) : null}

      <DesktopNewsCard />
      <DesktopInstallHelp />
    </div>
  );
}

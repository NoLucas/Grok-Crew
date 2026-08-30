'use client';

import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import type { CrewRoster } from './desktop-bot-connect';
import { confirmedGrokRoles, hasConnectedBot, hasWaitingCopiedSeat, writeLastConnectBundle, type BotLinkState } from './desktop-bot-links';
import {
  DEFAULT_RECIPE_ID,
  RECIPE_ORDER,
  alwaysCrewSeats,
  attachedBotName,
  autoJobPayload,
  autoSourceMode,
  autoDeskStage,
  autoMachineState,
  autoPhaseLamps,
  autoWaitHeadline,
  autoWorkingNote,
  pasteTargetForSeats,
  samePcInviteReady,
  type AutoOptionPane,
  type BotActivityItem,
  canStartAuto,
  droppedFilePath,
  isAbsoluteOwnedPath,
  localFilePreviewUrl,
  ownedMediaKind,
  ownedFileExtension,
  resolveOwnedPaths,
  shortOwnedFileName,
  titleFromPrompt,
  writeAnotherComposeReset,
  formatElapsed,
  readAutoPrefs,
  rememberRecentTitle,
  rememberSave,
  shouldAskReplaceCut,
  shouldPingCut,
  studioDownloadBase,
  suggestRecipeId,
  recipeFallbackLabel,
  waitElapsedSeconds,
  writeAutoPrefs,
  ownedFileName,
  type AutoMode,
  type AutoPhaseId,
} from './desktop-auto-state';
import { DesktopCrewBoard } from './desktop-crew-board';
import { activityForSpec, crewStagePipeline, crewStageShortLabel, type CrewLoadState } from './desktop-crew-log';
import { withCrewInvite } from './bot-skills';
import { CREW_MARKETS, marketFromLanguage, marketLabel, resolveCrewMarket, type CrewMarket } from './crew-market';
import { DesktopNewsCard } from './desktop-news-card';
import { confirmVoiceChoice, resolveVoiceAccentForModel, voiceAccentsForModel, voiceModelLabel, type VoiceModelId } from './desktop-voice-models';
import {
  VOICE_FEELS,
  VOICE_GENDERS,
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
import { playVoicePreview, stopVoicePreview, voicePreviewPhrase } from './desktop-voice-preview';
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
  links?: BotLinkState;
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
  onWriteAnother?: () => void;
  pendingReviseNote?: string;
  onPendingReviseConsumed?: () => void;
  projectSourcePath?: string;
  request: (path: string, init?: RequestInit) => Promise<JsonObject>;
};

export function AutoDesk({
  recipes = [],
  busy,
  studioReady,
  sampleAvailable,
  showAdvanced,
  roster,
  remoteNames = [],
  links,
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
  onWriteAnother,
  pendingReviseNote = '',
  onPendingReviseConsumed,
  projectSourcePath = '',
  request,
}: AutoDeskProps) {
  const { language, t } = useLanguage();
  const [prefs, setPrefs] = useState(() => readAutoPrefs());
  const [mode, setMode] = useState<AutoMode>('hand_off');
  const [stayOnCompose, setStayOnCompose] = useState(false);
  const [optionPane, setOptionPane] = useState<AutoOptionPane>('');
  const [nameOpen, setNameOpen] = useState(false);
  const [ownOpen, setOwnOpen] = useState(false);
  const [title, setTitle] = useState(wait?.title ?? '');
  const [goal, setGoal] = useState('');
  const [useOwn, setUseOwn] = useState(false);
  const [useScrape, setUseScrape] = useState(false);
  const [ownedPaths, setOwnedPaths] = useState<string[]>([]);
  const [collectQuery, setCollectQuery] = useState('');
  const [wantCaptions, setWantCaptions] = useState(Boolean(prefs.wantCaptions));
  const [wantTts, setWantTts] = useState(Boolean(prefs.wantTts));
  const voiceModelId = confirmVoiceChoice(prefs.voiceModelId);
  const allowedAccents = voiceAccentsForModel(voiceModelId);
  const [voiceGender, setVoiceGender] = useState<VoiceGender>(() => resolveVoiceGender(prefs.voiceGender));
  const [voiceFeel, setVoiceFeel] = useState<VoiceFeel>(() => resolveVoiceFeel(prefs.voiceFeel));
  const [voiceAccent, setVoiceAccent] = useState<VoiceAccent>(() => (
    resolveVoiceAccentForModel(prefs.voiceAccent, prefs.voiceModelId, language)
  ));
  const [voiceSaved, setVoiceSaved] = useState(Boolean(prefs.voiceSaved));
  const [voicePreview, setVoicePreview] = useState<'idle' | 'loading' | 'playing' | 'blocked' | 'missing'>('idle');
  const [pickedMarket, setPickedMarket] = useState<CrewMarket | null>(() => (
    prefs.marketTouched ? resolveCrewMarket(prefs.market, language) : null
  ));
  const market = pickedMarket ?? marketFromLanguage(language);
  const marketTouched = pickedMarket !== null;
  const [marketNeedsRecopy, setMarketNeedsRecopy] = useState(false);
  const voicePersona = resolveVoicePersona({
    gender: voiceGender,
    feel: voiceFeel,
    accent: voiceAccent,
    allowedAccents,
  });
  const [ownOver, setOwnOver] = useState(false);
  const [composerOver, setComposerOver] = useState(false);
  const [filePreviews, setFilePreviews] = useState<Record<string, string>>({});
  const [pickedRecipeId, setPickedRecipeId] = useState(prefs.recipeId || DEFAULT_RECIPE_ID);
  const [recipeTouched, setRecipeTouched] = useState(false);
  const recipeId = recipeTouched ? pickedRecipeId : suggestRecipeId(`${title} ${goal}`, prefs.recipeId);
  const [saving, setSaving] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [clipboardBlocked, setClipboardBlocked] = useState(false);
  const [sendFailed, setSendFailed] = useState(false);
  const [error, setError] = useState('');
  const [inviteText, setInviteText] = useState(() => String(wait?.inviteText || ''));
  const [cutOver, setCutOver] = useState(false);
  const [askPublish, setAskPublish] = useState(false);
  const [replaceAsk, setReplaceAsk] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [activity, setActivity] = useState<BotActivityItem[]>([]);
  const [activityState, setActivityState] = useState<CrewLoadState>('loading');
  const [watchSpecId, setWatchSpecId] = useState('');
  const pingedSpecRef = useRef('');
  const pendingCutRef = useRef<File | null>(null);
  const cutInputRef = useRef<HTMLInputElement>(null);
  const ownInputRef = useRef<HTMLInputElement>(null);
  const attachedName = attachedBotName(roster, remoteNames, links, language);
  const attached = Boolean(attachedName) || hasConnectedBot(roster, links);
  const startReady = attached || hasWaitingCopiedSeat(links) || confirmedGrokRoles(links).length > 0;
  const hasProject = Boolean(previewUrl || projectTitle);
  const cards = useMemo(() => {
    const byId = new Map(recipes.map((item) => [item.id, item]));
    return RECIPE_ORDER.map((id) => byId.get(id)).filter((item): item is StyleRecipe => Boolean(item));
  }, [recipes]);
  const selected = cards.find((item) => item.id === recipeId) || cards[0];
  const locked = busy || saving || accepting || savingFile || !studioReady;
  const formLocked = saving || accepting || !studioReady;
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
  const styleLabel = recipeFallbackLabel(selected?.id || recipeId, language);
  const sourceMode = autoSourceMode({ useOwn, useScrape });
  const wayLabel = sourceMode === 'own_and_collect'
    ? t('내 영상 + 파일 주소', 'My clips + file URLs', '我的影像 + 文件地址', '自分の映像 + ファイル住所')
      : sourceMode === 'collect'
      ? t('공개 파일 주소', 'Public file URLs', '公开文件地址', '公開ファイルの住所')
      : sourceMode === 'own'
        ? t('내가 넣은 영상', 'Clips I put in', '我放进的影像', '自分が入れた映像')
        : t('원하는 파일이나 주소를 넣어주세요', 'Add the file or address you want', '请放入想要的文件或地址', '使いたいファイルか住所を入れてください');
  const elapsedLabel = wait ? formatElapsed(waitElapsedSeconds(wait.copiedAt, nowMs), language) : '';
  const scopedActivity = activityForSpec(activity, wait?.specId);
  const seatRows = alwaysCrewSeats({
    roster,
    links,
    language,
    lastCheckedLabel: formatCheckTime(lastCheckedAt, language),
    activity: scopedActivity,
  });
  const stageRows = crewStagePipeline(seatRows, scopedActivity, language);
  const waitHeadline = autoWaitHeadline(seatRows, language);
  const pasteTarget = pasteTargetForSeats(seatRows, language) || wait?.pasteTarget || '';
  const samePcPull = samePcInviteReady(seatRows, roster, links);
  const recentTitles = prefs.recentTitles.filter((item) => item !== title.trim());
  const waitingHandOff = mode === 'hand_off' && Boolean(wait) && machine === 'waiting';
  const jobStage = autoDeskStage({
    wait,
    pull: pullStatus,
    hasProject,
    stayOnCompose: stayOnCompose || mode === 'own_file',
    watchSpecId,
  });
  const showComposer = jobStage === 'compose';
  const showWaiting = jobStage === 'waiting';
  const showArrived = jobStage === 'arrived';
  const showJobRun = showWaiting || showArrived;
  const showCutDrop = mode === 'hand_off' && showJobRun;
  const showCrewBoard = showJobRun;
  const soundLabel = wantTts
    ? t(`만듦 · ${voicePersonaLabel(voicePersona, language)}`, `Made · ${voicePersonaLabel(voicePersona, language)}`, `做了 · ${voicePersonaLabel(voicePersona, language)}`, `作った · ${voicePersonaLabel(voicePersona, language)}`)
    : t('끔', 'Off', '关', 'オフ');
  const hearVoice = (next?: { gender?: VoiceGender; feel?: VoiceFeel; accent?: VoiceAccent }) => {
    const gender = next?.gender ?? voiceGender;
    const feel = next?.feel ?? voiceFeel;
    const accent = next?.accent ?? voiceAccent;
    setVoicePreview('loading');
    void playVoicePreview(
      { accent, gender, feel, modelId: voiceModelId },
      { request, studioOrigin: studioDownloadBase() },
    ).then((result) => {
      setVoicePreview(result);
      if (result === 'playing') {
        window.setTimeout(() => setVoicePreview((current) => (current === 'playing' ? 'idle' : current)), 8000);
      }
    });
  };

  const toggleCaptions = () => {
    setWantCaptions((value) => {
      const next = !value;
      setPrefs(writeAutoPrefs({ wantCaptions: next }));
      return next;
    });
  };
  const togglePane = (pane: Exclude<AutoOptionPane, ''>) => {
    setOptionPane((current) => (current === pane ? '' : pane));
  };
  const marketName = marketLabel(market, language);

  useEffect(() => {
    const stored = String(wait?.inviteText || '').trim();
    if (!stored) return;
    setInviteText((current) => (current.trim() ? current : stored));
  }, [wait?.inviteText]);

  useEffect(() => () => stopVoicePreview(), []);

  useEffect(() => {
    const next = resolveVoiceAccentForModel(voiceAccent, voiceModelId, language);
    if (next === voiceAccent) return;
    setVoiceAccent(next);
    setVoiceSaved(false);
    setPrefs(writeAutoPrefs({ voiceAccent: next, voiceModelId }));
  }, [voiceAccent, voiceModelId, language]);

  useEffect(() => {
    if (!waitingHandOff) return;
    const timer = window.setInterval(() => setNowMs(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, [waitingHandOff]);

  useEffect(() => {
    if (!showCrewBoard) return undefined;
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
  }, [request, showCrewBoard]);

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
    const reviseFromProject = Boolean(again.trim() && projectSourcePath && !useOwn && !useScrape);
    const readyUseOwn = useOwn || reviseFromProject;
    const readyOwned = reviseFromProject ? [projectSourcePath] : ownedPaths;
    const check = canStartAuto({
      title: title || projectTitle,
      goal: nextGoal,
      attached: startReady,
      useOwn: readyUseOwn,
      useScrape,
      ownedPaths: readyOwned,
      collectQuery,
    });
    if (!check.ok) {
      if (check.reason === 'materials') setOptionPane('pictures');
      setStayOnCompose(true);
      setError(check.reason === 'title'
        ? t('만들고 싶은 영상을 적어 주세요. 주소여도 됩니다.', 'Write the video you want. A URL is fine.', '请写下想做的视频。网址也可以。', '作りたい映像を書いてください。URL でもよいです。')
        : check.reason === 'materials'
          ? readyUseOwn && !readyOwned.length
            ? t('영상이나 사진을 넣으세요.', 'Put in a video or an image.', '请放入视频或图片。', '映像か写真を入れてください。')
            : t('한 줄에 공개 파일 주소 하나만 적으세요. http로 시작하는 직접 주소여야 합니다.', 'Write one public file URL per line. It must be a direct http address.', '每行只写一个公开文件地址。必须是以 http 开头的直接地址。', '一行に公開ファイルの住所一つ。http で始まる直接の住所にしてください。')
        : t('연결에서 붙일 글을 먼저 복사하세요.', 'Copy the connect text first.', '请先复制连接文字。', '先に接続文をコピーしてください。'));
      return;
    }
    const heading = titleFromPrompt(title || projectTitle, nextGoal);
    setSaving(true);
    setError('');
    setSendFailed(false);
    setClipboardBlocked(false);
    try {
      let resolvedOwned = readyOwned;
      if (readyUseOwn && readyOwned.some((path) => !isAbsoluteOwnedPath(path))) {
        try {
          const health = await request('/health');
          const workspace = typeof health.workspace === 'string' ? health.workspace : '';
          resolvedOwned = resolveOwnedPaths(readyOwned, workspace);
        } catch {
          /* sidecar also resolves inputs/<name> against the workspace */
        }
      }
      const created = await request('/api/v2/edit-specs', {
        method: 'POST',
        body: JSON.stringify(autoJobPayload({
          title: heading,
          goal: nextGoal,
          recipeId,
          language,
          useOwn: readyUseOwn,
          useScrape,
          ownedPaths: resolvedOwned,
          collectQuery,
          wantCaptions,
          wantDubbing: false,
          wantTts,
          voiceModelId,
          voiceGender,
          voiceFeel,
          voiceAccent,
        })),
      });
      const record = created.edit_spec as { id?: string };
      if (!record?.id) throw new Error(t('규격을 저장하지 못했습니다.', 'Could not save the spec.', '无法保存规格。', '仕様を保存できませんでした。'));
      setWatchSpecId(record.id);
      const invite = await request(`/api/v2/edit-specs/${record.id}/invite?lang=${encodeURIComponent(language)}`);
      const text = withCrewInvite(String(invite.text || ''), language, {
        captions: wantCaptions,
        dubbing: false,
        tts: wantTts,
        voiceModelId,
        voiceGender,
        voiceFeel,
        voiceAccent,
      }, market, record.id);
      if (!text.trim()) throw new Error(t('초대문을 만들지 못했습니다.', 'Could not make the invite.', '无法生成邀请。', '招待文を作れませんでした。'));
      setInviteText(text);
      setStayOnCompose(false);
      setOptionPane('');
      if (again.trim()) {
        setGoal(nextGoal);
      }
      setPrefs(writeAutoPrefs({
        recipeId,
        wantCaptions,
        wantDubbing: false,
        wantTts,
        voiceModelId,
        voiceGender,
        voiceFeel,
        voiceAccent,
        voiceSaved: wantTts ? true : voiceSaved,
        market,
        marketTouched,
      }));
      if (wantTts) setVoiceSaved(true);
      setMarketNeedsRecopy(false);
      writeLastConnectBundle({ market, recipeId, language });
      setPrefs(rememberRecentTitle(heading));
      const nextWait: DeskWaitState = {
        specId: record.id,
        title: heading,
        copiedAt: new Date().toISOString(),
        pasteTarget,
        inviteText: text,
      };
      try {
        if (samePcInviteReady(seatRows, roster, links)) {
          setClipboardBlocked(false);
          onCopied(nextWait);
        } else {
          if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable');
          await navigator.clipboard.writeText(text);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 4000);
          onCopied(nextWait);
        }
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

  useEffect(() => {
    const note = pendingReviseNote.trim();
    if (!note) return;
    onPendingReviseConsumed?.();
    void startJob(note);
  }, [pendingReviseNote]);

  const writeAnother = () => {
    const reset = writeAnotherComposeReset();
    setStayOnCompose(reset.stayOnCompose);
    setOwnedPaths(reset.ownedPaths);
    setUseOwn(reset.useOwn);
    setUseScrape(reset.useScrape);
    setCollectQuery(reset.collectQuery);
    setTitle(reset.title);
    setGoal(reset.goal);
    setError('');
    setWatchSpecId('');
    setAskPublish(false);
    setFilePreviews((current) => {
      for (const url of Object.values(current)) URL.revokeObjectURL(url);
      return {};
    });
    onWriteAnother?.();
  };

  const recopyInvite = async () => {
    const text = inviteText.trim();
    if (!text) {
      setClipboardBlocked(true);
      return;
    }
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setClipboardBlocked(false);
      window.setTimeout(() => setCopied(false), 4000);
    } catch {
      setClipboardBlocked(true);
    }
  };

  const rememberPreview = (file: File, path: string) => {
    if (!file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    setFilePreviews((current) => {
      if (current[path]) URL.revokeObjectURL(current[path]);
      return { ...current, [path]: url };
    });
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
      rememberPreview(file, path);
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

  const removeOwnedFile = (path: string) => {
    setOwnedPaths((current) => current.filter((item) => item !== path));
    setFilePreviews((current) => {
      const url = current[path];
      if (url) URL.revokeObjectURL(url);
      const next = { ...current };
      delete next[path];
      return next;
    });
  };

  const takeMaterialFiles = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setOwnOver(false);
    addOwnedFiles(event.dataTransfer.files);
  };

  const takeComposerFiles = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setComposerOver(false);
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
          ? t('연결됨', 'Connected', '已连接', '接続済み')
          : t('연결되지않음', 'Not connected', '未连接', '未接続'),
    },
    {
      id: 'sent',
      label: t('보냄', 'Sent', '已发送', '送信済み'),
      note: sendFailed
        ? t('일을 저장하지 못했습니다', 'Could not save the job', '无法保存任务', '仕事を保存できませんでした')
        : wait
          ? samePcPull
            ? t('보냄 · 창을 끄지 마세요', 'Sent · do not close this window', '已发送 · 不要关掉这个窗口', '送った · この窓を閉じないでください')
            : t(`복사함 · ${pasteTarget} 창에 붙이면 됩니다`, `Copied · paste it in the ${pasteTarget} window`, `已复制 · 请贴到 ${pasteTarget} 窗口`, `コピー済み · ${pasteTarget} の窓に貼ってください`)
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
            ? autoWorkingNote({
              elapsedLabel,
              lastCheckedLabel: checkedClock,
              rows: seatRows,
              language,
              pullFailed: false,
              cutHere: false,
            })
            : t('일을 보낸 뒤 기다립니다', 'Wait after you send the job', '发送任务后等待', '仕事を送ってから待ちます'),
    },
    {
      id: 'cut',
      label: t('영상 도착', 'Video arrived', '视频到达', '映像到着'),
      note: hasProject || pullStatus === 'arrived'
        ? t('미리보기', 'Preview', '预览', 'プレビュー')
        : t('아직', 'Not yet', '还没有', 'まだ'),
    },
    {
      id: 'save',
      label: t('이 PC 저장', 'Save here', '本机保存', 'この PC に保存'),
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
    <div className="desktop-spec-desk desktop-auto-desk" data-stage={jobStage} data-mode={mode}>
      {!studioReady ? (
        <p className="desktop-simple-banner" role="status">
          {t('Local Studio에 연결하는 중이면 잠시 기다리세요. 안 되면 아래 다시 시도를 누르세요.', 'If Local Studio is connecting, wait a moment. If not, retry below.', '若正在连接 Local Studio，请稍候。不行就点下面的重试。', 'Local Studio に接続中なら少し待ってください。だめなら下の再試行を押してください。')}
        </p>
      ) : null}

      {showComposer && wait ? (
        <button type="button" className="desktop-auto-jump" onClick={() => setStayOnCompose(false)}>
          {hasProject || pullStatus === 'arrived'
            ? t('도착한 컷 보기', 'See the arrived cut', '查看已到的成片', '届いたカットを見る')
            : t('기다리는 일 보기', 'See the waiting job', '查看等待中的工作', '待っている仕事を見る')}
        </button>
      ) : null}

      {showComposer ? (
        <>
          <header className="desktop-auto-lead">
            <h1>{t('오늘 만들 영상을 적으세요', 'Write the video you want today', '写下今天要做的视频', '今日作る映像を書いてください')}</h1>
          </header>

          <form
              className="desktop-auto-composer-card desktop-auto-composer-hero"
              onSubmit={(event) => {
                event.preventDefault();
                void startJob();
              }}
            >
              <label className="desktop-spec-field desktop-spec-wide desktop-auto-prompt">
                <span>{t('어떤 영상을 만들까요?', 'What video should we make?', '要做什么样的视频？', 'どんな映像を作りますか？')}</span>
                <div
                  className={`desktop-auto-composer-drop${composerOver ? ' is-over' : ''}${ownedPaths.length ? ' has-files' : ''}`}
                  onDragEnter={(event) => { event.preventDefault(); setComposerOver(true); }}
                  onDragOver={(event) => { event.preventDefault(); setComposerOver(true); }}
                  onDragLeave={(event) => {
                    if (event.currentTarget.contains(event.relatedTarget as Node)) return;
                    setComposerOver(false);
                  }}
                  onDrop={takeComposerFiles}
                >
                  {ownedPaths.length ? (
                    <ul className="desktop-auto-composer-files" aria-label={t('넣은 파일', 'Attached files', '已放入的文件', '入れたファイル')}>
                      {ownedPaths.map((path) => {
                        const kind = ownedMediaKind(path);
                        const preview = filePreviews[path] || (kind === 'image' ? localFilePreviewUrl(path) : '');
                        const ext = ownedFileExtension(path);
                        return (
                          <li key={path} className={`desktop-auto-composer-file is-${kind}`}>
                            {kind === 'image' && preview ? (
                              // Local file thumbs come from this PC path or a blob URL.
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={preview} alt={ownedFileName(path)} />
                            ) : (
                              <span className="desktop-auto-composer-file-name">{shortOwnedFileName(path)}</span>
                            )}
                            {kind !== 'image' && ext ? <em>{ext}</em> : null}
                            <button
                              type="button"
                              className="desktop-auto-composer-file-remove"
                              aria-label={t('빼기', 'Remove', '去掉', '外す')}
                              onClick={() => removeOwnedFile(path)}
                            >
                              ×
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                  <textarea
                    value={goal}
                    onChange={(event) => {
                      setGoal(event.target.value);
                      if (error) setError('');
                    }}
                    placeholder={composerOver
                      ? t('여기에 놓기', 'Drop it here', '放在这里', 'ここに置く')
                      : t('메세지를 입력하세요', 'Enter a message', '请输入消息', 'メッセージを入力してください')}
                    rows={10}
                    aria-invalid={Boolean(error) && !titleFromPrompt(title, goal)}
                    disabled={saving}
                  />
                  <div className="desktop-auto-composer-attach">
                    <button
                      type="button"
                      className="desktop-auto-composer-add"
                      aria-label={t('파일 넣기', 'Add a file', '放入文件', 'ファイルを入れる')}
                      onClick={() => void pickMaterialFiles()}
                    >
                      +
                    </button>
                  </div>
                </div>
              </label>
              <div className="desktop-auto-composer-tools">
                <button
                  type="button"
                  className={nameOpen || title.trim() ? 'is-on' : ''}
                  aria-pressed={nameOpen}
                  onClick={() => setNameOpen((value) => !value)}
                >
                  {t('영상제목 설정', 'Set the video title', '设置视频标题', '映像タイトルを設定')}
                </button>
                <button
                  type="button"
                  className={ownOpen ? 'is-on' : ''}
                  aria-pressed={ownOpen}
                  onClick={() => {
                    if (ownOpen) {
                      setOwnOpen(false);
                      return;
                    }
                    setOwnOpen(true);
                    void pickOwnFile();
                  }}
                >
                  {t('내 영상 재편집', 'Re-edit my video', '再剪我的视频', '自分の映像を再編集')}
                </button>
                <label className="desktop-auto-caption-check">
                  <span>{t('자막', 'Captions', '字幕', '字幕')}</span>
                  <input
                    type="checkbox"
                    checked={wantCaptions}
                    onChange={toggleCaptions}
                    disabled={saving}
                  />
                </label>
              </div>
              {ownOpen ? (
                <section className="desktop-auto-own">
                  <p>{t('내 영상을 다시 자릅니다. 고르면 편집이 열립니다.', 'Re-edit a video you already have. Picking one opens Edit.', '再剪已有的视频。选好就会打开编辑。', '自分の映像をもう一度切る。選ぶと編集が開く。')}</p>
                  <button
                    type="button"
                    className={ownOver ? 'desktop-simple-drop is-quiet is-over' : 'desktop-simple-drop is-quiet'}
                    disabled={locked}
                    onClick={() => void pickOwnFile()}
                    onDragEnter={(event) => { event.preventDefault(); setOwnOver(true); }}
                    onDragOver={(event) => { event.preventDefault(); setOwnOver(true); }}
                    onDragLeave={() => setOwnOver(false)}
                    onDrop={takeOwnFile}
                  >
                    <b>{ownOver
                      ? t('여기에 놓기', 'Drop it here', '放在这里', 'ここに置く')
                      : t('다시 자를 영상을 놓거나 고르기', 'Drop or pick the video to re-edit', '放下或选择要再剪的视频', 'もう一度切る映像を置くか選ぶ')}</b>
                    <span>{t('경로는 적지 마세요.', 'Do not type a path.', '不要填写路径。', 'パスは書かないでください。')}</span>
                  </button>
                </section>
              ) : null}
              {nameOpen ? (
                <label className="desktop-spec-field desktop-auto-name">
                  <span>{t('영상 제목', 'Video title', '视频标题', '映像タイトル')} <em>{t('없어도 됨', 'optional', '可以不填', 'なくてもよい')}</em></span>
                  <input
                    value={title}
                    onChange={(event) => {
                      setTitle(event.target.value);
                      if (error) setError('');
                    }}
                    placeholder={t('영상의 이름을 설정하지 않으면 프롬프트가 제목이됩니다.', 'If you do not set a video name, the prompt becomes the title.', '不设视频名时，提示词会成为标题。', '映像の名前を付けないと、上の文がタイトルになります。')}
                    disabled={saving}
                  />
                </label>
              ) : null}
              {nameOpen && recentTitles.length ? (
                <div className="desktop-auto-chips" aria-label={t('최근 이름', 'Recent names', '最近名字', '最近の名前')}>
                  {recentTitles.map((item) => (
                    <button key={item} type="button" className="desktop-auto-chip" onClick={() => { setTitle(item); if (error) setError(''); }}>
                      {item}
                    </button>
                  ))}
                </div>
              ) : null}

              <fieldset className="desktop-auto-market">
                <legend>{t('업로드 위치', 'Upload location', '上传位置', 'アップロード位置')}</legend>
                <div className="desktop-auto-chips" role="radiogroup" aria-label={t('업로드 위치', 'Upload location', '上传位置', 'アップロード位置')}>
                  {CREW_MARKETS.map((id) => (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={market === id}
                      className={market === id ? 'desktop-auto-chip is-selected' : 'desktop-auto-chip'}
                      onClick={() => {
                        setPickedMarket(id);
                        setPrefs(writeAutoPrefs({ market: id, marketTouched: true }));
                        if (inviteText) setMarketNeedsRecopy(true);
                      }}
                    >
                      {marketLabel(id, language)}
                    </button>
                  ))}
                </div>
                {marketNeedsRecopy ? (
                  <p className="desktop-spec-meta" role="status">
                    {t('업로드 위치를 바꿨습니다. 연결 글을 다시 복사하세요.', 'You changed the upload location. Copy the connect text again.', '已改上传位置。请重新复制连接文字。', 'アップロード位置を変えました。接続文をコピーし直してください。')}
                  </p>
                ) : (
                  <p className="desktop-spec-meta">
                    {t(`${marketName}용 스킬만 붙습니다. 스타일과는 다릅니다.`, `Skills cover ${marketName} only. This is not the style.`, `技能只讲 ${marketName}。这和风格不同。`, `スキルは ${marketName} だけ。スタイルとは違います。`)}
                  </p>
                )}
              </fieldset>

              <div className="desktop-auto-options" role="tablist" aria-label={t('필요한 것만 열기', 'Open only what you need', '只开需要的', '必要なものだけ開く')}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={optionPane === 'pictures'}
                  className={`desktop-auto-option${optionPane === 'pictures' ? ' is-open' : ''}${useOwn || useScrape ? ' is-set' : ''}`}
                  onClick={() => togglePane('pictures')}
                >
                  <span>{t('내파일/주소', 'My file/address', '我的文件/地址', '自分のファイル/住所')}</span>
                  <b>{wayLabel}</b>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={optionPane === 'where'}
                  className={`desktop-auto-option${optionPane === 'where' ? ' is-open' : ''} is-set`}
                  onClick={() => togglePane('where')}
                >
                  <span>{t('스타일', 'Style', '风格', 'スタイル')}</span>
                  <b>{styleLabel}</b>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={optionPane === 'sound'}
                  className={`desktop-auto-option${optionPane === 'sound' ? ' is-open' : ''}${wantTts ? ' is-set' : ''}`}
                  onClick={() => togglePane('sound')}
                >
                  <span>{t('TTS생성', 'TTS', 'TTS生成', 'TTS生成')}</span>
                  <b>{soundLabel}</b>
                </button>
              </div>

              {optionPane === 'pictures' ? (
                <fieldset className="desktop-auto-option-pane">
                  <legend>{t('화면 넣기', 'Add pictures', '放入画面', '画面を入れる')}</legend>
                  <p className="desktop-spec-meta">
                    {t('내 파일이 있으면 그걸 먼저 씁니다. 더 받을 때만 공개 파일 주소를 적으세요. 검색어는 안 됩니다.', 'Your files come first. Write public file URLs only when you need more. Not a search phrase.', '有自己的文件就先用。只有还要收时才写公开文件地址。不要写搜索词。', '自分のファイルがあればそれを先に使う。さらに取るときだけ公開ファイルの住所を書く。検索語はだめです。')}
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
                      <b>{t('공개 파일 주소로 받기', 'Fetch public file URLs', '用公开文件地址收取', '公開ファイルの住所で受け取る')}</b>
                      <span>{t('한 줄에 직접 받을 주소 하나. 붙은 봇이 curl로 받아 자료함에 둡니다.', 'One direct download URL per line. The attached bot curls it into the materials box.', '每行一个可直接下载的地址。接上的机器人用 curl 收到资料箱。', '一行に直接受け取れる住所一つ。付けるボットが curl で資料箱に置く。')}</span>
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
                                onClick={() => removeOwnedFile(path)}
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
                      <span>{t('받을 공개 파일 주소', 'Public file URLs to fetch', '要收的公开文件地址', '受け取る公開ファイルの住所')}</span>
                      <textarea
                        value={collectQuery}
                        onChange={(event) => {
                          setCollectQuery(event.target.value);
                          if (error) setError('');
                        }}
                        placeholder={t('예: https://images-assets.nasa.gov/.../clip.mp4', 'Example: https://images-assets.nasa.gov/.../clip.mp4', '例如：https://images-assets.nasa.gov/.../clip.mp4', '例: https://images-assets.nasa.gov/.../clip.mp4')}
                        rows={3}
                        aria-invalid={Boolean(error) && useScrape}
                        disabled={saving}
                      />
                      <small className="desktop-spec-meta">
                        {t('한 줄에 http 주소 하나. 검색어·로그인 벽 주소는 적지 마세요. 이 프로그램은 사이트를 긁지 않습니다.', 'One http URL per line. No search phrases or login-walled links. This program does not scrape.', '每行一个 http 地址。不要写搜索词或登录墙链接。这个程序不抓站。', '一行に http 住所一つ。検索語やログイン壁のリンクは書かない。このプログラムは掻きません。')}
                      </small>
                    </label>
                  ) : null}
                </fieldset>
              ) : null}

              {optionPane === 'where' ? (
                <fieldset className="desktop-auto-option-pane desktop-auto-shapes">
                  <legend>{t('스타일', 'Style', '风格', 'スタイル')}</legend>
                  <div className="desktop-auto-chips desktop-auto-shape-chips" role="radiogroup" aria-label={t('스타일', 'Style', '风格', 'スタイル')}>
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
                        {recipeFallbackLabel(recipe.id, language)}
                      </button>
                    )) : (
                      <p className="desktop-spec-meta">{t('모양 목록을 아직 읽지 못했습니다.', 'Could not load the shapes yet.', '还没读到样子列表。', '形の一覧をまだ読めません。')}</p>
                    )}
                  </div>
                </fieldset>
              ) : null}

              {optionPane === 'sound' ? (
                <fieldset className="desktop-auto-option-pane desktop-auto-voice">
                  <legend>{t('tts생성', 'TTS', 'TTS生成', 'TTS生成')}</legend>
                  <div className="desktop-auto-switches">
                    <button
                      type="button"
                      className={wantTts ? 'is-on' : ''}
                      aria-pressed={wantTts}
                      onClick={() => setWantTts((value) => !value)}
                    >
                      <b>{t('tts생성', 'TTS', 'TTS生成', 'TTS生成')}</b>
                      <span>{wantTts ? t('켬 · 이 컴퓨터가 말함', 'On · this PC speaks', '开 · 由这台电脑配音', 'オン · このパソコンが話す') : t('끔', 'Off', '关', 'オフ')}</span>
                    </button>
                  </div>
                  {wantTts ? (
                    <div className="desktop-auto-voice-pick">
                      <section className="desktop-voice-persona" aria-label={t('어떤 목소리', 'Which voice', '哪种声音', 'どんな声')}>
                        <b>{t('어떤 목소리로 시작할까요', 'What voice should we start with?', '用哪种声音开始？', 'どの声で始めますか')}</b>
                        <p>{t(`성별, 느낌, 말투를 고릅니다. 말투는 이 PC의 ${voiceModelLabel(voiceModelId)}이 받은 언어만 보입니다. 사람을 복제하지 않습니다. 마음에 들면 저장하세요.`, `Pick gender, tone, and language. You only see languages this PC’s ${voiceModelLabel(voiceModelId)} can speak. It doesn’t clone anyone’s voice. Save the one you like.`, `选性别、语气和语种。这里只显示这台电脑上的 ${voiceModelLabel(voiceModelId)} 会说的语言。不会克隆真人的声音。喜欢就保存。`, `性別、声の感じ、言語を選びます。この PC の ${voiceModelLabel(voiceModelId)} が話せる言語だけ出ます。人の声は複製しません。気に入ったら保存してください。`)}</p>
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
                                onClick={() => { setVoiceGender(item); setVoiceSaved(false); hearVoice({ gender: item }); }}
                              >
                                {voiceGenderLabel(item, language)}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="desktop-auto-filter">
                          <span>{t('느낌', 'Tone', '语气', 'トーン')}</span>
                          <div className="desktop-auto-chips" role="radiogroup" aria-label={t('느낌', 'Tone', '语气', 'トーン')}>
                            {VOICE_FEELS.map((item) => (
                              <button
                                key={item}
                                type="button"
                                role="radio"
                                aria-checked={voiceFeel === item}
                                className={voiceFeel === item ? 'desktop-auto-chip is-selected' : 'desktop-auto-chip'}
                                onClick={() => { setVoiceFeel(item); setVoiceSaved(false); hearVoice({ feel: item }); }}
                              >
                                {voiceFeelLabel(item, language)}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="desktop-auto-filter">
                          <span>{t('말투', 'Language', '语种', '言語')}</span>
                          <div className="desktop-auto-chips" role="radiogroup" aria-label={t('말투', 'Language', '语种', '言語')}>
                            {allowedAccents.map((item) => (
                              <button
                                key={item}
                                type="button"
                                role="radio"
                                aria-checked={voiceAccent === item}
                                className={voiceAccent === item ? 'desktop-auto-chip is-selected' : 'desktop-auto-chip'}
                                onClick={() => { setVoiceAccent(item); setVoiceSaved(false); hearVoice({ accent: item }); }}
                              >
                                {voiceAccentLabel(item, language)}
                              </button>
                            ))}
                          </div>
                        </div>
                        {!allowedAccents.includes('ko') ? (
                          <p className="desktop-spec-meta">
                            {t(
                              '이 모델은 한국어 언어팩이 없습니다. 받은 언어의 말투만 고릅니다.',
                              'This model has no Korean language pack. You can only pick languages it supports.',
                              '这个模型没有韩语语言包。只能选择它支持的语种。',
                              'このモデルに韓国語の言語パックはありません。対応している言語だけ選べます。',
                            )}
                          </p>
                        ) : null}
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
                            className="desktop-secondary"
                            onClick={() => hearVoice()}
                          >
                            {voicePreview === 'loading'
                              ? t('Kokoro 만드는 중…', 'Preparing Kokoro…', '正在准备 Kokoro…', 'Kokoro を準備中…')
                              : voicePreview === 'playing'
                                ? t('듣는 중…', 'Playing…', '试听中…', '再生中…')
                                : t('미리듣기', 'Preview', '试听', '試し聞き')}
                          </button>
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
                              ? t('이 목소리로 저장됨', 'Voice saved', '已保存此声音', 'この声で保存済み')
                              : t('이 목소리로 저장', 'Save this voice', '保存这个声音', 'この声で保存')}
                          </button>
                        </div>
                        <p className="desktop-spec-meta">
                          {voicePreview === 'missing'
                            ? t('이 PC에 Kokoro-82M 미리듣기가 없습니다. 왼쪽 위 톱니에서 모델을 받으세요.', 'Kokoro-82M preview isn’t on this PC. Download the model from the gear at the top left.', '这台电脑没有 Kokoro-82M 试听。请用左上角的齿轮下载模型。', 'この PC に Kokoro-82M の試し聞きがありません。左上の歯車からモデルをダウンロードしてください。')
                            : voicePreview === 'blocked'
                              ? t('이 창에서 Kokoro-82M 미리듣기를 재생하지 못했습니다. 말투를 다시 누르거나 미리듣기를 누르세요.', 'This window couldn’t play the Kokoro-82M preview. Tap a language or Preview again.', '这个窗口没能播放 Kokoro-82M 试听。请再点语种或试听。', 'この窓では Kokoro-82M の試し聞きを再生できませんでした。言語か試し聞きを押してください。')
                              : t(
                                `미리듣기는 이 PC의 ${voiceModelLabel(voiceModelId)}이 「${voicePreviewPhrase(voiceAccent)}」를 말한 소리입니다.`,
                                `This preview is this PC’s ${voiceModelLabel(voiceModelId)} saying “${voicePreviewPhrase(voiceAccent)}”.`,
                                `试听是这台电脑上的 ${voiceModelLabel(voiceModelId)} 说的「${voicePreviewPhrase(voiceAccent)}」。`,
                                `試し聞きはこの PC の ${voiceModelLabel(voiceModelId)} が「${voicePreviewPhrase(voiceAccent)}」と言った音です。`,
                              )}
                        </p>
                        <p className="desktop-spec-meta">
                          {voiceSaved
                            ? t('이 컴퓨터에 기억했습니다. 다음에 열어도 이 목소리로 시작합니다.', 'Saved on this computer. Next time you open it, this voice is used.', '已保存在这台电脑。下次打开也用这个声音。', 'このパソコンに保存しました。次に開いてもこの声で始まります。')
                            : t('고른 값은 저장하면 남고, 만들기를 눌러도 남습니다.', 'Saving keeps your pick. Starting a job keeps it too.', '保存后会留下选择。按开始也会留下。', '保存すれば残ります。作り始めても残ります。')}
                        </p>
                        <p className="desktop-spec-meta">
                          {t('모델 받기는 왼쪽 위 톱니에서 합니다. 자동은 켜고 끄기만 합니다.', 'Download the model from the gear at the top left. Auto only turns TTS on or off.', '下载模型请用左上角的齿轮。自动里只开关 TTS。', 'モデルのダウンロードは左上の歯車から。自動はオンとオフだけです。')}
                        </p>
                      </section>
                    </div>
                  ) : null}
                </fieldset>
              ) : null}

              {startReady && (titleFromPrompt(title, goal) || ownedPaths.length > 0) ? (
                <p className="desktop-auto-recap">
                  {`${attachedName || t('연결 글 복사됨', 'Connect text copied', '已复制连接文字', '接続文をコピー済み')} · ${marketName} · ${styleLabel} · ${wayLabel} · ${t('TTS생성', 'TTS', 'TTS生成', 'TTS生成')} ${soundLabel}`}
                </p>
              ) : null}
              {!startReady ? (
                <p className="desktop-auto-gate">{t('연결에서 붙일 글을 먼저 복사하세요. 복사만으로는 램프가 켜지지 않습니다.', 'Copy the connect text first. Copying does not light the lamp.', '请先复制连接文字。只复制不会亮灯。', '先に接続文をコピーしてください。コピーしただけではランプは点きません。')}</p>
              ) : null}
              <button type="submit" className="desktop-primary desktop-auto-make" disabled={formLocked}>
                {saving
                  ? t('보내는 중…', 'Sending…', '发送中…', '送信中…')
                  : copied
                    ? t('복사했습니다', 'Copied', '已复制', 'コピーしました')
                    : t('제작 시작', 'Start production', '开始制作', '制作開始')}
              </button>
            </form>
        </>
      ) : null}

      {showJobRun ? (
        <section className="desktop-auto-job desktop-auto-run" aria-live="polite" data-arrived={showArrived ? 'yes' : 'no'}>
          <header className="desktop-auto-run-head">
            <div>
              <p className="desktop-auto-run-kicker">{showArrived
                ? t('여기에 놓기', 'Drop it here', '放在这里', 'ここに置く')
                : elapsedLabel
                  ? t(`${elapsedLabel}째`, `${elapsedLabel}`, `${elapsedLabel}`, `${elapsedLabel}`)
                  : t('방금 보냄', 'Just sent', '刚刚发送', 'たった今送った')}</p>
              <h1>{showArrived
                ? (projectTitle || titleFromPrompt(wait?.title || title, goal) || t('도착한 컷', 'Arrived cut', '已到达的成片', '届いたカット'))
                : (titleFromPrompt(wait?.title || title, goal) || t('자리 넘김', 'Seat handoff', '位子转交', '席の受け渡し'))}</h1>
              <p>{showArrived
                ? t('끝난 컷은 이 칸과 최근기록에 같은 파일로 있습니다.', 'The finished cut is in this slot and in Recent as the same file.', '完成的成片就在这一格，最近记录里是同一份文件。', '終わったカットはこの欄と最近記録に同じファイルであります。')
                : waitHeadline.title}</p>
            </div>
            <button type="button" className="desktop-auto-text desktop-auto-new" onClick={writeAnother}>
              {t('새로 만들기', 'Create new', '新建', '新規作成')}
            </button>
          </header>
          <ol className="desktop-auto-run-rail" aria-label={t('자리', 'Seats', '位子', '席')}>
            {stageRows.map((seat, index) => (
              <li key={seat.key} data-mark={seat.mark} data-role={seat.role} data-stage={seat.stage}>
                {index > 0 ? <span className="desktop-auto-run-arrow" aria-hidden="true">→</span> : null}
                <button
                  type="button"
                  className={`desktop-auto-run-seat${seat.connected ? ' is-on' : ' is-off'}${seat.current ? ' is-current' : ''}`}
                  onClick={onOpenBots}
                >
                  <i aria-hidden="true" />
                  <b>{crewStageShortLabel(seat.stage || (seat.role === 'planner' ? 'plan' : seat.role === 'scraper' ? 'collect' : 'cut'), language)}</b>
                  <span>{seat.connected
                    ? t('연결됨', 'Connected', '已连接', '接続済み')
                    : t('연결되지않음', 'Not connected', '未连接', '未接続')}</span>
                </button>
              </li>
            ))}
          </ol>
          {samePcPull || showArrived ? null : (
          <div className="desktop-auto-interrupt">
            <p>{t(`사람 손길 · ${pasteTarget} 창에 한 번 붙이세요. 봇이 GROK_CREW_OK만 보냈으면 아직 이 일이 안 간 겁니다.`, `Your step · paste it once in the ${pasteTarget} window. If the bot only sent GROK_CREW_OK, the job has not arrived.`, `人手 · 请在 ${pasteTarget} 窗口贴一次。机器人只发了 GROK_CREW_OK 就说明这件事还没送到。`, `人の手 · ${pasteTarget} の窓に一度貼ってください。ボットが GROK_CREW_OK だけ送ったなら、この仕事はまだ届いていません。`)}</p>
            <button type="button" className="desktop-primary desktop-recopy-btn" disabled={!inviteText.trim()} onClick={() => { void recopyInvite(); }}>
              {copied
                ? t(`복사했습니다. ${pasteTarget} 창에 붙이세요.`, `Copied. Paste it in the ${pasteTarget} window.`, `已复制。请贴到 ${pasteTarget} 窗口。`, `コピーしました。${pasteTarget} の窓に貼ってください。`)
                : t(`다시 복사 · ${pasteTarget}`, `Copy again · ${pasteTarget}`, `再复制 · ${pasteTarget}`, `もう一度コピー · ${pasteTarget}`)}
            </button>
            {inviteText.trim() ? (
              <details className="desktop-spec-advanced desktop-simple-invite" open>
                <summary>{t('봇이 읽을 글 보기', 'Show the text the bot reads', '查看机器人要读的文字', 'ボットが読む文を見る')}</summary>
                <textarea value={inviteText} readOnly rows={8} onFocus={(event) => event.currentTarget.select()} />
              </details>
            ) : null}
          </div>
          )}
          <DesktopCrewBoard
            rows={seatRows}
            activity={activity}
            loadState={activityState}
            specId={wait?.specId}
            jobTitle={titleFromPrompt(wait?.title || title, goal)}
            layout="job"
            onRetry={() => {
              setActivityState('loading');
              void request('/api/bot-activity').then((data) => {
                const payload = data as { activity?: BotActivityItem[] };
                setActivity(Array.isArray(payload.activity) ? payload.activity : []);
                setActivityState('ready');
              }).catch(() => setActivityState('error'));
            }}
          />
          <details className="desktop-auto-help">
            <summary>{t('단계', 'Steps', '步骤', '段階')}</summary>
            <ol className="desktop-auto-stepper">
              {phases.map((phase) => (
                <li key={phase.id} className={`desktop-auto-stepper-item is-${lamps[phase.id]}`}>
                  <span className={`desktop-auto-lamp is-${lamps[phase.id]}`} aria-hidden="true" />
                  <b>{phase.label}</b>
                  {lamps[phase.id] !== 'off' ? <p>{phase.note}</p> : null}
                </li>
              ))}
            </ol>
          </details>
          {showCutDrop ? (
            <section className={showArrived ? 'desktop-auto-drop is-here' : 'desktop-auto-drop is-quiet'}>
              {showArrived ? (
                <div className="desktop-auto-place">
                  {previewUrl ? (
                    <video controls preload="metadata" src={previewUrl} />
                  ) : (
                    <p>{t('컷이 이 칸에 있습니다. 미리보기를 아직 읽지 못했습니다.', 'The cut is in this slot. The preview has not loaded yet.', '成片已在这一格。预览还没读到。', 'カットはこの欄にあります。プレビューはまだ読めません。')}</p>
                  )}
                  <p className="desktop-auto-preview-note">
                    {outputReady
                      ? t('이 PC에 두었음. 자동은 올리지 않았습니다.', 'Saved on this PC. Auto did not post it.', '已留在这台电脑。自动没有发布。', 'この PC に残しました。自動では上げていません。')
                      : t('여기에 놓기 · 최근기록에도 같은 컷입니다.', 'Drop it here · Recent has the same cut.', '放在这里 · 最近记录也是同一份成片。', 'ここに置く · 最近記録にも同じカットがあります。')}
                  </p>
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
                </div>
              ) : (
                <>
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
                    className={cutOver ? 'desktop-simple-drop is-over is-quiet' : 'desktop-simple-drop is-quiet'}
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
                      : t('완성되면 여기에 영상이 올라옵니다', 'The video will appear here when it is finished', '完成后视频会出现在这里', '完成すると、ここに映像が上がります')}</b>
                  </button>
                </>
              )}
            </section>
          ) : null}
          {showArrived && (askPublish || outputReady) ? (
            <section className="desktop-auto-card desktop-auto-save-card">
              <b>{t('이 PC에 두었음', 'Saved on this PC', '已留在这台电脑', 'この PC に残した')}</b>
              <p>{t(`폴더 · ${savePath || prefs.lastSavePath || t('출력 폴더', 'output folder', '输出文件夹', '出力フォルダ')}`, `Folder · ${savePath || prefs.lastSavePath || 'output folder'}`, `文件夹 · ${savePath || prefs.lastSavePath || '输出文件夹'}`, `フォルダ · ${savePath || prefs.lastSavePath || '出力フォルダ'}`)}</p>
              {wait && elapsedLabel ? <p>{t(`시작에서 지금까지 · ${elapsedLabel}`, `Since start · ${elapsedLabel}`, `从开始到现在 · ${elapsedLabel}`, `開始から今まで · ${elapsedLabel}`)}</p> : null}
              <p>{t('올리려면 한 번 더 고릅니다. 자동은 올리지 않습니다.', 'Posting asks once more. Auto does not post.', '要发布需再选一次。自动不会发布。', '上げるならもう一度選びます。自動では上げません。')}</p>
              <div className="desktop-auto-preview-actions">
                <button type="button" className="desktop-secondary" onClick={onOpenExport}>
                  {t('올릴까요?', 'Post it?', '要发布吗？', '上げますか？')}
                </button>
                <button
                  type="button"
                  className="desktop-secondary"
                  onClick={() => {
                    setTitle('');
                    setAskPublish(false);
                    setGoal('');
                    setStayOnCompose(true);
                  }}
                >
                  {t('다른 제목', 'Another title', '换个标题', '別のタイトル')}
                </button>
              </div>
            </section>
          ) : null}
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

      {clipboardBlocked && !samePcPull ? (
        <p className="desktop-spec-error">{t('클립보드를 쓰지 못했습니다. 위의 글을 직접 복사하세요.', 'The clipboard was blocked. Copy the text above yourself.', '无法使用剪贴板。请手动复制上面的文字。', 'クリップボードを使えませんでした。上の文を自分でコピーしてください。')}</p>
      ) : null}

      {error ? <p className="desktop-spec-error" role="alert">{error}</p> : null}
      {sendFailed || pullStatus === 'failed' || saveFailed ? (
        <button type="button" className="desktop-secondary" disabled={formLocked} onClick={() => void startJob()}>
          {t('같은 말로 다시', 'Send the same line again', '再用同一句话', '同じ言葉でもう一度')}
        </button>
      ) : null}

      {showComposer ? (
        <details className="desktop-auto-help">
          <summary>{t('도움말 · 소식', 'Help · news', '帮助 · 消息', '助け · 知らせ')}</summary>
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
          <DesktopNewsCard />
        </details>
      ) : null}
    </div>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AppLanguage } from './language';

export const EDIT_PRESETS_STORAGE_KEY = 'grokCrewEditPresets';
export const MAX_SAVED_EDIT_PRESETS = 12;

export type EditMethodSnapshot = {
  content_type: string;
  target_length: number;
  aspect_ratio: string;
  broll_policy: string;
  hook_strategy: string;
  pacing: string;
  filler_policy: string;
  caption_mode: string;
  reframe_anchor: string;
  look: string;
  audio_policy: string;
  speed: number;
  fps: number;
  quality: string;
};

export type SavedEditPreset = {
  id: string;
  name: string;
  method: EditMethodSnapshot;
};

export type EditPresetsStore = {
  saved: SavedEditPreset[];
  lastSelectedId: string;
};

export type LocalizedEditCopy = Record<AppLanguage, string>;

export type EditPresetKind = 'custom' | 'builtin' | 'saved';

export type EditPresetOption = {
  id: string;
  kind: EditPresetKind;
  name: LocalizedEditCopy;
  hint: LocalizedEditCopy;
  method: EditMethodSnapshot;
};

export const CUSTOM_EDIT_PRESET_ID = 'custom';

const CONTENT_TYPES = ['talking_head', 'vlog', 'product', 'tutorial'] as const;
const LENGTHS = [15, 30, 45, 60, 90] as const;
const ASPECTS = ['9:16', '1:1', '16:9'] as const;
const BROLL = ['auto', 'required', 'off'] as const;
const HOOKS = ['payoff_first', 'question_first', 'chronological'] as const;
const PACING = ['tight', 'balanced', 'deliberate'] as const;
const FILLER = ['remove', 'review', 'keep'] as const;
const CAPTIONS = ['burn_in', 'off'] as const;
const REFRAMES = ['left', 'center', 'right'] as const;
const LOOKS = ['natural', 'punchy', 'mono', 'night'] as const;
const AUDIO = ['preserve', 'normalize', 'mute'] as const;
const FPS = [24, 30, 60] as const;
const QUALITY = ['compact', 'balanced', 'high'] as const;

function named(ko: string, en: string, zh: string, ja: string): LocalizedEditCopy {
  return { ko, en, zh, ja };
}

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

function pickNumber(value: unknown, allowed: readonly number[], fallback: number): number {
  const next = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
  return allowed.includes(next) ? next : fallback;
}

function pickSpeed(value: unknown, fallback: number): number {
  const next = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
  if (!Number.isFinite(next)) return fallback;
  return Math.min(2, Math.max(0.5, Math.round(next * 20) / 20));
}

export const DEFAULT_EDIT_METHOD: EditMethodSnapshot = {
  content_type: 'talking_head',
  target_length: 30,
  aspect_ratio: '9:16',
  broll_policy: 'auto',
  hook_strategy: 'payoff_first',
  pacing: 'tight',
  filler_policy: 'remove',
  caption_mode: 'burn_in',
  reframe_anchor: 'center',
  look: 'natural',
  audio_policy: 'normalize',
  speed: 1,
  fps: 30,
  quality: 'balanced',
};

export const CUSTOM_EDIT_PRESET: EditPresetOption = {
  id: CUSTOM_EDIT_PRESET_ID,
  kind: 'custom',
  name: named('사용자 지정', 'Custom', '自定义', 'ユーザー指定'),
  hint: named(
    '지금 아래 값이 사용자 지정입니다. 지정은 고른 스타일을 넣고, 저장은 지금 값을 이름으로 남깁니다.',
    'These knobs are custom. Assign applies a picked style. Save stores the current knobs under a name.',
    '当前为自定义。指定会套用所选风格，保存会把当前选项记下名字。',
    '今の値はユーザー指定です。指定は選んだスタイルを入れ、保存は今の値を名前で残します。',
  ),
  method: { ...DEFAULT_EDIT_METHOD },
};

export const BUILTIN_EDIT_PRESETS: EditPresetOption[] = [
  {
    id: 'youtube_short',
    kind: 'builtin',
    name: named('유튜브 쇼츠', 'YouTube Shorts', 'YouTube Shorts', 'YouTubeショート'),
    hint: named('세로 30초, 균형 컷, 후킹 먼저', '9:16 · 30s · balanced hook', '竖屏30秒，先钩后展开', '縦30秒・バランス・先フック'),
    method: {
      ...DEFAULT_EDIT_METHOD,
      content_type: 'talking_head',
      target_length: 30,
      aspect_ratio: '9:16',
      pacing: 'balanced',
      look: 'natural',
      quality: 'balanced',
    },
  },
  {
    id: 'instagram_reel',
    kind: 'builtin',
    name: named('인스타 릴스', 'Instagram Reels', 'Instagram Reels', 'Instagramリール'),
    hint: named('세로 30초, 타이트 컷, 펀치 룩', '9:16 · 30s · tight punchy', '竖屏30秒，紧凑有冲击', '縦30秒・タイト・パンチ'),
    method: {
      ...DEFAULT_EDIT_METHOD,
      content_type: 'talking_head',
      target_length: 30,
      aspect_ratio: '9:16',
      pacing: 'tight',
      look: 'punchy',
      quality: 'balanced',
    },
  },
  {
    id: 'tiktok',
    kind: 'builtin',
    name: named('틱톡', 'TikTok', 'TikTok', 'TikTok'),
    hint: named('세로 15초, 타이트, 바로 본론', '9:16 · 15s · tight payoff', '竖屏15秒，紧凑直给', '縦15秒・タイト・すぐ本題'),
    method: {
      ...DEFAULT_EDIT_METHOD,
      content_type: 'talking_head',
      target_length: 15,
      aspect_ratio: '9:16',
      pacing: 'tight',
      look: 'punchy',
      quality: 'balanced',
    },
  },
  {
    id: 'youtube_long',
    kind: 'builtin',
    name: named('유튜브 본편', 'YouTube long', 'YouTube 长视频', 'YouTube本編'),
    hint: named('가로 90초 상한, 여유 컷, 시간순', '16:9 · 90s cap · deliberate', '横屏90秒上限，从容按时间', '横90秒上限・ゆったり時系列'),
    method: {
      ...DEFAULT_EDIT_METHOD,
      content_type: 'vlog',
      target_length: 90,
      aspect_ratio: '16:9',
      broll_policy: 'required',
      hook_strategy: 'chronological',
      pacing: 'deliberate',
      filler_policy: 'review',
      look: 'natural',
      quality: 'high',
    },
  },
  {
    id: 'instagram_square',
    kind: 'builtin',
    name: named('인스타 피드 정사각', 'Instagram square', 'Instagram 方形', 'Instagramスクエア'),
    hint: named('1:1 30초, 피드용 균형', '1:1 · 30s · feed-ready', '1:1 30秒，适合信息流', '1:1・30秒・フィード向け'),
    method: {
      ...DEFAULT_EDIT_METHOD,
      content_type: 'product',
      target_length: 30,
      aspect_ratio: '1:1',
      pacing: 'balanced',
      look: 'natural',
      quality: 'balanced',
    },
  },
  {
    id: 'landscape_short',
    kind: 'builtin',
    name: named('가로 쇼츠', 'Landscape short', '横屏短视频', '横ショート'),
    hint: named('16:9 45초, 본편 맛보기', '16:9 · 45s · teaser cut', '横屏45秒，长视频预告感', '横45秒・本編予告'),
    method: {
      ...DEFAULT_EDIT_METHOD,
      content_type: 'talking_head',
      target_length: 45,
      aspect_ratio: '16:9',
      pacing: 'balanced',
      look: 'punchy',
      quality: 'high',
    },
  },
];

export function emptyEditPresetsStore(): EditPresetsStore {
  return { saved: [], lastSelectedId: '' };
}

export function normalizeEditMethod(value: unknown, fallback = DEFAULT_EDIT_METHOD): EditMethodSnapshot {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return {
    content_type: pick(raw.content_type, CONTENT_TYPES, fallback.content_type),
    target_length: pickNumber(raw.target_length, LENGTHS, fallback.target_length),
    aspect_ratio: pick(raw.aspect_ratio, ASPECTS, fallback.aspect_ratio),
    broll_policy: pick(raw.broll_policy, BROLL, fallback.broll_policy),
    hook_strategy: pick(raw.hook_strategy, HOOKS, fallback.hook_strategy),
    pacing: pick(raw.pacing, PACING, fallback.pacing),
    filler_policy: pick(raw.filler_policy, FILLER, fallback.filler_policy),
    caption_mode: pick(raw.caption_mode, CAPTIONS, fallback.caption_mode),
    reframe_anchor: pick(raw.reframe_anchor, REFRAMES, fallback.reframe_anchor),
    look: pick(raw.look, LOOKS, fallback.look),
    audio_policy: pick(raw.audio_policy, AUDIO, fallback.audio_policy),
    speed: pickSpeed(raw.speed, fallback.speed),
    fps: pickNumber(raw.fps, FPS, fallback.fps),
    quality: pick(raw.quality, QUALITY, fallback.quality),
  };
}

export function normalizeSavedEditPreset(value: unknown): SavedEditPreset | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const id = typeof raw.id === 'string' ? raw.id.trim() : '';
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (!id.startsWith('saved_') || !name) return null;
  return { id, name: name.slice(0, 40), method: normalizeEditMethod(raw.method) };
}

export function normalizeEditPresetsStore(value: unknown): EditPresetsStore {
  const fallback = emptyEditPresetsStore();
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const saved: SavedEditPreset[] = [];
  const seen = new Set<string>();
  if (Array.isArray(raw.saved)) {
    for (const item of raw.saved) {
      const preset = normalizeSavedEditPreset(item);
      if (!preset || seen.has(preset.id) || saved.length >= MAX_SAVED_EDIT_PRESETS) continue;
      seen.add(preset.id);
      saved.push(preset);
    }
  }
  const lastSelectedId = typeof raw.lastSelectedId === 'string' ? raw.lastSelectedId.trim() : fallback.lastSelectedId;
  return { saved, lastSelectedId };
}

export function parseEditPresetsStore(raw: string | null): EditPresetsStore {
  if (!raw?.trim()) return emptyEditPresetsStore();
  try {
    return normalizeEditPresetsStore(JSON.parse(raw) as unknown);
  } catch {
    return emptyEditPresetsStore();
  }
}

export function loadEditPresetsStore(): EditPresetsStore {
  if (typeof window === 'undefined') return emptyEditPresetsStore();
  try {
    return parseEditPresetsStore(window.localStorage.getItem(EDIT_PRESETS_STORAGE_KEY));
  } catch {
    return emptyEditPresetsStore();
  }
}

export function persistEditPresetsStore(store: EditPresetsStore): EditPresetsStore {
  const next = normalizeEditPresetsStore(store);
  if (typeof window === 'undefined') return next;
  try {
    window.localStorage.setItem(EDIT_PRESETS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* quota / private mode */
  }
  return next;
}

export function applyEditPreset(
  current: EditMethodSnapshot,
  preset: EditMethodSnapshot,
  options: { lockQuality?: boolean } = {},
): EditMethodSnapshot {
  const next = normalizeEditMethod(preset);
  if (options.lockQuality) next.quality = current.quality;
  return next;
}

export function methodsMatch(
  left: EditMethodSnapshot,
  right: EditMethodSnapshot,
  options: { lockQuality?: boolean } = {},
): boolean {
  const a = normalizeEditMethod(left);
  const b = normalizeEditMethod(right);
  const keys = Object.keys(DEFAULT_EDIT_METHOD) as Array<keyof EditMethodSnapshot>;
  return keys.every((key) => (key === 'quality' && options.lockQuality ? true : a[key] === b[key]));
}

export function builtinEditPreset(id: string): EditPresetOption | null {
  return BUILTIN_EDIT_PRESETS.find((item) => item.id === id) ?? null;
}

export function savedPresetOption(item: SavedEditPreset): EditPresetOption {
  return {
    id: item.id,
    kind: 'saved',
    name: named(item.name, item.name, item.name, item.name),
    hint: named('내가 저장한 스타일', 'Saved style', '已保存样式', '保存したスタイル'),
    method: item.method,
  };
}

export function listEditPresetOptions(store: EditPresetsStore): EditPresetOption[] {
  return [...BUILTIN_EDIT_PRESETS, ...store.saved.map(savedPresetOption)];
}

export function findEditPreset(store: EditPresetsStore, id: string): EditPresetOption | null {
  if (!id || id === CUSTOM_EDIT_PRESET_ID) return CUSTOM_EDIT_PRESET;
  return builtinEditPreset(id) ?? store.saved.map(savedPresetOption).find((item) => item.id === id) ?? null;
}

export function createSavedEditPreset(name: string, method: EditMethodSnapshot, now = Date.now()): SavedEditPreset | null {
  const trimmed = name.trim().slice(0, 40);
  if (!trimmed) return null;
  return {
    id: `saved_${now}`,
    name: trimmed,
    method: normalizeEditMethod(method),
  };
}

export function upsertSavedEditPreset(store: EditPresetsStore, preset: SavedEditPreset): EditPresetsStore {
  const existing = store.saved.findIndex((item) => item.id === preset.id || item.name === preset.name);
  const saved = [...store.saved];
  if (existing >= 0) {
    saved[existing] = { ...preset, id: saved[existing].id };
    return normalizeEditPresetsStore({ saved, lastSelectedId: store.lastSelectedId });
  }
  if (saved.length >= MAX_SAVED_EDIT_PRESETS) saved.shift();
  saved.push(preset);
  return normalizeEditPresetsStore({ saved, lastSelectedId: store.lastSelectedId });
}

export function removeSavedEditPreset(store: EditPresetsStore, id: string): EditPresetsStore {
  const saved = store.saved.filter((item) => item.id !== id);
  const lastSelectedId = store.lastSelectedId === id ? CUSTOM_EDIT_PRESET_ID : store.lastSelectedId;
  return { saved, lastSelectedId };
}

export function presetLabel(preset: EditPresetOption, language: AppLanguage): string {
  return preset.name[language];
}

export function presetHint(preset: EditPresetOption, language: AppLanguage): string {
  return preset.hint[language];
}

export function useDesktopEditPresets() {
  const [store, setStore] = useState<EditPresetsStore>(emptyEditPresetsStore);

  useEffect(() => {
    setStore(loadEditPresetsStore());
  }, []);

  const commit = useCallback((next: EditPresetsStore) => {
    const normalized = persistEditPresetsStore(next);
    setStore(normalized);
    return normalized;
  }, []);

  const rememberSelection = useCallback((id: string) => {
    return commit({ ...store, lastSelectedId: id });
  }, [commit, store]);

  const savePreset = useCallback((name: string, method: EditMethodSnapshot) => {
    const preset = createSavedEditPreset(name, method);
    if (!preset) return null;
    return commit(upsertSavedEditPreset(store, preset));
  }, [commit, store]);

  const deletePreset = useCallback((id: string) => {
    return commit(removeSavedEditPreset(store, id));
  }, [commit, store]);

  return { store, rememberSelection, savePreset, deletePreset };
}

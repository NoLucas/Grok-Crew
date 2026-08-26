export const TIMELINE_HEIGHT_KEY = 'grokCrewTimelineHeight';
export const TIMELINE_OPEN_HEIGHT_KEY = 'grokCrewTimelineHeightOpen';
export const TIMELINE_HANDLE_HEIGHT = 32;
export const TIMELINE_HIDDEN = TIMELINE_HANDLE_HEIGHT;
export const TIMELINE_MIN_OPEN = 168;
export const TIMELINE_MAX_OPEN = 520;
export const TIMELINE_SNAP_HIDE = 120;
export const TIMELINE_STEP = 56;
export const DEFAULT_TIMELINE_HEIGHT = 280;

export function isTimelineHidden(height: number): boolean {
  return height <= TIMELINE_HANDLE_HEIGHT + 2;
}

export function liveTimelineHeight(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_TIMELINE_HEIGHT;
  return Math.round(Math.min(TIMELINE_MAX_OPEN, Math.max(TIMELINE_HIDDEN, numeric)));
}

export function commitTimelineHeight(value: unknown): number {
  const live = liveTimelineHeight(value);
  if (live < TIMELINE_SNAP_HIDE) return TIMELINE_HIDDEN;
  return live;
}

export function normalizeTimelineHeight(value: unknown): number {
  if (value == null || value === '') return DEFAULT_TIMELINE_HEIGHT;
  return commitTimelineHeight(value);
}

export function raiseTimelineHeight(current: number, lastOpen = DEFAULT_TIMELINE_HEIGHT): number {
  if (isTimelineHidden(current)) {
    return commitTimelineHeight(Math.max(TIMELINE_MIN_OPEN, lastOpen));
  }
  return commitTimelineHeight(current + TIMELINE_STEP);
}

export function hideTimelineHeight(): number {
  return TIMELINE_HIDDEN;
}

export function applyTimelineDelta(current: number, deltaPx: number): number {
  return liveTimelineHeight(current + deltaPx);
}

export function loadLastOpenHeight(): number {
  if (typeof window === 'undefined') return DEFAULT_TIMELINE_HEIGHT;
  try {
    const stored = window.localStorage.getItem(TIMELINE_OPEN_HEIGHT_KEY);
    if (stored == null || stored === '') return DEFAULT_TIMELINE_HEIGHT;
    return commitTimelineHeight(Math.max(TIMELINE_MIN_OPEN, Number(stored)));
  } catch {
    return DEFAULT_TIMELINE_HEIGHT;
  }
}

export function loadTimelineHeight(): number {
  if (typeof window === 'undefined') return DEFAULT_TIMELINE_HEIGHT;
  try {
    const raw = window.localStorage.getItem(TIMELINE_HEIGHT_KEY);
    if (raw == null || raw === '') return DEFAULT_TIMELINE_HEIGHT;
    return commitTimelineHeight(raw);
  } catch {
    return DEFAULT_TIMELINE_HEIGHT;
  }
}

export function saveTimelineHeight(next: number): void {
  if (typeof window === 'undefined') return;
  const height = commitTimelineHeight(next);
  window.localStorage.setItem(TIMELINE_HEIGHT_KEY, String(height));
  if (!isTimelineHidden(height)) {
    window.localStorage.setItem(TIMELINE_OPEN_HEIGHT_KEY, String(height));
  }
}

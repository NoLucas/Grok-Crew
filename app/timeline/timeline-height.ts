export const TIMELINE_HEIGHT_KEY = 'grokCrewTimelineHeight';
export const TIMELINE_HEIGHT_STEPS = [168, 224, 280, 360, 460] as const;
export const DEFAULT_TIMELINE_HEIGHT = 280;

export type TimelineHeight = (typeof TIMELINE_HEIGHT_STEPS)[number];

export function normalizeTimelineHeight(value: unknown): TimelineHeight {
  if (value == null || value === '') return DEFAULT_TIMELINE_HEIGHT;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_TIMELINE_HEIGHT;
  return TIMELINE_HEIGHT_STEPS.reduce((best, step) => (
    Math.abs(step - numeric) < Math.abs(best - numeric) ? step : best
  ));
}

export function stepTimelineHeight(current: unknown, direction: -1 | 1): TimelineHeight {
  const now = normalizeTimelineHeight(current);
  const index = TIMELINE_HEIGHT_STEPS.indexOf(now);
  const next = Math.max(0, Math.min(TIMELINE_HEIGHT_STEPS.length - 1, index + direction));
  return TIMELINE_HEIGHT_STEPS[next];
}

export function loadTimelineHeight(): TimelineHeight {
  if (typeof window === 'undefined') return DEFAULT_TIMELINE_HEIGHT;
  try {
    return normalizeTimelineHeight(window.localStorage.getItem(TIMELINE_HEIGHT_KEY));
  } catch {
    return DEFAULT_TIMELINE_HEIGHT;
  }
}

export function saveTimelineHeight(next: TimelineHeight): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TIMELINE_HEIGHT_KEY, String(normalizeTimelineHeight(next)));
}

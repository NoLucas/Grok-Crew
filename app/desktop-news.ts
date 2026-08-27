export const NEWS_PREFS_KEY = 'grok-crew-news-prefs';

export type NewsPrefs = {
  sentAt?: string;
  dismissedAt?: string;
};

function storage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function newsFormUrl(raw?: string): string {
  const fromEnv = typeof process !== 'undefined' ? String(process.env.NEXT_PUBLIC_GROK_CREW_NEWS_URL || '') : '';
  return String(raw ?? fromEnv).trim();
}

export function emptyNewsPrefs(): NewsPrefs {
  return {};
}

export function readNewsPrefs(): NewsPrefs {
  const raw = storage()?.getItem(NEWS_PREFS_KEY);
  if (!raw) return emptyNewsPrefs();
  try {
    const parsed = JSON.parse(raw) as Partial<NewsPrefs>;
    const sentAt = String(parsed.sentAt || '').trim();
    const dismissedAt = String(parsed.dismissedAt || '').trim();
    return {
      ...(sentAt ? { sentAt } : {}),
      ...(dismissedAt ? { dismissedAt } : {}),
    };
  } catch {
    return emptyNewsPrefs();
  }
}

export function writeNewsPrefs(prefs: NewsPrefs): void {
  storage()?.setItem(NEWS_PREFS_KEY, JSON.stringify(prefs));
}

export function isNewsEmail(value: string): boolean {
  const email = String(value || '').trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function shouldShowNewsCard(prefs?: NewsPrefs | null): boolean {
  const current = prefs ?? readNewsPrefs();
  return !current.sentAt && !current.dismissedAt;
}

export function rememberNewsSent(at = new Date().toISOString()): NewsPrefs {
  const next = { ...readNewsPrefs(), sentAt: at };
  writeNewsPrefs(next);
  return next;
}

export function rememberNewsDismissed(at = new Date().toISOString()): NewsPrefs {
  const next = { ...readNewsPrefs(), dismissedAt: at };
  writeNewsPrefs(next);
  return next;
}

export function newsPayload(email: string): { email: string; source: string } {
  return { email: String(email || '').trim(), source: 'grok-crew-desk' };
}

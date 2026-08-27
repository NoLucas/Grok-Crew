export const DESK_WAIT_KEY = "grok-crew-desk-wait";
export const FIRST_CUT_KEY = "grok-crew-first-cut-arrived";

export type DeskPullStatus = "idle" | "none" | "arrived" | "failed";

export type DeskWaitState = {
  specId: string;
  title: string;
  copiedAt: string;
  pasteTarget: string;
};

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function asWait(value: unknown): DeskWaitState | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const specId = String(record.specId || "").trim();
  const title = String(record.title || "").trim();
  const copiedAt = String(record.copiedAt || "").trim();
  const pasteTarget = String(record.pasteTarget || "").trim() || "Grok Bot";
  if (!specId || !copiedAt) return null;
  return { specId, title, copiedAt, pasteTarget };
}

export function readDeskWait(): DeskWaitState | null {
  const raw = storage()?.getItem(DESK_WAIT_KEY);
  if (!raw) return null;
  try {
    return asWait(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeDeskWait(state: DeskWaitState): void {
  storage()?.setItem(DESK_WAIT_KEY, JSON.stringify(state));
}

export function clearDeskWait(): void {
  storage()?.removeItem(DESK_WAIT_KEY);
}

export function readFirstCutArrived(): boolean {
  return storage()?.getItem(FIRST_CUT_KEY) === "1";
}

export function markFirstCutArrived(): void {
  storage()?.setItem(FIRST_CUT_KEY, "1");
}

export function formatCheckTime(value: string, language: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const locale = language.startsWith("zh") ? "zh-CN" : language.startsWith("ja") ? "ja-JP" : language.startsWith("ko") ? "ko-KR" : "en-US";
  return date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

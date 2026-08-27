import {
  APPEARANCE_STORAGE_KEY,
  normalizeAppearance,
  type DesktopTheme,
} from "./desktop-appearance";

export const TOOLS_SHELL_CLASS = "tools-shell";
export const TOOLS_DAY_CLASS = "tools-day";
export const DEFAULT_TOOLS_THEME: DesktopTheme = "low-light";

export function loadToolsTheme(): DesktopTheme {
  if (typeof window === "undefined") return DEFAULT_TOOLS_THEME;
  try {
    const raw = window.localStorage.getItem(APPEARANCE_STORAGE_KEY);
    if (!raw) return DEFAULT_TOOLS_THEME;
    return normalizeAppearance(JSON.parse(raw) as unknown).theme;
  } catch {
    return DEFAULT_TOOLS_THEME;
  }
}

export function applyToolsShell(theme: DesktopTheme = loadToolsTheme()) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.add(TOOLS_SHELL_CLASS);
  document.documentElement.classList.remove(TOOLS_DAY_CLASS);
  document.documentElement.dataset.theme = theme;
  document.body.classList.add(TOOLS_SHELL_CLASS);
  document.body.classList.remove(TOOLS_DAY_CLASS);
  document.body.dataset.theme = theme;
}

export function clearToolsShell() {
  if (typeof document === "undefined") return;
  document.documentElement.classList.remove(TOOLS_SHELL_CLASS, TOOLS_DAY_CLASS);
  document.documentElement.removeAttribute("data-theme");
  document.body.classList.remove(TOOLS_SHELL_CLASS, TOOLS_DAY_CLASS);
  document.body.removeAttribute("data-theme");
}

export function setToolsDayTheme(on: boolean) {
  if (on) applyToolsShell();
  else clearToolsShell();
}

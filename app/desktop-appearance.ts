'use client';

import { useCallback, useEffect, useLayoutEffect, useState } from 'react';

export const APPEARANCE_STORAGE_KEY = "grokCrewDesktopAppearance";
export const APPEARANCE_CHANGE_EVENT = "grok-crew-desktop-appearance-change";

export type DesktopTheme = "light" | "dark" | "low-light" | "low-dark";
export type DesktopTypeSize = "s" | "m" | "l";

export type DesktopAppearance = {
  theme: DesktopTheme;
  emphasize: boolean;
  typeSize: DesktopTypeSize;
};

export const DEFAULT_APPEARANCE: DesktopAppearance = {
  theme: "light",
  emphasize: true,
  typeSize: "m",
};

export const THEME_OPTIONS: Array<{ id: DesktopTheme; label: string; hint: string }> = [
  { id: "light", label: "라이트", hint: "지금 기본. 흰 바탕, 진한 글자." },
  { id: "dark", label: "다크", hint: "어두운 바탕, 밝은 글자." },
  { id: "low-light", label: "LOW 라이트", hint: "덜 눈부신 베이지 라이트." },
  { id: "low-dark", label: "LOW 다크", hint: "대비를 낮춘 밤 화면." },
];

export const TYPE_SIZE_OPTIONS: Array<{ id: DesktopTypeSize; label: string }> = [
  { id: "s", label: "작게" },
  { id: "m", label: "보통" },
  { id: "l", label: "크게" },
];

function isTheme(value: unknown): value is DesktopTheme {
  return value === "light" || value === "dark" || value === "low-light" || value === "low-dark";
}

function isTypeSize(value: unknown): value is DesktopTypeSize {
  return value === "s" || value === "m" || value === "l";
}

export function normalizeAppearance(value: unknown): DesktopAppearance {
  if (!value || typeof value !== "object") return { ...DEFAULT_APPEARANCE };
  const raw = value as Record<string, unknown>;
  return {
    theme: isTheme(raw.theme) ? raw.theme : DEFAULT_APPEARANCE.theme,
    emphasize: typeof raw.emphasize === "boolean" ? raw.emphasize : DEFAULT_APPEARANCE.emphasize,
    typeSize: isTypeSize(raw.typeSize) ? raw.typeSize : DEFAULT_APPEARANCE.typeSize,
  };
}

export function loadAppearance(): DesktopAppearance {
  if (typeof window === "undefined") return { ...DEFAULT_APPEARANCE };
  try {
    const raw = window.localStorage.getItem(APPEARANCE_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_APPEARANCE };
    return normalizeAppearance(JSON.parse(raw) as unknown);
  } catch {
    return { ...DEFAULT_APPEARANCE };
  }
}

export function saveAppearance(next: DesktopAppearance): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(normalizeAppearance(next)));
}

export function appearanceDataAttrs(appearance: DesktopAppearance): {
  "data-theme": DesktopTheme;
  "data-emphasize": "on" | "off";
  "data-type-size": DesktopTypeSize;
} {
  return {
    "data-theme": appearance.theme,
    "data-emphasize": appearance.emphasize ? "on" : "off",
    "data-type-size": appearance.typeSize,
  };
}

export function useDesktopAppearance() {
  const [appearance, setAppearance] = useState<DesktopAppearance>(DEFAULT_APPEARANCE);

  useLayoutEffect(() => {
    setAppearance(loadAppearance());
  }, []);

  useEffect(() => {
    const sync = () => setAppearance(loadAppearance());
    window.addEventListener(APPEARANCE_CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(APPEARANCE_CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const updateAppearance = useCallback((patch: Partial<DesktopAppearance>) => {
    setAppearance((current) => {
      const next = normalizeAppearance({ ...current, ...patch });
      saveAppearance(next);
      window.dispatchEvent(new Event(APPEARANCE_CHANGE_EVENT));
      return next;
    });
  }, []);

  return { appearance, updateAppearance };
}

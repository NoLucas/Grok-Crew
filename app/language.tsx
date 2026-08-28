'use client';

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  APP_LANGUAGES,
  LANGUAGE_CHOSEN_KEY,
  LANGUAGE_STORAGE_KEY,
  isAppLanguage,
  type AppLanguage,
} from './language-choice';

export type { AppLanguage } from './language-choice';
export {
  LANGUAGE_CHOSEN_KEY,
  LANGUAGE_STORAGE_KEY,
  hasChosenLanguage,
  isAppLanguage,
  needsLanguageGate,
} from './language-choice';

const storageKey = LANGUAGE_STORAGE_KEY;
const changeEvent = 'local-video-workspace-language-change';
const knownLanguages = APP_LANGUAGES;

type LanguageValue = { language: AppLanguage; chooseLanguage: (language: AppLanguage) => void; t: (ko: string, en: string, zh: string, ja: string) => string };
const LanguageContext = createContext<LanguageValue | null>(null);

function readLanguage(): AppLanguage {
  try {
    const stored = window.localStorage.getItem(storageKey);
    return isAppLanguage(stored) ? stored : 'ko';
  } catch { return 'ko'; }
}

function applyLanguage(language: AppLanguage) {
  document.documentElement.lang = language;
  document.documentElement.dataset.language = language;
}

export function LanguageProvider({ initialLanguage, children }: { initialLanguage: AppLanguage; children: React.ReactNode }) {
  const [language, setLanguage] = useState<AppLanguage>(initialLanguage);
  useLayoutEffect(() => { applyLanguage(language); }, [language]);
  useEffect(() => {
    const sync = () => setLanguage(readLanguage());
    window.addEventListener(changeEvent, sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener(changeEvent, sync); window.removeEventListener('storage', sync); };
  }, []);
  const chooseLanguage = useCallback((next: AppLanguage) => {
    try {
      window.localStorage.setItem(storageKey, next);
      window.localStorage.setItem(LANGUAGE_CHOSEN_KEY, '1');
      document.cookie = `${storageKey}=${next}; path=/; max-age=31536000; samesite=lax`;
    } catch { /* The current tab still changes language. */ }
    applyLanguage(next); setLanguage(next); window.dispatchEvent(new Event(changeEvent));
  }, []);
  const value = useMemo<LanguageValue>(() => ({
    language,
    chooseLanguage,
    t: (ko, en, zh, ja) => (language === 'en' ? en : language === 'zh' ? zh : language === 'ja' ? ja : ko),
  }), [language, chooseLanguage]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error('LanguageProvider is required.');
  return value;
}

export function LocalizedText({ ko, en, zh, ja }: { ko: string; en: string; zh: string; ja: string }) { const { t } = useLanguage(); return <>{t(ko, en, zh, ja)}</>; }

export function LanguageBootstrap() {
  const { language, chooseLanguage } = useLanguage();
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('lang');
    if ((knownLanguages as string[]).includes(requested ?? '') && requested !== language) chooseLanguage(requested as AppLanguage);
  }, [chooseLanguage, language]);
  return null;
}

const languageLabels: Record<AppLanguage, string> = { ko: '언어', en: 'Language', zh: '语言', ja: '言語' };

export function LanguageSwitcher() {
  const { language, chooseLanguage } = useLanguage();
  return (
    <label className="language-switcher">
      <span>{languageLabels[language]}</span>
      <select aria-label="Language / 언어 / 语言 / 言語" value={language} onChange={(event) => chooseLanguage(event.target.value as AppLanguage)}>
        <option value="ko">한국어</option>
        <option value="en">English</option>
        <option value="zh">中文</option>
        <option value="ja">日本語</option>
      </select>
    </label>
  );
}

'use client';

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react';

export type AppLanguage = 'ko' | 'en';

const storageKey = 'localVideoWorkspaceLanguage';
const changeEvent = 'local-video-workspace-language-change';

type LanguageValue = { language: AppLanguage; chooseLanguage: (language: AppLanguage) => void; t: (ko: string, en: string) => string };
const LanguageContext = createContext<LanguageValue | null>(null);

function readLanguage(): AppLanguage {
  try { return window.localStorage.getItem(storageKey) === 'en' ? 'en' : 'ko'; } catch { return 'ko'; }
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
      document.cookie = `${storageKey}=${next}; path=/; max-age=31536000; samesite=lax`;
    } catch { /* The current tab still changes language. */ }
    applyLanguage(next); setLanguage(next); window.dispatchEvent(new Event(changeEvent));
  }, []);
  const value = useMemo<LanguageValue>(() => ({ language, chooseLanguage, t: (ko, en) => language === 'en' ? en : ko }), [language, chooseLanguage]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error('LanguageProvider is required.');
  return value;
}

export function LocalizedText({ ko, en }: { ko: string; en: string }) { const { t } = useLanguage(); return <>{t(ko, en)}</>; }

export function LanguageBootstrap() {
  const { language, chooseLanguage } = useLanguage();
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('lang');
    if ((requested === 'ko' || requested === 'en') && requested !== language) chooseLanguage(requested);
  }, [chooseLanguage, language]);
  return null;
}

export function LanguageSwitcher() {
  const { language, chooseLanguage } = useLanguage();
  return <label className="language-switcher"><span>{language === 'en' ? 'Language' : '언어'}</span><select aria-label="Language / 언어" value={language} onChange={(event) => chooseLanguage(event.target.value as AppLanguage)}><option value="ko">한국어</option><option value="en">English</option></select></label>;
}

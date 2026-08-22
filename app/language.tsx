'use client';

import { useCallback, useEffect, useState } from 'react';

export type AppLanguage = 'ko' | 'en';

const storageKey = 'nohReelForgeLanguage';
const changeEvent = 'noh:language-change';

function readLanguage(): AppLanguage {
  try { return window.localStorage.getItem(storageKey) === 'en' ? 'en' : 'ko'; } catch { return 'ko'; }
}

function applyLanguage(language: AppLanguage) {
  document.documentElement.lang = language;
  document.documentElement.dataset.language = language;
}

export function useLanguage() {
  const [language, setLanguage] = useState<AppLanguage>('ko');
  useEffect(() => {
    const sync = () => { const next = readLanguage(); applyLanguage(next); setLanguage(next); };
    const timeout = window.setTimeout(sync, 0);
    window.addEventListener(changeEvent, sync);
    return () => { window.clearTimeout(timeout); window.removeEventListener(changeEvent, sync); };
  }, []);
  const chooseLanguage = useCallback((next: AppLanguage) => {
    try { window.localStorage.setItem(storageKey, next); } catch { /* The current tab still changes language. */ }
    applyLanguage(next); setLanguage(next); window.dispatchEvent(new Event(changeEvent));
  }, []);
  const t = useCallback((ko: string, en: string) => language === 'en' ? en : ko, [language]);
  return { language, chooseLanguage, t };
}

export function LanguageBootstrap() { useLanguage(); return null; }

export function LanguageSwitcher() {
  const { language, chooseLanguage } = useLanguage();
  return <label className="language-switcher"><span>{language === 'en' ? 'Language' : '언어'}</span><select aria-label="Language / 언어" value={language} onChange={(event) => chooseLanguage(event.target.value as AppLanguage)}><option value="ko">한국어</option><option value="en">English</option></select></label>;
}

export type AppLanguage = 'ko' | 'en' | 'zh' | 'ja';

export const LANGUAGE_STORAGE_KEY = 'localVideoWorkspaceLanguage';
export const LANGUAGE_CHOSEN_KEY = 'localVideoWorkspaceLanguageChosen';
export const APP_LANGUAGES: AppLanguage[] = ['ko', 'en', 'zh', 'ja'];

function storage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function isAppLanguage(value: unknown): value is AppLanguage {
  return APP_LANGUAGES.includes(String(value || '') as AppLanguage);
}

export function hasChosenLanguage(): boolean {
  const store = storage();
  if (!store) return false;
  if (store.getItem(LANGUAGE_CHOSEN_KEY) === '1') return true;
  return isAppLanguage(store.getItem(LANGUAGE_STORAGE_KEY));
}

export function needsLanguageGate(): boolean {
  return !hasChosenLanguage();
}

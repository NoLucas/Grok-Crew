'use client';

import { useCallback, useEffect, useState } from 'react';

export const NOTE_FOLDS_KEY = 'grokCrewDesktopNoteFolds';

export type NoteFoldId = 'lock' | 'status' | 'remote';
export type NoteFolds = Record<NoteFoldId, boolean>;

export const DEFAULT_NOTE_FOLDS: NoteFolds = {
  lock: false,
  status: false,
  remote: false,
};

export function normalizeNoteFolds(value: unknown): NoteFolds {
  if (!value || typeof value !== 'object') return { ...DEFAULT_NOTE_FOLDS };
  const raw = value as Record<string, unknown>;
  return {
    lock: typeof raw.lock === 'boolean' ? raw.lock : DEFAULT_NOTE_FOLDS.lock,
    status: typeof raw.status === 'boolean' ? raw.status : DEFAULT_NOTE_FOLDS.status,
    remote: typeof raw.remote === 'boolean' ? raw.remote : DEFAULT_NOTE_FOLDS.remote,
  };
}

export function loadNoteFolds(): NoteFolds {
  if (typeof window === 'undefined') return { ...DEFAULT_NOTE_FOLDS };
  try {
    const raw = window.localStorage.getItem(NOTE_FOLDS_KEY);
    if (!raw) return { ...DEFAULT_NOTE_FOLDS };
    return normalizeNoteFolds(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_NOTE_FOLDS };
  }
}

export function saveNoteFolds(next: NoteFolds): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(NOTE_FOLDS_KEY, JSON.stringify(normalizeNoteFolds(next)));
}

export function statusNoteOpen(open: boolean, studioState: string): boolean {
  if (studioState === 'error' || studioState === 'loading') return true;
  return open;
}

export function useDesktopNoteFolds() {
  const [folds, setFolds] = useState<NoteFolds>({ ...DEFAULT_NOTE_FOLDS });

  useEffect(() => {
    setFolds(loadNoteFolds());
  }, []);

  const setFold = useCallback((id: NoteFoldId, open: boolean) => {
    setFolds((current) => {
      const next = normalizeNoteFolds({ ...current, [id]: open });
      saveNoteFolds(next);
      return next;
    });
  }, []);

  const toggleFold = useCallback((id: NoteFoldId) => {
    setFolds((current) => {
      const next = normalizeNoteFolds({ ...current, [id]: !current[id] });
      saveNoteFolds(next);
      return next;
    });
  }, []);

  return { folds, setFold, toggleFold };
}

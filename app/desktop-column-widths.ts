'use client';

import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';

export const COLUMN_WIDTHS_KEY = 'grokCrewDesktopColumns';
export const SIDEBAR_DEFAULT = 245;
export const SIDEBAR_MIN = 196;
export const SIDEBAR_MAX = 320;
export const INSPECTOR_DEFAULT = 290;
export const INSPECTOR_MIN = 240;
export const INSPECTOR_MAX = 380;
export const CENTER_MIN = 400;
export const COLUMN_HANDLE = 6;
export const COLUMN_STEP = 16;

export type DesktopColumnWidths = {
  sidebar: number;
  inspector: number;
};

export type ColumnSide = 'sidebar' | 'inspector';

export function clampSidebar(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return SIDEBAR_DEFAULT;
  return Math.round(Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, numeric)));
}

export function clampInspector(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return INSPECTOR_DEFAULT;
  return Math.round(Math.min(INSPECTOR_MAX, Math.max(INSPECTOR_MIN, numeric)));
}

export function normalizeColumnWidths(value: unknown): DesktopColumnWidths {
  if (!value || typeof value !== 'object') {
    return { sidebar: SIDEBAR_DEFAULT, inspector: INSPECTOR_DEFAULT };
  }
  const raw = value as Record<string, unknown>;
  return {
    sidebar: clampSidebar(raw.sidebar),
    inspector: clampInspector(raw.inspector),
  };
}

export function applySidebarDelta(current: number, deltaPx: number): number {
  return clampSidebar(current + deltaPx);
}

export function applyInspectorDelta(current: number, deltaPx: number): number {
  return clampInspector(current - deltaPx);
}

export function fitColumnWidths(
  widths: DesktopColumnWidths,
  bodyWidth: number,
  inspectorVisible: boolean,
): DesktopColumnWidths {
  const sidebar = clampSidebar(widths.sidebar);
  const inspector = clampInspector(widths.inspector);
  if (!Number.isFinite(bodyWidth) || bodyWidth <= 0) {
    return { sidebar, inspector };
  }
  const handles = inspectorVisible ? COLUMN_HANDLE * 2 : COLUMN_HANDLE;
  const reservedInspector = inspectorVisible ? inspector : 0;
  const sidebarRoom = bodyWidth - handles - CENTER_MIN - reservedInspector;
  const fittedSidebar = clampSidebar(Math.min(sidebar, Math.max(SIDEBAR_MIN, sidebarRoom)));
  if (!inspectorVisible) return { sidebar: fittedSidebar, inspector };
  const inspectorRoom = bodyWidth - handles - CENTER_MIN - fittedSidebar;
  return {
    sidebar: fittedSidebar,
    inspector: clampInspector(Math.min(inspector, Math.max(INSPECTOR_MIN, inspectorRoom))),
  };
}

export function loadColumnWidths(): DesktopColumnWidths {
  if (typeof window === 'undefined') {
    return { sidebar: SIDEBAR_DEFAULT, inspector: INSPECTOR_DEFAULT };
  }
  try {
    const raw = window.localStorage.getItem(COLUMN_WIDTHS_KEY);
    if (!raw) return { sidebar: SIDEBAR_DEFAULT, inspector: INSPECTOR_DEFAULT };
    return normalizeColumnWidths(JSON.parse(raw));
  } catch {
    return { sidebar: SIDEBAR_DEFAULT, inspector: INSPECTOR_DEFAULT };
  }
}

export function saveColumnWidths(next: DesktopColumnWidths): void {
  if (typeof window === 'undefined') return;
  const widths = normalizeColumnWidths(next);
  window.localStorage.setItem(COLUMN_WIDTHS_KEY, JSON.stringify(widths));
}

export function columnStyleVars(widths: DesktopColumnWidths): Record<string, string> {
  return {
    '--desktop-sidebar-w': `${widths.sidebar}px`,
    '--desktop-inspector-w': `${widths.inspector}px`,
  };
}

export function useDesktopColumnWidths(inspectorVisible: boolean) {
  const [widths, setWidths] = useState<DesktopColumnWidths>({
    sidebar: SIDEBAR_DEFAULT,
    inspector: INSPECTOR_DEFAULT,
  });
  const [dragging, setDragging] = useState<ColumnSide | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{
    side: ColumnSide;
    pointerId: number;
    startX: number;
    sidebar: number;
    inspector: number;
  } | null>(null);

  useEffect(() => {
    setWidths(loadColumnWidths());
  }, []);

  const commit = useCallback((next: DesktopColumnWidths) => {
    const fitted = fitColumnWidths(next, bodyRef.current?.clientWidth ?? 0, inspectorVisible);
    setWidths(fitted);
    saveColumnWidths(fitted);
  }, [inspectorVisible]);

  const liveFromDrag = useCallback((clientX: number) => {
    const current = drag.current;
    if (!current) return widths;
    const dx = clientX - current.startX;
    return fitColumnWidths({
      sidebar: current.side === 'sidebar' ? applySidebarDelta(current.sidebar, dx) : current.sidebar,
      inspector: current.side === 'inspector' ? applyInspectorDelta(current.inspector, dx) : current.inspector,
    }, bodyRef.current?.clientWidth ?? 0, inspectorVisible);
  }, [inspectorVisible, widths]);

  const onHandlePointerDown = useCallback((side: ColumnSide) => (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    drag.current = {
      side,
      pointerId: event.pointerId,
      startX: event.clientX,
      sidebar: widths.sidebar,
      inspector: widths.inspector,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(side);
  }, [widths]);

  const onHandlePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    setWidths(liveFromDrag(event.clientX));
  }, [liveFromDrag]);

  const onHandlePointerUp = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    drag.current = null;
    setDragging(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    commit(liveFromDrag(event.clientX));
  }, [commit, liveFromDrag]);

  const onHandleKeyDown = useCallback((side: ColumnSide) => (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const dir = event.key === 'ArrowRight' ? COLUMN_STEP : -COLUMN_STEP;
    commit({
      sidebar: side === 'sidebar' ? applySidebarDelta(widths.sidebar, dir) : widths.sidebar,
      inspector: side === 'inspector' ? applyInspectorDelta(widths.inspector, dir) : widths.inspector,
    });
  }, [commit, widths]);

  return {
    widths,
    dragging,
    bodyRef,
    onHandlePointerDown,
    onHandlePointerMove,
    onHandlePointerUp,
    onHandleKeyDown,
  };
}

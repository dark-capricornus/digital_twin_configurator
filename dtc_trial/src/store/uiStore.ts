import { create } from 'zustand';
import type { ID } from '../types';

export type GizmoMode = 'translate' | 'rotate';
export type BottomTab = 'library' | 'tags' | 'issues';
export type ViewRequest = { kind: 'fit' | 'top' | 'focus'; n: number };

export interface Toast {
  id: number;
  kind: 'info' | 'success' | 'error';
  text: string;
}

interface UIState {
  gizmoMode: GizmoMode;
  snap: boolean;
  showLabels: boolean;
  rightTab: 'props' | 'tags';
  bottomOpen: boolean;
  bottomTab: BottomTab;
  /** Docked panel sizes in px, adjusted with the splitters */
  rightWidth: number;
  bottomHeight: number;
  hierarchyHeight: number;
  settingsOpen: boolean;
  /** null = closed, 'new' = create, otherwise the type id being edited */
  typeEditor: ID | 'new' | null;
  viewRequest: ViewRequest | null;
  toasts: Toast[];
  set: (patch: Partial<Omit<UIState, 'set' | 'requestView' | 'toast' | 'dismiss'>>) => void;
  requestView: (kind: ViewRequest['kind']) => void;
  toast: (text: string, kind?: Toast['kind']) => void;
  dismiss: (id: number) => void;
}

let toastSeq = 0;

export const useUI = create<UIState>((set) => ({
  gizmoMode: 'translate',
  snap: true,
  showLabels: true,
  rightTab: 'props',
  bottomOpen: true,
  bottomTab: 'library',
  rightWidth: 360,
  bottomHeight: 260,
  hierarchyHeight: 300,
  settingsOpen: false,
  typeEditor: null,
  viewRequest: null,
  toasts: [],
  set: (patch) => set(patch),
  requestView: (kind) => set((s) => ({ viewRequest: { kind, n: (s.viewRequest?.n ?? 0) + 1 } })),
  toast: (text, kind = 'info') => {
    const id = ++toastSeq;
    set((s) => ({ toasts: [...s.toasts, { id, kind, text }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3500);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = (text: string, kind?: Toast['kind']) => useUI.getState().toast(text, kind);

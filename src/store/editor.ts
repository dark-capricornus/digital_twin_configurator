import { create } from 'zustand';

export type GizmoMode = 'translate' | 'rotate' | 'scale' | 'select' | 'annotate' | 'measure';

export type EditorMode = 'object' | 'preview';

export interface EditorState {
  editorMode: EditorMode;
  selectedNodeId: string | null;
  activeGizmoMode: GizmoMode;
  isGridVisible: boolean;
  
  // Panel Visibility
  panelVisibility: {
    assets: boolean;
    hierarchy: boolean;
    inspector: boolean;
  };
  
  // Actions
  setEditorMode: (mode: EditorMode) => void;
  selectNode: (id: string | null) => void;
  setGizmoMode: (mode: GizmoMode) => void;
  toggleGrid: () => void;
  togglePanel: (panel: 'assets' | 'hierarchy' | 'inspector') => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  editorMode: 'object',
  selectedNodeId: null,
  activeGizmoMode: 'select',
  isGridVisible: true,
  panelVisibility: {
    assets: true,
    hierarchy: true,
    inspector: true,
  },

  setEditorMode: (mode) => set({ editorMode: mode }),
  selectNode: (id) => set({ selectedNodeId: id }),
  setGizmoMode: (mode) => set({ activeGizmoMode: mode }),
  toggleGrid: () => set((state) => ({ isGridVisible: !state.isGridVisible })),
  togglePanel: (panel) => set((state) => ({
    panelVisibility: {
      ...state.panelVisibility,
      [panel]: !state.panelVisibility[panel]
    }
  })),
}));

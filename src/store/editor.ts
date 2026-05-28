import { create } from 'zustand';
import { ToolManager } from '../core/tools/ToolManager';

export type GizmoMode = 'translate' | 'rotate' | 'scale' | 'select' | 'annotate' | 'measure' | 'cursor' | 'transform' | 'add';

export type EditorMode = 'object' | 'preview';

export interface EditorState {
  editorMode: EditorMode;
  selectedNodeId: string | null;
  activeGizmoMode: GizmoMode;
  isGridVisible: boolean;
  
  // Advanced Tool States
  cursorPosition: [number, number, number];
  annotations: Array<{ id: string; points: Array<[number, number, number]> }>;
  measurementStart: [number, number, number] | null;
  measurementEnd: [number, number, number] | null;
  
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
  
  // Tool Actions
  setCursorPosition: (pos: [number, number, number]) => void;
  addAnnotation: (points: Array<[number, number, number]>) => void;
  clearAnnotations: () => void;
  setMeasurementPoints: (start: [number, number, number] | null, end: [number, number, number] | null) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  editorMode: 'object',
  selectedNodeId: null,
  activeGizmoMode: 'select',
  isGridVisible: true,
  
  cursorPosition: [0, 0, 0],
  annotations: [],
  measurementStart: null,
  measurementEnd: null,
  
  panelVisibility: {
    assets: true,
    hierarchy: true,
    inspector: true,
  },

  setEditorMode: (mode) => set({ editorMode: mode }),
  selectNode: (id) => set({ selectedNodeId: id }),
  setGizmoMode: (mode) => {
    set({ activeGizmoMode: mode });
    ToolManager.setActiveTool(mode);
  },
  toggleGrid: () => set((state) => ({ isGridVisible: !state.isGridVisible })),
  togglePanel: (panel) => set((state) => ({
    panelVisibility: {
      ...state.panelVisibility,
      [panel]: !state.panelVisibility[panel]
    }
  })),
  
  setCursorPosition: (pos) => set({ cursorPosition: pos }),
  addAnnotation: (points) => set((state) => ({
    annotations: [...state.annotations, { id: Math.random().toString(36).substr(2, 9), points }]
  })),
  clearAnnotations: () => set({ annotations: [] }),
  setMeasurementPoints: (start, end) => set({ measurementStart: start, measurementEnd: end }),
}));

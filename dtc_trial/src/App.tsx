import { useEffect } from 'react';
import { BottomPanel } from './components/panels/BottomPanel';
import { HierarchyTree, confirmDelete } from './components/panels/HierarchyTree';
import { Inspector } from './components/panels/Inspector';
import { SettingsDialog } from './components/dialogs/SettingsDialog';
import { StartScreen } from './components/dialogs/StartScreen';
import { TypeEditor } from './components/dialogs/TypeEditor';
import { MenuBar } from './components/MenuBar';
import { Splitter } from './components/ui/Layout';
import { Viewport } from './components/viewport/Viewport';
import { ViewportHeader } from './components/viewport/ViewportHeader';
import { actions, useProject } from './store/projectStore';
import { useUI } from './store/uiStore';
import { saveProject } from './lib/persistence';
import { resolveSelection } from './lib/tree';

/** Debounced autosave to IndexedDB whenever the project changes. */
function useAutosave() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsub = useProject.subscribe((s, prev) => {
      if (!s.project || s.project === prev.project || s.project.id !== prev.project?.id) return;
      clearTimeout(timer);
      timer = setTimeout(async () => {
        const p = useProject.getState().project;
        if (!p) return;
        useProject.getState().setSaveState('saving');
        try {
          await saveProject(p);
          if (useProject.getState().project === p) useProject.getState().setSaveState('saved');
        } catch (e) {
          console.error(e);
          useProject.getState().setSaveState('error');
        }
      }, 600);
    });
    const onUnload = (e: BeforeUnloadEvent) => {
      if (useProject.getState().saveState !== 'saved') e.preventDefault();
    };
    window.addEventListener('beforeunload', onUnload);
    return () => {
      unsub();
      clearTimeout(timer);
      window.removeEventListener('beforeunload', onUnload);
    };
  }, []);
}

function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const typing = el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable;
      const ui = useUI.getState();
      if (ui.settingsOpen || ui.typeEditor) return;
      const { project, selection, undo, redo } = useProject.getState();
      if (!project) return;
      const mod = e.ctrlKey || e.metaKey;

      if (mod && e.key.toLowerCase() === 'z' && !typing) {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      } else if (mod && e.key.toLowerCase() === 'y' && !typing) {
        e.preventDefault();
        redo();
      } else if (typing) {
        return;
      } else if (mod && e.key.toLowerCase() === 'd' && selection) {
        e.preventDefault();
        actions.duplicateNode(selection);
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selection && selection.kind !== 'plant') {
        const node = resolveSelection(project, selection);
        if (node) confirmDelete(selection, node.name);
      } else if (e.key === 'w' || e.key === 'W') {
        ui.set({ gizmoMode: 'translate' });
      } else if (e.key === 'e' || e.key === 'E') {
        ui.set({ gizmoMode: 'rotate' });
      } else if (e.key === 'f' || e.key === 'F') {
        ui.requestView('focus');
      } else if (e.key === 'Escape') {
        useProject.getState().select({ kind: 'plant', id: project.plant.id });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

function Toasts() {
  const toasts = useUI((s) => s.toasts);
  const dismiss = useUI((s) => s.dismiss);
  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind}`} onClick={() => dismiss(t.id)}>
          {t.text}
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const projectId = useProject((s) => s.project?.id);
  const settingsOpen = useUI((s) => s.settingsOpen);
  const typeEditor = useUI((s) => s.typeEditor);
  const { bottomOpen, bottomHeight, rightWidth, hierarchyHeight, set: setUI } = useUI();
  useAutosave();
  useShortcuts();

  if (!projectId)
    return (
      <>
        <StartScreen />
        <Toasts />
      </>
    );

  return (
    <div className="app">
      <MenuBar />
      <div className="workspace">
        <main className="center">
          <div className="center-top">
            <ViewportHeader />
            <Viewport />
          </div>
          {bottomOpen && <Splitter direction="vertical" size={bottomHeight} min={120} max={560} invert onResize={(v) => setUI({ bottomHeight: v })} />}
          <div className="center-bottom" style={bottomOpen ? { height: bottomHeight } : undefined}>
            <BottomPanel />
          </div>
        </main>
        <Splitter direction="horizontal" size={rightWidth} min={260} max={640} invert onResize={(v) => setUI({ rightWidth: v })} />
        <aside className="right" style={{ width: rightWidth }}>
          <div className="right-top" style={{ height: hierarchyHeight }}>
            <HierarchyTree />
          </div>
          <Splitter direction="vertical" size={hierarchyHeight} min={120} max={600} onResize={(v) => setUI({ hierarchyHeight: v })} />
          <div className="right-bottom">
            <Inspector />
          </div>
        </aside>
      </div>
      {settingsOpen && <SettingsDialog />}
      {typeEditor && <TypeEditor key={typeEditor} />}
      <Toasts />
    </div>
  );
}

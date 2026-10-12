import { useProject, actions } from '../store/projectStore';
import { useSim } from '../store/simStore';
import { toast, useUI } from '../store/uiStore';
import { download, fileSlug, runtimeManifest, tagListCsv } from '../lib/exporters';
import { saveProject } from '../lib/persistence';
import { resolveSelection } from '../lib/tree';
import { validateProject } from '../lib/validation';
import { confirmDelete } from './panels/HierarchyTree';
import { MenuBarMenus, type MenuItem } from './ui/Layout';

function exportAs(kind: 'json' | 'csv' | 'manifest') {
  const p = useProject.getState().project!;
  const slug = fileSlug(p.name);
  if (kind === 'json') download(`${slug}.dtc.json`, JSON.stringify(p, null, 2));
  if (kind === 'csv') download(`${slug}_tags.csv`, tagListCsv(p), 'text/csv');
  if (kind === 'manifest') {
    const errors = validateProject(p).filter((i) => i.severity === 'error').length;
    if (errors && !window.confirm(`The twin has ${errors} validation error(s). Export the runtime manifest anyway?`)) return;
    download(`${slug}_runtime.json`, JSON.stringify(runtimeManifest(p), null, 2));
  }
}

export async function closeTwin() {
  useSim.getState().stop();
  if (useProject.getState().saveState !== 'saved') {
    try {
      await saveProject(useProject.getState().project!);
    } catch {
      if (!window.confirm('Could not save the latest changes. Close anyway?')) return;
    }
  }
  useProject.getState().close();
}

export function toggleSimulation() {
  const sim = useSim.getState();
  if (sim.running) sim.stop();
  else {
    sim.start();
    toast('Preview with simulated values — nothing is written to the twin', 'info');
  }
}

export function MenuBar() {
  const project = useProject((s) => s.project)!;
  const selection = useProject((s) => s.selection);
  const saveState = useProject((s) => s.saveState);
  const canUndo = useProject((s) => s.past.length > 0);
  const canRedo = useProject((s) => s.future.length > 0);
  const running = useSim((s) => s.running);
  const ui = useUI();
  const hasNode = !!selection && selection.kind !== 'plant';

  const openBottom = (tab: 'library' | 'tags' | 'issues') => ui.set({ bottomOpen: true, bottomTab: tab });

  const menus: { title: string; items: MenuItem[] }[] = [
    {
      title: 'File',
      items: [
        { label: 'Project settings…', onClick: () => ui.set({ settingsOpen: true }) },
        { separator: true },
        { label: 'Export twin configuration (.json)', onClick: () => exportAs('json') },
        { label: 'Export tag list (.csv)', onClick: () => exportAs('csv') },
        { label: 'Export runtime manifest (.json)', onClick: () => exportAs('manifest') },
        { separator: true },
        { label: 'Close twin', onClick: closeTwin },
      ],
    },
    {
      title: 'Edit',
      items: [
        { label: 'Undo', shortcut: 'Ctrl+Z', disabled: !canUndo, onClick: () => useProject.getState().undo() },
        { label: 'Redo', shortcut: 'Ctrl+Shift+Z', disabled: !canRedo, onClick: () => useProject.getState().redo() },
        { separator: true },
        { label: 'Add department', onClick: () => actions.addDepartment() },
        { label: 'Duplicate', shortcut: 'Ctrl+D', disabled: !hasNode, onClick: () => selection && actions.duplicateNode(selection) },
        {
          label: 'Delete',
          shortcut: 'Del',
          danger: true,
          disabled: !hasNode,
          onClick: () => {
            const node = selection && resolveSelection(project, selection);
            if (selection && node) confirmDelete(selection, node.name);
          },
        },
      ],
    },
    {
      title: 'View',
      items: [
        { label: 'Fit plant', onClick: () => ui.requestView('fit') },
        { label: 'Top view', onClick: () => ui.requestView('top') },
        { label: 'Focus selection', shortcut: 'F', disabled: !hasNode, onClick: () => ui.requestView('focus') },
        { separator: true },
        { label: 'Labels', checked: ui.showLabels, onClick: () => ui.set({ showLabels: !ui.showLabels }) },
        { label: 'Snap to grid', checked: ui.snap, onClick: () => ui.set({ snap: !ui.snap }) },
      ],
    },
    {
      title: 'Tools',
      items: [
        { label: 'Move', shortcut: 'W', checked: ui.gizmoMode === 'translate', onClick: () => ui.set({ gizmoMode: 'translate' }) },
        { label: 'Rotate', shortcut: 'E', checked: ui.gizmoMode === 'rotate', onClick: () => ui.set({ gizmoMode: 'rotate' }) },
        { separator: true },
        { label: running ? 'Stop simulation preview' : 'Simulate bindings', onClick: toggleSimulation },
        { label: 'New machine type…', onClick: () => ui.set({ typeEditor: 'new' }) },
      ],
    },
    {
      title: 'Window',
      items: [
        { label: 'Library', checked: ui.bottomOpen && ui.bottomTab === 'library', onClick: () => openBottom('library') },
        { label: 'Tag registry', checked: ui.bottomOpen && ui.bottomTab === 'tags', onClick: () => openBottom('tags') },
        { label: 'Validation', checked: ui.bottomOpen && ui.bottomTab === 'issues', onClick: () => openBottom('issues') },
        { label: 'Bottom panel', checked: ui.bottomOpen, onClick: () => ui.set({ bottomOpen: !ui.bottomOpen }) },
        { separator: true },
        { label: 'Properties', checked: ui.rightTab === 'props', onClick: () => ui.set({ rightTab: 'props' }) },
        { label: 'Tags', checked: ui.rightTab === 'tags', onClick: () => ui.set({ rightTab: 'tags' }) },
      ],
    },
  ];

  const saveLabel = { saved: 'Saved', saving: 'Saving…', unsaved: 'Unsaved', error: 'Save failed' }[saveState];

  return (
    <header className="menubar">
      <button className="menubar-brand" onClick={closeTwin} title="Back to all twins">
        <svg width="14" height="14" viewBox="0 0 32 32" aria-hidden>
          <path d="M8 22 16 8l8 14z" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
        </svg>
      </button>
      <MenuBarMenus menus={menus} />
      <span className="spacer" />
      <span className={`menubar-status ${saveState}`}>{saveLabel}</span>
      <span className="menubar-divider" />
      <span className="menubar-title" title={[project.client, project.industry].filter(Boolean).join(' · ')}>
        {project.name}
      </span>
    </header>
  );
}

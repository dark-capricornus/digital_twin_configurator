import { ChevronDown, ChevronRight, Copy, Cpu, Factory, LayoutGrid, ListTree, Plus, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Selection } from '../../types';
import { actions, useProject } from '../../store/projectStore';
import { useUI } from '../../store/uiStore';
import { validateProject } from '../../lib/validation';
import { PanelHeader } from '../ui/Layout';

export function confirmDelete(sel: Selection, name: string) {
  const what = sel.kind === 'department' ? `department "${name}" and all its machines` : `machine "${name}"`;
  if (window.confirm(`Delete ${what}? You can undo with Ctrl+Z.`)) actions.deleteNode(sel);
}

export function HierarchyTree() {
  const project = useProject((s) => s.project)!;
  const selection = useProject((s) => s.selection);
  const select = useProject((s) => s.select);
  const setUI = useUI((s) => s.set);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [q, setQ] = useState('');

  const issueNodes = useMemo(() => {
    const map = new Map<string, 'error' | 'warning'>();
    for (const i of validateProject(project)) {
      if (!i.target || i.severity === 'info') continue;
      if (map.get(i.target.id) !== 'error') map.set(i.target.id, i.severity);
    }
    return map;
  }, [project]);

  const query = q.trim().toLowerCase();
  const matches = (name: string, code: string) => !query || name.toLowerCase().includes(query) || code.toLowerCase().includes(query);

  const isSel = (kind: Selection['kind'], id: string) => selection?.kind === kind && selection.id === id;
  const flag = (id: string) => {
    const s = issueNodes.get(id);
    return s ? <span className={`issue-dot ${s}`} title={`Has ${s}s — see Validation`} /> : null;
  };

  const { plant } = project;

  return (
    <div className="tree">
      <PanelHeader
        icon={<ListTree size={13} />}
        title="Hierarchy"
        actions={
          <button className="icon-btn sm" onClick={() => actions.addDepartment()} title="Add department">
            <Plus size={14} />
          </button>
        }
      />
      <div className="panel-filter">
        <div className="search">
          <Search size={12} />
          <input placeholder="Filter nodes…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div className="tree-body">
        <div className={`tree-row level-0 ${isSel('plant', plant.id) ? 'selected' : ''}`} onClick={() => select({ kind: 'plant', id: plant.id })}>
          <Factory size={15} className="ico plant" />
          <span className="tree-name">{plant.name}</span>
          <span className="tree-code">{plant.code}</span>
          {flag(plant.id)}
        </div>

        {plant.departments.map((dept) => {
          const visibleMachines = dept.machines.filter((m) => matches(m.name, m.code));
          if (query && !matches(dept.name, dept.code) && visibleMachines.length === 0) return null;
          const open = !collapsed[dept.id] || !!query;
          const dsel: Selection = { kind: 'department', id: dept.id };
          return (
            <div key={dept.id}>
              <div className={`tree-row level-1 ${isSel('department', dept.id) ? 'selected' : ''}`} onClick={() => select(dsel)}>
                <button
                  className="twisty"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCollapsed((c) => ({ ...c, [dept.id]: open }));
                  }}
                >
                  {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                <LayoutGrid size={14} className="ico" style={{ color: dept.color }} />
                <span className="tree-name">{dept.name}</span>
                <span className="tree-count">{dept.machines.length}</span>
                {flag(dept.id)}
                <span className="row-actions">
                  <button
                    title="Add machine from library"
                    onClick={(e) => {
                      e.stopPropagation();
                      select(dsel);
                      setUI({ bottomOpen: true, bottomTab: 'library' });
                    }}
                  >
                    <Plus size={13} />
                  </button>
                  <button title="Duplicate" onClick={(e) => (e.stopPropagation(), actions.duplicateNode(dsel))}>
                    <Copy size={13} />
                  </button>
                  <button title="Delete" onClick={(e) => (e.stopPropagation(), confirmDelete(dsel, dept.name))}>
                    <Trash2 size={13} />
                  </button>
                </span>
              </div>

              {open &&
                (query ? visibleMachines : dept.machines).map((m) => {
                  const msel: Selection = { kind: 'machine', id: m.id };
                  return (
                    <div key={m.id} className={`tree-row level-2 ${isSel('machine', m.id) ? 'selected' : ''}`} onClick={() => select(msel)}>
                      <Cpu size={13} className="ico" style={{ color: m.model.color }} />
                      <span className="tree-name">{m.name}</span>
                      <span className="tree-code">{m.code}</span>
                      {flag(m.id)}
                      <span className="row-actions">
                        <button title="Duplicate" onClick={(e) => (e.stopPropagation(), actions.duplicateNode(msel))}>
                          <Copy size={13} />
                        </button>
                        <button title="Delete" onClick={(e) => (e.stopPropagation(), confirmDelete(msel, m.name))}>
                          <Trash2 size={13} />
                        </button>
                      </span>
                    </div>
                  );
                })}
              {open && dept.machines.length === 0 && !query && <div className="tree-empty">No machines — drag one from the Library</div>}
            </div>
          );
        })}
        {plant.departments.length === 0 && <div className="tree-empty">No departments yet. Click + above.</div>}
      </div>
    </div>
  );
}

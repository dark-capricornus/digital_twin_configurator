import { Box, FileBox, Pencil, Plus } from 'lucide-react';
import { useMemo } from 'react';
import type { MachineType } from '../../types';
import { PRIMITIVES } from '../../types';
import { actions, useProject } from '../../store/projectStore';
import { toast, useUI } from '../../store/uiStore';
import { findMachine } from '../../lib/tree';
import { DRAG_MIME } from '../viewport/Viewport';

/** The department new machines go into when added with "+" rather than dragged. */
export function useTargetDepartment() {
  return useProject((s) => {
    const p = s.project!;
    const sel = s.selection;
    if (sel?.kind === 'department') return p.plant.departments.find((d) => d.id === sel.id);
    if (sel?.kind === 'machine') return findMachine(p, sel.id)?.dept;
    return undefined;
  });
}

const primitiveLabel = (t: MachineType) =>
  t.model.source === 'gltf' ? 'Imported GLB' : (PRIMITIVES.find((p) => p.kind === t.model.primitive)?.label ?? t.model.primitive);

/** Machine-type library shown as an asset list. Rows drag onto department zones. */
export function LibraryPanel({ query }: { query: string }) {
  const library = useProject((s) => s.project!.library);
  const departments = useProject((s) => s.project!.plant.departments);
  const target = useTargetDepartment();
  const setUI = useUI((s) => s.set);

  const usage = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of departments) for (const x of d.machines) if (x.typeId) m.set(x.typeId, (m.get(x.typeId) ?? 0) + 1);
    return m;
  }, [departments]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return library
      .filter((t) => !q || t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q))
      .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  }, [library, query]);

  const add = (t: MachineType) => {
    if (!target) {
      toast('Select a department first, or drag the machine onto a zone', 'error');
      return;
    }
    actions.addMachine(target.id, t.id);
  };

  return (
    <div className="table-wrap">
      <table className="table assets">
        <thead>
          <tr>
            <th>Name</th>
            <th>Category</th>
            <th>Model</th>
            <th>Size (m)</th>
            <th>Tags</th>
            <th>In use</th>
            <th className="actions-col">
              {target ? (
                <span className="target-hint">
                  + adds to <b style={{ color: target.color }}>{target.name}</b>
                </span>
              ) : (
                <span className="target-hint">Drag onto a zone</span>
              )}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr
              key={t.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(DRAG_MIME, t.id);
                e.dataTransfer.effectAllowed = 'copy';
              }}
              onDoubleClick={() => setUI({ typeEditor: t.id })}
              title={`${t.description}\nDrag onto a department zone · double-click to edit`}
            >
              <td className="name-cell">
                {t.model.source === 'gltf' ? <FileBox size={14} className="asset-ico glb" /> : <Box size={14} className="asset-ico" style={{ color: t.model.color }} />}
                <span>{t.name}</span>
              </td>
              <td className="dim">{t.category}</td>
              <td className="dim">{primitiveLabel(t)}</td>
              <td className="mono dim">{t.model.size.map((v) => v.toFixed(1)).join(' × ')}</td>
              <td className="mono">{t.tagTemplates.length}</td>
              <td className="mono dim">{usage.get(t.id) ?? 0}</td>
              <td className="actions-col">
                <span className="row-tools">
                  <button className="icon-btn sm" onClick={() => setUI({ typeEditor: t.id })} title="Edit type">
                    <Pencil size={12} />
                  </button>
                  <button className="icon-btn sm accent" onClick={() => add(t)} title="Add to selected department">
                    <Plus size={14} />
                  </button>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <div className="tree-empty">No machine types match.</div>}
    </div>
  );
}

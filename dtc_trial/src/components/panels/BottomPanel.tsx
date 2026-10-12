import { AlertCircle, AlertTriangle, ChevronDown, ChevronUp, Info, Library, Plus, Search, ShieldCheck, Tags } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useProject } from '../../store/projectStore';
import { useSim } from '../../store/simStore';
import { useUI, type BottomTab } from '../../store/uiStore';
import { flattenTags } from '../../lib/tags';
import { validateProject, type Severity } from '../../lib/validation';
import { LibraryPanel } from './LibraryPanel';

type Scope = 'all' | 'selection';

function TagRegistry({ query, scope }: { query: string; scope: Scope }) {
  const project = useProject((s) => s.project)!;
  const selection = useProject((s) => s.selection);
  const select = useProject((s) => s.select);
  const setUI = useUI((s) => s.set);
  const simValues = useSim((s) => s.values);
  const simRunning = useSim((s) => s.running);

  const all = useMemo(() => flattenTags(project), [project]);
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((f) => {
      if (scope === 'selection' && selection) {
        const inScope =
          selection.kind === 'plant' ||
          f.nodeId === selection.id ||
          (selection.kind === 'department' && f.dept?.id === selection.id);
        if (!inScope) return false;
      }
      if (!q) return true;
      return (
        f.path.toLowerCase().includes(q) ||
        f.tag.dataType.toLowerCase().includes(q) ||
        f.tag.category.includes(q) ||
        f.address.toLowerCase().includes(q) ||
        (f.connection?.name.toLowerCase().includes(q) ?? false)
      );
    });
  }, [all, query, scope, selection]);

  const fmt = (v: unknown) => (v === undefined ? '' : typeof v === 'number' ? v.toFixed(2) : String(v));

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Tag path</th>
            <th>Type</th>
            <th>Unit</th>
            <th>Access</th>
            <th>Category</th>
            <th>Connection</th>
            <th>Address</th>
            <th>Binding</th>
            {simRunning && <th>Sim value</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((f) => (
            <tr
              key={f.tag.id}
              className={selection?.id === f.nodeId ? 'hl' : ''}
              onClick={() => {
                select({ kind: f.nodeKind, id: f.nodeId });
                setUI({ rightTab: 'tags' });
              }}
            >
              <td className="mono">{f.path}</td>
              <td>{f.tag.dataType}</td>
              <td>{f.tag.unit}</td>
              <td>{f.tag.access}</td>
              <td className="dim">{f.tag.category}</td>
              <td>{f.connection ? f.connection.name : <span className="warn-text">none</span>}</td>
              <td className={`mono ${f.addressIsGenerated ? 'dim' : ''}`}>{f.address}</td>
              <td>{f.tag.binding.kind !== 'none' && <span className={`bind-badge ${f.tag.binding.kind}`}>{f.tag.binding.kind}</span>}</td>
              {simRunning && <td className="mono">{fmt(simValues[f.tag.id])}</td>}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <div className="tree-empty">No tags match.</div>}
    </div>
  );
}

const ICON: Record<Severity, React.ReactNode> = {
  error: <AlertCircle size={13} />,
  warning: <AlertTriangle size={13} />,
  info: <Info size={13} />,
};

function ValidationList() {
  const project = useProject((s) => s.project)!;
  const select = useProject((s) => s.select);
  const issues = useMemo(() => validateProject(project), [project]);
  if (!issues.length) return <div className="tree-empty ok">✓ No issues — this twin is ready to hand over.</div>;
  return (
    <div className="issues">
      {issues.map((i) => (
        <div key={i.id} className={`issue ${i.severity}`} onClick={() => i.target && select(i.target)}>
          {ICON[i.severity]}
          <span>{i.message}</span>
        </div>
      ))}
    </div>
  );
}

const TABS: { id: BottomTab; label: string; icon: React.ReactNode }[] = [
  { id: 'library', label: 'Library', icon: <Library size={13} /> },
  { id: 'tags', label: 'Tag registry', icon: <Tags size={13} /> },
  { id: 'issues', label: 'Validation', icon: <ShieldCheck size={13} /> },
];

export function BottomPanel() {
  const { bottomOpen, bottomTab, set } = useUI();
  const project = useProject((s) => s.project)!;
  const [queries, setQueries] = useState<Record<BottomTab, string>>({ library: '', tags: '', issues: '' });
  const [scope, setScope] = useState<Scope>('all');

  const counts = useMemo(() => {
    const issues = validateProject(project);
    return {
      library: project.library.length,
      tags: flattenTags(project).length,
      errors: issues.filter((i) => i.severity === 'error').length,
      warnings: issues.filter((i) => i.severity === 'warning').length,
    };
  }, [project]);

  const current = TABS.find((t) => t.id === bottomTab)!;

  return (
    <section className="bottom">
      <header className="browser-head">
        <span className="panel-chip">{current.icon}</span>
        <nav className="browser-tabs">
          {TABS.map((t) => (
            <button key={t.id} className={bottomTab === t.id ? 'active' : ''} onClick={() => set({ bottomTab: t.id, bottomOpen: true })}>
              {t.label}
              {t.id === 'library' && <span className="count">{counts.library}</span>}
              {t.id === 'tags' && <span className="count">{counts.tags}</span>}
              {t.id === 'issues' &&
                (counts.errors + counts.warnings === 0 ? (
                  <span className="count ok">✓</span>
                ) : (
                  <>
                    {counts.errors > 0 && <span className="count error">{counts.errors}</span>}
                    {counts.warnings > 0 && <span className="count warning">{counts.warnings}</span>}
                  </>
                ))}
            </button>
          ))}
        </nav>
        <span className="spacer" />
        {bottomOpen && bottomTab === 'tags' && (
          <div className="seg">
            <button className={scope === 'all' ? 'active' : ''} onClick={() => setScope('all')}>
              All
            </button>
            <button className={scope === 'selection' ? 'active' : ''} onClick={() => setScope('selection')}>
              Selection
            </button>
          </div>
        )}
        {bottomOpen && bottomTab === 'library' && (
          <button className="chip-btn" onClick={() => set({ typeEditor: 'new' })} title="Define a new machine type">
            <Plus size={11} /> New type
          </button>
        )}
        {bottomOpen && bottomTab !== 'issues' && (
          <div className="search compact">
            <Search size={12} />
            <input
              placeholder={bottomTab === 'library' ? 'Search' : 'Filter path, type, address…'}
              value={queries[bottomTab]}
              onChange={(e) => setQueries((q) => ({ ...q, [bottomTab]: e.target.value }))}
            />
          </div>
        )}
        <button className="icon-btn sm" onClick={() => set({ bottomOpen: !bottomOpen })} title={bottomOpen ? 'Collapse' : 'Expand'}>
          {bottomOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>
      </header>
      {bottomOpen && (
        <div className="bottom-body">
          {bottomTab === 'library' && <LibraryPanel query={queries.library} />}
          {bottomTab === 'tags' && <TagRegistry query={queries.tags} scope={scope} />}
          {bottomTab === 'issues' && <ValidationList />}
        </div>
      )}
    </section>
  );
}

import { Copy, Factory, FileUp, FolderOpen, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ProjectSummary } from '../../types';
import { useProject } from '../../store/projectStore';
import { toast } from '../../store/uiStore';
import { newId } from '../../lib/id';
import { deleteProject, listProjects, loadProject, parseImportedProject, saveProject } from '../../lib/persistence';
import { INDUSTRY_TEMPLATES, projectFromTemplate } from '../../lib/templates';
import { Field, TextInput } from '../ui/Field';

export function StartScreen() {
  const open = useProject((s) => s.open);
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [template, setTemplate] = useState('automotive');

  const refresh = () => listProjects().then(setProjects).catch(() => setProjects([]));
  useEffect(() => {
    refresh();
  }, []);

  const create = async () => {
    const p = projectFromTemplate(template, { name: name.trim() || 'Untitled twin', client: client.trim() });
    await saveProject(p);
    open(p);
  };

  const openExisting = async (id: string) => {
    const p = await loadProject(id);
    if (p) open(p);
    else toast('Could not load that twin', 'error');
  };

  const duplicate = async (s: ProjectSummary) => {
    const p = await loadProject(s.id);
    if (!p) return;
    const now = new Date().toISOString();
    await saveProject({ ...p, id: newId('prj'), name: `${p.name} (copy)`, createdAt: now, updatedAt: now });
    refresh();
  };

  const remove = async (s: ProjectSummary) => {
    if (!window.confirm(`Delete "${s.name}" from this browser? Export it first if you need a backup.`)) return;
    await deleteProject(s.id);
    refresh();
  };

  const importFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const existing = await listProjects();
        const raw = await file.text();
        const parsed = parseImportedProject(raw, { asCopy: false });
        const asCopy = existing.some((e) => e.id === parsed.id) && !window.confirm(`"${parsed.name}" already exists here. OK = overwrite, Cancel = import as a copy.`);
        const p = asCopy ? parseImportedProject(raw, { asCopy: true }) : parsed;
        await saveProject(p);
        open(p);
      } catch (e) {
        toast(e instanceof Error ? e.message : 'Import failed', 'error');
      }
    };
    input.click();
  };

  return (
    <div className="start">
      <div className="start-inner">
        <header className="start-head">
          <div className="brand big">
            <span className="logo">
              <Factory size={22} />
            </span>
            <div>
              <h1>Digital Twin Configurator</h1>
              <p className="muted">Define plants, departments and machines — with tag bindings, not values.</p>
            </div>
          </div>
        </header>

        <div className="start-grid">
          <section className="card">
            <h3>New twin</h3>
            <div className="grid2">
              <Field label="Twin name">
                <TextInput value={name} placeholder="e.g. Pune Assembly Line 2" onChange={setName} />
              </Field>
              <Field label="Client">
                <TextInput value={client} placeholder="Client / business unit" onChange={setClient} />
              </Field>
            </div>
            <div className="field-label" style={{ marginTop: 12 }}>
              Start from
            </div>
            <div className="templates">
              {INDUSTRY_TEMPLATES.map((t) => {
                const machines = t.departments.reduce((n, d) => n + d.machines.length, 0);
                return (
                  <button key={t.id} className={`template ${template === t.id ? 'active' : ''}`} onClick={() => setTemplate(t.id)}>
                    <b>{t.title}</b>
                    <span className="muted small">{t.description}</span>
                    <span className="tpl-meta">
                      {t.departments.length} dept · {machines} machines
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="start-actions">
              <button className="btn ghost" onClick={importFile}>
                <FileUp size={14} /> Import JSON
              </button>
              <button className="btn primary" onClick={create}>
                <Plus size={14} /> Create twin
              </button>
            </div>
          </section>

          <section className="card">
            <h3>Saved twins</h3>
            <p className="muted small">Stored in this browser. Export to JSON to share with the team or keep in version control.</p>
            <div className="saved-list">
              {projects === null && <div className="tree-empty">Loading…</div>}
              {projects?.length === 0 && <div className="tree-empty">No twins yet — create your first one.</div>}
              {projects?.map((s) => (
                <div key={s.id} className="saved" onDoubleClick={() => openExisting(s.id)}>
                  <div className="saved-text">
                    <b>{s.name}</b>
                    <span className="muted small">
                      {[s.client, s.industry].filter(Boolean).join(' · ')} — {s.departments} dept · {s.machines} machines · {s.tags} tags
                    </span>
                    <span className="muted tiny">Updated {new Date(s.updatedAt).toLocaleString()}</span>
                  </div>
                  <button className="icon-btn" onClick={() => duplicate(s)} title="Duplicate">
                    <Copy size={14} />
                  </button>
                  <button className="icon-btn danger" onClick={() => remove(s)} title="Delete">
                    <Trash2 size={14} />
                  </button>
                  <button className="btn sm" onClick={() => openExisting(s.id)}>
                    <FolderOpen size={14} /> Open
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

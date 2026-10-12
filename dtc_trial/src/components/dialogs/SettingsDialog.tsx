import { Plus, Star, Trash2 } from 'lucide-react';
import type { Connection, Project } from '../../types';
import { PROTOCOLS } from '../../types';
import { useProject } from '../../store/projectStore';
import { useUI } from '../../store/uiStore';
import { newId } from '../../lib/id';
import { flattenTags, tagPath } from '../../lib/tags';
import { Field, Modal, Section, Select, TextInput } from '../ui/Field';

const INDUSTRIES = ['General', 'Automotive', 'Food & Beverage', 'Pharmaceutical', 'Metal Fabrication', 'Chemicals', 'Energy & Utilities', 'Electronics', 'Logistics'];

export function SettingsDialog() {
  const project = useProject((s) => s.project)!;
  const mutate = useProject((s) => s.mutate);
  const setUI = useUI((s) => s.set);
  const close = () => setUI({ settingsOpen: false });
  const set = (r: (p: Project) => void, k?: string) => mutate((d) => r(d as Project), k && `settings:${k}`);

  const usage = (c: Connection) =>
    flattenTags(project).filter((f) => f.connection?.id === c.id).length;

  const sample = project.plant.departments[0];
  const sampleMachine = sample?.machines[0];
  const samplePath = tagPath(project, { dept: sample, machine: sampleMachine }, 'Status');
  const sampleAddress = project.naming.addressTemplate
    .replaceAll('{path}', samplePath)
    .replaceAll('{plant}', project.plant.code)
    .replaceAll('{department}', sample?.code ?? '')
    .replaceAll('{machine}', sampleMachine?.code ?? '')
    .replaceAll('{tag}', 'Status');

  return (
    <Modal
      title="Project settings"
      onClose={close}
      width={760}
      footer={
        <>
          <span className="spacer" />
          <button className="btn primary" onClick={close}>
            Done
          </button>
        </>
      }
    >
      <Section title="Project">
        <div className="grid2">
          <Field label="Twin name">
            <TextInput value={project.name} onChange={(v) => set((p) => void (p.name = v), 'name')} />
          </Field>
          <Field label="Client">
            <TextInput value={project.client} onChange={(v) => set((p) => void (p.client = v), 'client')} />
          </Field>
          <Field label="Industry">
            <Select
              value={project.industry}
              onChange={(v) => set((p) => void (p.industry = v))}
              options={[...new Set([project.industry, ...INDUSTRIES])].map((i) => ({ value: i, label: i }))}
            />
          </Field>
          <Field label="Description">
            <TextInput value={project.description} onChange={(v) => set((p) => void (p.description = v), 'desc')} />
          </Field>
        </div>
      </Section>

      <Section title="Tag naming convention">
        <div className="grid3">
          <Field label="Prefix" hint="Optional enterprise / site segment">
            <TextInput mono value={project.naming.prefix} placeholder="e.g. ACME" onChange={(v) => set((p) => void (p.naming.prefix = v.replace(/\s+/g, '')), 'prefix')} />
          </Field>
          <Field label="Separator">
            <Select
              value={project.naming.separator}
              onChange={(v) => set((p) => void (p.naming.separator = v))}
              options={[
                { value: '.', label: 'Dot  ( . )' },
                { value: '/', label: 'Slash  ( / )' },
                { value: '_', label: 'Underscore  ( _ )' },
                { value: ':', label: 'Colon  ( : )' },
              ]}
            />
          </Field>
          <Field label="Address template" hint="{path} {plant} {department} {machine} {tag}">
            <TextInput mono value={project.naming.addressTemplate} onChange={(v) => set((p) => void (p.naming.addressTemplate = v), 'addr')} />
          </Field>
        </div>
        <div className="preview-box">
          <div>
            <span className="muted">Example path</span> <span className="mono">{samplePath}</span>
          </div>
          <div>
            <span className="muted">Example address</span> <span className="mono">{sampleAddress}</span>
          </div>
        </div>
      </Section>

      <Section
        title="Data connections"
        actions={
          <button
            className="btn sm"
            onClick={() =>
              set((p) => {
                const c: Connection = { id: newId('con'), name: `Connection ${p.connections.length + 1}`, protocol: 'MQTT', endpoint: 'mqtt://broker:1883', notes: '' };
                p.connections.push(c);
                p.defaultConnectionId ??= c.id;
              })
            }
          >
            <Plus size={14} /> Connection
          </button>
        }
      >
        <p className="muted small">Endpoints are references for the runtime — the configurator never connects to them. The starred connection is the project default.</p>
        <div className="conn-list">
          {project.connections.map((c, i) => {
            const isDefault = project.defaultConnectionId === c.id;
            const n = usage(c);
            return (
              <div key={c.id} className="conn-row">
                <button
                  className={`icon-btn ${isDefault ? 'star' : ''}`}
                  title={isDefault ? 'Default connection' : 'Make default'}
                  onClick={() => set((p) => void (p.defaultConnectionId = c.id))}
                >
                  <Star size={14} fill={isDefault ? 'currentColor' : 'none'} />
                </button>
                <input className="input" value={c.name} onChange={(e) => set((p) => void (p.connections[i].name = e.target.value), `cn${c.id}`)} />
                <select className="input" value={c.protocol} onChange={(e) => set((p) => void (p.connections[i].protocol = e.target.value as Connection['protocol']))}>
                  {PROTOCOLS.map((pr) => (
                    <option key={pr}>{pr}</option>
                  ))}
                </select>
                <input className="input mono" value={c.endpoint} onChange={(e) => set((p) => void (p.connections[i].endpoint = e.target.value), `ce${c.id}`)} />
                <span className="muted small nowrap">{n} tags</span>
                <button
                  className="icon-btn danger"
                  title="Delete connection"
                  onClick={() => {
                    if (n && !window.confirm(`${n} tags use "${c.name}". They will fall back to the inherited connection. Delete?`)) return;
                    set((p) => {
                      p.connections = p.connections.filter((x) => x.id !== c.id);
                      if (p.defaultConnectionId === c.id) p.defaultConnectionId = p.connections[0]?.id ?? null;
                      // Clear dangling references so tags fall back to inheritance.
                      const clear = (o: { connectionId: string | null }) => {
                        if (o.connectionId === c.id) o.connectionId = null;
                      };
                      p.plant.tags.forEach(clear);
                      for (const d of p.plant.departments) {
                        clear(d);
                        d.tags.forEach(clear);
                        for (const m of d.machines) {
                          clear(m);
                          m.tags.forEach(clear);
                        }
                      }
                    });
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
          {project.connections.length === 0 && <div className="tree-empty">No connections. Tags will be flagged until one is added.</div>}
        </div>
      </Section>
    </Modal>
  );
}

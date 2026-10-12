import type { Draft } from 'immer';
import { BookmarkPlus, Copy, Crosshair, RefreshCw, RotateCcw, Settings2, SlidersHorizontal, Tags, Trash2 } from 'lucide-react';
import { useMemo } from 'react';
import type { Department, ID, Machine, Plant, Project, Selection } from '../../types';
import { actions, useProject } from '../../store/projectStore';
import { toast, useUI } from '../../store/uiStore';
import { isValidCode } from '../../lib/id';
import { generatedAddress, resolveConnection, tagPath, type TagContext } from '../../lib/tags';
import { findDepartment, findMachine, resolveSelection } from '../../lib/tree';
import { ColorInput, Field, NumberInput, Section, TextInput } from '../ui/Field';
import { confirmDelete } from './HierarchyTree';
import { PanelHeader } from '../ui/Layout';
import { ModelFields } from './ModelFields';
import { TagEditor, type TagListController } from './TagEditor';

const upperCode = (v: string) => v.toUpperCase().replace(/\s+/g, '_');

function ConnectionSelect({ value, onChange, project, inheritLabel }: { value: ID | null; onChange: (v: ID | null) => void; project: Project; inheritLabel: string }) {
  return (
    <select className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">Inherit ({inheritLabel})</option>
      {project.connections.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name} · {c.protocol}
        </option>
      ))}
    </select>
  );
}

const connName = (p: Project, id: ID | null | undefined) => p.connections.find((c) => c.id === id)?.name ?? 'none';

/* ---------------------------------------------------------------- plant */

function PlantProps({ plant }: { plant: Plant }) {
  const mutate = useProject((s) => s.mutate);
  const set = (r: (p: Draft<Plant>) => void, k?: string) => mutate((d) => r(d.plant), k && `plant:${k}`);
  return (
    <>
      <Section title="Plant">
        <Field label="Name">
          <TextInput value={plant.name} onChange={(v) => set((p) => void (p.name = v), 'name')} />
        </Field>
        <div className="grid2">
          <Field label="Code" hint="Root segment of every tag path">
            <TextInput mono value={plant.code} invalid={!isValidCode(plant.code)} transform={upperCode} onChange={(v) => set((p) => void (p.code = v), 'code')} />
          </Field>
          <Field label="Location">
            <TextInput value={plant.location} placeholder="City, site…" onChange={(v) => set((p) => void (p.location = v), 'loc')} />
          </Field>
        </div>
      </Section>
      <Section title="Floor">
        <div className="grid2">
          <Field label="Width (X)">
            <NumberInput value={plant.size[0]} min={10} step={1} suffix="m" onChange={(v) => set((p) => void (p.size[0] = v), 'w')} />
          </Field>
          <Field label="Depth (Z)">
            <NumberInput value={plant.size[1]} min={10} step={1} suffix="m" onChange={(v) => set((p) => void (p.size[1] = v), 'd')} />
          </Field>
        </div>
      </Section>
    </>
  );
}

/* ----------------------------------------------------------- department */

function DepartmentProps({ dept, project }: { dept: Department; project: Project }) {
  const mutate = useProject((s) => s.mutate);
  const set = (r: (d: Draft<Department>) => void, k?: string) =>
    mutate((d) => {
      const x = findDepartment(d, dept.id);
      if (x) r(x);
    }, k && `dep:${dept.id}:${k}`);
  const dupCode = project.plant.departments.some((d) => d.id !== dept.id && d.code.toUpperCase() === dept.code.toUpperCase());
  const sel: Selection = { kind: 'department', id: dept.id };
  return (
    <>
      <Section title="Department" actions={<NodeActions sel={sel} name={dept.name} />}>
        <Field label="Name">
          <TextInput value={dept.name} onChange={(v) => set((d) => void (d.name = v), 'name')} />
        </Field>
        <div className="grid2">
          <Field label="Code" hint={dupCode ? 'Code already used' : undefined}>
            <TextInput mono value={dept.code} invalid={!isValidCode(dept.code) || dupCode} transform={upperCode} onChange={(v) => set((d) => void (d.code = v), 'code')} />
          </Field>
          <Field label="Zone colour">
            <ColorInput value={dept.color} onChange={(v) => set((d) => void (d.color = v), 'color')} />
          </Field>
        </div>
        <Field label="Description">
          <TextInput multiline value={dept.description} onChange={(v) => set((d) => void (d.description = v), 'desc')} />
        </Field>
      </Section>
      <Section title="Zone layout">
        <div className="grid2">
          <Field label="Centre X">
            <NumberInput value={dept.position[0]} suffix="m" onChange={(v) => set((d) => void (d.position[0] = v), 'x')} />
          </Field>
          <Field label="Centre Z">
            <NumberInput value={dept.position[1]} suffix="m" onChange={(v) => set((d) => void (d.position[1] = v), 'z')} />
          </Field>
          <Field label="Width">
            <NumberInput value={dept.size[0]} min={2} step={1} suffix="m" onChange={(v) => set((d) => void (d.size[0] = v), 'w')} />
          </Field>
          <Field label="Depth">
            <NumberInput value={dept.size[1]} min={2} step={1} suffix="m" onChange={(v) => set((d) => void (d.size[1] = v), 'd')} />
          </Field>
        </div>
      </Section>
      <Section title="Integration">
        <Field label="Default connection" hint="Machines and tags in this department inherit it">
          <ConnectionSelect project={project} value={dept.connectionId} inheritLabel={connName(project, project.defaultConnectionId)} onChange={(v) => set((d) => void (d.connectionId = v))} />
        </Field>
      </Section>
    </>
  );
}

/* -------------------------------------------------------------- machine */

function MachineProps({ machine, dept, project }: { machine: Machine; dept: Department; project: Project }) {
  const mutate = useProject((s) => s.mutate);
  const requestView = useUI((s) => s.requestView);
  const set = (r: (m: Draft<Machine>) => void, k?: string) =>
    mutate((d) => {
      const hit = findMachine(d, machine.id);
      if (hit) r(hit.machine);
    }, k && `mac:${machine.id}:${k}`);
  const type = project.library.find((t) => t.id === machine.typeId);
  const dupCode = dept.machines.some((m) => m.id !== machine.id && m.code.toUpperCase() === machine.code.toUpperCase());
  const sel: Selection = { kind: 'machine', id: machine.id };

  return (
    <>
      <Section
        title="Machine"
        actions={
          <>
            <button className="icon-btn" onClick={() => requestView('focus')} title="Focus in 3D (F)">
              <Crosshair size={14} />
            </button>
            <NodeActions sel={sel} name={machine.name} />
          </>
        }
      >
        <Field label="Name">
          <TextInput value={machine.name} onChange={(v) => set((m) => void (m.name = v), 'name')} />
        </Field>
        <div className="grid2">
          <Field label="Code" hint={dupCode ? 'Code already used in this department' : undefined}>
            <TextInput mono value={machine.code} invalid={!isValidCode(machine.code) || dupCode} transform={upperCode} onChange={(v) => set((m) => void (m.code = v), 'code')} />
          </Field>
          <Field label="Department">
            <select
              className="input"
              value={dept.id}
              onChange={(e) => actions.moveMachineToDepartment(machine.id, e.target.value)}
            >
              {project.plant.departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Description">
          <TextInput multiline value={machine.description} onChange={(v) => set((m) => void (m.description = v), 'desc')} />
        </Field>
      </Section>

      <Section title="Placement">
        <div className="grid2">
          <Field label="X (in zone)">
            <NumberInput value={machine.position[0]} suffix="m" onChange={(v) => set((m) => void (m.position[0] = v), 'x')} />
          </Field>
          <Field label="Z (in zone)">
            <NumberInput value={machine.position[2]} suffix="m" onChange={(v) => set((m) => void (m.position[2] = v), 'z')} />
          </Field>
          <Field label="Elevation">
            <NumberInput value={machine.position[1]} step={0.1} suffix="m" onChange={(v) => set((m) => void (m.position[1] = v), 'y')} />
          </Field>
          <Field label="Rotation">
            <NumberInput value={machine.rotationY} step={15} suffix="°" onChange={(v) => set((m) => void (m.rotationY = v), 'rot')} />
          </Field>
        </div>
      </Section>

      <Section
        title="3D model"
        actions={
          type && (
            <button className="icon-btn" onClick={() => actions.resetModelFromType(machine.id)} title={`Reset model to "${type.name}"`}>
              <RotateCcw size={14} />
            </button>
          )
        }
      >
        <ModelFields model={machine.model} assets={project.assets} update={(r, k) => set((m) => r(m.model), k)} />
      </Section>

      <Section title="Type & integration">
        <Field label="Machine type">
          <div className="type-line">
            <span>{type ? type.name : <i className="muted">Custom (no type)</i>}</span>
            {type && (
              <button
                className="btn ghost sm"
                onClick={() => {
                  const n = actions.syncTagsFromType(machine.id);
                  toast(n ? `Added ${n} missing tag${n > 1 ? 's' : ''} from type` : 'Tags already match the type', n ? 'success' : 'info');
                }}
                title="Add tags defined on the type that this machine is missing"
              >
                <RefreshCw size={12} /> Sync tags
              </button>
            )}
            <button
              className="btn ghost sm"
              onClick={() => {
                const t = actions.saveMachineAsType(machine.id);
                if (t) toast(`Saved "${t.name}" to the library`, 'success');
              }}
              title="Save this machine's model and tags as a reusable type"
            >
              <BookmarkPlus size={12} /> Save as type
            </button>
          </div>
        </Field>
        <Field label="Connection">
          <ConnectionSelect
            project={project}
            value={machine.connectionId}
            inheritLabel={connName(project, dept.connectionId ?? project.defaultConnectionId)}
            onChange={(v) => set((m) => void (m.connectionId = v))}
          />
        </Field>
      </Section>
    </>
  );
}

function NodeActions({ sel, name }: { sel: Selection; name: string }) {
  return (
    <>
      <button className="icon-btn" onClick={() => actions.duplicateNode(sel)} title="Duplicate (Ctrl+D)">
        <Copy size={14} />
      </button>
      <button className="icon-btn danger" onClick={() => confirmDelete(sel, name)} title="Delete (Del)">
        <Trash2 size={14} />
      </button>
    </>
  );
}

/* ------------------------------------------------------------------ tags */

function NodeTags({ sel, project }: { sel: Selection; project: Project }) {
  const node = resolveSelection(project, sel);
  const ctl = useMemo<TagListController | undefined>(() => {
    if (!node) return undefined;
    const ctx: TagContext = { dept: node.dept, machine: node.machine };
    return {
      tags: node.tags,
      add: () => actions.addTag(sel),
      update: (id, r, k) => actions.updateTag(sel, id, r, k),
      remove: (id) => actions.deleteTag(sel, id),
      duplicate: (id) => actions.duplicateTag(sel, id),
      move: (id, dir) => actions.moveTag(sel, id, dir),
      connections: project.connections,
      resolve: (tag) => ({
        path: tagPath(project, ctx, tag.name),
        generatedAddress: generatedAddress(project, ctx, tag),
        connection: resolveConnection(project, ctx, tag),
        inheritedConnection: resolveConnection(project, ctx, { ...tag, connectionId: null }),
      }),
    };
  }, [node, project, sel]);
  if (!node || !ctl) return null;
  return (
    <div className="node-tags">
      <p className="muted small">
        Tags are definitions only — name, type and address. Values are bound at runtime from the connection. Paths follow{' '}
        <span className="mono">{[project.naming.prefix, 'PLANT', 'DEPT', 'MACHINE', 'Tag'].filter(Boolean).join(project.naming.separator)}</span>.
      </p>
      <TagEditor ctl={ctl} emptyText={`No tags on this ${node.kind}.`} />
    </div>
  );
}

/* ------------------------------------------------------------- container */

export function Inspector() {
  const project = useProject((s) => s.project)!;
  const selection = useProject((s) => s.selection);
  const tab = useUI((s) => s.rightTab);
  const setUI = useUI((s) => s.set);
  const node = resolveSelection(project, selection);

  const header = (
    <PanelHeader
      icon={<SlidersHorizontal size={13} />}
      title="Properties:"
      sub={node ? node.name : 'No selection'}
    />
  );

  if (!node || !selection)
    return (
      <div className="inspector">
        {header}
        <div className="inspector-empty">No node selected</div>
      </div>
    );

  return (
    <div className="inspector">
      {header}
      <div className="inspector-main">
        <nav className="prop-tabs" aria-label="Property tabs">
          <button className={tab === 'props' ? 'active' : ''} onClick={() => setUI({ rightTab: 'props' })} title="Properties">
            <Settings2 size={15} />
          </button>
          <button className={tab === 'tags' ? 'active' : ''} onClick={() => setUI({ rightTab: 'tags' })} title={`Tags (${node.tags.length})`}>
            <Tags size={15} />
            {node.tags.length > 0 && <span className="prop-tab-count">{node.tags.length}</span>}
          </button>
        </nav>
        <div className="inspector-col">
          <div className="inspector-crumb">
            <span className={`kind ${node.kind}`}>{node.kind}</span>
            <span className="mono">{[project.plant.code, node.dept?.code, node.machine?.code].filter(Boolean).join(project.naming.separator)}</span>
            <span className="spacer" />
            <span className="crumb-tab">{tab === 'tags' ? 'Tags' : 'Properties'}</span>
          </div>
          <div className="inspector-body">
            {tab === 'tags' ? (
              <NodeTags key={node.id} sel={selection} project={project} />
            ) : node.kind === 'plant' ? (
              <PlantProps plant={project.plant} />
            ) : node.kind === 'department' ? (
              <DepartmentProps key={node.id} dept={node.dept!} project={project} />
            ) : (
              <MachineProps key={node.id} machine={node.machine!} dept={node.dept!} project={project} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

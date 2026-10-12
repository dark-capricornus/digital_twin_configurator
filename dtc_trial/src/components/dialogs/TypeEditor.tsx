import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { produce, type Draft } from 'immer';
import { Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { MachineType, TagDef } from '../../types';
import { actions, useProject } from '../../store/projectStore';
import { toast, useUI } from '../../store/uiStore';
import { newId, toCode } from '../../lib/id';
import { builtInTypeId, createDefaultLibrary } from '../../lib/library';
import { alarmTpl, blankTag, instantiateTags, statusTpl, toTemplate } from '../../lib/tags';
import { Field, Modal, TextInput } from '../ui/Field';
import { ModelFields } from '../panels/ModelFields';
import { TagEditor, type TagListController } from '../panels/TagEditor';
import { GltfModel } from '../viewport/models/GltfModel';
import { PrimitiveModel } from '../viewport/models/Primitives';

function newType(): MachineType {
  const base = createDefaultLibrary().find((t) => t.id === builtInTypeId('generic'))!;
  return {
    ...base,
    id: newId('type'),
    name: 'New Machine Type',
    category: 'Custom',
    description: '',
    codePrefix: 'EQ',
    tagTemplates: [statusTpl(), alarmTpl()],
  };
}

function Preview({ type }: { type: MachineType }) {
  const assets = useProject((s) => s.project!.assets);
  const [w, h, d] = type.model.size;
  const span = Math.max(w, h, d);
  const asset = assets.find((a) => a.id === type.model.assetId);
  return (
    <div className="type-preview">
      <Canvas camera={{ position: [span * 1.4, span * 1.1, span * 1.6], fov: 40 }} dpr={[1, 2]}>
        <color attach="background" args={['#1f1f1f']} />
        <hemisphereLight args={['#f4f4f5', '#27272a', 1]} />
        <directionalLight position={[5, 10, 6]} intensity={1.4} />
        <gridHelper args={[Math.ceil(span * 3), Math.ceil(span * 3), '#3a3a3a', '#2c2c2c']} />
        {type.model.source === 'gltf' ? (
          <GltfModel url={asset?.dataUrl} size={type.model.size} />
        ) : (
          <PrimitiveModel kind={type.model.primitive} size={type.model.size} color={type.model.color} spin={0.5} fill={0.6} />
        )}
        <OrbitControls target={[0, h / 2, 0]} autoRotate autoRotateSpeed={1.5} />
      </Canvas>
    </div>
  );
}

export function TypeEditor() {
  const editing = useUI((s) => s.typeEditor);
  const setUI = useUI((s) => s.set);
  const project = useProject((s) => s.project)!;
  const original = editing && editing !== 'new' ? project.library.find((t) => t.id === editing) : undefined;

  const [type, setType] = useState<MachineType>(() => (original ? structuredClone(original) : newType()));
  // Tag templates get temporary ids while editing so the shared TagEditor can address them.
  const [tags, setTags] = useState<TagDef[]>(() => instantiateTags(type.tagTemplates));
  const [applyToExisting, setApplyToExisting] = useState(true);

  const usage = useMemo(
    () => project.plant.departments.reduce((n, d) => n + d.machines.filter((m) => m.typeId === type.id).length, 0),
    [project, type.id],
  );

  const close = () => setUI({ typeEditor: null });
  const edit = (r: (t: Draft<MachineType>) => void) => setType((t) => produce(t, r));
  const editTags = (r: (t: Draft<TagDef[]>) => void) => setTags((t) => produce(t, r));

  const ctl: TagListController = {
    tags,
    add: () => editTags((l) => void l.push(blankTag(`NewTag${l.length + 1}`))),
    update: (id, r) =>
      editTags((l) => {
        const t = l.find((x) => x.id === id);
        if (t) r(t);
      }),
    remove: (id) => editTags((l) => void l.splice(l.findIndex((x) => x.id === id), 1)),
    duplicate: (id) =>
      editTags((l) => {
        const i = l.findIndex((x) => x.id === id);
        l.splice(i + 1, 0, { ...structuredClone(l[i]), id: newId('tag'), name: `${l[i].name}Copy` });
      }),
    move: (id, dir) =>
      editTags((l) => {
        const i = l.findIndex((x) => x.id === id);
        const j = i + dir;
        if (j >= 0 && j < l.length) [l[i], l[j]] = [l[j], l[i]];
      }),
  };

  const save = () => {
    if (!type.name.trim()) return toast('Give the type a name', 'error');
    const names = tags.map((t) => t.name.toUpperCase());
    if (new Set(names).size !== names.length) return toast('Tag names must be unique', 'error');
    const propagate = !!original && applyToExisting && usage > 0;
    const added = actions.upsertType({ ...type, codePrefix: type.codePrefix || toCode(type.name), tagTemplates: tags.map(toTemplate) }, propagate);
    if (added) toast(`Added ${added} new tag(s) across ${usage} machine(s)`, 'success');
    toast(original ? `Updated "${type.name}"` : `Added "${type.name}" to the library`, 'success');
    close();
  };

  const remove = () => {
    if (!original) return;
    const msg = usage
      ? `Delete "${original.name}"? ${usage} machine(s) keep their model and tags but become custom.`
      : `Delete "${original.name}"?`;
    if (window.confirm(msg)) {
      actions.deleteType(original.id);
      close();
    }
  };

  return (
    <Modal
      title={original ? `Machine type · ${original.name}` : 'New machine type'}
      onClose={close}
      width={980}
      footer={
        <>
          {original && (
            <button className="btn danger ghost" onClick={remove}>
              <Trash2 size={14} /> Delete type
            </button>
          )}
          <span className="spacer" />
          {original && usage > 0 && (
            <label className="check">
              <input type="checkbox" checked={applyToExisting} onChange={(e) => setApplyToExisting(e.target.checked)} />
              Add new tags to {usage} existing machine{usage > 1 ? 's' : ''}
            </label>
          )}
          <button className="btn ghost" onClick={close}>
            Cancel
          </button>
          <button className="btn primary" onClick={save}>
            {original ? 'Save type' : 'Create type'}
          </button>
        </>
      }
    >
      <div className="type-editor">
        <div className="type-left">
          <Preview type={type} />
          <div className="grid2">
            <Field label="Name">
              <TextInput value={type.name} onChange={(v) => edit((t) => void (t.name = v))} />
            </Field>
            <Field label="Category">
              <TextInput value={type.category} onChange={(v) => edit((t) => void (t.category = v))} />
            </Field>
            <Field label="Code prefix" hint="CNC → CNC_01, CNC_02…">
              <TextInput mono value={type.codePrefix} transform={(v) => v.toUpperCase().replace(/[^A-Z0-9_-]/g, '')} onChange={(v) => edit((t) => void (t.codePrefix = v))} />
            </Field>
            <Field label="Description">
              <TextInput value={type.description} onChange={(v) => edit((t) => void (t.description = v))} />
            </Field>
          </div>
          <ModelFields model={type.model} assets={project.assets} update={(r) => edit((t) => r(t.model))} />
        </div>
        <div className="type-right">
          <h4 className="sub">Tag template</h4>
          <p className="muted small">Every machine created from this type gets these tags. Paths are resolved from the machine's position in the hierarchy.</p>
          <TagEditor ctl={ctl} emptyText="No tags in this template." />
        </div>
      </div>
    </Modal>
  );
}

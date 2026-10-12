import type { Draft } from 'immer';
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Copy, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { Connection, ID, TagDef } from '../../types';
import { BINDING_KINDS, DATA_TYPES, TAG_ACCESS, TAG_CATEGORIES } from '../../types';
import { isValidTagName, STATUS_STATES } from '../../lib/tags';
import { Field, NumberInput, Select, TextInput } from '../ui/Field';

/**
 * Editor for a list of tag definitions. Used both for tags on a node
 * (machine / department / plant) and for tag templates on a machine type.
 */
export interface TagListController {
  tags: TagDef[];
  add: () => void;
  update: (id: ID, recipe: (t: Draft<TagDef>) => void, mergeKey?: string) => void;
  remove: (id: ID) => void;
  duplicate: (id: ID) => void;
  move: (id: ID, dir: -1 | 1) => void;
  /** Node mode: resolved path / address / connection for display */
  resolve?: (tag: TagDef) => { path: string; generatedAddress: string; connection?: Connection; inheritedConnection?: Connection };
  connections?: Connection[];
}

const BINDING_SHORT: Record<string, string> = {
  none: '',
  statusColor: 'status',
  rotate: 'rotate',
  fillLevel: 'fill',
  alarm: 'alarm',
  label: 'label',
};

export function TagEditor({ ctl, emptyText }: { ctl: TagListController; emptyText?: string }) {
  const [open, setOpen] = useState<Record<ID, boolean>>({});
  const names = new Map<string, number>();
  for (const t of ctl.tags) names.set(t.name.toUpperCase(), (names.get(t.name.toUpperCase()) ?? 0) + 1);

  return (
    <div className="tag-editor">
      {ctl.tags.map((tag, i) => {
        const isOpen = !!open[tag.id];
        const dup = (names.get(tag.name.toUpperCase()) ?? 0) > 1;
        const invalid = !isValidTagName(tag.name) || dup;
        const key = (f: string) => `tag:${tag.id}:${f}`;
        const resolved = ctl.resolve?.(tag);
        return (
          <div key={tag.id} className={`tag-card ${isOpen ? 'open' : ''}`}>
            <div className="tag-row">
              <button className="twisty" onClick={() => setOpen((o) => ({ ...o, [tag.id]: !isOpen }))} title="Details">
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              <input
                className={`input mono ${invalid ? 'invalid' : ''}`}
                value={tag.name}
                title={dup ? 'Duplicate tag name' : invalid ? 'Use letters, digits and _ ; start with a letter' : tag.name}
                onChange={(e) => ctl.update(tag.id, (t) => void (t.name = e.target.value.replace(/\s+/g, '')), key('name'))}
                spellCheck={false}
              />
              <span className="tag-actions">
                {tag.binding.kind !== 'none' && <span className={`bind-badge ${tag.binding.kind}`}>{BINDING_SHORT[tag.binding.kind]}</span>}
                <button className="icon-btn" disabled={i === 0} onClick={() => ctl.move(tag.id, -1)} title="Move up">
                  <ArrowUp size={12} />
                </button>
                <button className="icon-btn" disabled={i === ctl.tags.length - 1} onClick={() => ctl.move(tag.id, 1)} title="Move down">
                  <ArrowDown size={12} />
                </button>
                <button className="icon-btn" onClick={() => ctl.duplicate(tag.id)} title="Duplicate">
                  <Copy size={12} />
                </button>
                <button className="icon-btn danger" onClick={() => ctl.remove(tag.id)} title="Delete">
                  <Trash2 size={12} />
                </button>
              </span>
            </div>
            <div className="tag-row2">
              <select className="input" title="Data type" value={tag.dataType} onChange={(e) => ctl.update(tag.id, (t) => void (t.dataType = e.target.value as TagDef['dataType']))}>
                {DATA_TYPES.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
              <input
                className="input"
                value={tag.unit}
                title="Engineering unit"
                placeholder="unit"
                onChange={(e) => ctl.update(tag.id, (t) => void (t.unit = e.target.value), key('unit'))}
              />
              <select className="input" title="Access" value={tag.access} onChange={(e) => ctl.update(tag.id, (t) => void (t.access = e.target.value as TagDef['access']))}>
                {TAG_ACCESS.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </div>

            {resolved && <div className="tag-path mono" title="Resolved tag path">{resolved.path}</div>}

            {isOpen && (
              <div className="tag-details">
                <div className="grid2">
                  <Field label="Category">
                    <Select
                      value={tag.category}
                      onChange={(v) => ctl.update(tag.id, (t) => void (t.category = v))}
                      options={TAG_CATEGORIES.map((c) => ({ value: c, label: c }))}
                    />
                  </Field>
                  {ctl.connections && (
                    <Field label="Connection">
                      <select
                        className="input"
                        value={tag.connectionId ?? ''}
                        onChange={(e) => ctl.update(tag.id, (t) => void (t.connectionId = e.target.value || null))}
                      >
                        <option value="">Inherit{resolved?.inheritedConnection ? ` (${resolved.inheritedConnection.name})` : ' (none)'}</option>
                        {ctl.connections.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} · {c.protocol}
                          </option>
                        ))}
                      </select>
                    </Field>
                  )}
                </div>
                <Field label="Description" wide>
                  <TextInput value={tag.description} onChange={(v) => ctl.update(tag.id, (t) => void (t.description = v), key('desc'))} />
                </Field>
                <Field label="Address override" hint={resolved ? 'Leave empty to use the project address template' : 'Leave empty to use the project address template when instantiated'} wide>
                  <TextInput
                    mono
                    value={tag.address}
                    placeholder={resolved?.generatedAddress ?? 'ns=2;s={path}'}
                    onChange={(v) => ctl.update(tag.id, (t) => void (t.address = v), key('addr'))}
                  />
                </Field>
                <BindingEditor tag={tag} update={(r, k) => ctl.update(tag.id, r, k && key(k))} />
              </div>
            )}
          </div>
        );
      })}
      {ctl.tags.length === 0 && <div className="tree-empty">{emptyText ?? 'No tags defined.'}</div>}
      <button className="btn ghost add-tag" onClick={ctl.add}>
        <Plus size={14} /> Add tag
      </button>
    </div>
  );
}

function BindingEditor({ tag, update }: { tag: TagDef; update: (r: (t: Draft<TagDef>) => void, mergeKey?: string) => void }) {
  const b = tag.binding;
  const hint = BINDING_KINDS.find((k) => k.kind === b.kind)?.hint;
  return (
    <div className="binding">
      <Field label="3D binding" hint={hint}>
        <select
          className="input"
          value={b.kind}
          onChange={(e) =>
            update((t) => {
              const kind = e.target.value as TagDef['binding']['kind'];
              t.binding = { kind };
              if (kind === 'statusColor') t.binding.states = STATUS_STATES.map((s) => ({ ...s }));
              if (kind === 'rotate' || kind === 'fillLevel' || kind === 'label') {
                t.binding.min = 0;
                t.binding.max = 100;
              }
            })
          }
        >
          {BINDING_KINDS.map((k) => (
            <option key={k.kind} value={k.kind}>
              {k.label}
            </option>
          ))}
        </select>
      </Field>

      {(b.kind === 'rotate' || b.kind === 'fillLevel' || b.kind === 'label') && (
        <div className="grid2">
          <Field label="Range min">
            <NumberInput value={b.min ?? 0} step={1} onChange={(v) => update((t) => void (t.binding.min = v), 'bmin')} suffix={tag.unit} />
          </Field>
          <Field label="Range max">
            <NumberInput value={b.max ?? 100} step={1} onChange={(v) => update((t) => void (t.binding.max = v), 'bmax')} suffix={tag.unit} />
          </Field>
        </div>
      )}

      {b.kind === 'statusColor' && (
        <div className="states">
          <div className="states-head">
            <span>Value</span>
            <span>Label</span>
            <span>Colour</span>
            <span />
          </div>
          {(b.states ?? []).map((s, i) => (
            <div key={i} className="state-row">
              <input className="input mono" value={s.value} onChange={(e) => update((t) => void (t.binding.states![i].value = e.target.value), `sv${i}`)} />
              <input className="input" value={s.label} onChange={(e) => update((t) => void (t.binding.states![i].label = e.target.value), `sl${i}`)} />
              <input type="color" value={s.color} onChange={(e) => update((t) => void (t.binding.states![i].color = e.target.value), `sc${i}`)} />
              <button className="icon-btn danger" onClick={() => update((t) => void t.binding.states!.splice(i, 1))} title="Remove state">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          <button
            className="btn ghost sm"
            onClick={() =>
              update((t) => {
                t.binding.states ??= [];
                t.binding.states.push({ value: String(t.binding.states.length), label: 'State', color: '#38bdf8' });
              })
            }
          >
            <Plus size={12} /> State
          </button>
        </div>
      )}
    </div>
  );
}

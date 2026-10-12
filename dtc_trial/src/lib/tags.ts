import type { Connection, Department, Machine, Project, TagBinding, TagCategory, TagDef, TagTemplate, DataType, TagAccess } from '../types';
import { newId } from './id';

/* ------------------------------------------------------------ factories */

export const STATUS_STATES = [
  { value: '0', label: 'Stopped', color: '#64748b' },
  { value: '1', label: 'Running', color: '#22c55e' },
  { value: '2', label: 'Idle', color: '#f59e0b' },
  { value: '3', label: 'Fault', color: '#ef4444' },
];

export function tpl(
  name: string,
  dataType: DataType,
  opts: {
    unit?: string;
    access?: TagAccess;
    category?: TagCategory;
    description?: string;
    binding?: TagBinding;
  } = {},
): TagTemplate {
  return {
    name,
    dataType,
    unit: opts.unit ?? '',
    access: opts.access ?? 'R',
    category: opts.category ?? 'process',
    description: opts.description ?? '',
    connectionId: null,
    address: '',
    binding: opts.binding ?? { kind: 'none' },
  };
}

export const statusTpl = (): TagTemplate =>
  tpl('Status', 'INT', {
    category: 'status',
    description: 'Machine state (0 Stopped, 1 Running, 2 Idle, 3 Fault)',
    binding: { kind: 'statusColor', states: STATUS_STATES.map((s) => ({ ...s })) },
  });

export const alarmTpl = (name = 'AlarmActive'): TagTemplate =>
  tpl(name, 'BOOL', { category: 'alarm', description: 'Any active alarm', binding: { kind: 'alarm' } });

export function instantiateTags(templates: TagTemplate[]): TagDef[] {
  return templates.map((t) => ({ ...structuredClone(t), id: newId('tag') }));
}

export function blankTag(name: string): TagDef {
  return { ...tpl(name, 'REAL'), id: newId('tag') };
}

export function toTemplate(tag: TagDef): TagTemplate {
  const { id: _id, ...rest } = structuredClone(tag);
  return rest;
}

/* ----------------------------------------------------------- resolution */

export interface TagContext {
  dept?: Department;
  machine?: Machine;
}

export function tagSegments(p: Project, ctx: TagContext, tagName: string): string[] {
  const segs = [p.naming.prefix, p.plant.code, ctx.dept?.code, ctx.machine?.code, tagName];
  return segs.filter((s): s is string => !!s && s.length > 0);
}

/** Fully qualified tag path, e.g. ACME.PLT01.BODY_SHOP.ROB_01.Status */
export function tagPath(p: Project, ctx: TagContext, tagName: string): string {
  return tagSegments(p, ctx, tagName).join(p.naming.separator);
}

export function resolveConnection(p: Project, ctx: TagContext, tag: TagDef): Connection | undefined {
  const id = tag.connectionId ?? ctx.machine?.connectionId ?? ctx.dept?.connectionId ?? p.defaultConnectionId;
  return id ? p.connections.find((c) => c.id === id) : undefined;
}

export function generatedAddress(p: Project, ctx: TagContext, tag: TagDef): string {
  const path = tagPath(p, ctx, tag.name);
  return p.naming.addressTemplate
    .replaceAll('{path}', path)
    .replaceAll('{plant}', p.plant.code)
    .replaceAll('{department}', ctx.dept?.code ?? '')
    .replaceAll('{machine}', ctx.machine?.code ?? '')
    .replaceAll('{tag}', tag.name);
}

export function resolveAddress(p: Project, ctx: TagContext, tag: TagDef): string {
  return tag.address.trim() || generatedAddress(p, ctx, tag);
}

export interface FlatTag {
  tag: TagDef;
  path: string;
  address: string;
  addressIsGenerated: boolean;
  connection?: Connection;
  nodeKind: 'plant' | 'department' | 'machine';
  nodeId: string;
  dept?: Department;
  machine?: Machine;
}

/** Every tag in the twin with its resolved path, address and connection. */
export function flattenTags(p: Project): FlatTag[] {
  const out: FlatTag[] = [];
  const push = (tag: TagDef, ctx: TagContext, nodeKind: FlatTag['nodeKind'], nodeId: string) =>
    out.push({
      tag,
      path: tagPath(p, ctx, tag.name),
      address: resolveAddress(p, ctx, tag),
      addressIsGenerated: !tag.address.trim(),
      connection: resolveConnection(p, ctx, tag),
      nodeKind,
      nodeId,
      dept: ctx.dept,
      machine: ctx.machine,
    });

  for (const t of p.plant.tags) push(t, {}, 'plant', p.plant.id);
  for (const dept of p.plant.departments) {
    for (const t of dept.tags) push(t, { dept }, 'department', dept.id);
    for (const machine of dept.machines) {
      for (const t of machine.tags) push(t, { dept, machine }, 'machine', machine.id);
    }
  }
  return out;
}

const TAG_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
export const isValidTagName = (name: string) => TAG_NAME_RE.test(name);

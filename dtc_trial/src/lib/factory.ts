import type { Department, Machine, MachineType, Plant, Project, Vec3 } from '../types';
import { SCHEMA_VERSION } from '../types';
import { newId, toCode, uniqueCode, uniqueName } from './id';
import { createDefaultLibrary } from './library';
import { instantiateTags, tpl } from './tags';

export const ZONE_COLORS = ['#22d3ee', '#a78bfa', '#34d399', '#fbbf24', '#f472b6', '#60a5fa', '#fb923c', '#4ade80'];

export function createMachine(type: MachineType, dept: Department, position: Vec3 = [0, 0, 0]): Machine {
  const name = uniqueName(type.name, dept.machines.map((m) => m.name));
  return {
    id: newId('mac'),
    name,
    code: uniqueCode(type.codePrefix || toCode(type.name), dept.machines.map((m) => m.code), true),
    typeId: type.id,
    description: '',
    position,
    rotationY: 0,
    model: structuredClone(type.model),
    connectionId: null,
    tags: instantiateTags(type.tagTemplates),
  };
}

export function createDepartment(
  plant: Plant,
  name: string,
  opts: Partial<Pick<Department, 'position' | 'size' | 'color' | 'code'>> = {},
): Department {
  const finalName = uniqueName(name, plant.departments.map((d) => d.name));
  return {
    id: newId('dep'),
    name: finalName,
    code: opts.code ?? uniqueCode(toCode(finalName), plant.departments.map((d) => d.code)),
    description: '',
    color: opts.color ?? ZONE_COLORS[plant.departments.length % ZONE_COLORS.length],
    position: opts.position ?? [0, 0],
    size: opts.size ?? [20, 16],
    connectionId: null,
    tags: [],
    machines: [],
  };
}

/** Finds a free spot for a new zone to the right of existing ones. */
export function nextDepartmentSlot(plant: Plant, size: [number, number]): [number, number] {
  if (plant.departments.length === 0) return [0, 0];
  const maxX = Math.max(...plant.departments.map((d) => d.position[0] + d.size[0] / 2));
  const minZ = Math.min(...plant.departments.map((d) => d.position[1] - d.size[1] / 2));
  return [maxX + 2 + size[0] / 2, minZ + size[1] / 2];
}

/** Finds a free spot for a machine inside a department (simple row packing). */
export function nextMachineSlot(dept: Department, size: Vec3): Vec3 {
  const [w, d] = dept.size;
  const [mw, , md] = size;
  const gap = 1.5;
  const occupied = dept.machines.map((m) => ({ x: m.position[0], z: m.position[2], w: m.model.size[0], d: m.model.size[2] }));
  for (let z = -d / 2 + md / 2 + gap; z <= d / 2 - md / 2; z += md + gap) {
    for (let x = -w / 2 + mw / 2 + gap; x <= w / 2 - mw / 2; x += 0.5) {
      const free = occupied.every(
        (o) => Math.abs(o.x - x) >= (o.w + mw) / 2 + gap / 2 || Math.abs(o.z - z) >= (o.d + md) / 2 + gap / 2,
      );
      if (free) return [Math.round(x * 2) / 2, 0, Math.round(z * 2) / 2];
    }
  }
  return [0, 0, 0];
}

export function createBlankProject(meta: { name: string; client: string; industry: string; description?: string }): Project {
  const now = new Date().toISOString();
  const plant: Plant = {
    id: newId('plt'),
    name: 'Main Plant',
    code: 'PLT01',
    location: '',
    size: [80, 60],
    tags: [
      tpl('TotalPower', 'REAL', { unit: 'kW', category: 'energy', binding: { kind: 'none' } }),
    ].map((t) => ({ ...t, id: newId('tag') })),
    departments: [],
  };
  const connId = newId('con');
  return {
    schemaVersion: SCHEMA_VERSION,
    id: newId('prj'),
    name: meta.name,
    client: meta.client,
    industry: meta.industry,
    description: meta.description ?? '',
    createdAt: now,
    updatedAt: now,
    naming: { separator: '.', prefix: '', addressTemplate: 'ns=2;s={path}' },
    connections: [
      { id: connId, name: 'Plant OPC UA Server', protocol: 'OPC-UA', endpoint: 'opc.tcp://plant-gateway:4840', notes: '' },
    ],
    defaultConnectionId: connId,
    library: createDefaultLibrary(),
    assets: [],
    plant,
  };
}

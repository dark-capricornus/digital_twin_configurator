import type { Department, ID, Machine, NodeKind, Project, Selection, TagDef } from '../types';

export function findDepartment(p: Project, id: ID): Department | undefined {
  return p.plant.departments.find((d) => d.id === id);
}

export function findMachine(p: Project, id: ID): { dept: Department; machine: Machine } | undefined {
  for (const dept of p.plant.departments) {
    const machine = dept.machines.find((m) => m.id === id);
    if (machine) return { dept, machine };
  }
  return undefined;
}

export interface NodeRef {
  kind: NodeKind;
  id: ID;
  name: string;
  code: string;
  tags: TagDef[];
  dept?: Department;
  machine?: Machine;
}

export function resolveSelection(p: Project, sel: Selection | null): NodeRef | undefined {
  if (!sel) return undefined;
  if (sel.kind === 'plant') {
    return { kind: 'plant', id: p.plant.id, name: p.plant.name, code: p.plant.code, tags: p.plant.tags };
  }
  if (sel.kind === 'department') {
    const dept = findDepartment(p, sel.id);
    return dept && { kind: 'department', id: dept.id, name: dept.name, code: dept.code, tags: dept.tags, dept };
  }
  const hit = findMachine(p, sel.id);
  return (
    hit && {
      kind: 'machine',
      id: hit.machine.id,
      name: hit.machine.name,
      code: hit.machine.code,
      tags: hit.machine.tags,
      dept: hit.dept,
      machine: hit.machine,
    }
  );
}

/** Mutable access to a node's tag list (for use inside immer recipes). */
export function tagListOf(p: Project, sel: Selection): TagDef[] | undefined {
  if (sel.kind === 'plant') return p.plant.tags;
  if (sel.kind === 'department') return findDepartment(p, sel.id)?.tags;
  return findMachine(p, sel.id)?.machine.tags;
}

export function countProject(p: Project) {
  let machines = 0;
  let tags = p.plant.tags.length;
  for (const d of p.plant.departments) {
    tags += d.tags.length;
    machines += d.machines.length;
    for (const m of d.machines) tags += m.tags.length;
  }
  return { departments: p.plant.departments.length, machines, tags };
}

/** World-space [x, z] of a machine (departments are axis-aligned, machines are dept-relative). */
export function machineWorldXZ(dept: Department, m: Machine): [number, number] {
  return [dept.position[0] + m.position[0], dept.position[1] + m.position[2]];
}

export function deptContains(dept: Department, x: number, z: number, margin = 0): boolean {
  const [cx, cz] = dept.position;
  const [w, d] = dept.size;
  return Math.abs(x - cx) <= w / 2 + margin && Math.abs(z - cz) <= d / 2 + margin;
}

export function deptAt(p: Project, x: number, z: number): Department | undefined {
  // Prefer the smallest zone when zones overlap.
  return p.plant.departments
    .filter((d) => deptContains(d, x, z))
    .sort((a, b) => a.size[0] * a.size[1] - b.size[0] * b.size[1])[0];
}

import type { Project, Selection } from '../types';
import { deptContains, machineWorldXZ } from './tree';
import { isValidCode } from './id';
import { flattenTags, isValidTagName } from './tags';

export type Severity = 'error' | 'warning' | 'info';

export interface Issue {
  id: string;
  severity: Severity;
  message: string;
  target?: Selection;
}

/** Static checks run continuously while editing. Errors should block hand-over to runtime. */
export function validateProject(p: Project): Issue[] {
  const issues: Issue[] = [];
  let n = 0;
  const add = (severity: Severity, message: string, target?: Selection) =>
    issues.push({ id: String(n++), severity, message, target });

  const plantSel: Selection = { kind: 'plant', id: p.plant.id };
  if (!isValidCode(p.plant.code)) add('error', `Plant code "${p.plant.code}" has invalid characters`, plantSel);
  if (p.plant.departments.length === 0) add('warning', 'Plant has no departments', plantSel);

  const deptCodes = new Map<string, number>();
  for (const d of p.plant.departments) deptCodes.set(d.code.toUpperCase(), (deptCodes.get(d.code.toUpperCase()) ?? 0) + 1);

  p.plant.departments.forEach((dept, i) => {
    const sel: Selection = { kind: 'department', id: dept.id };
    if (!isValidCode(dept.code)) add('error', `Department "${dept.name}": code "${dept.code}" has invalid characters`, sel);
    if ((deptCodes.get(dept.code.toUpperCase()) ?? 0) > 1) add('error', `Department code "${dept.code}" is used more than once`, sel);
    if (dept.machines.length === 0) add('info', `Department "${dept.name}" has no machines`, sel);

    for (const other of p.plant.departments.slice(i + 1)) {
      const overlapX = Math.abs(dept.position[0] - other.position[0]) < (dept.size[0] + other.size[0]) / 2;
      const overlapZ = Math.abs(dept.position[1] - other.position[1]) < (dept.size[1] + other.size[1]) / 2;
      if (overlapX && overlapZ) add('warning', `Zones "${dept.name}" and "${other.name}" overlap`, sel);
    }

    const [px, pz] = dept.position;
    if (Math.abs(px) + dept.size[0] / 2 > p.plant.size[0] / 2 || Math.abs(pz) + dept.size[1] / 2 > p.plant.size[1] / 2) {
      add('warning', `Department "${dept.name}" extends beyond the plant floor`, sel);
    }

    const machineCodes = new Map<string, number>();
    for (const m of dept.machines) machineCodes.set(m.code.toUpperCase(), (machineCodes.get(m.code.toUpperCase()) ?? 0) + 1);

    for (const m of dept.machines) {
      const msel: Selection = { kind: 'machine', id: m.id };
      if (!isValidCode(m.code)) add('error', `Machine "${m.name}": code "${m.code}" has invalid characters`, msel);
      if ((machineCodes.get(m.code.toUpperCase()) ?? 0) > 1) add('error', `Machine code "${m.code}" is duplicated in ${dept.name}`, msel);
      if (m.tags.length === 0) add('warning', `Machine "${m.name}" has no tags`, msel);
      const [wx, wz] = machineWorldXZ(dept, m);
      if (!deptContains(dept, wx, wz)) add('warning', `Machine "${m.name}" sits outside its department zone`, msel);
      if (m.model.source === 'gltf' && !p.assets.some((a) => a.id === m.model.assetId)) {
        add('error', `Machine "${m.name}" references a missing 3D model`, msel);
      }
    }
  });

  // Tag-level checks
  const pathCount = new Map<string, number>();
  const flat = flattenTags(p);
  for (const f of flat) pathCount.set(f.path.toUpperCase(), (pathCount.get(f.path.toUpperCase()) ?? 0) + 1);
  for (const f of flat) {
    const sel: Selection = { kind: f.nodeKind, id: f.nodeId };
    const where = f.machine?.name ?? f.dept?.name ?? p.plant.name;
    if (!f.tag.name.trim()) add('error', `Unnamed tag on "${where}"`, sel);
    else if (!isValidTagName(f.tag.name)) add('error', `Tag "${f.tag.name}" on "${where}" must start with a letter and use A–Z, 0–9, _`, sel);
    if ((pathCount.get(f.path.toUpperCase()) ?? 0) > 1) add('error', `Duplicate tag path ${f.path}`, sel);
    if (!f.connection) add('warning', `Tag ${f.path} has no data connection`, sel);
    if (f.tag.binding.kind === 'statusColor' && !f.tag.binding.states?.length) {
      add('warning', `Tag ${f.path} uses status colour but defines no states`, sel);
    }
    if (['rotate', 'fillLevel'].includes(f.tag.binding.kind) && (f.tag.dataType === 'BOOL' || f.tag.dataType === 'STRING')) {
      add('warning', `Tag ${f.path}: ${f.tag.binding.kind} binding needs a numeric data type`, sel);
    }
    if (f.tag.binding.kind === 'alarm' && f.tag.dataType !== 'BOOL') {
      add('info', `Tag ${f.path}: alarm binding treats any non-zero value as active`, sel);
    }
  }

  const order: Record<Severity, number> = { error: 0, warning: 1, info: 2 };
  return issues.sort((a, b) => order[a.severity] - order[b.severity]);
}

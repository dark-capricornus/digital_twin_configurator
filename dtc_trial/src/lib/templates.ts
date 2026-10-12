import type { Project } from '../types';
import { createBlankProject, createDepartment, createMachine, nextMachineSlot } from './factory';
import { newId } from './id';
import { builtInTypeId } from './library';
import { tpl } from './tags';

interface DeptSpec {
  name: string;
  code: string;
  size: [number, number];
  /** Built-in machine type keys, placed in order */
  machines: string[];
}

export interface IndustryTemplate {
  id: string;
  industry: string;
  title: string;
  description: string;
  plantName: string;
  plantCode: string;
  departments: DeptSpec[];
}

export const INDUSTRY_TEMPLATES: IndustryTemplate[] = [
  {
    id: 'blank',
    industry: 'General',
    title: 'Blank twin',
    description: 'One empty plant. Build the hierarchy from scratch.',
    plantName: 'Main Plant',
    plantCode: 'PLT01',
    departments: [{ name: 'Area 1', code: 'AREA_01', size: [24, 18], machines: [] }],
  },
  {
    id: 'automotive',
    industry: 'Automotive',
    title: 'Automotive assembly',
    description: 'Body shop, paint shop, machining and final assembly.',
    plantName: 'Vehicle Assembly Plant',
    plantCode: 'VAP01',
    departments: [
      { name: 'Body Shop', code: 'BODY', size: [26, 18], machines: ['robot', 'robot', 'robot', 'robot', 'conveyor', 'conveyor'] },
      { name: 'Paint Shop', code: 'PAINT', size: [26, 18], machines: ['oven', 'robot', 'robot', 'conveyor'] },
      { name: 'Machining', code: 'MACH', size: [26, 18], machines: ['cnc', 'cnc', 'cnc', 'press'] },
      { name: 'Final Assembly', code: 'ASSY', size: [26, 18], machines: ['conveyor', 'conveyor', 'robot', 'agv', 'agv'] },
    ],
  },
  {
    id: 'food',
    industry: 'Food & Beverage',
    title: 'Food & beverage',
    description: 'Raw materials, processing, filling and end-of-line packaging.',
    plantName: 'Beverage Plant',
    plantCode: 'BEV01',
    departments: [
      { name: 'Raw Materials', code: 'RAW', size: [22, 16], machines: ['tank', 'tank', 'tank', 'tank'] },
      { name: 'Processing', code: 'PROC', size: [24, 16], machines: ['mixer', 'mixer', 'oven'] },
      { name: 'Filling', code: 'FILL', size: [22, 16], machines: ['conveyor', 'packer', 'conveyor'] },
      { name: 'Packaging', code: 'PACK', size: [24, 16], machines: ['packer', 'packer', 'robot', 'agv'] },
    ],
  },
  {
    id: 'pharma',
    industry: 'Pharmaceutical',
    title: 'Pharma solid dose',
    description: 'Dispensing, granulation, tableting, coating and packaging.',
    plantName: 'Solid Dose Facility',
    plantCode: 'OSD01',
    departments: [
      { name: 'Dispensing', code: 'DISP', size: [18, 14], machines: ['tank', 'tank', 'generic'] },
      { name: 'Granulation', code: 'GRAN', size: [20, 14], machines: ['mixer', 'mixer'] },
      { name: 'Tableting', code: 'TAB', size: [20, 14], machines: ['press', 'press', 'conveyor'] },
      { name: 'Coating', code: 'COAT', size: [18, 14], machines: ['mixer', 'oven'] },
      { name: 'Packaging', code: 'PACK', size: [22, 14], machines: ['packer', 'packer', 'conveyor'] },
    ],
  },
  {
    id: 'metal',
    industry: 'Metal Fabrication',
    title: 'Metal fabrication',
    description: 'Stamping, machining, welding cells and shipping.',
    plantName: 'Fabrication Works',
    plantCode: 'FAB01',
    departments: [
      { name: 'Stamping', code: 'STAMP', size: [24, 16], machines: ['press', 'press', 'press', 'conveyor'] },
      { name: 'Machining', code: 'MACH', size: [24, 16], machines: ['cnc', 'cnc', 'cnc', 'cnc'] },
      { name: 'Welding', code: 'WELD', size: [24, 16], machines: ['robot', 'robot', 'robot', 'conveyor'] },
      { name: 'Shipping', code: 'SHIP', size: [24, 16], machines: ['agv', 'agv', 'conveyor', 'generic'] },
    ],
  },
];

/** Builds a complete project from an industry template, laying zones out in a 2-column grid. */
export function projectFromTemplate(
  templateId: string,
  meta: { name: string; client: string; description?: string },
): Project {
  const tplDef = INDUSTRY_TEMPLATES.find((t) => t.id === templateId) ?? INDUSTRY_TEMPLATES[0];
  const project = createBlankProject({ ...meta, industry: tplDef.industry });
  const plant = project.plant;
  plant.name = tplDef.plantName;
  plant.code = tplDef.plantCode;

  const gap = 4;
  const cols = tplDef.departments.length > 2 ? 2 : tplDef.departments.length;
  const colW = Math.max(...tplDef.departments.map((d) => d.size[0]));
  const rowD = Math.max(...tplDef.departments.map((d) => d.size[1]));
  const rows = Math.ceil(tplDef.departments.length / cols);
  const totalW = cols * colW + (cols - 1) * gap;
  const totalD = rows * rowD + (rows - 1) * gap;
  plant.size = [Math.ceil(totalW + 16), Math.ceil(totalD + 16)];

  tplDef.departments.forEach((spec, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = -totalW / 2 + colW / 2 + col * (colW + gap);
    const z = -totalD / 2 + rowD / 2 + row * (rowD + gap);
    const dept = createDepartment(plant, spec.name, { code: spec.code, size: spec.size, position: [x, z] });
    if (templateId !== 'blank') {
      dept.tags.push({ ...tpl('OEE', 'REAL', { unit: '%', category: 'quality' }), id: newId('tag') });
    }
    for (const key of spec.machines) {
      const type = project.library.find((t) => t.id === builtInTypeId(key));
      if (!type) continue;
      const m = createMachine(type, dept);
      m.position = nextMachineSlot(dept, type.model.size);
      dept.machines.push(m);
    }
    plant.departments.push(dept);
  });

  return project;
}

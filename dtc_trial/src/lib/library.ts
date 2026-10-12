import type { MachineType, ModelSpec, PrimitiveKind, TagTemplate, Vec3 } from '../types';
import { alarmTpl, statusTpl, tpl } from './tags';

const model = (primitive: PrimitiveKind, color: string, size: Vec3): ModelSpec => ({
  source: 'primitive',
  primitive,
  assetId: null,
  color,
  size,
});

interface BuiltIn {
  key: string;
  name: string;
  category: string;
  description: string;
  codePrefix: string;
  model: ModelSpec;
  tags: () => TagTemplate[];
}

/**
 * Starter machine types copied into every new project's library.
 * Keys are stable so industry templates can refer to them.
 */
const BUILT_INS: BuiltIn[] = [
  {
    key: 'cnc',
    name: 'CNC Machining Center',
    category: 'Machining',
    description: '3/5-axis machining center with spindle and part counter',
    codePrefix: 'CNC',
    model: model('cnc', '#3b82f6', [3.2, 2.6, 2.4]),
    tags: () => [
      statusTpl(),
      tpl('SpindleSpeed', 'REAL', { unit: 'rpm', binding: { kind: 'rotate', min: 0, max: 12000 } }),
      tpl('SpindleLoad', 'REAL', { unit: '%', binding: { kind: 'label', min: 0, max: 100 } }),
      tpl('FeedRate', 'REAL', { unit: 'mm/min' }),
      tpl('PartCount', 'DINT', { unit: 'pcs', category: 'counter' }),
      tpl('ProgramName', 'STRING', { category: 'info' }),
      alarmTpl(),
    ],
  },
  {
    key: 'robot',
    name: 'Industrial Robot',
    category: 'Robotics',
    description: '6-axis articulated robot',
    codePrefix: 'ROB',
    model: model('robot', '#f97316', [1.6, 2.4, 1.6]),
    tags: () => [
      statusTpl(),
      tpl('AxisSpeed', 'REAL', { unit: '%', binding: { kind: 'rotate', min: 0, max: 100 } }),
      tpl('CycleTime', 'REAL', { unit: 's', binding: { kind: 'label', min: 20, max: 60 } }),
      tpl('ProgramNo', 'INT', { category: 'info' }),
      tpl('Payload', 'REAL', { unit: 'kg' }),
      alarmTpl('Fault'),
    ],
  },
  {
    key: 'conveyor',
    name: 'Belt Conveyor',
    category: 'Material Handling',
    description: 'Motorised belt conveyor section',
    codePrefix: 'CNV',
    model: model('conveyor', '#475569', [6, 0.9, 1]),
    tags: () => [
      statusTpl(),
      tpl('BeltSpeed', 'REAL', { unit: 'm/s', binding: { kind: 'rotate', min: 0, max: 2 } }),
      tpl('MotorCurrent', 'REAL', { unit: 'A' }),
      tpl('ItemCount', 'DINT', { unit: 'pcs', category: 'counter' }),
      alarmTpl('JamDetected'),
    ],
  },
  {
    key: 'tank',
    name: 'Storage Tank',
    category: 'Process',
    description: 'Vertical storage vessel with level & temperature',
    codePrefix: 'TNK',
    model: model('tank', '#94a3b8', [2.4, 4, 2.4]),
    tags: () => [
      tpl('Level', 'REAL', { unit: '%', binding: { kind: 'fillLevel', min: 0, max: 100 } }),
      tpl('Temperature', 'REAL', { unit: '°C', binding: { kind: 'label', min: 5, max: 80 } }),
      tpl('Pressure', 'REAL', { unit: 'bar' }),
      tpl('InletValveOpen', 'BOOL', { category: 'status' }),
      tpl('OutletValveOpen', 'BOOL', { category: 'status' }),
      alarmTpl('HighLevelAlarm'),
    ],
  },
  {
    key: 'mixer',
    name: 'Mixer / Reactor',
    category: 'Process',
    description: 'Agitated vessel for batch mixing or reaction',
    codePrefix: 'MIX',
    model: model('mixer', '#cbd5e1', [2.2, 3.4, 2.2]),
    tags: () => [
      statusTpl(),
      tpl('AgitatorSpeed', 'REAL', { unit: 'rpm', binding: { kind: 'rotate', min: 0, max: 300 } }),
      tpl('Level', 'REAL', { unit: '%', binding: { kind: 'fillLevel', min: 0, max: 100 } }),
      tpl('Temperature', 'REAL', { unit: '°C', binding: { kind: 'label', min: 20, max: 120 } }),
      tpl('TempSetpoint', 'REAL', { unit: '°C', access: 'RW', category: 'setpoint' }),
      tpl('BatchID', 'STRING', { category: 'info' }),
      alarmTpl(),
    ],
  },
  {
    key: 'press',
    name: 'Hydraulic Press',
    category: 'Forming',
    description: 'Four-column hydraulic / servo press',
    codePrefix: 'PRS',
    model: model('press', '#0ea5e9', [2.6, 4.2, 2.2]),
    tags: () => [
      statusTpl(),
      tpl('StrokeRate', 'REAL', { unit: 'spm', binding: { kind: 'rotate', min: 0, max: 40 } }),
      tpl('Tonnage', 'REAL', { unit: 't', binding: { kind: 'label', min: 0, max: 400 } }),
      tpl('StrokeCount', 'DINT', { category: 'counter' }),
      alarmTpl(),
    ],
  },
  {
    key: 'oven',
    name: 'Curing / Baking Oven',
    category: 'Thermal',
    description: 'Tunnel oven with zone temperature control',
    codePrefix: 'OVN',
    model: model('oven', '#78716c', [8, 2.6, 2.6]),
    tags: () => [
      statusTpl(),
      tpl('ZoneTemp', 'REAL', { unit: '°C', binding: { kind: 'label', min: 60, max: 240 } }),
      tpl('ZoneSetpoint', 'REAL', { unit: '°C', access: 'RW', category: 'setpoint' }),
      tpl('FanSpeed', 'REAL', { unit: '%', binding: { kind: 'rotate', min: 0, max: 100 } }),
      tpl('GasFlow', 'REAL', { unit: 'm³/h', category: 'energy' }),
      alarmTpl(),
    ],
  },
  {
    key: 'packer',
    name: 'Packaging Machine',
    category: 'Packaging',
    description: 'Filling / wrapping / cartoning machine',
    codePrefix: 'PKG',
    model: model('packer', '#14b8a6', [3, 2.2, 1.8]),
    tags: () => [
      statusTpl(),
      tpl('Speed', 'REAL', { unit: 'ppm', binding: { kind: 'rotate', min: 0, max: 120 } }),
      tpl('GoodCount', 'DINT', { unit: 'pcs', category: 'counter' }),
      tpl('RejectCount', 'DINT', { unit: 'pcs', category: 'quality', binding: { kind: 'label', min: 0, max: 50 } }),
      alarmTpl(),
    ],
  },
  {
    key: 'agv',
    name: 'AGV / AMR',
    category: 'Material Handling',
    description: 'Automated guided vehicle',
    codePrefix: 'AGV',
    model: model('agv', '#eab308', [1.4, 0.6, 1]),
    tags: () => [
      statusTpl(),
      tpl('Battery', 'REAL', { unit: '%', binding: { kind: 'label', min: 0, max: 100 } }),
      tpl('Speed', 'REAL', { unit: 'm/s' }),
      tpl('MissionID', 'STRING', { category: 'info' }),
      alarmTpl(),
    ],
  },
  {
    key: 'generic',
    name: 'Generic Equipment',
    category: 'General',
    description: 'Placeholder block — replace the model or tags as needed',
    codePrefix: 'EQ',
    model: model('box', '#a855f7', [2, 2, 2]),
    tags: () => [statusTpl(), alarmTpl()],
  },
];

/** Built-in type ids are deterministic ("type_cnc") so templates can reference them. */
export const builtInTypeId = (key: string) => `type_${key}`;

export function createDefaultLibrary(): MachineType[] {
  return BUILT_INS.map((b) => ({
    id: builtInTypeId(b.key),
    name: b.name,
    category: b.category,
    description: b.description,
    codePrefix: b.codePrefix,
    model: structuredClone(b.model),
    tagTemplates: b.tags(),
  }));
}

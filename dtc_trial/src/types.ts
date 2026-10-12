/**
 * Domain model for a Digital Twin configuration.
 *
 * A twin is a *definition*: hierarchy, 3D layout and tag bindings.
 * It never stores live values — those are resolved at runtime from the
 * connections referenced by each tag.
 */

export type ID = string;

export const SCHEMA_VERSION = 1;

/* ------------------------------------------------------------------ tags */

export type DataType = 'BOOL' | 'INT' | 'DINT' | 'REAL' | 'STRING';
export const DATA_TYPES: DataType[] = ['BOOL', 'INT', 'DINT', 'REAL', 'STRING'];

export type TagAccess = 'R' | 'W' | 'RW';
export const TAG_ACCESS: TagAccess[] = ['R', 'W', 'RW'];

export type TagCategory =
  | 'status'
  | 'process'
  | 'alarm'
  | 'counter'
  | 'setpoint'
  | 'energy'
  | 'quality'
  | 'info';
export const TAG_CATEGORIES: TagCategory[] = [
  'status',
  'process',
  'alarm',
  'counter',
  'setpoint',
  'energy',
  'quality',
  'info',
];

/** How a tag drives the 3D model at runtime. */
export type BindingKind = 'none' | 'statusColor' | 'rotate' | 'fillLevel' | 'alarm' | 'label';
export const BINDING_KINDS: { kind: BindingKind; label: string; hint: string }[] = [
  { kind: 'none', label: 'None', hint: 'Data only, no visual effect' },
  { kind: 'statusColor', label: 'Status colour', hint: 'Maps discrete values to the stack-light colour' },
  { kind: 'rotate', label: 'Rotation speed', hint: 'Spins the moving part proportionally to the value' },
  { kind: 'fillLevel', label: 'Fill level', hint: 'Drives the level indicator (min → empty, max → full)' },
  { kind: 'alarm', label: 'Alarm flash', hint: 'Model flashes red while the value is true' },
  { kind: 'label', label: 'Value label', hint: 'Shows the live value in the 3D label' },
];

export interface StatusState {
  value: string;
  label: string;
  color: string;
}

export interface TagBinding {
  kind: BindingKind;
  /** statusColor */
  states?: StatusState[];
  /** rotate / fillLevel / label – engineering range used for scaling */
  min?: number;
  max?: number;
}

export interface TagDef {
  id: ID;
  /** Signal name, e.g. "SpindleSpeed". Combined with the hierarchy to form the tag path. */
  name: string;
  description: string;
  dataType: DataType;
  unit: string;
  access: TagAccess;
  category: TagCategory;
  /** null → inherit from machine / department / project default */
  connectionId: ID | null;
  /** '' → generated from the project's address template */
  address: string;
  binding: TagBinding;
}

export type TagTemplate = Omit<TagDef, 'id'>;

/* --------------------------------------------------------------- models */

export type PrimitiveKind =
  | 'box'
  | 'cnc'
  | 'robot'
  | 'conveyor'
  | 'tank'
  | 'mixer'
  | 'press'
  | 'oven'
  | 'packer'
  | 'agv';

export const PRIMITIVES: { kind: PrimitiveKind; label: string }[] = [
  { kind: 'cnc', label: 'CNC machine' },
  { kind: 'robot', label: 'Robot arm' },
  { kind: 'conveyor', label: 'Conveyor' },
  { kind: 'tank', label: 'Tank' },
  { kind: 'mixer', label: 'Mixer / reactor' },
  { kind: 'press', label: 'Press' },
  { kind: 'oven', label: 'Oven / tunnel' },
  { kind: 'packer', label: 'Packaging machine' },
  { kind: 'agv', label: 'AGV' },
  { kind: 'box', label: 'Generic block' },
];

export type Vec3 = [number, number, number];

export interface ModelSpec {
  source: 'primitive' | 'gltf';
  primitive: PrimitiveKind;
  /** Asset id in project.assets when source === 'gltf' */
  assetId: ID | null;
  color: string;
  /** Bounding size in metres: width (x), height (y), depth (z). GLTF models are scaled to fit. */
  size: Vec3;
}

/** Reusable machine definition: 3D model + tag templates. */
export interface MachineType {
  id: ID;
  name: string;
  category: string;
  description: string;
  /** Prefix used when auto-generating machine codes, e.g. "CNC" → CNC_01 */
  codePrefix: string;
  model: ModelSpec;
  tagTemplates: TagTemplate[];
}

/* ------------------------------------------------------------ hierarchy */

export interface Machine {
  id: ID;
  name: string;
  code: string;
  typeId: ID | null;
  description: string;
  /** Position relative to the department centre (y = elevation). */
  position: Vec3;
  /** Degrees around the vertical axis */
  rotationY: number;
  model: ModelSpec;
  connectionId: ID | null;
  tags: TagDef[];
}

export interface Department {
  id: ID;
  name: string;
  code: string;
  description: string;
  color: string;
  /** Centre of the zone on the plant floor [x, z] */
  position: [number, number];
  /** Zone footprint [width (x), depth (z)] */
  size: [number, number];
  connectionId: ID | null;
  tags: TagDef[];
  machines: Machine[];
}

export interface Plant {
  id: ID;
  name: string;
  code: string;
  location: string;
  /** Floor footprint [width (x), depth (z)] */
  size: [number, number];
  tags: TagDef[];
  departments: Department[];
}

/* -------------------------------------------------------- integration */

export type Protocol = 'OPC-UA' | 'MQTT' | 'Modbus-TCP' | 'S7' | 'EtherNet/IP' | 'REST';
export const PROTOCOLS: Protocol[] = ['OPC-UA', 'MQTT', 'Modbus-TCP', 'S7', 'EtherNet/IP', 'REST'];

export interface Connection {
  id: ID;
  name: string;
  protocol: Protocol;
  endpoint: string;
  notes: string;
}

export interface Asset {
  id: ID;
  name: string;
  mime: string;
  bytes: number;
  dataUrl: string;
}

export interface NamingConvention {
  /** Joins hierarchy segments: PLANT{sep}DEPT{sep}MACHINE{sep}Tag */
  separator: string;
  /** Optional leading segment, e.g. enterprise or site code */
  prefix: string;
  /** Default address. Placeholders: {path} {plant} {department} {machine} {tag} */
  addressTemplate: string;
}

export interface Project {
  schemaVersion: number;
  id: ID;
  name: string;
  client: string;
  industry: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  naming: NamingConvention;
  connections: Connection[];
  defaultConnectionId: ID | null;
  library: MachineType[];
  assets: Asset[];
  plant: Plant;
}

export interface ProjectSummary {
  id: ID;
  name: string;
  client: string;
  industry: string;
  updatedAt: string;
  departments: number;
  machines: number;
  tags: number;
}

/* ------------------------------------------------------------ selection */

export type NodeKind = 'plant' | 'department' | 'machine';
export interface Selection {
  kind: NodeKind;
  id: ID;
}

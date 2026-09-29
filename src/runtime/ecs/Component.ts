import type { EntityId } from './Entity';

/**
 * Base Component interface.
 * Components must be PURE DATA. No logic. No methods.
 * Serializable to JSON natively.
 */
export interface Component {
  readonly type: string;
  readonly entityId: EntityId;
}

// ==========================================
// CORE COMPONENT DEFINITIONS
// ==========================================

export interface TransformComponent extends Component {
  type: 'Transform';
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}

export interface RenderComponent extends Component {
  type: 'Render';
  visible: boolean;
  castShadow: boolean;
  receiveShadow: boolean;
  materialId?: string;
  geometryId?: string;
  color?: string;
}

export interface BindingComponent extends Component {
  type: 'Binding';
  topic: string;
  protocol: 'mqtt' | 'opcua' | 'websocket' | 'rest';
  datatype: 'float' | 'string' | 'boolean';
  targetProperty: string; // e.g., 'transform.position.y' or 'render.color'
  updateMode: 'realtime' | 'polled';
  lastValue?: any;
  lastUpdated?: number;
}

export interface AnimationComponent extends Component {
  type: 'Animation';
  clipIds: string[];
  activeClipId?: string;
  speed: number;
  time: number;
  loop: boolean;
}

export interface PlacementComponent extends Component {
  type: 'Placement';
  /** The computed Y offset that grounds the model on the surface */
  groundedY: number;
  /** World-space bounding box minimum corner */
  boundingMin: [number, number, number];
  /** World-space bounding box maximum corner */
  boundingMax: [number, number, number];
  /** World-space bounding box center */
  boundingCenter: [number, number, number];
  /** XZ footprint dimensions: [width, depth] */
  footprint: [number, number];
  /** How the pivot was determined */
  pivotMode: 'center' | 'bottom' | 'auto' | 'custom';
}

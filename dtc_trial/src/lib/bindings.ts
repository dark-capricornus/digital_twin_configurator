import type { ID, TagDef } from '../types';

/** What the 3D model needs to render, derived from tag bindings + (simulated or live) values. */
export interface VisualState {
  statusColor: string | null;
  statusLabel: string | null;
  /** 0..1 – speed of the model's moving part */
  spin: number;
  /** 0..1 or null when no fill-level tag exists */
  fill: number | null;
  alarm: boolean;
  labels: { name: string; text: string }[];
}

export const IDLE_VISUAL: VisualState = { statusColor: null, statusLabel: null, spin: 0, fill: null, alarm: false, labels: [] };

const norm = (v: number, min = 0, max = 100) => (max === min ? 0 : Math.min(1, Math.max(0, (v - min) / (max - min))));

const fmt = (v: unknown) => (typeof v === 'number' ? (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1)) : String(v));

export function evaluateBindings(tags: TagDef[], values: Record<ID, unknown>): VisualState {
  const out: VisualState = { ...IDLE_VISUAL, labels: [] };
  let spinSet = false;
  for (const tag of tags) {
    const v = values[tag.id];
    if (v === undefined) continue;
    const b = tag.binding;
    switch (b.kind) {
      case 'statusColor': {
        const st = b.states?.find((s) => s.value === String(v));
        if (st) {
          out.statusColor = st.color;
          out.statusLabel = st.label;
        }
        break;
      }
      case 'rotate':
        if (!spinSet && typeof v === 'number') {
          out.spin = norm(v, b.min, b.max);
          spinSet = true;
        }
        break;
      case 'fillLevel':
        if (out.fill === null && typeof v === 'number') out.fill = norm(v, b.min, b.max);
        break;
      case 'alarm':
        if (v === true || (typeof v === 'number' && v !== 0)) out.alarm = true;
        break;
      case 'label':
        out.labels.push({ name: tag.name, text: `${fmt(v)}${tag.unit ? ` ${tag.unit}` : ''}` });
        break;
    }
  }
  // A stopped/faulted machine should not keep spinning.
  if (out.statusLabel && /stop|fault|off/i.test(out.statusLabel)) out.spin = 0;
  return out;
}

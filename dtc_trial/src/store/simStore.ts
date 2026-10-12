import { create } from 'zustand';
import type { ID, TagDef } from '../types';
import { flattenTags } from '../lib/tags';
import { useProject } from './projectStore';

/**
 * Preview-only simulator. Generates plausible values for tags that have a
 * visual binding so the team can check bindings before a live connection exists.
 * Nothing here is persisted into the twin definition.
 */
type Value = number | boolean | string;

interface SimState {
  running: boolean;
  values: Record<ID, Value>;
  start: () => void;
  stop: () => void;
}

let timer: ReturnType<typeof setInterval> | null = null;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function nextValue(tag: TagDef, prev: Value | undefined): Value | undefined {
  const b = tag.binding;
  const min = b.min ?? 0;
  const max = b.max ?? 100;
  switch (b.kind) {
    case 'statusColor': {
      const states = b.states ?? [];
      if (!states.length) return undefined;
      // Sticky: mostly keep the current state, prefer the "running"-like second state.
      if (prev !== undefined && Math.random() < 0.85) return prev;
      const r = Math.random();
      const pick = r < 0.7 ? states[Math.min(1, states.length - 1)] : states[Math.floor(Math.random() * states.length)];
      return pick.value;
    }
    case 'alarm':
      if (prev === true) return Math.random() < 0.6;
      return Math.random() < 0.04;
    case 'rotate':
    case 'fillLevel':
    case 'label': {
      const span = max - min || 1;
      const base = typeof prev === 'number' ? prev : min + span * (0.4 + Math.random() * 0.4);
      return clamp(base + (Math.random() - 0.5) * span * 0.12, min, max);
    }
    default:
      return undefined;
  }
}

function tick() {
  const p = useProject.getState().project;
  if (!p) return;
  const prev = useSim.getState().values;
  const values: Record<ID, Value> = {};
  for (const f of flattenTags(p)) {
    const v = nextValue(f.tag, prev[f.tag.id]);
    if (v !== undefined) values[f.tag.id] = v;
  }
  useSim.setState({ values });
}

export const useSim = create<SimState>((set) => ({
  running: false,
  values: {},
  start: () => {
    if (timer) clearInterval(timer);
    tick();
    timer = setInterval(tick, 1000);
    set({ running: true });
  },
  stop: () => {
    if (timer) clearInterval(timer);
    timer = null;
    set({ running: false, values: {} });
  },
}));

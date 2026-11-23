import { create } from 'zustand';
import { EventBus } from '../core/events';
import type { FoundationSnapshot } from '../runtime/systems/FoundationGrid';

// ==========================================
// FOUNDATION STORE — Thin UI Bridge
//
// This store NO LONGER acts as the source of truth
// or handles foundation logic. It simply listens
// to the EventBus for `FOUNDATION_UPDATED` events
// and holds the latest snapshot for the React
// rendering layer (FoundationRenderer.tsx).
// ==========================================

export interface FoundationState {
  snapshot: FoundationSnapshot;
  cellCount: number;
}

const EMPTY_SNAPSHOT: FoundationSnapshot = {
  worldX: new Float32Array(0),
  worldY: new Float32Array(0),
  worldZ: new Float32Array(0),
  cellFlags: new Uint8Array(0),
  regionIds: new Int32Array(0),
  count: 0,
};

export const useFoundationStore = create<FoundationState>((set) => {
  // Subscribe to foundation updates from the authoritative FoundationSystem
  EventBus.subscribe('FOUNDATION_UPDATED', (payload) => {
    set({
      snapshot: payload.snapshot,
      cellCount: payload.cellCount,
    });
  });

  return {
    snapshot: EMPTY_SNAPSHOT,
    cellCount: 0,
  };
});

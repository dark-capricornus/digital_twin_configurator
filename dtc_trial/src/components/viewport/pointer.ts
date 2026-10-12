import type { ThreeEvent } from '@react-three/fiber';

/**
 * Where the last press started, in client coordinates. Recorded by the viewport
 * container. We don't rely on R3F's `e.delta`, which is computed from offsetX and
 * drifts between pointerdown and click under fractional browser zoom.
 */
export const press = { x: 0, y: 0, /** a 3D object consumed this click */ handled: false };

const CLICK_TOLERANCE_PX = 5;

export const movedSincePress = (clientX: number, clientY: number) => Math.hypot(clientX - press.x, clientY - press.y);

/** True when the pointer barely moved between down and up — i.e. a click, not an orbit drag. */
export const isClick = (e: ThreeEvent<MouseEvent>) => {
  press.handled = true;
  return movedSincePress(e.nativeEvent.clientX, e.nativeEvent.clientY) < CLICK_TOLERANCE_PX;
};

export const isBackgroundClick = (clientX: number, clientY: number) =>
  !press.handled && movedSincePress(clientX, clientY) < CLICK_TOLERANCE_PX && performance.now() - gizmo.lastReleaseAt > 250;

/** Set when a gizmo drag ends so the trailing "pointer missed" doesn't clear the selection. */
export const gizmo = { lastReleaseAt: 0 };

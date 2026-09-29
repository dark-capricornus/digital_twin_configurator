/// <reference lib="webworker" />
import type { SceneNode } from '../store/scene';
import { SceneDiffer } from '../core/scene/SceneDiffer';

interface DiffJobMessage {
  jobId: string;
  baseState: Record<string, SceneNode>;
  targetState: Record<string, SceneNode>;
}

self.onmessage = (e: MessageEvent<DiffJobMessage>) => {
  const { jobId, baseState, targetState } = e.data;

  try {
    const patches = SceneDiffer.diff(baseState, targetState);

    self.postMessage({
      status: 'success',
      jobId,
      patches
    });
  } catch (error) {
    self.postMessage({
      status: 'error',
      jobId,
      error: error instanceof Error ? error.message : 'Diffing failed'
    });
  }
};

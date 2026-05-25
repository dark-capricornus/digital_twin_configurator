import type { PatchOperation } from '../scene/SceneDiffer';

export interface ReplicationEvent {
  sequenceId: number;
  timestamp: number;
  clientId: string;
  patches: PatchOperation[];
}

/**
 * Prepares the architecture for CRDT/Event-sourcing network sync.
 * Collects local patches and broadcasts them, while receiving and resolving remote patches.
 */
export class ReplicationManagerImpl {
  private clientId: string = crypto.randomUUID();
  private sequenceCounter: number = 0;

  public broadcastPatches(patches: PatchOperation[]): void {
    if (patches.length === 0) return;

    const event: ReplicationEvent = {
      sequenceId: ++this.sequenceCounter,
      timestamp: Date.now(),
      clientId: this.clientId,
      patches
    };

    console.debug('[ReplicationManager] Broadcasting patches:', event);
    // networkAdapter.send(event);
  }

  public onReceivePatches(event: ReplicationEvent): void {
    // 1. Conflict resolution / OT logic here
    // 2. Dispatch to ScenePatcher via EventBus or direct state update
    console.debug('[ReplicationManager] Received patches from:', event.clientId);
  }
}

export const ReplicationManager = new ReplicationManagerImpl();

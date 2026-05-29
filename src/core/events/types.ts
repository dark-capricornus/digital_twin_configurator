export type EventPayloads = {
  // Scene Events
  SCENE_LOADED: { sceneId: string };
  SCENE_CLEARED: void;
  
  // Node Events
  NODE_ADDED: { nodeId: string; parentId: string };
  NODE_REMOVED: { nodeId: string; parentId: string };
  NODE_SELECTED: { nodeId: string | null };
  NODE_TRANSFORM_UPDATED: {
    nodeId: string;
    position?: [number, number, number];
    rotation?: [number, number, number];
    scale?: [number, number, number];
  };
  NODE_REPARENTED: { nodeId: string; oldParentId: string; newParentId: string };
  
  // Asset Events
  ASSET_IMPORTED: { assetId: string; name: string };
  ASSET_REMOVED: { assetId: string };
  
  // Placement Events
  MODEL_PLACED: { nodeId: string; assetId: string; position: [number, number, number] };
  PLACEMENT_PREVIEW_UPDATED: { assetId: string; position: [number, number, number] | null };

  // Command Events
  COMMAND_EXECUTED: { commandName: string; timestamp: number };
  COMMAND_UNDONE: { commandName: string; timestamp: number };
  COMMAND_REDONE: { commandName: string; timestamp: number };
};

export type EventType = keyof EventPayloads;

export type EventHandler<T extends EventType> = (payload: EventPayloads[T]) => void;

export interface EventSubscription {
  unsubscribe: () => void;
}

export type EntityId = string;

export interface Entity {
  id: EntityId;
  name: string;
  // A bitmask or simple string array defining which component signatures this entity possesses.
  // In a highly optimized ECS, this would be a Uint32Array mask.
  componentSignatures: Set<string>;
}

export const createEntity = (name: string = 'Unnamed Entity'): Entity => ({
  id: crypto.randomUUID(),
  name,
  componentSignatures: new Set<string>()
});

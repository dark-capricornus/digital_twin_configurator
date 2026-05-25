import { openDB, type IDBPDatabase } from 'idb';

export interface WorkspaceProfile {
  id: string;
  name: string;
  panelVisibility: {
    assets: boolean;
    hierarchy: boolean;
    inspector: boolean;
  };
  panelSizes: Record<string, number>;
  activeToolId: string;
  isGridVisible: boolean;
  editorMode: 'object' | 'preview';
  updatedAt: number;
}

const DEFAULT_WORKSPACE_ID = 'default-workspace';

class WorkspaceManagerImpl {
  private dbPromise: Promise<IDBPDatabase<unknown>>;

  constructor() {
    this.dbPromise = openDB('DigitalTwinConfiguratorDB', 2, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('workspaces')) {
          db.createObjectStore('workspaces', { keyPath: 'id' });
        }
      },
    });
  }

  public async saveWorkspace(profile: WorkspaceProfile): Promise<void> {
    const db = await this.dbPromise;
    profile.updatedAt = Date.now();
    await db.put('workspaces', profile);
  }

  public async loadWorkspace(id: string = DEFAULT_WORKSPACE_ID): Promise<WorkspaceProfile | undefined> {
    const db = await this.dbPromise;
    return await db.get('workspaces', id);
  }
}

export const WorkspaceManager = new WorkspaceManagerImpl();

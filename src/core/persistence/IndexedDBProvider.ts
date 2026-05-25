import { openDB, type IDBPDatabase } from 'idb';

export interface SceneProject {
  id: string;
  name: string;
  updatedAt: number;
  data: unknown; // The serialized scene graph
}

export interface AssetData {
  id: string;
  name: string;
  type: string;
  file: Blob;
  uploadedAt: number;
  path?: string;
}

export class PersistenceService {
  private static instance: PersistenceService;
  private dbPromise: Promise<IDBPDatabase<unknown>>;

  private constructor() {
    this.dbPromise = openDB('DigitalTwinConfiguratorDB', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('projects')) {
          db.createObjectStore('projects', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('assets')) {
          db.createObjectStore('assets', { keyPath: 'id' });
        }
      },
    });
  }

  public static getInstance(): PersistenceService {
    if (!PersistenceService.instance) {
      PersistenceService.instance = new PersistenceService();
    }
    return PersistenceService.instance;
  }

  public async saveProject(project: SceneProject): Promise<void> {
    const db = await this.dbPromise;
    await db.put('projects', project);
  }

  public async getProject(id: string): Promise<SceneProject | undefined> {
    const db = await this.dbPromise;
    return await db.get('projects', id);
  }

  public async getAllProjects(): Promise<SceneProject[]> {
    const db = await this.dbPromise;
    return await db.getAll('projects');
  }

  public async deleteProject(id: string): Promise<void> {
    const db = await this.dbPromise;
    await db.delete('projects', id);
  }

  // Asset Methods
  public async saveAsset(asset: AssetData): Promise<void> {
    const db = await this.dbPromise;
    await db.put('assets', asset);
  }

  public async getAsset(id: string): Promise<AssetData | undefined> {
    const db = await this.dbPromise;
    return await db.get('assets', id);
  }

  public async getAllAssets(): Promise<AssetData[]> {
    const db = await this.dbPromise;
    return await db.getAll('assets');
  }

  public async deleteAsset(id: string): Promise<void> {
    const db = await this.dbPromise;
    await db.delete('assets', id);
  }
}

export const persistenceService = PersistenceService.getInstance();

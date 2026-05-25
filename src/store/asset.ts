import { create } from 'zustand';
import { persistenceService, type AssetData } from '../core/persistence/IndexedDBProvider';

export interface AssetState {
  assets: AssetData[];
  
  // Actions
  loadAssets: () => Promise<void>;
  importAsset: (file: File) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
  deleteFolder: (folderPath: string) => Promise<void>;
}

export const useAssetStore = create<AssetState>((set) => ({
  assets: [],

  loadAssets: async () => {
    const assets = await persistenceService.getAllAssets();
    set({ assets });
  },

  importAsset: async (file: File) => {
    let path = '/';
    if (file.webkitRelativePath) {
      const parts = file.webkitRelativePath.split('/');
      // Remove the actual file name from the end
      parts.pop();
      if (parts.length > 0) {
        path = '/' + parts.join('/') + '/';
      }
    }

    const newAsset: AssetData = {
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      type: file.name.endsWith('.glb') ? 'glb' : 'unknown',
      file: file,
      uploadedAt: Date.now(),
      path: path,
    };

    await persistenceService.saveAsset(newAsset);
    set((state) => ({ assets: [...state.assets, newAsset] }));
  },

  deleteAsset: async (id: string) => {
    await persistenceService.deleteAsset(id);
    set((state) => ({
      assets: state.assets.filter((a) => a.id !== id),
    }));
  },

  deleteFolder: async (folderPath: string) => {
    const state = useAssetStore.getState();
    const toDelete = state.assets.filter((a) => (a.path || '/').startsWith(folderPath));
    for (const asset of toDelete) {
      await persistenceService.deleteAsset(asset.id);
    }
    set((state) => ({
      assets: state.assets.filter((a) => !(a.path || '/').startsWith(folderPath)),
    }));
  },
}));

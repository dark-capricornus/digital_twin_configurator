import type { AssetMetadata, AssetRecord } from './types';
import { EventBus } from '../events';

class AssetRegistryImpl {
  private assets = new Map<string, AssetRecord>();

  public registerAsset(metadata: AssetMetadata, blob: Blob): void {
    this.assets.set(metadata.id, { metadata, blob });
    EventBus.emit('ASSET_IMPORTED', { assetId: metadata.id, name: metadata.name });
  }

  public getAsset(id: string): AssetRecord | undefined {
    return this.assets.get(id);
  }

  public removeAsset(id: string): void {
    if (this.assets.has(id)) {
      this.assets.delete(id);
      EventBus.emit('ASSET_REMOVED', { assetId: id });
    }
  }

  public updateParsedData(id: string, parsedData: any): void {
    const asset = this.assets.get(id);
    if (asset) {
      asset.parsedData = parsedData;
    }
  }

  public getAllAssets(): AssetRecord[] {
    return Array.from(this.assets.values());
  }
}

export const AssetRegistry = new AssetRegistryImpl();

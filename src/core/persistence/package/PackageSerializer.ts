import { SceneSerializer } from '../SceneSerializer';
import { AssetRegistry } from '../../assets/AssetRegistry';
import type { SceneNode } from '../../../store/scene';

export interface PackageManifest {
  version: string;
  name: string;
  createdAt: number;
  scene: any; // The serialized digital-twin-scene JSON
  assets: Record<string, {
    name: string;
    type: string;
    format: string;
    path: string;
  }>;
}

/**
 * Handles creation and loading of portable .dtwinpkg files.
 */
export class PackageSerializer {
  private static readonly PKG_VERSION = '1.0.0';

  /**
   * Serializes the current project into a deployable package format.
   * For the MVP, this just constructs the JSON manifest.
   * In production, this would use JSZip to bundle the JSON + binary Blobs.
   */
  public static async exportPackage(projectName: string, nodes: Record<string, SceneNode>): Promise<Blob> {
    const sceneJson = JSON.parse(SceneSerializer.serialize(nodes));
    
    // Gather assets
    const assets = AssetRegistry.getAllAssets();
    const assetManifest: PackageManifest['assets'] = {};
    
    for (const asset of assets) {
      assetManifest[asset.id] = {
        name: asset.name,
        type: asset.type,
        format: asset.format,
        path: `assets/${asset.id}.${asset.format}`
      };
    }

    const manifest: PackageManifest = {
      version: PackageSerializer.PKG_VERSION,
      name: projectName,
      createdAt: Date.now(),
      scene: sceneJson,
      assets: assetManifest
    };

    // Serialize to a JSON Blob (Simulation of the .dtwinpkg archive)
    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
    return blob;
  }

  public static async importPackage(blob: Blob): Promise<void> {
    const text = await blob.text();
    const manifest: PackageManifest = JSON.parse(text);

    console.info(`[PackageSerializer] Imported package: ${manifest.name} (v${manifest.version})`);
    
    // 1. Rehydrate assets from zip (omitted in stub)
    // 2. Pass manifest.scene to SceneSerializer.deserialize()
    // 3. Update Zustand store
  }
}

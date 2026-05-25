export type AssetId = string;
export type NodeId = string;

/**
 * AssetDependencyGraph tracks exactly which runtime nodes depend on which assets (meshes, textures).
 * Allows for robust lazy-loading, ref-counting, and cleanup.
 */
class AssetDependencyGraphImpl {
  // AssetID -> Set of NodeIDs
  private assetToNodes = new Map<AssetId, Set<NodeId>>();
  // NodeID -> Set of AssetIDs
  private nodeToAssets = new Map<NodeId, Set<AssetId>>();

  public addDependency(nodeId: NodeId, assetId: AssetId): void {
    if (!this.assetToNodes.has(assetId)) {
      this.assetToNodes.set(assetId, new Set());
    }
    this.assetToNodes.get(assetId)!.add(nodeId);

    if (!this.nodeToAssets.has(nodeId)) {
      this.nodeToAssets.set(nodeId, new Set());
    }
    this.nodeToAssets.get(nodeId)!.add(assetId);
  }

  public removeDependency(nodeId: NodeId, assetId: AssetId): void {
    const nodes = this.assetToNodes.get(assetId);
    if (nodes) {
      nodes.delete(nodeId);
      if (nodes.size === 0) {
        // Here we could trigger a cleanup/unloading event
        // EventBus.emit('ASSET_UNUSED', { assetId });
      }
    }

    const assets = this.nodeToAssets.get(nodeId);
    if (assets) {
      assets.delete(assetId);
    }
  }

  public removeNode(nodeId: NodeId): void {
    const assets = this.nodeToAssets.get(nodeId);
    if (assets) {
      for (const assetId of Array.from(assets)) {
        this.removeDependency(nodeId, assetId);
      }
      this.nodeToAssets.delete(nodeId);
    }
  }

  public getDependenciesOf(nodeId: NodeId): AssetId[] {
    return Array.from(this.nodeToAssets.get(nodeId) || []);
  }

  public getUsagesOf(assetId: AssetId): NodeId[] {
    return Array.from(this.assetToNodes.get(assetId) || []);
  }

  public getReferenceCount(assetId: AssetId): number {
    return this.assetToNodes.get(assetId)?.size || 0;
  }
}

export const AssetDependencyGraph = new AssetDependencyGraphImpl();

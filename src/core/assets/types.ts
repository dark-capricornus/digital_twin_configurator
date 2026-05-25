export type AssetType = 'model' | 'texture' | 'material' | 'audio' | 'script';

export interface AssetMetadata {
  id: string;
  name: string;
  type: AssetType;
  fileSize: number;
  hash?: string;
  createdAt: number;
  // Format-specific metadata
  format?: 'gltf' | 'glb' | 'obj' | 'fbx' | 'png' | 'jpg';
  attributes?: Record<string, any>;
}

export interface AssetParseJob {
  id: string;
  assetId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  result?: any;
}

export interface AssetRecord {
  metadata: AssetMetadata;
  blob?: Blob;
  parsedData?: any; // e.g., the JSON node graph generated from the model
}

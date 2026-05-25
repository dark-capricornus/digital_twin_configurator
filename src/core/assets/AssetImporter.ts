import type { AssetParseJob } from './types';
import { AssetRegistry } from './AssetRegistry';

class AssetImporterImpl {
  private activeJobs = new Map<string, AssetParseJob>();

  public async importFile(file: File): Promise<string> {
    const assetId = crypto.randomUUID();
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    // 1. Create Job
    const jobId = crypto.randomUUID();
    this.activeJobs.set(jobId, {
      id: jobId,
      assetId,
      status: 'pending',
      progress: 0
    });

    // 2. Register base metadata in Registry
    AssetRegistry.registerAsset({
      id: assetId,
      name: file.name,
      type: this.determineType(extension),
      fileSize: file.size,
      createdAt: Date.now(),
      format: extension as any,
    }, file);

    // 3. Dispatch worker job (Simulated for now, ready for Web Workers)
    this.dispatchParseJob(jobId);

    return assetId;
  }

  private async dispatchParseJob(jobId: string): Promise<void> {
    const job = this.activeJobs.get(jobId);
    if (!job) return;

    job.status = 'processing';
    job.progress = 10;

    try {
      // In a Vite environment, workers are instantiated using ?worker
      // We will create the worker dynamically
      const worker = new Worker(new URL('../../workers/asset-parser.worker.ts', import.meta.url), { type: 'module' });
      
      worker.postMessage({ type: 'PARSE_GLB', jobId });

      worker.onmessage = (e) => {
        const data = e.data;
        if (data.status === 'success') {
          job.progress = 100;
          job.status = 'completed';
          AssetRegistry.updateParsedData(job.assetId, data.result);
          
          // Here we would also register dependencies to the AssetDependencyGraph
          // e.g., if data.result.extractedAssets contains materials, register them.

          this.activeJobs.delete(jobId);
          worker.terminate();
        } else {
          job.status = 'failed';
          job.error = data.error;
          this.activeJobs.delete(jobId);
          worker.terminate();
        }
      };

      worker.onerror = (err) => {
        job.status = 'failed';
        job.error = err.message;
        this.activeJobs.delete(jobId);
        worker.terminate();
      };
    } catch (err) {
      job.status = 'failed';
      job.error = err instanceof Error ? err.message : 'Unknown error';
      this.activeJobs.delete(jobId);
    }
  }

  private determineType(extension?: string): any {
    switch(extension) {
      case 'gltf':
      case 'glb':
      case 'obj':
      case 'fbx':
        return 'model';
      case 'png':
      case 'jpg':
      case 'jpeg':
        return 'texture';
      default:
        return 'model';
    }
  }
}

export const AssetImporter = new AssetImporterImpl();

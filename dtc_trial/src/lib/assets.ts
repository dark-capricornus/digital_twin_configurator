import type { Asset } from '../types';
import { actions } from '../store/projectStore';
import { toast } from '../store/uiStore';

const MAX_BYTES = 30 * 1024 * 1024;

const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });

/** Prompts for a .glb/.gltf file and stores it in the project's asset list. */
export function pickModelAsset(): Promise<Asset | undefined> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.glb,.gltf,model/gltf-binary,model/gltf+json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve(undefined);
      if (file.size > MAX_BYTES) {
        toast(`${file.name} is ${(file.size / 1048576).toFixed(1)} MB — limit is 30 MB`, 'error');
        return resolve(undefined);
      }
      try {
        const isGlb = file.name.toLowerCase().endsWith('.glb');
        const raw = await readAsDataUrl(file);
        // Normalise the mime so the GLTF loader picks the right parser.
        const dataUrl = raw.replace(/^data:[^;]*;/, `data:${isGlb ? 'model/gltf-binary' : 'model/gltf+json'};`);
        const asset = actions.addAsset({ name: file.name, mime: isGlb ? 'model/gltf-binary' : 'model/gltf+json', bytes: file.size, dataUrl });
        toast(`Imported ${file.name}`, 'success');
        resolve(asset);
      } catch {
        toast(`Could not read ${file.name}`, 'error');
        resolve(undefined);
      }
    };
    input.click();
  });
}

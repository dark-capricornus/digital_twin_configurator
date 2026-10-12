import type { Project } from '../types';
import { flattenTags } from './tags';

export function download(filename: string, content: string | Blob, mime = 'application/json') {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const fileSlug = (s: string) => s.trim().replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'twin';

const csvCell = (v: unknown) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
};

/** Flat tag register for the controls / integration team. */
export function tagListCsv(p: Project): string {
  const header = [
    'TagPath', 'Name', 'Plant', 'Department', 'Machine', 'MachineType', 'DataType', 'Unit', 'Access',
    'Category', 'Connection', 'Protocol', 'Endpoint', 'Address', 'Binding', 'Description',
  ];
  const rows = flattenTags(p).map((f) => [
    f.path,
    f.tag.name,
    p.plant.code,
    f.dept?.code ?? '',
    f.machine?.code ?? '',
    f.machine ? (p.library.find((t) => t.id === f.machine!.typeId)?.name ?? '') : '',
    f.tag.dataType,
    f.tag.unit,
    f.tag.access,
    f.tag.category,
    f.connection?.name ?? '',
    f.connection?.protocol ?? '',
    f.connection?.endpoint ?? '',
    f.address,
    f.tag.binding.kind,
    f.tag.description,
  ]);
  return [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n');
}

/**
 * Runtime manifest: the minimum a twin viewer needs — resolved tag addresses
 * per node and binding rules — without editor-only data such as the type library.
 */
export function runtimeManifest(p: Project) {
  const flat = flattenTags(p);
  const byNode = new Map<string, typeof flat>();
  for (const f of flat) byNode.set(f.nodeId, [...(byNode.get(f.nodeId) ?? []), f]);
  const tagOut = (nodeId: string) =>
    (byNode.get(nodeId) ?? []).map((f) => ({
      path: f.path,
      dataType: f.tag.dataType,
      unit: f.tag.unit,
      access: f.tag.access,
      connection: f.connection?.id ?? null,
      address: f.address,
      binding: f.tag.binding,
    }));
  return {
    format: 'dt-runtime-manifest',
    version: 1,
    generatedAt: new Date().toISOString(),
    project: { id: p.id, name: p.name, client: p.client, industry: p.industry },
    connections: p.connections,
    plant: {
      code: p.plant.code,
      name: p.plant.name,
      size: p.plant.size,
      tags: tagOut(p.plant.id),
      departments: p.plant.departments.map((d) => ({
        code: d.code,
        name: d.name,
        position: d.position,
        size: d.size,
        tags: tagOut(d.id),
        machines: d.machines.map((m) => ({
          code: m.code,
          name: m.name,
          type: p.library.find((t) => t.id === m.typeId)?.name ?? null,
          position: [d.position[0] + m.position[0], m.position[1], d.position[1] + m.position[2]],
          rotationY: m.rotationY,
          model: m.model.source === 'gltf' ? { source: 'gltf', assetId: m.model.assetId, size: m.model.size } : m.model,
          tags: tagOut(m.id),
        })),
      })),
    },
  };
}

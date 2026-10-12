import type { Draft } from 'immer';
import { Upload } from 'lucide-react';
import type { Asset, ModelSpec } from '../../types';
import { PRIMITIVES } from '../../types';
import { pickModelAsset } from '../../lib/assets';
import { ColorInput, Field, NumberInput, Select } from '../ui/Field';

/** Edits a ModelSpec: built-in primitive or imported GLB, colour and bounding size. */
export function ModelFields({
  model,
  assets,
  update,
}: {
  model: ModelSpec;
  assets: Asset[];
  update: (recipe: (m: Draft<ModelSpec>) => void, mergeKey?: string) => void;
}) {
  const importModel = async () => {
    const asset = await pickModelAsset();
    if (asset)
      update((m) => {
        m.source = 'gltf';
        m.assetId = asset.id;
      });
  };

  return (
    <>
      <div className="grid2">
        <Field label="Source">
          <Select
            value={model.source}
            onChange={(v) => update((m) => void (m.source = v))}
            options={[
              { value: 'primitive', label: 'Built-in model' },
              { value: 'gltf', label: 'Imported GLB / GLTF' },
            ]}
          />
        </Field>
        {model.source === 'primitive' ? (
          <Field label="Shape">
            <Select value={model.primitive} onChange={(v) => update((m) => void (m.primitive = v))} options={PRIMITIVES.map((p) => ({ value: p.kind, label: p.label }))} />
          </Field>
        ) : (
          <Field label="3D file">
            <div className="row-input">
              <select className="input" value={model.assetId ?? ''} onChange={(e) => update((m) => void (m.assetId = e.target.value || null))}>
                <option value="">— select —</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({(a.bytes / 1048576).toFixed(1)} MB)
                  </option>
                ))}
              </select>
              <button className="icon-btn" onClick={importModel} title="Import .glb / .gltf">
                <Upload size={14} />
              </button>
            </div>
          </Field>
        )}
      </div>
      <Field label="Colour">
        <ColorInput value={model.color} onChange={(v) => update((m) => void (m.color = v), 'model-color')} />
      </Field>
      <div className="grid3">
        <Field label="Width (X)">
          <NumberInput value={model.size[0]} min={0.1} step={0.1} suffix="m" onChange={(v) => update((m) => void (m.size[0] = v), 'size-w')} />
        </Field>
        <Field label="Height (Y)">
          <NumberInput value={model.size[1]} min={0.1} step={0.1} suffix="m" onChange={(v) => update((m) => void (m.size[1] = v), 'size-h')} />
        </Field>
        <Field label="Depth (Z)">
          <NumberInput value={model.size[2]} min={0.1} step={0.1} suffix="m" onChange={(v) => update((m) => void (m.size[2] = v), 'size-d')} />
        </Field>
      </div>
      {model.source === 'gltf' && <p className="muted small">Imported models are scaled uniformly to fit the bounding size. Use self-contained .glb files.</p>}
    </>
  );
}

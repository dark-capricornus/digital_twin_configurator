import { useFrame, useThree } from '@react-three/fiber';
import { memo, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { Department, Machine } from '../../types';
import { evaluateBindings } from '../../lib/bindings';
import { useProject } from '../../store/projectStore';
import { useSim } from '../../store/simStore';
import { useUI } from '../../store/uiStore';

/**
 * 3D labels as one plain DOM overlay. A projector inside the Canvas moves each
 * label element every frame to follow its scene object (including mid-drag),
 * so there's no per-label React root.
 */

interface LabelTarget {
  el: HTMLElement;
  /** Name of the scene object to follow */
  object: string;
  /** Offset from the object's origin, in the object's parent space */
  offset: THREE.Vector3;
}

const targets = new Map<string, LabelTarget>();

function register(key: string, object: string, offset: [number, number, number]) {
  return (el: HTMLElement | null) => {
    if (el) targets.set(key, { el, object, offset: new THREE.Vector3(...offset) });
    else targets.delete(key);
  };
}

const tmp = new THREE.Vector3();

/** Lives inside <Canvas>. */
export function LabelProjector() {
  const scene = useThree((s) => s.scene);
  const project = useProject((s) => s.project);
  const cache = useMemo(() => new Map<string, THREE.Object3D>(), []);

  // Scene objects remount when the project changes; drop stale handles.
  useEffect(() => cache.clear(), [project, cache]);

  useFrame(({ camera, size }) => {
    for (const t of targets.values()) {
      let obj = cache.get(t.object);
      if (!obj || !obj.parent) {
        obj = scene.getObjectByName(t.object);
        if (obj) cache.set(t.object, obj);
      }
      if (!obj) {
        t.el.style.visibility = 'hidden';
        continue;
      }
      obj.getWorldPosition(tmp);
      tmp.add(t.offset).project(camera);
      if (tmp.z > 1 || Math.abs(tmp.x) > 1.2 || Math.abs(tmp.y) > 1.2) {
        t.el.style.visibility = 'hidden';
        continue;
      }
      const x = ((tmp.x + 1) / 2) * size.width;
      const y = ((1 - tmp.y) / 2) * size.height;
      t.el.style.visibility = 'visible';
      t.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      t.el.style.zIndex = String(Math.round((1 - tmp.z) * 100000));
    }
  });
  return null;
}

const MachineLabel = memo(function MachineLabel({ machine, selected }: { machine: Machine; selected: boolean }) {
  const running = useSim((s) => s.running);
  const values = useSim((s) => s.values);
  const vis = useMemo(() => (running ? evaluateBindings(machine.tags, values) : null), [running, values, machine.tags]);
  return (
    <div className="label-anchor" ref={register(machine.id, machine.id, [0, machine.model.size[1] + 0.9, 0])}>
      <div className={`label3d machine ${selected ? 'selected' : ''} ${vis?.alarm ? 'alarm' : ''}`}>
        <div className="label3d-title">
          {vis?.statusColor && <span className="dot" style={{ background: vis.statusColor }} />}
          {machine.name}
        </div>
        {selected && <div className="label3d-code">{machine.code}</div>}
        {vis?.labels.map((l) => (
          <div key={l.name} className="label3d-value">
            <span>{l.name}</span>
            <b>{l.text}</b>
          </div>
        ))}
      </div>
    </div>
  );
});

function ZoneLabel({ dept, selected }: { dept: Department; selected: boolean }) {
  return (
    <div className="label-anchor" ref={register(`zone:${dept.id}`, dept.id, [-dept.size[0] / 2, 0.05, -dept.size[1] / 2])}>
      <div className={`label3d zone ${selected ? 'selected' : ''}`} style={{ borderColor: dept.color }}>
        {dept.name}
        <span className="label3d-code">{dept.code}</span>
      </div>
    </div>
  );
}

/** Lives outside <Canvas>, layered over it. */
export function LabelLayer() {
  const departments = useProject((s) => s.project!.plant.departments);
  const selection = useProject((s) => s.selection);
  const showLabels = useUI((s) => s.showLabels);

  return (
    <div className="label-layer">
      {departments.map((d) => (
        <div key={d.id}>
          {(showLabels || selection?.id === d.id) && <ZoneLabel dept={d} selected={selection?.id === d.id} />}
          {d.machines.map(
            (m) => (showLabels || selection?.id === m.id) && <MachineLabel key={m.id} machine={m} selected={selection?.id === m.id} />,
          )}
        </div>
      ))}
    </div>
  );
}

import { Edges } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { memo, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Asset, Machine } from '../../types';
import { evaluateBindings, IDLE_VISUAL } from '../../lib/bindings';
import { useProject } from '../../store/projectStore';
import { useSim } from '../../store/simStore';
import { GltfModel } from './models/GltfModel';
import { PrimitiveModel } from './models/Primitives';
import { isClick } from './pointer';

const DEG = Math.PI / 180;

function StackLight({ height, x, z, color }: { height: number; x: number; z: number; color: string | null }) {
  return (
    <group position={[x, height, z]}>
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.4, 8]} />
        <meshStandardMaterial color="#475569" />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.09, 0.09, 0.22, 16]} />
        <meshStandardMaterial
          color={color ?? '#475569'}
          emissive={color ?? '#000000'}
          emissiveIntensity={color ? 1.4 : 0}
          transparent
          opacity={0.92}
        />
      </mesh>
    </group>
  );
}

function AlarmShell({ size: [w, h, d] }: { size: [number, number, number] }) {
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(({ clock }) => {
    if (mat.current) mat.current.opacity = 0.15 + 0.2 * (0.5 + 0.5 * Math.sin(clock.elapsedTime * 8));
  });
  return (
    <mesh position={[0, h / 2, 0]} raycast={() => null}>
      <boxGeometry args={[w + 0.3, h + 0.3, d + 0.3]} />
      <meshBasicMaterial ref={mat} color="#ef4444" transparent opacity={0.25} depthWrite={false} />
    </mesh>
  );
}

interface Props {
  machine: Machine;
  selected: boolean;
  assets: Asset[];
}

export const MachineNode = memo(function MachineNode({ machine, selected, assets }: Props) {
  const select = useProject((s) => s.select);
  const running = useSim((s) => s.running);
  const values = useSim((s) => s.values);

  const vis = useMemo(
    () => (running ? evaluateBindings(machine.tags, values) : IDLE_VISUAL),
    [running, values, machine.tags],
  );

  const { model } = machine;
  const [w, h, d] = model.size;
  const asset = model.source === 'gltf' ? assets.find((a) => a.id === model.assetId) : undefined;

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (!isClick(e)) return;
    select({ kind: 'machine', id: machine.id });
  };

  return (
    <group
      name={machine.id}
      position={machine.position}
      rotation={[0, machine.rotationY * DEG, 0]}
      onClick={onClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => (document.body.style.cursor = '')}
    >
      {model.source === 'gltf' ? (
        <GltfModel url={asset?.dataUrl} size={model.size} />
      ) : (
        <PrimitiveModel kind={model.primitive} size={model.size} color={model.color} spin={vis.spin} fill={vis.fill} />
      )}

      <StackLight height={h} x={w / 2 - 0.15} z={-d / 2 + 0.15} color={vis.statusColor} />

      {vis.alarm && <AlarmShell size={model.size} />}

      {selected && (
        <mesh position={[0, h / 2, 0]} raycast={() => null}>
          <boxGeometry args={[w + 0.25, h + 0.25, d + 0.25]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          <Edges color="#3b82f6" lineWidth={2} />
        </mesh>
      )}

    </group>
  );
});

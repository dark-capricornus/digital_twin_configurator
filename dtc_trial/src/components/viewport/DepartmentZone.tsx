import { Line } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import { memo, useMemo } from 'react';
import type { Asset, Department, ID } from '../../types';
import { useProject } from '../../store/projectStore';
import { MachineNode } from './MachineNode';
import { isClick } from './pointer';

interface Props {
  dept: Department;
  selected: boolean;
  selectedMachineId: ID | null;
  assets: Asset[];
}

export const DepartmentZone = memo(function DepartmentZone({ dept, selected, selectedMachineId, assets }: Props) {
  const select = useProject((s) => s.select);
  const [w, d] = dept.size;

  const outline = useMemo(
    () =>
      [
        [-w / 2, 0.03, -d / 2],
        [w / 2, 0.03, -d / 2],
        [w / 2, 0.03, d / 2],
        [-w / 2, 0.03, d / 2],
        [-w / 2, 0.03, -d / 2],
      ] as [number, number, number][],
    [w, d],
  );

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (!isClick(e)) return;
    select({ kind: 'department', id: dept.id });
  };

  return (
    <group name={dept.id} position={[dept.position[0], 0, dept.position[1]]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} onClick={onClick} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color={dept.color} transparent opacity={selected ? 0.26 : 0.12} depthWrite={false} />
      </mesh>
      <Line points={outline} color={dept.color} lineWidth={selected ? 3 : 1.5} dashed={!selected} dashSize={0.8} gapSize={0.4} />


      {dept.machines.map((m) => (
        <MachineNode key={m.id} machine={m} selected={m.id === selectedMachineId} assets={assets} />
      ))}
    </group>
  );
});

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { PrimitiveKind, Vec3 } from '../../../types';

/**
 * Procedural machine models. Each fits inside its `size` box with the base at y = 0,
 * centred on x/z, so they are interchangeable with scaled GLTF models.
 * `spin` (0..1) and `fill` (0..1|null) come from tag bindings.
 */
export interface PrimitiveProps {
  size: Vec3;
  color: string;
  spin: number;
  fill: number | null;
}

const DARK = '#1f2937';
const STEEL = '#cbd5e1';
const FRAME = '#334155';

function Box({ args, position, color, ...mat }: { args: Vec3; position: Vec3; color: string } & MatProps) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={args} />
      <meshStandardMaterial color={color} {...mat} />
    </mesh>
  );
}

interface MatProps {
  metalness?: number;
  roughness?: number;
  transparent?: boolean;
  opacity?: number;
  emissive?: string;
  emissiveIntensity?: number;
}

function Cyl({
  r,
  h,
  position,
  color,
  rotation,
  segments = 24,
  ...mat
}: { r: number; h: number; position: Vec3; color: string; rotation?: Vec3; segments?: number } & MatProps) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <cylinderGeometry args={[r, r, h, segments]} />
      <meshStandardMaterial color={color} {...mat} />
    </mesh>
  );
}

/** Keeps the latest spin value in a ref so useFrame sees it without re-subscribing. */
function useLatest<T>(v: T) {
  const r = useRef(v);
  r.current = v;
  return r;
}

const shade = (hex: string, amt: number) => {
  const c = new THREE.Color(hex);
  c.offsetHSL(0, 0, amt);
  return `#${c.getHexString()}`;
};

/* ------------------------------------------------------------------ models */

function GenericBox({ size: [w, h, d], color }: PrimitiveProps) {
  return (
    <>
      <Box args={[w, h, d]} position={[0, h / 2, 0]} color={color} />
      <Box args={[w * 1.02, h * 0.06, d * 1.02]} position={[0, h * 0.03, 0]} color={DARK} />
    </>
  );
}

function Cnc({ size: [w, h, d], color, spin }: PrimitiveProps) {
  const spindle = useRef<THREE.Group>(null);
  const s = useLatest(spin);
  useFrame((_, dt) => {
    if (spindle.current) spindle.current.rotation.y += dt * s.current * 30;
  });
  const bodyD = d * 0.85;
  const r = Math.min(w, d) * 0.06;
  return (
    <>
      <Box args={[w, h * 0.12, d]} position={[0, h * 0.06, 0]} color={FRAME} />
      <Box args={[w * 0.92, h * 0.7, bodyD]} position={[0, h * 0.47, 0]} color={color} roughness={0.5} />
      <Box
        args={[w * 0.45, h * 0.34, 0.03]}
        position={[-w * 0.1, h * 0.5, bodyD / 2 + 0.01]}
        color="#93c5fd"
        transparent
        opacity={0.45}
        metalness={0.2}
        roughness={0.1}
      />
      <group ref={spindle} position={[-w * 0.1, h * 0.55, bodyD / 2 - 0.25]}>
        <Cyl r={r} h={h * 0.2} position={[0, 0, 0]} color={STEEL} metalness={0.8} roughness={0.25} />
        <Box args={[r * 2.6, h * 0.04, r * 0.6]} position={[0, -h * 0.08, 0]} color="#f8fafc" />
      </group>
      <Box args={[w * 0.35, h * 0.18, d * 0.45]} position={[-w * 0.1, h * 0.91, 0]} color={shade(color, -0.12)} />
      <Box args={[w * 0.14, h * 0.36, 0.14]} position={[w * 0.36, h * 0.55, bodyD / 2 + 0.07]} color={DARK} />
      <Box
        args={[w * 0.1, h * 0.12, 0.01]}
        position={[w * 0.36, h * 0.63, bodyD / 2 + 0.145]}
        color="#0ea5e9"
        emissive="#0ea5e9"
        emissiveIntensity={0.6}
      />
    </>
  );
}

function Robot({ size: [w, h, d], color, spin }: PrimitiveProps) {
  const turret = useRef<THREE.Group>(null);
  const shoulder = useRef<THREE.Group>(null);
  const elbow = useRef<THREE.Group>(null);
  const s = useLatest(spin);
  const phase = useRef(0);
  useFrame((_, dt) => {
    phase.current += dt * s.current * 2.5;
    const t = phase.current;
    if (turret.current) turret.current.rotation.y = Math.sin(t) * 1.3;
    if (shoulder.current) shoulder.current.rotation.z = -0.35 + Math.sin(t * 1.3) * 0.2;
    if (elbow.current) elbow.current.rotation.z = 1.25 + Math.sin(t * 1.7 + 1) * 0.3;
  });
  const r = Math.min(w, d) * 0.32;
  return (
    <>
      <Cyl r={r} h={h * 0.1} position={[0, h * 0.05, 0]} color={FRAME} />
      <group ref={turret} position={[0, h * 0.1, 0]}>
        <Cyl r={r * 0.8} h={h * 0.12} position={[0, h * 0.06, 0]} color={color} />
        <group ref={shoulder} position={[0, h * 0.16, 0]}>
          <Box args={[r * 0.5, h * 0.42, r * 0.5]} position={[0, h * 0.21, 0]} color={color} />
          <Cyl r={r * 0.32} h={r * 0.75} position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]} color={DARK} />
          <group ref={elbow} position={[0, h * 0.42, 0]}>
            <Cyl r={r * 0.28} h={r * 0.65} position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]} color={DARK} />
            <Box args={[r * 0.38, h * 0.36, r * 0.38]} position={[0, h * 0.18, 0]} color={color} />
            <Cyl r={r * 0.16} h={h * 0.06} position={[0, h * 0.39, 0]} color={STEEL} metalness={0.7} />
            <Box args={[r * 0.5, h * 0.04, r * 0.15]} position={[0, h * 0.43, 0]} color={DARK} />
          </group>
        </group>
      </group>
    </>
  );
}

function Conveyor({ size: [w, h, d], color, spin }: PrimitiveProps) {
  const items = useRef<THREE.Group>(null);
  const s = useLatest(spin);
  const count = Math.max(2, Math.floor(w / 1.6));
  const legsX = useMemo(() => {
    const n = Math.max(2, Math.ceil(w / 1.8) + 1);
    return Array.from({ length: n }, (_, i) => -w / 2 + 0.15 + (i * (w - 0.3)) / (n - 1));
  }, [w]);
  const offset = useRef(0);
  useFrame((_, dt) => {
    offset.current = (offset.current + dt * s.current * 1.5) % w;
    items.current?.children.forEach((c, i) => {
      c.position.x = (((i * w) / count + offset.current) % w) - w / 2;
    });
  });
  const itemSize = Math.min(0.5, d * 0.45);
  return (
    <>
      {legsX.map((x) =>
        [-1, 1].map((sz) => (
          <Box key={`${x}${sz}`} args={[0.08, h - 0.1, 0.08]} position={[x, (h - 0.1) / 2, sz * (d / 2 - 0.08)]} color={FRAME} />
        )),
      )}
      <Box args={[w, 0.14, 0.06]} position={[0, h - 0.07, d / 2 - 0.03]} color={color} />
      <Box args={[w, 0.14, 0.06]} position={[0, h - 0.07, -d / 2 + 0.03]} color={color} />
      <Box args={[w - 0.05, 0.05, d - 0.12]} position={[0, h - 0.05, 0]} color={DARK} roughness={0.9} />
      <group ref={items} position={[0, h + itemSize / 2 - 0.02, 0]}>
        {Array.from({ length: count }, (_, i) => (
          <Box key={i} args={[itemSize, itemSize, itemSize]} position={[0, 0, 0]} color="#d6a76c" roughness={0.9} />
        ))}
      </group>
    </>
  );
}

/** Shared vertical vessel used by tank and mixer. */
function Vessel({
  size: [w, h, d],
  color,
  fill,
  bodyFrom,
  bodyTo,
}: PrimitiveProps & { bodyFrom: number; bodyTo: number }) {
  const r = (Math.min(w, d) / 2) * 0.9;
  const y0 = h * bodyFrom;
  const bodyH = h * (bodyTo - bodyFrom);
  const domeH = Math.min(r * 0.5, h * 0.12);
  const gaugeH = bodyH * 0.8;
  const gy0 = y0 + bodyH * 0.1;
  return (
    <>
      {[
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
      ].map(([sx, sz]) => (
        <Box key={`${sx}${sz}`} args={[0.1, y0, 0.1]} position={[sx * r * 0.65, y0 / 2, sz * r * 0.65]} color={FRAME} />
      ))}
      <Cyl r={r} h={bodyH} position={[0, y0 + bodyH / 2, 0]} color={color} metalness={0.6} roughness={0.35} segments={32} />
      <mesh position={[0, y0 + bodyH, 0]} scale={[1, domeH / r, 1]} castShadow>
        <sphereGeometry args={[r, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[0, y0, 0]} scale={[1, domeH / r, 1]} rotation={[Math.PI, 0, 0]}>
        <sphereGeometry args={[r, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.35} />
      </mesh>
      {/* Sight-glass level gauge */}
      <Box args={[0.16, gaugeH, 0.05]} position={[0, gy0 + gaugeH / 2, r + 0.02]} color={DARK} />
      {fill !== null && fill > 0.01 && (
        <Box
          args={[0.1, gaugeH * fill, 0.06]}
          position={[0, gy0 + (gaugeH * fill) / 2, r + 0.03]}
          color="#22d3ee"
          emissive="#22d3ee"
          emissiveIntensity={0.7}
        />
      )}
    </>
  );
}

function Tank(props: PrimitiveProps) {
  return <Vessel {...props} bodyFrom={0.14} bodyTo={0.86} />;
}

function Mixer(props: PrimitiveProps) {
  const [w, h, d] = props.size;
  const coupling = useRef<THREE.Group>(null);
  const s = useLatest(props.spin);
  useFrame((_, dt) => {
    if (coupling.current) coupling.current.rotation.y += dt * s.current * 12;
  });
  const r = (Math.min(w, d) / 2) * 0.9;
  return (
    <>
      <Vessel {...props} bodyFrom={0.12} bodyTo={0.72} />
      <Box args={[r * 0.7, h * 0.04, r * 0.7]} position={[0, h * 0.8, 0]} color={FRAME} />
      <group ref={coupling} position={[0, h * 0.84, 0]}>
        <Cyl r={r * 0.22} h={h * 0.04} position={[0, 0, 0]} color={STEEL} metalness={0.8} />
        <Box args={[r * 0.5, h * 0.02, 0.06]} position={[0, h * 0.025, 0]} color="#f59e0b" />
      </group>
      <Cyl r={r * 0.3} h={h * 0.14} position={[0, h * 0.93, 0]} color="#475569" />
    </>
  );
}

function Press({ size: [w, h, d], color, spin }: PrimitiveProps) {
  const ram = useRef<THREE.Group>(null);
  const s = useLatest(spin);
  const phase = useRef(0);
  useFrame((_, dt) => {
    phase.current += dt * s.current * 5;
    if (ram.current) ram.current.position.y = h * 0.52 + Math.cos(phase.current) * h * 0.14;
  });
  const cr = Math.min(w, d) * 0.06;
  return (
    <>
      <Box args={[w, h * 0.14, d]} position={[0, h * 0.07, 0]} color={FRAME} />
      <Box args={[w * 0.75, h * 0.08, d * 0.75]} position={[0, h * 0.18, 0]} color={shade(color, -0.15)} />
      {[
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
      ].map(([sx, sz]) => (
        <Cyl key={`${sx}${sz}`} r={cr} h={h * 0.72} position={[sx * w * 0.36, h * 0.5, sz * d * 0.36]} color={STEEL} metalness={0.8} roughness={0.2} />
      ))}
      <group ref={ram} position={[0, h * 0.52, 0]}>
        <Box args={[w * 0.62, h * 0.1, d * 0.62]} position={[0, 0, 0]} color={color} />
      </group>
      <Box args={[w, h * 0.16, d]} position={[0, h * 0.92, 0]} color={color} />
    </>
  );
}

function Oven({ size: [w, h, d], color, spin }: PrimitiveProps) {
  const fan = useRef<THREE.Group>(null);
  const s = useLatest(spin);
  useFrame((_, dt) => {
    if (fan.current) fan.current.rotation.y += dt * s.current * 10;
  });
  const glow = spin > 0.05 ? 0.9 : 0.05;
  return (
    <>
      <Box args={[w, h * 0.1, d * 1.02]} position={[0, h * 0.05, 0]} color={FRAME} />
      <Box args={[w, h * 0.68, d]} position={[0, h * 0.44, 0]} color={color} roughness={0.6} />
      {[-1, 1].map((sx) => (
        <Box
          key={sx}
          args={[0.04, h * 0.3, d * 0.6]}
          position={[sx * (w / 2 + 0.01), h * 0.3, 0]}
          color="#f97316"
          emissive="#f97316"
          emissiveIntensity={glow}
        />
      ))}
      {[-0.3, 0.3].map((fx) => (
        <Cyl key={fx} r={0.16} h={h * 0.22} position={[fx * w, h * 0.89, 0]} color="#57534e" />
      ))}
      <group ref={fan} position={[0, h * 0.8, 0]}>
        <Cyl r={Math.min(d, w) * 0.2} h={0.08} position={[0, 0, 0]} color={STEEL} metalness={0.7} />
        <Box args={[Math.min(d, w) * 0.38, 0.03, 0.08]} position={[0, 0.06, 0]} color={DARK} />
      </group>
    </>
  );
}

function Packer({ size: [w, h, d], color, spin }: PrimitiveProps) {
  const wheel = useRef<THREE.Group>(null);
  const s = useLatest(spin);
  useFrame((_, dt) => {
    if (wheel.current) wheel.current.rotation.y += dt * s.current * 6;
  });
  const bw = w * 0.58;
  return (
    <>
      <Box args={[bw, h * 0.72, d]} position={[0, h * 0.36, 0]} color={color} />
      <Box args={[bw, h * 0.24, d * 0.92]} position={[0, h * 0.84, 0]} color="#bae6fd" transparent opacity={0.35} roughness={0.1} />
      <group ref={wheel} position={[0, h * 0.78, 0]}>
        <Cyl r={Math.min(bw, d) * 0.3} h={0.08} position={[0, 0, 0]} color={STEEL} metalness={0.7} segments={8} />
        <Box args={[Math.min(bw, d) * 0.55, 0.1, 0.1]} position={[0, 0.05, 0]} color="#f59e0b" />
      </group>
      {[-1, 1].map((sx) => (
        <group key={sx} position={[sx * (bw / 2 + (w - bw) / 4), 0, 0]}>
          <Box args={[(w - bw) / 2, 0.06, d * 0.45]} position={[0, h * 0.42, 0]} color={DARK} />
          <Box args={[0.06, h * 0.42, 0.06]} position={[0, h * 0.21, 0]} color={FRAME} />
        </group>
      ))}
    </>
  );
}

function Agv({ size: [w, h, d], color, spin }: PrimitiveProps) {
  const lidar = useRef<THREE.Group>(null);
  const s = useLatest(spin);
  useFrame((_, dt) => {
    if (lidar.current) lidar.current.rotation.y += dt * (2 + s.current * 10);
  });
  const wr = h * 0.22;
  return (
    <>
      <Box args={[w, h * 0.55, d]} position={[0, wr + h * 0.27, 0]} color={color} />
      <Box args={[w * 0.92, h * 0.05, d * 0.92]} position={[0, wr + h * 0.57, 0]} color={DARK} />
      {[
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
      ].map(([sx, sz]) => (
        <Cyl key={`${sx}${sz}`} r={wr} h={0.1} position={[sx * w * 0.34, wr, sz * (d / 2)]} rotation={[Math.PI / 2, 0, 0]} color={DARK} />
      ))}
      <group ref={lidar} position={[w / 2 - 0.15, wr + h * 0.62, 0]}>
        <Cyl r={0.07} h={0.08} position={[0, 0, 0]} color="#0f172a" />
        <Box args={[0.04, 0.03, 0.12]} position={[0, 0.05, 0.04]} color="#ef4444" emissive="#ef4444" emissiveIntensity={0.8} />
      </group>
    </>
  );
}

const MODELS: Record<PrimitiveKind, (p: PrimitiveProps) => React.JSX.Element> = {
  box: GenericBox,
  cnc: Cnc,
  robot: Robot,
  conveyor: Conveyor,
  tank: Tank,
  mixer: Mixer,
  press: Press,
  oven: Oven,
  packer: Packer,
  agv: Agv,
};

export function PrimitiveModel({ kind, ...props }: PrimitiveProps & { kind: PrimitiveKind }) {
  const Model = MODELS[kind] ?? GenericBox;
  return <Model {...props} />;
}

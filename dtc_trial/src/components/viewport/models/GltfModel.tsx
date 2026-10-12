import { useGLTF } from '@react-three/drei';
import { Component, type ReactNode, Suspense, useMemo } from 'react';
import * as THREE from 'three';
import type { Vec3 } from '../../../types';

/** Loads a GLB/GLTF and uniformly scales it to fit the machine's bounding size, base on the floor. */
function FittedGltf({ url, size }: { url: string; size: Vec3 }) {
  const gltf = useGLTF(url);
  const object = useMemo(() => {
    const scene = gltf.scene.clone(true);
    const box = new THREE.Box3().setFromObject(scene);
    const dims = box.getSize(new THREE.Vector3());
    const ratios = [size[0] / dims.x, size[1] / dims.y, size[2] / dims.z].filter((r) => Number.isFinite(r) && r > 0);
    const scale = ratios.length ? Math.min(...ratios) : 1;
    const center = box.getCenter(new THREE.Vector3());
    scene.scale.setScalar(scale);
    scene.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
    scene.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    const wrapper = new THREE.Group();
    wrapper.add(scene);
    return wrapper;
  }, [gltf, size[0], size[1], size[2]]);
  return <primitive object={object} />;
}

function Placeholder({ size: [w, h, d], color }: { size: Vec3; color: string }) {
  return (
    <mesh position={[0, h / 2, 0]}>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial color={color} wireframe />
    </mesh>
  );
}

class ModelErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function GltfModel({ url, size }: { url: string | undefined; size: Vec3 }) {
  if (!url) return <Placeholder size={size} color="#ef4444" />;
  return (
    <ModelErrorBoundary key={url} fallback={<Placeholder size={size} color="#ef4444" />}>
      <Suspense fallback={<Placeholder size={size} color="#64748b" />}>
        <FittedGltf url={url} size={size} />
      </Suspense>
    </ModelErrorBoundary>
  );
}

import { GizmoHelper, GizmoViewport, Line, OrbitControls, TransformControls } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { Crosshair, Maximize, Move, RotateCw, Square } from 'lucide-react';
import { useEffect, useLayoutEffect, useMemo, useState, type DragEvent } from 'react';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { actions, useProject } from '../../store/projectStore';
import { toast, useUI } from '../../store/uiStore';
import { deptAt } from '../../lib/tree';
import { DepartmentZone } from './DepartmentZone';
import { LabelLayer, LabelProjector } from './Labels';
import { gizmo, isBackgroundClick, press } from './pointer';

export const DRAG_MIME = 'application/x-dtc-machine-type';

/** Shared handle so DOM drop events can raycast with the live camera. */
const bridge: { camera?: THREE.Camera; dom?: HTMLElement } = {};

function Bridge() {
  const { camera, gl, scene } = useThree();
  useEffect(() => {
    bridge.camera = camera;
    bridge.dom = gl.domElement;
    if (import.meta.env.DEV) Object.assign(window, { __three: { camera, gl, scene } });
  }, [camera, gl, scene]);
  return null;
}

function Floor() {
  const plant = useProject((s) => s.project!.plant);
  const [w, d] = plant.size;
  const gridSize = Math.ceil(Math.max(w, d) / 10) * 10 + 20;
  const border = useMemo(
    () =>
      [
        [-w / 2, 0.01, -d / 2],
        [w / 2, 0.01, -d / 2],
        [w / 2, 0.01, d / 2],
        [-w / 2, 0.01, d / 2],
        [-w / 2, 0.01, -d / 2],
      ] as [number, number, number][],
    [w, d],
  );
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color="#262626" roughness={0.95} />
      </mesh>
      <gridHelper args={[gridSize, gridSize, '#3a3a3a', '#2c2c2c']} position={[0, 0.005, 0]} />
      <Line points={border} color="#71717a" lineWidth={2} />
    </group>
  );
}

function SelectionGizmo() {
  const selection = useProject((s) => s.selection);
  const project = useProject((s) => s.project);
  const mode = useUI((s) => s.gizmoMode);
  const snap = useUI((s) => s.snap);
  const scene = useThree((s) => s.scene);
  const [target, setTarget] = useState<THREE.Object3D | null>(null);

  // Layout effect: re-target before the next frame so the gizmo never holds a removed object.
  useLayoutEffect(() => {
    setTarget(selection && selection.kind !== 'plant' ? (scene.getObjectByName(selection.id) ?? null) : null);
  }, [selection, project, scene]);

  if (!target || !selection || selection.kind === 'plant') return null;
  const isDept = selection.kind === 'department';
  const effective = isDept ? 'translate' : mode;

  const commit = () => {
    gizmo.lastReleaseAt = performance.now();
    if (isDept) {
      actions.moveDepartment(selection.id, target.position.x, target.position.z);
      return;
    }
    const world = target.getWorldPosition(new THREE.Vector3());
    const moved = actions.placeMachineWorld(selection.id, world.x, world.z, THREE.MathUtils.radToDeg(target.rotation.y));
    if (moved) toast(`Moved to ${moved.name}`, 'info');
  };

  return (
    <TransformControls
      object={target}
      mode={effective}
      size={0.8}
      showX={effective === 'translate'}
      showZ={effective === 'translate'}
      showY={effective === 'rotate'}
      translationSnap={snap ? 0.5 : null}
      rotationSnap={snap ? THREE.MathUtils.degToRad(15) : null}
      onMouseUp={commit}
    />
  );
}

function CameraRig() {
  const req = useUI((s) => s.viewRequest);
  const controls = useThree((s) => s.controls) as unknown as OrbitControlsImpl | null;
  const camera = useThree((s) => s.camera);
  const scene = useThree((s) => s.scene);

  useEffect(() => {
    const { project, selection } = useProject.getState();
    if (!req || !controls || !project) return;
    const [w, d] = project.plant.size;
    // Distance at which a sphere around the floor fits the narrower of the two FOVs.
    const persp = camera as THREE.PerspectiveCamera;
    const vfov = THREE.MathUtils.degToRad(persp.fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * persp.aspect);
    const fitDistance = (radius: number) => radius / Math.sin(Math.min(vfov, hfov) / 2);
    if (req.kind === 'fit') {
      const dir = new THREE.Vector3(0.45, 0.6, 0.75).normalize();
      camera.position.copy(dir.multiplyScalar(fitDistance(Math.hypot(w, d) / 2) * 0.85));
      controls.target.set(0, 0, 0);
    } else if (req.kind === 'top') {
      const half = Math.max(d / 2 / Math.tan(vfov / 2), w / 2 / Math.tan(hfov / 2));
      camera.position.set(0, half * 1.08, 0.01);
      controls.target.set(0, 0, 0);
    } else if (req.kind === 'focus') {
      const obj = selection && selection.kind !== 'plant' ? scene.getObjectByName(selection.id) : null;
      if (!obj) return;
      const box = new THREE.Box3().setFromObject(obj);
      const center = box.getCenter(new THREE.Vector3());
      const radius = Math.max(4, box.getSize(new THREE.Vector3()).length());
      const dir = camera.position.clone().sub(controls.target).normalize();
      controls.target.copy(center);
      camera.position.copy(center.clone().add(dir.multiplyScalar(radius * 1.4)));
    }
    controls.update();
  }, [req, controls]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

function Scene() {
  const project = useProject((s) => s.project)!;
  const selection = useProject((s) => s.selection);
  const span = Math.max(...project.plant.size);

  return (
    <>
      <color attach="background" args={['#1f1f1f']} />
      <fog attach="fog" args={['#1f1f1f', span * 1.5, span * 4]} />
      <hemisphereLight args={['#f4f4f5', '#27272a', 0.95]} />
      <directionalLight
        position={[span * 0.4, span * 0.8, span * 0.3]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-span * 0.7}
        shadow-camera-right={span * 0.7}
        shadow-camera-top={span * 0.7}
        shadow-camera-bottom={-span * 0.7}
        shadow-camera-far={span * 3}
        shadow-bias={-0.0005}
      />
      <Floor />
      {project.plant.departments.map((dept) => (
        <DepartmentZone
          key={dept.id}
          dept={dept}
          assets={project.assets}
          selected={selection?.kind === 'department' && selection.id === dept.id}
          selectedMachineId={selection?.kind === 'machine' ? selection.id : null}
        />
      ))}
      <SelectionGizmo />
      <LabelProjector />
      <OrbitControls makeDefault maxPolarAngle={Math.PI / 2.05} minDistance={2} maxDistance={span * 3} />
      <CameraRig />
      <Bridge />
      <GizmoHelper alignment="bottom-right" margin={[64, 64]}>
        <GizmoViewport axisColors={['#ef4444', '#22c55e', '#3b82f6']} labelColor="#ffffff" />
      </GizmoHelper>
    </>
  );
}

function ViewportToolbar() {
  const { gizmoMode, set, requestView } = useUI();
  const hasSelection = useProject((s) => s.selection?.kind !== 'plant');
  return (
    <div className="vp-toolbar">
      <button className={gizmoMode === 'translate' ? 'active' : ''} onClick={() => set({ gizmoMode: 'translate' })} title="Move (W)">
        <Move size={16} />
      </button>
      <button className={gizmoMode === 'rotate' ? 'active' : ''} onClick={() => set({ gizmoMode: 'rotate' })} title="Rotate machine (E)">
        <RotateCw size={16} />
      </button>
      <span className="sep" />
      <button onClick={() => requestView('fit')} title="Fit plant">
        <Maximize size={16} />
      </button>
      <button onClick={() => requestView('top')} title="Top view">
        <Square size={16} />
      </button>
      <button onClick={() => requestView('focus')} disabled={!hasSelection} title="Focus selection (F)">
        <Crosshair size={16} />
      </button>
    </div>
  );
}

export function Viewport() {
  const select = useProject((s) => s.select);
  const plantSpan = useProject((s) => Math.max(...s.project!.plant.size));
  const [dragOver, setDragOver] = useState(false);

  // Frame the whole plant when a twin is opened.
  useEffect(() => useUI.getState().requestView('fit'), []);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const typeId = e.dataTransfer.getData(DRAG_MIME);
    const project = useProject.getState().project;
    if (!typeId || !project || !bridge.camera || !bridge.dom) return;
    const rect = bridge.dom.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, bridge.camera);
    const hit = ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), new THREE.Vector3());
    if (!hit) return;
    const dept = deptAt(project, hit.x, hit.z);
    if (!dept) {
      toast('Drop machines inside a department zone', 'error');
      return;
    }
    const snapV = (v: number) => (useUI.getState().snap ? Math.round(v * 2) / 2 : v);
    actions.addMachine(dept.id, typeId, [snapV(hit.x - dept.position[0]), snapV(hit.z - dept.position[1])]);
  };

  return (
    <div
      className={`viewport ${dragOver ? 'drag-over' : ''}`}
      onPointerDownCapture={(e) => {
        press.x = e.clientX;
        press.y = e.clientY;
        press.handled = false;
      }}
      onClick={(e) => {
        // Runs after R3F's own listeners: nothing in 3D took the click → select the plant.
        if (!(e.target instanceof HTMLCanvasElement) || !isBackgroundClick(e.clientX, e.clientY)) return;
        const p = useProject.getState().project;
        if (p) select({ kind: 'plant', id: p.plant.id });
      }}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes(DRAG_MIME)) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
          setDragOver(true);
        }
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [plantSpan * 0.45, plantSpan * 0.6, plantSpan * 0.75], fov: 40, near: 0.1, far: 3000 }}
      >
        <Scene />
      </Canvas>
      <LabelLayer />
      <ViewportToolbar />
      <div className="vp-hint">Drag machines from the Library onto a zone · Click to select · W/E move/rotate · Del delete</div>
    </div>
  );
}

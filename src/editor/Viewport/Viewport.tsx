/* eslint-disable react-hooks/immutability, react-hooks/refs */
import React, { Suspense } from 'react';
import { useThree, Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, TransformControls, useGLTF, Html, GizmoHelper, GizmoViewport } from '@react-three/drei';
import { useSceneStore, type SceneNode } from '../../store/scene';
import { useEditorStore } from '../../store/editor';
import * as THREE from 'three';
import { persistenceService } from '../../core/persistence/IndexedDBProvider';
import { commandManager } from '../../core/commands/CommandManager';
import { UpdateTransformCommand, AddNodeCommand } from '../../core/commands/SceneCommands';
import { SelectionService } from '../../core/services/SelectionService';
import { PointerInteractionLayer } from './PointerInteractionLayer';

const GLTFModelRenderer: React.FC<{ url: string }> = ({ url }) => {
  const { scene } = useGLTF(url);
  
  const clonedScene = React.useMemo(() => {
    const clone = scene.clone();
    // Compute bounding box to center the model and rest it on the floor
    const box = new THREE.Box3().setFromObject(clone);
    const center = box.getCenter(new THREE.Vector3());
    
    // Shift model so its bottom rests exactly at Y=0 and it is centered on X/Z
    clone.position.x -= center.x;
    clone.position.y -= box.min.y;
    clone.position.z -= center.z;
    
    return clone;
  }, [scene]);

  return <primitive object={clonedScene} />;
};

const MockPlantScene: React.FC = () => {
  return (
    <group>
      {/* Ground floor for the plant */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[6, 6]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.4} metalness={0.8} />
      </mesh>
      
      {/* Boundary yellow lines */}
      <mesh position={[0, 0.02, 2.9]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[6, 0.05]} />
        <meshBasicMaterial color="#eab308" />
      </mesh>
      <mesh position={[0, 0.02, -2.9]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[6, 0.05]} />
        <meshBasicMaterial color="#eab308" />
      </mesh>
      <mesh position={[2.9, 0.02, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
        <planeGeometry args={[6, 0.05]} />
        <meshBasicMaterial color="#eab308" />
      </mesh>
      <mesh position={[-2.9, 0.02, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
        <planeGeometry args={[6, 0.05]} />
        <meshBasicMaterial color="#eab308" />
      </mesh>

      {/* Main processing machine block */}
      <group position={[-1, 0.4, -0.5]}>
        <mesh>
          <boxGeometry args={[1.8, 0.8, 1.2]} />
          <meshStandardMaterial color="#0f766e" roughness={0.2} metalness={0.9} />
        </mesh>
        {/* Neon panel light */}
        <mesh position={[0, 0.41, 0.2]}>
          <boxGeometry args={[0.8, 0.01, 0.4]} />
          <meshBasicMaterial color="#22d3ee" />
        </mesh>
        {/* Industrial pipes */}
        <mesh position={[-0.6, 0.5, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.08, 0.08, 0.6]} />
          <meshStandardMaterial color="#64748b" metalness={0.95} roughness={0.1} />
        </mesh>
        <mesh position={[0.6, 0.5, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.08, 0.08, 0.6]} />
          <meshStandardMaterial color="#64748b" metalness={0.95} roughness={0.1} />
        </mesh>
      </group>

      {/* Storage Tank */}
      <group position={[1.2, 0.8, -1.2]}>
        <mesh>
          <cylinderGeometry args={[0.5, 0.5, 1.6, 16]} />
          <meshStandardMaterial color="#3f3f46" metalness={0.8} roughness={0.3} />
        </mesh>
        {/* Tank top lid */}
        <mesh position={[0, 0.81, 0]}>
          <cylinderGeometry args={[0.55, 0.55, 0.06, 16]} />
          <meshStandardMaterial color="#d4d4d8" metalness={0.9} />
        </mesh>
        {/* Indicator pipe */}
        <mesh position={[0.52, 0, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 1.2]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
      </group>

      {/* Conveyor Belt */}
      <group position={[0.8, 0.2, 1.0]} rotation={[0, -Math.PI / 4, 0]}>
        <mesh>
          <boxGeometry args={[2.5, 0.2, 0.6]} />
          <meshStandardMaterial color="#09090b" roughness={0.9} />
        </mesh>
        {/* Product boxes */}
        <mesh position={[-0.7, 0.2, 0]}>
          <boxGeometry args={[0.3, 0.25, 0.3]} />
          <meshStandardMaterial color="#b45309" roughness={0.8} />
        </mesh>
        <mesh position={[0.3, 0.2, 0]} rotation={[0, Math.PI / 6, 0]}>
          <boxGeometry args={[0.3, 0.2, 0.3]} />
          <meshStandardMaterial color="#d97706" roughness={0.8} />
        </mesh>
      </group>
    </group>
  );
};

const MockAssemblyLineScene: React.FC = () => {
  return (
    <group>
      {/* Base platform */}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[1.5, 1.6, 0.1, 32]} />
        <meshStandardMaterial color="#27272a" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Robot stand */}
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.15, 0.2, 1.0, 16]} />
        <meshStandardMaterial color="#4b5563" metalness={0.95} roughness={0.1} />
      </mesh>
      {/* Base joint */}
      <mesh position={[0, 1.15, 0]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color="#dc2626" roughness={0.4} />
      </mesh>
      {/* Arm lower */}
      <group position={[0.3, 1.4, 0]} rotation={[0, 0, -Math.PI / 6]}>
        <mesh>
          <boxGeometry args={[0.8, 0.12, 0.12]} />
          <meshStandardMaterial color="#f87171" roughness={0.3} metalness={0.7} />
        </mesh>
      </group>
      {/* Elbow joint */}
      <mesh position={[0.65, 1.6, 0]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial color="#dc2626" roughness={0.4} />
      </mesh>
      {/* Arm upper */}
      <group position={[1.0, 1.45, 0]} rotation={[0, 0, Math.PI / 4]}>
        <mesh>
          <boxGeometry args={[0.7, 0.09, 0.09]} />
          <meshStandardMaterial color="#f87171" roughness={0.3} metalness={0.7} />
        </mesh>
      </group>
      {/* Mechanical gripper */}
      <mesh position={[1.3, 1.15, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.06, 0.1, 0.25, 8]} />
        <meshStandardMaterial color="#18181b" metalness={0.9} />
      </mesh>
    </group>
  );
};

const GLTFModel: React.FC<{ assetId: string }> = ({ assetId }) => {
  const [url, setUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (assetId === 'mock-plant' || assetId === 'mock-assembly-line') return;
    
    let objectUrl: string;
    persistenceService.getAsset(assetId).then((asset) => {
      if (asset && asset.file) {
        objectUrl = URL.createObjectURL(asset.file);
        setUrl(objectUrl);
      }
    });
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [assetId]);

  if (assetId === 'mock-plant') {
    return <MockPlantScene />;
  }

  if (assetId === 'mock-assembly-line') {
    return <MockAssemblyLineScene />;
  }

  if (!url) return null;

  return (
    <Suspense fallback={null}>
      <GLTFModelRenderer url={url} />
    </Suspense>
  );
};

const NodeRenderer: React.FC<{ nodeId: string }> = ({ nodeId }) => {
  const node = useSceneStore((state) => state.nodes[nodeId]);
  const selectedNodeId = useEditorStore((state) => state.selectedNodeId);
  const activeGizmoMode = useEditorStore((state) => state.activeGizmoMode);
  const isSelected = selectedNodeId === nodeId;
  const initialTransformRef = React.useRef<any>(null);
  const [targetObject, setTargetObject] = React.useState<THREE.Object3D | null>(null);
  const targetRef = React.useRef<THREE.Object3D | null>(null);
  const [tcInstance, setTcInstance] = React.useState<any>(null);
  const { controls } = useThree();
  const isDraggingRef = React.useRef(false);

  // Compute gizmo state early so hooks can reference it
  const validModes = ['translate', 'rotate', 'scale'];
  const isTransform = activeGizmoMode === 'transform';
  const showGizmo = isSelected && node != null && (validModes.includes(activeGizmoMode) || isTransform);
  const currentMode = isTransform ? 'translate' : activeGizmoMode;

  // Sync store → Three.js object when transform changes (NOT every frame)
  // This only fires when Zustand produces a new node.transform reference
  React.useEffect(() => {
    const obj = targetRef.current;
    if (!obj || isDraggingRef.current || !node) return;
    const t = node.transform;
    obj.position.set(t.position[0], t.position[1], t.position[2]);
    obj.rotation.set(t.rotation[0], t.rotation[1], t.rotation[2]);
    obj.scale.set(t.scale[0], t.scale[1], t.scale[2]);
  }, [node?.transform]);

  // Attach drag listener directly to TransformControls instance
  // This is more reliable than the onDraggingChanged prop across drei versions
  React.useEffect(() => {
    if (!tcInstance) return;

    const onDraggingChanged = (event: { value: boolean }) => {
      const dragging = event.value;
      if (controls) (controls as any).enabled = !dragging;
      isDraggingRef.current = dragging;

      if (dragging) {
        const currentNode = useSceneStore.getState().nodes[nodeId];
        if (currentNode) {
          initialTransformRef.current = {
            position: [...currentNode.transform.position],
            rotation: [...currentNode.transform.rotation],
            scale: [...currentNode.transform.scale],
          };
        }
      } else {
        if (initialTransformRef.current) {
          const obj = targetRef.current;
          if (obj) {
            commandManager.executeCommand(new UpdateTransformCommand(
              nodeId,
              {
                position: [obj.position.x, obj.position.y, obj.position.z],
                rotation: [obj.rotation.x, obj.rotation.y, obj.rotation.z],
                scale: [obj.scale.x, obj.scale.y, obj.scale.z],
              },
              initialTransformRef.current
            ));
          }
          initialTransformRef.current = null;
        }
      }
    };

    tcInstance.addEventListener('dragging-changed', onDraggingChanged);
    return () => tcInstance.removeEventListener('dragging-changed', onDraggingChanged);
  }, [tcInstance, controls, nodeId]);

  // Ref callback for the scene object: sets initial transform + saves refs
  const handleRef = React.useCallback((obj: THREE.Object3D | null) => {
    targetRef.current = obj;
    setTargetObject(obj);
    if (obj) {
      const currentNode = useSceneStore.getState().nodes[nodeId];
      if (currentNode) {
        const t = currentNode.transform;
        obj.position.set(t.position[0], t.position[1], t.position[2]);
        obj.rotation.set(t.rotation[0], t.rotation[1], t.rotation[2]);
        obj.scale.set(t.scale[0], t.scale[1], t.scale[2]);
      }
    }
  }, [nodeId]);

  // Callback ref for TransformControls — triggers state update so useEffect can attach listener
  const handleTcRef = React.useCallback((tc: any) => {
    setTcInstance(tc);
  }, []);

  if (!node) return null;

  const isSelectionMode = ['select', 'translate', 'rotate', 'scale', 'transform'].includes(activeGizmoMode);

  let renderedContent = null;

  if (node.type === 'Mesh') {
    const geometry = <boxGeometry args={[1, 1, 1]} />;
    const material = <meshStandardMaterial color={(node.components.color as string) || '#ccc'} />;
    renderedContent = (
      <>
        {geometry}
        {material}
      </>
    );
  } else if (node.type === 'Model') {
    const assetId = node.components.assetId as string;
    renderedContent = assetId ? <GLTFModel assetId={assetId} /> : null;
  }

  const InnerContent = (
    <>
      {renderedContent}
      {isSelected && node.type === 'Mesh' && (
        <boxHelper args={[new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1)), 0xffa500]} />
      )}
      {node.children && node.children.map((childId) => (
        <NodeRenderer key={childId} nodeId={childId} />
      ))}
    </>
  );

  const MeshComponent = node.type === 'Model' ? (
    <group
      ref={handleRef}
      onClick={(e) => {
        if (!isSelectionMode) return;
        e.stopPropagation();
        SelectionService.selectNode(nodeId);
      }}
    >
      {InnerContent}
    </group>
  ) : (
    <mesh
      ref={handleRef}
      onClick={(e) => {
        if (!isSelectionMode) return;
        e.stopPropagation();
        SelectionService.selectNode(nodeId);
      }}
    >
      {InnerContent}
    </mesh>
  );

  return (
    <>
      {MeshComponent}
      {showGizmo && (
        <TransformControls
          ref={handleTcRef}
          object={targetObject || undefined}
          mode={currentMode as 'translate' | 'rotate' | 'scale'}
        />
      )}
    </>
  );
};

const DragDropHandler: React.FC = () => {
  const { gl, camera } = useThree();
  const rootNodeId = useSceneStore((state) => state.rootNodeId);

  React.useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      const assetId = e.dataTransfer?.getData('application/asset-id');
      const assetName = e.dataTransfer?.getData('application/asset-name');
      
      if (!assetId) return;

      const rect = gl.domElement.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(x, y), camera);

      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const target = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, target);

      const pos = target ? [target.x, target.y, target.z] : [0, 0, 0];

      const newNode: SceneNode = {
        id: Math.random().toString(36).substr(2, 9),
        name: assetName || 'Object',
        type: 'Model',
        parentId: rootNodeId,
        transform: { position: pos as [number, number, number], rotation: [0, 0, 0], scale: [1, 1, 1] },
        components: { assetId },
        children: [],
      };

      commandManager.executeCommand(new AddNodeCommand(newNode, rootNodeId));
      SelectionService.selectNode(newNode.id);

      // Place the cursor on the added object
      useEditorStore.getState().setCursorPosition(newNode.transform.position);
    };

    gl.domElement.addEventListener('dragover', handleDragOver);
    gl.domElement.addEventListener('drop', handleDrop);

    return () => {
      gl.domElement.removeEventListener('dragover', handleDragOver);
      gl.domElement.removeEventListener('drop', handleDrop);
    };
  }, [gl, camera, rootNodeId]);

  return null;
};

// 3D Viewport Helper Components for Advanced Tools
const CursorHelper: React.FC = () => {
  const cursorPosition = useEditorStore((state) => state.cursorPosition);
  return (
    <group position={cursorPosition}>
      {/* White outer ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.13, 0.16, 32]} />
        <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} />
      </mesh>
      {/* Red inner ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.07, 0.09, 32]} />
        <meshBasicMaterial color="#ef4444" side={THREE.DoubleSide} />
      </mesh>
      {/* Red crosshair box segment X */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.35, 0.005, 0.005]} />
        <meshBasicMaterial color="#ef4444" />
      </mesh>
      {/* Red crosshair box segment Z */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.005, 0.005, 0.35]} />
        <meshBasicMaterial color="#ef4444" />
      </mesh>
    </group>
  );
};

const AnnotationsHelper: React.FC = () => {
  const annotations = useEditorStore((state) => state.annotations);
  
  return (
    <group>
      {annotations.map((ann) => {
        const curvePoints = ann.points.map(p => new THREE.Vector3(...p));
        if (curvePoints.length < 2) return null;
        
        const curve = new THREE.CatmullRomCurve3(curvePoints);
        
        return (
          <mesh key={ann.id}>
            <tubeGeometry args={[curve, 64, 0.012, 8, false]} />
            <meshBasicMaterial color="#ef4444" />
          </mesh>
        );
      })}
    </group>
  );
};

const MeasurementHelper: React.FC = () => {
  const start = useEditorStore((state) => state.measurementStart);
  const end = useEditorStore((state) => state.measurementEnd);

  if (!start || !end) return null;

  const startVec = new THREE.Vector3(...start);
  const endVec = new THREE.Vector3(...end);
  const distance = startVec.distanceTo(endVec);

  const midPoint = new THREE.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5);
  
  // Dotted segments calculation
  const points = [];
  const segments = 15;
  for (let i = 0; i <= segments; i++) {
    points.push(new THREE.Vector3().lerpVectors(startVec, endVec, i / segments));
  }

  return (
    <group>
      {/* Node anchors */}
      <mesh position={startVec}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshBasicMaterial color="#3b82f6" />
      </mesh>
      <mesh position={endVec}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshBasicMaterial color="#3b82f6" />
      </mesh>

      {/* Dotted lines points */}
      {points.map((pt, idx) => (
        <mesh key={idx} position={pt}>
          <sphereGeometry args={[0.012, 8, 8]} />
          <meshBasicMaterial color="#3b82f6" />
        </mesh>
      ))}

      {/* Float distance bubble */}
      {distance > 0.02 && (
        <Html position={[midPoint.x, midPoint.y + 0.15, midPoint.z]} center>
          <div className="bg-[#111111] border border-blue-500/50 text-blue-400 font-mono text-[9px] px-2 py-0.5 rounded-full shadow-lg pointer-events-none select-none whitespace-nowrap">
            {distance.toFixed(2)} m
          </div>
        </Html>
      )}
    </group>
  );
};

export const Viewport: React.FC = () => {
  const rootNodeId = useSceneStore((state) => state.rootNodeId);
  const isGridVisible = useEditorStore((state) => state.isGridVisible);
  const activeGizmoMode = useEditorStore((state) => state.activeGizmoMode);

  return (
    <div className="w-full h-full bg-zinc-900">
      <Canvas
        camera={{ position: [5, 5, 5], fov: 50 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
        onPointerMissed={() => SelectionService.selectNode(null)}
      >
        <color attach="background" args={['#18181b']} />
        
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        
        {isGridVisible && (
          <Grid 
            infiniteGrid 
            fadeDistance={1000} 
            sectionSize={10} 
            sectionColor="#555" 
            sectionThickness={1.5}
            cellSize={1} 
            cellColor="#333" 
            cellThickness={1}
          />
        )}

        <NodeRenderer nodeId={rootNodeId} />
        <DragDropHandler />
        <PointerInteractionLayer />

        {/* Dynamic viewport interactive layers */}
        <CursorHelper />
        <AnnotationsHelper />
        <MeasurementHelper />

        {/* Viewport orientation navigation gizmo widget */}
        <GizmoHelper
          alignment="top-right"
          margin={[80, 80]}
        >
          <GizmoViewport axisColors={['#ef4444', '#22c55e', '#3b82f6']} labelColor="white" />
        </GizmoHelper>

        <OrbitControls makeDefault enabled={activeGizmoMode !== 'annotate' && activeGizmoMode !== 'measure'} />
      </Canvas>
    </div>
  );
};

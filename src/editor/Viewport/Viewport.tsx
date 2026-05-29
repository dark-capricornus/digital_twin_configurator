/* eslint-disable react-hooks/immutability, react-hooks/refs */
import React, { Suspense } from 'react';
import { useThree, Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, TransformControls, useGLTF, Html, GizmoHelper, GizmoViewport } from '@react-three/drei';
import { useSceneStore } from '../../store/scene';
import { useEditorStore } from '../../store/editor';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { persistenceService } from '../../core/persistence/IndexedDBProvider';
import { commandManager } from '../../core/commands/CommandManager';
import { UpdateTransformCommand } from '../../core/commands/SceneCommands';
import { PlaceModelCommand } from '../../core/commands/PlacementCommands';
import { PlacementSystem } from '../../runtime/systems/PlacementSystem';
import { groundPlaneManager } from '../../runtime/systems/GroundPlane';
import { SelectionService } from '../../core/services/SelectionService';
import { PointerInteractionLayer } from './PointerInteractionLayer';

const GLTFModelRenderer: React.FC<{ url: string }> = ({ url }) => {
  const { scene } = useGLTF(url);
  
  const clonedScene = React.useMemo(() => {
    // Clone the scene without repositioning.
    // Grounding is handled at placement time by PlacementSystem.
    // The node's transform.position in the scene store already contains
    // the grounded position, applied by the parent group in NodeRenderer.
    return scene.clone();
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

// ==========================================
// SCENE CACHE — Caches loaded GLB scenes to
// avoid redundant loading during drag preview
// and placement.
// ==========================================
const glbSceneCache = new Map<string, THREE.Group>();

/**
 * Loads a GLB scene imperatively (not via React hooks).
 * Used for bounding-box analysis before placement.
 * Results are cached for reuse.
 */
async function loadGLBSceneForAnalysis(assetId: string): Promise<THREE.Group | null> {
  // Check cache first
  if (glbSceneCache.has(assetId)) {
    return glbSceneCache.get(assetId)!.clone();
  }

  // Mock assets don't have blobs — skip analysis
  if (assetId.startsWith('mock-')) {
    return null;
  }

  try {
    const asset = await persistenceService.getAsset(assetId);
    if (!asset?.file) return null;

    const url = URL.createObjectURL(asset.file);
    const loader = new GLTFLoader();

    return new Promise<THREE.Group | null>((resolve) => {
      loader.load(
        url,
        (gltf) => {
          URL.revokeObjectURL(url);
          glbSceneCache.set(assetId, gltf.scene);
          resolve(gltf.scene.clone());
        },
        undefined,
        () => {
          URL.revokeObjectURL(url);
          resolve(null);
        },
      );
    });
  } catch {
    return null;
  }
}

const DragDropHandler: React.FC = () => {
  const { gl, camera } = useThree();
  const rootNodeId = useSceneStore((state) => state.rootNodeId);

  React.useEffect(() => {
    let currentDragAssetId: string | null = null;

    const getNDC = (e: DragEvent): THREE.Vector2 => {
      const rect = gl.domElement.getBoundingClientRect();
      return new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
    };

    const raycastToGround = (ndc: THREE.Vector2): THREE.Vector3 => {
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(ndc, camera);
      const hit = groundPlaneManager.raycast(raycaster.ray);
      return hit || new THREE.Vector3(0, 0, 0);
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }

      // Update placement preview position in real-time
      const assetId = currentDragAssetId;
      if (assetId) {
        const ndc = getNDC(e);
        const groundPoint = raycastToGround(ndc);
        useEditorStore.getState().setPlacementPreview(
          assetId,
          [groundPoint.x, groundPoint.y, groundPoint.z],
        );
      }
    };

    const handleDragEnter = (e: DragEvent) => {
      // Capture asset ID from transfer data on enter
      // Note: Some browsers restrict getData during dragover, so we
      // track it via a module-level variable set on dragstart
      const assetId = e.dataTransfer?.getData('application/asset-id');
      if (assetId) {
        currentDragAssetId = assetId;
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      // Only clear if leaving the canvas entirely
      const rect = gl.domElement.getBoundingClientRect();
      const x = e.clientX;
      const y = e.clientY;
      if (x <= rect.left || x >= rect.right || y <= rect.top || y >= rect.bottom) {
        useEditorStore.getState().clearPlacementPreview();
        currentDragAssetId = null;
      }
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      const assetId = e.dataTransfer?.getData('application/asset-id');
      const assetName = e.dataTransfer?.getData('application/asset-name');

      // Clear preview
      useEditorStore.getState().clearPlacementPreview();
      currentDragAssetId = null;

      if (!assetId) return;

      const ndc = getNDC(e);
      const dropPoint = raycastToGround(ndc);

      // Load GLB scene for bounding-box analysis
      const gltfScene = await loadGLBSceneForAnalysis(assetId);

      let groundedPosition: [number, number, number];
      let boundingInfo = null;

      if (gltfScene) {
        // Full bounding-box grounding for real GLBs
        boundingInfo = PlacementSystem.computeBoundingInfo(gltfScene);
        groundedPosition = PlacementSystem.computeGroundedPosition(gltfScene, dropPoint);
      } else {
        // Mock models: use drop point directly (they handle their own grounding)
        groundedPosition = [dropPoint.x, dropPoint.y, dropPoint.z];
      }

      // Commit through PlaceModelCommand (undo/redo safe)
      const cmd = new PlaceModelCommand(
        assetId,
        assetName || 'Object',
        groundedPosition,
        rootNodeId,
        boundingInfo,
      );
      commandManager.executeCommand(cmd);
      SelectionService.selectNode(cmd.getNodeId());

      // Place the cursor on the added object
      useEditorStore.getState().setCursorPosition(groundedPosition);
    };

    gl.domElement.addEventListener('dragover', handleDragOver);
    gl.domElement.addEventListener('dragenter', handleDragEnter);
    gl.domElement.addEventListener('dragleave', handleDragLeave);
    gl.domElement.addEventListener('drop', handleDrop);

    return () => {
      gl.domElement.removeEventListener('dragover', handleDragOver);
      gl.domElement.removeEventListener('dragenter', handleDragEnter);
      gl.domElement.removeEventListener('dragleave', handleDragLeave);
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

// ==========================================
// PLACEMENT PREVIEW — Semi-transparent ghost
// model shown during drag-over for
// professional placement feedback.
// ==========================================

const GroundContactIndicator: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  const ringRef = React.useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 0.5;
    }
  });

  return (
    <group position={[position[0], 0.005, position[2]]}>
      {/* Outer glow ring */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.25, 0.30, 32]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
      {/* Inner dot */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.06, 16]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.8} side={THREE.DoubleSide} />
      </mesh>
      {/* Shadow disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.004, 0]}>
        <circleGeometry args={[0.5, 32]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.15} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

const PlacementPreview: React.FC = () => {
  const previewAssetId = useEditorStore((state) => state.placementPreviewAssetId);
  const previewPosition = useEditorStore((state) => state.placementPreviewPosition);
  const [previewScene, setPreviewScene] = React.useState<THREE.Group | null>(null);
  const groupRef = React.useRef<THREE.Group>(null);

  // Load the preview model when drag enters
  React.useEffect(() => {
    if (!previewAssetId || previewAssetId.startsWith('mock-')) {
      setPreviewScene(null);
      return;
    }

    let cancelled = false;

    loadGLBSceneForAnalysis(previewAssetId).then((scene) => {
      if (!cancelled && scene) {
        // Make the preview transparent/ghosted
        scene.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            const originalMat = mesh.material as THREE.MeshStandardMaterial;
            const ghostMat = originalMat.clone();
            ghostMat.transparent = true;
            ghostMat.opacity = 0.4;
            ghostMat.depthWrite = false;
            ghostMat.color.lerp(new THREE.Color('#22d3ee'), 0.3);
            mesh.material = ghostMat;
          }
        });
        setPreviewScene(scene);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [previewAssetId]);

  // Update position on every frame for smooth tracking
  React.useEffect(() => {
    if (groupRef.current && previewPosition && previewScene) {
      const groundedY = PlacementSystem.computeGroundedY(previewScene);
      groupRef.current.position.set(previewPosition[0], groundedY, previewPosition[2]);
    }
  }, [previewPosition, previewScene]);

  if (!previewAssetId || !previewScene || !previewPosition) return null;

  return (
    <>
      <group ref={groupRef}>
        <primitive object={previewScene} />
      </group>
      <GroundContactIndicator position={previewPosition} />
    </>
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
        <PlacementPreview />
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

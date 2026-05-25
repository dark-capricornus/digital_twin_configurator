import React, { Suspense } from 'react';
import { useThree, Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, TransformControls, useGLTF } from '@react-three/drei';
import { useSceneStore } from '../../store/scene';
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

const GLTFModel: React.FC<{ assetId: string }> = ({ assetId }) => {
  const [url, setUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
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

  if (!url) return null;

  return (
    <Suspense fallback={null}>
      <GLTFModelRenderer url={url} />
    </Suspense>
  );
};

const NodeRenderer: React.FC<{ nodeId: string }> = ({ nodeId }) => {
  const node = useSceneStore((state) => state.nodes[nodeId]);
  const updateNodeTransform = useSceneStore((state) => state.updateNodeTransform);
  const { selectedNodeId, activeGizmoMode } = useEditorStore();
  const isSelected = selectedNodeId === nodeId;
  const initialTransformRef = React.useRef<any>(null);
  const { controls } = useThree();

  if (!node) return null;

  const position = new THREE.Vector3(...node.transform.position);
  const rotation = new THREE.Euler(...node.transform.rotation);
  const scale = new THREE.Vector3(...node.transform.scale);

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
      position={position}
      rotation={rotation}
      scale={scale}
      onClick={(e) => {
        e.stopPropagation();
        SelectionService.selectNode(nodeId);
      }}
    >
      {InnerContent}
    </group>
  ) : (
    <mesh
      position={position}
      rotation={rotation}
      scale={scale}
      onClick={(e) => {
        e.stopPropagation();
        SelectionService.selectNode(nodeId);
      }}
    >
      {InnerContent}
    </mesh>
  );

  const validModes = ['translate', 'rotate', 'scale'];

  if (isSelected && validModes.includes(activeGizmoMode)) {
    return (
      <TransformControls
        mode={activeGizmoMode as 'translate' | 'rotate' | 'scale'}
        // @ts-ignore
        onDraggingChanged={(e: any) => {
          if (controls) (controls as any).enabled = !e.value;
          if (e.value) {
            // Drag started: store initial transform
            initialTransformRef.current = {
              position: [...node.transform.position],
              rotation: [...node.transform.rotation],
              scale: [...node.transform.scale],
            };
          } else {
            // Drag ended: create command
            if (initialTransformRef.current && e.target?.object) {
              const obj = e.target.object;
              
              // Revert store to initial, then let command apply the new
              updateNodeTransform(nodeId, initialTransformRef.current);
              
              commandManager.executeCommand(new UpdateTransformCommand(nodeId, {
                position: [obj.position.x, obj.position.y, obj.position.z],
                rotation: [obj.rotation.x, obj.rotation.y, obj.rotation.z],
                scale: [obj.scale.x, obj.scale.y, obj.scale.z],
              }));
              
              initialTransformRef.current = null;
            }
          }
        }}
        // We only commit the transform when the drag ends to avoid React state feedback loops
        // which cause gizmo stuttering and scale/rotation failures.
      >
        {MeshComponent}
      </TransformControls>
    );
  }

  return MeshComponent;
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

      const newNode = {
        id: Math.random().toString(36).substr(2, 9),
        name: assetName || 'Object',
        type: 'Model' as const,
        parentId: rootNodeId,
        transform: { position: pos, rotation: [0, 0, 0], scale: [1, 1, 1] },
        components: { assetId },
        children: [],
      };

      // @ts-ignore
      commandManager.executeCommand(new AddNodeCommand(newNode, rootNodeId));
      SelectionService.selectNode(newNode.id);
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

export const Viewport: React.FC = () => {
  const rootNodeId = useSceneStore((state) => state.rootNodeId);
  const isGridVisible = useEditorStore((state) => state.isGridVisible);

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

        <OrbitControls makeDefault />
      </Canvas>
    </div>
  );
};

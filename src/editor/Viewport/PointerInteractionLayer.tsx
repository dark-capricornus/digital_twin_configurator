import React, { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { ToolManager } from '../../core/tools/ToolManager';

export const PointerInteractionLayer: React.FC = () => {
  const { gl, camera, scene } = useThree();

  useEffect(() => {
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const getEventData = (event: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);
      
      const firstHit = intersects.length > 0 ? intersects[0] : undefined;

      // Fallback intersection with ground grid plane at Y=0
      const point = new THREE.Vector3();
      if (firstHit) {
        point.copy(firstHit.point);
      } else {
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        raycaster.ray.intersectPlane(plane, point);
      }

      return {
        raycaster,
        point,
        normal: firstHit ? firstHit.face?.normal : new THREE.Vector3(0, 1, 0),
        object: firstHit ? firstHit.object : undefined,
        originalEvent: event,
      };
    };

    const handlePointerDown = (e: PointerEvent) => {
      ToolManager.handlePointerDown(getEventData(e));
    };

    const handlePointerMove = (e: PointerEvent) => {
      ToolManager.handlePointerMove(getEventData(e));
    };

    const handlePointerUp = (e: PointerEvent) => {
      ToolManager.handlePointerUp(getEventData(e));
    };

    const element = gl.domElement;
    element.addEventListener('pointerdown', handlePointerDown);
    element.addEventListener('pointermove', handlePointerMove);
    element.addEventListener('pointerup', handlePointerUp);

    return () => {
      element.removeEventListener('pointerdown', handlePointerDown);
      element.removeEventListener('pointermove', handlePointerMove);
      element.removeEventListener('pointerup', handlePointerUp);
    };
  }, [gl, camera, scene]);

  return null;
};

import { create } from 'zustand';

// Types
export interface Transform {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}

export interface SceneNode {
  id: string;
  name: string;
  type: 'Mesh' | 'Group' | 'Light' | 'Camera' | 'Model';
  parentId?: string;
  children: string[];
  transform: Transform;
  components: Record<string, unknown>; // Renderable components (material, geometry)
}

export interface SceneState {
  nodes: Record<string, SceneNode>;
  rootNodeId: string;
  
  // Actions
  addNode: (node: SceneNode | Omit<SceneNode, 'id'>, parentId?: string) => string;
  removeNode: (id: string) => void;
  updateNodeTransform: (id: string, transform: Partial<Transform>) => void;
  updateNodeComponents: (id: string, components: Record<string, unknown>) => void;
  updateNodeName: (id: string, name: string) => void;
  reparentNode: (id: string, newParentId: string) => void;
  clearScene: () => void;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

const initialRootId = 'root';

export const useSceneStore = create<SceneState>((set) => ({
  nodes: {
    [initialRootId]: {
      id: initialRootId,
      name: 'Scene Root',
      type: 'Group',
      children: [],
      transform: {
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      },
      components: {},
    },
  },
  rootNodeId: initialRootId,

  addNode: (nodeData, parentId = initialRootId) => {
    const id = (nodeData as SceneNode).id || generateId();
    const newNode: SceneNode = { ...nodeData, id, parentId, children: [] };
    
    set((state) => {
      const parent = state.nodes[parentId];
      if (!parent) return state;

      return {
        nodes: {
          ...state.nodes,
          [id]: newNode,
          [parentId]: {
            ...parent,
            children: [...parent.children, id],
          },
        },
      };
    });
    return id;
  },

  removeNode: (id) => {
    if (id === initialRootId) return; // Cannot remove root
    
    set((state) => {
      const nodeToRemove = state.nodes[id];
      if (!nodeToRemove) return state;

      const parentId = nodeToRemove.parentId;
      const newNodes = { ...state.nodes };
      
      // Remove from parent's children array
      if (parentId && newNodes[parentId]) {
        newNodes[parentId] = {
          ...newNodes[parentId],
          children: newNodes[parentId].children.filter(childId => childId !== id),
        };
      }

      // Recursively delete children (simplified for this MVP)
      const deleteRecursive = (nodeId: string) => {
        const node = newNodes[nodeId];
        if (node) {
          node.children.forEach(deleteRecursive);
          delete newNodes[nodeId];
        }
      };
      
      deleteRecursive(id);

      return { nodes: newNodes };
    });
  },

  updateNodeTransform: (id, partialTransform) => {
    set((state) => {
      const node = state.nodes[id];
      if (!node) return state;

      return {
        nodes: {
          ...state.nodes,
          [id]: {
            ...node,
            transform: {
              ...node.transform,
              ...partialTransform,
            },
          },
        },
      };
    });
  },

  updateNodeComponents: (id, components) => {
    set((state) => {
      const node = state.nodes[id];
      if (!node) return state;

      return {
        nodes: {
          ...state.nodes,
          [id]: {
            ...node,
            components: {
              ...node.components,
              ...components,
            },
          },
        },
      };
    });
  },

  updateNodeName: (id, name) => {
    set((state) => {
      const node = state.nodes[id];
      if (!node) return state;

      return {
        nodes: {
          ...state.nodes,
          [id]: {
            ...node,
            name,
          },
        },
      };
    });
  },

  reparentNode: (id, newParentId) => {
    if (id === initialRootId) return; // Cannot reparent root
    if (id === newParentId) return; // Cannot reparent to self

    set((state) => {
      const node = state.nodes[id];
      const newParent = state.nodes[newParentId];
      if (!node || !newParent) return state;

      // Ensure newParent is not a descendant of id
      let curr = newParentId;
      while (curr) {
        if (curr === id) return state; // Cycle detected
        curr = state.nodes[curr]?.parentId as string;
      }

      const oldParentId = node.parentId;
      const newNodes = { ...state.nodes };

      // Remove from old parent
      if (oldParentId && newNodes[oldParentId]) {
        newNodes[oldParentId] = {
          ...newNodes[oldParentId],
          children: newNodes[oldParentId].children.filter(childId => childId !== id),
        };
      }

      // Add to new parent
      newNodes[newParentId] = {
        ...newParent,
        children: [...newParent.children, id],
      };

      // Update node's parentId
      newNodes[id] = {
        ...node,
        parentId: newParentId,
      };

      return { nodes: newNodes };
    });
  },

  clearScene: () => {
    set({
      nodes: {
        [initialRootId]: {
          id: initialRootId,
          name: 'Scene Root',
          type: 'Group',
          children: [],
          transform: {
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
          },
          components: {},
        },
      },
      rootNodeId: initialRootId,
    });
  }
}));

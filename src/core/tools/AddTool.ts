import type { PointerEventData } from './Tool';
import { Tool } from './Tool';
import { useSceneStore, type SceneNode } from '../../store/scene';
import { useEditorStore } from '../../store/editor';
import { commandManager } from '../commands/CommandManager';
import { AddNodeCommand } from '../commands/SceneCommands';
import { SelectionService } from '../services/SelectionService';

export class AddTool extends Tool {
  public readonly id = 'add';
  public readonly name = 'Add Cube';

  public onPointerDown(event: PointerEventData): void {
    if (event.originalEvent.button !== 0) return; // Only left click

    const { nodes, rootNodeId } = useSceneStore.getState();
    const p = event.point;

    const newNode: SceneNode = {
      id: Math.random().toString(36).substr(2, 9),
      name: `Cube ${Object.keys(nodes).length}`,
      type: 'Mesh',
      parentId: rootNodeId,
      transform: {
        position: [p.x, p.y + 0.5, p.z],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      },
      components: { color: '#' + Math.floor(Math.random() * 16777215).toString(16) },
      children: [],
    };

    commandManager.executeCommand(new AddNodeCommand(newNode, rootNodeId));
    SelectionService.selectNode(newNode.id);
    
    // Place the cursor on the added object
    useEditorStore.getState().setCursorPosition(newNode.transform.position);
    
    // Auto switch to translate so they can adjust it immediately
    useEditorStore.getState().setGizmoMode('translate');
  }
}

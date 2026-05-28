import { useEffect } from 'react';
import { commandManager } from '../commands/CommandManager';
import { RemoveNodeCommand } from '../commands/SceneCommands';
import { useEditorStore } from '../../store/editor';
import { SelectionService } from '../services/SelectionService';

export function useEditorKeyboard(): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;

      const ctrl = e.ctrlKey || e.metaKey;

      // Undo: Ctrl+Z
      if (ctrl && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        commandManager.undo();
        return;
      }

      // Redo: Ctrl+Shift+Z or Ctrl+Y
      if ((ctrl && e.shiftKey && (e.key === 'z' || e.key === 'Z'))) {
        e.preventDefault();
        commandManager.redo();
        return;
      }
      if (ctrl && e.key === 'y') {
        e.preventDefault();
        commandManager.redo();
        return;
      }

      // Tool shortcuts (Blender-like, no modifier)
      if (!ctrl && !e.altKey) {
        const setGizmoMode = useEditorStore.getState().setGizmoMode;
        switch (e.key.toLowerCase()) {
          case 'g': setGizmoMode('translate'); break;
          case 'r': setGizmoMode('rotate'); break;
          case 's': setGizmoMode('scale'); break;
          case 'w': setGizmoMode('select'); break;
          case 'delete':
            {
              const selectedNodeId = useEditorStore.getState().selectedNodeId;
              if (selectedNodeId && selectedNodeId !== 'root') {
                commandManager.executeCommand(new RemoveNodeCommand(selectedNodeId));
                SelectionService.selectNode(null);
              }
            }
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}


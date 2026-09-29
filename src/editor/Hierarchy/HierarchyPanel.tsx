import React from 'react';
import { useSceneStore, type SceneNode } from '../../store/scene';
import { useEditorStore } from '../../store/editor';
import { commandManager } from '../../core/commands/CommandManager';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Box, ChevronRight, ChevronDown } from 'lucide-react';
import { SelectionService } from '../../core/services/SelectionService';
import { ReparentNodeCommand, AddNodeCommand } from '../../core/commands/SceneCommands';
import { InspectorPanel } from '../Inspector/InspectorPanel';
import { EditorSelector, type EditorTabType } from '../EditorSelector';
import { AssetBrowserPanel } from '../AssetBrowser/AssetBrowserPanel';

const HierarchyNode: React.FC<{ nodeId: string; level: number }> = ({ nodeId, level }) => {
  const node = useSceneStore((state) => state.nodes[nodeId]);
  const { selectedNodeId } = useEditorStore();
  const [isExpanded, setIsExpanded] = React.useState(true);

  if (!node) return null;

  const isSelected = selectedNodeId === nodeId;
  const hasChildren = node.children && node.children.length > 0;

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/node-id', nodeId);
    e.stopPropagation();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const draggedNodeId = e.dataTransfer.getData('application/node-id');
    
    if (draggedNodeId && draggedNodeId !== nodeId) {
      const draggedNode = useSceneStore.getState().nodes[draggedNodeId];
      if (draggedNode && draggedNode.parentId) {
        commandManager.executeCommand(new ReparentNodeCommand(draggedNodeId, nodeId, draggedNode.parentId));
      }
    }
  };

  return (
    <div className="flex flex-col">
      <div
        className={`flex items-center py-1 px-2 cursor-pointer text-sm hover:bg-zinc-800 ${
          isSelected ? 'bg-zinc-800 text-blue-400' : 'text-zinc-300'
        }`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={(e) => {
          e.stopPropagation();
          SelectionService.selectNode(nodeId);
        }}
        draggable={nodeId !== 'root'}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div 
          className="w-4 h-4 flex items-center justify-center mr-1"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
        >
          {hasChildren && (
            isExpanded ? <ChevronDown className="w-3 h-3 text-zinc-500" /> : <ChevronRight className="w-3 h-3 text-zinc-500" />
          )}
        </div>
        <span className="truncate">{node.name}</span>
      </div>
      {isExpanded && hasChildren && node.children.map((childId) => (
        <HierarchyNode key={childId} nodeId={childId} level={level + 1} />
      ))}
    </div>
  );
};

export interface HierarchyPanelProps {
  hideHeader?: boolean;
}

export const HierarchyPanel: React.FC<HierarchyPanelProps> = ({ hideHeader = false }) => {
  const rootNodeId = useSceneStore((state) => state.rootNodeId);
  const nodes = useSceneStore((state) => state.nodes);
  const selectedNodeId = useEditorStore((state) => state.selectedNodeId);

  const [activeTab, setActiveTab] = React.useState<EditorTabType>('outliner');

  const handleAddCube = () => {
    const newNode: SceneNode = {
      id: Math.random().toString(36).substr(2, 9),
      name: `Cube ${Object.keys(nodes).length}`,
      type: 'Mesh',
      parentId: selectedNodeId || rootNodeId,
      transform: {
        position: [Math.random() * 2 - 1, Math.random() * 2, Math.random() * 2 - 1],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      },
      components: { color: '#' + Math.floor(Math.random()*16777215).toString(16) },
      children: [],
    };
    commandManager.executeCommand(new AddNodeCommand(newNode, selectedNodeId || rootNodeId));

    // Place the cursor on the added object
    useEditorStore.getState().setCursorPosition(newNode.transform.position);
  };

  // If switched to asset or file browser:
  if (activeTab === 'project' || activeTab === 'system') {
    return (
      <div className="flex flex-col w-full h-full relative">
        <div className="absolute top-2 left-2 z-30 flex items-center gap-2">
          <EditorSelector activeTab={activeTab} onChangeTab={setActiveTab} compact={true} />
        </div>
          <AssetBrowserPanel defaultTab={activeTab} />
      </div>
    );
  }

  if (activeTab === 'properties') {
    return (
      <div className="flex flex-col w-full h-full relative bg-zinc-900">
        <div className="absolute top-2 left-2 z-30 flex items-center gap-2">
          <EditorSelector activeTab={activeTab} onChangeTab={setActiveTab} compact={true} />
        </div>
        <div className="flex-1 w-full h-full pt-10">
          <InspectorPanel hideHeader={hideHeader} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full bg-zinc-950 border-r border-zinc-800 overflow-hidden">
      {!hideHeader && (
        <div className="flex items-center justify-between p-2 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <EditorSelector activeTab={activeTab} onChangeTab={setActiveTab} compact={true} />
            <span className="text-xs font-semibold text-zinc-100">Hierarchy</span>
          </div>
          
          <div className="flex gap-1">
            <Button variant={"ghost" as any} size="icon" className="h-6 w-6 text-zinc-400 hover:text-zinc-100" onClick={handleAddCube} title="Add Cube">
              <Box className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      <ScrollArea className="flex-1">
        <div className="py-2">
          <HierarchyNode nodeId={rootNodeId} level={0} />
        </div>
      </ScrollArea>
    </div>
  );
};

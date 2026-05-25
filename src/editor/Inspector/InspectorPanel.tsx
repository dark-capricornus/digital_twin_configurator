import React from 'react';
import { useSceneStore } from '../../store/scene';
import { useEditorStore } from '../../store/editor';
import { commandManager } from '../../core/commands/CommandManager';
import { RemoveNodeCommand } from '../../core/commands/SceneCommands';
import { SelectionService } from '../../core/services/SelectionService';
import { TransformInspector } from './TransformInspector';
import { MeshInspector } from './MeshInspector';
import { MetadataInspector } from './MetadataInspector';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Trash, Wrench, Camera, Printer, Droplets, Globe, Box, Settings, SlidersHorizontal, Layers } from 'lucide-react';

const BlenderTab = ({ active, icon: Icon, onClick }: { active: boolean; icon: any; onClick: () => void }) => (
  <div 
    className={`w-full flex justify-center py-2 cursor-pointer border-l-2 transition-colors ${active ? 'border-blue-500 bg-zinc-800' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
    onClick={onClick}
  >
    <Icon className="w-4 h-4" />
  </div>
);

export const InspectorPanel: React.FC = () => {
  const selectedNodeId = useEditorStore((state) => state.selectedNodeId);
  const nodes = useSceneStore((state) => state.nodes);
  const updateNodeName = useSceneStore((state) => state.updateNodeName);
  const [activeTab, setActiveTab] = React.useState('object');

  const node = selectedNodeId ? nodes[selectedNodeId] : null;

  if (!node) {
    return (
      <div className="flex flex-col h-full bg-zinc-950 border-l border-zinc-800 items-center justify-center p-4">
        <span className="text-zinc-500 text-sm">No node selected</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full bg-zinc-900 border-l border-zinc-800 overflow-hidden">
      
      {/* Inspector Header */}
      <div className="flex items-center justify-between p-2 border-b border-zinc-800 bg-zinc-950">
        <div className="flex items-center gap-2 flex-1 mr-2">
          <Box className="w-4 h-4 text-zinc-400 shrink-0" />
          <input 
            type="text" 
            className="bg-transparent text-sm text-zinc-200 outline-none w-full focus:bg-zinc-800 px-1 rounded transition-colors"
            value={node.name}
            onChange={(e) => updateNodeName(node.id, e.target.value)}
          />
        </div>
        {node.id !== 'root' && (
          <Button variant={"ghost" as any} size="icon" className="h-6 w-6 text-zinc-400 hover:text-red-400 hover:bg-zinc-800" onClick={() => { commandManager.executeCommand(new RemoveNodeCommand(node.id)); SelectionService.selectNode(null); }}>
            <Trash className="h-3 w-3" />
          </Button>
        )}
      </div>
      
      <div className="flex flex-row flex-1 overflow-hidden">
        {/* Left vertical tabs */}
        <div className="w-10 flex flex-col items-center bg-zinc-950 border-r border-zinc-800 overflow-y-auto overflow-x-hidden scrollbar-hide py-2 shrink-0">
          <BlenderTab active={activeTab === 'render'} icon={Camera} onClick={() => setActiveTab('render')} />
          <BlenderTab active={activeTab === 'output'} icon={Printer} onClick={() => setActiveTab('output')} />
          <BlenderTab active={activeTab === 'view_layer'} icon={Layers} onClick={() => setActiveTab('view_layer')} />
          <BlenderTab active={activeTab === 'scene'} icon={Droplets} onClick={() => setActiveTab('scene')} />
          <BlenderTab active={activeTab === 'world'} icon={Globe} onClick={() => setActiveTab('world')} />
          <div className="w-6 h-px bg-zinc-800 my-1" />
          <BlenderTab active={activeTab === 'object'} icon={Box} onClick={() => setActiveTab('object')} />
          <BlenderTab active={activeTab === 'modifiers'} icon={Wrench} onClick={() => setActiveTab('modifiers')} />
          <BlenderTab active={activeTab === 'data'} icon={SlidersHorizontal} onClick={() => setActiveTab('data')} />
          <BlenderTab active={activeTab === 'material'} icon={Settings} onClick={() => setActiveTab('material')} />
        </div>

        {/* Right content area */}
        <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          <div className="space-y-1">
            <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
              <Box className="w-3 h-3" /> Transform
            </h3>
            <TransformInspector node={node} />
          </div>

          <div className="h-px bg-zinc-800 my-2" />

          {node.type === 'Mesh' && (
            <div className="space-y-1">
              <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <Settings className="w-3 h-3" /> Material
              </h3>
              <MeshInspector node={node} />
            </div>
          )}

          <div className="h-px bg-zinc-800 my-2" />

          <div className="space-y-1">
            <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-3 h-3" /> Metadata
            </h3>
            <MetadataInspector node={node} />
          </div>
        </div>
      </ScrollArea>
      </div>
    </div>
  );
};

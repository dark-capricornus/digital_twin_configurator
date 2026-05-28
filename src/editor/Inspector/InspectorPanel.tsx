import React from 'react';
import { createPortal } from 'react-dom';
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
import { Trash, Wrench, Camera, Printer, Droplets, Globe, Box, Settings, SlidersHorizontal, Layers, ChevronDown } from 'lucide-react';
import { HierarchyPanel } from '../Hierarchy/HierarchyPanel';
import { EditorSelector, type EditorTabType } from '../EditorSelector';
import { AssetBrowserPanel } from '../AssetBrowser/AssetBrowserPanel';

const BLENDER_TABS = [
  { id: 'render', label: 'Render Properties', icon: Camera },
  { id: 'output', label: 'Output Properties', icon: Printer },
  { id: 'view_layer', label: 'View Layer Properties', icon: Layers },
  { id: 'scene', label: 'Scene Properties', icon: Droplets },
  { id: 'world', label: 'World Properties', icon: Globe },
  { id: 'object', label: 'Object Properties', icon: Box },
  { id: 'modifiers', label: 'Modifier Properties', icon: Wrench },
  { id: 'data', label: 'Data Properties', icon: SlidersHorizontal },
  { id: 'material', label: 'Material Properties', icon: Settings },
];

const BlenderTab = ({ active, icon: Icon, onClick }: { active: boolean; icon: any; onClick: () => void }) => (
  <div 
    className={`w-full flex justify-center py-2 cursor-pointer border-l-2 transition-colors ${active ? 'border-blue-500 bg-zinc-800' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
    onClick={onClick}
  >
    <Icon className="w-4 h-4" />
  </div>
);

export interface InspectorPanelProps {
  hideHeader?: boolean;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({ hideHeader = false }) => {
  const selectedNodeId = useEditorStore((state) => state.selectedNodeId);
  const nodes = useSceneStore((state) => state.nodes);
  const updateNodeName = useSceneStore((state) => state.updateNodeName);

  const [activeTab, setActiveTab] = React.useState<EditorTabType>('properties');
  const [blenderTabState, setBlenderTabState] = React.useState('object');
  const node = selectedNodeId ? nodes[selectedNodeId] : null;

  // Responsive Height Tracking
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [panelHeight, setPanelHeight] = React.useState(500);

  // Dropdown / Popover states for short height
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const [dropdownCoords, setDropdownCoords] = React.useState({ top: 0, left: 0, openUpward: false });
  const dropdownButtonRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setPanelHeight(entry.contentRect.height);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const isShortHeight = panelHeight < 380;

  const handleToggleDropdown = () => {
    if (!isDropdownOpen && dropdownButtonRef.current) {
      const rect = dropdownButtonRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const spaceBelow = windowHeight - rect.bottom;
      
      // Popover menu has 9 items, so it's about 246px tall. Open upward if space below is less than 255px.
      const openUpward = spaceBelow < 255;
      
      setDropdownCoords({
        top: openUpward ? rect.top - 246 : rect.bottom + 4,
        left: rect.left - 4, // Align slightly to match aesthetics
        openUpward
      });
    }
    setIsDropdownOpen(!isDropdownOpen);
  };

  const activeTabObj = BLENDER_TABS.find(t => t.id === blenderTabState) || BLENDER_TABS[5];
  const ActiveIcon = activeTabObj.icon;

  const dropdownMenu = isDropdownOpen ? (
    <>
      {/* Backdrop overlay */}
      <div 
        className="fixed inset-0 z-40 bg-transparent" 
        onClick={() => setIsDropdownOpen(false)} 
      />
      {/* Floating Popover menu rendered via Portal directly in document.body */}
      <div 
        style={{
          position: 'fixed',
          top: `${dropdownCoords.top}px`,
          left: `${dropdownCoords.left}px`,
          width: '180px',
        }}
        className="bg-[#1b1b1b] border border-[#333] shadow-2xl rounded p-1 flex flex-col gap-0.5 z-50 text-xs text-zinc-300 animate-in fade-in zoom-in-95 duration-100 select-none font-sans"
      >
        <span className="font-bold text-zinc-500 pb-1 border-b border-zinc-800 text-[9px] uppercase px-2 mb-1 shrink-0">Properties Tabs</span>
        {BLENDER_TABS.map((tab) => {
          const TabIcon = tab.icon;
          const isActive = blenderTabState === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setBlenderTabState(tab.id);
                setIsDropdownOpen(false);
              }}
              className={`flex items-center gap-2 py-1 px-2 rounded transition-all w-full text-left ${
                isActive 
                  ? 'bg-[#2f61a7] text-white font-medium shadow-sm' 
                  : 'hover:bg-[#2e2e2e] text-zinc-300'
              }`}
            >
              <TabIcon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-zinc-400'}`} />
              <span className="text-[11px] whitespace-nowrap">{tab.label.replace(' Properties', '')}</span>
            </button>
          );
        })}
      </div>
    </>
  ) : null;

  if (activeTab === 'outliner') {
    return (
      <div className="flex flex-col w-full h-full relative" ref={containerRef}>
        <div className="absolute top-2.5 left-2 z-30 flex items-center gap-2">
          <EditorSelector activeTab={activeTab} onChangeTab={setActiveTab} compact={true} />
        </div>
        <div className="flex-1 w-full h-full">
          <HierarchyPanel hideHeader={hideHeader} />
        </div>
      </div>
    );
  }

  // If switched to asset or file browser:
  if (activeTab === 'project' || activeTab === 'system') {
    return (
      <div className="flex flex-col w-full h-full relative bg-[#1b1b1b]" ref={containerRef}>
        <div className="absolute top-2 left-2 z-30 flex items-center gap-2">
          <EditorSelector activeTab={activeTab} onChangeTab={setActiveTab} compact={true} />
        </div>
        <div className="flex-1 w-full h-full">
          <AssetBrowserPanel defaultTab={activeTab} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full bg-zinc-900 border-l border-zinc-800 overflow-hidden" ref={containerRef}>
      
      {/* Inspector Header */}
      {!hideHeader && (
        <div className="flex items-center justify-between p-2 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center gap-2 flex-1 mr-2 min-w-0">
            <EditorSelector activeTab={activeTab} onChangeTab={setActiveTab} compact={true} />
            <span className="text-xs font-semibold text-zinc-400 shrink-0 mr-1">Properties:</span>

            {node ? (
              <input 
                type="text" 
                className="bg-transparent text-sm text-zinc-200 outline-none w-full focus:bg-zinc-800 px-1 rounded transition-colors"
                value={node.name}
                onChange={(e) => updateNodeName(node.id, e.target.value)}
              />
            ) : (
              <span className="text-zinc-500 text-sm">No selection</span>
            )}
          </div>
          {node && node.id !== 'root' && (
            <Button variant={"ghost" as any} size="icon" className="h-6 w-6 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 shrink-0" onClick={() => { commandManager.executeCommand(new RemoveNodeCommand(node.id)); SelectionService.selectNode(null); }}>
              <Trash className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}
      
      <div className="flex flex-row flex-1 overflow-hidden">
        {!node ? (
          <div className="flex-grow flex items-center justify-center bg-zinc-950 text-zinc-500 text-xs p-4">
            No node selected
          </div>
        ) : (
          <>
            {/* Left vertical tabs / Collapsed Dropdown */}
            {isShortHeight ? (
              <div className="w-10 flex flex-col items-center bg-zinc-950 border-r border-zinc-800 py-3 shrink-0 relative select-none">
                <button
                  ref={dropdownButtonRef}
                  onClick={handleToggleDropdown}
                  className="w-7 h-7 rounded flex items-center justify-center bg-[#2e2e2e] hover:bg-[#3d3d3d] border border-zinc-700/50 text-white transition-all shadow-inner relative group cursor-pointer outline-none"
                  title="Select Properties Tab"
                >
                  <ActiveIcon className="w-4 h-4 text-blue-400 shrink-0" />
                  <div className="absolute -bottom-1 -right-1 bg-zinc-900 border border-zinc-700 rounded-full p-0.5 shadow-md">
                    <ChevronDown className="w-2 h-2 text-zinc-400" />
                  </div>
                </button>
                {createPortal(dropdownMenu, document.body)}
              </div>
            ) : (
              <div className="w-10 flex flex-col items-center bg-zinc-950 border-r border-zinc-800 overflow-y-auto overflow-x-hidden scrollbar-hide py-2 shrink-0">
                {BLENDER_TABS.slice(0, 5).map((tab) => (
                  <BlenderTab 
                    key={tab.id} 
                    active={blenderTabState === tab.id} 
                    icon={tab.icon} 
                    onClick={() => setBlenderTabState(tab.id)} 
                  />
                ))}
                <div className="w-6 h-px bg-zinc-800 my-1 shrink-0" />
                {BLENDER_TABS.slice(5).map((tab) => (
                  <BlenderTab 
                    key={tab.id} 
                    active={blenderTabState === tab.id} 
                    icon={tab.icon} 
                    onClick={() => setBlenderTabState(tab.id)} 
                  />
                ))}
              </div>
            )}

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
          </>
        )}
      </div>
    </div>
  );
};

import React from 'react';
import { useEditorStore } from '../../store/editor';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Layers, Settings2 } from 'lucide-react';

export const MenuBar: React.FC = () => {
  const panelVisibility = useEditorStore((state) => state.panelVisibility);
  const togglePanel = useEditorStore((state) => state.togglePanel);

  return (
    <div className="h-8 border-b border-zinc-800 bg-zinc-950 flex items-center px-4 shrink-0 text-xs text-zinc-300">
      <div className="flex gap-4">
        <span className="hover:text-white cursor-pointer">File</span>
        <span className="hover:text-white cursor-pointer">Edit</span>
        <span className="hover:text-white cursor-pointer">Render</span>
        <span className="hover:text-white cursor-pointer">Tools</span>
        
        <DropdownMenu>
          <DropdownMenuTrigger className="hover:text-white outline-none cursor-pointer">Window</DropdownMenuTrigger>
          <DropdownMenuContent className="w-48 bg-zinc-950 border-zinc-800 text-zinc-300">
            <DropdownMenuCheckboxItem 
              checked={panelVisibility.assets} 
              onCheckedChange={() => togglePanel('assets')}
              className="focus:bg-blue-600 focus:text-white cursor-pointer"
            >
              Project Assets
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem 
              checked={panelVisibility.hierarchy} 
              onCheckedChange={() => togglePanel('hierarchy')}
              className="focus:bg-blue-600 focus:text-white cursor-pointer"
            >
              Hierarchy
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem 
              checked={panelVisibility.inspector} 
              onCheckedChange={() => togglePanel('inspector')}
              className="focus:bg-blue-600 focus:text-white cursor-pointer"
            >
              Node Editor
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <span className="hover:text-white cursor-pointer">Help</span>
      </div>
      
      <div className="mx-6 w-px h-4 bg-zinc-800" />
      
      <div className="flex gap-4">
        <span className="text-blue-400 cursor-pointer">Default</span>
      </div>

      <div className="flex-1" />
      
      <div className="flex items-center gap-1 mr-4">
        <Button variant={"ghost" as any} size="icon" className={`h-6 w-6 rounded-none ${panelVisibility.hierarchy ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800'}`} onClick={() => togglePanel('hierarchy')} title="Hierarchy">
          <Layers className="h-4 w-4" />
        </Button>
        <Button variant={"ghost" as any} size="icon" className={`h-6 w-6 rounded-none ${panelVisibility.inspector ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800'}`} onClick={() => togglePanel('inspector')} title="Inspector">
          <Settings2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="text-zinc-500 font-medium">Digital Twin Configurator MVP</div>
    </div>
  );
};

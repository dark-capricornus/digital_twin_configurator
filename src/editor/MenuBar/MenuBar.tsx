import React from 'react';
import { useEditorStore } from '../../store/editor';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu';

export const MenuBar: React.FC = () => {
  const panelVisibility = useEditorStore((state) => state.panelVisibility);
  const togglePanel = useEditorStore((state) => state.togglePanel);

  return (
    <div className="h-8 border-b border-zinc-800 bg-zinc-950 flex items-center px-4 shrink-0 text-xs text-zinc-300 justify-between">
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
      
      <div className="flex items-center gap-4">
        <div className="flex gap-4">
          <span className="text-blue-400 cursor-pointer">Default</span>
        </div>
        
        <div className="w-px h-4 bg-zinc-800" />
        
        <div className="text-zinc-500 font-medium">Digital Twin Configurator MVP</div>
      </div>
    </div>
  );
};

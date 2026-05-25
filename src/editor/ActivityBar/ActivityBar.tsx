import React from 'react';
import { useEditorStore } from '../../store/editor';
import { Button } from '@/components/ui/button';
import { FolderTree } from 'lucide-react';

export const ActivityBar: React.FC = () => {
  const panelVisibility = useEditorStore((state) => state.panelVisibility);
  const togglePanel = useEditorStore((state) => state.togglePanel);

  return (
    <div className="w-12 h-full border-r border-zinc-800 bg-[#181818] flex flex-col items-center py-2 gap-2 shrink-0 select-none z-10">
      <Button
        variant={"ghost" as any}
        size="icon"
        className={`h-12 w-12 rounded-none ${panelVisibility.assets ? 'text-white bg-zinc-800/50' : 'text-zinc-400 hover:bg-zinc-800/50'}`}
        onClick={() => togglePanel('assets')}
        title="Project Assets"
      >
        <FolderTree className="h-5 w-5" />
      </Button>
    </div>
  );
};

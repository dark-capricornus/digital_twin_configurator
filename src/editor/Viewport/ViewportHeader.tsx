import React from 'react';
import { Button } from '@/components/ui/button';
import { Undo2, Redo2, Grid3X3, ChevronDown } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { commandManager } from '../../core/commands/CommandManager';
import { useEditorStore } from '../../store/editor';

export const ViewportHeader: React.FC = () => {
  const isGridVisible = useEditorStore((state) => state.isGridVisible);
  const toggleGrid = useEditorStore((state) => state.toggleGrid);
  const editorMode = useEditorStore((state) => state.editorMode);
  const setEditorMode = useEditorStore((state) => state.setEditorMode);

  const [canUndo, setCanUndo] = React.useState(false);
  const [canRedo, setCanRedo] = React.useState(false);

  React.useEffect(() => {
    const updateHistoryState = () => {
      setCanUndo(commandManager.canUndo());
      setCanRedo(commandManager.canRedo());
    };
    updateHistoryState();
    const interval = setInterval(updateHistoryState, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-8 border-b border-zinc-800 bg-[#1e1e1e] flex items-center px-2 shrink-0 text-xs">
      <div className="flex gap-2 items-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant={"ghost" as any} size="sm" className="h-6 font-semibold text-zinc-200 gap-1 px-2 border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 hover:text-white rounded-sm">
              {editorMode === 'object' ? 'Object Mode' : 'Preview Mode'} <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-40">
            <DropdownMenuItem onClick={() => setEditorMode('object')}>Object Mode</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setEditorMode('preview')}>Preview Mode</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>


      </div>

      <div className="mx-4 w-px h-4 bg-zinc-700" />
      
      <div className="flex items-center gap-2">
        <span className="text-zinc-300">Global</span>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-1">
        <Button variant={"ghost" as any} size="icon" className={`h-6 w-6 rounded-none ${isGridVisible ? 'bg-blue-600/20 text-blue-400' : 'text-zinc-400 hover:bg-zinc-700'}`} onClick={toggleGrid} title="Toggle Grid">
          <Grid3X3 className="h-3 w-3" />
        </Button>
        <div className="mx-1 w-px h-4 bg-zinc-700" />
        <Button variant={"ghost" as any} size="icon" className={`h-6 w-6 rounded-none text-zinc-400 hover:bg-zinc-700 ${!canUndo && 'opacity-30'}`} onClick={() => commandManager.undo()} disabled={!canUndo} title="Undo">
          <Undo2 className="h-3 w-3" />
        </Button>
        <Button variant={"ghost" as any} size="icon" className={`h-6 w-6 rounded-none text-zinc-400 hover:bg-zinc-700 ${!canRedo && 'opacity-30'}`} onClick={() => commandManager.redo()} disabled={!canRedo} title="Redo">
          <Redo2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};

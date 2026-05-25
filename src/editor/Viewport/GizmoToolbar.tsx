import React from 'react';
import { useEditorStore } from '../../store/editor';
import { Button } from '@/components/ui/button';
import { MousePointer2, Crosshair, Move, RotateCw, Maximize, Scan, PenLine, Ruler, Box } from 'lucide-react';

export const GizmoToolbar: React.FC = () => {
  const editorMode = useEditorStore((state) => state.editorMode);
  const activeGizmoMode = useEditorStore((state) => state.activeGizmoMode);
  const setGizmoMode = useEditorStore((state) => state.setGizmoMode);

  if (editorMode !== 'object') return null;

  const tools = [
    { mode: 'select', icon: MousePointer2, title: 'Select Box' },
    { mode: 'cursor', icon: Crosshair, title: 'Cursor' },
    { mode: 'translate', icon: Move, title: 'Move' },
    { mode: 'rotate', icon: RotateCw, title: 'Rotate' },
    { mode: 'scale', icon: Maximize, title: 'Scale' },
    { mode: 'transform', icon: Scan, title: 'Transform' },
    { mode: 'annotate', icon: PenLine, title: 'Annotate' },
    { mode: 'measure', icon: Ruler, title: 'Measure' },
    { mode: 'add', icon: Box, title: 'Add Cube' },
  ];

  return (
    <div className="absolute top-2 left-2 z-10 flex flex-col gap-1 bg-zinc-800/80 p-1 rounded-md backdrop-blur-sm border border-zinc-700 shadow-lg">
      {tools.map((tool) => {
        const Icon = tool.icon;
        const isActive = activeGizmoMode === tool.mode;
        
        return (
          <Button
            key={tool.mode}
            variant={"ghost" as any}
            size="icon"
            className={`h-8 w-8 rounded-md transition-colors ${
              isActive 
                ? 'bg-blue-600 text-white hover:bg-blue-500' 
                : 'text-zinc-300 hover:bg-zinc-700 hover:text-white'
            }`}
            onClick={() => setGizmoMode(tool.mode as any)}
            title={tool.title}
          >
            <Icon className="h-4 w-4" />
          </Button>
        );
      })}
    </div>
  );
};

import React from 'react';
import { useEditorStore, type GizmoMode } from '../../store/editor';
import { Button } from '@/components/ui/button';
import { MousePointer2, Move, RotateCw } from 'lucide-react';

const VerticalToolButton = ({ 
  mode, 
  icon: Icon, 
  activeGizmoMode, 
  setGizmoMode 
}: { 
  mode: GizmoMode; 
  icon: any;
  activeGizmoMode: string; 
  setGizmoMode: (mode: GizmoMode) => void 
}) => (
  <Button
    variant={"ghost" as any}
    size="icon"
    className={`h-9 w-9 rounded-md ${activeGizmoMode === mode ? 'bg-blue-600/20 text-blue-400' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
    onClick={(e: React.MouseEvent) => {
      e.preventDefault();
      setGizmoMode(mode);
    }}
    title={mode.charAt(0).toUpperCase() + mode.slice(1)}
  >
    <Icon className="h-4 w-4" />
  </Button>
);

export const Toolbar: React.FC = () => {
  const activeGizmoMode = useEditorStore((state) => state.activeGizmoMode);
  const setGizmoMode = useEditorStore((state) => state.setGizmoMode);

  return (
    <div className="w-12 border-r border-zinc-800 bg-[#1e1e1e] flex flex-col items-center py-2 gap-2 shrink-0 h-full">
      <VerticalToolButton mode="select" icon={MousePointer2} activeGizmoMode={activeGizmoMode} setGizmoMode={setGizmoMode} />
      <div className="w-8 h-px bg-zinc-800 my-1" />
      <VerticalToolButton mode="translate" icon={Move} activeGizmoMode={activeGizmoMode} setGizmoMode={setGizmoMode} />
      <VerticalToolButton mode="rotate" icon={RotateCw} activeGizmoMode={activeGizmoMode} setGizmoMode={setGizmoMode} />
    </div>
  );
};

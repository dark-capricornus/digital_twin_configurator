import React from 'react';
import type { InspectorComponentProps } from './InspectorRegistry';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { commandManager } from '../../core/commands/CommandManager';
import { UpdateComponentCommand } from '../../core/commands/SceneCommands';

export const MeshInspector: React.FC<InspectorComponentProps> = ({ node }) => {
  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    commandManager.executeCommand(new UpdateComponentCommand(node.id, {
      color: e.target.value
    }));
  };

  return (
    <div className="space-y-3 pt-2">
      <div className="grid grid-cols-3 items-center gap-2">
        <Label className="text-xs text-zinc-400">Color</Label>
        <div className="col-span-2 flex gap-2 items-center">
          <input
            type="color"
            value={(node.components.color as string) || '#ffffff'}
            onChange={handleColorChange}
            className="w-6 h-6 rounded cursor-pointer bg-zinc-900 border border-zinc-700"
          />
          <Input
            value={(node.components.color as string) || '#ffffff'}
            onChange={handleColorChange}
            className="h-7 bg-zinc-900 border-zinc-800 text-xs font-mono"
          />
        </div>
      </div>
    </div>
  );
};

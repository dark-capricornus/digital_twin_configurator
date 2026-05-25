import React from 'react';
import type { InspectorComponentProps } from './InspectorRegistry';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { commandManager } from '../../core/commands/CommandManager';
import { UpdateTransformCommand } from '../../core/commands/SceneCommands';

export const TransformInspector: React.FC<InspectorComponentProps> = ({ node }) => {
  const handleTransformChange = (type: 'position' | 'rotation' | 'scale', axis: 0 | 1 | 2, value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    const currentTransform = { ...node.transform };
    const currentArray = [...currentTransform[type]] as [number, number, number];
    currentArray[axis] = numValue;

    commandManager.executeCommand(new UpdateTransformCommand(node.id, {
      [type]: currentArray
    }));
  };

  const renderVector3 = (label: string, type: 'position' | 'rotation' | 'scale', values: [number, number, number]) => (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <Label className="text-xs font-semibold text-zinc-300">{label}</Label>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {['X', 'Y', 'Z'].map((axis, i) => (
          <div key={axis} className="flex flex-col gap-1">
            <div className="flex items-center gap-1 bg-zinc-900 rounded-md px-2 border border-zinc-800 focus-within:border-blue-500 transition-colors">
              <span className={`text-[10px] font-bold ${i===0?'text-red-400':i===1?'text-green-400':'text-blue-400'}`}>{axis}</span>
              <Input
                type="number"
                value={values[i]}
                onChange={(e) => handleTransformChange(type, i as 0|1|2, e.target.value)}
                className="h-7 bg-transparent border-0 px-1 text-xs focus-visible:ring-0 focus-visible:ring-offset-0 text-right font-mono"
                step={type === 'scale' ? 0.1 : 1}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-4 pt-2">
      {renderVector3('Position', 'position', node.transform.position)}
      {renderVector3('Rotation', 'rotation', node.transform.rotation)}
      {renderVector3('Scale', 'scale', node.transform.scale)}
    </div>
  );
};

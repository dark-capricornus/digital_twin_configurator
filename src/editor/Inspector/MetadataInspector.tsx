import React from 'react';
import type { InspectorComponentProps } from './InspectorRegistry';
import { Label } from '@/components/ui/label';

export const MetadataInspector: React.FC<InspectorComponentProps> = ({ node }) => {
  return (
    <div className="space-y-3 pt-2">
      <div className="grid grid-cols-3 items-center gap-2">
        <Label className="text-xs text-zinc-400">Node ID</Label>
        <div className="col-span-2 text-xs font-mono text-zinc-300 truncate" title={node.id}>
          {node.id}
        </div>
      </div>
      <div className="grid grid-cols-3 items-center gap-2">
        <Label className="text-xs text-zinc-400">Type</Label>
        <div className="col-span-2 text-xs font-mono text-zinc-300">
          {node.type}
        </div>
      </div>
    </div>
  );
};

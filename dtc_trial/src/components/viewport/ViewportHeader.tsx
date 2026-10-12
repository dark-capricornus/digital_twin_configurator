import { ChevronDown, Eye, EyeOff, Magnet, Redo2, Undo2 } from 'lucide-react';
import { useState } from 'react';
import { useProject } from '../../store/projectStore';
import { useSim } from '../../store/simStore';
import { useUI } from '../../store/uiStore';
import { toggleSimulation } from '../MenuBar';
import { DropdownMenu } from '../ui/Layout';

export function ViewportHeader() {
  const running = useSim((s) => s.running);
  const { snap, showLabels, gizmoMode, set } = useUI();
  const canUndo = useProject((s) => s.past.length > 0);
  const canRedo = useProject((s) => s.future.length > 0);
  const { undo, redo } = useProject();
  const [modeOpen, setModeOpen] = useState(false);

  return (
    <div className="vp-header">
      <DropdownMenu
        triggerClass="mode-trigger"
        open={modeOpen}
        onOpenChange={setModeOpen}
        trigger={
          <>
            {running && <span className="live-dot" />}
            {running ? 'Simulate Mode' : 'Edit Mode'} <ChevronDown size={12} className="dim" />
          </>
        }
        items={[
          { label: 'Edit Mode', checked: !running, onClick: () => running && toggleSimulation(), hint: 'Configure layout and tags' },
          { label: 'Simulate Mode', checked: running, onClick: () => !running && toggleSimulation(), hint: 'Drive bindings with simulated values' },
        ]}
      />
      <span className="vp-sep" />
      <span className="vp-text">{gizmoMode === 'translate' ? 'Move' : 'Rotate'}</span>
      <span className="vp-text dim">Global</span>
      <span className="spacer" />
      <button className={`vp-icon ${snap ? 'active' : ''}`} onClick={() => set({ snap: !snap })} title="Snap 0.5 m / 15°">
        <Magnet size={13} />
      </button>
      <button className={`vp-icon ${showLabels ? 'active' : ''}`} onClick={() => set({ showLabels: !showLabels })} title="Toggle labels">
        {showLabels ? <Eye size={13} /> : <EyeOff size={13} />}
      </button>
      <span className="vp-sep" />
      <button className="vp-icon" onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">
        <Undo2 size={13} />
      </button>
      <button className="vp-icon" onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">
        <Redo2 size={13} />
      </button>
    </div>
  );
}

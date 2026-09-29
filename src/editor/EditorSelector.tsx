import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, List, Sliders, Folder, Library } from 'lucide-react';

export type EditorTabType = 'project' | 'system' | 'outliner' | 'properties';

interface EditorSelectorProps {
  activeTab: EditorTabType;
  onChangeTab: (tab: EditorTabType) => void;
  compact?: boolean; // if true, renders compact padding
}

export const EditorSelector: React.FC<EditorSelectorProps> = ({
  activeTab,
  onChangeTab,
  compact = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [popoverCoords, setPopoverCoords] = useState({ top: 0, left: 0, openUpward: false });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const handleMouseLeave = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    if (isOpen) {
      closeTimeoutRef.current = setTimeout(() => {
        setIsOpen(false);
      }, 150);
    }
  };

  const handleToggleSelector = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const windowWidth = window.innerWidth;
      const spaceBelow = windowHeight - rect.bottom;
      
      // Popover has a height of 84px. Open upward if space below is less than 95px.
      const openUpward = spaceBelow < 95;
      
      const menuWidth = 360;
      let left = rect.left;
      if (left + menuWidth > windowWidth) {
        left = windowWidth - menuWidth - 8; // 8px margin from right edge
      }
      if (left < 8) {
        left = 8;
      }
      
      setPopoverCoords({
        top: openUpward ? rect.top - 88 : rect.bottom + 4,
        left,
        openUpward
      });
    }
    setIsOpen(!isOpen);
  };

  const handleSelectTab = (tab: EditorTabType) => {
    onChangeTab(tab);
    setIsOpen(false);
  };

  const renderActiveIcon = () => {
    switch (activeTab) {
      case 'project':
        return <Library className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
      case 'system':
        return <Folder className="w-3.5 h-3.5 text-zinc-400 shrink-0" />;
      case 'outliner':
        return <List className="w-3.5 h-3.5 text-orange-400 shrink-0" />;
      case 'properties':
        return <Sliders className="w-3.5 h-3.5 text-purple-400 shrink-0" />;
    }
  };

  const popoverMenu = isOpen ? (
    <>
      {/* Backdrop overlay to capture clicks outside */}
      <div 
        className="fixed inset-0 z-40 bg-transparent" 
        onClick={() => setIsOpen(false)} 
      />
      {/* Popover content rendered via Portal directly in document.body */}
      <div 
        ref={popoverRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          position: 'fixed',
          top: `${popoverCoords.top}px`,
          left: `${popoverCoords.left}px`,
          width: '360px',
          height: '84px',
        }}
        className="bg-[#1b1b1b] border border-[#333] shadow-2xl rounded p-2 flex flex-row gap-3 z-50 text-xs text-zinc-300 animate-in fade-in zoom-in-95 duration-100 select-none font-sans"
      >
        {/* Column 1: Scene & Data */}
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <span className="font-bold text-zinc-500 pb-0.5 border-b border-zinc-800 text-[9px] uppercase px-1 mb-1 shrink-0">Scene & Data</span>
          
          {/* Outliner (Hierarchy) */}
          <button 
            onClick={() => handleSelectTab('outliner')}
            className={`flex justify-between items-center py-0.5 px-1.5 rounded transition-all w-full text-left ${
              activeTab === 'outliner' 
                ? 'bg-[#2f61a7] text-white font-medium shadow-sm' 
                : 'hover:bg-[#2e2e2e] text-zinc-300'
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <List className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'outliner' ? 'text-white' : 'text-orange-400'}`} />
              <span className="text-[11px] whitespace-nowrap">Outliner</span>
            </div>
            <span className={`text-[8px] font-mono shrink-0 ml-2 ${activeTab === 'outliner' ? 'text-white/60' : 'text-zinc-500'}`}>Shift F9</span>
          </button>

          {/* Properties (Inspector) */}
          <button 
            onClick={() => handleSelectTab('properties')}
            className={`flex justify-between items-center py-0.5 px-1.5 rounded transition-all w-full text-left ${
              activeTab === 'properties' 
                ? 'bg-[#2f61a7] text-white font-medium shadow-sm' 
                : 'hover:bg-[#2e2e2e] text-zinc-300'
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Sliders className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'properties' ? 'text-white' : 'text-purple-400'}`} />
              <span className="text-[11px] whitespace-nowrap">Properties</span>
            </div>
            <span className={`text-[8px] font-mono shrink-0 ml-2 ${activeTab === 'properties' ? 'text-white/60' : 'text-zinc-500'}`}>Shift F7</span>
          </button>
        </div>

        {/* Vertical Column Divider */}
        <div className="w-px bg-zinc-800 self-stretch my-0.5 shrink-0" />

        {/* Column 2: Files & Assets */}
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <span className="font-bold text-zinc-500 pb-0.5 border-b border-zinc-800 text-[9px] uppercase px-1 mb-1 shrink-0">Files & Assets</span>

          {/* File Browser */}
          <button 
            onClick={() => handleSelectTab('system')}
            className={`flex justify-between items-center py-0.5 px-1.5 rounded transition-all w-full text-left ${
              activeTab === 'system' 
                ? 'bg-[#2f61a7] text-white font-medium shadow-sm' 
                : 'hover:bg-[#2e2e2e] text-zinc-300'
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Folder className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'system' ? 'text-white' : 'text-zinc-400'}`} />
              <span className="text-[11px] whitespace-nowrap">File Browser</span>
            </div>
            <span className={`text-[8px] font-mono shrink-0 ml-2 ${activeTab === 'system' ? 'text-white/60' : 'text-zinc-500'}`}>Shift F1</span>
          </button>

          {/* Asset Browser */}
          <button 
            onClick={() => handleSelectTab('project')}
            className={`flex justify-between items-center py-0.5 px-1.5 rounded transition-all w-full text-left ${
              activeTab === 'project' 
                ? 'bg-[#2f61a7] text-white font-medium shadow-sm' 
                : 'hover:bg-[#2e2e2e] text-zinc-300'
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Library className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'project' ? 'text-white' : 'text-blue-400'}`} />
              <span className="text-[11px] whitespace-nowrap">Asset Browser</span>
            </div>
            <span className={`text-[8px] font-mono shrink-0 ml-2 ${activeTab === 'project' ? 'text-white/60' : 'text-zinc-500'}`}>Shift F1</span>
          </button>
        </div>
      </div>
    </>
  ) : null;

  return (
    <div 
      className="relative flex items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button 
        ref={buttonRef}
        onClick={handleToggleSelector}
        className={`flex items-center gap-1 rounded bg-[#2e2e2e] hover:bg-[#3d3d3d] border border-zinc-700/50 text-white transition-all shadow-inner shrink-0 ${
          compact ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-0.5 text-xs'
        }`}
        title="Editor Type"
      >
        {renderActiveIcon()}
        <ChevronDown className={compact ? 'w-2.5 h-2.5 text-zinc-400 shrink-0' : 'w-3 h-3 text-zinc-400 shrink-0'} />
      </button>

      {/* Render popover menu into document.body portal */}
      {createPortal(popoverMenu, document.body)}
    </div>
  );
};

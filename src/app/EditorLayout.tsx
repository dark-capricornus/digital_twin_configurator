import React from 'react';
import { Viewport } from '../editor/Viewport/Viewport';
import { ViewportHeader } from '../editor/Viewport/ViewportHeader';
import { GizmoToolbar } from '../editor/Viewport/GizmoToolbar';
import { HierarchyPanel } from '../editor/Hierarchy/HierarchyPanel';
import { InspectorPanel } from '../editor/Inspector/InspectorPanel';
import { AssetBrowserPanel } from '../editor/AssetBrowser/AssetBrowserPanel';
import { ActivityBar } from '../editor/ActivityBar/ActivityBar';
import { MenuBar } from '../editor/MenuBar/MenuBar';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { useEditorStore } from '../store/editor';

export const EditorLayout: React.FC = () => {
  const panelVisibility = useEditorStore((state) => state.panelVisibility);

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-[#1e1e1e] text-zinc-200 select-none">
      <MenuBar />
      
      <div className="flex-1 flex flex-row overflow-hidden">
        <ActivityBar />
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          {/* Asset Browser (Left Sidebar) */}
          {panelVisibility.assets && (
            <>
              <ResizablePanel defaultSize={15} minSize={10} className="min-w-[200px] border-r border-[#1e1e1e]">
                <AssetBrowserPanel />
              </ResizablePanel>
              <ResizableHandle className="w-1 bg-[#1e1e1e] hover:bg-blue-600 transition-colors" />
            </>
          )}

          {/* Main Viewport Area */}
          <ResizablePanel defaultSize={70} className="min-w-[400px] flex flex-col h-full bg-zinc-900">
            <ViewportHeader />
            <div className="flex-1 relative min-h-0">
              <GizmoToolbar />
              <Viewport />
            </div>
          </ResizablePanel>
          
          {panelVisibility.hierarchy || panelVisibility.inspector ? (
            <>
              <ResizableHandle className="w-1 bg-[#1e1e1e] hover:bg-blue-600 transition-colors" />
              {/* Right Side Panels (Scene Collection & Properties) */}
              <ResizablePanel defaultSize={15} minSize={10} className="min-w-[200px] border-l border-[#1e1e1e]">
                <div className="w-full h-full flex flex-col">
                  <ResizablePanelGroup direction="vertical" className="!flex-col h-full w-full">
                    
                    {/* Scene Collection (Hierarchy) */}
                    {panelVisibility.hierarchy && (
                      <ResizablePanel defaultSize={40} minSize={10} className="min-w-0 flex flex-col">
                        <HierarchyPanel />
                      </ResizablePanel>
                    )}
                    
                    {panelVisibility.hierarchy && panelVisibility.inspector && (
                      <ResizableHandle className="!h-1 !w-full bg-[#1e1e1e] hover:bg-blue-600 transition-colors cursor-row-resize" />
                    )}
                    
                    {/* Properties (Inspector) */}
                    {panelVisibility.inspector && (
                      <ResizablePanel defaultSize={60} minSize={10} className="min-w-0 flex flex-col border-t border-[#1e1e1e]">
                        <InspectorPanel />
                      </ResizablePanel>
                    )}
                    
                  </ResizablePanelGroup>
                </div>
              </ResizablePanel>
            </>
          ) : null}
          
        </ResizablePanelGroup>
      </div>
    </div>
  );
};

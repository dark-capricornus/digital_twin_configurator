import React, { useEffect, useRef, useState } from 'react';
import { useAssetStore } from '../../store/asset';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Folder, 
  Box, 
  FileText, 
  Upload, 
  Trash2, 
  ChevronDown, 
  ChevronRight, 
  ArrowLeft, 
  ArrowRight, 
  ArrowUp, 
  RotateCw, 
  Search, 
  List, 
  Grid, 
  Download, 
  Music, 
  Image, 
  Video, 
  Type, 
  Cloud,
  FileCode
} from 'lucide-react';
import { HierarchyPanel } from '../Hierarchy/HierarchyPanel';
import { EditorSelector, type EditorTabType } from '../EditorSelector';
import { InspectorPanel } from '../Inspector/InspectorPanel';
import { commandManager } from '../../core/commands/CommandManager';
import { PlaceModelCommand } from '../../core/commands/PlacementCommands';
import { PlacementSystem } from '../../runtime/systems/PlacementSystem';
import { SelectionService } from '../../core/services/SelectionService';
import { useSceneStore } from '../../store/scene';
import { persistenceService } from '../../core/persistence/IndexedDBProvider';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

interface FileItem {
  id: string;
  name: string;
  type: 'glb' | 'md' | 'zip' | 'png' | 'txt' | 'folder';
  size?: string;
  dateModified: string;
  isMock: boolean;
  assetId?: string; // For mock glbs
}

export interface AssetBrowserPanelProps {
  defaultTab?: 'project' | 'system' | 'outliner' | 'properties';
}

export const AssetBrowserPanel: React.FC<AssetBrowserPanelProps> = ({ defaultTab = 'project' }) => {
  const { assets, loadAssets, importAsset, deleteAsset } = useAssetStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rootNodeId = useSceneStore((state) => state.rootNodeId);

  // Tab State: 'project' (Asset Browser), 'system' (File Browser), 'outliner' (Hierarchy), 'properties' (Inspector)
  const [activeTab, setActiveTab] = useState<EditorTabType>(defaultTab);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  const handleTabChange = (tab: EditorTabType) => {
    setActiveTab(tab);
    setSearchQuery('');
  };

  // Layout, view, and search states
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [systemPath, setSystemPath] = useState('C:\\Users\\haris\\Downloads\\');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string>('mock-plant');
  
  // Responsive Height Tracking
  const containerRef = useRef<HTMLDivElement>(null);
  const [panelHeight, setPanelHeight] = useState(250);

  // Collapsible sidebars inside System File Explorer (when space allows)
  const [bookmarksExpanded, setBookmarksExpanded] = useState(true);
  const [systemExpanded, setSystemExpanded] = useState(true);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  // Monitor Panel Height via ResizeObserver to make layout adaptive
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setPanelHeight(entry.contentRect.height);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Sidebar Path Mapping for System File Explorer
  const systemPaths = {
    downloads: 'C:\\Users\\haris\\Downloads\\',
    music: 'C:\\Users\\haris\\Music\\',
    pictures: 'C:\\Users\\haris\\Pictures\\',
    videos: 'C:\\Users\\haris\\Videos\\',
    fonts: 'C:\\Users\\haris\\Fonts\\',
    onedrive: 'C:\\Users\\haris\\OneDrive\\',
    screenshots: 'C:\\Users\\haris\\Pictures\\Screenshots\\'
  };

  // Mock data representing standard system folders
  const mockSystemFilesByPath: Record<string, FileItem[]> = {
    [systemPaths.downloads]: [
      { id: 'mock-assembly', name: 'assembly_line.glb', type: 'glb', dateModified: 'Yesterday 14:02', isMock: true, assetId: 'mock-assembly-line' },
      { id: 'mock-instructions', name: 'instructions.txt', type: 'txt', dateModified: 'Yesterday 14:02', isMock: true }
    ],
    [systemPaths.onedrive]: [
      { id: 'mock-backup', name: 'digital_twin_backup.zip', type: 'zip', dateModified: '3 days ago', isMock: true }
    ],
    [systemPaths.screenshots]: [
      { id: 'mock-screenshot', name: 'screenshot_twin_v1.png', type: 'png', dateModified: 'Last week', isMock: true }
    ]
  };

  // 1. Project Assets Items (Only models inside the digital twin project workspace)
  const projectItems = React.useMemo(() => {
    const defaultProjectItems: FileItem[] = [
      { id: 'mock-plant', name: 'plant.glb', type: 'glb', dateModified: 'Yesterday 11:16', isMock: true, assetId: 'mock-plant' },
      { id: 'mock-readme', name: 'README.md', type: 'md', dateModified: 'Yesterday 11:16', isMock: true }
    ];

    const realFiles: FileItem[] = assets.map(asset => ({
      id: asset.id,
      name: asset.name,
      type: asset.name.endsWith('.glb') ? 'glb' : 'md',
      dateModified: new Date(asset.uploadedAt).toLocaleDateString() + ' ' + new Date(asset.uploadedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMock: false,
      assetId: asset.id
    }));

    const combined = [...defaultProjectItems, ...realFiles];
    if (activeTab === 'project' && searchQuery.trim() !== '') {
      return combined.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return combined;
  }, [assets, searchQuery, activeTab]);

  // 2. System Explorer Items
  const systemItems = React.useMemo(() => {
    const combined = mockSystemFilesByPath[systemPath] || [];
    if (activeTab === 'system' && searchQuery.trim() !== '') {
      return combined.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return combined;
  }, [systemPath, searchQuery, activeTab]);

  // Handle uploading files (GLB files)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const glbFiles = Array.from(files).filter(f => f.name.toLowerCase().endsWith('.glb'));
      for (const file of glbFiles) {
        await importAsset(file);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePlaceAsset = async (assetId: string, assetName: string) => {
    let groundedPosition: [number, number, number] = [0, 0, 0];
    let boundingInfo = null;

    // For real GLBs, compute grounded position via bounding-box analysis
    if (!assetId.startsWith('mock-')) {
      try {
        const asset = await persistenceService.getAsset(assetId);
        if (asset?.file) {
          const url = URL.createObjectURL(asset.file);
          const loader = new GLTFLoader();
          const gltf = await new Promise<any>((resolve, reject) => {
            loader.load(url, resolve, undefined, reject);
          });
          URL.revokeObjectURL(url);

          boundingInfo = PlacementSystem.computeBoundingInfo(gltf.scene);
          groundedPosition = PlacementSystem.computeCenteredGroundedPosition(gltf.scene);
        }
      } catch (err) {
        console.warn('[AssetBrowser] Failed to compute grounded position for', assetName, err);
      }
    }

    const cmd = new PlaceModelCommand(
      assetId,
      assetName,
      groundedPosition,
      rootNodeId,
      boundingInfo,
    );
    commandManager.executeCommand(cmd);
    SelectionService.selectNode(cmd.getNodeId());
  };

  const handleDragStart = (e: React.DragEvent, item: FileItem) => {
    if (item.type !== 'glb') return;
    const targetAssetId = item.isMock ? item.assetId : item.id;
    if (!targetAssetId) return;

    e.dataTransfer.setData('application/asset-id', targetAssetId);
    e.dataTransfer.setData('application/asset-name', item.name);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleRowDoubleClick = (item: FileItem) => {
    if (item.type === 'glb') {
      const targetAssetId = item.isMock ? item.assetId : item.id;
      if (targetAssetId) {
        handlePlaceAsset(targetAssetId, item.name);
      }
    }
  };

  const handleDeleteItem = async (e: React.MouseEvent, item: FileItem) => {
    e.stopPropagation();
    if (item.isMock) {
      alert("Mock system files cannot be deleted.");
      return;
    }
    if (confirm(`Are you sure you want to delete ${item.name}?`)) {
      await deleteAsset(item.id);
      if (selectedItemId === item.id) {
        setSelectedItemId('');
      }
    }
  };

  const renderItemIcon = (type: FileItem['type']) => {
    switch (type) {
      case 'glb':
        return <Box className="w-4 h-4 text-cyan-400 shrink-0" />;
      case 'md':
        return <FileText className="w-4 h-4 text-emerald-400 shrink-0" />;
      case 'zip':
        return <FileCode className="w-4 h-4 text-amber-500 shrink-0" />;
      case 'png':
        return <Image className="w-4 h-4 text-purple-400 shrink-0" />;
      case 'txt':
        return <FileText className="w-4 h-4 text-zinc-400 shrink-0" />;
      default:
        return <Folder className="w-4 h-4 text-blue-400 shrink-0" />;
    }
  };

  const navigateToParentSystem = () => {
    const parts = systemPath.split('\\').filter(Boolean);
    if (parts.length <= 1) return;
    parts.pop();
    setSystemPath(parts.join('\\') + '\\');
  };

  // Determine height-dependent parameters to clean up UI when space is limited
  const isShortHeight = panelHeight < 210;
  const isMicroHeight = panelHeight < 150;

  return (
    <div 
      ref={containerRef}
      className="flex flex-col w-full h-full bg-[#1b1b1b] text-zinc-200 select-none overflow-hidden font-sans border-t border-zinc-800 relative"
    >
      
      {/* ================== MAIN BLENDER-STYLE TOOLBAR ================== */}
      <div className="h-8 bg-[#202020] border-b border-[#121212] flex items-center px-2 justify-between shrink-0 select-none z-30">
<div className="flex items-center gap-3">
          
          {/* Blender Editor Selector Button */}
          <EditorSelector activeTab={activeTab} onChangeTab={handleTabChange} />

          {(activeTab === 'project' || activeTab === 'system') && (
            <div className="h-4 w-px bg-zinc-800" />
          )}

          {/* Menus matching Blender active state */}
          <div className="flex items-center gap-3 text-xs">
            {activeTab === 'project' && (
              <>
                <span className="hover:text-white cursor-pointer font-medium text-zinc-300">View</span>
                <span className="hover:text-white cursor-pointer font-medium text-zinc-300">Select</span>
                <span className="hover:text-white cursor-pointer font-medium text-zinc-300">Catalog</span>
                <span className="hover:text-white cursor-pointer font-medium text-zinc-300">Asset</span>
              </>
            )}
            {activeTab === 'system' && (
              <>
                <span className="hover:text-white cursor-pointer font-medium text-zinc-300">View</span>
                <span className="hover:text-white cursor-pointer font-medium text-zinc-300">Select</span>
                <span className="hover:text-white cursor-pointer font-medium text-zinc-300">Navigate</span>
                <span className="hover:text-white cursor-pointer font-medium text-zinc-300">Folder</span>
              </>
            )}
          </div>

          {/* Fallback mock dropdown for Blender "Follow Preferences" layout */}
          {!isShortHeight && (activeTab === 'project' || activeTab === 'system') && (
            <>
              <div className="h-4 w-px bg-zinc-800 mx-1" />
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <span className="bg-[#2c2c2c] border border-zinc-700/60 rounded px-2 py-0.5 text-zinc-300 hover:bg-[#343434] cursor-pointer">
                  Follow Preferences
                </span>
              </div>
            </>
          )}
        </div>

        {/* Action Tools on the right */}
        <div className="flex items-center gap-2">
          {/* Quick upload button inside toolbar when short */}
          {activeTab === 'project' && isShortHeight && (
            <>
              <input
                type="file"
                accept=".glb"
                multiple
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 bg-[#2a2a2a] hover:bg-[#383838] border border-zinc-700/40 text-[10px] px-1.5 py-0.5 rounded text-zinc-200 transition-colors shrink-0"
              >
                <Upload className="w-2.5 h-2.5" />
                <span>Upload</span>
              </button>
            </>
          )}

          {/* Quick search input on top bar when short */}
          {isShortHeight && !isMicroHeight && (activeTab === 'project' || activeTab === 'system') && (
            <div className="relative w-36 flex items-center">
              <Search className="absolute left-2 w-3 h-3 text-zinc-500" />
              <input 
                type="text" 
                placeholder="Search" 
                className="w-full bg-[#111111] border border-zinc-800 rounded pl-7 pr-2 py-0.5 text-[10px] text-zinc-300 outline-none focus:border-zinc-700 focus:bg-[#0c0c0c]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          )}

          {/* Global Layout toggles */}
          {!isMicroHeight && (activeTab === 'project' || activeTab === 'system') && (
            <div className="flex items-center bg-[#252525] rounded p-0.5 border border-zinc-800 shrink-0">
              <button 
                className={`p-0.5 rounded ${viewMode === 'list' ? 'bg-[#3c3c3c] text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
                onClick={() => setViewMode('list')}
                title="List View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button 
                className={`p-0.5 rounded ${viewMode === 'grid' ? 'bg-[#3c3c3c] text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
                onClick={() => setViewMode('grid')}
                title="Grid View"
              >
                <Grid className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ================== MAIN WORKING VIEWPORTS ================== */}
      <div className="flex-1 flex flex-row overflow-hidden relative">
        
        {/* ================== TAB 1: PROJECT ASSET BROWSER ================== */}
        {activeTab === 'project' && (
          <div className="flex-1 flex flex-col overflow-hidden w-full h-full">
            
            {/* Project Navigation toolbar (Only when vertical space allows) */}
            {!isShortHeight && (
              <div className="h-9 px-3 bg-[#1b1b1b] border-b border-[#151515] flex items-center justify-between shrink-0 select-none">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-zinc-400 uppercase tracking-wider text-[10px]">Project Workspace:</span>
                  <span className="font-mono text-blue-400 bg-blue-950/40 border border-blue-900/50 rounded px-2 py-0.5">models/</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative w-44 flex items-center">
                    <Search className="absolute left-2.5 w-3.5 h-3.5 text-zinc-500" />
                    <input 
                      type="text" 
                      placeholder="Search assets" 
                      className="w-full bg-[#111111] border border-zinc-800 rounded pl-8 pr-2.5 py-0.5 text-xs text-zinc-300 outline-none focus:border-zinc-700 focus:bg-[#0c0c0c] transition-all"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <input
                    type="file"
                    accept=".glb"
                    multiple
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 bg-[#252525] hover:bg-[#343434] border border-zinc-800 text-xs px-2.5 py-1 rounded transition-colors text-zinc-200"
                    title="Upload direct glb models"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Upload Model</span>
                  </button>
                </div>
              </div>
            )}

            {/* List / Grid File panel */}
            <div className="flex-1 bg-[#151515] overflow-hidden flex flex-col w-full h-full">
              {viewMode === 'list' ? (
                <div className="flex flex-col h-full overflow-hidden w-full h-full">
                  {!isMicroHeight && (
                    <div className="h-6 px-3 bg-[#202020] border-b border-[#121212] flex items-center text-[10px] font-bold text-zinc-500 uppercase tracking-wider shrink-0 select-none">
                      <span className="flex-1">Name</span>
                      <span className="w-48 text-right pr-6">Date Modified</span>
                    </div>
                  )}
                  <ScrollArea className="flex-1">
                    <div className="flex flex-col py-0.5">
                      {projectItems.map((item) => {
                        const isSelected = selectedItemId === item.id;
                        return (
                          <div 
                            key={item.id}
                            onClick={() => setSelectedItemId(item.id)}
                            onDoubleClick={() => handleRowDoubleClick(item)}
                            draggable
                            onDragStart={(e) => handleDragStart(e, item)}
                            className={`group px-3 py-1 flex items-center gap-2 cursor-pointer transition-colors text-xs select-none ${
                              isSelected 
                                ? 'bg-[#2f61a7] text-white font-medium' 
                                : 'text-zinc-300 hover:bg-[#282828]'
                            }`}
                          >
                            {renderItemIcon(item.type)}
                            <span className="flex-1 truncate">{item.name}</span>
                            
                            <div className="flex items-center gap-4 shrink-0">
                              {item.type === 'glb' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const targetAssetId = item.isMock ? item.assetId : item.id;
                                    if (targetAssetId) handlePlaceAsset(targetAssetId, item.name);
                                  }}
                                  className={`text-[10px] px-1.5 py-0.5 rounded border transition-opacity opacity-0 group-hover:opacity-100 ${
                                    isSelected 
                                      ? 'border-white/50 bg-white/10 hover:bg-white/20 text-white' 
                                      : 'border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                                  }`}
                                >
                                  Place Model
                                </button>
                              )}
                              
                              {!item.isMock && (
                                <button
                                  onClick={(e) => handleDeleteItem(e, item)}
                                  className={`p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all ${
                                    isSelected ? 'text-white' : 'text-red-400'
                                  }`}
                                  title="Delete Model"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {!isMicroHeight && (
                                <span className={`w-48 text-right pr-3 font-mono text-[11px] ${isSelected ? 'text-white/80' : 'text-zinc-500'}`}>
                                  {item.dateModified}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              ) : (
                <ScrollArea className="flex-1">
                  <div className="p-3 flex flex-wrap content-start gap-3">
                    {projectItems.map((item) => {
                      const isSelected = selectedItemId === item.id;
                      return (
                        <div 
                          key={item.id}
                          onClick={() => setSelectedItemId(item.id)}
                          onDoubleClick={() => handleRowDoubleClick(item)}
                          draggable
                          onDragStart={(e) => handleDragStart(e, item)}
                          className={`w-[110px] shrink-0 border rounded-md p-2 flex flex-col items-center justify-center gap-2 group cursor-grab active:cursor-grabbing hover:border-[#2f61a7] transition-all select-none ${
                            isSelected 
                              ? 'bg-[#2f61a7]/20 border-[#2f61a7]' 
                              : 'bg-[#1b1b1b] border-zinc-800'
                          }`}
                        >
                          <div className={`relative w-full aspect-square rounded flex flex-col items-center justify-center overflow-hidden transition-colors ${
                            isSelected ? 'bg-black/30' : 'bg-zinc-900'
                          }`}>
                            {renderItemIcon(item.type)}
                            
                            {item.type === 'glb' && (
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center">
                                <button 
                                  className="h-5 text-[10px] px-2 bg-[#2f61a7] hover:bg-blue-500 rounded text-white font-medium"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const targetAssetId = item.isMock ? item.assetId : item.id;
                                    if (targetAssetId) handlePlaceAsset(targetAssetId, item.name);
                                  }}
                                >
                                  Place
                                </button>
                              </div>
                            )}
                            
                            {!item.isMock && (
                              <button
                                onClick={(e) => handleDeleteItem(e, item)}
                                className="absolute top-1 right-1 h-5 w-5 bg-black/50 opacity-0 group-hover:opacity-100 text-red-400 hover:bg-red-600 hover:text-white rounded flex items-center justify-center z-10 transition-all"
                                title="Delete"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                          
                          <span className={`text-[11px] truncate w-full text-center px-1 font-sans ${
                            isSelected ? 'text-[#3b82f6] font-semibold' : 'text-zinc-400'
                          }`} title={item.name}>
                            {item.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </div>

          </div>
        )}

        {/* ================== TAB 2: SYSTEM FILE EXPLORER ================== */}
        {activeTab === 'system' && (
          <div className="flex-1 flex flex-row overflow-hidden w-full h-full">
            
            {/* System Sidebar (Hidden when panel height is too short to avoid overflow) */}
            {!isShortHeight && (
              <div className="w-52 bg-[#1f1f1f] border-r border-[#151515] flex flex-col shrink-0 select-none">
                
                {/* Bookmarks Section */}
                <div className="mt-1">
                  <div 
                    className="flex items-center justify-between px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-300 cursor-pointer select-none"
                    onClick={() => setBookmarksExpanded(!bookmarksExpanded)}
                  >
                    <div className="flex items-center gap-1">
                      {bookmarksExpanded ? <ChevronDown className="w-3.5 h-3.5 text-zinc-400" /> : <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />}
                      <span>Bookmarks</span>
                    </div>
                  </div>
                  
                  {bookmarksExpanded && (
                    <div className="flex flex-col px-1">
                      <div 
                        onClick={() => setSystemPath(systemPaths.downloads)}
                        className={`flex items-center gap-2 px-3 py-1 text-xs rounded cursor-pointer transition-colors ${
                          systemPath === systemPaths.downloads 
                            ? 'bg-[#2f61a7] text-white font-medium' 
                            : 'text-zinc-300 hover:bg-[#2c2c2c]'
                        }`}
                      >
                        <Folder className="w-3.5 h-3.5 text-zinc-400" />
                        <span>downloads</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* System Section */}
                <div className="mt-2">
                  <div 
                    className="flex items-center justify-between px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-300 cursor-pointer select-none"
                    onClick={() => setSystemExpanded(!systemExpanded)}
                  >
                    <div className="flex items-center gap-1">
                      {systemExpanded ? <ChevronDown className="w-3.5 h-3.5 text-zinc-400" /> : <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />}
                      <span>System</span>
                    </div>
                  </div>

                  {systemExpanded && (
                    <div className="flex flex-col px-1 space-y-0.5">
                      {[
                        { name: 'Downloads', icon: Download, path: systemPaths.downloads },
                        { name: 'Music', icon: Music, path: systemPaths.music },
                        { name: 'Pictures', icon: Image, path: systemPaths.pictures },
                        { name: 'Videos', icon: Video, path: systemPaths.videos },
                        { name: 'Fonts', icon: Type, path: systemPaths.fonts },
                        { name: 'OneDrive', icon: Cloud, path: systemPaths.onedrive },
                        { name: 'Screenshots', icon: Image, path: systemPaths.screenshots }
                      ].map((item, idx) => {
                        const IconComp = item.icon;
                        const isActive = systemPath === item.path;
                        return (
                          <div 
                            key={idx}
                            onClick={() => setSystemPath(item.path)}
                            className={`flex items-center gap-2 px-3 py-1 text-xs rounded cursor-pointer transition-colors ${
                              isActive 
                                ? 'bg-[#2f61a7] text-white font-medium' 
                                : 'text-zinc-300 hover:bg-[#2c2c2c]'
                            }`}
                          >
                            <IconComp className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-zinc-400'}`} />
                            <span className="truncate w-full">{item.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* System Explorer Right Panel */}
            <div className="flex-1 flex flex-col overflow-hidden w-full h-full">
              
              {/* Explorer action navigation bar (Hidden when space is short) */}
              {!isShortHeight && (
                <div className="h-9 px-3 bg-[#1b1b1b] border-b border-[#151515] flex items-center gap-2 shrink-0 select-none">
                  <div className="flex items-center gap-0.5">
                    <button className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30" disabled>
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    <button className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30" disabled>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={navigateToParentSystem}
                      className="p-1 rounded text-zinc-300 hover:text-white hover:bg-[#2c2c2c]"
                      title="Parent Directory"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => loadAssets()}
                      className="p-1 rounded text-zinc-300 hover:text-white hover:bg-[#2c2c2c]"
                      title="Refresh"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="h-4 w-px bg-zinc-800 mx-1" />

                  {/* Path input */}
                  <div className="flex-1 relative flex items-center">
                    <input 
                      type="text" 
                      className="w-full bg-[#111111] border border-zinc-800 rounded px-2.5 py-0.5 text-xs text-zinc-300 outline-none focus:border-zinc-700 font-mono focus:bg-[#0c0c0c] transition-all"
                      value={systemPath}
                      onChange={(e) => setSystemPath(e.target.value)}
                    />
                  </div>

                  {/* Search input */}
                  <div className="relative w-44 flex items-center">
                    <Search className="absolute left-2.5 w-3.5 h-3.5 text-zinc-500" />
                    <input 
                      type="text" 
                      placeholder="Search files" 
                      className="w-full bg-[#111111] border border-zinc-800 rounded pl-8 pr-2.5 py-0.5 text-xs text-zinc-300 outline-none focus:border-zinc-700 focus:bg-[#0c0c0c] transition-all"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* System list / grid panel */}
              <div className="flex-1 bg-[#151515] overflow-hidden flex flex-col w-full h-full">
                {viewMode === 'list' ? (
                  <div className="flex flex-col h-full overflow-hidden w-full h-full">
                    {!isMicroHeight && (
                      <div className="h-6 px-3 bg-[#202020] border-b border-[#121212] flex items-center text-[10px] font-bold text-zinc-500 uppercase tracking-wider shrink-0 select-none">
                        <span className="flex-1">Name</span>
                        <span className="w-48 text-right pr-6">Date Modified</span>
                      </div>
                    )}
                    <ScrollArea className="flex-1">
                      <div className="flex flex-col py-0.5">
                        {systemItems.map((item) => {
                          const isSelected = selectedItemId === item.id;
                          return (
                            <div 
                              key={item.id}
                              onClick={() => setSelectedItemId(item.id)}
                              onDoubleClick={() => handleRowDoubleClick(item)}
                              draggable={item.type === 'glb'}
                              onDragStart={(e) => handleDragStart(e, item)}
                              className={`group px-3 py-1.5 flex items-center gap-2 cursor-pointer transition-colors text-xs select-none ${
                                isSelected 
                                  ? 'bg-[#2f61a7] text-white font-medium' 
                                  : 'text-zinc-300 hover:bg-[#282828]'
                              }`}
                            >
                              {renderItemIcon(item.type)}
                              <span className="flex-1 truncate">{item.name}</span>
                              
                              <div className="flex items-center gap-4 shrink-0">
                                {item.type === 'glb' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const targetAssetId = item.isMock ? item.assetId : item.id;
                                      if (targetAssetId) handlePlaceAsset(targetAssetId, item.name);
                                    }}
                                    className={`text-[10px] px-1.5 py-0.5 rounded border transition-opacity opacity-0 group-hover:opacity-100 ${
                                      isSelected 
                                        ? 'border-white/50 bg-white/10 hover:bg-white/20 text-white' 
                                        : 'border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                                    }`}
                                  >
                                    Place Model
                                  </button>
                                )}

                                {!isMicroHeight && (
                                  <span className={`w-48 text-right pr-3 font-mono text-[11px] ${isSelected ? 'text-white/80' : 'text-zinc-500'}`}>
                                    {item.dateModified}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        {systemItems.length === 0 && (
                          <div className="w-full text-center text-xs text-zinc-500 py-10 font-sans">
                            This folder is empty.
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                ) : (
                  <ScrollArea className="flex-1">
                    <div className="p-3 flex flex-wrap content-start gap-3">
                      {systemItems.map((item) => {
                        const isSelected = selectedItemId === item.id;
                        return (
                          <div 
                            key={item.id}
                            onClick={() => setSelectedItemId(item.id)}
                            onDoubleClick={() => handleRowDoubleClick(item)}
                            draggable={item.type === 'glb'}
                            onDragStart={(e) => handleDragStart(e, item)}
                            className={`w-[110px] shrink-0 border rounded-md p-2 flex flex-col items-center justify-center gap-2 group cursor-grab active:cursor-grabbing hover:border-[#2f61a7] transition-all select-none ${
                              isSelected 
                                ? 'bg-[#2f61a7]/20 border-[#2f61a7]' 
                                : 'bg-[#1b1b1b] border-zinc-800'
                            }`}
                          >
                            <div className={`relative w-full aspect-square rounded flex flex-col items-center justify-center overflow-hidden transition-colors ${
                              isSelected ? 'bg-black/30' : 'bg-zinc-900'
                            }`}>
                              {renderItemIcon(item.type)}
                              
                              {item.type === 'glb' && (
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center">
                                  <button 
                                    className="h-5 text-[10px] px-2 bg-[#2f61a7] hover:bg-blue-500 rounded text-white font-medium"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const targetAssetId = item.isMock ? item.assetId : item.id;
                                      if (targetAssetId) handlePlaceAsset(targetAssetId, item.name);
                                    }}
                                  >
                                    Place
                                  </button>
                                </div>
                              )}
                            </div>
                            
                            <span className={`text-[11px] truncate w-full text-center px-1 font-sans ${
                              isSelected ? 'text-[#3b82f6] font-semibold' : 'text-zinc-400'
                            }`} title={item.name}>
                              {item.name}
                            </span>
                          </div>
                        );
                      })}
                      {systemItems.length === 0 && (
                        <div className="w-full text-center text-xs text-zinc-500 py-10 font-sans">
                          This folder is empty.
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </div>

          </div>
        )}

        {/* ================== TAB 3: HIERARCHY (OUTLINER) ================== */}
        {activeTab === 'outliner' && (
          <div className="flex-1 w-full h-full overflow-hidden">
            <HierarchyPanel hideHeader={true} />
          </div>
        )}

        {/* ================== TAB 4: INSPECTOR (PROPERTIES) ================== */}
        {activeTab === 'properties' && (
          <div className="flex-1 w-full h-full overflow-hidden">
            <InspectorPanel hideHeader={true} />
          </div>
        )}
      </div>
      
    </div>
  );
};

import React, { useEffect, useRef } from 'react';
import { useAssetStore } from '../../store/asset';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Box, Upload, FolderUp, Trash2, Folder, ChevronLeft } from 'lucide-react';
import { commandManager } from '../../core/commands/CommandManager';
import { AddNodeCommand } from '../../core/commands/SceneCommands';
import { SelectionService } from '../../core/services/SelectionService';
import { useSceneStore } from '../../store/scene';

export const AssetBrowserPanel: React.FC = () => {
  const { assets, loadAssets, importAsset, deleteAsset, deleteFolder } = useAssetStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const rootNodeId = useSceneStore((state) => state.rootNodeId);

  const [currentPath, setCurrentPath] = React.useState('/');

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  const subdirectories = React.useMemo(() => {
    const dirs = new Set<string>();
    assets.forEach((asset) => {
      const assetPath = asset.path || '/';
      if (assetPath.startsWith(currentPath) && assetPath !== currentPath) {
        const relative = assetPath.substring(currentPath.length);
        const parts = relative.split('/').filter(Boolean);
        if (parts.length > 0) {
          dirs.add(parts[0]);
        }
      }
    });
    return Array.from(dirs).sort();
  }, [assets, currentPath]);

  const currentFiles = React.useMemo(() => {
    return assets.filter(a => (a.path || '/') === currentPath);
  }, [assets, currentPath]);

  const navigateUp = () => {
    if (currentPath === '/') return;
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    setCurrentPath(parts.length > 0 ? '/' + parts.join('/') + '/' : '/');
  };

  const navigateInto = (dirName: string) => {
    setCurrentPath(currentPath + dirName + '/');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const glbFiles = Array.from(files).filter(f => f.name.toLowerCase().endsWith('.glb'));
      for (const file of glbFiles) {
        await importAsset(file);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (folderInputRef.current) folderInputRef.current.value = '';
  };

  const handlePlaceAsset = (assetId: string, assetName: string) => {
    const newNode = {
      id: Math.random().toString(36).substr(2, 9),
      name: assetName,
      type: 'Model' as const,
      parentId: rootNodeId,
      transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
      components: { assetId },
      children: [],
    };
    // @ts-ignore
    commandManager.executeCommand(new AddNodeCommand(newNode, rootNodeId));
    SelectionService.selectNode(newNode.id);
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, asset: any) => {
    e.dataTransfer.setData('application/asset-id', asset.id);
    e.dataTransfer.setData('application/asset-name', asset.name);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="flex flex-col w-full h-full bg-zinc-950 overflow-hidden">
      <div className="flex items-center justify-between p-2 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-1 overflow-hidden">
          {currentPath !== '/' && (
            <Button variant={"ghost" as any} size="icon" className="h-6 w-6 shrink-0 text-zinc-400 hover:text-zinc-100" onClick={navigateUp}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          <span className="text-sm font-semibold text-zinc-100 truncate" title={currentPath === '/' ? 'Project Assets' : currentPath}>
            {currentPath === '/' ? 'Project Assets' : currentPath.split('/').filter(Boolean).pop()}
          </span>
        </div>
        <input
          type="file"
          accept=".glb"
          multiple
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileChange}
        />
        <input
          type="file"
          {...{ webkitdirectory: "", directory: "" } as any}
          multiple
          ref={folderInputRef}
          className="hidden"
          onChange={handleFileChange}
        />
        <div className="flex items-center gap-1">
          <Button 
            variant={"ghost" as any} 
            size="icon" 
            className="h-6 w-6 text-zinc-400 hover:text-zinc-100" 
            onClick={() => fileInputRef.current?.click()}
            title="Import Files"
          >
            <Upload className="h-4 w-4" />
          </Button>
          <Button 
            variant={"ghost" as any} 
            size="icon" 
            className="h-6 w-6 text-zinc-400 hover:text-zinc-100" 
            onClick={() => folderInputRef.current?.click()}
            title="Import Folder"
          >
            <FolderUp className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2 flex flex-wrap content-start gap-2">
          {subdirectories.map((dir) => (
            <div 
              key={`dir-${dir}`} 
              className="w-[100px] shrink-0 bg-zinc-900 border border-zinc-800 rounded-md p-2 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-blue-500 transition-colors group"
              onClick={() => navigateInto(dir)}
            >
              <div className="relative w-full aspect-square bg-zinc-950 rounded flex items-center justify-center overflow-hidden">
                <Folder className="w-8 h-8 text-blue-500" />
                <Button
                  variant={"ghost" as any}
                  size="icon"
                  className="absolute top-1 right-1 h-5 w-5 bg-black/50 opacity-0 group-hover:opacity-100 text-red-400 hover:bg-red-500 hover:text-white z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete folder "${dir}" and all its contents?`)) {
                      deleteFolder(currentPath + dir + '/');
                    }
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              <span className="text-xs text-zinc-400 truncate w-full text-center" title={dir}>
                {dir}
              </span>
            </div>
          ))}

          {currentFiles.map((asset) => (
            <div 
              key={asset.id} 
              className="w-[100px] shrink-0 bg-zinc-900 border border-zinc-800 rounded-md p-2 flex flex-col items-center gap-2 group cursor-grab active:cursor-grabbing hover:border-blue-500 transition-colors"
              draggable
              onDragStart={(e) => handleDragStart(e, asset)}
            >
              <div className="relative w-full aspect-square bg-zinc-950 rounded flex flex-col items-center justify-center overflow-hidden">
                <Box className="w-8 h-8 text-zinc-600 group-hover:text-blue-400 transition-colors" />
                
                {/* Overlay actions */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="h-6 text-xs bg-blue-600 hover:bg-blue-500"
                    onClick={() => handlePlaceAsset(asset.id, asset.name)}
                  >
                    Import
                  </Button>
                </div>
                
                <Button
                  variant={"ghost" as any}
                  size="icon"
                  className="absolute top-1 right-1 h-5 w-5 bg-black/50 opacity-0 group-hover:opacity-100 text-red-400 hover:bg-red-500 hover:text-white z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteAsset(asset.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              <span className="text-xs text-zinc-400 truncate w-full text-center" title={asset.name}>
                {asset.name}
              </span>
            </div>
          ))}
          {assets.length === 0 && (
            <div className="w-full text-center text-xs text-zinc-500 p-4">
              No assets imported. Click the upload button to import a .glb file.
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

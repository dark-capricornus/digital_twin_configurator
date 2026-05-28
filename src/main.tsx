import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { useSceneStore } from './store/scene';
import { useEditorStore } from './store/editor';
import { commandManager } from './core/commands/CommandManager';

(window as any).useSceneStore = useSceneStore;
(window as any).useEditorStore = useEditorStore;
(window as any).commandManager = commandManager;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);


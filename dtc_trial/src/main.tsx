import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if (import.meta.env.DEV) {
  // Handy for debugging in the browser console: __dtc.useProject.getState()
  import('./store/projectStore').then((m) => Object.assign(window, { __dtc: m }));
}

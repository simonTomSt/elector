import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { installE2eBridge } from './e2eBridge';
import './ui/theme/global.css';

installE2eBridge();

const container = document.getElementById('root');
if (!container) throw new Error('Brak elementu #root');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

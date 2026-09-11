import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Capture beforeinstallprompt globally on page boot so it is never lost
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    (window as any).deferredPWAPrompt = e;
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

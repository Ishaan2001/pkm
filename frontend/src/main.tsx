import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Register service worker for PWA and push notifications
import { registerSW } from 'virtual:pwa-register'


// Enhanced service worker registration with debugging
registerSW({ 
  immediate: true,
  onRegistered(r: ServiceWorkerRegistration | undefined) {
    console.log('[PWA] Service worker registered successfully:', r);
  },
  onRegisterError(error: Error) {
    console.error('[PWA] Service worker registration failed:', error);
  },
  onOfflineReady() {
    console.log('[PWA] App ready to work offline');
  },
  onNeedRefresh() {
    console.log('[PWA] New content available, please refresh');
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

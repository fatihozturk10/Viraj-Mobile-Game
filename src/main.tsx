import { Capacitor } from '@capacitor/core';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

if (!Capacitor.isNativePlatform()) {
  if (import.meta.env.PROD) {
    registerSW({ immediate: true });
  } else if ('serviceWorker' in navigator) {
    void navigator.serviceWorker
      .getRegistrations()
      .then((regs) => {
        for (const reg of regs) {
          if (reg.active?.scriptURL?.includes('dev-sw')) {
            void reg.unregister();
          }
        }
      })
      .catch(() => {
        // ignore SW cleanup failure
      });
  }
}

createRoot(document.getElementById('root')!).render(<App />);

import { useState, useEffect } from 'react';

interface ServiceWorkerUpdate {
  waiting: ServiceWorker | null;
  updateAvailable: boolean;
  updateServiceWorker: () => void;
  skipWaiting: () => void;
}

export function useServiceWorker(): ServiceWorkerUpdate {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    let registration: ServiceWorkerRegistration | null = null;

    const handleUpdateFound = () => {
      const installingWorker = registration?.installing;
      if (!installingWorker) return;

      installingWorker.addEventListener('statechange', () => {
        if (installingWorker.state === 'installed') {
          if (navigator.serviceWorker.controller) {
            // New content is available, show update notification
            setWaiting(installingWorker);
            setUpdateAvailable(true);
          } else {
            // Content is cached for the first time
            console.log('Content is cached for the first time');
          }
        }
      });
    };

    const handleControllerChange = () => {
      // Service worker has taken control, reload the page
      window.location.reload();
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'MANIFEST_UPDATED') {
        // Manifest has been updated, check for service worker updates
        if (registration) {
          registration.update();
        }
      }
    };

    // Register service worker (allow in development for notification testing)
    if (true) { // Always register for notification testing
      navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        registration = reg;
        
        // Check for updates immediately
        reg.update();
        
        // Listen for updates
        reg.addEventListener('updatefound', handleUpdateFound);
        
        // Listen for controller changes
        navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
        
        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', handleMessage);
      })
      .catch((error) => {
        console.error('Service worker registration failed:', error);
      });
    }

    return () => {
      if (registration) {
        registration.removeEventListener('updatefound', handleUpdateFound);
      }
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, []);

  const updateServiceWorker = () => {
    if (waiting) {
      waiting.postMessage({ type: 'SKIP_WAITING' });
      setWaiting(null);
      setUpdateAvailable(false);
    }
  };

  const skipWaiting = () => {
    if (waiting) {
      waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  return {
    waiting,
    updateAvailable,
    updateServiceWorker,
    skipWaiting,
  };
}

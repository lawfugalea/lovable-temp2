import React, { useState } from 'react';
import { Button } from './ui/Button';
import { RefreshCw, X, Smartphone } from 'lucide-react';
import { useServiceWorker } from '@/hooks/useServiceWorker';

export default function UpdateNotification() {
  const { updateAvailable, updateServiceWorker } = useServiceWorker();
  const [dismissed, setDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  React.useEffect(() => {
    // Check if running on iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);
  }, []);

  if (!updateAvailable || dismissed) {
    return null;
  }

  const handleUpdate = () => {
    if (isIOS) {
      // For iOS, we need to guide users to refresh manually
      // as automatic updates don't work the same way
      window.location.reload();
    } else {
      updateServiceWorker();
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    // Store dismissal in localStorage to prevent showing again for this session
    localStorage.setItem('update-dismissed', Date.now().toString());
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto">
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <RefreshCw className="w-5 h-5 text-green-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 mb-1">
              {isIOS ? 'Update Available' : 'App Update Available'}
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              {isIOS 
                ? 'A new version of the app is available. Tap refresh to get the latest updates.'
                : 'A new version of the app is available. Update now to get the latest features.'
              }
            </p>
            <div className="flex gap-2">
              <Button
                onClick={handleUpdate}
                className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-2"
              >
                {isIOS ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Refresh
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Update
                  </>
                )}
              </Button>
              <button
                onClick={handleDismiss}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Later
              </button>
            </div>
            {isIOS && (
              <div className="mt-2 p-2 bg-blue-50 rounded-md">
                <div className="flex items-center gap-2 text-xs text-blue-700">
                  <Smartphone className="w-3 h-3" />
                  <span>Tip: You can also close and reopen the app to get updates</span>
                </div>
              </div>
            )}
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

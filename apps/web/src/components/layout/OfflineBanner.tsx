import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { WifiOff, RefreshCw } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  const { t } = useTranslation();
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-orange text-ink px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 shadow-xs"
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>{t('hospitalDashboard.syncPaused')}</span>
      <span className="opacity-75">• Waiting for network…</span>
      <RefreshCw className="w-3 h-3 animate-spin shrink-0 ml-1" />
    </div>
  );
};

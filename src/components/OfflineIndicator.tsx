import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div
      role="status"
      className="pointer-events-none fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg border border-amber-400/40 bg-zinc-950/90 px-3 py-1.5 text-xs font-medium text-amber-300 shadow-lg"
    >
      <WifiOff className="h-3.5 w-3.5 shrink-0 text-amber-400" />
      <span>Çevrimdışı Mod · Önbellekten çalışıyor</span>
    </div>
  );
};

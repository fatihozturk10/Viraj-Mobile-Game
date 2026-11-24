import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } =
    usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="flex min-h-[44px] items-center gap-2 rounded-lg border border-white/15 bg-zinc-950/80 px-3.5 py-2 text-xs font-semibold text-zinc-100 transition-colors hover:bg-zinc-900 focus-visible:outline-2 focus-visible:outline-amber-400 whitespace-nowrap shrink-0 cursor-pointer"
      >
        {isInstallable ? (
          <Download className="h-4 w-4 text-amber-400" />
        ) : (
          <Smartphone className="h-4 w-4 text-amber-400" />
        )}
        <span>Telefona Yükle</span>
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-zinc-950 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-lg font-bold text-white">
                {isIOS
                  ? 'iPhone / iPad Ana Ekrana Ekle'
                  : isAndroid
                    ? 'Android Telefona Uygulama Olarak Kur'
                    : 'Telefona Uygulama Olarak Kur'}
              </h3>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="Kapat"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-900 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {isIOS ? (
              <ol className="mt-3 space-y-2 text-sm text-zinc-300">
                <li>1. Safari alt çubuğundaki Paylaş simgesine dokun.</li>
                <li>2. Aşağı kaydırıp Ana Ekrana Ekle seçeneğini seç.</li>
                <li>3. Sağ üstten Ekle butonuna dokunarak tam ekran başlat.</li>
              </ol>
            ) : (
              <ol className="mt-3 space-y-2 text-sm text-zinc-300">
                <li>
                  1. Bu sayfayı Android telefonunda <strong>Chrome</strong> ile aç.
                </li>
                <li>
                  2. Sağ üstteki üç nokta menüsünden{' '}
                  <strong>Uygulamayı yükle</strong> veya{' '}
                  <strong>Ana ekrana ekle</strong> seçeneğine dokun.
                </li>
                <li>
                  3. Oyun telefonuna tam ekran uygulama olarak kurulur ve çevrimdışı da çalışır.
                </li>
              </ol>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-5 flex min-h-[44px] w-full items-center justify-center rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-zinc-950 hover:bg-amber-400 cursor-pointer"
            >
              Anladım
            </button>
          </div>
        </div>
      )}
    </>
  );
};

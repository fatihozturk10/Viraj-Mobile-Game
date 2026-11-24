import React, { useCallback, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  Calendar,
  CarFront,
  Crown,
  LogIn,
  LogOut,
  RefreshCw,
  Trophy,
  X,
} from 'lucide-react';
import {
  fetchLeaderboard,
  LeaderboardEntry,
  LeaderboardPeriod,
  signInWithGoogle,
  signOutUser,
} from '../services/leaderboardService';
import { CAR_MODELS, getDriverRankTier } from '../types/game';
import { DriverLevelEmblem } from './DriverLevelEmblem';

interface LeaderboardModalProps {
  open: boolean;
  currentUser: User | null;
  onClose: () => void;
}

function getCarDisplayName(carId: string): string {
  return CAR_MODELS.find((m) => m.id === carId)?.name ?? 'Tofaş Doğan SLX';
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = React.memo(
  ({ open, currentUser, onClose }) => {
  const [period, setPeriod] = useState<LeaderboardPeriod>('daily');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [dayKey, setDayKey] = useState('');
  const [fromCloud, setFromCloud] = useState(true);
  const [loading, setLoading] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadBoard = useCallback(async (targetPeriod: LeaderboardPeriod) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetchLeaderboard(targetPeriod);
      setEntries(res.entries);
      setDayKey(res.dayKey);
      setFromCloud(res.fromCloud);
    } catch {
      setErrorMsg('Liderlik tablosu yüklenirken bir sorun oluştu.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void loadBoard(period);
  }, [open, period, currentUser, loadBoard]);

  if (!open) return null;

  const handleGoogleLogin = async () => {
    setAuthBusy(true);
    setErrorMsg(null);
    try {
      await signInWithGoogle();
    } catch {
      setErrorMsg('Google ile giriş yapılamadı. Lütfen tekrar deneyin.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = async () => {
    setAuthBusy(true);
    try {
      await signOutUser();
    } finally {
      setAuthBusy(false);
    }
  };

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      className="pointer-events-auto fixed inset-0 z-40 flex items-end justify-center bg-black/80 p-0 sm:items-center sm:p-4"
    >
      <div
        className="animate-sheet-up flex max-h-[90dvh] w-full flex-col rounded-t-3xl border-t border-white/15 bg-zinc-950 px-5 pt-3 shadow-2xl sm:max-h-[86vh] sm:w-[min(95vw,620px)] sm:rounded-2xl sm:border sm:p-5"
        style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
      >
        {/* Mobile grab handle */}
        <div className="mb-2 flex justify-center sm:hidden">
          <span className="h-1 w-10 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3.5">
          <div>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-400" />
              <h2 className="font-display text-xl font-extrabold text-white">
                Liderlik Tablosu
              </h2>
            </div>
            <p className="mt-0.5 text-xs text-zinc-400">
              {period === 'daily'
                ? `Bugünün en yüksek skorları (${dayKey || 'Günlük'})`
                : 'Tüm zamanların en iyi otoyol pilotları'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadBoard(period)}
              disabled={loading}
              aria-label="Yenile"
              title="Tabloyu Yenile"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-zinc-900 text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white cursor-pointer disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
              />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Kapat"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-zinc-900 text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Account Banner */}
        <div className="mt-3 flex flex-col gap-2.5 rounded-xl border border-white/10 bg-zinc-900/80 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between">
          {currentUser ? (
            <>
              <div className="min-w-0">
                <div className="text-xs font-bold text-emerald-300">
                  Küresel Sıralamaya Bağlı
                </div>
                <div className="truncate text-xs text-zinc-300">
                  {currentUser.displayName || 'Sürücü'} · Skorların otomatik
                  gönderilir
                </div>
              </div>
              <button
                type="button"
                onClick={() => void handleLogout()}
                disabled={authBusy}
                className="flex h-10 sm:h-9 items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-zinc-950 px-3.5 text-xs font-bold text-zinc-200 transition-colors hover:bg-zinc-800 hover:text-white cursor-pointer shrink-0"
              >
                <LogOut className="h-4 w-4" />
                <span>Çıkış Yap</span>
              </button>
            </>
          ) : (
            <>
              <div className="min-w-0">
                <div className="text-xs font-bold text-amber-300">
                  Skorunu Dünya Sıralamasına Yaz
                </div>
                <div className="text-xs text-zinc-400">
                  Yerel skorun görünür; küresel sıralama için Google ile giriş yap.
                </div>
              </div>
              <button
                type="button"
                onClick={() => void handleGoogleLogin()}
                disabled={authBusy}
                className="flex h-11 sm:h-10 items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-4 text-xs sm:text-sm font-extrabold text-zinc-950 transition-colors hover:bg-amber-400 cursor-pointer shrink-0 disabled:opacity-60"
              >
                <LogIn className="h-4 w-4" />
                <span>{authBusy ? 'Bağlanıyor...' : 'Google ile Bağlan'}</span>
              </button>
            </>
          )}
        </div>

        {/* Period Tabs */}
        <div className="mt-3 flex items-center gap-1.5 rounded-xl bg-zinc-900 p-1">
          <button
            type="button"
            onClick={() => setPeriod('daily')}
            className={`flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
              period === 'daily'
                ? 'bg-amber-500 text-zinc-950'
                : 'text-zinc-300 hover:text-white'
            }`}
          >
            <Calendar className="h-4 w-4" />
            <span>Günlük</span>
          </button>
          <button
            type="button"
            onClick={() => setPeriod('alltime')}
            className={`flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
              period === 'alltime'
                ? 'bg-amber-500 text-zinc-950'
                : 'text-zinc-300 hover:text-white'
            }`}
          >
            <Crown className="h-4 w-4" />
            <span>Tüm Zamanlar</span>
          </button>
        </div>

        {errorMsg && (
          <div className="mt-2.5 rounded-lg border border-rose-500/35 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
            {errorMsg}
          </div>
        )}

        {!fromCloud && !loading && (
          <div className="mt-2.5 rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-1.5 text-[11px] text-amber-200">
            Çevrimdışı görünüm — yalnızca bu cihazdaki skorlar gösteriliyor.
          </div>
        )}

        {/* Ranked List */}
        <div className="mt-3 flex-1 space-y-2 overflow-y-auto pr-1 custom-scroll">
          {loading ? (
            <div className="flex h-40 items-center justify-center text-sm text-zinc-400">
              Sıralama yükleniyor...
            </div>
          ) : entries.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-zinc-900/50 p-6 text-center">
              <Trophy className="h-7 w-7 text-zinc-600" />
              <div className="text-sm font-semibold text-zinc-300">
                Henüz kayıtlı skor yok
              </div>
              <div className="text-xs text-zinc-500">
                {period === 'daily'
                  ? 'Bugün ilk sürüşünü tamamlayıp liderliği al!'
                  : 'İlk sürüşünü tamamla ve zirveye yerleş!'}
              </div>
            </div>
          ) : (
            entries.map((entry, idx) => {
              const rank = idx + 1;
              const isSelf =
                (currentUser && entry.uid === currentUser.uid) ||
                entry.uid === 'local_driver';
              const rankStyle =
                rank === 1
                  ? 'border-amber-400/60 bg-amber-500/15 text-amber-300'
                  : rank === 2
                    ? 'border-zinc-300/45 bg-zinc-300/10 text-zinc-200'
                    : rank === 3
                      ? 'border-orange-500/45 bg-orange-500/10 text-orange-300'
                      : 'border-white/10 bg-zinc-900 text-zinc-400';

              return (
                <div
                  key={`${entry.uid}-${idx}`}
                  className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-3 ${
                    isSelf
                      ? 'border-sky-400/50 bg-sky-500/10'
                      : 'border-white/10 bg-zinc-900/80'
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-xl border font-display text-sm font-extrabold font-mono-num shrink-0 ${rankStyle}`}
                    >
                      #{rank}
                    </span>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate font-display text-sm font-bold text-white">
                          {entry.displayName}
                        </span>
                        {isSelf && (
                          <span className="rounded bg-sky-500/20 px-1.5 py-0.5 text-[10px] font-bold text-sky-300">
                            SEN
                          </span>
                        )}
                        <span className="inline-flex items-center overflow-hidden rounded border border-white/20 bg-zinc-100 text-[9px] font-extrabold text-zinc-950">
                          <span className="bg-blue-700 px-1 py-0.5 text-white">
                            TR
                          </span>
                          <span className="px-1.5 py-0.5 uppercase tracking-wide">
                            {entry.plate}
                          </span>
                        </span>
                      </div>

                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-zinc-400">
                        <span className="inline-flex items-center gap-1">
                          <CarFront className="h-3 w-3 text-amber-400" />
                          <span>{getCarDisplayName(entry.carModel)}</span>
                        </span>
                        <span>·</span>
                        <span className="font-mono-num">
                          {formatDistance(entry.distanceMeters)}
                        </span>
                        <span>·</span>
                        {(() => {
                          const entryTier = getDriverRankTier(entry.playerLevel);
                          return (
                            <span
                              className={`inline-flex items-center gap-1 font-semibold ${entryTier.textClass}`}
                            >
                              <DriverLevelEmblem
                                level={entry.playerLevel}
                                size="xs"
                                showNumber={false}
                              />
                              <span className="font-mono-num">
                                Sv. {entry.playerLevel}
                              </span>
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-display text-base font-extrabold text-amber-400 font-mono-num">
                      {entry.score.toLocaleString('tr-TR')}
                    </div>
                    {entry.driftTotal > 0 && (
                      <div className="text-[10px] text-zinc-400 font-mono-num">
                        Drift +{entry.driftTotal.toLocaleString('tr-TR')}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
});

LeaderboardModal.displayName = 'LeaderboardModal';

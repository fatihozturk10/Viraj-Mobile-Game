import React, { useEffect, useState } from 'react';
import {
  Award,
  Box,
  CheckCircle2,
  Coins,
  Flame,
  Gift,
  PlayCircle,
  Sparkles,
  X,
} from 'lucide-react';
import {
  adManager,
  DAILY_STREAK_REWARDS,
  DAILY_WHEEL_SLICES,
  WheelSlice,
} from '../services/adManager';

export interface DailyStreakView {
  availableToday: boolean;
  activeStreakCount: number;
  nextDay: number;
  nextRewardGold: number;
}

interface DailyWheelModalProps {
  open: boolean;
  freeAvailable: boolean;
  extraAdAvailable: boolean;
  streakStatus: DailyStreakView;
  onSpinFree: () => number; // returns winning slice index
  onWatchAdForExtraSpin: (onGranted: () => void) => void;
  onClaimSlice: (slice: WheelSlice) => void;
  onClaimStreakFree: () => void;
  onWatchAdDoubleStreak: (day: number, baseAmount: number) => void;
  onClose: () => void;
}

const SLICE_COUNT = DAILY_WHEEL_SLICES.length;
const SLICE_DEG = 360 / SLICE_COUNT;

export const DailyWheelModal: React.FC<DailyWheelModalProps> = React.memo(
  ({
    open,
    freeAvailable,
    extraAdAvailable,
    streakStatus,
    onSpinFree,
    onWatchAdForExtraSpin,
    onClaimSlice,
    onClaimStreakFree,
    onWatchAdDoubleStreak,
    onClose,
  }) => {
  const [activeTab, setActiveTab] = useState<'streak' | 'wheel'>('streak');
  const [rotationDeg, setRotationDeg] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [wonSlice, setWonSlice] = useState<WheelSlice | null>(null);

  useEffect(() => {
    if (!open) {
      setSpinning(false);
      setWonSlice(null);
    } else {
      setActiveTab(streakStatus.availableToday ? 'streak' : 'wheel');
    }
  }, [open, streakStatus.availableToday]);

  if (!open) return null;

  const conicGradient = DAILY_WHEEL_SLICES.map((slice, i) => {
    const start = i * SLICE_DEG;
    const end = (i + 1) * SLICE_DEG;
    return `${slice.color} ${start}deg ${end}deg`;
  }).join(', ');

  const startSpin = (targetIdx: number) => {
    if (spinning) return;
    setSpinning(true);
    setWonSlice(null);
    const slice = DAILY_WHEEL_SLICES[targetIdx];
    const centerAngle = targetIdx * SLICE_DEG + SLICE_DEG / 2;
    const jitter = (Math.random() - 0.5) * (SLICE_DEG * 0.45);
    const currentMod = rotationDeg % 360;
    const desiredMod = (360 - centerAngle + jitter + 360) % 360;
    const deltaMod = (desiredMod - currentMod + 360) % 360;
    const nextRot = rotationDeg + 360 * 5 + deltaMod;
    setRotationDeg(nextRot);

    window.setTimeout(() => {
      setSpinning(false);
      setWonSlice(slice);
      onClaimSlice(slice);
    }, 3400);
  };

  const handleFreeSpinClick = () => {
    if (!freeAvailable || spinning) return;
    const idx = onSpinFree();
    startSpin(idx);
  };

  const handleExtraAdClick = () => {
    if (!extraAdAvailable || spinning) return;
    onWatchAdForExtraSpin(() => {
      startSpin(adManager.pickRandomWheelSlice());
    });
  };

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      className="pointer-events-auto fixed inset-0 z-40 flex items-end justify-center bg-black/84 p-0 sm:items-center sm:p-4"
    >
      <div
        className="animate-sheet-up ug-sheet flex max-h-[90dvh] w-full flex-col overflow-y-auto custom-scroll rounded-t-2xl border-t px-5 pt-3.5 sm:ug-cut sm:max-h-[88vh] sm:w-[min(94vw,470px)] sm:rounded-none sm:border sm:p-5"
        style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
      >
        {/* Mobile grab handle */}
        <div className="mb-2 flex justify-center sm:hidden">
          <span className="h-1 w-10 rounded-full bg-orange-400/45" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3.5">
          <div>
            <div className="font-display text-[10px] font-bold tracking-[0.18em] text-orange-400 uppercase">
              UNDERGROUND // İKMAL
            </div>
            <div className="mt-0.5 flex items-center gap-2">
              <Gift className="h-5 w-5 text-orange-400" />
              <h2 className="font-display italic text-xl font-extrabold uppercase tracking-wide text-white">
                Günlük Ödüller &amp; Çark
              </h2>
            </div>
            <p className="mt-1 text-xs text-zinc-400">
              Her gün giriş yaparak seriyi büyüt, çarktan altın, XP ve Sokak Kasası kap
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={spinning}
            aria-label="Kapat"
            className="ug-cut-sm ug-btn-metal flex h-11 w-11 items-center justify-center cursor-pointer disabled:opacity-40 shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Clean 2-Tab Switcher */}
        <div className="ug-cut-sm mt-3.5 grid grid-cols-2 gap-1.5 border border-white/10 bg-[#111520] p-1">
          <button
            type="button"
            disabled={spinning}
            onClick={() => setActiveTab('streak')}
            className={`ug-cut-sm flex min-h-[44px] items-center justify-center gap-1.5 px-3 font-display italic text-xs sm:text-sm font-extrabold uppercase tracking-wide transition-all cursor-pointer disabled:opacity-50 ${
              activeTab === 'streak'
                ? 'ug-tab-active'
                : 'text-zinc-300 hover:text-white'
            }`}
          >
            <Flame className="h-4 w-4 shrink-0" />
            <span>
              7 Günlük Seri{streakStatus.availableToday ? ' · Hazır' : ''}
            </span>
          </button>
          <button
            type="button"
            disabled={spinning}
            onClick={() => setActiveTab('wheel')}
            className={`ug-cut-sm flex min-h-[44px] items-center justify-center gap-1.5 px-3 font-display italic text-xs sm:text-sm font-extrabold uppercase tracking-wide transition-all cursor-pointer disabled:opacity-50 ${
              activeTab === 'wheel'
                ? 'ug-tab-active'
                : 'text-zinc-300 hover:text-white'
            }`}
          >
            <Gift className="h-4 w-4 shrink-0" />
            <span>Ödül Çarkı{freeAvailable ? ' · Hazır' : ''}</span>
          </button>
        </div>

        {activeTab === 'streak' ? (
          <div className="mt-4 flex flex-col gap-3">
            <div className="ug-cut-sm ug-card flex items-center justify-between px-3.5 py-2.5">
              <div>
                <div className="font-display text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  Mevcut Seri
                </div>
                <div className="font-display italic text-lg font-extrabold text-white font-mono-num">
                  {streakStatus.activeStreakCount} / 7 GÜN
                </div>
              </div>
              <div className="text-right">
                <div className="font-display text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  {streakStatus.availableToday ? 'Bugünkü Ödül' : 'Yarınki Ödül'}
                </div>
                <div className="font-display italic text-base font-extrabold text-amber-300 font-mono-num">
                  +{streakStatus.nextRewardGold} Altın
                </div>
              </div>
            </div>

            {/* 7-Day Grid */}
            <div className="grid grid-cols-4 gap-2">
              {DAILY_STREAK_REWARDS.map((rewardGold, idx) => {
                const day = idx + 1;
                const isClaimed = day <= streakStatus.activeStreakCount;
                const isTodayClaimable =
                  streakStatus.availableToday && day === streakStatus.nextDay;
                const isGrandDay = day === 7;
                return (
                  <div
                    key={day}
                    className={`ug-cut-sm flex flex-col items-center justify-between border p-3 text-center ${
                      isGrandDay ? 'col-span-2' : ''
                    } ${
                      isTodayClaimable
                        ? 'border-orange-400 bg-orange-500/16 shadow-[0_0_16px_rgba(249,115,22,0.2)]'
                        : isClaimed
                          ? 'border-emerald-400/35 bg-emerald-500/10'
                          : 'ug-card'
                    }`}
                  >
                    <span
                      className={`font-display text-xs font-bold uppercase ${
                        isTodayClaimable
                          ? 'text-orange-300'
                          : isClaimed
                            ? 'text-emerald-300'
                            : 'text-zinc-400'
                      }`}
                    >
                      {day}. Gün
                    </span>
                    <div className="my-1.5 flex items-center justify-center gap-1 font-display text-base font-extrabold text-white font-mono-num">
                      {isClaimed ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <Coins
                          className={`h-4 w-4 ${
                            isGrandDay ? 'text-amber-300' : 'text-amber-400'
                          }`}
                        />
                      )}
                      <span>+{rewardGold}</span>
                    </div>
                    <span className="font-display text-[10.5px] font-bold uppercase tracking-wide text-zinc-400">
                      {isClaimed
                        ? 'Alındı'
                        : isTodayClaimable
                          ? 'Bugün'
                          : isGrandDay
                            ? 'Büyük Kasa'
                            : 'Kilitli'}
                    </span>
                  </div>
                );
              })}
            </div>

            {streakStatus.availableToday ? (
              <div className="mt-1 flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={onClaimStreakFree}
                  className="ug-cut ug-btn-fire flex min-h-[50px] w-full items-center justify-center gap-2 px-5 font-display italic text-sm sm:text-base font-extrabold uppercase tracking-wider cursor-pointer"
                >
                  <Coins className="h-4 w-4" />
                  <span>
                    {streakStatus.nextDay}. Gün Ödülünü Al (+
                    {streakStatus.nextRewardGold} Altın)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onWatchAdDoubleStreak(
                      streakStatus.nextDay,
                      streakStatus.nextRewardGold,
                    )
                  }
                  className="ug-cut-sm flex min-h-[50px] w-full items-center justify-center gap-2 border border-sky-400/50 bg-sky-500/18 px-5 font-display italic text-sm font-bold uppercase tracking-wide text-sky-200 transition-colors hover:bg-sky-500/28 cursor-pointer"
                >
                  <PlayCircle className="h-4 w-4 text-sky-400" />
                  <span>
                    Reklam İzle · 2× Al (+{streakStatus.nextRewardGold * 2}{' '}
                    Altın)
                  </span>
                </button>
              </div>
            ) : (
              <div className="ug-cut-sm flex min-h-[48px] items-center justify-center gap-2 border border-emerald-400/30 bg-emerald-500/10 px-4 font-display text-sm font-bold uppercase text-emerald-300">
                <CheckCircle2 className="h-4 w-4" />
                <span>Bugünün seri ödülü alındı. Yarın devam et!</span>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Wheel Stage */}
            <div className="relative my-5 flex flex-col items-center justify-center">
              <div
                aria-hidden="true"
                className="z-20 -mb-2.5 h-0 w-0 border-x-[11px] border-t-[18px] border-x-transparent border-t-orange-400 drop-shadow-md"
              />

              <div className="relative h-60 w-60 rounded-full border-4 border-orange-500/80 p-1 shadow-[0_0_32px_rgba(234,88,12,0.3)] sm:h-68 sm:w-68">
                <div
                  className="relative h-full w-full overflow-hidden rounded-full transition-transform duration-[3300ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
                  style={{
                    background: `conic-gradient(${conicGradient})`,
                    transform: `rotate(${rotationDeg}deg)`,
                  }}
                >
                  {DAILY_WHEEL_SLICES.map((slice, i) => {
                    const angle = i * SLICE_DEG + SLICE_DEG / 2;
                    return (
                      <div
                        key={slice.id}
                        className="pointer-events-none absolute inset-0 flex justify-center pt-4"
                        style={{
                          transform: `rotate(${angle}deg)`,
                        }}
                      >
                        <span className="max-w-[76px] text-center font-display text-[11px] leading-tight font-extrabold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]">
                          {slice.shortLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="pointer-events-none absolute top-1/2 left-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-orange-400 bg-[#0b0d14] shadow-lg">
                  <Sparkles className="h-6 w-6 text-orange-400" />
                </div>
              </div>
            </div>

            {wonSlice && (
              <div className="ug-cut-sm mb-4 flex items-center justify-between gap-3 border border-emerald-400/45 bg-emerald-500/12 px-4 py-3">
                <div className="flex items-center gap-2.5">
                  {wonSlice.kind === 'gold' ? (
                    <Coins className="h-5 w-5 text-amber-400 shrink-0" />
                  ) : wonSlice.kind === 'crate' ? (
                    <Box className="h-5 w-5 text-orange-400 shrink-0" />
                  ) : (
                    <Award className="h-5 w-5 text-sky-400 shrink-0" />
                  )}
                  <div>
                    <div className="font-display text-xs font-bold uppercase text-emerald-300">
                      {wonSlice.kind === 'crate'
                        ? 'Kasa Kazandın! Açılış Başlıyor...'
                        : 'Ödül Hesabına Eklendi!'}
                    </div>
                    <div className="font-display italic text-base font-extrabold text-white">
                      {wonSlice.label}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2.5">
              {freeAvailable ? (
                <button
                  type="button"
                  onClick={handleFreeSpinClick}
                  disabled={spinning}
                  className="ug-cut ug-btn-fire flex min-h-[52px] w-full items-center justify-center gap-2 px-5 py-2.5 font-display italic text-base font-extrabold uppercase tracking-wider cursor-pointer disabled:opacity-50"
                >
                  <Gift className="h-5 w-5" />
                  <span>
                    {spinning
                      ? 'Çark Dönüyor...'
                      : 'Ücretsiz Çevir · Günlük Hediye'}
                  </span>
                </button>
              ) : (
                <div className="ug-cut-sm ug-card flex min-h-[46px] items-center justify-center px-4 font-display text-sm font-bold uppercase text-zinc-400">
                  Bugünün ücretsiz çark hakkı kullanıldı
                </div>
              )}

              {!freeAvailable && extraAdAvailable && (
                <button
                  type="button"
                  onClick={handleExtraAdClick}
                  disabled={spinning}
                  className="ug-cut-sm flex min-h-[50px] w-full items-center justify-center gap-2 border border-sky-400/45 bg-sky-500/15 px-5 py-2.5 font-display italic text-sm sm:text-base font-bold uppercase tracking-wide text-sky-200 transition-colors hover:bg-sky-500/25 cursor-pointer disabled:opacity-50"
                >
                  <PlayCircle className="h-5 w-5 text-sky-400" />
                  <span>Reklam İzle · Ekstra Çevirme</span>
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
});

DailyWheelModal.displayName = 'DailyWheelModal';

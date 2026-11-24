import React, { useEffect, useState } from 'react';
import {
  CarFront,
  CheckCircle2,
  Coins,
  Crown,
  Flame,
  Gift,
  HeartPulse,
  ShieldCheck,
  Sparkles,
  Tv,
  X,
} from 'lucide-react';
import {
  AD_FREE_PRICE_LABEL,
  RewardedAdPlacement,
} from '../services/adManager';

export type ActiveAdSession =
  | { type: 'rewarded'; placement: RewardedAdPlacement }
  | { type: 'interstitial'; actionLabel: string };

interface AdOverlayModalProps {
  session: ActiveAdSession | null;
  iapModalOpen: boolean;
  adFreePurchased: boolean;
  onCompleteRewarded: (placement: RewardedAdPlacement) => void;
  onCancelRewarded: () => void;
  onCloseInterstitial: () => void;
  onOpenIapFromInterstitial: () => void;
  onConfirmPurchaseAdFree: () => void;
  onCloseIap: () => void;
}

const SPONSOR_CARDS = [
  {
    brand: 'APEX TURBO YAĞLARI',
    headline: 'Yüksek Devirde Tam Koruma',
    sub: 'Sürüş performansını zirveye taşıyan tam sentetik formül.',
    accent: 'text-amber-400',
    badge: 'Sponsorlu Tanıtım',
  },
  {
    brand: 'MARMARA LASTİK',
    headline: 'Keskin Virajlarda Maksimum Tutuş',
    sub: 'Islak ve kuru asfaltta üstün yol hakimiyeti.',
    accent: 'text-sky-400',
    badge: 'Otomotiv Ortağı',
  },
  {
    brand: 'ANADOLU OTO AKSESUAR',
    headline: 'Özel Tasarım Jant & Aero Kitler',
    sub: 'Garajındaki her aracı pist canavarına dönüştür.',
    accent: 'text-emerald-400',
    badge: 'Video Reklam',
  },
];

function describeReward(placement: RewardedAdPlacement): {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
} {
  switch (placement.kind) {
    case 'double_run_gold':
      return {
        title: `Altınları 2× Yap (+${placement.amount} Altın)`,
        subtitle: 'Bu koşuda topladığın altınlar iki katına çıkacak.',
        icon: <Coins className="h-5 w-5 text-amber-400" />,
      };
    case 'crash_revive':
      return {
        title: 'Kaldığın Yerden Devam Et',
        subtitle: 'Araç tamir edilecek ve kısa koruma kalkanı ile süreceksin.',
        icon: <HeartPulse className="h-5 w-5 text-emerald-400" />,
      };
    case 'daily_wheel_extra':
      return {
        title: 'Ekstra Günlük Çark Hakkı',
        subtitle: 'Reklam sonrası çarkı bir kez daha ücretsiz çevirebilirsin.',
        icon: <Gift className="h-5 w-5 text-sky-400" />,
      };
    case 'daily_streak_double':
      return {
        title: `${placement.day}. Gün Serisi 2× (+${placement.amount * 2} Altın)`,
        subtitle: 'Günlük giriş seri ödülünü iki katına çıkar!',
        icon: <Flame className="h-5 w-5 text-amber-400" />,
      };
    case 'rent_car':
      return {
        title: `${placement.carName} · Test Sürüşü`,
        subtitle: 'Bu süper aracı 1 tam sürüş boyunca ücretsiz kullan!',
        icon: <CarFront className="h-5 w-5 text-amber-400" />,
      };
    case 'upgrade_topup':
      return {
        title: `+${placement.amount} Altın Tamamla`,
        subtitle: `${placement.targetLabel} için gereken altına destek.`,
        icon: <Coins className="h-5 w-5 text-amber-400" />,
      };
  }
}

export const AdOverlayModal: React.FC<AdOverlayModalProps> = React.memo(
  ({
    session,
    iapModalOpen,
    adFreePurchased,
    onCompleteRewarded,
    onCancelRewarded,
    onCloseInterstitial,
    onOpenIapFromInterstitial,
    onConfirmPurchaseAdFree,
    onCloseIap,
  }) => {
  const [secondsLeft, setSecondsLeft] = useState(5);
  const [cardIndex, setCardIndex] = useState(0);

  useEffect(() => {
    if (!session) return;
    const duration = session.type === 'rewarded' ? 5 : 3;
    setSecondsLeft(duration);
    setCardIndex(Math.floor(Math.random() * SPONSOR_CARDS.length));
  }, [session]);

  useEffect(() => {
    if (!session || secondsLeft <= 0) return;
    const id = window.setTimeout(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearTimeout(id);
  }, [session, secondsLeft]);

  const sponsor = SPONSOR_CARDS[cardIndex] || SPONSOR_CARDS[0];

  if (iapModalOpen) {
    return (
      <div
        onPointerDown={(e) => e.stopPropagation()}
        className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/82 p-4"
      >
        <div className="flex w-[min(94vw,430px)] flex-col rounded-2xl border border-amber-400/35 bg-zinc-950 p-5 shadow-2xl">
          <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                <Crown className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-lg font-extrabold text-white">
                  Reklamsız Paket
                </h2>
                <p className="text-xs text-zinc-400">
                  Tek seferlik satın alma · Kalıcı ayrıcalık
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onCloseIap}
              aria-label="Kapat"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 space-y-2.5 text-xs text-zinc-300">
            <div className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-zinc-900/75 p-3">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-white">
                  Zorunlu Geçiş Reklamları Kalkar:
                </span>{' '}
                Koşular ve menü geçişleri tamamen kesintisiz hale gelir.
              </div>
            </div>
            <div className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-zinc-900/75 p-3">
              <Sparkles className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-white">
                  Ödüllü Reklamlar İsteğe Bağlı Kalır:
                </span>{' '}
                2× altın, kaza sonrası devam etme, ekstra çark ve altın tamamlama
                seçeneklerini dilediğinde kullanmaya devam edebilirsin.
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2">
            {adFreePurchased ? (
              <div className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-4 text-sm font-bold text-emerald-300">
                <CheckCircle2 className="h-4 w-4" />
                <span>Reklamsız Paket Aktif</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={onConfirmPurchaseAdFree}
                className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 font-display text-sm font-bold text-zinc-950 transition-colors hover:bg-amber-400 cursor-pointer"
              >
                <Crown className="h-4 w-4" />
                <span>Tek Seferlik Satın Al · {AD_FREE_PRICE_LABEL}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onCloseIap}
              className="flex min-h-[40px] w-full items-center justify-center rounded-xl border border-white/10 bg-zinc-900 px-4 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 cursor-pointer"
            >
              Vazgeç
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const isRewarded = session.type === 'rewarded';
  const rewardInfo = isRewarded ? describeReward(session.placement) : null;
  const totalSec = isRewarded ? 5 : 3;
  const progressPct = Math.round(((totalSec - secondsLeft) / totalSec) * 100);
  const canFinish = secondsLeft <= 0;

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
    >
      <div className="flex w-[min(95vw,460px)] flex-col overflow-hidden rounded-2xl border border-white/15 bg-zinc-950 shadow-2xl">
        {/* Top Ad Status Bar */}
        <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-zinc-900 px-4 py-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
            <Tv className="h-4 w-4 text-amber-400" />
            <span>
              {isRewarded ? 'Ödüllü Video Reklam' : 'Tam Ekran Geçiş Reklamı'}
            </span>
          </div>

          {isRewarded ? (
            canFinish ? (
              <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
                Ödül Hazır
              </span>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono-num text-amber-300">
                  {secondsLeft} sn
                </span>
                <button
                  type="button"
                  onClick={onCancelRewarded}
                  title="Erken kapatırsan ödül verilmez"
                  className="rounded-md border border-white/15 px-2 py-1 text-[11px] text-zinc-400 hover:text-white cursor-pointer"
                >
                  Atla (Ödül Yok)
                </button>
              </div>
            )
          ) : canFinish ? (
            <button
              type="button"
              onClick={onCloseInterstitial}
              className="flex items-center gap-1 rounded-lg bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-950 hover:bg-white cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
              <span>Kapat</span>
            </button>
          ) : (
            <span className="rounded-md border border-white/15 px-2.5 py-1 text-xs font-mono-num text-zinc-300">
              Geç: {secondsLeft} sn
            </span>
          )}
        </div>

        {/* Simulated Sponsor Creative Area */}
        <div className="relative flex flex-col items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900 px-6 py-9 text-center">
          <span className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            {sponsor.badge}
          </span>
          <div
            className={`mt-4 font-display text-2xl font-extrabold tracking-tight ${sponsor.accent}`}
          >
            {sponsor.brand}
          </div>
          <div className="mt-1.5 font-display text-base font-bold text-white">
            {sponsor.headline}
          </div>
          <p className="mt-1 max-w-xs text-xs text-zinc-400">{sponsor.sub}</p>

          <div className="mt-6 w-full max-w-xs">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-amber-400 transition-[width] duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Bottom Reward Claim or IAP Upsell */}
        <div className="border-t border-white/10 bg-zinc-900/70 p-4">
          {isRewarded && rewardInfo ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-zinc-950/75 px-3.5 py-2.5">
                {rewardInfo.icon}
                <div className="min-w-0">
                  <div className="truncate font-display text-sm font-bold text-white">
                    {rewardInfo.title}
                  </div>
                  <div className="text-[11px] text-zinc-400">
                    {rewardInfo.subtitle}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onCompleteRewarded(session.placement)}
                disabled={!canFinish}
                className={`flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl px-5 font-display text-sm font-bold transition-colors ${
                  canFinish
                    ? 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400 cursor-pointer'
                    : 'border border-white/10 bg-zinc-800 text-zinc-400 cursor-not-allowed'
                }`}
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>
                  {canFinish
                    ? 'Ödülü Al ve Devam Et'
                    : `Ödül için ${secondsLeft} sn bekle...`}
                </span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-zinc-400">
                <span className="font-semibold text-zinc-200">
                  Zorunlu reklam görmek istemiyor musun?
                </span>
              </div>
              <button
                type="button"
                onClick={onOpenIapFromInterstitial}
                className="flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg border border-amber-400/45 bg-amber-500/15 px-3.5 py-1.5 text-xs font-bold text-amber-300 transition-colors hover:bg-amber-500/25 cursor-pointer shrink-0"
              >
                <Crown className="h-3.5 w-3.5" />
                <span>Reklamsız Paket · {AD_FREE_PRICE_LABEL}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

AdOverlayModal.displayName = 'AdOverlayModal';

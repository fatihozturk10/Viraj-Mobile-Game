import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  Box,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Coins,
  CreditCard,
  Crown,
  Gem,
  History,
  Info,
  Loader2,
  Lock,
  Package,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Ticket,
  Wallet,
  X,
} from 'lucide-react';
import {
  getBillingModeInfo,
  PaymentMethodId,
  StoreEntitlementState,
} from '../services/billingService';
import { signInWithGoogle } from '../services/leaderboardService';
import {
  BUNDLE_PRODUCTS,
  BundleProductSpec,
  CRATE_PRODUCTS,
  CrateProductSpec,
  CrateTierId,
  DIAMOND_GOLD_EXCHANGE_PACKS,
  DiamondGoldExchangeSpec,
  formatPriceTry,
  GOLD_PACKS,
  GoldPackSpec,
  LootRarity,
  RolledLootItem,
  STORE_GOLD_VAULT_ART,
  StoreCheckoutItem,
} from '../services/storeCatalog';
import { CrateOpeningCeremony } from './CrateOpeningCeremony';
import { ShowcaseBaseCarConfig } from './CrateCarShowcase3D';

export type StoreTabId = 'bundles' | 'crates' | 'gold' | 'history';

export interface StoreFulfillmentOutcome {
  orderId: string;
  title: string;
  rewardSummary: string;
  crateTierId?: CrateTierId;
  crateImageUrl?: string;
  crateTitle?: string;
  lootItems?: RolledLootItem[];
  creditedGoldTotal: number;
  unlockedCarNames: string[];
  adFreeActivated?: boolean;
}

interface StoreModalProps {
  open: boolean;
  initialTab: StoreTabId;
  goldCoins: number;
  diamonds: number;
  adFreePurchased: boolean;
  entitlements: StoreEntitlementState;
  currentUser: User | null;
  onFulfillPurchase: (
    item: StoreCheckoutItem,
    paymentMethod: PaymentMethodId,
  ) => Promise<{
    success: boolean;
    error?: string;
    outcome?: StoreFulfillmentOutcome;
  }>;
  onExchangeDiamondsForGold: (
    diamondCost: number,
    goldAmount: number,
  ) => { ok: boolean; diamonds: number; goldCoins: number };
  onOpenCrateWithDiamonds: (tierId: CrateTierId) => {
    success: boolean;
    error?: string;
    outcome?: StoreFulfillmentOutcome;
  };
  onRedeemPromoCode: (rawCode: string) => Promise<{
    success: boolean;
    error?: string;
    requiresAuth?: boolean;
    outcome?: StoreFulfillmentOutcome;
  }>;
  onRestorePurchases: () => Promise<{
    restoredCount: number;
    restoredAdFree: boolean;
    fromCloud: boolean;
  }>;
  showcaseCar?: ShowcaseBaseCarConfig;
  onOpenGarageFromStore?: () => void;
  onClose: () => void;
}

const RARITY_STYLES: Record<
  LootRarity,
  { label: string; textClass: string; borderClass: string; bgClass: string }
> = {
  common: {
    label: 'Standart',
    textClass: 'text-zinc-300',
    borderClass: 'border-white/12',
    bgClass: 'bg-zinc-900/90',
  },
  rare: {
    label: 'Nadir',
    textClass: 'text-sky-300',
    borderClass: 'border-sky-400/40',
    bgClass: 'bg-sky-500/8',
  },
  epic: {
    label: 'Destansı',
    textClass: 'text-purple-300',
    borderClass: 'border-purple-400/45',
    bgClass: 'bg-purple-500/12',
  },
  legendary: {
    label: 'Efsanevi',
    textClass: 'text-rose-300',
    borderClass: 'border-rose-400/55',
    bgClass: 'bg-rose-500/12',
  },
};

const PAYMENT_METHODS: {
  id: PaymentMethodId;
  label: string;
  detail: string;
  icon: React.ReactNode;
}[] = [
  {
    id: 'google_play',
    label: 'Google Play',
    detail: 'Play Bakiyesi veya kayıtlı yöntem',
    icon: <Smartphone className="h-4 w-4 text-emerald-400" />,
  },
  {
    id: 'card',
    label: 'Banka / Kredi Kartı',
    detail: '3D Secure korumalı tek çekim',
    icon: <CreditCard className="h-4 w-4 text-sky-400" />,
  },
  {
    id: 'wallet',
    label: 'Dijital Cüzdan',
    detail: 'Hızlı tek dokunuşla ödeme',
    icon: <Wallet className="h-4 w-4 text-amber-400" />,
  },
];

function formatReceiptDate(ms: number): string {
  try {
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(ms));
  } catch {
    return '';
  }
}

const ResilientArt: React.FC<{
  src: string;
  alt: string;
  className?: string;
  fallbackIcon?: React.ReactNode;
}> = ({ src, alt, className = '', fallbackIcon }) => {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900 text-amber-400/70 ${className}`}
      >
        {fallbackIcon ?? <Package className="h-10 w-10" />}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};

export const StoreModal: React.FC<StoreModalProps> = React.memo(
  ({
    open,
    initialTab,
    goldCoins,
    diamonds,
    adFreePurchased,
    entitlements,
    currentUser,
    onFulfillPurchase,
    onExchangeDiamondsForGold,
    onOpenCrateWithDiamonds,
    onRedeemPromoCode,
    onRestorePurchases,
    showcaseCar,
    onOpenGarageFromStore,
    onClose,
  }) => {
    const [activeTab, setActiveTab] = useState<StoreTabId>(initialTab);
    const [exchangeNotice, setExchangeNotice] = useState<string | null>(null);
    const [checkoutItem, setCheckoutItem] = useState<StoreCheckoutItem | null>(
      null,
    );
    const [paymentMethod, setPaymentMethod] =
      useState<PaymentMethodId>('google_play');
    const [processing, setProcessing] = useState(false);
    const [checkoutError, setCheckoutError] = useState<string | null>(null);
    const [expandedOddsTier, setExpandedOddsTier] = useState<string | null>(
      null,
    );

    const [revealOutcome, setRevealOutcome] =
      useState<StoreFulfillmentOutcome | null>(null);

    const [promoInput, setPromoInput] = useState('');
    const [promoError, setPromoError] = useState<string | null>(null);
    const [redeemingPromo, setRedeemingPromo] = useState(false);

    const [restoring, setRestoring] = useState(false);
    const [restoreNotice, setRestoreNotice] = useState<string | null>(null);
    const [signingIn, setSigningIn] = useState(false);

    const billingMode = getBillingModeInfo();

    useEffect(() => {
      if (open) {
        setActiveTab(initialTab);
        setCheckoutError(null);
        setRestoreNotice(null);
        setPromoError(null);
        setExchangeNotice(null);
      } else {
        setCheckoutItem(null);
        setRevealOutcome(null);
        setProcessing(false);
        setPromoInput('');
        setPromoError(null);
        setRedeemingPromo(false);
        setExchangeNotice(null);
      }
    }, [open, initialTab]);

    if (!open) return null;

    const handleExchangeDiamondPack = (pack: DiamondGoldExchangeSpec) => {
      if (diamonds < pack.diamondCost) return;
      const res = onExchangeDiamondsForGold(pack.diamondCost, pack.goldAmount);
      if (res.ok) {
        setExchangeNotice(
          `${pack.diamondCost} Elmas karşılığında +${pack.goldAmount.toLocaleString('tr-TR')} Altın hesabına eklendi!`,
        );
      }
    };

    const handleOpenCrateWithDiamondsClick = (crate: CrateProductSpec) => {
      if (diamonds < crate.diamondSinglePrice) return;
      const res = onOpenCrateWithDiamonds(crate.tierId);
      if (res.success && res.outcome) {
        setRevealOutcome(res.outcome);
      }
    };

    const startBundleCheckout = (bundle: BundleProductSpec) => {
      if (
        bundle.oneTimeOnly &&
        (entitlements.claimedOneTimeSkus.includes(bundle.sku) ||
          (bundle.includesAdFree && adFreePurchased))
      ) {
        return;
      }
      setCheckoutError(null);
      setCheckoutItem({
        sku: bundle.sku,
        category: 'bundle',
        title: bundle.title,
        subtitle: bundle.tagline,
        priceTry: bundle.priceTry,
        oneTimeOnly: bundle.oneTimeOnly,
        goldAmount: bundle.goldAmount,
      });
    };

    const startCrateCheckout = (crate: CrateProductSpec, count: 1 | 3) => {
      setCheckoutError(null);
      setCheckoutItem({
        sku: count === 3 ? crate.skuTriple : crate.skuSingle,
        category: 'crate',
        title: count === 3 ? `3× ${crate.title}` : `1× ${crate.title}`,
        subtitle: crate.guaranteedSummary,
        priceTry: count === 3 ? crate.priceTripleTry : crate.priceSingleTry,
        crateTierId: crate.tierId,
        crateCount: count,
      });
    };

    const startGoldCheckout = (pack: GoldPackSpec) => {
      setCheckoutError(null);
      setCheckoutItem({
        sku: pack.sku,
        category: 'gold',
        title: `${pack.title} · ${pack.goldAmount.toLocaleString('tr-TR')} Altın`,
        subtitle: pack.subtitle,
        priceTry: pack.priceTry,
        goldAmount: pack.goldAmount,
      });
    };

    const handleConfirmCheckout = async () => {
      if (!checkoutItem || processing) return;
      setProcessing(true);
      setCheckoutError(null);
      try {
        const res = await onFulfillPurchase(checkoutItem, paymentMethod);
        if (!res.success || !res.outcome) {
          setCheckoutError(
            res.error || 'Satın alma tamamlanamadı. Lütfen tekrar dene.',
          );
          setProcessing(false);
          return;
        }
        setCheckoutItem(null);
        setProcessing(false);
        setRevealOutcome(res.outcome);
      } catch {
        setCheckoutError('Ödeme sırasında beklenmeyen bir hata oluştu.');
        setProcessing(false);
      }
    };

    const handleRestore = async () => {
      if (restoring) return;
      setRestoring(true);
      setRestoreNotice(null);
      try {
        const res = await onRestorePurchases();
        if (res.fromCloud) {
          setRestoreNotice(
            res.restoredCount > 0 || res.restoredAdFree
              ? `Bulut hesabından ${res.restoredCount} işlem senkronize edildi.`
              : 'Hesabın güncel. Eksik satın alma bulunamadı.',
          );
        } else {
          setRestoreNotice(
            'Buluttan geri yüklemek için Google hesabınla giriş yap.',
          );
        }
      } catch {
        setRestoreNotice('Geri yükleme sırasında bağlantı hatası oluştu.');
      } finally {
        setRestoring(false);
      }
    };

    const handleGoogleSignIn = async () => {
      if (signingIn) return;
      setSigningIn(true);
      try {
        await signInWithGoogle();
      } finally {
        setSigningIn(false);
      }
    };

    const handleRedeemPromo = async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (redeemingPromo) return;
      setPromoError(null);
      const trimmed = promoInput.trim();
      if (!trimmed) {
        setPromoError('Lütfen bir promosyon kodu gir.');
        return;
      }
      setRedeemingPromo(true);
      try {
        const res = await onRedeemPromoCode(trimmed);
        if (!res.success || !res.outcome) {
          setPromoError(res.error || 'Kod kullanılamadı.');
          return;
        }
        setPromoInput('');
        setPromoError(null);
        setRevealOutcome(res.outcome);
      } catch {
        setPromoError('Kod doğrulanırken bir hata oluştu.');
      } finally {
        setRedeemingPromo(false);
      }
    };

    return (
      <div
        onPointerDown={(e) => e.stopPropagation()}
        className="pointer-events-auto fixed inset-0 z-50 flex items-end justify-center bg-black/86 p-0 sm:items-center sm:p-4"
      >
        <div className="animate-sheet-up ug-sheet relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border-t sm:ug-cut sm:max-h-[92vh] sm:w-[min(96vw,940px)] sm:rounded-none sm:border">
          {/* Mobile grab handle */}
          <div className="flex justify-center pt-2.5 pb-1 sm:hidden">
            <span className="h-1 w-10 rounded-full bg-orange-400/45" />
          </div>

          {/* Top Header */}
          <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-[#0b0d14]/90 px-4 py-3 sm:px-6 sm:py-3.5">
            <div className="flex items-center gap-3 min-w-0">
              <div className="ug-cut-sm flex h-11 w-11 items-center justify-center border border-orange-500/40 bg-orange-500/18 text-orange-400 shrink-0">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="font-display text-[10px] font-bold tracking-[0.18em] text-orange-400 uppercase">
                  UNDERGROUND // MARKET
                </div>
                <h2 className="font-display italic text-lg font-extrabold uppercase tracking-wide text-white sm:text-xl truncate">
                  Viraj Market
                </h2>
                <div className="flex flex-wrap items-center gap-x-2 text-xs text-zinc-400">
                  <span>{billingMode.label}</span>
                  <span aria-hidden="true">·</span>
                  <span>TRY (₺)</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <div
                title="Elmas Bakiyesi"
                className="ug-cut-sm flex h-11 items-center gap-1.5 border border-cyan-400/40 bg-[#0a1420] px-2.5 sm:px-3 text-sm font-bold text-cyan-200 font-mono-num"
              >
                <Gem className="h-4 w-4 text-cyan-400 shrink-0" />
                <span>{diamonds.toLocaleString('tr-TR')}</span>
              </div>
              <div className="ug-cut-sm flex h-11 items-center gap-1.5 border border-amber-400/35 bg-[#121622] px-2.5 sm:px-3 text-sm font-bold text-amber-300 font-mono-num">
                <Coins className="h-4 w-4 text-amber-400 shrink-0" />
                <span>{goldCoins.toLocaleString('tr-TR')}</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Marketi Kapat"
                className="ug-cut-sm ug-btn-metal flex h-11 w-11 items-center justify-center cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* 4-Tab Navigation Bar */}
          <div className="border-b border-white/10 bg-[#0e111a] px-3.5 py-2.5 sm:px-6">
            <div className="ug-cut-sm grid grid-cols-4 gap-1.5 border border-white/10 bg-[#090b12] p-1">
              {(
                [
                  { id: 'bundles', label: 'Paketler', icon: Crown },
                  { id: 'crates', label: 'Kasalar', icon: Box },
                  { id: 'gold', label: 'Altın', icon: Coins },
                  { id: 'history', label: 'İşlemler', icon: History },
                ] as const
              ).map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`ug-cut-sm flex min-h-[46px] flex-col items-center justify-center gap-1 px-1.5 py-1.5 font-display italic text-xs font-extrabold uppercase tracking-wide whitespace-nowrap transition-all cursor-pointer sm:min-h-[42px] sm:flex-row sm:gap-1.5 sm:px-2 sm:text-sm ${
                      active
                        ? 'ug-tab-active'
                        : 'text-zinc-300 hover:text-white'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Scrollable Catalog Body */}
          <div
            className="flex-1 overflow-y-auto custom-scroll px-4 py-4 sm:px-6 sm:py-5"
            style={{
              paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))',
            }}
          >
            {/* ONE-TIME WORLDWIDE PROMO / GIFT CODE REDEMPTION BAR */}
            <form
              onSubmit={handleRedeemPromo}
              className="ug-cut-sm ug-card mb-5 border-orange-500/30 p-3.5 sm:p-4"
            >
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="ug-cut-sm flex h-9 w-9 items-center justify-center border border-orange-400/35 bg-orange-500/18 text-orange-400 shrink-0">
                    <Ticket className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-display italic text-sm font-bold uppercase tracking-wide text-white">
                      Tek Seferlik Kod Kullan
                    </div>
                    <p className="text-xs text-zinc-400">
                      Her kod dünyada yalnızca 1 kez kullanılabilir · Sunucudan doğrulanır
                    </p>
                  </div>
                </div>

                {currentUser ? (
                  <div className="flex items-center gap-2 sm:w-[330px] shrink-0">
                    <input
                      type="text"
                      value={promoInput}
                      onChange={(e) => {
                        setPromoInput(e.target.value.toUpperCase());
                        if (promoError) setPromoError(null);
                      }}
                      placeholder="ÖRN. VIP-XXXX-XXXX"
                      maxLength={24}
                      autoCapitalize="characters"
                      autoCorrect="off"
                      spellCheck={false}
                      className="ug-cut-sm h-11 min-w-0 flex-1 border border-white/15 bg-[#090b12] px-3.5 font-mono-num text-sm font-bold tracking-wider text-white placeholder:font-sans placeholder:font-normal placeholder:tracking-normal placeholder:text-zinc-500 focus:border-orange-500/70 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={redeemingPromo || !promoInput.trim()}
                      className="ug-cut-sm ug-btn-fire flex h-11 items-center justify-center gap-1.5 px-4 font-display italic text-sm font-extrabold uppercase tracking-wider disabled:opacity-45 whitespace-nowrap cursor-pointer shrink-0"
                    >
                      {redeemingPromo ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <span>Kullan</span>
                      )}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={signingIn}
                    className="ug-cut-sm ug-btn-metal flex h-11 w-full sm:w-auto items-center justify-center gap-2 px-4 font-display text-xs sm:text-sm font-bold uppercase tracking-wide disabled:opacity-60 whitespace-nowrap cursor-pointer shrink-0"
                  >
                    {signingIn ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="h-4 w-4 text-orange-400" />
                    )}
                    <span>Kod İçin Google ile Giriş</span>
                  </button>
                )}
              </div>

              {promoError && (
                <div className="ug-cut-sm mt-2.5 border border-rose-400/35 bg-rose-500/12 px-3 py-2 text-xs font-medium text-rose-200">
                  {promoError}
                </div>
              )}
            </form>

            {/* TAB 1: FEATURED BUNDLES & VIP */}
            {activeTab === 'bundles' && (() => {
              const availableBundles = BUNDLE_PRODUCTS.filter((bundle) => {
                if (!bundle.oneTimeOnly) return true;
                const owned =
                  entitlements.claimedOneTimeSkus.includes(bundle.sku) ||
                  (bundle.includesAdFree && adFreePurchased);
                return !owned;
              });

              return (
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                    <h3 className="font-display italic text-base font-bold uppercase tracking-wide text-white sm:text-lg">
                      Özel Paketler ve Kalıcı Ayrıcalıklar
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Zaten sahip olduğun araçlar otomatik altın telafisine dönüşür
                    </p>
                  </div>

                  {availableBundles.length === 0 ? (
                    <div className="ug-cut ug-card flex flex-col items-center justify-center gap-2.5 border-emerald-400/35 px-6 py-12 text-center">
                      <CheckCircle2 className="h-9 w-9 text-emerald-400" />
                      <div className="font-display italic text-base font-extrabold uppercase text-white">
                        Tüm Tek Seferlik Paketlere Sahipsin!
                      </div>
                      <p className="max-w-sm text-xs text-zinc-300">
                        Mevcut tüm özel paketleri satın aldın. Otomotiv Kasaları veya Altın Kasaları sekmelerinden garajını güçlendirmeye devam edebilirsin.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {availableBundles.map((bundle) => (
                        <div
                          key={bundle.sku}
                          className={`ug-cut flex flex-col overflow-hidden border ${bundle.accentBorderClass} bg-[#131722]`}
                        >
                          <div className="relative h-44 w-full overflow-hidden bg-[#090b12]">
                            <ResilientArt
                              src={bundle.imageUrl}
                              alt={bundle.title}
                              className="h-full w-full object-cover object-center"
                              fallbackIcon={<Crown className="h-10 w-10" />}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#131722] via-black/35 to-transparent" />
                            <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-2">
                              <div className="min-w-0">
                                <div
                                  className={`font-display text-xs font-bold uppercase tracking-wider ${bundle.accentTextClass}`}
                                >
                                  {bundle.subtitle}
                                </div>
                                <h4 className="font-display italic text-lg font-extrabold uppercase text-white truncate">
                                  {bundle.title}
                                </h4>
                              </div>
                              <div className="text-right shrink-0">
                                {bundle.compareAtTry && (
                                  <div className="font-mono-num text-[11px] text-zinc-400 line-through">
                                    {formatPriceTry(bundle.compareAtTry)}
                                  </div>
                                )}
                                <div className="font-mono-num font-display italic text-lg font-extrabold text-white">
                                  {formatPriceTry(bundle.priceTry)}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-1 flex-col justify-between gap-4 p-4">
                            <div className="space-y-2">
                              <p className="text-xs leading-relaxed text-zinc-300">
                                {bundle.tagline}
                              </p>
                              <ul className="space-y-1.5 pt-1 text-xs text-zinc-200">
                                {bundle.highlights.map((line) => (
                                  <li
                                    key={line}
                                    className="flex items-start gap-2"
                                  >
                                    <Check className="mt-0.5 h-3.5 w-3.5 text-orange-400 shrink-0" />
                                    <span>{line}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <button
                              type="button"
                              onClick={() => startBundleCheckout(bundle)}
                              className="ug-cut ug-btn-fire flex min-h-[50px] w-full items-center justify-center gap-2 px-4 font-display italic text-base font-extrabold uppercase tracking-wider cursor-pointer"
                            >
                              <span>Satın Al</span>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono-num">
                                {formatPriceTry(bundle.priceTry)}
                              </span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* TAB 2: CRATES / LOOT CHESTS */}
            {activeTab === 'crates' && (
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                  <h3 className="font-display italic text-base font-bold uppercase tracking-wide text-white sm:text-lg">
                    Otomotiv Kasaları
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Anında açılır · Altın, XP, modifiye parçası ve süper spor araçlar
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  {CRATE_PRODUCTS.map((crate) => {
                    const oddsOpen = expandedOddsTier === crate.tierId;
                    return (
                      <div
                        key={crate.tierId}
                        className={`ug-cut flex flex-col overflow-hidden border ${crate.borderClass} bg-[#131722]`}
                      >
                        <div className="relative aspect-square w-full overflow-hidden bg-[#090b12]">
                          <ResilientArt
                            src={crate.imageUrl}
                            alt={crate.title}
                            className="h-full w-full object-cover"
                            fallbackIcon={<Box className="h-12 w-12" />}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#131722] via-black/30 to-transparent" />
                          <div className="absolute bottom-3 left-4 right-4">
                            <h4
                              className={`font-display italic text-lg font-extrabold uppercase ${crate.accentClass}`}
                            >
                              {crate.title}
                            </h4>
                            <p className="mt-0.5 text-xs text-zinc-300">
                              {crate.subtitle}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-1 flex-col justify-between gap-3.5 p-4">
                          <div className="space-y-2.5">
                            <p className="text-xs font-medium text-zinc-200">
                              {crate.guaranteedSummary}
                            </p>

                            <button
                              type="button"
                              onClick={() =>
                                setExpandedOddsTier(
                                  oddsOpen ? null : crate.tierId,
                                )
                              }
                              className="flex w-full items-center justify-between text-xs font-semibold text-zinc-400 hover:text-zinc-100 cursor-pointer"
                            >
                              <span className="inline-flex items-center gap-1.5">
                                <Info className="h-3.5 w-3.5" />
                                <span>İçerik ve Çıkma Oranları</span>
                              </span>
                              {oddsOpen ? (
                                <ChevronUp className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5" />
                              )}
                            </button>

                            {oddsOpen && (
                              <div className="space-y-1.5 border-t border-white/10 pt-2.5 text-[11px]">
                                {crate.dropRates.map((rate) => (
                                  <div
                                    key={rate.label}
                                    className="flex items-baseline justify-between gap-2"
                                  >
                                    <span className="text-zinc-300">
                                      {rate.label}
                                    </span>
                                    <span
                                      className={`font-mono-num font-bold shrink-0 ${
                                        RARITY_STYLES[rate.rarity].textClass
                                      }`}
                                    >
                                      {rate.chanceLabel}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col gap-2.5 pt-1">
                            <button
                              type="button"
                              disabled={diamonds < crate.diamondSinglePrice}
                              onClick={() =>
                                handleOpenCrateWithDiamondsClick(crate)
                              }
                              className={`ug-cut-sm flex min-h-[48px] w-full items-center justify-between border px-4 font-display italic text-sm font-extrabold uppercase tracking-wide transition-all ${
                                diamonds >= crate.diamondSinglePrice
                                  ? 'border-cyan-400/60 bg-gradient-to-r from-cyan-500/22 via-sky-500/18 to-cyan-500/22 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.16)] hover:border-cyan-300 hover:from-cyan-500/32 hover:to-cyan-500/32 active:scale-[0.99] cursor-pointer'
                                  : 'border-cyan-400/20 bg-[#0a131f] text-zinc-500 opacity-65 cursor-not-allowed'
                              }`}
                            >
                              <span className="inline-flex items-center gap-1.5">
                                <Gem className="h-4 w-4 text-cyan-400 shrink-0" />
                                <span>Elmasla Aç</span>
                              </span>
                              <span className="inline-flex items-center gap-1 font-mono-num text-cyan-300">
                                <span>{crate.diamondSinglePrice}</span>
                                <span className="font-display text-xs">
                                  Elmas
                                </span>
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={() => startCrateCheckout(crate, 1)}
                              className="ug-cut-sm ug-btn-metal flex min-h-[48px] w-full items-center justify-between px-4 font-display italic text-sm font-bold uppercase tracking-wide cursor-pointer"
                            >
                              <span>1× Kasa Aç</span>
                              <span className="font-mono-num text-amber-300">
                                {formatPriceTry(crate.priceSingleTry)}
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={() => startCrateCheckout(crate, 3)}
                              className="ug-cut ug-btn-fire flex min-h-[50px] w-full items-center justify-between px-4 font-display italic text-sm font-extrabold uppercase tracking-wider cursor-pointer"
                            >
                              <div className="flex items-center gap-1.5">
                                <span>3× Kasa</span>
                                <span className="text-xs font-semibold opacity-90">
                                  · {crate.tripleSaveLabel}
                                </span>
                              </div>
                              <span className="font-mono-num text-base">
                                {formatPriceTry(crate.priceTripleTry)}
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: GOLD PACKS & DIAMOND EXCHANGE */}
            {activeTab === 'gold' && (
              <div className="flex flex-col gap-5">
                {/* DIAMOND -> GOLD EXCHANGE SECTION */}
                <div className="ug-cut border border-cyan-400/35 bg-gradient-to-br from-cyan-950/40 via-[#121622] to-[#0b0d14] p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="inline-flex items-center gap-1.5 font-display text-xs font-bold tracking-wider uppercase text-cyan-300">
                        <Gem className="h-4 w-4 text-cyan-400 shrink-0" />
                        <span>ELMAS TAKASI · ÜCRETSİZ ALTIN</span>
                      </div>
                      <h3 className="mt-1 font-display italic text-lg font-extrabold uppercase tracking-wide text-white sm:text-xl">
                        Elmas ile Altın Al
                      </h3>
                      <p className="mt-0.5 text-xs text-zinc-300">
                        Yolda sürerken nadir çıkan Elmasları anında Altına çevir.
                      </p>
                    </div>
                    <div className="ug-cut-sm inline-flex items-center gap-1.5 border border-cyan-400/40 bg-[#090c14] px-3 py-2 font-mono-num text-sm font-extrabold text-cyan-200 shrink-0">
                      <Gem className="h-4 w-4 text-cyan-400" />
                      <span>{diamonds.toLocaleString('tr-TR')} Elmas</span>
                    </div>
                  </div>

                  {exchangeNotice && (
                    <div className="ug-cut-sm mt-3 flex items-center gap-2 border border-emerald-400/45 bg-emerald-500/15 px-3.5 py-2.5 text-xs font-bold text-emerald-200">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>{exchangeNotice}</span>
                    </div>
                  )}

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {DIAMOND_GOLD_EXCHANGE_PACKS.map((pack) => {
                      const canAfford = diamonds >= pack.diamondCost;
                      return (
                        <div
                          key={pack.id}
                          className="ug-cut-sm ug-card flex flex-col justify-between gap-3.5 p-3.5 transition-colors"
                        >
                          <div>
                            <div className="flex items-baseline justify-between gap-2 text-xs">
                              <span className="font-display font-bold uppercase tracking-wide text-zinc-200">
                                {pack.title}
                              </span>
                              {pack.bonusLabel && (
                                <span className="font-mono-num font-bold text-cyan-300">
                                  {pack.bonusLabel}
                                </span>
                              )}
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                              <Coins className="h-5 w-5 text-amber-400 shrink-0" />
                              <span className="font-display italic text-2xl font-extrabold text-white font-mono-num">
                                {pack.goldAmount.toLocaleString('tr-TR')}
                              </span>
                              <span className="font-display text-xs font-bold uppercase text-zinc-400">
                                Altın
                              </span>
                            </div>
                            <p className="mt-1 text-[11px] text-zinc-400">
                              {pack.subtitle}
                            </p>
                          </div>

                          <button
                            type="button"
                            disabled={!canAfford}
                            onClick={() => handleExchangeDiamondPack(pack)}
                            className={`ug-cut-sm flex min-h-[44px] w-full items-center justify-center gap-1.5 px-3 font-display italic text-sm font-extrabold uppercase tracking-wider font-mono-num transition-colors ${
                              canAfford
                                ? 'border border-cyan-400/50 bg-cyan-500/20 text-cyan-100 hover:bg-cyan-400 hover:text-zinc-950 cursor-pointer'
                                : 'border border-white/8 bg-[#0b0d14] text-zinc-500 cursor-not-allowed'
                            }`}
                          >
                            <Gem className="h-4 w-4 shrink-0" />
                            <span>{pack.diamondCost} Elmas</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Vault Showcase Banner */}
                <div className="ug-cut relative overflow-hidden border border-orange-500/35 bg-[#121622]">
                  <div className="grid grid-cols-1 items-stretch sm:grid-cols-5">
                    <div className="relative h-36 sm:col-span-2 sm:h-auto">
                      <ResilientArt
                        src={STORE_GOLD_VAULT_ART}
                        alt="Viraj Altın Kasası"
                        className="h-full w-full object-cover"
                        fallbackIcon={<Coins className="h-10 w-10" />}
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#121622]/25 to-[#121622] hidden sm:block" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#121622] to-transparent sm:hidden" />
                    </div>
                    <div className="flex flex-col justify-center gap-1.5 p-4 sm:col-span-3 sm:p-5">
                      <div className="font-display text-xs font-bold uppercase tracking-wider text-orange-400">
                        Anında Teslimat · Garaj ve Modifiye Kasası
                      </div>
                      <h3 className="font-display italic text-xl font-extrabold uppercase tracking-wide text-white">
                        Altın Kasaları
                      </h3>
                      <p className="text-xs leading-relaxed text-zinc-300">
                        Hiper otomobiller, motor ve nitro yükseltmeleri, özel
                        tekerlekler ve karbon gövde kitleri için anında altın yükle.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 6 Gold Tiers Grid (Uniform Card & Button Style) */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {GOLD_PACKS.map((pack) => (
                    <div
                      key={pack.sku}
                      className="ug-cut-sm ug-card flex flex-col justify-between gap-4 p-4 transition-colors"
                    >
                      <div>
                        <div className="flex items-baseline justify-between gap-2 text-xs">
                          <span className="font-display font-bold uppercase tracking-wide text-zinc-300">
                            {pack.title}
                          </span>
                          {(pack.highlightLabel || pack.bonusLabel) && (
                            <span className="font-display font-bold text-orange-300">
                              {[pack.highlightLabel, pack.bonusLabel]
                                .filter(Boolean)
                                .join(' · ')}
                            </span>
                          )}
                        </div>

                        <div className="mt-2.5 flex items-center gap-2">
                          <Coins className="h-6 w-6 text-amber-400 shrink-0" />
                          <span className="font-display italic text-2xl font-extrabold text-white font-mono-num">
                            {pack.goldAmount.toLocaleString('tr-TR')}
                          </span>
                          <span className="font-display text-xs font-bold uppercase text-zinc-400">
                            Altın
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-zinc-400">
                          {pack.subtitle}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => startGoldCheckout(pack)}
                        className="ug-cut-sm flex min-h-[48px] w-full items-center justify-center border border-orange-500/40 bg-[#0b0d14] px-4 font-display italic text-base font-extrabold text-orange-300 font-mono-num transition-all hover:border-orange-400 hover:bg-orange-500 hover:text-white cursor-pointer"
                      >
                        {formatPriceTry(pack.priceTry)}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: RECEIPTS & CLOUD RESTORE */}
            {activeTab === 'history' && (
              <div className="flex flex-col gap-4">
                <div className="ug-cut-sm ug-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="font-display italic text-sm font-bold uppercase text-white">
                      {currentUser
                        ? `Bulut Yedekleme Açık · ${currentUser.displayName || 'Google Hesabı'}`
                        : 'Satın Alımlarını Google Hesabına Bağla'}
                    </div>
                    <p className="text-xs text-zinc-400">
                      {currentUser
                        ? 'Makbuzların ve kalıcı paketlerin hesabınla senkronize edilir.'
                        : 'Cihaz değiştirirsen Reklamsız Paket ve diğer paketlerini geri yükleyebilmek için giriş yap.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!currentUser && (
                      <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        disabled={signingIn}
                        className="ug-cut-sm ug-btn-fire flex min-h-[42px] items-center justify-center gap-1.5 px-3.5 font-display italic text-xs font-extrabold uppercase tracking-wider cursor-pointer"
                      >
                        {signingIn ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <ShieldCheck className="h-3.5 w-3.5" />
                        )}
                        <span>Google ile Giriş</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleRestore}
                      disabled={restoring}
                      className="ug-cut-sm ug-btn-metal flex min-h-[42px] items-center justify-center gap-1.5 px-3.5 font-display text-xs font-bold uppercase tracking-wide cursor-pointer"
                    >
                      <RefreshCw
                        className={`h-3.5 w-3.5 ${restoring ? 'animate-spin' : ''}`}
                      />
                      <span>Geri Yükle</span>
                    </button>
                  </div>
                </div>

                {restoreNotice && (
                  <div className="ug-cut-sm border border-sky-400/35 bg-sky-500/10 px-3.5 py-2.5 text-xs font-medium text-sky-200">
                    {restoreNotice}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>
                    Toplam Yüklenen Altın:{' '}
                    <strong className="font-mono-num text-amber-300">
                      {entitlements.totalGoldPurchased.toLocaleString('tr-TR')}
                    </strong>
                  </span>
                  <span>
                    Açılan Kasa:{' '}
                    <strong className="font-mono-num text-zinc-100">
                      {entitlements.totalCratesOpened}
                    </strong>
                  </span>
                </div>

                {entitlements.receipts.length === 0 ? (
                  <div className="ug-cut-sm ug-card flex flex-col items-center justify-center gap-2 py-12 text-center">
                    <History className="h-7 w-7 text-zinc-500" />
                    <div className="font-display text-sm font-bold uppercase text-zinc-200">
                      Henüz satın alma makbuzu yok
                    </div>
                    <p className="max-w-xs text-xs text-zinc-400">
                      Marketten aldığın tüm altın, kasa ve VIP paketlerinin
                      makbuzları burada listelenir.
                    </p>
                  </div>
                ) : (
                  <div className="ug-cut-sm ug-card divide-y divide-white/8 overflow-hidden">
                    {entitlements.receipts.map((receipt) => (
                      <div
                        key={receipt.orderId}
                        className="flex flex-col gap-1.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="font-display text-sm font-bold text-white truncate">
                            {receipt.title}
                          </div>
                          <div className="text-xs text-zinc-300 truncate">
                            {receipt.rewardSummary}
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-zinc-500 font-mono-num">
                            <span>{receipt.orderId}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-sans">
                              {formatReceiptDate(receipt.purchasedAtMs)}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-sans">
                              {receipt.cloudSynced ? 'Bulutta Kayıtlı' : 'Yerel Kayıt'}
                            </span>
                          </div>
                        </div>
                        <div className="font-mono-num font-display italic text-sm font-extrabold text-orange-300 shrink-0">
                          {formatPriceTry(receipt.priceTry)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* CHECKOUT CONFIRMATION SHEET OVERLAY */}
          {checkoutItem && (
            <div
              onPointerDown={(e) => e.stopPropagation()}
              className="absolute inset-0 z-20 flex items-end justify-center bg-black/86 p-0 sm:items-center sm:p-4"
            >
              <div
                className="animate-sheet-up ug-sheet flex w-full flex-col rounded-t-2xl border-t p-5 sm:ug-cut sm:max-w-md sm:rounded-none sm:border"
                style={{
                  paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))',
                }}
              >
                <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3.5">
                  <div>
                    <div className="font-display text-xs font-bold uppercase tracking-wider text-orange-400">
                      Güvenli Ödeme Onayı
                    </div>
                    <h3 className="mt-0.5 font-display italic text-lg font-extrabold uppercase text-white">
                      {checkoutItem.title}
                    </h3>
                    <p className="text-xs text-zinc-400">
                      {checkoutItem.subtitle}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={processing}
                    onClick={() => setCheckoutItem(null)}
                    aria-label="Ödemeyi İptal Et"
                    className="ug-cut-sm ug-btn-metal flex h-11 w-11 items-center justify-center cursor-pointer shrink-0"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Payment Method Picker */}
                <div className="mt-4 space-y-2">
                  <div className="font-display text-xs font-bold uppercase tracking-wide text-zinc-300">
                    Ödeme Yöntemi
                  </div>
                  <div className="space-y-1.5">
                    {PAYMENT_METHODS.map((pm) => {
                      const selected = paymentMethod === pm.id;
                      return (
                        <button
                          key={pm.id}
                          type="button"
                          disabled={processing}
                          onClick={() => setPaymentMethod(pm.id)}
                          className={`ug-cut-sm flex w-full items-center justify-between gap-3 border px-3.5 py-2.5 text-left transition-colors cursor-pointer ${
                            selected
                              ? 'border-orange-400/70 bg-orange-500/14'
                              : 'ug-card hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {pm.icon}
                            <div className="min-w-0">
                              <div className="font-display text-xs font-bold text-white">
                                {pm.label}
                              </div>
                              <div className="text-[11px] text-zinc-400 truncate">
                                {pm.detail}
                              </div>
                            </div>
                          </div>
                          <div
                            className={`flex h-5 w-5 items-center justify-center rounded-full border shrink-0 ${
                              selected
                                ? 'border-orange-400 bg-orange-500 text-white'
                                : 'border-zinc-600'
                            }`}
                          >
                            {selected && <Check className="h-3 w-3 stroke-[3]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Summary Row */}
                <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3.5 text-sm">
                  <div className="text-xs text-zinc-400">
                    Ürün Kodu:{' '}
                    <span className="font-mono-num text-zinc-300">
                      {checkoutItem.sku}
                    </span>
                  </div>
                  <div className="font-display italic text-xl font-extrabold text-orange-300 font-mono-num">
                    {formatPriceTry(checkoutItem.priceTry)}
                  </div>
                </div>

                {!billingMode.isLiveBilling && (
                  <div className="ug-cut-sm ug-card mt-3 flex items-start gap-2 px-3 py-2 text-[11px] leading-relaxed text-zinc-400">
                    <Lock className="mt-0.5 h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span>
                      Önizleme ödeme modundasın; gerçek kartından ücret çekilmez.
                      Android Play Store sürümünde bu SKU doğrudan Google Play
                      Billing ile tahsil edilir.
                    </span>
                  </div>
                )}

                {checkoutError && (
                  <div className="ug-cut-sm mt-3 border border-rose-400/40 bg-rose-500/12 px-3 py-2 text-xs font-medium text-rose-200">
                    {checkoutError}
                  </div>
                )}

                <div className="mt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    disabled={processing}
                    onClick={handleConfirmCheckout}
                    className="ug-cut ug-btn-fire flex min-h-[48px] w-full items-center justify-center gap-2 px-5 font-display italic text-sm font-extrabold uppercase tracking-wider disabled:opacity-65 cursor-pointer"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Ödeme Doğrulanıyor...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4" />
                        <span>
                          Ödemeyi Onayla · {formatPriceTry(checkoutItem.priceTry)}
                        </span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={processing}
                    onClick={() => setCheckoutItem(null)}
                    className="ug-cut-sm ug-btn-metal flex min-h-[40px] w-full items-center justify-center font-display text-xs font-bold uppercase tracking-wide cursor-pointer"
                  >
                    Vazgeç
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* CRATE OPENING / PURCHASE REWARD CEREMONY OVERLAY */}
        {revealOutcome && (
          <CrateOpeningCeremony
            key={revealOutcome.orderId}
            title={revealOutcome.title}
            subtitle={
              revealOutcome.orderId.startsWith('KOD-')
                ? `Kod Onaylandı · ${revealOutcome.orderId}`
                : `Satın Alma Tamamlandı · ${revealOutcome.orderId}`
            }
            rewardSummary={revealOutcome.rewardSummary}
            crateTierId={revealOutcome.crateTierId}
            crateImageUrl={revealOutcome.crateImageUrl}
            crateTitle={revealOutcome.crateTitle}
            lootItems={revealOutcome.lootItems}
            unlockedCarNames={revealOutcome.unlockedCarNames}
            adFreeActivated={revealOutcome.adFreeActivated}
            showcaseCar={showcaseCar}
            animateCrate={Boolean(
              revealOutcome.lootItems && revealOutcome.lootItems.length > 0,
            )}
            onOpenGarage={
              revealOutcome.unlockedCarNames.length > 0 &&
              onOpenGarageFromStore
                ? () => {
                    setRevealOutcome(null);
                    onClose();
                    onOpenGarageFromStore();
                  }
                : undefined
            }
            onClose={() => setRevealOutcome(null)}
          />
        )}
      </div>
    );
  },
);

StoreModal.displayName = 'StoreModal';

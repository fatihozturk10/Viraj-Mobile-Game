import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CarFront,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Coins,
  Crown,
  Eye,
  EyeOff,
  LayoutGrid,
  RotateCw,
  SkipForward,
  Sparkles,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import {
  getDefaultCustomForCar,
  getDefaultWheelForCar,
} from '../types/game';
import {
  CrateTierId,
  LootRarity,
  RolledLootItem,
} from '../services/storeCatalog';
import { triggerNativeHaptic } from '../services/androidBridge';
import {
  playCrateBurstSfx,
  playCrateChargeSfx,
  playCrateDropSfx,
  playCrateTapChargeSfx,
  playLootCardTickSfx,
} from '../services/crateAudio';
import { CrateFxCanvas } from './CrateFxCanvas';
import { ArmoredVaultVisual } from './ArmoredVaultVisual';
import {
  CrateCarShowcase3D,
  ShowcaseBaseCarConfig,
} from './CrateCarShowcase3D';

export interface CrateOpeningCeremonyProps {
  title: string;
  subtitle: string;
  rewardSummary: string;
  crateTierId?: CrateTierId;
  crateImageUrl?: string;
  crateTitle?: string;
  lootItems?: RolledLootItem[];
  unlockedCarNames?: string[];
  adFreeActivated?: boolean;
  /** Player's active car used to showcase dropped wheels, spoilers, body kits & liveries in 3D */
  showcaseCar?: ShowcaseBaseCarConfig;
  /** When false (e.g. pure gold pack without a crate), jump straight to revealed celebration */
  animateCrate?: boolean;
  ctaLabel?: string;
  onOpenGarage?: () => void;
  onClose: () => void;
}

type CeremonyPhase = 'drop' | 'charging' | 'burst' | 'showcase' | 'revealed';

const DEFAULT_SHOWCASE_CAR: ShowcaseBaseCarConfig = {
  modelId: 'dogan',
  colorId: 'pearl',
  wheelConfig: getDefaultWheelForCar('dogan'),
  customConfig: getDefaultCustomForCar(),
  licensePlate: 'VİRAJ 34',
};

const RARITY_RANK: Record<LootRarity, number> = {
  common: 0,
  rare: 1,
  epic: 2,
  legendary: 3,
};

interface ThemePalette {
  label: string;
  burstCallout: string;
  accentHex: string;
  glowHex: string;
  secondaryHex: string;
  borderClass: string;
  textClass: string;
  badgeBgClass: string;
  barClass: string;
  heroBgGradient: string;
}

const RARITY_THEMES: Record<LootRarity, ThemePalette> = {
  common: {
    label: 'Standart',
    burstCallout: 'KASA AÇILDI!',
    accentHex: '#a1a1aa',
    glowHex: 'rgba(161, 161, 170, 0.48)',
    secondaryHex: '#f4f4f5',
    borderClass: 'border-white/20',
    textClass: 'text-zinc-200',
    badgeBgClass: 'bg-zinc-800/90 text-zinc-100 border-white/20',
    barClass: 'bg-zinc-200',
    heroBgGradient:
      'linear-gradient(135deg, rgba(63,63,70,0.42) 0%, rgba(24,24,27,0.96) 68%)',
  },
  rare: {
    label: 'Nadir',
    burstCallout: 'NADİR ÖDÜL!',
    accentHex: '#38bdf8',
    glowHex: 'rgba(56, 189, 248, 0.58)',
    secondaryHex: '#bae6fd',
    borderClass: 'border-sky-400/55',
    textClass: 'text-sky-300',
    badgeBgClass: 'bg-sky-500/20 text-sky-100 border-sky-400/50',
    barClass: 'bg-gradient-to-r from-sky-500 via-cyan-300 to-sky-400',
    heroBgGradient:
      'linear-gradient(135deg, rgba(14,116,144,0.44) 0%, rgba(12,18,28,0.96) 70%)',
  },
  epic: {
    label: 'Destansı',
    burstCallout: 'DESTANSI!',
    accentHex: '#c084fc',
    glowHex: 'rgba(192, 132, 252, 0.66)',
    secondaryHex: '#f0abfc',
    borderClass: 'border-purple-400/60',
    textClass: 'text-purple-300',
    badgeBgClass: 'bg-purple-500/22 text-purple-100 border-purple-400/55',
    barClass: 'bg-gradient-to-r from-purple-500 via-fuchsia-300 to-purple-400',
    heroBgGradient:
      'linear-gradient(135deg, rgba(107,33,168,0.48) 0%, rgba(18,12,28,0.96) 70%)',
  },
  legendary: {
    label: 'Efsanevi',
    burstCallout: 'EFSANEVİ!',
    accentHex: '#fb7185',
    glowHex: 'rgba(251, 113, 133, 0.72)',
    secondaryHex: '#fcd34d',
    borderClass: 'border-rose-400/70',
    textClass: 'text-amber-300',
    badgeBgClass: 'bg-rose-500/24 text-amber-100 border-rose-400/60',
    barClass: 'bg-gradient-to-r from-amber-400 via-rose-400 to-amber-300',
    heroBgGradient:
      'linear-gradient(135deg, rgba(159,18,57,0.52) 0%, rgba(120,53,15,0.34) 48%, rgba(20,10,16,0.97) 84%)',
  },
};

const RARITY_CARD_STYLES: Record<
  LootRarity,
  {
    label: string;
    textClass: string;
    borderClass: string;
    bgClass: string;
    accentBarClass: string;
    glowShadow: string;
  }
> = {
  common: {
    label: 'Standart',
    textClass: 'text-zinc-300',
    borderClass: 'border-white/12',
    bgClass: 'bg-zinc-900/92',
    accentBarClass: 'bg-zinc-400',
    glowShadow: 'none',
  },
  rare: {
    label: 'Nadir',
    textClass: 'text-sky-300',
    borderClass: 'border-sky-400/45',
    bgClass: 'bg-sky-950/45',
    accentBarClass: 'bg-sky-400',
    glowShadow: '0 0 22px rgba(56, 189, 248, 0.18)',
  },
  epic: {
    label: 'Destansı',
    textClass: 'text-purple-300',
    borderClass: 'border-purple-400/55',
    bgClass: 'bg-purple-950/45',
    accentBarClass: 'bg-purple-400',
    glowShadow: '0 0 26px rgba(192, 132, 252, 0.26)',
  },
  legendary: {
    label: 'Efsanevi',
    textClass: 'text-amber-300',
    borderClass: 'border-rose-400/65',
    bgClass: 'bg-rose-950/45',
    accentBarClass: 'bg-gradient-to-b from-amber-300 via-rose-400 to-rose-500',
    glowShadow: '0 0 30px rgba(251, 113, 133, 0.34)',
  },
};

function isVisualShowcaseItem(item: RolledLootItem): boolean {
  return (
    item.kind === 'car' ||
    item.kind === 'wheel' ||
    item.kind === 'bodyKit' ||
    item.kind === 'spoiler' ||
    item.kind === 'livery'
  );
}

function getShowcaseFocusLabel(item: RolledLootItem): string {
  switch (item.kind) {
    case 'wheel':
      return 'TEKERLEK · YAKIN ÇEKİM';
    case 'spoiler':
      return 'SPOYLER · ARKA AÇI';
    case 'bodyKit':
      return 'GÖVDE KİTİ · AERO AÇI';
    case 'livery':
      return 'KAPLAMA · 360° GÖVDE';
    case 'car':
      return 'YENİ ARAÇ · 360° VİTRİN';
    default:
      return '3D ÖNİZLEME';
  }
}

function resolveTierFallbackRarity(tier?: CrateTierId): LootRarity {
  if (tier === 'legendary') return 'legendary';
  if (tier === 'pro') return 'epic';
  if (tier === 'street') return 'rare';
  return 'epic';
}

function buildRarityProgression(finalRarity: LootRarity): [
  LootRarity,
  LootRarity,
  LootRarity,
  LootRarity,
] {
  if (finalRarity === 'legendary') {
    return ['rare', 'epic', 'legendary', 'legendary'];
  }
  if (finalRarity === 'epic') {
    return ['rare', 'rare', 'epic', 'epic'];
  }
  if (finalRarity === 'rare') {
    return ['common', 'rare', 'rare', 'rare'];
  }
  return ['common', 'common', 'common', 'common'];
}

function renderLootIcon(item: RolledLootItem, large = false) {
  const cls = large ? 'h-7 w-7' : 'h-5 w-5';
  switch (item.kind) {
    case 'car':
      return <CarFront className={`${cls} text-rose-300`} />;
    case 'gold':
      return <Coins className={`${cls} text-amber-400`} />;
    case 'xp':
      return <Zap className={`${cls} text-sky-400`} />;
    default:
      return <Wrench className={`${cls} text-emerald-400`} />;
  }
}

export const CrateOpeningCeremony: React.FC<CrateOpeningCeremonyProps> = ({
  title,
  subtitle,
  rewardSummary,
  crateTierId,
  crateTitle,
  lootItems,
  unlockedCarNames = [],
  adFreeActivated = false,
  showcaseCar,
  animateCrate = true,
  ctaLabel = 'Harika, Devam Et',
  onOpenGarage,
  onClose,
}) => {
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const shouldAnimate = animateCrate && !prefersReducedMotion;
  const [phase, setPhase] = useState<CeremonyPhase>(
    shouldAnimate ? 'drop' : 'revealed',
  );
  const [beatStage, setBeatStage] = useState(0);
  const [chargeProgress, setChargeProgress] = useState(0);
  const [pulseSeq, setPulseSeq] = useState(0);
  const [burstSeq, setBurstSeq] = useState(0);
  const [tapRecoilKey, setTapRecoilKey] = useState(0);
  const [upgradeBannerText, setUpgradeBannerText] = useState<string | null>(null);
  const [activeShowcaseIdx, setActiveShowcaseIdx] = useState(0);
  const [showcaseHudHidden, setShowcaseHudHidden] = useState(false);

  const burstTriggeredRef = useRef(false);
  const beatStageRef = useRef(0);
  const chargeFloorRef = useRef(0);
  const chipStripRef = useRef<HTMLDivElement | null>(null);
  const chipButtonsRef = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (phase !== 'showcase' || showcaseHudHidden) return;
    const strip = chipStripRef.current;
    const btn = chipButtonsRef.current[activeShowcaseIdx];
    if (!strip || !btn) return;
    const stripRect = strip.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    const targetLeft =
      strip.scrollLeft +
      (btnRect.left - stripRect.left) -
      (stripRect.width - btnRect.width) / 2;
    strip.scrollTo({
      left: Math.max(0, targetLeft),
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  }, [activeShowcaseIdx, phase, showcaseHudHidden, prefersReducedMotion]);

  const highestRarity: LootRarity = useMemo(() => {
    if (!lootItems || lootItems.length === 0) {
      return resolveTierFallbackRarity(crateTierId);
    }
    let best: LootRarity = 'common';
    for (const item of lootItems) {
      if (RARITY_RANK[item.rarity] > RARITY_RANK[best]) {
        best = item.rarity;
      }
    }
    return best;
  }, [lootItems, crateTierId]);

  const effectiveTier: CrateTierId = useMemo(() => {
    if (crateTierId) return crateTierId;
    if (highestRarity === 'legendary') return 'legendary';
    if (highestRarity === 'epic') return 'pro';
    return 'street';
  }, [crateTierId, highestRarity]);

  const rarityProgression = useMemo(
    () => buildRarityProgression(highestRarity),
    [highestRarity],
  );

  // Sort loot items so flagship drop (cars / highest rarity visual parts) leads!
  const sortedLootItems = useMemo(() => {
    if (!lootItems || lootItems.length === 0) return [];
    return [...lootItems].sort((a, b) => {
      const visualDiff =
        (isVisualShowcaseItem(b) ? 1 : 0) - (isVisualShowcaseItem(a) ? 1 : 0);
      const rankDiff = RARITY_RANK[b.rarity] - RARITY_RANK[a.rarity];
      if (rankDiff !== 0) return rankDiff;
      if (visualDiff !== 0) return visualDiff;
      return (b.kind === 'car' ? 1 : 0) - (a.kind === 'car' ? 1 : 0);
    });
  }, [lootItems]);

  const visualDrops = useMemo(
    () => sortedLootItems.filter(isVisualShowcaseItem),
    [sortedLootItems],
  );

  const bonusSummaryText = useMemo(() => {
    let totalGold = 0;
    let totalXp = 0;
    for (const item of sortedLootItems) {
      if (item.kind === 'gold' && item.amount) totalGold += item.amount;
      if (item.kind === 'xp' && item.amount) totalXp += item.amount;
      if (item.duplicateConvertedGold) totalGold += item.duplicateConvertedGold;
    }
    const parts: string[] = [];
    if (totalGold > 0) parts.push(`+${totalGold.toLocaleString('tr-TR')} Altın`);
    if (totalXp > 0) parts.push(`+${totalXp.toLocaleString('tr-TR')} XP`);
    return parts.join(' · ');
  }, [sortedLootItems]);

  const activeShowcaseItem =
    visualDrops[Math.min(activeShowcaseIdx, Math.max(0, visualDrops.length - 1))] ||
    null;

  const activeDisplayRarity: LootRarity = useMemo(() => {
    if (phase === 'showcase' && activeShowcaseItem) {
      return activeShowcaseItem.rarity;
    }
    if (phase === 'burst' || phase === 'revealed') return highestRarity;
    const idx = Math.max(0, Math.min(3, beatStage));
    return rarityProgression[idx];
  }, [phase, activeShowcaseItem, highestRarity, beatStage, rarityProgression]);

  const activePalette = RARITY_THEMES[activeDisplayRarity];
  const finalPalette = RARITY_THEMES[highestRarity];

  const heroDrop = sortedLootItems.length > 0 ? sortedLootItems[0] : null;
  const secondaryDrops =
    sortedLootItems.length > 1 ? sortedLootItems.slice(1) : [];

  const resolvedBaseCar = showcaseCar || DEFAULT_SHOWCASE_CAR;

  const triggerBurstNow = useCallback(() => {
    if (burstTriggeredRef.current) return;
    burstTriggeredRef.current = true;
    beatStageRef.current = 3;
    setBeatStage(3);
    setChargeProgress(100);
    setUpgradeBannerText(null);
    setPhase('burst');
    setBurstSeq((s) => s + 1);
    triggerNativeHaptic('heavy');
    playCrateBurstSfx(highestRarity);
  }, [highestRarity]);

  const advanceBeat = useCallback(
    (targetBeat: number) => {
      if (burstTriggeredRef.current) return;
      if (targetBeat <= beatStageRef.current) return;

      const prevRarity = rarityProgression[Math.min(3, beatStageRef.current)];
      const nextRarity = rarityProgression[Math.min(3, targetBeat)];
      const upgraded = RARITY_RANK[nextRarity] > RARITY_RANK[prevRarity];

      beatStageRef.current = targetBeat;
      setBeatStage(targetBeat);
      setTapRecoilKey((k) => k + 1);
      setPulseSeq((p) => p + 1);

      if (targetBeat >= 3) {
        triggerBurstNow();
        return;
      }

      const floorPct = targetBeat === 1 ? 36 : 72;
      chargeFloorRef.current = Math.max(chargeFloorRef.current, floorPct);
      setChargeProgress((prev) => Math.max(prev, floorPct));

      triggerNativeHaptic(upgraded ? 'medium' : 'light');
      playCrateTapChargeSfx(targetBeat, nextRarity, upgraded);

      if (upgraded) {
        setUpgradeBannerText(`${RARITY_THEMES[nextRarity].label.toUpperCase()} YÜKSELTME!`);
      }
    },
    [rarityProgression, triggerBurstNow],
  );

  const handleVaultInteract = useCallback(() => {
    if (burstTriggeredRef.current) return;
    if (phase === 'drop') {
      setPhase('charging');
      advanceBeat(1);
      return;
    }
    if (phase === 'charging') {
      advanceBeat(beatStageRef.current + 1);
    }
  }, [phase, advanceBeat]);

  const handleSkip = useCallback(() => {
    burstTriggeredRef.current = true;
    if (visualDrops.length > 0 && !prefersReducedMotion) {
      setActiveShowcaseIdx(0);
      setPhase('showcase');
    } else {
      setPhase('revealed');
    }
  }, [visualDrops.length, prefersReducedMotion]);

  // Main timeline orchestration: drop -> charging -> burst -> Rocket League 3D showcase -> revealed
  useEffect(() => {
    if (!shouldAnimate) return;
    const timers: number[] = [];

    if (phase === 'drop') {
      playCrateDropSfx();
      triggerNativeHaptic('medium');
      timers.push(
        window.setTimeout(() => {
          if (!burstTriggeredRef.current) {
            setPhase('charging');
          }
        }, 380),
      );
    } else if (phase === 'charging') {
      playCrateChargeSfx(1.38);

      const startMs = performance.now();
      const autoDurationMs = 1420;
      let rafId = 0;
      const step = (now: number) => {
        if (burstTriggeredRef.current) return;
        const autoPct = Math.min(100, ((now - startMs) / autoDurationMs) * 100);
        const pct = Math.max(chargeFloorRef.current, autoPct);
        setChargeProgress(pct);

        if (pct >= 30 && beatStageRef.current < 1) {
          advanceBeat(1);
        } else if (pct >= 66 && beatStageRef.current < 2) {
          advanceBeat(2);
        } else if (pct >= 99 && beatStageRef.current < 3) {
          triggerBurstNow();
          return;
        }

        if (pct < 100 && !burstTriggeredRef.current) {
          rafId = window.requestAnimationFrame(step);
        }
      };
      rafId = window.requestAnimationFrame(step);

      timers.push(
        window.setTimeout(() => {
          triggerBurstNow();
        }, autoDurationMs + 140),
      );

      return () => {
        window.cancelAnimationFrame(rafId);
        timers.forEach((id) => window.clearTimeout(id));
      };
    } else if (phase === 'burst') {
      timers.push(
        window.setTimeout(() => {
          if (visualDrops.length > 0) {
            setActiveShowcaseIdx(0);
            setPhase('showcase');
          } else {
            setPhase('revealed');
          }
        }, 780),
      );
    } else if (phase === 'showcase' && activeShowcaseItem) {
      playLootCardTickSfx(activeShowcaseItem.rarity, 0);
    } else if (phase === 'revealed' && sortedLootItems.length > 0) {
      sortedLootItems.slice(0, 8).forEach((loot, idx) => {
        timers.push(
          window.setTimeout(
            () => {
              playLootCardTickSfx(loot.rarity, idx);
            },
            90 + idx * 100,
          ),
        );
      });
    }

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [
    phase,
    shouldAnimate,
    advanceBeat,
    triggerBurstNow,
    sortedLootItems,
    visualDrops.length,
    activeShowcaseItem,
  ]);

  const statusHeadline =
    phase === 'drop'
      ? 'KASA İNDİRİLİYOR'
      : phase === 'charging'
        ? beatStage === 0
          ? 'KİLİT ÇÖZÜLÜYOR'
          : beatStage === 1
            ? 'BASINÇ ARTIYOR'
            : 'PATLAMAYA HAZIR!'
        : finalPalette.burstCallout;

  const isPreReveal =
    phase === 'drop' || phase === 'charging' || phase === 'burst';

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden p-4"
      style={{
        background:
          'linear-gradient(180deg, #06080f 0%, #0b0e18 48%, #05060a 100%)',
      }}
    >
      {/* Subtle Top Hangar Overhead Lighting Wash */}
      {phase !== 'showcase' && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 transition-all duration-300"
          style={{
            background: `linear-gradient(180deg, ${activePalette.glowHex} 0%, transparent 40%)`,
            opacity:
              phase === 'burst'
                ? 0.55
                : phase === 'charging'
                  ? 0.16 + chargeProgress * 0.0024
                  : phase === 'revealed'
                    ? 0.2
                    : 0.14,
          }}
        />
      )}

      {/* Full-Screen 60 FPS Canvas2D FX Engine (active during vault ritual & revealed list; hidden during 3D WebGL showcase for max FPS) */}
      {phase !== 'showcase' && (
        <CrateFxCanvas
          phase={phase}
          chargeRatio={chargeProgress / 100}
          accentHex={activePalette.accentHex}
          secondaryHex={activePalette.secondaryHex}
          rarity={activeDisplayRarity}
          pulseSeq={pulseSeq}
          burstSeq={burstSeq}
          disabled={prefersReducedMotion}
        />
      )}

      {/* Skip Button during animated vault stages */}
      {isPreReveal && (
        <button
          type="button"
          onClick={handleSkip}
          className="absolute top-4 right-4 z-30 flex h-10 items-center gap-1.5 rounded-xl border border-white/15 bg-zinc-900/90 px-3.5 text-xs font-bold text-zinc-200 transition-colors hover:bg-zinc-800 hover:text-white cursor-pointer"
          style={{ marginTop: 'env(safe-area-inset-top)' }}
        >
          <SkipForward className="h-3.5 w-3.5 text-amber-400" />
          <span>Atla</span>
        </button>
      )}

      {/* ============ STAGE 1, 2 & 3: DROP -> 3-BEAT INTERACTIVE CHARGE -> EXPLOSIVE BURST ============ */}
      {isPreReveal ? (
        <div
          className={`relative z-20 flex w-full max-w-md flex-col items-center justify-center text-center select-none ${
            phase === 'burst' ? 'animate-crate-screen-shake' : ''
          }`}
        >
          {/* Top Crate Tier Badge & Upgrade Surge Callout */}
          <div className="mb-5 flex min-h-[54px] flex-col items-center justify-end gap-1.5">
            <span
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider transition-colors duration-300 ${activePalette.badgeBgClass}`}
            >
              {activeDisplayRarity === 'legendary' ? (
                <Crown className="h-3.5 w-3.5 text-amber-300" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              <span>{crateTitle || title}</span>
            </span>

            {phase === 'burst' ? (
              <div
                className="animate-crate-callout-slam font-display text-3xl font-black uppercase tracking-wider text-white"
                style={{
                  textShadow: `0 0 24px ${finalPalette.accentHex}, 0 4px 18px rgba(0,0,0,0.85)`,
                }}
              >
                {finalPalette.burstCallout}
              </div>
            ) : upgradeBannerText ? (
              <div
                key={upgradeBannerText}
                className="animate-crate-callout-slam text-xs font-black uppercase tracking-widest"
                style={{
                  color: activePalette.secondaryHex,
                  textShadow: `0 0 14px ${activePalette.accentHex}`,
                }}
              >
                {upgradeBannerText}
              </div>
            ) : null}
          </div>

          {/* Interactive 3D Armored Motorsport Vault */}
          <button
            type="button"
            onClick={handleVaultInteract}
            aria-label="Kasayı hızlandır veya aç"
            className="relative flex items-center justify-center focus:outline-none cursor-pointer"
          >
            <ArmoredVaultVisual
              phase={phase}
              chargeRatio={chargeProgress / 100}
              beatStage={beatStage}
              accentHex={activePalette.accentHex}
              secondaryHex={activePalette.secondaryHex}
              glowHex={activePalette.glowHex}
              tier={effectiveTier}
              tapRecoilKey={tapRecoilKey}
            />
          </button>

          {/* Bottom Telemetry Status, 3 Hydraulic Bolt Pips & Charge Gauge */}
          <div className="mt-5 flex w-72 flex-col items-center gap-3">
            <div className="flex items-center gap-2.5">
              {[1, 2, 3].map((stepNum) => {
                const active = beatStage >= stepNum || phase === 'burst';
                return (
                  <div
                    key={stepNum}
                    className="h-2.5 w-14 rounded-full border transition-all duration-200"
                    style={{
                      borderColor: active
                        ? activePalette.secondaryHex
                        : 'rgba(255,255,255,0.14)',
                      backgroundColor: active
                        ? activePalette.accentHex
                        : 'rgba(24,24,27,0.85)',
                      boxShadow: active
                        ? `0 0 14px ${activePalette.accentHex}`
                        : 'none',
                      transform: active ? 'scaleY(1.15)' : 'scaleY(1)',
                    }}
                  />
                );
              })}
            </div>

            <div
              className={`font-display text-lg font-black tracking-wide transition-colors duration-200 ${activePalette.textClass}`}
              style={{
                textShadow: `0 0 16px ${activePalette.glowHex}`,
              }}
            >
              {statusHeadline}
            </div>

            <div className="h-2 w-full overflow-hidden rounded-full border border-white/12 bg-zinc-900/95">
              <div
                className={`h-full rounded-full transition-[width] duration-75 ${activePalette.barClass}`}
                style={{
                  width: `${phase === 'burst' ? 100 : Math.max(6, chargeProgress)}%`,
                  boxShadow: `0 0 12px ${activePalette.accentHex}`,
                }}
              />
            </div>

            <p className="text-xs font-semibold text-zinc-400">
              {phase === 'burst'
                ? 'Ödülün aracının üzerinde hazırlanıyor...'
                : 'Kilitleri hızla kırmak için kasaya dokun'}
            </p>
          </div>
        </div>
      ) : phase === 'showcase' && activeShowcaseItem ? (
        /* ============ STAGE 3.5: ROCKET LEAGUE–STYLE 3D CAR SHOWCASE WITH CIRCULAR ZOOM ============ */
        <div className="fixed inset-0 z-20 overflow-hidden bg-[#070910]">
          {/* Unobstructed Full-Screen 3D Car & Part Orbit Viewport */}
          <CrateCarShowcase3D
            lootItem={activeShowcaseItem}
            baseCar={resolvedBaseCar}
            accentHex={activePalette.accentHex}
            secondaryHex={activePalette.secondaryHex}
          />

          {/* Top Floating Item Header (Compact, Zero Center Occlusion, No backdrop-blur) */}
          <div
            className="pointer-events-none absolute inset-x-3 top-3 z-30 flex items-start justify-between gap-2 sm:inset-x-4 sm:top-4"
            style={{ marginTop: 'env(safe-area-inset-top)' }}
          >
            {!showcaseHudHidden ? (
              <div
                className="pointer-events-auto animate-crate-callout-slam min-w-0 max-w-[calc(100%-6.25rem)] sm:max-w-md rounded-2xl border bg-zinc-950/90 px-3 py-2 sm:px-4 sm:py-2.5 shadow-2xl"
                style={{
                  borderColor: activePalette.accentHex,
                  boxShadow: `0 10px 28px rgba(0,0,0,0.72), 0 0 20px ${activePalette.glowHex}`,
                }}
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${activePalette.badgeBgClass}`}
                  >
                    {activeShowcaseItem.rarity === 'legendary' ? (
                      <Crown className="h-3 w-3 text-amber-300" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    <span>{activePalette.label}</span>
                  </span>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">
                    {getShowcaseFocusLabel(activeShowcaseItem)}
                  </span>
                  {visualDrops.length > 1 && (
                    <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono-num text-[10px] font-bold text-zinc-200">
                      {activeShowcaseIdx + 1}/{visualDrops.length}
                    </span>
                  )}
                  {bonusSummaryText && (
                    <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 font-mono-num text-[10px] font-extrabold text-amber-300">
                      <Coins className="h-3 w-3" />
                      <span>{bonusSummaryText}</span>
                    </span>
                  )}
                </div>
                <h3 className="mt-0.5 truncate font-display text-base font-black text-white sm:text-xl">
                  {activeShowcaseItem.title}
                </h3>
                <p className="truncate text-[11px] font-medium text-zinc-300 sm:text-xs">
                  {activeShowcaseItem.duplicateConvertedGold
                    ? `+${activeShowcaseItem.duplicateConvertedGold.toLocaleString('tr-TR')} Altın telafisi`
                    : activeShowcaseItem.subtitle}
                </p>
              </div>
            ) : (
              <div />
            )}

            <div className="pointer-events-auto flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowcaseHudHidden((prev) => !prev)}
                aria-label={showcaseHudHidden ? 'Arayüzü Göster' : 'Arayüzü Gizle'}
                title={showcaseHudHidden ? 'Arayüzü Göster' : 'Arayüzü Gizle'}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-zinc-950/90 text-zinc-200 transition-colors hover:bg-zinc-800 hover:text-white cursor-pointer"
              >
                {showcaseHudHidden ? (
                  <Eye className="h-4.5 w-4.5 text-amber-400" />
                ) : (
                  <EyeOff className="h-4.5 w-4.5" />
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Kapat"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-zinc-950/90 text-zinc-200 transition-colors hover:bg-zinc-800 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Unified Ultra-Compact Single-Row Bottom Dock (Never Stacks Over Car on Mobile) */}
          {!showcaseHudHidden && (
            <div
              className="pointer-events-none absolute inset-x-3 bottom-3 z-30 flex justify-center sm:inset-x-4 sm:bottom-4"
              style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
            >
              <div className="pointer-events-auto flex w-full max-w-2xl flex-col gap-2 rounded-2xl border border-white/12 bg-zinc-950/90 p-2.5 sm:p-3 shadow-2xl">
                {/* Single-Row Horizontally Scrollable Item Strip (never wraps into tall multi-row stacks) */}
                {visualDrops.length > 1 ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const nextIdx =
                          (activeShowcaseIdx - 1 + visualDrops.length) %
                          visualDrops.length;
                        setActiveShowcaseIdx(nextIdx);
                        playLootCardTickSfx(visualDrops[nextIdx].rarity, nextIdx);
                      }}
                      aria-label="Önceki parça"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/12 bg-zinc-900 text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white cursor-pointer"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>

                    <div
                      ref={chipStripRef}
                      className="no-scrollbar flex min-w-0 flex-1 flex-nowrap items-center gap-1.5 overflow-x-auto"
                    >
                      {visualDrops.map((drop, idx) => {
                        const isActive = idx === activeShowcaseIdx;
                        const dropPalette = RARITY_THEMES[drop.rarity];
                        return (
                          <button
                            key={drop.id}
                            ref={(el) => {
                              chipButtonsRef.current[idx] = el;
                            }}
                            type="button"
                            onClick={() => {
                              setActiveShowcaseIdx(idx);
                              playLootCardTickSfx(drop.rarity, idx);
                            }}
                            className={`flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-bold transition-colors cursor-pointer ${
                              isActive
                                ? 'bg-zinc-800 text-white'
                                : 'border-white/10 bg-zinc-900/90 text-zinc-400 hover:text-white'
                            }`}
                            style={
                              isActive
                                ? { borderColor: dropPalette.accentHex }
                                : undefined
                            }
                          >
                            {renderLootIcon(drop)}
                            <span className="max-w-[110px] truncate sm:max-w-[140px]">
                              {drop.title}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const nextIdx =
                          (activeShowcaseIdx + 1) % visualDrops.length;
                        setActiveShowcaseIdx(nextIdx);
                        playLootCardTickSfx(visualDrops[nextIdx].rarity, nextIdx);
                      }}
                      aria-label="Sonraki parça"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/12 bg-zinc-900 text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white cursor-pointer"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-zinc-400">
                    <RotateCw className="h-3 w-3 text-zinc-400" />
                    <span>İncelemek için sürükle</span>
                  </div>
                )}

                {/* Compact Single-Row Action Bar (Always Horizontal on Mobile & Desktop) */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPhase('revealed')}
                    className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-zinc-900 px-2.5 font-display text-xs font-bold text-white transition-colors hover:bg-zinc-800 sm:px-4 sm:text-sm cursor-pointer whitespace-nowrap"
                  >
                    <LayoutGrid className="h-4 w-4 shrink-0 text-sky-400" />
                    <span className="sm:hidden">Ödüller ({sortedLootItems.length})</span>
                    <span className="hidden sm:inline">
                      Tüm Ödüller ({sortedLootItems.length})
                    </span>
                  </button>
                  {unlockedCarNames.length > 0 && onOpenGarage && (
                    <button
                      type="button"
                      onClick={onOpenGarage}
                      className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-zinc-900 px-2.5 font-display text-xs font-bold text-white transition-colors hover:bg-zinc-800 sm:px-4 sm:text-sm cursor-pointer whitespace-nowrap"
                    >
                      <CarFront className="h-4 w-4 shrink-0 text-amber-400" />
                      <span className="sm:hidden">Garaj</span>
                      <span className="hidden sm:inline">Garajda Gör</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-3 font-display text-xs font-extrabold text-zinc-950 transition-colors hover:bg-amber-400 sm:px-5 sm:text-sm cursor-pointer whitespace-nowrap"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>{ctaLabel}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ============ STAGE 4: CELEBRATORY HERO SPOTLIGHT & FULL LOOT SUMMARY ============ */
        <div
          className="animate-sheet-up relative z-20 flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border bg-zinc-950/96 shadow-2xl"
          style={{
            borderColor: finalPalette.accentHex,
            boxShadow: `0 28px 72px rgba(0, 0, 0, 0.9), 0 0 48px ${finalPalette.glowHex}`,
          }}
        >
          {/* Header with rotating volumetric sunburst */}
          <div className="relative overflow-hidden border-b border-white/10 bg-zinc-900/85 px-5 py-4">
            <div
              aria-hidden="true"
              className="animate-crate-sunburst pointer-events-none absolute -top-24 -left-16 h-64 w-64 opacity-30"
              style={{
                background: `conic-gradient(from 0deg, transparent 0deg, ${finalPalette.accentHex} 18deg, transparent 36deg, transparent 72deg, ${finalPalette.accentHex} 90deg, transparent 108deg, transparent 144deg, ${finalPalette.accentHex} 162deg, transparent 180deg, transparent 216deg, ${finalPalette.accentHex} 234deg, transparent 252deg, transparent 288deg, ${finalPalette.accentHex} 306deg, transparent 324deg)`,
                maskImage:
                  'radial-gradient(circle, rgba(0,0,0,1) 12%, transparent 70%)',
                WebkitMaskImage:
                  'radial-gradient(circle, rgba(0,0,0,1) 12%, transparent 70%)',
              }}
            />

            <div className="relative z-10 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${finalPalette.badgeBgClass}`}
                  style={{ boxShadow: `0 0 18px ${finalPalette.glowHex}` }}
                >
                  {highestRarity === 'legendary' ? (
                    <Crown className="h-5 w-5 text-amber-300" />
                  ) : (
                    <Sparkles className="h-5 w-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-xs font-semibold text-emerald-300">
                      {subtitle}
                    </span>
                    {sortedLootItems.length > 0 && (
                      <span
                        className={`rounded-md border px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${finalPalette.badgeBgClass}`}
                      >
                        {finalPalette.label}
                      </span>
                    )}
                  </div>
                  <h3 className="truncate font-display text-lg font-extrabold text-white">
                    {title}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Kapat"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/12 bg-zinc-900 text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Body: Hero Featured Drop + Staggered Loot Grid OR Single Summary Celebration */}
          <div className="flex-1 overflow-y-auto p-5">
            {heroDrop ? (
              <div className="flex flex-col gap-3.5">
                {(() => {
                  const heroTheme = RARITY_THEMES[heroDrop.rarity];
                  const heroCardStyle = RARITY_CARD_STYLES[heroDrop.rarity];
                  const heroCanPreview = isVisualShowcaseItem(heroDrop);
                  return (
                    <div
                      className={`animate-loot-hero-reveal relative overflow-hidden rounded-2xl border-2 p-4 sm:p-5 ${heroCardStyle.borderClass}`}
                      style={{
                        background: heroTheme.heroBgGradient,
                        boxShadow: `0 12px 34px rgba(0,0,0,0.55), 0 0 32px ${heroTheme.glowHex}`,
                      }}
                    >
                      <div
                        aria-hidden="true"
                        className="animate-crate-sunburst pointer-events-none absolute top-1/2 -left-10 h-56 w-56 -translate-y-1/2 opacity-30"
                        style={{
                          background: `conic-gradient(from 0deg, transparent 0deg, ${heroTheme.secondaryHex} 16deg, transparent 32deg, transparent 72deg, ${heroTheme.accentHex} 88deg, transparent 104deg, transparent 144deg, ${heroTheme.secondaryHex} 160deg, transparent 176deg, transparent 216deg, ${heroTheme.accentHex} 232deg, transparent 248deg, transparent 288deg, ${heroTheme.secondaryHex} 304deg, transparent 320deg)`,
                          maskImage:
                            'radial-gradient(circle, rgba(0,0,0,1) 14%, transparent 68%)',
                          WebkitMaskImage:
                            'radial-gradient(circle, rgba(0,0,0,1) 14%, transparent 68%)',
                        }}
                      />

                      <div
                        aria-hidden="true"
                        className="animate-loot-sheen pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                        style={{ animationDelay: '200ms' }}
                      />

                      <div className="relative z-10 flex items-center gap-4">
                        <div
                          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border bg-zinc-950/90 shadow-xl"
                          style={{
                            borderColor: heroTheme.accentHex,
                            boxShadow: `0 0 24px ${heroTheme.glowHex}`,
                          }}
                        >
                          {renderLootIcon(heroDrop, true)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${heroTheme.badgeBgClass}`}
                            >
                              {heroDrop.rarity === 'legendary' && (
                                <Crown className="h-3 w-3 text-amber-300" />
                              )}
                              <span>{heroTheme.label}</span>
                            </span>
                            {sortedLootItems.length > 1 && (
                              <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">
                                BAŞ ÖDÜL
                              </span>
                            )}
                          </div>
                          <div className="mt-1 truncate font-display text-lg font-black text-white sm:text-xl">
                            {heroDrop.title}
                          </div>
                          <div className="mt-0.5 truncate text-xs font-medium text-zinc-200">
                            {heroDrop.duplicateConvertedGold
                              ? `+${heroDrop.duplicateConvertedGold.toLocaleString('tr-TR')} Altın telafisi`
                              : heroDrop.subtitle}
                          </div>
                        </div>

                        {heroCanPreview && (
                          <button
                            type="button"
                            onClick={() => {
                              const vIdx = visualDrops.findIndex(
                                (v) => v.id === heroDrop.id,
                              );
                              setActiveShowcaseIdx(Math.max(0, vIdx));
                              setPhase('showcase');
                            }}
                            className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-white/20 bg-zinc-950/85 px-3 text-xs font-bold text-white transition-colors hover:bg-zinc-800 cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5 text-amber-400" />
                            <span>3D Gör</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Secondary Loot Cards Grid */}
                {secondaryDrops.length > 0 && (
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {secondaryDrops.map((loot, idx) => {
                      const style = RARITY_CARD_STYLES[loot.rarity];
                      const showSheen =
                        loot.rarity === 'rare' ||
                        loot.rarity === 'epic' ||
                        loot.rarity === 'legendary';
                      const canPreview = isVisualShowcaseItem(loot);
                      const delayMs = 140 + idx * 90;
                      return (
                        <div
                          key={loot.id}
                          onClick={
                            canPreview
                              ? () => {
                                  const vIdx = visualDrops.findIndex(
                                    (v) => v.id === loot.id,
                                  );
                                  if (vIdx >= 0) {
                                    setActiveShowcaseIdx(vIdx);
                                    setPhase('showcase');
                                  }
                                }
                              : undefined
                          }
                          className={`animate-loot-card-flip relative flex items-center gap-3 overflow-hidden rounded-xl border py-3 pr-3.5 pl-4 ${style.borderClass} ${style.bgClass} ${
                            canPreview ? 'cursor-pointer hover:brightness-110' : ''
                          }`}
                          style={{
                            animationDelay: `${delayMs}ms`,
                            boxShadow: style.glowShadow,
                          }}
                        >
                          <span
                            aria-hidden="true"
                            className={`absolute inset-y-0 left-0 w-1 ${style.accentBarClass}`}
                          />

                          {showSheen && (
                            <div
                              aria-hidden="true"
                              className="animate-loot-sheen pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                              style={{ animationDelay: `${delayMs + 190}ms` }}
                            />
                          )}

                          <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-zinc-950/88">
                            {renderLootIcon(loot)}
                          </div>

                          <div className="relative z-10 min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="truncate font-display text-sm font-extrabold text-white">
                                {loot.title}
                              </span>
                              <span
                                className={`shrink-0 text-[10px] font-extrabold uppercase tracking-wide ${style.textClass}`}
                              >
                                {style.label}
                              </span>
                            </div>
                            <div className="mt-0.5 truncate text-xs text-zinc-300">
                              {loot.duplicateConvertedGold
                                ? `+${loot.duplicateConvertedGold.toLocaleString('tr-TR')} Altın telafisi`
                                : loot.subtitle}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-400/40 bg-amber-500/15">
                  <Coins className="h-9 w-9 text-amber-400" />
                </div>
                <div className="font-display text-2xl font-extrabold text-white">
                  {rewardSummary}
                </div>
                {adFreeActivated && (
                  <p className="text-xs text-emerald-300">
                    Zorunlu geçiş reklamları hesabında kalıcı olarak kapatıldı.
                  </p>
                )}
              </div>
            )}

            {adFreeActivated && sortedLootItems.length > 0 && (
              <div className="mt-3.5 rounded-xl border border-emerald-400/35 bg-emerald-500/10 px-3.5 py-2.5 text-center text-xs font-semibold text-emerald-200">
                Reklamsız VIP aktif edildi · Zorunlu geçiş reklamları kalıcı
                olarak kaldırıldı.
              </div>
            )}
          </div>

          {/* Bottom Action Bar */}
          <div className="flex flex-col gap-2 border-t border-white/10 bg-zinc-900/65 p-4 sm:flex-row">
            {visualDrops.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setActiveShowcaseIdx(0);
                  setPhase('showcase');
                }}
                className="flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 bg-zinc-900 px-4 font-display text-sm font-bold text-white transition-colors hover:bg-zinc-800 cursor-pointer"
              >
                <Eye className="h-4 w-4 text-sky-400" />
                <span>3D Arabada Gör</span>
              </button>
            )}
            {unlockedCarNames.length > 0 && onOpenGarage && (
              <button
                type="button"
                onClick={onOpenGarage}
                className="flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 bg-zinc-900 px-4 font-display text-sm font-bold text-white transition-colors hover:bg-zinc-800 cursor-pointer"
              >
                <CarFront className="h-4 w-4 text-amber-400" />
                <span>Garajda Gör</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 font-display text-sm font-extrabold text-zinc-950 transition-colors hover:bg-amber-400 cursor-pointer"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{ctaLabel}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

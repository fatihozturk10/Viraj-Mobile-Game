import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Coins,
  Crown,
  Flame,
  Gift,
  HeartPulse,
  Lock,
  Magnet,
  Package,
  Palette,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import {
  getDriverRankTier,
  ITEM_RARITY_META,
  MAX_LEVEL_ROAD_LEVEL,
  PlayerLevelInfo,
} from '../types/game';
import {
  getUnclaimedLevelRewardsCount,
  LEVEL_ROAD_REWARDS,
  LevelRoadReward,
} from '../game/levelRoad';
import { DriverLevelEmblem, SegmentedXpBar } from './DriverLevelEmblem';
import { playLevelRewardClaimSfx } from '../services/crateAudio';

interface LevelRoadModalProps {
  open: boolean;
  playerLevel: PlayerLevelInfo;
  claimedLevels: number[];
  focusLevel?: number | null;
  onClose: () => void;
  onClaimLevel: (level: number) => void;
  onClaimAll: () => void;
}

const NODE_WIDTH_PX = 184;

const TIER_RANGES = [
  { label: '1–25', start: 1, end: 25 },
  { label: '26–50', start: 26, end: 50 },
  { label: '51–75', start: 51, end: 75 },
  { label: '76–100', start: 76, end: 100 },
] as const;

function renderRewardArtwork(reward: LevelRoadReward): React.ReactNode {
  if (reward.kind === 'powerup_unlock') {
    const icon =
      reward.powerUpId === 'nitro' ? (
        <Flame className="h-7 w-7 text-cyan-200 drop-shadow-[0_0_12px_rgba(34,211,238,0.85)]" />
      ) : reward.powerUpId === 'repair' ? (
        <HeartPulse className="h-7 w-7 text-emerald-200 drop-shadow-[0_0_12px_rgba(52,211,153,0.85)]" />
      ) : reward.powerUpId === 'magnet' ? (
        <Magnet className="h-7 w-7 text-rose-200 drop-shadow-[0_0_12px_rgba(251,113,133,0.85)]" />
      ) : (
        <Zap className="h-7 w-7 fill-orange-300 text-orange-100 drop-shadow-[0_0_12px_rgba(249,115,22,0.9)]" />
      );
    return (
      <div
        className="ug-cut-sm relative flex h-14 w-14 items-center justify-center border border-white/30 shadow-lg"
        style={{ background: reward.swatch }}
      >
        {icon}
      </div>
    );
  }

  if (reward.kind === 'car_color') {
    return (
      <div className="relative h-14 w-14">
        <div className="ug-cut-sm flex h-full w-full items-center justify-center border border-white/25 bg-[#090b12] p-1.5 shadow-inner">
          <div
            className="ug-cut-sm h-full w-full border border-white/35 shadow-md"
            style={{ background: reward.swatch }}
          />
        </div>
        <span className="ug-cut-sm absolute -right-1 -bottom-1 flex h-5 w-5 items-center justify-center border border-orange-400/70 bg-[#090b12] text-orange-300">
          <Palette className="h-3 w-3" />
        </span>
      </div>
    );
  }

  if (reward.kind === 'visual') {
    const isTopMilestone = reward.level === 100 || reward.level === 50 || reward.level === 95;
    return (
      <div
        className="ug-cut-sm relative flex h-14 w-14 items-center justify-center border border-white/30 shadow-lg"
        style={{ background: reward.swatch }}
      >
        <div className="ug-cut-sm flex h-9 w-9 items-center justify-center bg-black/45 border border-white/20">
          {isTopMilestone ? (
            <Crown className="h-5 w-5 text-amber-300" />
          ) : (
            <Sparkles className="h-5 w-5 text-white" />
          )}
        </div>
      </div>
    );
  }

  if (reward.kind === 'crate') {
    return (
      <div
        className="ug-cut-sm relative flex h-14 w-14 items-center justify-center border border-white/30 shadow-lg"
        style={{ background: reward.swatch }}
      >
        <Package className="h-7 w-7 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]" />
      </div>
    );
  }

  return (
    <div className="ug-cut-sm relative flex h-14 w-14 items-center justify-center border border-orange-400/40 bg-gradient-to-br from-orange-500/20 to-amber-500/10 shadow-inner">
      <Coins className="h-7 w-7 text-amber-400" />
    </div>
  );
}

export const LevelRoadModal: React.FC<LevelRoadModalProps> = ({
  open,
  playerLevel,
  claimedLevels,
  focusLevel,
  onClose,
  onClaimLevel,
  onClaimAll,
}) => {
  const [recentlyClaimed, setRecentlyClaimed] = useState<number | null>(null);
  const trackScrollRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef({
    dragging: false,
    startX: 0,
    startScrollLeft: 0,
    moved: false,
  });

  const claimedSet = useMemo(() => new Set(claimedLevels), [claimedLevels]);
  const currentRankTier = useMemo(
    () => getDriverRankTier(playerLevel.level),
    [playerLevel.level],
  );
  const unclaimedCount = useMemo(
    () => getUnclaimedLevelRewardsCount(playerLevel.level, claimedLevels),
    [playerLevel.level, claimedLevels],
  );

  const clampedProgressLevel = Math.min(
    MAX_LEVEL_ROAD_LEVEL,
    Math.max(1, playerLevel.level),
  );

  const scrollToLevel = (targetLevel: number, behavior: ScrollBehavior = 'smooth') => {
    const el = trackScrollRef.current;
    if (!el) return;
    const clamped = Math.max(1, Math.min(MAX_LEVEL_ROAD_LEVEL, targetLevel));
    const centerOffset =
      (clamped - 1) * NODE_WIDTH_PX + NODE_WIDTH_PX * 0.5 - el.clientWidth * 0.5;
    el.scrollTo({
      left: Math.max(0, centerOffset),
      behavior,
    });
  };

  useEffect(() => {
    if (!open) return;
    const id = window.requestAnimationFrame(() => {
      if (focusLevel && focusLevel >= 1 && focusLevel <= MAX_LEVEL_ROAD_LEVEL) {
        scrollToLevel(focusLevel, 'auto');
        return;
      }
      // Jump to first unclaimed reward, else current player level
      let firstUnclaimed: number | null = null;
      for (let lv = 1; lv <= clampedProgressLevel; lv++) {
        if (!claimedSet.has(lv)) {
          firstUnclaimed = lv;
          break;
        }
      }
      scrollToLevel(firstUnclaimed ?? clampedProgressLevel, 'auto');
    });
    return () => window.cancelAnimationFrame(id);
  }, [open, focusLevel, clampedProgressLevel, claimedSet]);

  if (!open) return null;

  const handleWheelScroll = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = trackScrollRef.current;
    if (!el) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      el.scrollLeft += e.deltaY * 1.15;
    }
  };

  const handleTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only drag-scroll on mouse/pen, let native touch scrolling handle mobile fingers cleanly
    if (e.pointerType === 'touch') return;
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;
    const el = trackScrollRef.current;
    if (!el) return;
    dragStateRef.current = {
      dragging: true,
      startX: e.clientX,
      startScrollLeft: el.scrollLeft,
      moved: false,
    };
  };

  const handleTrackPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const st = dragStateRef.current;
    if (!st.dragging) return;
    const el = trackScrollRef.current;
    if (!el) return;
    const dx = e.clientX - st.startX;
    if (Math.abs(dx) > 4) st.moved = true;
    el.scrollLeft = st.startScrollLeft - dx;
  };

  const handleTrackPointerUp = () => {
    dragStateRef.current.dragging = false;
  };

  const handleClaimNode = (reward: LevelRoadReward) => {
    playLevelRewardClaimSfx(reward.exclusive || reward.kind === 'crate');
    setRecentlyClaimed(reward.level);
    onClaimLevel(reward.level);
    window.setTimeout(() => {
      setRecentlyClaimed((prev) => (prev === reward.level ? null : prev));
    }, 900);
  };

  const handleClaimAllClick = () => {
    playLevelRewardClaimSfx(true);
    onClaimAll();
  };

  // Horizontal progress rail exact pixel length from node 1 center to current level + partial XP progress
  const fractionalProgress =
    playerLevel.level >= MAX_LEVEL_ROAD_LEVEL
      ? MAX_LEVEL_ROAD_LEVEL - 1
      : Math.max(0, playerLevel.level - 1) + playerLevel.progressRatio;
  const totalTrackPx = NODE_WIDTH_PX * MAX_LEVEL_ROAD_LEVEL;
  const railStartPx = NODE_WIDTH_PX * 0.5;
  const railTotalSpanPx = NODE_WIDTH_PX * (MAX_LEVEL_ROAD_LEVEL - 1);
  const railFillPx = Math.min(
    railTotalSpanPx,
    Math.max(0, fractionalProgress * NODE_WIDTH_PX),
  );

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      className="pointer-events-auto fixed inset-0 z-40 flex items-end justify-center bg-black/86 p-0 sm:items-center sm:p-4"
    >
      <div
        className="animate-sheet-up ug-sheet flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-2xl border-t sm:ug-cut sm:max-h-[90vh] sm:w-[min(96vw,1040px)] sm:rounded-none sm:border"
        style={{
          paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
        }}
      >
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#0b0d14]/90 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <DriverLevelEmblem level={playerLevel.level} size="lg" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 font-display text-[11px] font-bold tracking-wider text-orange-400 uppercase">
                <span>SOKAK ŞÖHRET YOLU · 1 → 100</span>
                <span className="text-zinc-600">·</span>
                <span className="font-mono-num text-zinc-200">
                  {playerLevel.totalXp.toLocaleString('tr-TR')} XP
                </span>
              </div>
              <h2
                className={`truncate font-display italic text-lg font-extrabold uppercase sm:text-xl ${currentRankTier.textClass}`}
              >
                SV. {playerLevel.level} · {playerLevel.rankTitle}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unclaimedCount > 0 && (
              <button
                type="button"
                onClick={handleClaimAllClick}
                className="ug-cut-sm ug-btn-fire flex h-10 items-center gap-1.5 px-3.5 font-display italic text-xs font-extrabold uppercase tracking-wider active:scale-95 cursor-pointer"
              >
                <Gift className="h-4 w-4" />
                <span>Tümünü Topla ({unclaimedCount})</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Kapat"
              className="ug-cut-sm ug-btn-metal flex h-10 w-10 items-center justify-center cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* XP Progress & Quick Jump Controls */}
        <div className="flex flex-col gap-2.5 border-b border-white/10 bg-[#0f131d] px-4 py-3 sm:px-6">
          {/* Active Level XP Meter */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-display font-bold uppercase tracking-wide text-zinc-300">
                Seviye {playerLevel.level + 1} Hedefi
              </span>
              <span className="font-mono-num font-bold text-orange-300">
                {playerLevel.currentLevelXp.toLocaleString('tr-TR')} /{' '}
                {playerLevel.nextLevelXpRequired.toLocaleString('tr-TR')} XP
              </span>
            </div>
            <SegmentedXpBar
              level={playerLevel.level}
              progressRatio={playerLevel.progressRatio}
              segments={12}
              heightClass="h-2"
            />
          </div>

          {/* Quick Jump Range Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
            <div className="flex flex-wrap items-center gap-1.5">
              {TIER_RANGES.map((range) => (
                <button
                  key={range.label}
                  type="button"
                  onClick={() => scrollToLevel(range.start + 1)}
                  className="ug-skew border border-white/12 bg-[#090b12] px-2.5 py-1 font-mono-num text-[11px] font-bold text-zinc-300 transition-colors hover:border-orange-500/60 hover:text-orange-300 cursor-pointer"
                >
                  SV.{range.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => scrollToLevel(clampedProgressLevel)}
                className="ug-skew border border-orange-500/45 bg-orange-500/18 px-3 py-1 font-display text-[11px] font-bold uppercase text-orange-200 hover:bg-orange-500/28 cursor-pointer"
              >
                Konumum (SV.{playerLevel.level})
              </button>
            </div>

            <div className="hidden sm:flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  trackScrollRef.current?.scrollBy({
                    left: -NODE_WIDTH_PX * 3,
                    behavior: 'smooth',
                  });
                }}
                aria-label="Sola Kaydır"
                className="ug-cut-sm ug-btn-metal flex h-7 w-7 items-center justify-center cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  trackScrollRef.current?.scrollBy({
                    left: NODE_WIDTH_PX * 3,
                    behavior: 'smooth',
                  });
                }}
                aria-label="Sağa Kaydır"
                className="ug-cut-sm ug-btn-metal flex h-7 w-7 items-center justify-center cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="ug-carbon relative flex min-h-0 flex-1 flex-col bg-[#080a10]">
            <div className="custom-scroll flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
              {/* Horizontal Left -> Right Track */}
              <div
                ref={trackScrollRef}
                onWheel={handleWheelScroll}
                onPointerDown={handleTrackPointerDown}
                onPointerMove={handleTrackPointerMove}
                onPointerUp={handleTrackPointerUp}
                onPointerLeave={handleTrackPointerUp}
                className="custom-scroll relative shrink-0 my-auto overflow-x-auto overflow-y-hidden select-none cursor-grab active:cursor-grabbing"
              >
                <div
                  className="relative flex items-start pt-3 pb-8"
                  style={{ width: `${totalTrackPx}px` }}
                >
                  {/* Continuous Horizontal Street Progress Rail centered behind Level Number Nodes */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute top-[52px] h-3.5 border-y border-white/15 bg-[#0c0f18] shadow-inner"
                    style={{
                      left: `${railStartPx}px`,
                      width: `${railTotalSpanPx}px`,
                    }}
                  >
                    {/* Asphalt center dashes */}
                    <div
                      className="absolute inset-x-2 top-1/2 h-[2px] -translate-y-1/2 opacity-35"
                      style={{
                        backgroundImage:
                          'repeating-linear-gradient(90deg, #ffffff 0px, #ffffff 12px, transparent 12px, transparent 26px)',
                      }}
                    />
                    {/* Active illuminated Underground street fill from 1 -> current level */}
                    <div
                      className="h-full bg-gradient-to-r from-rose-600 via-orange-500 to-amber-400 shadow-[0_0_18px_rgba(234,88,12,0.65)] transition-[width] duration-500"
                      style={{ width: `${railFillPx}px` }}
                    />
                  </div>

                  {/* 100 Level Columns (Left -> Right: 1, 2, 3, ..., 100) */}
                  {LEVEL_ROAD_REWARDS.map((reward) => {
                    const isUnlocked = playerLevel.level >= reward.level;
                    const isClaimed = claimedSet.has(reward.level);
                    const isClaimable = isUnlocked && !isClaimed;
                    const isCurrent =
                      playerLevel.level === reward.level ||
                      (playerLevel.level >= MAX_LEVEL_ROAD_LEVEL &&
                        reward.level === MAX_LEVEL_ROAD_LEVEL);
                    const isFocused = focusLevel === reward.level;
                    const isJustClaimed = recentlyClaimed === reward.level;
                    const rMeta = ITEM_RARITY_META[reward.rarity];

                    return (
                      <div
                        key={reward.level}
                        className="relative flex shrink-0 flex-col items-center px-2"
                        style={{ width: `${NODE_WIDTH_PX}px` }}
                      >
                        {/* Top Current-Level Marker (fixed height on every column) */}
                        <div className="mb-1 flex h-5 w-full shrink-0 items-center justify-center">
                          {isCurrent ? (
                            <span className="ug-skew ug-btn-fire px-2.5 py-0.5 font-display italic text-[10px] font-black tracking-wider text-white uppercase">
                              BURADASIN
                            </span>
                          ) : reward.kind === 'powerup_unlock' ? (
                            <span className="ug-skew border border-cyan-400/50 bg-cyan-500/20 px-2 py-0.5 font-display italic text-[9px] font-extrabold tracking-wider text-cyan-200 uppercase">
                              GÜÇ AÇILIŞI
                            </span>
                          ) : reward.level === 100 ? (
                            <span className="ug-skew border border-rose-400/60 bg-rose-500/25 px-2 py-0.5 font-display italic text-[9px] font-black tracking-wider text-rose-200 uppercase">
                              BÜYÜK FİNAL
                            </span>
                          ) : reward.exclusive ? (
                            <span className="ug-skew border border-orange-400/45 bg-orange-500/18 px-2 py-0.5 font-display italic text-[9px] font-extrabold tracking-wider text-orange-200 uppercase">
                              SEVİYE ÖZEL
                            </span>
                          ) : null}
                        </div>

                        {/* Level Prestige Emblem Node sitting squarely on the horizontal rail */}
                        <div
                          className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center transition-transform ${
                            isClaimable
                              ? 'scale-112 drop-shadow-[0_0_14px_rgba(249,115,22,0.85)]'
                              : isCurrent
                                ? 'scale-108 drop-shadow-[0_0_12px_rgba(249,115,22,0.55)]'
                                : isUnlocked
                                  ? ''
                                  : 'opacity-60 saturate-50'
                          }`}
                        >
                          <DriverLevelEmblem
                            level={reward.level}
                            size="md"
                            className="!h-12 !w-12"
                          />
                          {isClaimed && (
                            <span className="absolute -right-1 -bottom-1 flex h-5 w-5 items-center justify-center rounded-full border border-zinc-950 bg-emerald-400 text-zinc-950 shadow-sm">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </span>
                          )}
                        </div>

                        {/* Vertical stem from rail node down to reward card */}
                        <div
                          aria-hidden="true"
                          className={`h-3 w-0.5 shrink-0 ${
                            isUnlocked
                              ? 'bg-gradient-to-b from-orange-400 to-rose-500'
                              : 'bg-white/12'
                          }`}
                        />

                        {/* Uniform Fixed-Size Underground Reward Card */}
                        <div
                          className={`ug-cut relative flex h-[234px] w-full shrink-0 flex-col items-center overflow-hidden border p-2.5 text-center transition-all ${
                            isJustClaimed
                              ? 'border-emerald-400 bg-emerald-950/65 shadow-[0_0_26px_rgba(52,211,153,0.45)]'
                              : isClaimable
                                ? 'border-orange-400/85 bg-gradient-to-b from-[#1e1622] to-[#111420] shadow-[0_0_24px_rgba(234,88,12,0.28)]'
                                : isFocused
                                  ? 'border-cyan-400/80 bg-[#131926] shadow-[0_0_20px_rgba(56,189,248,0.25)]'
                                  : isClaimed
                                    ? 'border-emerald-500/30 bg-[#0e151a]/85'
                                    : reward.exclusive || reward.kind === 'powerup_unlock'
                                      ? `${rMeta.borderClass} bg-gradient-to-b from-[#171c2b] to-[#0f121c]`
                                      : 'border-white/10 bg-[#111520]/85'
                          }`}
                        >
                          {/* Top rarity bar */}
                          <span
                            aria-hidden="true"
                            className={`pointer-events-none absolute inset-x-0 top-0 h-1 ${rMeta.barClass}`}
                          />

                          {/* Slot 1: Fixed-height Badge Label */}
                          <div className="mt-0.5 flex h-5 w-full shrink-0 items-center justify-center">
                            <span
                              className={`ug-skew max-w-full truncate px-2 py-0.5 font-display text-[9px] font-extrabold tracking-wider uppercase ${
                                reward.kind === 'powerup_unlock'
                                  ? 'bg-cyan-500/20 text-cyan-200'
                                  : reward.exclusive
                                    ? 'bg-orange-500/22 text-orange-200'
                                    : 'bg-white/8 text-zinc-400'
                              }`}
                            >
                              {reward.badgeLabel}
                            </span>
                          </div>

                          {/* Slot 2: Fixed-height Visual Medallion */}
                          <div className="my-1 flex h-[58px] w-full shrink-0 items-center justify-center">
                            {renderRewardArtwork(reward)}
                          </div>

                          {/* Slot 3: Fixed-slot Title, Subtitle & Optional Bonus Gold */}
                          <div className="flex w-full flex-1 flex-col items-center justify-start overflow-hidden">
                            <div className="flex h-[28px] w-full shrink-0 items-center justify-center">
                              <span className="line-clamp-2 font-display italic text-xs font-extrabold uppercase leading-[1.16] text-white">
                                {reward.title}
                              </span>
                            </div>
                            <div className="mt-0.5 flex h-[26px] w-full shrink-0 items-start justify-center">
                              <span className="line-clamp-2 text-[10px] leading-[1.28] text-zinc-400">
                                {reward.subtitle}
                              </span>
                            </div>
                            <div className="mt-0.5 flex h-[16px] w-full shrink-0 items-center justify-center">
                              {reward.bonusGold && reward.kind !== 'powerup_unlock' ? (
                                <span className="inline-flex items-center justify-center gap-1 font-mono-num text-[10px] font-bold text-amber-300">
                                  <Coins className="h-3 w-3 text-amber-400" />
                                  <span>
                                    +{reward.bonusGold.toLocaleString('tr-TR')} Altın
                                  </span>
                                </span>
                              ) : null}
                            </div>
                          </div>

                          {/* Slot 4: Fixed-height Claim / Status Action */}
                          <div className="mt-auto w-full shrink-0 pt-1">
                            {isClaimable ? (
                              <button
                                type="button"
                                onClick={() => handleClaimNode(reward)}
                                className="ug-cut-sm ug-btn-fire flex h-9 w-full items-center justify-center gap-1.5 font-display italic text-xs font-extrabold uppercase tracking-wider active:scale-95 cursor-pointer"
                              >
                                {reward.kind === 'crate' ? (
                                  <>
                                    <Package className="h-3.5 w-3.5" />
                                    <span>KASAYI AÇ</span>
                                  </>
                                ) : (
                                  <>
                                    <Gift className="h-3.5 w-3.5" />
                                    <span>TOPLA</span>
                                  </>
                                )}
                              </button>
                            ) : isClaimed ? (
                              <div className="ug-cut-sm flex h-9 w-full items-center justify-center gap-1 border border-emerald-500/35 bg-emerald-500/12 font-display italic text-[11px] font-extrabold uppercase tracking-wider text-emerald-300">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>TOPLANDI</span>
                              </div>
                            ) : (
                              <div className="ug-cut-sm flex h-9 w-full items-center justify-center gap-1 border border-white/10 bg-[#090b12]/90 font-mono-num text-[11px] font-bold text-zinc-500">
                                <Lock className="h-3.5 w-3.5" />
                                <span>SV.{reward.level}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Legend */}
            <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-[#0a0c13] px-4 py-2 text-[11px] text-zinc-400 sm:px-6">
              <span>
                Sola/sağa kaydırarak 1&apos;den 100&apos;e kadar tüm sokak şöhret ödüllerini incele.
              </span>
              <span className="font-display font-bold uppercase tracking-wide text-orange-300">
                Özel boyalar, aksesuarlar ve sokak güçleri sadece bu yoldan açılır!
              </span>
            </div>
          </div>
      </div>
    </div>
  );
};

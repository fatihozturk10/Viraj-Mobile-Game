import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  CarFront,
  CheckCircle2,
  Coins,
  Crown,
  Flag,
  Gift,
  Lock,
  Play,
  Star,
  Target,
  X,
} from 'lucide-react';
import {
  CAREER_CHAPTERS,
  CAREER_LEVELS,
  CAREER_STAR_CHESTS,
  CareerLevelSpec,
  CareerProgressSnapshot,
  CareerStarChestSpec,
  getCareerLevelDifficulty,
  getCareerLevelSpecialTags,
  TOTAL_CAREER_LEVELS,
} from '../game/careerLevels';
import {
  CrateTierId,
  getCrateByTier,
  LootRarity,
  RolledLootItem,
} from '../services/storeCatalog';
import { ATMOSPHERES } from '../types/game';
import { BiomeBoundaries, CareerMapScenery } from './CareerMapScenery';
import { CrateOpeningCeremony } from './CrateOpeningCeremony';

interface CareerMapModalProps {
  open: boolean;
  progress: CareerProgressSnapshot;
  goldCoins: number;
  onClose: () => void;
  onStartLevel: (levelId: number) => void;
  onClaimStarChest: (starsRequired: number) => void;
}

const ROW_STEP = 114;
const CHAPTER_GAP = 108;
const TOP_PAD = 180;
const BOTTOM_PAD = 215;
const WORLD_WIDTH = 1600;
const WORLD_CENTER_X = WORLD_WIDTH * 0.5;
const MAP_HEIGHT =
  TOP_PAD +
  (TOTAL_CAREER_LEVELS - 1) * ROW_STEP +
  3 * CHAPTER_GAP +
  BOTTOM_PAD;

function getLevelCoords(levelId: number): { x: number; y: number } {
  // Level 1 sits near bottom; Level 100 climbs to the summit at top
  const idx = levelId - 1;
  const chapterIndex = Math.min(3, Math.floor(idx / 25));
  const y = MAP_HEIGHT - BOTTOM_PAD - idx * ROW_STEP - chapterIndex * CHAPTER_GAP;
  // Compact horizontal amplitude (±108px max) so nodes stay well inside narrow mobile screens without any horizontal squishing
  const wave = Math.sin(idx * 0.66) * 92 + Math.sin(idx * 0.25) * 16;
  const x = WORLD_CENTER_X + wave;
  return { x, y };
}

function getRoadRuleLabel(rule: CareerLevelSpec['roadRule']): string {
  if (rule === 'twoway') return 'Çift Yön Trafik';
  return 'Klasik Otoyol';
}

function getAtmosphereLabel(id: CareerLevelSpec['atmosphere']): string {
  return ATMOSPHERES.find((a) => a.id === id)?.label || 'Gün Batımı';
}

export const CareerMapModal: React.FC<CareerMapModalProps> = ({
  open,
  progress,
  goldCoins,
  onClose,
  onStartLevel,
  onClaimStarChest,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [selectedLevelId, setSelectedLevelId] = useState<number | null>(null);
  const [chestsDrawerOpen, setChestsDrawerOpen] = useState(false);
  const [openingChest, setOpeningChest] = useState<CareerStarChestSpec | null>(
    null,
  );

  const levelCoords = useMemo(
    () => CAREER_LEVELS.map((lv) => getLevelCoords(lv.id)),
    [],
  );

  const biomeBoundaries = useMemo<BiomeBoundaries>(
    () => ({
      volcanicToArcticY: (levelCoords[74].y + levelCoords[75].y) * 0.5,
      arcticToDesertY: (levelCoords[49].y + levelCoords[50].y) * 0.5,
      desertToAlpineY: (levelCoords[24].y + levelCoords[25].y) * 0.5,
    }),
    [levelCoords],
  );

  const chapterBanners = useMemo(
    () =>
      CAREER_CHAPTERS.map((ch) => {
        const startPt = levelCoords[ch.startLevel - 1];
        if (ch.index === 0) {
          return { ch, topY: startPt.y + 56, centerY: startPt.y + 92 };
        }
        const prevPt = levelCoords[ch.startLevel - 2];
        const midY = (startPt.y + prevPt.y) * 0.5;
        return { ch, topY: midY - 36, centerY: midY };
      }),
    [levelCoords],
  );

  const gantryYs = useMemo(
    () => chapterBanners.map((b) => b.centerY),
    [chapterBanners],
  );

  const backdropBands = useMemo(() => {
    const yV = Math.round(biomeBoundaries.volcanicToArcticY);
    const yA = Math.round(biomeBoundaries.arcticToDesertY);
    const yD = Math.round(biomeBoundaries.desertToAlpineY);
    return [
      {
        id: 'bg-volcanic',
        top: 0,
        height: yV + 1,
        background:
          'linear-gradient(180deg, #160609 0%, #340d14 52%, #260d18 92%, #191627 100%)',
      },
      {
        id: 'bg-arctic',
        top: yV,
        height: yA - yV + 1,
        background:
          'linear-gradient(180deg, #191627 0%, #0c1f35 8%, #11304f 50%, #193b5a 92%, #393236 100%)',
      },
      {
        id: 'bg-desert',
        top: yA,
        height: yD - yA + 1,
        background:
          'linear-gradient(180deg, #393236 0%, #582812 8%, #7b3918 50%, #532613 92%, #332e1c 100%)',
      },
      {
        id: 'bg-alpine',
        top: yD,
        height: MAP_HEIGHT - yD,
        background:
          'linear-gradient(180deg, #332e1c 0%, #133526 8%, #1a4732 54%, #0c2419 100%)',
      },
    ];
  }, [biomeBoundaries]);

  const claimableChestsCount = useMemo(
    () =>
      CAREER_STAR_CHESTS.filter(
        (c) =>
          progress.totalStars >= c.starsRequired &&
          !progress.claimedChests.includes(c.starsRequired),
      ).length,
    [progress.totalStars, progress.claimedChests],
  );

  const scrollToLevel = (levelId: number, smooth = true) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const pt = levelCoords[Math.max(0, Math.min(TOTAL_CAREER_LEVELS - 1, levelId - 1))];
    const targetTop = Math.max(0, pt.y - el.clientHeight * 0.52);
    el.scrollTo({
      top: targetTop,
      behavior: smooth ? 'smooth' : 'auto',
    });
  };

  useEffect(() => {
    if (!open) {
      setSelectedLevelId(null);
      setChestsDrawerOpen(false);
      setOpeningChest(null);
      return;
    }
    const raf = window.requestAnimationFrame(() => {
      scrollToLevel(progress.highestUnlockedLevel, false);
    });
    return () => window.cancelAnimationFrame(raf);
  }, [open, progress.highestUnlockedLevel]);

  if (!open) return null;

  const selectedLevel =
    selectedLevelId !== null ? CAREER_LEVELS[selectedLevelId - 1] : null;
  const selectedLevelProg =
    selectedLevel !== null ? progress.levels[selectedLevel.id] : undefined;

  const frontierLevel = CAREER_LEVELS[progress.highestUnlockedLevel - 1];

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      className="pointer-events-auto fixed inset-0 z-40 flex flex-col bg-zinc-950 text-white"
    >
      {/* Slim Top Header Bar */}
      <header
        className="relative z-20 shrink-0 border-b border-white/10 bg-zinc-950/95 px-3 pb-2.5 sm:px-6"
        style={{ paddingTop: 'max(0.65rem, env(safe-area-inset-top))' }}
      >
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 items-center gap-1.5 rounded-xl border border-white/12 bg-zinc-900 px-3 text-sm font-bold text-zinc-100 transition-colors hover:bg-zinc-800 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4 text-amber-400 shrink-0" />
              <span>Geri</span>
            </button>
            <div className="min-w-0">
              <h1 className="truncate font-display text-base font-extrabold tracking-tight text-white sm:text-lg">
                Kariyer Yolu
              </h1>
              <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-mono-num">
                <span>{progress.completedLevelsCount}/100 Bölüm</span>
                <span aria-hidden="true">·</span>
                <span className="text-amber-300 font-bold">
                  ★ {progress.totalStars}/{progress.maxStars}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setChestsDrawerOpen((v) => !v)}
              className={`relative flex h-10 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                claimableChestsCount > 0
                  ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30'
                  : 'border-white/12 bg-zinc-900 text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              <Gift
                className={`h-4 w-4 shrink-0 ${
                  claimableChestsCount > 0 ? 'text-emerald-300' : 'text-amber-400'
                }`}
              />
              <span className="hidden sm:inline">Yıldız Ödülü</span>
              {claimableChestsCount > 0 && (
                <span className="flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-emerald-400 px-1 text-[10px] font-extrabold text-zinc-950 font-mono-num">
                  {claimableChestsCount}
                </span>
              )}
            </button>

            <div className="flex h-10 items-center gap-1.5 rounded-xl border border-amber-400/25 bg-zinc-900/90 px-3 text-xs font-bold text-amber-300 font-mono-num">
              <Coins className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span>{goldCoins.toLocaleString('tr-TR')}</span>
            </div>
          </div>
        </div>

        {/* Chapter Quick-Jump Strip */}
        <div className="mx-auto mt-2 grid w-full max-w-4xl grid-cols-4 gap-1 rounded-xl bg-zinc-900/90 p-1">
          {CAREER_CHAPTERS.map((ch) => {
            const chapterUnlocked = progress.highestUnlockedLevel >= ch.startLevel;
            return (
              <button
                key={ch.biome}
                type="button"
                onClick={() => scrollToLevel(ch.startLevel, true)}
                className={`flex min-h-[34px] items-center justify-center gap-1 rounded-lg px-1.5 py-1 text-[11px] sm:text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  chapterUnlocked
                    ? 'text-zinc-200 hover:bg-white/10 hover:text-white'
                    : 'text-zinc-500 hover:bg-white/5'
                }`}
              >
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: ch.accentHex }}
                />
                <span className="truncate">{ch.name}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Scrollable Scenic Biome & Winding Highway Map */}
      <div
        ref={scrollContainerRef}
        className="relative flex-1 overflow-y-auto overflow-x-hidden overscroll-contain custom-scroll bg-[#102320]"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div
          className="relative mx-auto w-full overflow-hidden"
          style={{
            height: `${MAP_HEIGHT}px`,
            contain: 'layout style',
          }}
        >
          {/* Chunked Biome Backdrop Panels (prevents giant 12,000px tile checkerboarding on fast Android scroll) */}
          {backdropBands.map((band) => (
            <div
              key={band.id}
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0"
              style={{
                top: `${band.top}px`,
                height: `${band.height}px`,
                background: band.background,
                contain: 'strict',
              }}
            />
          ))}

          {/* Chunked Aspect-True Panoramic World Scenery + Roadside Landmarks + Layered Racing Highway */}
          <CareerMapScenery
            worldWidth={WORLD_WIDTH}
            mapHeight={MAP_HEIGHT}
            levelCoords={levelCoords}
            highestUnlockedLevel={progress.highestUnlockedLevel}
            boundaries={biomeBoundaries}
            gantryYs={gantryYs}
          />

          {/* Interactive Highway Nodes & Chapter Gantry Arches (1:1 synced to WORLD_CENTER_X) */}
          <div className="relative h-full w-full" style={{ contain: 'layout style' }}>
            {/* Chapter Overhead Highway Gantry Arches cleanly placed in chapter transition gaps */}
            {chapterBanners.map(({ ch, topY }) => (
              <div
                key={ch.biome}
                className="pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 text-center"
                style={{ top: `${topY}px`, width: 'min(90vw, 344px)' }}
              >
                <div className="relative overflow-hidden rounded-xl border border-white/15 bg-zinc-950/92 px-4 py-2 shadow-lg">
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 top-0 h-[3px]"
                    style={{ backgroundColor: ch.accentHex }}
                  />
                  <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono-num">
                    Bölge {ch.index + 1} · Bölüm {ch.startLevel}–{ch.endLevel}
                  </div>
                  <div className="mt-0.5 font-display text-sm font-extrabold text-white">
                    {ch.name}
                  </div>
                  <div className="mt-0.5 truncate text-[11px] text-zinc-400">
                    {ch.subtitle.split('·')[1]?.trim() || ch.subtitle}
                  </div>
                </div>
                <div className="mx-auto flex w-[84%] justify-between px-3">
                  <span className="h-3 w-1.5 rounded-b-sm bg-zinc-700/90" />
                  <span className="h-3 w-1.5 rounded-b-sm bg-zinc-700/90" />
                </div>
              </div>
            ))}

            {/* Summit Finish Trophy Banner above Level 100 */}
            <div
              className="pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 text-center"
              style={{ top: `${levelCoords[TOTAL_CAREER_LEVELS - 1].y - 128}px` }}
            >
              <div className="inline-flex items-center gap-2.5 rounded-2xl border border-amber-400/55 bg-zinc-950/92 px-4 py-2.5 shadow-[0_8px_24px_rgba(249,115,22,0.3)]">
                <Crown className="h-5 w-5 text-amber-400 shrink-0" />
                <div className="text-left">
                  <div className="font-display text-xs font-extrabold text-amber-300">
                    BÖLÜM 100 · EFSANE FİNAL
                  </div>
                  <div className="text-[11px] text-zinc-300">
                    Volkanik Zirvenin Şampiyonu Ol
                  </div>
                </div>
              </div>
            </div>

            {/* 100 Interactive Level Nodes directly on the Highway */}
            {CAREER_LEVELS.map((lv, index) => {
              const pt = levelCoords[index];
              const offsetX = pt.x - WORLD_CENTER_X;
              const unlocked = lv.id <= progress.highestUnlockedLevel;
              const isCurrent = lv.id === progress.highestUnlockedLevel;
              const lvProg = progress.levels[lv.id];
              const stars = lvProg?.stars || 0;
              const isCompleted = stars >= 1;
              const chapter = CAREER_CHAPTERS[lv.chapterIndex];

              const nodeSizeClass = lv.isMilestone
                ? 'h-16 w-16 text-lg'
                : 'h-14 w-14 text-base';

              return (
                <div
                  key={lv.id}
                  className="absolute z-10 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                  style={{
                    left: `calc(50% + ${offsetX.toFixed(1)}px)`,
                    top: `${pt.y}px`,
                  }}
                >
                  {/* Active Frontier Car Beacon */}
                  {isCurrent && (
                    <div className="mb-1 flex items-center gap-1 rounded-lg bg-amber-400 px-2 py-0.5 text-[10px] font-extrabold text-zinc-950 shadow-md whitespace-nowrap">
                      <CarFront className="h-3 w-3 shrink-0" />
                      <span>SIRADAKİ</span>
                    </div>
                  )}

                  <div className="relative flex items-center justify-center">
                    {isCurrent && (
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute -inset-2 rounded-full border-2 border-amber-300/80 animate-career-beacon"
                      />
                    )}
                    <button
                      type="button"
                      disabled={!unlocked}
                      onClick={() => setSelectedLevelId(lv.id)}
                      aria-label={`Bölüm ${lv.id}: ${lv.title}${unlocked ? '' : ' (Kilitli)'}`}
                      className={`relative flex ${nodeSizeClass} items-center justify-center rounded-full border-2 font-display font-extrabold font-mono-num shadow-md transition-transform active:scale-95 ${
                        isCurrent
                          ? 'border-amber-200 bg-amber-500 text-zinc-950 ring-4 ring-amber-400/35 cursor-pointer hover:scale-105'
                          : isCompleted
                            ? lv.isMilestone
                              ? 'border-amber-300 bg-zinc-900 text-amber-300 cursor-pointer hover:scale-105'
                              : 'border-emerald-400 bg-zinc-900 text-white cursor-pointer hover:scale-105'
                            : unlocked
                              ? 'border-white/50 bg-zinc-900 text-white cursor-pointer hover:scale-105'
                              : 'border-white/14 bg-zinc-950/92 text-zinc-500 cursor-not-allowed'
                      }`}
                    >
                      {lv.isMilestone && (
                        <span className="absolute -top-2.5 flex h-5 w-5 items-center justify-center rounded-full border border-amber-300 bg-zinc-950 text-amber-400 shadow">
                          <Crown className="h-3 w-3" />
                        </span>
                      )}
                      {unlocked ? (
                        <span>{lv.id}</span>
                      ) : (
                        <div className="flex flex-col items-center leading-none">
                          <Lock className="h-3.5 w-3.5 text-zinc-500" />
                          <span className="mt-0.5 text-[10px] text-zinc-500">
                            {lv.id}
                          </span>
                        </div>
                      )}
                    </button>
                  </div>

                  {/* 3 Stars Row directly beneath node */}
                  {unlocked && (
                    <div className="mt-1 flex items-center gap-0.5 rounded-md bg-zinc-950/85 px-1.5 py-0.5">
                      {[1, 2, 3].map((s) => (
                        <Star
                          key={s}
                          className={`h-3.5 w-3.5 ${
                            stars >= s
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-zinc-600'
                          }`}
                        />
                      ))}
                    </div>
                  )}

                  {/* Subtle Gold Reward Preview for incomplete levels */}
                  {unlocked && stars < 3 && (
                    <div
                      className="mt-0.5 flex items-center gap-0.5 text-[10px] font-bold font-mono-num [text-shadow:0_1px_3px_rgba(0,0,0,0.95)]"
                      style={{ color: stars === 0 ? '#fcd34d' : chapter.accentHex }}
                    >
                      <Coins className="h-2.5 w-2.5 shrink-0" />
                      <span>
                        +
                        {stars === 0
                          ? lv.rewards.finishGold
                          : lv.rewards.mission1Gold}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Floating Quick-Play Bar for Current Frontier Level when no level card is open */}
      {!selectedLevel && !chestsDrawerOpen && frontierLevel && (
        <div
          className="relative z-20 shrink-0 border-t border-white/10 bg-zinc-950/95 px-4 pt-2.5"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-bold text-amber-400 font-mono-num">
                Bölüm {frontierLevel.id} · {frontierLevel.targetDistanceMeters} m
              </div>
              <div className="truncate font-display text-sm font-extrabold text-white">
                {frontierLevel.title}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedLevelId(frontierLevel.id)}
              className="flex min-h-[46px] shrink-0 items-center gap-2 rounded-xl bg-amber-500 px-5 font-display text-sm font-extrabold text-zinc-950 shadow-lg transition-colors hover:bg-amber-400 active:scale-[0.98] cursor-pointer whitespace-nowrap"
            >
              <Play className="h-4 w-4 fill-current shrink-0" />
              <span>Bölümü Aç</span>
            </button>
          </div>
        </div>
      )}

      {/* Selected Level Briefing Bottom Sheet / Modal */}
      {selectedLevel && (
        <div
          onClick={() => setSelectedLevelId(null)}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/68 p-0 sm:items-center sm:p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="animate-sheet-up max-h-[88dvh] w-full overflow-y-auto custom-scroll rounded-t-3xl border-t border-white/14 bg-zinc-950 px-5 pt-3.5 shadow-2xl sm:w-[min(94vw,440px)] sm:rounded-2xl sm:border sm:p-6"
            style={{
              paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))',
            }}
          >
            <div className="mx-auto mb-3 h-1 w-11 rounded-full bg-white/20 sm:hidden" />

            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <span className="font-bold text-amber-400 font-mono-num">
                    Bölüm {selectedLevel.id}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{CAREER_CHAPTERS[selectedLevel.chapterIndex].name}</span>
                  {selectedLevel.isMilestone && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-bold text-amber-300">Kupa Etabı</span>
                    </>
                  )}
                </div>
                <h2 className="mt-1 font-display text-xl font-extrabold text-white">
                  {selectedLevel.title}
                </h2>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-400">
                  <span className="font-mono-num font-semibold text-zinc-200">
                    {selectedLevel.targetDistanceMeters.toLocaleString('tr-TR')} m
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{getRoadRuleLabel(selectedLevel.roadRule)}</span>
                  <span aria-hidden="true">·</span>
                  <span>{getAtmosphereLabel(selectedLevel.atmosphere)}</span>
                </div>
                {(() => {
                  const diff = getCareerLevelDifficulty(selectedLevel.id);
                  const tags = getCareerLevelSpecialTags(selectedLevel);
                  return (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span
                        className={`rounded-md border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${diff.borderClass} ${diff.bgClass} ${diff.textClass}`}
                      >
                        Zorluk: {diff.label}
                      </span>
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-md border border-rose-400/35 bg-rose-500/14 px-2 py-0.5 text-[10px] font-bold text-rose-200"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  );
                })()}
              </div>

              <button
                type="button"
                onClick={() => setSelectedLevelId(null)}
                aria-label="Kapat"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Current Best Stars */}
            <div className="mt-4 flex items-center justify-between rounded-xl border border-white/10 bg-zinc-900/80 px-4 py-2.5">
              <div className="flex items-center gap-1.5">
                {[1, 2, 3].map((s) => (
                  <Star
                    key={s}
                    className={`h-5 w-5 ${
                      (selectedLevelProg?.stars || 0) >= s
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-zinc-600'
                    }`}
                  />
                ))}
              </div>
              <div className="text-xs text-zinc-400 font-mono-num">
                {selectedLevelProg && selectedLevelProg.bestScore > 0
                  ? `En İyi: ${selectedLevelProg.bestScore.toLocaleString('tr-TR')} Puan`
                  : 'Henüz tamamlanmadı'}
              </div>
            </div>

            {/* 3-Star Objectives & Gold Rewards */}
            <div className="mt-4 flex flex-col gap-2">
              <div className="text-xs font-bold text-zinc-400">
                Yıldız Hedefleri ve Ödüller
              </div>

              {/* Star 1: Finish Line */}
              <div
                className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 ${
                  (selectedLevelProg?.stars || 0) >= 1
                    ? 'border-emerald-400/35 bg-emerald-500/10'
                    : 'border-white/10 bg-zinc-900/70'
                }`}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  {(selectedLevelProg?.stars || 0) >= 1 ? (
                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400 shrink-0" />
                  ) : (
                    <Flag className="h-4.5 w-4.5 text-amber-400 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white">
                      1★ Bitiş çizgisine ulaş (
                      {selectedLevel.targetDistanceMeters.toLocaleString('tr-TR')} m)
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      +{selectedLevel.rewards.finishXp} XP
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 font-mono-num text-xs font-extrabold text-amber-300 shrink-0">
                  <Coins className="h-3.5 w-3.5 text-amber-400" />
                  <span>
                    {(selectedLevelProg?.stars || 0) >= 1
                      ? `+${selectedLevel.rewards.replayGold}`
                      : `+${selectedLevel.rewards.finishGold}`}
                  </span>
                </div>
              </div>

              {/* Star 2: Mission 1 */}
              <div
                className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 ${
                  selectedLevelProg?.mission1Done
                    ? 'border-emerald-400/35 bg-emerald-500/10'
                    : 'border-white/10 bg-zinc-900/70'
                }`}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  {selectedLevelProg?.mission1Done ? (
                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400 shrink-0" />
                  ) : (
                    <Target className="h-4.5 w-4.5 text-sky-400 shrink-0" />
                  )}
                  <div className="min-w-0 text-xs font-bold text-white">
                    +1★ {selectedLevel.missions[0].title}
                  </div>
                </div>
                <div className="flex items-center gap-1 font-mono-num text-xs font-extrabold text-amber-300 shrink-0">
                  {selectedLevelProg?.mission1Done ? (
                    <span className="text-emerald-400">Alındı</span>
                  ) : (
                    <>
                      <Coins className="h-3.5 w-3.5 text-amber-400" />
                      <span>+{selectedLevel.rewards.mission1Gold}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Star 3: Mission 2 */}
              <div
                className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 ${
                  selectedLevelProg?.mission2Done
                    ? 'border-emerald-400/35 bg-emerald-500/10'
                    : 'border-white/10 bg-zinc-900/70'
                }`}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  {selectedLevelProg?.mission2Done ? (
                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400 shrink-0" />
                  ) : (
                    <Target className="h-4.5 w-4.5 text-sky-400 shrink-0" />
                  )}
                  <div className="min-w-0 text-xs font-bold text-white">
                    +1★ {selectedLevel.missions[1].title}
                  </div>
                </div>
                <div className="flex items-center gap-1 font-mono-num text-xs font-extrabold text-amber-300 shrink-0">
                  {selectedLevelProg?.mission2Done ? (
                    <span className="text-emerald-400">Alındı</span>
                  ) : (
                    <>
                      <Coins className="h-3.5 w-3.5 text-amber-400" />
                      <span>+{selectedLevel.rewards.mission2Gold}</span>
                    </>
                  )}
                </div>
              </div>

              {/* 3-Star Perfect Bonus */}
              {(selectedLevelProg?.stars || 0) < 3 && (
                <div className="flex items-center justify-between px-1 pt-1 text-xs text-amber-300">
                  <span className="font-semibold">3★ Mükemmel Tamamlama Bonusu</span>
                  <span className="font-mono-num font-extrabold">
                    +{selectedLevel.rewards.perfectBonusGold} Altın
                  </span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => onStartLevel(selectedLevel.id)}
              className="mt-5 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 font-display text-base font-extrabold text-zinc-950 shadow-[0_6px_24px_rgba(245,158,11,0.28)] transition-colors hover:bg-amber-400 active:scale-[0.99] cursor-pointer"
            >
              <Play className="h-5 w-5 fill-current shrink-0" />
              <span>Bölüm {selectedLevel.id} Başlat</span>
            </button>
          </div>
        </div>
      )}

      {/* Star Milestone Chests Modal */}
      {chestsDrawerOpen && (
        <div
          onClick={() => setChestsDrawerOpen(false)}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/68 p-0 sm:items-center sm:p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="animate-sheet-up max-h-[84dvh] w-full overflow-y-auto custom-scroll rounded-t-3xl border-t border-white/14 bg-zinc-950 px-5 pt-3.5 shadow-2xl sm:w-[min(94vw,430px)] sm:rounded-2xl sm:border sm:p-6"
            style={{
              paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))',
            }}
          >
            <div className="mx-auto mb-3 h-1 w-11 rounded-full bg-white/20 sm:hidden" />
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-lg font-extrabold text-white">
                  Yıldız Sandıkları
                </h2>
                <p className="text-xs text-zinc-400 font-mono-num">
                  Toplanan Yıldız: ★ {progress.totalStars} / {progress.maxStars}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setChestsDrawerOpen(false)}
                aria-label="Kapat"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-2.5">
              {CAREER_STAR_CHESTS.map((chest) => {
                const claimed = progress.claimedChests.includes(
                  chest.starsRequired,
                );
                const ready = !claimed && progress.totalStars >= chest.starsRequired;
                const crateSpec = chest.crateTierId
                  ? getCrateByTier(chest.crateTierId)
                  : null;
                const crateBadgeStyle =
                  chest.crateTierId === 'legendary'
                    ? 'border-amber-400/50 bg-amber-500/20 text-amber-200'
                    : chest.crateTierId === 'pro'
                      ? 'border-fuchsia-400/45 bg-fuchsia-500/18 text-fuchsia-200'
                      : 'border-sky-400/45 bg-sky-500/18 text-sky-200';
                const crateCardBorder =
                  chest.crateTierId === 'legendary'
                    ? 'border-amber-400/40 bg-gradient-to-r from-amber-500/12 via-zinc-900/90 to-zinc-900/90'
                    : chest.crateTierId === 'pro'
                      ? 'border-fuchsia-400/30 bg-gradient-to-r from-fuchsia-500/10 via-zinc-900/90 to-zinc-900/90'
                      : chest.crateTierId === 'street'
                        ? 'border-sky-400/30 bg-gradient-to-r from-sky-500/10 via-zinc-900/90 to-zinc-900/90'
                        : 'border-white/10 bg-zinc-900/80';
                return (
                  <div
                    key={chest.starsRequired}
                    className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-3 ${
                      ready
                        ? 'border-emerald-400/55 bg-emerald-500/14'
                        : claimed
                          ? 'border-white/8 bg-zinc-900/40 opacity-75'
                          : crateCardBorder
                    }`}
                  >
                    {crateSpec && (
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-white/15 bg-zinc-950 shadow-inner">
                        <img
                          src={crateSpec.imageUrl}
                          alt={crateSpec.title}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-display text-sm font-extrabold text-white">
                          {chest.title}
                        </span>
                        <span className="font-mono-num text-xs font-bold text-amber-300">
                          ★ {chest.starsRequired}
                        </span>
                        {crateSpec && (
                          <span
                            className={`rounded-md border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${crateBadgeStyle}`}
                          >
                            {crateSpec.title}
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs font-bold font-mono-num">
                        {crateSpec && (
                          <span
                            className={`flex items-center gap-1 ${
                              chest.crateTierId === 'legendary'
                                ? 'text-amber-300'
                                : chest.crateTierId === 'pro'
                                  ? 'text-fuchsia-300'
                                  : 'text-sky-300'
                            }`}
                          >
                            <Gift className="h-3 w-3" />
                            <span>1× {crateSpec.title}</span>
                          </span>
                        )}
                        {chest.rewardGold > 0 && (
                          <span className="flex items-center gap-1 text-amber-300">
                            <Coins className="h-3 w-3 text-amber-400" />
                            <span>+{chest.rewardGold.toLocaleString('tr-TR')} Altın</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {claimed ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 shrink-0">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Alındı</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={!ready}
                        onClick={() => {
                          if (!ready) return;
                          onClaimStarChest(chest.starsRequired);
                          if (!chest.crateTierId) {
                            setOpeningChest(chest);
                          }
                        }}
                        className={`min-h-[40px] rounded-xl px-3.5 text-xs font-extrabold whitespace-nowrap shrink-0 transition-colors ${
                          ready
                            ? 'bg-emerald-400 text-zinc-950 hover:bg-emerald-300 cursor-pointer'
                            : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                        }`}
                      >
                        {ready
                          ? crateSpec
                            ? 'Kasayı Aç'
                            : 'Sandığı Aç'
                          : `${chest.starsRequired - progress.totalStars}★ Kaldı`}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Career Star Chest Opening Ceremony */}
      {openingChest && (() => {
        const tierId: CrateTierId =
          openingChest.starsRequired >= 90
            ? 'legendary'
            : openingChest.starsRequired >= 30
              ? 'pro'
              : 'street';
        const rarity: LootRarity =
          tierId === 'legendary'
            ? 'legendary'
            : tierId === 'pro'
              ? 'epic'
              : 'rare';
        const chestLoot: RolledLootItem[] = [
          {
            id: `career_chest_${openingChest.starsRequired}`,
            kind: 'gold',
            title: `+${openingChest.rewardGold.toLocaleString('tr-TR')} Altın`,
            subtitle: `${openingChest.title} · ★ ${openingChest.starsRequired} Yıldız Ödülü`,
            rarity,
            amount: openingChest.rewardGold,
          },
        ];
        return (
          <CrateOpeningCeremony
            key={`career_chest_${openingChest.starsRequired}`}
            title={openingChest.title}
            subtitle={`Kariyer Yıldız Sandığı · ★ ${openingChest.starsRequired}`}
            rewardSummary={`+${openingChest.rewardGold.toLocaleString('tr-TR')} Altın`}
            crateTierId={tierId}
            crateTitle={openingChest.title}
            lootItems={chestLoot}
            animateCrate
            ctaLabel="Ödülü Topla"
            onClose={() => setOpeningChest(null)}
          />
        );
      })()}
    </div>
  );
};

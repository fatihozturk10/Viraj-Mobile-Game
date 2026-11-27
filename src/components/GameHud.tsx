import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  Bomb,
  Camera,
  CarFront,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CloudFog,
  CloudRain,
  Coins,
  Crown,
  Disc3,
  Eye,
  EyeOff,
  Flag,
  Flame,
  Fuel,
  Gauge,
  Gem,
  Gift,
  HeartPulse,
  Home,
  Layers,
  Lock,
  Magnet,
  Map,
  Medal,
  MoveHorizontal,
  Palette,
  Pause,
  Play,
  PlayCircle,
  Plus,
  RotateCcw,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Snowflake,
  Star,
  Timer,
  Trophy,
  Unlock,
  Wind,
  Wrench,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import { StoreTabId } from './StoreModal';
import { MusicPlayerState } from '../game/audioEngine';
import {
  CAREER_CHAPTERS,
  CAREER_STAR_CHESTS,
  CareerProgressSnapshot,
  CareerRunOutcome,
  TOTAL_CAREER_LEVELS,
} from '../game/careerLevels';
import { getUnclaimedLevelRewardsCount } from '../game/levelRoad';
import {
  DriverLevelEmblem,
  SegmentedXpBar,
  UpgradeLevelMeter,
} from './DriverLevelEmblem';
import { NitroWingBar } from './NitroWingBar';
import { DriftTelemetryHud } from './DriftTelemetryHud';
import { SpeedometerCluster } from './SpeedometerCluster';
import { GarageView } from './GarageView';
import { AchievementsPanel } from './AchievementsPanel';
import {
  AchievementCategory,
  BODY_KITS,
  BodyKitId,
  CAMERA_MODES,
  CameraMode,
  CAR_COLORS,
  CAR_MODELS,
  CarColorId,
  CarCustomConfig,
  CarModelId,
  CarUpgradeKey,
  CarUpgrades,
  CarWheelConfig,
  DRIFT_SMOKES,
  FloatingCallout,
  formatSpeedMultiplier,
  GAME_MODES,
  GameModeId,
  GamePhase,
  GarageCameraFocus,
  getDefaultCustomForCar,
  getDefaultWheelForCar,
  getDriverRankTier,
  getNitroDurationSec,
  getTuningClassForUpgrades,
  HEADLIGHTS,
  HudStats,
  ITEM_RARITY_META,
  ItemRarity,
  LIVERIES,
  LiveryId,
  MAX_POWERUP_UPGRADE_LEVEL,
  MAX_UPGRADE_LEVEL,
  MIRROR_CHARMS,
  MissionsSnapshot,
  NITRO_FLAMES,
  PAINT_FINISHES,
  PLATE_STYLES,
  PlayerLevelInfo,
  POWERUP_SPECS,
  PowerUpId,
  PowerUpUpgrades,
  PowerUpUpgradeTrack,
  ROOF_HATS,
  SPOILERS,
  SpoilerId,
  STEERING_WHEELS,
  SteeringControlMode,
  UNDERGLOWS,
  UPGRADE_COSTS,
  UPGRADE_SPECS,
  VisualCategory,
  VisualUnlocks,
  WHEEL_COLORS,
  WHEEL_STYLES,
  WheelColorId,
  WheelStyleId,
} from '../types/game';

interface GameHudProps {
  phase: GamePhase;
  gameMode: GameModeId;
  showGameOverModal: boolean;
  stats: HudStats;
  goldCoins: number;
  diamonds: number;
  unlockedCars: CarModelId[];
  carUpgrades: Record<CarModelId, CarUpgrades>;
  powerUpUpgrades: PowerUpUpgrades;
  unlockedWheelStyles: WheelStyleId[];
  carWheels: Record<CarModelId, CarWheelConfig>;
  unlockedBodyKits: BodyKitId[];
  unlockedSpoilers: SpoilerId[];
  unlockedLiveries: LiveryId[];
  carCustom: Record<CarModelId, CarCustomConfig>;
  visualUnlocks: VisualUnlocks;
  playerLevel: PlayerLevelInfo;
  missions: MissionsSnapshot;
  muted: boolean;
  musicState: MusicPlayerState;
  carModel: CarModelId;
  carColor: CarColorId;
  licensePlate: string;
  cameraMode: CameraMode;
  garageMenuCollapsed: boolean;
  garageBrightMode: boolean;
  showSteerHint: boolean;
  callout: FloatingCallout | null;
  onSelectGameMode: (mode: GameModeId) => void;
  onStart: () => void;
  onOpenGarage: () => void;
  onToggleGarageMenu: () => void;
  onToggleGarageLight: () => void;
  onTogglePause: () => void;
  onReturnMenu: () => void;
  onToggleMute: () => void;
  onToggleMusic: () => void;
  onSelectModel: (id: CarModelId) => void;
  onUnlockCar: (id: CarModelId) => void;
  onUpgradePart: (carId: CarModelId, part: CarUpgradeKey) => void;
  onUpgradePowerUp: (id: PowerUpId, track: PowerUpUpgradeTrack) => void;
  onClaimMission: (missionId: string) => void;
  onClaimAchievement: (achievementId: string) => void;
  onClaimAllRewards: (scope: 'missions' | 'achievements' | 'all') => void;
  onRefreshMissions?: () => void;
  onEquipWheelStyle: (carId: CarModelId, styleId: WheelStyleId) => void;
  onUnlockWheelStyle: (styleId: WheelStyleId, equipToCarId: CarModelId) => void;
  onSelectWheelColor: (carId: CarModelId, colorId: WheelColorId) => void;
  onPreviewWheel: (styleId: WheelStyleId, colorId: WheelColorId) => void;
  onEquipBodyKit: (carId: CarModelId, kitId: BodyKitId) => void;
  onUnlockBodyKit: (kitId: BodyKitId, equipToCarId: CarModelId) => void;
  onEquipSpoiler: (carId: CarModelId, spoilerId: SpoilerId) => void;
  onUnlockSpoiler: (spoilerId: SpoilerId, equipToCarId: CarModelId) => void;
  onEquipLivery: (carId: CarModelId, liveryId: LiveryId) => void;
  onUnlockLivery: (liveryId: LiveryId, equipToCarId: CarModelId) => void;
  onPreviewCustom: (config: CarCustomConfig) => void;
  onEquipVisualItem: (
    carId: CarModelId,
    category: VisualCategory,
    itemId: string,
  ) => void;
  onUnlockVisualItem: (
    category: VisualCategory,
    itemId: string,
    equipToCarId: CarModelId,
  ) => void;
  onGarageEffectPreview: (mode: 'none' | 'nitro' | 'smoke') => void;
  onGarageCameraFocus: (focus: GarageCameraFocus) => void;
  onSelectColor: (id: CarColorId) => void;
  onChangeLicensePlate: (text: string) => void;
  onSelectCamera: (mode: CameraMode) => void;
  onToggleCamera: () => void;
  onNitroToggle: (x?: number, y?: number) => void;
  adFreePurchased: boolean;
  freeWheelAvailable: boolean;
  streakDay: number;
  revivedThisRun: boolean;
  diamondReviveCost: number;
  runGoldDoubled: boolean;
  onOpenLeaderboard: () => void;
  onOpenDailyWheel: () => void;
  onOpenStore: (tab?: StoreTabId) => void;
  onOpenSettings: () => void;
  onWatchAdRevive: () => void;
  onDiamondRevive: () => void;
  onWatchAdDoubleGold: () => void;
  onWatchAdTopUpGold: (amount: number, targetLabel: string) => void;
  onRentCar: (carId: CarModelId, carName: string) => void;
  careerProgress: CareerProgressSnapshot;
  lastCareerOutcome: CareerRunOutcome | null;
  onOpenCareerMap: () => void;
  onStartCareerLevel: (levelId: number) => void;
  claimedLevelRewards: number[];
  unlockedCarColors: CarColorId[];
  steeringMode: SteeringControlMode;
  onOpenLevelRoad: (focusLevel?: number) => void;
}

function formatTimeUntilMidnight(): string {
  const now = new Date();
  const nextMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    0,
    0,
  );
  const diffMs = Math.max(0, nextMidnight.getTime() - now.getTime());
  const totalMin = Math.floor(diffMs / 60_000);
  if (totalMin < 1) return '< 1 dk';
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (hours <= 0) return `${mins} dk`;
  return `${hours} sa ${String(mins).padStart(2, '0')} dk`;
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

export const GameHud: React.FC<GameHudProps> = React.memo(({
  phase,
  gameMode,
  showGameOverModal,
  stats,
  goldCoins,
  diamonds,
  unlockedCars,
  carUpgrades,
  powerUpUpgrades,
  unlockedWheelStyles,
  carWheels,
  unlockedBodyKits,
  unlockedSpoilers,
  unlockedLiveries,
  carCustom,
  visualUnlocks,
  playerLevel,
  missions,
  muted,
  musicState,
  carModel,
  carColor,
  licensePlate,
  cameraMode,
  garageMenuCollapsed,
  garageBrightMode,
  showSteerHint,
  callout,
  onSelectGameMode,
  onStart,
  onOpenGarage,
  onToggleGarageMenu,
  onToggleGarageLight,
  onTogglePause,
  onReturnMenu,
  onToggleMute,
  onToggleMusic,
  onSelectModel,
  onUnlockCar,
  onUpgradePart,
  onUpgradePowerUp,
  onClaimMission,
  onClaimAchievement,
  onClaimAllRewards,
  onRefreshMissions,
  onEquipWheelStyle,
  onUnlockWheelStyle,
  onSelectWheelColor,
  onPreviewWheel,
  onEquipBodyKit,
  onUnlockBodyKit,
  onEquipSpoiler,
  onUnlockSpoiler,
  onEquipLivery,
  onUnlockLivery,
  onPreviewCustom,
  onEquipVisualItem,
  onUnlockVisualItem,
  onGarageEffectPreview,
  onGarageCameraFocus,
  onSelectColor,
  onChangeLicensePlate,
  onSelectCamera,
  onToggleCamera,
  onNitroToggle,
  adFreePurchased,
  freeWheelAvailable,
  streakDay,
  revivedThisRun,
  diamondReviveCost,
  runGoldDoubled,
  onOpenLeaderboard,
  onOpenDailyWheel,
  onOpenStore,
  onOpenSettings,
  onWatchAdRevive,
  onDiamondRevive,
  onWatchAdDoubleGold,
  onWatchAdTopUpGold,
  onRentCar,
  careerProgress,
  lastCareerOutcome,
  onOpenCareerMap,
  onStartCareerLevel,
  claimedLevelRewards,
  unlockedCarColors,
  steeringMode,
  onOpenLevelRoad,
}) => {
  const [missionsOpen, setMissionsOpen] = useState(false);
  const [dailyCountdown, setDailyCountdown] = useState<string>(() =>
    formatTimeUntilMidnight(),
  );

  const unclaimedLevelRewardsCount = useMemo(
    () => getUnclaimedLevelRewardsCount(playerLevel.level, claimedLevelRewards),
    [playerLevel.level, claimedLevelRewards],
  );

  useEffect(() => {
    if (!missionsOpen) return;
    setDailyCountdown(formatTimeUntilMidnight());
    onRefreshMissions?.();
    const timer = window.setInterval(() => {
      setDailyCountdown(formatTimeUntilMidnight());
      onRefreshMissions?.();
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [missionsOpen, onRefreshMissions]);

  const [missionsTab, setMissionsTab] = useState<'missions' | 'achievements'>(
    'missions',
  );
  const [achCategory, setAchCategory] = useState<'all' | AchievementCategory>(
    'all',
  );

  const isPlaying = phase === 'playing';
  const activeModel = useMemo(
    () => CAR_MODELS.find((m) => m.id === carModel) || CAR_MODELS[0],
    [carModel],
  );
  const playerRankTier = useMemo(
    () => getDriverRankTier(playerLevel.level),
    [playerLevel.level],
  );
  const unlockedAchCount = useMemo(
    () => missions.achievements.filter((a) => a.unlocked).length,
    [missions.achievements],
  );
  const totalAchCount = missions.achievements.length;
  const activeCameraLabel = useMemo(
    () => CAMERA_MODES.find((c) => c.id === cameraMode)?.label ?? 'Takip',
    [cameraMode],
  );
  const activeColorOpt = useMemo(
    () => CAR_COLORS.find((c) => c.id === carColor) || CAR_COLORS[0],
    [carColor],
  );
  const activeColorSwatch = activeColorOpt.swatch;

  const clampedIntegrity = Math.min(
    100,
    Math.max(0, Math.round(stats.integrity)),
  );
  const integrityTier =
    clampedIntegrity > 60
      ? 'healthy'
      : clampedIntegrity > 30
        ? 'warn'
        : 'critical';

  const activeGameModeId = isPlaying ? stats.gameMode : gameMode;
  const activeGameModeSpec = useMemo(
    () => GAME_MODES.find((m) => m.id === activeGameModeId) || GAME_MODES[0],
    [activeGameModeId],
  );

  if (phase === 'garage') {
    return (
      <GarageView
        goldCoins={goldCoins}
        diamonds={diamonds}
        unlockedCars={unlockedCars}
        carUpgrades={carUpgrades}
        powerUpUpgrades={powerUpUpgrades}
        unlockedWheelStyles={unlockedWheelStyles}
        carWheels={carWheels}
        unlockedBodyKits={unlockedBodyKits}
        unlockedSpoilers={unlockedSpoilers}
        unlockedLiveries={unlockedLiveries}
        carCustom={carCustom}
        visualUnlocks={visualUnlocks}
        playerLevel={playerLevel}
        muted={muted}
        carModel={carModel}
        carColor={carColor}
        licensePlate={licensePlate}
        cameraMode={cameraMode}
        garageMenuCollapsed={garageMenuCollapsed}
        garageBrightMode={garageBrightMode}
        unlockedCarColors={unlockedCarColors}
        onStart={onStart}
        onReturnMenu={onReturnMenu}
        onToggleGarageMenu={onToggleGarageMenu}
        onToggleMute={onToggleMute}
        onToggleGarageLight={onToggleGarageLight}
        onOpenStore={onOpenStore}
        onSelectModel={onSelectModel}
        onUnlockCar={onUnlockCar}
        onUpgradePart={onUpgradePart}
        onUpgradePowerUp={onUpgradePowerUp}
        onEquipWheelStyle={onEquipWheelStyle}
        onUnlockWheelStyle={onUnlockWheelStyle}
        onSelectWheelColor={onSelectWheelColor}
        onPreviewWheel={onPreviewWheel}
        onEquipBodyKit={onEquipBodyKit}
        onUnlockBodyKit={onUnlockBodyKit}
        onEquipSpoiler={onEquipSpoiler}
        onUnlockSpoiler={onUnlockSpoiler}
        onEquipLivery={onEquipLivery}
        onUnlockLivery={onUnlockLivery}
        onPreviewCustom={onPreviewCustom}
        onEquipVisualItem={onEquipVisualItem}
        onUnlockVisualItem={onUnlockVisualItem}
        onGarageEffectPreview={onGarageEffectPreview}
        onGarageCameraFocus={onGarageCameraFocus}
        onSelectColor={onSelectColor}
        onChangeLicensePlate={onChangeLicensePlate}
        onSelectCamera={onSelectCamera}
        onWatchAdTopUpGold={onWatchAdTopUpGold}
        onRentCar={onRentCar}
        onOpenLevelRoad={onOpenLevelRoad}
      />
    );
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between">
      {/* Animated Geometric Triangle Edge Vignette during Lightning / Rampage Mode */}
      {isPlaying && stats.rampageTimer > 0 && (() => {
        const ending = stats.rampageTimer <= 3;
        const primaryHex = ending ? '#f43f5e' : '#f97316';
        const accentHex = ending ? '#fb923c' : '#fbbf24';
        const highlightHex = ending ? '#fda4af' : '#fde047';
        const strokeColor = ending
          ? 'rgba(251, 113, 133, 0.46)'
          : 'rgba(251, 191, 36, 0.40)';
        return (
          <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 -z-10 overflow-hidden transition-opacity duration-300"
          >
            {/* Dynamic pulsing radial edge vignette glow */}
            <div
              className={`absolute inset-0 ${ending ? 'animate-rampage-tri-fast' : 'animate-rampage-glow'}`}
              style={{
                background: ending
                  ? 'radial-gradient(ellipse at center, transparent 56%, rgba(244,63,94,0.14) 80%, rgba(225,29,72,0.34) 100%)'
                  : 'radial-gradient(ellipse at center, transparent 58%, rgba(249,115,22,0.12) 82%, rgba(234,88,12,0.28) 100%)',
              }}
            />

            {/* GPU-cached static low-poly triangle shard mosaic (rasterized ONCE, faded on GPU compositor — zero per-frame SVG repaint) */}
            <div
              className={`absolute inset-0 will-change-[opacity] ${ending ? 'animate-rampage-tri-fast' : 'animate-rampage-glow'}`}
              style={{ transform: 'translateZ(0)' }}
            >
              <svg
                viewBox="0 0 1000 1000"
                preserveAspectRatio="none"
                className="h-full w-full"
              >
                <defs>
                  <linearGradient id="rampTriTop" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={primaryHex} stopOpacity="0.42" />
                    <stop offset="100%" stopColor={accentHex} stopOpacity="0.03" />
                  </linearGradient>
                  <linearGradient id="rampTriBottom" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0%" stopColor={primaryHex} stopOpacity="0.44" />
                    <stop offset="100%" stopColor={accentHex} stopOpacity="0.03" />
                  </linearGradient>
                  <linearGradient id="rampTriLeft" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={primaryHex} stopOpacity="0.44" />
                    <stop offset="100%" stopColor={accentHex} stopOpacity="0.03" />
                  </linearGradient>
                  <linearGradient id="rampTriRight" x1="1" y1="0" x2="0" y2="0">
                    <stop offset="0%" stopColor={primaryHex} stopOpacity="0.44" />
                    <stop offset="100%" stopColor={accentHex} stopOpacity="0.03" />
                  </linearGradient>
                  <linearGradient id="rampTriSpark" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor={highlightHex} stopOpacity="0.58" />
                    <stop offset="100%" stopColor={primaryHex} stopOpacity="0.08" />
                  </linearGradient>
                </defs>

                {/* Corner clusters */}
                <g stroke={strokeColor} strokeWidth="1.35" strokeLinejoin="round">
                  <polygon points="0,0 165,0 0,155" fill="url(#rampTriLeft)" />
                  <polygon points="165,0 92,82 0,155" fill="url(#rampTriTop)" opacity="0.72" />
                  <polygon points="1000,0 835,0 1000,155" fill="url(#rampTriRight)" />
                  <polygon points="835,0 908,82 1000,155" fill="url(#rampTriTop)" opacity="0.72" />
                  <polygon points="0,1000 175,1000 0,835" fill="url(#rampTriLeft)" />
                  <polygon points="175,1000 96,914 0,835" fill="url(#rampTriBottom)" opacity="0.74" />
                  <polygon points="1000,1000 825,1000 1000,835" fill="url(#rampTriRight)" />
                  <polygon points="825,1000 904,914 1000,835" fill="url(#rampTriBottom)" opacity="0.74" />
                </g>

                {/* Top & bottom crystalline edge shards */}
                <g stroke={strokeColor} strokeWidth="1.15" strokeLinejoin="round">
                  <polygon points="165,0 325,0 238,58" fill="url(#rampTriTop)" opacity="0.78" />
                  <polygon points="325,0 500,0 412,46" fill="url(#rampTriTop)" opacity="0.58" />
                  <polygon points="500,0 675,0 588,46" fill="url(#rampTriTop)" opacity="0.58" />
                  <polygon points="675,0 835,0 762,58" fill="url(#rampTriTop)" opacity="0.78" />

                  <polygon points="175,1000 335,1000 248,938" fill="url(#rampTriBottom)" opacity="0.8" />
                  <polygon points="335,1000 500,1000 415,950" fill="url(#rampTriBottom)" opacity="0.6" />
                  <polygon points="500,1000 665,1000 585,950" fill="url(#rampTriBottom)" opacity="0.6" />
                  <polygon points="665,1000 825,1000 752,938" fill="url(#rampTriBottom)" opacity="0.8" />
                </g>

                {/* Left & right flank shards */}
                <g stroke={strokeColor} strokeWidth="1.2" strokeLinejoin="round">
                  <polygon points="0,155 78,210 0,295" fill="url(#rampTriLeft)" opacity="0.82" />
                  <polygon points="0,295 66,415 0,505" fill="url(#rampTriLeft)" opacity="0.74" />
                  <polygon points="0,505 62,605 0,695" fill="url(#rampTriLeft)" opacity="0.72" />
                  <polygon points="0,835 80,780 0,695" fill="url(#rampTriLeft)" opacity="0.8" />
                  <polygon points="1000,155 922,210 1000,295" fill="url(#rampTriRight)" opacity="0.82" />
                  <polygon points="1000,295 934,415 1000,505" fill="url(#rampTriRight)" opacity="0.74" />
                  <polygon points="1000,505 938,605 1000,695" fill="url(#rampTriRight)" opacity="0.72" />
                  <polygon points="1000,835 920,780 1000,695" fill="url(#rampTriRight)" opacity="0.8" />
                </g>

                {/* Lightning inner accent triangles */}
                <g stroke={highlightHex} strokeOpacity="0.55" strokeWidth="1.1" strokeLinejoin="round">
                  <polygon points="92,82 190,46 165,0" fill="url(#rampTriSpark)" opacity="0.7" />
                  <polygon points="908,82 810,46 835,0" fill="url(#rampTriSpark)" opacity="0.7" />
                  <polygon points="96,914 196,952 175,1000" fill="url(#rampTriSpark)" opacity="0.72" />
                  <polygon points="904,914 804,952 825,1000" fill="url(#rampTriSpark)" opacity="0.72" />
                  <polygon points="0,390 48,465 0,555" fill="url(#rampTriSpark)" opacity="0.64" />
                  <polygon points="1000,390 952,465 1000,555" fill="url(#rampTriSpark)" opacity="0.64" />
                </g>
              </svg>
            </div>
          </div>
        );
      })()}

      {/* Slim Unified Top Bar + Dedicated Non-Overlapping Telemetry Stack */}
      <div className="flex flex-col">
        <header
          className="relative flex items-start justify-between gap-2 bg-gradient-to-b from-black/88 via-black/42 to-transparent px-3 pb-3 sm:gap-3 sm:px-6 sm:pb-4"
          style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
        >
          {/* Left Zone */}
          {phase !== 'menu' ? (
            <div className="flex min-w-0 flex-1 flex-col gap-1 pr-1">
              <div className="flex items-center gap-2 text-white">
                <span className="font-display italic text-2xl font-extrabold leading-tight tracking-tight font-mono-num [text-shadow:0_2px_8px_rgba(0,0,0,0.88)] sm:text-3xl">
                  {stats.score.toLocaleString('tr-TR')}
                </span>
                {stats.combo > 1 && (
                  <span className="ug-skew bg-gradient-to-r from-rose-600 to-orange-500 px-2 py-0.5 font-display italic text-xs font-extrabold text-white font-mono-num shadow-[0_0_12px_rgba(234,88,12,0.5)] sm:text-sm">
                    ×{stats.combo}
                  </span>
                )}
              </div>
              {stats.combo > 1 && (
                <div className="ug-skew h-1.5 w-22 sm:w-28 overflow-hidden bg-white/15">
                  <div
                    className="h-full bg-gradient-to-r from-rose-500 to-orange-400 transition-[width] duration-75"
                    style={{ width: `${Math.round(stats.comboTimerRatio * 100)}%` }}
                  />
                </div>
              )}
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-200 font-mono-num drop-shadow-[0_1px_4px_rgba(0,0,0,0.85)]">
                <span className="ug-skew border border-white/12 bg-[#0b0e16]/80 px-2 py-0.5 font-bold text-white whitespace-nowrap">
                  {formatDistance(stats.distanceMeters)}
                </span>
                <span className="hidden sm:inline font-display text-xs font-semibold tracking-wide text-zinc-300 uppercase truncate">
                  {stats.biomeLabel}
                </span>
                {stats.roadZone !== 'open' && (
                  <span
                    className={`ug-skew px-2 py-0.5 font-display text-[11px] font-bold uppercase whitespace-nowrap ${
                      stats.roadZone === 'tunnel'
                        ? 'bg-sky-500/25 text-sky-200'
                        : 'bg-orange-500/25 text-orange-200'
                    }`}
                  >
                    {stats.roadZone === 'tunnel' ? 'Tünel' : 'Köprü'}
                  </span>
                )}
                {stats.rainIntensity > 0.28 ? (
                  <span className="inline-flex items-center gap-1 font-display text-[11px] font-bold uppercase text-cyan-300 whitespace-nowrap">
                    <CloudRain className="h-3.5 w-3.5 shrink-0" />
                    <span>Yağmur</span>
                  </span>
                ) : stats.fogIntensity > 0.35 ? (
                  <span className="inline-flex items-center gap-1 font-display text-[11px] font-bold uppercase text-slate-300 whitespace-nowrap">
                    <CloudFog className="h-3.5 w-3.5 shrink-0" />
                    <span>Sis</span>
                  </span>
                ) : stats.weatherKind === 'snow' ? (
                  <span className="inline-flex items-center gap-1 font-display text-[11px] font-bold uppercase text-sky-200 whitespace-nowrap">
                    <Snowflake className="h-3.5 w-3.5 shrink-0" />
                    <span>Kar</span>
                  </span>
                ) : stats.weatherKind === 'sandstorm' ? (
                  <span className="inline-flex items-center gap-1 font-display text-[11px] font-bold uppercase text-orange-300 whitespace-nowrap">
                    <Wind className="h-3.5 w-3.5 shrink-0" />
                    <span>Fırtına</span>
                  </span>
                ) : null}
                <span className="ug-skew inline-flex items-center gap-1 border border-amber-400/30 bg-[#0b0e16]/82 px-2 py-0.5 text-amber-300 font-bold whitespace-nowrap">
                  <Coins className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span>{stats.runGold.toLocaleString('tr-TR')}</span>
                </span>
                <span className="ug-skew inline-flex items-center gap-1 border border-cyan-400/30 bg-[#0b0e16]/82 px-2 py-0.5 text-cyan-300 font-bold whitespace-nowrap">
                  <Gem className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                  <span>{stats.runDiamonds.toLocaleString('tr-TR')}</span>
                </span>
              </div>
            </div>
          ) : (
            <div className="pointer-events-auto flex min-w-0 flex-1 flex-col items-start gap-1.5 sm:flex-initial sm:flex-row sm:items-center sm:gap-2">
              <button
                type="button"
                onClick={() => onOpenLevelRoad()}
                onPointerDown={(e) => e.stopPropagation()}
                title="Seviye Yolu (1–100) ve Ödüller"
                className={`ug-cut group relative flex min-w-0 w-full sm:w-fit max-w-full items-center gap-2 sm:gap-2.5 overflow-hidden border ${
                  unclaimedLevelRewardsCount > 0
                    ? 'border-orange-400/85 shadow-[0_0_20px_rgba(249,115,22,0.34)]'
                    : 'border-white/14'
                } bg-[#0c0f18]/95 pl-2.5 pr-2 py-1.5 sm:px-3 sm:py-2 text-left transition-colors hover:border-orange-500/60 hover:bg-[#131826] cursor-pointer shadow-xl`}
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-rose-500 to-orange-500"
                />
                <DriverLevelEmblem level={playerLevel.level} size="md" className="!h-9 !w-9 sm:!h-10 sm:!w-10" />
                <div className="flex min-w-0 flex-1 flex-col gap-1 overflow-hidden sm:min-w-[148px]">
                  <div className="flex items-center justify-between gap-1.5 min-w-0">
                    <span
                      className={`min-w-0 flex-1 truncate font-display italic text-[11px] sm:text-xs font-bold uppercase tracking-wide ${playerRankTier.textClass}`}
                    >
                      {playerLevel.rankTitle}
                    </span>
                    <span className="hidden sm:inline font-mono-num text-[11px] font-bold text-orange-300 whitespace-nowrap shrink-0">
                      SV.{playerLevel.level}
                    </span>
                  </div>
                  <SegmentedXpBar
                    level={playerLevel.level}
                    progressRatio={playerLevel.progressRatio}
                    segments={6}
                    heightClass="h-1.5"
                  />
                </div>
                {unclaimedLevelRewardsCount > 0 && (
                  <span className="inline-flex h-6 shrink-0 items-center gap-1 rounded-[5px] border border-orange-300/60 ug-btn-fire px-1.5 text-[11px] font-extrabold leading-none text-white font-mono-num shadow-md">
                    <Gift className="h-3 w-3 shrink-0" />
                    <span>{unclaimedLevelRewardsCount}</span>
                  </span>
                )}
                <ChevronRight className="hidden sm:block h-4 w-4 text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:text-orange-300 shrink-0" />
              </button>

              {stats.bestScore > 0 && (
                <div className="ug-cut-sm inline-flex shrink-0 items-center gap-1.5 border border-orange-500/30 bg-[#0c0f18]/94 px-2.5 py-1 shadow-lg sm:px-3 sm:py-2">
                  <span className="font-display text-[10px] font-bold tracking-wider uppercase leading-none text-zinc-400">
                    REKOR
                  </span>
                  <span className="font-mono-num text-xs font-extrabold leading-none text-orange-300">
                    {stats.bestScore.toLocaleString('tr-TR')}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Right Zone: Clean Single-Row Action Strip */}
          <div className="pointer-events-auto relative flex items-center gap-1 sm:gap-2 shrink-0">
            {phase === 'menu' && (
              <>
                <button
                  type="button"
                  onClick={() => onOpenStore('gold')}
                  onPointerDown={(e) => e.stopPropagation()}
                  title="Elmas Bakiyesi · Altın Takas Et"
                  className="ug-cut-sm flex h-10 sm:h-11 items-center gap-1 border border-cyan-400/40 bg-[#0a1420]/94 px-2 sm:px-3 text-xs sm:text-sm font-bold text-cyan-200 font-mono-num transition-colors hover:border-cyan-300 hover:bg-[#0f1d2e] cursor-pointer shadow-lg"
                >
                  <Gem className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-cyan-400 shrink-0" />
                  <span>{diamonds.toLocaleString('tr-TR')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenStore('gold')}
                  onPointerDown={(e) => e.stopPropagation()}
                  title="Altın ve Kasa Marketini Aç"
                  className="ug-cut-sm group flex h-10 sm:h-11 items-center gap-1 sm:gap-1.5 border border-amber-400/35 bg-[#0c0f18]/94 pl-2 pr-1 sm:pl-3 sm:pr-2 text-xs sm:text-sm font-bold text-amber-300 font-mono-num transition-colors hover:border-orange-400/75 hover:bg-[#131826] cursor-pointer shadow-lg"
                >
                  <Coins className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-400 shrink-0" />
                  <span>{goldCoins.toLocaleString('tr-TR')}</span>
                  <span className="ug-cut-sm ml-0.5 flex h-6 w-6 items-center justify-center ug-btn-fire text-white shrink-0">
                    <Plus className="h-3.5 w-3.5 stroke-[3]" />
                  </span>
                </button>
              </>
            )}

            {(isPlaying || phase === 'paused') && (
              <button
                type="button"
                onClick={onToggleCamera}
                onPointerDown={(e) => e.stopPropagation()}
                aria-label="Kamera Açısını Değiştir"
                title="Kamera Açısı (C)"
                className="ug-cut-sm ug-btn-metal flex h-11 w-11 sm:w-auto items-center justify-center gap-1.5 sm:px-3.5 font-display text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-pointer"
              >
                <Camera className="h-5 w-5 sm:h-4 sm:w-4 text-orange-400 shrink-0" />
                <span className="hidden sm:inline">{activeCameraLabel}</span>
              </button>
            )}

            {!isPlaying && (
              <button
                type="button"
                onClick={onOpenSettings}
                onPointerDown={(e) => e.stopPropagation()}
                aria-label="Ayarlar"
                title="Ayarlar"
                className="ug-cut-sm ug-btn-metal flex h-11 w-11 items-center justify-center cursor-pointer"
              >
                <Settings className="h-5 w-5 sm:h-4.5 sm:w-4.5 text-zinc-200" />
              </button>
            )}

            {(isPlaying || phase === 'paused') && (
              <button
                type="button"
                onClick={onTogglePause}
                aria-label={phase === 'paused' ? 'Devam Et' : 'Duraklat'}
                className="ug-cut-sm ug-btn-metal flex h-11 w-11 items-center justify-center cursor-pointer"
              >
                {phase === 'paused' ? (
                  <Play className="h-5 w-5 sm:h-4.5 sm:w-4.5 text-orange-400" />
                ) : (
                  <Pause className="h-5 w-5 sm:h-4.5 sm:w-4.5 text-zinc-100" />
                )}
              </button>
            )}
          </div>
        </header>

        {/* Dedicated Non-Overlapping Live Mode Telemetry + Road/Curve Banner + Bonus Callout */}
        {isPlaying && (
          <div className="pointer-events-none flex flex-col items-center gap-1.5 px-3 pt-0.5">
            {/* RAMPAGE MODE 3-2-1 FINAL COUNTDOWN */}
            {stats.rampageTimer > 0 && stats.rampageTimer <= 3 && (
              <div className="ug-cut flex flex-col items-center gap-0.5 border border-orange-400/80 bg-[#0b0d14]/94 px-4 py-1.5 shadow-[0_0_28px_rgba(249,115,22,0.5)]">
                <span className="font-display italic text-[10px] font-extrabold tracking-widest text-orange-300 uppercase">
                  YIKIM MODU BİTİYOR
                </span>
                <span
                  key={Math.ceil(stats.rampageTimer)}
                  className="animate-countdown-pop font-display italic text-4xl leading-none font-black text-white [text-shadow:0_0_14px_rgba(249,115,22,0.9)] sm:text-5xl"
                >
                  {Math.ceil(stats.rampageTimer)}
                </span>
              </div>
            )}

            {/* CAREER MODE LIVE FINISH PROGRESS & 2-MISSION TRACKER */}
            {stats.career && (
              <div className="ug-cut flex w-[min(92vw,344px)] flex-col gap-1 border border-orange-500/45 bg-[#0b0e16]/92 px-3 py-1.5 shadow-xl">
                <div className="flex items-center justify-between gap-2 text-[11px] leading-none">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <Flag className="h-3.5 w-3.5 shrink-0 text-orange-400" />
                    <span className="truncate font-display italic font-extrabold uppercase text-white">
                      Bölüm {stats.career.levelId}
                    </span>
                    <span className="hidden truncate text-[10px] font-semibold text-zinc-400 sm:inline">
                      · {stats.career.title}
                    </span>
                  </div>
                  <span className="shrink-0 font-mono-num text-[11px] font-extrabold text-orange-300">
                    {stats.career.remainingMeters > 0
                      ? `${stats.career.remainingMeters} m`
                      : 'BİTİŞ!'}
                  </span>
                </div>

                <div className="ug-skew h-1.5 w-full overflow-hidden bg-zinc-800">
                  <div
                    className="h-full bg-gradient-to-r from-rose-500 via-orange-500 to-amber-400 transition-[width] duration-100"
                    style={{
                      width: `${Math.min(100, Math.round(stats.career.progressRatio * 100))}%`,
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                  {[stats.career.mission1, stats.career.mission2].map((m) => (
                    <div
                      key={m.id}
                      className={`flex min-w-0 items-center justify-between gap-1 rounded-md border px-1.5 py-0.5 text-[10px] leading-tight ${
                        m.failed
                          ? 'border-rose-500/55 bg-rose-500/18 text-rose-200'
                          : m.completed
                            ? 'border-emerald-400/50 bg-emerald-500/18 text-emerald-200'
                            : 'border-white/10 bg-white/[0.03] text-zinc-300'
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-1 truncate font-semibold">
                        {m.failed ? (
                          <XCircle className="h-3 w-3 shrink-0 text-rose-400" />
                        ) : m.completed ? (
                          <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-400" />
                        ) : (
                          <Star className="h-2.5 w-2.5 shrink-0 text-amber-400/75" />
                        )}
                        <span className="truncate">{m.shortLabel}</span>
                      </span>
                      <span className="shrink-0 font-mono-num font-bold text-white/90">
                        {m.progressText}
                      </span>
                    </div>
                  ))}
                </div>

                {stats.career.minSpeedTargetKmh != null &&
                  !stats.career.mission1.failed &&
                  !stats.career.mission2.failed &&
                  (stats.career.minSpeedGraceActive ||
                    stats.speedKmh < stats.career.minSpeedTargetKmh + 18) && (
                    <div
                      className={`flex items-center justify-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-bold font-mono-num ${
                        stats.career.minSpeedGraceActive
                          ? 'border-amber-400/40 bg-amber-500/15 text-amber-200'
                          : 'animate-pulse border-rose-500/60 bg-rose-500/20 text-rose-200'
                      }`}
                    >
                      <Gauge className="h-3 w-3 shrink-0" />
                      <span>
                        {stats.career.minSpeedGraceActive
                          ? `HIZLAN · HEDEF ≥${stats.career.minSpeedTargetKmh} KM/S`
                          : `DİKKAT! ${stats.career.minSpeedTargetKmh} KM/S ALTINA İNME`}
                      </span>
                    </div>
                  )}
              </div>
            )}

            {/* TWO-WAY MODE LIVE HUD */}
            {stats.gameMode === 'twoway' && (
              <div
                className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-[11px] sm:px-3 sm:py-1.5 sm:text-xs font-extrabold tracking-wide transition-colors ${
                  stats.inOncomingLane
                    ? 'border-rose-400/80 bg-rose-950/90 text-rose-200 shadow-lg'
                    : 'border-white/15 bg-zinc-950/88 text-zinc-300'
                }`}
              >
                <ArrowLeftRight
                  className={`h-3.5 w-3.5 shrink-0 ${
                    stats.inOncomingLane ? 'text-rose-400' : 'text-zinc-400'
                  }`}
                />
                <span className="whitespace-nowrap">
                  {stats.inOncomingLane
                    ? 'TERS ŞERİT ×2 PUAN'
                    : 'ÇİFT YÖN · SOL ŞERİT ×2'}
                </span>
              </div>
            )}

            {/* TIME ATTACK MODE LIVE HUD */}
            {stats.gameMode === 'timeattack' && (
              <div
                className={`flex items-center gap-2 rounded-xl border px-2.5 py-1 shadow-lg sm:gap-2.5 sm:px-3 sm:py-1.5 ${
                  stats.timeLeftSec <= 6
                    ? 'border-rose-500/80 bg-rose-950/92 text-rose-200'
                    : stats.timeLeftSec <= 12
                      ? 'border-amber-400/75 bg-zinc-950/92 text-amber-200'
                      : 'border-emerald-400/50 bg-zinc-950/90 text-emerald-200'
                }`}
              >
                <Timer className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                <span className="font-mono-num font-display text-sm sm:text-base font-extrabold leading-none">
                  {stats.timeLeftSec.toFixed(1)}s
                </span>
                <span aria-hidden="true" className="text-zinc-500">
                  ·
                </span>
                <span className="font-mono-num text-[11px] font-semibold text-zinc-200 whitespace-nowrap">
                  Kontrol {stats.nextCheckpointMeters} m
                </span>
              </div>
            )}

            {/* SPEED BOMB MODE LIVE HUD */}
            {stats.gameMode === 'bomb' && (
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`flex items-center gap-2 rounded-xl border px-2.5 py-1 shadow-lg sm:px-3 sm:py-1.5 ${
                    stats.bombArmed && stats.speedKmh < stats.bombMinSpeedKmh
                      ? 'border-rose-500/85 bg-rose-950/92 text-rose-200'
                      : 'border-orange-400/55 bg-zinc-950/90 text-orange-200'
                  }`}
                >
                  <Bomb className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 text-orange-400" />
                  <span className="font-mono-num font-display text-[11px] sm:text-xs font-extrabold whitespace-nowrap">
                    {stats.bombArmed
                      ? `${stats.speedKmh} / MİN ${stats.bombMinSpeedKmh} KM/S`
                      : 'BOMBA KURULUYOR...'}
                  </span>
                </div>
                {stats.bombArmed && stats.bombFuseRatio < 0.99 && (
                  <div className="flex w-44 flex-col gap-0.5 rounded-lg border border-rose-500/80 bg-zinc-950/92 px-2.5 py-1">
                    <div className="flex items-center justify-between text-[10px] font-extrabold text-rose-400">
                      <span>HIZLAN! FİTİL YANIYOR</span>
                      <span className="font-mono-num">
                        {(stats.bombFuseRatio * 5).toFixed(1)}s
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className="h-full bg-rose-500 transition-[width] duration-75"
                        style={{
                          width: `${Math.round(stats.bombFuseRatio * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TOP DRIFT TELEMETRY INSTRUMENT (Frameless motorsport gauge, x1..x10) */}
            {(stats.drifting || stats.driftScore >= 10) && (
              <DriftTelemetryHud
                drifting={stats.drifting}
                driftScore={stats.driftScore}
                driftMultiplier={stats.driftMultiplier}
                driftProgress={stats.driftProgress}
                driftGraceRatio={stats.driftGraceRatio}
                driftAngleDeg={stats.driftAngleDeg}
              />
            )}

            {/* Floating Bonus Callout — Stacked cleanly below active telemetry so it never overlaps */}
            {callout && (
              <div
                key={callout.id}
                className="animate-callout w-full max-w-[min(92vw,360px)] px-2 pt-1 text-center"
              >
                <div
                  className={`flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 font-display text-sm font-bold leading-snug tracking-wide [text-shadow:0_2px_8px_rgba(0,0,0,0.95)] break-words sm:text-xl ${
                    callout.tone === 'amber'
                      ? 'text-amber-300'
                      : callout.tone === 'cyan'
                        ? 'text-sky-300'
                        : callout.tone === 'emerald'
                          ? 'text-emerald-300'
                          : 'text-rose-400'
                  }`}
                >
                  <span>{callout.text}</span>
                  {callout.points && (
                    <span className="font-mono-num text-white">
                      {callout.points}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MAIN MENU — Underground Street Command Deck */}
      {phase === 'menu' && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="pointer-events-auto mx-auto w-full sm:mb-5 sm:w-[min(94vw,610px)]"
        >
          <div
            className="ug-sheet overflow-hidden rounded-t-2xl border-t sm:ug-cut sm:rounded-none sm:border"
            style={{
              paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
            }}
          >
            {/* Street Hazard + Live XP Hairline along top edge */}
            <div className="relative h-1.5 w-full bg-white/8">
              <div
                className="h-full bg-gradient-to-r from-rose-600 via-orange-500 to-amber-400 transition-all duration-300"
                style={{
                  width: `${Math.max(4, Math.round(playerLevel.progressRatio * 100))}%`,
                }}
              />
            </div>

            <div className="flex flex-col gap-3 px-4 pt-3.5 pb-1 sm:p-5">
              {/* Row 1: Active Underground Street Vehicle Plate */}
              <button
                type="button"
                onClick={onOpenGarage}
                className="ug-cut-sm ug-card group flex w-full items-center justify-between gap-2.5 px-3.5 py-2.5 text-left transition-colors hover:border-orange-500/45 cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="ug-cut-sm h-5 w-5 border border-white/35 shrink-0 shadow-inner"
                    style={{ backgroundColor: activeColorSwatch }}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-display italic text-base sm:text-[15px] font-extrabold uppercase tracking-wide text-white group-hover:text-orange-300 transition-colors">
                        {activeModel.name}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-zinc-400">
                      <span className="inline-flex items-center overflow-hidden rounded-[3px] border border-white/25 bg-zinc-100 text-[9px] font-extrabold text-zinc-950">
                        <span className="bg-blue-700 px-1 py-0.5 text-white">
                          TR
                        </span>
                        <span className="px-1.5 py-0.5 font-display tracking-wider uppercase">
                          {licensePlate}
                        </span>
                      </span>
                      <span className="font-display text-[11px] font-semibold tracking-wider text-orange-300/90 uppercase">
                        Atölye &amp; Modifiye
                      </span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-zinc-500 transition-transform group-hover:translate-x-0.5 group-hover:text-orange-400 shrink-0" />
              </button>

              {/* Row 2: Underground Street Career Strip (100 Levels, 300 Stars) */}
              {(() => {
                const activeChapter =
                  CAREER_CHAPTERS.find(
                    (c) =>
                      careerProgress.highestUnlockedLevel >= c.startLevel &&
                      careerProgress.highestUnlockedLevel <= c.endLevel,
                  ) || CAREER_CHAPTERS[0];
                const claimableChestCount = CAREER_STAR_CHESTS.filter(
                  (c) =>
                    careerProgress.totalStars >= c.starsRequired &&
                    !careerProgress.claimedChests.includes(c.starsRequired),
                ).length;
                return (
                  <button
                    type="button"
                    onClick={onOpenCareerMap}
                    className="ug-cut group relative flex min-h-[52px] w-full items-center justify-between gap-2.5 border border-orange-500/40 bg-gradient-to-r from-rose-950/60 via-[#151926] to-[#10141f] px-3.5 py-2.5 text-left transition-all hover:border-orange-400/75 active:scale-[0.99] cursor-pointer"
                  >
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-rose-500 to-orange-400"
                    />
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="ug-cut-sm flex h-9 w-9 shrink-0 items-center justify-center border border-orange-400/45 bg-orange-500/18 text-orange-300">
                        <Map className="h-4.5 w-4.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-display italic text-sm font-extrabold uppercase tracking-wide text-white">
                            Sokak Kariyeri
                          </span>
                          <span className="ug-skew bg-orange-500/25 px-2 py-0.5 font-mono-num text-[10px] font-extrabold text-orange-200 whitespace-nowrap">
                            BÖLÜM {careerProgress.highestUnlockedLevel}/{TOTAL_CAREER_LEVELS}
                          </span>
                          {claimableChestCount > 0 && (
                            <span className="ug-skew bg-emerald-400 px-2 py-0.5 font-display text-[10px] font-extrabold uppercase text-zinc-950 whitespace-nowrap">
                              SANDIK!
                            </span>
                          )}
                        </div>
                        <div className="truncate text-[11px] font-semibold text-zinc-300">
                          {activeChapter.name} · 100 Yarış &amp; Ganimet Kasaları
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      <div className="ug-cut-sm flex items-center gap-1 border border-amber-400/35 bg-[#0a0c13]/85 px-2 py-1 font-mono-num text-xs font-extrabold text-amber-300">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        <span>
                          {careerProgress.totalStars}/{careerProgress.maxStars}
                        </span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-orange-300 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </button>
                );
              })()}

              {/* Row 3: Dominant Primary Street Ignition CTAs */}
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onOpenGarage}
                  className="ug-cut ug-btn-metal flex min-h-[54px] sm:min-h-[50px] shrink-0 items-center justify-center gap-2 px-4 sm:px-5 font-display italic text-sm sm:text-base font-bold uppercase tracking-wider whitespace-nowrap cursor-pointer active:scale-[0.99]"
                >
                  <Wrench className="h-4.5 w-4.5 text-orange-400 shrink-0" />
                  <span>Garaj</span>
                </button>

                <button
                  type="button"
                  onClick={onStart}
                  className="ug-cut ug-btn-fire flex min-h-[54px] sm:min-h-[50px] min-w-0 flex-1 items-center justify-center gap-2 px-4 sm:px-6 font-display italic text-base sm:text-lg font-extrabold uppercase tracking-wider active:scale-[0.99] cursor-pointer"
                >
                  <Play className="h-5 w-5 fill-current shrink-0" />
                  <span className="truncate">Sokağa Çık · Gazla</span>
                </button>
              </div>

              {/* Row 4: 4-Column Tactical Underground Dock */}
              <div className="grid grid-cols-4 gap-1.5 border-t border-white/10 pt-2.5">
                <button
                  type="button"
                  onClick={onOpenLeaderboard}
                  className="ug-cut-sm flex min-h-[54px] sm:min-h-[46px] flex-col items-center justify-center gap-1 border border-white/8 bg-[#121622]/90 px-1 font-display text-[11px] font-bold uppercase tracking-wide text-zinc-300 transition-colors hover:border-orange-500/45 hover:text-white cursor-pointer"
                >
                  <Medal className="h-5 w-5 sm:h-4 sm:w-4 text-orange-400" />
                  <span className="truncate max-w-full">Sıralama</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenDailyWheel}
                  className={`ug-cut-sm flex min-h-[54px] sm:min-h-[46px] flex-col items-center justify-center gap-1 border px-1 font-display text-[11px] font-bold uppercase tracking-wide transition-colors cursor-pointer ${
                    freeWheelAvailable
                      ? 'border-emerald-400/50 bg-emerald-500/16 text-emerald-200 hover:bg-emerald-500/24'
                      : 'border-white/8 bg-[#121622]/90 text-zinc-300 hover:border-orange-500/45 hover:text-white'
                  }`}
                >
                  <Gift className="h-5 w-5 sm:h-4 sm:w-4 text-emerald-400" />
                  <span className="truncate max-w-full">
                    {freeWheelAvailable ? 'Çark Hazır' : `Seri ${streakDay}/7`}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setMissionsOpen(true)}
                  className={`ug-cut-sm relative flex min-h-[54px] sm:min-h-[46px] flex-col items-center justify-center gap-1 border px-1 font-display text-[11px] font-bold uppercase tracking-wide transition-colors cursor-pointer ${
                    missions.totalClaimableCount > 0
                      ? 'border-emerald-400/60 bg-emerald-500/18 text-emerald-200 hover:bg-emerald-500/26'
                      : 'border-white/8 bg-[#121622]/90 text-zinc-300 hover:border-orange-500/45 hover:text-white'
                  }`}
                >
                  {missions.totalClaimableCount > 0 && (
                    <span className="ug-skew absolute right-1 top-1 flex h-4 min-w-[18px] items-center justify-center bg-emerald-400 px-1 text-[10px] font-extrabold text-zinc-950 font-mono-num">
                      {missions.totalClaimableCount}
                    </span>
                  )}
                  <Trophy
                    className={`h-5 w-5 sm:h-4 sm:w-4 ${
                      missions.totalClaimableCount > 0
                        ? 'text-emerald-400'
                        : 'text-orange-400'
                    }`}
                  />
                  <span className="truncate max-w-full">
                    {missions.totalClaimableCount > 0 ? 'Ödül Al!' : 'Görevler'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenStore('bundles')}
                  className="ug-cut-sm flex min-h-[54px] sm:min-h-[46px] flex-col items-center justify-center gap-1 border border-orange-500/40 bg-gradient-to-b from-rose-500/18 to-orange-500/14 px-1 font-display text-[11px] font-bold uppercase tracking-wide text-orange-200 transition-colors hover:border-orange-400/75 hover:text-white cursor-pointer"
                >
                  <ShoppingBag className="h-5 w-5 sm:h-4 sm:w-4 text-orange-400" />
                  <span className="truncate max-w-full">
                    {adFreePurchased ? 'VIP Market' : 'Market'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PAUSE MODAL */}
      {phase === 'paused' && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="pointer-events-auto fixed inset-0 z-[25] flex items-end justify-center bg-black/78 p-0 sm:items-center sm:p-4"
        >
          <div
            className="animate-sheet-up ug-sheet w-full rounded-t-2xl border-t px-5 pt-3.5 sm:ug-cut sm:w-[min(92vw,390px)] sm:rounded-none sm:border sm:p-6"
            style={{
              paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))',
            }}
          >
            <div className="mx-auto mb-3 h-1 w-11 rounded-full bg-white/20 sm:hidden" />
            <div className="inline-flex items-center gap-1.5 font-display text-[11px] font-bold tracking-[0.18em] text-orange-400 uppercase">
              <span>UNDERGROUND // MOLA</span>
            </div>
            <h2 className="mt-0.5 font-display italic text-2xl font-extrabold uppercase tracking-wide text-white">
              Yarış Duraklatıldı
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-zinc-400 font-mono-num">
              {stats.career
                ? `Bölüm ${stats.career.levelId} · ${stats.career.title} · ${stats.career.remainingMeters} m kaldı`
                : `${formatDistance(stats.distanceMeters)} · ${stats.score.toLocaleString('tr-TR')} puan`}
            </p>

            <div className="mt-5 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={onTogglePause}
                className="ug-cut ug-btn-fire flex min-h-[52px] w-full items-center justify-center gap-2 px-5 font-display italic text-base font-extrabold uppercase tracking-wider active:scale-[0.99] cursor-pointer"
              >
                <Play className="h-5 w-5 fill-current" />
                <span>Yarışa Devam Et</span>
              </button>
              <button
                type="button"
                onClick={
                  stats.career
                    ? () => onStartCareerLevel(stats.career!.levelId)
                    : onStart
                }
                className="ug-cut-sm ug-btn-metal flex min-h-[48px] w-full items-center justify-center gap-2 px-5 font-display text-sm font-bold uppercase tracking-wide active:scale-[0.99] cursor-pointer"
              >
                <RotateCcw className="h-4 w-4 text-orange-400" />
                <span>
                  {stats.career
                    ? `Bölüm ${stats.career.levelId} · Yeniden Başlat`
                    : 'Yeniden Başla'}
                </span>
              </button>
              {stats.career && (
                <button
                  type="button"
                  onClick={onOpenCareerMap}
                  className="ug-cut-sm flex min-h-[48px] w-full items-center justify-center gap-2 border border-orange-500/40 bg-orange-500/14 px-5 font-display text-sm font-bold uppercase tracking-wide text-orange-200 hover:bg-orange-500/22 active:scale-[0.99] cursor-pointer"
                >
                  <Map className="h-4 w-4 text-orange-400" />
                  <span>Kariyer Haritası</span>
                </button>
              )}
              <button
                type="button"
                onClick={onOpenSettings}
                className="ug-cut-sm ug-btn-metal flex min-h-[48px] w-full items-center justify-center gap-2 px-5 font-display text-sm font-bold uppercase tracking-wide active:scale-[0.99] cursor-pointer"
              >
                <Settings className="h-4 w-4 text-orange-400" />
                <span>Ayarlar &amp; Kontroller</span>
              </button>
              <div className="grid grid-cols-2 gap-2.5 pt-0.5">
                <button
                  type="button"
                  onClick={onOpenGarage}
                  className="ug-cut-sm ug-btn-metal flex min-h-[48px] items-center justify-center gap-2 px-3 font-display text-sm font-bold uppercase tracking-wide active:scale-[0.99] cursor-pointer"
                >
                  <CarFront className="h-4 w-4 text-orange-400" />
                  <span>Garaj</span>
                </button>
                <button
                  type="button"
                  onClick={onReturnMenu}
                  className="ug-cut-sm ug-btn-metal flex min-h-[48px] items-center justify-center gap-2 px-3 font-display text-sm font-bold uppercase tracking-wide active:scale-[0.99] cursor-pointer"
                >
                  <Home className="h-4 w-4 text-zinc-400" />
                  <span>Ana Menü</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER / CAREER RESULT MODAL */}
      {phase === 'gameover' &&
        showGameOverModal &&
        lastCareerOutcome && (
          <div
            onPointerDown={(e) => e.stopPropagation()}
            className="pointer-events-auto fixed inset-0 z-[25] flex items-end justify-center bg-black/76 p-0 sm:items-center sm:p-4"
          >
            <div
              className="animate-sheet-up ug-sheet max-h-[90dvh] w-full overflow-y-auto custom-scroll rounded-t-2xl border-t px-5 pt-3.5 sm:ug-cut sm:max-h-[92dvh] sm:w-[min(92vw,440px)] sm:rounded-none sm:border sm:p-6"
              style={{
                paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))',
              }}
            >
              <div className="mx-auto mb-3 h-1 w-11 rounded-full bg-white/20 sm:hidden" />

              {/* 3 Large Stars Showcase */}
              <div className="flex flex-col items-center text-center">
                <div className="flex items-center justify-center gap-3">
                  {[1, 2, 3].map((idx) => {
                    const earned = idx <= lastCareerOutcome.starsEarned;
                    return (
                      <div
                        key={idx}
                        className={`ug-cut-sm flex items-center justify-center p-2.5 ${
                          idx === 2 ? '-translate-y-1.5 scale-110' : ''
                        } ${
                          earned
                            ? 'border border-amber-400/60 bg-amber-500/20'
                            : 'border border-white/10 bg-[#121622]'
                        }`}
                      >
                        <Star
                          className={`h-8 w-8 sm:h-9 sm:w-9 ${
                            earned
                              ? 'fill-amber-400 text-amber-300 drop-shadow-[0_0_12px_rgba(251,191,36,0.65)]'
                              : 'text-zinc-700'
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>

                <div
                  className={`mt-2.5 font-display italic text-xs font-extrabold tracking-widest uppercase ${
                    lastCareerOutcome.won
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }`}
                >
                  {lastCareerOutcome.won
                    ? lastCareerOutcome.starsEarned === 3
                      ? 'SOKAK EFSANESİ · 3 YILDIZ!'
                      : 'BİTİŞ ÇİZGİSİ GEÇİLDİ!'
                    : 'BİTİŞ ÇİZGİSİNE ULAŞILAMADI'}
                </div>

                <h2 className="mt-1 font-display italic text-2xl font-extrabold uppercase tracking-wide text-white">
                  Bölüm {lastCareerOutcome.levelId} ·{' '}
                  {lastCareerOutcome.levelTitle}
                </h2>

                <div className="mt-1 flex items-center justify-center gap-3 text-xs text-zinc-400 font-mono-num">
                  <span>
                    {formatDistance(stats.distanceMeters)} /{' '}
                    {formatDistance(lastCareerOutcome.targetDistanceMeters)}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{lastCareerOutcome.elapsedSec.toFixed(1)} sn</span>
                  <span aria-hidden="true">·</span>
                  <span>{stats.score.toLocaleString('tr-TR')} puan</span>
                </div>
              </div>

              {/* 3-Star Criteria Breakdown */}
              <div className="mt-4 flex flex-col gap-2">
                {/* Star 1: Reach Finish Line */}
                <div
                  className={`ug-cut-sm flex items-center justify-between gap-2.5 border px-3 py-2.5 ${
                    lastCareerOutcome.won
                      ? 'border-emerald-400/40 bg-emerald-500/12'
                      : 'border-rose-500/35 bg-rose-500/10'
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    {lastCareerOutcome.won ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
                    ) : (
                      <XCircle className="h-5 w-5 shrink-0 text-rose-400" />
                    )}
                    <div className="min-w-0">
                      <div className="truncate font-display text-xs font-bold text-white">
                        ★ 1 · Bitiş Çizgisine Ulaş (
                        {formatDistance(lastCareerOutcome.targetDistanceMeters)})
                      </div>
                      <div className="text-[11px] text-zinc-300">
                        {lastCareerOutcome.won
                          ? 'Tamamlandı'
                          : `${Math.max(0, lastCareerOutcome.targetDistanceMeters - stats.distanceMeters)} m kalmıştı`}
                      </div>
                    </div>
                  </div>
                  {(lastCareerOutcome.rewardBreakdown.finishGold > 0 ||
                    lastCareerOutcome.rewardBreakdown.replayGold > 0) && (
                    <span className="shrink-0 font-mono-num text-xs font-extrabold text-amber-300">
                      +
                      {lastCareerOutcome.rewardBreakdown.finishGold ||
                        lastCareerOutcome.rewardBreakdown.replayGold}
                    </span>
                  )}
                </div>

                {/* Star 2 & 3: Level Missions */}
                {[
                  {
                    starNum: 2,
                    evalRes: lastCareerOutcome.mission1,
                    gold: lastCareerOutcome.rewardBreakdown.mission1Gold,
                  },
                  {
                    starNum: 3,
                    evalRes: lastCareerOutcome.mission2,
                    gold: lastCareerOutcome.rewardBreakdown.mission2Gold,
                  },
                ].map(({ starNum, evalRes, gold }) => {
                  const earnedStar =
                    lastCareerOutcome.won && evalRes.completed;
                  return (
                    <div
                      key={evalRes.spec.id}
                      className={`ug-cut-sm flex items-center justify-between gap-2.5 border px-3 py-2.5 ${
                        earnedStar
                          ? 'border-emerald-400/40 bg-emerald-500/12'
                          : evalRes.completed
                            ? 'border-orange-400/35 bg-orange-500/10'
                            : 'border-white/10 bg-[#131722]'
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        {earnedStar ? (
                          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
                        ) : (
                          <Star className="h-5 w-5 shrink-0 text-zinc-600" />
                        )}
                        <div className="min-w-0">
                          <div className="truncate font-display text-xs font-bold text-white">
                            ★ {starNum} · {evalRes.spec.title}
                          </div>
                          <div className="font-mono-num text-[11px] text-zinc-400">
                            {evalRes.progressText}
                            {!lastCareerOutcome.won && evalRes.completed
                              ? ' (Yıldız için bitişe ulaş)'
                              : ''}
                          </div>
                        </div>
                      </div>
                      {gold > 0 && (
                        <span className="shrink-0 font-mono-num text-xs font-extrabold text-amber-300">
                          +{gold}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Total Reward Banner */}
              <div className="ug-cut-sm mt-3.5 flex flex-wrap items-center justify-between gap-2 border border-amber-400/35 bg-amber-500/10 px-3.5 py-2.5">
                <div className="flex items-center gap-2">
                  <Coins className="h-4.5 w-4.5 text-amber-400 shrink-0" />
                  <div className="font-display text-xs font-bold uppercase tracking-wide text-amber-200">
                    Yarış Ödülü
                    {lastCareerOutcome.rewardBreakdown.perfectBonusGold > 0 && (
                      <span className="ug-skew ml-1.5 bg-amber-400/25 px-1.5 py-0.5 text-[10px] font-extrabold text-amber-200">
                        3★ +{lastCareerOutcome.rewardBreakdown.perfectBonusGold}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 font-mono-num text-xs font-extrabold">
                  <span className="text-amber-300">
                    +
                    {(
                      lastCareerOutcome.rewardGoldAwarded + stats.runGold
                    ).toLocaleString('tr-TR')}{' '}
                    Altın
                  </span>
                  {lastCareerOutcome.rewardXpAwarded > 0 && (
                    <span className="text-emerald-300">
                      +{lastCareerOutcome.rewardXpAwarded} XP
                    </span>
                  )}
                </div>
              </div>

              {/* Revive CTAs on Career Crash */}
              {!lastCareerOutcome.won && (
                <div className="mt-3.5 flex flex-col gap-2">
                  <button
                    type="button"
                    disabled={diamonds < diamondReviveCost}
                    onClick={onDiamondRevive}
                    className={`ug-cut flex min-h-[50px] w-full items-center justify-between gap-2 border px-4 font-display italic text-sm font-extrabold uppercase tracking-wider transition-all ${
                      diamonds >= diamondReviveCost
                        ? 'border-cyan-300/75 bg-gradient-to-r from-cyan-500/28 via-sky-500/22 to-cyan-500/28 text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.24)] hover:border-cyan-200 hover:from-cyan-500/38 hover:to-cyan-500/38 active:scale-[0.99] cursor-pointer'
                        : 'border-cyan-400/25 bg-[#0a131f] text-zinc-400 opacity-65 cursor-not-allowed'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2 min-w-0">
                      <Gem className="h-4.5 w-4.5 text-cyan-400 shrink-0" />
                      <span className="truncate">
                        Elmasla Tamir &amp; Devam
                      </span>
                    </span>
                    <span className="ug-skew inline-flex items-center gap-1 bg-cyan-400/20 border border-cyan-300/45 px-2.5 py-0.5 font-mono-num text-xs font-extrabold text-cyan-200 shrink-0">
                      <Gem className="h-3 w-3 text-cyan-300" />
                      <span>
                        {diamonds >= diamondReviveCost
                          ? `${diamondReviveCost} Elmas`
                          : `${diamonds}/${diamondReviveCost}`}
                      </span>
                    </span>
                  </button>

                  {!revivedThisRun && (
                    <button
                      type="button"
                      onClick={onWatchAdRevive}
                      className="ug-cut flex min-h-[50px] w-full items-center justify-center gap-2 border border-emerald-400/55 bg-emerald-500/20 px-4 font-display italic text-sm font-bold uppercase tracking-wider text-emerald-200 hover:bg-emerald-500/30 active:scale-[0.99] cursor-pointer"
                    >
                      <HeartPulse className="h-5 w-5 text-emerald-400 shrink-0" />
                      <span>Reklam İzle · Devam Et</span>
                    </button>
                  )}
                </div>
              )}

              {/* Primary + Secondary Actions */}
              <div className="mt-4 flex flex-col gap-2.5">
                {lastCareerOutcome.won &&
                lastCareerOutcome.levelId < TOTAL_CAREER_LEVELS ? (
                  <button
                    type="button"
                    onClick={() =>
                      onStartCareerLevel(lastCareerOutcome.levelId + 1)
                    }
                    className="ug-cut ug-btn-fire flex min-h-[52px] w-full items-center justify-center gap-2 px-5 font-display italic text-base font-extrabold uppercase tracking-wider active:scale-[0.99] cursor-pointer"
                  >
                    <span>
                      Sonraki Yarış (Bölüm {lastCareerOutcome.levelId + 1})
                    </span>
                    <ArrowRight className="h-5 w-5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      onStartCareerLevel(lastCareerOutcome.levelId)
                    }
                    className="ug-cut ug-btn-fire flex min-h-[52px] w-full items-center justify-center gap-2 px-5 font-display italic text-base font-extrabold uppercase tracking-wider active:scale-[0.99] cursor-pointer"
                  >
                    <RotateCcw className="h-5 w-5" />
                    <span>Tekrar Gazla</span>
                  </button>
                )}

                <div className="grid grid-cols-4 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      onStartCareerLevel(lastCareerOutcome.levelId)
                    }
                    className="ug-cut-sm ug-btn-metal flex min-h-[54px] flex-col items-center justify-center gap-1 px-1 font-display text-[11px] font-bold uppercase active:scale-[0.98] cursor-pointer sm:min-h-[44px] sm:flex-row sm:gap-1.5"
                  >
                    <RotateCcw className="h-4 w-4 text-orange-400" />
                    <span>Tekrar</span>
                  </button>
                  <button
                    type="button"
                    onClick={onOpenCareerMap}
                    className="ug-cut-sm flex min-h-[54px] flex-col items-center justify-center gap-1 border border-orange-500/40 bg-orange-500/15 px-1 font-display text-[11px] font-bold uppercase text-orange-200 hover:bg-orange-500/24 active:scale-[0.98] cursor-pointer sm:min-h-[44px] sm:flex-row sm:gap-1.5"
                  >
                    <Map className="h-4 w-4 text-orange-400" />
                    <span>Harita</span>
                  </button>
                  <button
                    type="button"
                    onClick={onOpenGarage}
                    className="ug-cut-sm ug-btn-metal flex min-h-[54px] flex-col items-center justify-center gap-1 px-1 font-display text-[11px] font-bold uppercase active:scale-[0.98] cursor-pointer sm:min-h-[44px] sm:flex-row sm:gap-1.5"
                  >
                    <CarFront className="h-4 w-4 text-orange-400" />
                    <span>Garaj</span>
                  </button>
                  <button
                    type="button"
                    onClick={onReturnMenu}
                    className="ug-cut-sm ug-btn-metal flex min-h-[54px] flex-col items-center justify-center gap-1 px-1 font-display text-[11px] font-bold uppercase text-zinc-300 active:scale-[0.98] cursor-pointer sm:min-h-[44px] sm:flex-row sm:gap-1.5"
                  >
                    <Home className="h-4 w-4" />
                    <span>Menü</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* GAME OVER MODAL (Free-Play Modes) */}
      {phase === 'gameover' &&
        showGameOverModal &&
        !lastCareerOutcome &&
        (() => {
          const rentedSpec = stats.rentedCarModel
            ? CAR_MODELS.find((m) => m.id === stats.rentedCarModel) || null
            : null;

          const runModeSpec =
            GAME_MODES.find((m) => m.id === stats.gameMode) || GAME_MODES[0];
          const gameOverHeadline =
            stats.gameOverReason === 'timeout'
              ? 'SÜRE DOLDU · ZAMANA KARŞI'
              : stats.gameOverReason === 'bomb'
                ? 'BOMBA PATLADI · HIZ BOMBASI'
                : `ARAÇ PERT · ${runModeSpec.label.toUpperCase()}`;

          return (
            <div
              onPointerDown={(e) => e.stopPropagation()}
              className="pointer-events-auto fixed inset-0 z-[25] flex items-end justify-center bg-black/76 p-0 sm:items-center sm:p-4"
            >
              <div
                className="animate-sheet-up ug-sheet max-h-[90dvh] w-full overflow-y-auto custom-scroll rounded-t-2xl border-t px-5 pt-3.5 sm:ug-cut sm:max-h-[92dvh] sm:w-[min(92vw,428px)] sm:rounded-none sm:border sm:p-6"
                style={{
                  paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))',
                }}
              >
                <div className="mx-auto mb-3 h-1 w-11 rounded-full bg-white/20 sm:hidden" />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 font-display italic text-xs font-extrabold tracking-wider text-rose-400">
                      <span>{gameOverHeadline}</span>
                      {runModeSpec.rewardMultiplier > 1 && (
                        <span className="ug-skew bg-white/10 px-1.5 py-0.5 font-mono-num text-[11px] font-bold text-zinc-200">
                          ×{runModeSpec.rewardMultiplier}
                        </span>
                      )}
                      {rentedSpec && (
                        <span className="ug-skew bg-orange-500/20 px-2 py-0.5 text-[10.5px] font-bold text-orange-200">
                          KİRALIK: {rentedSpec.name}
                        </span>
                      )}
                    </div>
                    <h2 className="mt-1 font-display italic text-3xl font-extrabold leading-none text-white sm:text-3xl font-mono-num">
                      {stats.score.toLocaleString('tr-TR')}{' '}
                      <span className="font-display text-sm font-bold tracking-wider uppercase text-zinc-400">
                        PUAN
                      </span>
                    </h2>
                  </div>
                  <div className="ug-cut-sm border border-orange-500/30 bg-[#121622] px-2.5 py-1.5 shrink-0 text-right">
                    <div className="font-display text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      EN İYİ
                    </div>
                    <div className="font-display text-base font-extrabold text-orange-300 font-mono-num">
                      {stats.bestScore.toLocaleString('tr-TR')}
                    </div>
                  </div>
                </div>

                <div className="mt-3.5 grid grid-cols-3 gap-2 text-center">
                  <div className="ug-cut-sm ug-card p-2.5">
                    <div className="font-display text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Mesafe
                    </div>
                    <div className="mt-1 font-mono-num text-base font-bold text-white">
                      {formatDistance(stats.distanceMeters)}
                    </div>
                  </div>
                  <div className="ug-cut-sm ug-card p-2.5">
                    <div className="font-display text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Altın
                    </div>
                    <div className="mt-1 font-mono-num text-base font-bold text-amber-300">
                      +{stats.runGold}
                    </div>
                    {stats.runDiamonds > 0 && (
                      <div className="mt-0.5 inline-flex items-center gap-0.5 font-mono-num text-[11px] font-bold text-cyan-300">
                        <Gem className="h-3 w-3 text-cyan-400" />
                        <span>+{stats.runDiamonds}</span>
                      </div>
                    )}
                  </div>
                  <div className="ug-cut-sm ug-card p-2.5">
                    <div className="font-display text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      {stats.gameMode === 'timeattack' ? 'Kontrol' : 'Makas'}
                    </div>
                    <div className="mt-1 font-mono-num text-base font-bold text-emerald-300">
                      {stats.gameMode === 'timeattack'
                        ? stats.checkpointsCleared
                        : stats.nearMissCount}
                    </div>
                  </div>
                </div>

                {/* Driver Level & Tier XP Progress Bar */}
                {(() => {
                  const runTier = getDriverRankTier(stats.playerLevel.level);
                  const remainingXp = Math.max(
                    0,
                    stats.playerLevel.nextLevelXpRequired -
                      stats.playerLevel.currentLevelXp,
                  );
                  return (
                    <button
                      type="button"
                      onClick={() => onOpenLevelRoad()}
                      className={`ug-cut-sm mt-3.5 flex w-full items-center gap-3 border ${
                        unclaimedLevelRewardsCount > 0
                          ? 'border-orange-400/75 bg-orange-500/12'
                          : 'border-white/12 bg-[#131722]'
                      } px-3.5 py-3 text-left transition-colors hover:border-orange-500/50 cursor-pointer`}
                    >
                      <DriverLevelEmblem
                        level={stats.playerLevel.level}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span
                            className={`truncate font-display italic text-xs font-extrabold uppercase ${runTier.textClass}`}
                          >
                            SV. {stats.playerLevel.level} ·{' '}
                            {stats.playerLevel.rankTitle}
                          </span>
                          {unclaimedLevelRewardsCount > 0 ? (
                            <span className="ug-skew inline-flex items-center gap-1 bg-gradient-to-r from-rose-600 to-orange-500 px-2 py-0.5 text-[10.5px] font-extrabold text-white font-mono-num whitespace-nowrap">
                              <Gift className="h-3 w-3 shrink-0" />
                              <span>{unclaimedLevelRewardsCount} ÖDÜL</span>
                            </span>
                          ) : (
                            <span className="font-mono-num text-xs text-zinc-300 whitespace-nowrap">
                              {remainingXp.toLocaleString('tr-TR')} XP
                            </span>
                          )}
                        </div>
                        <div className="mt-1.5">
                          <SegmentedXpBar
                            level={stats.playerLevel.level}
                            progressRatio={stats.playerLevel.progressRatio}
                            segments={10}
                            heightClass="h-1.5"
                          />
                        </div>
                      </div>
                    </button>
                  );
                })()}

                <div className="mt-3.5 flex flex-col gap-2">
                  <button
                    type="button"
                    disabled={diamonds < diamondReviveCost}
                    onClick={onDiamondRevive}
                    className={`ug-cut flex min-h-[50px] w-full items-center justify-between gap-2 border px-4 font-display italic text-sm font-extrabold uppercase tracking-wider transition-all ${
                      diamonds >= diamondReviveCost
                        ? 'border-cyan-300/75 bg-gradient-to-r from-cyan-500/28 via-sky-500/22 to-cyan-500/28 text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.24)] hover:border-cyan-200 hover:from-cyan-500/38 hover:to-cyan-500/38 active:scale-[0.99] cursor-pointer'
                        : 'border-cyan-400/25 bg-[#0a131f] text-zinc-400 opacity-65 cursor-not-allowed'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2 min-w-0">
                      <Gem className="h-4.5 w-4.5 text-cyan-400 shrink-0" />
                      <span className="truncate">
                        Elmasla Tamir &amp; Devam
                      </span>
                    </span>
                    <span className="ug-skew inline-flex items-center gap-1 bg-cyan-400/20 border border-cyan-300/45 px-2.5 py-0.5 font-mono-num text-xs font-extrabold text-cyan-200 shrink-0">
                      <Gem className="h-3 w-3 text-cyan-300" />
                      <span>
                        {diamonds >= diamondReviveCost
                          ? `${diamondReviveCost} Elmas`
                          : `${diamonds}/${diamondReviveCost}`}
                      </span>
                    </span>
                  </button>

                  {!revivedThisRun && (
                    <button
                      type="button"
                      onClick={onWatchAdRevive}
                      className="ug-cut flex min-h-[50px] w-full items-center justify-center gap-2 border border-emerald-400/55 bg-emerald-500/20 px-4 font-display italic text-sm font-bold uppercase tracking-wider text-emerald-200 hover:bg-emerald-500/30 active:scale-[0.99] cursor-pointer"
                    >
                      <HeartPulse className="h-5 w-5 text-emerald-400 shrink-0" />
                      <span>Reklam İzle · Devam Et</span>
                    </button>
                  )}

                  {stats.runGold > 0 && !runGoldDoubled && (
                    <button
                      type="button"
                      onClick={onWatchAdDoubleGold}
                      className="ug-cut-sm flex min-h-[48px] w-full items-center justify-center gap-2 border border-sky-400/45 bg-sky-500/15 px-4 font-display italic text-sm font-bold uppercase tracking-wide text-sky-200 hover:bg-sky-500/25 active:scale-[0.99] cursor-pointer"
                    >
                      <PlayCircle className="h-5 w-5 text-sky-400 shrink-0" />
                      <span>Altını 2× Katla (+{stats.runGold} Altın)</span>
                    </button>
                  )}

                  {rentedSpec &&
                    !rentedSpec.priceDiamonds &&
                    !unlockedCars.includes(rentedSpec.id) && (
                      <button
                        type="button"
                        onClick={() =>
                          onRentCar(rentedSpec.id, rentedSpec.name)
                        }
                        className="ug-cut-sm flex min-h-[46px] w-full items-center justify-center gap-2 border border-orange-400/45 bg-orange-500/14 px-4 font-display text-xs font-bold uppercase tracking-wide text-orange-200 hover:bg-orange-500/24 active:scale-[0.99] cursor-pointer"
                      >
                        <PlayCircle className="h-4 w-4 text-orange-400 shrink-0" />
                        <span>{rentedSpec.name} · 1 Koşu Daha Kirala</span>
                      </button>
                    )}

                  {stats.runGold > 0 && runGoldDoubled && (
                    <div className="flex min-h-[34px] items-center justify-center gap-1.5 text-xs font-bold text-emerald-300">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Bu Koşunun Altını 2× Yapıldı</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={onStart}
                    className="ug-cut ug-btn-fire flex min-h-[52px] w-full items-center justify-center gap-2 px-5 font-display italic text-base font-extrabold uppercase tracking-wider active:scale-[0.99] cursor-pointer"
                  >
                    <RotateCcw className="h-5 w-5" />
                    <span>Tekrar Sokağa Çık</span>
                  </button>

                  <div className="grid grid-cols-4 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={onOpenGarage}
                      className="ug-cut-sm ug-btn-metal flex min-h-[54px] flex-col items-center justify-center gap-1 px-1 font-display text-[11px] font-bold uppercase active:scale-[0.98] cursor-pointer sm:min-h-[44px] sm:flex-row sm:gap-1.5"
                    >
                      <CarFront className="h-4 w-4 text-orange-400" />
                      <span>Garaj</span>
                    </button>
                    <button
                      type="button"
                      onClick={onOpenLeaderboard}
                      className="ug-cut-sm ug-btn-metal flex min-h-[54px] flex-col items-center justify-center gap-1 px-1 font-display text-[11px] font-bold uppercase active:scale-[0.98] cursor-pointer sm:min-h-[44px] sm:flex-row sm:gap-1.5"
                    >
                      <Medal className="h-4 w-4 text-orange-400" />
                      <span>Sıra</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMissionsOpen(true)}
                      className={`ug-cut-sm relative flex min-h-[54px] flex-col items-center justify-center gap-1 border px-1 font-display text-[11px] font-bold uppercase active:scale-[0.98] cursor-pointer sm:min-h-[44px] sm:flex-row sm:gap-1.5 ${
                        missions.totalClaimableCount > 0
                          ? 'border-emerald-400/55 bg-emerald-500/18 text-emerald-200 hover:bg-emerald-500/26'
                          : 'ug-btn-metal'
                      }`}
                    >
                      <Trophy
                        className={`h-4 w-4 ${
                          missions.totalClaimableCount > 0
                            ? 'text-emerald-400'
                            : 'text-orange-400'
                        }`}
                      />
                      <span>Görev</span>
                      {missions.totalClaimableCount > 0 && (
                        <span className="ug-skew absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center bg-emerald-400 px-1 text-[10px] font-extrabold text-zinc-950 font-mono-num sm:static sm:ml-0.5">
                          {missions.totalClaimableCount}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={onReturnMenu}
                      className="ug-cut-sm ug-btn-metal flex min-h-[54px] flex-col items-center justify-center gap-1 px-1 font-display text-[11px] font-bold uppercase text-zinc-300 active:scale-[0.98] cursor-pointer sm:min-h-[44px] sm:flex-row sm:gap-1.5"
                    >
                      <Home className="h-4 w-4" />
                      <span>Menü</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

      {/* Missions & Achievements Modal */}
      {missionsOpen &&
        (phase === 'menu' || (phase === 'gameover' && showGameOverModal)) && (
          <div
            onPointerDown={(e) => e.stopPropagation()}
            className="pointer-events-auto fixed inset-0 z-30 flex items-end justify-center bg-black/82 p-0 sm:items-center sm:p-4"
          >
            <div
              className="animate-sheet-up ug-sheet flex max-h-[90dvh] w-full flex-col rounded-t-2xl border-t px-4 pt-3.5 sm:ug-cut sm:max-h-[86vh] sm:w-[min(95vw,580px)] sm:rounded-none sm:border sm:p-5"
              style={{
                paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))',
              }}
            >
              <div className="mx-auto mb-2.5 h-1 w-11 shrink-0 rounded-full bg-white/20 sm:hidden" />
              <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div className="min-w-0">
                  <div className="font-display text-[10px] font-bold tracking-[0.18em] text-orange-400 uppercase">
                    SOKAK KONTRATLARI
                  </div>
                  <h2 className="font-display italic text-xl font-extrabold uppercase tracking-wide text-white">
                    Görevler ve Başarımlar
                  </h2>
                  <div className="mt-1 flex items-center gap-2 text-xs text-zinc-400">
                    <DriverLevelEmblem
                      level={playerLevel.level}
                      size="xs"
                      showNumber={false}
                    />
                    <span
                      className={`font-display font-bold uppercase ${playerRankTier.textClass} shrink-0`}
                    >
                      SV. {playerLevel.level} · {playerLevel.rankTitle}
                    </span>
                    <span
                      aria-hidden="true"
                      className="hidden text-zinc-600 sm:inline"
                    >
                      ·
                    </span>
                    <span className="hidden truncate sm:inline">
                      Tamamlanan kontratlara dokunarak ödülünü al
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMissionsOpen(false)}
                  aria-label="Kapat"
                  className="ug-cut-sm ug-btn-metal flex h-11 w-11 items-center justify-center cursor-pointer shrink-0"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="ug-cut-sm mt-3 flex items-center gap-1.5 border border-white/10 bg-[#111520] p-1">
                <button
                  type="button"
                  onClick={() => setMissionsTab('missions')}
                  className={`ug-cut-sm flex min-h-[44px] flex-1 items-center justify-center gap-1.5 px-3 py-2 font-display italic text-xs font-extrabold uppercase tracking-wide transition-all cursor-pointer sm:text-sm ${
                    missionsTab === 'missions'
                      ? 'ug-tab-active'
                      : 'text-zinc-300 hover:text-white'
                  }`}
                >
                  <span>
                    Günlük (
                    {missions.activeMissions.filter((m) => m.claimed).length}/
                    {missions.activeMissions.length})
                  </span>
                  {missions.claimableMissionsCount > 0 && (
                    <span
                      className={`ug-skew flex h-5 min-w-[20px] items-center justify-center px-1.5 text-[11px] font-extrabold font-mono-num ${
                        missionsTab === 'missions'
                          ? 'bg-zinc-950 text-emerald-300'
                          : 'bg-emerald-400 text-zinc-950'
                      }`}
                    >
                      {missions.claimableMissionsCount}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setMissionsTab('achievements')}
                  className={`ug-cut-sm flex min-h-[44px] flex-1 items-center justify-center gap-1.5 px-3 py-2 font-display italic text-xs font-extrabold uppercase tracking-wide transition-all cursor-pointer sm:text-sm ${
                    missionsTab === 'achievements'
                      ? 'ug-tab-active'
                      : 'text-zinc-300 hover:text-white'
                  }`}
                >
                  <span>
                    Başarımlar ({unlockedAchCount}/{totalAchCount})
                  </span>
                  {missions.claimableAchievementsCount > 0 && (
                    <span
                      className={`ug-skew flex h-5 min-w-[20px] items-center justify-center px-1.5 text-[11px] font-extrabold font-mono-num ${
                        missionsTab === 'achievements'
                          ? 'bg-zinc-950 text-emerald-300'
                          : 'bg-emerald-400 text-zinc-950'
                      }`}
                    >
                      {missions.claimableAchievementsCount}
                    </span>
                  )}
                </button>
              </div>

              {missionsTab === 'missions' && (
                <div className="ug-cut-sm mt-2.5 flex items-center justify-between gap-2 border border-white/10 bg-[#121622] px-3.5 py-2.5 text-xs">
                  <span className="text-zinc-300">
                    Her gün 00:00&apos;da 3 yeni sokak kontratı
                  </span>
                  <span className="inline-flex items-center gap-1 font-mono-num font-bold text-orange-300 shrink-0">
                    <Timer className="h-3.5 w-3.5 text-orange-400" />
                    <span>{dailyCountdown}</span>
                  </span>
                </div>
              )}

              {(() => {
                const tabClaimableGold =
                  missionsTab === 'missions'
                    ? missions.activeMissions
                        .filter((m) => m.completed && !m.claimed)
                        .reduce((acc, m) => acc + m.rewardGold, 0)
                    : missions.achievements
                        .filter((a) => a.unlocked && !a.claimed)
                        .reduce((acc, a) => acc + a.rewardGold, 0);
                const tabClaimableCount =
                  missionsTab === 'missions'
                    ? missions.claimableMissionsCount
                    : missions.claimableAchievementsCount;

                if (tabClaimableCount <= 1) return null;
                return (
                  <button
                    type="button"
                    onClick={() => onClaimAllRewards(missionsTab)}
                    className="ug-cut-sm mt-2.5 flex min-h-[48px] w-full items-center justify-between gap-2 border border-emerald-400/55 bg-emerald-500/18 px-4 py-2.5 font-display text-sm font-bold uppercase tracking-wide text-emerald-200 transition-colors hover:bg-emerald-500/28 active:scale-[0.99] cursor-pointer"
                  >
                    <span>
                      Tümünü Topla ({tabClaimableCount} hazır ödül)
                    </span>
                    <span className="ug-skew inline-flex items-center gap-1 bg-emerald-400 px-3 py-1 text-xs font-extrabold text-zinc-950 font-mono-num">
                      <Coins className="h-3.5 w-3.5" />
                      <span>+{tabClaimableGold.toLocaleString('tr-TR')}</span>
                    </span>
                  </button>
                );
              })()}

              {missionsTab === 'achievements' ? (
                <AchievementsPanel
                  achievements={missions.achievements}
                  selectedCategory={achCategory}
                  onSelectCategory={setAchCategory}
                  onClaimAchievement={onClaimAchievement}
                />
              ) : (
                <div className="mt-3 flex-1 space-y-2.5 overflow-y-auto pr-1 custom-scroll">
                  <>
                    {[...missions.activeMissions]
                      .sort((a, b) => {
                        const aRank =
                          a.completed && !a.claimed ? 0 : !a.completed ? 1 : 2;
                        const bRank =
                          b.completed && !b.claimed ? 0 : !b.completed ? 1 : 2;
                        return aRank - bRank;
                      })
                      .map((m) => {
                        const pct = Math.min(
                          100,
                          Math.round(
                            (m.progress / Math.max(1, m.target)) * 100,
                          ),
                        );
                        if (m.completed && !m.claimed) {
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => onClaimMission(m.id)}
                              className="ug-cut-sm w-full border border-emerald-400/65 bg-emerald-500/14 p-3.5 text-left transition-all hover:bg-emerald-500/22 active:scale-[0.99] cursor-pointer"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                                    <span className="font-display italic text-sm font-bold uppercase text-white">
                                      {m.title}
                                    </span>
                                  </div>
                                  <p className="mt-0.5 text-[11px] font-medium text-emerald-300/90">
                                    Kontrat tamamlandı · Ödülünü almak için dokun
                                  </p>
                                </div>
                                <span className="ug-cut-sm ug-btn-fire inline-flex items-center gap-1 px-3 py-1.5 text-xs font-extrabold font-mono-num shrink-0">
                                  <Coins className="h-3.5 w-3.5" />
                                  <span>AL +{m.rewardGold}</span>
                                </span>
                              </div>
                              <div className="mt-2.5 flex items-center gap-3">
                                <div className="ug-skew h-1.5 flex-1 overflow-hidden bg-white/12">
                                  <div className="h-full w-full bg-emerald-400" />
                                </div>
                                <span className="text-xs font-semibold text-emerald-300 font-mono-num">
                                  {m.target.toLocaleString('tr-TR')} /{' '}
                                  {m.target.toLocaleString('tr-TR')}
                                </span>
                              </div>
                            </button>
                          );
                        }
                        if (m.claimed) {
                          return (
                            <div
                              key={m.id}
                              className="ug-cut-sm border border-emerald-400/25 bg-[#121622]/75 p-3.5 opacity-80"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                                    <span className="font-display text-sm font-bold text-zinc-200 line-through decoration-emerald-400/50">
                                      {m.title}
                                    </span>
                                  </div>
                                  <p className="mt-0.5 text-[11px] text-zinc-400">
                                    Bugün tamamlandı · +{m.rewardGold} Altın alındı
                                  </p>
                                </div>
                                <span className="ug-skew border border-emerald-400/30 bg-emerald-500/12 px-2.5 py-1 font-display text-[11px] font-bold uppercase text-emerald-300 shrink-0">
                                  Alındı
                                </span>
                              </div>
                            </div>
                          );
                        }
                        return (
                          <div
                            key={m.id}
                            className="ug-cut-sm ug-card p-3.5"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <span className="font-display text-sm font-bold text-white">
                                {m.title}
                              </span>
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-300 font-mono-num shrink-0">
                                <Coins className="h-3.5 w-3.5 text-amber-400" />
                                <span>+{m.rewardGold}</span>
                              </span>
                            </div>
                            <div className="mt-2.5 flex items-center gap-3">
                              <div className="ug-skew h-1.5 flex-1 overflow-hidden bg-white/10">
                                <div
                                  className="h-full bg-gradient-to-r from-rose-500 to-orange-400"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs text-zinc-300 font-mono-num">
                                {m.progress.toLocaleString('tr-TR')} /{' '}
                                {m.target.toLocaleString('tr-TR')}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    {missions.activeMissions.length > 0 &&
                      missions.activeMissions.every((m) => m.claimed) && (
                        <div className="ug-cut-sm border border-emerald-400/30 bg-emerald-500/10 px-3.5 py-3 text-center text-xs text-emerald-200">
                          Bugünün 3 sokak kontratı tamamlandı · Yeni kontratlar
                          00:00&apos;da yenilenecek.
                        </div>
                      )}
                  </>
                </div>
              )}
            </div>
          </div>
        )}

      {/* IN-GAME BOTTOM TELEMETRY BAR — Underground Tachometer + Nitro Purge + Armored Hull */}
      {isPlaying && (
        <footer
          className="flex w-full flex-col gap-1.5 bg-gradient-to-t from-black/88 via-black/38 to-transparent px-2.5 pt-2 sm:gap-2 sm:px-5 sm:pt-3"
          style={{ paddingBottom: 'max(0.65rem, env(safe-area-inset-bottom))' }}
        >
          {/* Upper Row: Left Power-Up Timers & Hint + Right Underground SpeedometerCluster */}
          <div className="flex w-full items-end justify-between gap-2">
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                {stats.rampageTimer > 0 && (
                  <div className="ug-cut-sm flex w-40 flex-col gap-1 border border-orange-400/70 bg-[#0b0e16]/92 px-2.5 py-1.5 shadow-[0_0_18px_rgba(249,115,22,0.35)] sm:w-44">
                    <div className="flex items-center justify-between font-display italic text-[11px] font-extrabold uppercase text-orange-300 leading-none">
                      <span className="inline-flex items-center gap-1">
                        <Zap className="h-3.5 w-3.5 fill-orange-400 text-orange-300" />
                        <span>
                          YIKIM · {formatSpeedMultiplier(stats.rampageSpeedMult)}
                        </span>
                      </span>
                      <span className="font-mono-num">
                        {Math.ceil(stats.rampageTimer)}s
                      </span>
                    </div>
                    <div className="ug-skew h-1 w-full overflow-hidden bg-white/15">
                      <div
                        className={`h-full transition-[width] duration-75 ${
                          stats.rampageTimer <= 3 ? 'bg-rose-500' : 'bg-orange-400'
                        }`}
                        style={{
                          width: `${Math.min(100, Math.round((stats.rampageTimer / Math.max(1, stats.rampageDuration)) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {stats.magnetTimer > 0 && (
                  <div className="ug-cut-sm flex w-36 flex-col gap-1 border border-rose-400/50 bg-[#0b0e16]/92 px-2.5 py-1.5 sm:w-40">
                    <div className="flex items-center justify-between font-display italic text-[11px] font-bold uppercase text-rose-300 leading-none">
                      <span className="inline-flex items-center gap-1">
                        <Magnet className="h-3.5 w-3.5" />
                        <span>Mıknatıs</span>
                      </span>
                      <span className="font-mono-num">
                        {Math.ceil(stats.magnetTimer)}s
                      </span>
                    </div>
                    <div className="ug-skew h-1 w-full overflow-hidden bg-white/12">
                      <div
                        className="h-full bg-rose-400 transition-[width] duration-75"
                        style={{
                          width: `${Math.min(100, Math.round((stats.magnetTimer / Math.max(1, stats.magnetDuration)) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {showSteerHint && (
                <div className="hidden sm:inline-flex ug-skew border border-white/12 bg-[#0b0e16]/85 px-3 py-1 items-center gap-2 text-xs text-zinc-200">
                  <MoveHorizontal className="h-4 w-4 text-orange-400" />
                  <span>Kaydırarak yönlendir · Çift tıkla: Nitro</span>
                </div>
              )}
            </div>

            {/* Right-Docked Underground Speedometer & RPM Cluster */}
            <SpeedometerCluster
              speedKmh={stats.speedKmh}
              rpmRatio={stats.rpmRatio}
              gear={stats.gear}
              nitroActive={stats.nitroActive}
              drifting={stats.drifting}
            />
          </div>

          {/* BAR 1 (UPPER FULL-WIDTH): NİTRO — Silky 60/120fps Afterburner Turbo-Wing Ribbon */}
          <NitroWingBar
            nitroPercent={stats.nitroPercent}
            nitroMax={stats.nitroMax}
            nitroActive={stats.nitroActive}
            onNitroToggle={onNitroToggle}
          />

          {/* BAR 2 (LOWERMOST FULL-WIDTH): GÖVDE — Frameless Symmetric Twin-Wing Armored Spine */}
          <div className="relative flex h-6 sm:h-7 w-full items-center gap-0">
            {/* LEFT WING */}
            <div
              className="relative h-2 sm:h-2.5 flex-1 overflow-hidden bg-[#090b12]/88 shadow-[0_2px_10px_rgba(0,0,0,0.75)]"
              style={{
                clipPath:
                  'polygon(0% 50%, 9px 0%, 100% 0%, 100% 100%, 9px 100%)',
              }}
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-white/15"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-[1px] bg-white/10"
              />
              <div
                className={`absolute inset-y-0 right-0 transition-[width] duration-150 ${
                  integrityTier === 'healthy'
                    ? 'bg-gradient-to-l from-emerald-300 via-emerald-400 to-teal-500 shadow-[0_0_12px_rgba(16,185,129,0.65)]'
                    : integrityTier === 'warn'
                      ? 'bg-gradient-to-l from-amber-200 via-orange-400 to-orange-600 shadow-[0_0_12px_rgba(249,115,22,0.65)]'
                      : 'animate-hud-critical-pulse bg-gradient-to-l from-rose-300 via-rose-500 to-red-700 shadow-[0_0_14px_rgba(244,63,94,0.85)]'
                }`}
                style={{ width: `${clampedIntegrity}%` }}
              >
                <div className="absolute inset-x-0 top-0 h-[40%] bg-white/35" />
              </div>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 grid grid-cols-5"
              >
                {[0, 1, 2, 3, 4].map((idx) => (
                  <div
                    key={idx}
                    className="border-r border-zinc-950/65 last:border-r-0"
                  />
                ))}
              </div>
            </div>

            {/* CENTER CHAMFERED ARMOR SHIELD CORE */}
            <div
              className={`relative z-10 -mx-1 flex h-6 sm:h-7 shrink-0 items-center justify-center px-3.5 sm:px-4 shadow-[0_4px_16px_rgba(0,0,0,0.85)] transition-colors ${
                integrityTier === 'healthy'
                  ? 'bg-emerald-400/90'
                  : integrityTier === 'warn'
                    ? 'bg-orange-400/95'
                    : 'animate-hud-critical-pulse bg-rose-500'
              }`}
              style={{
                clipPath:
                  'polygon(9px 0%, calc(100% - 9px) 0%, 100% 50%, calc(100% - 9px) 100%, 9px 100%, 0% 50%)',
              }}
            >
              <div
                className="flex h-[calc(100%-3px)] w-[calc(100%-3px)] items-center justify-center gap-1.5 bg-[#090b12] px-2.5 sm:px-3"
                style={{
                  clipPath:
                    'polygon(8px 0%, calc(100% - 8px) 0%, 100% 50%, calc(100% - 8px) 100%, 8px 100%, 0% 50%)',
                }}
              >
                <ShieldCheck
                  className={`h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0 ${
                    integrityTier === 'healthy'
                      ? 'text-emerald-400'
                      : integrityTier === 'warn'
                        ? 'text-orange-400'
                        : 'text-rose-400'
                  }`}
                />
                <span
                  className={`font-display italic text-[10px] sm:text-[11px] font-black tracking-[0.14em] whitespace-nowrap ${
                    integrityTier === 'healthy'
                      ? 'text-emerald-300'
                      : integrityTier === 'warn'
                        ? 'text-orange-300'
                        : 'text-rose-400'
                  }`}
                >
                  {integrityTier === 'critical' ? 'KRİTİK' : 'ZIRH'}
                </span>
                <span className="font-mono-num text-[11px] sm:text-xs font-black text-white whitespace-nowrap">
                  %{clampedIntegrity}
                </span>
              </div>
            </div>

            {/* RIGHT WING */}
            <div
              className="relative h-2 sm:h-2.5 flex-1 overflow-hidden bg-[#090b12]/88 shadow-[0_2px_10px_rgba(0,0,0,0.75)]"
              style={{
                clipPath:
                  'polygon(0% 0%, calc(100% - 9px) 0%, 100% 50%, calc(100% - 9px) 100%, 0% 100%)',
              }}
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-white/15"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-[1px] bg-white/10"
              />
              <div
                className={`absolute inset-y-0 left-0 transition-[width] duration-150 ${
                  integrityTier === 'healthy'
                    ? 'bg-gradient-to-r from-emerald-300 via-emerald-400 to-teal-500 shadow-[0_0_12px_rgba(16,185,129,0.65)]'
                    : integrityTier === 'warn'
                      ? 'bg-gradient-to-r from-amber-200 via-orange-400 to-orange-600 shadow-[0_0_12px_rgba(249,115,22,0.65)]'
                      : 'animate-hud-critical-pulse bg-gradient-to-r from-rose-300 via-rose-500 to-red-700 shadow-[0_0_14px_rgba(244,63,94,0.85)]'
                }`}
                style={{ width: `${clampedIntegrity}%` }}
              >
                <div className="absolute inset-x-0 top-0 h-[40%] bg-white/35" />
              </div>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 grid grid-cols-5"
              >
                {[0, 1, 2, 3, 4].map((idx) => (
                  <div
                    key={idx}
                    className="border-r border-zinc-950/65 last:border-r-0"
                  />
                ))}
              </div>
            </div>
          </div>
        </footer>
      )}

      {/* 3-2-1 Resume Countdown Overlay (after Pause or Crash Revive) */}
      {isPlaying && stats.resumeCountdown > 0 && (
        <div className="pointer-events-none fixed inset-0 z-[26] flex items-center justify-center bg-black/32">
          <div
            key={stats.resumeCountdown}
            className="animate-hud-drift-pop flex flex-col items-center gap-2"
          >
            <div className="ug-cut flex h-28 w-28 sm:h-32 sm:w-32 items-center justify-center border-2 border-orange-500/85 bg-[#090b12]/90 shadow-[0_0_40px_rgba(234,88,12,0.5)]">
              <span className="font-display italic text-6xl sm:text-7xl font-black leading-none text-white drop-shadow-[0_4px_16px_rgba(234,88,12,0.7)] font-mono-num">
                {stats.resumeCountdown}
              </span>
            </div>
            <span className="ug-skew border border-orange-500/40 bg-[#090b12]/90 px-4 py-1 font-display italic text-[11px] font-extrabold tracking-[0.22em] text-orange-300 uppercase">
              HAZIRLAN
            </span>
          </div>
        </div>
      )}

      {/* Mobile initial gesture hint */}
      {isPlaying && showSteerHint && stats.resumeCountdown === 0 && (
        <div className="pointer-events-none fixed bottom-44 left-3 max-w-[calc(100vw-160px)] sm:hidden">
          <div className="ug-cut-sm flex items-center gap-2 border border-orange-500/35 bg-[#090b12]/92 px-3 py-2 text-[11px] font-medium text-zinc-200 shadow-xl">
            {steeringMode === 'tilt' ? (
              <>
                <Smartphone className="h-4 w-4 text-orange-400 shrink-0" />
                <span>Eğerek sür · Çift tık: NOS</span>
              </>
            ) : (
              <>
                <MoveHorizontal className="h-4 w-4 text-orange-400 shrink-0" />
                <span>Kaydırarak sür · Çift tık: NOS</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

GameHud.displayName = 'GameHud';

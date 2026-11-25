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
  Siren,
  Smartphone,
  Snowflake,
  Star,
  Target,
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
import { BIOME_SPAN_METERS, BIOMES } from '../game/biomes';
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
import { GarageView } from './GarageView';
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
  runGoldDoubled: boolean;
  onOpenLeaderboard: () => void;
  onOpenDailyWheel: () => void;
  onOpenStore: (tab?: StoreTabId) => void;
  onOpenSettings: () => void;
  onWatchAdRevive: () => void;
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
  runGoldDoubled,
  onOpenLeaderboard,
  onOpenDailyWheel,
  onOpenStore,
  onOpenSettings,
  onWatchAdRevive,
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
  const activeModel =
    CAR_MODELS.find((m) => m.id === carModel) || CAR_MODELS[0];
  const playerRankTier = getDriverRankTier(playerLevel.level);
  const unlockedAchCount = missions.achievements.filter((a) => a.unlocked).length;
  const totalAchCount = missions.achievements.length;
  const activeCameraLabel =
    CAMERA_MODES.find((c) => c.id === cameraMode)?.label ?? 'Takip';
  const activeColorOpt =
    CAR_COLORS.find((c) => c.id === carColor) || CAR_COLORS[0];
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

  const activeGameModeSpec =
    GAME_MODES.find((m) => m.id === (isPlaying ? stats.gameMode : gameMode)) ||
    GAME_MODES[0];

  if (phase === 'garage') {
    return (
      <GarageView
        goldCoins={goldCoins}
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
      {/* Subtle Police Siren Split Edge Glow during active chase */}
      {isPlaying &&
        stats.gameMode === 'pursuit' &&
        stats.policeHeat > 0 &&
        stats.policeProximity > 0.08 && (
          <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 -z-10 transition-opacity duration-150"
            style={{
              opacity: Math.min(0.65, stats.policeProximity * 0.62),
              background:
                'linear-gradient(90deg, rgba(239,68,68,0.34) 0%, rgba(239,68,68,0) 18%, rgba(37,99,235,0) 82%, rgba(37,99,235,0.36) 100%)',
            }}
          />
        )}

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

            {/* Multi-layer animated low-poly triangle shard mosaic framing all four edges */}
            <svg
              viewBox="0 0 1000 1000"
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full"
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

              {/* Layer A: Surging corner clusters */}
              <g
                className={ending ? 'animate-rampage-tri-fast' : 'animate-rampage-tri-a'}
                stroke={strokeColor}
                strokeWidth="1.35"
                strokeLinejoin="round"
              >
                <polygon points="0,0 165,0 0,155" fill="url(#rampTriLeft)" />
                <polygon points="165,0 92,82 0,155" fill="url(#rampTriTop)" opacity="0.72" />
                <polygon points="1000,0 835,0 1000,155" fill="url(#rampTriRight)" />
                <polygon points="835,0 908,82 1000,155" fill="url(#rampTriTop)" opacity="0.72" />
                <polygon points="0,1000 175,1000 0,835" fill="url(#rampTriLeft)" />
                <polygon points="175,1000 96,914 0,835" fill="url(#rampTriBottom)" opacity="0.74" />
                <polygon points="1000,1000 825,1000 1000,835" fill="url(#rampTriRight)" />
                <polygon points="825,1000 904,914 1000,835" fill="url(#rampTriBottom)" opacity="0.74" />
              </g>

              {/* Layer B: Counter-phase top & bottom crystalline edge shards */}
              <g
                className={ending ? 'animate-rampage-tri-fast-alt' : 'animate-rampage-tri-b'}
                stroke={strokeColor}
                strokeWidth="1.15"
                strokeLinejoin="round"
              >
                <polygon points="165,0 325,0 238,58" fill="url(#rampTriTop)" opacity="0.78" />
                <polygon points="325,0 500,0 412,46" fill="url(#rampTriTop)" opacity="0.58" />
                <polygon points="500,0 675,0 588,46" fill="url(#rampTriTop)" opacity="0.58" />
                <polygon points="675,0 835,0 762,58" fill="url(#rampTriTop)" opacity="0.78" />

                <polygon points="175,1000 335,1000 248,938" fill="url(#rampTriBottom)" opacity="0.8" />
                <polygon points="335,1000 500,1000 415,950" fill="url(#rampTriBottom)" opacity="0.6" />
                <polygon points="500,1000 665,1000 585,950" fill="url(#rampTriBottom)" opacity="0.6" />
                <polygon points="665,1000 825,1000 752,938" fill="url(#rampTriBottom)" opacity="0.8" />
              </g>

              {/* Layer C: Kinetic drifting left-flank shards */}
              <g
                className={ending ? 'animate-rampage-tri-fast' : 'animate-rampage-tri-left'}
                stroke={strokeColor}
                strokeWidth="1.2"
                strokeLinejoin="round"
              >
                <polygon points="0,155 78,210 0,295" fill="url(#rampTriLeft)" opacity="0.82" />
                <polygon points="0,295 66,415 0,505" fill="url(#rampTriLeft)" opacity="0.74" />
                <polygon points="0,505 62,605 0,695" fill="url(#rampTriLeft)" opacity="0.72" />
                <polygon points="0,835 80,780 0,695" fill="url(#rampTriLeft)" opacity="0.8" />
              </g>

              {/* Layer D: Kinetic drifting right-flank shards */}
              <g
                className={ending ? 'animate-rampage-tri-fast' : 'animate-rampage-tri-right'}
                stroke={strokeColor}
                strokeWidth="1.2"
                strokeLinejoin="round"
              >
                <polygon points="1000,155 922,210 1000,295" fill="url(#rampTriRight)" opacity="0.82" />
                <polygon points="1000,295 934,415 1000,505" fill="url(#rampTriRight)" opacity="0.74" />
                <polygon points="1000,505 938,605 1000,695" fill="url(#rampTriRight)" opacity="0.72" />
                <polygon points="1000,835 920,780 1000,695" fill="url(#rampTriRight)" opacity="0.8" />
              </g>

              {/* Layer E: Shimmering lightning inner accent triangles */}
              <g
                className={ending ? 'animate-rampage-tri-fast-alt' : 'animate-rampage-tri-spark'}
                stroke={highlightHex}
                strokeOpacity="0.55"
                strokeWidth="1.1"
                strokeLinejoin="round"
              >
                <polygon points="92,82 190,46 165,0" fill="url(#rampTriSpark)" opacity="0.7" />
                <polygon points="908,82 810,46 835,0" fill="url(#rampTriSpark)" opacity="0.7" />
                <polygon points="96,914 196,952 175,1000" fill="url(#rampTriSpark)" opacity="0.72" />
                <polygon points="904,914 804,952 825,1000" fill="url(#rampTriSpark)" opacity="0.72" />
                <polygon points="0,390 48,465 0,555" fill="url(#rampTriSpark)" opacity="0.64" />
                <polygon points="1000,390 952,465 1000,555" fill="url(#rampTriSpark)" opacity="0.64" />
              </g>
            </svg>
          </div>
        );
      })()}

      {/* Slim Unified Top Bar + Dedicated Non-Overlapping Telemetry Stack */}
      <div className="flex flex-col">
        <header
          className="relative flex items-start justify-between gap-2 bg-gradient-to-b from-black/80 via-black/35 to-transparent px-3 pb-3 sm:gap-3 sm:px-6 sm:pb-4"
          style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
        >
          {/* Left Zone */}
          {phase !== 'menu' ? (
            <div className="flex min-w-0 flex-1 flex-col gap-1 pr-1">
              <div className="flex items-baseline gap-2 text-white">
                <span className="font-display text-2xl font-extrabold leading-tight tracking-tight font-mono-num drop-shadow-[0_2px_6px_rgba(0,0,0,0.75)] sm:text-3xl">
                  {stats.score.toLocaleString('tr-TR')}
                </span>
                {stats.combo > 1 && (
                  <span className="font-display text-base font-extrabold text-amber-400 font-mono-num drop-shadow sm:text-lg">
                    ×{stats.combo}
                  </span>
                )}
              </div>
              {stats.combo > 1 && (
                <div className="h-1.5 w-20 sm:w-24 overflow-hidden rounded-full bg-white/15">
                  <div
                    className="h-full bg-amber-400 transition-[width] duration-75"
                    style={{ width: `${Math.round(stats.comboTimerRatio * 100)}%` }}
                  />
                </div>
              )}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-200 font-mono-num drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
                <span className="whitespace-nowrap font-semibold">
                  {formatDistance(stats.distanceMeters)}
                </span>
                <span aria-hidden="true" className="hidden sm:inline text-zinc-500">
                  ·
                </span>
                <span className="hidden sm:inline font-sans text-zinc-200 truncate">
                  {stats.biomeLabel}
                </span>
                {stats.roadZone !== 'open' && (
                  <>
                    <span aria-hidden="true" className="text-zinc-500">
                      ·
                    </span>
                    <span
                      className={`font-sans font-bold whitespace-nowrap ${
                        stats.roadZone === 'tunnel'
                          ? 'text-sky-300'
                          : 'text-amber-300'
                      }`}
                    >
                      {stats.roadZone === 'tunnel' ? 'Tünel' : 'Köprü'}
                    </span>
                  </>
                )}
                {stats.rainIntensity > 0.28 ? (
                  <>
                    <span aria-hidden="true" className="text-zinc-500">
                      ·
                    </span>
                    <span className="inline-flex items-center gap-1 font-sans font-bold text-cyan-300 whitespace-nowrap">
                      <CloudRain className="h-3.5 w-3.5 shrink-0" />
                      <span>Yağmur · Kaygan</span>
                    </span>
                  </>
                ) : stats.fogIntensity > 0.35 ? (
                  <>
                    <span aria-hidden="true" className="text-zinc-500">
                      ·
                    </span>
                    <span className="inline-flex items-center gap-1 font-sans font-bold text-slate-300 whitespace-nowrap">
                      <CloudFog className="h-3.5 w-3.5 shrink-0" />
                      <span>Yoğun Sis</span>
                    </span>
                  </>
                ) : stats.weatherKind === 'snow' ? (
                  <>
                    <span aria-hidden="true" className="text-zinc-500">
                      ·
                    </span>
                    <span className="inline-flex items-center gap-1 font-sans font-bold text-sky-200 whitespace-nowrap">
                      <Snowflake className="h-3.5 w-3.5 shrink-0" />
                      <span>Kar</span>
                    </span>
                  </>
                ) : stats.weatherKind === 'sandstorm' ? (
                  <>
                    <span aria-hidden="true" className="text-zinc-500">
                      ·
                    </span>
                    <span className="inline-flex items-center gap-1 font-sans font-bold text-amber-300 whitespace-nowrap">
                      <Wind className="h-3.5 w-3.5 shrink-0" />
                      <span>Fırtına</span>
                    </span>
                  </>
                ) : null}
                <span aria-hidden="true" className="text-zinc-500">
                  ·
                </span>
                <span className="inline-flex items-center gap-1 text-amber-300 font-bold whitespace-nowrap">
                  <Coins className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span>{goldCoins.toLocaleString('tr-TR')}</span>
                </span>
              </div>
            </div>
          ) : (
            <div className="pointer-events-auto flex min-w-0 flex-1 flex-col items-start gap-1.5 sm:flex-initial sm:flex-row sm:items-center sm:gap-2.5">
              <button
                type="button"
                onClick={() => onOpenLevelRoad()}
                onPointerDown={(e) => e.stopPropagation()}
                title="Seviye Yolu (1–100) ve Ödüller"
                className={`group flex min-w-0 w-full sm:w-fit max-w-full items-center gap-2 sm:gap-2.5 overflow-hidden rounded-xl border ${
                  unclaimedLevelRewardsCount > 0
                    ? 'border-amber-400/75 shadow-[0_0_18px_rgba(245,158,11,0.28)]'
                    : playerRankTier.borderClass
                } bg-zinc-950/90 px-2 py-1.5 sm:px-2.5 sm:py-2 text-left transition-colors hover:bg-zinc-900/95 cursor-pointer shadow-lg`}
              >
                <DriverLevelEmblem level={playerLevel.level} size="sm" />
                <div className="flex min-w-0 flex-1 flex-col gap-1 sm:min-w-[154px]">
                  <div className="flex items-baseline justify-between gap-2 min-w-0">
                    <span
                      className={`truncate font-display text-xs font-extrabold ${playerRankTier.textClass}`}
                    >
                      {playerLevel.rankTitle}
                    </span>
                    <span className="font-mono-num text-[11px] font-bold text-zinc-300 whitespace-nowrap shrink-0">
                      Sv.{playerLevel.level}
                    </span>
                  </div>
                  <SegmentedXpBar
                    level={playerLevel.level}
                    progressRatio={playerLevel.progressRatio}
                    segments={8}
                    heightClass="h-1.5"
                  />
                </div>
                {unclaimedLevelRewardsCount > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-amber-400 px-1.5 py-0.5 text-[10px] font-extrabold text-zinc-950 font-mono-num shrink-0 shadow-sm sm:px-2 sm:text-[10.5px]">
                    <Gift className="h-3 w-3 shrink-0" />
                    <span>{unclaimedLevelRewardsCount}</span>
                  </span>
                )}
                <ChevronRight className="h-4 w-4 text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-200 shrink-0" />
              </button>

              {stats.bestScore > 0 && (
                <div className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-amber-400/25 bg-zinc-950/90 px-2.5 py-1 shadow-lg sm:rounded-xl sm:px-3 sm:py-2">
                  <span className="text-[10px] font-semibold leading-none text-zinc-400">
                    Rekor
                  </span>
                  <span className="font-mono-num text-xs font-extrabold leading-none text-amber-300">
                    {stats.bestScore.toLocaleString('tr-TR')}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Right Zone: Clean Single-Row Action Strip */}
          <div className="pointer-events-auto relative flex items-center gap-1.5 sm:gap-2 shrink-0">
            {phase === 'menu' && (
              <button
                type="button"
                onClick={() => onOpenStore('gold')}
                onPointerDown={(e) => e.stopPropagation()}
                title="Altın ve Kasa Marketini Aç"
                className="group flex h-11 items-center gap-1.5 rounded-xl border border-amber-400/40 bg-zinc-950/90 pl-2.5 pr-1.5 sm:pl-3 sm:pr-2 text-xs sm:text-sm font-bold text-amber-300 font-mono-num transition-colors hover:border-amber-400/70 hover:bg-zinc-900 cursor-pointer shadow-lg"
              >
                <Coins className="h-4 w-4 text-amber-400 shrink-0" />
                <span>{goldCoins.toLocaleString('tr-TR')}</span>
                <span className="ml-0.5 flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500 text-zinc-950 transition-colors group-hover:bg-amber-400 shrink-0">
                  <Plus className="h-3.5 w-3.5 stroke-[3]" />
                </span>
              </button>
            )}

            {(isPlaying || phase === 'paused') && (
              <button
                type="button"
                onClick={onToggleCamera}
                onPointerDown={(e) => e.stopPropagation()}
                aria-label="Kamera Açısını Değiştir"
                title="Kamera Açısı (C)"
                className="flex h-11 w-11 sm:w-auto items-center justify-center gap-1.5 rounded-xl border border-white/14 bg-zinc-950/90 sm:px-3.5 text-xs font-bold text-zinc-100 transition-colors hover:bg-zinc-900 cursor-pointer whitespace-nowrap shadow-lg"
              >
                <Camera className="h-5 w-5 sm:h-4 sm:w-4 text-amber-400 shrink-0" />
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
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/14 bg-zinc-950/90 text-zinc-100 transition-colors hover:border-amber-400/40 hover:bg-zinc-900 hover:text-amber-300 cursor-pointer shadow-lg"
              >
                <Settings className="h-5 w-5 sm:h-4.5 sm:w-4.5" />
              </button>
            )}

            {(isPlaying || phase === 'paused') && (
              <button
                type="button"
                onClick={onTogglePause}
                aria-label={phase === 'paused' ? 'Devam Et' : 'Duraklat'}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/14 bg-zinc-950/90 text-zinc-100 transition-colors hover:bg-zinc-900 cursor-pointer shadow-lg"
              >
                {phase === 'paused' ? (
                  <Play className="h-5 w-5 sm:h-4.5 sm:w-4.5" />
                ) : (
                  <Pause className="h-5 w-5 sm:h-4.5 sm:w-4.5" />
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
              <div className="flex flex-col items-center gap-0.5 rounded-2xl border border-orange-400/75 bg-zinc-950/92 px-4 py-1.5 shadow-[0_0_28px_rgba(249,115,22,0.5)]">
                <span className="text-[10px] font-extrabold tracking-widest text-orange-300 uppercase">
                  YIKIM MODU BİTİYOR
                </span>
                <span
                  key={Math.ceil(stats.rampageTimer)}
                  className="animate-nitro-pop font-display text-4xl leading-none font-black text-white drop-shadow-[0_0_14px_rgba(249,115,22,0.9)] sm:text-5xl"
                >
                  {Math.ceil(stats.rampageTimer)}
                </span>
              </div>
            )}

            {/* CAREER MODE LIVE FINISH PROGRESS & 2-MISSION TRACKER */}
            {stats.career && (
              <div className="flex w-[min(92vw,340px)] flex-col gap-1 rounded-xl border border-emerald-400/40 bg-zinc-950/90 px-2.5 py-1.5 shadow-lg">
                <div className="flex items-center justify-between gap-2 text-[11px] leading-none">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <Flag className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                    <span className="truncate font-display font-extrabold text-white">
                      Bölüm {stats.career.levelId}
                    </span>
                    <span className="hidden truncate text-[10px] font-semibold text-zinc-400 sm:inline">
                      · {stats.career.title}
                    </span>
                  </div>
                  <span className="shrink-0 font-mono-num text-[11px] font-extrabold text-emerald-300">
                    {stats.career.remainingMeters > 0
                      ? `${stats.career.remainingMeters} m`
                      : 'BİTİŞ!'}
                  </span>
                </div>

                <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-amber-400 transition-[width] duration-100"
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
                        m.completed
                          ? 'border-emerald-400/50 bg-emerald-500/18 text-emerald-200'
                          : 'border-white/10 bg-white/[0.03] text-zinc-300'
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-1 truncate font-semibold">
                        {m.completed ? (
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
              </div>
            )}

            {/* PURSUIT MODE LIVE HUD */}
            {stats.gameMode === 'pursuit' && (
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-2 rounded-xl border border-blue-400/45 bg-zinc-950/90 px-2.5 py-1 shadow-lg sm:px-3 sm:py-1.5">
                  <Siren className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-rose-400 shrink-0" />
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((starIdx) => (
                      <Star
                        key={starIdx}
                        className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${
                          starIdx <= stats.policeHeat
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-zinc-600'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="font-mono-num text-[11px] font-bold text-sky-300 whitespace-nowrap">
                    {stats.policeHeat === 0
                      ? 'Devriye Yakın'
                      : `${stats.policeActiveCount} Ekip`}
                  </span>
                </div>

                {stats.bustedProgress > 0.02 && (
                  <div className="flex w-44 flex-col gap-0.5 rounded-lg border border-rose-500/70 bg-zinc-950/92 px-2.5 py-1">
                    <div className="flex items-center justify-between text-[10px] font-extrabold tracking-wide text-rose-400">
                      <span>YAKALANIYORSUN!</span>
                      <span className="font-mono-num">
                        %{Math.round(stats.bustedProgress * 100)}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className="h-full bg-rose-500 transition-[width] duration-75"
                        style={{
                          width: `${Math.round(stats.bustedProgress * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {stats.bustedProgress <= 0.02 && stats.evadeProgress > 0.05 && (
                  <div className="flex w-44 flex-col gap-0.5 rounded-lg border border-emerald-400/55 bg-zinc-950/92 px-2.5 py-1">
                    <div className="flex items-center justify-between text-[10px] font-extrabold tracking-wide text-emerald-300">
                      <span>İZ KAYBETTİRME</span>
                      <span className="font-mono-num">
                        %{Math.round(stats.evadeProgress * 100)}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className="h-full bg-emerald-400 transition-[width] duration-75"
                        style={{
                          width: `${Math.round(stats.evadeProgress * 100)}%`,
                        }}
                      />
                    </div>
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
                className="animate-callout pt-1 text-center"
              >
                <div
                  className={`font-display text-base font-bold tracking-wide drop-shadow sm:text-xl ${
                    callout.tone === 'amber'
                      ? 'text-amber-300'
                      : callout.tone === 'cyan'
                        ? 'text-sky-300'
                        : callout.tone === 'emerald'
                          ? 'text-emerald-300'
                          : 'text-rose-400'
                  }`}
                >
                  {callout.text}{' '}
                  <span className="font-mono-num text-white">{callout.points}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MAIN MENU — Open 3D Showcase + Sleek Bottom Action Dock */}
      {phase === 'menu' && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="pointer-events-auto mx-auto w-full sm:mb-6 sm:w-[min(94vw,600px)]"
        >
          <div
            className="overflow-hidden rounded-t-3xl border-t border-white/14 bg-zinc-950/96 shadow-2xl sm:rounded-2xl sm:border"
            style={{
              paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
            }}
          >
            {/* Slim XP Progress Hairline along top edge (tier-colored) */}
            <div className="h-1 w-full bg-white/8">
              <div
                className={`h-full transition-all duration-300 ${playerRankTier.barClass}`}
                style={{
                  width: `${Math.round(playerLevel.progressRatio * 100)}%`,
                }}
              />
            </div>

            <div className="flex flex-col gap-3.5 px-4 pt-3.5 pb-1 sm:p-5">
              {/* Row 1: Active Vehicle */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={onOpenGarage}
                  className="flex w-full items-center justify-between gap-2.5 rounded-xl bg-white/[0.03] px-3 py-2 text-left group cursor-pointer transition-colors hover:bg-white/[0.06]"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="h-4.5 w-4.5 rounded-md border border-white/30 shrink-0"
                      style={{ backgroundColor: activeColorSwatch }}
                    />
                    <div className="min-w-0">
                      <div className="truncate font-display text-base sm:text-sm font-extrabold text-white group-hover:text-amber-300 transition-colors">
                        {activeModel.name}
                      </div>
                      <div className="text-xs text-zinc-400">
                        {licensePlate} · Garajı Aç
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-zinc-500 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-300 shrink-0" />
                </button>
              </div>

              {/* Featured Career Mode Entry Strip (100 Levels, 300 Stars) */}
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
                    className="group relative flex min-h-[50px] w-full items-center justify-between gap-2.5 rounded-xl border border-emerald-400/40 bg-emerald-500/12 px-3.5 py-2 text-left transition-colors hover:bg-emerald-500/20 active:scale-[0.99] cursor-pointer"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-emerald-400/45 bg-emerald-500/20 text-emerald-300">
                        <Map className="h-4.5 w-4.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-display text-sm font-extrabold text-white">
                            Kariyer Modu
                          </span>
                          <span className="rounded-md bg-emerald-400/20 px-1.5 py-0.5 font-mono-num text-[10px] font-extrabold text-emerald-200 whitespace-nowrap">
                            Bölüm {careerProgress.highestUnlockedLevel}/{TOTAL_CAREER_LEVELS}
                          </span>
                          {claimableChestCount > 0 && (
                            <span className="rounded-md bg-amber-400 px-1.5 py-0.5 text-[10px] font-extrabold text-zinc-950 whitespace-nowrap">
                              Sandık!
                            </span>
                          )}
                        </div>
                        <div className="truncate text-[11px] font-semibold text-zinc-300">
                          {activeChapter.name} · 100 Bölüm &amp; Altın Ödülleri
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      <div className="flex items-center gap-1 rounded-lg border border-amber-400/35 bg-zinc-950/75 px-2 py-1 font-mono-num text-xs font-extrabold text-amber-300">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        <span>
                          {careerProgress.totalStars}/{careerProgress.maxStars}
                        </span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-emerald-300 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </button>
                );
              })()}

              {/* Row 2: Dominant Primary Launch CTAs */}
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onOpenGarage}
                  className="flex min-h-[54px] sm:min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-xl border border-white/15 bg-zinc-900/95 px-4 font-display text-sm sm:text-base font-bold text-zinc-100 transition-colors hover:bg-zinc-800 whitespace-nowrap cursor-pointer"
                >
                  <CarFront className="h-5 w-5 sm:h-4 sm:w-4 text-amber-400 shrink-0" />
                  <span>Garaj</span>
                </button>

                <button
                  type="button"
                  onClick={onStart}
                  className="flex min-h-[54px] sm:min-h-[48px] min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 sm:px-6 font-display text-base font-extrabold text-zinc-950 shadow-[0_6px_24px_rgba(245,158,11,0.28)] transition-colors hover:bg-amber-400 active:scale-[0.99] cursor-pointer"
                >
                  <Play className="h-5 w-5 sm:h-4 sm:w-4 fill-current shrink-0" />
                  <span className="truncate">Sonsuz Sürüşe Başla</span>
                </button>
              </div>

              {/* Row 3: 4-Column Symmetrical Navigation Strip */}
              <div className="grid grid-cols-4 gap-1.5 border-t border-white/10 pt-2.5">
                <button
                  type="button"
                  onClick={onOpenLeaderboard}
                  className="flex min-h-[54px] sm:min-h-[46px] flex-col items-center justify-center gap-1 rounded-xl px-1 text-xs font-bold text-zinc-300 transition-colors hover:bg-white/6 hover:text-white cursor-pointer"
                >
                  <Medal className="h-5 w-5 sm:h-4 sm:w-4 text-amber-400" />
                  <span className="truncate max-w-full">Sıralama</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenDailyWheel}
                  className={`flex min-h-[54px] sm:min-h-[46px] flex-col items-center justify-center gap-1 rounded-xl px-1 text-xs font-bold transition-colors cursor-pointer ${
                    freeWheelAvailable
                      ? 'bg-emerald-500/14 text-emerald-300 hover:bg-emerald-500/20'
                      : 'text-zinc-300 hover:bg-white/6 hover:text-white'
                  }`}
                >
                  <Gift className="h-5 w-5 sm:h-4 sm:w-4 text-emerald-400" />
                  <span className="truncate max-w-full">
                    {freeWheelAvailable ? 'Seri & Çark' : `Seri ${streakDay}/7`}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setMissionsOpen(true)}
                  className={`relative flex min-h-[54px] sm:min-h-[46px] flex-col items-center justify-center gap-1 rounded-xl px-1 text-xs font-bold transition-colors cursor-pointer ${
                    missions.totalClaimableCount > 0
                      ? 'bg-emerald-500/14 text-emerald-200 ring-1 ring-inset ring-emerald-400/45 hover:bg-emerald-500/22'
                      : 'text-zinc-300 hover:bg-white/6 hover:text-white'
                  }`}
                >
                  {missions.totalClaimableCount > 0 && (
                    <span className="absolute right-1.5 top-1 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-emerald-400 px-1 text-[10px] font-extrabold text-zinc-950 font-mono-num">
                      {missions.totalClaimableCount}
                    </span>
                  )}
                  <Trophy
                    className={`h-5 w-5 sm:h-4 sm:w-4 ${
                      missions.totalClaimableCount > 0
                        ? 'text-emerald-400'
                        : 'text-amber-400'
                    }`}
                  />
                  <span className="truncate max-w-full">
                    {missions.totalClaimableCount > 0
                      ? 'Ödül Al!'
                      : 'Görevler'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenStore('bundles')}
                  className="flex min-h-[54px] sm:min-h-[46px] flex-col items-center justify-center gap-1 rounded-xl bg-amber-500/14 px-1 text-xs font-bold text-amber-300 transition-colors hover:bg-amber-500/22 cursor-pointer"
                >
                  <ShoppingBag className="h-5 w-5 sm:h-4 sm:w-4 text-amber-400" />
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
          className="pointer-events-auto fixed inset-0 z-[25] flex items-end justify-center bg-black/72 p-0 sm:items-center sm:p-4"
        >
          <div
            className="animate-sheet-up w-full rounded-t-3xl border-t border-white/14 bg-zinc-950/96 px-5 pt-3 shadow-2xl sm:w-[min(92vw,380px)] sm:rounded-2xl sm:border sm:p-6"
            style={{
              paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))',
            }}
          >
            <div className="mx-auto mb-3 h-1 w-11 rounded-full bg-white/20 sm:hidden" />
            <h2 className="font-display text-2xl font-extrabold text-white">
              Duraklatıldı
            </h2>
            <p className="mt-1 text-sm text-zinc-400 font-mono-num">
              {stats.career
                ? `Bölüm ${stats.career.levelId} · ${stats.career.title} · ${stats.career.remainingMeters} m kaldı`
                : `${formatDistance(stats.distanceMeters)} · ${stats.score.toLocaleString('tr-TR')} puan`}
            </p>

            <div className="mt-5 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={onTogglePause}
                className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 font-display text-base font-extrabold text-zinc-950 hover:bg-amber-400 active:scale-[0.99] cursor-pointer"
              >
                <Play className="h-5 w-5 fill-current" />
                <span>Devam Et</span>
              </button>
              <button
                type="button"
                onClick={
                  stats.career
                    ? () => onStartCareerLevel(stats.career!.levelId)
                    : onStart
                }
                className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-white/12 bg-zinc-900 px-5 text-sm font-bold text-zinc-100 hover:bg-zinc-800 active:scale-[0.99] cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" />
                <span>
                  {stats.career
                    ? `Bölüm ${stats.career.levelId}'i Yeniden Başlat`
                    : 'Yeniden Başla'}
                </span>
              </button>
              {stats.career && (
                <button
                  type="button"
                  onClick={onOpenCareerMap}
                  className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/35 bg-emerald-500/14 px-5 text-sm font-bold text-emerald-200 hover:bg-emerald-500/22 active:scale-[0.99] cursor-pointer"
                >
                  <Map className="h-4 w-4 text-emerald-400" />
                  <span>Kariyer Haritası</span>
                </button>
              )}
              <button
                type="button"
                onClick={onOpenSettings}
                className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-white/12 bg-zinc-900/90 px-5 text-sm font-bold text-zinc-100 hover:border-amber-400/40 hover:bg-zinc-800 active:scale-[0.99] cursor-pointer"
              >
                <Settings className="h-4 w-4 text-amber-400" />
                <span>Ayarlar &amp; Bildirimler</span>
              </button>
              <div className="grid grid-cols-2 gap-2.5 pt-0.5">
                <button
                  type="button"
                  onClick={onOpenGarage}
                  className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-white/10 bg-zinc-900/75 px-3 text-sm font-bold text-zinc-200 hover:bg-zinc-800 active:scale-[0.99] cursor-pointer"
                >
                  <CarFront className="h-4 w-4 text-amber-400" />
                  <span>Garaj</span>
                </button>
                <button
                  type="button"
                  onClick={onReturnMenu}
                  className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-white/10 bg-zinc-900/75 px-3 text-sm font-bold text-zinc-200 hover:bg-zinc-800 active:scale-[0.99] cursor-pointer"
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
            className="pointer-events-auto fixed inset-0 z-[25] flex items-end justify-center bg-black/68 p-0 sm:items-center sm:p-4"
          >
            <div
              className="animate-sheet-up max-h-[90dvh] w-full overflow-y-auto custom-scroll rounded-t-3xl border-t border-white/14 bg-zinc-950/96 px-5 pt-3 shadow-2xl sm:max-h-[92dvh] sm:w-[min(92vw,440px)] sm:rounded-2xl sm:border sm:p-6"
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
                        className={`flex items-center justify-center rounded-full p-2 ${
                          idx === 2 ? '-translate-y-1.5 scale-110' : ''
                        } ${
                          earned
                            ? 'bg-amber-400/18 ring-1 ring-amber-400/50'
                            : 'bg-zinc-900 ring-1 ring-white/10'
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
                  className={`mt-2.5 text-xs font-extrabold tracking-wide uppercase ${
                    lastCareerOutcome.won
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }`}
                >
                  {lastCareerOutcome.won
                    ? lastCareerOutcome.starsEarned === 3
                      ? 'Mükemmel Sürüş · 3 Yıldız!'
                      : 'Bitiş Çizgisine Ulaştın!'
                    : 'Bitiş Çizgisine Ulaşılamadı'}
                </div>

                <h2 className="mt-1 font-display text-2xl font-extrabold text-white">
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
                  className={`flex items-center justify-between gap-2.5 rounded-xl border px-3 py-2.5 ${
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
                      <div className="truncate text-xs font-bold text-white">
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
                      className={`flex items-center justify-between gap-2.5 rounded-xl border px-3 py-2.5 ${
                        earnedStar
                          ? 'border-emerald-400/40 bg-emerald-500/12'
                          : evalRes.completed
                            ? 'border-amber-400/35 bg-amber-500/10'
                            : 'border-white/10 bg-zinc-900/80'
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        {earnedStar ? (
                          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
                        ) : (
                          <Star className="h-5 w-5 shrink-0 text-zinc-600" />
                        )}
                        <div className="min-w-0">
                          <div className="truncate text-xs font-bold text-white">
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
              <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3.5 py-2.5">
                <div className="flex items-center gap-2">
                  <Coins className="h-4.5 w-4.5 text-amber-400 shrink-0" />
                  <div className="text-xs font-bold text-amber-200">
                    Bölüm Ödülü
                    {lastCareerOutcome.rewardBreakdown.perfectBonusGold > 0 && (
                      <span className="ml-1.5 rounded bg-amber-400/25 px-1.5 py-0.5 text-[10px] font-extrabold text-amber-200">
                        3★ Bonus +{lastCareerOutcome.rewardBreakdown.perfectBonusGold}
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

              {/* Revive CTA on Crash */}
              {!lastCareerOutcome.won && !revivedThisRun && (
                <button
                  type="button"
                  onClick={onWatchAdRevive}
                  className="mt-3.5 flex min-h-[50px] w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/50 bg-emerald-500/18 px-4 font-display text-sm font-bold text-emerald-200 hover:bg-emerald-500/28 active:scale-[0.99] cursor-pointer"
                >
                  <HeartPulse className="h-5 w-5 text-emerald-400 shrink-0" />
                  <span>Reklam İzle · Devam Et</span>
                </button>
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
                    className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 font-display text-base font-extrabold text-zinc-950 hover:bg-amber-400 active:scale-[0.99] cursor-pointer"
                  >
                    <span>
                      Sonraki Bölüm (Bölüm {lastCareerOutcome.levelId + 1})
                    </span>
                    <ArrowRight className="h-5 w-5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      onStartCareerLevel(lastCareerOutcome.levelId)
                    }
                    className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 font-display text-base font-extrabold text-zinc-950 hover:bg-amber-400 active:scale-[0.99] cursor-pointer"
                  >
                    <RotateCcw className="h-5 w-5" />
                    <span>Tekrar Dene</span>
                  </button>
                )}

                <div className="grid grid-cols-4 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      onStartCareerLevel(lastCareerOutcome.levelId)
                    }
                    className="flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-xl border border-white/10 bg-zinc-900 px-1 text-xs font-bold text-zinc-200 hover:bg-zinc-800 active:scale-[0.98] cursor-pointer sm:min-h-[44px] sm:flex-row sm:gap-1.5"
                  >
                    <RotateCcw className="h-4 w-4 text-amber-400" />
                    <span>Tekrar</span>
                  </button>
                  <button
                    type="button"
                    onClick={onOpenCareerMap}
                    className="flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-xl border border-emerald-400/35 bg-emerald-500/14 px-1 text-xs font-bold text-emerald-200 hover:bg-emerald-500/22 active:scale-[0.98] cursor-pointer sm:min-h-[44px] sm:flex-row sm:gap-1.5"
                  >
                    <Map className="h-4 w-4 text-emerald-400" />
                    <span>Harita</span>
                  </button>
                  <button
                    type="button"
                    onClick={onOpenGarage}
                    className="flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-xl border border-white/10 bg-zinc-900 px-1 text-xs font-bold text-zinc-200 hover:bg-zinc-800 active:scale-[0.98] cursor-pointer sm:min-h-[44px] sm:flex-row sm:gap-1.5"
                  >
                    <CarFront className="h-4 w-4 text-amber-400" />
                    <span>Garaj</span>
                  </button>
                  <button
                    type="button"
                    onClick={onReturnMenu}
                    className="flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-xl border border-white/10 bg-zinc-900 px-1 text-xs font-bold text-zinc-300 hover:bg-zinc-800 active:scale-[0.98] cursor-pointer sm:min-h-[44px] sm:flex-row sm:gap-1.5"
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
          const totalCycle = BIOME_SPAN_METERS * BIOMES.length;
          const cyclePos = stats.distanceMeters % totalCycle;
          const curBiomeIdx =
            Math.floor(cyclePos / BIOME_SPAN_METERS) % BIOMES.length;
          const nextBiome = BIOMES[(curBiomeIdx + 1) % BIOMES.length];
          const distToNextBiome = Math.max(
            1,
            BIOME_SPAN_METERS - (cyclePos % BIOME_SPAN_METERS),
          );

          const isNewBest =
            stats.previousBestScore > 0 &&
            stats.score > stats.previousBestScore;
          const scoreDeltaToBest =
            stats.previousBestScore > 0
              ? stats.previousBestScore - stats.score
              : 0;
          const nextLockedCar = [...CAR_MODELS]
            .filter(
              (m) => !unlockedCars.includes(m.id) && m.priceGold > goldCoins,
            )
            .sort((a, b) => a.priceGold - b.priceGold)[0];
          const topMission =
            missions.activeMissions.find((m) => !m.completed && !m.claimed) ||
            missions.activeMissions[0];

          let nearGoalTone: 'emerald' | 'amber' | 'sky' = 'sky';
          let nearGoalTitle = 'Sıradaki Hedef';
          let nearGoalDetail = `Sıradaki bölgeye (${nextBiome.label}) ${distToNextBiome} m kaldı.`;

          if (missions.totalClaimableCount > 0) {
            nearGoalTone = 'emerald';
            nearGoalTitle = 'Ödül Toplanmaya Hazır!';
            nearGoalDetail = `${missions.totalClaimableCount} görev/başarım ödülü seni bekliyor. Görev sekmesinden topla.`;
          } else if (isNewBest) {
            nearGoalTone = 'emerald';
            nearGoalTitle = 'Yeni Kişisel Rekor!';
            nearGoalDetail = `Önceki rekorunu +${(stats.score - stats.previousBestScore).toLocaleString('tr-TR')} puanla geçtin.`;
          } else if (
            scoreDeltaToBest > 0 &&
            scoreDeltaToBest <=
              Math.max(1500, Math.round(stats.previousBestScore * 0.3))
          ) {
            nearGoalTone = 'amber';
            nearGoalTitle = 'Kıl Payı Kaçırdın!';
            nearGoalDetail = `Rekoruna yalnızca ${scoreDeltaToBest.toLocaleString('tr-TR')} puan kalmıştı.`;
          } else if (distToNextBiome <= 300) {
            nearGoalTone = 'sky';
            nearGoalTitle = 'Bölge Sınırındasın!';
            nearGoalDetail = `${nextBiome.label} bölgesine sadece ${distToNextBiome} m kalmıştı.`;
          } else if (
            nextLockedCar &&
            nextLockedCar.priceGold - goldCoins <=
              Math.max(250, Math.round(nextLockedCar.priceGold * 0.25))
          ) {
            nearGoalTone = 'amber';
            nearGoalTitle = 'Hedefe Çok Yakınsın!';
            nearGoalDetail = `${nextLockedCar.name} için ${(nextLockedCar.priceGold - goldCoins).toLocaleString('tr-TR')} Altın kaldı.`;
          } else if (topMission && !topMission.completed && !topMission.claimed) {
            const rem = Math.max(0, topMission.target - topMission.progress);
            nearGoalTone = 'sky';
            nearGoalTitle = 'Günlük Görev';
            nearGoalDetail = `${topMission.title} · ${rem.toLocaleString('tr-TR')} kaldı (+${topMission.rewardGold} Altın)`;
          }

          const runModeSpec =
            GAME_MODES.find((m) => m.id === stats.gameMode) || GAME_MODES[0];
          const gameOverHeadline =
            stats.gameOverReason === 'busted'
              ? 'Yakalandın · Polis Takibi'
              : stats.gameOverReason === 'timeout'
                ? 'Süre Doldu · Zamana Karşı'
                : stats.gameOverReason === 'bomb'
                  ? 'Bomba Patladı · Hız Bombası'
                  : `Kaza · ${runModeSpec.label}`;

          return (
            <div
              onPointerDown={(e) => e.stopPropagation()}
              className="pointer-events-auto fixed inset-0 z-[25] flex items-end justify-center bg-black/68 p-0 sm:items-center sm:p-4"
            >
              <div
                className="animate-sheet-up max-h-[90dvh] w-full overflow-y-auto custom-scroll rounded-t-3xl border-t border-white/14 bg-zinc-950/96 px-5 pt-3 shadow-2xl sm:max-h-[92dvh] sm:w-[min(92vw,420px)] sm:rounded-2xl sm:border sm:p-6"
                style={{
                  paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))',
                }}
              >
                <div className="mx-auto mb-3 h-1 w-11 rounded-full bg-white/20 sm:hidden" />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-rose-400">
                      <span>{gameOverHeadline}</span>
                      {runModeSpec.rewardMultiplier > 1 && (
                        <span className="rounded-md bg-white/10 px-1.5 py-0.5 font-mono-num text-[11px] font-bold text-zinc-200">
                          ×{runModeSpec.rewardMultiplier}
                        </span>
                      )}
                      {rentedSpec && (
                        <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[11px] font-bold text-amber-300">
                          Kiralık: {rentedSpec.name}
                        </span>
                      )}
                    </div>
                    <h2 className="mt-1 font-display text-3xl font-extrabold leading-none text-white sm:text-2xl">
                      {stats.score.toLocaleString('tr-TR')}{' '}
                      <span className="text-lg font-bold text-zinc-400">
                        Puan
                      </span>
                    </h2>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-xs text-zinc-400">En İyi</div>
                    <div className="font-display text-lg font-bold text-amber-400 font-mono-num">
                      {stats.bestScore.toLocaleString('tr-TR')}
                    </div>
                  </div>
                </div>

                {/* Kıl Payı Hedef Callout */}
                <div
                  className={`mt-4 flex items-start gap-2.5 rounded-xl border px-3.5 py-3 ${
                    nearGoalTone === 'emerald'
                      ? 'border-emerald-400/40 bg-emerald-500/12 text-emerald-200'
                      : nearGoalTone === 'amber'
                        ? 'border-amber-400/40 bg-amber-500/12 text-amber-200'
                        : 'border-sky-400/35 bg-sky-500/10 text-sky-200'
                  }`}
                >
                  {nearGoalTone === 'emerald' ? (
                    <Flag className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  ) : (
                    <Target
                      className={`mt-0.5 h-4 w-4 shrink-0 ${
                        nearGoalTone === 'amber'
                          ? 'text-amber-400'
                          : 'text-sky-400'
                      }`}
                    />
                  )}
                  <div className="min-w-0">
                    <div className="font-display text-xs font-extrabold">
                      {nearGoalTitle}
                    </div>
                    <div className="mt-0.5 text-xs leading-snug opacity-90">
                      {nearGoalDetail}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 border-y border-white/10 py-3.5 text-center">
                  <div>
                    <div className="text-xs text-zinc-400">Mesafe</div>
                    <div className="mt-1 font-mono-num text-base font-bold text-white">
                      {formatDistance(stats.distanceMeters)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-400">Altın</div>
                    <div className="mt-1 font-mono-num text-base font-bold text-amber-300">
                      +{stats.runGold}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-400">
                      {stats.gameMode === 'pursuit'
                        ? 'Atlatılan Polis'
                        : stats.gameMode === 'timeattack'
                          ? 'Kontrol Noktası'
                          : 'Yakın Geçiş'}
                    </div>
                    <div className="mt-1 font-mono-num text-base font-bold text-emerald-300">
                      {stats.gameMode === 'pursuit'
                        ? `${stats.policeEvadedCount} (${stats.policeHeat}★)`
                        : stats.gameMode === 'timeattack'
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
                      className={`mt-3.5 flex w-full items-center gap-3 rounded-xl border ${
                        unclaimedLevelRewardsCount > 0
                          ? 'border-amber-400/75 bg-amber-500/12'
                          : `${runTier.borderClass} ${runTier.bgTintClass}`
                      } px-3.5 py-3 text-left transition-colors hover:bg-white/10 cursor-pointer`}
                    >
                      <DriverLevelEmblem
                        level={stats.playerLevel.level}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span
                            className={`truncate font-display text-xs font-extrabold ${runTier.textClass}`}
                          >
                            Sv. {stats.playerLevel.level} ·{' '}
                            {stats.playerLevel.rankTitle}
                          </span>
                          {unclaimedLevelRewardsCount > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-400 px-2 py-0.5 text-[10.5px] font-extrabold text-zinc-950 font-mono-num whitespace-nowrap">
                              <Gift className="h-3 w-3 shrink-0" />
                              <span>{unclaimedLevelRewardsCount} Ödül</span>
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

                {(!revivedThisRun ||
                  stats.runGold > 0 ||
                  (rentedSpec && !unlockedCars.includes(rentedSpec.id))) && (
                  <div className="mt-4 flex flex-col gap-2.5">
                    {!revivedThisRun && (
                      <button
                        type="button"
                        onClick={onWatchAdRevive}
                        className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/50 bg-emerald-500/18 px-4 font-display text-sm font-bold text-emerald-200 hover:bg-emerald-500/28 active:scale-[0.99] cursor-pointer"
                      >
                        <HeartPulse className="h-5 w-5 text-emerald-400 shrink-0" />
                        <span>Reklam İzle · Devam Et</span>
                      </button>
                    )}

                    {stats.runGold > 0 && !runGoldDoubled && (
                      <button
                        type="button"
                        onClick={onWatchAdDoubleGold}
                        className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-sky-400/45 bg-sky-500/15 px-4 font-display text-sm font-bold text-sky-200 hover:bg-sky-500/25 active:scale-[0.99] cursor-pointer"
                      >
                        <PlayCircle className="h-5 w-5 text-sky-400 shrink-0" />
                        <span>Altını 2× Yap (+{stats.runGold} Altın)</span>
                      </button>
                    )}

                    {rentedSpec && !unlockedCars.includes(rentedSpec.id) && (
                      <button
                        type="button"
                        onClick={() =>
                          onRentCar(rentedSpec.id, rentedSpec.name)
                        }
                        className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl border border-amber-400/40 bg-amber-500/14 px-4 font-display text-xs font-bold text-amber-200 hover:bg-amber-500/24 active:scale-[0.99] cursor-pointer"
                      >
                        <PlayCircle className="h-4 w-4 text-amber-400 shrink-0" />
                        <span>{rentedSpec.name} · 1 Koşu Daha Kirala</span>
                      </button>
                    )}

                    {stats.runGold > 0 && runGoldDoubled && (
                      <div className="flex min-h-[36px] items-center justify-center gap-1.5 text-xs font-bold text-emerald-300">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Bu Koşunun Altını 2× Yapıldı</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-4 flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={onStart}
                    className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 font-display text-base font-extrabold text-zinc-950 hover:bg-amber-400 active:scale-[0.99] cursor-pointer"
                  >
                    <RotateCcw className="h-5 w-5" />
                    <span>Tekrar Sür</span>
                  </button>

                  <div className="grid grid-cols-4 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={onOpenGarage}
                      className="flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-xl border border-white/10 bg-zinc-900 px-1 text-xs font-bold text-zinc-200 hover:bg-zinc-800 active:scale-[0.98] cursor-pointer sm:min-h-[44px] sm:flex-row sm:gap-1.5"
                    >
                      <CarFront className="h-4 w-4 text-amber-400" />
                      <span>Garaj</span>
                    </button>
                    <button
                      type="button"
                      onClick={onOpenLeaderboard}
                      className="flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-xl border border-white/10 bg-zinc-900 px-1 text-xs font-bold text-zinc-200 hover:bg-zinc-800 active:scale-[0.98] cursor-pointer sm:min-h-[44px] sm:flex-row sm:gap-1.5"
                    >
                      <Medal className="h-4 w-4 text-amber-400" />
                      <span>Sıra</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMissionsOpen(true)}
                      className={`relative flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-xl border px-1 text-xs font-bold active:scale-[0.98] cursor-pointer sm:min-h-[44px] sm:flex-row sm:gap-1.5 ${
                        missions.totalClaimableCount > 0
                          ? 'border-emerald-400/55 bg-emerald-500/18 text-emerald-200 hover:bg-emerald-500/26'
                          : 'border-white/10 bg-zinc-900 text-zinc-200 hover:bg-zinc-800'
                      }`}
                    >
                      <Trophy
                        className={`h-4 w-4 ${
                          missions.totalClaimableCount > 0
                            ? 'text-emerald-400'
                            : 'text-amber-400'
                        }`}
                      />
                      <span>Görev</span>
                      {missions.totalClaimableCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-emerald-400 px-1 text-[10px] font-extrabold text-zinc-950 font-mono-num sm:static sm:ml-0.5">
                          {missions.totalClaimableCount}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={onReturnMenu}
                      className="flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-xl border border-white/10 bg-zinc-900 px-1 text-xs font-bold text-zinc-300 hover:bg-zinc-800 active:scale-[0.98] cursor-pointer sm:min-h-[44px] sm:flex-row sm:gap-1.5"
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
            className="pointer-events-auto fixed inset-0 z-30 flex items-end justify-center bg-black/78 p-0 sm:items-center sm:p-4"
          >
            <div
              className="animate-sheet-up flex max-h-[90dvh] w-full flex-col rounded-t-3xl border-t border-white/14 bg-zinc-950 px-4 pt-3 shadow-2xl sm:max-h-[84vh] sm:w-[min(94vw,540px)] sm:rounded-2xl sm:border sm:p-5"
              style={{
                paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))',
              }}
            >
              <div className="mx-auto mb-2.5 h-1 w-11 shrink-0 rounded-full bg-white/20 sm:hidden" />
              <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div className="min-w-0">
                  <h2 className="font-display text-xl font-bold text-white">
                    Görevler ve Başarımlar
                  </h2>
                  <div className="mt-1 flex items-center gap-2 text-xs text-zinc-400">
                    <DriverLevelEmblem
                      level={playerLevel.level}
                      size="xs"
                      showNumber={false}
                    />
                    <span
                      className={`font-semibold ${playerRankTier.textClass} shrink-0`}
                    >
                      Sv. {playerLevel.level} · {playerLevel.rankTitle}
                    </span>
                    <span
                      aria-hidden="true"
                      className="hidden text-zinc-600 sm:inline"
                    >
                      ·
                    </span>
                    <span className="hidden truncate sm:inline">
                      Tamamlanan hedeflere tıklayarak altınını topla
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMissionsOpen(false)}
                  aria-label="Kapat"
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/12 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white cursor-pointer shrink-0"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-3 flex items-center gap-1 rounded-xl bg-zinc-900 p-1">
                <button
                  type="button"
                  onClick={() => setMissionsTab('missions')}
                  className={`flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors cursor-pointer sm:text-sm ${
                    missionsTab === 'missions'
                      ? 'bg-amber-500 text-zinc-950'
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
                      className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-extrabold font-mono-num ${
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
                  className={`flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors cursor-pointer sm:text-sm ${
                    missionsTab === 'achievements'
                      ? 'bg-amber-500 text-zinc-950'
                      : 'text-zinc-300 hover:text-white'
                  }`}
                >
                  <span>
                    Başarımlar ({unlockedAchCount}/{totalAchCount})
                  </span>
                  {missions.claimableAchievementsCount > 0 && (
                    <span
                      className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-extrabold font-mono-num ${
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
                <div className="mt-2.5 flex items-center justify-between gap-2 rounded-xl border border-white/8 bg-zinc-900/65 px-3.5 py-2.5 text-xs">
                  <span className="text-zinc-300">
                    Her gün 00:00&apos;da 3 yeni görev
                  </span>
                  <span className="inline-flex items-center gap-1 font-mono-num font-bold text-amber-300 shrink-0">
                    <Timer className="h-3.5 w-3.5 text-amber-400" />
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
                    className="mt-2.5 flex min-h-[48px] w-full items-center justify-between gap-2 rounded-xl border border-emerald-400/55 bg-emerald-500/18 px-4 py-2.5 text-sm font-bold text-emerald-200 transition-colors hover:bg-emerald-500/28 active:scale-[0.99] cursor-pointer"
                  >
                    <span>
                      Tümünü Topla ({tabClaimableCount} hazır ödül)
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-400 px-3 py-1.5 text-xs font-extrabold text-zinc-950 font-mono-num">
                      <Coins className="h-3.5 w-3.5" />
                      <span>+{tabClaimableGold.toLocaleString('tr-TR')}</span>
                    </span>
                  </button>
                );
              })()}

              {missionsTab === 'achievements' && (
                <div className="mt-2.5 space-y-2.5">
                  <div className="flex items-center gap-2.5 px-0.5">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all"
                        style={{
                          width: `${Math.round((unlockedAchCount / Math.max(1, totalAchCount)) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs font-bold text-amber-300 font-mono-num shrink-0">
                      {Math.round(
                        (unlockedAchCount / Math.max(1, totalAchCount)) * 100,
                      )}
                      % Tamamlandı
                    </span>
                  </div>
                  <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-0.5">
                    {(
                      [
                        { id: 'all', label: 'Tümü' },
                        { id: 'speed', label: 'Hız' },
                        { id: 'skill', label: 'Makas' },
                        { id: 'drift', label: 'Drift' },
                        { id: 'events', label: 'Yol' },
                        { id: 'garage', label: 'Garaj' },
                      ] as { id: 'all' | AchievementCategory; label: string }[]
                    ).map((cat) => {
                      const catItems =
                        cat.id === 'all'
                          ? missions.achievements
                          : missions.achievements.filter(
                              (a) => a.category === cat.id,
                            );
                      const catUnlocked = catItems.filter(
                        (a) => a.unlocked,
                      ).length;
                      const catClaimable = catItems.filter(
                        (a) => a.unlocked && !a.claimed,
                      ).length;
                      const active = achCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setAchCategory(cat.id)}
                          className={`inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                            active
                              ? 'border-amber-400/70 bg-amber-500/20 text-amber-200'
                              : 'border-white/10 bg-zinc-900 text-zinc-400 hover:border-white/20 hover:text-white'
                          }`}
                        >
                          <span>{cat.label}</span>
                          <span className="font-mono-num opacity-80">
                            {catUnlocked}/{catItems.length}
                          </span>
                          {catClaimable > 0 && (
                            <span
                              className="h-2 w-2 rounded-full bg-emerald-400"
                              aria-label={`${catClaimable} toplanabilir ödül`}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="mt-3 flex-1 space-y-2.5 overflow-y-auto pr-1 custom-scroll">
                {missionsTab === 'missions' ? (
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
                              className="w-full rounded-xl border border-emerald-400/65 bg-emerald-500/14 p-3.5 text-left transition-all hover:bg-emerald-500/22 active:scale-[0.99] cursor-pointer"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                                    <span className="font-display text-sm font-bold text-white">
                                      {m.title}
                                    </span>
                                  </div>
                                  <p className="mt-0.5 text-[11px] font-medium text-emerald-300/90">
                                    Günlük görev tamamlandı · Ödülünü almak için dokun
                                  </p>
                                </div>
                                <span className="inline-flex items-center gap-1 rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-extrabold text-zinc-950 font-mono-num shrink-0 shadow-sm">
                                  <Coins className="h-3.5 w-3.5" />
                                  <span>Ödülü Al +{m.rewardGold}</span>
                                </span>
                              </div>
                              <div className="mt-2.5 flex items-center gap-3">
                                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/12">
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
                              className="rounded-xl border border-emerald-400/25 bg-zinc-900/55 p-3.5 opacity-80"
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
                                <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/30 bg-emerald-500/12 px-2.5 py-1 text-[11px] font-bold text-emerald-300 shrink-0">
                                  Alındı
                                </span>
                              </div>
                            </div>
                          );
                        }
                        return (
                          <div
                            key={m.id}
                            className="rounded-xl border border-white/10 bg-zinc-900/75 p-3.5"
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
                              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                                <div
                                  className="h-full bg-amber-400"
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
                        <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3.5 py-3 text-center text-xs text-emerald-200">
                          Bugünün 3 günlük görevi tamamlandı · Yeni görevler
                          00:00&apos;da yenilenecek.
                        </div>
                      )}
                  </>
                ) : missions.achievements
                      .filter(
                        (ach) =>
                          achCategory === 'all' || ach.category === achCategory,
                      )
                      .slice()
                      .sort((a, b) => {
                        const aRank = a.unlocked && !a.claimed ? 0 : !a.unlocked ? 1 : 2;
                        const bRank = b.unlocked && !b.claimed ? 0 : !b.unlocked ? 1 : 2;
                        return aRank - bRank;
                      })
                      .map((ach) => {
                        const pct = Math.min(
                          100,
                          Math.round(
                            (ach.progress / Math.max(1, ach.target)) * 100,
                          ),
                        );
                        const canClaim = ach.unlocked && !ach.claimed;

                        if (canClaim) {
                          return (
                            <button
                              key={ach.id}
                              type="button"
                              onClick={() => onClaimAchievement(ach.id)}
                              className="w-full rounded-xl border border-amber-400/70 bg-amber-500/14 p-3.5 text-left transition-all hover:bg-amber-500/22 active:scale-[0.99] cursor-pointer"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <Trophy className="h-4 w-4 text-amber-400 shrink-0" />
                                    <span className="font-display text-sm font-bold text-white">
                                      {ach.title}
                                    </span>
                                  </div>
                                  <p className="mt-0.5 text-xs text-amber-100/80">
                                    {ach.description}
                                  </p>
                                </div>
                                <span className="inline-flex items-center gap-1 rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-extrabold text-zinc-950 font-mono-num shrink-0 shadow-sm">
                                  <Coins className="h-3.5 w-3.5" />
                                  <span>Ödülü Al +{ach.rewardGold}</span>
                                </span>
                              </div>
                              <div className="mt-2.5 flex items-center gap-3">
                                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/12">
                                  <div className="h-full w-full bg-amber-400" />
                                </div>
                                <span className="text-xs font-semibold text-amber-300 font-mono-num">
                                  {ach.target.toLocaleString('tr-TR')} /{' '}
                                  {ach.target.toLocaleString('tr-TR')}
                                </span>
                              </div>
                            </button>
                          );
                        }

                        return (
                          <div
                            key={ach.id}
                            className={`rounded-xl border p-3.5 ${
                              ach.claimed
                                ? 'border-emerald-400/28 bg-emerald-500/8'
                                : 'border-white/10 bg-zinc-900/75'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-1.5">
                                  {ach.claimed && (
                                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                                  )}
                                  <span className="font-display text-sm font-bold text-white">
                                    {ach.title}
                                  </span>
                                </div>
                                <p className="mt-0.5 text-xs text-zinc-400">
                                  {ach.description}
                                </p>
                              </div>
                              {ach.claimed ? (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-300 shrink-0">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  <span>Alındı</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-300 font-mono-num shrink-0">
                                  <Coins className="h-3.5 w-3.5" />
                                  <span>+{ach.rewardGold}</span>
                                </span>
                              )}
                            </div>
                            <div className="mt-2.5 flex items-center gap-3">
                              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                                <div
                                  className={`h-full ${
                                    ach.claimed
                                      ? 'bg-emerald-400'
                                      : 'bg-sky-400'
                                  }`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs text-zinc-300 font-mono-num">
                                {ach.progress.toLocaleString('tr-TR')} /{' '}
                                {ach.target.toLocaleString('tr-TR')}
                              </span>
                            </div>
                          </div>
                        );
                      })}
              </div>
            </div>
          </div>
        )}

      {/* IN-GAME BOTTOM TELEMETRY BAR — Full-Width Edge-to-Edge Nitro (Plasma) + Gövde (Armored Segments) */}
      {isPlaying && (
        <footer
          className="flex w-full flex-col gap-1.5 bg-gradient-to-t from-black/85 via-black/35 to-transparent px-2.5 pt-3 sm:gap-2 sm:px-5 sm:pt-4"
          style={{ paddingBottom: 'max(0.65rem, env(safe-area-inset-bottom))' }}
        >
          {/* Active Power-Up Timers & Desktop Gesture Hint above the full-width bars */}
          {(stats.rampageTimer > 0 || stats.magnetTimer > 0 || showSteerHint) && (
            <div className="flex w-full items-end justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {stats.rampageTimer > 0 && (
                  <div className="flex w-40 flex-col gap-1 rounded-xl border border-orange-400/65 bg-zinc-950/92 px-2.5 py-1.5 shadow-[0_0_18px_rgba(249,115,22,0.35)] sm:w-44">
                    <div className="flex items-center justify-between text-[11px] font-extrabold text-orange-300 leading-none">
                      <span className="inline-flex items-center gap-1">
                        <Zap className="h-3.5 w-3.5 fill-orange-400 text-orange-300" />
                        <span>
                          YIKIM · {formatSpeedMultiplier(stats.rampageSpeedMult)}
                        </span>
                      </span>
                      <span className="font-mono-num">
                        {Math.ceil(stats.rampageTimer)} sn
                      </span>
                    </div>
                    <div className="h-1 w-full overflow-hidden rounded-full bg-white/15">
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
                  <div className="flex w-36 flex-col gap-1 rounded-xl border border-rose-400/45 bg-zinc-950/90 px-2.5 py-1.5 sm:w-40">
                    <div className="flex items-center justify-between text-[11px] font-bold text-rose-300 leading-none">
                      <span className="inline-flex items-center gap-1">
                        <Magnet className="h-3.5 w-3.5" />
                        <span>Mıknatıs</span>
                      </span>
                      <span className="font-mono-num">
                        {Math.ceil(stats.magnetTimer)} sn
                      </span>
                    </div>
                    <div className="h-1 w-full overflow-hidden rounded-full bg-white/12">
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

              <div
                className={`hidden sm:flex items-center gap-2 text-xs text-zinc-300 transition-opacity duration-300 ${
                  showSteerHint ? 'opacity-85' : 'opacity-0'
                }`}
              >
                <MoveHorizontal className="h-4 w-4 text-amber-400" />
                <span>Kaydırarak yönlendir · Çift tıkla: Nitro</span>
              </div>
            </div>
          )}

          {/* BAR 1 (UPPER FULL-WIDTH): NİTRO — Silky 60/120fps Afterburner Turbo-Wing Ribbon */}
          <NitroWingBar
            nitroPercent={stats.nitroPercent}
            nitroActive={stats.nitroActive}
            onNitroToggle={onNitroToggle}
          />

          {/* BAR 2 (LOWERMOST FULL-WIDTH): GÖVDE — Frameless Symmetric Twin-Wing Armored Spine */}
          <div className="relative flex h-6 sm:h-7 w-full items-center gap-0">
            {/* LEFT WING (Retracts symmetrically inward toward the center shield) */}
            <div
              className="relative h-2 sm:h-2.5 flex-1 overflow-hidden bg-zinc-950/80 shadow-[0_2px_10px_rgba(0,0,0,0.75)]"
              style={{
                clipPath:
                  'polygon(0% 50%, 9px 0%, 100% 0%, 100% 100%, 9px 100%)',
              }}
            >
              {/* Subtle top/bottom metallic rail */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-white/15"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-[1px] bg-white/10"
              />
              {/* Active Armored Core (anchored right, expanding toward far-left edge) */}
              <div
                className={`absolute inset-y-0 right-0 transition-[width] duration-150 ${
                  integrityTier === 'healthy'
                    ? 'bg-gradient-to-l from-emerald-300 via-emerald-400 to-teal-500 shadow-[0_0_12px_rgba(16,185,129,0.65)]'
                    : integrityTier === 'warn'
                      ? 'bg-gradient-to-l from-amber-200 via-amber-400 to-orange-500 shadow-[0_0_12px_rgba(245,158,11,0.65)]'
                      : 'animate-hud-critical-pulse bg-gradient-to-l from-rose-300 via-rose-500 to-red-700 shadow-[0_0_14px_rgba(244,63,94,0.85)]'
                }`}
                style={{ width: `${clampedIntegrity}%` }}
              >
                <div className="absolute inset-x-0 top-0 h-[40%] bg-white/35" />
              </div>
              {/* Fine articulated armor seam cuts */}
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
                    ? 'bg-amber-400/95'
                    : 'animate-hud-critical-pulse bg-rose-500'
              }`}
              style={{
                clipPath:
                  'polygon(9px 0%, calc(100% - 9px) 0%, 100% 50%, calc(100% - 9px) 100%, 9px 100%, 0% 50%)',
              }}
            >
              {/* Inner dark obsidian core nested by 1.5px to create crisp razor neon bevel */}
              <div
                className="flex h-[calc(100%-3px)] w-[calc(100%-3px)] items-center justify-center gap-1.5 bg-zinc-950 px-2.5 sm:px-3"
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
                        ? 'text-amber-400'
                        : 'text-rose-400'
                  }`}
                />
                <span
                  className={`font-display text-[10px] sm:text-[11px] font-black tracking-[0.14em] whitespace-nowrap ${
                    integrityTier === 'healthy'
                      ? 'text-emerald-300'
                      : integrityTier === 'warn'
                        ? 'text-amber-300'
                        : 'text-rose-400'
                  }`}
                >
                  {integrityTier === 'critical' ? 'KRİTİK' : 'GÖVDE'}
                </span>
                <span className="font-mono-num text-[11px] sm:text-xs font-black text-white whitespace-nowrap">
                  %{clampedIntegrity}
                </span>
              </div>
            </div>

            {/* RIGHT WING (Exact symmetric mirror expanding toward far-right edge) */}
            <div
              className="relative h-2 sm:h-2.5 flex-1 overflow-hidden bg-zinc-950/80 shadow-[0_2px_10px_rgba(0,0,0,0.75)]"
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
              {/* Active Armored Core (anchored left, expanding toward far-right edge) */}
              <div
                className={`absolute inset-y-0 left-0 transition-[width] duration-150 ${
                  integrityTier === 'healthy'
                    ? 'bg-gradient-to-r from-emerald-300 via-emerald-400 to-teal-500 shadow-[0_0_12px_rgba(16,185,129,0.65)]'
                    : integrityTier === 'warn'
                      ? 'bg-gradient-to-r from-amber-200 via-amber-400 to-orange-500 shadow-[0_0_12px_rgba(245,158,11,0.65)]'
                      : 'animate-hud-critical-pulse bg-gradient-to-r from-rose-300 via-rose-500 to-red-700 shadow-[0_0_14px_rgba(244,63,94,0.85)]'
                }`}
                style={{ width: `${clampedIntegrity}%` }}
              >
                <div className="absolute inset-x-0 top-0 h-[40%] bg-white/35" />
              </div>
              {/* Fine articulated armor seam cuts */}
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
        <div className="pointer-events-none fixed inset-0 z-[26] flex items-center justify-center bg-black/28">
          <div
            key={stats.resumeCountdown}
            className="animate-hud-drift-pop flex flex-col items-center gap-2"
          >
            <div className="flex h-28 w-28 sm:h-32 sm:w-32 items-center justify-center rounded-full border-2 border-amber-400/75 bg-zinc-950/88 shadow-[0_0_40px_rgba(245,158,11,0.42)]">
              <span className="font-display text-6xl sm:text-7xl font-black leading-none text-white drop-shadow-[0_4px_16px_rgba(245,158,11,0.65)] font-mono-num">
                {stats.resumeCountdown}
              </span>
            </div>
            <span className="rounded-full border border-white/15 bg-zinc-950/85 px-3.5 py-1 font-display text-[11px] font-extrabold tracking-[0.22em] text-amber-300 uppercase">
              Hazırlan
            </span>
          </div>
        </div>
      )}

      {/* Mobile initial gesture hint — Placed cleanly above frameless bottom dual instruments */}
      {isPlaying && showSteerHint && stats.resumeCountdown === 0 && (
        <div className="pointer-events-none fixed bottom-24 left-1/2 -translate-x-1/2 max-w-[calc(100vw-2rem)] sm:hidden">
          <div className="flex items-center gap-2 rounded-2xl border border-white/14 bg-zinc-950/92 px-3.5 py-2 text-xs font-medium text-zinc-200 whitespace-nowrap shadow-xl">
            {steeringMode === 'tilt' ? (
              <>
                <Smartphone className="h-4 w-4 text-amber-400 shrink-0" />
                <span>Telefonu eğerek sür · Çift tıkla: Nitro</span>
              </>
            ) : (
              <>
                <MoveHorizontal className="h-4 w-4 text-amber-400 shrink-0" />
                <span>Kaydırarak sür · Çift tıkla: Nitro</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

GameHud.displayName = 'GameHud';

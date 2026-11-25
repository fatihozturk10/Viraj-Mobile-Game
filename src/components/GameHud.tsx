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
  Star,
  Target,
  Timer,
  Trophy,
  Unlock,
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
  showSteerHint: boolean;
  callout: FloatingCallout | null;
  onSelectGameMode: (mode: GameModeId) => void;
  onStart: () => void;
  onOpenGarage: () => void;
  onToggleGarageMenu: () => void;
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

const WheelRimPreview: React.FC<{ styleId: WheelStyleId; color: string }> = ({
  styleId,
  color,
}) => {
  const glowColor =
    color.toLowerCase() === '#18181b' || color.toLowerCase() === '#52525b'
      ? '#38bdf8'
      : color;
  const outerRingColor =
    styleId === 'deepdish' || styleId === 'wireClassic'
      ? '#e4e4e7'
      : styleId === 'aeroDisc'
        ? '#3f3f46'
        : styleId === 'animNeonPulse'
          ? glowColor
          : styleId === 'animMagma'
            ? '#f97316'
            : styleId === 'animCyberGrid'
              ? '#22d3ee'
              : styleId === 'animPrismVortex'
                ? '#c084fc'
                : styleId === 'animReactor'
                  ? '#27272a'
                  : color;
  return (
    <svg
      viewBox="0 0 40 40"
      className="h-8 w-8 shrink-0"
      aria-hidden="true"
    >
      <circle cx="20" cy="20" r="18" fill="#18181b" stroke="#27272a" strokeWidth="2.5" />
      {/* Sidewall accent rings for specialty & animated wheels */}
      {styleId === 'aeroDisc' && (
        <circle cx="20" cy="20" r="16.2" fill="none" stroke="#ef4444" strokeWidth="1.4" />
      )}
      {styleId === 'wireClassic' && (
        <circle cx="20" cy="20" r="16.1" fill="none" stroke="#f4f4f5" strokeWidth="2.1" />
      )}
      {styleId === 'animNeonPulse' && (
        <circle cx="20" cy="20" r="16.2" fill="none" stroke={glowColor} strokeWidth="1.4" opacity="0.88" />
      )}
      {styleId === 'animReactor' && (
        <circle cx="20" cy="20" r="16.2" fill="none" stroke={glowColor} strokeWidth="1.25" strokeDasharray="5 2.5" />
      )}
      {styleId === 'animMagma' && (
        <circle cx="20" cy="20" r="16.2" fill="none" stroke="#fb923c" strokeWidth="1.5" />
      )}
      {styleId === 'animCyberGrid' && (
        <circle cx="20" cy="20" r="16.2" fill="none" stroke="#22d3ee" strokeWidth="1.4" />
      )}
      {styleId === 'animPrismVortex' && (
        <circle cx="20" cy="20" r="16.2" fill="none" stroke="#f472b6" strokeWidth="1.5" />
      )}

      <circle
        cx="20"
        cy="20"
        r="13.5"
        fill={styleId === 'aeroDisc' ? '#27272a' : 'none'}
        stroke={outerRingColor}
        strokeWidth={styleId === 'deepdish' || styleId === 'offroadBead' ? 2.4 : 1.8}
      />

      {styleId === 'twin5' &&
        [0, 72, 144, 216, 288].map((deg) => (
          <g key={deg} transform={`rotate(${deg} 20 20)`}>
            <line x1="20" y1="20" x2="17.5" y2="7.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
            <line x1="20" y1="20" x2="22.5" y2="7.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
          </g>
        ))}
      {styleId === 'multispoke' && (
        <>
          <circle cx="20" cy="20" r="8.2" fill="none" stroke={color} strokeWidth="1" opacity="0.7" />
          {[0, 36, 72, 108, 144, 180, 216, 252, 288, 324].map((deg) => (
            <line
              key={deg}
              x1="20"
              y1="20"
              x2="20"
              y2="7"
              stroke={color}
              strokeWidth="1.25"
              strokeLinecap="round"
              transform={`rotate(${deg} 20 20)`}
            />
          ))}
        </>
      )}
      {styleId === 'deepdish' && (
        <>
          <circle cx="20" cy="20" r="10.8" fill="none" stroke="#a1a1aa" strokeWidth="1.1" />
          {[0, 60, 120, 180, 240, 300].map((deg) => (
            <line
              key={deg}
              x1="20"
              y1="20"
              x2="20"
              y2="9.5"
              stroke={color}
              strokeWidth="2.8"
              strokeLinecap="round"
              transform={`rotate(${deg} 20 20)`}
            />
          ))}
        </>
      )}
      {styleId === 'turbine' && (
        <>
          <circle cx="20" cy="20" r="11.5" fill="none" stroke="#27272a" strokeWidth="1.5" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <path
              key={deg}
              d="M20 20 Q23 14 25 8.5"
              fill="none"
              stroke={color}
              strokeWidth="2.1"
              strokeLinecap="round"
              transform={`rotate(${deg} 20 20)`}
            />
          ))}
        </>
      )}
      {styleId === 'offroadBead' && (
        <>
          {[0, 60, 120, 180, 240, 300].map((deg) => (
            <line
              key={deg}
              x1="20"
              y1="20"
              x2="20"
              y2="8.5"
              stroke={color}
              strokeWidth="3"
              strokeLinecap="round"
              transform={`rotate(${deg} 20 20)`}
            />
          ))}
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
            <circle
              key={deg}
              cx={20 + Math.cos((deg * Math.PI) / 180) * 12.2}
              cy={20 + Math.sin((deg * Math.PI) / 180) * 12.2}
              r="0.9"
              fill="#e4e4e7"
            />
          ))}
        </>
      )}
      {styleId === 'meshHoneycomb' && (
        <>
          <polygon
            points="20,12 25.6,14.4 28,20 25.6,25.6 20,28 14.4,25.6 12,20 14.4,14.4"
            fill="none"
            stroke={color}
            strokeWidth="1.15"
          />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <g key={deg} transform={`rotate(${deg} 20 20)`}>
              <line x1="20" y1="20" x2="20" y2="12" stroke={color} strokeWidth="1.2" />
              <line x1="20" y1="12" x2="17.5" y2="7.2" stroke={color} strokeWidth="1.1" />
              <line x1="20" y1="12" x2="22.5" y2="7.2" stroke={color} strokeWidth="1.1" />
            </g>
          ))}
        </>
      )}
      {styleId === 'forgedY' &&
        [0, 60, 120, 180, 240, 300].map((deg) => (
          <g key={deg} transform={`rotate(${deg} 20 20)`}>
            <line x1="20" y1="20" x2="20" y2="14.5" stroke={color} strokeWidth="1.7" strokeLinecap="round" />
            <line x1="20" y1="14.5" x2="16.8" y2="7.5" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
            <line x1="20" y1="14.5" x2="23.2" y2="7.5" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
          </g>
        ))}
      {styleId === 'aeroDisc' && (
        <>
          <circle cx="20" cy="20" r="8" fill="none" stroke="#ef4444" strokeWidth="1.3" />
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
            <line
              key={deg}
              x1="20"
              y1="11.5"
              x2="21.5"
              y2="7.4"
              stroke="#71717a"
              strokeWidth="1.4"
              strokeLinecap="round"
              transform={`rotate(${deg} 20 20)`}
            />
          ))}
        </>
      )}
      {styleId === 'wireClassic' && (
        <>
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
            <line
              key={deg}
              x1="20"
              y1="20"
              x2={deg % 60 === 0 ? '23.5' : '16.5'}
              y2="7.5"
              stroke="#f5c542"
              strokeWidth="1.05"
              transform={`rotate(${deg} 20 20)`}
            />
          ))}
        </>
      )}
      {styleId === 'animNeonPulse' && (
        <>
          <circle cx="20" cy="20" r="7.5" fill="none" stroke={glowColor} strokeWidth="1.4" opacity="0.85" />
          {[0, 72, 144, 216, 288].map((deg) => (
            <line
              key={deg}
              x1="20"
              y1="20"
              x2="20"
              y2="7.4"
              stroke={glowColor}
              strokeWidth="1.8"
              strokeLinecap="round"
              transform={`rotate(${deg} 20 20)`}
            />
          ))}
        </>
      )}
      {styleId === 'animReactor' && (
        <>
          <polygon
            points="20,10.5 28.2,15.2 28.2,24.8 20,29.5 11.8,24.8 11.8,15.2"
            fill="none"
            stroke={glowColor}
            strokeWidth="1.6"
          />
          {[0, 120, 240].map((deg) => (
            <path
              key={deg}
              d="M20 20 Q23 14 25.5 9"
              fill="none"
              stroke={glowColor}
              strokeWidth="1.9"
              strokeLinecap="round"
              transform={`rotate(${deg} 20 20)`}
            />
          ))}
        </>
      )}
      {styleId === 'animMagma' && (
        <>
          <circle cx="20" cy="20" r="7.6" fill="none" stroke="#facc15" strokeWidth="1.5" />
          {[0, 72, 144, 216, 288].map((deg) => (
            <path
              key={deg}
              d="M20 20 L22.5 14 L18.5 7.5"
              fill="none"
              stroke="#f97316"
              strokeWidth="2"
              strokeLinecap="round"
              transform={`rotate(${deg} 20 20)`}
            />
          ))}
        </>
      )}
      {styleId === 'animCyberGrid' && (
        <>
          <circle cx="20" cy="20" r="10.2" fill="none" stroke="#e879f9" strokeWidth="1.35" strokeDasharray="4 2" />
          <circle cx="20" cy="20" r="6.4" fill="none" stroke="#22d3ee" strokeWidth="1.4" />
          {[0, 60, 120, 180, 240, 300].map((deg) => (
            <line
              key={deg}
              x1="20"
              y1="20"
              x2="20"
              y2="7.5"
              stroke={deg % 120 === 0 ? '#22d3ee' : '#e879f9'}
              strokeWidth="1.2"
              transform={`rotate(${deg} 20 20)`}
            />
          ))}
        </>
      )}
      {styleId === 'animPrismVortex' && (
        <>
          <circle cx="20" cy="20" r="7.6" fill="none" stroke="#38bdf8" strokeWidth="1.4" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
            <path
              key={deg}
              d="M20 20 Q24 14 27 9.5"
              fill="none"
              stroke={
                ['#f43f5e', '#f59e0b', '#22c55e', '#06b6d4', '#818cf8', '#e879f9', '#38bdf8', '#fb7185'][i]
              }
              strokeWidth="1.8"
              strokeLinecap="round"
              transform={`rotate(${deg} 20 20)`}
            />
          ))}
        </>
      )}

      <circle
        cx="20"
        cy="20"
        r="3"
        fill={
          styleId === 'forgedY'
            ? '#ef4444'
            : styleId === 'wireClassic'
              ? '#f5c542'
              : styleId === 'aeroDisc'
                ? '#93c5fd'
                : styleId === 'animMagma'
                  ? '#facc15'
                  : styleId === 'animCyberGrid'
                    ? '#22d3ee'
                    : styleId === 'animPrismVortex'
                      ? '#e879f9'
                      : styleId === 'animNeonPulse' || styleId === 'animReactor'
                        ? glowColor
                        : '#e4e4e7'
        }
        stroke="#09090b"
        strokeWidth="1"
      />
    </svg>
  );
};

function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

const RarityLabel: React.FC<{
  rarity: ItemRarity;
  selected?: boolean;
  compact?: boolean;
}> = ({ rarity, selected = false, compact = false }) => {
  const meta = ITEM_RARITY_META[rarity];
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap font-bold shrink-0 ${
        compact ? 'text-[10px]' : 'text-[10.5px]'
      } ${selected ? meta.selectedTextClass : meta.textClass}`}
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${meta.dotClass}`}
        aria-hidden="true"
      />
      <span>{meta.label}</span>
    </span>
  );
};

function getRarityCardClass(
  rarity: ItemRarity,
  isSelected: boolean,
  isUnlocked: boolean,
): string {
  if (isSelected) {
    return 'border-amber-400 bg-zinc-100 text-zinc-950';
  }
  const meta = ITEM_RARITY_META[rarity];
  return `${meta.borderClass} ${
    isUnlocked
      ? `${meta.cardTintClass} text-zinc-200`
      : 'bg-zinc-900/50 text-zinc-400'
  }`;
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
  showSteerHint,
  callout,
  onSelectGameMode,
  onStart,
  onOpenGarage,
  onToggleGarageMenu,
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
  onOpenLevelRoad,
}) => {
  const [garageTab, setGarageTab] = useState<
    'models' | 'upgrades' | 'powerups' | 'body' | 'wheels' | 'style'
  >('models');
  const [bodySubTab, setBodySubTab] = useState<
    'kit' | 'spoiler' | 'hat' | 'steering' | 'mirror'
  >('kit');
  const [styleSubTab, setStyleSubTab] = useState<
    'paint' | 'livery' | 'neon' | 'headlight' | 'fx' | 'plate'
  >('paint');
  const [fxMode, setFxMode] = useState<'nitro' | 'smoke'>('nitro');
  const [previewWheelStyle, setPreviewWheelStyle] =
    useState<WheelStyleId | null>(null);
  const [previewCustom, setPreviewCustom] =
    useState<Partial<CarCustomConfig> | null>(null);
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

  useEffect(() => {
    setPreviewWheelStyle(null);
    setPreviewCustom(null);
  }, [carModel, phase]);

  useEffect(() => {
    if (phase === 'garage' && garageTab === 'style' && styleSubTab === 'fx') {
      onGarageEffectPreview(fxMode);
    } else {
      onGarageEffectPreview('none');
    }
  }, [phase, garageTab, styleSubTab, fxMode, onGarageEffectPreview]);

  useEffect(() => {
    if (phase !== 'garage') return;
    let focus: GarageCameraFocus = 'overview';
    if (garageTab === 'wheels') {
      focus = 'wheels';
    } else if (garageTab === 'body') {
      focus =
        bodySubTab === 'spoiler'
          ? 'spoiler'
          : bodySubTab === 'hat'
            ? 'roof'
            : bodySubTab === 'steering'
              ? 'steering'
              : bodySubTab === 'mirror'
                ? 'mirror'
                : 'bodykit';
    } else if (garageTab === 'style') {
      if (styleSubTab === 'livery') {
        focus = 'livery';
      } else if (styleSubTab === 'neon') {
        focus = 'neon';
      } else if (styleSubTab === 'headlight') {
        focus = 'headlight';
      } else if (styleSubTab === 'plate') {
        focus = 'plate';
      } else if (styleSubTab === 'fx') {
        focus = fxMode === 'nitro' ? 'exhaust' : 'smoke';
      } else {
        focus = 'overview';
      }
    }
    onGarageCameraFocus(focus);
  }, [phase, garageTab, bodySubTab, styleSubTab, fxMode, onGarageCameraFocus]);
  const [missionsTab, setMissionsTab] = useState<'missions' | 'achievements'>(
    'missions',
  );
  const [achCategory, setAchCategory] = useState<'all' | AchievementCategory>(
    'all',
  );

  const isPlaying = phase === 'playing';
  const activeModel =
    CAR_MODELS.find((m) => m.id === carModel) || CAR_MODELS[0];
  const isActiveUnlocked = unlockedCars.includes(activeModel.id);
  const canAffordActive = goldCoins >= activeModel.priceGold;
  const activeUpgrades: CarUpgrades = carUpgrades[activeModel.id] || {
    engine: 0,
    tires: 0,
    nitroTank: 0,
    nitroPower: 0,
  };
  const equippedWheel =
    carWheels[activeModel.id] || getDefaultWheelForCar(activeModel.id);
  const equippedCustom =
    carCustom[activeModel.id] || getDefaultCustomForCar();
  const inspectedCustom: CarCustomConfig =
    phase === 'garage' && previewCustom
      ? {
          ...equippedCustom,
          ...previewCustom,
        }
      : equippedCustom;
  const inspectedKitSpec =
    BODY_KITS.find((k) => k.id === inspectedCustom.bodyKit) || BODY_KITS[0];
  const inspectedSpoilerSpec =
    SPOILERS.find((s) => s.id === inspectedCustom.spoiler) || SPOILERS[0];
  const inspectedHatSpec =
    ROOF_HATS.find((h) => h.id === inspectedCustom.roofHat) || ROOF_HATS[0];
  const inspectedSteeringSpec =
    STEERING_WHEELS.find((w) => w.id === inspectedCustom.steeringWheel) ||
    STEERING_WHEELS[0];
  const inspectedMirrorSpec =
    MIRROR_CHARMS.find((m) => m.id === inspectedCustom.mirrorCharm) ||
    MIRROR_CHARMS[0];
  const inspectedLiverySpec =
    LIVERIES.find((l) => l.id === inspectedCustom.livery) || LIVERIES[0];
  const inspectedWheelStyle: WheelStyleId =
    phase === 'garage' && previewWheelStyle
      ? previewWheelStyle
      : equippedWheel.style;
  const inspectedWheelSpec =
    WHEEL_STYLES.find((w) => w.id === inspectedWheelStyle) || WHEEL_STYLES[0];
  const activeWheelColorOpt =
    WHEEL_COLORS.find((c) => c.id === equippedWheel.color) || WHEEL_COLORS[0];
  const activeNitroDurationSec = getNitroDurationSec(activeUpgrades.nitroTank);
  const activeTuningClass = getTuningClassForUpgrades(activeUpgrades);
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
          {phase === 'garage' ? (
            <div className="pointer-events-auto flex min-w-0 items-center gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={onReturnMenu}
                onPointerDown={(e) => e.stopPropagation()}
                className="flex h-11 items-center gap-1.5 rounded-xl border border-white/14 bg-zinc-950/90 px-3.5 text-sm font-bold text-zinc-100 transition-colors hover:bg-zinc-900 cursor-pointer whitespace-nowrap shrink-0 shadow-lg"
              >
                <ArrowLeft className="h-4.5 w-4.5 text-amber-400 shrink-0" />
                <span>Geri</span>
              </button>
              <div className="hidden sm:flex flex-col min-w-0">
                <span className="font-display text-base font-bold tracking-tight text-white">
                  3D Garaj
                </span>
                <span className="text-[11px] text-zinc-400">
                  İncelemek için aracı sürükle
                </span>
              </div>
            </div>
          ) : phase !== 'menu' ? (
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
            {(phase === 'menu' || phase === 'garage') && (
              <button
                type="button"
                onClick={() => onOpenStore('gold')}
                onPointerDown={(e) => e.stopPropagation()}
                title="Altın ve Sandık Marketini Aç"
                className="group flex h-11 items-center gap-1.5 rounded-xl border border-amber-400/40 bg-zinc-950/90 pl-2.5 pr-1.5 sm:pl-3 sm:pr-2 text-xs sm:text-sm font-bold text-amber-300 font-mono-num transition-colors hover:border-amber-400/70 hover:bg-zinc-900 cursor-pointer shadow-lg"
              >
                <Coins className="h-4 w-4 text-amber-400 shrink-0" />
                <span>{goldCoins.toLocaleString('tr-TR')}</span>
                <span className="ml-0.5 flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500 text-zinc-950 transition-colors group-hover:bg-amber-400 shrink-0">
                  <Plus className="h-3.5 w-3.5 stroke-[3]" />
                </span>
              </button>
            )}

            {phase === 'garage' && (
              <button
                type="button"
                onClick={onToggleGarageMenu}
                onPointerDown={(e) => e.stopPropagation()}
                aria-label={garageMenuCollapsed ? 'Paneli Göster' : 'Paneli Gizle'}
                className="flex h-11 items-center gap-1.5 rounded-xl border border-white/14 bg-zinc-950/90 px-3 text-xs sm:text-sm font-bold text-zinc-100 transition-colors hover:bg-zinc-900 cursor-pointer whitespace-nowrap shadow-lg"
              >
                {garageMenuCollapsed ? (
                  <Eye className="h-4 w-4 text-amber-400 shrink-0" />
                ) : (
                  <EyeOff className="h-4 w-4 text-amber-400 shrink-0" />
                )}
                <span>{garageMenuCollapsed ? 'Göster' : 'Gizle'}</span>
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

      {/* 3D GARAGE — Collapsed Mini Dock */}
      {phase === 'garage' && garageMenuCollapsed && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="pointer-events-auto mx-auto mb-4 flex w-[min(94vw,460px)] items-center justify-between gap-2 rounded-2xl border border-white/12 bg-zinc-950/92 px-3.5 py-2.5 shadow-2xl"
          style={{ marginBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          <button
            type="button"
            onClick={onToggleGarageMenu}
            className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-white/12 bg-zinc-900 px-3.5 text-xs font-semibold text-zinc-100 hover:bg-zinc-800 whitespace-nowrap cursor-pointer"
          >
            <Eye className="h-4 w-4 text-amber-400 shrink-0" />
            <span>Panel</span>
          </button>

          <span className="truncate font-display text-sm font-bold text-white">
            {activeModel.name}
          </span>

          {isActiveUnlocked ? (
            <button
              type="button"
              onClick={onStart}
              className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-4 font-display text-xs font-bold text-zinc-950 hover:bg-amber-400 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Sür</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => onRentCar(activeModel.id, activeModel.name)}
                className="flex min-h-[44px] items-center justify-center gap-1 rounded-xl border border-sky-400/50 bg-sky-500/20 px-3 font-display text-xs font-bold text-sky-200 hover:bg-sky-500/30 whitespace-nowrap cursor-pointer"
              >
                <PlayCircle className="h-3.5 w-3.5 text-sky-400" />
                <span>Kirala</span>
              </button>
              <button
                type="button"
                onClick={() => onUnlockCar(activeModel.id)}
                disabled={!canAffordActive}
                className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl px-3.5 font-display text-xs font-bold whitespace-nowrap ${
                  canAffordActive
                    ? 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400 cursor-pointer'
                    : 'border border-white/12 bg-zinc-900 text-zinc-400 cursor-not-allowed'
                }`}
              >
                {canAffordActive ? (
                  <Unlock className="h-3.5 w-3.5" />
                ) : (
                  <Lock className="h-3.5 w-3.5 text-amber-400" />
                )}
                <span>{activeModel.priceGold}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 3D GARAGE — Unobstructed Right Side Showroom Drawer (md+) & Spacious Mobile Showroom Bottom Sheet (<md) */}
      {phase === 'garage' && !garageMenuCollapsed && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="pointer-events-auto mx-auto w-full md:fixed md:right-3 md:top-[68px] md:bottom-3 md:z-20 md:mx-0 md:w-[324px] lg:w-[348px]"
        >
          <div
            className="animate-sheet-up flex h-[58dvh] max-h-[58dvh] flex-col gap-2 overflow-hidden rounded-t-3xl border-t border-white/14 bg-zinc-950/96 px-3.5 pt-2 shadow-2xl md:h-full md:max-h-none md:gap-2.5 md:rounded-2xl md:border md:p-3"
            style={{
              paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
            }}
          >
            {/* Mobile drag handle indicator */}
            <div className="flex shrink-0 justify-center md:hidden">
              <span className="h-1 w-10 rounded-full bg-white/20" />
            </div>

            {/* Car Switcher + 4-Stat Micro Bars (Visible on BOTH mobile & desktop) */}
            <div className="flex shrink-0 flex-col gap-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    const idx = CAR_MODELS.findIndex((m) => m.id === carModel);
                    const prev =
                      CAR_MODELS[
                        (idx - 1 + CAR_MODELS.length) % CAR_MODELS.length
                      ];
                    onSelectModel(prev.id);
                  }}
                  aria-label="Önceki Araç"
                  className="flex h-11 w-11 md:h-9 md:w-9 items-center justify-center rounded-xl border border-white/14 bg-zinc-900 text-zinc-100 hover:bg-zinc-800 cursor-pointer shrink-0"
                >
                  <ChevronLeft className="h-5 w-5 md:h-4 md:w-4" />
                </button>

                <div className="min-w-0 flex-1 text-center md:text-left">
                  <div className="flex flex-wrap items-center justify-center gap-1.5 md:justify-start">
                    <h2 className="truncate font-display text-base font-extrabold text-white">
                      {activeModel.name}
                    </h2>
                    <span
                      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider shrink-0 ${ITEM_RARITY_META[activeModel.rarity].badgeClass}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${ITEM_RARITY_META[activeModel.rarity].dotClass}`}
                      />
                      <span>{ITEM_RARITY_META[activeModel.rarity].label}</span>
                    </span>
                    {!isActiveUnlocked && (
                      <span className="inline-flex items-center gap-1 rounded-md border border-amber-400/30 bg-amber-500/12 px-1.5 py-0.5 text-xs font-bold text-amber-300 font-mono-num shrink-0">
                        <Lock className="h-3 w-3" />
                        <span>{activeModel.priceGold}</span>
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-zinc-400">
                    {activeModel.tagline}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const idx = CAR_MODELS.findIndex((m) => m.id === carModel);
                    const next = CAR_MODELS[(idx + 1) % CAR_MODELS.length];
                    onSelectModel(next.id);
                  }}
                  aria-label="Sonraki Araç"
                  className="flex h-11 w-11 md:h-9 md:w-9 items-center justify-center rounded-xl border border-white/14 bg-zinc-900 text-zinc-100 hover:bg-zinc-800 cursor-pointer shrink-0"
                >
                  <ChevronRight className="h-5 w-5 md:h-4 md:w-4" />
                </button>
              </div>

              {/* Compact 4-Metric Strip (Now visible on mobile AND desktop!) */}
              <div className="grid grid-cols-4 gap-2">
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[11px] font-semibold text-zinc-400">
                    <span>Hız</span>
                    <span className="font-mono-num text-zinc-100">
                      {Math.min(
                        12,
                        Number(
                          (
                            activeModel.speedRating +
                            activeUpgrades.engine * 0.5 +
                            inspectedWheelSpec.speedRatingBonus +
                            inspectedKitSpec.speedRatingBonus +
                            inspectedSpoilerSpec.speedRatingBonus
                          ).toFixed(1),
                        ),
                      )}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/12">
                    <div
                      className="h-full bg-amber-400 transition-all duration-150"
                      style={{
                        width: `${Math.min(100, (activeModel.speedRating + activeUpgrades.engine * 0.5 + inspectedWheelSpec.speedRatingBonus + inspectedKitSpec.speedRatingBonus + inspectedSpoilerSpec.speedRatingBonus) * 10)}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[11px] font-semibold text-zinc-400">
                    <span>Tutuş</span>
                    <span className="font-mono-num text-zinc-100">
                      {Math.min(
                        12,
                        Number(
                          (
                            activeModel.handlingRating +
                            activeUpgrades.tires * 0.5 +
                            inspectedWheelSpec.handlingRatingBonus +
                            inspectedKitSpec.handlingRatingBonus +
                            inspectedSpoilerSpec.handlingRatingBonus
                          ).toFixed(1),
                        ),
                      )}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/12">
                    <div
                      className="h-full bg-sky-400 transition-all duration-150"
                      style={{
                        width: `${Math.min(100, (activeModel.handlingRating + activeUpgrades.tires * 0.5 + inspectedWheelSpec.handlingRatingBonus + inspectedKitSpec.handlingRatingBonus + inspectedSpoilerSpec.handlingRatingBonus) * 10)}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[11px] font-semibold text-zinc-400">
                    <span>Nitro Süresi</span>
                    <span className="font-mono-num text-cyan-300">
                      {activeNitroDurationSec} sn
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/12">
                    <div
                      className="h-full bg-cyan-400"
                      style={{
                        width: `${Math.min(100, 36 + activeUpgrades.nitroTank * 8 + activeUpgrades.nitroPower * 8)}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[11px] font-semibold text-zinc-400">
                    <span>Gövde</span>
                    <span className="font-mono-num text-zinc-100">
                      {activeModel.maxIntegrity}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/12">
                    <div
                      className="h-full bg-emerald-400"
                      style={{
                        width: `${Math.min(100, Math.round((activeModel.maxIntegrity / 160) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 6 Clean Focused Showroom Tabs — 3×2 Grid on Mobile (Zero horizontal scroll), 6-Col Grid on Desktop */}
            <div className="grid shrink-0 grid-cols-3 gap-1 rounded-xl bg-zinc-900/90 p-1 md:grid-cols-6 md:gap-0.5">
              <button
                type="button"
                onClick={() => {
                  setPreviewWheelStyle(null);
                  setPreviewCustom(null);
                  onPreviewWheel(equippedWheel.style, equippedWheel.color);
                  onPreviewCustom(equippedCustom);
                  setGarageTab('models');
                  onGarageCameraFocus('overview');
                }}
                className={`flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-bold whitespace-nowrap transition-colors cursor-pointer md:min-h-[42px] md:flex-col md:gap-0.5 md:px-0.5 md:text-[10px] ${
                  garageTab === 'models'
                    ? 'bg-zinc-100 text-zinc-950'
                    : 'text-zinc-300 hover:text-white'
                }`}
              >
                <CarFront className="h-3.5 w-3.5 shrink-0" />
                <span>Modeller</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPreviewWheelStyle(null);
                  setPreviewCustom(null);
                  onPreviewWheel(equippedWheel.style, equippedWheel.color);
                  onPreviewCustom(equippedCustom);
                  setGarageTab('upgrades');
                  onGarageCameraFocus('overview');
                }}
                className={`flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-bold whitespace-nowrap transition-colors cursor-pointer md:min-h-[42px] md:flex-col md:gap-0.5 md:px-0.5 md:text-[10px] ${
                  garageTab === 'upgrades'
                    ? 'bg-amber-500 text-zinc-950'
                    : 'text-zinc-300 hover:text-white'
                }`}
              >
                <Wrench className="h-3.5 w-3.5 shrink-0" />
                <span>Yükselt</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPreviewWheelStyle(null);
                  setPreviewCustom(null);
                  onPreviewWheel(equippedWheel.style, equippedWheel.color);
                  onPreviewCustom(equippedCustom);
                  setGarageTab('powerups');
                  onGarageCameraFocus('overview');
                }}
                className={`flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-bold whitespace-nowrap transition-colors cursor-pointer md:min-h-[42px] md:flex-col md:gap-0.5 md:px-0.5 md:text-[10px] ${
                  garageTab === 'powerups'
                    ? 'bg-orange-500 text-zinc-950'
                    : 'text-zinc-300 hover:text-white'
                }`}
              >
                <Zap className="h-3.5 w-3.5 shrink-0" />
                <span>Güçler</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPreviewWheelStyle(null);
                  onPreviewWheel(equippedWheel.style, equippedWheel.color);
                  setGarageTab('body');
                  onGarageCameraFocus(
                    bodySubTab === 'spoiler'
                      ? 'spoiler'
                      : bodySubTab === 'hat'
                        ? 'roof'
                        : bodySubTab === 'steering'
                          ? 'steering'
                          : bodySubTab === 'mirror'
                            ? 'mirror'
                            : 'bodykit',
                  );
                }}
                className={`flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-bold whitespace-nowrap transition-colors cursor-pointer md:min-h-[42px] md:flex-col md:gap-0.5 md:px-0.5 md:text-[10px] ${
                  garageTab === 'body'
                    ? 'bg-amber-500 text-zinc-950'
                    : 'text-zinc-300 hover:text-white'
                }`}
              >
                <Layers className="h-3.5 w-3.5 shrink-0" />
                <span>Aksesuar</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPreviewCustom(null);
                  onPreviewCustom(equippedCustom);
                  setGarageTab('wheels');
                  onGarageCameraFocus('wheels');
                }}
                className={`flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-bold whitespace-nowrap transition-colors cursor-pointer md:min-h-[42px] md:flex-col md:gap-0.5 md:px-0.5 md:text-[10px] ${
                  garageTab === 'wheels'
                    ? 'bg-amber-500 text-zinc-950'
                    : 'text-zinc-300 hover:text-white'
                }`}
              >
                <Disc3 className="h-3.5 w-3.5 shrink-0" />
                <span>Tekerlek</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPreviewWheelStyle(null);
                  setPreviewCustom(null);
                  onPreviewWheel(equippedWheel.style, equippedWheel.color);
                  onPreviewCustom(equippedCustom);
                  setGarageTab('style');
                  onGarageCameraFocus(
                    styleSubTab === 'livery'
                      ? 'livery'
                      : styleSubTab === 'neon'
                        ? 'neon'
                        : styleSubTab === 'headlight'
                          ? 'headlight'
                          : styleSubTab === 'plate'
                            ? 'plate'
                            : styleSubTab === 'fx'
                              ? fxMode === 'nitro'
                                ? 'exhaust'
                                : 'smoke'
                              : 'overview',
                  );
                }}
                className={`flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-bold whitespace-nowrap transition-colors cursor-pointer md:min-h-[42px] md:flex-col md:gap-0.5 md:px-0.5 md:text-[10px] ${
                  garageTab === 'style'
                    ? 'bg-zinc-100 text-zinc-950'
                    : 'text-zinc-300 hover:text-white'
                }`}
              >
                <Palette className="h-3.5 w-3.5 shrink-0" />
                <span>Stil</span>
              </button>
            </div>

            {/* Scrollable Active Tab Body — Pure Vertical Scroll Only (Zero nested horizontal scrolling!) */}
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scroll pr-0.5">
            {garageTab === 'models' && (
              <div className="grid grid-cols-2 gap-2">
                {CAR_MODELS.map((m) => {
                  const active = m.id === carModel;
                  const isUnlocked = unlockedCars.includes(m.id);
                  const rMeta = ITEM_RARITY_META[m.rarity];
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => onSelectModel(m.id)}
                      className={`relative flex min-h-[66px] flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border px-3 pt-3 pb-2.5 text-xs font-bold transition-colors cursor-pointer ${getRarityCardClass(m.rarity, active, isUnlocked)}`}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none absolute inset-x-0 top-0 h-[2.5px] ${rMeta.barClass}`}
                      />
                      <span className="w-full truncate text-center font-display text-xs font-extrabold">
                        {m.name}
                      </span>
                      <div className="flex items-center justify-center gap-1.5">
                        <RarityLabel rarity={m.rarity} selected={active} compact />
                        <span
                          aria-hidden="true"
                          className={active ? 'text-zinc-400' : 'text-zinc-600'}
                        >
                          ·
                        </span>
                        <span
                          className={`text-[11px] font-mono-num font-bold ${
                            active
                              ? isUnlocked
                                ? 'text-zinc-700'
                                : 'text-amber-700'
                              : isUnlocked
                                ? 'text-emerald-400'
                                : 'text-amber-400'
                          }`}
                        >
                          {isUnlocked ? 'Garajda' : `${m.priceGold} Altın`}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {garageTab === 'upgrades' && (
              <div className="flex flex-col gap-2">
                {/* Vehicle Overall Tuning Level Strip */}
                <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-zinc-900/65 px-3 py-2">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="font-semibold text-zinc-300 whitespace-nowrap">
                      Modifiye Sınıfı
                    </span>
                    <span aria-hidden="true" className="text-zinc-600">
                      ·
                    </span>
                    <span
                      className={`font-display font-extrabold whitespace-nowrap ${activeTuningClass.textClass}`}
                    >
                      {activeTuningClass.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="hidden sm:grid gap-0.5 w-28"
                      style={{
                        gridTemplateColumns: `repeat(${activeTuningClass.max}, minmax(0, 1fr))`,
                      }}
                    >
                      {Array.from({ length: activeTuningClass.max }).map(
                        (_, idx) => (
                          <div
                            key={idx}
                            className={`h-1.5 rounded-[1px] ${
                              idx < activeTuningClass.total
                                ? activeTuningClass.barClass
                                : 'bg-white/10'
                            }`}
                          />
                        ),
                      )}
                    </div>
                    <span className="font-mono-num text-xs font-bold text-zinc-200 whitespace-nowrap">
                      {activeTuningClass.total}/{activeTuningClass.max}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {UPGRADE_SPECS.map((spec) => {
                    const level = activeUpgrades[spec.key];
                    const isMax = level >= MAX_UPGRADE_LEVEL;
                    const cost = isMax ? 0 : UPGRADE_COSTS[level];
                    const canAfford = !isMax && goldCoins >= cost;

                    const partStyle =
                      spec.key === 'engine'
                        ? {
                            icon: (
                              <Gauge className="h-4 w-4 text-amber-400 shrink-0" />
                            ),
                            border:
                              level > 0
                                ? 'border-amber-400/25'
                                : 'border-white/10',
                          }
                        : spec.key === 'tires'
                          ? {
                              icon: (
                                <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                              ),
                              border:
                                level > 0
                                  ? 'border-emerald-400/25'
                                  : 'border-white/10',
                            }
                          : spec.key === 'nitroTank'
                            ? {
                                icon: (
                                  <Fuel className="h-4 w-4 text-cyan-400 shrink-0" />
                                ),
                                border:
                                  level > 0
                                    ? 'border-cyan-400/25'
                                    : 'border-white/10',
                              }
                            : {
                                icon: (
                                  <Flame className="h-4 w-4 text-violet-400 shrink-0" />
                                ),
                                border:
                                  level > 0
                                    ? 'border-violet-400/25'
                                    : 'border-white/10',
                              };

                    return (
                      <div
                        key={spec.key}
                        className={`flex flex-col justify-between gap-2 rounded-xl border ${partStyle.border} bg-zinc-900/85 p-3`}
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="inline-flex items-center gap-1.5 font-display text-xs sm:text-sm font-bold text-white truncate">
                            {partStyle.icon}
                            <span className="truncate">{spec.label}</span>
                          </span>
                          <span className="text-[11px] font-mono-num text-zinc-400 shrink-0">
                            {spec.bonusPerLevel}
                          </span>
                        </div>

                        <UpgradeLevelMeter part={spec.key} level={level} />

                        {!isActiveUnlocked ? (
                          <div className="flex min-h-[40px] items-center justify-center rounded-lg bg-zinc-950/60 px-2 text-xs text-zinc-500">
                            Önce aracı aç
                          </div>
                        ) : isMax ? (
                          <div className="flex min-h-[40px] items-center justify-center gap-1 rounded-lg bg-emerald-500/12 px-2 text-xs font-bold text-emerald-300">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>Maksimum</span>
                          </div>
                        ) : canAfford ? (
                          <button
                            type="button"
                            onClick={() =>
                              onUpgradePart(activeModel.id, spec.key)
                            }
                            className="flex min-h-[42px] items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-3 text-xs sm:text-sm font-extrabold text-zinc-950 hover:bg-amber-400 cursor-pointer"
                          >
                            <Coins className="h-4 w-4 shrink-0" />
                            <span className="font-mono-num">{cost} Altın</span>
                          </button>
                        ) : (
                          (() => {
                            const missing = Math.max(1, cost - goldCoins);
                            const topUp = missing <= 80 ? missing : 75;
                            return (
                              <button
                                type="button"
                                onClick={() =>
                                  onWatchAdTopUpGold(
                                    topUp,
                                    `${activeModel.name} · ${spec.label}`,
                                  )
                                }
                                className="flex min-h-[42px] items-center justify-center gap-1.5 rounded-lg border border-sky-400/40 bg-sky-500/15 px-2.5 text-xs font-bold text-sky-200 hover:bg-sky-500/25 cursor-pointer"
                              >
                                <PlayCircle className="h-4 w-4 text-sky-400 shrink-0" />
                                <span className="font-mono-num">
                                  Eksik {missing} · +{topUp} Al
                                </span>
                              </button>
                            );
                          })()
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {garageTab === 'powerups' && (() => {
              const unlockedPowerUpCount = POWERUP_SPECS.filter(
                (spec) => playerLevel.level >= spec.unlockLevel,
              ).length;
              return (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-zinc-900/60 px-2.5 py-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] sm:text-xs">
                      <Zap className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                      <span className="font-semibold text-zinc-200 whitespace-nowrap">
                        Otoyol Güçleri
                      </span>
                      <span aria-hidden="true" className="text-zinc-600">
                        ·
                      </span>
                      <span className="font-mono-num font-bold text-amber-300 whitespace-nowrap">
                        Sv.{playerLevel.level}
                      </span>
                    </div>
                    <span className="font-mono-num text-[11px] font-bold text-zinc-300 whitespace-nowrap">
                      {unlockedPowerUpCount}/{POWERUP_SPECS.length} Açık
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {POWERUP_SPECS.map((spec) => {
                      const unlocked = playerLevel.level >= spec.unlockLevel;
                      const levels = powerUpUpgrades[spec.id] || {
                        primary: 0,
                        secondary: 0,
                      };
                      const levelProgressRatio = Math.min(
                        1,
                        playerLevel.level / Math.max(1, spec.unlockLevel),
                      );
                      const icon =
                        spec.id === 'nitro' ? (
                          <Flame className="h-4.5 w-4.5 text-cyan-400 shrink-0" />
                        ) : spec.id === 'repair' ? (
                          <HeartPulse className="h-4.5 w-4.5 text-emerald-400 shrink-0" />
                        ) : spec.id === 'magnet' ? (
                          <Magnet className="h-4.5 w-4.5 text-rose-400 shrink-0" />
                        ) : (
                          <Zap className="h-4.5 w-4.5 fill-orange-400 text-orange-300 shrink-0" />
                        );

                      const tracks = spec.secondary
                        ? [spec.primary, spec.secondary]
                        : [spec.primary];

                      return (
                        <div
                          key={spec.id}
                          className={`flex flex-col gap-2.5 rounded-xl border p-3 ${
                            unlocked
                              ? `${spec.accentBorderClass} bg-zinc-900/85`
                              : 'border-white/8 bg-zinc-900/45'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {icon}
                              <div className="min-w-0">
                                <div className="truncate font-display text-sm font-bold text-white">
                                  {spec.name}
                                </div>
                                <div className="text-[11px] leading-snug text-zinc-400 line-clamp-2">
                                  {spec.description}
                                </div>
                              </div>
                            </div>
                            <span
                              className={`shrink-0 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold font-mono-num whitespace-nowrap ${
                                unlocked
                                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/30'
                                  : 'bg-zinc-950/80 text-amber-300 border border-amber-400/25'
                              }`}
                            >
                              {unlocked ? (
                                <>
                                  <Unlock className="h-3 w-3" />
                                  <span>Yolda Açık</span>
                                </>
                              ) : (
                                <>
                                  <Lock className="h-3 w-3" />
                                  <span>Sv.{spec.unlockLevel}</span>
                                </>
                              )}
                            </span>
                          </div>

                          {!unlocked ? (
                            <div className="flex flex-col gap-1.5 rounded-lg border border-white/8 bg-zinc-950/65 px-2.5 py-2">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-semibold text-zinc-300">
                                  Seviye {spec.unlockLevel} olunca yolda çıkar
                                </span>
                                <span className="font-mono-num font-bold text-amber-300">
                                  Sv.{playerLevel.level}/{spec.unlockLevel}
                                </span>
                              </div>
                              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                                <div
                                  className={`h-full transition-all duration-300 ${spec.accentBgClass}`}
                                  style={{
                                    width: `${Math.max(4, Math.round(levelProgressRatio * 100))}%`,
                                  }}
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => onOpenLevelRoad(spec.unlockLevel)}
                                className="mt-1 flex min-h-[34px] w-full items-center justify-center gap-1.5 rounded-lg border border-amber-400/40 bg-amber-500/15 px-2.5 text-[11px] font-extrabold text-amber-200 transition-colors hover:bg-amber-500/25 cursor-pointer"
                              >
                                <Gift className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                                <span>Seviye {spec.unlockLevel} Yolunu Gör</span>
                                <ChevronRight className="h-3.5 w-3.5 text-amber-300 shrink-0" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-2">
                              {tracks.map((trackSpec) => {
                                const lvl = levels[trackSpec.key];
                                const isMax = lvl >= MAX_POWERUP_UPGRADE_LEVEL;
                                const cost = isMax ? 0 : spec.costs[lvl];
                                const canAfford = !isMax && goldCoins >= cost;
                                const currentVal = trackSpec.formatValue(lvl);
                                const nextVal = isMax
                                  ? null
                                  : trackSpec.formatValue(lvl + 1);

                                return (
                                  <div
                                    key={trackSpec.key}
                                    className="flex flex-col gap-1.5 rounded-lg border border-white/8 bg-zinc-950/60 px-2.5 py-2"
                                  >
                                    <div className="flex items-center justify-between gap-1.5 text-xs">
                                      <span className="font-semibold text-zinc-200 truncate">
                                        {trackSpec.label}
                                      </span>
                                      <span className="font-mono-num font-bold whitespace-nowrap">
                                        <span className={spec.accentTextClass}>
                                          {currentVal}
                                        </span>
                                        {nextVal && (
                                          <span className="text-zinc-400">
                                            {' → '}
                                            <span className="text-white">
                                              {nextVal}
                                            </span>
                                          </span>
                                        )}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <div className="grid flex-1 grid-cols-5 gap-1">
                                        {Array.from({
                                          length: MAX_POWERUP_UPGRADE_LEVEL,
                                        }).map((_, segIdx) => (
                                          <div
                                            key={segIdx}
                                            className={`h-1.5 rounded-sm ${
                                              segIdx < lvl
                                                ? spec.accentBgClass
                                                : 'bg-white/10'
                                            }`}
                                          />
                                        ))}
                                      </div>
                                      <span className="font-mono-num text-[11px] font-bold text-zinc-400 shrink-0">
                                        {lvl}/{MAX_POWERUP_UPGRADE_LEVEL}
                                      </span>
                                    </div>

                                    {isMax ? (
                                      <div className="flex min-h-[38px] items-center justify-center gap-1 rounded-lg bg-emerald-500/12 px-2 text-xs font-bold text-emerald-300">
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        <span>Maksimum</span>
                                      </div>
                                    ) : canAfford ? (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          onUpgradePowerUp(
                                            spec.id,
                                            trackSpec.key,
                                          )
                                        }
                                        className="flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-3 text-xs font-extrabold text-zinc-950 hover:bg-amber-400 cursor-pointer"
                                      >
                                        <Coins className="h-3.5 w-3.5 shrink-0" />
                                        <span className="font-mono-num">
                                          Geliştir · {cost} Altın
                                        </span>
                                      </button>
                                    ) : (
                                      (() => {
                                        const missing = Math.max(
                                          1,
                                          cost - goldCoins,
                                        );
                                        const topUp =
                                          missing <= 80 ? missing : 75;
                                        return (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              onWatchAdTopUpGold(
                                                topUp,
                                                `${spec.shortName} · ${trackSpec.label}`,
                                              )
                                            }
                                            className="flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg border border-sky-400/35 bg-sky-500/15 px-2.5 text-xs font-bold text-sky-200 hover:bg-sky-500/25 cursor-pointer"
                                          >
                                            <PlayCircle className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                                            <span className="font-mono-num">
                                              {cost} Altın · Eksik {missing} (+{topUp})
                                            </span>
                                          </button>
                                        );
                                      })()
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {garageTab === 'body' && (() => {
              const selectBodySubTab = (
                nextTab: 'kit' | 'spoiler' | 'hat' | 'steering' | 'mirror',
                focus: GarageCameraFocus,
              ) => {
                setPreviewCustom(null);
                onPreviewCustom(equippedCustom);
                setBodySubTab(nextTab);
                onGarageCameraFocus(focus);
              };

              const handleSelectAccessory = (
                category: 'roofHat' | 'steeringWheel' | 'mirrorCharm',
                itemId: string,
                unlockedList: string[],
                focus: GarageCameraFocus,
              ) => {
                onGarageCameraFocus(focus);
                if (unlockedList.includes(itemId)) {
                  setPreviewCustom((prev) => {
                    if (!prev) return null;
                    const next = { ...prev };
                    delete next[category];
                    return next;
                  });
                  onEquipVisualItem(activeModel.id, category, itemId);
                } else {
                  const nextPreview: CarCustomConfig = {
                    ...inspectedCustom,
                    [category]: itemId,
                  };
                  setPreviewCustom(nextPreview);
                  onPreviewCustom(nextPreview);
                }
              };

              const renderCockpitPreviewBanner = (hintText: string) => (
                <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-zinc-900/75 px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Camera className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    <span className="truncate text-[11px] font-medium text-zinc-300">
                      {hintText}
                    </span>
                  </div>
                  {cameraMode === 'cockpit' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 whitespace-nowrap shrink-0">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Kokpit Aktif</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSelectCamera('cockpit')}
                      className="inline-flex min-h-[32px] items-center gap-1 rounded-lg bg-amber-500/20 border border-amber-400/40 px-2.5 text-[11px] font-bold text-amber-200 hover:bg-amber-500/30 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <span>Kokpiti Seç</span>
                    </button>
                  )}
                </div>
              );

              return (
              <div className="flex flex-col gap-2">
                {/* Sub-switcher: Exterior & Interior Accessories (2 balanced rows, zero horizontal scroll) */}
                <div className="grid grid-cols-6 gap-1 rounded-xl border border-white/10 bg-zinc-900/70 p-1">
                  <button
                    type="button"
                    onClick={() => selectBodySubTab('kit', 'bodykit')}
                    className={`col-span-2 min-h-[38px] rounded-lg px-1.5 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                      bodySubTab === 'kit'
                        ? 'bg-zinc-100 text-zinc-950'
                        : 'text-zinc-300 hover:text-white'
                    }`}
                  >
                    Gövde Kiti
                  </button>
                  <button
                    type="button"
                    onClick={() => selectBodySubTab('spoiler', 'spoiler')}
                    className={`col-span-2 min-h-[38px] rounded-lg px-1.5 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                      bodySubTab === 'spoiler'
                        ? 'bg-zinc-100 text-zinc-950'
                        : 'text-zinc-300 hover:text-white'
                    }`}
                  >
                    Rüzgarlık
                  </button>
                  <button
                    type="button"
                    onClick={() => selectBodySubTab('hat', 'roof')}
                    className={`col-span-2 min-h-[38px] rounded-lg px-1.5 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                      bodySubTab === 'hat'
                        ? 'bg-amber-400 text-zinc-950'
                        : 'text-zinc-300 hover:text-white'
                    }`}
                  >
                    Şapka
                  </button>
                  <button
                    type="button"
                    onClick={() => selectBodySubTab('steering', 'steering')}
                    className={`col-span-3 min-h-[38px] rounded-lg px-1.5 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                      bodySubTab === 'steering'
                        ? 'bg-amber-400 text-zinc-950'
                        : 'text-zinc-300 hover:text-white'
                    }`}
                  >
                    Direksiyon
                  </button>
                  <button
                    type="button"
                    onClick={() => selectBodySubTab('mirror', 'mirror')}
                    className={`col-span-3 min-h-[38px] rounded-lg px-1.5 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                      bodySubTab === 'mirror'
                        ? 'bg-amber-400 text-zinc-950'
                        : 'text-zinc-300 hover:text-white'
                    }`}
                  >
                    Ayna Süsü
                  </button>
                </div>

                {bodySubTab === 'kit' && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      {BODY_KITS.map((k) => {
                        const isUnlocked = unlockedBodyKits.includes(k.id);
                        const isEquipped = equippedCustom.bodyKit === k.id;
                        const isSelected = inspectedCustom.bodyKit === k.id;
                        return (
                          <button
                            key={k.id}
                            type="button"
                            onClick={() => {
                              onGarageCameraFocus('bodykit');
                              if (isUnlocked) {
                                setPreviewCustom((prev) =>
                                  prev ? { ...prev, bodyKit: undefined } : null,
                                );
                                onEquipBodyKit(activeModel.id, k.id);
                              } else {
                                const nextPreview = {
                                  ...inspectedCustom,
                                  bodyKit: k.id,
                                };
                                setPreviewCustom(nextPreview);
                                onPreviewCustom(nextPreview);
                              }
                            }}
                            className={`relative flex min-h-[76px] flex-col items-start justify-between gap-1 overflow-hidden rounded-xl border px-3 pt-3 pb-2.5 text-left transition-colors cursor-pointer ${getRarityCardClass(k.rarity, isSelected, isUnlocked)}`}
                          >
                            <span
                              aria-hidden="true"
                              className={`pointer-events-none absolute inset-x-0 top-0 h-[2.5px] ${ITEM_RARITY_META[k.rarity].barClass}`}
                            />
                            <div className="flex w-full items-center justify-between gap-1.5 min-w-0">
                              <span className="truncate font-display text-xs font-extrabold">
                                {k.name}
                              </span>
                              <RarityLabel
                                rarity={k.rarity}
                                selected={isSelected}
                                compact
                              />
                            </div>
                            <span
                              className={`text-[11px] leading-tight ${
                                isSelected ? 'text-zinc-600' : 'text-zinc-400'
                              }`}
                            >
                              {k.effectLabel}
                            </span>
                            <div className="flex w-full items-center justify-between gap-1">
                              <span
                                className={`text-[11px] font-bold font-mono-num ${
                                  isSelected
                                    ? isEquipped
                                      ? 'text-emerald-700'
                                      : isUnlocked
                                        ? 'text-zinc-700'
                                        : 'text-amber-700'
                                    : isEquipped
                                      ? 'text-emerald-400'
                                      : isUnlocked
                                        ? 'text-zinc-400'
                                        : 'text-amber-400'
                                }`}
                              >
                                {isEquipped
                                  ? 'Takılı'
                                  : isUnlocked
                                    ? 'Garajda'
                                    : `${k.priceGold} Altın`}
                              </span>
                              {k.animated && (
                                <span
                                  className={`text-[10px] font-bold ${
                                    isSelected
                                      ? 'text-amber-700'
                                      : 'text-amber-300/90'
                                  }`}
                                >
                                  Hareketli
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {!unlockedBodyKits.includes(inspectedCustom.bodyKit) && (
                      <div className="sticky bottom-0 z-10 flex items-center justify-between gap-2 rounded-xl border border-amber-400/35 bg-zinc-900/95 px-3 py-2.5 shadow-[0_-8px_20px_rgba(9,9,11,0.9)]">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="truncate font-display text-xs font-bold text-white">
                              {inspectedKitSpec.name}
                            </span>
                            <RarityLabel rarity={inspectedKitSpec.rarity} compact />
                          </div>
                          <div className="truncate text-[11px] text-zinc-400">
                            {inspectedKitSpec.effectLabel} · Tüm araçlarda geçerli
                          </div>
                        </div>
                        {goldCoins >= inspectedKitSpec.priceGold ? (
                          <button
                            type="button"
                            onClick={() => {
                              onUnlockBodyKit(
                                inspectedCustom.bodyKit,
                                activeModel.id,
                              );
                              setPreviewCustom(null);
                            }}
                            className="flex min-h-[42px] items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 font-display text-xs font-extrabold text-zinc-950 hover:bg-emerald-400 whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            <Unlock className="h-3.5 w-3.5" />
                            <span className="font-mono-num">
                              Aç · {inspectedKitSpec.priceGold}
                            </span>
                          </button>
                        ) : (
                          (() => {
                            const missing = Math.max(
                              1,
                              inspectedKitSpec.priceGold - goldCoins,
                            );
                            const topUp = missing <= 80 ? missing : 75;
                            return (
                              <button
                                type="button"
                                onClick={() =>
                                  onWatchAdTopUpGold(topUp, inspectedKitSpec.name)
                                }
                                className="flex min-h-[42px] items-center gap-1.5 rounded-lg border border-sky-400/40 bg-sky-500/15 px-3 text-xs font-bold text-sky-200 hover:bg-sky-500/25 whitespace-nowrap shrink-0 cursor-pointer"
                              >
                                <PlayCircle className="h-3.5 w-3.5 text-sky-400" />
                                <span className="font-mono-num">
                                  Eksik {missing} · +{topUp} Al
                                </span>
                              </button>
                            );
                          })()
                        )}
                      </div>
                    )}
                  </>
                )}

                {bodySubTab === 'spoiler' && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      {SPOILERS.map((s) => {
                        const isUnlocked = unlockedSpoilers.includes(s.id);
                        const isEquipped = equippedCustom.spoiler === s.id;
                        const isSelected = inspectedCustom.spoiler === s.id;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              onGarageCameraFocus('spoiler');
                              if (isUnlocked) {
                                setPreviewCustom((prev) =>
                                  prev ? { ...prev, spoiler: undefined } : null,
                                );
                                onEquipSpoiler(activeModel.id, s.id);
                              } else {
                                const nextPreview = {
                                  ...inspectedCustom,
                                  spoiler: s.id,
                                };
                                setPreviewCustom(nextPreview);
                                onPreviewCustom(nextPreview);
                              }
                            }}
                            className={`relative flex min-h-[76px] flex-col items-start justify-between gap-1 overflow-hidden rounded-xl border px-3 pt-3 pb-2.5 text-left transition-colors cursor-pointer ${getRarityCardClass(s.rarity, isSelected, isUnlocked)}`}
                          >
                            <span
                              aria-hidden="true"
                              className={`pointer-events-none absolute inset-x-0 top-0 h-[2.5px] ${ITEM_RARITY_META[s.rarity].barClass}`}
                            />
                            <div className="flex w-full items-center justify-between gap-1.5 min-w-0">
                              <span className="truncate font-display text-xs font-extrabold">
                                {s.name}
                              </span>
                              <RarityLabel
                                rarity={s.rarity}
                                selected={isSelected}
                                compact
                              />
                            </div>
                            <span
                              className={`text-[11px] leading-tight ${
                                isSelected ? 'text-zinc-600' : 'text-zinc-400'
                              }`}
                            >
                              {s.effectLabel}
                            </span>
                            <div className="flex w-full items-center justify-between gap-1">
                              <span
                                className={`text-[11px] font-bold font-mono-num ${
                                  isSelected
                                    ? isEquipped
                                      ? 'text-emerald-700'
                                      : isUnlocked
                                        ? 'text-zinc-700'
                                        : 'text-amber-700'
                                    : isEquipped
                                      ? 'text-emerald-400'
                                      : isUnlocked
                                        ? 'text-zinc-400'
                                        : 'text-amber-400'
                                }`}
                              >
                                {isEquipped
                                  ? 'Takılı'
                                  : isUnlocked
                                    ? 'Garajda'
                                    : `${s.priceGold} Altın`}
                              </span>
                              {s.animated && (
                                <span
                                  className={`text-[10px] font-bold ${
                                    isSelected
                                      ? 'text-amber-700'
                                      : 'text-amber-300/90'
                                  }`}
                                >
                                  Hareketli
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {!unlockedSpoilers.includes(inspectedCustom.spoiler) && (
                      <div className="sticky bottom-0 z-10 flex items-center justify-between gap-2 rounded-xl border border-amber-400/35 bg-zinc-900/95 px-3 py-2.5 shadow-[0_-8px_20px_rgba(9,9,11,0.9)]">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="truncate font-display text-xs font-bold text-white">
                              {inspectedSpoilerSpec.name}
                            </span>
                            <RarityLabel
                              rarity={inspectedSpoilerSpec.rarity}
                              compact
                            />
                          </div>
                          <div className="truncate text-[11px] text-zinc-400">
                            {inspectedSpoilerSpec.effectLabel} · Tüm araçlarda geçerli
                          </div>
                        </div>
                        {goldCoins >= inspectedSpoilerSpec.priceGold ? (
                          <button
                            type="button"
                            onClick={() => {
                              onUnlockSpoiler(
                                inspectedCustom.spoiler,
                                activeModel.id,
                              );
                              setPreviewCustom(null);
                            }}
                            className="flex min-h-[42px] items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 font-display text-xs font-extrabold text-zinc-950 hover:bg-emerald-400 whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            <Unlock className="h-3.5 w-3.5" />
                            <span className="font-mono-num">
                              Aç · {inspectedSpoilerSpec.priceGold}
                            </span>
                          </button>
                        ) : (
                          (() => {
                            const missing = Math.max(
                              1,
                              inspectedSpoilerSpec.priceGold - goldCoins,
                            );
                            const topUp = missing <= 80 ? missing : 75;
                            return (
                              <button
                                type="button"
                                onClick={() =>
                                  onWatchAdTopUpGold(
                                    topUp,
                                    inspectedSpoilerSpec.name,
                                  )
                                }
                                className="flex min-h-[42px] items-center gap-1.5 rounded-lg border border-sky-400/40 bg-sky-500/15 px-3 text-xs font-bold text-sky-200 hover:bg-sky-500/25 whitespace-nowrap shrink-0 cursor-pointer"
                              >
                                <PlayCircle className="h-3.5 w-3.5 text-sky-400" />
                                <span className="font-mono-num">
                                  Eksik {missing} · +{topUp} Al
                                </span>
                              </button>
                            );
                          })()
                        )}
                      </div>
                    )}
                  </>
                )}

                {bodySubTab === 'hat' && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      {ROOF_HATS.map((hat) => {
                        const isUnlocked = visualUnlocks.roofHat.includes(hat.id);
                        const isEquipped = equippedCustom.roofHat === hat.id;
                        const isSelected = inspectedCustom.roofHat === hat.id;
                        const isAnimated = Boolean(hat.animated);
                        return (
                          <button
                            key={hat.id}
                            type="button"
                            onClick={() =>
                              handleSelectAccessory(
                                'roofHat',
                                hat.id,
                                visualUnlocks.roofHat,
                                'roof',
                              )
                            }
                            className={`relative flex min-h-[78px] flex-col items-start justify-between gap-1 overflow-hidden rounded-xl border px-3 pt-3 pb-2.5 text-left transition-colors cursor-pointer ${getRarityCardClass(hat.rarity, isSelected, isUnlocked)}`}
                          >
                            <span
                              aria-hidden="true"
                              className={`pointer-events-none absolute inset-x-0 top-0 h-[2.5px] ${ITEM_RARITY_META[hat.rarity].barClass}`}
                            />
                            <div className="flex w-full items-center justify-between gap-1.5 min-w-0">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span
                                  className="h-3 w-3 shrink-0 rounded-full border border-black/30"
                                  style={{ background: hat.swatch }}
                                />
                                <span className="truncate font-display text-xs font-extrabold">
                                  {hat.name}
                                </span>
                              </div>
                              <RarityLabel
                                rarity={hat.rarity}
                                selected={isSelected}
                                compact
                              />
                            </div>
                            <span
                              className={`text-[11px] leading-tight line-clamp-1 ${
                                isSelected ? 'text-zinc-600' : 'text-zinc-400'
                              }`}
                            >
                              {hat.subtitle}
                            </span>
                            <div className="flex w-full items-center justify-between gap-1">
                              <span
                                className={`text-[11px] font-bold font-mono-num ${
                                  isSelected
                                    ? isEquipped
                                      ? 'text-emerald-700'
                                      : isUnlocked
                                        ? 'text-zinc-700'
                                        : 'text-amber-700'
                                    : isEquipped
                                      ? 'text-emerald-400'
                                      : isUnlocked
                                        ? 'text-zinc-400'
                                        : 'text-amber-400'
                                }`}
                              >
                                {isEquipped
                                  ? 'Takılı'
                                  : isUnlocked
                                    ? 'Garajda'
                                    : hat.levelRoadLevel
                                      ? `Sv.${hat.levelRoadLevel} Özel`
                                      : `${hat.priceGold} Altın`}
                              </span>
                              {isAnimated && (
                                <span
                                  className={`text-[10px] font-bold ${
                                    isSelected
                                      ? 'text-amber-700'
                                      : 'text-amber-300/90'
                                  }`}
                                >
                                  Hareketli
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {!visualUnlocks.roofHat.includes(inspectedCustom.roofHat) && (
                      <div className="sticky bottom-0 z-10 flex items-center justify-between gap-2 rounded-xl border border-amber-400/35 bg-zinc-900/95 px-3 py-2.5 shadow-[0_-8px_20px_rgba(9,9,11,0.9)]">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="truncate font-display text-xs font-bold text-white">
                              {inspectedHatSpec.name}
                            </span>
                            <RarityLabel
                              rarity={inspectedHatSpec.rarity}
                              compact
                            />
                          </div>
                          <div className="truncate text-[11px] text-zinc-400">
                            {inspectedHatSpec.levelRoadLevel
                              ? `Seviye ${inspectedHatSpec.levelRoadLevel} Yolu Özel Ödülü`
                              : `${inspectedHatSpec.subtitle} · Tüm araçlarda geçerli`}
                          </div>
                        </div>
                        {inspectedHatSpec.levelRoadLevel ? (
                          <button
                            type="button"
                            onClick={() =>
                              onOpenLevelRoad(inspectedHatSpec.levelRoadLevel)
                            }
                            className="flex min-h-[42px] items-center gap-1.5 rounded-lg bg-amber-400 px-3.5 font-display text-xs font-extrabold text-zinc-950 hover:bg-amber-300 whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            <Crown className="h-3.5 w-3.5" />
                            <span className="font-mono-num">
                              Sv.{inspectedHatSpec.levelRoadLevel} Yolu
                            </span>
                          </button>
                        ) : goldCoins >= inspectedHatSpec.priceGold ? (
                          <button
                            type="button"
                            onClick={() => {
                              onUnlockVisualItem(
                                'roofHat',
                                inspectedCustom.roofHat,
                                activeModel.id,
                              );
                              setPreviewCustom(null);
                            }}
                            className="flex min-h-[42px] items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 font-display text-xs font-extrabold text-zinc-950 hover:bg-emerald-400 whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            <Unlock className="h-3.5 w-3.5" />
                            <span className="font-mono-num">
                              Aç · {inspectedHatSpec.priceGold}
                            </span>
                          </button>
                        ) : (
                          (() => {
                            const missing = Math.max(
                              1,
                              inspectedHatSpec.priceGold - goldCoins,
                            );
                            const topUp = missing <= 80 ? missing : 75;
                            return (
                              <button
                                type="button"
                                onClick={() =>
                                  onWatchAdTopUpGold(
                                    topUp,
                                    inspectedHatSpec.name,
                                  )
                                }
                                className="flex min-h-[42px] items-center gap-1.5 rounded-lg border border-sky-400/40 bg-sky-500/15 px-3 text-xs font-bold text-sky-200 hover:bg-sky-500/25 whitespace-nowrap shrink-0 cursor-pointer"
                              >
                                <PlayCircle className="h-3.5 w-3.5 text-sky-400" />
                                <span className="font-mono-num">
                                  Eksik {missing} · +{topUp} Al
                                </span>
                              </button>
                            );
                          })()
                        )}
                      </div>
                    )}
                  </>
                )}

                {bodySubTab === 'steering' && (
                  <>
                    {renderCockpitPreviewBanner(
                      'Kokpit kamerasında sürüşte görünür',
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      {STEERING_WHEELS.map((wheel) => {
                        const isUnlocked =
                          visualUnlocks.steeringWheel.includes(wheel.id);
                        const isEquipped =
                          equippedCustom.steeringWheel === wheel.id;
                        const isSelected =
                          inspectedCustom.steeringWheel === wheel.id;
                        return (
                          <button
                            key={wheel.id}
                            type="button"
                            onClick={() =>
                              handleSelectAccessory(
                                'steeringWheel',
                                wheel.id,
                                visualUnlocks.steeringWheel,
                                'steering',
                              )
                            }
                            className={`relative flex min-h-[78px] flex-col items-start justify-between gap-1 overflow-hidden rounded-xl border px-3 pt-3 pb-2.5 text-left transition-colors cursor-pointer ${getRarityCardClass(wheel.rarity, isSelected, isUnlocked)}`}
                          >
                            <span
                              aria-hidden="true"
                              className={`pointer-events-none absolute inset-x-0 top-0 h-[2.5px] ${ITEM_RARITY_META[wheel.rarity].barClass}`}
                            />
                            <div className="flex w-full items-center justify-between gap-1.5 min-w-0">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span
                                  className="h-3 w-3 shrink-0 rounded-full border border-black/30"
                                  style={{ background: wheel.swatch }}
                                />
                                <span className="truncate font-display text-xs font-extrabold">
                                  {wheel.name}
                                </span>
                              </div>
                              <RarityLabel
                                rarity={wheel.rarity}
                                selected={isSelected}
                                compact
                              />
                            </div>
                            <span
                              className={`text-[11px] leading-tight line-clamp-1 ${
                                isSelected ? 'text-zinc-600' : 'text-zinc-400'
                              }`}
                            >
                              {wheel.subtitle}
                            </span>
                            <div className="flex w-full items-center justify-between gap-1">
                              <span
                                className={`text-[11px] font-bold font-mono-num ${
                                  isSelected
                                    ? isEquipped
                                      ? 'text-emerald-700'
                                      : isUnlocked
                                        ? 'text-zinc-700'
                                        : 'text-amber-700'
                                    : isEquipped
                                      ? 'text-emerald-400'
                                      : isUnlocked
                                        ? 'text-zinc-400'
                                        : 'text-amber-400'
                                }`}
                              >
                                {isEquipped
                                  ? 'Takılı'
                                  : isUnlocked
                                    ? 'Garajda'
                                    : wheel.levelRoadLevel
                                      ? `Sv.${wheel.levelRoadLevel} Özel`
                                      : `${wheel.priceGold} Altın`}
                              </span>
                              {(wheel.hasShiftLeds || wheel.animated) && (
                                <span
                                  className={`text-[10px] font-mono-num font-bold ${
                                    isSelected
                                      ? wheel.hasShiftLeds
                                        ? 'text-sky-700'
                                        : 'text-amber-700'
                                      : wheel.hasShiftLeds
                                        ? 'text-cyan-400'
                                        : 'text-amber-300/90'
                                  }`}
                                >
                                  {wheel.hasShiftLeds ? 'RPM LED' : 'Hareketli'}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {!visualUnlocks.steeringWheel.includes(
                      inspectedCustom.steeringWheel,
                    ) && (
                      <div className="sticky bottom-0 z-10 flex items-center justify-between gap-2 rounded-xl border border-amber-400/35 bg-zinc-900/95 px-3 py-2.5 shadow-[0_-8px_20px_rgba(9,9,11,0.9)]">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="truncate font-display text-xs font-bold text-white">
                              {inspectedSteeringSpec.name}
                            </span>
                            <RarityLabel
                              rarity={inspectedSteeringSpec.rarity}
                              compact
                            />
                          </div>
                          <div className="truncate text-[11px] text-zinc-400">
                            {inspectedSteeringSpec.levelRoadLevel
                              ? `Seviye ${inspectedSteeringSpec.levelRoadLevel} Yolu Özel Ödülü`
                              : `${inspectedSteeringSpec.subtitle} · Tüm araçlarda geçerli`}
                          </div>
                        </div>
                        {inspectedSteeringSpec.levelRoadLevel ? (
                          <button
                            type="button"
                            onClick={() =>
                              onOpenLevelRoad(
                                inspectedSteeringSpec.levelRoadLevel,
                              )
                            }
                            className="flex min-h-[42px] items-center gap-1.5 rounded-lg bg-amber-400 px-3.5 font-display text-xs font-extrabold text-zinc-950 hover:bg-amber-300 whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            <Crown className="h-3.5 w-3.5" />
                            <span className="font-mono-num">
                              Sv.{inspectedSteeringSpec.levelRoadLevel} Yolu
                            </span>
                          </button>
                        ) : goldCoins >= inspectedSteeringSpec.priceGold ? (
                          <button
                            type="button"
                            onClick={() => {
                              onUnlockVisualItem(
                                'steeringWheel',
                                inspectedCustom.steeringWheel,
                                activeModel.id,
                              );
                              setPreviewCustom(null);
                            }}
                            className="flex min-h-[42px] items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 font-display text-xs font-extrabold text-zinc-950 hover:bg-emerald-400 whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            <Unlock className="h-3.5 w-3.5" />
                            <span className="font-mono-num">
                              Aç · {inspectedSteeringSpec.priceGold}
                            </span>
                          </button>
                        ) : (
                          (() => {
                            const missing = Math.max(
                              1,
                              inspectedSteeringSpec.priceGold - goldCoins,
                            );
                            const topUp = missing <= 80 ? missing : 75;
                            return (
                              <button
                                type="button"
                                onClick={() =>
                                  onWatchAdTopUpGold(
                                    topUp,
                                    inspectedSteeringSpec.name,
                                  )
                                }
                                className="flex min-h-[42px] items-center gap-1.5 rounded-lg border border-sky-400/40 bg-sky-500/15 px-3 text-xs font-bold text-sky-200 hover:bg-sky-500/25 whitespace-nowrap shrink-0 cursor-pointer"
                              >
                                <PlayCircle className="h-3.5 w-3.5 text-sky-400" />
                                <span className="font-mono-num">
                                  Eksik {missing} · +{topUp} Al
                                </span>
                              </button>
                            );
                          })()
                        )}
                      </div>
                    )}
                  </>
                )}

                {bodySubTab === 'mirror' && (
                  <>
                    {renderCockpitPreviewBanner(
                      'Viraj ve frende fizikle sallanır',
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      {MIRROR_CHARMS.map((charm) => {
                        const isUnlocked =
                          visualUnlocks.mirrorCharm.includes(charm.id);
                        const isEquipped =
                          equippedCustom.mirrorCharm === charm.id;
                        const isSelected =
                          inspectedCustom.mirrorCharm === charm.id;
                        return (
                          <button
                            key={charm.id}
                            type="button"
                            onClick={() =>
                              handleSelectAccessory(
                                'mirrorCharm',
                                charm.id,
                                visualUnlocks.mirrorCharm,
                                'mirror',
                              )
                            }
                            className={`relative flex min-h-[78px] flex-col items-start justify-between gap-1 overflow-hidden rounded-xl border px-3 pt-3 pb-2.5 text-left transition-colors cursor-pointer ${getRarityCardClass(charm.rarity, isSelected, isUnlocked)}`}
                          >
                            <span
                              aria-hidden="true"
                              className={`pointer-events-none absolute inset-x-0 top-0 h-[2.5px] ${ITEM_RARITY_META[charm.rarity].barClass}`}
                            />
                            <div className="flex w-full items-center justify-between gap-1.5 min-w-0">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span
                                  className="h-3 w-3 shrink-0 rounded-full border border-black/30"
                                  style={{ background: charm.swatch }}
                                />
                                <span className="truncate font-display text-xs font-extrabold">
                                  {charm.name}
                                </span>
                              </div>
                              <RarityLabel
                                rarity={charm.rarity}
                                selected={isSelected}
                                compact
                              />
                            </div>
                            <span
                              className={`text-[11px] leading-tight line-clamp-1 ${
                                isSelected ? 'text-zinc-600' : 'text-zinc-400'
                              }`}
                            >
                              {charm.subtitle}
                            </span>
                            <div className="flex w-full items-center justify-between gap-1">
                              <span
                                className={`text-[11px] font-bold font-mono-num ${
                                  isSelected
                                    ? isEquipped
                                      ? 'text-emerald-700'
                                      : isUnlocked
                                        ? 'text-zinc-700'
                                        : 'text-amber-700'
                                    : isEquipped
                                      ? 'text-emerald-400'
                                      : isUnlocked
                                        ? 'text-zinc-400'
                                        : 'text-amber-400'
                                }`}
                              >
                                {isEquipped
                                  ? 'Takılı'
                                  : isUnlocked
                                    ? 'Garajda'
                                    : charm.levelRoadLevel
                                      ? `Sv.${charm.levelRoadLevel} Özel`
                                      : `${charm.priceGold} Altın`}
                              </span>
                              {(charm.animated || charm.id === 'turbo') && (
                                <span
                                  className={`text-[10px] font-bold ${
                                    isSelected
                                      ? 'text-sky-700'
                                      : 'text-cyan-400'
                                  }`}
                                >
                                  {charm.id === 'turbo' || charm.id === 'miniJet'
                                    ? 'RPM Döner'
                                    : 'Hareketli'}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {!visualUnlocks.mirrorCharm.includes(
                      inspectedCustom.mirrorCharm,
                    ) && (
                      <div className="sticky bottom-0 z-10 flex items-center justify-between gap-2 rounded-xl border border-amber-400/35 bg-zinc-900/95 px-3 py-2.5 shadow-[0_-8px_20px_rgba(9,9,11,0.9)]">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="truncate font-display text-xs font-bold text-white">
                              {inspectedMirrorSpec.name}
                            </span>
                            <RarityLabel
                              rarity={inspectedMirrorSpec.rarity}
                              compact
                            />
                          </div>
                          <div className="truncate text-[11px] text-zinc-400">
                            {inspectedMirrorSpec.levelRoadLevel
                              ? `Seviye ${inspectedMirrorSpec.levelRoadLevel} Yolu Özel Ödülü`
                              : `${inspectedMirrorSpec.subtitle} · Tüm araçlarda geçerli`}
                          </div>
                        </div>
                        {inspectedMirrorSpec.levelRoadLevel ? (
                          <button
                            type="button"
                            onClick={() =>
                              onOpenLevelRoad(
                                inspectedMirrorSpec.levelRoadLevel,
                              )
                            }
                            className="flex min-h-[42px] items-center gap-1.5 rounded-lg bg-amber-400 px-3.5 font-display text-xs font-extrabold text-zinc-950 hover:bg-amber-300 whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            <Crown className="h-3.5 w-3.5" />
                            <span className="font-mono-num">
                              Sv.{inspectedMirrorSpec.levelRoadLevel} Yolu
                            </span>
                          </button>
                        ) : goldCoins >= inspectedMirrorSpec.priceGold ? (
                          <button
                            type="button"
                            onClick={() => {
                              onUnlockVisualItem(
                                'mirrorCharm',
                                inspectedCustom.mirrorCharm,
                                activeModel.id,
                              );
                              setPreviewCustom(null);
                            }}
                            className="flex min-h-[42px] items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 font-display text-xs font-extrabold text-zinc-950 hover:bg-emerald-400 whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            <Unlock className="h-3.5 w-3.5" />
                            <span className="font-mono-num">
                              Aç · {inspectedMirrorSpec.priceGold}
                            </span>
                          </button>
                        ) : (
                          (() => {
                            const missing = Math.max(
                              1,
                              inspectedMirrorSpec.priceGold - goldCoins,
                            );
                            const topUp = missing <= 80 ? missing : 75;
                            return (
                              <button
                                type="button"
                                onClick={() =>
                                  onWatchAdTopUpGold(
                                    topUp,
                                    inspectedMirrorSpec.name,
                                  )
                                }
                                className="flex min-h-[42px] items-center gap-1.5 rounded-lg border border-sky-400/40 bg-sky-500/15 px-3 text-xs font-bold text-sky-200 hover:bg-sky-500/25 whitespace-nowrap shrink-0 cursor-pointer"
                              >
                                <PlayCircle className="h-3.5 w-3.5 text-sky-400" />
                                <span className="font-mono-num">
                                  Eksik {missing} · +{topUp} Al
                                </span>
                              </button>
                            );
                          })()
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
              );
            })()}

            {garageTab === 'wheels' && (() => {
              const isWheelColorLocked = inspectedWheelSpec.colorMode === 'fixed';
              const classicWheels = WHEEL_STYLES.filter(
                (w) => w.category === 'classic',
              );
              const animatedWheels = WHEEL_STYLES.filter(
                (w) => w.category === 'animated',
              );

              const renderWheelCard = (w: (typeof WHEEL_STYLES)[number]) => {
                const isUnlocked = unlockedWheelStyles.includes(w.id);
                const isEquipped = equippedWheel.style === w.id;
                const isSelected = inspectedWheelStyle === w.id;
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => {
                      onGarageCameraFocus('wheels');
                      if (isUnlocked) {
                        setPreviewWheelStyle(null);
                        onEquipWheelStyle(activeModel.id, w.id);
                      } else {
                        setPreviewWheelStyle(w.id);
                        onPreviewWheel(w.id, equippedWheel.color);
                      }
                    }}
                    className={`relative flex flex-col items-center justify-between gap-1 overflow-hidden rounded-xl border px-2.5 pt-3 pb-2.5 text-center transition-colors cursor-pointer ${getRarityCardClass(w.rarity, isSelected, isUnlocked)}`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none absolute inset-x-0 top-0 h-[2.5px] ${ITEM_RARITY_META[w.rarity].barClass}`}
                    />
                    <div className="flex items-center justify-center gap-1">
                      <WheelRimPreview
                        styleId={w.id}
                        color={activeWheelColorOpt.swatch}
                      />
                      {w.animated && (
                        <span
                          className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${
                            isSelected
                              ? 'bg-cyan-600 text-white'
                              : 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/35'
                          }`}
                        >
                          CANLI
                        </span>
                      )}
                    </div>
                    <span className="w-full truncate font-display text-xs font-extrabold">
                      {w.name}
                    </span>
                    <RarityLabel
                      rarity={w.rarity}
                      selected={isSelected}
                      compact
                    />
                    <span
                      className={`text-[11px] leading-tight ${
                        isSelected ? 'text-zinc-600' : 'text-zinc-400'
                      }`}
                    >
                      {w.effectLabel}
                    </span>
                    <span
                      className={`text-[11px] font-bold font-mono-num ${
                        isSelected
                          ? isEquipped
                            ? 'text-emerald-700'
                            : isUnlocked
                              ? 'text-zinc-700'
                              : 'text-amber-700'
                          : isEquipped
                            ? 'text-emerald-400'
                            : isUnlocked
                              ? 'text-zinc-400'
                              : 'text-amber-400'
                      }`}
                    >
                      {isEquipped
                        ? 'Takılı'
                        : isUnlocked
                          ? 'Garajda'
                          : `${w.priceGold} Altın`}
                    </span>
                  </button>
                );
              };

              return (
                <div className="flex flex-col gap-2.5">
                  {/* Wheel Color Picker OR Color Lock Banner */}
                  {isWheelColorLocked ? (
                    <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-400/25 bg-zinc-900/75 px-3 py-2.5">
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-amber-200">
                          {inspectedWheelSpec.name} · Özel Renk Modu
                        </div>
                        <div className="text-[11px] text-zinc-400">
                          {inspectedWheelSpec.fixedColorReason}
                        </div>
                      </div>
                      <span className="shrink-0 rounded-md border border-white/10 bg-zinc-950 px-2 py-1 text-[10px] font-bold text-zinc-400">
                        Renk Kapalı
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-zinc-900/65 px-3 py-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-bold text-zinc-200 whitespace-nowrap">
                          Tekerlek Rengi
                        </span>
                        <span aria-hidden="true" className="text-zinc-600">
                          ·
                        </span>
                        <span className="text-xs font-medium text-zinc-300 whitespace-nowrap">
                          {activeWheelColorOpt.label}
                        </span>
                        <RarityLabel
                          rarity={activeWheelColorOpt.rarity}
                          compact
                        />
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {WHEEL_COLORS.map((wc) => {
                          const active = wc.id === equippedWheel.color;
                          const wcMeta = ITEM_RARITY_META[wc.rarity];
                          return (
                            <button
                              key={wc.id}
                              type="button"
                              onClick={() => {
                                onGarageCameraFocus('wheels');
                                onSelectWheelColor(activeModel.id, wc.id);
                                if (previewWheelStyle) {
                                  onPreviewWheel(previewWheelStyle, wc.id);
                                }
                              }}
                              title={`${wc.label} (${wcMeta.label})`}
                              aria-label={`${wc.label} · ${wcMeta.label}`}
                              className={`relative flex h-9 w-9 md:h-7 md:w-7 items-center justify-center overflow-hidden rounded-lg border transition-transform cursor-pointer ${
                                active
                                  ? 'scale-105 border-amber-400 bg-white/15'
                                  : 'border-white/14 bg-zinc-950 hover:border-white/35'
                              }`}
                            >
                              <span
                                className="h-4.5 w-4.5 md:h-3.5 md:w-3.5 rounded-full border border-black/40"
                                style={{ backgroundColor: wc.swatch }}
                              />
                              <span
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-x-0 bottom-0 h-[2.5px]"
                                style={{ backgroundColor: wcMeta.accentHex }}
                              />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Section 1: Classic & Performance Wheels */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between px-0.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                        Klasik & Performans Tekerlekleri
                      </span>
                      <span className="text-[11px] text-zinc-500">
                        {classicWheels.length} Model
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {classicWheels.map(renderWheelCard)}
                    </div>

                    {/* Section 2: Rocket League-Style Animated Wheels */}
                    <div className="mt-1 flex items-center justify-between px-0.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">
                        Animasyonlu Tekerlekler
                      </span>
                      <span className="text-[11px] text-zinc-500">
                        Canlı ışık & dönen efekt
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {animatedWheels.map(renderWheelCard)}
                    </div>
                  </div>

                  {/* Inline Unlock Action Bar when previewing a locked wheel style */}
                  {!unlockedWheelStyles.includes(inspectedWheelStyle) && (
                    <div className="sticky bottom-0 z-10 flex items-center justify-between gap-2 rounded-xl border border-amber-400/35 bg-zinc-900/95 px-3 py-2.5 shadow-[0_-8px_20px_rgba(9,9,11,0.9)]">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="truncate font-display text-xs font-bold text-white">
                            {inspectedWheelSpec.name}
                          </span>
                          <RarityLabel
                            rarity={inspectedWheelSpec.rarity}
                            compact
                          />
                        </div>
                        <div className="truncate text-[11px] text-zinc-400">
                          {inspectedWheelSpec.effectLabel} · Tüm araçlarda kullanılır
                        </div>
                      </div>

                      {goldCoins >= inspectedWheelSpec.priceGold ? (
                        <button
                          type="button"
                          onClick={() => {
                            onUnlockWheelStyle(inspectedWheelStyle, activeModel.id);
                            setPreviewWheelStyle(null);
                          }}
                          className="flex min-h-[42px] items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 font-display text-xs font-extrabold text-zinc-950 hover:bg-emerald-400 whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <Unlock className="h-3.5 w-3.5" />
                          <span className="font-mono-num">
                            Aç · {inspectedWheelSpec.priceGold}
                          </span>
                        </button>
                      ) : (
                        (() => {
                          const missing = Math.max(
                            1,
                            inspectedWheelSpec.priceGold - goldCoins,
                          );
                          const topUp = missing <= 80 ? missing : 75;
                          return (
                            <button
                              type="button"
                              onClick={() =>
                                onWatchAdTopUpGold(
                                  topUp,
                                  `${inspectedWheelSpec.name} Tekerleği`,
                                )
                              }
                              className="flex min-h-[42px] items-center gap-1.5 rounded-lg border border-sky-400/40 bg-sky-500/15 px-3 text-xs font-bold text-sky-200 hover:bg-sky-500/25 whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              <PlayCircle className="h-3.5 w-3.5 text-sky-400" />
                              <span className="font-mono-num">
                                Eksik {missing} · +{topUp} Al
                              </span>
                            </button>
                          );
                        })()
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {garageTab === 'style' && (() => {
              const resetStylePreview = () => {
                setPreviewCustom(null);
                onPreviewCustom(equippedCustom);
              };

              const handleSelectVisual = (
                category: VisualCategory,
                itemId: string,
                unlockedList: string[],
              ) => {
                const focusMap: Record<VisualCategory, GarageCameraFocus> = {
                  paintFinish: 'overview',
                  underglow: 'neon',
                  headlight: 'headlight',
                  plateStyle: 'plate',
                  nitroFlame: 'exhaust',
                  driftSmoke: 'smoke',
                  roofHat: 'roof',
                  steeringWheel: 'steering',
                  mirrorCharm: 'mirror',
                };
                onGarageCameraFocus(focusMap[category]);
                if (unlockedList.includes(itemId)) {
                  setPreviewCustom((prev) => {
                    if (!prev) return null;
                    const next = { ...prev };
                    delete next[category];
                    return next;
                  });
                  onEquipVisualItem(activeModel.id, category, itemId);
                } else {
                  const nextPreview: CarCustomConfig = {
                    ...inspectedCustom,
                    [category]: itemId,
                  };
                  setPreviewCustom(nextPreview);
                  onPreviewCustom(nextPreview);
                }
              };

              const renderUnlockBar = (
                category: VisualCategory,
                itemId: string,
                name: string,
                subtitle: string,
                priceGold: number,
                unlockedList: string[],
                rarity: ItemRarity,
                levelRoadLevel?: number,
              ) => {
                if (unlockedList.includes(itemId)) return null;
                const missing = Math.max(1, priceGold - goldCoins);
                const topUp = missing <= 80 ? missing : 75;
                return (
                  <div className="sticky bottom-0 z-10 flex items-center justify-between gap-2 rounded-xl border border-amber-400/35 bg-zinc-900/95 px-3 py-2.5 shadow-[0_-8px_20px_rgba(9,9,11,0.9)]">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="truncate font-display text-xs font-bold text-white">
                          {name}
                        </span>
                        <RarityLabel rarity={rarity} compact />
                      </div>
                      <div className="truncate text-[11px] text-zinc-400">
                        {levelRoadLevel
                          ? `Seviye ${levelRoadLevel} Yolu Özel Ödülü`
                          : `${subtitle} · Tüm araçlarda geçerli`}
                      </div>
                    </div>
                    {levelRoadLevel ? (
                      <button
                        type="button"
                        onClick={() => onOpenLevelRoad(levelRoadLevel)}
                        className="flex min-h-[42px] items-center gap-1.5 rounded-lg bg-amber-400 px-3.5 font-display text-xs font-extrabold text-zinc-950 hover:bg-amber-300 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Crown className="h-3.5 w-3.5" />
                        <span className="font-mono-num">
                          Sv.{levelRoadLevel} Yolu
                        </span>
                      </button>
                    ) : goldCoins >= priceGold ? (
                      <button
                        type="button"
                        onClick={() => {
                          onUnlockVisualItem(category, itemId, activeModel.id);
                          setPreviewCustom(null);
                        }}
                        className="flex min-h-[42px] items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 font-display text-xs font-extrabold text-zinc-950 hover:bg-emerald-400 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Unlock className="h-3.5 w-3.5" />
                        <span className="font-mono-num">Aç · {priceGold}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onWatchAdTopUpGold(topUp, name)}
                        className="flex min-h-[42px] items-center gap-1.5 rounded-lg border border-sky-400/40 bg-sky-500/15 px-3 text-xs font-bold text-sky-200 hover:bg-sky-500/25 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <PlayCircle className="h-3.5 w-3.5 text-sky-400" />
                        <span className="font-mono-num">
                          Eksik {missing} · +{topUp} Al
                        </span>
                      </button>
                    )}
                  </div>
                );
              };

              const inspectedFinish =
                PAINT_FINISHES.find(
                  (f) => f.id === inspectedCustom.paintFinish,
                ) || PAINT_FINISHES[0];
              const inspectedUnderglow =
                UNDERGLOWS.find((u) => u.id === inspectedCustom.underglow) ||
                UNDERGLOWS[0];
              const inspectedHeadlight =
                HEADLIGHTS.find((h) => h.id === inspectedCustom.headlight) ||
                HEADLIGHTS[0];
              const inspectedNitroFlame =
                NITRO_FLAMES.find(
                  (n) => n.id === inspectedCustom.nitroFlame,
                ) || NITRO_FLAMES[0];
              const inspectedDriftSmoke =
                DRIFT_SMOKES.find(
                  (d) => d.id === inspectedCustom.driftSmoke,
                ) || DRIFT_SMOKES[0];
              const inspectedPlateStyle =
                PLATE_STYLES.find(
                  (p) => p.id === inspectedCustom.plateStyle,
                ) || PLATE_STYLES[0];

              const colorableFinishes = PAINT_FINISHES.filter(
                (f) => f.colorMode !== 'fixed',
              );
              const specialFixedFinishes = PAINT_FINISHES.filter(
                (f) => f.colorMode === 'fixed',
              );
              const decalLiveries = LIVERIES.filter(
                (l) => l.category === 'none' || l.category === 'decal',
              );
              const fullWrapLiveries = LIVERIES.filter(
                (l) => l.category === 'fullWrap',
              );
              const animatedLiveries = LIVERIES.filter(
                (l) => l.category === 'animated',
              );
              const isFullWrapActive = Boolean(
                inspectedLiverySpec.overridesBaseColor,
              );
              const isFixedFinishActive = inspectedFinish.colorMode === 'fixed';

              const renderPaintFinishCard = (pf: (typeof PAINT_FINISHES)[number]) => {
                const isUnlocked = visualUnlocks.paintFinish.includes(pf.id);
                const isEquipped = equippedCustom.paintFinish === pf.id;
                const isSelected = inspectedCustom.paintFinish === pf.id;
                return (
                  <button
                    key={pf.id}
                    type="button"
                    onClick={() =>
                      handleSelectVisual(
                        'paintFinish',
                        pf.id,
                        visualUnlocks.paintFinish,
                      )
                    }
                    className={`relative flex flex-col items-center justify-between gap-1.5 overflow-hidden rounded-xl border px-2.5 pt-3 pb-2.5 text-center transition-colors cursor-pointer ${getRarityCardClass(pf.rarity, isSelected, isUnlocked)}`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none absolute inset-x-0 top-0 h-[2.5px] ${ITEM_RARITY_META[pf.rarity].barClass}`}
                    />
                    <span
                      className="h-4 w-12 rounded-full border border-black/30"
                      style={{ background: pf.swatch }}
                    />
                    <span className="w-full truncate font-display text-xs font-bold">
                      {pf.name}
                    </span>
                    <RarityLabel
                      rarity={pf.rarity}
                      selected={isSelected}
                      compact
                    />
                    <span
                      className={`text-[11px] font-bold font-mono-num ${
                        isSelected
                          ? isEquipped
                            ? 'text-emerald-700'
                            : isUnlocked
                              ? 'text-zinc-700'
                              : 'text-amber-700'
                          : isEquipped
                            ? 'text-emerald-400'
                            : isUnlocked
                              ? 'text-zinc-400'
                              : 'text-amber-400'
                      }`}
                    >
                      {isEquipped
                        ? 'Takılı'
                        : isUnlocked
                          ? 'Garajda'
                          : pf.levelRoadLevel
                            ? `Sv.${pf.levelRoadLevel} Özel`
                            : `${pf.priceGold} Altın`}
                    </span>
                  </button>
                );
              };

              const renderLiveryCard = (l: (typeof LIVERIES)[number]) => {
                const isUnlocked = unlockedLiveries.includes(l.id);
                const isEquipped = equippedCustom.livery === l.id;
                const isSelected = inspectedCustom.livery === l.id;
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => {
                      onGarageCameraFocus('livery');
                      if (isUnlocked) {
                        setPreviewCustom((prev) =>
                          prev ? { ...prev, livery: undefined } : null,
                        );
                        onEquipLivery(activeModel.id, l.id);
                      } else {
                        const nextPreview = {
                          ...inspectedCustom,
                          livery: l.id,
                        };
                        setPreviewCustom(nextPreview);
                        onPreviewCustom(nextPreview);
                      }
                    }}
                    className={`relative flex flex-col items-center justify-between gap-1.5 overflow-hidden rounded-xl border px-2.5 pt-3 pb-2.5 text-center transition-colors cursor-pointer ${getRarityCardClass(l.rarity, isSelected, isUnlocked)}`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none absolute inset-x-0 top-0 h-[2.5px] ${ITEM_RARITY_META[l.rarity].barClass}`}
                    />
                    <div className="flex items-center justify-center gap-1">
                      <span
                        className="h-4 w-12 rounded-full border border-black/30"
                        style={{ background: l.accentSwatch }}
                      />
                      {l.animated && (
                        <span
                          className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${
                            isSelected
                              ? 'bg-cyan-600 text-white'
                              : 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/35'
                          }`}
                        >
                          CANLI
                        </span>
                      )}
                    </div>
                    <span className="w-full truncate font-display text-xs font-bold">
                      {l.name}
                    </span>
                    <RarityLabel
                      rarity={l.rarity}
                      selected={isSelected}
                      compact
                    />
                    <span
                      className={`text-[11px] font-bold font-mono-num ${
                        isSelected
                          ? isEquipped
                            ? 'text-emerald-700'
                            : isUnlocked
                              ? 'text-zinc-700'
                              : 'text-amber-700'
                          : isEquipped
                            ? 'text-emerald-400'
                            : isUnlocked
                              ? 'text-zinc-400'
                              : 'text-amber-400'
                      }`}
                    >
                      {isEquipped
                        ? 'Takılı'
                        : isUnlocked
                          ? 'Garajda'
                          : `${l.priceGold} Altın`}
                    </span>
                  </button>
                );
              };

              return (
                <div className="flex flex-col gap-2.5">
                  {/* 6 Style & Lighting Sub-Tabs — 3×2 Grid on Mobile (Zero horizontal scroll), 6-Col on Desktop */}
                  <div className="grid grid-cols-3 gap-1 rounded-xl bg-zinc-900/85 p-1 md:grid-cols-6">
                    {(
                      [
                        { id: 'paint', label: 'Boya' },
                        { id: 'livery', label: 'Kaplama' },
                        { id: 'neon', label: 'Neon' },
                        { id: 'headlight', label: 'Far' },
                        { id: 'fx', label: 'Efekt' },
                        { id: 'plate', label: 'Plaka' },
                      ] as const
                    ).map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => {
                          resetStylePreview();
                          setStyleSubTab(st.id);
                          onGarageCameraFocus(
                            st.id === 'livery'
                              ? 'livery'
                              : st.id === 'neon'
                                ? 'neon'
                                : st.id === 'headlight'
                                  ? 'headlight'
                                  : st.id === 'plate'
                                    ? 'plate'
                                    : st.id === 'fx'
                                      ? fxMode === 'nitro'
                                        ? 'exhaust'
                                        : 'smoke'
                                      : 'overview',
                          );
                        }}
                        className={`min-h-[36px] rounded-lg px-2 text-xs font-bold transition-colors whitespace-nowrap cursor-pointer md:min-h-[32px] md:px-0.5 md:text-[10.5px] ${
                          styleSubTab === st.id
                            ? 'bg-zinc-100 text-zinc-950'
                            : 'text-zinc-300 hover:text-white'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>

                  {/* SUB-TAB 1: PAINT COLOR & FINISH */}
                  {styleSubTab === 'paint' && (
                    <>
                      {isFullWrapActive ? (
                        <div className="flex items-center justify-between gap-2 rounded-xl border border-purple-400/25 bg-purple-950/35 px-3 py-2.5">
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-purple-200">
                              {inspectedLiverySpec.name} tam kaplama aktif
                            </div>
                            <div className="text-[11px] text-zinc-400">
                              Renk seçimi kapalı · Yalnızca yüzey parlaklığı etkilidir
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewCustom((prev) =>
                                prev ? { ...prev, livery: undefined } : null,
                              );
                              onEquipLivery(activeModel.id, 'solid');
                            }}
                            className="shrink-0 rounded-lg border border-white/15 bg-zinc-900/90 px-2.5 py-1.5 text-xs font-bold text-zinc-200 hover:border-amber-400/50 hover:text-white cursor-pointer"
                          >
                            Kaplamayı Kaldır
                          </button>
                        </div>
                      ) : isFixedFinishActive ? (
                        <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-400/25 bg-zinc-900/75 px-3 py-2.5">
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-amber-200">
                              {inspectedFinish.name} · Özel Renk Modu
                            </div>
                            <div className="text-[11px] text-zinc-400">
                              {inspectedFinish.fixedColorReason}
                            </div>
                          </div>
                          <span className="shrink-0 rounded-md border border-white/10 bg-zinc-950 px-2 py-1 text-[10px] font-bold text-zinc-400">
                            Renk Kapalı
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-zinc-900/75 px-3 py-2.5">
                          <div className="flex flex-wrap items-center justify-between gap-1.5">
                            <span className="text-xs font-bold text-zinc-200">
                              {inspectedFinish.colorMode === 'tinted'
                                ? 'Karbon Tonu'
                                : 'Boya Rengi'}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-medium text-zinc-300">
                                {activeColorOpt.label}
                              </span>
                              <RarityLabel
                                rarity={activeColorOpt.rarity}
                                compact
                              />
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {CAR_COLORS.map((c) => {
                              const active = c.id === carColor;
                              const isColorLocked = Boolean(
                                c.levelRoadLevel &&
                                  !unlockedCarColors.includes(c.id),
                              );
                              const cMeta = ITEM_RARITY_META[c.rarity];
                              return (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => {
                                    if (isColorLocked) {
                                      onOpenLevelRoad(c.levelRoadLevel);
                                    } else {
                                      onSelectColor(c.id);
                                    }
                                  }}
                                  title={
                                    isColorLocked
                                      ? `${c.label} · Seviye ${c.levelRoadLevel} Yolu Özel`
                                      : `${c.label} (${cMeta.label})`
                                  }
                                  aria-label={
                                    isColorLocked
                                      ? `${c.label} · Seviye ${c.levelRoadLevel} Yolu Özel`
                                      : `${c.label} · ${cMeta.label}`
                                  }
                                  className={`relative flex h-9 w-9 md:h-7 md:w-7 shrink-0 items-center justify-center overflow-hidden rounded-lg border transition-transform cursor-pointer ${
                                    active
                                      ? 'scale-105 border-amber-400 bg-white/15'
                                      : isColorLocked
                                        ? 'border-amber-400/35 bg-zinc-950/90 hover:border-amber-400/70'
                                        : 'border-white/14 bg-zinc-950 hover:border-white/35'
                                  }`}
                                >
                                  <span
                                    className={`h-5 w-5 md:h-4 md:w-4 rounded-xs border border-black/30 ${
                                      isColorLocked ? 'opacity-45' : ''
                                    }`}
                                    style={{ backgroundColor: c.swatch }}
                                  />
                                  {isColorLocked && (
                                    <Lock className="pointer-events-none absolute h-3.5 w-3.5 text-amber-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]" />
                                  )}
                                  <span
                                    aria-hidden="true"
                                    className="pointer-events-none absolute inset-x-0 bottom-0 h-[2.5px]"
                                    style={{ backgroundColor: cMeta.accentHex }}
                                  />
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between px-0.5">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                            Boya Yüzeyleri
                          </span>
                          <span className="text-[11px] text-zinc-500">
                            Seçili renkle uyumlu
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {colorableFinishes.map(renderPaintFinishCard)}
                        </div>

                        <div className="mt-1 flex items-center justify-between px-0.5">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300/90">
                            Özel Efektli Boyalar
                          </span>
                          <span className="text-[11px] text-zinc-500">
                            Kendi rengine sahip
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {specialFixedFinishes.map(renderPaintFinishCard)}
                        </div>
                      </div>

                      {renderUnlockBar(
                        'paintFinish',
                        inspectedFinish.id,
                        inspectedFinish.name,
                        inspectedFinish.subtitle,
                        inspectedFinish.priceGold,
                        visualUnlocks.paintFinish,
                        inspectedFinish.rarity,
                        inspectedFinish.levelRoadLevel,
                      )}
                    </>
                  )}

                  {/* SUB-TAB 2: LIVERIES & FULL WRAPS */}
                  {styleSubTab === 'livery' && (
                    <>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between px-0.5">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                            Gövde Grafikleri & Şeritler
                          </span>
                          <span className="text-[11px] text-zinc-500">
                            Boya üstüne uygulanır
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {decalLiveries.map(renderLiveryCard)}
                        </div>

                        <div className="mt-1 flex items-center justify-between px-0.5">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-purple-300/90">
                            Tam Gövde Kaplama
                          </span>
                          <span className="text-[11px] text-zinc-500">
                            Tüm boyayı kaplar
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {fullWrapLiveries.map(renderLiveryCard)}
                        </div>

                        <div className="mt-1 flex items-center justify-between px-0.5">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">
                            Animasyonlu Kaplamalar
                          </span>
                          <span className="text-[11px] text-zinc-500">
                            Hareketli özel efekt
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {animatedLiveries.map(renderLiveryCard)}
                        </div>
                      </div>

                      {!unlockedLiveries.includes(inspectedCustom.livery) && (
                        <div className="sticky bottom-0 z-10 flex items-center justify-between gap-2 rounded-xl border border-amber-400/35 bg-zinc-900/95 px-3 py-2.5 shadow-[0_-8px_20px_rgba(9,9,11,0.9)]">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="truncate font-display text-xs font-bold text-white">
                                {inspectedLiverySpec.name}
                              </span>
                              <RarityLabel
                                rarity={inspectedLiverySpec.rarity}
                                compact
                              />
                            </div>
                            <div className="truncate text-[11px] text-zinc-400">
                              {inspectedLiverySpec.subtitle} · Tüm araçlarda geçerli
                            </div>
                          </div>
                          {goldCoins >= inspectedLiverySpec.priceGold ? (
                            <button
                              type="button"
                              onClick={() => {
                                onUnlockLivery(
                                  inspectedCustom.livery,
                                  activeModel.id,
                                );
                                setPreviewCustom(null);
                              }}
                              className="flex min-h-[42px] items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 font-display text-xs font-extrabold text-zinc-950 hover:bg-emerald-400 whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              <Unlock className="h-3.5 w-3.5" />
                              <span className="font-mono-num">
                                Aç · {inspectedLiverySpec.priceGold}
                              </span>
                            </button>
                          ) : (
                            (() => {
                              const missing = Math.max(
                                1,
                                inspectedLiverySpec.priceGold - goldCoins,
                              );
                              const topUp = missing <= 80 ? missing : 75;
                              return (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onWatchAdTopUpGold(
                                      topUp,
                                      inspectedLiverySpec.name,
                                    )
                                  }
                                  className="flex min-h-[42px] items-center gap-1.5 rounded-lg border border-sky-400/40 bg-sky-500/15 px-3 text-xs font-bold text-sky-200 hover:bg-sky-500/25 whitespace-nowrap shrink-0 cursor-pointer"
                                >
                                  <PlayCircle className="h-3.5 w-3.5 text-sky-400" />
                                  <span className="font-mono-num">
                                    Eksik {missing} · +{topUp} Al
                                  </span>
                                </button>
                              );
                            })()
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {/* SUB-TAB 3: NEON UNDERGLOW */}
                  {styleSubTab === 'neon' && (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        {UNDERGLOWS.map((ug) => {
                          const isUnlocked = visualUnlocks.underglow.includes(
                            ug.id,
                          );
                          const isEquipped = equippedCustom.underglow === ug.id;
                          const isSelected =
                            inspectedCustom.underglow === ug.id;
                          const glowHex = `#${ug.hex.toString(16).padStart(6, '0')}`;
                          return (
                            <button
                              key={ug.id}
                              type="button"
                              onClick={() =>
                                handleSelectVisual(
                                  'underglow',
                                  ug.id,
                                  visualUnlocks.underglow,
                                )
                              }
                              className={`relative flex flex-col items-center justify-between gap-1.5 overflow-hidden rounded-xl border px-2.5 pt-3 pb-2.5 text-center transition-colors cursor-pointer ${getRarityCardClass(ug.rarity, isSelected, isUnlocked)}`}
                            >
                              <span
                                aria-hidden="true"
                                className={`pointer-events-none absolute inset-x-0 top-0 h-[2.5px] ${ITEM_RARITY_META[ug.rarity].barClass}`}
                              />
                              <span
                                className="h-4 w-12 rounded-full border border-black/30"
                                style={{
                                  background: ug.swatch,
                                  boxShadow:
                                    ug.mode !== 'off'
                                      ? `0 0 10px ${glowHex}`
                                      : undefined,
                                }}
                              />
                              <span className="w-full truncate font-display text-xs font-bold">
                                {ug.name}
                              </span>
                              <RarityLabel
                                rarity={ug.rarity}
                                selected={isSelected}
                                compact
                              />
                              <span
                                className={`text-[11px] font-bold font-mono-num ${
                                  isSelected
                                    ? isEquipped
                                      ? 'text-emerald-700'
                                      : isUnlocked
                                        ? 'text-zinc-700'
                                        : 'text-amber-700'
                                    : isEquipped
                                      ? 'text-emerald-400'
                                      : isUnlocked
                                        ? 'text-zinc-400'
                                        : 'text-amber-400'
                                }`}
                              >
                                {isEquipped
                                  ? 'Takılı'
                                  : isUnlocked
                                    ? 'Garajda'
                                    : ug.levelRoadLevel
                                      ? `Sv.${ug.levelRoadLevel} Özel`
                                      : `${ug.priceGold} Altın`}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {renderUnlockBar(
                        'underglow',
                        inspectedUnderglow.id,
                        inspectedUnderglow.name,
                        inspectedUnderglow.subtitle,
                        inspectedUnderglow.priceGold,
                        visualUnlocks.underglow,
                        inspectedUnderglow.rarity,
                        inspectedUnderglow.levelRoadLevel,
                      )}
                    </>
                  )}

                  {/* SUB-TAB 4: HEADLIGHT XENON & LASER */}
                  {styleSubTab === 'headlight' && (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        {HEADLIGHTS.map((hl) => {
                          const isUnlocked = visualUnlocks.headlight.includes(
                            hl.id,
                          );
                          const isEquipped = equippedCustom.headlight === hl.id;
                          const isSelected =
                            inspectedCustom.headlight === hl.id;
                          const hlGlowHex = `#${hl.emissiveHex.toString(16).padStart(6, '0')}`;
                          return (
                            <button
                              key={hl.id}
                              type="button"
                              onClick={() =>
                                handleSelectVisual(
                                  'headlight',
                                  hl.id,
                                  visualUnlocks.headlight,
                                )
                              }
                              className={`relative flex flex-col items-center justify-between gap-1.5 overflow-hidden rounded-xl border px-2.5 pt-3 pb-2.5 text-center transition-colors cursor-pointer ${getRarityCardClass(hl.rarity, isSelected, isUnlocked)}`}
                            >
                              <span
                                aria-hidden="true"
                                className={`pointer-events-none absolute inset-x-0 top-0 h-[2.5px] ${ITEM_RARITY_META[hl.rarity].barClass}`}
                              />
                              <div className="flex items-center gap-2.5">
                                <span
                                  className="h-3.5 w-3.5 rounded-full border border-black/30"
                                  style={{
                                    background: hl.swatch,
                                    boxShadow: `0 0 9px ${hlGlowHex}`,
                                  }}
                                />
                                <span
                                  className="h-3.5 w-3.5 rounded-full border border-black/30"
                                  style={{
                                    background: hl.swatch,
                                    boxShadow: `0 0 9px ${hlGlowHex}`,
                                  }}
                                />
                              </div>
                              <span className="w-full truncate font-display text-xs font-bold">
                                {hl.name}
                              </span>
                              <RarityLabel
                                rarity={hl.rarity}
                                selected={isSelected}
                                compact
                              />
                              <span
                                className={`text-[11px] font-bold font-mono-num ${
                                  isSelected
                                    ? isEquipped
                                      ? 'text-emerald-700'
                                      : isUnlocked
                                        ? 'text-zinc-700'
                                        : 'text-amber-700'
                                    : isEquipped
                                      ? 'text-emerald-400'
                                      : isUnlocked
                                        ? 'text-zinc-400'
                                        : 'text-amber-400'
                                }`}
                              >
                                {isEquipped
                                  ? 'Takılı'
                                  : isUnlocked
                                    ? 'Garajda'
                                    : hl.levelRoadLevel
                                      ? `Sv.${hl.levelRoadLevel} Özel`
                                      : `${hl.priceGold} Altın`}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {renderUnlockBar(
                        'headlight',
                        inspectedHeadlight.id,
                        inspectedHeadlight.name,
                        inspectedHeadlight.subtitle,
                        inspectedHeadlight.priceGold,
                        visualUnlocks.headlight,
                        inspectedHeadlight.rarity,
                        inspectedHeadlight.levelRoadLevel,
                      )}
                    </>
                  )}

                  {/* SUB-TAB 4: NITRO FLAME & DRIFT SMOKE FX */}
                  {styleSubTab === 'fx' && (
                    <>
                      <div className="grid grid-cols-2 gap-1 rounded-xl bg-zinc-900/75 p-1">
                        <button
                          type="button"
                          onClick={() => {
                            resetStylePreview();
                            setFxMode('nitro');
                            onGarageCameraFocus('exhaust');
                          }}
                          className={`flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                            fxMode === 'nitro'
                              ? 'bg-sky-400 text-zinc-950'
                              : 'text-zinc-300 hover:text-white'
                          }`}
                        >
                          <Flame className="h-4 w-4" />
                          <span>Nitro Alevi</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            resetStylePreview();
                            setFxMode('smoke');
                            onGarageCameraFocus('smoke');
                          }}
                          className={`flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                            fxMode === 'smoke'
                              ? 'bg-amber-400 text-zinc-950'
                              : 'text-zinc-300 hover:text-white'
                          }`}
                        >
                          <Zap className="h-4 w-4" />
                          <span>Drift Dumanı</span>
                        </button>
                      </div>

                      {fxMode === 'nitro' ? (
                        <>
                          <div className="grid grid-cols-2 gap-2">
                            {NITRO_FLAMES.map((nf) => {
                              const isUnlocked =
                                visualUnlocks.nitroFlame.includes(nf.id);
                              const isEquipped =
                                equippedCustom.nitroFlame === nf.id;
                              const isSelected =
                                inspectedCustom.nitroFlame === nf.id;
                              return (
                                <button
                                  key={nf.id}
                                  type="button"
                                  onClick={() =>
                                    handleSelectVisual(
                                      'nitroFlame',
                                      nf.id,
                                      visualUnlocks.nitroFlame,
                                    )
                                  }
                                  className={`relative flex flex-col items-center justify-between gap-1.5 overflow-hidden rounded-xl border px-2.5 pt-3 pb-2.5 text-center transition-colors cursor-pointer ${getRarityCardClass(nf.rarity, isSelected, isUnlocked)}`}
                                >
                                  <span
                                    aria-hidden="true"
                                    className={`pointer-events-none absolute inset-x-0 top-0 h-[2.5px] ${ITEM_RARITY_META[nf.rarity].barClass}`}
                                  />
                                  <span
                                    className="h-4 w-12 rounded-full border border-black/30"
                                    style={{ background: nf.swatch }}
                                  />
                                  <span className="w-full truncate font-display text-xs font-bold">
                                    {nf.name}
                                  </span>
                                  <RarityLabel
                                    rarity={nf.rarity}
                                    selected={isSelected}
                                    compact
                                  />
                                  <div className="flex items-center justify-center gap-1.5">
                                    <span
                                      className={`text-[11px] font-bold font-mono-num ${
                                        isSelected
                                          ? isEquipped
                                            ? 'text-emerald-700'
                                            : isUnlocked
                                              ? 'text-zinc-700'
                                              : 'text-amber-700'
                                          : isEquipped
                                            ? 'text-emerald-400'
                                            : isUnlocked
                                              ? 'text-zinc-400'
                                              : 'text-amber-400'
                                      }`}
                                    >
                                      {isEquipped
                                        ? 'Takılı'
                                        : isUnlocked
                                          ? 'Garajda'
                                          : nf.levelRoadLevel
                                            ? `Sv.${nf.levelRoadLevel} Özel`
                                            : `${nf.priceGold} Altın`}
                                    </span>
                                    {nf.animated && (
                                      <span
                                        className={`text-[10px] font-bold ${
                                          isSelected
                                            ? 'text-amber-700'
                                            : 'text-amber-300/90'
                                        }`}
                                      >
                                        · Hareketli
                                      </span>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>

                          {renderUnlockBar(
                            'nitroFlame',
                            inspectedNitroFlame.id,
                            inspectedNitroFlame.name,
                            inspectedNitroFlame.subtitle,
                            inspectedNitroFlame.priceGold,
                            visualUnlocks.nitroFlame,
                            inspectedNitroFlame.rarity,
                            inspectedNitroFlame.levelRoadLevel,
                          )}
                        </>
                      ) : (
                        <>
                          <div className="grid grid-cols-2 gap-2">
                            {DRIFT_SMOKES.map((ds) => {
                              const isUnlocked =
                                visualUnlocks.driftSmoke.includes(ds.id);
                              const isEquipped =
                                equippedCustom.driftSmoke === ds.id;
                              const isSelected =
                                inspectedCustom.driftSmoke === ds.id;
                              return (
                                <button
                                  key={ds.id}
                                  type="button"
                                  onClick={() =>
                                    handleSelectVisual(
                                      'driftSmoke',
                                      ds.id,
                                      visualUnlocks.driftSmoke,
                                    )
                                  }
                                  className={`relative flex flex-col items-center justify-between gap-1.5 overflow-hidden rounded-xl border px-2.5 pt-3 pb-2.5 text-center transition-colors cursor-pointer ${getRarityCardClass(ds.rarity, isSelected, isUnlocked)}`}
                                >
                                  <span
                                    aria-hidden="true"
                                    className={`pointer-events-none absolute inset-x-0 top-0 h-[2.5px] ${ITEM_RARITY_META[ds.rarity].barClass}`}
                                  />
                                  <span
                                    className="h-4 w-12 rounded-full border border-black/30"
                                    style={{ background: ds.swatch }}
                                  />
                                  <span className="w-full truncate font-display text-xs font-bold">
                                    {ds.name}
                                  </span>
                                  <RarityLabel
                                    rarity={ds.rarity}
                                    selected={isSelected}
                                    compact
                                  />
                                  <div className="flex items-center justify-center gap-1.5">
                                    <span
                                      className={`text-[11px] font-bold font-mono-num ${
                                        isSelected
                                          ? isEquipped
                                            ? 'text-emerald-700'
                                            : isUnlocked
                                              ? 'text-zinc-700'
                                              : 'text-amber-700'
                                          : isEquipped
                                            ? 'text-emerald-400'
                                            : isUnlocked
                                              ? 'text-zinc-400'
                                              : 'text-amber-400'
                                      }`}
                                    >
                                      {isEquipped
                                        ? 'Takılı'
                                        : isUnlocked
                                          ? 'Garajda'
                                          : ds.levelRoadLevel
                                            ? `Sv.${ds.levelRoadLevel} Özel`
                                            : `${ds.priceGold} Altın`}
                                    </span>
                                    {(ds.animated || ds.rainbow) && (
                                      <span
                                        className={`text-[10px] font-bold ${
                                          isSelected
                                            ? 'text-amber-700'
                                            : 'text-amber-300/90'
                                        }`}
                                      >
                                        · Hareketli
                                      </span>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>

                          {renderUnlockBar(
                            'driftSmoke',
                            inspectedDriftSmoke.id,
                            inspectedDriftSmoke.name,
                            inspectedDriftSmoke.subtitle,
                            inspectedDriftSmoke.priceGold,
                            visualUnlocks.driftSmoke,
                            inspectedDriftSmoke.rarity,
                            inspectedDriftSmoke.levelRoadLevel,
                          )}
                        </>
                      )}
                    </>
                  )}

                  {/* SUB-TAB 5: LICENSE PLATE TEXT & FRAME STYLE */}
                  {styleSubTab === 'plate' && (
                    <>
                      <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-zinc-900/75 px-3 py-2">
                        <label
                          htmlFor="garage-plate-input"
                          className="text-xs font-bold text-zinc-200 whitespace-nowrap"
                        >
                          Plaka Yazısı
                        </label>
                        <div className="flex h-10 items-stretch overflow-hidden rounded-lg border border-white/25 bg-zinc-100 focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-400/40">
                          <span className="flex w-7 items-center justify-center bg-blue-700 font-display text-[10px] font-extrabold text-white select-none">
                            TR
                          </span>
                          <input
                            id="garage-plate-input"
                            type="text"
                            value={licensePlate}
                            onChange={(e) =>
                              onChangeLicensePlate(e.target.value)
                            }
                            onPointerDown={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                            maxLength={10}
                            placeholder="VİRAJ 34"
                            autoComplete="off"
                            spellCheck={false}
                            aria-label="Özel Plaka Metni"
                            className="w-32 sm:w-36 bg-transparent px-2 text-center font-display text-sm font-extrabold uppercase tracking-wider text-zinc-950 placeholder:text-zinc-400 focus:outline-none"
                          />
                        </div>
                      </div>

                      {(() => {
                        const classicPlates = PLATE_STYLES.filter((p) => !p.animated);
                        const animatedPlates = PLATE_STYLES.filter((p) => Boolean(p.animated));
                        const renderPlateCard = (ps: (typeof PLATE_STYLES)[number]) => {
                          const isUnlocked =
                            visualUnlocks.plateStyle.includes(ps.id);
                          const isEquipped =
                            equippedCustom.plateStyle === ps.id;
                          const isSelected =
                            inspectedCustom.plateStyle === ps.id;
                          return (
                            <button
                              key={ps.id}
                              type="button"
                              onClick={() =>
                                handleSelectVisual(
                                  'plateStyle',
                                  ps.id,
                                  visualUnlocks.plateStyle,
                                )
                              }
                              className={`relative flex flex-col items-center justify-between gap-1.5 overflow-hidden rounded-xl border px-2.5 pt-3 pb-2.5 text-center transition-colors cursor-pointer ${getRarityCardClass(ps.rarity, isSelected, isUnlocked)}`}
                            >
                              <span
                                aria-hidden="true"
                                className={`pointer-events-none absolute inset-x-0 top-0 h-[2.5px] ${ITEM_RARITY_META[ps.rarity].barClass}`}
                              />
                              <span
                                className="relative flex h-5 w-16 items-center justify-center rounded-xs text-[9px] font-extrabold tracking-wider shadow-xs"
                                style={{
                                  background: ps.bgSwatch,
                                  border: `1.5px solid ${ps.frameSwatch}`,
                                  color: ps.textSwatch ?? '#f4f4f5',
                                  boxShadow: ps.animated
                                    ? `0 0 8px ${ps.frameSwatch}66`
                                    : undefined,
                                }}
                              >
                                TR 34
                              </span>
                              <span className="w-full truncate font-display text-xs font-bold">
                                {ps.name}
                              </span>
                              <RarityLabel
                                rarity={ps.rarity}
                                selected={isSelected}
                                compact
                              />
                              <span
                                className={`text-[11px] font-bold font-mono-num ${
                                  isSelected
                                    ? isEquipped
                                      ? 'text-emerald-700'
                                      : isUnlocked
                                        ? 'text-zinc-700'
                                        : 'text-amber-700'
                                    : isEquipped
                                      ? 'text-emerald-400'
                                      : isUnlocked
                                        ? 'text-zinc-400'
                                        : 'text-amber-400'
                                }`}
                              >
                                {isEquipped
                                  ? 'Takılı'
                                  : isUnlocked
                                    ? 'Garajda'
                                    : ps.levelRoadLevel
                                      ? `Sv.${ps.levelRoadLevel} Özel`
                                      : `${ps.priceGold} Altın`}
                              </span>
                            </button>
                          );
                        };
                        return (
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between px-0.5">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                                Klasik & Özel Plakalıklar
                              </span>
                              <span className="text-[11px] text-zinc-500">
                                {classicPlates.length} model
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {classicPlates.map(renderPlateCard)}
                            </div>

                            <div className="mt-1 flex items-center justify-between px-0.5">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">
                                Animasyonlu Plakalıklar
                              </span>
                              <span className="text-[11px] text-zinc-500">
                                Canlı LED & mekanik efekt
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {animatedPlates.map(renderPlateCard)}
                            </div>
                          </div>
                        );
                      })()}

                      {renderUnlockBar(
                        'plateStyle',
                        inspectedPlateStyle.id,
                        inspectedPlateStyle.name,
                        inspectedPlateStyle.subtitle,
                        inspectedPlateStyle.priceGold,
                        visualUnlocks.plateStyle,
                        inspectedPlateStyle.rarity,
                        inspectedPlateStyle.levelRoadLevel,
                      )}
                    </>
                  )}
                </div>
              );
            })()}

            </div>

            {/* Primary Garage Footer CTA — Pinned at bottom on BOTH mobile & desktop */}
            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-white/10 pt-2.5">
              {isActiveUnlocked ? (
                <button
                  type="button"
                  onClick={onStart}
                  className="flex min-h-[48px] md:min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 font-display text-base md:text-sm font-extrabold text-zinc-950 shadow-[0_4px_18px_rgba(245,158,11,0.25)] transition-colors hover:bg-amber-400 whitespace-nowrap cursor-pointer"
                >
                  <Play className="h-4.5 w-4.5 md:h-4 md:w-4 fill-current" />
                  <span>Bu Araçla Sür</span>
                </button>
              ) : (
                <div className="flex w-full items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onRentCar(activeModel.id, activeModel.name)}
                    className="flex min-h-[48px] md:min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-amber-400/50 bg-amber-500/16 px-3 font-display text-xs sm:text-sm font-bold text-amber-200 transition-colors hover:bg-amber-500/26 whitespace-nowrap cursor-pointer"
                  >
                    <PlayCircle className="h-4 w-4 text-amber-400 shrink-0" />
                    <span className="truncate">1 Koşu Kirala</span>
                  </button>

                  {canAffordActive ? (
                    <button
                      type="button"
                      onClick={() => onUnlockCar(activeModel.id)}
                      className="flex min-h-[48px] md:min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-3 font-display text-xs sm:text-sm font-extrabold text-zinc-950 transition-colors hover:bg-emerald-400 whitespace-nowrap cursor-pointer"
                    >
                      <Unlock className="h-4 w-4 shrink-0" />
                      <span>Aç · {activeModel.priceGold}</span>
                    </button>
                  ) : (
                    (() => {
                      const missing = Math.max(
                        1,
                        activeModel.priceGold - goldCoins,
                      );
                      const topUp = missing <= 80 ? missing : 75;
                      return (
                        <button
                          type="button"
                          onClick={() =>
                            onWatchAdTopUpGold(topUp, activeModel.name)
                          }
                          className="flex min-h-[48px] md:min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-sky-400/50 bg-sky-500/18 px-3 font-display text-xs sm:text-sm font-bold text-sky-200 hover:bg-sky-500/28 whitespace-nowrap cursor-pointer"
                        >
                          <PlayCircle className="h-4 w-4 text-sky-400 shrink-0" />
                          <span>+{topUp} Altın</span>
                        </button>
                      );
                    })()
                  )}
                </div>
              )}
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

      {/* Mobile initial gesture hint — Placed cleanly above frameless bottom dual instruments */}
      {isPlaying && showSteerHint && (
        <div className="pointer-events-none fixed bottom-24 left-1/2 -translate-x-1/2 max-w-[calc(100vw-2rem)] sm:hidden">
          <div className="flex items-center gap-2 rounded-2xl border border-white/14 bg-zinc-950/92 px-3.5 py-2 text-xs font-medium text-zinc-200 whitespace-nowrap shadow-xl">
            <MoveHorizontal className="h-4 w-4 text-amber-400 shrink-0" />
            <span>Kaydırarak sür · Çift tıkla: Nitro</span>
          </div>
        </div>
      )}
    </div>
  );
});

GameHud.displayName = 'GameHud';

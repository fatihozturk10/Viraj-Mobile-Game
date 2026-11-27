import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowUp,
  Camera,
  CarFront,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Coins,
  Crown,
  Eye,
  EyeOff,
  Flame,
  Fuel,
  Gauge,
  Gem,
  Gift,
  HeartPulse,
  Lock,
  Magnet,
  Palette,
  Play,
  PlayCircle,
  Plus,
  ShieldCheck,
  Sparkles,
  Unlock,
  Zap,
} from 'lucide-react';
import { StoreTabId } from './StoreModal';
import { UpgradeLevelMeter } from './DriverLevelEmblem';
import {
  BODY_KITS,
  BodyKitId,
  CAR_COLORS,
  CAR_MODELS,
  CarColorId,
  CarCustomConfig,
  CarModelId,
  CarUpgradeKey,
  CarUpgrades,
  CarWheelConfig,
  DRIFT_SMOKES,
  GarageCameraFocus,
  HEADLIGHTS,
  ItemRarity,
  LIVERIES,
  LiveryId,
  MAX_POWERUP_UPGRADE_LEVEL,
  MAX_UPGRADE_LEVEL,
  MIRROR_CHARMS,
  NITRO_FLAMES,
  PAINT_FINISHES,
  PLATE_STYLES,
  POWERUP_SPECS,
  PlayerLevelInfo,
  PowerUpId,
  PowerUpUpgradeTrack,
  PowerUpUpgrades,
  ROOF_HATS,
  SPOILERS,
  STEERING_WHEELS,
  SpoilerId,
  UPGRADE_COSTS,
  UPGRADE_SPECS,
  UNDERGLOWS,
  VisualCategory,
  VisualUnlocks,
  WHEEL_COLORS,
  WHEEL_STYLES,
  WheelColorId,
  WheelStyleId,
  getDefaultCustomForCar,
  getDefaultWheelForCar,
  getNitroDurationSec,
  getTuningClassForUpgrades,
  CameraMode,
} from '../types/game';

export interface GarageViewProps {
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
  muted: boolean;
  carModel: CarModelId;
  carColor: CarColorId;
  licensePlate: string;
  cameraMode: CameraMode;
  garageMenuCollapsed: boolean;
  garageBrightMode: boolean;
  unlockedCarColors: CarColorId[];
  onStart: () => void;
  onReturnMenu: () => void;
  onToggleGarageMenu: () => void;
  onToggleMute: () => void;
  onToggleGarageLight: () => void;
  onOpenStore: (tab?: StoreTabId) => void;
  onSelectModel: (id: CarModelId) => void;
  onUnlockCar: (id: CarModelId) => void;
  onUpgradePart: (carId: CarModelId, part: CarUpgradeKey) => void;
  onUpgradePowerUp: (id: PowerUpId, track: PowerUpUpgradeTrack) => void;
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
  onWatchAdTopUpGold: (amount: number, targetLabel: string) => void;
  onRentCar: (carId: CarModelId, carName: string) => void;
  onOpenLevelRoad: (focusLevel?: number) => void;
}

type MainGarageTab = 'car' | 'upgrades' | 'style' | 'powerups';
type StyleSubTab =
  | 'paint'
  | 'livery'
  | 'wheels'
  | 'kit'
  | 'spoiler'
  | 'neon'
  | 'headlight'
  | 'fx'
  | 'plate'
  | 'hat'
  | 'steering'
  | 'mirror';

const RARITY_STYLE: Record<
  ItemRarity,
  { label: string; textHex: string; pillBg: string; pillText: string }
> = {
  common: {
    label: 'Yaygın',
    textHex: '#94a3b8',
    pillBg: 'rgba(148, 163, 184, 0.16)',
    pillText: '#cbd5e1',
  },
  rare: {
    label: 'Nadir',
    textHex: '#38bdf8',
    pillBg: 'rgba(56, 189, 248, 0.16)',
    pillText: '#7dd3fc',
  },
  epic: {
    label: 'Destansı',
    textHex: '#a78bfa',
    pillBg: 'rgba(167, 139, 250, 0.18)',
    pillText: '#c4b5fd',
  },
  legendary: {
    label: 'Efsanevi',
    textHex: '#fb7185',
    pillBg: 'rgba(190, 24, 93, 0.34)',
    pillText: '#fda4af',
  },
};

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
                : styleId === 'animVenomRing'
                  ? '#84cc16'
                  : styleId === 'animRubyPulse'
                    ? '#f43f5e'
                    : styleId === 'animReactor'
                      ? '#27272a'
                      : color;
  return (
    <svg viewBox="0 0 40 40" className="h-11 w-11 shrink-0" aria-hidden="true">
      <circle
        cx="20"
        cy="20"
        r="18"
        fill="#14161f"
        stroke="#27272a"
        strokeWidth="2.4"
      />
      {styleId === 'aeroDisc' && (
        <circle
          cx="20"
          cy="20"
          r="16.2"
          fill="none"
          stroke="#ef4444"
          strokeWidth="1.4"
        />
      )}
      {styleId === 'wireClassic' && (
        <circle
          cx="20"
          cy="20"
          r="16.1"
          fill="none"
          stroke="#f4f4f5"
          strokeWidth="2.1"
        />
      )}
      {styleId === 'animNeonPulse' && (
        <circle
          cx="20"
          cy="20"
          r="16.2"
          fill="none"
          stroke={glowColor}
          strokeWidth="1.4"
          opacity="0.88"
        />
      )}
      {styleId === 'animReactor' && (
        <circle
          cx="20"
          cy="20"
          r="16.2"
          fill="none"
          stroke={glowColor}
          strokeWidth="1.25"
          strokeDasharray="5 2.5"
        />
      )}
      {styleId === 'animMagma' && (
        <circle
          cx="20"
          cy="20"
          r="16.2"
          fill="none"
          stroke="#fb923c"
          strokeWidth="1.5"
        />
      )}
      {styleId === 'animCyberGrid' && (
        <circle
          cx="20"
          cy="20"
          r="16.2"
          fill="none"
          stroke="#22d3ee"
          strokeWidth="1.4"
        />
      )}
      {styleId === 'animPrismVortex' && (
        <circle
          cx="20"
          cy="20"
          r="16.2"
          fill="none"
          stroke="#f472b6"
          strokeWidth="1.5"
        />
      )}
      {styleId === 'animVenomRing' && (
        <circle
          cx="20"
          cy="20"
          r="16.2"
          fill="none"
          stroke="#84cc16"
          strokeWidth="1.5"
        />
      )}
      {styleId === 'animRubyPulse' && (
        <circle
          cx="20"
          cy="20"
          r="16.2"
          fill="none"
          stroke="#f43f5e"
          strokeWidth="1.5"
        />
      )}
      <circle
        cx="20"
        cy="20"
        r="13.5"
        fill={styleId === 'aeroDisc' ? '#27272a' : 'none'}
        stroke={outerRingColor}
        strokeWidth={
          styleId === 'deepdish' || styleId === 'offroadBead' ? 2.4 : 1.8
        }
      />
      {styleId === 'twin5' &&
        [0, 72, 144, 216, 288].map((deg) => (
          <g key={deg} transform={`rotate(${deg} 20 20)`}>
            <line
              x1="20"
              y1="20"
              x2="17.5"
              y2="7.5"
              stroke={color}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <line
              x1="20"
              y1="20"
              x2="22.5"
              y2="7.5"
              stroke={color}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </g>
        ))}
      {styleId === 'multispoke' && (
        <>
          <circle
            cx="20"
            cy="20"
            r="8.2"
            fill="none"
            stroke={color}
            strokeWidth="1"
            opacity="0.7"
          />
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
          <circle
            cx="20"
            cy="20"
            r="10.8"
            fill="none"
            stroke="#a1a1aa"
            strokeWidth="1.1"
          />
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
          <circle
            cx="20"
            cy="20"
            r="11.5"
            fill="none"
            stroke="#27272a"
            strokeWidth="1.5"
          />
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
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(
            (deg) => (
              <circle
                key={deg}
                cx={20 + Math.cos((deg * Math.PI) / 180) * 12.2}
                cy={20 + Math.sin((deg * Math.PI) / 180) * 12.2}
                r="0.9"
                fill="#e4e4e7"
              />
            ),
          )}
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
              <line
                x1="20"
                y1="20"
                x2="20"
                y2="12"
                stroke={color}
                strokeWidth="1.2"
              />
              <line
                x1="20"
                y1="12"
                x2="17.5"
                y2="7.2"
                stroke={color}
                strokeWidth="1.1"
              />
              <line
                x1="20"
                y1="12"
                x2="22.5"
                y2="7.2"
                stroke={color}
                strokeWidth="1.1"
              />
            </g>
          ))}
        </>
      )}
      {styleId === 'forgedY' &&
        [0, 60, 120, 180, 240, 300].map((deg) => (
          <g key={deg} transform={`rotate(${deg} 20 20)`}>
            <line
              x1="20"
              y1="20"
              x2="20"
              y2="14.5"
              stroke={color}
              strokeWidth="1.7"
              strokeLinecap="round"
            />
            <line
              x1="20"
              y1="14.5"
              x2="16.8"
              y2="7.5"
              stroke={color}
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            <line
              x1="20"
              y1="14.5"
              x2="23.2"
              y2="7.5"
              stroke={color}
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </g>
        ))}
      {styleId === 'aeroDisc' && (
        <>
          <circle
            cx="20"
            cy="20"
            r="8"
            fill="none"
            stroke="#ef4444"
            strokeWidth="1.3"
          />
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(
            (deg) => (
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
            ),
          )}
        </>
      )}
      {styleId === 'wireClassic' &&
        [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
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
      {styleId === 'animNeonPulse' && (
        <>
          <circle
            cx="20"
            cy="20"
            r="7.5"
            fill="none"
            stroke={glowColor}
            strokeWidth="1.4"
            opacity="0.85"
          />
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
          <circle
            cx="20"
            cy="20"
            r="7.6"
            fill="none"
            stroke="#facc15"
            strokeWidth="1.5"
          />
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
          <circle
            cx="20"
            cy="20"
            r="10.2"
            fill="none"
            stroke="#e879f9"
            strokeWidth="1.35"
            strokeDasharray="4 2"
          />
          <circle
            cx="20"
            cy="20"
            r="6.4"
            fill="none"
            stroke="#22d3ee"
            strokeWidth="1.4"
          />
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
          <circle
            cx="20"
            cy="20"
            r="7.6"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="1.4"
          />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
            <path
              key={deg}
              d="M20 20 Q24 14 27 9.5"
              fill="none"
              stroke={
                [
                  '#f43f5e',
                  '#f59e0b',
                  '#22c55e',
                  '#06b6d4',
                  '#818cf8',
                  '#e879f9',
                  '#38bdf8',
                  '#fb7185',
                ][i]
              }
              strokeWidth="1.8"
              strokeLinecap="round"
              transform={`rotate(${deg} 20 20)`}
            />
          ))}
        </>
      )}
      {styleId === 'triBlade' &&
        [0, 120, 240].map((deg) => (
          <line
            key={deg}
            x1="20"
            y1="20"
            x2="20"
            y2="7.2"
            stroke={color}
            strokeWidth="4.2"
            strokeLinecap="round"
            transform={`rotate(${deg} 20 20)`}
          />
        ))}
      {styleId === 'meshBBS' && (
        <>
          <circle cx="20" cy="20" r="8.2" fill="none" stroke={color} strokeWidth="1.1" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <g key={deg} transform={`rotate(${deg} 20 20)`}>
              <line x1="20" y1="20" x2="17" y2="7.2" stroke={color} strokeWidth="1.05" />
              <line x1="20" y1="20" x2="23" y2="7.2" stroke={color} strokeWidth="1.05" />
            </g>
          ))}
        </>
      )}
      {styleId === 'hexMono' && (
        <>
          <polygon
            points="20,9 29.5,14.5 29.5,25.5 20,31 10.5,25.5 10.5,14.5"
            fill="none"
            stroke={color}
            strokeWidth="2.1"
          />
          {[0, 60, 120, 180, 240, 300].map((deg) => (
            <line
              key={deg}
              x1="20"
              y1="20"
              x2="20"
              y2="9"
              stroke={color}
              strokeWidth="2.1"
              transform={`rotate(${deg} 20 20)`}
            />
          ))}
        </>
      )}
      {styleId === 'animVenomRing' && (
        <>
          <circle cx="20" cy="20" r="7.5" fill="none" stroke="#34d399" strokeWidth="1.5" />
          {[0, 72, 144, 216, 288].map((deg) => (
            <path
              key={deg}
              d="M20 20 Q24 14 26 8.5"
              fill="none"
              stroke="#84cc16"
              strokeWidth="2.1"
              strokeLinecap="round"
              transform={`rotate(${deg} 20 20)`}
            />
          ))}
        </>
      )}
      {styleId === 'animRubyPulse' && (
        <>
          <circle cx="20" cy="20" r="8.4" fill="none" stroke="#facc15" strokeWidth="1.4" />
          {[0, 60, 120, 180, 240, 300].map((deg) => (
            <path
              key={deg}
              d="M20 20 Q17 14 15 8.5"
              fill="none"
              stroke="#f43f5e"
              strokeWidth="1.9"
              strokeLinecap="round"
              transform={`rotate(${deg} 20 20)`}
            />
          ))}
        </>
      )}
      {styleId === 'wagonWoodWheel' && (
        <>
          <circle cx="20" cy="20" r="15.5" fill="none" stroke="#a1622a" strokeWidth="3.2" />
          <circle cx="20" cy="20" r="17.2" fill="none" stroke="#52525b" strokeWidth="1.3" />
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
            <line
              key={deg}
              x1="20"
              y1="20"
              x2="20"
              y2="5.5"
              stroke="#b45309"
              strokeWidth="1.5"
              transform={`rotate(${deg} 20 20)`}
            />
          ))}
        </>
      )}
      {styleId === 'monsterMudTire' && (
        <>
          <circle cx="20" cy="20" r="14.2" fill="none" stroke="#1f2937" strokeWidth="4.2" />
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
            <rect
              key={deg}
              x="18.2"
              y="1.2"
              width="3.6"
              height="3.6"
              rx="0.6"
              fill="#374151"
              transform={`rotate(${deg} 20 20)`}
            />
          ))}
          <circle cx="20" cy="20" r="9.5" fill="none" stroke="#65a30d" strokeWidth="2" />
        </>
      )}
      {styleId === 'voxelSquareWheel' && (
        <>
          <rect x="4" y="4" width="32" height="32" rx="4" fill="none" stroke="#1e293b" strokeWidth="4.5" />
          <rect x="8.5" y="8.5" width="23" height="23" fill="none" stroke="#64748b" strokeWidth="2.4" />
          <rect x="15" y="15" width="10" height="10" fill="#22d3ee" />
        </>
      )}
      {styleId === 'spikedMadMaxWheel' && (
        <>
          <circle cx="20" cy="20" r="13.5" fill="#27272a" stroke="#7c3a1d" strokeWidth="3.2" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <polygon
              key={deg}
              points="20,1 18,6 22,6"
              fill="#9ca3af"
              transform={`rotate(${deg} 20 20)`}
            />
          ))}
          <circle cx="20" cy="20" r="5" fill="#9a3412" stroke="#d4d4d8" strokeWidth="1.2" />
        </>
      )}
      {styleId === 'hoverMaglevOrb' && (
        <>
          <circle cx="20" cy="20" r="15.2" fill="none" stroke="#22d3ee" strokeWidth="2.4" />
          <circle cx="20" cy="20" r="10.2" fill="none" stroke="#c084fc" strokeWidth="1.6" strokeDasharray="4 2" />
          <circle cx="20" cy="20" r="5.5" fill="#38bdf8" opacity="0.85" />
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
                      : styleId === 'animVenomRing'
                        ? '#84cc16'
                        : styleId === 'animRubyPulse'
                          ? '#facc15'
                          : styleId === 'animNeonPulse' ||
                              styleId === 'animReactor'
                            ? glowColor
                            : '#e4e4e7'
        }
        stroke="#09090b"
        strokeWidth="1"
      />
    </svg>
  );
};

interface PendingUnlockItem {
  label: string;
  priceGold: number;
  levelRoadLevel?: number;
  onUnlock: () => void;
}

const getPaintFinishThumbnailStyle = (
  id: string,
  swatch: string,
): React.CSSProperties => {
  if (id === 'carbon') {
    return {
      background:
        'repeating-linear-gradient(45deg, #272b34 0px, #272b34 5px, #16181f 5px, #16181f 10px)',
    };
  }
  if (id === 'forgedCarbon') {
    return {
      background:
        'repeating-linear-gradient(-45deg, #322949 0px, #322949 5px, #1b1728 5px, #1b1728 10px)',
    };
  }
  if (id === 'matte') {
    return {
      background: 'linear-gradient(145deg, #1b1e25 0%, #111318 100%)',
    };
  }
  return { background: swatch };
};

export const GarageView: React.FC<GarageViewProps> = ({
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
  carModel,
  carColor,
  licensePlate,
  cameraMode,
  garageMenuCollapsed,
  unlockedCarColors,
  onStart,
  onReturnMenu,
  onToggleGarageMenu,
  onOpenStore,
  onSelectModel,
  onUnlockCar,
  onUpgradePart,
  onUpgradePowerUp,
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
  onWatchAdTopUpGold,
  onRentCar,
  onOpenLevelRoad,
}) => {
  const [mainTab, setMainTab] = useState<MainGarageTab>('style');
  const [styleSubTab, setStyleSubTab] = useState<StyleSubTab>('paint');
  const [fxMode, setFxMode] = useState<'nitro' | 'smoke'>('nitro');
  const [previewWheelStyle, setPreviewWheelStyle] =
    useState<WheelStyleId | null>(null);
  const [previewCustom, setPreviewCustom] =
    useState<Partial<CarCustomConfig> | null>(null);

  const stylePillsRef = useRef<HTMLDivElement | null>(null);
  const styleDragRef = useRef<{
    active: boolean;
    startX: number;
    startScrollLeft: number;
    moved: boolean;
  }>({ active: false, startX: 0, startScrollLeft: 0, moved: false });
  const [pillScrollState, setPillScrollState] = useState<{
    left: boolean;
    right: boolean;
  }>({ left: false, right: false });

  const updatePillScrollState = useCallback(() => {
    const el = stylePillsRef.current;
    if (!el) return;
    const left = el.scrollLeft > 4;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
    setPillScrollState((prev) =>
      prev.left === left && prev.right === right ? prev : { left, right },
    );
  }, []);

  useEffect(() => {
    if (mainTab !== 'style' || garageMenuCollapsed) return;
    const raf = window.requestAnimationFrame(updatePillScrollState);
    window.addEventListener('resize', updatePillScrollState);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', updatePillScrollState);
    };
  }, [mainTab, garageMenuCollapsed, updatePillScrollState]);

  const scrollStylePillsBy = (delta: number) => {
    const el = stylePillsRef.current;
    if (!el) return;
    el.scrollBy({ left: delta, behavior: 'smooth' });
  };

  const handleHorizontalWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollWidth <= el.clientWidth) return;
    const delta =
      Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    if (delta !== 0) {
      el.scrollLeft += delta;
      e.preventDefault();
    }
  };

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
  const inspectedCustom: CarCustomConfig = previewCustom
    ? { ...equippedCustom, ...previewCustom }
    : equippedCustom;
  const inspectedWheelStyle: WheelStyleId =
    previewWheelStyle ?? equippedWheel.style;

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
  const inspectedWheelSpec =
    WHEEL_STYLES.find((w) => w.id === inspectedWheelStyle) || WHEEL_STYLES[0];
  const activeWheelColorOpt =
    WHEEL_COLORS.find((c) => c.id === equippedWheel.color) || WHEEL_COLORS[0];
  const activeColorOpt =
    CAR_COLORS.find((c) => c.id === carColor) || CAR_COLORS[0];

  const inspectedFinish =
    PAINT_FINISHES.find((f) => f.id === inspectedCustom.paintFinish) ||
    PAINT_FINISHES[0];
  const inspectedUnderglow =
    UNDERGLOWS.find((u) => u.id === inspectedCustom.underglow) || UNDERGLOWS[0];
  const inspectedHeadlight =
    HEADLIGHTS.find((h) => h.id === inspectedCustom.headlight) || HEADLIGHTS[0];
  const inspectedNitroFlame =
    NITRO_FLAMES.find((n) => n.id === inspectedCustom.nitroFlame) ||
    NITRO_FLAMES[0];
  const inspectedDriftSmoke =
    DRIFT_SMOKES.find((d) => d.id === inspectedCustom.driftSmoke) ||
    DRIFT_SMOKES[0];
  const inspectedPlateStyle =
    PLATE_STYLES.find((p) => p.id === inspectedCustom.plateStyle) ||
    PLATE_STYLES[0];

  const activeNitroDurationSec = getNitroDurationSec(
    activeUpgrades.nitroTank,
    powerUpUpgrades.nitro?.secondary ?? 0,
  );
  const activeTuningClass = getTuningClassForUpgrades(activeUpgrades);
  const modelRarity = RARITY_STYLE[activeModel.rarity];

  useEffect(() => {
    setPreviewWheelStyle(null);
    setPreviewCustom(null);
  }, [carModel]);

  useEffect(() => {
    if (mainTab === 'style' && styleSubTab === 'fx') {
      onGarageEffectPreview(fxMode);
    } else {
      onGarageEffectPreview('none');
    }
    return () => onGarageEffectPreview('none');
  }, [mainTab, styleSubTab, fxMode, onGarageEffectPreview]);

  useEffect(() => {
    let focus: GarageCameraFocus = 'overview';
    if (mainTab === 'style') {
      if (styleSubTab === 'livery') focus = 'livery';
      else if (styleSubTab === 'wheels') focus = 'wheels';
      else if (styleSubTab === 'kit') focus = 'bodykit';
      else if (styleSubTab === 'spoiler') focus = 'spoiler';
      else if (styleSubTab === 'neon') focus = 'neon';
      else if (styleSubTab === 'headlight') focus = 'headlight';
      else if (styleSubTab === 'plate') focus = 'plate';
      else if (styleSubTab === 'hat') focus = 'roof';
      else if (styleSubTab === 'steering') focus = 'steering';
      else if (styleSubTab === 'mirror') focus = 'mirror';
      else if (styleSubTab === 'fx') {
        focus = fxMode === 'nitro' ? 'exhaust' : 'smoke';
      } else {
        focus = 'overview';
      }
    }
    onGarageCameraFocus(focus);
  }, [mainTab, styleSubTab, fxMode, onGarageCameraFocus]);

  const resetAllPreviews = () => {
    setPreviewWheelStyle(null);
    setPreviewCustom(null);
    onPreviewWheel(equippedWheel.style, equippedWheel.color);
    onPreviewCustom(equippedCustom);
  };

  const handleSelectVisual = (
    category: VisualCategory,
    itemId: string,
    unlockedList: string[],
    focusOverride?: GarageCameraFocus,
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
    onGarageCameraFocus(focusOverride ?? focusMap[category]);
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

  const cycleCar = (dir: -1 | 1) => {
    const idx = CAR_MODELS.findIndex((m) => m.id === carModel);
    const next = CAR_MODELS[(idx + dir + CAR_MODELS.length) % CAR_MODELS.length];
    onSelectModel(next.id);
  };

  // Compute active locked item preview for unified bottom CTA button ("Satın Al · 580 Altın")
  let pendingUnlock: PendingUnlockItem | null = null;
  if (mainTab === 'style') {
    if (
      styleSubTab === 'paint' &&
      !visualUnlocks.paintFinish.includes(inspectedFinish.id)
    ) {
      pendingUnlock = {
        label: inspectedFinish.name,
        priceGold: inspectedFinish.priceGold,
        levelRoadLevel: inspectedFinish.levelRoadLevel,
        onUnlock: () => {
          onUnlockVisualItem('paintFinish', inspectedFinish.id, activeModel.id);
          setPreviewCustom(null);
        },
      };
    } else if (
      styleSubTab === 'livery' &&
      !unlockedLiveries.includes(inspectedLiverySpec.id)
    ) {
      pendingUnlock = {
        label: inspectedLiverySpec.name,
        priceGold: inspectedLiverySpec.priceGold,
        onUnlock: () => {
          onUnlockLivery(inspectedLiverySpec.id, activeModel.id);
          setPreviewCustom(null);
        },
      };
    } else if (
      styleSubTab === 'neon' &&
      !visualUnlocks.underglow.includes(inspectedUnderglow.id)
    ) {
      pendingUnlock = {
        label: inspectedUnderglow.name,
        priceGold: inspectedUnderglow.priceGold,
        levelRoadLevel: inspectedUnderglow.levelRoadLevel,
        onUnlock: () => {
          onUnlockVisualItem('underglow', inspectedUnderglow.id, activeModel.id);
          setPreviewCustom(null);
        },
      };
    } else if (
      styleSubTab === 'headlight' &&
      !visualUnlocks.headlight.includes(inspectedHeadlight.id)
    ) {
      pendingUnlock = {
        label: inspectedHeadlight.name,
        priceGold: inspectedHeadlight.priceGold,
        levelRoadLevel: inspectedHeadlight.levelRoadLevel,
        onUnlock: () => {
          onUnlockVisualItem('headlight', inspectedHeadlight.id, activeModel.id);
          setPreviewCustom(null);
        },
      };
    } else if (styleSubTab === 'fx') {
      if (
        fxMode === 'nitro' &&
        !visualUnlocks.nitroFlame.includes(inspectedNitroFlame.id)
      ) {
        pendingUnlock = {
          label: inspectedNitroFlame.name,
          priceGold: inspectedNitroFlame.priceGold,
          levelRoadLevel: inspectedNitroFlame.levelRoadLevel,
          onUnlock: () => {
            onUnlockVisualItem(
              'nitroFlame',
              inspectedNitroFlame.id,
              activeModel.id,
            );
            setPreviewCustom(null);
          },
        };
      } else if (
        fxMode === 'smoke' &&
        !visualUnlocks.driftSmoke.includes(inspectedDriftSmoke.id)
      ) {
        pendingUnlock = {
          label: inspectedDriftSmoke.name,
          priceGold: inspectedDriftSmoke.priceGold,
          levelRoadLevel: inspectedDriftSmoke.levelRoadLevel,
          onUnlock: () => {
            onUnlockVisualItem(
              'driftSmoke',
              inspectedDriftSmoke.id,
              activeModel.id,
            );
            setPreviewCustom(null);
          },
        };
      }
    } else if (
      styleSubTab === 'plate' &&
      !visualUnlocks.plateStyle.includes(inspectedPlateStyle.id)
    ) {
      pendingUnlock = {
        label: inspectedPlateStyle.name,
        priceGold: inspectedPlateStyle.priceGold,
        levelRoadLevel: inspectedPlateStyle.levelRoadLevel,
        onUnlock: () => {
          onUnlockVisualItem(
            'plateStyle',
            inspectedPlateStyle.id,
            activeModel.id,
          );
          setPreviewCustom(null);
        },
      };
    } else if (
      styleSubTab === 'wheels' &&
      !unlockedWheelStyles.includes(inspectedWheelStyle)
    ) {
      pendingUnlock = {
        label: inspectedWheelSpec.name,
        priceGold: inspectedWheelSpec.priceGold,
        onUnlock: () => {
          onUnlockWheelStyle(inspectedWheelStyle, activeModel.id);
          setPreviewWheelStyle(null);
        },
      };
    } else if (
      styleSubTab === 'kit' &&
      !unlockedBodyKits.includes(inspectedKitSpec.id)
    ) {
      pendingUnlock = {
        label: inspectedKitSpec.name,
        priceGold: inspectedKitSpec.priceGold,
        onUnlock: () => {
          onUnlockBodyKit(inspectedKitSpec.id, activeModel.id);
          setPreviewCustom(null);
        },
      };
    } else if (
      styleSubTab === 'spoiler' &&
      !unlockedSpoilers.includes(inspectedSpoilerSpec.id)
    ) {
      pendingUnlock = {
        label: inspectedSpoilerSpec.name,
        priceGold: inspectedSpoilerSpec.priceGold,
        onUnlock: () => {
          onUnlockSpoiler(inspectedSpoilerSpec.id, activeModel.id);
          setPreviewCustom(null);
        },
      };
    } else if (
      styleSubTab === 'hat' &&
      !visualUnlocks.roofHat.includes(inspectedHatSpec.id)
    ) {
      pendingUnlock = {
        label: inspectedHatSpec.name,
        priceGold: inspectedHatSpec.priceGold,
        levelRoadLevel: inspectedHatSpec.levelRoadLevel,
        onUnlock: () => {
          onUnlockVisualItem('roofHat', inspectedHatSpec.id, activeModel.id);
          setPreviewCustom(null);
        },
      };
    } else if (
      styleSubTab === 'steering' &&
      !visualUnlocks.steeringWheel.includes(inspectedSteeringSpec.id)
    ) {
      pendingUnlock = {
        label: inspectedSteeringSpec.name,
        priceGold: inspectedSteeringSpec.priceGold,
        levelRoadLevel: inspectedSteeringSpec.levelRoadLevel,
        onUnlock: () => {
          onUnlockVisualItem(
            'steeringWheel',
            inspectedSteeringSpec.id,
            activeModel.id,
          );
          setPreviewCustom(null);
        },
      };
    } else if (
      styleSubTab === 'mirror' &&
      !visualUnlocks.mirrorCharm.includes(inspectedMirrorSpec.id)
    ) {
      pendingUnlock = {
        label: inspectedMirrorSpec.name,
        priceGold: inspectedMirrorSpec.priceGold,
        levelRoadLevel: inspectedMirrorSpec.levelRoadLevel,
        onUnlock: () => {
          onUnlockVisualItem(
            'mirrorCharm',
            inspectedMirrorSpec.id,
            activeModel.id,
          );
          setPreviewCustom(null);
        },
      };
    }
  }

  // Reusable 3-column card matching the reference mockup design
  const renderGridCard = (opts: {
    keyId: string;
    name: string;
    rarity: ItemRarity;
    isSelected: boolean;
    isEquipped: boolean;
    isUnlocked: boolean;
    priceGold: number;
    priceDiamonds?: number;
    levelRoadLevel?: number;
    badgeTag?: string;
    thumbnail: React.ReactNode;
    onClick: () => void;
  }) => {
    const r = RARITY_STYLE[opts.rarity];
    const isDiamondExclusive =
      !opts.isEquipped &&
      !opts.isUnlocked &&
      Boolean(opts.priceDiamonds && opts.priceDiamonds > 0);
    const statusNode: React.ReactNode = opts.isEquipped
      ? 'Seçili ✓'
      : opts.isUnlocked
        ? 'Garajda'
        : opts.levelRoadLevel
          ? `Sv.${opts.levelRoadLevel} Özel`
          : isDiamondExclusive ? (
              <span className="inline-flex items-center gap-1 text-cyan-300">
                <Gem className="h-3 w-3 text-cyan-400 shrink-0" />
                <span>{opts.priceDiamonds} Elmas</span>
              </span>
            ) : (
              `${opts.priceGold.toLocaleString('tr-TR')} Altın`
            );

    return (
      <button
        key={opts.keyId}
        type="button"
        onClick={opts.onClick}
        className={`ug-cut-sm group relative flex flex-col overflow-hidden border p-2 text-left transition-all cursor-pointer ${
          opts.isSelected
            ? 'border-orange-500 bg-[#1c1622] ring-1 ring-orange-500/45 shadow-[0_0_16px_rgba(234,88,12,0.22)]'
            : isDiamondExclusive
              ? 'border-cyan-400/35 bg-[#0e1624] hover:border-cyan-300/65 hover:bg-[#132033]'
              : 'border-white/[0.08] bg-[#131722] hover:border-orange-500/35 hover:bg-[#191f2e]'
        }`}
      >
        {opts.isSelected && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-rose-500 to-orange-400"
          />
        )}
        <div className="ug-cut-sm relative mb-2 h-14 sm:h-16 w-full overflow-hidden border border-white/[0.08] bg-[#0b0d14]">
          {opts.thumbnail}
          {opts.badgeTag && (
            <span className="ug-skew absolute right-1 top-1 bg-zinc-950/90 px-1.5 py-0.5 font-display text-[8.5px] font-extrabold uppercase tracking-wider text-cyan-300 border border-cyan-400/35">
              {opts.badgeTag}
            </span>
          )}
        </div>
        <div className="w-full truncate font-display text-[12px] font-bold leading-tight text-white">
          {opts.name}
        </div>
        <div
          className="mt-0.5 w-full truncate font-display text-[10px] font-bold uppercase tracking-wide leading-tight"
          style={{ color: r.textHex }}
        >
          {r.label}
        </div>
        <div
          className={`mt-1 w-full truncate font-mono-num text-[11px] font-semibold leading-tight ${
            opts.isEquipped
              ? 'text-orange-300'
              : opts.isUnlocked
                ? 'text-zinc-300'
                : opts.levelRoadLevel
                  ? 'text-amber-300'
                  : 'text-zinc-200'
          }`}
        >
          {statusNode}
        </div>
      </button>
    );
  };

  const renderPrimaryCta = () => {
    if (pendingUnlock) {
      if (pendingUnlock.levelRoadLevel) {
        return (
          <button
            type="button"
            onClick={() => onOpenLevelRoad(pendingUnlock.levelRoadLevel)}
            className="ug-cut ug-btn-fire flex min-h-[48px] w-full items-center justify-center gap-2 px-4 font-display italic text-[15px] font-extrabold uppercase tracking-wider active:scale-[0.99] cursor-pointer"
          >
            <Crown className="h-4.5 w-4.5 shrink-0" />
            <span>Seviye {pendingUnlock.levelRoadLevel} Yolu · Aç</span>
          </button>
        );
      }

      const canAffordItem = goldCoins >= pendingUnlock.priceGold;
      if (canAffordItem) {
        return (
          <button
            type="button"
            onClick={pendingUnlock.onUnlock}
            className="ug-cut ug-btn-fire flex min-h-[48px] w-full items-center justify-center gap-2 px-4 font-display italic text-[15px] font-extrabold uppercase tracking-wider active:scale-[0.99] cursor-pointer"
          >
            <span>
              Satın Al · {pendingUnlock.priceGold.toLocaleString('tr-TR')} Altın
            </span>
          </button>
        );
      }

      const missing = Math.max(1, pendingUnlock.priceGold - goldCoins);
      const topUp = missing <= 80 ? missing : 75;
      return (
        <button
          type="button"
          onClick={() => onWatchAdTopUpGold(topUp, pendingUnlock.label)}
          className="ug-cut ug-btn-fire flex min-h-[48px] w-full items-center justify-center gap-2 px-4 font-display italic text-sm sm:text-[15px] font-extrabold uppercase tracking-wider active:scale-[0.99] cursor-pointer"
        >
          <PlayCircle className="h-4.5 w-4.5 shrink-0" />
          <span>
            Eksik {missing} Altın · +{topUp} Kazan
          </span>
        </button>
      );
    }

    if (!isActiveUnlocked) {
      if (activeModel.priceDiamonds && activeModel.priceDiamonds > 0) {
        const canAffordDiamonds = diamonds >= activeModel.priceDiamonds;
        if (canAffordDiamonds) {
          return (
            <button
              type="button"
              onClick={() => onUnlockCar(activeModel.id)}
              className="ug-cut flex min-h-[48px] w-full items-center justify-center gap-2 border border-cyan-300/80 bg-gradient-to-r from-cyan-500 via-sky-400 to-cyan-400 px-4 font-display italic text-[15px] font-extrabold uppercase tracking-wider text-zinc-950 shadow-[0_0_22px_rgba(34,211,238,0.4)] hover:brightness-110 active:scale-[0.99] cursor-pointer"
            >
              <Gem className="h-4.5 w-4.5 shrink-0" />
              <span>Elmasla Aç · {activeModel.priceDiamonds} Elmas</span>
            </button>
          );
        }
        return (
          <button
            type="button"
            disabled
            className="ug-cut flex min-h-[48px] w-full items-center justify-center gap-2 border border-cyan-400/35 bg-[#0a1420] px-4 font-display italic text-sm font-extrabold uppercase tracking-wider text-cyan-200/80 opacity-85 cursor-not-allowed"
          >
            <Gem className="h-4 w-4 text-cyan-400 shrink-0" />
            <span>
              Sadece Elmasla · {diamonds}/{activeModel.priceDiamonds} Elmas
            </span>
          </button>
        );
      }

      const missing = Math.max(1, activeModel.priceGold - goldCoins);
      const topUp = missing <= 80 ? missing : 75;
      return (
        <div className="flex w-full items-center gap-2">
          <button
            type="button"
            onClick={() => onRentCar(activeModel.id, activeModel.name)}
            className="ug-cut ug-btn-metal flex min-h-[48px] items-center justify-center gap-1.5 px-4 font-display italic text-xs sm:text-sm font-bold uppercase tracking-wide whitespace-nowrap cursor-pointer"
          >
            <PlayCircle className="h-4 w-4 text-orange-400 shrink-0" />
            <span>Kirala</span>
          </button>
          {canAffordActive ? (
            <button
              type="button"
              onClick={() => onUnlockCar(activeModel.id)}
              className="ug-cut ug-btn-fire flex min-h-[48px] flex-1 items-center justify-center gap-2 px-4 font-display italic text-[15px] font-extrabold uppercase tracking-wider active:scale-[0.99] cursor-pointer"
            >
              <span>
                Satın Al · {activeModel.priceGold.toLocaleString('tr-TR')} Altın
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onWatchAdTopUpGold(topUp, activeModel.name)}
              className="ug-cut ug-btn-fire flex min-h-[48px] flex-1 items-center justify-center gap-1.5 px-4 font-display italic text-sm font-extrabold uppercase tracking-wider active:scale-[0.99] cursor-pointer"
            >
              <PlayCircle className="h-4 w-4 shrink-0" />
              <span>+{topUp} Altın İzle</span>
            </button>
          )}
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={onStart}
        className="ug-cut ug-btn-fire flex min-h-[48px] w-full items-center justify-center gap-2 px-4 font-display italic text-[15px] font-extrabold uppercase tracking-wider active:scale-[0.99] cursor-pointer"
      >
        <Play className="h-4 w-4 fill-current" />
        <span>Sokağa Çık · Sür</span>
      </button>
    );
  };

  const renderCockpitBanner = (hintText: string) => (
    <div className="ug-cut-sm mb-2.5 flex items-center justify-between gap-2 border border-white/[0.09] bg-[#141824] px-3 py-2">
      <div className="flex items-center gap-2 min-w-0">
        <Camera className="h-3.5 w-3.5 text-orange-400 shrink-0" />
        <span className="truncate text-[11px] font-medium text-zinc-300">
          {hintText}
        </span>
      </div>
      {cameraMode === 'cockpit' ? (
        <span className="inline-flex items-center gap-1 font-display text-[11px] font-bold uppercase text-emerald-400 whitespace-nowrap shrink-0">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>Kokpit Aktif</span>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => onSelectCamera('cockpit')}
          className="ug-skew inline-flex min-h-[30px] items-center bg-orange-500/20 border border-orange-400/50 px-2.5 font-display text-[11px] font-bold uppercase text-orange-200 hover:bg-orange-500/30 whitespace-nowrap shrink-0 cursor-pointer"
        >
          Kokpiti Seç
        </button>
      )}
    </div>
  );

  const isFullWrapActive = Boolean(inspectedLiverySpec.overridesBaseColor);
  const isFixedFinishActive = inspectedFinish.colorMode === 'fixed';
  const isWheelColorLocked = inspectedWheelSpec.colorMode === 'fixed';

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between">
      {/* TOP FLOATING UNDERGROUND WORKSHOP BAR */}
      <div
        className="relative flex items-start justify-between px-4"
        style={{ paddingTop: 'max(0.85rem, env(safe-area-inset-top))' }}
      >
        {/* Top-Left: Chamfered Back Button + Underground Tag */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onReturnMenu}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Ana Menüye Dön"
            className="ug-cut-sm ug-btn-metal pointer-events-auto flex h-11 w-11 items-center justify-center active:scale-95 cursor-pointer"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="ug-skew hidden sm:flex items-center border border-orange-500/35 bg-[#0b0d14]/88 px-3 py-1.5">
            <span className="font-display italic text-xs font-extrabold tracking-widest uppercase text-orange-300">
              UNDERGROUND ATÖLYE
            </span>
          </div>
        </div>

        {/* Top-Right: Diamond + Gold Capsules & Right Vertical Showroom Controls */}
        <div className="flex flex-col items-end gap-2.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenStore('gold')}
              onPointerDown={(e) => e.stopPropagation()}
              title="Elmas ile Altın Al"
              className="ug-cut-sm pointer-events-auto flex h-11 items-center gap-1.5 border border-cyan-400/40 bg-[#0a1420]/92 px-3 shadow-lg transition-colors hover:border-cyan-300 cursor-pointer"
            >
              <Gem className="h-4 w-4 text-cyan-400 shrink-0" />
              <span className="font-mono-num text-sm font-extrabold tracking-tight text-cyan-200">
                {diamonds.toLocaleString('tr-TR')}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onOpenStore('gold')}
              onPointerDown={(e) => e.stopPropagation()}
              title="Altın Marketini Aç"
              className="ug-cut-sm pointer-events-auto group flex h-11 items-center gap-2.5 border border-amber-400/35 bg-[#0c0f18]/92 pl-3.5 pr-1.5 shadow-lg transition-colors hover:border-orange-400/75 cursor-pointer"
            >
              <span className="font-mono-num text-sm font-extrabold tracking-tight text-amber-300">
                {goldCoins.toLocaleString('tr-TR')}
              </span>
              <span className="ug-cut-sm ug-btn-fire flex h-8 w-8 items-center justify-center text-white">
                <Plus className="h-4 w-4 stroke-[3]" />
              </span>
            </button>
          </div>

          {/* Right Vertical Floating Showroom Controls */}
          <div className="pointer-events-auto flex flex-col gap-2.5">
            <button
              type="button"
              onClick={onToggleGarageMenu}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label={garageMenuCollapsed ? 'Paneli Göster' : 'Paneli Gizle'}
              title={garageMenuCollapsed ? 'Paneli Göster' : 'Paneli Gizle'}
              className={`ug-cut-sm flex h-11 w-11 items-center justify-center border shadow-lg transition-colors active:scale-95 cursor-pointer ${
                garageMenuCollapsed
                  ? 'border-orange-400/70 bg-orange-500/20 text-orange-300'
                  : 'ug-btn-metal'
              }`}
            >
              {garageMenuCollapsed ? (
                <Eye className="h-5 w-5" />
              ) : (
                <EyeOff className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* LOWER STAGE: Floating Car Switcher Strip + Bottom Underground Mod Drawer */}
      <div className="flex w-full flex-col items-center">
        {/* FLOATING CAR NAME & RARITY SELECTOR */}
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="pointer-events-auto flex w-full max-w-[548px] items-center justify-between gap-3 px-4 pb-2.5"
        >
          <button
            type="button"
            onClick={() => cycleCar(-1)}
            aria-label="Önceki Araç"
            className="ug-cut-sm ug-btn-metal flex h-10 w-10 shrink-0 items-center justify-center active:scale-95 cursor-pointer"
          >
            <ChevronLeft className="h-5 w-5 text-orange-300" />
          </button>

          <div className="flex min-w-0 flex-1 flex-col items-center text-center">
            <h2 className="w-full truncate font-display italic text-lg sm:text-xl font-black uppercase tracking-wide text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">
              {activeModel.name}
            </h2>
            <div className="mt-1 flex items-center justify-center gap-1.5">
              <span
                className="ug-skew px-2.5 py-0.5 font-display text-[10px] font-extrabold uppercase tracking-[0.14em]"
                style={{
                  backgroundColor: modelRarity.pillBg,
                  color: modelRarity.pillText,
                }}
              >
                {modelRarity.label}
              </span>
              <span
                className={`ug-skew border border-white/12 bg-[#0c0f18]/90 px-2 py-0.5 font-display text-[10px] font-extrabold uppercase tracking-wider ${activeTuningClass.textClass}`}
              >
                {activeTuningClass.label}
              </span>
              {!isActiveUnlocked &&
                (activeModel.priceDiamonds && activeModel.priceDiamonds > 0 ? (
                  <span className="ug-skew inline-flex items-center gap-1 border border-cyan-400/45 bg-cyan-500/20 px-2 py-0.5 font-mono-num text-[10px] font-extrabold text-cyan-200">
                    <Gem className="h-2.5 w-2.5 text-cyan-400" />
                    <span>{activeModel.priceDiamonds} ELMAS</span>
                  </span>
                ) : (
                  <span className="ug-skew inline-flex items-center gap-1 bg-orange-500/25 px-2 py-0.5 font-mono-num text-[10px] font-extrabold text-orange-200">
                    <Lock className="h-2.5 w-2.5" />
                    <span>{activeModel.priceGold.toLocaleString('tr-TR')}</span>
                  </span>
                ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => cycleCar(1)}
            aria-label="Sonraki Araç"
            className="ug-cut-sm ug-btn-metal flex h-10 w-10 shrink-0 items-center justify-center active:scale-95 cursor-pointer"
          >
            <ChevronRight className="h-5 w-5 text-orange-300" />
          </button>
        </div>

        {/* COLLAPSED MODE MINI CTA */}
        {garageMenuCollapsed ? (
          <div
            onPointerDown={(e) => e.stopPropagation()}
            className="pointer-events-auto w-full max-w-[420px] px-4"
            style={{
              paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
            }}
          >
            {renderPrimaryCta()}
          </div>
        ) : (
          /* EXPANDED UNDERGROUND MOD SHOP DRAWER */
          <div
            onPointerDown={(e) => e.stopPropagation()}
            className="pointer-events-auto animate-sheet-up ug-sheet flex h-[54dvh] max-h-[54dvh] w-full max-w-[548px] flex-col overflow-hidden rounded-t-2xl border-t border-x"
          >
            {/* Drag Handle Indicator */}
            <button
              type="button"
              onClick={onToggleGarageMenu}
              aria-label="Paneli Daralt"
              className="flex w-full shrink-0 items-center justify-center pt-2.5 pb-2 cursor-pointer"
            >
              <span className="h-1 w-11 rounded-full bg-orange-400/45 transition-colors hover:bg-orange-400/75" />
            </button>

            {/* SUB-CATEGORY PILLS ROW (Style tab) */}
            {mainTab === 'style' && (
              <div className="relative shrink-0 pb-2.5">
                {pillScrollState.left && (
                  <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center bg-gradient-to-r from-[#0b0d14] via-[#0b0d14]/90 to-transparent pb-2.5 pl-2 pr-4">
                    <button
                      type="button"
                      onClick={() => scrollStylePillsBy(-160)}
                      aria-label="Sola Kaydır"
                      className="ug-cut-sm ug-btn-metal pointer-events-auto flex h-7 w-7 items-center justify-center active:scale-95 cursor-pointer"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                  </div>
                )}

                <div
                  ref={stylePillsRef}
                  onScroll={updatePillScrollState}
                  onWheel={handleHorizontalWheel}
                  onPointerDown={(e) => {
                    if (e.pointerType !== 'mouse') return;
                    const el = stylePillsRef.current;
                    if (!el) return;
                    styleDragRef.current = {
                      active: true,
                      startX: e.clientX,
                      startScrollLeft: el.scrollLeft,
                      moved: false,
                    };
                  }}
                  onPointerMove={(e) => {
                    if (!styleDragRef.current.active) return;
                    const el = stylePillsRef.current;
                    if (!el) return;
                    const dx = e.clientX - styleDragRef.current.startX;
                    if (Math.abs(dx) > 5) {
                      styleDragRef.current.moved = true;
                    }
                    el.scrollLeft = styleDragRef.current.startScrollLeft - dx;
                  }}
                  onPointerUp={() => {
                    styleDragRef.current.active = false;
                  }}
                  onPointerLeave={() => {
                    styleDragRef.current.active = false;
                  }}
                  onPointerCancel={() => {
                    styleDragRef.current.active = false;
                  }}
                  className="flex items-center gap-1.5 overflow-x-auto no-scrollbar touch-pan-x px-4 select-none"
                >
                  {(
                    [
                      { id: 'paint', label: 'Boya' },
                      { id: 'livery', label: 'Kaplama' },
                      { id: 'wheels', label: 'Tekerlekler' },
                      { id: 'kit', label: 'Gövde Kiti' },
                      { id: 'spoiler', label: 'Rüzgarlık' },
                      { id: 'neon', label: 'Neon' },
                      { id: 'headlight', label: 'Far' },
                      { id: 'fx', label: 'Efekt' },
                      { id: 'plate', label: 'Plaka' },
                      { id: 'hat', label: 'Şapka' },
                      { id: 'steering', label: 'Direksiyon' },
                      { id: 'mirror', label: 'Ayna' },
                    ] as const
                  ).map((st) => {
                    const active = styleSubTab === st.id;
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={(e) => {
                          if (styleDragRef.current.moved) {
                            styleDragRef.current.moved = false;
                            return;
                          }
                          resetAllPreviews();
                          setStyleSubTab(st.id);
                          e.currentTarget.scrollIntoView({
                            behavior: 'smooth',
                            inline: 'center',
                            block: 'nearest',
                          });
                        }}
                        className={`ug-skew shrink-0 px-3.5 py-1.5 font-display italic text-xs font-bold uppercase tracking-wide transition-all whitespace-nowrap cursor-pointer ${
                          active
                            ? 'ug-tab-active'
                            : 'border border-white/[0.09] bg-[#151926] text-zinc-300 hover:border-orange-500/40 hover:text-white'
                        }`}
                      >
                        {st.label}
                      </button>
                    );
                  })}
                </div>

                {pillScrollState.right && (
                  <div className="pointer-events-none absolute inset-y-0 right-0 z-10 flex items-center bg-gradient-to-l from-[#0b0d14] via-[#0b0d14]/90 to-transparent pb-2.5 pl-4 pr-2">
                    <button
                      type="button"
                      onClick={() => scrollStylePillsBy(160)}
                      aria-label="Sağa Kaydır"
                      className="ug-cut-sm ug-btn-metal pointer-events-auto flex h-7 w-7 items-center justify-center active:scale-95 cursor-pointer"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* SCROLLABLE CONTENT AREA */}
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden touch-pan-y custom-scroll px-4 pb-3">
              {/* ====== TAB: STİL ====== */}
              {mainTab === 'style' && styleSubTab === 'paint' && (
                <div className="flex flex-col gap-2.5">
                  {/* Compact Paint Color Swatch Strip (if colorable) */}
                  {isFullWrapActive ? (
                    <div className="flex items-center justify-between gap-2 rounded-xl border border-purple-400/25 bg-[#191826] px-3 py-2">
                      <span className="truncate text-[11px] font-semibold text-purple-200">
                        {inspectedLiverySpec.name} kaplaması aktif
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewCustom((prev) =>
                            prev ? { ...prev, livery: undefined } : null,
                          );
                          onEquipLivery(activeModel.id, 'solid');
                        }}
                        className="shrink-0 rounded-lg border border-white/12 bg-[#232634] px-2.5 py-1 text-[11px] font-bold text-zinc-100 hover:border-amber-400/50 cursor-pointer"
                      >
                        Kaldır
                      </button>
                    </div>
                  ) : isFixedFinishActive ? (
                    <div className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.07] bg-[#161a24] px-3 py-2">
                      <span className="truncate text-[11px] text-zinc-300">
                        {inspectedFinish.name} özel rengini kullanır
                      </span>
                      <span className="shrink-0 text-[10px] font-bold text-amber-300">
                        Özel Renk
                      </span>
                    </div>
                  ) : (
                    <div
                      onWheel={handleHorizontalWheel}
                      className="flex items-center gap-2 overflow-x-auto no-scrollbar touch-pan-x py-0.5"
                    >
                      <span className="shrink-0 text-[11px] font-bold text-zinc-400">
                        Renk:
                      </span>
                      {CAR_COLORS.map((c) => {
                        const active = c.id === carColor;
                        const isColorLocked = Boolean(
                          c.levelRoadLevel && !unlockedCarColors.includes(c.id),
                        );
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
                                ? `${c.label} · Sv.${c.levelRoadLevel}`
                                : c.label
                            }
                            aria-label={c.label}
                            className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-transform cursor-pointer ${
                              active
                                ? 'scale-110 border-[#f59e0b]'
                                : 'border-white/15 hover:border-white/40'
                            }`}
                            style={{ backgroundColor: c.swatch }}
                          >
                            {isColorLocked && (
                              <Lock className="h-3 w-3 text-amber-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]" />
                            )}
                          </button>
                        );
                      })}
                      <span className="ml-auto shrink-0 text-[11px] font-semibold text-zinc-300">
                        {activeColorOpt.label}
                      </span>
                    </div>
                  )}

                  {/* 3-Column Paint Finishes Grid */}
                  <div className="grid grid-cols-3 gap-2.5">
                    {PAINT_FINISHES.map((pf) => {
                      const isUnlocked = visualUnlocks.paintFinish.includes(
                        pf.id,
                      );
                      const isEquipped = equippedCustom.paintFinish === pf.id;
                      const isSelected = inspectedCustom.paintFinish === pf.id;
                      return renderGridCard({
                        keyId: pf.id,
                        name: pf.name,
                        rarity: pf.rarity,
                        isSelected,
                        isEquipped,
                        isUnlocked,
                        priceGold: pf.priceGold,
                        levelRoadLevel: pf.levelRoadLevel,
                        thumbnail: (
                          <div
                            className="h-full w-full"
                            style={getPaintFinishThumbnailStyle(
                              pf.id,
                              pf.swatch,
                            )}
                          />
                        ),
                        onClick: () =>
                          handleSelectVisual(
                            'paintFinish',
                            pf.id,
                            visualUnlocks.paintFinish,
                          ),
                      });
                    })}
                  </div>
                </div>
              )}

              {mainTab === 'style' && styleSubTab === 'livery' && (
                <div className="grid grid-cols-3 gap-2.5">
                  {LIVERIES.map((l) => {
                    const isUnlocked = unlockedLiveries.includes(l.id);
                    const isEquipped = equippedCustom.livery === l.id;
                    const isSelected = inspectedCustom.livery === l.id;
                    return renderGridCard({
                      keyId: l.id,
                      name: l.name,
                      rarity: l.rarity,
                      isSelected,
                      isEquipped,
                      isUnlocked,
                      priceGold: l.priceGold,
                      badgeTag: l.animated ? 'CANLI' : undefined,
                      thumbnail: (
                        <div
                          className="h-full w-full"
                          style={{ background: l.accentSwatch }}
                        />
                      ),
                      onClick: () => {
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
                      },
                    });
                  })}
                </div>
              )}

              {mainTab === 'style' && styleSubTab === 'neon' && (
                <div className="grid grid-cols-3 gap-2.5">
                  {UNDERGLOWS.map((ug) => {
                    const isUnlocked = visualUnlocks.underglow.includes(ug.id);
                    const isEquipped = equippedCustom.underglow === ug.id;
                    const isSelected = inspectedCustom.underglow === ug.id;
                    const glowHex = `#${ug.hex.toString(16).padStart(6, '0')}`;
                    return renderGridCard({
                      keyId: ug.id,
                      name: ug.name,
                      rarity: ug.rarity,
                      isSelected,
                      isEquipped,
                      isUnlocked,
                      priceGold: ug.priceGold,
                      levelRoadLevel: ug.levelRoadLevel,
                      thumbnail: (
                        <div className="flex h-full w-full items-center justify-center bg-[#0c0e14] px-2.5">
                          <span
                            className="h-2.5 w-full rounded-full"
                            style={{
                              background: ug.swatch,
                              boxShadow:
                                ug.mode !== 'off'
                                  ? `0 0 16px ${glowHex}, 0 0 6px ${glowHex}`
                                  : undefined,
                            }}
                          />
                        </div>
                      ),
                      onClick: () =>
                        handleSelectVisual(
                          'underglow',
                          ug.id,
                          visualUnlocks.underglow,
                        ),
                    });
                  })}
                </div>
              )}

              {mainTab === 'style' && styleSubTab === 'headlight' && (
                <div className="grid grid-cols-3 gap-2.5">
                  {HEADLIGHTS.map((hl) => {
                    const isUnlocked = visualUnlocks.headlight.includes(hl.id);
                    const isEquipped = equippedCustom.headlight === hl.id;
                    const isSelected = inspectedCustom.headlight === hl.id;
                    const hlGlowHex = `#${hl.emissiveHex.toString(16).padStart(6, '0')}`;
                    return renderGridCard({
                      keyId: hl.id,
                      name: hl.name,
                      rarity: hl.rarity,
                      isSelected,
                      isEquipped,
                      isUnlocked,
                      priceGold: hl.priceGold,
                      levelRoadLevel: hl.levelRoadLevel,
                      thumbnail: (
                        <div className="flex h-full w-full items-center justify-center gap-3.5 bg-[#0c0e14]">
                          <span
                            className="h-4 w-4 rounded-full"
                            style={{
                              background: hl.swatch,
                              boxShadow: `0 0 14px ${hlGlowHex}, 0 0 6px ${hlGlowHex}`,
                            }}
                          />
                          <span
                            className="h-4 w-4 rounded-full"
                            style={{
                              background: hl.swatch,
                              boxShadow: `0 0 14px ${hlGlowHex}, 0 0 6px ${hlGlowHex}`,
                            }}
                          />
                        </div>
                      ),
                      onClick: () =>
                        handleSelectVisual(
                          'headlight',
                          hl.id,
                          visualUnlocks.headlight,
                        ),
                    });
                  })}
                </div>
              )}

              {mainTab === 'style' && styleSubTab === 'fx' && (
                <div className="flex flex-col gap-2.5">
                  <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-[#161a24] p-1 border border-white/[0.06]">
                    <button
                      type="button"
                      onClick={() => {
                        resetAllPreviews();
                        setFxMode('nitro');
                        onGarageCameraFocus('exhaust');
                      }}
                      className={`flex min-h-[34px] items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        fxMode === 'nitro'
                          ? 'bg-white text-zinc-950'
                          : 'text-zinc-300 hover:text-white'
                      }`}
                    >
                      <Flame className="h-3.5 w-3.5" />
                      <span>Nitro Alevi</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        resetAllPreviews();
                        setFxMode('smoke');
                        onGarageCameraFocus('smoke');
                      }}
                      className={`flex min-h-[34px] items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        fxMode === 'smoke'
                          ? 'bg-white text-zinc-950'
                          : 'text-zinc-300 hover:text-white'
                      }`}
                    >
                      <Zap className="h-3.5 w-3.5" />
                      <span>Drift Dumanı</span>
                    </button>
                  </div>

                  {fxMode === 'nitro' ? (
                    <div className="grid grid-cols-3 gap-2.5">
                      {NITRO_FLAMES.map((nf) => {
                        const isUnlocked = visualUnlocks.nitroFlame.includes(
                          nf.id,
                        );
                        const isEquipped = equippedCustom.nitroFlame === nf.id;
                        const isSelected = inspectedCustom.nitroFlame === nf.id;
                        return renderGridCard({
                          keyId: nf.id,
                          name: nf.name,
                          rarity: nf.rarity,
                          isSelected,
                          isEquipped,
                          isUnlocked,
                          priceGold: nf.priceGold,
                          levelRoadLevel: nf.levelRoadLevel,
                          badgeTag: nf.animated ? 'CANLI' : undefined,
                          thumbnail: (
                            <div
                              className="h-full w-full"
                              style={{ background: nf.swatch }}
                            />
                          ),
                          onClick: () =>
                            handleSelectVisual(
                              'nitroFlame',
                              nf.id,
                              visualUnlocks.nitroFlame,
                            ),
                        });
                      })}
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2.5">
                      {DRIFT_SMOKES.map((ds) => {
                        const isUnlocked = visualUnlocks.driftSmoke.includes(
                          ds.id,
                        );
                        const isEquipped = equippedCustom.driftSmoke === ds.id;
                        const isSelected = inspectedCustom.driftSmoke === ds.id;
                        return renderGridCard({
                          keyId: ds.id,
                          name: ds.name,
                          rarity: ds.rarity,
                          isSelected,
                          isEquipped,
                          isUnlocked,
                          priceGold: ds.priceGold,
                          levelRoadLevel: ds.levelRoadLevel,
                          badgeTag:
                            ds.animated || ds.rainbow ? 'CANLI' : undefined,
                          thumbnail: (
                            <div
                              className="h-full w-full"
                              style={{ background: ds.swatch }}
                            />
                          ),
                          onClick: () =>
                            handleSelectVisual(
                              'driftSmoke',
                              ds.id,
                              visualUnlocks.driftSmoke,
                            ),
                        });
                      })}
                    </div>
                  )}
                </div>
              )}

              {mainTab === 'style' && styleSubTab === 'plate' && (
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.07] bg-[#161a24] px-3 py-2">
                    <label
                      htmlFor="garage-plate-input-v2"
                      className="text-xs font-bold text-zinc-200 whitespace-nowrap"
                    >
                      Plaka Yazısı
                    </label>
                    <div className="flex h-9 items-stretch overflow-hidden rounded-lg border border-white/25 bg-zinc-100 focus-within:border-[#f59e0b]">
                      <span className="flex w-6 items-center justify-center bg-blue-700 font-display text-[9px] font-extrabold text-white select-none">
                        TR
                      </span>
                      <input
                        id="garage-plate-input-v2"
                        type="text"
                        value={licensePlate}
                        onChange={(e) => onChangeLicensePlate(e.target.value)}
                        maxLength={10}
                        placeholder="VİRAJ 34"
                        className="w-28 bg-transparent px-2 text-center font-display text-xs font-black tracking-wider text-zinc-950 uppercase outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    {PLATE_STYLES.map((ps) => {
                      const isUnlocked = visualUnlocks.plateStyle.includes(
                        ps.id,
                      );
                      const isEquipped = equippedCustom.plateStyle === ps.id;
                      const isSelected = inspectedCustom.plateStyle === ps.id;
                      return renderGridCard({
                        keyId: ps.id,
                        name: ps.name,
                        rarity: ps.rarity,
                        isSelected,
                        isEquipped,
                        isUnlocked,
                        priceGold: ps.priceGold,
                        levelRoadLevel: ps.levelRoadLevel,
                        badgeTag: ps.animated ? 'CANLI' : undefined,
                        thumbnail: (
                          <div className="flex h-full w-full items-center justify-center bg-[#0c0e14] p-2">
                            <div
                              className="flex h-7 w-full items-center justify-center rounded-md border-2 px-1 font-display text-[9px] font-black tracking-wider uppercase truncate"
                              style={{
                                background: ps.bgSwatch,
                                borderColor: ps.frameSwatch,
                                color: ps.textSwatch || '#09090b',
                              }}
                            >
                              {licensePlate || 'VİRAJ 34'}
                            </div>
                          </div>
                        ),
                        onClick: () =>
                          handleSelectVisual(
                            'plateStyle',
                            ps.id,
                            visualUnlocks.plateStyle,
                          ),
                      });
                    })}
                  </div>
                </div>
              )}

              {/* ====== TAB: ARAÇ (Modeller) ====== */}
              {mainTab === 'car' && (
                <div className="grid grid-cols-3 gap-2.5">
                  {CAR_MODELS.map((m) => {
                    const isSelected = m.id === carModel;
                    const isUnlocked = unlockedCars.includes(m.id);
                    const isDiamondCar = Boolean(
                      m.priceDiamonds && m.priceDiamonds > 0,
                    );
                    const r = RARITY_STYLE[m.rarity];
                    return renderGridCard({
                      keyId: m.id,
                      name: m.name,
                      rarity: m.rarity,
                      isSelected,
                      isEquipped: isSelected && isUnlocked,
                      isUnlocked,
                      priceGold: m.priceGold,
                      priceDiamonds: m.priceDiamonds,
                      thumbnail: (
                        <div
                          className="relative flex h-full w-full items-center justify-center overflow-hidden"
                          style={{
                            background: isDiamondCar
                              ? 'radial-gradient(ellipse at 50% 62%, rgba(34,211,238,0.28), #08111c 82%)'
                              : `radial-gradient(ellipse at 50% 62%, ${r.pillBg}, #0b0e16 82%)`,
                          }}
                        >
                          <img
                            src={`/cars/${m.id}.webp`}
                            alt={m.name}
                            loading="lazy"
                            decoding="async"
                            draggable={false}
                            className={`pointer-events-none h-full w-full select-none object-contain p-0.5 transition-transform duration-200 ${
                              isSelected
                                ? 'scale-105'
                                : 'group-hover:scale-105'
                            } ${!isUnlocked ? 'opacity-90' : ''}`}
                          />
                          {isDiamondCar && (
                            <span className="ug-skew pointer-events-none absolute left-1 top-1 inline-flex items-center gap-0.5 border border-cyan-400/45 bg-zinc-950/90 px-1 py-0.5 font-display text-[7.5px] font-extrabold uppercase tracking-wider text-cyan-300">
                              <Gem className="h-2 w-2 text-cyan-400" />
                              <span>ÖZEL</span>
                            </span>
                          )}
                          {!isUnlocked && (
                            <span
                              className={`pointer-events-none absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-md bg-zinc-950/80 border ${
                                isDiamondCar
                                  ? 'text-cyan-300 border-cyan-400/35'
                                  : 'text-amber-300 border-white/10'
                              }`}
                            >
                              <Lock className="h-2.5 w-2.5" />
                            </span>
                          )}
                          <div className="pointer-events-none absolute inset-x-1.5 bottom-0.5 flex items-center justify-between font-mono-num text-[8.5px] font-bold text-zinc-200/90 [text-shadow:0_1px_2px_rgba(0,0,0,0.95)]">
                            <span>H:{m.speedRating}</span>
                            <span>T:{m.handlingRating}</span>
                          </div>
                        </div>
                      ),
                      onClick: () => onSelectModel(m.id),
                    });
                  })}
                </div>
              )}

              {mainTab === 'style' && styleSubTab === 'wheels' && (
                <div className="flex flex-col gap-2.5">
                  {isWheelColorLocked ? (
                    <div className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.07] bg-[#161a24] px-3 py-2">
                      <span className="truncate text-[11px] text-zinc-300">
                        {inspectedWheelSpec.name} özel rengini kullanır
                      </span>
                      <span className="shrink-0 text-[10px] font-bold text-amber-300">
                        Özel Renk
                      </span>
                    </div>
                  ) : (
                    <div
                      onWheel={handleHorizontalWheel}
                      className="flex items-center gap-2 overflow-x-auto no-scrollbar touch-pan-x py-0.5"
                    >
                      <span className="shrink-0 text-[11px] font-bold text-zinc-400">
                        Tekerlek Rengi:
                      </span>
                      {WHEEL_COLORS.map((wc) => {
                        const active = wc.id === equippedWheel.color;
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
                            title={wc.label}
                            aria-label={wc.label}
                            className={`h-7 w-7 shrink-0 rounded-full border-2 transition-transform cursor-pointer ${
                              active
                                ? 'scale-110 border-[#f59e0b]'
                                : 'border-white/15 hover:border-white/40'
                            }`}
                            style={{ backgroundColor: wc.swatch }}
                          />
                        );
                      })}
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2.5">
                    {WHEEL_STYLES.map((w) => {
                      const isUnlocked = unlockedWheelStyles.includes(w.id);
                      const isEquipped = equippedWheel.style === w.id;
                      const isSelected = inspectedWheelStyle === w.id;
                      return renderGridCard({
                        keyId: w.id,
                        name: w.name,
                        rarity: w.rarity,
                        isSelected,
                        isEquipped,
                        isUnlocked,
                        priceGold: w.priceGold,
                        badgeTag: w.animated ? 'CANLI' : undefined,
                        thumbnail: (
                          <div className="flex h-full w-full items-center justify-center bg-[#0d1018]">
                            <WheelRimPreview
                              styleId={w.id}
                              color={activeWheelColorOpt.swatch}
                            />
                          </div>
                        ),
                        onClick: () => {
                          onGarageCameraFocus('wheels');
                          if (isUnlocked) {
                            setPreviewWheelStyle(null);
                            onEquipWheelStyle(activeModel.id, w.id);
                          } else {
                            setPreviewWheelStyle(w.id);
                            onPreviewWheel(w.id, equippedWheel.color);
                          }
                        },
                      });
                    })}
                  </div>
                </div>
              )}

              {mainTab === 'style' && styleSubTab === 'kit' && (
                <div className="grid grid-cols-3 gap-2.5">
                  {BODY_KITS.map((k) => {
                    const isUnlocked = unlockedBodyKits.includes(k.id);
                    const isEquipped = equippedCustom.bodyKit === k.id;
                    const isSelected = inspectedCustom.bodyKit === k.id;
                    const r = RARITY_STYLE[k.rarity];
                    return renderGridCard({
                      keyId: k.id,
                      name: k.name,
                      rarity: k.rarity,
                      isSelected,
                      isEquipped,
                      isUnlocked,
                      priceGold: k.priceGold,
                      badgeTag: k.animated ? 'CANLI' : undefined,
                      thumbnail: (
                        <div
                          className="flex h-full w-full flex-col items-center justify-center gap-1 px-1.5 text-center"
                          style={{
                            background: `linear-gradient(145deg, ${r.pillBg}, #0d1018 85%)`,
                          }}
                        >
                          <Sparkles
                            className="h-5 w-5"
                            style={{ color: r.textHex }}
                          />
                          <span className="truncate w-full text-[9px] font-bold text-zinc-300">
                            {k.effectLabel}
                          </span>
                        </div>
                      ),
                      onClick: () => {
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
                      },
                    });
                  })}
                </div>
              )}

              {mainTab === 'style' && styleSubTab === 'spoiler' && (
                <div className="grid grid-cols-3 gap-2.5">
                  {SPOILERS.map((s) => {
                    const isUnlocked = unlockedSpoilers.includes(s.id);
                    const isEquipped = equippedCustom.spoiler === s.id;
                    const isSelected = inspectedCustom.spoiler === s.id;
                    const r = RARITY_STYLE[s.rarity];
                    return renderGridCard({
                      keyId: s.id,
                      name: s.name,
                      rarity: s.rarity,
                      isSelected,
                      isEquipped,
                      isUnlocked,
                      priceGold: s.priceGold,
                      badgeTag: s.animated ? 'CANLI' : undefined,
                      thumbnail: (
                        <div
                          className="flex h-full w-full flex-col items-center justify-center gap-1 px-1.5 text-center"
                          style={{
                            background: `linear-gradient(145deg, ${r.pillBg}, #0d1018 85%)`,
                          }}
                        >
                          <ArrowUp
                            className="h-5 w-5 rotate-45"
                            style={{ color: r.textHex }}
                          />
                          <span className="truncate w-full text-[9px] font-bold text-zinc-300">
                            {s.effectLabel}
                          </span>
                        </div>
                      ),
                      onClick: () => {
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
                      },
                    });
                  })}
                </div>
              )}

              {mainTab === 'style' && styleSubTab === 'hat' && (
                <div className="grid grid-cols-3 gap-2.5">
                  {ROOF_HATS.map((h) => {
                    const isUnlocked = visualUnlocks.roofHat.includes(h.id);
                    const isEquipped = equippedCustom.roofHat === h.id;
                    const isSelected = inspectedCustom.roofHat === h.id;
                    return renderGridCard({
                      keyId: h.id,
                      name: h.name,
                      rarity: h.rarity,
                      isSelected,
                      isEquipped,
                      isUnlocked,
                      priceGold: h.priceGold,
                      levelRoadLevel: h.levelRoadLevel,
                      badgeTag: h.animated ? 'CANLI' : undefined,
                      thumbnail: (
                        <div
                          className="h-full w-full"
                          style={{ background: h.swatch }}
                        />
                      ),
                      onClick: () =>
                        handleSelectVisual(
                          'roofHat',
                          h.id,
                          visualUnlocks.roofHat,
                          'roof',
                        ),
                    });
                  })}
                </div>
              )}

              {mainTab === 'style' && styleSubTab === 'steering' && (
                <>
                  {renderCockpitBanner(
                    'Direksiyon sürüşte Kokpit kamerasında görünür',
                  )}
                  <div className="grid grid-cols-3 gap-2.5">
                    {STEERING_WHEELS.map((sw) => {
                      const isUnlocked = visualUnlocks.steeringWheel.includes(
                        sw.id,
                      );
                      const isEquipped = equippedCustom.steeringWheel === sw.id;
                      const isSelected =
                        inspectedCustom.steeringWheel === sw.id;
                      return renderGridCard({
                        keyId: sw.id,
                        name: sw.name,
                        rarity: sw.rarity,
                        isSelected,
                        isEquipped,
                        isUnlocked,
                        priceGold: sw.priceGold,
                        levelRoadLevel: sw.levelRoadLevel,
                        badgeTag: sw.hasShiftLeds ? 'LED' : undefined,
                        thumbnail: (
                          <div
                            className="h-full w-full"
                            style={{ background: sw.swatch }}
                          />
                        ),
                        onClick: () =>
                          handleSelectVisual(
                            'steeringWheel',
                            sw.id,
                            visualUnlocks.steeringWheel,
                            'steering',
                          ),
                      });
                    })}
                  </div>
                </>
              )}

              {mainTab === 'style' && styleSubTab === 'mirror' && (
                <>
                  {renderCockpitBanner(
                    'Ayna süsü Kokpit kamerasında canlı sallanır',
                  )}
                  <div className="grid grid-cols-3 gap-2.5">
                    {MIRROR_CHARMS.map((mc) => {
                      const isUnlocked = visualUnlocks.mirrorCharm.includes(
                        mc.id,
                      );
                      const isEquipped = equippedCustom.mirrorCharm === mc.id;
                      const isSelected = inspectedCustom.mirrorCharm === mc.id;
                      return renderGridCard({
                        keyId: mc.id,
                        name: mc.name,
                        rarity: mc.rarity,
                        isSelected,
                        isEquipped,
                        isUnlocked,
                        priceGold: mc.priceGold,
                        levelRoadLevel: mc.levelRoadLevel,
                        badgeTag: mc.animated ? 'CANLI' : undefined,
                        thumbnail: (
                          <div
                            className="h-full w-full"
                            style={{ background: mc.swatch }}
                          />
                        ),
                        onClick: () =>
                          handleSelectVisual(
                            'mirrorCharm',
                            mc.id,
                            visualUnlocks.mirrorCharm,
                            'mirror',
                          ),
                      });
                    })}
                  </div>
                </>
              )}

              {/* ====== TAB: YÜKSELT ====== */}
              {mainTab === 'upgrades' && (
                <div className="flex flex-col gap-2.5">
                  {/* Live Vehicle 4-Metric Strip */}
                  <div className="ug-cut-sm ug-card grid grid-cols-4 gap-2 p-2.5">
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between font-display text-[10px] font-bold uppercase text-zinc-400">
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
                      <div className="ug-skew h-1.5 overflow-hidden bg-white/10">
                        <div
                          className="h-full bg-gradient-to-r from-rose-500 to-orange-400"
                          style={{
                            width: `${Math.min(100, (activeModel.speedRating + activeUpgrades.engine * 0.5 + inspectedWheelSpec.speedRatingBonus + inspectedKitSpec.speedRatingBonus + inspectedSpoilerSpec.speedRatingBonus) * 10)}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between font-display text-[10px] font-bold uppercase text-zinc-400">
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
                      <div className="ug-skew h-1.5 overflow-hidden bg-white/10">
                        <div
                          className="h-full bg-sky-400"
                          style={{
                            width: `${Math.min(100, (activeModel.handlingRating + activeUpgrades.tires * 0.5 + inspectedWheelSpec.handlingRatingBonus + inspectedKitSpec.handlingRatingBonus + inspectedSpoilerSpec.handlingRatingBonus) * 10)}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between font-display text-[10px] font-bold uppercase text-zinc-400">
                        <span>Nitro</span>
                        <span className="font-mono-num text-cyan-300">
                          {activeNitroDurationSec}s
                        </span>
                      </div>
                      <div className="ug-skew h-1.5 overflow-hidden bg-white/10">
                        <div
                          className="h-full bg-cyan-400"
                          style={{
                            width: `${Math.min(100, 36 + activeUpgrades.nitroTank * 8 + activeUpgrades.nitroPower * 8)}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between font-display text-[10px] font-bold uppercase text-zinc-400">
                        <span>Zırh</span>
                        <span className="font-mono-num text-zinc-100">
                          {activeModel.maxIntegrity}
                        </span>
                      </div>
                      <div className="ug-skew h-1.5 overflow-hidden bg-white/10">
                        <div
                          className="h-full bg-emerald-400"
                          style={{
                            width: `${Math.min(100, Math.round((activeModel.maxIntegrity / 160) * 100))}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Modifiye Sınıfı Bar */}
                  <div className="ug-cut-sm ug-card flex items-center justify-between gap-2 px-3 py-2">
                    <span className="font-display text-xs font-bold uppercase tracking-wide text-zinc-300">
                      Modifiye Sınıfı:{' '}
                      <span
                        className={`font-display italic font-extrabold ${activeTuningClass.textClass}`}
                      >
                        {activeTuningClass.label}
                      </span>
                    </span>
                    <span className="font-mono-num text-xs font-bold text-orange-300">
                      {activeTuningClass.total}/{activeTuningClass.max}
                    </span>
                  </div>

                  {/* 4 Upgrade Cards */}
                  <div className="grid grid-cols-1 gap-2">
                    {UPGRADE_SPECS.map((spec) => {
                      const level = activeUpgrades[spec.key];
                      const isMax = level >= MAX_UPGRADE_LEVEL;
                      const cost = isMax ? 0 : UPGRADE_COSTS[level];
                      const canAfford = !isMax && goldCoins >= cost;
                      const icon =
                        spec.key === 'engine' ? (
                          <Gauge className="h-4 w-4 text-orange-400 shrink-0" />
                        ) : spec.key === 'tires' ? (
                          <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                        ) : spec.key === 'nitroTank' ? (
                          <Fuel className="h-4 w-4 text-cyan-400 shrink-0" />
                        ) : (
                          <Flame className="h-4 w-4 text-rose-400 shrink-0" />
                        );

                      return (
                        <div
                          key={spec.key}
                          className="ug-cut-sm ug-card flex flex-col gap-2 p-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1.5 font-display italic text-xs sm:text-sm font-bold uppercase tracking-wide text-white">
                              {icon}
                              <span>{spec.label}</span>
                            </span>
                            <span className="font-mono-num text-[11px] text-zinc-400">
                              {spec.bonusPerLevel}
                            </span>
                          </div>
                          <UpgradeLevelMeter part={spec.key} level={level} />
                          {!isActiveUnlocked ? (
                            <div className="ug-cut-sm flex min-h-[38px] items-center justify-center bg-[#0b0d14] font-display text-xs font-bold uppercase text-zinc-500">
                              Önce aracı aç
                            </div>
                          ) : isMax ? (
                            <div className="ug-cut-sm flex min-h-[38px] items-center justify-center gap-1.5 bg-emerald-500/12 font-display text-xs font-bold uppercase text-emerald-300">
                              <CheckCircle2 className="h-4 w-4" />
                              <span>Maksimum Seviye</span>
                            </div>
                          ) : canAfford ? (
                            <button
                              type="button"
                              onClick={() =>
                                onUpgradePart(activeModel.id, spec.key)
                              }
                              className="ug-cut-sm ug-btn-fire flex min-h-[40px] items-center justify-center gap-1.5 px-3 font-display italic text-xs font-extrabold uppercase tracking-wider cursor-pointer"
                            >
                              <Coins className="h-3.5 w-3.5 shrink-0" />
                              <span className="font-mono-num">
                                Yükselt · {cost.toLocaleString('tr-TR')} Altın
                              </span>
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
                                  className="ug-cut-sm flex min-h-[40px] items-center justify-center gap-1.5 border border-sky-400/40 bg-sky-500/15 px-3 font-display text-xs font-bold uppercase text-sky-200 hover:bg-sky-500/25 cursor-pointer"
                                >
                                  <PlayCircle className="h-4 w-4 text-sky-400 shrink-0" />
                                  <span className="font-mono-num">
                                    Eksik {missing} · +{topUp} Altın
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

              {/* ====== TAB: GÜÇLER ====== */}
              {mainTab === 'powerups' && (
                <div className="flex flex-col gap-2.5">
                  <div className="ug-cut-sm ug-card flex items-center justify-between px-3 py-2 text-xs">
                    <span className="inline-flex items-center gap-1.5 font-display italic font-bold uppercase tracking-wide text-zinc-200">
                      <Zap className="h-3.5 w-3.5 text-orange-400" />
                      <span>Sokak Güçleri</span>
                    </span>
                    <span className="font-mono-num font-bold text-orange-300">
                      SV. {playerLevel.level}
                    </span>
                  </div>

                  {POWERUP_SPECS.map((spec) => {
                    const unlocked = playerLevel.level >= spec.unlockLevel;
                    const levels = powerUpUpgrades[spec.id] || {
                      primary: 0,
                      secondary: 0,
                    };
                    const tracks = spec.secondary
                      ? [spec.primary, spec.secondary]
                      : [spec.primary];
                    const icon =
                      spec.id === 'nitro' ? (
                        <Flame className="h-4 w-4 text-cyan-400 shrink-0" />
                      ) : spec.id === 'repair' ? (
                        <HeartPulse className="h-4 w-4 text-emerald-400 shrink-0" />
                      ) : spec.id === 'magnet' ? (
                        <Magnet className="h-4 w-4 text-rose-400 shrink-0" />
                      ) : (
                        <Zap className="h-4 w-4 fill-orange-400 text-orange-300 shrink-0" />
                      );

                    return (
                      <div
                        key={spec.id}
                        className="ug-cut-sm ug-card flex flex-col gap-2 p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {icon}
                            <div className="min-w-0">
                              <div className="truncate font-display italic text-sm font-bold uppercase tracking-wide text-white">
                                {spec.name}
                              </div>
                              <div className="text-[11px] leading-snug text-zinc-400 line-clamp-2">
                                {spec.description}
                              </div>
                            </div>
                          </div>
                          <span
                            className={`ug-skew shrink-0 inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold font-mono-num ${
                              unlocked
                                ? 'bg-emerald-500/18 text-emerald-300'
                                : 'bg-[#0b0d14] text-orange-300'
                            }`}
                          >
                            {unlocked ? (
                              <>
                                <Unlock className="h-3 w-3" />
                                <span>AÇIK</span>
                              </>
                            ) : (
                              <>
                                <Lock className="h-3 w-3" />
                                <span>SV.{spec.unlockLevel}</span>
                              </>
                            )}
                          </span>
                        </div>

                        {!unlocked ? (
                          <button
                            type="button"
                            onClick={() => onOpenLevelRoad(spec.unlockLevel)}
                            className="ug-cut-sm flex min-h-[36px] w-full items-center justify-center gap-1.5 border border-orange-400/40 bg-orange-500/14 px-3 font-display text-xs font-bold uppercase text-orange-200 hover:bg-orange-500/22 cursor-pointer"
                          >
                            <Gift className="h-3.5 w-3.5 text-orange-400" />
                            <span>Seviye {spec.unlockLevel} Yolunu Gör</span>
                          </button>
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
                                  className="ug-cut-sm flex flex-col gap-1.5 bg-[#0b0d14] p-2.5 border border-white/[0.06]"
                                >
                                  <div className="flex items-center justify-between gap-2 text-xs">
                                    <span className="font-display font-bold uppercase text-zinc-200 truncate">
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
                                  <div className="grid grid-cols-5 gap-1">
                                    {Array.from({
                                      length: MAX_POWERUP_UPGRADE_LEVEL,
                                    }).map((_, segIdx) => (
                                      <div
                                        key={segIdx}
                                        className={`ug-skew h-1.5 ${
                                          segIdx < lvl
                                            ? spec.accentBgClass
                                            : 'bg-white/10'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                  {isMax ? (
                                    <div className="flex min-h-[34px] items-center justify-center gap-1 font-display text-xs font-bold uppercase text-emerald-300">
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                      <span>Maksimum</span>
                                    </div>
                                  ) : canAfford ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        onUpgradePowerUp(spec.id, trackSpec.key)
                                      }
                                      className="ug-cut-sm ug-btn-fire flex min-h-[36px] items-center justify-center gap-1.5 px-3 font-display italic text-xs font-extrabold uppercase tracking-wider cursor-pointer"
                                    >
                                      <Coins className="h-3.5 w-3.5" />
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
                                          className="ug-cut-sm flex min-h-[36px] items-center justify-center gap-1.5 border border-sky-400/35 bg-sky-500/15 px-3 font-display text-xs font-bold uppercase text-sky-200 hover:bg-sky-500/25 cursor-pointer"
                                        >
                                          <PlayCircle className="h-3.5 w-3.5 text-sky-400" />
                                          <span className="font-mono-num">
                                            Eksik {missing} · +{topUp} Altın
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
              )}
            </div>

            {/* PINNED PRIMARY UNDERGROUND CTA BUTTON */}
            <div className="shrink-0 bg-[#0b0d14] px-4 pt-2 pb-2.5 border-t border-white/[0.06]">
              {renderPrimaryCta()}
            </div>

            {/* PINNED BOTTOM 4-TAB UNDERGROUND NAVIGATION BAR */}
            <nav
              aria-label="Garaj Kategorileri"
              className="grid shrink-0 grid-cols-4 border-t border-white/10 bg-[#080a10] pt-1.5"
              style={{
                paddingBottom: 'max(0.55rem, env(safe-area-inset-bottom))',
              }}
            >
              {(
                [
                  { id: 'car', label: 'Araçlar', icon: CarFront },
                  { id: 'upgrades', label: 'Performans', icon: ArrowUp },
                  { id: 'style', label: 'Modifiye', icon: Palette },
                  { id: 'powerups', label: 'Güçler', icon: Zap },
                ] as const
              ).map((tab) => {
                const Icon = tab.icon;
                const active = mainTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      resetAllPreviews();
                      setMainTab(tab.id);
                    }}
                    className={`relative flex flex-col items-center justify-center gap-1 py-1.5 transition-colors cursor-pointer ${
                      active
                        ? 'text-orange-400'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {active && (
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-4 -top-1.5 h-[2px] bg-gradient-to-r from-rose-500 to-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.8)]"
                      />
                    )}
                    <Icon className="h-5 w-5" />
                    <span className="font-display italic text-[11px] font-bold uppercase tracking-wide leading-none">
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>
        )}
      </div>
    </div>
  );
};

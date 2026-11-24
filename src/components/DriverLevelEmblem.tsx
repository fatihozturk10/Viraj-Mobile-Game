import React from 'react';
import {
  CarUpgradeKey,
  getDriverRankTier,
  MAX_UPGRADE_LEVEL,
} from '../types/game';

interface DriverLevelEmblemProps {
  level: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showNumber?: boolean;
  className?: string;
}

const SIZE_MAP = {
  xs: 'h-5 w-5',
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-14 w-14',
} as const;

export const DriverLevelEmblem: React.FC<DriverLevelEmblemProps> = ({
  level,
  size = 'md',
  showNumber = true,
  className = '',
}) => {
  const tier = getDriverRankTier(level);
  const safeLevel = Math.max(1, Math.floor(level));
  const numText = showNumber ? String(safeLevel) : '';
  const numFontSize =
    safeLevel >= 1000
      ? 9
      : safeLevel >= 100
        ? 11.5
        : safeLevel >= 10
          ? 15
          : 17.5;

  return (
    <svg
      viewBox="0 0 48 48"
      className={`${SIZE_MAP[size]} shrink-0 ${className}`}
      aria-hidden="true"
    >
      {/* Tier 1: Rookie — Brushed Steel Shield + Single Chevron */}
      {tier.id === 'rookie' && (
        <>
          <path
            d="M24 4 L40 10 V24 C40 34 32.5 41 24 44 C15.5 41 8 34 8 24 V10 Z"
            fill="#18181b"
            stroke={tier.accentHex}
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          <path
            d="M24 8 L36 12.6 V23.5 C36 31.2 30.2 37 24 39.6 C17.8 37 12 31.2 12 23.5 V12.6 Z"
            fill="#27272a"
            stroke={tier.secondaryHex}
            strokeWidth="1.2"
          />
          <path
            d="M17 33.5 L24 37.5 L31 33.5"
            fill="none"
            stroke={tier.accentHex}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}

      {/* Tier 2: Wolf — Angular Bronze Octagon + Twin Side Notches */}
      {tier.id === 'wolf' && (
        <>
          <polygon
            points="16,4 32,4 44,16 44,32 32,44 16,44 4,32 4,16"
            fill="#1c1410"
            stroke={tier.accentHex}
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          <polygon
            points="18,8.5 30,8.5 39.5,18 39.5,30 30,39.5 18,39.5 8.5,30 8.5,18"
            fill="#2a1b12"
            stroke={tier.secondaryHex}
            strokeWidth="1.3"
          />
          <path
            d="M16.5 33 L24 37.2 L31.5 33 M19 36.2 L24 39 L29 36.2"
            fill="none"
            stroke={tier.accentHex}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}

      {/* Tier 3: Master — Emerald Winged Hex Crest */}
      {tier.id === 'master' && (
        <>
          <path
            d="M4 17 L11 14 V34 L4 31 Z M44 17 L37 14 V34 L44 31 Z"
            fill={tier.secondaryHex}
            stroke={tier.accentHex}
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <polygon
            points="24,4 39,12.5 39,35.5 24,44 9,35.5 9,12.5"
            fill="#0a1f1a"
            stroke={tier.accentHex}
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          <polygon
            points="24,8.5 35,14.8 35,33.2 24,39.5 13,33.2 13,14.8"
            fill="#0f2e26"
            stroke={tier.secondaryHex}
            strokeWidth="1.2"
          />
          <path
            d="M18 11.5 L24 8.5 L30 11.5"
            fill="none"
            stroke={tier.accentHex}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </>
      )}

      {/* Tier 4: Legend — Sapphire Diamond Crest + Top Speed Fins */}
      {tier.id === 'legend' && (
        <>
          <path
            d="M5 24 L13 13 L15 35 Z M43 24 L35 13 L33 35 Z"
            fill={tier.secondaryHex}
            stroke={tier.accentHex}
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <polygon
            points="24,3 41,24 24,45 7,24"
            fill="#091926"
            stroke={tier.accentHex}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <polygon
            points="24,8.5 36,24 24,39.5 12,24"
            fill="#0c263b"
            stroke={tier.secondaryHex}
            strokeWidth="1.3"
          />
          <circle cx="24" cy="9.5" r="2" fill={tier.accentHex} />
          <circle cx="24" cy="38.5" r="2" fill={tier.accentHex} />
        </>
      )}

      {/* Tier 5: Super Pilot — Championship Gold Winged Star Shield */}
      {tier.id === 'super' && (
        <>
          <path
            d="M3 16 L12 12 L11 22 L4 23 Z M45 16 L36 12 L37 22 L44 23 Z M5 26 L12 24 L13 33 L7 31 Z M43 26 L36 24 L35 33 L41 31 Z"
            fill={tier.secondaryHex}
            stroke={tier.accentHex}
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          <path
            d="M24 5 L38 11 V25 C38 35 31.5 41.2 24 44.5 C16.5 41.2 10 35 10 25 V11 Z"
            fill="#241808"
            stroke={tier.accentHex}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <polygon
            points="24,7.5 25.6,11.2 29.5,11.5 26.4,13.9 27.4,17.5 24,15.5 20.6,17.5 21.6,13.9 18.5,11.5 22.4,11.2"
            fill={tier.accentHex}
            transform="translate(0 -4) scale(0.75) translate(8 3)"
          />
          <path
            d="M16 34.5 L24 39 L32 34.5"
            fill="none"
            stroke={tier.accentHex}
            strokeWidth="2.1"
            strokeLinecap="round"
          />
        </>
      )}

      {/* Tier 6: Apex Champion — Crimson-Gold Crowned Crest with Twin Laurels */}
      {tier.id === 'apex' && (
        <>
          <path
            d="M4 15 L12 19 L10 33 L4 28 Z M44 15 L36 19 L38 33 L44 28 Z"
            fill="#4c0519"
            stroke={tier.secondaryHex}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M14 11 L18 5 L24 9 L30 5 L34 11"
            fill={tier.secondaryHex}
            stroke={tier.accentHex}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <polygon
            points="24,9 39,15 37,34 24,44.5 11,34 9,15"
            fill="#250914"
            stroke={tier.accentHex}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <polygon
            points="24,13 35,17.8 33.4,32 24,39.8 14.6,32 13,17.8"
            fill="#3b0c1f"
            stroke={tier.secondaryHex}
            strokeWidth="1.2"
          />
        </>
      )}

      {/* Tier 7: Highway Titan (250) — Amethyst-Cyan Plasma Winged Armor Crest */}
      {tier.id === 'titan' && (
        <>
          <path
            d="M2 14 L11 10 L10 21 L3 21 Z M46 14 L37 10 L38 21 L45 21 Z M4 24 L11 23 L12 34 L6 31 Z M44 24 L37 23 L36 34 L42 31 Z"
            fill="#2e1065"
            stroke={tier.secondaryHex}
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path
            d="M15 10 L19 3.5 L24 7.5 L29 3.5 L33 10"
            fill={tier.secondaryHex}
            stroke={tier.accentHex}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <polygon
            points="24,8 39,14 38,31 24,45 10,31 9,14"
            fill="#1e1038"
            stroke={tier.accentHex}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <polygon
            points="24,12 34.8,16.8 34,29.5 24,40 14,29.5 13.2,16.8"
            fill="#2e1754"
            stroke={tier.secondaryHex}
            strokeWidth="1.25"
          />
          <path
            d="M17 35 L24 39.5 L31 35"
            fill="none"
            stroke={tier.secondaryHex}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </>
      )}

      {/* Tier 8: Immortal Legend (500) — Crystalline Cyan-Gold Halo Prism & Double Wings */}
      {tier.id === 'immortal' && (
        <>
          <path
            d="M2 12 L13 15 L10 24 L3 20 Z M46 12 L35 15 L38 24 L45 20 Z M3 25 L12 25 L13 35 L5 33 Z M45 25 L36 25 L35 35 L43 33 Z"
            fill="#083344"
            stroke={tier.accentHex}
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path
            d="M13 10 Q24 1 35 10"
            fill="none"
            stroke={tier.secondaryHex}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <polygon
            points="24,4.5 26.2,8.5 24,11.5 21.8,8.5"
            fill={tier.secondaryHex}
          />
          <polygon
            points="16,10 32,10 40,20 36,35 24,45 12,35 8,20"
            fill="#062230"
            stroke={tier.accentHex}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <polygon
            points="18,14 30,14 35.8,21.2 32.8,33 24,40.4 15.2,33 12.2,21.2"
            fill="#0b3446"
            stroke={tier.secondaryHex}
            strokeWidth="1.3"
          />
          <circle cx="24" cy="39.5" r="2.1" fill={tier.secondaryHex} />
        </>
      )}

      {/* Tier 9: Asphalt Emperor (1000+) — Imperial Solar Gold & Ruby Radiant Sunburst Crown */}
      {tier.id === 'god' && (
        <>
          <path
            d="M2 11 L12 16 L9 24 L2 21 Z M46 11 L36 16 L39 24 L46 21 Z M3 27 L11 26 L12 36 L4 35 Z M45 27 L37 26 L36 36 L44 35 Z"
            fill="#450a0a"
            stroke={tier.accentHex}
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path
            d="M12 12 L15 4 L20.5 8.5 L24 2.5 L27.5 8.5 L33 4 L36 12 Z"
            fill={tier.accentHex}
            stroke={tier.secondaryHex}
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          <polygon
            points="24,10 40,16 37.5,34.5 24,45.5 10.5,34.5 8,16"
            fill="#24090e"
            stroke={tier.accentHex}
            strokeWidth="2.6"
            strokeLinejoin="round"
          />
          <polygon
            points="24,14 35.8,18.8 33.8,32.5 24,40.8 14.2,32.5 12.2,18.8"
            fill="#3d0f18"
            stroke={tier.secondaryHex}
            strokeWidth="1.5"
          />
          <polygon
            points="24,36.8 27,39.5 24,42.2 21,39.5"
            fill={tier.accentHex}
          />
        </>
      )}

      {showNumber ? (
        <text
          x="24"
          y={
            tier.id === 'apex' ||
            tier.id === 'titan' ||
            tier.id === 'immortal' ||
            tier.id === 'god'
              ? 30.2
              : 28.5
          }
          textAnchor="middle"
          fill="#ffffff"
          fontSize={numFontSize}
          fontWeight="800"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
        >
          {numText}
        </text>
      ) : (
        <polygon
          points="24,17 29.5,24 24,31 18.5,24"
          fill={tier.accentHex}
        />
      )}
    </svg>
  );
};

interface SegmentedXpBarProps {
  level: number;
  progressRatio: number;
  segments?: number;
  heightClass?: string;
}

export const SegmentedXpBar: React.FC<SegmentedXpBarProps> = ({
  level,
  progressRatio,
  segments = 10,
  heightClass = 'h-1.5',
}) => {
  const tier = getDriverRankTier(level);
  const clamped = Math.max(0, Math.min(1, progressRatio));
  const scaled = clamped * segments;

  return (
    <div
      className="grid w-full gap-1"
      style={{ gridTemplateColumns: `repeat(${segments}, minmax(0, 1fr))` }}
      aria-hidden="true"
    >
      {Array.from({ length: segments }).map((_, idx) => {
        const fill = Math.max(0, Math.min(1, scaled - idx));
        return (
          <div
            key={idx}
            className={`${heightClass} overflow-hidden rounded-[2px] bg-white/12`}
          >
            {fill > 0 && (
              <div
                className={`h-full transition-[width] duration-200 ${tier.barClass}`}
                style={{ width: `${Math.round(fill * 100)}%` }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

const TIRE_COMPOUND_LABELS = [
  'Stok',
  'Sokak',
  'Spor',
  'Yarı Slick',
  'Pro Slick',
] as const;

interface UpgradeLevelMeterProps {
  part: CarUpgradeKey;
  level: number;
}

export const UpgradeLevelMeter: React.FC<UpgradeLevelMeterProps> = ({
  part,
  level,
}) => {
  const safeLevel = Math.max(0, Math.min(MAX_UPGRADE_LEVEL, level));

  // 1. Engine — Ascending slanted RPM Tachometer blocks (Amber -> Orange -> Redline)
  if (part === 'engine') {
    const stepHeights = ['h-2', 'h-2.5', 'h-3', 'h-3.5'];
    const stepColors = [
      'bg-amber-400',
      'bg-amber-500',
      'bg-orange-500',
      'bg-rose-500',
    ];
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-end gap-1.5 h-4 px-0.5">
          {Array.from({ length: MAX_UPGRADE_LEVEL }).map((_, idx) => {
            const active = idx < safeLevel;
            return (
              <div
                key={idx}
                className={`flex-1 -skew-x-12 rounded-[2px] transition-colors ${stepHeights[idx]} ${
                  active ? stepColors[idx] : 'bg-white/10'
                }`}
              />
            );
          })}
        </div>
        <div className="flex items-center justify-between text-[10px] font-mono-num">
          <span className="text-amber-300/90 font-semibold">
            Kademe {safeLevel}/{MAX_UPGRADE_LEVEL}
          </span>
          <span className="text-zinc-400">
            +{safeLevel * 5} km/h
          </span>
        </div>
      </div>
    );
  }

  // 2. Tires — Dual-row Grip Tread Compound blocks (Emerald / Teal)
  if (part === 'tires') {
    const compoundName = TIRE_COMPOUND_LABELS[safeLevel] || 'Stok';
    return (
      <div className="flex flex-col gap-1.5">
        <div className="grid grid-cols-4 gap-1.5 h-4 items-center">
          {Array.from({ length: MAX_UPGRADE_LEVEL }).map((_, idx) => {
            const active = idx < safeLevel;
            return (
              <div
                key={idx}
                className={`flex flex-col gap-0.5 rounded-[3px] border p-0.5 transition-colors ${
                  active
                    ? 'border-emerald-400/50 bg-emerald-500/15'
                    : 'border-white/10 bg-white/5'
                }`}
              >
                <div
                  className={`h-1 rounded-[1px] ${
                    active ? 'bg-emerald-400' : 'bg-white/12'
                  }`}
                />
                <div
                  className={`h-1 rounded-[1px] ${
                    active ? 'bg-teal-300/80' : 'bg-white/8'
                  }`}
                />
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between text-[10px]">
          <span className="font-semibold text-emerald-300">
            {compoundName}
          </span>
          <span className="font-mono-num text-zinc-400">
            +{safeLevel * 6}% Tutuş
          </span>
        </div>
      </div>
    );
  }

  // 3. Nitro Tank — Pressurized Cylindrical N2O Cells (Cyan)
  if (part === 'nitroTank') {
    const capacity = 100 + safeLevel * 25;
    return (
      <div className="flex flex-col gap-1.5">
        <div className="grid grid-cols-4 gap-1.5 h-4 items-center">
          {Array.from({ length: MAX_UPGRADE_LEVEL }).map((_, idx) => {
            const active = idx < safeLevel;
            return (
              <div
                key={idx}
                className={`relative h-3 overflow-hidden rounded-full border transition-colors ${
                  active
                    ? 'border-cyan-300/70 bg-cyan-500/20'
                    : 'border-white/12 bg-zinc-950/80'
                }`}
              >
                {active && (
                  <div className="h-full w-full bg-gradient-to-r from-cyan-500 to-sky-300" />
                )}
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between text-[10px] font-mono-num">
          <span className="font-semibold text-cyan-300">
            {capacity} N2O
          </span>
          <span className="text-zinc-400">
            {safeLevel}/{MAX_UPGRADE_LEVEL} Hücre
          </span>
        </div>
      </div>
    );
  }

  // 4. Nitro Power — Ignition Thrust Chevrons (Electric Sky -> Violet Plasma)
  const stageColors = [
    'bg-sky-400',
    'bg-blue-400',
    'bg-indigo-400',
    'bg-violet-400',
  ];
  return (
    <div className="flex flex-col gap-1.5">
      <div className="grid grid-cols-4 gap-1.5 h-4 items-center">
        {Array.from({ length: MAX_UPGRADE_LEVEL }).map((_, idx) => {
          const active = idx < safeLevel;
          return (
            <div
              key={idx}
              className="flex h-3 items-center justify-center"
            >
              <div
                className={`h-2.5 w-full transition-colors ${
                  active ? stageColors[idx] : 'bg-white/10'
                }`}
                style={{
                  clipPath:
                    'polygon(0% 0%, 78% 0%, 100% 50%, 78% 100%, 0% 100%, 22% 50%)',
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between text-[10px] font-mono-num">
        <span className="font-semibold text-violet-300">
          Aşama {safeLevel}/{MAX_UPGRADE_LEVEL}
        </span>
        <span className="text-zinc-400">
          +{safeLevel * 8} km/h
        </span>
      </div>
    </div>
  );
};

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
  const uid = React.useId().replace(/:/g, '');
  const tier = getDriverRankTier(level);
  const safeLevel = Math.max(1, Math.floor(level));
  const numText = showNumber ? String(safeLevel) : '';
  const numFontSize =
    safeLevel >= 1000
      ? 10.5
      : safeLevel >= 100
        ? 13.5
        : safeLevel >= 10
          ? 16.5
          : 19;

  const rimGradId = `ug-rim-${uid}`;
  const coreGradId = `ug-core-${uid}`;
  const wingGradId = `ug-wing-${uid}`;

  // Tier-tailored dark metallic core stops
  const coreStops: [string, string] =
    tier.id === 'rookie'
      ? ['#232938', '#090b11']
      : tier.id === 'wolf'
        ? ['#361b0e', '#0d0806']
        : tier.id === 'master'
          ? ['#0c2f24', '#06110e']
          : tier.id === 'legend'
            ? ['#0b2842', '#060e18']
            : tier.id === 'super'
              ? ['#3b2507', '#110b04']
              : tier.id === 'apex'
                ? ['#470a1c', '#12050a']
                : tier.id === 'titan'
                  ? ['#33125e', '#0e061c']
                  : tier.id === 'immortal'
                    ? ['#08374a', '#04121a']
                    : ['#4a0b13', '#140407'];

  const numberY =
    tier.id === 'super' ||
    tier.id === 'apex' ||
    tier.id === 'titan' ||
    tier.id === 'immortal' ||
    tier.id === 'god'
      ? 31.2
      : 29.8;

  return (
    <svg
      viewBox="0 0 56 56"
      className={`${SIZE_MAP[size]} shrink-0 overflow-visible ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={rimGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.92" />
          <stop offset="32%" stopColor={tier.accentHex} />
          <stop offset="78%" stopColor={tier.secondaryHex} />
          <stop offset="100%" stopColor={tier.accentHex} />
        </linearGradient>
        <linearGradient id={coreGradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={coreStops[0]} />
          <stop offset="100%" stopColor={coreStops[1]} />
        </linearGradient>
        <linearGradient id={wingGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={tier.accentHex} />
          <stop offset="100%" stopColor={tier.secondaryHex} />
        </linearGradient>
      </defs>

      {/* TIER 1: ROOKIE (Lv. 1–4) — Forged Gunmetal Street Piston Hex-Plate */}
      {tier.id === 'rookie' && (
        <>
          <polygon
            points="17,5 39,5 49,17 47,36 28,50 9,36 7,17"
            fill={`url(#${rimGradId})`}
          />
          <polygon
            points="18.6,8 37.4,8 45.8,18.2 44.1,34.5 28,46.4 11.9,34.5 10.2,18.2"
            fill={`url(#${coreGradId})`}
            stroke="rgba(255,255,255,0.18)"
            strokeWidth="1"
          />
          {/* Top tachometer arc + side bolts */}
          <path
            d="M18 12.5 H38"
            stroke={tier.accentHex}
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.85"
          />
          <circle cx="14.5" cy="20" r="1.4" fill={tier.accentHex} />
          <circle cx="41.5" cy="20" r="1.4" fill={tier.accentHex} />
          {/* Single sharp street chevron */}
          <path
            d="M20 38.5 L28 43.2 L36 38.5"
            fill="none"
            stroke={tier.accentHex}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}

      {/* TIER 2: WOLF (Lv. 5–9) — Forged Copper-Ember Intake Crest + Twin Fangs */}
      {tier.id === 'wolf' && (
        <>
          {/* Side intake fins */}
          <path
            d="M3 19 L10 15 L11 33 L5 29 Z M53 19 L46 15 L45 33 L51 29 Z"
            fill={`url(#${wingGradId})`}
          />
          <polygon
            points="16,5 40,5 48,15 46,37 28,51 10,37 8,15"
            fill={`url(#${rimGradId})`}
          />
          <polygon
            points="17.8,8.2 38.2,8.2 44.8,16.4 43.1,35.4 28,47.2 12.9,35.4 11.2,16.4"
            fill={`url(#${coreGradId})`}
            stroke={tier.accentHex}
            strokeOpacity="0.45"
            strokeWidth="1"
          />
          {/* Top fang notch + twin chevrons */}
          <polygon points="23,8.2 28,13 33,8.2" fill={tier.accentHex} />
          <path
            d="M19 37.5 L28 42.5 L37 37.5 M22 41.2 L28 44.8 L34 41.2"
            fill="none"
            stroke={tier.accentHex}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}

      {/* TIER 3: MASTER (Lv. 10–24) — Venom Emerald Aero-Canard Hex Shield */}
      {tier.id === 'master' && (
        <>
          {/* Swept twin aero canards */}
          <path
            d="M2 15 L12 13 L11 24 L4 22 Z M54 15 L44 13 L45 24 L52 22 Z M4 27 L11 26 L13 36 L6 33 Z M52 27 L45 26 L43 36 L50 33 Z"
            fill={`url(#${wingGradId})`}
          />
          <polygon
            points="28,4 46,13 45,36 28,51 11,36 10,13"
            fill={`url(#${rimGradId})`}
          />
          <polygon
            points="28,7.6 42.8,15 41.9,34.5 28,47.2 14.1,34.5 13.2,15"
            fill={`url(#${coreGradId})`}
            stroke={tier.accentHex}
            strokeOpacity="0.55"
            strokeWidth="1.1"
          />
          <path
            d="M20 14 L28 9.8 L36 14"
            fill="none"
            stroke="#ffffff"
            strokeOpacity="0.8"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M19.5 37.8 L28 43.2 L36.5 37.8"
            fill="none"
            stroke={tier.accentHex}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </>
      )}

      {/* TIER 4: LEGEND (Lv. 25–49) — Cobalt NOS Reactor Diamond + Swept Blades */}
      {tier.id === 'legend' && (
        <>
          {/* High-speed swept NOS blades */}
          <path
            d="M1 18 L14 11 L15 26 L4 26 Z M55 18 L42 11 L41 26 L52 26 Z M5 30 L15 28 L17 40 L8 36 Z M51 30 L41 28 L39 40 L48 36 Z"
            fill={`url(#${wingGradId})`}
          />
          <polygon
            points="28,3 47,25 28,52 9,25"
            fill={`url(#${rimGradId})`}
          />
          <polygon
            points="28,7.4 43.2,25 28,47.5 12.8,25"
            fill={`url(#${coreGradId})`}
            stroke={tier.accentHex}
            strokeOpacity="0.65"
            strokeWidth="1.2"
          />
          {/* Top & bottom plasma nodes */}
          <polygon points="28,8.5 31.5,13 28,16 24.5,13" fill="#e0f2fe" />
          <polygon points="28,39.5 31.5,43 28,46.2 24.5,43" fill={tier.accentHex} />
        </>
      )}

      {/* TIER 5: SUPER PILOT (Lv. 50–99) — Championship 24K Gold Twin-Wing Star Crest */}
      {tier.id === 'super' && (
        <>
          {/* 3-tier golden championship wings */}
          <path
            d="M1 13 L14 10 L13 20 L3 19 Z M55 13 L42 10 L43 20 L53 19 Z M2 23 L13 21 L14 30 L4 28 Z M54 23 L43 21 L42 30 L52 28 Z M6 32 L14 31 L16 40 L9 37 Z M50 32 L42 31 L40 40 L47 37 Z"
            fill={`url(#${wingGradId})`}
          />
          {/* Main gold-rimmed crest */}
          <polygon
            points="16,8 40,8 46,19 43,38 28,52 13,38 10,19"
            fill={`url(#${rimGradId})`}
          />
          <polygon
            points="18.2,11.2 37.8,11.2 42.8,20 40.2,36.4 28,48.2 15.8,36.4 13.2,20"
            fill={`url(#${coreGradId})`}
            stroke="#fde68a"
            strokeOpacity="0.65"
            strokeWidth="1.2"
          />
          {/* Top Championship Star */}
          <polygon
            points="28,2 30.2,6.8 35.4,7.3 31.5,10.7 32.7,15.8 28,13 23.3,15.8 24.5,10.7 20.6,7.3 25.8,6.8"
            fill="#fef08a"
            stroke="#b45309"
            strokeWidth="1"
            strokeLinejoin="round"
          />
          {/* Bottom golden laurel V */}
          <path
            d="M19 39.5 L28 45 L37 39.5"
            fill="none"
            stroke="#fde047"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </>
      )}

      {/* TIER 6: APEX CHAMPION (Lv. 100–249) — Blackridge King Crimson-Gold Crowned Crest */}
      {tier.id === 'apex' && (
        <>
          {/* Aggressive Crimson-Gold Razor Wings */}
          <path
            d="M0 12 L14 15 L12 25 L2 21 Z M56 12 L42 15 L44 25 L54 21 Z M2 25 L13 26 L14 36 L4 33 Z M54 25 L43 26 L42 36 L52 33 Z M7 37 L15 36 L18 45 L10 42 Z M49 37 L41 36 L38 45 L46 42 Z"
            fill={`url(#${wingGradId})`}
          />
          {/* 3-Point Street King Crown */}
          <polygon
            points="16,12 19,3.5 24.5,9 28,1.5 31.5,9 37,3.5 40,12"
            fill="#fbbf24"
            stroke="#f43f5e"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          {/* Main Apex Shield */}
          <polygon
            points="28,9 46,16 43,38 28,53 13,38 10,16"
            fill={`url(#${rimGradId})`}
          />
          <polygon
            points="28,12.5 42.6,18 40,36.5 28,49 16,36.5 13.4,18"
            fill={`url(#${coreGradId})`}
            stroke="#fbbf24"
            strokeOpacity="0.7"
            strokeWidth="1.25"
          />
          {/* Lower molten diamond + twin spears */}
          <polygon points="28,40.5 31.5,44 28,47.5 24.5,44" fill="#fbbf24" />
          <path
            d="M19 38.5 L24 42.5 M37 38.5 L32 42.5"
            stroke="#fb7185"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </>
      )}

      {/* TIER 7: HIGHWAY TITAN (Lv. 250–499) — Hyper-Plasma Amethyst & Cyan Quad-Wing Crest */}
      {tier.id === 'titan' && (
        <>
          <path
            d="M0 10 L14 14 L12 24 L1 19 Z M56 10 L42 14 L44 24 L55 19 Z M1 24 L13 25 L14 35 L3 32 Z M55 24 L43 25 L42 35 L53 32 Z M6 36 L15 35 L18 45 L9 42 Z M50 36 L41 35 L38 45 L47 42 Z"
            fill={`url(#${wingGradId})`}
          />
          <polygon
            points="15,12 18,3 24,8.5 28,1 32,8.5 38,3 41,12"
            fill={tier.secondaryHex}
            stroke={tier.accentHex}
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          <polygon
            points="28,8.5 46,15.5 43.5,38 28,53.5 12.5,38 10,15.5"
            fill={`url(#${rimGradId})`}
          />
          <polygon
            points="28,12.2 42.5,17.8 40.4,36.4 28,49.4 15.6,36.4 13.5,17.8"
            fill={`url(#${coreGradId})`}
            stroke={tier.secondaryHex}
            strokeOpacity="0.75"
            strokeWidth="1.3"
          />
          <path
            d="M19 39.5 L28 45.5 L37 39.5"
            fill="none"
            stroke={tier.secondaryHex}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </>
      )}

      {/* TIER 8: IMMORTAL LEGEND (Lv. 500–999) — Cryo-Diamond & Solar Gold Halo Crest */}
      {tier.id === 'immortal' && (
        <>
          <path
            d="M0 10 L15 14 L12 24 L1 19 Z M56 10 L41 14 L44 24 L55 19 Z M1 23 L13 24 L14 35 L2 32 Z M55 23 L43 24 L42 35 L54 32 Z M5 35 L15 35 L18 46 L8 43 Z M51 35 L41 35 L38 46 L48 43 Z"
            fill={`url(#${wingGradId})`}
          />
          {/* Floating Golden Halo Arc + Ice Prism */}
          <path
            d="M14 10 Q28 0 42 10"
            fill="none"
            stroke="#fde047"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <polygon points="28,2 31.2,7.8 28,12 24.8,7.8" fill="#ffffff" />
          <polygon
            points="17,10 39,10 47,21 43,39 28,53.5 13,39 9,21"
            fill={`url(#${rimGradId})`}
          />
          <polygon
            points="19.2,13.5 36.8,13.5 43.4,22.2 40,37.2 28,49.4 16,37.2 12.6,22.2"
            fill={`url(#${coreGradId})`}
            stroke="#fde047"
            strokeOpacity="0.75"
            strokeWidth="1.3"
          />
          <polygon points="28,40.5 31.8,44.2 28,47.8 24.2,44.2" fill="#67e8f9" />
        </>
      )}

      {/* TIER 9: ASPHALT EMPEROR (Lv. 1000+) — Imperial 5-Point Solar Crown & Ruby Wings */}
      {tier.id === 'god' && (
        <>
          <path
            d="M0 9 L15 14 L12 24 L0 19 Z M56 9 L41 14 L44 24 L56 19 Z M1 23 L13 24 L14 35 L2 32 Z M55 23 L43 24 L42 35 L54 32 Z M5 36 L15 35 L19 47 L8 44 Z M51 36 L41 35 L37 47 L48 44 Z"
            fill={`url(#${wingGradId})`}
          />
          {/* 5-Point Radiant Emperor Crown */}
          <polygon
            points="13,12 15,3.5 21,9 24.5,2.5 28,8 31.5,2.5 35,9 41,3.5 43,12"
            fill="#fde047"
            stroke="#f43f5e"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          <polygon
            points="28,9 47,16 44,39 28,54 12,39 9,16"
            fill={`url(#${rimGradId})`}
          />
          <polygon
            points="28,12.6 43.4,18.4 40.8,37.2 28,49.8 15.2,37.2 12.6,18.4"
            fill={`url(#${coreGradId})`}
            stroke="#fde047"
            strokeWidth="1.4"
          />
          <polygon points="28,40.2 32,44.2 28,48.2 24,44.2" fill="#fde047" />
        </>
      )}

      {showNumber ? (
        <text
          x="28"
          y={numberY}
          textAnchor="middle"
          fill="#ffffff"
          stroke="#05070c"
          strokeWidth="3.2"
          strokeLinejoin="round"
          paintOrder="stroke"
          fontSize={numFontSize}
          fontWeight="800"
          fontStyle="italic"
          fontFamily="'Chakra Petch', 'Rajdhani', sans-serif"
        >
          {numText}
        </text>
      ) : (
        <polygon
          points="28,18.5 34.5,26.5 28,34.5 21.5,26.5"
          fill={tier.accentHex}
          stroke="#ffffff"
          strokeWidth="1"
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

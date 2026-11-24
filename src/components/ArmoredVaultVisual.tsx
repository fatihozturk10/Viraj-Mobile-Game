import React from 'react';
import { Lock, LockOpen } from 'lucide-react';
import { CrateTierId } from '../services/storeCatalog';

export interface ArmoredVaultVisualProps {
  phase: 'drop' | 'charging' | 'burst';
  chargeRatio: number; // 0..1
  beatStage: number; // 0..3
  accentHex: string;
  secondaryHex: string;
  glowHex: string;
  tier: CrateTierId;
  tapRecoilKey: number;
}

const TIER_METALS: Record<
  CrateTierId,
  {
    bodyTop: string;
    bodyMid: string;
    bodyDark: string;
    trim: string;
    trimHi: string;
    code: string;
  }
> = {
  street: {
    bodyTop: '#334155',
    bodyMid: '#1e293b',
    bodyDark: '#0f172a',
    trim: '#64748b',
    trimHi: '#cbd5e1',
    code: 'ST-01',
  },
  pro: {
    bodyTop: '#3b2d5c',
    bodyMid: '#1f1935',
    bodyDark: '#0f0c1d',
    trim: '#7c5cbf',
    trimHi: '#ddd6fe',
    code: 'PRO-X',
  },
  legendary: {
    bodyTop: '#4a2534',
    bodyMid: '#24121b',
    bodyDark: '#12080d',
    trim: '#d97706',
    trimHi: '#fde68a',
    code: 'APEX-V12',
  },
};

/**
 * Sculpted 3D-perspective Armored Motorsport Loot Vault.
 * Uses independently animated lower vault chassis, glowing interior energy cavity,
 * hydraulic side clamps that unlatch & fling open, and a hinged 3D upper lid that blasts upward.
 */
export const ArmoredVaultVisual: React.FC<ArmoredVaultVisualProps> = ({
  phase,
  chargeRatio,
  beatStage,
  accentHex,
  secondaryHex,
  glowHex,
  tier,
  tapRecoilKey,
}) => {
  const metal = TIER_METALS[tier];
  const isBurst = phase === 'burst';
  const isCharging = phase === 'charging';

  // As charge builds, lid lifts slightly under internal pressure and seam light flares
  const lidPressureLiftPx = isCharging ? Math.round(chargeRatio * 10) : 0;
  const seamOpacity = isBurst ? 1 : isCharging ? 0.45 + chargeRatio * 0.55 : 0.28;
  const clampOpenPx = isBurst ? 42 : isCharging ? beatStage * 4.5 : 0;
  const clampRotDeg = isBurst ? 34 : isCharging ? beatStage * 4 : 0;

  const bracketInsetPx = isCharging ? Math.round(chargeRatio * 10) : 0;

  return (
    <div
      className="relative flex h-64 w-64 items-center justify-center select-none"
      style={{ perspective: '1050px' }}
    >
      {/* 4 Crisp Angular Motorsport HUD Targeting Brackets (tighten inward as pressure builds) */}
      {!isBurst && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 transition-all duration-200"
          style={{
            transform: `scale(${1 - bracketInsetPx * 0.008})`,
            opacity: isCharging ? 0.55 + chargeRatio * 0.45 : 0.36,
          }}
        >
          <span
            className="absolute top-1 left-1 h-7 w-7 border-t-2 border-l-2 transition-colors duration-300"
            style={{
              borderColor: accentHex,
              filter: `drop-shadow(0 0 8px ${accentHex})`,
            }}
          />
          <span
            className="absolute top-1 right-1 h-7 w-7 border-t-2 border-r-2 transition-colors duration-300"
            style={{
              borderColor: accentHex,
              filter: `drop-shadow(0 0 8px ${accentHex})`,
            }}
          />
          <span
            className="absolute bottom-2 left-1 h-7 w-7 border-b-2 border-l-2 transition-colors duration-300"
            style={{
              borderColor: accentHex,
              filter: `drop-shadow(0 0 8px ${accentHex})`,
            }}
          />
          <span
            className="absolute right-1 bottom-2 h-7 w-7 border-r-2 border-b-2 transition-colors duration-300"
            style={{
              borderColor: accentHex,
              filter: `drop-shadow(0 0 8px ${accentHex})`,
            }}
          />
        </div>
      )}

      {/* Tight Neutral Under-Chassis Contact Shadow directly beneath vault feet */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-3 h-4 w-40 rounded-sm bg-black/80 transition-transform duration-300"
        style={{
          filter: 'blur(7px)',
          transform: isBurst ? 'scaleX(1.18)' : 'scaleX(1)',
        }}
      />

      {/* Tap Recoil + Drop / Charge Vibration Wrapper (never unmounts children so clamp/lid transitions stay smooth) */}
      <div
        className={`relative h-56 w-56 ${
          phase === 'drop'
            ? 'animate-crate-drop'
            : isCharging
              ? tapRecoilKey === 0
                ? 'animate-crate-charge-rumble'
                : tapRecoilKey % 2 === 1
                  ? 'animate-crate-tap-recoil'
                  : 'animate-crate-tap-recoil-alt'
              : ''
        }`}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* =================== CONFINED ANGULAR SEAM LIGHT FLARE (No oval blob!) =================== */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-8 top-[46%] h-4 -translate-y-1/2 transition-all duration-200"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${accentHex} 20%, #ffffff 50%, ${accentHex} 80%, transparent 100%)`,
            opacity: isBurst ? 0.95 : isCharging ? 0.25 + chargeRatio * 0.7 : 0,
            transform: isBurst
              ? 'translateY(-50%) scale(1.25, 2.1)'
              : `translateY(-50%) scale(1, ${0.4 + chargeRatio * 0.9})`,
            filter: 'blur(4px)',
          }}
        />

        {/* =================== LOWER ARMORED VAULT CHASSIS (BASE) =================== */}
        <div
          className={`absolute inset-0 ${isBurst ? 'animate-crate-vault-base-open' : ''}`}
          style={{
            filter: isCharging
              ? `drop-shadow(0 0 ${12 + chargeRatio * 24}px ${glowHex})`
              : 'drop-shadow(0 18px 26px rgba(0,0,0,0.8))',
          }}
        >
          <svg
            viewBox="0 0 240 240"
            className="h-full w-full overflow-visible"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id={`baseFace-${tier}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={metal.bodyTop} />
                <stop offset="48%" stopColor={metal.bodyMid} />
                <stop offset="100%" stopColor={metal.bodyDark} />
              </linearGradient>
              <linearGradient id={`baseTrim-${tier}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={metal.trimHi} />
                <stop offset="45%" stopColor={metal.trim} />
                <stop offset="100%" stopColor={metal.bodyDark} />
              </linearGradient>
              <linearGradient id={`cavityGlow-${tier}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="45%" stopColor={secondaryHex} />
                <stop offset="100%" stopColor={accentHex} />
              </linearGradient>
              <pattern
                id={`carbonWeave-${tier}`}
                width="8"
                height="8"
                patternUnits="userSpaceOnUse"
              >
                <rect width="8" height="8" fill="transparent" />
                <path d="M0 4 L4 0 L8 4 L4 8 Z" fill="rgba(255,255,255,0.035)" />
              </pattern>
            </defs>

            {/* Interior glowing bay top face (visible when lid lifts or blasts open) */}
            <polygon
              points="34,116 54,96 186,96 206,116"
              fill={`url(#cavityGlow-${tier})`}
              opacity={isBurst ? 1 : Math.min(0.92, chargeRatio * 0.95)}
            />
            <polygon
              points="46,114 60,101 180,101 194,114"
              fill="#ffffff"
              opacity={isBurst ? 0.96 : chargeRatio * 0.65}
            />

            {/* Main lower armored trapezoid body */}
            <path
              d="M 28 115 L 212 115 L 204 198 Q 202 212 186 214 L 54 214 Q 38 212 36 198 Z"
              fill={`url(#baseFace-${tier})`}
              stroke={`url(#baseTrim-${tier})`}
              strokeWidth="3"
            />
            {/* Carbon texture overlay */}
            <path
              d="M 33 118 L 207 118 L 200 196 Q 198 208 184 210 L 56 210 Q 42 208 40 196 Z"
              fill={`url(#carbonWeave-${tier})`}
            />

            {/* Recessed Front Armor Panel */}
            <polygon
              points="52,130 188,130 182,196 58,196"
              fill="rgba(7, 8, 13, 0.56)"
              stroke="rgba(255, 255, 255, 0.12)"
              strokeWidth="1.5"
            />

            {/* Side Angled Energy Light Strips (glow brighter as charge builds) */}
            <polygon
              points="36,132 45,132 49,192 41,192"
              fill={accentHex}
              opacity={0.45 + chargeRatio * 0.55}
            />
            <polygon
              points="204,132 195,132 191,192 199,192"
              fill={accentHex}
              opacity={0.45 + chargeRatio * 0.55}
            />

            {/* Lower Corner Heavy Steel Feet / Bumpers */}
            <path
              d="M 34 188 L 56 188 L 58 215 L 44 215 Q 35 214 34 203 Z"
              fill={metal.trim}
              opacity="0.88"
            />
            <path
              d="M 206 188 L 184 188 L 182 215 L 196 215 Q 205 214 206 203 Z"
              fill={metal.trim}
              opacity="0.88"
            />

            {/* Horizontal Armor Ribs & Racing Grille Vents */}
            <rect x="74" y="156" width="92" height="5" rx="2.5" fill="rgba(255,255,255,0.12)" />
            <rect x="82" y="166" width="76" height="4" rx="2" fill="rgba(255,255,255,0.09)" />
            <rect
              x="92"
              y="176"
              width="56"
              height="3.5"
              rx="1.75"
              fill={accentHex}
              opacity={0.45 + chargeRatio * 0.55}
            />

            {/* Serial Stencil Tag */}
            <text
              x="120"
              y="191"
              textAnchor="middle"
              fill="rgba(255,255,255,0.48)"
              fontSize="8.5"
              fontWeight="800"
              letterSpacing="2.2"
              fontFamily="monospace"
            >
              {metal.code}
            </text>

            {/* Rivets */}
            <circle cx="46" cy="124" r="2.2" fill={metal.trimHi} opacity="0.7" />
            <circle cx="194" cy="124" r="2.2" fill={metal.trimHi} opacity="0.7" />
            <circle cx="48" cy="202" r="2.2" fill={metal.trimHi} opacity="0.65" />
            <circle cx="192" cy="202" r="2.2" fill={metal.trimHi} opacity="0.65" />
          </svg>
        </div>

        {/* =================== GLOWING PLASMA SEAM BAR =================== */}
        {!isBurst && (
          <div
            aria-hidden="true"
            className="animate-crate-seam-pulse pointer-events-none absolute inset-x-5 top-[48%] -translate-y-1/2 rounded-full transition-all duration-150"
            style={{
              height: `${3 + chargeRatio * 6}px`,
              background: `linear-gradient(90deg, transparent 0%, ${accentHex} 18%, #ffffff 50%, ${accentHex} 82%, transparent 100%)`,
              boxShadow: `0 0 ${14 + chargeRatio * 26}px ${accentHex}, 0 0 ${24 + chargeRatio * 34}px ${glowHex}`,
              opacity: seamOpacity,
            }}
          />
        )}

        {/* =================== UPPER 3D HINGED ARMORED LID =================== */}
        <div
          className={`absolute inset-0 transition-transform duration-150 ${
            isBurst ? 'animate-crate-vault-lid-open' : ''
          }`}
          style={{
            transformOrigin: '50% 42%',
            transform: isBurst
              ? undefined
              : `translate3d(0, ${-lidPressureLiftPx}px, 0)`,
            filter: isCharging
              ? `drop-shadow(0 -6px ${10 + chargeRatio * 20}px ${glowHex})`
              : undefined,
          }}
        >
          <svg
            viewBox="0 0 240 240"
            className="h-full w-full overflow-visible"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id={`lidTop-${tier}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={metal.trimHi} stopOpacity="0.45" />
                <stop offset="22%" stopColor={metal.bodyTop} />
                <stop offset="100%" stopColor={metal.bodyMid} />
              </linearGradient>
              <linearGradient id={`lidFront-${tier}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={metal.bodyMid} />
                <stop offset="100%" stopColor={metal.bodyDark} />
              </linearGradient>
              <linearGradient id={`lidEdge-${tier}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={metal.trim} />
                <stop offset="50%" stopColor={metal.trimHi} />
                <stop offset="100%" stopColor={metal.trim} />
              </linearGradient>
            </defs>

            {/* 3D Sloped Top Roof Plane */}
            <path
              d="M 52 38 L 188 38 Q 202 39 208 54 L 218 86 L 22 86 L 32 54 Q 38 39 52 38 Z"
              fill={`url(#lidTop-${tier})`}
              stroke={`url(#lidEdge-${tier})`}
              strokeWidth="2.8"
            />

            {/* Top Center Grab Handle / Spoiler Bar */}
            <path
              d="M 86 38 L 92 26 Q 94 22 100 22 L 140 22 Q 146 22 148 26 L 154 38"
              fill="none"
              stroke={metal.trimHi}
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <rect
              x="98"
              y="26"
              width="44"
              height="4"
              rx="2"
              fill={accentHex}
              opacity={0.6 + chargeRatio * 0.4}
            />

            {/* Dual Roof Racing Intake Stripes */}
            <polygon
              points="64,46 80,46 72,78 54,78"
              fill={accentHex}
              opacity={0.55 + chargeRatio * 0.45}
            />
            <polygon
              points="176,46 160,46 168,78 186,78"
              fill={accentHex}
              opacity={0.55 + chargeRatio * 0.45}
            />

            {/* Center Roof Crest Plate */}
            <polygon
              points="96,48 144,48 150,76 90,76"
              fill="rgba(9, 10, 16, 0.72)"
              stroke={metal.trim}
              strokeWidth="1.6"
            />
            <polygon
              points="120,53 130,62 120,71 110,62"
              fill={accentHex}
              opacity={0.85}
            />

            {/* Lid Front Skirt / Bevel Face */}
            <path
              d="M 22 86 L 218 86 L 214 114 L 26 114 Z"
              fill={`url(#lidFront-${tier})`}
              stroke={`url(#lidEdge-${tier})`}
              strokeWidth="2.8"
            />

            {/* Glowing Accent Bar across Lid Front */}
            <rect
              x="44"
              y="95"
              width="46"
              height="6"
              rx="3"
              fill={accentHex}
              opacity={0.65 + chargeRatio * 0.35}
            />
            <rect
              x="150"
              y="95"
              width="46"
              height="6"
              rx="3"
              fill={accentHex}
              opacity={0.65 + chargeRatio * 0.35}
            />

            {/* Specular metallic reflection stripe */}
            <line
              x1="44"
              y1="88"
              x2="196"
              y2="88"
              stroke="rgba(255,255,255,0.35)"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* =================== LEFT & RIGHT HYDRAULIC SIDE CLAMPS =================== */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-[38%] left-1 h-16 w-7 transition-all duration-300"
          style={{
            transform: `translate3d(${-clampOpenPx}px, ${isBurst ? -16 : 0}px, 0) rotate(${-clampRotDeg}deg)`,
            opacity: isBurst ? 0 : 1,
          }}
        >
          <svg viewBox="0 0 28 68" className="h-full w-full overflow-visible">
            <rect
              x="3"
              y="4"
              width="20"
              height="60"
              rx="5"
              fill={metal.bodyTop}
              stroke={metal.trimHi}
              strokeWidth="2.2"
            />
            <rect
              x="8"
              y="18"
              width="10"
              height="32"
              rx="3"
              fill={beatStage >= 1 ? accentHex : '#3f3f46'}
            />
            <circle cx="13" cy="11" r="2.2" fill="#e4e4e7" />
            <circle cx="13" cy="57" r="2.2" fill="#e4e4e7" />
          </svg>
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-[38%] right-1 h-16 w-7 transition-all duration-300"
          style={{
            transform: `translate3d(${clampOpenPx}px, ${isBurst ? -16 : 0}px, 0) rotate(${clampRotDeg}deg)`,
            opacity: isBurst ? 0 : 1,
          }}
        >
          <svg viewBox="0 0 28 68" className="h-full w-full overflow-visible">
            <rect
              x="5"
              y="4"
              width="20"
              height="60"
              rx="5"
              fill={metal.bodyTop}
              stroke={metal.trimHi}
              strokeWidth="2.2"
            />
            <rect
              x="10"
              y="18"
              width="10"
              height="32"
              rx="3"
              fill={beatStage >= 2 ? accentHex : '#3f3f46'}
            />
            <circle cx="15" cy="11" r="2.2" fill="#e4e4e7" />
            <circle cx="15" cy="57" r="2.2" fill="#e4e4e7" />
          </svg>
        </div>

        {/* =================== CENTER HEXAGONAL REACTOR LOCK CORE =================== */}
        {!isBurst && (
          <div
            className="pointer-events-none absolute top-[48%] left-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center transition-transform duration-150"
            style={{
              transform: `translate(-50%, -50%) scale(${1 + chargeRatio * 0.16})`,
            }}
          >
            {/* Outer Hexagonal Housing */}
            <svg
              viewBox="0 0 64 64"
              className="absolute inset-0 h-full w-full overflow-visible"
              aria-hidden="true"
            >
              <polygon
                points="32,3 57,17 57,47 32,61 7,47 7,17"
                fill="#09090d"
                stroke={accentHex}
                strokeWidth="2.8"
                style={{
                  filter: `drop-shadow(0 0 ${10 + chargeRatio * 18}px ${accentHex})`,
                }}
              />
              {/* Circular Charge Progress Ring */}
              <circle
                cx="32"
                cy="32"
                r="22"
                fill="none"
                stroke="rgba(255,255,255,0.12)"
                strokeWidth="3"
              />
              <circle
                cx="32"
                cy="32"
                r="22"
                fill="none"
                stroke={secondaryHex}
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeDasharray={`${Math.round(chargeRatio * 138.2)} 140`}
                transform="rotate(-90 32 32)"
              />
            </svg>

            {/* Inner Core Icon */}
            <div className="relative z-10 flex h-9 w-9 items-center justify-center rounded-full bg-zinc-950/90">
              {chargeRatio >= 0.78 ? (
                <LockOpen
                  className="h-4.5 w-4.5 transition-colors duration-200"
                  style={{ color: secondaryHex }}
                />
              ) : (
                <Lock
                  className="h-4.5 w-4.5 transition-colors duration-200"
                  style={{ color: accentHex }}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

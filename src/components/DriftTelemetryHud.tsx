import React, { useEffect, useLayoutEffect, useRef } from 'react';

interface DriftTelemetryHudProps {
  drifting: boolean;
  driftScore: number;
  driftMultiplier: number;
  /** Exact 0..1 progress toward next multiplier tier while actively drifting */
  driftProgress: number;
  /** Exact 0..1 remaining link-grace ratio when briefly straight between drifts */
  driftGraceRatio: number;
  driftAngleDeg: number;
}

const MAX_DRIFT_MULT = 10;

interface DriftTierPalette {
  gradStart: string;
  gradMid: string;
  gradEnd: string;
  tip: string;
  rim: string;
  glow: string;
  badgeBg: string;
  badgeText: string;
  labelClass: string;
  pipActive: string;
  pipGlow: string;
}

const getDriftTierPalette = (
  mult: number,
  drifting: boolean,
): DriftTierPalette => {
  if (!drifting) {
    return {
      gradStart: '#0369a1',
      gradMid: '#0ea5e9',
      gradEnd: '#7dd3fc',
      tip: '#e0f2fe',
      rim: '#38bdf8',
      glow: 'rgba(56,189,248,0.52)',
      badgeBg: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
      badgeText: '#082f49',
      labelClass: 'text-sky-300',
      pipActive: '#38bdf8',
      pipGlow: '0 0 6px rgba(56,189,248,0.8)',
    };
  }
  if (mult >= 10) {
    return {
      gradStart: '#d97706',
      gradMid: '#fde047',
      gradEnd: '#fef9c3',
      tip: '#ffffff',
      rim: '#fef08a',
      glow: 'rgba(254,240,138,0.88)',
      badgeBg: 'linear-gradient(135deg, #ffffff 0%, #fef08a 45%, #f59e0b 100%)',
      badgeText: '#451a03',
      labelClass: 'text-yellow-200',
      pipActive: '#fef08a',
      pipGlow: '0 0 8px rgba(254,240,138,0.95)',
    };
  }
  if (mult >= 9) {
    return {
      gradStart: '#0284c7',
      gradMid: '#06b6d4',
      gradEnd: '#a5f3fc',
      tip: '#ffffff',
      rim: '#67e8f9',
      glow: 'rgba(34,211,238,0.8)',
      badgeBg: 'linear-gradient(135deg, #a5f3fc 0%, #22d3ee 50%, #0284c7 100%)',
      badgeText: '#083344',
      labelClass: 'text-cyan-200',
      pipActive: '#67e8f9',
      pipGlow: '0 0 7px rgba(34,211,238,0.9)',
    };
  }
  if (mult >= 7) {
    return {
      gradStart: '#7e22ce',
      gradMid: '#c026d3',
      gradEnd: '#f0abfc',
      tip: '#fdf4ff',
      rim: '#e879f9',
      glow: 'rgba(217,70,239,0.75)',
      badgeBg: 'linear-gradient(135deg, #f5d0fe 0%, #e879f9 52%, #a21caf 100%)',
      badgeText: '#3b0764',
      labelClass: 'text-fuchsia-300',
      pipActive: '#e879f9',
      pipGlow: '0 0 7px rgba(217,70,239,0.88)',
    };
  }
  if (mult >= 5) {
    return {
      gradStart: '#9f1239',
      gradMid: '#e11d48',
      gradEnd: '#fda4af',
      tip: '#fff1f2',
      rim: '#fb7185',
      glow: 'rgba(244,63,94,0.72)',
      badgeBg: 'linear-gradient(135deg, #fecdd3 0%, #fb7185 52%, #be123c 100%)',
      badgeText: '#4c0519',
      labelClass: 'text-rose-300',
      pipActive: '#fb7185',
      pipGlow: '0 0 7px rgba(244,63,94,0.85)',
    };
  }
  if (mult >= 3) {
    return {
      gradStart: '#b45309',
      gradMid: '#f97316',
      gradEnd: '#fdba74',
      tip: '#fff7ed',
      rim: '#fb923c',
      glow: 'rgba(249,115,22,0.68)',
      badgeBg: 'linear-gradient(135deg, #fed7aa 0%, #fb923c 52%, #ea580c 100%)',
      badgeText: '#431407',
      labelClass: 'text-orange-300',
      pipActive: '#fb923c',
      pipGlow: '0 0 6px rgba(249,115,22,0.82)',
    };
  }
  return {
    gradStart: '#92400e',
    gradMid: '#f59e0b',
    gradEnd: '#fde68a',
    tip: '#ffffff',
    rim: '#fbbf24',
    glow: 'rgba(245,158,11,0.6)',
    badgeBg: 'linear-gradient(135deg, #fef08a 0%, #fbbf24 55%, #d97706 100%)',
    badgeText: '#451a03',
    labelClass: 'text-amber-300',
    pipActive: '#fbbf24',
    pipGlow: '0 0 6px rgba(251,191,36,0.8)',
  };
};

const clamp01 = (v: number): number => {
  if (!Number.isFinite(v)) return 0;
  return v < 0 ? 0 : v > 1 ? 1 : v;
};

const BAR_PATH = 'M 10 14 L 22 2 L 598 2 L 586 14 Z';

export const DriftTelemetryHud: React.FC<DriftTelemetryHudProps> = React.memo(
  ({
    drifting,
    driftScore,
    driftMultiplier,
    driftProgress,
    driftGraceRatio,
    driftAngleDeg,
  }) => {
    const clampedMult = Math.min(
      MAX_DRIFT_MULT,
      Math.max(1, Math.round(driftMultiplier)),
    );
    const isMax = clampedMult >= MAX_DRIFT_MULT;
    // Hold bar steady at current tier progress when driving straight (never drain)
    const targetRatio = isMax ? 1 : clamp01(driftProgress);
    const palette = getDriftTierPalette(clampedMult, drifting);

    // Direct DOM refs driven at native 60/120fps (decoupled from 10-15Hz React telemetry)
    const fillGroupRef = useRef<SVGGElement | null>(null);
    const liveClipRectRef = useRef<SVGRectElement | null>(null);
    const edgeGroupRef = useRef<SVGGElement | null>(null);
    const scoreTextRef = useRef<HTMLSpanElement | null>(null);

    const animRef = useRef({
      targetRatio,
      ratioVelocity: 0,
      displayRatio: targetRatio,
      targetScore: Math.max(0, driftScore),
      scoreVelocity: 0,
      displayScore: Math.max(0, driftScore),
      lastScoreInt: -1,
      lastDrifting: drifting,
      lastMult: clampedMult,
      sampleTime: performance.now(),
      lastFrameTime: 0,
      rafId: 0,
    });

    const applyVisuals = (ratio: number, scoreVal: number) => {
      const clamped = clamp01(ratio);
      const x = clamped * 600;
      const tr = `translate(${x.toFixed(2)} 0)`;

      if (fillGroupRef.current) {
        fillGroupRef.current.setAttribute('transform', tr);
      }
      if (liveClipRectRef.current) {
        liveClipRectRef.current.setAttribute('transform', tr);
      }
      if (edgeGroupRef.current) {
        const lowFade = Math.min(1, clamped / 0.03);
        const highFade = Math.min(1, (1 - clamped) / 0.02);
        const op = Math.max(0, Math.min(lowFade, highFade));
        edgeGroupRef.current.setAttribute('transform', tr);
        edgeGroupRef.current.setAttribute('opacity', op.toFixed(3));
      }

      const nextInt = Math.max(0, Math.round(scoreVal));
      if (scoreTextRef.current && nextInt !== animRef.current.lastScoreInt) {
        animRef.current.lastScoreInt = nextInt;
        scoreTextRef.current.textContent = `+${nextInt.toLocaleString('tr-TR')}`;
      }
    };

    // Update targets & velocities when telemetry arrives
    useEffect(() => {
      const st = animRef.current;
      const now = performance.now();
      const elapsed = (now - st.sampleTime) / 1000;
      const safeScore = Math.max(0, driftScore);
      const modeChanged = st.lastDrifting !== drifting;
      const multChanged = st.lastMult !== clampedMult;

      if (modeChanged) {
        st.lastDrifting = drifting;
        st.ratioVelocity = 0;
        // Snap bar cleanly when switching between active fill and grace countdown
        st.displayRatio = targetRatio;
      } else if (multChanged) {
        st.lastMult = clampedMult;
        st.ratioVelocity = 0;
        // On tier-up, reset bar smoothly from 0 toward the new tier progress
        st.displayRatio = isMax ? 1 : targetRatio;
      } else if (elapsed > 0.012 && elapsed < 0.35) {
        const dRatio = targetRatio - st.targetRatio;
        if (Math.abs(dRatio) < 0.35 && targetRatio > 0.002 && targetRatio < 0.998) {
          const measuredVel = Math.max(-2.5, Math.min(2.5, dRatio / elapsed));
          st.ratioVelocity =
            st.ratioVelocity === 0
              ? measuredVel
              : st.ratioVelocity * 0.35 + measuredVel * 0.65;
        } else {
          st.ratioVelocity = 0;
        }
      } else {
        st.ratioVelocity = 0;
      }

      if (elapsed > 0.012 && elapsed < 0.35 && safeScore >= st.targetScore) {
        const dScore = safeScore - st.targetScore;
        const vel = Math.max(0, Math.min(2500, dScore / elapsed));
        st.scoreVelocity =
          st.scoreVelocity === 0 ? vel : st.scoreVelocity * 0.4 + vel * 0.6;
      } else {
        st.scoreVelocity = 0;
        if (safeScore < st.displayScore) {
          st.displayScore = safeScore;
        }
      }

      st.targetRatio = targetRatio;
      st.targetScore = safeScore;
      st.sampleTime = now;
    }, [drifting, driftScore, clampedMult, targetRatio, isMax]);

    // Synchronous initial paint
    useLayoutEffect(() => {
      const st = animRef.current;
      applyVisuals(st.displayRatio, st.displayScore);
    }, []);

    // Silky 60/120fps rAF loop
    useEffect(() => {
      const st = animRef.current;
      st.lastFrameTime = performance.now();

      const tick = (now: number) => {
        const dt = Math.min(
          0.05,
          Math.max(0.001, (now - st.lastFrameTime) / 1000),
        );
        st.lastFrameTime = now;

        const since = Math.min(
          0.13,
          Math.max(0, (now - st.sampleTime) / 1000),
        );

        const predRatio = clamp01(st.targetRatio + st.ratioVelocity * since);
        const ratioAlpha = 1 - Math.exp(-24 * dt);
        st.displayRatio += (predRatio - st.displayRatio) * ratioAlpha;

        const predScore = Math.max(
          0,
          st.targetScore + st.scoreVelocity * since,
        );
        const scoreAlpha = 1 - Math.exp(-22 * dt);
        st.displayScore += (predScore - st.displayScore) * scoreAlpha;

        applyVisuals(st.displayRatio, st.displayScore);
        st.rafId = requestAnimationFrame(tick);
      };

      st.rafId = requestAnimationFrame(tick);
      return () => {
        if (st.rafId) {
          cancelAnimationFrame(st.rafId);
          st.rafId = 0;
        }
      };
    }, []);

    return (
      <div className="animate-hud-drift-enter flex w-[min(90vw,336px)] flex-col gap-1 select-none">
        {/* ROW 1: Frameless Floating Motorsport Drift Readout + Kinetic Multiplier Core */}
        <div className="flex items-end justify-between gap-2 px-1">
          {/* Left: Mode label + Dynamic Slip-Angle Micro-Arc */}
          <div className="flex items-center gap-1.5 leading-none pb-0.5">
            <svg
              viewBox="0 0 22 14"
              aria-hidden="true"
              className="h-3.5 w-5 shrink-0 overflow-visible"
              style={{ filter: `drop-shadow(0 0 5px ${palette.glow})` }}
            >
              {/* Angled twin drift tire-arc streaks */}
              <path
                d="M 2 12 Q 9 11 16 4"
                fill="none"
                stroke={palette.rim}
                strokeWidth="2.1"
                strokeLinecap="round"
              />
              <path
                d="M 7 12.5 Q 13 11.5 20 5.5"
                fill="none"
                stroke={palette.tip}
                strokeWidth="1.5"
                strokeLinecap="round"
                opacity="0.75"
              />
            </svg>
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5 leading-none">
                <span
                  className={`font-display italic text-[11px] sm:text-xs font-black tracking-[0.2em] drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)] ${palette.labelClass}`}
                >
                  {drifting ? 'DRİFT' : 'ZİNCİR'}
                </span>
                {drifting && driftAngleDeg > 0 && (
                  <span className="font-mono-num text-[10px] sm:text-[11px] font-bold text-white/85 drop-shadow-[0_1px_4px_rgba(0,0,0,0.95)]">
                    {driftAngleDeg}°
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Center: Big Floating High-Contrast Live Drift Score */}
          <span
            ref={scoreTextRef}
            className="font-display font-mono-num text-xl sm:text-2xl font-black italic tracking-tight text-white leading-none drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]"
            style={{
              textShadow: `0 0 14px ${palette.glow}, 0 2px 6px rgba(0,0,0,0.95)`,
            }}
          />

          {/* Right: Sculpted Slanted Kinetic Multiplier Core (x1 .. x10) */}
          <div className="flex items-center gap-1">
            {isMax && (
              <span className="font-display italic text-[9px] font-black tracking-[0.18em] text-yellow-200 drop-shadow-[0_1px_5px_rgba(0,0,0,0.95)]">
                MAX
              </span>
            )}
            <div
              key={clampedMult}
              className="animate-hud-drift-pop relative flex h-6 sm:h-7 min-w-[44px] sm:min-w-[50px] items-center justify-center px-2.5"
              style={{
                background: palette.badgeBg,
                boxShadow: `0 0 14px ${palette.glow}, 0 3px 10px rgba(0,0,0,0.75)`,
                clipPath: 'polygon(14% 0%, 100% 0%, 86% 100%, 0% 100%)',
              }}
            >
              {/* Top specular metallic sheen */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-[42%] bg-white/35"
              />
              <span
                className="relative font-display font-mono-num text-sm sm:text-base font-black tracking-tight leading-none"
                style={{ color: palette.badgeText }}
              >
                ×{clampedMult}
              </span>
            </div>
          </div>
        </div>

        {/* ROW 2: Silky 60/120fps Sweeping Slanted SVG Drift Progress / Grace Ribbon */}
        <svg
          viewBox="0 0 600 16"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="h-3 sm:h-3.5 w-full overflow-visible"
          style={{
            filter: `drop-shadow(0 0 8px ${palette.glow})`,
          }}
        >
          <defs>
            <clipPath id="viraj-drift-bar-clip">
              <path d={BAR_PATH} />
            </clipPath>

            <clipPath id="viraj-drift-live-clip">
              <rect
                ref={liveClipRectRef}
                x="-600"
                y="0"
                width="600"
                height="16"
              />
            </clipPath>

            <linearGradient
              id="viraj-drift-fill-grad"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor={palette.gradStart} />
              <stop offset="52%" stopColor={palette.gradMid} />
              <stop offset="91%" stopColor={palette.gradEnd} />
              <stop offset="99%" stopColor={palette.tip} />
              <stop offset="100%" stopColor={palette.gradEnd} />
            </linearGradient>

            <linearGradient
              id="viraj-drift-edge-glow"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor={palette.rim} stopOpacity="0" />
              <stop offset="55%" stopColor={palette.rim} stopOpacity="0.55" />
              <stop offset="76%" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="100%" stopColor={palette.rim} stopOpacity="0" />
            </linearGradient>

            <pattern
              id="viraj-drift-flow-pattern"
              width="48"
              height="16"
              patternUnits="userSpaceOnUse"
            >
              <polygon
                points="14,0 24,0 14,16 4,16"
                fill="rgba(255,255,255,0.28)"
              />
              <polygon
                points="34,0 38,0 28,16 24,16"
                fill="rgba(255,255,255,0.16)"
              />
            </pattern>
          </defs>

          <g clipPath="url(#viraj-drift-bar-clip)">
            {/* Smoked aerodynamic channel */}
            <rect
              x="0"
              y="0"
              width="600"
              height="16"
              fill="rgba(9, 10, 16, 0.78)"
            />

            {/* Silky 60/120fps continuous fill */}
            <g ref={fillGroupRef}>
              <rect
                x="-600"
                y="0"
                width="600"
                height="16"
                fill="url(#viraj-drift-fill-grad)"
              />
            </g>

            {/* Animated kinetic heat flow inside active fill */}
            <g clipPath="url(#viraj-drift-live-clip)">
              <g
                className={
                  drifting
                    ? 'animate-hud-nitro-flow-fast'
                    : 'animate-hud-nitro-flow'
                }
                opacity={drifting ? 0.58 : 0.25}
              >
                <rect
                  x="-48"
                  y="0"
                  width="696"
                  height="16"
                  fill="url(#viraj-drift-flow-pattern)"
                />
              </g>
            </g>

            {/* Feathered luminous edge flare + razor slanted spear */}
            <g ref={edgeGroupRef}>
              <rect
                x="-30"
                y="0"
                width="44"
                height="16"
                fill="url(#viraj-drift-edge-glow)"
              />
              <polygon
                points="1,0 6,0 -2,16 -7,16"
                fill="#ffffff"
                opacity="0.95"
              />
            </g>

            {/* Crisp upper glass reflection line */}
            <line
              x1="20"
              y1="3"
              x2="596"
              y2="3"
              stroke="rgba(255,255,255,0.42)"
              strokeWidth="1.2"
            />
          </g>

          {/* Razor vector blade rim */}
          <path
            d={BAR_PATH}
            fill="none"
            stroke={palette.rim}
            strokeOpacity="0.88"
            strokeWidth="1.4"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* ROW 3: 10-Tier Slanted Chevron Ladder (×1 .. ×10) */}
        <div className="flex items-center gap-1.5 px-1.5">
          <div className="grid flex-1 grid-cols-10 gap-1">
            {Array.from({ length: MAX_DRIFT_MULT }, (_, idx) => {
              const tier = idx + 1;
              const unlocked = tier <= clampedMult;
              const isNext = tier === clampedMult + 1 && drifting;
              return (
                <div
                  key={tier}
                  className={`h-[4px] -skew-x-[24deg] transition-colors duration-200 ${
                    isNext ? 'animate-hud-critical-pulse' : ''
                  }`}
                  style={{
                    backgroundColor: unlocked
                      ? palette.pipActive
                      : isNext
                        ? 'rgba(255,255,255,0.42)'
                        : 'rgba(255,255,255,0.14)',
                    boxShadow: unlocked ? palette.pipGlow : 'none',
                  }}
                />
              );
            })}
          </div>
          <span className="font-mono-num text-[9px] font-black tracking-wider text-white/75 drop-shadow-[0_1px_4px_rgba(0,0,0,0.95)] whitespace-nowrap">
            {isMax ? '×10' : `→ ×${clampedMult + 1}`}
          </span>
        </div>
      </div>
    );
  },
);

DriftTelemetryHud.displayName = 'DriftTelemetryHud';

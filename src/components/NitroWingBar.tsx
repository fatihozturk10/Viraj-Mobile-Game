import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { Flame } from 'lucide-react';

interface NitroWingBarProps {
  /** Exact floating-point nitro percentage (0..100) */
  nitroPercent: number;
  nitroMax?: number;
  nitroActive: boolean;
  onNitroToggle: (clientX: number, clientY: number) => void;
}

const WING_PATH =
  'M 2 35 L 12 26 Q 380 25 690 16 Q 865 11 998 4 L 986 35 Z';

const clampPct = (v: number): number => {
  if (!Number.isFinite(v)) return 0;
  return v < 0 ? 0 : v > 100 ? 100 : v;
};

const IS_COARSE_MOBILE =
  typeof window !== 'undefined' &&
  (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '') ||
    Boolean(window.matchMedia?.('(pointer: coarse)').matches));

export const NitroWingBar: React.FC<NitroWingBarProps> = React.memo(
  ({ nitroPercent, nitroMax = 100, nitroActive, onNitroToggle }) => {
    const safePct = clampPct(nitroPercent);
    const safeMax = Math.max(100, Math.round(nitroMax || 100));
    const nitroMaxRef = useRef(safeMax);
    nitroMaxRef.current = safeMax;
    const roundedPct = Math.round(safePct);
    const isReady = safePct >= 14;

    const tapRef = useRef<number>(0);

    // Direct SVG/DOM refs driven at native 60/120fps with zero React re-render interference
    const fillGroupRef = useRef<SVGGElement | null>(null);
    const liveClipRectRef = useRef<SVGRectElement | null>(null);
    const trailGroupRef = useRef<SVGGElement | null>(null);
    const edgeGroupRef = useRef<SVGGElement | null>(null);
    const pctTextRef = useRef<HTMLSpanElement | null>(null);

    // Continuous velocity-matched interpolator state
    const animRef = useRef({
      target: safePct,
      sampleTime: performance.now(),
      velocity: 0, // % per second
      display: safePct,
      trail: safePct,
      lastNitroActive: nitroActive,
      lastRenderedInt: -1,
      lastAppliedDisplay: -999,
      lastAppliedTrail: -999,
      lastDomWriteMs: 0,
      rafId: 0,
      lastFrameTime: 0,
    });

    const applyVisuals = (
      displayPct: number,
      trailPct: number,
      active: boolean,
      force = false,
    ) => {
      const st = animRef.current;
      if (
        !force &&
        Math.abs(displayPct - st.lastAppliedDisplay) < 0.08 &&
        Math.abs(trailPct - st.lastAppliedTrail) < 0.08
      ) {
        return;
      }
      st.lastAppliedDisplay = displayPct;
      st.lastAppliedTrail = trailPct;

      const fillX = displayPct * 10;
      const trailX = trailPct * 10;
      const fillTransform = `translate(${fillX.toFixed(1)} 0)`;
      const trailTransform = `translate(${trailX.toFixed(1)} 0)`;

      if (fillGroupRef.current) {
        fillGroupRef.current.setAttribute('transform', fillTransform);
      }
      if (liveClipRectRef.current) {
        liveClipRectRef.current.setAttribute('transform', fillTransform);
      }

      if (trailGroupRef.current) {
        const lag = trailPct - displayPct;
        if (lag > 0.06) {
          const trailOpacity = Math.min(
            active ? 0.94 : 0.7,
            0.22 + (lag / 6.0) * 0.72,
          );
          trailGroupRef.current.setAttribute('transform', trailTransform);
          trailGroupRef.current.setAttribute(
            'opacity',
            trailOpacity.toFixed(3),
          );
        } else {
          trailGroupRef.current.setAttribute('opacity', '0');
        }
      }

      if (edgeGroupRef.current) {
        // Softly fade the leading plasma spear in/out near 0% and 100%
        const lowFade = Math.min(1, displayPct / 2.2);
        const highFade = Math.min(1, (100 - displayPct) / 1.4);
        const edgeOpacity = Math.max(0, Math.min(lowFade, highFade));
        edgeGroupRef.current.setAttribute('transform', fillTransform);
        edgeGroupRef.current.setAttribute('opacity', edgeOpacity.toFixed(3));
      }

      const maxCap = nitroMaxRef.current;
      const nextInt =
        maxCap > 100
          ? Math.min(maxCap, Math.max(0, Math.round((displayPct / 100) * maxCap)))
          : Math.min(100, Math.max(0, Math.round(displayPct)));
      const encodedDisplay = nextInt * 1000 + maxCap;
      if (
        pctTextRef.current &&
        encodedDisplay !== animRef.current.lastRenderedInt
      ) {
        animRef.current.lastRenderedInt = encodedDisplay;
        pctTextRef.current.textContent =
          maxCap > 100 ? `${nextInt}/${maxCap}` : `%${nextInt}`;
      }
    };

    // Update target & dead-reckoning velocity whenever telemetry arrives
    useEffect(() => {
      const st = animRef.current;
      const now = performance.now();
      const elapsed = (now - st.sampleTime) / 1000;
      const delta = safePct - st.target;
      const activeChanged = st.lastNitroActive !== nitroActive;

      if (activeChanged) {
        st.lastNitroActive = nitroActive;
        st.velocity = 0;
      } else if (
        elapsed > 0.012 &&
        elapsed < 0.35 &&
        Math.abs(delta) <= 15 &&
        safePct > 0.01 &&
        safePct < 99.99
      ) {
        const measuredVel = delta / elapsed;
        const clampedVel = Math.max(-45, Math.min(45, measuredVel));
        // Smooth velocity slightly so minor timer jitter never causes oscillation
        st.velocity =
          st.velocity === 0
            ? clampedVel
            : st.velocity * 0.35 + clampedVel * 0.65;
      } else if (
        Math.abs(delta) > 15 ||
        safePct <= 0.01 ||
        safePct >= 99.99 ||
        Math.abs(delta) < 0.001
      ) {
        st.velocity = 0;
      }

      // Snap cleanly on sudden large downward reset (e.g. instant run restart)
      if (delta < -35) {
        st.display = safePct;
        st.trail = safePct;
      }

      st.target = safePct;
      st.sampleTime = now;
    }, [safePct, nitroActive]);

    // Set exact initial transform/text synchronously before first paint
    useLayoutEffect(() => {
      const st = animRef.current;
      applyVisuals(st.display, st.trail, st.lastNitroActive, true);
    }, []);

    // Dedicated native-refresh rAF loop for silky-smooth bar motion (throttled DOM writes on mobile)
    useEffect(() => {
      const st = animRef.current;
      st.lastFrameTime = performance.now();

      const tick = (now: number) => {
        const dt = Math.min(
          0.05,
          Math.max(0.001, (now - st.lastFrameTime) / 1000),
        );
        st.lastFrameTime = now;

        // Predict live continuous position between 10–15Hz HUD telemetry ticks
        const sinceSample = Math.min(
          0.135,
          Math.max(0, (now - st.sampleTime) / 1000),
        );
        const predicted = clampPct(st.target + st.velocity * sinceSample);

        // Smooth critically-fast tracking toward the predicted continuous value
        const followRate = st.lastNitroActive ? 26 : 20;
        const followAlpha = 1 - Math.exp(-followRate * dt);
        st.display += (predicted - st.display) * followAlpha;

        if (
          Math.abs(predicted - st.display) < 0.008 &&
          Math.abs(st.velocity) < 0.05
        ) {
          st.display = predicted;
        }

        // Evaporating afterburner trail: snaps up on recharge, dissolves smoothly on drain
        if (st.display >= st.trail) {
          st.trail = st.display;
        } else {
          const trailAlpha = 1 - Math.exp(-5.4 * dt);
          st.trail += (st.display - st.trail) * trailAlpha;
          if (st.trail - st.display < 0.04) {
            st.trail = st.display;
          }
        }

        if (!IS_COARSE_MOBILE || now - st.lastDomWriteMs >= 28) {
          st.lastDomWriteMs = now;
          applyVisuals(st.display, st.trail, st.lastNitroActive);
        }
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
      <button
        type="button"
        onPointerDown={(e) => {
          e.stopPropagation();
          const now = performance.now();
          if (now - tapRef.current < 360) {
            tapRef.current = 0;
            onNitroToggle(e.clientX, e.clientY);
          } else {
            tapRef.current = now;
          }
        }}
        disabled={roundedPct < 5 && !nitroActive}
        aria-label="Nitro Etkinleştir (Çift Tıkla)"
        className="pointer-events-auto group relative flex h-10 sm:h-11 w-full items-end cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
      >
        {/* Floating frameless label tucked cleanly into the left aerodynamic curve */}
        <div className="pointer-events-none absolute top-0 left-1 z-10 flex items-center gap-2 leading-none">
          <span
            className={`ug-skew inline-flex items-center gap-1 px-2 py-0.5 border ${
              nitroActive
                ? 'border-cyan-300/70 bg-cyan-500/30'
                : isReady
                  ? 'border-cyan-400/40 bg-[#0b1320]/90'
                  : 'border-white/10 bg-[#0b0e16]/85'
            }`}
          >
            <Flame
              className={`h-3.5 w-3.5 shrink-0 transition-colors duration-200 ${
                nitroActive
                  ? 'fill-white text-cyan-200'
                  : isReady
                    ? 'fill-cyan-400/80 text-cyan-300'
                    : 'text-zinc-500'
              }`}
            />
            <span
              className={`font-display italic text-[10.5px] sm:text-xs font-bold tracking-[0.16em] uppercase transition-colors duration-200 ${
                nitroActive
                  ? 'text-white'
                  : isReady
                    ? 'text-cyan-200'
                    : 'text-zinc-400'
              }`}
            >
              {nitroActive ? 'NOS AKTİF' : 'NİTRO'}
            </span>
          </span>
          <span
            ref={pctTextRef}
            className={`font-mono-num text-xs sm:text-sm font-black tracking-tight [text-shadow:0_1px_5px_rgba(0,0,0,0.95)] transition-colors duration-200 ${
              nitroActive
                ? 'text-cyan-100'
                : isReady
                  ? 'text-white'
                  : 'text-zinc-400'
            }`}
          />
        </div>

        {/* Full-Width Sweeping Curved Turbo-Boost Blade SVG */}
        <svg
          viewBox="0 0 1000 38"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="h-full w-full overflow-visible"
          style={
            IS_COARSE_MOBILE
              ? undefined
              : {
                  filter: nitroActive
                    ? 'drop-shadow(0 0 11px rgba(34,211,238,0.82))'
                    : isReady
                      ? 'drop-shadow(0 2px 8px rgba(14,165,233,0.42))'
                      : 'drop-shadow(0 2px 6px rgba(0,0,0,0.65))',
                }
          }
        >
          <defs>
            {/* Outer aerodynamic turbo-wing silhouette clip */}
            <clipPath id="viraj-nitro-wing-clip">
              <path d={WING_PATH} />
            </clipPath>

            {/* Live animated fill clip so flowing plasma stays strictly inside active fuel */}
            <clipPath id="viraj-nitro-live-fill-clip">
              <rect
                ref={liveClipRectRef}
                x="-1000"
                y="0"
                width="1000"
                height="38"
              />
            </clipPath>

            {/* Pressurized plasma fill gradient — hottest cyan-white core stays anchored to the live burning tip */}
            <linearGradient
              id="viraj-nitro-fill-grad"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              {nitroActive ? (
                <>
                  <stop offset="0%" stopColor="#1e3a8a" />
                  <stop offset="40%" stopColor="#0284c7" />
                  <stop offset="76%" stopColor="#06b6d4" />
                  <stop offset="93%" stopColor="#67e8f9" />
                  <stop offset="98.8%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#e0f2fe" />
                </>
              ) : isReady ? (
                <>
                  <stop offset="0%" stopColor="#0c4a6e" />
                  <stop offset="46%" stopColor="#0284c7" />
                  <stop offset="84%" stopColor="#22d3ee" />
                  <stop offset="96%" stopColor="#a5f3fc" />
                  <stop offset="100%" stopColor="#e0f2fe" />
                </>
              ) : (
                <>
                  <stop offset="0%" stopColor="#1e293b" />
                  <stop offset="78%" stopColor="#334155" />
                  <stop offset="100%" stopColor="#64748b" />
                </>
              )}
            </linearGradient>

            {/* Soft evaporating afterburner vapor trail behind the receding edge */}
            <linearGradient
              id="viraj-nitro-trail-grad"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.06" />
              <stop offset="76%" stopColor="#38bdf8" stopOpacity="0.22" />
              <stop
                offset="93%"
                stopColor={nitroActive ? '#67e8f9' : '#7dd3fc'}
                stopOpacity={nitroActive ? '0.68' : '0.45'}
              />
              <stop
                offset="97.5%"
                stopColor={nitroActive ? '#ffffff' : '#bae6fd'}
                stopOpacity={nitroActive ? '0.58' : '0.32'}
              />
              <stop offset="100%" stopColor="#e0f2fe" stopOpacity="0" />
            </linearGradient>

            {/* Feathered glowing plasma bloom right at the moving front edge */}
            <linearGradient
              id="viraj-nitro-edge-glow"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0" />
              <stop
                offset="52%"
                stopColor={nitroActive ? '#67e8f9' : '#38bdf8'}
                stopOpacity={nitroActive ? '0.52' : '0.28'}
              />
              <stop
                offset="72%"
                stopColor="#ffffff"
                stopOpacity={nitroActive ? '0.92' : '0.68'}
              />
              <stop
                offset="84%"
                stopColor={nitroActive ? '#67e8f9' : '#7dd3fc'}
                stopOpacity={nitroActive ? '0.44' : '0.2'}
              />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
            </linearGradient>

            {/* Seamless 48-unit diagonal plasma current pattern for GPU-composited flow */}
            <pattern
              id="viraj-nitro-energy-pattern"
              width="48"
              height="38"
              patternUnits="userSpaceOnUse"
            >
              <polygon
                points="14,0 26,0 12,38 0,38"
                fill="rgba(255, 255, 255, 0.24)"
              />
              <polygon
                points="34,0 39,0 25,38 20,38"
                fill="rgba(186, 230, 253, 0.16)"
              />
            </pattern>

            <linearGradient
              id="viraj-nitro-rim-grad"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop
                offset="0%"
                stopColor={
                  nitroActive ? '#67e8f9' : isReady ? '#38bdf8' : '#52525b'
                }
                stopOpacity="0.45"
              />
              <stop
                offset="100%"
                stopColor={
                  nitroActive ? '#ffffff' : isReady ? '#67e8f9' : '#71717a'
                }
                stopOpacity="0.95"
              />
            </linearGradient>
          </defs>

          <g clipPath="url(#viraj-nitro-wing-clip)">
            {/* 1. Smoked aerodynamic glass channel */}
            <rect
              x="0"
              y="0"
              width="1000"
              height="38"
              fill="rgba(7, 11, 20, 0.74)"
            />

            {/* 2. Silky evaporating afterburner heat trail during depletion */}
            <g ref={trailGroupRef}>
              <rect
                x="-1000"
                y="0"
                width="1000"
                height="38"
                fill="url(#viraj-nitro-trail-grad)"
              />
            </g>

            {/* 3. Active pressurized plasma fill (60/120fps continuous glide) */}
            <g ref={fillGroupRef}>
              <rect
                x="-1000"
                y="0"
                width="1000"
                height="38"
                fill="url(#viraj-nitro-fill-grad)"
              />
            </g>

            {/* 4. Flowing pressurized plasma stream inside active fill */}
            <g clipPath="url(#viraj-nitro-live-fill-clip)">
              <g
                className={
                  IS_COARSE_MOBILE
                    ? undefined
                    : nitroActive
                      ? 'animate-hud-nitro-flow-fast'
                      : 'animate-hud-nitro-flow'
                }
                opacity={nitroActive ? 0.56 : isReady ? 0.22 : 0.06}
              >
                <rect
                  x="-48"
                  y="0"
                  width="1096"
                  height="38"
                  fill="url(#viraj-nitro-energy-pattern)"
                />
              </g>
            </g>

            {/* 5. Feathered plasma bloom + razor slanted leading spear */}
            <g ref={edgeGroupRef}>
              <rect
                x="-46"
                y="0"
                width="64"
                height="38"
                fill="url(#viraj-nitro-edge-glow)"
              />
              <polygon
                points="2,0 7,0 -6,38 -11,38"
                fill={nitroActive ? '#ffffff' : '#e0f2fe'}
                opacity={nitroActive ? '0.96' : '0.78'}
              />
            </g>

            {/* 6. Subtle inner upper curved glass specular highlight */}
            <path
              d="M 12 27 Q 380 26 690 17 Q 865 12 998 5"
              fill="none"
              stroke="rgba(255,255,255,0.44)"
              strokeWidth="2"
            />

            {/* 7. Delicate slanted scale ticks etched across the blade */}
            {[200, 400, 600, 800].map((tx) => (
              <line
                key={tx}
                x1={tx}
                y1="0"
                x2={tx - 14}
                y2="38"
                stroke="rgba(6, 10, 18, 0.5)"
                strokeWidth="2.2"
              />
            ))}
          </g>

          {/* 8. Razor-sharp outer vector blade contour */}
          <path
            d={WING_PATH}
            fill="none"
            stroke="url(#viraj-nitro-rim-grad)"
            strokeWidth="1.6"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </button>
    );
  },
);

NitroWingBar.displayName = 'NitroWingBar';

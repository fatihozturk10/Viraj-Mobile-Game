import React, { useEffect, useMemo, useRef } from 'react';

interface SpeedometerClusterProps {
  speedKmh: number;
  rpmRatio: number;
  gear: number;
  nitroActive: boolean;
  drifting: boolean;
}

const CX = 92;
const CY = 90;
const SPEED_R = 72;
const SPEED_CIRC = 2 * Math.PI * SPEED_R;
const SPEED_ARC_LEN = SPEED_CIRC * 0.75; // 270 deg sweep (-135 to +135)

const RPM_R = 45;
const RPM_CIRC = 2 * Math.PI * RPM_R;
const RPM_ARC_LEN = RPM_CIRC * 0.75;
const RPM_REDLINE_START = 0.82;

const MAX_SPEED_KMH = 300;
const START_ANGLE = -135;
const SWEEP_DEG = 270;

function polarPoint(cx: number, cy: number, r: number, dialDeg: number) {
  // dialDeg: 0 deg = straight up (12 o'clock), -135 = bottom-left, +135 = bottom-right
  const rad = ((dialDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

export const SpeedometerCluster: React.FC<SpeedometerClusterProps> = React.memo(
  ({ speedKmh, rpmRatio, gear, nitroActive, drifting }) => {
  const targetsRef = useRef({
    speedKmh,
    rpmRatio,
    gear,
    nitroActive,
  });
  targetsRef.current = { speedKmh, rpmRatio, gear, nitroActive };

  const speedNeedleRef = useRef<SVGGElement | null>(null);
  const rpmNeedleRef = useRef<SVGGElement | null>(null);
  const speedArcRef = useRef<SVGCircleElement | null>(null);
  const rpmArcRef = useRef<SVGCircleElement | null>(null);
  const speedTextRef = useRef<HTMLSpanElement | null>(null);
  const rpmPercentRef = useRef<HTMLSpanElement | null>(null);

  const ticks = useMemo(() => {
    const items: Array<{
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      lx?: number;
      ly?: number;
      label?: string;
      major: boolean;
      highSpeed: boolean;
    }> = [];
    const steps = 24; // every 12.5 km/h -> major every 4 steps (50 km/h)
    for (let i = 0; i <= steps; i++) {
      const ratio = i / steps;
      const deg = START_ANGLE + ratio * SWEEP_DEG;
      const major = i % 4 === 0;
      const medium = i % 2 === 0;
      const innerR = major ? 63 : medium ? 66 : 68;
      const outerR = 72;
      const p1 = polarPoint(CX, CY, innerR, deg);
      const p2 = polarPoint(CX, CY, outerR, deg);
      let lx: number | undefined;
      let ly: number | undefined;
      let label: string | undefined;
      if (major) {
        const lp = polarPoint(CX, CY, 55.5, deg);
        lx = lp.x;
        ly = lp.y;
        label = String(Math.round(ratio * MAX_SPEED_KMH));
      }
      items.push({
        x1: p1.x,
        y1: p1.y,
        x2: p2.x,
        y2: p2.y,
        lx,
        ly,
        label,
        major,
        highSpeed: ratio >= 0.75,
      });
    }
    return items;
  }, []);

  const rpmTicks = useMemo(() => {
    const items: Array<{
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      redline: boolean;
    }> = [];
    const steps = 18;
    for (let i = 0; i <= steps; i++) {
      const ratio = i / steps;
      const deg = START_ANGLE + ratio * SWEEP_DEG;
      const p1 = polarPoint(CX, CY, i % 3 === 0 ? 40 : 42, deg);
      const p2 = polarPoint(CX, CY, 45, deg);
      items.push({
        x1: p1.x,
        y1: p1.y,
        x2: p2.x,
        y2: p2.y,
        redline: ratio >= RPM_REDLINE_START,
      });
    }
    return items;
  }, []);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let speedPos = targetsRef.current.speedKmh;
    let speedVel = 0;
    let displaySpeed = targetsRef.current.speedKmh;

    let rpmPos = targetsRef.current.rpmRatio;
    let rpmVel = 0;
    let prevGear = targetsRef.current.gear;

    let lastTime = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      const target = targetsRef.current;
      const targetSpeed = Math.max(0, Math.min(MAX_SPEED_KMH, target.speedKmh));
      const targetRpm = Math.max(0, Math.min(1, target.rpmRatio));

      if (prefersReducedMotion) {
        speedPos = targetSpeed;
        displaySpeed = targetSpeed;
        rpmPos = targetRpm;
      } else {
        // Detect gear shifts for realistic tachometer kick / blip
        if (target.gear !== prevGear) {
          if (target.gear > prevGear) {
            rpmVel -= 2.4; // clutch cut upshift drop kick
          } else {
            rpmVel += 2.1; // downshift throttle blip
          }
          prevGear = target.gear;
        }

        // 2nd-order spring physics for speed needle (mechanical damping)
        const speedOmega = 14.5;
        const speedZeta = 0.84;
        const speedAccel =
          speedOmega * speedOmega * (targetSpeed - speedPos) -
          2 * speedZeta * speedOmega * speedVel;
        speedVel += speedAccel * dt;
        speedPos = Math.max(0, Math.min(MAX_SPEED_KMH + 8, speedPos + speedVel * dt));

        // Frame-rate-independent smooth rolling interpolation for digital speed counter
        const digitAlpha = 1 - Math.exp(-13.5 * dt);
        displaySpeed += (targetSpeed - displaySpeed) * digitAlpha;
        if (Math.abs(targetSpeed - displaySpeed) < 0.08) {
          displaySpeed = targetSpeed;
        }

        // 2nd-order crisp spring physics for RPM needle
        const rpmOmega = 23.0;
        const rpmZeta = 0.72;
        const rpmAccel =
          rpmOmega * rpmOmega * (targetRpm - rpmPos) -
          2 * rpmZeta * rpmOmega * rpmVel;
        rpmVel += rpmAccel * dt;
        rpmPos = Math.max(0, Math.min(1.04, rpmPos + rpmVel * dt));
      }

      const timeSec = now * 0.001;
      // Subtle mechanical vibration at high revs & nitro load
      const engineVibDeg = prefersReducedMotion
        ? 0
        : (targetRpm > 0.75
            ? Math.sin(timeSec * (34 + targetRpm * 24)) *
              ((targetRpm - 0.75) * 3.6)
            : 0) +
          (target.nitroActive ? Math.sin(timeSec * 57) * 0.9 : 0);

      const speedRatio = Math.max(0, Math.min(1, speedPos / MAX_SPEED_KMH));
      const speedDeg =
        START_ANGLE +
        speedRatio * SWEEP_DEG +
        (prefersReducedMotion ? 0 : engineVibDeg * 0.45);

      const clampedRpm = Math.max(0, Math.min(1, rpmPos));
      const rpmDeg = START_ANGLE + clampedRpm * SWEEP_DEG + engineVibDeg;

      if (speedNeedleRef.current) {
        speedNeedleRef.current.setAttribute(
          'transform',
          `rotate(${speedDeg.toFixed(2)} ${CX} ${CY})`
        );
      }

      if (rpmNeedleRef.current) {
        rpmNeedleRef.current.setAttribute(
          'transform',
          `rotate(${rpmDeg.toFixed(2)} ${CX} ${CY})`
        );
      }

      if (speedArcRef.current) {
        speedArcRef.current.style.strokeDashoffset = `${(
          SPEED_ARC_LEN *
          (1 - speedRatio)
        ).toFixed(2)}`;
      }

      if (rpmArcRef.current) {
        rpmArcRef.current.style.strokeDashoffset = `${(
          RPM_ARC_LEN *
          (1 - clampedRpm)
        ).toFixed(2)}`;
      }

      if (speedTextRef.current) {
        speedTextRef.current.textContent = String(
          Math.max(0, Math.round(displaySpeed))
        );
      }

      if (rpmPercentRef.current) {
        const rpmK = (1 + clampedRpm * 7.2).toFixed(1);
        rpmPercentRef.current.textContent = `${rpmK}k`;
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const inRedline = rpmRatio >= RPM_REDLINE_START;
  const accentColor = nitroActive
    ? '#38bdf8'
    : inRedline
      ? '#fb7185'
      : '#fbbf24';

  return (
    <div className="pointer-events-none relative w-[164px] select-none rounded-xl border border-white/12 bg-zinc-950/90 px-2.5 pt-2 pb-2.5 shadow-xl sm:w-[192px] sm:px-3 sm:pt-2.5 sm:pb-3">
      {/* Top status line (unboxed typography, zero-pill) */}
      <div className="mb-0.5 flex items-center justify-between text-[10px] font-bold tracking-wider">
        <div className="flex items-center gap-1.5">
          {drifting && (
            <span className="font-display text-amber-400">DRİFT</span>
          )}
          {drifting && nitroActive && (
            <span className="text-zinc-600" aria-hidden="true">
              ·
            </span>
          )}
          {nitroActive && (
            <span className="font-display text-sky-400">TURBO</span>
          )}
          {!drifting && !nitroActive && (
            <span className="font-mono-num text-zinc-400">
              RPM{' '}
              <span ref={rpmPercentRef} className="text-zinc-200">
                1.0k
              </span>
            </span>
          )}
        </div>
        <span className="font-display text-xs font-extrabold text-amber-400 font-mono-num">
          V{gear}
        </span>
      </div>

      {/* Analog Dial + Needles */}
      <div className="relative">
        <svg
          viewBox="0 0 184 150"
          className="block w-full overflow-visible"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="virajSpeedGrad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="70%" stopColor={nitroActive ? '#38bdf8' : '#fbbf24'} />
              <stop offset="100%" stopColor={nitroActive ? '#67e8f9' : '#fb7185'} />
            </linearGradient>
          </defs>

          {/* Outer dial base track */}
          <circle
            cx={CX}
            cy={CY}
            r={SPEED_R}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={`${SPEED_ARC_LEN} ${SPEED_CIRC}`}
            transform={`rotate(135 ${CX} ${CY})`}
          />

          {/* Outer active speed sweep */}
          <circle
            ref={speedArcRef}
            cx={CX}
            cy={CY}
            r={SPEED_R}
            fill="none"
            stroke="url(#virajSpeedGrad)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={`${SPEED_ARC_LEN} ${SPEED_CIRC}`}
            strokeDashoffset={SPEED_ARC_LEN}
            transform={`rotate(135 ${CX} ${CY})`}
          />

          {/* Inner RPM base track */}
          <circle
            cx={CX}
            cy={CY}
            r={RPM_R}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={`${RPM_ARC_LEN} ${RPM_CIRC}`}
            transform={`rotate(135 ${CX} ${CY})`}
          />

          {/* Inner RPM Redline zone (82%..100%) */}
          <circle
            cx={CX}
            cy={CY}
            r={RPM_R}
            fill="none"
            stroke="rgba(244,63,94,0.35)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={`${RPM_ARC_LEN * (1 - RPM_REDLINE_START)} ${RPM_CIRC}`}
            transform={`rotate(${135 + RPM_REDLINE_START * SWEEP_DEG} ${CX} ${CY})`}
          />

          {/* Inner active RPM sweep */}
          <circle
            ref={rpmArcRef}
            cx={CX}
            cy={CY}
            r={RPM_R}
            fill="none"
            stroke={accentColor}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={`${RPM_ARC_LEN} ${RPM_CIRC}`}
            strokeDashoffset={RPM_ARC_LEN}
            transform={`rotate(135 ${CX} ${CY})`}
          />

          {/* Outer speedometer radial ticks & numerals */}
          {ticks.map((t, idx) => (
            <g key={idx}>
              <line
                x1={t.x1}
                y1={t.y1}
                x2={t.x2}
                y2={t.y2}
                stroke={
                  t.highSpeed
                    ? 'rgba(251,113,133,0.75)'
                    : t.major
                      ? 'rgba(255,255,255,0.75)'
                      : 'rgba(255,255,255,0.28)'
                }
                strokeWidth={t.major ? '1.6' : '1'}
                strokeLinecap="round"
              />
              {t.label && t.lx !== undefined && t.ly !== undefined && (
                <text
                  x={t.lx}
                  y={t.ly}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="rgba(212,212,216,0.75)"
                  fontSize="7.5"
                  fontFamily="JetBrains Mono, monospace"
                  fontWeight="600"
                >
                  {t.label}
                </text>
              )}
            </g>
          ))}

          {/* Inner RPM ticks */}
          {rpmTicks.map((t, idx) => (
            <line
              key={idx}
              x1={t.x1}
              y1={t.y1}
              x2={t.x2}
              y2={t.y2}
              stroke={
                t.redline
                  ? 'rgba(251,113,133,0.7)'
                  : 'rgba(255,255,255,0.28)'
              }
              strokeWidth="1"
              strokeLinecap="round"
            />
          ))}

          {/* RPM Secondary Needle (inner tachometer) */}
          <g ref={rpmNeedleRef} transform={`rotate(${START_ANGLE} ${CX} ${CY})`}>
            <polygon
              points={`${CX - 1.4},${CY + 6} ${CX + 1.4},${CY + 6} ${CX + 0.5},${CY - 39} ${CX - 0.5},${CY - 39}`}
              fill={accentColor}
              opacity="0.92"
            />
          </g>

          {/* Primary Speedometer Needle */}
          <g ref={speedNeedleRef} transform={`rotate(${START_ANGLE} ${CX} ${CY})`}>
            <polygon
              points={`${CX - 2.3},${CY + 10} ${CX + 2.3},${CY + 10} ${CX + 0.7},${CY - 66} ${CX - 0.7},${CY - 66}`}
              fill="#ffffff"
            />
            <line
              x1={CX}
              y1={CY - 12}
              x2={CX}
              y2={CY - 64}
              stroke={nitroActive ? '#38bdf8' : '#fbbf24'}
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </g>

          {/* Center Pivot Hub */}
          <circle
            cx={CX}
            cy={CY}
            r="7"
            fill="#18181b"
            stroke="rgba(255,255,255,0.28)"
            strokeWidth="1.5"
          />
          <circle cx={CX} cy={CY} r="2.8" fill={accentColor} />
        </svg>

        {/* Bottom Digital Speed Readout inside dial cutout */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center leading-none">
          <div className="flex items-baseline gap-1">
            <span
              ref={speedTextRef}
              className={`font-display text-[26px] font-extrabold tracking-tight font-mono-num sm:text-[30px] ${
                nitroActive ? 'text-sky-300' : 'text-white'
              }`}
            >
              {speedKmh}
            </span>
            <span className="text-[10px] font-semibold text-zinc-400">
              km/h
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

SpeedometerCluster.displayName = 'SpeedometerCluster';

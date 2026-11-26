import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  ChevronDown,
  ChevronsDown,
  ChevronsUp,
  ChevronUp,
  Flame,
} from 'lucide-react';

export interface HoldFeedbackState {
  anchorX: number;
  anchorY: number;
  currentX: number;
  currentY: number;
  throttle: number;
}

export interface NitroBurstState {
  id: number;
  x: number;
  y: number;
}

export interface HoldThrottleIndicatorHandle {
  setHold: (next: HoldFeedbackState | null) => void;
}

interface HoldThrottleIndicatorProps {
  active: boolean;
  nitroActive: boolean;
  nitroPercent: number;
  nitroBurst: NitroBurstState | null;
}

type HoldMode = 'none' | 'cruise' | 'accel' | 'brake';

export const HoldThrottleIndicator = React.memo(
  forwardRef<HoldThrottleIndicatorHandle, HoldThrottleIndicatorProps>(
    ({ active, nitroActive, nitroPercent, nitroBurst }, ref) => {
      const [holdMode, setHoldMode] = useState<HoldMode>('none');
      const holdRef = useRef<HoldFeedbackState | null>(null);
      const nitroActiveRef = useRef(nitroActive);
      nitroActiveRef.current = nitroActive;

      // Direct GPU-composited DOM refs: 0 React re-renders and 0 layout recalcs during 120Hz touch drag
      const anchorElRef = useRef<HTMLDivElement | null>(null);
      const stemElRef = useRef<HTMLDivElement | null>(null);
      const orbitElRef = useRef<HTMLDivElement | null>(null);
      const rippleElRef = useRef<HTMLDivElement | null>(null);
      const ringElRef = useRef<HTMLDivElement | null>(null);
      const labelElRef = useRef<HTMLDivElement | null>(null);
      const pctElRef = useRef<HTMLSpanElement | null>(null);

      const syncDomFromHold = (next: HoldFeedbackState | null) => {
        if (!next) return;
        const { anchorX, anchorY, currentX, currentY, throttle } = next;
        const isBraking = throttle < -0.12;
        const isNitro = nitroActiveRef.current && !isBraking;
        const intensity = Math.min(1, Math.abs(throttle));
        const ringScale = isNitro ? 1.12 : 1 + intensity * 0.14;

        if (anchorElRef.current) {
          anchorElRef.current.style.transform = `translate3d(${anchorX}px, ${anchorY}px, 0) translate(-50%, -50%)`;
        }
        if (stemElRef.current) {
          const dy = currentY - anchorY;
          const h = Math.abs(dy);
          if (h > 6) {
            const top = dy >= 0 ? anchorY : currentY;
            stemElRef.current.style.display = 'block';
            stemElRef.current.style.transform = `translate3d(${anchorX}px, ${top}px, 0) translateX(-50%) scaleY(${h})`;
          } else {
            stemElRef.current.style.display = 'none';
          }
        }
        if (orbitElRef.current) {
          orbitElRef.current.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
        }
        if (rippleElRef.current) {
          rippleElRef.current.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
        }
        if (ringElRef.current) {
          ringElRef.current.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%) scale(${ringScale.toFixed(3)})`;
        }
        if (labelElRef.current) {
          const ly = Math.max(36, currentY - 42);
          labelElRef.current.style.transform = `translate3d(${currentX}px, ${ly}px, 0) translate(-50%, -100%)`;
        }
        if (pctElRef.current && !isNitro) {
          const pct = Math.round(intensity * 100);
          const txt = `${pct}%`;
          if (pctElRef.current.textContent !== txt) {
            pctElRef.current.textContent = txt;
          }
        }
      };

      useImperativeHandle(
        ref,
        () => ({
          setHold: (next) => {
            holdRef.current = next;
            if (next === null) {
              setHoldMode((prev) => (prev === 'none' ? prev : 'none'));
              return;
            }
            const nextMode: HoldMode =
              next.throttle < -0.12
                ? 'brake'
                : next.throttle > 0.12
                  ? 'accel'
                  : 'cruise';
            setHoldMode((prev) => (prev === nextMode ? prev : nextMode));
            syncDomFromHold(next);
          },
        }),
        [],
      );

      useEffect(() => {
        if (!active) {
          holdRef.current = null;
          setHoldMode('none');
        }
      }, [active]);

      useEffect(() => {
        if (active && holdMode !== 'none' && holdRef.current) {
          syncDomFromHold(holdRef.current);
        }
      }, [active, holdMode, nitroActive]);

      const showHold = active && holdMode !== 'none';
      const activeBurst = active ? nitroBurst : null;
      if (!showHold && !activeBurst) return null;

      const isBraking = holdMode === 'brake';
      const isNitroHold = showHold && nitroActive && !isBraking;
      const isAccelerating = showHold && !isNitroHold && holdMode === 'accel';

      const ringClass = isNitroHold
        ? 'border-sky-300 bg-sky-500/25 text-cyan-200 shadow-[0_0_28px_rgba(56,189,248,0.65)]'
        : isAccelerating
          ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300 shadow-[0_0_24px_rgba(16,185,129,0.45)]'
          : isBraking
            ? 'border-rose-400 bg-rose-500/20 text-rose-300 shadow-[0_0_24px_rgba(244,63,94,0.45)]'
            : 'border-amber-400/80 bg-zinc-950/65 text-amber-300 shadow-[0_0_16px_rgba(245,158,11,0.28)]';

      const rippleClass = isNitroHold
        ? 'border-cyan-300/85'
        : isAccelerating
          ? 'border-emerald-400/70'
          : isBraking
            ? 'border-rose-400/70'
            : 'border-amber-400/45';

      const labelText = isNitroHold
        ? 'NİTRO AKTİF'
        : isAccelerating
          ? 'HIZLANIYOR'
          : isBraking
            ? 'YAVAŞLIYOR'
            : 'SABİT HIZ';

      const labelColor = isNitroHold
        ? 'border-sky-400/70 bg-zinc-950/92 text-sky-300'
        : isAccelerating
          ? 'border-emerald-400/50 bg-zinc-950/90 text-emerald-300'
          : isBraking
            ? 'border-rose-400/50 bg-zinc-950/90 text-rose-300'
            : 'border-white/15 bg-zinc-950/85 text-zinc-200';

      const initialHold = holdRef.current;
      const initAnchorX = initialHold?.anchorX ?? 0;
      const initAnchorY = initialHold?.anchorY ?? 0;
      const initCurX = initialHold?.currentX ?? 0;
      const initCurY = initialHold?.currentY ?? 0;
      const initIntensity = initialHold
        ? Math.min(1, Math.abs(initialHold.throttle))
        : 0;
      const initStemH = Math.abs(initCurY - initAnchorY);
      const initStemTop = Math.min(initAnchorY, initCurY);

      return (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-[15] overflow-hidden"
        >
          {/* Dedicated Double-Tap Nitro Ignition Burst at Exact Finger Position */}
          {activeBurst && (
            <div key={activeBurst.id}>
              <div
                className="animate-nitro-outer absolute h-16 w-16 rounded-full border-[3px] border-sky-400 shadow-[0_0_28px_rgba(56,189,248,0.85)]"
                style={{ left: activeBurst.x, top: activeBurst.y }}
              />
              <div
                className="animate-nitro-inner absolute h-16 w-16 rounded-full border-2 border-cyan-100 bg-sky-400/20"
                style={{ left: activeBurst.x, top: activeBurst.y }}
              />
              <div
                className="animate-nitro-pop absolute flex items-center gap-1.5 rounded-lg border border-sky-300/80 bg-zinc-950/90 px-2.5 py-1 font-display text-xs font-extrabold tracking-wider text-sky-300 shadow-[0_0_22px_rgba(56,189,248,0.55)] whitespace-nowrap"
                style={{
                  left: activeBurst.x,
                  top: Math.max(44, activeBurst.y - 18),
                }}
              >
                <Flame className="h-4 w-4 fill-sky-400 text-cyan-200" />
                <span>NİTRO TURBO</span>
              </div>
            </div>
          )}

          {/* Hold Steering / Throttle / Active Nitro Finger Aura (Zero-React-Rerender GPU positioning) */}
          {showHold && (
            <>
              <div
                ref={anchorElRef}
                className="absolute left-0 top-0 flex flex-col items-center will-change-transform"
                style={{
                  transform: `translate3d(${initAnchorX}px, ${initAnchorY}px, 0) translate(-50%, -50%)`,
                }}
              >
                <ChevronUp
                  className={`h-4 w-4 -mb-1 transition-colors ${
                    isNitroHold
                      ? 'text-sky-300'
                      : isAccelerating
                        ? 'text-emerald-400'
                        : 'text-white/30'
                  }`}
                />
                <div className="h-3 w-3 rounded-full border border-white/40 bg-white/15" />
                <ChevronDown
                  className={`h-4 w-4 -mt-1 transition-colors ${
                    isBraking ? 'text-rose-400' : 'text-white/30'
                  }`}
                />
              </div>

              <div
                ref={stemElRef}
                className={`absolute left-0 top-0 h-[1px] w-0.5 origin-top rounded-full will-change-transform ${
                  isNitroHold
                    ? 'bg-sky-400/75'
                    : isAccelerating
                      ? 'bg-emerald-400/60'
                      : isBraking
                        ? 'bg-rose-400/60'
                        : 'bg-amber-400/35'
                }`}
                style={{
                  display: initStemH > 6 ? 'block' : 'none',
                  transform: `translate3d(${initAnchorX}px, ${initStemTop}px, 0) translateX(-50%) scaleY(${Math.max(1, initStemH)})`,
                }}
              />

              {/* Rotating Electric Cyan Orbital Ring when Nitro is burning */}
              {isNitroHold && (
                <div
                  ref={orbitElRef}
                  className="absolute left-0 top-0 will-change-transform"
                  style={{
                    transform: `translate3d(${initCurX}px, ${initCurY}px, 0)`,
                  }}
                >
                  <div className="animate-nitro-spin h-20 w-20 rounded-full border-2 border-dashed border-sky-300/80" />
                </div>
              )}

              <div
                ref={rippleElRef}
                className="absolute left-0 top-0 will-change-transform"
                style={{
                  transform: `translate3d(${initCurX}px, ${initCurY}px, 0)`,
                }}
              >
                <div
                  className={`animate-hold-ripple h-14 w-14 rounded-full border-2 ${rippleClass}`}
                />
              </div>

              <div
                ref={ringElRef}
                className={`absolute left-0 top-0 flex h-14 w-14 items-center justify-center rounded-full border-2 transition-colors duration-100 will-change-transform ${ringClass}`}
                style={{
                  transform: `translate3d(${initCurX}px, ${initCurY}px, 0) translate(-50%, -50%) scale(${
                    isNitroHold ? 1.12 : 1 + initIntensity * 0.14
                  })`,
                }}
              >
                {isNitroHold ? (
                  <div className="relative flex items-center justify-center">
                    <Flame className="h-6 w-6 fill-sky-400 text-white" />
                  </div>
                ) : isAccelerating ? (
                  <ChevronsUp className="animate-hold-up h-6 w-6" />
                ) : isBraking ? (
                  <ChevronsDown className="animate-hold-down h-6 w-6" />
                ) : (
                  <div className="flex flex-col items-center leading-none text-amber-300/85">
                    <ChevronUp className="h-3.5 w-3.5 -mb-1" />
                    <ChevronDown className="h-3.5 w-3.5 -mt-1" />
                  </div>
                )}
              </div>

              <div
                ref={labelElRef}
                className={`absolute left-0 top-0 rounded-md border px-2 py-0.5 font-display text-[11px] font-bold tracking-wider whitespace-nowrap shadow-lg will-change-transform ${labelColor}`}
                style={{
                  transform: `translate3d(${initCurX}px, ${Math.max(36, initCurY - 42)}px, 0) translate(-50%, -100%)`,
                }}
              >
                {labelText}
                {isNitroHold ? (
                  <span className="ml-1.5 font-mono-num text-cyan-200">
                    %{Math.min(100, Math.max(0, Math.round(nitroPercent)))}
                  </span>
                ) : (
                  (isAccelerating || isBraking) && (
                    <span
                      ref={pctElRef}
                      className="ml-1.5 font-mono-num opacity-85"
                    >
                      {Math.round(initIntensity * 100)}%
                    </span>
                  )
                )}
              </div>
            </>
          )}
        </div>
      );
    },
  ),
);

HoldThrottleIndicator.displayName = 'HoldThrottleIndicator';

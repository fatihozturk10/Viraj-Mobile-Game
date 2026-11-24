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

export const HoldThrottleIndicator = React.memo(
  forwardRef<HoldThrottleIndicatorHandle, HoldThrottleIndicatorProps>(
    ({ active, nitroActive, nitroPercent, nitroBurst }, ref) => {
      const [hold, setHoldState] = useState<HoldFeedbackState | null>(null);
      const pendingHoldRef = useRef<HoldFeedbackState | null | undefined>(
        undefined,
      );
      const rafRef = useRef<number>(0);

      useImperativeHandle(
        ref,
        () => ({
          setHold: (next) => {
            // Immediate clear on pointer up/cancel; coalesce rapid 60–240Hz touchmove events to 1 rAF update
            if (next === null) {
              if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = 0;
              }
              pendingHoldRef.current = undefined;
              setHoldState((prev) => (prev === null ? prev : null));
              return;
            }
            pendingHoldRef.current = next;
            if (!rafRef.current) {
              rafRef.current = requestAnimationFrame(() => {
                rafRef.current = 0;
                const latest = pendingHoldRef.current;
                pendingHoldRef.current = undefined;
                if (latest !== undefined) {
                  setHoldState(latest);
                }
              });
            }
          },
        }),
        [],
      );

      useEffect(() => {
        if (!active) {
          if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = 0;
          }
          pendingHoldRef.current = undefined;
          setHoldState(null);
        }
      }, [active]);

      useEffect(() => {
        return () => {
          if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
      }, []);

      const activeHold = active ? hold : null;
      const activeBurst = active ? nitroBurst : null;
      if (!activeHold && !activeBurst) return null;

      const isBraking = Boolean(activeHold && activeHold.throttle < -0.12);
      const isNitroHold = Boolean(activeHold && nitroActive && !isBraking);
      const isAccelerating = Boolean(
        activeHold && !isNitroHold && activeHold.throttle > 0.12,
      );
      const intensity = activeHold
        ? Math.min(1, Math.abs(activeHold.throttle))
        : 0;

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

      const anchorOffsetY = activeHold
        ? activeHold.currentY - activeHold.anchorY
        : 0;
      const stemTop = activeHold
        ? Math.min(activeHold.anchorY, activeHold.currentY)
        : 0;
      const stemHeight = Math.abs(anchorOffsetY);

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

          {/* Hold Steering / Throttle / Active Nitro Finger Aura (GPU-composited positioning) */}
          {activeHold && (
            <>
              <div
                className="absolute left-0 top-0 flex flex-col items-center will-change-transform"
                style={{
                  transform: `translate3d(${activeHold.anchorX}px, ${activeHold.anchorY}px, 0) translate(-50%, -50%)`,
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

              {stemHeight > 6 && (
                <div
                  className={`absolute left-0 top-0 w-0.5 rounded-full will-change-transform ${
                    isNitroHold
                      ? 'bg-sky-400/75'
                      : isAccelerating
                        ? 'bg-emerald-400/60'
                        : isBraking
                          ? 'bg-rose-400/60'
                          : 'bg-amber-400/35'
                  }`}
                  style={{
                    transform: `translate3d(${activeHold.anchorX}px, ${stemTop}px, 0) translateX(-50%)`,
                    height: stemHeight,
                  }}
                />
              )}

              {/* Rotating Electric Cyan Orbital Ring when Nitro is burning */}
              {isNitroHold && (
                <div
                  className="animate-nitro-spin absolute h-20 w-20 rounded-full border-2 border-dashed border-sky-300/80"
                  style={{
                    left: activeHold.currentX,
                    top: activeHold.currentY,
                  }}
                />
              )}

              <div
                className={`animate-hold-ripple absolute h-14 w-14 rounded-full border-2 ${rippleClass}`}
                style={{
                  left: activeHold.currentX,
                  top: activeHold.currentY,
                }}
              />

              <div
                className={`absolute left-0 top-0 flex h-14 w-14 items-center justify-center rounded-full border-2 transition-colors duration-100 will-change-transform ${ringClass}`}
                style={{
                  transform: `translate3d(${activeHold.currentX}px, ${activeHold.currentY}px, 0) translate(-50%, -50%) scale(${
                    isNitroHold ? 1.12 : 1 + intensity * 0.14
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
                className={`absolute left-0 top-0 rounded-md border px-2 py-0.5 font-display text-[11px] font-bold tracking-wider whitespace-nowrap shadow-lg will-change-transform ${labelColor}`}
                style={{
                  transform: `translate3d(${activeHold.currentX}px, ${Math.max(36, activeHold.currentY - 42)}px, 0) translate(-50%, -100%)`,
                }}
              >
                {labelText}
                {isNitroHold ? (
                  <span className="ml-1.5 font-mono-num text-cyan-200">
                    {nitroPercent}%
                  </span>
                ) : (
                  (isAccelerating || isBraking) && (
                    <span className="ml-1.5 font-mono-num opacity-85">
                      {Math.round(intensity * 100)}%
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

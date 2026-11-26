import React, { useEffect, useRef } from 'react';

interface SpeedLinesOverlayProps {
  active: boolean;
  speedKmh: number;
  nitroActive: boolean;
}

interface LineSeed {
  cos: number;
  sin: number;
  speed: number;
  offset: number;
  lengthRatio: number;
  bucket: 0 | 1 | 2;
}

const LINE_COUNT = 48;

const IS_COARSE_MOBILE =
  typeof window !== 'undefined' &&
  (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '') ||
    Boolean(window.matchMedia?.('(pointer: coarse)').matches));

export const SpeedLinesOverlay: React.FC<SpeedLinesOverlayProps> = React.memo(
  ({ active, speedKmh, nitroActive }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const stateRef = useRef({ active, speedKmh, nitroActive });
    const startLoopRef = useRef<(() => void) | null>(null);

    stateRef.current = { active, speedKmh, nitroActive };

    useEffect(() => {
      if (IS_COARSE_MOBILE) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const lines: LineSeed[] = Array.from({ length: LINE_COUNT }, (_, i) => {
        const angle = (i / LINE_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.08;
        return {
          cos: Math.cos(angle),
          sin: Math.sin(angle),
          speed: 1.6 + Math.random() * 2.2,
          offset: Math.random(),
          lengthRatio: 0.14 + Math.random() * 0.22,
          bucket: (i % 3) as 0 | 1 | 2,
        };
      });

      let width = window.innerWidth;
      let height = window.innerHeight;
      let cx = width * 0.5;
      let cy = height * 0.46;
      let maxR = Math.hypot(cx, cy);
      let cachedVignetteNormal: CanvasGradient | null = null;
      let cachedVignetteNitro: CanvasGradient | null = null;

      const buildVignettes = () => {
        const norm = ctx.createRadialGradient(
          cx,
          cy,
          maxR * 0.48,
          cx,
          cy,
          maxR * 1.02,
        );
        norm.addColorStop(0, 'rgba(9, 9, 11, 0)');
        norm.addColorStop(1, 'rgba(9, 9, 11, 0.34)');
        cachedVignetteNormal = norm;

        const nit = ctx.createRadialGradient(
          cx,
          cy,
          maxR * 0.48,
          cx,
          cy,
          maxR * 1.02,
        );
        nit.addColorStop(0, 'rgba(9, 9, 11, 0)');
        nit.addColorStop(1, 'rgba(14, 116, 144, 0.28)');
        cachedVignetteNitro = nit;
      };

      const resize = () => {
        // DPR 1.0 is plenty for fast peripheral speed streaks and saves 4x fillrate
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = Math.max(1, Math.floor(width));
        canvas.height = Math.max(1, Math.floor(height));
        cx = width * 0.5;
        cy = height * 0.46;
        maxR = Math.hypot(cx, cy);
        buildVignettes();
      };
      resize();
      window.addEventListener('resize', resize);

      let rafId = 0;
      let running = false;
      let lastTs = 0;
      let smoothedIntensity = 0;
      const isCoarseMobile =
        typeof window !== 'undefined' &&
        (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '') ||
          Boolean(window.matchMedia?.('(pointer: coarse)').matches));
      const minRedrawMs = isCoarseMobile ? 32 : 0;

      const draw = (now: number) => {
        const elapsedMs = now - lastTs;
        if (minRedrawMs > 0 && elapsedMs < minRedrawMs) {
          rafId = requestAnimationFrame(draw);
          return;
        }
        const dt = Math.min(0.06, Math.max(0.001, elapsedMs / 1000));
        lastTs = now;

        const {
          active: isPlaying,
          speedKmh: spd,
          nitroActive: nitro,
        } = stateRef.current;

        const targetIntensity = isPlaying
          ? Math.min(1, Math.max(0, (spd - 105) / 130) + (nitro ? 0.35 : 0))
          : 0;

        smoothedIntensity +=
          (targetIntensity - smoothedIntensity) * (1 - Math.exp(-8 * dt));

        ctx.clearRect(0, 0, width, height);

        if (smoothedIntensity <= 0.015 && targetIntensity <= 0.015) {
          smoothedIntensity = 0;
          canvas.style.display = 'none';
          running = false;
          rafId = 0;
          return;
        }
        if (canvas.style.display === 'none') {
          canvas.style.display = 'block';
        }

        // 1. Cached radial edge speed vignette (zero gradient allocations per frame)
        const vig = nitro ? cachedVignetteNitro : cachedVignetteNormal;
        if (vig) {
          ctx.globalAlpha = smoothedIntensity;
          ctx.fillStyle = vig;
          ctx.fillRect(0, 0, width, height);
        }

        // 2. Batched peripheral speed lines grouped into 3 opacity/width buckets (3 stroke calls total)
        const activeLineCount = Math.round(lines.length * smoothedIntensity);
        const speedMul = 0.7 + smoothedIntensity * 1.4;
        const lenMul = 0.6 + smoothedIntensity * 0.8;
        const baseColor = nitro ? 'rgb(125, 211, 252)' : 'rgb(255, 255, 255)';
        const alphaScale = smoothedIntensity * (nitro ? 0.72 : 0.46);
        const widthScale = nitro ? 1.3 : 1;

        ctx.strokeStyle = baseColor;
        ctx.lineCap = 'round';

        for (let i = 0; i < activeLineCount; i++) {
          const l = lines[i];
          l.offset = (l.offset + dt * l.speed * speedMul) % 1;
        }

        const bucketAlphas = [0.42, 0.72, 1.0];
        const bucketWidths = [1.15, 1.85, 2.55];

        for (let b = 0; b < 3; b++) {
          ctx.globalAlpha = alphaScale * bucketAlphas[b];
          ctx.lineWidth = bucketWidths[b] * widthScale;
          ctx.beginPath();
          for (let i = 0; i < activeLineCount; i++) {
            const l = lines[i];
            if (l.bucket !== b) continue;
            const startFrac = 0.58 + l.offset * 0.46;
            const r0 = maxR * startFrac;
            if (r0 > maxR * 1.05) continue;
            const r1 = maxR * (startFrac + l.lengthRatio * lenMul);
            ctx.moveTo(cx + l.cos * r0, cy + l.sin * r0);
            ctx.lineTo(cx + l.cos * r1, cy + l.sin * r1);
          }
          ctx.stroke();
        }

        ctx.globalAlpha = 1;
        rafId = requestAnimationFrame(draw);
      };

      const ensureRunning = () => {
        if (running) return;
        running = true;
        lastTs = performance.now();
        rafId = requestAnimationFrame(draw);
      };

      startLoopRef.current = ensureRunning;

      // Start immediately if already above threshold on mount
      if (
        stateRef.current.active &&
        (stateRef.current.speedKmh > 102 || stateRef.current.nitroActive)
      ) {
        ensureRunning();
      }

      return () => {
        startLoopRef.current = null;
        running = false;
        if (rafId) cancelAnimationFrame(rafId);
        window.removeEventListener('resize', resize);
      };
    }, []);

    useEffect(() => {
      if (active && (speedKmh > 102 || nitroActive)) {
        startLoopRef.current?.();
      }
    }, [active, speedKmh > 102, nitroActive]);

    if (IS_COARSE_MOBILE) return null;

    return (
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{ display: 'none' }}
        className="pointer-events-none fixed inset-0 z-[5] h-full w-full"
      />
    );
  },
);

SpeedLinesOverlay.displayName = 'SpeedLinesOverlay';

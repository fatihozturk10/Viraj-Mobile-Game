import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronRight,
  Coins,
  Crown,
  Flame,
  Gift,
  HeartPulse,
  Magnet,
  Package,
  Palette,
  Sparkles,
  Zap,
} from 'lucide-react';
import { getDriverRankTier, LevelUpEvent } from '../types/game';
import { getRewardsUnlockedInRange, LevelRoadReward } from '../game/levelRoad';
import { DriverLevelEmblem } from './DriverLevelEmblem';
import { playLevelUpFanfareSfx } from '../services/crateAudio';

interface LevelUpCelebrationOverlayProps {
  event: LevelUpEvent | null;
  inDriveMode: boolean;
  onDismiss: () => void;
  onOpenLevelRoad: (focusLevel: number) => void;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
}

function renderMiniRewardIcon(reward: LevelRoadReward): React.ReactNode {
  if (reward.kind === 'powerup_unlock') {
    if (reward.powerUpId === 'nitro') return <Flame className="h-5 w-5 text-cyan-200" />;
    if (reward.powerUpId === 'repair') return <HeartPulse className="h-5 w-5 text-emerald-200" />;
    if (reward.powerUpId === 'magnet') return <Magnet className="h-5 w-5 text-rose-200" />;
    return <Zap className="h-5 w-5 fill-amber-300 text-amber-100" />;
  }
  if (reward.kind === 'car_color') return <Palette className="h-5 w-5 text-white" />;
  if (reward.kind === 'visual') return <Crown className="h-5 w-5 text-amber-200" />;
  if (reward.kind === 'crate') return <Package className="h-5 w-5 text-white" />;
  return <Coins className="h-5 w-5 text-amber-300" />;
}

export const LevelUpCelebrationOverlay: React.FC<LevelUpCelebrationOverlayProps> = ({
  event,
  inDriveMode,
  onDismiss,
  onOpenLevelRoad,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stage, setStage] = useState<'enter' | 'burst' | 'ready'>('enter');

  const unlockedRewards = useMemo(() => {
    if (!event) return [];
    return getRewardsUnlockedInRange(event.fromLevel, event.toLevel);
  }, [event]);

  const tier = useMemo(
    () => getDriverRankTier(event?.toLevel ?? 1),
    [event?.toLevel],
  );

  // Trigger celebratory sound + phased emblem reveal when event arrives
  useEffect(() => {
    if (!event) return;
    const isSpecialMilestone = unlockedRewards.some(
      (r) => r.exclusive || r.kind === 'powerup_unlock' || r.kind === 'crate',
    );
    playLevelUpFanfareSfx(isSpecialMilestone);

    if (inDriveMode) {
      return;
    }

    setStage('enter');
    const t1 = window.setTimeout(() => setStage('burst'), 280);
    const t2 = window.setTimeout(() => setStage('ready'), 760);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [event, inDriveMode, unlockedRewards]);

  // 60 FPS Canvas2D golden spark burst & sharp hexagonal shockwave rings (full modal only)
  useEffect(() => {
    if (!event || inDriveMode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let width = 0;
    let height = 0;
    const startMs = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const palette = [tier.accentHex, '#fde047', '#ffffff', '#f59e0b'];
    const sparks: Spark[] = [];

    const spawnBurst = (count: number) => {
      const cx = width * 0.5;
      const cy = height * 0.42;
      for (let i = 0; i < count; i++) {
        const ang = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.25;
        const speed = 130 + Math.random() * 340;
        sparks.push({
          x: cx,
          y: cy,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed - 40,
          size: 2 + Math.random() * 3.5,
          life: 0,
          maxLife: 0.75 + Math.random() * 0.85,
          color: palette[i % palette.length],
        });
      }
    };

    spawnBurst(72);

    const drawHexRing = (cx: number, cy: number, radius: number, alpha: number, color: string, lw: number) => {
      if (alpha <= 0.01) return;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = lw;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        const px = cx + Math.cos(a) * radius;
        const py = cy + Math.sin(a) * radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    };

    let lastMs = startMs;
    const frame = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastMs) / 1000));
      lastMs = now;
      const elapsed = (now - startMs) / 1000;

      ctx.clearRect(0, 0, width, height);
      const cx = width * 0.5;
      const cy = height * 0.42;

      // Twin expanding crisp hexagonal shockwaves
      for (let r = 0; r < 2; r++) {
        const t = elapsed - r * 0.16;
        if (t > 0 && t < 1.1) {
          const p = t / 1.1;
          const ease = 1 - Math.pow(1 - p, 3);
          drawHexRing(
            cx,
            cy,
            40 + ease * Math.min(width, height) * 0.46,
            (1 - p) * 0.72,
            r === 0 ? '#fde047' : tier.accentHex,
            3.2 * (1 - p * 0.6),
          );
        }
      }

      // Rotating crisp sunburst rays behind emblem
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(elapsed * 0.35);
      const rayCount = 12;
      for (let i = 0; i < rayCount; i++) {
        const a = (i / rayCount) * Math.PI * 2;
        ctx.save();
        ctx.rotate(a);
        const grad = ctx.createLinearGradient(0, 0, 240, 0);
        grad.addColorStop(0, `${tier.accentHex}38`);
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(28, -4);
        ctx.lineTo(240, -18);
        ctx.lineTo(240, 18);
        ctx.lineTo(28, 4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();

      // Update & draw sparks + continuous ambient upward embers
      if (Math.random() < 0.42 && sparks.length < 110) {
        sparks.push({
          x: cx + (Math.random() - 0.5) * 320,
          y: cy + 120 + Math.random() * 80,
          vx: (Math.random() - 0.5) * 24,
          vy: -(45 + Math.random() * 75),
          size: 1.5 + Math.random() * 2.2,
          life: 0,
          maxLife: 1.1 + Math.random() * 0.8,
          color: palette[Math.floor(Math.random() * palette.length)],
        });
      }

      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.life += dt;
        if (s.life >= s.maxLife) {
          sparks.splice(i, 1);
          continue;
        }
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vx *= 0.96;
        s.vy += 120 * dt;
        const alpha = 1 - s.life / s.maxLife;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = s.color;
        ctx.translate(s.x, s.y);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-s.size * 0.5, -s.size * 0.5, s.size, s.size);
        ctx.restore();
      }

      rafId = window.requestAnimationFrame(frame);
    };

    rafId = window.requestAnimationFrame(frame);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, [event, inDriveMode, tier.accentHex]);

  if (!event) return null;

  // 1. Sleek non-blocking animated banner during active driving
  if (inDriveMode) {
    const highlight = unlockedRewards[unlockedRewards.length - 1];
    return (
      <div className="pointer-events-none fixed inset-x-0 top-20 z-30 flex justify-center px-3">
        <div
          className="animate-banner-pop flex max-w-[min(94vw,380px)] items-center gap-2.5 rounded-2xl border-2 border-amber-400/80 bg-zinc-950/95 px-3.5 py-2 shadow-[0_0_28px_rgba(251,191,36,0.42)] sm:gap-3 sm:px-4 sm:py-2.5"
        >
          <div className="shrink-0">
            <DriverLevelEmblem level={event.toLevel} size="md" />
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="font-display text-[10px] font-black tracking-[0.2em] text-amber-300 uppercase">
              SEVİYE ATLADIN!
            </span>
            <span className="font-display text-sm font-black leading-tight text-white break-words sm:text-base">
              Sv.{event.fromLevel} → Sv.{event.toLevel} · {event.rankTitle}
            </span>
            {highlight && (
              <span className="text-[11px] font-bold leading-snug text-emerald-300 break-words">
                Yeni Ödül Açıldı: {highlight.title}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 2. Full Celebratory Level-Up Ceremony Modal (Menu / Post-Run)
  const featuredRewards = unlockedRewards.slice(-3);

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/86 p-4"
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 h-full w-full"
      />

      <div className="relative z-10 flex w-full max-w-md flex-col items-center rounded-3xl border border-amber-400/50 bg-zinc-950/96 px-6 py-7 text-center shadow-[0_0_60px_rgba(251,191,36,0.28)]">
        {/* Top Kicker */}
        <div className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/45 bg-amber-500/15 px-3 py-1 font-display text-[11px] font-black tracking-[0.24em] text-amber-300 uppercase">
          <Sparkles className="h-3.5 w-3.5" />
          <span>SEVİYE ATLADIN</span>
        </div>

        {/* Animated Emblem Transition */}
        <div className="relative my-5 flex items-center justify-center">
          <div
            className={`transition-all duration-500 ${
              stage === 'enter'
                ? 'scale-50 opacity-0'
                : stage === 'burst'
                  ? 'scale-125 opacity-100'
                  : 'scale-110 opacity-100'
            }`}
          >
            <DriverLevelEmblem
              level={event.toLevel}
              size="lg"
              className="!h-24 !w-24 drop-shadow-[0_0_24px_rgba(251,191,36,0.65)]"
            />
          </div>
        </div>

        {/* Level Jump Counter */}
        <div className="flex items-center justify-center gap-2 font-mono-num text-sm font-bold text-zinc-400">
          <span>Sv.{event.fromLevel}</span>
          <ChevronRight className="h-4 w-4 text-amber-400" />
          <span className="text-lg font-black text-amber-300">
            Sv.{event.toLevel}
          </span>
        </div>

        <h2
          className={`mt-1 font-display text-2xl font-black tracking-tight ${tier.textClass}`}
        >
          {event.rankTitle}
        </h2>

        {/* Newly Unlocked Level Road Reward Preview(s) */}
        {featuredRewards.length > 0 && (
          <div className="mt-5 flex w-full flex-col gap-2">
            <div className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
              Seviye Yolunda Açılan Ödül{featuredRewards.length > 1 ? 'ler' : ''}
            </div>
            {featuredRewards.map((r) => (
              <div
                key={r.level}
                className="flex items-center gap-3 rounded-2xl border border-white/14 bg-zinc-900/90 px-3.5 py-2.5 text-left"
              >
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/25"
                  style={{ background: r.swatch }}
                >
                  {renderMiniRewardIcon(r)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono-num text-[10px] font-black text-amber-300">
                      SV.{r.level}
                    </span>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase">
                      {r.badgeLabel}
                    </span>
                  </div>
                  <div className="truncate font-display text-sm font-extrabold text-white">
                    {r.title}
                  </div>
                  <div className="truncate text-[11px] text-zinc-400">
                    {r.subtitle}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex w-full flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => onOpenLevelRoad(event.toLevel)}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 font-display text-sm font-black text-zinc-950 shadow-[0_0_24px_rgba(251,191,36,0.4)] transition-transform hover:bg-amber-300 active:scale-95 cursor-pointer"
          >
            <Gift className="h-4.5 w-4.5" />
            <span>Ödülü Al (Seviye Yolu)</span>
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="flex h-12 items-center justify-center rounded-xl border border-white/15 bg-zinc-900 px-5 font-display text-sm font-bold text-zinc-200 transition-colors hover:bg-zinc-800 hover:text-white cursor-pointer"
          >
            Devam Et
          </button>
        </div>
      </div>
    </div>
  );
};

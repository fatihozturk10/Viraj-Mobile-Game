import React, { useEffect, useRef } from 'react';
import { LootRarity } from '../services/storeCatalog';

export type FxCeremonyPhase = 'drop' | 'charging' | 'burst' | 'revealed';

interface CrateFxCanvasProps {
  phase: FxCeremonyPhase;
  chargeRatio: number; // 0..1
  accentHex: string;
  secondaryHex: string;
  rarity: LootRarity;
  pulseSeq: number;
  burstSeq: number;
  disabled?: boolean;
}

interface PhysicsParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  color: string;
  kind: 'spark' | 'shard' | 'ember' | 'vortex';
  rot: number;
  vrot: number;
  drag: number;
  gravity: number;
}

interface ShockRing {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  lineWidth: number;
  alpha: number;
  color: string;
  squashY: number;
}

interface LightningBolt {
  points: Array<{ x: number; y: number }>;
  life: number;
  maxLife: number;
  color: string;
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return `rgba(251, 191, 36, ${alpha})`;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const CrateFxCanvas: React.FC<CrateFxCanvasProps> = ({
  phase,
  chargeRatio,
  accentHex,
  secondaryHex,
  rarity,
  pulseSeq,
  burstSeq,
  disabled = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef({
    phase,
    chargeRatio,
    accentHex,
    secondaryHex,
    rarity,
    pulseSeq,
    burstSeq,
    lastPulseSeq: pulseSeq,
    lastBurstSeq: burstSeq,
    dropImpactDone: false,
    beamStrength: 0,
    flashAlpha: 0,
  });

  stateRef.current.phase = phase;
  stateRef.current.chargeRatio = chargeRatio;
  stateRef.current.accentHex = accentHex;
  stateRef.current.secondaryHex = secondaryHex;
  stateRef.current.rarity = rarity;
  stateRef.current.pulseSeq = pulseSeq;
  stateRef.current.burstSeq = burstSeq;

  useEffect(() => {
    if (disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const particles: PhysicsParticle[] = [];
    const rings: ShockRing[] = [];
    const bolts: LightningBolt[] = [];

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const getOrigin = () => ({
      cx: width * 0.5,
      cy: height * 0.45,
      floorY: height * 0.45 + 104,
    });

    const spawnFloorSlam = () => {
      const { cx, floorY } = getOrigin();
      const { accentHex: acc, secondaryHex: sec } = stateRef.current;
      rings.push({
        x: cx,
        y: floorY - 36,
        radius: 34,
        maxRadius: Math.min(width * 0.42, 230),
        lineWidth: 3.2,
        alpha: 0.72,
        color: acc,
        squashY: 1,
      });
      for (let i = 0; i < 24; i++) {
        const dir = i % 2 === 0 ? 1 : -1;
        const speed = 90 + Math.random() * 210;
        particles.push({
          x: cx + (Math.random() - 0.5) * 90,
          y: floorY - 4 + (Math.random() - 0.5) * 10,
          vx: dir * speed,
          vy: -(30 + Math.random() * 95),
          size: 2 + Math.random() * 2.5,
          alpha: 0.9,
          life: 0,
          maxLife: 0.35 + Math.random() * 0.28,
          color: i % 3 === 0 ? '#ffffff' : i % 2 === 0 ? sec : acc,
          kind: 'spark',
          rot: 0,
          vrot: 0,
          drag: 0.93,
          gravity: 360,
        });
      }
    };

    const spawnChargePulse = () => {
      const { cx, cy } = getOrigin();
      const { accentHex: acc, secondaryHex: sec } = stateRef.current;
      rings.push({
        x: cx,
        y: cy,
        radius: 34,
        maxRadius: Math.min(width * 0.48, 250),
        lineWidth: 3.5,
        alpha: 0.85,
        color: acc,
        squashY: 1,
      });
      rings.push({
        x: cx,
        y: cy,
        radius: 24,
        maxRadius: Math.min(width * 0.36, 185),
        lineWidth: 2,
        alpha: 0.75,
        color: '#ffffff',
        squashY: 1,
      });
      for (let i = 0; i < 22; i++) {
        const angle = (i / 22) * Math.PI * 2 + (Math.random() - 0.5) * 0.25;
        const speed = 150 + Math.random() * 260;
        particles.push({
          x: cx + Math.cos(angle) * 24,
          y: cy + Math.sin(angle) * 18,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 35,
          size: 2.2 + Math.random() * 3.2,
          alpha: 1,
          life: 0,
          maxLife: 0.36 + Math.random() * 0.28,
          color: i % 3 === 0 ? '#ffffff' : i % 2 === 0 ? sec : acc,
          kind: 'spark',
          rot: 0,
          vrot: 0,
          drag: 0.94,
          gravity: 220,
        });
      }
    };

    const spawnMegaBurst = () => {
      const { cx, cy } = getOrigin();
      const { accentHex: acc, secondaryHex: sec, rarity: rar } = stateRef.current;
      stateRef.current.beamStrength = 1.0;
      stateRef.current.flashAlpha = rar === 'legendary' ? 0.88 : rar === 'epic' ? 0.78 : 0.68;

      // Triple crisp hexagonal shockwaves
      rings.push(
        {
          x: cx,
          y: cy,
          radius: 24,
          maxRadius: Math.max(width, height) * 0.56,
          lineWidth: 6.5,
          alpha: 0.96,
          color: '#ffffff',
          squashY: 1,
        },
        {
          x: cx,
          y: cy,
          radius: 18,
          maxRadius: Math.max(width, height) * 0.46,
          lineWidth: 4.5,
          alpha: 0.9,
          color: acc,
          squashY: 1,
        },
        {
          x: cx,
          y: cy,
          radius: 12,
          maxRadius: Math.max(width, height) * 0.34,
          lineWidth: 3,
          alpha: 0.82,
          color: sec,
          squashY: 1,
        },
      );

      const palette = [acc, sec, '#ffffff', rar === 'legendary' ? '#fcd34d' : sec];
      const sparkCount = rar === 'legendary' ? 88 : rar === 'epic' ? 72 : 58;
      const shardCount = rar === 'legendary' ? 42 : rar === 'epic' ? 32 : 24;

      // High-velocity plasma sparks with upward bias
      for (let i = 0; i < sparkCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 220 + Math.random() * 620;
        particles.push({
          x: cx + (Math.random() - 0.5) * 44,
          y: cy + (Math.random() - 0.5) * 28,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - (110 + Math.random() * 190),
          size: 2.2 + Math.random() * 3.8,
          alpha: 1,
          life: 0,
          maxLife: 0.62 + Math.random() * 0.65,
          color: palette[i % palette.length],
          kind: 'spark',
          rot: 0,
          vrot: 0,
          drag: 0.955,
          gravity: 340,
        });
      }

      // Tumbling metallic/prismatic confetti shards
      for (let i = 0; i < shardCount; i++) {
        const angle = -Math.PI * 0.92 + Math.random() * Math.PI * 0.84;
        const speed = 200 + Math.random() * 480;
        particles.push({
          x: cx + (Math.random() - 0.5) * 60,
          y: cy + (Math.random() - 0.5) * 24,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 120,
          size: 5 + Math.random() * 7,
          alpha: 1,
          life: 0,
          maxLife: 1.05 + Math.random() * 0.9,
          color: palette[i % palette.length],
          kind: 'shard',
          rot: Math.random() * Math.PI * 2,
          vrot: (Math.random() - 0.5) * 14,
          drag: 0.972,
          gravity: 270,
        });
      }

      // Floating glowing embers that persist into Revealed
      for (let i = 0; i < 34; i++) {
        particles.push({
          x: cx + (Math.random() - 0.5) * width * 0.72,
          y: cy + (Math.random() - 0.35) * height * 0.48,
          vx: (Math.random() - 0.5) * 32,
          vy: -(30 + Math.random() * 68),
          size: 2.5 + Math.random() * 4.5,
          alpha: 0.85,
          life: 0,
          maxLife: 1.8 + Math.random() * 1.9,
          color: palette[i % palette.length],
          kind: 'ember',
          rot: 0,
          vrot: 0,
          drag: 0.995,
          gravity: -14,
        });
      }
    };

    const spawnLightningArc = () => {
      const { cx, cy } = getOrigin();
      const { accentHex: acc, secondaryHex: sec } = stateRef.current;
      const side = Math.random() < 0.5 ? -1 : 1;
      const startX = cx + side * (78 + Math.random() * 24);
      const startY = cy + (Math.random() - 0.5) * 56;
      const endX = cx - side * (46 + Math.random() * 52);
      const endY = cy + (Math.random() - 0.5) * 36;
      const segs = 7;
      const pts: Array<{ x: number; y: number }> = [{ x: startX, y: startY }];
      for (let s = 1; s < segs; s++) {
        const t = s / segs;
        pts.push({
          x: startX + (endX - startX) * t + (Math.random() - 0.5) * 26,
          y: startY + (endY - startY) * t + (Math.random() - 0.5) * 22,
        });
      }
      pts.push({ x: endX, y: endY });
      bolts.push({
        points: pts,
        life: 0,
        maxLife: 0.13 + Math.random() * 0.08,
        color: Math.random() < 0.4 ? '#ffffff' : Math.random() < 0.7 ? sec : acc,
      });
    };

    let rafId = 0;
    let lastTime = performance.now();
    let elapsed = 0;
    let vortexTimer = 0;
    let boltTimer = 0;
    let emberTimer = 0;

    // Trigger drop floor slam synced with crate touchdown (~210ms)
    const slamTimer = window.setTimeout(() => {
      if (stateRef.current.phase === 'drop' || stateRef.current.phase === 'charging') {
        if (!stateRef.current.dropImpactDone) {
          stateRef.current.dropImpactDone = true;
          spawnFloorSlam();
        }
      }
    }, 205);

    const frame = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;
      elapsed += dt;

      const st = stateRef.current;

      // Detect pulse / burst edges via live ref
      if (st.pulseSeq !== st.lastPulseSeq) {
        st.lastPulseSeq = st.pulseSeq;
        spawnChargePulse();
      }
      if (st.burstSeq !== st.lastBurstSeq) {
        st.lastBurstSeq = st.burstSeq;
        spawnMegaBurst();
      }

      const { cx, cy, floorY } = getOrigin();

      ctx.clearRect(0, 0, width, height);

      // 1. 3D Perspective Motorsport Hangar Floor Grid & Pit-Bay Laser Rails
      if (st.phase !== 'revealed') {
        const horizonY = cy + 36;
        const gridAlpha = st.phase === 'burst' ? 0.36 : 0.14 + st.chargeRatio * 0.16;

        // Subtle dark floor deck transition below horizon
        const deckGrad = ctx.createLinearGradient(0, horizonY, 0, height);
        deckGrad.addColorStop(0, 'rgba(6, 8, 14, 0)');
        deckGrad.addColorStop(0.18, 'rgba(8, 10, 18, 0.55)');
        deckGrad.addColorStop(1, 'rgba(3, 4, 8, 0.88)');
        ctx.fillStyle = deckGrad;
        ctx.fillRect(0, horizonY, width, height - horizonY);

        ctx.save();
        ctx.lineWidth = 1;
        // Receding perspective rays fanning across hangar floor
        const colCount = 10;
        for (let i = -colCount; i <= colCount; i++) {
          const topX = cx + i * 32;
          const botX = cx + i * Math.max(125, width * 0.145);
          const isRail = Math.abs(i) === 2;
          const rayGrad = ctx.createLinearGradient(topX, horizonY, botX, height);
          if (isRail) {
            rayGrad.addColorStop(0, hexToRgba(st.accentHex, 0));
            rayGrad.addColorStop(0.28, hexToRgba(st.accentHex, gridAlpha * 1.9));
            rayGrad.addColorStop(1, hexToRgba(st.secondaryHex, gridAlpha * 0.45));
            ctx.lineWidth = 2;
          } else {
            rayGrad.addColorStop(0, 'rgba(255,255,255,0)');
            rayGrad.addColorStop(0.35, `rgba(255,255,255,${gridAlpha * 0.42})`);
            rayGrad.addColorStop(1, 'rgba(255,255,255,0.02)');
            ctx.lineWidth = 1;
          }
          ctx.strokeStyle = rayGrad;
          ctx.beginPath();
          ctx.moveTo(topX, horizonY);
          ctx.lineTo(botX, height);
          ctx.stroke();
        }

        // Horizontal receding depth crossbars
        const rowFractions = [0.06, 0.14, 0.25, 0.4, 0.6, 0.84];
        const floorH = Math.max(1, height - horizonY);
        rowFractions.forEach((f, idx) => {
          const y = horizonY + floorH * f;
          const a = gridAlpha * (0.28 + idx * 0.06);
          const hGrad = ctx.createLinearGradient(0, y, width, y);
          hGrad.addColorStop(0, 'rgba(255,255,255,0)');
          hGrad.addColorStop(0.25, hexToRgba(st.accentHex, a * 0.55));
          hGrad.addColorStop(0.5, `rgba(255,255,255,${a * 0.72})`);
          hGrad.addColorStop(0.75, hexToRgba(st.accentHex, a * 0.55));
          hGrad.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.strokeStyle = hGrad;
          ctx.lineWidth = idx === 1 ? 1.5 : 1;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        });
        ctx.restore();
      }

      // 2. Twin Architectural Diagonal Overhead Studio Spotlight Cones (Supercar Hangar Reveal)
      const coneStrength =
        st.phase === 'burst'
          ? 0.34 * Math.max(0.3, st.beamStrength)
          : st.phase === 'charging'
            ? 0.11 + st.chargeRatio * 0.17
            : st.phase === 'revealed'
              ? 0.09
              : 0.08;
      const sway = Math.sin(elapsed * 1.15) * 18;
      const targetY = st.phase === 'revealed' ? height * 0.46 : floorY + 28;

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      // Left overhead studio beam
      const leftSrcX = cx - Math.min(width * 0.42, 340);
      const leftBeamGrad = ctx.createLinearGradient(leftSrcX, -20, cx + 60, targetY);
      leftBeamGrad.addColorStop(0, hexToRgba(st.secondaryHex, coneStrength * 0.95));
      leftBeamGrad.addColorStop(0.55, hexToRgba(st.accentHex, coneStrength * 0.42));
      leftBeamGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = leftBeamGrad;
      ctx.beginPath();
      ctx.moveTo(leftSrcX - 38, -20);
      ctx.lineTo(leftSrcX + 42, -20);
      ctx.lineTo(cx + 185 + sway, targetY);
      ctx.lineTo(cx - 115 + sway, targetY);
      ctx.closePath();
      ctx.fill();

      // Right overhead studio beam
      const rightSrcX = cx + Math.min(width * 0.42, 340);
      const rightBeamGrad = ctx.createLinearGradient(rightSrcX, -20, cx - 60, targetY);
      rightBeamGrad.addColorStop(0, hexToRgba(st.secondaryHex, coneStrength * 0.95));
      rightBeamGrad.addColorStop(0.55, hexToRgba(st.accentHex, coneStrength * 0.42));
      rightBeamGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rightBeamGrad;
      ctx.beginPath();
      ctx.moveTo(rightSrcX - 42, -20);
      ctx.lineTo(rightSrcX + 38, -20);
      ctx.lineTo(cx + 115 - sway, targetY);
      ctx.lineTo(cx - 185 - sway, targetY);
      ctx.closePath();
      ctx.fill();

      // Razor-sharp horizontal anamorphic lens streak across the vault seam during charge & burst
      if (st.phase === 'charging' || st.phase === 'burst') {
        const streakAlpha =
          st.phase === 'burst'
            ? 0.92 * Math.max(0.25, st.beamStrength)
            : 0.16 + st.chargeRatio * 0.58;
        const streakHalfW =
          st.phase === 'burst'
            ? width * 0.56
            : Math.min(width * 0.48, 170 + st.chargeRatio * 240);
        const streakH = st.phase === 'burst' ? 12 : 3 + st.chargeRatio * 5;
        const streakGrad = ctx.createLinearGradient(
          cx - streakHalfW,
          cy,
          cx + streakHalfW,
          cy,
        );
        streakGrad.addColorStop(0, 'rgba(0,0,0,0)');
        streakGrad.addColorStop(0.28, hexToRgba(st.accentHex, streakAlpha * 0.52));
        streakGrad.addColorStop(0.5, `rgba(255,255,255,${streakAlpha})`);
        streakGrad.addColorStop(0.72, hexToRgba(st.accentHex, streakAlpha * 0.52));
        streakGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = streakGrad;
        ctx.fillRect(cx - streakHalfW, cy - streakH * 0.5, streakHalfW * 2, streakH);
      }

      ctx.restore();

      // 3. Blazing Vertical Light Pillar on Burst!
      if (st.beamStrength > 0.01) {
        st.beamStrength = Math.max(
          0,
          st.beamStrength - dt * (st.phase === 'burst' ? 0.75 : 1.9),
        );
        const pillarHalfW = (54 + st.beamStrength * 115) * (st.rarity === 'legendary' ? 1.25 : 1);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const pillarGrad = ctx.createLinearGradient(
          cx - pillarHalfW,
          0,
          cx + pillarHalfW,
          0,
        );
        pillarGrad.addColorStop(0, 'rgba(0,0,0,0)');
        pillarGrad.addColorStop(0.24, hexToRgba(st.accentHex, 0.36 * st.beamStrength));
        pillarGrad.addColorStop(0.45, hexToRgba(st.secondaryHex, 0.72 * st.beamStrength));
        pillarGrad.addColorStop(0.5, `rgba(255,255,255,${0.92 * st.beamStrength})`);
        pillarGrad.addColorStop(0.55, hexToRgba(st.secondaryHex, 0.72 * st.beamStrength));
        pillarGrad.addColorStop(0.76, hexToRgba(st.accentHex, 0.36 * st.beamStrength));
        pillarGrad.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.fillStyle = pillarGrad;
        ctx.fillRect(cx - pillarHalfW, 0, pillarHalfW * 2, cy + 54);
        ctx.restore();
      }

      // 4. Spawn continuous phase particles
      if (st.phase === 'charging') {
        vortexTimer += dt;
        const vortexInterval = Math.max(0.014, 0.055 - st.chargeRatio * 0.04);
        while (vortexTimer >= vortexInterval) {
          vortexTimer -= vortexInterval;
          const angle = Math.random() * Math.PI * 2;
          const dist = 130 + Math.random() * 145;
          particles.push({
            x: cx + Math.cos(angle) * dist,
            y: cy + Math.sin(angle) * dist,
            vx: 0,
            vy: 0,
            size: 1.8 + Math.random() * 2.8,
            alpha: 0.92,
            life: 0,
            maxLife: 0.42 + Math.random() * 0.25,
            color: Math.random() < 0.28 ? '#ffffff' : Math.random() < 0.65 ? st.accentHex : st.secondaryHex,
            kind: 'vortex',
            rot: angle,
            vrot: dist, // reuse vrot to store initial radius for inward spiral
            drag: 1,
            gravity: 0,
          });
        }

        // Crackling lightning arcs at higher charge
        if (st.chargeRatio > 0.25) {
          boltTimer += dt;
          const boltInterval = Math.max(0.065, 0.24 - st.chargeRatio * 0.16);
          if (boltTimer >= boltInterval) {
            boltTimer = 0;
            spawnLightningArc();
          }
        }
      } else if (st.phase === 'revealed') {
        emberTimer += dt;
        const emberInterval = st.rarity === 'legendary' ? 0.09 : 0.14;
        if (emberTimer >= emberInterval && particles.length < 95) {
          emberTimer = 0;
          particles.push({
            x: Math.random() * width,
            y: height + 10,
            vx: (Math.random() - 0.5) * 24,
            vy: -(36 + Math.random() * 64),
            size: 2 + Math.random() * 3.8,
            alpha: 0.72,
            life: 0,
            maxLife: 3.4 + Math.random() * 2.4,
            color: Math.random() < 0.35 ? st.secondaryHex : st.accentHex,
            kind: 'ember',
            rot: 0,
            vrot: 0,
            drag: 0.998,
            gravity: -6,
          });
        }
      }

      // 5. Update & Render Sharp Hexagonal Shockwaves
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = rings.length - 1; i >= 0; i--) {
        const r = rings[i];
        r.radius += (r.maxRadius - r.radius) * Math.min(1, dt * 7.8) + 120 * dt;
        r.alpha -= dt * 1.95;
        if (r.alpha <= 0.01 || r.radius >= r.maxRadius) {
          rings.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.translate(r.x, r.y);
        ctx.beginPath();
        for (let s = 0; s < 6; s++) {
          const a = (s / 6) * Math.PI * 2 - Math.PI / 6;
          const px = Math.cos(a) * r.radius;
          const py = Math.sin(a) * r.radius;
          if (s === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.strokeStyle = hexToRgba(r.color, Math.max(0, r.alpha));
        ctx.lineWidth = r.lineWidth * Math.max(0.25, r.alpha);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();

      // 6. Update & Render Lightning Arcs
      if (bolts.length > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        for (let i = bolts.length - 1; i >= 0; i--) {
          const b = bolts[i];
          b.life += dt;
          if (b.life >= b.maxLife) {
            bolts.splice(i, 1);
            continue;
          }
          const a = 1 - b.life / b.maxLife;
          ctx.beginPath();
          b.points.forEach((pt, idx) => {
            if (idx === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          });
          ctx.strokeStyle = hexToRgba(b.color, a * 0.9);
          ctx.lineWidth = 3.2;
          ctx.stroke();

          ctx.strokeStyle = `rgba(255,255,255,${a * 0.95})`;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
        ctx.restore();
      }

      // 7. Update & Render Physics Particles
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life += dt;
        if (p.life >= p.maxLife) {
          particles.splice(i, 1);
          continue;
        }
        const t = p.life / p.maxLife;

        if (p.kind === 'vortex') {
          // Spiral inward into crate center
          const ease = t * t;
          const curDist = p.vrot * (1 - ease);
          const curAngle = p.rot + ease * 2.4;
          const prevX = p.x;
          const prevY = p.y;
          p.x = cx + Math.cos(curAngle) * curDist;
          p.y = cy + Math.sin(curAngle) * curDist;
          const a = Math.sin(t * Math.PI) * p.alpha;
          ctx.strokeStyle = hexToRgba(p.color, a);
          ctx.lineWidth = p.size * (1 - t * 0.4);
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(prevX, prevY);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        } else if (p.kind === 'spark') {
          const prevX = p.x;
          const prevY = p.y;
          const dragPow = Math.pow(p.drag, dt * 60);
          p.vx *= dragPow;
          p.vy = p.vy * dragPow + p.gravity * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;

          const a = (1 - t * t) * p.alpha;
          ctx.strokeStyle = hexToRgba(p.color, a);
          ctx.lineWidth = p.size * (1 - t * 0.55);
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(prevX - p.vx * dt * 1.4, prevY - p.vy * dt * 1.4);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        } else if (p.kind === 'shard') {
          const dragPow = Math.pow(p.drag, dt * 60);
          p.vx *= dragPow;
          p.vy = p.vy * dragPow + p.gravity * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.rot += p.vrot * dt;

          const a = (1 - Math.pow(t, 2.2)) * p.alpha;
          const wobble = Math.cos(p.rot * 2.1);
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.scale(1, Math.max(0.22, Math.abs(wobble)));
          ctx.fillStyle = hexToRgba(p.color, a);
          ctx.fillRect(-p.size * 0.65, -p.size * 0.35, p.size * 1.3, p.size * 0.7);
          ctx.restore();
        } else {
          // Soft glowing bokeh ember
          p.x += (p.vx + Math.sin(elapsed * 2 + i) * 14) * dt;
          p.y += p.vy * dt;
          const fadeIn = Math.min(1, t * 5);
          const fadeOut = 1 - Math.pow(t, 1.8);
          const a = fadeIn * fadeOut * p.alpha * 0.72;
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2.1);
          grad.addColorStop(0, hexToRgba('#ffffff', a));
          grad.addColorStop(0.4, hexToRgba(p.color, a * 0.85));
          grad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 2.1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();

      // 8. Full-Screen Impact Flash Decay
      if (st.flashAlpha > 0.008) {
        st.flashAlpha = Math.max(0, st.flashAlpha - dt * 2.7);
        const flashGrad = ctx.createRadialGradient(
          cx,
          cy,
          0,
          cx,
          cy,
          Math.max(width, height) * 0.85,
        );
        flashGrad.addColorStop(0, `rgba(255,255,255,${st.flashAlpha})`);
        flashGrad.addColorStop(0.55, hexToRgba(st.secondaryHex, st.flashAlpha * 0.72));
        flashGrad.addColorStop(1, hexToRgba(st.accentHex, st.flashAlpha * 0.35));
        ctx.fillStyle = flashGrad;
        ctx.fillRect(0, 0, width, height);
      }

      rafId = window.requestAnimationFrame(frame);
    };

    rafId = window.requestAnimationFrame(frame);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(slamTimer);
      window.removeEventListener('resize', resize);
    };
  }, [disabled]);

  if (disabled) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-10 h-full w-full"
    />
  );
};

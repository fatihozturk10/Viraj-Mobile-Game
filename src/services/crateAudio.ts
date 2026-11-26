import { LootRarity } from './storeCatalog';

const AUDIO_SETTINGS_KEY = 'viraj_audio_settings_v1';

let sharedCtx: AudioContext | null = null;
let cachedNoiseBuf: AudioBuffer | null = null;

function readAudioSettings(): { muted: boolean; volume: number } {
  try {
    const raw = window.localStorage.getItem(AUDIO_SETTINGS_KEY);
    if (!raw) return { muted: false, volume: 0.85 };
    const parsed = JSON.parse(raw) as { muted?: boolean; sfxVolume?: number };
    const muted = Boolean(parsed.muted);
    const vol =
      typeof parsed.sfxVolume === 'number' && Number.isFinite(parsed.sfxVolume)
        ? Math.max(0, Math.min(1, parsed.sfxVolume))
        : 0.85;
    return { muted, volume: vol };
  } catch {
    return { muted: false, volume: 0.85 };
  }
}

function getContext(): { ctx: AudioContext; gainScale: number } | null {
  if (typeof window === 'undefined') return null;
  const { muted, volume } = readAudioSettings();
  if (muted || volume <= 0.01) return null;

  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return null;
    if (!sharedCtx) {
      sharedCtx = new AudioCtx();
    }
    if (sharedCtx.state === 'suspended') {
      sharedCtx.resume().catch(() => {});
    }
    return { ctx: sharedCtx, gainScale: volume * 0.34 };
  } catch {
    return null;
  }
}

function getWhiteNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (cachedNoiseBuf && cachedNoiseBuf.sampleRate === ctx.sampleRate) {
    return cachedNoiseBuf;
  }
  const len = Math.max(1, Math.floor(ctx.sampleRate * 1.6));
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  cachedNoiseBuf = buffer;
  return buffer;
}

/** Realistic physical steel impact: broadband transient + inharmonic modal plate resonances */
function triggerSteelClank(
  ctx: AudioContext,
  start: number,
  baseHz: number,
  gainLevel: number,
  decaySec: number,
): void {
  // 1. Short crisp contact transient (metal-on-metal click)
  const click = ctx.createBufferSource();
  click.buffer = getWhiteNoiseBuffer(ctx);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(Math.min(6200, baseHz * 4.2), start);
  bp.Q.value = 2.2;
  const cGain = ctx.createGain();
  cGain.gain.setValueAtTime(0.0008, start);
  cGain.gain.linearRampToValueAtTime(gainLevel * 0.85, start + 0.002);
  cGain.gain.exponentialRampToValueAtTime(0.0008, start + 0.022);
  click.connect(bp);
  bp.connect(cGain);
  cGain.connect(ctx.destination);
  click.start(start, Math.random() * 0.4, 0.028);

  // 2. Inharmonic steel modal overtones (non-integer ratios -> authentic real steel ring!)
  const ratios = [1.0, 2.31, 3.84, 5.47];
  const weights = [0.55, 0.38, 0.24, 0.14];
  for (let i = 0; i < ratios.length; i++) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const f = baseHz * ratios[i];
    if (f > ctx.sampleRate * 0.42) continue;
    osc.type = i === 0 ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(f, start);
    osc.frequency.exponentialRampToValueAtTime(f * 0.96, start + decaySec);
    const modeDecay = decaySec * (1 - i * 0.16);
    g.gain.setValueAtTime(0.0008, start);
    g.gain.linearRampToValueAtTime(gainLevel * weights[i], start + 0.0025);
    g.gain.exponentialRampToValueAtTime(0.0008, start + Math.max(0.025, modeDecay));
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + Math.max(0.03, modeDecay) + 0.015);
  }
}

/** Mechanical sliding steel deadbolt friction ("şııık") */
function triggerBoltSlide(
  ctx: AudioContext,
  start: number,
  durationSec: number,
  gainLevel: number,
  freqStart = 1450,
  freqEnd = 2550,
): void {
  const src = ctx.createBufferSource();
  src.buffer = getWhiteNoiseBuffer(ctx);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(freqStart, start);
  bp.frequency.exponentialRampToValueAtTime(freqEnd, start + durationSec);
  bp.Q.value = 5.2;

  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.setValueAtTime(750, start);

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0008, start);
  g.gain.linearRampToValueAtTime(gainLevel, start + durationSec * 0.25);
  g.gain.linearRampToValueAtTime(gainLevel * 0.72, start + durationSec * 0.75);
  g.gain.exponentialRampToValueAtTime(0.0008, start + durationSec);

  src.connect(bp);
  bp.connect(hp);
  hp.connect(g);
  g.connect(ctx.destination);
  src.start(start, Math.random() * 0.5, durationSec + 0.02);
}

/** Pressurized hydraulic/pneumatic vault gasket decompression hiss ("pşşşhh") */
function triggerPneumaticHiss(
  ctx: AudioContext,
  start: number,
  durationSec: number,
  gainLevel: number,
): void {
  const src = ctx.createBufferSource();
  src.buffer = getWhiteNoiseBuffer(ctx);

  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(5200, start);
  bp.frequency.exponentialRampToValueAtTime(1250, start + durationSec);
  bp.Q.value = 1.4;

  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.setValueAtTime(1600, start);

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0008, start);
  g.gain.linearRampToValueAtTime(gainLevel, start + 0.018);
  g.gain.exponentialRampToValueAtTime(gainLevel * 0.28, start + durationSec * 0.55);
  g.gain.exponentialRampToValueAtTime(0.0008, start + durationSec);

  src.connect(bp);
  bp.connect(hp);
  hp.connect(g);
  g.connect(ctx.destination);
  src.start(start, Math.random() * 0.3, durationSec + 0.02);
}

/** Heavy oiled steel vault hinge creak & hydraulic lid swing */
function triggerVaultHingeCreak(
  ctx: AudioContext,
  start: number,
  durationSec: number,
  gainLevel: number,
): void {
  // Stick-slip modulated sawtooth pushed through twin steel formant filters
  const carrier = ctx.createOscillator();
  carrier.type = 'sawtooth';
  carrier.frequency.setValueAtTime(128, start);
  carrier.frequency.linearRampToValueAtTime(184, start + durationSec * 0.45);
  carrier.frequency.linearRampToValueAtTime(142, start + durationSec);

  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.type = 'sine';
  lfo.frequency.setValueAtTime(22, start);
  lfo.frequency.linearRampToValueAtTime(14, start + durationSec);
  lfoGain.gain.setValueAtTime(14, start);
  lfo.connect(lfoGain);
  lfoGain.connect(carrier.frequency);

  const formantA = ctx.createBiquadFilter();
  formantA.type = 'bandpass';
  formantA.frequency.setValueAtTime(680, start);
  formantA.frequency.linearRampToValueAtTime(920, start + durationSec * 0.6);
  formantA.Q.value = 6.5;

  const formantB = ctx.createBiquadFilter();
  formantB.type = 'bandpass';
  formantB.frequency.setValueAtTime(1380, start);
  formantB.frequency.linearRampToValueAtTime(1120, start + durationSec);
  formantB.Q.value = 7.5;

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0008, start);
  g.gain.linearRampToValueAtTime(gainLevel, start + durationSec * 0.18);
  g.gain.linearRampToValueAtTime(gainLevel * 0.78, start + durationSec * 0.72);
  g.gain.exponentialRampToValueAtTime(0.0008, start + durationSec);

  carrier.connect(formantA);
  carrier.connect(formantB);
  formantA.connect(g);
  formantB.connect(g);
  g.connect(ctx.destination);

  carrier.start(start);
  lfo.start(start);
  carrier.stop(start + durationSec + 0.02);
  lfo.stop(start + durationSec + 0.02);
}

/** Heavy armored steel vault slam when dropping onto the hangar concrete floor */
export function playCrateDropSfx(): void {
  const handle = getContext();
  if (!handle) return;
  const { ctx, gainScale } = handle;
  const now = ctx.currentTime;

  try {
    // 1. Heavy concrete floor impact thud (tight, physical, zero rubbery boing)
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(125, now);
    sub.frequency.exponentialRampToValueAtTime(28, now + 0.22);

    subGain.gain.setValueAtTime(0.001, now);
    subGain.gain.linearRampToValueAtTime(gainScale * 1.45, now + 0.008);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

    sub.connect(subGain);
    subGain.connect(ctx.destination);
    sub.start(now);
    sub.stop(now + 0.28);

    // 2. Hollow thick steel vault box resonance
    triggerSteelClank(ctx, now, 165, gainScale * 0.72, 0.22);

    // 3. Settling heavy steel latch rattle (2 crisp delayed metallic clinks)
    triggerSteelClank(ctx, now + 0.055, 520, gainScale * 0.34, 0.09);
    triggerSteelClank(ctx, now + 0.095, 690, gainScale * 0.22, 0.07);

    // 4. Short concrete dust impact thump
    const dust = ctx.createBufferSource();
    dust.buffer = getWhiteNoiseBuffer(ctx);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(680, now);
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(gainScale * 0.52, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    dust.connect(lp);
    lp.connect(nGain);
    nGain.connect(ctx.destination);
    dust.start(now, 0, 0.15);
  } catch {
    // ignore Web Audio failure
  }
}

/** Realistic safe tumbler click + heavy steel deadbolt retracting + pneumatic seal hiss per latch unlock */
export function playCrateTapChargeSfx(
  stage: number,
  rarity: LootRarity,
  upgraded = false,
): void {
  const handle = getContext();
  if (!handle) return;
  const { ctx, gainScale } = handle;
  const now = ctx.currentTime;

  try {
    const stageIdx = Math.max(0, Math.min(4, stage));

    // 1. Crisp precision safe-tumbler pin click ("Tık!")
    triggerSteelClank(ctx, now, 780 + stageIdx * 85, gainScale * 0.48, 0.055);

    // 2. Metal-on-metal steel deadbolt sliding back inside sleeve ("Şııık!")
    triggerBoltSlide(
      ctx,
      now + 0.016,
      0.062,
      gainScale * 0.56,
      1350 + stageIdx * 160,
      2450 + stageIdx * 220,
    );

    // 3. Solid heavy deadbolt mechanical stop clunk ("KLANK!")
    const clunkTime = now + 0.068;
    const thump = ctx.createOscillator();
    const thumpGain = ctx.createGain();
    thump.type = 'triangle';
    thump.frequency.setValueAtTime(178 + stageIdx * 18, clunkTime);
    thump.frequency.exponentialRampToValueAtTime(46, clunkTime + 0.11);
    thumpGain.gain.setValueAtTime(0.001, clunkTime);
    thumpGain.gain.linearRampToValueAtTime(gainScale * 1.05, clunkTime + 0.006);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, clunkTime + 0.13);
    thump.connect(thumpGain);
    thumpGain.connect(ctx.destination);
    thump.start(clunkTime);
    thump.stop(clunkTime + 0.14);

    triggerSteelClank(ctx, clunkTime, 310 + stageIdx * 42, gainScale * 0.62, 0.14);

    // 4. Short pressurized gasket air puff as the latch releases ("Pıssst")
    triggerPneumaticHiss(ctx, clunkTime + 0.012, 0.11, gainScale * 0.34);

    // 5. Subtle warm metallic resonance when rarity upgrades mid-unlock
    if (upgraded) {
      const rarityRoot =
        rarity === 'legendary' ? 587.33 : rarity === 'epic' ? 523.25 : 440;
      [rarityRoot, rarityRoot * 1.5].forEach((f, i) => {
        const osc = ctx.createOscillator();
        const lp = ctx.createBiquadFilter();
        const g = ctx.createGain();
        const start = clunkTime + 0.025 + i * 0.045;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, start);
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(1900, start);
        g.gain.setValueAtTime(0.001, start);
        g.gain.linearRampToValueAtTime(gainScale * 0.24, start + 0.014);
        g.gain.exponentialRampToValueAtTime(0.001, start + 0.28);
        osc.connect(lp);
        lp.connect(g);
        g.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.3);
      });
    }
  } catch {
    // ignore Web Audio failure
  }
}

/** Mechanical safe combination dial spin & locking gear tension build */
export function playCrateChargeSfx(durationSec = 1.25): void {
  const handle = getContext();
  if (!handle) return;
  const { ctx, gainScale } = handle;
  const now = ctx.currentTime;

  try {
    // Mechanical ratchet ticks accelerating like a vault wheel spinning to unlock
    const tickCount = Math.max(6, Math.min(18, Math.round(durationSec * 11)));
    for (let i = 0; i < tickCount; i++) {
      const frac = i / tickCount;
      const t = now + Math.pow(frac, 1.35) * (durationSec * 0.92);
      triggerSteelClank(ctx, t, 640 + frac * 420, gainScale * (0.2 + frac * 0.24), 0.04);
    }

    // Deep hydraulic motor hum underneath
    const hum = ctx.createOscillator();
    const lp = ctx.createBiquadFilter();
    const g = ctx.createGain();
    hum.type = 'sawtooth';
    hum.frequency.setValueAtTime(62, now);
    hum.frequency.exponentialRampToValueAtTime(132, now + durationSec);
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(240, now);
    lp.frequency.exponentialRampToValueAtTime(620, now + durationSec);
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(gainScale * 0.24, now + durationSec * 0.85);
    g.gain.exponentialRampToValueAtTime(0.001, now + durationSec + 0.04);
    hum.connect(lp);
    lp.connect(g);
    g.connect(ctx.destination);
    hum.start(now);
    hum.stop(now + durationSec + 0.06);
  } catch {
    // ignore Web Audio failure
  }
}

/** Authentic heavy armored vault unlock: multi-bolt unlatch -> pneumatic hiss -> creaking steel lid swing -> warm reveal */
export function playCrateBurstSfx(rarity: LootRarity): void {
  const handle = getContext();
  if (!handle) return;
  const { ctx, gainScale } = handle;
  const now = ctx.currentTime;

  try {
    // 1. Rapid heavy master-vault multi-bolt release ("KLAK-KLAK-THUNK!")
    triggerSteelClank(ctx, now, 420, gainScale * 0.68, 0.1);
    triggerBoltSlide(ctx, now + 0.015, 0.075, gainScale * 0.55, 1100, 2200);
    triggerSteelClank(ctx, now + 0.052, 310, gainScale * 0.78, 0.14);
    triggerSteelClank(ctx, now + 0.105, 195, gainScale * 0.92, 0.24);

    // Deep mechanical master-bolt release punch
    const boltThud = ctx.createOscillator();
    const boltThudGain = ctx.createGain();
    boltThud.type = 'sine';
    boltThud.frequency.setValueAtTime(138, now + 0.095);
    boltThud.frequency.exponentialRampToValueAtTime(30, now + 0.36);
    boltThudGain.gain.setValueAtTime(0.001, now + 0.095);
    boltThudGain.gain.linearRampToValueAtTime(gainScale * 1.48, now + 0.106);
    boltThudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    boltThud.connect(boltThudGain);
    boltThudGain.connect(ctx.destination);
    boltThud.start(now + 0.095);
    boltThud.stop(now + 0.42);

    // 2. Pressurized hydraulic/pneumatic vault seal decompression ("PŞŞŞŞHHH...")
    triggerPneumaticHiss(ctx, now + 0.075, 0.38, gainScale * 0.78);

    // 3. Heavy armored steel lid hinges creaking & swinging open
    triggerVaultHingeCreak(ctx, now + 0.12, 0.36, gainScale * 0.44);

    // 4. Heavy lid reaching full-open steel back-stop thud
    triggerSteelClank(ctx, now + 0.44, 240, gainScale * 0.56, 0.18);
    const stopThud = ctx.createOscillator();
    const stopGain = ctx.createGain();
    stopThud.type = 'triangle';
    stopThud.frequency.setValueAtTime(118, now + 0.44);
    stopThud.frequency.exponentialRampToValueAtTime(36, now + 0.58);
    stopGain.gain.setValueAtTime(0.001, now + 0.44);
    stopGain.gain.linearRampToValueAtTime(gainScale * 0.75, now + 0.45);
    stopGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    stopThud.connect(stopGain);
    stopGain.connect(ctx.destination);
    stopThud.start(now + 0.44);
    stopThud.stop(now + 0.62);

    // 5. Classy cinematic warm reveal swell as the loot illuminates (subtle & metallic, never toy-like!)
    const chords: Record<LootRarity, number[]> = {
      common: [261.63, 329.63, 392.0],
      rare: [293.66, 369.99, 440.0, 587.33],
      epic: [261.63, 329.63, 392.0, 523.25, 659.25],
      legendary: [220.0, 277.18, 329.63, 440.0, 554.37, 659.25, 880.0],
    };

    const notes = chords[rarity];
    notes.forEach((freq, idx) => {
      const start = now + 0.22 + idx * 0.036;
      const osc = ctx.createOscillator();
      const lp = ctx.createBiquadFilter();
      const noteGain = ctx.createGain();
      osc.type = rarity === 'legendary' || rarity === 'epic' ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(freq, start);

      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(rarity === 'legendary' ? 2400 : 1650, start);
      lp.frequency.exponentialRampToValueAtTime(520, start + 0.85);

      const dur =
        rarity === 'legendary' ? 0.98 : rarity === 'epic' ? 0.76 : 0.52;
      noteGain.gain.setValueAtTime(0.001, start);
      noteGain.gain.linearRampToValueAtTime(
        gainScale * (rarity === 'legendary' ? 0.16 : 0.13),
        start + 0.045,
      );
      noteGain.gain.exponentialRampToValueAtTime(0.001, start + dur);

      osc.connect(lp);
      lp.connect(noteGain);
      noteGain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur + 0.04);
    });
  } catch {
    // ignore Web Audio failure
  }
}

/** Crisp crystalline chime as each individual loot card flips in */
export function playLootCardTickSfx(rarity: LootRarity, index: number): void {
  const handle = getContext();
  if (!handle) return;
  const { ctx, gainScale } = handle;
  const now = ctx.currentTime;

  try {
    const basePitch =
      rarity === 'legendary'
        ? 1046.5
        : rarity === 'epic'
          ? 880
          : rarity === 'rare'
            ? 740
            : 622;
    const freq = basePitch * Math.pow(1.045, Math.min(index, 8));

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = rarity === 'legendary' || rarity === 'epic' ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.14, now + 0.09);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(gainScale * 0.26, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.19);
  } catch {
    // ignore Web Audio failure
  }
}

/** Triumphant brass-chime fanfare when leveling up */
export function playLevelUpFanfareSfx(isMilestone = false): void {
  const handle = getContext();
  if (!handle) return;
  const { ctx, gainScale } = handle;
  const now = ctx.currentTime;

  try {
    // Punchy bass arrival hit
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(160, now);
    sub.frequency.exponentialRampToValueAtTime(42, now + 0.36);
    subGain.gain.setValueAtTime(0.001, now);
    subGain.gain.linearRampToValueAtTime(gainScale * 1.2, now + 0.015);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
    sub.connect(subGain);
    subGain.connect(ctx.destination);
    sub.start(now);
    sub.stop(now + 0.45);

    // Ascending victory arpeggio (C5 -> E5 -> G5 -> B5 -> C6 -> E6)
    const notes = isMilestone
      ? [523.25, 659.25, 783.99, 987.77, 1046.5, 1318.51, 1567.98]
      : [523.25, 659.25, 783.99, 1046.5, 1318.51];

    notes.forEach((freq, idx) => {
      const start = now + 0.04 + idx * 0.068;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = idx >= notes.length - 2 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, start);
      const dur = idx === notes.length - 1 ? 0.95 : 0.46;
      g.gain.setValueAtTime(0.001, start);
      g.gain.linearRampToValueAtTime(
        gainScale * (idx === notes.length - 1 ? 0.48 : 0.3),
        start + 0.016,
      );
      g.gain.exponentialRampToValueAtTime(0.001, start + dur);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur + 0.04);
    });

    // Warm shimmer pad
    [261.63, 392.0, 523.25].forEach((pf) => {
      const pad = ctx.createOscillator();
      const lp = ctx.createBiquadFilter();
      const pg = ctx.createGain();
      pad.type = 'sawtooth';
      pad.frequency.setValueAtTime(pf, now + 0.08);
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(1600, now + 0.08);
      lp.frequency.exponentialRampToValueAtTime(520, now + 1.05);
      pg.gain.setValueAtTime(0.001, now + 0.08);
      pg.gain.linearRampToValueAtTime(gainScale * 0.14, now + 0.18);
      pg.gain.exponentialRampToValueAtTime(0.001, now + 1.1);
      pad.connect(lp);
      lp.connect(pg);
      pg.connect(ctx.destination);
      pad.start(now + 0.08);
      pad.stop(now + 1.14);
    });
  } catch {
    // ignore Web Audio failure
  }
}

/** Crisp reward-collect chime for Level Road node claims */
export function playLevelRewardClaimSfx(isExclusive = false): void {
  const handle = getContext();
  if (!handle) return;
  const { ctx, gainScale } = handle;
  const now = ctx.currentTime;

  try {
    const freqs = isExclusive
      ? [659.25, 880.0, 1174.66, 1567.98]
      : [587.33, 880.0, 1174.66];
    freqs.forEach((f, idx) => {
      const start = now + idx * 0.055;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = isExclusive ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(f, start);
      g.gain.setValueAtTime(0.001, start);
      g.gain.linearRampToValueAtTime(gainScale * 0.34, start + 0.014);
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.36);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.38);
    });
  } catch {
    // ignore Web Audio failure
  }
}

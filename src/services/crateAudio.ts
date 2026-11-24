import { LootRarity } from './storeCatalog';

const AUDIO_SETTINGS_KEY = 'viraj_audio_settings_v1';

let sharedCtx: AudioContext | null = null;

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
    return { ctx: sharedCtx, gainScale: volume * 0.3 };
  } catch {
    return null;
  }
}

function createNoiseBuffer(
  ctx: AudioContext,
  durationSec: number,
  decayPower: number,
): AudioBuffer {
  const len = Math.max(1, Math.floor(ctx.sampleRate * durationSec));
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decayPower);
  }
  return buffer;
}

/** Heavy metallic vault slam when dropping onto the hangar floor */
export function playCrateDropSfx(): void {
  const handle = getContext();
  if (!handle) return;
  const { ctx, gainScale } = handle;
  const now = ctx.currentTime;

  try {
    // Deep sub floor thud
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(155, now);
    sub.frequency.exponentialRampToValueAtTime(34, now + 0.28);

    subGain.gain.setValueAtTime(0.001, now);
    subGain.gain.linearRampToValueAtTime(gainScale * 1.3, now + 0.014);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

    sub.connect(subGain);
    subGain.connect(ctx.destination);
    sub.start(now);
    sub.stop(now + 0.34);

    // Metallic body resonance
    const body = ctx.createOscillator();
    const bodyGain = ctx.createGain();
    body.type = 'triangle';
    body.frequency.setValueAtTime(240, now);
    body.frequency.exponentialRampToValueAtTime(78, now + 0.16);
    bodyGain.gain.setValueAtTime(0.001, now);
    bodyGain.gain.linearRampToValueAtTime(gainScale * 0.55, now + 0.01);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
    body.connect(bodyGain);
    bodyGain.connect(ctx.destination);
    body.start(now);
    body.stop(now + 0.21);

    // Hydraulic lock clink
    const clink = ctx.createOscillator();
    const clinkGain = ctx.createGain();
    clink.type = 'sine';
    clink.frequency.setValueAtTime(1480, now + 0.025);
    clink.frequency.exponentialRampToValueAtTime(720, now + 0.14);
    clinkGain.gain.setValueAtTime(0.001, now + 0.025);
    clinkGain.gain.linearRampToValueAtTime(gainScale * 0.34, now + 0.036);
    clinkGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    clink.connect(clinkGain);
    clinkGain.connect(ctx.destination);
    clink.start(now + 0.025);
    clink.stop(now + 0.18);

    // Brief dust/air impact burst
    const noise = ctx.createBufferSource();
    noise.buffer = createNoiseBuffer(ctx, 0.14, 2.2);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(950, now);
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(gainScale * 0.36, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    noise.connect(lp);
    lp.connect(nGain);
    nGain.connect(ctx.destination);
    noise.start(now);
  } catch {
    // ignore Web Audio failure
  }
}

/** Tactile hydraulic bolt release + rising energy charge hit on each tap / stage */
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
    const stageIdx = Math.max(0, Math.min(3, stage));
    const baseFreqs = [330, 440, 587.33, 783.99];
    const rarityBoost =
      rarity === 'legendary'
        ? 1.25
        : rarity === 'epic'
          ? 1.12
          : rarity === 'rare'
            ? 1.05
            : 1.0;
    const freq = baseFreqs[stageIdx] * rarityBoost;

    // Punchy metallic hit
    const thump = ctx.createOscillator();
    const thumpGain = ctx.createGain();
    thump.type = 'triangle';
    thump.frequency.setValueAtTime(195 + stageIdx * 35, now);
    thump.frequency.exponentialRampToValueAtTime(52, now + 0.13);
    thumpGain.gain.setValueAtTime(0.001, now);
    thumpGain.gain.linearRampToValueAtTime(gainScale * 0.85, now + 0.008);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    thump.connect(thumpGain);
    thumpGain.connect(ctx.destination);
    thump.start(now);
    thump.stop(now + 0.16);

    // Rising harmonic energy ping
    const ping = ctx.createOscillator();
    const pingGain = ctx.createGain();
    ping.type = 'sine';
    ping.frequency.setValueAtTime(freq, now + 0.01);
    ping.frequency.exponentialRampToValueAtTime(freq * 1.18, now + 0.18);
    pingGain.gain.setValueAtTime(0.001, now + 0.01);
    pingGain.gain.linearRampToValueAtTime(gainScale * 0.44, now + 0.025);
    pingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    ping.connect(pingGain);
    pingGain.connect(ctx.destination);
    ping.start(now + 0.01);
    ping.stop(now + 0.26);

    // Extra shimmering fifth chime when rarity upgrades mid-charge!
    if (upgraded) {
      const shimmerFreqs = [freq * 1.5, freq * 2.0];
      shimmerFreqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        const start = now + 0.03 + i * 0.045;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, start);
        g.gain.setValueAtTime(0.001, start);
        g.gain.linearRampToValueAtTime(gainScale * 0.36, start + 0.015);
        g.gain.exponentialRampToValueAtTime(0.001, start + 0.34);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.36);
      });
    }

    // Crisp pneumatic clamp unlatch hiss
    const noise = ctx.createBufferSource();
    noise.buffer = createNoiseBuffer(ctx, 0.09, 1.9);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(2800 + stageIdx * 550, now);
    bp.Q.value = 1.6;
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(gainScale * 0.32, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    noise.connect(bp);
    bp.connect(nGain);
    nGain.connect(ctx.destination);
    noise.start(now);
  } catch {
    // ignore Web Audio failure
  }
}

/** Rising turbo-spool harmonic charge before explosion */
export function playCrateChargeSfx(durationSec = 1.25): void {
  const handle = getContext();
  if (!handle) return;
  const { ctx, gainScale } = handle;
  const now = ctx.currentTime;

  try {
    // Smooth rising turbine sweep
    const osc = ctx.createOscillator();
    const subOsc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(560, now + durationSec);

    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(55, now);
    subOsc.frequency.exponentialRampToValueAtTime(165, now + durationSec);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(280, now);
    filter.frequency.exponentialRampToValueAtTime(2800, now + durationSec);
    filter.Q.value = 2.4;

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(gainScale * 0.24, now + durationSec * 0.88);
    gain.gain.exponentialRampToValueAtTime(0.001, now + durationSec + 0.05);

    osc.connect(filter);
    subOsc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    subOsc.start(now);
    osc.stop(now + durationSec + 0.07);
    subOsc.stop(now + durationSec + 0.07);
  } catch {
    // ignore Web Audio failure
  }
}

/** Explosive burst + grand rarity-scaled triumph fanfare */
export function playCrateBurstSfx(rarity: LootRarity): void {
  const handle = getContext();
  if (!handle) return;
  const { ctx, gainScale } = handle;
  const now = ctx.currentTime;

  try {
    // 1. Massive sub-bass impact boom
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(185, now);
    sub.frequency.exponentialRampToValueAtTime(30, now + 0.44);

    subGain.gain.setValueAtTime(0.001, now);
    subGain.gain.linearRampToValueAtTime(gainScale * 1.55, now + 0.01);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);

    sub.connect(subGain);
    subGain.connect(ctx.destination);
    sub.start(now);
    sub.stop(now + 0.5);

    // 2. Pressurized air & metallic burst noise
    const noise = ctx.createBufferSource();
    noise.buffer = createNoiseBuffer(ctx, 0.36, 1.5);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(3200, now);
    bp.frequency.exponentialRampToValueAtTime(880, now + 0.34);
    bp.Q.value = 0.7;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(gainScale * 0.65, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
    noise.connect(bp);
    bp.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(now);

    // 3. Rarity-scaled grand chord & shimmering arpeggio
    const chords: Record<LootRarity, number[]> = {
      common: [523.25, 659.25, 783.99],
      rare: [587.33, 739.99, 880.0, 1174.66],
      epic: [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98],
      legendary: [
        440.0, 554.37, 659.25, 880.0, 1108.73, 1318.51, 1760.0, 2217.46,
      ],
    };

    const notes = chords[rarity];
    notes.forEach((freq, idx) => {
      const start = now + 0.035 + idx * (rarity === 'legendary' ? 0.042 : 0.05);
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();
      osc.type =
        rarity === 'legendary' || rarity === 'epic' ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, start);

      const dur =
        rarity === 'legendary' ? 0.92 : rarity === 'epic' ? 0.72 : 0.54;
      noteGain.gain.setValueAtTime(0.001, start);
      noteGain.gain.linearRampToValueAtTime(
        gainScale * (idx >= notes.length - 2 ? 0.42 : 0.28),
        start + 0.018,
      );
      noteGain.gain.exponentialRampToValueAtTime(0.001, start + dur);

      osc.connect(noteGain);
      noteGain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur + 0.04);
    });

    // 4. Extra warm brass/synth pad swell for Epic & Legendary
    if (rarity === 'epic' || rarity === 'legendary') {
      const padFreqs =
        rarity === 'legendary' ? [220, 277.18, 329.63] : [261.63, 329.63, 392.0];
      padFreqs.forEach((pf) => {
        const pad = ctx.createOscillator();
        const padFilter = ctx.createBiquadFilter();
        const padGain = ctx.createGain();
        pad.type = 'sawtooth';
        pad.frequency.setValueAtTime(pf, now + 0.04);
        padFilter.type = 'lowpass';
        padFilter.frequency.setValueAtTime(1400, now + 0.04);
        padFilter.frequency.exponentialRampToValueAtTime(420, now + 0.95);

        padGain.gain.setValueAtTime(0.001, now + 0.04);
        padGain.gain.linearRampToValueAtTime(gainScale * 0.16, now + 0.12);
        padGain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);

        pad.connect(padFilter);
        padFilter.connect(padGain);
        padGain.connect(ctx.destination);
        pad.start(now + 0.04);
        pad.stop(now + 1.04);
      });
    }
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

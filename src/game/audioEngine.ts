import { CarModelId } from '../types/game';
import { MusicTrack, SynthwavePlayer } from './synthwavePlayer';

export interface MusicPlayerState {
  playing: boolean;
  enabled: boolean;
  track: MusicTrack;
}

export interface AudioSettings {
  muted: boolean;
  sfxVolume: number; // 0..1
  musicVolume: number; // 0..1
}

const AUDIO_SETTINGS_KEY = 'viraj_audio_settings_v1';
const BASE_SFX_GAIN = 0.36;

interface EngineSoundProfile {
  osc1Type: OscillatorType;
  osc2Type: OscillatorType;
  idleHz: number;
  baseHz: number;
  rpmSpanHz: number;
  speedSpanHz: number;
  osc2Ratio: number;
  osc2Gain: number;
  filterBaseHz: number;
  filterRpmSpanHz: number;
  filterQ: number;
  gainBase: number;
}

const ENGINE_PROFILES: Record<CarModelId, EngineSoundProfile> = {
  dogan: {
    osc1Type: 'sawtooth',
    osc2Type: 'triangle',
    idleHz: 39,
    baseHz: 42,
    rpmSpanHz: 68,
    speedSpanHz: 18,
    osc2Ratio: 1.5,
    osc2Gain: 0.45,
    filterBaseHz: 175,
    filterRpmSpanHz: 360,
    filterQ: 3.1,
    gainBase: 0.17,
  },
  hatch: {
    osc1Type: 'sawtooth',
    osc2Type: 'triangle',
    idleHz: 46,
    baseHz: 52,
    rpmSpanHz: 94,
    speedSpanHz: 25,
    osc2Ratio: 1.98,
    osc2Gain: 0.48,
    filterBaseHz: 230,
    filterRpmSpanHz: 510,
    filterQ: 2.7,
    gainBase: 0.16,
  },
  gt: {
    osc1Type: 'sawtooth',
    osc2Type: 'triangle',
    idleHz: 44,
    baseHz: 50,
    rpmSpanHz: 98,
    speedSpanHz: 26,
    osc2Ratio: 2.0,
    osc2Gain: 0.55,
    filterBaseHz: 220,
    filterRpmSpanHz: 560,
    filterQ: 2.4,
    gainBase: 0.16,
  },
  rally: {
    osc1Type: 'square',
    osc2Type: 'sawtooth',
    idleHz: 42,
    baseHz: 46,
    rpmSpanHz: 88,
    speedSpanHz: 24,
    osc2Ratio: 1.33,
    osc2Gain: 0.6,
    filterBaseHz: 210,
    filterRpmSpanHz: 520,
    filterQ: 4.2,
    gainBase: 0.15,
  },
  pickup: {
    osc1Type: 'sawtooth',
    osc2Type: 'square',
    idleHz: 28,
    baseHz: 31,
    rpmSpanHz: 62,
    speedSpanHz: 18,
    osc2Ratio: 0.5,
    osc2Gain: 0.78,
    filterBaseHz: 135,
    filterRpmSpanHz: 340,
    filterQ: 3.4,
    gainBase: 0.19,
  },
  muscle: {
    osc1Type: 'sawtooth',
    osc2Type: 'square',
    idleHz: 32,
    baseHz: 34,
    rpmSpanHz: 72,
    speedSpanHz: 20,
    osc2Ratio: 0.5,
    osc2Gain: 0.72,
    filterBaseHz: 150,
    filterRpmSpanHz: 420,
    filterQ: 3.6,
    gainBase: 0.18,
  },
  m3gtr: {
    osc1Type: 'sawtooth',
    osc2Type: 'triangle',
    idleHz: 49,
    baseHz: 58,
    rpmSpanHz: 124,
    speedSpanHz: 32,
    osc2Ratio: 2.5,
    osc2Gain: 0.62,
    filterBaseHz: 270,
    filterRpmSpanHz: 780,
    filterQ: 4.1,
    gainBase: 0.16,
  },
  jdm: {
    osc1Type: 'sawtooth',
    osc2Type: 'triangle',
    idleHz: 48,
    baseHz: 56,
    rpmSpanHz: 112,
    speedSpanHz: 30,
    osc2Ratio: 2.0,
    osc2Gain: 0.58,
    filterBaseHz: 250,
    filterRpmSpanHz: 690,
    filterQ: 3.2,
    gainBase: 0.16,
  },
  porsche: {
    osc1Type: 'sawtooth',
    osc2Type: 'sawtooth',
    idleHz: 52,
    baseHz: 60,
    rpmSpanHz: 132,
    speedSpanHz: 34,
    osc2Ratio: 1.5,
    osc2Gain: 0.56,
    filterBaseHz: 280,
    filterRpmSpanHz: 820,
    filterQ: 2.9,
    gainBase: 0.16,
  },
  amggt: {
    osc1Type: 'sawtooth',
    osc2Type: 'square',
    idleHz: 36,
    baseHz: 42,
    rpmSpanHz: 102,
    speedSpanHz: 29,
    osc2Ratio: 0.75,
    osc2Gain: 0.68,
    filterBaseHz: 185,
    filterRpmSpanHz: 620,
    filterQ: 3.3,
    gainBase: 0.18,
  },
  hyper: {
    osc1Type: 'sawtooth',
    osc2Type: 'sine',
    idleHz: 54,
    baseHz: 62,
    rpmSpanHz: 122,
    speedSpanHz: 34,
    osc2Ratio: 2.5,
    osc2Gain: 0.52,
    filterBaseHz: 270,
    filterRpmSpanHz: 780,
    filterQ: 2.8,
    gainBase: 0.16,
  },
  laferrari: {
    osc1Type: 'sawtooth',
    osc2Type: 'sawtooth',
    idleHz: 64,
    baseHz: 74,
    rpmSpanHz: 162,
    speedSpanHz: 40,
    osc2Ratio: 2.01,
    osc2Gain: 0.64,
    filterBaseHz: 340,
    filterRpmSpanHz: 1040,
    filterQ: 3.1,
    gainBase: 0.16,
  },
  lambo: {
    osc1Type: 'sawtooth',
    osc2Type: 'sawtooth',
    idleHz: 60,
    baseHz: 68,
    rpmSpanHz: 148,
    speedSpanHz: 38,
    osc2Ratio: 2.02,
    osc2Gain: 0.62,
    filterBaseHz: 310,
    filterRpmSpanHz: 940,
    filterQ: 2.9,
    gainBase: 0.16,
  },
  mclarenp1: {
    osc1Type: 'sawtooth',
    osc2Type: 'sine',
    idleHz: 50,
    baseHz: 58,
    rpmSpanHz: 138,
    speedSpanHz: 38,
    osc2Ratio: 3.0,
    osc2Gain: 0.54,
    filterBaseHz: 290,
    filterRpmSpanHz: 920,
    filterQ: 3.4,
    gainBase: 0.16,
  },
  bugatti: {
    osc1Type: 'sawtooth',
    osc2Type: 'square',
    idleHz: 36,
    baseHz: 44,
    rpmSpanHz: 118,
    speedSpanHz: 36,
    osc2Ratio: 1.5,
    osc2Gain: 0.65,
    filterBaseHz: 200,
    filterRpmSpanHz: 760,
    filterQ: 2.6,
    gainBase: 0.17,
  },
  jesko: {
    osc1Type: 'sawtooth',
    osc2Type: 'sawtooth',
    idleHz: 58,
    baseHz: 66,
    rpmSpanHz: 168,
    speedSpanHz: 44,
    osc2Ratio: 1.99,
    osc2Gain: 0.66,
    filterBaseHz: 330,
    filterRpmSpanHz: 1120,
    filterQ: 3.0,
    gainBase: 0.16,
  },
  f1: {
    osc1Type: 'sawtooth',
    osc2Type: 'sawtooth',
    idleHz: 76,
    baseHz: 92,
    rpmSpanHz: 190,
    speedSpanHz: 48,
    osc2Ratio: 2.01,
    osc2Gain: 0.68,
    filterBaseHz: 420,
    filterRpmSpanHz: 1250,
    filterQ: 3.1,
    gainBase: 0.15,
  },
  pagani: {
    osc1Type: 'sawtooth',
    osc2Type: 'triangle',
    idleHz: 62,
    baseHz: 72,
    rpmSpanHz: 166,
    speedSpanHz: 44,
    osc2Ratio: 2.5,
    osc2Gain: 0.64,
    filterBaseHz: 330,
    filterRpmSpanHz: 1080,
    filterQ: 3.2,
    gainBase: 0.16,
  },
  bolide: {
    osc1Type: 'sawtooth',
    osc2Type: 'square',
    idleHz: 42,
    baseHz: 52,
    rpmSpanHz: 146,
    speedSpanHz: 42,
    osc2Ratio: 1.5,
    osc2Gain: 0.7,
    filterBaseHz: 240,
    filterRpmSpanHz: 960,
    filterQ: 3.0,
    gainBase: 0.17,
  },
  solaris: {
    osc1Type: 'sawtooth',
    osc2Type: 'sine',
    idleHz: 70,
    baseHz: 84,
    rpmSpanHz: 184,
    speedSpanHz: 50,
    osc2Ratio: 3.0,
    osc2Gain: 0.62,
    filterBaseHz: 380,
    filterRpmSpanHz: 1280,
    filterQ: 3.5,
    gainBase: 0.16,
  },
};

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineSubGain: GainNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private windNoise: AudioBufferSourceNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private windGain: GainNode | null = null;
  private driftFilter: BiquadFilterNode | null = null;
  private driftGain: GainNode | null = null;
  private rainFilter: BiquadFilterNode | null = null;
  private rainGain: GainNode | null = null;
  private sirenOsc: OscillatorNode | null = null;
  private sirenFilter: BiquadFilterNode | null = null;
  private sirenGain: GainNode | null = null;
  private explosionNoiseBuffer: AudioBuffer | null = null;
  private sirenPhase = 0;
  private rainWanted = false;
  private muted = false;
  private sfxVolume = 0.85;
  private musicVolume = 0.85;
  private initialized = false;
  private musicEnabled = true;
  private carModelId: CarModelId = 'dogan';
  public readonly music = new SynthwavePlayer();

  constructor() {
    this.loadPersistedAudioSettings();
    this.music.setVolume(this.musicVolume);
    this.music.setMuted(this.muted);
  }

  private loadPersistedAudioSettings(): void {
    try {
      const raw = window.localStorage.getItem(AUDIO_SETTINGS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<AudioSettings>;
      if (typeof parsed.sfxVolume === 'number' && Number.isFinite(parsed.sfxVolume)) {
        this.sfxVolume = Math.max(0, Math.min(1, parsed.sfxVolume));
      }
      if (typeof parsed.musicVolume === 'number' && Number.isFinite(parsed.musicVolume)) {
        this.musicVolume = Math.max(0, Math.min(1, parsed.musicVolume));
      }
      if (typeof parsed.muted === 'boolean') {
        this.muted = parsed.muted;
      }
    } catch {
      // ignore storage errors
    }
  }

  private savePersistedAudioSettings(): void {
    try {
      const payload: AudioSettings = {
        muted: this.muted,
        sfxVolume: this.sfxVolume,
        musicVolume: this.musicVolume,
      };
      window.localStorage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(payload));
    } catch {
      // ignore storage errors
    }
  }

  public init(): void {
    if (this.initialized) {
      if (this.ctx?.state === 'suspended') {
        void this.ctx.resume();
      }
      return;
    }

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    try {
      const ctx = new AudioCtx();
      this.ctx = ctx;

      const master = ctx.createGain();
      master.gain.value = this.muted ? 0 : 1.0;
      master.connect(ctx.destination);
      this.masterGain = master;

      const sfxGain = ctx.createGain();
      sfxGain.gain.value = BASE_SFX_GAIN * this.sfxVolume;
      sfxGain.connect(master);
      this.sfxGain = sfxGain;

      this.music.attach(ctx, master);
      this.music.setVolume(this.musicVolume);
      this.music.setMuted(this.muted);

      const profile = ENGINE_PROFILES[this.carModelId];
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = profile.filterBaseHz;
      filter.Q.value = profile.filterQ;

      const engineGain = ctx.createGain();
      engineGain.gain.value = 0.0;

      const osc1 = ctx.createOscillator();
      osc1.type = profile.osc1Type;
      osc1.frequency.value = profile.idleHz;

      const osc2 = ctx.createOscillator();
      osc2.type = profile.osc2Type;
      osc2.frequency.value = profile.idleHz * profile.osc2Ratio;

      const subGain = ctx.createGain();
      subGain.gain.value = profile.osc2Gain;

      osc1.connect(filter);
      osc2.connect(subGain);
      subGain.connect(filter);
      filter.connect(engineGain);
      engineGain.connect(sfxGain);

      osc1.start();
      osc2.start();

      this.engineOsc1 = osc1;
      this.engineOsc2 = osc2;
      this.engineSubGain = subGain;
      this.engineFilter = filter;
      this.engineGain = engineGain;

      // Police Siren Oscillator (wail/yelp modulated dynamically by proximity)
      const sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'triangle';
      sirenOsc.frequency.value = 680;
      const sirenFilter = ctx.createBiquadFilter();
      sirenFilter.type = 'bandpass';
      sirenFilter.frequency.value = 960;
      sirenFilter.Q.value = 1.6;
      const sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenFilter);
      sirenFilter.connect(sirenGain);
      sirenGain.connect(sfxGain);
      sirenOsc.start();
      this.sirenOsc = sirenOsc;
      this.sirenFilter = sirenFilter;
      this.sirenGain = sirenGain;

      // Wind & Tire Drift Noise Buffer
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.04 * white) / 1.04;
        lastOut = data[i];
      }

      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      noise.loop = true;

      const windFilter = ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.value = 420;
      windFilter.Q.value = 0.7;

      const windGain = ctx.createGain();
      windGain.gain.value = 0;

      noise.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(sfxGain);

      // High-Q narrow bandpass for tire drift squeal on hard curves
      const driftFilter = ctx.createBiquadFilter();
      driftFilter.type = 'bandpass';
      driftFilter.frequency.value = 1480;
      driftFilter.Q.value = 7.5;

      const driftGain = ctx.createGain();
      driftGain.gain.value = 0;

      noise.connect(driftFilter);
      driftFilter.connect(driftGain);
      driftGain.connect(sfxGain);

      // Ambient rain patter channel
      const rainFilter = ctx.createBiquadFilter();
      rainFilter.type = 'bandpass';
      rainFilter.frequency.value = 1750;
      rainFilter.Q.value = 0.6;

      const rainGain = ctx.createGain();
      rainGain.gain.value = this.rainWanted ? 0.055 : 0;

      noise.connect(rainFilter);
      rainFilter.connect(rainGain);
      rainGain.connect(sfxGain);

      noise.start();

      this.windNoise = noise;
      this.windFilter = windFilter;
      this.windGain = windGain;
      this.driftFilter = driftFilter;
      this.driftGain = driftGain;
      this.rainFilter = rainFilter;
      this.rainGain = rainGain;

      // Pre-compute reusable explosion noise buffer once (avoids 24k-sample allocation during gameplay)
      const expDur = 0.55;
      const expLen = Math.floor(ctx.sampleRate * expDur);
      const expBuf = ctx.createBuffer(1, expLen, ctx.sampleRate);
      const expData = expBuf.getChannelData(0);
      for (let i = 0; i < expLen; i++) {
        const env = Math.pow(1 - i / expLen, 1.8);
        expData[i] = (Math.random() * 2 - 1) * env;
      }
      this.explosionNoiseBuffer = expBuf;

      this.initialized = true;
    } catch {
      // Audio unavailable
    }
  }

  public setMuted(muted: boolean, persist = true): void {
    this.muted = muted;
    this.music.setMuted(muted);
    if (persist) {
      this.savePersistedAudioSettings();
    }
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        muted ? 0 : 1.0,
        this.ctx.currentTime,
        0.04,
      );
    }
  }

  public setSfxVolume(level: number): void {
    const clamped = Math.max(0, Math.min(1, level));
    this.sfxVolume = clamped;
    this.savePersistedAudioSettings();
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setTargetAtTime(
        BASE_SFX_GAIN * clamped,
        this.ctx.currentTime,
        0.03,
      );
    }
  }

  public setMusicVolume(level: number): void {
    const clamped = Math.max(0, Math.min(1, level));
    this.musicVolume = clamped;
    this.music.setVolume(clamped);
    this.savePersistedAudioSettings();
  }

  public getAudioSettings(): AudioSettings {
    return {
      muted: this.muted,
      sfxVolume: this.sfxVolume,
      musicVolume: this.musicVolume,
    };
  }

  public playVolumePreview(): void {
    this.init();
    if (!this.ctx || !this.sfxGain || this.muted || this.sfxVolume <= 0.01) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(760, now + 0.08);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.28, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.15);
    } catch {
      // ignore preview errors
    }
  }

  public setRainActive(active: boolean): void {
    this.rainWanted = active;
    if (this.rainGain && this.ctx) {
      this.rainGain.gain.setTargetAtTime(
        active ? 0.055 : 0,
        this.ctx.currentTime,
        0.2,
      );
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public startMusicIfEnabled(): void {
    this.init();
    if (this.musicEnabled) {
      this.music.start();
    }
  }

  public pauseMusic(): void {
    this.music.pause();
  }

  public toggleMusic(): MusicPlayerState {
    this.init();
    if (this.music.isPlaying()) {
      this.musicEnabled = false;
      this.music.pause();
    } else {
      this.musicEnabled = true;
      this.music.start();
    }
    return this.getMusicState();
  }

  public getMusicState(): MusicPlayerState {
    return {
      playing: this.music.isPlaying(),
      enabled: this.musicEnabled,
      track: this.music.getCurrentTrack(),
    };
  }

  public setCarProfile(modelId: CarModelId): void {
    this.carModelId = modelId;
    const profile = ENGINE_PROFILES[modelId];
    if (this.engineOsc1) this.engineOsc1.type = profile.osc1Type;
    if (this.engineOsc2) this.engineOsc2.type = profile.osc2Type;
    if (this.engineSubGain && this.ctx) {
      this.engineSubGain.gain.setTargetAtTime(
        profile.osc2Gain,
        this.ctx.currentTime,
        0.04,
      );
    }
    if (this.engineFilter && this.ctx) {
      this.engineFilter.Q.setTargetAtTime(
        profile.filterQ,
        this.ctx.currentTime,
        0.04,
      );
    }
  }

  public updateEngine(
    speedRatio: number,
    rpmRatio: number,
    active: boolean,
    nitroActive = false,
    driftIntensity = 0,
  ): void {
    if (!this.initialized || !this.ctx) return;
    const now = this.ctx.currentTime;
    const profile = ENGINE_PROFILES[this.carModelId];

    if (!active) {
      this.engineGain?.gain.setTargetAtTime(0, now, 0.08);
      this.windGain?.gain.setTargetAtTime(0, now, 0.08);
      this.driftGain?.gain.setTargetAtTime(0, now, 0.06);
      this.engineOsc1?.frequency.setTargetAtTime(profile.idleHz, now, 0.1);
      this.engineOsc2?.frequency.setTargetAtTime(
        profile.idleHz * profile.osc2Ratio,
        now,
        0.1,
      );
      return;
    }

    const nitroPitchBoost = nitroActive ? 1.24 : 1.0;
    const baseFreq =
      (profile.baseHz +
        rpmRatio * profile.rpmSpanHz +
        speedRatio * profile.speedSpanHz) *
      nitroPitchBoost;
    this.engineOsc1?.frequency.setTargetAtTime(baseFreq, now, 0.05);
    this.engineOsc2?.frequency.setTargetAtTime(
      baseFreq * profile.osc2Ratio,
      now,
      0.05,
    );
    this.engineFilter?.frequency.setTargetAtTime(
      (profile.filterBaseHz +
        rpmRatio * profile.filterRpmSpanHz +
        speedRatio * 260) *
        (nitroActive ? 1.45 : 1),
      now,
      0.06,
    );
    this.engineGain?.gain.setTargetAtTime(
      profile.gainBase + rpmRatio * 0.11 + (nitroActive ? 0.06 : 0),
      now,
      0.06,
    );

    this.windFilter?.frequency.setTargetAtTime(
      300 + speedRatio * 980 + (nitroActive ? 450 : 0),
      now,
      0.08,
    );
    this.windGain?.gain.setTargetAtTime(
      Math.max(0, speedRatio - 0.12) * 0.36 + (nitroActive ? 0.18 : 0),
      now,
      0.08,
    );

    this.driftFilter?.frequency.setTargetAtTime(
      1350 + driftIntensity * 380,
      now,
      0.06,
    );
    this.driftGain?.gain.setTargetAtTime(
      Math.min(0.18, driftIntensity * 0.2),
      now,
      0.07,
    );
  }

  public playNitroIgnite(): void {
    if (!this.initialized || !this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(540, now + 0.28);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.24, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
    osc.start(now);
    osc.stop(now + 0.36);
  }

  public playNearMiss(): void {
    if (!this.initialized || !this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(190, now + 0.22);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
    osc.start(now);
    osc.stop(now + 0.25);
  }

  public playScrape(): void {
    if (!this.initialized || !this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.linearRampToValueAtTime(95, now + 0.12);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playCrash(): void {
    if (!this.initialized || !this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(125, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + 0.45);

    gain.gain.setValueAtTime(0.55, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
    osc.start(now);
    osc.stop(now + 0.52);
  }

  public playCoinPickup(): void {
    if (!this.initialized || !this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(987.77, now); // B5
    osc.frequency.setValueAtTime(1318.51, now + 0.055); // E6

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
    osc.start(now);
    osc.stop(now + 0.24);
  }

  public playCarUnlock(): void {
    if (!this.initialized || !this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const t = now + i * 0.065;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.2, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  }

  public playNitroPickup(): void {
    if (!this.initialized || !this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(340, now);
    osc1.frequency.exponentialRampToValueAtTime(980, now + 0.24);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(680, now);
    osc2.frequency.exponentialRampToValueAtTime(1480, now + 0.24);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.32);
    osc2.stop(now + 0.32);
  }

  public playRepairPickup(): void {
    if (!this.initialized || !this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;
    const freqs = [440, 554.37, 659.25];
    freqs.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const t = now + idx * 0.045;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.2, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.24);
    });
  }

  public playMagnetPickup(): void {
    if (!this.initialized || !this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(860, now + 0.14);
    osc.frequency.exponentialRampToValueAtTime(620, now + 0.28);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.24, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.34);
  }

  public playRampagePickup(): void {
    if (!this.initialized || !this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;
    const notes = [220, 329.63, 440, 659.25, 880];
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const t = now + idx * 0.045;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = idx < 2 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.12, t + 0.16);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.24, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  }

  public playCarExplosion(): void {
    if (!this.initialized || !this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;

    // Deep sub-bass punch
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(115, now);
    sub.frequency.exponentialRampToValueAtTime(24, now + 0.42);
    subGain.gain.setValueAtTime(0.001, now);
    subGain.gain.linearRampToValueAtTime(0.62, now + 0.015);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
    sub.connect(subGain);
    subGain.connect(this.sfxGain);
    sub.onended = () => {
      sub.disconnect();
      subGain.disconnect();
    };
    sub.start(now);
    sub.stop(now + 0.5);

    // Explosive filtered broadband blast noise (using pre-computed buffer)
    const dur = 0.55;
    if (!this.explosionNoiseBuffer) return;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.explosionNoiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1850, now);
    filter.frequency.exponentialRampToValueAtTime(190, now + dur);

    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.55, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(this.sfxGain);
    noise.onended = () => {
      noise.disconnect();
      filter.disconnect();
      nGain.disconnect();
    };
    noise.start(now);
    noise.stop(now + dur);
  }

  public playCountdownBeep(step: 3 | 2 | 1): void {
    if (!this.initialized || !this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;
    const freq = step === 1 ? 880 : step === 2 ? 660 : 520;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.28, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  public playRampageEnd(): void {
    if (!this.initialized || !this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.36);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.frequency.exponentialRampToValueAtTime(240, now + 0.36);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  public playUpgrade(): void {
    if (!this.initialized || !this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;
    const notes = [392, 523.25, 659.25];
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const t = now + idx * 0.05;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.2, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.22);
    });
  }

  public playAchievementUnlock(): void {
    if (!this.initialized || !this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;
    const notes = [587.33, 739.99, 880, 1174.66];
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const t = now + idx * 0.055;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.18, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.28);
    });
  }

  public updatePoliceSiren(
    proximity: number,
    heatLevel: number,
    active: boolean,
    dt = 0.016,
  ): void {
    if (
      !this.initialized ||
      !this.ctx ||
      !this.sirenOsc ||
      !this.sirenGain ||
      !this.sirenFilter
    ) {
      return;
    }
    const now = this.ctx.currentTime;
    if (!active || this.muted || proximity <= 0.01) {
      this.sirenGain.gain.setTargetAtTime(0, now, 0.09);
      return;
    }
    // Yelp mode at Heat 3+, classic wail at Heat 1-2
    const cycleSpeed = heatLevel >= 3 ? 2.6 : 1.15;
    this.sirenPhase = (this.sirenPhase + dt * cycleSpeed) % 1;
    const wave = 0.5 - 0.5 * Math.cos(this.sirenPhase * Math.PI * 2);
    const freq = 640 + wave * 560;
    const targetGain = Math.min(0.14, 0.025 + proximity * 0.115);

    this.sirenOsc.frequency.setTargetAtTime(freq, now, 0.03);
    this.sirenFilter.frequency.setTargetAtTime(freq * 1.15, now, 0.04);
    this.sirenGain.gain.setTargetAtTime(targetGain, now, 0.08);
  }

  public playPoliceAlert(): void {
    if (!this.initialized || !this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;
    const freqs = [920, 690, 920];
    freqs.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const t = now + idx * 0.095;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.13, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.085);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.092);
    });
  }

  public playCheckpoint(): void {
    if (!this.initialized || !this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const t = now + idx * 0.055;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.2, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.26);
    });
  }

  public playBombBeep(urgent: boolean): void {
    if (!this.initialized || !this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(urgent ? 1240 : 880, now);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(urgent ? 0.14 : 0.1, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public dispose(): void {
    try {
      this.music.dispose();
      this.engineOsc1?.stop();
      this.engineOsc2?.stop();
      this.sirenOsc?.stop();
      this.windNoise?.stop();
      void this.ctx?.close();
    } catch {
      // Ignore cleanup errors
    }
    this.initialized = false;
  }
}

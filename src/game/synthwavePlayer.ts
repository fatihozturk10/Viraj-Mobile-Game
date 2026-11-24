export interface MusicTrack {
  id: string;
  title: string;
  subtitle: string;
  src: string;
}

export const GAME_MUSIC_TRACK: MusicTrack = {
  id: 'night-racing',
  title: 'Night Racing',
  subtitle: 'Oyun Müziği',
  src: '/assets/aistudio/Night_Racing__Instrumental__c5e9fd64.mp3',
};

const MAX_MUSIC_GAIN = 0.56;

export class SynthwavePlayer {
  private audio: HTMLAudioElement | null = null;
  private playing = false;
  private muted = false;
  private volumeLevel = 0.85; // 0..1 user slider setting
  private fadeTimer: number | null = null;

  public attach(_ctx: AudioContext, _destination: AudioNode): void {
    this.ensureAudio();
  }

  private ensureAudio(): HTMLAudioElement | null {
    if (typeof window === 'undefined' || typeof Audio === 'undefined') {
      return null;
    }
    if (!this.audio) {
      const el = new Audio(GAME_MUSIC_TRACK.src);
      el.loop = true;
      el.preload = 'auto';
      el.volume = 0;
      el.muted = this.muted;
      this.audio = el;
    }
    return this.audio;
  }

  private getTargetGain(): number {
    return Math.max(0, Math.min(1, this.volumeLevel)) * MAX_MUSIC_GAIN;
  }

  private clearFade(): void {
    if (this.fadeTimer !== null) {
      window.clearInterval(this.fadeTimer);
      this.fadeTimer = null;
    }
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.audio) {
      this.audio.muted = muted;
    }
  }

  public setVolume(level: number): void {
    const clamped = Math.max(0, Math.min(1, level));
    this.volumeLevel = clamped;
    this.clearFade();
    if (this.audio && this.playing) {
      this.audio.volume = this.getTargetGain();
    }
  }

  public getVolume(): number {
    return this.volumeLevel;
  }

  public start(): void {
    const el = this.ensureAudio();
    if (!el) return;
    if (this.playing && !el.paused) {
      el.volume = this.getTargetGain();
      return;
    }

    this.playing = true;
    el.muted = this.muted;
    this.clearFade();

    const playPromise = el.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        this.playing = false;
      });
    }

    const targetGain = this.getTargetGain();
    if (targetGain <= 0.001) {
      el.volume = 0;
      return;
    }

    // Smooth fade-in to current user target volume
    let currentVol = Math.min(el.volume, targetGain);
    this.fadeTimer = window.setInterval(() => {
      if (!this.audio || !this.playing) {
        this.clearFade();
        return;
      }
      const goal = this.getTargetGain();
      currentVol = Math.min(goal, currentVol + 0.045);
      this.audio.volume = currentVol;
      if (currentVol >= goal) {
        this.clearFade();
      }
    }, 35);
  }

  public pause(): void {
    if (!this.playing && (!this.audio || this.audio.paused)) return;
    this.playing = false;
    this.clearFade();

    const el = this.audio;
    if (!el) return;

    let currentVol = el.volume;
    if (currentVol <= 0.03) {
      el.volume = 0;
      el.pause();
      return;
    }

    this.fadeTimer = window.setInterval(() => {
      if (!this.audio || this.playing) {
        this.clearFade();
        return;
      }
      currentVol = Math.max(0, currentVol - 0.08);
      this.audio.volume = currentVol;
      if (currentVol <= 0) {
        this.audio.pause();
        this.clearFade();
      }
    }, 25);
  }

  public isPlaying(): boolean {
    return this.playing;
  }

  public getCurrentTrack(): MusicTrack {
    return GAME_MUSIC_TRACK;
  }

  public dispose(): void {
    this.playing = false;
    this.clearFade();
    if (this.audio) {
      this.audio.pause();
      this.audio.removeAttribute('src');
      this.audio.load();
      this.audio = null;
    }
  }
}

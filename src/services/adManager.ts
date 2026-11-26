import { CarModelId } from '../types/game';
import { getTodayDayKey } from './leaderboardService';

const ADS_STATE_KEY = 'viraj_ads_state_v1';

// Interstitial policy constants:
// - Never show during the first 3 completed runs
// - Show at most once every 3 runs after an interstitial
// - Enforce minimum 75s cooldown between interstitials (inside 60-90s window)
export const INTERSTITIAL_INITIAL_FREE_RUNS = 3;
export const INTERSTITIAL_RUN_INTERVAL = 3;
export const INTERSTITIAL_COOLDOWN_MS = 75_000;
export const AD_FREE_PRICE_LABEL = '9,99 ₺';

export interface WheelSlice {
  id: string;
  label: string;
  shortLabel: string;
  kind: 'gold' | 'xp' | 'crate';
  amount: number;
  crateTierId?: 'street' | 'pro' | 'legendary';
  weight: number;
  color: string;
}

export const DAILY_WHEEL_SLICES: WheelSlice[] = [
  {
    id: 'gold_30',
    label: '+30 Altın',
    shortLabel: '30 Altın',
    kind: 'gold',
    amount: 30,
    weight: 24,
    color: '#d97706',
  },
  {
    id: 'xp_450',
    label: '+450 Puan XP',
    shortLabel: '450 XP',
    kind: 'xp',
    amount: 450,
    weight: 20,
    color: '#0284c7',
  },
  {
    id: 'gold_60',
    label: '+60 Altın',
    shortLabel: '60 Altın',
    kind: 'gold',
    amount: 60,
    weight: 18,
    color: '#059669',
  },
  {
    id: 'crate_street',
    label: '1× Sokak Kasası',
    shortLabel: 'Sokak Kasası',
    kind: 'crate',
    amount: 1,
    crateTierId: 'street',
    weight: 8,
    color: '#ea580c',
  },
  {
    id: 'gold_90',
    label: '+90 Altın',
    shortLabel: '90 Altın',
    kind: 'gold',
    amount: 90,
    weight: 13,
    color: '#7c3aed',
  },
  {
    id: 'xp_900',
    label: '+900 Puan XP',
    shortLabel: '900 XP',
    kind: 'xp',
    amount: 900,
    weight: 11,
    color: '#2563eb',
  },
  {
    id: 'gold_180',
    label: '+180 Altın Sandık',
    shortLabel: '180 Altın',
    kind: 'gold',
    amount: 180,
    weight: 6,
    color: '#e11d48',
  },
];

export const DAILY_STREAK_REWARDS = [60, 90, 120, 160, 220, 300, 500] as const;

export type RewardedAdPlacement =
  | { kind: 'double_run_gold'; amount: number }
  | { kind: 'crash_revive' }
  | { kind: 'daily_wheel_extra' }
  | { kind: 'daily_streak_double'; day: number; amount: number }
  | { kind: 'rent_car'; carId: CarModelId; carName: string }
  | {
      kind: 'upgrade_topup';
      amount: number;
      targetLabel: string;
    };

export interface AdStateSnapshot {
  totalRunsCompleted: number;
  runsSinceInterstitial: number;
  lastInterstitialAt: number;
  adFreePurchased: boolean;
  lastFreeWheelDate: string;
  lastExtraWheelDate: string;
  streakCount: number;
  lastStreakClaimDate: string;
}

const DEFAULT_AD_STATE: AdStateSnapshot = {
  totalRunsCompleted: 0,
  runsSinceInterstitial: 0,
  lastInterstitialAt: 0,
  adFreePurchased: false,
  lastFreeWheelDate: '',
  lastExtraWheelDate: '',
  streakCount: 0,
  lastStreakClaimDate: '',
};

function getYesterdayDayKey(): string {
  const yesterday = new Date(Date.now() - 86_400_000);
  try {
    const formatted = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Istanbul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(yesterday);
    if (/^\d{4}-\d{2}-\d{2}$/.test(formatted)) {
      return formatted;
    }
  } catch {
    // fallback below
  }
  const y = yesterday.getFullYear();
  const m = String(yesterday.getMonth() + 1).padStart(2, '0');
  const d = String(yesterday.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

class AdManagerService {
  private state: AdStateSnapshot;

  constructor() {
    this.state = this.load();
  }

  private load(): AdStateSnapshot {
    try {
      const raw = localStorage.getItem(ADS_STATE_KEY);
      if (!raw) return { ...DEFAULT_AD_STATE };
      const parsed = JSON.parse(raw) as Partial<AdStateSnapshot>;
      return {
        totalRunsCompleted: Math.max(0, Number(parsed.totalRunsCompleted) || 0),
        runsSinceInterstitial: Math.max(
          0,
          Number(parsed.runsSinceInterstitial) || 0,
        ),
        lastInterstitialAt: Math.max(
          0,
          Number(parsed.lastInterstitialAt) || 0,
        ),
        adFreePurchased: Boolean(parsed.adFreePurchased),
        lastFreeWheelDate:
          typeof parsed.lastFreeWheelDate === 'string'
            ? parsed.lastFreeWheelDate
            : '',
        lastExtraWheelDate:
          typeof parsed.lastExtraWheelDate === 'string'
            ? parsed.lastExtraWheelDate
            : '',
        streakCount: Math.max(0, Math.min(7, Number(parsed.streakCount) || 0)),
        lastStreakClaimDate:
          typeof parsed.lastStreakClaimDate === 'string'
            ? parsed.lastStreakClaimDate
            : '',
      };
    } catch {
      return { ...DEFAULT_AD_STATE };
    }
  }

  private save(): void {
    try {
      localStorage.setItem(ADS_STATE_KEY, JSON.stringify(this.state));
    } catch {
      // ignore storage failure
    }
  }

  public getSnapshot(): AdStateSnapshot {
    return { ...this.state };
  }

  public isAdFree(): boolean {
    return this.state.adFreePurchased;
  }

  public purchaseAdFree(): AdStateSnapshot {
    this.state.adFreePurchased = true;
    this.save();
    return this.getSnapshot();
  }

  public recordRunCompleted(): AdStateSnapshot {
    this.state.totalRunsCompleted += 1;
    this.state.runsSinceInterstitial += 1;
    this.save();
    return this.getSnapshot();
  }

  public shouldShowInterstitial(nowMs = Date.now()): boolean {
    if (this.state.adFreePurchased) return false;
    // Never show on first 3 runs
    if (this.state.totalRunsCompleted <= INTERSTITIAL_INITIAL_FREE_RUNS) {
      return false;
    }
    // Show at most every 3 runs
    if (this.state.runsSinceInterstitial < INTERSTITIAL_RUN_INTERVAL) {
      return false;
    }
    // Enforce minimum 75s cooldown between full-screen ads
    if (
      this.state.lastInterstitialAt > 0 &&
      nowMs - this.state.lastInterstitialAt < INTERSTITIAL_COOLDOWN_MS
    ) {
      return false;
    }
    return true;
  }

  public markInterstitialShown(nowMs = Date.now()): AdStateSnapshot {
    this.state.runsSinceInterstitial = 0;
    this.state.lastInterstitialAt = nowMs;
    this.save();
    return this.getSnapshot();
  }

  public isFreeWheelAvailableToday(): boolean {
    return this.state.lastFreeWheelDate !== getTodayDayKey();
  }

  public isExtraWheelAdAvailableToday(): boolean {
    return this.state.lastExtraWheelDate !== getTodayDayKey();
  }

  public consumeFreeWheelSpin(): AdStateSnapshot {
    this.state.lastFreeWheelDate = getTodayDayKey();
    this.save();
    return this.getSnapshot();
  }

  public consumeExtraWheelSpin(): AdStateSnapshot {
    this.state.lastExtraWheelDate = getTodayDayKey();
    this.save();
    return this.getSnapshot();
  }

  public isStreakAvailableToday(): boolean {
    return this.state.lastStreakClaimDate !== getTodayDayKey();
  }

  public getStreakStatus(): {
    availableToday: boolean;
    activeStreakCount: number; // 0..7 completed days in current cycle
    nextDay: number; // 1..7 claimable day
    nextRewardGold: number;
  } {
    const today = getTodayDayKey();
    const yesterday = getYesterdayDayKey();
    const last = this.state.lastStreakClaimDate;

    if (last === today) {
      const done = Math.max(1, Math.min(7, this.state.streakCount || 1));
      const next = (done % 7) + 1;
      return {
        availableToday: false,
        activeStreakCount: done,
        nextDay: next,
        nextRewardGold: DAILY_STREAK_REWARDS[next - 1],
      };
    }

    if (last === yesterday && this.state.streakCount > 0) {
      const prev = Math.min(7, this.state.streakCount);
      const next = prev >= 7 ? 1 : prev + 1;
      const activeCount = prev >= 7 ? 0 : prev;
      return {
        availableToday: true,
        activeStreakCount: activeCount,
        nextDay: next,
        nextRewardGold: DAILY_STREAK_REWARDS[next - 1],
      };
    }

    return {
      availableToday: true,
      activeStreakCount: 0,
      nextDay: 1,
      nextRewardGold: DAILY_STREAK_REWARDS[0],
    };
  }

  public claimDailyStreak(multiplier: 1 | 2 = 1): {
    day: number;
    amount: number;
    snapshot: AdStateSnapshot;
  } {
    const status = this.getStreakStatus();
    if (!status.availableToday) {
      return {
        day: status.activeStreakCount,
        amount: 0,
        snapshot: this.getSnapshot(),
      };
    }
    const amount = status.nextRewardGold * multiplier;
    this.state.streakCount = status.nextDay;
    this.state.lastStreakClaimDate = getTodayDayKey();
    this.save();
    return {
      day: status.nextDay,
      amount,
      snapshot: this.getSnapshot(),
    };
  }

  public pickRandomWheelSlice(): number {
    const totalWeight = DAILY_WHEEL_SLICES.reduce((sum, s) => sum + s.weight, 0);
    let roll = Math.random() * totalWeight;
    for (let i = 0; i < DAILY_WHEEL_SLICES.length; i++) {
      roll -= DAILY_WHEEL_SLICES[i].weight;
      if (roll <= 0) return i;
    }
    return 0;
  }
}

export const adManager = new AdManagerService();

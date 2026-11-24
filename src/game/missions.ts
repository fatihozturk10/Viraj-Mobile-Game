import {
  AchievementCategory,
  AchievementView,
  ActiveMissionView,
  MissionsSnapshot,
} from '../types/game';

export type MetricType =
  | 'distance'
  | 'nearMiss'
  | 'cleanCurve'
  | 'gold'
  | 'nitroPickup'
  | 'repairPickup'
  | 'magnetPickup'
  | 'maxSpeedKmh'
  | 'maxCombo'
  | 'driftPoints'
  | 'rampJump'
  | 'boostPad'
  | 'roadworkPass'
  | 'runScore'
  | 'carsUnlocked'
  | 'upgradesBought'
  | 'playerLevel';

interface MissionTemplate {
  key: string;
  metric: MetricType;
  mode: 'dailyCumulative' | 'dailyPeak';
  titleForTarget: (target: number) => string;
  baseTarget: number;
  stepTarget: number;
  baseReward: number;
  stepReward: number;
}

interface ActiveMissionState {
  id: string;
  templateKey: string;
  metric: MetricType;
  mode?: 'dailyCumulative' | 'dailyPeak';
  tier: number;
  title: string;
  target: number;
  progress: number;
  rewardGold: number;
  completed?: boolean;
  claimed?: boolean;
}

interface AchievementTemplate {
  id: string;
  category: AchievementCategory;
  metric: MetricType;
  mode: 'cumulative' | 'peak' | 'singleRun';
  title: string;
  description: string;
  target: number;
  rewardGold: number;
}

interface PersistedMissionsData {
  dailyDateKey?: string;
  activeMissions: ActiveMissionState[];
  completedMissionsTotal: number;
  achievementProgress: Record<string, number>;
  unlockedAchievements: string[];
  claimedAchievements?: string[];
}

export interface RewardEvent {
  kind: 'mission' | 'achievement';
  title: string;
  rewardGold: number;
}

export interface ClaimResult {
  ok: boolean;
  rewardGold: number;
  title?: string;
  count: number;
}

const STORAGE_KEY = 'viraj_missions_achievements_v1';

const DAILY_MISSION_TEMPLATES: MissionTemplate[] = [
  {
    key: 'daily_near_miss',
    metric: 'nearMiss',
    mode: 'dailyCumulative',
    titleForTarget: (t) => `Bugün ${t} Makas at`,
    baseTarget: 8,
    stepTarget: 4,
    baseReward: 45,
    stepReward: 15,
  },
  {
    key: 'daily_distance',
    metric: 'distance',
    mode: 'dailyCumulative',
    titleForTarget: (t) => `Bugün ${t.toLocaleString('tr-TR')} m yol kat et`,
    baseTarget: 2500,
    stepTarget: 1500,
    baseReward: 50,
    stepReward: 20,
  },
  {
    key: 'daily_gold',
    metric: 'gold',
    mode: 'dailyCumulative',
    titleForTarget: (t) => `Yoldan ${t} Altın topla`,
    baseTarget: 15,
    stepTarget: 10,
    baseReward: 40,
    stepReward: 15,
  },
  {
    key: 'daily_clean_curve',
    metric: 'cleanCurve',
    mode: 'dailyCumulative',
    titleForTarget: (t) => `Bugün ${t} Temiz Viraj dön`,
    baseTarget: 6,
    stepTarget: 4,
    baseReward: 45,
    stepReward: 15,
  },
  {
    key: 'daily_nitro_pickup',
    metric: 'nitroPickup',
    mode: 'dailyCumulative',
    titleForTarget: (t) => `Yoldan ${t} Nitro tüpü al`,
    baseTarget: 4,
    stepTarget: 2,
    baseReward: 50,
    stepReward: 15,
  },
  {
    key: 'daily_speed',
    metric: 'maxSpeedKmh',
    mode: 'dailyPeak',
    titleForTarget: (t) => `Bugün ${t} km/h hıza ulaş`,
    baseTarget: 220,
    stepTarget: 30,
    baseReward: 45,
    stepReward: 20,
  },
  {
    key: 'daily_drift',
    metric: 'driftPoints',
    mode: 'dailyCumulative',
    titleForTarget: (t) => `Bugün ${t.toLocaleString('tr-TR')} Drift puanı kazan`,
    baseTarget: 1200,
    stepTarget: 800,
    baseReward: 55,
    stepReward: 20,
  },
  {
    key: 'daily_ramp_jump',
    metric: 'rampJump',
    mode: 'dailyCumulative',
    titleForTarget: (t) => `Rampalardan ${t} kez zıpla`,
    baseTarget: 2,
    stepTarget: 1,
    baseReward: 50,
    stepReward: 15,
  },
  {
    key: 'daily_boost_pad',
    metric: 'boostPad',
    mode: 'dailyCumulative',
    titleForTarget: (t) => `${t} kez Turbo Şeridinden geç`,
    baseTarget: 3,
    stepTarget: 2,
    baseReward: 45,
    stepReward: 15,
  },
  {
    key: 'daily_repair_pickup',
    metric: 'repairPickup',
    mode: 'dailyCumulative',
    titleForTarget: (t) => `Yoldan ${t} Tamir Kiti topla`,
    baseTarget: 2,
    stepTarget: 1,
    baseReward: 50,
    stepReward: 15,
  },
];

export function getLocalDateKey(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function hashDateSeed(dateKey: string): number {
  let h = 2166136261;
  for (let i = 0; i < dateKey.length; i++) {
    h ^= dateKey.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function nextSeededRand(state: { s: number }): number {
  state.s = (Math.imul(state.s, 1664525) + 1013904223) >>> 0;
  return state.s / 4294967296;
}

const ACHIEVEMENT_CATALOG: AchievementTemplate[] = [
  // ── 1. HIZ & MESAFE (8) ────────────────────────────────────────────────
  {
    id: 'ach_speed_250',
    category: 'speed',
    metric: 'maxSpeedKmh',
    mode: 'peak',
    title: 'Ses Duvarı',
    description: '250 km/h hıza ulaş',
    target: 250,
    rewardGold: 40,
  },
  {
    id: 'ach_speed_300',
    category: 'speed',
    metric: 'maxSpeedKmh',
    mode: 'peak',
    title: 'Üç Yüz Kulübü',
    description: '300 km/h hıza ulaş',
    target: 300,
    rewardGold: 75,
  },
  {
    id: 'ach_speed_360',
    category: 'speed',
    metric: 'maxSpeedKmh',
    mode: 'peak',
    title: 'Hiper Hız',
    description: '360 km/h hıza ulaş',
    target: 360,
    rewardGold: 130,
  },
  {
    id: 'ach_speed_420',
    category: 'speed',
    metric: 'maxSpeedKmh',
    mode: 'peak',
    title: 'Işık Hızı',
    description: '420 km/h hıza ulaş',
    target: 420,
    rewardGold: 220,
  },
  {
    id: 'ach_dist_3500',
    category: 'speed',
    metric: 'distance',
    mode: 'singleRun',
    title: 'Uzun Yol Kaptanı',
    description: 'Tek sürüşte 3.500 m yol kat et',
    target: 3500,
    rewardGold: 50,
  },
  {
    id: 'ach_dist_run_8000',
    category: 'speed',
    metric: 'distance',
    mode: 'singleRun',
    title: 'Otoyol Maratonu',
    description: 'Tek sürüşte 8.000 m yol kat et',
    target: 8000,
    rewardGold: 110,
  },
  {
    id: 'ach_dist_total_25k',
    category: 'speed',
    metric: 'distance',
    mode: 'cumulative',
    title: 'Yolun Efendisi',
    description: 'Toplam 25.000 m sürüş yap',
    target: 25000,
    rewardGold: 95,
  },
  {
    id: 'ach_dist_total_100k',
    category: 'speed',
    metric: 'distance',
    mode: 'cumulative',
    title: 'Dünya Turu',
    description: 'Toplam 100.000 m sürüş yap',
    target: 100000,
    rewardGold: 240,
  },

  // ── 2. MAKAS, KOMBO & SKOR (8) ─────────────────────────────────────────
  {
    id: 'ach_makas_10',
    category: 'skill',
    metric: 'nearMiss',
    mode: 'cumulative',
    title: 'İlk Kıvılcım',
    description: 'Toplam 15 yakın geçiş (Makas) yap',
    target: 15,
    rewardGold: 25,
  },
  {
    id: 'ach_makas_75',
    category: 'skill',
    metric: 'nearMiss',
    mode: 'cumulative',
    title: 'Trafik Büyücüsü',
    description: 'Toplam 75 yakın geçiş (Makas) yap',
    target: 75,
    rewardGold: 65,
  },
  {
    id: 'ach_makas_250',
    category: 'skill',
    metric: 'nearMiss',
    mode: 'cumulative',
    title: 'Hayalet Sürücü',
    description: 'Toplam 250 yakın geçiş (Makas) yap',
    target: 250,
    rewardGold: 165,
  },
  {
    id: 'ach_makas_run_20',
    category: 'skill',
    metric: 'nearMiss',
    mode: 'singleRun',
    title: 'Kıl Payı Şov',
    description: 'Tek sürüşte 20 yakın geçiş yap',
    target: 20,
    rewardGold: 75,
  },
  {
    id: 'ach_combo_5',
    category: 'skill',
    metric: 'maxCombo',
    mode: 'peak',
    title: 'Kombo Kralı',
    description: '×5 Kombo çarpanına ulaş',
    target: 5,
    rewardGold: 30,
  },
  {
    id: 'ach_score_25k',
    category: 'skill',
    metric: 'runScore',
    mode: 'peak',
    title: 'Skor Avcısı',
    description: 'Tek sürüşte 25.000 puana ulaş',
    target: 25000,
    rewardGold: 60,
  },
  {
    id: 'ach_score_75k',
    category: 'skill',
    metric: 'runScore',
    mode: 'peak',
    title: 'Otoyol Efsanesi',
    description: 'Tek sürüşte 75.000 puana ulaş',
    target: 75000,
    rewardGold: 145,
  },
  {
    id: 'ach_score_200k',
    category: 'skill',
    metric: 'runScore',
    mode: 'peak',
    title: 'Kırılmaz Rekor',
    description: 'Tek sürüşte 200.000 puana ulaş',
    target: 200000,
    rewardGold: 280,
  },

  // ── 3. DRİFT & VİRAJ (8) ───────────────────────────────────────────────
  {
    id: 'ach_curve_20',
    category: 'drift',
    metric: 'cleanCurve',
    mode: 'cumulative',
    title: 'Viraj Ustası',
    description: 'Toplam 20 temiz viraj tamamla',
    target: 20,
    rewardGold: 30,
  },
  {
    id: 'ach_curve_80',
    category: 'drift',
    metric: 'cleanCurve',
    mode: 'cumulative',
    title: 'Apex Avcısı',
    description: 'Toplam 80 temiz viraj tamamla',
    target: 80,
    rewardGold: 85,
  },
  {
    id: 'ach_curve_200',
    category: 'drift',
    metric: 'cleanCurve',
    mode: 'cumulative',
    title: 'Çizgi Mühendisi',
    description: 'Toplam 200 temiz viraj tamamla',
    target: 200,
    rewardGold: 185,
  },
  {
    id: 'ach_drift_2500',
    category: 'drift',
    metric: 'driftPoints',
    mode: 'cumulative',
    title: 'Lastik Dumanı',
    description: 'Toplam 2.500 drift puanı kazan',
    target: 2500,
    rewardGold: 40,
  },
  {
    id: 'ach_drift_15000',
    category: 'drift',
    metric: 'driftPoints',
    mode: 'cumulative',
    title: 'Yanlama Sanatçısı',
    description: 'Toplam 15.000 drift puanı kazan',
    target: 15000,
    rewardGold: 100,
  },
  {
    id: 'ach_drift_50000',
    category: 'drift',
    metric: 'driftPoints',
    mode: 'cumulative',
    title: 'Drift İmparatoru',
    description: 'Toplam 50.000 drift puanı kazan',
    target: 50000,
    rewardGold: 220,
  },
  {
    id: 'ach_drift_run_4000',
    category: 'drift',
    metric: 'driftPoints',
    mode: 'singleRun',
    title: 'Asfaltı Eriten',
    description: 'Tek sürüşte 4.000 drift puanı topla',
    target: 4000,
    rewardGold: 85,
  },
  {
    id: 'ach_drift_run_12000',
    category: 'drift',
    metric: 'driftPoints',
    mode: 'singleRun',
    title: 'Duman Perdesi',
    description: 'Tek sürüşte 12.000 drift puanı topla',
    target: 12000,
    rewardGold: 175,
  },

  // ── 4. YOL OLAYLARI & GÜÇLENDİRMELER (8) ───────────────────────────────
  {
    id: 'ach_nitro_5',
    category: 'events',
    metric: 'nitroPickup',
    mode: 'cumulative',
    title: 'Turbo Şarj',
    description: 'Yoldan 5 Nitro tüpü topla',
    target: 5,
    rewardGold: 30,
  },
  {
    id: 'ach_nitro_30',
    category: 'events',
    metric: 'nitroPickup',
    mode: 'cumulative',
    title: 'Mavi Alev',
    description: 'Yoldan toplam 30 Nitro tüpü topla',
    target: 30,
    rewardGold: 85,
  },
  {
    id: 'ach_repair_3',
    category: 'events',
    metric: 'repairPickup',
    mode: 'cumulative',
    title: 'Tamirci Dostu',
    description: 'Yoldan 3 Tamir Kiti topla',
    target: 3,
    rewardGold: 25,
  },
  {
    id: 'ach_repair_15',
    category: 'events',
    metric: 'repairPickup',
    mode: 'cumulative',
    title: 'Çelik Gövde',
    description: 'Yoldan toplam 15 Tamir Kiti topla',
    target: 15,
    rewardGold: 75,
  },
  {
    id: 'ach_magnet_10',
    category: 'events',
    metric: 'magnetPickup',
    mode: 'cumulative',
    title: 'Altın Mıknatısı',
    description: 'Yoldan toplam 10 Mıknatıs güçlendirmesi al',
    target: 10,
    rewardGold: 60,
  },
  {
    id: 'ach_ramp_10',
    category: 'events',
    metric: 'rampJump',
    mode: 'cumulative',
    title: 'Gökyüzü Pilotu',
    description: 'Rampalardan toplam 10 kez zıpla',
    target: 10,
    rewardGold: 65,
  },
  {
    id: 'ach_boostpad_15',
    category: 'events',
    metric: 'boostPad',
    mode: 'cumulative',
    title: 'Turbo Şeritçisi',
    description: '15 kez Turbo Şeridinden geç',
    target: 15,
    rewardGold: 70,
  },
  {
    id: 'ach_roadwork_15',
    category: 'events',
    metric: 'roadworkPass',
    mode: 'cumulative',
    title: 'Engel Cambazı',
    description: '15 yol çalışması engelini hasarsız geç',
    target: 15,
    rewardGold: 80,
  },

  // ── 5. GARAJ, KOLEKSİYON & KARİYER (8) ─────────────────────────────────
  {
    id: 'ach_gold_60',
    category: 'garage',
    metric: 'gold',
    mode: 'cumulative',
    title: 'Altın Avcısı',
    description: 'Yoldan toplam 60 altın topla',
    target: 60,
    rewardGold: 35,
  },
  {
    id: 'ach_gold_400',
    category: 'garage',
    metric: 'gold',
    mode: 'cumulative',
    title: 'Hazine Toplayıcı',
    description: 'Yoldan toplam 400 altın topla',
    target: 400,
    rewardGold: 115,
  },
  {
    id: 'ach_cars_4',
    category: 'garage',
    metric: 'carsUnlocked',
    mode: 'peak',
    title: 'Garaj Koleksiyoneri',
    description: 'Garajda 4 farklı aracın kilidini aç',
    target: 4,
    rewardGold: 80,
  },
  {
    id: 'ach_cars_10',
    category: 'garage',
    metric: 'carsUnlocked',
    mode: 'peak',
    title: 'Süper Filo',
    description: 'Garajda 10 farklı aracın kilidini aç',
    target: 10,
    rewardGold: 200,
  },
  {
    id: 'ach_cars_17',
    category: 'garage',
    metric: 'carsUnlocked',
    mode: 'peak',
    title: 'Tam Koleksiyon',
    description: 'Garajdaki 17 aracın tamamını aç',
    target: 17,
    rewardGold: 500,
  },
  {
    id: 'ach_upgrades_10',
    category: 'garage',
    metric: 'upgradesBought',
    mode: 'cumulative',
    title: 'Modifiye Ustası',
    description: 'Toplam 10 araç yükseltmesi satın al',
    target: 10,
    rewardGold: 85,
  },
  {
    id: 'ach_level_10',
    category: 'garage',
    metric: 'playerLevel',
    mode: 'peak',
    title: 'Pro Sürücü',
    description: "Sürücü Seviyesi 10'a ulaş",
    target: 10,
    rewardGold: 90,
  },
  {
    id: 'ach_level_50',
    category: 'garage',
    metric: 'playerLevel',
    mode: 'peak',
    title: 'Altın Efsane',
    description: "Sürücü Seviyesi 50'ye ulaş",
    target: 50,
    rewardGold: 320,
  },
];

function createDailyMissionFromTemplate(
  tpl: MissionTemplate,
  tier: number,
  dateKey: string,
  slotIdx: number,
): ActiveMissionState {
  const target = tpl.baseTarget + tier * tpl.stepTarget;
  const rewardGold = tpl.baseReward + tier * tpl.stepReward;
  return {
    id: `daily_${dateKey}_${slotIdx}_${tpl.key}`,
    templateKey: tpl.key,
    metric: tpl.metric,
    mode: tpl.mode,
    tier,
    title: tpl.titleForTarget(target),
    target,
    progress: 0,
    rewardGold,
    completed: false,
    claimed: false,
  };
}

export class MissionManager {
  private dailyDateKey = '';
  private activeMissions: ActiveMissionState[] = [];
  private completedMissionsTotal = 0;
  private achievementProgress: Record<string, number> = {};
  private unlockedAchievements: Set<string> = new Set();
  private claimedAchievements: Set<string> = new Set();
  private saveDirty = false;
  private lastSaveMs = 0;
  private lastDateCheckMs = 0;

  constructor() {
    this.load();
    this.ensureDailyMissions(true);
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<PersistedMissionsData>;
      if (typeof parsed.dailyDateKey === 'string') {
        this.dailyDateKey = parsed.dailyDateKey;
      }
      if (Array.isArray(parsed.activeMissions)) {
        this.activeMissions = parsed.activeMissions
          .filter(
            (m) =>
              m &&
              typeof m.id === 'string' &&
              typeof m.target === 'number' &&
              typeof m.progress === 'number',
          )
          .map((m) => ({
            ...m,
            completed: Boolean(m.completed || m.progress >= m.target),
            claimed: Boolean(m.claimed),
          }));
      }
      if (typeof parsed.completedMissionsTotal === 'number') {
        this.completedMissionsTotal = Math.max(
          0,
          parsed.completedMissionsTotal,
        );
      }
      if (
        parsed.achievementProgress &&
        typeof parsed.achievementProgress === 'object'
      ) {
        this.achievementProgress = { ...parsed.achievementProgress };
      }
      if (Array.isArray(parsed.unlockedAchievements)) {
        this.unlockedAchievements = new Set(parsed.unlockedAchievements);
      }
      if (Array.isArray(parsed.claimedAchievements)) {
        this.claimedAchievements = new Set(parsed.claimedAchievements);
      } else {
        // Legacy save migration: previously unlocked achievements were auto-paid.
        this.claimedAchievements = new Set(this.unlockedAchievements);
      }
    } catch {
      // Ignore storage read failures
    }
  }

  private save(): void {
    this.saveDirty = false;
    this.lastSaveMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    try {
      const data: PersistedMissionsData = {
        dailyDateKey: this.dailyDateKey,
        activeMissions: this.activeMissions,
        completedMissionsTotal: this.completedMissionsTotal,
        achievementProgress: this.achievementProgress,
        unlockedAchievements: Array.from(this.unlockedAchievements),
        claimedAchievements: Array.from(this.claimedAchievements),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Ignore storage write failures
    }
  }

  private markDirtyOrSave(immediate: boolean): void {
    this.saveDirty = true;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (immediate || now - this.lastSaveMs >= 5000) {
      this.save();
    }
  }

  private ensureDailyMissions(force = false): boolean {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (
      !force &&
      this.dailyDateKey !== '' &&
      this.activeMissions.length === 3 &&
      now - this.lastDateCheckMs < 30000
    ) {
      return false;
    }
    this.lastDateCheckMs = now;
    const todayKey = getLocalDateKey();
    if (
      this.dailyDateKey === todayKey &&
      this.activeMissions.length === 3
    ) {
      return false;
    }

    // New day (or migration from old infinite active missions): generate 3 fresh daily missions
    this.dailyDateKey = todayKey;
    const pool = [...DAILY_MISSION_TEMPLATES];
    const rng = { s: hashDateSeed(todayKey) || 1337 };
    const picked: ActiveMissionState[] = [];
    const baseTier = Math.min(2, Math.floor(this.completedMissionsTotal / 12));

    for (let slot = 0; slot < 3 && pool.length > 0; slot++) {
      const idx = Math.floor(nextSeededRand(rng) * pool.length);
      const tpl = pool.splice(idx, 1)[0];
      // Escalate difficulty slightly across the 3 daily slots (easy / medium / challenge)
      const tier = Math.min(3, baseTier + (slot === 2 ? 1 : 0));
      picked.push(createDailyMissionFromTemplate(tpl, tier, todayKey, slot));
    }

    this.activeMissions = picked;
    this.save();
    return true;
  }

  /**
   * Silently syncs pre-existing garage/career stats (unlocked cars, level, best score, upgrades)
   * on startup so returning players immediately see accurate progress on newly added achievements.
   */
  public syncInitialPeaks(
    peaks: Partial<Record<MetricType, number>>,
  ): void {
    let changed = false;
    for (const ach of ACHIEVEMENT_CATALOG) {
      const val = peaks[ach.metric];
      if (typeof val !== 'number' || val <= 0) continue;
      if (this.unlockedAchievements.has(ach.id)) continue;
      if (ach.mode === 'peak' || ach.metric === 'upgradesBought') {
        const cur = this.achievementProgress[ach.id] || 0;
        if (val > cur) {
          this.achievementProgress[ach.id] = Math.min(ach.target, val);
          changed = true;
        }
        if ((this.achievementProgress[ach.id] || 0) >= ach.target) {
          this.unlockedAchievements.add(ach.id);
          changed = true;
        }
      }
    }
    if (changed) {
      this.save();
    }
  }

  public startRun(): void {
    this.ensureDailyMissions(true);
    // Daily missions accumulate across all runs of the day; only single-run achievements reset.
    for (const ach of ACHIEVEMENT_CATALOG) {
      if (ach.mode === 'singleRun' && !this.unlockedAchievements.has(ach.id)) {
        this.achievementProgress[ach.id] = 0;
      }
    }
    this.save();
  }

  public recordDelta(metric: MetricType, amount: number): RewardEvent[] {
    if (amount <= 0) return [];
    this.ensureDailyMissions(false);
    const rewards: RewardEvent[] = [];

    for (let i = 0; i < this.activeMissions.length; i++) {
      const m = this.activeMissions[i];
      if (m.metric !== metric || m.completed || m.claimed) continue;
      if (m.mode === 'dailyPeak') continue;
      m.progress = Math.min(m.target, m.progress + amount);
      if (m.progress >= m.target) {
        m.completed = true;
        rewards.push({
          kind: 'mission',
          title: m.title,
          rewardGold: m.rewardGold,
        });
      }
    }

    for (const ach of ACHIEVEMENT_CATALOG) {
      if (ach.metric !== metric || this.unlockedAchievements.has(ach.id)) {
        continue;
      }
      if (ach.mode === 'cumulative' || ach.mode === 'singleRun') {
        const nextVal = Math.min(
          ach.target,
          (this.achievementProgress[ach.id] || 0) + amount,
        );
        this.achievementProgress[ach.id] = nextVal;
        if (nextVal >= ach.target) {
          this.unlockedAchievements.add(ach.id);
          rewards.push({
            kind: 'achievement',
            title: ach.title,
            rewardGold: ach.rewardGold,
          });
        }
      }
    }

    this.markDirtyOrSave(rewards.length > 0);
    return rewards;
  }

  public recordPeak(metric: MetricType, value: number): RewardEvent[] {
    this.ensureDailyMissions(false);
    const rewards: RewardEvent[] = [];

    for (let i = 0; i < this.activeMissions.length; i++) {
      const m = this.activeMissions[i];
      if (m.metric !== metric || m.completed || m.claimed) continue;
      if (value > m.progress) {
        m.progress = Math.min(m.target, value);
      }
      if (m.progress >= m.target) {
        m.completed = true;
        rewards.push({
          kind: 'mission',
          title: m.title,
          rewardGold: m.rewardGold,
        });
      }
    }

    for (const ach of ACHIEVEMENT_CATALOG) {
      if (ach.metric !== metric || this.unlockedAchievements.has(ach.id)) {
        continue;
      }
      if (ach.mode === 'peak' || ach.mode === 'singleRun') {
        const cur = this.achievementProgress[ach.id] || 0;
        if (value > cur) {
          this.achievementProgress[ach.id] = Math.min(ach.target, value);
        }
        if ((this.achievementProgress[ach.id] || 0) >= ach.target) {
          this.unlockedAchievements.add(ach.id);
          rewards.push({
            kind: 'achievement',
            title: ach.title,
            rewardGold: ach.rewardGold,
          });
        }
      }
    }

    if (rewards.length > 0) {
      this.save();
    }
    return rewards;
  }

  public claimMission(missionId: string): ClaimResult {
    this.ensureDailyMissions();
    const mission = this.activeMissions.find((m) => m.id === missionId);
    if (!mission) return { ok: false, rewardGold: 0, count: 0 };
    if (mission.claimed) return { ok: false, rewardGold: 0, count: 0 };
    if (!mission.completed && mission.progress < mission.target) {
      return { ok: false, rewardGold: 0, count: 0 };
    }
    mission.completed = true;
    mission.claimed = true;
    this.completedMissionsTotal++;
    this.save();
    return {
      ok: true,
      rewardGold: mission.rewardGold,
      title: mission.title,
      count: 1,
    };
  }

  public claimAchievement(achievementId: string): ClaimResult {
    const tpl = ACHIEVEMENT_CATALOG.find((a) => a.id === achievementId);
    if (!tpl) return { ok: false, rewardGold: 0, count: 0 };
    if (
      !this.unlockedAchievements.has(achievementId) ||
      this.claimedAchievements.has(achievementId)
    ) {
      return { ok: false, rewardGold: 0, count: 0 };
    }
    this.claimedAchievements.add(achievementId);
    this.save();
    return { ok: true, rewardGold: tpl.rewardGold, title: tpl.title, count: 1 };
  }

  public claimAllRewards(
    scope: 'missions' | 'achievements' | 'all' = 'all',
  ): ClaimResult {
    this.ensureDailyMissions();
    let totalGold = 0;
    let count = 0;

    if (scope === 'missions' || scope === 'all') {
      for (const m of this.activeMissions) {
        if (!m.claimed && (m.completed || m.progress >= m.target)) {
          m.completed = true;
          m.claimed = true;
          totalGold += m.rewardGold;
          count++;
          this.completedMissionsTotal++;
        }
      }
    }

    if (scope === 'achievements' || scope === 'all') {
      for (const ach of ACHIEVEMENT_CATALOG) {
        if (
          this.unlockedAchievements.has(ach.id) &&
          !this.claimedAchievements.has(ach.id)
        ) {
          this.claimedAchievements.add(ach.id);
          totalGold += ach.rewardGold;
          count++;
        }
      }
    }

    if (count > 0) {
      this.save();
      return { ok: true, rewardGold: totalGold, count };
    }
    return { ok: false, rewardGold: 0, count: 0 };
  }

  public flushSave(): void {
    if (this.saveDirty) {
      this.save();
    }
  }

  public getSnapshot(): MissionsSnapshot {
    this.ensureDailyMissions(true);
    let claimableMissionsCount = 0;
    const activeMissions: ActiveMissionView[] = this.activeMissions.map(
      (m) => {
        const completed = Boolean(m.completed || m.progress >= m.target);
        const claimed = Boolean(m.claimed);
        if (completed && !claimed) claimableMissionsCount++;
        return {
          id: m.id,
          title: m.title,
          target: m.target,
          progress: completed ? m.target : Math.floor(m.progress),
          rewardGold: m.rewardGold,
          completed,
          claimed,
        };
      },
    );

    let claimableAchievementsCount = 0;
    const achievements: AchievementView[] = ACHIEVEMENT_CATALOG.map((ach) => {
      const unlocked = this.unlockedAchievements.has(ach.id);
      const claimed = unlocked && this.claimedAchievements.has(ach.id);
      if (unlocked && !claimed) claimableAchievementsCount++;
      const progress = unlocked
        ? ach.target
        : Math.floor(this.achievementProgress[ach.id] || 0);
      return {
        id: ach.id,
        category: ach.category,
        title: ach.title,
        description: ach.description,
        target: ach.target,
        progress,
        rewardGold: ach.rewardGold,
        unlocked,
        claimed,
      };
    });

    return {
      dailyDateKey: this.dailyDateKey,
      activeMissions,
      achievements,
      completedMissionsTotal: this.completedMissionsTotal,
      claimableMissionsCount,
      claimableAchievementsCount,
      totalClaimableCount: claimableMissionsCount + claimableAchievementsCount,
    };
  }
}

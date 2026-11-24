import { AtmosphereId, BiomeId } from '../types/game';

export type CareerRoadRule = 'classic' | 'twoway' | 'pursuit';

export type CareerObjectiveKind =
  | 'nearMiss'
  | 'maxSpeed'
  | 'driftPoints'
  | 'runGold'
  | 'cleanCurves'
  | 'minIntegrity'
  | 'score'
  | 'maxCombo'
  | 'timeLimit'
  | 'roadEvents';

export interface CareerObjectiveSpec {
  id: string;
  kind: CareerObjectiveKind;
  target: number;
  title: string;
  shortLabel: string;
}

export interface CareerLevelRewards {
  finishGold: number;
  mission1Gold: number;
  mission2Gold: number;
  perfectBonusGold: number;
  finishXp: number;
  replayGold: number;
}

export interface CareerLevelSpec {
  id: number; // 1..100
  chapterIndex: number; // 0..3
  title: string;
  biome: BiomeId;
  atmosphere: AtmosphereId;
  roadRule: CareerRoadRule;
  targetDistanceMeters: number;
  isMilestone: boolean;
  missions: [CareerObjectiveSpec, CareerObjectiveSpec];
  rewards: CareerLevelRewards;
}

export interface CareerChapterSpec {
  index: number;
  biome: BiomeId;
  name: string;
  subtitle: string;
  startLevel: number;
  endLevel: number;
  accentHex: string;
  badgeBgClass: string;
  badgeTextClass: string;
}

export interface CareerStarChestSpec {
  starsRequired: number;
  rewardGold: number;
  title: string;
}

export interface CareerLevelProgress {
  stars: number; // 0..3
  mission1Done: boolean;
  mission2Done: boolean;
  bestScore: number;
  bestTimeSec: number;
}

export interface CareerProgressSnapshot {
  highestUnlockedLevel: number; // 1..100
  totalStars: number;
  maxStars: number;
  completedLevelsCount: number;
  levels: Record<number, CareerLevelProgress>;
  claimedChests: number[];
}

export interface CareerObjectiveEvaluation {
  spec: CareerObjectiveSpec;
  current: number;
  target: number;
  completed: boolean;
  progressText: string;
}

export interface CareerRunMetrics {
  distanceMeters: number;
  score: number;
  nearMissCount: number;
  peakSpeedKmh: number;
  driftPoints: number;
  runGold: number;
  cleanCurvesCount: number;
  integrityPercent: number;
  maxCombo: number;
  elapsedSec: number;
  roadEventsCount: number;
}

export interface CareerRunOutcome {
  levelId: number;
  levelTitle: string;
  won: boolean;
  starsEarned: number; // 0 if lost, 1..3 if won
  previousBestStars: number;
  isFirstClear: boolean;
  nextLevelUnlocked: number | null;
  mission1: CareerObjectiveEvaluation;
  mission2: CareerObjectiveEvaluation;
  elapsedSec: number;
  targetDistanceMeters: number;
  rewardGoldAwarded: number;
  rewardXpAwarded: number;
  rewardBreakdown: {
    finishGold: number;
    mission1Gold: number;
    mission2Gold: number;
    perfectBonusGold: number;
    replayGold: number;
  };
}

export const TOTAL_CAREER_LEVELS = 100;
export const MAX_CAREER_STARS = TOTAL_CAREER_LEVELS * 3;

export const CAREER_CHAPTERS: CareerChapterSpec[] = [
  {
    index: 0,
    biome: 'alpine',
    name: 'Yeşil Vadi',
    subtitle: 'Bölüm 1–25 · Dağ Geçitleri ve Altın Saat',
    startLevel: 1,
    endLevel: 25,
    accentHex: '#10b981',
    badgeBgClass: 'bg-emerald-500/20 border-emerald-400/40',
    badgeTextClass: 'text-emerald-300',
  },
  {
    index: 1,
    biome: 'desert',
    name: 'Kızıl Çöl',
    subtitle: 'Bölüm 26–50 · Kanyon Düzlükleri ve Ters Şerit',
    startLevel: 26,
    endLevel: 50,
    accentHex: '#f59e0b',
    badgeBgClass: 'bg-amber-500/20 border-amber-400/40',
    badgeTextClass: 'text-amber-300',
  },
  {
    index: 2,
    biome: 'arctic',
    name: 'Buzul Kutuplar',
    subtitle: 'Bölüm 51–75 · Karlı Virajlar ve Gece Sürüşü',
    startLevel: 51,
    endLevel: 75,
    accentHex: '#38bdf8',
    badgeBgClass: 'bg-sky-500/20 border-sky-400/40',
    badgeTextClass: 'text-sky-300',
  },
  {
    index: 3,
    biome: 'volcanic',
    name: 'Volkanik Zirve',
    subtitle: 'Bölüm 76–100 · Magma Otoyolu ve Şampiyonluk',
    startLevel: 76,
    endLevel: 100,
    accentHex: '#f43f5e',
    badgeBgClass: 'bg-rose-500/20 border-rose-400/40',
    badgeTextClass: 'text-rose-300',
  },
];

export const CAREER_STAR_CHESTS: CareerStarChestSpec[] = [
  { starsRequired: 15, rewardGold: 450, title: 'Çaylak Sandığı' },
  { starsRequired: 45, rewardGold: 900, title: 'Vadi Kupası' },
  { starsRequired: 90, rewardGold: 1800, title: 'Çöl Şampiyonu' },
  { starsRequired: 150, rewardGold: 3200, title: 'Buzul Efsanesi' },
  { starsRequired: 225, rewardGold: 5500, title: 'Zirve Ustası' },
  { starsRequired: 300, rewardGold: 12000, title: 'Kariyer Kralı' },
];

const CHAPTER_TITLES: readonly (readonly string[])[] = [
  // Chapter 1: Yeşil Vadi (1–25)
  [
    'İlk Gaz',
    'Vadi Çıkışı',
    'Şafak Şeridi',
    'Çam Virajı',
    'Sabah Makası',
    'Nehir Kenarı',
    'Temiz Çizgi',
    'Hızlı Geçiş',
    'Sıcak Asfalt',
    'Vadi Şampiyonu',
    'Altın Rampa',
    'Sisli Yamaç',
    'Çift Şerit Dansı',
    'Tünel Yankısı',
    'Viyadük Sürüşü',
    'Gölge Takibi',
    'Keskin Apex',
    'Akşam Sürati',
    'Orman Fırtınası',
    'Vadi Patronu',
    'Zirve Yolcusu',
    'Turbo Geçidi',
    'Gece Feneri',
    'Son Kavşak',
    'Vadi Finali',
  ],
  // Chapter 2: Kızıl Çöl (26–50)
  [
    'Çöl Kapısı',
    'Kızıl Kumlar',
    'Güneş Düzlüğü',
    'Kanyon Virajı',
    'Ters Şerit Testi',
    'Sıcak Rüzgar',
    'Kaktüs Hattı',
    'Serap Hızı',
    'Toz Bulutu',
    'Çöl Fırtınası',
    'Kızgın Asfalt',
    'Kanyon Makası',
    'Altın Konvoy',
    'Güneş Batımı',
    'Çöl Patronu',
    'Kızıl Tünel',
    'Karşı Trafik',
    'Yıldırım Şeridi',
    'Siren Yankısı',
    'Kum Şampiyonu',
    'Kanyon Drift',
    'Gece Çölü',
    'Alevli Rampa',
    'Büyük Kanyon',
    'Çöl Finali',
  ],
  // Chapter 3: Buzul Kutuplar (51–75)
  [
    'İlk Kar',
    'Buzul Geçidi',
    'Soğuk Asfalt',
    'Kuzey Işıkları',
    'Buzlu Viraj',
    'Tipi Hattı',
    'Kristal Drift',
    'Gece Kutupları',
    'Kar Fırtınası',
    'Buzul Şampiyonu',
    'Donmuş Köprü',
    'Siren Buzda',
    'Kaygan Zemin',
    'Kutup Makası',
    'Buzul Tüneli',
    'Beyaz Şimşek',
    'Karşı Buz Şeridi',
    'Derin Ayaz',
    'Yüksek İrtifa',
    'Buzul Patronu',
    'Kuzey Rüzgarı',
    'Mavi Alev',
    'Kutup Takibi',
    'Son Buzul',
    'Kutup Finali',
  ],
  // Chapter 4: Volkanik Zirve (76–100)
  [
    'Lav Kapısı',
    'Bazalt Yolu',
    'Kızıl Kıvılcım',
    'Magma Virajı',
    'Ateş Şeridi',
    'Krater Geçidi',
    'Sıcak Takip',
    'Volkan Makası',
    'Kül Bulutu',
    'Magma Şampiyonu',
    'Lav Köprüsü',
    'Cehennem Hızı',
    'Çift Yön Ateşi',
    'Kor Fırtınası',
    'Volkan Patronu',
    'Karanlık Krater',
    'Süper Şarj',
    'Siren Alevi',
    'Kıvılcım Drift',
    'Zirve Savaşçısı',
    'Obsidyen Hat',
    'Son Sürat',
    'Ateş Çemberi',
    'Büyük Zirve',
    'Efsane Final',
  ],
];

function createObjective(
  levelId: number,
  slot: 1 | 2,
  kind: CareerObjectiveKind,
  target: number,
): CareerObjectiveSpec {
  const id = `c${levelId}_m${slot}`;
  switch (kind) {
    case 'nearMiss':
      return {
        id,
        kind,
        target,
        title: `${target} Yakın Geçiş (Makas) yap`,
        shortLabel: `${target} Makas`,
      };
    case 'maxSpeed':
      return {
        id,
        kind,
        target,
        title: `${target} km/s hıza ulaş`,
        shortLabel: `${target} km/s`,
      };
    case 'driftPoints':
      return {
        id,
        kind,
        target,
        title: `${target.toLocaleString('tr-TR')} Drift puanı topla`,
        shortLabel: `${target.toLocaleString('tr-TR')} Drift`,
      };
    case 'runGold':
      return {
        id,
        kind,
        target,
        title: `Yoldan ${target} Altın topla`,
        shortLabel: `${target} Altın`,
      };
    case 'cleanCurves':
      return {
        id,
        kind,
        target,
        title: `${target} virajı temiz geç`,
        shortLabel: `${target} Viraj`,
      };
    case 'minIntegrity':
      return {
        id,
        kind,
        target,
        title:
          target >= 100
            ? 'Hiç hasar almadan bitir (%100)'
            : `Gövde sağlığı %${target}+ kalsın`,
        shortLabel: target >= 100 ? 'Hasarsız' : `%${target}+ Gövde`,
      };
    case 'score':
      return {
        id,
        kind,
        target,
        title: `${target.toLocaleString('tr-TR')} puan topla`,
        shortLabel: `${target.toLocaleString('tr-TR')} Puan`,
      };
    case 'maxCombo':
      return {
        id,
        kind,
        target,
        title: `×${target} Kombo çarpanına ulaş`,
        shortLabel: `×${target} Kombo`,
      };
    case 'timeLimit':
      return {
        id,
        kind,
        target,
        title: `${target} saniye içinde bitir`,
        shortLabel: `≤${target} sn`,
      };
    case 'roadEvents':
      return {
        id,
        kind,
        target,
        title: `${target} Rampa / Turbo şeridi kullan`,
        shortLabel: `${target} Rampa/Turbo`,
      };
  }
}

function roundTo(val: number, step: number): number {
  return Math.max(step, Math.round(val / step) * step);
}

function buildTargetForKind(
  kind: CareerObjectiveKind,
  levelId: number,
  targetDist: number,
): number {
  const t = (levelId - 1) / 99; // 0..1
  switch (kind) {
    case 'nearMiss':
      return Math.min(26, Math.max(2, Math.round(2 + t * 18)));
    case 'maxSpeed':
      // Achievable even with starter/mid cars early, ramps up to supercar speeds late
      return roundTo(145 + t * 185, 5);
    case 'driftPoints':
      return roundTo(220 + t * 2400, 50);
    case 'runGold':
      return Math.min(35, Math.max(4, Math.round(4 + t * 22)));
    case 'cleanCurves':
      return Math.min(8, Math.max(1, Math.round(1 + t * 5.2)));
    case 'minIntegrity':
      if (levelId <= 12) return 75;
      if (levelId <= 35) return 80;
      if (levelId <= 65) return 85;
      if (levelId % 5 === 0) return 100;
      return 90;
    case 'score':
      return roundTo(targetDist * (1.85 + t * 2.4), 250);
    case 'maxCombo':
      if (levelId <= 12) return 2;
      if (levelId <= 38) return 3;
      if (levelId <= 72) return 4;
      return 5;
    case 'timeLimit': {
      // Average expected speed scales from ~36 m/s (130 km/h) up to ~68 m/s (245 km/h)
      const expectedAvgMs = 35 + t * 31;
      const rawSec = targetDist / expectedAvgMs;
      return Math.max(18, Math.round(rawSec));
    }
    case 'roadEvents':
      return Math.min(5, Math.max(1, Math.round(1 + t * 3)));
  }
}

const OBJECTIVE_PAIRS: readonly [CareerObjectiveKind, CareerObjectiveKind][] = [
  ['nearMiss', 'maxSpeed'],
  ['runGold', 'minIntegrity'],
  ['score', 'nearMiss'],
  ['driftPoints', 'maxSpeed'],
  ['timeLimit', 'nearMiss'],
  ['cleanCurves', 'runGold'],
  ['maxCombo', 'score'],
  ['nearMiss', 'minIntegrity'],
  ['driftPoints', 'timeLimit'],
  ['score', 'maxCombo'],
  ['roadEvents', 'maxSpeed'],
  ['runGold', 'nearMiss'],
  ['cleanCurves', 'minIntegrity'],
  ['timeLimit', 'score'],
  ['driftPoints', 'maxCombo'],
];

function buildCareerLevels(): CareerLevelSpec[] {
  const levels: CareerLevelSpec[] = [];

  for (let id = 1; id <= TOTAL_CAREER_LEVELS; id++) {
    const chapterIndex = Math.min(3, Math.floor((id - 1) / 25));
    const localIdx = (id - 1) % 25;
    const chapter = CAREER_CHAPTERS[chapterIndex];
    const isMilestone = id % 10 === 0;
    const t = (id - 1) / 99;

    // Smooth, punchy distance progression: 650m on Lv.1 up to 3,600m on Lv.100
    const rawDist = 650 + Math.pow(t, 1.08) * 2800 + (isMilestone ? 200 : 0);
    const targetDistanceMeters = roundTo(rawDist, 50);

    // Curated atmosphere variety per chapter
    let atmosphere: AtmosphereId = 'golden';
    if (chapterIndex === 0) {
      atmosphere =
        localIdx % 6 === 4
          ? 'mist'
          : localIdx % 7 === 5
            ? 'night'
            : localIdx % 9 === 8
              ? 'rainy'
              : 'golden';
    } else if (chapterIndex === 1) {
      atmosphere =
        localIdx % 5 === 3
          ? 'night'
          : localIdx % 8 === 6
            ? 'mist'
            : 'golden';
    } else if (chapterIndex === 2) {
      atmosphere =
        localIdx % 3 === 0
          ? 'mist'
          : localIdx % 3 === 1
            ? 'night'
            : 'rainy';
    } else {
      atmosphere =
        localIdx % 4 === 0
          ? 'night'
          : localIdx % 4 === 2
            ? 'mist'
            : localIdx % 7 === 6
              ? 'rainy'
              : 'golden';
    }

    // Road flavor variety: classic early, introducing two-way & police pursuit cleanly
    let roadRule: CareerRoadRule = 'classic';
    if (id >= 12 && (id % 5 === 0 || (chapterIndex === 1 && localIdx % 4 === 1))) {
      roadRule = 'twoway';
    }
    if (
      id >= 20 &&
      (id % 10 === 0 || (chapterIndex >= 2 && localIdx % 6 === 4))
    ) {
      roadRule = 'pursuit';
    }
    if (id === 100) {
      roadRule = 'pursuit';
      atmosphere = 'night';
    }

    // Pick 2 distinct objectives tailored to level progression
    let pair = OBJECTIVE_PAIRS[(id - 1) % OBJECTIVE_PAIRS.length];
    if (id === 1) {
      pair = ['runGold', 'nearMiss'];
    } else if (id === 2) {
      pair = ['maxSpeed', 'minIntegrity'];
    } else if (id === 3) {
      pair = ['nearMiss', 'score'];
    }

    const m1 = createObjective(
      id,
      1,
      pair[0],
      buildTargetForKind(pair[0], id, targetDistanceMeters),
    );
    const m2 = createObjective(
      id,
      2,
      pair[1],
      buildTargetForKind(pair[1], id, targetDistanceMeters),
    );

    const milestoneMult = isMilestone ? 1.65 : 1.0;
    const finishGold = roundTo((75 + t * 340) * milestoneMult, 5);
    const missionGold = roundTo((40 + t * 180) * milestoneMult, 5);
    const perfectBonusGold = roundTo((50 + t * 240) * milestoneMult, 5);
    const finishXp = roundTo((120 + t * 1250) * milestoneMult, 10);
    const replayGold = roundTo(20 + t * 65, 5);

    levels.push({
      id,
      chapterIndex,
      title: CHAPTER_TITLES[chapterIndex]?.[localIdx] || `Bölüm ${id}`,
      biome: chapter.biome,
      atmosphere,
      roadRule,
      targetDistanceMeters,
      isMilestone,
      missions: [m1, m2],
      rewards: {
        finishGold,
        mission1Gold: missionGold,
        mission2Gold: missionGold,
        perfectBonusGold,
        finishXp,
        replayGold,
      },
    });
  }

  return levels;
}

export const CAREER_LEVELS: CareerLevelSpec[] = buildCareerLevels();

export function getCareerLevelById(levelId: number): CareerLevelSpec {
  const clamped = Math.max(1, Math.min(TOTAL_CAREER_LEVELS, Math.floor(levelId)));
  return CAREER_LEVELS[clamped - 1];
}

export function evaluateCareerObjective(
  spec: CareerObjectiveSpec,
  metrics: CareerRunMetrics,
): CareerObjectiveEvaluation {
  let current = 0;
  let completed = false;
  let progressText = '';

  switch (spec.kind) {
    case 'nearMiss':
      current = Math.floor(metrics.nearMissCount);
      completed = current >= spec.target;
      progressText = `${Math.min(current, spec.target)}/${spec.target}`;
      break;
    case 'maxSpeed':
      current = Math.round(metrics.peakSpeedKmh);
      completed = current >= spec.target;
      progressText = `${current}/${spec.target} km/s`;
      break;
    case 'driftPoints':
      current = Math.round(metrics.driftPoints);
      completed = current >= spec.target;
      progressText = `${Math.min(current, spec.target).toLocaleString('tr-TR')}/${spec.target.toLocaleString('tr-TR')}`;
      break;
    case 'runGold':
      current = Math.floor(metrics.runGold);
      completed = current >= spec.target;
      progressText = `${Math.min(current, spec.target)}/${spec.target}`;
      break;
    case 'cleanCurves':
      current = Math.floor(metrics.cleanCurvesCount);
      completed = current >= spec.target;
      progressText = `${Math.min(current, spec.target)}/${spec.target}`;
      break;
    case 'minIntegrity':
      current = Math.round(metrics.integrityPercent);
      completed = current >= spec.target;
      progressText = `%${current} / %${spec.target}`;
      break;
    case 'score':
      current = Math.floor(metrics.score);
      completed = current >= spec.target;
      progressText = `${Math.min(current, spec.target).toLocaleString('tr-TR')}/${spec.target.toLocaleString('tr-TR')}`;
      break;
    case 'maxCombo':
      current = Math.floor(metrics.maxCombo);
      completed = current >= spec.target;
      progressText = `×${Math.min(current, spec.target)}/×${spec.target}`;
      break;
    case 'timeLimit':
      current = Math.round(metrics.elapsedSec * 10) / 10;
      completed = metrics.elapsedSec <= spec.target;
      progressText = `${Math.ceil(metrics.elapsedSec)}/${spec.target} sn`;
      break;
    case 'roadEvents':
      current = Math.floor(metrics.roadEventsCount);
      completed = current >= spec.target;
      progressText = `${Math.min(current, spec.target)}/${spec.target}`;
      break;
  }

  return {
    spec,
    current,
    target: spec.target,
    completed,
    progressText,
  };
}

const CAREER_STORAGE_KEY = 'viraj_career_progress_v1';

interface StoredCareerData {
  highestUnlockedLevel: number;
  levels: Record<string, CareerLevelProgress>;
  claimedChests: number[];
}

export class CareerProgressManager {
  private highestUnlockedLevel = 1;
  private levels: Record<number, CareerLevelProgress> = {};
  private claimedChests = new Set<number>();

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(CAREER_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<StoredCareerData>;
      if (
        typeof parsed.highestUnlockedLevel === 'number' &&
        Number.isFinite(parsed.highestUnlockedLevel)
      ) {
        this.highestUnlockedLevel = Math.max(
          1,
          Math.min(TOTAL_CAREER_LEVELS, Math.floor(parsed.highestUnlockedLevel)),
        );
      }
      if (parsed.levels && typeof parsed.levels === 'object') {
        for (const [k, v] of Object.entries(parsed.levels)) {
          const id = Number(k);
          if (
            Number.isInteger(id) &&
            id >= 1 &&
            id <= TOTAL_CAREER_LEVELS &&
            v &&
            typeof v === 'object'
          ) {
            this.levels[id] = {
              stars: Math.max(0, Math.min(3, Math.floor(v.stars || 0))),
              mission1Done: Boolean(v.mission1Done),
              mission2Done: Boolean(v.mission2Done),
              bestScore: Math.max(0, Math.floor(v.bestScore || 0)),
              bestTimeSec: Math.max(0, Number(v.bestTimeSec || 0)),
            };
          }
        }
      }
      if (Array.isArray(parsed.claimedChests)) {
        for (const s of parsed.claimedChests) {
          if (typeof s === 'number' && Number.isFinite(s)) {
            this.claimedChests.add(s);
          }
        }
      }
    } catch {
      // ignore corrupted storage
    }
  }

  private save(): void {
    try {
      const payload: StoredCareerData = {
        highestUnlockedLevel: this.highestUnlockedLevel,
        levels: this.levels,
        claimedChests: Array.from(this.claimedChests),
      };
      localStorage.setItem(CAREER_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore storage failure
    }
  }

  public isLevelUnlocked(levelId: number): boolean {
    return levelId >= 1 && levelId <= this.highestUnlockedLevel;
  }

  public getSnapshot(): CareerProgressSnapshot {
    let totalStars = 0;
    let completedLevelsCount = 0;
    const levelsCopy: Record<number, CareerLevelProgress> = {};
    for (const [k, v] of Object.entries(this.levels)) {
      const id = Number(k);
      levelsCopy[id] = { ...v };
      totalStars += v.stars;
      if (v.stars >= 1) completedLevelsCount++;
    }
    return {
      highestUnlockedLevel: this.highestUnlockedLevel,
      totalStars,
      maxStars: MAX_CAREER_STARS,
      completedLevelsCount,
      levels: levelsCopy,
      claimedChests: Array.from(this.claimedChests),
    };
  }

  public recordVictory(
    level: CareerLevelSpec,
    metrics: CareerRunMetrics,
  ): CareerRunOutcome {
    const m1 = evaluateCareerObjective(level.missions[0], metrics);
    const m2 = evaluateCareerObjective(level.missions[1], metrics);
    const runStars = 1 + (m1.completed ? 1 : 0) + (m2.completed ? 1 : 0);

    const prev: CareerLevelProgress = this.levels[level.id] || {
      stars: 0,
      mission1Done: false,
      mission2Done: false,
      bestScore: 0,
      bestTimeSec: 0,
    };

    const isFirstClear = prev.stars === 0;
    const newlyClearedM1 = m1.completed && !prev.mission1Done;
    const newlyClearedM2 = m2.completed && !prev.mission2Done;

    const mergedM1 = prev.mission1Done || m1.completed;
    const mergedM2 = prev.mission2Done || m2.completed;
    const newBestStars = Math.max(
      prev.stars,
      1 + (mergedM1 ? 1 : 0) + (mergedM2 ? 1 : 0),
    );
    const newlyPerfect = newBestStars === 3 && prev.stars < 3;

    const finishGold = isFirstClear ? level.rewards.finishGold : 0;
    const mission1Gold = newlyClearedM1 ? level.rewards.mission1Gold : 0;
    const mission2Gold = newlyClearedM2 ? level.rewards.mission2Gold : 0;
    const perfectBonusGold = newlyPerfect ? level.rewards.perfectBonusGold : 0;
    const replayGold = !isFirstClear ? level.rewards.replayGold : 0;

    const rewardGoldAwarded =
      finishGold + mission1Gold + mission2Gold + perfectBonusGold + replayGold;
    const rewardXpAwarded = isFirstClear
      ? level.rewards.finishXp
      : Math.round(level.rewards.finishXp * 0.35);

    this.levels[level.id] = {
      stars: newBestStars,
      mission1Done: mergedM1,
      mission2Done: mergedM2,
      bestScore: Math.max(prev.bestScore, Math.floor(metrics.score)),
      bestTimeSec:
        prev.bestTimeSec > 0
          ? Math.min(prev.bestTimeSec, metrics.elapsedSec)
          : metrics.elapsedSec,
    };

    let nextLevelUnlocked: number | null = null;
    if (
      level.id < TOTAL_CAREER_LEVELS &&
      this.highestUnlockedLevel <= level.id
    ) {
      this.highestUnlockedLevel = level.id + 1;
      nextLevelUnlocked = this.highestUnlockedLevel;
    }

    this.save();

    return {
      levelId: level.id,
      levelTitle: level.title,
      won: true,
      starsEarned: runStars,
      previousBestStars: prev.stars,
      isFirstClear,
      nextLevelUnlocked,
      mission1: m1,
      mission2: m2,
      elapsedSec: metrics.elapsedSec,
      targetDistanceMeters: level.targetDistanceMeters,
      rewardGoldAwarded,
      rewardXpAwarded,
      rewardBreakdown: {
        finishGold,
        mission1Gold,
        mission2Gold,
        perfectBonusGold,
        replayGold,
      },
    };
  }

  public buildDefeatOutcome(
    level: CareerLevelSpec,
    metrics: CareerRunMetrics,
  ): CareerRunOutcome {
    const prev = this.levels[level.id];
    const m1 = evaluateCareerObjective(level.missions[0], metrics);
    const m2 = evaluateCareerObjective(level.missions[1], metrics);
    return {
      levelId: level.id,
      levelTitle: level.title,
      won: false,
      starsEarned: 0,
      previousBestStars: prev?.stars || 0,
      isFirstClear: false,
      nextLevelUnlocked: null,
      mission1: m1,
      mission2: m2,
      elapsedSec: metrics.elapsedSec,
      targetDistanceMeters: level.targetDistanceMeters,
      rewardGoldAwarded: 0,
      rewardXpAwarded: 0,
      rewardBreakdown: {
        finishGold: 0,
        mission1Gold: 0,
        mission2Gold: 0,
        perfectBonusGold: 0,
        replayGold: 0,
      },
    };
  }

  public claimStarChest(
    starsRequired: number,
  ): { ok: boolean; rewardGold: number; title: string } {
    const chest = CAREER_STAR_CHESTS.find(
      (c) => c.starsRequired === starsRequired,
    );
    if (!chest) return { ok: false, rewardGold: 0, title: '' };
    if (this.claimedChests.has(starsRequired)) {
      return { ok: false, rewardGold: 0, title: chest.title };
    }
    const snap = this.getSnapshot();
    if (snap.totalStars < starsRequired) {
      return { ok: false, rewardGold: 0, title: chest.title };
    }
    this.claimedChests.add(starsRequired);
    this.save();
    return { ok: true, rewardGold: chest.rewardGold, title: chest.title };
  }
}

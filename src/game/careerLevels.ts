import { AtmosphereId, BiomeId } from '../types/game';
import { CrateTierId } from '../services/storeCatalog';

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
  | 'roadEvents'
  | 'cockpitOnly'
  | 'cockpitNearMiss'
  | 'noBrake'
  | 'noNitro'
  | 'minSpeedHold'
  | 'oncomingMeters'
  | 'highSpeedSec';

export interface CareerObjectiveSpec {
  id: string;
  kind: CareerObjectiveKind;
  target: number;
  /** Optional secondary parameter (e.g. minimum speed km/h for highSpeedSec) */
  param?: number;
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
  crateTierId?: CrateTierId;
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
  failed?: boolean;
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
  stayedInCockpit: boolean;
  cockpitNearMissCount: number;
  usedBrake: boolean;
  usedNitro: boolean;
  droppedBelowMinSpeed: boolean;
  minSpeedGraceActive: boolean;
  oncomingMeters: number;
  highSpeedSeconds: number;
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
export const CAREER_MIN_SPEED_GRACE_SEC = 4.5;

export function isContinuousCareerConstraint(
  kind: CareerObjectiveKind,
): boolean {
  return (
    kind === 'minIntegrity' ||
    kind === 'timeLimit' ||
    kind === 'cockpitOnly' ||
    kind === 'noBrake' ||
    kind === 'noNitro' ||
    kind === 'minSpeedHold'
  );
}

export function getCareerLevelDifficulty(levelId: number): {
  label: string;
  textClass: string;
  borderClass: string;
  bgClass: string;
} {
  if (levelId <= 20) {
    return {
      label: 'Zor',
      textClass: 'text-amber-300',
      borderClass: 'border-amber-400/35',
      bgClass: 'bg-amber-500/12',
    };
  }
  if (levelId <= 50) {
    return {
      label: 'Çok Zor',
      textClass: 'text-orange-300',
      borderClass: 'border-orange-400/40',
      bgClass: 'bg-orange-500/14',
    };
  }
  if (levelId <= 80) {
    return {
      label: 'Ekstrem',
      textClass: 'text-rose-300',
      borderClass: 'border-rose-400/45',
      bgClass: 'bg-rose-500/15',
    };
  }
  return {
    label: 'Kabus',
    textClass: 'text-fuchsia-300',
    borderClass: 'border-fuchsia-400/50',
    bgClass: 'bg-fuchsia-500/18',
  };
}

export function getCareerLevelSpecialTags(level: CareerLevelSpec): string[] {
  const tags: string[] = [];
  for (const m of level.missions) {
    if (m.kind === 'cockpitOnly') tags.push('1. Şahıs (Kokpit)');
    else if (m.kind === 'cockpitNearMiss') tags.push('1. Şahıs Makas');
    else if (m.kind === 'noBrake') tags.push('Fren Yasak');
    else if (m.kind === 'noNitro') tags.push('Nitro Yasak');
    else if (m.kind === 'minSpeedHold') tags.push(`Min ${m.target} km/s`);
    else if (m.kind === 'oncomingMeters') tags.push('Ters Şerit');
    else if (m.kind === 'highSpeedSec')
      tags.push(`${m.param ?? 200}+ km/s Dayanıklılık`);
    else if (m.kind === 'minIntegrity' && m.target >= 100)
      tags.push('Sıfır Hasar');
  }
  return Array.from(new Set(tags));
}

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
  {
    starsRequired: 30,
    rewardGold: 0,
    crateTierId: 'street',
    title: 'Sokak Kasası',
  },
  { starsRequired: 45, rewardGold: 900, title: 'Vadi Kupası' },
  {
    starsRequired: 70,
    rewardGold: 0,
    crateTierId: 'street',
    title: 'Vadi Sokak Kasası',
  },
  { starsRequired: 90, rewardGold: 1800, title: 'Çöl Şampiyonu' },
  {
    starsRequired: 120,
    rewardGold: 0,
    crateTierId: 'pro',
    title: 'Çöl Pro Kasası',
  },
  { starsRequired: 150, rewardGold: 3200, title: 'Buzul Efsanesi' },
  {
    starsRequired: 180,
    rewardGold: 0,
    crateTierId: 'pro',
    title: 'Buzul Pro Kasası',
  },
  {
    starsRequired: 210,
    rewardGold: 0,
    crateTierId: 'legendary',
    title: 'Kutup Efsanevi Kasası',
  },
  { starsRequired: 225, rewardGold: 5500, title: 'Zirve Ustası' },
  {
    starsRequired: 270,
    rewardGold: 0,
    crateTierId: 'legendary',
    title: 'Volkanik Efsanevi Kasa',
  },
  { starsRequired: 300, rewardGold: 12000, title: 'Kariyer Kralı' },
];

const CHAPTER_TITLES: readonly (readonly string[])[] = [
  // Chapter 1: Yeşil Vadi (1–25)
  [
    'İlk Gaz',
    'Vadi Çıkışı',
    'Şafak Şeridi',
    'Kokpit Sınavı',
    'Sabah Makası',
    'Ters Şerit Geçidi',
    'Frensiz İniş',
    'Hızlı Geçiş',
    'Sıcak Asfalt',
    'Vadi Şampiyonu',
    'Altın Rampa',
    'Sisli Yamaç',
    'Kokpit Makası',
    'Tünel Yankısı',
    'Viyadük Sürüşü',
    'Gölge Takibi',
    'Keskin Apex',
    'Hız Barajı',
    'Orman Fırtınası',
    'Vadi Patronu',
    'Zirve Yolcusu',
    'Nitrosuz Yarış',
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
    'Kokpit Kanyonu',
    'Serap Hızı',
    'Toz Bulutu',
    'Çöl Fırtınası',
    'Kızgın Asfalt',
    'Kanyon Makası',
    'Frensiz Konvoy',
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
  param?: number,
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
        title: `${target} virajı hasarsız temiz geç`,
        shortLabel: `${target} Viraj`,
      };
    case 'minIntegrity':
      return {
        id,
        kind,
        target,
        title:
          target >= 100
            ? 'Sıfır hasarla (çiziksiz %100) bitir'
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
        title: `${target} saniye içinde bitişe ulaş`,
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
    case 'cockpitOnly':
      return {
        id,
        kind,
        target: 1,
        title: 'Tüm etabı 1. şahıs (Kokpit) açısıyla sür',
        shortLabel: '1. Şahıs',
      };
    case 'cockpitNearMiss':
      return {
        id,
        kind,
        target,
        title: `1. şahıs (Kokpit) açısında ${target} makas yap`,
        shortLabel: `Kokpit ${target} Makas`,
      };
    case 'noBrake':
      return {
        id,
        kind,
        target: 1,
        title: 'Hiç frene basmadan bitişe ulaş',
        shortLabel: 'Fren Yasak',
      };
    case 'noNitro':
      return {
        id,
        kind,
        target: 1,
        title: 'Hiç nitro kullanmadan etabı tamamla',
        shortLabel: 'Nitrosuz',
      };
    case 'minSpeedHold':
      return {
        id,
        kind,
        target,
        title: `Kalkış sonrası ${target} km/s altına hiç düşme`,
        shortLabel: `Min ${target} km/s`,
      };
    case 'oncomingMeters':
      return {
        id,
        kind,
        target,
        title: `Ters şeritte toplam ${target.toLocaleString('tr-TR')} m sür`,
        shortLabel: `Ters ${target} m`,
      };
    case 'highSpeedSec': {
      const speedKmh = param ?? 200;
      return {
        id,
        kind,
        target,
        param: speedKmh,
        title: `${speedKmh} km/s üzerinde toplam ${target} sn sür`,
        shortLabel: `${speedKmh}+ · ${target}sn`,
      };
    }
  }
}

function roundTo(val: number, step: number): number {
  return Math.max(step, Math.round(val / step) * step);
}

function buildTargetAndParamForKind(
  kind: CareerObjectiveKind,
  levelId: number,
  targetDist: number,
): { target: number; param?: number } {
  const t = (levelId - 1) / 99; // 0..1
  switch (kind) {
    case 'nearMiss':
      return { target: Math.min(40, Math.max(5, Math.round(5 + t * 33))) };
    case 'maxSpeed':
      return { target: roundTo(175 + t * 195, 5) };
    case 'driftPoints':
      return { target: roundTo(650 + t * 5800, 50) };
    case 'runGold':
      return { target: Math.min(50, Math.max(9, Math.round(9 + t * 38))) };
    case 'cleanCurves':
      return { target: Math.min(12, Math.max(2, Math.round(2 + t * 9.5))) };
    case 'minIntegrity':
      if (levelId <= 10) return { target: 90 };
      if (levelId <= 25) return { target: 95 };
      return { target: 100 };
    case 'score':
      return { target: roundTo(targetDist * (3.1 + t * 4.2), 250) };
    case 'maxCombo':
      if (levelId <= 15) return { target: 3 };
      if (levelId <= 40) return { target: 4 };
      if (levelId <= 68) return { target: 5 };
      if (levelId <= 88) return { target: 6 };
      return { target: 7 };
    case 'timeLimit': {
      // Brutally tight pace: 44 m/s (~158 km/h avg) early up to 84 m/s (~302 km/h avg) late
      const expectedAvgMs = 44 + t * 40;
      const rawSec = targetDist / expectedAvgMs;
      return { target: Math.max(16, Math.round(rawSec)) };
    }
    case 'roadEvents':
      return { target: Math.min(7, Math.max(2, Math.round(2 + t * 4.5))) };
    case 'cockpitOnly':
      return { target: 1 };
    case 'cockpitNearMiss':
      return { target: Math.min(22, Math.max(4, Math.round(4 + t * 16))) };
    case 'noBrake':
      return { target: 1 };
    case 'noNitro':
      return { target: 1 };
    case 'minSpeedHold':
      return { target: roundTo(125 + t * 115, 5) };
    case 'oncomingMeters': {
      const ratio = 0.36 + t * 0.24; // 36%..60% of the stage driven in oncoming lane!
      return { target: roundTo(targetDist * ratio, 50) };
    }
    case 'highSpeedSec': {
      const speedKmh = roundTo(165 + t * 130, 5);
      const seconds = Math.min(28, Math.max(7, Math.round(7 + t * 20)));
      return { target: seconds, param: speedKmh };
    }
  }
}

const CLASSIC_OBJECTIVE_PAIRS: readonly [
  CareerObjectiveKind,
  CareerObjectiveKind,
][] = [
  ['nearMiss', 'timeLimit'],
  ['cockpitOnly', 'nearMiss'],
  ['noBrake', 'minIntegrity'],
  ['cockpitNearMiss', 'maxSpeed'],
  ['minSpeedHold', 'nearMiss'],
  ['highSpeedSec', 'minIntegrity'],
  ['noNitro', 'timeLimit'],
  ['cockpitOnly', 'minIntegrity'],
  ['driftPoints', 'maxCombo'],
  ['noBrake', 'minSpeedHold'],
  ['cockpitNearMiss', 'timeLimit'],
  ['score', 'maxCombo'],
  ['highSpeedSec', 'noBrake'],
  ['cockpitOnly', 'timeLimit'],
  ['cleanCurves', 'minIntegrity'],
  ['noNitro', 'nearMiss'],
  ['roadEvents', 'highSpeedSec'],
  ['cockpitOnly', 'driftPoints'],
  ['minSpeedHold', 'score'],
  ['cockpitNearMiss', 'minIntegrity'],
];

const TWOWAY_OBJECTIVE_PAIRS: readonly [
  CareerObjectiveKind,
  CareerObjectiveKind,
][] = [
  ['oncomingMeters', 'nearMiss'],
  ['oncomingMeters', 'minIntegrity'],
  ['cockpitOnly', 'oncomingMeters'],
  ['oncomingMeters', 'noBrake'],
  ['oncomingMeters', 'timeLimit'],
  ['cockpitNearMiss', 'oncomingMeters'],
  ['oncomingMeters', 'minSpeedHold'],
];

function buildCareerLevels(): CareerLevelSpec[] {
  const levels: CareerLevelSpec[] = [];

  for (let id = 1; id <= TOTAL_CAREER_LEVELS; id++) {
    const chapterIndex = Math.min(3, Math.floor((id - 1) / 25));
    const localIdx = (id - 1) % 25;
    const chapter = CAREER_CHAPTERS[chapterIndex];
    const isMilestone = id % 10 === 0;
    const t = (id - 1) / 99;

    // Longer, demanding stage distances: 950m on Lv.1 up to 5,400m on Lv.100
    const rawDist = 950 + Math.pow(t, 1.06) * 4100 + (isMilestone ? 350 : 0);
    const targetDistanceMeters = roundTo(rawDist, 50);

    // Rich atmosphere variety with more night/rain/mist pressure in later chapters
    let atmosphere: AtmosphereId = 'golden';
    if (chapterIndex === 0) {
      atmosphere =
        localIdx % 5 === 3
          ? 'mist'
          : localIdx % 6 === 4
            ? 'night'
            : localIdx % 7 === 5
              ? 'rainy'
              : 'golden';
    } else if (chapterIndex === 1) {
      atmosphere =
        localIdx % 4 === 2
          ? 'night'
          : localIdx % 5 === 4
            ? 'mist'
            : localIdx % 9 === 7
              ? 'rainy'
              : 'golden';
    } else if (chapterIndex === 2) {
      atmosphere =
        localIdx % 3 === 0
          ? 'rainy'
          : localIdx % 3 === 1
            ? 'night'
            : 'mist';
    } else {
      atmosphere =
        localIdx % 3 === 0
          ? 'night'
          : localIdx % 3 === 1
            ? 'rainy'
            : 'mist';
    }

    // Introduce Two-Way early (Lv.6+) and Police Pursuit early (Lv.10+) for high intensity
    let roadRule: CareerRoadRule = 'classic';
    if (
      id >= 6 &&
      (id % 4 === 2 || (chapterIndex === 1 && localIdx % 3 === 1))
    ) {
      roadRule = 'twoway';
    }
    if (
      id >= 10 &&
      (id % 10 === 0 ||
        (chapterIndex >= 2 && localIdx % 5 === 3) ||
        (chapterIndex === 3 && localIdx % 4 === 3))
    ) {
      roadRule = 'pursuit';
    }
    if (id === 100) {
      roadRule = 'pursuit';
      atmosphere = 'rainy';
    }

    // Pick 2 demanding objectives tailored to roadRule & progression
    let pair: [CareerObjectiveKind, CareerObjectiveKind];
    if (id === 1) {
      pair = ['nearMiss', 'timeLimit'];
    } else if (id === 2) {
      pair = ['maxSpeed', 'minIntegrity'];
    } else if (id === 3) {
      pair = ['noBrake', 'nearMiss'];
    } else if (id === 4) {
      pair = ['cockpitOnly', 'nearMiss'];
    } else if (id === 100) {
      pair = ['cockpitOnly', 'minIntegrity'];
    } else if (roadRule === 'twoway') {
      const twPair =
        TWOWAY_OBJECTIVE_PAIRS[(id * 3) % TWOWAY_OBJECTIVE_PAIRS.length];
      pair = [twPair[0], twPair[1]];
    } else {
      const clPair =
        CLASSIC_OBJECTIVE_PAIRS[(id - 1) % CLASSIC_OBJECTIVE_PAIRS.length];
      pair = [clPair[0], clPair[1]];
    }

    const p1 = buildTargetAndParamForKind(pair[0], id, targetDistanceMeters);
    const p2 = buildTargetAndParamForKind(pair[1], id, targetDistanceMeters);

    const m1 = createObjective(id, 1, pair[0], p1.target, p1.param);
    const m2 = createObjective(id, 2, pair[1], p2.target, p2.param);

    const milestoneMult = isMilestone ? 1.75 : 1.0;
    const finishGold = roundTo((95 + t * 420) * milestoneMult, 5);
    const missionGold = roundTo((55 + t * 240) * milestoneMult, 5);
    const perfectBonusGold = roundTo((70 + t * 320) * milestoneMult, 5);
    const finishXp = roundTo((150 + t * 1500) * milestoneMult, 10);
    const replayGold = roundTo(25 + t * 80, 5);

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
  let failed = false;
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
      failed = !completed;
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
      failed = !completed;
      progressText = `${Math.ceil(metrics.elapsedSec)}/${spec.target} sn`;
      break;
    case 'roadEvents':
      current = Math.floor(metrics.roadEventsCount);
      completed = current >= spec.target;
      progressText = `${Math.min(current, spec.target)}/${spec.target}`;
      break;
    case 'cockpitOnly':
      current = metrics.stayedInCockpit ? 1 : 0;
      completed = metrics.stayedInCockpit;
      failed = !metrics.stayedInCockpit;
      progressText = metrics.stayedInCockpit ? '1. Şahıs ✓' : 'Bozuldu!';
      break;
    case 'cockpitNearMiss':
      current = Math.floor(metrics.cockpitNearMissCount);
      completed = current >= spec.target;
      progressText = `${Math.min(current, spec.target)}/${spec.target}`;
      break;
    case 'noBrake':
      current = metrics.usedBrake ? 0 : 1;
      completed = !metrics.usedBrake;
      failed = metrics.usedBrake;
      progressText = metrics.usedBrake ? 'Fren Yapıldı!' : 'Temiz ✓';
      break;
    case 'noNitro':
      current = metrics.usedNitro ? 0 : 1;
      completed = !metrics.usedNitro;
      failed = metrics.usedNitro;
      progressText = metrics.usedNitro ? 'Nitro Kullanıldı!' : 'Temiz ✓';
      break;
    case 'minSpeedHold':
      current = metrics.droppedBelowMinSpeed ? 0 : 1;
      completed = !metrics.droppedBelowMinSpeed;
      failed = metrics.droppedBelowMinSpeed;
      progressText = metrics.droppedBelowMinSpeed
        ? 'Baraj Düştü!'
        : metrics.minSpeedGraceActive
          ? 'Kalkış...'
          : `${spec.target}+ ✓`;
      break;
    case 'oncomingMeters':
      current = Math.floor(metrics.oncomingMeters);
      completed = current >= spec.target;
      progressText = `${Math.min(current, spec.target)}/${spec.target} m`;
      break;
    case 'highSpeedSec':
      current = Math.floor(metrics.highSpeedSeconds * 10) / 10;
      completed = metrics.highSpeedSeconds >= spec.target;
      progressText = `${Math.min(Math.floor(metrics.highSpeedSeconds), spec.target)}/${spec.target} sn`;
      break;
  }

  return {
    spec,
    current,
    target: spec.target,
    completed,
    failed,
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

  public claimStarChest(starsRequired: number): {
    ok: boolean;
    rewardGold: number;
    crateTierId?: CrateTierId;
    title: string;
  } {
    const chest = CAREER_STAR_CHESTS.find(
      (c) => c.starsRequired === starsRequired,
    );
    if (!chest) return { ok: false, rewardGold: 0, title: '' };
    if (this.claimedChests.has(starsRequired)) {
      return {
        ok: false,
        rewardGold: 0,
        crateTierId: chest.crateTierId,
        title: chest.title,
      };
    }
    const snap = this.getSnapshot();
    if (snap.totalStars < starsRequired) {
      return {
        ok: false,
        rewardGold: 0,
        crateTierId: chest.crateTierId,
        title: chest.title,
      };
    }
    this.claimedChests.add(starsRequired);
    this.save();
    return {
      ok: true,
      rewardGold: chest.rewardGold,
      crateTierId: chest.crateTierId,
      title: chest.title,
    };
  }
}

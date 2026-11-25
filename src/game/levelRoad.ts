import {
  CAR_COLORS,
  CarColorId,
  DRIFT_SMOKES,
  HEADLIGHTS,
  ItemRarity,
  MAX_LEVEL_ROAD_LEVEL,
  MIRROR_CHARMS,
  NITRO_FLAMES,
  PAINT_FINISHES,
  PLATE_STYLES,
  POWERUP_SPECS,
  PowerUpId,
  ROOF_HATS,
  STEERING_WHEELS,
  UNDERGLOWS,
  VisualCategory,
} from '../types/game';
import { CrateTierId } from '../services/storeCatalog';

export type LevelRoadRewardKind =
  | 'powerup_unlock'
  | 'car_color'
  | 'visual'
  | 'crate'
  | 'gold';

export interface LevelRoadReward {
  level: number;
  kind: LevelRoadRewardKind;
  rarity: ItemRarity;
  title: string;
  subtitle: string;
  badgeLabel: string;
  exclusive: boolean;
  swatch?: string;
  powerUpId?: PowerUpId;
  carColorId?: CarColorId;
  visualCategory?: VisualCategory;
  visualItemId?: string;
  crateTierId?: CrateTierId;
  goldAmount?: number;
  bonusGold?: number;
}

const VISUAL_CATEGORY_LABELS: Record<VisualCategory, string> = {
  paintFinish: 'ÖZEL BOYA YÜZEYİ',
  plateStyle: 'ÖZEL PLAKA',
  underglow: 'ÖZEL NEON',
  headlight: 'ÖZEL FAR',
  nitroFlame: 'ÖZEL NİTRO ALEVİ',
  driftSmoke: 'ÖZEL DRİFT DUMANI',
  roofHat: 'ÖZEL TAVAN AKSESUARI',
  steeringWheel: 'ÖZEL DİREKSİYON',
  mirrorCharm: 'ÖZEL AYNA SÜSÜ',
};

function makeColorReward(level: number, colorId: CarColorId): LevelRoadReward {
  const spec = CAR_COLORS.find((c) => c.id === colorId)!;
  return {
    level,
    kind: 'car_color',
    rarity: spec.rarity,
    title: spec.label,
    subtitle: 'Sadece Seviye Yolu özel araç boyası',
    badgeLabel: 'SEVİYE ÖZEL BOYA',
    exclusive: true,
    swatch: spec.swatch,
    carColorId: colorId,
  };
}

function makeVisualReward(
  level: number,
  category: VisualCategory,
  itemId: string,
  bonusGold = 0,
): LevelRoadReward {
  let name = itemId;
  let subtitle = 'Seviye Yolu özel kozmetik';
  let rarity: ItemRarity = 'epic';
  let swatch = 'linear-gradient(135deg, #facc15, #f97316)';

  if (category === 'paintFinish') {
    const s = PAINT_FINISHES.find((x) => x.id === itemId)!;
    name = s.name;
    subtitle = s.subtitle;
    rarity = s.rarity;
    swatch = s.swatch;
  } else if (category === 'plateStyle') {
    const s = PLATE_STYLES.find((x) => x.id === itemId)!;
    name = s.name;
    subtitle = s.subtitle;
    rarity = s.rarity;
    swatch = s.bgSwatch;
  } else if (category === 'underglow') {
    const s = UNDERGLOWS.find((x) => x.id === itemId)!;
    name = s.name;
    subtitle = s.subtitle;
    rarity = s.rarity;
    swatch = s.swatch;
  } else if (category === 'headlight') {
    const s = HEADLIGHTS.find((x) => x.id === itemId)!;
    name = s.name;
    subtitle = s.subtitle;
    rarity = s.rarity;
    swatch = s.swatch;
  } else if (category === 'nitroFlame') {
    const s = NITRO_FLAMES.find((x) => x.id === itemId)!;
    name = s.name;
    subtitle = s.subtitle;
    rarity = s.rarity;
    swatch = s.swatch;
  } else if (category === 'driftSmoke') {
    const s = DRIFT_SMOKES.find((x) => x.id === itemId)!;
    name = s.name;
    subtitle = s.subtitle;
    rarity = s.rarity;
    swatch = s.swatch;
  } else if (category === 'roofHat') {
    const s = ROOF_HATS.find((x) => x.id === itemId)!;
    name = s.name;
    subtitle = s.subtitle;
    rarity = s.rarity;
    swatch = s.swatch;
  } else if (category === 'steeringWheel') {
    const s = STEERING_WHEELS.find((x) => x.id === itemId)!;
    name = s.name;
    subtitle = s.subtitle;
    rarity = s.rarity;
    swatch = s.swatch;
  } else if (category === 'mirrorCharm') {
    const s = MIRROR_CHARMS.find((x) => x.id === itemId)!;
    name = s.name;
    subtitle = s.subtitle;
    rarity = s.rarity;
    swatch = s.swatch;
  }

  return {
    level,
    kind: 'visual',
    rarity,
    title: name,
    subtitle,
    badgeLabel: VISUAL_CATEGORY_LABELS[category],
    exclusive: true,
    swatch,
    visualCategory: category,
    visualItemId: itemId,
    bonusGold: bonusGold > 0 ? bonusGold : undefined,
  };
}

function makePowerUpReward(
  level: number,
  powerUpId: PowerUpId,
  bonusGold: number,
): LevelRoadReward {
  const spec = POWERUP_SPECS.find((p) => p.id === powerUpId)!;
  const swatchMap: Record<PowerUpId, string> = {
    nitro: 'linear-gradient(135deg, #06b6d4 0%, #38bdf8 100%)',
    repair: 'linear-gradient(135deg, #059669 0%, #34d399 100%)',
    magnet: 'linear-gradient(135deg, #e11d48 0%, #fb7185 100%)',
    rampage: 'linear-gradient(135deg, #ea580c 0%, #facc15 100%)',
  };
  const rarityMap: Record<PowerUpId, ItemRarity> = {
    nitro: 'rare',
    repair: 'rare',
    magnet: 'epic',
    rampage: 'legendary',
  };

  return {
    level,
    kind: 'powerup_unlock',
    rarity: rarityMap[powerUpId],
    title: `${spec.name} Açılır`,
    subtitle: `Artık otoyolda çıkar! +${bonusGold} Altın bonus`,
    badgeLabel: 'OTOYOL GÜCÜ AÇILIR',
    exclusive: true,
    swatch: swatchMap[powerUpId],
    powerUpId,
    bonusGold,
  };
}

function makeCrateReward(level: number, tierId: CrateTierId): LevelRoadReward {
  const meta: Record<
    CrateTierId,
    { title: string; subtitle: string; rarity: ItemRarity; swatch: string }
  > = {
    street: {
      title: 'Sokak Kasası',
      subtitle: 'Hemen açılır · Jant, boya veya araç şansı',
      rarity: 'rare',
      swatch: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
    },
    pro: {
      title: 'Pro Pist Kasası',
      subtitle: 'Hemen açılır · Destansı parça ve yüksek altın',
      rarity: 'epic',
      swatch: 'linear-gradient(135deg, #7e22ce 0%, #c084fc 100%)',
    },
    legendary: {
      title: 'Efsanevi Kasa',
      subtitle: 'Hemen açılır · Efsanevi süper araç & özel parça',
      rarity: 'legendary',
      swatch: 'linear-gradient(135deg, #e11d48 0%, #facc15 100%)',
    },
  };
  const m = meta[tierId];
  return {
    level,
    kind: 'crate',
    rarity: m.rarity,
    title: m.title,
    subtitle: m.subtitle,
    badgeLabel: 'ÜCRETSİZ KASA',
    exclusive: false,
    swatch: m.swatch,
    crateTierId: tierId,
  };
}

const FIXED_MILESTONES: Record<number, LevelRoadReward> = {
  1: {
    level: 1,
    kind: 'gold',
    rarity: 'common',
    title: '150 Altın',
    subtitle: 'Otoyola hoş geldin başlangıç ödülü',
    badgeLabel: 'BAŞLANGIÇ ÖDÜLÜ',
    exclusive: false,
    swatch: 'linear-gradient(135deg, #f59e0b 0%, #fde047 100%)',
    goldAmount: 150,
  },
  // Power-Up Unlocks clearly showcased on the Level Road
  2: makePowerUpReward(2, 'nitro', 200),
  3: makeColorReward(3, 'cobaltStorm'),
  5: makePowerUpReward(5, 'repair', 300),
  6: makeVisualReward(6, 'driftSmoke', 'bronzeSparkSmoke'),
  7: makeCrateReward(7, 'street'),
  8: makeVisualReward(8, 'mirrorCharm', 'checkeredFlag'),
  10: makeVisualReward(10, 'roofHat', 'racingHelmet'),
  12: makeColorReward(12, 'venomLime'),
  14: makeVisualReward(14, 'nitroFlame', 'emeraldNitro'),
  15: makePowerUpReward(15, 'magnet', 500),
  18: makeVisualReward(18, 'paintFinish', 'obsidianChrome'),
  20: makeCrateReward(20, 'street'),
  22: makeVisualReward(22, 'underglow', 'levelGoldPulse'),
  25: makeVisualReward(25, 'plateStyle', 'levelBronzePlate'),
  28: makeColorReward(28, 'solarCopper'),
  30: makeCrateReward(30, 'pro'),
  32: makeVisualReward(32, 'headlight', 'apexGoldBeam'),
  35: makePowerUpReward(35, 'rampage', 1000),
  36: makeVisualReward(36, 'mirrorCharm', 'goldPiston'),
  40: makeVisualReward(40, 'paintFinish', 'emeraldLiquid'),
  42: makeCrateReward(42, 'pro'),
  45: makeVisualReward(45, 'steeringWheel', 'levelCarbonPro'),
  48: makeColorReward(48, 'royalViolet'),
  50: makeVisualReward(50, 'roofHat', 'goldenTrophy', 1500),
  52: makeCrateReward(52, 'pro'),
  55: makeVisualReward(55, 'plateStyle', 'apexChampionPlate'),
  60: makeVisualReward(60, 'nitroFlame', 'imperialNitro'),
  62: makeCrateReward(62, 'legendary'),
  65: makeVisualReward(65, 'paintFinish', 'royalGoldHolo'),
  70: makeVisualReward(70, 'underglow', 'apexSpectrum'),
  72: makeCrateReward(72, 'legendary'),
  75: makeColorReward(75, 'championGold'),
  80: makeVisualReward(80, 'driftSmoke', 'apexChampionSmoke'),
  82: makeCrateReward(82, 'legendary'),
  85: makeVisualReward(85, 'mirrorCharm', 'apexStar'),
  88: makeVisualReward(88, 'headlight', 'crimsonNovaBeam'),
  90: makeColorReward(90, 'celestialCyan'),
  92: makeVisualReward(92, 'steeringWheel', 'apexEmperorWheel'),
  95: makeVisualReward(95, 'roofHat', 'apexCrown', 3000),
  96: makeCrateReward(96, 'legendary'),
  99: makeCrateReward(99, 'legendary'),
  100: makeVisualReward(100, 'paintFinish', 'apexEclipse', 10000),
};

function computeGoldForLevel(level: number): number {
  if (level <= 10) return 150 + level * 35;
  if (level <= 25) return 300 + level * 30;
  if (level <= 50) return 550 + level * 32;
  if (level <= 75) return 900 + level * 36;
  return 1400 + level * 42;
}

export const LEVEL_ROAD_REWARDS: readonly LevelRoadReward[] = Array.from(
  { length: MAX_LEVEL_ROAD_LEVEL },
  (_, idx) => {
    const level = idx + 1;
    const fixed = FIXED_MILESTONES[level];
    if (fixed) return fixed;

    const amount = Math.round(computeGoldForLevel(level) / 25) * 25;
    const rarity: ItemRarity =
      level >= 75 ? 'epic' : level >= 35 ? 'rare' : 'common';

    return {
      level,
      kind: 'gold',
      rarity,
      title: `${amount.toLocaleString('tr-TR')} Altın`,
      subtitle: `Seviye ${level} sürücü hazine ödülü`,
      badgeLabel: 'ALTIN ÖDÜLÜ',
      exclusive: false,
      swatch: 'linear-gradient(135deg, #f59e0b 0%, #fde047 100%)',
      goldAmount: amount,
    };
  },
);

export function getLevelRoadReward(level: number): LevelRoadReward | null {
  const safe = Math.floor(level);
  if (safe < 1 || safe > MAX_LEVEL_ROAD_LEVEL) return null;
  return LEVEL_ROAD_REWARDS[safe - 1] ?? null;
}

export function getUnclaimedLevelRewardsCount(
  playerLevel: number,
  claimedLevels: readonly number[],
): number {
  const maxReachable = Math.min(MAX_LEVEL_ROAD_LEVEL, Math.max(1, Math.floor(playerLevel)));
  const claimedSet = new Set(claimedLevels);
  let count = 0;
  for (let lv = 1; lv <= maxReachable; lv++) {
    if (!claimedSet.has(lv)) count++;
  }
  return count;
}

export function getRewardsUnlockedInRange(
  fromLevel: number,
  toLevel: number,
): LevelRoadReward[] {
  const start = Math.max(1, Math.floor(fromLevel) + 1);
  const end = Math.min(MAX_LEVEL_ROAD_LEVEL, Math.floor(toLevel));
  if (end < start) return [];
  const list: LevelRoadReward[] = [];
  for (let lv = start; lv <= end; lv++) {
    const r = getLevelRoadReward(lv);
    if (r) list.push(r);
  }
  return list;
}

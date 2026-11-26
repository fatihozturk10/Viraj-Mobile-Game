export type GamePhase = 'menu' | 'garage' | 'playing' | 'paused' | 'gameover';

export type GarageCameraFocus =
  | 'overview'
  | 'wheels'
  | 'spoiler'
  | 'bodykit'
  | 'livery'
  | 'headlight'
  | 'neon'
  | 'plate'
  | 'exhaust'
  | 'smoke'
  | 'roof'
  | 'steering'
  | 'mirror';

export type GameModeId = 'endless' | 'twoway' | 'timeattack' | 'bomb';

export type GameOverReason = 'crash' | 'timeout' | 'bomb' | 'career_win';

export interface GameModeSpec {
  id: GameModeId;
  label: string;
  shortLabel: string;
  tagline: string;
  rewardMultiplier: number;
  accentHex: string;
}

export const GAME_MODES: GameModeSpec[] = [
  {
    id: 'endless',
    label: 'Sonsuz Otoyol',
    shortLabel: 'Sonsuz',
    tagline: 'Klasik tek yön trafik ve kesintisiz sürüş',
    rewardMultiplier: 1.0,
    accentHex: '#f59e0b',
  },
];

export type AtmosphereId = 'golden' | 'night' | 'mist' | 'rainy' | 'cycle';

export type BiomeId = 'alpine' | 'desert' | 'arctic' | 'volcanic';

export type CarColorId =
  | 'pearl'
  | 'yellow'
  | 'crimson'
  | 'titanium'
  | 'cobalt'
  | 'emerald'
  | 'obsidian'
  | 'amethyst'
  | 'sunsetOrange'
  | 'roseGold'
  | 'cyberMint'
  | 'bordeaux'
  | 'cobaltStorm'
  | 'venomLime'
  | 'solarCopper'
  | 'royalViolet'
  | 'championGold'
  | 'celestialCyan'
  | 'midnightTeal'
  | 'cherryMagenta'
  | 'champagneSilver'
  | 'toxicAcid'
  | 'volcanicRed';

export type CarModelId =
  | 'dogan'
  | 'hatch'
  | 'gt'
  | 'rally'
  | 'pickup'
  | 'muscle'
  | 'm3gtr'
  | 'jdm'
  | 'porsche'
  | 'amggt'
  | 'hyper'
  | 'laferrari'
  | 'lambo'
  | 'mclarenp1'
  | 'bugatti'
  | 'jesko'
  | 'f1'
  | 'pagani'
  | 'bolide'
  | 'solaris';

export type CameraMode = 'chase' | 'cine' | 'cockpit' | 'hood';

export type SteeringControlMode = 'drag' | 'tilt';

export interface SteeringSettings {
  mode: SteeringControlMode;
  tiltSensitivity: number; // 0.6 - 1.8 (default 1.0)
}

export type WeatherKind = 'clear' | 'fog' | 'rain' | 'snow' | 'sandstorm';

export const CAMERA_MODES: { id: CameraMode; label: string }[] = [
  { id: 'chase', label: 'Takip' },
  { id: 'cine', label: 'Cine-Cam' },
  { id: 'cockpit', label: 'Kokpit' },
  { id: 'hood', label: 'Kaput' },
];

export type UpcomingCurve =
  | 'none'
  | 'left'
  | 'right'
  | 'sharp-left'
  | 'sharp-right';

export type ItemRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface ItemRarityMeta {
  id: ItemRarity;
  label: string;
  accentHex: string;
  glowHex: string;
  textClass: string;
  selectedTextClass: string;
  borderClass: string;
  cardTintClass: string;
  barClass: string;
  dotClass: string;
  badgeClass: string;
  selectedBadgeClass: string;
}

export const ITEM_RARITY_ORDER: readonly ItemRarity[] = [
  'common',
  'rare',
  'epic',
  'legendary',
] as const;

export const ITEM_RARITY_META: Record<ItemRarity, ItemRarityMeta> = {
  common: {
    id: 'common',
    label: 'Standart',
    accentHex: '#a1a1aa',
    glowHex: 'rgba(161, 161, 170, 0.28)',
    textClass: 'text-zinc-400',
    selectedTextClass: 'text-zinc-600',
    borderClass: 'border-white/10 hover:border-white/25',
    cardTintClass: 'bg-zinc-900/75',
    barClass: 'bg-zinc-500/70',
    dotClass: 'bg-zinc-400',
    badgeClass: 'border-zinc-500/35 bg-zinc-800/80 text-zinc-300',
    selectedBadgeClass: 'border-zinc-400/55 bg-zinc-200 text-zinc-700',
  },
  rare: {
    id: 'rare',
    label: 'Nadir',
    accentHex: '#38bdf8',
    glowHex: 'rgba(56, 189, 248, 0.35)',
    textClass: 'text-sky-300',
    selectedTextClass: 'text-sky-700',
    borderClass: 'border-sky-400/32 hover:border-sky-400/60',
    cardTintClass: 'bg-sky-950/24',
    barClass: 'bg-sky-400',
    dotClass: 'bg-sky-400',
    badgeClass: 'border-sky-400/40 bg-sky-500/15 text-sky-300',
    selectedBadgeClass: 'border-sky-500/45 bg-sky-100 text-sky-800',
  },
  epic: {
    id: 'epic',
    label: 'Destansı',
    accentHex: '#c084fc',
    glowHex: 'rgba(192, 132, 252, 0.42)',
    textClass: 'text-purple-300',
    selectedTextClass: 'text-purple-700',
    borderClass: 'border-purple-400/38 hover:border-purple-400/65',
    cardTintClass: 'bg-purple-950/28',
    barClass: 'bg-purple-400',
    dotClass: 'bg-purple-400',
    badgeClass: 'border-purple-400/45 bg-purple-500/18 text-purple-200',
    selectedBadgeClass: 'border-purple-500/45 bg-purple-100 text-purple-800',
  },
  legendary: {
    id: 'legendary',
    label: 'Efsanevi',
    accentHex: '#fb7185',
    glowHex: 'rgba(251, 113, 133, 0.48)',
    textClass: 'text-rose-300',
    selectedTextClass: 'text-rose-700',
    borderClass: 'border-rose-400/45 hover:border-rose-400/75',
    cardTintClass: 'bg-rose-950/28',
    barClass: 'bg-gradient-to-r from-amber-300 via-rose-400 to-rose-500',
    dotClass: 'bg-rose-400',
    badgeClass: 'border-rose-400/50 bg-rose-500/20 text-rose-200',
    selectedBadgeClass: 'border-rose-500/50 bg-rose-100 text-rose-800',
  },
};

export interface CarModelSpec {
  id: CarModelId;
  name: string;
  tagline: string;
  topSpeedBonusMs: number;
  steeringResponsiveness: number;
  cornerGrip: number; // 0.7 - 1.18 (higher = less centrifugal slide)
  maxIntegrity: number;
  speedRating: number; // 1-10
  handlingRating: number; // 1-10
  priceGold: number; // 0 = unlocked by default
  rarity: ItemRarity;
}

export interface CarColorOption {
  id: CarColorId;
  label: string;
  hex: number;
  swatch: string;
  accentHex: number;
  rarity: ItemRarity;
  levelRoadLevel?: number;
}

export interface AtmosphereOption {
  id: AtmosphereId;
  label: string;
  skyTop: string;
  skyHorizon: string;
  fogColor: number;
  fogDensity: number;
  sunColor: number;
  sunIntensity: number;
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  exposure: number;
  headlightsOn: boolean;
  lampsOn: boolean;
}

export type CarUpgradeKey = 'engine' | 'tires' | 'nitroTank' | 'nitroPower';

export type CarUpgrades = Record<CarUpgradeKey, number>;

export interface UpgradeSpec {
  key: CarUpgradeKey;
  label: string;
  description: string;
  bonusPerLevel: string;
}

export const MAX_UPGRADE_LEVEL = 4;
export const UPGRADE_COSTS = [120, 280, 560, 1050] as const;

export const UPGRADE_SPECS: UpgradeSpec[] = [
  {
    key: 'engine',
    label: 'Motor',
    description: 'Maksimum hızı artırır',
    bonusPerLevel: '+5 km/h',
  },
  {
    key: 'tires',
    label: 'Lastik',
    description: 'Viraj tutuşunu ve direksiyonu güçlendirir',
    bonusPerLevel: '+6% Tutuş',
  },
  {
    key: 'nitroTank',
    label: 'Nitro Deposu',
    description: 'Turbo yanma süresini ve verimliliğini artırır',
    bonusPerLevel: '+1 sn Süre',
  },
  {
    key: 'nitroPower',
    label: 'Nitro Seviyesi',
    description: 'Turbo hızını, itiş gücünü ve dolumu artırır',
    bonusPerLevel: '+8 km/h Güç',
  },
];

export function getMaxNitroCapacity(
  _nitroTankLevel = 0,
  nitroCapacityLevel = 0,
): number {
  return 100 + getNitroMaxCapacityBonus(nitroCapacityLevel);
}

export function getNitroDurationSec(
  nitroTankLevel: number,
  nitroCapacityLevel = 0,
): number {
  const baseDuration =
    4 + Math.max(0, Math.min(MAX_UPGRADE_LEVEL, nitroTankLevel));
  const capacityScale = getMaxNitroCapacity(nitroTankLevel, nitroCapacityLevel) / 100;
  return Number((baseDuration * capacityScale).toFixed(1));
}

export function getNitroDrainRatePerSec(nitroTankLevel: number): number {
  const baseDuration =
    4 + Math.max(0, Math.min(MAX_UPGRADE_LEVEL, nitroTankLevel));
  return 100 / baseDuration;
}

export type PowerUpId = 'nitro' | 'repair' | 'magnet' | 'rampage';

export type PowerUpUpgradeTrack = 'primary' | 'secondary';

export type PowerUpLevels = Record<PowerUpUpgradeTrack, number>;

export type PowerUpUpgrades = Record<PowerUpId, PowerUpLevels>;

export const MAX_POWERUP_UPGRADE_LEVEL = 5;

export interface PowerUpTrackSpec {
  key: PowerUpUpgradeTrack;
  label: string;
  formatValue: (level: number) => string;
}

export interface PowerUpSpec {
  id: PowerUpId;
  name: string;
  shortName: string;
  description: string;
  unlockLevel: number;
  costs: readonly [number, number, number, number, number];
  accentTextClass: string;
  accentBgClass: string;
  accentBorderClass: string;
  primary: PowerUpTrackSpec;
  secondary?: PowerUpTrackSpec;
}

export function getDefaultPowerUpUpgrades(): PowerUpUpgrades {
  return {
    nitro: { primary: 0, secondary: 0 },
    repair: { primary: 0, secondary: 0 },
    magnet: { primary: 0, secondary: 0 },
    rampage: { primary: 0, secondary: 0 },
  };
}

function clampPowerUpLevel(level: number): number {
  return Math.max(0, Math.min(MAX_POWERUP_UPGRADE_LEVEL, Math.floor(level || 0)));
}

export function getNitroPickupSpeedBonusKmh(level: number): number {
  return clampPowerUpLevel(level) * 6; // 0, +6, +12, +18, +24, +30 km/s
}

export function getNitroMaxCapacityBonus(level: number): number {
  return clampPowerUpLevel(level) * 20; // 0, +20, +40, +60, +80, +100 (100 -> 200)
}

export function getRepairHealRatio(level: number): number {
  const table = [0.45, 0.55, 0.65, 0.76, 0.88, 1.0] as const;
  return table[clampPowerUpLevel(level)];
}

export function getMagnetDurationSec(level: number): number {
  return 10 + clampPowerUpLevel(level) * 2; // 10, 12, 14, 16, 18, 20 sn
}

export function getMagnetRangeMeters(level: number): number {
  return 34 + clampPowerUpLevel(level) * 8; // 34, 42, 50, 58, 66, 74 m
}

export function getRampageDurationSec(level: number): number {
  return Number((3.5 + clampPowerUpLevel(level) * 0.5).toFixed(1)); // 3.5, 4, 4.5, 5, 5.5, 6 sn
}

export function getRampageSpeedMultiplier(level: number): number {
  return Number((2.0 + clampPowerUpLevel(level) * 0.15).toFixed(2)); // 2.0x -> 2.75x
}

export function formatSpeedMultiplier(mult: number): string {
  const fixed = mult.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
  return `${fixed}×`;
}

export const POWERUP_SPECS: PowerUpSpec[] = [
  {
    id: 'nitro',
    name: 'Nitro Paketi',
    shortName: 'Nitro',
    description: 'Nitro deposunu %100 doldurur; geliştirilince anlık hız itişi ve maksimum nitro kapasitesi artar.',
    unlockLevel: 2,
    costs: [140, 280, 480, 780, 1200],
    accentTextClass: 'text-cyan-300',
    accentBgClass: 'bg-cyan-400',
    accentBorderClass: 'border-cyan-400/35',
    primary: {
      key: 'primary',
      label: 'Anlık Hız İtişi',
      formatValue: (lvl) =>
        lvl === 0 ? 'Standart' : `+${getNitroPickupSpeedBonusKmh(lvl)} km/s`,
    },
    secondary: {
      key: 'secondary',
      label: 'Maksimum Kapasite',
      formatValue: (lvl) => `${getMaxNitroCapacity(0, lvl)}`,
    },
  },
  {
    id: 'repair',
    name: 'Tamir Kiti',
    shortName: 'Can Doldurma',
    description: 'Yolda araç gövdesini onarır; geliştirilince tek seferde yenilediği can oranı artar.',
    unlockLevel: 5,
    costs: [180, 360, 620, 980, 1450],
    accentTextClass: 'text-emerald-300',
    accentBgClass: 'bg-emerald-400',
    accentBorderClass: 'border-emerald-400/35',
    primary: {
      key: 'primary',
      label: 'Can Yenileme',
      formatValue: (lvl) => `%${Math.round(getRepairHealRatio(lvl) * 100)}`,
    },
  },
  {
    id: 'magnet',
    name: 'Altın Mıknatısı',
    shortName: 'Mıknatıs',
    description: 'Tüm şeritlerdeki altınları araca çeker; süresi ve çekim menzili geliştirilebilir.',
    unlockLevel: 15,
    costs: [220, 440, 760, 1200, 1800],
    accentTextClass: 'text-rose-300',
    accentBgClass: 'bg-rose-400',
    accentBorderClass: 'border-rose-400/35',
    primary: {
      key: 'primary',
      label: 'Aktif Süre',
      formatValue: (lvl) => `${getMagnetDurationSec(lvl)} sn`,
    },
    secondary: {
      key: 'secondary',
      label: 'Çekim Menzili',
      formatValue: (lvl) => `${getMagnetRangeMeters(lvl)} m`,
    },
  },
  {
    id: 'rampage',
    name: 'Şimşek (Yıkım Modu)',
    shortName: 'Şimşek',
    description: 'Hasarsızlık, çarptığın araçları patlatma ve katlanmış hız; süresi ve hız çarpanı artar.',
    unlockLevel: 35,
    costs: [350, 700, 1150, 1750, 2600],
    accentTextClass: 'text-orange-300',
    accentBgClass: 'bg-orange-400',
    accentBorderClass: 'border-orange-400/40',
    primary: {
      key: 'primary',
      label: 'Yıkım Süresi',
      formatValue: (lvl) => {
        const sec = getRampageDurationSec(lvl);
        return `${Number.isInteger(sec) ? sec : sec.toFixed(1)} sn`;
      },
    },
    secondary: {
      key: 'secondary',
      label: 'Hız Çarpanı',
      formatValue: (lvl) => formatSpeedMultiplier(getRampageSpeedMultiplier(lvl)),
    },
  },
];

export function getPowerUpSpec(id: PowerUpId): PowerUpSpec {
  return POWERUP_SPECS.find((p) => p.id === id) || POWERUP_SPECS[0];
}

export function getPowerUpUnlockLevel(id: PowerUpId): number {
  return getPowerUpSpec(id).unlockLevel;
}

export interface TuningClassInfo {
  total: number;
  max: number;
  label: string;
  textClass: string;
  barClass: string;
}

export function getTuningClassForUpgrades(upgrades: CarUpgrades): TuningClassInfo {
  const total =
    (upgrades.engine || 0) +
    (upgrades.tires || 0) +
    (upgrades.nitroTank || 0) +
    (upgrades.nitroPower || 0);
  const max = MAX_UPGRADE_LEVEL * 4;
  if (total >= 15) {
    return {
      total,
      max,
      label: 'Pro Spec',
      textClass: 'text-rose-300',
      barClass: 'bg-gradient-to-r from-amber-400 via-orange-400 to-rose-500',
    };
  }
  if (total >= 11) {
    return {
      total,
      max,
      label: 'Yarış',
      textClass: 'text-amber-300',
      barClass: 'bg-amber-400',
    };
  }
  if (total >= 6) {
    return {
      total,
      max,
      label: 'Modifiye',
      textClass: 'text-sky-300',
      barClass: 'bg-sky-400',
    };
  }
  if (total >= 1) {
    return {
      total,
      max,
      label: 'Cadde',
      textClass: 'text-emerald-300',
      barClass: 'bg-emerald-400',
    };
  }
  return {
    total,
    max,
    label: 'Standart',
    textClass: 'text-zinc-300',
    barClass: 'bg-zinc-400',
  };
}

export type WheelStyleId =
  | 'twin5'
  | 'multispoke'
  | 'deepdish'
  | 'turbine'
  | 'forgedY'
  | 'offroadBead'
  | 'meshHoneycomb'
  | 'aeroDisc'
  | 'wireClassic'
  | 'star5Deep'
  | 'bladeTurbo'
  | 'split6Pro'
  | 'retroSlot'
  | 'royalCrownRim'
  | 'animNeonPulse'
  | 'animReactor'
  | 'animMagma'
  | 'animCyberGrid'
  | 'animPrismVortex'
  | 'animLightning'
  | 'animEmeraldPulse'
  | 'animSolarFlare'
  | 'animFrostCrystal'
  | 'animGalaxyOrb'
  | 'meshBBS'
  | 'triBlade'
  | 'hexMono'
  | 'animVenomRing'
  | 'animRubyPulse'
  | 'wagonWoodWheel'
  | 'monsterMudTire'
  | 'voxelSquareWheel'
  | 'spikedMadMaxWheel'
  | 'hoverMaglevOrb';

export type WheelColorId =
  | 'silver'
  | 'gunmetal'
  | 'black'
  | 'gold'
  | 'bronze'
  | 'crimson'
  | 'cobalt'
  | 'chrome'
  | 'roseGoldRim'
  | 'emeraldRim'
  | 'violetRim'
  | 'whiteRim'
  | 'copperRim';

export interface WheelStyleSpec {
  id: WheelStyleId;
  name: string;
  subtitle: string;
  category: 'classic' | 'animated';
  animated?: boolean;
  colorMode: 'colorable' | 'fixed';
  fixedColorReason?: string;
  priceGold: number;
  rarity: ItemRarity;
  speedBonusMs: number;
  gripBonus: number;
  steerBonus: number;
  speedRatingBonus: number;
  handlingRatingBonus: number;
  effectLabel: string;
}

export interface WheelColorOption {
  id: WheelColorId;
  label: string;
  hex: number;
  swatch: string;
  metalness: number;
  roughness: number;
  rarity: ItemRarity;
}

export interface CarWheelConfig {
  style: WheelStyleId;
  color: WheelColorId;
}

export const WHEEL_STYLES: WheelStyleSpec[] = [
  {
    id: 'twin5',
    rarity: 'common',
    name: 'Çift 5-Kol',
    subtitle: 'Fabrika çıkışı dengeli alaşım tekerlek',
    category: 'classic',
    colorMode: 'colorable',
    priceGold: 0,
    speedBonusMs: 0,
    gripBonus: 0,
    steerBonus: 0,
    speedRatingBonus: 0,
    handlingRatingBonus: 0,
    effectLabel: 'Standart Denge',
  },
  {
    id: 'multispoke',
    rarity: 'common',
    name: 'Touring 10-Kol',
    subtitle: 'Hafif pist tekerleği',
    category: 'classic',
    colorMode: 'colorable',
    priceGold: 180,
    speedBonusMs: 0.55,
    gripBonus: 0.03,
    steerBonus: 0.28,
    speedRatingBonus: 0.2,
    handlingRatingBonus: 0.2,
    effectLabel: '+2 km/h · +3% Tutuş',
  },
  {
    id: 'deepdish',
    rarity: 'common',
    name: 'Derin Ofset',
    subtitle: 'Geniş yanaklı drift tekerleği',
    category: 'classic',
    colorMode: 'colorable',
    priceGold: 320,
    speedBonusMs: 0.25,
    gripBonus: 0.05,
    steerBonus: 0.45,
    speedRatingBonus: 0.1,
    handlingRatingBonus: 0.4,
    effectLabel: '+5% Tutuş · Keskin Tepki',
  },
  {
    id: 'turbine',
    rarity: 'rare',
    name: 'Aero Türbin',
    subtitle: 'Düşük sürtünmeli rüzgar kanatçıklı',
    category: 'classic',
    colorMode: 'colorable',
    priceGold: 480,
    speedBonusMs: 1.15,
    gripBonus: 0.02,
    steerBonus: 0.22,
    speedRatingBonus: 0.4,
    handlingRatingBonus: 0.1,
    effectLabel: '+4 km/h · +2% Tutuş',
  },
  {
    id: 'offroadBead',
    rarity: 'rare',
    name: 'Off-Road Beadlock',
    subtitle: '16 civatalı zırhlı arazi çemberi',
    category: 'classic',
    colorMode: 'colorable',
    priceGold: 540,
    speedBonusMs: 0.35,
    gripBonus: 0.06,
    steerBonus: 0.42,
    speedRatingBonus: 0.1,
    handlingRatingBonus: 0.4,
    effectLabel: '+6% Tutuş · Sağlam Yanak',
  },
  {
    id: 'meshHoneycomb',
    rarity: 'rare',
    name: 'Altıgen Örgü',
    subtitle: 'Hassas GT yarış petek jant & lastik',
    category: 'classic',
    colorMode: 'colorable',
    priceGold: 620,
    speedBonusMs: 0.8,
    gripBonus: 0.05,
    steerBonus: 0.48,
    speedRatingBonus: 0.3,
    handlingRatingBonus: 0.4,
    effectLabel: '+3 km/h · +5% Tutuş',
  },
  {
    id: 'forgedY',
    rarity: 'epic',
    name: 'Dövme Y-Mesh',
    subtitle: 'Ultra hafif merkez kilitli yarış tekerleği',
    category: 'classic',
    colorMode: 'colorable',
    priceGold: 750,
    speedBonusMs: 0.95,
    gripBonus: 0.06,
    steerBonus: 0.55,
    speedRatingBonus: 0.3,
    handlingRatingBonus: 0.5,
    effectLabel: '+3.5 km/h · +6% Tutuş',
  },
  {
    id: 'aeroDisc',
    rarity: 'epic',
    name: 'Karbon Aero Disk',
    subtitle: 'Kapalı karbon turbofan & kırmızı pist şeridi',
    category: 'classic',
    colorMode: 'fixed',
    fixedColorReason:
      'Ham karbon fiber aero disk ve kırmızı pist şeridi kendi sabit rengini korur.',
    priceGold: 880,
    speedBonusMs: 1.45,
    gripBonus: 0.04,
    steerBonus: 0.38,
    speedRatingBonus: 0.5,
    handlingRatingBonus: 0.3,
    effectLabel: '+5 km/h · +4% Tutuş',
  },
  {
    id: 'wireClassic',
    rarity: 'epic',
    name: 'Klasik Altın Tel',
    subtitle: '24K altın tel örgü & beyaz yanaklı lastik',
    category: 'classic',
    colorMode: 'fixed',
    fixedColorReason:
      '24K altın tel örgü ve beyaz yanaklı klasik lastik sabit renktedir.',
    priceGold: 960,
    speedBonusMs: 0.65,
    gripBonus: 0.05,
    steerBonus: 0.46,
    speedRatingBonus: 0.2,
    handlingRatingBonus: 0.4,
    effectLabel: '+2.5 km/h · +5% Tutuş',
  },
  {
    id: 'star5Deep',
    rarity: 'common',
    name: '5-Kol Yıldız',
    subtitle: 'Kalın içbükey JDM sokak yıldız jantı',
    category: 'classic',
    colorMode: 'colorable',
    priceGold: 260,
    speedBonusMs: 0.45,
    gripBonus: 0.04,
    steerBonus: 0.36,
    speedRatingBonus: 0.2,
    handlingRatingBonus: 0.3,
    effectLabel: '+1.6 km/h · +4% Tutuş',
  },
  {
    id: 'bladeTurbo',
    rarity: 'rare',
    name: 'Bıçak Türbin',
    subtitle: '7 kıvrımlı yönlü aero bıçak kanat jant',
    category: 'classic',
    colorMode: 'colorable',
    priceGold: 420,
    speedBonusMs: 0.9,
    gripBonus: 0.035,
    steerBonus: 0.34,
    speedRatingBonus: 0.3,
    handlingRatingBonus: 0.3,
    effectLabel: '+3.2 km/h · +3.5% Tutuş',
  },
  {
    id: 'split6Pro',
    rarity: 'rare',
    name: '6-Kol V-Yarış',
    subtitle: 'Ultra hafif merkez kilitli 6 çift V-kol',
    category: 'classic',
    colorMode: 'colorable',
    priceGold: 690,
    speedBonusMs: 0.9,
    gripBonus: 0.06,
    steerBonus: 0.52,
    speedRatingBonus: 0.3,
    handlingRatingBonus: 0.5,
    effectLabel: '+3.2 km/h · +6% Tutuş',
  },
  {
    id: 'retroSlot',
    rarity: 'common',
    name: 'Retro Disk',
    subtitle: '8 delikli klasik Amerikan kaslı çanak jant',
    category: 'classic',
    colorMode: 'colorable',
    priceGold: 360,
    speedBonusMs: 0.4,
    gripBonus: 0.045,
    steerBonus: 0.38,
    speedRatingBonus: 0.2,
    handlingRatingBonus: 0.3,
    effectLabel: '+1.5 km/h · +4.5% Tutuş',
  },
  {
    id: 'royalCrownRim',
    rarity: 'epic',
    name: '24K Kraliyet Jant',
    subtitle: 'Altın 12-kol lüks jant, zümrüt göbek & altın yanak',
    category: 'classic',
    colorMode: 'fixed',
    fixedColorReason:
      '24K altın kaplama ve zümrüt göbekli lüks tasarım sabit renktedir.',
    priceGold: 1080,
    speedBonusMs: 1.05,
    gripBonus: 0.06,
    steerBonus: 0.5,
    speedRatingBonus: 0.4,
    handlingRatingBonus: 0.5,
    effectLabel: '+3.8 km/h · +6% Tutuş',
  },
  {
    id: 'animNeonPulse',
    rarity: 'epic',
    name: 'Neon Halka',
    subtitle: 'Seçili renkte atan çift neon enerji halkası',
    category: 'animated',
    animated: true,
    colorMode: 'colorable',
    priceGold: 1150,
    speedBonusMs: 1.1,
    gripBonus: 0.06,
    steerBonus: 0.5,
    speedRatingBonus: 0.4,
    handlingRatingBonus: 0.4,
    effectLabel: '+4 km/h · +6% Tutuş',
  },
  {
    id: 'animReactor',
    rarity: 'epic',
    name: 'Plazma Reaktör',
    subtitle: 'Dönen enerji çekirdeği & seçili renk kıvılcımı',
    category: 'animated',
    animated: true,
    colorMode: 'colorable',
    priceGold: 1450,
    speedBonusMs: 1.25,
    gripBonus: 0.06,
    steerBonus: 0.54,
    speedRatingBonus: 0.4,
    handlingRatingBonus: 0.5,
    effectLabel: '+4.5 km/h · +6% Tutuş',
  },
  {
    id: 'animEmeraldPulse',
    rarity: 'epic',
    name: 'Zümrüt Matris',
    subtitle: 'Nabız gibi atan zümrüt altıgen ağ & dönen çekirdek',
    category: 'animated',
    animated: true,
    colorMode: 'fixed',
    fixedColorReason:
      'Zümrüt Matris kendi dijital yeşil neon ışık paletini kullanır.',
    priceGold: 1580,
    speedBonusMs: 1.3,
    gripBonus: 0.065,
    steerBonus: 0.56,
    speedRatingBonus: 0.4,
    handlingRatingBonus: 0.5,
    effectLabel: '+4.7 km/h · +6.5% Tutuş',
  },
  {
    id: 'animMagma',
    rarity: 'legendary',
    name: 'İnferno Lav',
    subtitle: 'Obsidyen gövdede parlayan erimiş magma damarları',
    category: 'animated',
    animated: true,
    colorMode: 'fixed',
    fixedColorReason:
      'İnferno Lav erimiş kor ve alev animasyonu için kendi ateş paletini kullanır.',
    priceGold: 1750,
    speedBonusMs: 1.35,
    gripBonus: 0.07,
    steerBonus: 0.56,
    speedRatingBonus: 0.5,
    handlingRatingBonus: 0.5,
    effectLabel: '+5 km/h · +7% Tutuş',
  },
  {
    id: 'animFrostCrystal',
    rarity: 'legendary',
    name: 'Buzul Kristal',
    subtitle: 'Ters dönen elmas buz kristali kolları & soğuk hale',
    category: 'animated',
    animated: true,
    colorMode: 'fixed',
    fixedColorReason:
      'Buzul Kristal sıfır altı buz mavisi-beyaz kristal ışıklarını kullanır.',
    priceGold: 1890,
    speedBonusMs: 1.4,
    gripBonus: 0.075,
    steerBonus: 0.58,
    speedRatingBonus: 0.5,
    handlingRatingBonus: 0.5,
    effectLabel: '+5 km/h · +7.5% Tutuş',
  },
  {
    id: 'animCyberGrid',
    rarity: 'legendary',
    name: 'Siber Hologram',
    subtitle: 'Ters dönen sonsuz cyan-mor hologram halkaları',
    category: 'animated',
    animated: true,
    colorMode: 'fixed',
    fixedColorReason:
      'Siber Hologram iç içe dönen sabit neon cyan-mor ışık halkalarına sahiptir.',
    priceGold: 2050,
    speedBonusMs: 1.45,
    gripBonus: 0.07,
    steerBonus: 0.6,
    speedRatingBonus: 0.5,
    handlingRatingBonus: 0.6,
    effectLabel: '+5.2 km/h · +7% Tutuş',
  },
  {
    id: 'animLightning',
    rarity: 'legendary',
    name: 'Şimşek Ark',
    subtitle: 'Yüksek voltajlı elektrik mavi zikzak ark & çakar halka',
    category: 'animated',
    animated: true,
    colorMode: 'fixed',
    fixedColorReason:
      'Şimşek Ark yüksek voltaj elektrik mavisi ve beyaz kıvılcım paleti kullanır.',
    priceGold: 2220,
    speedBonusMs: 1.5,
    gripBonus: 0.075,
    steerBonus: 0.62,
    speedRatingBonus: 0.5,
    handlingRatingBonus: 0.6,
    effectLabel: '+5.4 km/h · +7.5% Tutuş',
  },
  {
    id: 'animSolarFlare',
    rarity: 'legendary',
    name: 'Güneş Alevi',
    subtitle: 'Dönen altın güneş korona bıçakları & alev çekirdeği',
    category: 'animated',
    animated: true,
    colorMode: 'fixed',
    fixedColorReason:
      'Güneş Alevi parlayan altın-turuncu güneş korona paletine sahiptir.',
    priceGold: 2380,
    speedBonusMs: 1.55,
    gripBonus: 0.075,
    steerBonus: 0.64,
    speedRatingBonus: 0.6,
    handlingRatingBonus: 0.6,
    effectLabel: '+5.6 km/h · +7.5% Tutuş',
  },
  {
    id: 'animGalaxyOrb',
    rarity: 'legendary',
    name: 'Galaksi Girdap',
    subtitle: 'Çift yörüngeli mor-cyan nebula halkaları & yıldız göbek',
    category: 'animated',
    animated: true,
    colorMode: 'fixed',
    fixedColorReason:
      'Galaksi Girdap kozmik mor, safir ve pembe nebula renk geçişi kullanır.',
    priceGold: 2490,
    speedBonusMs: 1.58,
    gripBonus: 0.08,
    steerBonus: 0.65,
    speedRatingBonus: 0.6,
    handlingRatingBonus: 0.6,
    effectLabel: '+5.7 km/h · +8% Tutuş',
  },
  {
    id: 'animPrismVortex',
    rarity: 'legendary',
    name: 'Prizma Girdap',
    subtitle: 'Gökkuşağı spektrumunda dönen prizmatik girdap',
    category: 'animated',
    animated: true,
    colorMode: 'fixed',
    fixedColorReason:
      'Prizma Girdap sürekli gökkuşağı spektrumunda renk değiştirdiği için renk seçimi kapalıdır.',
    priceGold: 2550,
    speedBonusMs: 1.6,
    gripBonus: 0.08,
    steerBonus: 0.65,
    speedRatingBonus: 0.6,
    handlingRatingBonus: 0.6,
    effectLabel: '+5.8 km/h · +8% Tutuş',
  },
  {
    id: 'triBlade',
    rarity: 'rare',
    name: '3-Kol JDM Drift',
    subtitle: 'Geniş 3 kollu klasik Japon sokak drift jantı',
    category: 'classic',
    colorMode: 'colorable',
    priceGold: 440,
    speedBonusMs: 0.65,
    gripBonus: 0.055,
    steerBonus: 0.46,
    speedRatingBonus: 0.2,
    handlingRatingBonus: 0.4,
    effectLabel: '+2.3 km/h · +5.5% Tutuş',
  },
  {
    id: 'meshBBS',
    rarity: 'rare',
    name: 'Klasik Yarış Örgü',
    subtitle: '16 çapraz telli merkez kilitli efsane GT örgüsü',
    category: 'classic',
    colorMode: 'colorable',
    priceGold: 580,
    speedBonusMs: 0.85,
    gripBonus: 0.055,
    steerBonus: 0.48,
    speedRatingBonus: 0.3,
    handlingRatingBonus: 0.4,
    effectLabel: '+3.1 km/h · +5.5% Tutuş',
  },
  {
    id: 'hexMono',
    rarity: 'epic',
    name: 'Monoblok Altıgen',
    subtitle: 'Dövme alüminyum 6 pencereli lüks monoblok jant',
    category: 'classic',
    colorMode: 'colorable',
    priceGold: 790,
    speedBonusMs: 1.05,
    gripBonus: 0.06,
    steerBonus: 0.52,
    speedRatingBonus: 0.4,
    handlingRatingBonus: 0.5,
    effectLabel: '+3.8 km/h · +6% Tutuş',
  },
  {
    id: 'animVenomRing',
    rarity: 'legendary',
    name: 'Zehirli Girdap',
    subtitle: 'Dönen asit yeşili biyo-bıçaklar ve neon yanak halkası',
    category: 'animated',
    animated: true,
    colorMode: 'fixed',
    fixedColorReason:
      'Zehirli Girdap neon asit yeşili ve zümrüt enerji paletini kullanır.',
    priceGold: 1980,
    speedBonusMs: 1.48,
    gripBonus: 0.075,
    steerBonus: 0.6,
    speedRatingBonus: 0.5,
    handlingRatingBonus: 0.6,
    effectLabel: '+5.3 km/h · +7.5% Tutuş',
  },
  {
    id: 'animRubyPulse',
    rarity: 'legendary',
    name: 'Yakut Reaktör',
    subtitle: 'Ters dönen yakut-altın türbin bıçakları ve nabız çekirdeği',
    category: 'animated',
    animated: true,
    colorMode: 'fixed',
    fixedColorReason:
      'Yakut Reaktör kızıl yakut ve 24K altın ışık paletini kullanır.',
    priceGold: 2320,
    speedBonusMs: 1.56,
    gripBonus: 0.08,
    steerBonus: 0.64,
    speedRatingBonus: 0.6,
    handlingRatingBonus: 0.6,
    effectLabel: '+5.6 km/h · +8% Tutuş',
  },
  {
    id: 'wagonWoodWheel',
    rarity: 'rare',
    name: 'Ahşap At Arabası Tekeri',
    subtitle: 'Lastiksiz, demir çemberli ve 12 ahşap parmaklı sıfırdan el yapımı tekerlek',
    category: 'classic',
    colorMode: 'fixed',
    fixedColorReason: 'Ahşap At Arabası Tekeri doğal meşe ahşap ve dövme demir dokusunu kullanır.',
    priceGold: 480,
    speedBonusMs: 0.45,
    gripBonus: 0.04,
    steerBonus: 0.25,
    speedRatingBonus: 0.2,
    handlingRatingBonus: 0.3,
    effectLabel: '+1.6 km/h · +4% Tutuş',
  },
  {
    id: 'monsterMudTire',
    rarity: 'epic',
    name: 'Dev Çamur Tekeri',
    subtitle: '16 iri dişli off-road çamur bloğu ve cıvatalı arazi çemberli dev tekerlek',
    category: 'classic',
    colorMode: 'fixed',
    fixedColorReason: 'Dev Çamur Tekeri mat arazi kauçuğu ve askeri çelik çember paletini kullanır.',
    priceGold: 860,
    speedBonusMs: 0.78,
    gripBonus: 0.072,
    steerBonus: 0.45,
    speedRatingBonus: 0.3,
    handlingRatingBonus: 0.6,
    effectLabel: '+2.8 km/h · +7.2% Tutuş',
  },
  {
    id: 'voxelSquareWheel',
    rarity: 'epic',
    name: 'Küp Voxel Tekerlek',
    subtitle: 'Yuvarlak lastiksiz, tamamen 8-bit obsidyen-taş-elmas küplerden oluşan voxel tekerlek',
    category: 'classic',
    colorMode: 'fixed',
    fixedColorReason: 'Küp Voxel Tekerlek 8-bit obsidyen, taş ve parlayan elmas blok renklerini kullanır.',
    priceGold: 920,
    speedBonusMs: 0.85,
    gripBonus: 0.062,
    steerBonus: 0.48,
    speedRatingBonus: 0.4,
    handlingRatingBonus: 0.5,
    effectLabel: '+3.1 km/h · +6.2% Tutuş',
  },
  {
    id: 'spikedMadMaxWheel',
    rarity: 'epic',
    name: 'Dikenli Mad Max Tekeri',
    subtitle: 'Zırhlı paslı çelik tambur, 12 sırt dikeni ve dışa uzanan gladyatör göbek mızrağı',
    category: 'classic',
    colorMode: 'fixed',
    fixedColorReason: 'Dikenli Mad Max Tekeri paslı zırh çeliği ve dövme demir diken paletini kullanır.',
    priceGold: 980,
    speedBonusMs: 0.95,
    gripBonus: 0.068,
    steerBonus: 0.5,
    speedRatingBonus: 0.4,
    handlingRatingBonus: 0.5,
    effectLabel: '+3.4 km/h · +6.8% Tutuş',
  },
  {
    id: 'hoverMaglevOrb',
    rarity: 'legendary',
    name: 'Manyetik Hover Küre',
    subtitle: 'Lastiksiz ve göbeksiz havada süzülen neon enerji halkası + dönen manyetik küre',
    category: 'animated',
    animated: true,
    colorMode: 'fixed',
    fixedColorReason: 'Manyetik Hover Küre camgöbeği-mor manyetik plazma paletini kullanır.',
    priceGold: 2480,
    speedBonusMs: 1.65,
    gripBonus: 0.085,
    steerBonus: 0.72,
    speedRatingBonus: 0.6,
    handlingRatingBonus: 0.7,
    effectLabel: '+5.9 km/h · +8.5% Tutuş',
  },
];

export const WHEEL_COLORS: WheelColorOption[] = [
  {
    id: 'silver',
    rarity: 'common',
    label: 'Parlak Gümüş',
    hex: 0xe4e4e7,
    swatch: '#e4e4e7',
    metalness: 0.9,
    roughness: 0.18,
  },
  {
    id: 'chrome',
    rarity: 'epic',
    label: 'Ayna Krom',
    hex: 0xf8fafc,
    swatch: '#f8fafc',
    metalness: 0.98,
    roughness: 0.08,
  },
  {
    id: 'gunmetal',
    rarity: 'common',
    label: 'Antrasit Gri',
    hex: 0x52525b,
    swatch: '#52525b',
    metalness: 0.85,
    roughness: 0.24,
  },
  {
    id: 'black',
    rarity: 'common',
    label: 'Satin Siyah',
    hex: 0x18181b,
    swatch: '#18181b',
    metalness: 0.72,
    roughness: 0.26,
  },
  {
    id: 'gold',
    rarity: 'legendary',
    label: 'Yarış Altını',
    hex: 0xeab308,
    swatch: '#eab308',
    metalness: 0.88,
    roughness: 0.2,
  },
  {
    id: 'bronze',
    rarity: 'rare',
    label: 'Mat Bronz',
    hex: 0x9a5b25,
    swatch: '#9a5b25',
    metalness: 0.8,
    roughness: 0.3,
  },
  {
    id: 'crimson',
    rarity: 'rare',
    label: 'Kırmızı Şerit',
    hex: 0xdc2626,
    swatch: '#dc2626',
    metalness: 0.8,
    roughness: 0.22,
  },
  {
    id: 'cobalt',
    rarity: 'rare',
    label: 'Elektrik Mavi',
    hex: 0x0284c7,
    swatch: '#0284c7',
    metalness: 0.82,
    roughness: 0.2,
  },
  {
    id: 'whiteRim',
    rarity: 'common',
    label: 'Ralli Beyazı',
    hex: 0xf8fafc,
    swatch: '#f8fafc',
    metalness: 0.45,
    roughness: 0.22,
  },
  {
    id: 'emeraldRim',
    rarity: 'rare',
    label: 'Zümrüt Yeşil',
    hex: 0x10b981,
    swatch: '#10b981',
    metalness: 0.82,
    roughness: 0.2,
  },
  {
    id: 'copperRim',
    rarity: 'rare',
    label: 'Yanık Bakır',
    hex: 0xc2410c,
    swatch: '#c2410c',
    metalness: 0.86,
    roughness: 0.22,
  },
  {
    id: 'violetRim',
    rarity: 'epic',
    label: 'Ametist Mor',
    hex: 0x9333ea,
    swatch: '#9333ea',
    metalness: 0.84,
    roughness: 0.18,
  },
  {
    id: 'roseGoldRim',
    rarity: 'epic',
    label: 'Roze Altın',
    hex: 0xf4a4a4,
    swatch: '#f4a4a4',
    metalness: 0.92,
    roughness: 0.15,
  },
];

export function getDefaultWheelForCar(modelId: CarModelId): CarWheelConfig {
  switch (modelId) {
    case 'm3gtr':
      return { style: 'multispoke', color: 'silver' };
    case 'amggt':
      return { style: 'forgedY', color: 'black' };
    case 'laferrari':
      return { style: 'forgedY', color: 'gunmetal' };
    case 'mclarenp1':
      return { style: 'turbine', color: 'black' };
    case 'jesko':
      return { style: 'forgedY', color: 'gold' };
    case 'pagani':
      return { style: 'forgedY', color: 'bronze' };
    case 'bolide':
      return { style: 'turbine', color: 'cobalt' };
    case 'solaris':
      return { style: 'forgedY', color: 'gold' };
    case 'lambo':
    case 'bugatti':
      return { style: 'twin5', color: 'gunmetal' };
    default:
      return { style: 'twin5', color: 'silver' };
  }
}

export type BodyKitId =
  | 'stock'
  | 'street'
  | 'gtAero'
  | 'widebody'
  | 'cyberWide'
  | 'f1TrackPro'
  | 'driftSpec'
  | 'rallyArmor'
  | 'gt3Endurance'
  | 'royalGoldWide'
  | 'hyperPlasmaKit'
  | 'madMaxArmor'
  | 'dragBlowerKit'
  | 'bosozokuExotic'
  | 'cyberExoMech';
export type SpoilerId =
  | 'none'
  | 'ducktail'
  | 'streetWing'
  | 'gtCarbon'
  | 'rallyTwin'
  | 'whaleTail'
  | 'roofLouver'
  | 'dragonV'
  | 'timeAttack'
  | 'goldRoyalWing'
  | 'animActiveAero'
  | 'animNeonBlade'
  | 'animPlasmaWing'
  | 'animRgbPrismWing'
  | 'gt3Swan'
  | 'twinBladeCarbon'
  | 'viperArch'
  | 'animCyberHaloWing'
  | 'animInfernoWing'
  | 'parkBenchWood'
  | 'chassisMountDrift'
  | 'twinSharkFin'
  | 'biplaneTriWing'
  | 'batWings'
  | 'katanaCrossWing'
  | 'scrapMadMaxWing'
  | 'pixelVoxelWing'
  | 'animJetThrusterWing'
  | 'animAngelWings';
export type LiveryId =
  | 'solid'
  | 'racingStripes'
  | 'carbonHood'
  | 'sideBolt'
  | 'rallyCheck'
  | 'camoGeo'
  | 'goldPinstripe'
  | 'cyberCircuit'
  | 'flameTribal'
  | 'sakuraDrift'
  | 'carbonGoldGeo'
  | 'galaxyNebula'
  | 'cyberSamurai'
  | 'animPulseGrid'
  | 'animPlasmaWave'
  | 'animHeatwave'
  | 'animMatrixRain'
  | 'animInterstellar'
  | 'gtNumber'
  | 'tigerClaw'
  | 'tokyoDrifter'
  | 'cyberHexArmor'
  | 'animThunderVolt'
  | 'gulfHeritage'
  | 'hazardStripes'
  | 'sharkMouth'
  | 'martiniRally'
  | 'minecraftPixel'
  | 'animSynthwave'
  | 'animAuroraFrost'
  | 'animGoldenDragon'
  | 'istanbulTaxi'
  | 'toyCarBlocks'
  | 'watermelonWrap'
  | 'policeInterceptor'
  | 'comicSketch'
  | 'streetGraffiti'
  | 'lightning95'
  | 'animComicSpeed'
  | 'animCandyPop'
  | 'pixelBlock8Bit'
  | 'tetrominoBlocks'
  | 'windowsBsod'
  | 'animVenomSymbiote'
  | 'animLiquidAquarium'
  | 'knittedSweater'
  | 'carvedWood'
  | 'lushGrassTurf'
  | 'mysteryMachine'
  | 'animWindStream'
  | 'omnitrixAlien'
  | 'animSakuraStorm'
  | 'animGlitchCorrupt'
  | 'animToxicAcid'
  | 'animOceanBiolum'
  | 'animHeartbeatEcg'
  | 'animHoloCircuit'
  | 'animHypnoSpiral'
  | 'animWarpHyperdrive'
  | 'animCyberEqualizer'
  | 'animSolarEclipse'
  | 'animCrysisNanosuit';

export interface BodyKitSpec {
  id: BodyKitId;
  name: string;
  subtitle: string;
  priceGold: number;
  rarity: ItemRarity;
  speedBonusMs: number;
  gripBonus: number;
  speedRatingBonus: number;
  handlingRatingBonus: number;
  effectLabel: string;
  animated?: boolean;
}

export interface SpoilerSpec {
  id: SpoilerId;
  name: string;
  subtitle: string;
  priceGold: number;
  rarity: ItemRarity;
  speedBonusMs: number;
  gripBonus: number;
  speedRatingBonus: number;
  handlingRatingBonus: number;
  effectLabel: string;
  animated?: boolean;
}

export interface LiverySpec {
  id: LiveryId;
  name: string;
  subtitle: string;
  priceGold: number;
  rarity: ItemRarity;
  accentSwatch: string;
  category: 'none' | 'decal' | 'fullWrap' | 'animated';
  overridesBaseColor?: boolean;
  animated?: boolean;
}

export type PaintFinishId =
  | 'metallic'
  | 'matte'
  | 'chrome'
  | 'carbon'
  | 'chameleon'
  | 'satinGold'
  | 'frostedIce'
  | 'forgedCarbon'
  | 'prismHolo'
  | 'obsidianChrome'
  | 'emeraldLiquid'
  | 'royalGoldHolo'
  | 'apexEclipse'
  | 'velvetPearl'
  | 'brushedTitanium'
  | 'candyGloss'
  | 'copperLiquid'
  | 'nebulaShift';

export type PlateStyleId =
  | 'classic'
  | 'vipBlack'
  | 'goldFrame'
  | 'carbonPlate'
  | 'neonGlow'
  | 'jdmTokyo'
  | 'dubaiLux'
  | 'crimsonNeon'
  | 'imperialGold'
  | 'vintageRetro'
  | 'californiaSunset'
  | 'nurburgringTrack'
  | 'roseGoldChrome'
  | 'animRgbChase'
  | 'animPoliceStrobe'
  | 'animCyberMatrix'
  | 'animKnightScan'
  | 'animFlameBorder'
  | 'animHoloPrism'
  | 'animStealthFlip'
  | 'levelBronzePlate'
  | 'apexChampionPlate'
  | 'emeraldCarbon'
  | 'tokyoNeonPink'
  | 'arcticIce'
  | 'animGoldPulse'
  | 'animCyberLightning';

export type UnderglowId =
  | 'none'
  | 'cyan'
  | 'purple'
  | 'red'
  | 'green'
  | 'gold'
  | 'iceWhite'
  | 'cyberPink'
  | 'pulseCyan'
  | 'plasmaSunset'
  | 'policeStrobe'
  | 'rainbow'
  | 'auroraWave'
  | 'cyberBreathe'
  | 'lavaPulse'
  | 'levelGoldPulse'
  | 'apexSpectrum'
  | 'cobaltBlue'
  | 'amberFire'
  | 'mintIce'
  | 'royalVioletPulse'
  | 'emeraldWave';

export type HeadlightId =
  | 'stock'
  | 'iceXenon'
  | 'gtYellow'
  | 'purpleLed'
  | 'demonRed'
  | 'emeraldLaser'
  | 'cyberPinkLed'
  | 'solarGold'
  | 'prismWhite'
  | 'apexGoldBeam'
  | 'crimsonNovaBeam'
  | 'sapphireLaser'
  | 'amberDrift'
  | 'mintNeonLed'
  | 'violetPhantom'
  | 'roseDiamond';

export type NitroFlameId =
  | 'blue'
  | 'purplePlasma'
  | 'venomGreen'
  | 'goldFlame'
  | 'redCrackle'
  | 'iceCrystal'
  | 'cyberMagenta'
  | 'solarInferno'
  | 'phantomVoid'
  | 'emeraldDragon'
  | 'whiteLightning'
  | 'cherryBlossom'
  | 'animRainbowJet'
  | 'animPoliceNitro'
  | 'animAuroraPlasma'
  | 'emeraldNitro'
  | 'imperialNitro'
  | 'cobaltJet'
  | 'amberSpark'
  | 'toxicLime'
  | 'rubyPlasma'
  | 'animGoldenStorm';

export type DriftSmokeId =
  | 'white'
  | 'red'
  | 'pink'
  | 'blue'
  | 'gold'
  | 'emerald'
  | 'violet'
  | 'obsidian'
  | 'fireEmber'
  | 'turquoise'
  | 'crimsonVelvet'
  | 'rainbow'
  | 'animCyberTrail'
  | 'animAuroraSmoke'
  | 'animLavaTrail'
  | 'animPoliceSmoke'
  | 'bronzeSparkSmoke'
  | 'apexChampionSmoke'
  | 'orange'
  | 'lime'
  | 'iceBlue'
  | 'magenta'
  | 'animGoldGlitter';

export type RoofHatId =
  | 'none'
  | 'baseball'
  | 'fez'
  | 'cowboy'
  | 'propeller'
  | 'tophat'
  | 'viking'
  | 'crown'
  | 'sombrero'
  | 'pirate'
  | 'chef'
  | 'samurai'
  | 'ushanka'
  | 'policeBeacon'
  | 'haloAngel'
  | 'ufoSaucer'
  | 'wizardHat'
  | 'flameMohawk'
  | 'racingHelmet'
  | 'goldenTrophy'
  | 'apexCrown'
  | 'beret'
  | 'beanie'
  | 'astronaut'
  | 'devilHorns'
  | 'cyberVisorCrown'
  | 'trafficCone'
  | 'taxiSign'
  | 'sharkFinHat'
  | 'pumpkinLantern'
  | 'headcrabHat'
  | 'pharaohNemes'
  | 'companionCube'
  | 'diamondHelmet'
  | 'rubberDuck'
  | 'hardHat'
  | 'sushiRoll'
  | 'graduationCap'
  | 'knightHelmet'
  | 'catEars'
  | 'ramenBowl'
  | 'creeperHead'
  | 'miniHeliRotor'
  | 'blackHoleOrb';

export type SteeringWheelId =
  | 'stock'
  | 'wood'
  | 'alcantara'
  | 'carbonD'
  | 'f1Yoke'
  | 'driftNeo'
  | 'goldVip'
  | 'retroChain'
  | 'rallyDish'
  | 'woodenBoat'
  | 'camoTactical'
  | 'marbleLux'
  | 'cyberTron'
  | 'magmaCore'
  | 'rgbPrismWheel'
  | 'stealthJet'
  | 'hyperHolo'
  | 'levelCarbonPro'
  | 'apexEmperorWheel'
  | 'leatherRed'
  | 'titaniumSport'
  | 'driftSuedeBlue'
  | 'emeraldCarbon'
  | 'plasmaYoke'
  | 'scrapMadMax'
  | 'obsidianMagma'
  | 'pixelVoxel'
  | 'hevLambda'
  | 'headcrab'
  | 'aperturePortal'
  | 'wheatleyCore'
  | 'craftingTable';

export type MirrorCharmId =
  | 'none'
  | 'nazar'
  | 'dice'
  | 'pine'
  | 'boxingGloves'
  | 'crescentStar'
  | 'turbo'
  | 'goldCrown'
  | 'miniHelmet'
  | 'goldenHorseshoe'
  | 'miniWheel'
  | 'skullChrome'
  | 'katanaMini'
  | 'discoBall'
  | 'crystalPrism'
  | 'plasmaOrb'
  | 'neonHeart'
  | 'miniJet'
  | 'checkeredFlag'
  | 'goldPiston'
  | 'apexStar'
  | 'luckyClover'
  | 'miniTrophy'
  | 'miniNitro'
  | 'diamondGem'
  | 'cyberSkull'
  | 'turkishTea'
  | 'soccerBall'
  | 'miniDuck'
  | 'coffeeCup'
  | 'simitRing'
  | 'pizzaSlice'
  | 'donutGlazed'
  | 'gamepadMini'
  | 'keychain8Ball'
  | 'miniHeadcrab'
  | 'companionCharm'
  | 'pokeballMini'
  | 'creeperCharm'
  | 'ufoCharm'
  | 'ghostGlow'
  | 'lambdaCharm'
  | 'wheatleyCharm'
  | 'saturnPlanet'
  | 'dragonEgg'
  | 'infinityCube';

export type VisualCategory =
  | 'paintFinish'
  | 'plateStyle'
  | 'underglow'
  | 'headlight'
  | 'nitroFlame'
  | 'driftSmoke'
  | 'roofHat'
  | 'steeringWheel'
  | 'mirrorCharm';

export interface VisualUnlocks {
  paintFinish: PaintFinishId[];
  plateStyle: PlateStyleId[];
  underglow: UnderglowId[];
  headlight: HeadlightId[];
  nitroFlame: NitroFlameId[];
  driftSmoke: DriftSmokeId[];
  roofHat: RoofHatId[];
  steeringWheel: SteeringWheelId[];
  mirrorCharm: MirrorCharmId[];
}

export interface CarCustomConfig {
  bodyKit: BodyKitId;
  spoiler: SpoilerId;
  livery: LiveryId;
  paintFinish: PaintFinishId;
  plateStyle: PlateStyleId;
  underglow: UnderglowId;
  headlight: HeadlightId;
  nitroFlame: NitroFlameId;
  driftSmoke: DriftSmokeId;
  roofHat: RoofHatId;
  steeringWheel: SteeringWheelId;
  mirrorCharm: MirrorCharmId;
}

export interface RoofHatSpec {
  id: RoofHatId;
  name: string;
  subtitle: string;
  priceGold: number;
  rarity: ItemRarity;
  swatch: string;
  animated?: boolean;
  levelRoadLevel?: number;
}

export interface SteeringWheelSpec {
  id: SteeringWheelId;
  name: string;
  subtitle: string;
  priceGold: number;
  rarity: ItemRarity;
  swatch: string;
  hasShiftLeds?: boolean;
  animated?: boolean;
  levelRoadLevel?: number;
}

export interface MirrorCharmSpec {
  id: MirrorCharmId;
  name: string;
  subtitle: string;
  priceGold: number;
  rarity: ItemRarity;
  swatch: string;
  animated?: boolean;
  levelRoadLevel?: number;
}

export interface PaintFinishSpec {
  id: PaintFinishId;
  name: string;
  subtitle: string;
  priceGold: number;
  rarity: ItemRarity;
  swatch: string;
  colorMode: 'full' | 'tinted' | 'fixed';
  fixedColorReason?: string;
  levelRoadLevel?: number;
}

export interface PlateStyleSpec {
  id: PlateStyleId;
  name: string;
  subtitle: string;
  priceGold: number;
  rarity: ItemRarity;
  bgSwatch: string;
  frameSwatch: string;
  textSwatch?: string;
  animated?: boolean;
  levelRoadLevel?: number;
}

export interface UnderglowSpec {
  id: UnderglowId;
  name: string;
  subtitle: string;
  priceGold: number;
  rarity: ItemRarity;
  hex: number;
  swatch: string;
  mode:
    | 'off'
    | 'static'
    | 'pulse'
    | 'pulseWarm'
    | 'strobe'
    | 'rainbow'
    | 'aurora'
    | 'cyberBreathe'
    | 'lavaPulse';
  levelRoadLevel?: number;
}

export interface HeadlightSpec {
  id: HeadlightId;
  name: string;
  subtitle: string;
  priceGold: number;
  rarity: ItemRarity;
  bulbHex: number;
  emissiveHex: number;
  beamHex: number;
  swatch: string;
  levelRoadLevel?: number;
}

export interface NitroFlameSpec {
  id: NitroFlameId;
  name: string;
  subtitle: string;
  priceGold: number;
  rarity: ItemRarity;
  coreHex: number;
  midHex: number;
  tipHex: number;
  coneHex: number;
  swatch: string;
  animated?: boolean;
  animatedMode?: 'rainbow' | 'strobe' | 'aurora';
  levelRoadLevel?: number;
}

export interface DriftSmokeSpec {
  id: DriftSmokeId;
  name: string;
  subtitle: string;
  priceGold: number;
  rarity: ItemRarity;
  smokeHex: number;
  swatch: string;
  rainbow?: boolean;
  animated?: boolean;
  colorMode?: 'solid' | 'rainbow' | 'cyber' | 'aurora' | 'lava' | 'police';
  levelRoadLevel?: number;
}

export const BODY_KITS: BodyKitSpec[] = [
  {
    id: 'stock',
    rarity: 'common',
    name: 'Fabrika Gövde',
    subtitle: 'Orijinal tampon ve marşpiyel',
    priceGold: 0,
    speedBonusMs: 0,
    gripBonus: 0,
    speedRatingBonus: 0,
    handlingRatingBonus: 0,
    effectLabel: 'Standart',
  },
  {
    id: 'street',
    rarity: 'common',
    name: 'Sokak Lip Kiti',
    subtitle: 'Ön splitter, yan etek ve arka difüzör',
    priceGold: 220,
    speedBonusMs: 0.45,
    gripBonus: 0.02,
    speedRatingBonus: 0.2,
    handlingRatingBonus: 0.2,
    effectLabel: '+1.6 km/h · +2% Tutuş',
  },
  {
    id: 'gtAero',
    rarity: 'rare',
    name: 'GT Karbon Aero',
    subtitle: 'Çift kanard, kaput hava girişi ve GT difüzör',
    priceGold: 440,
    speedBonusMs: 0.9,
    gripBonus: 0.04,
    speedRatingBonus: 0.4,
    handlingRatingBonus: 0.3,
    effectLabel: '+3.2 km/h · +4% Tutuş',
  },
  {
    id: 'widebody',
    rarity: 'epic',
    name: 'Geniş Gövde Pro',
    subtitle: 'Geniş çamurluk kemerleri ve pro aero paketi',
    priceGold: 680,
    speedBonusMs: 0.75,
    gripBonus: 0.06,
    speedRatingBonus: 0.3,
    handlingRatingBonus: 0.5,
    effectLabel: '+2.7 km/h · +6% Tutuş',
  },
  {
    id: 'cyberWide',
    rarity: 'epic',
    name: 'Siber Neon Kit',
    subtitle: 'Işıklı neon splitter şeridi ve geniş siber difüzör',
    priceGold: 980,
    speedBonusMs: 1.05,
    gripBonus: 0.065,
    speedRatingBonus: 0.4,
    handlingRatingBonus: 0.5,
    effectLabel: '+3.8 km/h · +6.5% Tutuş',
    animated: true,
  },
  {
    id: 'f1TrackPro',
    rarity: 'legendary',
    name: 'Pist Time-Attack',
    subtitle: 'Dev ön bıçak, çift kanard, yan bıçaklar ve yarış difüzörü',
    priceGold: 1280,
    speedBonusMs: 1.35,
    gripBonus: 0.075,
    speedRatingBonus: 0.5,
    handlingRatingBonus: 0.6,
    effectLabel: '+4.8 km/h · +7.5% Tutuş',
  },
  {
    id: 'driftSpec',
    rarity: 'rare',
    name: 'Drift Spec Kit',
    subtitle: 'Alçak drift ön bıçak, yan rüzgar etekleri ve ikiz difüzör',
    priceGold: 360,
    speedBonusMs: 0.6,
    gripBonus: 0.035,
    speedRatingBonus: 0.2,
    handlingRatingBonus: 0.3,
    effectLabel: '+2.2 km/h · +3.5% Tutuş',
  },
  {
    id: 'rallyArmor',
    rarity: 'rare',
    name: 'Ralli Zırh Kiti',
    subtitle: 'Ön koruma plakası, geniş çamurluk korumaları ve ralli barı',
    priceGold: 520,
    speedBonusMs: 0.55,
    gripBonus: 0.055,
    speedRatingBonus: 0.2,
    handlingRatingBonus: 0.5,
    effectLabel: '+2 km/h · +5.5% Tutuş',
  },
  {
    id: 'gt3Endurance',
    rarity: 'epic',
    name: 'GT3 Dayanıklılık',
    subtitle: 'Üç katlı ön kanard, uzun karbon splitter ve GT3 difüzörü',
    priceGold: 820,
    speedBonusMs: 1.0,
    gripBonus: 0.06,
    speedRatingBonus: 0.4,
    handlingRatingBonus: 0.5,
    effectLabel: '+3.6 km/h · +6% Tutuş',
  },
  {
    id: 'royalGoldWide',
    rarity: 'epic',
    name: '24K Altın Geniş Kit',
    subtitle: 'Geniş çamurluklar ve 24K fırçalanmış altın aero kenarları',
    priceGold: 1120,
    speedBonusMs: 1.15,
    gripBonus: 0.07,
    speedRatingBonus: 0.4,
    handlingRatingBonus: 0.6,
    effectLabel: '+4.1 km/h · +7% Tutuş',
  },
  {
    id: 'hyperPlasmaKit',
    rarity: 'legendary',
    name: 'Plazma Hiper Kit',
    subtitle: 'Geniş karbon gövde, atan mor-altın plazma şeritleri ve bıçaklar',
    priceGold: 1480,
    speedBonusMs: 1.45,
    gripBonus: 0.08,
    speedRatingBonus: 0.5,
    handlingRatingBonus: 0.7,
    effectLabel: '+5.2 km/h · +8% Tutuş',
    animated: true,
  },
  {
    id: 'madMaxArmor',
    rarity: 'epic',
    name: 'Mad Max Çorak Zırh',
    subtitle: 'Ön dikenli V-küreme tamponu, yan krom egzoz boruları ve paslı çelik koruma kafesi',
    priceGold: 960,
    speedBonusMs: 0.95,
    gripBonus: 0.068,
    speedRatingBonus: 0.4,
    handlingRatingBonus: 0.5,
    effectLabel: '+3.4 km/h · +6.8% Tutuş',
  },
  {
    id: 'dragBlowerKit',
    rarity: 'epic',
    name: 'Süperşarj Drag Kiti',
    subtitle: 'Kaputtan fırlayan krom V8 süperşarj, yan alev egzozları ve arka wheelie tekerleri',
    priceGold: 1080,
    speedBonusMs: 1.25,
    gripBonus: 0.062,
    speedRatingBonus: 0.5,
    handlingRatingBonus: 0.5,
    effectLabel: '+4.5 km/h · +6.2% Tutuş',
  },
  {
    id: 'bosozokuExotic',
    rarity: 'epic',
    name: 'Japon Bosozoku Kiti',
    subtitle: 'Uzatılmış ön burun, harici yağ soğutucu, kutu çamurluklar ve göğe uzanan 4 egzoz',
    priceGold: 1140,
    speedBonusMs: 1.1,
    gripBonus: 0.072,
    speedRatingBonus: 0.4,
    handlingRatingBonus: 0.6,
    effectLabel: '+4 km/h · +7.2% Tutuş',
  },
  {
    id: 'cyberExoMech',
    rarity: 'legendary',
    name: 'Siber Dış İskelet',
    subtitle: 'Tavanı saran titanyum dış kafes, ışıklı yan enerji podları ve arka türbin halkaları',
    priceGold: 1680,
    speedBonusMs: 1.55,
    gripBonus: 0.085,
    speedRatingBonus: 0.6,
    handlingRatingBonus: 0.8,
    effectLabel: '+5.6 km/h · +8.5% Tutuş',
    animated: true,
  },
];

export const SPOILERS: SpoilerSpec[] = [
  {
    id: 'none',
    rarity: 'common',
    name: 'Orijinal',
    subtitle: 'Fabrika çıkışı arka görünüm',
    priceGold: 0,
    speedBonusMs: 0,
    gripBonus: 0,
    speedRatingBonus: 0,
    handlingRatingBonus: 0,
    effectLabel: 'Standart',
  },
  {
    id: 'ducktail',
    rarity: 'common',
    name: 'Ducktail Lip',
    subtitle: 'Bagaj kapağına entegre alçak spoyler',
    priceGold: 160,
    speedBonusMs: 0.2,
    gripBonus: 0.02,
    speedRatingBonus: 0.1,
    handlingRatingBonus: 0.2,
    effectLabel: '+2% Viraj Tutuşu',
  },
  {
    id: 'whaleTail',
    rarity: 'common',
    name: 'Balina Kuyruk',
    subtitle: 'Klasik kauçuk kenarlı geniş retro rüzgarlık',
    priceGold: 240,
    speedBonusMs: 0.28,
    gripBonus: 0.03,
    speedRatingBonus: 0.1,
    handlingRatingBonus: 0.3,
    effectLabel: '+1 km/h · +3% Tutuş',
  },
  {
    id: 'roofLouver',
    rarity: 'rare',
    name: 'Tavan & Lip Çift',
    subtitle: 'Arka cam üstü karbon kanatçık ve bagaj dudağı',
    priceGold: 290,
    speedBonusMs: 0.32,
    gripBonus: 0.032,
    speedRatingBonus: 0.1,
    handlingRatingBonus: 0.3,
    effectLabel: '+1.2 km/h · +3.2% Tutuş',
  },
  {
    id: 'streetWing',
    rarity: 'rare',
    name: 'Spor Rüzgarlık',
    subtitle: 'Çift ayaklı alüminyum spor kanat',
    priceGold: 320,
    speedBonusMs: 0.35,
    gripBonus: 0.035,
    speedRatingBonus: 0.2,
    handlingRatingBonus: 0.3,
    effectLabel: '+1.3 km/h · +3.5% Tutuş',
  },
  {
    id: 'rallyTwin',
    rarity: 'rare',
    name: 'Ralli Çift Kat',
    subtitle: 'WRC tipi iki katlı kanat ve orta denge bıçağı',
    priceGold: 460,
    speedBonusMs: 0.45,
    gripBonus: 0.048,
    speedRatingBonus: 0.2,
    handlingRatingBonus: 0.4,
    effectLabel: '+1.6 km/h · +4.8% Tutuş',
  },
  {
    id: 'gtCarbon',
    rarity: 'rare',
    name: 'GT Karbon Kanat',
    subtitle: 'Yüksek bastırma kuvvetli pist kanadı',
    priceGold: 560,
    speedBonusMs: 0.55,
    gripBonus: 0.055,
    speedRatingBonus: 0.2,
    handlingRatingBonus: 0.5,
    effectLabel: '+2 km/h · +5.5% Tutuş',
  },
  {
    id: 'dragonV',
    rarity: 'epic',
    name: 'V-Kanat Stealth',
    subtitle: 'Martı kanadı açılı agresif V-karbon spoyler',
    priceGold: 680,
    speedBonusMs: 0.68,
    gripBonus: 0.058,
    speedRatingBonus: 0.3,
    handlingRatingBonus: 0.5,
    effectLabel: '+2.4 km/h · +5.8% Tutuş',
  },
  {
    id: 'timeAttack',
    rarity: 'epic',
    name: 'Time Attack Dev',
    subtitle: 'Çift katmanlı dev pist kanadı ve şasi destekleri',
    priceGold: 840,
    speedBonusMs: 0.78,
    gripBonus: 0.068,
    speedRatingBonus: 0.3,
    handlingRatingBonus: 0.6,
    effectLabel: '+2.8 km/h · +6.8% Tutuş',
  },
  {
    id: 'goldRoyalWing',
    rarity: 'epic',
    name: '24K Altın GT',
    subtitle: 'Ayna altın ayaklı ve 24K şeritli lüks GT kanadı',
    priceGold: 980,
    speedBonusMs: 0.85,
    gripBonus: 0.065,
    speedRatingBonus: 0.3,
    handlingRatingBonus: 0.6,
    effectLabel: '+3 km/h · +6.5% Tutuş',
  },
  {
    id: 'animActiveAero',
    rarity: 'epic',
    name: 'Aktif DRS Kanat',
    subtitle: 'Hıza göre açılıp kapanan hidrolik aktif aero kanat',
    priceGold: 1180,
    speedBonusMs: 1.05,
    gripBonus: 0.072,
    speedRatingBonus: 0.4,
    handlingRatingBonus: 0.6,
    effectLabel: '+3.8 km/h · +7.2% Tutuş',
    animated: true,
  },
  {
    id: 'animNeonBlade',
    rarity: 'legendary',
    name: 'Siber Neon Kanat',
    subtitle: 'Yanıp sönen camgöbeği-mor LED şeritli gece kanadı',
    priceGold: 1340,
    speedBonusMs: 1.1,
    gripBonus: 0.074,
    speedRatingBonus: 0.4,
    handlingRatingBonus: 0.6,
    effectLabel: '+4 km/h · +7.4% Tutuş',
    animated: true,
  },
  {
    id: 'animPlasmaWing',
    rarity: 'legendary',
    name: 'Plazma Hologram',
    subtitle: 'İki kule arasında havada süzülen enerji kanadı',
    priceGold: 1580,
    speedBonusMs: 1.2,
    gripBonus: 0.078,
    speedRatingBonus: 0.5,
    handlingRatingBonus: 0.7,
    effectLabel: '+4.3 km/h · +7.8% Tutuş',
    animated: true,
  },
  {
    id: 'animRgbPrismWing',
    rarity: 'legendary',
    name: 'RGB Prizma Kanat',
    subtitle: 'Tam spektrum renk değiştiren kristal LED pist kanadı',
    priceGold: 1850,
    speedBonusMs: 1.35,
    gripBonus: 0.082,
    speedRatingBonus: 0.5,
    handlingRatingBonus: 0.7,
    effectLabel: '+4.8 km/h · +8.2% Tutuş',
    animated: true,
  },
  {
    id: 'gt3Swan',
    rarity: 'rare',
    name: 'Kuğu Boyun GT3',
    subtitle: 'Üstten askılı kuğu boyun karbon pist kanadı',
    priceGold: 490,
    speedBonusMs: 0.5,
    gripBonus: 0.052,
    speedRatingBonus: 0.2,
    handlingRatingBonus: 0.4,
    effectLabel: '+1.8 km/h · +5.2% Tutuş',
  },
  {
    id: 'twinBladeCarbon',
    rarity: 'epic',
    name: 'Çift Bıçak Aero',
    subtitle: 'Üst üste çift profilli kavisli karbon pist kanadı',
    priceGold: 740,
    speedBonusMs: 0.72,
    gripBonus: 0.064,
    speedRatingBonus: 0.3,
    handlingRatingBonus: 0.5,
    effectLabel: '+2.6 km/h · +6.4% Tutuş',
  },
  {
    id: 'viperArch',
    rarity: 'epic',
    name: 'Köprü Kemer Kanat',
    subtitle: 'Gövdeye entegre tam genişlikte hiper otomobil kemer kanadı',
    priceGold: 920,
    speedBonusMs: 0.88,
    gripBonus: 0.066,
    speedRatingBonus: 0.3,
    handlingRatingBonus: 0.6,
    effectLabel: '+3.2 km/h · +6.6% Tutuş',
  },
  {
    id: 'animCyberHaloWing',
    rarity: 'legendary',
    name: 'Siber Halka Kanat',
    subtitle: 'İki kule üzerinde atan neon enerji halkalı siber kanat',
    priceGold: 1490,
    speedBonusMs: 1.18,
    gripBonus: 0.076,
    speedRatingBonus: 0.4,
    handlingRatingBonus: 0.7,
    effectLabel: '+4.2 km/h · +7.6% Tutuş',
    animated: true,
  },
  {
    id: 'animInfernoWing',
    rarity: 'legendary',
    name: 'İnferno Alev Kanat',
    subtitle: 'Obsidiyen gövdeli, kor ateş şeritli nabız atan yarış kanadı',
    priceGold: 1720,
    speedBonusMs: 1.28,
    gripBonus: 0.08,
    speedRatingBonus: 0.5,
    handlingRatingBonus: 0.7,
    effectLabel: '+4.6 km/h · +8% Tutuş',
    animated: true,
  },
  {
    id: 'parkBenchWood',
    rarity: 'common',
    name: 'Ahşap Piknik Bankı',
    subtitle: 'Döküm demir ayaklı ve 3 çıtalı gerçek ahşap park bankı rüzgarlığı',
    priceGold: 280,
    speedBonusMs: 0.28,
    gripBonus: 0.036,
    speedRatingBonus: 0.1,
    handlingRatingBonus: 0.2,
    effectLabel: '+1 km/h · +3.6% Tutuş',
  },
  {
    id: 'chassisMountDrift',
    rarity: 'rare',
    name: 'Dev Şasi Drift Kanadı',
    subtitle: 'Arka tampona inen çapraz X-kafesli yüksek martı kanatlı drift rüzgarlığı',
    priceGold: 460,
    speedBonusMs: 0.55,
    gripBonus: 0.056,
    speedRatingBonus: 0.2,
    handlingRatingBonus: 0.4,
    effectLabel: '+2 km/h · +5.6% Tutuş',
  },
  {
    id: 'twinSharkFin',
    rarity: 'rare',
    name: 'Savaş Uçağı Kuyruğu',
    subtitle: 'Yatay kanatsız, dışa açılı V-kuyruk ikiz jet dikey dengeleyicileri',
    priceGold: 540,
    speedBonusMs: 0.65,
    gripBonus: 0.054,
    speedRatingBonus: 0.3,
    handlingRatingBonus: 0.4,
    effectLabel: '+2.3 km/h · +5.4% Tutuş',
  },
  {
    id: 'biplaneTriWing',
    rarity: 'epic',
    name: 'Üç Katlı Tırmanış Kanadı',
    subtitle: 'Pikes Peak tarzı üst üste kademeli 3 katlı devasa ralli kanadı',
    priceGold: 780,
    speedBonusMs: 0.78,
    gripBonus: 0.068,
    speedRatingBonus: 0.3,
    handlingRatingBonus: 0.5,
    effectLabel: '+2.8 km/h · +6.8% Tutuş',
  },
  {
    id: 'batWings',
    rarity: 'epic',
    name: 'Yarasa Kanatları',
    subtitle: 'Dışa kıvrılan keskin kemik kollu ve dilimli gotik yarasa kanatları',
    priceGold: 840,
    speedBonusMs: 0.85,
    gripBonus: 0.066,
    speedRatingBonus: 0.3,
    handlingRatingBonus: 0.5,
    effectLabel: '+3.1 km/h · +6.6% Tutuş',
  },
  {
    id: 'scrapMadMaxWing',
    rarity: 'epic',
    name: 'Hurda Mad Max Kanat',
    subtitle: 'Paslı kaynaklı sac levha, inşaat demiri ayaklar ve dikenli çorak kanat',
    priceGold: 860,
    speedBonusMs: 0.86,
    gripBonus: 0.065,
    speedRatingBonus: 0.3,
    handlingRatingBonus: 0.5,
    effectLabel: '+3.1 km/h · +6.5% Tutuş',
  },
  {
    id: 'katanaCrossWing',
    rarity: 'epic',
    name: 'Çapraz Katana Kanat',
    subtitle: 'Bagaj üstünde X şeklinde çaprazlanmış iki dev samuray katanası',
    priceGold: 890,
    speedBonusMs: 0.9,
    gripBonus: 0.067,
    speedRatingBonus: 0.3,
    handlingRatingBonus: 0.6,
    effectLabel: '+3.2 km/h · +6.7% Tutuş',
  },
  {
    id: 'pixelVoxelWing',
    rarity: 'epic',
    name: 'Piksel Voxel Kanat',
    subtitle: 'Tamamen 8-bit küp bloklardan oluşan basamaklı elmas-obsidyen rüzgarlık',
    priceGold: 910,
    speedBonusMs: 0.92,
    gripBonus: 0.068,
    speedRatingBonus: 0.4,
    handlingRatingBonus: 0.6,
    effectLabel: '+3.3 km/h · +6.8% Tutuş',
  },
  {
    id: 'animJetThrusterWing',
    rarity: 'legendary',
    name: 'İkiz Jet Türbin Kanat',
    subtitle: 'İki yanda yanan art yakıcı jet türbinleri ve hıza duyarlı hareketli DRS kanadı',
    priceGold: 1620,
    speedBonusMs: 1.32,
    gripBonus: 0.08,
    speedRatingBonus: 0.5,
    handlingRatingBonus: 0.7,
    effectLabel: '+4.8 km/h · +8% Tutuş',
    animated: true,
  },
  {
    id: 'animAngelWings',
    rarity: 'legendary',
    name: 'Işıklı Melek Kanatları',
    subtitle: 'Bagaj üstünde havada süzülen katmanlı altın-buz mavisi kristal kanatlar',
    priceGold: 1780,
    speedBonusMs: 1.38,
    gripBonus: 0.084,
    speedRatingBonus: 0.5,
    handlingRatingBonus: 0.8,
    effectLabel: '+5 km/h · +8.4% Tutuş',
    animated: true,
  },
];

export const LIVERIES: LiverySpec[] = [
  {
    id: 'solid',
    rarity: 'common',
    name: 'Desen Yok',
    subtitle: 'Sadece seçili boya rengi ve yüzeyi görünür',
    priceGold: 0,
    accentSwatch: 'linear-gradient(135deg, #d4d4d8 0%, #71717a 100%)',
    category: 'none',
  },
  {
    id: 'racingStripes',
    rarity: 'common',
    name: 'Yarış Şeritleri',
    subtitle: 'Çift merkez pist şeridi grafiği',
    priceGold: 150,
    accentSwatch: 'linear-gradient(90deg, #18181b 22%, #f59e0b 22%, #f59e0b 45%, #18181b 45%, #18181b 55%, #f59e0b 55%, #f59e0b 78%, #18181b 78%)',
    category: 'decal',
  },
  {
    id: 'carbonHood',
    rarity: 'common',
    name: 'Karbon Kaput',
    subtitle: 'Örgü karbon kaput ve tavan paneli',
    priceGold: 240,
    accentSwatch: 'repeating-linear-gradient(45deg, #27272a 0px, #27272a 4px, #111113 4px, #111113 8px)',
    category: 'decal',
  },
  {
    id: 'sideBolt',
    rarity: 'rare',
    name: 'Yıldırım Şerit',
    subtitle: 'Yan gövde hız şeridi grafikleri',
    priceGold: 320,
    accentSwatch: 'linear-gradient(120deg, #0f172a 0%, #38bdf8 52%, #e0f2fe 100%)',
    category: 'decal',
  },
  {
    id: 'rallyCheck',
    rarity: 'rare',
    name: 'Damalı Pist',
    subtitle: 'Arka çamurluk damalı bayrak grafiği',
    priceGold: 420,
    accentSwatch: 'repeating-linear-gradient(90deg, #f8fafc 0px, #f8fafc 6px, #18181b 6px, #18181b 12px)',
    category: 'decal',
  },
  {
    id: 'camoGeo',
    rarity: 'rare',
    name: 'Geometrik Kamuflaj',
    subtitle: 'Modern çokgen yarış grafiği',
    priceGold: 540,
    accentSwatch: 'linear-gradient(135deg, #1e293b 0%, #64748b 45%, #0f172a 65%, #38bdf8 100%)',
    category: 'decal',
  },
  {
    id: 'goldPinstripe',
    rarity: 'rare',
    name: 'Altın Şerit Pro',
    subtitle: 'Siyah merkez omurga ve 24K ince altın çizgiler',
    priceGold: 640,
    accentSwatch: 'linear-gradient(90deg, #09090b 0%, #09090b 32%, #facc15 48%, #fef08a 52%, #09090b 68%, #09090b 100%)',
    category: 'decal',
  },
  {
    id: 'cyberCircuit',
    rarity: 'epic',
    name: 'Siber Devre',
    subtitle: 'Fütüristik neon camgöbeği-mor devre yolları',
    priceGold: 780,
    accentSwatch: 'linear-gradient(90deg, #083344 0%, #22d3ee 45%, #e879f9 100%)',
    category: 'decal',
  },
  {
    id: 'flameTribal',
    rarity: 'epic',
    name: 'Alev Yarış',
    subtitle: 'Burundan çamurluklara uzanan sıcak alev grafiği',
    priceGold: 860,
    accentSwatch: 'linear-gradient(90deg, #dc2626 0%, #f97316 55%, #fef08a 100%)',
    category: 'decal',
  },
  {
    id: 'sakuraDrift',
    rarity: 'rare',
    name: 'Sakura Drift',
    subtitle: 'Yan gövdede Tokyo kiraz çiçeği dalları ve kırmızı şeritler',
    priceGold: 740,
    accentSwatch: 'linear-gradient(120deg, #18181b 0%, #f472b6 45%, #fbcfe8 72%, #dc2626 100%)',
    category: 'decal',
  },
  {
    id: 'carbonGoldGeo',
    rarity: 'epic',
    name: 'Kraliyet Geometrik',
    subtitle: 'Mat siyah çokgen zırh ve 24K altın keskin hatlar',
    priceGold: 940,
    accentSwatch: 'linear-gradient(135deg, #09090b 0%, #27272a 42%, #facc15 52%, #18181b 62%, #eab308 100%)',
    category: 'decal',
  },
  {
    id: 'galaxyNebula',
    rarity: 'epic',
    name: 'Kozmik Nebula',
    subtitle: 'Tüm gövdeyi kaplayan derin uzay bulutsusu ve yıldız tozu',
    priceGold: 1120,
    accentSwatch: 'linear-gradient(120deg, #070316 0%, #c026d3 42%, #22d3ee 76%, #0f172a 100%)',
    category: 'fullWrap',
    overridesBaseColor: true,
  },
  {
    id: 'cyberSamurai',
    rarity: 'epic',
    name: 'Siber Samuray',
    subtitle: 'Synthwave ızgarası ve neon katana kesiği tam gövde kaplama',
    priceGold: 1350,
    accentSwatch: 'linear-gradient(125deg, #09061a 0%, #ef4444 38%, #06b6d4 72%, #1e1b4b 100%)',
    category: 'fullWrap',
    overridesBaseColor: true,
  },
  {
    id: 'animPulseGrid',
    rarity: 'epic',
    name: 'Hex Dalga',
    subtitle: 'Gövdeden burundan kuyruğa akan neon altıgen enerji dalgası',
    priceGold: 1480,
    accentSwatch: 'linear-gradient(115deg, #082f49 0%, #22d3ee 44%, #a855f7 74%, #0f172a 100%)',
    category: 'animated',
    animated: true,
  },
  {
    id: 'animPlasmaWave',
    rarity: 'legendary',
    name: 'Sıvı Plazma',
    subtitle: 'Araç rengiyle uyumlu sürekli akan parlak sıvı plazma şeritleri',
    priceGold: 1680,
    accentSwatch: 'linear-gradient(120deg, #0f172a 0%, #38bdf8 34%, #f472b6 66%, #e0f2fe 100%)',
    category: 'animated',
    animated: true,
  },
  {
    id: 'animHeatwave',
    rarity: 'legendary',
    name: 'Lav Akışı',
    subtitle: 'Çatlak obsidiyen zırh altında nabız gibi atan erimiş magma',
    priceGold: 1880,
    accentSwatch: 'linear-gradient(120deg, #1c0a06 0%, #dc2626 40%, #f97316 68%, #fef08a 100%)',
    category: 'animated',
    overridesBaseColor: true,
    animated: true,
  },
  {
    id: 'animMatrixRain',
    rarity: 'legendary',
    name: 'Siber Akış',
    subtitle: 'Yüksek hızda geriye akan neon dijital veri akışı ve devre nabzı',
    priceGold: 2150,
    accentSwatch: 'linear-gradient(180deg, #022c22 0%, #10b981 48%, #34d399 78%, #064e3b 100%)',
    category: 'animated',
    animated: true,
  },
  {
    id: 'animInterstellar',
    rarity: 'legendary',
    name: 'Yıldızlararası',
    subtitle: 'Gövdede canlı süzülen kozmik aurora ve derin galaksi bulutsusu',
    priceGold: 2650,
    accentSwatch: 'linear-gradient(130deg, #050214 0%, #8b5cf6 32%, #22d3ee 60%, #f43f5e 84%, #090d26 100%)',
    category: 'animated',
    overridesBaseColor: true,
    animated: true,
  },
  {
    id: 'gtNumber',
    rarity: 'common',
    name: 'Pist Numara #01',
    subtitle: 'Kaput numara dairesi ve klasik yarış yan şeritleri',
    priceGold: 280,
    accentSwatch: 'linear-gradient(135deg, #f8fafc 0%, #f8fafc 46%, #ef4444 46%, #ef4444 62%, #18181b 62%)',
    category: 'decal',
  },
  {
    id: 'tigerClaw',
    rarity: 'rare',
    name: 'Kaplan Pençesi',
    subtitle: 'Kaputtan çamurluklara yırtıcı üçlü pençe izi grafiği',
    priceGold: 490,
    accentSwatch: 'linear-gradient(125deg, #18181b 0%, #f97316 42%, #fde047 68%, #18181b 100%)',
    category: 'decal',
  },
  {
    id: 'tokyoDrifter',
    rarity: 'epic',
    name: 'Tokyo Gece Şeridi',
    subtitle: 'Japon sokak drifti kızıl-beyaz keskin grafik şeritler',
    priceGold: 820,
    accentSwatch: 'linear-gradient(120deg, #09090b 0%, #ef4444 45%, #f8fafc 72%, #18181b 100%)',
    category: 'decal',
  },
  {
    id: 'cyberHexArmor',
    rarity: 'epic',
    name: 'Altıgen Zırh',
    subtitle: '3D pahlı titanyum-karbon altıgen zırh plakaları, cıvatalı ek yerleri ve cyan-amber enerji hatları',
    priceGold: 1240,
    accentSwatch: 'linear-gradient(135deg, #0b1120 0%, #334155 42%, #22d3ee 72%, #f59e0b 100%)',
    category: 'fullWrap',
    overridesBaseColor: true,
  },
  {
    id: 'animThunderVolt',
    rarity: 'legendary',
    name: 'Yüksek Voltaj',
    subtitle: 'Gövdede sürekli akan yüksek voltajlı mavi-beyaz şimşek damarları',
    priceGold: 2280,
    accentSwatch: 'linear-gradient(120deg, #020617 0%, #2563eb 42%, #38bdf8 70%, #ffffff 100%)',
    category: 'animated',
    overridesBaseColor: true,
    animated: true,
  },
  {
    id: 'gulfHeritage',
    rarity: 'common',
    name: 'Le Mans Körfez',
    subtitle: 'Klasik dayanıklılık yarışı orta turuncu şeridi ve lacivert ince çerçeve',
    priceGold: 290,
    accentSwatch: 'linear-gradient(90deg, #38bdf8 0%, #38bdf8 34%, #0f172a 36%, #f97316 38%, #f97316 62%, #0f172a 64%, #38bdf8 66%)',
    category: 'decal',
  },
  {
    id: 'hazardStripes',
    rarity: 'common',
    name: 'Tehlike Şeridi',
    subtitle: 'Ön burun, arka tampon ve yan eteklerde endüstriyel sarı-siyah şeritler',
    priceGold: 320,
    accentSwatch: 'repeating-linear-gradient(135deg, #facc15 0px, #facc15 10px, #111827 10px, #111827 20px)',
    category: 'decal',
  },
  {
    id: 'sharkMouth',
    rarity: 'rare',
    name: 'Köpekbalığı Ağzı',
    subtitle: 'Savaş uçağı tarzı yan keskin köpekbalığı dişleri ve kızıl çene grafiği',
    priceGold: 460,
    accentSwatch: 'linear-gradient(135deg, #334155 0%, #ef4444 45%, #ffffff 62%, #18181b 100%)',
    category: 'decal',
  },
  {
    id: 'martiniRally',
    rarity: 'rare',
    name: 'Üçlü Ralli Şeridi',
    subtitle: 'Efsanevi camgöbeği, kobalt mavi ve kırmızı ralli şerit tasarımı',
    priceGold: 520,
    accentSwatch: 'linear-gradient(90deg, #f8fafc 0%, #38bdf8 28%, #1d4ed8 46%, #ef4444 64%, #f8fafc 100%)',
    category: 'decal',
  },
  {
    id: 'minecraftPixel',
    rarity: 'epic',
    name: 'Piksel Voxel Blok',
    subtitle: 'Küp mozaik çim, taş bloklar ve parlayan elmas cevheri pikselleri',
    priceGold: 1040,
    accentSwatch: 'linear-gradient(135deg, #22c55e 0%, #64748b 52%, #22d3ee 85%, #1e293b 100%)',
    category: 'fullWrap',
    overridesBaseColor: true,
  },
  {
    id: 'animSynthwave',
    rarity: 'legendary',
    name: 'Synthwave 1984',
    subtitle: '80’ler retro-fütüristik akan neon pembe lazer ızgarası ve gün batımı dalgası',
    priceGold: 2100,
    accentSwatch: 'linear-gradient(135deg, #1e0538 0%, #ec4899 45%, #22d3ee 78%, #f59e0b 100%)',
    category: 'animated',
    overridesBaseColor: true,
    animated: true,
  },
  {
    id: 'animAuroraFrost',
    rarity: 'legendary',
    name: 'Kuzey Işıkları',
    subtitle: 'Arktik gece gökyüzünde canlı süzülen zümrüt-buz mavisi aurora perdeleri',
    priceGold: 2350,
    accentSwatch: 'linear-gradient(130deg, #020b18 0%, #10b981 38%, #38bdf8 68%, #818cf8 100%)',
    category: 'animated',
    overridesBaseColor: true,
    animated: true,
  },
  {
    id: 'animGoldenDragon',
    rarity: 'legendary',
    name: 'Altın Ejderha',
    subtitle: 'Kızıl-obsidyen kabartma ejderha pulları, imparatorluk altın ejderha silueti ve akan 24K alev dalgaları',
    priceGold: 2550,
    accentSwatch: 'linear-gradient(135deg, #1c0705 0%, #991b1b 34%, #f59e0b 68%, #fef08a 100%)',
    category: 'animated',
    overridesBaseColor: true,
    animated: true,
  },
  {
    id: 'istanbulTaxi',
    rarity: 'common',
    name: 'Taksi / Dolmuş',
    subtitle: 'Klasik parlak sarı taksi gövdesi, siyah-beyaz damalı yan kuşak ve taksi şeridi',
    priceGold: 260,
    accentSwatch: 'linear-gradient(135deg, #facc15 0%, #facc15 58%, #111827 58%, #111827 78%, #ffffff 78%)',
    category: 'fullWrap',
    overridesBaseColor: true,
  },
  {
    id: 'watermelonWrap',
    rarity: 'rare',
    name: 'Yaz Karpuzu',
    subtitle: 'Yeşil çizgili kabuk yanları, sulu kırmızı karpuz gövde ve siyah çekirdekler',
    priceGold: 440,
    accentSwatch: 'linear-gradient(135deg, #15803d 0%, #4ade80 28%, #f8fafc 36%, #f43f5e 46%, #e11d48 100%)',
    category: 'fullWrap',
    overridesBaseColor: true,
  },
  {
    id: 'toyCarBlocks',
    rarity: 'rare',
    name: 'Oyuncak Araba',
    subtitle: 'Parlak plastik yapı blokları, 3D lego çıkıntıları, #01 yarış rozeti ve oyuncak alev şeritleri',
    priceGold: 480,
    accentSwatch: 'linear-gradient(135deg, #ef4444 0%, #facc15 40%, #2563eb 74%, #22c55e 100%)',
    category: 'fullWrap',
    overridesBaseColor: true,
  },
  {
    id: 'policeInterceptor',
    rarity: 'epic',
    name: 'Polis Müdahale',
    subtitle: 'Siyah-beyaz otoyol devriye kaplaması, altın polis yıldızı ve mavi şerit',
    priceGold: 760,
    accentSwatch: 'linear-gradient(135deg, #09090b 0%, #09090b 40%, #f8fafc 40%, #f8fafc 74%, #2563eb 74%)',
    category: 'fullWrap',
    overridesBaseColor: true,
  },
  {
    id: 'comicSketch',
    rarity: 'epic',
    name: 'Çizgi Roman Eskiz',
    subtitle: 'Siyah mürekkep konturları, el çizimi tarama gölgeleri ve retro halftone noktaları',
    priceGold: 890,
    accentSwatch: 'linear-gradient(135deg, #fefce8 0%, #fefce8 52%, #18181b 52%, #ef4444 74%, #38bdf8 100%)',
    category: 'fullWrap',
    overridesBaseColor: true,
  },
  {
    id: 'streetGraffiti',
    rarity: 'epic',
    name: 'Sokak Grafiti',
    subtitle: 'Asfalt siyahi üzerine sprey boya akıntıları, neon sokak sanatı ve yıldız şablonları',
    priceGold: 920,
    accentSwatch: 'linear-gradient(135deg, #18181b 0%, #ec4899 35%, #22d3ee 66%, #a3e635 100%)',
    category: 'fullWrap',
    overridesBaseColor: true,
  },
  {
    id: 'lightning95',
    rarity: 'legendary',
    name: 'Şimşek #95',
    subtitle: 'Parlak yarış kırmızısı, alevli sarı şimşek grafiği ve efsanevi 95 yarış numarası',
    priceGold: 1480,
    accentSwatch: 'linear-gradient(125deg, #dc2626 0%, #ef4444 45%, #facc15 68%, #f97316 100%)',
    category: 'fullWrap',
    overridesBaseColor: true,
  },
  {
    id: 'animComicSpeed',
    rarity: 'legendary',
    name: 'Manga Hız Çizgileri',
    subtitle: 'Initial-D tarzı yüksek kontrastlı siyah-beyaz manga mürekkep taraması, halftone noktalar ve hızla akan neon şok çizgileri',
    priceGold: 2180,
    accentSwatch: 'linear-gradient(180deg, #f8fafc 0%, #09090b 46%, #06b6d4 76%, #f43f5e 100%)',
    category: 'animated',
    overridesBaseColor: true,
    animated: true,
  },
  {
    id: 'animCandyPop',
    rarity: 'legendary',
    name: 'Şekerleme Girdabı',
    subtitle: 'Canlı akan pembe-turkuaz-limon şekerleme şeritleri ve parlayan yıldız pırıltıları',
    priceGold: 2240,
    accentSwatch: 'linear-gradient(135deg, #f472b6 0%, #38bdf8 48%, #fde047 82%, #c084fc 100%)',
    category: 'animated',
    overridesBaseColor: true,
    animated: true,
  },
  {
    id: 'pixelBlock8Bit',
    rarity: 'epic',
    name: '8-Bit Blok',
    subtitle: 'Retro atari tuğla blokları, altın soru kutusu ve piksel-art şerit tasarımı',
    priceGold: 940,
    accentSwatch: 'linear-gradient(135deg, #b91c1c 0%, #ea580c 42%, #facc15 68%, #38bdf8 100%)',
    category: 'fullWrap',
    overridesBaseColor: true,
  },
  {
    id: 'tetrominoBlocks',
    rarity: 'epic',
    name: 'Tetromino Blokları',
    subtitle: 'Birbirine kenetlenmiş klasik mavi, sarı, mor ve kırmızı Tetris piksel blokları',
    priceGold: 980,
    accentSwatch: 'linear-gradient(135deg, #06b6d4 0%, #facc15 34%, #a855f7 66%, #ef4444 100%)',
    category: 'fullWrap',
    overridesBaseColor: true,
  },
  {
    id: 'windowsBsod',
    rarity: 'epic',
    name: 'Mavi Ekran (BSOD)',
    subtitle: 'Koyu Windows hata mavisi, :( yüz ifadesi, sistem hata kodları ve piksel QR kod',
    priceGold: 1020,
    accentSwatch: 'linear-gradient(135deg, #005a9e 0%, #0078d7 68%, #ffffff 100%)',
    category: 'fullWrap',
    overridesBaseColor: true,
  },
  {
    id: 'animVenomSymbiote',
    rarity: 'legendary',
    name: 'Simbiyot (Venom)',
    subtitle: 'Islak siyah-lacivert kaslı simbiyot gövde, kaputta yırtıcı beyaz gözler, örümcek arması ve canlı sürünen damarlar',
    priceGold: 2480,
    accentSwatch: 'linear-gradient(135deg, #030306 0%, #1e1b4b 42%, #f8fafc 74%, #09090b 100%)',
    category: 'animated',
    overridesBaseColor: true,
    animated: true,
  },
  {
    id: 'animLiquidAquarium',
    rarity: 'legendary',
    name: 'Sıvı Akvaryum',
    subtitle: 'Şeffaf cam kaporta içinde driftle çalkalanan mavi su ve yüzen 3D turuncu Japon balıkları',
    priceGold: 2850,
    accentSwatch: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 52%, #f97316 78%, #e0f2fe 100%)',
    category: 'animated',
    overridesBaseColor: true,
    animated: true,
  },
  {
    id: 'lushGrassTurf',
    rarity: 'rare',
    name: 'Çim Kaplama',
    subtitle: 'Biçilmiş taze çimen şeritleri, katmanlı çim dokusu ve minik papatya çiçekleri',
    priceGold: 420,
    accentSwatch: 'linear-gradient(135deg, #15803d 0%, #22c55e 48%, #84cc16 82%, #fef08a 100%)',
    category: 'fullWrap',
    overridesBaseColor: true,
  },
  {
    id: 'knittedSweater',
    rarity: 'rare',
    name: 'Örgü Kazak',
    subtitle: 'El örgüsü yün ilmek dokusu, bordo-krem İskandinav kar tanesi ve baklava desenleri',
    priceGold: 470,
    accentSwatch: 'linear-gradient(135deg, #991b1b 0%, #fef3c7 38%, #14532d 68%, #b91c1c 100%)',
    category: 'fullWrap',
    overridesBaseColor: true,
  },
  {
    id: 'carvedWood',
    rarity: 'epic',
    name: 'Ahşap Oyma',
    subtitle: 'El işçiliği ceviz ağacı damarları, oymalı kabartma motifler ve saten ahşap cila',
    priceGold: 780,
    accentSwatch: 'linear-gradient(135deg, #451a03 0%, #92400e 48%, #b45309 78%, #291509 100%)',
    category: 'fullWrap',
    overridesBaseColor: true,
  },
  {
    id: 'mysteryMachine',
    rarity: 'epic',
    name: 'Gizem Makinesi',
    subtitle: 'Parlak turkuaz gövde, yanlarda neon yeşili dalgalı şeritler ve turuncu çiçek detayları',
    priceGold: 940,
    accentSwatch: 'linear-gradient(135deg, #06b6d4 0%, #84cc16 48%, #f97316 80%, #facc15 100%)',
    category: 'fullWrap',
    overridesBaseColor: true,
  },
  {
    id: 'animWindStream',
    rarity: 'legendary',
    name: 'Rüzgar Akışı',
    subtitle: 'Araç hızlandıkça gövde boyunca daha hızlı akan aerodinamik rüzgar tüneli çizgileri',
    priceGold: 2120,
    accentSwatch: 'linear-gradient(180deg, #0f172a 0%, #38bdf8 48%, #e0f2fe 78%, #0284c7 100%)',
    category: 'animated',
    animated: true,
  },
  {
    id: 'omnitrixAlien',
    rarity: 'legendary',
    name: 'Omnitrix',
    subtitle: 'Siyah-beyaz uzaylı teknoloji zırhı, kaputta parlayan kum saati çekirdeği ve gövdede akan canlı DNA enerji dalgaları',
    priceGold: 2320,
    accentSwatch: 'linear-gradient(135deg, #09090b 0%, #f8fafc 32%, #22c55e 66%, #bbf7d0 100%)',
    category: 'animated',
    overridesBaseColor: true,
    animated: true,
  },
  {
    id: 'animCrysisNanosuit',
    rarity: 'legendary',
    name: 'Nanosuit 2.0 (Crysis)',
    subtitle: 'Yapay karbon kas lifli Nanosuit zırhı, kızıl vizör yarığı ve gövdede dalgalanan Maksimum Zırh altıgen kalkanı',
    priceGold: 2360,
    accentSwatch: 'linear-gradient(135deg, #090c12 0%, #334155 36%, #38bdf8 66%, #ef4444 92%)',
    category: 'animated',
    overridesBaseColor: true,
    animated: true,
  },
  {
    id: 'animSakuraStorm',
    rarity: 'legendary',
    name: 'Kiraz Çiçeği Fırtınası',
    subtitle: 'Gece moru gövdede rüzgarla çapraz süzülen parlayan pembe sakura yaprakları',
    priceGold: 2140,
    accentSwatch: 'linear-gradient(135deg, #120824 0%, #ec4899 50%, #fbcfe8 82%, #311042 100%)',
    category: 'animated',
    overridesBaseColor: true,
    animated: true,
  },
  {
    id: 'animHypnoSpiral',
    rarity: 'legendary',
    name: 'Hipnoz Dalgaları',
    subtitle: 'Siyah-beyaz ve neon mor optik illüzyon dalga halkalarıyla göz alıcı akış',
    priceGold: 2150,
    accentSwatch: 'linear-gradient(135deg, #09090b 0%, #ffffff 36%, #a855f7 68%, #09090b 100%)',
    category: 'animated',
    overridesBaseColor: true,
    animated: true,
  },
  {
    id: 'animHeartbeatEcg',
    rarity: 'legendary',
    name: 'Kalp Atışı (EKG)',
    subtitle: 'Siyah monitör ızgarasında ritmik nabızla atan parlak kızıl EKG yaşam çizgisi',
    priceGold: 2160,
    accentSwatch: 'linear-gradient(125deg, #09090b 0%, #dc2626 52%, #fca5a5 76%, #18181b 100%)',
    category: 'animated',
    overridesBaseColor: true,
    animated: true,
  },
  {
    id: 'animToxicAcid',
    rarity: 'legendary',
    name: 'Radyoaktif Asit',
    subtitle: 'Koyu biyolojik tehlike zırhında fokurdayıp akan neon lime radyoaktif asit',
    priceGold: 2190,
    accentSwatch: 'linear-gradient(135deg, #071409 0%, #65a30d 45%, #bef264 78%, #14532d 100%)',
    category: 'animated',
    overridesBaseColor: true,
    animated: true,
  },
  {
    id: 'animGlitchCorrupt',
    rarity: 'legendary',
    name: 'Sistem Hatası (Glitch)',
    subtitle: 'RGB renk sapmalı, atlayarak titreşen siberpunk dijital glitch tarama çizgileri',
    priceGold: 2220,
    accentSwatch: 'linear-gradient(125deg, #09090b 0%, #06b6d4 38%, #ec4899 68%, #ffffff 100%)',
    category: 'animated',
    overridesBaseColor: true,
    animated: true,
  },
  {
    id: 'animCyberEqualizer',
    rarity: 'legendary',
    name: 'Bas Ekolayzır (DJ)',
    subtitle: '128 BPM bas ritmiyle zıplayıp parlayan çok renkli neon LED müzik ekolayzırı',
    priceGold: 2260,
    accentSwatch: 'linear-gradient(180deg, #ec4899 0%, #facc15 42%, #22c55e 74%, #09090b 100%)',
    category: 'animated',
    overridesBaseColor: true,
    animated: true,
  },
  {
    id: 'animOceanBiolum',
    rarity: 'legendary',
    name: 'Biyolüminesans Dalga',
    subtitle: 'Derin okyanus gecesinde parıldayan canlı elektrik-turkuaz plankton dalgaları',
    priceGold: 2290,
    accentSwatch: 'linear-gradient(135deg, #020c1b 0%, #0284c7 44%, #2dd4bf 76%, #ccfbf1 100%)',
    category: 'animated',
    overridesBaseColor: true,
    animated: true,
  },
  {
    id: 'animHoloCircuit',
    rarity: 'legendary',
    name: 'Altın Mikroçip',
    subtitle: 'Koyu anakart devresi boyunca ışık hızıyla akan 24K altın mikroçip veri hatları',
    priceGold: 2380,
    accentSwatch: 'linear-gradient(135deg, #042f2e 0%, #b45309 45%, #facc15 74%, #fef08a 100%)',
    category: 'animated',
    overridesBaseColor: true,
    animated: true,
  },
  {
    id: 'animWarpHyperdrive',
    rarity: 'legendary',
    name: 'Işık Hızı (Warp)',
    subtitle: 'Hızlandıkça uzayıp coşan derin uzay ışık hızı yıldız çizgileri',
    priceGold: 2490,
    accentSwatch: 'linear-gradient(180deg, #020617 0%, #2563eb 46%, #67e8f9 78%, #ffffff 100%)',
    category: 'animated',
    overridesBaseColor: true,
    animated: true,
  },
  {
    id: 'animSolarEclipse',
    rarity: 'legendary',
    name: 'Güneş Tutulması',
    subtitle: 'Simsiyah tutulma çekirdeğini saran alevli korona plazma halkaları',
    priceGold: 2580,
    accentSwatch: 'linear-gradient(135deg, #090405 0%, #dc2626 42%, #f97316 70%, #fef08a 100%)',
    category: 'animated',
    overridesBaseColor: true,
    animated: true,
  },
];

export const PAINT_FINISHES: PaintFinishSpec[] = [
  {
    id: 'metallic',
    rarity: 'common',
    name: 'Metalik',
    subtitle: 'Parlak showroom vernik katmanı',
    priceGold: 0,
    swatch: 'linear-gradient(135deg, #f8fafc 0%, #94a3b8 55%, #334155 100%)',
    colorMode: 'full',
  },
  {
    id: 'matte',
    rarity: 'common',
    name: 'Mat Saten',
    subtitle: 'Yansımasız stealth mat boya yüzeyi',
    priceGold: 220,
    swatch: 'linear-gradient(135deg, #3f3f46 0%, #18181b 100%)',
    colorMode: 'full',
  },
  {
    id: 'chrome',
    rarity: 'rare',
    name: 'Ayna Krom',
    subtitle: 'Seçtiğin renkte tam yansıtıcı ayna krom',
    priceGold: 460,
    swatch: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 45%, #475569 75%, #f8fafc 100%)',
    colorMode: 'full',
  },
  {
    id: 'frostedIce',
    rarity: 'epic',
    name: 'Buzul Kristal',
    subtitle: 'Seçtiğin renge buzlu sedef ve soğuk elmas yansıması',
    priceGold: 790,
    swatch: 'linear-gradient(135deg, #ecfeff 0%, #67e8f9 45%, #1e3a8a 100%)',
    colorMode: 'full',
  },
  {
    id: 'carbon',
    rarity: 'rare',
    name: 'Karbon Fiber',
    subtitle: '2×2 örgü karbon doku · Seçtiğin renk karbona ton verir',
    priceGold: 580,
    swatch: 'repeating-linear-gradient(45deg, #27272a 0px, #27272a 3px, #111113 3px, #111113 6px)',
    colorMode: 'tinted',
  },
  {
    id: 'forgedCarbon',
    rarity: 'epic',
    name: 'Dövme Karbon',
    subtitle: 'Mermer dokulu forged karbon · Seçtiğin renk ton verir',
    priceGold: 1050,
    swatch: 'linear-gradient(135deg, #18181b 0%, #3f3f46 32%, #09090b 64%, #52525b 100%)',
    colorMode: 'tinted',
  },
  {
    id: 'satinGold',
    rarity: 'epic',
    name: '24K Fırçalanmış Altın',
    subtitle: 'Kendi 24K altın fırça dokusuna sahip özel metal boya',
    priceGold: 720,
    swatch: 'linear-gradient(135deg, #fef08a 0%, #eab308 48%, #854d0e 100%)',
    colorMode: 'fixed',
    fixedColorReason: '24K Fırçalanmış Altın kendi metalik altın tonunu kullanır.',
  },
  {
    id: 'chameleon',
    rarity: 'legendary',
    name: 'Bukalemun',
    subtitle: 'Açıya ve zamana göre sürekli renk değiştiren sedef',
    priceGold: 850,
    swatch: 'linear-gradient(90deg, #06b6d4 0%, #a855f7 50%, #f59e0b 100%)',
    colorMode: 'fixed',
    fixedColorReason: 'Bukalemun renkleri otomatik değiştirir — renk seçimi kapalı.',
  },
  {
    id: 'prismHolo',
    rarity: 'legendary',
    name: 'Prizma Hologram',
    subtitle: 'Tam ayna spektrumlu dinamik sıvı hologram boya',
    priceGold: 1450,
    swatch: 'linear-gradient(120deg, #f43f5e 0%, #facc15 28%, #22d3ee 58%, #a855f7 100%)',
    colorMode: 'fixed',
    fixedColorReason: 'Prizma Hologram tüm spektrumda sürekli renk geçişi yapar — renk seçimi kapalı.',
  },
  {
    id: 'obsidianChrome',
    rarity: 'epic',
    name: 'Kara Ayna Krom',
    subtitle: 'Seviye 18 Özel · Koyu obsidyen ayna ve bakır ışıltısı',
    priceGold: 0,
    swatch: 'linear-gradient(135deg, #09090b 0%, #27272a 45%, #b45309 78%, #18181b 100%)',
    colorMode: 'fixed',
    fixedColorReason: 'Kara Ayna Krom kendi özel koyu obsidyen krom yüzeyini kullanır.',
    levelRoadLevel: 18,
  },
  {
    id: 'emeraldLiquid',
    rarity: 'epic',
    name: 'Sıvı Zümrüt Krom',
    subtitle: 'Seviye 40 Özel · Sıvı metal zümrüt-turkuaz ayna kaplama',
    priceGold: 0,
    swatch: 'linear-gradient(135deg, #022c22 0%, #10b981 48%, #5eead4 78%, #065f46 100%)',
    colorMode: 'fixed',
    fixedColorReason: 'Sıvı Zümrüt Krom kendi özel metalik zümrüt tonunu kullanır.',
    levelRoadLevel: 40,
  },
  {
    id: 'royalGoldHolo',
    rarity: 'legendary',
    name: 'Kraliyet Altın Hologram',
    subtitle: 'Seviye 65 Özel · Akan 24K altın ve kehribar hologram yüzey',
    priceGold: 0,
    swatch: 'linear-gradient(125deg, #78350f 0%, #facc15 36%, #fef08a 60%, #f97316 100%)',
    colorMode: 'fixed',
    fixedColorReason: 'Kraliyet Altın Hologram dinamik altın ışıltısı yayar.',
    levelRoadLevel: 65,
  },
  {
    id: 'apexEclipse',
    rarity: 'legendary',
    name: 'Apex Tutulma (Sv.100)',
    subtitle: 'Seviye 100 Büyük Ödül · Kızıl-altın-mor şampiyon tutulma yüzeyi',
    priceGold: 0,
    swatch: 'linear-gradient(120deg, #18051a 0%, #e11d48 34%, #facc15 65%, #c084fc 100%)',
    colorMode: 'fixed',
    fixedColorReason: 'Apex Tutulma Seviye 100 özel dinamik şampiyon boyasıdır.',
    levelRoadLevel: 100,
  },
  {
    id: 'velvetPearl',
    rarity: 'rare',
    name: 'Kadife Sedef',
    subtitle: 'Yumuşak inci parıltılı ipeksi sedef vernik yüzeyi',
    priceGold: 340,
    swatch: 'linear-gradient(135deg, #f8fafc 0%, #e9d5ff 50%, #94a3b8 100%)',
    colorMode: 'full',
  },
  {
    id: 'brushedTitanium',
    rarity: 'rare',
    name: 'Fırçalanmış Titanyum',
    subtitle: 'Yatay fırçalanmış metal doku · Seçtiğin renk metale ton verir',
    priceGold: 520,
    swatch: 'repeating-linear-gradient(0deg, #64748b 0px, #94a3b8 2px, #475569 4px)',
    colorMode: 'tinted',
  },
  {
    id: 'candyGloss',
    rarity: 'epic',
    name: 'Şeker Cam Vernik',
    subtitle: 'Ultra derin ıslak şeker kaplama ve ayna parlaklığı',
    priceGold: 680,
    swatch: 'linear-gradient(135deg, #fb7185 0%, #e11d48 48%, #4c0519 100%)',
    colorMode: 'full',
  },
  {
    id: 'copperLiquid',
    rarity: 'epic',
    name: 'Sıvı Bakır Krom',
    subtitle: 'Erimiş rose-bakır yansımalı ayna metal yüzeyi',
    priceGold: 920,
    swatch: 'linear-gradient(135deg, #fed7aa 0%, #ea580c 48%, #7c2d12 100%)',
    colorMode: 'fixed',
    fixedColorReason: 'Sıvı Bakır Krom kendi özel metalik bakır ayna tonunu kullanır.',
  },
  {
    id: 'nebulaShift',
    rarity: 'legendary',
    name: 'Nebula Bukalemun',
    subtitle: 'Derin mor, turkuaz ve fuşya arasında dinamik uzay geçişi',
    priceGold: 1580,
    swatch: 'linear-gradient(125deg, #3b0764 0%, #7c3aed 34%, #06b6d4 68%, #ec4899 100%)',
    colorMode: 'fixed',
    fixedColorReason: 'Nebula Bukalemun kozmik renkler arasında otomatik geçiş yapar.',
  },
];

export const PLATE_STYLES: PlateStyleSpec[] = [
  {
    id: 'classic',
    rarity: 'common',
    name: 'Klasik TR',
    subtitle: 'Standart beyaz reflektörlü TR plaka',
    priceGold: 0,
    bgSwatch: '#f4f4f5',
    frameSwatch: '#18181b',
    textSwatch: '#111827',
  },
  {
    id: 'vipBlack',
    rarity: 'common',
    name: 'Siyah VIP',
    subtitle: 'Parlak piano siyah zemin & gümüş kabartma',
    priceGold: 160,
    bgSwatch: '#09090b',
    frameSwatch: '#71717a',
    textSwatch: '#f4f4f5',
  },
  {
    id: 'vintageRetro',
    rarity: 'common',
    name: 'Retro 80\'ler',
    subtitle: 'Eskitme krem zemin & krom vidalı klasik plakalık',
    priceGold: 190,
    bgSwatch: 'linear-gradient(180deg, #fef3c7 0%, #e7d3a8 100%)',
    frameSwatch: '#78350f',
    textSwatch: '#451a03',
  },
  {
    id: 'jdmTokyo',
    rarity: 'rare',
    name: 'Tokyo JDM',
    subtitle: 'Japon sokak kültürü zümrüt yazılı beyaz plaka',
    priceGold: 260,
    bgSwatch: '#f8fafc',
    frameSwatch: '#15803d',
    textSwatch: '#14532d',
  },
  {
    id: 'goldFrame',
    rarity: 'rare',
    name: 'Altın Çerçeve',
    subtitle: '24K altın metalik çerçeve & lüks şerit',
    priceGold: 290,
    bgSwatch: '#18130a',
    frameSwatch: '#eab308',
    textSwatch: '#fde047',
  },
  {
    id: 'californiaSunset',
    rarity: 'rare',
    name: 'Gün Batımı',
    subtitle: 'Batı yakası gün batımı gradyanı & alüminyum çerçeve',
    priceGold: 330,
    bgSwatch: 'linear-gradient(180deg, #f97316 0%, #ec4899 55%, #3b0764 100%)',
    frameSwatch: '#fdba74',
    textSwatch: '#fff7ed',
  },
  {
    id: 'carbonPlate',
    rarity: 'rare',
    name: 'Karbon Plaka',
    subtitle: 'Örgü karbon zemin & yarış fontu',
    priceGold: 380,
    bgSwatch: '#18181b',
    frameSwatch: '#ef4444',
    textSwatch: '#f8fafc',
  },
  {
    id: 'nurburgringTrack',
    rarity: 'rare',
    name: 'Pist Yarışı',
    subtitle: 'Damalı bayrak kenarlı karbon yan kanatçıklı plakalık',
    priceGold: 410,
    bgSwatch: 'linear-gradient(135deg, #18181b 0%, #27272a 100%)',
    frameSwatch: '#facc15',
    textSwatch: '#fef08a',
  },
  {
    id: 'dubaiLux',
    rarity: 'epic',
    name: 'Dubai Lüks',
    subtitle: 'Minimalist inci beyazı & kraliyet altın detay',
    priceGold: 460,
    bgSwatch: '#ffffff',
    frameSwatch: '#d4af37',
    textSwatch: '#09090b',
  },
  {
    id: 'neonGlow',
    rarity: 'epic',
    name: 'Neon Işıklı',
    subtitle: 'LED aydınlatmalı parlak camgöbeği çerçeve',
    priceGold: 520,
    bgSwatch: '#020617',
    frameSwatch: '#22d3ee',
    textSwatch: '#67e8f9',
  },
  {
    id: 'roseGoldChrome',
    rarity: 'epic',
    name: 'Gül Altın Krom',
    subtitle: 'Ayna gül altın köşe braketli lüks elmas kesim plakalık',
    priceGold: 570,
    bgSwatch: 'linear-gradient(135deg, #1c1014 0%, #2e1620 100%)',
    frameSwatch: '#fb7185',
    textSwatch: '#fecdd3',
  },
  {
    id: 'crimsonNeon',
    rarity: 'epic',
    name: 'Kızıl Neon',
    subtitle: 'Yakut kırmızı LED çerçeveli karanlık plaka',
    priceGold: 620,
    bgSwatch: '#18040a',
    frameSwatch: '#f43f5e',
    textSwatch: '#fda4af',
  },
  {
    id: 'imperialGold',
    rarity: 'legendary',
    name: 'İmparatorluk',
    subtitle: 'Taç armalı 24K altın işleme ve parıltılı çerçeve',
    priceGold: 840,
    bgSwatch: '#0c0a04',
    frameSwatch: '#fde047',
    textSwatch: '#fef08a',
  },
  // --- ANIMATED LICENSE PLATES & 3D LED / MECHANICAL FRAMES ---
  {
    id: 'animRgbChase',
    rarity: 'epic',
    name: 'RGB Akan LED',
    subtitle: 'Çerçeve boyunca dönen canlı gökkuşağı LED şeritleri',
    priceGold: 720,
    bgSwatch: 'linear-gradient(120deg, #09090b 0%, #171726 100%)',
    frameSwatch: '#22d3ee',
    textSwatch: '#e0f2fe',
    animated: true,
  },
  {
    id: 'animPoliceStrobe',
    rarity: 'epic',
    name: 'Çakar Plakalık',
    subtitle: 'Yanlarda kırmızı-mavi çakarlı taktik polis plakalığı',
    priceGold: 760,
    bgSwatch: 'linear-gradient(90deg, #450a0a 0%, #09090b 50%, #172554 100%)',
    frameSwatch: '#3b82f6',
    textSwatch: '#f8fafc',
    animated: true,
  },
  {
    id: 'animCyberMatrix',
    rarity: 'epic',
    name: 'Matriks Dijital',
    subtitle: 'Akan yeşil dijital kod yağmurlu LED ekran plaka',
    priceGold: 820,
    bgSwatch: 'linear-gradient(180deg, #02140a 0%, #052e16 100%)',
    frameSwatch: '#22c55e',
    textSwatch: '#86efac',
    animated: true,
  },
  {
    id: 'animKnightScan',
    rarity: 'epic',
    name: 'Kızıl Tarayıcı',
    subtitle: 'Sağa sola kayan kırmızı lazer tarayıcılı siber plakalık',
    priceGold: 860,
    bgSwatch: 'linear-gradient(180deg, #1a0508 0%, #09090b 100%)',
    frameSwatch: '#ef4444',
    textSwatch: '#fecaca',
    animated: true,
  },
  {
    id: 'animFlameBorder',
    rarity: 'legendary',
    name: 'Alevli Plakalık',
    subtitle: 'Titreşen kor alevli çerçeve ve yan alev kanatçıkları',
    priceGold: 1050,
    bgSwatch: 'linear-gradient(180deg, #270b04 0%, #431407 55%, #7c2d12 100%)',
    frameSwatch: '#f97316',
    textSwatch: '#fed7aa',
    animated: true,
  },
  {
    id: 'animHoloPrism',
    rarity: 'legendary',
    name: 'Hologram Prizma',
    subtitle: 'Süzülen çift hologram çerçeve & gökkuşağı prizma tarama',
    priceGold: 1180,
    bgSwatch: 'linear-gradient(125deg, #1e1b4b 0%, #3b0764 50%, #083344 100%)',
    frameSwatch: '#c084fc',
    textSwatch: '#f5d0fe',
    animated: true,
  },
  {
    id: 'animStealthFlip',
    rarity: 'legendary',
    name: 'Mekanik Gizli',
    subtitle: 'Hareketli karbon vizör panjurlu & siber taramalı gizli plakalık',
    priceGold: 1320,
    bgSwatch: 'linear-gradient(135deg, #090d16 0%, #1e293b 100%)',
    frameSwatch: '#38bdf8',
    textSwatch: '#bae6fd',
    animated: true,
  },
  {
    id: 'levelBronzePlate',
    rarity: 'epic',
    name: 'Otoyol Kurdu Plakası',
    subtitle: 'Seviye 25 Özel · Fırçalanmış bronz çerçeveli nişan plakası',
    priceGold: 0,
    bgSwatch: 'linear-gradient(135deg, #1c120a 0%, #2e1d10 100%)',
    frameSwatch: '#f97316',
    textSwatch: '#fed7aa',
    levelRoadLevel: 25,
  },
  {
    id: 'apexChampionPlate',
    rarity: 'legendary',
    name: 'Apex Şampiyon Plakası',
    subtitle: 'Seviye 55 Özel · Animasyonlu kızıl-altın şampiyonluk plakası',
    priceGold: 0,
    bgSwatch: 'linear-gradient(135deg, #270714 0%, #4c0519 52%, #451a03 100%)',
    frameSwatch: '#fbbf24',
    textSwatch: '#fef08a',
    animated: true,
    levelRoadLevel: 55,
  },
  {
    id: 'emeraldCarbon',
    rarity: 'rare',
    name: 'Zümrüt Karbon',
    subtitle: 'Karbon örgü zemin ve neon zümrüt yarış çerçevesi',
    priceGold: 340,
    bgSwatch: '#061912',
    frameSwatch: '#10b981',
    textSwatch: '#6ee7b7',
  },
  {
    id: 'tokyoNeonPink',
    rarity: 'epic',
    name: 'Tokyo Neon Pembe',
    subtitle: 'Gece yarışı sıcak pembe LED çerçeve ve Japon şeritleri',
    priceGold: 480,
    bgSwatch: '#190514',
    frameSwatch: '#ec4899',
    textSwatch: '#fbcfe8',
  },
  {
    id: 'arcticIce',
    rarity: 'epic',
    name: 'Buzul Kristal',
    subtitle: 'Buzlu gümüş-mavi kristal zemin ve ayna çerçeve',
    priceGold: 540,
    bgSwatch: 'linear-gradient(180deg, #e0f2fe 0%, #bae6fd 100%)',
    frameSwatch: '#38bdf8',
    textSwatch: '#0c4a6e',
  },
  {
    id: 'animGoldPulse',
    rarity: 'legendary',
    name: 'Altın Nabız LED',
    subtitle: 'Nefes alan 24K altın LED çerçeve ve parlak ışık taraması',
    priceGold: 980,
    bgSwatch: 'linear-gradient(135deg, #1c1304 0%, #422006 100%)',
    frameSwatch: '#facc15',
    textSwatch: '#fef08a',
    animated: true,
  },
  {
    id: 'animCyberLightning',
    rarity: 'legendary',
    name: 'Siber Şimşek',
    subtitle: 'Plaka boyunca çakan yüksek voltaj mavi-beyaz elektrik arkları',
    priceGold: 1220,
    bgSwatch: 'linear-gradient(135deg, #020617 0%, #0f172a 100%)',
    frameSwatch: '#60a5fa',
    textSwatch: '#e0f2fe',
    animated: true,
  },
];

export const UNDERGLOWS: UnderglowSpec[] = [
  {
    id: 'none',
    rarity: 'common',
    name: 'Kapalı',
    subtitle: 'Araç altı aydınlatma yok',
    priceGold: 0,
    hex: 0x000000,
    swatch: '#27272a',
    mode: 'off',
  },
  {
    id: 'cyan',
    rarity: 'common',
    name: 'Camgöbeği',
    subtitle: 'Buz mavisi LED şasi altı ışık',
    priceGold: 240,
    hex: 0x22d3ee,
    swatch: '#22d3ee',
    mode: 'static',
  },
  {
    id: 'purple',
    rarity: 'common',
    name: 'Mor Neon',
    subtitle: 'Gece sokak yarışı mor neon ışık',
    priceGold: 260,
    hex: 0xa855f7,
    swatch: '#a855f7',
    mode: 'static',
  },
  {
    id: 'red',
    rarity: 'common',
    name: 'Kırmızı',
    subtitle: 'Agresif kızıl şasi altı neon',
    priceGold: 280,
    hex: 0xef4444,
    swatch: '#ef4444',
    mode: 'static',
  },
  {
    id: 'green',
    rarity: 'rare',
    name: 'Zehir Yeşil',
    subtitle: 'Parlak toksik yeşil sokak neonu',
    priceGold: 300,
    hex: 0x22c55e,
    swatch: '#22c55e',
    mode: 'static',
  },
  {
    id: 'iceWhite',
    rarity: 'rare',
    name: 'Elmas Beyaz',
    subtitle: 'Saf buz beyazı kristal LED parıltısı',
    priceGold: 320,
    hex: 0xf8fafc,
    swatch: '#f8fafc',
    mode: 'static',
  },
  {
    id: 'gold',
    rarity: 'rare',
    name: 'Altın Neon',
    subtitle: 'VIP sıcak altın şasi altı parıltısı',
    priceGold: 340,
    hex: 0xfacc15,
    swatch: '#facc15',
    mode: 'static',
  },
  {
    id: 'cyberPink',
    rarity: 'rare',
    name: 'Siber Pembe',
    subtitle: 'Tokyo gece yarışı sıcak magenta neonu',
    priceGold: 380,
    hex: 0xf43f9e,
    swatch: '#f43f9e',
    mode: 'static',
  },
  {
    id: 'pulseCyan',
    rarity: 'epic',
    name: 'Nabız Neon',
    subtitle: 'Nefes alan dinamik mavi-mor neon efekti',
    priceGold: 540,
    hex: 0x38bdf8,
    swatch: 'linear-gradient(90deg, #06b6d4 0%, #6366f1 100%)',
    mode: 'pulse',
  },
  {
    id: 'plasmaSunset',
    rarity: 'epic',
    name: 'Gün Batımı Nabız',
    subtitle: 'Altın-turuncu-kızıl arası nefes alan plazma ışık',
    priceGold: 660,
    hex: 0xf97316,
    swatch: 'linear-gradient(90deg, #facc15 0%, #f97316 50%, #e11d48 100%)',
    mode: 'pulseWarm',
  },
  {
    id: 'rainbow',
    rarity: 'legendary',
    name: 'RGB Gökkuşağı',
    subtitle: 'Tam spektrum sürekli renk değiştiren RGB',
    priceGold: 780,
    hex: 0xec4899,
    swatch: 'linear-gradient(90deg, #ef4444, #f59e0b, #22c55e, #06b6d4, #a855f7)',
    mode: 'rainbow',
  },
  {
    id: 'policeStrobe',
    rarity: 'legendary',
    name: 'İnterceptor Çakar',
    subtitle: 'Kırmızı-mavi yüksek enerjili takip çakar neonu',
    priceGold: 920,
    hex: 0x3b82f6,
    swatch: 'linear-gradient(90deg, #ef4444 0%, #ef4444 48%, #3b82f6 52%, #3b82f6 100%)',
    mode: 'strobe',
  },
  {
    id: 'auroraWave',
    rarity: 'epic',
    name: 'Kuzey Işıkları',
    subtitle: 'Zümrüt-turkuaz-mor arası akan aurora neonu',
    priceGold: 840,
    hex: 0x10b981,
    swatch: 'linear-gradient(90deg, #10b981 0%, #22d3ee 50%, #a855f7 100%)',
    mode: 'aurora',
  },
  {
    id: 'cyberBreathe',
    rarity: 'epic',
    name: 'Siber Dalga',
    subtitle: 'Elektrik mavi ve sıcak pembe arasında geçişli neon',
    priceGold: 880,
    hex: 0xec4899,
    swatch: 'linear-gradient(90deg, #06b6d4 0%, #ec4899 100%)',
    mode: 'cyberBreathe',
  },
  {
    id: 'lavaPulse',
    rarity: 'legendary',
    name: 'Erimiş Lav',
    subtitle: 'Kızıl kor ve altın turuncu arası atan volkan neonu',
    priceGold: 960,
    hex: 0xf97316,
    swatch: 'linear-gradient(90deg, #dc2626 0%, #f97316 55%, #fde047 100%)',
    mode: 'lavaPulse',
  },
  {
    id: 'levelGoldPulse',
    rarity: 'epic',
    name: 'Şampiyon Altın Nabzı',
    subtitle: 'Seviye 22 Özel · Nefes alan 24K altın araç altı neonu',
    priceGold: 0,
    hex: 0xfacc15,
    swatch: 'linear-gradient(90deg, #b45309 0%, #facc15 50%, #fef08a 100%)',
    mode: 'pulseWarm',
    levelRoadLevel: 22,
  },
  {
    id: 'apexSpectrum',
    rarity: 'legendary',
    name: 'Apex Hiper Spektrum',
    subtitle: 'Seviye 70 Özel · Tam spektrumlu şampiyonluk aurora neonu',
    priceGold: 0,
    hex: 0xf43f5e,
    swatch: 'linear-gradient(90deg, #e11d48 0%, #facc15 50%, #22d3ee 100%)',
    mode: 'rainbow',
    levelRoadLevel: 70,
  },
  {
    id: 'cobaltBlue',
    rarity: 'common',
    name: 'Safir Mavi',
    subtitle: 'Derin okyanus mavisi LED şasi altı ışık',
    priceGold: 260,
    hex: 0x2563eb,
    swatch: '#2563eb',
    mode: 'static',
  },
  {
    id: 'amberFire',
    rarity: 'rare',
    name: 'Kehribar Turuncu',
    subtitle: 'Sıcak amber-turuncu sokak yarışı neonu',
    priceGold: 330,
    hex: 0xf97316,
    swatch: '#f97316',
    mode: 'static',
  },
  {
    id: 'mintIce',
    rarity: 'rare',
    name: 'Nane Buz',
    subtitle: 'Ferah nane-turkuaz buz LED aydınlatma',
    priceGold: 360,
    hex: 0x2dd4bf,
    swatch: '#2dd4bf',
    mode: 'static',
  },
  {
    id: 'royalVioletPulse',
    rarity: 'epic',
    name: 'Kraliyet Mor Nabız',
    subtitle: 'Derin mor ve safir arasında nefes alan VIP neon',
    priceGold: 620,
    hex: 0x9333ea,
    swatch: 'linear-gradient(90deg, #7e22ce 0%, #3b82f6 100%)',
    mode: 'pulse',
  },
  {
    id: 'emeraldWave',
    rarity: 'epic',
    name: 'Zümrüt Dalga',
    subtitle: 'Zümrüt yeşili ve turkuaz arasında akan dinamik ışık',
    priceGold: 740,
    hex: 0x10b981,
    swatch: 'linear-gradient(90deg, #059669 0%, #2dd4bf 55%, #38bdf8 100%)',
    mode: 'aurora',
  },
];

export const HEADLIGHTS: HeadlightSpec[] = [
  {
    id: 'stock',
    rarity: 'common',
    name: 'Klasik Beyaz',
    subtitle: 'Orijinal sıcak beyaz fabrika farları',
    priceGold: 0,
    bulbHex: 0xfff8e7,
    emissiveHex: 0xfff3d1,
    beamHex: 0xfff4d6,
    swatch: '#fef3c7',
  },
  {
    id: 'iceXenon',
    rarity: 'common',
    name: 'Buz Xenon',
    subtitle: '8000K buz mavisi yüksek şiddetli Xenon',
    priceGold: 180,
    bulbHex: 0xe0f2fe,
    emissiveHex: 0x38bdf8,
    beamHex: 0x7dd3fc,
    swatch: '#38bdf8',
  },
  {
    id: 'gtYellow',
    rarity: 'rare',
    name: 'Sarı GT',
    subtitle: 'Le Mans dayanıklılık yarışı sarı lazer far',
    priceGold: 260,
    bulbHex: 0xfef08a,
    emissiveHex: 0xfacc15,
    beamHex: 0xfde047,
    swatch: '#facc15',
  },
  {
    id: 'purpleLed',
    rarity: 'rare',
    name: 'Mor LED',
    subtitle: 'Özel üretim mor-ultraviyole LED mercek',
    priceGold: 340,
    bulbHex: 0xf3e8ff,
    emissiveHex: 0xc084fc,
    beamHex: 0xd8b4fe,
    swatch: '#c084fc',
  },
  {
    id: 'emeraldLaser',
    rarity: 'rare',
    name: 'Zümrüt Lazer',
    subtitle: 'Keskin yeşil optik lazer pist farları',
    priceGold: 390,
    bulbHex: 0xd1fae5,
    emissiveHex: 0x34d399,
    beamHex: 0x6ee7b7,
    swatch: '#34d399',
  },
  {
    id: 'cyberPinkLed',
    rarity: 'epic',
    name: 'Siber Pembe LED',
    subtitle: 'Elektrik pembe özel yapım hiper mercek',
    priceGold: 440,
    bulbHex: 0xfce7f3,
    emissiveHex: 0xf472b6,
    beamHex: 0xf9a8d4,
    swatch: '#f472b6',
  },
  {
    id: 'demonRed',
    rarity: 'epic',
    name: 'Şeytan Gözü',
    subtitle: 'Kızıl Demon Eye agresif yarış merceği',
    priceGold: 480,
    bulbHex: 0xfecaca,
    emissiveHex: 0xef4444,
    beamHex: 0xf87171,
    swatch: '#ef4444',
  },
  {
    id: 'solarGold',
    rarity: 'epic',
    name: 'Altın Lazer',
    subtitle: 'İmparatorluk serisi amber-altın matris far',
    priceGold: 560,
    bulbHex: 0xfef3c7,
    emissiveHex: 0xf59e0b,
    beamHex: 0xfbbf24,
    swatch: '#f59e0b',
  },
  {
    id: 'prismWhite',
    rarity: 'legendary',
    name: 'Plazma Elmas',
    subtitle: '12000K saf elmas-safir ultra keskin lazer',
    priceGold: 720,
    bulbHex: 0xffffff,
    emissiveHex: 0x93c5fd,
    beamHex: 0xe0f2fe,
    swatch: 'linear-gradient(135deg, #ffffff 0%, #93c5fd 100%)',
  },
  {
    id: 'apexGoldBeam',
    rarity: 'epic',
    name: 'Şampiyon Altın Lazer',
    subtitle: 'Seviye 32 Özel · Saf altın kehribar lazer far huzmesi',
    priceGold: 0,
    bulbHex: 0xfef9c3,
    emissiveHex: 0xfacc15,
    beamHex: 0xfde047,
    swatch: 'linear-gradient(135deg, #fef08a 0%, #f59e0b 100%)',
    levelRoadLevel: 32,
  },
  {
    id: 'crimsonNovaBeam',
    rarity: 'legendary',
    name: 'Kızıl Nova Lazer',
    subtitle: 'Seviye 88 Özel · Süpernova yakut-rose hiper lazer far',
    priceGold: 0,
    bulbHex: 0xffe4e6,
    emissiveHex: 0xf43f5e,
    beamHex: 0xfb7185,
    swatch: 'linear-gradient(135deg, #ffe4e6 0%, #e11d48 100%)',
    levelRoadLevel: 88,
  },
  {
    id: 'sapphireLaser',
    rarity: 'rare',
    name: 'Safir Lazer',
    subtitle: 'Derin safir mavi uzun menzilli optik lazer far',
    priceGold: 290,
    bulbHex: 0xdbeafe,
    emissiveHex: 0x3b82f6,
    beamHex: 0x60a5fa,
    swatch: '#3b82f6',
  },
  {
    id: 'amberDrift',
    rarity: 'rare',
    name: 'Kehribar Drift',
    subtitle: 'Ralli sis delici sıcak turuncu-kehribar LED far',
    priceGold: 320,
    bulbHex: 0xffedd5,
    emissiveHex: 0xf97316,
    beamHex: 0xfb923c,
    swatch: '#f97316',
  },
  {
    id: 'mintNeonLed',
    rarity: 'epic',
    name: 'Nane Neon LED',
    subtitle: 'Buzlu nane-turkuaz yüksek parlaklıkta neon mercek',
    priceGold: 420,
    bulbHex: 0xccfbf1,
    emissiveHex: 0x14b8a6,
    beamHex: 0x2dd4bf,
    swatch: '#2dd4bf',
  },
  {
    id: 'violetPhantom',
    rarity: 'epic',
    name: 'Hayalet Mor',
    subtitle: 'Karanlık gece otoyolu için elektrik mor lazer huzmesi',
    priceGold: 510,
    bulbHex: 0xf3e8ff,
    emissiveHex: 0x9333ea,
    beamHex: 0xa855f7,
    swatch: '#9333ea',
  },
  {
    id: 'roseDiamond',
    rarity: 'legendary',
    name: 'Roze Elmas Lazer',
    subtitle: 'Pembe elmas parıltılı ultra keskin kristal lazer far',
    priceGold: 680,
    bulbHex: 0xfff1f2,
    emissiveHex: 0xfb7185,
    beamHex: 0xfda4af,
    swatch: 'linear-gradient(135deg, #fff1f2 0%, #fb7185 100%)',
  },
];

export const NITRO_FLAMES: NitroFlameSpec[] = [
  {
    id: 'blue',
    rarity: 'common',
    name: 'Klasik Mavi',
    subtitle: 'Standart yüksek basınçlı mavi nitro alevi',
    priceGold: 0,
    coreHex: 0xe0f2fe,
    midHex: 0x38bdf8,
    tipHex: 0x0369a1,
    coneHex: 0x38bdf8,
    swatch: 'linear-gradient(90deg, #e0f2fe 0%, #38bdf8 55%, #0369a1 100%)',
  },
  {
    id: 'purplePlasma',
    rarity: 'common',
    name: 'Mor Plazma',
    subtitle: 'İyonize mor-pembe plazma egzoz patlaması',
    priceGold: 280,
    coreHex: 0xf5d0fe,
    midHex: 0xc026d3,
    tipHex: 0x6b21a8,
    coneHex: 0xd946ef,
    swatch: 'linear-gradient(90deg, #f5d0fe 0%, #c026d3 55%, #581c87 100%)',
  },
  {
    id: 'venomGreen',
    rarity: 'common',
    name: 'Yeşil Zehir',
    subtitle: 'Radyoaktif zümrüt-yeşil nitro alevi',
    priceGold: 320,
    coreHex: 0xdcfce7,
    midHex: 0x22c55e,
    tipHex: 0x15803d,
    coneHex: 0x4ade80,
    swatch: 'linear-gradient(90deg, #dcfce7 0%, #22c55e 55%, #14532d 100%)',
  },
  {
    id: 'iceCrystal',
    rarity: 'rare',
    name: 'Buzul Plazma',
    subtitle: 'Sıfır altı kristal beyaz-buz mavisi jet alevi',
    priceGold: 380,
    coreHex: 0xffffff,
    midHex: 0x67e8f9,
    tipHex: 0x0284c7,
    coneHex: 0xa5f3fc,
    swatch: 'linear-gradient(90deg, #ffffff 0%, #67e8f9 55%, #0369a1 100%)',
  },
  {
    id: 'goldFlame',
    rarity: 'rare',
    name: 'Altın Alev',
    subtitle: 'Süper parlak güneş altını egzoz jeti',
    priceGold: 420,
    coreHex: 0xfef9c3,
    midHex: 0xfacc15,
    tipHex: 0xd97706,
    coneHex: 0xfbbf24,
    swatch: 'linear-gradient(90deg, #fef9c3 0%, #facc15 55%, #b45309 100%)',
  },
  {
    id: 'cyberMagenta',
    rarity: 'rare',
    name: 'Siber Pembe Alev',
    subtitle: 'Neon pembe-fuşya synthwave egzoz patlaması',
    priceGold: 460,
    coreHex: 0xfce7f3,
    midHex: 0xec4899,
    tipHex: 0x831843,
    coneHex: 0xf472b6,
    swatch: 'linear-gradient(90deg, #fce7f3 0%, #ec4899 55%, #831843 100%)',
  },
  {
    id: 'redCrackle',
    rarity: 'rare',
    name: 'Kırmızı Çatpat',
    subtitle: 'Agresif kızıl-turuncu ralli çatpat alevi',
    priceGold: 490,
    coreHex: 0xfef08a,
    midHex: 0xef4444,
    tipHex: 0x991b1b,
    coneHex: 0xf43f5e,
    swatch: 'linear-gradient(90deg, #fef08a 0%, #ef4444 55%, #7f1d1d 100%)',
  },
  {
    id: 'solarInferno',
    rarity: 'epic',
    name: 'Güneş Patlaması',
    subtitle: 'Beyaz çekirdekli lav-turuncu roket itiş alevi',
    priceGold: 620,
    coreHex: 0xffffff,
    midHex: 0xf97316,
    tipHex: 0x9a3412,
    coneHex: 0xfb923c,
    swatch: 'linear-gradient(90deg, #ffffff 0%, #fb923c 50%, #9a3412 100%)',
  },
  {
    id: 'phantomVoid',
    rarity: 'epic',
    name: 'Karanlık Plazma',
    subtitle: 'Derin çivit-mor yüksek enerjili kuantum jeti',
    priceGold: 780,
    coreHex: 0xe0e7ff,
    midHex: 0x6366f1,
    tipHex: 0x1e1b4b,
    coneHex: 0x818cf8,
    swatch: 'linear-gradient(90deg, #e0e7ff 0%, #6366f1 55%, #1e1b4b 100%)',
  },
  {
    id: 'emeraldDragon',
    rarity: 'epic',
    name: 'Ejderha Zümrütü',
    subtitle: 'Nane-zümrüt çekirdekli yüksek sıcaklık ejderha alevi',
    priceGold: 520,
    coreHex: 0xecfdf5,
    midHex: 0x10b981,
    tipHex: 0x065f46,
    coneHex: 0x34d399,
    swatch: 'linear-gradient(90deg, #ecfdf5 0%, #10b981 55%, #064e3b 100%)',
  },
  {
    id: 'whiteLightning',
    rarity: 'epic',
    name: 'Saf Şimşek',
    subtitle: 'Göz kamaştıran beyaz-gümüş yüksek voltaj arkı',
    priceGold: 640,
    coreHex: 0xffffff,
    midHex: 0xdbeafe,
    tipHex: 0x60a5fa,
    coneHex: 0xeff6ff,
    swatch: 'linear-gradient(90deg, #ffffff 0%, #dbeafe 55%, #3b82f6 100%)',
  },
  {
    id: 'cherryBlossom',
    rarity: 'epic',
    name: 'Sakura Alevi',
    subtitle: 'Kiraz çiçeği pembe-yakut drift egzoz alevi',
    priceGold: 560,
    coreHex: 0xfff1f2,
    midHex: 0xf43f5e,
    tipHex: 0x881337,
    coneHex: 0xfb7185,
    swatch: 'linear-gradient(90deg, #fff1f2 0%, #fb7185 50%, #9f1239 100%)',
  },
  {
    id: 'animAuroraPlasma',
    rarity: 'legendary',
    name: 'Aurora Plazma',
    subtitle: 'Zümrüt-turkuaz-mor arası canlı akan kuzey ışığı jeti',
    priceGold: 980,
    coreHex: 0xecfeff,
    midHex: 0x22d3ee,
    tipHex: 0x7c3aed,
    coneHex: 0x34d399,
    swatch: 'linear-gradient(90deg, #34d399 0%, #22d3ee 50%, #a855f7 100%)',
    animated: true,
    animatedMode: 'aurora',
  },
  {
    id: 'animPoliceNitro',
    rarity: 'legendary',
    name: 'Çakar Nitro',
    subtitle: 'Mavi ve kırmızı arası hızlı çakan takip egzoz patlaması',
    priceGold: 1120,
    coreHex: 0xffffff,
    midHex: 0x3b82f6,
    tipHex: 0xef4444,
    coneHex: 0x60a5fa,
    swatch: 'linear-gradient(90deg, #ef4444 0%, #ef4444 48%, #3b82f6 52%, #3b82f6 100%)',
    animated: true,
    animatedMode: 'strobe',
  },
  {
    id: 'animRainbowJet',
    rarity: 'legendary',
    name: 'RGB Gökkuşağı Jet',
    subtitle: 'Tam spektrum sürekli renk değiştiren gökkuşağı roket alevi',
    priceGold: 1380,
    coreHex: 0xffffff,
    midHex: 0xec4899,
    tipHex: 0x6366f1,
    coneHex: 0x22d3ee,
    swatch: 'linear-gradient(90deg, #ef4444, #f59e0b, #22c55e, #06b6d4, #a855f7)',
    animated: true,
    animatedMode: 'rainbow',
  },
  {
    id: 'emeraldNitro',
    rarity: 'rare',
    name: 'Zümrüt Füze Alevi',
    subtitle: 'Seviye 14 Özel · Parlak zümrüt-turkuaz jet egzoz alevi',
    priceGold: 0,
    coreHex: 0xecfdf5,
    midHex: 0x10b981,
    tipHex: 0x065f46,
    coneHex: 0x34d399,
    swatch: 'linear-gradient(90deg, #ecfdf5 0%, #10b981 55%, #065f46 100%)',
    levelRoadLevel: 14,
  },
  {
    id: 'imperialNitro',
    rarity: 'legendary',
    name: 'İmparator Altın Alevi',
    subtitle: 'Seviye 60 Özel · Saf altın-kızıl şimşekli şampiyon jet alevi',
    priceGold: 0,
    coreHex: 0xfefce8,
    midHex: 0xfacc15,
    tipHex: 0xe11d48,
    coneHex: 0xf59e0b,
    swatch: 'linear-gradient(90deg, #fefce8 0%, #facc15 48%, #e11d48 100%)',
    animated: true,
    animatedMode: 'aurora',
    levelRoadLevel: 60,
  },
  {
    id: 'cobaltJet',
    rarity: 'rare',
    name: 'Kobalt Jet',
    subtitle: 'Yüksek basınçlı derin safir mavi jet egzoz alevi',
    priceGold: 360,
    coreHex: 0xdbeafe,
    midHex: 0x2563eb,
    tipHex: 0x1e3a8a,
    coneHex: 0x3b82f6,
    swatch: 'linear-gradient(90deg, #dbeafe 0%, #2563eb 55%, #1e3a8a 100%)',
  },
  {
    id: 'amberSpark',
    rarity: 'rare',
    name: 'Kehribar Kor',
    subtitle: 'Kızgın kehribar-bakır kıvılcımlı egzoz alevi',
    priceGold: 410,
    coreHex: 0xffedd5,
    midHex: 0xf59e0b,
    tipHex: 0x9a3412,
    coneHex: 0xfb923c,
    swatch: 'linear-gradient(90deg, #ffedd5 0%, #f59e0b 55%, #9a3412 100%)',
  },
  {
    id: 'toxicLime',
    rarity: 'epic',
    name: 'Asit Yeşil Jet',
    subtitle: 'Parlak radyoaktif sarı-yeşil yüksek ısı alevi',
    priceGold: 540,
    coreHex: 0xf7fee7,
    midHex: 0xa3e635,
    tipHex: 0x3f6212,
    coneHex: 0xbef264,
    swatch: 'linear-gradient(90deg, #f7fee7 0%, #a3e635 55%, #3f6212 100%)',
  },
  {
    id: 'rubyPlasma',
    rarity: 'epic',
    name: 'Yakut Plazma',
    subtitle: 'Yoğun yakut-fuşya yüksek yoğunluklu plazma jeti',
    priceGold: 660,
    coreHex: 0xffe4e6,
    midHex: 0xe11d48,
    tipHex: 0x4c0519,
    coneHex: 0xf43f5e,
    swatch: 'linear-gradient(90deg, #ffe4e6 0%, #e11d48 55%, #4c0519 100%)',
  },
  {
    id: 'animGoldenStorm',
    rarity: 'legendary',
    name: 'Altın Fırtına',
    subtitle: 'Altın-beyaz şimşek gibi dalgalanan dinamik süper jet',
    priceGold: 1240,
    coreHex: 0xffffff,
    midHex: 0xfacc15,
    tipHex: 0xd97706,
    coneHex: 0xfde047,
    swatch: 'linear-gradient(90deg, #ffffff 0%, #facc15 48%, #f97316 100%)',
    animated: true,
    animatedMode: 'aurora',
  },
];

export const DRIFT_SMOKES: DriftSmokeSpec[] = [
  {
    id: 'white',
    rarity: 'common',
    name: 'Klasik Beyaz',
    subtitle: 'Gerçekçi lastik yanığı beyaz duman',
    priceGold: 0,
    smokeHex: 0xe4e4e7,
    swatch: '#e4e4e7',
  },
  {
    id: 'red',
    rarity: 'common',
    name: 'Kırmızı Duman',
    subtitle: 'Gösteri lastiği yoğun kırmızı duman',
    priceGold: 220,
    smokeHex: 0xf87171,
    swatch: '#ef4444',
  },
  {
    id: 'pink',
    rarity: 'common',
    name: 'Pembe Duman',
    subtitle: 'Tokyo sokak drifti neon pembe duman',
    priceGold: 240,
    smokeHex: 0xf472b6,
    swatch: '#ec4899',
  },
  {
    id: 'blue',
    rarity: 'common',
    name: 'Mavi Duman',
    subtitle: 'Elektrik mavi gösteri drift dumanı',
    priceGold: 240,
    smokeHex: 0x38bdf8,
    swatch: '#38bdf8',
  },
  {
    id: 'turquoise',
    rarity: 'rare',
    name: 'Turkuaz Sis',
    subtitle: 'Canlı tropikal turkuaz gösteri dumanı',
    priceGold: 260,
    smokeHex: 0x2dd4bf,
    swatch: '#14b8a6',
  },
  {
    id: 'emerald',
    rarity: 'rare',
    name: 'Zümrüt Duman',
    subtitle: 'Parlak zümrüt yeşili drift bulutu',
    priceGold: 290,
    smokeHex: 0x34d399,
    swatch: '#10b981',
  },
  {
    id: 'crimsonVelvet',
    rarity: 'rare',
    name: 'Bordo Duman',
    subtitle: 'Derin yakut kırmızısı ağır burnout sisi',
    priceGold: 310,
    smokeHex: 0xe11d48,
    swatch: '#be123c',
  },
  {
    id: 'violet',
    rarity: 'rare',
    name: 'Mor Plazma Duman',
    subtitle: 'Gece şovu yoğun mor sis perdesi',
    priceGold: 330,
    smokeHex: 0xc084fc,
    swatch: '#a855f7',
  },
  {
    id: 'gold',
    rarity: 'rare',
    name: 'Altın Duman',
    subtitle: 'Şampiyonluk serisi altın sarısı duman',
    priceGold: 360,
    smokeHex: 0xfacc15,
    swatch: '#facc15',
  },
  {
    id: 'obsidian',
    rarity: 'epic',
    name: 'Karbon Siyahı',
    subtitle: 'Koyu dumanlı stealth burnout efekti',
    priceGold: 440,
    smokeHex: 0x3f3f46,
    swatch: '#27272a',
  },
  {
    id: 'fireEmber',
    rarity: 'epic',
    name: 'Alev Kıvılcım',
    subtitle: 'Kızıl-turuncu kor dumanlı yarış lastiği',
    priceGold: 560,
    smokeHex: 0xf97316,
    swatch: 'linear-gradient(90deg, #facc15 0%, #f97316 55%, #dc2626 100%)',
  },
  {
    id: 'animCyberTrail',
    rarity: 'epic',
    name: 'Siber Dalga İzi',
    subtitle: 'Camgöbeği ve neon pembe dönüşümlü drift bulutu',
    priceGold: 640,
    smokeHex: 0x22d3ee,
    swatch: 'linear-gradient(90deg, #22d3ee 0%, #ec4899 100%)',
    animated: true,
    colorMode: 'cyber',
  },
  {
    id: 'animAuroraSmoke',
    rarity: 'epic',
    name: 'Aurora Sisi',
    subtitle: 'Zümrüt-mavi-mor arası renk değiştiren kuzey sisi',
    priceGold: 720,
    smokeHex: 0x34d399,
    swatch: 'linear-gradient(90deg, #10b981 0%, #38bdf8 50%, #a855f7 100%)',
    animated: true,
    colorMode: 'aurora',
  },
  {
    id: 'animLavaTrail',
    rarity: 'legendary',
    name: 'Lav Kıvılcım İzi',
    subtitle: 'Erimiş altın, turuncu ve kızıl kor bulutları',
    priceGold: 780,
    smokeHex: 0xf97316,
    swatch: 'linear-gradient(90deg, #fde047 0%, #f97316 50%, #ef4444 100%)',
    animated: true,
    colorMode: 'lava',
  },
  {
    id: 'animPoliceSmoke',
    rarity: 'legendary',
    name: 'Çakar Duman İzi',
    subtitle: 'Kırmızı ve mavi siren ışığı gibi değişen drift izi',
    priceGold: 840,
    smokeHex: 0x3b82f6,
    swatch: 'linear-gradient(90deg, #ef4444 0%, #ef4444 48%, #3b82f6 52%, #3b82f6 100%)',
    animated: true,
    colorMode: 'police',
  },
  {
    id: 'rainbow',
    rarity: 'legendary',
    name: 'Gökkuşağı',
    subtitle: 'Her bulutta renk değiştiren gökkuşağı drift',
    priceGold: 890,
    smokeHex: 0xf472b6,
    swatch: 'linear-gradient(90deg, #ef4444, #f59e0b, #22c55e, #06b6d4, #a855f7)',
    rainbow: true,
    animated: true,
    colorMode: 'rainbow',
  },
  {
    id: 'bronzeSparkSmoke',
    rarity: 'rare',
    name: 'Bronz Kıvılcım Dumanı',
    subtitle: 'Seviye 6 Özel · Sıcak bronz ve kehribar drift bulutu',
    priceGold: 0,
    smokeHex: 0xf59e0b,
    swatch: 'linear-gradient(90deg, #9a3412 0%, #f97316 55%, #fde047 100%)',
    levelRoadLevel: 6,
  },
  {
    id: 'apexChampionSmoke',
    rarity: 'legendary',
    name: 'Apex Şampiyon İzi',
    subtitle: 'Seviye 80 Özel · Altın-kızıl kor ve aurora şampiyonluk izi',
    priceGold: 0,
    smokeHex: 0xfacc15,
    swatch: 'linear-gradient(90deg, #facc15 0%, #f43f5e 52%, #c084fc 100%)',
    animated: true,
    colorMode: 'lava',
    levelRoadLevel: 80,
  },
  {
    id: 'orange',
    rarity: 'common',
    name: 'Turuncu Duman',
    subtitle: 'Canlı gün batımı turuncusu gösteri drift dumanı',
    priceGold: 250,
    smokeHex: 0xfb923c,
    swatch: '#fb923c',
  },
  {
    id: 'lime',
    rarity: 'rare',
    name: 'Asit Yeşil Duman',
    subtitle: 'Neon fıstık yeşili yüksek görünürlüklü drift bulutu',
    priceGold: 280,
    smokeHex: 0xa3e635,
    swatch: '#a3e635',
  },
  {
    id: 'iceBlue',
    rarity: 'rare',
    name: 'Buzul Sis',
    subtitle: 'Buz mavisi-beyaz serin arktik lastik dumanı',
    priceGold: 310,
    smokeHex: 0xbae6fd,
    swatch: '#bae6fd',
  },
  {
    id: 'magenta',
    rarity: 'epic',
    name: 'Fuşya Duman',
    subtitle: 'Parlak elektrik fuşya gece drift sis perdesi',
    priceGold: 420,
    smokeHex: 0xe879f9,
    swatch: '#e879f9',
  },
  {
    id: 'animGoldGlitter',
    rarity: 'legendary',
    name: 'Altın Parıltı İzi',
    subtitle: 'Altın-kehribar kor tonlarında parıldayan dinamik drift izi',
    priceGold: 860,
    smokeHex: 0xfde047,
    swatch: 'linear-gradient(90deg, #fef08a 0%, #eab308 50%, #f97316 100%)',
    animated: true,
    colorMode: 'lava',
  },
];

export const ROOF_HATS: RoofHatSpec[] = [
  {
    id: 'none',
    rarity: 'common',
    name: 'Şapkasız',
    subtitle: 'Temiz orijinal tavan görünümü',
    priceGold: 0,
    swatch: '#3f3f46',
  },
  {
    id: 'baseball',
    rarity: 'common',
    name: 'Sokak Şapkası',
    subtitle: 'Kırmızı-beyaz kavisli siperlikli sokak kepi',
    priceGold: 160,
    swatch: 'linear-gradient(135deg, #ef4444 0%, #f8fafc 100%)',
  },
  {
    id: 'chef',
    rarity: 'common',
    name: 'Usta Şef Şapkası',
    subtitle: 'Yüksek pilili beyaz şef şapkası ve kırmızı bant',
    priceGold: 190,
    swatch: 'linear-gradient(135deg, #ffffff 0%, #e4e4e7 75%, #dc2626 100%)',
  },
  {
    id: 'fez',
    rarity: 'rare',
    name: 'Klasik Fes',
    subtitle: 'Bordo fes ve sürüşte sallanan siyah püskül',
    priceGold: 220,
    swatch: 'linear-gradient(135deg, #991b1b 0%, #dc2626 70%, #18181b 100%)',
    animated: true,
  },
  {
    id: 'ushanka',
    rarity: 'common',
    name: 'Kışlık Kalpak',
    subtitle: 'Kürklü kulaklıklı kış kalpağı ve altın yıldız arma',
    priceGold: 250,
    swatch: 'linear-gradient(135deg, #3f3f46 0%, #71717a 68%, #facc15 100%)',
  },
  {
    id: 'cowboy',
    rarity: 'rare',
    name: 'Kovboy Şapkası',
    subtitle: 'Kıvrık kenarlı deri şapka ve altın tokalı şerit',
    priceGold: 280,
    swatch: 'linear-gradient(135deg, #92400e 0%, #78350f 68%, #f59e0b 100%)',
  },
  {
    id: 'sombrero',
    rarity: 'rare',
    name: 'Meksika Sombrero',
    subtitle: 'Geniş renkli şeritli hasır fiesta şapkası',
    priceGold: 310,
    swatch: 'linear-gradient(135deg, #eab308 0%, #ef4444 50%, #22c55e 100%)',
  },
  {
    id: 'propeller',
    rarity: 'rare',
    name: 'Pervaneli Şapka',
    subtitle: 'Renkli şapka ve hızla birlikte dönen üst pervane',
    priceGold: 340,
    swatch: 'linear-gradient(90deg, #ef4444, #facc15, #22c55e, #3b82f6)',
    animated: true,
  },
  {
    id: 'pirate',
    rarity: 'rare',
    name: 'Korsan Şapkası',
    subtitle: 'Altın şeritli siyah kaptan şapkası ve kurukafa arma',
    priceGold: 380,
    swatch: 'linear-gradient(135deg, #18181b 0%, #27272a 65%, #f59e0b 100%)',
  },
  {
    id: 'tophat',
    rarity: 'epic',
    name: 'Silindir Şapka',
    subtitle: 'Parlak siyah smokin şapkası ve kırmızı kurdele',
    priceGold: 420,
    swatch: 'linear-gradient(135deg, #09090b 0%, #27272a 72%, #dc2626 100%)',
  },
  {
    id: 'viking',
    rarity: 'epic',
    name: 'Viking Miğferi',
    subtitle: 'Çelik miğfer, pirinç perçinler ve kıvrık boynuzlar',
    priceGold: 520,
    swatch: 'linear-gradient(135deg, #71717a 0%, #d4d4d8 65%, #fef3c7 100%)',
  },
  {
    id: 'samurai',
    rarity: 'epic',
    name: 'Samuray Kabuto',
    subtitle: 'Siyah-kızıl lake miğfer ve dev altın hilal sorguç',
    priceGold: 590,
    swatch: 'linear-gradient(135deg, #18181b 0%, #b91c1c 55%, #facc15 100%)',
  },
  {
    id: 'policeBeacon',
    rarity: 'epic',
    name: 'Polis Çakar Barı',
    subtitle: 'Tavan üstü kırmızı-mavi hızlı çakan takip tepe lambası',
    priceGold: 640,
    swatch: 'linear-gradient(90deg, #ef4444 0%, #ef4444 48%, #3b82f6 52%, #3b82f6 100%)',
    animated: true,
  },
  {
    id: 'crown',
    rarity: 'legendary',
    name: 'Altın Kral Tacı',
    subtitle: '24 ayar altın taç, kadife kubbe ve parlayan yakutlar',
    priceGold: 680,
    swatch: 'linear-gradient(135deg, #fde047 0%, #f59e0b 65%, #dc2626 100%)',
    animated: true,
  },
  {
    id: 'flameMohawk',
    rarity: 'epic',
    name: 'Alevli Mohawk',
    subtitle: 'Tavan boyunca dalgalanan parlak ateş dikenleri',
    priceGold: 740,
    swatch: 'linear-gradient(135deg, #fef08a 0%, #f97316 52%, #dc2626 100%)',
    animated: true,
  },
  {
    id: 'wizardHat',
    rarity: 'legendary',
    name: 'Büyücü Şapkası',
    subtitle: 'Yıldızlı gece mavisi sivri şapka ve dönen sihir küreleri',
    priceGold: 820,
    swatch: 'linear-gradient(135deg, #1e1b4b 0%, #6366f1 60%, #fde047 100%)',
    animated: true,
  },
  {
    id: 'haloAngel',
    rarity: 'legendary',
    name: 'Melek Halesi',
    subtitle: 'Tavan üstünde süzülerek parlayan 24K altın ışık halesi',
    priceGold: 920,
    swatch: 'linear-gradient(135deg, #fef9c3 0%, #facc15 65%, #f59e0b 100%)',
    animated: true,
  },
  {
    id: 'ufoSaucer',
    rarity: 'legendary',
    name: 'Mini UFO Disk',
    subtitle: 'Tavan üstünde dönerek süzülen ışıklı uzay gemisi',
    priceGold: 1080,
    swatch: 'linear-gradient(135deg, #94a3b8 0%, #22c55e 55%, #38bdf8 100%)',
    animated: true,
  },
  {
    id: 'racingHelmet',
    rarity: 'rare',
    name: 'Pilot Kaskı',
    subtitle: 'Seviye 10 Özel · Karbon şeritli ve ayna vizörlü yarış pilot kaskı',
    priceGold: 0,
    swatch: 'linear-gradient(135deg, #f8fafc 0%, #ef4444 55%, #0f172a 100%)',
    levelRoadLevel: 10,
  },
  {
    id: 'goldenTrophy',
    rarity: 'legendary',
    name: 'Altın Şampiyon Kupası',
    subtitle: 'Seviye 50 Özel · Tavan üstünde parlayan 24K şampiyonluk kupası',
    priceGold: 0,
    swatch: 'linear-gradient(135deg, #fef08a 0%, #eab308 55%, #92400e 100%)',
    animated: true,
    levelRoadLevel: 50,
  },
  {
    id: 'apexCrown',
    rarity: 'legendary',
    name: 'Apex İmparator Tacı',
    subtitle: 'Seviye 95 Özel · Yakut ve elmas işlemeli yüzen imparator tacı',
    priceGold: 0,
    swatch: 'linear-gradient(135deg, #fde047 0%, #e11d48 52%, #a855f7 100%)',
    animated: true,
    levelRoadLevel: 95,
  },
  {
    id: 'beret',
    rarity: 'common',
    name: 'Paris Beresi',
    subtitle: 'Hafif yana yatık şık kızıl yün bere',
    priceGold: 210,
    swatch: 'linear-gradient(135deg, #be123c 0%, #e11d48 68%, #4c0519 100%)',
  },
  {
    id: 'beanie',
    rarity: 'common',
    name: 'Kışlık Bere',
    subtitle: 'Lacivert-amber örgü bere ve üst ponpon',
    priceGold: 230,
    swatch: 'linear-gradient(135deg, #1e3a8a 0%, #f59e0b 65%, #f8fafc 100%)',
  },
  {
    id: 'astronaut',
    rarity: 'epic',
    name: 'Astronot Kaskı',
    subtitle: 'İnci beyazı uzay kaskı ve yansıtıcı 24K altın vizör',
    priceGold: 560,
    swatch: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 52%, #eab308 100%)',
  },
  {
    id: 'devilHorns',
    rarity: 'epic',
    name: 'Şeytan Boynuzları',
    subtitle: 'Kıvrımlı parlak kızıl-obsidyen ikiz tavan boynuzları',
    priceGold: 620,
    swatch: 'linear-gradient(135deg, #18181b 0%, #dc2626 55%, #f97316 100%)',
    animated: true,
  },
  {
    id: 'cyberVisorCrown',
    rarity: 'legendary',
    name: 'Siber Holo Taç',
    subtitle: 'Tavan üstünde süzülüp dönen neon cyan-mor hologram taç',
    priceGold: 980,
    swatch: 'linear-gradient(135deg, #22d3ee 0%, #a855f7 55%, #ec4899 100%)',
    animated: true,
  },
  {
    id: 'trafficCone',
    rarity: 'common',
    name: 'Trafik Konisi',
    subtitle: 'Tavanda hafif eğik duran parlak turuncu reflektörlü yol dubası',
    priceGold: 180,
    swatch: 'linear-gradient(135deg, #f97316 0%, #ffffff 50%, #ea580c 100%)',
  },
  {
    id: 'taxiSign',
    rarity: 'common',
    name: 'Sarı Taksi Tabelası',
    subtitle: 'Damalı şeritli ve ışıklı klasik sarı tavan taksi tabelası',
    priceGold: 220,
    swatch: 'linear-gradient(135deg, #facc15 0%, #18181b 55%, #fef08a 100%)',
    animated: true,
  },
  {
    id: 'sharkFinHat',
    rarity: 'rare',
    name: 'Köpekbalığı Yüzgeci',
    subtitle: 'Tavanı yaran devasa büyük beyaz köpekbalığı sırt yüzgeci',
    priceGold: 340,
    swatch: 'linear-gradient(135deg, #334155 0%, #64748b 58%, #e2e8f0 100%)',
  },
  {
    id: 'pumpkinLantern',
    rarity: 'rare',
    name: 'Balkabağı Fener',
    subtitle: 'İçinden sıcak alev parıltısı yayan oymalı Cadılar Bayramı balkabağı',
    priceGold: 390,
    swatch: 'linear-gradient(135deg, #ea580c 0%, #f59e0b 55%, #16a34a 100%)',
    animated: true,
  },
  {
    id: 'headcrabHat',
    rarity: 'epic',
    name: 'Headcrab',
    subtitle: 'Arabanın tavanına pençeleriyle sımsıkı yapışmış 3D Half-Life Headcrab',
    priceGold: 680,
    swatch: 'linear-gradient(135deg, #5c3322 0%, #c99c72 52%, #7f1d2d 100%)',
  },
  {
    id: 'pharaohNemes',
    rarity: 'epic',
    name: 'Firavun Tacı',
    subtitle: 'Altın-lacivert çizgili Mısır Nemes başlığı ve parlayan kobra mücevheri',
    priceGold: 720,
    swatch: 'linear-gradient(135deg, #1d4ed8 0%, #facc15 55%, #06b6d4 100%)',
    animated: true,
  },
  {
    id: 'companionCube',
    rarity: 'legendary',
    name: 'Companion Cube',
    subtitle: 'Tavan üstünde süzülen Portal Companion Cube ve parlayan pembe kalp amblemleri',
    priceGold: 1080,
    swatch: 'linear-gradient(135deg, #64748b 0%, #e2e8f0 48%, #f472b6 100%)',
    animated: true,
  },
  {
    id: 'diamondHelmet',
    rarity: 'legendary',
    name: 'Elmas Kask',
    subtitle: 'Minecraft büyü parıltılı voxel elmas kask ve etrafında dönen büyü küpleri',
    priceGold: 1140,
    swatch: 'linear-gradient(135deg, #06b6d4 0%, #22d3ee 52%, #a855f7 100%)',
    animated: true,
  },
  {
    id: 'rubberDuck',
    rarity: 'common',
    name: 'Sarı Ördek',
    subtitle: 'Tavan üstünde rüzgarı yaran parlak sarı plastik banyo ördeği',
    priceGold: 200,
    swatch: 'linear-gradient(135deg, #facc15 0%, #fde047 58%, #f97316 100%)',
  },
  {
    id: 'hardHat',
    rarity: 'common',
    name: 'Şantiye Bareti',
    subtitle: 'Klasik sarı güvenlik bareti, üst güçlendirme şeridi ve alın feneri',
    priceGold: 210,
    swatch: 'linear-gradient(135deg, #eab308 0%, #facc15 62%, #3f3f46 100%)',
  },
  {
    id: 'sushiRoll',
    rarity: 'rare',
    name: 'Somon Sushi',
    subtitle: 'Yosun kuşaklı dev somon nigiri sushi ve taze wasabi dokunuşu',
    priceGold: 330,
    swatch: 'linear-gradient(135deg, #f97316 0%, #f8fafc 52%, #14532d 100%)',
  },
  {
    id: 'graduationCap',
    rarity: 'rare',
    name: 'Mezuniyet Kepi',
    subtitle: 'Mat siyah akademik kep ve hızla rüzgarda savrulan altın püskül',
    priceGold: 360,
    swatch: 'linear-gradient(135deg, #09090b 0%, #27272a 65%, #facc15 100%)',
    animated: true,
  },
  {
    id: 'knightHelmet',
    rarity: 'rare',
    name: 'Şövalye Miğferi',
    subtitle: 'Pirinç haç korumalı parlatılmış çelik miğfer ve kızıl sorguç',
    priceGold: 420,
    swatch: 'linear-gradient(135deg, #94a3b8 0%, #facc15 55%, #dc2626 100%)',
  },
  {
    id: 'catEars',
    rarity: 'epic',
    name: 'Neon Kedi Kulakları',
    subtitle: 'Karbon tavan bandı üzerinde parlayan pembe neon oyuncu kedi kulakları',
    priceGold: 580,
    swatch: 'linear-gradient(135deg, #18181b 0%, #ec4899 58%, #f472b6 100%)',
    animated: true,
  },
  {
    id: 'ramenBowl',
    rarity: 'epic',
    name: 'Sıcak Ramen Kasesi',
    subtitle: 'Çubuklu, yumurtalı, narutomakili ve tütmeye devam eden Japon ramen kasesi',
    priceGold: 640,
    swatch: 'linear-gradient(135deg, #991b1b 0%, #f59e0b 55%, #f8fafc 100%)',
    animated: true,
  },
  {
    id: 'creeperHead',
    rarity: 'epic',
    name: 'Creeper Kafası',
    subtitle: 'Klasik yeşil pikselli Minecraft Creeper kafası ve nabız atan patlama parıltısı',
    priceGold: 740,
    swatch: 'linear-gradient(135deg, #15803d 0%, #4ade80 55%, #09090b 100%)',
    animated: true,
  },
  {
    id: 'miniHeliRotor',
    rarity: 'legendary',
    name: 'Helikopter Pervanesi',
    subtitle: 'Hızlandıkça delice dönen çift karbon helikopter rotoru ve tepe ikaz ışığı',
    priceGold: 940,
    swatch: 'linear-gradient(135deg, #18181b 0%, #64748b 55%, #ef4444 100%)',
    animated: true,
  },
  {
    id: 'blackHoleOrb',
    rarity: 'legendary',
    name: 'Kara Delik',
    subtitle: 'Tavan üstünde süzülen olay ufku, yanan akresyon diski ve dönen yıldız parçaları',
    priceGold: 1280,
    swatch: 'linear-gradient(135deg, #020617 0%, #f97316 52%, #a855f7 100%)',
    animated: true,
  },
];

export const STEERING_WHEELS: SteeringWheelSpec[] = [
  {
    id: 'stock',
    rarity: 'common',
    name: 'Standart Spor',
    subtitle: 'Siyah deri simit, 3 kollu alüminyum göbek',
    priceGold: 0,
    swatch: 'linear-gradient(135deg, #18181b 0%, #52525b 75%, #f59e0b 100%)',
  },
  {
    id: 'wood',
    rarity: 'common',
    name: 'Klasik Ahşap',
    subtitle: 'Parlak ceviz ahşap simit ve delikli krom kollar',
    priceGold: 200,
    swatch: 'linear-gradient(135deg, #78350f 0%, #b45309 65%, #e4e4e7 100%)',
  },
  {
    id: 'rallyDish',
    rarity: 'common',
    name: 'Ralli Derin Çanak',
    subtitle: 'Sarı üst hizalama bantlı mat siyah ralli direksiyonu',
    priceGold: 260,
    swatch: 'linear-gradient(135deg, #18181b 0%, #27272a 70%, #facc15 100%)',
  },
  {
    id: 'alcantara',
    rarity: 'rare',
    name: 'Alcantara Yarış',
    subtitle: 'Derin çanak mat süet simit ve kırmızı üst şerit',
    priceGold: 320,
    swatch: 'linear-gradient(135deg, #18181b 0%, #27272a 72%, #ef4444 100%)',
  },
  {
    id: 'retroChain',
    rarity: 'rare',
    name: 'Krom Zincir',
    subtitle: 'Lowrider tarzı ayna krom kaynaklı zincir simit',
    priceGold: 380,
    swatch: 'linear-gradient(135deg, #e4e4e7 0%, #ffffff 55%, #71717a 100%)',
  },
  {
    id: 'woodenBoat',
    rarity: 'rare',
    name: 'Kaptan Dümeni',
    subtitle: '6 pirinç tutamaklı maun denizci dümeni',
    priceGold: 420,
    swatch: 'linear-gradient(135deg, #7c2d12 0%, #b45309 55%, #facc15 100%)',
  },
  {
    id: 'carbonD',
    rarity: 'epic',
    name: 'Karbon D-Kesim',
    subtitle: 'Altı düz dövme karbon simit, kırmızı 12-saat şeridi ve spor göbek',
    priceGold: 460,
    swatch: 'linear-gradient(135deg, #111827 0%, #374151 60%, #dc2626 100%)',
  },
  {
    id: 'camoTactical',
    rarity: 'rare',
    name: 'Taktik Zırhlı',
    subtitle: 'Sekizgen zırhlı mat haki gövde ve pirinç cıvatalar',
    priceGold: 490,
    swatch: 'linear-gradient(135deg, #365314 0%, #3f3f46 65%, #ca8a04 100%)',
  },
  {
    id: 'driftNeo',
    rarity: 'epic',
    name: 'JDM Drift Neon',
    subtitle: 'Renk değiştiren neokrom kollar ve hızlı drift göbeği',
    priceGold: 540,
    swatch: 'linear-gradient(135deg, #06b6d4 0%, #a855f7 55%, #ec4899 100%)',
    animated: true,
  },
  {
    id: 'marbleLux',
    rarity: 'epic',
    name: 'Beyaz Mermer VIP',
    subtitle: 'İnci beyazı simit ve pembe altın şampanya kollar',
    priceGold: 580,
    swatch: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 58%, #fda4af 100%)',
  },
  {
    id: 'f1Yoke',
    rarity: 'epic',
    name: 'F1 Formula Yoke',
    subtitle: 'Kelebek Formula direksiyonu, dijital ekran ve özel canlı RPM LED barı',
    priceGold: 620,
    swatch: 'linear-gradient(135deg, #0f172a 0%, #ef4444 55%, #38bdf8 100%)',
    hasShiftLeds: true,
    animated: true,
  },
  {
    id: 'goldVip',
    rarity: 'epic',
    name: 'VIP Altın',
    subtitle: '24K altın kollar, krem deri simit ve zümrüt arma',
    priceGold: 780,
    swatch: 'linear-gradient(135deg, #fef3c7 0%, #f59e0b 65%, #10b981 100%)',
  },
  {
    id: 'cyberTron',
    rarity: 'legendary',
    name: 'Siber Tron',
    subtitle: 'Altıgen siyah gövde ve nabız atan cyan ışık hatları',
    priceGold: 860,
    swatch: 'linear-gradient(135deg, #09090b 0%, #06b6d4 55%, #38bdf8 100%)',
    animated: true,
  },
  {
    id: 'magmaCore',
    rarity: 'legendary',
    name: 'İnferno Lav',
    subtitle: 'Obsidyen simit, nefes alan lav damarları ve kor çekirdek',
    priceGold: 940,
    swatch: 'linear-gradient(135deg, #1c0a06 0%, #dc2626 52%, #facc15 100%)',
    animated: true,
  },
  {
    id: 'stealthJet',
    rarity: 'legendary',
    name: 'Savaş Uçağı Yoke',
    subtitle: 'Çift boynuzlu jet kumandası, radar ekranı ve ateş tetiği',
    priceGold: 1050,
    swatch: 'linear-gradient(135deg, #1e293b 0%, #10b981 60%, #ef4444 100%)',
    animated: true,
  },
  {
    id: 'rgbPrismWheel',
    rarity: 'legendary',
    name: 'RGB Prizma Yarış',
    subtitle: 'Gökkuşağı spektrumunda dönen iç neon halka ve karbon gövde',
    priceGold: 1180,
    swatch: 'linear-gradient(90deg, #ef4444, #f59e0b, #22c55e, #06b6d4, #a855f7)',
    animated: true,
  },
  {
    id: 'hyperHolo',
    rarity: 'legendary',
    name: 'Hiper Hologram',
    subtitle: 'Yüzen saydam holo-ark simit ve dönen enerji çekirdeği',
    priceGold: 1380,
    swatch: 'linear-gradient(135deg, #22d3ee 0%, #818cf8 55%, #e879f9 100%)',
    animated: true,
  },
  {
    id: 'levelCarbonPro',
    rarity: 'epic',
    name: 'Seviye Karbon GT',
    subtitle: 'Seviye 45 Özel · Altın merkez şeritli dövme karbon GT direksiyonu',
    priceGold: 0,
    swatch: 'linear-gradient(135deg, #111827 0%, #374151 55%, #facc15 100%)',
    levelRoadLevel: 45,
  },
  {
    id: 'apexEmperorWheel',
    rarity: 'legendary',
    name: 'İmparator Altın Yoke',
    subtitle: 'Seviye 92 Özel · Kızıl-altın Formula yoke ve yakut ışıklı tutamaklar',
    priceGold: 0,
    swatch: 'linear-gradient(135deg, #450a0a 0%, #facc15 55%, #f43f5e 100%)',
    animated: true,
    levelRoadLevel: 92,
  },
  {
    id: 'leatherRed',
    rarity: 'common',
    name: 'Kırmızı Dikiş GT',
    subtitle: 'Siyah delikli deri simit, kızıl kollar ve kırmızı merkez şeridi',
    priceGold: 240,
    swatch: 'linear-gradient(135deg, #18181b 0%, #27272a 62%, #dc2626 100%)',
  },
  {
    id: 'titaniumSport',
    rarity: 'rare',
    name: 'Fırçalanmış Titanyum',
    subtitle: 'Altı düz CNC titanyum simit ve mavi yarış halkası',
    priceGold: 390,
    swatch: 'linear-gradient(135deg, #94a3b8 0%, #cbd5e1 62%, #0284c7 100%)',
  },
  {
    id: 'driftSuedeBlue',
    rarity: 'rare',
    name: 'Mavi Süet Drift',
    subtitle: 'Kobalt mavi derin süet simit ve sarı üst hizalama bandı',
    priceGold: 450,
    swatch: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 68%, #facc15 100%)',
  },
  {
    id: 'emeraldCarbon',
    rarity: 'epic',
    name: 'Zümrüt Karbon GT',
    subtitle: 'Karbon D-kesim simit ve nabız atan zümrüt neon iç şerit',
    priceGold: 740,
    swatch: 'linear-gradient(135deg, #09090b 0%, #10b981 62%, #6ee7b7 100%)',
    animated: true,
  },
  {
    id: 'plasmaYoke',
    rarity: 'legendary',
    name: 'Plazma Fütürist Yoke',
    subtitle: 'Atan mor-camgöbeği plazma kelebek kumanda ve dönen kristal çekirdek',
    priceGold: 1280,
    swatch: 'linear-gradient(135deg, #1e1b4b 0%, #a855f7 52%, #22d3ee 100%)',
    animated: true,
  },
  {
    id: 'scrapMadMax',
    rarity: 'epic',
    name: 'Hurda Mad Max',
    subtitle: 'Paslı kaynaklı demir simit, dikenli çember, sargılı tutamak ve dişli göbek',
    priceGold: 640,
    swatch: 'linear-gradient(135deg, #451a03 0%, #9a3412 52%, #52525b 100%)',
  },
  {
    id: 'pixelVoxel',
    rarity: 'epic',
    name: 'Piksel Voxel Blok',
    subtitle: '8-bit küp bloklardan oluşan retro voxel simit ve elmas piksel göbek',
    priceGold: 760,
    swatch: 'linear-gradient(135deg, #18181b 0%, #22c55e 48%, #22d3ee 100%)',
  },
  {
    id: 'obsidianMagma',
    rarity: 'legendary',
    name: 'Magma & Obsidyen',
    subtitle: 'Kırık obsidyen kaya zırhı, erimiş lav çatlakları ve dönen volkan çekirdeği',
    priceGold: 1150,
    swatch: 'linear-gradient(135deg, #0c0a0f 0%, #dc2626 48%, #facc15 100%)',
    animated: true,
  },
  {
    id: 'hevLambda',
    rarity: 'legendary',
    name: 'HEV Mark V (λ)',
    subtitle: 'Zırhlı tehlike turuncusu HEV Mark IV/V direksiyonu, ortada ışıklı λ amblemi',
    priceGold: 1320,
    swatch: 'linear-gradient(135deg, #18181b 0%, #f97316 55%, #facc15 100%)',
    animated: true,
  },
  {
    id: 'headcrab',
    rarity: 'epic',
    name: 'Headcrab',
    subtitle: 'Göbeğe sarılmış 3D Headcrab, eklemli pençe bacak kolları ve organik simit',
    priceGold: 820,
    swatch: 'linear-gradient(135deg, #5c3322 0%, #c99c72 52%, #7f1d2d 100%)',
  },
  {
    id: 'craftingTable',
    rarity: 'epic',
    name: 'Crafting Table',
    subtitle: 'Minecraft meşe blok voxel simit, yan demir alet pikselleri ve 3×3 üretim ızgarası',
    priceGold: 790,
    swatch: 'linear-gradient(135deg, #5c3a1e 0%, #c89e66 52%, #94a3b8 100%)',
  },
  {
    id: 'aperturePortal',
    rarity: 'legendary',
    name: 'Aperture Science',
    subtitle: 'Mavi-turuncu portal halkalı beyaz laboratuvar simidi ve 8 kanatlı Aperture logosu',
    priceGold: 1240,
    swatch: 'linear-gradient(135deg, #0284c7 0%, #f8fafc 50%, #f97316 100%)',
    animated: true,
  },
  {
    id: 'wheatleyCore',
    rarity: 'legendary',
    name: 'Wheatley Çekirdek',
    subtitle: 'Portal 2 Wheatley kişilik çekirdeği, dönen mavi optik göz ve ray tutamakları',
    priceGold: 1290,
    swatch: 'linear-gradient(135deg, #1e293b 0%, #e2e8f0 48%, #38bdf8 100%)',
    animated: true,
  },
];

export const MIRROR_CHARMS: MirrorCharmSpec[] = [
  {
    id: 'none',
    rarity: 'common',
    name: 'Süssüz',
    subtitle: 'Sade dikiz aynası',
    priceGold: 0,
    swatch: '#3f3f46',
  },
  {
    id: 'nazar',
    rarity: 'common',
    name: 'Nazar Boncuğu',
    subtitle: 'Cam parlaklığında sallanan mavi nazar boncuğu',
    priceGold: 140,
    swatch: 'radial-gradient(circle, #0f172a 18%, #38bdf8 34%, #ffffff 55%, #1d4ed8 76%)',
  },
  {
    id: 'pine',
    rarity: 'common',
    name: 'Çam Koku Ağacı',
    subtitle: 'Klasik yeşil oto kokusu çam ağacı',
    priceGold: 150,
    swatch: 'linear-gradient(135deg, #15803d 0%, #22c55e 70%, #86efac 100%)',
  },
  {
    id: 'dice',
    rarity: 'common',
    name: 'Peluş Zar Çifti',
    subtitle: 'Beyaz noktalı ikili kırmızı klasik peluş zar',
    priceGold: 190,
    swatch: 'linear-gradient(135deg, #dc2626 0%, #ef4444 65%, #f8fafc 100%)',
  },
  {
    id: 'miniWheel',
    rarity: 'rare',
    name: 'Mini Yarış Jantı',
    subtitle: 'Bronz 5-kollu mini yarış tekerleği anahtarlığı',
    priceGold: 220,
    swatch: 'linear-gradient(135deg, #18181b 0%, #b45309 65%, #facc15 100%)',
  },
  {
    id: 'boxingGloves',
    rarity: 'rare',
    name: 'Boks Eldiveni',
    subtitle: 'Bağcıklı ikili kırmızı mini boks eldiveni',
    priceGold: 260,
    swatch: 'linear-gradient(135deg, #991b1b 0%, #ef4444 72%, #f1f5f9 100%)',
  },
  {
    id: 'goldenHorseshoe',
    rarity: 'rare',
    name: 'Şans Nalı',
    subtitle: 'Otoyolda uğur getiren 24K parlatılmış altın nal',
    priceGold: 290,
    swatch: 'linear-gradient(135deg, #fef08a 0%, #eab308 62%, #a16207 100%)',
  },
  {
    id: 'crescentStar',
    rarity: 'rare',
    name: 'Ay-Yıldız',
    subtitle: 'Parlak kırmızı-altın 3D hilal ve yıldız madalyonu',
    priceGold: 320,
    swatch: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 62%, #fde047 100%)',
  },
  {
    id: 'miniHelmet',
    rarity: 'rare',
    name: 'Mini Yarış Kaskı',
    subtitle: 'Kırmızı-beyaz parlak pilot kaskı ve koyu vizör',
    priceGold: 350,
    swatch: 'linear-gradient(135deg, #ef4444 0%, #ffffff 55%, #1e293b 100%)',
  },
  {
    id: 'turbo',
    rarity: 'epic',
    name: 'Mini Turbo',
    subtitle: 'Devirle birlikte dönen krom turboşarj anahtarlığı',
    priceGold: 380,
    swatch: 'linear-gradient(135deg, #94a3b8 0%, #f8fafc 60%, #38bdf8 100%)',
    animated: true,
  },
  {
    id: 'skullChrome',
    rarity: 'epic',
    name: 'Krom Kurukafa',
    subtitle: 'Ayna krom kurukafa ve parlayan yakut gözler',
    priceGold: 420,
    swatch: 'linear-gradient(135deg, #e4e4e7 0%, #71717a 65%, #ef4444 100%)',
  },
  {
    id: 'katanaMini',
    rarity: 'epic',
    name: 'Mini Samuray Kılıcı',
    subtitle: 'Çift altın ipe asılı Japon katana ve işlemeli kabza',
    priceGold: 450,
    swatch: 'linear-gradient(135deg, #f8fafc 0%, #94a3b8 55%, #dc2626 100%)',
  },
  {
    id: 'goldCrown',
    rarity: 'epic',
    name: 'Altın Taç Süsü',
    subtitle: 'Yakut taşlı sallanan mini 24K altın kral tacı',
    priceGold: 480,
    swatch: 'linear-gradient(135deg, #fde047 0%, #d97706 70%, #ef4444 100%)',
  },
  {
    id: 'neonHeart',
    rarity: 'epic',
    name: 'Nabız Neon Kalp',
    subtitle: 'Hız arttıkça kalp gibi atan parlak neon pembe kalp',
    priceGold: 540,
    swatch: 'linear-gradient(135deg, #f43f5e 0%, #ec4899 65%, #fbcfe8 100%)',
    animated: true,
  },
  {
    id: 'miniJet',
    rarity: 'legendary',
    name: 'Mini Jet Türbin',
    subtitle: 'Devirle dönen jet pervanesi ve parlayan mavi art yakıcı',
    priceGold: 620,
    swatch: 'linear-gradient(135deg, #475569 0%, #cbd5e1 55%, #38bdf8 100%)',
    animated: true,
  },
  {
    id: 'discoBall',
    rarity: 'legendary',
    name: 'Disko Topu',
    subtitle: 'Sürekli dönerek rengarenk parlayan aynalı disko küresi',
    priceGold: 680,
    swatch: 'linear-gradient(135deg, #f8fafc 0%, #38bdf8 40%, #ec4899 75%, #facc15 100%)',
    animated: true,
  },
  {
    id: 'crystalPrism',
    rarity: 'legendary',
    name: 'Prizma Kristal',
    subtitle: 'Dönerek gökkuşağı rengi değiştiren elmas prizma',
    priceGold: 760,
    swatch: 'linear-gradient(135deg, #22d3ee 0%, #a855f7 50%, #f43f5e 100%)',
    animated: true,
  },
  {
    id: 'plasmaOrb',
    rarity: 'legendary',
    name: 'Plazma Küre',
    subtitle: 'Çift ters dönen jiroskop halkalı canlı enerji çekirdeği',
    priceGold: 880,
    swatch: 'linear-gradient(135deg, #06b6d4 0%, #6366f1 55%, #e879f9 100%)',
    animated: true,
  },
  {
    id: 'checkeredFlag',
    rarity: 'rare',
    name: 'Damalı Yarış Bayrağı',
    subtitle: 'Seviye 8 Özel · Sallanan siyah-beyaz finiş bayrağı süsü',
    priceGold: 0,
    swatch: 'linear-gradient(135deg, #f8fafc 0%, #18181b 50%, #f8fafc 100%)',
    levelRoadLevel: 8,
  },
  {
    id: 'goldPiston',
    rarity: 'epic',
    name: '24K Altın Piston',
    subtitle: 'Seviye 36 Özel · Parlatılmış altın yarış motoru pistonu',
    priceGold: 0,
    swatch: 'linear-gradient(135deg, #fef08a 0%, #eab308 58%, #92400e 100%)',
    levelRoadLevel: 36,
  },
  {
    id: 'apexStar',
    rarity: 'legendary',
    name: 'Apex Elmas Yıldızı',
    subtitle: 'Seviye 85 Özel · Kendi ekseninde dönen kızıl-altın elmas yıldız',
    priceGold: 0,
    swatch: 'linear-gradient(135deg, #fde047 0%, #fb7185 55%, #38bdf8 100%)',
    animated: true,
    levelRoadLevel: 85,
  },
  {
    id: 'luckyClover',
    rarity: 'common',
    name: 'Dört Yaprak Yonca',
    subtitle: 'Zümrüt yeşili uğurlu dört yapraklı yonca süsü',
    priceGold: 180,
    swatch: 'linear-gradient(135deg, #15803d 0%, #22c55e 62%, #bbf7d0 100%)',
  },
  {
    id: 'miniTrophy',
    rarity: 'rare',
    name: 'Mini Şampiyon Kupası',
    subtitle: 'Parlak altın-gümüş minyatür yarış kupası',
    priceGold: 250,
    swatch: 'linear-gradient(135deg, #fef08a 0%, #f59e0b 62%, #e4e4e7 100%)',
  },
  {
    id: 'miniNitro',
    rarity: 'rare',
    name: 'Mini Nitro Tüpü',
    subtitle: 'Metalik mavi NOS tüpü ve krom basınç vanası',
    priceGold: 310,
    swatch: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 62%, #e4e4e7 100%)',
  },
  {
    id: 'diamondGem',
    rarity: 'epic',
    name: 'Safir Elmas',
    subtitle: 'Dönerek parıldayan buz mavisi kesme elmas taşı',
    priceGold: 520,
    swatch: 'linear-gradient(135deg, #e0f2fe 0%, #38bdf8 55%, #1d4ed8 100%)',
    animated: true,
  },
  {
    id: 'cyberSkull',
    rarity: 'legendary',
    name: 'Siber Neon Kurukafa',
    subtitle: 'Mat siyah kurukafa, atan neon gözler ve dönen siber halka',
    priceGold: 790,
    swatch: 'linear-gradient(135deg, #18181b 0%, #22d3ee 52%, #ec4899 100%)',
    animated: true,
  },
  {
    id: 'turkishTea',
    rarity: 'common',
    name: 'İnce Belli Çay',
    subtitle: 'Tabaklı, gümüş kaşıklı tavşan kanı ince belli Türk çayı',
    priceGold: 150,
    swatch: 'linear-gradient(135deg, #991b1b 0%, #dc2626 52%, #f8fafc 85%, #cbd5e1 100%)',
  },
  {
    id: 'soccerBall',
    rarity: 'common',
    name: 'Futbol Topu',
    subtitle: 'Klasik siyah-beyaz beşgen desenli sallanan futbol topu',
    priceGold: 170,
    swatch: 'linear-gradient(135deg, #ffffff 0%, #ffffff 48%, #18181b 48%, #18181b 100%)',
  },
  {
    id: 'miniDuck',
    rarity: 'common',
    name: 'Mini Sarı Ördek',
    subtitle: 'Aynada sevimlice sallanan parlak sarı plastik ördek',
    priceGold: 180,
    swatch: 'linear-gradient(135deg, #facc15 0%, #fde047 62%, #f97316 100%)',
  },
  {
    id: 'coffeeCup',
    rarity: 'common',
    name: 'Karton Kahve',
    subtitle: 'Uzun yol dostu kraft kılıflı sıcak karton kahve bardağı',
    priceGold: 190,
    swatch: 'linear-gradient(135deg, #f8fafc 0%, #b45309 55%, #18181b 100%)',
  },
  {
    id: 'simitRing',
    rarity: 'rare',
    name: 'Çıtır Simit',
    subtitle: 'Susamlı, kızarmış çıtır sokak simidi ayna süsü',
    priceGold: 220,
    swatch: 'linear-gradient(135deg, #92400e 0%, #d97706 58%, #fef3c7 100%)',
  },
  {
    id: 'pizzaSlice',
    rarity: 'rare',
    name: 'Pizza Dilimi',
    subtitle: 'Bol peynirli ve pepperonili minyatür sıcak pizza dilimi',
    priceGold: 240,
    swatch: 'linear-gradient(135deg, #b45309 0%, #facc15 55%, #dc2626 100%)',
  },
  {
    id: 'donutGlazed',
    rarity: 'rare',
    name: 'Çilekli Donut',
    subtitle: 'Pembe çilek soslu ve renkli şekerlemeli taze donut',
    priceGold: 250,
    swatch: 'linear-gradient(135deg, #d97706 0%, #f472b6 55%, #fef08a 100%)',
  },
  {
    id: 'gamepadMini',
    rarity: 'rare',
    name: 'Oyun Kolu',
    subtitle: 'Işıklı tuşlu ve çift analoglu minyatür konsol oyun kolu',
    priceGold: 290,
    swatch: 'linear-gradient(135deg, #18181b 0%, #3f3f46 55%, #22d3ee 100%)',
  },
  {
    id: 'keychain8Ball',
    rarity: 'rare',
    name: 'Siyah 8 Numara',
    subtitle: 'Parlak lake siyah bilardo 8 numara şans topu',
    priceGold: 300,
    swatch: 'linear-gradient(135deg, #09090b 0%, #27272a 62%, #ffffff 100%)',
  },
  {
    id: 'miniHeadcrab',
    rarity: 'rare',
    name: 'Mini Headcrab',
    subtitle: 'Dikiz aynasından pençeleriyle sallanan minyatür Half-Life Headcrab',
    priceGold: 340,
    swatch: 'linear-gradient(135deg, #5c3322 0%, #c99c72 56%, #7f1d2d 100%)',
  },
  {
    id: 'companionCharm',
    rarity: 'epic',
    name: 'Mini Companion Cube',
    subtitle: 'Kendi ekseninde dönen pembe kalpli Portal Companion Cube süsü',
    priceGold: 480,
    swatch: 'linear-gradient(135deg, #64748b 0%, #e2e8f0 50%, #f472b6 100%)',
    animated: true,
  },
  {
    id: 'pokeballMini',
    rarity: 'epic',
    name: 'Canavar Topu',
    subtitle: 'Kırmızı-beyaz parlak kapsül ve orta düğmede atan yakalama ışığı',
    priceGold: 490,
    swatch: 'linear-gradient(180deg, #dc2626 0%, #dc2626 45%, #18181b 45%, #18181b 55%, #ffffff 55%)',
    animated: true,
  },
  {
    id: 'creeperCharm',
    rarity: 'epic',
    name: 'Mini Creeper',
    subtitle: 'Pikselli yeşil Minecraft Creeper kafası ve hafif patlama nabzı',
    priceGold: 510,
    swatch: 'linear-gradient(135deg, #15803d 0%, #4ade80 58%, #09090b 100%)',
    animated: true,
  },
  {
    id: 'ufoCharm',
    rarity: 'epic',
    name: 'Mini UFO',
    subtitle: 'Dönen krom uçan daire, yeşil kokpit kubbesi ve ışıklı çember',
    priceGold: 560,
    swatch: 'linear-gradient(135deg, #94a3b8 0%, #22c55e 58%, #0f172a 100%)',
    animated: true,
  },
  {
    id: 'ghostGlow',
    rarity: 'epic',
    name: 'Sevimli Hayalet',
    subtitle: 'Karanlıkta hafif nabızla parlayan sevimli buz mavisi hayalet',
    priceGold: 580,
    swatch: 'linear-gradient(135deg, #e0f2fe 0%, #38bdf8 60%, #1e293b 100%)',
    animated: true,
  },
  {
    id: 'lambdaCharm',
    rarity: 'legendary',
    name: 'Altın Lambda (λ)',
    subtitle: 'Zırhlı halka içinde dönen parlak HEV turuncusu 3D Lambda amblemi',
    priceGold: 720,
    swatch: 'linear-gradient(135deg, #18181b 0%, #f97316 55%, #facc15 100%)',
    animated: true,
  },
  {
    id: 'wheatleyCharm',
    rarity: 'legendary',
    name: 'Mini Wheatley',
    subtitle: 'Tutamaklı ve parlayan mavi gözlü minyatür Portal 2 Wheatley çekirdeği',
    priceGold: 760,
    swatch: 'linear-gradient(135deg, #1e293b 0%, #e2e8f0 50%, #38bdf8 100%)',
    animated: true,
  },
  {
    id: 'saturnPlanet',
    rarity: 'legendary',
    name: 'Satürn Gezegeni',
    subtitle: 'Dönen altın gezegen ve etrafında çapraz dönen ışıklı halkalar',
    priceGold: 810,
    swatch: 'linear-gradient(135deg, #f59e0b 0%, #fef08a 48%, #38bdf8 100%)',
    animated: true,
  },
  {
    id: 'dragonEgg',
    rarity: 'legendary',
    name: 'Ejderha Yumurtası',
    subtitle: 'Obsidyen kabuk çatlaklarından canlı lav parıltısı atan ejderha yumurtası',
    priceGold: 860,
    swatch: 'linear-gradient(135deg, #0c0a09 0%, #dc2626 52%, #facc15 100%)',
    animated: true,
  },
  {
    id: 'infinityCube',
    rarity: 'legendary',
    name: 'Kozmik Küp',
    subtitle: 'Ters dönen altın jiroskop halkaları içinde renk değiştiren enerji küpü',
    priceGold: 940,
    swatch: 'linear-gradient(135deg, #22d3ee 0%, #a855f7 50%, #facc15 100%)',
    animated: true,
  },
];

export function getDefaultVisualUnlocks(): VisualUnlocks {
  return {
    paintFinish: ['metallic'],
    plateStyle: ['classic'],
    underglow: ['none'],
    headlight: ['stock'],
    nitroFlame: ['blue'],
    driftSmoke: ['white'],
    roofHat: ['none'],
    steeringWheel: ['stock'],
    mirrorCharm: ['none'],
  };
}

export function getDefaultCustomForCar(): CarCustomConfig {
  return {
    bodyKit: 'stock',
    spoiler: 'none',
    livery: 'solid',
    paintFinish: 'metallic',
    plateStyle: 'classic',
    underglow: 'none',
    headlight: 'stock',
    nitroFlame: 'blue',
    driftSmoke: 'white',
    roofHat: 'none',
    steeringWheel: 'stock',
    mirrorCharm: 'none',
  };
}

export type RoadZoneId = 'open' | 'tunnel' | 'bridge';

export type RoadEventKind = 'roadwork' | 'ramp' | 'slick' | 'boostpad';

export interface UpcomingRoadEvent {
  kind: RoadEventKind;
  label: string;
  laneLabel: string;
  distanceMeters: number;
}

export interface PlayerLevelInfo {
  level: number;
  rankTitle: string;
  totalXp: number;
  currentLevelXp: number;
  nextLevelXpRequired: number;
  progressRatio: number;
}

export type DriverRankTierId =
  | 'rookie'
  | 'wolf'
  | 'master'
  | 'legend'
  | 'super'
  | 'apex'
  | 'titan'
  | 'immortal'
  | 'god';

export interface DriverRankTier {
  id: DriverRankTierId;
  title: string;
  minLevel: number;
  maxLevel: number | null;
  rangeLabel: string;
  accentHex: string;
  secondaryHex: string;
  textClass: string;
  barClass: string;
  borderClass: string;
  bgTintClass: string;
  chevronCount: number;
  description: string;
}

export const DRIVER_RANK_TIERS: DriverRankTier[] = [
  {
    id: 'rookie',
    title: 'Çaylak Sürücü',
    minLevel: 1,
    maxLevel: 4,
    rangeLabel: 'Sv. 1–4',
    accentHex: '#cbd5e1',
    secondaryHex: '#64748b',
    textClass: 'text-slate-200',
    barClass: 'bg-slate-300',
    borderClass: 'border-slate-400/35',
    bgTintClass: 'bg-slate-400/10',
    chevronCount: 1,
    description: 'Çelik kalkan amblemi · Otoyola ilk adım',
  },
  {
    id: 'wolf',
    title: 'Otoyol Kurdu',
    minLevel: 5,
    maxLevel: 9,
    rangeLabel: 'Sv. 5–9',
    accentHex: '#fb923c',
    secondaryHex: '#9a3412',
    textClass: 'text-orange-300',
    barClass: 'bg-orange-400',
    borderClass: 'border-orange-400/40',
    bgTintClass: 'bg-orange-500/12',
    chevronCount: 2,
    description: 'Bronz sekizgen · Çift şerit rütbesi',
  },
  {
    id: 'master',
    title: 'Viraj Ustası',
    minLevel: 10,
    maxLevel: 24,
    rangeLabel: 'Sv. 10–24',
    accentHex: '#34d399',
    secondaryHex: '#065f46',
    textClass: 'text-emerald-300',
    barClass: 'bg-emerald-400',
    borderClass: 'border-emerald-400/40',
    bgTintClass: 'bg-emerald-500/12',
    chevronCount: 3,
    description: 'Zümrüt altıgen kanat · Keskin viraj kontrolü',
  },
  {
    id: 'legend',
    title: 'Asfalt Efsanesi',
    minLevel: 25,
    maxLevel: 49,
    rangeLabel: 'Sv. 25–49',
    accentHex: '#38bdf8',
    secondaryHex: '#075985',
    textClass: 'text-sky-300',
    barClass: 'bg-sky-400',
    borderClass: 'border-sky-400/45',
    bgTintClass: 'bg-sky-500/12',
    chevronCount: 4,
    description: 'Safir elmas arma · Yüksek hız istikrarı',
  },
  {
    id: 'super',
    title: 'Süper Pilot',
    minLevel: 50,
    maxLevel: 99,
    rangeLabel: 'Sv. 50–99',
    accentHex: '#fbbf24',
    secondaryHex: '#92400e',
    textClass: 'text-amber-300',
    barClass: 'bg-amber-400',
    borderClass: 'border-amber-400/50',
    bgTintClass: 'bg-amber-500/14',
    chevronCount: 5,
    description: 'Altın kanatlı yıldız · Şampiyonlar sınıfı',
  },
  {
    id: 'apex',
    title: 'Apex Şampiyonu',
    minLevel: 100,
    maxLevel: 249,
    rangeLabel: 'Sv. 100–249',
    accentHex: '#fb7185',
    secondaryHex: '#f59e0b',
    textClass: 'text-rose-300',
    barClass: 'bg-gradient-to-r from-rose-500 via-amber-400 to-amber-300',
    borderClass: 'border-rose-400/55',
    bgTintClass: 'bg-rose-500/14',
    chevronCount: 6,
    description: 'Kızıl-Altın defne tacı · Yüzler kulübü şampiyonu',
  },
  {
    id: 'titan',
    title: 'Otoyol Titanı',
    minLevel: 250,
    maxLevel: 499,
    rangeLabel: 'Sv. 250–499',
    accentHex: '#c084fc',
    secondaryHex: '#38bdf8',
    textClass: 'text-purple-300',
    barClass: 'bg-gradient-to-r from-purple-500 via-fuchsia-400 to-sky-300',
    borderClass: 'border-purple-400/55',
    bgTintClass: 'bg-purple-500/14',
    chevronCount: 7,
    description: 'Plazma ametist kanatlar · 250. seviye seçkin rütbesi',
  },
  {
    id: 'immortal',
    title: 'Ölümsüz Efsane',
    minLevel: 500,
    maxLevel: 999,
    rangeLabel: 'Sv. 500–999',
    accentHex: '#22d3ee',
    secondaryHex: '#fbbf24',
    textClass: 'text-cyan-300',
    barClass: 'bg-gradient-to-r from-cyan-400 via-teal-300 to-amber-300',
    borderClass: 'border-cyan-400/60',
    bgTintClass: 'bg-cyan-500/14',
    chevronCount: 8,
    description: 'Buzul elmas nişan · 500. seviye ölümsüzlük sınıfı',
  },
  {
    id: 'god',
    title: 'Asfalt İmparatoru',
    minLevel: 1000,
    maxLevel: null,
    rangeLabel: 'Sv. 1000+',
    accentHex: '#fde047',
    secondaryHex: '#f43f5e',
    textClass: 'text-yellow-300',
    barClass: 'bg-gradient-to-r from-yellow-300 via-amber-400 to-rose-500',
    borderClass: 'border-yellow-300/65',
    bgTintClass: 'bg-amber-500/16',
    chevronCount: 9,
    description: 'Güneş tacı ve yakut hale · 1000. seviye zirve rütbesi',
  },
];

export function getDriverRankTier(level: number): DriverRankTier {
  const safeLevel = Math.max(1, Math.floor(level));
  for (let i = DRIVER_RANK_TIERS.length - 1; i >= 0; i--) {
    if (safeLevel >= DRIVER_RANK_TIERS[i].minLevel) {
      return DRIVER_RANK_TIERS[i];
    }
  }
  return DRIVER_RANK_TIERS[0];
}

export function getRankTitleForLevel(level: number): string {
  return getDriverRankTier(level).title;
}

export const MAX_LEVEL_ROAD_LEVEL = 100;

export interface LevelUpEvent {
  fromLevel: number;
  toLevel: number;
  rankTitle: string;
  totalXp: number;
}

/**
 * Steep, high-prestige XP curve:
 * Lv 1->2: 4,500 XP | Lv 5->6: 18,500 XP | Lv 10->11: 40,560 XP
 * Lv 25->26: 124,780 XP | Lv 50->51: 307,200 XP | Lv 99->100: ~780,000 XP
 */
export function getXpRequiredForLevel(level: number): number {
  const safe = Math.max(1, Math.floor(level));
  return (
    4500 +
    (safe - 1) * 2600 +
    Math.floor(Math.pow(safe - 1, 1.55) * 420)
  );
}

export function computePlayerLevel(totalXp: number): PlayerLevelInfo {
  const safeTotal = Math.max(0, Math.floor(totalXp));
  let remaining = safeTotal;
  let level = 1;
  let required = getXpRequiredForLevel(level);

  while (remaining >= required) {
    remaining -= required;
    level += 1;
    required = getXpRequiredForLevel(level);
  }

  return {
    level,
    rankTitle: getRankTitleForLevel(level),
    totalXp: safeTotal,
    currentLevelXp: remaining,
    nextLevelXpRequired: required,
    progressRatio: Math.min(1, remaining / Math.max(1, required)),
  };
}

export interface ActiveMissionView {
  id: string;
  title: string;
  target: number;
  progress: number;
  rewardGold: number;
  completed: boolean;
  claimed: boolean;
}

export type AchievementCategory =
  | 'speed'
  | 'skill'
  | 'drift'
  | 'events'
  | 'garage';

export interface AchievementView {
  id: string;
  category: AchievementCategory;
  title: string;
  description: string;
  target: number;
  progress: number;
  rewardGold: number;
  unlocked: boolean;
  claimed: boolean;
}

export interface MissionsSnapshot {
  dailyDateKey: string;
  activeMissions: ActiveMissionView[];
  achievements: AchievementView[];
  completedMissionsTotal: number;
  claimableMissionsCount: number;
  claimableAchievementsCount: number;
  totalClaimableCount: number;
}

export interface HudStats {
  speedKmh: number;
  rpmRatio: number;
  gear: number;
  distanceMeters: number;
  score: number;
  bestScore: number;
  nearMissCount: number;
  cleanCurvesCount: number;
  laneRatio: number;
  curvature: number;
  integrity: number;
  nitro: number; // 0 - 100
  nitroMax: number; // 100..200 based on Nitro Max Capacity power-up level
  nitroPercent: number; // 0 - 100
  nitroActive: boolean;
  combo: number; // 1 - 5
  comboTimerRatio: number; // 0 - 1
  upcomingCurve: UpcomingCurve;
  drifting: boolean;
  driftScore: number;
  driftMultiplier: number;
  driftProgress: number;
  driftGraceRatio: number;
  driftAngleDeg: number;
  driftTotalRun: number;
  goldCoins: number;
  runGold: number;
  magnetTimer: number; // remaining seconds
  magnetDuration: number;
  rampageTimer: number; // remaining seconds for invincible rampage mode
  rampageDuration: number;
  rampageSpeedMult: number;
  playerLevel: PlayerLevelInfo;
  biomeId: BiomeId;
  biomeLabel: string;
  previousBestScore: number;
  bestRecordDistanceMeters: number;
  rentedCarModel: CarModelId | null;
  roadZone: RoadZoneId;
  upcomingEvent: UpcomingRoadEvent | null;
  airborne: boolean;
  onSlick: boolean;
  gameMode: GameModeId;
  gameOverReason: GameOverReason;
  inOncomingLane: boolean;
  timeLeftSec: number;
  nextCheckpointMeters: number;
  checkpointsCleared: number;
  bombMinSpeedKmh: number;
  bombArmed: boolean;
  bombFuseRatio: number; // 0 - 1 (1 = safe)
  weatherKind: WeatherKind;
  rainIntensity: number; // 0 - 1 (0 in tunnels)
  fogIntensity: number; // 0 - 1
  roadWetness: number; // 0 - 1
  resumeCountdown: number; // 0 = active play, 3/2/1 = countdown
  career: ActiveCareerHudState | null;
}

export interface ActiveCareerMissionHud {
  id: string;
  title: string;
  shortLabel: string;
  progressText: string;
  completed: boolean;
  failed?: boolean;
}

export interface ActiveCareerHudState {
  levelId: number;
  title: string;
  targetDistanceMeters: number;
  remainingMeters: number;
  progressRatio: number; // 0 - 1
  elapsedSec: number;
  mission1: ActiveCareerMissionHud;
  mission2: ActiveCareerMissionHud;
  minSpeedTargetKmh?: number;
  minSpeedGraceActive?: boolean;
}

export interface FloatingCallout {
  id: number;
  text: string;
  points: string;
  tone: 'amber' | 'cyan' | 'rose' | 'emerald';
}

export const CAR_MODELS: CarModelSpec[] = [
  {
    id: 'dogan',
    rarity: 'common',
    name: 'Tofaş Doğan SLX',
    tagline: 'Klasik kare kasa, arka itişli yanlama keyfi',
    topSpeedBonusMs: -3.5,
    steeringResponsiveness: 11.4,
    cornerGrip: 0.86,
    maxIntegrity: 115,
    speedRating: 6,
    handlingRating: 8,
    priceGold: 0,
  },
  {
    id: 'hatch',
    rarity: 'common',
    name: 'Golf GTI Turbo',
    tagline: 'Kıvrak hot-hatch gövde ve seri şerit tepkisi',
    topSpeedBonusMs: -0.5,
    steeringResponsiveness: 12.6,
    cornerGrip: 1.08,
    maxIntegrity: 110,
    speedRating: 7,
    handlingRating: 9,
    priceGold: 250,
  },
  {
    id: 'gt',
    rarity: 'common',
    name: 'Apex GT',
    tagline: 'Dengeli yol tutuş ve akıcı viraj',
    topSpeedBonusMs: 1.0,
    steeringResponsiveness: 11.8,
    cornerGrip: 1.02,
    maxIntegrity: 105,
    speedRating: 8,
    handlingRating: 9,
    priceGold: 600,
  },
  {
    id: 'rally',
    rarity: 'rare',
    name: 'Titan Rally RS',
    tagline: 'Virajlarda yüksek çekiş ve tam dayanıklılık',
    topSpeedBonusMs: 0.5,
    steeringResponsiveness: 12.4,
    cornerGrip: 1.18,
    maxIntegrity: 135,
    speedRating: 7,
    handlingRating: 10,
    priceGold: 1150,
  },
  {
    id: 'pickup',
    rarity: 'rare',
    name: 'Raptor 4×4 Offroad',
    tagline: 'Dev şasi ve yüksek darbe direnciyle ağır sıklet',
    topSpeedBonusMs: 2.0,
    steeringResponsiveness: 10.6,
    cornerGrip: 1.04,
    maxIntegrity: 160,
    speedRating: 8,
    handlingRating: 7,
    priceGold: 1750,
  },
  {
    id: 'muscle',
    rarity: 'rare',
    name: 'Mustang V8',
    tagline: 'Kaslı V8 kupa, yüksek tork ve güçlü gövde',
    topSpeedBonusMs: 4.5,
    steeringResponsiveness: 11.0,
    cornerGrip: 0.9,
    maxIntegrity: 125,
    speedRating: 9,
    handlingRating: 7,
    priceGold: 2500,
  },
  {
    id: 'm3gtr',
    rarity: 'rare',
    name: 'BMW M3 GTR E46',
    tagline: 'Geniş DTM çamurluklar, yarış V8 sesi ve efsane yol hakimiyeti',
    topSpeedBonusMs: 5.0,
    steeringResponsiveness: 12.8,
    cornerGrip: 1.12,
    maxIntegrity: 120,
    speedRating: 9,
    handlingRating: 9,
    priceGold: 3000,
  },
  {
    id: 'jdm',
    rarity: 'rare',
    name: 'Skyline GT-R R34',
    tagline: 'Çift turbolu JDM efsanesi, keskin drift dengesi',
    topSpeedBonusMs: 5.5,
    steeringResponsiveness: 13.0,
    cornerGrip: 1.08,
    maxIntegrity: 115,
    speedRating: 9,
    handlingRating: 9,
    priceGold: 3600,
  },
  {
    id: 'porsche',
    rarity: 'epic',
    name: 'Stuttgart 911 GT3',
    tagline: 'Pist mühendisliği, jilet gibi viraj tutuşu',
    topSpeedBonusMs: 6.5,
    steeringResponsiveness: 13.6,
    cornerGrip: 1.15,
    maxIntegrity: 105,
    speedRating: 9,
    handlingRating: 10,
    priceGold: 5000,
  },
  {
    id: 'amggt',
    rarity: 'epic',
    name: 'AMG GT Black Series',
    tagline: 'Uzun V8 kaput, çift katlı GT3 kanat ve vahşi pist dengesi',
    topSpeedBonusMs: 7.0,
    steeringResponsiveness: 13.7,
    cornerGrip: 1.16,
    maxIntegrity: 112,
    speedRating: 9,
    handlingRating: 10,
    priceGold: 6000,
  },
  {
    id: 'hyper',
    rarity: 'epic',
    name: 'Valkyrie Hyper',
    tagline: 'Üst düzey pist dengesi ve aero yere basma',
    topSpeedBonusMs: 7.5,
    steeringResponsiveness: 13.5,
    cornerGrip: 1.06,
    maxIntegrity: 100,
    speedRating: 10,
    handlingRating: 9,
    priceGold: 7200,
  },
  {
    id: 'laferrari',
    rarity: 'epic',
    name: 'LaFerrari V12',
    tagline: 'Açık kırmızı V12 motor bloğu ve saf İtalyan hiper otomobil ruhu',
    topSpeedBonusMs: 8.2,
    steeringResponsiveness: 14.1,
    cornerGrip: 1.12,
    maxIntegrity: 100,
    speedRating: 10,
    handlingRating: 10,
    priceGold: 8600,
  },
  {
    id: 'lambo',
    rarity: 'epic',
    name: 'Lamborghini SV',
    tagline: 'V12 süper spor, jilet gibi keskin aerodinamik',
    topSpeedBonusMs: 8.8,
    steeringResponsiveness: 14.0,
    cornerGrip: 0.98,
    maxIntegrity: 95,
    speedRating: 10,
    handlingRating: 9,
    priceGold: 10000,
  },
  {
    id: 'mclarenp1',
    rarity: 'legendary',
    name: 'McLaren P1 GTR',
    tagline: 'Bumerang LED farlar, tavan hava kanalı ve aktif hibrit aero',
    topSpeedBonusMs: 9.5,
    steeringResponsiveness: 14.5,
    cornerGrip: 1.18,
    maxIntegrity: 102,
    speedRating: 10,
    handlingRating: 10,
    priceGold: 12200,
  },
  {
    id: 'bugatti',
    rarity: 'legendary',
    name: 'Chiron W16',
    tagline: '1500 beygir quad-turbo hiper otomobil',
    topSpeedBonusMs: 10.2,
    steeringResponsiveness: 14.2,
    cornerGrip: 1.1,
    maxIntegrity: 115,
    speedRating: 10,
    handlingRating: 9,
    priceGold: 14500,
  },
  {
    id: 'jesko',
    rarity: 'legendary',
    name: 'Koenigsegg Jesko',
    tagline: 'Jet kanopili cam, üstten askılı mega kanat ve 500 km/s hedefi',
    topSpeedBonusMs: 11.0,
    steeringResponsiveness: 14.8,
    cornerGrip: 1.16,
    maxIntegrity: 105,
    speedRating: 10,
    handlingRating: 10,
    priceGold: 17800,
  },
  {
    id: 'f1',
    rarity: 'legendary',
    name: 'Apex F1 Monoposto',
    tagline: 'Açık tekerlekli Formula yarış şasisi, maksimum yere basma',
    topSpeedBonusMs: 11.6,
    steeringResponsiveness: 15.4,
    cornerGrip: 1.24,
    maxIntegrity: 90,
    speedRating: 10,
    handlingRating: 10,
    priceGold: 22000,
  },
  {
    id: 'pagani',
    rarity: 'legendary',
    name: 'Pagani Utopia V12',
    tagline: 'Merkez dörtlü titanyum egzoz, el yapımı İtalyan sanat eseri',
    topSpeedBonusMs: 12.2,
    steeringResponsiveness: 15.6,
    cornerGrip: 1.26,
    maxIntegrity: 112,
    speedRating: 10,
    handlingRating: 10,
    priceGold: 32000,
  },
  {
    id: 'bolide',
    rarity: 'legendary',
    name: 'Bugatti Bolide X',
    tagline: 'X-lazer farlar, tam boy karbon yüzgeç ve ekstrem W16 pist canavarı',
    topSpeedBonusMs: 13.0,
    steeringResponsiveness: 16.0,
    cornerGrip: 1.3,
    maxIntegrity: 120,
    speedRating: 10,
    handlingRating: 10,
    priceGold: 45000,
  },
  {
    id: 'solaris',
    rarity: 'legendary',
    name: 'Apex Solaris Vision',
    tagline: 'Uçan aero kemerler, ışıklı hibrit çekirdek ve geleceğin zirve tasarımı',
    topSpeedBonusMs: 14.0,
    steeringResponsiveness: 16.5,
    cornerGrip: 1.34,
    maxIntegrity: 130,
    speedRating: 10,
    handlingRating: 10,
    priceGold: 65000,
  },
];

export const CAR_COLORS: CarColorOption[] = [
  {
    id: 'pearl',
    rarity: 'common',
    label: 'İnci Beyazı',
    hex: 0xf4f4f5,
    swatch: '#f4f4f5',
    accentHex: 0xf59e0b,
  },
  {
    id: 'obsidian',
    rarity: 'common',
    label: 'Gece Siyahı',
    hex: 0x14161c,
    swatch: '#14161c',
    accentHex: 0xf59e0b,
  },
  {
    id: 'yellow',
    rarity: 'rare',
    label: 'Lambo Sarısı',
    hex: 0xfacc15,
    swatch: '#facc15',
    accentHex: 0x18181b,
  },
  {
    id: 'sunsetOrange',
    rarity: 'epic',
    label: 'McLaren Turuncu',
    hex: 0xf97316,
    swatch: '#f97316',
    accentHex: 0x18181b,
  },
  {
    id: 'crimson',
    rarity: 'rare',
    label: 'Yarış Kırmızısı',
    hex: 0xdc2626,
    swatch: '#dc2626',
    accentHex: 0xfbbf24,
  },
  {
    id: 'bordeaux',
    rarity: 'epic',
    label: 'Yakut Bordo',
    hex: 0x881337,
    swatch: '#881337',
    accentHex: 0xfbbf24,
  },
  {
    id: 'roseGold',
    rarity: 'legendary',
    label: 'Roze Altın',
    hex: 0xe19191,
    swatch: '#e19191',
    accentHex: 0xfde047,
  },
  {
    id: 'titanium',
    rarity: 'common',
    label: 'Metalik Gri',
    hex: 0xcbd5e1,
    swatch: '#cbd5e1',
    accentHex: 0xf59e0b,
  },
  {
    id: 'cobalt',
    rarity: 'rare',
    label: 'Gece Mavisi',
    hex: 0x1d4ed8,
    swatch: '#1d4ed8',
    accentHex: 0x38bdf8,
  },
  {
    id: 'cyberMint',
    rarity: 'epic',
    label: 'Buzul Nane',
    hex: 0x14b8a6,
    swatch: '#14b8a6',
    accentHex: 0xf8fafc,
  },
  {
    id: 'emerald',
    rarity: 'rare',
    label: 'Zümrüt Yeşili',
    hex: 0x059669,
    swatch: '#059669',
    accentHex: 0xfde047,
  },
  {
    id: 'amethyst',
    rarity: 'legendary',
    label: 'Ametist Moru',
    hex: 0x7e22ce,
    swatch: '#7e22ce',
    accentHex: 0x38bdf8,
  },
  {
    id: 'cobaltStorm',
    rarity: 'rare',
    label: 'Fırtına Kobaltı',
    hex: 0x0284c7,
    swatch: '#0284c7',
    accentHex: 0xbae6fd,
    levelRoadLevel: 3,
  },
  {
    id: 'venomLime',
    rarity: 'epic',
    label: 'Zehirli Neon Yeşil',
    hex: 0x84cc16,
    swatch: '#84cc16',
    accentHex: 0x18181b,
    levelRoadLevel: 12,
  },
  {
    id: 'solarCopper',
    rarity: 'epic',
    label: 'Güneş Bakırı',
    hex: 0xea580c,
    swatch: '#ea580c',
    accentHex: 0xfef08a,
    levelRoadLevel: 28,
  },
  {
    id: 'royalViolet',
    rarity: 'legendary',
    label: 'İmparator Menekşesi',
    hex: 0x9333ea,
    swatch: '#9333ea',
    accentHex: 0xfacc15,
    levelRoadLevel: 48,
  },
  {
    id: 'championGold',
    rarity: 'legendary',
    label: 'Şampiyon Altını',
    hex: 0xeab308,
    swatch: '#eab308',
    accentHex: 0xfef9c3,
    levelRoadLevel: 75,
  },
  {
    id: 'celestialCyan',
    rarity: 'legendary',
    label: 'Göksel Plazma',
    hex: 0x06b6d4,
    swatch: '#06b6d4',
    accentHex: 0xf43f5e,
    levelRoadLevel: 90,
  },
  {
    id: 'midnightTeal',
    rarity: 'rare',
    label: 'Gece Turkuazı',
    hex: 0x0f766e,
    swatch: '#0f766e',
    accentHex: 0x5eead4,
  },
  {
    id: 'cherryMagenta',
    rarity: 'rare',
    label: 'Kiraz Fuşyası',
    hex: 0xdb2777,
    swatch: '#db2777',
    accentHex: 0xfbcfe8,
  },
  {
    id: 'champagneSilver',
    rarity: 'epic',
    label: 'Şampanya Platin',
    hex: 0xd6cbb8,
    swatch: '#d6cbb8',
    accentHex: 0xf59e0b,
  },
  {
    id: 'toxicAcid',
    rarity: 'epic',
    label: 'Asit Sarı-Yeşil',
    hex: 0xa3e635,
    swatch: '#a3e635',
    accentHex: 0x18181b,
  },
  {
    id: 'volcanicRed',
    rarity: 'legendary',
    label: 'Volkanik Kızıl',
    hex: 0xb91c1c,
    swatch: '#b91c1c',
    accentHex: 0xfde047,
  },
];

export function getDefaultUnlockedCarColors(): CarColorId[] {
  return CAR_COLORS.filter((c) => !c.levelRoadLevel).map((c) => c.id);
}

export const ATMOSPHERES: AtmosphereOption[] = [
  {
    id: 'golden',
    label: 'Gün Batımı',
    skyTop: '#1b264f',
    skyHorizon: '#e89058',
    fogColor: 0xd98a5f,
    fogDensity: 0.0024,
    sunColor: 0xffb36b,
    sunIntensity: 2.8,
    hemiSky: 0x9bb7e8,
    hemiGround: 0x4d3629,
    hemiIntensity: 0.95,
    exposure: 1.08,
    headlightsOn: true,
    lampsOn: true,
  },
  {
    id: 'night',
    label: 'Gece',
    skyTop: '#050814',
    skyHorizon: '#141d38',
    fogColor: 0x0d1326,
    fogDensity: 0.0033,
    sunColor: 0x8ea8e6,
    sunIntensity: 0.85,
    hemiSky: 0x263866,
    hemiGround: 0x0e1118,
    hemiIntensity: 0.55,
    exposure: 1.15,
    headlightsOn: true,
    lampsOn: true,
  },
  {
    id: 'mist',
    label: 'Sisli',
    skyTop: '#64798c',
    skyHorizon: '#bcc8d4',
    fogColor: 0xbac7d2,
    fogDensity: 0.0085,
    sunColor: 0xfff5e4,
    sunIntensity: 1.65,
    hemiSky: 0xdce6f0,
    hemiGround: 0x4b5550,
    hemiIntensity: 1.15,
    exposure: 0.98,
    headlightsOn: true,
    lampsOn: true,
  },
  {
    id: 'rainy',
    label: 'Yağmurlu',
    skyTop: '#0d1726',
    skyHorizon: '#33465a',
    fogColor: 0x33465a,
    fogDensity: 0.0048,
    sunColor: 0x94a3b8,
    sunIntensity: 0.95,
    hemiSky: 0x526b88,
    hemiGround: 0x161b22,
    hemiIntensity: 0.72,
    exposure: 1.06,
    headlightsOn: true,
    lampsOn: true,
  },
  {
    id: 'cycle',
    label: 'Gece/Gündüz Döngüsü',
    skyTop: '#1d4ed8',
    skyHorizon: '#93c5fd',
    fogColor: 0x93c5fd,
    fogDensity: 0.0017,
    sunColor: 0xfff3d6,
    sunIntensity: 3.0,
    hemiSky: 0xcbe3ff,
    hemiGround: 0x4f4638,
    hemiIntensity: 1.05,
    exposure: 1.02,
    headlightsOn: false,
    lampsOn: false,
  },
];

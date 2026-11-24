import {
  BODY_KITS,
  BodyKitId,
  CAR_MODELS,
  CarModelId,
  ItemRarity,
  LIVERIES,
  LiveryId,
  SPOILERS,
  SpoilerId,
  WHEEL_STYLES,
  WheelStyleId,
} from '../types/game';

import streetCrateArt from '../assets/images/store_crate_street_1795078812518.jpg';
import proCrateArt from '../assets/images/store_crate_pro_1795078814149.jpg';
import legendaryCrateArt from '../assets/images/store_crate_legendary_1795078823167.jpg';
import goldVaultArt from '../assets/images/store_gold_vault_1795078816982.jpg';

export type StoreCategory = 'bundle' | 'crate' | 'gold';

export type StoreSku =
  | 'viraj_starter_pack'
  | 'viraj_ad_free'
  | 'viraj_super_bundle'
  | 'viraj_hyper_bundle'
  | 'viraj_crate_street_1'
  | 'viraj_crate_street_3'
  | 'viraj_crate_pro_1'
  | 'viraj_crate_pro_3'
  | 'viraj_crate_legendary_1'
  | 'viraj_crate_legendary_3'
  | 'viraj_gold_500'
  | 'viraj_gold_1500'
  | 'viraj_gold_4000'
  | 'viraj_gold_10000'
  | 'viraj_gold_25000'
  | 'viraj_gold_60000';

export type CrateTierId = 'street' | 'pro' | 'legendary';

export type LootRarity = ItemRarity;

export interface GoldPackSpec {
  sku: StoreSku;
  title: string;
  subtitle: string;
  goldAmount: number;
  bonusLabel?: string;
  highlightLabel?: string;
  priceTry: number;
  featured?: boolean;
}

export interface CrateDropRate {
  label: string;
  chanceLabel: string;
  rarity: LootRarity;
}

export interface CrateProductSpec {
  tierId: CrateTierId;
  skuSingle: StoreSku;
  skuTriple: StoreSku;
  title: string;
  subtitle: string;
  priceSingleTry: number;
  priceTripleTry: number;
  tripleSaveLabel: string;
  imageUrl: string;
  accentClass: string;
  borderClass: string;
  guaranteedSummary: string;
  goldRange: [number, number];
  xpBonus: number;
  carChance: number; // 0..1
  carPool: CarModelId[];
  cosmeticChance: number; // 0..1
  dropRates: CrateDropRate[];
}

export interface BundleProductSpec {
  sku: StoreSku;
  title: string;
  subtitle: string;
  tagline: string;
  priceTry: number;
  compareAtTry?: number;
  oneTimeOnly: boolean;
  includesAdFree?: boolean;
  goldAmount: number;
  cars: CarModelId[];
  wheelStyles?: WheelStyleId[];
  bodyKits?: BodyKitId[];
  spoilers?: SpoilerId[];
  liveries?: LiveryId[];
  bonusCrates?: { tierId: CrateTierId; count: number };
  imageUrl: string;
  accentBorderClass: string;
  accentTextClass: string;
  highlights: string[];
}

export interface StoreCheckoutItem {
  sku: StoreSku;
  category: StoreCategory;
  title: string;
  subtitle: string;
  priceTry: number;
  oneTimeOnly?: boolean;
  crateTierId?: CrateTierId;
  crateCount?: number;
  goldAmount?: number;
}

export interface RolledLootItem {
  id: string;
  kind: 'gold' | 'xp' | 'car' | 'wheel' | 'bodyKit' | 'spoiler' | 'livery';
  title: string;
  subtitle: string;
  rarity: LootRarity;
  amount?: number;
  carId?: CarModelId;
  wheelStyleId?: WheelStyleId;
  bodyKitId?: BodyKitId;
  spoilerId?: SpoilerId;
  liveryId?: LiveryId;
  duplicateConvertedGold?: number;
}

export interface OwnedInventorySnapshot {
  unlockedCars: CarModelId[];
  unlockedWheelStyles: WheelStyleId[];
  unlockedBodyKits: BodyKitId[];
  unlockedSpoilers: SpoilerId[];
  unlockedLiveries: LiveryId[];
}

export const STORE_GOLD_VAULT_ART = goldVaultArt;

export function formatPriceTry(price: number): string {
  return `${price.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ₺`;
}

export const BUNDLE_PRODUCTS: BundleProductSpec[] = [
  {
    sku: 'viraj_starter_pack',
    title: 'Başlangıç Paketi',
    subtitle: 'Tek Seferlik · %65 İndirimli',
    tagline: 'Hızlı yükseliş için araç, altın ve ilk sandık bir arada.',
    priceTry: 39.99,
    compareAtTry: 114.99,
    oneTimeOnly: true,
    goldAmount: 1500,
    cars: ['hatch'],
    liveries: ['racingStripes'],
    bonusCrates: { tierId: 'street', count: 1 },
    imageUrl: streetCrateArt,
    accentBorderClass: 'border-amber-400/45',
    accentTextClass: 'text-amber-300',
    highlights: [
      '1.500 Altın anında hesaba eklenir',
      'Golf GTI Turbo (varsa +400 Altın telafi)',
      '1× Sokak Sandığı + Yarış Şeritleri kaplaması',
    ],
  },
  {
    sku: 'viraj_ad_free',
    title: 'Reklamsız VIP Geçiş',
    subtitle: 'Kalıcı Ayrıcalık · Tek Seferlik',
    tagline: 'Tüm zorunlu geçiş reklamlarını sonsuza dek kaldır ve bonus altın kazan.',
    priceTry: 49.99,
    oneTimeOnly: true,
    includesAdFree: true,
    goldAmount: 600,
    cars: [],
    imageUrl: goldVaultArt,
    accentBorderClass: 'border-emerald-400/45',
    accentTextClass: 'text-emerald-300',
    highlights: [
      'Zorunlu geçiş reklamları kalıcı olarak kapanır',
      '+600 Altın hoş geldin bonusu',
      'İsteğe bağlı ödüllü reklamlar açık kalır',
    ],
  },
  {
    sku: 'viraj_super_bundle',
    title: 'Süper Garaj Paketi',
    subtitle: 'Tek Seferlik · İki Efsane Araç',
    tagline: 'DTM efsanesi M3 GTR ve Skyline R34 ile otoyola hükmet.',
    priceTry: 149.99,
    compareAtTry: 329.99,
    oneTimeOnly: true,
    goldAmount: 4000,
    cars: ['m3gtr', 'jdm'],
    spoilers: ['gtCarbon'],
    bonusCrates: { tierId: 'pro', count: 2 },
    imageUrl: proCrateArt,
    accentBorderClass: 'border-sky-400/45',
    accentTextClass: 'text-sky-300',
    highlights: [
      'BMW M3 GTR E46 + Skyline GT-R R34',
      '4.000 Altın + GT Karbon Kanat',
      '2× Pist Sandığı açılış hakkı',
    ],
  },
  {
    sku: 'viraj_hyper_bundle',
    title: 'Hiper Şampiyon Paketi',
    subtitle: 'Tek Seferlik · Amiral Gemisi',
    tagline: 'Koenigsegg Jesko, 12.000 Altın ve 3 Efsanevi Hiper Sandık.',
    priceTry: 299.99,
    compareAtTry: 699.99,
    oneTimeOnly: true,
    goldAmount: 12000,
    cars: ['jesko'],
    wheelStyles: ['forgedY'],
    bodyKits: ['widebody'],
    bonusCrates: { tierId: 'legendary', count: 3 },
    imageUrl: legendaryCrateArt,
    accentBorderClass: 'border-rose-400/50',
    accentTextClass: 'text-rose-300',
    highlights: [
      'Koenigsegg Jesko (varsa +10.680 Altın telafi)',
      '12.000 Altın + Dövme Y-Mesh Tekerlek + Geniş Gövde Pro',
      '3× Efsanevi Hiper Sandık anında açılır',
    ],
  },
];

export const CRATE_PRODUCTS: CrateProductSpec[] = [
  {
    tierId: 'street',
    skuSingle: 'viraj_crate_street_1',
    skuTriple: 'viraj_crate_street_3',
    title: 'Sokak Sandığı',
    subtitle: 'Cadde modifiyesi, altın ve spor araç şansı',
    priceSingleTry: 19.99,
    priceTripleTry: 49.99,
    tripleSaveLabel: '%17 Tasarruf',
    imageUrl: streetCrateArt,
    accentClass: 'text-amber-300',
    borderClass: 'border-amber-400/35',
    guaranteedSummary: '450–900 Altın + Modifiye Parçası · %30 Araç Şansı',
    goldRange: [450, 900],
    xpBonus: 500,
    carChance: 0.3,
    carPool: ['hatch', 'gt', 'rally', 'pickup'],
    cosmeticChance: 0.85,
    dropRates: [
      { label: '450 – 900 Altın + 500 XP', chanceLabel: '%100', rarity: 'common' },
      { label: 'Tekerlek, Spoyler veya Kaplama', chanceLabel: '%85', rarity: 'rare' },
      { label: 'Golf GTI / Apex GT / Rally RS / Raptor', chanceLabel: '%30', rarity: 'epic' },
    ],
  },
  {
    tierId: 'pro',
    skuSingle: 'viraj_crate_pro_1',
    skuTriple: 'viraj_crate_pro_3',
    title: 'Pist Sandığı',
    subtitle: 'Yüksek altın, karbon aero ve süper spor araçlar',
    priceSingleTry: 49.99,
    priceTripleTry: 129.99,
    tripleSaveLabel: '%13 Tasarruf',
    imageUrl: proCrateArt,
    accentClass: 'text-sky-300',
    borderClass: 'border-sky-400/40',
    guaranteedSummary: '1.400–2.600 Altın + Garanti Parça · %50 Süper Spor',
    goldRange: [1400, 2600],
    xpBonus: 1400,
    carChance: 0.5,
    carPool: ['muscle', 'm3gtr', 'jdm', 'porsche', 'amggt'],
    cosmeticChance: 1.0,
    dropRates: [
      { label: '1.400 – 2.600 Altın + 1.400 XP', chanceLabel: '%100', rarity: 'common' },
      { label: 'Gövde Kiti / Karbon Kanat / Yarış Tekerleği', chanceLabel: '%100', rarity: 'rare' },
      { label: 'Mustang V8 / M3 GTR / Skyline / 911 GT3 / AMG GT', chanceLabel: '%50', rarity: 'epic' },
    ],
  },
  {
    tierId: 'legendary',
    skuSingle: 'viraj_crate_legendary_1',
    skuTriple: 'viraj_crate_legendary_3',
    title: 'Efsanevi Hiper Sandık',
    subtitle: 'Garanti hiper otomobil, dev altın kasası ve elit aero',
    priceSingleTry: 119.99,
    priceTripleTry: 299.99,
    tripleSaveLabel: '%17 Tasarruf',
    imageUrl: legendaryCrateArt,
    accentClass: 'text-rose-300',
    borderClass: 'border-rose-400/45',
    guaranteedSummary: '4.000–6.500 Altın + Garanti Hiper Araç + 3.500 XP',
    goldRange: [4000, 6500],
    xpBonus: 3500,
    carChance: 1.0,
    carPool: ['hyper', 'laferrari', 'lambo', 'mclarenp1', 'bugatti', 'jesko', 'f1'],
    cosmeticChance: 1.0,
    dropRates: [
      { label: '4.000 – 6.500 Altın + 3.500 XP', chanceLabel: '%100', rarity: 'rare' },
      { label: 'Üst Sınıf Gövde Kiti / Tekerlek / Kaplama', chanceLabel: '%100', rarity: 'epic' },
      { label: 'LaFerrari / P1 GTR / Chiron / Jesko / Apex F1', chanceLabel: '%100', rarity: 'legendary' },
    ],
  },
];

export const GOLD_PACKS: GoldPackSpec[] = [
  {
    sku: 'viraj_gold_500',
    title: 'Avuç Altın',
    subtitle: 'Hızlı yükseltme ve tekerlek için',
    goldAmount: 500,
    priceTry: 14.99,
  },
  {
    sku: 'viraj_gold_1500',
    title: 'Torba Altın',
    subtitle: 'Yeni araç veya tam motor kiti',
    goldAmount: 1500,
    bonusLabel: '+%15 Bonus',
    priceTry: 39.99,
  },
  {
    sku: 'viraj_gold_4000',
    title: 'Kasa Altın',
    subtitle: 'Süper spor araçların anahtarı',
    goldAmount: 4000,
    bonusLabel: '+%25 Bonus',
    highlightLabel: 'En Popüler',
    priceTry: 89.99,
    featured: true,
  },
  {
    sku: 'viraj_gold_10000',
    title: 'Hazine Altın',
    subtitle: 'Üst sınıf pist araçları ve tam modifiye',
    goldAmount: 10000,
    bonusLabel: '+%40 Bonus',
    priceTry: 199.99,
  },
  {
    sku: 'viraj_gold_25000',
    title: 'Kraliyet Kasası',
    subtitle: 'Hiper otomobilleri anında aç',
    goldAmount: 25000,
    bonusLabel: '+%60 Bonus',
    priceTry: 449.99,
  },
  {
    sku: 'viraj_gold_60000',
    title: 'Apex Milyoner Kasası',
    subtitle: 'Tüm garajı baştan sona donat',
    goldAmount: 60000,
    bonusLabel: '+%85 Bonus',
    highlightLabel: 'En İyi Değer',
    priceTry: 899.99,
  },
];

export const ALL_VALID_STORE_SKUS: StoreSku[] = [
  ...BUNDLE_PRODUCTS.map((b) => b.sku),
  ...CRATE_PRODUCTS.flatMap((c) => [c.skuSingle, c.skuTriple]),
  ...GOLD_PACKS.map((g) => g.sku),
];

export function getBundleBySku(sku: StoreSku): BundleProductSpec | undefined {
  return BUNDLE_PRODUCTS.find((b) => b.sku === sku);
}

export function getCrateByTier(tierId: CrateTierId): CrateProductSpec {
  return (
    CRATE_PRODUCTS.find((c) => c.tierId === tierId) || CRATE_PRODUCTS[0]
  );
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Rolls all rewards for opening `count` crates of `tierId`.
 * Biases selection toward items the player doesn't already own while keeping
 * duplicate items rewarding via automatic 60% gold compensation.
 */
export function rollCrateRewards(
  tierId: CrateTierId,
  count: number,
  owned: OwnedInventorySnapshot,
): RolledLootItem[] {
  const crate = getCrateByTier(tierId);
  const results: RolledLootItem[] = [];
  const tempOwnedCars = new Set<CarModelId>(owned.unlockedCars);
  const tempOwnedWheels = new Set<WheelStyleId>(owned.unlockedWheelStyles);
  const tempOwnedKits = new Set<BodyKitId>(owned.unlockedBodyKits);
  const tempOwnedSpoilers = new Set<SpoilerId>(owned.unlockedSpoilers);
  const tempOwnedLiveries = new Set<LiveryId>(owned.unlockedLiveries);

  const paidWheels = WHEEL_STYLES.filter((w) => w.priceGold > 0);
  const paidKits = BODY_KITS.filter((k) => k.priceGold > 0);
  const paidSpoilers = SPOILERS.filter((s) => s.priceGold > 0);
  const paidLiveries = LIVERIES.filter((l) => l.priceGold > 0);

  for (let i = 0; i < count; i++) {
    const rollSalt = `${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`;

    // 1. Guaranteed Gold roll
    const goldVal = Math.round(randomInt(crate.goldRange[0], crate.goldRange[1]) / 10) * 10;
    results.push({
      id: `gold_${rollSalt}`,
      kind: 'gold',
      title: `+${goldVal.toLocaleString('tr-TR')} Altın`,
      subtitle: `${crate.title} Altın Kasası`,
      rarity: tierId === 'legendary' ? 'epic' : tierId === 'pro' ? 'rare' : 'common',
      amount: goldVal,
    });

    // 2. Guaranteed XP boost
    results.push({
      id: `xp_${rollSalt}`,
      kind: 'xp',
      title: `+${crate.xpBonus.toLocaleString('tr-TR')} Sürücü XP`,
      subtitle: 'Rütbe ve seviye ilerlemesi',
      rarity: 'common',
      amount: crate.xpBonus,
    });

    // 3. Cosmetic / Aero tuning roll
    if (Math.random() <= crate.cosmeticChance) {
      const slotRoll = Math.floor(Math.random() * 4);
      if (slotRoll === 0) {
        const unowned = paidWheels.filter((w) => !tempOwnedWheels.has(w.id));
        const pick = unowned.length > 0 ? pickRandom(unowned) : pickRandom(paidWheels);
        const already = tempOwnedWheels.has(pick.id);
        tempOwnedWheels.add(pick.id);
        results.push({
          id: `wheel_${rollSalt}`,
          kind: 'wheel',
          title: `${pick.name} Tekerlek`,
          subtitle: already ? 'Zaten mevcut · Altın telafisi' : pick.effectLabel,
          rarity: pick.rarity,
          wheelStyleId: pick.id,
          duplicateConvertedGold: already
            ? Math.max(150, Math.round(pick.priceGold * 0.6))
            : undefined,
        });
      } else if (slotRoll === 1) {
        const unowned = paidKits.filter((k) => !tempOwnedKits.has(k.id));
        const pick = unowned.length > 0 ? pickRandom(unowned) : pickRandom(paidKits);
        const already = tempOwnedKits.has(pick.id);
        tempOwnedKits.add(pick.id);
        results.push({
          id: `kit_${rollSalt}`,
          kind: 'bodyKit',
          title: pick.name,
          subtitle: already ? 'Zaten mevcut · Altın telafisi' : pick.effectLabel,
          rarity: pick.rarity,
          bodyKitId: pick.id,
          duplicateConvertedGold: already
            ? Math.max(150, Math.round(pick.priceGold * 0.6))
            : undefined,
        });
      } else if (slotRoll === 2) {
        const unowned = paidSpoilers.filter((s) => !tempOwnedSpoilers.has(s.id));
        const pick = unowned.length > 0 ? pickRandom(unowned) : pickRandom(paidSpoilers);
        const already = tempOwnedSpoilers.has(pick.id);
        tempOwnedSpoilers.add(pick.id);
        results.push({
          id: `spoiler_${rollSalt}`,
          kind: 'spoiler',
          title: pick.name,
          subtitle: already ? 'Zaten mevcut · Altın telafisi' : pick.effectLabel,
          rarity: pick.rarity,
          spoilerId: pick.id,
          duplicateConvertedGold: already
            ? Math.max(120, Math.round(pick.priceGold * 0.6))
            : undefined,
        });
      } else {
        const unowned = paidLiveries.filter((l) => !tempOwnedLiveries.has(l.id));
        const pick = unowned.length > 0 ? pickRandom(unowned) : pickRandom(paidLiveries);
        const already = tempOwnedLiveries.has(pick.id);
        tempOwnedLiveries.add(pick.id);
        results.push({
          id: `livery_${rollSalt}`,
          kind: 'livery',
          title: `${pick.name} Kaplama`,
          subtitle: already ? 'Zaten mevcut · Altın telafisi' : pick.subtitle,
          rarity: pick.rarity,
          liveryId: pick.id,
          duplicateConvertedGold: already
            ? Math.max(120, Math.round(pick.priceGold * 0.6))
            : undefined,
        });
      }
    }

    // 4. Vehicle roll (guaranteed on Legendary, high chance on Pro & Street)
    if (Math.random() <= crate.carChance) {
      const unownedCars = crate.carPool.filter((id) => !tempOwnedCars.has(id));
      const pickedCarId =
        unownedCars.length > 0 ? pickRandom(unownedCars) : pickRandom(crate.carPool);
      const spec = CAR_MODELS.find((m) => m.id === pickedCarId);
      if (spec) {
        const already = tempOwnedCars.has(pickedCarId);
        tempOwnedCars.add(pickedCarId);
        results.push({
          id: `car_${rollSalt}`,
          kind: 'car',
          title: spec.name,
          subtitle: already
            ? 'Garajda mevcut · Altın telafisi'
            : `Hız ${spec.speedRating}/10 · Tutuş ${spec.handlingRating}/10`,
          rarity: spec.rarity,
          carId: pickedCarId,
          duplicateConvertedGold: already
            ? Math.max(300, Math.round(spec.priceGold * 0.6))
            : undefined,
        });
      }
    }
  }

  return results;
}

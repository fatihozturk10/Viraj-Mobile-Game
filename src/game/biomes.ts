import * as THREE from 'three';
import { BiomeId, FloatingCallout } from '../types/game';

export const BIOME_SPAN_METERS = 750;
export const BIOME_TRANSITION_METERS = 160;

export interface BiomeDefinition {
  id: BiomeId;
  label: string;
  calloutTone: FloatingCallout['tone'];
  // Terrain vertex colors
  shoulderHex: number;
  groundHex: number;
  ridgeHex: number;
  // Foliage & rock palettes
  treeColorA: number;
  treeColorB: number;
  trunkColor: number;
  rockColorA: number;
  rockColorB: number;
  cypressColorA: number;
  cypressColorB: number;
  shrubColorA: number;
  shrubColorB: number;
  // Prop mix weights (0..1)
  pineRatio: number;
  cactusRatio: number;
  iceRatio: number;
  basaltRatio: number;
  cypressPresence: number;
  // Sky / Atmosphere blending
  skyTopTint: number;
  skyHorizonTint: number;
  fogTint: number;
  sunTint: number;
  hemiSkyTint: number;
  hemiGroundTint: number;
  atmosphereTintStrength: number; // 0 for baseline alpine, 0.5-0.75 for strong biomes
  fogDensityBoost: number; // additive Exp2 fog density
  // Weather particles
  snowAmount: number;
  sandAmount: number;
}

export const BIOMES: BiomeDefinition[] = [
  {
    id: 'alpine',
    label: 'Yeşil Vadi',
    calloutTone: 'emerald',
    shoulderHex: 0x4b443c,
    groundHex: 0x3b4d34,
    ridgeHex: 0x5d5349,
    treeColorA: 0x264b33,
    treeColorB: 0x3f6538,
    trunkColor: 0x452c1e,
    rockColorA: 0x6b6257,
    rockColorB: 0x7e766b,
    cypressColorA: 0x1a3a26,
    cypressColorB: 0x285233,
    shrubColorA: 0x2d4e2d,
    shrubColorB: 0x4b6a37,
    pineRatio: 1,
    cactusRatio: 0,
    iceRatio: 0,
    basaltRatio: 0,
    cypressPresence: 1,
    skyTopTint: 0x1b264f,
    skyHorizonTint: 0xe89058,
    fogTint: 0xd98a5f,
    sunTint: 0xffb36b,
    hemiSkyTint: 0x9bb7e8,
    hemiGroundTint: 0x4d3629,
    atmosphereTintStrength: 0,
    fogDensityBoost: 0,
    snowAmount: 0,
    sandAmount: 0,
  },
  {
    id: 'desert',
    label: 'Kızıl Çöl',
    calloutTone: 'amber',
    shoulderHex: 0x9c7248,
    groundHex: 0xc98c4a,
    ridgeHex: 0xb66037,
    treeColorA: 0x5a7d38,
    treeColorB: 0x769244,
    trunkColor: 0x5c4732,
    rockColorA: 0xb45f36,
    rockColorB: 0xd17e47,
    cypressColorA: 0x78713c,
    cypressColorB: 0x968749,
    shrubColorA: 0x7a6a38,
    shrubColorB: 0xa28344,
    pineRatio: 0.08,
    cactusRatio: 0.92,
    iceRatio: 0,
    basaltRatio: 0,
    cypressPresence: 0.35,
    skyTopTint: 0x2b3e6b,
    skyHorizonTint: 0xf4a853,
    fogTint: 0xe29752,
    sunTint: 0xffc978,
    hemiSkyTint: 0xfdd99b,
    hemiGroundTint: 0x874f2b,
    atmosphereTintStrength: 0.68,
    fogDensityBoost: 0.00035,
    snowAmount: 0,
    sandAmount: 1,
  },
  {
    id: 'arctic',
    label: 'Buzul Kutuplar',
    calloutTone: 'cyan',
    shoulderHex: 0x94a9be,
    groundHex: 0xd6e6f5,
    ridgeHex: 0xeaf4ff,
    treeColorA: 0xcbe3f4,
    treeColorB: 0x8aa8bd,
    trunkColor: 0x3b4856,
    rockColorA: 0x829bb5,
    rockColorB: 0xc4ddf2,
    cypressColorA: 0x9fc2d8,
    cypressColorB: 0xdbeeff,
    shrubColorA: 0xb7d4ea,
    shrubColorB: 0xe2f2ff,
    pineRatio: 0.45,
    cactusRatio: 0,
    iceRatio: 0.55,
    basaltRatio: 0,
    cypressPresence: 0.55,
    skyTopTint: 0x16385e,
    skyHorizonTint: 0xb7e4fb,
    fogTint: 0xa6d6f0,
    sunTint: 0xe0f2fe,
    hemiSkyTint: 0xdbf0ff,
    hemiGroundTint: 0x62809c,
    atmosphereTintStrength: 0.72,
    fogDensityBoost: 0.00055,
    snowAmount: 1,
    sandAmount: 0,
  },
  {
    id: 'volcanic',
    label: 'Volkanik Kanyon',
    calloutTone: 'rose',
    shoulderHex: 0x3b3534,
    groundHex: 0x2c2524,
    ridgeHex: 0x4c2920,
    treeColorA: 0x3c2c28,
    treeColorB: 0x5c3424,
    trunkColor: 0x241f1e,
    rockColorA: 0x2c2728,
    rockColorB: 0x733224,
    cypressColorA: 0x342826,
    cypressColorB: 0x4f3026,
    shrubColorA: 0x443129,
    shrubColorB: 0x6c3823,
    pineRatio: 0.05,
    cactusRatio: 0,
    iceRatio: 0,
    basaltRatio: 0.95,
    cypressPresence: 0.15,
    skyTopTint: 0x1f141e,
    skyHorizonTint: 0xd95f36,
    fogTint: 0x8c3e2c,
    sunTint: 0xff8a54,
    hemiSkyTint: 0xc26e58,
    hemiGroundTint: 0x3d1d16,
    atmosphereTintStrength: 0.72,
    fogDensityBoost: 0.00075,
    snowAmount: 0,
    sandAmount: 0.35,
  },
];

export interface BiomeSample {
  primary: BiomeDefinition;
  from: BiomeDefinition;
  to: BiomeDefinition;
  blend: number;
  shoulderColor: THREE.Color;
  groundColor: THREE.Color;
  ridgeColor: THREE.Color;
  treeColorA: THREE.Color;
  treeColorB: THREE.Color;
  rockColorA: THREE.Color;
  rockColorB: THREE.Color;
  cypressColorA: THREE.Color;
  cypressColorB: THREE.Color;
  shrubColorA: THREE.Color;
  shrubColorB: THREE.Color;
  pineRatio: number;
  cactusRatio: number;
  iceRatio: number;
  basaltRatio: number;
  cypressPresence: number;
  skyTopTint: THREE.Color;
  skyHorizonTint: THREE.Color;
  fogTint: THREE.Color;
  sunTint: THREE.Color;
  hemiSkyTint: THREE.Color;
  hemiGroundTint: THREE.Color;
  atmosphereTintStrength: number;
  fogDensityBoost: number;
  snowAmount: number;
  sandAmount: number;
}

const _cFrom = new THREE.Color();
const _cTo = new THREE.Color();

function lerpColorHex(
  hexA: number,
  hexB: number,
  alpha: number,
  out: THREE.Color,
): THREE.Color {
  _cFrom.setHex(hexA);
  _cTo.setHex(hexB);
  return out.copy(_cFrom).lerp(_cTo, alpha);
}

function smoothstep01(x: number): number {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
}

export function createBiomeSample(): BiomeSample {
  return {
    primary: BIOMES[0],
    from: BIOMES[0],
    to: BIOMES[0],
    blend: 0,
    shoulderColor: new THREE.Color(),
    groundColor: new THREE.Color(),
    ridgeColor: new THREE.Color(),
    treeColorA: new THREE.Color(),
    treeColorB: new THREE.Color(),
    rockColorA: new THREE.Color(),
    rockColorB: new THREE.Color(),
    cypressColorA: new THREE.Color(),
    cypressColorB: new THREE.Color(),
    shrubColorA: new THREE.Color(),
    shrubColorB: new THREE.Color(),
    pineRatio: 1,
    cactusRatio: 0,
    iceRatio: 0,
    basaltRatio: 0,
    cypressPresence: 1,
    skyTopTint: new THREE.Color(),
    skyHorizonTint: new THREE.Color(),
    fogTint: new THREE.Color(),
    sunTint: new THREE.Color(),
    hemiSkyTint: new THREE.Color(),
    hemiGroundTint: new THREE.Color(),
    atmosphereTintStrength: 0,
    fogDensityBoost: 0,
    snowAmount: 0,
    sandAmount: 0,
  };
}

const _defaultBiomeSample = createBiomeSample();
let _forcedBiomeId: BiomeId | null = null;

export function setForcedBiome(biomeId: BiomeId | null): void {
  _forcedBiomeId = biomeId;
}

export function sampleBiomeAtDistance(
  distanceMeters: number,
  out: BiomeSample = _defaultBiomeSample,
): BiomeSample {
  let idx = 0;
  let nextIdx = 1;
  let blend = 0;

  if (_forcedBiomeId) {
    const forcedIdx = BIOMES.findIndex((b) => b.id === _forcedBiomeId);
    idx = forcedIdx >= 0 ? forcedIdx : 0;
    nextIdx = idx;
    blend = 0;
  } else {
    const safeS = Math.max(0, distanceMeters);
    const totalCycle = BIOME_SPAN_METERS * BIOMES.length;
    const cycleS = safeS % totalCycle;
    idx = Math.floor(cycleS / BIOME_SPAN_METERS) % BIOMES.length;
    nextIdx = (idx + 1) % BIOMES.length;
    const localS = cycleS - idx * BIOME_SPAN_METERS;
    const transitionStart = BIOME_SPAN_METERS - BIOME_TRANSITION_METERS;
    blend =
      localS > transitionStart
        ? smoothstep01((localS - transitionStart) / BIOME_TRANSITION_METERS)
        : 0;
  }

  const from = BIOMES[idx];
  const to = BIOMES[nextIdx];

  out.from = from;
  out.to = to;
  out.blend = blend;
  out.primary = blend >= 0.5 ? to : from;

  lerpColorHex(from.shoulderHex, to.shoulderHex, blend, out.shoulderColor);
  lerpColorHex(from.groundHex, to.groundHex, blend, out.groundColor);
  lerpColorHex(from.ridgeHex, to.ridgeHex, blend, out.ridgeColor);
  lerpColorHex(from.treeColorA, to.treeColorA, blend, out.treeColorA);
  lerpColorHex(from.treeColorB, to.treeColorB, blend, out.treeColorB);
  lerpColorHex(from.rockColorA, to.rockColorA, blend, out.rockColorA);
  lerpColorHex(from.rockColorB, to.rockColorB, blend, out.rockColorB);
  lerpColorHex(from.cypressColorA, to.cypressColorA, blend, out.cypressColorA);
  lerpColorHex(from.cypressColorB, to.cypressColorB, blend, out.cypressColorB);
  lerpColorHex(from.shrubColorA, to.shrubColorA, blend, out.shrubColorA);
  lerpColorHex(from.shrubColorB, to.shrubColorB, blend, out.shrubColorB);

  out.pineRatio = THREE.MathUtils.lerp(from.pineRatio, to.pineRatio, blend);
  out.cactusRatio = THREE.MathUtils.lerp(from.cactusRatio, to.cactusRatio, blend);
  out.iceRatio = THREE.MathUtils.lerp(from.iceRatio, to.iceRatio, blend);
  out.basaltRatio = THREE.MathUtils.lerp(from.basaltRatio, to.basaltRatio, blend);
  out.cypressPresence = THREE.MathUtils.lerp(
    from.cypressPresence,
    to.cypressPresence,
    blend,
  );

  lerpColorHex(from.skyTopTint, to.skyTopTint, blend, out.skyTopTint);
  lerpColorHex(from.skyHorizonTint, to.skyHorizonTint, blend, out.skyHorizonTint);
  lerpColorHex(from.fogTint, to.fogTint, blend, out.fogTint);
  lerpColorHex(from.sunTint, to.sunTint, blend, out.sunTint);
  lerpColorHex(from.hemiSkyTint, to.hemiSkyTint, blend, out.hemiSkyTint);
  lerpColorHex(from.hemiGroundTint, to.hemiGroundTint, blend, out.hemiGroundTint);

  out.atmosphereTintStrength = THREE.MathUtils.lerp(
    from.atmosphereTintStrength,
    to.atmosphereTintStrength,
    blend,
  );
  out.fogDensityBoost = THREE.MathUtils.lerp(
    from.fogDensityBoost,
    to.fogDensityBoost,
    blend,
  );
  out.snowAmount = THREE.MathUtils.lerp(from.snowAmount, to.snowAmount, blend);
  out.sandAmount = THREE.MathUtils.lerp(from.sandAmount, to.sandAmount, blend);

  return out;
}

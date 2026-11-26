import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import {
  ActiveCareerHudState,
  ATMOSPHERES,
  AtmosphereId,
  BiomeId,
  BODY_KITS,
  BodyKitId,
  CAMERA_MODES,
  CameraMode,
  CAR_COLORS,
  CAR_MODELS,
  CarColorId,
  CarCustomConfig,
  CarModelId,
  CarModelSpec,
  CarUpgradeKey,
  CarUpgrades,
  CarWheelConfig,
  computePlayerLevel,
  DRIFT_SMOKES,
  DriftSmokeId,
  FloatingCallout,
  formatSpeedMultiplier,
  GAME_MODES,
  GameModeId,
  GameOverReason,
  GamePhase,
  GarageCameraFocus,
  getDefaultCustomForCar,
  getDefaultPowerUpUpgrades,
  getDefaultUnlockedCarColors,
  getDefaultVisualUnlocks,
  getDefaultWheelForCar,
  getMagnetDurationSec,
  getMagnetRangeMeters,
  getMaxNitroCapacity,
  getNitroDrainRatePerSec,
  getNitroPickupSpeedBonusKmh,
  getPowerUpSpec,
  getPowerUpUnlockLevel,
  getRampageDurationSec,
  getRampageSpeedMultiplier,
  getRepairHealRatio,
  HEADLIGHTS,
  HeadlightId,
  HudStats,
  LevelUpEvent,
  LIVERIES,
  LiveryId,
  MAX_LEVEL_ROAD_LEVEL,
  MAX_POWERUP_UPGRADE_LEVEL,
  MAX_UPGRADE_LEVEL,
  MIRROR_CHARMS,
  MirrorCharmId,
  MissionsSnapshot,
  NITRO_FLAMES,
  NitroFlameId,
  PAINT_FINISHES,
  PaintFinishId,
  PLATE_STYLES,
  PlateStyleId,
  PlayerLevelInfo,
  POWERUP_SPECS,
  PowerUpId,
  PowerUpUpgrades,
  PowerUpUpgradeTrack,
  RoadZoneId,
  ROOF_HATS,
  RoofHatId,
  SPOILERS,
  SpoilerId,
  STEERING_WHEELS,
  SteeringWheelId,
  UNDERGLOWS,
  UnderglowId,
  UpcomingRoadEvent,
  UPGRADE_COSTS,
  VisualCategory,
  VisualUnlocks,
  WHEEL_STYLES,
  WheelColorId,
  WheelStyleId,
} from '../types/game';
import { CrateTierId } from '../services/storeCatalog';
import { AudioEngine, MusicPlayerState } from './audioEngine';
import { getLevelRoadReward, LevelRoadReward } from './levelRoad';
import {
  createBiomeSample,
  sampleBiomeAtDistance,
  setForcedBiome,
} from './biomes';
import {
  CockpitRig,
  createCockpitRig,
  createPlayerCar,
  createTrafficAssetPool,
  PlayerCarRig,
  TrafficAssetPool,
  TrafficKind,
  TrafficRig,
} from './carBuilder';
import {
  CAREER_MIN_SPEED_GRACE_SEC,
  CareerLevelSpec,
  CareerProgressManager,
  CareerProgressSnapshot,
  CareerRunMetrics,
  CareerRunOutcome,
  evaluateCareerObjective,
  getCareerLevelById,
  isContinuousCareerConstraint,
} from './careerLevels';
import { ClaimResult, MissionManager, RewardEvent } from './missions';
import { RoadEventSystem } from './roadEvents';
import {
  EvaluatedRoadPoint,
  getRoadZoneAtS,
  LANE_CENTERS,
  MAX_PLAYER_LATERAL,
  RoadSystem,
} from './roadSystem';
import { createProceduralTextures, ProceduralTextureSet } from './textures';

interface TrafficVehicle {
  id: number;
  rig: TrafficRig;
  colorHex: number;
  s: number;
  laneIndex: number;
  lateral: number;
  speedMs: number;
  direction: 1 | -1;
  nearMissed: boolean;
  hitCooldown: number;
}

interface SparkParticle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
}

interface SmokeParticle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  color: THREE.Color;
}

interface ExhaustFlameParticle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  mode: 'fire' | 'nitro';
}

interface DebrisParticle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  rot: THREE.Vector3;
  rotVel: THREE.Vector3;
  scale: THREE.Vector3;
  color: THREE.Color;
  life: number;
  maxLife: number;
}

interface ExplosionBurst {
  pos: THREE.Vector3;
  life: number;
  maxLife: number;
  maxRadius: number;
}

interface SpeedStreak {
  x: number;
  y: number;
  z: number;
  speed: number;
  len: number;
}

interface RainDrop {
  x: number;
  y: number;
  z: number;
  fallSpeed: number;
  len: number;
}

interface RainSplash {
  s: number;
  lateral: number;
  age: number;
  maxAge: number;
}

interface RoadCoin {
  s: number;
  lateral: number;
  phase: number;
}

interface RoadNitro {
  s: number;
  lateral: number;
  phase: number;
}

interface RoadPickup {
  s: number;
  lateral: number;
  phase: number;
}

export interface EngineCallbacks {
  onHudUpdate: (stats: HudStats) => void;
  onPhaseChange: (phase: GamePhase) => void;
  onCallout: (callout: FloatingCallout) => void;
  onMusicChange?: (state: MusicPlayerState) => void;
  onImpact?: (strength: number) => void;
  onProgressionChange?: (
    goldCoins: number,
    unlockedCars: CarModelId[],
    equippedCar: CarModelId,
    carUpgrades: Record<CarModelId, CarUpgrades>,
    playerLevel: PlayerLevelInfo,
    unlockedWheelStyles: WheelStyleId[],
    carWheels: Record<CarModelId, CarWheelConfig>,
    unlockedBodyKits: BodyKitId[],
    unlockedSpoilers: SpoilerId[],
    unlockedLiveries: LiveryId[],
    carCustom: Record<CarModelId, CarCustomConfig>,
    visualUnlocks: VisualUnlocks,
    powerUpUpgrades: PowerUpUpgrades,
    claimedLevelRewards: number[],
    unlockedCarColors: CarColorId[],
  ) => void;
  onLevelUp?: (event: LevelUpEvent) => void;
  onMissionsChange?: (snapshot: MissionsSnapshot) => void;
  onCareerProgressChange?: (snapshot: CareerProgressSnapshot) => void;
  onCareerRunComplete?: (outcome: CareerRunOutcome) => void;
  onCameraModeChange?: (mode: CameraMode) => void;
}

const BEST_SCORE_KEY = 'viraj_best_score_v1';
const BEST_RECORD_DIST_KEY = 'viraj_best_record_dist_v1';
const TOTAL_GOLD_KEY = 'viraj_total_gold_v1';
const UNLOCKED_CARS_KEY = 'viraj_unlocked_cars_v1';
const EQUIPPED_CAR_KEY = 'viraj_equipped_car_v1';
const CAR_UPGRADES_KEY = 'viraj_car_upgrades_v1';
const UNLOCKED_WHEELS_KEY = 'viraj_unlocked_wheels_v1';
const CAR_WHEELS_KEY = 'viraj_car_wheels_v1';
const UNLOCKED_KITS_KEY = 'viraj_unlocked_kits_v1';
const UNLOCKED_SPOILERS_KEY = 'viraj_unlocked_spoilers_v1';
const UNLOCKED_LIVERIES_KEY = 'viraj_unlocked_liveries_v1';
const CAR_CUSTOM_KEY = 'viraj_car_custom_v1';
const VISUAL_UNLOCKS_KEY = 'viraj_visual_unlocks_v1';
const POWERUP_UPGRADES_KEY = 'viraj_powerup_upgrades_v1';
const PLAYER_XP_KEY = 'viraj_player_xp_v1';
const CLAIMED_LEVEL_REWARDS_KEY = 'viraj_claimed_level_rewards_v1';
const UNLOCKED_COLORS_KEY = 'viraj_unlocked_colors_v1';
const LICENSE_PLATE_KEY = 'viraj_license_plate_v1';
const GAME_MODE_KEY = 'viraj_game_mode_v1';

const DEFAULT_CAR_UPGRADES = (): CarUpgrades => ({
  engine: 0,
  tires: 0,
  nitroTank: 0,
  nitroPower: 0,
});

interface CycleKeyframe {
  t: number;
  skyTop: number;
  skyHorizon: number;
  fogColor: number;
  fogDensity: number;
  sunColor: number;
  sunIntensity: number;
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  exposure: number;
  sunHeight: number;
  lampFactor: number;
}

const CYCLE_KEYFRAMES: CycleKeyframe[] = [
  {
    t: 0.0, // Dawn
    skyTop: 0x1e293b,
    skyHorizon: 0xf59e0b,
    fogColor: 0xd98a5f,
    fogDensity: 0.0024,
    sunColor: 0xffb36b,
    sunIntensity: 2.1,
    hemiSky: 0x9bb7e8,
    hemiGround: 0x4d3629,
    hemiIntensity: 0.85,
    exposure: 1.05,
    sunHeight: 34,
    lampFactor: 0.65,
  },
  {
    t: 0.22, // Bright Midday
    skyTop: 0x1d4ed8,
    skyHorizon: 0x93c5fd,
    fogColor: 0x9bc5f2,
    fogDensity: 0.0017,
    sunColor: 0xfff3d6,
    sunIntensity: 3.0,
    hemiSky: 0xcbe3ff,
    hemiGround: 0x4f4638,
    hemiIntensity: 1.08,
    exposure: 1.02,
    sunHeight: 165,
    lampFactor: 0.0,
  },
  {
    t: 0.45, // Golden Sunset
    skyTop: 0x1b264f,
    skyHorizon: 0xe89058,
    fogColor: 0xd98a5f,
    fogDensity: 0.0024,
    sunColor: 0xffb36b,
    sunIntensity: 2.7,
    hemiSky: 0x9bb7e8,
    hemiGround: 0x4d3629,
    hemiIntensity: 0.92,
    exposure: 1.08,
    sunHeight: 58,
    lampFactor: 0.85,
  },
  {
    t: 0.6, // Dusk
    skyTop: 0x0b1228,
    skyHorizon: 0x6d3b5e,
    fogColor: 0x2f2547,
    fogDensity: 0.003,
    sunColor: 0xc084fc,
    sunIntensity: 1.05,
    hemiSky: 0x4c4f82,
    hemiGround: 0x171421,
    hemiIntensity: 0.65,
    exposure: 1.12,
    sunHeight: -10,
    lampFactor: 1.0,
  },
  {
    t: 0.78, // Midnight
    skyTop: 0x040712,
    skyHorizon: 0x121b36,
    fogColor: 0x0c1224,
    fogDensity: 0.0033,
    sunColor: 0x8ea8e6,
    sunIntensity: 0.85,
    hemiSky: 0x263866,
    hemiGround: 0x0e1118,
    hemiIntensity: 0.55,
    exposure: 1.15,
    sunHeight: -90,
    lampFactor: 1.0,
  },
  {
    t: 0.93, // Pre-dawn
    skyTop: 0x0e1730,
    skyHorizon: 0x475569,
    fogColor: 0x334155,
    fogDensity: 0.0028,
    sunColor: 0xfca5a5,
    sunIntensity: 1.15,
    hemiSky: 0x475569,
    hemiGround: 0x1e293b,
    hemiIntensity: 0.65,
    exposure: 1.08,
    sunHeight: -8,
    lampFactor: 0.95,
  },
  {
    t: 1.0, // Wrap to Dawn
    skyTop: 0x1e293b,
    skyHorizon: 0xf59e0b,
    fogColor: 0xd98a5f,
    fogDensity: 0.0024,
    sunColor: 0xffb36b,
    sunIntensity: 2.1,
    hemiSky: 0x9bb7e8,
    hemiGround: 0x4d3629,
    hemiIntensity: 0.85,
    exposure: 1.05,
    sunHeight: 34,
    lampFactor: 0.65,
  },
];

const _colorA = new THREE.Color();
const _colorB = new THREE.Color();
const _colorMix = new THREE.Color();
const _biomeTintMix = new THREE.Color();
const _biomeSample = createBiomeSample();
const _vecNegRight = new THREE.Vector3();

const _roadSample: EvaluatedRoadPoint = {
  s: 0,
  pos: new THREE.Vector3(),
  tangent: new THREE.Vector3(),
  right: new THREE.Vector3(),
  normal: new THREE.Vector3(),
  heading: 0,
  curvature: 0,
  bank: 0,
};
const _lookRoadSample: EvaluatedRoadPoint = {
  s: 0,
  pos: new THREE.Vector3(),
  tangent: new THREE.Vector3(),
  right: new THREE.Vector3(),
  normal: new THREE.Vector3(),
  heading: 0,
  curvature: 0,
  bank: 0,
};
const _camRoadSample: EvaluatedRoadPoint = {
  s: 0,
  pos: new THREE.Vector3(),
  tangent: new THREE.Vector3(),
  right: new THREE.Vector3(),
  normal: new THREE.Vector3(),
  heading: 0,
  curvature: 0,
  bank: 0,
};
const _trafficSample: EvaluatedRoadPoint = {
  s: 0,
  pos: new THREE.Vector3(),
  tangent: new THREE.Vector3(),
  right: new THREE.Vector3(),
  normal: new THREE.Vector3(),
  heading: 0,
  curvature: 0,
  bank: 0,
};

const _vecA = new THREE.Vector3();
const _vecB = new THREE.Vector3();
const _vecC = new THREE.Vector3();
const _sunOffset = new THREE.Vector3(38, 26, -64);
const _sunDiscOffset = new THREE.Vector3(180, 95, -520);
const _matBasis = new THREE.Matrix4();
const _quatA = new THREE.Quaternion();
const _dummy = new THREE.Object3D();
const _flameColor = new THREE.Color();
const _fireCoreColor = new THREE.Color(0xfef08a);
const _fireMidColor = new THREE.Color(0xf97316);
const _fireTipColor = new THREE.Color(0xdc2626);
const _nitroCoreColor = new THREE.Color(0xe0f2fe);
const _nitroMidColor = new THREE.Color(0x38bdf8);
const _nitroTipColor = new THREE.Color(0x0369a1);
const GEAR_THRESHOLDS = [0, 44, 82, 124, 168, 214, 285] as const;
const DRIFT_MULT_THRESHOLDS = [0, 0.5, 1.5, 3.5, 7.5, 15.5, 31.5, 63.5, 127.5, 255.5] as const;
const _gearRpmOut = { gear: 1, rpmRatio: 0.28 };
const _driftMultOut = { mult: 1, progress: 0 };

const RadialMotionBlurShader = {
  uniforms: {
    tDiffuse: { value: null },
    uBlurStrength: { value: 0 },
    uChromatic: { value: 0 },
    uCenter: { value: new THREE.Vector2(0.5, 0.46) },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uBlurStrength;
    uniform float uChromatic;
    uniform vec2 uCenter;
    varying vec2 vUv;

    void main() {
      vec2 dir = vUv - uCenter;
      float dist = length(dir);
      float edgeMask = smoothstep(0.20, 0.85, dist);
      float blurAmount = uBlurStrength * edgeMask;

      if (blurAmount <= 0.0005) {
        gl_FragColor = texture2D(tDiffuse, vUv);
        return;
      }

      vec2 normDir = dist > 0.0001 ? dir / dist : vec2(0.0);
      vec2 stepVec = normDir * blurAmount;

      vec3 accum = vec3(0.0);
      float totalWeight = 0.0;

      const int SAMPLES = 10;
      for (int i = 0; i < SAMPLES; i++) {
        float t = float(i) / float(SAMPLES - 1);
        float w = 1.0 - t * 0.45;
        vec2 sampleUv = clamp(vUv - stepVec * t, vec2(0.001), vec2(0.999));
        accum += texture2D(tDiffuse, sampleUv).rgb * w;
        totalWeight += w;
      }

      vec3 color = accum / totalWeight;

      if (uChromatic > 0.0001) {
        vec2 chromaOffset = normDir * uChromatic * edgeMask;
        float r = texture2D(tDiffuse, clamp(vUv + chromaOffset, vec2(0.001), vec2(0.999))).r;
        float b = texture2D(tDiffuse, clamp(vUv - chromaOffset, vec2(0.001), vec2(0.999))).b;
        color.r = mix(color.r, r, 0.45);
        color.b = mix(color.b, b, 0.45);
      }

      gl_FragColor = vec4(color, 1.0);
    }
  `,
};

export class HighwayEngine {
  private container: HTMLElement;
  private callbacks: EngineCallbacks;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private isSoftwareGl: boolean;
  private isMobileDevice: boolean;
  private composer: EffectComposer | null = null;
  private motionBlurPass: ShaderPass | null = null;
  private blurStrengthCurrent = 0;

  // Adaptive resolution & particle performance scaling + frame-time smoothing
  private basePixelRatio = 1;
  private currentPixelRatio = 1;
  private perfTier = 0;
  private perfScale = 1;
  private startupFrameCount = 0;
  private smoothedDt = 1 / 60;
  private lastAppliedAtmId: AtmosphereId | null = null;
  private lastAppliedAtmDist = -999;
  private cycleAtmAccumSec = 1;
  private pausedNeedsRender = true;
  private cachedBonusCarId: CarModelId | null = null;
  private cachedBonusWheelStyle: WheelStyleId | null = null;
  private cachedBonusKitId: BodyKitId | null = null;
  private cachedBonusSpoilerId: SpoilerId | null = null;
  private cachedWheelSpec = WHEEL_STYLES[0];
  private cachedKitSpec = BODY_KITS[0];
  private cachedSpoilerSpec = SPOILERS[0];

  private textures: ProceduralTextureSet;
  private road: RoadSystem;
  private roadEvents: RoadEventSystem;
  private trafficGroup = new THREE.Group();
  private playerCar: PlayerCarRig;
  private cockpit: CockpitRig;
  private trafficPool: TrafficAssetPool;
  private trafficRecyclePool: Record<TrafficKind, TrafficRig[]> = {
    sedan: [],
    suv: [],
    truck: [],
  };
  private progressionDirty = false;
  private lastDeferredSaveMs = 0;
  public readonly audio = new AudioEngine();

  private sunLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private rimLight: THREE.DirectionalLight;
  private skyDome: THREE.Mesh;
  private skyUniforms: {
    uTopColor: { value: THREE.Color };
    uHorizonColor: { value: THREE.Color };
  };
  private sunDisc: THREE.Mesh;

  // Particle pools (active + reusable free-lists to avoid per-frame GC)
  private sparksMesh: THREE.InstancedMesh;
  private sparks: SparkParticle[] = [];
  private sparkPool: SparkParticle[] = [];
  private maxSparks = 48;

  private smokeMesh: THREE.InstancedMesh;
  private smokes: SmokeParticle[] = [];
  private smokePool: SmokeParticle[] = [];
  private maxSmokes = 48;
  private smokeTimer = 0;

  private damageSmokeMesh: THREE.InstancedMesh;
  private damageSmokes: SmokeParticle[] = [];
  private damageSmokePool: SmokeParticle[] = [];
  private maxDamageSmokes = 56;
  private damageSmokeTimer = 0;

  private exhaustFlamesMesh: THREE.InstancedMesh;
  private exhaustFlames: ExhaustFlameParticle[] = [];
  private exhaustFlamePool: ExhaustFlameParticle[] = [];
  private maxExhaustFlames = 96;
  private exhaustFlameTimer = 0;
  private prevExhaustGear = 1;

  private streaksMesh: THREE.InstancedMesh;
  private streaks: SpeedStreak[] = [];
  private maxStreaks = 64;

  // Weather: 3D Rain Particle System + Road Splashes + Day/Night Cycle
  private rainMesh: THREE.InstancedMesh;
  private rainDrops: RainDrop[] = [];
  private maxRainDrops = 360;
  private rainSplashMesh: THREE.InstancedMesh;
  private rainSplashes: RainSplash[] = [];
  private maxRainSplashes = 90;
  private cycleTime = 0.2;
  private cycleSunY = 95;

  // Road Gold Coins pool
  private coinsMesh: THREE.InstancedMesh;
  private coins: RoadCoin[] = [];
  private maxCoins = 72;
  private nextCoinSpawnS = 44;
  private coinSpin = 0;

  // Road Nitro Refill Pickups pool
  private nitroMesh: THREE.InstancedMesh;
  private nitros: RoadNitro[] = [];
  private maxNitros = 16;
  private nextNitroSpawnS = 125;
  private nitroSpin = 0;
  private nitroPickupBoostTimer = 0;

  // Road Repair Kit Pickups pool
  private repairMesh: THREE.InstancedMesh;
  private repairs: RoadPickup[] = [];
  private maxRepairs = 12;
  private nextRepairSpawnS = 175;

  // Road Gold Magnet Pickups pool
  private magnetMesh: THREE.InstancedMesh;
  private magnets: RoadPickup[] = [];
  private maxMagnets = 12;
  private nextMagnetSpawnS = 145;
  private magnetTimer = 0;

  // Road Rampage / Overdrive (Yıkım Modu) Pickups + Car Explosion VFX pools
  private rampageCoreMesh: THREE.InstancedMesh;
  private rampageRingMesh: THREE.InstancedMesh;
  private rampageAuraMesh: THREE.Mesh;
  private rampages: RoadPickup[] = [];
  private maxRampages = 8;
  private nextRampageSpawnS = 340;
  private rampageTimer = 0;
  private rampageCountdownStep = 0;
  private rampageSpin = 0;

  private debrisMesh: THREE.InstancedMesh;
  private debris: DebrisParticle[] = [];
  private debrisPool: DebrisParticle[] = [];
  private maxDebris = 120;

  private explosionMesh: THREE.InstancedMesh;
  private explosions: ExplosionBurst[] = [];
  private explosionPool: ExplosionBurst[] = [];
  private maxExplosions = 12;

  // Game & Physics State
  private phase: GamePhase = 'menu';
  private gameMode: GameModeId = 'endless';
  private gameOverReason: GameOverReason = 'crash';
  private atmosphereId: AtmosphereId = 'cycle';
  private currentBiomeId: BiomeId = 'alpine';
  private dynamicWeather: 'clear' | 'fog' | 'rain' | 'snow' | 'sandstorm' =
    'clear';
  private weatherTimerSec = 15;
  private weatherLastBiomeId: BiomeId = 'alpine';
  private weatherRainLevel = 0;
  private weatherFogLevel = 0;
  private weatherSnowLevel = 0;
  private weatherSandLevel = 0;
  private lastRoadWetLevel = -1;
  private lastRainAudioState = false;
  private carColorId: CarColorId = 'pearl';
  private carModelId: CarModelId = 'dogan';
  private carSpec: CarModelSpec = CAR_MODELS[0];
  private licensePlate = 'VİRAJ 34';
  private cameraMode: CameraMode = 'chase';

  // Game Modes State
  private inOncomingLane = false;
  private timeLeftSec = 45;
  private nextCheckpointMeters = 750;

  // Career Mode (100 Levels) state & 3D Finish Line Arch
  private careerManager = new CareerProgressManager();
  private activeCareerLevel: CareerLevelSpec | null = null;
  private savedPreCareerMode: GameModeId | null = null;
  private savedPreCareerAtmosphere: AtmosphereId | null = null;
  private savedPreCareerCameraMode: CameraMode | null = null;
  private careerElapsedSec = 0;
  private careerPeakSpeedKmh = 0;
  private careerMaxCombo = 1;
  private careerRoadEventsCount = 0;
  private careerMission1Announced = false;
  private careerMission2Announced = false;
  private careerStayedInCockpit = true;
  private careerCockpitNearMissCount = 0;
  private careerUsedBrake = false;
  private careerBrakeHoldSec = 0;
  private careerUsedNitro = false;
  private careerDroppedBelowMinSpeed = false;
  private careerOncomingMeters = 0;
  private careerHighSpeedSeconds = 0;
  private finishLineGroup: THREE.Group;
  private finishLineFlags: THREE.Mesh[] = [];
  private finishLineGeos: THREE.BufferGeometry[] = [];
  private finishLineMats: THREE.Material[] = [];
  private finishLineTextures: THREE.Texture[] = [];
  private finishLineFlagTime = 0;
  private checkpointsCleared = 0;
  private lowTimeBeepAccum = 0;
  private bombMinSpeedKmh = 130;
  private bombArmed = false;
  private bombGraceTimer = 3.2;
  private bombFuseTimer = 5.0;
  private bombBeepAccum = 0;

  // 3D Garage Showroom Stage
  private garageGroup: THREE.Group;
  private garageGeometries: THREE.BufferGeometry[] = [];
  private garageMaterials: THREE.Material[] = [];
  private garageYaw = 0.68;
  private garagePitch = 0.24;
  private garageDragging = false;
  private garageMenuCollapsed = false;
  private garageLookX = 0;
  private garageLookY = 0.42;
  private garageLookZ = 0;
  private garageViewOffsetX = 0;
  private garageViewOffsetY = 0;
  private garageDist = 6.0;
  private garageFocus: GarageCameraFocus = 'overview';
  private garageFocusTransitioning = false;
  private garageKeyLight: THREE.PointLight | null = null;
  private garageRimLight: THREE.PointLight | null = null;
  private garageBrightMode = false;
  // LRU cache of built PlayerCarRigs while browsing the Garage (flushed on exit so 0 extra RAM during gameplay)
  private garageCarCache: Map<CarModelId, PlayerCarRig> = new Map();
  private readonly maxGarageCarCacheSize = 6;
  private garagePrewarmTimer: number | null = null;

  // 3D Record Checkpoint Arch & Waving Flags
  private recordMarkerGroup: THREE.Group;
  private recordFlags: THREE.Mesh[] = [];
  private recordFlagTime = 0;
  private recordMarkerGeos: THREE.BufferGeometry[] = [];
  private recordMarkerMats: THREE.Material[] = [];
  private recordMarkerTextures: THREE.Texture[] = [];

  private playerS = 0;
  private playerLateral = 0;
  private targetLateral = 0;
  private lateralVel = 0;
  private playerHeight = 0;
  private playerVelY = 0;
  private slickTimer = 0;
  private boostPadTimer = 0;
  private currentRoadZone: RoadZoneId = 'open';
  private upcomingEvent: UpcomingRoadEvent | null = null;
  private speedMs = 26;
  private throttleInput = 0;
  private tiltSteerInput = 0;
  private resumeCountdownTimer = 0;
  private lastResumeCountdownStep = 0;
  private keyLeft = false;
  private keyRight = false;
  private keyUp = false;
  private keyDown = false;

  private wheelSpin = 0;
  private visualSteer = 0;
  private touchSteerImpulse = 0;
  private touchSteerHoldTimer = 0;
  private carRelYaw = 0;
  private driftSlip = 0;
  private chassisRoll = 0;
  private chassisPitch = 0;
  private cameraRoll = 0;
  private cameraShake = 0;
  private camCurveSwing = 0;
  private camLookLag = 0;
  private camBackDistCurrent = 6.2;
  private camLateralCurrent = 0;
  private camHeightCurrent = 2.42;
  private camLookLateralCurrent = 0;
  private camPosCurrent = new THREE.Vector3(0, 3.2, 8);
  private camLookCurrent = new THREE.Vector3(0, 1.2, -18);
  private crashCamBasePos = new THREE.Vector3(0, 3.2, 8);
  private crashCamBaseLook = new THREE.Vector3(0, 1.2, -18);
  private crashCamRoll = 0;
  private crashCamYaw = 0;
  private crashElapsed = 0;
  private crashSlideSpeed = 0;
  private crashYawVel = 0;
  private crashLatVel = 0;
  private crashRollTarget = 0;
  private crashPitchTarget = 0;
  private crashSparkTimer = 0;
  private menuOrbitTime = 0;

  // Gameplay Systems
  private score = 0;
  private bestScore = 0;
  private bestRecordDistance = 0;
  private runStartBestScore = 0;
  private runStartBestRecordDistance = 0;
  private recordMarkerPassed = false;
  private distanceMeters = 0;
  private nearMissCount = 0;
  private cleanCurvesCount = 0;
  private integrity = 100;
  private nitro = 55;
  private nitroActive = false;
  private nitroRequested = false;
  private combo = 1;
  private comboTimer = 0;
  private readonly comboDuration = 5.5;

  private inSharpCurve = false;
  private curveScraped = false;
  private curveCleanTime = 0;
  private drifting = false;
  private driftScore = 0;
  private driftMultiplier = 1;
  private driftDuration = 0;
  private driftGraceTimer = 0;
  private readonly driftGraceDuration = 1.15;
  private totalDriftScore = 0;
  private missionDriftAccum = 0;
  private calloutId = 1;
  private lastHudPush = 0;
  private scrapeCooldown = 0;
  private guardrailHitCooldown = 0;
  private damageRegenDelay = 0;
  private reviveInvulnTimer = 0;

  private traffic: TrafficVehicle[] = [];
  private nextTrafficId = 1;
  private nextSpawnS = 95;

  // Gold, Upgrades, Player Level XP & Missions Progression
  private totalGold = 0;
  private runGold = 0;
  private lifetimeXp = 0;
  private runCommittedXp = 0;
  private lastKnownLevel = 1;
  private unlockedCars: Set<CarModelId> = new Set(['dogan']);
  private equippedCarModel: CarModelId = 'dogan';
  private rentedCarModel: CarModelId | null = null;
  private powerUpUpgrades: PowerUpUpgrades = getDefaultPowerUpUpgrades();
  private carUpgrades: Record<CarModelId, CarUpgrades> = {
    dogan: DEFAULT_CAR_UPGRADES(),
    hatch: DEFAULT_CAR_UPGRADES(),
    gt: DEFAULT_CAR_UPGRADES(),
    rally: DEFAULT_CAR_UPGRADES(),
    pickup: DEFAULT_CAR_UPGRADES(),
    muscle: DEFAULT_CAR_UPGRADES(),
    m3gtr: DEFAULT_CAR_UPGRADES(),
    jdm: DEFAULT_CAR_UPGRADES(),
    porsche: DEFAULT_CAR_UPGRADES(),
    amggt: DEFAULT_CAR_UPGRADES(),
    hyper: DEFAULT_CAR_UPGRADES(),
    laferrari: DEFAULT_CAR_UPGRADES(),
    lambo: DEFAULT_CAR_UPGRADES(),
    mclarenp1: DEFAULT_CAR_UPGRADES(),
    bugatti: DEFAULT_CAR_UPGRADES(),
    jesko: DEFAULT_CAR_UPGRADES(),
    f1: DEFAULT_CAR_UPGRADES(),
    pagani: DEFAULT_CAR_UPGRADES(),
    bolide: DEFAULT_CAR_UPGRADES(),
    solaris: DEFAULT_CAR_UPGRADES(),
  };
  private unlockedWheelStyles: Set<WheelStyleId> = new Set(['twin5']);
  private carWheels: Record<CarModelId, CarWheelConfig> = {
    dogan: getDefaultWheelForCar('dogan'),
    hatch: getDefaultWheelForCar('hatch'),
    gt: getDefaultWheelForCar('gt'),
    rally: getDefaultWheelForCar('rally'),
    pickup: getDefaultWheelForCar('pickup'),
    muscle: getDefaultWheelForCar('muscle'),
    m3gtr: getDefaultWheelForCar('m3gtr'),
    jdm: getDefaultWheelForCar('jdm'),
    porsche: getDefaultWheelForCar('porsche'),
    amggt: getDefaultWheelForCar('amggt'),
    hyper: getDefaultWheelForCar('hyper'),
    laferrari: getDefaultWheelForCar('laferrari'),
    lambo: getDefaultWheelForCar('lambo'),
    mclarenp1: getDefaultWheelForCar('mclarenp1'),
    bugatti: getDefaultWheelForCar('bugatti'),
    jesko: getDefaultWheelForCar('jesko'),
    f1: getDefaultWheelForCar('f1'),
    pagani: getDefaultWheelForCar('pagani'),
    bolide: getDefaultWheelForCar('bolide'),
    solaris: getDefaultWheelForCar('solaris'),
  };
  private unlockedBodyKits: Set<BodyKitId> = new Set(['stock']);
  private unlockedSpoilers: Set<SpoilerId> = new Set(['none']);
  private unlockedLiveries: Set<LiveryId> = new Set(['solid']);
  private unlockedPaintFinishes: Set<PaintFinishId> = new Set(['metallic']);
  private unlockedPlateStyles: Set<PlateStyleId> = new Set(['classic']);
  private unlockedUnderglows: Set<UnderglowId> = new Set(['none']);
  private unlockedHeadlights: Set<HeadlightId> = new Set(['stock']);
  private unlockedNitroFlames: Set<NitroFlameId> = new Set(['blue']);
  private unlockedDriftSmokes: Set<DriftSmokeId> = new Set(['white']);
  private unlockedRoofHats: Set<RoofHatId> = new Set(['none']);
  private unlockedSteeringWheels: Set<SteeringWheelId> = new Set(['stock']);
  private unlockedMirrorCharms: Set<MirrorCharmId> = new Set(['none']);
  private unlockedCarColors: Set<CarColorId> = new Set(
    getDefaultUnlockedCarColors(),
  );
  private claimedLevelRewards: Set<number> = new Set();
  private previewCustomOverride: CarCustomConfig | null = null;
  private garagePreviewEffect: 'none' | 'nitro' | 'smoke' = 'none';
  private garageSmokeTimer = 0;
  private rainbowSmokeHue = 0;
  private carCustom: Record<CarModelId, CarCustomConfig> = {
    dogan: getDefaultCustomForCar(),
    hatch: getDefaultCustomForCar(),
    gt: getDefaultCustomForCar(),
    rally: getDefaultCustomForCar(),
    pickup: getDefaultCustomForCar(),
    muscle: getDefaultCustomForCar(),
    m3gtr: getDefaultCustomForCar(),
    jdm: getDefaultCustomForCar(),
    porsche: getDefaultCustomForCar(),
    amggt: getDefaultCustomForCar(),
    hyper: getDefaultCustomForCar(),
    laferrari: getDefaultCustomForCar(),
    lambo: getDefaultCustomForCar(),
    mclarenp1: getDefaultCustomForCar(),
    bugatti: getDefaultCustomForCar(),
    jesko: getDefaultCustomForCar(),
    f1: getDefaultCustomForCar(),
    pagani: getDefaultCustomForCar(),
    bolide: getDefaultCustomForCar(),
    solaris: getDefaultCustomForCar(),
  };
  private readonly missions = new MissionManager();
  private missionDistAccum = 0;
  private missionCockpitDistAccum = 0;
  private noHitDistMeters = 0;
  private noHitDistLastReported = 0;
  private missionSpeedCheckAccum = 0;

  private frameId = 0;
  private disposed = false;
  private renderSuspended = false;
  private lastTime = performance.now();
  private lastShadowUpdateMs = 0;
  private envMapTexture: THREE.Texture | null = null;

  constructor(
    container: HTMLElement,
    callbacks: EngineCallbacks,
    startSuspended = false,
  ) {
    this.container = container;
    this.callbacks = callbacks;
    this.renderSuspended = startSuspended;

    try {
      const saved = localStorage.getItem(BEST_SCORE_KEY);
      if (saved) this.bestScore = parseInt(saved, 10) || 0;

      const savedRecordDist = localStorage.getItem(BEST_RECORD_DIST_KEY);
      if (savedRecordDist) {
        this.bestRecordDistance = Math.max(0, parseInt(savedRecordDist, 10) || 0);
      } else if (this.bestScore > 0) {
        this.bestRecordDistance = Math.max(
          180,
          Math.round(this.bestScore * 0.65),
        );
      }

      const savedGold = localStorage.getItem(TOTAL_GOLD_KEY);
      if (savedGold) this.totalGold = Math.max(0, parseInt(savedGold, 10) || 0);

      const savedXp = localStorage.getItem(PLAYER_XP_KEY);
      if (savedXp) {
        this.lifetimeXp = Math.max(0, parseInt(savedXp, 10) || 0);
      } else if (this.bestScore > 0) {
        this.lifetimeXp = this.bestScore;
      }
      this.lastKnownLevel = computePlayerLevel(this.lifetimeXp).level;

      const savedUnlocked = localStorage.getItem(UNLOCKED_CARS_KEY);
      if (savedUnlocked) {
        const parsed = JSON.parse(savedUnlocked) as CarModelId[];
        if (Array.isArray(parsed)) {
          for (const id of parsed) {
            if (CAR_MODELS.some((m) => m.id === id)) {
              this.unlockedCars.add(id);
            }
          }
        }
      }
      this.unlockedCars.add('dogan');

      const savedEquipped = localStorage.getItem(
        EQUIPPED_CAR_KEY,
      ) as CarModelId | null;
      if (savedEquipped && this.unlockedCars.has(savedEquipped)) {
        this.equippedCarModel = savedEquipped;
        this.carModelId = savedEquipped;
        this.carSpec =
          CAR_MODELS.find((m) => m.id === savedEquipped) || CAR_MODELS[0];
      }

      const savedPlate = localStorage.getItem(LICENSE_PLATE_KEY);
      if (savedPlate !== null) {
        this.licensePlate = savedPlate.slice(0, 10);
      }

      const savedUpgrades = localStorage.getItem(CAR_UPGRADES_KEY);
      if (savedUpgrades) {
        const parsedUp = JSON.parse(savedUpgrades) as Partial<
          Record<CarModelId, Partial<CarUpgrades> & { nitro?: number }>
        >;
        if (parsedUp && typeof parsedUp === 'object') {
          for (const model of CAR_MODELS) {
            const entry = parsedUp[model.id];
            if (entry) {
              this.carUpgrades[model.id] = {
                engine: THREE.MathUtils.clamp(
                  entry.engine || 0,
                  0,
                  MAX_UPGRADE_LEVEL,
                ),
                tires: THREE.MathUtils.clamp(
                  entry.tires || 0,
                  0,
                  MAX_UPGRADE_LEVEL,
                ),
                nitroTank: THREE.MathUtils.clamp(
                  entry.nitroTank || 0,
                  0,
                  MAX_UPGRADE_LEVEL,
                ),
                nitroPower: THREE.MathUtils.clamp(
                  entry.nitroPower ?? entry.nitro ?? 0,
                  0,
                  MAX_UPGRADE_LEVEL,
                ),
              };
            }
          }
        }
      }

      const savedPowerUpUpgrades = localStorage.getItem(POWERUP_UPGRADES_KEY);
      if (savedPowerUpUpgrades) {
        const parsedPu = JSON.parse(savedPowerUpUpgrades) as Partial<
          Record<PowerUpId, Partial<{ primary: number; secondary: number }>>
        >;
        if (parsedPu && typeof parsedPu === 'object') {
          for (const spec of POWERUP_SPECS) {
            const entry = parsedPu[spec.id];
            if (entry) {
              this.powerUpUpgrades[spec.id] = {
                primary: THREE.MathUtils.clamp(
                  entry.primary || 0,
                  0,
                  MAX_POWERUP_UPGRADE_LEVEL,
                ),
                secondary: THREE.MathUtils.clamp(
                  entry.secondary || 0,
                  0,
                  MAX_POWERUP_UPGRADE_LEVEL,
                ),
              };
            }
          }
        }
      }

      const savedUnlockedWheels = localStorage.getItem(UNLOCKED_WHEELS_KEY);
      if (savedUnlockedWheels) {
        const parsedW = JSON.parse(savedUnlockedWheels) as WheelStyleId[];
        if (Array.isArray(parsedW)) {
          for (const wId of parsedW) {
            if (WHEEL_STYLES.some((w) => w.id === wId)) {
              this.unlockedWheelStyles.add(wId);
            }
          }
        }
      }
      this.unlockedWheelStyles.add('twin5');

      const savedCarWheels = localStorage.getItem(CAR_WHEELS_KEY);
      if (savedCarWheels) {
        const parsedCw = JSON.parse(savedCarWheels) as Partial<
          Record<CarModelId, Partial<CarWheelConfig>>
        >;
        if (parsedCw && typeof parsedCw === 'object') {
          for (const model of CAR_MODELS) {
            const entry = parsedCw[model.id];
            if (entry) {
              const fallback = getDefaultWheelForCar(model.id);
              const validStyle =
                entry.style &&
                WHEEL_STYLES.some((w) => w.id === entry.style) &&
                this.unlockedWheelStyles.has(entry.style)
                  ? entry.style
                  : fallback.style;
              const validColor =
                entry.color &&
                ['silver', 'gunmetal', 'black', 'gold', 'bronze', 'crimson', 'cobalt', 'chrome'].includes(
                  entry.color,
                )
                  ? entry.color
                  : fallback.color;
              this.carWheels[model.id] = {
                style: validStyle,
                color: validColor,
              };
            }
          }
        }
      }

      const savedKits = localStorage.getItem(UNLOCKED_KITS_KEY);
      if (savedKits) {
        const parsed = JSON.parse(savedKits) as BodyKitId[];
        if (Array.isArray(parsed)) {
          for (const kId of parsed) {
            if (BODY_KITS.some((k) => k.id === kId)) {
              this.unlockedBodyKits.add(kId);
            }
          }
        }
      }
      this.unlockedBodyKits.add('stock');

      const savedSpoilers = localStorage.getItem(UNLOCKED_SPOILERS_KEY);
      if (savedSpoilers) {
        const parsed = JSON.parse(savedSpoilers) as SpoilerId[];
        if (Array.isArray(parsed)) {
          for (const sId of parsed) {
            if (SPOILERS.some((s) => s.id === sId)) {
              this.unlockedSpoilers.add(sId);
            }
          }
        }
      }
      this.unlockedSpoilers.add('none');

      const savedLiveries = localStorage.getItem(UNLOCKED_LIVERIES_KEY);
      if (savedLiveries) {
        const parsed = JSON.parse(savedLiveries) as LiveryId[];
        if (Array.isArray(parsed)) {
          for (const lId of parsed) {
            if (LIVERIES.some((l) => l.id === lId)) {
              this.unlockedLiveries.add(lId);
            }
          }
        }
      }
      this.unlockedLiveries.add('solid');

      const savedVisuals = localStorage.getItem(VISUAL_UNLOCKS_KEY);
      if (savedVisuals) {
        const parsedVisuals = JSON.parse(savedVisuals) as Partial<VisualUnlocks>;
        if (parsedVisuals && typeof parsedVisuals === 'object') {
          if (Array.isArray(parsedVisuals.paintFinish)) {
            for (const id of parsedVisuals.paintFinish) {
              if (PAINT_FINISHES.some((p) => p.id === id)) {
                this.unlockedPaintFinishes.add(id);
              }
            }
          }
          if (Array.isArray(parsedVisuals.plateStyle)) {
            for (const id of parsedVisuals.plateStyle) {
              if (PLATE_STYLES.some((p) => p.id === id)) {
                this.unlockedPlateStyles.add(id);
              }
            }
          }
          if (Array.isArray(parsedVisuals.underglow)) {
            for (const id of parsedVisuals.underglow) {
              if (UNDERGLOWS.some((u) => u.id === id)) {
                this.unlockedUnderglows.add(id);
              }
            }
          }
          if (Array.isArray(parsedVisuals.headlight)) {
            for (const id of parsedVisuals.headlight) {
              if (HEADLIGHTS.some((h) => h.id === id)) {
                this.unlockedHeadlights.add(id);
              }
            }
          }
          if (Array.isArray(parsedVisuals.nitroFlame)) {
            for (const id of parsedVisuals.nitroFlame) {
              if (NITRO_FLAMES.some((n) => n.id === id)) {
                this.unlockedNitroFlames.add(id);
              }
            }
          }
          if (Array.isArray(parsedVisuals.driftSmoke)) {
            for (const id of parsedVisuals.driftSmoke) {
              if (DRIFT_SMOKES.some((d) => d.id === id)) {
                this.unlockedDriftSmokes.add(id);
              }
            }
          }
          if (Array.isArray(parsedVisuals.roofHat)) {
            for (const id of parsedVisuals.roofHat) {
              if (ROOF_HATS.some((h) => h.id === id)) {
                this.unlockedRoofHats.add(id);
              }
            }
          }
          if (Array.isArray(parsedVisuals.steeringWheel)) {
            for (const id of parsedVisuals.steeringWheel) {
              if (STEERING_WHEELS.some((w) => w.id === id)) {
                this.unlockedSteeringWheels.add(id);
              }
            }
          }
          if (Array.isArray(parsedVisuals.mirrorCharm)) {
            for (const id of parsedVisuals.mirrorCharm) {
              if (MIRROR_CHARMS.some((m) => m.id === id)) {
                this.unlockedMirrorCharms.add(id);
              }
            }
          }
        }
      }
      this.unlockedPaintFinishes.add('metallic');
      this.unlockedPlateStyles.add('classic');
      this.unlockedUnderglows.add('none');
      this.unlockedHeadlights.add('stock');
      this.unlockedNitroFlames.add('blue');
      this.unlockedDriftSmokes.add('white');
      this.unlockedRoofHats.add('none');
      this.unlockedSteeringWheels.add('stock');
      this.unlockedMirrorCharms.add('none');

      const savedColors = localStorage.getItem(UNLOCKED_COLORS_KEY);
      if (savedColors) {
        const parsedColors = JSON.parse(savedColors) as CarColorId[];
        if (Array.isArray(parsedColors)) {
          for (const cid of parsedColors) {
            if (CAR_COLORS.some((c) => c.id === cid)) {
              this.unlockedCarColors.add(cid);
            }
          }
        }
      }
      for (const defColor of getDefaultUnlockedCarColors()) {
        this.unlockedCarColors.add(defColor);
      }

      const savedClaimedLevels = localStorage.getItem(
        CLAIMED_LEVEL_REWARDS_KEY,
      );
      if (savedClaimedLevels) {
        const parsedLv = JSON.parse(savedClaimedLevels) as number[];
        if (Array.isArray(parsedLv)) {
          for (const lv of parsedLv) {
            if (
              typeof lv === 'number' &&
              lv >= 1 &&
              lv <= MAX_LEVEL_ROAD_LEVEL
            ) {
              this.claimedLevelRewards.add(Math.floor(lv));
            }
          }
        }
      }

      const savedCustom = localStorage.getItem(CAR_CUSTOM_KEY);
      if (savedCustom) {
        const parsedCustom = JSON.parse(savedCustom) as Partial<
          Record<CarModelId, Partial<CarCustomConfig>>
        >;
        if (parsedCustom && typeof parsedCustom === 'object') {
          const defCustom = getDefaultCustomForCar();
          for (const model of CAR_MODELS) {
            const entry = parsedCustom[model.id];
            if (entry) {
              this.carCustom[model.id] = {
                bodyKit:
                  entry.bodyKit && this.unlockedBodyKits.has(entry.bodyKit)
                    ? entry.bodyKit
                    : defCustom.bodyKit,
                spoiler:
                  entry.spoiler && this.unlockedSpoilers.has(entry.spoiler)
                    ? entry.spoiler
                    : defCustom.spoiler,
                livery:
                  entry.livery && this.unlockedLiveries.has(entry.livery)
                    ? entry.livery
                    : defCustom.livery,
                paintFinish:
                  entry.paintFinish &&
                  this.unlockedPaintFinishes.has(entry.paintFinish)
                    ? entry.paintFinish
                    : defCustom.paintFinish,
                plateStyle:
                  entry.plateStyle &&
                  this.unlockedPlateStyles.has(entry.plateStyle)
                    ? entry.plateStyle
                    : defCustom.plateStyle,
                underglow:
                  entry.underglow &&
                  this.unlockedUnderglows.has(entry.underglow)
                    ? entry.underglow
                    : defCustom.underglow,
                headlight:
                  entry.headlight &&
                  this.unlockedHeadlights.has(entry.headlight)
                    ? entry.headlight
                    : defCustom.headlight,
                nitroFlame:
                  entry.nitroFlame &&
                  this.unlockedNitroFlames.has(entry.nitroFlame)
                    ? entry.nitroFlame
                    : defCustom.nitroFlame,
                driftSmoke:
                  entry.driftSmoke &&
                  this.unlockedDriftSmokes.has(entry.driftSmoke)
                    ? entry.driftSmoke
                    : defCustom.driftSmoke,
                roofHat:
                  entry.roofHat && this.unlockedRoofHats.has(entry.roofHat)
                    ? entry.roofHat
                    : defCustom.roofHat,
                steeringWheel:
                  entry.steeringWheel &&
                  this.unlockedSteeringWheels.has(entry.steeringWheel)
                    ? entry.steeringWheel
                    : defCustom.steeringWheel,
                mirrorCharm:
                  entry.mirrorCharm &&
                  this.unlockedMirrorCharms.has(entry.mirrorCharm)
                    ? entry.mirrorCharm
                    : defCustom.mirrorCharm,
              };
            }
          }
        }
      }
    } catch {
      // ignore storage failure
    }
    let totalUpgradesCount = 0;
    for (const model of CAR_MODELS) {
      const up = this.carUpgrades[model.id];
      if (up) {
        totalUpgradesCount +=
          up.engine + up.tires + up.nitroTank + up.nitroPower;
      }
    }
    this.missions.syncInitialPeaks({
      carsUnlocked: this.unlockedCars.size,
      playerLevel: this.lastKnownLevel,
      runScore: this.bestScore,
      upgradesBought: totalUpgradesCount,
    });
    this.audio.setCarProfile(this.carModelId);

    this.isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param) ?? '');
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    this.isMobileDevice = (() => {
      if (typeof window === 'undefined') return false;
      const ua = navigator.userAgent || '';
      const isMobileUa = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
      const isCoarseSmall =
        Boolean(window.matchMedia?.('(pointer: coarse)').matches) &&
        Math.min(window.innerWidth, window.innerHeight) <= 920;
      const isCapacitorNative = Boolean(
        (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
          .Capacitor?.isNativePlatform?.(),
      );
      return isCapacitorNative || isMobileUa || isCoarseSmall;
    })();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    try {
      this.renderer = new THREE.WebGLRenderer({
        antialias: !this.isSoftwareGl,
        powerPreference: 'high-performance',
        alpha: false,
        stencil: false,
      });
    } catch {
      this.renderer = new THREE.WebGLRenderer({
        antialias: false,
        powerPreference: 'default',
        alpha: false,
        stencil: false,
      });
    }
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    const maxDpr = 1.75;
    this.basePixelRatio = this.isSoftwareGl
      ? 1
      : Math.min(window.devicePixelRatio || 1, maxDpr);
    this.currentPixelRatio = this.basePixelRatio;
    this.renderer.setPixelRatio(this.currentPixelRatio);
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = this.isMobileDevice
      ? THREE.PCFShadowMap
      : THREE.PCFSoftShadowMap;
    if (this.isMobileDevice && this.renderer.shadowMap.enabled) {
      // Keep full dynamic shadows at 60Hz on 120Hz phones instead of double-rendering depth passes every 8.3ms
      this.renderer.shadowMap.autoUpdate = false;
      this.renderer.shadowMap.needsUpdate = true;
    }
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0xd98a5f, 0.0024);
    this.scene.background = new THREE.Color(0xd98a5f);

    this.camera = new THREE.PerspectiveCamera(64, width / height, 0.3, 920);
    this.scene.add(this.camera);

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.envMapTexture = pmremGenerator.fromScene(
      new RoomEnvironment(),
      0.04,
    ).texture;
    this.scene.environment = this.envMapTexture;
    pmremGenerator.dispose();

    this.skyUniforms = {
      uTopColor: { value: new THREE.Color('#1b264f') },
      uHorizonColor: { value: new THREE.Color('#e89058') },
    };
    const skyGeo = new THREE.SphereGeometry(850, 24, 16);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: this.skyUniforms,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      vertexShader: `
        varying vec3 vLocalPos;
        void main() {
          vLocalPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uTopColor;
        uniform vec3 uHorizonColor;
        varying vec3 vLocalPos;
        void main() {
          float h = normalize(vLocalPos).y;
          float t = smoothstep(-0.04, 0.52, h);
          vec3 col = mix(uHorizonColor, uTopColor, t);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    this.skyDome = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.skyDome);

    const sunDiscGeo = new THREE.CircleGeometry(36, 24);
    const sunDiscMat = new THREE.MeshBasicMaterial({
      color: 0xffd29d,
      fog: false,
      transparent: true,
      opacity: 0.92,
    });
    this.sunDisc = new THREE.Mesh(sunDiscGeo, sunDiscMat);
    this.scene.add(this.sunDisc);

    this.hemiLight = new THREE.HemisphereLight(0x9bb7e8, 0x4d3629, 0.95);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xffb36b, 2.8);
    this.sunLight.castShadow = !this.isSoftwareGl;
    const shadowSize = this.isMobileDevice ? 512 : 1024;
    this.sunLight.shadow.mapSize.width = shadowSize;
    this.sunLight.shadow.mapSize.height = shadowSize;
    this.sunLight.shadow.camera.near = 2;
    this.sunLight.shadow.camera.far = this.isMobileDevice ? 92 : 110;
    const d = this.isMobileDevice ? 20 : 26;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0006;
    this.sunLight.shadow.normalBias = 0.03;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    this.rimLight = new THREE.DirectionalLight(0x93c5fd, 0.7);
    this.rimLight.position.set(-20, 14, 30);
    this.scene.add(this.rimLight);

    this.textures = createProceduralTextures(this.renderer, this.isMobileDevice);
    this.road = new RoadSystem(this.textures, this.isMobileDevice);
    this.scene.add(this.road.group);

    this.roadEvents = new RoadEventSystem();
    this.scene.add(this.roadEvents.group);
    this.scene.add(this.trafficGroup);

    const initialPaint = CAR_COLORS.find((c) => c.id === this.carColorId)!.hex;
    this.playerCar = createPlayerCar(
      this.carModelId,
      initialPaint,
      this.textures.contactShadowMap,
      this.isSoftwareGl,
      this.licensePlate,
      this.carWheels[this.carModelId],
      this.carCustom[this.carModelId],
    );
    this.scene.add(this.playerCar.root);
    this.syncActiveEffectColors(this.carCustom[this.carModelId]);

    this.cockpit = createCockpitRig(initialPaint);
    this.cockpit.setSteeringWheel(
      this.carCustom[this.carModelId].steeringWheel ?? 'stock',
    );
    this.cockpit.setMirrorCharm(
      this.carCustom[this.carModelId].mirrorCharm ?? 'none',
    );
    this.cockpit.root.visible = false;
    this.camera.add(this.cockpit.root);

    this.trafficPool = createTrafficAssetPool(this.textures.contactShadowMap);

    // Sparks pool
    const sparkGeo = new THREE.BoxGeometry(0.08, 0.08, 0.38);
    const sparkMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
    this.sparksMesh = new THREE.InstancedMesh(
      sparkGeo,
      sparkMat,
      this.maxSparks,
    );
    this.sparksMesh.frustumCulled = false;
    this.sparksMesh.count = 0;
    this.scene.add(this.sparksMesh);

    // Tire Drift Smoke pool (white base so per-instance colors render vividly)
    const smokeGeo = new THREE.DodecahedronGeometry(0.35, 0);
    const smokeMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.44,
      depthWrite: false,
    });
    this.smokeMesh = new THREE.InstancedMesh(
      smokeGeo,
      smokeMat,
      this.maxSmokes,
    );
    this.smokeMesh.frustumCulled = false;
    this.smokeMesh.count = 0;
    this.scene.add(this.smokeMesh);

    // Damage / Engine Smoke pool (dark charcoal smoke on collision & low integrity)
    const dmgSmokeGeo = new THREE.DodecahedronGeometry(0.42, 0);
    const dmgSmokeMat = new THREE.MeshBasicMaterial({
      color: 0x27272a,
      transparent: true,
      opacity: 0.62,
      depthWrite: false,
    });
    this.damageSmokeMesh = new THREE.InstancedMesh(
      dmgSmokeGeo,
      dmgSmokeMat,
      this.maxDamageSmokes,
    );
    this.damageSmokeMesh.frustumCulled = false;
    this.damageSmokeMesh.count = 0;
    this.scene.add(this.damageSmokeMesh);

    // Dynamic Exhaust Fire & Nitro Afterburner Particle Pool
    const exhaustFlameGeo = new THREE.DodecahedronGeometry(0.13, 0);
    const exhaustFlameMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.exhaustFlamesMesh = new THREE.InstancedMesh(
      exhaustFlameGeo,
      exhaustFlameMat,
      this.maxExhaustFlames,
    );
    this.exhaustFlamesMesh.setColorAt(0, _fireMidColor);
    this.exhaustFlamesMesh.frustumCulled = false;
    this.exhaustFlamesMesh.count = 0;
    this.scene.add(this.exhaustFlamesMesh);

    // High-speed peripheral wind streaks attached to camera
    const streakGeo = new THREE.BoxGeometry(0.025, 0.025, 2.2);
    const streakMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    });
    this.streaksMesh = new THREE.InstancedMesh(
      streakGeo,
      streakMat,
      this.maxStreaks,
    );
    this.streaksMesh.frustumCulled = false;
    this.streaksMesh.count = 0;
    this.camera.add(this.streaksMesh);

    // 3D Rain Streaks attached to camera volume
    const rainGeo = new THREE.BoxGeometry(0.015, 0.88, 0.015);
    const rainMat = new THREE.MeshBasicMaterial({
      color: 0xd0e8ff,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
    });
    this.rainMesh = new THREE.InstancedMesh(
      rainGeo,
      rainMat,
      this.maxRainDrops,
    );
    this.rainMesh.frustumCulled = false;
    this.rainMesh.count = 0;
    this.camera.add(this.rainMesh);

    for (let i = 0; i < this.maxRainDrops; i++) {
      this.rainDrops.push({
        x: (Math.random() - 0.5) * 34,
        y: -3 + Math.random() * 17,
        z: -33 + Math.random() * 35,
        fallSpeed: 23 + Math.random() * 10,
        len: 0.75 + Math.random() * 0.65,
      });
    }

    // 3D Rain Road Splash Rings
    const splashGeo = new THREE.RingGeometry(0.08, 0.145, 10);
    splashGeo.rotateX(-Math.PI / 2);
    const splashMat = new THREE.MeshBasicMaterial({
      color: 0xdbeafe,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.rainSplashMesh = new THREE.InstancedMesh(
      splashGeo,
      splashMat,
      this.maxRainSplashes,
    );
    this.rainSplashMesh.frustumCulled = false;
    this.rainSplashMesh.count = 0;
    this.scene.add(this.rainSplashMesh);

    for (let i = 0; i < this.maxRainSplashes; i++) {
      this.rainSplashes.push({
        s: 2 + Math.random() * 52,
        lateral: (Math.random() - 0.5) * 12.6,
        age: Math.random() * 0.28,
        maxAge: 0.2 + Math.random() * 0.14,
      });
    }

    this.scene.add(this.camera);

    for (let i = 0; i < this.maxStreaks; i++) {
      const angle = (i / this.maxStreaks) * Math.PI * 2 + Math.random() * 0.25;
      const radius = 3.2 + Math.random() * 4.2;
      this.streaks.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius * 0.72 + 0.35,
        z: -4 - Math.random() * 26,
        speed: 38 + Math.random() * 28,
        len: 0.9 + Math.random() * 1.6,
      });
    }

    if (!this.isSoftwareGl && !this.isMobileDevice) {
      this.composer = new EffectComposer(this.renderer);
      this.composer.setPixelRatio(Math.min(this.currentPixelRatio, 1.25));
      this.composer.setSize(width, height);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.motionBlurPass = new ShaderPass(RadialMotionBlurShader);
      this.composer.addPass(this.motionBlurPass);
      this.composer.addPass(new OutputPass());
    }

    // Road Gold Coins InstancedMesh
    const coinGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.12, 20);
    coinGeo.rotateX(Math.PI / 2);
    const coinMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xd97706,
      emissiveIntensity: 0.72,
      metalness: 0.9,
      roughness: 0.16,
      envMapIntensity: 1.5,
    });
    this.coinsMesh = new THREE.InstancedMesh(coinGeo, coinMat, this.maxCoins);
    this.coinsMesh.frustumCulled = false;
    this.coinsMesh.count = 0;
    this.scene.add(this.coinsMesh);

    // Road Nitro Refill Pickups InstancedMesh (NOS Bottle Silhouette)
    const nitroProfile = [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(0.28, 0.0),
      new THREE.Vector2(0.3, 0.06),
      new THREE.Vector2(0.3, 0.72),
      new THREE.Vector2(0.26, 0.82),
      new THREE.Vector2(0.13, 0.94),
      new THREE.Vector2(0.13, 1.06),
      new THREE.Vector2(0.16, 1.08),
      new THREE.Vector2(0.16, 1.18),
      new THREE.Vector2(0.0, 1.18),
    ];
    const nitroGeo = new THREE.LatheGeometry(nitroProfile, 16);
    nitroGeo.center();
    const nitroMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 1.4,
      metalness: 0.72,
      roughness: 0.16,
      envMapIntensity: 1.5,
    });
    this.nitroMesh = new THREE.InstancedMesh(
      nitroGeo,
      nitroMat,
      this.maxNitros,
    );
    this.nitroMesh.frustumCulled = false;
    this.nitroMesh.count = 0;
    this.scene.add(this.nitroMesh);

    // Road Repair Kit Pickups InstancedMesh (3D Emerald Cross)
    const crossShape = new THREE.Shape();
    const armW = 0.21;
    const armL = 0.52;
    crossShape.moveTo(-armW, -armL);
    crossShape.lineTo(armW, -armL);
    crossShape.lineTo(armW, -armW);
    crossShape.lineTo(armL, -armW);
    crossShape.lineTo(armL, armW);
    crossShape.lineTo(armW, armW);
    crossShape.lineTo(armW, armL);
    crossShape.lineTo(-armW, armL);
    crossShape.lineTo(-armW, armW);
    crossShape.lineTo(-armL, armW);
    crossShape.lineTo(-armL, -armW);
    crossShape.lineTo(-armW, -armW);
    crossShape.closePath();
    const repairGeo = new THREE.ExtrudeGeometry(crossShape, {
      depth: 0.22,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.04,
      bevelSegments: 2,
    });
    repairGeo.center();
    const repairMat = new THREE.MeshStandardMaterial({
      color: 0x34d399,
      emissive: 0x059669,
      emissiveIntensity: 1.2,
      metalness: 0.48,
      roughness: 0.22,
      envMapIntensity: 1.3,
    });
    this.repairMesh = new THREE.InstancedMesh(
      repairGeo,
      repairMat,
      this.maxRepairs,
    );
    this.repairMesh.frustumCulled = false;
    this.repairMesh.count = 0;
    this.scene.add(this.repairMesh);

    // Road Gold Magnet Pickups InstancedMesh (3D Horseshoe Magnet)
    const magShape = new THREE.Shape();
    const outerR = 0.5;
    const innerR = 0.25;
    const legLen = 0.34;
    magShape.moveTo(-outerR, legLen);
    magShape.lineTo(-outerR, 0);
    magShape.absarc(0, 0, outerR, Math.PI, Math.PI * 2, false);
    magShape.lineTo(outerR, legLen);
    magShape.lineTo(innerR, legLen);
    magShape.lineTo(innerR, 0);
    magShape.absarc(0, 0, innerR, 0, Math.PI, true);
    magShape.lineTo(-innerR, legLen);
    magShape.closePath();
    const magnetGeo = new THREE.ExtrudeGeometry(magShape, {
      depth: 0.22,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.04,
      bevelSegments: 2,
    });
    magnetGeo.center();
    const magnetMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      emissive: 0xe11d48,
      emissiveIntensity: 1.25,
      metalness: 0.65,
      roughness: 0.2,
      envMapIntensity: 1.4,
    });
    this.magnetMesh = new THREE.InstancedMesh(
      magnetGeo,
      magnetMat,
      this.maxMagnets,
    );
    this.magnetMesh.frustumCulled = false;
    this.magnetMesh.count = 0;
    this.scene.add(this.magnetMesh);

    // Road Rampage / Overdrive Pickup (Distinctive 3D Fiery Lightning Emblem + Plasma Ring)
    const boltShape = new THREE.Shape();
    boltShape.moveTo(0.12, 0.62);
    boltShape.lineTo(-0.34, 0.04);
    boltShape.lineTo(-0.02, 0.04);
    boltShape.lineTo(-0.18, -0.62);
    boltShape.lineTo(0.36, -0.02);
    boltShape.lineTo(0.03, -0.02);
    boltShape.closePath();
    const rampageCoreGeo = new THREE.ExtrudeGeometry(boltShape, {
      depth: 0.22,
      bevelEnabled: true,
      bevelThickness: 0.045,
      bevelSize: 0.04,
      bevelSegments: 2,
    });
    rampageCoreGeo.center();
    const rampageCoreMat = new THREE.MeshStandardMaterial({
      color: 0xffb703,
      emissive: 0xff4d00,
      emissiveIntensity: 1.9,
      metalness: 0.45,
      roughness: 0.15,
      envMapIntensity: 1.5,
    });
    this.rampageCoreMesh = new THREE.InstancedMesh(
      rampageCoreGeo,
      rampageCoreMat,
      this.maxRampages,
    );
    this.rampageCoreMesh.frustumCulled = false;
    this.rampageCoreMesh.count = 0;
    this.scene.add(this.rampageCoreMesh);

    const rampageRingGeo = new THREE.TorusGeometry(0.76, 0.075, 10, 28);
    const rampageRingMat = new THREE.MeshStandardMaterial({
      color: 0xff3b00,
      emissive: 0xff2200,
      emissiveIntensity: 1.65,
      metalness: 0.6,
      roughness: 0.18,
    });
    this.rampageRingMesh = new THREE.InstancedMesh(
      rampageRingGeo,
      rampageRingMat,
      this.maxRampages,
    );
    this.rampageRingMesh.frustumCulled = false;
    this.rampageRingMesh.count = 0;
    this.scene.add(this.rampageRingMesh);

    // Translucent fiery energy shield aura hugging the player car during Rampage Mode
    const auraGeo = new THREE.SphereGeometry(1.55, 22, 16);
    auraGeo.scale(0.92, 0.62, 1.68);
    const auraMat = new THREE.MeshBasicMaterial({
      color: 0xff5a00,
      transparent: true,
      opacity: 0.24,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      wireframe: false,
    });
    this.rampageAuraMesh = new THREE.Mesh(auraGeo, auraMat);
    this.rampageAuraMesh.visible = false;
    this.rampageAuraMesh.frustumCulled = false;
    this.scene.add(this.rampageAuraMesh);

    // Exploding Car Debris InstancedMesh
    const debrisGeo = new THREE.BoxGeometry(0.32, 0.16, 0.46);
    const debrisMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.42,
      metalness: 0.58,
      emissive: 0x451200,
      emissiveIntensity: 0.35,
    });
    this.debrisMesh = new THREE.InstancedMesh(
      debrisGeo,
      debrisMat,
      this.maxDebris,
    );
    this.debrisMesh.frustumCulled = false;
    this.debrisMesh.count = 0;
    this.scene.add(this.debrisMesh);

    // Expanding Fiery Explosion Fireball Pool
    const explosionGeo = new THREE.IcosahedronGeometry(1.0, 2);
    const explosionMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.explosionMesh = new THREE.InstancedMesh(
      explosionGeo,
      explosionMat,
      this.maxExplosions,
    );
    this.explosionMesh.frustumCulled = false;
    this.explosionMesh.count = 0;
    this.scene.add(this.explosionMesh);

    this.garageGroup = this.buildGarageStage();
    this.garageGroup.visible = false;
    this.scene.add(this.garageGroup);

    this.recordMarkerGroup = this.buildRecordMarkerGroup();
    this.recordMarkerGroup.visible = false;
    this.scene.add(this.recordMarkerGroup);

    this.finishLineGroup = this.buildFinishLineGroup();
    this.finishLineGroup.visible = false;
    this.scene.add(this.finishLineGroup);

    // Pre-warm kind-only Traffic Pool once at startup (8 Sedan, 6 SUV, 4 Truck)
    // so zero traffic vehicles are ever allocated during gameplay (color swaps in O(1))
    const trafficWarmPalette = [
      0xf8fafc, 0x334155, 0x991b1b, 0x1e40af, 0x71717a, 0xd97706, 0x065f46,
    ];
    const warmPlan: Array<[TrafficKind, number]> = [
      ['sedan', 8],
      ['suv', 6],
      ['truck', 4],
    ];
    for (const [kind, count] of warmPlan) {
      for (let i = 0; i < count; i++) {
        const rig = this.trafficPool.createVehicle(
          kind,
          trafficWarmPalette[i % trafficWarmPalette.length],
        );
        rig.root.visible = false;
        this.trafficGroup.add(rig.root);
        this.trafficRecyclePool[kind].push(rig);
      }
    }

    try {
      const savedMode = localStorage.getItem(GAME_MODE_KEY) as GameModeId | null;
      if (savedMode && GAME_MODES.some((m) => m.id === savedMode)) {
        this.gameMode = savedMode;
      } else {
        this.gameMode = 'endless';
        localStorage.setItem(GAME_MODE_KEY, 'endless');
      }
    } catch {
      // ignore storage errors
    }

    this.applyAtmosphere(this.atmosphereId);
    this.resetWorld();
    this.notifyProgression();
    this.callbacks.onMissionsChange?.(this.missions.getSnapshot());
    this.callbacks.onCareerProgressChange?.(this.careerManager.getSnapshot());

    this.renderer.domElement.addEventListener(
      'webglcontextlost',
      this.handleContextLost,
    );
    this.renderer.domElement.addEventListener(
      'webglcontextrestored',
      this.handleContextRestored,
    );
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('pagehide', this.handlePageHide);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    // Warm shaders immediately on desktop or while hidden behind the intro video so zero GLSL stalls occur in menu/gameplay
    if (!this.isSoftwareGl) {
      if (!this.isMobileDevice || this.renderSuspended) {
        this.renderer.compile(this.scene, this.camera);
      } else {
        window.setTimeout(() => {
          if (!this.disposed && this.phase === 'menu') {
            this.renderer.compile(this.scene, this.camera);
          }
        }, 220);
      }
    }

    this.lastTime = performance.now();
    if (this.renderSuspended) {
      // Pre-render one warm menu frame into the backbuffer, then stay completely idle (0% GPU/CPU) until intro fades out
      this.stepMenuPreview(0.016);
      this.renderer.render(this.scene, this.camera);
    } else {
      this.scheduleNextTick();
    }
  }

  public setRenderSuspended(suspended: boolean): void {
    if (this.renderSuspended === suspended) return;
    this.renderSuspended = suspended;
    if (suspended) {
      cancelAnimationFrame(this.frameId);
      clearTimeout(this.frameId);
      this.frameId = 0;
    } else if (!this.disposed) {
      this.lastTime = performance.now();
      this.startupFrameCount = 0;
      this.scheduleNextTick();
    }
  }

  private handleContextLost = (e: Event): void => {
    e.preventDefault();
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
  };

  private handleContextRestored = (): void => {
    if (this.disposed || this.renderSuspended) return;
    this.lastTime = performance.now();
    this.scheduleNextTick();
  };

  private handlePageHide = (): void => {
    this.flushDeferredSaves(false);
  };

  private handleVisibilityChange = (): void => {
    if (document.visibilityState === 'hidden') {
      this.flushDeferredSaves(false);
    }
  };

  public handleResize = (): void => {
    if (this.disposed) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    if (this.phase !== 'garage') {
      this.camera.clearViewOffset();
    }
    this.camera.updateProjectionMatrix();
    this.basePixelRatio = this.isSoftwareGl
      ? 1
      : Math.min(window.devicePixelRatio || 1, 1.75);
    const dprMult = this.perfTier === 0 ? 1 : this.perfTier === 1 ? 0.9 : 0.8;
    const minDpr = this.isMobileDevice
      ? Math.min(this.basePixelRatio, 1.5)
      : 1.0;
    this.currentPixelRatio = this.isSoftwareGl
      ? 1
      : Math.max(
          minDpr,
          Math.min(
            this.basePixelRatio,
            Number((this.basePixelRatio * dprMult).toFixed(2)),
          ),
        );
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(this.currentPixelRatio);
    this.pausedNeedsRender = true;
    if (this.composer) {
      this.composer.setPixelRatio(Math.min(this.currentPixelRatio, 1.25));
      this.composer.setSize(width, height);
    }
  };

  public getLicensePlate(): string {
    return this.licensePlate;
  }

  public setLicensePlate(text: string): void {
    const normalized = text.slice(0, 10);
    this.licensePlate = normalized;
    this.playerCar.setLicensePlate(normalized);
    try {
      localStorage.setItem(LICENSE_PLATE_KEY, normalized);
    } catch {
      // ignore storage failure
    }
  }

  public setCarColor(id: CarColorId): void {
    const opt = CAR_COLORS.find((c) => c.id === id);
    if (!opt) return;
    if (opt.levelRoadLevel && !this.unlockedCarColors.has(id)) {
      return;
    }
    this.carColorId = id;
    this.playerCar.setPaintColor(opt.hex);
    this.cockpit.paintMaterial.color.setHex(opt.hex);
  }

  private cancelGaragePrewarm(): void {
    if (this.garagePrewarmTimer !== null) {
      window.clearTimeout(this.garagePrewarmTimer);
      this.garagePrewarmTimer = null;
    }
  }

  private parkCarInGarageCache(modelId: CarModelId, rig: PlayerCarRig): void {
    const existing = this.garageCarCache.get(modelId);
    if (existing && existing !== rig) {
      existing.dispose();
    }
    this.garageCarCache.delete(modelId);
    this.garageCarCache.set(modelId, rig);

    while (this.garageCarCache.size > this.maxGarageCarCacheSize) {
      const oldestKey = this.garageCarCache.keys().next().value as
        | CarModelId
        | undefined;
      if (!oldestKey) break;
      const oldestRig = this.garageCarCache.get(oldestKey);
      this.garageCarCache.delete(oldestKey);
      if (oldestRig && oldestRig !== this.playerCar) {
        oldestRig.dispose();
      }
    }
  }

  private clearGarageCarCache(): void {
    this.cancelGaragePrewarm();
    for (const rig of this.garageCarCache.values()) {
      if (rig !== this.playerCar) {
        rig.dispose();
      }
    }
    this.garageCarCache.clear();
  }

  private scheduleGarageAdjacentPrewarm(): void {
    this.cancelGaragePrewarm();
    if (this.phase !== 'garage' || this.disposed) return;

    const total = CAR_MODELS.length;
    if (total <= 1) return;
    const curIdx = CAR_MODELS.findIndex((m) => m.id === this.carModelId);
    if (curIdx < 0) return;

    const candidates: CarModelId[] = [
      CAR_MODELS[(curIdx + 1) % total].id,
      CAR_MODELS[(curIdx - 1 + total) % total].id,
    ].filter(
      (cid, i, arr) =>
        cid !== this.carModelId &&
        arr.indexOf(cid) === i &&
        !this.garageCarCache.has(cid),
    );
    if (candidates.length === 0) return;

    let stepIdx = 0;
    const runStep = () => {
      this.garagePrewarmTimer = null;
      if (this.phase !== 'garage' || this.disposed) return;
      if (this.garageDragging) {
        this.garagePrewarmTimer = window.setTimeout(runStep, 180);
        return;
      }
      const targetId = candidates[stepIdx];
      if (!targetId) return;
      if (targetId !== this.carModelId && !this.garageCarCache.has(targetId)) {
        const paintHex =
          CAR_COLORS.find((c) => c.id === this.carColorId)?.hex ?? 0xf4f4f5;
        const prebuilt = createPlayerCar(
          targetId,
          paintHex,
          this.textures.contactShadowMap,
          this.isSoftwareGl,
          this.licensePlate,
          this.carWheels[targetId],
          this.carCustom[targetId],
        );
        this.parkCarInGarageCache(targetId, prebuilt);
      }
      stepIdx++;
      if (stepIdx < candidates.length) {
        this.garagePrewarmTimer = window.setTimeout(runStep, 220);
      }
    };

    this.garagePrewarmTimer = window.setTimeout(runStep, 180);
  }

  public setCarModel(id: CarModelId): void {
    if (this.carModelId === id) return;
    const prevModelId = this.carModelId;
    this.carModelId = id;
    this.carSpec = CAR_MODELS.find((m) => m.id === id) || CAR_MODELS[0];
    this.audio.setCarProfile(id);
    this.cancelGaragePrewarm();

    const oldPos = this.playerCar.root.position.clone();
    const oldQuat = this.playerCar.root.quaternion.clone();
    this.scene.remove(this.playerCar.root);
    if (this.phase === 'garage') {
      this.parkCarInGarageCache(prevModelId, this.playerCar);
    } else {
      this.playerCar.dispose();
    }

    const paintHex =
      CAR_COLORS.find((c) => c.id === this.carColorId)?.hex ?? 0xf4f4f5;
    const cachedRig = this.garageCarCache.get(id);
    if (cachedRig) {
      this.garageCarCache.delete(id);
      this.playerCar = cachedRig;
      this.playerCar.setPaintColor(paintHex);
      this.playerCar.setLicensePlate(this.licensePlate);
      const wheelCfg = this.carWheels[this.carModelId];
      this.playerCar.setWheelConfig(wheelCfg.style, wheelCfg.color);
      this.playerCar.setCustomConfig(this.carCustom[this.carModelId]);
    } else {
      this.playerCar = createPlayerCar(
        this.carModelId,
        paintHex,
        this.textures.contactShadowMap,
        this.isSoftwareGl,
        this.licensePlate,
        this.carWheels[this.carModelId],
        this.carCustom[this.carModelId],
      );
    }
    if (this.phase === 'garage') {
      this.playerCar.root.position.set(0, 0.01, 0);
      this.playerCar.root.quaternion.identity();
      this.playerCar.chassisGroup.rotation.set(0, 0, 0);
      this.playerCar.root.visible = true;
      this.playerCar.frontLeftPivot.rotation.y = 0.22;
      this.playerCar.frontRightPivot.rotation.y = 0.22;
    } else {
      this.playerCar.root.position.copy(oldPos);
      this.playerCar.root.quaternion.copy(oldQuat);
    }
    this.scene.add(this.playerCar.root);
    this.previewCustomOverride = null;
    this.syncActiveEffectColors(this.carCustom[this.carModelId]);
    if (this.phase === 'garage') {
      this.applyGarageShowroomHeadlights();
      this.applyGarageLighting();
      this.scheduleGarageAdjacentPrewarm();
    } else {
      this.applyAtmosphere(this.atmosphereId);
    }
    if (this.unlockedCars.has(id) && this.rentedCarModel !== id) {
      this.equippedCarModel = id;
      try {
        localStorage.setItem(EQUIPPED_CAR_KEY, id);
      } catch {
        // ignore storage failure
      }
      this.notifyProgression();
    }
  }

  public getActiveCarModel(): CarModelId {
    return this.carModelId;
  }

  public rentCarForOneRun(id: CarModelId): void {
    this.rentedCarModel = id;
    this.setCarModel(id);
    this.startGame(true);
    this.emitCallout(
      'KİRALIK ARAÇ AKTİF',
      `${this.carSpec.name} · 1 Koşu`,
      'amber',
    );
  }

  private getActiveNitroMax(): number {
    const upgrades =
      this.carUpgrades[this.carModelId] || DEFAULT_CAR_UPGRADES();
    return getMaxNitroCapacity(
      upgrades.nitroTank,
      this.powerUpUpgrades.nitro.secondary,
    );
  }

  private getLivePlayerLevel(): PlayerLevelInfo {
    const uncommitted = Math.max(
      0,
      Math.floor(this.score) - this.runCommittedXp,
    );
    return computePlayerLevel(this.lifetimeXp + uncommitted);
  }

  private commitRunXp(): void {
    const delta = Math.max(0, Math.floor(this.score) - this.runCommittedXp);
    if (delta > 0) {
      this.lifetimeXp += delta;
      this.runCommittedXp += delta;
      this.saveProgression();
      this.notifyProgression();
    }
  }

  private getVisualUnlocksSnapshot(): VisualUnlocks {
    return {
      paintFinish: Array.from(this.unlockedPaintFinishes),
      plateStyle: Array.from(this.unlockedPlateStyles),
      underglow: Array.from(this.unlockedUnderglows),
      headlight: Array.from(this.unlockedHeadlights),
      nitroFlame: Array.from(this.unlockedNitroFlames),
      driftSmoke: Array.from(this.unlockedDriftSmokes),
      roofHat: Array.from(this.unlockedRoofHats),
      steeringWheel: Array.from(this.unlockedSteeringWheels),
      mirrorCharm: Array.from(this.unlockedMirrorCharms),
    };
  }

  private getEffectiveCustomConfig(): CarCustomConfig {
    return this.previewCustomOverride ?? this.carCustom[this.carModelId];
  }

  private syncActiveEffectColors(config?: CarCustomConfig): void {
    const cfg = config ?? this.getEffectiveCustomConfig();
    const nitroSpec =
      NITRO_FLAMES.find((n) => n.id === cfg.nitroFlame) ?? NITRO_FLAMES[0];
    _nitroCoreColor.setHex(nitroSpec.coreHex);
    _nitroMidColor.setHex(nitroSpec.midHex);
    _nitroTipColor.setHex(nitroSpec.tipHex);
    if (this.cockpit) {
      this.cockpit.setSteeringWheel(cfg.steeringWheel ?? 'stock');
      this.cockpit.setMirrorCharm(cfg.mirrorCharm ?? 'none');
    }
  }

  private fillActiveSmokeColor(target: THREE.Color): void {
    const cfg = this.getEffectiveCustomConfig();
    const smokeSpec =
      DRIFT_SMOKES.find((d) => d.id === cfg.driftSmoke) ?? DRIFT_SMOKES[0];
    const mode = smokeSpec.colorMode ?? (smokeSpec.rainbow ? 'rainbow' : 'solid');
    if (mode === 'rainbow') {
      this.rainbowSmokeHue = (this.rainbowSmokeHue + 0.042) % 1;
      target.setHSL(this.rainbowSmokeHue, 0.92, 0.62);
    } else if (mode === 'cyber') {
      this.rainbowSmokeHue = (this.rainbowSmokeHue + 0.075) % 1;
      const wave = 0.5 + 0.5 * Math.sin(this.rainbowSmokeHue * Math.PI * 2);
      target.setHSL(0.52 + wave * 0.36, 0.96, 0.58);
    } else if (mode === 'aurora') {
      this.rainbowSmokeHue = (this.rainbowSmokeHue + 0.055) % 1;
      const wave = 0.5 + 0.5 * Math.sin(this.rainbowSmokeHue * Math.PI * 2);
      target.setHSL(0.42 + wave * 0.34, 0.9, 0.58);
    } else if (mode === 'lava') {
      this.rainbowSmokeHue = (this.rainbowSmokeHue + 0.095) % 1;
      const wave = 0.5 + 0.5 * Math.sin(this.rainbowSmokeHue * Math.PI * 2);
      target.setHSL(0.015 + wave * 0.095, 1.0, 0.5 + wave * 0.14);
    } else if (mode === 'police') {
      this.rainbowSmokeHue = (this.rainbowSmokeHue + 0.16) % 1;
      target.setHex(this.rainbowSmokeHue < 0.5 ? 0x3b82f6 : 0xef4444);
    } else {
      target.setHex(smokeSpec.smokeHex);
    }
  }

  public getProgressionState(): {
    goldCoins: number;
    unlockedCars: CarModelId[];
    equippedCar: CarModelId;
    carUpgrades: Record<CarModelId, CarUpgrades>;
    playerLevel: PlayerLevelInfo;
    unlockedWheelStyles: WheelStyleId[];
    carWheels: Record<CarModelId, CarWheelConfig>;
    unlockedBodyKits: BodyKitId[];
    unlockedSpoilers: SpoilerId[];
    unlockedLiveries: LiveryId[];
    carCustom: Record<CarModelId, CarCustomConfig>;
    visualUnlocks: VisualUnlocks;
    powerUpUpgrades: PowerUpUpgrades;
    claimedLevelRewards: number[];
    unlockedCarColors: CarColorId[];
  } {
    const upgradesCopy = {} as Record<CarModelId, CarUpgrades>;
    const wheelsCopy = {} as Record<CarModelId, CarWheelConfig>;
    const customCopy = {} as Record<CarModelId, CarCustomConfig>;
    for (const m of CAR_MODELS) {
      upgradesCopy[m.id] = { ...this.carUpgrades[m.id] };
      wheelsCopy[m.id] = { ...this.carWheels[m.id] };
      customCopy[m.id] = { ...this.carCustom[m.id] };
    }
    return {
      goldCoins: this.totalGold,
      unlockedCars: Array.from(this.unlockedCars),
      equippedCar: this.equippedCarModel,
      carUpgrades: upgradesCopy,
      playerLevel: this.getLivePlayerLevel(),
      unlockedWheelStyles: Array.from(this.unlockedWheelStyles),
      carWheels: wheelsCopy,
      unlockedBodyKits: Array.from(this.unlockedBodyKits),
      unlockedSpoilers: Array.from(this.unlockedSpoilers),
      unlockedLiveries: Array.from(this.unlockedLiveries),
      carCustom: customCopy,
      visualUnlocks: this.getVisualUnlocksSnapshot(),
      powerUpUpgrades: this.getPowerUpUpgradesCopy(),
      claimedLevelRewards: Array.from(this.claimedLevelRewards).sort(
        (a, b) => a - b,
      ),
      unlockedCarColors: Array.from(this.unlockedCarColors),
    };
  }

  private getPowerUpUpgradesCopy(): PowerUpUpgrades {
    return {
      nitro: { ...this.powerUpUpgrades.nitro },
      repair: { ...this.powerUpUpgrades.repair },
      magnet: { ...this.powerUpUpgrades.magnet },
      rampage: { ...this.powerUpUpgrades.rampage },
    };
  }

  private isPowerUpUnlocked(id: PowerUpId): boolean {
    return this.getLivePlayerLevel().level >= getPowerUpUnlockLevel(id);
  }

  public upgradePowerUp(id: PowerUpId, track: PowerUpUpgradeTrack): boolean {
    if (!this.isPowerUpUnlocked(id)) return false;
    const spec = getPowerUpSpec(id);
    if (track === 'secondary' && !spec.secondary) return false;
    const levels = this.powerUpUpgrades[id];
    const currentLevel = levels[track];
    if (currentLevel >= MAX_POWERUP_UPGRADE_LEVEL) return false;
    const cost = spec.costs[currentLevel];
    if (this.totalGold < cost) return false;

    this.audio.init();
    this.totalGold -= cost;
    levels[track] = currentLevel + 1;
    this.saveProgression();
    this.audio.playUpgrade();
    this.handleMissionRewards(this.missions.recordDelta('upgradesBought', 1));
    this.notifyProgression();
    this.pushHud(true);
    return true;
  }

  public getMissionsSnapshot(): MissionsSnapshot {
    return this.missions.getSnapshot();
  }

  public claimMissionReward(missionId: string): ClaimResult {
    const res = this.missions.claimMission(missionId);
    if (!res.ok || res.rewardGold <= 0) return res;
    this.audio.init();
    this.totalGold += res.rewardGold;
    this.saveProgression();
    this.notifyProgression();
    this.audio.playAchievementUnlock();
    this.emitCallout(
      'Görev Ödülü Alındı!',
      `+${res.rewardGold.toLocaleString('tr-TR')} Altın`,
      'emerald',
    );
    this.callbacks.onMissionsChange?.(this.missions.getSnapshot());
    this.pushHud(true);
    return res;
  }

  public claimAchievementReward(achievementId: string): ClaimResult {
    const res = this.missions.claimAchievement(achievementId);
    if (!res.ok || res.rewardGold <= 0) return res;
    this.audio.init();
    this.totalGold += res.rewardGold;
    this.saveProgression();
    this.notifyProgression();
    this.audio.playAchievementUnlock();
    this.emitCallout(
      res.title ? `Başarım: ${res.title}` : 'Başarım Ödülü Alındı!',
      `+${res.rewardGold.toLocaleString('tr-TR')} Altın`,
      'emerald',
    );
    this.callbacks.onMissionsChange?.(this.missions.getSnapshot());
    this.pushHud(true);
    return res;
  }

  public claimAllMissionRewards(
    scope: 'missions' | 'achievements' | 'all' = 'all',
  ): ClaimResult {
    const res = this.missions.claimAllRewards(scope);
    if (!res.ok || res.rewardGold <= 0) return res;
    this.audio.init();
    this.totalGold += res.rewardGold;
    this.saveProgression();
    this.notifyProgression();
    this.audio.playAchievementUnlock();
    this.emitCallout(
      `${res.count} Ödül Toplandı!`,
      `+${res.rewardGold.toLocaleString('tr-TR')} Altın`,
      'emerald',
    );
    this.callbacks.onMissionsChange?.(this.missions.getSnapshot());
    this.pushHud(true);
    return res;
  }

  public upgradeCarPart(carId: CarModelId, part: CarUpgradeKey): boolean {
    if (!this.unlockedCars.has(carId)) return false;
    const upgrades = this.carUpgrades[carId];
    const currentLevel = upgrades[part];
    if (currentLevel >= MAX_UPGRADE_LEVEL) return false;
    const cost = UPGRADE_COSTS[currentLevel];
    if (this.totalGold < cost) return false;

    this.audio.init();
    this.totalGold -= cost;
    upgrades[part] = currentLevel + 1;
    if (part === 'nitroTank' && carId === this.carModelId) {
      this.nitro = Math.round(this.getActiveNitroMax() * 0.55);
    }
    this.saveProgression();
    this.audio.playUpgrade();
    this.handleMissionRewards(this.missions.recordDelta('upgradesBought', 1));
    this.notifyProgression();
    this.pushHud(true);
    return true;
  }

  public previewWheelConfig(
    styleId: WheelStyleId,
    colorId: WheelColorId,
  ): void {
    this.playerCar.setWheelConfig(styleId, colorId);
  }

  public setCarWheelStyle(
    carId: CarModelId,
    styleId: WheelStyleId,
  ): boolean {
    if (!this.unlockedWheelStyles.has(styleId)) return false;
    this.carWheels[carId] = {
      ...this.carWheels[carId],
      style: styleId,
    };
    if (carId === this.carModelId) {
      this.playerCar.setWheelConfig(styleId, this.carWheels[carId].color);
    }
    this.saveProgression();
    this.notifyProgression();
    return true;
  }

  public setCarWheelColor(carId: CarModelId, colorId: WheelColorId): void {
    this.carWheels[carId] = {
      ...this.carWheels[carId],
      color: colorId,
    };
    if (carId === this.carModelId) {
      this.playerCar.setWheelConfig(this.carWheels[carId].style, colorId);
    }
    this.saveProgression();
    this.notifyProgression();
  }

  public unlockWheelStyle(
    styleId: WheelStyleId,
    equipToCarId?: CarModelId,
  ): boolean {
    const spec = WHEEL_STYLES.find((w) => w.id === styleId);
    if (!spec) return false;
    if (this.unlockedWheelStyles.has(styleId)) {
      if (equipToCarId) {
        return this.setCarWheelStyle(equipToCarId, styleId);
      }
      return true;
    }
    if (this.totalGold < spec.priceGold) return false;

    this.audio.init();
    this.totalGold -= spec.priceGold;
    this.unlockedWheelStyles.add(styleId);
    const targetCar = equipToCarId ?? this.carModelId;
    this.carWheels[targetCar] = {
      ...this.carWheels[targetCar],
      style: styleId,
    };
    if (targetCar === this.carModelId) {
      this.playerCar.setWheelConfig(styleId, this.carWheels[targetCar].color);
    }
    this.saveProgression();
    this.audio.playCarUnlock();
    this.notifyProgression();
    this.pushHud(true);
    return true;
  }

  public previewCustomConfig(config: CarCustomConfig): void {
    this.previewCustomOverride = { ...config };
    this.playerCar.setCustomConfig(config);
    this.syncActiveEffectColors(config);
  }

  public setGarageEffectPreview(mode: 'none' | 'nitro' | 'smoke'): void {
    this.garagePreviewEffect = mode;
    if (this.phase !== 'garage') return;
    if (mode !== 'nitro') {
      for (const fm of this.playerCar.flameMeshes) {
        fm.visible = false;
      }
      this.exhaustFlames = [];
      this.exhaustFlamesMesh.count = 0;
    }
    if (mode !== 'smoke') {
      this.smokes = [];
      this.smokeMesh.count = 0;
    }
  }

  private getVisualUnlockSetAndPrice(
    category: VisualCategory,
    itemId: string,
  ): { set: Set<string>; priceGold: number; levelRoadLevel?: number } | null {
    switch (category) {
      case 'paintFinish': {
        const spec = PAINT_FINISHES.find((p) => p.id === itemId);
        return spec
          ? {
              set: this.unlockedPaintFinishes as unknown as Set<string>,
              priceGold: spec.priceGold,
              levelRoadLevel: spec.levelRoadLevel,
            }
          : null;
      }
      case 'plateStyle': {
        const spec = PLATE_STYLES.find((p) => p.id === itemId);
        return spec
          ? {
              set: this.unlockedPlateStyles as unknown as Set<string>,
              priceGold: spec.priceGold,
              levelRoadLevel: spec.levelRoadLevel,
            }
          : null;
      }
      case 'underglow': {
        const spec = UNDERGLOWS.find((u) => u.id === itemId);
        return spec
          ? {
              set: this.unlockedUnderglows as unknown as Set<string>,
              priceGold: spec.priceGold,
              levelRoadLevel: spec.levelRoadLevel,
            }
          : null;
      }
      case 'headlight': {
        const spec = HEADLIGHTS.find((h) => h.id === itemId);
        return spec
          ? {
              set: this.unlockedHeadlights as unknown as Set<string>,
              priceGold: spec.priceGold,
              levelRoadLevel: spec.levelRoadLevel,
            }
          : null;
      }
      case 'nitroFlame': {
        const spec = NITRO_FLAMES.find((n) => n.id === itemId);
        return spec
          ? {
              set: this.unlockedNitroFlames as unknown as Set<string>,
              priceGold: spec.priceGold,
              levelRoadLevel: spec.levelRoadLevel,
            }
          : null;
      }
      case 'driftSmoke': {
        const spec = DRIFT_SMOKES.find((d) => d.id === itemId);
        return spec
          ? {
              set: this.unlockedDriftSmokes as unknown as Set<string>,
              priceGold: spec.priceGold,
              levelRoadLevel: spec.levelRoadLevel,
            }
          : null;
      }
      case 'roofHat': {
        const spec = ROOF_HATS.find((h) => h.id === itemId);
        return spec
          ? {
              set: this.unlockedRoofHats as unknown as Set<string>,
              priceGold: spec.priceGold,
              levelRoadLevel: spec.levelRoadLevel,
            }
          : null;
      }
      case 'steeringWheel': {
        const spec = STEERING_WHEELS.find((w) => w.id === itemId);
        return spec
          ? {
              set: this.unlockedSteeringWheels as unknown as Set<string>,
              priceGold: spec.priceGold,
              levelRoadLevel: spec.levelRoadLevel,
            }
          : null;
      }
      case 'mirrorCharm': {
        const spec = MIRROR_CHARMS.find((m) => m.id === itemId);
        return spec
          ? {
              set: this.unlockedMirrorCharms as unknown as Set<string>,
              priceGold: spec.priceGold,
              levelRoadLevel: spec.levelRoadLevel,
            }
          : null;
      }
    }
  }

  public equipVisualItem(
    carId: CarModelId,
    category: VisualCategory,
    itemId: string,
  ): boolean {
    const info = this.getVisualUnlockSetAndPrice(category, itemId);
    if (!info || !info.set.has(itemId)) return false;
    this.carCustom[carId] = {
      ...this.carCustom[carId],
      [category]: itemId,
    };
    if (carId === this.carModelId) {
      this.previewCustomOverride = null;
      this.playerCar.setCustomConfig(this.carCustom[carId]);
      this.syncActiveEffectColors(this.carCustom[carId]);
    }
    this.saveProgression();
    this.notifyProgression();
    return true;
  }

  public unlockVisualItem(
    category: VisualCategory,
    itemId: string,
    equipToCarId?: CarModelId,
  ): boolean {
    const info = this.getVisualUnlockSetAndPrice(category, itemId);
    if (!info) return false;
    if (info.set.has(itemId)) {
      return equipToCarId
        ? this.equipVisualItem(equipToCarId, category, itemId)
        : true;
    }
    if (info.levelRoadLevel) {
      return false;
    }
    if (this.totalGold < info.priceGold) return false;
    this.audio.init();
    this.totalGold -= info.priceGold;
    info.set.add(itemId);
    const targetCar = equipToCarId ?? this.carModelId;
    this.carCustom[targetCar] = {
      ...this.carCustom[targetCar],
      [category]: itemId,
    };
    if (targetCar === this.carModelId) {
      this.previewCustomOverride = null;
      this.playerCar.setCustomConfig(this.carCustom[targetCar]);
      this.syncActiveEffectColors(this.carCustom[targetCar]);
    }
    this.saveProgression();
    this.audio.playCarUnlock();
    this.notifyProgression();
    this.pushHud(true);
    return true;
  }

  public setCarBodyKit(carId: CarModelId, kitId: BodyKitId): boolean {
    if (!this.unlockedBodyKits.has(kitId)) return false;
    this.carCustom[carId] = { ...this.carCustom[carId], bodyKit: kitId };
    if (carId === this.carModelId) {
      this.playerCar.setCustomConfig(this.carCustom[carId]);
    }
    this.saveProgression();
    this.notifyProgression();
    return true;
  }

  public unlockBodyKit(kitId: BodyKitId, equipToCarId?: CarModelId): boolean {
    const spec = BODY_KITS.find((k) => k.id === kitId);
    if (!spec) return false;
    if (this.unlockedBodyKits.has(kitId)) {
      return equipToCarId ? this.setCarBodyKit(equipToCarId, kitId) : true;
    }
    if (this.totalGold < spec.priceGold) return false;
    this.audio.init();
    this.totalGold -= spec.priceGold;
    this.unlockedBodyKits.add(kitId);
    const targetCar = equipToCarId ?? this.carModelId;
    this.carCustom[targetCar] = { ...this.carCustom[targetCar], bodyKit: kitId };
    if (targetCar === this.carModelId) {
      this.playerCar.setCustomConfig(this.carCustom[targetCar]);
    }
    this.saveProgression();
    this.audio.playCarUnlock();
    this.notifyProgression();
    this.pushHud(true);
    return true;
  }

  public setCarSpoiler(carId: CarModelId, spoilerId: SpoilerId): boolean {
    if (!this.unlockedSpoilers.has(spoilerId)) return false;
    this.carCustom[carId] = { ...this.carCustom[carId], spoiler: spoilerId };
    if (carId === this.carModelId) {
      this.playerCar.setCustomConfig(this.carCustom[carId]);
    }
    this.saveProgression();
    this.notifyProgression();
    return true;
  }

  public unlockSpoiler(
    spoilerId: SpoilerId,
    equipToCarId?: CarModelId,
  ): boolean {
    const spec = SPOILERS.find((s) => s.id === spoilerId);
    if (!spec) return false;
    if (this.unlockedSpoilers.has(spoilerId)) {
      return equipToCarId ? this.setCarSpoiler(equipToCarId, spoilerId) : true;
    }
    if (this.totalGold < spec.priceGold) return false;
    this.audio.init();
    this.totalGold -= spec.priceGold;
    this.unlockedSpoilers.add(spoilerId);
    const targetCar = equipToCarId ?? this.carModelId;
    this.carCustom[targetCar] = {
      ...this.carCustom[targetCar],
      spoiler: spoilerId,
    };
    if (targetCar === this.carModelId) {
      this.playerCar.setCustomConfig(this.carCustom[targetCar]);
    }
    this.saveProgression();
    this.audio.playCarUnlock();
    this.notifyProgression();
    this.pushHud(true);
    return true;
  }

  public setCarLivery(carId: CarModelId, liveryId: LiveryId): boolean {
    if (!this.unlockedLiveries.has(liveryId)) return false;
    this.carCustom[carId] = { ...this.carCustom[carId], livery: liveryId };
    if (carId === this.carModelId) {
      this.playerCar.setCustomConfig(this.carCustom[carId]);
    }
    this.saveProgression();
    this.notifyProgression();
    return true;
  }

  public unlockLivery(liveryId: LiveryId, equipToCarId?: CarModelId): boolean {
    const spec = LIVERIES.find((l) => l.id === liveryId);
    if (!spec) return false;
    if (this.unlockedLiveries.has(liveryId)) {
      return equipToCarId ? this.setCarLivery(equipToCarId, liveryId) : true;
    }
    if (this.totalGold < spec.priceGold) return false;
    this.audio.init();
    this.totalGold -= spec.priceGold;
    this.unlockedLiveries.add(liveryId);
    const targetCar = equipToCarId ?? this.carModelId;
    this.carCustom[targetCar] = {
      ...this.carCustom[targetCar],
      livery: liveryId,
    };
    if (targetCar === this.carModelId) {
      this.playerCar.setCustomConfig(this.carCustom[targetCar]);
    }
    this.saveProgression();
    this.audio.playCarUnlock();
    this.notifyProgression();
    this.pushHud(true);
    return true;
  }

  public unlockCar(id: CarModelId): boolean {
    const spec = CAR_MODELS.find((m) => m.id === id);
    if (!spec) return false;
    if (this.unlockedCars.has(id)) {
      this.setCarModel(id);
      return true;
    }
    if (this.totalGold < spec.priceGold) {
      return false;
    }

    this.audio.init();
    this.totalGold -= spec.priceGold;
    this.unlockedCars.add(id);
    this.equippedCarModel = id;
    this.saveProgression();
    this.setCarModel(id);
    this.audio.playCarUnlock();
    this.handleMissionRewards(
      this.missions.recordPeak('carsUnlocked', this.unlockedCars.size),
    );
    this.notifyProgression();
    this.pushHud(true);
    return true;
  }

  public grantRewardGold(amount: number, label = 'Ödül Altın'): number {
    const safe = Math.max(0, Math.floor(amount));
    if (safe <= 0) return this.totalGold;
    this.audio.init();
    this.totalGold += safe;
    this.saveProgression();
    this.audio.playUpgrade();
    this.notifyProgression();
    this.emitCallout(label, `+${safe} Altın`, 'amber');
    this.pushHud(true);
    return this.totalGold;
  }

  public grantRewardXp(amount: number): void {
    const safe = Math.max(0, Math.floor(amount));
    if (safe <= 0) return;
    this.audio.init();
    const prevLevel = this.getLivePlayerLevel().level;
    this.lifetimeXp += safe;
    this.saveProgression();
    this.audio.playUpgrade();
    const nextInfo = this.getLivePlayerLevel();
    this.lastKnownLevel = Math.max(this.lastKnownLevel, nextInfo.level);
    this.handleMissionRewards(
      this.missions.recordPeak('playerLevel', nextInfo.level),
    );
    this.notifyProgression();
    this.emitCallout('Bonus XP!', `+${safe} Puan`, 'cyan');
    if (nextInfo.level > prevLevel) {
      this.callbacks.onLevelUp?.({
        fromLevel: prevLevel,
        toLevel: nextInfo.level,
        rankTitle: nextInfo.rankTitle,
        totalXp: nextInfo.totalXp,
      });
    }
    this.pushHud(true);
  }

  public claimLevelRoadReward(level: number): {
    ok: boolean;
    reward: LevelRoadReward | null;
    goldAdded: number;
    crateTierId?: CrateTierId;
  } {
    const safeLevel = Math.floor(level);
    const reward = getLevelRoadReward(safeLevel);
    if (!reward) {
      return { ok: false, reward: null, goldAdded: 0 };
    }
    const currentLevel = this.getLivePlayerLevel().level;
    if (currentLevel < safeLevel || this.claimedLevelRewards.has(safeLevel)) {
      return { ok: false, reward, goldAdded: 0 };
    }

    this.audio.init();
    this.claimedLevelRewards.add(safeLevel);
    let goldAdded = 0;
    let crateTierId: CrateTierId | undefined;

    if (reward.kind === 'gold' && reward.goldAmount) {
      this.totalGold += reward.goldAmount;
      goldAdded += reward.goldAmount;
    } else if (reward.kind === 'powerup_unlock') {
      if (reward.bonusGold && reward.bonusGold > 0) {
        this.totalGold += reward.bonusGold;
        goldAdded += reward.bonusGold;
      }
    } else if (reward.kind === 'car_color' && reward.carColorId) {
      this.unlockedCarColors.add(reward.carColorId);
      if (reward.bonusGold && reward.bonusGold > 0) {
        this.totalGold += reward.bonusGold;
        goldAdded += reward.bonusGold;
      }
    } else if (
      reward.kind === 'visual' &&
      reward.visualCategory &&
      reward.visualItemId
    ) {
      const info = this.getVisualUnlockSetAndPrice(
        reward.visualCategory,
        reward.visualItemId,
      );
      if (info) {
        info.set.add(reward.visualItemId);
      }
      if (reward.bonusGold && reward.bonusGold > 0) {
        this.totalGold += reward.bonusGold;
        goldAdded += reward.bonusGold;
      }
    } else if (reward.kind === 'crate' && reward.crateTierId) {
      crateTierId = reward.crateTierId;
    }

    this.saveProgression();
    this.notifyProgression();
    this.pushHud(true);
    return { ok: true, reward, goldAdded, crateTierId };
  }

  public claimAllLevelRoadRewards(): {
    claimedCount: number;
    totalGoldAdded: number;
    unlockedCosmetics: string[];
    pendingCrates: CrateTierId[];
  } {
    const currentLevel = Math.min(
      MAX_LEVEL_ROAD_LEVEL,
      this.getLivePlayerLevel().level,
    );
    let claimedCount = 0;
    let totalGoldAdded = 0;
    const unlockedCosmetics: string[] = [];
    const pendingCrates: CrateTierId[] = [];

    for (let lv = 1; lv <= currentLevel; lv++) {
      if (this.claimedLevelRewards.has(lv)) continue;
      const res = this.claimLevelRoadReward(lv);
      if (!res.ok || !res.reward) continue;
      claimedCount++;
      totalGoldAdded += res.goldAdded;
      if (res.crateTierId) {
        pendingCrates.push(res.crateTierId);
      } else if (
        res.reward.kind === 'car_color' ||
        res.reward.kind === 'visual' ||
        res.reward.kind === 'powerup_unlock'
      ) {
        unlockedCosmetics.push(res.reward.title);
      }
    }

    return {
      claimedCount,
      totalGoldAdded,
      unlockedCosmetics,
      pendingCrates,
    };
  }

  public grantCarUnlocked(
    id: CarModelId,
    equip = false,
  ): { newlyUnlocked: boolean; duplicateGold: number } {
    const spec = CAR_MODELS.find((m) => m.id === id);
    if (!spec) return { newlyUnlocked: false, duplicateGold: 0 };
    this.audio.init();
    if (this.unlockedCars.has(id)) {
      const comp = Math.max(300, Math.round(spec.priceGold * 0.6));
      this.totalGold += comp;
      this.saveProgression();
      this.audio.playUpgrade();
      this.notifyProgression();
      this.pushHud(true);
      return { newlyUnlocked: false, duplicateGold: comp };
    }
    this.unlockedCars.add(id);
    if (equip) {
      this.equippedCarModel = id;
      this.setCarModel(id);
    }
    this.saveProgression();
    this.audio.playCarUnlock();
    this.handleMissionRewards(
      this.missions.recordPeak('carsUnlocked', this.unlockedCars.size),
    );
    this.notifyProgression();
    this.pushHud(true);
    return { newlyUnlocked: true, duplicateGold: 0 };
  }

  public grantWheelStyleUnlocked(
    styleId: WheelStyleId,
  ): { newlyUnlocked: boolean; duplicateGold: number } {
    const spec = WHEEL_STYLES.find((w) => w.id === styleId);
    if (!spec) return { newlyUnlocked: false, duplicateGold: 0 };
    this.audio.init();
    if (this.unlockedWheelStyles.has(styleId)) {
      const comp = Math.max(150, Math.round(spec.priceGold * 0.6));
      this.totalGold += comp;
      this.saveProgression();
      this.notifyProgression();
      this.pushHud(true);
      return { newlyUnlocked: false, duplicateGold: comp };
    }
    this.unlockedWheelStyles.add(styleId);
    this.saveProgression();
    this.audio.playUpgrade();
    this.notifyProgression();
    this.pushHud(true);
    return { newlyUnlocked: true, duplicateGold: 0 };
  }

  public grantBodyKitUnlocked(
    kitId: BodyKitId,
  ): { newlyUnlocked: boolean; duplicateGold: number } {
    const spec = BODY_KITS.find((k) => k.id === kitId);
    if (!spec) return { newlyUnlocked: false, duplicateGold: 0 };
    this.audio.init();
    if (this.unlockedBodyKits.has(kitId)) {
      const comp = Math.max(150, Math.round(spec.priceGold * 0.6));
      this.totalGold += comp;
      this.saveProgression();
      this.notifyProgression();
      this.pushHud(true);
      return { newlyUnlocked: false, duplicateGold: comp };
    }
    this.unlockedBodyKits.add(kitId);
    this.saveProgression();
    this.audio.playUpgrade();
    this.notifyProgression();
    this.pushHud(true);
    return { newlyUnlocked: true, duplicateGold: 0 };
  }

  public grantSpoilerUnlocked(
    spoilerId: SpoilerId,
  ): { newlyUnlocked: boolean; duplicateGold: number } {
    const spec = SPOILERS.find((s) => s.id === spoilerId);
    if (!spec) return { newlyUnlocked: false, duplicateGold: 0 };
    this.audio.init();
    if (this.unlockedSpoilers.has(spoilerId)) {
      const comp = Math.max(120, Math.round(spec.priceGold * 0.6));
      this.totalGold += comp;
      this.saveProgression();
      this.notifyProgression();
      this.pushHud(true);
      return { newlyUnlocked: false, duplicateGold: comp };
    }
    this.unlockedSpoilers.add(spoilerId);
    this.saveProgression();
    this.audio.playUpgrade();
    this.notifyProgression();
    this.pushHud(true);
    return { newlyUnlocked: true, duplicateGold: 0 };
  }

  public grantLiveryUnlocked(
    liveryId: LiveryId,
  ): { newlyUnlocked: boolean; duplicateGold: number } {
    const spec = LIVERIES.find((l) => l.id === liveryId);
    if (!spec) return { newlyUnlocked: false, duplicateGold: 0 };
    this.audio.init();
    if (this.unlockedLiveries.has(liveryId)) {
      const comp = Math.max(120, Math.round(spec.priceGold * 0.6));
      this.totalGold += comp;
      this.saveProgression();
      this.notifyProgression();
      this.pushHud(true);
      return { newlyUnlocked: false, duplicateGold: comp };
    }
    this.unlockedLiveries.add(liveryId);
    this.saveProgression();
    this.audio.playUpgrade();
    this.notifyProgression();
    this.pushHud(true);
    return { newlyUnlocked: true, duplicateGold: 0 };
  }

  public doubleLastRunGold(): number {
    const bonus = Math.max(0, Math.floor(this.runGold));
    if (bonus <= 0) return 0;
    this.audio.init();
    this.totalGold += bonus;
    this.runGold += bonus;
    this.saveProgression();
    this.audio.playUpgrade();
    this.notifyProgression();
    this.pushHud(true);
    return bonus;
  }

  public reviveFromCrash(): boolean {
    if (this.phase !== 'gameover') return false;
    this.audio.init();
    this.audio.setCarProfile(this.carModelId);
    this.audio.startMusicIfEnabled();
    this.audio.setRainActive(this.isRainAudioActiveNow());

    this.integrity = this.carSpec.maxIntegrity;
    this.guardrailHitCooldown = 0;
    this.damageRegenDelay = 0;
    this.nitro = Math.max(this.nitro, Math.round(this.getActiveNitroMax() * 0.45));
    this.reviveInvulnTimer = 2.6;
    this.carRelYaw = 0;
    this.driftSlip = 0;
    this.chassisRoll = 0;
    this.chassisPitch = 0;
    this.cameraShake = 0;
    this.playerLateral = THREE.MathUtils.clamp(
      this.playerLateral,
      -MAX_PLAYER_LATERAL * 0.65,
      MAX_PLAYER_LATERAL * 0.65,
    );
    this.targetLateral = this.playerLateral;
    this.speedMs = Math.max(24, this.speedMs * 0.68);
    while (this.damageSmokes.length > 0) {
      this.damageSmokePool.push(this.damageSmokes.pop()!);
    }
    this.damageSmokeMesh.count = 0;

    // Clear nearby traffic ahead and behind so the player resumes cleanly
    for (let i = this.traffic.length - 1; i >= 0; i--) {
      const tv = this.traffic[i];
      if (tv.s >= this.playerS - 35 && tv.s <= this.playerS + 105) {
        this.releaseTrafficRig(tv);
        this.traffic.splice(i, 1);
      }
    }

    // Reset mode failure pressure on revive
    this.gameOverReason = 'crash';
    if (this.gameMode === 'timeattack') {
      this.timeLeftSec = Math.max(this.timeLeftSec, 18);
    } else if (this.gameMode === 'bomb') {
      this.bombFuseTimer = 5.0;
      this.speedMs = Math.max(this.speedMs, (this.bombMinSpeedKmh + 22) / 3.6);
    }

    this.phase = 'playing';
    this.lastTime = performance.now();
    this.cockpit.root.visible = this.cameraMode === 'cockpit';
    this.playerCar.root.visible =
      this.cameraMode === 'chase' || this.cameraMode === 'cine';
    this.startResumeCountdown(1.95);
    this.syncPlayerAndCamera(0.016, true);
    this.emitCallout('DEVAM EDİYORUZ!', 'Kısa Koruma Kalkanı', 'emerald');
    this.callbacks.onPhaseChange('playing');
    this.callbacks.onMusicChange?.(this.audio.getMusicState());
    this.pushHud(true);
    return true;
  }

  public getGameMode(): GameModeId {
    return this.gameMode;
  }

  public setGameMode(mode: GameModeId): void {
    if (!GAME_MODES.some((m) => m.id === mode)) return;
    this.gameMode = mode;
    try {
      localStorage.setItem(GAME_MODE_KEY, mode);
    } catch {
      // ignore storage errors
    }
    this.pushHud(true);
  }

  private getActiveModeMultiplier(): number {
    const spec = GAME_MODES.find((m) => m.id === this.gameMode);
    return spec ? spec.rewardMultiplier : 1.0;
  }

  private saveProgression(): void {
    try {
      localStorage.setItem(TOTAL_GOLD_KEY, String(this.totalGold));
      localStorage.setItem(PLAYER_XP_KEY, String(this.lifetimeXp));
      localStorage.setItem(
        UNLOCKED_CARS_KEY,
        JSON.stringify(Array.from(this.unlockedCars)),
      );
      localStorage.setItem(EQUIPPED_CAR_KEY, this.equippedCarModel);
      localStorage.setItem(
        CAR_UPGRADES_KEY,
        JSON.stringify(this.carUpgrades),
      );
      localStorage.setItem(
        UNLOCKED_WHEELS_KEY,
        JSON.stringify(Array.from(this.unlockedWheelStyles)),
      );
      localStorage.setItem(CAR_WHEELS_KEY, JSON.stringify(this.carWheels));
      localStorage.setItem(
        UNLOCKED_KITS_KEY,
        JSON.stringify(Array.from(this.unlockedBodyKits)),
      );
      localStorage.setItem(
        UNLOCKED_SPOILERS_KEY,
        JSON.stringify(Array.from(this.unlockedSpoilers)),
      );
      localStorage.setItem(
        UNLOCKED_LIVERIES_KEY,
        JSON.stringify(Array.from(this.unlockedLiveries)),
      );
      localStorage.setItem(CAR_CUSTOM_KEY, JSON.stringify(this.carCustom));
      localStorage.setItem(
        VISUAL_UNLOCKS_KEY,
        JSON.stringify(this.getVisualUnlocksSnapshot()),
      );
      localStorage.setItem(
        POWERUP_UPGRADES_KEY,
        JSON.stringify(this.powerUpUpgrades),
      );
      localStorage.setItem(
        CLAIMED_LEVEL_REWARDS_KEY,
        JSON.stringify(Array.from(this.claimedLevelRewards)),
      );
      localStorage.setItem(
        UNLOCKED_COLORS_KEY,
        JSON.stringify(Array.from(this.unlockedCarColors)),
      );
    } catch {
      // ignore storage failure
    }
    this.progressionDirty = false;
  }

  private markProgressionDirty(): void {
    this.progressionDirty = true;
    const now = performance.now();
    if (now - this.lastDeferredSaveMs >= 4000) {
      this.lastDeferredSaveMs = now;
      try {
        localStorage.setItem(TOTAL_GOLD_KEY, String(this.totalGold));
      } catch {
        // ignore storage failure
      }
    }
  }

  private flushDeferredSaves(notifyUi = false): void {
    this.missions.flushSave();
    if (this.progressionDirty) {
      this.saveProgression();
      if (notifyUi) {
        this.notifyProgression();
      }
    }
  }

  private notifyProgression(): void {
    const upgradesCopy = {} as Record<CarModelId, CarUpgrades>;
    const wheelsCopy = {} as Record<CarModelId, CarWheelConfig>;
    const customCopy = {} as Record<CarModelId, CarCustomConfig>;
    for (const m of CAR_MODELS) {
      upgradesCopy[m.id] = { ...this.carUpgrades[m.id] };
      wheelsCopy[m.id] = { ...this.carWheels[m.id] };
      customCopy[m.id] = { ...this.carCustom[m.id] };
    }
    this.callbacks.onProgressionChange?.(
      this.totalGold,
      Array.from(this.unlockedCars),
      this.equippedCarModel,
      upgradesCopy,
      this.getLivePlayerLevel(),
      Array.from(this.unlockedWheelStyles),
      wheelsCopy,
      Array.from(this.unlockedBodyKits),
      Array.from(this.unlockedSpoilers),
      Array.from(this.unlockedLiveries),
      customCopy,
      this.getVisualUnlocksSnapshot(),
      this.getPowerUpUpgradesCopy(),
      Array.from(this.claimedLevelRewards).sort((a, b) => a - b),
      Array.from(this.unlockedCarColors),
    );
  }

  public setCameraMode(mode: CameraMode): void {
    this.cameraMode = mode;
    const inDrive = this.phase === 'playing' || this.phase === 'paused';
    this.playerCar.root.visible = !inDrive || mode === 'chase' || mode === 'cine';
    this.cockpit.root.visible = inDrive && mode === 'cockpit';
    this.callbacks.onCameraModeChange?.(mode);
    if (
      this.activeCareerLevel &&
      this.phase === 'playing' &&
      mode !== 'cockpit' &&
      this.careerStayedInCockpit
    ) {
      const hasCockpitOnly = this.activeCareerLevel.missions.some(
        (m) => m.kind === 'cockpitOnly',
      );
      if (hasCockpitOnly) {
        this.careerStayedInCockpit = false;
        this.emitCallout('1. ŞAHIS BOZULDU!', 'Kokpit görevi kaybedildi', 'rose');
        return;
      }
    }
    if (this.phase === 'playing') {
      const label =
        CAMERA_MODES.find((c) => c.id === mode)?.label ?? 'Kamera';
      this.emitCallout('Kamera', label, 'cyan');
    }
  }

  public setAtmosphere(id: AtmosphereId): void {
    this.atmosphereId = id;
    this.applyAtmosphere(id);
  }

  private isRainAudioActiveNow(): boolean {
    const rainActive =
      this.atmosphereId === 'rainy' ||
      (this.atmosphereId === 'cycle' && this.weatherRainLevel > 0.28);
    return (
      rainActive &&
      this.phase !== 'garage' &&
      this.phase !== 'paused' &&
      this.currentRoadZone !== 'tunnel'
    );
  }

  private rollWeatherForBiome(
    biomeId: BiomeId,
    avoidSame: boolean,
  ): 'clear' | 'fog' | 'rain' | 'snow' | 'sandstorm' {
    let pool: Array<{
      kind: 'clear' | 'fog' | 'rain' | 'snow' | 'sandstorm';
      weight: number;
    }>;

    if (biomeId === 'arctic') {
      // Kış / Buzul biyomunda ağırlıklı kar yağışı ve buz sisi
      pool = [
        { kind: 'snow', weight: 64 },
        { kind: 'fog', weight: 22 },
        { kind: 'clear', weight: 14 },
      ];
    } else if (biomeId === 'desert') {
      // Çöl biyomunda kum fırtınası, açık sıcak hava veya çöl pusu
      pool = [
        { kind: 'sandstorm', weight: 44 },
        { kind: 'clear', weight: 40 },
        { kind: 'fog', weight: 16 },
      ];
    } else if (biomeId === 'volcanic') {
      // Volkanik kanyonda yoğun kül sisi, sıcak fırtına veya kızıl gökyüzü
      pool = [
        { kind: 'fog', weight: 40 },
        { kind: 'sandstorm', weight: 34 },
        { kind: 'clear', weight: 26 },
      ];
    } else {
      // Yeşil vadi biyomunda yağmur, yoğun sis ve açık hava dengeli
      pool = [
        { kind: 'clear', weight: 36 },
        { kind: 'rain', weight: 34 },
        { kind: 'fog', weight: 30 },
      ];
    }

    const filtered =
      avoidSame && pool.length > 1
        ? pool.filter((p) => p.kind !== this.dynamicWeather)
        : pool;
    const activePool = filtered.length > 0 ? filtered : pool;
    let total = 0;
    for (const p of activePool) total += p.weight;
    let roll = Math.random() * total;
    for (const p of activePool) {
      roll -= p.weight;
      if (roll <= 0) return p.kind;
    }
    return activePool[0].kind;
  }

  private announceWeatherShift(
    weather: 'clear' | 'fog' | 'rain' | 'snow' | 'sandstorm',
    biomeId: BiomeId,
  ): void {
    if (this.phase !== 'playing') return;
    if (weather === 'rain') {
      this.emitCallout('Hava Değişimi', 'Sağanak Yağmur', 'cyan');
    } else if (weather === 'snow') {
      this.emitCallout('Hava Değişimi', 'Kar Yağışı', 'cyan');
    } else if (weather === 'fog') {
      this.emitCallout(
        'Hava Değişimi',
        biomeId === 'arctic' ? 'Buz Sisi' : 'Yoğun Sis',
        'amber',
      );
    } else if (weather === 'sandstorm') {
      this.emitCallout(
        'Hava Değişimi',
        biomeId === 'volcanic' ? 'Kül Fırtınası' : 'Kum Fırtınası',
        'rose',
      );
    } else {
      this.emitCallout('Hava Değişimi', 'Açık Hava', 'emerald');
    }
  }

  private stepDynamicWeather(dt: number): void {
    const biome = sampleBiomeAtDistance(Math.max(0, this.playerS), _biomeSample);
    const biomeId = biome.primary.id;

    // React organically when entering a new biome (e.g., entering winter triggers snow)
    if (biomeId !== this.weatherLastBiomeId) {
      this.weatherLastBiomeId = biomeId;
      if (this.phase === 'playing') {
        const nextW = this.rollWeatherForBiome(biomeId, false);
        const changed = nextW !== this.dynamicWeather;
        this.dynamicWeather = nextW;
        this.weatherTimerSec = 22 + Math.random() * 16;
        if (changed && nextW !== 'clear') {
          this.announceWeatherShift(nextW, biomeId);
        }
      }
    }

    if (this.phase === 'playing') {
      this.weatherTimerSec -= dt;
      if (this.weatherTimerSec <= 0) {
        const nextW = this.rollWeatherForBiome(biomeId, true);
        this.dynamicWeather = nextW;
        this.weatherTimerSec = 22 + Math.random() * 16;
        this.announceWeatherShift(nextW, biomeId);
      }
    }

    // Smoothly damp intensities so weather shifts feel organic and seamless
    const targetRain =
      this.dynamicWeather === 'rain' && biomeId !== 'arctic' ? 1 : 0;
    const targetSnow =
      this.dynamicWeather === 'snow'
        ? 1
        : biome.snowAmount > 0.1
          ? biome.snowAmount * 0.45
          : 0;
    const targetSand =
      this.dynamicWeather === 'sandstorm'
        ? 1
        : biome.sandAmount > 0.1
          ? biome.sandAmount * 0.35
          : 0;
    const targetFog =
      this.dynamicWeather === 'fog'
        ? 1
        : this.dynamicWeather === 'rain'
          ? 0.34
          : this.dynamicWeather === 'snow'
            ? 0.28
            : 0;

    this.weatherRainLevel = THREE.MathUtils.damp(
      this.weatherRainLevel,
      targetRain,
      0.55,
      dt,
    );
    this.weatherSnowLevel = THREE.MathUtils.damp(
      this.weatherSnowLevel,
      targetSnow,
      0.55,
      dt,
    );
    this.weatherSandLevel = THREE.MathUtils.damp(
      this.weatherSandLevel,
      targetSand,
      0.55,
      dt,
    );
    this.weatherFogLevel = THREE.MathUtils.damp(
      this.weatherFogLevel,
      targetFog,
      0.48,
      dt,
    );

    const wetVal =
      this.currentRoadZone === 'tunnel'
        ? 0
        : this.atmosphereId === 'rainy'
          ? 1
          : this.weatherRainLevel;
    if (Math.abs(wetVal - this.lastRoadWetLevel) > 0.015) {
      this.lastRoadWetLevel = wetVal;
      this.road.setWetness(wetVal);
    }

    const rainAudioNow = this.isRainAudioActiveNow();
    if (rainAudioNow !== this.lastRainAudioState) {
      this.lastRainAudioState = rainAudioNow;
      this.audio.setRainActive(rainAudioNow);
    }
  }

  private getEffectiveRoadWetness(): number {
    if (this.currentRoadZone === 'tunnel') return 0;
    if (this.atmosphereId === 'rainy') return 1;
    if (this.atmosphereId === 'cycle') return this.weatherRainLevel;
    return 0;
  }

  private startResumeCountdown(durationSec = 1.95): void {
    this.resumeCountdownTimer = durationSec;
    this.lastResumeCountdownStep = 3;
    this.audio.playCountdownBeep(3);
    this.callbacks.onImpact?.(0.18);
  }

  private applyAtmosphere(id: AtmosphereId): void {
    const wetVal =
      id === 'rainy'
        ? 1
        : id === 'cycle'
          ? this.weatherRainLevel
          : 0;
    this.lastRoadWetLevel = wetVal;
    this.road.setWetness(wetVal);
    const audioRain = this.isRainAudioActiveNow();
    this.lastRainAudioState = audioRain;
    this.audio.setRainActive(audioRain);
    if (wetVal <= 0.05) {
      this.rainSplashMesh.count = 0;
    }

    if (id === 'cycle') {
      this.applyCycleAtmosphere(this.cycleTime);
      return;
    }

    this.applyPresetAtmosphereWithBiome(id);
  }

  private getAtmosphereBiomeBlendScale(id: AtmosphereId): number {
    if (this.phase === 'garage') return 0;
    switch (id) {
      case 'night':
        return 0.34;
      case 'rainy':
        return 0.42;
      case 'mist':
        return 0.56;
      case 'golden':
      case 'cycle':
      default:
        return 0.72;
    }
  }

  private blendBiomeIntoEnvironment(
    id: AtmosphereId,
    baseFogDensity: number,
  ): void {
    if (this.phase === 'garage') return;
    const biome = sampleBiomeAtDistance(Math.max(0, this.playerS), _biomeSample);
    const strength =
      biome.atmosphereTintStrength * this.getAtmosphereBiomeBlendScale(id);
    if (strength <= 0.001 && biome.fogDensityBoost <= 0.00001) {
      return;
    }

    const isDarkMode = id === 'night' || id === 'rainy';
    const skyScale = id === 'night' ? 0.36 : id === 'rainy' ? 0.52 : 1.0;

    if (strength > 0.001) {
      _biomeTintMix.copy(biome.skyTopTint).multiplyScalar(skyScale);
      this.skyUniforms.uTopColor.value.lerp(_biomeTintMix, strength);

      _biomeTintMix.copy(biome.skyHorizonTint).multiplyScalar(skyScale);
      this.skyUniforms.uHorizonColor.value.lerp(_biomeTintMix, strength);

      _biomeTintMix.copy(biome.fogTint).multiplyScalar(skyScale);
      if (this.scene.fog instanceof THREE.FogExp2) {
        this.scene.fog.color.lerp(_biomeTintMix, strength);
      }
      if (this.scene.background instanceof THREE.Color) {
        this.scene.background.lerp(_biomeTintMix, strength);
      }

      if (!isDarkMode) {
        this.sunLight.color.lerp(biome.sunTint, strength * 0.65);
        const sunMat = this.sunDisc.material as THREE.MeshBasicMaterial;
        sunMat.color.lerp(biome.sunTint, strength * 0.65);
      }

      _biomeTintMix
        .copy(biome.hemiSkyTint)
        .multiplyScalar(id === 'night' ? 0.42 : 1.0);
      this.hemiLight.color.lerp(_biomeTintMix, strength * 0.75);

      _biomeTintMix
        .copy(biome.hemiGroundTint)
        .multiplyScalar(id === 'night' ? 0.38 : 1.0);
      this.hemiLight.groundColor.lerp(_biomeTintMix, strength * 0.85);
    }

    if (this.scene.fog instanceof THREE.FogExp2) {
      const boostScale = id === 'mist' ? 1.45 : id === 'night' ? 0.65 : 1.0;
      this.scene.fog.density =
        baseFogDensity + biome.fogDensityBoost * boostScale;
    }
  }

  private applyPresetAtmosphereWithBiome(id: AtmosphereId): void {
    const preset = ATMOSPHERES.find((a) => a.id === id) || ATMOSPHERES[0];
    this.skyUniforms.uTopColor.value.set(preset.skyTop);
    this.skyUniforms.uHorizonColor.value.set(preset.skyHorizon);

    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.setHex(preset.fogColor);
      this.scene.fog.density = preset.fogDensity;
    } else {
      this.scene.fog = new THREE.FogExp2(preset.fogColor, preset.fogDensity);
    }
    if (this.scene.background instanceof THREE.Color) {
      this.scene.background.setHex(preset.fogColor);
    } else {
      this.scene.background = new THREE.Color(preset.fogColor);
    }

    this.sunLight.color.setHex(preset.sunColor);
    this.sunLight.intensity = preset.sunIntensity;
    this.hemiLight.color.setHex(preset.hemiSky);
    this.hemiLight.groundColor.setHex(preset.hemiGround);
    this.hemiLight.intensity = preset.hemiIntensity;
    this.renderer.toneMappingExposure = preset.exposure;

    const sunMat = this.sunDisc.material as THREE.MeshBasicMaterial;
    sunMat.color.setHex(preset.sunColor);
    this.cycleSunY = 95;
    this.sunDisc.visible = id === 'golden';

    this.blendBiomeIntoEnvironment(id, preset.fogDensity);

    const spotPower =
      id === 'night'
        ? this.isMobileDevice
          ? 52
          : 72
        : id === 'rainy'
          ? this.isMobileDevice
            ? 38
            : 54
          : this.isMobileDevice
            ? 0
            : id === 'golden'
              ? 28
              : id === 'mist'
                ? 22
                : 0;
    this.playerCar.headLightSpots[0].intensity = spotPower;
    this.playerCar.headLightSpots[1].intensity = spotPower;
    this.playerCar.headLightMaterial.emissiveIntensity = preset.headlightsOn
      ? 2.8
      : 0.45;
    const glowScale =
      id === 'night'
        ? 1.0
        : id === 'rainy'
          ? 0.9
          : id === 'golden'
            ? 0.72
            : id === 'mist'
              ? 0.65
              : 0.16;
    this.playerCar.setHeadlightGlowScale(glowScale);
    this.road.setLampsActive(preset.lampsOn);
    this.lastAppliedAtmId = id;
    this.lastAppliedAtmDist = this.distanceMeters;
  }

  private applyCycleAtmosphere(t: number): void {
    const normT = ((t % 1) + 1) % 1;
    let a = CYCLE_KEYFRAMES[0];
    let b = CYCLE_KEYFRAMES[CYCLE_KEYFRAMES.length - 1];
    for (let i = 0; i < CYCLE_KEYFRAMES.length - 1; i++) {
      if (normT >= CYCLE_KEYFRAMES[i].t && normT <= CYCLE_KEYFRAMES[i + 1].t) {
        a = CYCLE_KEYFRAMES[i];
        b = CYCLE_KEYFRAMES[i + 1];
        break;
      }
    }
    const span = Math.max(0.0001, b.t - a.t);
    const alpha = THREE.MathUtils.smoothstep((normT - a.t) / span, 0, 1);

    _colorA.setHex(a.skyTop);
    _colorB.setHex(b.skyTop);
    this.skyUniforms.uTopColor.value.copy(_colorA).lerp(_colorB, alpha);

    _colorA.setHex(a.skyHorizon);
    _colorB.setHex(b.skyHorizon);
    this.skyUniforms.uHorizonColor.value.copy(_colorA).lerp(_colorB, alpha);

    _colorA.setHex(a.fogColor);
    _colorB.setHex(b.fogColor);
    _colorMix.copy(_colorA).lerp(_colorB, alpha);
    const fogDensity = THREE.MathUtils.lerp(a.fogDensity, b.fogDensity, alpha);
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.copy(_colorMix);
      this.scene.fog.density = fogDensity;
    } else {
      this.scene.fog = new THREE.FogExp2(_colorMix.getHex(), fogDensity);
    }
    if (this.scene.background instanceof THREE.Color) {
      this.scene.background.copy(_colorMix);
    } else {
      this.scene.background = _colorMix.clone();
    }

    _colorA.setHex(a.sunColor);
    _colorB.setHex(b.sunColor);
    _colorMix.copy(_colorA).lerp(_colorB, alpha);
    this.sunLight.color.copy(_colorMix);
    this.sunLight.intensity = THREE.MathUtils.lerp(
      a.sunIntensity,
      b.sunIntensity,
      alpha,
    );

    _colorA.setHex(a.hemiSky);
    _colorB.setHex(b.hemiSky);
    this.hemiLight.color.copy(_colorA).lerp(_colorB, alpha);

    _colorA.setHex(a.hemiGround);
    _colorB.setHex(b.hemiGround);
    this.hemiLight.groundColor.copy(_colorA).lerp(_colorB, alpha);

    this.hemiLight.intensity = THREE.MathUtils.lerp(
      a.hemiIntensity,
      b.hemiIntensity,
      alpha,
    );
    this.renderer.toneMappingExposure = THREE.MathUtils.lerp(
      a.exposure,
      b.exposure,
      alpha,
    );

    this.cycleSunY = THREE.MathUtils.lerp(a.sunHeight, b.sunHeight, alpha);
    const sunMat = this.sunDisc.material as THREE.MeshBasicMaterial;
    sunMat.color.copy(_colorMix);
    this.sunDisc.visible = this.cycleSunY > -15;

    const lampFactor = THREE.MathUtils.lerp(a.lampFactor, b.lampFactor, alpha);
    const rainLvl = this.weatherRainLevel;
    const fogLvl = this.weatherFogLevel;
    const snowLvl = this.weatherSnowLevel;
    const sandLvl = this.weatherSandLevel;

    // Automatically illuminate headlights & highway lamps in dark, rain, or dense fog
    const effectiveLamp = Math.max(
      lampFactor,
      rainLvl * 0.86,
      fogLvl * 0.72,
      snowLvl * 0.42,
    );
    const spotPower = effectiveLamp * (this.isMobileDevice ? 54 : 72);
    this.playerCar.headLightSpots[0].intensity = spotPower;
    this.playerCar.headLightSpots[1].intensity = spotPower;
    this.playerCar.headLightMaterial.emissiveIntensity = THREE.MathUtils.lerp(
      0.45,
      2.8,
      effectiveLamp,
    );
    this.playerCar.setHeadlightGlowScale(
      THREE.MathUtils.lerp(0.16, 1.0, effectiveLamp),
    );
    this.road.setLampIntensity(effectiveLamp);

    // Modulate cycle sky/fog/bounce harmoniously with the current driving biome
    const biome = sampleBiomeAtDistance(Math.max(0, this.playerS), _biomeSample);
    const daylightScale = THREE.MathUtils.lerp(1.0, 0.32, lampFactor);
    const strength = biome.atmosphereTintStrength * 0.72;
    if (strength > 0.001) {
      _biomeTintMix.copy(biome.skyTopTint).multiplyScalar(daylightScale);
      this.skyUniforms.uTopColor.value.lerp(_biomeTintMix, strength);

      _biomeTintMix.copy(biome.skyHorizonTint).multiplyScalar(daylightScale);
      this.skyUniforms.uHorizonColor.value.lerp(_biomeTintMix, strength);

      _biomeTintMix.copy(biome.fogTint).multiplyScalar(daylightScale);
      if (this.scene.fog instanceof THREE.FogExp2) {
        this.scene.fog.color.lerp(_biomeTintMix, strength);
      }
      if (this.scene.background instanceof THREE.Color) {
        this.scene.background.lerp(_biomeTintMix, strength);
      }

      if (lampFactor < 0.6) {
        this.sunLight.color.lerp(biome.sunTint, strength * 0.6);
        sunMat.color.lerp(biome.sunTint, strength * 0.6);
      }

      _biomeTintMix
        .copy(biome.hemiSkyTint)
        .multiplyScalar(THREE.MathUtils.lerp(1.0, 0.45, lampFactor));
      this.hemiLight.color.lerp(_biomeTintMix, strength * 0.72);

      _biomeTintMix
        .copy(biome.hemiGroundTint)
        .multiplyScalar(THREE.MathUtils.lerp(1.0, 0.42, lampFactor));
      this.hemiLight.groundColor.lerp(_biomeTintMix, strength * 0.85);
    }

    // Blend live dynamic weather (Rainstorm overcast, Dense Fog, Snow mist, Sand haze)
    if (rainLvl > 0.01) {
      const stormScale = THREE.MathUtils.lerp(1.0, 0.44, lampFactor);
      _biomeTintMix.setHex(0x162438).multiplyScalar(stormScale);
      this.skyUniforms.uTopColor.value.lerp(_biomeTintMix, rainLvl * 0.76);

      _biomeTintMix.setHex(0x3a4f66).multiplyScalar(stormScale);
      this.skyUniforms.uHorizonColor.value.lerp(_biomeTintMix, rainLvl * 0.74);
      if (this.scene.fog instanceof THREE.FogExp2) {
        this.scene.fog.color.lerp(_biomeTintMix, rainLvl * 0.72);
      }
      if (this.scene.background instanceof THREE.Color) {
        this.scene.background.lerp(_biomeTintMix, rainLvl * 0.72);
      }
      this.sunLight.intensity *= 1 - rainLvl * 0.64;
      this.hemiLight.intensity *= 1 - rainLvl * 0.24;
      if (rainLvl > 0.45) {
        this.sunDisc.visible = false;
      }
    }

    if (fogLvl > 0.01) {
      const mistScale = THREE.MathUtils.lerp(1.0, 0.34, lampFactor);
      _biomeTintMix.setHex(0x9fb2c4).multiplyScalar(mistScale);
      this.skyUniforms.uTopColor.value.lerp(_biomeTintMix, fogLvl * 0.52);

      _biomeTintMix.setHex(0xc4d0dc).multiplyScalar(mistScale);
      this.skyUniforms.uHorizonColor.value.lerp(_biomeTintMix, fogLvl * 0.74);
      if (this.scene.fog instanceof THREE.FogExp2) {
        this.scene.fog.color.lerp(_biomeTintMix, fogLvl * 0.78);
      }
      if (this.scene.background instanceof THREE.Color) {
        this.scene.background.lerp(_biomeTintMix, fogLvl * 0.78);
      }
      this.sunLight.intensity *= 1 - fogLvl * 0.38;
      if (fogLvl > 0.55) {
        this.sunDisc.visible = false;
      }
    }

    if (snowLvl > 0.01) {
      const snowScale = THREE.MathUtils.lerp(1.0, 0.4, lampFactor);
      _biomeTintMix.setHex(0xcbe2f6).multiplyScalar(snowScale);
      this.skyUniforms.uHorizonColor.value.lerp(_biomeTintMix, snowLvl * 0.45);
      if (this.scene.fog instanceof THREE.FogExp2) {
        this.scene.fog.color.lerp(_biomeTintMix, snowLvl * 0.45);
      }
    }

    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.density =
        fogDensity +
        biome.fogDensityBoost +
        fogLvl * 0.0062 +
        rainLvl * 0.0024 +
        snowLvl * 0.0018 +
        sandLvl * 0.002;
    }
  }

  public enterGarage(): void {
    this.commitRunXp();
    this.flushDeferredSaves(true);
    this.clearCareerModeIfActive();
    this.rentedCarModel = null;
    this.phase = 'garage';
    this.audio.updateEngine(0, 0, false);
    this.audio.pauseMusic();
    this.audio.setRainActive(false);
    this.road.group.visible = false;
    this.roadEvents.setVisible(false);
    this.trafficGroup.visible = false;
    this.recordMarkerGroup.visible = false;
    this.finishLineGroup.visible = false;
    for (const tv of this.traffic) {
      tv.rig.root.visible = false;
    }
    this.garageGroup.visible = true;
    this.sparksMesh.count = 0;
    this.smokeMesh.count = 0;
    this.damageSmokeMesh.count = 0;
    this.exhaustFlames = [];
    this.exhaustFlamesMesh.count = 0;
    this.streaksMesh.count = 0;
    this.rainMesh.count = 0;
    this.rainSplashMesh.count = 0;
    this.coinsMesh.count = 0;
    this.nitroMesh.count = 0;
    this.repairMesh.count = 0;
    this.magnetMesh.count = 0;
    this.rampageCoreMesh.count = 0;
    this.rampageRingMesh.count = 0;
    this.rampageAuraMesh.visible = false;
    this.debrisMesh.count = 0;
    this.explosionMesh.count = 0;

    this.cockpit.root.visible = false;
    this.cockpit.root.position.set(0, 0, 0);
    this.cockpit.root.quaternion.identity();
    this.cockpit.cabinOffset.position.set(0, 0, 0);
    this.cockpit.cabinOffset.rotation.set(0, 0, 0);
    this.playerCar.root.visible = true;
    this.playerCar.root.position.set(0, 0.01, 0);
    this.playerCar.root.quaternion.identity();
    this.playerCar.chassisGroup.rotation.set(0, 0, 0);
    this.playerCar.frontLeftPivot.rotation.y = 0.22;
    this.playerCar.frontRightPivot.rotation.y = 0.22;

    this.garageYaw = 0.68;
    this.garagePitch = 0.22;
    this.garageDragging = false;
    this.garageMenuCollapsed = false;
    this.garageFocus = 'overview';
    this.garageFocusTransitioning = false;
    this.garagePreviewEffect = 'none';
    this.previewCustomOverride = null;
    this.syncActiveEffectColors(this.carCustom[this.carModelId]);
    this.applyGarageShowroomHeadlights();
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    const aspect = width / Math.max(1, height);
    this.garageLookX = 0;
    this.garageLookY = 0.42;
    this.garageLookZ = 0;
    this.garageDist =
      aspect < 0.8
        ? Math.max(7.6, 4.1 / Math.max(0.46, aspect))
        : 6.2;
    this.garageViewOffsetX = 0;
    this.garageViewOffsetY = Math.min(height * 0.2, 150);
    this.applyGarageLighting();
    this.camera.setViewOffset(
      width,
      height,
      this.garageViewOffsetX,
      this.garageViewOffsetY,
      width,
      height,
    );
    this.callbacks.onPhaseChange('garage');
    this.callbacks.onMusicChange?.(this.audio.getMusicState());
    this.scheduleGarageAdjacentPrewarm();
  }

  private applyGarageShowroomHeadlights(): void {
    this.playerCar.headLightSpots[0].intensity = 28;
    this.playerCar.headLightSpots[1].intensity = 28;
    this.playerCar.headLightMaterial.emissiveIntensity = 2.8;
    this.playerCar.setHeadlightGlowScale(0.95);
  }

  public setGarageCameraFocus(focus: GarageCameraFocus): void {
    this.garageFocus = focus;
    this.garageFocusTransitioning = true;
  }

  public setGarageMenuCollapsed(collapsed: boolean): void {
    this.garageMenuCollapsed = collapsed;
  }

  private applyGarageLighting(): void {
    if (this.garageKeyLight) {
      this.garageKeyLight.intensity = this.garageBrightMode ? 52 : 24;
    }
    if (this.garageRimLight) {
      this.garageRimLight.intensity = this.garageBrightMode ? 34 : 18;
    }
    if (this.phase === 'garage') {
      this.sunLight.intensity = this.garageBrightMode ? 2.85 : 1.55;
      this.hemiLight.intensity = this.garageBrightMode ? 1.65 : 0.85;
    }
  }

  public setGarageBrightMode(bright: boolean): void {
    this.garageBrightMode = bright;
    this.applyGarageLighting();
  }

  public orbitGarageByDelta(dx: number, dy: number): void {
    if (this.phase !== 'garage') return;
    this.garageFocusTransitioning = false;
    this.garageYaw -= dx * 0.009;
    this.garagePitch = THREE.MathUtils.clamp(
      this.garagePitch + dy * 0.005,
      0.08,
      0.62,
    );
  }

  public setGarageDragging(dragging: boolean): void {
    this.garageDragging = dragging;
  }

  public getCareerSnapshot(): CareerProgressSnapshot {
    return this.careerManager.getSnapshot();
  }

  public getActiveCareerLevelId(): number | null {
    return this.activeCareerLevel ? this.activeCareerLevel.id : null;
  }

  public claimCareerStarChest(starsRequired: number): {
    ok: boolean;
    rewardGold: number;
    crateTierId?: CrateTierId;
    title: string;
  } {
    const res = this.careerManager.claimStarChest(starsRequired);
    if (res.ok) {
      if (res.rewardGold > 0) {
        this.totalGold += res.rewardGold;
        this.saveProgression();
        this.notifyProgression();
      }
      this.callbacks.onCareerProgressChange?.(this.careerManager.getSnapshot());
      if (!res.crateTierId) {
        this.audio.playAchievementUnlock();
      }
      this.pushHud(true);
    }
    return res;
  }

  private clearCareerModeIfActive(): void {
    if (!this.activeCareerLevel) return;
    this.activeCareerLevel = null;
    this.finishLineGroup.visible = false;
    setForcedBiome(null);
    if (this.savedPreCareerMode) {
      this.gameMode = this.savedPreCareerMode;
      this.savedPreCareerMode = null;
    }
    if (this.savedPreCareerAtmosphere) {
      this.atmosphereId = this.savedPreCareerAtmosphere;
      this.savedPreCareerAtmosphere = null;
    }
    if (this.savedPreCareerCameraMode) {
      this.cameraMode = this.savedPreCareerCameraMode;
      this.savedPreCareerCameraMode = null;
      this.callbacks.onCameraModeChange?.(this.cameraMode);
    }
  }

  public exitCareerMode(): void {
    this.clearCareerModeIfActive();
    this.applyAtmosphere(this.atmosphereId);
    this.pushHud(true);
  }

  public startCareerLevel(levelId: number, keepRental = false): boolean {
    if (!this.careerManager.isLevelUnlocked(levelId)) {
      return false;
    }
    const level = getCareerLevelById(levelId);
    if (!this.activeCareerLevel) {
      this.savedPreCareerMode = this.gameMode;
      this.savedPreCareerAtmosphere = this.atmosphereId;
    }
    this.activeCareerLevel = level;
    setForcedBiome(level.biome);
    this.gameMode = level.roadRule === 'twoway' ? 'twoway' : 'endless';
    this.atmosphereId = level.atmosphere;
    this.careerElapsedSec = 0;
    this.careerPeakSpeedKmh = 0;
    this.careerMaxCombo = 1;
    this.careerRoadEventsCount = 0;
    this.careerMission1Announced = false;
    this.careerMission2Announced = false;
    this.careerStayedInCockpit = true;
    this.careerCockpitNearMissCount = 0;
    this.careerUsedBrake = false;
    this.careerBrakeHoldSec = 0;
    this.careerUsedNitro = false;
    this.careerDroppedBelowMinSpeed = false;
    this.careerOncomingMeters = 0;
    this.careerHighSpeedSeconds = 0;

    const requiresCockpit = level.missions.some(
      (m) => m.kind === 'cockpitOnly' || m.kind === 'cockpitNearMiss',
    );
    if (requiresCockpit) {
      if (!this.savedPreCareerCameraMode) {
        this.savedPreCareerCameraMode = this.cameraMode;
      }
      this.cameraMode = 'cockpit';
      this.callbacks.onCameraModeChange?.('cockpit');
    } else if (this.savedPreCareerCameraMode) {
      this.cameraMode = this.savedPreCareerCameraMode;
      this.savedPreCareerCameraMode = null;
      this.callbacks.onCameraModeChange?.(this.cameraMode);
    }

    this.launchRunInternal(keepRental);
    this.playerCar.root.visible =
      this.cameraMode === 'chase' || this.cameraMode === 'cine';
    this.cockpit.root.visible = this.cameraMode === 'cockpit';
    if (requiresCockpit) {
      this.emitCallout('1. ŞAHIS ETABI', 'Kokpit açısı aktif', 'cyan');
    }
    return true;
  }

  public startGame(keepRental = false): void {
    this.clearCareerModeIfActive();
    this.gameMode = 'endless';
    this.launchRunInternal(keepRental);
  }

  private launchRunInternal(keepRental = false): void {
    this.commitRunXp();
    if (!keepRental) {
      this.rentedCarModel = null;
      if (!this.unlockedCars.has(this.carModelId)) {
        this.setCarModel(this.equippedCarModel);
      }
    }
    const equippedWheel = this.carWheels[this.carModelId];
    this.garagePreviewEffect = 'none';
    this.previewCustomOverride = null;
    this.playerCar.setWheelConfig(equippedWheel.style, equippedWheel.color);
    this.playerCar.setCustomConfig(this.carCustom[this.carModelId]);
    this.syncActiveEffectColors(this.carCustom[this.carModelId]);
    if (!this.activeCareerLevel) {
      // Unified living world: randomize starting time-of-day (Day / Sunset / Twilight / Night) & initial weather
      this.atmosphereId = 'cycle';
      this.cycleTime = Math.random();
      this.weatherLastBiomeId = 'alpine';
      const initRoll = Math.random();
      this.dynamicWeather =
        initRoll < 0.48 ? 'clear' : initRoll < 0.76 ? 'rain' : 'fog';
      this.weatherTimerSec = 18 + Math.random() * 14;
      this.weatherRainLevel = this.dynamicWeather === 'rain' ? 0.65 : 0;
      this.weatherFogLevel = this.dynamicWeather === 'fog' ? 0.65 : 0;
      this.weatherSnowLevel = 0;
      this.weatherSandLevel = 0;
    }
    this.applyAtmosphere(this.atmosphereId);
    this.audio.init();
    this.audio.setCarProfile(this.carModelId);
    this.audio.startMusicIfEnabled();
    this.audio.setRainActive(this.isRainAudioActiveNow());
    this.clearGarageCarCache();
    this.garageGroup.visible = false;
    this.cockpit.root.visible = false;
    this.cockpit.root.position.set(0, 0, 0);
    this.cockpit.root.quaternion.identity();
    this.cockpit.cabinOffset.position.set(0, 0, 0);
    this.cockpit.cabinOffset.rotation.set(0, 0, 0);
    this.playerCar.root.visible = true;
    this.garageViewOffsetX = 0;
    this.garageViewOffsetY = 0;
    this.camera.clearViewOffset();
    this.road.group.visible = true;
    this.roadEvents.setVisible(true);
    this.trafficGroup.visible = true;
    this.missions.startRun();
    this.callbacks.onMissionsChange?.(this.missions.getSnapshot());
    this.phase = 'playing';
    this.resetWorld();
    this.callbacks.onPhaseChange('playing');
    this.callbacks.onMusicChange?.(this.audio.getMusicState());
    this.pushHud(true);
  }

  public togglePause(): void {
    if (this.phase === 'playing') {
      this.phase = 'paused';
      this.resumeCountdownTimer = 0;
      this.lastResumeCountdownStep = 0;
      this.tiltSteerInput = 0;
      if (this.missionDistAccum >= 1) {
        this.missions.recordDelta('distance', Math.floor(this.missionDistAccum));
        this.missionDistAccum = 0;
      }
      this.flushDeferredSaves(true);
      this.audio.updateEngine(0, 0, false);
      this.audio.pauseMusic();
      this.audio.setRainActive(false);
      this.callbacks.onPhaseChange('paused');
      this.callbacks.onMusicChange?.(this.audio.getMusicState());
      this.pushHud(true);
    } else if (this.phase === 'paused') {
      this.audio.init();
      this.audio.startMusicIfEnabled();
      this.audio.setRainActive(this.isRainAudioActiveNow());
      this.phase = 'playing';
      this.lastTime = performance.now();
      this.startResumeCountdown(1.95);
      this.callbacks.onPhaseChange('playing');
      this.callbacks.onMusicChange?.(this.audio.getMusicState());
      this.pushHud(true);
    }
  }

  public returnToMenu(): void {
    this.commitRunXp();
    this.flushDeferredSaves(true);
    this.clearCareerModeIfActive();
    this.rentedCarModel = null;
    if (!this.unlockedCars.has(this.carModelId)) {
      this.setCarModel(this.equippedCarModel);
    }
    const equippedWheel = this.carWheels[this.carModelId];
    this.garagePreviewEffect = 'none';
    this.previewCustomOverride = null;
    this.playerCar.setWheelConfig(equippedWheel.style, equippedWheel.color);
    this.playerCar.setCustomConfig(this.carCustom[this.carModelId]);
    this.syncActiveEffectColors(this.carCustom[this.carModelId]);
    this.atmosphereId = 'cycle';
    this.dynamicWeather = 'clear';
    this.weatherRainLevel = 0;
    this.weatherFogLevel = 0;
    this.weatherSnowLevel = 0;
    this.weatherSandLevel = 0;
    this.applyAtmosphere(this.atmosphereId);
    this.clearGarageCarCache();
    this.garageGroup.visible = false;
    this.cockpit.root.visible = false;
    this.cockpit.root.position.set(0, 0, 0);
    this.cockpit.root.quaternion.identity();
    this.cockpit.cabinOffset.position.set(0, 0, 0);
    this.cockpit.cabinOffset.rotation.set(0, 0, 0);
    this.playerCar.root.visible = true;
    this.garageViewOffsetX = 0;
    this.garageViewOffsetY = 0;
    this.camera.clearViewOffset();
    this.road.group.visible = true;
    this.roadEvents.setVisible(true);
    this.trafficGroup.visible = true;
    this.phase = 'menu';
    this.resetWorld();
    this.audio.updateEngine(0, 0, false);
    this.audio.pauseMusic();
    this.audio.setRainActive(false);
    this.callbacks.onPhaseChange('menu');
    this.callbacks.onMusicChange?.(this.audio.getMusicState());
    this.pushHud(true);
  }

  public setNitroActive(active: boolean): void {
    if (this.phase !== 'playing') {
      this.nitroRequested = false;
      return;
    }
    if (active && !this.nitroRequested && this.nitro >= 14) {
      this.audio.playNitroIgnite();
    }
    this.nitroRequested = active;
  }

  public toggleNitro(): boolean {
    if (this.phase !== 'playing') {
      this.nitroRequested = false;
      this.nitroActive = false;
      return false;
    }
    if (this.nitroRequested || this.nitroActive) {
      this.nitroRequested = false;
      this.nitroActive = false;
      this.pushHud(true);
      return false;
    }
    if (this.nitro >= 5) {
      if (this.nitro >= 14) {
        this.audio.playNitroIgnite();
      }
      this.nitroRequested = true;
      this.nitroActive = true;
      this.emitCallout('NİTRO!', 'Turbo Aktif', 'cyan');
      this.pushHud(true);
      return true;
    }
    return false;
  }

  public steerByScreenDelta(deltaPx: number): void {
    if (this.phase !== 'playing') return;
    const refWidth = Math.min(window.innerWidth || 420, 520);
    const lateralShift = (deltaPx / refWidth) * (MAX_PLAYER_LATERAL * 2.5);
    this.targetLateral = THREE.MathUtils.clamp(
      this.targetLateral + lateralShift,
      -MAX_PLAYER_LATERAL,
      MAX_PLAYER_LATERAL,
    );

    // Feed a smooth visual steering-wheel intent that bridges 60Hz touch gaps on 120Hz displays
    const impulse = THREE.MathUtils.clamp((deltaPx / refWidth) * 14.5, -1, 1);
    if (Math.abs(impulse) > 0.01) {
      if (impulse * this.touchSteerImpulse < 0) {
        // Immediate response when counter-steering
        this.touchSteerImpulse = THREE.MathUtils.lerp(
          this.touchSteerImpulse,
          impulse,
          0.72,
        );
      } else {
        const blend =
          Math.abs(impulse) > Math.abs(this.touchSteerImpulse) ? 0.65 : 0.35;
        this.touchSteerImpulse = THREE.MathUtils.lerp(
          this.touchSteerImpulse,
          impulse,
          blend,
        );
      }
      this.touchSteerHoldTimer = 0.13;
    }
  }

  public setThrottleInput(value: number): void {
    this.throttleInput = THREE.MathUtils.clamp(value, -1, 1);
  }

  public setTiltSteerInput(normalized: number): void {
    this.tiltSteerInput = THREE.MathUtils.clamp(normalized, -1, 1);
  }

  public setKeyboardState(
    left: boolean,
    right: boolean,
    up: boolean,
    down: boolean,
  ): void {
    this.keyLeft = left;
    this.keyRight = right;
    this.keyUp = up;
    this.keyDown = down;
  }

  private resetWorld(): void {
    this.playerS = 0;
    this.playerLateral = 0;
    this.targetLateral = 0;
    this.lateralVel = 0;
    this.visualSteer = 0;
    this.touchSteerImpulse = 0;
    this.touchSteerHoldTimer = 0;
    this.playerHeight = 0;
    this.playerVelY = 0;
    this.slickTimer = 0;
    this.boostPadTimer = 0;
    this.currentRoadZone = 'open';
    this.upcomingEvent = null;
    this.speedMs = 26;
    this.throttleInput = 0;
    this.tiltSteerInput = 0;
    this.resumeCountdownTimer = 0;
    this.lastResumeCountdownStep = 0;
    this.weatherTimerSec = 14 + Math.random() * 8;
    this.carRelYaw = 0;
    this.driftSlip = 0;
    this.chassisRoll = 0;
    this.chassisPitch = 0;
    this.cameraRoll = 0;
    this.cameraShake = 0;
    this.camCurveSwing = 0;
    this.camLookLag = 0;

    this.score = 0;
    this.runStartBestScore = this.bestScore;
    this.runStartBestRecordDistance = this.bestRecordDistance;
    this.recordMarkerPassed = false;
    this.recordMarkerGroup.visible = false;
    this.runCommittedXp = 0;
    this.lastKnownLevel = computePlayerLevel(this.lifetimeXp).level;
    this.runGold = 0;
    this.distanceMeters = 0;
    this.nearMissCount = 0;
    this.cleanCurvesCount = 0;
    this.integrity = this.carSpec.maxIntegrity;
    this.nitro = Math.round(this.getActiveNitroMax() * 0.55);
    this.nitroActive = false;
    this.nitroRequested = false;
    this.combo = 1;
    this.comboTimer = 0;
    this.inSharpCurve = false;
    this.curveScraped = false;
    this.curveCleanTime = 0;
    this.drifting = false;
    this.driftScore = 0;
    this.driftMultiplier = 1;
    this.driftDuration = 0;
    this.driftGraceTimer = 0;
    this.totalDriftScore = 0;
    this.missionDriftAccum = 0;
    while (this.sparks.length > 0) this.sparkPool.push(this.sparks.pop()!);
    while (this.smokes.length > 0) this.smokePool.push(this.smokes.pop()!);
    while (this.damageSmokes.length > 0) {
      this.damageSmokePool.push(this.damageSmokes.pop()!);
    }
    while (this.exhaustFlames.length > 0) {
      this.exhaustFlamePool.push(this.exhaustFlames.pop()!);
    }
    this.exhaustFlameTimer = 0;
    this.prevExhaustGear = 1;
    this.coins = [];
    this.nitros = [];
    this.nitroPickupBoostTimer = 0;
    this.repairs = [];
    this.magnets = [];
    this.magnetTimer = 0;
    this.rampages = [];
    this.rampageTimer = 0;
    this.rampageCountdownStep = 0;
    while (this.debris.length > 0) this.debrisPool.push(this.debris.pop()!);
    while (this.explosions.length > 0) {
      this.explosionPool.push(this.explosions.pop()!);
    }
    this.missionDistAccum = 0;
    this.missionCockpitDistAccum = 0;
    this.noHitDistMeters = 0;
    this.noHitDistLastReported = 0;
    this.missionSpeedCheckAccum = 0;
    this.damageSmokeTimer = 0;
    this.guardrailHitCooldown = 0;
    this.damageRegenDelay = 0;
    this.reviveInvulnTimer = 0;

    // Reset Game Modes State
    this.gameOverReason = 'crash';
    this.inOncomingLane = false;
    this.timeLeftSec = 45;
    this.nextCheckpointMeters = 750;
    this.checkpointsCleared = 0;
    this.lowTimeBeepAccum = 0;
    this.bombMinSpeedKmh = 130;
    this.bombArmed = false;
    this.bombGraceTimer = 3.2;
    this.bombFuseTimer = 5.0;
    this.bombBeepAccum = 0;

    this.sparksMesh.count = 0;
    this.smokeMesh.count = 0;
    this.damageSmokeMesh.count = 0;
    this.exhaustFlamesMesh.count = 0;
    this.streaksMesh.count = 0;
    this.coinsMesh.count = 0;
    this.nitroMesh.count = 0;
    this.repairMesh.count = 0;
    this.magnetMesh.count = 0;
    this.rampageCoreMesh.count = 0;
    this.rampageRingMesh.count = 0;
    this.rampageAuraMesh.visible = false;
    this.debrisMesh.count = 0;
    this.explosionMesh.count = 0;
    const inDrive = this.phase === 'playing' || this.phase === 'paused';
    this.playerCar.root.visible =
      !inDrive || this.cameraMode === 'chase' || this.cameraMode === 'cine';
    this.cockpit.root.visible = inDrive && this.cameraMode === 'cockpit';

    for (const flame of this.playerCar.flameMeshes) {
      flame.visible = false;
    }

    for (const tv of this.traffic) {
      this.releaseTrafficRig(tv);
    }
    this.traffic = [];
    this.nextSpawnS = 85;
    this.nextCoinSpawnS = 44;
    this.nextNitroSpawnS = 125;
    this.nextRepairSpawnS = 175;
    this.nextMagnetSpawnS = 145;
    this.nextRampageSpawnS = 320 + Math.random() * 140;

    this.currentBiomeId = 'alpine';
    this.road.reset();
    this.roadEvents.reset();
    this.applyAtmosphere(this.atmosphereId);
    this.roadEvents.spawnAhead(360);
    this.spawnTrafficAhead(360);
    this.spawnCoinsAhead(360);
    this.spawnNitrosAhead(360);
    this.spawnRepairsAhead(360);
    this.spawnMagnetsAhead(360);
    this.spawnRampagesAhead(360);
    this.syncPlayerAndCamera(0.016, true);
    this.pushHud(true);
  }

  private handleMissionRewards(rewards: RewardEvent[]): void {
    if (rewards.length === 0) return;
    let bonusGold = 0;
    for (const r of rewards) {
      bonusGold += r.rewardGold;
    }
    this.audio.playAchievementUnlock();

    const first = rewards[0];
    this.emitCallout(
      first.kind === 'achievement'
        ? `Başarım: ${first.title}`
        : 'Görev Tamamlandı!',
      rewards.length > 1
        ? `${rewards.length} ödül hazır · +${bonusGold} Altın`
        : `Ödül Hazır · +${bonusGold} Altın`,
      'emerald',
    );
    this.callbacks.onMissionsChange?.(this.missions.getSnapshot());
  }

  private isPickupSlotFree(s: number, lat: number): boolean {
    if (
      this.traffic.some(
        (v) => Math.abs(v.s - s) < 9.5 && Math.abs(v.lateral - lat) < 1.8,
      )
    ) {
      return false;
    }
    if (
      this.coins.some(
        (c) => Math.abs(c.s - s) < 5.5 && Math.abs(c.lateral - lat) < 1.5,
      )
    ) {
      return false;
    }
    if (
      this.nitros.some(
        (n) => Math.abs(n.s - s) < 7.5 && Math.abs(n.lateral - lat) < 1.5,
      )
    ) {
      return false;
    }
    if (
      this.repairs.some(
        (r) => Math.abs(r.s - s) < 7.5 && Math.abs(r.lateral - lat) < 1.5,
      )
    ) {
      return false;
    }
    if (
      this.magnets.some(
        (m) => Math.abs(m.s - s) < 7.5 && Math.abs(m.lateral - lat) < 1.5,
      )
    ) {
      return false;
    }
    if (
      this.rampages.some(
        (rm) => Math.abs(rm.s - s) < 8.5 && Math.abs(rm.lateral - lat) < 1.6,
      )
    ) {
      return false;
    }
    return true;
  }

  private spawnCoinsAhead(maxS: number): void {
    while (this.nextCoinSpawnS < maxS) {
      const count = 3 + Math.floor(Math.random() * 3); // 3-5 coins in a row
      const startLane = LANE_CENTERS[Math.floor(Math.random() * LANE_CENTERS.length)];
      const targetLane =
        Math.random() < 0.45
          ? LANE_CENTERS[Math.floor(Math.random() * LANE_CENTERS.length)]
          : startLane;

      for (let i = 0; i < count; i++) {
        if (this.coins.length >= this.maxCoins) break;
        const cs = this.nextCoinSpawnS + i * 4.4;
        const t = count > 1 ? i / (count - 1) : 0;
        const lat = THREE.MathUtils.lerp(startLane, targetLane, t);

        const blockedByTraffic = this.traffic.some(
          (v) => Math.abs(v.s - cs) < 7.5 && Math.abs(v.lateral - lat) < 1.6,
        );
        const blockedByPowerup =
          this.nitros.some(
            (n) => Math.abs(n.s - cs) < 5.5 && Math.abs(n.lateral - lat) < 1.5,
          ) ||
          this.repairs.some(
            (r) => Math.abs(r.s - cs) < 5.5 && Math.abs(r.lateral - lat) < 1.5,
          ) ||
          this.magnets.some(
            (m) => Math.abs(m.s - cs) < 5.5 && Math.abs(m.lateral - lat) < 1.5,
          ) ||
          this.rampages.some(
            (rm) => Math.abs(rm.s - cs) < 6.0 && Math.abs(rm.lateral - lat) < 1.6,
          );
        if (!blockedByTraffic && !blockedByPowerup) {
          this.coins.push({
            s: cs,
            lateral: lat,
            phase: i * 0.55 + Math.random() * 0.4,
          });
        }
      }

      this.nextCoinSpawnS += count * 4.4 + 24 + Math.random() * 22;
    }
  }

  private spawnNitrosAhead(maxS: number): void {
    if (!this.isPowerUpUnlocked('nitro')) {
      this.nextNitroSpawnS = Math.max(this.nextNitroSpawnS, maxS + 35);
      return;
    }
    while (this.nextNitroSpawnS < maxS) {
      if (this.nitros.length < this.maxNitros) {
        const ns = this.nextNitroSpawnS;
        const laneOffset = Math.floor(Math.random() * LANE_CENTERS.length);
        for (let attempt = 0; attempt < LANE_CENTERS.length; attempt++) {
          const lat = LANE_CENTERS[(laneOffset + attempt) % LANE_CENTERS.length];
          if (this.isPickupSlotFree(ns, lat)) {
            this.nitros.push({
              s: ns,
              lateral: lat,
              phase: Math.random() * Math.PI * 2,
            });
            break;
          }
        }
      }
      this.nextNitroSpawnS += 135 + Math.random() * 95;
    }
  }

  private spawnRepairsAhead(maxS: number): void {
    if (!this.isPowerUpUnlocked('repair')) {
      this.nextRepairSpawnS = Math.max(this.nextRepairSpawnS, maxS + 35);
      return;
    }
    while (this.nextRepairSpawnS < maxS) {
      if (this.repairs.length < this.maxRepairs) {
        const rs = this.nextRepairSpawnS;
        const laneOffset = Math.floor(Math.random() * LANE_CENTERS.length);
        for (let attempt = 0; attempt < LANE_CENTERS.length; attempt++) {
          const lat = LANE_CENTERS[(laneOffset + attempt) % LANE_CENTERS.length];
          if (this.isPickupSlotFree(rs, lat)) {
            this.repairs.push({
              s: rs,
              lateral: lat,
              phase: Math.random() * Math.PI * 2,
            });
            break;
          }
        }
      }
      this.nextRepairSpawnS += 170 + Math.random() * 95;
    }
  }

  private spawnMagnetsAhead(maxS: number): void {
    if (!this.isPowerUpUnlocked('magnet')) {
      this.nextMagnetSpawnS = Math.max(this.nextMagnetSpawnS, maxS + 35);
      return;
    }
    while (this.nextMagnetSpawnS < maxS) {
      if (this.magnets.length < this.maxMagnets) {
        const ms = this.nextMagnetSpawnS;
        const laneOffset = Math.floor(Math.random() * LANE_CENTERS.length);
        for (let attempt = 0; attempt < LANE_CENTERS.length; attempt++) {
          const lat = LANE_CENTERS[(laneOffset + attempt) % LANE_CENTERS.length];
          if (this.isPickupSlotFree(ms, lat)) {
            this.magnets.push({
              s: ms,
              lateral: lat,
              phase: Math.random() * Math.PI * 2,
            });
            break;
          }
        }
      }
      this.nextMagnetSpawnS += 185 + Math.random() * 105;
    }
  }

  private spawnRampagesAhead(maxS: number): void {
    if (!this.isPowerUpUnlocked('rampage')) {
      this.nextRampageSpawnS = Math.max(this.nextRampageSpawnS, maxS + 40);
      return;
    }
    while (this.nextRampageSpawnS < maxS) {
      if (this.rampages.length < this.maxRampages && Math.random() < 0.3) {
        const rs = this.nextRampageSpawnS;
        const laneOffset = Math.floor(Math.random() * LANE_CENTERS.length);
        for (let attempt = 0; attempt < LANE_CENTERS.length; attempt++) {
          const lat = LANE_CENTERS[(laneOffset + attempt) % LANE_CENTERS.length];
          if (this.isPickupSlotFree(rs, lat)) {
            this.rampages.push({
              s: rs,
              lateral: lat,
              phase: Math.random() * Math.PI * 2,
            });
            break;
          }
        }
      }
      this.nextRampageSpawnS += 390 + Math.random() * 210;
    }
  }

  private updateNitros(dt: number, collect: boolean): void {
    this.nitroSpin += dt * 2.8;
    let activeCount = 0;

    for (let i = this.nitros.length - 1; i >= 0; i--) {
      const item = this.nitros[i];
      if (item.s < this.playerS - 18) {
        this.nitros.splice(i, 1);
        continue;
      }

      if (
        collect &&
        Math.abs(item.s - this.playerS) < 2.55 &&
        Math.abs(item.lateral - this.playerLateral) < 1.48
      ) {
        if (this.road.sampleAtS(item.s, _trafficSample)) {
          _vecC
            .copy(_trafficSample.pos)
            .addScaledVector(_trafficSample.right, item.lateral)
            .addScaledVector(_trafficSample.normal, 0.9);
          this.emitSparks(_vecC, 0, 14);
        }
        this.nitros.splice(i, 1);
        const nitroMax = this.getActiveNitroMax();
        this.nitro = nitroMax;
        const speedBonusKmh = getNitroPickupSpeedBonusKmh(
          this.powerUpUpgrades.nitro.primary,
        );
        if (speedBonusKmh > 0) {
          this.nitroPickupBoostTimer = Math.max(this.nitroPickupBoostTimer, 3.0);
          this.speedMs = Math.min(130, this.speedMs + speedBonusKmh / 3.6);
        }
        this.score += 100 * this.combo;
        this.audio.playNitroPickup();
        const nitroDetailParts = [
          nitroMax > 100 ? `${nitroMax}/${nitroMax}` : '%100',
        ];
        if (speedBonusKmh > 0) nitroDetailParts.push(`+${speedBonusKmh} km/s`);
        this.emitCallout('NİTRO DOLDU!', nitroDetailParts.join(' · '), 'cyan');
        this.handleMissionRewards(this.missions.recordDelta('nitroPickup', 1));
        this.pushHud(true);
        continue;
      }

      if (
        activeCount < this.maxNitros &&
        this.road.sampleAtS(item.s, _trafficSample)
      ) {
        const bob = Math.sin(this.nitroSpin * 1.4 + item.phase) * 0.16;
        _vecC.copy(_trafficSample.tangent).negate();
        _matBasis.makeBasis(
          _trafficSample.right,
          _trafficSample.normal,
          _vecC,
        );
        _quatA.setFromRotationMatrix(_matBasis);

        _dummy.position
          .copy(_trafficSample.pos)
          .addScaledVector(_trafficSample.right, item.lateral)
          .addScaledVector(_trafficSample.normal, 0.95 + bob);
        _dummy.quaternion.copy(_quatA);
        _dummy.rotateY(this.nitroSpin + item.phase);
        _dummy.rotateZ(0.28);
        _dummy.scale.setScalar(1.08);
        _dummy.updateMatrix();
        this.nitroMesh.setMatrixAt(activeCount++, _dummy.matrix);
      }
    }

    this.nitroMesh.count = activeCount;
    if (activeCount > 0) {
      this.nitroMesh.instanceMatrix.needsUpdate = true;
    }
  }

  private updateRepairs(collect: boolean): void {
    let activeCount = 0;

    for (let i = this.repairs.length - 1; i >= 0; i--) {
      const item = this.repairs[i];
      if (item.s < this.playerS - 18) {
        this.repairs.splice(i, 1);
        continue;
      }

      if (
        collect &&
        Math.abs(item.s - this.playerS) < 2.55 &&
        Math.abs(item.lateral - this.playerLateral) < 1.48
      ) {
        if (this.road.sampleAtS(item.s, _trafficSample)) {
          _vecC
            .copy(_trafficSample.pos)
            .addScaledVector(_trafficSample.right, item.lateral)
            .addScaledVector(_trafficSample.normal, 0.9);
          this.emitSparks(_vecC, 0, 14);
        }
        this.repairs.splice(i, 1);
        const healRatio = getRepairHealRatio(
          this.powerUpUpgrades.repair.primary,
        );
        const healAmount = this.carSpec.maxIntegrity * healRatio;
        this.integrity = Math.min(
          this.carSpec.maxIntegrity,
          this.integrity + healAmount,
        );
        this.score += 100 * this.combo;
        this.audio.playRepairPickup();
        this.emitCallout(
          'TAMİR KİTİ!',
          `+${Math.round(healRatio * 100)}% Gövde`,
          'emerald',
        );
        this.handleMissionRewards(this.missions.recordDelta('repairPickup', 1));
        this.pushHud(true);
        continue;
      }

      if (
        activeCount < this.maxRepairs &&
        this.road.sampleAtS(item.s, _trafficSample)
      ) {
        const bob = Math.sin(this.nitroSpin * 1.3 + item.phase) * 0.16;
        _vecC.copy(_trafficSample.tangent).negate();
        _matBasis.makeBasis(
          _trafficSample.right,
          _trafficSample.normal,
          _vecC,
        );
        _quatA.setFromRotationMatrix(_matBasis);

        _dummy.position
          .copy(_trafficSample.pos)
          .addScaledVector(_trafficSample.right, item.lateral)
          .addScaledVector(_trafficSample.normal, 0.96 + bob);
        _dummy.quaternion.copy(_quatA);
        _dummy.rotateY(this.nitroSpin * 0.95 + item.phase);
        _dummy.scale.setScalar(1.05);
        _dummy.updateMatrix();
        this.repairMesh.setMatrixAt(activeCount++, _dummy.matrix);
      }
    }

    this.repairMesh.count = activeCount;
    if (activeCount > 0) {
      this.repairMesh.instanceMatrix.needsUpdate = true;
    }
  }

  private updateMagnets(collect: boolean): void {
    let activeCount = 0;

    for (let i = this.magnets.length - 1; i >= 0; i--) {
      const item = this.magnets[i];
      if (item.s < this.playerS - 18) {
        this.magnets.splice(i, 1);
        continue;
      }

      if (
        collect &&
        Math.abs(item.s - this.playerS) < 2.55 &&
        Math.abs(item.lateral - this.playerLateral) < 1.48
      ) {
        if (this.road.sampleAtS(item.s, _trafficSample)) {
          _vecC
            .copy(_trafficSample.pos)
            .addScaledVector(_trafficSample.right, item.lateral)
            .addScaledVector(_trafficSample.normal, 0.9);
          this.emitSparks(_vecC, 0, 14);
        }
        this.magnets.splice(i, 1);
        const magDur = getMagnetDurationSec(this.powerUpUpgrades.magnet.primary);
        const magRange = getMagnetRangeMeters(
          this.powerUpUpgrades.magnet.secondary,
        );
        this.magnetTimer = magDur;
        this.score += 100 * this.combo;
        this.audio.playMagnetPickup();
        this.emitCallout(
          'MIKNATIS AKTİF!',
          `${magDur} sn · ${magRange} m Çekim`,
          'rose',
        );
        this.handleMissionRewards(this.missions.recordDelta('magnetPickup', 1));
        this.pushHud(true);
        continue;
      }

      if (
        activeCount < this.maxMagnets &&
        this.road.sampleAtS(item.s, _trafficSample)
      ) {
        const bob = Math.sin(this.nitroSpin * 1.5 + item.phase) * 0.16;
        _vecC.copy(_trafficSample.tangent).negate();
        _matBasis.makeBasis(
          _trafficSample.right,
          _trafficSample.normal,
          _vecC,
        );
        _quatA.setFromRotationMatrix(_matBasis);

        _dummy.position
          .copy(_trafficSample.pos)
          .addScaledVector(_trafficSample.right, item.lateral)
          .addScaledVector(_trafficSample.normal, 0.98 + bob);
        _dummy.quaternion.copy(_quatA);
        _dummy.rotateY(this.nitroSpin * 1.1 + item.phase);
        _dummy.rotateX(0.2);
        _dummy.scale.setScalar(1.06);
        _dummy.updateMatrix();
        this.magnetMesh.setMatrixAt(activeCount++, _dummy.matrix);
      }
    }

    this.magnetMesh.count = activeCount;
    if (activeCount > 0) {
      this.magnetMesh.instanceMatrix.needsUpdate = true;
    }
  }

  private updateRampages(dt: number, collect: boolean): void {
    this.rampageSpin += dt * 3.1;
    let activeCount = 0;

    for (let i = this.rampages.length - 1; i >= 0; i--) {
      const item = this.rampages[i];
      if (item.s < this.playerS - 18) {
        this.rampages.splice(i, 1);
        continue;
      }

      if (
        collect &&
        Math.abs(item.s - this.playerS) < 2.75 &&
        Math.abs(item.lateral - this.playerLateral) < 1.65
      ) {
        if (this.road.sampleAtS(item.s, _trafficSample)) {
          _vecC
            .copy(_trafficSample.pos)
            .addScaledVector(_trafficSample.right, item.lateral)
            .addScaledVector(_trafficSample.normal, 1.0);
          this.emitSparks(_vecC, 0, 26);
        }
        this.rampages.splice(i, 1);

        const wasAlreadyActive = this.rampageTimer > 0;
        const rampDur = getRampageDurationSec(
          this.powerUpUpgrades.rampage.primary,
        );
        const rampMult = getRampageSpeedMultiplier(
          this.powerUpUpgrades.rampage.secondary,
        );
        const rampCap = Math.min(
          185,
          134 + this.powerUpUpgrades.rampage.secondary * 10,
        );
        this.rampageTimer = rampDur;
        this.rampageCountdownStep = 4;

        // Instant multiplied speed surge!
        if (!wasAlreadyActive) {
          this.speedMs = Math.min(
            rampCap,
            Math.max(
              this.speedMs * rampMult,
              68 + this.powerUpUpgrades.rampage.secondary * 5,
            ),
          );
        }

        this.score += 250 * this.combo;
        this.cameraShake = Math.max(this.cameraShake, 0.72);
        this.audio.playRampagePickup();
        this.callbacks.onImpact?.(0.75);
        const durLabel = Number.isInteger(rampDur)
          ? `${rampDur}`
          : rampDur.toFixed(1);
        this.emitCallout(
          `YIKIM MODU! ${formatSpeedMultiplier(rampMult)} HIZ`,
          `${durLabel} sn Hasarsız · Çarp & Patlat!`,
          'amber',
        );
        this.pushHud(true);
        continue;
      }

      if (
        activeCount < this.maxRampages &&
        this.road.sampleAtS(item.s, _trafficSample)
      ) {
        const bob = Math.sin(this.rampageSpin * 1.4 + item.phase) * 0.2;
        _vecC.copy(_trafficSample.tangent).negate();
        _matBasis.makeBasis(
          _trafficSample.right,
          _trafficSample.normal,
          _vecC,
        );
        _quatA.setFromRotationMatrix(_matBasis);

        const baseY = 1.15 + bob;
        _dummy.position
          .copy(_trafficSample.pos)
          .addScaledVector(_trafficSample.right, item.lateral)
          .addScaledVector(_trafficSample.normal, baseY);
        _dummy.quaternion.copy(_quatA);
        _dummy.rotateY(this.rampageSpin * 1.35 + item.phase);
        const pulse = 1.08 + Math.sin(this.rampageSpin * 3.2 + item.phase) * 0.08;
        _dummy.scale.setScalar(pulse);
        _dummy.updateMatrix();
        this.rampageCoreMesh.setMatrixAt(activeCount, _dummy.matrix);

        // Counter-rotating tilted energy halo ring around the lightning core
        _dummy.position
          .copy(_trafficSample.pos)
          .addScaledVector(_trafficSample.right, item.lateral)
          .addScaledVector(_trafficSample.normal, baseY);
        _dummy.quaternion.copy(_quatA);
        _dummy.rotateX(0.48);
        _dummy.rotateY(-this.rampageSpin * 1.9 + item.phase);
        _dummy.rotateZ(this.rampageSpin * 0.9);
        _dummy.scale.setScalar(1.0 + Math.sin(this.rampageSpin * 4 + item.phase) * 0.06);
        _dummy.updateMatrix();
        this.rampageRingMesh.setMatrixAt(activeCount, _dummy.matrix);

        activeCount++;
      }
    }

    this.rampageCoreMesh.count = activeCount;
    this.rampageRingMesh.count = activeCount;
    if (activeCount > 0) {
      this.rampageCoreMesh.instanceMatrix.needsUpdate = true;
      this.rampageRingMesh.instanceMatrix.needsUpdate = true;
    }
  }

  private spawnCarExplosion(worldPos: THREE.Vector3, carColorHex: number): void {
    // 1. Expanding fiery blast fireball
    if (this.explosions.length < this.maxExplosions) {
      const burst = this.explosionPool.pop() || {
        pos: new THREE.Vector3(),
        life: 0,
        maxLife: 0.55,
        maxRadius: 4.8,
      };
      burst.pos.copy(worldPos);
      burst.pos.y += 0.9;
      burst.life = 0;
      burst.maxLife = 0.52;
      burst.maxRadius = 4.9;
      this.explosions.push(burst);
    }

    // 2. Flying tumbling burning car debris chunks
    const count = this.isMobileDevice ? 14 : 22;
    for (let i = 0; i < count; i++) {
      if (this.debris.length >= this.maxDebris) break;
      const d = this.debrisPool.pop() || {
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        rot: new THREE.Vector3(),
        rotVel: new THREE.Vector3(),
        scale: new THREE.Vector3(1, 1, 1),
        color: new THREE.Color(),
        life: 0,
        maxLife: 1.0,
      };
      d.pos.set(
        worldPos.x + (Math.random() - 0.5) * 1.8,
        worldPos.y + 0.4 + Math.random() * 1.1,
        worldPos.z + (Math.random() - 0.5) * 2.6,
      );
      const ang = Math.random() * Math.PI * 2;
      const horizSpeed = 9 + Math.random() * 19;
      d.vel.set(
        Math.cos(ang) * horizSpeed,
        9 + Math.random() * 15,
        Math.sin(ang) * horizSpeed,
      );
      d.rot.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI,
      );
      d.rotVel.set(
        (Math.random() - 0.5) * 16,
        (Math.random() - 0.5) * 16,
        (Math.random() - 0.5) * 16,
      );
      d.scale.set(
        0.7 + Math.random() * 1.3,
        0.6 + Math.random() * 1.1,
        0.7 + Math.random() * 1.4,
      );
      if (i % 3 === 0) {
        d.color.setHex(carColorHex);
      } else if (i % 3 === 1) {
        d.color.setHex(0xff6b00);
      } else {
        d.color.setHex(0x27272a);
      }
      d.life = 0;
      d.maxLife = 0.72 + Math.random() * 0.55;
      this.debris.push(d);
    }

    // 3. Intense sparks + billowing dark explosion smoke
    this.emitSparks(worldPos, 0, this.isMobileDevice ? 18 : 32);
    this.emitDamageSmoke(worldPos, this.isMobileDevice ? 7 : 12, true);
    this.audio.playCarExplosion();
  }

  private updateCoins(dt: number, collect: boolean): void {
    this.coinSpin += dt * 3.4;
    let activeCount = 0;

    for (let i = this.coins.length - 1; i >= 0; i--) {
      const coin = this.coins[i];
      if (coin.s < this.playerS - 18) {
        this.coins.splice(i, 1);
        continue;
      }

      if (collect && this.magnetTimer > 0) {
        const magRange = getMagnetRangeMeters(
          this.powerUpUpgrades.magnet.secondary,
        );
        const dsAhead = coin.s - this.playerS;
        if (dsAhead > -4 && dsAhead < magRange) {
          const pullLambda = 10 + this.powerUpUpgrades.magnet.secondary * 2.2;
          const pullRate = 1 - Math.exp(-pullLambda * dt);
          coin.s = THREE.MathUtils.lerp(coin.s, this.playerS, pullRate);
          coin.lateral = THREE.MathUtils.lerp(
            coin.lateral,
            this.playerLateral,
            pullRate,
          );
        }
      }

      if (
        collect &&
        Math.abs(coin.s - this.playerS) < 2.45 &&
        Math.abs(coin.lateral - this.playerLateral) < 1.45
      ) {
        if (this.road.sampleAtS(coin.s, _trafficSample)) {
          _vecC
            .copy(_trafficSample.pos)
            .addScaledVector(_trafficSample.right, coin.lateral)
            .addScaledVector(_trafficSample.normal, 0.72);
          this.emitSparks(_vecC, 0, 8);
        }
        this.coins.splice(i, 1);
        this.runGold += 1;
        this.totalGold += 1;
        this.score += 50 * this.combo;
        this.audio.playCoinPickup();
        this.markProgressionDirty();
        this.handleMissionRewards(this.missions.recordDelta('gold', 1));
        if (this.runGold % 5 === 0) {
          this.emitCallout('Altın Serisi', '+5 Altın', 'amber');
        }
        continue;
      }

      if (activeCount < this.maxCoins && this.road.sampleAtS(coin.s, _trafficSample)) {
        const bob = Math.sin(this.coinSpin * 1.3 + coin.phase) * 0.14;
        _vecC.copy(_trafficSample.tangent).negate();
        _matBasis.makeBasis(
          _trafficSample.right,
          _trafficSample.normal,
          _vecC,
        );
        _quatA.setFromRotationMatrix(_matBasis);

        _dummy.position
          .copy(_trafficSample.pos)
          .addScaledVector(_trafficSample.right, coin.lateral)
          .addScaledVector(_trafficSample.normal, 0.76 + bob);
        _dummy.quaternion.copy(_quatA);
        _dummy.rotateY(this.coinSpin + coin.phase);
        _dummy.scale.setScalar(1);
        _dummy.updateMatrix();
        this.coinsMesh.setMatrixAt(activeCount++, _dummy.matrix);
      }
    }

    this.coinsMesh.count = activeCount;
    if (activeCount > 0) {
      this.coinsMesh.instanceMatrix.needsUpdate = true;
    }
  }

  private acquireTrafficRig(kind: TrafficKind, colorHex: number): TrafficRig {
    const bucket = this.trafficRecyclePool[kind];
    if (bucket.length > 0) {
      const recycled = bucket.pop()!;
      this.trafficPool.setVehicleColor(recycled, colorHex);
      recycled.root.visible = true;
      return recycled;
    }
    const created = this.trafficPool.createVehicle(kind, colorHex);
    this.trafficGroup.add(created.root);
    return created;
  }

  private releaseTrafficRig(tv: TrafficVehicle): void {
    tv.rig.root.visible = false;
    const bucket = this.trafficRecyclePool[tv.rig.kind];
    if (bucket.length < 16) {
      bucket.push(tv.rig);
    } else {
      this.trafficGroup.remove(tv.rig.root);
    }
  }

  private spawnTrafficAhead(maxS: number): void {
    const palette = [
      0xf8fafc, 0x334155, 0x991b1b, 0x1e40af, 0x71717a, 0xd97706, 0x065f46,
    ];
    while (this.nextSpawnS < maxS) {
      const laneIndex = Math.floor(Math.random() * LANE_CENTERS.length);
      const laneX = LANE_CENTERS[laneIndex];

      let kind: TrafficKind = 'sedan';
      const isOncoming =
        this.gameMode === 'twoway' && this.phase === 'playing' && laneIndex === 0;
      const r = Math.random();
      if (!isOncoming && laneIndex === 2 && r < 0.44) kind = 'truck';
      else if (r < 0.42) kind = 'suv';

      const minSameLaneGap = isOncoming ? 42 : 28;
      const tooClose =
        this.traffic.some(
          (v) =>
            v.laneIndex === laneIndex &&
            Math.abs(v.s - this.nextSpawnS) < minSameLaneGap,
        ) || this.roadEvents.isLaneBlockedNear(this.nextSpawnS, laneIndex);
      if (!tooClose) {
        const colorHex = palette[Math.floor(Math.random() * palette.length)];
        const rig = this.acquireTrafficRig(kind, colorHex);
        const lateral = laneX + (Math.random() - 0.5) * 0.45;
        const direction: 1 | -1 = isOncoming ? -1 : 1;
        if (this.road.sampleAtS(this.nextSpawnS, _trafficSample)) {
          if (direction === 1) {
            _vecC.copy(_trafficSample.tangent).negate();
            _matBasis.makeBasis(
              _trafficSample.right,
              _trafficSample.normal,
              _vecC,
            );
          } else {
            _vecNegRight.copy(_trafficSample.right).negate();
            _matBasis.makeBasis(
              _vecNegRight,
              _trafficSample.normal,
              _trafficSample.tangent,
            );
          }
          _quatA.setFromRotationMatrix(_matBasis);
          rig.root.position
            .copy(_trafficSample.pos)
            .addScaledVector(_trafficSample.right, lateral)
            .addScaledVector(_trafficSample.normal, 0.02);
          rig.root.quaternion.copy(_quatA);
          rig.root.visible = this.phase !== 'garage';
        } else {
          rig.root.visible = false;
        }

        const baseSpeed = isOncoming
          ? 22 + Math.random() * 7
          : kind === 'truck'
            ? 20 + Math.random() * 4
            : laneIndex === 0
              ? 29 + Math.random() * 6
              : 24 + Math.random() * 6;

        this.traffic.push({
          id: this.nextTrafficId++,
          rig,
          colorHex,
          s: this.nextSpawnS,
          laneIndex,
          lateral,
          speedMs: baseSpeed,
          direction,
          nearMissed: false,
          hitCooldown: 0,
        });
      }

      const progressFactor = Math.min(1, this.distanceMeters / 6000);
      const minGap = THREE.MathUtils.lerp(30, 19, progressFactor);
      const maxGap = THREE.MathUtils.lerp(52, 34, progressFactor);
      this.nextSpawnS += minGap + Math.random() * (maxGap - minGap);
    }
  }

  private emitSparks(
    worldPos: THREE.Vector3,
    sideDir: number,
    count: number,
  ): void {
    for (let i = 0; i < count; i++) {
      let sp: SparkParticle;
      if (this.sparks.length >= this.maxSparks) {
        sp = this.sparks.shift()!;
      } else if (this.sparkPool.length > 0) {
        sp = this.sparkPool.pop()!;
      } else {
        sp = {
          pos: new THREE.Vector3(),
          vel: new THREE.Vector3(),
          life: 0,
          maxLife: 0.3,
        };
      }
      sp.pos.set(
        worldPos.x + (Math.random() - 0.5) * 0.3,
        worldPos.y + 0.35 + Math.random() * 0.3,
        worldPos.z + (Math.random() - 0.5) * 0.5,
      );
      sp.vel.set(
        -sideDir * (2.4 + Math.random() * 4.5) + (Math.random() - 0.5) * 3.6,
        2.2 + Math.random() * 4.5,
        (Math.random() - 0.5) * 4.5,
      );
      sp.life = 0;
      sp.maxLife = 0.28 + Math.random() * 0.28;
      this.sparks.push(sp);
    }
  }

  private emitDamageSmoke(
    worldPos: THREE.Vector3,
    count: number,
    burst = false,
  ): void {
    const spread = burst ? 2.4 : 0.75;
    const posSpread = burst ? 0.9 : 0.45;
    for (let i = 0; i < count; i++) {
      let dm: SmokeParticle;
      if (this.damageSmokes.length >= this.maxDamageSmokes) {
        dm = this.damageSmokes.shift()!;
      } else if (this.damageSmokePool.length > 0) {
        dm = this.damageSmokePool.pop()!;
      } else {
        dm = {
          pos: new THREE.Vector3(),
          vel: new THREE.Vector3(),
          life: 0,
          maxLife: 0.5,
          size: 0.8,
          color: new THREE.Color(0x27272a),
        };
      }
      dm.pos.set(
        worldPos.x + (Math.random() - 0.5) * posSpread,
        worldPos.y + 0.45 + Math.random() * 0.35,
        worldPos.z + (Math.random() - 0.5) * posSpread,
      );
      dm.vel.set(
        (Math.random() - 0.5) * spread,
        (burst ? 2.0 : 1.4) + Math.random() * 1.4,
        (Math.random() - 0.5) * spread,
      );
      dm.life = 0;
      dm.maxLife = (burst ? 0.65 : 0.52) + Math.random() * 0.35;
      dm.size = (burst ? 1.05 : 0.72) + Math.random() * 0.45;
      this.damageSmokes.push(dm);
    }
  }

  private emitTireSmoke(sample: EvaluatedRoadPoint): void {
    for (const tireOff of [-0.9, 0.9]) {
      let sm: SmokeParticle;
      if (this.smokes.length >= this.maxSmokes) {
        sm = this.smokes.shift()!;
      } else if (this.smokePool.length > 0) {
        sm = this.smokePool.pop()!;
      } else {
        sm = {
          pos: new THREE.Vector3(),
          vel: new THREE.Vector3(),
          life: 0,
          maxLife: 0.45,
          size: 0.7,
          color: new THREE.Color(0xe4e4e7),
        };
      }
      sm.pos
        .copy(sample.pos)
        .addScaledVector(sample.right, this.playerLateral + tireOff)
        .addScaledVector(sample.tangent, -1.35)
        .addScaledVector(sample.normal, 0.16);
      sm.vel.set(
        (Math.random() - 0.5) * 1.4,
        0.9 + Math.random() * 0.9,
        (Math.random() - 0.5) * 1.4,
      );
      sm.life = 0;
      sm.maxLife = 0.42 + Math.random() * 0.22;
      sm.size = 0.65 + Math.random() * 0.4;
      this.fillActiveSmokeColor(sm.color);
      this.smokes.push(sm);
    }
  }

  private emitExhaustFlames(
    mode: 'fire' | 'nitro',
    perPipeCount: number,
    intensity = 1,
  ): void {
    const tips = this.playerCar.flameMeshes;
    if (tips.length === 0) return;

    const carryFactor = mode === 'nitro' ? 0.68 : 0.74;
    const baseLife = mode === 'nitro' ? 0.2 : 0.17;

    for (let t = 0; t < tips.length; t++) {
      tips[t].getWorldPosition(_vecC);
      for (let i = 0; i < perPipeCount; i++) {
        let fl: ExhaustFlameParticle;
        if (this.exhaustFlames.length >= this.maxExhaustFlames) {
          fl = this.exhaustFlames.shift()!;
        } else if (this.exhaustFlamePool.length > 0) {
          fl = this.exhaustFlamePool.pop()!;
        } else {
          fl = {
            pos: new THREE.Vector3(),
            vel: new THREE.Vector3(),
            life: 0,
            maxLife: 0.2,
            size: 0.8,
            mode: 'fire',
          };
        }
        const particleMode: 'fire' | 'nitro' =
          mode === 'nitro' && Math.random() < 0.24 ? 'fire' : mode;
        const speedJitter = (Math.random() - 0.5) * 4.2;
        const forwardKeep = this.speedMs * carryFactor + speedJitter;

        fl.pos.copy(_vecC).addScaledVector(_roadSample.tangent, -0.06);
        fl.vel
          .copy(_roadSample.tangent)
          .multiplyScalar(forwardKeep)
          .addScaledVector(
            _roadSample.right,
            (Math.random() - 0.5) * 1.65 * intensity,
          )
          .addScaledVector(
            _roadSample.normal,
            (0.25 + Math.random() * 0.95) * intensity,
          );
        fl.life = 0;
        fl.maxLife = baseLife + Math.random() * 0.11;
        fl.size = (0.72 + Math.random() * 0.52) * intensity;
        fl.mode = particleMode;
        this.exhaustFlames.push(fl);
      }
    }
  }

  private boostCombo(amount = 1): void {
    this.combo = Math.min(5, this.combo + amount);
    this.comboTimer = this.comboDuration;
    this.handleMissionRewards(this.missions.recordPeak('maxCombo', this.combo));
  }

  private scheduleNextTick(): void {
    if (this.disposed || this.renderSuspended) return;
    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed || this.renderSuspended) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private tick = (): void => {
    if (this.disposed || this.renderSuspended) return;

    const now = performance.now();
    const rawFrameMs = now - this.lastTime;
    this.lastTime = now;

    // 120Hz-native frame pacing: support 2.5ms..36ms (up to 400Hz) with zero 60Hz EMA rubber-banding;
    // only damp isolated single-frame outlier spikes (> 2.2x rolling average).
    const clampedRawDt = Math.min(0.036, Math.max(0.0025, rawFrameMs / 1000));
    let dt: number;
    if (this.startupFrameCount < 3) {
      this.startupFrameCount++;
      this.smoothedDt = clampedRawDt;
      dt = clampedRawDt;
    } else if (clampedRawDt > this.smoothedDt * 2.2 && clampedRawDt > 0.022) {
      dt = Math.min(0.034, this.smoothedDt * 1.45);
      this.smoothedDt = this.smoothedDt * 0.85 + clampedRawDt * 0.15;
    } else {
      this.smoothedDt = this.smoothedDt * 0.88 + clampedRawDt * 0.12;
      dt = clampedRawDt;
    }

    // Keep native HiDPI resolution & full particle density locked to avoid mid-run WebGL backbuffer resize stalls.

    if (this.phase === 'paused') {
      if (this.pausedNeedsRender) {
        this.pausedNeedsRender = false;
        this.renderer.render(this.scene, this.camera);
      }
      this.scheduleNextTick();
      return;
    }
    this.pausedNeedsRender = true;

    if (this.phase !== 'garage') {
      if (this.atmosphereId === 'cycle') {
        this.stepDynamicWeather(dt);
        this.cycleTime = (this.cycleTime + dt / 92) % 1;
        this.cycleAtmAccumSec += dt;
        if (this.cycleAtmAccumSec >= 0.066 || this.lastAppliedAtmId !== 'cycle') {
          this.cycleAtmAccumSec = 0;
          this.lastAppliedAtmId = 'cycle';
          this.applyCycleAtmosphere(this.cycleTime);
        }
      } else if (
        this.lastAppliedAtmId !== this.atmosphereId ||
        Math.abs(this.distanceMeters - this.lastAppliedAtmDist) >= 12
      ) {
        this.applyPresetAtmosphereWithBiome(this.atmosphereId);
      }
    }

    if (this.phase === 'playing') {
      if (this.resumeCountdownTimer > 0) {
        this.resumeCountdownTimer = Math.max(0, this.resumeCountdownTimer - dt);
        this.audio.updateEngine(0.24, 0.24, false);
        this.stepRain(dt * 0.25);
        if (this.resumeCountdownTimer > 0) {
          const step = Math.min(
            3,
            Math.max(1, Math.ceil(this.resumeCountdownTimer / 0.65)),
          ) as 3 | 2 | 1;
          if (step !== this.lastResumeCountdownStep) {
            this.lastResumeCountdownStep = step;
            this.audio.playCountdownBeep(step);
            this.callbacks.onImpact?.(0.18);
            this.pushHud(true);
          }
        } else {
          this.lastResumeCountdownStep = 0;
          this.reviveInvulnTimer = Math.max(this.reviveInvulnTimer, 0.85);
          this.pushHud(true);
        }
      } else {
        this.stepSimulation(dt);
      }
    } else if (this.phase === 'garage') {
      this.stepGaragePreview(dt);
    } else if (this.phase === 'menu') {
      this.stepMenuPreview(dt);
    } else if (this.phase === 'gameover') {
      this.crashElapsed += dt;

      if (this.crashElapsed < 1.3 && this.crashSlideSpeed > 0.25) {
        this.playerS += this.crashSlideSpeed * dt;
        this.playerLateral += this.crashLatVel * dt;

        if (Math.abs(this.playerLateral) >= MAX_PLAYER_LATERAL) {
          this.playerLateral = THREE.MathUtils.clamp(
            this.playerLateral,
            -MAX_PLAYER_LATERAL,
            MAX_PLAYER_LATERAL,
          );
          if (Math.abs(this.crashLatVel) > 0.6) {
            this.crashLatVel = -this.crashLatVel * 0.45;
            this.emitSparks(
              this.playerCar.root.position,
              Math.sign(this.playerLateral),
              10,
            );
          } else {
            this.crashLatVel = 0;
          }
        }

        this.crashSlideSpeed = THREE.MathUtils.damp(
          this.crashSlideSpeed,
          0,
          2.6,
          dt,
        );
        this.crashLatVel = THREE.MathUtils.damp(this.crashLatVel, 0, 2.9, dt);
        this.carRelYaw += this.crashYawVel * dt;
        this.crashYawVel = THREE.MathUtils.damp(this.crashYawVel, 0, 2.7, dt);
        this.chassisRoll = THREE.MathUtils.damp(
          this.chassisRoll,
          this.crashRollTarget,
          8,
          dt,
        );
        this.chassisPitch = THREE.MathUtils.damp(
          this.chassisPitch,
          this.crashPitchTarget,
          8,
          dt,
        );
        this.wheelSpin += ((this.crashSlideSpeed * 0.4) / 0.34) * dt;
        for (const w of this.playerCar.wheelSpinGroups) {
          w.rotation.x = -this.wheelSpin;
        }

        this.road.update(this.playerS, dt);
        this.road.sampleAtS(this.playerS, _roadSample);
        this.placeCarOnRoad(
          _roadSample,
          this.playerLateral,
          this.carRelYaw,
          this.chassisRoll,
          this.chassisPitch,
        );

        if (this.gameOverReason !== 'career_win') {
          this.crashSparkTimer += dt;
          if (this.crashSlideSpeed > 6 && this.crashSparkTimer > 0.065) {
            this.crashSparkTimer = 0;
            this.emitSparks(
              this.playerCar.root.position,
              Math.sign(this.crashYawVel) || 1,
              6,
            );
          }
          if (this.crashSlideSpeed > 4.5 && Math.random() < dt * 22) {
            this.emitTireSmoke(_roadSample);
          }
        }
      } else {
        this.road.sampleAtS(this.playerS, _roadSample);
      }

      this.updateTraffic(dt, false);
      this.updateFinishLine(dt);

      if (this.gameOverReason !== 'career_win') {
        this.damageSmokeTimer += dt;
        if (this.damageSmokeTimer > 0.095) {
          this.damageSmokeTimer = 0;
          _vecC
            .copy(this.playerCar.root.position)
            .addScaledVector(_roadSample.normal, 0.45);
          this.emitDamageSmoke(_vecC, 2, false);
        }
      }
      this.stepParticles(dt);
      this.stepRain(dt);

      // Dramatic pull-back tracking camera focused on the wrecked spinning vehicle
      const orbitOffset = Math.sin(Math.min(1.4, this.crashElapsed) * 1.1) * 1.35;
      const pullBackDist = 6.8 + Math.min(2.4, this.crashElapsed * 2.1);
      _vecA
        .copy(_roadSample.pos)
        .addScaledVector(
          _roadSample.right,
          this.playerLateral * 0.6 + orbitOffset,
        )
        .addScaledVector(_roadSample.tangent, -pullBackDist)
        .addScaledVector(
          _roadSample.normal,
          2.5 + Math.min(0.65, this.crashElapsed * 0.55),
        );
      _vecB
        .copy(this.playerCar.root.position)
        .addScaledVector(_roadSample.normal, 0.8);
      this.crashCamBasePos.lerp(_vecA, 1 - Math.exp(-6 * dt));
      this.crashCamBaseLook.lerp(_vecB, 1 - Math.exp(-11 * dt));
      this.crashCamRoll = THREE.MathUtils.damp(this.crashCamRoll, 0, 3.5, dt);
      this.crashCamYaw = THREE.MathUtils.damp(this.crashCamYaw, 0, 3.5, dt);

      this.cameraShake = THREE.MathUtils.damp(this.cameraShake, 0, 4.2, dt);
      this.camera.position.copy(this.crashCamBasePos);
      if (this.cameraShake > 0.002) {
        this.camera.position.x += (Math.random() - 0.5) * this.cameraShake * 1.25;
        this.camera.position.y += (Math.random() - 0.5) * this.cameraShake * 0.85;
        this.camera.position.z += (Math.random() - 0.5) * this.cameraShake * 0.75;
      }
      this.camera.lookAt(this.crashCamBaseLook);
      const shakeRoll =
        this.cameraShake > 0.002
          ? (Math.random() - 0.5) * this.cameraShake * 0.1
          : 0;
      this.camera.rotateZ(this.crashCamRoll + shakeRoll);
      this.camera.rotateY(this.crashCamYaw);
      this.recenterIfNeeded();
      this.updateSkyAndSun(this.camera.position);
    }

    const speedKmh = this.speedMs * 3.6;
    const speedRatio = THREE.MathUtils.clamp((speedKmh - 105) / 140, 0, 1);
    const targetBlur =
      this.phase === 'playing'
        ? speedRatio * 0.044 + (this.nitroActive ? 0.032 : 0)
        : 0;
    this.blurStrengthCurrent = THREE.MathUtils.damp(
      this.blurStrengthCurrent,
      targetBlur,
      8,
      dt,
    );

    if (
      this.isMobileDevice &&
      this.renderer.shadowMap.enabled &&
      now - this.lastShadowUpdateMs >= 16
    ) {
      this.lastShadowUpdateMs = now;
      this.renderer.shadowMap.needsUpdate = true;
    }

    if (
      this.composer &&
      !this.isSoftwareGl &&
      this.blurStrengthCurrent >= 0.0025
    ) {
      if (this.motionBlurPass) {
        this.motionBlurPass.uniforms.uBlurStrength.value =
          this.blurStrengthCurrent;
        this.motionBlurPass.uniforms.uChromatic.value =
          this.phase === 'playing'
            ? speedRatio * 0.004 + (this.nitroActive ? 0.0055 : 0)
            : 0;
      }
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
    this.scheduleNextTick();
  };

  private buildGarageStage(): THREE.Group {
    const group = new THREE.Group();

    const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
      this.garageGeometries.push(g);
      return g;
    };
    const trackMat = <T extends THREE.Material>(m: T): T => {
      this.garageMaterials.push(m);
      return m;
    };

    // Matte epoxy showroom floor
    const floorGeo = trackGeo(new THREE.CircleGeometry(28, 48));
    floorGeo.rotateX(-Math.PI / 2);
    const floorMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x111318,
        roughness: 0.45,
        metalness: 0.35,
      }),
    );
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -0.14;
    floor.receiveShadow = true;
    group.add(floor);

    // Turntable plinth under the car
    const plinthGeo = trackGeo(new THREE.CylinderGeometry(2.95, 3.22, 0.14, 48));
    const plinthMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x1e212a,
        roughness: 0.34,
        metalness: 0.55,
      }),
    );
    const plinth = new THREE.Mesh(plinthGeo, plinthMat);
    plinth.position.y = -0.07;
    plinth.receiveShadow = true;
    group.add(plinth);

    // Amber inner accent ring & cyan outer showroom ring
    const innerRingGeo = trackGeo(new THREE.RingGeometry(2.96, 3.04, 64));
    innerRingGeo.rotateX(-Math.PI / 2);
    const innerRingMat = trackMat(
      new THREE.MeshBasicMaterial({ color: 0xf59e0b }),
    );
    const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
    innerRing.position.y = 0.004;
    group.add(innerRing);

    const outerRingGeo = trackGeo(new THREE.RingGeometry(4.7, 4.76, 64));
    outerRingGeo.rotateX(-Math.PI / 2);
    const outerRingMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.45,
      }),
    );
    const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
    outerRing.position.y = -0.135;
    group.add(outerRing);

    // Showroom studio pillars with light strips
    const pillarGeo = trackGeo(new THREE.BoxGeometry(0.28, 4.6, 0.28));
    const pillarMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x181b22,
        roughness: 0.6,
        metalness: 0.4,
      }),
    );
    const stripGeo = trackGeo(new THREE.BoxGeometry(0.08, 3.6, 0.06));
    const stripMat = trackMat(
      new THREE.MeshBasicMaterial({ color: 0xfef3c7 }),
    );
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      const r = 8.4;
      const px = Math.cos(a) * r;
      const pz = Math.sin(a) * r;
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(px, 2.15, pz);
      pillar.lookAt(0, 2.15, 0);
      group.add(pillar);

      const strip = new THREE.Mesh(stripGeo, stripMat);
      strip.position.set(Math.cos(a) * (r - 0.14), 2.15, Math.sin(a) * (r - 0.14));
      strip.lookAt(0, 2.15, 0);
      group.add(strip);
    }

    // Studio key & rim lights
    const keyLight = new THREE.PointLight(0xffffff, 24, 22, 1.5);
    keyLight.position.set(3.2, 4.8, 3.6);
    this.garageKeyLight = keyLight;
    group.add(keyLight);

    const rimLight = new THREE.PointLight(0xfbbf24, 18, 20, 1.5);
    rimLight.position.set(-4.2, 3.2, -4.0);
    this.garageRimLight = rimLight;
    group.add(rimLight);

    // Freeze static garage showroom geometry matrices (zero visual change, eliminates per-frame matrix updates)
    group.updateMatrixWorld(true);
    group.traverse((obj) => {
      if (obj === group) return;
      obj.matrixAutoUpdate = false;
    });

    return group;
  }

  private buildRecordMarkerGroup(): THREE.Group {
    const group = new THREE.Group();
    const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
      this.recordMarkerGeos.push(g);
      return g;
    };
    const trackMat = <T extends THREE.Material>(m: T): T => {
      this.recordMarkerMats.push(m);
      return m;
    };
    const trackTex = <T extends THREE.Texture>(t: T): T => {
      this.recordMarkerTextures.push(t);
      return t;
    };

    const poleX = MAX_PLAYER_LATERAL + 1.58;

    const plinthGeo = trackGeo(new THREE.BoxGeometry(0.68, 0.44, 0.68));
    const poleGeo = trackGeo(new THREE.BoxGeometry(0.28, 5.4, 0.28));
    const accentBandGeo = trackGeo(new THREE.BoxGeometry(0.32, 0.55, 0.32));
    const beamGeo = trackGeo(new THREE.BoxGeometry(poleX * 2 + 0.6, 0.36, 0.34));
    const beaconGeo = trackGeo(new THREE.SphereGeometry(0.24, 14, 12));

    const darkSteelMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x18181b,
        metalness: 0.72,
        roughness: 0.32,
      }),
    );
    const amberPaintMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xb45309,
        emissiveIntensity: 0.45,
        metalness: 0.45,
        roughness: 0.28,
      }),
    );
    const beaconMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xfde047,
        emissive: 0xf59e0b,
        emissiveIntensity: 2.3,
        roughness: 0.18,
      }),
    );

    // Checkered flag canvas texture
    const flagCanvas = document.createElement('canvas');
    flagCanvas.width = 256;
    flagCanvas.height = 160;
    const fCtx = flagCanvas.getContext('2d');
    if (fCtx) {
      const cols = 8;
      const rows = 5;
      const cw = flagCanvas.width / cols;
      const ch = flagCanvas.height / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          fCtx.fillStyle = (r + c) % 2 === 0 ? '#f8fafc' : '#09090b';
          fCtx.fillRect(c * cw, r * ch, cw, ch);
        }
      }
      fCtx.fillStyle = '#f59e0b';
      fCtx.fillRect(0, 0, 12, flagCanvas.height);
    }
    const flagTex = trackTex(new THREE.CanvasTexture(flagCanvas));
    flagTex.colorSpace = THREE.SRGBColorSpace;
    const flagMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: flagTex,
        emissiveMap: flagTex,
        emissive: 0xffffff,
        emissiveIntensity: 0.24,
        roughness: 0.5,
        side: THREE.DoubleSide,
      }),
    );
    const flagGeo = trackGeo(new THREE.PlaneGeometry(1.5, 0.92));
    // Shift pivot to pole edge so wave rotates around flagpole edge
    flagGeo.translate(0.75, 0, 0);

    // Overhead Banner CanvasTexture ("REKOR NOKTASI")
    const bannerCanvas = document.createElement('canvas');
    bannerCanvas.width = 1024;
    bannerCanvas.height = 160;
    const bCtx = bannerCanvas.getContext('2d');
    if (bCtx) {
      bCtx.fillStyle = '#09090b';
      bCtx.fillRect(0, 0, 1024, 160);

      // Checkered border strips along top and bottom
      const sq = 32;
      for (let x = 0; x < 1024; x += sq) {
        const even = Math.floor(x / sq) % 2 === 0;
        bCtx.fillStyle = even ? '#f59e0b' : '#18181b';
        bCtx.fillRect(x, 0, sq, 18);
        bCtx.fillRect(x, 142, sq, 18);
      }

      bCtx.strokeStyle = '#fbbf24';
      bCtx.lineWidth = 4;
      bCtx.strokeRect(10, 22, 1004, 116);

      bCtx.fillStyle = '#fef3c7';
      bCtx.font = '800 66px system-ui, -apple-system, sans-serif';
      bCtx.textAlign = 'center';
      bCtx.textBaseline = 'middle';
      bCtx.fillText('REKOR NOKTASI', 512, 82);
    }
    const bannerTex = trackTex(new THREE.CanvasTexture(bannerCanvas));
    bannerTex.colorSpace = THREE.SRGBColorSpace;
    const bannerMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: bannerTex,
        emissiveMap: bannerTex,
        emissive: 0xffffff,
        emissiveIntensity: 0.55,
        roughness: 0.34,
        side: THREE.DoubleSide,
      }),
    );
    const bannerGeo = trackGeo(new THREE.PlaneGeometry(poleX * 2 - 0.5, 1.38));

    this.recordFlags = [];
    for (const side of [-1, 1]) {
      const px = side * poleX;
      const plinth = new THREE.Mesh(plinthGeo, darkSteelMat);
      plinth.position.set(px, 0.22, 0);
      group.add(plinth);

      const pole = new THREE.Mesh(poleGeo, darkSteelMat);
      pole.position.set(px, 2.7, 0);
      group.add(pole);

      for (const bandY of [1.2, 2.8, 4.3]) {
        const band = new THREE.Mesh(accentBandGeo, amberPaintMat);
        band.position.set(px, bandY, 0);
        group.add(band);
      }

      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.set(px, 5.64, 0);
      group.add(beacon);

      for (const flagY of [3.4, 4.45]) {
        const flag = new THREE.Mesh(flagGeo, flagMat);
        flag.position.set(px, flagY, 0);
        if (side > 0) {
          flag.rotation.y = Math.PI;
        }
        group.add(flag);
        this.recordFlags.push(flag);
      }
    }

    const beam = new THREE.Mesh(beamGeo, darkSteelMat);
    beam.position.set(0, 5.36, 0);
    group.add(beam);

    const banner = new THREE.Mesh(bannerGeo, bannerMat);
    banner.position.set(0, 4.82, 0.19);
    group.add(banner);

    return group;
  }

  private updateRecordMarker(dt: number, allowTrigger: boolean): void {
    const targetS = this.runStartBestRecordDistance;
    if (
      this.phase === 'garage' ||
      targetS < 80 ||
      this.playerS > targetS + 95 ||
      !this.road.sampleAtS(targetS, _trafficSample)
    ) {
      this.recordMarkerGroup.visible = false;
      return;
    }

    this.recordMarkerGroup.visible = true;
    _vecC.copy(_trafficSample.tangent).negate();
    _matBasis.makeBasis(
      _trafficSample.right,
      _trafficSample.normal,
      _vecC,
    );
    _quatA.setFromRotationMatrix(_matBasis);
    this.recordMarkerGroup.position.copy(_trafficSample.pos);
    this.recordMarkerGroup.quaternion.copy(_quatA);

    this.recordFlagTime += dt;
    for (let i = 0; i < this.recordFlags.length; i++) {
      const f = this.recordFlags[i];
      const baseRot = i >= 2 ? Math.PI : 0;
      const wave = Math.sin(this.recordFlagTime * 5.2 + i * 1.4) * 0.24;
      f.rotation.y = baseRot + wave;
      f.rotation.z = Math.cos(this.recordFlagTime * 3.8 + i) * 0.05;
    }

    if (
      allowTrigger &&
      !this.recordMarkerPassed &&
      this.playerS >= targetS
    ) {
      this.recordMarkerPassed = true;
      this.audio.playAchievementUnlock();
      this.emitCallout(
        'REKOR NOKTASI!',
        `${Math.round(targetS)} m Geçildi`,
        'amber',
      );
      _vecC
        .copy(_trafficSample.pos)
        .addScaledVector(_trafficSample.normal, 1.4);
      this.emitSparks(_vecC, 0, 26);
    }
  }

  private buildFinishLineGroup(): THREE.Group {
    const group = new THREE.Group();
    const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
      this.finishLineGeos.push(g);
      return g;
    };
    const trackMat = <T extends THREE.Material>(m: T): T => {
      this.finishLineMats.push(m);
      return m;
    };
    const trackTex = <T extends THREE.Texture>(t: T): T => {
      this.finishLineTextures.push(t);
      return t;
    };

    const poleX = MAX_PLAYER_LATERAL + 1.65;
    const roadSpan = poleX * 2;

    // Ground checkered racing finish strip lying flush on the asphalt
    const stripCanvas = document.createElement('canvas');
    stripCanvas.width = 512;
    stripCanvas.height = 128;
    const sCtx = stripCanvas.getContext('2d');
    if (sCtx) {
      const cols = 16;
      const rows = 4;
      const cw = stripCanvas.width / cols;
      const ch = stripCanvas.height / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          sCtx.fillStyle = (r + c) % 2 === 0 ? '#f8fafc' : '#09090b';
          sCtx.fillRect(c * cw, r * ch, cw, ch);
        }
      }
      sCtx.fillStyle = '#10b981';
      sCtx.fillRect(0, 0, 512, 8);
      sCtx.fillRect(0, 120, 512, 8);
    }
    const stripTex = trackTex(new THREE.CanvasTexture(stripCanvas));
    stripTex.colorSpace = THREE.SRGBColorSpace;
    const stripMat = trackMat(
      new THREE.MeshBasicMaterial({
        map: stripTex,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      }),
    );
    const stripGeo = trackGeo(new THREE.PlaneGeometry(roadSpan - 0.6, 2.4));
    stripGeo.rotateX(-Math.PI / 2);
    const stripMesh = new THREE.Mesh(stripGeo, stripMat);
    stripMesh.position.set(0, 0.05, 0);
    group.add(stripMesh);

    const plinthGeo = trackGeo(new THREE.BoxGeometry(0.76, 0.5, 0.76));
    const poleGeo = trackGeo(new THREE.BoxGeometry(0.32, 6.1, 0.32));
    const accentBandGeo = trackGeo(new THREE.BoxGeometry(0.38, 0.62, 0.38));
    const beamGeo = trackGeo(new THREE.BoxGeometry(roadSpan + 0.7, 0.42, 0.38));
    const beaconGeo = trackGeo(new THREE.SphereGeometry(0.28, 14, 12));

    const darkSteelMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x111827,
        metalness: 0.75,
        roughness: 0.28,
      }),
    );
    const emeraldGlowMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x059669,
        emissiveIntensity: 0.9,
        metalness: 0.35,
        roughness: 0.25,
      }),
    );
    const beaconMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x6ee7b7,
        emissive: 0x10b981,
        emissiveIntensity: 2.6,
        roughness: 0.16,
      }),
    );

    const flagCanvas = document.createElement('canvas');
    flagCanvas.width = 256;
    flagCanvas.height = 160;
    const fCtx = flagCanvas.getContext('2d');
    if (fCtx) {
      const cols = 8;
      const rows = 5;
      const cw = flagCanvas.width / cols;
      const ch = flagCanvas.height / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          fCtx.fillStyle = (r + c) % 2 === 0 ? '#ffffff' : '#09090b';
          fCtx.fillRect(c * cw, r * ch, cw, ch);
        }
      }
      fCtx.fillStyle = '#10b981';
      fCtx.fillRect(0, 0, 14, flagCanvas.height);
    }
    const flagTex = trackTex(new THREE.CanvasTexture(flagCanvas));
    flagTex.colorSpace = THREE.SRGBColorSpace;
    const flagMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: flagTex,
        emissiveMap: flagTex,
        emissive: 0xffffff,
        emissiveIntensity: 0.32,
        roughness: 0.45,
        side: THREE.DoubleSide,
      }),
    );
    const flagGeo = trackGeo(new THREE.PlaneGeometry(1.7, 1.02));
    flagGeo.translate(0.85, 0, 0);

    const bannerCanvas = document.createElement('canvas');
    bannerCanvas.width = 1024;
    bannerCanvas.height = 176;
    const bCtx = bannerCanvas.getContext('2d');
    if (bCtx) {
      bCtx.fillStyle = '#061512';
      bCtx.fillRect(0, 0, 1024, 176);

      const sq = 32;
      for (let x = 0; x < 1024; x += sq) {
        const even = Math.floor(x / sq) % 2 === 0;
        bCtx.fillStyle = even ? '#f8fafc' : '#09090b';
        bCtx.fillRect(x, 0, sq, 24);
        bCtx.fillRect(x, 152, sq, 24);
      }

      bCtx.strokeStyle = '#34d399';
      bCtx.lineWidth = 5;
      bCtx.strokeRect(10, 28, 1004, 120);

      bCtx.fillStyle = '#ecfdf5';
      bCtx.font = '900 74px system-ui, -apple-system, sans-serif';
      bCtx.textAlign = 'center';
      bCtx.textBaseline = 'middle';
      bCtx.fillText('BİTİŞ ÇİZGİSİ', 512, 90);
    }
    const bannerTex = trackTex(new THREE.CanvasTexture(bannerCanvas));
    bannerTex.colorSpace = THREE.SRGBColorSpace;
    const bannerMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: bannerTex,
        emissiveMap: bannerTex,
        emissive: 0xffffff,
        emissiveIntensity: 0.72,
        roughness: 0.3,
        side: THREE.DoubleSide,
      }),
    );
    const bannerGeo = trackGeo(new THREE.PlaneGeometry(roadSpan - 0.5, 1.56));

    this.finishLineFlags = [];
    for (const side of [-1, 1]) {
      const px = side * poleX;
      const plinth = new THREE.Mesh(plinthGeo, darkSteelMat);
      plinth.position.set(px, 0.25, 0);
      group.add(plinth);

      const pole = new THREE.Mesh(poleGeo, darkSteelMat);
      pole.position.set(px, 3.05, 0);
      group.add(pole);

      for (const bandY of [1.3, 3.1, 4.9]) {
        const band = new THREE.Mesh(accentBandGeo, emeraldGlowMat);
        band.position.set(px, bandY, 0);
        group.add(band);
      }

      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.set(px, 6.32, 0);
      group.add(beacon);

      for (const flagY of [3.75, 4.95]) {
        const flag = new THREE.Mesh(flagGeo, flagMat);
        flag.position.set(px, flagY, 0);
        if (side > 0) {
          flag.rotation.y = Math.PI;
        }
        group.add(flag);
        this.finishLineFlags.push(flag);
      }
    }

    const beam = new THREE.Mesh(beamGeo, darkSteelMat);
    beam.position.set(0, 6.02, 0);
    group.add(beam);

    const banner = new THREE.Mesh(bannerGeo, bannerMat);
    banner.position.set(0, 5.36, 0.22);
    group.add(banner);

    return group;
  }

  private updateFinishLine(dt: number): void {
    if (!this.activeCareerLevel || this.phase === 'garage') {
      this.finishLineGroup.visible = false;
      return;
    }
    const targetS = this.activeCareerLevel.targetDistanceMeters;
    if (
      this.playerS > targetS + 90 ||
      !this.road.sampleAtS(targetS, _trafficSample)
    ) {
      this.finishLineGroup.visible = false;
      return;
    }

    this.finishLineGroup.visible = true;
    _vecC.copy(_trafficSample.tangent).negate();
    _matBasis.makeBasis(
      _trafficSample.right,
      _trafficSample.normal,
      _vecC,
    );
    _quatA.setFromRotationMatrix(_matBasis);
    this.finishLineGroup.position.copy(_trafficSample.pos);
    this.finishLineGroup.quaternion.copy(_quatA);

    this.finishLineFlagTime += dt;
    for (let i = 0; i < this.finishLineFlags.length; i++) {
      const f = this.finishLineFlags[i];
      const baseRot = i >= 2 ? Math.PI : 0;
      const wave = Math.sin(this.finishLineFlagTime * 6.0 + i * 1.4) * 0.28;
      f.rotation.y = baseRot + wave;
      f.rotation.z = Math.cos(this.finishLineFlagTime * 4.2 + i) * 0.06;
    }
  }

  private collectCareerMetrics(): CareerRunMetrics {
    const maxInt = Math.max(1, this.carSpec.maxIntegrity);
    return {
      distanceMeters: this.distanceMeters,
      score: this.score,
      nearMissCount: this.nearMissCount,
      peakSpeedKmh: Math.max(this.careerPeakSpeedKmh, this.speedMs * 3.6),
      driftPoints: Math.round(this.totalDriftScore),
      runGold: this.runGold,
      cleanCurvesCount: this.cleanCurvesCount,
      integrityPercent: Math.round((this.integrity / maxInt) * 100),
      maxCombo: Math.max(this.careerMaxCombo, this.combo),
      elapsedSec: this.careerElapsedSec,
      roadEventsCount: this.careerRoadEventsCount,
      stayedInCockpit: this.careerStayedInCockpit && this.cameraMode === 'cockpit',
      cockpitNearMissCount: this.careerCockpitNearMissCount,
      usedBrake: this.careerUsedBrake,
      usedNitro: this.careerUsedNitro,
      droppedBelowMinSpeed: this.careerDroppedBelowMinSpeed,
      minSpeedGraceActive: this.careerElapsedSec < CAREER_MIN_SPEED_GRACE_SEC,
      oncomingMeters: this.careerOncomingMeters,
      highSpeedSeconds: this.careerHighSpeedSeconds,
    };
  }

  private buildCareerHudState(): ActiveCareerHudState | null {
    if (!this.activeCareerLevel) return null;
    const level = this.activeCareerLevel;
    const metrics = this.collectCareerMetrics();
    const m1 = evaluateCareerObjective(level.missions[0], metrics);
    const m2 = evaluateCareerObjective(level.missions[1], metrics);
    const minSpeedMission = level.missions.find((m) => m.kind === 'minSpeedHold');
    const remainingMeters = Math.max(
      0,
      Math.ceil(level.targetDistanceMeters - this.distanceMeters),
    );
    const progressRatio = THREE.MathUtils.clamp(
      this.distanceMeters / Math.max(1, level.targetDistanceMeters),
      0,
      1,
    );
    return {
      levelId: level.id,
      title: level.title,
      targetDistanceMeters: level.targetDistanceMeters,
      remainingMeters,
      progressRatio,
      elapsedSec: this.careerElapsedSec,
      minSpeedTargetKmh: minSpeedMission?.target,
      minSpeedGraceActive: metrics.minSpeedGraceActive,
      mission1: {
        id: m1.spec.id,
        title: m1.spec.title,
        shortLabel: m1.spec.shortLabel,
        progressText: m1.progressText,
        completed: m1.completed,
        failed: m1.failed,
      },
      mission2: {
        id: m2.spec.id,
        title: m2.spec.title,
        shortLabel: m2.spec.shortLabel,
        progressText: m2.progressText,
        completed: m2.completed,
        failed: m2.failed,
      },
    };
  }

  private triggerCareerVictory(): void {
    const level = this.activeCareerLevel;
    if (!level) return;

    if (this.missionDriftAccum >= 1) {
      this.missions.recordDelta('driftPoints', Math.floor(this.missionDriftAccum));
      this.missionDriftAccum = 0;
    }
    this.driftScore = 0;
    this.driftMultiplier = 1;
    this.driftDuration = 0;
    this.driftGraceTimer = 0;

    const metrics = this.collectCareerMetrics();
    const outcome = this.careerManager.recordVictory(level, metrics);

    if (outcome.rewardGoldAwarded > 0) {
      this.totalGold += outcome.rewardGoldAwarded;
    }
    if (outcome.rewardXpAwarded > 0) {
      this.lifetimeXp += outcome.rewardXpAwarded;
    }

    this.gameOverReason = 'career_win';
    this.phase = 'gameover';
    this.nitroActive = false;
    this.nitroRequested = false;
    this.drifting = false;
    this.cameraShake = 0.25;

    this.road.sampleAtS(this.playerS, _roadSample);
    this.crashElapsed = 0;
    this.crashSparkTimer = 0;
    this.crashSlideSpeed = Math.max(14, Math.min(28, this.speedMs * 0.52));
    this.crashYawVel = 0;
    this.crashLatVel = 0;
    this.crashRollTarget = 0;
    this.crashPitchTarget = 0;

    if (this.cameraMode === 'hood' || this.cameraMode === 'cockpit') {
      this.crashCamBasePos
        .copy(_roadSample.pos)
        .addScaledVector(_roadSample.right, this.playerLateral * 0.65)
        .addScaledVector(_roadSample.tangent, -5.8)
        .addScaledVector(_roadSample.normal, 2.35);
    } else {
      this.crashCamBasePos.copy(this.camPosCurrent);
    }
    this.crashCamBaseLook
      .copy(this.playerCar.root.position)
      .addScaledVector(_roadSample.normal, 0.8);
    this.crashCamRoll = 0;
    this.crashCamYaw = 0;
    this.cockpit.root.visible = false;
    this.playerCar.root.visible = true;

    this.audio.playAchievementUnlock();
    this.audio.playCheckpoint();
    this.audio.updateEngine(0, 0, false);
    this.audio.pauseMusic();
    this.emitSparks(this.playerCar.root.position, 0, 32);

    const finalScore = Math.floor(this.score);
    if (finalScore > this.bestScore) {
      this.bestScore = finalScore;
      try {
        localStorage.setItem(BEST_SCORE_KEY, String(this.bestScore));
      } catch {
        // ignore storage failure
      }
    }

    this.commitRunXp();
    if (this.missionDistAccum >= 1) {
      this.missions.recordDelta('distance', Math.floor(this.missionDistAccum));
      this.missionDistAccum = 0;
    }
    if (finalScore > 0) {
      this.handleMissionRewards(
        this.missions.recordPeak('runScore', finalScore),
      );
    }
    this.saveProgression();
    this.notifyProgression();
    this.missions.flushSave();
    this.callbacks.onMissionsChange?.(this.missions.getSnapshot());
    this.callbacks.onCareerProgressChange?.(this.careerManager.getSnapshot());
    this.callbacks.onCareerRunComplete?.(outcome);
    this.pushHud(true);
    this.callbacks.onMusicChange?.(this.audio.getMusicState());
    this.callbacks.onPhaseChange('gameover');
  }

  private getGarageFocusPreset(
    focus: GarageCameraFocus,
    aspect: number,
    collapsed: boolean,
  ): {
    yaw: number | null;
    pitch: number;
    dist: number;
    lookX: number;
    lookY: number;
    lookZ: number;
    fov: number;
    orbitSpeed: number;
  } {
    const isPortrait = aspect < 0.8;
    const scaleDist = collapsed ? 0.82 : 1.0;
    switch (focus) {
      case 'wheels':
        return {
          yaw: Math.PI * 0.59,
          pitch: 0.1,
          dist: (isPortrait ? 2.75 : 2.15) * scaleDist,
          lookX: 0.82,
          lookY: 0.36,
          lookZ: -1.32,
          fov: isPortrait ? 44 : 40,
          orbitSpeed: 0,
        };
      case 'spoiler':
        return {
          yaw: 0.56,
          pitch: 0.24,
          dist: (isPortrait ? 4.35 : 3.55) * scaleDist,
          lookX: 0,
          lookY: 0.84,
          lookZ: 1.55,
          fov: isPortrait ? 46 : 43,
          orbitSpeed: 0,
        };
      case 'bodykit':
        return {
          yaw: Math.PI - 0.68,
          pitch: 0.14,
          dist: (isPortrait ? 5.75 : 4.65) * scaleDist,
          lookX: 0.12,
          lookY: 0.38,
          lookZ: -0.55,
          fov: isPortrait ? 47 : 44,
          orbitSpeed: 0,
        };
      case 'livery':
        return {
          yaw: Math.PI - 0.86,
          pitch: 0.34,
          dist: (isPortrait ? 6.9 : 5.45) * scaleDist,
          lookX: 0,
          lookY: 0.52,
          lookZ: -0.05,
          fov: isPortrait ? 47 : 44,
          orbitSpeed: 0.18,
        };
      case 'headlight':
        return {
          yaw: Math.PI - 0.38,
          pitch: 0.14,
          dist: (isPortrait ? 4.35 : 3.45) * scaleDist,
          lookX: 0,
          lookY: 0.5,
          lookZ: -1.75,
          fov: isPortrait ? 46 : 43,
          orbitSpeed: 0,
        };
      case 'neon':
        return {
          yaw: 1.08,
          pitch: 0.15,
          dist: (isPortrait ? 6.5 : 5.25) * scaleDist,
          lookX: 0,
          lookY: 0.26,
          lookZ: 0,
          fov: isPortrait ? 48 : 45,
          orbitSpeed: 0.16,
        };
      case 'plate':
        return {
          yaw: 0.16,
          pitch: 0.11,
          dist: (isPortrait ? 3.25 : 2.55) * scaleDist,
          lookX: 0,
          lookY: 0.48,
          lookZ: 2.0,
          fov: isPortrait ? 45 : 42,
          orbitSpeed: 0,
        };
      case 'exhaust':
        return {
          yaw: 0.44,
          pitch: 0.14,
          dist: (isPortrait ? 4.8 : 3.85) * scaleDist,
          lookX: 0,
          lookY: 0.38,
          lookZ: 1.85,
          fov: isPortrait ? 46 : 44,
          orbitSpeed: 0,
        };
      case 'smoke':
        return {
          yaw: 0.88,
          pitch: 0.16,
          dist: (isPortrait ? 5.65 : 4.55) * scaleDist,
          lookX: 0.32,
          lookY: 0.42,
          lookZ: 1.25,
          fov: isPortrait ? 47 : 44,
          orbitSpeed: 0,
        };
      case 'roof':
        return {
          yaw: Math.PI - 0.62,
          pitch: 0.36,
          dist: (isPortrait ? 3.9 : 3.1) * scaleDist,
          lookX: 0,
          lookY: 1.38,
          lookZ: 0.08,
          fov: isPortrait ? 45 : 42,
          orbitSpeed: 0.16,
        };
      case 'steering':
        return {
          yaw: 0,
          pitch: 0.08,
          dist: 4.5,
          lookX: 0,
          lookY: 1.15,
          lookZ: -3.2,
          fov: isPortrait ? 54 : 48,
          orbitSpeed: 0,
        };
      case 'mirror':
        return {
          yaw: 0,
          pitch: 0.06,
          dist: 4.5,
          lookX: 0,
          lookY: 1.25,
          lookZ: -3.2,
          fov: isPortrait ? 52 : 48,
          orbitSpeed: 0,
        };
      default:
        return {
          yaw: null,
          pitch: 0.22,
          dist: collapsed
            ? isPortrait
              ? Math.max(6.5, 3.45 / Math.max(0.46, aspect))
              : 5.1
            : isPortrait
              ? Math.max(7.6, 4.1 / Math.max(0.46, aspect))
              : aspect < 1.15
                ? 6.35
                : 5.95,
          lookX: 0,
          lookY: 0.42,
          lookZ: 0,
          fov: collapsed ? 44 : isPortrait ? 48 : 45,
          orbitSpeed: 0.28,
        };
    }
  }

  private stepGaragePreview(dt: number): void {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    const aspect = width / Math.max(1, height);
    const preset = this.getGarageFocusPreset(
      this.garageFocus,
      aspect,
      this.garageMenuCollapsed,
    );

    if (!this.garageDragging) {
      if (this.garageFocusTransitioning) {
        if (preset.yaw !== null) {
          // Shortest angular arc so camera never spins the long way around
          const diff =
            (((preset.yaw - this.garageYaw) % (Math.PI * 2)) + Math.PI * 3) %
              (Math.PI * 2) -
            Math.PI;
          const step = diff * (1 - Math.exp(-7.5 * dt));
          this.garageYaw += step;
          if (
            Math.abs(diff) < 0.015 &&
            Math.abs(preset.pitch - this.garagePitch) < 0.01
          ) {
            this.garageFocusTransitioning = false;
          }
        } else {
          this.garageYaw += preset.orbitSpeed * dt;
          if (Math.abs(preset.pitch - this.garagePitch) < 0.01) {
            this.garageFocusTransitioning = false;
          }
        }
        this.garagePitch = THREE.MathUtils.damp(
          this.garagePitch,
          preset.pitch,
          7.5,
          dt,
        );
      } else if (preset.orbitSpeed > 0) {
        this.garageYaw += preset.orbitSpeed * dt;
      }
    }

    let targetOffsetX = 0;
    let targetOffsetY = 0;
    if (!this.garageMenuCollapsed) {
      targetOffsetX = 0;
      targetOffsetY = Math.min(height * 0.2, 150);
    }

    this.garageDist = THREE.MathUtils.damp(this.garageDist, preset.dist, 7.5, dt);
    this.garageLookX = THREE.MathUtils.damp(
      this.garageLookX,
      preset.lookX,
      7.5,
      dt,
    );
    this.garageLookY = THREE.MathUtils.damp(
      this.garageLookY,
      preset.lookY,
      7.5,
      dt,
    );
    this.garageLookZ = THREE.MathUtils.damp(
      this.garageLookZ,
      preset.lookZ,
      7.5,
      dt,
    );
    this.garageViewOffsetX = THREE.MathUtils.damp(
      this.garageViewOffsetX,
      targetOffsetX,
      8.5,
      dt,
    );
    this.garageViewOffsetY = THREE.MathUtils.damp(
      this.garageViewOffsetY,
      targetOffsetY,
      8.5,
      dt,
    );

    let projDirty = false;
    if (Math.abs(this.camera.fov - preset.fov) > 0.05) {
      this.camera.fov = THREE.MathUtils.damp(
        this.camera.fov,
        preset.fov,
        8.5,
        dt,
      );
      projDirty = true;
    }

    if (
      Math.abs(this.garageViewOffsetX) > 0.25 ||
      Math.abs(this.garageViewOffsetY) > 0.25
    ) {
      this.camera.setViewOffset(
        width,
        height,
        this.garageViewOffsetX,
        this.garageViewOffsetY,
        width,
        height,
      );
    } else if (this.camera.view?.enabled) {
      this.camera.clearViewOffset();
    } else if (projDirty) {
      this.camera.updateProjectionMatrix();
    }

    const cosP = Math.cos(this.garagePitch);
    const camX =
      this.garageLookX + Math.sin(this.garageYaw) * cosP * this.garageDist;
    const camY = Math.max(
      0.26,
      this.garageLookY + Math.sin(this.garagePitch) * this.garageDist,
    );
    const camZ =
      this.garageLookZ + Math.cos(this.garageYaw) * cosP * this.garageDist;

    this.camera.position.set(camX, camY, camZ);
    this.camera.lookAt(this.garageLookX, this.garageLookY, this.garageLookZ);
    this.skyDome.position.copy(this.camera.position);
    this.sunLight.position.set(16, 18, 12);
    this.sunLight.target.position.set(0, 0, 0);
    this.sunLight.target.updateMatrixWorld();
    _sunDiscOffset.set(180, 95, -520);
    this.sunDisc.position.copy(this.camera.position).add(_sunDiscOffset);
    this.sunDisc.lookAt(this.camera.position);

    const nowSec = performance.now() * 0.001;
    const isInteriorInspect =
      this.garageFocus === 'steering' || this.garageFocus === 'mirror';

    if (isInteriorInspect) {
      // Live 3D Cockpit Showroom Inspection (Steering Wheel & Swinging Mirror Ornament)
      // Negative Z pushes cabinOffset further forward away from camera so the entire object fits cleanly
      this.playerCar.root.visible = false;
      this.cockpit.root.visible = true;
      const isPortrait = aspect < 0.8;
      let targetCockpitY: number;
      let targetCockpitZ: number;
      if (this.garageFocus === 'steering') {
        targetCockpitY = isPortrait ? 0.245 : 0.235;
        if (isPortrait) {
          const halfFovTan = Math.tan(THREE.MathUtils.degToRad(54 * 0.5));
          const reqDist = Math.max(
            0.94,
            0.24 / Math.max(0.18, halfFovTan * Math.max(0.42, aspect)),
          );
          targetCockpitZ = -(reqDist - 0.5);
        } else {
          targetCockpitZ = this.garageMenuCollapsed ? -0.22 : -0.3;
        }
      } else {
        targetCockpitY = isPortrait ? -0.255 : -0.258;
        if (isPortrait) {
          const halfFovTan = Math.tan(THREE.MathUtils.degToRad(52 * 0.5));
          const reqDist = Math.max(
            0.9,
            0.165 / Math.max(0.18, halfFovTan * Math.max(0.42, aspect)),
          );
          targetCockpitZ = -(reqDist - 0.635);
        } else {
          targetCockpitZ = this.garageMenuCollapsed ? -0.09 : -0.16;
        }
      }
      this.cockpit.cabinOffset.position.set(0, targetCockpitY, targetCockpitZ);
      this.cockpit.cabinOffset.rotation.set(
        this.garageFocus === 'mirror' ? -0.025 : 0.03,
        0,
        0,
      );
      const demoSteer =
        this.garageFocus === 'steering' ? Math.sin(nowSec * 1.35) * 0.52 : 0;
      this.cockpit.wheelGroup.rotation.z = -demoSteer;
      const demoRpm = 0.36 + (0.5 + 0.5 * Math.sin(nowSec * 1.85)) * 0.64;
      const rpmScale = Math.max(0.08, demoRpm);
      this.cockpit.rpmBar.scale.x = rpmScale;
      this.cockpit.rpmBar.position.x = -0.12 * (1 - rpmScale);
      const demoLateral =
        this.garageFocus === 'mirror'
          ? Math.sin(nowSec * 2.25) * 0.95
          : Math.sin(nowSec * 1.35) * 0.35;
      this.cockpit.updateInterior(dt, nowSec, demoLateral, 0, demoRpm, 115);
    } else {
      this.cockpit.root.visible = false;
      this.cockpit.cabinOffset.position.set(0, 0, 0);
      this.cockpit.cabinOffset.rotation.set(0, 0, 0);
      this.playerCar.root.visible = true;
    }

    this.playerCar.updateEffects(nowSec, 12, 0);
    this.playerCar.root.updateMatrixWorld(true);

    if (this.garagePreviewEffect === 'nitro') {
      const pulse = 0.95 + Math.sin(nowSec * 30) * 0.24;
      for (const fm of this.playerCar.flameMeshes) {
        fm.visible = true;
        fm.scale.set(1.08, pulse * 1.28, 1.08);
      }
      this.exhaustFlameTimer += dt;
      while (this.exhaustFlameTimer >= 0.025) {
        this.exhaustFlameTimer -= 0.025;
        const tips = this.playerCar.flameMeshes;
        for (let t = 0; t < tips.length; t++) {
          tips[t].getWorldPosition(_vecC);
          let fl: ExhaustFlameParticle;
          if (this.exhaustFlames.length >= this.maxExhaustFlames) {
            fl = this.exhaustFlames.shift()!;
          } else if (this.exhaustFlamePool.length > 0) {
            fl = this.exhaustFlamePool.pop()!;
          } else {
            fl = {
              pos: new THREE.Vector3(),
              vel: new THREE.Vector3(),
              life: 0,
              maxLife: 0.24,
              size: 0.26,
              mode: 'nitro',
            };
          }
          fl.pos.set(
            _vecC.x + (Math.random() - 0.5) * 0.05,
            _vecC.y + (Math.random() - 0.5) * 0.04,
            _vecC.z + 0.14,
          );
          fl.vel.set(
            (Math.random() - 0.5) * 0.45,
            0.2 + Math.random() * 0.35,
            4.6 + Math.random() * 2.2,
          );
          fl.life = 0;
          fl.maxLife = 0.2 + Math.random() * 0.08;
          fl.size = 0.26 + Math.random() * 0.14;
          fl.mode = 'nitro';
          this.exhaustFlames.push(fl);
        }
      }
    } else if (this.garagePreviewEffect === 'smoke') {
      for (const fm of this.playerCar.flameMeshes) {
        fm.visible = false;
      }
      this.wheelSpin += 18 * dt;
      for (let i = 2; i < this.playerCar.wheelSpinGroups.length; i++) {
        this.playerCar.wheelSpinGroups[i].rotation.x = -this.wheelSpin;
      }
      this.garageSmokeTimer += dt;
      while (this.garageSmokeTimer >= 0.048) {
        this.garageSmokeTimer -= 0.048;
        for (const tireOff of [-0.88, 0.88]) {
          let sm: SmokeParticle;
          if (this.smokes.length >= this.maxSmokes) {
            sm = this.smokes.shift()!;
          } else if (this.smokePool.length > 0) {
            sm = this.smokePool.pop()!;
          } else {
            sm = {
              pos: new THREE.Vector3(),
              vel: new THREE.Vector3(),
              life: 0,
              maxLife: 0.55,
              size: 0.65,
              color: new THREE.Color(0xe4e4e7),
            };
          }
          sm.pos.set(
            tireOff + (Math.random() - 0.5) * 0.16,
            0.16 + Math.random() * 0.08,
            1.45 + (Math.random() - 0.5) * 0.18,
          );
          sm.vel.set(
            tireOff * 0.35 + (Math.random() - 0.5) * 0.55,
            0.85 + Math.random() * 0.55,
            1.35 + Math.random() * 0.85,
          );
          sm.life = 0;
          sm.maxLife = 0.55 + Math.random() * 0.25;
          sm.size = 0.58 + Math.random() * 0.32;
          this.fillActiveSmokeColor(sm.color);
          this.smokes.push(sm);
        }
      }
    } else {
      for (const fm of this.playerCar.flameMeshes) {
        fm.visible = false;
      }
    }

    if (
      this.smokes.length > 0 ||
      this.exhaustFlames.length > 0 ||
      this.smokeMesh.count > 0 ||
      this.exhaustFlamesMesh.count > 0
    ) {
      this.stepParticles(dt);
    }
  }

  private stepMenuPreview(dt: number): void {
    if (Math.abs(this.camera.fov - 64) > 0.05) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, 64, 10, dt);
      this.camera.updateProjectionMatrix();
    }

    this.menuOrbitTime += dt;
    this.playerS += 16 * dt;
    this.road.update(this.playerS, dt);
    this.road.sampleAtS(this.playerS, _roadSample);
    this.playerLateral = Math.sin(this.menuOrbitTime * 0.35) * 1.5;
    this.targetLateral = this.playerLateral;

    this.wheelSpin += (16 / 0.34) * dt;
    for (const w of this.playerCar.wheelSpinGroups) {
      w.rotation.x = -this.wheelSpin;
    }

    this.cockpit.root.visible = false;
    this.playerCar.root.visible = true;
    this.playerCar.updateEffects(performance.now() * 0.001);
    const menuSteerYaw = -Math.cos(this.menuOrbitTime * 0.35) * 0.035;
    this.placeCarOnRoad(_roadSample, this.playerLateral, menuSteerYaw, 0, 0);

    const angle = Math.sin(this.menuOrbitTime * 0.28) * 0.42;
    const camRightOff = this.playerLateral + Math.sin(angle) * 5.2;
    const camBackOff = Math.cos(angle) * 7.8;
    _vecA
      .copy(_roadSample.pos)
      .addScaledVector(_roadSample.right, camRightOff)
      .addScaledVector(_roadSample.tangent, -camBackOff)
      .addScaledVector(_roadSample.normal, 2.35);

    this.road.sampleAtS(this.playerS + 10, _lookRoadSample);
    _vecB
      .copy(_lookRoadSample.pos)
      .addScaledVector(_lookRoadSample.right, this.playerLateral * 0.35)
      .addScaledVector(_lookRoadSample.normal, 1.0);

    this.camPosCurrent.copy(_vecA);
    this.camLookCurrent.copy(_vecB);
    this.camera.position.copy(_vecA);
    this.camera.lookAt(_vecB);
    this.streaksMesh.count = 0;
    this.updateSkyAndSun(_vecA);

    this.updateTraffic(dt, false);
    this.roadEvents.spawnAhead(this.playerS + 320);
    this.roadEvents.update(
      dt,
      this.road,
      this.playerS,
      this.playerLateral,
      0,
      false,
    );
    this.spawnCoinsAhead(this.playerS + 320);
    this.spawnNitrosAhead(this.playerS + 320);
    this.spawnRepairsAhead(this.playerS + 320);
    this.spawnMagnetsAhead(this.playerS + 320);
    this.spawnRampagesAhead(this.playerS + 320);
    this.updateCoins(dt, false);
    this.updateNitros(dt, false);
    this.updateRepairs(false);
    this.updateMagnets(false);
    this.updateRampages(dt, false);
    this.updateRecordMarker(dt, false);
    this.stepRain(dt);
    this.recenterIfNeeded();
  }

  private stepSimulation(dt: number): void {
    this.scrapeCooldown = Math.max(0, this.scrapeCooldown - dt);
    this.guardrailHitCooldown = Math.max(0, this.guardrailHitCooldown - dt);
    this.damageRegenDelay = Math.max(0, this.damageRegenDelay - dt);
    this.reviveInvulnTimer = Math.max(0, this.reviveInvulnTimer - dt);
    this.cameraShake = THREE.MathUtils.damp(this.cameraShake, 0, 7.5, dt);

    if (this.combo > 1) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 1;
        this.comboTimer = 0;
      }
    }

    if (this.keyLeft) this.targetLateral -= 11.2 * dt;
    if (this.keyRight) this.targetLateral += 11.2 * dt;
    if (Math.abs(this.tiltSteerInput) > 0.001) {
      this.targetLateral += this.tiltSteerInput * 13.8 * dt;
    }
    this.targetLateral = THREE.MathUtils.clamp(
      this.targetLateral,
      -MAX_PLAYER_LATERAL,
      MAX_PLAYER_LATERAL,
    );

    const effectiveThrottle = this.keyUp
      ? 1
      : this.keyDown
        ? -1
        : this.throttleInput;

    if (this.magnetTimer > 0) {
      this.magnetTimer = Math.max(0, this.magnetTimer - dt);
    }
    if (this.nitroPickupBoostTimer > 0) {
      this.nitroPickupBoostTimer = Math.max(0, this.nitroPickupBoostTimer - dt);
    }

    if (this.rampageTimer > 0) {
      this.rampageTimer = Math.max(0, this.rampageTimer - dt);
      if (this.rampageTimer > 0 && this.rampageTimer <= 3) {
        const step = Math.ceil(this.rampageTimer) as 3 | 2 | 1;
        if (step < this.rampageCountdownStep) {
          this.rampageCountdownStep = step;
          this.audio.playCountdownBeep(step);
          this.callbacks.onImpact?.(0.28);
          this.pushHud(true);
        }
      } else if (this.rampageTimer <= 0) {
        this.rampageCountdownStep = 0;
        this.reviveInvulnTimer = Math.max(this.reviveInvulnTimer, 1.4);
        this.audio.playRampageEnd();
        this.emitCallout('YIKIM MODU BİTTİ', 'Normal Hıza Dönüldü', 'cyan');
        this.pushHud(true);
      }
    }

    const upgrades =
      this.carUpgrades[this.carModelId] || DEFAULT_CAR_UPGRADES();
    const nitroMax = this.getActiveNitroMax();

    // Nitro Boost handling: 0..nitroMax (100..200) tank; drains to 0, then forces deactivation.
    // Higher Nitro Tank levels slow drain rate; Nitro Max Capacity power-up expands total tank size level by level.
    const nitroDrainRate = getNitroDrainRatePerSec(upgrades.nitroTank);
    if (this.nitroRequested) {
      if (this.nitro > 0) {
        this.nitroActive = true;
        this.nitro = Math.max(0, this.nitro - nitroDrainRate * dt);
        if (this.nitro <= 0) {
          this.nitro = 0;
          this.nitroActive = false;
          this.nitroRequested = false;
          this.pushHud(true);
        }
      } else {
        this.nitro = 0;
        this.nitroActive = false;
        this.nitroRequested = false;
        this.pushHud(true);
      }
    } else {
      this.nitroActive = false;
      this.nitro = Math.min(
        nitroMax,
        this.nitro + (3.2 + upgrades.nitroPower * 0.65) * dt,
      );
    }

    // Update Twin Exhaust Flame Cones
    const rampageActive = this.rampageTimer > 0;
    const flameBoostScale =
      (1 + upgrades.nitroPower * 0.14) * (rampageActive ? 1.35 : 1);
    for (let f = 0; f < this.playerCar.flameMeshes.length; f++) {
      const flame = this.playerCar.flameMeshes[f];
      flame.visible = this.nitroActive || rampageActive;
      if (this.nitroActive || rampageActive) {
        const pulse = (0.85 + Math.random() * 0.55) * flameBoostScale;
        flame.scale.set(
          (0.9 + Math.random() * 0.2) * (1 + upgrades.nitroPower * 0.06),
          0.9 * (1 + upgrades.nitroPower * 0.06),
          pulse,
        );
      }
    }

    // Speed Dynamics (with cached Engine, Nitro, Wheel, Body Kit & Spoiler specs — zero per-frame Array.find)
    const wheelConfig = this.carWheels[this.carModelId];
    const customConfig = this.carCustom[this.carModelId];
    const wStyle = wheelConfig?.style ?? null;
    const bKit = customConfig?.bodyKit ?? null;
    const spId = customConfig?.spoiler ?? null;
    if (
      this.cachedBonusCarId !== this.carModelId ||
      this.cachedBonusWheelStyle !== wStyle ||
      this.cachedBonusKitId !== bKit ||
      this.cachedBonusSpoilerId !== spId
    ) {
      this.cachedBonusCarId = this.carModelId;
      this.cachedBonusWheelStyle = wStyle;
      this.cachedBonusKitId = bKit;
      this.cachedBonusSpoilerId = spId;
      this.cachedWheelSpec =
        WHEEL_STYLES.find((w) => w.id === wStyle) || WHEEL_STYLES[0];
      this.cachedKitSpec =
        BODY_KITS.find((k) => k.id === bKit) || BODY_KITS[0];
      this.cachedSpoilerSpec =
        SPOILERS.find((s) => s.id === spId) || SPOILERS[0];
    }
    const wheelSpec = this.cachedWheelSpec;
    const kitSpec = this.cachedKitSpec;
    const spoilerSpec = this.cachedSpoilerSpec;
    const progressionBonus = Math.min(20, this.distanceMeters / 170);
    const engineUpgradeBonus = upgrades.engine * 1.4;
    const baseCruiseMs =
      31 +
      progressionBonus +
      this.carSpec.topSpeedBonusMs +
      engineUpgradeBonus +
      wheelSpec.speedBonusMs +
      kitSpec.speedBonusMs +
      spoilerSpec.speedBonusMs;

    if (this.slickTimer > 0) {
      this.slickTimer = Math.max(0, this.slickTimer - dt);
    }
    if (this.boostPadTimer > 0) {
      this.boostPadTimer = Math.max(0, this.boostPadTimer - dt);
    }

    let targetSpeedMs = baseCruiseMs;
    if (this.nitroActive) {
      targetSpeedMs = baseCruiseMs + 19 + upgrades.nitroPower * 2.2;
    } else if (effectiveThrottle > 0.15) {
      targetSpeedMs = baseCruiseMs + 11 * effectiveThrottle;
    } else if (effectiveThrottle < -0.15) {
      targetSpeedMs = Math.max(18, baseCruiseMs + 16 * effectiveThrottle);
    }
    if (this.boostPadTimer > 0) {
      targetSpeedMs += 11.5;
    }
    if (this.nitroPickupBoostTimer > 0) {
      targetSpeedMs +=
        getNitroPickupSpeedBonusKmh(this.powerUpUpgrades.nitro.primary) / 3.6;
    }
    if (rampageActive) {
      const rampMult = getRampageSpeedMultiplier(
        this.powerUpUpgrades.rampage.secondary,
      );
      const rampCap = Math.min(
        185,
        134 + this.powerUpUpgrades.rampage.secondary * 10,
      );
      targetSpeedMs = Math.min(rampCap, targetSpeedMs * rampMult);
    }

    const accelLambda = rampageActive
      ? 4.6
      : this.nitroActive || this.boostPadTimer > 0
        ? 2.8
        : this.speedMs > targetSpeedMs + 14
          ? 2.8
          : effectiveThrottle < -0.15
            ? 3.5
            : 1.25;
    this.speedMs = THREE.MathUtils.damp(
      this.speedMs,
      targetSpeedMs,
      accelLambda,
      dt,
    );

    this.playerCar.tailLightMaterial.emissiveIntensity =
      effectiveThrottle < -0.15 ? 4.5 : 2.1;

    if (this.activeCareerLevel) {
      if (this.nitroActive && !this.careerUsedNitro) {
        this.careerUsedNitro = true;
        if (this.activeCareerLevel.missions.some((m) => m.kind === 'noNitro')) {
          this.emitCallout('NİTRO KULLANILDI!', 'Nitrosüz görev kaybedildi', 'rose');
        }
      }
      if (effectiveThrottle < -0.15) {
        this.careerBrakeHoldSec += dt;
        if (this.careerBrakeHoldSec > 0.08 && !this.careerUsedBrake) {
          this.careerUsedBrake = true;
          if (this.activeCareerLevel.missions.some((m) => m.kind === 'noBrake')) {
            this.emitCallout('FREN KULLANILDI!', 'Frensiz görev kaybedildi', 'rose');
          }
        }
      } else {
        this.careerBrakeHoldSec = 0;
      }
    }

    this.road.sampleAtS(this.playerS, _roadSample);

    // Airborne parabolic jump physics
    if (this.playerHeight > 0 || this.playerVelY !== 0) {
      this.playerVelY -= 24.5 * dt;
      this.playerHeight += this.playerVelY * dt;
      if (this.playerHeight <= 0) {
        this.playerHeight = 0;
        this.playerVelY = 0;
        this.cameraShake = Math.max(this.cameraShake, 0.28);
        this.emitSparks(this.playerCar.root.position, 0, 12);
        if (this.driftScore > 0) {
          this.driftGraceTimer = this.driftGraceDuration;
        }
      }
    }

    // Centrifugal curve drift weighted by car grip + Tires + Wheel + Kit + Spoiler (reduced on Slick & Wet Asphalt!)
    const roadWet = this.getEffectiveRoadWetness();
    const slickGripFactor =
      (this.slickTimer > 0 ? 0.58 : 1.0) * (1 - roadWet * 0.28);
    const slickSteerFactor =
      (this.slickTimer > 0 ? 0.68 : 1.0) * (1 - roadWet * 0.22);
    const effectiveGrip =
      (this.carSpec.cornerGrip +
        upgrades.tires * 0.06 +
        wheelSpec.gripBonus +
        kitSpec.gripBonus +
        spoilerSpec.gripBonus) *
      slickGripFactor;
    const effectiveSteer =
      (this.carSpec.steeringResponsiveness +
        upgrades.tires * 0.55 +
        wheelSpec.steerBonus) *
      slickSteerFactor;
    const centrifugalPush =
      (-_roadSample.curvature * this.speedMs * this.speedMs * 0.011) /
      Math.max(0.35, effectiveGrip);
    this.targetLateral = THREE.MathUtils.clamp(
      this.targetLateral + centrifugalPush * dt,
      -MAX_PLAYER_LATERAL - 0.35,
      MAX_PLAYER_LATERAL + 0.35,
    );

    const prevLateral = this.playerLateral;
    this.playerLateral = THREE.MathUtils.damp(
      this.playerLateral,
      this.targetLateral,
      effectiveSteer,
      dt,
    );
    this.lateralVel = (this.playerLateral - prevLateral) / dt;

    // Cornering Drift State, Live Drift Score & Tire Smoke (airborne ramp jumps preserve & grow drift streak)
    const lateralG = Math.abs(_roadSample.curvature * this.speedMs * this.speedMs);
    const steerNorm = THREE.MathUtils.clamp(this.lateralVel / 10.5, -1, 1);
    const wetLateralThreshold = 14.5 - roadWet * 3.4;
    const wetSteerThreshold = 0.55 - roadWet * 0.13;
    const isAirborneJump = this.playerHeight > 0.05;
    const isCorneringHard =
      !isAirborneJump &&
      (lateralG > wetLateralThreshold ||
        Math.abs(steerNorm) > wetSteerThreshold ||
        this.slickTimer > 0) &&
      this.speedMs > 28;
    const isAirborneDriftBoost = isAirborneJump && this.speedMs > 18;
    this.drifting = isCorneringHard || isAirborneDriftBoost;

    if (isCorneringHard || isAirborneDriftBoost) {
      if (isCorneringHard) {
        this.smokeTimer += dt;
        if (this.smokeTimer > 0.045) {
          this.smokeTimer = 0;
          this.emitTireSmoke(_roadSample);
        }
      }

      this.driftDuration += isAirborneDriftBoost ? dt * 1.15 : dt;
      this.driftGraceTimer = this.driftGraceDuration;
      const driftIntensity = isAirborneDriftBoost
        ? 1.25
        : THREE.MathUtils.clamp(
            lateralG / 20 + Math.abs(steerNorm) * 0.65,
            0.55,
            2.2,
          );
      const driftSpeedFactor = THREE.MathUtils.clamp(
        this.speedMs / 36,
        0.75,
        2.0,
      );
      const wetDriftBonus = isAirborneDriftBoost ? 1 : 1 + roadWet * 0.22;
      const driftGain =
        145 * driftIntensity * driftSpeedFactor * wetDriftBonus * dt;
      this.driftScore += driftGain;

      const { mult: nextDriftMult } = this.getDriftMultiplierState();
      if (nextDriftMult > this.driftMultiplier) {
        this.driftMultiplier = nextDriftMult;
        if (nextDriftMult >= 2) {
          this.boostCombo(1);
        }
      }
      if (this.combo > 1) {
        this.comboTimer = Math.max(this.comboTimer, 2.0);
      }

      // Bank drift points continuously so straightaways can hold the streak constant without losing credit
      const bankedDelta = driftGain * this.driftMultiplier;
      this.score += 20 * this.combo * dt + bankedDelta;
      this.totalDriftScore += bankedDelta;
      this.missionDriftAccum += bankedDelta;
      if (this.missionDriftAccum >= 120) {
        const wholeDrift = Math.floor(this.missionDriftAccum);
        this.missionDriftAccum -= wholeDrift;
        this.handleMissionRewards(
          this.missions.recordDelta('driftPoints', wholeDrift),
        );
      }

      this.nitro = Math.min(
        nitroMax,
        this.nitro + (5.5 + upgrades.nitroPower * 0.6) * dt,
      );
    } else if (this.driftScore > 0) {
      // Hold drift score & multiplier constant while driving straight (only resets on collision)
      this.driftGraceTimer = this.driftGraceDuration;
    }

    // Guardrail contact (meaningful initial impact + heavy grinding drain)
    if (Math.abs(this.playerLateral) > MAX_PLAYER_LATERAL - 0.05) {
      const side = Math.sign(this.playerLateral);
      this.playerLateral = side * (MAX_PLAYER_LATERAL - 0.05);
      this.targetLateral = THREE.MathUtils.clamp(
        this.targetLateral,
        -MAX_PLAYER_LATERAL,
        MAX_PLAYER_LATERAL,
      );
      this.curveScraped = true;
      this.combo = 1;
      this.comboTimer = 0;
      if (this.driftScore >= 80) {
        this.emitCallout('Drift İptal', 'Bariyer Teması', 'rose');
      }
      this.driftScore = 0;
      this.driftMultiplier = 1;
      this.driftDuration = 0;
      this.driftGraceTimer = 0;

      if (this.rampageTimer > 0) {
        // Invincible against guardrails during Rampage Mode
        this.playerLateral = side * (MAX_PLAYER_LATERAL - 0.18);
        this.lateralVel = -side * Math.max(2.0, Math.abs(this.lateralVel) * 0.35);
        this.cameraShake = Math.max(this.cameraShake, 0.25);
        if (this.scrapeCooldown <= 0) {
          this.scrapeCooldown = 0.14;
          _vecC
            .copy(_roadSample.pos)
            .addScaledVector(_roadSample.right, side * (MAX_PLAYER_LATERAL + 0.9));
          this.emitSparks(_vecC, side, 12);
        }
      } else if (this.reviveInvulnTimer <= 0) {
        const speedFactor = THREE.MathUtils.clamp(
          (this.speedMs - 14) / 46,
          0.4,
          1.5,
        );

        if (this.guardrailHitCooldown <= 0) {
          const slamFactor = THREE.MathUtils.clamp(
            Math.abs(this.lateralVel) / 6.0,
            0.45,
            1.35,
          );
          const impactDmg = Math.round(16 + 15 * speedFactor * slamFactor);
          this.integrity = Math.max(0, this.integrity - impactDmg);
          this.noHitDistMeters = 0;
          this.noHitDistLastReported = 0;
          this.guardrailHitCooldown = 0.55;
          this.damageRegenDelay = 3.5;

          this.playerLateral = side * (MAX_PLAYER_LATERAL - 0.22);
          this.targetLateral = THREE.MathUtils.clamp(
            this.targetLateral - side * 0.45,
            -MAX_PLAYER_LATERAL + 0.2,
            MAX_PLAYER_LATERAL - 0.2,
          );
          this.lateralVel = -side * Math.max(2.2, Math.abs(this.lateralVel) * 0.45);
          this.speedMs = Math.max(16, this.speedMs * 0.84);
          this.cameraShake = Math.max(this.cameraShake, 0.62);
          this.scrapeCooldown = 0.16;
          this.audio.playScrape();
          this.callbacks.onImpact?.(0.6);
          _vecC
            .copy(_roadSample.pos)
            .addScaledVector(_roadSample.right, side * (MAX_PLAYER_LATERAL + 0.9));
          this.emitSparks(_vecC, side, 18);
          this.emitDamageSmoke(_vecC, 5, true);
          const dmgPct = Math.max(
            1,
            Math.round((impactDmg / this.carSpec.maxIntegrity) * 100),
          );
          this.emitCallout('BARİYER DARBESİ!', `-${dmgPct}% Gövde`, 'rose');
        } else {
          this.speedMs = Math.max(16, this.speedMs - 24 * dt);
          this.cameraShake = Math.max(this.cameraShake, 0.42);
          this.integrity = Math.max(
            0,
            this.integrity - (32 + speedFactor * 16) * dt,
          );
          this.noHitDistMeters = 0;
          this.noHitDistLastReported = 0;
          this.damageRegenDelay = Math.max(this.damageRegenDelay, 2.5);

          if (this.scrapeCooldown <= 0) {
            this.scrapeCooldown = 0.14;
            this.audio.playScrape();
            this.callbacks.onImpact?.(0.45);
            _vecC
              .copy(_roadSample.pos)
              .addScaledVector(
                _roadSample.right,
                side * (MAX_PLAYER_LATERAL + 0.9),
              );
            this.emitSparks(_vecC, side, 12);
            this.emitDamageSmoke(_vecC, 3, false);
          }
        }

        if (this.integrity <= 0) {
          this.triggerCrash();
          return;
        }
      }
    } else if (this.damageRegenDelay <= 0) {
      this.integrity = Math.min(
        this.carSpec.maxIntegrity,
        this.integrity + 0.85 * dt,
      );
    }

    // Ongoing dark engine smoke when the vehicle has sustained significant damage
    const integrityRatio = this.integrity / this.carSpec.maxIntegrity;
    if (integrityRatio < 0.72) {
      this.damageSmokeTimer += dt;
      const interval = integrityRatio < 0.35 ? 0.045 : 0.095;
      if (this.damageSmokeTimer >= interval) {
        this.damageSmokeTimer = 0;
        _vecC
          .copy(_roadSample.pos)
          .addScaledVector(_roadSample.right, this.playerLateral)
          .addScaledVector(_roadSample.tangent, 1.45)
          .addScaledVector(_roadSample.normal, 0.45);
        this.emitDamageSmoke(_vecC, integrityRatio < 0.35 ? 2 : 1, false);
      }
    }

    // Clean Curve & Apex Bonus
    const absCurv = Math.abs(_roadSample.curvature);
    if (absCurv > 0.0085) {
      if (!this.inSharpCurve) {
        this.inSharpCurve = true;
        this.curveScraped = false;
        this.curveCleanTime = 0;
      }
      if (!this.curveScraped) {
        this.curveCleanTime += dt;
      }
    } else if (absCurv < 0.0045 && this.inSharpCurve) {
      this.inSharpCurve = false;
      if (!this.curveScraped && this.curveCleanTime > 0.8) {
        this.cleanCurvesCount++;
        this.boostCombo(1);
        const pts = 120 * this.combo;
        this.score += pts;
        this.nitro = Math.min(nitroMax, this.nitro + 16);
        this.emitCallout(
          this.combo > 1 ? `Viraj Ustası ×${this.combo}` : 'Viraj Temiz',
          `+${pts}`,
          'cyan',
        );
        this.handleMissionRewards(this.missions.recordDelta('cleanCurve', 1));
      }
    }

    // Advance forward along spline
    const ds = this.speedMs * dt;
    this.playerS += ds;
    this.distanceMeters += ds;

    // Two-Way oncoming lane detection & bonus
    this.inOncomingLane =
      this.gameMode === 'twoway' && this.playerLateral < -1.55;
    const modeMult = this.getActiveModeMultiplier();
    const oncomingMult = this.inOncomingLane ? 2.0 : 1.0;
    this.score +=
      ds * (0.65 + (this.speedMs / 65) * 0.95) * this.combo * modeMult * oncomingMult;
    if (this.inOncomingLane) {
      if (this.activeCareerLevel) {
        this.careerOncomingMeters += ds;
      }
      if (!this.nitroActive) {
        this.nitro = Math.min(nitroMax, this.nitro + dt * 4.2);
      }
    }

    const activeBiome = sampleBiomeAtDistance(this.playerS, _biomeSample).primary;
    if (activeBiome.id !== this.currentBiomeId) {
      this.currentBiomeId = activeBiome.id;
      this.emitCallout('YENİ BÖLGE', activeBiome.label, activeBiome.calloutTone);
    }

    // Road Zone tracking (Tunnel & Suspension Bridge callouts + auto headlights inside tunnel)
    const nextZone = getRoadZoneAtS(this.playerS);
    if (nextZone !== this.currentRoadZone) {
      const prevZone = this.currentRoadZone;
      this.currentRoadZone = nextZone;
      if (nextZone === 'tunnel') {
        this.emitCallout('OTOYOL TÜNELİ', 'Farlar Otomatik', 'cyan');
      } else if (nextZone === 'bridge') {
        this.emitCallout('ASMA KÖPRÜ', 'Viyadük Geçidi', 'amber');
      } else if (prevZone === 'tunnel') {
        this.applyAtmosphere(this.atmosphereId);
      }
    }
    if (this.currentRoadZone === 'tunnel') {
      this.playerCar.headLightSpots[0].intensity = Math.max(
        this.playerCar.headLightSpots[0].intensity,
        72,
      );
      this.playerCar.headLightSpots[1].intensity = Math.max(
        this.playerCar.headLightSpots[1].intensity,
        72,
      );
      this.playerCar.headLightMaterial.emissiveIntensity = 3.4;
    }

    this.missionDistAccum += ds;
    if (this.missionDistAccum >= 100) {
      const whole = Math.floor(this.missionDistAccum);
      this.missionDistAccum -= whole;
      this.handleMissionRewards(this.missions.recordDelta('distance', whole));
    }

    this.noHitDistMeters += ds;
    if (this.noHitDistMeters - this.noHitDistLastReported >= 100) {
      this.noHitDistLastReported = this.noHitDistMeters;
      this.handleMissionRewards(
        this.missions.recordPeak(
          'noHitDistance',
          Math.floor(this.noHitDistMeters),
        ),
      );
    }

    if (this.cameraMode === 'cockpit') {
      this.missionCockpitDistAccum += ds;
      if (this.missionCockpitDistAccum >= 100) {
        const wholeC = Math.floor(this.missionCockpitDistAccum);
        this.missionCockpitDistAccum -= wholeC;
        this.handleMissionRewards(
          this.missions.recordDelta('cockpitDistance', wholeC),
        );
      }
    }

    this.road.update(this.playerS, dt);
    this.roadEvents.spawnAhead(this.playerS + 380);
    this.spawnTrafficAhead(this.playerS + 380);
    this.spawnCoinsAhead(this.playerS + 380);
    this.spawnNitrosAhead(this.playerS + 380);
    this.spawnRepairsAhead(this.playerS + 380);
    this.spawnMagnetsAhead(this.playerS + 380);
    this.spawnRampagesAhead(this.playerS + 380);

    const crashed = this.updateTraffic(dt, true);
    if (crashed) return;

    const modeEnded = this.updateGameModeMechanics(dt, this.speedMs * 3.6);
    if (modeEnded) return;

    const eventRes = this.roadEvents.update(
      dt,
      this.road,
      this.playerS,
      this.playerLateral,
      this.playerHeight,
      true,
    );
    this.upcomingEvent = eventRes.upcoming;
    if (eventRes.cleanRoadworkPasses > 0) {
      const bonus = 200 * this.combo;
      this.score += bonus;
      this.emitCallout('ŞERİT USTASI', `+${bonus}`, 'cyan');
      this.handleMissionRewards(
        this.missions.recordDelta('roadworkPass', eventRes.cleanRoadworkPasses),
      );
    }
    for (const hit of eventRes.hits) {
      if (hit.kind === 'ramp') {
        this.playerVelY = 10.8;
        this.playerHeight = Math.max(this.playerHeight, 0.25);
        this.nitro = Math.min(nitroMax, this.nitro + 18);
        const pts = 350 * this.combo;
        this.score += pts;
        this.boostCombo(1);

        // Preserve and boost drift streak on ramp takeoff
        this.drifting = true;
        this.driftGraceTimer = this.driftGraceDuration;
        this.driftDuration += 0.55;
        const rampDriftSpeed = THREE.MathUtils.clamp(
          this.speedMs / 36,
          0.85,
          2.0,
        );
        const rampDriftGain = Math.round(140 * rampDriftSpeed);
        this.driftScore += rampDriftGain;
        const { mult: rampNextMult } = this.getDriftMultiplierState();
        if (rampNextMult > this.driftMultiplier) {
          this.driftMultiplier = rampNextMult;
          if (rampNextMult >= 2) {
            this.boostCombo(1);
          }
        }
        const rampBanked = rampDriftGain * this.driftMultiplier;
        this.score += rampBanked;
        this.totalDriftScore += rampBanked;
        this.missionDriftAccum += rampBanked;

        this.audio.playNitroIgnite();
        this.emitSparks(this.playerCar.root.position, 0, 16);
        this.emitCallout('UÇUŞ BONUSU!', `+${pts} · +18 Nitro · Drift +`, 'amber');
        this.careerRoadEventsCount++;
        this.handleMissionRewards(this.missions.recordDelta('rampJump', 1));
      } else if (hit.kind === 'boostpad') {
        this.boostPadTimer = 1.35;
        this.speedMs += 10.5;
        this.nitro = Math.min(nitroMax, this.nitro + 22);
        const pts = 250 * this.combo;
        this.score += pts;
        this.boostCombo(1);
        this.audio.playNitroIgnite();
        this.emitExhaustFlames('nitro', 3, 1.35);
        this.emitCallout('TURBO ŞERİDİ!', `+${pts} · Hız Artışı`, 'cyan');
        this.careerRoadEventsCount++;
        this.handleMissionRewards(this.missions.recordDelta('boostPad', 1));
      } else if (hit.kind === 'slick') {
        this.slickTimer = 1.65;
        const kick = (Math.random() < 0.5 ? -1 : 1) * 1.15;
        this.targetLateral = THREE.MathUtils.clamp(
          this.targetLateral + kick,
          -MAX_PLAYER_LATERAL + 0.3,
          MAX_PLAYER_LATERAL - 0.3,
        );
        this.cameraShake = Math.max(this.cameraShake, 0.22);
        this.emitCallout('KAYGAN ZEMİN!', 'Tutuş Azaldı', 'cyan');
      } else if (hit.kind === 'roadwork') {
        if (hit.clearedAirborne) {
          const pts = 300 * this.combo;
          this.score += pts;
          this.boostCombo(1);
          this.emitCallout('ENGEL ÜSTÜ UÇUŞ!', `+${pts}`, 'emerald');
          this.handleMissionRewards(
            this.missions.recordDelta('roadworkPass', 1),
          );
        } else if (this.rampageTimer > 0) {
          const pts = 250 * this.combo;
          this.score += pts;
          this.cameraShake = Math.max(this.cameraShake, 0.52);
          this.callbacks.onImpact?.(0.55);
          this.spawnCarExplosion(this.playerCar.root.position, 0xf97316);
          this.emitCallout('BARİYER PARÇALANDI!', `+${pts}`, 'amber');
        } else if (this.reviveInvulnTimer <= 0) {
          this.integrity = Math.max(0, this.integrity - 26);
          this.noHitDistMeters = 0;
          this.noHitDistLastReported = 0;
          this.damageRegenDelay = 3.5;
          this.speedMs = Math.max(17, this.speedMs * 0.76);
          this.combo = 1;
          this.comboTimer = 0;
          this.cameraShake = 0.72;
          this.audio.playScrape();
          this.callbacks.onImpact?.(0.65);
          this.emitSparks(this.playerCar.root.position, 0, 22);
          this.emitDamageSmoke(this.playerCar.root.position, 8, true);
          const dmgPct = Math.max(
            1,
            Math.round((26 / this.carSpec.maxIntegrity) * 100),
          );
          this.emitCallout('BARİYER DARBESİ!', `-${dmgPct}% Gövde`, 'rose');
          if (this.integrity <= 0) {
            this.triggerCrash();
            return;
          }
        }
      }
    }

    this.updateCoins(dt, true);
    this.updateNitros(dt, true);
    this.updateRepairs(true);
    this.updateMagnets(true);
    this.updateRampages(dt, true);
    this.updateRecordMarker(dt, !this.activeCareerLevel);
    this.updateFinishLine(dt);

    if (this.activeCareerLevel) {
      this.careerElapsedSec += dt;
      const curSpeedKmh = this.speedMs * 3.6;
      if (curSpeedKmh > this.careerPeakSpeedKmh) {
        this.careerPeakSpeedKmh = curSpeedKmh;
      }
      if (this.combo > this.careerMaxCombo) {
        this.careerMaxCombo = this.combo;
      }

      const level = this.activeCareerLevel;
      for (const m of level.missions) {
        if (m.kind === 'highSpeedSec') {
          const thresholdKmh = m.param ?? 180;
          if (curSpeedKmh >= thresholdKmh) {
            this.careerHighSpeedSeconds += dt;
          }
        } else if (
          m.kind === 'minSpeedHold' &&
          !this.careerDroppedBelowMinSpeed &&
          this.careerElapsedSec >= CAREER_MIN_SPEED_GRACE_SEC &&
          curSpeedKmh < m.target
        ) {
          this.careerDroppedBelowMinSpeed = true;
          this.emitCallout(
            'HIZ BARAJI DÜŞTÜ!',
            `${m.target} km/s altına inildi`,
            'rose',
          );
        }
      }

      // Live mid-run mission completion callout (skip continuous-constraint objectives)
      const liveMetrics = this.collectCareerMetrics();
      if (
        !this.careerMission1Announced &&
        !isContinuousCareerConstraint(level.missions[0].kind) &&
        evaluateCareerObjective(level.missions[0], liveMetrics).completed
      ) {
        this.careerMission1Announced = true;
        this.audio.playCheckpoint();
        this.emitCallout('GÖREV 1 TAMAMLANDI!', '+1★ Yıldız Hazır', 'emerald');
      }
      if (
        !this.careerMission2Announced &&
        !isContinuousCareerConstraint(level.missions[1].kind) &&
        evaluateCareerObjective(level.missions[1], liveMetrics).completed
      ) {
        this.careerMission2Announced = true;
        this.audio.playCheckpoint();
        this.emitCallout('GÖREV 2 TAMAMLANDI!', '+1★ Yıldız Hazır', 'emerald');
      }

      if (this.distanceMeters >= level.targetDistanceMeters) {
        this.triggerCareerVictory();
        return;
      }
    }

    this.stepParticles(dt);
    this.stepSpeedStreaks(dt);
    this.stepRain(dt);
    this.syncPlayerAndCamera(dt, false);
    this.recenterIfNeeded();

    // Update Rampage Energy Aura Dome hugging the player car
    if (this.rampageTimer > 0 && this.playerCar.root.visible) {
      this.rampageAuraMesh.visible = true;
      this.rampageAuraMesh.position.copy(this.playerCar.root.position);
      this.rampageAuraMesh.position.y += 0.65;
      this.rampageAuraMesh.quaternion.copy(this.playerCar.root.quaternion);
      const tSec = performance.now() * 0.001;
      const flickerFreq = this.rampageTimer <= 3 ? 22 : 9;
      const pulse = 1.0 + Math.sin(tSec * flickerFreq) * 0.06;
      this.rampageAuraMesh.scale.setScalar(pulse);
      const auraMat = this.rampageAuraMesh.material as THREE.MeshBasicMaterial;
      auraMat.opacity =
        this.rampageTimer <= 3
          ? 0.14 + Math.abs(Math.sin(tSec * 14)) * 0.24
          : 0.2 + Math.sin(tSec * 8) * 0.06;
      auraMat.color.setHex(this.rampageTimer <= 3 ? 0xf43f5e : 0xff5a00);
    } else {
      this.rampageAuraMesh.visible = false;
    }

    if (this.playerCar.root.visible) {
      this.playerCar.updateEffects(
        performance.now() * 0.001,
        this.speedMs,
        THREE.MathUtils.clamp(this.lateralVel / 8.5, -1, 1),
      );
    }
    const speedKmh = this.speedMs * 3.6;
    const { gear, rpmRatio } = this.computeGearAndRpm(speedKmh);

    if (this.nitroActive) {
      this.exhaustFlameTimer += dt;
      while (this.exhaustFlameTimer >= 0.015) {
        this.exhaustFlameTimer -= 0.015;
        this.emitExhaustFlames(
          'nitro',
          1,
          1.05 + this.carUpgrades[this.carModelId].nitroPower * 0.08,
        );
      }
    } else {
      if (gear > this.prevExhaustGear && speedKmh >= 72) {
        this.emitExhaustFlames('fire', 3, 1.15);
      }
      if (speedKmh >= 132 && this.throttleInput >= -0.1) {
        const highRatio = THREE.MathUtils.clamp((speedKmh - 132) / 115, 0, 1);
        const interval = THREE.MathUtils.lerp(0.062, 0.018, highRatio);
        this.exhaustFlameTimer += dt;
        while (this.exhaustFlameTimer >= interval) {
          this.exhaustFlameTimer -= interval;
          this.emitExhaustFlames('fire', 1, 0.85 + highRatio * 0.42);
        }
      } else {
        this.exhaustFlameTimer = 0;
      }
    }
    this.prevExhaustGear = gear;

    this.missionSpeedCheckAccum += dt;
    if (this.missionSpeedCheckAccum >= 0.25) {
      this.missionSpeedCheckAccum = 0;
      this.handleMissionRewards(
        this.missions.recordPeak('maxSpeedKmh', Math.round(speedKmh)),
      );
      this.handleMissionRewards(
        this.missions.recordPeak('runScore', Math.floor(this.score)),
      );
    }

    this.audio.updateEngine(
      THREE.MathUtils.clamp((speedKmh - 60) / 195, 0, 1),
      rpmRatio,
      true,
      this.nitroActive,
      isCorneringHard ? 0.75 : 0,
    );

    if (this.score > this.bestScore) {
      this.bestScore = Math.floor(this.score);
    }

    const liveLevel = this.getLivePlayerLevel();
    if (liveLevel.level > this.lastKnownLevel) {
      const prevLevel = this.lastKnownLevel;
      this.lastKnownLevel = liveLevel.level;
      this.totalGold += 25;
      this.runGold += 25;
      this.commitRunXp();
      this.handleMissionRewards(
        this.missions.recordPeak('playerLevel', liveLevel.level),
      );
      this.audio.playAchievementUnlock();
      const newlyUnlockedPowerUp = POWERUP_SPECS.find(
        (spec) => spec.unlockLevel > prevLevel && spec.unlockLevel <= liveLevel.level,
      );
      this.emitCallout(
        newlyUnlockedPowerUp
          ? `SV.${liveLevel.level} · ${newlyUnlockedPowerUp.shortName.toUpperCase()} AÇILDI!`
          : `SEVİYE ${liveLevel.level}!`,
        newlyUnlockedPowerUp
          ? 'Seviye Yolunda Ödülün Hazır!'
          : `${liveLevel.rankTitle} · Seviye Yolu Ödülü Açıldı`,
        newlyUnlockedPowerUp ? 'emerald' : 'amber',
      );
      this.callbacks.onLevelUp?.({
        fromLevel: prevLevel,
        toLevel: liveLevel.level,
        rankTitle: liveLevel.rankTitle,
        totalXp: liveLevel.totalXp,
      });
      this.pushHud(true);
      return;
    }

    this.pushHud(false);
  }

  private syncPlayerAndCamera(dt: number, snap: boolean): void {
    this.road.sampleAtS(this.playerS, _roadSample);

    const steerNorm = THREE.MathUtils.clamp(this.lateralVel / 10.5, -1, 1);

    // Smooth, realistic steering-wheel angle (prevents 60Hz touch-gap snapping back to 0° at 120 FPS)
    if (snap) {
      this.touchSteerImpulse = 0;
      this.touchSteerHoldTimer = 0;
      this.visualSteer = 0;
    } else {
      if (this.touchSteerHoldTimer > 0) {
        this.touchSteerHoldTimer = Math.max(0, this.touchSteerHoldTimer - dt);
        this.touchSteerImpulse = THREE.MathUtils.damp(
          this.touchSteerImpulse,
          0,
          2.0,
          dt,
        );
      } else {
        this.touchSteerImpulse = THREE.MathUtils.damp(
          this.touchSteerImpulse,
          0,
          7.5,
          dt,
        );
      }

      const keySteer = (this.keyRight ? 0.92 : 0) - (this.keyLeft ? 0.92 : 0);
      const directInput = THREE.MathUtils.clamp(
        keySteer + this.tiltSteerInput + this.touchSteerImpulse,
        -1,
        1,
      );
      let driverSteer: number;
      if (Math.abs(directInput) > 0.03) {
        if (directInput * steerNorm > 0) {
          driverSteer =
            Math.sign(directInput) *
            Math.max(Math.abs(directInput), Math.abs(steerNorm));
        } else {
          driverSteer = directInput * 0.78 + steerNorm * 0.22;
        }
      } else {
        driverSteer = steerNorm * 0.85;
      }

      // Natural turn-in along highway curves so the wheel stays engaged through sweeping bends
      const curveSteer = THREE.MathUtils.clamp(
        _roadSample.curvature * 16.5,
        -0.36,
        0.36,
      );
      const targetVisualSteer = THREE.MathUtils.clamp(
        driverSteer + curveSteer,
        -1,
        1,
      );

      // Asymmetric power-steering response: brisk turn-in / counter-steer, calm weighted self-centering
      const turningInOrReversing =
        Math.abs(targetVisualSteer) >= Math.abs(this.visualSteer) ||
        targetVisualSteer * this.visualSteer < 0;
      const wheelDamp = turningInOrReversing ? 14.5 : 5.0;
      this.visualSteer = THREE.MathUtils.damp(
        this.visualSteer,
        targetVisualSteer,
        wheelDamp,
        dt,
      );
    }

    // Realistic drift slip angle: on sharp curves + steering (amplified on wet asphalt!)
    const wetSlipBoost = 1 + this.getEffectiveRoadWetness() * 0.38;
    const curveSlip = THREE.MathUtils.clamp(
      -_roadSample.curvature * this.speedMs * 0.22 * wetSlipBoost,
      -0.22,
      0.22,
    );
    const targetSlip = THREE.MathUtils.clamp(
      -steerNorm * 0.16 * wetSlipBoost + curveSlip,
      -0.31,
      0.31,
    );
    const targetChassisRoll =
      steerNorm * 0.055 - _roadSample.curvature * this.speedMs * 0.065;
    const airPitch =
      this.playerHeight > 0.05
        ? THREE.MathUtils.clamp(this.playerVelY * 0.032, -0.24, 0.34)
        : 0;
    const targetPitch =
      this.playerHeight > 0.05
        ? airPitch
        : this.nitroActive || this.boostPadTimer > 0
          ? 0.032
          : this.throttleInput > 0.2
            ? 0.018
            : this.throttleInput < -0.2
              ? -0.025
              : 0;

    if (snap) {
      this.carRelYaw = targetSlip;
      this.driftSlip = targetSlip;
      this.chassisRoll = targetChassisRoll;
      this.chassisPitch = targetPitch;
    } else {
      const yawDamp = Math.max(7.2, 12 - this.getEffectiveRoadWetness() * 3.2);
      this.carRelYaw = THREE.MathUtils.damp(this.carRelYaw, targetSlip, yawDamp, dt);
      this.driftSlip = this.carRelYaw;
      this.chassisRoll = THREE.MathUtils.damp(
        this.chassisRoll,
        targetChassisRoll,
        10,
        dt,
      );
      this.chassisPitch = THREE.MathUtils.damp(
        this.chassisPitch,
        targetPitch,
        8,
        dt,
      );
    }

    this.wheelSpin += (this.speedMs / 0.34) * dt;
    for (const w of this.playerCar.wheelSpinGroups) {
      w.rotation.x = -this.wheelSpin;
    }
    const frontWheelAngle = -this.visualSteer * 0.45;
    this.playerCar.frontLeftPivot.rotation.y = frontWheelAngle;
    this.playerCar.frontRightPivot.rotation.y = frontWheelAngle;

    this.placeCarOnRoad(
      _roadSample,
      this.playerLateral,
      this.carRelYaw,
      this.chassisRoll,
      this.chassisPitch,
    );

    const laneRatio = THREE.MathUtils.clamp(
      this.playerLateral / MAX_PLAYER_LATERAL,
      -1,
      1,
    );

    const inDrive = this.phase === 'playing' || this.phase === 'paused';
    this.cockpit.root.visible = inDrive && this.cameraMode === 'cockpit';
    this.playerCar.root.visible =
      !inDrive || this.cameraMode === 'chase' || this.cameraMode === 'cine';

    const aspect = Math.max(0.38, this.camera.aspect || 1);
    const portraitFactor = THREE.MathUtils.clamp((1.0 - aspect) / 0.54, 0, 1);
    const yawFactor = THREE.MathUtils.lerp(0.032, 0.005, portraitFactor);
    const absLane = Math.abs(laneRatio);
    const edgeWeight = absLane * absLane;

    if (this.cameraMode === 'hood') {
      // Low Hood / Bumper Camera anchored directly in car road frame
      _vecA
        .copy(_roadSample.pos)
        .addScaledVector(_roadSample.right, this.playerLateral)
        .addScaledVector(_roadSample.tangent, 0.35)
        .addScaledVector(_roadSample.normal, 1.32 + this.playerHeight);

      this.road.sampleAtS(this.playerS + 16, _lookRoadSample);
      _vecB
        .copy(_lookRoadSample.pos)
        .addScaledVector(_lookRoadSample.right, this.playerLateral * 0.55)
        .addScaledVector(_lookRoadSample.normal, 1.05 + this.playerHeight * 0.5);

      this.camPosCurrent.copy(_vecA);
      this.camLookCurrent.copy(_vecB);
    } else if (this.cameraMode === 'cockpit') {
      // Interior Dashboard Cockpit View with steering & live gauge response
      _vecA
        .copy(_roadSample.pos)
        .addScaledVector(_roadSample.right, this.playerLateral)
        .addScaledVector(_roadSample.tangent, 0.12)
        .addScaledVector(_roadSample.normal, 1.12 + this.playerHeight);

      this.road.sampleAtS(this.playerS + 18, _lookRoadSample);
      _vecB
        .copy(_lookRoadSample.pos)
        .addScaledVector(_lookRoadSample.right, this.playerLateral * 0.62)
        .addScaledVector(_lookRoadSample.normal, 1.02 + this.playerHeight * 0.5);

      this.camPosCurrent.copy(_vecA);
      this.camLookCurrent.copy(_vecB);

      this.cockpit.cabinOffset.position.set(0, 0, 0);
      this.cockpit.wheelGroup.rotation.z = -this.visualSteer * 1.05;
      this.cockpit.cabinOffset.rotation.z = -this.chassisRoll * 0.28;
      this.cockpit.cabinOffset.rotation.x = this.chassisPitch * 0.45;

      const speedKmh = Math.round(this.speedMs * 3.6);
      const { rpmRatio } = this.computeGearAndRpm(speedKmh);
      const rpmScale = Math.max(0.04, rpmRatio);
      this.cockpit.rpmBar.scale.x = rpmScale;
      this.cockpit.rpmBar.position.x = -0.12 * (1 - rpmScale);

      const nitroMax = Math.max(1, this.getActiveNitroMax());
      const nitroScale = Math.max(0.03, Math.min(1, this.nitro / nitroMax));
      this.cockpit.nitroBar.scale.x = nitroScale;
      this.cockpit.nitroBar.position.x = -0.12 * (1 - nitroScale);
      this.cockpit.nitroBarMat.color.setHex(
        this.nitroActive
          ? 0x22d3ee
          : this.nitro >= 14
            ? 0x38bdf8
            : 0x52525b,
      );

      const lateralAccel =
        -steerNorm * 1.15 -
        THREE.MathUtils.clamp(_roadSample.curvature * this.speedMs * 0.42, -1.6, 1.6);
      const longitudinalAccel = this.nitroActive
        ? 1.15
        : this.throttleInput * 0.7;
      this.cockpit.updateInterior(
        dt,
        performance.now() * 0.001,
        lateralAccel,
        longitudinalAccel,
        rpmRatio,
        speedKmh,
      );
    } else if (this.cameraMode === 'cine') {
      // Low Rear Bumper / Exhaust Cine-Cam with calm lateral follow + frustum edge-guard
      const targetBackDist =
        (this.nitroActive ? 5.65 : 4.95) + portraitFactor * 2.65;
      this.road.sampleAtS(this.playerS + 16, _lookRoadSample);

      const swingScale = THREE.MathUtils.lerp(0.75, 0.24, portraitFactor);
      const targetSwing =
        THREE.MathUtils.clamp(
          -_roadSample.curvature * this.speedMs * 1.0,
          -1.1,
          1.1,
        ) * swingScale;
      const baseCamFollow = THREE.MathUtils.lerp(0.48, 0.6, portraitFactor);
      const edgeCamFollow = THREE.MathUtils.lerp(0.72, 0.88, portraitFactor);
      const camLatFollow = THREE.MathUtils.lerp(
        baseCamFollow,
        edgeCamFollow,
        edgeWeight,
      );
      const baseLookFollow = THREE.MathUtils.lerp(0.22, 0.44, portraitFactor);
      const edgeLookFollow = THREE.MathUtils.lerp(0.42, 0.74, portraitFactor);
      const lookLatFollow = THREE.MathUtils.lerp(
        baseLookFollow,
        edgeLookFollow,
        edgeWeight,
      );
      const camLatDamp = THREE.MathUtils.lerp(4.4, 6.0, portraitFactor);
      const lookLatDamp = THREE.MathUtils.lerp(3.8, 5.2, portraitFactor);
      const targetCamLat = this.playerLateral * camLatFollow + targetSwing;
      const targetCamHeight =
        1.24 + portraitFactor * 0.44 + this.playerHeight * 0.55;
      const targetLookLat = this.playerLateral * lookLatFollow;

      if (snap) {
        this.camCurveSwing = targetSwing;
        this.camBackDistCurrent = targetBackDist;
        this.camLateralCurrent = targetCamLat;
        this.camHeightCurrent = targetCamHeight;
        this.camLookLateralCurrent = targetLookLat;
      } else {
        this.camCurveSwing = THREE.MathUtils.damp(
          this.camCurveSwing,
          targetSwing,
          7.5,
          dt,
        );
        this.camBackDistCurrent = THREE.MathUtils.damp(
          this.camBackDistCurrent,
          targetBackDist,
          8.5,
          dt,
        );
        this.camLateralCurrent = THREE.MathUtils.damp(
          this.camLateralCurrent,
          targetCamLat,
          camLatDamp,
          dt,
        );
        this.camHeightCurrent = THREE.MathUtils.damp(
          this.camHeightCurrent,
          targetCamHeight,
          14,
          dt,
        );
        this.camLookLateralCurrent = THREE.MathUtils.damp(
          this.camLookLateralCurrent,
          targetLookLat,
          lookLatDamp,
          dt,
        );
      }

      // Frustum edge-guard: keep the car inside the horizontal viewport on fast swerves & outer lanes
      const dxLook = _lookRoadSample.pos.x - _roadSample.pos.x;
      const dyLook = _lookRoadSample.pos.y - _roadSample.pos.y;
      const dzLook = _lookRoadSample.pos.z - _roadSample.pos.z;
      const lookRoadLateralOffset =
        dxLook * _roadSample.right.x +
        dyLook * _roadSample.right.y +
        dzLook * _roadSample.right.z;
      const lookRoadForwardOffset = Math.max(
        6,
        dxLook * _roadSample.tangent.x +
          dyLook * _roadSample.tangent.y +
          dzLook * _roadSample.tangent.z,
      );
      const activeFovRad = THREE.MathUtils.degToRad(this.camera.fov);
      const frustumHalfW =
        this.camBackDistCurrent * Math.tan(activeFovRad * 0.5) * aspect;
      const maxCarOffset = Math.max(0.45, frustumHalfW - 1.55);
      const tCar =
        this.camBackDistCurrent /
        (this.camBackDistCurrent + lookRoadForwardOffset);
      const sightLatAtCar =
        this.camLateralCurrent +
        (lookRoadLateralOffset +
          this.camLookLateralCurrent -
          this.camLateralCurrent) *
          tCar -
        this.camBackDistCurrent * laneRatio * yawFactor;
      const carOffset = this.playerLateral - sightLatAtCar;
      const absCarOffset = Math.abs(carOffset);
      if (absCarOffset > maxCarOffset) {
        const hardExcess = carOffset - Math.sign(carOffset) * maxCarOffset;
        this.camLateralCurrent += hardExcess;
        this.camLookLateralCurrent += hardExcess;
      } else if (!snap && absCarOffset > maxCarOffset * 0.72) {
        const cushionSpan = Math.max(0.01, maxCarOffset * 0.28);
        const tSoft = (absCarOffset - maxCarOffset * 0.72) / cushionSpan;
        const softShift =
          Math.sign(carOffset) * tSoft * tSoft * cushionSpan * 0.35;
        const nextCamLat = THREE.MathUtils.damp(
          this.camLateralCurrent,
          this.camLateralCurrent + softShift,
          12,
          dt,
        );
        const appliedDelta = nextCamLat - this.camLateralCurrent;
        this.camLateralCurrent = nextCamLat;
        this.camLookLateralCurrent += appliedDelta;
      }

      _vecA
        .copy(_roadSample.pos)
        .addScaledVector(_roadSample.right, this.camLateralCurrent)
        .addScaledVector(_roadSample.tangent, -this.camBackDistCurrent)
        .addScaledVector(_roadSample.normal, this.camHeightCurrent);

      _vecB
        .copy(_lookRoadSample.pos)
        .addScaledVector(_lookRoadSample.right, this.camLookLateralCurrent)
        .addScaledVector(_lookRoadSample.normal, 0.94 + this.playerHeight * 0.45);

      this.camPosCurrent.copy(_vecA);
      this.camLookCurrent.copy(_vecB);
    } else {
      // Chase Camera anchored longitudinally to exact car road sample (_roadSample.pos)
      // with low-sensitivity horizontal follow near center + frustum edge-guard so the car never exits frame.
      const targetBackDist =
        (this.nitroActive ? 7.75 : 6.85) + portraitFactor * 2.95;
      this.road.sampleAtS(this.playerS + 16, _lookRoadSample);

      const swingScale = THREE.MathUtils.lerp(0.75, 0.24, portraitFactor);
      const targetSwing =
        THREE.MathUtils.clamp(
          -_roadSample.curvature * this.speedMs * 0.85,
          -0.95,
          0.95,
        ) * swingScale;
      const baseCamFollow = THREE.MathUtils.lerp(0.44, 0.56, portraitFactor);
      const edgeCamFollow = THREE.MathUtils.lerp(0.68, 0.86, portraitFactor);
      const camLatFollow = THREE.MathUtils.lerp(
        baseCamFollow,
        edgeCamFollow,
        edgeWeight,
      );
      const baseLookFollow = THREE.MathUtils.lerp(0.18, 0.38, portraitFactor);
      const edgeLookFollow = THREE.MathUtils.lerp(0.36, 0.7, portraitFactor);
      const lookLatFollow = THREE.MathUtils.lerp(
        baseLookFollow,
        edgeLookFollow,
        edgeWeight,
      );
      const camLatDamp = THREE.MathUtils.lerp(4.2, 5.8, portraitFactor);
      const lookLatDamp = THREE.MathUtils.lerp(3.6, 5.0, portraitFactor);
      const targetCamLat = this.playerLateral * camLatFollow + targetSwing;
      const targetCamHeight =
        2.58 + portraitFactor * 0.68 + this.playerHeight * 0.6;
      const targetLookLat = this.playerLateral * lookLatFollow;

      if (snap) {
        this.camCurveSwing = targetSwing;
        this.camBackDistCurrent = targetBackDist;
        this.camLateralCurrent = targetCamLat;
        this.camHeightCurrent = targetCamHeight;
        this.camLookLateralCurrent = targetLookLat;
      } else {
        this.camCurveSwing = THREE.MathUtils.damp(
          this.camCurveSwing,
          targetSwing,
          7.5,
          dt,
        );
        this.camBackDistCurrent = THREE.MathUtils.damp(
          this.camBackDistCurrent,
          targetBackDist,
          8.5,
          dt,
        );
        this.camLateralCurrent = THREE.MathUtils.damp(
          this.camLateralCurrent,
          targetCamLat,
          camLatDamp,
          dt,
        );
        this.camHeightCurrent = THREE.MathUtils.damp(
          this.camHeightCurrent,
          targetCamHeight,
          14,
          dt,
        );
        this.camLookLateralCurrent = THREE.MathUtils.damp(
          this.camLookLateralCurrent,
          targetLookLat,
          lookLatDamp,
          dt,
        );
      }

      // Frustum edge-guard: keep the car inside the horizontal viewport on fast swerves & outer lanes
      const dxLook = _lookRoadSample.pos.x - _roadSample.pos.x;
      const dyLook = _lookRoadSample.pos.y - _roadSample.pos.y;
      const dzLook = _lookRoadSample.pos.z - _roadSample.pos.z;
      const lookRoadLateralOffset =
        dxLook * _roadSample.right.x +
        dyLook * _roadSample.right.y +
        dzLook * _roadSample.right.z;
      const lookRoadForwardOffset = Math.max(
        6,
        dxLook * _roadSample.tangent.x +
          dyLook * _roadSample.tangent.y +
          dzLook * _roadSample.tangent.z,
      );
      const activeFovRad = THREE.MathUtils.degToRad(this.camera.fov);
      const frustumHalfW =
        this.camBackDistCurrent * Math.tan(activeFovRad * 0.5) * aspect;
      const maxCarOffset = Math.max(0.45, frustumHalfW - 1.55);
      const tCar =
        this.camBackDistCurrent /
        (this.camBackDistCurrent + lookRoadForwardOffset);
      const sightLatAtCar =
        this.camLateralCurrent +
        (lookRoadLateralOffset +
          this.camLookLateralCurrent -
          this.camLateralCurrent) *
          tCar -
        this.camBackDistCurrent * laneRatio * yawFactor;
      const carOffset = this.playerLateral - sightLatAtCar;
      const absCarOffset = Math.abs(carOffset);
      if (absCarOffset > maxCarOffset) {
        const hardExcess = carOffset - Math.sign(carOffset) * maxCarOffset;
        this.camLateralCurrent += hardExcess;
        this.camLookLateralCurrent += hardExcess;
      } else if (!snap && absCarOffset > maxCarOffset * 0.72) {
        const cushionSpan = Math.max(0.01, maxCarOffset * 0.28);
        const tSoft = (absCarOffset - maxCarOffset * 0.72) / cushionSpan;
        const softShift =
          Math.sign(carOffset) * tSoft * tSoft * cushionSpan * 0.35;
        const nextCamLat = THREE.MathUtils.damp(
          this.camLateralCurrent,
          this.camLateralCurrent + softShift,
          12,
          dt,
        );
        const appliedDelta = nextCamLat - this.camLateralCurrent;
        this.camLateralCurrent = nextCamLat;
        this.camLookLateralCurrent += appliedDelta;
      }

      _vecA
        .copy(_roadSample.pos)
        .addScaledVector(_roadSample.right, this.camLateralCurrent)
        .addScaledVector(_roadSample.tangent, -this.camBackDistCurrent)
        .addScaledVector(_roadSample.normal, this.camHeightCurrent);

      _vecB
        .copy(_lookRoadSample.pos)
        .addScaledVector(_lookRoadSample.right, this.camLookLateralCurrent)
        .addScaledVector(_lookRoadSample.normal, 1.12 + this.playerHeight * 0.45);

      this.camPosCurrent.copy(_vecA);
      this.camLookCurrent.copy(_vecB);
    }

    this.camera.position.copy(this.camPosCurrent);

    if (this.cameraShake > 0.002) {
      this.camera.position.x += (Math.random() - 0.5) * this.cameraShake * 1.15;
      this.camera.position.y += (Math.random() - 0.5) * this.cameraShake * 0.8;
      this.camera.position.z += (Math.random() - 0.5) * this.cameraShake * 0.65;
    }

    this.camera.lookAt(this.camLookCurrent);

    // Combined Camera Roll & Yaw:
    // - Moving LEFT (laneRatio < 0) -> negative rotateZ (screen turns/tilts RIGHT) + subtle yaw
    // - Road banking (_roadSample.bank) blends naturally into the camera horizon
    const bankRoll = _roadSample.bank * 0.52;
    const targetCamRoll = laneRatio * 0.064 + steerNorm * 0.014 + bankRoll;
    this.cameraRoll = snap
      ? targetCamRoll
      : THREE.MathUtils.damp(this.cameraRoll, targetCamRoll, 8.5, dt);
    const shakeRoll =
      this.cameraShake > 0.002
        ? (Math.random() - 0.5) * this.cameraShake * 0.095
        : 0;
    this.camera.rotateZ(this.cameraRoll + shakeRoll);
    this.camera.rotateY(laneRatio * yawFactor);

    // Dynamic FOV widening with speed + Nitro / Rampage surge + narrow-screen horizontal framing boost
    const speedRatio = THREE.MathUtils.clamp((this.speedMs - 22) / 48, 0, 1);
    const rampageFovBoost = this.rampageTimer > 0 ? 10 : 0;
    const portraitFovBoost =
      this.cameraMode === 'chase' || this.cameraMode === 'cine'
        ? portraitFactor * 10
        : portraitFactor * 6;
    const targetFov =
      this.cameraMode === 'cine'
        ? 65 +
          portraitFovBoost +
          speedRatio * 17 +
          (this.nitroActive ? 9 : 0) +
          rampageFovBoost
        : this.cameraMode === 'cockpit'
          ? 62 +
            portraitFovBoost +
            speedRatio * 12 +
            (this.nitroActive ? 6 : 0) +
            rampageFovBoost * 0.7
          : 59 +
            portraitFovBoost +
            speedRatio * 15 +
            (this.nitroActive ? 8 : 0) +
            rampageFovBoost;
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 7, dt);
      this.camera.updateProjectionMatrix();
    }

    this.updateSkyAndSun(this.camera.position);
  }

  private placeCarOnRoad(
    sample: EvaluatedRoadPoint,
    lateral: number,
    relYaw: number,
    roll: number,
    pitch: number,
  ): void {
    _vecC.copy(sample.tangent).negate();
    _matBasis.makeBasis(sample.right, sample.normal, _vecC);
    _quatA.setFromRotationMatrix(_matBasis);

    this.playerCar.root.position
      .copy(sample.pos)
      .addScaledVector(sample.right, lateral)
      .addScaledVector(sample.normal, 0.02 + this.playerHeight);
    this.playerCar.root.quaternion.copy(_quatA);
    this.playerCar.root.rotateY(relYaw);

    this.playerCar.chassisGroup.rotation.z = roll;
    this.playerCar.chassisGroup.rotation.x = pitch;
  }

  private updateSkyAndSun(camPos: THREE.Vector3): void {
    this.skyDome.position.copy(camPos);

    // Snap directional shadow camera target to texel-aligned world increments to stop shadow shimmer on the car
    const snapStep = this.isMobileDevice ? 0.5 : 0.25;
    const sx = Math.round(this.playerCar.root.position.x / snapStep) * snapStep;
    const sy = Math.round(this.playerCar.root.position.y / snapStep) * snapStep;
    const sz = Math.round(this.playerCar.root.position.z / snapStep) * snapStep;
    this.sunLight.target.position.set(sx, sy, sz);
    this.sunLight.position.set(sx, sy, sz).add(_sunOffset);
    this.sunLight.target.updateMatrixWorld();

    _sunDiscOffset.set(180, this.cycleSunY, -520);
    this.sunDisc.position.copy(camPos).add(_sunDiscOffset);
    this.sunDisc.lookAt(camPos);
  }

  private updateGameModeMechanics(dt: number, speedKmh: number): boolean {
    // 1) TIME ATTACK MODE
    if (this.gameMode === 'timeattack') {
      this.timeLeftSec = Math.max(0, this.timeLeftSec - dt);

      if (this.distanceMeters >= this.nextCheckpointMeters) {
        this.checkpointsCleared++;
        this.timeLeftSec = Math.min(60, this.timeLeftSec + 14);
        this.nextCheckpointMeters += 750;
        const pts = Math.round(450 * this.combo * this.getActiveModeMultiplier());
        this.score += pts;
        this.runGold += 15;
        this.totalGold += 15;
        this.markProgressionDirty();
        this.audio.playCheckpoint();
        this.emitCallout(
          `KONTROL NOKTASI #${this.checkpointsCleared}`,
          `+14 sn · +15 Altın`,
          'emerald',
        );
      }

      if (this.timeLeftSec > 0 && this.timeLeftSec <= 8) {
        this.lowTimeBeepAccum += dt;
        const interval = this.timeLeftSec <= 3.5 ? 0.45 : 0.95;
        if (this.lowTimeBeepAccum >= interval) {
          this.lowTimeBeepAccum = 0;
          this.audio.playBombBeep(this.timeLeftSec <= 3.5);
        }
      } else {
        this.lowTimeBeepAccum = 0;
      }

      if (this.timeLeftSec <= 0) {
        this.triggerCrash('timeout');
        return true;
      }
      return false;
    }

    // 2) SPEED BOMB MODE
    if (this.gameMode === 'bomb') {
      this.bombMinSpeedKmh = Math.min(
        210,
        Math.round(130 + (this.distanceMeters / 120) * 2),
      );
      if (!this.bombArmed) {
        this.bombGraceTimer -= dt;
        if (this.bombGraceTimer <= 0 || speedKmh >= 134) {
          this.bombArmed = true;
          this.audio.playBombBeep(true);
          this.emitCallout(
            'BOMBA AKTİF!',
            `${this.bombMinSpeedKmh} km/s altına düşme!`,
            'amber',
          );
        }
        return false;
      }

      if (speedKmh < this.bombMinSpeedKmh) {
        this.bombFuseTimer = Math.max(0, this.bombFuseTimer - dt);
        this.bombBeepAccum += dt;
        const beepInterval = this.bombFuseTimer < 2.2 ? 0.22 : 0.48;
        if (this.bombBeepAccum >= beepInterval) {
          this.bombBeepAccum = 0;
          this.audio.playBombBeep(this.bombFuseTimer < 2.2);
        }
        if (this.bombFuseTimer <= 0) {
          this.emitSparks(this.playerCar.root.position, 0, 56);
          this.emitDamageSmoke(this.playerCar.root.position, 28, true);
          this.triggerCrash('bomb');
          return true;
        }
      } else {
        this.bombFuseTimer = Math.min(5.0, this.bombFuseTimer + dt * 1.45);
        this.bombBeepAccum = 0;
      }
      return false;
    }

    return false;
  }

  private updateTraffic(dt: number, checkCollisions: boolean): boolean {
    for (let i = this.traffic.length - 1; i >= 0; i--) {
      const tv = this.traffic[i];
      if (tv.hitCooldown > 0) tv.hitCooldown = Math.max(0, tv.hitCooldown - dt);

      let desiredSpeed = tv.speedMs;
      for (const other of this.traffic) {
        if (
          other.id !== tv.id &&
          other.laneIndex === tv.laneIndex &&
          other.direction === tv.direction
        ) {
          const gap = (other.s - tv.s) * tv.direction;
          if (gap > 0 && gap < 22) {
            desiredSpeed = Math.min(desiredSpeed, other.speedMs * 0.92);
          }
        }
      }
      tv.s += desiredSpeed * tv.direction * dt;

      if (tv.s < this.playerS - 36) {
        this.releaseTrafficRig(tv);
        this.traffic.splice(i, 1);
        continue;
      }

      if (this.road.sampleAtS(tv.s, _trafficSample)) {
        if (tv.direction === 1) {
          _vecC.copy(_trafficSample.tangent).negate();
          _matBasis.makeBasis(
            _trafficSample.right,
            _trafficSample.normal,
            _vecC,
          );
        } else {
          _vecNegRight.copy(_trafficSample.right).negate();
          _matBasis.makeBasis(
            _vecNegRight,
            _trafficSample.normal,
            _trafficSample.tangent,
          );
        }
        _quatA.setFromRotationMatrix(_matBasis);

        tv.rig.root.position
          .copy(_trafficSample.pos)
          .addScaledVector(_trafficSample.right, tv.lateral)
          .addScaledVector(_trafficSample.normal, 0.02);
        tv.rig.root.quaternion.copy(_quatA);
        tv.rig.root.visible = true;

        const spinDelta = (desiredSpeed / 0.36) * dt;
        for (const wm of tv.rig.wheelMeshes) {
          wm.rotation.x -= spinDelta;
        }
      } else {
        tv.rig.root.visible = false;
      }

      if (checkCollisions && tv.rig.root.visible) {
        const ds = tv.s - this.playerS;
        const dl = Math.abs(tv.lateral - this.playerLateral);
        const halfSumLen = (4.15 + tv.rig.length) * 0.45;
        const halfSumWidth = (1.76 + tv.rig.width) * 0.43;

        if (
          tv.hitCooldown <= 0 &&
          this.playerHeight < 0.72 &&
          Math.abs(ds) < halfSumLen &&
          dl < halfSumWidth
        ) {
          if (this.rampageTimer > 0) {
            this.spawnCarExplosion(tv.rig.root.position, tv.colorHex);
            this.releaseTrafficRig(tv);
            this.traffic.splice(i, 1);
            this.boostCombo(1);
            const pts = Math.round(
              450 * this.combo * this.getActiveModeMultiplier(),
            );
            this.score += pts;
            this.nitro = Math.min(this.getActiveNitroMax(), this.nitro + 10);
            this.cameraShake = Math.max(this.cameraShake, 0.68);
            this.callbacks.onImpact?.(0.75);
            this.emitCallout(
              'ARAÇ PATLATILDI!',
              `+${pts.toLocaleString('tr-TR')} · YIKIM`,
              'amber',
            );
            this.handleMissionRewards(
              this.missions.recordDelta('rampageSmash', 1),
            );
            continue;
          }
          if (this.reviveInvulnTimer > 0) {
            continue;
          }
          const overlapLat = halfSumWidth - dl;
          const isSameDir = tv.direction === 1;
          const closingSpeed = isSameDir
            ? Math.max(0, this.speedMs - tv.speedMs)
            : this.speedMs + tv.speedMs;

          const isLightGraze = isSameDir ? overlapLat < 0.48 : overlapLat < 0.32;
          const isHeavySide = isSameDir ? overlapLat < 0.92 : overlapLat < 0.56;
          const isDirectFatal =
            !isHeavySide &&
            (!isSameDir || (ds > 0 && closingSpeed >= 22));

          if (isDirectFatal) {
            this.triggerCrash('crash');
            return true;
          }

          const pushSign = Math.sign(this.playerLateral - tv.lateral) || 1;
          let dmg = 16;
          let speedMult = 0.88;
          let pushDist = overlapLat + 0.38;
          let shake = 0.52;
          let haptic = 0.45;
          let sparkCount = 16;
          let smokeCount = 5;
          let title = 'YAN SÜRTME!';

          if (isLightGraze) {
            dmg = isSameDir
              ? Math.round(12 + overlapLat * 20)
              : Math.round(20 + overlapLat * 26);
          } else if (isHeavySide) {
            dmg = isSameDir
              ? Math.round(26 + (overlapLat - 0.48) * 32)
              : Math.round(34 + (overlapLat - 0.32) * 38);
            speedMult = 0.76;
            pushDist = overlapLat + 0.52;
            shake = 0.78;
            haptic = 0.7;
            sparkCount = 24;
            smokeCount = 9;
            title = 'SERT TEMAS!';
          } else {
            // Low-speed rear bump or clipping from behind after passing
            dmg = Math.round(40 + Math.min(12, closingSpeed * 0.55));
            speedMult = 0.68;
            pushDist = 0.75;
            shake = 0.88;
            haptic = 0.82;
            sparkCount = 28;
            smokeCount = 12;
            title = 'AĞIR DARBE!';
          }

          tv.hitCooldown = isLightGraze ? 0.65 : 0.75;
          this.guardrailHitCooldown = Math.max(this.guardrailHitCooldown, 0.38);
          this.damageRegenDelay = 3.5;

          this.playerLateral = THREE.MathUtils.clamp(
            this.playerLateral + pushSign * pushDist,
            -MAX_PLAYER_LATERAL + 0.22,
            MAX_PLAYER_LATERAL - 0.22,
          );
          this.targetLateral = this.playerLateral;
          this.lateralVel = pushSign * (isLightGraze ? 2.4 : 3.8);
          this.speedMs = Math.max(
            15,
            !isHeavySide && isSameDir && ds > 0
              ? Math.min(this.speedMs * speedMult, tv.speedMs * 0.92)
              : this.speedMs * speedMult,
          );
          this.integrity = Math.max(0, this.integrity - dmg);
          this.noHitDistMeters = 0;
          this.noHitDistLastReported = 0;
          this.combo = 1;
          this.comboTimer = 0;
          this.driftScore = 0;
          this.driftMultiplier = 1;
          this.driftDuration = 0;
          this.driftGraceTimer = 0;
          this.cameraShake = Math.max(this.cameraShake, shake);
          this.audio.playScrape();
          this.callbacks.onImpact?.(haptic);
          const dmgPct = Math.max(
            1,
            Math.round((dmg / this.carSpec.maxIntegrity) * 100),
          );
          this.emitCallout(title, `-${dmgPct}% Gövde`, 'rose');
          this.emitSparks(this.playerCar.root.position, -pushSign, sparkCount);
          this.emitDamageSmoke(
            this.playerCar.root.position,
            smokeCount,
            !isLightGraze,
          );
          if (this.integrity <= 0) {
            this.triggerCrash('crash');
            return true;
          }
        }

        const relativeSpeedOk =
          tv.direction === -1 ? this.speedMs > 18 : this.speedMs > tv.speedMs + 5;
        if (
          !tv.nearMissed &&
          ds < 1.5 &&
          ds > -3.5 &&
          dl >= halfSumWidth &&
          dl < halfSumWidth + 1.55 &&
          relativeSpeedOk
        ) {
          tv.nearMissed = true;
          this.nearMissCount++;
          if (this.cameraMode === 'cockpit') {
            this.careerCockpitNearMissCount++;
          }
          this.boostCombo(1);
          const isOncomingMiss = tv.direction === -1;
          const baseBonus = isOncomingMiss
            ? 320
            : this.speedMs > 46
              ? 200
              : 150;
          const totalBonus = Math.round(
            baseBonus * this.combo * this.getActiveModeMultiplier(),
          );
          this.score += totalBonus;
          this.nitro = Math.min(
            this.getActiveNitroMax(),
            this.nitro + (isOncomingMiss ? 20 : 14),
          );
          this.audio.playNearMiss();
          this.emitCallout(
            isOncomingMiss
              ? `TERS ŞERİT MAKAS ×${this.combo}`
              : this.combo > 1
                ? `Makas ×${this.combo}`
                : 'Yakın Geçiş',
            `+${totalBonus}`,
            isOncomingMiss ? 'rose' : 'amber',
          );
          this.handleMissionRewards(this.missions.recordDelta('nearMiss', 1));
          if (this.speedMs * 3.6 >= 300) {
            this.handleMissionRewards(
              this.missions.recordDelta('highSpeedNearMiss', 1),
            );
          }
        }
      }
    }
    return false;
  }

  private stepParticles(dt: number): void {
    let activeSparks = 0;
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const sp = this.sparks[i];
      sp.life += dt;
      if (sp.life >= sp.maxLife) {
        const last = this.sparks.pop()!;
        if (i < this.sparks.length) this.sparks[i] = last;
        this.sparkPool.push(sp);
        continue;
      }
      sp.vel.y -= 15 * dt;
      sp.pos.addScaledVector(sp.vel, dt);

      const scale = 1 - sp.life / sp.maxLife;
      _dummy.position.copy(sp.pos);
      _dummy.scale.setScalar(scale);
      _dummy.rotation.set(sp.life * 8, sp.life * 6, 0);
      _dummy.updateMatrix();
      this.sparksMesh.setMatrixAt(activeSparks++, _dummy.matrix);
    }
    this.sparksMesh.count = activeSparks;
    if (activeSparks > 0) this.sparksMesh.instanceMatrix.needsUpdate = true;

    let activeSmoke = 0;
    for (let i = this.smokes.length - 1; i >= 0; i--) {
      const sm = this.smokes[i];
      sm.life += dt;
      if (sm.life >= sm.maxLife) {
        const last = this.smokes.pop()!;
        if (i < this.smokes.length) this.smokes[i] = last;
        this.smokePool.push(sm);
        continue;
      }
      sm.pos.addScaledVector(sm.vel, dt);
      const progress = sm.life / sm.maxLife;
      const scale = sm.size * (0.6 + progress * 1.8) * (1 - progress * 0.4);
      _dummy.position.copy(sm.pos);
      _dummy.scale.setScalar(scale);
      _dummy.rotation.set(progress * 2, progress * 3, 0);
      _dummy.updateMatrix();
      this.smokeMesh.setMatrixAt(activeSmoke, _dummy.matrix);
      this.smokeMesh.setColorAt(activeSmoke, sm.color);
      activeSmoke++;
    }
    this.smokeMesh.count = activeSmoke;
    if (activeSmoke > 0) {
      this.smokeMesh.instanceMatrix.needsUpdate = true;
      if (this.smokeMesh.instanceColor) {
        this.smokeMesh.instanceColor.needsUpdate = true;
      }
    }

    let activeDamageSmoke = 0;
    for (let i = this.damageSmokes.length - 1; i >= 0; i--) {
      const dm = this.damageSmokes[i];
      dm.life += dt;
      if (dm.life >= dm.maxLife) {
        const last = this.damageSmokes.pop()!;
        if (i < this.damageSmokes.length) this.damageSmokes[i] = last;
        this.damageSmokePool.push(dm);
        continue;
      }
      dm.pos.addScaledVector(dm.vel, dt);
      const progress = dm.life / dm.maxLife;
      const scale = dm.size * (0.55 + progress * 2.1) * (1 - progress * 0.35);
      _dummy.position.copy(dm.pos);
      _dummy.scale.setScalar(scale);
      _dummy.rotation.set(progress * 2.4, progress * 3.1, progress * 1.4);
      _dummy.updateMatrix();
      this.damageSmokeMesh.setMatrixAt(activeDamageSmoke++, _dummy.matrix);
    }
    this.damageSmokeMesh.count = activeDamageSmoke;
    if (activeDamageSmoke > 0) {
      this.damageSmokeMesh.instanceMatrix.needsUpdate = true;
    }

    if (this.exhaustFlames.length > 0) {
      const cfg = this.getEffectiveCustomConfig();
      const nitroSpec =
        NITRO_FLAMES.find((n) => n.id === cfg.nitroFlame) ?? NITRO_FLAMES[0];
      if (nitroSpec.animatedMode) {
        const nowSec = performance.now() * 0.001;
        if (nitroSpec.animatedMode === 'rainbow') {
          const h = (nowSec * 0.65) % 1;
          _nitroCoreColor.setHSL(h, 0.85, 0.86);
          _nitroMidColor.setHSL((h + 0.12) % 1, 0.98, 0.56);
          _nitroTipColor.setHSL((h + 0.28) % 1, 0.98, 0.44);
        } else if (nitroSpec.animatedMode === 'strobe') {
          const isBlue = Math.floor(nowSec * 11) % 2 === 0;
          _nitroCoreColor.setHex(isBlue ? 0xe0f2fe : 0xfee2e2);
          _nitroMidColor.setHex(isBlue ? 0x3b82f6 : 0xef4444);
          _nitroTipColor.setHex(isBlue ? 0x1d4ed8 : 0x991b1b);
        } else if (nitroSpec.animatedMode === 'aurora') {
          const wave = 0.5 + 0.5 * Math.sin(nowSec * 2.6);
          const h = 0.44 + wave * 0.34;
          _nitroCoreColor.setHSL(h, 0.8, 0.85);
          _nitroMidColor.setHSL(h, 0.96, 0.56);
          _nitroTipColor.setHSL((h + 0.14) % 1, 0.95, 0.42);
        }
      }
    }

    let activeExhaustFlames = 0;
    for (let i = this.exhaustFlames.length - 1; i >= 0; i--) {
      const fl = this.exhaustFlames[i];
      fl.life += dt;
      if (fl.life >= fl.maxLife) {
        const last = this.exhaustFlames.pop()!;
        if (i < this.exhaustFlames.length) this.exhaustFlames[i] = last;
        this.exhaustFlamePool.push(fl);
        continue;
      }
      fl.pos.addScaledVector(fl.vel, dt);
      const progress = fl.life / fl.maxLife;
      const scale =
        fl.size *
        (progress < 0.18
          ? 0.65 + progress * 2.4
          : Math.max(0.02, (1 - progress) * 1.32));

      _dummy.position.copy(fl.pos);
      _dummy.scale.set(scale, scale * 0.92, scale * 1.65);
      _dummy.rotation.set(progress * 5.2, progress * 7.4, progress * 3.1);
      _dummy.updateMatrix();
      this.exhaustFlamesMesh.setMatrixAt(activeExhaustFlames, _dummy.matrix);

      if (fl.mode === 'nitro') {
        if (progress < 0.42) {
          _flameColor.lerpColors(
            _nitroCoreColor,
            _nitroMidColor,
            progress / 0.42,
          );
        } else {
          _flameColor.lerpColors(
            _nitroMidColor,
            _nitroTipColor,
            (progress - 0.42) / 0.58,
          );
        }
      } else {
        if (progress < 0.36) {
          _flameColor.lerpColors(
            _fireCoreColor,
            _fireMidColor,
            progress / 0.36,
          );
        } else {
          _flameColor.lerpColors(
            _fireMidColor,
            _fireTipColor,
            (progress - 0.36) / 0.64,
          );
        }
      }
      // Fade brightness cleanly toward end of life for additive blending
      _flameColor.multiplyScalar(Math.max(0, 1 - progress * progress));
      this.exhaustFlamesMesh.setColorAt(activeExhaustFlames, _flameColor);
      activeExhaustFlames++;
    }
    this.exhaustFlamesMesh.count = activeExhaustFlames;
    if (activeExhaustFlames > 0) {
      this.exhaustFlamesMesh.instanceMatrix.needsUpdate = true;
      if (this.exhaustFlamesMesh.instanceColor) {
        this.exhaustFlamesMesh.instanceColor.needsUpdate = true;
      }
    }

    // Flying burning car debris chunks from Rampage explosions
    let activeDebris = 0;
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i];
      d.life += dt;
      if (d.life >= d.maxLife) {
        const last = this.debris.pop()!;
        if (i < this.debris.length) this.debris[i] = last;
        this.debrisPool.push(d);
        continue;
      }
      d.vel.y -= 26 * dt;
      d.pos.addScaledVector(d.vel, dt);
      if (d.pos.y < 0.14) {
        d.pos.y = 0.14;
        d.vel.y = Math.abs(d.vel.y) * 0.35;
        d.vel.x *= 0.75;
        d.vel.z *= 0.75;
      }
      d.rot.addScaledVector(d.rotVel, dt);
      const fade = Math.max(0.05, 1 - Math.pow(d.life / d.maxLife, 1.8));
      _dummy.position.copy(d.pos);
      _dummy.rotation.set(d.rot.x, d.rot.y, d.rot.z);
      _dummy.scale.set(d.scale.x * fade, d.scale.y * fade, d.scale.z * fade);
      _dummy.updateMatrix();
      this.debrisMesh.setMatrixAt(activeDebris, _dummy.matrix);
      this.debrisMesh.setColorAt(activeDebris, d.color);
      activeDebris++;
    }
    this.debrisMesh.count = activeDebris;
    if (activeDebris > 0) {
      this.debrisMesh.instanceMatrix.needsUpdate = true;
      if (this.debrisMesh.instanceColor) {
        this.debrisMesh.instanceColor.needsUpdate = true;
      }
    }

    // Expanding fiery explosion fireballs
    let activeExplosions = 0;
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const ex = this.explosions[i];
      ex.life += dt;
      if (ex.life >= ex.maxLife) {
        const last = this.explosions.pop()!;
        if (i < this.explosions.length) this.explosions[i] = last;
        this.explosionPool.push(ex);
        continue;
      }
      const p = ex.life / ex.maxLife;
      const rad = ex.maxRadius * (0.35 + Math.pow(p, 0.45) * 0.95);
      _dummy.position.copy(ex.pos);
      _dummy.position.y += p * 1.4;
      _dummy.rotation.set(p * 3.5, p * 4.8, p * 2.1);
      _dummy.scale.setScalar(rad * (1 - p * 0.35));
      _dummy.updateMatrix();
      this.explosionMesh.setMatrixAt(activeExplosions, _dummy.matrix);
      if (p < 0.3) {
        _flameColor.setHex(0xfff3b0);
      } else if (p < 0.68) {
        _flameColor.setHex(0xff5a00);
      } else {
        _flameColor.setHex(0x991b1b);
      }
      _flameColor.multiplyScalar(Math.max(0, 1 - p * p));
      this.explosionMesh.setColorAt(activeExplosions, _flameColor);
      activeExplosions++;
    }
    this.explosionMesh.count = activeExplosions;
    if (activeExplosions > 0) {
      this.explosionMesh.instanceMatrix.needsUpdate = true;
      if (this.explosionMesh.instanceColor) {
        this.explosionMesh.instanceColor.needsUpdate = true;
      }
    }
  }

  private stepSpeedStreaks(dt: number): void {
    const speedKmh = this.speedMs * 3.6;
    const boostActive = this.nitroActive || this.rampageTimer > 0;
    if (speedKmh < 105 && !boostActive) {
      this.streaksMesh.count = 0;
      return;
    }

    const intensity = THREE.MathUtils.clamp((speedKmh - 105) / 120, 0, 1);
    const activeCount = Math.round(
      this.maxStreaks * (boostActive ? 1 : 0.2 + intensity * 0.8),
    );
    const widthScale = this.isMobileDevice ? (boostActive ? 1.45 : 1.15) : 1;

    for (let i = 0; i < activeCount; i++) {
      const st = this.streaks[i];
      st.z += (st.speed + this.speedMs * (0.75 + intensity * 0.45)) * dt;
      if (st.z > -1.0) {
        const angle =
          (i / this.maxStreaks) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
        const radius = 3.0 + Math.random() * 4.4;
        st.x = Math.cos(angle) * radius;
        st.y = Math.sin(angle) * radius * 0.72 + 0.35;
        st.z = -24 - Math.random() * 14;
      }
      _dummy.position.set(st.x, st.y, st.z);
      _dummy.rotation.set(0, 0, 0);
      _dummy.scale.set(
        widthScale,
        widthScale,
        st.len * (0.9 + intensity * 0.85) * (boostActive ? 1.95 : 1.0),
      );
      _dummy.updateMatrix();
      this.streaksMesh.setMatrixAt(i, _dummy.matrix);
    }
    this.streaksMesh.count = activeCount;
    this.streaksMesh.instanceMatrix.needsUpdate = true;
  }

  private stepRain(dt: number): void {
    if (this.phase === 'garage' || this.currentRoadZone === 'tunnel') {
      if (this.rainMesh.count > 0) this.rainMesh.count = 0;
      if (this.rainSplashMesh.count > 0) this.rainSplashMesh.count = 0;
      return;
    }

    const rainMat = this.rainMesh.material as THREE.MeshBasicMaterial;
    const biome = sampleBiomeAtDistance(Math.max(0, this.playerS), _biomeSample);
    const rainAmt =
      this.atmosphereId === 'rainy'
        ? 1
        : this.atmosphereId === 'cycle'
          ? this.weatherRainLevel
          : 0;
    const snowAmt =
      this.atmosphereId === 'cycle'
        ? Math.max(this.weatherSnowLevel, biome.snowAmount * 0.45)
        : biome.snowAmount;
    const sandAmt =
      this.atmosphereId === 'cycle'
        ? Math.max(this.weatherSandLevel, biome.sandAmount * 0.35)
        : biome.sandAmount;

    if (rainAmt <= 0.05) {
      if (this.rainSplashMesh.count > 0) this.rainSplashMesh.count = 0;

      if (snowAmt > 0.05) {
        rainMat.color.setHex(0xf0f9ff);
        rainMat.opacity = 0.82 * Math.min(1, snowAmt);

        const forwardRush =
          this.phase === 'playing'
            ? this.speedMs * 0.62
            : this.phase === 'menu'
              ? 10
              : Math.max(0, this.crashSlideSpeed * 0.55);
        const maxSnow = Math.min(
          this.rainDrops.length,
          Math.round(
            (this.isSoftwareGl ? 140 : 280) * Math.min(1, snowAmt) * this.perfScale,
          ),
        );
        const nowSec = performance.now() * 0.001;
        for (let i = 0; i < maxSnow; i++) {
          const d = this.rainDrops[i];
          d.y -= d.fallSpeed * 0.16 * dt;
          d.z += forwardRush * dt;
          d.x += Math.sin(nowSec * 1.9 + i * 0.7) * 2.4 * dt;

          if (d.y < -3.5) {
            d.y += 17;
            d.x = (Math.random() - 0.5) * 34;
            d.z = -33 + Math.random() * 35;
          }
          if (d.z > 2.5) {
            d.z -= 35;
            d.x = (Math.random() - 0.5) * 34;
          }
          if (d.x < -17.5) d.x += 35;
          if (d.x > 17.5) d.x -= 35;

          _dummy.position.set(d.x, d.y, d.z);
          _dummy.rotation.set(nowSec + i, nowSec * 0.7 + i, 0);
          const flakeSize = 3.2 + (i % 4) * 0.7;
          _dummy.scale.set(flakeSize, 0.08, flakeSize);
          _dummy.updateMatrix();
          this.rainMesh.setMatrixAt(i, _dummy.matrix);
        }
        this.rainMesh.count = maxSnow;
        this.rainMesh.instanceMatrix.needsUpdate = true;
        return;
      }

      if (sandAmt > 0.05) {
        rainMat.color.setHex(0xf3c68f);
        rainMat.opacity = 0.36 * Math.min(1, sandAmt);

        const forwardRush =
          this.phase === 'playing'
            ? this.speedMs * 0.72
            : this.phase === 'menu'
              ? 11
              : Math.max(0, this.crashSlideSpeed * 0.5);
        const maxSand = Math.min(
          this.rainDrops.length,
          Math.round(
            (this.isSoftwareGl ? 75 : 155) * Math.min(1, sandAmt) * this.perfScale,
          ),
        );
        for (let i = 0; i < maxSand; i++) {
          const d = this.rainDrops[i];
          d.y -= 1.2 * dt;
          d.z += forwardRush * dt;
          d.x -= (9.5 + (i % 5) * 1.4) * dt;

          if (d.y < -3.2) {
            d.y += 14;
            d.x = (Math.random() - 0.5) * 34;
            d.z = -33 + Math.random() * 35;
          }
          if (d.z > 2.5) {
            d.z -= 35;
            d.x = (Math.random() - 0.5) * 34;
          }
          if (d.x < -17.5) d.x += 35;

          _dummy.position.set(d.x, d.y, d.z);
          _dummy.rotation.set(0.08, 0, Math.PI / 2 - 0.14);
          _dummy.scale.set(1.8, d.len * 0.9, 1.8);
          _dummy.updateMatrix();
          this.rainMesh.setMatrixAt(i, _dummy.matrix);
        }
        this.rainMesh.count = maxSand;
        this.rainMesh.instanceMatrix.needsUpdate = true;
        return;
      }

      if (this.rainMesh.count > 0) this.rainMesh.count = 0;
      return;
    }

    rainMat.color.setHex(0xd0e8ff);
    rainMat.opacity = 0.5 * Math.min(1, rainAmt);

    const forwardRush =
      this.phase === 'playing'
        ? this.speedMs * 0.78
        : this.phase === 'menu'
          ? 12
          : Math.max(0, this.crashSlideSpeed * 0.65);
    const windX = -2.4;
    const tiltX = Math.atan2(forwardRush, 27);

    const dropCount = Math.min(
      this.rainDrops.length,
      Math.round(this.maxRainDrops * Math.min(1, rainAmt) * this.perfScale),
    );
    for (let i = 0; i < dropCount; i++) {
      const d = this.rainDrops[i];
      d.y -= d.fallSpeed * dt;
      d.z += forwardRush * dt;
      d.x += windX * dt;

      if (d.y < -3.5) {
        d.y += 17;
        d.x = (Math.random() - 0.5) * 34;
        d.z = -33 + Math.random() * 35;
      }
      if (d.z > 2.5) {
        d.z -= 35;
        d.x = (Math.random() - 0.5) * 34;
      }
      if (d.x < -17.5) d.x += 35;

      _dummy.position.set(d.x, d.y, d.z);
      _dummy.rotation.set(tiltX, 0, -0.09);
      _dummy.scale.set(1, d.len * (1 + forwardRush * 0.016), 1);
      _dummy.updateMatrix();
      this.rainMesh.setMatrixAt(i, _dummy.matrix);
    }
    this.rainMesh.count = dropCount;
    this.rainMesh.instanceMatrix.needsUpdate = true;

    let activeSplashes = 0;
    const splashCount = Math.min(
      this.rainSplashes.length,
      Math.round(this.maxRainSplashes * Math.min(1, rainAmt) * this.perfScale),
    );
    for (let i = 0; i < splashCount; i++) {
      const sp = this.rainSplashes[i];
      sp.age += dt;
      if (sp.age >= sp.maxAge || sp.s < this.playerS - 4 || sp.s > this.playerS + 58) {
        sp.age = 0;
        sp.maxAge = 0.18 + Math.random() * 0.14;
        sp.s = this.playerS + 2 + Math.random() * 52;
        sp.lateral = (Math.random() - 0.5) * 12.6;
      }

      if (this.road.sampleAtS(sp.s, _trafficSample)) {
        const progress = sp.age / sp.maxAge;
        const ringScale = 0.35 + progress * 1.65;
        _vecC.copy(_trafficSample.tangent).negate();
        _matBasis.makeBasis(
          _trafficSample.right,
          _trafficSample.normal,
          _vecC,
        );
        _quatA.setFromRotationMatrix(_matBasis);

        _dummy.position
          .copy(_trafficSample.pos)
          .addScaledVector(_trafficSample.right, sp.lateral)
          .addScaledVector(_trafficSample.normal, 0.03);
        _dummy.quaternion.copy(_quatA);
        _dummy.scale.setScalar(ringScale);
        _dummy.updateMatrix();
        this.rainSplashMesh.setMatrixAt(activeSplashes++, _dummy.matrix);
      }
    }
    this.rainSplashMesh.count = activeSplashes;
    if (activeSplashes > 0) {
      this.rainSplashMesh.instanceMatrix.needsUpdate = true;
    }
  }

  private triggerCrash(reason: GameOverReason = 'crash'): void {
    this.gameOverReason = reason;
    this.phase = 'gameover';
    this.nitroActive = false;
    this.nitroRequested = false;
    this.drifting = false;
    this.driftScore = 0;
    this.driftMultiplier = 1;
    this.driftDuration = 0;
    this.driftGraceTimer = 0;
    this.cameraShake = reason === 'timeout' ? 0.45 : 1.25;

    this.road.sampleAtS(this.playerS, _roadSample);
    this.crashElapsed = 0;
    this.crashSparkTimer = 0;
    const softStop = reason === 'timeout';
    this.crashSlideSpeed = softStop
      ? Math.max(8, this.speedMs * 0.45)
      : Math.max(12, this.speedMs * 0.58);
    const spinSign = this.playerLateral >= 0 ? -1 : 1;
    this.crashYawVel = softStop
      ? spinSign * 0.45
      : spinSign * (4.1 + Math.random() * 1.1);
    this.crashLatVel = softStop ? 0 : -Math.sign(this.playerLateral || 1) * 2.5;
    this.crashRollTarget = softStop ? 0 : spinSign * 0.135;
    this.crashPitchTarget = softStop ? 0.02 : -0.065;

    if (this.cameraMode === 'hood' || this.cameraMode === 'cockpit') {
      this.crashCamBasePos
        .copy(_roadSample.pos)
        .addScaledVector(_roadSample.right, this.playerLateral * 0.65)
        .addScaledVector(_roadSample.tangent, -5.8)
        .addScaledVector(_roadSample.normal, 2.35);
    } else {
      this.crashCamBasePos.copy(this.camPosCurrent);
    }
    this.crashCamBaseLook
      .copy(this.playerCar.root.position)
      .addScaledVector(_roadSample.normal, 0.8);
    this.crashCamRoll = this.cameraRoll;
    this.crashCamYaw =
      THREE.MathUtils.clamp(this.playerLateral / MAX_PLAYER_LATERAL, -1, 1) *
      0.048;
    this.cockpit.root.visible = false;
    this.playerCar.root.visible = true;
    if (reason === 'timeout') {
      this.audio.playBombBeep(true);
    } else {
      this.audio.playCrash();
    }
    this.audio.updateEngine(0, 0, false);
    this.audio.pauseMusic();
    this.callbacks.onImpact?.(softStop ? 0.5 : 1.0);
    if (!softStop) {
      this.emitSparks(this.playerCar.root.position, 0, 40);
      this.emitDamageSmoke(this.playerCar.root.position, 20, true);
    }

    const finalScore = Math.floor(this.score);
    if (finalScore > this.bestScore) {
      this.bestScore = finalScore;
    }
    if (finalScore > this.runStartBestScore && finalScore > 0) {
      this.bestRecordDistance = Math.max(80, Math.round(this.distanceMeters));
    }
    try {
      localStorage.setItem(BEST_SCORE_KEY, String(this.bestScore));
      localStorage.setItem(
        BEST_RECORD_DIST_KEY,
        String(this.bestRecordDistance),
      );
    } catch {
      // ignore storage failure
    }
    this.commitRunXp();

    if (this.missionDriftAccum >= 1) {
      this.missions.recordDelta('driftPoints', Math.floor(this.missionDriftAccum));
      this.missionDriftAccum = 0;
    }
    if (this.missionDistAccum >= 1) {
      this.missions.recordDelta('distance', Math.floor(this.missionDistAccum));
      this.missionDistAccum = 0;
    }
    if (finalScore > 0) {
      this.handleMissionRewards(
        this.missions.recordPeak('runScore', finalScore),
      );
    }
    this.flushDeferredSaves(true);
    this.callbacks.onMissionsChange?.(this.missions.getSnapshot());
    if (this.activeCareerLevel) {
      const defeatOutcome = this.careerManager.buildDefeatOutcome(
        this.activeCareerLevel,
        this.collectCareerMetrics(),
      );
      this.callbacks.onCareerRunComplete?.(defeatOutcome);
    }
    this.pushHud(true);
    this.callbacks.onMusicChange?.(this.audio.getMusicState());
    this.callbacks.onPhaseChange('gameover');
  }

  private emitCallout(
    text: string,
    points: string,
    tone: FloatingCallout['tone'],
  ): void {
    this.callbacks.onCallout({
      id: this.calloutId++,
      text,
      points,
      tone,
    });
  }

  private recenterIfNeeded(): void {
    const p = this.playerCar.root.position;
    if (p.lengthSq() > 420 * 420) {
      const offset = p.clone();
      this.road.recenter(offset);
      this.roadEvents.recenter(offset);
      this.playerCar.root.position.sub(offset);
      this.camPosCurrent.sub(offset);
      this.camLookCurrent.sub(offset);
      this.crashCamBasePos.sub(offset);
      this.crashCamBaseLook.sub(offset);
      this.camera.position.sub(offset);
      for (const tv of this.traffic) {
        tv.rig.root.position.sub(offset);
      }
      for (const sp of this.sparks) {
        sp.pos.sub(offset);
      }
      for (const sm of this.smokes) {
        sm.pos.sub(offset);
      }
      for (const dm of this.damageSmokes) {
        dm.pos.sub(offset);
      }
      for (const fl of this.exhaustFlames) {
        fl.pos.sub(offset);
      }
      for (const d of this.debris) {
        d.pos.sub(offset);
      }
      for (const ex of this.explosions) {
        ex.pos.sub(offset);
      }
      if (this.rampageAuraMesh.visible) {
        this.rampageAuraMesh.position.sub(offset);
      }
      if (this.recordMarkerGroup.visible) {
        this.recordMarkerGroup.position.sub(offset);
      }
      if (this.finishLineGroup.visible) {
        this.finishLineGroup.position.sub(offset);
      }
    }
  }

  private computeGearAndRpm(speedKmh: number): {
    gear: number;
    rpmRatio: number;
  } {
    let gear = 1;
    for (let g = 1; g <= 6; g++) {
      if (speedKmh >= GEAR_THRESHOLDS[g - 1]) gear = g;
    }
    const low = GEAR_THRESHOLDS[gear - 1];
    const high = GEAR_THRESHOLDS[gear];
    _gearRpmOut.gear = gear;
    _gearRpmOut.rpmRatio = THREE.MathUtils.clamp(
      0.28 + ((speedKmh - low) / Math.max(1, high - low)) * 0.68,
      0.22,
      0.99,
    );
    return _gearRpmOut;
  }

  private getDriftMultiplierState(): { mult: number; progress: number } {
    const t = this.driftDuration;
    let mult = 1;
    for (let i = 1; i < DRIFT_MULT_THRESHOLDS.length; i++) {
      if (t >= DRIFT_MULT_THRESHOLDS[i]) mult = i + 1;
    }
    if (mult >= 10) {
      _driftMultOut.mult = 10;
      _driftMultOut.progress = 1;
      return _driftMultOut;
    }
    const low = DRIFT_MULT_THRESHOLDS[mult - 1];
    const high = DRIFT_MULT_THRESHOLDS[mult];
    _driftMultOut.mult = mult;
    _driftMultOut.progress = THREE.MathUtils.clamp((t - low) / (high - low), 0, 1);
    return _driftMultOut;
  }

  private pushHud(force: boolean): void {
    const now = performance.now();
    const minInterval = this.isMobileDevice ? 120 : 66;
    if (!force && now - this.lastHudPush < minInterval) return;
    this.lastHudPush = now;

    const speedKmh = Math.round(this.speedMs * 3.6);
    const { gear, rpmRatio } = this.computeGearAndRpm(speedKmh);
    const maxInt = this.carSpec.maxIntegrity;
    const nitroMax = this.getActiveNitroMax();
    const clampedNitro = Math.min(nitroMax, Math.max(0, this.nitro));
    const { progress: driftProgress } = this.getDriftMultiplierState();
    const activeBiomeForHud = sampleBiomeAtDistance(
      Math.max(0, this.playerS),
      _biomeSample,
    ).primary;

    this.callbacks.onHudUpdate({
      speedKmh,
      rpmRatio,
      gear,
      distanceMeters: Math.floor(this.distanceMeters),
      score: Math.floor(this.score),
      bestScore: this.bestScore,
      nearMissCount: this.nearMissCount,
      cleanCurvesCount: this.cleanCurvesCount,
      laneRatio: THREE.MathUtils.clamp(
        this.playerLateral / MAX_PLAYER_LATERAL,
        -1,
        1,
      ),
      curvature: _roadSample.curvature,
      integrity: Math.round((this.integrity / maxInt) * 100),
      nitro: Math.min(nitroMax, Math.max(0, Math.round(clampedNitro))),
      nitroMax,
      nitroPercent: Math.min(
        100,
        Math.max(0, (clampedNitro / Math.max(1, nitroMax)) * 100),
      ),
      nitroActive: this.nitroActive,
      combo: this.combo,
      comboTimerRatio: this.combo > 1 ? this.comboTimer / this.comboDuration : 0,
      upcomingCurve: this.road.getUpcomingCurve(this.playerS),
      drifting: this.drifting,
      driftScore: Math.round(this.driftScore),
      driftMultiplier: this.driftMultiplier,
      driftProgress,
      driftGraceRatio: 1,
      driftAngleDeg: Math.round(Math.min(42, Math.abs(this.driftSlip) * 175)),
      driftTotalRun: Math.round(this.totalDriftScore),
      goldCoins: this.totalGold,
      runGold: this.runGold,
      magnetTimer: this.magnetTimer,
      magnetDuration: getMagnetDurationSec(this.powerUpUpgrades.magnet.primary),
      rampageTimer: this.rampageTimer,
      rampageDuration: getRampageDurationSec(
        this.powerUpUpgrades.rampage.primary,
      ),
      rampageSpeedMult: getRampageSpeedMultiplier(
        this.powerUpUpgrades.rampage.secondary,
      ),
      playerLevel: this.getLivePlayerLevel(),
      biomeId: activeBiomeForHud.id,
      biomeLabel: activeBiomeForHud.label,
      previousBestScore: this.runStartBestScore,
      bestRecordDistanceMeters: this.runStartBestRecordDistance,
      rentedCarModel: this.rentedCarModel,
      roadZone: this.currentRoadZone,
      upcomingEvent: this.upcomingEvent,
      airborne: this.playerHeight > 0.18,
      onSlick: this.slickTimer > 0,
      gameMode: this.gameMode,
      gameOverReason: this.gameOverReason,
      inOncomingLane: this.inOncomingLane,
      timeLeftSec: this.timeLeftSec,
      nextCheckpointMeters: Math.max(
        0,
        Math.round(this.nextCheckpointMeters - this.distanceMeters),
      ),
      checkpointsCleared: this.checkpointsCleared,
      bombMinSpeedKmh: this.bombMinSpeedKmh,
      bombArmed: this.bombArmed,
      bombFuseRatio: THREE.MathUtils.clamp(this.bombFuseTimer / 5.0, 0, 1),
      weatherKind:
        this.atmosphereId === 'rainy' ? 'rain' : this.dynamicWeather,
      rainIntensity: this.getEffectiveRoadWetness(),
      fogIntensity:
        this.atmosphereId === 'cycle' ? this.weatherFogLevel : 0,
      roadWetness: this.getEffectiveRoadWetness(),
      resumeCountdown:
        this.resumeCountdownTimer > 0
          ? Math.min(3, Math.max(1, Math.ceil(this.resumeCountdownTimer / 0.65)))
          : 0,
      career: this.buildCareerHudState(),
    });
  }

  public dispose(): void {
    this.commitRunXp();
    this.flushDeferredSaves(false);
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('pagehide', this.handlePageHide);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.renderer.domElement.removeEventListener(
      'webglcontextlost',
      this.handleContextLost,
    );
    this.renderer.domElement.removeEventListener(
      'webglcontextrestored',
      this.handleContextRestored,
    );

    this.audio.dispose();
    this.road.dispose();
    this.roadEvents.dispose();
    this.clearGarageCarCache();
    this.playerCar.dispose();
    this.cockpit.dispose();
    this.trafficRecyclePool.sedan.length = 0;
    this.trafficRecyclePool.suv.length = 0;
    this.trafficRecyclePool.truck.length = 0;
    this.trafficPool.dispose();
    this.textures.dispose();
    this.sparksMesh.geometry.dispose();
    (this.sparksMesh.material as THREE.Material).dispose();
    this.smokeMesh.geometry.dispose();
    (this.smokeMesh.material as THREE.Material).dispose();
    this.damageSmokeMesh.geometry.dispose();
    (this.damageSmokeMesh.material as THREE.Material).dispose();
    this.exhaustFlamesMesh.geometry.dispose();
    (this.exhaustFlamesMesh.material as THREE.Material).dispose();
    this.streaksMesh.geometry.dispose();
    (this.streaksMesh.material as THREE.Material).dispose();
    this.rainMesh.geometry.dispose();
    (this.rainMesh.material as THREE.Material).dispose();
    this.rainSplashMesh.geometry.dispose();
    (this.rainSplashMesh.material as THREE.Material).dispose();
    this.coinsMesh.geometry.dispose();
    (this.coinsMesh.material as THREE.Material).dispose();
    this.nitroMesh.geometry.dispose();
    (this.nitroMesh.material as THREE.Material).dispose();
    this.repairMesh.geometry.dispose();
    (this.repairMesh.material as THREE.Material).dispose();
    this.magnetMesh.geometry.dispose();
    (this.magnetMesh.material as THREE.Material).dispose();
    this.rampageCoreMesh.geometry.dispose();
    (this.rampageCoreMesh.material as THREE.Material).dispose();
    this.rampageRingMesh.geometry.dispose();
    (this.rampageRingMesh.material as THREE.Material).dispose();
    this.rampageAuraMesh.geometry.dispose();
    (this.rampageAuraMesh.material as THREE.Material).dispose();
    this.debrisMesh.geometry.dispose();
    (this.debrisMesh.material as THREE.Material).dispose();
    this.explosionMesh.geometry.dispose();
    (this.explosionMesh.material as THREE.Material).dispose();
    this.skyDome.geometry.dispose();
    (this.skyDome.material as THREE.Material).dispose();
    this.sunDisc.geometry.dispose();
    (this.sunDisc.material as THREE.Material).dispose();
    this.envMapTexture?.dispose();
    this.garageGeometries.forEach((g) => g.dispose());
    this.garageMaterials.forEach((m) => m.dispose());
    this.recordMarkerGeos.forEach((g) => g.dispose());
    this.recordMarkerMats.forEach((m) => m.dispose());
    this.recordMarkerTextures.forEach((t) => t.dispose());
    this.finishLineGeos.forEach((g) => g.dispose());
    this.finishLineMats.forEach((m) => m.dispose());
    this.finishLineTextures.forEach((t) => t.dispose());
    setForcedBiome(null);
    this.motionBlurPass?.material.dispose();
    this.composer?.dispose();

    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}

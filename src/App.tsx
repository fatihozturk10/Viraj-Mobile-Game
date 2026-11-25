import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { ActiveAdSession, AdOverlayModal } from './components/AdOverlayModal';
import { CareerMapModal } from './components/CareerMapModal';
import { CrateOpeningCeremony } from './components/CrateOpeningCeremony';
import { DailyWheelModal } from './components/DailyWheelModal';
import { GameHud } from './components/GameHud';
import {
  HoldThrottleIndicator,
  HoldThrottleIndicatorHandle,
  NitroBurstState,
} from './components/HoldThrottleIndicator';
import { LeaderboardModal } from './components/LeaderboardModal';
import { LevelRoadModal } from './components/LevelRoadModal';
import { LevelUpCelebrationOverlay } from './components/LevelUpCelebrationOverlay';
import { OfflineIndicator } from './components/OfflineIndicator';
import { SettingsModal } from './components/SettingsModal';
import { SpeedLinesOverlay } from './components/SpeedLinesOverlay';
import {
  StoreFulfillmentOutcome,
  StoreModal,
  StoreTabId,
} from './components/StoreModal';
import { auth } from './firebase';
import { AudioSettings, MusicPlayerState } from './game/audioEngine';
import {
  CareerProgressSnapshot,
  CareerRunOutcome,
  MAX_CAREER_STARS,
} from './game/careerLevels';
import { HighwayEngine } from './game/HighwayEngine';
import { GAME_MUSIC_TRACK } from './game/synthwavePlayer';
import {
  adManager,
  AdStateSnapshot,
  RewardedAdPlacement,
  WheelSlice,
} from './services/adManager';
import {
  initAndroidRuntime,
  isHapticsEnabled,
  setHapticsEnabled,
  subscribeAndroidLifecycle,
  triggerNativeHaptic,
} from './services/androidBridge';
import {
  loadNotificationSettings,
  NotificationSettings,
  refreshScheduledNotifications,
} from './services/notificationService';
import {
  billingService,
  PaymentMethodId,
  StoreEntitlementState,
} from './services/billingService';
import {
  initGoogleAds,
  isGoogleAdsConfigured,
  syncGoogleAdsSound,
  triggerGoogleInterstitialAd,
  triggerGoogleRewardedAd,
} from './services/googleAdsBridge';
import {
  consumePendingRedirectAuth,
  submitRunToLeaderboard,
} from './services/leaderboardService';
import { redeemGlobalPromoCode } from './services/promoCodes';
import {
  CrateTierId,
  getBundleBySku,
  getCrateByTier,
  rollCrateRewards,
  RolledLootItem,
  StoreCheckoutItem,
} from './services/storeCatalog';
import {
  BODY_KITS,
  BodyKitId,
  CAMERA_MODES,
  CameraMode,
  CAR_MODELS,
  CarColorId,
  CarCustomConfig,
  CarModelId,
  CarUpgradeKey,
  CarUpgrades,
  CarWheelConfig,
  computePlayerLevel,
  FloatingCallout,
  GameModeId,
  GamePhase,
  GarageCameraFocus,
  getDefaultCustomForCar,
  getDefaultPowerUpUpgrades,
  getDefaultUnlockedCarColors,
  getDefaultVisualUnlocks,
  getDefaultWheelForCar,
  HudStats,
  LevelUpEvent,
  LIVERIES,
  LiveryId,
  MissionsSnapshot,
  PlayerLevelInfo,
  PowerUpId,
  PowerUpUpgrades,
  PowerUpUpgradeTrack,
  SPOILERS,
  SpoilerId,
  VisualCategory,
  VisualUnlocks,
  WHEEL_STYLES,
  WheelColorId,
  WheelStyleId,
} from './types/game';

const INITIAL_LEVEL_INFO = computePlayerLevel(0);

const INITIAL_STATS: HudStats = {
  speedKmh: 90,
  rpmRatio: 0.35,
  gear: 3,
  distanceMeters: 0,
  score: 0,
  bestScore: 0,
  nearMissCount: 0,
  cleanCurvesCount: 0,
  laneRatio: 0,
  curvature: 0,
  integrity: 100,
  nitro: 55,
  nitroMax: 100,
  nitroPercent: 55,
  nitroActive: false,
  combo: 1,
  comboTimerRatio: 0,
  upcomingCurve: 'none',
  drifting: false,
  driftScore: 0,
  driftMultiplier: 1,
  driftProgress: 0,
  driftGraceRatio: 0,
  driftAngleDeg: 0,
  driftTotalRun: 0,
  goldCoins: 0,
  runGold: 0,
  magnetTimer: 0,
  magnetDuration: 10,
  rampageTimer: 0,
  rampageDuration: 3.5,
  rampageSpeedMult: 2,
  playerLevel: INITIAL_LEVEL_INFO,
  biomeId: 'alpine',
  biomeLabel: 'Yeşil Vadi',
  previousBestScore: 0,
  bestRecordDistanceMeters: 0,
  rentedCarModel: null,
  roadZone: 'open',
  upcomingEvent: null,
  airborne: false,
  onSlick: false,
  gameMode: 'endless',
  gameOverReason: 'crash',
  policeHeat: 0,
  policeActiveCount: 0,
  policeProximity: 0,
  bustedProgress: 0,
  evadeProgress: 0,
  policeEvadedCount: 0,
  inOncomingLane: false,
  timeLeftSec: 45,
  nextCheckpointMeters: 750,
  checkpointsCleared: 0,
  bombMinSpeedKmh: 130,
  bombArmed: false,
  bombFuseRatio: 1,
  career: null,
};

const INITIAL_CAREER_PROGRESS: CareerProgressSnapshot = {
  highestUnlockedLevel: 1,
  totalStars: 0,
  maxStars: MAX_CAREER_STARS,
  completedLevelsCount: 0,
  levels: {},
  claimedChests: [],
};

const EMPTY_UPGRADES: CarUpgrades = {
  engine: 0,
  tires: 0,
  nitroTank: 0,
  nitroPower: 0,
};
const INITIAL_UPGRADES_MAP: Record<CarModelId, CarUpgrades> = {
  dogan: { ...EMPTY_UPGRADES },
  hatch: { ...EMPTY_UPGRADES },
  gt: { ...EMPTY_UPGRADES },
  rally: { ...EMPTY_UPGRADES },
  pickup: { ...EMPTY_UPGRADES },
  muscle: { ...EMPTY_UPGRADES },
  m3gtr: { ...EMPTY_UPGRADES },
  jdm: { ...EMPTY_UPGRADES },
  porsche: { ...EMPTY_UPGRADES },
  amggt: { ...EMPTY_UPGRADES },
  hyper: { ...EMPTY_UPGRADES },
  laferrari: { ...EMPTY_UPGRADES },
  lambo: { ...EMPTY_UPGRADES },
  mclarenp1: { ...EMPTY_UPGRADES },
  bugatti: { ...EMPTY_UPGRADES },
  jesko: { ...EMPTY_UPGRADES },
  f1: { ...EMPTY_UPGRADES },
  pagani: { ...EMPTY_UPGRADES },
  bolide: { ...EMPTY_UPGRADES },
  solaris: { ...EMPTY_UPGRADES },
};
const INITIAL_WHEELS_MAP: Record<CarModelId, CarWheelConfig> = {
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
const INITIAL_CUSTOM_MAP: Record<CarModelId, CarCustomConfig> = {
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
const INITIAL_MISSIONS: MissionsSnapshot = {
  dailyDateKey: '',
  activeMissions: [],
  achievements: [],
  completedMissionsTotal: 0,
  claimableMissionsCount: 0,
  claimableAchievementsCount: 0,
  totalClaimableCount: 0,
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<HighwayEngine | null>(null);

  const [phase, setPhase] = useState<GamePhase>('menu');
  const [engineError, setEngineError] = useState<string | null>(null);
  const [stats, setStats] = useState<HudStats>(INITIAL_STATS);
  const [muted, setMuted] = useState(false);
  const [audioSettings, setAudioSettings] = useState<AudioSettings>({
    muted: false,
    sfxVolume: 0.85,
    musicVolume: 0.85,
  });
  const [hapticsEnabled, setHapticsEnabledState] = useState<boolean>(() =>
    isHapticsEnabled(),
  );
  const [notificationSettings, setNotificationSettings] =
    useState<NotificationSettings>(() => loadNotificationSettings());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [carModel, setCarModel] = useState<CarModelId>('dogan');
  const [carColor, setCarColor] = useState<CarColorId>('pearl');
  const [licensePlate, setLicensePlate] = useState('VİRAJ 34');
  const [cameraMode, setCameraMode] = useState<CameraMode>('chase');
  const [garageMenuCollapsed, setGarageMenuCollapsed] = useState(false);
  const [showSteerHint, setShowSteerHint] = useState(true);
  const [callout, setCallout] = useState<FloatingCallout | null>(null);
  const [musicState, setMusicState] = useState<MusicPlayerState>({
    playing: false,
    enabled: true,
    track: GAME_MUSIC_TRACK,
  });
  const [impactFlash, setImpactFlash] = useState(0);
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [goldCoins, setGoldCoins] = useState(0);
  const [unlockedCars, setUnlockedCars] = useState<CarModelId[]>(['dogan']);
  const [carUpgrades, setCarUpgrades] =
    useState<Record<CarModelId, CarUpgrades>>(INITIAL_UPGRADES_MAP);
  const [powerUpUpgrades, setPowerUpUpgrades] = useState<PowerUpUpgrades>(
    getDefaultPowerUpUpgrades,
  );
  const [unlockedWheelStyles, setUnlockedWheelStyles] = useState<
    WheelStyleId[]
  >(['twin5']);
  const [carWheels, setCarWheels] =
    useState<Record<CarModelId, CarWheelConfig>>(INITIAL_WHEELS_MAP);
  const [unlockedBodyKits, setUnlockedBodyKits] = useState<BodyKitId[]>([
    'stock',
  ]);
  const [unlockedSpoilers, setUnlockedSpoilers] = useState<SpoilerId[]>([
    'none',
  ]);
  const [unlockedLiveries, setUnlockedLiveries] = useState<LiveryId[]>([
    'solid',
  ]);
  const [carCustom, setCarCustom] =
    useState<Record<CarModelId, CarCustomConfig>>(INITIAL_CUSTOM_MAP);
  const [visualUnlocks, setVisualUnlocks] = useState<VisualUnlocks>(
    getDefaultVisualUnlocks,
  );
  const [playerLevel, setPlayerLevel] =
    useState<PlayerLevelInfo>(INITIAL_LEVEL_INFO);
  const [claimedLevelRewards, setClaimedLevelRewards] = useState<number[]>([]);
  const [unlockedCarColors, setUnlockedCarColors] = useState<CarColorId[]>(
    getDefaultUnlockedCarColors,
  );
  const [levelRoadOpen, setLevelRoadOpen] = useState(false);
  const [levelRoadFocusLevel, setLevelRoadFocusLevel] = useState<number | null>(
    null,
  );
  const [activeLevelUp, setActiveLevelUp] = useState<LevelUpEvent | null>(null);
  const [levelRoadCrateSession, setLevelRoadCrateSession] = useState<{
    title: string;
    subtitle: string;
    rewardSummary: string;
    crateTierId: CrateTierId;
    crateImageUrl?: string;
    crateTitle: string;
    lootItems: RolledLootItem[];
    unlockedCarNames: string[];
  } | null>(null);
  const [missions, setMissions] =
    useState<MissionsSnapshot>(INITIAL_MISSIONS);
  const holdIndicatorRef = useRef<HoldThrottleIndicatorHandle | null>(null);
  const showSteerHintRef = useRef(true);
  const [nitroBurst, setNitroBurst] = useState<NitroBurstState | null>(null);

  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [dailyWheelOpen, setDailyWheelOpen] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);
  const [storeInitialTab, setStoreInitialTab] = useState<StoreTabId>('bundles');
  const [storeEntitlements, setStoreEntitlements] =
    useState<StoreEntitlementState>(() => billingService.getSnapshot());
  const [activeAdSession, setActiveAdSession] =
    useState<ActiveAdSession | null>(null);
  const [adState, setAdState] = useState<AdStateSnapshot>(() =>
    adManager.getSnapshot(),
  );
  const [revivedThisRun, setRevivedThisRun] = useState(false);
  const [runGoldDoubled, setRunGoldDoubled] = useState(false);
  const [gameMode, setGameMode] = useState<GameModeId>('endless');
  const [careerMapOpen, setCareerMapOpen] = useState(false);
  const [careerProgress, setCareerProgress] = useState<CareerProgressSnapshot>(
    INITIAL_CAREER_PROGRESS,
  );
  const [lastCareerOutcome, setLastCareerOutcome] =
    useState<CareerRunOutcome | null>(null);
  const lastCareerOutcomeRef = useRef<CareerRunOutcome | null>(null);
  lastCareerOutcomeRef.current = lastCareerOutcome;

  const statsRef = useRef(stats);
  statsRef.current = stats;
  const carModelRef = useRef(carModel);
  carModelRef.current = carModel;
  const licensePlateRef = useRef(licensePlate);
  licensePlateRef.current = licensePlate;
  const playerLevelRef = useRef(playerLevel);
  playerLevelRef.current = playerLevel;
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const pendingInterstitialActionRef = useRef<(() => void) | null>(null);
  const pendingExtraSpinCbRef = useRef<(() => void) | null>(null);
  const adRequestBusyRef = useRef(false);

  const activePointerIdRef = useRef<number | null>(null);
  const lastPointerXRef = useRef(0);
  const lastPointerYRef = useRef(0);
  const startPointerYRef = useRef(0);
  const hintTimeoutRef = useRef<number | null>(null);
  const calloutTimeoutRef = useRef<number | null>(null);
  const impactTimeoutRef = useRef<number | null>(null);
  const gameOverDelayRef = useRef<number | null>(null);
  const nitroBurstTimeoutRef = useRef<number | null>(null);
  const nitroBurstIdRef = useRef(1);
  const lastTapRef = useRef({ time: 0, x: 0, y: 0, moved: false });

  const pendingPostRunLevelUpRef = useRef<LevelUpEvent | null>(null);
  const inDriveLevelUpTimerRef = useRef<number | null>(null);

  const modalsOpenRef = useRef({
    leaderboardOpen: false,
    dailyWheelOpen: false,
    storeOpen: false,
    settingsOpen: false,
    careerMapOpen: false,
    levelRoadOpen: false,
    hasLevelUpModal: false,
    hasLevelRoadCrate: false,
    hasActiveAd: false,
  });
  modalsOpenRef.current = {
    leaderboardOpen,
    dailyWheelOpen,
    storeOpen,
    settingsOpen,
    careerMapOpen,
    levelRoadOpen,
    hasLevelUpModal: Boolean(activeLevelUp && phase !== 'playing'),
    hasLevelRoadCrate: Boolean(levelRoadCrateSession),
    hasActiveAd: Boolean(activeAdSession),
  };

  const triggerNitroBurst = useCallback((x: number, y: number) => {
    triggerNativeHaptic('medium');
    setNitroBurst({ id: nitroBurstIdRef.current++, x, y });
    if (nitroBurstTimeoutRef.current) {
      window.clearTimeout(nitroBurstTimeoutRef.current);
    }
    nitroBurstTimeoutRef.current = window.setTimeout(() => {
      setNitroBurst(null);
      nitroBurstTimeoutRef.current = null;
    }, 880);
  }, []);

  const keysRef = useRef({
    left: false,
    right: false,
    up: false,
    down: false,
  });

  useEffect(() => {
    const mountEl = canvasMountRef.current;
    if (!mountEl) return;

    void initGoogleAds(!mutedRef.current);
    void consumePendingRedirectAuth();

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user && user.emailVerified) {
        void billingService
          .restorePurchasesFromCloud()
          .then((res) => {
            setStoreEntitlements(res.snapshot);
            if (res.restoredAdFree && !adManager.isAdFree()) {
              setAdState(adManager.purchaseAdFree());
            }
          })
          .catch(() => {
            // keep local entitlements if offline
          });
      }
    });

    let engine: HighwayEngine;
    try {
      engine = new HighwayEngine(mountEl, {
      onHudUpdate: (nextStats) => {
        statsRef.current = nextStats;
        setStats(nextStats);
      },
      onPhaseChange: (nextPhase) => {
        setPhase(nextPhase);
        if (nextPhase === 'garage') {
          setGarageMenuCollapsed(false);
        }
        if (nextPhase !== 'playing') {
          holdIndicatorRef.current?.setHold(null);
          setNitroBurst(null);
        }
        if (nextPhase === 'menu' || nextPhase === 'playing') {
          setCarModel(engine.getActiveCarModel());
        }
        if (gameOverDelayRef.current) {
          window.clearTimeout(gameOverDelayRef.current);
          gameOverDelayRef.current = null;
        }
        if (nextPhase === 'gameover') {
          setAdState(adManager.recordRunCompleted());
          const latestStats = statsRef.current;
          void submitRunToLeaderboard({
            plate: licensePlateRef.current,
            carModel: carModelRef.current,
            score: latestStats.score,
            distanceMeters: latestStats.distanceMeters,
            driftTotal: latestStats.driftTotalRun,
            playerLevel: latestStats.playerLevel.level,
          }).catch((err) => {
            console.error('Leaderboard submit failed:', err);
          });

          setShowGameOverModal(false);
          const modalDelayMs =
            latestStats.gameOverReason === 'career_win' ? 480 : 1050;
          gameOverDelayRef.current = window.setTimeout(() => {
            setShowGameOverModal(true);
            gameOverDelayRef.current = null;
            if (pendingPostRunLevelUpRef.current) {
              const pending = pendingPostRunLevelUpRef.current;
              pendingPostRunLevelUpRef.current = null;
              if (inDriveLevelUpTimerRef.current) {
                window.clearTimeout(inDriveLevelUpTimerRef.current);
                inDriveLevelUpTimerRef.current = null;
              }
              setActiveLevelUp(pending);
            }
          }, modalDelayMs);
        } else {
          setShowGameOverModal(false);
          if (nextPhase === 'menu' && pendingPostRunLevelUpRef.current) {
            const pending = pendingPostRunLevelUpRef.current;
            pendingPostRunLevelUpRef.current = null;
            if (inDriveLevelUpTimerRef.current) {
              window.clearTimeout(inDriveLevelUpTimerRef.current);
              inDriveLevelUpTimerRef.current = null;
            }
            setActiveLevelUp(pending);
          }
        }
      },
      onCallout: (nextCallout) => {
        setCallout(nextCallout);
        if (calloutTimeoutRef.current) {
          window.clearTimeout(calloutTimeoutRef.current);
        }
        calloutTimeoutRef.current = window.setTimeout(() => {
          setCallout(null);
        }, 1350);
      },
      onMusicChange: (nextMusic) => setMusicState(nextMusic),
      onImpact: (strength) => {
        triggerNativeHaptic(strength > 0.65 ? 'crash' : 'heavy');
        setImpactFlash(strength);
        if (impactTimeoutRef.current) {
          window.clearTimeout(impactTimeoutRef.current);
        }
        impactTimeoutRef.current = window.setTimeout(() => {
          setImpactFlash(0);
        }, 280);
      },
      onProgressionChange: (
        nextGold,
        nextUnlocked,
        _equipped,
        nextUpgrades,
        nextLevel,
        nextUnlockedWheels,
        nextCarWheels,
        nextUnlockedKits,
        nextUnlockedSpoilers,
        nextUnlockedLiveries,
        nextCarCustom,
        nextVisualUnlocks,
        nextPowerUpUpgrades,
        nextClaimedLevelRewards,
        nextUnlockedCarColors,
      ) => {
        setGoldCoins(nextGold);
        setUnlockedCars(nextUnlocked);
        setCarUpgrades(nextUpgrades);
        setPlayerLevel(nextLevel);
        setUnlockedWheelStyles(nextUnlockedWheels);
        setCarWheels(nextCarWheels);
        setUnlockedBodyKits(nextUnlockedKits);
        setUnlockedSpoilers(nextUnlockedSpoilers);
        setUnlockedLiveries(nextUnlockedLiveries);
        setCarCustom(nextCarCustom);
        setVisualUnlocks(nextVisualUnlocks);
        setPowerUpUpgrades(nextPowerUpUpgrades);
        setClaimedLevelRewards(nextClaimedLevelRewards);
        setUnlockedCarColors(nextUnlockedCarColors);
      },
      onLevelUp: (event) => {
        triggerNativeHaptic('reward');
        if (phaseRef.current === 'playing') {
          if (pendingPostRunLevelUpRef.current) {
            pendingPostRunLevelUpRef.current = {
              fromLevel: pendingPostRunLevelUpRef.current.fromLevel,
              toLevel: event.toLevel,
              rankTitle: event.rankTitle,
              totalXp: event.totalXp,
            };
          } else {
            pendingPostRunLevelUpRef.current = event;
          }
          setActiveLevelUp(event);
          if (inDriveLevelUpTimerRef.current) {
            window.clearTimeout(inDriveLevelUpTimerRef.current);
          }
          inDriveLevelUpTimerRef.current = window.setTimeout(() => {
            setActiveLevelUp((prev) =>
              prev &&
              prev.toLevel === event.toLevel &&
              prev.totalXp === event.totalXp
                ? null
                : prev,
            );
            inDriveLevelUpTimerRef.current = null;
          }, 3600);
        } else {
          if (inDriveLevelUpTimerRef.current) {
            window.clearTimeout(inDriveLevelUpTimerRef.current);
            inDriveLevelUpTimerRef.current = null;
          }
          setActiveLevelUp(event);
        }
      },
      onMissionsChange: (nextSnapshot) => {
        setMissions(nextSnapshot);
      },
      onCareerProgressChange: (nextCareer) => {
        setCareerProgress(nextCareer);
      },
      onCareerRunComplete: (outcome) => {
        setLastCareerOutcome(outcome);
        if (outcome.won) {
          triggerNativeHaptic('reward');
        }
      },
    });
    } catch (err) {
      console.error('HighwayEngine init failed:', err);
      setEngineError(
        err instanceof Error
          ? err.message
          : '3D grafik motoru başlatılamadı (WebGL).',
      );
      return () => {
        unsubAuth();
      };
    }
    setEngineError(null);
    engineRef.current = engine;
    const prog = engine.getProgressionState();
    setGoldCoins(prog.goldCoins);
    setUnlockedCars(prog.unlockedCars);
    setCarModel(prog.equippedCar);
    setCarUpgrades(prog.carUpgrades);
    setPowerUpUpgrades(prog.powerUpUpgrades);
    setUnlockedWheelStyles(prog.unlockedWheelStyles);
    setCarWheels(prog.carWheels);
    setUnlockedBodyKits(prog.unlockedBodyKits);
    setUnlockedSpoilers(prog.unlockedSpoilers);
    setUnlockedLiveries(prog.unlockedLiveries);
    setCarCustom(prog.carCustom);
    setVisualUnlocks(prog.visualUnlocks);
    setPlayerLevel(prog.playerLevel);
    setClaimedLevelRewards(prog.claimedLevelRewards);
    setUnlockedCarColors(prog.unlockedCarColors);
    setLicensePlate(engine.getLicensePlate());
    setGameMode(engine.getGameMode());
    setMissions(engine.getMissionsSnapshot());
    setCareerProgress(engine.getCareerSnapshot());
    const initAudio = engine.audio.getAudioSettings();
    setMuted(initAudio.muted);
    setAudioSettings(initAudio);
    syncGoogleAdsSound(!initAudio.muted);
    void initAndroidRuntime();
    void refreshScheduledNotifications();

    const unsubAndroid = subscribeAndroidLifecycle({
      onBackButton: () => {
        const m = modalsOpenRef.current;
        if (m.hasLevelRoadCrate) {
          setLevelRoadCrateSession(null);
          return true;
        }
        if (m.hasLevelUpModal) {
          setActiveLevelUp(null);
          return true;
        }
        if (m.levelRoadOpen) {
          setLevelRoadOpen(false);
          setLevelRoadFocusLevel(null);
          return true;
        }
        if (m.settingsOpen) {
          setSettingsOpen(false);
          return true;
        }
        if (m.storeOpen) {
          setStoreOpen(false);
          return true;
        }
        if (m.hasActiveAd || adRequestBusyRef.current) {
          return true;
        }
        if (m.careerMapOpen) {
          setCareerMapOpen(false);
          return true;
        }
        if (m.dailyWheelOpen) {
          setDailyWheelOpen(false);
          return true;
        }
        if (m.leaderboardOpen) {
          setLeaderboardOpen(false);
          return true;
        }
        const curPhase = phaseRef.current;
        if (curPhase === 'playing') {
          engine.togglePause();
          return true;
        }
        if (curPhase === 'paused' || curPhase === 'garage' || curPhase === 'gameover') {
          engine.returnToMenu();
          return true;
        }
        return false;
      },
      onBackground: () => {
        engine.audio.setMuted(true, false);
        void refreshScheduledNotifications();
        if (phaseRef.current === 'playing') {
          engine.togglePause();
        }
      },
      onForeground: () => {
        if (!adRequestBusyRef.current && !modalsOpenRef.current.hasActiveAd) {
          engine.audio.setMuted(mutedRef.current, false);
        }
        setMissions(engine.getMissionsSnapshot());
      },
    });

    return () => {
      if (hintTimeoutRef.current) window.clearTimeout(hintTimeoutRef.current);
      if (calloutTimeoutRef.current)
        window.clearTimeout(calloutTimeoutRef.current);
      if (impactTimeoutRef.current)
        window.clearTimeout(impactTimeoutRef.current);
      if (gameOverDelayRef.current)
        window.clearTimeout(gameOverDelayRef.current);
      if (nitroBurstTimeoutRef.current)
        window.clearTimeout(nitroBurstTimeoutRef.current);
      if (inDriveLevelUpTimerRef.current)
        window.clearTimeout(inDriveLevelUpTimerRef.current);
      unsubAndroid();
      unsubAuth();
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    const syncKeys = () => {
      engineRef.current?.setKeyboardState(
        keysRef.current.left,
        keysRef.current.right,
        keysRef.current.up,
        keysRef.current.down,
      );
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement | null)?.tagName;
      if (targetTag === 'INPUT' || targetTag === 'TEXTAREA') {
        return;
      }
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        keysRef.current.left = true;
        setShowSteerHint(false);
        syncKeys();
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        keysRef.current.right = true;
        setShowSteerHint(false);
        syncKeys();
      } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        keysRef.current.up = true;
        syncKeys();
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        keysRef.current.down = true;
        syncKeys();
      } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        engineRef.current?.setNitroActive(true);
      } else if (e.code === 'KeyC' && phase === 'playing') {
        setCameraMode((prev) => {
          const idx = CAMERA_MODES.findIndex((m) => m.id === prev);
          const next = CAMERA_MODES[(idx + 1) % CAMERA_MODES.length].id;
          engineRef.current?.setCameraMode(next);
          return next;
        });
      } else if (
        (e.code === 'Digit1' ||
          e.code === 'Digit2' ||
          e.code === 'Digit3' ||
          e.code === 'Digit4') &&
        phase === 'playing'
      ) {
        const idx = Number(e.code.replace('Digit', '')) - 1;
        const next = CAMERA_MODES[idx]?.id;
        if (next) {
          setCameraMode(next);
          engineRef.current?.setCameraMode(next);
        }
      } else if (e.code === 'Escape' || e.code === 'KeyP') {
        if (levelRoadCrateSession) {
          setLevelRoadCrateSession(null);
        } else if (activeLevelUp && phase !== 'playing') {
          setActiveLevelUp(null);
        } else if (levelRoadOpen) {
          setLevelRoadOpen(false);
          setLevelRoadFocusLevel(null);
        } else if (careerMapOpen) {
          setCareerMapOpen(false);
        } else if (phase === 'garage') {
          engineRef.current?.returnToMenu();
        } else {
          engineRef.current?.togglePause();
        }
      } else if (e.code === 'Space') {
        if (
          activeAdSession ||
          leaderboardOpen ||
          dailyWheelOpen ||
          storeOpen ||
          careerMapOpen ||
          levelRoadOpen ||
          levelRoadCrateSession ||
          (activeLevelUp && phase !== 'playing')
        ) {
          return;
        }
        e.preventDefault();
        if (phase === 'gameover') {
          if (adRequestBusyRef.current) return;
          const outcome = lastCareerOutcomeRef.current;
          const proceed = () => {
            setRevivedThisRun(false);
            setRunGoldDoubled(false);
            setLastCareerOutcome(null);
            if (outcome) {
              const targetLevel =
                outcome.won && outcome.levelId < 100
                  ? outcome.levelId + 1
                  : outcome.levelId;
              engineRef.current?.startCareerLevel(targetLevel);
            } else {
              engineRef.current?.exitCareerMode();
              engineRef.current?.startGame();
            }
          };
          if (adManager.shouldShowInterstitial()) {
            setAdState(adManager.markInterstitialShown());
            const actionLabel = outcome ? 'Kariyer Bölümü' : 'Yeni Sürüş';
            if (isGoogleAdsConfigured()) {
              adRequestBusyRef.current = true;
              void triggerGoogleInterstitialAd(
                actionLabel,
                () => engineRef.current?.audio.setMuted(true, false),
                () => engineRef.current?.audio.setMuted(mutedRef.current, false),
              ).then((res) => {
                adRequestBusyRef.current = false;
                if (res.outcome === 'shown' || res.outcome === 'skipped') {
                  proceed();
                  return;
                }
                engineRef.current?.audio.setMuted(true, false);
                pendingInterstitialActionRef.current = proceed;
                setActiveAdSession({ type: 'interstitial', actionLabel });
              });
              return;
            }
            engineRef.current?.audio.setMuted(true, false);
            pendingInterstitialActionRef.current = proceed;
            setActiveAdSession({ type: 'interstitial', actionLabel });
            return;
          }
          proceed();
        } else if (phase === 'menu' || phase === 'garage') {
          setRevivedThisRun(false);
          setRunGoldDoubled(false);
          setLastCareerOutcome(null);
          engineRef.current?.exitCareerMode();
          engineRef.current?.startGame();
        } else if (phase === 'playing') {
          engineRef.current?.setNitroActive(true);
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        keysRef.current.left = false;
        syncKeys();
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        keysRef.current.right = false;
        syncKeys();
      } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        keysRef.current.up = false;
        syncKeys();
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        keysRef.current.down = false;
        syncKeys();
      } else if (
        e.code === 'Space' ||
        e.code === 'ShiftLeft' ||
        e.code === 'ShiftRight'
      ) {
        engineRef.current?.setNitroActive(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [
    phase,
    activeAdSession,
    leaderboardOpen,
    dailyWheelOpen,
    storeOpen,
    careerMapOpen,
    levelRoadOpen,
    levelRoadCrateSession,
    activeLevelUp,
  ]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (phase === 'garage') {
        activePointerIdRef.current = e.pointerId;
        lastPointerXRef.current = e.clientX;
        lastPointerYRef.current = e.clientY;
        engineRef.current?.setGarageDragging(true);
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }
      if (phase !== 'playing') return;
      engineRef.current?.audio.init();

      const targetEl = e.target as HTMLElement | null;
      const isButtonTap = Boolean(targetEl?.closest('button'));
      if (!isButtonTap) {
        const now = performance.now();
        const dt = now - lastTapRef.current.time;
        const dist = Math.hypot(
          e.clientX - lastTapRef.current.x,
          e.clientY - lastTapRef.current.y,
        );
        if (dt > 30 && dt < 360 && dist < 60 && !lastTapRef.current.moved) {
          const activated = engineRef.current?.toggleNitro();
          if (activated) {
            triggerNitroBurst(e.clientX, e.clientY);
          }
          lastTapRef.current = { time: 0, x: 0, y: 0, moved: false };
        } else {
          lastTapRef.current = {
            time: now,
            x: e.clientX,
            y: e.clientY,
            moved: false,
          };
        }
      }

      activePointerIdRef.current = e.pointerId;
      lastPointerXRef.current = e.clientX;
      startPointerYRef.current = e.clientY;
      if (!isButtonTap) {
        holdIndicatorRef.current?.setHold({
          anchorX: e.clientX,
          anchorY: e.clientY,
          currentX: e.clientX,
          currentY: e.clientY,
          throttle: 0,
        });
      }
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [phase, triggerNitroBurst],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (activePointerIdRef.current !== e.pointerId) return;

      if (phase === 'garage') {
        const dx = e.clientX - lastPointerXRef.current;
        const dy = e.clientY - lastPointerYRef.current;
        lastPointerXRef.current = e.clientX;
        lastPointerYRef.current = e.clientY;
        engineRef.current?.orbitGarageByDelta(dx, dy);
        return;
      }

      if (phase !== 'playing') return;

      if (
        !lastTapRef.current.moved &&
        Math.hypot(
          e.clientX - lastTapRef.current.x,
          e.clientY - lastTapRef.current.y,
        ) > 18
      ) {
        lastTapRef.current.moved = true;
      }

      const dx = e.clientX - lastPointerXRef.current;
      lastPointerXRef.current = e.clientX;
      if (Math.abs(dx) > 0.5) {
        if (showSteerHintRef.current) {
          showSteerHintRef.current = false;
          setShowSteerHint(false);
        }
        engineRef.current?.steerByScreenDelta(dx);
      }

      const dy = startPointerYRef.current - e.clientY;
      let throttle = 0;
      if (Math.abs(dy) > 22) {
        throttle = Math.max(-1, Math.min(1, (dy - Math.sign(dy) * 22) / 88));
      }
      engineRef.current?.setThrottleInput(throttle);
      holdIndicatorRef.current?.setHold({
        anchorX: e.clientX,
        anchorY: startPointerYRef.current,
        currentX: e.clientX,
        currentY: e.clientY,
        throttle,
      });
    },
    [phase],
  );

  const handlePointerEnd = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (activePointerIdRef.current !== e.pointerId) return;
      activePointerIdRef.current = null;
      holdIndicatorRef.current?.setHold(null);
      engineRef.current?.setGarageDragging(false);
      engineRef.current?.setThrottleInput(0);
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    },
    [],
  );

  const launchNewRun = useCallback(() => {
    setRevivedThisRun(false);
    setRunGoldDoubled(false);
    setLastCareerOutcome(null);
    setShowSteerHint(true);
    if (hintTimeoutRef.current) window.clearTimeout(hintTimeoutRef.current);
    hintTimeoutRef.current = window.setTimeout(() => {
      setShowSteerHint(false);
    }, 4200);
    engineRef.current?.exitCareerMode();
    engineRef.current?.startGame();
  }, []);

  const launchCareerLevel = useCallback((levelId: number) => {
    setCareerMapOpen(false);
    setRevivedThisRun(false);
    setRunGoldDoubled(false);
    setLastCareerOutcome(null);
    setShowSteerHint(true);
    if (hintTimeoutRef.current) window.clearTimeout(hintTimeoutRef.current);
    hintTimeoutRef.current = window.setTimeout(() => {
      setShowSteerHint(false);
    }, 4200);
    engineRef.current?.startCareerLevel(levelId);
  }, []);

  const launchGarage = useCallback(() => {
    setGarageMenuCollapsed(false);
    setLastCareerOutcome(null);
    engineRef.current?.exitCareerMode();
    engineRef.current?.enterGarage();
  }, []);

  const launchMenu = useCallback(() => {
    setLastCareerOutcome(null);
    engineRef.current?.exitCareerMode();
    engineRef.current?.returnToMenu();
  }, []);

  const runWithInterstitialGate = useCallback(
    (actionLabel: string, proceed: () => void) => {
      if (adRequestBusyRef.current) return;
      // Interstitials ONLY trigger during menu transitions after a run (never mid-game, never first 3 runs)
      if (phaseRef.current === 'gameover' && adManager.shouldShowInterstitial()) {
        setAdState(adManager.markInterstitialShown());

        if (isGoogleAdsConfigured()) {
          adRequestBusyRef.current = true;
          void triggerGoogleInterstitialAd(
            actionLabel,
            () => engineRef.current?.audio.setMuted(true, false),
            () => engineRef.current?.audio.setMuted(mutedRef.current, false),
          ).then((res) => {
            adRequestBusyRef.current = false;
            if (res.outcome === 'shown' || res.outcome === 'skipped') {
              proceed();
              return;
            }
            engineRef.current?.audio.setMuted(true, false);
            pendingInterstitialActionRef.current = proceed;
            setActiveAdSession({ type: 'interstitial', actionLabel });
          });
          return;
        }

        engineRef.current?.audio.setMuted(true, false);
        pendingInterstitialActionRef.current = proceed;
        setActiveAdSession({ type: 'interstitial', actionLabel });
        return;
      }
      proceed();
    },
    [],
  );

  const handleStart = useCallback(() => {
    runWithInterstitialGate('Yeni Sürüş', launchNewRun);
  }, [runWithInterstitialGate, launchNewRun]);

  const handleStartCareerLevel = useCallback(
    (levelId: number) => {
      runWithInterstitialGate(`Bölüm ${levelId}`, () =>
        launchCareerLevel(levelId),
      );
    },
    [runWithInterstitialGate, launchCareerLevel],
  );

  const handleOpenCareerMap = useCallback(() => {
    if (phaseRef.current === 'gameover' || phaseRef.current === 'paused') {
      setLastCareerOutcome(null);
      engineRef.current?.exitCareerMode();
      engineRef.current?.returnToMenu();
    }
    setCareerMapOpen(true);
  }, []);

  const handleCloseCareerMap = useCallback(() => {
    setCareerMapOpen(false);
  }, []);

  const handleClaimCareerStarChest = useCallback((starsRequired: number) => {
    const res = engineRef.current?.claimCareerStarChest(starsRequired);
    if (res?.ok) {
      triggerNativeHaptic('reward');
    }
  }, []);

  const handleOpenGarage = useCallback(() => {
    runWithInterstitialGate('3D Garaj', launchGarage);
  }, [runWithInterstitialGate, launchGarage]);

  const handleToggleGarageMenu = useCallback(() => {
    setGarageMenuCollapsed((prev) => {
      const next = !prev;
      engineRef.current?.setGarageMenuCollapsed(next);
      return next;
    });
  }, []);

  const handleGarageCameraFocus = useCallback((focus: GarageCameraFocus) => {
    engineRef.current?.setGarageCameraFocus(focus);
  }, []);

  const handleTogglePause = useCallback(() => {
    engineRef.current?.togglePause();
  }, []);

  const handleReturnMenu = useCallback(() => {
    runWithInterstitialGate('Ana Menü', launchMenu);
  }, [runWithInterstitialGate, launchMenu]);

  const grantRewardForPlacement = useCallback(
    (placement: RewardedAdPlacement) => {
      triggerNativeHaptic('reward');
      switch (placement.kind) {
        case 'double_run_gold':
          if (!runGoldDoubled) {
            engineRef.current?.doubleLastRunGold();
            setRunGoldDoubled(true);
          }
          break;
        case 'crash_revive':
          setRevivedThisRun(true);
          setShowGameOverModal(false);
          engineRef.current?.reviveFromCrash();
          break;
        case 'daily_wheel_extra':
          setAdState(adManager.consumeExtraWheelSpin());
          pendingExtraSpinCbRef.current?.();
          pendingExtraSpinCbRef.current = null;
          break;
        case 'upgrade_topup':
          engineRef.current?.grantRewardGold(placement.amount, 'Reklam Desteği');
          break;
        case 'daily_streak_double': {
          const claimed = adManager.claimDailyStreak(2);
          setAdState(claimed.snapshot);
          if (claimed.amount > 0) {
            engineRef.current?.grantRewardGold(
              claimed.amount,
              `${claimed.day}. Gün Serisi ×2`,
            );
          }
          break;
        }
        case 'rent_car':
          setRevivedThisRun(false);
          setRunGoldDoubled(false);
          setShowGameOverModal(false);
          setCarModel(placement.carId);
          engineRef.current?.rentCarForOneRun(placement.carId);
          break;
      }
    },
    [runGoldDoubled],
  );

  const openRewardedAd = useCallback(
    (placement: RewardedAdPlacement) => {
      if (adRequestBusyRef.current) return;

      if (isGoogleAdsConfigured()) {
        adRequestBusyRef.current = true;
        void triggerGoogleRewardedAd(
          placement,
          () => engineRef.current?.audio.setMuted(true, false),
          () => engineRef.current?.audio.setMuted(mutedRef.current, false),
        ).then((res) => {
          adRequestBusyRef.current = false;
          if (res.outcome === 'viewed') {
            grantRewardForPlacement(placement);
          } else if (res.outcome === 'dismissed') {
            pendingExtraSpinCbRef.current = null;
          } else {
            engineRef.current?.audio.setMuted(true, false);
            setActiveAdSession({ type: 'rewarded', placement });
          }
        });
        return;
      }

      engineRef.current?.audio.setMuted(true, false);
      setActiveAdSession({ type: 'rewarded', placement });
    },
    [grantRewardForPlacement],
  );

  const handleCompleteRewardedAd = useCallback(
    (placement: RewardedAdPlacement) => {
      engineRef.current?.audio.setMuted(mutedRef.current, false);
      setActiveAdSession(null);
      grantRewardForPlacement(placement);
    },
    [grantRewardForPlacement],
  );

  const handleCancelRewardedAd = useCallback(() => {
    engineRef.current?.audio.setMuted(mutedRef.current, false);
    pendingExtraSpinCbRef.current = null;
    setActiveAdSession(null);
  }, []);

  const handleCloseInterstitial = useCallback(() => {
    engineRef.current?.audio.setMuted(mutedRef.current, false);
    setActiveAdSession(null);
    const next = pendingInterstitialActionRef.current;
    pendingInterstitialActionRef.current = null;
    next?.();
  }, []);

  const handleSpinFreeWheel = useCallback(() => {
    const idx = adManager.pickRandomWheelSlice();
    setAdState(adManager.consumeFreeWheelSpin());
    return idx;
  }, []);

  const handleWatchAdForExtraSpin = useCallback(
    (onGranted: () => void) => {
      pendingExtraSpinCbRef.current = onGranted;
      openRewardedAd({ kind: 'daily_wheel_extra' });
    },
    [openRewardedAd],
  );

  const handleClaimWheelSlice = useCallback((slice: WheelSlice) => {
    triggerNativeHaptic('reward');
    if (slice.kind === 'gold') {
      engineRef.current?.grantRewardGold(slice.amount, 'Günlük Çark');
    } else {
      engineRef.current?.grantRewardXp(slice.amount);
    }
  }, []);

  const handleClaimStreakFree = useCallback(() => {
    triggerNativeHaptic('reward');
    const claimed = adManager.claimDailyStreak(1);
    setAdState(claimed.snapshot);
    if (claimed.amount > 0) {
      engineRef.current?.grantRewardGold(
        claimed.amount,
        `${claimed.day}. Gün Serisi`,
      );
    }
  }, []);

  const handleConfirmPurchaseAdFree = useCallback(() => {
    setAdState(adManager.purchaseAdFree());
    // If purchased directly from an active interstitial, immediately proceed
    if (activeAdSession?.type === 'interstitial') {
      handleCloseInterstitial();
    }
  }, [activeAdSession, handleCloseInterstitial]);

  const handleFulfillStorePurchase = useCallback(
    async (
      item: StoreCheckoutItem,
      paymentMethod: PaymentMethodId,
    ): Promise<{
      success: boolean;
      error?: string;
      outcome?: StoreFulfillmentOutcome;
    }> => {
      const engine = engineRef.current;
      if (!engine) {
        return { success: false, error: 'Oyun motoru hazır değil.' };
      }

      const checkout = await billingService.executeCheckout(item, paymentMethod);
      if (!checkout.success || !checkout.orderId) {
        return {
          success: false,
          error: checkout.error || 'Ödeme onaylanamadı.',
        };
      }

      const orderId = checkout.orderId;
      triggerNativeHaptic('reward');

      let creditedGoldTotal = 0;
      let openedCrates = 0;
      let adFreeActivated = false;
      const unlockedCarNames: string[] = [];
      const lootItems: RolledLootItem[] = [];
      let crateImageUrl: string | undefined;
      let crateTitle: string | undefined;
      let crateTierId: CrateTierId | undefined;

      const applyLootList = (rolled: RolledLootItem[]) => {
        for (const entry of rolled) {
          if (entry.kind === 'gold' && entry.amount) {
            engine.grantRewardGold(entry.amount, 'Sandık Altını');
            creditedGoldTotal += entry.amount;
            lootItems.push(entry);
          } else if (entry.kind === 'xp' && entry.amount) {
            engine.grantRewardXp(entry.amount);
            lootItems.push(entry);
          } else if (entry.kind === 'car' && entry.carId) {
            const res = engine.grantCarUnlocked(entry.carId, false);
            if (res.newlyUnlocked) {
              unlockedCarNames.push(entry.title);
              lootItems.push({ ...entry, duplicateConvertedGold: undefined });
            } else {
              creditedGoldTotal += res.duplicateGold;
              lootItems.push({
                ...entry,
                duplicateConvertedGold: res.duplicateGold,
              });
            }
          } else if (entry.kind === 'wheel' && entry.wheelStyleId) {
            const res = engine.grantWheelStyleUnlocked(entry.wheelStyleId);
            creditedGoldTotal += res.duplicateGold;
            lootItems.push({
              ...entry,
              duplicateConvertedGold: res.newlyUnlocked
                ? undefined
                : res.duplicateGold,
            });
          } else if (entry.kind === 'bodyKit' && entry.bodyKitId) {
            const res = engine.grantBodyKitUnlocked(entry.bodyKitId);
            creditedGoldTotal += res.duplicateGold;
            lootItems.push({
              ...entry,
              duplicateConvertedGold: res.newlyUnlocked
                ? undefined
                : res.duplicateGold,
            });
          } else if (entry.kind === 'spoiler' && entry.spoilerId) {
            const res = engine.grantSpoilerUnlocked(entry.spoilerId);
            creditedGoldTotal += res.duplicateGold;
            lootItems.push({
              ...entry,
              duplicateConvertedGold: res.newlyUnlocked
                ? undefined
                : res.duplicateGold,
            });
          } else if (entry.kind === 'livery' && entry.liveryId) {
            const res = engine.grantLiveryUnlocked(entry.liveryId);
            creditedGoldTotal += res.duplicateGold;
            lootItems.push({
              ...entry,
              duplicateConvertedGold: res.newlyUnlocked
                ? undefined
                : res.duplicateGold,
            });
          }
        }
      };

      const progNow = engine.getProgressionState();

      if (item.category === 'gold') {
        const amt = Math.max(0, Math.floor(item.goldAmount || 0));
        if (amt > 0) {
          engine.grantRewardGold(amt, 'Market Altın Kasası');
          creditedGoldTotal += amt;
        }
      } else if (item.category === 'crate' && item.crateTierId) {
        const count = Math.max(1, Math.min(5, item.crateCount || 1));
        const crateSpec = getCrateByTier(item.crateTierId);
        crateImageUrl = crateSpec.imageUrl;
        crateTitle = crateSpec.title;
        crateTierId = item.crateTierId;
        openedCrates = count;
        const rolled = rollCrateRewards(item.crateTierId, count, {
          unlockedCars: progNow.unlockedCars,
          unlockedWheelStyles: progNow.unlockedWheelStyles,
          unlockedBodyKits: progNow.unlockedBodyKits,
          unlockedSpoilers: progNow.unlockedSpoilers,
          unlockedLiveries: progNow.unlockedLiveries,
        });
        applyLootList(rolled);
      } else if (item.category === 'bundle') {
        const bundle = getBundleBySku(item.sku);
        if (bundle) {
          crateImageUrl = bundle.imageUrl;
          crateTitle = bundle.title;
          crateTierId = bundle.bonusCrates?.tierId ?? 'legendary';

          if (bundle.goldAmount > 0) {
            engine.grantRewardGold(bundle.goldAmount, bundle.title);
            creditedGoldTotal += bundle.goldAmount;
            lootItems.push({
              id: `bundle_gold_${orderId}`,
              kind: 'gold',
              title: `+${bundle.goldAmount.toLocaleString('tr-TR')} Altın`,
              subtitle: `${bundle.title} Altın İçeriği`,
              rarity: 'epic',
              amount: bundle.goldAmount,
            });
          }

          if (bundle.includesAdFree) {
            handleConfirmPurchaseAdFree();
            adFreeActivated = true;
          }

          for (const carId of bundle.cars) {
            const spec = CAR_MODELS.find((m) => m.id === carId);
            const res = engine.grantCarUnlocked(carId, false);
            if (res.newlyUnlocked && spec) {
              unlockedCarNames.push(spec.name);
            } else {
              creditedGoldTotal += res.duplicateGold;
            }
            if (spec) {
              lootItems.push({
                id: `bundle_car_${carId}_${orderId}`,
                kind: 'car',
                title: spec.name,
                subtitle: res.newlyUnlocked
                  ? 'Garaja kalıcı olarak eklendi'
                  : 'Garajda mevcut · Altın telafisi',
                rarity: spec.rarity,
                carId,
                duplicateConvertedGold: res.newlyUnlocked
                  ? undefined
                  : res.duplicateGold,
              });
            }
          }

          for (const w of bundle.wheelStyles ?? []) {
            const wheelSpec = WHEEL_STYLES.find((x) => x.id === w);
            const res = engine.grantWheelStyleUnlocked(w);
            creditedGoldTotal += res.duplicateGold;
            lootItems.push({
              id: `bundle_wheel_${w}_${orderId}`,
              kind: 'wheel',
              title: wheelSpec?.name ?? 'Özel Yarış Tekerleği',
              subtitle: res.newlyUnlocked
                ? 'Garajda kullanıma hazır'
                : 'Zaten mevcut · Altın telafisi',
              rarity: wheelSpec?.rarity ?? 'rare',
              wheelStyleId: w,
              duplicateConvertedGold: res.newlyUnlocked
                ? undefined
                : res.duplicateGold,
            });
          }

          for (const k of bundle.bodyKits ?? []) {
            const kitSpec = BODY_KITS.find((x) => x.id === k);
            const res = engine.grantBodyKitUnlocked(k);
            creditedGoldTotal += res.duplicateGold;
            lootItems.push({
              id: `bundle_kit_${k}_${orderId}`,
              kind: 'bodyKit',
              title: kitSpec?.name ?? 'Aero Gövde Kiti',
              subtitle: res.newlyUnlocked
                ? 'Garajda kullanıma hazır'
                : 'Zaten mevcut · Altın telafisi',
              rarity: kitSpec?.rarity ?? 'epic',
              bodyKitId: k,
              duplicateConvertedGold: res.newlyUnlocked
                ? undefined
                : res.duplicateGold,
            });
          }

          for (const s of bundle.spoilers ?? []) {
            const spoilerSpec = SPOILERS.find((x) => x.id === s);
            const res = engine.grantSpoilerUnlocked(s);
            creditedGoldTotal += res.duplicateGold;
            lootItems.push({
              id: `bundle_spoiler_${s}_${orderId}`,
              kind: 'spoiler',
              title: spoilerSpec?.name ?? 'Yarış Rüzgarlığı',
              subtitle: res.newlyUnlocked
                ? 'Garajda kullanıma hazır'
                : 'Zaten mevcut · Altın telafisi',
              rarity: spoilerSpec?.rarity ?? 'epic',
              spoilerId: s,
              duplicateConvertedGold: res.newlyUnlocked
                ? undefined
                : res.duplicateGold,
            });
          }

          for (const l of bundle.liveries ?? []) {
            const liverySpec = LIVERIES.find((x) => x.id === l);
            const res = engine.grantLiveryUnlocked(l);
            creditedGoldTotal += res.duplicateGold;
            lootItems.push({
              id: `bundle_livery_${l}_${orderId}`,
              kind: 'livery',
              title: liverySpec?.name ?? 'Özel Araç Kaplaması',
              subtitle: res.newlyUnlocked
                ? 'Garajda kullanıma hazır'
                : 'Zaten mevcut · Altın telafisi',
              rarity: liverySpec?.rarity ?? 'rare',
              liveryId: l,
              duplicateConvertedGold: res.newlyUnlocked
                ? undefined
                : res.duplicateGold,
            });
          }

          if (bundle.bonusCrates) {
            const freshProg = engine.getProgressionState();
            openedCrates += bundle.bonusCrates.count;
            const rolled = rollCrateRewards(
              bundle.bonusCrates.tierId,
              bundle.bonusCrates.count,
              {
                unlockedCars: freshProg.unlockedCars,
                unlockedWheelStyles: freshProg.unlockedWheelStyles,
                unlockedBodyKits: freshProg.unlockedBodyKits,
                unlockedSpoilers: freshProg.unlockedSpoilers,
                unlockedLiveries: freshProg.unlockedLiveries,
              },
            );
            applyLootList(rolled);
          }
        }
      }

      const summaryParts: string[] = [];
      if (creditedGoldTotal > 0) {
        summaryParts.push(`+${creditedGoldTotal.toLocaleString('tr-TR')} Altın`);
      }
      if (unlockedCarNames.length > 0) {
        summaryParts.push(unlockedCarNames.join(', '));
      }
      if (openedCrates > 0) {
        summaryParts.push(`${openedCrates}× Sandık`);
      }
      if (adFreeActivated) {
        summaryParts.push('Reklamsız VIP');
      }
      const rewardSummary =
        summaryParts.join(' · ') || 'Ödüller hesabına eklendi';

      const recorded = await billingService.recordFulfilledPurchase({
        orderId,
        item,
        paymentMethod,
        platform: checkout.platform,
        rewardSummary,
        creditedGold: creditedGoldTotal,
        openedCrates,
        unlockedAdFree: adFreeActivated,
      });
      setStoreEntitlements(recorded.snapshot);

      return {
        success: true,
        outcome: {
          orderId: recorded.receipt.orderId,
          title: item.title,
          rewardSummary,
          crateTierId,
          crateImageUrl,
          crateTitle,
          lootItems: lootItems.length > 0 ? lootItems : undefined,
          creditedGoldTotal,
          unlockedCarNames,
          adFreeActivated,
        },
      };
    },
    [handleConfirmPurchaseAdFree],
  );

  const handleRedeemPromoCode = useCallback(
    async (
      rawCode: string,
    ): Promise<{
      success: boolean;
      error?: string;
      requiresAuth?: boolean;
      outcome?: StoreFulfillmentOutcome;
    }> => {
      const engine = engineRef.current;
      if (!engine) {
        return { success: false, error: 'Oyun motoru hazır değil.' };
      }

      const result = await redeemGlobalPromoCode(rawCode, adManager.isAdFree());
      if (!result.ok || !result.spec) {
        return {
          success: false,
          requiresAuth: result.requiresAuth,
          error: result.error || 'Geçersiz promosyon kodu.',
        };
      }

      const { spec } = result;
      triggerNativeHaptic('reward');

      if (spec.goldAmount > 0) {
        engine.grantRewardGold(spec.goldAmount, spec.title);
      }

      let adFreeActivated = false;
      if (spec.unlocksAdFree) {
        handleConfirmPurchaseAdFree();
        const nextEnt = await billingService.grantPromoAdFree();
        setStoreEntitlements(nextEnt);
        adFreeActivated = true;
      }

      const summaryParts: string[] = [];
      if (spec.goldAmount > 0) {
        summaryParts.push(`+${spec.goldAmount.toLocaleString('tr-TR')} Altın`);
      }
      if (adFreeActivated) {
        summaryParts.push('Reklamsız VIP');
      }
      const rewardSummary = summaryParts.join(' · ') || spec.description;

      return {
        success: true,
        outcome: {
          orderId: `KOD-${spec.displayCode}`,
          title: spec.title,
          rewardSummary,
          creditedGoldTotal: spec.goldAmount,
          unlockedCarNames: [],
          adFreeActivated,
        },
      };
    },
    [handleConfirmPurchaseAdFree],
  );

  const handleRestorePurchases = useCallback(async () => {
    const res = await billingService.restorePurchasesFromCloud();
    setStoreEntitlements(res.snapshot);
    if (res.restoredAdFree && !adManager.isAdFree()) {
      setAdState(adManager.purchaseAdFree());
    }
    return {
      restoredCount: res.restoredCount,
      restoredAdFree: res.restoredAdFree,
      fromCloud: res.fromCloud,
    };
  }, []);

  const handleToggleMute = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.audio.init();
    const next = !engine.audio.isMuted();
    engine.audio.setMuted(next);
    setMuted(next);
    setAudioSettings(engine.audio.getAudioSettings());
    syncGoogleAdsSound(!next);
  }, []);

  const handleChangeSfxVolume = useCallback((volume: number) => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.audio.init();
    engine.audio.setSfxVolume(volume);
    setAudioSettings(engine.audio.getAudioSettings());
  }, []);

  const handlePreviewSfxVolume = useCallback(() => {
    engineRef.current?.audio.playVolumePreview();
  }, []);

  const handleChangeMusicVolume = useCallback((volume: number) => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.audio.init();
    engine.audio.setMusicVolume(volume);
    setAudioSettings(engine.audio.getAudioSettings());
  }, []);

  const handleToggleHaptics = useCallback((enabled: boolean) => {
    setHapticsEnabled(enabled);
    setHapticsEnabledState(enabled);
    if (enabled) {
      triggerNativeHaptic('light');
    }
  }, []);

  const handleOpenSettings = useCallback(() => setSettingsOpen(true), []);
  const handleCloseSettings = useCallback(() => setSettingsOpen(false), []);

  const handleSelectModel = useCallback((id: CarModelId) => {
    setCarModel(id);
    engineRef.current?.setCarModel(id);
  }, []);

  const handleUnlockCar = useCallback((id: CarModelId) => {
    const unlocked = engineRef.current?.unlockCar(id);
    if (unlocked) {
      setCarModel(id);
    }
  }, []);

  const handleUpgradePart = useCallback(
    (carId: CarModelId, part: CarUpgradeKey) => {
      engineRef.current?.upgradeCarPart(carId, part);
    },
    [],
  );

  const handleUpgradePowerUp = useCallback(
    (id: PowerUpId, track: PowerUpUpgradeTrack) => {
      engineRef.current?.upgradePowerUp(id, track);
    },
    [],
  );

  const handleClaimMission = useCallback((missionId: string) => {
    engineRef.current?.claimMissionReward(missionId);
  }, []);

  const handleClaimAchievement = useCallback((achievementId: string) => {
    engineRef.current?.claimAchievementReward(achievementId);
  }, []);

  const handleClaimAllRewards = useCallback(
    (scope: 'missions' | 'achievements' | 'all') => {
      engineRef.current?.claimAllMissionRewards(scope);
    },
    [],
  );

  const handleRefreshMissions = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    setMissions(engine.getMissionsSnapshot());
  }, []);

  const handleSelectColor = useCallback((id: CarColorId) => {
    setCarColor(id);
    engineRef.current?.setCarColor(id);
  }, []);

  const handleEquipWheelStyle = useCallback(
    (carId: CarModelId, styleId: WheelStyleId) => {
      engineRef.current?.setCarWheelStyle(carId, styleId);
    },
    [],
  );

  const handleUnlockWheelStyle = useCallback(
    (styleId: WheelStyleId, equipToCarId: CarModelId) => {
      engineRef.current?.unlockWheelStyle(styleId, equipToCarId);
    },
    [],
  );

  const handleSelectWheelColor = useCallback(
    (carId: CarModelId, colorId: WheelColorId) => {
      engineRef.current?.setCarWheelColor(carId, colorId);
    },
    [],
  );

  const handlePreviewWheel = useCallback(
    (styleId: WheelStyleId, colorId: WheelColorId) => {
      engineRef.current?.previewWheelConfig(styleId, colorId);
    },
    [],
  );

  const handleEquipBodyKit = useCallback(
    (carId: CarModelId, kitId: BodyKitId) => {
      engineRef.current?.setCarBodyKit(carId, kitId);
    },
    [],
  );

  const handleUnlockBodyKit = useCallback(
    (kitId: BodyKitId, equipToCarId: CarModelId) => {
      engineRef.current?.unlockBodyKit(kitId, equipToCarId);
    },
    [],
  );

  const handleEquipSpoiler = useCallback(
    (carId: CarModelId, spoilerId: SpoilerId) => {
      engineRef.current?.setCarSpoiler(carId, spoilerId);
    },
    [],
  );

  const handleUnlockSpoiler = useCallback(
    (spoilerId: SpoilerId, equipToCarId: CarModelId) => {
      engineRef.current?.unlockSpoiler(spoilerId, equipToCarId);
    },
    [],
  );

  const handleEquipLivery = useCallback(
    (carId: CarModelId, liveryId: LiveryId) => {
      engineRef.current?.setCarLivery(carId, liveryId);
    },
    [],
  );

  const handleUnlockLivery = useCallback(
    (liveryId: LiveryId, equipToCarId: CarModelId) => {
      engineRef.current?.unlockLivery(liveryId, equipToCarId);
    },
    [],
  );

  const handlePreviewCustom = useCallback((config: CarCustomConfig) => {
    engineRef.current?.previewCustomConfig(config);
  }, []);

  const handleEquipVisualItem = useCallback(
    (carId: CarModelId, category: VisualCategory, itemId: string) => {
      engineRef.current?.equipVisualItem(carId, category, itemId);
    },
    [],
  );

  const handleUnlockVisualItem = useCallback(
    (category: VisualCategory, itemId: string, equipToCarId: CarModelId) => {
      engineRef.current?.unlockVisualItem(category, itemId, equipToCarId);
    },
    [],
  );

  const handleGarageEffectPreview = useCallback(
    (mode: 'none' | 'nitro' | 'smoke') => {
      engineRef.current?.setGarageEffectPreview(mode);
    },
    [],
  );

  const handleChangeLicensePlate = useCallback((text: string) => {
    const trimmed = text.slice(0, 10);
    setLicensePlate(trimmed);
    engineRef.current?.setLicensePlate(trimmed);
  }, []);

  const handleSelectCamera = useCallback((mode: CameraMode) => {
    setCameraMode(mode);
    engineRef.current?.setCameraMode(mode);
  }, []);

  const handleToggleCamera = useCallback(() => {
    setCameraMode((prev) => {
      const idx = CAMERA_MODES.findIndex((m) => m.id === prev);
      const next = CAMERA_MODES[(idx + 1) % CAMERA_MODES.length].id;
      engineRef.current?.setCameraMode(next);
      return next;
    });
  }, []);

  const handleNitroToggle = useCallback(
    (x?: number, y?: number) => {
      engineRef.current?.audio.init();
      const activated = engineRef.current?.toggleNitro();
      if (activated) {
        triggerNitroBurst(
          x ?? window.innerWidth * 0.25,
          y ?? window.innerHeight * 0.78,
        );
      }
    },
    [triggerNitroBurst],
  );

  const handleToggleMusic = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    setMusicState(engine.audio.toggleMusic());
  }, []);

  const handleOpenLeaderboard = useCallback(() => setLeaderboardOpen(true), []);
  const handleCloseLeaderboard = useCallback(() => setLeaderboardOpen(false), []);
  const handleOpenDailyWheel = useCallback(() => setDailyWheelOpen(true), []);
  const handleCloseDailyWheel = useCallback(() => setDailyWheelOpen(false), []);
  const handleOpenStore = useCallback((tab: StoreTabId = 'bundles') => {
    setStoreInitialTab(tab);
    setStoreOpen(true);
  }, []);
  const handleCloseStore = useCallback(() => setStoreOpen(false), []);
  const handleOpenStoreFromInterstitial = useCallback(() => {
    setStoreInitialTab('bundles');
    setStoreOpen(true);
  }, []);

  const handleOpenLevelRoad = useCallback((focusLevel?: number) => {
    setLevelRoadFocusLevel(focusLevel ?? null);
    setLevelRoadOpen(true);
  }, []);

  const handleCloseLevelRoad = useCallback(() => {
    setLevelRoadOpen(false);
    setLevelRoadFocusLevel(null);
  }, []);

  const handleDismissLevelUp = useCallback(() => {
    setActiveLevelUp(null);
  }, []);

  const handleOpenLevelRoadFromCelebration = useCallback((focusLevel: number) => {
    setActiveLevelUp(null);
    setLevelRoadFocusLevel(focusLevel);
    setLevelRoadOpen(true);
  }, []);

  const openLevelRoadCrates = useCallback(
    (crateTiers: CrateTierId[], sourceSubtitle: string) => {
      const engine = engineRef.current;
      if (!engine || crateTiers.length === 0) return;

      const tierRank: Record<CrateTierId, number> = {
        street: 0,
        pro: 1,
        legendary: 2,
      };
      let topTier: CrateTierId = crateTiers[0];
      const lootItems: RolledLootItem[] = [];
      const unlockedCarNames: string[] = [];
      let totalGold = 0;

      for (const tier of crateTiers) {
        if (tierRank[tier] > tierRank[topTier]) {
          topTier = tier;
        }
        const progNow = engine.getProgressionState();
        const rolled = rollCrateRewards(tier, 1, {
          unlockedCars: progNow.unlockedCars,
          unlockedWheelStyles: progNow.unlockedWheelStyles,
          unlockedBodyKits: progNow.unlockedBodyKits,
          unlockedSpoilers: progNow.unlockedSpoilers,
          unlockedLiveries: progNow.unlockedLiveries,
        });
        for (const entry of rolled) {
          if (entry.kind === 'gold' && entry.amount) {
            engine.grantRewardGold(entry.amount, 'Seviye Sandığı Altını');
            totalGold += entry.amount;
            lootItems.push(entry);
          } else if (entry.kind === 'xp' && entry.amount) {
            engine.grantRewardXp(entry.amount);
            lootItems.push(entry);
          } else if (entry.kind === 'car' && entry.carId) {
            const res = engine.grantCarUnlocked(entry.carId, false);
            if (res.newlyUnlocked) {
              unlockedCarNames.push(entry.title);
              lootItems.push({ ...entry, duplicateConvertedGold: undefined });
            } else {
              totalGold += res.duplicateGold;
              lootItems.push({
                ...entry,
                duplicateConvertedGold: res.duplicateGold,
              });
            }
          } else if (entry.kind === 'wheel' && entry.wheelStyleId) {
            const res = engine.grantWheelStyleUnlocked(entry.wheelStyleId);
            totalGold += res.duplicateGold;
            lootItems.push({
              ...entry,
              duplicateConvertedGold: res.newlyUnlocked
                ? undefined
                : res.duplicateGold,
            });
          } else if (entry.kind === 'bodyKit' && entry.bodyKitId) {
            const res = engine.grantBodyKitUnlocked(entry.bodyKitId);
            totalGold += res.duplicateGold;
            lootItems.push({
              ...entry,
              duplicateConvertedGold: res.newlyUnlocked
                ? undefined
                : res.duplicateGold,
            });
          } else if (entry.kind === 'spoiler' && entry.spoilerId) {
            const res = engine.grantSpoilerUnlocked(entry.spoilerId);
            totalGold += res.duplicateGold;
            lootItems.push({
              ...entry,
              duplicateConvertedGold: res.newlyUnlocked
                ? undefined
                : res.duplicateGold,
            });
          } else if (entry.kind === 'livery' && entry.liveryId) {
            const res = engine.grantLiveryUnlocked(entry.liveryId);
            totalGold += res.duplicateGold;
            lootItems.push({
              ...entry,
              duplicateConvertedGold: res.newlyUnlocked
                ? undefined
                : res.duplicateGold,
            });
          }
        }
      }

      const topCrateSpec = getCrateByTier(topTier);
      const summaryParts: string[] = [];
      if (unlockedCarNames.length > 0) {
        summaryParts.push(`${unlockedCarNames.length} Yeni Araç`);
      }
      if (totalGold > 0) {
        summaryParts.push(`+${totalGold.toLocaleString('tr-TR')} Altın`);
      }
      setLevelRoadCrateSession({
        title:
          crateTiers.length > 1
            ? `${crateTiers.length} Seviye Sandığı Açıldı`
            : topCrateSpec.title,
        subtitle: sourceSubtitle,
        rewardSummary:
          summaryParts.length > 0
            ? summaryParts.join(' · ')
            : 'Seviye Yolu Sandık Ödülleri',
        crateTierId: topTier,
        crateImageUrl: topCrateSpec.imageUrl,
        crateTitle: topCrateSpec.title,
        lootItems,
        unlockedCarNames,
      });
    },
    [],
  );

  const handleClaimLevelRoad = useCallback(
    (level: number) => {
      const res = engineRef.current?.claimLevelRoadReward(level);
      if (!res?.ok) return;
      triggerNativeHaptic('reward');
      if (res.crateTierId) {
        openLevelRoadCrates([res.crateTierId], `Seviye ${level} Sandık Ödülü`);
      }
    },
    [openLevelRoadCrates],
  );

  const handleClaimAllLevelRoad = useCallback(() => {
    const res = engineRef.current?.claimAllLevelRoadRewards();
    if (!res || res.claimedCount === 0) return;
    triggerNativeHaptic('reward');
    if (res.pendingCrates.length > 0) {
      openLevelRoadCrates(
        res.pendingCrates,
        `Seviye Yolu · ${res.pendingCrates.length} Sandık`,
      );
    }
  }, [openLevelRoadCrates]);

  const handleWatchAdRevive = useCallback(() => {
    openRewardedAd({ kind: 'crash_revive' });
  }, [openRewardedAd]);

  const handleWatchAdDoubleGold = useCallback(() => {
    openRewardedAd({
      kind: 'double_run_gold',
      amount: statsRef.current.runGold,
    });
  }, [openRewardedAd]);

  const handleWatchAdTopUpGold = useCallback(
    (amount: number, targetLabel: string) => {
      openRewardedAd({ kind: 'upgrade_topup', amount, targetLabel });
    },
    [openRewardedAd],
  );

  const handleRentCar = useCallback(
    (carId: CarModelId, carName: string) => {
      openRewardedAd({ kind: 'rent_car', carId, carName });
    },
    [openRewardedAd],
  );

  const handleWatchAdDoubleStreak = useCallback(
    (day: number, amount: number) => {
      openRewardedAd({ kind: 'daily_streak_double', day, amount });
    },
    [openRewardedAd],
  );

  const streakStatus = useMemo(
    () => adManager.getStreakStatus(),
    // Re-evaluate only when ad state changes or user opens/closes wheel or switches phases
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [adState, phase, dailyWheelOpen],
  );
  const freeWheelAvailableToday = useMemo(
    () => adManager.isFreeWheelAvailableToday(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [adState, phase, dailyWheelOpen],
  );
  const extraWheelAdAvailableToday = useMemo(
    () => adManager.isExtraWheelAdAvailableToday(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [adState, phase, dailyWheelOpen],
  );
  const dailyRewardAvailable =
    freeWheelAvailableToday || streakStatus.availableToday;

  const handleSelectGameMode = useCallback((mode: GameModeId) => {
    setGameMode(mode);
    engineRef.current?.setGameMode(mode);
  }, []);

  return (
    <main
      className="relative h-screen w-screen overflow-hidden bg-zinc-950 touch-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
    >
      <div
        ref={canvasMountRef}
        className="absolute inset-0 h-full w-full"
        aria-label="3D Araba Sürüş Sahnesi"
      />

      {engineError && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/96 p-5 text-center"
        >
          <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-zinc-900 p-5 shadow-2xl">
            <h2 className="font-display text-lg font-extrabold text-amber-400">
              3D Sahne Başlatılamadı
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-zinc-300">
              {engineError}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 min-h-11 w-full cursor-pointer rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-bold text-zinc-950 active:scale-95"
            >
              Yeniden Dene
            </button>
          </div>
        </div>
      )}

      <SpeedLinesOverlay
        active={phase === 'playing'}
        speedKmh={stats.speedKmh}
        nitroActive={stats.nitroActive}
      />

      <HoldThrottleIndicator
        ref={holdIndicatorRef}
        active={phase === 'playing'}
        nitroActive={phase === 'playing' && stats.nitroActive}
        nitroPercent={stats.nitroPercent}
        nitroBurst={phase === 'playing' ? nitroBurst : null}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[8] transition-opacity duration-300"
        style={{
          opacity: impactFlash > 0 ? Math.min(1, impactFlash * 0.9) : 0,
          background:
            'radial-gradient(circle at 50% 48%, rgba(225, 29, 72, 0) 44%, rgba(225, 29, 72, 0.52) 100%)',
        }}
      />

      <GameHud
        phase={phase}
        gameMode={gameMode}
        showGameOverModal={showGameOverModal}
        stats={stats}
        goldCoins={goldCoins}
        unlockedCars={unlockedCars}
        carUpgrades={carUpgrades}
        powerUpUpgrades={powerUpUpgrades}
        unlockedWheelStyles={unlockedWheelStyles}
        carWheels={carWheels}
        unlockedBodyKits={unlockedBodyKits}
        unlockedSpoilers={unlockedSpoilers}
        unlockedLiveries={unlockedLiveries}
        carCustom={carCustom}
        visualUnlocks={visualUnlocks}
        playerLevel={playerLevel}
        missions={missions}
        muted={muted}
        musicState={musicState}
        carModel={carModel}
        carColor={carColor}
        licensePlate={licensePlate}
        cameraMode={cameraMode}
        garageMenuCollapsed={garageMenuCollapsed}
        showSteerHint={showSteerHint}
        callout={callout}
        onSelectGameMode={handleSelectGameMode}
        onStart={handleStart}
        onOpenGarage={handleOpenGarage}
        onToggleGarageMenu={handleToggleGarageMenu}
        onTogglePause={handleTogglePause}
        onReturnMenu={handleReturnMenu}
        onToggleMute={handleToggleMute}
        onToggleMusic={handleToggleMusic}
        onSelectModel={handleSelectModel}
        onUnlockCar={handleUnlockCar}
        onUpgradePart={handleUpgradePart}
        onUpgradePowerUp={handleUpgradePowerUp}
        onClaimMission={handleClaimMission}
        onClaimAchievement={handleClaimAchievement}
        onClaimAllRewards={handleClaimAllRewards}
        onRefreshMissions={handleRefreshMissions}
        onEquipWheelStyle={handleEquipWheelStyle}
        onUnlockWheelStyle={handleUnlockWheelStyle}
        onSelectWheelColor={handleSelectWheelColor}
        onPreviewWheel={handlePreviewWheel}
        onEquipBodyKit={handleEquipBodyKit}
        onUnlockBodyKit={handleUnlockBodyKit}
        onEquipSpoiler={handleEquipSpoiler}
        onUnlockSpoiler={handleUnlockSpoiler}
        onEquipLivery={handleEquipLivery}
        onUnlockLivery={handleUnlockLivery}
        onPreviewCustom={handlePreviewCustom}
        onEquipVisualItem={handleEquipVisualItem}
        onUnlockVisualItem={handleUnlockVisualItem}
        onGarageEffectPreview={handleGarageEffectPreview}
        onGarageCameraFocus={handleGarageCameraFocus}
        onSelectColor={handleSelectColor}
        onChangeLicensePlate={handleChangeLicensePlate}
        onSelectCamera={handleSelectCamera}
        onToggleCamera={handleToggleCamera}
        onNitroToggle={handleNitroToggle}
        adFreePurchased={adState.adFreePurchased}
        freeWheelAvailable={dailyRewardAvailable}
        streakDay={streakStatus.activeStreakCount}
        revivedThisRun={revivedThisRun}
        runGoldDoubled={runGoldDoubled}
        onOpenLeaderboard={handleOpenLeaderboard}
        onOpenDailyWheel={handleOpenDailyWheel}
        onOpenStore={handleOpenStore}
        onOpenSettings={handleOpenSettings}
        onWatchAdRevive={handleWatchAdRevive}
        onWatchAdDoubleGold={handleWatchAdDoubleGold}
        onWatchAdTopUpGold={handleWatchAdTopUpGold}
        onRentCar={handleRentCar}
        careerProgress={careerProgress}
        lastCareerOutcome={lastCareerOutcome}
        onOpenCareerMap={handleOpenCareerMap}
        onStartCareerLevel={handleStartCareerLevel}
        claimedLevelRewards={claimedLevelRewards}
        unlockedCarColors={unlockedCarColors}
        onOpenLevelRoad={handleOpenLevelRoad}
      />

      <LevelRoadModal
        open={levelRoadOpen}
        playerLevel={playerLevel}
        claimedLevels={claimedLevelRewards}
        focusLevel={levelRoadFocusLevel}
        onClose={handleCloseLevelRoad}
        onClaimLevel={handleClaimLevelRoad}
        onClaimAll={handleClaimAllLevelRoad}
      />

      <LevelUpCelebrationOverlay
        event={activeLevelUp}
        inDriveMode={phase === 'playing'}
        onDismiss={handleDismissLevelUp}
        onOpenLevelRoad={handleOpenLevelRoadFromCelebration}
      />

      {levelRoadCrateSession && (
        <CrateOpeningCeremony
          title={levelRoadCrateSession.title}
          subtitle={levelRoadCrateSession.subtitle}
          rewardSummary={levelRoadCrateSession.rewardSummary}
          crateTierId={levelRoadCrateSession.crateTierId}
          crateImageUrl={levelRoadCrateSession.crateImageUrl}
          crateTitle={levelRoadCrateSession.crateTitle}
          lootItems={levelRoadCrateSession.lootItems}
          unlockedCarNames={levelRoadCrateSession.unlockedCarNames}
          showcaseCar={{
            modelId: carModel,
            colorId: carColor,
            wheelConfig: carWheels[carModel],
            customConfig: carCustom[carModel],
            licensePlate,
          }}
          animateCrate
          onOpenGarage={() => {
            setLevelRoadCrateSession(null);
            setLevelRoadOpen(false);
            launchGarage();
          }}
          onClose={() => setLevelRoadCrateSession(null)}
        />
      )}

      <CareerMapModal
        open={careerMapOpen}
        progress={careerProgress}
        goldCoins={goldCoins}
        onClose={handleCloseCareerMap}
        onStartLevel={handleStartCareerLevel}
        onClaimStarChest={handleClaimCareerStarChest}
      />

      <LeaderboardModal
        open={leaderboardOpen}
        currentUser={currentUser}
        onClose={handleCloseLeaderboard}
      />

      <DailyWheelModal
        open={dailyWheelOpen}
        freeAvailable={freeWheelAvailableToday}
        extraAdAvailable={extraWheelAdAvailableToday}
        streakStatus={streakStatus}
        onSpinFree={handleSpinFreeWheel}
        onWatchAdForExtraSpin={handleWatchAdForExtraSpin}
        onClaimSlice={handleClaimWheelSlice}
        onClaimStreakFree={handleClaimStreakFree}
        onWatchAdDoubleStreak={handleWatchAdDoubleStreak}
        onClose={handleCloseDailyWheel}
      />

      <AdOverlayModal
        session={activeAdSession}
        iapModalOpen={false}
        adFreePurchased={adState.adFreePurchased}
        onCompleteRewarded={handleCompleteRewardedAd}
        onCancelRewarded={handleCancelRewardedAd}
        onCloseInterstitial={handleCloseInterstitial}
        onOpenIapFromInterstitial={handleOpenStoreFromInterstitial}
        onConfirmPurchaseAdFree={handleConfirmPurchaseAdFree}
        onCloseIap={handleCloseStore}
      />

      <StoreModal
        open={storeOpen}
        initialTab={storeInitialTab}
        goldCoins={goldCoins}
        adFreePurchased={adState.adFreePurchased}
        entitlements={storeEntitlements}
        currentUser={currentUser}
        showcaseCar={{
          modelId: carModel,
          colorId: carColor,
          wheelConfig: carWheels[carModel],
          customConfig: carCustom[carModel],
          licensePlate,
        }}
        onFulfillPurchase={handleFulfillStorePurchase}
        onRedeemPromoCode={handleRedeemPromoCode}
        onRestorePurchases={handleRestorePurchases}
        onOpenGarageFromStore={launchGarage}
        onClose={handleCloseStore}
      />

      <SettingsModal
        open={settingsOpen}
        audioSettings={audioSettings}
        hapticsEnabled={hapticsEnabled}
        notificationSettings={notificationSettings}
        onChangeSfxVolume={handleChangeSfxVolume}
        onPreviewSfxVolume={handlePreviewSfxVolume}
        onChangeMusicVolume={handleChangeMusicVolume}
        onToggleMute={handleToggleMute}
        onToggleHaptics={handleToggleHaptics}
        onChangeNotificationSettings={setNotificationSettings}
        onClose={handleCloseSettings}
      />

      <OfflineIndicator />
    </main>
  );
}

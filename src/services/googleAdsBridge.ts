import {
  AdMob,
  InterstitialAdPluginEvents,
  RewardAdPluginEvents,
} from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';
import { RewardedAdPlacement } from './adManager';

export type GoogleAdBreakType =
  | 'start'
  | 'pause'
  | 'next'
  | 'browse'
  | 'reward';

export type GoogleAdBreakStatus =
  | 'notReady'
  | 'timeout'
  | 'error'
  | 'noAdPreloaded'
  | 'frequencyCapped'
  | 'ignored'
  | 'other'
  | 'dismissed'
  | 'viewed';

export interface GooglePlacementInfo {
  breakType: GoogleAdBreakType;
  breakName: string;
  breakFormat: 'interstitial' | 'reward';
  breakStatus: GoogleAdBreakStatus;
}

export interface GoogleAdBreakOptions {
  type: GoogleAdBreakType;
  name?: string;
  beforeAd?: () => void;
  afterAd?: () => void;
  beforeReward?: (showAdFn: () => void) => void;
  adDismissed?: () => void;
  adViewed?: () => void;
  adBreakDone?: (placementInfo: GooglePlacementInfo) => void;
}

export interface GoogleAdConfigOptions {
  preloadAdBreaks?: 'on' | 'auto';
  sound?: 'on' | 'off';
  onReady?: () => void;
}

declare global {
  interface Window {
    adsbygoogle?: unknown[];
    adBreak?: (options: GoogleAdBreakOptions) => void;
    adConfig?: (options: GoogleAdConfigOptions) => void;
  }
}

const DEFAULT_ADMOB_REWARDED_ID = 'ca-app-pub-6050401092680348/4424510794';
const DEFAULT_ADMOB_INTERSTITIAL_ID = 'ca-app-pub-6050401092680348/1243813688';

const CLIENT_ID = (import.meta.env.VITE_GOOGLE_ADS_CLIENT || '').trim();
const EXPLICIT_TEST_ENV = String(
  import.meta.env.VITE_GOOGLE_ADS_TEST_MODE || '',
)
  .trim()
  .toLowerCase();

// Test mode stays ON by default; set VITE_GOOGLE_ADS_TEST_MODE="false" when publishing live ads.
const TEST_MODE = EXPLICIT_TEST_ENV !== 'false';

// Official Google AdMob Android Test Ad Unit IDs (used safely whenever TEST_MODE=true)
const GOOGLE_TEST_ADMOB_REWARDED_ID =
  'ca-app-pub-3940256099942544/5224354917';
const GOOGLE_TEST_ADMOB_INTERSTITIAL_ID =
  'ca-app-pub-3940256099942544/1033173712';

const PROD_ADMOB_REWARDED_ID =
  (import.meta.env.VITE_ADMOB_REWARDED_ID || '').trim() ||
  DEFAULT_ADMOB_REWARDED_ID;
const PROD_ADMOB_INTERSTITIAL_ID =
  (import.meta.env.VITE_ADMOB_INTERSTITIAL_ID || '').trim() ||
  DEFAULT_ADMOB_INTERSTITIAL_ID;

const ADMOB_REWARDED_ID = TEST_MODE
  ? GOOGLE_TEST_ADMOB_REWARDED_ID
  : PROD_ADMOB_REWARDED_ID;
const ADMOB_INTERSTITIAL_ID = TEST_MODE
  ? GOOGLE_TEST_ADMOB_INTERSTITIAL_ID
  : PROD_ADMOB_INTERSTITIAL_ID;

// AdMob cached ads expire after ~60 minutes; refresh proactively before 50 minutes.
const AD_CACHE_TTL_MS = 50 * 60 * 1000;
const INITIAL_RETRY_DELAY_MS = 4000;
const MAX_RETRY_DELAY_MS = 45_000;
// Short grace wait ONLY if a rewarded ad preload is already mid-flight when user explicitly taps "Watch Ad".
const REWARDED_INFLIGHT_WAIT_MS = 600;

let scriptInjected = false;
let sdkLoaded = false;
let sdkFailed = false;
let sdkReadyPromise: Promise<boolean> | null = null;

let admobInitPromise: Promise<boolean> | null = null;
let admobInitialized = false;
let pendingNativeSoundEnabled: boolean | null = null;
let nativeListenersAttached = false;
let nativeListenersPromise: Promise<void> | null = null;
let onlineListenerAttached = false;

// Background preload caches for zero-delay ad display on button click
let rewardedReady = false;
let rewardedLoadedAt = 0;
let rewardedPreparePromise: Promise<boolean> | null = null;
let rewardedRetryTimer: number | null = null;
let rewardedRetryDelayMs = INITIAL_RETRY_DELAY_MS;

let interstitialReady = false;
let interstitialLoadedAt = 0;
let interstitialPreparePromise: Promise<boolean> | null = null;
let interstitialRetryTimer: number | null = null;
let interstitialRetryDelayMs = INITIAL_RETRY_DELAY_MS;
let allowInterstitialPreload = true;

interface ActiveRewardedSession {
  onShowed: () => void;
  onRewarded: () => void;
  onDismissed: () => void;
  onFailedToShow: () => void;
}

interface ActiveInterstitialSession {
  onShowed: () => void;
  onDismissed: () => void;
  onFailedToShow: () => void;
}

let activeRewardedSession: ActiveRewardedSession | null = null;
let activeInterstitialSession: ActiveInterstitialSession | null = null;

function isAdMobUnitValid(id: string): boolean {
  return /^ca-app-pub-\d{10,20}\/\d{6,15}$/.test(id);
}

function isRewardedCacheValid(): boolean {
  return (
    rewardedReady &&
    rewardedLoadedAt > 0 &&
    Date.now() - rewardedLoadedAt < AD_CACHE_TTL_MS
  );
}

function isInterstitialCacheValid(): boolean {
  return (
    interstitialReady &&
    interstitialLoadedAt > 0 &&
    Date.now() - interstitialLoadedAt < AD_CACHE_TTL_MS
  );
}

export function isGoogleAdsConfigured(): boolean {
  if (Capacitor.isNativePlatform()) {
    return (
      isAdMobUnitValid(ADMOB_REWARDED_ID) ||
      isAdMobUnitValid(ADMOB_INTERSTITIAL_ID)
    );
  }
  return /^ca-pub-\d{10,20}$/.test(CLIENT_ID);
}

export function isGoogleAdsTestMode(): boolean {
  return TEST_MODE;
}

export function isGoogleInterstitialReady(): boolean {
  if (typeof window === 'undefined') return false;
  if (Capacitor.isNativePlatform()) {
    return (
      admobInitialized &&
      nativeListenersAttached &&
      isInterstitialCacheValid()
    );
  }
  return sdkLoaded && !sdkFailed && Boolean(window.adBreak);
}

export function isGoogleRewardedReady(): boolean {
  if (typeof window === 'undefined') return false;
  if (Capacitor.isNativePlatform()) {
    return (
      admobInitialized && nativeListenersAttached && isRewardedCacheValid()
    );
  }
  return sdkLoaded && !sdkFailed && Boolean(window.adBreak);
}

function ensureNativeAdListeners(): Promise<void> {
  if (nativeListenersAttached) return Promise.resolve();
  if (nativeListenersPromise) return nativeListenersPromise;

  nativeListenersPromise = Promise.all([
    AdMob.addListener(RewardAdPluginEvents.Showed, () => {
      activeRewardedSession?.onShowed();
    }),
    AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
      activeRewardedSession?.onRewarded();
    }),
    AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
      activeRewardedSession?.onDismissed();
    }),
    AdMob.addListener(RewardAdPluginEvents.FailedToShow, () => {
      activeRewardedSession?.onFailedToShow();
    }),
    AdMob.addListener(InterstitialAdPluginEvents.Showed, () => {
      activeInterstitialSession?.onShowed();
    }),
    AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
      activeInterstitialSession?.onDismissed();
    }),
    AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, () => {
      activeInterstitialSession?.onFailedToShow();
    }),
  ])
    .then(() => {
      nativeListenersAttached = true;
    })
    .catch(() => {
      nativeListenersAttached = false;
      nativeListenersPromise = null;
    });

  return nativeListenersPromise;
}

function scheduleRewardedRetry(): void {
  if (typeof window === 'undefined') return;
  if (rewardedRetryTimer !== null) return;
  const delay = rewardedRetryDelayMs;
  rewardedRetryDelayMs = Math.min(MAX_RETRY_DELAY_MS, delay * 2);
  rewardedRetryTimer = window.setTimeout(() => {
    rewardedRetryTimer = null;
    void preloadNativeRewarded();
  }, delay);
}

function scheduleInterstitialRetry(): void {
  if (typeof window === 'undefined' || !allowInterstitialPreload) return;
  if (interstitialRetryTimer !== null) return;
  const delay = interstitialRetryDelayMs;
  interstitialRetryDelayMs = Math.min(MAX_RETRY_DELAY_MS, delay * 2);
  interstitialRetryTimer = window.setTimeout(() => {
    interstitialRetryTimer = null;
    void preloadNativeInterstitial();
  }, delay);
}

function preloadNativeRewarded(): Promise<boolean> {
  if (!Capacitor.isNativePlatform() || !isAdMobUnitValid(ADMOB_REWARDED_ID)) {
    return Promise.resolve(false);
  }
  if (isRewardedCacheValid()) {
    return Promise.resolve(true);
  }
  if (rewardedPreparePromise) {
    return rewardedPreparePromise;
  }
  if (rewardedRetryTimer !== null && typeof window !== 'undefined') {
    window.clearTimeout(rewardedRetryTimer);
    rewardedRetryTimer = null;
  }

  rewardedReady = false;
  rewardedLoadedAt = 0;

  rewardedPreparePromise = (async () => {
    try {
      const ready = await initNativeAdMob(pendingNativeSoundEnabled ?? true);
      if (!ready) return false;
      await AdMob.prepareRewardVideoAd({
        adId: ADMOB_REWARDED_ID,
        isTesting: TEST_MODE,
      });
      rewardedReady = true;
      rewardedLoadedAt = Date.now();
      rewardedRetryDelayMs = INITIAL_RETRY_DELAY_MS;
      return true;
    } catch {
      rewardedReady = false;
      rewardedLoadedAt = 0;
      scheduleRewardedRetry();
      return false;
    } finally {
      rewardedPreparePromise = null;
    }
  })();

  return rewardedPreparePromise;
}

function preloadNativeInterstitial(): Promise<boolean> {
  if (
    !allowInterstitialPreload ||
    !Capacitor.isNativePlatform() ||
    !isAdMobUnitValid(ADMOB_INTERSTITIAL_ID)
  ) {
    return Promise.resolve(false);
  }
  if (isInterstitialCacheValid()) {
    return Promise.resolve(true);
  }
  if (interstitialPreparePromise) {
    return interstitialPreparePromise;
  }
  if (interstitialRetryTimer !== null && typeof window !== 'undefined') {
    window.clearTimeout(interstitialRetryTimer);
    interstitialRetryTimer = null;
  }

  interstitialReady = false;
  interstitialLoadedAt = 0;

  interstitialPreparePromise = (async () => {
    try {
      const ready = await initNativeAdMob(pendingNativeSoundEnabled ?? true);
      if (!ready || !allowInterstitialPreload) return false;
      await AdMob.prepareInterstitial({
        adId: ADMOB_INTERSTITIAL_ID,
        isTesting: TEST_MODE,
      });
      interstitialReady = true;
      interstitialLoadedAt = Date.now();
      interstitialRetryDelayMs = INITIAL_RETRY_DELAY_MS;
      return true;
    } catch {
      interstitialReady = false;
      interstitialLoadedAt = 0;
      scheduleInterstitialRetry();
      return false;
    } finally {
      interstitialPreparePromise = null;
    }
  })();

  return interstitialPreparePromise;
}

export function preloadGoogleAds(options?: {
  includeInterstitial?: boolean;
  includeRewarded?: boolean;
}): void {
  if (typeof window === 'undefined' || !Capacitor.isNativePlatform()) return;
  if (typeof options?.includeInterstitial === 'boolean') {
    allowInterstitialPreload = options.includeInterstitial;
    if (!allowInterstitialPreload && interstitialRetryTimer !== null) {
      window.clearTimeout(interstitialRetryTimer);
      interstitialRetryTimer = null;
    }
  }
  if (!isGoogleAdsConfigured()) return;

  if (options?.includeRewarded !== false && !isRewardedCacheValid()) {
    void preloadNativeRewarded();
  }
  if (allowInterstitialPreload && !isInterstitialCacheValid()) {
    void preloadNativeInterstitial();
  }
}

async function initNativeAdMob(soundEnabled: boolean): Promise<boolean> {
  if (!isGoogleAdsConfigured()) return false;
  if (pendingNativeSoundEnabled === null) {
    pendingNativeSoundEnabled = soundEnabled;
  }
  if (admobInitPromise) return admobInitPromise;

  admobInitPromise = (async () => {
    try {
      await AdMob.initialize({
        initializeForTesting: TEST_MODE,
      });
      await ensureNativeAdListeners();
      admobInitialized = true;
      const targetSound = pendingNativeSoundEnabled ?? soundEnabled;
      await AdMob.setApplicationMuted({ muted: !targetSound }).catch(() => {});

      if (!onlineListenerAttached && typeof window !== 'undefined') {
        onlineListenerAttached = true;
        window.addEventListener('online', () => {
          rewardedRetryDelayMs = INITIAL_RETRY_DELAY_MS;
          interstitialRetryDelayMs = INITIAL_RETRY_DELAY_MS;
          preloadGoogleAds();
        });
      }

      // Immediately warm both ad caches in the background so taps trigger with 0ms wait
      void preloadNativeRewarded();
      if (allowInterstitialPreload) {
        void preloadNativeInterstitial();
      }
      return true;
    } catch {
      admobInitialized = false;
      admobInitPromise = null;
      return false;
    }
  })();

  return admobInitPromise;
}

export function initGoogleAds(
  soundEnabled = true,
  options?: { preloadInterstitial?: boolean },
): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (typeof options?.preloadInterstitial === 'boolean') {
    allowInterstitialPreload = options.preloadInterstitial;
  }

  if (Capacitor.isNativePlatform()) {
    return initNativeAdMob(soundEnabled);
  }

  window.adsbygoogle = window.adsbygoogle || [];
  if (!window.adBreak) {
    window.adBreak = (o) => {
      window.adsbygoogle?.push(o);
    };
  }
  if (!window.adConfig) {
    window.adConfig = (o) => {
      window.adsbygoogle?.push(o);
    };
  }

  if (!isGoogleAdsConfigured()) {
    return Promise.resolve(false);
  }

  if (sdkReadyPromise) {
    window.adConfig({
      preloadAdBreaks: 'on',
      sound: soundEnabled ? 'on' : 'off',
    });
    return sdkReadyPromise;
  }

  sdkReadyPromise = new Promise<boolean>((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-viraj-google-ads="true"]',
    );
    if (existing && sdkLoaded) {
      resolve(true);
      return;
    }

    if (!scriptInjected && !existing) {
      scriptInjected = true;
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(CLIENT_ID)}`;
      script.crossOrigin = 'anonymous';
      script.setAttribute('data-viraj-google-ads', 'true');
      script.setAttribute('data-ad-frequency-hint', '75s');
      if (TEST_MODE) {
        script.setAttribute('data-adbreak-test', 'on');
      }

      const timeoutId = window.setTimeout(() => {
        if (!sdkLoaded) {
          sdkFailed = true;
          resolve(false);
        }
      }, 4500);

      script.onload = () => {
        window.clearTimeout(timeoutId);
        sdkLoaded = true;
        sdkFailed = false;
        window.adConfig?.({
          preloadAdBreaks: 'on',
          sound: soundEnabled ? 'on' : 'off',
          onReady: () => resolve(true),
        });
        window.setTimeout(() => resolve(true), 300);
      };

      script.onerror = () => {
        window.clearTimeout(timeoutId);
        sdkFailed = true;
        resolve(false);
      };

      document.head.appendChild(script);
    } else {
      resolve(sdkLoaded && !sdkFailed);
    }
  });

  return sdkReadyPromise;
}

export function syncGoogleAdsSound(soundEnabled: boolean): void {
  if (typeof window === 'undefined') return;
  if (Capacitor.isNativePlatform()) {
    if (!isGoogleAdsConfigured()) return;
    pendingNativeSoundEnabled = soundEnabled;
    if (admobInitialized) {
      void AdMob.setApplicationMuted({ muted: !soundEnabled }).catch(() => {});
    } else if (admobInitPromise) {
      void admobInitPromise.then((ready) => {
        if (ready && admobInitialized && pendingNativeSoundEnabled !== null) {
          void AdMob.setApplicationMuted({
            muted: !pendingNativeSoundEnabled,
          }).catch(() => {});
        }
      });
    }
    return;
  }
  if (!isGoogleAdsConfigured()) return;
  window.adConfig?.({
    sound: soundEnabled ? 'on' : 'off',
  });
}

export interface RewardedAdResult {
  outcome: 'viewed' | 'dismissed' | 'unavailable';
  provider: 'google' | 'fallback_required';
}

export interface InterstitialAdResult {
  outcome: 'shown' | 'skipped' | 'unavailable';
  provider: 'google' | 'fallback_required';
}

async function triggerNativeRewardedAd(
  onAudioPause: () => void,
  onAudioResume: () => void,
): Promise<RewardedAdResult> {
  if (!isAdMobUnitValid(ADMOB_REWARDED_ID)) {
    return { outcome: 'unavailable', provider: 'fallback_required' };
  }

  // Fast-path: if a rewarded ad is already preloaded in RAM, show it with 0ms wait.
  // If not ready yet, allow at most a tiny grace window for an already in-flight preload
  // instead of stalling the button for 3-7 seconds.
  if (!admobInitialized || !nativeListenersAttached || !isRewardedCacheValid()) {
    const prepPromise = preloadNativeRewarded();
    const becameReady = await Promise.race<boolean>([
      prepPromise,
      new Promise<boolean>((resolve) => {
        window.setTimeout(() => resolve(false), REWARDED_INFLIGHT_WAIT_MS);
      }),
    ]);
    if (
      !becameReady ||
      !admobInitialized ||
      !nativeListenersAttached ||
      !isRewardedCacheValid()
    ) {
      return { outcome: 'unavailable', provider: 'fallback_required' };
    }
  }

  // Consume preloaded ad slot immediately
  rewardedReady = false;
  rewardedLoadedAt = 0;

  return new Promise<RewardedAdResult>((resolve) => {
    let settled = false;
    let rewarded = false;
    let adShowed = false;
    let sawHiddenDuringAd = false;
    let showStartTimer: number | null = null;
    let resumeFallbackTimer: number | null = null;

    const cleanup = () => {
      if (showStartTimer !== null) {
        window.clearTimeout(showStartTimer);
        showStartTimer = null;
      }
      if (resumeFallbackTimer !== null) {
        window.clearTimeout(resumeFallbackTimer);
        resumeFallbackTimer = null;
      }
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (activeRewardedSession === session) {
        activeRewardedSession = null;
      }
    };

    const finish = (result: RewardedAdResult) => {
      if (settled) return;
      settled = true;
      cleanup();
      onAudioResume();
      resolve(result);
      // Immediately start preloading the next rewarded ad in background
      void preloadNativeRewarded();
    };

    const onVisibilityChange = () => {
      if (settled) return;
      if (document.hidden) {
        sawHiddenDuringAd = true;
        if (showStartTimer !== null) {
          window.clearTimeout(showStartTimer);
          showStartTimer = null;
        }
        if (resumeFallbackTimer !== null) {
          window.clearTimeout(resumeFallbackTimer);
          resumeFallbackTimer = null;
        }
      } else if (adShowed || sawHiddenDuringAd || rewarded) {
        if (resumeFallbackTimer !== null) {
          window.clearTimeout(resumeFallbackTimer);
        }
        resumeFallbackTimer = window.setTimeout(() => {
          finish({
            outcome: rewarded ? 'viewed' : 'dismissed',
            provider: 'google',
          });
        }, 450);
      }
    };

    const session: ActiveRewardedSession = {
      onShowed: () => {
        adShowed = true;
        if (showStartTimer !== null) {
          window.clearTimeout(showStartTimer);
          showStartTimer = null;
        }
      },
      onRewarded: () => {
        rewarded = true;
      },
      onDismissed: () => {
        finish({
          outcome: rewarded ? 'viewed' : 'dismissed',
          provider: 'google',
        });
      },
      onFailedToShow: () => {
        finish({ outcome: 'unavailable', provider: 'fallback_required' });
      },
    };

    activeRewardedSession = session;
    document.addEventListener('visibilitychange', onVisibilityChange);
    onAudioPause();

    showStartTimer = window.setTimeout(() => {
      if (!adShowed && !document.hidden) {
        finish({ outcome: 'unavailable', provider: 'fallback_required' });
      }
    }, 2500);

    // Show preloaded ad immediately (0ms network wait, 0 listener bridge round-trips)
    void (async () => {
      try {
        const rewardItem = await AdMob.showRewardVideoAd();
        if (rewardItem && (rewardItem.amount > 0 || rewardItem.type)) {
          rewarded = true;
        }
        if (!settled && !document.hidden) {
          if (resumeFallbackTimer !== null) {
            window.clearTimeout(resumeFallbackTimer);
          }
          resumeFallbackTimer = window.setTimeout(() => {
            finish({
              outcome: rewarded ? 'viewed' : 'dismissed',
              provider: 'google',
            });
          }, 450);
        }
      } catch (err: unknown) {
        const errCode =
          typeof err === 'object' && err !== null && 'code' in err
            ? String((err as { code?: unknown }).code)
            : '';
        const errMsg =
          typeof err === 'object' && err !== null && 'message' in err
            ? String((err as { message?: unknown }).message)
            : '';
        if (
          errCode === 'REWARDED_AD_CANCELLED' ||
          errMsg.includes('dismissed before earning') ||
          adShowed
        ) {
          finish({
            outcome: rewarded ? 'viewed' : 'dismissed',
            provider: 'google',
          });
        } else {
          finish({ outcome: 'unavailable', provider: 'fallback_required' });
        }
      }
    })();
  });
}

async function triggerNativeInterstitialAd(
  onAudioPause: () => void,
  onAudioResume: () => void,
): Promise<InterstitialAdResult> {
  if (!isAdMobUnitValid(ADMOB_INTERSTITIAL_ID)) {
    return { outcome: 'unavailable', provider: 'fallback_required' };
  }

  // NEVER block a menu/restart button waiting for network download:
  // if no interstitial is already preloaded in RAM, skip instantly (0ms) and preload in background.
  if (
    !admobInitialized ||
    !nativeListenersAttached ||
    !isInterstitialCacheValid()
  ) {
    void preloadNativeInterstitial();
    return { outcome: 'skipped', provider: 'google' };
  }

  // Consume preloaded ad slot immediately
  interstitialReady = false;
  interstitialLoadedAt = 0;

  return new Promise<InterstitialAdResult>((resolve) => {
    let settled = false;
    let adShowed = false;
    let sawHiddenDuringAd = false;
    let showStartTimer: number | null = null;
    let resumeFallbackTimer: number | null = null;

    const cleanup = () => {
      if (showStartTimer !== null) {
        window.clearTimeout(showStartTimer);
        showStartTimer = null;
      }
      if (resumeFallbackTimer !== null) {
        window.clearTimeout(resumeFallbackTimer);
        resumeFallbackTimer = null;
      }
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (activeInterstitialSession === session) {
        activeInterstitialSession = null;
      }
    };

    const finish = (result: InterstitialAdResult) => {
      if (settled) return;
      settled = true;
      cleanup();
      onAudioResume();
      resolve(result);
      // Immediately preload next interstitial in background
      void preloadNativeInterstitial();
    };

    const onVisibilityChange = () => {
      if (settled) return;
      if (document.hidden) {
        sawHiddenDuringAd = true;
        if (showStartTimer !== null) {
          window.clearTimeout(showStartTimer);
          showStartTimer = null;
        }
        if (resumeFallbackTimer !== null) {
          window.clearTimeout(resumeFallbackTimer);
          resumeFallbackTimer = null;
        }
      } else if (adShowed || sawHiddenDuringAd) {
        if (resumeFallbackTimer !== null) {
          window.clearTimeout(resumeFallbackTimer);
        }
        resumeFallbackTimer = window.setTimeout(() => {
          finish({ outcome: 'shown', provider: 'google' });
        }, 450);
      }
    };

    const session: ActiveInterstitialSession = {
      onShowed: () => {
        adShowed = true;
        if (showStartTimer !== null) {
          window.clearTimeout(showStartTimer);
          showStartTimer = null;
        }
      },
      onDismissed: () => {
        finish({ outcome: 'shown', provider: 'google' });
      },
      onFailedToShow: () => {
        finish({ outcome: 'unavailable', provider: 'fallback_required' });
      },
    };

    activeInterstitialSession = session;
    document.addEventListener('visibilitychange', onVisibilityChange);
    onAudioPause();

    showStartTimer = window.setTimeout(() => {
      if (!adShowed && !document.hidden) {
        finish({ outcome: 'unavailable', provider: 'fallback_required' });
      }
    }, 2500);

    // Show preloaded interstitial immediately (0ms network wait, 0 listener bridge round-trips)
    void AdMob.showInterstitial().catch(() => {
      finish({ outcome: 'unavailable', provider: 'fallback_required' });
    });
  });
}

export async function triggerGoogleRewardedAd(
  placement: RewardedAdPlacement,
  onAudioPause: () => void,
  onAudioResume: () => void,
): Promise<RewardedAdResult> {
  if (Capacitor.isNativePlatform()) {
    return triggerNativeRewardedAd(onAudioPause, onAudioResume);
  }

  const ready = await initGoogleAds(true);
  const adBreakFn = window.adBreak;
  if (!ready || !adBreakFn) {
    return { outcome: 'unavailable', provider: 'fallback_required' };
  }

  return new Promise<RewardedAdResult>((resolve) => {
    let settled = false;
    let viewed = false;
    let dismissed = false;
    let rewardOffered = false;

    const finish = (result: RewardedAdResult) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(guardTimer);
      onAudioResume();
      resolve(result);
    };

    const guardTimer = window.setTimeout(() => {
      finish({ outcome: 'unavailable', provider: 'fallback_required' });
    }, 2500);

    try {
      adBreakFn({
        type: 'reward',
        name: placement.kind,
        beforeAd: () => {
          window.clearTimeout(guardTimer);
          onAudioPause();
        },
        beforeReward: (showAdFn) => {
          rewardOffered = true;
          window.clearTimeout(guardTimer);
          showAdFn();
        },
        adViewed: () => {
          viewed = true;
        },
        adDismissed: () => {
          dismissed = true;
        },
        afterAd: () => {
          onAudioResume();
        },
        adBreakDone: (info) => {
          if (viewed || info?.breakStatus === 'viewed') {
            finish({ outcome: 'viewed', provider: 'google' });
          } else if (dismissed || info?.breakStatus === 'dismissed') {
            finish({ outcome: 'dismissed', provider: 'google' });
          } else if (
            !rewardOffered ||
            info?.breakStatus === 'notReady' ||
            info?.breakStatus === 'noAdPreloaded' ||
            info?.breakStatus === 'timeout' ||
            info?.breakStatus === 'error'
          ) {
            finish({ outcome: 'unavailable', provider: 'fallback_required' });
          } else {
            finish({ outcome: 'unavailable', provider: 'fallback_required' });
          }
        },
      });
    } catch {
      finish({ outcome: 'unavailable', provider: 'fallback_required' });
    }
  });
}

export async function triggerGoogleInterstitialAd(
  placementName: string,
  onAudioPause: () => void,
  onAudioResume: () => void,
): Promise<InterstitialAdResult> {
  if (Capacitor.isNativePlatform()) {
    return triggerNativeInterstitialAd(onAudioPause, onAudioResume);
  }

  const ready = await initGoogleAds(true);
  const adBreakFn = window.adBreak;
  if (!ready || !adBreakFn) {
    return { outcome: 'unavailable', provider: 'fallback_required' };
  }

  return new Promise<InterstitialAdResult>((resolve) => {
    let settled = false;
    let adDisplayed = false;

    const finish = (result: InterstitialAdResult) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(guardTimer);
      onAudioResume();
      resolve(result);
    };

    const guardTimer = window.setTimeout(() => {
      finish({ outcome: 'unavailable', provider: 'fallback_required' });
    }, 1500);

    try {
      adBreakFn({
        type: 'next',
        name: placementName,
        beforeAd: () => {
          adDisplayed = true;
          window.clearTimeout(guardTimer);
          onAudioPause();
        },
        afterAd: () => {
          onAudioResume();
        },
        adBreakDone: (info) => {
          if (adDisplayed || info?.breakStatus === 'viewed') {
            finish({ outcome: 'shown', provider: 'google' });
          } else if (info?.breakStatus === 'frequencyCapped') {
            finish({ outcome: 'skipped', provider: 'google' });
          } else {
            finish({ outcome: 'unavailable', provider: 'fallback_required' });
          }
        },
      });
    } catch {
      finish({ outcome: 'unavailable', provider: 'fallback_required' });
    }
  });
}

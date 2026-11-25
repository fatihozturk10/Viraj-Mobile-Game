import {
  AdMob,
  InterstitialAdPluginEvents,
  RewardAdPluginEvents,
} from '@capacitor-community/admob';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';
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

let scriptInjected = false;
let sdkLoaded = false;
let sdkFailed = false;
let sdkReadyPromise: Promise<boolean> | null = null;
let admobInitPromise: Promise<boolean> | null = null;

function isAdMobUnitValid(id: string): boolean {
  return /^ca-app-pub-\d{10,20}\/\d{6,15}$/.test(id);
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

async function initNativeAdMob(soundEnabled: boolean): Promise<boolean> {
  if (!isGoogleAdsConfigured()) return false;
  if (admobInitPromise) return admobInitPromise;

  admobInitPromise = (async () => {
    try {
      await AdMob.initialize({
        initializeForTesting: TEST_MODE,
      });
      await AdMob.setApplicationMuted({ muted: !soundEnabled }).catch(() => {});
      return true;
    } catch {
      return false;
    }
  })();

  return admobInitPromise;
}

export function initGoogleAds(soundEnabled = true): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);

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
    void AdMob.setApplicationMuted({ muted: !soundEnabled }).catch(() => {});
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
  const ready = await initNativeAdMob(true);
  if (!ready) {
    return { outcome: 'unavailable', provider: 'fallback_required' };
  }

  return new Promise<RewardedAdResult>((resolve) => {
    const handles: PluginListenerHandle[] = [];
    let settled = false;
    let rewarded = false;
    let adShowed = false;
    let sawHiddenDuringAd = false;
    let prepareTimer: number | null = null;
    let showStartTimer: number | null = null;
    let resumeFallbackTimer: number | null = null;

    const cleanup = () => {
      if (prepareTimer !== null) {
        window.clearTimeout(prepareTimer);
        prepareTimer = null;
      }
      if (showStartTimer !== null) {
        window.clearTimeout(showStartTimer);
        showStartTimer = null;
      }
      if (resumeFallbackTimer !== null) {
        window.clearTimeout(resumeFallbackTimer);
        resumeFallbackTimer = null;
      }
      document.removeEventListener('visibilitychange', onVisibilityChange);
      for (const h of handles) {
        void h.remove();
      }
      handles.length = 0;
    };

    const finish = (result: RewardedAdResult) => {
      if (settled) return;
      settled = true;
      cleanup();
      onAudioResume();
      resolve(result);
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
        }, 1200);
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    void (async () => {
      try {
        const showedHandle = await AdMob.addListener(
          RewardAdPluginEvents.Showed,
          () => {
            adShowed = true;
            if (showStartTimer !== null) {
              window.clearTimeout(showStartTimer);
              showStartTimer = null;
            }
          },
        );
        handles.push(showedHandle);

        const rewardHandle = await AdMob.addListener(
          RewardAdPluginEvents.Rewarded,
          () => {
            rewarded = true;
          },
        );
        handles.push(rewardHandle);

        const dismissHandle = await AdMob.addListener(
          RewardAdPluginEvents.Dismissed,
          () => {
            finish({
              outcome: rewarded ? 'viewed' : 'dismissed',
              provider: 'google',
            });
          },
        );
        handles.push(dismissHandle);

        const failedShowHandle = await AdMob.addListener(
          RewardAdPluginEvents.FailedToShow,
          () => {
            finish({ outcome: 'unavailable', provider: 'fallback_required' });
          },
        );
        handles.push(failedShowHandle);

        prepareTimer = window.setTimeout(() => {
          finish({ outcome: 'unavailable', provider: 'fallback_required' });
        }, 7000);

        await AdMob.prepareRewardVideoAd({
          adId: ADMOB_REWARDED_ID,
          isTesting: TEST_MODE,
        });

        if (settled) return;
        if (prepareTimer !== null) {
          window.clearTimeout(prepareTimer);
          prepareTimer = null;
        }

        onAudioPause();

        showStartTimer = window.setTimeout(() => {
          if (!adShowed && !document.hidden) {
            finish({ outcome: 'unavailable', provider: 'fallback_required' });
          }
        }, 5000);

        // On Android, showRewardVideoAd() resolves when onUserEarnedReward fires
        // (while the ad end-card is still open) or rejects with REWARDED_AD_CANCELLED.
        // Wait for RewardAdPluginEvents.Dismissed before returning to gameplay.
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
            }, 1200);
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
      } catch {
        finish({ outcome: 'unavailable', provider: 'fallback_required' });
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
  const ready = await initNativeAdMob(true);
  if (!ready) {
    return { outcome: 'unavailable', provider: 'fallback_required' };
  }

  return new Promise<InterstitialAdResult>((resolve) => {
    const handles: PluginListenerHandle[] = [];
    let settled = false;
    let adShowed = false;
    let sawHiddenDuringAd = false;
    let prepareTimer: number | null = null;
    let showStartTimer: number | null = null;
    let resumeFallbackTimer: number | null = null;

    const cleanup = () => {
      if (prepareTimer !== null) {
        window.clearTimeout(prepareTimer);
        prepareTimer = null;
      }
      if (showStartTimer !== null) {
        window.clearTimeout(showStartTimer);
        showStartTimer = null;
      }
      if (resumeFallbackTimer !== null) {
        window.clearTimeout(resumeFallbackTimer);
        resumeFallbackTimer = null;
      }
      document.removeEventListener('visibilitychange', onVisibilityChange);
      for (const h of handles) {
        void h.remove();
      }
      handles.length = 0;
    };

    const finish = (result: InterstitialAdResult) => {
      if (settled) return;
      settled = true;
      cleanup();
      onAudioResume();
      resolve(result);
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
        }, 1200);
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    void (async () => {
      try {
        const showedHandle = await AdMob.addListener(
          InterstitialAdPluginEvents.Showed,
          () => {
            adShowed = true;
            if (showStartTimer !== null) {
              window.clearTimeout(showStartTimer);
              showStartTimer = null;
            }
          },
        );
        handles.push(showedHandle);

        const dismissHandle = await AdMob.addListener(
          InterstitialAdPluginEvents.Dismissed,
          () => {
            finish({ outcome: 'shown', provider: 'google' });
          },
        );
        handles.push(dismissHandle);

        const failedShowHandle = await AdMob.addListener(
          InterstitialAdPluginEvents.FailedToShow,
          () => {
            finish({ outcome: 'unavailable', provider: 'fallback_required' });
          },
        );
        handles.push(failedShowHandle);

        prepareTimer = window.setTimeout(() => {
          finish({ outcome: 'unavailable', provider: 'fallback_required' });
        }, 6000);

        await AdMob.prepareInterstitial({
          adId: ADMOB_INTERSTITIAL_ID,
          isTesting: TEST_MODE,
        });

        if (settled) return;
        if (prepareTimer !== null) {
          window.clearTimeout(prepareTimer);
          prepareTimer = null;
        }

        onAudioPause();

        showStartTimer = window.setTimeout(() => {
          if (!adShowed && !document.hidden) {
            finish({ outcome: 'unavailable', provider: 'fallback_required' });
          }
        }, 5000);

        // On Android, AdMob.showInterstitial() resolves as soon as the AdActivity launches!
        // Keep awaiting InterstitialAdPluginEvents.Dismissed so the game never starts behind the ad.
        await AdMob.showInterstitial();
      } catch {
        finish({ outcome: 'unavailable', provider: 'fallback_required' });
      }
    })();
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
    }, 6500);

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
    }, 4500);

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

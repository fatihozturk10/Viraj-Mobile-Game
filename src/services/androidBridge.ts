import { App as CapApp } from '@capacitor/app';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';

export type AndroidHapticKind =
  | 'light'
  | 'medium'
  | 'heavy'
  | 'reward'
  | 'crash';

export interface AndroidLifecycleCallbacks {
  onBackButton: () => boolean | void;
  onBackground: () => void;
  onForeground: () => void;
}

export function isNativeAndroid(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

export async function initAndroidRuntime(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setOverlaysWebView({ overlay: true });
    await StatusBar.hide();
  } catch {
    // ignore on unsupported devices
  }

  try {
    await ScreenOrientation.lock({ orientation: 'portrait' });
  } catch {
    // manifest enforces portrait on Android as primary guarantee
  }

  try {
    await SplashScreen.hide({ fadeOutDuration: 280 });
  } catch {
    // ignore if already hidden
  }
}

export function subscribeAndroidLifecycle(
  callbacks: AndroidLifecycleCallbacks,
): () => void {
  if (!Capacitor.isNativePlatform()) {
    return () => {};
  }

  let backHandle: PluginListenerHandle | null = null;
  let stateHandle: PluginListenerHandle | null = null;
  let disposed = false;

  void CapApp.addListener('backButton', () => {
    const handled = callbacks.onBackButton();
    if (!handled) {
      void CapApp.minimizeApp();
    }
  }).then((h) => {
    if (disposed) {
      void h.remove();
    } else {
      backHandle = h;
    }
  });

  void CapApp.addListener('appStateChange', ({ isActive }) => {
    if (isActive) {
      void StatusBar.hide().catch(() => {});
      callbacks.onForeground();
    } else {
      callbacks.onBackground();
    }
  }).then((h) => {
    if (disposed) {
      void h.remove();
    } else {
      stateHandle = h;
    }
  });

  return () => {
    disposed = true;
    void backHandle?.remove();
    void stateHandle?.remove();
  };
}

const HAPTICS_STORAGE_KEY = 'viraj_haptics_enabled_v1';

let hapticsEnabledState: boolean = (() => {
  try {
    const raw = window.localStorage.getItem(HAPTICS_STORAGE_KEY);
    return raw === null ? true : raw === '1';
  } catch {
    return true;
  }
})();

export function isHapticsEnabled(): boolean {
  return hapticsEnabledState;
}

export function setHapticsEnabled(enabled: boolean): void {
  hapticsEnabledState = enabled;
  try {
    window.localStorage.setItem(HAPTICS_STORAGE_KEY, enabled ? '1' : '0');
  } catch {
    // ignore storage errors
  }
}

export function triggerNativeHaptic(kind: AndroidHapticKind): void {
  if (!hapticsEnabledState) return;
  if (Capacitor.isNativePlatform()) {
    switch (kind) {
      case 'light':
        void Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
        return;
      case 'medium':
        void Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
        return;
      case 'heavy':
        void Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
        return;
      case 'reward':
        void Haptics.notification({ type: NotificationType.Success }).catch(
          () => {},
        );
        return;
      case 'crash':
        void Haptics.notification({ type: NotificationType.Error }).catch(
          () => {},
        );
        return;
    }
  }

  // Subtle web mobile fallback where supported
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    const ms =
      kind === 'crash'
        ? [45, 30, 70]
        : kind === 'heavy'
          ? 40
          : kind === 'reward'
            ? [18, 25, 28]
            : 16;
    try {
      navigator.vibrate(ms);
    } catch {
      // ignore
    }
  }
}

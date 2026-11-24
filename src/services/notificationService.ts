import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export type NotificationPermissionState =
  | 'granted'
  | 'denied'
  | 'prompt'
  | 'unsupported';

export interface NotificationSettings {
  enabled: boolean;
  dailyWheel: boolean;
  streakReminder: boolean;
  missionAlerts: boolean;
}

const STORAGE_KEY = 'viraj_notification_settings_v1';
const ANDROID_CHANNEL_ID = 'viraj_reminders';

const NOTIF_ID_DAILY_WHEEL = 1001;
const NOTIF_ID_STREAK = 1002;
const NOTIF_ID_COMEBACK = 1003;
const NOTIF_ID_TEST = 1099;

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: false,
  dailyWheel: true,
  streakReminder: true,
  missionAlerts: true,
};

let channelReady = false;

export function loadNotificationSettings(): NotificationSettings {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<NotificationSettings>;
    return {
      enabled: Boolean(parsed.enabled),
      dailyWheel: parsed.dailyWheel !== false,
      streakReminder: parsed.streakReminder !== false,
      missionAlerts: parsed.missionAlerts !== false,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveNotificationSettings(settings: NotificationSettings): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore storage errors
  }
}

async function ensureAndroidChannel(): Promise<void> {
  if (channelReady || !Capacitor.isNativePlatform()) return;
  if (Capacitor.getPlatform() !== 'android') {
    channelReady = true;
    return;
  }
  try {
    await LocalNotifications.createChannel({
      id: ANDROID_CHANNEL_ID,
      name: 'Viraj Hatırlatıcılar',
      description: 'Günlük ödül çarkı, seri koruma ve yarış hatırlatmaları',
      importance: 4,
      visibility: 1,
      vibration: true,
    });
    channelReady = true;
  } catch {
    // ignore channel creation errors on older Android versions
  }
}

export async function checkNotificationPermission(): Promise<NotificationPermissionState> {
  if (Capacitor.isNativePlatform()) {
    try {
      const res = await LocalNotifications.checkPermissions();
      if (res.display === 'granted') return 'granted';
      if (res.display === 'denied') return 'denied';
      return 'prompt';
    } catch {
      return 'unsupported';
    }
  }

  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return 'unsupported';
  }
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return 'prompt';
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (Capacitor.isNativePlatform()) {
    try {
      await ensureAndroidChannel();
      const res = await LocalNotifications.requestPermissions();
      if (res.display === 'granted') return 'granted';
      if (res.display === 'denied') return 'denied';
      return 'prompt';
    } catch {
      return 'unsupported';
    }
  }

  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return 'unsupported';
  }
  try {
    const res = await Notification.requestPermission();
    if (res === 'granted') return 'granted';
    if (res === 'denied') return 'denied';
    return 'prompt';
  } catch {
    return 'denied';
  }
}

export async function syncScheduledNotifications(
  settings: NotificationSettings,
): Promise<void> {
  saveNotificationSettings(settings);

  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    await LocalNotifications.cancel({
      notifications: [
        { id: NOTIF_ID_DAILY_WHEEL },
        { id: NOTIF_ID_STREAK },
        { id: NOTIF_ID_COMEBACK },
      ],
    });
  } catch {
    // ignore if none were scheduled
  }

  if (!settings.enabled) return;

  const perm = await checkNotificationPermission();
  if (perm !== 'granted') return;

  await ensureAndroidChannel();

  const now = Date.now();
  const notifications: Array<{
    id: number;
    title: string;
    body: string;
    channelId: string;
    schedule: { at?: Date; on?: { hour: number; minute: number }; allowWhileIdle?: boolean };
  }> = [];

  if (settings.dailyWheel) {
    notifications.push({
      id: NOTIF_ID_DAILY_WHEEL,
      title: 'Günlük Ödül Çarkın Hazır!',
      body: 'Ücretsiz çarkı çevir, altın ve garaj ödüllerini kaçırma.',
      channelId: ANDROID_CHANNEL_ID,
      schedule: {
        on: { hour: 20, minute: 0 },
        allowWhileIdle: true,
      },
    });
  }

  if (settings.streakReminder) {
    notifications.push({
      id: NOTIF_ID_STREAK,
      title: 'Giriş Serin Bozulmasın!',
      body: 'Otoyola dön ve günlük seri bonus altınlarını topla.',
      channelId: ANDROID_CHANNEL_ID,
      schedule: {
        at: new Date(now + 22 * 60 * 60 * 1000),
        allowWhileIdle: true,
      },
    });
  }

  if (settings.missionAlerts) {
    notifications.push({
      id: NOTIF_ID_COMEBACK,
      title: 'Gece Otoyolu Seni Bekliyor',
      body: 'Yeni görevler ve rekor yarışı için gaza basmaya hazır mısın?',
      channelId: ANDROID_CHANNEL_ID,
      schedule: {
        at: new Date(now + 48 * 60 * 60 * 1000),
        allowWhileIdle: true,
      },
    });
  }

  if (notifications.length > 0) {
    try {
      await LocalNotifications.schedule({ notifications });
    } catch {
      // ignore schedule errors on restricted devices
    }
  }
}

export async function refreshScheduledNotifications(): Promise<void> {
  const settings = loadNotificationSettings();
  if (!settings.enabled) return;
  await syncScheduledNotifications(settings);
}

export async function sendTestNotification(): Promise<{
  ok: boolean;
  message: string;
}> {
  const perm = await requestNotificationPermission();
  if (perm === 'unsupported') {
    return {
      ok: false,
      message: 'Bu tarayıcıda bildirim desteği bulunmuyor.',
    };
  }
  if (perm !== 'granted') {
    return {
      ok: false,
      message: 'Bildirim izni verilmedi. Cihaz ayarlarından izin açabilirsin.',
    };
  }

  if (Capacitor.isNativePlatform()) {
    try {
      await ensureAndroidChannel();
      await LocalNotifications.schedule({
        notifications: [
          {
            id: NOTIF_ID_TEST,
            title: 'Viraj — Bildirimler Aktif!',
            body: 'Günlük çark ve seri hatırlatmaları cihazına bu şekilde ulaşacak.',
            channelId: ANDROID_CHANNEL_ID,
            schedule: {
              at: new Date(Date.now() + 2000),
              allowWhileIdle: true,
            },
          },
        ],
      });
      return {
        ok: true,
        message: 'Test bildirimi 2 saniye içinde gönderilecek.',
      };
    } catch {
      return {
        ok: false,
        message: 'Test bildirimi gönderilemedi.',
      };
    }
  }

  try {
    new Notification('Viraj — Bildirimler Aktif!', {
      body: 'Günlük çark ve seri hatırlatmaları hazır.',
      icon: '/pwa-192x192.png',
    });
    return {
      ok: true,
      message: 'Test bildirimi gönderildi.',
    };
  } catch {
    return {
      ok: false,
      message: 'Tarayıcı bildirimi gösterilemedi.',
    };
  }
}

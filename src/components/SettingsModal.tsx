import React, { useEffect, useState } from 'react';
import {
  Bell,
  BellOff,
  CheckCircle2,
  Music,
  Send,
  Settings,
  Smartphone,
  Vibrate,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { AudioSettings } from '../game/audioEngine';
import {
  checkNotificationPermission,
  NotificationPermissionState,
  NotificationSettings,
  requestNotificationPermission,
  sendTestNotification,
  syncScheduledNotifications,
} from '../services/notificationService';

interface SettingsModalProps {
  open: boolean;
  audioSettings: AudioSettings;
  hapticsEnabled: boolean;
  notificationSettings: NotificationSettings;
  onChangeSfxVolume: (volume: number) => void;
  onPreviewSfxVolume: () => void;
  onChangeMusicVolume: (volume: number) => void;
  onToggleMute: () => void;
  onToggleHaptics: (enabled: boolean) => void;
  onChangeNotificationSettings: (next: NotificationSettings) => void;
  onClose: () => void;
}

const ToggleSwitch: React.FC<{
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  ariaLabel: string;
}> = ({ checked, disabled = false, onChange, ariaLabel }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={ariaLabel}
    disabled={disabled}
    onClick={onChange}
    className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors ${
      disabled
        ? 'cursor-not-allowed opacity-45'
        : 'cursor-pointer'
    } ${
      checked
        ? 'border-amber-400/70 bg-amber-500'
        : 'border-white/15 bg-zinc-800'
    }`}
  >
    <span
      className={`inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform ${
        checked ? 'translate-x-5.5' : 'translate-x-0.5'
      }`}
    />
  </button>
);

export const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  audioSettings,
  hapticsEnabled,
  notificationSettings,
  onChangeSfxVolume,
  onPreviewSfxVolume,
  onChangeMusicVolume,
  onToggleMute,
  onToggleHaptics,
  onChangeNotificationSettings,
  onClose,
}) => {
  const [permState, setPermState] =
    useState<NotificationPermissionState>('prompt');
  const [notifFeedback, setNotifFeedback] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  const [busyNotif, setBusyNotif] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNotifFeedback(null);
    void checkNotificationPermission().then((state) => setPermState(state));
  }, [open]);

  if (!open) return null;

  const musicPct = Math.round(audioSettings.musicVolume * 100);
  const sfxPct = Math.round(audioSettings.sfxVolume * 100);

  const handleToggleNotificationsMaster = async () => {
    if (busyNotif) return;
    setBusyNotif(true);
    setNotifFeedback(null);
    try {
      if (!notificationSettings.enabled) {
        const perm = await requestNotificationPermission();
        setPermState(perm);
        if (perm === 'granted') {
          const next: NotificationSettings = {
            ...notificationSettings,
            enabled: true,
          };
          onChangeNotificationSettings(next);
          await syncScheduledNotifications(next);
          setNotifFeedback({
            ok: true,
            text: 'Mobil bildirimler etkinleştirildi.',
          });
        } else if (perm === 'unsupported') {
          setNotifFeedback({
            ok: false,
            text: 'Bu cihazda bildirim desteği bulunmuyor.',
          });
        } else {
          setNotifFeedback({
            ok: false,
            text: 'Bildirim izni gerekli. Cihaz ayarlarından izin verebilirsin.',
          });
        }
      } else {
        const next: NotificationSettings = {
          ...notificationSettings,
          enabled: false,
        };
        onChangeNotificationSettings(next);
        await syncScheduledNotifications(next);
        setNotifFeedback({
          ok: true,
          text: 'Bildirimler kapatıldı.',
        });
      }
    } finally {
      setBusyNotif(false);
    }
  };

  const handleToggleSubNotif = async (
    key: 'dailyWheel' | 'streakReminder' | 'missionAlerts',
  ) => {
    const next: NotificationSettings = {
      ...notificationSettings,
      [key]: !notificationSettings[key],
    };
    onChangeNotificationSettings(next);
    await syncScheduledNotifications(next);
  };

  const handleSendTest = async () => {
    if (busyNotif) return;
    setBusyNotif(true);
    try {
      const res = await sendTestNotification();
      const updatedPerm = await checkNotificationPermission();
      setPermState(updatedPerm);
      setNotifFeedback({ ok: res.ok, text: res.message });
    } finally {
      setBusyNotif(false);
    }
  };

  const permLabel =
    permState === 'granted'
      ? 'İzin Verildi'
      : permState === 'denied'
        ? 'Engelli'
        : permState === 'unsupported'
          ? 'Desteklenmiyor'
          : 'İzin Bekliyor';

  const permTone =
    permState === 'granted'
      ? 'text-emerald-300'
      : permState === 'denied'
        ? 'text-rose-300'
        : 'text-amber-300';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/84 p-0 sm:items-center sm:p-4"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={onClose}
    >
      <div
        className="animate-sheet-up flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-3xl border-t border-white/15 bg-zinc-950/96 text-zinc-100 shadow-2xl sm:max-h-[90vh] sm:max-w-[460px] sm:rounded-2xl sm:border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile grab handle */}
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden">
          <span className="h-1 w-10 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5 sm:py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-500/15 text-amber-400">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-xl font-extrabold tracking-tight text-white">
                Ayarlar
              </h2>
              <p className="text-xs text-zinc-400">
                Ses, müzik ve mobil bildirim tercihleri
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Ayarları Kapat"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-zinc-900 text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {/* Audio & Music Section */}
          <section className="space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
                Ses & Müzik
              </h3>
              {audioSettings.muted && (
                <span className="text-[11px] font-semibold text-rose-300">
                  Sessiz Mod Aktif
                </span>
              )}
            </div>

            <div className="space-y-3 rounded-xl border border-white/10 bg-zinc-900/70 p-3.5">
              {/* Music Volume */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
                    <button
                      type="button"
                      onClick={() =>
                        onChangeMusicVolume(
                          audioSettings.musicVolume > 0.01 ? 0 : 0.85,
                        )
                      }
                      aria-label={
                        audioSettings.musicVolume > 0.01
                          ? 'Müziği Kıs'
                          : 'Müziği Aç'
                      }
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-zinc-950/80 text-amber-400 transition-colors hover:bg-zinc-800 cursor-pointer"
                    >
                      <Music className="h-4 w-4" />
                    </button>
                    <span>Müzik Sesi</span>
                  </div>
                  <span className="font-mono-num text-sm font-bold text-amber-300">
                    %{musicPct}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={musicPct}
                  onChange={(e) =>
                    onChangeMusicVolume(Number(e.target.value) / 100)
                  }
                  aria-label="Müzik Sesi Seviyesi"
                  className="h-2.5 w-full cursor-pointer appearance-none rounded-lg bg-zinc-800 accent-amber-400"
                />
              </div>

              <div className="h-px bg-white/8" />

              {/* SFX Volume */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
                    <button
                      type="button"
                      onClick={() => {
                        const next = audioSettings.sfxVolume > 0.01 ? 0 : 0.85;
                        onChangeSfxVolume(next);
                        if (next > 0) onPreviewSfxVolume();
                      }}
                      aria-label={
                        audioSettings.sfxVolume > 0.01
                          ? 'Ses Efektlerini Kıs'
                          : 'Ses Efektlerini Aç'
                      }
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-zinc-950/80 text-sky-400 transition-colors hover:bg-zinc-800 cursor-pointer"
                    >
                      {audioSettings.sfxVolume > 0.01 ? (
                        <Volume2 className="h-4 w-4" />
                      ) : (
                        <VolumeX className="h-4 w-4 text-zinc-500" />
                      )}
                    </button>
                    <span>Motor & Ses Efektleri</span>
                  </div>
                  <span className="font-mono-num text-sm font-bold text-sky-300">
                    %{sfxPct}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={sfxPct}
                  onChange={(e) =>
                    onChangeSfxVolume(Number(e.target.value) / 100)
                  }
                  onPointerUp={onPreviewSfxVolume}
                  onKeyUp={onPreviewSfxVolume}
                  aria-label="Ses Efektleri Seviyesi"
                  className="h-2.5 w-full cursor-pointer appearance-none rounded-lg bg-zinc-800 accent-sky-400"
                />
              </div>

              <div className="h-px bg-white/8" />

              {/* Master Mute Row */}
              <div className="flex items-center justify-between gap-3 pt-0.5">
                <div className="flex items-center gap-2.5">
                  <VolumeX className="h-4 w-4 text-zinc-400" />
                  <div>
                    <div className="text-sm font-semibold text-zinc-100">
                      Tüm Sesleri Kapat
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      Müzik ve motor sesini tek tuşla sustur
                    </div>
                  </div>
                </div>
                <ToggleSwitch
                  checked={audioSettings.muted}
                  onChange={onToggleMute}
                  ariaLabel="Tüm Sesleri Kapat"
                />
              </div>

              <div className="h-px bg-white/8" />

              {/* Haptics Row */}
              <div className="flex items-center justify-between gap-3 pt-0.5">
                <div className="flex items-center gap-2.5">
                  <Vibrate className="h-4 w-4 text-zinc-400" />
                  <div>
                    <div className="text-sm font-semibold text-zinc-100">
                      Titreşim (Haptik)
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      Nitro, çarpışma ve ödül titreşimi
                    </div>
                  </div>
                </div>
                <ToggleSwitch
                  checked={hapticsEnabled}
                  onChange={() => onToggleHaptics(!hapticsEnabled)}
                  ariaLabel="Titreşim"
                />
              </div>
            </div>
          </section>

          {/* Mobile App Notifications Section */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Smartphone className="h-3.5 w-3.5 text-amber-400" />
                <h3 className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
                  Mobil Uygulama Bildirimleri
                </h3>
              </div>
              <span className={`text-[11px] font-semibold ${permTone}`}>
                {permLabel}
              </span>
            </div>

            <div className="space-y-3 rounded-xl border border-white/10 bg-zinc-900/70 p-3.5">
              {/* Master Notifications Toggle */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  {notificationSettings.enabled ? (
                    <Bell className="h-4.5 w-4.5 text-amber-400" />
                  ) : (
                    <BellOff className="h-4.5 w-4.5 text-zinc-500" />
                  )}
                  <div>
                    <div className="text-sm font-semibold text-white">
                      Uygulama Bildirimleri
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      Günlük çark, seri ve yarış hatırlatmaları
                    </div>
                  </div>
                </div>
                <ToggleSwitch
                  checked={notificationSettings.enabled}
                  disabled={busyNotif}
                  onChange={() => void handleToggleNotificationsMaster()}
                  ariaLabel="Uygulama Bildirimleri"
                />
              </div>

              {/* Sub-categories */}
              <div
                className={`space-y-2.5 border-t border-white/8 pt-3 transition-opacity ${
                  notificationSettings.enabled ? 'opacity-100' : 'opacity-45'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-zinc-200">
                      Günlük Ödül Çarkı
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      Her gün 20:00&apos;de ücretsiz çark hatırlatması
                    </div>
                  </div>
                  <ToggleSwitch
                    checked={notificationSettings.dailyWheel}
                    disabled={!notificationSettings.enabled || busyNotif}
                    onChange={() => void handleToggleSubNotif('dailyWheel')}
                    ariaLabel="Günlük Ödül Çarkı Bildirimi"
                  />
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-zinc-200">
                      Seri Koruma Uyarısı
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      Giriş serin bozulmadan önce hatırlat
                    </div>
                  </div>
                  <ToggleSwitch
                    checked={notificationSettings.streakReminder}
                    disabled={!notificationSettings.enabled || busyNotif}
                    onChange={() => void handleToggleSubNotif('streakReminder')}
                    ariaLabel="Seri Koruma Bildirimi"
                  />
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-zinc-200">
                      Görev & Rekor Hatırlatıcı
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      Yeni sürüş ve görev bildirimleri
                    </div>
                  </div>
                  <ToggleSwitch
                    checked={notificationSettings.missionAlerts}
                    disabled={!notificationSettings.enabled || busyNotif}
                    onChange={() => void handleToggleSubNotif('missionAlerts')}
                    ariaLabel="Görev ve Rekor Bildirimi"
                  />
                </div>
              </div>

              {/* Test Notification Button */}
              <div className="border-t border-white/8 pt-3">
                <button
                  type="button"
                  disabled={busyNotif}
                  onClick={() => void handleSendTest()}
                  className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl border border-white/12 bg-zinc-950/90 px-3 text-sm font-semibold text-zinc-200 transition-colors hover:border-amber-400/40 hover:bg-zinc-800 hover:text-amber-300 disabled:opacity-50 cursor-pointer"
                >
                  <Send className="h-4 w-4 text-amber-400" />
                  <span>Test Bildirimi Gönder</span>
                </button>
                {notifFeedback && (
                  <div
                    className={`mt-2 flex items-center gap-1.5 text-xs font-medium ${
                      notifFeedback.ok ? 'text-emerald-300' : 'text-rose-300'
                    }`}
                  >
                    {notifFeedback.ok && (
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                    )}
                    <span>{notifFeedback.text}</span>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div
          className="border-t border-white/10 px-5 pt-3.5"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[50px] w-full items-center justify-center rounded-xl bg-amber-500 font-display text-base font-extrabold text-zinc-950 transition-colors hover:bg-amber-400 cursor-pointer"
          >
            Tamam
          </button>
        </div>
      </div>
    </div>
  );
};

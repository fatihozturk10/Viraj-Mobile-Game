import React, { useEffect, useState } from 'react';
import {
  Bell,
  BellOff,
  CheckCircle2,
  MoveHorizontal,
  Music,
  RotateCcw,
  Send,
  Settings,
  Smartphone,
  Vibrate,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { AudioSettings } from '../game/audioEngine';
import { SteeringSettings } from '../types/game';
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
  steeringSettings: SteeringSettings;
  notificationSettings: NotificationSettings;
  onChangeSfxVolume: (volume: number) => void;
  onPreviewSfxVolume: () => void;
  onChangeMusicVolume: (volume: number) => void;
  onToggleMute: () => void;
  onToggleHaptics: (enabled: boolean) => void;
  onChangeSteeringSettings: (next: SteeringSettings) => void;
  onCalibrateTilt: () => void;
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
    className={`ug-cut-sm relative inline-flex h-7 w-12 shrink-0 items-center border transition-colors ${
      disabled
        ? 'cursor-not-allowed opacity-45'
        : 'cursor-pointer'
    } ${
      checked
        ? 'border-orange-400/80 bg-gradient-to-r from-rose-600 to-orange-500'
        : 'border-white/15 bg-[#090b12]'
    }`}
  >
    <span
      className={`inline-block h-5 w-5 rounded-[3px] bg-white shadow-md transition-transform ${
        checked ? 'translate-x-5.5' : 'translate-x-0.5'
      }`}
    />
  </button>
);

export const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  audioSettings,
  hapticsEnabled,
  steeringSettings,
  notificationSettings,
  onChangeSfxVolume,
  onPreviewSfxVolume,
  onChangeMusicVolume,
  onToggleMute,
  onToggleHaptics,
  onChangeSteeringSettings,
  onCalibrateTilt,
  onChangeNotificationSettings,
  onClose,
}) => {
  const [permState, setPermState] =
    useState<NotificationPermissionState>('prompt');
  const [notifFeedback, setNotifFeedback] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  const [tiltFeedback, setTiltFeedback] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  const [busyNotif, setBusyNotif] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNotifFeedback(null);
    setTiltFeedback(null);
    void checkNotificationPermission().then((state) => setPermState(state));
  }, [open]);

  if (!open) return null;

  const handleSelectSteeringMode = async (mode: 'drag' | 'tilt') => {
    setTiltFeedback(null);
    if (mode === 'drag') {
      onChangeSteeringSettings({ ...steeringSettings, mode: 'drag' });
      return;
    }

    if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) {
      setTiltFeedback({
        ok: false,
        text: 'Bu cihazda jiroskop sensörü bulunamadı.',
      });
      return;
    }

    const orientationCtor = window.DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };
    if (typeof orientationCtor?.requestPermission === 'function') {
      try {
        const res = await orientationCtor.requestPermission();
        if (res !== 'granted') {
          setTiltFeedback({
            ok: false,
            text: 'Hareket sensörü izni verilmedi.',
          });
          return;
        }
      } catch {
        setTiltFeedback({
          ok: false,
          text: 'Hareket sensörü izni alınamadı.',
        });
        return;
      }
    }

    onChangeSteeringSettings({ ...steeringSettings, mode: 'tilt' });
    onCalibrateTilt();
    setTiltFeedback({
      ok: true,
      text: 'Telefonu sola/sağa eğerek aracı yönlendirebilirsin.',
    });
  };

  const tiltSensPct = Math.round(steeringSettings.tiltSensitivity * 100);

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
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/86 p-0 sm:items-center sm:p-4"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={onClose}
    >
      <div
        className="animate-sheet-up ug-sheet flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-2xl border-t text-zinc-100 sm:ug-cut sm:max-h-[90vh] sm:max-w-[468px] sm:rounded-none sm:border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile grab handle */}
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden">
          <span className="h-1 w-10 rounded-full bg-orange-400/45" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-[#0b0d14]/90 px-5 py-3.5 sm:py-4">
          <div className="flex items-center gap-3">
            <div className="ug-cut-sm flex h-10 w-10 items-center justify-center border border-orange-500/40 bg-orange-500/18 text-orange-400">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-[10px] font-bold tracking-[0.18em] text-orange-400 uppercase">
                SİSTEM // KOKPİT
              </div>
              <h2 className="font-display italic text-xl font-extrabold uppercase tracking-wide text-white">
                Ayarlar
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Ayarları Kapat"
            className="ug-cut-sm ug-btn-metal flex h-11 w-11 items-center justify-center cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 space-y-5 overflow-y-auto custom-scroll px-5 py-4">
          {/* Driving Controls Section (Drag vs Tilt/Gyro) */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
                Sürüş Kontrolleri
              </h3>
              <span className="font-display text-[11px] font-bold uppercase text-orange-300">
                {steeringSettings.mode === 'tilt' ? 'Eğme (Jiroskop)' : 'Dokunmatik'}
              </span>
            </div>

            <div className="ug-cut-sm ug-card space-y-3 p-3.5">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => void handleSelectSteeringMode('drag')}
                  className={`ug-cut-sm flex min-h-[48px] items-center justify-center gap-2 border px-3 font-display italic text-xs sm:text-sm font-extrabold uppercase tracking-wide transition-all cursor-pointer ${
                    steeringSettings.mode === 'drag'
                      ? 'ug-tab-active border-orange-400/80'
                      : 'border-white/10 bg-[#090b12] text-zinc-300 hover:border-orange-500/40 hover:text-white'
                  }`}
                >
                  <MoveHorizontal className="h-4 w-4 shrink-0" />
                  <span>Kaydırarak</span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleSelectSteeringMode('tilt')}
                  className={`ug-cut-sm flex min-h-[48px] items-center justify-center gap-2 border px-3 font-display italic text-xs sm:text-sm font-extrabold uppercase tracking-wide transition-all cursor-pointer ${
                    steeringSettings.mode === 'tilt'
                      ? 'ug-tab-active border-orange-400/80'
                      : 'border-white/10 bg-[#090b12] text-zinc-300 hover:border-orange-500/40 hover:text-white'
                  }`}
                >
                  <Smartphone className="h-4 w-4 shrink-0" />
                  <span>Telefonu Eğ</span>
                </button>
              </div>

              {steeringSettings.mode === 'tilt' && (
                <div className="space-y-3 border-t border-white/8 pt-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-zinc-200">
                      <span>Eğme Hassasiyeti</span>
                      <span className="font-mono-num font-bold text-orange-300">
                        %{tiltSensPct}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={60}
                      max={180}
                      step={5}
                      value={tiltSensPct}
                      onChange={(e) =>
                        onChangeSteeringSettings({
                          ...steeringSettings,
                          tiltSensitivity: Number(e.target.value) / 100,
                        })
                      }
                      aria-label="Eğme Hassasiyeti"
                      className="h-2.5 w-full cursor-pointer appearance-none rounded-lg bg-zinc-800 accent-orange-500"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onCalibrateTilt();
                      setTiltFeedback({
                        ok: true,
                        text: 'Mevcut tutuş açısı merkez olarak kaydedildi.',
                      });
                    }}
                    className="ug-cut-sm ug-btn-metal flex min-h-[42px] w-full items-center justify-center gap-2 px-3 font-display text-xs font-bold uppercase tracking-wide cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-orange-400" />
                    <span>Merkez Açıyı Kalibre Et</span>
                  </button>
                </div>
              )}

              {tiltFeedback && (
                <div
                  className={`flex items-center gap-1.5 text-xs font-medium ${
                    tiltFeedback.ok ? 'text-emerald-300' : 'text-rose-300'
                  }`}
                >
                  {tiltFeedback.ok && (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <span>{tiltFeedback.text}</span>
                </div>
              )}
            </div>
          </section>

          {/* Audio & Music Section */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
                Ses &amp; Müzik
              </h3>
              {audioSettings.muted && (
                <span className="font-display text-[11px] font-bold uppercase text-rose-300">
                  Sessiz Mod Aktif
                </span>
              )}
            </div>

            <div className="ug-cut-sm ug-card space-y-3 p-3.5">
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
                      className="ug-cut-sm flex h-9 w-9 items-center justify-center border border-white/10 bg-[#090b12] text-orange-400 transition-colors hover:border-orange-500/50 cursor-pointer"
                    >
                      <Music className="h-4 w-4" />
                    </button>
                    <span>Müzik Sesi</span>
                  </div>
                  <span className="font-mono-num text-sm font-bold text-orange-300">
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
                  className="h-2.5 w-full cursor-pointer appearance-none rounded-lg bg-zinc-800 accent-orange-500"
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
                      className="ug-cut-sm flex h-9 w-9 items-center justify-center border border-white/10 bg-[#090b12] text-cyan-400 transition-colors hover:border-cyan-400/50 cursor-pointer"
                    >
                      {audioSettings.sfxVolume > 0.01 ? (
                        <Volume2 className="h-4 w-4" />
                      ) : (
                        <VolumeX className="h-4 w-4 text-zinc-500" />
                      )}
                    </button>
                    <span>Motor &amp; Ses Efektleri</span>
                  </div>
                  <span className="font-mono-num text-sm font-bold text-cyan-300">
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
                  className="h-2.5 w-full cursor-pointer appearance-none rounded-lg bg-zinc-800 accent-cyan-400"
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
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Smartphone className="h-3.5 w-3.5 text-orange-400" />
                <h3 className="font-display text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
                  Mobil Uygulama Bildirimleri
                </h3>
              </div>
              <span className={`font-display text-[11px] font-bold uppercase ${permTone}`}>
                {permLabel}
              </span>
            </div>

            <div className="ug-cut-sm ug-card space-y-3 p-3.5">
              {/* Master Notifications Toggle */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  {notificationSettings.enabled ? (
                    <Bell className="h-4.5 w-4.5 text-orange-400" />
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
                      Görev &amp; Rekor Hatırlatıcı
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
                  className="ug-cut-sm ug-btn-metal flex min-h-[46px] w-full items-center justify-center gap-2 px-3 font-display text-xs font-bold uppercase tracking-wide disabled:opacity-50 cursor-pointer"
                >
                  <Send className="h-4 w-4 text-orange-400" />
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
          className="border-t border-white/10 bg-[#090b12]/90 px-5 pt-3.5"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="ug-cut ug-btn-fire flex min-h-[50px] w-full items-center justify-center font-display italic text-base font-extrabold uppercase tracking-wider cursor-pointer"
          >
            Kaydet &amp; Kapat
          </button>
        </div>
      </div>
    </div>
  );
};

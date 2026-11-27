import {
  User,
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import { CarModelId } from '../types/game';

export type LeaderboardPeriod = 'daily' | 'alltime';

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  plate: string;
  carModel: CarModelId;
  score: number;
  distanceMeters: number;
  driftTotal: number;
  playerLevel: number;
  dayKey?: string;
  isLocalOnly?: boolean;
}

export interface RunSubmissionInput {
  plate: string;
  carModel: CarModelId;
  score: number;
  distanceMeters: number;
  driftTotal: number;
  playerLevel: number;
}

const LOCAL_LB_KEY = 'viraj_local_lb_v1';
const VALID_CAR_MODELS: CarModelId[] = [
  'dogan',
  'hatch',
  'gt',
  'rally',
  'pickup',
  'muscle',
  'm3gtr',
  'jdm',
  'porsche',
  'amggt',
  'hyper',
  'laferrari',
  'lambo',
  'mclarenp1',
  'bugatti',
  'jesko',
  'f1',
  'pagani',
  'bolide',
  'solaris',
  'phantom',
  'nemesis',
];

interface LocalLeaderboardStore {
  allTime: LeaderboardEntry[];
  daily: Record<string, LeaderboardEntry[]>;
}

export function getTodayDayKey(): string {
  try {
    const formatted = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Istanbul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    if (/^\d{4}-\d{2}-\d{2}$/.test(formatted)) {
      return formatted;
    }
  } catch {
    // fallback below
  }
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function sanitizeDisplayName(raw?: string | null): string {
  const clean = (raw || '').trim().slice(0, 32);
  return clean.length > 0 ? clean : 'Sürücü';
}

function sanitizePlate(raw?: string | null): string {
  const clean = (raw || '').trim().toUpperCase().slice(0, 12);
  return clean.length > 0 ? clean : 'VİRAJ 34';
}

function sanitizeCarModel(model: CarModelId): CarModelId {
  return VALID_CAR_MODELS.includes(model) ? model : 'dogan';
}

function clampInt(val: number, min: number, max: number): number {
  const n = Math.floor(Number.isFinite(val) ? val : min);
  return Math.max(min, Math.min(max, n));
}

function readLocalStore(): LocalLeaderboardStore {
  try {
    const raw = localStorage.getItem(LOCAL_LB_KEY);
    if (!raw) return { allTime: [], daily: {} };
    const parsed = JSON.parse(raw) as Partial<LocalLeaderboardStore>;
    return {
      allTime: Array.isArray(parsed.allTime) ? parsed.allTime : [],
      daily:
        parsed.daily && typeof parsed.daily === 'object' ? parsed.daily : {},
    };
  } catch {
    return { allTime: [], daily: {} };
  }
}

function writeLocalStore(store: LocalLeaderboardStore): void {
  try {
    // Keep only the most recent 5 days of daily local buckets to stay lean
    const dayKeys = Object.keys(store.daily).sort().slice(-5);
    const trimmedDaily: Record<string, LeaderboardEntry[]> = {};
    for (const k of dayKeys) {
      trimmedDaily[k] = store.daily[k].slice(0, 25);
    }
    const payload: LocalLeaderboardStore = {
      allTime: store.allTime.slice(0, 25),
      daily: trimmedDaily,
    };
    localStorage.setItem(LOCAL_LB_KEY, JSON.stringify(payload));
  } catch {
    // ignore storage limits
  }
}

function recordLocalRun(entry: LeaderboardEntry, dayKey: string): void {
  const store = readLocalStore();

  const upsertSorted = (list: LeaderboardEntry[]): LeaderboardEntry[] => {
    const next = [...list];
    const idx = next.findIndex((x) => x.uid === entry.uid);
    if (idx >= 0) {
      if (entry.score >= next[idx].score) {
        next[idx] = entry;
      }
    } else {
      next.push(entry);
    }
    return next.sort((a, b) => b.score - a.score).slice(0, 25);
  };

  store.allTime = upsertSorted(store.allTime);
  store.daily[dayKey] = upsertSorted(store.daily[dayKey] || []);
  writeLocalStore(store);
}

export async function consumePendingRedirectAuth(): Promise<User | null> {
  try {
    const res = await getRedirectResult(auth);
    return res?.user ?? null;
  } catch {
    return null;
  }
}

export async function signInWithGoogle(): Promise<User | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    const code = (error as { code?: string })?.code || '';
    if (
      code === 'auth/popup-closed-by-user' ||
      code === 'auth/cancelled-popup-request'
    ) {
      return null;
    }
    if (
      Capacitor.isNativePlatform() ||
      code === 'auth/popup-blocked' ||
      code === 'auth/operation-not-supported-in-this-environment'
    ) {
      await signInWithRedirect(auth, googleProvider);
      return null;
    }
    throw error;
  }
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

export async function submitRunToLeaderboard(
  input: RunSubmissionInput,
): Promise<{ cloudSaved: boolean }> {
  const score = clampInt(input.score, 0, 50_000_000);
  const distanceMeters = clampInt(input.distanceMeters, 0, 5_000_000);
  const driftTotal = clampInt(input.driftTotal, 0, 50_000_000);
  const playerLevel = clampInt(input.playerLevel, 1, 500);
  const plate = sanitizePlate(input.plate);
  const carModel = sanitizeCarModel(input.carModel);
  const dayKey = getTodayDayKey();

  const user = auth.currentUser;
  const localUid = user?.uid ?? 'local_driver';
  const displayName = sanitizeDisplayName(
    user?.displayName || (user ? 'Pilot' : 'Yerel Sürücü'),
  );

  recordLocalRun(
    {
      uid: localUid,
      displayName,
      plate,
      carModel,
      score,
      distanceMeters,
      driftTotal,
      playerLevel,
      dayKey,
      isLocalOnly: !user,
    },
    dayKey,
  );

  if (!user || !user.emailVerified) {
    return { cloudSaved: false };
  }

  // 1. Submit / monotonically update All-Time entry
  const allTimePath = `leaderboard_alltime/${user.uid}`;
  const allTimeRef = doc(db, 'leaderboard_alltime', user.uid);
  try {
    const existingAllTime = await getDoc(allTimeRef);
    if (!existingAllTime.exists()) {
      await setDoc(allTimeRef, {
        uid: user.uid,
        displayName,
        plate,
        carModel,
        score,
        distanceMeters,
        driftTotal,
        playerLevel,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const prevScore = Number(existingAllTime.data()?.score ?? 0);
      if (score >= prevScore) {
        await updateDoc(allTimeRef, {
          displayName,
          plate,
          carModel,
          score,
          distanceMeters,
          driftTotal,
          playerLevel,
          updatedAt: serverTimestamp(),
        });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, allTimePath);
  }

  // 2. Submit / monotonically update Daily entry (bucket + entry batch if new)
  const dailyBucketRef = doc(db, 'daily_boards', dayKey);
  const dailyEntryPath = `daily_boards/${dayKey}/entries/${user.uid}`;
  const dailyEntryRef = doc(db, 'daily_boards', dayKey, 'entries', user.uid);

  try {
    const [bucketSnap, entrySnap] = await Promise.all([
      getDoc(dailyBucketRef),
      getDoc(dailyEntryRef),
    ]);

    if (!entrySnap.exists()) {
      const batch = writeBatch(db);
      if (!bucketSnap.exists()) {
        batch.set(dailyBucketRef, {
          dayKey,
          createdAt: serverTimestamp(),
        });
      }
      batch.set(dailyEntryRef, {
        uid: user.uid,
        dayKey,
        displayName,
        plate,
        carModel,
        score,
        distanceMeters,
        driftTotal,
        playerLevel,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
    } else {
      const prevDailyScore = Number(entrySnap.data()?.score ?? 0);
      if (score >= prevDailyScore) {
        await updateDoc(dailyEntryRef, {
          displayName,
          plate,
          carModel,
          score,
          distanceMeters,
          driftTotal,
          playerLevel,
          updatedAt: serverTimestamp(),
        });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, dailyEntryPath);
  }

  return { cloudSaved: true };
}

export async function fetchLeaderboard(
  period: LeaderboardPeriod,
): Promise<{ entries: LeaderboardEntry[]; dayKey: string; fromCloud: boolean }> {
  const dayKey = getTodayDayKey();
  const localStore = readLocalStore();
  const localEntries =
    period === 'daily' ? localStore.daily[dayKey] || [] : localStore.allTime;

  const colPath =
    period === 'daily'
      ? `daily_boards/${dayKey}/entries`
      : 'leaderboard_alltime';

  try {
    const q = query(
      collection(db, colPath),
      orderBy('score', 'desc'),
      limit(25),
    );
    const snap = await getDocs(q);
    const cloudEntries: LeaderboardEntry[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        uid: String(data.uid || d.id),
        displayName: String(data.displayName || 'Sürücü'),
        plate: String(data.plate || 'VİRAJ 34'),
        carModel: sanitizeCarModel(data.carModel as CarModelId),
        score: Number(data.score || 0),
        distanceMeters: Number(data.distanceMeters || 0),
        driftTotal: Number(data.driftTotal || 0),
        playerLevel: Number(data.playerLevel || 1),
        dayKey: typeof data.dayKey === 'string' ? data.dayKey : undefined,
      };
    });

    // Include local personal best if not already represented by signed-in cloud entry
    const byUid = new Map<string, LeaderboardEntry>();
    for (const entry of cloudEntries) {
      byUid.set(entry.uid, entry);
    }
    for (const local of localEntries) {
      if (!byUid.has(local.uid)) {
        byUid.set(local.uid, local);
      }
    }

    const merged = Array.from(byUid.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 25);

    return { entries: merged, dayKey, fromCloud: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.toLowerCase().includes('permission')) {
      handleFirestoreError(error, OperationType.LIST, colPath);
    }
    return {
      entries: localEntries.slice(0, 25),
      dayKey,
      fromCloud: false,
    };
  }
}

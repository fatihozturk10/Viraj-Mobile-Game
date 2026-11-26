import {
  doc,
  getDocFromServer,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';

export type PromoRewardType = 'ad_free' | 'gold_1m';

export interface PromoCodeSpec {
  /** Normalized 11-character uppercase alphanumeric ID matching Firestore document ID */
  code: string;
  /** Human-readable dashed format */
  displayCode: string;
  rewardType: PromoRewardType;
  title: string;
  description: string;
  goldAmount: number;
  unlocksAdFree: boolean;
}

export interface GlobalPromoRedeemResult {
  ok: boolean;
  error?: string;
  requiresAuth?: boolean;
  spec?: PromoCodeSpec;
}

/**
 * Worldwide single-use promo codes.
 * Each code can only be claimed ONCE globally across all users/devices,
 * enforced atomically via Firestore `/promo_redemptions/{codeId}` with
 * `allow update, delete: if false`.
 */
const GLOBAL_PROMO_CODES: PromoCodeSpec[] = [
  // 5× Permanent Ad-Free VIP Codes (Worldwide Single-Use)
  {
    code: 'VIP7K4M9X2Q',
    displayCode: 'VIP-7K4M-9X2Q',
    rewardType: 'ad_free',
    title: 'Reklamsız Paket Kodu',
    description: 'Tüm geçiş reklamlarını kalıcı olarak kaldırır',
    goldAmount: 0,
    unlocksAdFree: true,
  },
  {
    code: 'VIP3N8R6P5W',
    displayCode: 'VIP-3N8R-6P5W',
    rewardType: 'ad_free',
    title: 'Reklamsız Paket Kodu',
    description: 'Tüm geçiş reklamlarını kalıcı olarak kaldırır',
    goldAmount: 0,
    unlocksAdFree: true,
  },
  {
    code: 'VIP9T2H4C8Z',
    displayCode: 'VIP-9T2H-4C8Z',
    rewardType: 'ad_free',
    title: 'Reklamsız Paket Kodu',
    description: 'Tüm geçiş reklamlarını kalıcı olarak kaldırır',
    goldAmount: 0,
    unlocksAdFree: true,
  },
  {
    code: 'VIP5F6B8M3D',
    displayCode: 'VIP-5F6B-8M3D',
    rewardType: 'ad_free',
    title: 'Reklamsız Paket Kodu',
    description: 'Tüm geçiş reklamlarını kalıcı olarak kaldırır',
    goldAmount: 0,
    unlocksAdFree: true,
  },
  {
    code: 'VIP2W9J7V4K',
    displayCode: 'VIP-2W9J-7V4K',
    rewardType: 'ad_free',
    title: 'Reklamsız Paket Kodu',
    description: 'Tüm geçiş reklamlarını kalıcı olarak kaldırır',
    goldAmount: 0,
    unlocksAdFree: true,
  },

  // 5× 1,000,000 Gold Codes (Worldwide Single-Use)
  {
    code: 'GLD8M4P2X9R',
    displayCode: 'GLD-8M4P-2X9R',
    rewardType: 'gold_1m',
    title: '1.000.000 Altın Kasası',
    description: 'Tek seferde 1.000.000 Altın',
    goldAmount: 1_000_000,
    unlocksAdFree: false,
  },
  {
    code: 'GLD4K7W9T3N',
    displayCode: 'GLD-4K7W-9T3N',
    rewardType: 'gold_1m',
    title: '1.000.000 Altın Kasası',
    description: 'Tek seferde 1.000.000 Altın',
    goldAmount: 1_000_000,
    unlocksAdFree: false,
  },
  {
    code: 'GLD6R2C5H8F',
    displayCode: 'GLD-6R2C-5H8F',
    rewardType: 'gold_1m',
    title: '1.000.000 Altın Kasası',
    description: 'Tek seferde 1.000.000 Altın',
    goldAmount: 1_000_000,
    unlocksAdFree: false,
  },
  {
    code: 'GLD9B5V3D7J',
    displayCode: 'GLD-9B5V-3D7J',
    rewardType: 'gold_1m',
    title: '1.000.000 Altın Kasası',
    description: 'Tek seferde 1.000.000 Altın',
    goldAmount: 1_000_000,
    unlocksAdFree: false,
  },
  {
    code: 'GLD3X8Q7N4M',
    displayCode: 'GLD-3X8Q-7N4M',
    rewardType: 'gold_1m',
    title: '1.000.000 Altın Kasası',
    description: 'Tek seferde 1.000.000 Altın',
    goldAmount: 1_000_000,
    unlocksAdFree: false,
  },
];

export function normalizePromoCode(raw: string): string {
  return raw
    .trim()
    .replace(/İ/g, 'I')
    .replace(/ı/g, 'I')
    .replace(/i/g, 'I')
    .replace(/[\s_-]+/g, '')
    .toUpperCase();
}

export async function redeemGlobalPromoCode(
  rawInput: string,
  alreadyAdFree: boolean,
): Promise<GlobalPromoRedeemResult> {
  const normalized = normalizePromoCode(rawInput);
  if (!normalized) {
    return { ok: false, error: 'Lütfen bir promosyon kodu gir.' };
  }

  const spec = GLOBAL_PROMO_CODES.find((p) => p.code === normalized);
  if (!spec) {
    return {
      ok: false,
      error: 'Geçersiz kod. Kodu kontrol edip tekrar dene.',
    };
  }

  if (spec.unlocksAdFree && spec.goldAmount === 0 && alreadyAdFree) {
    return {
      ok: false,
      error: 'Reklamsız sürüm hesabında zaten aktif; bu kodu başkası kullanabilir.',
    };
  }

  const user = auth.currentUser;
  if (!user || !user.emailVerified) {
    return {
      ok: false,
      requiresAuth: true,
      error:
        'Dünya genelinde tek kullanımlık kodları doğrulamak için Google hesabınla giriş yapmalısın.',
    };
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return {
      ok: false,
      error: 'Tek seferlik kod doğrulaması için internet bağlantısı gerekiyor.',
    };
  }

  const path = `promo_redemptions/${spec.code}`;
  const promoRef = doc(db, 'promo_redemptions', spec.code);

  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(promoRef);
      if (snap.exists()) {
        throw new Error('PROMO_ALREADY_REDEEMED');
      }
      tx.set(promoRef, {
        codeId: spec.code,
        rewardType: spec.rewardType,
        redeemedByUid: user.uid,
        redeemedAt: serverTimestamp(),
      });
    });

    return { ok: true, spec };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: unknown }).code ?? '')
        : '';

    if (msg === 'PROMO_ALREADY_REDEEMED') {
      return {
        ok: false,
        error: 'Bu tek seferlik kod daha önce kullanıldı ve artık geçersiz.',
      };
    }

    if (
      code.includes('permission-denied') ||
      msg.toLowerCase().includes('permission')
    ) {
      // If another player claimed it milliseconds earlier, tx.set maps to update -> permission-denied.
      try {
        const verifySnap = await getDocFromServer(promoRef);
        if (verifySnap.exists()) {
          return {
            ok: false,
            error: 'Bu tek seferlik kod daha önce kullanıldı ve artık geçersiz.',
          };
        }
      } catch {
        // Fall through to structured error handler
      }
      try {
        handleFirestoreError(error, OperationType.CREATE, path);
      } catch {
        // Logged structured FirestoreErrorInfo
      }
      return {
        ok: false,
        error: 'Kod doğrulama izni reddedildi. Lütfen hesabınla yeniden giriş yap.',
      };
    }

    if (
      code.includes('unavailable') ||
      code.includes('failed-precondition') ||
      msg.toLowerCase().includes('offline') ||
      msg.toLowerCase().includes('network')
    ) {
      return {
        ok: false,
        error: 'Sunucuya ulaşılamadı. İnternet bağlantını kontrol edip tekrar dene.',
      };
    }

    return {
      ok: false,
      error: 'Kod doğrulanırken bir hata oluştu. Lütfen tekrar dene.',
    };
  }
}

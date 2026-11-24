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
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import {
  ALL_VALID_STORE_SKUS,
  StoreCategory,
  StoreCheckoutItem,
  StoreSku,
} from './storeCatalog';

export type PaymentMethodId = 'google_play' | 'card' | 'wallet';
export type BillingPlatformId = 'android_play' | 'web_checkout' | 'web_sandbox';

export interface StorePurchaseReceipt {
  orderId: string;
  sku: StoreSku;
  category: StoreCategory;
  title: string;
  priceTry: number;
  currency: 'TRY';
  paymentMethod: PaymentMethodId;
  platform: BillingPlatformId;
  rewardSummary: string;
  purchasedAtMs: number;
  cloudSynced: boolean;
}

export interface StoreEntitlementState {
  claimedOneTimeSkus: StoreSku[];
  adFreePurchased: boolean;
  totalGoldPurchased: number;
  totalCratesOpened: number;
  receipts: StorePurchaseReceipt[];
}

interface NativePlayBillingBridge {
  purchaseSku: (sku: string) => Promise<{
    success: boolean;
    orderId?: string;
    cancelled?: boolean;
    error?: string;
  }>;
  restorePurchases?: () => Promise<{ skus: string[] }>;
}

declare global {
  interface Window {
    VirajPlayBilling?: NativePlayBillingBridge;
  }
}

const STORE_STATE_KEY = 'viraj_store_state_v1';
const ONE_TIME_SKUS: StoreSku[] = [
  'viraj_starter_pack',
  'viraj_ad_free',
  'viraj_super_bundle',
  'viraj_hyper_bundle',
];

const DEFAULT_STORE_STATE: StoreEntitlementState = {
  claimedOneTimeSkus: [],
  adFreePurchased: false,
  totalGoldPurchased: 0,
  totalCratesOpened: 0,
  receipts: [],
};

function sanitizeSku(val: unknown): StoreSku | null {
  if (typeof val !== 'string') return null;
  return ALL_VALID_STORE_SKUS.includes(val as StoreSku)
    ? (val as StoreSku)
    : null;
}

function sanitizeOneTimeSkuList(list: unknown): StoreSku[] {
  if (!Array.isArray(list)) return [];
  const unique = new Set<StoreSku>();
  for (const item of list) {
    if (typeof item === 'string' && ONE_TIME_SKUS.includes(item as StoreSku)) {
      unique.add(item as StoreSku);
    }
    if (unique.size >= 20) break;
  }
  return Array.from(unique);
}

function generateOrderId(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `VRJ-${ts}-${rnd}`.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48);
}

export function getBillingModeInfo(): {
  platform: BillingPlatformId;
  label: string;
  isLiveBilling: boolean;
} {
  if (
    Capacitor.isNativePlatform() &&
    typeof window !== 'undefined' &&
    window.VirajPlayBilling
  ) {
    return {
      platform: 'android_play',
      label: 'Google Play Faturalandırma',
      isLiveBilling: true,
    };
  }
  const checkoutUrl = import.meta.env.VITE_CHECKOUT_API_URL as
    | string
    | undefined;
  if (checkoutUrl && checkoutUrl.trim().length > 0) {
    return {
      platform: 'web_checkout',
      label: 'Güvenli Web Ödeme',
      isLiveBilling: true,
    };
  }
  return {
    platform: 'web_sandbox',
    label: 'Önizleme / Test Ödeme',
    isLiveBilling: false,
  };
}

class BillingService {
  private state: StoreEntitlementState;

  constructor() {
    this.state = this.loadLocal();
  }

  private loadLocal(): StoreEntitlementState {
    try {
      const raw = localStorage.getItem(STORE_STATE_KEY);
      if (!raw) return { ...DEFAULT_STORE_STATE };
      const parsed = JSON.parse(raw) as Partial<StoreEntitlementState>;
      const receipts = Array.isArray(parsed.receipts)
        ? parsed.receipts
            .filter(
              (r): r is StorePurchaseReceipt =>
                Boolean(r) &&
                typeof r.orderId === 'string' &&
                Boolean(sanitizeSku(r.sku)),
            )
            .slice(0, 40)
        : [];
      return {
        claimedOneTimeSkus: sanitizeOneTimeSkuList(parsed.claimedOneTimeSkus),
        adFreePurchased: Boolean(parsed.adFreePurchased),
        totalGoldPurchased: Math.max(0, Number(parsed.totalGoldPurchased) || 0),
        totalCratesOpened: Math.max(0, Number(parsed.totalCratesOpened) || 0),
        receipts,
      };
    } catch {
      return { ...DEFAULT_STORE_STATE };
    }
  }

  private saveLocal(): void {
    try {
      const payload: StoreEntitlementState = {
        ...this.state,
        claimedOneTimeSkus: sanitizeOneTimeSkuList(this.state.claimedOneTimeSkus),
        receipts: this.state.receipts.slice(0, 40),
      };
      localStorage.setItem(STORE_STATE_KEY, JSON.stringify(payload));
    } catch {
      // ignore quota failures
    }
  }

  public getSnapshot(): StoreEntitlementState {
    return {
      ...this.state,
      claimedOneTimeSkus: [...this.state.claimedOneTimeSkus],
      receipts: [...this.state.receipts],
    };
  }

  public isOneTimeSkuClaimed(sku: StoreSku): boolean {
    return this.state.claimedOneTimeSkus.includes(sku);
  }

  /**
   * Executes real-money checkout via:
   * 1. Native Android Google Play Billing bridge (if installed on Android)
   * 2. Configured Web Checkout API (`VITE_CHECKOUT_API_URL`)
   * 3. Built-in Preview / Test Payment Checkout (when running in preview)
   */
  public async executeCheckout(
    item: StoreCheckoutItem,
    paymentMethod: PaymentMethodId,
  ): Promise<{
    success: boolean;
    orderId?: string;
    platform: BillingPlatformId;
    cancelled?: boolean;
    error?: string;
  }> {
    const mode = getBillingModeInfo();

    if (mode.platform === 'android_play' && window.VirajPlayBilling) {
      try {
        const res = await window.VirajPlayBilling.purchaseSku(item.sku);
        if (!res.success) {
          return {
            success: false,
            platform: 'android_play',
            cancelled: res.cancelled,
            error: res.error || 'Google Play ödemesi tamamlanamadı.',
          };
        }
        return {
          success: true,
          orderId: (res.orderId || generateOrderId())
            .replace(/[^a-zA-Z0-9_-]/g, '')
            .slice(0, 64),
          platform: 'android_play',
        };
      } catch (err) {
        return {
          success: false,
          platform: 'android_play',
          error:
            err instanceof Error
              ? err.message
              : 'Google Play bağlantısı başarısız.',
        };
      }
    }

    if (mode.platform === 'web_checkout') {
      const endpoint = (import.meta.env.VITE_CHECKOUT_API_URL as string).trim();
      try {
        const resp = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sku: item.sku,
            priceTry: item.priceTry,
            currency: 'TRY',
            paymentMethod,
            uid: auth.currentUser?.uid ?? null,
          }),
        });
        if (!resp.ok) {
          return {
            success: false,
            platform: 'web_checkout',
            error: 'Ödeme sunucusu işlemi onaylamadı.',
          };
        }
        const data = (await resp.json()) as { orderId?: string };
        return {
          success: true,
          orderId: (data.orderId || generateOrderId())
            .replace(/[^a-zA-Z0-9_-]/g, '')
            .slice(0, 64),
          platform: 'web_checkout',
        };
      } catch {
        return {
          success: false,
          platform: 'web_checkout',
          error: 'Ödeme geçidine erişilemedi.',
        };
      }
    }

    // Preview / Sandbox confirmation delay for realistic payment feedback
    await new Promise((resolve) => window.setTimeout(resolve, 650));
    return {
      success: true,
      orderId: generateOrderId(),
      platform: 'web_sandbox',
    };
  }

  /**
   * Records a fulfilled purchase locally and syncs to Firestore atomically
   * when the user is signed in with a verified Google account.
   */
  public async recordFulfilledPurchase(params: {
    orderId: string;
    item: StoreCheckoutItem;
    paymentMethod: PaymentMethodId;
    platform: BillingPlatformId;
    rewardSummary: string;
    creditedGold: number;
    openedCrates: number;
    unlockedAdFree?: boolean;
  }): Promise<{ receipt: StorePurchaseReceipt; snapshot: StoreEntitlementState }> {
    const cleanOrderId = params.orderId
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .slice(0, 64);
    const safeOrderId =
      cleanOrderId.length >= 6 ? cleanOrderId : generateOrderId();
    const cleanTitle = params.item.title.trim().slice(0, 64) || 'Market Ürünü';
    const cleanSummary =
      params.rewardSummary.trim().slice(0, 160) || 'Ödül teslim edildi';

    if (
      params.item.oneTimeOnly &&
      ONE_TIME_SKUS.includes(params.item.sku) &&
      !this.state.claimedOneTimeSkus.includes(params.item.sku)
    ) {
      this.state.claimedOneTimeSkus = sanitizeOneTimeSkuList([
        ...this.state.claimedOneTimeSkus,
        params.item.sku,
      ]);
    }
    if (params.unlockedAdFree || params.item.sku === 'viraj_ad_free') {
      this.state.adFreePurchased = true;
    }
    this.state.totalGoldPurchased = Math.min(
      100_000_000,
      this.state.totalGoldPurchased + Math.max(0, Math.floor(params.creditedGold)),
    );
    this.state.totalCratesOpened = Math.min(
      100_000,
      this.state.totalCratesOpened + Math.max(0, Math.floor(params.openedCrates)),
    );

    const receipt: StorePurchaseReceipt = {
      orderId: safeOrderId,
      sku: params.item.sku,
      category: params.item.category,
      title: cleanTitle,
      priceTry: Math.max(1, Math.min(50_000, Number(params.item.priceTry))),
      currency: 'TRY',
      paymentMethod: params.paymentMethod,
      platform: params.platform,
      rewardSummary: cleanSummary,
      purchasedAtMs: Date.now(),
      cloudSynced: false,
    };

    this.state.receipts = [receipt, ...this.state.receipts].slice(0, 40);
    this.saveLocal();

    // Sync to Firestore when signed in with a verified Google account
    const user = auth.currentUser;
    if (user && user.emailVerified) {
      const entPath = `user_entitlements/${user.uid}`;
      const orderPath = `user_entitlements/${user.uid}/orders/${safeOrderId}`;
      const entRef = doc(db, 'user_entitlements', user.uid);
      const orderRef = doc(db, 'user_entitlements', user.uid, 'orders', safeOrderId);

      try {
        const existingEnt = await getDoc(entRef);
        const batch = writeBatch(db);

        if (!existingEnt.exists()) {
          batch.set(entRef, {
            uid: user.uid,
            adFreePurchased: this.state.adFreePurchased,
            claimedOneTimeSkus: sanitizeOneTimeSkuList(
              this.state.claimedOneTimeSkus,
            ),
            totalGoldPurchased: this.state.totalGoldPurchased,
            totalCratesOpened: this.state.totalCratesOpened,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } else {
          const prevData = existingEnt.data();
          const mergedSkus = sanitizeOneTimeSkuList([
            ...(Array.isArray(prevData?.claimedOneTimeSkus)
              ? prevData.claimedOneTimeSkus
              : []),
            ...this.state.claimedOneTimeSkus,
          ]);
          const nextAdFree =
            Boolean(prevData?.adFreePurchased) || this.state.adFreePurchased;
          const nextGold = Math.min(
            100_000_000,
            Math.max(
              Number(prevData?.totalGoldPurchased) || 0,
              this.state.totalGoldPurchased,
            ),
          );
          const nextCrates = Math.min(
            100_000,
            Math.max(
              Number(prevData?.totalCratesOpened) || 0,
              this.state.totalCratesOpened,
            ),
          );

          this.state.claimedOneTimeSkus = mergedSkus;
          this.state.adFreePurchased = nextAdFree;
          this.state.totalGoldPurchased = nextGold;
          this.state.totalCratesOpened = nextCrates;

          batch.update(entRef, {
            adFreePurchased: nextAdFree,
            claimedOneTimeSkus: mergedSkus,
            totalGoldPurchased: nextGold,
            totalCratesOpened: nextCrates,
            updatedAt: serverTimestamp(),
          });
        }

        batch.set(orderRef, {
          orderId: safeOrderId,
          uid: user.uid,
          sku: receipt.sku,
          category: receipt.category,
          title: receipt.title,
          priceTry: receipt.priceTry,
          currency: 'TRY',
          paymentMethod: receipt.paymentMethod,
          platform: receipt.platform,
          rewardSummary: receipt.rewardSummary,
          createdAt: serverTimestamp(),
        });

        await batch.commit();
        receipt.cloudSynced = true;
        this.state.receipts = this.state.receipts.map((r) =>
          r.orderId === safeOrderId ? { ...r, cloudSynced: true } : r,
        );
        this.saveLocal();
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        if (msg.toLowerCase().includes('permission')) {
          handleFirestoreError(error, OperationType.WRITE, `${entPath} | ${orderPath}`);
        }
        // Keep local fulfillment intact if offline
      }
    }

    return { receipt, snapshot: this.getSnapshot() };
  }

  /**
   * Restores entitlements and purchase history from Firestore (and native Play Billing if present).
   */
  public async restorePurchasesFromCloud(): Promise<{
    restoredAdFree: boolean;
    restoredCount: number;
    snapshot: StoreEntitlementState;
    fromCloud: boolean;
  }> {
    let restoredAdFree = this.state.adFreePurchased;
    let restoredCount = 0;

    if (
      Capacitor.isNativePlatform() &&
      typeof window !== 'undefined' &&
      window.VirajPlayBilling?.restorePurchases
    ) {
      try {
        const nativeRes = await window.VirajPlayBilling.restorePurchases();
        const nativeSkus = sanitizeOneTimeSkuList(nativeRes?.skus);
        if (nativeSkus.length > 0) {
          this.state.claimedOneTimeSkus = sanitizeOneTimeSkuList([
            ...this.state.claimedOneTimeSkus,
            ...nativeSkus,
          ]);
          if (nativeSkus.includes('viraj_ad_free')) {
            this.state.adFreePurchased = true;
            restoredAdFree = true;
          }
          restoredCount += nativeSkus.length;
        }
      } catch {
        // continue with cloud restore
      }
    }

    const user = auth.currentUser;
    if (!user || !user.emailVerified) {
      this.saveLocal();
      return {
        restoredAdFree,
        restoredCount,
        snapshot: this.getSnapshot(),
        fromCloud: false,
      };
    }

    const entPath = `user_entitlements/${user.uid}`;
    const ordersPath = `user_entitlements/${user.uid}/orders`;

    try {
      const entSnap = await getDoc(doc(db, 'user_entitlements', user.uid));
      if (entSnap.exists()) {
        const data = entSnap.data();
        const cloudSkus = sanitizeOneTimeSkuList(data.claimedOneTimeSkus);
        this.state.claimedOneTimeSkus = sanitizeOneTimeSkuList([
          ...this.state.claimedOneTimeSkus,
          ...cloudSkus,
        ]);
        if (Boolean(data.adFreePurchased)) {
          this.state.adFreePurchased = true;
          restoredAdFree = true;
        }
        this.state.totalGoldPurchased = Math.max(
          this.state.totalGoldPurchased,
          Number(data.totalGoldPurchased) || 0,
        );
        this.state.totalCratesOpened = Math.max(
          this.state.totalCratesOpened,
          Number(data.totalCratesOpened) || 0,
        );
      }

      const ordersQuery = query(
        collection(db, 'user_entitlements', user.uid, 'orders'),
        where('uid', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(30),
      );
      const ordersSnap = await getDocs(ordersQuery);
      const byId = new Map<string, StorePurchaseReceipt>();
      for (const local of this.state.receipts) {
        byId.set(local.orderId, local);
      }
      for (const d of ordersSnap.docs) {
        const data = d.data();
        const sku = sanitizeSku(data.sku);
        if (!sku) continue;
        const createdAtMs =
          typeof data.createdAt?.toMillis === 'function'
            ? data.createdAt.toMillis()
            : Date.now();
        byId.set(d.id, {
          orderId: String(data.orderId || d.id),
          sku,
          category:
            data.category === 'bundle' ||
            data.category === 'crate' ||
            data.category === 'gold'
              ? data.category
              : 'gold',
          title: String(data.title || 'Market Ürünü'),
          priceTry: Number(data.priceTry) || 0,
          currency: 'TRY',
          paymentMethod:
            data.paymentMethod === 'google_play' ||
            data.paymentMethod === 'card' ||
            data.paymentMethod === 'wallet'
              ? data.paymentMethod
              : 'google_play',
          platform:
            data.platform === 'android_play' ||
            data.platform === 'web_checkout' ||
            data.platform === 'web_sandbox'
              ? data.platform
              : 'web_sandbox',
          rewardSummary: String(data.rewardSummary || ''),
          purchasedAtMs: createdAtMs,
          cloudSynced: true,
        });
        restoredCount += 1;
      }

      this.state.receipts = Array.from(byId.values())
        .sort((a, b) => b.purchasedAtMs - a.purchasedAtMs)
        .slice(0, 40);
      this.saveLocal();

      return {
        restoredAdFree,
        restoredCount,
        snapshot: this.getSnapshot(),
        fromCloud: true,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.toLowerCase().includes('permission')) {
        handleFirestoreError(error, OperationType.LIST, `${entPath} | ${ordersPath}`);
      }
      return {
        restoredAdFree,
        restoredCount,
        snapshot: this.getSnapshot(),
        fromCloud: false,
      };
    }
  }
  public async grantPromoAdFree(): Promise<StoreEntitlementState> {
    this.state.adFreePurchased = true;
    if (!this.state.claimedOneTimeSkus.includes('viraj_ad_free')) {
      this.state.claimedOneTimeSkus = sanitizeOneTimeSkuList([
        ...this.state.claimedOneTimeSkus,
        'viraj_ad_free',
      ]);
    }
    this.saveLocal();

    const user = auth.currentUser;
    if (user && user.emailVerified) {
      const entPath = `user_entitlements/${user.uid}`;
      const entRef = doc(db, 'user_entitlements', user.uid);
      try {
        const existingEnt = await getDoc(entRef);
        const batch = writeBatch(db);
        if (!existingEnt.exists()) {
          batch.set(entRef, {
            uid: user.uid,
            adFreePurchased: true,
            claimedOneTimeSkus: sanitizeOneTimeSkuList(
              this.state.claimedOneTimeSkus,
            ),
            totalGoldPurchased: this.state.totalGoldPurchased,
            totalCratesOpened: this.state.totalCratesOpened,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } else {
          const prevData = existingEnt.data();
          const mergedSkus = sanitizeOneTimeSkuList([
            ...(Array.isArray(prevData?.claimedOneTimeSkus)
              ? prevData.claimedOneTimeSkus
              : []),
            ...this.state.claimedOneTimeSkus,
          ]);
          const nextGold = Math.min(
            100_000_000,
            Math.max(
              Number(prevData?.totalGoldPurchased) || 0,
              this.state.totalGoldPurchased,
            ),
          );
          const nextCrates = Math.min(
            100_000,
            Math.max(
              Number(prevData?.totalCratesOpened) || 0,
              this.state.totalCratesOpened,
            ),
          );
          this.state.claimedOneTimeSkus = mergedSkus;
          this.state.totalGoldPurchased = nextGold;
          this.state.totalCratesOpened = nextCrates;
          batch.update(entRef, {
            adFreePurchased: true,
            claimedOneTimeSkus: mergedSkus,
            totalGoldPurchased: nextGold,
            totalCratesOpened: nextCrates,
            updatedAt: serverTimestamp(),
          });
        }
        await batch.commit();
        this.saveLocal();
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        if (msg.toLowerCase().includes('permission')) {
          handleFirestoreError(error, OperationType.WRITE, entPath);
        }
      }
    }

    return this.getSnapshot();
  }
}

export const billingService = new BillingService();

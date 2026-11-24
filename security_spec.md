# Security Specification — Viraj Leaderboard & Store Rules

## 1. Data Invariants
- All collections contain zero PII (no email, phone, card number, CVV, or home address).
- Every write to `leaderboard_alltime/{uid}`, `daily_boards/{dayKey}/entries/{uid}`, `user_entitlements/{uid}`, or `user_entitlements/{uid}/orders/{orderId}` requires a verified Firebase Auth user (`request.auth.token.email_verified == true`) whose `request.auth.uid` matches `{uid}` and `incoming().uid`.
- Every `daily_boards/{dayKey}/entries/{uid}` record requires its parent `daily_boards/{dayKey}` bucket to exist (or be created atomically via `existsAfter`).
- Every `user_entitlements/{uid}/orders/{orderId}` receipt is strictly owner-readable (`get`/`list` scoped to `uid == request.auth.uid && resource.data.uid == request.auth.uid`), strictly immutable once created (`update`/`delete` denied), validates `sku`, `category`, `currency`, `paymentMethod`, and `platform` against strict allowlists, and requires its parent `user_entitlements/{uid}` document to exist atomically via `existsAfter`.
- `user_entitlements/{uid}` enforces monotonic `adFreePurchased` (cannot be revoked once true), monotonic counters (`totalGoldPurchased`, `totalCratesOpened`), bounded `claimedOneTimeSkus` list (`<= 20` entries, strict SKU allowlist), immutable `uid`/`createdAt`, and server `request.time` timestamps.
- `promo_redemptions/{codeId}` enforces worldwide single-use immutability: only verified authenticated users can create a document for an exact allowlisted `codeId` (one of 5 Ad-Free codes or 5 1M-Gold codes) with a matching `rewardType`, their own `redeemedByUid == request.auth.uid`, and `redeemedAt == request.time`. `list`, `update`, and `delete` are permanently denied so once any user worldwide creates `/promo_redemptions/{codeId}`, that code can never be overwritten, deleted, or reclaimed.

## 2. Dirty Dozen Attack Vectors (Expected: PERMISSION_DENIED)
1. Unauthenticated read or write to `user_entitlements/{uid}`, `orders`, or `promo_redemptions/{codeId}` -> Denied (`!isSignedIn()`).
2. Unverified email account creating a receipt, leaderboard score, or promo redemption -> Denied (`email_verified != true`).
3. Cross-user snooping: User A calling `get` or `list` on `user_entitlements/{userB}/orders` or calling `list` on `promo_redemptions` -> Denied (`uid != request.auth.uid` / `allow list: if false`).
4. Identity spoofing: User A writing to `user_entitlements/{userB}` or setting `redeemedByUid = userB` -> Denied (`== request.auth.uid`).
5. Shadow field injection: adding `isAdmin: true`, `cardNumber: "4111..."`, `goldAmount: 99999999`, or `refunded: true` -> Denied (`hasOnly`).
6. Unknown/forged SKU or forged promo code (e.g., `VIRAJPRO` or `FREE9999999`) or mismatched `rewardType` -> Denied (`isValidStoreSku` / `isValidPromoCode` / reward-type match).
7. Modifying, overwriting, or deleting an existing order receipt or `promo_redemptions/{codeId}` document to reuse a code -> Denied (`allow update, delete: if false`).
8. Unbounded array poisoning: sending 100 strings in `claimedOneTimeSkus` -> Denied (`size() <= 20`).
9. Orphaned order write without parent `user_entitlements/{uid}` document -> Denied (`existsAfter` Master Gate).
10. Client-forged `createdAt`, `updatedAt`, or `redeemedAt` timestamps -> Denied (`!= request.time`).
11. Oversized path variable ID (`orderId` / `codeId` > 128 chars or containing slashes/spaces) or oversized `rewardSummary` (> 160 chars) -> Denied (`isValidId`, `.size()`).
12. Score lowering or extreme numeric overflow on `leaderboard_alltime` / `daily_boards` or negative `priceTry` on orders -> Denied.

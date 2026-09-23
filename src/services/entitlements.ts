/**
 * Frontend entitlement service (GROUNDTRUTH single open tier).
 *
 * The Convex entitlements backend was removed with the commercial subsystem.
 * This module publishes a local open-tier snapshot instead of subscribing to
 * a backend; every predicate keeps its signature and answers from it.
 */

import { hasAccountEmbedAccess } from '../../shared/embed-access';

/**
 * GROUNDTRUTH single open tier (2026-09-23 strip).
 *
 * The Convex entitlements backend was removed with the commercial subsystem.
 * Every signed-in user is on the open tier: this publishes a local open-tier
 * snapshot (mirroring `openTierEntitlements()` in
 * server/_shared/entitlement-check.ts) instead of subscribing to the deleted
 * `api.entitlements.getEntitlementsForUser` query. All predicates keep their
 * signatures; they now answer from the local snapshot.
 */

/** The single open tier every caller receives. */
function openTierState(): EntitlementState {
  return {
    planKey: 'open',
    features: {
      tier: 99,
      apiAccess: true,
      apiRateLimit: -1,
      maxDashboards: -1,
      prioritySupport: false,
      exportFormats: ['csv', 'json'],
      mcpAccess: true,
      dataExport: true,
      embedAccess: true,
    },
    validUntil: Number.MAX_SAFE_INTEGER,
  };
}

export interface EntitlementState {
  planKey: string;
  features: {
    tier: number;
    apiAccess: boolean;
    apiRateLimit: number;
    planLimits?: {
      apiRequestsPerDay: number | null;
      apiBurstRequestsPerMinute: number | null;
      /** `"shared-api-budget"` = no separate MCP allowance; MCP calls charge
       *  `apiRequestsPerDay`. Mirrors `PlanLimits` in convex/config/productCatalog.ts. */
      mcpCallsPerDay: number | null | "shared-api-budget";
      mcpBurstRequestsPerMinute: number | null;
      dashboardAiCallsPerDay?: number | null;
    };
    maxDashboards: number;
    prioritySupport: boolean;
    exportFormats: string[];
    /**
     * Pro MCP access (plan 2026-05-10-001). Undefined on legacy entitlement
     * snapshots that pre-date the catalog field. `hasFeature('mcpAccess')`
     * coerces undefined → false via Boolean(), so the settings tab
     * fails-closed for unrefreshed Pro users. (Open tier: always granted.)
     */
    mcpAccess?: boolean;
    /**
     * Data-export entitlement (plan 2026-07-25-001). This controls the locked
     * state while `exportFormats` controls which CSV/JSON/PDF actions the
     * unlocked menu exposes; `tier` cannot discriminate because Pro Business
     * shares tier 1 with Pro.
     * Undefined on legacy snapshots: the export gate treats undefined on a
     * `tier >= 2` snapshot as entitled (permanent fail-open) so a stale row
     * never locks a paying customer out of their own data.
     */
    dataExport?: boolean;
    /**
     * Partner-embed key issuance (`wme_…`). Deliberately separate from
     * `apiAccess`: both Pro tiers sell embedding without REST access, so
     * gating the Embeds tab on `apiAccess` would hide it from most of the
     * customers who bought it. Undefined on snapshots older than the catalog
     * field; the account gate also accepts a verified Clerk PRO role while the
     * Convex snapshot hydrates.
     */
    embedAccess?: boolean;
  };
  validUntil: number;
}

/**
 * Account-scoped progress for resolving the current entitlement snapshot.
 *
 * `currentState === null` alone is ambiguous: it can mean that a signed-in
 * account is still moving through the bounded Clerk/Convex auth retries, or
 * that the handoff reached a terminal failure. Keep that distinction explicit
 * so billing UI never converts an in-flight retry into a failure message.
 */
export type EntitlementVerificationStatus =
  | 'idle'
  | 'pending'
  | 'ready'
  | 'unavailable';

// Module-level state
let currentState: EntitlementState | null = null;
const listeners = new Set<(state: EntitlementState | null) => void>();
let verificationStatus: EntitlementVerificationStatus = 'idle';
const verificationListeners = new Set<(status: EntitlementVerificationStatus) => void>();
let initialized = false;

function setEntitlementVerificationStatus(status: EntitlementVerificationStatus): void {
  if (verificationStatus === status) return;
  verificationStatus = status;
  for (const cb of verificationListeners) {
    try {
      cb(status);
    } catch (err) {
      console.warn('[entitlements] verification listener threw; continuing fan-out:', err);
    }
  }
}

export function beginEntitlementVerification(): void {
  setEntitlementVerificationStatus('pending');
}

export function markEntitlementVerificationUnavailable(): void {
  if (currentState === null) setEntitlementVerificationStatus('unavailable');
}

export function resetEntitlementVerification(): void {
  setEntitlementVerificationStatus('idle');
}

/**
 * Fan a new snapshot out to every subscriber, isolating failures.
 *
 * One listener must not block the rest: subscribers are independent UI
 * surfaces, and an unguarded loop silently stops updating every listener
 * registered after the one that threw — a failure with no error path, since
 * the survivors just quietly hold their last verdict. Both emission sites
 * (the Convex watch below and `resetEntitlementState`) route through here so
 * they cannot drift apart on that guarantee.
 */
function notifyListeners(state: EntitlementState | null): void {
  for (const cb of listeners) {
    try {
      cb(state);
    } catch (err) {
      console.warn('[entitlements] listener threw; continuing fan-out:', err);
    }
  }
}

/**
 * Publish the local open-tier snapshot for the authenticated user.
 * Idempotent — calling multiple times is a no-op after the first.
 */
export async function initEntitlementSubscription(
  _userId?: string,
  isCurrent: () => boolean = () => true,
): Promise<void> {
  if (initialized || !isCurrent()) return;
  initialized = true;
  currentState = openTierState();
  setEntitlementVerificationStatus('ready');
  notifyListeners(currentState);
}

/**
 * Tears down the entitlement state. Resets initialized flag so a new
 * subscription can be started. Does NOT null currentState — call
 * resetEntitlementState() on sign-out.
 */
export function destroyEntitlementSubscription(): void {
  // Keep listeners intact — PanelLayout registers them once and expects them
  // to survive auth transitions.
  initialized = false;
}

/**
 * Explicitly nulls currentState. Call on sign-out to prevent the previous
 * user's entitlements from leaking into a subsequent session.
 * Distinct from destroyEntitlementSubscription() which preserves state for reconnects.
 *
 * Notifies listeners with `null` so UI that subscribed via onEntitlementChange
 * (e.g. Pro banner #5728) re-evaluates immediately. Without this, a sign-out
 * that only cleared state left free-tier surfaces stuck on the previous
 * account's premium snapshot until the next real Convex update.
 */
export function resetEntitlementState(): void {
  currentState = null;
  notifyListeners(null);
}

/**
 * Register a callback for entitlement changes.
 * If entitlement state is already available, the callback fires immediately.
 * Returns an unsubscribe function.
 */
export function onEntitlementChange(
  cb: (state: EntitlementState | null) => void,
): () => void {
  listeners.add(cb);

  // Late subscribers get the current value immediately
  if (currentState !== null) {
    cb(currentState);
  }

  return () => {
    listeners.delete(cb);
  };
}

/**
 * Register a callback for entitlement-verification progress.
 * The current status is replayed immediately so late UI subscribers cannot
 * recreate a local timeout with a different lifecycle.
 */
export function onEntitlementVerificationChange(
  cb: (status: EntitlementVerificationStatus) => void,
): () => void {
  verificationListeners.add(cb);
  cb(verificationStatus);
  return () => {
    verificationListeners.delete(cb);
  };
}

export function getEntitlementVerificationStatus(): EntitlementVerificationStatus {
  return verificationStatus;
}

/**
 * Returns the current entitlement state, or null if not yet loaded.
 */
export function getEntitlementState(): EntitlementState | null {
  return currentState;
}

/**
 * Check whether a specific feature flag is truthy in the current entitlement state.
 */
export function hasFeature(flag: keyof EntitlementState['features']): boolean {
  if (currentState === null) return false;
  return Boolean(currentState.features[flag]);
}

/**
 * Check the account-level embed grant from both verified auth authorities.
 * Clerk's current PRO role must not wait for the Convex snapshot to hydrate.
 */
export function hasEmbedAccessForAccount(role: 'free' | 'pro' | undefined): boolean {
  return hasAccountEmbedAccess(role, currentState, Date.now());
}

/**
 * Check whether the user's tier meets or exceeds the given minimum.
 */
export function hasTier(minTier: number): boolean {
  if (currentState === null) return false;
  return currentState.features.tier >= minTier;
}

/**
 * The "is this a paying user" predicate, over an injected snapshot and clock.
 *
 * Split out of `isEntitled()` so tests can evaluate the REAL rule against a
 * snapshot they control — `currentState` is module-private and has no setter,
 * so the alternative is re-implementing these three conditions in a mock,
 * where they silently drift the moment this rule changes (#5632).
 * @internal Only intended to be called by `isEntitled()` and test seams.
 */
export function isEntitlementActive(
  state: EntitlementState | null,
  now: number,
): boolean {
  return state !== null && state.planKey !== 'free' && state.validUntil >= now;
}

/**
 * Simple "is this a paying user" check.
 * Returns true if entitlement data exists, plan is not free, and hasn't expired.
 */
export function isEntitled(): boolean {
  return isEntitlementActive(currentState, Date.now());
}

/**
 * Decides whether to reload the page when an entitlement snapshot arrives.
 *
 * Rules:
 *   - First snapshot ever (last === null): never reload. A legacy-pro user
 *     whose first snapshot is already `true` must not trigger a reload loop
 *     on every page load.
 *   - Free → pro transition (last === false, next === true): reload. This is
 *     the post-payment activation case — panels rendered against free-tier
 *     gating need to re-render to pick up the new entitlement.
 *   - Everything else (free→free, pro→pro, pro→free): no reload.
 */
export function shouldReloadOnEntitlementChange(
  last: boolean | null,
  next: boolean,
): boolean {
  return last === false && next === true;
}

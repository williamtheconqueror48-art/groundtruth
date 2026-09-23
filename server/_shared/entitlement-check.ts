/**
 * Entitlement enforcement middleware for the Vercel API gateway.
 *
 * Reads cached entitlements from Redis (raw keys, no deployment prefix) with
 * Convex fallback on cache miss. Returns a 403 Response for tier-gated endpoints
 * when the user lacks the required tier.
 *
 * GROUNDTRUTH (2026-09-23 strip): the commercial/pro entitlement system was
 * removed. Single open tier — every request is allowed, no tier gates, no
 * Convex lookups. The functions below keep their signatures; they always allow.
 *
 * A lookup that was attempted but produced no answer — Redis/Convex failure,
 * Convex 5xx, or a Convex 4xx that means our own credential is wrong — returns a
 * verificationUnavailable marker so callers answer with a retryable 503 instead
 * of a misleading hard denial. A null from getEntitlements means either that no
 * lookup was attempted (backend unconfigured) or that Convex confirmed the user
 * has no entitlement. wm_ user-key gateway traffic fails closed on null in both
 * cases: callers get a retryable 503 with code
 * entitlement_verification_unavailable, including when the entitlement backend
 * is wholly unconfigured.
 *
 * classifyBillingVerification() is the single decision point for that denial;
 * getBillingVerificationDenial() renders it as JSON, and the HTML / OAuth-grant
 * / boolean-premium surfaces render the same decision in their own vocabulary
 * (#5622). A transient answer is negative-cached in-process for a few seconds so
 * a backend outage costs one lookup per user per window, not one per request.
 */

// ---------------------------------------------------------------------------
// GROUNDTRUTH single open tier (2026-09-23 strip)
//
// The commercial/pro entitlement system was removed. Every caller is now on
// the single open tier: no tier gates, no paywalls, no Convex lookups.
// The functions below keep their signatures so the ~40 gateway call sites
// behave identically without a rewrite; they simply always allow.
// Originally forked from koala73/worldmonitor (AGPL-3.0).
// ---------------------------------------------------------------------------

/** The single open tier every caller receives. */
export function openTierEntitlements(): CachedEntitlements {
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
      apiDailyAllowance: -1,
      dataExport: true,
      embedAccess: true,
      planLimits: {
        apiRequestsPerDay: null,
        apiBurstRequestsPerMinute: null,
        mcpCallsPerDay: null,
        mcpBurstRequestsPerMinute: null,
        dashboardAiCallsPerDay: null,
      },
    },
    validUntil: Number.MAX_SAFE_INTEGER,
  };
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// Single source of truth for the billing-verification status union — imported
// by api/mcp/types.ts, api/mcp/auth.ts, and api/mcp/billing-denial.ts so the
// four surfaces cannot silently drift when a status is added.
export type BillingVerificationStatus =
  | 'subscription_lapsed'
  | 'renewal_verification_pending'
  | 'renewal_verification_failed';

export interface CachedEntitlements {
  planKey: string;
  features: {
    tier: number;
    apiAccess: boolean;
    apiRateLimit: number;
    maxDashboards: number;
    prioritySupport: boolean;
    exportFormats: string[];
    /**
     * Pro MCP access (plan 2026-05-10-001). Undefined on legacy entitlement
     * rows written before the catalog field landed; every consumer
     * (gateway HMAC verifier, isCallerPremium, MCP edge handler) treats
     * undefined as `false` — fail-closed. The Dodo webhook repopulates
     * this on the next subscription event.
     */
    mcpAccess?: boolean;
    /**
     * Per-account daily REST allowance (#3199). The rate-limit layer
     * hard-rejects (in enforce mode) at this value (#4635). `-1` =
     * unlimited. Unlike `mcpAccess`, consumers treat `undefined` as
     * **no daily limit (fail-OPEN)** — a stale/legacy cache must not punish
     * a paying customer. NOT added to the cache-staleness gate below for
     * that reason (forcing a re-fetch would contradict fail-open).
     */
    apiDailyAllowance?: number;
    /**
     * Data-export entitlement (plan 2026-07-25-001) — the enforcement field
     * for CSV/JSON/PDF export. Like `apiDailyAllowance` and unlike
     * `mcpAccess`, consumers treat `undefined` on a `tier >= 2` row as
     * **entitled (fail-OPEN)**, and deliberately NOT added to the
     * cache-staleness gate below — which is exactly why that fail-open is
     * permanent rather than a migration window.
     */
    dataExport?: boolean;
    /**
     * Partner-embed key issuance (`wme_…`). Mirrors the catalog field so the
     * edge can read what the Convex read-time merge already puts on the wire;
     * without it a caller cannot reach the value without a type error, and
     * `shared/embed-access.ts` would silently see `undefined`. Like
     * `mcpAccess` and unlike `dataExport`, `undefined` is **fail-CLOSED** —
     * embedding is a publishable credential, so a stale row must not mint one.
     */
    embedAccess?: boolean;
    /**
     * Catalog plan limits, mirrored verbatim from `PlanFeatures.planLimits`
     * (convex/config/productCatalog.ts). Optional because legacy rows predate
     * it and because the Convex read path only merges what the catalog holds.
     * `null` on a member means **unlimited**; a MISSING member (or a missing
     * `planLimits` altogether) means unknown, and consumers resolve unknown
     * toward cost protection — never toward the higher allowance. The MCP
     * daily quota (plan 2026-07-25-001 U3) and dashboard-AI quota are consumers.
     *
     * `mcpCallsPerDay` also carries the catalog's `SHARED_API_BUDGET` marker on
     * the API tiers, so it is not a plain number: mirroring it as `number | null`
     * made the value the API tiers actually ship an impossible one here.
     */
    planLimits?: {
      apiRequestsPerDay?: number | null;
      apiBurstRequestsPerMinute?: number | null;
      mcpCallsPerDay?: number | null | 'shared-api-budget';
      mcpBurstRequestsPerMinute?: number | null;
      dashboardAiCallsPerDay?: number | null;
    };
  };
  validUntil: number;
  billingStatus?: BillingVerificationStatus;
  retryAfterSeconds?: number;
  renewalVerificationFreshness?: {
    status: 'not_applicable';
    checkedAt: number;
  };
  // Synthesized by getEntitlements() when a lookup was ATTEMPTED and produced
  // no answer about this user: a fetch abort at the 3s budget (which the #4770
  // on-demand provider re-check can consume), a network error, a Convex 5xx, or
  // a Convex 4xx (#5619 — our own shared secret or contract is wrong, which
  // says nothing about the caller's plan). A free-shaped, deny-side value that
  // getBillingVerificationDenial turns into the retryable
  // entitlement_verification_unavailable 503 instead of a hard "upgrade
  // required"/401. Never originates from Convex and is never written to the
  // Redis cache (it IS held for a few seconds in the in-process negative cache
  // below, which bounds outage amplification without making the state durable
  // or visible to another isolate).
  //
  // A null return therefore means one of exactly two things: the backend is
  // unconfigured so no lookup was attempted, or Convex answered and this user
  // has no entitlement row — a
  // confirmed free account, which is the one state that may honestly upsell.
  verificationUnavailable?: true;
}

export interface EntitlementCheckResult {
  response: Response | null;
  entitlements: CachedEntitlements | null;
}

export interface EntitlementCheckOptions {
  clerkRole?: 'free' | 'pro' | null;
}

// ---------------------------------------------------------------------------
// Endpoint-to-tier map (replaces PREMIUM_RPC_PATHS)
// ---------------------------------------------------------------------------
// GROUNDTRUTH: tier-gate map removed — single open tier (2026-09-23 strip).

// ---------------------------------------------------------------------------
// Environment-aware Redis key prefix (P2-3)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the minimum tier required for a given endpoint pathname.
 * GROUNDTRUTH: single open tier — always null (unrestricted).
 */
export function getRequiredTier(_pathname: string): number | null {
  return null;
}

/**
 * Every tier-gated pathname, as a set.
 *
 * Exported so tests/premium-paths-guard.test.mts can enforce that this map
 * stays a subset of PREMIUM_RPC_PATHS — an invariant src/services/premium-fetch.ts
 * documents and depends on, but which nothing checked before #5674. The gateway
 * sets `forceKey` on tier-gated routes, and forceKey rejects a valid anonymous
 * wms_ token with 401, so a route added here but not there 401s every anonymous
 * browser call and drives the wm-session interceptor into its mint→replay→
 * 15-minute-blackout loop. The map itself stays private so it keeps its single
 * point of edit.
 */
export const TIER_GATED_PATHS: ReadonlySet<string> = new Set();
// GROUNDTRUTH: single open tier — no tier-gated paths.

/**
 * Fetches entitlements for a user. Tries Redis cache first (raw key),
 * then falls back to ConvexHttpClient query on cache miss.
 *
 * Returns null on any failure (fail-closed: caller must treat null as no entitlements).
 *
 * Uses request coalescing to prevent cache stampede: concurrent requests for
 * the same userId share a single in-flight promise.
 */
export async function getEntitlements(_userId: string): Promise<CachedEntitlements | null> {
  // GROUNDTRUTH: single open tier — no Redis/Convex lookup.
  return openTierEntitlements();
}

/** Entitlement fields the billing-verification decision reads. */
export type BillingVerificationInput = Pick<
  CachedEntitlements,
  'billingStatus' | 'retryAfterSeconds' | 'verificationUnavailable'
>;

/** Wire code for a billing-verification denial, mirrored into `X-Billing-Verification`. */
export type BillingVerificationCode =
  | BillingVerificationStatus
  | 'entitlement_verification_unavailable';

function clampRetryAfterSeconds(raw: number | undefined): number {
  return Number.isFinite(raw)
    ? Math.max(1, Math.min(60, Math.ceil(raw!)))
    : 5;
}

function isBillingVerificationStatus(
  value: unknown,
): value is BillingVerificationStatus {
  return value === 'subscription_lapsed'
    || value === 'renewal_verification_pending'
    || value === 'renewal_verification_failed';
}

/**
 * GROUNDTRUTH (2026-09-23 strip): single open tier — the entitlement backend
 * is always considered configured; there is nothing to verify against.
 */
export function isEntitlementBackendConfigured(): boolean {
  return true;
}

export function isBillingVerificationCode(
  value: unknown,
): value is BillingVerificationCode {
  return value === 'entitlement_verification_unavailable'
    || isBillingVerificationStatus(value);
}

export interface BillingVerificationDenial {
  /**
   * False ONLY for a lapse the provider confirmed. Everything else in this
   * union is a statement about the *verification*, not the subscription, so a
   * caller that renders it as terminal reproduces #5600.
   */
  retryable: boolean;
  code: BillingVerificationCode;
  /** Seconds to wait before retrying. 0 for a terminal denial. */
  retryAfterSeconds: number;
  /** Wire `error` string for JSON surfaces. */
  message: string;
  /** HTTP status the JSON surfaces use: 503 when retryable, 403 when terminal. */
  status: 403 | 503;
}

/**
 * The "we could not verify" denial, built in ONE place.
 *
 * Two situations produce it and they must not drift apart on the wire: the
 * synthesized `verificationUnavailable` marker below, and a caller that already
 * knows no lookup could have answered — `getEntitlements` returns null WITHOUT
 * attempting one when the backend is unconfigured, so an absent row there is a
 * deploy defect rather than a verdict about the account (#5619).
 */
export function unverifiableEntitlementDenial(
  retryAfterSeconds?: number,
): BillingVerificationDenial {
  return {
    retryable: true,
    code: 'entitlement_verification_unavailable',
    retryAfterSeconds: clampRetryAfterSeconds(retryAfterSeconds),
    message: 'Unable to verify API access',
    status: 503,
  };
}

/**
 * The billing-verification decision, as a pure predicate over an entitlement
 * row — no Response, no headers, no transport.
 *
 * Extracted from getBillingVerificationDenial (#5622) because three consumers
 * cannot use a `Response` (the surviving `api/mcp/*` surfaces and
 * `server/_shared/premium-check.ts` answer with booleans/identities).
 * Before this existed each consumer flattened
 * an *unverifiable* entitlement into a hard denial, which is exactly the #5600
 * failure mode the shared contract was built to remove.
 *
 * Keep this the single decision point: getBillingVerificationDenial below is a
 * thin renderer over it, so a new status cannot reach the JSON surfaces and
 * silently miss the HTML/handshake ones.
 */
export function classifyBillingVerification(
  entitlements: BillingVerificationInput | null | undefined,
): BillingVerificationDenial | null {
  if (entitlements?.verificationUnavailable) {
    // Lookup failure: same wire contract as server/gateway.ts's wm_-key
    // null-entitlement branch (docs/usage-errors.mdx).
    return unverifiableEntitlementDenial(entitlements.retryAfterSeconds);
  }

  const status = entitlements?.billingStatus;
  if (!isBillingVerificationStatus(status)) return null;

  if (status === 'subscription_lapsed') {
    // The ONLY terminal member: the provider confirmed coverage ended, so
    // retrying cannot flip it (tests/premium-denial.test.mts pins the same
    // reading on the client side).
    return {
      retryable: false,
      code: status,
      retryAfterSeconds: 0,
      message: 'Subscription lapsed',
      status: 403,
    };
  }

  return {
    retryable: true,
    code: status,
    retryAfterSeconds: clampRetryAfterSeconds(entitlements?.retryAfterSeconds),
    message: status === 'renewal_verification_pending'
      ? 'Renewal verification pending'
      : 'Renewal verification failed',
    status: 503,
  };
}

/**
 * Turns Convex's billing-verification metadata into the shared gateway denial
 * contract. Callers use this before their ordinary tier/feature checks so a
 * provider outage is never flattened into a misleading "upgrade required".
 *
 * JSON surfaces only. Non-JSON consumers call classifyBillingVerification()
 * above and render the decision in their own vocabulary.
 */
export function getBillingVerificationDenial(
  entitlements: BillingVerificationInput | null | undefined,
  corsHeaders: Record<string, string>,
  requiredTier?: number,
): Response | null {
  const denial = classifyBillingVerification(entitlements);
  return denial ? renderBillingVerificationDenial(denial, corsHeaders, requiredTier) : null;
}

/**
 * Renders an ALREADY-classified denial as the JSON wire contract.
 *
 * Split out from getBillingVerificationDenial for callers that classified
 * earlier and carry the decision with them — `server/_shared/premium-check.ts`
 * attaches it to the denied identity, and api/chat-analyst.ts renders that.
 * Before this existed, that route hand-built `{ verificationUnavailable: true }`
 * to re-enter the classifier, which collapsed all four states into one.
 */
export function renderBillingVerificationDenial(
  denial: BillingVerificationDenial,
  corsHeaders: Record<string, string>,
  requiredTier?: number,
): Response {
  return new Response(
    JSON.stringify({
      error: denial.message,
      code: denial.code,
      ...(requiredTier == null ? {} : { requiredTier }),
    }),
    {
      status: denial.status,
      headers: {
        // corsHeaders FIRST: the contract headers below are this function's own
        // output and must win. The pre-#5622 version was inconsistent about it
        // (a corsHeaders map could clobber X-Billing-Verification but not
        // Retry-After); no cors helper in the repo emits either name, so this is
        // inert today and pinned by test so it stays that way.
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'X-Billing-Verification': denial.code,
        // Terminal denials carry no Retry-After — advertising one would invite
        // a lapsed subscriber into an infinite retry instead of a resubscribe.
        ...(denial.retryable ? { 'Retry-After': String(denial.retryAfterSeconds) } : {}),
      },
    },
  );
}

/**
 * GROUNDTRUTH: single open tier — every request is allowed.
 *
 * Returns null (allowed) always; the detailed variant reports the open tier.
 */
export async function checkEntitlement(
  _userId: string | null,
  _pathname: string,
  _corsHeaders: Record<string, string>,
  _options: EntitlementCheckOptions = {},
): Promise<Response | null> {
  return null;
}

/**
 * GROUNDTRUTH: single open tier — every request is allowed.
 */
export async function checkEntitlementDetailed(
  _userId: string | null,
  _pathname: string,
  _corsHeaders: Record<string, string>,
  _options: EntitlementCheckOptions = {},
): Promise<EntitlementCheckResult> {
  return { response: null, entitlements: openTierEntitlements() };
}

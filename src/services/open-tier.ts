/**
 * GROUNDTRUTH single-open-tier compatibility shim (2026-09-23).
 *
 * Originally forked from koala73/worldmonitor. The Tier 4 commercial excision
 * removed the premium/free-tier gate modules:
 *
 *   - src/app/free-tier-gate.ts
 *   - src/app/pro-activation-controller.ts
 *   - src/services/panel-gating.ts
 *   - src/services/premium-fetch.ts
 *   - src/services/premium-denial.ts
 *   - src/services/analyst-denial.ts
 *
 * Rather than rewriting 60+ call sites, this ONE module re-exports every name
 * those modules provided to surviving code, with single-open-tier semantics:
 *
 *   - every access predicate answers "allowed" (hasPremiumAccess -> true,
 *     gate reasons -> PanelGateReason.NONE, denials -> null/"allowed"),
 *   - fetches are thin wrappers around globalThis.fetch with the premium
 *     header injection dropped,
 *   - gate helper classes/controllers are no-ops with matching signatures.
 *
 * Pure copy/label values (PanelGateReason enum, AUTH_SETTLE_GRACE_MS,
 * PRO_VERIFICATION_RETRY_MESSAGE, the type interfaces) are preserved verbatim
 * so string/serialised surfaces do not change.
 *
 * Layer note: services-layer module — imports types/config/services only,
 * never components/app. (The original pro-activation-controller.ts imported
 * @/app/app-context; this shim uses a structural minimum instead so the
 * services -> app boundary stays intact.)
 */

import type { PanelConfig } from '@/types';
import type { AuthSession } from './auth-state';

/* ------------------------------------------------------------------ */
/* panel-gating.ts                                                     */
/* ------------------------------------------------------------------ */

/** Keep the enum as-is — it is just labels. */
export enum PanelGateReason {
  NONE = 'none',           // show content (pro user, or desktop with API key, or non-premium panel)
  ANONYMOUS = 'anonymous', // "Sign In to Unlock"
  FREE_TIER = 'free_tier', // "Upgrade to Pro"
  PAYMENT_ON_HOLD = 'payment_on_hold', // "Update Payment" (payment failed, retry window)
  RENEWAL_PENDING = 'renewal_pending', // "Refresh Status" (renewal verification in progress)
  RENEWAL_FAILED = 'renewal_failed',   // "Manage Billing" (provider check failed)
  LAPSED = 'lapsed',                   // "Resubscribe" (provider confirmed coverage ended)
}

/**
 * Single source of truth for premium access — open tier: always granted.
 */
export function hasPremiumAccess(_authState?: AuthSession): boolean {
  return true;
}

/** Which arm of `hasPremiumAccess` answered. `none` means no arm did. */
export type PremiumAccessGrant = 'api_key' | 'pro_user' | 'auth_role' | 'none';

/**
 * Open tier: every client holds the grant. Reported as `pro_user` so any
 * telemetry that branches on the arm keeps seeing a premium arm.
 */
export function readPremiumAccessGrant(_authState?: AuthSession): PremiumAccessGrant {
  return 'pro_user';
}

/**
 * Open tier: the client believes every account is fully entitled, so a
 * server-side denial can never be read as "the plan really is insufficient".
 */
export function readClientEntitlementBelief(_authState: AuthSession): ClientEntitlementBelief {
  return {
    entitlementTier: PRO_TIER,
    authRole: 'pro',
  };
}

/**
 * Open tier: every panel is unlocked, so the gate reason is always NONE.
 */
export function getPanelGateReason(
  _authState: AuthSession,
  _isPremium: boolean,
): PanelGateReason {
  return PanelGateReason.NONE;
}

/**
 * Open tier: there is no billing state to refine with. Reasons pass through
 * untouched — with the gate always emitting NONE, the refinement is identity.
 */
export function resolveBillingAwareGateReason(reason: PanelGateReason): PanelGateReason {
  return reason;
}

/**
 * Every locked surface routes its CTA through here. Open tier: nothing is
 * locked, so there is no action to take.
 */
export interface GateActionDeps {
  /** Opens the sign-in modal for the ANONYMOUS reason. */
  openAuthModal: () => void;
  /**
   * Plan key used to preselect the pricing page's billing period on the LAPSED
   * reason. Defaults to the live subscription row.
   */
  planKey?: string | null;
}

/** Return the action callback for a given gate reason. Open tier: no-op. */
export function resolveGateAction(_reason: PanelGateReason, _deps: GateActionDeps): () => void {
  return () => {};
}

/* ------------------------------------------------------------------ */
/* premium-denial.ts                                                   */
/* ------------------------------------------------------------------ */

/** Minimum entitlement tier that counts as Pro (mirrors api/latest-brief.ts). */
export const PRO_TIER = 1;

export type PremiumDenialVerdict =
  /** 401 — the session is gone. Re-auth, don't retry. */
  | 'sign_in_required'
  /** 403 entitlement denial the client agrees with. Terminal; show the upsell. */
  | 'upgrade_required'
  /** 403 entitlement denial the client's own state contradicts. Transient; retry. */
  | 'entitlement_desync'
  /** 403 that never reached the entitlement check (origin/WAF). Transient; retry. */
  | 'access_denied';

/**
 * Snapshot of what the CLIENT believes about the user's plan, independent of
 * the server's answer.
 */
export interface ClientEntitlementBelief {
  /** `features.tier` from the Convex entitlement snapshot; null when none has arrived. */
  entitlementTier: number | null;
  /** `role` on the Clerk session; null when signed out or unset. */
  authRole: string | null;
}

export interface PremiumDenialInput {
  status: number;
  /** The `error` field of the response body, when it parsed as a string. */
  errorCode: string | null;
  belief: ClientEntitlementBelief;
}

/**
 * Open tier: the client always believes the user is entitled, so a denial is
 * never a statement about the plan.
 */
export function clientBelievesPro(_belief: ClientEntitlementBelief): boolean {
  return true;
}

/**
 * Classify a premium endpoint's response. Open tier: no response is an access
 * denial — null ("allowed") for every input.
 */
export function classifyPremiumDenial(_input: PremiumDenialInput): PremiumDenialVerdict | null {
  return null;
}

/**
 * Open tier: the client never skips a fetch it "believes is doomed", because
 * no fetch is doomed.
 */
export function shouldSkipDoomedFetch(
  _hasEntitlementSnapshot: boolean,
  _belief: ClientEntitlementBelief,
): boolean {
  return false;
}

/** Whether the verdict is worth retrying. Terminal verdicts need user action. */
export function isTransientDenial(verdict: PremiumDenialVerdict | null): boolean {
  return verdict === 'entitlement_desync' || verdict === 'access_denied';
}

/** What a panel should actually render for a denial. */
export type DenialAction =
  /** Terminal: the session is gone. */
  | 'sign_in'
  /** Terminal: the plan really is insufficient. The only honest upsell. */
  | 'upgrade'
  /** Transient: show the unavailable state and retry. */
  | 'retry'
  /** Transient budget spent: terminal, but NOT an upsell — we have no evidence
   *  the user needs to buy anything. */
  | 'give_up';

/**
 * Route a denial verdict to the render a panel should perform.
 * Open tier never produces a verdict; the truth table is preserved unchanged.
 */
export function routeDenial(
  verdict: PremiumDenialVerdict,
  consecutiveTransientDenials: number,
  maxTransientDenials: number,
): DenialAction {
  if (verdict === 'sign_in_required') return 'sign_in';
  if (verdict === 'upgrade_required') return 'upgrade';
  return consecutiveTransientDenials > maxTransientDenials ? 'give_up' : 'retry';
}

/**
 * Pull the `error` string out of a denial response body for `errorCode`.
 * Consumes the body — only call it on a response you are not going to read
 * again.
 */
export async function readDenialErrorCode(res: Response): Promise<string | null> {
  try {
    const body = (await res.json()) as { error?: unknown } | null;
    return typeof body?.error === 'string' ? body.error : null;
  } catch {
    return null;
  }
}

/**
 * Classify a response end to end. Open tier: no response is an access denial —
 * always resolves to null ("allowed"), leaving the body stream intact.
 */
export async function classifyDenialResponse(
  _res: Response,
  _belief: ClientEntitlementBelief,
): Promise<PremiumDenialVerdict | null> {
  return null;
}

/* ------------------------------------------------------------------ */
/* analyst-denial.ts                                                   */
/* ------------------------------------------------------------------ */

export const PRO_VERIFICATION_RETRY_MESSAGE =
  'Verifying your Pro access — try again in a moment.';

/**
 * Whether a response is the shared billing-verification 503. Pure predicate,
 * preserved unchanged.
 */
export function isBillingVerificationDenial(
  status: number,
  billingVerificationHeader: string | null,
): boolean {
  return status === 503 && Boolean(billingVerificationHeader);
}

/**
 * Copy for a verdict `classifyDenialResponse` already produced.
 * Open tier always passes a null verdict, so the default branch applies.
 */
export function analystDenialMessage(
  status: number,
  verdict: PremiumDenialVerdict | null,
): string {
  switch (verdict) {
    case 'sign_in_required':
      return 'Sign in to use the analyst.';
    case 'upgrade_required':
      return 'Pro subscription required.';
    case 'entitlement_desync':
      return PRO_VERIFICATION_RETRY_MESSAGE;
    case 'access_denied':
      return 'Analyst temporarily unavailable — try again in a moment.';
    default:
      return `Error ${status}`;
  }
}

/* ------------------------------------------------------------------ */
/* premium-fetch.ts                                                    */
/* ------------------------------------------------------------------ */

type PremiumFetchInit = RequestInit & { forcePremium?: boolean };

function stripForcePremium(init?: PremiumFetchInit): RequestInit | undefined {
  if (!init) return undefined;
  const { forcePremium: _dropped, ...rest } = init;
  void _dropped;
  return rest;
}

function withCredentials(init?: RequestInit): RequestInit {
  return { ...(init ?? {}), credentials: init?.credentials ?? 'include' };
}

/**
 * Fetch adapter for generated RPC clients. Open tier: no auth headers are
 * injected — the premium header logic (Clerk Bearer, X-WorldMonitor-Key) is
 * dropped and the request goes straight to globalThis.fetch with the same
 * credentials default as before ('include').
 */
export async function premiumFetch(
  input: RequestInfo | URL,
  init?: PremiumFetchInit,
): Promise<Response> {
  return globalThis.fetch(input, withCredentials(stripForcePremium(init)));
}

/**
 * Fetch adapter for generated RPC clients that include Pro-fresh market reads.
 * Open tier: identical thin wrapper — no premium intent marking, no path
 * gating, no Bearer injection.
 */
export async function proFreshRpcFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  return globalThis.fetch(input, withCredentials(init));
}

/* ------------------------------------------------------------------ */
/* free-tier-gate.ts (was src/app/free-tier-gate.ts)                   */
/* ------------------------------------------------------------------ */

/**
 * Last-resort deadline for the auth session to settle before the free-tier
 * caps are applied anyway. Kept verbatim: tier-preference-handoff.ts derives
 * its deferral bound from it.
 */
export const AUTH_SETTLE_GRACE_MS = 8000;

/**
 * Open tier: the gate never enforces. The class keeps its public surface
 * (constructor + getters + methods) so App/panel-layout call sites compile
 * unchanged; every method is a no-op and the deadline is never exceeded.
 */
export class FreeTierGate {
  constructor(_enforce: () => void) {
    void _enforce; // Open tier: never enforced; kept only for call-site compatibility.
  }

  /** True once the grace period elapsed with the session still unresolved. */
  get authSettleDeadlineExceeded(): boolean {
    return false;
  }

  /** Test seam: whether a fallback is currently armed. */
  get fallbackPending(): boolean {
    return false;
  }

  /** Arm the one-shot fallback. Open tier: never armed. */
  scheduleFallback(): void {
    // no-op: there are no free-tier caps to enforce.
  }

  /**
   * Drop a pending fallback. Open tier: nothing pending, nothing to clear.
   */
  cancelFallback(): void {
    // no-op
  }

  /** Start a fresh grace window for a new auth/account transition. */
  resetForAuthTransition(): void {
    // no-op
  }
}

/**
 * Open tier: there is no legacy proGated sweep to run — gating never disabled
 * any panel. Returns a NEW map identical to the input; the input is never
 * mutated.
 */
export function sweepLegacyDisabledCustomWidgets(
  panelSettings: Record<string, PanelConfig>,
  _ownedWidgetIds: ReadonlySet<string>,
): Record<string, PanelConfig> {
  const next: Record<string, PanelConfig> = {};
  for (const [key, config] of Object.entries(panelSettings)) {
    next[key] = { ...config };
  }
  return next;
}

/**
 * Open tier: the gate owns no state, so a reconciled map never differs in a
 * way the gate owns.
 */
export function panelGateStateChanged(
  _before: Record<string, PanelConfig>,
  _after: Record<string, PanelConfig>,
): boolean {
  return false;
}

/**
 * Open tier: cloud legacy recovery never runs.
 */
export function shouldRunCloudLegacyRecovery(
  _baselineSyncVersion: number | null,
  _appliedSyncVersion: number | null,
  _incomingSyncVersion: number | undefined,
): boolean {
  return false;
}

/* ------------------------------------------------------------------ */
/* pro-activation-controller.ts (was src/app/pro-activation-controller.ts) */
/* ------------------------------------------------------------------ */

/** Write the durable checkout-return marker. Open tier: no-op. */
export function markProActivationPending(_productId: string | null, _now = Date.now()): void {
  // no-op: there is no Pro activation onboarding in the open tier.
}

export interface ProActivationControllerOptions {
  /** Checkout-return boot reloads immediately; evaluate only on the next boot. */
  reloadPending: boolean;
  /** Panel-owned surface opener that cannot be implemented outside the layout. */
  openAiAnalyst: () => void;
  /** App-owned global command-search opener. */
  openSearch?: () => void;
}

/**
 * Structural minimum of the app-layer context the controller needs, so this
 * services-layer shim does not import @/app/app-context.
 */
export interface OpenTierAppContext {
  readonly isDestroyed: boolean;
  readonly isDesktopApp?: boolean;
}

/**
 * Open tier: owns no activation boot/storage/retry lifecycle. The class keeps
 * its public surface (constructor + init + destroy) so PanelLayoutManager
 * compiles unchanged.
 */
export class ProActivationController {
  constructor(
    _ctx: OpenTierAppContext,
    _options: ProActivationControllerOptions,
  ) {
    void _ctx;
    void _options; // Open tier: no activation lifecycle; kept only for call-site compatibility.
  }

  init(): void {
    // no-op
  }

  destroy(): void {
    // no-op
  }
}

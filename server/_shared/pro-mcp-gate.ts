/**
 * The Pro-MCP access decision, shared by the entitlement gates below.
 *
 * Call sites previously re-implemented the same four-clause check
 * (`tier >= 1 && mcpAccess === true && validUntil >= now`, plus the null case):
 *
 *   - `api/mcp/auth.ts`    — protects MCP-edge requests
 *   - `server/gateway.ts`  — re-checks signed internal MCP calls
 *
 * (The mcp-grant consent/mint endpoints were removed with the commercial
 * subsystem; the decision is now allow-all under the open tier.)
 *
 * The decision lives here so the OAuth handshake cannot authorize an account
 * that the MCP edge or gateway later rejects. Each caller keeps its own response
 * envelope and telemetry (#5622, #5653).
 *
 * What this module owns, precisely: the ACCESS decision, for all five. The
 * `ProMcpGateDenial` union is consumed as a rendered decision only by the three
 * grant-flow callers (via `proMcpGateDenialResponse`). `api/mcp/auth.ts` and
 * `server/gateway.ts` read the return value as pass/deny and render billing
 * denials through their own helpers — which bottom out in the same
 * `entitlement-check.ts::classifyBillingVerification`. That function, not this
 * one, is the single source for billing classification.
 *
 * Coverage validity is shared with the premium resolver and gateway through
 * `hasCurrentEntitlementCoverage`. Convex token issuance retains its own check
 * because the Convex runtime does not import from `server/_shared`.
 */

import type {
  BillingVerificationDenial,
  BillingVerificationInput,
} from './entitlement-check';

/** The entitlement shape this gate reads. */
export type ProMcpEntitlement = {
  features: { tier: number; mcpAccess?: boolean };
  validUntil: number;
  /**
   * Some request-layer dependency types expose the marker as boolean even
   * though only literal true has billing semantics. False is normalized to
   * absence before classification below.
   */
  verificationUnavailable?: boolean;
} & Omit<BillingVerificationInput, 'verificationUnavailable'>;

export type ProMcpGateDenial =
  /**
   * The entitlement could not be verified or a renewal re-check is in flight.
   * Provider-confirmed ended coverage is reclassified to `free_account` by
   * `checkProMcpAccess`; callers must not flatten these retryable verification
   * states into a terminal tier verdict (#5600).
   */
  | { kind: 'billing_verification'; denial: BillingVerificationDenial }
  /** A verified no-row or well-formed tier-0 account eligible at the MCP call site. */
  | { kind: 'free_account' }
  /**
   * A confirmed answer that does not grant Pro MCP access and is not eligible
   * for the free-account allowance: a tiered plan without mcpAccess, an expired
   * validUntil, or a malformed entitlement shape. This is the honest upsell.
   */
  | { kind: 'insufficient_tier' };

/**
 * Returns null when the caller may proceed, else the reason.
 *
 * Ordering is load-bearing: an entitlement that currently grants Pro MCP access
 * is authorized even if it carries a renewal-verification marker for a stronger
 * plan, mirroring `checkEntitlementDetailed`'s tier-fallback. Classifying the
 * billing metadata first would 503 a user whose access is fine.
 */
export function checkProMcpAccess(
  _entitlements: ProMcpEntitlement | null | undefined,
  _now: number,
  _opts?: { backendConfigured?: boolean },
): ProMcpGateDenial | null {
  // GROUNDTRUTH: single open tier — MCP access is always granted.
  return null;
}

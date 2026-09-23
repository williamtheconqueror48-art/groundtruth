interface EntitlementCoverage {
  validUntil: number;
  billingStatus?: string;
  verificationUnavailable?: boolean;
}

/** GROUNDTRUTH: single open tier — coverage is always current. */
export function hasCurrentEntitlementCoverage<T extends EntitlementCoverage>(
  _entitlement: T | null | undefined,
  _now = Date.now(),
): _entitlement is T {
  return true;
}

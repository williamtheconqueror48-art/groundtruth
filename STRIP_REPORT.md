# STRIP_REPORT.md

**Date:** 2026-09-23
**Branch:** `strip/tier1-tier4` (local only — not pushed, no PR)
**Upstream:** originally forked from koala73/worldmonitor (`793be04`)

## Result

| Metric | Value |
|---|---|
| Files deleted | 535 |
| npm scripts removed | 54 |
| `server/__tests__` | 39 files, 544/544 pass |
| Convex account-deletion + apiKeys tests | 6 files, 93/93 pass |

## Key repairs

1. **Gateway verification-outage contract** (`server/gateway.ts`): the
   legacy-premium Bearer branch returned 401 when `validateBearerToken()`
   reported `reason: 'unverifiable'`; repaired to emit 503 via
   `sessionVerificationUnavailableResponse`, preserving the retryable contract.
   (Also fixed a `RequestReason` type error: `'session_verification_503'` →
   `'validation_unavailable'`.)
2. **Broken CSS import** (`src/embed-main.ts`): removed the stale
   `happy-theme.css` import (file deleted in Tier 1).
3. **Orphaned glossary data**: `blog-site/src/data/glossary.ts` was the only
   blog-site file still consumed (crawlable corpus builder + glossary test);
   restored as `shared/glossary-data.ts` and repointed both consumers.
4. **vercel.json formatting churn**: an intermediate rewrite pretty-printed
   the file (2000+ line diff) and corrupted regex character classes; restored
   the original hand-maintained formatting and applied only the content
   deletions (8 rewrites, mcp-grant headers, CSP/Permissions-Policy scrub).
5. **Stale comment references**: ~15 files had comments pointing at deleted
   modules (`convex/payments/*`, Dodo checkout, mcp-grant pages,
   company-monitoring reaper); reworded to the open-tier reality. Live code
   was not changed for comment-only issues.
6. **Legacy schema tombstones**: `embedKeys`, `mcpProTokens`,
   `apiPlanLimitNotices` tables kept with LEGACY comments so account deletion
   can purge old rows; no live code reads/writes them.

## Deliberate decisions (do not "fix" these)

- `getRequiredTier()` returns `null` and entitlement coverage is always
  current. Tests encoding paid-expiry/tier premises were adapted, not the
  source reverted.
- `server/_shared/user-api-key.ts` keeps defensive Company Monitoring
  *validation* (fail-closed on unknown shapes); issuance paths are deleted.
- `isActivePaidEntitlement` (direct-LLM quota) keeps its own expiry check as
  a spend-control floor, independent of the always-current coverage.
- The Sentry Dodo-checkout-chunk suppression filter was left in place (dead
  but harmless; removing it changes error-reporting semantics).

## Checks

- `npm run --silent agent:preflight -- --mode review` → status `ready`
- `npm run typecheck` → pass
- `npm run typecheck:api` → pass (convex string-call audit + 59 Sentry
  probe-filter patterns)
- `npm run lint:boundaries` → pass
- `git diff --check` → clean

## Protections verified

- Root `LICENSE` byte-identical to `HEAD`.
- No changes under `cli/`, `sdk/`, `workers/`, `src/generated/`.
- `AUDIT.md` remains untracked and uncommitted.

## Out of scope (untouched per instructions)

Tier 2 variant panels, Tier 3 server domains, AI-brief pipeline.

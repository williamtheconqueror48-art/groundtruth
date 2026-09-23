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

---

## Phase 2 — Tier 2/3 strip + AI-brief removal (2026-09-23)

**Branch:** `strip/tier2-tier3-aibriefs` (local only — not pushed, no PR)
**Base:** `a4b298e` (Phase 1 commit)

### Result

Removes variant-only Happy/Tech/Finance/Energy UI, Tier 3 API/server domains,
AI brief/chat/insights surfaces, LLM services/workers/helpers, AI tokens,
four agent skills. Collapses mission presets to single-variant semantics.

### Key repairs

1. **Entitlement crosswalk re-baseline**: 38 gate-count drifts (18 pre-existing
   from Phase 1 + 20 from Phase 2 removals) re-baselined to 0; dead rules for
   deleted `api/chat-analyst` and `api/widget-agent` routes removed;
   `convex/config/productCatalog.ts` absence tolerated (commercial strip).
2. **Panel registry consistency**: 8 deleted energy/finance panel components
   removed; 90 stale commands and 101 stale category entries cleaned;
   17 stale `scheduleRefresh` and 21 stale `shouldPrime` blocks removed;
   `loadOilAnalytics()` deleted; type imports cleaned.
3. **Guardrails test adaptation**: `VARIANT_FILES` → `['full']`;
   DeductionPanel assertion rewritten generically; critical panels updated
   (`insights` → `map`, `energy-crisis` → `etf-flows`).
4. **Type safety**: empty `Set` annotations added for `WEB_CLERK_PRO_ONLY_PANELS`
   (was `Set<never>`); `WEB_PREMIUM_PANELS` regex-parse compatibility preserved.

### Deliberate leftovers (do not "fix" these)

- No-op compatibility shims (`country-intel.ts`, `ml-worker.ts`).
- Ollama model discovery (plain HTTP, no generation).
- Explicit removed-AI RPC stubs.
- Relocated corporate headline search.
- China signals degrade to unavailable.
- `src/generated/` untouched.

### Checks

- `npm run typecheck` → pass
- `npm run typecheck:api` → pass
- `npm run lint:boundaries` → pass
- `git diff --check` → clean
- `tests/panel-config-guardrails.test.mjs` → 23/23 pass
- `tests/entitlement-crosswalk-classifier.test.mjs` → 15/15 pass
- Entitlement crosswalk `--check` → exit 0
- `tests/mission-presets.test.mts` → 46/47 (1 pre-existing baseline failure)

### Protections verified

- Root `LICENSE` byte-identical.
- `src/generated/` untouched.
- `AUDIT.md` remains untracked and uncommitted.

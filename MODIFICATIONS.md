# MODIFICATIONS.md

**Date:** 2026-09-23
**Branch:** `strip/tier1-tier4`
**Upstream:** originally forked from koala73/worldmonitor (AGPL-3.0-only)

This document records every deliberate modification made on the
`strip/tier1-tier4` branch: the Tier 1 surface strip plus the Tier 4
commercial-subsystem excision that collapses the product to a single open
tier ("GROUNDTRUTH").

---

## Tier 1 — Surface strip (variant/blog/desktop removal)

### Deleted

- `blog-site/` — entire Astro blog (content moved: glossary data preserved at
  `shared/glossary-data.ts` for the crawlable corpus builder; `/blog`
  rewrites still route to the external production blog).
- `src-tauri/` — entire Tauri desktop shell and sidecar.
- `src/styles/happy-theme.css` — variant theme (stale import in
  `src/embed-main.ts` repaired).
- Non-`full` variant configs under `src/config/variants/` (kept `base.ts`,
  `full.ts`).
- Variant dashboard/meta/SEO modules and variant favicon directories.
- `src/bootstrap/variant-theme.ts`.
- `docker/umami/` and six specialized Dockerfiles
  (`Dockerfile.digest-notifications`, `Dockerfile.publish-bootstrap-tiers`,
  `Dockerfile.seed-bundle-portwatch-port-activity`,
  `Dockerfile.seed-bundle-resilience-validation`, `Dockerfile.umami`,
  `Dockerfile.umami-retention`).
- `public/robots.variant.txt`.
- `@tauri-apps/cli` dependency (package-lock regenerated).

### Kept

- `workers/`, root `Dockerfile`, `Dockerfile.relay`.

### Repairs

- New `src/config/site-meta.ts` (replaces variant-driven meta).
- `src/config/variant.ts` hardcodes `SITE_VARIANT = 'full'`; legacy helpers
  remain only because excluded Tier 2 WebMCP code still imports them.
- `vite.config.ts`, `src/main.ts`, `src/services/meta-tags.ts`,
  `src/app/event-handlers.ts`, `scripts/build-sitemap.mjs` repaired for the
  single-variant build.
- `src/services/runtime.ts`: one full/world remote-host set.
- 54 npm scripts removed (variant builds, Tauri, blog, visual/variant e2e).

---

## Tier 4 — Commercial subsystem excision (single open tier)

### Deleted (commercial backend)

- `convex/payments/` (entire directory: Dodo billing, webhooks, entitlements,
  product catalog, broadcast, Resend hooks).
- `convex/entitlements.ts`, `convex/apiPlanLimitUsage.ts`,
  `convex/apiPlanLimitNotices.ts` (module; table kept as legacy tombstone),
  `convex/apiPlanLimitEmails.ts`, `convex/mcpProTokens.ts` (module; table kept
  as legacy tombstone), `convex/embedKeys.ts` (module; table kept as legacy
  tombstone), `convex/companyMonitoring/` (entire directory).
- `convex/__tests__/accountDeletionBilling.test.ts`,
  `convex/__tests__/apiPlanLimitEmails.test.ts`.
- `api/create-checkout.ts`, `api/customer-portal.ts`,
  `api/_bootstrap-public-tier.js`, `api/_bootstrap-tier-keys.js`,
  `api/internal/mcp-grant-context.ts`, `api/internal/mcp-grant-mint.ts`,
  `api/oauth/authorize-pro.ts`, `api/_mcp-grant-hmac.ts`.
- Pro E2E tests and commercial test fixtures.

### Deleted (commercial client)

- `src/app/free-tier-gate.ts`, `src/app/pro-activation-controller.ts`
  (replaced by open-tier no-op shim surface),
  `src/services/checkout.ts`, `src/services/billing.ts`,
  `src/services/api-plan-limit-notices.ts`,
  `src/services/checkout-error-toast.ts`,
  `src/services/pro-banner-policy.ts`, commercial embed-key services,
  product config/attribution, Pro banner components.

### Open-tier architecture (added/rewired)

- **New** `src/services/open-tier.ts` — preserves surviving client signatures
  with allow-all/fetch behavior; the single import surface for gates, premium
  checks, export resolvers, and notifications.
- `server/_shared/entitlement-check.ts` — `getRequiredTier()` returns `null`;
  `TIER_GATED_PATHS` empty; `getEntitlements()` synthesizes the local
  open-tier snapshot (tier 99, unlimited); `isEntitlementBackendConfigured()`
  returns `true`; Redis/Convex entitlement-fetch machinery removed.
- `server/_shared/entitlement-coverage.ts` — coverage is always current
  (deliberate design decision; do not restore commercial expiry semantics).
- `server/_shared/pro-mcp-gate.ts` — allow-all, signatures retained.
- `src/services/entitlements.ts` — publishes local open-tier state; no Convex
  subscription.
- Export gates (`src/services/gates/export-resolver.ts`,
  `src/services/gates/export.ts`) detached from billing state.
- `convex/apiKeys.ts` — any signed-in user may create `wm_` keys; entitlement
  gate, Company Monitoring scopes, and account binding removed. Legacy
  `companyMonitoringAccountId` field retained for old-row compatibility.
- `convex/schema.ts` — `embedKeys`, `mcpProTokens`, `apiPlanLimitNotices`
  marked LEGACY tombstones (purge-only via account deletion).
- `convex/crons.ts` — plan-limit, broadcast, and company-monitoring crons
  removed. `convex/convex.config.ts` — Dodo component removed.
- `vercel.json` — 8 rewrites removed (5 variant dashboards, variant robots,
  `/mcp-grant`, `/oauth/authorize-pro`); mcp-grant headers removed;
  CSP/Permissions-Policy scrubbed of Dodo/Stripe/variant origins.

### Deliberate behavioral consequences (pinned by tests)

- Expired/lapsed legacy entitlement rows still resolve premium identity
  (coverage always current) but the direct-LLM spend control keeps its own
  unverified-floor check (`DIRECT_LLM_UNVERIFIED_DAILY_QUOTA_LIMIT`).
- Former tier-gated paths use the ordinary per-IP endpoint bucket; the
  summarize-article #5206 principal-attribution exception is retained.
- The gateway's legacy-premium Bearer branch returns 503 (not 401) when token
  verification is unavailable (`reason: 'unverifiable'`).
- `server/_shared/user-api-key.ts` retains Company Monitoring *validation*
  defensively (unknown/foreign shapes still fail closed); issuance is gone.

---

## Test adaptations

- `server/__tests__/gateway-user-key-apiaccess.test.ts` — 29/29 pass;
  expired/missing-config premises rewritten to the open-tier contract.
- `server/__tests__/gateway-direct-llm-quota.test.ts` — 70/70 pass; tier-gate
  and principal-bucket assertions adapted.
- `server/__tests__/premium-check-direct-llm-limit.test.ts` — 7/7 pass;
  lapsed-row assertions adapted (premium identity + unverified LLM floor).
- `server/__tests__/gateway-summarize-article-security.test.ts` — 13/13 pass;
  expired-row attribution assertion adapted.
- `convex/__tests__/` account-deletion + apiKeys suites — 93/93 pass;
  commercial/billing/company-monitoring premises removed.
- `src/components/UnifiedSettings.ts` — 2604 → ~1450 lines; billing,
  Business Seats, embed-key, MCP-client, plan-limit, checkout UI removed;
  settings/panels/sources/notifications/api-keys/account-deletion preserved.

## Preserved invariants

- Root `LICENSE` byte-identical to upstream HEAD (AGPL-3.0-only).
- MIT licences under `cli/` and `sdk/{python,ruby,go}/` untouched (no changes
  in those trees).
- `workers/` intact. Unrelated `AUDIT.md` left untracked.
- `src/generated/` never hand-edited (Convex codegen stale/ignored; no
  `CONVEX_DEPLOYMENT` in this environment).
- Browser import direction `types → config → services → components → app →
  App.ts` maintained.

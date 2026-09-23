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

---

## Phase 2 — Tier 2/3 strip + AI-brief removal (2026-09-23)

**Branch:** `strip/tier2-tier3-aibriefs` (based on `a4b298e`)

Removes variant-only Happy/Tech/Finance/Energy UI, Tier 3 API/server domains,
AI brief/chat/insights surfaces, LLM services/workers/helpers, AI tokens,
and four agent skills. Collapses mission presets to single-variant semantics.

### Deleted (UI)

- Variant-only Happy/Tech/Finance/Energy panels and themes.
- AI brief/chat/insights UI: `WidgetChatModal`, chat-analyst panel, AI insights.
- `api/chat-analyst.ts`, `api/widget-agent.ts`.
- Deleted panel components: `ConsumerPricesPanel.ts`, `EnergyComplexPanel.ts`,
  `EnergyCrisisPanel.ts`, `EnergyDisruptionsPanel.ts`, `FuelShortagePanel.ts`,
  `OilInventoriesPanel.ts`, `PipelineStatusPanel.ts`, `StorageFacilityMapPanel.ts`
  (energy/finance panels removed from FULL_PANELS registry).
- 90 stale `panel:<id>` commands from `src/config/commands.ts`.
- Stale `PANEL_CATEGORY_MAP` entries for deleted panels.
- Stale `DEFERRED_PANEL_NATURAL_FOOTPRINTS` entries.
- Stale `scheduleRefresh` and `shouldPrime` blocks for deleted panels.

### Deleted (Server/API)

- Tier 3 API/server domains (finance/commercial).
- `server/_shared/direct-llm-quota.ts` (direct-LLM quota logic).
- `server/_shared/llm.ts` reasoning/tool-model env docs.
- Four agent skills (AI-related).
- `@xenova/transformers` from `package.json` (lockfile regenerated).

### Deleted (Tests)

- Browser/commercial: `checkout-return-state`, `checkout-success-durable`,
  `pro-checkout-intent-url`, `checkout-duplicate-dialog-copy`, `checkout-transport`.
- Server: `summarize-article-llm-health`, `backtest-stock-quota`,
  `comtrade-raw-keys`, `summarize-article-cache-readonly`,
  `summarize-article-handler-security`, `world-bank-cache`,
  `widget-agent-billing-denial`.

### Modified

- `src/config/panels.ts`: FULL_PANELS registry (73 panels); `apiKeyPanels`
  reduced to `['regional-intelligence', 'trade-policy', 'global-procurement']`;
  PANEL_CATEGORY_MAP cleaned.
- `src/config/commands.ts`: 90 stale commands removed.
- `src/app/panel-layout.ts`: WEB_PREMIUM_PANELS cleaned; dead
  `revealAnalystPanel()` and `openAiAnalyst` callback removed;
  DEFERRED_PANEL_NATURAL_FOOTPRINTS cleaned.
- `src/app/data-loader.ts`: energy-complex panel references removed;
  `loadOilAnalytics()` deleted.
- `src/App.ts`: stale primeTask/scheduleRefresh blocks removed.
- `src/services/open-tier.ts`: `openAiAnalyst` removed from options.
- `scripts/generate-entitlement-crosswalk.mjs`: re-baselined (38 drifts → 0);
  dead rules for deleted routes removed; productCatalog absence tolerated.
- Mission presets: `energy-security` and `good-news-explorer` removed;
  7 retained (`crisis-desk`, `supply-chain-risk`, `osint-newsroom`,
  `macro-market-watch`, `tech-ai-watch`, `nq-day-trader`, `country-watcher`);
  single-variant semantics; `nq-day-trader` finance gate removed.

### Deliberate leftovers (compatibility)

- `src/app/country-intel.ts`: no-op shim.
- `src/services/ml-worker.ts`: disabled no-op shim.
- `src/services/ollama-models.ts`: plain HTTP model discovery only.
- `src/components/country-brief-presentation.ts`: non-generative organization.
- Commodity/Gulf config and supply-chain scenario templates (live consumers).
- `server/worldmonitor/intelligence/v1/_removed-ai-stubs.ts`: explicit RPC stubs.
- `server/worldmonitor/intelligence/v1/_stock-news-search.ts`: relocated corporate
  headline search.
- China decision signals degrade to unavailable (stripped macro/activity/corridor).
- `src/generated/` untouched (proto regeneration deferred).

### Verification (2026-09-23)

- `npm run typecheck`: clean.
- `npm run typecheck:api`: clean.
- `npm run lint:boundaries`: clean.
- `git diff --check`: clean.
- `tests/panel-config-guardrails.test.mjs`: 23/23 pass.
- `tests/entitlement-crosswalk-classifier.test.mjs`: 15/15 pass.
- `node scripts/generate-entitlement-crosswalk.mjs --check`: exit 0.
- `tests/mission-presets.test.mts`: 46/47 (1 pre-existing baseline failure).

## Phase 3 — GROUNDTRUTH rebrand + evidence layer v1 (2026-09-24)

Branch: `feature/rebrand-evidence-v1` (from `strip/tier2-tier3-aibriefs`).

### Rebrand (World Monitor → GROUNDTRUTH)

- `package.json`: package renamed `world-monitor` → `groundtruth` (AGPL-3.0-only retained).
- `index.html`: title "GROUNDTRUTH — Evidence-First Global Incident Tracker"; new
  stark black/white/red GT favicon (`public/favico/gt-mark.svg`).
- `src/config/site-meta.ts`: title/description/keywords/subject/classification rebranded.
- `src/app/panel-layout.ts`: header wordmark, GitHub link → GROUNDTRUTH repo, footer
  rebranded; source-offer + AGPL §13 link added; `koala73/worldmonitor` attribution
  and original author credit preserved; obsolete pricing/blog/status/X footer links removed.
- `src/locales/en.json`, `src/locales/en.shell.json`: visible World Monitor strings
  rebranded; obsolete license language neutralized.
- `src/config/agent-not-found.ts`: not-found copy rebranded.
- `src/styles/groundtruth-brutalist.css` (new, imported from `src/main.ts`): additive
  brutalist skin — monospace display type, black/white + signal red, hard borders,
  claim-tier stamps, evidence-record/timeline layouts.

### Evidence layer v1 (new)

- `shared/evidence/types.ts`: `EvidenceRecord`, `Claim`, `SourceRef`, `Entity`,
  `ClaimTier`; canonical JSON; dependency-free cyrb53 record fingerprint;
  `makeRecord()` rejects sourceless records and out-of-bounds claim indexes.
- `shared/evidence/provenance.ts`: `CLAIM_TIER_META` (5 tiers with labels/meanings/
  stamp classes); async `stampSource()` writes genuine SHA-256 (WebCrypto
  `crypto.subtle`; throws rather than mislabeling when unavailable);
  `attachProvenance()`.
- `src/services/evidence-usgs.ts`: keyless CORS-open USGS M4.5 monthly GeoJSON
  → seismic EvidenceRecords, SENSOR-tier claims, USGS event-page sources;
  fetch failure returns `[]`, never crashes.
- `src/components/EvidencePanel.ts`, `src/components/EvidenceTimelinePanel.ts`:
  raw record list + newest-first timeline with tier stamps, provenance, source
  URLs, retrieval times, digests, entities; "correlation is not proof" stated.
- Registered in `src/config/panels.ts` (`evidence`, `evidence-timeline`, on by
  default), `src/config/commands.ts`, `src/app/panel-layout.ts`,
  `src/components/index.ts`; chunked into `panels-intel` in `vite.config.ts`.
- `tests/groundtruth-evidence-layer.test.mts`: 11/11 pass (record validation,
  SHA-256 known-vector + node:crypto parity, USGS mapping, malformed-feature nulls).

### Build repairs (Phase 1/2 stale references)

- `scripts/source-attribution.mjs --write` + 62 host retirements; manifest now
  records 719 active hosts; `docs/source-attribution.mdx` regenerated.
- `scripts/crawlable-sources-page.mjs`: explicit catalog-domain overrides for
  `api.imf.org`, `www.alphavantage.co` (finance), `feeds.feedburner.com`,
  `news.google.com` (news) — providers whose remaining references no longer
  match a domain matcher after the strips.
- `scripts/build-crawlable-corpus.mjs`: tolerates deleted `blog-site/` (empty
  blog-post set); chokepoint editorial links to missing posts are skipped with
  a warning instead of failing the build.
- `scripts/internal-links.mjs`: `blogPages()` returns [] when the blog directory
  is absent.
- `scripts/data/related-reading.json`: two dead blog-post links removed.
- `scripts/build-sitemap.mjs`: deleted `src/config/products.ts` removed from the
  landing and `/pro` route material sources.
- `vite.config.ts`: 8 stripped services (prediction, economic, market,
  positive-events, giving, trade, supply-chain, scenario) removed from the dev
  API plugin imports/routes; deleted `mcp-grant.html` entry removed.
- `scripts/generate-product-config.mjs`, `scripts/generate-public-product-facts.mjs`:
  no-op when the commercial catalog is absent (Phase 2 repair).
- `scripts/crawlable-developments.mjs`: local proper-noun grounding check replaces
  the deleted AI-brief import (Phase 2 repair).
- `src/config/product-ids.generated.ts`: deleted (obsolete Dodo IDs, no consumers).

### Verification (2026-09-24)

- `npm run build`: passes (exit 0).
- `npm run typecheck`: clean.
- `npm run lint:boundaries`: clean.
- `git diff --check`: clean.
- `tests/panel-config-guardrails.test.mjs`: 23/23 pass.
- `tests/groundtruth-evidence-layer.test.mts`: 11/11 pass.
- Root `LICENSE` byte-identical; `cli/` + `sdk/*/` MIT licenses untouched.
- `AUDIT.md` remains untracked and uncommitted.

### Deliberate remaining WorldMonitor strings (compatibility/attribution, not branding)

- Internal identifiers, protocol/service names, generated namespaces and storage
  keys, existing API/header names, upstream URLs (`koala73/worldmonitor`,
  `worldmonitor.app`), and the preserved original-author attribution. Renaming
  any of these would break API compatibility, stored state, or attribution
  obligations; visible user-facing branding is GROUNDTRUTH throughout.

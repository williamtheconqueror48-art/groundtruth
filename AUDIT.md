# GROUNDTRUTH — Fork Audit & Strip Plan

**Source:** fork of `koala73/worldmonitor` (commit `793be04`, v2.10.0), AGPL-3.0-only.
**Audited:** 2026-09-23. **Method:** read-only audit (3 parallel deep-dives + coordinator verification). Nothing was modified.
**Goal:** strip to an evidence-first global incident/sensor dashboard (GROUNDTRUTH).

**Repo scale:** ~150 MB working tree (excl. `.git`), ~5,700 source files, 196 npm scripts, 257 env vars in `.env.example`.

**One-line architecture:** Vite + vanilla TypeScript SPA → Vercel edge API (`api/`, `server/`) → Upstash Redis (seeder-written caches) + Convex (durable history, auth, commercial tier) + Cloudflare KV/R2 (bootstrap payloads). Proto-first API contracts (`proto/` → `buf generate` → `src/generated/`). Data ingestion = ~150 one-shot `scripts/seed-*.mjs` cron jobs + one long-running relay (`scripts/ais-relay.cjs`).

---

## 1. Directory-by-directory map

| Dir | Files / Size | What it does (~2 lines) | Key entry files |
|---|---|---|---|
| `src/` | 924 / 19M | Browser SPA: vanilla TS + Vite. Boot, map renderers, 114 lazily-registered panels, services, variant wiring. | `src/main.ts` (boot) → `src/App.ts` (4261-line orchestrator) → `src/app/panel-layout.ts` (panel mounting) |
| `server/` | 505 / 5.1M | Vercel edge handler implementations, per-domain (`server/worldmonitor/<domain>/v1/`), plus shared helpers (`server/_shared/`). | `server/gateway.ts` (route wrapper: CORS/key/rate-limit/entitlement), `server/router.ts`, `server/worldmonitor/` (38 domains) |
| `api/` | 243 / 3.3M | Vercel edge route entries: thin `[rpc].ts` wrappers → generated sebuf stubs → `server/` handlers; plus MCP server, OAuth, internal endpoints. | `api/mcp.ts`, `api/mcp/handler.ts`, `api/<domain>/v1/[rpc].ts`, `api/api-route-exceptions.json` |
| `workers/` | 16 / 356K | Two Cloudflare workers: CORS-preflight short-circuit and Railway reconcile control plane. **Ops infra, not data ingestion.** | `workers/api-cors-preflight/`, `workers/railway-reconcile-control/` |
| `data/` | 6 / 116K | Static curated JSON (gamma irradiators, OREF translations, Telegram channels, X accounts). | `data/telegram-channels.json`, `data/x-accounts.json` |
| `convex/` | 177 / 3.6M | Convex backend: durable intel history, auth, **commercial tier** (payments/entitlements/apiKeys/plan-limits), crons (housekeeping only — no ingestion). | `convex/intelHistory.ts`, `convex/schema.ts`, `convex/crons.ts`, `convex/payments/` |
| `proto/` | 324 / 1.5M | Protobuf API contracts: 38 domain services + sebuf HTTP annotations. Source of truth for REST/RPC. | `proto/worldmonitor/<domain>/v1/*.proto`, `proto/buf.gen.yaml`, `proto/sebuf/` (vendored) |
| `shared/` | 211 / 2.5M | Edge-safe pure cores shared by browser/server/scripts: **correlation engines**, brief-LLM helpers, source tiers, RSS allowlists. | `shared/analysis-geo-convergence.ts`, `shared/brief-llm-core.js`, `shared/source-tiers.json` |
| `skills/` | 25 / 124K | 25 agent skill definitions (markdown + metadata) for the MCP/agent surface, e.g. `track-conflict-events`, `fetch-country-brief`. | `skills/<name>/` |
| `cli/` | 7 / 60K | Thin MCP-first CLI client (stdlib-only). **MIT licensed** (separate). | `cli/bin/worldmonitor.mjs` → `cli/src/run.mjs` → `cli/src/core.mjs` |
| `sdk/` | 16 / 104K | Thin MCP-first SDKs: Python, Ruby, Go (stdlib-only). **MIT licensed** (each with own LICENSE). | `sdk/python/src/worldmonitor_sdk/__init__.py`, `sdk/go/worldmonitor.go`, `sdk/ruby/lib/worldmonitor.rb` |
| `e2e/` | 168 / 2.7M | Playwright e2e incl. visual golden-screenshot tests per variant. | `playwright.config.ts`, `e2e/visual-*.spec.ts` |
| `tests/` | 2330 / 36M | Unit/contract/data tests (node --test, vitest). Largest dir by file count. | `vitest.config.mts`, `tests/*.test.mjs` |
| `scripts/` | 870 / 16M | **The data pipeline lives here:** ~150 `seed-*.mjs` one-shot ingestors, `_seed-utils.mjs` engine, `ais-relay.cjs`, lint/enforce scripts, codegen. | `scripts/_seed-utils.mjs`, `scripts/seed-correlation.mjs`, `scripts/ais-relay.cjs` |
| `public/` | 142 / 7.6M | Static web assets: favicons (per-variant), generated openapi.yaml, blog output target. | `public/favico/{tech,finance,…}/`, `public/openapi.yaml` (generated) |
| `deploy/` | 1 / 4K | Nginx brotli API-proxy config fragment. | `deploy/nginx/brotli-api-proxy.conf` |
| `docker/` | 26 / 252K | Dockerfiles (app, relay, umami, redis-rest proxy, digest-notifications…), nginx configs, entrypoints. | `docker/Dockerfile`, `docker-compose.yml` (root) |

Also notable (not in the requested list but load-bearing):
- `src/generated/` (1.3M) — **buf/sebuf-generated** TS RPC clients+server stubs. Never hand-edit; regenerate with `buf generate` (needs buf + sebuf v0.11.1 per AGENTS.md).
- `blog-site/` — standalone Astro blog, built into `public/blog` by npm scripts. Zero imports from `src/`.
- `src-tauri/` — Tauri 2 Rust desktop shell + Node sidecar. Only coupled via `desktop:*` npm scripts and inert `__TAURI__` guards.
- `middleware.ts` (19K) — edge middleware (auth/bot/redirects).
- `vercel.json` (57K) — variant-subdomain rewrites + host redirects; needs surgery (see §4).
- `vite.config.ts` (79K) — variant HTML plugin (`wm-dashboard-html-output`, `activeVariant` ~line 861); needs surgery (see §4).

---

## 2. Load-bearing core (KEEP) — exact files

### (a) Map engine + layer catalog
- `src/main.ts` — boot (telemetry, SW, then `new App('app').init()`)
- `src/App.ts` — 4261-line app orchestrator (8 init phases)
- `src/components/MapContainer.ts` — renderer dispatcher (deck.gl / globe / SVG fallback)
- `src/components/DeckGLMap.ts` — primary WebGL renderer (maplibre-gl + deck.gl, 8373 lines)
- `src/components/GlobeMap.ts` — 3D globe (globe.gl, 4099 lines)
- `src/components/Map.ts` — D3/SVG 2D fallback (mobile/no-WebGL, 5050 lines)
- `src/config/map-layer-definitions.ts` — **THE layer catalog**: `LAYER_REGISTRY` with **58 keys** (not 25), each `{icon, i18n label, renderers[], premium?}`; `VARIANT_LAYER_ORDER`; helpers `getLayersForVariant`, `sanitizeLayersForVariant`, `isLayerExecutable`, `LAYER_EXPLANATIONS`
- `src/services/webmcp-map-layer-catalog.ts` — agent-facing `list_map_layers` on the same registry
- `src/types/index.ts:662` — `MapLayers` interface (58 boolean keys)
- `src/app/panel-layout.ts` — 114 lazy panel registrations; dynamically imports `MapContainer` (line 2708) to keep WebGL off the eager graph

### (b) Data ingestion workers + source catalog
- `scripts/_seed-utils.mjs` — seeder engine: `runSeed(domain, resource, canonicalKey, fetchFn, opts)` (line 2434); Redis locking, staging writes, TTLs, last-good-on-failure
- `scripts/seed-*.mjs` (~150 files) — one-shot per-stream ingestors writing canonical Redis keys (`<domain>:<resource>:v1`); cron-scheduled (Railway/Docker), TTLs encode cadence
- `scripts/ais-relay.cjs` — long-running WebSocket relay: aisstream.io (AIS), OpenSky, OREF rocket alerts, RSS, Telegram (run via `Dockerfile.relay`)
- `scripts/seed-correlation.mjs` — batch correlation job → `correlation:cards-bootstrap:v1` (5-min cadence)
- `scripts/seed-cross-source-signals.mjs` — cross-domain roll-up → `intelligence:cross-source-signals:v1` (15-min cadence, per-key max-age gates over ~24 domain keys)
- `scripts/validate-rss-feeds.mjs` + `scripts/_feed-health.mjs` — feed health polling → `news:feed-health:v1`
- Source registries: `server/worldmonitor/news/v1/_feeds.ts` (server RSS registry), `src/config/feeds.ts` (client RSS registry), `shared/rss-allowed-domains.json` (SSRF allowlist), `shared/source-tiers.json` (publisher tiers 1–4), `shared/source-attribution-manifest.json` (upstream host inventory), `docs/data-sources.mdx` (human catalog: provider/feed-tier/license-posture)
- Server consumers: `server/worldmonitor/<domain>/v1/*.ts` handlers read the Redis caches (via `api/_upstash-json.js`)

### (c) Correlation / convergence detection
All in `shared/`, pure dependency-free (browser/Edge/server-safe):
- `shared/analysis-geo-convergence.ts` — **THE convergence core**: collapses feeds to lat-lon-time points; alerts on ≥3 distinct domains co-occurring in one cell within 24h. **KEEP**
- `shared/analysis-focal-points.ts` — entity focal-point detector (news entity mentions × map signals → ranked "main characters"). **KEEP**
- `shared/analysis-alert-digest.ts` — cross-domain alert digest ("what tripped a threshold today?"). **KEEP**
- `shared/analysis-composite-adapters.ts` — shape adapters mapping seeded Redis payloads → digest inputs (pins the Redis key contract). **KEEP**
- `shared/analysis-hotspot-escalation.ts` — hotspot score blending news/CII/geo-convergence/military (weights 0.35/0.25/0.25/0.15). **KEEP**
- `shared/analysis-military-surge.ts` — single-domain military surge detector (useful, not cross-stream). Keep if wanted.
- `shared/analysis-temporal-severity.ts` — z-score threshold constants (1.5/2.0/3.0). Trivial, keep.
- `shared/analysis-infrastructure-cascade.ts` — BFS cascade simulator over infra dependency graphs (planning tool, optional).
- Client wrappers: `src/services/geo-convergence.ts`, `src/services/focal-point-detector.ts`, `src/services/hotspot-escalation.ts`, `src/services/military-surge.ts`

### (d) MCP server + REST API
- `api/mcp.ts` → `api/mcp/handler.ts` (JSON-RPC dispatch, protocol 2025-06-18) → `api/mcp/dispatch.ts` → `api/mcp/registry/` (44 tools: `rpc-tools.ts`, `analysis-tools.ts`, `cache-tools.ts`, `source-tools.ts`, `nlp-tools.ts`, `company-intel-tools.ts`)
- `mcp.json` — public MCP config (URLs need rebranding)
- `api/<domain>/v1/[rpc].ts` — 8-line route wrappers, e.g. `createConflictServiceRoutes(conflictHandler, serverOptions)` from `src/generated/server/...`
- `server/router.ts` — route table; `server/gateway.ts` (2680 lines) — **the choke point**: CORS + API-key + rate-limit + entitlement + cache + attribution + error mapping. **Keep CORS/key/rate-limit/cache; strip entitlement.**
- `api/api-route-exceptions.json` — non-proto endpoints manifest (MCP, OAuth, A2A, NLWeb, ops)
- Proto contracts: `proto/worldmonitor/<domain>/v1/*.proto` → `buf generate` → `src/generated/{client,server}` + `docs/api/*.openapi.{yaml,json}`
- `cli/` + `sdk/{python,ruby,go}/` — thin MCP-first clients (see §6 for license split)

### (e) Caching (4 layers per ARCHITECTURE.md §9)
1. **Upstash Redis (primary):** seeder payloads under `<domain>:<resource>:v1`; write via `scripts/_seed-utils.mjs` → `UPSTASH_REDIS_REST_URL/TOKEN`; read via `api/_upstash-json.js`; rate-limit/quota also in Redis (`api/_rate-limit.js`, `api/_api-key-rate-limit.js`)
2. **Cloudflare KV/R2 (bootstrap tiers):** `scripts/_kv-storage.mjs`, `scripts/_r2-storage.mjs` publish pre-built payloads consumed via `api/_bootstrap-public-payload.js`, `api/_bootstrap-r2.js`; key refs in `server/worldmonitor/_bootstrap-cache-key-refs.ts` (generated)
3. **CDN:** Cloudflare edge rules (`scripts/cloudflare-cache-rule.mjs`)
4. **Service worker:** client-side staleness (registered in `src/main.ts`)
- Supporting: `server/_shared/cache-keys.ts`, `server/_shared/cache-contract.ts`, `shared/correlation-runtime-mode.js`

---
## 3. Strip list — exact dirs/files safe to delete

### Tier 1 — delete with near-zero coupling (no src/ imports)

| Target | Size | Coupling / what breaks |
|---|---|---|
| `blog-site/` | Astro blog | Only `package.json` scripts `build:blog`, `build:blog:raw`, `prebuild:blog`, `ci:blog-site`. Nothing in `src/` imports it. |
| `src-tauri/` | Rust desktop + sidecar | `desktop:*`, `tauri`, `test:sidecar` scripts; `@tauri-apps/cli` dep. Web code has inert `__TAURI__` guards (safe to leave or remove). |
| `src/styles/happy-theme.css` | CSS | Lazy-loaded in `src/main.ts` for happy variant only. |
| `public/favico/{tech,finance,commodity,happy,energy}/` | icons | Referenced by variant HTML only. |
| `src/config/variants/{tech,finance,commodity,energy,happy}.ts` | 5 files | **Runtime dead** — only imported by `scripts/build-sitemap.mjs`. |
| `src/config/variant-dashboard-html.ts`, `variant-meta.ts`, `variant-seo-summaries.ts` | 3 files | Build-time variant HTML gen. Consumers: `vite.config.ts` plugin (remove together), `src/services/meta-tags.ts`, `src/app/event-handlers.ts`. |
| `src/bootstrap/variant-theme.ts` | 1 file | Consumers: `src/main.ts`, `src/bootstrap/sentry-init.ts`. |
| `workers/` (both) | 16 files | CORS-preflight edge worker + Railway reconcile control plane. Delete only if rebuilding API infra; safe otherwise. |
| `docker/umami/` | analytics patches | Umami self-host analytics; delete with analytics. |
| `Dockerfile.digest-notifications`, `Dockerfile.publish-bootstrap-tiers`, `Dockerfile.seed-bundle-*`, `Dockerfile.umami*` | 6 files | Per-purpose images; keep `Dockerfile` + `Dockerfile.relay` (seeders/relay). |

**KEEP:** `src/config/variants/base.ts` (`STORAGE_KEYS`, `DEFAULT_MAP_MODE` widely imported).

### Tier 2 — variant-only panels (each needs its `panel-layout.ts` registration lines + `panels.ts` key + `components/index.ts` re-export removed)

- happy-only: `PositiveNewsFeedPanel.ts`, `GoodThingsDigestPanel.ts`, `GivingPanel.ts` (+ `giving-renderer.ts`), `HeroSpotlightPanel.ts`, `BreakthroughsTickerPanel.ts`, `SpeciesComebackPanel.ts`, `RenewableEnergyPanel.ts`, `CountersPanel.ts`, `ProgressChartsPanel.ts`
- tech-only: `RegulationPanel.ts`, `InternetDisruptionsPanel.ts` (also referenced in `data-loader.ts`), `ServiceStatusPanel.ts` (also `App.ts`, `services/infrastructure/index.ts`)
- finance-only: `NqPulsePanel.ts`, `NqCatalystsPanel.ts` (also `App.ts`), `InvestmentsPanel.ts`
- energy-only: `ChokepointStripPanel.ts` (also `App.ts`, `PipelineStatusPanel.ts`)
- finance/energy panels that ARE in `FULL_PANELS` and need registry surgery (keep files, remove keys): `DailyMarketBriefPanel`, `BigMacPanel`, `CotPositioningPanel`, `StockAnalysisPanel`, `StockBacktestPanel`, `WsbTickerScannerPanel`, `FearGreedPanel`, `AAIISentimentPanel`, `MacroSignalsPanel`, `MacroTilesPanel`, `FSIPanel`, `YieldCurvePanel`, `EarningsCalendarPanel`, `EconomicCalendarPanel`, `LiquidityShiftsPanel`, `PositioningPanel`, `GoldIntelligencePanel`, `HormuzPanel`, `OilInventoriesPanel`, `EnergyComplexPanel`, `EnergyCrisisPanel`, `EnergyDisruptionsPanel`, `EnergyRiskOverviewPanel`, `PipelineStatusPanel`, `StorageFacilityMapPanel`, `FuelShortagePanel`, `FuelPricesPanel`, `ConsumerPricesPanel`, `GroceryBasketPanel`, `FaoFoodPriceIndexPanel`, `MarketImplicationsPanel`, `GulfEconomiesPanel`
- **Do NOT delete `MarketPanel.ts`** — shared markets/crypto/commodities renderer used by core `full` keys.
- `*-news` variant keys (`markets-news`, `crypto-news`, …) need no file deletes — they're `src/app/news-panel-keys.ts` mappings to generic `NewsPanel`.
- Variant geo-data: `commodity-geo.ts`, `commodity-markets.ts`, `gulf-fdi.ts` deletable; **keep** `tech-geo.ts`, `ai-datacenters.ts`, `finance-geo.ts` (imported by DeckGLMap/GlobeMap/Map for core layers).

### Tier 3 — server domains to drop (GROUNDTRUTH keeps incident/sensor domains)

Drop `server/worldmonitor/` + `proto/worldmonitor/` + `api/` routes for: `market`, `consumer-prices`, `giving`, `positive-events`, `forecast`, `prediction`, `scenario`, `scorecard`, `trade`, `supply-chain`, `shipping` (unless vessel-tracking wanted — decide), `economic`. Keep: `conflict`, `military`, `unrest`, `intelligence`, `news`, `natural`, `seismology`, `wildfire`, `climate`, `aviation`, `maritime`, `cyber`, `infrastructure`, `displacement`, `health`, `radiation`, `sanctions`, `safety`, `webcam`, `imagery`, `thermal`, `resilience`, `research`, `leads`.
- **Proto regen required** after dropping domains: edit `proto/worldmonitor/<domain>/` then `buf generate` (buf + sebuf v0.11.1). **Never hand-edit `src/generated/`** (AGENTS.md boundary).
- Alternatively phase 1: delete only `server/worldmonitor/<domain>/` handlers + `api/<domain>/` routes and leave generated stubs (dead code, harmless) — regen later.

### Tier 4 — commercial/pro tier (strip entirely)
- `convex/payments/` (15 files: Dodo billing/checkout/webhooks), `convex/entitlements.ts`, `convex/lib/entitlements.ts`, `convex/config/productCatalog.ts`, `convex/apiKeys.ts`, `convex/apiPlanLimit{Emails,Notices,Usage}.ts`, `convex/broadcast/`, `convex/resendWebhookHandler.ts`, `convex/emailSuppressions.ts`, `convex/registerInterest.ts`, `convex/mcpProTokens.ts`, `convex/embedKeys.ts`, `convex/companyMonitoring/`, `convex/lib/dodo.ts`
- `server/gateway.ts` — excise the entitlement/tier-check layer (keep CORS/key/rate-limit/cache)
- `api/mcp/auth.ts` — remove `runProPreChecks`/`validateProMcpAuthorization`; collapse `FREE_TIER_TOOL_NAMES` gating to a single open tier
- Delete: `api/create-checkout.ts`, `api/customer-portal.ts`, `api/_bootstrap-tier-keys.js`, `api/_bootstrap-public-tier.js`, `api/oauth/authorize-pro.ts`, `api/internal/mcp-grant-mint.ts`, `mcp-grant.html` + `src/mcp-grant-main.ts`, `server/_mcp-grant-hmac.ts`
- `src/app/free-tier-gate.ts`, `src/app/pro-activation-controller.ts`, `src/services/panel-gating.ts`, `src/services/premium-fetch.ts`, `src/services/premium-denial.ts`, `src/services/analyst-denial.ts`
- Env: all `DODO_*`, `CLERK_*`, `VITE_CLERK_*`, `MCP_PRO_GRANT_HMAC_SECRET`

### package.json scripts — survival analysis (196 total)
**Delete 40** (verified by name pattern):
- Variants: `dev:tech`, `dev:finance`, `dev:happy`, `dev:commodity`, `dev:energy`, `build:tech`, `build:finance`, `build:happy`, `build:commodity`, `build:energy` (+ 5 `prebuild:*`)
- Blog/pro/desktop: `ci:blog-site`, `prebuild:blog`, `build:blog`, `build:blog:raw`, `build:pro`, `prebuild:desktop`, `build:desktop`
- Desktop: `desktop:dev`, `desktop:check-env`, `desktop:check-rust-floors`, `desktop:tauri:build`, `desktop:package{,-macos,-windows}{,-sign}`, `tauri`
- Visual e2e per variant: `test:e2e:tech`, `test:e2e:visual{,:full,:tech}`, `test:e2e:visual:update{,:full,:tech}`, `test:sidecar`, `bundle:budgets:pro`
**Survive:** `dev`, `build`, `build:full`, `preview`, `typecheck`, `typecheck:api`, `typecheck:all`, `test:convex` (vitest), `test:dom`, `test:e2e:full`, `test:e2e:chrome`, `test:data`, `test:feeds`, all `lint:*` (incl. `lint:boundaries` — import direction `types→config→services→components→app→App.ts`), `prebuild`/`postinstall` (after removing blog/pro steps from `build`), `product:facts`, `build:openapi`, `build:agent-skills`, `notices`, `legal:*`.
**Must edit:** `build` currently chains `build:blog:raw` + `build:pro` — remove those two steps. `prebuild` chains docs/product/openapi/agent-skills — keep.

---
## 4. Variant system — how it's wired, minimal collapse

**Registry:** `src/config/variant.ts` — `SITE_VARIANTS = ['full','tech','finance','happy','commodity','energy']`. **39 files import `SITE_VARIANT`.**

**Resolution order** (`SITE_VARIANT` IIFE):
1. Build flag: `import.meta.env.VITE_VARIANT` (set by `dev:tech` etc. / `build:tech` etc. via `cross-env`)
2. Hostname: `tech.`/`finance.`/`happy.`/`commodity.`/`energy.` subdomain prefix → variant (web)
3. localStorage `worldmonitor-variant` (Tauri desktop / localhost)
4. Default `'full'`

**Wiring points:**
- Panels: `src/config/panels.ts` — `FULL_PANELS` (77 keys) / `TECH_PANELS` (14) / `FINANCE_PANELS` (48) / `HAPPY_PANELS` (1) / `COMMODITY_PANELS` (27) / `ENERGY_PANELS` (21); `ALL_PANELS` merges **all statically — every panel ships in every bundle**; `VARIANT_DEFAULTS`, `VARIANT_PANEL_OVERRIDES`, `getEffectivePanelConfig`, `isPanelNativeToVariant`
- Layers: `src/config/map-layer-definitions.ts` — `VARIANT_LAYER_ORDER` per variant (`'full'` = 39 keys, 38 live); `MapVariant` type
- HTML: `src/config/variant-dashboard-html.ts` (+ `variant-meta.ts`, `variant-seo-summaries.ts`) generates `dashboard-<variant>.html` at build via vite plugin `wm-dashboard-html-output` (`vite.config.ts` ~lines 303/344, `activeVariant` ~line 861)
- Hosting: `vercel.json` lines 143–147 rewrite `<variant>.worldmonitor.app/dashboard` → `/dashboard-<variant>.html`, plus dozens of host-conditioned www redirects
- Desktop: one Tauri binary switches variants in-app (`src/config/variant.ts` Tauri branch; `tests/desktop-one-binary-model.test.mjs` pins the list)
- Theme: `src/bootstrap/variant-theme.ts` + `src/styles/happy-theme.css` (lazy in `main.ts`) + `public/favico/{tech,finance,commodity,happy,energy}/`
- Sitemap: `scripts/build-sitemap.mjs` imports the dead variant files in `src/config/variants/`

**Minimal collapse to a single app:**
1. `src/config/variant.ts`: hardcode `export const SITE_VARIANT = 'full'`; delete `SITE_VARIANTS`, `isSiteVariant`, hostname/localStorage branching
2. `src/config/panels.ts`: delete the five non-full registries + `VARIANT_DEFAULTS` variants + `VARIANT_PANEL_OVERRIDES`; keep one panel set; collapse `MapVariant` to `'full'` in `map-layer-definitions.ts`
3. Delete `src/config/variants/{tech,finance,commodity,energy,happy}.ts`, `variant-dashboard-html.ts`, `variant-meta.ts`, `variant-seo-summaries.ts`; fix refs in `scripts/build-sitemap.mjs`, `src/services/meta-tags.ts`, `src/app/event-handlers.ts`
4. `vite.config.ts`: remove variant HTML plugin + `activeVariant`; `vercel.json`: remove variant rewrites/redirects; `package.json`: remove 40 variant/blog/pro/desktop scripts (see §3)
5. Delete `src/bootstrap/variant-theme.ts`, `src/styles/happy-theme.css`, `public/favico/{tech,finance,commodity,happy,energy}/`
6. `src/services/runtime.ts` — `DEFAULT_REMOTE_HOSTS` keyed by variant; simplify to one host set

---

## 5. AI-brief pipeline — call sites and removal plan

**Server-side** (`server/_shared/llm.ts` — providers: Groq `GROQ_API_KEY`, OpenRouter `OPENROUTER_API_KEY`, Ollama `OLLAMA_API_URL/OLLAMA_API_KEY` + allowlist):
- `server/worldmonitor/intelligence/v1/get-country-intel-brief.ts` — country briefs via `callLlm`, with grounding validators (`verifyCitationIndexes`, `checkLeadGrounding`, `validateNoHallucinatedProperNouns/Facts` from `shared/brief-llm-core.js`); premium-gated (`isCallerPremium`); 6h Redis cache
- `server/worldmonitor/intelligence/v1/classify-event.ts` — headline severity classification via OpenRouter `deepseek/deepseek-v4.1-flash` (precision-pinned by `tests/classify-alert-label-precision.test.mjs`)
- `server/worldmonitor/intelligence/v1/chat-analyst-*.ts` — chat analyst prompts/context/actions
- `server/worldmonitor/intelligence/v1/deduct-situation.ts` + `deduction-prompt.ts` — "deduction" panel
- `api/internal/brief-why-matters.ts` — edge "why this matters" one-liner (shared prompt in `shared/brief-llm-core.js`, mirrored byte-for-byte to `scripts/shared/brief-llm-core.js` per parity test)
- `scripts/lib/brief-llm.mjs` — Railway cron fallback for the same enrichment path

**Client-side** (`src/services/summarization.ts` — header: *"Fallback: Ollama → Groq → OpenRouter → Browser T5"*):
- Calls `NewsServiceClient.summarizeArticle()` sebuf RPC (server does the LLM call); browser fallback = `src/workers/ml.worker.ts` (**@xenova/transformers**: T5 summarization, embeddings, sentiment, NER) via `src/services/ml-worker.ts`
- `src/app/country-intel.ts` `fetchCountryIntelBrief` (~line 1200) → `GET /api/intelligence/v1/get-country-intel-brief`; on failure tells users to "Configure GROQ_API_KEY in Settings"; T5 fallback at ~line 887
- `src/components/ChatAnalystPanel.ts` → `/api/chat-analyst`
- `src/components/LatestBriefPanel.ts` → `/api/latest-brief`
- `src/components/InsightsPanel.ts`, `GoodThingsDigestPanel.ts` → `generateSummary(...)`
- `src/services/daily-market-brief.ts` + `DailyMarketBriefPanel.ts` — server-generated finance brief
- `src/App.ts` lines 2468–2540 — `mlWorker.init()` loads summarization/embeddings models at boot
- `src/services/ollama-models.ts` — Settings UI probing `GET <ollamaUrl>/api/tags`

**Removal plan (replace with raw-record display):**
1. Delete UI: `CountryBriefPanel.ts`, `CountryBriefOutput.ts`, `CountryBriefPage.ts`, `country-brief-presentation.ts`, `ChatAnalystPanel.ts`, `InsightsPanel.ts`, `LatestBriefPanel.ts`, `DailyMarketBriefPanel.ts`, `MarketImplicationsPanel.ts`, `LlmStatusIndicator.ts`, `src/app/country-intel.ts`, `src/app/news-digest-acceptance.ts`, `src/app/news-feed-rotation.ts`, `src/services/summarization.ts`, `summarize-gate.ts`, `summarization-outcome.ts`, `ollama-models.ts`, `ml-worker.ts`, `src/workers/ml.worker.ts`, `daily-market-brief.ts`, `insights-loader.ts`, `trending-keywords.ts` (+ panel-layout registrations, panels.ts keys, components/index.ts re-exports)
2. Delete server: `get-country-intel-brief.ts`, `classify-event.ts`, `chat-analyst-*.ts`, `deduct-situation.ts`, `deduction-prompt.ts`, `get-country-coverage.ts` (if brief-only), `api/internal/brief-why-matters.ts`, `scripts/lib/brief-llm.mjs`, `server/_shared/llm.ts`, `llm-sanitize.*`, `llm-health.ts`, `direct-llm-quota.ts`
3. Delete shared: `shared/brief-llm-core.js` (+ `.d.ts`) and `scripts/shared/brief-llm-core.js` mirror, `shared/brief-envelope.*`, `shared/brief-filter.*`, `shared/llm-health-providers.*`, `shared/ai-tokens.json`
4. Env: drop `GROQ_*`, `OPENROUTER_*`, `OLLAMA_*`, `LLM_*`, `BRIEF_*`
5. **Watch-outs:** `src/services/oref-alerts.ts` imports `translateText` from `summarization.ts` (Israel siren alerts — keep a tiny stub or retain); `ChatAnalystPanel` deletion orphans `services/analyst-denial.ts`/`premium-denial.ts`/`shared/premium-paths.ts` (delete too); `@xenova/transformers` dep removable from package.json (also kills the browser T5 download at boot — good for brutalist performance)
6. **Replacement:** raw-record panels read the same Redis keys the briefs summarized (e.g. `conflict:ucdp-events:v1`, `news:feed-health:v1`) — the evidence store from our roadmap plugs in here

---

## 6. License compliance (AGPL-3.0)

**Verified:**
- Root `LICENSE` = GNU AGPL-3.0 full text ("Version 3, 19 November 2007"). `package.json`: `"license": "AGPL-3.0-only"`.
- **Split licensing:** `cli/LICENSE`, `sdk/python/LICENSE`, `sdk/ruby/LICENSE`, `sdk/go/LICENSE` are **MIT**, `Copyright (c) 2026 Elie Habib`. Server/web = AGPL copyleft; the four client packages are permissive.
- **No NOTICE/NOTICES/THIRD-PARTY files** in repo. `scripts/generate-third-party-notices.mjs` only generates desktop-bundle notices → `src-tauri/notices/` (deleted with desktop — not needed).
- **No per-file copyright headers** in project source (sampled 15 files across src/server/api/shared/cli/sdk/proto; repo-wide "copyright" grep finds only third-party attributions: Protomaps/OSM basemap in `src/config/basemap-styles.ts`, Eurostat label in `server/worldmonitor/resilience/v1/_indicator-source-policy.ts`).
- No DCO/CLA in CONTRIBUTING.md.

**What we must preserve/do:**
1. Keep root `LICENSE` **verbatim** — the license text forbids changing it.
2. **AGPL §5 (modified versions):** mark modified files with prominent notices stating we changed them + date. Upstream has no headers, so we start clean — add notices going forward (a `MODIFICATIONS.md` or header comments on touched files both satisfy "prominent").
3. **AGPL §13 (network copyleft):** if GROUNDTRUTH runs as a network service, offer every user the Corresponding Source — a public repo link in the footer/about page suffices.
4. Keep the MIT `LICENSE` files in `cli/` and `sdk/*/` **with Elie Habib's copyright line intact** (MIT requires copyright + permission notice to travel with copies). We may add our own copyright line above his; we must not remove his. If we rename the npm/PyPI/gem/Go packages, keep the MIT text.
5. Preserve runtime third-party attributions that ship in the product: Protomaps/OSM basemap attribution, Eurostat labels, MapLibre/deck.gl/globe.gl license notices in the bundle.
6. `skills/` are published product recipes (AGPL, same root license) — keep or rewrite; several are brief/finance-flavored (`fetch-country-brief`, `fetch-news-digest`, `get-market-quotes`, `get-prediction-markets`) and should be deleted/rewritten for GROUNDTRUTH.
7. Cheap and correct: keep an "originally forked from koala73/worldmonitor" line in the README (not legally required, correct practice).
8. `docs/` license summaries (`docs/license.mdx`) reference WorldMonitor branding — rewrite during rebrand.

---

## 7. Risks

### Generated / dead / suspicious code
- `src/config/variants/{tech,finance,commodity,energy,happy}.ts` — runtime dead (only sitemap script imports them).
- `src/config/index.ts` — `COMMODITY_MINERS` export commented out (dead ref to `commodity-miners.ts`).
- `src/components/index.ts` — verified: **zero dangling re-exports** (all targets exist). Do not trim without removing registrations.
- `api/mcp/skill-extension/generated.ts` — generated by `scripts/build-agent-skills-index.mjs`; will go stale if skills change without regen.
- `api/mcp-proxy.ts` (1046 lines) — a **second** MCP server implementation alongside `api/mcp/`; purpose unclear, review before keeping both.
- `resources/subscribe` deliberately unimplemented in `api/mcp/handler.ts` (~line 1118) — optional per MCP spec, not a bug.
- `shared/brief-llm-core.js` committed as compiled JS with a byte-parity mirror in `scripts/shared/` — brittle; both deleted in our strip anyway.
- `tests/` is 36 MB / 2330 files — heavy; many tests pin stripped behavior (e.g. `classify-alert-label-precision.test.mjs`, `desktop-one-binary-model.test.mjs`). Expect to delete/update a large fraction.
- `e2e/` visual golden screenshots are per-variant — regenerate baselines after the brutalist reskin.

### Secrets scan — CLEAN
- Grep for `BEGIN PRIVATE KEY`, `sk-[A-Za-z0-9]{16,}`, `ghp_/xoxb_/xoxp_`, `AKIA`, literal `password|api_key|secret|token` assignments: **0 hits**. The only two `password` hits are redaction logic (`docker/redis-rest-proxy.mjs:38`, `src/utils/export.ts:464`) — defensive, not leaky.
- `.env.example` = **names only, ~180–257 keys, no values**. Safe.

### External services the app depends on at runtime (post-strip survivors in bold)
- **Data (keep):** **ACLED** (`ACLED_EMAIL/PASSWORD/ACCESS_TOKEN`), **UCDP** (`UCDP_ACCESS_TOKEN`), **Wingbits ADS-B** (`WINGBITS_API_KEY`), **OpenSky** (`OPENSKY_CLIENT_ID/SECRET`), **aisstream.io** (`AISSTREAM_API_KEY`), **NASA FIRMS** (`NASA_FIRMS_API_KEY`), **adsb.lol / airplanes.live / adsb.fi** (keyless), **AviationStack** (`AVIATIONSTACK_API`), **GDELT** (bulk), **USGS earthquakes** (keyless), **ReliefWeb** (`RELIEFWEB_APPNAME`), **URLhaus** (`URLHAUS_AUTH_KEY`), **AbuseIPDB** (`ABUSEIPDB_API_KEY`), **OTX** (`OTX_API_KEY`), **Open-Meteo** (keyless), **WAQI/OpenAQ** (air quality)
- **AI (delete with briefs):** Groq, OpenRouter, Ollama, Firecrawl, Brave/Exa search
- **Finance (delete):** FRED, EIA, ECB/Eurostat, Finnhub, CoinGecko, Yahoo Finance
- **Infra (keep):** **Upstash Redis** (`UPSTASH_REDIS_REST_URL/TOKEN`) — **the** primary data store; **Cloudflare KV/R2** (`KV_BOOTSTRAP_*`, `CLOUDFLARE_R2_*`) — bootstrap payloads; **Convex** (`CONVEX_URL`, `CONVEX_DEPLOY_KEY`) — intel history + (stripped) auth; **Vercel** — hosting/edge; **Railway** — seeder cron + relay; **Cloudflare Workers** — CORS preflight (deletable)
- **Commercial (delete):** Clerk (`CLERK_*`), Dodo payments (`DODO_*`), Resend (`RESEND_API_KEY`)
- **Observability (decide):** Sentry (`VITE_SENTRY_DSN`), Umami (self-hosted analytics), Turnstile (bot protection), VAPID (push)
- **Social feeds (decide):** X (`X_BEARER_TOKEN`), Telegram (`TELEGRAM_API_ID/HASH/SESSION`), Reddit, Discord/Slack OAuth

### Build/dev feasibility
- **Node 24** required (`.nvmrc`; `package.json` has no `engines` field — add one during cleanup).
- `npm install` then `npm run dev` (vite) — app runs with **no env vars** per README; feature data sources degrade gracefully without keys.
- Full `npm run build` currently chains blog + pro builds — both removed in strip; then `tsc && vite build`.
- **No native/Rust deps** in the web path (sharp/esbuild only as build tooling; Tauri/Rust only in `src-tauri/` which we delete). No node-gyp risk for the stripped app.
- `convex` ^1.28 in deps — `npm run typecheck:api` + `test:convex` (vitest) cover it; Convex dev deployment needed for intel-history features.
- Proto changes need `buf` + sebuf v0.11.1 (`make generate`); **never hand-edit `src/generated/`**.
- Import boundaries enforced by `scripts/lint-boundaries.mjs` (`types→config→services→components→app→App.ts`); run `npm run lint:boundaries` after the strip.
- `npm run agent:preflight -- --mode review` is the repo's own readiness gate (per its AGENTS.md) — worth running before the strip begins.

### Strategic risks
- **Upstream velocity:** 7,739 commits, releases ongoing. We fork and diverge — no merges back. Rebase is not planned; cherry-picks only if a security fix lands upstream.
- **Seeder sprawl:** ~150 seeders each with own cadence/keys; the strip must be per-seeder (keep incident/sensor, drop finance/market). `scripts/_seed-utils.mjs` is the one file that must not break.
- **Convex lock-in for history:** `get-intel-timeline` / `get-similar-events` read `convex/intelHistory.ts` — our timeline-reconstruction feature inherits this dependency. Decide: keep Convex or migrate history to our own store (Postgres/Neon, consistent with SIR-WATCH).
- **The evidence layer is greenfield:** the fork gives us the stage (map, layers, ingestion, API, MCP). Record store + entity resolution + claim tiers + timeline reconstruction are all new code — that's the actual GROUNDTRUTH differentiator and the bulk of the work.

---

## Appendix: quick reference — where things live

| Need | Path |
|---|---|
| Boot the app | `index.html` → `src/main.ts` → `src/App.ts` |
| Add/remove a map layer | `src/config/map-layer-definitions.ts` (`LAYER_REGISTRY`) |
| Add/remove a panel | `src/config/panels.ts` + `src/app/panel-layout.ts` + `src/components/index.ts` |
| Add a data stream | `scripts/seed-<name>.mjs` (via `scripts/_seed-utils.mjs`) → Redis key → `server/worldmonitor/<domain>/v1/` handler → `proto/worldmonitor/<domain>/v1/` → `buf generate` |
| Add an MCP tool | `api/mcp/registry/` → `api/mcp/dispatch.ts` |
| Cache contract | `server/_shared/cache-keys.ts`, `shared/correlation-runtime-mode.js` |
| Correlation logic | `shared/analysis-*.ts` (pure, testable anywhere) |
| Kill a variant | §4 checklist |
| Kill AI briefs | §5 checklist |
| Stay license-clean | §6 checklist |

*End of audit. All findings verified by reading files; no code was modified.*

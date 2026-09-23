import type { PanelConfig, MapLayers, DataSourceId } from '@/types';
import { SITE_VARIANT } from './variant';
// boundary-ignore: isDesktopRuntime is a pure env probe with no service dependencies
import { isDesktopRuntime } from '@/services/runtime';
// boundary-ignore: getSecretState is a pure env/keychain probe with no service dependencies
import { getSecretState } from '@/services/runtime-config';
// boundary-ignore: isEntitled is a pure state check with no side effects
import { isEntitled } from '@/services/entitlements';

const _desktop = isDesktopRuntime();

// Iran-events domain sunset (war ended 2026-07). Default OFF: iranAttacks is
// disabled in every variant default so DEFAULT_MAP_LAYERS agrees with the gated
// layer registry (getAllowedLayerKeys strips it). Guarded so node:test — where
// import.meta.env is undefined — resolves it OFF at module load. See
// map-layer-definitions.ts and tests/browser-bundle-secret-guard (allowlist).
const IRAN_ATTACKS_ENABLED = typeof window !== 'undefined' && import.meta.env.VITE_ENABLE_IRAN_ATTACKS === 'true';

// ============================================
// FULL VARIANT (Geopolitical)
// ============================================
// Panel order matters! First panels appear at top of grid.
// Desired order: live-news, AI Insights, AI Strategic Posture, cii, strategic-risk, then rest
const FULL_PANELS: Record<string, PanelConfig> = {
  map: { name: 'Global Map', enabled: true, priority: 1 },
  'live-news': { name: 'Live News', enabled: true, priority: 1 },
  'live-webcams': { name: 'Live Webcams', enabled: true, priority: 1 },
  'windy-webcams': { name: 'Windy Live Webcam', enabled: false, priority: 2 },
  'threat-timeline': { name: 'Threat Timeline', enabled: true, priority: 1 },
  'strategic-posture': { name: 'AI Strategic Posture', enabled: true, priority: 1 },
  forecast: { name: 'AI Forecasts', enabled: true, priority: 1, ...(_desktop && { premium: 'locked' as const }) }, // trial: unlocked on web, locked on desktop
  cii: { name: 'Country Instability', enabled: true, priority: 1, ...(_desktop && { premium: 'enhanced' as const }) },
  'strategic-risk': { name: 'Strategic Risk Overview', enabled: true, priority: 1, ...(_desktop && { premium: 'enhanced' as const }) },
  intel: { name: 'Intel Feed', enabled: true, priority: 1 },
  'gdelt-intel': { name: 'Live Intelligence', enabled: true, priority: 1, ...(_desktop && { premium: 'enhanced' as const }) },
  cascade: { name: 'Infrastructure Cascade', enabled: true, priority: 1 },
  'military-correlation': { name: 'Force Posture', enabled: true, priority: 2 },
  'escalation-correlation': { name: 'Escalation Monitor', enabled: true, priority: 2 },
  'economic-correlation': { name: 'Economic Warfare', enabled: true, priority: 2 },
  'disaster-correlation': { name: 'Disaster Cascade', enabled: true, priority: 2 },
  politics: { name: 'World News', enabled: true, priority: 1 },
  us: { name: 'United States', enabled: true, priority: 1 },
  europe: { name: 'Europe', enabled: true, priority: 1 },
  middleeast: { name: 'Middle East', enabled: true, priority: 1 },
  africa: { name: 'Africa', enabled: true, priority: 1 },
  latam: { name: 'Latin America', enabled: true, priority: 1 },
  asia: { name: 'Asia-Pacific', enabled: true, priority: 1 },
  energy: { name: 'Energy & Resources', enabled: true, priority: 1 },
  gov: { name: 'Government', enabled: true, priority: 1 },
  thinktanks: { name: 'Think Tanks', enabled: true, priority: 1 },
  polymarket: { name: 'Predictions', enabled: true, priority: 1 },
  commodities: { name: 'Metals & Materials', enabled: true, priority: 1 },
  markets: { name: 'Markets', enabled: true, priority: 1 },
  economic: { name: 'Macro Stress', enabled: true, priority: 1 },
  'global-procurement': { name: 'Global Procurement', enabled: true, priority: 1, premium: 'locked' as const },
  'trade-policy': { name: 'Trade Policy', enabled: true, priority: 1, premium: 'locked' as const },
  'supply-chain': { name: 'Supply Chain', enabled: true, priority: 1, ...(_desktop && { premium: 'enhanced' as const }) },
  'china-corridors': { name: 'China Logistics Corridors', enabled: true, priority: 1 },
  'china-activity-nowcast': { name: 'China Activity Nowcast', enabled: true, priority: 1 },
  finance: { name: 'Financial', enabled: true, priority: 1 },
  tech: { name: 'Technology', enabled: true, priority: 2 },
  crypto: { name: 'Crypto', enabled: true, priority: 2 },
  heatmap: { name: 'Sector Heatmap', enabled: true, priority: 2 },
  ai: { name: 'AI/ML', enabled: true, priority: 2 },
  layoffs: { name: 'Layoffs Tracker', enabled: true, priority: 2 },
  monitors: { name: 'My Monitors', enabled: true, priority: 2 },
  'satellite-fires': { name: 'Fires', enabled: true, priority: 2 },
  'market-breadth': { name: 'Market Breadth', enabled: true, priority: 2 },
  'news-market-correlation': { name: 'News ↔ Markets', enabled: true, priority: 1 },
  // Distinct from the `forex` key, which is an RSS news feed, not a rate
  // surface. Opt-in per #6199; being per-variant, it can go default-on in
  // FINANCE_PANELS later without changing any other variant.
  fx: { name: 'FX Rates', enabled: false, priority: 2 },
  'etf-flows': { name: 'BTC ETF Tracker', enabled: true, priority: 2 },
  stablecoins: { name: 'Stablecoins', enabled: true, priority: 2 },
  'ucdp-events': { name: 'UCDP Conflict Events', enabled: true, priority: 2 },
  'disease-outbreaks': { name: 'Disease Outbreaks', enabled: true, priority: 2 },
  'social-velocity': { name: 'Social Velocity', enabled: true, priority: 2 },
  giving: { name: 'Global Giving', enabled: false, priority: 2 },
  displacement: { name: 'UNHCR Displacement', enabled: true, priority: 2 },
  climate: { name: 'Climate Anomalies', enabled: true, priority: 2 },
  'climate-news': { name: 'Climate News', enabled: false, priority: 2 },
  'population-exposure': { name: 'Population Exposure', enabled: true, priority: 2 },
  'security-advisories': { name: 'Security Advisories', enabled: true, priority: 2 },
  'sanctions-pressure': { name: 'Sanctions Pressure', enabled: true, priority: 2 },
  'defense-patents': { name: 'R&D Signal', enabled: true, priority: 2 },
  'toronto-safety': { name: 'Toronto Safety', enabled: false, priority: 2 },
  'radiation-watch': { name: 'Radiation Watch', enabled: true, priority: 2 },
  'thermal-escalation': { name: 'Thermal Escalation', enabled: true, priority: 2 },
  'oref-sirens': { name: 'Israel Sirens', enabled: true, priority: 2, ...(_desktop && { premium: 'locked' as const }) },
  'telegram-intel': { name: 'Telegram Intel', enabled: true, priority: 2, ...(_desktop && { premium: 'locked' as const }) },
  'x-intel': { name: 'X News Accounts', enabled: true, priority: 2, ...(_desktop && { premium: 'locked' as const }) },
  'airline-intel': { name: 'Airline Intelligence', enabled: true, priority: 2 },
  'tech-readiness': { name: 'Tech Readiness Index', enabled: true, priority: 2 },
  'world-clock': { name: 'World Clock', enabled: true, priority: 2 },
  'national-debt': { name: 'Global Debt Clock', enabled: true, priority: 2 },
  'cross-source-signals': { name: 'Cross-Source Signals', enabled: true, priority: 2 },
  'regional-intelligence': { name: 'Regional Intelligence', enabled: false, priority: 1, premium: 'locked' as const },
  'geo-hubs': { name: 'Geopolitical Hubs', enabled: false, priority: 2 },
  'tech-hubs': { name: 'Hot Tech Hubs', enabled: false, priority: 2 },
};

const FULL_MAP_LAYERS: MapLayers = {
  iranAttacks: IRAN_ATTACKS_ENABLED && !_desktop,
  gpsJamming: false,
  satellites: false,


  conflicts: true,
  bases: !_desktop,
  cables: false,
  pipelines: false,
  storageFacilities: false,
  fuelShortages: false,
  hotspots: true,
  ais: false,
  nuclear: true,
  irradiators: false,
  radiationWatch: false,
  sanctions: true,
  weather: true,
  // Opt-in — see DEFAULT_MAP_LAYERS in src/config/variants/full.ts. Its four
  // sources are on-demand bootstrap keys (~2.7 MB), so shipping the layer on
  // put that on every visitor (#6763).
  canadaRoads: false,
  canadaAlerts: true,
  economic: true,
  waterways: true,
  outages: true,
  cyberThreats: false,
  datacenters: false,
  protests: false,
  flights: false,
  military: true,
  natural: true,
  spaceports: false,
  minerals: false,
  fires: false,
  // Data source layers
  ucdpEvents: false,
  displacement: false,
  climate: false,
  // Tech layers (disabled in full variant)
  startupHubs: false,
  cloudRegions: false,
  accelerators: false,
  techHQs: false,
  techEvents: false,
  // Finance layers (disabled in full variant)
  stockExchanges: false,
  financialCenters: false,
  centralBanks: false,
  commodityHubs: false,
  gulfInvestments: false,
  // Happy variant layers
  positiveEvents: false,
  kindness: false,
  happiness: false,
  speciesRecovery: false,
  renewableInstallations: false,
  tradeRoutes: false,
  ciiChoropleth: false,
  resilienceScore: false,
  dayNight: false,
  // Commodity layers (disabled in full variant)
  miningSites: false,
  processingPlants: false,
  commodityPorts: false,
  webcams: false,
  diseaseOutbreaks: false,
};

const FULL_MOBILE_MAP_LAYERS: MapLayers = {
  iranAttacks: IRAN_ATTACKS_ENABLED,
  gpsJamming: false,
  satellites: false,


  conflicts: true,
  bases: false,
  cables: false,
  pipelines: false,
  storageFacilities: false,
  fuelShortages: false,
  hotspots: true,
  ais: false,
  nuclear: false,
  irradiators: false,
  radiationWatch: false,
  sanctions: true,
  weather: true,
  canadaRoads: false,
  canadaAlerts: false,
  economic: false,
  waterways: false,
  outages: true,
  cyberThreats: false,
  datacenters: false,
  protests: false,
  flights: false,
  military: false,
  natural: true,
  spaceports: false,
  minerals: false,
  fires: false,
  // Data source layers
  ucdpEvents: false,
  displacement: false,
  climate: false,
  // Tech layers (disabled in full variant)
  startupHubs: false,
  cloudRegions: false,
  accelerators: false,
  techHQs: false,
  techEvents: false,
  // Finance layers (disabled in full variant)
  stockExchanges: false,
  financialCenters: false,
  centralBanks: false,
  commodityHubs: false,
  gulfInvestments: false,
  // Happy variant layers
  positiveEvents: false,
  kindness: false,
  happiness: false,
  speciesRecovery: false,
  renewableInstallations: false,
  tradeRoutes: false,
  ciiChoropleth: false,
  resilienceScore: false,
  dayNight: false,
  // Commodity layers (disabled in full variant)
  miningSites: false,
  processingPlants: false,
  commodityPorts: false,
  webcams: false,
  diseaseOutbreaks: false,
};


// Variant panel/layer registries removed in the GROUNDTRUTH strip (2026-09-23).
// Single app: FULL_PANELS + FULL_MAP_LAYERS are the only registries.

// ============================================
// UNIFIED PANEL REGISTRY (GROUNDTRUTH: single app — variants removed 2026-09-23)
// ============================================

/** All panels — the single canonical registry. */
export const ALL_PANELS: Record<string, PanelConfig> = {
  ...FULL_PANELS,
};

/** True when `panelId` is in the app's native catalog. Signature kept for API compatibility. */
export function isPanelNativeToVariant(panelId: string, _variant: string): boolean {
  return Object.prototype.hasOwnProperty.call(FULL_PANELS, panelId);
}

/** Canonical panel order (keys = panels enabled by default). Single app: the full set. */
export const VARIANT_DEFAULTS: Record<string, string[]> = {
  full: Object.keys(FULL_PANELS),
};

/**
 * Returns the effective panel config for a given key.
 * `variant` is accepted for API compatibility and ignored (single app).
 */
export function getEffectivePanelConfig(key: string, _variant: string): PanelConfig {
  const base = FULL_PANELS[key] ?? ALL_PANELS[key];
  if (!base) return { name: key, enabled: false, priority: 2 };
  return { ...base };
}

/**
 * Build the canonical panel-settings seed App uses on a first visit.
 * `variant` is accepted for API compatibility and ignored (single app).
 */
export function getInitialPanelSettingsForVariant(_variant: string): Record<string, PanelConfig> {
  const variantDefaults = new Set(VARIANT_DEFAULTS.full ?? []);
  return Object.fromEntries(
    Object.keys(ALL_PANELS).map((key) => {
      const config = getEffectivePanelConfig(key, 'full');
      return [key, { ...config, enabled: variantDefaults.has(key) && config.enabled }];
    }),
  );
}

/**
 * Returns true if `key` is in the current variant's default panel set.
 *
 * App.ts:577-583 merges ALL_PANELS into panelSettings on every variant so
 * users can cross-enable panels, which makes `shouldCreatePanel(key)`
 * (which just checks `key in panelSettings`) true everywhere. Auto-refresh
 * paths that fan out a fetch must instead gate on the variant defaults —
 * otherwise variants whose backend doesn't seed the panel's bootstrap key
 * (e.g. tech-readiness on commodity/finance/energy) blow their 5s fetch
 * budget on a key that will never populate.
 */
const SITE_VARIANT_DEFAULTS = new Set(VARIANT_DEFAULTS[SITE_VARIANT] ?? []);

export function isPanelInVariantDefaults(key: string): boolean {
  return SITE_VARIANT_DEFAULTS.has(key);
}

export const FREE_MAX_PANELS = 40;
export const FREE_MAX_SOURCES = 80;

export function isFreePanelCapCounted(key: string): boolean {
  return key !== 'map' && !key.startsWith('cw-');
}

export function countFreePanelCapUsage(panelSettings: Record<string, PanelConfig>): number {
  return Object.entries(panelSettings).filter(([key, panel]) =>
    panel.enabled && isFreePanelCapCounted(key)
  ).length;
}

export function restoreFreeMapPanelAccess(
  panelSettings: Record<string, PanelConfig>,
): Record<string, PanelConfig> {
  const next: Record<string, PanelConfig> = {};
  for (const [key, config] of Object.entries(panelSettings)) {
    next[key] = { ...config };
  }

  if (next.map?.enabled === false && countFreePanelCapUsage(next) > FREE_MAX_PANELS) {
    next.map = { ...next.map, enabled: true };
  }

  return next;
}

/**
 * Returns true if the current user is entitled to enable/view this panel.
 * Mirrors the entitlement checks in panel-layout.ts (single source of truth).
 */
export function isPanelEntitled(key: string, config: PanelConfig, isPro = false): boolean {
  if (!config.premium) return true;
  // Open-tier entitlements unlock all premium panels
  if (isEntitled()) return true;
  const apiKeyPanels = ['regional-intelligence', 'trade-policy', 'global-procurement'];
  if (apiKeyPanels.includes(key)) {
    return getSecretState('WORLDMONITOR_API_KEY').present || isPro;
  }
  if (config.premium === 'locked') {
    return isDesktopRuntime();
  }
  return true;
}

/**
 * Clamp a panel-settings map to the free-tier panel cap. Single source of
 * truth for the count limit so App boot, the settings/search add paths, and
 * the dashboard-tab add/switch/load paths all enforce the SAME ceiling.
 *
 * Returns a NEW map; the input is never mutated. For free users: cw-*
 * custom-widget panels are a pro
 * feature and are always disabled. The map is free baseline infrastructure
 * and never consumes a capped panel slot. Among the remaining enabled panels
 * the lowest-priority ones past FREE_MAX_PANELS are disabled (priority asc,
 * key tiebreak — identical ordering to App.enforceFreeTierLimits).
 *
 * Pro users get the same panel eligibility, plus the inverse of the cw-* gate:
 * widgets this helper previously hid are restored (see restoreProGatedPanels).
 *
 * `isPro` is passed in (rather than read here) to keep this a pure config
 * helper with no service-state dependency, matching isPanelEntitled above.
 */
export function enforceFreePanelLimit(
  panelSettings: Record<string, PanelConfig>,
  isPro: boolean,
): Record<string, PanelConfig> {
  if (isPro) return restoreProGatedPanels(panelSettings);

  const next: Record<string, PanelConfig> = {};
  for (const [key, config] of Object.entries(panelSettings)) {
    next[key] = { ...config };
  }

  // cw-* custom widgets are pro-only — never enabled on the free tier.
  // Stamp `proGated` so restoreProGatedPanels can tell this apart from a
  // widget the user hid themselves and put it back when they go Pro.
  for (const key of Object.keys(next)) {
    if (key.startsWith('cw-') && next[key]?.enabled) {
      next[key] = { ...next[key]!, enabled: false, proGated: true };
    }
  }

  const enabledKeys = Object.entries(next)
    .filter(([k, v]) => v.enabled && isFreePanelCapCounted(k))
    .sort(([ka, a], [kb, b]) => (a.priority ?? 99) - (b.priority ?? 99) || ka.localeCompare(kb))
    .map(([k]) => k);

  // Stamp `proGated` for the same reason the cw-* gate above does: this is the
  // GATE disabling the panel, not the user. Without the marker the count cap
  // was a one-way door — App.enforceFreeTierLimits persists this map into
  // STORAGE_KEYS.panels, and restoreProGatedPanels only re-enables what is
  // marked, so a panel clamped during any window where the tier read as free
  // stayed `enabled: false` forever. Going Pro never brought it back: the panel
  // kept appearing in Cmd+K and as a checked box in settings while being absent
  // from the dashboard.
  for (const key of enabledKeys.slice(FREE_MAX_PANELS)) {
    next[key] = { ...next[key]!, enabled: false, proGated: true };
  }

  return next;
}

/**
 * Apply a USER-initiated enable/disable to a panel config.
 *
 * Every user toggle path must go through this. `proGated` means "the GATE owns
 * this disable"; the moment the user takes a position on the panel themselves,
 * the gate no longer owns it and the marker must go — otherwise a panel the
 * gate once clamped keeps the marker through a user re-enable, and a LATER
 * deliberate hide is indistinguishable from gate damage, so the next Pro
 * reconcile resurrects a panel the user chose to hide (and cloud-syncs that to
 * every device).
 *
 * Mutates in place: every call site already owns a live entry in the
 * panelSettings map it is about to persist.
 */
export function userSetPanelEnabled(config: PanelConfig, enabled: boolean): void {
  config.enabled = enabled;
  delete config.proGated;
}

/**
 * Inverse of `enforceFreePanelLimit`: re-enable panels the free-tier gate hid
 * (custom widgets or count-cap overflow), and clear the marker.
 *
 * Without this the gate is a one-way door. `enforceFreePanelLimit` writes
 * straight into STORAGE_KEYS.panels, so once a widget is disabled nothing
 * ever turns it back on — a user who upgrades to Pro (or whose Pro session
 * simply resolved late, see App.enforceFreeTierLimits) would find their
 * widgets permanently missing from the dashboard even though the specs are
 * still in wm-custom-widgets.
 *
 * Only panels carrying `proGated` are touched, so a panel the user hid
 * deliberately via settings stays hidden.
 */
export function restoreProGatedPanels(
  panelSettings: Record<string, PanelConfig>,
): Record<string, PanelConfig> {
  const next: Record<string, PanelConfig> = {};
  for (const [key, config] of Object.entries(panelSettings)) {
    if (config.proGated) {
      const { proGated: _proGated, ...rest } = config;
      next[key] = { ...rest, enabled: true };
    } else {
      next[key] = { ...config };
    }
  }
  return next;
}

/**
 * True while the session's tier is still unknowable, so the persisted
 * free-tier clamp must not run yet. Two windows qualify:
 *
 * - Clerk hasn't settled (`authPending`) — a signed-in Pro user is
 *   indistinguishable from an anonymous one.
 * - Clerk settled on a signed-in user but the Convex entitlement snapshot
 *   hasn't arrived (`hasUser && !entitlementLoaded`) — isEntitled() is
 *   deterministically false until the snapshot lands, so a Convex-only Pro
 *   subscriber would be clamped as free.
 *
 * `deadlineExceeded` is the AUTH_SETTLE_GRACE_MS backstop: once the grace
 * timer fires, enforcement proceeds with whatever tier signals exist, so a
 * snapshot that never arrives cannot defer the caps forever.
 *
 * Pure on plain booleans (no service imports) to keep this a config helper,
 * matching isPanelEntitled above.
 */
export function shouldDeferFreeTierEnforcement(
  authPending: boolean,
  hasUser: boolean,
  entitlementLoaded: boolean,
  deadlineExceeded: boolean,
): boolean {
  if (deadlineExceeded) return false;
  return authPending || (hasUser && !entitlementLoaded);
}

// ============================================
// VARIANT-AWARE EXPORTS
// ============================================
export const DEFAULT_PANELS: Record<string, PanelConfig> = Object.fromEntries(
  (VARIANT_DEFAULTS['full'] ?? []).map(key =>
    [key, getEffectivePanelConfig(key, 'full')]
  )
);

export const DEFAULT_MAP_LAYERS = FULL_MAP_LAYERS;

export const MOBILE_DEFAULT_MAP_LAYERS = FULL_MOBILE_MAP_LAYERS;

/** Maps map-layer toggle keys to their data-freshness source IDs (single source of truth). */
export const LAYER_TO_SOURCE: Partial<Record<keyof MapLayers, DataSourceId[]>> = {
  military: ['opensky', 'wingbits'],
  ais: ['ais'],
  natural: ['usgs'],
  weather: ['weather'],
  canadaRoads: ['ontario_511', 'alberta_511', 'manitoba_511', 'toronto_roads', 'bc_open511'],
  outages: ['outages'],
  cyberThreats: ['cyber_threats'],
  protests: ['acled', 'gdelt_doc'],
  ucdpEvents: ['ucdp_events'],
  displacement: ['unhcr'],
  climate: ['climate'],
  sanctions: ['sanctions_pressure'],
  radiationWatch: ['radiation'],
};

// ============================================
// PANEL CATEGORY MAP
// ============================================
// Maps category keys to panel keys. Only categories with at least one
// matching panel in the user's active panel settings are shown.
export const PANEL_CATEGORY_MAP: Record<string, { labelKey: string; panelKeys: string[]; variants?: string[] }> = {
  // All variants — essential panels
  core: {
    labelKey: 'header.panelCatCore',
    panelKeys: ['map', 'live-news', 'live-webcams', 'windy-webcams', 'strategic-posture'],
  },

  // Full (geopolitical) variant — marketsFinance/topical/dataTracking are
  // shared with the energy variant, which has no dedicated category block.
  intelligence: {
    labelKey: 'header.panelCatIntelligence',
    panelKeys: ['cii', 'strategic-risk', 'threat-timeline', 'intel', 'gdelt-intel', 'cascade', 'telegram-intel', 'x-intel', 'forecast', 'cross-source-signals', 'regional-intelligence', 'thermal-escalation', 'social-velocity', 'geo-hubs'],
    variants: ['full'],
  },
  correlation: {
    labelKey: 'header.panelCatCorrelation',
    panelKeys: ['military-correlation', 'escalation-correlation', 'economic-correlation', 'disaster-correlation'],
    variants: ['full'],
  },
  regionalNews: {
    labelKey: 'header.panelCatRegionalNews',
    panelKeys: ['politics', 'us', 'europe', 'middleeast', 'africa', 'latam', 'asia'],
    variants: ['full'],
  },
  marketsFinance: {
    labelKey: 'header.panelCatMarketsFinance',
    panelKeys: ['commodities', 'markets', 'economic', 'global-procurement', 'trade-policy', 'sanctions-pressure', 'supply-chain', 'china-corridors', 'china-activity-nowcast', 'finance', 'polymarket', 'etf-flows', 'stablecoins', 'crypto', 'heatmap', 'market-breadth', 'news-market-correlation', 'national-debt', 'fx'],
    variants: ['full', 'energy'],
  },
  topical: {
    labelKey: 'header.panelCatTopical',
    panelKeys: ['energy', 'gov', 'thinktanks', 'tech', 'ai', 'layoffs'],
    variants: ['full', 'energy'],
  },
  dataTracking: {
    labelKey: 'header.panelCatDataTracking',
    panelKeys: ['monitors', 'satellite-fires', 'ucdp-events', 'displacement', 'climate', 'climate-news', 'population-exposure', 'security-advisories', 'toronto-safety', 'radiation-watch', 'oref-sirens', 'world-clock', 'tech-readiness', 'disease-outbreaks', 'defense-patents'],
    variants: ['full', 'energy'],
  },

  // Tech variant
  techAi: {
    labelKey: 'header.panelCatTechAi',
    panelKeys: ['ai', 'tech', 'tech-readiness', 'tech-hubs'],
    variants: ['tech'],
  },
  startupsVc: {
    labelKey: 'header.panelCatStartupsVc',
    panelKeys: [],
    variants: ['tech'],
  },
  securityPolicy: {
    labelKey: 'header.panelCatSecurityPolicy',
    panelKeys: [],
    variants: ['tech'],
  },
  techMarkets: {
    labelKey: 'header.panelCatMarkets',
    panelKeys: ['markets', 'finance', 'crypto', 'economic', 'global-procurement', 'sanctions-pressure', 'polymarket', 'etf-flows', 'stablecoins', 'layoffs', 'monitors', 'world-clock'],
    variants: ['tech'],
  },

  // Finance variant
  finMarkets: {
    labelKey: 'header.panelCatMarkets',
    panelKeys: ['markets', 'heatmap', 'polymarket'],
    variants: ['finance'],
  },
  fixedIncomeFx: {
    labelKey: 'header.panelCatFixedIncomeFx',
    panelKeys: ['fx'],
    variants: ['finance'],
  },
  finCommodities: {
    labelKey: 'header.panelCatCommodities',
    panelKeys: ['commodities'],
    variants: ['finance'],
  },
  cryptoDigital: {
    labelKey: 'header.panelCatCryptoDigital',
    panelKeys: ['crypto', 'etf-flows', 'stablecoins'],
    variants: ['finance'],
  },
  centralBanksEcon: {
    labelKey: 'header.panelCatCentralBanks',
    panelKeys: ['economic', 'global-procurement', 'trade-policy', 'sanctions-pressure', 'supply-chain', 'china-corridors', 'china-activity-nowcast'],
    variants: ['finance'],
  },
  dealsInstitutional: {
    labelKey: 'header.panelCatDeals',
    panelKeys: [],
    variants: ['finance'],
  },
  gulfMena: {
    labelKey: 'header.panelCatGulfMena',
    panelKeys: ['monitors', 'world-clock'],
    variants: ['finance'],
  },

  // Commodity variant
  commodityPrices: {
    labelKey: 'header.panelCatCommodityPrices',
    panelKeys: ['commodities', 'energy', 'markets', 'heatmap'],
    variants: ['commodity'],
  },
  miningIndustry: {
    labelKey: 'header.panelCatMining',
    panelKeys: ['supply-chain', 'china-corridors', 'china-activity-nowcast'],
    variants: ['commodity'],
  },
  commodityEcon: {
    labelKey: 'header.panelCatCommodityEcon',
    panelKeys: ['trade-policy', 'sanctions-pressure', 'economic', 'finance', 'polymarket', 'airline-intel', 'world-clock', 'monitors'],
    variants: ['commodity'],
  },

  // Happy variant
  happyNews: {
    labelKey: 'header.panelCatHappyNews',
    panelKeys: [],
    variants: ['happy'],
  },
  happyPlanet: {
    labelKey: 'header.panelCatHappyPlanet',
    panelKeys: ['giving'],
    variants: ['happy'],
  },
};

export interface VariantPanelCategory {
  key: string;
  labelKey: string;
  panelKeys: string[];
}

// Categories applicable to `variant` that contain at least one enabled panel.
// Shared by the settings panel-tab filter and the mobile category nav —
// callers prepend their own "all" entry and localize labelKey via t().
export function getVariantPanelCategories(
  panelSettings: Record<string, PanelConfig>,
  variant: string,
): VariantPanelCategory[] {
  return Object.entries(PANEL_CATEGORY_MAP)
    .filter(([, def]) => !def.variants || def.variants.includes(variant))
    .filter(([, def]) => def.panelKeys.some((pk) => panelSettings[pk]?.enabled))
    .map(([key, def]) => ({ key, labelKey: def.labelKey, panelKeys: def.panelKeys }));
}

// Enabled panels that carry a premium gate on the current surface — drives
// the mobile nav's PRO chip. getEffectivePanelConfig folds in per-variant
// premium overrides; unknown keys (custom widgets, MCP panels) resolve to a
// premium-less stub and drop out.
export function getProPanelKeys(
  panelSettings: Record<string, PanelConfig>,
  variant: string,
): string[] {
  return Object.keys(panelSettings).filter((key) =>
    panelSettings[key]?.enabled && Boolean(getEffectivePanelConfig(key, variant).premium),
  );
}

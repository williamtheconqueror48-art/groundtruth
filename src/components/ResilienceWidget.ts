import { type AuthSession, getAuthState, subscribeAuthState } from '@/services/auth-state';
import {
  getEntitlementVerificationStatus,
  onEntitlementChange,
  onEntitlementVerificationChange,
} from '@/services/entitlements';
import { onMissionPresetChange } from '@/services/mission-presets';
import { isProTierResolved } from '@/services/widget-store';
import { getResilienceScore, type ResilienceDomain, type ResilienceScoreResponse } from '@/services/resilience';
import { h, replaceChildren } from '@/utils/dom-utils';
import {
  type DimensionConfidence,
  RESILIENCE_VISUAL_LEVEL_COLORS,
  collectDimensionConfidences,
  formatBaselineStress,
  formatResilienceMethodologyHelpTitle,
  formatResilienceChange30d,
  formatResilienceConfidence,
  formatResilienceDataVersion,
  formatResilienceScoreInterval,
  getResilienceOverallDisplay,
  getImputationClassIcon,
  getImputationClassLabel,
  getResilienceDomainLabel,
  getResilienceTrendArrow,
  getResilienceVisualLevel,
  getStalenessIcon,
  getStalenessLabel,
  shouldRenderResilienceBaselineStress,
} from './resilience-widget-utils';
import type { CountryEnergyProfileData } from './country-deep-dive-types';



// LOCKED_PREVIEW lives in resilience-widget-utils.ts so tests and
// other non-Vite consumers can import it without dragging in the
// full ResilienceWidget class transitive graph (the class indirectly
// depends on import.meta.env.DEV via proxy.ts, which breaks plain
// node test runners). Moved in the PR #2949 review round.
const METHODOLOGY_HELP_TITLE = formatResilienceMethodologyHelpTitle();

function normalizeCountryCode(countryCode: string | null | undefined): string | null {
  const normalized = String(countryCode || '').trim().toUpperCase();
  return /^[A-Z]{2}$/.test(normalized) ? normalized : null;
}

function clampScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.min(100, Math.max(0, score));
}

export class ResilienceWidget {
  private readonly element: HTMLElement;
  private authState: AuthSession = getAuthState();
  private unsubscribeAuth: (() => void) | null = null;
  private unsubscribeEntitlement: (() => void) | null = null;
  private unsubscribeVerification: (() => void) | null = null;
  private unsubscribeMission: (() => void) | null = null;
  private currentCountryCode: string | null = null;
  private currentData: ResilienceScoreResponse | null = null;
  private loading = false;
  private errorMessage: string | null = null;
  private requestVersion = 0;
  private energyMixData: CountryEnergyProfileData | null = null;

  constructor(countryCode?: string | null) {
    this.element = document.createElement('section');
    this.element.className = 'cdp-card resilience-widget';
    this.unsubscribeAuth = subscribeAuthState((state) => {
      this.authState = state;
      this.reactToAccessChange();
    });

    // The entitlement snapshot lands on its own channel — production fires no
    // auth event when it arrives. Subscribing to auth alone meant the access
    // GROUNDTRUTH (2026-09-23 strip): single open tier — no plan gate remains;
    // the entitlement subscriptions below only trigger re-renders.
    this.unsubscribeEntitlement = onEntitlementChange(() => this.reactToAccessChange());
    // The terminal "no snapshot is coming" outcome arrives ONLY here — see
    // isAccessStillResolving. Without this subscription the widget would still
    // hang on the waiting state until some unrelated event forced a re-render.
    this.unsubscribeVerification = onEntitlementVerificationChange(() => this.reactToAccessChange());
    this.unsubscribeMission = onMissionPresetChange(() => this.render());

    this.setCountryCode(countryCode ?? null);
  }

  public getElement(): HTMLElement {
    return this.element;
  }

  public setCountryCode(countryCode: string | null): void {
    const normalized = normalizeCountryCode(countryCode);
    if (normalized === this.currentCountryCode) return;

    this.currentCountryCode = normalized;
    this.currentData = null;
    this.energyMixData = null;
    this.errorMessage = null;
    this.loading = false;
    this.requestVersion += 1;

    if (!normalized) {
      this.render();
      return;
    }

    void this.refresh();
  }

  public async refresh(): Promise<void> {
    if (!this.currentCountryCode) {
      this.render();
      return;
    }

    if (this.authState.isPending) {
      this.render();
      return;
    }

    const requestVersion = ++this.requestVersion;
    this.loading = true;
    this.errorMessage = null;
    this.render();

    try {
      const response = await getResilienceScore(this.currentCountryCode);
      if (requestVersion !== this.requestVersion) return;
      this.currentData = response;
      this.loading = false;
      this.errorMessage = null;
      this.render();
    } catch (error) {
      if (requestVersion !== this.requestVersion) return;
      this.loading = false;
      this.currentData = null;
      this.errorMessage = error instanceof Error ? error.message : 'Unable to load resilience score.';
      this.render();
    }
  }

  public setEnergyMix(data: CountryEnergyProfileData | null): void {
    this.energyMixData = data;
    this.render();
  }

  public destroy(): void {
    this.requestVersion += 1;
    this.unsubscribeAuth?.();
    this.unsubscribeAuth = null;
    this.unsubscribeEntitlement?.();
    this.unsubscribeEntitlement = null;
    this.unsubscribeVerification?.();
    this.unsubscribeVerification = null;
    this.unsubscribeMission?.();
    this.unsubscribeMission = null;
  }

  /**
   * Re-evaluate access after any of the signals that feed the gate moved,
   * fetching the score once the verdict first becomes NONE. Shared by the
   * auth, entitlement, and verification subscriptions so those paths cannot
   * drift.
   */
  private reactToAccessChange(): void {
    const loadedCountryCode = normalizeCountryCode(this.currentData?.countryCode);
    const needsRefresh = !this.currentData || (loadedCountryCode !== null && loadedCountryCode !== this.currentCountryCode);
    // GROUNDTRUTH: single open tier — the gate always allows, so this is just
    // a data-freshness check now.
    if (this.currentCountryCode && !this.loading && needsRefresh) {
      void this.refresh();
      return;
    }
    this.render();
  }

  /**
   * Whether the account's plan is still genuinely in flight, as opposed to
   * unknown for good.
   *
   * `isProTierResolved()` answers "do we have a settled tier", and for a
   * signed-in user that stays false for as long as the entitlement snapshot is
   * missing — including when it is never coming. The terminal outcome is
   * published on a DIFFERENT channel: `markEntitlementVerificationUnavailable`
   * moves only the verification status and leaves the snapshot null, so
   * `onEntitlementChange` never fires and a wait keyed on the tier alone hangs
   * forever, denying the panel to free and paying users alike.
   *
   * So the wait is bounded by the verification lifecycle: keep waiting only
   * while the bounded Clerk/Convex retries are actually running (`idle` /
   * `pending`), and on a terminal `unavailable` fall through to the ordinary
   * gate verdict — the same pairing `UnifiedSettings.renderPlanCheckingState`
   * uses on the sibling surface. That leaves the terminal case exactly as it
   * behaves today while still fixing the common one.
   */
  private isAccessStillResolving(): boolean {
    if (isProTierResolved()) return false;
    const status = getEntitlementVerificationStatus();
    return status === 'idle' || status === 'pending';
  }

  private render(): void {
    const body = this.renderBody();

    replaceChildren(
      this.element,
      h(
        'div',
        { className: 'resilience-widget__header' },
        h('h3', { className: 'cdp-card-title resilience-widget__title' }, 'Resilience Score'),
        h(
          'span',
          {
            className: 'resilience-widget__help',
            title: METHODOLOGY_HELP_TITLE,
            'aria-label': 'Resilience score methodology',
          },
          '?',
        ),
      ),
      body,
    );
  }

  private renderBody(): HTMLElement {
    if (!this.currentCountryCode) {
      return h('div', { className: 'cdp-card-body' }, this.makeEmpty('Resilience data loads when a country is selected.'));
    }

    // Wait for auth/entitlement to settle before first render so the widget
    // never flashes a stale state; the gate itself always allows under the
    // single open tier.
    if (this.authState.isPending || this.isAccessStillResolving()) {
      return h('div', { className: 'cdp-card-body' }, this.makeLoading('Checking access…'));
    }

    if (this.loading) {
      return h('div', { className: 'cdp-card-body' }, this.makeLoading('Loading resilience score…'));
    }

    if (this.errorMessage) {
      return this.renderError(this.errorMessage);
    }

    if (!this.currentData) {
      return h('div', { className: 'cdp-card-body' }, this.makeEmpty('Resilience score unavailable.'));
    }

    return this.renderScoreCard(this.currentData);
  }

  private renderError(message: string): HTMLElement {
    return h(
      'div',
      { className: 'cdp-card-body resilience-widget__error' },
      h('div', { className: 'cdp-empty' }, message),
      h(
        'button',
        {
          type: 'button',
          className: 'cdp-action-btn resilience-widget__retry',
          onclick: () => void this.refresh(),
        },
        'Retry',
      ),
    );
  }

  private renderScoreCard(data: ResilienceScoreResponse, preview = false): HTMLElement {
    const overallDisplay = getResilienceOverallDisplay(data);
    const levelColor = RESILIENCE_VISUAL_LEVEL_COLORS[overallDisplay.visualLevel];
    const scoreInterval = overallDisplay.hasScore ? formatResilienceScoreInterval(data.scoreInterval) : null;

    return h(
      'div',
      { className: 'cdp-card-body resilience-widget__body' },
      h(
        'div',
        { className: 'resilience-widget__overall' },
        this.renderBarBlock(
          overallDisplay.scoreForBar,
          levelColor,
          h(
            'div',
            { className: 'resilience-widget__overall-meta' },
            h('span', { className: 'resilience-widget__overall-score' }, overallDisplay.scoreLabel),
            ...(scoreInterval
              ? [h('span', {
                  className: 'resilience-widget__overall-interval',
                  title: scoreInterval.title,
                }, scoreInterval.label)]
              : []),
            h(
              'span',
              {
                className: 'resilience-widget__overall-level',
                style: { color: levelColor },
                title: overallDisplay.serverLevelLabel,
              },
              overallDisplay.visualLevelLabel,
            ),
            ...(overallDisplay.hasScore
              ? [h('span', { className: 'resilience-widget__overall-trend' }, `${getResilienceTrendArrow(data.trend)} ${data.trend}`)]
              : []),
          ),
        ),
      ),
      ...(shouldRenderResilienceBaselineStress(data, overallDisplay)
        ? [h(
            'div',
            { className: 'resilience-widget__baseline-stress' },
            h('span', { className: 'resilience-widget__baseline-stress-text' },
              formatBaselineStress(data.baselineScore, data.stressScore)),
          )]
        : []),
      h(
        'div',
        { className: 'resilience-widget__domains' },
        ...data.domains.map((domain) => this.renderDomainRow(domain, preview)),
      ),
      // T1.6 Phase 1 of the country-resilience reference-grade upgrade plan:
      // per-dimension confidence grid. Uses only the existing `coverage`,
      // `observedWeight`, `imputedWeight` fields on ResilienceDimension so
      // this ships without proto changes. Imputation class icons (T1.7)
      // and freshness badges (T1.5 full pass) land as additional columns
      // once the schema exposes those fields through the response type.
      this.renderDimensionConfidenceGrid(data),
      h(
        'div',
        { className: 'resilience-widget__footer' },
        h(
          'span',
          {
            className: `resilience-widget__confidence${data.lowConfidence ? ' resilience-widget__confidence--low' : ''}`,
            title: preview ? 'Preview only' : 'Coverage and imputation-based confidence signal.',
          },
          formatResilienceConfidence(data),
        ),
        h('span', { className: 'resilience-widget__delta' }, formatResilienceChange30d(data.change30d)),
        ...(() => {
          // Hoisted so the formatter (which runs a regex + Date parse) is
          // only invoked once per render instead of twice (guard + child).
          // Raised in review of PR #2943 for consistency with the existing
          // scoreInterval / baselineScore blocks in this file.
          const dataVersionLabel = formatResilienceDataVersion(data.dataVersion);
          return dataVersionLabel
            ? [h(
                'span',
                {
                  className: 'resilience-widget__data-version',
                  title: 'Date the static-seed bundle (Railway job) was last refreshed. Individual live inputs (conflict events, sanctions, prices) can be newer — see the per-dimension freshness badge for those.',
                },
                dataVersionLabel,
              )]
            : [];
        })(),
      ),
    );
  }

  private renderDimensionConfidenceGrid(data: ResilienceScoreResponse): HTMLElement {
    const dimensions = collectDimensionConfidences(data.domains);
    return h(
      'div',
      {
        className: 'resilience-widget__dimension-grid',
        title: 'Per-dimension data coverage. Hover a cell for the coverage percentage and observation provenance.',
      },
      ...dimensions.map((dim) => this.renderDimensionConfidenceCell(dim)),
    );
  }

  private renderDimensionConfidenceCell(dim: DimensionConfidence): HTMLElement {
    // Compose the tooltip from three independent fragments so the order
    // is stable regardless of which optional fields the scorer
    // populated. Imputation class + freshness are added by T1.7 / T1.5
    // and may both be null (observed + unknown cadence), in which case
    // only the base coverage string is shown.
    const titleParts: string[] = [
      dim.absent ? `${dim.label}: no data` : `${dim.label}: ${dim.coveragePct}% coverage, ${dim.status}`,
    ];
    if (dim.imputationClass) titleParts.push(getImputationClassLabel(dim.imputationClass));
    if (dim.staleness) titleParts.push(getStalenessLabel(dim.staleness));
    const title = titleParts.join(' | ');

    const imputationClassName = dim.imputationClass
      ? `resilience-widget__dimension-imputation resilience-widget__dimension-imputation--${dim.imputationClass}`
      : 'resilience-widget__dimension-imputation';
    const freshnessClassName = dim.staleness
      ? `resilience-widget__dimension-freshness resilience-widget__dimension-freshness--${dim.staleness}`
      : 'resilience-widget__dimension-freshness';

    return h(
      'div',
      {
        className: `resilience-widget__dimension-cell resilience-widget__dimension-cell--${dim.status}`,
        title,
      },
      h('span', { className: 'resilience-widget__dimension-label' }, dim.label),
      h(
        'div',
        { className: 'resilience-widget__dimension-bar-track' },
        h('div', {
          className: 'resilience-widget__dimension-bar-fill',
          style: { width: `${dim.coveragePct}%` },
        }),
      ),
      h(
        'span',
        {
          className: imputationClassName,
          'aria-label': dim.imputationClass ? getImputationClassLabel(dim.imputationClass) : undefined,
        },
        dim.imputationClass ? getImputationClassIcon(dim.imputationClass) : '',
      ),
      h('span', { className: 'resilience-widget__dimension-pct' }, dim.absent ? 'n/a' : `${dim.coveragePct}%`),
      h(
        'span',
        {
          className: freshnessClassName,
          'aria-label': dim.staleness ? getStalenessLabel(dim.staleness) : undefined,
        },
        getStalenessIcon(dim.staleness),
      ),
    );
  }

  private renderDomainRow(domain: ResilienceDomain, preview = false): HTMLElement {
    const score = clampScore(domain.score);
    const levelColor = RESILIENCE_VISUAL_LEVEL_COLORS[getResilienceVisualLevel(score)];

    const attrs: Record<string, string> = { className: 'resilience-widget__domain-row' };

    if (!preview && domain.id === 'energy' && this.energyMixData
      && (this.energyMixData.mixAvailable || this.energyMixData.importShareAvailable || this.energyMixData.gasStorageAvailable)) {
      const d = this.energyMixData;
      const parts = [d.importShareAvailable
        ? `Import dep: ${d.importShare.toFixed(1)}%`
        : 'Import dep: unavailable'];
      if (d.mixAvailable) {
        parts.push(
          `Gas: ${d.gasShare.toFixed(1)}%`,
          `Coal: ${d.coalShare.toFixed(1)}%`,
          `Renew: ${d.renewShare.toFixed(1)}%`,
        );
      }
      if (d.gasStorageAvailable) parts.push(`EU storage: ${d.gasStorageFillPct.toFixed(1)}%`);
      attrs['title'] = parts.join(' | ');
    }

    return h(
      'div',
      attrs,
      h('span', { className: 'resilience-widget__domain-label' }, getResilienceDomainLabel(domain.id)),
      this.renderBarBlock(score, levelColor),
      h('span', { className: 'resilience-widget__domain-score' }, String(Math.round(score))),
    );
  }

  private renderBarBlock(score: number, color: string, trailing?: HTMLElement): HTMLElement {
    return h(
      'div',
      { className: 'resilience-widget__bar-block' },
      h(
        'div',
        { className: 'resilience-widget__bar-track' },
        h('div', {
          className: 'resilience-widget__bar-fill',
          style: {
            width: `${score}%`,
            background: color,
          },
        }),
      ),
      trailing ?? null,
    );
  }

  private makeLoading(text: string): HTMLElement {
    return h(
      'div',
      { className: 'cdp-loading-inline' },
      h('div', { className: 'cdp-loading-line' }),
      h('div', { className: 'cdp-loading-line cdp-loading-line-short' }),
      h('span', { className: 'cdp-loading-text' }, text),
    );
  }

  private makeEmpty(text: string): HTMLElement {
    return h('div', { className: 'cdp-empty' }, text);
  }

}

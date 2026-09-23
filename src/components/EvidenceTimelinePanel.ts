/**
 * GROUNDTRUTH evidence layer v1 — EvidenceTimelinePanel.
 *
 * Phase 3 (2026-09-24). The v1 "sourced investigative timeline": the same
 * evidence records as EvidencePanel, rendered as a vertical timeline sorted
 * by occurrence time. Each entry is stamped with its claim tier and links to
 * its source URL. No AI narrative — the timeline is the records.
 */

import { Panel } from './Panel';
import { escapeHtml, unsafeRawHtml } from '@/utils/sanitize';
import { fetchUsgsEvidence } from '@/services/evidence-usgs';
import { CLAIM_TIER_META } from '../../shared/evidence/provenance';
import type { EvidenceRecord } from '../../shared/evidence/types';

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'TIME UNKNOWN';
  return d.toLocaleString([], {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  }).toUpperCase();
}

function renderItem(record: EvidenceRecord): string {
  const topClaim = record.claims[0];
  const meta = topClaim ? CLAIM_TIER_META[topClaim.tier] : null;
  const source = record.sources[0];
  return `
    <li class="gt-timeline-item">
      <span class="gt-timeline-time">${escapeHtml(formatTime(record.occurredAtISO))}</span>
      ${meta ? `<span class="${meta.stampClass}" title="${escapeHtml(meta.meaning)}">${escapeHtml(meta.label)}</span>` : ''}
      <div style="margin:6px 0 2px;font-weight:700;font-size:12px">${escapeHtml(record.title)}</div>
      <div style="font-size:11px;color:#6b6b6b">${escapeHtml(record.placeName)} · ${record.lat.toFixed(2)}, ${record.lon.toFixed(2)}</div>
      ${topClaim ? `<div style="font-size:11px;margin-top:4px">${escapeHtml(topClaim.text)}</div>` : ''}
      ${source ? `<div style="font-size:11px;margin-top:6px"><a href="${escapeHtml(source.url)}" target="_blank" rel="noopener">SOURCE: ${escapeHtml(source.publisher)}</a></div>` : ''}
    </li>`;
}

export class EvidenceTimelinePanel extends Panel {
  private records: EvidenceRecord[] = [];
  private loaded = false;

  constructor() {
    super({
      id: 'evidence-timeline',
      title: 'Evidence Timeline',
      showCount: true,
      trackActivity: true,
      infoTooltip: 'Sourced investigative timeline: evidence records ordered by occurrence time, each stamped with its claim tier and linked to its source.',
    });
    this.showLoading('Building sourced timeline…');
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      this.records = await fetchUsgsEvidence();
    } catch {
      this.records = [];
    }
    this.loaded = true;
    this.setCount(this.records.length);
    this.render();
  }

  public refresh(): void {
    this.showLoading('Building sourced timeline…');
    void this.load();
  }

  private render(): void {
    if (!this.loaded) return;
    if (this.records.length === 0) {
      this.showError(
        'No records to timeline — the USGS feed is unreachable. Check your connection and retry.',
        () => this.refresh(),
      );
      return;
    }
    const items = this.records.map(renderItem).join('');
    // All dynamic values are pre-escaped via escapeHtml in renderItem.
    this.setSafeContent(unsafeRawHtml(`
      <div>
        <div style="font-size:11px;color:#6b6b6b;margin-bottom:10px;font-family:var(--gt-mono,monospace)">
          SOURCED INVESTIGATIVE TIMELINE · NEWEST FIRST · CORRELATION IS NOT PROOF
        </div>
        <ol class="gt-timeline">${items}</ol>
      </div>
    `, 'groundtruth evidence timeline: dynamic values pre-escaped with escapeHtml'));
  }
}

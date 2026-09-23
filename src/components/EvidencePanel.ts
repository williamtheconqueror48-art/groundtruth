/**
 * GROUNDTRUTH evidence layer v1 — EvidencePanel.
 *
 * Phase 3 (2026-09-24). Lists evidence records as RAW RECORDS: title, time,
 * place, claim-tier stamp, expandable source block (publisher, URL,
 * retrieved-at, digest) and entities. No AI summary anywhere — the record
 * is the content.
 */

import { Panel } from './Panel';
import { escapeHtml, unsafeRawHtml } from '@/utils/sanitize';
import { fetchUsgsEvidence } from '@/services/evidence-usgs';
import { CLAIM_TIER_META } from '../../shared/evidence/provenance';
import type { Claim, EvidenceRecord, SourceRef } from '../../shared/evidence/types';

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'time unknown';
  return d.toLocaleString([], {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  });
}

function renderSource(source: SourceRef): string {
  return `
    <div style="margin-top:4px">
      <div><b>${escapeHtml(source.publisher)}</b></div>
      <div><a href="${escapeHtml(source.url)}" target="_blank" rel="noopener">${escapeHtml(source.url)}</a></div>
      <div>retrieved <code>${escapeHtml(source.retrievedAtISO)}</code></div>
      <div>sha256 <code>${escapeHtml(source.sha256)}</code></div>
    </div>`;
}

function renderClaim(claim: Claim, sources: SourceRef[]): string {
  const meta = CLAIM_TIER_META[claim.tier];
  const source = sources[claim.sourceIndex];
  return `
    <div style="margin-top:6px">
      <span class="${meta.stampClass}" title="${escapeHtml(meta.meaning)}">${escapeHtml(meta.label)}</span>
      <div style="margin-top:4px">${escapeHtml(claim.text)}</div>
      ${source ? `<div style="font-size:10px;color:#6b6b6b">backed by: ${escapeHtml(source.publisher)}</div>` : ''}
    </div>`;
}

function renderRecord(record: EvidenceRecord): string {
  const sources = record.sources.map(renderSource).join('');
  const claims = record.claims.map((c) => renderClaim(c, record.sources)).join('');
  const entities = record.entities
    .map((e) => `<span class="gt-entity-chip" data-kind="${escapeHtml(e.kind)}">${escapeHtml(e.value)}</span>`)
    .join('');
  return `
    <article class="gt-evidence-record">
      <div class="gt-evidence-meta">
        <span><b>${escapeHtml(formatTime(record.occurredAtISO))}</b></span>
        <span>${escapeHtml(record.placeName)}</span>
        <span>${record.lat.toFixed(2)}, ${record.lon.toFixed(2)}</span>
        <span>hash <code>${escapeHtml(record.recordHash)}</code></span>
      </div>
      <h3 class="gt-evidence-title">${escapeHtml(record.title)}</h3>
      ${claims}
      <details class="gt-evidence-sources">
        <summary>SOURCES (${record.sources.length}) — PROVENANCE</summary>
        ${sources}
      </details>
      ${entities ? `<div class="gt-evidence-entities">${entities}</div>` : ''}
    </article>`;
}

export class EvidencePanel extends Panel {
  private records: EvidenceRecord[] = [];
  private loaded = false;

  constructor() {
    super({
      id: 'evidence',
      title: 'Evidence Records',
      showCount: true,
      trackActivity: true,
      infoTooltip: 'Raw evidence records with tiered claims and full provenance. Every record is sourced; nothing here is AI-generated.',
    });
    this.showLoading('Fetching sourced records…');
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
    this.showLoading('Fetching sourced records…');
    void this.load();
  }

  private render(): void {
    if (!this.loaded) return;
    if (this.records.length === 0) {
      this.showError(
        'No evidence records available — the USGS feed is unreachable. Check your connection and retry.',
        () => this.refresh(),
      );
      return;
    }
    const rows = this.records.map(renderRecord).join('');
    // All dynamic values are pre-escaped via escapeHtml in the render
    // helpers above; this string is markup-only composition.
    this.setSafeContent(unsafeRawHtml(`
      <div class="gt-evidence-list">
        <div style="font-size:11px;color:#6b6b6b;margin-bottom:8px;font-family:var(--gt-mono,monospace)">
          RAW RECORDS · CLAIM TIERS STAMPED · CORRELATION IS NOT PROOF
        </div>
        ${rows}
      </div>
    `, 'groundtruth evidence panel: dynamic values pre-escaped with escapeHtml'));
  }
}

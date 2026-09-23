/**
 * Site metadata for the single GROUNDTRUTH app.
 *
 * GROUNDTRUTH strip (2026-09-23): replaces `src/config/variant-meta.ts`
 * (deleted). The multi-variant system (tech/finance/commodity/happy/energy)
 * was removed; only the former `full` entry survives, values unchanged.
 * Originally forked from koala73/worldmonitor.
 */
export interface SiteMeta {
  title: string;
  description: string;
  keywords: string;
  url: string;
  siteName: string;
  shortName: string;
  subject: string;
  classification: string;
  categories: string[];
  features: string[];
}

export const SITE_META: SiteMeta = {
  title: 'GROUNDTRUTH — Evidence-First Global Incident Tracker',
  description:
    'Evidence-first global incident tracking: seismic, aviation, maritime, conflict and infrastructure signals — every record sourced, every claim tiered, nothing AI-synthesized.',
  keywords:
    'evidence-based OSINT, global incident tracker, earthquake monitor, flight tracking, AIS ships, conflict monitoring, provenance, claim verification, open source intelligence',
  url: 'https://www.worldmonitor.app/dashboard',
  siteName: 'GROUNDTRUTH',
  shortName: 'GROUNDTRUTH',
  subject: 'Evidence-First Global Incident Tracking',
  classification: 'Evidence-First Incident Tracker, OSINT Tool',
  categories: ['news', 'productivity'],
  features: [
    'Real-time news aggregation',
    'Stock market tracking',
    'Military flight monitoring',
    'Ship AIS tracking',
    'Earthquake alerts',
    'Protest tracking',
    'Power outage monitoring',
    'Oil price analytics',
    'Government spending data',
    'Prediction markets',
    'Infrastructure monitoring',
    'Geopolitical intelligence',
  ],
};

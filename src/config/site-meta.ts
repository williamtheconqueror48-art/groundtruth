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
  title: 'World Monitor - Real-Time Global Intelligence Dashboard',
  description:
    'Real-time global intelligence: conflicts, markets, military, OSINT signals — live in 190+ countries; structural resilience ranked for 170, in one view.',
  keywords:
    'AI intelligence, AI-powered dashboard, global intelligence, geopolitical dashboard, world news, market data, military bases, nuclear facilities, undersea cables, conflict zones, real-time monitoring, situation awareness, OSINT, flight tracking, AIS ships, earthquake monitor, protest tracker, power outages, oil prices, government spending, polymarket predictions',
  url: 'https://www.worldmonitor.app/dashboard',
  siteName: 'World Monitor',
  shortName: 'World Monitor',
  subject: 'AI-Powered Global Intelligence and Situation Awareness',
  classification: 'AI Intelligence Dashboard, OSINT Tool, News Aggregator',
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

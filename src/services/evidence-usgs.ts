/**
 * GROUNDTRUTH evidence layer v1 — USGS earthquake feed adapter.
 *
 * Phase 3 (2026-09-24). Fetches the keyless, CORS-open USGS significant-
 * earthquake GeoJSON feed and maps each feature to an EvidenceRecord.
 * Every claim is tiered SENSOR; the source is the USGS event detail page.
 * Fetch failure yields an empty record set — never a crash.
 */

import { canonicalize, type EvidenceRecord, makeRecord } from '../../shared/evidence/types';
import { stampSource } from '../../shared/evidence/provenance';

export const USGS_FEED_URL =
  'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_month.geojson';
export const USGS_PUBLISHER = 'USGS Earthquake Hazards Program';

const FETCH_TIMEOUT_MS = 20_000;

interface UsgsFeature {
  id?: string;
  properties?: {
    mag?: number | null;
    place?: string | null;
    time?: number | null;
    title?: string | null;
    url?: string | null;
  };
  geometry?: {
    type?: string;
    coordinates?: number[];
  };
}

interface UsgsFeed {
  features?: UsgsFeature[];
  metadata?: { generated?: number };
}

function isUsgsFeature(f: unknown): f is UsgsFeature {
  return Boolean(f) && typeof f === 'object' && !Array.isArray(f);
}

function eventPageUrl(feature: UsgsFeature): string {
  const fromProps = feature.properties?.url;
  if (typeof fromProps === 'string' && fromProps.startsWith('https://')) return fromProps;
  if (feature.id) return `https://earthquake.usgs.gov/earthquakes/eventpage/${feature.id}`;
  return USGS_FEED_URL;
}

/** Map one USGS GeoJSON feature to an EvidenceRecord. Returns null when the feature is unusable. */
export async function usgsFeatureToRecord(feature: UsgsFeature, retrievedAtISO: string): Promise<EvidenceRecord | null> {
  const props = feature.properties ?? {};
  const coords = feature.geometry?.coordinates ?? [];
  const lon = coords[0];
  const lat = coords[1];
  const mag = props.mag;
  const place = props.place ?? 'Unknown location';
  const timeMs = props.time;
  if (!feature.id || typeof lat !== 'number' || typeof lon !== 'number' ||
      typeof mag !== 'number' || typeof timeMs !== 'number') {
    return null;
  }
  const source = await stampSource({
    url: eventPageUrl(feature),
    publisher: USGS_PUBLISHER,
    payload: canonicalize(feature),
    retrievedAtISO,
  });
  return makeRecord({
    id: `usgs:${feature.id}`,
    domain: 'seismic',
    title: props.title ?? `M ${mag.toFixed(1)} — ${place}`,
    occurredAtISO: new Date(timeMs).toISOString(),
    lat,
    lon,
    placeName: place,
    claims: [
      {
        tier: 'SENSOR',
        text: `USGS sensor network detected M ${mag.toFixed(1)} earthquake near ${place}.`,
        sourceIndex: 0,
      },
    ],
    sources: [source],
    entities: [
      { kind: 'place', value: place },
      { kind: 'identifier', value: feature.id },
    ],
  });
}

/**
 * Fetch the USGS feed and return EvidenceRecords sorted newest-first.
 * Never throws: on any failure returns an empty array.
 */
export async function fetchUsgsEvidence(): Promise<EvidenceRecord[]> {
  const retrievedAtISO = new Date().toISOString();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(USGS_FEED_URL, {
        signal: controller.signal,
        headers: { Accept: 'application/geo+json,application/json' },
      });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) return [];
    const feed = (await res.json()) as UsgsFeed;
    const features = Array.isArray(feed.features) ? feed.features : [];
    const mapped = await Promise.all(features
      .filter(isUsgsFeature)
      .map(async (f) => {
        try {
          return await usgsFeatureToRecord(f, retrievedAtISO);
        } catch {
          // Skip malformed features; the feed as a whole still stands.
          return null;
        }
      }));
    const records = mapped.filter((r): r is EvidenceRecord => r !== null);
    records.sort((a, b) => (a.occurredAtISO < b.occurredAtISO ? 1 : -1));
    return records;
  } catch {
    return [];
  }
}

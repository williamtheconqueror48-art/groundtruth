/**
 * GROUNDTRUTH evidence layer v1 — record-level provenance types.
 *
 * Phase 3 (2026-09-24). Dependency-free: safe to import from the browser
 * (src/), Vercel edge handlers (server/, api/) and node scripts (scripts/).
 * No node:crypto, no SubtleCrypto, no async hashing — recordHash uses cyrb53.
 *
 * Design contract: every EvidenceRecord carries ≥1 SourceRef and every Claim
 * is tiered. Correlation is never represented as attribution or proof.
 */

export type ClaimTier =
  | 'OFFICIAL'
  | 'JOURNALISTIC'
  | 'ALLEGATION'
  | 'SENSOR'
  | 'VERIFIED_RECORD';

export interface Claim {
  /** Claim tier — OFFICIAL/JOURNALISTIC/ALLEGATION/SENSOR/VERIFIED_RECORD. */
  tier: ClaimTier;
  /** The claim text, verbatim or minimally normalized. Never AI-synthesized. */
  text: string;
  /** Index into the record's `sources` array for the source backing this claim. */
  sourceIndex: number;
}

export interface SourceRef {
  /** Canonical URL of the source document/record. */
  url: string;
  /** Publisher or dataset name, e.g. "USGS Earthquake Hazards Program". */
  publisher: string;
  /** ISO-8601 timestamp of when this source was retrieved. */
  retrievedAtISO: string;
  /** Hex digest of the retrieved payload — genuine SHA-256, never a substitute. */
  sha256: string;
}

export interface Entity {
  kind: 'place' | 'org' | 'person' | 'identifier';
  value: string;
}

export interface EvidenceRecord {
  /** Stable record id, e.g. "usgs:<event-id>". */
  id: string;
  /** Domain, e.g. "seismic". Kept open-ended for future domains. */
  domain: string;
  /** Short human title derived from the source record. */
  title: string;
  /** ISO-8601 occurrence time from the source record. */
  occurredAtISO: string;
  lat: number;
  lon: number;
  placeName: string;
  claims: Claim[];
  sources: SourceRef[];
  entities: Entity[];
  /** Integrity hash over the canonical JSON of the record minus this field. */
  recordHash: string;
}

/**
 * Deterministic canonical JSON: object keys sorted recursively, arrays kept
 * in order. The `recordHash` field is always excluded.
 */
export function canonicalize(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (Array.isArray(value)) {
    return `[${value.map((v) => canonicalize(v)).join(',')}]`;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([k]) => k !== 'recordHash')
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalize(v)}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

/**
 * cyrb53 — dependency-free 53-bit hash (public domain, bryc).
 * Returns a 14-char lowercase hex string. Not cryptographic; it is an
 * integrity fingerprint for change detection, not a security primitive.
 */
export function cyrb53(str: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0, ch: number; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const n = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return n.toString(16).padStart(14, '0');
}

/** Compute the recordHash for a record (hash input excludes recordHash itself). */
export function hashRecord(record: Omit<EvidenceRecord, 'recordHash'>): string {
  return cyrb53(canonicalize(record));
}

/** Build a complete, hash-stamped EvidenceRecord. Throws if sources is empty. */
export function makeRecord(
  record: Omit<EvidenceRecord, 'recordHash'>,
): EvidenceRecord {
  if (!record.sources || record.sources.length === 0) {
    throw new Error('EvidenceRecord requires at least one SourceRef');
  }
  for (const claim of record.claims) {
    if (claim.sourceIndex < 0 || claim.sourceIndex >= record.sources.length) {
      throw new Error(`Claim sourceIndex ${claim.sourceIndex} out of bounds`);
    }
  }
  return { ...record, recordHash: hashRecord(record) };
}

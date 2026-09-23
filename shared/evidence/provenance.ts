/**
 * GROUNDTRUTH evidence layer v1 — provenance stamping.
 *
 * Phase 3 (2026-09-24). Dependency-free except for the WebCrypto SHA-256
 * digest (globalThis.crypto.subtle — available in browsers, Node 18+ and
 * edge runtimes). Source digests are genuine SHA-256; the cyrb53 fingerprint
 * is used only for the record-level integrity hash (types.hashRecord), never
 * for a field named sha256.
 */

import {
  type ClaimTier,
  type EvidenceRecord,
  makeRecord,
  type SourceRef,
} from './types';

export interface ProvenanceInput {
  url: string;
  publisher: string;
  /** Raw payload bytes/text the hash is computed over. Optional when the
   *  caller already has a digest (e.g. sha256 of a downloaded file). */
  payload?: string;
  /** Pre-computed hex digest; used when payload is absent. */
  sha256?: string;
  retrievedAtISO?: string;
}

export interface ClaimTierMeta {
  tier: ClaimTier;
  /** Stamped label for UI. */
  label: string;
  /** One-line evidentiary meaning shown on hover / in dossiers. */
  meaning: string;
  /** Signal color for the brutalist stamp (UI reads this, not raw tier). */
  stampClass: string;
}

export const CLAIM_TIER_META: Record<ClaimTier, ClaimTierMeta> = {
  OFFICIAL: {
    tier: 'OFFICIAL',
    label: 'OFFICIAL',
    meaning: 'Statement issued by a government or authoritative institution.',
    stampClass: 'gt-stamp gt-stamp--official',
  },
  JOURNALISTIC: {
    tier: 'JOURNALISTIC',
    label: 'REPORTED',
    meaning: 'Reported by a journalistic outlet; not independently verified here.',
    stampClass: 'gt-stamp gt-stamp--journalistic',
  },
  ALLEGATION: {
    tier: 'ALLEGATION',
    label: 'ALLEGED',
    meaning: 'Allegation or claim by a party; treat as unproven.',
    stampClass: 'gt-stamp gt-stamp--allegation',
  },
  SENSOR: {
    tier: 'SENSOR',
    label: 'SENSOR',
    meaning: 'Machine observation from a sensor network (e.g. seismometers, ADS-B).',
    stampClass: 'gt-stamp gt-stamp--sensor',
  },
  VERIFIED_RECORD: {
    tier: 'VERIFIED_RECORD',
    label: 'VERIFIED',
    meaning: 'Checked against a primary record or independent corroboration.',
    stampClass: 'gt-stamp gt-stamp--verified',
  },
};

/** Genuine SHA-256 hex digest of a UTF-8 payload via WebCrypto. Throws when
 *  SubtleCrypto is unavailable rather than producing a mislabeled digest. */
export async function sha256Hex(payload: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error('sha256Hex requires SubtleCrypto (secure context / Node 18+ / edge runtime)');
  }
  const bytes = await subtle.digest('SHA-256', new TextEncoder().encode(payload));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Stamp provenance onto a source reference. Returns a SourceRef with
 * retrievedAtISO (now, unless given) and sha256 (real SHA-256 of the payload,
 * or the caller-supplied digest). Async because the digest uses WebCrypto.
 * Throws when no digest can be produced.
 */
export async function stampSource(input: ProvenanceInput): Promise<SourceRef> {
  const digest = input.payload !== undefined ? await sha256Hex(input.payload) : input.sha256;
  if (!digest) {
    throw new Error('stampSource requires payload or sha256');
  }
  return {
    url: input.url,
    publisher: input.publisher,
    retrievedAtISO: input.retrievedAtISO ?? new Date().toISOString(),
    sha256: digest,
  };
}

/**
 * Attach provenance to a record-in-progress and finalize it (hash-stamped).
 * Async because source stamping digests payloads with SHA-256 via WebCrypto.
 * Throws when the record ends up with zero sources.
 */
export async function attachProvenance(
  record: Omit<EvidenceRecord, 'recordHash' | 'sources'> & { sources?: SourceRef[] },
  provenance: ProvenanceInput,
): Promise<EvidenceRecord> {
  const sources = [...(record.sources ?? []), await stampSource(provenance)];
  return makeRecord({ ...record, sources });
}

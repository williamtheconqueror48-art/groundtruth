/**
 * GROUNDTRUTH evidence layer v1 — contract tests.
 *
 * Phase 3 (2026-09-24). Guards the zero-fabrication contract:
 * - every EvidenceRecord carries >=1 SourceRef and valid claim source indexes;
 * - SourceRef.sha256 is genuine SHA-256 (never a substitute digest);
 * - the USGS adapter maps feed features to SENSOR-tier records and never
 *   fabricates coordinates, magnitudes, or timestamps.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  canonicalize,
  hashRecord,
  makeRecord,
  type EvidenceRecord,
} from '../shared/evidence/types';
import {
  attachProvenance,
  CLAIM_TIER_META,
  sha256Hex,
  stampSource,
} from '../shared/evidence/provenance';
import { usgsFeatureToRecord } from '../src/services/evidence-usgs';

const SHA256_EMPTY = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

function baseRecord(): Omit<EvidenceRecord, 'recordHash'> {
  return {
    id: 'usgs:test123',
    domain: 'seismic',
    title: 'M 5.2 — 10km S of Testville',
    occurredAtISO: '2026-09-24T00:00:00.000Z',
    lat: 35.2,
    lon: -120.5,
    placeName: '10km S of Testville',
    claims: [{ tier: 'SENSOR', text: 'USGS sensor network detected M 5.2.', sourceIndex: 0 }],
    sources: [
      {
        url: 'https://earthquake.usgs.gov/earthquakes/eventpage/test123',
        publisher: 'USGS Earthquake Hazards Program',
        retrievedAtISO: '2026-09-24T00:00:01.000Z',
        sha256: SHA256_EMPTY,
      },
    ],
    entities: [
      { kind: 'place', value: '10km S of Testville' },
      { kind: 'identifier', value: 'test123' },
    ],
  };
}

describe('evidence record construction', () => {
  it('rejects records with zero sources', () => {
    const rec = baseRecord();
    rec.sources = [];
    assert.throws(() => makeRecord(rec), /at least one SourceRef/);
  });

  it('rejects claim sourceIndex values outside the sources array', () => {
    const rec = baseRecord();
    rec.claims = [{ tier: 'SENSOR', text: 'x', sourceIndex: 7 }];
    assert.throws(() => makeRecord(rec), /out of bounds/);
  });

  it('hashRecord is deterministic and ignores any recordHash field', () => {
    const a = hashRecord(baseRecord());
    const b = hashRecord({ ...baseRecord(), recordHash: 'forged' } as never);
    assert.equal(a, b);
    assert.match(a, /^[0-9a-f]{14}$/);
  });

  it('canonicalize sorts keys so key order cannot change the hash', () => {
    const x = canonicalize({ b: 1, a: { d: 2, c: 3 } });
    assert.equal(x, '{"a":{"c":3,"d":2},"b":1}');
  });
});

describe('provenance stamping', () => {
  it('sha256Hex matches node:crypto for a known vector', async () => {
    assert.equal(await sha256Hex(''), SHA256_EMPTY);
    const payload = '{"mag":5.2}';
    assert.equal(await sha256Hex(payload), createHash('sha256').update(payload, 'utf8').digest('hex'));
  });

  it('stampSource writes a genuine 64-char SHA-256 digest of the payload', async () => {
    const payload = '{"id":"test123"}';
    const ref = await stampSource({
      url: 'https://earthquake.usgs.gov/earthquakes/eventpage/test123',
      publisher: 'USGS Earthquake Hazards Program',
      payload,
      retrievedAtISO: '2026-09-24T00:00:01.000Z',
    });
    assert.equal(ref.sha256, createHash('sha256').update(payload, 'utf8').digest('hex'));
    assert.match(ref.sha256, /^[0-9a-f]{64}$/);
  });

  it('stampSource refuses to stamp without a payload or digest', async () => {
    await assert.rejects(
      () => stampSource({ url: 'https://example.com', publisher: 'x' }),
      /requires payload or sha256/,
    );
  });

  it('attachProvenance appends the source and finalizes the record hash', async () => {
    const { sources: _drop, ...rest } = baseRecord();
    const rec = await attachProvenance(rest as never, {
      url: 'https://earthquake.usgs.gov/earthquakes/eventpage/test123',
      publisher: 'USGS Earthquake Hazards Program',
      payload: '{"id":"test123"}',
    });
    assert.equal(rec.sources.length, 1);
    assert.match(rec.sources[0].sha256, /^[0-9a-f]{64}$/);
    assert.match(rec.recordHash, /^[0-9a-f]{14}$/);
  });

  it('defines exactly the five claim tiers', () => {
    assert.deepEqual(Object.keys(CLAIM_TIER_META).sort(), [
      'ALLEGATION',
      'JOURNALISTIC',
      'OFFICIAL',
      'SENSOR',
      'VERIFIED_RECORD',
    ]);
  });
});

describe('USGS adapter', () => {
  const feature = {
    id: 'test123',
    properties: {
      mag: 5.2,
      place: '10km S of Testville',
      time: 1758672000000,
      title: 'M 5.2 — 10km S of Testville',
      url: 'https://earthquake.usgs.gov/earthquakes/eventpage/test123',
    },
    geometry: { type: 'Point', coordinates: [-120.5, 35.2, 10] },
  };

  it('maps a feature to a SENSOR-tier record with a real source digest', async () => {
    const rec = await usgsFeatureToRecord(feature, '2026-09-24T00:00:01.000Z');
    assert.ok(rec);
    assert.equal(rec.id, 'usgs:test123');
    assert.equal(rec.claims[0].tier, 'SENSOR');
    assert.equal(rec.lat, 35.2);
    assert.equal(rec.lon, -120.5);
    assert.equal(rec.occurredAtISO, new Date(1758672000000).toISOString());
    assert.equal(rec.sources[0].url, 'https://earthquake.usgs.gov/earthquakes/eventpage/test123');
    assert.match(rec.sources[0].sha256, /^[0-9a-f]{64}$/);
  });

  it('returns null instead of fabricating data for malformed features', async () => {
    assert.equal(await usgsFeatureToRecord({ id: 'x', properties: {}, geometry: {} }, '2026-09-24T00:00:01.000Z'), null);
    assert.equal(await usgsFeatureToRecord({ properties: { mag: 5 } }, '2026-09-24T00:00:01.000Z'), null);
  });
});

# GROUNDTRUTH

**Evidence-first open-source intelligence.** An open-source layer for investigators that treats every claim as evidence: tiered, sourced, and traceable to its origin — never AI-synthesized narrative.

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Fork of World Monitor](https://img.shields.io/badge/Fork-koala73%2Fworldmonitor-black)](https://github.com/koala73/worldmonitor)

---

## What GROUNDTRUTH is

GROUNDTRUTH is a fork of [World Monitor](https://github.com/koala73/worldmonitor) rebuilt around one principle: **zero fabrication, zero speculation**. Situational-awareness dashboards show you what is happening; GROUNDTRUTH shows you *what is claimed, by whom, and what backs it* — so investigators, journalists, and analysts can build on it.

Every claim in the system carries:

- a **claim tier** — `OFFICIAL`, `JOURNALISTIC`, `ALLEGATION`, `SENSOR`, or `VERIFIED_RECORD`
- one or more **source references** — canonical URL, publisher, retrieval timestamp, and a genuine SHA-256 digest of the retrieved payload
- **entity linkage** — places, organizations, persons, and identifiers attached to records

Sourceless records are rejected by design. Correlation is never presented as attribution or proof.

## What works right now

- **Evidence layer v1** (`shared/evidence/`) — dependency-free record types, provenance helpers, and a genuine WebCrypto SHA-256 implementation for source payloads. Safe to import from the browser, edge handlers, and node scripts.
- **Live USGS seismic evidence** (`src/services/evidence-usgs.ts`) — the keyless, CORS-open USGS M4.5 monthly earthquake feed is mapped into `SENSOR`-tier evidence records. If the feed fails, the panel degrades to an honest empty state instead of inventing data.
- **Evidence panel** (`src/components/EvidencePanel.ts`) — every record exposes its raw data, source URL, publisher, retrieval timestamp, SHA-256 digest, linked entities, and claim tier.
- **Sourced timeline** (`src/components/EvidenceTimelinePanel.ts`) — the same sourced records sorted by occurrence time.
- **Anti-AI brutalist skin** — stark black/white with a signal-red accent, hard borders, monospaced display type, and claim-tier stamps. No gradients, no shadows, no marketing noise.

## What was stripped

GROUNDTRUTH removed everything that doesn't serve evidence: AI briefs/chat/insights and all LLM helpers, paid tiers and payments, the desktop app, site variants and theme packs, the blog, and premium gating. The full list of removals is in [MODIFICATIONS.md](./MODIFICATIONS.md).

## The evidence model

```ts
// shared/evidence/types.ts
type ClaimTier = 'OFFICIAL' | 'JOURNALISTIC' | 'ALLEGATION' | 'SENSOR' | 'VERIFIED_RECORD';

interface SourceRef {
  url: string;            // canonical URL of the source document/record
  publisher: string;      // publisher or dataset name
  retrievedAtISO: string; // when this source was retrieved
  sha256: string;         // genuine SHA-256 of the retrieved payload
}
```

Design contract: every `EvidenceRecord` carries ≥1 `SourceRef` and every `Claim` is tiered. Claim text is verbatim or minimally normalized — never AI-synthesized.

## Quick start

```bash
git clone https://github.com/williamtheconqueror48-art/groundtruth.git
cd groundtruth
npm install
npm run dev
```

The app runs with no environment variables. Checks used by CI:

```bash
npm run typecheck      # client typecheck
npm run typecheck:api  # serverless API typecheck
npm run build          # production build
npm run lint:boundaries
```

## Tech stack

| Category | Technologies |
|----------|--------------|
| **Frontend** | Vanilla TypeScript, Vite, globe.gl + Three.js, deck.gl + MapLibre GL |
| **Deployment** | Vercel Edge Functions |
| **Evidence layer** | Dependency-free TypeScript (`shared/evidence/`), WebCrypto SHA-256 |

## Roadmap

- More live keyless evidence domains (AIS, ADS-B, public incident feeds)
- Durable evidence storage (Convex vs Postgres under evaluation)
- GROUNDTRUTH OG image (currently points at an upstream-branded asset)

## Contributing

Contributions welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines. Bug reports: [issues](https://github.com/williamtheconqueror48-art/groundtruth/issues).

## License

**AGPL-3.0-only.** See [LICENSE](LICENSE) for the full text.

GROUNDTRUTH is a fork of [World Monitor](https://github.com/koala73/worldmonitor) by Elie Habib, audited at upstream commit `793be04bbc7dfb5694e3c6949a1365ca89743572`. All modifications from that point are listed in [MODIFICATIONS.md](./MODIFICATIONS.md). Copyright (C) 2024-2026 Elie Habib — the original copyright line is preserved verbatim, as are the nested MIT licenses in `cli/` and `sdk/`.

As a hosted AGPL application, the corresponding source of the running instance is this repository.

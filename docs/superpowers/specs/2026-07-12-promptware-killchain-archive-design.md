# Promptware Kill-Chain Archive — Design Spec

**Date:** 2026-07-12
**Owner:** Elad Feldman (co-author, *The Promptware Kill Chain*, NDSS'27)
**Folder:** `~/claude/kill-chain-site`
**Status:** Approved design, pending spec review

## Purpose
A durable, standalone archive website that extends **Table II** of the Promptware Kill-Chain SoK.
For every paper/incident it stores: the kill-chain coding (the paper's Table II columns), a short
per-stage justification, the source excerpt each coding was drawn from, the publication URL, and a
**self-hosted hard copy** of the source so the record survives if the origin changes or disappears.

## Non-goals
- No CMS, database, or server-side code — static files only.
- No heavyweight web framework (durability + low maintenance prioritized over UI richness).
- We do not deploy on the user's behalf; we make it publish-ready and guide the final push.

## Decisions (locked)
| Decision | Choice |
|---|---|
| Location | New standalone site at `~/claude/kill-chain-site` |
| Approach | Data-first, minimal owned build script (no framework) |
| Archival | Self-hosted snapshot: PDFs downloaded as-is; web pages via `single-file-cli` (headless Chrome) → one self-contained `.html`; `sha256` recorded |
| Analysis depth | Table II columns + per-stage justification + source excerpt/locator |
| Ingestion | Script-assisted: `npm run add -- <url>` snapshots + scaffolds a record |
| Host | GitHub Pages (account `eladfeld`); built site served from repo |
| Snapshot tool | `single-file-cli` via `npx` (Chrome at `/Applications/Google Chrome.app`) |

## Data model — one YAML record per incident (`data/incidents/<slug>.yml`)
```yaml
slug: morris-ii-worm
title: "Morris II Worm"
paper_ref: 7                 # [7] in the SoK
date: 2024-03                # displayed as Mar'24
category: AI Worm            # controlled vocab (see enums)
target: "Email assistants"
source:
  url: "https://…"
  type: paper                # paper | blog | advisory | cve | tweet | other
  snapshot: paper.pdf        # file under archive/<slug>/
  archived_at: 2026-07-12
  sha256: "…"                # integrity fingerprint
stages:
  initial_access:      { value: "Received email", justification: "…", evidence: { quote: "…", locator: "§5.1" } }
  privilege_escalation:{ value: "Role-play JB",   justification: "…", evidence: { quote: "…", locator: "…" } }
  reconnaissance: null       # null == the "–" in Table II (stage absent)
  persistence:         { value: RAG-dep,          justification: "…", evidence: { quote: "…", locator: "…" } }
  command_control: null
  lateral_movement:    { value: Self-rep,         justification: "…", evidence: { quote: "…", locator: "…" } }
  action_on_objective: { value: "Data exfil., spam", justification: "…", evidence: { quote: "…", locator: "…" } }
```
Notes:
- `coverage` (stage count, the "5 stages" metric) is **computed at build time** from non-null stages — never hand-entered.
- A stage is `null` when absent; otherwise an object with `value` (required), `justification` (required), `evidence` (required: `quote` + `locator`, where locator = section/page/URL-anchor in the source).

### Controlled vocabularies (enforced by schema)
- **category:** `Browser/Search | Enterprise | Coding Assist. | AI Agent | Agentic/CUA | Crypto/DeFi | AI Worm | Multimodal`
- **persistence.value:** `RAG-dep | RAG-indep | Session | Git-repo`
- **command_control.value:** `native` (present) / `null` (absent)
- **lateral_movement.value:** `Perm | Self-rep | Pipeline | Supply-ch | Git-propag | Cross-agent | Cross-app | Cross-client`
- **initial_access / privilege_escalation / reconnaissance / action_on_objective:** free-text `value` (varied in source table) but `justification` + `evidence` still required when non-null.

Validation runs on every build via `schema/incident.schema.json`; a bad code or missing justification fails the build loudly.

## Archive mechanism (`archive/<slug>/`)
- PDF source → downloaded to `paper.pdf`.
- Web source → `single-file-cli` renders it (JS executed, assets inlined) to `snapshot.html`.
- `meta.json` records `{ url, archived_at, sha256, tool, content_type }`.
- Detail pages link **both** the original URL and the local copy.

## Website (generated into `docs/` for GitHub Pages; all links relative)
1. **Home** — interactive Table II: kill-chain grid, one row per incident; client-side filter/sort by category, date, and stage presence; coverage badge; row → detail page. No framework — one small vanilla-JS file over a generated `incidents.json`.
2. **Incident detail** — metadata header; original-URL + local-snapshot links; the 7 stages, each showing value + justification + source excerpt/locator.
3. **Methodology** — kill-chain stage definitions + coding legend (from the paper).
4. **Stats** — auto-regenerates the paper's Table III (stage distribution by time period) from the records.

## Ingestion & build scripts (`scripts/`, Node ESM)
- `add.mjs` — `npm run add -- <url>`: detect PDF vs HTML → snapshot into `archive/<slug>/` (compute sha256) → scaffold `data/incidents/<slug>.yml` pre-filled (title/date/url/snapshot/checksum), stage fields empty.
- `validate.mjs` — load all records, validate against JSON Schema, assert each referenced snapshot file exists and each record has a `source.url`.
- `build.mjs` — validate, then render `docs/` (index + detail pages + `incidents.json`), and copy `archive/` into `docs/archive/` so hard copies are served.

## Repo layout
```
kill-chain-site/
  data/incidents/*.yml
  schema/incident.schema.json
  archive/<slug>/{paper.pdf|snapshot.html, meta.json}
  scripts/{add,validate,build}.mjs
  templates/{layout,index,incident,methodology,stats}.*
  assets/{style.css, table.js}
  docs/                      # generated site (GitHub Pages source)
  package.json
  README.md                  # add-a-paper guide for co-authors
```
Note: the design spec lives at `docs/superpowers/specs/`; the build writes site pages to `docs/`
but never into `docs/superpowers/`, so the two never collide.

## Seeding the existing 36
Batch-import all 36 Table II rows into records (kill-chain values known from the paper, already
extracted). `justification` + `evidence` left as `TODO` for the authors to fill from each source —
that's the scholarly-judgment part. Source snapshots archived in the same batch where URLs are known.

## Deploy (GitHub Pages)
Build outputs to `docs/`. Publish path: create repo under `eladfeld` → push → set Pages to serve
`main` branch `/docs`. Links are relative so it works under `eladfeld.github.io/<repo>/`. The user
performs (or explicitly authorizes) the repo creation + push; the design is host-ready before then.

## Testing
- Schema validation is the primary gate (blocks build on bad data).
- Link/integrity check: every snapshot file exists; every record has a URL; sha256 recomputed matches `meta.json`.
- Smoke: build succeeds, home page lists all records, one detail page renders end-to-end.

## Risks / open points
- `single-file-cli` may fail on sites that block headless Chrome (paywalls, aggressive bot checks) →
  fallback: manual save + drop file into `archive/<slug>/` and fill `meta.json`.
- Some Table II sources are behind X/Twitter or vendor blogs that rot fastest → prioritize archiving those.
- Justification/evidence backfill for 36 records is author effort, not automatable.

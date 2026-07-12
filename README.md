# Promptware Kill-Chain Archive

A durable, standalone archive that extends **Table II** of *The Promptware Kill Chain*
(Brodt, Feldman, Schneier, Nassi — NDSS'27). Every prompt-injection / promptware
incident is coded across the seven-stage kill chain, with a short per-stage
justification, the source excerpt each coding was drawn from, the publication URL,
and a **self-hosted hard copy** of the source so records survive if origins disappear.

> ⚠ **Work in progress** — data is being verified. Some source URLs and per-stage
> justifications are still `TODO` placeholders.

## Structure
- `data/incidents/*.yml` — one record per incident (edit these).
- `schema/incident.schema.json` — validation rules / allowed kill-chain codes.
- `archive/<slug>/` — locally archived hard copy of each source (+ `meta.json`).
- `scripts/` — `add` (ingest), `validate`, `build`.
- `docs/` — the generated static site (served by GitHub Pages).

## Add a paper
```bash
npm install
npm run add -- <url>     # snapshots the source + scaffolds a record
# fill category / target / date + the 7 kill-chain stages in the new .yml
npm run build            # validates, then regenerates docs/
```

## Kill-chain stages
Initial Access · Privilege Escalation · Reconnaissance · Persistence ·
Command & Control · Lateral Movement · Actions on Objective.

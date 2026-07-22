import fs from 'node:fs';
import path from 'node:path';
import { ROOT, STAGE_KEYS, STAGE_LABELS, loadIncidents, validateAll, coverage, dateDisplay, stageValue, escapeHtml } from './lib.mjs';

const OUT = path.join(ROOT, 'docs');
const cssVer = Math.floor(fs.statSync(path.join(ROOT, 'assets', 'style.css')).mtimeMs);
const jsVer = Math.floor(fs.statSync(path.join(ROOT, 'assets', 'table.js')).mtimeMs);
const incidents = loadIncidents();
const errors = validateAll(incidents);
if (errors.length) { console.error(`✗ build aborted (${errors.length} error(s)):`); errors.forEach(e => console.error('  - ' + e)); process.exit(1); }

fs.mkdirSync(path.join(OUT, 'incident'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'assets'), { recursive: true });
for (const a of ['style.css', 'table.js']) fs.copyFileSync(path.join(ROOT, 'assets', a), path.join(OUT, 'assets', a));
const archiveSrc = path.join(ROOT, 'archive');
if (fs.existsSync(archiveSrc)) fs.cpSync(archiveSrc, path.join(OUT, 'archive'), { recursive: true });

const json = incidents.map(inc => ({
  slug: inc.slug, title: inc.title, date: inc.date, dateDisplay: dateDisplay(inc.date),
  category: inc.category, target: inc.target, coverage: coverage(inc),
  venue: inc.source.venue || null,
  isNew: !!inc.new,
  stages: Object.fromEntries(STAGE_KEYS.map(k => [k, stageValue(inc, k)])),
  url: inc.source.url
}));
fs.writeFileSync(path.join(OUT, 'incidents.json'), JSON.stringify(json, null, 2));

function page(title, body, prefix) {
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="${prefix}assets/style.css?v=${cssVer}">
</head><body>
<header class="site"><a class="home" href="${prefix}index.html">Promptware Kill-Chain Archive</a>
<span class="sub">Extending Table II — <em>The Promptware Kill Chain</em> (NDSS'27)</span></header>
<div class="wip">⚠ Work in progress — data is being verified. Some source URLs and per-stage justifications are placeholders (<code>TODO</code>).</div>
<main>${body}</main>
<footer>Self-hosted archive of promptware incidents. Every source is snapshotted locally for durability.</footer>
</body></html>`;
}

const indexBody = `
<p class="intro">An archival, defensible extension of Table II: every prompt-injection / promptware incident coded across the seven-stage kill chain, with per-stage justification, source evidence, and a locally archived copy of each source.</p>
<div class="controls">
  <input id="q" type="search" placeholder="Search title or target…">
  <select id="cat"><option value="">All categories</option></select>
  <select id="year"><option value="">All years</option></select>
  <label class="cov">Min stages <select id="cov"></select></label>
  <span id="count" class="count"></span>
</div>
<div class="table-wrap"><table id="grid"><thead></thead><tbody></tbody></table></div>
<script src="assets/table.js?v=${jsVer}"></script>`;
fs.writeFileSync(path.join(OUT, 'index.html'), page('Promptware Kill-Chain Archive', indexBody, ''));

function stageRow(inc, k) {
  const s = inc.stages[k];
  const label = STAGE_LABELS[k];
  if (!s) return `<tr class="absent"><th>${label}</th><td class="val">—</td><td class="why">not demonstrated</td></tr>`;
  const todo = /^TODO/.test(s.justification) ? ' todo' : '';
  return `<tr><th>${label}</th><td class="val">${escapeHtml(s.value)}</td>
   <td class="why${todo}"><div class="just">${escapeHtml(s.justification)}</div>
   <div class="ev"><q>${escapeHtml(s.evidence.quote)}</q> <span class="loc">${escapeHtml(s.evidence.locator)}</span></div></td></tr>`;
}
for (const inc of incidents) {
  const snap = inc.source.snapshot
    ? `<a href="../archive/${inc.slug}/${encodeURIComponent(inc.source.snapshot)}">archived copy</a>`
    : '<span class="pending">archive pending</span>';
  const body = `
  <p class="back"><a href="../index.html">← all incidents</a></p>
  <h1>${escapeHtml(inc.title)}</h1>
  <table class="meta"><tbody>
   <tr><th>Date</th><td>${dateDisplay(inc.date)}</td></tr>
   <tr><th>Category</th><td>${escapeHtml(inc.category)}</td></tr>
   <tr><th>Target</th><td>${escapeHtml(inc.target)}</td></tr>
   <tr><th>Coverage</th><td>${coverage(inc)} / 7 stages</td></tr>
   <tr><th>Venue</th><td>${escapeHtml(inc.source.venue || "—")}</td></tr>
   <tr><th>Source</th><td><a href="${escapeHtml(inc.source.url)}" rel="noreferrer noopener">original (${escapeHtml(inc.source.type)})</a> · ${snap}</td></tr>
  </tbody></table>
  <h2>Kill-chain analysis</h2>
  <table class="stages"><tbody>${STAGE_KEYS.map(k => stageRow(inc, k)).join('\n')}</tbody></table>`;
  fs.writeFileSync(path.join(OUT, 'incident', inc.slug + '.html'), page(inc.title + ' — Archive', body, '../'));
}
console.log(`✓ built ${incidents.length} incident(s) → docs/`);

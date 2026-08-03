// Reassign every incident's `id` as YYYY-NNN, where YYYY = the incident's
// date year and NNN = a per-year sequence assigned in (date, slug) order.
// Run after adding or removing incidents so ids stay contiguous per year.
//
//   node scripts/reindex.mjs   (or: npm run reindex)
//
// IDs are accession numbers: assign-once in spirit, but because this project
// is pre-publication we DO renumber to keep each year's block contiguous
// (1..N with no gaps) after an add/remove. Display order is driven by `date`,
// never by id, so renumbering never changes what a reader sees.
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import yaml from 'js-yaml';

const dir = path.join(path.dirname(url.fileURLToPath(import.meta.url)), '..', 'data', 'incidents');
const files = fs.readdirSync(dir).filter(f => /\.ya?ml$/.test(f));
const recs = files.map(f => {
  const d = yaml.load(fs.readFileSync(path.join(dir, f), 'utf8'));
  return { f, slug: d.slug, date: d.date };
});
recs.sort((a, b) => a.date.localeCompare(b.date) || a.slug.localeCompare(b.slug));
const ctr = {};
for (const r of recs) {
  const y = r.date.slice(0, 4);
  ctr[y] = (ctr[y] || 0) + 1;
  const id = `${y}-${String(ctr[y]).padStart(3, '0')}`;
  const p = path.join(dir, r.f);
  const lines = fs.readFileSync(p, 'utf8').split('\n').filter(l => !/^id:/.test(l));
  const i = lines.findIndex(l => /^slug:/.test(l));
  lines.splice(i + 1, 0, `id: ${id}`);
  fs.writeFileSync(p, lines.join('\n'));
}
console.log(`reindexed ${recs.length} incident(s)`);

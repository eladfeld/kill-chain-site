import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { ROOT } from './lib.mjs';

const target = process.argv[2];
if (!target) { console.error('usage: npm run add -- <url>'); process.exit(1); }
const slugify = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

const res = await fetch(target, { redirect: 'follow' });
const ct = res.headers.get('content-type') || '';
let buf = Buffer.from(await res.arrayBuffer());
const isPdf = ct.includes('pdf') || target.toLowerCase().endsWith('.pdf');
let title = '';
if (!isPdf) { const m = buf.toString('utf8').match(/<title[^>]*>([^<]*)<\/title>/i); title = m ? m[1].trim() : ''; }
const slug = slugify(title || new URL(target).hostname + '-' + Date.now());
const dir = path.join(ROOT, 'archive', slug);
fs.mkdirSync(dir, { recursive: true });

let snapshot, tool;
if (isPdf) {
  snapshot = 'paper.pdf'; tool = 'fetch';
  fs.writeFileSync(path.join(dir, snapshot), buf);
} else {
  snapshot = 'snapshot.html'; tool = 'single-file-cli';
  execFileSync('npx', ['--yes', 'single-file', target, path.join(dir, snapshot),
    '--browser-executable-path=/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'], { stdio: 'inherit' });
  buf = fs.readFileSync(path.join(dir, snapshot));
}
const sha = crypto.createHash('sha256').update(buf).digest('hex');
const today = new Date().toISOString().slice(0, 10);
fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({ url: target, archived_at: today, sha256: sha, tool, content_type: ct }, null, 2));

// assign next free accession id for this year (YYYY-NNN, assign-once, never renumbered)
const year = today.slice(0, 4);
const incDir = path.join(ROOT, 'data', 'incidents');
const maxSeq = fs.readdirSync(incDir).filter(f => /\.ya?ml$/.test(f))
  .flatMap(f => (fs.readFileSync(path.join(incDir, f), 'utf8').match(new RegExp(`^id:\\s*${year}-(\\d{3})`, 'm')) || []).slice(1))
  .reduce((m, n) => Math.max(m, +n), 0);
const id = `${year}-${String(maxSeq + 1).padStart(3, '0')}`;

const yml = `slug: ${slug}
id: ${id}         # accession id — if you change the date's YEAR, reassign to next free <year>-NNN
title: "${(title || slug).replace(/"/g, '\\"')}"
date: ${today.slice(0, 7)}         # TODO verify actual publication month (YYYY-MM)
category: Browser/Search          # TODO set: Enterprise|Coding Assist.|AI Agent|Agentic/CUA|Crypto/DeFi|AI Worm|Multimodal
target: "TODO"
source:
  url: "${target}"
  type: ${isPdf ? 'paper' : 'blog'}
  snapshot: ${snapshot}
  archived_at: ${today}
  sha256: "${sha}"
stages:
  initial_access: null
  privilege_escalation: null
  reconnaissance: null
  persistence: null
  command_control: null
  lateral_movement: null
  action_on_objective: null
`;
fs.writeFileSync(path.join(ROOT, 'data', 'incidents', slug + '.yml'), yml);
console.log(`✓ archived  → archive/${slug}/${snapshot}  (sha256 ${sha.slice(0, 12)}…)`);
console.log(`✓ scaffold  → data/incidents/${slug}.yml  (fill category/target/date + stages, then npm run build)`);

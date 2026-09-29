// npm run archive-sources — snapshot every incident's source into archive/<slug>/
// so reviewers can still read it if the original goes offline.
//   PDFs (incl. arXiv abs pages -> their PDF) are fetched as-is  -> paper.pdf
//   web pages are saved as one self-contained file by single-file -> snapshot.html
//   if the live page fails, the latest Wayback Machine capture is tried instead.
// Fills source.snapshot / archived_at / sha256 in the YAML. Incidents that already
// have a snapshot are skipped, so the script is safe to re-run. Pass slugs to limit.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import yaml from 'js-yaml';
import { ROOT } from './lib.mjs';

const run = promisify(execFile);
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';
const incDir = path.join(ROOT, 'data', 'incidents');
const only = new Set(process.argv.slice(2));
const today = new Date().toISOString().slice(0, 10);

function pdfUrl(url) {
  const m = url.match(/^https?:\/\/arxiv\.org\/(?:abs|pdf)\/([^?#]+?)(?:\.pdf)?(?:[?#].*)?$/);
  if (m) return `https://arxiv.org/pdf/${m[1]}`;
  return /\.pdf([?#].*)?$/i.test(url) ? url : null;
}

async function fetchPdf(url) {
  const res = await fetch(url, { redirect: 'follow', headers: { 'user-agent': UA } });
  const buf = Buffer.from(await res.arrayBuffer());
  if (!res.ok || buf.subarray(0, 5).toString() !== '%PDF-') throw new Error(`not a PDF (HTTP ${res.status})`);
  return buf;
}

async function singleFile(url, out) {
  await run('npx', ['--yes', 'single-file-cli', url, out, `--browser-executable-path=${CHROME}`,
    '--browser-wait-until=networkIdle', '--browser-load-max-time=60000'], { timeout: 180000 });
  const buf = fs.readFileSync(out);
  if (buf.length < 2000) throw new Error(`snapshot too small (${buf.length} B)`);
  return buf;
}

async function waybackUrl(url) {
  const res = await fetch(`https://archive.org/wayback/available?url=${encodeURIComponent(url)}`);
  const snap = (await res.json())?.archived_snapshots?.closest;
  if (!snap?.available) throw new Error('no Wayback capture');
  return snap.url.replace(/\/web\/(\d+)\//, '/web/$1id_/'); // id_ = original bytes, no toolbar
}

async function archive(inc) {
  const dir = path.join(ROOT, 'archive', inc.slug);
  fs.mkdirSync(dir, { recursive: true });
  const url = inc.source.url;
  const html = path.join(dir, 'snapshot.html');
  const attempts = [];
  const pdf = pdfUrl(url);
  if (pdf) attempts.push({ file: 'paper.pdf', tool: 'fetch', get: async () => [await fetchPdf(pdf), pdf] });
  attempts.push({ file: 'snapshot.html', tool: 'single-file-cli', get: async () => [await singleFile(url, html), url] });
  attempts.push({ file: 'snapshot.html', tool: 'single-file-cli (wayback)', get: async () => {
    const w = await waybackUrl(url);
    return [await singleFile(w, html), w];
  } });
  const errors = [];
  for (const { file, tool, get } of attempts) {
    try {
      const [buf, from] = await get();
      fs.writeFileSync(path.join(dir, file), buf);
      const sha = crypto.createHash('sha256').update(buf).digest('hex');
      fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(
        { url, fetched_from: from, archived_at: today, sha256: sha, tool, bytes: buf.length }, null, 2));
      return { file, sha, tool };
    } catch (e) { errors.push(`${tool}: ${e.message.split('\n')[0]}`); }
  }
  fs.rmSync(dir, { recursive: true, force: true });
  throw new Error(errors.join(' | '));
}

function writeYaml(file, snap) {
  let s = fs.readFileSync(file, 'utf8');
  s = s.replace(/^  snapshot: .*$/m, `  snapshot: ${snap.file}`)
       .replace(/^  archived_at: .*$/m, `  archived_at: "${today}"`)
       .replace(/^  sha256: .*$/m, `  sha256: ${snap.sha}`);
  fs.writeFileSync(file, s);
}

const files = fs.readdirSync(incDir).filter(f => /\.ya?ml$/.test(f)).map(f => path.join(incDir, f));
const todo = files.map(f => [f, yaml.load(fs.readFileSync(f, 'utf8'))])
  .filter(([, inc]) => !inc.source.snapshot && (!only.size || only.has(inc.slug)));
console.log(`archiving ${todo.length} source(s)`);

const failed = [];
let next = 0;
async function worker() {
  while (next < todo.length) {
    const [file, inc] = todo[next++];
    try {
      const snap = await archive(inc);
      writeYaml(file, snap);
      console.log(`✓ ${inc.slug}  ${snap.file} via ${snap.tool}`);
    } catch (e) {
      failed.push(inc.slug);
      console.log(`✗ ${inc.slug}  ${inc.source.url}\n    ${e.message}`);
    }
  }
}
await Promise.all(Array.from({ length: 4 }, worker));
console.log(`done: ${todo.length - failed.length} archived, ${failed.length} failed${failed.length ? ': ' + failed.join(' ') : ''}`);

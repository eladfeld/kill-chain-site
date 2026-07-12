import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import yaml from 'js-yaml';
import Ajv from 'ajv';

export const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
export const STAGE_KEYS = ['initial_access', 'privilege_escalation', 'reconnaissance', 'persistence', 'command_control', 'lateral_movement', 'action_on_objective'];
export const STAGE_LABELS = { initial_access: 'Initial Access', privilege_escalation: 'Priv. Esc.', reconnaissance: 'Recon.', persistence: 'Persist.', command_control: 'C2', lateral_movement: 'Lat. Mov.', action_on_objective: 'Action on Obj.' };
const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function dateDisplay(d) { const [y, m] = d.split('-'); return `${MONTHS[parseInt(m, 10)]}'${y.slice(2)}`; }
export function coverage(inc) { return STAGE_KEYS.filter(k => inc.stages[k]).length; }
export function stageValue(inc, k) { const s = inc.stages[k]; return s ? s.value : null; }
export function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

export function loadIncidents() {
  const dir = path.join(ROOT, 'data', 'incidents');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => /\.ya?ml$/.test(f)).map(f => {
    const doc = yaml.load(fs.readFileSync(path.join(dir, f), 'utf8'));
    doc.__file = f;
    return doc;
  }).sort((a, b) => a.date.localeCompare(b.date));
}

export function validateAll(incidents) {
  const schema = JSON.parse(fs.readFileSync(path.join(ROOT, 'schema', 'incident.schema.json'), 'utf8'));
  const ajv = new Ajv({ allErrors: true });
  const validate = ajv.compile(schema);
  const errors = [];
  const slugs = new Set();
  for (const inc of incidents) {
    const { __file: _f, ...rest } = inc;
    if (!validate(rest)) for (const e of validate.errors) errors.push(`${inc.__file || inc.slug}: ${e.instancePath || '/'} ${e.message}`);
    if (slugs.has(inc.slug)) errors.push(`duplicate slug: ${inc.slug}`);
    slugs.add(inc.slug);
    if (inc.source && inc.source.snapshot) {
      const p = path.join(ROOT, 'archive', inc.slug, inc.source.snapshot);
      if (!fs.existsSync(p)) errors.push(`${inc.slug}: snapshot file missing (${p})`);
    }
  }
  return errors;
}

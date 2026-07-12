import { loadIncidents, validateAll } from './lib.mjs';
const incidents = loadIncidents();
const errors = validateAll(incidents);
if (errors.length) {
  console.error(`✗ ${errors.length} validation error(s):`);
  errors.forEach(e => console.error('  - ' + e));
  process.exit(1);
}
console.log(`✓ ${incidents.length} incident(s) valid`);

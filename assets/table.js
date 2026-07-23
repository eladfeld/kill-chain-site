const STAGES = [
  ['initial_access', 'Initial Access'], ['privilege_escalation', 'Priv. Esc.'],
  ['reconnaissance', 'Recon.'], ['persistence', 'Persist.'], ['command_control', 'C2'],
  ['lateral_movement', 'Lat. Mov.'], ['action_on_objective', 'Action on Obj.']
];
let DATA = [];
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

fetch('incidents.json?v=' + Date.now()).then(r => r.json()).then(d => { DATA = d; setup(); });

function setup() {
  const cats = [...new Set(DATA.map(d => d.category))].sort();
  cats.forEach(c => { const o = document.createElement('option'); o.value = c; o.textContent = c; $('#cat').appendChild(o); });
  const years = [...new Set(DATA.map(d => d.date.slice(0, 4)))].sort();
  years.forEach(y => { const o = document.createElement('option'); o.value = y; o.textContent = y; $('#year').appendChild(o); });
  for (let i = 0; i <= 6; i++) { const o = document.createElement('option'); o.value = i; o.textContent = i; $('#cov').appendChild(o); }
  $('#grid thead').innerHTML = '<tr><th class="c-title">Incident</th><th>Date</th><th>Category</th><th>Target</th><th>Venue</th>' +
    STAGES.map(s => `<th>${s[1]}</th>`).join('') + '<th>Cov.</th></tr>';
  ['#q', '#cat', '#year', '#newf', '#cov'].forEach(id => $(id).addEventListener('input', render));
  setupModal();
  render();
}

function render() {
  const q = $('#q').value.toLowerCase(), cat = $('#cat').value, year = $('#year').value, nf = $('#newf').value, cov = +$('#cov').value;
  const rows = DATA.filter(d =>
    (!cat || d.category === cat) && (!year || d.date.startsWith(year)) && (!nf || (nf === 'new') === d.isNew) && d.coverage >= cov &&
    (!q || d.title.toLowerCase().includes(q) || d.target.toLowerCase().includes(q)));
  $('#grid tbody').innerHTML = rows.map(d => {
    const cells = STAGES.map(s => {
      const v = d.stages[s[0]];
      return v ? `<td class="on"><span class="chip" title="${esc(v)}">${esc(v)}</span></td>` : '<td class="off">–</td>';
    }).join('');
    const tag = d.isNew ? ' <span class="newtag">NEW</span>' : '';
    const venue = d.venue && d.venue !== 'TODO-verify' ? esc(d.venue) : '<span class="pending">TBD</span>';
    return `<tr data-slug="${d.slug}"><td class="title"><a class="rowlink" href="incident/${d.slug}.html">${esc(d.title)}</a>${tag}</td><td>${d.dateDisplay}</td><td>${esc(d.category)}</td><td>${esc(d.target)}</td><td class="venue">${venue}</td>${cells}<td class="cov cov-${d.coverage}"><span class="badge">${d.coverage}</span></td></tr>`;
  }).join('');
  $('#grid tbody').querySelectorAll('tr').forEach(tr => {
    tr.addEventListener('click', e => {
      if (e.metaKey || e.ctrlKey) return;          // let cmd/ctrl-click open a new tab
      e.preventDefault();
      openModal(tr.dataset.slug);
    });
  });
  $('#count').textContent = `${rows.length} / ${DATA.length} incidents`;
}

function setupModal() {
  const m = $('#modal');
  m.querySelector('.modal-close').addEventListener('click', closeModal);
  m.addEventListener('click', e => { if (e.target === m) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !m.hidden) closeModal(); });
}
function openModal(slug) {
  const m = $('#modal'), body = m.querySelector('.modal-body');
  body.innerHTML = '<p class="loading">Loading…</p>';
  m.hidden = false; document.body.classList.add('modal-open');
  fetch('incident/' + slug + '.html?v=' + Date.now()).then(r => r.text()).then(html => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const main = doc.querySelector('main');
    const back = main && main.querySelector('.back'); if (back) back.remove();
    body.innerHTML = main ? main.innerHTML : '<p>Not found.</p>';
    m.querySelector('.modal-card').scrollTop = 0;
  }).catch(() => { body.innerHTML = '<p>Failed to load incident.</p>'; });
}
function closeModal() { $('#modal').hidden = true; document.body.classList.remove('modal-open'); }

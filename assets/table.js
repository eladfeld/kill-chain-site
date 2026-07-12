const STAGES = [
  ['initial_access', 'Initial Access'], ['privilege_escalation', 'Priv. Esc.'],
  ['reconnaissance', 'Recon.'], ['persistence', 'Persist.'], ['command_control', 'C2'],
  ['lateral_movement', 'Lat. Mov.'], ['action_on_objective', 'Action on Obj.']
];
let DATA = [];
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

fetch('incidents.json').then(r => r.json()).then(d => { DATA = d; setup(); });

function setup() {
  const cats = [...new Set(DATA.map(d => d.category))].sort();
  const catSel = $('#cat');
  cats.forEach(c => { const o = document.createElement('option'); o.value = c; o.textContent = c; catSel.appendChild(o); });
  const covSel = $('#cov');
  for (let i = 0; i <= 6; i++) { const o = document.createElement('option'); o.value = i; o.textContent = i; covSel.appendChild(o); }
  $('#grid thead').innerHTML = '<tr><th class="c-title">Incident</th><th>Date</th><th>Category</th><th>Target</th>' +
    STAGES.map(s => `<th>${s[1]}</th>`).join('') + '<th>Cov.</th></tr>';
  ['#q', '#cat', '#cov'].forEach(id => $(id).addEventListener('input', render));
  render();
}

function render() {
  const q = $('#q').value.toLowerCase(), cat = $('#cat').value, cov = +$('#cov').value;
  const rows = DATA.filter(d =>
    (!cat || d.category === cat) && d.coverage >= cov &&
    (!q || d.title.toLowerCase().includes(q) || d.target.toLowerCase().includes(q)));
  $('#grid tbody').innerHTML = rows.map(d => {
    const cells = STAGES.map(s => {
      const v = d.stages[s[0]];
      return v ? `<td class="on"><span class="chip" title="${esc(v)}">${esc(v)}</span></td>` : '<td class="off">–</td>';
    }).join('');
    return `<tr onclick="location.href='incident/${d.slug}.html'"><td class="title">${esc(d.title)}</td><td>${d.dateDisplay}</td><td>${esc(d.category)}</td><td>${esc(d.target)}</td>${cells}<td class="cov cov-${d.coverage}"><span class="badge">${d.coverage}</span></td></tr>`;
  }).join('');
  $('#count').textContent = `${rows.length} / ${DATA.length} incidents`;
}

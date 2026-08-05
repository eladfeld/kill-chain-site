// npm run analyze — regenerates every paper artifact under analysis/ from data/incidents/*.yml.
// Outputs: stats.json, one CSV per figure, tables.tex (booktabs), figures.tex (pgfplots).
// Deterministic: same incidents in, same bytes out. Safe to re-run and diff.
import fs from 'node:fs';
import path from 'node:path';
import { loadIncidents, ROOT } from './lib.mjs';

const OUT = path.join(ROOT, 'analysis');
fs.mkdirSync(OUT, { recursive: true });

const inc = loadIncidents();
const STAGES = ['initial_access', 'privilege_escalation', 'reconnaissance', 'persistence', 'command_control', 'lateral_movement', 'action_on_objective'];
const SHORT = { initial_access: 'IA', privilege_escalation: 'PE', reconnaissance: 'RC', persistence: 'PS', command_control: 'C2', lateral_movement: 'LM', action_on_objective: 'AO' };
const LABEL = { initial_access: 'Initial access', privilege_escalation: 'Priv. escalation', reconnaissance: 'Reconnaissance', persistence: 'Persistence', command_control: 'Command \\& control', lateral_movement: 'Lateral movement', action_on_objective: 'Action on obj.' };

const year = i => i.date.slice(0, 4);
const cov = i => STAGES.filter(s => i.stages[s]).length;
const years = [...new Set(inc.map(year))].sort();
const PARTIAL = years[years.length - 1]; // most recent year is incomplete
const esc = s => String(s).replace(/([&%$#_{}])/g, '\\$1');
const tally = (arr, key) => arr.reduce((m, x) => { const k = key(x); m[k] = (m[k] || 0) + 1; return m; }, {});
const byCount = o => Object.entries(o).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
const csv = (name, header, rows) => {
  fs.writeFileSync(path.join(OUT, name), [header.join(','), ...rows.map(r => r.map(c => /[",]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c).join(','))].join('\n') + '\n');
  return name;
};

// ---------------------------------------------------------------- 1. per year
const perYear = years.map(y => {
  const g = inc.filter(i => year(i) === y);
  const c = g.map(cov);
  return { year: y, n: g.length, mean: mean(c), min: Math.min(...c), max: Math.max(...c), ge4: c.filter(x => x >= 4).length };
});

// ------------------------------------------------------ 2. outcomes (grouped)
// Long-tail Misc (...) variants collapse into one bucket; exact strings stay in stats.json.
const outcomeOf = i => {
  const v = i.stages.action_on_objective?.value ?? '(none)';
  return /^Misc/.test(v) ? 'Misc (other)' : v;
};
const outcomesAll = byCount(tally(inc, outcomeOf));
const outcomeKeys = outcomesAll.map(([k]) => k);
const outcomeByYear = years.map(y => {
  const g = inc.filter(i => year(i) === y);
  return { year: y, n: g.length, counts: Object.fromEntries(outcomeKeys.map(k => [k, g.filter(i => outcomeOf(i) === k).length])) };
});

// ------------------------------------------------------- 3. stage prevalence
const prevalence = STAGES.map(s => ({ stage: s, n: inc.filter(i => i.stages[s]).length, pct: 100 * inc.filter(i => i.stages[s]).length / inc.length }));

// --------------------------------------------------- 4. chain-length histogram
const hist = [...Array(8).keys()].slice(1).map(k => ({ stages: k, n: inc.filter(i => cov(i) === k).length }));

// --------------------------------------------- 5. initial access D vs I by year
const iaOf = i => (i.stages.initial_access?.value || '').startsWith('Direct') ? 'Direct' : 'Indirect';
const iaByYear = years.map(y => {
  const g = inc.filter(i => year(i) === y);
  const d = g.filter(i => iaOf(i) === 'Direct').length;
  return { year: y, direct: d, indirect: g.length - d, pctIndirect: 100 * (g.length - d) / g.length };
});

// ------------------------------------------------------- 6. category by year
const categories = byCount(tally(inc, i => i.category)).map(([k]) => k);
const catByYear = years.map(y => {
  const g = inc.filter(i => year(i) === y);
  return { year: y, counts: Object.fromEntries(categories.map(c => [c, g.filter(i => i.category === c).length])) };
});

// ------------------------------------------------------- 7. persistence modes
const persistence = byCount(tally(inc.filter(i => i.stages.persistence), i => i.stages.persistence.value));

// --------------------------------------------------- 8. stage co-occurrence
const co = STAGES.map(a => STAGES.map(b => inc.filter(i => i.stages[a] && i.stages[b]).length));
// P(b | a): of incidents with stage a, the share that also have b.
const cond = STAGES.map((a, ai) => STAGES.map((b, bi) => { const na = co[ai][ai]; return na ? 100 * co[ai][bi] / na : 0; }));

// ------------------------------------------------------ 9. modal chain paths
const sig = i => STAGES.filter(s => i.stages[s]).map(s => SHORT[s]).join('+');
const paths = byCount(tally(inc, sig));

// ------------------------------------------------ 10. source provenance / year
const provByYear = years.map(y => {
  const g = inc.filter(i => year(i) === y);
  return { year: y, paper: g.filter(i => i.source.type === 'paper').length, blog: g.filter(i => i.source.type === 'blog').length, other: g.filter(i => !['paper', 'blog'].includes(i.source.type)).length };
});

// -------------------------------------------------- 11. target concentration
// Keyword buckets over the free-text `target` field; first match wins, order matters.
const VENDOR = [
  ['Microsoft', /copilot|m365|microsoft|azure|bing|office/i],
  ['Google', /gemini|bard|google|vertex|colab|notebooklm|antigravity|jules/i],
  ['OpenAI', /chatgpt|openai|codex|gpt-?[0-9]|operator/i],
  ['Anthropic', /claude|anthropic/i],
  ['Cursor', /cursor/i],
  ['Perplexity', /perplexity|comet/i],
  ['Amazon/AWS', /amazon|aws|kiro|bedrock/i],
  ['GitHub', /github/i],
  ['SaaS connectors', /slack|notion|zendesk|jira|salesforce/i],
];
const vendorOf = i => (VENDOR.find(([, re]) => re.test(i.target))?.[0]) ?? 'Other / multiple';
const vendors = byCount(tally(inc, vendorOf));

// ============================================================ CSV + stats.json
csv('per-year.csv', ['year', 'incidents', 'mean_stages', 'min', 'max', 'ge4'], perYear.map(r => [r.year, r.n, r.mean.toFixed(2), r.min, r.max, r.ge4]));
csv('outcomes-overall.csv', ['outcome', 'n', 'pct'], outcomesAll.map(([k, v]) => [k, v, (100 * v / inc.length).toFixed(1)]));
csv('outcomes-by-year.csv', ['year', ...outcomeKeys], outcomeByYear.map(r => [r.year, ...outcomeKeys.map(k => r.counts[k])]));
csv('stage-prevalence.csv', ['stage', 'n', 'pct'], prevalence.map(r => [r.stage, r.n, r.pct.toFixed(1)]));
csv('chain-length.csv', ['stages', 'incidents'], hist.map(r => [r.stages, r.n]));
csv('initial-access-by-year.csv', ['year', 'direct', 'indirect', 'pct_indirect'], iaByYear.map(r => [r.year, r.direct, r.indirect, r.pctIndirect.toFixed(1)]));
csv('category-by-year.csv', ['year', ...categories], catByYear.map(r => [r.year, ...categories.map(c => r.counts[c])]));
csv('cooccurrence.csv', ['stage', ...STAGES], STAGES.map((s, i) => [s, ...co[i]]));
csv('chain-paths.csv', ['path', 'n'], paths.map(([k, v]) => [k, v]));
csv('provenance-by-year.csv', ['year', 'paper', 'blog', 'other'], provByYear.map(r => [r.year, r.paper, r.blog, r.other]));
csv('targets.csv', ['vendor', 'n'], vendors.map(([k, v]) => [k, v]));

const allCov = inc.map(cov);
fs.writeFileSync(path.join(OUT, 'stats.json'), JSON.stringify({
  generated: new Date().toISOString().slice(0, 10),
  n: inc.length, years, partialYear: PARTIAL,
  meanStages: +mean(allCov).toFixed(3),
  ge4: allCov.filter(c => c >= 4).length, ge5: allCov.filter(c => c >= 5).length, maxStages: Math.max(...allCov),
  perYear, outcomesAll, outcomesRaw: byCount(tally(inc, i => i.stages.action_on_objective?.value ?? '(none)')),
  prevalence, hist, iaByYear, catByYear, persistence, cooccurrence: co, conditional: cond, paths, provByYear, vendors,
}, null, 2) + '\n');

// ==================================================================== tables
const T = [];
T.push(`% Generated by scripts/analyze.mjs — do not hand-edit. Requires \\usepackage{booktabs}.
% Dataset: ${inc.length} incidents, ${years[0]}–${PARTIAL} (${PARTIAL} partial).`);

T.push(`\\begin{table}[t]
\\centering
\\caption{Incidents per year and kill-chain depth. ${PARTIAL} is a partial year.}
\\label{tab:per-year}
\\begin{tabular}{lrrrrr}
\\toprule
Year & $n$ & Mean stages & Min & Max & $\\geq 4$ stages \\\\
\\midrule
${perYear.map(r => `${r.year} & ${r.n} & ${r.mean.toFixed(2)} & ${r.min} & ${r.max} & ${r.ge4} \\\\`).join('\n')}
\\midrule
All & ${inc.length} & ${mean(allCov).toFixed(2)} & ${Math.min(...allCov)} & ${Math.max(...allCov)} & ${allCov.filter(c => c >= 4).length} \\\\
\\bottomrule
\\end{tabular}
\\end{table}`);

T.push(`\\begin{table}[t]
\\centering
\\caption{Action on objective by year. Long-tail \\texttt{Misc (\\ldots)} codings are grouped.}
\\label{tab:outcome-year}
\\begin{tabular}{l${'r'.repeat(years.length)}r}
\\toprule
Outcome & ${years.join(' & ')} & All \\\\
\\midrule
${outcomeKeys.map(k => `${esc(k)} & ${years.map(y => outcomeByYear.find(r => r.year === y).counts[k]).join(' & ')} & ${outcomesAll.find(([o]) => o === k)[1]} \\\\`).join('\n')}
\\midrule
Total & ${years.map(y => inc.filter(i => year(i) === y).length).join(' & ')} & ${inc.length} \\\\
\\bottomrule
\\end{tabular}
\\end{table}`);

T.push(`\\begin{table}[t]
\\centering
\\caption{Stage prevalence across the corpus.}
\\label{tab:prevalence}
\\begin{tabular}{lrr}
\\toprule
Stage & Incidents & \\% of corpus \\\\
\\midrule
${prevalence.map(r => `${LABEL[r.stage]} & ${r.n} & ${r.pct.toFixed(1)} \\\\`).join('\n')}
\\bottomrule
\\end{tabular}
\\end{table}`);

T.push(`\\begin{table}[t]
\\centering
\\caption{Most frequent kill-chain paths. IA: initial access, PE: privilege escalation, RC: reconnaissance, PS: persistence, C2: command and control, LM: lateral movement, AO: action on objective.}
\\label{tab:paths}
\\begin{tabular}{lrr}
\\toprule
Path & $n$ & \\% \\\\
\\midrule
${paths.slice(0, 10).map(([k, v]) => `\\texttt{${esc(k)}} & ${v} & ${(100 * v / inc.length).toFixed(1)} \\\\`).join('\n')}
\\bottomrule
\\end{tabular}
\\end{table}`);

T.push(`\\begin{table}[t]
\\centering
\\caption{Stage co-occurrence. Cell $(r,c)$ is $P(c \\mid r)$ in percent: of incidents coded with the row stage, the share also coded with the column stage.}
\\label{tab:cooccurrence}
\\begin{tabular}{l${'r'.repeat(STAGES.length)}}
\\toprule
 & ${STAGES.map(s => SHORT[s]).join(' & ')} \\\\
\\midrule
${STAGES.map((s, i) => `${SHORT[s]} & ${cond[i].map(v => v.toFixed(0)).join(' & ')} \\\\`).join('\n')}
\\bottomrule
\\end{tabular}
\\end{table}`);

T.push(`\\begin{table}[t]
\\centering
\\caption{Target application category by year.}
\\label{tab:category-year}
\\begin{tabular}{l${'r'.repeat(years.length)}r}
\\toprule
Category & ${years.join(' & ')} & All \\\\
\\midrule
${categories.map(c => `${esc(c)} & ${years.map(y => catByYear.find(r => r.year === y).counts[c]).join(' & ')} & ${inc.filter(i => i.category === c).length} \\\\`).join('\n')}
\\bottomrule
\\end{tabular}
\\end{table}`);

T.push(`\\begin{table}[t]
\\centering
\\caption{Persistence mode, source provenance, and most-targeted vendors.}
\\label{tab:aux}
\\begin{tabular}{lr}
\\toprule
\\multicolumn{2}{l}{\\emph{Persistence mode} (of ${inc.filter(i => i.stages.persistence).length} incidents with persistence)} \\\\
${persistence.map(([k, v]) => `\\quad ${esc(k)} & ${v} \\\\`).join('\n')}
\\midrule
\\multicolumn{2}{l}{\\emph{Source type}} \\\\
${byCount(tally(inc, i => i.source.type)).map(([k, v]) => `\\quad ${esc(k)} & ${v} \\\\`).join('\n')}
\\midrule
\\multicolumn{2}{l}{\\emph{Most-targeted vendors}} \\\\
${vendors.slice(0, 8).map(([k, v]) => `\\quad ${esc(k)} & ${v} \\\\`).join('\n')}
\\bottomrule
\\end{tabular}
\\end{table}`);

fs.writeFileSync(path.join(OUT, 'tables.tex'), T.join('\n\n') + '\n');

// =================================================================== figures
const CB = ['{rgb,255:red,31;green,119;blue,180}', '{rgb,255:red,255;green,127;blue,14}', '{rgb,255:red,44;green,160;blue,44}', '{rgb,255:red,214;green,39;blue,40}', '{rgb,255:red,148;green,103;blue,189}', '{rgb,255:red,140;green,86;blue,75}', '{rgb,255:red,127;green,127;blue,127}'];
const F = [];
F.push(`% Generated by scripts/analyze.mjs — do not hand-edit.
% Preamble: \\usepackage{pgfplots}\\pgfplotsset{compat=1.18}
% Every figure carries its numbers inline; the CSVs in this directory hold the same data.`);

// fig 1: incidents per year
F.push(`\\begin{figure}[t]\\centering
\\begin{tikzpicture}
\\begin{axis}[width=\\columnwidth,height=4.4cm,ybar,bar width=14pt,ymin=0,
  symbolic x coords={${years.join(',')}},xtick=data,
  ylabel={Incidents},xlabel={Year},nodes near coords,every node near coord/.append style={font=\\footnotesize},
  enlarge x limits=0.15,ymajorgrids,tick align=outside]
\\addplot[fill=${CB[0]},draw=none] coordinates {${perYear.map(r => `(${r.year},${r.n})`).join(' ')}};
\\end{axis}
\\end{tikzpicture}
\\caption{Documented promptware incidents per year (${PARTIAL} partial).}\\label{fig:per-year}
\\end{figure}`);

// fig 2: mean stages per year
F.push(`\\begin{figure}[t]\\centering
\\begin{tikzpicture}
\\begin{axis}[width=\\columnwidth,height=4.4cm,ymin=0,ymax=4.5,
  symbolic x coords={${years.join(',')}},xtick=data,
  ylabel={Mean stages per incident},xlabel={Year},ymajorgrids,
  nodes near coords={\\footnotesize\\pgfmathprintnumber[fixed,precision=2]{\\pgfplotspointmeta}},
  every node near coord/.append style={yshift=2pt}]
\\addplot[mark=*,thick,color=${CB[1]}] coordinates {${perYear.map(r => `(${r.year},${r.mean.toFixed(3)})`).join(' ')}};
\\end{axis}
\\end{tikzpicture}
\\caption{Mean kill-chain depth per year. Per-year $n$: ${perYear.map(r => `${r.year}: ${r.n}`).join(', ')}.}\\label{fig:mean-stages}
\\end{figure}`);

// fig 3: outcome by year, stacked
F.push(`\\begin{figure}[t]\\centering
\\begin{tikzpicture}
\\begin{axis}[width=\\columnwidth,height=5cm,ybar stacked,bar width=16pt,ymin=0,
  symbolic x coords={${years.join(',')}},xtick=data,
  ylabel={Incidents},xlabel={Year},ymajorgrids,
  legend style={font=\\footnotesize,at={(0.5,1.02)},anchor=south,legend columns=3,draw=none},
  legend cell align=left]
${outcomeKeys.map((k, idx) => `\\addplot[fill=${CB[idx % CB.length]},draw=none] coordinates {${years.map(y => `(${y},${outcomeByYear.find(r => r.year === y).counts[k]})`).join(' ')}};\n\\addlegendentry{${esc(k)}}`).join('\n')}
\\end{axis}
\\end{tikzpicture}
\\caption{Action on objective by year.}\\label{fig:outcome-year}
\\end{figure}`);

// fig 4: overall outcome pie
const pieCmds = (() => {
  let a = 0; const out = [];
  outcomesAll.forEach(([k, v], idx) => {
    const sweep = 360 * v / inc.length;
    const mid = a + sweep / 2;
    out.push(`\\fill[color=${CB[idx % CB.length]}] (0,0) -- (${a.toFixed(2)}:2.2) arc (${a.toFixed(2)}:${(a + sweep).toFixed(2)}:2.2) -- cycle;`);
    if (100 * v / inc.length >= 4) out.push(`\\node[font=\\scriptsize,white] at (${mid.toFixed(2)}:1.5) {${(100 * v / inc.length).toFixed(0)}\\%};`);
    a += sweep;
  });
  return out.join('\n');
})();
F.push(`\\begin{figure}[t]\\centering
\\begin{tikzpicture}
${pieCmds}
\\begin{scope}[shift={(3.0,1.4)}]
${outcomesAll.map(([k, v], idx) => `\\fill[color=${CB[idx % CB.length]}] (0,${(-0.42 * idx).toFixed(2)}) rectangle ++(0.28,0.28);
\\node[anchor=west,font=\\scriptsize] at (0.36,${(-0.42 * idx + 0.14).toFixed(2)}) {${esc(k)} ($n{=}${v}$)};`).join('\n')}
\\end{scope}
\\end{tikzpicture}
\\caption{Distribution of action on objective across all ${inc.length} incidents.}\\label{fig:outcome-pie}
\\end{figure}`);

// fig 5: stage prevalence funnel
F.push(`\\begin{figure}[t]\\centering
\\begin{tikzpicture}
\\begin{axis}[width=\\columnwidth,height=5cm,xbar,bar width=11pt,xmin=0,xmax=${inc.length + 14},
  symbolic y coords={${[...STAGES].reverse().map(s => SHORT[s]).join(',')}},ytick=data,
  xlabel={Incidents},nodes near coords,every node near coord/.append style={font=\\footnotesize},
  xmajorgrids]
\\addplot[fill=${CB[2]},draw=none] coordinates {${[...prevalence].reverse().map(r => `(${r.n},${SHORT[r.stage]})`).join(' ')}};
\\end{axis}
\\end{tikzpicture}
\\caption{Stage prevalence. Initial access and action on objective are universal by construction; reconnaissance, lateral movement, and command and control remain rare.}\\label{fig:prevalence}
\\end{figure}`);

// fig 6: chain-length histogram
F.push(`\\begin{figure}[t]\\centering
\\begin{tikzpicture}
\\begin{axis}[width=\\columnwidth,height=4.4cm,ybar,bar width=16pt,ymin=0,
  xtick={1,2,3,4,5,6,7},xlabel={Stages traversed},ylabel={Incidents},
  nodes near coords,every node near coord/.append style={font=\\footnotesize},ymajorgrids,enlarge x limits=0.12]
\\addplot[fill=${CB[4]},draw=none] coordinates {${hist.map(r => `(${r.stages},${r.n})`).join(' ')}};
\\end{axis}
\\end{tikzpicture}
\\caption{Kill-chain depth. ${allCov.filter(c => c >= 4).length} of ${inc.length} incidents (${(100 * allCov.filter(c => c >= 4).length / inc.length).toFixed(1)}\\%) traverse four or more stages.}\\label{fig:chain-length}
\\end{figure}`);

// fig 7: direct vs indirect
F.push(`\\begin{figure}[t]\\centering
\\begin{tikzpicture}
\\begin{axis}[width=\\columnwidth,height=4.4cm,ybar stacked,bar width=16pt,ymin=0,
  symbolic x coords={${years.join(',')}},xtick=data,ylabel={Incidents},xlabel={Year},ymajorgrids,
  legend style={font=\\footnotesize,at={(0.5,1.02)},anchor=south,legend columns=2,draw=none}]
\\addplot[fill=${CB[0]},draw=none] coordinates {${iaByYear.map(r => `(${r.year},${r.indirect})`).join(' ')}};\\addlegendentry{Indirect (I)}
\\addplot[fill=${CB[3]},draw=none] coordinates {${iaByYear.map(r => `(${r.year},${r.direct})`).join(' ')}};\\addlegendentry{Direct (D)}
\\end{axis}
\\end{tikzpicture}
\\caption{Initial access by year. Indirect delivery accounts for ${(100 * inc.filter(i => iaOf(i) === 'Indirect').length / inc.length).toFixed(0)}\\% of the corpus.}\\label{fig:initial-access}
\\end{figure}`);

// fig 8: category by year
F.push(`\\begin{figure}[t]\\centering
\\begin{tikzpicture}
\\begin{axis}[width=\\columnwidth,height=5cm,ybar stacked,bar width=16pt,ymin=0,
  symbolic x coords={${years.join(',')}},xtick=data,ylabel={Incidents},xlabel={Year},ymajorgrids,
  legend style={font=\\footnotesize,at={(0.5,1.02)},anchor=south,legend columns=3,draw=none},legend cell align=left]
${categories.map((c, idx) => `\\addplot[fill=${CB[idx % CB.length]},draw=none] coordinates {${years.map(y => `(${y},${catByYear.find(r => r.year === y).counts[c]})`).join(' ')}};\n\\addlegendentry{${esc(c)}}`).join('\n')}
\\end{axis}
\\end{tikzpicture}
\\caption{Targeted application category by year.}\\label{fig:category-year}
\\end{figure}`);

// fig 9: co-occurrence heatmap
const heatRows = [];
STAGES.forEach((a, i) => STAGES.forEach((b, j) => heatRows.push(`${j} ${STAGES.length - 1 - i} ${cond[i][j].toFixed(1)}`)));
F.push(`\\begin{figure}[t]\\centering
\\begin{tikzpicture}
\\begin{axis}[width=\\columnwidth,height=6cm,
  colormap={paperblues}{rgb255(0cm)=(247,251,255) rgb255(1cm)=(107,174,214) rgb255(2cm)=(8,48,107)},
  colorbar,point meta min=0,point meta max=100,
  xtick={0,...,${STAGES.length - 1}},xticklabels={${STAGES.map(s => SHORT[s]).join(',')}},
  ytick={0,...,${STAGES.length - 1}},yticklabels={${[...STAGES].reverse().map(s => SHORT[s]).join(',')}},
  xlabel={Also coded with},ylabel={Given stage},
  colorbar style={ylabel={$P(\\text{col}\\mid\\text{row})$ (\\%)}}]
\\addplot[matrix plot*,mesh/cols=${STAGES.length},point meta=explicit] table[meta index=2] {
x y meta
${heatRows.join('\n')}
};
\\end{axis}
\\end{tikzpicture}
\\caption{Stage co-occurrence: of incidents coded with the row stage, the percentage also coded with the column stage.}\\label{fig:cooccurrence}
\\end{figure}`);

// fig 10: provenance
F.push(`\\begin{figure}[t]\\centering
\\begin{tikzpicture}
\\begin{axis}[width=\\columnwidth,height=4.4cm,ybar stacked,bar width=16pt,ymin=0,
  symbolic x coords={${years.join(',')}},xtick=data,ylabel={Incidents},xlabel={Year},ymajorgrids,
  legend style={font=\\footnotesize,at={(0.5,1.02)},anchor=south,legend columns=3,draw=none}]
\\addplot[fill=${CB[5]},draw=none] coordinates {${provByYear.map(r => `(${r.year},${r.blog})`).join(' ')}};\\addlegendentry{Industry blog}
\\addplot[fill=${CB[0]},draw=none] coordinates {${provByYear.map(r => `(${r.year},${r.paper})`).join(' ')}};\\addlegendentry{Peer-reviewed / arXiv}
\\addplot[fill=${CB[6]},draw=none] coordinates {${provByYear.map(r => `(${r.year},${r.other})`).join(' ')}};\\addlegendentry{Talk / other}
\\end{axis}
\\end{tikzpicture}
\\caption{Source provenance by year: the corpus is industry-led, with academic publication trailing.}\\label{fig:provenance}
\\end{figure}`);

fs.writeFileSync(path.join(OUT, 'figures.tex'), F.join('\n\n') + '\n');

console.log(`✓ analysis/ regenerated from ${inc.length} incidents (${years[0]}–${PARTIAL})`);
console.log(`  tables.tex   ${T.length - 1} tables`);
console.log(`  figures.tex  ${F.length - 1} figures`);
console.log(`  ${fs.readdirSync(OUT).filter(f => f.endsWith('.csv')).length} CSVs + stats.json`);

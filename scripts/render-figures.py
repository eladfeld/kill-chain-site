#!/usr/bin/env python3
"""Render viewable figures from analysis/stats.json.

The paper uses analysis/figures.tex (pgfplots). This script exists so the same
numbers can be eyeballed without a TeX install, and gives drop-in PDFs if you
ever want them instead of pgfplots. Run: python3 scripts/render-figures.py
"""
import csv
import json
import math
import pathlib

import matplotlib
matplotlib.use("Agg")
import matplotlib.image as mpimg
import matplotlib.pyplot as plt
from matplotlib.colors import LinearSegmentedColormap
from matplotlib.patches import Patch

ROOT = pathlib.Path(__file__).resolve().parent.parent
S = json.loads((ROOT / "analysis" / "stats.json").read_text())
OUT = ROOT / "analysis" / "figures"
OUT.mkdir(parents=True, exist_ok=True)

# Categorical order is fixed and never cycled; validated with the dataviz palette
# checker (lightness band, chroma floor, CVD separation, normal-vision floor all
# PASS). The contrast WARN on three hues is relieved by direct value labels.
CAT = ["#0072B2", "#E69F00", "#009E73", "#D55E00", "#7570B3", "#56B4E9", "#CC79A7"]
SEQ = ["#f7fbff", "#c6dbef", "#6baed6", "#2171b5", "#08306b"]  # single-hue ramp
INK, MUTED, GRID = "#1a1a1a", "#5c5c5c", "#d8d8d8"

plt.rcParams.update({
    "figure.dpi": 160, "savefig.dpi": 160, "font.size": 9,
    "axes.edgecolor": GRID, "axes.labelcolor": INK, "text.color": INK,
    "xtick.color": MUTED, "ytick.color": MUTED, "axes.titlesize": 10,
    "axes.spines.top": False, "axes.spines.right": False,
    "figure.facecolor": "white", "axes.facecolor": "white",
})

years = S["years"]
FIGS = []


def save(fig, name):
    for ext in ("png", "pdf"):
        fig.savefig(OUT / f"{name}.{ext}", bbox_inches="tight")
    plt.close(fig)
    FIGS.append(name)


def finish(fig, ax, name, title, ylabel=None, xlabel=None, legend=None):
    ax.set_title(title, loc="left", pad=10, fontweight="semibold")
    if ylabel:
        ax.set_ylabel(ylabel)
    if xlabel:
        ax.set_xlabel(xlabel)
    ax.grid(axis="y", color=GRID, linewidth=0.6, alpha=0.9)
    ax.set_axisbelow(True)
    if legend:
        ax.legend(handles=legend, frameon=False, fontsize=7.5, ncol=3,
                  loc="upper center", bbox_to_anchor=(0.5, -0.20))
    fig.tight_layout()
    save(fig, name)


def bar_labels(ax, bars):
    for b in bars:
        h = b.get_height()
        ax.annotate(f"{h:.0f}", (b.get_x() + b.get_width() / 2, h),
                    textcoords="offset points", xytext=(0, 3),
                    ha="center", fontsize=7.5, color=MUTED)


def stacked(name, title, keys, series, ylabel="Incidents"):
    """series: {key: [per-year counts]}; white edge gives the surface gap."""
    fig, ax = plt.subplots(figsize=(5.4, 3.1))
    bottom = [0] * len(years)
    handles = []
    for i, k in enumerate(keys):
        vals = series[k]
        ax.bar(years, vals, bottom=bottom, width=0.62, color=CAT[i % len(CAT)],
               edgecolor="white", linewidth=1.4)
        handles.append(Patch(facecolor=CAT[i % len(CAT)], label=k))
        bottom = [b + v for b, v in zip(bottom, vals)]
    for x, tot in zip(years, bottom):
        ax.annotate(f"{tot:.0f}", (x, tot), textcoords="offset points",
                    xytext=(0, 3), ha="center", fontsize=7.5, color=MUTED)
    finish(fig, ax, name, title, ylabel, "Year", handles)


# 1 — incidents per year
fig, ax = plt.subplots(figsize=(5.4, 2.7))
bar_labels(ax, ax.bar(years, [r["n"] for r in S["perYear"]], width=0.6, color=CAT[0]))
finish(fig, ax, "01-incidents-per-year",
       f"Promptware incidents per year (n={S['n']}; {S['partialYear']} partial)",
       "Incidents", "Year")

# 2 — mean chain depth
fig, ax = plt.subplots(figsize=(5.4, 2.7))
means = [r["mean"] for r in S["perYear"]]
ax.plot(years, means, marker="o", markersize=6, linewidth=2, color=CAT[1])
for x, y, r in zip(years, means, S["perYear"]):
    ax.annotate(f"{y:.2f}\n(n={r['n']})", (x, y), textcoords="offset points",
                xytext=(0, 9), ha="center", fontsize=7.5, color=MUTED)
ax.set_ylim(0, 4.8)
finish(fig, ax, "02-mean-stages-per-year",
       "Mean kill-chain depth per year", "Mean stages per incident", "Year")

# 3 — outcome by year (per-year counts come from the CSV analyze.mjs wrote)
okeys = [k for k, _ in S["outcomesAll"]]
raw = {y: {k: 0 for k in okeys} for y in years}
with open(ROOT / "analysis" / "outcomes-by-year.csv") as fh:
    for row in csv.DictReader(fh):
        for k in okeys:
            raw[row["year"]][k] = int(row[k])
stacked("03-outcome-by-year", "Action on objective by year", okeys,
        {k: [raw[y][k] for y in years] for k in okeys})

# 4 — overall outcome donut
fig, ax = plt.subplots(figsize=(5.6, 3.4))
vals = [v for _, v in S["outcomesAll"]]
wedges, _ = ax.pie(vals, startangle=90, counterclock=False,
                   colors=[CAT[i % len(CAT)] for i in range(len(vals))],
                   wedgeprops={"width": 0.42, "edgecolor": "white", "linewidth": 2})
for w, v in zip(wedges, vals):
    pct = 100 * v / S["n"]
    if pct >= 5:
        ang = math.radians((w.theta1 + w.theta2) / 2)
        ax.annotate(f"{pct:.0f}%", (0.79 * math.cos(ang), 0.79 * math.sin(ang)),
                    ha="center", va="center", fontsize=8, color="white", fontweight="bold")
ax.text(0, 0, f"{S['n']}\nincidents", ha="center", va="center", fontsize=10, color=INK)
ax.legend(handles=[Patch(facecolor=CAT[i % len(CAT)], label=f"{k}  ({v})")
                   for i, (k, v) in enumerate(S["outcomesAll"])],
          frameon=False, fontsize=7.5, loc="center left", bbox_to_anchor=(0.98, 0.5))
ax.set_title("Distribution of action on objective", loc="left", fontweight="semibold")
ax.set_aspect("equal")
fig.tight_layout()
save(fig, "04-outcome-overall")

# 5 — stage prevalence
LBL = {"initial_access": "Initial access", "privilege_escalation": "Priv. escalation",
       "reconnaissance": "Reconnaissance", "persistence": "Persistence",
       "command_control": "Command & control", "lateral_movement": "Lateral movement",
       "action_on_objective": "Action on objective"}
fig, ax = plt.subplots(figsize=(5.4, 3.0))
rows = list(reversed(S["prevalence"]))
bars = ax.barh([LBL[r["stage"]] for r in rows], [r["n"] for r in rows],
               height=0.62, color=CAT[2])
for rect, r in zip(bars, rows):
    ax.annotate(f"{r['n']}  ({r['pct']:.0f}%)",
                (rect.get_width(), rect.get_y() + rect.get_height() / 2),
                textcoords="offset points", xytext=(4, 0), va="center",
                fontsize=7.5, color=MUTED)
ax.set_xlim(0, S["n"] * 1.24)
ax.grid(axis="x", color=GRID, linewidth=0.6)
ax.set_axisbelow(True)
ax.set_title("Stage prevalence across the corpus", loc="left", pad=10, fontweight="semibold")
ax.set_xlabel("Incidents")
fig.tight_layout()
save(fig, "05-stage-prevalence")

# 6 — chain-length histogram
fig, ax = plt.subplots(figsize=(5.4, 2.7))
h = [r for r in S["hist"] if r["stages"] <= 7]
bar_labels(ax, ax.bar([r["stages"] for r in h], [r["n"] for r in h], width=0.6, color=CAT[4]))
finish(fig, ax, "06-chain-length",
       f"Kill-chain depth — {S['ge4']}/{S['n']} ({100 * S['ge4'] / S['n']:.0f}%) reach ≥4 stages",
       "Incidents", "Stages traversed")

# 7 — direct vs indirect
stacked("07-initial-access", "Initial access by year", ["Indirect (I)", "Direct (D)"],
        {"Indirect (I)": [r["indirect"] for r in S["iaByYear"]],
         "Direct (D)": [r["direct"] for r in S["iaByYear"]]})

# 8 — category by year
cats = list(S["catByYear"][0]["counts"].keys())
stacked("08-category-by-year", "Targeted application category by year", cats,
        {c: [next(r for r in S["catByYear"] if r["year"] == y)["counts"][c] for y in years]
         for c in cats})

# 9 — co-occurrence heatmap (single-hue sequential)
cmap = LinearSegmentedColormap.from_list("seq", SEQ)
SHORT = ["IA", "PE", "RC", "PS", "C2", "LM", "AO"]
fig, ax = plt.subplots(figsize=(5.0, 4.2))
M = S["conditional"]
im = ax.imshow(M, cmap=cmap, vmin=0, vmax=100)
ax.set_xticks(range(7), SHORT)
ax.set_yticks(range(7), SHORT)
for i in range(7):
    for j in range(7):
        ax.text(j, i, f"{M[i][j]:.0f}", ha="center", va="center", fontsize=7.5,
                color="white" if M[i][j] > 55 else INK)
ax.set_xlabel("Also coded with")
ax.set_ylabel("Given stage")
ax.set_title("Stage co-occurrence,  P(col | row) %", loc="left", pad=10, fontweight="semibold")
fig.colorbar(im, ax=ax, shrink=0.8, label="%")
ax.grid(False)
fig.tight_layout()
save(fig, "09-cooccurrence")

# 10 — source provenance
stacked("10-provenance", "Source provenance by year",
        ["Industry blog", "Peer-reviewed / arXiv", "Talk / other"],
        {"Industry blog": [r["blog"] for r in S["provByYear"]],
         "Peer-reviewed / arXiv": [r["paper"] for r in S["provByYear"]],
         "Talk / other": [r["other"] for r in S["provByYear"]]})

# contact sheet — every figure on one page for a quick look
cols = 2
rows_n = (len(FIGS) + cols - 1) // cols
fig, axes = plt.subplots(rows_n, cols, figsize=(11, 3.1 * rows_n))
flat = axes.ravel()
for axx, name in zip(flat, FIGS):
    axx.imshow(mpimg.imread(OUT / f"{name}.png"))
    axx.axis("off")
for axx in flat[len(FIGS):]:
    axx.axis("off")
fig.tight_layout()
fig.savefig(OUT / "00-contact-sheet.png", dpi=140, bbox_inches="tight")
plt.close(fig)

print(f"✓ rendered {len(FIGS)} figures (png + pdf) → analysis/figures/")
print("  " + ", ".join(FIGS))
print("  plus 00-contact-sheet.png")

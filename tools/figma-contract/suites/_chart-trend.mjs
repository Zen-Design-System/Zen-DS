// The cartesian plot the sector charts share (code: chartCore PlotFrame). Figma draws it as one grid frame — Line-Chart's
// .Chart/Line-Chart/Trend, Stack-Bar's Chart/Stack-Chart/Comparison-Stack/Specifics/*, Bar-Chart's Chart › Plot — with six
// gridlines Line-1 (the baseline) … Line-6, six Y labels (top first), and one .Primitives/Chart/Sector per X value: its
// rule (Line), its X label (Container › Wrapper › Label) and, on the selected sector, the Tooltip.
import { sectorCount } from "./_chart-shared.mjs";

const MAX_SECTORS = 12;
const sector = (k) => `.zen-chart__sector:nth-child(${k})`;
const selected = (k) => (vp, props) => props.chartProps.initialIndex === k - 1;

/**
 * Map entries of a Trend-style plot at `T` (a ` > ` path). `labels` are the Y-label layers (`Label#0` … top first) and
 * `lines` the gridlines; `count(vp)` the number of sectors (default the variant's Sector).
 */
export function trendMap(T, { count = sectorCount, lines = 6, labels = `${T} > Label`, sectorsAt = `${T} > Sectors` } = {}) {
  const entries = [{ figma: T, dom: ".zen-chart", check: ["size", "x", "y"] }];
  // Gridlines bottom-up: Line-1 is the baseline (tick 0, the grid's first span). Figma centres the 1px stroke on the line,
  // code's border-top sits just above it, so the lines compare by their centre, half a pixel apart (tolerance 1).
  for (let k = 1; k <= lines; k += 1) entries.push({ figma: `${T} > Line-${k}`, dom: `.zen-chart__grid > span:nth-child(${k})`, check: ["w", "x", "cy", "stroke", "dash"], tolerance: 1 });
  // Y labels top first in Figma, ticks bottom-up in code; each centred on its gridline.
  for (let i = 0; i < lines; i += 1) entries.push({ figma: `${labels}#${i}`, dom: `.zen-chart__y > span:nth-child(${lines - i})`, check: ["text", "cy", "x"] });
  for (let k = 1; k <= MAX_SECTORS; k += 1) {
    const S = `${sectorsAt} > Sector-${k}`;
    const has = (vp) => count(vp) >= k;
    entries.push(
      { figma: S, dom: sector(k), check: ["size", "x", "y"], when: has },
      // The rule: hidden paint on idle sectors (none in code), Active/Accent/Solid or Active/Neutral/Subtle when selected.
      { figma: `${S} > Line`, dom: sector(k), check: ["stroke"], strokeVia: "before", strokeSide: "left", when: has },
      { figma: `${S} > Container > Wrapper`, dom: `${sector(k)} .zen-chart__x`, check: ["fill", "radius"], when: has },
      { figma: `${S} > Container > Wrapper > Label`, dom: `${sector(k)} .zen-chart__x`, check: ["text", "cx", "cy"], when: has },
      // The Tooltip centred on its sector (its width follows its text; its height, paint and corners are the Tooltip's).
      { figma: `${S} > Tooltip`, dom: `${sector(k)} .zen-chart__tooltip`, check: ["cx"], when: (vp, props) => has(vp) && selected(k)(vp, props) },
      { figma: `${S} > Tooltip > Container`, dom: `${sector(k)} .zen-tooltip`, check: ["h", "fill", "radius"], when: (vp, props) => has(vp) && selected(k)(vp, props) },
      { figma: `${S} > Tooltip > Container > Slot > Text > Contents > Info`, dom: `${sector(k)} .zen-tooltip__label`, check: ["text"], when: (vp, props) => has(vp) && selected(k)(vp, props) },
    );
  }
  return entries;
}

/**
 * The open designer question of the X labels (QUESTIONS.md "Charts (P2)" (a); chart-parity-audit-2026-10-17 §2.1): code
 * keeps the chart family spec (§2: a 20px pill that hugs its text, Spacing/Gap/2XSmall above the plot's foot, the active
 * one Label/Small/Medium) until it is answered; Figma's Wrapper fills the sector, 16px tall at the foot, and the selected
 * label is Label/Small/Bold. `cy` is the centre code renders (plot top + height − 4 − 10), pinned so a drift still fails.
 */
export function xLabelExceptions(T, { cy, vp = {}, sectorsAt = `${T} > Sectors` }) {
  return Array.from({ length: MAX_SECTORS }, (_, i) => `${sectorsAt} > Sector-${i + 1} > Container > Wrapper > Label`).flatMap((layer) => [
    { vp, layer, prop: "cy", code: String(cy), note: "X label pill: 20px, Spacing/Gap/2XSmall above the plot's foot in code (spec family §2); Figma's sector-wide 16px Wrapper sits at the foot (QUESTIONS.md Charts (P2) (a))." },
    { vp, layer, prop: "text", code: "Inter 500 9px/12px ls=normal none", note: "Selected X label: Label/Small/Medium in code (spec family §2), Label/Small/Bold in Figma (QUESTIONS.md Charts (P2) (a))." },
  ]);
}

/**
 * Chart and metric marks on a Solid card (Figma Card Theme=Solid, 2026-10-14): no series may vanish into the fill. Every
 * chart kind sits in a ChartCard and every typed MetricCard with marks on Solid Neutral and each Solid hue, in light and
 * dark; each mark (a bar, slice, ring, line, dot, cell, swatch) must stand off the card's fill: a colour difference ΔE
 * (CIE76) of at least 8, a clearly visible step: categorical hues are told apart by hue, not luminance. An area counts
 * by its fade's top stop at the area's opacity (the bottom stop fades into the fill by design) and needs a visible tint,
 * ΔE 5 (Figma's .16 accent sparkline area measures about 11 on a white card); tracks, grid lines, the
 * empty heat level and the donut's reveal mask are left out. The lowest ΔE per colour is printed for the spec.
 */
import { createElement, type ComponentType } from "react";
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import * as Zen from "../../src/index";
import { cardSolidColors, ChartCard, MetricCard, ZenProvider } from "../../src/index";

const charts: [string, Record<string, unknown>][] = [
  ["LineChart", { data: [{ label: "Jul", value: 94 }, { label: "Aug", value: 97 }, { label: "Sep", value: 106 }], compare: { label: "2025", values: [80, 85, 90] } }],
  ["StackBarChart", { series: [{ id: "web", label: "Web" }, { id: "app", label: "App" }], data: [{ label: "Q1", values: { web: 10, app: 6 } }, { label: "Q2", values: { web: 14, app: 9 } }] }],
  ["BarChart", { data: [{ label: "Jul", value: 12 }, { label: "Aug", value: 18 }, { label: "Sep", value: 15, projected: true }] }],
  ["DonutChart", { data: [{ id: "a", label: "Lumen Bank", value: 30 }, { id: "b", label: "Phin & Co", value: 23 }, { id: "c", label: "Mekong", value: 18 }, { id: "d", label: "Saola", value: 14 }, { id: "e", label: "Other", value: 12 }] }],
  ["RadialChart", { data: [{ id: "a", label: "Loyalty app", value: 61 }, { id: "b", label: "Tracking", value: 23 }, { id: "c", label: "Website", value: 80 }] }],
  ["HeatmapChart", { rows: ["9 am", "10 am"], columns: ["Mon", "Tue", "Wed"], values: [[3, 8, 5], [9, 12, 1]] }],
  ["BarList", { headers: { label: "Client", value: "Revenue" }, data: [{ label: "Lumen Bank", value: 96400 }, { label: "Phin & Co", value: 71200 }] }],
  ["BulletChart", { data: [{ label: "Revenue", value: 798, target: 900 }, { label: "New clients", value: 18, target: 24 }] }],
  ["GaugeChart", { value: 82, target: 85, label: "Billable" }],
  ["FunnelChart", { data: [{ label: "Leads", value: 480 }, { label: "Qualified", value: 312 }, { label: "Signed", value: 62 }] }],
  ["AreaChart", { type: "stacked", series: [{ id: "design", label: "Design" }, { id: "eng", label: "Engineering" }, { id: "ops", label: "Delivery" }], data: [{ label: "Jul", values: { design: 29, eng: 21, ops: 8 } }, { label: "Aug", values: { design: 25, eng: 19, ops: 7 } }] }],
  ["GroupedBarChart", { series: [{ id: "a", label: "2025" }, { id: "b", label: "2026" }, { id: "c", label: "Plan" }], data: [{ label: "Q1", values: { a: 20, b: 24, c: 22 } }, { label: "Q2", values: { a: 23, b: 26, c: 25 } }] }],
  ["ComboChart", { barLabel: "Revenue", lineLabel: "Margin", data: [{ label: "Jul", bar: 94, line: 36 }, { label: "Aug", bar: 97, line: 38 }] }],
];
const series = [74, 79, 85, 82, 91, 88, 94, 97, 105];
const metrics: [string, Record<string, unknown>][] = [
  ["sparkline", { series }],
  ["spark-bars", { series }],
  ["goal-progress", { goal: { value: 108400, target: 135000 } }],
  ["category-bar", { categories: [{ id: "d", label: "Design", value: 2650 }, { id: "e", label: "Engineering", value: 1990 }, { id: "o", label: "Delivery", value: 750 }, { id: "c", label: "Client services", value: 510 }] }],
  ["hero", { series }],
];

type RGBA = [number, number, number, number];
const parse = (value: string): RGBA | null => {
  const m = value.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const [r, g, b, a = "1"] = m[1].split(/[\s,/]+/).filter(Boolean);
  return [Number(r) / 255, Number(g) / 255, Number(b) / 255, Number(a)];
};
const over = (fg: RGBA, bg: RGBA): RGBA => [0, 1, 2].map((i) => fg[i] * fg[3] + bg[i] * (1 - fg[3])).concat(1) as RGBA;
const lum = (c: RGBA) => 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
const f = (x: number) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
/** sRGB → CIE Lab (D65), then the CIE76 distance. */
const lab = (c: RGBA) => {
  const [r, g, b] = [f(c[0]), f(c[1]), f(c[2])];
  const xyz = [(0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047, 0.2126 * r + 0.7152 * g + 0.0722 * b, (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883];
  const [x, y, z] = xyz.map((v) => (v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116));
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
};
const deltaE = (a: RGBA, b: RGBA) => { const [p, q] = [lab(a), lab(b)]; return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); };

/** Mark colours inside `root`: SVG shapes' fill and stroke, and the fills of HTML marks (bars, cells, swatches, dots). */
function marks(root: Element) {
  const out: { name: string; colour: RGBA }[] = [];
  const faint = /__area(-band|-rule)?(\s|$)|spark__area|track|grid|rule|fade|hit|axis|average|tip|tooltip|pill|focus|sweep|ring-bg|bg\b/;
  for (const el of root.querySelectorAll<HTMLElement | SVGElement>("*")) {
    const cls = typeof el.className === "string" ? el.className : (el.getAttribute("class") ?? "");
    if (faint.test(cls) || el.closest("[aria-hidden='true'] .zen-icon, .zen-icon")) continue;
    const style = getComputedStyle(el);
    if (style.visibility === "hidden" || style.display === "none" || Number(style.opacity) === 0 || el.getAttribute("data-level") === "0") continue;
    if (el instanceof SVGElement && /^(path|rect|circle|line|polyline|polygon|ellipse)$/.test(el.tagName)) {
      for (const [kind, paint, opacity] of [["fill", style.fill, style.fillOpacity], ["stroke", style.stroke, style.strokeOpacity]] as const) {
        const c = parse(paint);
        if (kind === "fill" && /^(line|polyline)$/.test(el.tagName)) continue;
        if (c && c[3] > 0 && Number(opacity) > 0.5 && !(kind === "stroke" && style.strokeWidth === "0px")) out.push({ name: `${el.tagName}.${cls} ${kind}`, colour: c });
      }
    } else if (/(bar|segment|slice|cell|swatch|dot|stage|actual|target|value)\b|__(bar|segment|swatch|dot|cell|fill)\b/.test(cls)) {
      const c = parse(style.backgroundColor);
      if (c && c[3] > 0.3) out.push({ name: `${el.tagName.toLowerCase()}.${cls}`, colour: c });
    }
  }
  // Areas (chartCore ChartFade, metric sparkline): the gradient's top stop at the area's fill-opacity — the strongest the
  // fade gets; it must still read on the fill (the bottom stop fades into it by design).
  for (const el of root.querySelectorAll<SVGElement>("path.zen-chart__area, path.zen-chart__area-band, path.zen-metric-spark__area")) {
    const id = /url\("?#([^")]+)"?\)/.exec(getComputedStyle(el).fill)?.[1] ?? /#([^)]+)\)/.exec(el.getAttribute("fill") ?? "")?.[1];
    const stop = id ? document.getElementById(id)?.querySelector("stop") : null;
    if (!stop) continue;
    const c = parse(getComputedStyle(stop).stopColor);
    if (!c) continue;
    const alpha = c[3] * Number(getComputedStyle(stop).stopOpacity || 1) * Number(getComputedStyle(el).fillOpacity || 1);
    out.push({ name: `area ${el.getAttribute("class")} (top stop at ${alpha.toFixed(2)})`, colour: [c[0], c[1], c[2], alpha] });
  }
  return out;
}

describe("marks on a Solid card", () => {
  for (const theme of ["light", "dark"] as const) {
    it(`every chart and metric mark stands off every Solid fill (${theme})`, async () => {
      const screen = await render(
        <ZenProvider theme={theme}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 360px)", gap: 16, padding: 16 }}>
            {cardSolidColors.flatMap((color) => [
              ...charts.map(([name, props]) => (
                <ChartCard key={`${color}-${name}`} title={name} theme="solid" color={color}>
                  {createElement((Zen as Record<string, unknown>)[name] as ComponentType<Record<string, unknown>>, { "aria-label": name, animate: false, ...props })}
                </ChartCard>
              )),
              ...metrics.map(([type, props]) => <MetricCard key={`${color}-${type}`} type={type as never} theme="solid" color={color} label={type} value="$105,700" animate={false} {...props} />),
            ])}
          </div>
        </ZenProvider>,
      );
      await new Promise((resolve) => setTimeout(resolve, 200));
      const failures: string[] = [];
      const lowest: Record<string, number> = {};
      for (const card of screen.container.querySelectorAll<HTMLElement>(".zen-card")) {
        const fill = parse(getComputedStyle(card).backgroundColor)!;
        // The legend's series tell apart from one another too (the colours a hue Solid re-points stay distinct).
        const swatches = [...card.querySelectorAll<HTMLElement>(".zen-chart__swatch")].map((el) => over(parse(getComputedStyle(el).backgroundColor)!, fill));
        swatches.forEach((a, i) => swatches.slice(i + 1).forEach((b, j) => {
          if (deltaE(a, b) < 8) failures.push(`${card.getAttribute("data-color")} ${card.querySelector(".zen-chart-card__title")?.textContent}: legend series ${i + 1} and ${i + j + 2} ΔE ${deltaE(a, b).toFixed(1)}`);
        }));
        const label = `${card.getAttribute("data-color")} ${card.querySelector(".zen-chart-card__title, .zen-metric__label, .zen-metric-card__title")?.textContent ?? "?"}`;
        for (const mark of marks(card.querySelector(".zen-card__content")!)) {
          const d = deltaE(over(mark.colour, fill), fill);
          const key = `${card.getAttribute("data-color")}`;
          lowest[key] = Math.min(lowest[key] ?? 999, d);
          // An area's fade is faint by design (Figma .16 / .30: about ΔE 11 on a white card): a visible tint is ΔE 5.
          if (d < (mark.name.startsWith("area") ? 5 : 8)) failures.push(`${label}: ${mark.name} ΔE ${d.toFixed(1)}`);
        }
      }
      console.log(theme, "lowest ΔE", Object.entries(lowest).map(([k, v]) => `${k} ${v.toFixed(1)}`).join(" · "));
      expect([...new Set(failures)]).toEqual([]);
    });
  }
});

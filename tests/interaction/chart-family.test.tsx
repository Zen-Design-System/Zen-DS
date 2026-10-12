/**
 * The chart family (docs/research/chart-family-spec-2026-10-12.md §3–4): every plot is a focusable chart group whose live
 * summary follows the keys, bars keep the shared radius and draw-in, and the horizontal bars, donut, rings and heatmap
 * lay out inside their box. Real browser (Chromium, reduced motion), so layout is real.
 */
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { BarChart, DonutChart, HeatmapChart, LineChart, RadialChart, StackBarChart, ZenProvider } from "../../src/index";

const wrap = (node: ReactNode, width = 480) => <ZenProvider><div style={{ width }}>{node}</div></ZenProvider>;
const summaryOf = (plot: Element) => document.getElementById(plot.getAttribute("aria-describedby") ?? "")?.textContent ?? "";

async function focusChart(name: string) {
  const plot = document.querySelector(`[aria-roledescription="chart"][aria-label="${name}"]`) as HTMLElement;
  plot.focus();
  return plot;
}

/** The keys go straight to the plot (its React onKeyDown), so the real pointer and focus of other test files never interfere. */
async function press(plot: HTMLElement, ...keys: string[]) {
  for (const key of keys) {
    plot.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

describe("chart family keyboard", () => {
  it("BarChart: ←/→ and Home/End move the active bar; a projected bar says so", async () => {
    await render(wrap(<BarChart aria-label="Revenue" data={[{ label: "Jan", value: 10 }, { label: "Feb", value: 20 }, { label: "Mar", value: 15, projected: true }]} />));
    const plot = await focusChart("Revenue");
    expect(summaryOf(plot)).toBe("Feb: 20 (2 of 3)"); // the last closed bar
    await press(plot, "ArrowRight");
    expect(summaryOf(plot)).toBe("Mar: 15 · projected (3 of 3)");
    await press(plot, "Home");
    expect(summaryOf(plot)).toBe("Jan: 10 (1 of 3)");
  });

  it("BarChart horizontal: ↑/↓ move between bars and a target reads value of target", async () => {
    await render(wrap(<BarChart orientation="horizontal" aria-label="Hours" data={[{ label: "Design", value: 20, target: 28 }, { label: "Delivery", value: 7, target: 9 }]} />));
    const plot = await focusChart("Hours");
    await press(plot, "ArrowUp");
    expect(summaryOf(plot)).toBe("Design: 20 of 28 (1 of 2)");
    await press(plot, "ArrowDown");
    expect(summaryOf(plot)).toBe("Delivery: 7 of 9 (2 of 2)");
  });

  it("LineChart with series: the summary reads every series", async () => {
    await render(wrap(<LineChart aria-label="Cash" series={[{ id: "in", label: "Invoiced" }, { id: "out", label: "Collected", dashed: true }]} data={[{ label: "Aug", values: { in: 9, out: 8 } }, { label: "Sep", values: { in: 10, out: 7 } }]} />));
    const plot = await focusChart("Cash");
    expect(summaryOf(plot)).toBe("Sep: Invoiced 10, Collected 7 (2 of 2)");
    expect(document.querySelectorAll(".zen-chart__legend li")).toHaveLength(2);
  });

  it("DonutChart: the overview first, then ←/→ pick a slice and the centre follows", async () => {
    await render(wrap(<DonutChart aria-label="Clients" data={[{ id: "a", label: "Lumen", value: 75 }, { id: "b", label: "Phin", value: 25 }]} />));
    const plot = await focusChart("Clients");
    expect(summaryOf(plot)).toBe("Total 100; Lumen 75%, Phin 25%");
    await press(plot, "ArrowRight");
    expect(summaryOf(plot)).toBe("Lumen: 75, 75% (1 of 2)");
    expect(plot.querySelector(".zen-chart__centre-label")?.textContent).toBe("Lumen");
    await press(plot, "End");
    expect(plot.querySelector(".zen-chart__centre-value")?.textContent).toBe("25");
  });

  it("RadialChart: rings outer first, each against max", async () => {
    await render(wrap(<RadialChart aria-label="Budget" max={200} data={[{ id: "a", label: "Loyalty", value: 100 }, { id: "b", label: "Banking", value: 50 }]} />));
    const plot = await focusChart("Budget");
    expect(summaryOf(plot)).toBe("Loyalty 50%, Banking 25%");
    await press(plot, "ArrowRight", "ArrowRight");
    expect(summaryOf(plot)).toBe("Banking: 25% (2 of 2)");
  });

  it("HeatmapChart: arrows move in 2D, Home/End stay in the row", async () => {
    await render(wrap(<HeatmapChart aria-label="Activity" rows={["9 am", "10 am"]} columns={["Mon", "Tue", "Wed"]} values={[[1, 2, 3], [4, 9, 6]]} />));
    const plot = await focusChart("Activity");
    expect(summaryOf(plot)).toBe("Highest: Tue, 10 am: 9");
    await press(plot, "ArrowRight");
    expect(summaryOf(plot)).toBe("Mon, 9 am: 1");
    await press(plot, "ArrowDown", "End");
    expect(summaryOf(plot)).toBe("Wed, 10 am: 6");
    expect(plot.querySelector('.zen-chart__heat-label[data-axis="row"][data-active="true"]')?.textContent).toBe("10 am");
  });
});

describe("donut", () => {
  it("parts the slices with even, straight gaps: one cut per slice edge, all the same width", async () => {
    await render(wrap(<DonutChart aria-label="Gaps" size={200} data={[{ id: "a", label: "A", value: 3 }, { id: "b", label: "B", value: 2 }, { id: "c", label: "C", value: 1 }]} />));
    const cuts = [...document.querySelectorAll('[aria-label="Gaps"] mask line')];
    expect(cuts).toHaveLength(3);
    expect(new Set(cuts.map((c) => c.getAttribute("stroke-width")))).toEqual(new Set(["2"])); // 4px of a 200px ring = 2 viewBox units
    // The slices meet their neighbours exactly; the cut makes the gap (no angular gap left in the dashes).
    const offsets = [...document.querySelectorAll('[aria-label="Gaps"] .zen-chart__slice')].map((c) => Number.parseFloat((c as SVGElement).style.strokeDashoffset));
    expect(offsets.map((o) => Math.abs(Math.round(o)))).toEqual([0, 50, 83]);
  });

  it("totalPosition start: the total and legend in a column beside the ring, the hole empty, a picked slice takes the total's place", async () => {
    await render(wrap(<DonutChart aria-label="Split" totalPosition="start" label="Invoiced in Q3" value="$296,800" data={[{ id: "a", label: "Lumen", value: 75 }, { id: "b", label: "Phin", value: 25 }]} />, 640));
    const plot = await focusChart("Split");
    const side = document.querySelector(".zen-chart__side") as HTMLElement;
    expect(plot.querySelector(".zen-chart__centre")).toBeNull();
    expect(side.querySelector(".zen-chart__total-label")?.textContent).toBe("Invoiced in Q3");
    expect(side.querySelector(".zen-chart__total-value")?.textContent).toBe("$296,800");
    expect(side.querySelectorAll(".zen-chart__legend li")).toHaveLength(2);
    expect(side.getBoundingClientRect().right).toBeLessThanOrEqual(plot.getBoundingClientRect().left);
    await press(plot, "ArrowRight");
    expect(side.querySelector(".zen-chart__total-label")?.textContent).toBe("Lumen");
    expect(side.querySelector(".zen-chart__total-value")?.textContent).toBe("75");
  });
});

describe("average line", () => {
  it("BarChart: the mean of the closed bars, its tag and the summary", async () => {
    await render(wrap(<BarChart aria-label="Avg bars" showAverage data={[{ label: "Jan", value: 10 }, { label: "Feb", value: 20 }, { label: "Mar", value: 90, projected: true }]} />));
    const plot = await focusChart("Avg bars");
    const line = plot.querySelector(".zen-chart__average") as HTMLElement;
    expect(line.textContent).toBe("Avg 15");
    expect(summaryOf(plot)).toBe("Feb: 20 (2 of 3); average 15");
    // 15 on a 0–100 scale (nice top for 90): the rule sits 15% up the plot.
    expect(line.style.bottom).toBe("15%");
  });

  it("LineChart and StackBarChart: off by default, the first series / the totals when on", async () => {
    await render(wrap(<>
      <LineChart aria-label="No avg" data={[{ label: "A", value: 2 }, { label: "B", value: 4 }]} />
      <LineChart aria-label="Line avg" showAverage series={[{ id: "a", label: "A" }, { id: "b", label: "B" }]} data={[{ label: "x", values: { a: 2, b: 9 } }, { label: "y", values: { a: 4, b: 9 } }]} />
      <StackBarChart aria-label="Stack avg" showAverage series={[{ id: "a", label: "A" }, { id: "b", label: "B" }]} data={[{ label: "x", values: { a: 2, b: 2 } }, { label: "y", values: { a: 4, b: 4 } }]} />
    </>));
    expect(document.querySelector('[aria-label="No avg"] .zen-chart__average')).toBeNull();
    expect(document.querySelector('[aria-label="Line avg"] .zen-chart__average')?.textContent).toBe("Avg 3");
    expect(document.querySelector('[aria-label="Stack avg"] .zen-chart__average')?.textContent).toBe("Avg 6");
  });

  it("horizontal bars: the rule runs down and the tag stays inside the plot", async () => {
    await render(wrap(<BarChart orientation="horizontal" aria-label="H avg" showAverage data={[{ label: "Design", value: 28 }, { label: "Delivery", value: 2 }]} />, 320));
    const plot = await focusChart("H avg");
    const tag = plot.querySelector(".zen-chart__average-tag") as HTMLElement;
    const r = tag.getBoundingClientRect(), box = plot.getBoundingClientRect();
    expect(plot.querySelector(".zen-chart__average")?.getAttribute("data-direction")).toBe("down");
    expect(r.left).toBeGreaterThanOrEqual(box.left - 0.5);
    expect(r.right).toBeLessThanOrEqual(box.right + 0.5);
    expect(r.top).toBeGreaterThanOrEqual(box.top - 0.5);
  });
});

describe("chart family layout", () => {
  it("bars and stacked columns share Corner-Radius/Small and grow from the baseline", async () => {
    await render(wrap(<>
      <BarChart aria-label="Bars" data={[{ label: "A", value: 4 }, { label: "B", value: 8 }]} />
      <StackBarChart aria-label="Stack" series={[{ id: "x", label: "X" }]} data={[{ label: "A", values: { x: 4 } }]} />
    </>));
    const bar = document.querySelector(".zen-chart__column .zen-chart__bar") as HTMLElement;
    const stack = document.querySelector(".zen-chart__stack") as HTMLElement;
    expect(getComputedStyle(bar).borderTopLeftRadius).toBe(getComputedStyle(stack).borderBottomRightRadius);
    expect(Number.parseFloat(getComputedStyle(bar).borderTopLeftRadius)).toBeGreaterThan(4);
    // Reduced motion: the draw-in only fades.
    expect(getComputedStyle(bar).animationName).toBe("zen-chart-fade");
  });

  it("horizontal bars, the donut, the rings and the heatmap stay inside a 320px box", async () => {
    await render(wrap(<>
      <BarChart orientation="horizontal" aria-label="H" data={[{ label: "Client Services", value: 510, target: 640 }, { label: "Design", value: 2650, target: 2800 }]} />
      <DonutChart aria-label="D" legendPosition="start" data={[{ id: "a", label: "Lumen Bank", value: 3 }, { id: "b", label: "Phin & Co", value: 2 }]} />
      <RadialChart aria-label="R" legendPosition="end" data={[{ id: "a", label: "Loyalty app", value: 61 }]} />
      <HeatmapChart aria-label="M" rows={["9 am", "10 am"]} columns={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]} values={[[1, 2, 3, 4, 5, 6, 7], [7, 6, 5, 4, 3, 2, 1]]} />
    </>, 320));
    const box = (document.querySelector('[aria-label="H"]') as HTMLElement).closest("div[style]")!.getBoundingClientRect();
    for (const el of document.querySelectorAll(".zen-chart__hplot, .zen-chart__round, .zen-chart__heat, .zen-chart__legend, .zen-chart__haxis > span:last-child")) {
      const r = el.getBoundingClientRect();
      expect(r.left, el.className).toBeGreaterThanOrEqual(box.left - 0.5);
      expect(r.right, el.className).toBeLessThanOrEqual(box.right + 0.5);
    }
    // Start legend: once the ring and the legend no longer share a row, the ring comes first.
    const donut = document.querySelector('[aria-label="D"]')!.getBoundingClientRect();
    const legend = document.querySelector('[data-kind="donut"] > .zen-chart__legend')!.getBoundingClientRect();
    expect(legend.top >= donut.bottom || legend.right <= donut.left).toBe(true);
  });
});

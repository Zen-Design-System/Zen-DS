/**
 * The chart family (docs/research/chart-family-spec-2026-10-12.md §3–4): every plot is a focusable chart group whose live
 * summary follows the keys, bars keep the shared radius and draw-in, and the horizontal bars, donut, rings and heatmap
 * lay out inside their box. Real browser (Chromium, reduced motion), so layout is real.
 */
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { AreaChart, BarChart, BarList, BulletChart, ComboChart, DonutChart, FunnelChart, GaugeChart, GroupedBarChart, HeatmapChart, LineChart, RadialChart, StackBarChart, ZenProvider } from "../../src/index";

// pointer-events: none keeps the runner's resting mouse from hovering an item (CI saw "Jan" picked under it).
const wrap = (node: ReactNode, width = 480) => <ZenProvider><div style={{ width, pointerEvents: "none" }}>{node}</div></ZenProvider>;
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
    expect(summaryOf(plot)).toBe("Jan 10, Feb 20, Mar 15 · projected"); // no bar active until one is picked
    await press(plot, "ArrowRight");
    expect(summaryOf(plot)).toBe("Jan: 10 (1 of 3)");
    await press(plot, "End");
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

  it("LineChart compare: the line chart plus one dashed comparison, both in the summary and the legend", async () => {
    await render(wrap(<LineChart aria-label="Cash" label="Invoiced" compare={{ label: "Collected", values: [8, 7] }} data={[{ label: "Aug", value: 9 }, { label: "Sep", value: 10 }]} />));
    const plot = await focusChart("Cash");
    expect(summaryOf(plot)).toBe("Aug: Invoiced 9, Collected 8; Sep: Invoiced 10, Collected 7"); // no point active until one is picked
    await press(plot, "End");
    expect(summaryOf(plot)).toBe("Sep: Invoiced 10, Collected 7 (2 of 2)");
    expect(document.querySelectorAll(".zen-chart__legend li")).toHaveLength(2);
    expect(plot.querySelectorAll(".zen-chart__line")).toHaveLength(2);
    expect(plot.querySelector(".zen-chart__line[data-compare]")).not.toBeNull();
    expect(plot.querySelectorAll(".zen-chart__area")).toHaveLength(1); // the gradient stays under the line only
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
  it("draws each slice with straight 4px gaps and 4px round corners", async () => {
    await render(wrap(<DonutChart aria-label="Gaps" size={200} data={[{ id: "a", label: "A", value: 3 }, { id: "b", label: "B", value: 2 }, { id: "c", label: "C", value: 1 }]} />));
    const slices = [...document.querySelectorAll('[aria-label="Gaps"] path.zen-chart__slice')] as SVGPathElement[];
    expect(slices).toHaveLength(3);
    // The outline is inset by the corner and stroked 2 × 4px wide with round joins (200px ring: 1 viewBox unit = 2px).
    for (const slice of slices) {
      expect(slice.getAttribute("stroke-width")).toBe("4");
      expect(slice.getAttribute("stroke-linejoin")).toBe("round");
    }
    // Neighbouring slices never touch: the painted shapes stay a gap apart along their shared edge.
    const box = (el: SVGPathElement) => el.getBBox();
    expect(box(slices[0]).x).toBeGreaterThan(50); // A (half the ring) starts right of 12 o'clock's gap
    expect(document.querySelector('[aria-label="Gaps"] .zen-chart__sweep')).not.toBeNull();
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
    expect(summaryOf(plot)).toBe("Jan 10, Feb 20, Mar 90 · projected; average 15");
    // 15 on a 0–100 scale (nice top for 90): the rule sits 15% up the plot.
    expect(line.style.bottom).toBe("15%");
  });

  it("LineChart and StackBarChart: off by default, the line (not its comparison) / the totals when on", async () => {
    await render(wrap(<>
      <LineChart aria-label="No avg" data={[{ label: "A", value: 2 }, { label: "B", value: 4 }]} />
      <LineChart aria-label="Line avg" showAverage compare={{ label: "B", values: [9, 9] }} data={[{ label: "x", value: 2 }, { label: "y", value: 4 }]} />
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
  it("bars and stacked columns run edge to edge 8px apart, Corner-Radius/Small on top of a flat base, and grow from the baseline", async () => {
    await render(wrap(<>
      <BarChart aria-label="Bars" data={[{ label: "A", value: 4 }, { label: "B", value: 8 }, { label: "C", value: 6 }]} />
      <StackBarChart aria-label="Stack" series={[{ id: "x", label: "X" }]} data={[{ label: "A", values: { x: 4 } }]} />
    </>));
    const bar = document.querySelector(".zen-chart__column .zen-chart__bar") as HTMLElement;
    const stack = document.querySelector(".zen-chart__stack") as HTMLElement;
    expect(getComputedStyle(bar).borderTopLeftRadius).toBe(getComputedStyle(stack).borderTopRightRadius);
    expect(Number.parseFloat(getComputedStyle(bar).borderTopLeftRadius)).toBeGreaterThan(4);
    expect(getComputedStyle(bar).borderBottomLeftRadius).toBe("0px");
    expect(getComputedStyle(stack).borderBottomRightRadius).toBe("0px");
    const plot = document.querySelector('[aria-label="Bars"]')!.getBoundingClientRect();
    const bars = [...document.querySelectorAll('[aria-label="Bars"] .zen-chart__bar')].map((el) => el.getBoundingClientRect());
    const sectors = [...document.querySelectorAll('[aria-label="Bars"] .zen-chart__sector')].map((el) => el.getBoundingClientRect());
    expect(Math.abs(bars[0].left - plot.left)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(bars[2].right - plot.right)).toBeLessThanOrEqual(0.5);
    expect(bars[1].left - bars[0].right).toBeCloseTo(8, 0);
    // The sectors (X pills, rule, Tooltip) sit on the bars' tracks.
    bars.forEach((r, i) => expect(Math.abs(sectors[i].left + sectors[i].width / 2 - (r.left + r.width / 2))).toBeLessThanOrEqual(0.5));
    // Reduced motion: the draw-in only fades.
    expect(getComputedStyle(bar).animationName).toBe("zen-chart-fade");
  });

  it("horizontal bars sit 8px apart, flat at the axis and rounded at their end", async () => {
    await render(wrap(<BarChart orientation="horizontal" aria-label="Rows" animate={false} data={[{ label: "Design", value: 28 }, { label: "Delivery", value: 12 }, { label: "Sales", value: 6 }]} />));
    const rows = [...document.querySelectorAll('[aria-label="Rows"] .zen-chart__htrack')].map((el) => el.getBoundingClientRect());
    expect(rows[1].top - rows[0].bottom).toBeCloseTo(8, 0);
    expect(rows[0].height).toBeCloseTo(24, 0);
    const bar = getComputedStyle(document.querySelector('[aria-label="Rows"] .zen-chart__htrack .zen-chart__bar')!);
    expect(bar.borderTopLeftRadius).toBe("0px");
    expect(bar.borderBottomLeftRadius).toBe("0px");
    expect(Number.parseFloat(bar.borderTopRightRadius)).toBeGreaterThan(4);
  });

  it("BarChart and StackBarChart: nothing active until the pointer is over a column; leaving the plot clears it", async () => {
    await render(wrap(<>
      <BarChart aria-label="Hover bars" data={[{ label: "Jan", value: 10 }, { label: "Feb", value: 20 }]} />
      <StackBarChart aria-label="Hover stack" series={[{ id: "a", label: "A" }]} data={[{ label: "Q1", values: { a: 3 } }, { label: "Q2", values: { a: 5 } }]} />
    </>));
    for (const name of ["Hover bars", "Hover stack"]) {
      const plot = document.querySelector(`[aria-roledescription="chart"][aria-label="${name}"]`) as HTMLElement;
      expect(plot.querySelector("[data-active]"), name).toBeNull();
      expect(plot.querySelector(".zen-chart__tooltip"), name).toBeNull();
      const sector = plot.querySelectorAll(".zen-chart__sector")[1];
      sector.dispatchEvent(new PointerEvent("pointerover", { bubbles: true, pointerType: "mouse" }));
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(plot.querySelector(".zen-chart__sector[data-active]"), name).toBe(sector);
      expect(plot.querySelector(".zen-chart__tooltip"), name).not.toBeNull();
      sector.dispatchEvent(new PointerEvent("pointerout", { bubbles: true, pointerType: "mouse", relatedTarget: document.body }));
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(plot.querySelector("[data-active]"), name).toBeNull();
    }
  });

  it("the Tooltip is centred on the active rule, and moves only to stay inside the chart at its edges", async () => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"];
    await render(wrap(<>
      <StackBarChart aria-label="Tip stack" series={[{ id: "x", label: "X" }, { id: "y", label: "Y" }]} data={months.map((label, i) => ({ label, values: { x: 10 + i, y: 30 } }))} />
      <LineChart aria-label="Tip line" data={months.map((label, i) => ({ label, value: 1000 + i * 300 }))} />
    </>, 420));
    for (const name of ["Tip stack", "Tip line"]) {
      const plot = await focusChart(name);
      const chart = plot.closest(".zen-chart")!.getBoundingClientRect();
      for (const key of ["End", "ArrowLeft", "ArrowLeft", "ArrowLeft", "Home"]) {
        await press(plot, key);
        const sector = plot.querySelector(".zen-chart__sector[data-active]")!.getBoundingClientRect();
        const tip = plot.querySelector(".zen-chart__tooltip")!.getBoundingClientRect();
        const centre = sector.left + sector.width / 2;
        expect(tip.left, `${name} ${key}`).toBeGreaterThanOrEqual(chart.left - 0.5);
        expect(tip.right, `${name} ${key}`).toBeLessThanOrEqual(chart.right + 0.5);
        // Centred whenever centring keeps it inside (the middle periods always; the edges when the Tooltip is narrow).
        if (centre - tip.width / 2 >= chart.left && centre + tip.width / 2 <= chart.right) expect(Math.abs(tip.left + tip.width / 2 - centre), `${name} ${key}`).toBeLessThanOrEqual(0.5);
      }
      await press(plot, "End", "ArrowLeft", "ArrowLeft", "ArrowLeft");
      const sector = plot.querySelector(".zen-chart__sector[data-active]")!.getBoundingClientRect();
      const tip = plot.querySelector(".zen-chart__tooltip")!.getBoundingClientRect();
      expect(Math.abs(tip.left + tip.width / 2 - (sector.left + sector.width / 2)), `${name} middle`).toBeLessThanOrEqual(0.5);
    }
  });

  it("the heatmap's cell Tooltip is centred on its cell and shifts in at the last column", async () => {
    await render(wrap(<HeatmapChart aria-label="Tip heat" rows={["9 am", "10 am"]} columns={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]} values={[[1, 2, 3, 4, 5, 6, 7], [7, 6, 5, 4, 3, 2, 1]]} />, 320));
    const plot = await focusChart("Tip heat");
    const chart = plot.closest(".zen-chart")!.getBoundingClientRect();
    await press(plot, "End", "ArrowLeft", "ArrowLeft", "ArrowLeft");
    let cell = plot.querySelector(".zen-chart__cell[data-active]")!.getBoundingClientRect();
    let tip = plot.querySelector(".zen-chart__cell-tip")!.getBoundingClientRect();
    expect(Math.abs(tip.left + tip.width / 2 - (cell.left + cell.width / 2))).toBeLessThanOrEqual(0.5);
    await press(plot, "End");
    cell = plot.querySelector(".zen-chart__cell[data-active]")!.getBoundingClientRect();
    tip = plot.querySelector(".zen-chart__cell-tip")!.getBoundingClientRect();
    expect(cell.left + cell.width / 2 + tip.width / 2).toBeGreaterThan(chart.right);
    expect(tip.right).toBeLessThanOrEqual(chart.right + 0.5);
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

  it("a legend beside the ring stays a column; wrapped under it in a narrow box it is a row that wraps", async () => {
    const slices = ["Travel", "Software", "Meals", "Office", "Marketing", "Other"].map((label, i) => ({ id: label, label, value: 9 - i }));
    await render(<ZenProvider>
      <div style={{ width: 600, pointerEvents: "none" }}><DonutChart aria-label="Wide" size={240} legendPosition="end" data={slices} /></div>
      <div style={{ width: 300, pointerEvents: "none" }}><DonutChart aria-label="Narrow" size={240} legendPosition="end" data={slices} /></div>
    </ZenProvider>);
    await expect.poll(() => document.querySelector('[aria-label="Narrow"]')!.closest(".zen-chart-block")!.getAttribute("data-wrapped")).toBe("true");
    const legendOf = (name: string) => document.querySelector(`[aria-label="${name}"]`)!.closest(".zen-chart-block")!.querySelector(":scope > .zen-chart__legend")!;
    expect(legendOf("Wide").closest(".zen-chart-block")!.getAttribute("data-wrapped")).toBeNull();
    expect(getComputedStyle(legendOf("Wide")).flexDirection).toBe("column");
    expect(getComputedStyle(legendOf("Narrow")).flexDirection).toBe("row");
    // Six items share fewer rows than a column would take.
    const tops = new Set(Array.from(legendOf("Narrow").children).map((li) => Math.round(li.getBoundingClientRect().top)));
    expect(tops.size).toBeLessThan(6);
  });
});

describe("phase 2 charts (docs/research/chart-phase2-spec-2026-10-14.md)", () => {
  const months = [{ label: "Jan", values: { a: 1, b: 2 } }, { label: "Feb", values: { a: 3, b: 1 } }];
  const ab = [{ id: "a", label: "A" }, { id: "b", label: "B" }];
  const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

  it("data that arrives after mount reads as its overview (or the default item), not \"No data\"", async () => {
    const view = (on: boolean) => wrap(<>
      <LineChart aria-label="Line" data={on ? [{ label: "Jan", value: 1 }, { label: "Feb", value: 2 }] : []} />
      <GroupedBarChart aria-label="Grouped" data={on ? months : []} series={ab} />
      <BarList aria-label="List" data={on ? [{ label: "A", value: 5 }, { label: "B", value: 3 }] : []} />
    </>);
    const screen = await render(view(false));
    expect(summaryOf(await focusChart("Grouped"))).toBe("No data");
    await screen.rerender(view(true));
    expect(summaryOf(await focusChart("Line"))).toBe("Jan 1, Feb 2");
    expect(summaryOf(await focusChart("Grouped"))).toBe("Jan: A 1, B 2; Feb: A 3, B 1");
    expect(summaryOf(await focusChart("List"))).toBe("A: 5 (1 of 2)");
  });

  it("AreaChart stacked: the total and every band; Home moves to the first period", async () => {
    await render(wrap(<AreaChart type="stacked" aria-label="Area" data={months} series={ab} />));
    const plot = await focusChart("Area");
    expect(summaryOf(plot)).toBe("Jan total 3, Feb total 4");
    await press(plot, "End");
    expect(summaryOf(plot)).toBe("Feb: total 4; A 3, B 1 (2 of 2)");
    await press(plot, "Home");
    expect(summaryOf(plot)).toBe("Jan: total 3; A 1, B 2 (1 of 2)");
    expect(plot.querySelectorAll(".zen-chart__area-dot")).toHaveLength(2);
  });

  it("ComboChart: both measures in the summary, the line on its own axis", async () => {
    await render(wrap(<ComboChart aria-label="Combo" barLabel="Revenue" lineLabel="Margin" lineMax={100} lineFormat={(v) => `${v}%`}
      data={[{ label: "Jan", bar: 80, line: 30 }, { label: "Feb", bar: 90, line: 40 }]} />));
    const plot = await focusChart("Combo");
    expect(summaryOf(plot)).toBe("Jan: Revenue 80, Margin 30%; Feb: Revenue 90, Margin 40%");
    await press(plot, "ArrowLeft"); // from none, ← starts at the last period
    expect(summaryOf(plot)).toBe("Feb: Revenue 90, Margin 40% (2 of 2)");
    await press(plot, "ArrowLeft");
    expect(summaryOf(plot)).toBe("Jan: Revenue 80, Margin 30% (1 of 2)");
    expect([...document.querySelectorAll(".zen-chart__y-end > span")].map((label) => label.textContent).at(-1)).toBe("100%");
  });

  it("FunnelChart: every stage first, ↓ picks one, leaving the funnel shows them all again", async () => {
    await render(wrap(<FunnelChart aria-label="Funnel" data={[{ label: "Leads", value: 400 }, { label: "Qualified", value: 200 }, { label: "Signed", value: 40 }]} />));
    const plot = await focusChart("Funnel");
    const overview = "Leads 400 (100%), Qualified 200 (50%), Signed 40 (10%)";
    expect(summaryOf(plot)).toBe(overview);
    await press(plot, "ArrowDown", "ArrowDown");
    expect(summaryOf(plot)).toBe("Qualified: 200, 50% of Leads (2 of 3)");
    plot.blur();
    await tick();
    expect(summaryOf(plot)).toBe(overview);
  });

  it("BarList and BulletChart: ↑/↓ and End move the row", async () => {
    await render(wrap(<>
      <BarList aria-label="List" data={[{ label: "Lumen", value: 90 }, { label: "Phin", value: 60 }]} />
      <BulletChart aria-label="Goals" data={[{ label: "Revenue", value: 798, target: 900 }, { label: "Clients", value: 5, target: 4 }]} />
    </>));
    const list = await focusChart("List");
    expect(summaryOf(list)).toBe("Lumen: 90 (1 of 2)");
    await press(list, "ArrowDown");
    expect(summaryOf(list)).toBe("Phin: 60 (2 of 2)");
    const goals = await focusChart("Goals");
    expect(summaryOf(goals)).toBe("Revenue 798 of 900, Clients 5 of 4");
    await press(goals, "End");
    expect(summaryOf(goals)).toBe("Clients: 5 of 4 (2 of 2)");
  });

  it("GaugeChart is a meter with its reading; phase-2 legends keep items Spacing/Gap/Small apart, the older ones XSmall", async () => {
    await render(wrap(<>
      <GaugeChart aria-label="Utilisation" value={78} target={85} actualLabel="Billable" />
      <DonutChart aria-label="Donut" data={[{ id: "a", label: "A", value: 1 }, { id: "b", label: "B", value: 1 }]} />
    </>));
    const meter = document.querySelector('[role="meter"]')!;
    expect(meter.getAttribute("aria-label")).toBe("Utilisation");
    expect(meter.getAttribute("aria-valuenow")).toBe("78");
    expect(meter.getAttribute("aria-valuetext")).toBe("Billable 78%, Target 85%");
    const gap = (kind: string) => getComputedStyle(document.querySelector(`[data-kind="${kind}"] > .zen-chart__legend`)!);
    expect([gap("gauge").columnGap, gap("gauge").rowGap]).toEqual(["12px", "8px"]);
    expect([gap("donut").columnGap, gap("donut").rowGap]).toEqual(["8px", "4px"]);
  });
});

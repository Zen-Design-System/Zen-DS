/**
 * Chart measures that must settle (Studio performance audit, 2026-10-25). Zen Studio draws every component inside a
 * scaled canvas (transform: scale(zoom)) and its Main component frame in max-content cells:
 * - a ring beside its legend in a box as wide as its content flipped `data-wrapped` about three times a second, because
 *   the wrapped legend row widened the box it was measured in;
 * - the ChartCard grow mixed rendered (zoomed) px with CSS px: too small below 100 %, and above it a 1 px change fed itself
 *   to millions of px.
 * Real browser (Chromium), so layout is real.
 */
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { BarList, ChartCard, DonutChart, LineChart, ZenProvider } from "../../src/index";

const frames = (count: number) => new Promise<void>((resolve) => {
  const step = (left: number) => (left ? requestAnimationFrame(() => step(left - 1)) : resolve());
  step(count);
});
const slices = ["Travel", "Software", "Meals", "Office", "Marketing"].map((label, i) => ({ id: label, label, value: 9 - i }));
const months = [{ label: "Jan", value: 12 }, { label: "Feb", value: 18 }, { label: "Mar", value: 15 }, { label: "Apr", value: 21 }];
const rows = [{ label: "Lumen Bank", value: 40 }, { label: "Phin & Co", value: 25 }, { label: "Mekong Freight", value: 12 }];

describe("chart measures settle", () => {
  it("a ring beside its legend in a max-content box decides once and stays", async () => {
    await render(<ZenProvider>
      <div style={{ display: "grid", gridTemplateColumns: "max-content", pointerEvents: "none" }}>
        <div style={{ display: "flex" }}><DonutChart aria-label="Start" size="small" legendPosition="start" data={slices} /></div>
        <div style={{ display: "flex" }}><DonutChart aria-label="End" size="small" legendPosition="end" data={slices} /></div>
        <div style={{ display: "flex" }}><DonutChart aria-label="Total" size="small" totalPosition="start" data={slices} /></div>
      </div>
    </ZenProvider>);
    const blocks = ["Start", "End", "Total"].map((name) => document.querySelector(`[aria-label="${name}"]`)!.closest(".zen-chart-block")!);
    await frames(10);
    let flips = 0;
    const observer = new MutationObserver((records) => { flips += records.length; });
    for (const block of blocks) observer.observe(block, { attributes: true, attributeFilter: ["data-wrapped"] });
    await frames(40);
    observer.disconnect();
    expect(flips).toBe(0);
  });

  it("a ChartCard grows by the same CSS px at any scale, and a 1 px change does not feed it", async () => {
    const row = (scale: number) => (
      <div key={scale} style={{ width: 720, transform: `scale(${scale})`, transformOrigin: "0 0", pointerEvents: "none" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <ChartCard title={`Tall ${scale}`} description="Expenses per month, 2026" value="$48,200"><LineChart aria-label={`Line ${scale}`} data={months} /></ChartCard>
          <ChartCard title={`Short ${scale}`}><BarList aria-label={`List ${scale}`} data={rows} /></ChartCard>
        </div>
      </div>
    );
    await render(<ZenProvider>{[1, 0.5, 2.4].map(row)}</ZenProvider>);
    const grow = (scale: number) => {
      const body = document.querySelector(`[aria-label="List ${scale}"]`)!.closest(".zen-chart-card__body") as HTMLElement;
      return parseFloat(body.style.getPropertyValue("--zen-chart-grow")) || 0;
    };
    await expect.poll(() => grow(1)).toBeGreaterThan(0);
    await frames(5);
    const expected = grow(1);
    expect(Math.abs(grow(0.5) - expected)).toBeLessThanOrEqual(1);
    expect(Math.abs(grow(2.4) - expected)).toBeLessThanOrEqual(1);
    // A late font or a data change: one child changes by 1 px and back. The grow comes back to the same value.
    const header = document.querySelector(`[aria-label="List 2.4"]`)!.closest(".zen-chart-card__body")!.querySelector(".zen-chart-card__header") as HTMLElement;
    header.style.paddingBottom = "1px";
    await frames(3);
    header.style.paddingBottom = "";
    await frames(10);
    expect(Math.abs(grow(2.4) - expected)).toBeLessThanOrEqual(1);
    // The short card's chart takes the free height, at every scale: no band is left under it.
    for (const scale of [1, 0.5, 2.4]) {
      const body = document.querySelector(`[aria-label="List ${scale}"]`)!.closest(".zen-chart-card__body") as HTMLElement;
      const children = Array.from(body.children) as HTMLElement[];
      const left = body.offsetHeight - children.reduce((sum, child) => sum + child.offsetHeight, 0) - parseFloat(getComputedStyle(body).rowGap) * (children.length - 1);
      expect(left, `scale ${scale}`).toBeLessThanOrEqual(2);
    }
  });
});

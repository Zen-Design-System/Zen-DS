/**
 * Chart card metric text (2026-10-21). The user asked for every chart's description + value to follow Chart/Line-Chart
 * ("value luôn nằm dưới segmented"), and updated the chart card and metric widget text styles in Figma. So:
 * - header (title in Body/Extra/Medium) · Segmented · Metric (description Body/Small/Regular over value Display/4,
 *   Gap/3XSmall apart, Padding/Small above);
 * - MetricCard titles are Body/Extra/Medium, the Tile number Display/4, the Hero number Display/1.
 * Real browser (Chromium).
 */
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { ChartCard, LineChart, MetricCard, ZenProvider } from "../../src/index";
import { typographyStyles } from "../../src/tokens/typography.generated";

const px = (el: Element, prop: string) => parseFloat(getComputedStyle(el).getPropertyValue(prop));
const data = [{ label: "Q1", value: 12 }, { label: "Q2", value: 18 }, { label: "Q3", value: 15 }, { label: "Q4", value: 21 }];

describe("ChartCard metric (Figma Chart/Line-Chart)", () => {
  it("stacks header, Segmented, then the Metric: description over value", async () => {
    const { container } = await render(
      <ZenProvider><div style={{ width: 360 }}>
        <ChartCard title="Expense trends" metricLabel="Expenses per quarter, 2026" value="$48,200"
          ranges={[{ id: "q", label: "Quarterly" }, { id: "m", label: "Monthly" }]} range="q" onRangeChange={() => undefined}>
          <LineChart aria-label="Expenses per quarter" data={data} />
        </ChartCard>
      </div></ZenProvider>,
    );
    const body = container.querySelector(".zen-chart-card__body")!;
    const order = [...body.children].map((el) => el.className.split(" ").find((c) => c.startsWith("zen-")));
    expect(order.slice(0, 3)).toEqual(["zen-chart-card__header", "zen-segmented", "zen-chart-card__metric"]);
    const metric = body.querySelector(".zen-chart-card__metric")!;
    expect([px(metric, "padding-top"), px(metric, "row-gap")]).toEqual([12, 2]);
    expect(metric.querySelector(".zen-chart-card__metric-label")!.classList.contains(typographyStyles["Body/Small/Regular"])).toBe(true);
    expect(metric.querySelector(".zen-chart-card__value")!.classList.contains(typographyStyles["Display/4"])).toBe(true);
    expect(body.querySelector(".zen-chart-card__title")!.classList.contains(typographyStyles["Body/Extra/Medium"])).toBe(true);
  });

  it("draws no Metric without a metric label or a value, and no Hint without a hint", async () => {
    const { container } = await render(<ZenProvider><ChartCard title="Expense trends"><LineChart aria-label="Expenses per quarter" data={data} /></ChartCard></ZenProvider>);
    expect(container.querySelector(".zen-chart-card__metric")).toBeNull();
    expect(container.querySelector(".zen-chart-card__hint")).toBeNull();
  });

  it("the deprecated description still fills the Metric Label", async () => {
    const { container } = await render(<ZenProvider><ChartCard title="Expense trends" description="Old label" value="$1"><LineChart aria-label="Expenses per quarter" data={data} /></ChartCard></ZenProvider>);
    expect(container.querySelector(".zen-chart-card__metric-label")?.textContent).toBe("Old label");
  });

  it("the Hint is a named info icon at the end of the header whose Tooltip carries the description", async () => {
    const { container } = await render(<ZenProvider><div style={{ width: 360 }}><ChartCard title="Expense trends" hint="Paid expenses, VAT included" metricLabel="This quarter" value="$1"><LineChart aria-label="Expenses per quarter" data={data} /></ChartCard></div></ZenProvider>);
    const bar = container.querySelector(".zen-chart-card__titlebar")!;
    const hint = bar.querySelector("button.zen-chart-card__hint") as HTMLButtonElement;
    expect(hint.getAttribute("aria-label")).toBe("More information");
    expect(Math.round(hint.getBoundingClientRect().width)).toBe(20);
    // At the end of the row: the title takes the space before it.
    expect(Math.abs(hint.getBoundingClientRect().right - bar.getBoundingClientRect().right)).toBeLessThanOrEqual(0.5);
    hint.focus();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const tip = document.getElementById(hint.getAttribute("aria-describedby") ?? "");
    expect(tip?.textContent).toContain("Paid expenses, VAT included");
  });
});

describe("MetricCard text styles (Figma Metric-Card, 2026-10-21)", () => {
  it("comparison title Body/Extra/Medium, tile number Display/4, hero number Display/1", async () => {
    const { container } = await render(
      <ZenProvider>
        <MetricCard type="comparison" label="Cash flow · September" value="" comparison={[{ id: "a", label: "Invoiced", value: "$105,700" }]} />
        <MetricCard type="tile" label="Success rate" value="56%" />
        <MetricCard type="hero" label="Invoiced this year" value="$798,300" series={[1, 2, 3, 4]} />
      </ZenProvider>,
    );
    expect(container.querySelector(".zen-metric-card__title")!.classList.contains(typographyStyles["Body/Extra/Medium"])).toBe(true);
    expect(container.querySelector(".zen-metric-tile__number")!.classList.contains(typographyStyles["Display/4"])).toBe(true);
    expect(container.querySelector(".zen-metric-card__hero-value")!.classList.contains(typographyStyles["Display/1"])).toBe(true);
  });
});

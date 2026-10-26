/**
 * Grid cell span (docs/research/grid-span-2026-10-26.md, user 2026-10-26): a Grid's direct child takes `span` columns
 * and `rowSpan` rows (Figma Grid auto layout's column and row span), clamped to the Grid's columns, the whole row while
 * the Grid stacks, per breakpoint, and on the boxes that sit in widget grids (Card, ListBox, ChartCard, MetricCard).
 */
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { Box, Card, ChartCard, Grid, List, ListBox, ListItem, MetricCard, Stack, ZenProvider } from "../../src/index";
import { gridCell, gridTrackCount } from "../../src/components/Layout/cell";

// A 12-column Grid 1200 wide with 16px gaps: a column is (1200 − 11 × 16) / 12 ≈ 85.3, span n = n columns + (n − 1) gaps.
const spanWidth = (n: number, columns = 12, width = 1200, gap = 16) => n * ((width - (columns - 1) * gap) / columns) + (n - 1) * gap;
const widthOf = (element: Element) => element.getBoundingClientRect().width;
// A row's cells are 40 tall; a cell with `tall` has no height of its own, so it stretches over the rows it spans.
const Cell = ({ id, tall, ...props }: { id: string; tall?: boolean; span?: number | "full" | Record<string, number | "full">; rowSpan?: number }) =>
  <Box data-testid={id} {...props} height={tall ? undefined : 40} />;

describe("gridTrackCount", () => {
  it("counts a number, repeat() and a track list; auto-fill is unknown", () => {
    expect(gridTrackCount(12)).toBe(12);
    expect(gridTrackCount("2fr 1fr")).toBe(2);
    expect(gridTrackCount("minmax(0, 1fr) 320px")).toBe(2);
    expect(gridTrackCount("repeat(4, minmax(0, 1fr))")).toBe(4);
    expect(gridTrackCount("repeat(2, 1fr 2fr) 100px")).toBe(5);
    expect(gridTrackCount("repeat(auto-fill, minmax(240px, 1fr))")).toBeNull();
    expect(gridTrackCount(undefined)).toBeNull();
  });
});

describe("gridCell", () => {
  const grid = { columns: 12, stacked: false, breakpoint: "desktop" } as const;
  it("writes nothing outside a Grid or without a span", () => {
    expect(gridCell(null, { span: 8 }).attributes).toEqual({});
    expect(gridCell(grid, {}).attributes).toEqual({});
    expect(gridCell(grid, { span: 1 }).attributes["data-span"]).toBeUndefined();
  });
  it("clamps to the columns, keeps full, drops numbers in auto-fill and row spans while stacked", () => {
    expect(gridCell({ ...grid, columns: 4 }, { span: 8 }).vars["--zen-cell-span"]).toBe("4");
    expect(gridCell(grid, { span: "full" }).attributes["data-span"]).toBe("full");
    expect(gridCell({ ...grid, columns: null }, { span: 3 }).attributes["data-span"]).toBeUndefined();
    expect(gridCell({ ...grid, columns: null }, { span: "full" }).attributes["data-span"]).toBe("full");
    expect(gridCell({ ...grid, stacked: true }, { span: 8, rowSpan: 2 })).toEqual({ attributes: { "data-span": undefined, "data-row-span": undefined }, vars: {} });
  });
  it("resolves per breakpoint like the Grid's columns", () => {
    expect(gridCell({ ...grid, breakpoint: "tablet" }, { span: { desktop: 8, tablet: "full" } }).attributes["data-span"]).toBe("full");
    expect(gridCell({ ...grid, breakpoint: "mobile" }, { span: { desktop: 8 } }).vars["--zen-cell-span"]).toBe("8");
  });
});

describe("Grid span in the browser", () => {
  it("lays a hero over 8 of 12 columns beside a companion over 4, KPIs over 3", async () => {
    const screen = await render(
      <div style={{ width: 1200 }}>
        <Grid columns={12} gap="md">
          <Cell id="kpi" span={3} /><Cell id="kpi-2" span={3} /><Cell id="kpi-3" span={3} /><Cell id="kpi-4" span={3} />
          <Cell id="hero" span={8} /><Cell id="companion" span={4} />
        </Grid>
      </div>,
    );
    expect(widthOf(screen.getByTestId("kpi").element())).toBeCloseTo(spanWidth(3), 0);
    expect(widthOf(screen.getByTestId("hero").element())).toBeCloseTo(spanWidth(8), 0);
    const hero = screen.getByTestId("hero").element().getBoundingClientRect();
    const companion = screen.getByTestId("companion").element().getBoundingClientRect();
    expect(companion.top).toBeCloseTo(hero.top, 0);
    expect(companion.right).toBeCloseTo(hero.left + 1200, 0);
  });

  it("never adds columns: a span larger than the Grid takes all of them", async () => {
    const screen = await render(<div style={{ width: 1200 }}><Grid columns={4} data-testid="grid"><Cell id="wide" span={8} /><Cell id="next" /></Grid></div>);
    expect(getComputedStyle(screen.getByTestId("grid").element()).gridTemplateColumns.split(" ").length).toBe(4);
    expect(widthOf(screen.getByTestId("wide").element())).toBeCloseTo(1200, 0);
  });

  it("takes the whole row with full, in a fixed and in an auto-fill Grid", async () => {
    const screen = await render(
      <Stack gap="md">
        <div style={{ width: 900 }}><Grid columns={3}><Cell id="a" /><Cell id="full-fixed" span="full" /></Grid></div>
        <div style={{ width: 900 }}><Grid minColumnWidth={240}><Cell id="b" /><Cell id="full-fill" span="full" /><Cell id="three" span={3} /></Grid></div>
      </Stack>,
    );
    expect(widthOf(screen.getByTestId("full-fixed").element())).toBeCloseTo(900, 0);
    expect(widthOf(screen.getByTestId("full-fill").element())).toBeCloseTo(900, 0);
    // A number has no column count to clamp to in auto-fill: ignored, one column wide.
    expect(widthOf(screen.getByTestId("three").element())).toBeLessThan(320);
  });

  it("spans rows: a list beside two stacked cards", async () => {
    const screen = await render(
      <div style={{ width: 1200 }}>
        <Grid columns={12} gap="md">
          <Cell id="top" span={8} /><Cell id="tall" tall span={4} rowSpan={2} /><Cell id="bottom" span={8} />
        </Grid>
      </div>,
    );
    const tall = screen.getByTestId("tall").element().getBoundingClientRect();
    const top = screen.getByTestId("top").element().getBoundingClientRect();
    const bottom = screen.getByTestId("bottom").element().getBoundingClientRect();
    expect(bottom.top).toBeGreaterThan(top.bottom);
    expect(tall.top).toBeCloseTo(top.top, 0);
    expect(tall.bottom).toBeCloseTo(bottom.bottom, 0);
  });

  it("gives every cell the whole row while the Grid stacks", async () => {
    const screen = await render(<div style={{ width: 500 }}><Grid columns={12} stackBelow={640}><Cell id="hero" span={8} rowSpan={2} /><Cell id="companion" span={4} /></Grid></div>);
    expect(widthOf(screen.getByTestId("hero").element())).toBeCloseTo(500, 0);
    expect(widthOf(screen.getByTestId("companion").element())).toBeCloseTo(500, 0);
    expect(screen.getByTestId("hero").element().getAttribute("data-row-span")).toBeNull();
  });

  it("resolves span at the Grid's breakpoint", async () => {
    const screen = await render(
      <ZenProvider breakpoint="tablet">
        <div style={{ width: 696 }}>
          <Grid columns={{ desktop: 12, tablet: 6 }}>
            <Cell id="hero" span={{ desktop: 8, tablet: "full" }} /><Cell id="kpi" span={{ desktop: 3, tablet: 3 }} />
          </Grid>
        </div>
      </ZenProvider>,
    );
    expect(widthOf(screen.getByTestId("hero").element())).toBeCloseTo(696, 0);
    expect(widthOf(screen.getByTestId("kpi").element())).toBeCloseTo(spanWidth(3, 6, 696), 0);
  });

  it("works on the boxes of a widget grid, and does nothing outside a Grid", async () => {
    const screen = await render(
      <div style={{ width: 1200 }}>
        <Grid columns={12} gap="md">
          <MetricCard data-testid="metric" span={3} label="Revenue" value="$128.4K" />
          <Card data-testid="card" span={9}>Card</Card>
          <ChartCard data-testid="chart" span={8} title="Revenue">Chart</ChartCard>
          <ListBox data-testid="list" span={4}><List aria-label="Tasks"><ListItem title="One" /></List></ListBox>
        </Grid>
        <Stack><Card data-testid="loose" span={8}>Loose</Card></Stack>
      </div>,
    );
    // MetricCard hands its data-* attributes to its Metric, inside the card's padding: measure the card itself.
    const metricCard = screen.getByTestId("metric").element().closest(".zen-metric-card");
    expect(metricCard?.getAttribute("data-span")).toBe("true");
    expect(widthOf(metricCard!)).toBeCloseTo(spanWidth(3), 0);
    expect(widthOf(screen.getByTestId("card").element())).toBeCloseTo(spanWidth(9), 0);
    expect(widthOf(screen.getByTestId("chart").element())).toBeCloseTo(spanWidth(8), 0);
    expect(widthOf(screen.getByTestId("list").element())).toBeCloseTo(spanWidth(4), 0);
    expect(screen.getByTestId("loose").element().getAttribute("data-span")).toBeNull();
    // MetricCard's props reach its Card, never the DOM as attributes.
    expect(metricCard!.querySelector("[span], [rowspan]")).toBeNull();
  });
});

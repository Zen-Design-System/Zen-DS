/**
 * MetricCard `type` (Figma Metric-Card Type, 6643:64008; docs/research/widget-patterns-spec-2026-10-14.md "As built
 * (metric-types)"): each type draws its own content under a Title-Highlight Metric, says its numbers as text, names its
 * marks, and adds no axe violation. Real browser (Chromium, reduced motion), so layout is real.
 */
import type { ReactNode } from "react";
import axe from "axe-core";
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { MetricCard, ZenProvider } from "../../src/index";

const wrap = (node: ReactNode, width = 345, theme: "light" | "dark" = "light") => <ZenProvider theme={theme}><div data-test-root style={{ width }}>{node}</div></ZenProvider>;
const usd = (value: number) => `$${value.toLocaleString("en-US")}`;
const revenue = [61, 66, 64, 73, 71, 80];
const categories = [{ id: "paid", label: "Paid", value: 106800 }, { id: "pending", label: "Pending", value: 44200 }, { id: "overdue", label: "Overdue", value: 22100 }, { id: "draft", label: "Draft", value: 11100 }];
const pageRules = { region: { enabled: false }, "landmark-one-main": { enabled: false }, "page-has-heading-one": { enabled: false } };

const cases: Record<string, ReactNode> = {
  sparkline: <MetricCard type="sparkline" label="Revenue" value="$105,700" trend={{ direction: "positive", label: "+9% vs. August" }} series={revenue} subAction={{ label: "Revenue actions", onClick: () => undefined }} />,
  "spark-bars": <MetricCard type="spark-bars" label="Hours logged" value="1,284 h" series={[25, 31, 28, 45]} />,
  "goal-progress": <MetricCard type="goal-progress" label="Collected this quarter" value="$108,400" format={usd} goal={{ value: 108400, target: 135000 }} />,
  comparison: <MetricCard type="comparison" label="Cash flow · September" comparison={[{ id: "in", label: "Invoiced", value: "$105,700", trend: { direction: "positive", label: "+9% vs. August" } }, { id: "out", label: "Collected", value: "$88,300" }, { id: "due", label: "Overdue", value: "$12,880", trend: { direction: "normal", label: "1 invoice" } }]} />,
  "category-bar": <MetricCard type="category-bar" label="Invoices by status" value="$184,200" format={usd} categories={categories} />,
  hero: <MetricCard type="hero" label="Invoiced this year" value="$798,300" trend={{ direction: "positive", label: "+12% vs. 2025" }} series={revenue} />,
  tile: <MetricCard type="tile" label="Success rate" value="56%" trend={{ direction: "positive", label: "+24% vs. last year" }} />,
};

describe("MetricCard type", () => {
  it("kpi (the default) keeps today's DOM: the Metric straight in the card", async () => {
    await render(wrap(<MetricCard label="Revenue" value="$1,680.68" />));
    const content = document.querySelector(".zen-metric-card > .zen-card__content")!;
    expect(content.firstElementChild?.classList.contains("zen-metric")).toBe(true);
    expect(document.querySelector(".zen-metric-card")?.getAttribute("data-type")).toBeNull();
  });

  it("sparkline: one named image; the area's top edge is the line and runs to the frame's bottom; no end dot", async () => {
    await render(wrap(cases.sparkline));
    const image = document.querySelector('.zen-metric-spark[role="img"]')!;
    expect(image.getAttribute("aria-label")).toBe("Trend over 6 periods: from 61 to 80, low 61, high 80");
    const line = document.querySelector(".zen-metric-spark__line")!.getAttribute("d")!;
    const area = document.querySelector(".zen-metric-spark__area")!.getAttribute("d")!;
    expect(area.startsWith(line)).toBe(true);
    expect(area.endsWith("L 100 64 L 0 64 Z")).toBe(true);
    // Figma Line y 4, h 56 in a 64 frame: the highest point 4px under the top, the lowest 4px over the bottom.
    expect(line.split(" L ")[0]).toBe("M 0 60");
    expect(line.split(" L ").pop()).toBe("100 4");
    expect(image.getBoundingClientRect().height).toBe(64);
    expect(document.querySelector(".zen-metric-spark__dot")).toBeNull();
  });

  it("spark-bars: bars as shares of the largest, the last one current", async () => {
    await render(wrap(cases["spark-bars"]));
    const bars = [...document.querySelectorAll<HTMLElement>(".zen-metric-bars__bar")];
    expect(bars.map((bar) => bar.dataset.current ?? "")).toEqual(["", "", "", "true"]);
    expect(Math.round(bars[3].getBoundingClientRect().height)).toBe(48);
    expect(Math.round(bars[0].getBoundingClientRect().height)).toBe(Math.round((25 / 45) * 48));
    expect(document.querySelector(".zen-metric-bars")?.getAttribute("aria-label")).toBe("Trend over 4 periods: from 25 to 45, low 25, high 45");
  });

  it("goal-progress: a named progressbar toward the goal, past 100% too", async () => {
    const screen = await render(wrap(cases["goal-progress"]));
    const bar = screen.getByRole("progressbar");
    await expect.element(bar).toHaveAttribute("aria-valuenow", "80");
    expect(document.querySelector(".zen-progress-bar__label")?.textContent).toBe("of $135,000 goal");
    await screen.rerender(wrap(<MetricCard type="goal-progress" label="Deposit" value="$5,600" format={usd} goal={{ value: 5600, target: 5000 }} />));
    expect(document.querySelector(".zen-progress-bar__value")?.textContent).toBe("112%");
  });

  it("comparison: the title and one Small metric per column, side by side, stacked when narrow", async () => {
    const screen = await render(wrap(cases.comparison, 560));
    expect(document.querySelector(".zen-metric-card__title")?.textContent).toBe("Cash flow · September");
    const columns = [...document.querySelectorAll(".zen-metric-card__column")];
    expect(columns.map((column) => column.querySelector(".zen-metric__value")?.textContent)).toEqual(["$105,700", "$88,300", "$12,880"]);
    const tops = columns.map((column) => Math.round(column.getBoundingClientRect().top));
    expect(new Set(tops).size).toBe(1);
    await screen.rerender(wrap(cases.comparison, 345));
    const stacked = [...document.querySelectorAll(".zen-metric-card__column")].map((column) => Math.round(column.getBoundingClientRect().top));
    expect(stacked[1]).toBeGreaterThan(stacked[0]);
  });

  it("category-bar: a decorative bar and a row per category whose shares add up to 100", async () => {
    await render(wrap(cases["category-bar"]));
    expect(document.querySelector(".zen-metric-categories__bar")?.getAttribute("aria-hidden")).toBe("true");
    const rows = [...document.querySelectorAll(".zen-metric-categories__row")].map((row) => [...row.children].map((cell) => cell.textContent));
    expect(rows).toEqual([["Paid", "$106,800", "58%"], ["Pending", "$44,200", "24%"], ["Overdue", "$22,100", "12%"], ["Draft", "$11,100", "6%"]]);
    const segments = [...document.querySelectorAll(".zen-metric-categories__segment")].map((segment) => segment.getBoundingClientRect().width);
    expect(segments[0]).toBeGreaterThan(segments[1]);
  });

  it("hero: a Brand Pale card, neutral line without a dot, an On-Color Solid trend badge; theme solid is the dark widget", async () => {
    const screen = await render(wrap(cases.hero));
    const card = document.querySelector(".zen-metric-card")!;
    expect([card.getAttribute("data-tone"), card.getAttribute("data-color")]).toEqual(["pale", "brand"]);
    expect(document.querySelector(".zen-metric-spark")?.getAttribute("data-tone")).toBe("neutral");
    expect(document.querySelector(".zen-metric-spark__dot")).toBeNull();
    const badge = document.querySelector(".zen-metric__content .zen-badge")!;
    expect([badge.getAttribute("data-tone"), badge.getAttribute("data-background")]).toEqual(["on-color", "solid"]);
    await screen.rerender(wrap(<MetricCard type="hero" theme="solid" label="Invoiced this year" value="$798,300" trend={{ direction: "positive", label: "+12% vs. 2025" }} series={revenue} />));
    expect([card.getAttribute("data-tone"), card.getAttribute("data-color")]).toEqual(["solid", "neutral"]);
    // On Solid Neutral the trend follows the fill (Figma Hero · Solid Neutral 15487:89034: Metric-Trend Content=Inverse).
    const solidBadge = document.querySelector(".zen-metric__content .zen-badge")!;
    expect([solidBadge.getAttribute("data-tone"), solidBadge.getAttribute("data-background")]).toEqual(["inverse", "solid"]);
  });

  it("tile: Figma Metric-Tile in a Card Spacing=Small; the title, number and trend over the Dock-Icon, Medium or Small", async () => {
    const screen = await render(wrap(cases.tile, 169));
    const card = document.querySelector(".zen-metric-card")!;
    expect([card.getAttribute("data-type"), card.getAttribute("data-tone"), card.getAttribute("data-spacing")]).toEqual(["tile", "shadow", "small"]);
    const tile = card.querySelector(".zen-metric-tile")!;
    expect([...tile.querySelectorAll(".zen-metric-tile__label, .zen-metric-tile__number")].map((node) => node.textContent)).toEqual(["Success rate", "56%"]);
    const badge = tile.querySelector(".zen-badge")!;
    expect([badge.getAttribute("data-tone"), badge.getAttribute("data-background")]).toEqual(["green", "subtle"]);
    const dock = tile.querySelector(".zen-dock-icon")!;
    expect([dock.getAttribute("data-tone"), dock.getAttribute("data-size")]).toEqual(["neutral", "medium"]);
    // Value over the Dock-Icon, Spacing/Gap/Small (12) apart; the title and number Gap/2XSmall (4).
    const value = tile.querySelector(".zen-metric-tile__value")!.getBoundingClientRect();
    expect(Math.round(dock.getBoundingClientRect().top - value.bottom)).toBe(12);
    await screen.rerender(wrap(<MetricCard type="tile" size="sm" label="Protein" value="92 g" />, 109));
    expect([document.querySelector(".zen-metric-tile")!.getAttribute("data-size"), document.querySelector(".zen-metric-tile .zen-dock-icon")!.getAttribute("data-size")]).toEqual(["small", "small"]);
  });

  it("tile: its content follows the card's fill (Figma Content Inverse · On-Accent · On-Color · On-Bright)", async () => {
    // [colour, the badge and Dock-Icon family, the number's colour, the title's colour]: Inverse has a Base step, the On-*
    // families one colour.
    const fills = [["neutral", "inverse", "--zen-color-content-inverse-strongest", "--zen-color-content-inverse-base"], ["accent", "on-color", "--zen-color-content-on-accent-default", "--zen-color-content-on-accent-default"], ["cyan", "on-color", "--zen-color-content-on-colors", "--zen-color-content-on-colors"], ["yellow", "on-color", "--zen-color-content-on-brights", "--zen-color-content-on-brights"]] as const;
    await render(
      <ZenProvider theme="light">
        {fills.map(([color]) => <MetricCard key={color} theme="solid" color={color} type="tile" label="Success rate" value="56%" trend={{ direction: "negative", label: "-3%" }} />)}
      </ZenProvider>,
    );
    const page = document.querySelector("[data-theme]")!;
    const resolve = (name: string) => { const probe = document.createElement("span"); probe.style.color = `var(${name})`; page.appendChild(probe); const value = getComputedStyle(probe).color; probe.remove(); return value; };
    for (const [color, chips, number, title] of fills) {
      const tile = [...document.querySelectorAll(".zen-metric-card")].find((card) => card.getAttribute("data-color") === color)!.querySelector(".zen-metric-tile")!;
      expect(getComputedStyle(tile.querySelector(".zen-metric-tile__number")!).color, color).toBe(resolve(number));
      expect(getComputedStyle(tile.querySelector(".zen-metric-tile__label")!).color, color).toBe(resolve(title));
      expect([tile.querySelector(".zen-badge")!.getAttribute("data-tone"), tile.querySelector(".zen-dock-icon")!.getAttribute("data-tone")], color).toEqual([chips, chips]);
    }
  });

  it("no data: an empty frame named No data, nothing drawn", async () => {
    await render(wrap(<MetricCard type="sparkline" label="Revenue" value="—" series={[]} />));
    expect(document.querySelector(".zen-metric-spark")?.getAttribute("aria-label")).toBe("No data");
    expect(document.querySelector(".zen-metric-spark__line")).toBeNull();
  });

  for (const [type, node] of Object.entries(cases)) {
    it(`${type}: no axe violation in light and dark`, async () => {
      for (const theme of ["light", "dark"] as const) {
        const screen = await render(wrap(node, type === "comparison" ? 560 : 345, theme));
        const result = await axe.run(document.querySelector("[data-test-root]")!, { resultTypes: ["violations"], rules: pageRules });
        // The Caption labels of Small metrics (Content/Neutral/Light) are the Metric's known contrast entry in
        // tests/smoke/axe-baseline.json (a Figma token decision); everything else the types add must pass.
        const found = result.violations.map((violation) => ({ id: violation.id, nodes: violation.nodes.map((n) => n.target.join(" ")).filter((target) => !(violation.id === "color-contrast" && /zen-metric__label\b/.test(target))) }));
        expect(found.filter((violation) => violation.nodes.length).map((violation) => `${violation.id}: ${violation.nodes.join(", ")}`), `${type} (${theme})`).toEqual([]);
        await screen.unmount();
      }
    });
  }
});

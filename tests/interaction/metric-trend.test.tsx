/**
 * Figma .Primitives/Metrics/Metric-Trend (595:55134, re-synced 2026-10-26): the badge holds the change alone, the
 * Sub-Label beside it says what it is measured against. Default Positive / Negative are Solid green / red, Normal is
 * Neutral Subtle; the Sub-Label is Body/Small/Regular in Content/Neutral/Light, Inverse/Light or On-Colors by Content.
 * Real browser (Chromium, reduced motion).
 */
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { Metric, MetricTrend, ZenProvider } from "../../src/index";
import { typographyStyles } from "../../src/tokens/typography.generated";

/** A token's colour as the page resolves it. */
const resolve = (name: string) => {
  const page = document.querySelector("[data-theme]")!;
  const probe = document.createElement("span");
  probe.style.color = `var(${name})`;
  page.appendChild(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
};

describe("MetricTrend", () => {
  it("Default: Positive and Negative are Solid green / red with their arrow, Normal Neutral Subtle", async () => {
    await render(
      <ZenProvider theme="light">
        <MetricTrend trend="positive" subLabel="vs. last year">24%</MetricTrend>
        <MetricTrend trend="negative" subLabel="vs. last year">24%</MetricTrend>
        <MetricTrend trend="normal" subLabel="vs. last year">0%</MetricTrend>
      </ZenProvider>,
    );
    const badges = [...document.querySelectorAll(".zen-metric-trend > .zen-badge")];
    expect(badges.map((badge) => [badge.getAttribute("data-tone"), badge.getAttribute("data-background"), Boolean(badge.querySelector(".zen-icon")), badge.textContent])).toEqual([
      ["green", "solid", true, "24%"],
      ["red", "solid", true, "24%"],
      ["neutral", "subtle", false, "0%"],
    ]);
  });

  it("the Sub-Label sits beside the badge, Spacing/Gap/2XSmall apart, Body/Small/Regular in Content/Neutral/Light", async () => {
    await render(<ZenProvider theme="light"><MetricTrend trend="positive" subLabel="vs. August">9%</MetricTrend></ZenProvider>);
    const badge = document.querySelector(".zen-metric-trend > .zen-badge")!.getBoundingClientRect();
    const sub = document.querySelector(".zen-metric-trend__sub-label")!;
    const box = sub.getBoundingClientRect();
    expect(sub.textContent).toBe("vs. August");
    expect(sub.classList.contains(typographyStyles["Body/Small/Regular"].split(" ")[0])).toBe(true);
    expect(Math.round(box.left - badge.right)).toBe(4);
    expect(Math.abs((box.top + box.bottom) / 2 - (badge.top + badge.bottom) / 2)).toBeLessThanOrEqual(1);
    expect(getComputedStyle(sub).color).toBe(resolve("--zen-color-content-neutral-light"));
  });

  it("outside a Solid card, Content=Inverse and On-Color give the Sub-Label Inverse/Light and On-Colors", async () => {
    await render(
      <ZenProvider theme="light">
        <MetricTrend trend="positive" content="inverse" subLabel="vs. last year">24%</MetricTrend>
        <MetricTrend trend="positive" content="on-color" subLabel="vs. last year">24%</MetricTrend>
      </ZenProvider>,
    );
    const [inverse, onColor] = [...document.querySelectorAll(".zen-metric-trend")];
    expect([inverse.getAttribute("data-content"), inverse.querySelector(".zen-badge")!.getAttribute("data-tone")]).toEqual(["inverse", "inverse"]);
    expect(getComputedStyle(inverse.querySelector(".zen-metric-trend__sub-label")!).color).toBe(resolve("--zen-color-content-inverse-light"));
    expect([onColor.getAttribute("data-content"), onColor.querySelector(".zen-badge")!.getAttribute("data-tone")]).toEqual(["on-color", "on-color"]);
    expect(getComputedStyle(onColor.querySelector(".zen-metric-trend__sub-label")!).color).toBe(resolve("--zen-color-content-on-colors"));
  });

  it("a one-string label from before the split still renders: all of it in the badge, no Sub-Label", async () => {
    await render(<ZenProvider theme="light"><Metric label="Revenue" value="$105,700" trend={{ direction: "positive", label: "+9% vs. August" }} /></ZenProvider>);
    const badge = document.querySelector(".zen-metric .zen-badge")!;
    expect(badge.textContent).toBe("+9% vs. August");
    expect(document.querySelector(".zen-metric-trend")).toBeNull();
  });

  it("Metric passes trend.subLabel on: the badge holds the change, the Sub-Label the comparison", async () => {
    await render(<ZenProvider theme="light"><Metric size="sm" label="Revenue" value="$105,700" trend={{ direction: "negative", label: "8%", subLabel: "vs. August" }} /></ZenProvider>);
    expect([document.querySelector(".zen-metric-trend .zen-badge")?.textContent, document.querySelector(".zen-metric-trend__sub-label")?.textContent]).toEqual(["8%", "vs. August"]);
  });
});

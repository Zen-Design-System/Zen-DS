/**
 * Backlog batch B (2026-10-07): Figma Metric-Inline props — Metric-Color and Counter (Icon-Highlight), Label-Icon and
 * Hint (Title-Highlight).
 */
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { userEvent } from "vitest/browser";
import { Metric } from "../../src/index";

describe("Metric-Inline props", () => {
  it("draws the colour dot and the counter around the label", async () => {
    await render(<Metric size="sm" icon={false} label="Projects" value="$18,240" metricColor="rgb(0, 0, 255)" counter={6} />);
    const row = document.querySelector(".zen-metric__label-row")!;
    expect([...row.children].map((child) => child.className.split(" ")[0])).toEqual(["zen-metric__color", "zen-metric__label", "zen-badge"]);
    expect(getComputedStyle(row.querySelector(".zen-metric__color")!).backgroundColor).toBe("rgb(0, 0, 255)");
    expect(row.textContent).toContain("6");
  });

  it("shows the hint on focus and puts the label icon before the title", async () => {
    const screen = await render(<Metric variant="title-highlight" size="md" label="Next payout" labelIcon="icon-wallet-02-line" hint="Paid invoices from the last 14 days" value="$4,812.40" />);
    const titleRow = document.querySelector(".zen-metric__title-row")!;
    // Figma Label-Container › Wrapper: [Label-Icon] Label, Spacing/Gap/XSmall apart, then the 20px Hint.
    const wrapper = titleRow.querySelector(".zen-metric__title-label")!;
    expect(wrapper.firstElementChild?.className).toContain("zen-metric__label-icon");
    expect(getComputedStyle(wrapper).columnGap).toBe("8px");
    expect(titleRow.querySelector(".zen-metric__hint")!.getBoundingClientRect().width).toBe(20);
    await userEvent.tab();
    await expect.element(screen.getByRole("tooltip")).toHaveTextContent("Paid invoices from the last 14 days");
  });

  it("puts the 12px hint after the Caption label at Small and no dot in the title row (Figma 7523:507049)", async () => {
    await render(<Metric variant="title-highlight" size="sm" icon={false} label="Payout" hint="How it is worked out" metricColor value="$4,812.40" />);
    const row = document.querySelector(".zen-metric__label-row")!;
    expect([...row.querySelectorAll(".zen-metric__color, .zen-metric__label, .zen-metric__hint")].map((child) => child.className.split(" ")[0])).toEqual(["zen-metric__color", "zen-metric__label", "zen-metric__hint"]);
    expect(row.querySelector(".zen-metric__hint")!.getBoundingClientRect().width).toBe(12);
    await render(<Metric variant="title-highlight" size="md" icon={false} label="Payout" metricColor value="$4,812.40" />);
    expect(document.querySelector(".zen-metric__title-row .zen-metric__color")).toBeNull();
  });
});

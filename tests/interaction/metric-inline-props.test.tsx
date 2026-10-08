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
    expect(titleRow.firstElementChild?.className).toContain("zen-metric__label-icon");
    await userEvent.tab();
    await expect.element(screen.getByRole("tooltip")).toHaveTextContent("Paid invoices from the last 14 days");
  });
});

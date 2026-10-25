/**
 * Measures batched across instances (Studio performance audit P1, 2026-10-25): AppShellHeader's top-row stack, the
 * charts' floating Tooltips. Each instance used to write a style, read, and write again on its own, which laid a page of
 * them out once or twice per instance. They now read together, then write. Same answers, at any scale (Zen Studio's
 * canvas is a CSS transform). Real browser (Chromium), so layout is real.
 */
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { AppShellHeader, LineChart, ZenProvider } from "../../src/index";

const frames = (count: number) => new Promise<void>((resolve) => {
  const step = (left: number) => (left ? requestAnimationFrame(() => step(left - 1)) : resolve());
  step(count);
});

describe("batched measures", () => {
  it("AppShellHeader stacks a trail too long for its row, at any scale, and follows a resize", async () => {
    const header = (id: string) => (
      <AppShellHeader data-testid={id}
        leading={<span style={{ whiteSpace: "nowrap" }}>Workspace › Settings › Members and permissions › Billing history</span>}
        actions={<span style={{ display: "inline-block", width: 120, height: 32 }} />} />
    );
    const screen = await render(<ZenProvider>
      <div data-testid="narrow-host" style={{ width: 360 }}>{header("narrow")}</div>
      <div data-testid="wide-host" style={{ width: 1200 }}>{header("wide")}</div>
      <div style={{ width: 360, transform: "scale(0.5)", transformOrigin: "0 0" }}>{header("scaled")}</div>
    </ZenProvider>);
    await frames(2);
    const stackedOf = (id: string) => screen.getByTestId(id).element().getAttribute("data-stacked");
    expect([stackedOf("narrow"), stackedOf("wide"), stackedOf("scaled")]).toEqual(["true", null, "true"]);
    (screen.getByTestId("wide-host").element() as HTMLElement).style.width = "360px";
    (screen.getByTestId("narrow-host").element() as HTMLElement).style.width = "1200px";
    await expect.poll(() => [stackedOf("narrow"), stackedOf("wide")]).toEqual([null, "true"]);
  });

  it("a chart's Tooltip stays inside the chart at its last item, scaled too", async () => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"];
    const data = months.map((label, i) => ({ label, value: 1000 + i * 300 }));
    await render(<ZenProvider>
      <div data-host="Plain" style={{ width: 420, pointerEvents: "none" }}><LineChart aria-label="Plain" data={data} /></div>
      <div data-host="Scaled" style={{ width: 420, transform: "scale(2)", transformOrigin: "0 0", pointerEvents: "none" }}><LineChart aria-label="Scaled" data={data} /></div>
    </ZenProvider>);
    for (const name of ["Plain", "Scaled"]) {
      const plot = document.querySelector(`[aria-roledescription="chart"][aria-label="${name}"]`) as HTMLElement;
      plot.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true, cancelable: true }));
      await frames(2);
      const chart = plot.closest(".zen-chart")!.getBoundingClientRect();
      const tip = plot.querySelector(".zen-chart__tooltip")!.getBoundingClientRect();
      expect(tip.right, name).toBeLessThanOrEqual(chart.right + 0.5);
      expect(tip.left, name).toBeGreaterThanOrEqual(chart.left - 0.5);
      // Placed again when its chart resizes (the shift it has is read back, not reset to 0 first): still inside.
      const host = document.querySelector(`[data-host="${name}"]`) as HTMLElement;
      host.style.width = "380px";
      await frames(3);
      const narrower = plot.closest(".zen-chart")!.getBoundingClientRect();
      expect(plot.querySelector(".zen-chart__tooltip")!.getBoundingClientRect().right, `${name} narrower`).toBeLessThanOrEqual(narrower.right + 0.5);
    }
  });
});

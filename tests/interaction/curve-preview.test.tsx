/**
 * CurvePreview (2026-10-14, Figma Chart/Curve-Preview 15663:110887): a named picture of a motion curve. The curve
 * starts 28 from the bottom of the 320 × 176 plot and settles on the dashed target 52 from the top; bounce changes how
 * far a spring overshoots. Real browser (Chromium).
 */
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { CurvePreview, ZenProvider } from "../../src/index";
import { curveProgress } from "../../src/components/CurvePreview/curve";

const points = () => (document.querySelector(".zen-curve-preview__curve")?.getAttribute("d") ?? "")
  .split(/[ML]/).filter(Boolean).map((pair) => pair.trim().split(" ").map(Number));

describe("CurvePreview", () => {
  it("is one image named by its type, in the provider's language", async () => {
    const screen = await render(<ZenProvider><div style={{ width: 320 }}><CurvePreview type="bounce" /></div></ZenProvider>);
    await expect.element(screen.getByRole("img", { name: "Motion curve: Bounce" })).toBeInTheDocument();
    await screen.rerender(<ZenProvider locale="vi"><div style={{ width: 320 }}><CurvePreview type="ease-out" /></div></ZenProvider>);
    await expect.element(screen.getByRole("img", { name: "Đường cong chuyển động: Chậm dần" })).toBeInTheDocument();
  });

  it("draws from the start to the target and fills the width at a fixed height", async () => {
    await render(<ZenProvider><div style={{ width: 480 }}><CurvePreview type="ease-in-out" /></div></ZenProvider>);
    const curve = points();
    expect(curve[0]).toEqual([0, 148]);
    expect(curve.at(-1)).toEqual([320, 52]);
    const box = document.querySelector(".zen-curve-preview")!.getBoundingClientRect();
    expect(Math.round(box.width)).toBe(480);
    expect(Math.round(box.height)).toBe(176);
    const stroke = getComputedStyle(document.querySelector(".zen-curve-preview__curve")!);
    expect(stroke.strokeWidth).toBe("2px");
    expect(stroke.vectorEffect).toBe("non-scaling-stroke");
  });

  it("overshoots more with a higher bounce and not at all with 0", async () => {
    const peak = (type: "spring" | "bounce", bounce?: number) => Math.max(...curveProgress(type, bounce));
    expect(peak("spring")).toBeGreaterThan(1.04);
    expect(peak("spring")).toBeLessThan(1.05);
    expect(peak("bounce")).toBeGreaterThan(1.35);
    expect(peak("spring", 0)).toBeLessThanOrEqual(1);
    const screen = await render(<ZenProvider><CurvePreview type="spring" bounce={0.6} /></ZenProvider>);
    const high = Math.min(...points().map(([, y]) => y));
    await screen.rerender(<ZenProvider><CurvePreview type="spring" bounce={0.1} /></ZenProvider>);
    const low = Math.min(...points().map(([, y]) => y));
    expect(high).toBeLessThan(low);
  });
});

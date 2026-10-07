/**
 * useAnchoredPosition: a surface that fits on neither edge of its anchor is shifted into the viewport instead of running
 * off it (2026-10-02: the 310px chat Reaction-Bar opened from x 254 was cut off on a 390px phone).
 */
import { useRef } from "react";
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { Popover, ZenProvider } from "../../src/index";
import { clampAnchoredLeft } from "../../src/components/Popover/useAnchoredPosition";

describe("clampAnchoredLeft", () => {
  it("shifts a surface that runs off the right edge back to the 8px margin", () => {
    expect(clampAnchoredLeft(254, 310, 0, 390)).toBe(72);
  });
  it("shifts a surface that runs off the left edge", () => {
    expect(clampAnchoredLeft(-50, 310, 0, 390)).toBe(8);
  });
  it("keeps a surface that fits where it is", () => {
    expect(clampAnchoredLeft(40, 310, 0, 390)).toBe(40);
  });
  it("pins a surface wider than the bounds to the left margin", () => {
    expect(clampAnchoredLeft(100, 500, 0, 390)).toBe(8);
  });
});

describe("Popover placement", () => {
  function Wide({ align }: { align: "start" | "end" }) {
    const anchor = useRef<HTMLButtonElement>(null);
    return (
      <>
        <button ref={anchor} type="button" style={{ position: "fixed", top: 100, left: "50%", width: 80 }}>Anchor</button>
        <Popover open anchorRef={anchor} align={align} aria-label="Wide" style={{ width: window.innerWidth - 100, maxWidth: "none" }}>
          <span>Wide content</span>
        </Popover>
      </>
    );
  }

  it("leaves a surface in a transform-scaled frame where it was (a docs phone preview: no shift)", async () => {
    function Scaled() {
      const anchor = useRef<HTMLButtonElement>(null);
      return (
        <div className="scaled-frame" style={{ position: "relative", width: 1200, height: 400, transform: "scale(0.5)", transformOrigin: "top left" }}>
          <button ref={anchor} type="button" style={{ position: "absolute", top: 100, left: 1000, width: 80 }}>Anchor</button>
          <Popover open anchorRef={anchor} aria-label="Scaled" style={{ width: 2400, maxWidth: "none" }}><span>Wide content</span></Popover>
        </div>
      );
    }
    const screen = await render(<ZenProvider><Scaled /></ZenProvider>);
    const surface = () => document.querySelector<HTMLElement>(".zen-popover");
    await expect.poll(() => surface()?.style.left ?? "").not.toBe("");
    const frame = document.querySelector<HTMLElement>(".scaled-frame")!.getBoundingClientRect();
    const anchor = (screen.getByRole("button", { name: "Anchor" }).element() as HTMLElement).getBoundingClientRect();
    // Anchored at its start edge as before the clamp existed, not pulled toward the viewport's margin.
    expect(parseFloat(surface()!.style.left)).toBeCloseTo(anchor.left - frame.left, 0);
  });

  for (const align of ["start", "end"] as const) {
    it(`keeps a surface wider than the room on either side of its anchor inside the viewport (align ${align})`, async () => {
      await render(<ZenProvider><Wide align={align} /></ZenProvider>);
      const surface = () => document.querySelector<HTMLElement>(".zen-popover");
      await expect.poll(() => surface()?.getBoundingClientRect().left ?? -1).toBeGreaterThanOrEqual(8);
      const rect = surface()!.getBoundingClientRect();
      expect(rect.right).toBeLessThanOrEqual(document.documentElement.clientWidth - 8 + 0.5);
    });
  }
});

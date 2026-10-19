/**
 * Box `mask` (Figma's mask, Zen Studio ⌃⌘M, layout/mask.tsx): the box's first layer is the mask — it draws nothing — and
 * its outline, at its X / Y and turned as drawn, clips the layers after it (a clipPath the box points at).
 */
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { Box, Shape, ZenProvider } from "../../src/index";

const frame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

describe("Box mask", () => {
  it("clips the layers after the first to its outline and hides the mask layer", async () => {
    const screen = await render(
      <ZenProvider>
        <Box group mask width={120} height={100} data-testid="mask">
          <Shape type="ellipse" position="absolute" insetLeft={10} insetTop={20} width={80} height={60} data-testid="mask-layer" />
          <Box surface="subtle" position="absolute" insetLeft={0} insetTop={0} width={120} height={100} data-testid="masked" />
        </Box>
      </ZenProvider>,
    );
    await frame();
    const box = screen.getByTestId("mask").element() as HTMLElement;
    const layer = screen.getByTestId("mask-layer").element() as HTMLElement;
    const clip = box.querySelector("clipPath path");
    expect(clip, "a clipPath for the mask").not.toBeNull();
    expect(getComputedStyle(box).clipPath).toMatch(/^url\(/);
    // The ellipse's own outline (its drawing's path), moved to its X / Y.
    expect(clip!.getAttribute("d")).toBe(layer.querySelector("svg.zen-shape__drawing path")!.getAttribute("d"));
    expect(clip!.getAttribute("transform")).toBe("translate(10 20)");
    expect(getComputedStyle(layer).visibility).toBe("hidden");
    expect(getComputedStyle(screen.getByTestId("masked").element()).visibility).toBe("visible");
  });

  it("turns and flips the outline as the mask layer is drawn, and follows a rectangle's corners", async () => {
    const screen = await render(
      <ZenProvider>
        <Box group mask width={100} height={100} data-testid="mask">
          <Shape type="rectangle" position="absolute" insetLeft={0} insetTop={0} width={100} height={50} rotation={90} flip="horizontal" radius="md" />
          <Box surface="subtle" position="absolute" insetLeft={0} insetTop={0} width={100} height={100} />
        </Box>
      </ZenProvider>,
    );
    await frame();
    const clip = (screen.getByTestId("mask").element() as HTMLElement).querySelector("clipPath path")!;
    // CSS turns clockwise: Figma's 90° (counter-clockwise) is rotate(-90), then the mirror, about the centre.
    expect(clip.getAttribute("transform")).toBe("translate(0 0) translate(50 25) rotate(-90) scale(-1 1) translate(-50 -25)");
    // A rectangle has no drawing: its box with its token corners, as arcs.
    expect(clip.getAttribute("d")).toMatch(/^M \d+(\.\d+)? 0 L .* A /);
  });

  it("draws no clip without mask", async () => {
    const screen = await render(
      <ZenProvider>
        <Box group width={100} height={100} data-testid="plain">
          <Shape type="ellipse" position="absolute" insetLeft={0} insetTop={0} width={100} height={100} />
        </Box>
      </ZenProvider>,
    );
    await frame();
    const box = screen.getByTestId("plain").element() as HTMLElement;
    expect(box.querySelector("clipPath")).toBeNull();
    expect(getComputedStyle(box).clipPath).toBe("none");
  });
});

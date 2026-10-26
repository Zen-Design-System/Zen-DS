/**
 * Zen Studio's Overlay frame (src/platform/studio/builder/proto/runtime.tsx): an overlay drawn open on the board is a
 * picture of it, so a modal there (a Side Panel, a Bottom Sheet) takes no focus as it renders. Its autofocus took the
 * focus from the Studio each time the page drew it again, and a menu open in the Pages panel closed (E2E PT-19, PT-27,
 * PT-28, 2026-10-27). Real browser (Chromium).
 */
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { BottomSheet } from "../../src/components/BottomSheet";
import { SidePanel } from "../../src/components/SidePanel";
import { ZenProvider } from "../../src/index";
import { Overlay } from "../../src/platform/studio/builder/proto/runtime";

describe("Studio Overlay frame: a modal drawn open takes no focus", () => {
  it("leaves the focus where it was when a modal Side Panel or Bottom Sheet renders in the frame", async () => {
    const screen = await render(
      <ZenProvider>
        <button type="button">Studio options</button>
        <div id="board" />
      </ZenProvider>,
    );
    const options = screen.getByRole("button", { name: "Studio options" }).element() as HTMLButtonElement;
    options.focus();
    expect(document.activeElement).toBe(options);
    await screen.rerender(
      <ZenProvider>
        <button type="button">Studio options</button>
        <Overlay id="details">
          <SidePanel type="modal" title="Order details" open onOpenChange={() => undefined}>Lines</SidePanel>
        </Overlay>
        <Overlay id="sort">
          <BottomSheet open title="Sort by" onOpenChange={() => undefined}>Newest first</BottomSheet>
        </Overlay>
      </ZenProvider>,
    );
    await expect.element(screen.getByRole("dialog", { name: "Order details" })).toBeVisible();
    await expect.element(screen.getByRole("dialog", { name: "Sort by" })).toBeInTheDocument();
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    expect(document.activeElement).toBe(options);
  });
});

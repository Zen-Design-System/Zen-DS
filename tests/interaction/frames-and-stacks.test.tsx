/**
 * Core rebuild M8 (the avatar test through a design copy) found two library slips:
 * - A modal SidePanel portalled to the page even inside a device or Studio frame (`[data-zen-overlay-root]`), so its
 *   scrim covered everything around the frame; it now opens in that frame, as Dialog does.
 * - AvatarStack handed its own attributes (data-*, aria-*, className…) to every avatar it draws and none to itself; they
 *   now go on its root, and the avatar props still reach each avatar.
 * Real browser (Chromium).
 */
import type { CSSProperties } from "react";
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { AvatarStack, SidePanel, ZenProvider } from "../../src/index";

describe("SidePanel (modal) inside a frame ([data-zen-overlay-root])", () => {
  const frame: CSSProperties = { position: "relative", width: 390, height: 600, overflow: "hidden" };

  it("opens in that frame, contained, not over the page", async () => {
    const screen = await render(
      <ZenProvider>
        <div data-zen-overlay-root="" data-testid="frame" style={frame}>
          <SidePanel type="modal" open onOpenChange={() => undefined} title="Filters">Body</SidePanel>
        </div>
      </ZenProvider>,
    );
    const panel = screen.getByRole("dialog", { name: "Filters" });
    await expect.element(panel).toBeVisible();
    const overlay = panel.element().closest(".zen-side-panel-overlay") as HTMLElement;
    expect(screen.getByTestId("frame").element().contains(overlay)).toBe(true);
    expect(overlay.dataset.contained).toBe("true");
    expect(getComputedStyle(overlay).position).toBe("absolute");
  });

  it("still opens over the page outside any frame", async () => {
    const screen = await render(<ZenProvider><SidePanel type="modal" open onOpenChange={() => undefined} title="Filters">Body</SidePanel></ZenProvider>);
    const panel = screen.getByRole("dialog", { name: "Filters" });
    await expect.element(panel).toBeVisible();
    const overlay = panel.element().closest(".zen-side-panel-overlay") as HTMLElement;
    expect(overlay.dataset.contained).toBeUndefined();
    expect(getComputedStyle(overlay).position).toBe("fixed");
  });
});

describe("AvatarStack: its own attributes on its root", () => {
  it("puts data-*, aria-* and className on the stack, avatar props on each avatar", async () => {
    const screen = await render(
      <ZenProvider>
        <AvatarStack data-testid="team" aria-label="Team" className="team-stack" theme="blue" items={[{ alt: "Ava Tran" }, { alt: "Bao Le" }]} />
      </ZenProvider>,
    );
    const stack = screen.getByTestId("team").element();
    expect(stack.classList.contains("zen-avatar-stack")).toBe(true);
    expect(stack.classList.contains("team-stack")).toBe(true);
    expect(stack.getAttribute("aria-label")).toBe("Team");
    const avatars = [...stack.querySelectorAll(".zen-avatar-stack__item")];
    expect(avatars).toHaveLength(2);
    expect(avatars.every((avatar) => !avatar.hasAttribute("data-testid") && avatar.getAttribute("aria-label") !== "Team" && !avatar.classList.contains("team-stack"))).toBe(true);
    expect(avatars.every((avatar) => avatar.getAttribute("data-tone") === "blue")).toBe(true);
  });
});

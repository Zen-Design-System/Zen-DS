/**
 * Keyboard focus stays visible and goes back where it came from — regressions found by the platform behaviour probes
 * (`npm run platform:behaviour`, 2026-09-28): a selected Popover option, an invalid field, the desktop Chat menus.
 */
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { userEvent } from "vitest/browser";
import { ChatMessage, ChatThread, InputField, Popover, ZenProvider, chatHoldActions } from "../../src/index";

describe("Popover: focus on a selected option", () => {
  it("draws the Focus/Accent ring, because the Selected fill equals the hover fill", async () => {
    const screen = await render(
      <ZenProvider>
        <Popover open autoFocus aria-label="Sort by" onOpenChange={() => undefined}
          items={[{ id: "name", label: "Name" }, { id: "updated", label: "Last updated", selected: true }, { id: "size", label: "Size" }]} />
      </ZenProvider>,
    );
    const selected = screen.getByRole("option", { name: "Last updated" });
    // Keyboard-opened popovers focus the selected option; arrow away and back so focus is keyboard (:focus-visible).
    await expect.element(selected).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}{ArrowUp}");
    await expect.element(selected).toHaveFocus();
    const style = getComputedStyle(selected.element());
    expect(style.outlineStyle).toBe("solid");
    expect(style.outlineWidth).toBe("3px");
  });
});

describe("InputField: focus on an invalid field", () => {
  it("keeps the error border and adds the 3px focus ring", async () => {
    const screen = await render(<ZenProvider><InputField label="Coupon" defaultValue="SUMMER" error="This code has expired." /></ZenProvider>);
    const control = screen.getByRole("textbox", { name: "Coupon" }).element().closest<HTMLElement>(".zen-input__control")!;
    const errorBorder = getComputedStyle(control, "::after").borderTopColor;
    expect(getComputedStyle(control).boxShadow).toBe("none");
    await userEvent.tab();
    await expect.element(screen.getByRole("textbox", { name: "Coupon" })).toHaveFocus();
    // The field fades its ring in (120ms box-shadow transition): wait for the end state.
    await vi.waitFor(() => expect(getComputedStyle(control).boxShadow).toMatch(/^\S.* 0px 0px 0px 3px$/));
    expect(getComputedStyle(control, "::after").borderTopColor).toBe(errorBorder);
  });
});

describe("ChatMessage (desktop): Escape returns focus to what opened the menu", () => {
  function Thread({ onAction }: { onAction: (id: string) => void }) {
    return (
      <ZenProvider>
        <ChatThread device="desktop">
          <ChatMessage side="others" author={{ name: "Ava Chen" }} time="09:41" holdActions={chatHoldActions.others} onHoldAction={onAction} onReact={vi.fn()}>Can you review the tokens today?</ChatMessage>
        </ChatThread>
      </ZenProvider>
    );
  }

  it("bubble menu → the bubble; React / More opened afterwards → their buttons", async () => {
    const screen = await render(<Thread onAction={vi.fn()} />);
    const bubble = document.querySelector<HTMLElement>(".zen-chat-message__content[data-menu='true']")!;
    const react = screen.getByRole("button", { name: "React" });
    const more = screen.getByRole("button", { name: "More actions" });

    // Enter on the focused bubble opens More; Escape hands focus back to the bubble.
    bubble.focus();
    await userEvent.keyboard("{Enter}");
    await expect.element(more).toHaveAttribute("aria-expanded", "true");
    await userEvent.keyboard("{Escape}");
    await vi.waitFor(() => expect(document.activeElement).toBe(bubble));

    // The bubble opening used to stick: every later React / More menu then sent focus to the bubble too. Opened with
    // Enter, a menu takes focus; Escape closes it and focus is back on its button.
    for (const trigger of [react, more]) {
      trigger.element().focus();
      await userEvent.keyboard("{Enter}");
      await expect.element(trigger).toHaveAttribute("aria-expanded", "true");
      await vi.waitFor(() => expect(document.querySelector(".zen-popover")?.contains(document.activeElement)).toBe(true));
      await userEvent.keyboard("{Escape}");
      await expect.element(trigger).toHaveAttribute("aria-expanded", "false");
      await vi.waitFor(() => expect(document.activeElement).toBe(trigger.element()));
    }

    // And the bubble's own menu still returns to the bubble.
    bubble.focus();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard("{Escape}");
    await expect.element(more).toHaveAttribute("aria-expanded", "false");
    await vi.waitFor(() => expect(document.activeElement).toBe(bubble));
  });

  it("a menu opened with the mouse closes on Escape while focus is still on its button", async () => {
    const screen = await render(<Thread onAction={vi.fn()} />);
    const more = screen.getByRole("button", { name: "More actions" });
    // The hover toolbar takes pointer events once the message is hovered.
    await userEvent.hover(screen.getByText("Can you review the tokens today?"));
    await more.click();
    await expect.element(more).toHaveAttribute("aria-expanded", "true");
    more.element().focus();
    await userEvent.keyboard("{Escape}");
    await expect.element(more).toHaveAttribute("aria-expanded", "false");
    expect(document.activeElement).toBe(more.element());
  });
});

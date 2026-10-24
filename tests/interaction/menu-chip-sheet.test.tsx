/**
 * Menu and Chip on a phone (user 2026-10-24, option A: the rule SelectField follows): a Menu's entries open in an
 * action Bottom Sheet (Sheet-Actions rows, captions, group labels), a Chip's popoverItems in a Bottom Sheet List; on
 * desktop both keep their popovers.
 */
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { Chip, IconButton, Menu, ZenProvider, type MenuEntry } from "../../src/index";

const entries: MenuEntry[] = [
  { id: "duplicate", label: "Duplicate", icon: "icon-copy-line", shortcut: "⌘D" },
  { id: "share", label: "Share link", caption: "Anyone with the link can view" },
  { type: "group", label: "Move", items: [{ id: "archive", label: "Archive" }, { id: "locked", label: "Transfer", disabled: true }] },
  { type: "separator" },
  { id: "delete", label: "Delete", danger: true },
];

const statuses = [
  { id: "open", label: "Open" },
  { id: "done", label: "Done" },
  { id: "blocked", label: "Blocked", disabled: true },
];

describe("Menu on a phone", () => {
  it("opens an action Bottom Sheet titled by the trigger, chooses, closes and gives the focus back", async () => {
    const onSelect = vi.fn();
    const onOpenChange = vi.fn();
    const onDuplicate = vi.fn();
    const items = entries.map((entry) => (entry.type === undefined && entry.id === "duplicate" ? { ...entry, onSelect: onDuplicate } : entry));
    const screen = await render(<ZenProvider breakpoint="mobile">
      <Menu trigger={<IconButton aria-label="Actions for Invoice 1024" icon="icon-dots-horizontal-line" />} items={items} onSelect={onSelect} onOpenChange={onOpenChange} />
    </ZenProvider>);
    const trigger = screen.getByRole("button", { name: "Actions for Invoice 1024" });
    await expect.element(trigger).toHaveAttribute("aria-haspopup", "dialog");
    await trigger.click();
    const sheet = screen.getByRole("dialog", { name: "Actions for Invoice 1024" });
    await expect.element(sheet).toBeVisible();
    expect(screen.getByRole("menu").elements()).toHaveLength(0);
    // The caption is the row's Subtext, the group is named by its label, a disabled item stays a disabled button.
    await expect.element(sheet.getByText("Anyone with the link can view")).toBeVisible();
    await expect.element(sheet.getByRole("group", { name: "Move" })).toBeVisible();
    await expect.element(sheet.getByRole("button", { name: "Transfer" })).toBeDisabled();
    // No keyboard shortcut on a phone.
    expect(sheet.getByText("⌘D").elements()).toHaveLength(0);
    await sheet.getByRole("button", { name: "Duplicate" }).click();
    expect(onDuplicate).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "duplicate" }));
    expect(onOpenChange.mock.calls.map(([open]) => open)).toEqual([true, false]);
    await expect.poll(() => screen.getByRole("dialog").elements().length).toBe(0);
    await expect.element(trigger).toHaveFocus();
  });

  it("opens from the keyboard on the first item; the arrows move, Escape closes", async () => {
    const screen = await render(<ZenProvider breakpoint="mobile">
      <Menu aria-label="Invoice actions" trigger={<IconButton aria-label="More" icon="icon-dots-horizontal-line" />} items={entries} />
    </ZenProvider>);
    const trigger = screen.getByRole("button", { name: "More" });
    (trigger.element() as HTMLElement).focus();
    await userEvent.keyboard("{ArrowDown}");
    const sheet = screen.getByRole("dialog", { name: "Invoice actions" });
    await expect.element(sheet.getByRole("button", { name: "Duplicate" })).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    await expect.element(sheet.getByRole("button", { name: /Share link/ })).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    await expect.poll(() => screen.getByRole("dialog").elements().length).toBe(0);
    await expect.element(trigger).toHaveFocus();
  });

  it("keeps the popover menu on desktop", async () => {
    const screen = await render(<ZenProvider breakpoint="desktop">
      <Menu trigger={<IconButton aria-label="More" icon="icon-dots-horizontal-line" />} items={entries} />
    </ZenProvider>);
    const trigger = screen.getByRole("button", { name: "More" });
    await expect.element(trigger).toHaveAttribute("aria-haspopup", "menu");
    await trigger.click();
    await expect.element(screen.getByRole("menu")).toBeVisible();
    expect(screen.getByRole("dialog").elements()).toHaveLength(0);
  });

  it("follows a phone frame's data-breakpoint and opens in that frame", async () => {
    const screen = await render(<ZenProvider breakpoint="desktop"><div data-zen-overlay-root="" data-breakpoint="mobile" data-testid="phone" style={{ position: "relative", width: 320, height: 560 }}>
      <Menu trigger={<IconButton aria-label="More" icon="icon-dots-horizontal-line" />} items={entries} />
    </div></ZenProvider>);
    await screen.getByRole("button", { name: "More" }).click();
    const sheet = screen.getByRole("dialog", { name: "More" });
    await expect.element(sheet).toBeVisible();
    expect((sheet.element() as HTMLElement).closest("[data-testid='phone']")).not.toBeNull();
  });
});

describe("Chip popoverItems on a phone", () => {
  it("opens a Bottom Sheet titled by popoverLabel; a pick closes it and the chip shows it", async () => {
    const screen = await render(<ZenProvider breakpoint="mobile">
      <Chip variant="advanced" popoverLabel="Status" popoverItems={statuses}>Status</Chip>
    </ZenProvider>);
    const chip = screen.getByRole("button", { name: "Status" });
    await expect.element(chip).toHaveAttribute("aria-haspopup", "dialog");
    await chip.click();
    const sheet = screen.getByRole("dialog", { name: "Status" });
    await expect.element(sheet).toBeVisible();
    // A disabled item is not a button.
    expect(sheet.getByRole("button", { name: "Blocked" }).elements()).toHaveLength(0);
    await sheet.getByRole("button", { name: "Done" }).click();
    await expect.poll(() => screen.getByRole("dialog").elements().length).toBe(0);
    const picked = screen.getByRole("button", { name: "Done" });
    await expect.element(picked).toHaveFocus();
    await picked.click();
    await expect.element(screen.getByRole("dialog").getByRole("button", { name: "Done" })).toHaveAttribute("aria-current", "true");
  });

  it("keeps the sheet open for several picks until Done, and filters with its Search", async () => {
    const onPopoverSelect = vi.fn();
    const screen = await render(<ZenProvider breakpoint="mobile">
      <Chip variant="advanced" popoverLabel="Assignee" popoverMultiple popoverSearch onPopoverSelect={onPopoverSelect}
        popoverItems={[{ id: "an", label: "An" }, { id: "binh", label: "Binh" }, { id: "chi", label: "Chi" }]}>Assignee</Chip>
    </ZenProvider>);
    await screen.getByRole("button", { name: "Assignee" }).click();
    const sheet = screen.getByRole("dialog", { name: "Assignee" });
    await sheet.getByRole("button", { name: "An" }).click();
    await sheet.getByRole("button", { name: "Binh" }).click();
    expect(onPopoverSelect.mock.calls.map(([item]) => item.id)).toEqual(["an", "binh"]);
    await expect.element(sheet).toBeVisible();
    await userEvent.type(sheet.getByRole("searchbox"), "ch");
    await expect.element(sheet.getByRole("button", { name: "Chi" })).toBeVisible();
    expect(sheet.getByRole("button", { name: "An" }).elements()).toHaveLength(0);
    await sheet.getByRole("button", { name: "Done" }).click();
    await expect.poll(() => screen.getByRole("dialog").elements().length).toBe(0);
  });

  it("keeps the Popover listbox on desktop", async () => {
    const screen = await render(<ZenProvider breakpoint="desktop">
      <Chip variant="advanced" popoverLabel="Status" popoverItems={statuses}>Status</Chip>
    </ZenProvider>);
    const chip = screen.getByRole("button", { name: "Status" });
    await expect.element(chip).toHaveAttribute("aria-haspopup", "listbox");
    await chip.click();
    await expect.element(screen.getByRole("listbox")).toBeVisible();
    expect(screen.getByRole("dialog").elements()).toHaveLength(0);
  });
});

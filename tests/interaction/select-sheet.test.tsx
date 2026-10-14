/**
 * SelectField on mobile: the options open in a Bottom Sheet (List of ListItems, the picked one selected with a check);
 * on desktop they stay in the Popover listbox.
 */
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { SelectField, ZenProvider } from "../../src/index";

const roles = [
  { value: "viewer", label: "Viewer" },
  { value: "editor", label: "Editor" },
  { value: "owner", label: "Owner", disabled: true },
];

describe("SelectField on mobile", () => {
  it("opens a Bottom Sheet, picks, closes and gives the focus back", async () => {
    const onValueChange = vi.fn();
    const screen = await render(<ZenProvider breakpoint="mobile"><SelectField label="Role" options={roles} defaultValue="viewer" onValueChange={onValueChange} /></ZenProvider>);
    const trigger = screen.getByRole("button", { name: /Role/ });
    await expect.element(trigger).toHaveAttribute("aria-haspopup", "dialog");
    await trigger.click();
    const sheet = screen.getByRole("dialog", { name: "Role" });
    await expect.element(sheet).toBeVisible();
    await expect.element(sheet.getByRole("button", { name: "Viewer" })).toHaveAttribute("aria-current", "true");
    // A disabled option is not a button.
    expect(sheet.getByRole("button", { name: "Owner" }).elements()).toHaveLength(0);
    await sheet.getByRole("button", { name: "Editor" }).click();
    expect(onValueChange).toHaveBeenCalledWith("editor", roles[1]);
    await expect.poll(() => screen.getByRole("dialog").elements().length).toBe(0);
    await expect.element(trigger).toHaveTextContent("Editor");
    await expect.element(trigger).toHaveFocus();
  });

  it("keeps the Popover listbox on desktop", async () => {
    const screen = await render(<ZenProvider breakpoint="desktop"><SelectField label="Role" options={roles} defaultValue="viewer" /></ZenProvider>);
    const trigger = screen.getByRole("button", { name: /Role/ });
    await expect.element(trigger).toHaveAttribute("aria-haspopup", "listbox");
    await trigger.click();
    await expect.element(screen.getByRole("listbox")).toBeVisible();
    expect(screen.getByRole("dialog").elements()).toHaveLength(0);
  });
});

describe("BottomSheet in a device frame", () => {
  it("opens inside the nearest [data-zen-overlay-root] (a phone preview), not on the page", async () => {
    const screen = await render(<ZenProvider><div data-zen-overlay-root="" data-breakpoint="mobile" data-testid="phone" style={{ position: "relative", width: 320, height: 560 }}>
      <SelectField label="Deliver to" options={roles} defaultValue="viewer" />
    </div></ZenProvider>);
    await screen.getByRole("button", { name: /Deliver to/ }).click();
    const sheet = screen.getByRole("dialog", { name: "Deliver to" });
    await expect.element(sheet).toBeVisible();
    expect((sheet.element() as HTMLElement).closest("[data-testid='phone']")).not.toBeNull();
  });
});

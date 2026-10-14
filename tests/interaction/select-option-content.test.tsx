/**
 * SelectField options carry Figma's Popover Item content (.Primitives/Popover/Item/Content: Theme, Icon-Src, Subtext;
 * 2026-10-09): the open list draws an icon, a picture or a Badge and a second line; the field itself shows the label.
 */
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { userEvent } from "vitest/browser";
import { SelectField, ZenProvider } from "../../src/index";

/** The field's button (named by its label and value, as a native select). */
const trigger = (container: HTMLElement) => container.querySelector<HTMLButtonElement>(".zen-select__trigger")!;

const options = [
  { label: "Annual leave", value: "annual", leading: "icon-plane-line" as const, caption: "5 days left" },
  { label: "Bao Nguyen", value: "bao", theme: "avatar-small" as const, photoSrc: "data:image/gif;base64,R0lGODlhAQABAAAAACw=", caption: "Design lead" },
  { label: "Urgent", value: "urgent", theme: "badge" as const, badgeTheme: "red" as const },
  { label: "Plain", value: "plain" },
];

describe("SelectField › option content", () => {
  it("draws each option's Popover Item content in the list", async () => {
    const screen = await render(<ZenProvider><SelectField label="Type" placeholder="Select type" options={options} /></ZenProvider>);
    await userEvent.click(trigger(screen.container));
    const row = (name: string) => screen.getByRole("option", { name: new RegExp(name) }).element();
    await expect.element(screen.getByRole("option", { name: /Annual leave/ })).toBeVisible();
    expect(row("Annual leave").querySelector(".zen-popover__item-leading .zen-icon")).not.toBeNull();
    expect(row("Annual leave").querySelector(".zen-popover__item-caption")?.textContent).toBe("5 days left");
    expect(row("Bao Nguyen").querySelector(".zen-popover__item-leading .zen-avatar")).not.toBeNull();
    expect(row("Urgent").querySelector(".zen-popover__item-content--badge .zen-badge")).not.toBeNull();
    expect(row("Plain").querySelector(".zen-popover__item-leading")).toBeNull();
  });

  it("shows only the label in the field once picked", async () => {
    const screen = await render(<ZenProvider><SelectField label="Type" placeholder="Select type" options={options} /></ZenProvider>);
    await userEvent.click(trigger(screen.container));
    await userEvent.click(screen.getByRole("option", { name: /Annual leave/ }));
    await expect.poll(() => trigger(screen.container).textContent).toContain("Annual leave");
    expect(trigger(screen.container).textContent).not.toContain("5 days left");
  });
});

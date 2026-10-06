/**
 * DateField as an APG Date Picker Combobox (2026-10-02): the field is role=combobox with aria-haspopup="dialog" and
 * aria-expanded; ArrowDown (or Alt+ArrowDown) opens the calendar and moves focus into its grid, and Escape closes it
 * with focus back on the field.
 */
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { userEvent } from "vitest/browser";
import { DateField, ZenProvider } from "../../src/index";

const nextFrames = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve))));

describe("DateField combobox", () => {
  it("announces its calendar popup and whether it is open", async () => {
    await render(<ZenProvider><DateField label="Due date" /></ZenProvider>);
    const field = document.querySelector<HTMLInputElement>(".zen-input__native")!;
    expect(field.getAttribute("role")).toBe("combobox");
    expect(field.getAttribute("aria-haspopup")).toBe("dialog");
    expect(field.getAttribute("aria-expanded")).toBe("false");
  });

  it("ArrowDown opens the calendar and focuses the selected day; Escape returns to the field", async () => {
    await render(<ZenProvider><DateField label="Due date" defaultValue="10/12/2026" /></ZenProvider>);
    const field = document.querySelector<HTMLInputElement>(".zen-input__native")!;
    field.focus();
    await userEvent.keyboard("{ArrowDown}");
    await nextFrames();
    expect(field.getAttribute("aria-expanded")).toBe("true");
    const active = document.activeElement as HTMLElement;
    expect(active.classList.contains("zen-date-picker__day")).toBe(true);
    expect(active.getAttribute("data-state")).toBe("single-selected");
    expect(active.textContent?.trim()).toBe("12");
    await userEvent.keyboard("{Escape}");
    await nextFrames();
    expect(field.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(field);
  });

  it("a read-only field does not open on ArrowDown", async () => {
    await render(<ZenProvider><DateField label="Start date" readOnly defaultValue="10/12/2026" /></ZenProvider>);
    const field = document.querySelector<HTMLInputElement>(".zen-input__native")!;
    field.focus();
    await userEvent.keyboard("{ArrowDown}");
    await nextFrames();
    expect(document.querySelector(".zen-date-picker__day")).toBeNull();
    expect(document.activeElement).toBe(field);
  });
});

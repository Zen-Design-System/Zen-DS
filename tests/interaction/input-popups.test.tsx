/**
 * Input family and DatePicker popups (approved fixes of 2026-10-01): Escape closes only the field's own popup inside a
 * Dialog, read-only fields show a focus ring, AutocompleteField offers Create only for new values, and the DatePicker's
 * `today`, full-date day names, DateField forwarding and inline surface. Real browser (Chromium).
 */
import { useState, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import { AutocompleteField, DateField, DatePicker, Dialog, InputField, InputLeadingTrailing, NumberField, SelectField, TextAreaField, ZenProvider } from "../../src/index";

/** A Dialog that reports whether it is still open. */
function InDialog({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <ZenProvider>
      <Dialog open={open} onOpenChange={setOpen} title="Edit employee" primaryAction={{ label: "Save" }} secondaryAction={{ label: "Cancel" }}>{children}</Dialog>
      <output data-testid="dialog-state">{open ? "open" : "closed"}</output>
    </ZenProvider>
  );
}
const dialogState = () => document.querySelector("[data-testid='dialog-state']")?.textContent;
const query = <T extends Element = HTMLElement>(selector: string) => document.querySelector<T>(selector);

const roles = [{ label: "Admin", value: "admin" }, { label: "Editor", value: "editor" }, { label: "Viewer", value: "viewer" }];
const codes = [{ value: "+84", label: "+84" }, { value: "+1", label: "+1" }];
const teams = [{ id: "design", label: "Design" }, { id: "research", label: "Research" }, { id: "sales", label: "Sales" }];

function PhoneField() {
  const [code, setCode] = useState("+84");
  return <InputField label="Phone" leading={<InputLeadingTrailing label={code} options={codes} value={code} onValueChange={setCode} popoverLabel="Country code" />} />;
}

describe("Escape closes only the field's popup, never its Dialog", () => {
  it("SelectField: a keyboard-opened list closes, focus returns to the trigger, the Dialog stays open", async () => {
    await render(<InDialog><SelectField label="Role" options={roles} /></InDialog>);
    const trigger = query<HTMLButtonElement>(".zen-select__trigger")!;
    trigger.focus();
    await userEvent.keyboard("{ArrowDown}");
    await expect.poll(() => trigger.getAttribute("aria-expanded")).toBe("true");
    await expect.poll(() => document.activeElement?.getAttribute("role")).toBe("option");
    await userEvent.keyboard("{Escape}");
    await expect.poll(() => trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
    expect(dialogState()).toBe("open");
    // Closed, Escape is the Dialog's again.
    await userEvent.keyboard("{Escape}");
    await expect.poll(dialogState).toBe("closed");
  });

  it("SelectField: a mouse-opened list (focus still on the trigger) closes on Escape", async () => {
    await render(<InDialog><SelectField label="Role" options={roles} /></InDialog>);
    const trigger = query<HTMLButtonElement>(".zen-select__trigger")!;
    await userEvent.click(trigger);
    await expect.poll(() => trigger.getAttribute("aria-expanded")).toBe("true");
    expect(document.activeElement).toBe(trigger);
    await userEvent.keyboard("{Escape}");
    await expect.poll(() => trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
    expect(dialogState()).toBe("open");
  });

  it("DateField: Escape on the input closes the calendar it opened on a click", async () => {
    await render(<InDialog><DateField label="Start date" today={new Date(2026, 8, 30)} /></InDialog>);
    const input = query<HTMLInputElement>(".zen-date-field input")!;
    // The calendar opens on a person's click or Tab, not on a script's focus (input-date-autocomplete-popover.test.tsx).
    await userEvent.click(input);
    await expect.poll(() => query(".zen-date-picker")).not.toBeNull();
    await userEvent.keyboard("{Escape}");
    await expect.poll(() => query(".zen-date-picker")).toBeNull();
    expect(document.activeElement).toBe(input);
    expect(dialogState()).toBe("open");
  });

  it("DateField: Escape on a day closes the calendar and returns focus to the input, not to the label's tooltip", async () => {
    await render(<InDialog><DateField label="Start date" labelTooltip="When the contract starts" today={new Date(2026, 8, 30)} /></InDialog>);
    const input = query<HTMLInputElement>(".zen-date-field input")!;
    await userEvent.click(input);
    await expect.poll(() => query(".zen-date-picker")).not.toBeNull();
    query<HTMLButtonElement>(".zen-date-picker__day[aria-label='Tuesday, September 15, 2026']")!.focus();
    await userEvent.keyboard("{Escape}");
    await expect.poll(() => query(".zen-date-picker")).toBeNull();
    expect(document.activeElement).toBe(input);
    expect(dialogState()).toBe("open");
  });

  it("DateField: Escape in Select-Month-Year steps back to the days, and the Dialog stays open", async () => {
    await render(<InDialog><DateField label="Start date" today={new Date(2026, 8, 30)} /></InDialog>);
    await userEvent.click(query<HTMLInputElement>(".zen-date-field input")!);
    await expect.poll(() => query(".zen-date-picker")).not.toBeNull();
    query<HTMLButtonElement>("button.zen-date-picker__month")!.focus();
    await userEvent.keyboard("{Enter}");
    await expect.poll(() => query(".zen-date-picker")?.getAttribute("data-view")).toBe("month-year");
    await userEvent.keyboard("{Escape}");
    await expect.poll(() => query(".zen-date-picker")?.getAttribute("data-view")).toBe("days");
    expect(dialogState()).toBe("open");
  });

  it("InputLeadingTrailing picker: Escape in the list closes it and focuses the picker button", async () => {
    await render(<InDialog><PhoneField /></InDialog>);
    const picker = query<HTMLButtonElement>(".zen-input-leading-trailing__picker > button")!;
    await userEvent.click(picker);
    await expect.poll(() => picker.getAttribute("aria-expanded")).toBe("true");
    await expect.poll(() => document.activeElement?.getAttribute("role")).toBe("option");
    await userEvent.keyboard("{Escape}");
    await expect.poll(() => picker.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(picker);
    expect(dialogState()).toBe("open");
  });

  it("InputLeadingTrailing picker: Escape on its button while open closes the list only", async () => {
    await render(<InDialog><PhoneField /></InDialog>);
    const picker = query<HTMLButtonElement>(".zen-input-leading-trailing__picker > button")!;
    await userEvent.click(picker);
    await expect.poll(() => picker.getAttribute("aria-expanded")).toBe("true");
    picker.focus();
    await userEvent.keyboard("{Escape}");
    await expect.poll(() => picker.getAttribute("aria-expanded")).toBe("false");
    expect(dialogState()).toBe("open");
  });

  it("AutocompleteField: Escape in the search closes the list and focuses Add Item", async () => {
    const screen = await render(<InDialog><AutocompleteField label="Teams" options={teams} /></InDialog>);
    const add = screen.getByRole("button", { name: "Add Item" });
    await add.click();
    await expect.poll(() => add.element().getAttribute("aria-expanded")).toBe("true");
    await expect.poll(() => document.activeElement?.tagName).toBe("INPUT");
    await userEvent.keyboard("{Escape}");
    await expect.poll(() => add.element().getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(add.element());
    expect(dialogState()).toBe("open");
  });

  it("AutocompleteField with onCreate: Escape on Add Item while open closes the list only", async () => {
    const screen = await render(<InDialog><AutocompleteField label="Teams" options={teams} onCreate={() => undefined} /></InDialog>);
    const add = screen.getByRole("button", { name: "Add Item" });
    await add.click();
    await expect.poll(() => add.element().getAttribute("aria-expanded")).toBe("true");
    (add.element() as HTMLElement).focus();
    await userEvent.keyboard("{Escape}");
    await expect.poll(() => add.element().getAttribute("aria-expanded")).toBe("false");
    expect(dialogState()).toBe("open");
  });

  it("an inline DatePicker on its day view lets Escape through to the Dialog", async () => {
    await render(<InDialog><DatePicker today={new Date(2026, 8, 30)} /></InDialog>);
    query<HTMLButtonElement>(".zen-date-picker__day[aria-label='Tuesday, September 15, 2026']")!.focus();
    await userEvent.keyboard("{Escape}");
    await expect.poll(dialogState).toBe("closed");
  });
});

describe("Read-only fields show the Focused ring and keep the dashed border", () => {
  const ring = (control: Element) => getComputedStyle(control).boxShadow;
  const dash = (control: Element) => getComputedStyle(control.querySelector(".zen-input__dash rect")!).stroke;

  it("matches the focused editable field's 3px ring, and the dashes take the focus colour", async () => {
    await render(
      <ZenProvider>
        <InputField label="Editable" defaultValue="E-1024" data-testid="editable" />
        <InputField label="Employee ID" value="E-1024" readOnly data-testid="ro-input" />
        <TextAreaField label="Notes" value="Joined in 2024." readOnly data-testid="ro-textarea" />
        <NumberField label="Seats" value={4} readOnly data-testid="ro-number" />
        <DateField label="Start date" value="09/30/2026" readOnly data-testid="ro-date" />
        <SelectField label="Role" options={roles} readOnly />
      </ZenProvider>,
    );
    const controlOf = (node: Element) => node.closest(".zen-input__control")!;
    const editable = query("[data-testid='editable']")!;
    editable.focus();
    const focusedRing = ring(controlOf(editable));
    expect(focusedRing).toContain("3px");
    const focusColour = getComputedStyle(controlOf(editable), "::after").borderTopColor;
    const targets = [query("[data-testid='ro-input']")!, query("[data-testid='ro-textarea']")!, query("[data-testid='ro-number']")!, query("[data-testid='ro-date']")!, query(".zen-select__trigger")!];
    for (const target of targets) {
      const control = controlOf(target);
      expect(control.closest(".zen-input-field")?.getAttribute("data-state")).toBe("read-only");
      const restingDash = dash(control);
      expect(ring(control)).not.toContain("3px");
      target.focus();
      expect(document.activeElement).toBe(target);
      expect(ring(control)).toBe(focusedRing);
      // Still dashed (the Read-Only SVG stays), now in Color/Focus/Neutral/Solid like the Focused border.
      expect(getComputedStyle(control.querySelector(".zen-input__dash rect")!).strokeDasharray).toBe("2px, 2px");
      expect(dash(control)).toBe(focusColour);
      expect(dash(control)).not.toBe(restingDash);
    }
    // The read-only DateField does not open its calendar on focus.
    expect(query(".zen-date-picker")).toBeNull();
  });
});

describe("AutocompleteField: Create only for a new value", () => {
  it("hides Create when the typed value is an already selected option, and lists that option as selected", async () => {
    const screen = await render(<ZenProvider><AutocompleteField label="Teams" options={teams} defaultValue={["design"]} onCreate={() => undefined} /></ZenProvider>);
    await screen.getByRole("button", { name: "Add Item" }).click();
    await expect.poll(() => document.activeElement?.tagName).toBe("INPUT");
    await userEvent.keyboard("design");
    const listbox = screen.getByRole("listbox");
    await expect.element(listbox.getByRole("option", { name: "Design" })).toHaveAttribute("aria-selected", "true");
    await expect.element(listbox.getByRole("option", { name: "Design" })).toBeDisabled();
    expect(document.querySelector(".zen-popover__item[data-function='manual-add-new']")).toBeNull();
    // A value that is not an option yet still offers Create.
    await userEvent.keyboard("{Backspace}");
    await expect.poll(() => document.querySelector(".zen-popover__item[data-function='manual-add-new']")?.textContent).toContain("desig");
    // Selected options stay out of the list otherwise.
    expect(document.querySelector(".zen-popover__item.is-selected")).toBeNull();
  });
});

describe("DatePicker: today, day names, DateField forwarding, inline surface", () => {
  it("today sets the Today ring and the opening month; days are named with the full date", async () => {
    const screen = await render(<ZenProvider><DatePicker today={new Date(2026, 8, 30)} /></ZenProvider>);
    await expect.element(screen.getByRole("button", { name: "September 2026, choose month and year" })).toBeVisible();
    const todayDays = [...document.querySelectorAll(".zen-date-picker__day[data-state='today']")];
    expect(todayDays.map((day) => day.getAttribute("aria-label"))).toEqual(["Wednesday, September 30, 2026"]);
    await expect.element(screen.getByRole("button", { name: "Saturday, September 5, 2026" })).toBeVisible();
    expect(document.querySelector(".zen-date-picker__day[aria-label^='Day ']")).toBeNull();
  });

  it("names days in the provider's locale", async () => {
    await render(<ZenProvider locale="vi"><DatePicker today={new Date(2026, 8, 30)} /></ZenProvider>);
    const expected = new Intl.DateTimeFormat("vi", { weekday: "long", year: "numeric", month: "long", day: "numeric" }).format(new Date(2026, 8, 30));
    expect(document.querySelector(".zen-date-picker__day[data-state='today']")?.getAttribute("aria-label")).toBe(expected);
  });

  it("DateField forwards minDate, maxDate and today to its calendar", async () => {
    await render(<ZenProvider><DateField label="Start date" today={new Date(2026, 8, 30)} minDate={new Date(2026, 8, 10)} maxDate={new Date(2026, 9, 20)} /></ZenProvider>);
    await userEvent.click(query<HTMLInputElement>(".zen-date-field input")!);
    await expect.poll(() => query(".zen-date-picker")).not.toBeNull();
    expect(query(".zen-date-picker__day[data-state='today']")?.getAttribute("aria-label")).toBe("Wednesday, September 30, 2026");
    expect(query<HTMLButtonElement>(".zen-date-picker__day[aria-label='Saturday, September 5, 2026']")!.disabled).toBe(true);
    expect(query<HTMLButtonElement>(".zen-date-picker__day[aria-label='Thursday, September 10, 2026']")!.disabled).toBe(false);
    // No stray props on the native input.
    const input = query<HTMLInputElement>(".zen-date-field input")!;
    expect(input.hasAttribute("mindate") || input.hasAttribute("today")).toBe(false);
  });

  it("an inline calendar has no popover surface; the popover calendar keeps Effect/Popover", async () => {
    await render(<ZenProvider><DatePicker today={new Date(2026, 8, 30)} /><DateField label="Start date" today={new Date(2026, 8, 30)} /></ZenProvider>);
    const inline = query(".zen-date-picker")!;
    expect(inline.getAttribute("data-placement")).toBe("inline");
    const inlineStyle = getComputedStyle(inline);
    expect(inlineStyle.boxShadow).toBe("none");
    expect(inlineStyle.position).not.toBe("absolute");
    expect(inlineStyle.backgroundColor).toBe("rgba(0, 0, 0, 0)");
    await userEvent.click(query<HTMLInputElement>(".zen-date-field input")!);
    await expect.poll(() => query(".zen-date-field .zen-date-picker")).not.toBeNull();
    const popover = query(".zen-date-field .zen-date-picker")!;
    expect(popover.getAttribute("data-placement")).toBe("popover");
    expect(getComputedStyle(popover).boxShadow).not.toBe("none");
    expect(getComputedStyle(popover).position).toBe("absolute");
  });
});

describe("SelectField names and the calendar's opening month (backlog batch 4, 2026-10-05)", () => {
  it("names the SelectField trigger by its label (or aria-label) and its value, as a native select", async () => {
    await render(<ZenProvider><SelectField label="Role" options={roles} defaultValue="editor" /><SelectField aria-label="Text style" options={roles} defaultValue="viewer" /></ZenProvider>);
    await expect.element(page.getByRole("button", { name: "Role Editor" })).toBeVisible();
    await expect.element(page.getByRole("button", { name: "Text style Viewer" })).toBeVisible();
  });

  it("DateField opens its calendar on the month of a date typed while it was closed", async () => {
    await render(<ZenProvider><DateField label="Start date" today={new Date(2026, 8, 30)} /></ZenProvider>);
    const input = query<HTMLInputElement>(".zen-date-field input")!;
    await userEvent.click(input);
    await expect.element(page.getByRole("button", { name: "September 2026, choose month and year" })).toBeVisible();
    await userEvent.keyboard("{Escape}");
    await expect.poll(() => query(".zen-date-field .zen-date-picker")).toBeNull();
    await userEvent.fill(input, "03/15/2027");
    await userEvent.click(input);
    await expect.element(page.getByRole("button", { name: "March 2027, choose month and year" })).toBeVisible();
  });
});

describe("DateField draft picks (backlog batch 5, 2026-10-05)", () => {
  it("DateField with datePickerActions: a pick is a draft, Submit writes it, Cancel keeps the field's date", async () => {
    await render(<ZenProvider><DateField label="Start date" today={new Date(2026, 8, 30)} datePickerActions /></ZenProvider>);
    const input = query<HTMLInputElement>(".zen-date-field input")!;
    await userEvent.click(input);
    await userEvent.click(page.getByRole("button", { name: "Thursday, September 10, 2026" }));
    expect(input.value).toBe("");
    await userEvent.click(page.getByRole("button", { name: "Submit" }));
    await expect.poll(() => input.value).toBe("09/10/2026");
    await expect.poll(() => query(".zen-date-field .zen-date-picker")).toBeNull();
    await userEvent.click(input);
    await userEvent.click(page.getByRole("button", { name: "Friday, September 18, 2026" }));
    await userEvent.click(page.getByRole("button", { name: "Cancel" }));
    await expect.poll(() => query(".zen-date-field .zen-date-picker")).toBeNull();
    expect(input.value).toBe("09/10/2026");
  });

});
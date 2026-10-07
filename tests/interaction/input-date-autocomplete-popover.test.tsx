/**
 * Approved backlog fixes of 2026-10-02 (group b4): DateField opens its calendar on a person's Tab or click, never on a
 * script's focus, and marks a typed date outside minDate / maxDate aria-invalid; the inline DatePicker is a named group
 * with Today as aria-current="date"; AutocompleteField keeps focus in the field after a Tag is removed; Popover uses up
 * the Escape that closes it. Real browser (Chromium).
 */
import { useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { userEvent } from "vitest/browser";
import { AutocompleteField, Button, DateField, DatePicker, Form, Popover, ZenProvider, focusFirstInvalidField } from "../../src/index";

const query = <T extends Element = HTMLElement>(selector: string) => document.querySelector<T>(selector);
const nextFrames = () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 30))));
const today = new Date(2026, 8, 30);

describe("DateField: the calendar opens on a person's Tab or click only", () => {
  it("opens when Tab lands on the input", async () => {
    const screen = await render(<ZenProvider><Button level="tertiary">Before</Button><DateField label="Start date" today={today} /></ZenProvider>);
    (screen.getByRole("button", { name: "Before" }).element() as HTMLElement).focus();
    await userEvent.tab();
    expect(document.activeElement).toBe(query(".zen-date-field input"));
    await expect.poll(() => query(".zen-date-field .zen-date-picker")).not.toBeNull();
  });

  it("opens on a click in the input and on a click on its label", async () => {
    const screen = await render(<ZenProvider><DateField label="Start date" today={today} /></ZenProvider>);
    await userEvent.click(query(".zen-date-field input")!);
    await expect.poll(() => query(".zen-date-field .zen-date-picker")).not.toBeNull();
    await userEvent.keyboard("{Escape}");
    await expect.poll(() => query(".zen-date-picker")).toBeNull();
    (document.activeElement as HTMLElement | null)?.blur();
    await screen.getByText("Start date").click();
    await expect.poll(() => query(".zen-date-field .zen-date-picker")).not.toBeNull();
  });

  it("stays closed when a script focuses the input", async () => {
    await render(<ZenProvider><DateField label="Start date" today={today} /></ZenProvider>);
    const input = query<HTMLInputElement>(".zen-date-field input")!;
    input.focus();
    await nextFrames();
    expect(document.activeElement).toBe(input);
    expect(query(".zen-date-picker")).toBeNull();
  });

  it("a blocked Form submit focuses the empty date field without popping the calendar over the form", async () => {
    function LeaveForm() {
      const [error, setError] = useState<string>();
      return (
        <Form onSubmit={() => setError("Choose the first day of leave.")}>
          <DateField label="First day" today={today} error={error} />
          <Button type="submit" level="primary">Request leave</Button>
        </Form>
      );
    }
    const screen = await render(<ZenProvider><LeaveForm /></ZenProvider>);
    await screen.getByRole("button", { name: "Request leave" }).click();
    const input = query<HTMLInputElement>(".zen-date-field input")!;
    await expect.poll(() => document.activeElement).toBe(input);
    expect(input.getAttribute("aria-invalid")).toBe("true");
    await nextFrames();
    expect(query(".zen-date-picker")).toBeNull();
  });

  it("focusFirstInvalidField on a DateField in error leaves the calendar closed", async () => {
    const screen = await render(<ZenProvider><form data-testid="form"><DateField label="End date" today={today} error="Choose an end date." /></form></ZenProvider>);
    focusFirstInvalidField(screen.getByTestId("form").element());
    await nextFrames();
    expect(document.activeElement).toBe(query(".zen-date-field input"));
    expect(query(".zen-date-picker")).toBeNull();
  });
});

describe("DateField: a typed date outside minDate / maxDate is error-ready", () => {
  const minDate = new Date(2026, 9, 1);
  const maxDate = new Date(2026, 11, 31);

  it("reports the text through onValueChange and marks the input aria-invalid while it is out of range", async () => {
    const onValueChange = vi.fn();
    await render(<ZenProvider><DateField label="Start date" today={today} minDate={minDate} maxDate={maxDate} onValueChange={onValueChange} /></ZenProvider>);
    const input = query<HTMLInputElement>(".zen-date-field input")!;
    await userEvent.click(input);
    await userEvent.keyboard("{Escape}");
    await userEvent.type(input, "09/15/2026");
    expect(onValueChange).toHaveBeenLastCalledWith("09/15/2026");
    await expect.poll(() => input.getAttribute("aria-invalid")).toBe("true");
    await userEvent.clear(input);
    await userEvent.type(input, "10/15/2026");
    expect(onValueChange).toHaveBeenLastCalledWith("10/15/2026");
    await expect.poll(() => input.hasAttribute("aria-invalid")).toBe(false);
    await userEvent.clear(input);
    await userEvent.type(input, "01/05/2027");
    await expect.poll(() => input.getAttribute("aria-invalid")).toBe("true");
  });

  it("does not flag a half-typed year, and a controlled value outside the range is flagged too", async () => {
    await render(<ZenProvider><DateField label="Start date" today={today} minDate={minDate} value="10/01/202" onValueChange={() => undefined} /><DateField label="End date" today={today} maxDate={maxDate} value="02/01/2027" onValueChange={() => undefined} /></ZenProvider>);
    const [start, end] = [...document.querySelectorAll<HTMLInputElement>(".zen-date-field input")];
    expect(start.hasAttribute("aria-invalid")).toBe(false);
    expect(end.getAttribute("aria-invalid")).toBe("true");
  });

  it("an explicit aria-invalid and the app's error still win", async () => {
    await render(<ZenProvider><DateField label="Start date" today={today} minDate={minDate} defaultValue="09/15/2026" aria-invalid={false} /><DateField label="End date" today={today} defaultValue="10/15/2026" error="End date is required." /></ZenProvider>);
    const [start, end] = [...document.querySelectorAll<HTMLInputElement>(".zen-date-field input")];
    expect(start.getAttribute("aria-invalid")).toBe("false");
    expect(end.getAttribute("aria-invalid")).toBe("true");
  });
});

describe("DatePicker semantics: inline group, popover dialog, Today", () => {
  it("an inline calendar is a named group, the DateField calendar a dialog", async () => {
    const screen = await render(<ZenProvider><DatePicker today={today} /><DatePicker today={today} calendar="dual" /><DatePicker today={today} aria-label="Contract start" /><DateField label="Start date" today={today} /></ZenProvider>);
    await expect.element(screen.getByRole("group", { name: "Choose date", exact: true })).toBeVisible();
    await expect.element(screen.getByRole("group", { name: "Choose dates", exact: true })).toBeVisible();
    await expect.element(screen.getByRole("group", { name: "Contract start" })).toBeVisible();
    expect(document.querySelectorAll(".zen-date-picker[role='dialog']").length).toBe(0);
    await userEvent.click(query(".zen-date-field input")!);
    await expect.element(screen.getByRole("dialog", { name: "Choose date" })).toBeVisible();
  });

  it("aria-labelledby names an inline calendar after a visible heading", async () => {
    const screen = await render(<ZenProvider><p id="cal-title">Pick the review day</p><DatePicker today={today} aria-labelledby="cal-title" /></ZenProvider>);
    await expect.element(screen.getByRole("group", { name: "Pick the review day" })).toBeVisible();
  });

  it("only today's day carries aria-current=\"date\", selected or not", async () => {
    await render(<ZenProvider><DatePicker today={today} /><DatePicker today={today} defaultValue={today} /></ZenProvider>);
    const [plain, selected] = [...document.querySelectorAll(".zen-date-picker")];
    const current = (root: Element) => [...root.querySelectorAll(".zen-date-picker__day[aria-current='date']")].map((day) => day.getAttribute("aria-label"));
    expect(current(plain)).toEqual(["Wednesday, September 30, 2026"]);
    expect(current(selected)).toEqual(["Wednesday, September 30, 2026"]);
    expect(selected.querySelector(".zen-date-picker__day[aria-current='date']")?.getAttribute("data-state")).toBe("single-selected");
  });
});

describe("AutocompleteField: focus after a Tag is removed", () => {
  const teams = [{ id: "design", label: "Design" }, { id: "research", label: "Research" }, { id: "sales", label: "Sales" }];

  it("moves to the next tag's Remove, then the previous one, then Add Item", async () => {
    const screen = await render(<ZenProvider><AutocompleteField label="Teams" options={teams} defaultValue={["design", "research", "sales"]} /></ZenProvider>);
    (screen.getByRole("button", { name: "Remove Research" }).element() as HTMLElement).focus();
    await userEvent.keyboard("{Enter}");
    await expect.element(screen.getByRole("button", { name: "Remove Sales" })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect.element(screen.getByRole("button", { name: "Remove Design" })).toHaveFocus();
    await userEvent.keyboard(" ");
    await expect.element(screen.getByRole("button", { name: "Add Item" })).toHaveFocus();
    expect(document.querySelector(".zen-autocomplete__tags")).toBeNull();
  });

  it("a mouse removal keeps focus in the field too", async () => {
    const screen = await render(<ZenProvider><AutocompleteField label="Teams" options={teams} defaultValue={["design", "research"]} /></ZenProvider>);
    await screen.getByRole("button", { name: "Remove Design" }).click();
    await expect.element(screen.getByRole("button", { name: "Remove Research" })).toHaveFocus();
  });

  it("controlled: moves after the parent applies the removal, and not at all when it keeps the tag", async () => {
    function Controlled({ locked }: { locked: boolean }) {
      const [value, setValue] = useState(["design", "research"]);
      return <AutocompleteField label="Teams" options={teams} value={value} onValueChange={(next) => { if (!locked) setValue(next); }} />;
    }
    const screen = await render(<ZenProvider><Controlled locked={false} /></ZenProvider>);
    (screen.getByRole("button", { name: "Remove Research" }).element() as HTMLElement).focus();
    await userEvent.keyboard("{Enter}");
    await expect.element(screen.getByRole("button", { name: "Remove Design" })).toHaveFocus();
    await screen.rerender(<ZenProvider><Controlled locked /></ZenProvider>);
    const design = screen.getByRole("button", { name: "Remove Design" }).element() as HTMLElement;
    design.focus();
    await userEvent.keyboard("{Enter}");
    await nextFrames();
    expect(document.activeElement).toBe(design);
  });
});

describe("Popover: the Escape that closes it is used up", () => {
  const items = [{ id: "name", label: "Name" }, { id: "date", label: "Date" }];
  const windowKeys: string[] = [];
  const onWindowKey = (event: KeyboardEvent) => { windowKeys.push(`${event.key}:${event.defaultPrevented}`); };
  afterEach(() => { window.removeEventListener("keydown", onWindowKey); windowKeys.length = 0; });

  function SortMenu({ onParentKey }: { onParentKey: (event: ReactKeyboardEvent) => void }) {
    const [open, setOpen] = useState(true);
    return (
      <div onKeyDown={onParentKey}>
        <span style={{ position: "relative", display: "inline-block" }}>
          <Button level="tertiary" aria-expanded={open} onClick={() => setOpen((current) => !current)}>Sort</Button>
          <Popover open={open} onOpenChange={setOpen} aria-label="Sort by" items={items} autoFocus />
        </span>
      </div>
    );
  }

  it("inside the surface: closes, returns focus, and neither React parents nor window listeners see the key", async () => {
    const onParentKey = vi.fn();
    window.addEventListener("keydown", onWindowKey);
    const screen = await render(<ZenProvider><SortMenu onParentKey={onParentKey} /></ZenProvider>);
    await expect.poll(() => document.activeElement?.getAttribute("role")).toBe("option");
    await userEvent.keyboard("{Escape}");
    await expect.element(screen.getByRole("button", { name: "Sort" })).toHaveAttribute("aria-expanded", "false");
    expect(onParentKey).not.toHaveBeenCalled();
    expect(windowKeys).toEqual([]);
  });

  it("on the trigger (the shared document handler): closes and stops the key before window listeners", async () => {
    function Anchored() {
      const [open, setOpen] = useState(true);
      const anchor = useRef<HTMLSpanElement>(null);
      return (
        <span ref={anchor} style={{ position: "relative", display: "inline-block" }}>
          <Button level="tertiary" aria-expanded={open} onClick={() => setOpen((current) => !current)}>Sort</Button>
          <Popover open={open} onOpenChange={setOpen} anchorRef={anchor} aria-label="Sort by" items={items} />
        </span>
      );
    }
    window.addEventListener("keydown", onWindowKey);
    const screen = await render(<ZenProvider><Anchored /></ZenProvider>);
    const trigger = screen.getByRole("button", { name: "Sort" });
    (trigger.element() as HTMLElement).focus();
    await userEvent.keyboard("{Escape}");
    await expect.element(trigger).toHaveAttribute("aria-expanded", "false");
    expect(windowKeys).toEqual([]);
  });
});

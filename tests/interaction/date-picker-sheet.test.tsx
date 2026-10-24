/**
 * Backlog batch A (2026-10-07, P2): Figma Date-Picker/Mobile (9923:3576) — DatePickerSheet (Variant=Single: Cancel / OK;
 * Variant=Multiple: stacked months + Footer-Actions), and DateField opens it on phones instead of the popover.
 */
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { DateField, DatePickerSheet } from "../../src/index";

const today = new Date(2026, 0, 4);

describe("DatePickerSheet", () => {
  it("single: a pick is a draft until OK", async () => {
    const onApply = vi.fn();
    const screen = await render(<DatePickerSheet open onOpenChange={() => {}} title="Start date" today={today} onApply={onApply} />);
    await expect.element(screen.getByRole("dialog", { name: "Start date" })).toBeInTheDocument();
    await expect.element(screen.getByRole("button", { name: "OK" })).toBeDisabled();
    await screen.getByRole("button", { name: /January 6, 2026/ }).click();
    await screen.getByRole("button", { name: "OK" }).click();
    const [date, range] = onApply.mock.calls[0];
    expect([date.getFullYear(), date.getMonth(), date.getDate(), range]).toEqual([2026, 0, 6, null]);
  });

  it("range: stacked months, OK once the range is complete", async () => {
    const onApply = vi.fn();
    const screen = await render(<DatePickerSheet open onOpenChange={() => {}} selectionMode="range" monthCount={3} today={today} summary={<span>Add dates for prices</span>} onApply={onApply} />);
    expect(document.querySelectorAll(".zen-date-picker__panel").length).toBe(3);
    expect(document.querySelectorAll(".zen-date-picker__sticky-weekdays").length).toBe(1);
    await screen.getByRole("button", { name: /January 6, 2026/ }).click();
    await expect.element(screen.getByRole("button", { name: "OK" })).toBeDisabled();
    await screen.getByRole("button", { name: /January 12, 2026/ }).click();
    await screen.getByRole("button", { name: "OK" }).click();
    const range = onApply.mock.calls[0][1];
    expect([range.start.getDate(), range.end.getDate()]).toEqual([6, 12]);
  });
});

// Figma .Primitives/Date-Picker (9923:2323): header="selection" puts the picked dates in the header.
describe("DatePickerSheet header=\"selection\"", () => {
  it("single: the draft date leads the header, the title names the dialog, edit calls onEdit", async () => {
    const onEdit = vi.fn();
    const screen = await render(<DatePickerSheet open onOpenChange={() => {}} header="selection" title="Select a date" today={today} onEdit={onEdit} />);
    await expect.element(screen.getByRole("dialog", { name: "Select a date" })).toBeInTheDocument();
    expect(document.querySelector(".zen-bottom-sheet__header")).toBeNull();
    await expect.element(screen.getByText("No date selected")).toBeInTheDocument();
    await screen.getByRole("button", { name: /January 6, 2026/ }).click();
    await expect.element(screen.getByText("Jan 6, 2026")).toBeInTheDocument();
    await screen.getByRole("button", { name: "Edit date" }).click();
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it("single: no edit action without onEdit", async () => {
    const screen = await render(<DatePickerSheet open onOpenChange={() => {}} header="selection" today={today} />);
    await expect.element(screen.getByRole("dialog", { name: "Choose date" })).toBeInTheDocument();
    expect(document.querySelector(".zen-date-picker-sheet__edit")).toBeNull();
  });

  it("range: the range and Clear dates, the weekday row in the header, Close closes", async () => {
    const onClear = vi.fn();
    const onOpenChange = vi.fn();
    const screen = await render(<DatePickerSheet open onOpenChange={onOpenChange} header="selection" selectionMode="range" monthCount={2} today={today} onClear={onClear} />);
    expect(getComputedStyle(document.querySelector(".zen-date-picker__sticky-weekdays")!).display).toBe("none");
    expect(document.querySelectorAll(".zen-date-picker-sheet__weekdays > span").length).toBe(7);
    await expect.element(screen.getByRole("button", { name: "Clear dates" })).toBeDisabled();
    await screen.getByRole("button", { name: /January 6, 2026/ }).click();
    await expect.element(screen.getByText(/^Tue, Jan 6 –$/)).toBeInTheDocument();
    await screen.getByRole("button", { name: /January 12, 2026/ }).click();
    await expect.element(screen.getByText(/Tue, Jan 6 – Mon, Jan 12/)).toBeInTheDocument();
    await screen.getByRole("button", { name: "Clear dates" }).click();
    await expect.element(screen.getByText("No dates selected")).toBeInTheDocument();
    expect(onClear).toHaveBeenCalledTimes(1);
    await expect.element(screen.getByRole("button", { name: "OK" })).toBeDisabled();
    await screen.getByRole("button", { name: "Close" }).click();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe("DateField on a phone", () => {
  it("opens the sheet, not the popover, and writes the picked day", async () => {
    const onDateChange = vi.fn();
    const screen = await render(<div data-breakpoint="mobile"><DateField label="Start date" today={today} onDateChange={onDateChange} /></div>);
    await screen.getByRole("combobox", { name: "Start date" }).click();
    await expect.element(screen.getByRole("dialog", { name: "Start date" })).toBeInTheDocument();
    await screen.getByRole("button", { name: /January 6, 2026/ }).click();
    await screen.getByRole("button", { name: "OK" }).click();
    await expect.element(screen.getByRole("combobox", { name: "Start date" })).toHaveValue("01/06/2026");
    expect(onDateChange).toHaveBeenCalledTimes(1);
  });
});

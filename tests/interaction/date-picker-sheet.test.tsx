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

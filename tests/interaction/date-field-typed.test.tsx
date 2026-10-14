/**
 * Backlog (2026-10-07 sweep, P2): DateField called onDateChange only for a day picked in the calendar. A typed complete
 * MM/DD/YYYY now reports that day; emptying the field or breaking the date reports null once.
 */
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { userEvent } from "vitest/browser";
import { DateField } from "../../src/index";

describe("DateField typed dates", () => {
  it("reports a typed day, and null once when it stops being one", async () => {
    const onDateChange = vi.fn();
    const screen = await render(<DateField label="Start date" datePicker={false} onDateChange={onDateChange} />);
    await screen.getByRole("textbox", { name: "Start date" }).click();
    await userEvent.keyboard("10/14/2026");
    expect(onDateChange).toHaveBeenCalledTimes(1);
    const day = onDateChange.mock.calls[0][0] as Date;
    expect([day.getFullYear(), day.getMonth(), day.getDate()]).toEqual([2026, 9, 14]);
    await userEvent.keyboard("{Backspace}{Backspace}");
    expect(onDateChange).toHaveBeenCalledTimes(2);
    expect(onDateChange.mock.calls[1][0]).toBeNull();
    await userEvent.keyboard("{Backspace}");
    expect(onDateChange).toHaveBeenCalledTimes(2);
  });

  it("ignores a day that does not exist", async () => {
    const onDateChange = vi.fn();
    const screen = await render(<DateField label="Start date" datePicker={false} onDateChange={onDateChange} />);
    await screen.getByRole("textbox", { name: "Start date" }).click();
    await userEvent.keyboard("02/31/2026");
    expect(onDateChange).not.toHaveBeenCalled();
  });
});

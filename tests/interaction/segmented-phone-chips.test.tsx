/**
 * Segmented on a phone (segmented guideline; the user 2026-10-24, option A): when its labels do not fit their equal share
 * or it would slide sideways, it shows as a single-choice chip row (ChipGroup) with the same options, value and
 * onValueChange, and comes back once its segments fit again. Desktop keeps the Segmented.
 */
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { Segmented, ZenProvider } from "../../src/index";

const filters = [{ id: "everything", label: "Everything that happened" }, { id: "mentions", label: "Mentions only" }];
const periods = [{ id: "day", label: "Day" }, { id: "week", label: "Week" }, { id: "month", label: "Month" }, { id: "quarter", label: "Quarter" }];

describe("Segmented on a phone", () => {
  it("cuts no label: a fullWidth Segmented that does not fit is a chip row with the same value and callback", async () => {
    const onValueChange = vi.fn();
    const screen = await render(<ZenProvider breakpoint="mobile"><div style={{ width: 240 }}>
      <Segmented fullWidth aria-label="Activity" options={filters} defaultValue="everything" onValueChange={onValueChange} />
    </div></ZenProvider>);
    const group = screen.getByRole("radiogroup", { name: "Activity" });
    await expect.element(group).toBeVisible();
    await expect.element(group.getByRole("radio", { name: "Everything that happened" })).toHaveAttribute("aria-checked", "true");
    await group.getByRole("radio", { name: "Mentions only" }).click();
    expect(onValueChange).toHaveBeenCalledWith("mentions");
    await expect.element(group.getByRole("radio", { name: "Mentions only" })).toHaveAttribute("aria-checked", "true");
  });

  it("does not slide sideways: four periods wider than the screen are a chip row, and come back as segments when there is room", async () => {
    const screen = await render(<ZenProvider breakpoint="mobile"><div data-testid="room" style={{ width: 200 }}>
      <Segmented aria-label="Period" options={periods} defaultValue="week" />
    </div></ZenProvider>);
    await expect.element(screen.getByRole("radiogroup", { name: "Period" })).toBeVisible();
    (screen.getByTestId("room").element() as HTMLElement).style.width = "900px";
    await expect.poll(() => screen.getByRole("group", { name: "Period" }).elements().length).toBe(1);
    expect(screen.getByRole("radiogroup").elements()).toHaveLength(0);
    await expect.element(screen.getByRole("button", { name: "Week" })).toHaveAttribute("aria-pressed", "true");
  });

  it("keeps the Segmented when every label fits, and on a desktop whatever the width", async () => {
    const screen = await render(<>
      <ZenProvider breakpoint="mobile"><div style={{ width: 300 }}><Segmented fullWidth aria-label="View" options={[{ id: "list", label: "List" }, { id: "board", label: "Board" }]} /></div></ZenProvider>
      <ZenProvider breakpoint="desktop"><div style={{ width: 200 }}><Segmented aria-label="Range" options={periods} /></div></ZenProvider>
    </>);
    await expect.element(screen.getByRole("group", { name: "View" })).toBeVisible();
    await expect.element(screen.getByRole("group", { name: "Range" })).toBeVisible();
    expect(screen.getByRole("radiogroup").elements()).toHaveLength(0);
  });
});

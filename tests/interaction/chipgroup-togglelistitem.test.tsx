/**
 * Backlog batch 6 (2026-10-07): ChipGroup is an APG radio group of Normal chips (one Tab stop, arrows move the choice,
 * Space picks), and ToggleListItem is a settings row whose whole surface flips its switch.
 */
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { userEvent } from "vitest/browser";
import { Button, ChipGroup, List, ToggleListItem } from "../../src/index";

const options = [{ value: "daily", label: "Daily" }, { value: "weekly", label: "Weekly" }, { value: "off", label: "Never", disabled: true }, { value: "monthly", label: "Monthly" }];

describe("ChipGroup", () => {
  it("is a radio group with one Tab stop on the picked chip", async () => {
    const screen = await render(<><Button>Before</Button><ChipGroup aria-label="Repeat" options={options} defaultValue="weekly" /><Button>After</Button></>);
    await expect.element(screen.getByRole("radiogroup", { name: "Repeat" })).toBeInTheDocument();
    await expect.element(screen.getByRole("radio", { name: "Weekly" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Daily" }).element().hasAttribute("aria-pressed")).toBe(false);
    screen.getByRole("button", { name: "Before" }).element().focus();
    await userEvent.tab();
    expect(document.activeElement?.textContent).toContain("Weekly");
    await userEvent.tab();
    expect(document.activeElement?.textContent).toContain("After");
  });

  it("moves the choice with the arrows (skipping a disabled chip, wrapping) and picks on a press", async () => {
    const onValueChange = vi.fn();
    function Controlled() {
      const [value, setValue] = useState<string | null>("weekly");
      return <ChipGroup aria-label="Repeat" options={options} value={value} onValueChange={(next) => { setValue(next); onValueChange(next); }} />;
    }
    const screen = await render(<Controlled />);
    screen.getByRole("radio", { name: "Weekly" }).element().focus();
    await userEvent.keyboard("{ArrowRight}");
    await expect.element(screen.getByRole("radio", { name: "Monthly" })).toHaveAttribute("aria-checked", "true");
    expect(document.activeElement?.textContent).toContain("Monthly");
    await userEvent.keyboard("{ArrowRight}");
    await expect.element(screen.getByRole("radio", { name: "Daily" })).toHaveAttribute("aria-checked", "true");
    await userEvent.keyboard("{ArrowLeft}");
    await expect.element(screen.getByRole("radio", { name: "Monthly" })).toHaveAttribute("aria-checked", "true");
    await screen.getByRole("radio", { name: "Weekly" }).click();
    expect(onValueChange.mock.calls.map(([value]) => value)).toEqual(["monthly", "daily", "monthly", "weekly"]);
  });
});

describe("ToggleListItem", () => {
  it("flips its switch on a press anywhere on the row; the switch is named and described by the row", async () => {
    const onCheckedChange = vi.fn();
    const screen = await render(<List><ToggleListItem title="Daily digest" caption="One email at 8:00 am" onCheckedChange={onCheckedChange} /></List>);
    const toggle = screen.getByRole("switch", { name: "Daily digest" });
    await expect.element(toggle).toHaveAttribute("aria-checked", "false");
    await expect.element(toggle).toHaveAccessibleDescription("One email at 8:00 am");
    // Playwright checks a click inside a <label> against its control (the hidden checkbox): force it, as a person can.
    await screen.getByText("One email at 8:00 am").click({ force: true });
    await expect.element(toggle).toHaveAttribute("aria-checked", "true");
    await toggle.click();
    await expect.element(toggle).toHaveAttribute("aria-checked", "false");
    toggle.element().focus();
    await userEvent.keyboard(" ");
    await expect.element(toggle).toHaveAttribute("aria-checked", "true");
    expect(onCheckedChange.mock.calls.map(([value]) => value)).toEqual([true, false, true]);
  });

  it("does nothing while disabled", async () => {
    const onCheckedChange = vi.fn();
    const screen = await render(<List><ToggleListItem title="Paid invoices" disabled onCheckedChange={onCheckedChange} /></List>);
    await screen.getByText("Paid invoices").click({ force: true });
    await expect.element(screen.getByRole("switch", { name: "Paid invoices" })).toHaveAttribute("aria-checked", "false");
    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});

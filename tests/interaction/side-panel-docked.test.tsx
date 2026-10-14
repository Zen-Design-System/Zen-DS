/**
 * Backlog (2026-10-07 sweep, P2): a docked (standard) SidePanel closed on Escape only with focus inside it and returned no
 * focus. Escape now closes it from the panel or the page beside it (not from a page text field), and focus goes back to
 * the opener.
 */
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { userEvent } from "vitest/browser";
import { Button, SidePanel } from "../../src/index";

function Docked() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ display: "flex" }}>
      <div>
        <Button onClick={() => setOpen(true)}>Open details</Button>
        <input aria-label="Filter" />
      </div>
      <SidePanel open={open} onOpenChange={setOpen} title="Invoice 2041"><Button>Mark paid</Button></SidePanel>
    </div>
  );
}

describe("SidePanel standard", () => {
  it("closes on Escape from the panel and returns focus to the opener", async () => {
    const screen = await render(<Docked />);
    await screen.getByRole("button", { name: "Open details" }).click();
    await expect.element(screen.getByRole("complementary")).toBeInTheDocument();
    screen.getByRole("button", { name: "Mark paid" }).element().focus();
    await userEvent.keyboard("{Escape}");
    await expect.element(screen.getByRole("complementary")).not.toBeInTheDocument();
    expect(document.activeElement?.textContent).toContain("Open details");
  });

  it("closes on Escape from the opener, not from a page text field", async () => {
    const screen = await render(<Docked />);
    await screen.getByRole("button", { name: "Open details" }).click();
    screen.getByRole("textbox", { name: "Filter" }).element().focus();
    await userEvent.keyboard("{Escape}");
    await expect.element(screen.getByRole("complementary")).toBeInTheDocument();
    screen.getByRole("button", { name: "Open details" }).element().focus();
    await userEvent.keyboard("{Escape}");
    await expect.element(screen.getByRole("complementary")).not.toBeInTheDocument();
  });
});

/**
 * Tooltip closable (Figma Close=Yes, 2026-10-07): open from the start on a phone, it stays through presses and pointer
 * moves until its close X (or Escape) closes it; it is a note (it holds a button) and calls onOpenChange.
 */
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { userEvent } from "vitest/browser";
import { Button, Tooltip } from "../../src/index";

describe("Tooltip closable", () => {
  it("is open from the start, survives a press on its trigger, and closes on its X", async () => {
    const onOpenChange = vi.fn();
    const screen = await render(<Tooltip content="New: scan receipts" placement="bottom" closable defaultOpen onOpenChange={onOpenChange}><Button>Scan receipt</Button></Tooltip>);
    const note = screen.getByRole("note");
    await expect.element(note).toHaveTextContent("New: scan receipts");
    await expect.element(screen.getByRole("button", { name: "Scan receipt" })).toHaveAccessibleDescription(/New: scan receipts/);
    await screen.getByRole("button", { name: "Scan receipt" }).click();
    await expect.element(screen.getByRole("note")).toBeInTheDocument();
    await screen.getByRole("button", { name: "Close" }).click();
    await expect.element(screen.getByRole("note")).not.toBeInTheDocument();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("controlled: the X asks the owner to close; Escape closes it too", async () => {
    function Owner() {
      const [open, setOpen] = useState(true);
      return <><Tooltip content="Tip" placement="bottom" closable open={open} onOpenChange={setOpen}><Button>Act</Button></Tooltip><Button onClick={() => setOpen(true)}>Show tip</Button></>;
    }
    const screen = await render(<Owner />);
    await screen.getByRole("button", { name: "Close" }).click();
    await expect.element(screen.getByRole("note")).not.toBeInTheDocument();
    await screen.getByRole("button", { name: "Show tip" }).click();
    await expect.element(screen.getByRole("note")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    await expect.element(screen.getByRole("note")).not.toBeInTheDocument();
  });

  it("a plain tooltip keeps role=tooltip and no close button", async () => {
    const screen = await render(<Tooltip content="Plain" open><Button>Act</Button></Tooltip>);
    await expect.element(screen.getByRole("tooltip")).toHaveTextContent("Plain");
    expect(screen.container.querySelector(".zen-tooltip__close")).toBeNull();
  });
});

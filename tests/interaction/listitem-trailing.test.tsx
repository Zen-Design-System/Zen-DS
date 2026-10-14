/**
 * Backlog (2026-10-07 sweep, P2): on a clickable ListItem a trailing Badge sat outside the row's button, so a tap on it
 * did nothing. The row's hit area now covers the trailing slot; a button in the slot stays its own target.
 */
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { Badge, IconButton, List, ListItem } from "../../src/index";

describe("ListItem trailing slot", () => {
  it("passes a tap on a trailing Badge to the row", async () => {
    const onClick = vi.fn();
    const screen = await render(<List><ListItem title="Invoice 2041" caption="Due Friday" trailing={<Badge>Overdue</Badge>} onClick={onClick} /></List>);
    // The Badge lets presses through (Playwright refuses to click such an element unforced): the row's button is under it.
    const badge = screen.getByText("Overdue").element().getBoundingClientRect();
    const hit = document.elementFromPoint(badge.x + badge.width / 2, badge.y + badge.height / 2);
    expect(hit?.closest("button")?.className).toContain("zen-list-item__wrapper");
    await screen.getByText("Overdue").click({ force: true });
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("keeps a trailing button its own target", async () => {
    const onRow = vi.fn();
    const onMore = vi.fn();
    const screen = await render(<List><ListItem title="Invoice 2041" href="#invoice" onClick={(event) => { event.preventDefault(); onRow(); }} trailing={<IconButton icon="icon-more-horizontal-line" aria-label="More" onClick={onMore} />} /></List>);
    await screen.getByRole("button", { name: "More" }).click();
    expect(onMore).toHaveBeenCalledTimes(1);
    expect(onRow).not.toHaveBeenCalled();
    await screen.getByText("Invoice 2041").click();
    expect(onRow).toHaveBeenCalledTimes(1);
  });
});

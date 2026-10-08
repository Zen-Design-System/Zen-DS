/**
 * Backlog batch A (2026-10-07, P2): a Table without fixed widths in a narrow box crushed its text column to one word per
 * line. A left-aligned text cell now keeps a readable minimum and the table scrolls sideways.
 */
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { Badge, Table, TableText } from "../../src/index";

const rows = [{ id: "1", title: "Token rename for Selected state", owner: "Chi Tran", status: "In review" }];

describe("Table in a narrow box", () => {
  it("keeps a readable text column and scrolls instead", async () => {
    const screen = await render(
      <div style={{ width: 246 }}>
        <Table aria-label="Tasks" rows={rows} getRowId={(row) => row.id} columns={[
          { id: "title", header: "Task", cell: (row) => <TableText>{row.title}</TableText> },
          { id: "owner", header: "Owner", cell: (row) => <TableText>{row.owner}</TableText> },
          { id: "status", header: "Status", cell: (row) => <Badge>{row.status}</Badge> },
        ]} />
      </div>,
    );
    await expect.element(screen.getByText("Token rename for Selected state")).toBeInTheDocument();
    const title = screen.getByText("Token rename for Selected state").element() as HTMLElement;
    expect(title.getBoundingClientRect().width).toBeGreaterThanOrEqual(119);
    const table = document.querySelector(".zen-table") as HTMLElement;
    expect(table.scrollWidth).toBeGreaterThan(table.clientWidth);
  });
});

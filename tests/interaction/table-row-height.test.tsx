/**
 * Figma Table/Cell/Default is FIXED at Table/Cell/Size and Table/Cell/Header at Table/Header/Size (user rule, 2026-10-13).
 * A <td> height is only a minimum: the collapsed 1px divider made every row 1px taller than the token, and long text
 * wrapped onto a second line. Rows now stay at the token in every density; long text ends in an ellipsis, right-aligned
 * values stay whole.
 */
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { Avatar, Badge, Table, TableBadges, TableMedia, TableText, ZenProvider } from "../../src/index";

type Row = { id: string; title: string; client: string; owner: string; tags: string[]; amount: string };
const rows: Row[] = [
  { id: "1", title: "Design the points history screen for the loyalty app and its empty states", client: "Phin & Co", owner: "Chi Tran", tags: ["Design", "Mobile", "Q4"], amount: "$12,400.00" },
  { id: "2", title: "Token pipeline", client: "Zen", owner: "Bao Nguyen", tags: ["Tokens"], amount: "$800.00" },
];

function Tasks() {
  return (
    <div style={{ width: 520 }}>
      <Table aria-label="Tasks" rows={rows} getRowId={(row) => row.id} columns={[
        { id: "title", header: "Task", cell: (row) => <TableText bold caption={row.client}>{row.title}</TableText> },
        { id: "owner", header: "Owner", cell: (row) => <TableMedia caption="Designer" media={<Avatar size="sm" alt="" theme="neutral">{row.owner[0]}</Avatar>}>{row.owner}</TableMedia> },
        { id: "tags", header: "Tags", cell: (row) => <TableBadges>{row.tags.map((tag) => <Badge key={tag} size="medium">{tag}</Badge>)}</TableBadges> },
        { id: "amount", header: "Amount", align: "right", cell: (row) => <TableText>{row.amount}</TableText> },
      ]} />
    </div>
  );
}

const px = (element: Element, name: string) => parseFloat(getComputedStyle(element).getPropertyValue(name));
const heights = (selector: string) => [...document.querySelectorAll(selector)].map((row) => row.getBoundingClientRect().height);

describe("Table row height", () => {
  for (const density of ["compact", "comfortable"] as const) {
    it(`keeps every row at Table/Cell/Size and the header at Table/Header/Size (${density})`, async () => {
      const screen = await render(<ZenProvider density={density}><Tasks /></ZenProvider>);
      await expect.element(screen.getByText("Token pipeline")).toBeInTheDocument();
      const table = document.querySelector(".zen-table")!;
      const cell = px(table, "--zen-table-cell-size");
      const header = px(table, "--zen-table-header-size");
      expect(cell).toBe(density === "compact" ? 52 : 56);
      expect(heights(".zen-table tbody > tr")).toEqual([cell, cell]);
      expect(heights(".zen-table thead > tr")).toEqual([header]);
    });
  }

  it("ends long text in an ellipsis on one line and keeps right-aligned values whole", async () => {
    const screen = await render(<Tasks />);
    await expect.element(screen.getByText("Token pipeline")).toBeInTheDocument();
    const title = screen.getByText(rows[0].title).element() as HTMLElement;
    expect(getComputedStyle(title).textOverflow).toBe("ellipsis");
    expect(title.scrollWidth).toBeGreaterThan(title.clientWidth);
    expect(title.getBoundingClientRect().height).toBe(20);
    const amount = screen.getByText("$12,400.00").element() as HTMLElement;
    expect(amount.scrollWidth).toBeLessThanOrEqual(amount.clientWidth);
  });
});

/**
 * A Table's first column is the row's name: its avatar cell draws a Solid Avatar; avatar cells in later columns stay
 * Subtle (the user 2026-10-24: "cột giá trị đầu tiên trong bảng nếu có dùng avatar thì không dùng subtle").
 */
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { Table, type TableColumn } from "../../src/index";

type Row = { id: string; name: string; owner: string };
const rows: Row[] = [{ id: "a", name: "Mai Anh", owner: "Bao Nguyen" }];
const columns: TableColumn<Row>[] = [
  { id: "name", header: "Member", content: "avatar" },
  { id: "owner", header: "Owner", content: "avatar" },
];

describe("Table avatar cells", () => {
  it("draws the first column's Avatar Solid and a later column's Subtle", async () => {
    const screen = await render(<Table aria-label="Members" rows={rows} getRowId={(row) => row.id} columns={columns} />);
    await expect.element(screen.getByText("Mai Anh")).toBeVisible();
    const avatars = [...screen.container.querySelectorAll("tbody .zen-avatar")].map((avatar) => avatar.getAttribute("data-background"));
    expect(avatars).toEqual(["solid", "subtle"]);
  });
});

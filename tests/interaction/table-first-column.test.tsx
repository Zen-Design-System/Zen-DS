/**
 * A Table's first column is the row's name: its avatar cell draws a Solid Avatar; avatar cells in later columns stay
 * Subtle (the user 2026-10-24: "cột giá trị đầu tiên trong bảng nếu có dùng avatar thì không dùng subtle"). Its dock-icon
 * cell draws a Small Dock Icon with or without a Subtext; later columns follow the Subtext, XSmall without one (the user
 * 2026-10-25: "mặc định là size Small và khi có thêm caption thì phải luôn là size Small").
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

  it("keeps a first-column photo Avatar Subtle (Figma has no Photo × Solid)", async () => {
    const photos = [{ id: "a", name: "Mai Anh", photo: "/avatar.jpg" }];
    const screen = await render(<Table aria-label="Team" rows={photos} getRowId={(row) => row.id} columns={[{ id: "name", header: "Member", content: "avatar", mediaField: "photo" }]} />);
    await expect.element(screen.getByText("Mai Anh")).toBeVisible();
    expect(screen.container.querySelector("tbody .zen-avatar")?.getAttribute("data-background")).toBe("subtle");
  });
});

describe("Table dock-icon cells", () => {
  it("draws the first column's Dock Icon Small with or without a Subtext, a later column's by its Subtext", async () => {
    const apps = [{ id: "a", name: "Payroll", kind: "Finance", note: "Monthly" }];
    const screen = await render(
      <Table aria-label="Apps" rows={apps} getRowId={(row) => row.id} columns={[
        { id: "name", header: "App", content: "dock-icon" },
        { id: "kind", header: "Kind", content: "dock-icon" },
        { id: "note", header: "Note", field: "kind", content: "dock-icon", captionField: "note" },
      ]} />,
    );
    await expect.element(screen.getByText("Payroll")).toBeVisible();
    const sizes = [...screen.container.querySelectorAll("tbody .zen-dock-icon")].map((dock) => dock.getAttribute("data-size"));
    expect(sizes).toEqual(["small", "xsmall", "small"]);
  });

  it("keeps the first column's Dock Icon Small over a Subtext", async () => {
    const apps = [{ id: "a", name: "Payroll", note: "Monthly" }];
    const screen = await render(<Table aria-label="Apps" rows={apps} getRowId={(row) => row.id} columns={[{ id: "name", header: "App", content: "dock-icon", captionField: "note" }]} />);
    await expect.element(screen.getByText("Payroll")).toBeVisible();
    expect(screen.container.querySelector("tbody .zen-dock-icon")?.getAttribute("data-size")).toBe("small");
  });
});

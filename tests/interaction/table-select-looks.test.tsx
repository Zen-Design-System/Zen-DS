/**
 * An editable Table's select draws each option as its cell will (user, 2026-10-24: "popover để chọn nếu là người thì nên
 * có avatar"): a person with their avatar (initials without a photo), a status or priority with the Badge colour and icon
 * the column's cells give that value. A value picked in the Table takes that value's picture or Badge look.
 */
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { userEvent } from "vitest/browser";
import { Table, ZenProvider, type TableColumn } from "../../src/index";

const photo = (fill: string) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="${fill}"/></svg>`)}`;
type Task = { id: string; title: string; assignee: string; photo?: string; status: string };
const rows: Task[] = [
  { id: "t1", title: "Agenda", assignee: "Hà Trần", photo: photo("red"), status: "Doing" },
  { id: "t2", title: "Minutes", assignee: "Minh Lê", photo: photo("blue"), status: "Done" },
  { id: "t3", title: "Roadmap", assignee: "Lan Phạm", status: "Doing" },
];
const columns: TableColumn<Task>[] = [
  { id: "title", header: "Task" },
  { id: "assignee", header: "Assignee", content: "avatar", mediaField: "photo", edit: "select" },
  { id: "status", header: "Status", content: "badge", edit: "select" },
];
const overrides = {
  "Row[t1]/status/Badge": { theme: "blue", leadingIcon: true, leading: "icon-loading-02-line" },
  "Row[t2]/status/Badge": { theme: "green", leadingIcon: true, leading: "icon-check-circle-line" },
  "Row[t3]/status/Badge": { theme: "blue", leadingIcon: true, leading: "icon-loading-02-line" },
};

const items = () => [...document.querySelectorAll<HTMLElement>(".zen-table-editor__layer .zen-popover__item")];
const openCell = async (td: HTMLElement) => {
  await userEvent.click(td);
  await vi.waitFor(() => expect(items().length).toBeGreaterThan(0));
};

describe("Table › a select draws its options as the cells draw them", () => {
  it("a person picker shows each person's avatar, initials without a photo, and a pick brings the person's photo", async () => {
    const screen = await render(<ZenProvider><Table aria-label="Tasks" rows={rows} columns={columns} /></ZenProvider>);
    const cell = (row: number) => screen.container.querySelectorAll<HTMLTableCellElement>("tbody tr.zen-table__row")[row].querySelectorAll<HTMLTableCellElement>("td.zen-table__cell")[1];
    await openCell(cell(0));
    expect(items().map((item) => item.dataset.tone)).toEqual(["avatar-small", "avatar-small", "avatar-small"]);
    expect(items().map((item) => item.querySelector(".zen-popover__item-leading .zen-avatar img")?.getAttribute("src") ?? item.querySelector(".zen-avatar__initials")?.textContent))
      .toEqual([photo("red"), photo("blue"), "LP"]);
    // Pick Minh Lê for the first row: the cell shows Minh Lê with Minh Lê's photo, not Hà Trần's.
    await userEvent.click(items()[1]);
    await vi.waitFor(() => expect(cell(0).textContent).toContain("Minh Lê"));
    expect(cell(0).querySelector(".zen-avatar img")?.getAttribute("src")).toBe(photo("blue"));
    // Pick Lan Phạm (no photo): the cell draws her initials.
    await openCell(cell(0));
    await userEvent.click(items()[2]);
    await vi.waitFor(() => expect(cell(0).textContent).toContain("Lan Phạm"));
    expect(cell(0).querySelector(".zen-avatar img")).toBeNull();
    // XSmall avatars show one initial.
    expect(cell(0).querySelector(".zen-avatar__initials")?.textContent).toBe("L");
  });

  it("a status picker shows each value as its Badge, and a pick takes that value's colour and icon", async () => {
    const screen = await render(<ZenProvider><Table aria-label="Tasks" rows={rows} columns={columns} overrides={overrides} /></ZenProvider>);
    const cell = (row: number) => screen.container.querySelectorAll<HTMLTableCellElement>("tbody tr.zen-table__row")[row].querySelectorAll<HTMLTableCellElement>("td.zen-table__cell")[2];
    const badgeOf = (root: Element | undefined) => {
      const badge = root?.querySelector<HTMLElement>(".zen-badge");
      return badge ? { tone: badge.dataset.tone, background: badge.dataset.background, icon: Boolean(badge.querySelector(".zen-badge__leading .zen-icon")) } : null;
    };
    expect(badgeOf(cell(0))).toEqual({ tone: "blue", background: "subtle", icon: true });
    await openCell(cell(0));
    expect(items().map((item) => item.dataset.tone)).toEqual(["badge", "badge"]);
    expect(items().map((item) => badgeOf(item))).toEqual([
      { tone: "blue", background: "subtle", icon: true },
      { tone: "green", background: "subtle", icon: true },
    ]);
    // Done for the first row: its own override was written for Doing, the cell now draws Done as the column does.
    await userEvent.click(items()[1]);
    await vi.waitFor(() => expect(cell(0).textContent).toContain("Done"));
    expect(badgeOf(cell(0))).toEqual({ tone: "green", background: "subtle", icon: true });
    // The other rows keep their own looks.
    expect(badgeOf(cell(2))).toEqual({ tone: "blue", background: "subtle", icon: true });
  });

  it("an edit object's options with photoSrc draw as avatars", async () => {
    const people = [{ value: "ha", label: "Hà Trần", photoSrc: photo("red") }, { value: "minh", label: "Minh Lê" }];
    const edit = { type: "select" as const, value: (row: Task) => (row.assignee === "Hà Trần" ? "ha" : "minh"), options: people, onCommit: vi.fn() };
    const screen = await render(<ZenProvider><Table aria-label="Tasks" rows={rows} columns={[{ id: "title", header: "Task" }, { id: "owner", header: "Owner", cell: (row) => row.assignee, edit }]} /></ZenProvider>);
    await openCell(screen.container.querySelectorAll<HTMLTableCellElement>("tbody tr.zen-table__row td.zen-table__cell")[1]);
    expect(items().map((item) => item.dataset.tone)).toEqual(["avatar-small", "avatar-small"]);
    expect(items()[0].querySelector(".zen-avatar img")?.getAttribute("src")).toBe(photo("red"));
    expect(items()[1].querySelector(".zen-avatar__initials")?.textContent).toBe("ML");
    await userEvent.click(items()[1]);
    await vi.waitFor(() => expect(edit.onCommit).toHaveBeenCalledWith(rows[0], "minh"));
  });
});

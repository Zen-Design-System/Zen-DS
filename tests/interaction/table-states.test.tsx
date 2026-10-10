/**
 * Figma Table/Cell/Default State=Selected and State=Edit without app state (2026-10-10): the Table keeps its own
 * selection (`defaultSelectedIds`) and its own edits (`editable`, a column's `edit: "<type>"`), which is what Zen Studio
 * writes when a designer sets a Data-Row's or a Cell's State.
 */
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { userEvent } from "vitest/browser";
import { Table, ZenProvider, type TableColumn } from "../../src/index";

type Row = { id: string; name: string; status: string; labels: string[]; estimate: number; done: boolean };
const rows: Row[] = [
  { id: "a", name: "Wireframes", status: "Done", labels: ["Design"], estimate: 3, done: true },
  { id: "b", name: "Prototype", status: "In progress", labels: ["Design", "Mobile"], estimate: 5.5, done: false },
];
const columns: TableColumn<Row>[] = [
  { id: "name", header: "Task", bold: true },
  { id: "status", header: "Status", content: "badge" },
  { id: "labels", header: "Labels", content: "tag" },
  { id: "estimate", header: "Estimate", align: "right" },
  { id: "done", header: "Done", content: "checkbox" },
];
const tick = () => new Promise((resolve) => setTimeout(resolve, 50));

describe("Table › selection the Table keeps", () => {
  it("defaultSelectedIds selects rows at first; checking another row keeps the selection and reports it", async () => {
    const onSelectionChange = vi.fn();
    const screen = await render(<ZenProvider><Table aria-label="Tasks" rows={rows} columns={columns} selectable defaultSelectedIds={["a"]} onSelectionChange={onSelectionChange} /></ZenProvider>);
    const trs = () => [...screen.container.querySelectorAll<HTMLTableRowElement>("tbody tr.zen-table__row")];
    expect(trs().map((tr) => tr.dataset.selected)).toEqual(["true", undefined]);
    expect(trs()[0].querySelector<HTMLInputElement>("input[type=checkbox]")?.checked).toBe(true);
    // The Checkbox's box sits over its input: click the box, as a person does.
    await userEvent.click(trs()[1].querySelector(".zen-checkbox__box")!);
    await tick();
    expect(onSelectionChange).toHaveBeenLastCalledWith(["a", "b"]);
    expect(trs().map((tr) => tr.dataset.selected)).toEqual(["true", "true"]);
  });
});

describe("Table › edits the Table keeps", () => {
  it("editable puts every value cell in Edit by its content (text, select, tags, number) and keeps a typed value", async () => {
    const screen = await render(<ZenProvider><Table aria-label="Tasks" rows={rows} columns={columns} editable /></ZenProvider>);
    const cells = () => [...screen.container.querySelectorAll<HTMLTableCellElement>("tbody tr:first-child td.zen-table__cell")];
    expect(cells().map((td) => td.dataset.editable)).toEqual(["true", "true", "true", "true", undefined]);
    // Text: a click edits the cell, Enter saves into the Table's own copy of the row.
    await userEvent.click(cells()[0]);
    const input = await vi.waitFor(() => { const field = cells()[0].querySelector<HTMLTextAreaElement | HTMLInputElement>("textarea, input"); if (!field) throw new Error("no editor"); return field; });
    await userEvent.fill(input, "Wireframes v2");
    await userEvent.keyboard("{Enter}");
    await vi.waitFor(() => expect(cells()[0].textContent).toContain("Wireframes v2"));
    // Number: the edit stays a number (right-aligned cell, drawn as text).
    await userEvent.click(cells()[3]);
    const number = await vi.waitFor(() => { const field = cells()[3].querySelector<HTMLTextAreaElement | HTMLInputElement>("textarea, input"); if (!field) throw new Error("no editor"); return field; });
    await userEvent.fill(number, "4");
    await userEvent.keyboard("{Enter}");
    await vi.waitFor(() => expect(cells()[3].textContent).toContain("4"));
    // Select: the badge column lists the column's values.
    await userEvent.click(cells()[1]);
    await vi.waitFor(() => expect([...document.querySelectorAll(".zen-table-editor__layer .zen-popover__item")].map((item) => item.textContent)).toEqual(["Done", "In progress"]));
    await userEvent.keyboard("{Escape}");
  });

  it("a column's edit: \"<type>\" hands the edit to onCellCommit when given", async () => {
    const onCellCommit = vi.fn();
    const screen = await render(<ZenProvider><Table aria-label="Tasks" rows={rows} columns={[{ id: "name", header: "Task", edit: "text" }, { id: "status", header: "Status" }]} onCellCommit={onCellCommit} /></ZenProvider>);
    const cells = () => [...screen.container.querySelectorAll<HTMLTableCellElement>("tbody tr:first-child td.zen-table__cell")];
    expect(cells().map((td) => td.dataset.editable)).toEqual(["true", undefined]);
    await userEvent.click(cells()[0]);
    const input = await vi.waitFor(() => { const field = cells()[0].querySelector<HTMLTextAreaElement | HTMLInputElement>("textarea, input"); if (!field) throw new Error("no editor"); return field; });
    await userEvent.fill(input, "Renamed");
    await userEvent.keyboard("{Enter}");
    await vi.waitFor(() => expect(onCellCommit).toHaveBeenCalledWith(rows[0], "name", "Renamed"));
    // Not kept by the Table: the app owns the rows.
    expect(cells()[0].textContent).toContain("Wireframes");
  });
});

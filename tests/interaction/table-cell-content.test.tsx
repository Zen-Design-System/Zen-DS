/**
 * Table columns without a `cell` draw Figma's Table/Cell/Default › Content from the row's fields (2026-10-10): the
 * content type a designer picks in Zen Studio, and what a page made in the Studio can hold.
 */
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { Table, ZenProvider, type TableColumn } from "../../src/index";

type Row = { id: string; name: string; client: string; lead: string; photo?: string; status: string[]; tags: string; change: string; progress: number; done: boolean; icon: string };
const rows: Row[] = [
  { id: "a", name: "Loyalty app", client: "Phin & Co", lead: "Chi Tran", status: ["Live", "Paid"], tags: "Mobile", change: "+12%", progress: 64, done: true, icon: "icon-folder-line" },
  { id: "b", name: "Online banking", client: "Lumen Bank", lead: "Bao Nguyen", status: ["Review"], tags: "Web", change: "-3%", progress: 20, done: false, icon: "icon-folder-line" },
];
const columns: TableColumn<Row>[] = [
  { id: "project", header: "Project", content: "text", field: "name", captionField: "client", bold: true },
  { id: "lead", header: "Lead", content: "avatar", field: "lead" },
  { id: "kind", header: "Kind", content: "icon", field: "name", mediaField: "icon" },
  { id: "status", header: "Status", content: "badge" },
  { id: "tags", header: "Tags", content: "tag" },
  { id: "change", header: "Change", content: "trend" },
  { id: "progress", header: "Progress", content: "progress" },
  { id: "done", header: "Done", content: "checkbox" },
  { id: "plain", header: "Plain", field: "client" },
];

describe("Table › column content", () => {
  it("draws each content type from the row's fields", async () => {
    const screen = await render(<ZenProvider><Table aria-label="Projects" rows={rows} columns={columns} /></ZenProvider>);
    const row = screen.container.querySelectorAll("tbody tr")[0];
    const cell = (index: number) => row.querySelectorAll("td")[index];
    // Text: Bold label over its Subtext.
    expect(cell(0).querySelector(".zen-table-text__label")?.textContent).toBe("Loyalty app");
    expect(cell(0).querySelector(".zen-table-text__label")?.className).toMatch(/body-base-bold/);
    expect(cell(0).querySelector(".zen-table-text__caption")?.textContent).toBe("Phin & Co");
    // Avatar: initials without a picture (an XSmall Avatar shows the first), then the name.
    expect(cell(1).querySelector(".zen-avatar")?.textContent).toBe("C");
    expect(cell(1).querySelector(".zen-table-text__label")?.textContent).toBe("Chi Tran");
    expect(cell(2).querySelector(".zen-table-media__visual .zen-icon")).not.toBeNull();
    // Badges: one per value; a Tag; a Trend with its direction; Progress; Checkbox from a boolean.
    expect([...cell(3).querySelectorAll(".zen-badge")].map((badge) => badge.textContent)).toEqual(["Live", "Paid"]);
    expect(cell(4).querySelector(".zen-tag")?.textContent).toBe("Mobile");
    expect(cell(5).textContent).toContain("+12%");
    expect(cell(5).querySelector(".zen-icon")).not.toBeNull();
    expect(cell(6).querySelector("[role=progressbar]")?.getAttribute("aria-valuenow")).toBe("64");
    expect((cell(7).querySelector("input[type=checkbox]") as HTMLInputElement).checked).toBe(true);
    // No content: the field as text (the default).
    expect(cell(8).textContent).toBe("Phin & Co");
  });

  it("names its controls after the column and the row", async () => {
    const screen = await render(<ZenProvider><Table aria-label="Projects" rows={rows} columns={columns} /></ZenProvider>);
    expect(screen.getByRole("checkbox", { name: "Done, row 2" }).element()).not.toBeChecked();
  });

  it("keeps a column's own cell first", async () => {
    const screen = await render(<ZenProvider><Table aria-label="Projects" rows={rows} columns={[{ id: "name", header: "Name", content: "badge", cell: (r) => `Custom ${r.name}` }]} /></ZenProvider>);
    expect(screen.container.querySelector("tbody td")?.textContent).toBe("Custom Loyalty app");
  });
});

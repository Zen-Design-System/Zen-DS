/**
 * Interaction tests for data and form components: Table (sort, selection), Pagination, Accordion and Form with
 * useFormState (errors on submit, focus on the first invalid field, announcement).
 */
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { userEvent } from "vitest/browser";
import { Accordion, Button, Form, FormActions, InputField, Menu, Pagination, Table, ZenProvider, useFormState, type TableSort } from "../../src/index";

type Member = { id: string; name: string; seats: number };
const members: Member[] = [
  { id: "a", name: "Ava Nguyen", seats: 3 },
  { id: "b", name: "Bao Tran", seats: 1 },
  { id: "c", name: "Chi Le", seats: 2 },
];

function MembersTable({ onSelection }: { onSelection: (ids: string[]) => void }) {
  const [sort, setSort] = useState<TableSort | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const rows = sort ? [...members].sort((x, y) => (sort.direction === "asc" ? 1 : -1) * (x.seats - y.seats)) : members;
  return (
    <Table
      aria-label="Members"
      columns={[
        { id: "name", header: "Name", cell: (m: Member) => m.name },
        { id: "seats", header: "Seats", sortable: true, align: "right", cell: (m: Member) => m.seats },
      ]}
      rows={rows}
      getRowId={(m) => m.id}
      sort={sort}
      onSortChange={setSort}
      selectable
      selectedIds={selected}
      onSelectionChange={(ids) => { setSelected(ids); onSelection(ids); }}
    />
  );
}

describe("Table", () => {
  it("sorts by a sortable column and exposes aria-sort", async () => {
    const screen = await render(<ZenProvider><MembersTable onSelection={vi.fn()} /></ZenProvider>);
    const header = screen.getByRole("columnheader", { name: /Seats/ });
    await header.getByRole("button").click();
    await expect.element(header).toHaveAttribute("aria-sort", "ascending");
    const firstCell = () => screen.getByRole("row").nth(1).getByRole("cell").nth(1);
    await expect.element(firstCell()).toHaveTextContent("Bao Tran");
    await header.getByRole("button").click();
    await expect.element(header).toHaveAttribute("aria-sort", "descending");
    await expect.element(firstCell()).toHaveTextContent("Ava Nguyen");
  });

  it("selects every row from the header checkbox", async () => {
    const onSelection = vi.fn();
    const screen = await render(<ZenProvider><MembersTable onSelection={onSelection} /></ZenProvider>);
    // The native input is visually hidden behind the Zen mark (the label is the hit area), as in every Zen checkbox.
    await userEvent.click(screen.getByRole("checkbox", { name: "Select all rows" }), { force: true });
    expect(onSelection).toHaveBeenLastCalledWith(["a", "b", "c"]);
  });
});

describe("Table bulkActions", () => {
  function BulkTable({ onArchive }: { onArchive: (ids: string[]) => void }) {
    const [selected, setSelected] = useState<string[]>([]);
    return (
      <Table aria-label="Members" rows={members} getRowId={(m) => m.id} selectable selectedIds={selected} onSelectionChange={setSelected}
        columns={[{ id: "name", header: "Name", cell: (m: Member) => m.name }]}
        bulkActions={(ids) => [{ id: "archive", icon: "icon-archive-line", label: `Archive ${ids.length}`, onClick: () => { onArchive(ids); setSelected([]); } }]} />
    );
  }

  it("shows the bar while rows are selected and clears the selection from it", async () => {
    const onArchive = vi.fn();
    const screen = await render(<ZenProvider><BulkTable onArchive={onArchive} /></ZenProvider>);
    expect(screen.getByRole("toolbar").elements()).toHaveLength(0);
    await userEvent.click(screen.getByRole("checkbox", { name: "Select row 1" }), { force: true });
    await userEvent.click(screen.getByRole("checkbox", { name: "Select row 3" }), { force: true });
    const bar = screen.getByRole("toolbar", { name: "Actions for 2 selected rows" });
    await expect.element(bar).toBeVisible();
    await expect.element(bar.getByRole("status")).toHaveTextContent("2 selected");
    await bar.getByRole("button", { name: "Archive 2" }).click();
    expect(onArchive).toHaveBeenCalledWith(["a", "c"]);
    // The bar left with the focus in it: Select all rows takes the focus.
    await expect.poll(() => screen.getByRole("toolbar").elements().length).toBe(0);
    await expect.element(screen.getByRole("checkbox", { name: "Select all rows" })).toHaveFocus();
  });

  it("clears the selection with Escape and with Clear selection", async () => {
    const screen = await render(<ZenProvider><BulkTable onArchive={vi.fn()} /></ZenProvider>);
    await userEvent.click(screen.getByRole("checkbox", { name: "Select row 2" }), { force: true });
    (screen.getByRole("button", { name: "Clear selection" }).element() as HTMLElement).focus();
    await userEvent.keyboard("{Escape}");
    await expect.poll(() => screen.getByRole("toolbar").elements().length).toBe(0);
    await expect.element(screen.getByRole("checkbox", { name: "Select row 2" })).not.toBeChecked();
    await userEvent.click(screen.getByRole("checkbox", { name: "Select row 2" }), { force: true });
    await screen.getByRole("button", { name: "Clear selection" }).click();
    await expect.element(screen.getByRole("checkbox", { name: "Select row 2" })).not.toBeChecked();
    await expect.element(screen.getByRole("checkbox", { name: "Select all rows" })).toHaveFocus();
  });
});

describe("Table bulkActions overflow", () => {
  it("moves the actions that don't fit into a More menu", async () => {
    const onLink = vi.fn();
    const actions = ["One", "Two", "Three", "Four", "Five"].map((name) => ({ id: name, icon: "icon-archive-line" as const, label: `${name} 2 rows`, onClick: name === "Five" ? onLink : () => undefined }));
    const screen = await render(<ZenProvider><div style={{ width: 280 }}>
      <Table aria-label="Members" rows={members} getRowId={(m) => m.id} selectable selectedIds={["a", "b"]} onSelectionChange={() => undefined}
        columns={[{ id: "name", header: "Name", cell: (m: Member) => m.name }]} bulkActions={actions} />
    </div></ZenProvider>);
    const bar = screen.getByRole("toolbar", { name: "Actions for 2 selected rows" });
    await bar.getByRole("button", { name: "More actions" }).click();
    await screen.getByRole("menuitem", { name: "Five 2 rows" }).click();
    expect(onLink).toHaveBeenCalledTimes(1);
    expect(bar.getByRole("button", { name: "One 2 rows" }).elements()).toHaveLength(1);
    expect(bar.getByRole("button", { name: "Five 2 rows" }).elements()).toHaveLength(0);
  });
});

describe("Table onRowClick", () => {
  it("opens a row on click and with Enter, but not from a control inside it", async () => {
    const onRowClick = vi.fn();
    const onArchive = vi.fn();
    const screen = await render(<ZenProvider><Table aria-label="Members" rows={members} onRowClick={onRowClick}
      columns={[{ id: "name", header: "Name", cell: (row) => row.name }, { id: "actions", header: "Actions", cell: (row) => <Button level="tertiary" size="sm" onClick={() => onArchive(row.id)}>Archive</Button> }]} /></ZenProvider>);
    await screen.getByRole("cell", { name: "Bao Tran" }).click();
    expect(onRowClick).toHaveBeenLastCalledWith(members[1]);
    await screen.getByRole("button", { name: "Archive" }).nth(0).click();
    expect(onArchive).toHaveBeenCalledWith("a");
    expect(onRowClick).toHaveBeenCalledTimes(1);
    const third = screen.getByRole("row").nth(3);
    (third.element() as HTMLElement).focus();
    await userEvent.keyboard("{Enter}");
    expect(onRowClick).toHaveBeenLastCalledWith(members[2]);
  });

  it("does not open a row from a Menu item the row opened (portal)", async () => {
    const onRowClick = vi.fn();
    const onMove = vi.fn();
    const screen = await render(<ZenProvider><Table aria-label="Members" rows={members} onRowClick={onRowClick}
      columns={[{ id: "name", header: "Name", cell: (row) => row.name }, { id: "actions", header: "Actions", cell: (row) => (
        <Menu trigger={<Button level="tertiary" size="sm">More</Button>} items={[{ id: "move", label: "Move", onSelect: () => onMove(row.id) }]} />
      ) }]} /></ZenProvider>);
    await screen.getByRole("button", { name: "More" }).nth(0).click();
    await screen.getByRole("menuitem", { name: "Move" }).click();
    expect(onMove).toHaveBeenCalledWith("a");
    expect(onRowClick).not.toHaveBeenCalled();
  });
});

describe("Pagination", () => {
  it("moves between pages and marks the current one", async () => {
    function Pager() {
      const [page, setPage] = useState(1);
      return <Pagination page={page} onPageChange={setPage} pageCount={5} />;
    }
    const screen = await render(<ZenProvider><Pager /></ZenProvider>);
    await expect.element(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
    await screen.getByRole("button", { name: "Next page" }).click();
    await expect.element(screen.getByRole("button", { name: "Page 2" })).toHaveAttribute("aria-current", "page");
  });
});

describe("Accordion", () => {
  it("toggles with the header button and reports aria-expanded", async () => {
    const onExpandedChange = vi.fn();
    const screen = await render(<ZenProvider><Accordion title="Shipping" onExpandedChange={onExpandedChange}>Ships in 2 days.</Accordion></ZenProvider>);
    const button = screen.getByRole("button", { name: "Shipping" });
    await expect.element(button).toHaveAttribute("aria-expanded", "false");
    await button.click();
    await expect.element(button).toHaveAttribute("aria-expanded", "true");
    expect(onExpandedChange).toHaveBeenLastCalledWith(true);
  });
});

describe("Form + useFormState", () => {
  function Invite({ onSubmit }: { onSubmit: (values: { name: string; email: string }) => void }) {
    const form = useFormState({
      initialValues: { name: "", email: "" },
      validate: (v) => ({ name: v.name ? undefined : "Enter a name", email: /.+@.+/.test(v.email) ? undefined : "Enter an email address" }),
      onSubmit: async (values) => onSubmit(values),
    });
    return (
      <Form form={form}>
        <InputField label="Name" {...form.field("name")} />
        <InputField label="Email" type="email" {...form.field("email")} />
        <FormActions><Button type="submit" level="primary">Send invite</Button></FormActions>
      </Form>
    );
  }

  it("shows every error on submit and focuses the first invalid field", async () => {
    const onSubmit = vi.fn();
    const screen = await render(<ZenProvider><Invite onSubmit={onSubmit} /></ZenProvider>);
    await screen.getByRole("button", { name: "Send invite" }).click();
    expect(onSubmit).not.toHaveBeenCalled();
    await expect.element(screen.getByText("Enter a name")).toBeVisible();
    await expect.element(screen.getByText("Enter an email address")).toBeVisible();
    await expect.element(screen.getByRole("textbox", { name: "Name" })).toHaveFocus();
    await expect.element(screen.getByRole("textbox", { name: "Name" })).toHaveAttribute("aria-invalid", "true");
  });

  it("submits the values once every field is valid", async () => {
    const onSubmit = vi.fn();
    const screen = await render(<ZenProvider><Invite onSubmit={onSubmit} /></ZenProvider>);
    await userEvent.fill(screen.getByRole("textbox", { name: "Name" }), "Ava Nguyen");
    await userEvent.fill(screen.getByRole("textbox", { name: "Email" }), "ava@example.com");
    await screen.getByRole("button", { name: "Send invite" }).click();
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ name: "Ava Nguyen", email: "ava@example.com" }));
  });
});

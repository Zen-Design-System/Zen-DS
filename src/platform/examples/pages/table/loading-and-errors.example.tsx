import { useId, useRef, useState } from "react";
import { Box, Heading, IconButton, InlineMessage, SkeletonText, Stack, Table, TableText, VisuallyHidden, plural, type TableColumn } from "@zen-ds/react";
import { daysFromToday, formatDate, formatMoney, people, type PersonId } from "../../data";

/* Say it failed, keep the way to try again. */
type Expense = { id: string; item: string; person: PersonId; date: Date; amount: number };
const expenses: Expense[] = [
  { id: "e1", item: "Figma seats for October", person: "alex", date: daysFromToday(-29), amount: 1080 },
  { id: "e2", item: "Client lunch with Phin & Co", person: "duy", date: daysFromToday(-18), amount: 86.4 },
  { id: "e3", item: "Usability session incentives", person: "ava", date: daysFromToday(-9), amount: 250 },
  { id: "e4", item: "Stock photos for Brand refresh", person: "gia", date: daysFromToday(-4), amount: 29.99 },
];
const expenseColumns: TableColumn<Expense>[] = [
  { id: "item", header: "Expense", cell: (expense) => <TableText bold caption={people[expense.person].name}>{expense.item}</TableText> },
  { id: "date", header: "Date", width: "150px", cell: (expense) => <TableText>{formatDate(expense.date)}</TableText> },
  { id: "amount", header: "Amount (USD)", align: "right", width: "150px", cell: (expense) => <TableText>{formatMoney(expense.amount, true)}</TableText> },
];
// While loading, the same columns hold one placeholder per cell, shaped like what replaces it. A placeholder sits on the
// text line of its cell, so the row keeps the height of the text that replaces it; widths are in characters of the text.
const placeholder = (width: "short" | "long") => (
  <SkeletonText lines={1} style={{ display: "inline-flex", maxWidth: "100%", verticalAlign: "middle", width: width === "short" ? "8ch" : "20ch" }} />
);
const loadingColumns: TableColumn<number>[] = [
  { id: "item", header: "Expense", cell: () => <TableText bold caption={placeholder("short")}>{placeholder("long")}</TableText> },
  { id: "date", header: "Date", width: "150px", cell: () => <TableText>{placeholder("short")}</TableText> },
  { id: "amount", header: "Amount (USD)", align: "right", width: "150px", cell: () => <TableText>{placeholder("short")}</TableText> },
];

export default function SeptemberExpenses() {
  const headingId = useId();
  const regionRef = useRef<HTMLElement>(null);
  const [state, setState] = useState<"error" | "loading" | "ready">("error");
  const load = () => {
    setState("loading");
    // Try again leaves with the message (and Refresh is disabled while loading): focus moves to the table's place, not <body>.
    regionRef.current?.focus();
    setTimeout(() => setState("ready"), 1400);
  };
  return (
    <Stack as="section" gap="md" aria-labelledby={headingId}>
      <Stack direction="row" justify="between" align="center" gap="sm">
        <Heading level={4} id={headingId} textStyle="Heading/4">September expenses</Heading>
        <IconButton appearance="flat" level="primary" size="md" icon="icon-refresh-cw-01-line" aria-label="Refresh expenses" disabled={state === "loading"} onClick={load} />
      </Stack>
      <Box ref={regionRef} tabIndex={-1} aria-busy={state === "loading"}>
        {state === "error" ? (
          <InlineMessage theme="negative" title="Expenses couldn't load" action={{ label: "Try again", onClick: load }}>
            The finance service didn't answer in time. Your expenses are safe.
          </InlineMessage>
        ) : state === "loading" ? (
          <Table aria-labelledby={headingId} columns={loadingColumns} rows={[1, 2, 3, 4]} getRowId={String} />
        ) : (
          <Table aria-labelledby={headingId} columns={expenseColumns} rows={expenses} />
        )}
      </Box>
      <VisuallyHidden role="status">{state === "loading" ? "Loading expenses" : state === "ready" ? `${plural(expenses.length, "expense")} loaded` : ""}</VisuallyHidden>
    </Stack>
  );
}

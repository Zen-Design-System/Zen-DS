import { useState } from "react";
import { Button, Card, Checkbox, Form, FormActions, FormFieldset, Heading, Stack, Text, plural, useToast } from "@zen-ds/react";
import { formatRange } from "../../data";

const reportSections = [
  { id: "time", label: "Time entries", caption: "1,284 entries from 31 people" },
  { id: "invoices", label: "Invoices", caption: "14 invoices, sent and paid" },
  { id: "expenses", label: "Expenses", caption: "62 receipts with their categories" },
  { id: "budgets", label: "Project budgets", caption: "Budget and spend for 6 projects" },
];

/** A parent checkbox for a labelled group. */
export default function ExportSections() {
  const { toast } = useToast();
  const [picked, setPicked] = useState(["time", "invoices"]);
  const [error, setError] = useState<string>();
  const all = picked.length === reportSections.length;
  const some = picked.length > 0 && !all;
  const change = (next: string[]) => { setPicked(next); if (next.length) setError(undefined); };
  // The parent resolves a mixed group to "all"; from "all" it clears the group.
  const toggleAll = () => change(all ? [] : reportSections.map((section) => section.id));
  const toggle = (id: string, on: boolean) => change(on ? [...picked, id] : picked.filter((item) => item !== id));
  const submit = () => {
    if (!picked.length) { setError("Choose at least one section to export"); return; }
    toast({ title: "Q3 report exported", children: plural(picked.length, "section") });
  };
  return (
    <Card theme="default">
      <Form onSubmit={submit}>
        <Stack gap="xs">
          <Heading level={4} textStyle="Heading/Subheading">Q3 2026 studio report</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">{formatRange(new Date(2026, 6, 1), new Date(2026, 8, 30))} · PDF</Text>
        </Stack>
        <FormFieldset kind="checkbox" legend="Include in the export" error={error}>
          <Checkbox bold label="All sections" checked={all} indeterminate={some} onCheckedChange={toggleAll} />
          {/* The children line up with the parent's label: the mark's width plus the mark ↔ label gap. */}
          <Stack gap="sm" style={{ paddingInlineStart: "calc(var(--zen-checkbox-size-medium, 16px) + var(--zen-spacing-gap-small, 12px))" }}>
            {reportSections.map((section) => (
              <Checkbox key={section.id} label={section.label} caption={section.caption} checked={picked.includes(section.id)} onCheckedChange={(on) => toggle(section.id, on)} />
            ))}
          </Stack>
        </FormFieldset>
        <FormActions>
          <Button level="primary" type="submit">Export report</Button>
        </FormActions>
      </Form>
    </Card>
  );
}

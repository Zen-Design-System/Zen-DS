import { useId, useRef, useState } from "react";
import {
  Avatar, Badge, Button, Form, FormActions, Heading, Slider, Stack, Table, TableMedia, TableText, Text, plural, useToast,
  type BadgeTheme, type TableColumn,
} from "@zen-ds/react";
import { initials, people, projectById, type PersonId } from "../../data";

/** Share of a 40-hour week per person on Online banking redesign, next to what their other projects already take. */
type Allocation = { person: PersonId; other: number; share: number };
const savedAllocation: Allocation[] = [
  { person: "alex", other: 40, share: 50 },
  { person: "ava", other: 20, share: 80 },
  { person: "finn", other: 30, share: 60 },
  { person: "khoa", other: 50, share: 60 },
  { person: "hana", other: 70, share: 20 },
];
const WEEK_HOURS = 40;
const loadOf = (row: Allocation): { label: string; theme: BadgeTheme } => {
  const load = row.other + row.share;
  return load > 100 ? { label: "Overbooked", theme: "red" } : load === 100 ? { label: "Full", theme: "green" } : { label: "Available", theme: "neutral" };
};

export default function TeamAllocation() {
  const { toast } = useToast();
  const titleId = useId();
  const project = projectById("lumen-banking");
  const [saved, setSaved] = useState(savedAllocation);
  const [rows, setRows] = useState(savedAllocation);
  const changed = rows.some((row, index) => row.share !== saved[index].share);
  const setShare = (person: PersonId, share: number) => setRows((current) => current.map((row) => (row.person === person ? { ...row, share } : row)));
  const hours = rows.reduce((sum, row) => sum + (row.share * WEEK_HOURS) / 100, 0);
  const titleRef = useRef<HTMLHeadingElement>(null);
  // Both actions disable themselves once used: focus goes back to the title, one Tab before the first slider, not to
  // the page.
  const toTable = () => titleRef.current?.focus();
  const overbooked = rows.filter((row) => row.other + row.share > 100).length;
  const columns: TableColumn<Allocation>[] = [
    { id: "person", header: "Person", cell: (row) => {
      const person = people[row.person];
      return <TableMedia bold={false} caption={person.role}
        media={person.photo ? <Avatar size="sm" theme="photo" src={person.photo} alt="" /> : <Avatar size="sm" theme={person.theme} alt="">{initials(person.name)}</Avatar>}>{person.name}</TableMedia>;
    } },
    { id: "other", header: "Other projects", align: "right", width: "132px", cell: (row) => <TableText>{row.other}%</TableText> },
    { id: "share", header: "This project", width: "260px", cell: (row) => (
      // Small is the dense size: 10px rail, the dot floats. Stepped by 10%, the readout beside it keeps the exact value.
      <Stack direction="row" gap="xs" align="center">
        <Slider aria-label={`${people[row.person].name}, share of the week`} size="sm" step={10}
          value={row.share} onValueChange={(share) => setShare(row.person, share)}
          valueText={(share) => `${share}%, ${(share * WEEK_HOURS) / 100} hours a week`} />
        {/* Each share keeps four digits of width (ch follows the typography mode), so the sliders line up. */}
        <Text as="span" textStyle="Body/Base/Regular" width="hug" align="end" tabularNumbers style={{ minWidth: "4ch" }}>{row.share}%</Text>
      </Stack>
    ) },
    { id: "hours", header: "Hours per week", align: "right", width: "132px", cell: (row) => <TableText>{(row.share * WEEK_HOURS) / 100}</TableText> },
    { id: "load", header: "Load", width: "128px", cell: (row) => { const load = loadOf(row); return <Badge theme={load.theme} background="subtle">{load.label}</Badge>; } },
  ];
  return (
    // The table is a section of the page, not a widget: it lies on the page under its heading, with no container.
    <Form onSubmit={() => { toTable(); setSaved(rows); toast({ type: "positive", title: "Allocation saved" }); }} gap="md" aria-labelledby={titleId}>
      <Stack gap="xs">
        <Heading ref={titleRef} level={4} textStyle="Heading/4" id={titleId} tabIndex={-1}>Team allocation</Heading>
        <Text textStyle="Body/Small/Regular" tone="base">
          {project.name} · {project.client} · {hours} hours a week{overbooked ? ` · ${plural(overbooked, "person", "people")} overbooked` : ""}
        </Text>
      </Stack>
      <Table aria-labelledby={titleId} columns={columns} rows={rows} getRowId={(row) => row.person} />
      {/* Both actions wait for a change; the status says why they turned on. */}
      <FormActions align="between">
        <Text as="span" role="status" textStyle="Body/Small/Regular" tone="base">{changed ? "Unsaved changes" : ""}</Text>
        <Button level="tertiary" disabled={!changed} onClick={() => { toTable(); setRows(saved); }}>Cancel</Button>
        <Button level="primary" type="submit" disabled={!changed}>Save allocation</Button>
      </FormActions>
    </Form>
  );
}

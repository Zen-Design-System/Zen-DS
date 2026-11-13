import { useId, useState } from "react";
import { Avatar, BadgeStatus, DockIcon, Heading, Stack, Table, TableBadges, TableMedia, TableText, type TableSort } from "@zen-ds/react";
import { formatDate, formatMoney, initials, people, projectProgress, projectStep, projects, type Person, type Project } from "../../data";

const person = (id: string) => (people as Record<string, Person>)[id];
/** Photo when the person has one, initials on their steady theme otherwise. The name sits next to it, so alt is empty. */
const avatarFor = (p: Person) => p.photo ? { theme: "photo" as const, src: p.photo, alt: "" } : { theme: p.theme, children: initials(p.name) };

const clientProjects = projects.filter((p) => p.budget > 0);
const sortProjects = (rows: Project[], sort: TableSort | null) => {
  if (!sort) return rows;
  const dir = sort.direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => dir * (sort.columnId === "name" ? a.name.localeCompare(b.name) : sort.columnId === "due" ? a.due.getTime() - b.due.getTime() : a.budget - b.budget));
};

export default function ProjectTable() {
  const titleId = useId();
  const [sort, setSort] = useState<TableSort | null>({ columnId: "due", direction: "asc" });
  return (
    // A section of the page: its h4 names the table, which lies on the page with no container.
    <Stack as="section" gap="xs" aria-labelledby={titleId} width="fill">
      <Heading level={4} id={titleId} textStyle="Heading/4">Client projects</Heading>
      <Table aria-labelledby={titleId} rows={sortProjects(clientProjects, sort)} getRowId={(row) => row.id} sort={sort} onSortChange={setSort}
      columns={[
        { id: "name", header: "Project", sortable: true, cell: (row) => (
          <TableMedia bold media={<DockIcon icon={row.icon} theme={row.theme} background="subtle" size="sm" />} caption={row.client}>{row.name}</TableMedia>
        ) },
        { id: "lead", header: "Lead", width: "200px", cell: (row) => (
          <TableMedia media={<Avatar size="xs" {...avatarFor(person(row.lead))} />} bold={false}>{person(row.lead).name}</TableMedia>
        ) },
        { id: "status", header: "Status", width: "140px", cell: (row) => <TableBadges><BadgeStatus status={projectStep[row.status]} progress={projectProgress(row)}>{row.status}</BadgeStatus></TableBadges> },
        { id: "due", header: "Due", width: "150px", sortable: true, cell: (row) => <TableText>{formatDate(row.due)}</TableText> },
        { id: "budget", header: "Budget", align: "right", width: "140px", sortable: true, cell: (row) => <TableText>{formatMoney(row.budget, true)}</TableText> },
      ]} />
    </Stack>
  );
}

import { useId, useState } from "react";
import { Avatar, Heading, Stack, Table, TableMedia, TableText, type AvatarSize, type TableColumn, type TableSort } from "@zen-ds/react";
import { formatDate, initials, people, type Person, type PersonId } from "../../data";

/** People are Avatars: a photo when there is one, otherwise initials on the person's steady theme. Subtle beside other
 *  content; `lead` in a table's first column, the row's name, where initials are Solid (table/first-column-avatar-solid). */
function PersonAvatar({ person, size, lead = false }: { person: Person; size: AvatarSize; lead?: boolean }) {
  return person.photo
    ? <Avatar size={size} theme="photo" src={person.photo} alt="" />
    : <Avatar size={size} theme={person.theme} background={lead ? "solid" : "subtle"} alt="">{initials(person.name)}</Avatar>;
}

/* The studio's design and engineering people. */
type Member = { id: PersonId; joined: Date; hours: number };
// The team page's own order (by team, then by seniority) is what "no sort" returns to.
const members: Member[] = [
  { id: "alex", joined: new Date(2019, 2, 4), hours: 41.5 },
  { id: "gia", joined: new Date(2021, 4, 17), hours: 40 },
  { id: "chi", joined: new Date(2022, 6, 11), hours: 38 },
  { id: "ava", joined: new Date(2023, 1, 6), hours: 36.5 },
  { id: "emi", joined: new Date(2024, 9, 14), hours: 30 },
  { id: "bao", joined: new Date(2020, 8, 1), hours: 44.5 },
  { id: "khoa", joined: new Date(2022, 2, 28), hours: 39 },
  { id: "finn", joined: new Date(2025, 0, 13), hours: 42 },
  { id: "em", joined: new Date(2025, 7, 4), hours: 35.5 },
];
const memberSortValue: Record<string, (member: Member) => string | number> = {
  name: (member) => people[member.id].name,
  joined: (member) => member.joined.getTime(),
  hours: (member) => member.hours,
};
function sortMembers(rows: Member[], sort: TableSort | null) {
  if (!sort) return rows;
  const value = memberSortValue[sort.columnId];
  const sign = sort.direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = value(a), y = value(b);
    return sign * (typeof x === "string" ? x.localeCompare(String(y)) : x - Number(y));
  });
}
const memberColumns: TableColumn<Member>[] = [
  { id: "name", header: "Name", sortable: true, cell: (member) => <TableMedia bold media={<PersonAvatar person={people[member.id]} size="sm" lead />} caption={people[member.id].role}>{people[member.id].name}</TableMedia> },
  { id: "team", header: "Team", width: "150px", cell: (member) => <TableText>{people[member.id].team}</TableText> },
  { id: "location", header: "Location", width: "180px", cell: (member) => <TableText>{people[member.id].location}</TableText> },
  { id: "joined", header: "Joined", sortable: true, width: "150px", cell: (member) => <TableText>{formatDate(member.joined)}</TableText> },
  { id: "hours", header: "Hours this week", sortable: true, align: "right", width: "170px", cell: (member) => <TableText>{member.hours.toFixed(1)}</TableText> },
];

export default function TeamMembers() {
  const headingId = useId();
  const [sort, setSort] = useState<TableSort | null>({ columnId: "name", direction: "asc" });
  return (
    <Stack as="section" gap="md" aria-labelledby={headingId}>
      <Heading level={4} id={headingId} textStyle="Heading/4">Design and engineering</Heading>
      <Table aria-labelledby={headingId} columns={memberColumns} rows={sortMembers(members, sort)} sort={sort} onSortChange={setSort} />
    </Stack>
  );
}

import { useRef, useState, type RefObject } from "react";
import { AppShell, Avatar, Chip, EmptyState, List, ListItem, Stack, Text, TopNavigation, plural } from "@zen-ds/react";
import { initials, peopleList, type Person } from "../../data";

/** A person as Avatar props: their photo, or initials on their steady theme. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, children: initials(person.name) };

type SortId = "name" | "team" | "location";
const sorts: { id: SortId; label: string }[] = [{ id: "name", label: "Name" }, { id: "team", label: "Team" }, { id: "location", label: "Location" }];
const quickFilters = [
  { id: "online", label: "Online", test: (person: Person) => Boolean(person.online) },
  { id: "design", label: "Design", test: (person: Person) => person.team === "Design" },
  { id: "engineering", label: "Engineering", test: (person: Person) => person.team === "Engineering" },
  { id: "hanoi", label: "Hanoi", test: (person: Person) => person.location === "Hanoi" },
];

/** The studio's Team tab: a sideways row of filter chips over the whole team. */
// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function TeamFilters({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const [sort, setSort] = useState<SortId>("name");
  const [on, setOn] = useState<string[]>([]);
  const countRef = useRef<HTMLParagraphElement>(null);
  const toggle = (id: string) => setOn((list) => list.includes(id) ? list.filter((item) => item !== id) : [...list, id]);
  // Clear filters goes away once pressed, so the focus moves to the count it changed.
  const clearFilters = () => {
    setOn([]);
    setTimeout(() => countRef.current?.focus());
  };
  // Every filter that is on must match; then by the sort, and by name within it.
  const sortKey = (person: Person) => (sort === "team" ? person.team : sort === "location" ? person.location : "");
  const rows = peopleList
    .filter((person) => quickFilters.every((filter) => !on.includes(filter.id) || filter.test(person)))
    .sort((a, b) => sortKey(a).localeCompare(sortKey(b)) || a.name.localeCompare(b.name));
  const sortLabel = sorts.find((item) => item.id === sort)!.label;
  return (
    // A tab root: the whole studio is listed, so the screen scrolls and the large title folds under the bar.
    <AppShell topNavigation={<TopNavigation scrollRef={scrollRef} type="alt" title="Team" largeTitle="Team" />}>
      <Stack gap="md">
        {/* One row that scrolls sideways; on a phone Sort's items open in a Bottom Sheet by themselves, not a Popover.
            It runs to the screen's edges, past the page margin, so a chip cut at the edge shows there is more. */}
        <Stack direction="row" gap="xs" scroll="x" paddingY="2xs" role="group" aria-label="Filters"
          style={{ marginInline: "calc(-1 * var(--zen-margin-comfortable, 20px))", paddingInline: "var(--zen-margin-comfortable, 20px)" }}>
          <Chip variant="advanced" popoverLabel="Sort by" popoverItems={sorts.map((item) => ({ id: item.id, label: item.label, selected: item.id === sort }))}
            onPopoverSelect={(item) => setSort(item.id as SortId)}>
            {`Sort: ${sortLabel}`}
          </Chip>
          {quickFilters.map((filter) => (
            <Chip key={filter.id} variant="normal" level="secondary" selected={on.includes(filter.id)} onClick={() => toggle(filter.id)}>
              {filter.label}
            </Chip>
          ))}
        </Stack>
        <Stack gap="xs">
          <Text ref={countRef} tabIndex={-1} role="status" textStyle="Body/Small/Regular" tone="base">{plural(rows.length, "person", "people")}</Text>
          {rows.length ? (
            <List aria-label="People">
              {rows.map((person) => (
                <ListItem key={person.id} title={person.name} caption={`${person.role} · ${person.location}`}
                  leading={<Avatar size="md" status={person.online} {...avatarOf(person)} />} />
              ))}
            </List>
          ) : (
            <EmptyState headingLevel={2} icon="icon-search-medium-line" title="No people match" secondaryAction={{ label: "Clear filters", onClick: clearFilters }}>
              Turn off a filter to see more of the team.
            </EmptyState>
          )}
        </Stack>
      </Stack>
    </AppShell>
  );
}

import { useRef, useState, type CSSProperties } from "react";
import { Avatar, Box, EmptyState, Heading, List, ListBox, ListItem, Search, Stack, Text, plural } from "@zen-ds/react";
import { initials, peopleList, type Person } from "../../data";

/** A person as Avatar props: their photo, or initials on their steady theme. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, children: initials(person.name) };
/** True when the query is empty or any field contains it (case-insensitive). */
const matches = (query: string, ...fields: string[]) => {
  const q = query.trim().toLowerCase();
  return !q || fields.some((field) => field.toLowerCase().includes(q));
};
/** A long result list scrolls inside its ListBox instead of stretching the grid row: five whole rows (Avatar Medium plus
 *  the row's own Padding/Small above and below, Spacing/Gap/3XSmall between them), framed by Pale rules that run to the
 *  box edge so rows clearly run on under them. The scroller spans the ListBox body's side padding (Card-padding-medium)
 *  and pads it back, so the rows line up with the header and a row's fill stays inside; the bottom rule keeps a
 *  Corner-Radius/2XLarge clearance from the box's bottom edge, so its ends never cross the rounded corners. */
const resultsScroller: CSSProperties = {
  boxSizing: "content-box",
  maxHeight: "calc(5 * (var(--zen-image-size-medium, 40px) + 2 * var(--zen-spacing-padding-small, 12px)) + 4 * var(--zen-spacing-gap-3-xsmall, 2px))",
  marginInline: "calc(-1 * var(--zen-card-padding-medium, 24px))",
  marginBlockEnd: "calc(var(--zen-corner-radius-2-xlarge, 24px) - var(--zen-list-container-vertical-padding, 12px))",
  paddingInline: "var(--zen-card-padding-medium, 24px)",
  borderBlock: "1px solid var(--zen-color-border-neutral-pale-default)",
};

/** The directory narrows on every keystroke; the count under the field is announced. */
export default function Directory() {
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const rows = peopleList.filter((person) => matches(query, person.name, person.role, person.team, person.location));
  const clear = () => { setQuery(""); searchRef.current?.focus(); };
  return (
    // A ListBox: the title, the search and its count in its Header-Slot; the results (or the Empty State) in its Body-Slot.
    <Stack><ListBox width="fill" maxWidth={440} alignSelf="center"
      header={<>
        <Heading level={4} textStyle="Heading/Subheading">Studio directory</Heading>
        <Stack gap="xs">
          <Search ref={searchRef} placeholder="Search people" value={query} onValueChange={setQuery} />
          <Text role="status" textStyle="Body/Small/Regular" tone="base">{plural(rows.length, "person", "people")}</Text>
        </Stack>
      </>}>
      {rows.length ? (
        // The list scrolls inside the box; the region takes focus so the keyboard can scroll it too.
        <Box scroll="y" style={resultsScroller} role="region" aria-label="Directory results" tabIndex={0}>
          <List aria-label="People">
            {rows.map((person) => (
              <ListItem key={person.id} title={person.name} caption={`${person.role} · ${person.location}`}
                leading={<Avatar size="md" {...avatarOf(person)} />} />
            ))}
          </List>
        </Box>
      ) : (
        <EmptyState size="sm" headingLevel={5} icon="icon-search-medium-line" title={`No people match “${query.trim()}”`}
          secondaryAction={{ label: "Clear search", onClick: clear }}>
          Try a first name, a team such as Design, or a city.
        </EmptyState>
      )}
    </ListBox></Stack>
  );
}

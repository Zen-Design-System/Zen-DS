import { useRef, useState } from "react";
import { Avatar, Card, Chip, EmptyState, FileIcon, List, ListBox, ListItem, Stack, Text, fileIconFormatOf, plural } from "@zen-ds/react";
import { files, formatBytes, formatRelative, initials, people, peopleList, type Person, type PersonId, type StudioFile } from "../../data";

/** A person as Avatar props: their photo, or initials on their steady theme. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, children: initials(person.name) };

// Short names, so a row never has to cut one off.
const studioFiles: StudioFile[] = [
  { ...files[0], name: "Points history.fig" },
  { ...files[1], name: "Usability plan.pdf" },
  { ...files[2], name: "Rewards API.json" },
  { ...files[3], name: "Q3 report.xlsx" },
  { ...files[4], name: "Brand kickoff.key" },
  { ...files[5], name: "Launch video.mp4" },
];

/** The studio's files filtered by owner: an Advanced chip whose Popover searches everyone in the studio. */
export default function FilterByOwner() {
  const [ownerId, setOwnerId] = useState<PersonId | null>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const owner = ownerId ? people[ownerId] : null;
  const shown = studioFiles.filter((file) => !ownerId || file.owner === ownerId);
  // Show all files goes away once pressed, so the focus moves to the count it changed.
  const showAll = () => {
    setOwnerId(null);
    setTimeout(() => countRef.current?.focus());
  };
  // Everyone in the studio is listed, so the popover gets a search field; photos and initials lead each row.
  const ownerItems = peopleList.map((person) => ({
    id: person.id, label: person.name, caption: person.role, selected: person.id === ownerId,
    ...(person.photo ? { photoSrc: person.photo } : { leading: <Avatar size="sm" {...avatarOf(person)} />, theme: "avatar-small" as const }),
  }));
  return (
    <Stack gap="md">
      <Stack direction="row" gap="xs" align="center" justify="between" wrap>
        <Chip variant="advanced" selected={Boolean(owner)} photoSrc={owner?.photo}
          leading={owner && !owner.photo ? <Avatar size="xs" {...avatarOf(owner)} /> : undefined} theme={owner ? "leading-photo" : undefined}
          popoverLabel="Owner" popoverSearch popoverSearchPlaceholder="Search people" popoverItems={ownerItems}
          onPopoverSelect={(item) => setOwnerId(item.id as PersonId)} onClearSelection={() => setOwnerId(null)}>
          {owner?.name ?? "Owner"}
        </Chip>
        <Text ref={countRef} tabIndex={-1} role="status" as="span" textStyle="Body/Small/Regular" tone="base">{plural(shown.length, "file")}</Text>
      </Stack>
      {/* A static surface on the stage: the ListBox's Body-Slot insets the rows (they pad 0). */}
      {shown.length ? (
        <ListBox>
          <List aria-label="Files">
            {shown.map((file) => (
              <ListItem key={file.id} title={file.name} caption={`${formatBytes(file.bytes)} · ${people[file.owner].name} · ${formatRelative(file.updated)}`}
                leading={<FileIcon format={fileIconFormatOf(file.name)} size="xl" />} />
            ))}
          </List>
        </ListBox>
      ) : (
        <Card theme="default">
          <EmptyState size="sm" headingLevel={4} icon="icon-search-medium-line" title="No files match" secondaryAction={{ label: "Show all files", onClick: showAll }}>
            {`${owner?.name} doesn't own any files yet.`}
          </EmptyState>
        </Card>
      )}
    </Stack>
  );
}

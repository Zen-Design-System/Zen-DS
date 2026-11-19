import { useState } from "react";
import { Box, Card, EmptyState, FileIcon, Grid, Heading, Icon, Image, List, ListItem, Search, Segmented, Stack, Text, fileIconFormatOf, plural } from "@zen-ds/react";
import { TODAY, daysFromToday, formatBytes, formatRelative, people, photos, type PersonId, type Photo } from "../../data";

const minutesAgo = (minutes: number) => new Date(TODAY.getTime() - minutes * 60_000);
type BrandFile = { id: string; name: string; bytes: number; owner: PersonId; updated: Date; photo?: Photo };
const brandFiles: BrandFile[] = [
  { id: "b1", name: "Moodboard.fig", bytes: 24_600_000, owner: "gia", updated: minutesAgo(13) },
  { id: "b2", name: "Forest creek.jpg", bytes: 3_420_000, owner: "emi", updated: daysFromToday(0, 9, 12), photo: photos.feed[1] },
  { id: "b3", name: "Mountain road.jpg", bytes: 2_910_000, owner: "emi", updated: daysFromToday(-1, 16, 5), photo: photos.feed[3] },
  { id: "b4", name: "Snow peaks.jpg", bytes: 3_080_000, owner: "emi", updated: daysFromToday(-1, 16, 2), photo: photos.feed[4] },
  { id: "b5", name: "Moss study.jpg", bytes: 2_240_000, owner: "gia", updated: daysFromToday(-2, 9, 40), photo: photos.feed[7] },
  { id: "b6", name: "Brand brief.pdf", bytes: 1_240_000, owner: "linh", updated: daysFromToday(-5, 14, 20) },
  { id: "b7", name: "Kickoff deck.key", bytes: 42_700_000, owner: "gia", updated: daysFromToday(-16, 11, 0) },
  { id: "b8", name: "Competitor audit.xlsx", bytes: 860_000, owner: "linh", updated: daysFromToday(-20, 17, 45) },
];
const fileMeta = (file: BrandFile) => `${formatBytes(file.bytes)} · ${people[file.owner].name} · ${formatRelative(file.updated)}`;

export default function GridOrListView() {
  const [view, setView] = useState("grid");
  const [query, setQuery] = useState("");
  const shown = brandFiles.filter((file) => file.name.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <Card theme="default">
      <Stack gap="md">
        <Stack gap="xs">
          <Heading level={4} textStyle="Heading/Subheading">Brand refresh files</Heading>
          <Text role="status" textStyle="Body/Small/Regular" tone="base">{`Saola Outdoor · ${plural(shown.length, "file")}`}</Text>
        </Stack>
        <Stack direction="row" justify="between" align="center" gap="xs">
          {/* The search takes a readable width and shrinks on a narrow page; the view switch keeps its own width at the
              end of the row (two icons never scroll inside it). */}
          <Box width="fill" maxWidth={240}><Search placeholder="Search files" value={query} onValueChange={setQuery} /></Box>
          <Stack width="hug">
            {/* Icon-only segments: each option carries its own name, the icon is decorative. */}
            <Segmented aria-label="Layout" value={view} onValueChange={setView} options={[
              { id: "grid", label: null, "aria-label": "Grid view", leading: <Icon name="icon-grid-01-line" decorative /> },
              { id: "list", label: null, "aria-label": "List view", leading: <Icon name="icon-list-line" decorative /> },
            ]} />
          </Stack>
        </Stack>
        {!shown.length ? (
          <EmptyState size="sm" headingLevel={5} icon="icon-search-medium-line" title="No files match" secondaryAction={{ label: "Show all files", onClick: () => setQuery("") }}>
            {`No file name in Brand refresh contains “${query.trim()}”.`}
          </EmptyState>
        ) : view === "list" ? (
          <List aria-label="Brand refresh files">
            {shown.map((file) => (
              <ListItem key={file.id} title={file.name} caption={fileMeta(file)} leading={<FileIcon format={fileIconFormatOf(file.name)} size="xl" />} />
            ))}
          </List>
        ) : (
          // Four previews a row on a desktop page, two on a phone.
          <Grid as="ul" aria-label="Brand refresh files" minColumnWidth="clamp(104px, 22%, 220px)" gap="md">
            {shown.map((file) => (
              <Stack as="li" key={file.id} gap="xs">
                {/* A file without a picture shows its icon in the same 4:3 frame as the photos. */}
                {file.photo
                  ? <Image src={file.photo.src} alt={file.photo.alt} ratio="4:3" radius="md" />
                  : <Stack surface="surface-alt" radius="md" align="center" justify="center" style={{ aspectRatio: "4 / 3" }}><FileIcon format={fileIconFormatOf(file.name)} size="3xl" /></Stack>}
                <Stack gap="2xs">
                  <Text textStyle="Body/Small/Bold">{file.name}</Text>
                  <Text textStyle="Body/Small/Regular" tone="base">{`${formatBytes(file.bytes)} · ${formatRelative(file.updated)}`}</Text>
                </Stack>
              </Stack>
            ))}
          </Grid>
        )}
      </Stack>
    </Card>
  );
}

import { useId, useState } from "react";
import {
  Avatar, Chip, DescriptionList, Heading, Image, SidePanel, Stack, Table, TableMedia, TableText, Text, Thumbnail, plural, useToast, useZen,
  type TableColumn, type TableSort,
} from "@zen-ds/react";
import { TODAY, daysFromToday, formatBytes, formatRelative, initials, people, photos, projectById, type Person, type PersonId, type Photo } from "../../data";

const minutesAgo = (minutes: number) => new Date(TODAY.getTime() - minutes * 60_000);
/** A person as Avatar props: their photo, or initials on their steady theme. The text beside it already names them. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, alt: "", children: initials(person.name) };

type Asset = { id: string; name: string; photo: Photo; width: number; height: number; bytes: number; owner: PersonId; project: string; updated: Date };
const asset = (id: string, name: string, photo: Photo, [width, height]: [number, number], bytes: number, owner: PersonId, project: string, updated: Date): Asset =>
  ({ id, name, photo, width, height, bytes, owner, project, updated });
const landscape: [number, number] = [4032, 3024];
const square: [number, number] = [3024, 3024];
const assets: Asset[] = [
  asset("creek", "forest-creek.jpg", photos.feed[1], landscape, 2_400_000, "gia", "saola-brand", minutesAgo(13)),
  asset("field", "sunset-field.jpg", photos.feed[0], landscape, 2_200_000, "emi", "saola-brand", daysFromToday(-1, 16, 5)),
  asset("peaks", "snow-peaks.jpg", photos.feed[4], landscape, 3_100_000, "emi", "saola-brand", daysFromToday(-3, 9, 50)),
  asset("road", "valley-road-tall.jpg", photos.mountainRoad, [1170, 2532], 1_600_000, "gia", "saola-brand", daysFromToday(-4, 14, 15)),
  asset("cafe", "counter-at-nguyen-hue.jpg", photos.site[5], square, 1_800_000, "chi", "phin-loyalty", daysFromToday(-9, 11, 0)),
  asset("bridge", "bridge-at-dusk.jpg", photos.site[4], square, 2_100_000, "ava", "lumen-banking", daysFromToday(-15, 17, 30)),
  asset("courtyard", "venue-courtyard.jpg", photos.site[0], square, 1_900_000, "linh", "bookfair-site", daysFromToday(-22, 10, 10)),
  asset("old-quarter", "old-quarter-from-the-hill.jpg", photos.site[2], square, 2_270_000, "linh", "bookfair-site", daysFromToday(-22, 10, 25)),
];
const assetProjects = [...new Set(assets.map((item) => item.project))];
const sortValue: Record<string, (item: Asset) => string | number> = {
  name: (item) => item.name,
  updated: (item) => item.updated.getTime(),
  size: (item) => item.bytes,
};
// A captioned media cell takes a Small (32px) Thumbnail, like an Avatar; alt="" because the cell names the file.
const photoCell = (caption: (item: Asset) => string): TableColumn<Asset> => ({
  id: "name", header: "Photo", sortable: true,
  cell: (item) => <TableMedia bold media={<Thumbnail src={item.photo.src} alt="" size="sm" />} caption={caption(item)}>{item.name}</TableMedia>,
});
const assetColumns: TableColumn<Asset>[] = [
  photoCell((item) => `${item.width} × ${item.height}`),
  { id: "project", header: "Project", width: "220px", cell: (item) => <TableText caption={projectById(item.project).client}>{projectById(item.project).name}</TableText> },
  { id: "owner", header: "Owner", width: "160px", cell: (item) => <TableMedia bold={false} media={<Avatar size="xs" {...avatarOf(people[item.owner])} />}>{people[item.owner].name}</TableMedia> },
  { id: "updated", header: "Updated", sortable: true, width: "190px", cell: (item) => <TableText>{formatRelative(item.updated)}</TableText> },
  { id: "size", header: "Size", sortable: true, align: "right", width: "100px", cell: (item) => <TableText>{formatBytes(item.bytes)}</TableText> },
];
/** On a phone the five columns would leave the photo column alone on screen with the rest scrolled away: the table keeps
    one column, and each photo's size and date move into its caption. */
const compactColumns: TableColumn<Asset>[] = [photoCell((item) => `${formatBytes(item.bytes)} · ${formatRelative(item.updated)}`)];

/** An asset library: a Thumbnail in each table row. */
export default function AssetLibrary() {
  const { toast } = useToast();
  const compact = useZen()?.breakpoint === "mobile";
  const [project, setProject] = useState<string | null>(null);
  const [sort, setSort] = useState<TableSort | null>({ columnId: "updated", direction: "desc" });
  const [openId, setOpenId] = useState<string | null>(null);
  const headingId = useId();
  const opened = assets.find((item) => item.id === openId);
  const rows = assets.filter((item) => !project || item.project === project);
  const sorted = sort ? [...rows].sort((a, b) => {
    const x = sortValue[sort.columnId](a), y = sortValue[sort.columnId](b);
    const order = typeof x === "string" ? x.localeCompare(String(y)) : x - Number(y);
    return sort.direction === "asc" ? order : -order;
  }) : rows;
  return (
    // A table that is a section of the page sits on the page: no Card around it.
    <Stack as="section" gap="md" aria-labelledby={headingId}>
      <Heading level={4} id={headingId} textStyle="Heading/4">Photos</Heading>
      <Stack direction="row" gap="xs" align="center" wrap>
        <Chip variant="advanced" dropdown selected={project !== null} popoverLabel="Project"
          popoverItems={assetProjects.map((id) => ({ id, label: projectById(id).name, selected: id === project }))}
          onPopoverSelect={(item) => setProject(item.id === project ? null : item.id)} onClearSelection={() => setProject(null)}>
          {project ? projectById(project).name : "Project"}
        </Chip>
        <Text as="span" role="status" textStyle="Body/Small/Regular" tone="base">{plural(rows.length, "photo")}</Text>
      </Stack>
      <Table aria-labelledby={headingId} columns={compact ? compactColumns : assetColumns} rows={sorted} sort={sort} onSortChange={setSort} onRowClick={(item) => setOpenId(item.id)} />
      <SidePanel type="modal" open={Boolean(opened)} onOpenChange={(next) => { if (!next) setOpenId(null); }}
        title={opened?.name ?? ""} description={opened ? projectById(opened.project).name : undefined}
        primaryAction={{ label: "Download", onClick: () => { if (opened) toast({ title: "Download started", children: opened.name }); setOpenId(null); } }}
        secondaryAction={{ label: "Close" }}>
        {opened ? (
          <Stack gap="lg">
            {/* No ratio: the picture keeps its own shape, portrait or landscape. */}
            <Image src={opened.photo.src} alt={opened.photo.alt} radius="md" loading="eager" />
            <DescriptionList divider items={[
              { id: "size", term: "Dimensions", description: `${opened.width} × ${opened.height} px` },
              { id: "bytes", term: "File size", description: formatBytes(opened.bytes) },
              { id: "owner", term: "Uploaded by", description: people[opened.owner].name },
              { id: "updated", term: "Updated", description: formatRelative(opened.updated) },
            ]} />
          </Stack>
        ) : null}
      </SidePanel>
    </Stack>
  );
}

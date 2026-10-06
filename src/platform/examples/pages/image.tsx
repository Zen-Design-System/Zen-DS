/* Image & Thumbnail examples (brief: docs/research/example-rebuild-brief-2026-09-30.md). Đìzai Studio, signed in as Alex
   Duong, Wednesday Sep 30, 2026, 10:30 am. Each example teaches one picture decision: a Thumbnail strip inside a named
   radio group, a frame that holds its place while loading and keeps it when a file fails, Thumbnails in list rows and
   table cells, cover or contain in fixed channel ratios, and lazy pictures in a phone feed. */
import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { Avatar } from "../../../components/Avatar";
import { Button, IconButton } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { Chip } from "../../../components/Chip";
import { DescriptionList } from "../../../components/DescriptionList";
import { Divider } from "../../../components/Divider";
import { EmptyState } from "../../../components/EmptyState";
import { Image, Thumbnail, type ImageRatio } from "../../../components/Image";
import { InlineMessage } from "../../../components/InlineMessage";
import { Grid, Stack } from "../../../components/Layout";
import { List, ListBox, ListItem } from "../../../components/ListItem";
import { Segmented } from "../../../components/Segmented";
import { SidePanel } from "../../../components/SidePanel";
import { Table, TableMedia, TableText, type TableColumn, type TableSort } from "../../../components/Table";
import { Heading, Text, plural } from "../../../components/Text";
import { useToast } from "../../../components/Toast";
import { TopNavigation } from "../../../components/TopNavigation";
import { VisuallyHidden } from "../../../components/VisuallyHidden";
import { platformMedia, type PlatformPhoto } from "../../PlatformMedia";
import { PlatformPhone } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import {
  TODAY, daysFromToday, formatBytes, formatDate, formatRelative, initials, people, projectById, type Person, type PersonId,
} from "../data";
import type { ExampleDef } from "../types";
import "./image.css";

export const page: PlatformPage = "image";

/** Bytes that are not a picture: the browser fails to decode them without a network request, so a demo can fail on cue. */
const unreadable = "data:image/png;base64,AAAA";
const minutesAgo = (minutes: number) => new Date(TODAY.getTime() - minutes * 60_000);
/** A person as Avatar props: their photo, or initials on their steady theme. The text beside it already names them. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, alt: "", children: initials(person.name) };

// ——— 1. Moodboard: a Thumbnail strip that picks one picture (a radio group) ——————————————————————————
// Gia's picks for Saola Outdoor's brand refresh (SAO-004).
type Pick = PlatformPhoto & { id: string; name: string; note: string };
const picks: Pick[] = [
  { id: "creek", ...platformMedia.feed[1], name: "Forest creek", note: "wet stone and deep greens for the trail range" },
  { id: "road", ...platformMedia.feed[3], name: "Mountain road", note: "long switchbacks for a sense of distance" },
  { id: "peaks", ...platformMedia.feed[4], name: "Snow peaks", note: "cold light for the winter shell line" },
  { id: "moss", ...platformMedia.feed[7], name: "Moss study", note: "texture reference for the packaging" },
  { id: "field", ...platformMedia.feed[0], name: "Sunset field", note: "warm evening tones for the campaign" },
  { id: "coast", ...platformMedia.feed[6], name: "Coast road", note: "golden hour, a candidate for the launch hero" },
  { id: "desert", ...platformMedia.feed[5], name: "Desert hills", note: "sand colours for the base layers" },
];

function Moodboard() {
  const [index, setIndex] = useState(0);
  const stripRef = useRef<HTMLElement>(null);
  const titleId = useId();
  const photo = picks[index];
  // One Tab stop (roving tabindex): the arrow keys (and Home/End) move the choice and focus with it, as in any radio group.
  const step = (event: KeyboardEvent<HTMLElement>) => {
    const last = picks.length - 1;
    const forward = index === last ? 0 : index + 1, back = index === 0 ? last : index - 1;
    const next = { ArrowRight: forward, ArrowDown: forward, ArrowLeft: back, ArrowUp: back, Home: 0, End: last }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    setIndex(next);
    stripRef.current?.querySelectorAll<HTMLElement>("button")[next]?.focus();
  };
  return (
    <Card as="section" theme="flat" aria-labelledby={titleId}>
      <Stack gap="md">
        <Stack gap="xs">
          <Heading level={4} id={titleId} textStyle="Heading/Subheading">Moodboard for the outdoor range</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">{`Saola Outdoor · ${plural(picks.length, "photo")} from ${people.gia.name}`}</Text>
        </Stack>
        {/* The first picture on screen loads eagerly; the caption adds what the picture can't say. */}
        <Image src={photo.src} alt={photo.alt} ratio="4:3" radius="lg" loading="eager" caption={`${photo.name} · ${photo.note}`} />
        <Stack ref={stripRef} direction="row" gap="xs" wrap role="radiogroup" aria-label="Moodboard photos" onKeyDown={step}>
          {picks.map((pick, i) => (
            // The radio carries the name and the checked state, so the Thumbnail inside is alt="".
            <button key={pick.id} type="button" role="radio" className="px-image-thumb" aria-label={pick.name} aria-checked={i === index}
              tabIndex={i === index ? 0 : -1} onClick={() => setIndex(i)}>
              <Thumbnail src={pick.src} alt="" size="lg" />
            </button>
          ))}
        </Stack>
        <VisuallyHidden role="status">{`${photo.name}, photo ${index + 1} of ${picks.length}`}</VisuallyHidden>
      </Stack>
    </Card>
  );
}

// ——— 2. Loading and failed: the frame holds its place, a failed file keeps it ——————————————————————
const venue = platformMedia.site[0];
const oldQuarter = platformMedia.site[2];

function RecapPhotos() {
  const [first, setFirst] = useState<string>();
  const [second, setSecond] = useState<string | undefined>(unreadable);
  const [failed, setFailed] = useState(false);
  const timers = useRef<number[]>([]);
  const titleId = useId();
  const titleRef = useRef<HTMLHeadingElement>(null);
  // The venue photo is still on its way; the Old Quarter file can't be read the first time.
  useEffect(() => {
    const list = timers.current;
    list.push(window.setTimeout(() => setFirst(venue.src), 1800));
    return () => list.forEach((timer) => window.clearTimeout(timer));
  }, []);
  const retry = () => {
    setFailed(false);
    setSecond(undefined);
    // The message (and its button) goes away, so focus moves to the card title.
    titleRef.current?.focus();
    timers.current.push(window.setTimeout(() => setSecond(oldQuarter.src), 1200));
  };
  return (
    <Card as="section" theme="flat" aria-labelledby={titleId}>
      <Stack gap="md">
        <Stack gap="xs">
          <Heading ref={titleRef} level={4} id={titleId} tabIndex={-1} textStyle="Heading/Subheading">Book Fair recap</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">{`Hanoi Book Fair · Draft post by ${people.linh.name}`}</Text>
        </Stack>
        {/* A ratio keeps each frame's size while its Skeleton shows, so nothing jumps when the picture arrives. */}
        <Grid columns={2} gap="md">
          <Image src={first} alt={venue.alt} ratio="4:3" caption="Venue courtyard · Emi Sato" />
          <Image src={second} alt={oldQuarter.alt} ratio="4:3" caption="Old Quarter from the hill · Emi Sato" onError={() => setFailed(true)} />
        </Grid>
        {failed ? (
          <InlineMessage theme="negative" title="A photo didn’t load" action={{ label: "Try again", onClick: retry }}>
            “Old Quarter from the hill” stays in the post; its file couldn’t be read.
          </InlineMessage>
        ) : null}
      </Stack>
    </Card>
  );
}

// ——— 3. Thumbnails in list rows ——————————————————————————————————————————————————————————————————
type Upload = { id: string; name: string; src: string; bytes: number; by: PersonId; at: Date };
const firstUploads: Upload[] = [
  { id: "creek", name: "forest-creek.jpg", src: platformMedia.feed[1].src, bytes: 2_400_000, by: "gia", at: minutesAgo(13) },
  { id: "peaks", name: "snow-peaks.jpg", src: platformMedia.feed[4].src, bytes: 3_100_000, by: "gia", at: daysFromToday(0, 9, 40) },
  // A HEIC file the browser can't preview: the row keeps its Thumbnail frame with the image icon.
  { id: "desert", name: "desert-hills.heic", src: unreadable, bytes: 4_800_000, by: "emi", at: daysFromToday(-1, 16, 5) },
  { id: "moss", name: "moss-study.jpg", src: platformMedia.feed[7].src, bytes: 1_900_000, by: "emi", at: daysFromToday(-2, 11, 20) },
];
const laterUploads: Upload[] = [
  { id: "coast", name: "coast-road.jpg", src: platformMedia.feed[6].src, bytes: 2_700_000, by: "alex", at: TODAY },
  { id: "field", name: "sunset-field.jpg", src: platformMedia.feed[0].src, bytes: 2_200_000, by: "alex", at: TODAY },
  { id: "balloon", name: "balloon-over-palms.jpg", src: platformMedia.feed[2].src, bytes: 3_400_000, by: "alex", at: TODAY },
];
const allUploads = [...firstUploads, ...laterUploads];

function MoodboardUploads() {
  const { toast } = useToast();
  const [uploads, setUploads] = useState(firstUploads);
  const cardRef = useRef<HTMLElement>(null);
  const titleId = useId();
  const next = allUploads.find((upload) => !uploads.some((item) => item.id === upload.id));
  const upload = () => {
    if (!next) return;
    setUploads((list) => [...list, { ...next, at: TODAY }]);
    toast({ type: "positive", title: "Photo uploaded", children: next.name });
  };
  const remove = (item: Upload) => {
    const index = uploads.findIndex((entry) => entry.id === item.id);
    setUploads((list) => list.filter((entry) => entry.id !== item.id));
    toast({ title: "Photo deleted", children: item.name, action: { label: "Undo", onClick: () => setUploads((list) => [...list.slice(0, index), item, ...list.slice(index)]) } });
    // The row and its button are gone: focus moves to the next row's Delete, or to the empty state's Upload photos.
    requestAnimationFrame(() => {
      const buttons = cardRef.current?.querySelectorAll<HTMLElement>("[data-delete]") ?? [];
      (buttons[Math.min(index, buttons.length - 1)] ?? cardRef.current?.querySelector<HTMLElement>(".zen-empty-state button"))?.focus();
    });
  };
  return (
    // A ListBox: the title and photo count in its Header-Slot, the rows (or the Empty State) in its Body-Slot, Upload
    // photo in its Footer-Slot while there is a photo left to add.
    <ListBox ref={cardRef} as="section" aria-labelledby={titleId}
      header={<Stack gap="2xs">
        <Heading level={4} id={titleId} textStyle="Heading/Subheading">Moodboard photos</Heading>
        <Text role="status" textStyle="Body/Small/Regular" tone="base">{`Brand refresh · ${plural(uploads.length, "photo")}`}</Text>
      </Stack>}
      footer={uploads.length && next ? (
        <Stack align="start">
          <Button level="tertiary" startIcon="icon-upload-01-line" onClick={upload}>Upload photo</Button>
        </Stack>
      ) : null}>
      {uploads.length ? (
        <List aria-labelledby={titleId}>
          {uploads.map((item) => (
            // The title names the file, so the Thumbnail (md, the leading size) is alt="".
            <ListItem key={item.id} title={item.name}
              caption={`${item.src === unreadable ? "No preview · " : ""}${formatBytes(item.bytes)} · ${people[item.by].name} · ${formatRelative(item.at)}`}
              leading={<Thumbnail src={item.src} alt="" />}
              trailing={<IconButton appearance="flat" level="primary" size="md" icon="icon-trash-line" data-delete="" aria-label={`Delete ${item.name}`} onClick={() => remove(item)} />} />
          ))}
        </List>
      ) : (
        <EmptyState illustration={false} headingLevel={5} title="No photos yet"
          primaryAction={{ label: "Upload photos", onClick: () => { setUploads(firstUploads); toast({ type: "positive", title: `${plural(firstUploads.length, "photo")} uploaded` }); } }}>
          Photos you add to the moodboard show here.
        </EmptyState>
      )}
    </ListBox>
  );
}

// ——— 4. Asset library: a Thumbnail in each table row ———————————————————————————————————————————————
type Asset = { id: string; name: string; photo: PlatformPhoto; width: number; height: number; bytes: number; owner: PersonId; project: string; updated: Date };
const asset = (id: string, name: string, photo: PlatformPhoto, [width, height]: [number, number], bytes: number, owner: PersonId, project: string, updated: Date): Asset =>
  ({ id, name, photo, width, height, bytes, owner, project, updated });
const landscape: [number, number] = [4032, 3024];
const square: [number, number] = [3024, 3024];
const assets: Asset[] = [
  asset("creek", "forest-creek.jpg", platformMedia.feed[1], landscape, 2_400_000, "gia", "saola-brand", minutesAgo(13)),
  asset("field", "sunset-field.jpg", platformMedia.feed[0], landscape, 2_200_000, "emi", "saola-brand", daysFromToday(-1, 16, 5)),
  asset("peaks", "snow-peaks.jpg", platformMedia.feed[4], landscape, 3_100_000, "emi", "saola-brand", daysFromToday(-3, 9, 50)),
  asset("road", "valley-road-tall.jpg", platformMedia.mountainRoad, [1170, 2532], 1_600_000, "gia", "saola-brand", daysFromToday(-4, 14, 15)),
  asset("cafe", "counter-at-nguyen-hue.jpg", platformMedia.site[5], square, 1_800_000, "chi", "phin-loyalty", daysFromToday(-9, 11, 0)),
  asset("bridge", "bridge-at-dusk.jpg", platformMedia.site[4], square, 2_100_000, "ava", "lumen-banking", daysFromToday(-15, 17, 30)),
  asset("courtyard", "venue-courtyard.jpg", platformMedia.site[0], square, 1_900_000, "linh", "bookfair-site", daysFromToday(-22, 10, 10)),
  asset("old-quarter", "old-quarter-from-the-hill.jpg", platformMedia.site[2], square, 2_270_000, "linh", "bookfair-site", daysFromToday(-22, 10, 25)),
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
  cell: (item) => <TableMedia media={<Thumbnail src={item.photo.src} alt="" size="sm" />} caption={caption(item)}>{item.name}</TableMedia>,
});
const assetColumns: TableColumn<Asset>[] = [
  photoCell((item) => `${item.width} × ${item.height}`),
  { id: "project", header: "Project", width: "220px", cell: (item) => <TableText caption={projectById(item.project).client}>{projectById(item.project).name}</TableText> },
  { id: "owner", header: "Owner", width: "160px", cell: (item) => <TableMedia bold={false} media={<Avatar size="xs" {...avatarOf(people[item.owner])} />}>{people[item.owner].name}</TableMedia> },
  { id: "updated", header: "Updated", sortable: true, width: "190px", cell: (item) => <TableText>{formatRelative(item.updated)}</TableText> },
  { id: "size", header: "Size", sortable: true, align: "right", width: "100px", cell: (item) => <TableText>{formatBytes(item.bytes)}</TableText> },
];
/** Narrower than this (a phone), the five columns would leave the photo column alone on screen with the rest scrolled
    away: the table keeps one column, and each photo's size and date move into its caption. */
const compactBelow = 560;
const compactColumns: TableColumn<Asset>[] = [photoCell((item) => `${formatBytes(item.bytes)} · ${formatRelative(item.updated)}`)];

/** The width of an element, measured before the first paint and kept current. */
function useWidth() {
  const [element, setElement] = useState<HTMLElement | null>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    if (!element) return undefined;
    setWidth(element.getBoundingClientRect().width);
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);
  return [setElement, width] as const;
}

function AssetLibrary() {
  const { toast } = useToast();
  const [project, setProject] = useState<string | null>(null);
  const [sort, setSort] = useState<TableSort | null>({ columnId: "updated", direction: "desc" });
  const [openId, setOpenId] = useState<string | null>(null);
  const [measure, width] = useWidth();
  const compact = width > 0 && width < compactBelow;
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
    <Stack ref={measure} as="section" gap="md" aria-labelledby={headingId}>
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

// ——— 5. Cover or contain: one photo in each channel's ratio ——————————————————————————————————————————
type Channel = { id: string; name: string; ratio: ImageRatio; label: string };
const channels: Channel[] = [
  { id: "web", name: "Website hero", ratio: "16:9", label: "16:9" },
  { id: "post", name: "Instagram post", ratio: "1:1", label: "1:1" },
  { id: "story", name: "Story", ratio: 9 / 16, label: "9:16" },
];
const ratioOf = (ratio: ImageRatio) => (typeof ratio === "number" ? ratio : Number(ratio.split(":")[0]) / Number(ratio.split(":")[1]));
/** Columns as wide as their ratios, so every frame in the row is the same height. */
const channelColumns = channels.map((channel) => `minmax(0, ${ratioOf(channel.ratio).toFixed(3)}fr)`).join(" ");
const launchPhoto = platformMedia.mountainRoad;

function ChannelPreviews() {
  const [fit, setFit] = useState<"cover" | "contain">("cover");
  const headingId = useId();
  return (
    <Stack as="section" gap="md" aria-labelledby={headingId} className="px-image-scope">
      <Stack direction="row" gap="md" align="end" justify="between" wrap>
        <Stack gap="xs">
          <Heading level={4} id={headingId} textStyle="Heading/4">Launch post</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">{`Saola Outdoor · Scheduled for ${formatDate(daysFromToday(12, 9, 0))} at 9:00 am`}</Text>
        </Stack>
        <Segmented aria-label="Photo fit" value={fit} onValueChange={(value) => setFit(value === "contain" ? "contain" : "cover")}
          options={[{ id: "cover", label: "Fill frame" }, { id: "contain", label: "Show whole photo" }]} />
      </Stack>
      <Grid columns={{ mobile: 1, desktop: channelColumns }} gap="md" align="start" className="px-image-channels">
        {channels.map((channel) => (
          <Image key={channel.id} src={launchPhoto.src} alt={launchPhoto.alt} ratio={channel.ratio} fit={fit} loading="eager"
            caption={`${channel.name} · ${channel.label}`} />
        ))}
      </Grid>
    </Stack>
  );
}

// ——— 6. On a phone: lazy pictures in a feed ——————————————————————————————————————————————————————————
type Post = { id: string; author: PersonId; at: Date; project: string; text: string; photos: PlatformPhoto[]; likes: number; unreadable?: boolean };
const posts: Post[] = [
  { id: "p1", author: "gia", at: minutesAgo(13), project: "saola-brand", text: "The shortlist for the outdoor range is in: wet stone and deep greens, nothing too polished.", photos: [platformMedia.feed[1], platformMedia.feed[7]], likes: 12 },
  { id: "p2", author: "emi", at: daysFromToday(0, 9, 5), project: "bookfair-site", text: "Venue walk-through for the Book Fair recap. The courtyard gets the best light before 10.", photos: [platformMedia.site[0]], likes: 8 },
  { id: "p3", author: "chi", at: daysFromToday(-1, 16, 40), project: "phin-loyalty", text: "Counter visit at Phin Nguyen Hue: most people pay before they think about a reward.", photos: [platformMedia.site[5]], likes: 15 },
  { id: "p4", author: "gia", at: daysFromToday(-1, 11, 20), project: "saola-brand", text: "Coast road at golden hour, a candidate for the launch hero.", photos: [platformMedia.feed[6]], likes: 21, unreadable: true },
  { id: "p5", author: "ava", at: daysFromToday(-2, 14, 30), project: "lumen-banking", text: "Bridge shots for the transfers onboarding. Calm, not corporate.", photos: [platformMedia.site[4]], likes: 6 },
  { id: "p6", author: "emi", at: daysFromToday(-5, 10, 0), project: "saola-brand", text: "Two more for the winter shell line.", photos: [platformMedia.feed[4], platformMedia.feed[5]], likes: 9 },
  { id: "p7", author: "linh", at: daysFromToday(-7, 15, 45), project: "bookfair-site", text: "The Old Quarter from the hill, for the About page.", photos: [platformMedia.site[2], platformMedia.site[1]], likes: 4 },
  { id: "p8", author: "gia", at: daysFromToday(-9, 9, 15), project: "saola-brand", text: "First pass at the moodboard. More to come after the kickoff.", photos: [platformMedia.feed[0]], likes: 17 },
];

function FeedPost({ post }: { post: Post }) {
  const author = people[post.author];
  const nameId = useId();
  const [liked, setLiked] = useState(false);
  // One post's file can't be read the first time; Reload photo fetches it again (Skeleton, then the picture).
  const [src, setSrc] = useState<string | undefined>(post.unreadable ? unreadable : undefined);
  const [failed, setFailed] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const nameRef = useRef<HTMLSpanElement>(null);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const reload = () => {
    // Reload photo goes away while the picture loads again, so focus moves to the line that names the post (tabIndex
    // -1), which stays. Not to Like: its name tooltip opens on focus and would spill past the phone's screen. The feed
    // scrolls only as far as it must to show the name (focus alone would centre it).
    nameRef.current?.focus({ preventScroll: true });
    nameRef.current?.scrollIntoView({ block: "nearest" });
    setFailed(false);
    setSrc(undefined);
    timer.current = window.setTimeout(() => setSrc(post.photos[0].src), 1000);
  };
  const photoSrc = (photo: PlatformPhoto) => (post.unreadable ? src : photo.src);
  return (
    <Stack as="article" gap="md" aria-labelledby={nameId}>
      <Stack direction="row" gap="sm" align="center">
        <Avatar size="md" {...avatarOf(author)} />
        {/* Start-aligned, so the name's focus ring hugs the name. */}
        <Stack gap="2xs" align="start">
          <Text ref={nameRef} as="span" id={nameId} tabIndex={-1} className="px-image-focus-target" textStyle="Body/Base/Bold">{author.name}</Text>
          <Text as="span" textStyle="Body/Small/Regular" tone="base">{`${projectById(post.project).name} · ${formatRelative(post.at)}`}</Text>
        </Stack>
      </Stack>
      <Text>{post.text}</Text>
      {/* Pictures further down load lazily (the default) as the feed scrolls; each frame keeps its ratio meanwhile. */}
      {post.photos.length > 1 ? (
        <Grid columns={2} gap="2xs">
          {post.photos.map((photo) => <Image key={photo.src} src={photo.src} alt={photo.alt} ratio="1:1" radius="lg" />)}
        </Grid>
      ) : (
        <Image src={photoSrc(post.photos[0])} alt={post.photos[0].alt} ratio="4:3" radius="lg" onError={() => setFailed(true)} />
      )}
      {failed ? <Button level="tertiary" startIcon="icon-refresh-cw-01-line" className="px-image-start" onClick={reload}>Reload photo</Button> : null}
      <Stack direction="row" gap="2xs" align="center">
        {/* Pulled back by its own inset, so the heart lines up with the avatar, the text and the photos. */}
        <IconButton appearance="flat" level="primary" size="md" icon={liked ? "icon-heart-solid" : "icon-heart-line"} className="px-image-like"
          aria-label={`Like ${author.name.split(" ")[0]}’s post`} aria-pressed={liked} onClick={() => setLiked(!liked)} />
        <Text as="span" textStyle="Body/Small/Medium" tone="base">{plural(post.likes + (liked ? 1 : 0), "like")}</Text>
      </Stack>
    </Stack>
  );
}

function PhoneFeed() {
  const screenRef = useRef<HTMLDivElement>(null);
  return (
    <PlatformPhone key="updates" label="Zen updates" headerOverlay screenRef={screenRef}
      header={<TopNavigation title="Updates" largeTitle="Updates" scrollRef={screenRef} />}>
      <Stack gap="lg" padding="lg">
        {posts.map((post, index) => (
          <Stack key={post.id} gap="lg">
            {index > 0 ? <Divider /> : null}
            <FeedPost post={post} />
          </Stack>
        ))}
      </Stack>
    </PlatformPhone>
  );
}

export const examples: ExampleDef[] = [
  {
    title: "Moodboard strip",
    description: "A strip of Thumbnails picks the large picture. The strip is a radio group with one Tab stop: each Thumbnail sits in a radio button that carries the name, so the Thumbnail itself is alt=\"\", and the arrow keys move the choice. The large Image loads eagerly and its caption adds what the picture can't say.",
    render: () => <Moodboard />,
    code: `<Image src={photo.src} alt={photo.alt} ratio="4:3" radius="lg" loading="eager" caption={\`\${photo.name} · \${photo.note}\`} />

{/* One Tab stop: ←/→ (↑/↓, Home, End) move the choice and focus */}
<Stack direction="row" gap="2xs" wrap role="radiogroup" aria-label="Moodboard photos" onKeyDown={step}>
  {picks.map((pick, i) => (
    <button key={pick.id} type="button" role="radio" aria-label={pick.name} aria-checked={i === index}
      tabIndex={i === index ? 0 : -1} onClick={() => setIndex(i)}>
      <Thumbnail src={pick.src} alt="" size="lg" />
    </button>
  ))}
</Stack>
<VisuallyHidden role="status">{\`\${photo.name}, photo \${index + 1} of \${picks.length}\`}</VisuallyHidden>`,
  },
  {
    title: "Loading and failed",
    description: "With a ratio, a picture's frame holds its size while the Skeleton shows, so nothing jumps when it arrives. A file that can't be read keeps its frame with the neutral placeholder, its alt still naming it, and a Negative Inline Message offers Try again.",
    render: () => <RecapPhotos />,
    code: `<Grid columns={2} gap="md">
  {/* src is undefined while the URL is still being fetched: the Skeleton shows in the 4:3 frame */}
  <Image src={venueSrc} alt="College courtyard" ratio="4:3" caption="Venue courtyard · Emi Sato" />
  <Image src={oldQuarterSrc} alt="Old town seen from the hill" ratio="4:3"
    caption="Old Quarter from the hill · Emi Sato" onError={() => setFailed(true)} />
</Grid>
{failed ? (
  <InlineMessage theme="negative" title="A photo didn’t load" action={{ label: "Try again", onClick: retry }}>
    “Old Quarter from the hill” stays in the post; its file couldn’t be read.
  </InlineMessage>
) : null}`,
  },
  {
    title: "Thumbnails in a list",
    description: "A Thumbnail at the default md (40px) is the leading visual of a list row, alt=\"\" because the row title names the file. A file the browser can't preview keeps its frame and says so in the caption. Delete removes a row with Undo; an empty list offers Upload photos.",
    render: () => <MoodboardUploads />,
    code: `<ListBox as="section" aria-labelledby={titleId}
  header={<Stack gap="2xs">
    <Heading level={4} id={titleId} textStyle="Heading/Subheading">Moodboard photos</Heading>
    <Text role="status" textStyle="Body/Small/Regular" tone="base">{\`Brand refresh · \${plural(uploads.length, "photo")}\`}</Text>
  </Stack>}
  footer={<Stack align="start">
    <Button level="tertiary" startIcon="icon-upload-01-line" onClick={upload}>Upload photo</Button>
  </Stack>}>
  <List aria-labelledby={titleId}>
    {uploads.map((item) => (
      <ListItem key={item.id} title={item.name}
        caption={\`\${formatBytes(item.bytes)} · \${people[item.by].name} · \${formatRelative(item.at)}\`}
        leading={<Thumbnail src={item.src} alt="" />}
        trailing={<IconButton appearance="flat" level="primary" size="md" icon="icon-trash-line"
          aria-label={\`Delete \${item.name}\`} onClick={() => remove(item)} />} />
    ))}
  </List>
</ListBox>`,
  },
  {
    title: "Thumbnails in a table",
    wide: true,
    description: "In a captioned media cell the Thumbnail is Small (32px); a cell without a caption, like Owner, takes the XSmall step. The table sits on the page under its heading: Project filters it, the columns sort, and a row opens the photo in a Side Panel at its own ratio. On a phone it keeps the photo column alone, with the size and date in its caption.",
    render: () => <AssetLibrary />,
    code: `const photo = (caption) => ({ id: "name", header: "Photo", sortable: true, cell: (item) => (
  <TableMedia media={<Thumbnail src={item.photo.src} alt="" size="sm" />} caption={caption(item)}>{item.name}</TableMedia>
) });
const columns = [
  photo((item) => \`\${item.width} × \${item.height}\`),
  { id: "updated", header: "Updated", sortable: true, width: "190px", cell: (item) => <TableText>{formatRelative(item.updated)}</TableText> },
  { id: "size", header: "Size", sortable: true, align: "right", width: "100px", cell: (item) => <TableText>{formatBytes(item.bytes)}</TableText> },
];
// Under 560px of its own width the table keeps one column: size and date move into the caption.
const compactColumns = [photo((item) => \`\${formatBytes(item.bytes)} · \${formatRelative(item.updated)}\`)];

<Heading level={4} id="photos" textStyle="Heading/4">Photos</Heading>
<Table aria-labelledby="photos" columns={width < 560 ? compactColumns : columns} rows={sorted}
  sort={sort} onSortChange={setSort} onRowClick={(item) => setOpenId(item.id)} />

<SidePanel type="modal" open={Boolean(opened)} onOpenChange={(open) => !open && setOpenId(null)} title={opened?.name}
  primaryAction={{ label: "Download", onClick: download }} secondaryAction={{ label: "Close" }}>
  {/* No ratio: the picture keeps its own shape */}
  <Image src={opened.photo.src} alt={opened.photo.alt} radius="md" loading="eager" />
</SidePanel>`,
  },
  {
    title: "Fill or fit a frame",
    wide: true,
    description: "One tall photo in each channel's ratio. Cover (the default) fills the frame and crops; Contain shows the whole picture on Neutral/Pale bars, for photos whose edges matter. Each column is as wide as its ratio, so the frames line up at one height.",
    render: () => <ChannelPreviews />,
    code: `<Segmented aria-label="Photo fit" value={fit} onValueChange={setFit}
  options={[{ id: "cover", label: "Fill frame" }, { id: "contain", label: "Show whole photo" }]} />

{/* Columns 1.778fr 1fr 0.563fr: each as wide as its ratio, so the frames share one height.
    Under 640px the hero takes its own row and the square and the story share the next (1fr 0.5625fr). */}
<Grid columns={{ mobile: 1, desktop: "minmax(0, 1.778fr) minmax(0, 1fr) minmax(0, 0.563fr)" }} gap="md" align="start">
  <Image src={photo.src} alt={photo.alt} ratio="16:9" fit={fit} caption="Website hero · 16:9" />
  <Image src={photo.src} alt={photo.alt} ratio="1:1" fit={fit} caption="Instagram post · 1:1" />
  <Image src={photo.src} alt={photo.alt} ratio={9 / 16} fit={fit} caption="Story · 9:16" />
</Grid>`,
  },
  {
    title: "Feed on a phone",
    description: "In the studio's Updates feed, pictures load lazily (the default) as the screen scrolls, each frame keeping its ratio until then. A photo that can't be read keeps its frame and offers Reload photo; while the picture loads again, focus waits on the author's name, so it stays in the post.",
    render: () => <PhoneFeed />,
    code: `const screenRef = useRef<HTMLDivElement>(null);

<PlatformPhone key="updates" headerOverlay screenRef={screenRef}
  header={<TopNavigation title="Updates" largeTitle="Updates" scrollRef={screenRef} />}>
  <Stack gap="lg" padding="lg">
    <Stack as="article" gap="md">
      <Stack direction="row" gap="sm" align="center">
        <Avatar size="md" {...avatarOf(author)} />
        <Stack gap="2xs">
          {/* reload() moves focus here (tabIndex -1): Reload photo goes away while the photo loads */}
          <Text ref={nameRef} as="span" tabIndex={-1} textStyle="Body/Base/Bold">{author.name}</Text>
          <Text as="span" textStyle="Body/Small/Regular" tone="base">{\`\${project.name} · \${formatRelative(post.at)}\`}</Text>
        </Stack>
      </Stack>
      <Text>{post.text}</Text>
      <Image src={src} alt={photo.alt} ratio="4:3" radius="lg" onError={() => setFailed(true)} />
      {failed ? <Button level="tertiary" startIcon="icon-refresh-cw-01-line" onClick={reload}>Reload photo</Button> : null}
      <IconButton appearance="flat" level="primary" icon={liked ? "icon-heart-solid" : "icon-heart-line"}
        aria-label={\`Like \${firstName}’s post\`} aria-pressed={liked} onClick={() => setLiked(!liked)} />
    </Stack>
    <Divider />
    {/* …the next post */}
  </Stack>
</PlatformPhone>`,
  },
];

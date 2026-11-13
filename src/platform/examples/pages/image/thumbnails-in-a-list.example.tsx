import { useId, useRef, useState } from "react";
import { Button, EmptyState, Heading, IconButton, List, ListBox, ListItem, Stack, Text, Thumbnail, plural, useToast } from "@zen-ds/react";
import { TODAY, daysFromToday, formatBytes, formatRelative, people, photos, type PersonId } from "../../data";

/** Bytes that are not a picture: the browser fails to decode them without a network request, so a demo can fail on cue. */
const unreadable = "data:image/png;base64,AAAA";
const minutesAgo = (minutes: number) => new Date(TODAY.getTime() - minutes * 60_000);

type Upload = { id: string; name: string; src: string; bytes: number; by: PersonId; at: Date };
const firstUploads: Upload[] = [
  { id: "creek", name: "forest-creek.jpg", src: photos.feed[1].src, bytes: 2_400_000, by: "gia", at: minutesAgo(13) },
  { id: "peaks", name: "snow-peaks.jpg", src: photos.feed[4].src, bytes: 3_100_000, by: "gia", at: daysFromToday(0, 9, 40) },
  // A HEIC file the browser can't preview: the row keeps its Thumbnail frame with the image icon.
  { id: "desert", name: "desert-hills.heic", src: unreadable, bytes: 4_800_000, by: "emi", at: daysFromToday(-1, 16, 5) },
  { id: "moss", name: "moss-study.jpg", src: photos.feed[7].src, bytes: 1_900_000, by: "emi", at: daysFromToday(-2, 11, 20) },
];
const laterUploads: Upload[] = [
  { id: "coast", name: "coast-road.jpg", src: photos.feed[6].src, bytes: 2_700_000, by: "alex", at: TODAY },
  { id: "field", name: "sunset-field.jpg", src: photos.feed[0].src, bytes: 2_200_000, by: "alex", at: TODAY },
  { id: "balloon", name: "balloon-over-palms.jpg", src: photos.feed[2].src, bytes: 3_400_000, by: "alex", at: TODAY },
];
const allUploads = [...firstUploads, ...laterUploads];

/** Thumbnails as the leading visual of list rows. */
export default function MoodboardUploads() {
  const { toast } = useToast();
  const [uploads, setUploads] = useState(firstUploads);
  const deleteRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const countRef = useRef<HTMLParagraphElement>(null);
  const titleId = useId();
  const next = allUploads.find((upload) => !uploads.some((item) => item.id === upload.id));
  const upload = () => {
    if (!next) return;
    setUploads((list) => [...list, { ...next, at: TODAY }]);
    toast({ type: "positive", title: "Photo uploaded", children: next.name });
  };
  const remove = (item: Upload) => {
    const index = uploads.findIndex((entry) => entry.id === item.id);
    const rest = uploads.filter((entry) => entry.id !== item.id);
    setUploads((list) => list.filter((entry) => entry.id !== item.id));
    toast({ title: "Photo deleted", children: item.name, action: { label: "Undo", onClick: () => setUploads((list) => [...list.slice(0, index), item, ...list.slice(index)]) } });
    // The row and its button are gone: focus moves to the next row's Delete (or the one above), or to the photo count
    // once the list is empty.
    const after = rest[Math.min(index, rest.length - 1)];
    setTimeout(() => (after ? deleteRefs.current[after.id] : countRef.current)?.focus());
  };
  return (
    // A ListBox: the title and photo count in its Header-Slot, the rows (or the Empty State) in its Body-Slot, Upload
    // photo in its Footer-Slot while there is a photo left to add.
    <ListBox as="section" aria-labelledby={titleId}
      header={<Stack gap="2xs">
        <Heading level={4} id={titleId} textStyle="Heading/Subheading">Moodboard photos</Heading>
        <Text ref={countRef} tabIndex={-1} role="status" textStyle="Body/Small/Regular" tone="base">{`Brand refresh · ${plural(uploads.length, "photo")}`}</Text>
      </Stack>}
      footer={uploads.length && next ? (
        <Button level="tertiary" startIcon="icon-upload-01-line" onClick={upload}>Upload photo</Button>
      ) : null}>
      {uploads.length ? (
        <List aria-labelledby={titleId}>
          {uploads.map((item) => (
            // The title names the file, so the Thumbnail (md, the leading size) is alt="".
            <ListItem key={item.id} title={item.name}
              caption={`${item.src === unreadable ? "No preview · " : ""}${formatBytes(item.bytes)} · ${people[item.by].name} · ${formatRelative(item.at)}`}
              leading={<Thumbnail src={item.src} alt="" />}
              trailing={<IconButton ref={(button) => { deleteRefs.current[item.id] = button; }} appearance="flat" level="primary" size="md" icon="icon-trash-line"
                aria-label={`Delete ${item.name}`} onClick={() => remove(item)} />} />
          ))}
        </List>
      ) : (
        <EmptyState size="sm" headingLevel={5} icon="icon-image-line" title="No photos yet"
          primaryAction={{ label: "Upload photos", onClick: () => { setUploads(firstUploads); toast({ type: "positive", title: `${plural(firstUploads.length, "photo")} uploaded` }); } }}>
          Photos you add to the moodboard show here.
        </EmptyState>
      )}
    </ListBox>
  );
}

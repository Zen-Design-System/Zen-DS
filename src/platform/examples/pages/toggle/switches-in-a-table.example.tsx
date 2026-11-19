import { useId, useState } from "react";
import { Avatar, Box, Heading, Stack, Table, TableMedia, TableText, Text, ToggleButton, useToast, type AvatarSize, type TableColumn } from "@zen-ds/react";
import { TODAY, daysFromToday, formatRelative, initials, me, people, studio, type Person } from "../../data";

/** People are Avatars: a photo when there is one, otherwise solid initials on the person's steady theme (one look on every page).
 *  Beside a written name the Avatar is decorative (alt=""). */
function PersonAvatar({ person, size }: { person: Person; size: AvatarSize }) {
  return person.photo
    ? <Avatar size={size} theme="photo" src={person.photo} alt="" />
    : <Avatar size={size} theme={person.theme} alt="">{initials(person.name)}</Avatar>;
}

type Feature = { id: string; name: string; description: string; audience: string; on: boolean; changedAt: Date; changedBy: Person };
const earlyAccess: Feature[] = [
  { id: "ai-summaries", name: "AI task summaries", description: "Sum up a long task thread in one paragraph", audience: "Everyone", on: true, changedAt: daysFromToday(-16, 15, 20), changedBy: people.finn },
  { id: "time-tracking", name: "Time tracking on tasks", description: "Log hours from a task; they flow into invoices", audience: "Everyone", on: true, changedAt: daysFromToday(-40, 9, 5), changedBy: people.mai },
  { id: "client-guests", name: "Client guest access", description: "Invite client contacts to comment on files", audience: "Client Services", on: false, changedAt: daysFromToday(-3, 11, 45), changedBy: people.hana },
  { id: "file-viewer", name: "New file viewer", description: "Faster previews for Figma, PDF and video files", audience: "Design team", on: true, changedAt: daysFromToday(-1, 16, 5), changedBy: people.chi },
  { id: "offline", name: "Offline projects on mobile", description: "Open pinned projects without a connection", audience: "Everyone", on: false, changedAt: daysFromToday(-9, 14, 30), changedBy: people.bao },
];

export default function EarlyAccess() {
  const { toast } = useToast();
  const headingId = useId();
  const [features, setFeatures] = useState(earlyAccess);
  const update = (next: Feature) => setFeatures((list) => list.map((feature) => (feature.id === next.id ? next : feature)));
  // The whole group gets the change at once, so the Toast offers Undo, which puts the row back and closes the Toast.
  const flip = (feature: Feature, on: boolean) => {
    update({ ...feature, on, changedAt: TODAY, changedBy: me });
    toast({ title: `${feature.name} turned ${on ? "on" : "off"}`, action: { label: "Undo", onClick: () => update(feature) } });
  };
  const columns: TableColumn<Feature>[] = [
    { id: "feature", header: "Feature", cell: (feature) => <TableText bold caption={feature.description}>{feature.name}</TableText> },
    { id: "audience", header: "Available to", cell: (feature) => <TableText>{feature.audience}</TableText> },
    { id: "changed", header: "Last changed", cell: (feature) => <TableMedia bold={false} media={<PersonAvatar person={feature.changedBy} size="small" />} caption={formatRelative(feature.changedAt)}>{feature.changedBy.name}</TableMedia> },
    // The row names the switch: its aria-label is the feature, so a screen reader hears "AI task summaries, switch, on".
    { id: "on", header: "Enabled", align: "right", width: "96px", cell: (feature) => <ToggleButton aria-label={feature.name} checked={feature.on} onCheckedChange={(on) => flip(feature, on)} /> },
  ];
  return (
    // A section of a settings page: the Table sits straight on the page under its heading, with no container. The
    // Enabled column has a fixed width, so on a narrow screen the table scrolls sideways instead of squeezing the rest.
    <Stack as="section" gap="md" aria-labelledby={headingId}>
      <Stack gap="xs">
        <Heading level={4} id={headingId} textStyle="Heading/4">Early access</Heading>
        <Text textStyle="Body/Small/Regular" tone="base">Features still in testing at {studio.name}. A change applies at once to everyone it is available to.</Text>
      </Stack>
      {/* On a narrow screen the table scrolls sideways instead of wrapping each feature word by word. */}
      <Box scroll="x">
        <Table style={{ minWidth: 760 }} aria-labelledby={headingId} rows={features} columns={columns} />
      </Box>
    </Stack>
  );
}

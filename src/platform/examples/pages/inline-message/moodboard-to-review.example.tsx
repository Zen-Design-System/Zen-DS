import { useId, useRef, useState } from "react";
import {
  BadgeStatus, Button, Dialog, Grid, Heading, Image, InlineMessage, List, ListBox, ListItem, Stack, Text, Thumbnail, plural, useToast,
} from "@zen-ds/react";
import { daysFromToday, formatDate, formatRelative, people, photos, taskStep, type PersonId, type TaskStatus } from "../../data";

const moodboard = [photos.feed[1], photos.feed[3], photos.feed[4], photos.feed[7]];
type BrandTask = { id: string; key: string; title: string; assignee: PersonId; status: TaskStatus };
const brandTasks: BrandTask[] = [
  { id: "s1", key: "SAO-004", title: "Moodboard for the outdoor range", assignee: "gia", status: "In review" },
  { id: "s2", key: "SAO-006", title: "Sketch three logo directions", assignee: "emi", status: "In progress" },
  { id: "s3", key: "SAO-007", title: "Draft the tone-of-voice guide", assignee: "linh", status: "To do" },
];

export default function MoodboardReview() {
  const { toast } = useToast();
  const titleId = useId();
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const [approved, setApproved] = useState(false);
  // Focus follows what changed: Show message again once the message is closed, the ListBox title when the message comes
  // back or is gone (approved). Closing the Dialog without approving hands focus back to Review by itself.
  const titleRef = useRef<HTMLHeadingElement>(null);
  const againRef = useRef<HTMLButtonElement>(null);
  const focusTitle = () => setTimeout(() => titleRef.current?.focus());
  const approve = () => {
    setApproved(true);
    focusTitle();
    // Undo's toast closes as it runs, so focus moves to the title, just above the message again.
    toast({ title: "Moodboard approved", action: { label: "Undo", onClick: () => { setApproved(false); focusTitle(); } } });
  };
  const hide = () => { setHidden(true); setTimeout(() => againRef.current?.focus()); };
  const showAgain = () => { setHidden(false); focusTitle(); };
  const rows = brandTasks.map((task) => task.id === "s1" && approved ? { ...task, status: "Done" as const } : task);
  return (
    <>
      {/* A ListBox: the title and the message about its rows in the Header-Slot (16px apart), the tasks in the Body-Slot. */}
      <ListBox as="section" aria-labelledby={titleId} width="fill" maxWidth={480}
        header={<>
          <Stack gap="2xs">
            <Heading ref={titleRef} level={4} id={titleId} tabIndex={-1} textStyle="Heading/Subheading">Brand refresh</Heading>
            <Text textStyle="Body/Small/Regular" tone="base">Saola Outdoor · Kickoff {formatDate(daysFromToday(12))}</Text>
          </Stack>
          {approved ? null : hidden ? (
            <Stack align="start"><Button ref={againRef} level="tertiary" onClick={showAgain}>Show message again</Button></Stack>
          ) : (
            <InlineMessage theme="custom" icon={<Thumbnail src={moodboard[0].src} alt="" size="md" />}
              title="Gia’s moodboard is ready for review" action={{ label: "Review", onClick: () => setOpen(true) }} onClose={hide}>
              Saola Outdoor sees it on Friday, so leave your notes before then.
            </InlineMessage>
          )}
        </>}>
        <List aria-labelledby={titleId}>
          {rows.map((task) => (
            <ListItem key={task.id} title={task.title} titleLines={2} caption={`${task.key} · ${people[task.assignee].name}`}
              trailing={<BadgeStatus status={taskStep[task.status]}>{task.status}</BadgeStatus>} />
          ))}
        </List>
      </ListBox>
      <Dialog open={open} onOpenChange={setOpen} title="Moodboard for the outdoor range"
        description={`Gia Pham · ${plural(moodboard.length, "photo")} · updated ${formatRelative(daysFromToday(0, 10, 17)).toLowerCase()}`}
        primaryAction={{ label: "Approve moodboard", onClick: () => { setOpen(false); approve(); } }} secondaryAction={{ label: "Close" }}>
        <Grid columns={2} gap="xs">
          {moodboard.map((photo) => <Image key={photo.src} src={photo.src} alt={photo.alt} ratio="4:3" radius="md" />)}
        </Grid>
      </Dialog>
    </>
  );
}

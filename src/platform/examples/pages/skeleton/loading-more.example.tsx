import { useId, useRef, useState } from "react";
import { Avatar, Button, Heading, List, ListBox, ListItem, SkeletonShape, SkeletonText, Text, VisuallyHidden, plural } from "@zen-ds/react";
import { activity, daysFromToday, formatRelative, initials, people, type Activity, type PersonId } from "../../data";

const olderActivity: Activity[] = [
  { id: "o1", actor: "khoa", verb: "merged", object: "Rewards API retry logic", at: daysFromToday(-9, 18, 20) },
  { id: "o2", actor: "linh", verb: "published", object: "Book Fair launch recap", at: daysFromToday(-10, 11, 45) },
  { id: "o3", actor: "finn", verb: "closed", object: "Spike: passkey sign-in on iOS", at: daysFromToday(-11, 16, 5) },
  { id: "o4", actor: "em", verb: "reported a bug in", object: "Android build 2.4.1", at: daysFromToday(-12, 9, 30) },
  { id: "o5", actor: "hana", verb: "signed", object: "Lumen Bank SOW v3", at: daysFromToday(-13, 14, 0) },
  { id: "o6", actor: "gia", verb: "uploaded", object: "Saola moodboard v1", at: daysFromToday(-14, 10, 10) },
  { id: "o7", actor: "ava", verb: "shared findings from", object: "Transfers usability round 1", at: daysFromToday(-15, 17, 25) },
  { id: "o8", actor: "duy", verb: "moved the kickoff of", object: "Brand refresh to Oct 12", at: daysFromToday(-16, 9, 50) },
  { id: "o9", actor: "chi", verb: "commented on", object: "Rewards checkout – design review", at: daysFromToday(-17, 15, 5) },
  { id: "o10", actor: "mai", verb: "marked as paid", object: "INV-2026-0138", at: daysFromToday(-18, 11, 0) },
  { id: "o11", actor: "bao", verb: "released", object: "Loyalty app 2.4.0 to beta", at: daysFromToday(-19, 18, 40) },
  { id: "o12", actor: "emi", verb: "uploaded", object: "Book Fair launch video", at: daysFromToday(-20, 17, 45) },
  { id: "o13", actor: "minhAnh", verb: "published", object: "Q4 holiday calendar", at: daysFromToday(-22, 10, 15) },
  { id: "o14", actor: "alex", verb: "approved", object: "Account overview wireframes", at: daysFromToday(-23, 16, 30) },
  { id: "o15", actor: "khoa", verb: "deployed", object: "Tracking events API to staging", at: daysFromToday(-25, 19, 10) },
  { id: "o16", actor: "linh", verb: "drafted", object: "Exhibitor directory copy", at: daysFromToday(-26, 9, 20) },
  { id: "o17", actor: "finn", verb: "reviewed", object: "Top Navigation scroll fold", at: daysFromToday(-27, 14, 55) },
  { id: "o18", actor: "hana", verb: "scheduled", object: "Lumen Bank quarterly review", at: daysFromToday(-29, 11, 30) },
];
const allActivity = [...activity, ...olderActivity];
const PAGE_SIZE = 8;

const personAvatar = (id: PersonId) => {
  const person = people[id];
  return person.photo ? <Avatar theme="photo" src={person.photo} alt="" /> : <Avatar theme={person.theme} alt="">{initials(person.name)}</Avatar>;
};
/** A caption stays within two lines; the full text is in its title. */
const clamp = (text: string) => <Text as="span" textStyle="Body/Small/Regular" tone="inherit" truncate={2} title={text}>{text}</Text>;
/* A placeholder in a text slot stays on the text's line, as wide as the text it stands for (in characters). */
const line = (width: string) => <SkeletonText lines={1} style={{ display: "inline-flex", width, maxWidth: "100%", verticalAlign: "middle" }} />;

export default function ActivityFeed() {
  const titleId = useId();
  const endRef = useRef<HTMLParagraphElement>(null);
  const [shown, setShown] = useState(PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const more = Math.min(PAGE_SIZE, allActivity.length - shown);
  const showOlder = () => {
    if (loadingMore) return;
    setLoadingMore(true);
    setAnnouncement("Loading older activity…");
    setTimeout(() => {
      setShown((n) => n + more);
      setLoadingMore(false);
      setAnnouncement(`${plural(more, "more update")} loaded`);
      // The button leaves with the last page: focus moves to the end of the list, not to <body>.
      if (shown + more >= allActivity.length) setTimeout(() => endRef.current?.focus());
    }, 1200);
  };
  return (
    // A ListBox: the title in its Header-Slot, the rows in its Body-Slot, Show older activity (or the end-of-list line)
    // in its Footer-Slot.
    <ListBox as="section" aria-labelledby={titleId}
      header={<Heading level={4} id={titleId} textStyle="Heading/Subheading">Activity</Heading>}
      footer={shown < allActivity.length
        ? <Button level="tertiary" onClick={showOlder}>Show older activity</Button>
        : <Text ref={endRef} tabIndex={-1} textStyle="Body/Small/Regular" tone="base">That’s everything from the last 30 days.</Text>}>
      <List aria-labelledby={titleId} aria-busy={loadingMore}>
        {allActivity.slice(0, shown).map((item) => (
          <ListItem key={item.id} leading={personAvatar(item.actor)} title={people[item.actor].name}
            caption={clamp(`${item.verb} ${item.object} · ${formatRelative(item.at)}`)} />
        ))}
        {/* New rows arrive at the end: the rows already read stay where they are. */}
        {loadingMore ? Array.from({ length: more }, (_, index) => (
          <ListItem key={`loading-${index}`} aria-hidden="true" leading={<SkeletonShape shape="round" size="md" />}
            title={line("11ch")} caption={line("18ch")} />
        )) : null}
      </List>
      {/* Out of the flow (absolutely positioned), so it adds no gap under the rows. */}
      <VisuallyHidden role="status">{announcement}</VisuallyHidden>
    </ListBox>
  );
}

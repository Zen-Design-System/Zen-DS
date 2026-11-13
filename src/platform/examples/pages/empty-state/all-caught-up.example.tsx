import { useState } from "react";
import { Avatar, BadgeStatus, EmptyState, Heading, List, ListBox, ListItem, Segmented, Stack, Text } from "@zen-ds/react";
import { daysFromToday, formatRelative, initials, people, type Person, type PersonId } from "../../data";

type Review = { id: string; key: string; task: string; by: PersonId; at: Date };
const approved: Review[] = [
  { id: "r1", key: "ZEN-402", task: "Add Disabled back to Input and Search", by: "bao", at: daysFromToday(0, 9, 48) },
  { id: "r2", key: "LUM-095", task: "Spike: passkey sign-in on iOS", by: "finn", at: daysFromToday(-1, 17, 20) },
  { id: "r3", key: "SAO-002", task: "Pick the type pairing for Saola", by: "gia", at: daysFromToday(-2, 11, 5) },
];
/** A person as Avatar props: their photo, or initials on their steady theme. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, children: initials(person.name) };

export default function AllCaughtUp() {
  const [view, setView] = useState("open");
  return (
    // A ListBox: title and view switch in its Header-Slot; the done reviews, or the Empty State, in its Body-Slot.
    <ListBox width="fill"
      header={<Stack direction="row" align="center" justify="between" gap="xs" wrap>
        <Stack gap="2xs">
          <Heading level={4} textStyle="Heading/Subheading">Reviews</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">Work your team asked you to approve</Text>
        </Stack>
        <Segmented aria-label="Reviews" value={view} onValueChange={setView} options={[
          { id: "open", label: "To review" },
          { id: "done", label: "Done", badge: approved.length },
        ]} />
      </Stack>}>
      {view === "open" ? (
        <EmptyState size="sm" headingLevel={5} title="You're all caught up" icon="icon-star-04-line">
          New review requests from your team show up here.
        </EmptyState>
      ) : (
        <List aria-label="Done reviews">
          {approved.map((review) => (
            <ListItem key={review.id} title={review.task} caption={`${people[review.by].name} · ${formatRelative(review.at)}`}
              leading={<Avatar size="md" {...avatarOf(people[review.by])} />}
              trailing={<BadgeStatus status="done" />} />
          ))}
        </List>
      )}
    </ListBox>
  );
}

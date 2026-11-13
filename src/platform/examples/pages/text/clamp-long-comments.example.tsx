import { useId, useState } from "react";
import { Avatar, Button, Card, Heading, Stack, Text } from "@zen-ds/react";
import { TODAY, daysFromToday, formatRelative, initials, people, type Person, type PersonId } from "../../data";

/** A person as Avatar props: their photo, or initials on their steady theme. The text beside it already names them. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, alt: "", children: initials(person.name) };
const minutesAgo = (minutes: number) => new Date(TODAY.getTime() - minutes * 60_000);

type Comment = { id: string; author: PersonId; at: Date; text: string };
const comments: Comment[] = [
  { id: "c1", author: "chi", at: minutesAgo(0.5), text: "I moved the points history into its own tab instead of the bottom of the wallet. People in the last round kept scrolling past it, and the tab gives us room for filters by store and by month. Earned points are green with a plus sign, spent ones keep the minus sign and stay neutral, so the colour is never the only signal. Expiring points get a line of their own at the top with the date they go." },
  { id: "c2", author: "bao", at: minutesAgo(48), text: "The rewards API returns 50 rows a page, so endless scrolling is fine on our side." },
  { id: "c3", author: "ava", at: daysFromToday(-1, 16, 20), text: "From the five sessions: four people looked for their points under Account first, and two of them read “Pending” as “Lost”. Could we say when pending points land, like “Lands Oct 2”, instead of a status word? The one person who used the month filter liked it, but nobody found it without help, so it might need a label rather than an icon." },
  { id: "c4", author: "duy", at: daysFromToday(-2, 9, 45), text: "Phin & Co sign off on Friday, so let's freeze the copy by Thursday noon." },
];
/** Longer than this, a comment runs past three lines in the card, so it gets Show more. */
const CLAMP_FROM = 160;

function CommentItem({ comment }: { comment: Comment }) {
  const [expanded, setExpanded] = useState(false);
  const author = people[comment.author];
  const textId = useId();
  const long = comment.text.length > CLAMP_FROM;
  return (
    <Stack as="li" direction="row" gap="sm" align="start">
      <Avatar size="md" {...avatarOf(author)} />
      <Stack gap="xs" width="fill">
        {/* Weight sets the name apart and tone quiets the time; the sizes stay. */}
        <Stack direction="row" gap="2xs" align="baseline" wrap>
          <Text as="span" textStyle="Body/Small/Bold">{author.name}</Text>
          <Text as="span" textStyle="Caption/Regular" tone="light">{formatRelative(comment.at)}</Text>
        </Stack>
        {/* Clamped, the whole comment stays in the DOM, so a screen reader still reads it in full. */}
        <Text id={textId} truncate={expanded ? undefined : 3}>{comment.text}</Text>
        {long ? (
          <Stack align="start"><Button level="tertiary" size="sm" aria-expanded={expanded} aria-controls={textId} onClick={() => setExpanded(!expanded)}>
            {expanded ? "Show less" : "Show more"}
          </Button></Stack>
        ) : null}
      </Stack>
    </Stack>
  );
}

export default function Comments() {
  const titleId = useId();
  return (
    <Card as="section" theme="default" aria-labelledby={titleId}>
      <Stack gap="md">
        <Stack gap="xs">
          <Heading level={4} id={titleId} textStyle="Heading/Subheading">Comments</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">PHIN-214 · Design the points history screen</Text>
        </Stack>
        <Stack as="ul" gap="md" aria-labelledby={titleId}>
          {comments.map((comment) => <CommentItem key={comment.id} comment={comment} />)}
        </Stack>
      </Stack>
    </Card>
  );
}

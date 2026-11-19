import { useRef, useState } from "react";
import { Avatar, Box, EmptyState, Heading, IconButton, List, ListBox, ListItem, Segmented, Stack, Text, useToast } from "@zen-ds/react";
import { initials, people, type Person, type PersonId } from "../../data";

/** A person as Avatar props: their photo, or initials on their steady theme. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, children: initials(person.name) };

type ReviewComment = { id: string; author: PersonId; text: string; resolved: boolean };
const reviewComments: ReviewComment[] = [
  { id: "c1", author: "ava", text: "Make the points balance bigger. It's what people look for first.", resolved: false },
  { id: "c2", author: "hana", text: "Phin & Co want the expiry date beside each reward.", resolved: false },
  { id: "c3", author: "bao", text: "The API returns 20 rows a page, so load more in twenties.", resolved: false },
  { id: "c4", author: "duy", text: "Add an empty state for new members.", resolved: true },
  { id: "c5", author: "alex", text: "Use Zen list rows for the history.", resolved: true },
];

export default function OpenAndResolved() {
  const { toast } = useToast();
  const [comments, setComments] = useState(reviewComments);
  const [view, setView] = useState("open");
  const open = comments.filter((comment) => !comment.resolved).length;
  const resolved = comments.length - open;
  const shown = comments.filter((comment) => comment.resolved === (view === "resolved"));
  // Each row's action, and the empty state's title: where focus goes when a row leaves.
  const actionRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const emptyRef = useRef<HTMLSpanElement>(null);
  const setResolved = (id: string, value: boolean) => setComments((list) => list.map((comment) => comment.id === id ? { ...comment, resolved: value } : comment));
  const toggle = (comment: ReviewComment, index: number) => {
    setResolved(comment.id, !comment.resolved);
    toast({ title: comment.resolved ? "Comment reopened" : "Comment resolved", action: { label: "Undo", onClick: () => setResolved(comment.id, comment.resolved) } });
    // The row leaves this view with its button: focus moves to the next row's action, or the empty state, never <body>.
    const left = shown.filter((item) => item.id !== comment.id);
    const next = left[Math.min(index, left.length - 1)];
    setTimeout(() => (next ? actionRefs.current[next.id] : emptyRef.current)?.focus());
  };
  return (
    // A ListBox: title, caption and the view switch in its Header-Slot (stacked 16px), the comments in its Body-Slot.
    <Stack><ListBox width="fill" maxWidth={440} alignSelf="center"
      header={<>
        <Stack gap="2xs">
          <Heading level={4} textStyle="Heading/Subheading">Comments</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">Points history screen · Loyalty app</Text>
        </Stack>
        {/* Counters follow the data and disappear at zero. */}
        <Segmented fullWidth aria-label="Comments" value={view} onValueChange={setView} options={[
          { id: "open", label: "Open", badge: open || undefined },
          { id: "resolved", label: "Resolved", badge: resolved || undefined },
        ]} />
      </>}>
      <Box>
        {/* The list or its empty state. */}
        {shown.length ? (
          <List aria-label={view === "open" ? "Open comments" : "Resolved comments"}>
            {shown.map((comment, index) => {
              const author = people[comment.author];
              return (
                <ListItem key={comment.id} title={author.name} caption={comment.text} leading={<Avatar size="md" {...avatarOf(author)} />}
                  trailing={<IconButton ref={(button) => { actionRefs.current[comment.id] = button; }} appearance="flat" icon={comment.resolved ? "icon-reverse-left-line" : "icon-check-line"}
                    aria-label={`${comment.resolved ? "Reopen" : "Resolve"} comment from ${author.name}`} onClick={() => toggle(comment, index)} />} />
              );
            })}
          </List>
        ) : view === "open" ? (
          <EmptyState size="sm" headingLevel={5} icon="icon-message-chat-circle-line" title={<span ref={emptyRef} tabIndex={-1}>No open comments</span>}
            secondaryAction={{ label: "Show resolved", onClick: () => setView("resolved") }}>
            Every comment on this screen is resolved.
          </EmptyState>
        ) : (
          <EmptyState size="sm" headingLevel={5} icon="icon-message-chat-circle-line" title={<span ref={emptyRef} tabIndex={-1}>No resolved comments yet</span>}
            secondaryAction={{ label: "Show open", onClick: () => setView("open") }}>
            Comments you resolve move here.
          </EmptyState>
        )}
      </Box>
    </ListBox></Stack>
  );
}

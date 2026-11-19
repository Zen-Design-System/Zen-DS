import { useId, useRef, useState } from "react";
import { Avatar, Button, Card, Form, FormActions, Heading, InputField, List, ListItem, Stack, Text, useToast } from "@zen-ds/react";
import { TODAY, daysFromToday, formatRelative, initials, people, type Person, type PersonId } from "../../data";

type Comment = { id: string; author: PersonId; text: string; at: Date };
const thread: Comment[] = [
  { id: "c1", author: "chi", text: "Points history is ready for review. I split pending and earned points into two tabs.", at: daysFromToday(0, 9, 5) },
  { id: "c2", author: "bao", text: "Looks good. The rewards API returns both lists already, so no backend change.", at: daysFromToday(0, 10, 17) },
];

/** A person as Avatar props: their photo, or initials on their steady theme. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, background: "subtle" as const, alt: "", children: initials(person.name) };

/** A comment thread whose first send fails: a Negative toast with Retry waits until it is used or closed. */
export default function FailedComment() {
  const { toast, dismiss } = useToast();
  const titleId = useId();
  const field = useRef<HTMLInputElement>(null);
  const [comments, setComments] = useState(thread);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string>();
  const [attempts, setAttempts] = useState(0);
  // A send that works clears the error toast, if one is still open.
  const post = (text: string) => {
    setComments((list) => [...list, { id: `c${list.length + 1}`, author: "alex", text, at: TODAY }]);
    setDraft("");
    dismiss("comment-failed");
  };
  // The first send drops (the connection blinked): the text stays in the field, and the Negative toast waits
  // (duration: null) until Retry or close. It never takes focus; its action is in the Tab order after the field.
  const send = () => {
    const text = draft.trim();
    if (!text) { setError("Write a comment first"); return; }
    setAttempts(attempts + 1);
    if (attempts === 0) {
      // Retry closes its toast, so focus goes back to the (now empty) field for the next comment.
      toast({ id: "comment-failed", type: "negative", title: "Comment not sent", children: "Your text is still in the box.", duration: null, action: { label: "Retry", onClick: () => { post(text); field.current?.focus(); } } });
      return;
    }
    post(text);
  };
  return (
    <Card theme="default" spacing="md" width="fill" maxWidth={480}>
      {/* Two groups in one surface (lg): the thread, then the reply form; each keeps md inside. */}
      <Stack as="section" gap="lg" aria-labelledby={titleId}>
        <Stack gap="md">
          <Heading level={4} id={titleId} textStyle="Heading/Subheading">Comments</Heading>
          <List aria-labelledby={titleId}>
            {comments.map((comment) => (
              <ListItem key={comment.id} title={people[comment.author].name} caption={comment.text}
                leading={<Avatar size="md" {...avatarOf(people[comment.author])} />}
                trailing={<Text as="span" textStyle="Caption/Regular" tone="light">{formatRelative(comment.at)}</Text>} />
            ))}
          </List>
        </Stack>
        {/* Enter sends; an empty comment shows its error on the field, and Form moves focus there. */}
        <Form onSubmit={send} gap="md" aria-label="Reply">
          <InputField ref={field} label="Comment" placeholder="Reply to Chi and Bao" value={draft} error={error}
            onValueChange={(value) => { setDraft(value); setError(undefined); }} />
          <FormActions>
            <Button level="primary" type="submit">Send comment</Button>
          </FormActions>
        </Form>
      </Stack>
    </Card>
  );
}

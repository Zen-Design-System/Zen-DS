import { useRef, useState } from "react";
import { Avatar, BadgeStatus, Button, Card, Form, FormActions, HeadingField, RichTextField, Stack, Text, useToast } from "@zen-ds/react";
import { formatDate, people, taskStep } from "../../data";

// A follow-up to LUM-088 with a title too long for one line.
const taskSaved = {
  key: "LUM-097",
  status: "In progress" as const,
  due: new Date(2026, 9, 9),
  title: "Run five follow-up sessions on the new transfer flow with Lumen Bank retail customers in Ho Chi Minh City",
  notes: "<p>Goal: check that the new review screen fixes where customers hesitated in round one.</p><ul><li>Recruit five retail customers through the Lumen Bank research panel</li><li>Test the review screen and the saved payees list</li><li>Share the top findings with Hana Kim before the Oct 9 review</li></ul>",
};

/** A multi-line Heading field and a Rich-text field, saved together through one Save changes. */
export default function TaskDetail() {
  const { toast } = useToast();
  const [saved, setSaved] = useState({ title: taskSaved.title, notes: taskSaved.notes });
  const [title, setTitle] = useState(taskSaved.title);
  const [notes, setNotes] = useState(taskSaved.notes);
  const dirty = title !== saved.title || notes !== saved.notes;
  // Both actions disable themselves once used: focus goes back to the title, not to the page.
  const titleRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const save = () => { titleRef.current?.focus(); setSaved({ title, notes }); toast({ type: "positive", title: "Task updated" }); };
  const discard = () => { titleRef.current?.focus(); setTitle(saved.title); setNotes(saved.notes); };
  const ava = people.ava;
  return (
    <Card theme="default">
      {/* Blocks of one card md apart: the task header, the notes, the actions. */}
      <Form onSubmit={save} gap="md">
        <Stack gap="sm">
          <Stack gap="xs">
            <Text textStyle="Body/Small/Bold" tone="base">{taskSaved.key} · Online banking redesign</Text>
            <HeadingField ref={titleRef} headingSize="h3" multiline aria-label="Task title" placeholder="Task title" value={title} onValueChange={setTitle} />
          </Stack>
          <Stack direction="row" gap="xs" align="center" wrap>
            <BadgeStatus status={taskStep[taskSaved.status]}>{taskSaved.status}</BadgeStatus>
            <Stack direction="row" gap="xs" align="center">
              <Avatar size="xs" theme="photo" src={ava.photo} alt="" />
              <Text as="span" textStyle="Body/Small/Regular" tone="base">{ava.name}</Text>
            </Stack>
            <Text as="span" textStyle="Body/Small/Regular" tone="base">• Due {formatDate(taskSaved.due)}</Text>
          </Stack>
        </Stack>
        <RichTextField label="Notes" maxLength={2000} characterLimit value={notes} onValueChange={(html) => setNotes(html)} editorBar />
        {/* Both actions wait for a change; the status says why they turned on. */}
        <FormActions align="between">
          <Text as="span" role="status" textStyle="Body/Small/Regular" tone="base">{dirty ? "Unsaved changes" : ""}</Text>
          <Button level="tertiary" disabled={!dirty} onClick={discard}>Cancel</Button>
          <Button level="primary" type="submit" disabled={!dirty}>Save changes</Button>
        </FormActions>
      </Form>
    </Card>
  );
}

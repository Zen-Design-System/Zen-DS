import { useRef, useState } from "react";
import { Button, Card, Dialog, Form, FormActions, Heading, Stack, Text, TextAreaField, useToast } from "@zen-ds/react";
import { tasks } from "../../data";

const task = tasks[0];
const brief = "Show earned and spent points by month. Each row names the store and the receipt total, and a tap opens the receipt.";

/** A task's description with an editor; Cancel with edits asks before throwing them away. */
export default function DiscardChanges() {
  const { toast } = useToast();
  const editRef = useRef<HTMLButtonElement>(null);
  const [saved, setSaved] = useState(brief);
  const [draft, setDraft] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const editing = draft !== null;
  // The editor closes with the button that was pressed: focus goes back to Edit description.
  const close = () => { setDraft(null); setTimeout(() => editRef.current?.focus()); };
  // Cancel asks only when something changed; untouched text just closes the editor.
  const cancel = () => (draft !== saved ? setConfirming(true) : close());
  const save = () => { setSaved(draft?.trim() || saved); close(); toast({ title: "Description saved" }); };
  const discard = () => { setConfirming(false); close(); };
  return (
    <Card theme="default" spacing="md" width="fill">
      <Stack gap="md">
        <Stack gap="xs">
          <Heading level={4} textStyle="Heading/Subheading">{task.title}</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">{`${task.key} · Loyalty app`}</Text>
        </Stack>
        {editing ? (
          <Form onSubmit={save} gap="md">
            <TextAreaField label="Description" rows={4} value={draft} onValueChange={setDraft} />
            <FormActions>
              <Button level="tertiary" onClick={cancel}>Cancel</Button>
              <Button level="primary" type="submit">Save description</Button>
            </FormActions>
          </Form>
        ) : (
          <Stack gap="md" align="start">
            <Stack gap="xs">
              <Heading level={5} textStyle="Body/Small/Bold" tone="light">Description</Heading>
              <Text>{saved}</Text>
            </Stack>
            <Button ref={editRef} level="tertiary" startIcon="icon-pencil-line" onClick={() => setDraft(saved)}>Edit description</Button>
          </Stack>
        )}
      </Stack>
      <Dialog open={confirming} onOpenChange={setConfirming} theme="warning" title="Discard unsaved changes?"
        description={`Your edits to the ${task.key} description will be lost.`}
        primaryAction={{ label: "Discard changes", level: "danger", onClick: discard }}
        secondaryAction={{ label: "Keep editing", autoFocus: true }} />
    </Card>
  );
}

import { useRef, useState } from "react";
import { AutocompleteField, Button, Card, Form, FormActions, Heading, Stack, Text, useToast } from "@zen-ds/react";
import { files, formatRelative, peopleList, type Person } from "../../data";

/** People with a photo become Leading-Photo tags. */
const withPhoto = peopleList.filter((person) => person.photo);
const personOption = (person: Person) => ({ id: person.id, label: person.name, photoSrc: person.photo });

export default function Reviewers() {
  const { toast } = useToast();
  const editRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [saved, setSaved] = useState(["chi", "bao", "ava"]);
  const [draft, setDraft] = useState(saved);
  const [editing, setEditing] = useState(true);
  const [error, setError] = useState<string>();
  const file = files[0];
  // Switching between editing and Read-only replaces the buttons, so focus moves to the button that takes their place.
  const switchTo = (next: boolean) => {
    setEditing(next);
    setTimeout(() => (next ? cancelRef : editRef).current?.focus());
  };
  const save = () => {
    if (!draft.length) { setError("Add at least one reviewer"); return; }
    setSaved(draft);
    switchTo(false);
    toast({ type: "positive", title: "Reviewers saved" });
  };
  return (
    <Card theme="default">
      <Form onSubmit={save}>
        <Stack gap="xs" align="stretch">
          <Heading level={4} textStyle="Heading/Subheading">{file.name}</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">{`Design review · updated ${formatRelative(file.updated).toLowerCase()}`}</Text>
        </Stack>
        <AutocompleteField label="Reviewers" readOnly={!editing} addLabel="Add people" popoverLabel="Studio members" searchPlaceholder="Search people"
          options={withPhoto.filter((person) => person.id !== "alex").map(personOption)}
          value={editing ? draft : saved} error={error}
          onValueChange={(next) => { setDraft(next); setError(undefined); }} />
        {editing ? (
          <FormActions>
            <Button ref={cancelRef} level="tertiary" onClick={() => { setDraft(saved); setError(undefined); switchTo(false); }}>Cancel</Button>
            <Button level="primary" type="submit">Save reviewers</Button>
          </FormActions>
        ) : (
          // Read-only: nothing to submit, just the way back into editing.
          <Stack direction="row" justify="end">
            <Button ref={editRef} level="tertiary" startIcon="icon-edit-02-line" onClick={() => { setDraft(saved); switchTo(true); }}>Edit reviewers</Button>
          </Stack>
        )}
      </Form>
    </Card>
  );
}

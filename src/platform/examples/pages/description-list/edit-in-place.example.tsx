import { useId, useRef, useState, type FormEvent } from "react";
import {
  Button, Card, DescriptionList, Form, FormActions, Heading, InputField, Stack, Text, TextAreaField, VisuallyHidden, type DescriptionListItem,
} from "@zen-ds/react";

type ContactId = "name" | "phone" | "address" | "emergency";
type ContactRow = { id: ContactId | "email"; term: string; editable: boolean; required?: string; multiline?: boolean; note?: string };
const contactRows: ContactRow[] = [
  { id: "name", term: "Display name", editable: true, required: "Enter a display name" },
  // A value people can't change says why, so the missing Edit doesn't read as a gap.
  { id: "email", term: "Work email", editable: false, note: "Managed by your workspace admin" },
  { id: "phone", term: "Phone", editable: true, required: "Enter a phone number, like +84 90 812 3344" },
  { id: "address", term: "Mailing address", editable: true, required: "Enter a mailing address", multiline: true },
  { id: "emergency", term: "Emergency contact", editable: true },
];
const firstContact: Record<ContactRow["id"], string> = {
  name: "Alex Duong",
  email: "alex@dizai.studio",
  phone: "+84 90 812 3344",
  address: "Apartment 12.04, Sunrise City, 23 Nguyen Huu Tho, District 7, Ho Chi Minh City",
  emergency: "",
};
/** "Mailing address" → "mailing address", for names that follow a verb ("Edit mailing address"). */
const lower = (term: string) => term.charAt(0).toLowerCase() + term.slice(1);

/** Contact details in stacked rows: each Edit turns one value into a field, in place. */
export default function ContactDetails() {
  const [values, setValues] = useState(firstContact);
  const [editing, setEditing] = useState<ContactRow | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string>();
  const [announcement, setAnnouncement] = useState("");
  const titleId = useId();
  // The open field, and each row's Edit button by row id: focus moves between them.
  const inputRef = useRef<HTMLInputElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const editRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const edit = (row: ContactRow) => {
    setEditing(row);
    setDraft(values[row.id]);
    setError(undefined);
    setTimeout(() => (row.multiline ? textAreaRef : inputRef).current?.focus());
  };
  // Cancel and Save hand focus back to the row's Edit button.
  const close = (row: ContactRow) => {
    setEditing(null);
    setTimeout(() => editRefs.current[row.id]?.focus());
  };
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing) return;
    const value = draft.trim();
    if (!value && editing.required) { setError(editing.required); return; }
    setValues((state) => ({ ...state, [editing.id]: value }));
    setAnnouncement(`${editing.term} saved`);
    close(editing);
  };
  return (
    <Card as="section" theme="default" aria-labelledby={titleId}>
      <Stack gap="md">
        <Stack gap="xs">
          <Heading level={4} id={titleId} textStyle="Heading/Subheading">Contact details</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">People at Đìzai Studio see these on your profile.</Text>
        </Stack>
        <DescriptionList layout="stacked" divider items={contactRows.map((row): DescriptionListItem => {
          const value = values[row.id];
          if (editing?.id === row.id) {
            const change = (next: string) => { setDraft(next); setError(undefined); };
            return {
              id: row.id, term: row.term,
              // The term above labels the field; Enter saves, Cancel keeps the old value. A long value (the address)
              // gets a Text Area, where Enter adds a line and ⌘/Ctrl+Enter saves.
              description: (
                <Form onSubmit={save} gap="md" aria-label={`Edit ${lower(row.term)}`}>
                  {row.multiline ? (
                    <TextAreaField ref={textAreaRef} aria-label={row.term} rows={3} value={draft} error={error} onValueChange={change}
                      onKeyDown={(event) => { if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} />
                  ) : (
                    <InputField ref={inputRef} aria-label={row.term} value={draft} error={error} onValueChange={change} />
                  )}
                  <FormActions>
                    <Button level="tertiary" onClick={() => close(row)}>Cancel</Button>
                    <Button level="primary" type="submit">Save</Button>
                  </FormActions>
                </Form>
              ),
            };
          }
          return {
            id: row.id, term: row.term,
            // A legitimately empty value says so; it is never blank or a dash. Line breaks typed in the address stay
            // (the value shows them as lines).
            description: row.note ? (
              <Stack gap="2xs">
                <span>{value}</span>
                <Text as="span" textStyle="Body/Small/Regular" tone="light">{row.note}</Text>
              </Stack>
            ) : value || "None",
            // One row edits at a time: while a field is open the other rows' actions wait, so no draft is dropped.
            action: row.editable && !editing ? (
              <Button ref={(button) => { editRefs.current[row.id] = button; }} level="tertiary" size="sm" onClick={() => edit(row)}>
                {value ? "Edit" : "Add"}<VisuallyHidden>{` ${lower(row.term)}`}</VisuallyHidden>
              </Button>
            ) : undefined,
          };
        })} />
        <VisuallyHidden role="status">{announcement}</VisuallyHidden>
      </Stack>
    </Card>
  );
}

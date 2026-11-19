import { useState } from "react";
import { Avatar, Button, Card, DateField, Form, FormActions, List, ListItem, SelectField, Stack, useToast } from "@zen-ds/react";
import { TODAY, initials, people } from "../../data";

/** "10/05/2026", the DateField's typed format, → a Date; null while the text is incomplete or not a real day. */
function parseTyped(text: string): Date | null {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());
  if (!match) return null;
  const [month, day, year] = [Number(match[1]) - 1, Number(match[2]), Number(match[3])];
  const date = new Date(year, month, day);
  return date.getMonth() === month && date.getDate() === day ? date : null;
}

/** The start date is Read-only; the end date is Disabled while the contract is permanent, and says why. */
export default function ContractDates() {
  const { toast } = useToast();
  const [type, setType] = useState("permanent");
  const [end, setEnd] = useState("");
  const [error, setError] = useState<string>();
  const permanent = type === "permanent";
  const save = () => {
    // A failed submit: Form moves focus to the end date and announces it.
    if (!permanent && !parseTyped(end)) { setError("Enter the last day of the contract, as MM/DD/YYYY"); return; }
    setError(undefined);
    toast({ type: "positive", title: "Contract saved" });
  };
  return (
    <Stack><Card theme="default" width="fill" maxWidth={440} alignSelf="center">
      <Form onSubmit={save} gap="md">
        {/* The person is a List row: it has no side padding of its own, so its text lines up with the fields. */}
        <List aria-label="Employee">
          <ListItem title={people.khoa.name} caption={`${people.khoa.role} · ${people.khoa.location}`}
            leading={<Avatar size="md" theme={people.khoa.theme} alt="">{initials(people.khoa.name)}</Avatar>} />
        </List>
        <SelectField label="Contract type" value={type} onValueChange={(next) => { setType(next); setError(undefined); }}
          options={[{ label: "Permanent", value: "permanent" }, { label: "Fixed term", value: "fixed" }]} />
        {/* Read-only: people read and copy the start date, but it changes only with a new contract. */}
        <DateField label="Start date" defaultValue="09/01/2026" readOnly today={TODAY} helpText="Set when the contract was signed." />
        {/* Disabled while the contract type rules it out; the help text says why. */}
        <DateField label="End date" today={TODAY} minDate={new Date(2026, 8, 1)} value={end} onValueChange={(next) => { setEnd(next); setError(undefined); }} error={error}
          disabled={permanent} helpText={permanent ? "Permanent contracts have no end date." : undefined} />
        <FormActions>
          <Button level="primary" type="submit">Save contract</Button>
        </FormActions>
      </Form>
    </Card></Stack>
  );
}

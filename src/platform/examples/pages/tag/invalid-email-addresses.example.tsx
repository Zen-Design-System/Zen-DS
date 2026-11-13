import { useId, useState } from "react";
import { AutocompleteField, Button, Card, Form, FormActions, Heading, Stack, Text, plural, useToast } from "@zen-ds/react";
import { projectById } from "../../data";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** The project the guests join, and the Lumen Bank people the studio already works with. */
const guestProject = projectById("lumen-banking");
const clientContacts = ["lena.park@lumenbank.com", "minh.do@lumenbank.com", "thao.pham@lumenbank.com", "vy.nguyen@lumenbank.com"];
/** Typed in by hand a moment ago: the domain is missing its ".com". */
const typedAddress = "quang@lumenbank";

export default function InviteGuests() {
  const { toast } = useToast();
  const titleId = useId();
  // A tag shows only for a value that is one of the options, so an address typed in becomes an option too.
  const [options, setOptions] = useState([...clientContacts, typedAddress].map((email) => ({ id: email, label: email })));
  const [value, setValue] = useState(["lena.park@lumenbank.com", typedAddress]);
  const [error, setError] = useState<string>();
  const invalid = value.filter((email) => !emailPattern.test(email));
  const fieldError = error ?? (invalid.length
    ? (invalid.length === 1
      ? `${invalid[0]} isn't a valid email address. Remove it and add the full address.`
      : `${plural(invalid.length, "address", "addresses")} aren't valid. Remove them and add the full addresses.`)
    : undefined);
  // Send with an invalid address: the field keeps its error, and Form announces it and focuses the first Error tag's
  // Remove, the fix the error text asks for.
  const send = () => {
    if (!value.length) { setError("Add at least one email address"); return; }
    if (invalid.length) return;
    toast({ type: "positive", title: `${plural(value.length, "invite")} sent` });
    setValue([]);
  };
  return (
    <Card as="section" theme="default" aria-labelledby={titleId}>
      <Form onSubmit={send} invalidMessage={() => (invalid.length ? `${invalid[0]} isn't a valid email address` : "Add at least one email address")}>
        <Stack gap="xs" align="stretch">
          <Heading level={4} id={titleId} textStyle="Heading/Subheading">Invite client guests</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">{`${guestProject.name} · ${guestProject.client}`}</Text>
        </Stack>
        <AutocompleteField label="Email addresses" addLabel="Add email" popoverLabel="Pick a contact or type an address" searchPlaceholder="name@company.com"
          createLabel="Add" options={options} value={value} invalidValues={invalid} error={fieldError}
          helpText="Guests see this project's files and reviews."
          onValueChange={(next) => { setValue(next); setError(undefined); }}
          onCreate={(label) => { const email = label.trim().toLowerCase(); setOptions((list) => [...list, { id: email, label: email }]); return email; }} />
        <FormActions>
          <Button level="primary" type="submit" startIcon="icon-send-01-line">Send invites</Button>
        </FormActions>
      </Form>
    </Card>
  );
}

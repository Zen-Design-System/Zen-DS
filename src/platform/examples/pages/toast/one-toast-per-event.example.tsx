import { useId } from "react";
import { Avatar, Heading, IconButton, List, ListBox, ListItem, useToast } from "@zen-ds/react";
import { initials, people, type Person, type PersonId } from "../../data";

const contacts: PersonId[] = ["hana", "mai", "minhAnh", "duy"];

/** A person as Avatar props: their photo, or initials on their steady theme. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, background: "subtle" as const, alt: "", children: initials(person.name) };

/** Copy an email address: everyday feedback, one toast however often it happens. */
export default function CopyEmail() {
  const { toast } = useToast();
  const titleId = useId();
  // The same id replaces the toast on screen: five copies in a row leave one toast, showing the latest address.
  const copy = (person: Person) => {
    void navigator.clipboard?.writeText(person.email).catch(() => undefined);
    toast({ id: "email-copied", title: "Email copied", children: person.email });
  };
  return (
    <ListBox as="section" aria-labelledby={titleId} width="fill" maxWidth={480}
      header={<Heading level={4} id={titleId} textStyle="Heading/Subheading">Who to ask</Heading>}>
      <List aria-labelledby={titleId}>
        {contacts.map((id) => (
          <ListItem key={id} title={people[id].name} caption={`${people[id].role} · ${people[id].email}`}
            leading={<Avatar size="md" {...avatarOf(people[id])} />}
            trailing={<IconButton appearance="flat" level="primary" icon="icon-copy-line" aria-label={`Copy ${people[id].name}’s email`} tooltip="Copy email" onClick={() => copy(people[id])} />} />
        ))}
      </List>
    </ListBox>
  );
}

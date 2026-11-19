import { useState, type ReactNode } from "react";
import { Avatar, Badge, Button, Card, DockIcon, Heading, InputField, List, ListItem, ModalForm, SelectField, Stack, Text, useToast, useZen } from "@zen-ds/react";
import { initials, people, type Person, type PersonId } from "../../data";

type Member = { id: string; email: string; role: string; person?: Person };
const roleOptions = [{ value: "Editor", label: "Editor" }, { value: "Commenter", label: "Commenter" }, { value: "Viewer", label: "Viewer" }];
const roleHelp: Record<string, string> = { Editor: "Can change files and tasks.", Commenter: "Can view and comment.", Viewer: "Can view only." };
const loyaltyMembers: Member[] = (["chi", "bao", "em", "duy"] as PersonId[]).map((id) => ({ id, email: people[id].email, role: id === "duy" ? "Commenter" : "Editor", person: people[id] }));

/** A person as Avatar props: their photo, or initials on their steady theme. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, children: initials(person.name) };

/** A row with an optional Badge at its end. ListItem titles stay on one line, so on a phone the Badge moves under the
 *  caption and the title wraps instead of being cut (the Contents slot). */
function Row({ title, caption, leading, trailing }: { title: string; caption: string; leading: ReactNode; trailing?: ReactNode }) {
  const narrow = useZen()?.breakpoint === "mobile";
  if (!narrow || !trailing) return <ListItem title={title} caption={caption} leading={leading} trailing={trailing} />;
  return (
    <ListItem title={title} leading={leading}>
      <Stack gap="3xs" align="start">
        <Text as="span" textStyle="Body/Base/Bold">{title}</Text>
        <Text as="span" textStyle="Body/Small/Regular" tone="light">{caption}</Text>
        {trailing}
      </Stack>
    </ListItem>
  );
}

/** The people on a project; Invite people opens a short ModalForm, validated on submit. */
export default function InviteByEmail() {
  const { toast } = useToast();
  const [members, setMembers] = useState(loyaltyMembers);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Editor");
  const [error, setError] = useState<string>();
  const start = () => { setEmail(""); setRole("Editor"); setError(undefined); setOpen(true); };
  const send = () => {
    const address = email.trim().toLowerCase();
    const member = members.find((m) => m.email === address);
    const problem = !address ? "Enter an email address."
      : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address) ? "Enter an email like name@phinco.vn."
        : member ? `${member.person?.name ?? address} is already on this project.` : undefined;
    // A blocked submit: ModalForm moves focus to the field in error, so its message is read out.
    if (problem) { setError(problem); return; }
    setMembers((list) => [...list, { id: address, email: address, role }]);
    setOpen(false);
    toast({ title: "Invite sent" });
  };
  return (
    <Card theme="default" spacing="md" width="fill">
      <Stack gap="md">
        <Stack direction="row" align="start" justify="between" gap="md" wrap>
          <Heading level={4} textStyle="Heading/Subheading">People on Loyalty app</Heading>
          <Button level="tertiary" startIcon="icon-user-plus-line" onClick={start} size="sm">Invite people</Button>
        </Stack>
        <List aria-label="People on Loyalty app">
          {members.map((member) => member.person ? (
            <Row key={member.id} title={member.person.name} caption={`${member.role} · ${member.person.role}`}
              leading={<Avatar size="md" {...avatarOf(member.person)} />} />
          ) : (
            // Someone invited by email has no name or photo yet: a mail Dock Icon at the Avatars' size.
            <Row key={member.id} title={member.email} caption={`${member.role} · invited just now`}
              leading={<DockIcon icon="icon-mail-01-line" theme="neutral" background="subtle" />}
              trailing={<Badge theme="yellow" background="subtle">Pending</Badge>} />
          ))}
        </List>
      </Stack>
      <ModalForm open={open} onOpenChange={setOpen} title="Invite to Loyalty app" description="They get an email with a link to join the project."
        onSubmit={send} primaryAction={{ label: "Send invite" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Email" type="email" placeholder="name@phinco.vn" autoComplete="off" value={email}
          onValueChange={(value) => { setEmail(value); setError(undefined); }} error={error} />
        <SelectField label="Role" options={roleOptions} value={role} onValueChange={setRole} helpText={roleHelp[role]} />
      </ModalForm>
    </Card>
  );
}

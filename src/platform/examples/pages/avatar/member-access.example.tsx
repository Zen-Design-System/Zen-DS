import { Avatar, AvatarStatus, Button, List, ListBox, ListItem, Stack, Text, useToast, type AvatarStatusValue } from "@zen-ds/react";
import { initials, people, type Person } from "../../data";

type Access = { person: Person; status: AvatarStatusValue; word: string; detail: string };
const access: Access[] = [
  { person: people.bao, status: "active", word: "Active", detail: "signed in today" },
  { person: people.linh, status: "pending", word: "Pending", detail: "invite sent Sep 28" },
  { person: people.khoa, status: "inactive", word: "Inactive", detail: "no sign-in for 90 days" },
  { person: people.mai, status: "disabled", word: "Disabled", detail: "turned off by an admin" },
];

export default function MemberAccess() {
  const { toast } = useToast();
  return (
    <Stack gap="md" align="stretch">
      <Stack direction="row" gap="md" align="center" wrap>
        {access.map(({ status, word }) => (
          <Stack key={status} direction="row" gap="2xs" align="center">
            <AvatarStatus size="xs" status={status} decorative />
            <Text as="span" textStyle="Body/Small/Regular" tone="light">{`1 ${word.toLowerCase()}`}</Text>
          </Stack>
        ))}
      </Stack>
      <ListBox>
        <List aria-label="Workspace members">
          {access.map(({ person, status, word, detail }) => (
            <ListItem key={person.id} title={person.name} caption={`${word} · ${detail}`}
              leading={person.photo
                ? <Avatar size="md" theme="photo" src={person.photo} alt="" status={status} />
                : <Avatar size="md" theme={person.theme} alt="" status={status}>{initials(person.name)}</Avatar>}
              trailing={status === "pending" ? <Button level="tertiary" size="md" onClick={() => toast({ title: "Invite sent again", children: `${person.name} gets a new link by email.` })}>Resend</Button> : undefined} />
          ))}
        </List>
      </ListBox>
    </Stack>
  );
}

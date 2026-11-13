import { useState } from "react";
import { Avatar, Chip, List, ListBox, ListItem, Stack, Text, plural } from "@zen-ds/react";
import { TODAY, daysFromToday, formatRelative, initials, me, peopleList, type Person, type PersonId } from "../../data";

/** In a row the name sits next to the Avatar, so alt is empty and the initials are passed as children. */
const RowAvatar = ({ person, status }: { person: Pick<Person, "name" | "photo" | "theme">; status?: boolean }) => person.photo
  ? <Avatar size="md" theme="photo" src={person.photo} alt="" status={status} />
  : <Avatar size="md" theme={person.theme} alt="" status={status} background="solid">{initials(person.name)}</Avatar>;

type Presence = { person: Person; online: boolean; lastActive?: Date };
/** When the people who are away were last active. */
const lastActive: Partial<Record<PersonId, Date>> = { mai: new Date(TODAY.getTime() - 13 * 60 * 1000), minhAnh: daysFromToday(0, 8, 50), gia: daysFromToday(-1, 18, 40) };
/** The Ho Chi Minh City office: who is online comes from the studio's own presence, online first. */
const officePresence: Presence[] = peopleList.filter((person) => person.location === "Ho Chi Minh City")
  .map((person) => ({ person, online: Boolean(person.online), lastActive: lastActive[person.id as PersonId] }))
  .sort((a, b) => Number(b.online) - Number(a.online) || (b.lastActive?.getTime() ?? 0) - (a.lastActive?.getTime() ?? 0));

export default function WhosOnline() {
  const [onlineOnly, setOnlineOnly] = useState(false);
  const online = officePresence.filter((member) => member.online).length;
  const rows = onlineOnly ? officePresence.filter((member) => member.online) : officePresence;
  return (
    <Stack gap="md" align="stretch">
      <Stack direction="row" gap="xs" align="center" justify="between">
        <Text as="span" textStyle="Body/Small/Medium" tone="base" role="status">{`${online} of ${plural(officePresence.length, "person", "people")} online`}</Text>
        <Chip variant="normal" level="secondary" selected={onlineOnly} onClick={() => setOnlineOnly((on) => !on)}>Online now</Chip>
      </Stack>
      {/* A loose list on the Surface-Alt stage sits in a ListBox; its Body-Slot insets the rows. */}
      <ListBox>
        <List aria-label="Ho Chi Minh City office">
          {rows.map(({ person, online: isOnline, lastActive }) => (
            <ListItem key={person.id}
              leading={<RowAvatar person={person} status={isOnline} />}
              title={person.id === me.id ? `${person.name} (you)` : person.name}
              caption={isOnline ? "Online" : `Away · ${formatRelative(lastActive!)}`} />
          ))}
        </List>
      </ListBox>
    </Stack>
  );
}

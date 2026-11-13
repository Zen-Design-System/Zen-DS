import { useId, useState } from "react";
import { Avatar, Heading, List, ListBox, ListItem, Stack, plural } from "@zen-ds/react";
import { me, studio, workspacePlan } from "../../data";

const workspaces = [
  { id: "dizai", name: studio.name, logo: studio.logo, initials: "ĐS", theme: "indigo" as const, caption: `${plural(workspacePlan.seats, "member")} · Owner` },
  { id: "phin", name: "Phin & Co", initials: "PC", theme: "brown" as const, caption: "12 members · Guest" },
  { id: "lumen", name: "Lumen Bank", initials: "LB", theme: "blue" as const, caption: "9 members · Guest" },
  { id: "mekong", name: "Mekong Freight", initials: "MF", theme: "indigo" as const, caption: "6 members · Guest" },
];

export default function SwitchWorkspace() {
  const accountId = useId();
  const workspacesId = useId();
  const [current, setCurrent] = useState("dizai");
  return (
    // Each group is a ListBox headed by its label (Figma List-Box Header-Slot), so the label and the rows share
    // Card-padding-medium on every device; rows have no side padding of their own.
    <Stack gap="lg" align="stretch">
      <ListBox as="section" aria-labelledby={accountId}
        header={<Heading level={4} id={accountId} textStyle="Body/Small/Bold" tone="light">Signed in as</Heading>}>
        <List aria-labelledby={accountId}>
          <ListItem leading={<Avatar size="md" theme="photo" src={me.photo} alt="" />} title={me.name} caption={me.email} />
        </List>
      </ListBox>
      <ListBox as="section" aria-labelledby={workspacesId}
        header={<Heading level={4} id={workspacesId} textStyle="Body/Small/Bold" tone="light">Workspaces</Heading>}>
        <List aria-labelledby={workspacesId}>
          {workspaces.map((workspace) => (
            <ListItem key={workspace.id} selected={current === workspace.id} onClick={() => setCurrent(workspace.id)}
              leading={workspace.logo
                ? <Avatar size="md" shape="square" theme="photo" src={workspace.logo} alt="" />
                : <Avatar size="md" shape="square" theme={workspace.theme} alt="">{workspace.initials}</Avatar>}
              title={workspace.name} caption={workspace.caption} />
          ))}
        </List>
      </ListBox>
    </Stack>
  );
}

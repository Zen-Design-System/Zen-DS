import { useId } from "react";
import { Avatar, Card, DescriptionList, Divider, DockIcon, Heading, IconButton, List, ListItem, Stack, Text, useToast } from "@zen-ds/react";
import { daysFromToday, formatTime, people, projects } from "../../data";

const chi = people.chi;
const chiProjects = projects.filter((project) => project.members.includes("chi")).slice(0, 2);

/** Inside a card, spacing groups most things; a divider only where two groups would blur, never at the card's edges. */
export default function ProfileCard() {
  const { toast } = useToast();
  const titleId = useId();
  const copyEmail = () => {
    void navigator.clipboard?.writeText(chi.email).catch(() => undefined);
    toast({ title: "Email copied", children: chi.email });
  };
  return (
    <Card theme="default" as="article" aria-labelledby={titleId}>
      {/* The person, their details and their projects are groups of one surface (lg); the avatar keeps the gap a List
          row keeps between its leading visual and its text (md). */}
      <Stack gap="lg">
        <Stack direction="row" gap="md">
          <Avatar size="large" theme="photo" src={chi.photo} alt="" />
          <Stack gap="xs">
            <Heading level={4} id={titleId} textStyle="Heading/Subheading">{chi.name}</Heading>
            <Text textStyle="Body/Small/Regular" tone="base">{`${chi.role} · ${chi.team}`}</Text>
          </Stack>
        </Stack>
        <Divider />
        <DescriptionList items={[
          { id: "email", term: "Email", description: chi.email, action: <IconButton appearance="flat" level="primary" size="sm" icon="icon-copy-line" aria-label="Copy email" onClick={copyEmail} /> },
          { id: "location", term: "Location", description: chi.location },
          { id: "time", term: "Local time", description: formatTime(daysFromToday(0)) },
        ]} divider />
        <Divider />
        <Stack gap="xs">
          <Heading level={5} textStyle="Body/Small/Bold" tone="light">Projects</Heading>
          <List aria-label={`${chi.name}'s projects`}>
            {chiProjects.map((project) => (
              <ListItem key={project.id} leading={<DockIcon icon={project.icon} theme={project.theme} background="subtle" size="medium" />} title={project.name}
                caption={`${project.client} · ${project.lead === chi.id ? "Lead" : "Member"}`} />
            ))}
          </List>
        </Stack>
      </Stack>
    </Card>
  );
}

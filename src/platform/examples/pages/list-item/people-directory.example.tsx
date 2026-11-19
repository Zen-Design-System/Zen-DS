import { useId, useState } from "react";
import {
  Avatar, BadgeStatus, Box, Button, Card, Chip, DescriptionList, DockIcon, EmptyState, Grid, Heading, List, ListBox, ListItem, Search, Stack, Text, plural,
  useToast,
} from "@zen-ds/react";
import { initials, people, peopleList, projectProgress, projectStep, projects, type Person, type PersonId, type Team } from "../../data";

/** Photo when the person has one, else initials on their steady theme. */
const avatarFor = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, alt: "", children: initials(person.name) };

const teams: Team[] = ["Design", "Engineering", "Delivery", "Client Services", "Operations"];
const directory = [...peopleList].sort((a, b) => a.name.localeCompare(b.name));

/** People directory: the whole row opens the person beside the list. */
export default function PeopleDirectory() {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [team, setTeam] = useState<Team | null>(null);
  const [openId, setOpenId] = useState<PersonId>("chi");
  const titleId = useId();
  const projectsId = useId();
  const q = query.trim().toLowerCase();
  const rows = directory.filter((person) => (!team || person.team === team) && (!q || `${person.name} ${person.role}`.toLowerCase().includes(q)));
  const person = people[openId];
  const onProjects = projects.filter((project) => project.members.includes(openId));
  const clear = () => { setQuery(""); setTeam(null); };
  const copyEmail = () => {
    void navigator.clipboard?.writeText(person.email).catch(() => null);
    toast({ title: "Email copied", children: person.email });
  };
  return (
    <Box>
      <Grid columns={{ mobile: 1, desktop: "minmax(0, 2fr) minmax(0, 3fr)" }} gap="lg" align="start" stackBelow={640}>
        {/* A ListBox: the toolbar and the count in its Header-Slot, the rows (or the empty state) in its Body-Slot. */}
        <ListBox as="section" aria-label="People"
          header={<>
            <Stack direction="row" gap="xs" align="center" wrap>
              <Box width="fill" minWidth={200} maxWidth={240}><Search placeholder="Search people" aria-label="Search people" value={query} onValueChange={setQuery} /></Box>
              <Chip variant="advanced" selected={team !== null} popoverLabel="Team"
                popoverItems={teams.map((option) => ({ id: option, label: option, selected: option === team }))}
                onPopoverSelect={(item) => setTeam(item.id === team ? null : (item.id as Team))} onClearSelection={() => setTeam(null)}>
                {team ?? "Team"}
              </Chip>
            </Stack>
            {rows.length ? <Text role="status" textStyle="Body/Small/Regular" tone="base">{plural(rows.length, "person", "people")}</Text> : null}
          </>}>
          {rows.length ? (
            // The people pane scrolls on its own, like a mail list. A scroller clips what hangs outside it, so the pane
            // spans the ListBox body's side padding (Card-padding-medium) and pads it back: the rows line up with the
            // header and a clickable row's fill (12px past the row sideways) stays inside the pane.
            <Box scroll="y" style={{ maxBlockSize: "28rem", boxSizing: "border-box", marginInline: "calc(-1 * var(--zen-card-padding-medium, 24px))", paddingInline: "var(--zen-card-padding-medium, 24px)" }}>
              <List aria-label="People">
                {rows.map((row) => (
                  <ListItem key={row.id} title={row.name} caption={`${row.role} · ${row.location}`} selected={row.id === openId}
                    leading={<Avatar size="md" {...avatarFor(row)} />} onClick={() => setOpenId(row.id as PersonId)} />
                ))}
              </List>
            </Box>
          ) : (
            <EmptyState size="sm" headingLevel={4} icon="icon-search-medium-line" title="No people match" secondaryAction={{ label: "Clear filters", onClick: clear }}>
              Try another name or team.
            </EmptyState>
          )}
        </ListBox>
        <Card as="section" theme="default" aria-labelledby={titleId}>
          <Stack gap="lg">
            <Stack direction="column" gap="md" align="center" justify="start">
              <Avatar size="2xl" {...avatarFor(person)} />
              <Stack gap="2xs">
                <Heading level={4} id={titleId} textStyle="Heading/Subheading" align="center">{person.name}</Heading>
                <Text textStyle="Body/Small/Regular" tone="base" align="center">{`${person.role} · ${person.team}`}</Text>
              </Stack>
            </Stack>
            <DescriptionList items={[
              { term: "Email", description: person.email },
              { term: "Office", description: person.location },
            ]} divider />
            <Stack as="section" gap="xs" aria-labelledby={projectsId}>
              <Heading level={5} id={projectsId} textStyle="Body/Small/Bold" tone="light">Projects</Heading>
              {onProjects.length ? (
                <List aria-labelledby={projectsId}>
                  {onProjects.map((project) => (
                    // Nothing else shows the project's name, so beside the Badge it wraps instead of being cut.
                    <ListItem key={project.id} title={project.name} titleLines={2} caption={project.client}
                      leading={<DockIcon icon={project.icon} theme={project.theme} background="subtle" />}
                      trailing={<BadgeStatus status={projectStep[project.status]} progress={projectProgress(project)}>{project.status}</BadgeStatus>} />
                  ))}
                </List>
              ) : (
                <EmptyState size="sm" headingLevel={6} icon="icon-folder-line" title="No projects yet">
                  {`${person.name.split(" ")[0]} isn't on a project team right now.`}
                </EmptyState>
              )}
            </Stack>
            <Button level="tertiary" startIcon="icon-mail-01-line" onClick={copyEmail}>Copy email</Button>
          </Stack>
        </Card>
      </Grid>
    </Box>
  );
}

import { useRef, useState, type KeyboardEvent } from "react";
import { BadgeStatus, Box, DescriptionList, DockIcon, EmptyState, Grid, Heading, List, ListItem, ProgressBar, Search, Stack, Text, plural, useZen } from "@zen-ds/react";
import { formatDate, formatMoney, people, projectById, projectProgress, projectStep, projects } from "../../data";

/** True when the query is empty or any field contains it (case-insensitive). */
const matches = (query: string, ...fields: string[]) => {
  const q = query.trim().toLowerCase();
  return !q || fields.some((field) => field.toLowerCase().includes(q));
};

/** ⌘J focuses the search; an empty field lists recent projects, Enter opens the first match and Escape clears. */
export default function ProjectJump() {
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState("lumen-banking");
  const [recent, setRecent] = useState(["lumen-banking", "phin-loyalty", "zen-ds"]);
  const searchRef = useRef<HTMLInputElement>(null);
  // Two panes side by side; on a phone they stack, the rule under the list instead of beside it.
  const narrow = useZen()?.breakpoint === "mobile";
  const q = query.trim();
  // An empty field shows recent projects; a query searches all of them.
  const shown = q ? projects.filter((project) => matches(q, project.name, project.client)) : recent.map(projectById);
  const open = (id: string) => {
    setOpenId(id);
    setRecent((list) => [id, ...list.filter((item) => item !== id)].slice(0, 3));
    setQuery("");
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && q && shown[0]) { event.preventDefault(); open(shown[0].id); }
    if (event.key === "Escape" && query) { event.preventDefault(); setQuery(""); }
  };
  const project = projectById(openId);
  const lead = people[project.lead];
  return (
    <Box surface="surface" radius="2xl">
      <Grid columns={narrow ? "minmax(0, 1fr)" : "minmax(0, 320px) minmax(0, 1fr)"} gap="none">
        {/* Both panes keep the surface's inset (Padding/XLarge = Card medium); a Pale rule divides them. */}
        <Stack gap="md" padding="xl" border="pale" borderSides={narrow ? "bottom" : "right"}>
          <Search ref={searchRef} shortcut="j" placeholder="Jump to a project" value={query} onValueChange={setQuery} onKeyDown={onKeyDown} />
          {/* The rows open a project; the label sits xs above them (the rows pad 12px above themselves). */}
          <Stack gap="xs">
            <Text role="status" textStyle="Body/Small/Bold" tone="base">{q ? plural(shown.length, "project") : "Recent"}</Text>
            {shown.length ? (
              <List aria-label={q ? "Matching projects" : "Recent projects"}>
                {shown.map((item) => (
                  <ListItem key={item.id} title={item.name} caption={item.client} selected={item.id === openId} onClick={() => open(item.id)}
                    leading={<DockIcon icon={item.icon} theme={item.theme} background="subtle" />} />
                ))}
              </List>
            ) : (
              <EmptyState size="sm" headingLevel={4} icon="icon-search-medium-line" title={`No projects match “${q}”`}
                secondaryAction={{ label: "Clear search", onClick: () => { setQuery(""); searchRef.current?.focus(); } }}>
                Search by project or client name.
              </EmptyState>
            )}
          </Stack>
        </Stack>
        <Stack gap="md" padding="xl">
          <Stack direction="row" gap="md" align="center">
            <DockIcon size="xl" icon={project.icon} theme={project.theme} background="subtle" />
            <Stack gap="xs">
              <Heading level={4} textStyle="Heading/Subheading">{project.name}</Heading>
              <Text textStyle="Body/Small/Regular" tone="base">{project.client}</Text>
            </Stack>
          </Stack>
          <DescriptionList items={[
            { term: "Status", description: <BadgeStatus status={projectStep[project.status]} progress={projectProgress(project)}>{project.status}</BadgeStatus> },
            { term: "Lead", description: lead.name },
            { term: "Due", description: formatDate(project.due) },
            { term: "Budget", description: project.budget ? `${formatMoney(project.spent)} of ${formatMoney(project.budget)}` : "Internal project" },
            { term: "Progress", description: <ProgressBar value={project.progress} label aria-label={`${project.name} progress`} /> },
          ]} />
        </Stack>
      </Grid>
    </Box>
  );
}

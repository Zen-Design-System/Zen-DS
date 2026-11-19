import { useState } from "react";
import {
  Accordion, BadgeCounter, BadgeStatus, Checkbox, Chip, DescriptionList, DockIcon, List, ListBox, ListItem, SidePanel, Stack, Text, VisuallyHidden, plural,
} from "@zen-ds/react";
import { formatDate, people, projectProgress, projectStep, projects, type Project } from "../../data";

/** The facets of the project filter panel, one Accordion each. */
type Facet = "status" | "client" | "lead";
const facets: Array<{ id: Facet; label: string; options: string[]; of: (project: Project) => string }> = [
  { id: "status", label: "Status", options: ["Planning", "Active", "On hold", "Completed"], of: (project) => project.status },
  { id: "client", label: "Client", options: [...new Set(projects.map((project) => project.client))], of: (project) => project.client },
  { id: "lead", label: "Project lead", options: [...new Set(projects.map((project) => people[project.lead].name))], of: (project) => people[project.lead].name },
];
type Picks = Record<Facet, string[]>;
const noPicks: Picks = { status: [], client: [], lead: [] };
const matchesPicks = (picks: Picks) => (project: Project) => facets.every((facet) => !picks[facet.id].length || picks[facet.id].includes(facet.of(project)));
const countPicks = (picks: Picks) => facets.reduce((sum, facet) => sum + picks[facet.id].length, 0);

/** Filters in a Side Panel: one Accordion per facet, and each title carries its count so closed sections still show what is on. */
export default function ProjectFilters() {
  const [open, setOpen] = useState(false);
  const [applied, setApplied] = useState(noPicks);
  const [draft, setDraft] = useState(noPicks);
  const [expanded, setExpanded] = useState<Facet[]>(["status"]);
  // The opened project stays set while its panel animates out.
  const [opened, setOpened] = useState<Project | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const rows = projects.filter(matchesPicks(applied));
  const draftCount = projects.filter(matchesPicks(draft)).length;
  const active = countPicks(applied);
  const openPanel = () => {
    setDraft(applied);
    // Sections with picks open by themselves; the first opens when nothing is picked yet.
    const picked = facets.filter((facet) => applied[facet.id].length).map((facet) => facet.id);
    setExpanded(picked.length ? picked : ["status"]);
    setOpen(true);
  };
  const toggle = (facet: Facet, option: string, on: boolean) =>
    setDraft((current) => ({ ...current, [facet]: on ? [...current[facet], option] : current[facet].filter((value) => value !== option) }));
  const apply = () => { setApplied(draft); setOpen(false); };
  return (
    <Stack gap="md">
      <Stack direction="row" gap="xs" align="center" justify="between">
        <Chip variant="advanced" leading="icon-filter-lines-line" aria-haspopup="dialog" aria-expanded={open}
          selected={active > 0} selectionMode="multiple" selectionCount={active}
          onClick={openPanel} onClearSelection={() => setApplied(noPicks)}>
          All filters
        </Chip>
        <Text role="status" textStyle="Body/Small/Regular" tone="base">{plural(rows.length, "project")}</Text>
      </Stack>
      {/* Clickable rows pad 0 at the sides: the ListBox's Body-Slot insets them and their fill (12px outside a row) stays inside it. */}
      <ListBox>
        <List aria-label="Projects">
          {rows.map((project) => (
            <ListItem key={project.id} leading={<DockIcon icon={project.icon} theme={project.theme} background="subtle" size="medium" />} title={project.name}
              caption={project.client} onClick={() => { setOpened(project); setDetailOpen(true); }}
              trailing={<BadgeStatus status={projectStep[project.status]} progress={projectProgress(project)}>{project.status}</BadgeStatus>} />
          ))}
        </List>
      </ListBox>
      {/* A row opens the project, so a name cut short on a narrow screen is always readable in full. */}
      <SidePanel type="modal" size="small" open={detailOpen} onOpenChange={setDetailOpen}
        title={opened?.name ?? ""} description={opened?.client}>
        {opened ? (
          <DescriptionList items={[
            { id: "status", term: "Status", description: <BadgeStatus status={projectStep[opened.status]} progress={projectProgress(opened)}>{opened.status}</BadgeStatus> },
            { id: "lead", term: "Project lead", description: people[opened.lead].name },
            { id: "due", term: "Due", description: formatDate(opened.due) },
            { id: "progress", term: "Progress", description: `${opened.progress}%` },
          ]} />
        ) : null}
      </SidePanel>
      <SidePanel type="modal" size="small" open={open} onOpenChange={setOpen} title="Filters"
        primaryAction={{ label: `Show ${plural(draftCount, "project")}`, onClick: apply, disabled: draftCount === 0 }}
        secondaryAction={{ label: "Clear all", onClick: () => setDraft(noPicks) }}>
        <Stack gap="none">
          {facets.map((facet) => {
            const picked = draft[facet.id].length;
            return (
              <Accordion key={facet.id} headingLevel={3}
                // The facet name with its count right after it (a Badge beside a title: Gap/2XSmall).
                title={(
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--zen-spacing-gap-2-xsmall, 4px)" }}>
                    {facet.label}
                    {picked ? <><BadgeCounter value={picked} aria-hidden="true" /><VisuallyHidden>{`, ${picked} selected`}</VisuallyHidden></> : null}
                  </span>
                )}
                expanded={expanded.includes(facet.id)}
                onExpandedChange={(next) => setExpanded((ids) => next ? [...ids, facet.id] : ids.filter((id) => id !== facet.id))}>
                <Stack gap="sm" role="group" aria-label={facet.label}>
                  {facet.options.map((option) => (
                    <Checkbox key={option} label={option} checked={draft[facet.id].includes(option)} onCheckedChange={(on) => toggle(facet.id, option, on)} />
                  ))}
                </Stack>
              </Accordion>
            );
          })}
        </Stack>
      </SidePanel>
    </Stack>
  );
}

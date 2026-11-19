import { useRef, useState } from "react";
import { BadgeStatus, Box, Card, DockIcon, Heading, Popover, Search, Stack, Text, type PopoverItemData } from "@zen-ds/react";
import { people, projectById, projectProgress, projectStep, projects } from "../../data";

/** The Popover on its own: search results anchored under a Search field, as wide as it. */
export default function JumpToProject() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  // ↓ opened the results: the Popover moves focus into them (autoFocus); a pointer or typing leaves it in the field.
  const [fromKeyboard, setFromKeyboard] = useState(false);
  const [projectId, setProjectId] = useState("phin-loyalty");
  const fieldRef = useRef<HTMLElement>(null);
  const q = query.trim().toLowerCase();
  const items: PopoverItemData[] = projects
    .filter((p) => !q || `${p.name} ${p.client}`.toLowerCase().includes(q))
    .map((p) => ({ id: p.id, label: p.name, caption: p.client, theme: "dock-icon", leading: p.icon, selected: p.id === projectId }));
  const project = projectById(projectId);
  const changeOpen = (next: boolean) => { setOpen(next); if (!next) setFromKeyboard(false); };
  const pick = (id: string) => { setProjectId(id); setQuery(""); changeOpen(false); };
  return (
    <Card theme="default" width="fill">
      <Stack gap="md">
        {/* ↓ from the field moves into the results; Escape or a click outside closes them. */}
        <Box ref={fieldRef} onKeyDown={(event) => {
          if (event.key === "Escape") { changeOpen(false); return; }
          if (event.key !== "ArrowDown") return;
          event.preventDefault();
          setOpen(true);
          setFromKeyboard(true);
        }}>
          <Search placeholder="Search projects" aria-label="Search projects" aria-expanded={open} value={query}
            onValueChange={(value) => { setQuery(value); setFromKeyboard(false); if (value) setOpen(true); }} onClick={() => setOpen(true)} />
        </Box>
        {/* width="fill": the results are as wide as the search bar above them. */}
        <Popover open={open} onOpenChange={changeOpen} anchorRef={fieldRef} width="fill" aria-label="Projects" autoFocus={fromKeyboard}
          emptyState="No projects match" items={items} onSelect={(item) => pick(item.id)} />
        {/* The project that is open: its name wraps and the status follows it, so nothing is cut on a narrow card. */}
        <Stack direction="row" align="center" gap="md">
          <DockIcon icon={project.icon} theme={project.theme} background="subtle" />
          <Stack gap="xs">
            <Stack direction="row" align="center" gap="2xs" wrap>
              <Heading level={4} textStyle="Heading/Subheading">{project.name}</Heading>
              <BadgeStatus status={projectStep[project.status]} progress={projectProgress(project)}>{project.status}</BadgeStatus>
            </Stack>
            <Text as="span" textStyle="Body/Small/Regular" tone="base">{`${project.client} · led by ${people[project.lead].name}`}</Text>
          </Stack>
        </Stack>
      </Stack>
    </Card>
  );
}

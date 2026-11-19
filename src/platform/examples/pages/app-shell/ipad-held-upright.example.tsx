import { useState, type RefObject } from "react";
import {
  AppShell, AppShellAccount, AppShellHeader, BadgeStatus, BottomNavigation, Breadcrumbs, Card, DockIcon, Grid, Heading, Menu, Sidebar, Stack, Text, Thumbnail,
  TopNavigation, useToast,
  type SidebarSection,
} from "@zen-ds/react";
import { formatDate, me, projectProgress, projectStep, projects, studio, type Project } from "../../data";

const projectBadge = (project: Project) => <BadgeStatus status={projectStep[project.status]} progress={projectProgress(project)}>{project.status}</BadgeStatus>;
const sections: SidebarSection[] = [{ items: [
  { id: "home", label: "Home", icon: "icon-home-03-line" },
  { id: "projects", label: "Projects", icon: "icon-folder-line" },
  { id: "invoices", label: "Invoices", icon: "icon-receipt-line" },
] }];

/** The studio app on an iPad held upright (Device=Tablet: the mobile shell). */
// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function StudioOnAnIpad({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const [root, setRoot] = useState("projects");
  const { toast } = useToast();
  return (
    // Upright an iPad is narrower than 1024, so the same AppShell draws its mobile parts (Top=Bar, Bottom=Tab-Bar);
    // turned sideways it draws the Sidebar and the header. The Sidebar stays one tap away as the drawer.
    <AppShell
      sidebar={(
        <Sidebar sections={sections} selectedId={root} onItemClick={(item) => setRoot(item.id)}
          logo={(
            <Stack direction="row" gap="xs" align="center">
              <Thumbnail src={studio.logo} alt="" size="2xs" />
              <Text as="span" textStyle="Body/Base/Bold">{studio.name}</Text>
            </Stack>
          )} />
      )}
      header={<AppShellHeader
        leading={<Breadcrumbs master={false} items={[{ id: "home", label: "Home" }, { id: "projects", label: "Projects" }]} onNavigate={(item, event) => { event.preventDefault(); setRoot(item.id); }} />}
        actions={<Menu align="end" trigger={<AppShellAccount name={me.name} src={me.photo} />} items={[{ id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line", onSelect: () => toast({ title: "Signed out" }) }]} />}
      />}
      topNavigation={<TopNavigation scrollRef={scrollRef} title="Projects" largeTitle="Projects" trailing={[{ icon: "icon-plus-line", label: "New project", onClick: () => toast({ title: "New project", children: "The form opens here." }) }]} />}
      bottomNavigation={<BottomNavigation aria-label={studio.name} value={root} onValueChange={setRoot} showLabels items={[
        { id: "home", label: "Home", icon: "icon-home-smile-line", selectedIcon: "icon-home-smile-solid" },
        { id: "projects", label: "Projects", icon: "icon-folder-line", selectedIcon: "icon-folder-solid" },
        { id: "invoices", label: "Invoices", icon: "icon-receipt-line", selectedIcon: "icon-receipt-solid" },
      ]} />}
    >
      {/* The grey phone screen (Surface/Alt, the shell's Canvas/Default) with the Tab-Bar: every box floats, Shadow
          cards (as C1). */}
      <Grid as="ul" minColumnWidth={280} gap="md" aria-label="Projects">
        {projects.map((project) => (
          <Card as="li" key={project.id} theme="shadow">
            <Stack gap="md">
              <Stack direction="row" gap="sm" align="center" justify="between">
                <DockIcon icon={project.icon} theme={project.theme} background="subtle" />
                {projectBadge(project)}
              </Stack>
              <Stack gap="xs">
                <Heading level={2} textStyle="Heading/Subheading">{project.name}</Heading>
                <Text textStyle="Body/Small/Regular" tone="base">{`${project.client} · due ${formatDate(project.due)}`}</Text>
              </Stack>
            </Stack>
          </Card>
        ))}
      </Grid>
    </AppShell>
  );
}

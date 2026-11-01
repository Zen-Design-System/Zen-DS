import type { MouseEvent } from "react";
import { Avatar } from "../../../components/Avatar";
import { Breadcrumbs, type BreadcrumbItemData } from "../../../components/Breadcrumbs";
import { Button } from "../../../components/Button";
import { Icon } from "../../../components/Icon";
import { Menu, type MenuEntry } from "../../../components/Menu";
import { projectBrand, type Project } from "../../../../tools/studio/project-theme.mjs";
import { openProjectHome, useHomeView } from "../project/activeProject";
import { pageProjectOf } from "../project/pageProject";
import { DRAFTS, useProject, useProjects } from "../project/projectStore";
import { useStudio } from "../store";
import "./shell.css";

/*
 * The top bar's trail (user, 2026-11-01): Home (its house icon) › the open project, its avatar beside its name, a menu
 * that switches project. Home opens the projects grid; a project in the menu opens its home. On a docs page the trail is
 * Home › Docs. The Pages panel's own project row (back, name, ⋯) is gone: it said the same.
 */

/** A project's avatar: its initial on its own Primary (the project's brand, light), or Drafts' file icon. */
export function ProjectAvatar({ project }: { project: Project | null }) {
  if (!project) return <Avatar size="2xs" shape="square" theme="neutral" background="subtle" alt=""><Icon name="icon-file-code-line" size="xs" decorative /></Avatar>;
  const initial = Array.from(project.name.trim())[0]?.toUpperCase() ?? "P";
  return <Avatar size="2xs" shape="square" theme="accent" background="solid" alt="" data-brand={projectBrand(project.id)} data-theme="light">{initial}</Avatar>;
}

/** The project the bar names: the open page's, else the one the Studio home shows (null: Drafts). */
function useBarProject(): { id: string | null; shown: boolean } {
  const localPage = useStudio((state) => state.localPage);
  const space = useStudio((state) => state.space);
  const view = useHomeView();
  const projects = useProjects();
  const known = new Set(projects.map((item) => item.id));
  if (localPage) return { id: pageProjectOf(localPage, known), shown: true };
  if (space !== "studio" || view === null) return { id: null, shown: false };
  return { id: view !== DRAFTS ? view : null, shown: true };
}

function ProjectSwitch({ id }: { id: string | null }) {
  const project = useProject(id);
  const projects = useProjects();
  const name = project?.name ?? "Drafts";
  const items: MenuEntry[] = [{
    type: "group",
    label: "Switch project",
    items: [null, ...projects].map((item) => ({ id: item?.id ?? DRAFTS, label: item?.name ?? "Drafts", icon: <ProjectAvatar project={item} />, onSelect: () => openProjectHome(item?.id ?? DRAFTS) })),
  }];
  return (
    <Menu
      aria-label="Switch project"
      items={items}
      // zen-allow-no-action: the Menu's trigger (Menu wires its click and keys).
      trigger={(
        <Button className="studio-crumbs__project" appearance="flat" level="primary" size="sm" aria-label={`Project: ${name}`} startIcon={<ProjectAvatar project={project} />} endIcon={<Icon name="icon-chevron-down-line" decorative />}>
          {name}
        </Button>
      )}
    />
  );
}

/** Home › project (or Docs). Nothing on the projects grid itself: a trail of one is no trail. */
export function ProjectCrumbs() {
  const space = useStudio((state) => state.space);
  const localPage = useStudio((state) => state.localPage);
  const { id, shown } = useBarProject();
  const docs = !localPage && space !== "studio";
  if (!docs && !shown) return null;
  const goHome = (_item: BreadcrumbItemData, event: MouseEvent) => { event.preventDefault(); openProjectHome(null); };
  return (
    <Breadcrumbs
      className="studio-crumbs"
      aria-label="Project"
      onNavigate={goHome}
      items={[
        { id: "home", label: "Home", href: "?space=studio", icon: "icon-home-03-line" },
        { id: "here", label: docs ? "Docs" : <ProjectSwitch id={id} /> },
      ]}
    />
  );
}

import { useState } from "react";
import { Badge } from "../../../components/Badge";
import { Button, IconButton } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { Dialog } from "../../../components/Dialog";
import { EmptyState } from "../../../components/EmptyState";
import { Icon } from "../../../components/Icon";
import { Menu, type MenuEntry } from "../../../components/Menu";
import { ZenProvider, type ZenBrand } from "../../../components/Provider";
import { Heading, plural, Text } from "../../../components/Text";
import { announceEditStatus } from "../api";
import { MyPagesHeader } from "../builder/MyPages";
import { NewPageDialog } from "../builder/NewPageDialog";
import { FolderDialog } from "../builder/StudioFolders";
import { usePages } from "../builder/store/pageStore";
import { pageProjectOf, usePagesOf } from "./pageProject";
import { previewValueLabel } from "../shell/modes";
import { useStudio } from "../store";
import { projectBrand, type Project } from "../../../../tools/studio/project-theme.mjs";
import { openProjectHome, useHomeView } from "./activeProject";
import { openProjectSetup } from "./ProjectSetup";
import { DRAFTS, trashProject, useProject, useProjects } from "./projectStore";
import "./project.css";

/*
 * The Studio home (toolbar Document | Studio, no page open), Figma's file browser since 2026-10-17: the projects grid
 * (Drafts, then each project with a thumbnail in its own theme, New project), or one project's (or Drafts') home with
 * New page and its settings. The Pages panel lists the open project's folders and pages (PagesPanel).
 */

const say = (kind: "saved" | "error", message: string) => announceEditStatus({ kind, message, at: Date.now() });

export function StudioHome() {
  const view = useHomeView();
  const project = useProject(view && view !== DRAFTS ? view : null);
  if (view === null || (view !== DRAFTS && !project)) return <ProjectsGrid />;
  return <ProjectHome project={project} />;
}

function ProjectsGrid() {
  const admin = useStudio((state) => state.role === "admin");
  const projects = useProjects();
  const pages = usePages();
  const known = new Set(projects.map((item) => item.id));
  const count = (id: string | null) => pages.filter((page) => pageProjectOf(page.id, known) === id).length;
  return (
    <div className="studio-projects">
      <header className="studio-projects__head">
        <Heading level={2} textStyle="Heading/4">Projects</Heading>
        {admin ? <Button level="primary" size="sm" startIcon="icon-plus-line" onClick={() => openProjectSetup({ kind: "create" })}>New project</Button> : null}
      </header>
      <ul className="studio-projects__grid" aria-label="Projects">
        <li><ProjectCard project={null} pages={count(null)} /></li>
        {projects.map((project) => <li key={project.id}><ProjectCard project={project} pages={count(project.id)} /></li>)}
        {admin ? (
          <li>
            <button type="button" className="studio-projects__new" onClick={() => openProjectSetup({ kind: "create" })}>
              <Icon name="icon-plus-line" size="md" decorative />
              <Text as="span" textStyle="Body/Small/Medium">New project</Text>
            </button>
          </li>
        ) : null}
      </ul>
    </div>
  );
}

/** A project's card: its theme as a thumbnail, its name and pages; the name opens it, ⋯ holds Settings and Delete. */
function ProjectCard({ project, pages }: { project: Project | null; pages: number }) {
  const admin = useStudio((state) => state.role === "admin");
  const chromeTheme = useStudio((state) => state.chromeTheme);
  const [deleting, setDeleting] = useState(false);
  const name = project?.name ?? "Drafts";
  const meta = project ? `${plural(pages, "page")} · ${previewValueLabel("componentTheme", project.theme.modes.componentTheme)} · ${previewValueLabel("radius", project.theme.modes.radius)}` : `${plural(pages, "page")} · Zen theme`;
  const items: MenuEntry[] = project ? [
    { id: "open", label: "Open", icon: "icon-folder-line", onSelect: () => openProjectHome(project.id) },
    { id: "settings", label: "Project settings…", icon: "icon-settings-01-line", disabled: !admin, onSelect: () => openProjectSetup({ kind: "edit", id: project.id }) },
    { type: "separator" },
    { id: "delete", label: "Delete project…", icon: "icon-trash-line", danger: true, disabled: !admin, onSelect: () => setDeleting(true) },
  ] : [];
  const modes = project?.theme.modes;
  return (
    <Card theme="border" spacing="sm" className="studio-projects__card">
      {/* zen-allow-mode-override: the thumbnail keeps the Studio chrome's own mode (chromeTheme); it re-declares it so the
          project's brand colours resolve in that scope, without switching Light/Dark. */}
      <ZenProvider className="studio-projects__thumb" brand={(project ? projectBrand(project.id) : "zen") as ZenBrand} theme={chromeTheme}
        componentTheme={modes?.componentTheme ?? "neutral-s1"} radius={modes?.radius ?? "rounded"} density="compact" typography="dashboard" contrast="standard" breakpoint="desktop" portal={false} syncDocument={false} inert aria-hidden="true">
        <ol className="studio-projects__swatches">
          {Array.from({ length: 12 }, (_, index) => <li key={index} style={{ background: `var(--zen-${chromeTheme}-brand-${index + 1})` }} />)}
        </ol>
        <span className="studio-projects__sample">
          {/* zen-allow-action-handler: the thumbnail is inert, a picture of the project's button (the card opens the project). */}
          <Button level="primary" size="sm">Get started</Button>
          <Badge theme="accent" size="sm">New</Badge>
        </span>
      </ZenProvider>
      <div className="studio-projects__text">
        <button type="button" className="studio-projects__open" onClick={() => openProjectHome(project?.id ?? DRAFTS)}>
          <Text as="span" textStyle="Body/Small/Bold" truncate>{name}</Text>
        </button>
        <Text as="span" textStyle="Caption/Regular" tone="base" truncate>{meta}</Text>
      </div>
      {project ? (
        <span className="studio-projects__menu">
          <Menu align="end" aria-label={`${name} options`} items={items} trigger={<IconButton icon="icon-dots-horizontal-line" aria-label={`${name} options`} appearance="flat" level="secondary" size="xs" />} />
        </span>
      ) : null}
      {deleting && project ? <DeleteProjectDialog project={project} pages={pages} onClose={() => setDeleting(false)} /> : null}
    </Card>
  );
}

export function DeleteProjectDialog({ project, pages, onClose }: { project: Project; pages: number; onClose: () => void }) {
  return (
    <Dialog
      open
      onOpenChange={(next) => { if (!next) onClose(); }}
      theme="negative"
      title={`Delete “${project.name}”?`}
      description={pages ? `Its ${plural(pages, "page")} move to Drafts and take the Zen theme. The project's folder goes to the trash.` : "The project has no pages. Its folder goes to the trash."}
      primaryAction={{ label: "Delete project", level: "danger", onClick: () => { void trashProject(project.id).then(() => { say("saved", `Deleted “${project.name}”`); openProjectHome(null); }, (error) => say("error", error instanceof Error ? error.message : String(error))); onClose(); } }}
      secondaryAction={{ label: "Cancel" }}
    />
  );
}

/** One project's home (or Drafts'): New page, New folder, and its theme. */
function ProjectHome({ project }: { project: Project | null }) {
  const admin = useStudio((state) => state.role === "admin");
  const pages = usePagesOf(project?.id ?? null);
  const [dialog, setDialog] = useState<null | "page" | "folder">(null);
  const name = project?.name ?? "Drafts";
  return (
    <div className="studio-home">
      <EmptyState
        icon={project ? "icon-folder-line" : "icon-file-code-line"}
        headingLevel={2}
        title={pages.length ? `Pick a page of ${name}` : project ? `Make the first page of ${name}` : "Make your first page"}
        primaryAction={admin ? { label: "New page", onClick: () => setDialog("page") } : undefined}
        secondaryAction={admin ? (project ? { label: "Project settings", onClick: () => openProjectSetup({ kind: "edit", id: project.id }) } : { label: "New folder", onClick: () => setDialog("folder") }) : undefined}
      >
        {project ? `Pages here draw in ${name}'s theme.` : "Drafts use the Zen theme. Put pages in a project to give them its theme."}
      </EmptyState>
      <NewPageDialog open={dialog === "page"} onOpenChange={(open) => setDialog(open ? "page" : null)} />
      {dialog === "folder" ? <FolderDialog onClose={() => setDialog(null)} /> : null}
    </div>
  );
}

/** The Pages panel's head in the Studio space: back to all projects, the open project's name and its menu. */
export function ProjectBar() {
  const admin = useStudio((state) => state.role === "admin");
  const localPage = useStudio((state) => state.localPage);
  const view = useHomeView();
  const projects = useProjects();
  const known = new Set(projects.map((item) => item.id));
  const id = localPage ? pageProjectOf(localPage, known) : view && view !== DRAFTS ? view : null;
  const project = useProject(id);
  const pages = usePagesOf(project?.id ?? null);
  const [deleting, setDeleting] = useState(false);
  if (!localPage && view === null) return null;
  const items: MenuEntry[] = project ? [
    { id: "settings", label: "Project settings…", icon: "icon-settings-01-line", disabled: !admin, onSelect: () => openProjectSetup({ kind: "edit", id: project.id }) },
    { type: "separator" },
    { id: "delete", label: "Delete project…", icon: "icon-trash-line", danger: true, disabled: !admin, onSelect: () => setDeleting(true) },
  ] : [];
  return (
    <div className="studio-project-bar">
      <IconButton icon="icon-arrow-left-line" aria-label="All projects" appearance="flat" level="secondary" size="xs" onClick={() => openProjectHome(null)} />
      <button type="button" className="studio-project-bar__name" onClick={() => openProjectHome(project?.id ?? DRAFTS)}>
        {project ? <span className="studio-project-bar__dot" data-brand={projectBrand(project.id)} data-theme="light" aria-hidden="true" /> : null}
        <Text as="span" textStyle="Body/Small/Bold" truncate>{project?.name ?? "Drafts"}</Text>
      </button>
      {project ? <Menu align="end" aria-label="Project options" items={items} trigger={<IconButton icon="icon-dots-horizontal-line" aria-label="Project options" appearance="flat" level="secondary" size="xs" />} /> : null}
      {deleting && project ? <DeleteProjectDialog project={project} pages={pages.length} onClose={() => setDeleting(false)} /> : null}
    </div>
  );
}

/** The Pages panel on the projects grid: Drafts and every project, each opening its home; New project, and New page
 *  (a draft), as Figma's file browser creates from anywhere. */
export function ProjectsList({ onNewPage }: { onNewPage: () => void }) {
  const projects = useProjects();
  return (
    <div className="studio-pages__section" data-section="projects">
      {/* The pages' own header (where they are kept, Import, Trash, the folder options), headed Projects. */}
      <MyPagesHeader kicker="Projects" onNew={onNewPage} onNewProject={() => openProjectSetup({ kind: "create" })} />
      <ul className="studio-pages__list" aria-labelledby="studio-pages-mine">
        {[null, ...projects].map((project, index) => (
          <li key={project?.id ?? DRAFTS} className="studio-pages__item">
            <button type="button" className="studio-pages__row" tabIndex={index === 0 ? 0 : -1} onClick={() => openProjectHome(project?.id ?? DRAFTS)}>
              {project ? <span className="studio-project-bar__dot" data-brand={projectBrand(project.id)} data-theme="light" aria-hidden="true" /> : <Icon name="icon-file-code-line" size="sm" decorative />}
              <Text as="span" textStyle="Body/Small/Medium" className="studio-pages__name" truncate>{project?.name ?? "Drafts"}</Text>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

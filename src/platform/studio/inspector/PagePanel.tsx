import { LocalStyles } from "./LocalStyles";
import { useEffect, useState } from "react";
import { CanvasBackgroundField } from "../canvas/CanvasBackground";
import { Button, IconButton } from "../../../components/Button";
import { Icon } from "../../../components/Icon";
import { Heading } from "../../../components/Text";
import { typographyStyles } from "../../../tokens/typography.generated";
import { pageLabels } from "../../PlatformApp";
import type { PlatformPage } from "../../PlatformExamples";
import { previewModeDefinitions, previewValueLabel } from "../shell/modes";
import { useStudio } from "../store";
import { focusFrame, frameIcon, useFrames } from "./frames";
import { InspectorFields, InspectorItem, InspectorSection } from "./Section";

import { openExport } from "../builder/export/exportState";
import { openVariables } from "../variables/variablesState";
import { pagesPersist, renamePage, setPageOs, setPageProject, usePage, useStorage } from "../builder/store/pageStore";
import { headerOs } from "../builder/store/pageModel";
import { Segmented } from "../../../components/Segmented";
import { InputField, SelectField } from "../../../components/Input";
import { useCanvasPreview } from "../project/activeProject";
import { openProjectSetup } from "../project/ProjectSetup";
import { pageProjectOf } from "../project/pageProject";
import { useProjects } from "../project/projectStore";
/*
 * Inspector with nothing selected (spec §6): the page, a one-line summary of the canvas preview modes (the toolbar
 * Modes popover is the one place to change them) and the frames on the board.
 */

/** The page's name: typed, it renames the page on Enter or when the field is left (Escape puts it back); empty keeps it. */
function PageName({ id, title }: { id: string; title: string }) {
  const admin = useStudio((state) => state.role === "admin");
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    const next = draft.trim();
    setDraft(null);
    if (next && next !== title) void renamePage(id, next);
  };
  return (
    <InputField
      size="sm"
      aria-label="Page name"
      value={draft ?? title}
      disabled={!admin}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter" && !event.nativeEvent.isComposing) { event.preventDefault(); commit(); }
        else if (event.key === "Escape" && draft !== null) { event.preventDefault(); event.stopPropagation(); setDraft(null); }
      }}
    />
  );
}

/** The page's mobile OS: iOS or Android status bar and bottom bar on its phone and tablet Screens. */
function PageOs({ id, text }: { id: string; text: string }) {
  const admin = useStudio((state) => state.role === "admin");
  return (
    <Segmented
      aria-label="Mobile OS"
      size="sm"
      fullWidth
      disabled={!admin}
      value={headerOs(text)}
      onValueChange={(value) => { void setPageOs(id, value === "android" ? "android" : "ios"); }}
      options={[{ id: "ios", label: "iOS" }, { id: "android", label: "Android" }]}
    />
  );
}

/** The page's Studio project (Drafts: the Zen theme): moving it there gives it that project's theme. */
function PageProject({ id }: { id: string }) {
  const admin = useStudio((state) => state.role === "admin");
  const projects = useProjects();
  const current = pageProjectOf(id, new Set(projects.map((project) => project.id)));
  return (
    <SelectField
      aria-label="Project"
      size="sm"
      disabled={!admin}
      value={current ?? ""}
      onValueChange={(value) => { void setPageProject(id, value || null); }}
      options={[{ value: "", label: "Drafts", meta: "Zen" }, ...projects.map((project) => ({ value: project.id, label: project.name }))]}
    />
  );
}

/** Design tab with nothing selected. */
export function PagePanel() {
  const page = useStudio((state) => state.page);
  const localPage = useStudio((state) => state.localPage);
  const builderPage = usePage(localPage);
  // The modes the canvas draws in: the Studio's, with the page's project's over them.
  const { preview } = useCanvasPreview();
  const projects = useProjects();
  const project = localPage ? projects.find((item) => item.id === pageProjectOf(localPage, new Set(projects.map((entry) => entry.id)))) ?? null : null;
  const frames = useFrames(page);
  // A builder page (Studio builder GĐ2) names itself and says where it is kept; a docs page's description is on the
  // board (its title block), not here too (user, 2026-10-07).
  const storage = useStorage();
  const kept = storage.kind === "mirror" ? `saved in this browser and in ${storage.mirror === "dev" ? storage.label : `the folder “${storage.label}”`} as you edit.` : "saved in this browser as you edit.";
  const description = localPage ? (pagesPersist() ? `A page you made, ${kept}` : "A page you made. This browser cannot keep it: export it before closing.") : null;
  const summary = previewModeDefinitions.map((mode) => previewValueLabel(mode.key, preview[mode.key])).join(" · ");

  return (
    <div className="studio-inspector__panel">
      <header className="studio-inspector__head-block">
        <p className={`studio-inspector__eyebrow ${typographyStyles["Body/Small/Medium"]}`}>Page</p>
        <Heading level={2} textStyle="Body/Small/Bold">{localPage ? builderPage?.title ?? localPage : pageLabels[page] ?? page}</Heading>
        {description ? <p className={`studio-inspector__description ${typographyStyles["Body/Small/Regular"]}`}>{description}</p> : null}
        {/* GĐ5: the page as React code or its design file. */}
        {localPage ? (
          <div className="studio-inspector__actions">
            <Button level="tertiary" size="sm" startIcon="icon-code-02-line" onClick={() => openExport(localPage)}>Export…</Button>
          </div>
        ) : null}
      </header>
      {/* A page you made is named here as you work (user, 2026-10-09: no title to give when it is made). */}
      {localPage && builderPage ? (
        <InspectorSection title="Page" fieldGrid>
          <InspectorFields name="title" labels={["Name"]} fields={[<PageName key="name" id={localPage} title={builderPage.title} />]} />
          {/* One OS for the page (user, 2026-10-10): its phone and tablet Screens draw that OS's status and bottom bars. */}
          <InspectorFields name="os" labels={["Mobile OS"]} fields={[<PageOs key="os" id={localPage} text={builderPage.text} />]} />
          {/* Figma's page Background: the canvas behind the frames, Zen background tokens (canvas/CanvasBackground.tsx, F10). */}
          <InspectorFields name="canvas-background" labels={["Background"]} fields={[<CanvasBackgroundField key="background" id={localPage} text={builderPage.text} />]} />
          {/* Studio projects (2026-10-17): the page draws in its project's theme; Drafts keep Zen's. */}
          <InspectorFields name="project" labels={["Project"]} fields={[<PageProject key="project" id={localPage} />]}
            icon={project ? <IconButton icon="icon-palette-line" aria-label={`${project.name} theme`} tooltip="Project theme" appearance="flat" level="secondary" size="xs" onClick={() => openProjectSetup({ kind: "edit", id: project.id })} /> : null} />
        </InspectorSection>
      ) : null}
      {/* Figma's right panel with nothing selected: Local variables opens the Variables window (the Zen tokens). */}
      <InspectorSection title="Variables">
        <div className="studio-inspector__actions">
          <Button level="tertiary" size="sm" startIcon="icon-hexagon-01-line" onClick={openVariables}>Local variables</Button>
        </div>
      </InspectorSection>
      {/* Figma's Local styles: the text, color and effect styles, read-only (styles are tokens edited in Figma). */}
      <LocalStyles />
      {/* Preview modes change in Play and Present only (their bar's Modes panel): the canvas shows them here. */}
      <InspectorSection title="Preview modes">
        <p className={`studio-inspector__summary ${typographyStyles["Body/Small/Regular"]}`}>{summary}</p>
      </InspectorSection>
      <InspectorSection title="Frames">
        {frames.length ? (
          <ul aria-label="Frames" className="studio-inspector__items">
            {frames.map((frame) => (
              <InspectorItem
                key={frame.id}
                icon={<Icon name={frameIcon(frame.id)} size={16} />}
                name={frame.label}
                meta={`${frame.width}px`}
                onClick={() => focusFrame(frame)}
              />
            ))}
          </ul>
        ) : <p className={`studio-inspector__empty ${typographyStyles["Body/Small/Regular"]}`}>The page is still loading.</p>}
      </InspectorSection>
    </div>
  );
}

import { useMemo } from "react";
import { ModalForm } from "../../../components/Dialog";
import { Toggle } from "../../../components/Toggle";
import type { ProjectLibraries } from "../../../../tools/studio/project-theme.mjs";
import { announceEditStatus } from "../api";
import { searchIconGlyphs } from "../builder/library/icons";
import { PALETTE } from "../slots/palette";
import { canEdit, useStudio } from "../store";
import { useActiveProject } from "./activeProject";
import { setLibrariesOpen, useLibraries, useLibrariesOpen } from "./libraries";
import { updateProject } from "./projectStore";

/*
 * Figma's Libraries (⌥⌘O, Assets' book button, ⌘K › Libraries; spec docs/research/studio-libraries-spec-2026-10-22.md)
 * for the open project, Studio's Figma file: a switch per library its pages use. Zen off takes Zen's components and
 * icons out of Assets and Quick insert (what the pages hold stays); the project's theme off draws its pages in Zen's
 * shipped theme. Saved in project.json at once; Drafts use Zen only. An Admin changes them.
 */

export function LibrariesDialog() {
  const open = useLibrariesOpen();
  const project = useActiveProject();
  const libraries = useLibraries();
  const editable = useStudio((state) => canEdit(state));
  const counts = useMemo(() => ({ components: PALETTE.length, icons: searchIconGlyphs("").length }), []);
  const set = (key: keyof ProjectLibraries, on: boolean) => {
    if (!project) return;
    void updateProject(project.id, { libraries: { ...project.libraries, [key]: on } }).catch((error: unknown) => {
      announceEditStatus({ kind: "error", message: `Libraries not saved: ${error instanceof Error ? error.message : String(error)}`, at: Date.now() });
    });
  };
  const off = !project || !editable;
  return (
    <ModalForm
      open={open}
      onOpenChange={setLibrariesOpen}
      title="Libraries"
      description={project ? `What the pages of ${project.name} use. A library turned off leaves Assets; what the pages hold stays.` : "Drafts use Zen. Move a page into a project to choose its libraries."}
      primaryAction={{ label: "Done" }}
      className="studio-libraries"
    >
      <Toggle
        label="Zen Design System"
        caption={`${counts.components} components · ${counts.icons} icons`}
        checked={project ? libraries.zen : true}
        disabled={off}
        onCheckedChange={(on) => set("zen", on)}
      />
      {project ? (
        <Toggle
          label={`${project.name} theme`}
          caption="Its colors, type and sizes on every page of the project"
          checked={libraries.theme}
          disabled={off}
          onCheckedChange={(on) => set("theme", on)}
        />
      ) : null}
    </ModalForm>
  );
}

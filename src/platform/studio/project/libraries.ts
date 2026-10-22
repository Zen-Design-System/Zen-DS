import { useSyncExternalStore } from "react";
import { defaultLibraries, type ProjectLibraries } from "../../../../tools/studio/project-theme.mjs";
import { activeProjectId, useActiveProject } from "./activeProject";
import { projectById } from "./projectStore";

/*
 * The libraries the open page uses (Figma's Libraries, ⌥⌘O; spec docs/research/studio-libraries-spec-2026-10-22.md):
 * its project's switches (project.json `libraries`), all on for Drafts. Assets, Quick insert and the canvas read them;
 * LibrariesDialog.tsx changes them.
 */

/** The open project's libraries (Drafts: every one on). */
export function librariesNow(): ProjectLibraries {
  return projectById(activeProjectId())?.libraries ?? defaultLibraries();
}

/** The same, re-rendering when the project or its switches change. */
export function useLibraries(): ProjectLibraries {
  return useActiveProject()?.libraries ?? DEFAULTS;
}
const DEFAULTS = defaultLibraries();

/* The dialog's open state: Assets' book button, ⌥⌘O and ⌘K › Libraries open the same dialog. */
let open = false;
const listeners = new Set<() => void>();
export function setLibrariesOpen(next: boolean) {
  if (next === open) return;
  open = next;
  listeners.forEach((listener) => listener());
}
export const openLibraries = () => setLibrariesOpen(true);
export const useLibrariesOpen = () => useSyncExternalStore((listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; }, () => open, () => false);

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { cachedPage, usePageProject } from "../builder/store/pageStore";
import { headerProject } from "../builder/store/pageModel";
import { studioStore, useStudio } from "../store";
import type { StudioPreviewSettings } from "../types";
import { projectBrand, projectModes, type Project } from "../../../../tools/studio/project-theme.mjs";
import { DRAFTS, projectById, useProject } from "./projectStore";

/*
 * Which Studio project is open (2026-10-17): on a page, the project its header names (none: Drafts); on the Studio home,
 * the one picked there (?space=studio&project=<id>; "drafts" for Drafts, nothing for the projects grid). The canvas then
 * draws in that project's modes: its Base Colors mode (data-brand="p-<id>") and its component theme, size, radius,
 * typography and emphasis, over the Studio's own preview modes (Light / Dark stays the canvas switch).
 */

type HomeView = null | typeof DRAFTS | string;
let home: HomeView = readHome();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

function readHome(): HomeView {
  if (typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get("project");
  return value && /^[a-z0-9][a-z0-9-]{0,47}$/.test(value) ? value : null;
}

/** The address follows the home view: ?project=<id> on the Studio home only (StudioApp keeps the rest). */
function writeHome(push: boolean) {
  const url = new URL(window.location.href);
  if (home) url.searchParams.set("project", home);
  else url.searchParams.delete("project");
  const next = `${url.pathname}?${url.searchParams.toString()}${url.hash}`;
  if (next === `${window.location.pathname}${window.location.search}${window.location.hash}`) return;
  if (push) window.history.pushState(null, "", next);
  else window.history.replaceState(null, "", next);
}

if (typeof window !== "undefined") window.addEventListener("popstate", () => { const next = readHome(); if (next !== home) { home = next; notify(); } });

/** Opens the Studio home on a project (its pages), on Drafts, or on the projects grid (null). One history entry: when
 *  the space or page changes, StudioApp's routing pushes it (copying ?project= from the address set here first). */
export function openProjectHome(view: HomeView) {
  const state = studioStore.getState();
  const routes = Boolean(state.localPage) || state.space !== "studio";
  if (home === view && !routes) return;
  home = view;
  notify();
  writeHome(!routes);
  if (routes) studioStore.setState({ space: "studio", localPage: null, selection: null, presenting: null });
}

/** Keeps the home's project in step with the open page (Back from a page lands on its project's home). */
export function useRememberPageProject() {
  const localPage = useStudio((state) => state.localPage);
  const project = usePageProject(localPage);
  useEffect(() => {
    if (!localPage || project === undefined) return;
    const view = project ?? DRAFTS;
    if (home === view) return;
    home = view;
    notify();
    writeHome(false);
  }, [localPage, project]);
}

const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const useHomeView = (): HomeView => useSyncExternalStore(subscribe, () => home, () => home);

/** The open project's id (null: Drafts or the projects grid). */
export function activeProjectId(): string | null {
  const state = studioStore.getState();
  if (state.localPage) return headerProject(cachedPage(state.localPage)?.text ?? "");
  if (state.space !== "studio") return null;
  return home && home !== DRAFTS ? home : null;
}

/** The same, re-rendering when the page, its header or the home view changes. */
export function useActiveProjectId(): string | null {
  const localPage = useStudio((state) => state.localPage);
  const space = useStudio((state) => state.space);
  const pageProject = usePageProject(localPage);
  const view = useHomeView();
  if (localPage) return pageProject ?? null;
  if (space !== "studio") return null;
  return view && view !== DRAFTS ? view : null;
}

export const useActiveProject = (): Project | null => useProject(useActiveProjectId());

/** The canvas's preview modes and brand with a project's modes over them. */
export function withProject(preview: StudioPreviewSettings, project: Project | null): { preview: StudioPreviewSettings; brand: string } {
  return project ? { preview: { ...preview, ...projectModes(project.theme) }, brand: projectBrand(project.id) } : { preview, brand: "zen" };
}

/** The canvas's modes for the open project (the world, its overlay layer, Present, Play, the insert previews). */
export function useCanvasPreview(): { preview: StudioPreviewSettings; brand: string } {
  const preview = useStudio((state) => state.preview);
  const project = useActiveProject();
  return useMemo(() => withProject(preview, project), [preview, project]);
}

/** The modes a page's frames render in, outside React (the export): its project's over the Studio's. */
export function previewForPage(pageId: string, preview: StudioPreviewSettings): { preview: StudioPreviewSettings; brand: string } {
  return withProject(preview, projectById(headerProject(cachedPage(pageId)?.text ?? "")));
}

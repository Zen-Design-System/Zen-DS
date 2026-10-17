import { useEffect, useSyncExternalStore } from "react";
import { authorized } from "../api";
import { run, SETTINGS } from "../builder/store/pageStore";
import { normalizeProject, projectIdFor, projectThemeCss, type Project, type ProjectTheme } from "../../../../tools/studio/project-theme.mjs";

/*
 * Studio projects (user, 2026-10-17: "tạo dự án như Figma … set theme cho Dự án … sau vẫn vào setting của Project điều
 * chỉnh lại được"). A project is a name and a theme (tools/studio/project-theme.mjs); its pages name it in their header
 * (`project`), pages without one are Drafts in the shipped Zen theme. The browser keeps a working copy in IndexedDB
 * (settings key "projects"); on the dev server `.zen-studio/projects/<id>/` is the source of truth (GET /projects,
 * POST /projects/write | /projects/trash). Each project's theme is one extra Base Colors (Project) mode,
 * `[data-brand="p-<id>"]`, injected here as a <style>: tokens.css never changes.
 */

const KEY = "projects";
const DEV = import.meta.env.DEV;
/** "drafts" names the Drafts list on the Studio home (?project=drafts), so no project takes that id. */
export const DRAFTS = "drafts";

let projects: Project[] = [];
/** Projects saved while no dev server answered (a build, the server down): only these go up to the folder on the next
 *  read. A project the folder lacks but that it had confirmed was trashed elsewhere, and stays gone. */
let pending = new Set<string>();
let loaded = false;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();
let version = 0;
const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel("zen-studio-projects");
channel?.addEventListener("message", () => { loaded = false; void load(); });

const byName = (list: Project[]) => [...list].sort((a, b) => a.name.localeCompare(b.name));
const notify = () => { version += 1; syncStyles(); listeners.forEach((listener) => listener()); };

/* ── the modes as CSS ─────────────────────────────────────────────────────────────────────────────────────────── */

const cssCache = new Map<string, { at: number; css: string }>();
/** One <style> with every project's mode, kept in step with the store (the theme editor's draft has its own). */
function syncStyles() {
  if (typeof document === "undefined") return;
  let style = document.getElementById("zen-studio-projects") as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = "zen-studio-projects";
    document.head.append(style);
  }
  const css = projects.map((project) => {
    const cached = cssCache.get(project.id);
    if (cached && cached.at === project.updatedAt) return cached.css;
    const next = projectThemeCss(project.id, project.theme, { name: project.name });
    cssCache.set(project.id, { at: project.updatedAt, css: next });
    return next;
  }).join("\n");
  if (style.textContent !== css) style.textContent = css;
}

/** The theme editor's draft brand: not a project id (those start "p-"), so it never collides with a saved mode. */
export const DRAFT_BRAND = "studio-draft";

/** The theme editor's live preview: its draft as a mode of its own (`[data-brand="studio-draft"]`); null removes it. */
export function setDraftStyles(theme: ProjectTheme | null) {
  if (typeof document === "undefined") return;
  let style = document.getElementById("zen-studio-project-draft") as HTMLStyleElement | null;
  if (!theme) { style?.remove(); return; }
  if (!style) {
    style = document.createElement("style");
    style.id = "zen-studio-project-draft";
    document.head.append(style);
  }
  style.textContent = projectThemeCss("draft", theme, { name: "Theme draft", brand: DRAFT_BRAND });
}

/* ── storage ──────────────────────────────────────────────────────────────────────────────────────────────────── */

type Row = { key: string; value: unknown[]; pending?: unknown[] } | undefined;
const readLocal = () => run<Row>(SETTINGS, "readonly", (store) => store.get(KEY) as IDBRequest<Row>).then((row) => ({
  list: Array.isArray(row?.value) ? row.value : [],
  pending: new Set((Array.isArray(row?.pending) ? row.pending : []).filter((id): id is string => typeof id === "string")),
}));
const writeLocal = (list: Project[]) => run(SETTINGS, "readwrite", (store) => store.put({ key: KEY, value: list, pending: [...pending] }));
const valid = (list: unknown[]) => list.flatMap((item) => { const { project } = normalizeProject(item); return project && project.id !== DRAFTS ? [project] : []; });

async function serverList(): Promise<Project[] | null> {
  if (!DEV) return null;
  const reply = await authorized<{ ok?: unknown; projects?: Array<{ project?: unknown }> }>("/projects");
  if (!reply || reply.status !== 200 || !Array.isArray(reply.body?.projects)) return null;
  return valid(reply.body.projects.map((row) => row?.project));
}

/** Writes to the dev server's folder: true when it took it, false when no server answered (a build, no token: the
 *  browser's copy is the project until one does); throws when the server refused it. */
async function serverWrite(action: "write" | "trash", body: unknown): Promise<boolean> {
  if (!DEV) return false;
  const reply = await authorized<{ ok?: unknown; error?: unknown }>(`/projects/${action}`, body);
  if (!reply) return false;
  if (reply.status !== 200 || reply.body?.ok === false) throw new Error(typeof reply.body?.error === "string" ? reply.body.error : `Project ${action} refused`);
  return true;
}
const markSynced = (id: string, synced: boolean) => { if (synced) pending.delete(id); else pending.add(id); };

/** Reads the browser's copy, then the dev server's folder: the folder wins. A project only this browser has goes up to it
 *  when it was saved without a server (pending); one the folder had confirmed was trashed elsewhere and is dropped. */
function load(): Promise<void> {
  if (loaded) return Promise.resolve();
  loading ??= (async () => {
    const stored = await readLocal().catch(() => ({ list: [] as unknown[], pending: new Set<string>() }));
    const local = valid(stored.list);
    pending = stored.pending;
    projects = byName(local);
    notify();
    const remote = await serverList().catch(() => null);
    if (remote) {
      const known = new Set(remote.map((project) => project.id));
      const onlyHere = local.filter((project) => !known.has(project.id) && pending.has(project.id));
      for (const project of onlyHere) markSynced(project.id, await serverWrite("write", { project }).catch(() => false));
      for (const id of [...pending]) if (known.has(id)) pending.delete(id);
      projects = byName([...remote, ...onlyHere]);
      await writeLocal(projects).catch(() => undefined);
    }
    loaded = true;
    notify();
  })().finally(() => { loading = null; });
  return loading;
}

/** Starts reading the projects (StudioApp, once): the canvas needs their modes before a project's page draws. */
export const startProjects = () => void load();

async function commit(next: Project[]) {
  projects = byName(next);
  notify();
  await writeLocal(projects);
  channel?.postMessage("changed");
}

/** Creates a project from a name and a theme; returns it (its id is free and never "drafts"). */
export async function createProject(name: string, theme: ProjectTheme): Promise<Project> {
  await load();
  const now = Date.now();
  const id = projectIdFor(name, new Set([DRAFTS, ...projects.map((project) => project.id)]));
  const { project, errors } = normalizeProject({ id, name, theme, createdAt: now, updatedAt: now });
  if (!project) throw new Error(errors[0] ?? "Not a project");
  markSynced(project.id, await serverWrite("write", { project }));
  await commit([...projects, project]);
  return project;
}

/** Saves a project's new name or theme (Project settings). */
export async function updateProject(id: string, change: { name?: string; theme?: ProjectTheme }): Promise<Project> {
  await load();
  const current = projects.find((project) => project.id === id);
  if (!current) throw new Error("The project is gone");
  const { project, errors } = normalizeProject({ ...current, ...change, updatedAt: Date.now() });
  if (!project) throw new Error(errors[0] ?? "Not a project");
  markSynced(id, await serverWrite("write", { project }));
  await commit(projects.map((item) => (item.id === id ? project : item)));
  return project;
}

/** Moves a project's folder to the trash (.zen-studio/trash/projects/); its pages stay and show under Drafts. */
export async function trashProject(id: string): Promise<void> {
  await load();
  await serverWrite("trash", { id });
  pending.delete(id);
  await commit(projects.filter((project) => project.id !== id));
}

/* ── hooks ────────────────────────────────────────────────────────────────────────────────────────────────────── */

const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const useVersion = () => useSyncExternalStore(subscribe, () => version, () => version);

/** Every project, by name. */
export function useProjects(): Project[] {
  useVersion();
  useEffect(() => { if (!loaded) void load(); }, []);
  return projects;
}

/** Whether the first read (browser + dev server) is done. */
export function useProjectsLoaded(): boolean {
  useVersion();
  return loaded;
}

/** A project by id, or null (a draft, a project not read yet or gone). */
export function useProject(id: string | null): Project | null {
  useVersion();
  return id ? projects.find((project) => project.id === id) ?? null : null;
}

/** The same outside React (canvasModes, the export). */
export const projectById = (id: string | null): Project | null => (id ? projects.find((project) => project.id === id) ?? null : null);

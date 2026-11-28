import { useEffect, useSyncExternalStore } from "react";
import { emptyComments, mergeComments, type PageComments } from "../../../../tools/studio/page-comments.mjs";
import { defaultProjectTheme } from "../../../../tools/studio/project-theme.mjs";
import { pb } from "../../auth/pocketbase";
import { announceEditStatus } from "../api";
import { assetBlob, assetIdsOf, missingAssets, putAsset, uploadOf } from "../builder/assets/uploads";
import { headerProject, headerTitle, textHash, withHeaderProject } from "../builder/store/pageModel";
import { allPageRecords, putPage, run, SETTINGS, subscribePages, trashPage, type PageRecord } from "../builder/store/pageStore";
import { changeComments, loadComments } from "../comments/commentStore";
import { adoptProject, projectById } from "../project/projectStore";
import { studioStore } from "../store";
import { agreedOn, canWritePages, cloudHeaderProject, cloudPageIdOf, localPageOf, localProjectOf, planCloudSync, type CloudRow, type Known } from "./cloudModel";
import { useCollab, type SharedProject } from "./collabStore";

/*
 * Zen Studio collaboration, GĐ 2: the cloud copy of every shared project this person is in (docs/research/
 * studio-collaboration-plan-2026-11-07.md). Its pages, photos, comments and theme live in PocketBase
 * (tools/studio/pocketbase, studio_pages · studio_assets · studio_comments · studio_projects.data); this Studio keeps a
 * copy in its own page store and the two are made to agree (cloudModel.ts planCloudSync) when the Studio opens, every
 * 20 s and a moment after a page here changes. Each save names the version it was made on: the server refuses one made
 * on an older version, so when two people saved, this copy goes to Version history, the cloud's newer one is taken and
 * the Studio says so; nothing is overwritten silently. A Can view member only takes. Realtime and the soft lock are GĐ 3.
 */

/** Saving on an older version than the cloud's: refused by the server's rules. */
class StaleError extends Error {}

/** What the Studio asks of the cloud (PocketBase, or the E2E's stand-in). */
export interface CloudApi {
  listPages(project: string): Promise<CloudRow[]>;
  readPage(record: string): Promise<{ text: string; title: string; version: number }>;
  createPage(project: string, pageId: string, page: { title: string; text: string }): Promise<{ id: string; version: number }>;
  savePage(record: string, page: { title: string; text: string; trashed: boolean }, base: number): Promise<number>;
  projectData(project: string): Promise<Record<string, unknown> | null>;
  setProjectData(project: string, data: unknown): Promise<void>;
  listAssets(project: string): Promise<Set<string>>;
  uploadAsset(project: string, id: string, blob: Blob, name: string): Promise<void>;
  downloadAsset(project: string, id: string): Promise<{ blob: Blob; name: string } | null>;
  readComments(project: string, pageId: string): Promise<{ id: string; data: PageComments; version: number } | null>;
  saveComments(project: string, pageId: string, data: PageComments, current: { id: string; version: number } | null): Promise<void>;
}

const me = () => (pb.authStore.isValid ? pb.authStore.record : null);
/** A refusal of a versioned save (the rule fails: 404 on update, 400 on a create that exists). */
const stale = (error: unknown) => { const status = (error as { status?: number })?.status; return status === 404 || status === 400 ? new StaleError("stale") : error; };

const pocketbaseApi: CloudApi = {
  async listPages(project) {
    const records = await pb.collection("studio_pages").getFullList({ filter: pb.filter("project = {:project}", { project }), fields: "id,page_id,title,version,trashed" });
    return records.map((record) => ({ id: record.id, pageId: String(record.page_id), title: String(record.title ?? ""), version: Number(record.version), trashed: Boolean(record.trashed) }));
  },
  async readPage(record) {
    const row = await pb.collection("studio_pages").getOne(record);
    return { text: String(row.text ?? ""), title: String(row.title ?? ""), version: Number(row.version) };
  },
  async createPage(project, pageId, page) {
    const user = me();
    const row = await pb.collection("studio_pages").create({ project, page_id: pageId, ...page, version: 1, updated_by: user?.id, updated_by_email: user?.email }).catch((error) => { throw stale(error); });
    return { id: row.id, version: 1 };
  },
  async savePage(record, page, base) {
    const user = me();
    await pb.collection("studio_pages").update(record, { ...page, base_version: base, version: base + 1, updated_by: user?.id, updated_by_email: user?.email }).catch((error) => { throw stale(error); });
    return base + 1;
  },
  async projectData(project) {
    const row = await pb.collection("studio_projects").getOne(project, { fields: "data" });
    return row.data && typeof row.data === "object" ? (row.data as Record<string, unknown>) : null;
  },
  async setProjectData(project, data) {
    await pb.collection("studio_projects").update(project, { data });
  },
  async listAssets(project) {
    const rows = await pb.collection("studio_assets").getFullList({ filter: pb.filter("project = {:project}", { project }), fields: "asset_id" });
    return new Set(rows.map((row) => String(row.asset_id)));
  },
  async uploadAsset(project, id, blob, name) {
    const form = new FormData();
    form.set("project", project);
    form.set("asset_id", id);
    form.set("name", name);
    form.set("file", blob, id);
    await pb.collection("studio_assets").create(form).catch((error) => { if ((error as { status?: number })?.status !== 400) throw error; });
  },
  async downloadAsset(project, id) {
    const row = await pb.collection("studio_assets").getFirstListItem(pb.filter("project = {:project} && asset_id = {:id}", { project, id })).catch(() => null);
    if (!row) return null;
    const response = await fetch(pb.files.getURL(row, String(row.file)));
    return response.ok ? { blob: await response.blob(), name: String(row.name || id) } : null;
  },
  async readComments(project, pageId) {
    const row = await pb.collection("studio_comments").getFirstListItem(pb.filter("project = {:project} && page_id = {:pageId}", { project, pageId })).catch(() => null);
    return row ? { id: row.id, data: (row.data as PageComments) ?? emptyComments(), version: Number(row.version) } : null;
  },
  async saveComments(project, pageId, data, current) {
    const save = current
      ? pb.collection("studio_comments").update(current.id, { data, base_version: current.version, version: current.version + 1 })
      : pb.collection("studio_comments").create({ project, page_id: pageId, data, version: 1 });
    await save.catch((error) => { throw stale(error); });
  },
};

/** The E2E's stand-in cloud (dev only; collabStore.ts's fixture `cloud`): the same rules on plain lists, no network. */
type FixtureCloud = { pages: Array<{ id: string; project: string; page_id: string; title: string; text: string; version: number; trashed: boolean }>; data: Record<string, unknown>; comments: Record<string, { id: string; data: PageComments; version: number }> };
const fixtureCloud = (): FixtureCloud | null => {
  if (!import.meta.env.DEV || typeof window === "undefined") return null;
  const fixture = (window as { __zenStudioCollab?: { cloud?: FixtureCloud } }).__zenStudioCollab;
  return fixture ? (fixture.cloud ??= { pages: [], data: {}, comments: {} }) : null;
};
const fixtureApi = (cloud: FixtureCloud): CloudApi => ({
  async listPages(project) { return cloud.pages.filter((page) => page.project === project).map((page) => ({ id: page.id, pageId: page.page_id, title: page.title, version: page.version, trashed: page.trashed })); },
  async readPage(record) { const page = cloud.pages.find((item) => item.id === record)!; return { text: page.text, title: page.title, version: page.version }; },
  async createPage(project, pageId, page) {
    if (cloud.pages.some((item) => item.project === project && item.page_id === pageId)) throw new StaleError("exists");
    const id = `fx${cloud.pages.length + 1}`;
    cloud.pages.push({ id, project, page_id: pageId, ...page, version: 1, trashed: false });
    return { id, version: 1 };
  },
  async savePage(record, page, base) {
    const row = cloud.pages.find((item) => item.id === record);
    if (!row || row.version !== base) throw new StaleError("stale");
    Object.assign(row, page, { version: base + 1 });
    return base + 1;
  },
  async projectData(project) { return (cloud.data[project] as Record<string, unknown>) ?? null; },
  async setProjectData(project, data) { cloud.data[project] = data; },
  async listAssets() { return new Set(); },
  async uploadAsset() { /* the stand-in keeps no photos */ },
  async downloadAsset() { return null; },
  async readComments(project, pageId) { return cloud.comments[`${project}/${pageId}`] ?? null; },
  async saveComments(project, pageId, data, current) {
    const key = `${project}/${pageId}`;
    const now = cloud.comments[key] ?? null;
    if ((now?.version ?? 0) !== (current?.version ?? 0)) throw new StaleError("stale");
    cloud.comments[key] = { id: now?.id ?? key, data, version: (now?.version ?? 0) + 1 };
  },
});

const api = (): CloudApi => { const cloud = fixtureCloud(); return cloud ? fixtureApi(cloud) : pocketbaseApi; };

/* ── what this browser last agreed on ── */

const KNOWN = "collab-cloud";
type KnownStore = { pages: Record<string, Known>; projects: Record<string, string> };
let knownStore: KnownStore | null = null;
async function readKnown(): Promise<KnownStore> {
  if (knownStore) return knownStore;
  const row = await run<{ value?: KnownStore }>(SETTINGS, "readonly", (store) => store.get(KNOWN) as IDBRequest<{ value?: KnownStore }>).catch(() => null);
  knownStore = { pages: { ...(row?.value?.pages ?? {}) }, projects: { ...(row?.value?.projects ?? {}) } };
  return knownStore;
}
const writeKnown = () => (knownStore ? run(SETTINGS, "readwrite", (store) => store.put({ key: KNOWN, value: knownStore })).catch(() => null) : Promise.resolve(null));
const knownKey = (cloudProject: string, page: string) => `${cloudProject}/${page}`;

/* ── status (the top bar's word on the cloud copy) ── */

export type CloudStatus = { syncing: boolean; error: string | null; at: number | null };
let status: CloudStatus = { syncing: false, error: null, at: null };
const statusListeners = new Set<() => void>();
const setStatus = (next: Partial<CloudStatus>) => { status = { ...status, ...next }; statusListeners.forEach((listener) => listener()); };
export const useCloudStatus = () => useSyncExternalStore((listener) => { statusListeners.add(listener); return () => { statusListeners.delete(listener); }; }, () => status);

/* ── one project ── */

/** The project's settings: the owner's go up; everyone else's copy takes them (`shared-<id>`, never in a dev folder). */
async function syncSettings(cloud: CloudApi, project: SharedProject, known: KnownStore) {
  const localId = localProjectOf(project);
  if (project.access === "owner") {
    const mine = projectById(project.localId);
    if (mine) {
      const data = JSON.stringify(mine);
      if (known.projects[project.id] !== textHash(data)) { await cloud.setProjectData(project.id, mine); known.projects[project.id] = textHash(data); }
      return;
    }
  }
  const data = await cloud.projectData(project.id);
  const now = Date.now();
  await adoptProject({ ...(data ?? { theme: defaultProjectTheme(), createdAt: now, updatedAt: now }), id: localId, name: project.name });
}

/** A page's photos the cloud lacks go up (a writer's push); the ones this browser lacks come down (a pull). */
async function sendPhotos(cloud: CloudApi, project: string, text: string, have: Set<string>) {
  for (const id of assetIdsOf(text)) {
    if (have.has(id)) continue;
    const blob = await assetBlob(id);
    if (!blob) continue;
    await cloud.uploadAsset(project, id, blob, uploadOf(id)?.name ?? id);
    have.add(id);
  }
}
async function fetchPhotos(cloud: CloudApi, project: string, text: string) {
  for (const id of await missingAssets(assetIdsOf(text))) {
    const photo = await cloud.downloadAsset(project, id);
    if (photo) await putAsset(id, photo.blob, photo.name);
  }
}

async function syncProject(cloud: CloudApi, project: SharedProject, records: PageRecord[], known: KnownStore): Promise<string[]> {
  await syncSettings(cloud, project, known);
  const localProject = localProjectOf(project);
  const rows = await cloud.listPages(project.id);
  const mine = records.filter((record) => headerProject(record.text) === localProject);
  const agreed = new Map<string, Known>();
  for (const record of mine) { const entry = known.pages[knownKey(project.id, record.id)]; if (entry) agreed.set(record.id, entry); }
  for (const row of rows) { const id = localPageOf(project, row); const entry = known.pages[knownKey(project.id, id)]; if (entry) agreed.set(id, entry); }
  const steps = planCloudSync(project, rows, mine.map((record) => ({ id: record.id, text: record.text, trashed: record.trashedAt !== undefined })), agreed, textHash);
  const photos = canWritePages(project) && steps.some((step) => step.kind === "push" || step.kind === "create") ? await cloud.listAssets(project.id) : new Set<string>();
  const conflicts: string[] = [];
  // Comments are joined for the page open here and the pages this round moved (not every page every round).
  const touched = new Set<string>([studioStore.getState().localPage ?? ""]);
  const take = async (id: string, row: CloudRow, reason: "folder" | "conflict") => {
    touched.add(id);
    const page = await cloud.readPage(row.id);
    const text = withHeaderProject(page.text, localProject);
    await fetchPhotos(cloud, project.id, text);
    await putPage(id, text, { title: page.title || headerTitle(text) || row.title, reason });
    known.pages[knownKey(project.id, id)] = agreedOn(row.id, page.version, text, textHash);
  };
  for (const step of steps) {
    const key = knownKey(project.id, step.id);
    if (step.kind === "pull") await take(step.id, step.row, "folder");
    else if (step.kind === "conflict") { await take(step.id, step.row, "conflict"); conflicts.push(step.row.title || step.id); }
    else if (step.kind === "trash-local") { await trashPage(step.id); delete known.pages[key]; }
    else {
      touched.add(step.id);
      const record = records.find((item) => item.id === step.id)!;
      const text = withHeaderProject(record.text, cloudHeaderProject(project));
      await sendPhotos(cloud, project.id, text, photos);
      try {
        if (step.kind === "create") {
          const made = await cloud.createPage(project.id, cloudPageIdOf(step.id), { title: record.title, text });
          known.pages[key] = agreedOn(made.id, made.version, record.text, textHash);
        } else {
          const version = await cloud.savePage(step.row.id, { title: record.title, text, trashed: record.trashedAt !== undefined }, step.known.version);
          known.pages[key] = agreedOn(step.row.id, version, record.text, textHash);
        }
      } catch (error) {
        if (!(error instanceof StaleError) || step.kind === "create") throw error;
        // Someone saved first: theirs is taken, this copy goes to Version history.
        await take(step.id, step.row, "conflict");
        conflicts.push(step.row.title || step.id);
      }
    }
  }
  await syncComments(cloud, project, (await cloud.listPages(project.id)).filter((row) => touched.has(localPageOf(project, row))));
  return conflicts;
}

/** The pages' comments: both copies joined (page-comments.mjs mergeComments), each side given what it lacks. */
async function syncComments(cloud: CloudApi, project: SharedProject, rows: CloudRow[]) {
  for (const row of rows) {
    if (row.trashed) continue;
    const id = localPageOf(project, row);
    for (let tries = 0; tries < 2; tries += 1) {
      const [local, remote] = await Promise.all([loadComments(id), cloud.readComments(project.id, row.pageId)]);
      const joined = mergeComments(local, remote?.data ?? emptyComments());
      if (JSON.stringify(joined) !== JSON.stringify(local)) changeComments(id, () => joined);
      if (JSON.stringify(joined) === JSON.stringify(remote?.data ?? emptyComments())) break;
      try { await cloud.saveComments(project.id, row.pageId, joined, remote); break; } catch (error) { if (!(error instanceof StaleError)) throw error; }
    }
  }
}

/* ── all projects ── */

let running: Promise<void> | null = null;
let again = false;
/** Makes every shared project's copy here and the cloud's agree (once at a time; a call while one runs runs once more). */
export function syncCloudNow(projects: readonly SharedProject[] = lastProjects): Promise<void> {
  lastProjects = projects;
  if (running) { again = true; return running; }
  running = (async () => {
    setStatus({ syncing: true });
    try {
      do {
        again = false;
        const cloud = api();
        const known = await readKnown();
        const records = await allPageRecords();
        const conflicts: string[] = [];
        for (const project of lastProjects) conflicts.push(...await syncProject(cloud, project, records, known));
        await writeKnown();
        if (conflicts.length) announceEditStatus({ kind: "error", message: `Someone saved ${conflicts.join(", ")} first: theirs is open, yours is in Version history`, at: Date.now() });
      } while (again);
      setStatus({ syncing: false, error: null, at: Date.now() });
    } catch (error) {
      setStatus({ syncing: false, error: error instanceof Error ? error.message : String(error) });
    } finally {
      running = null;
    }
  })();
  return running;
}
let lastProjects: readonly SharedProject[] = [];

/** Keeps the cloud copies in step while the Studio is open (StudioApp, once): at start, every 20 s, 2 s after a change. */
export function useCloudSync() {
  const { status: collab, projects } = useCollab();
  const ready = collab === "ready";
  const key = projects.map((project) => `${project.id}:${project.access}`).join(",");
  useEffect(() => {
    if (!ready || !projects.length) return undefined;
    void syncCloudNow(projects);
    const timer = window.setInterval(() => void syncCloudNow(projects), 20_000);
    let soon = 0;
    const unsubscribe = subscribePages(() => { window.clearTimeout(soon); soon = window.setTimeout(() => void syncCloudNow(projects), 2000); });
    return () => { window.clearInterval(timer); window.clearTimeout(soon); unsubscribe(); };
    // `key` stands for the projects and roles.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, key]);
}

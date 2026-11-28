/*
 * Zen Studio collaboration, GĐ 2 (docs/research/studio-collaboration-plan-2026-11-07.md): the pure rules of the cloud
 * copy of a shared project (tools/studio/pocketbase: studio_pages, versioned saves). No imports (the text hash comes in
 * as an argument: pageModel.ts textHash), so `node cloudModel.selftest.mjs` runs it as is.
 *
 * Ids. The owner's Studio keeps its own ids: the project's local id (`local_id`) and each page's (`page_id`). Anyone else
 * keeps the project as `shared-<cloud id>` and each page as `cloud-<record id>`, so they never meet their own pages' ids.
 * A page's text in the cloud names the owner's project id in its header; each Studio writes its own in its copy.
 */

/** A shared project as this Studio sees it (collabStore.ts SharedProject). */
export type CloudProjectRef = { id: string; localId: string; access: "owner" | "editor" | "viewer" };
/** A page row of the cloud listing (no text). */
export type CloudRow = { id: string; pageId: string; title: string; version: number; trashed: boolean };
/** A page of this Studio in the project. */
export type LocalPage = { id: string; text: string; trashed: boolean };
/** What this Studio last agreed with the cloud on, per local page: the record, its version, the local text's hash. */
export type Known = { record: string; version: number; hash: string };

export type CloudStep =
  /** The cloud's page is newer and this copy has not changed: take it (`id` is the local page's, new or not). */
  | { kind: "pull"; id: string; row: CloudRow }
  /** Both changed since they last agreed: take the cloud's, keep this copy in Version history, and say so. */
  | { kind: "conflict"; id: string; row: CloudRow }
  /** This copy changed and the cloud's has not: save it on the version both had. */
  | { kind: "push"; id: string; row: CloudRow; known: Known }
  /** A page only here, in a project this person can edit: make it in the cloud. */
  | { kind: "create"; id: string }
  /** The page is gone from the cloud (deleted for good) or trashed there: trash it here. */
  | { kind: "trash-local"; id: string };

export const sharedProjectId = (cloudId: string) => `shared-${cloudId}`;
export const memberPageId = (recordId: string) => `cloud-${recordId}`;

/** The project's id in this Studio: the owner's own, else `shared-<cloud id>`. */
export const localProjectOf = (project: CloudProjectRef) => (project.access === "owner" ? project.localId : sharedProjectId(project.id));
/** A cloud page's id in this Studio: the owner's own page id, else `cloud-<record id>`. */
export const localPageOf = (project: CloudProjectRef, row: Pick<CloudRow, "id" | "pageId">) => (project.access === "owner" ? row.pageId : memberPageId(row.id));
/** The page id the cloud keeps for a page of this Studio (a new page someone else makes keeps its own id there). */
export const cloudPageIdOf = (localId: string) => localId;

/** The project id a page's header names in the cloud's copy: the owner's (pageModel.ts withHeaderProject writes it). */
export const cloudHeaderProject = (project: CloudProjectRef) => project.localId;

/** Who may write the project's pages: its owner and Can edit members (the server's rule, collab_pages migration). */
export const canWritePages = (project: CloudProjectRef) => project.access !== "viewer";

/**
 * What to do to make this Studio's pages of a project and the cloud's agree, from the cloud's listing, the pages here and
 * what each last agreed on. A page changed on both sides since then is a conflict: the cloud's wins and this copy goes to
 * Version history, never overwritten silently. Someone who can only view never sends anything.
 */
export function planCloudSync(project: CloudProjectRef, rows: readonly CloudRow[], locals: readonly LocalPage[], known: ReadonlyMap<string, Known>, hash: (text: string) => string): CloudStep[] {
  const steps: CloudStep[] = [];
  const write = canWritePages(project);
  const here = new Map(locals.map((page) => [page.id, page]));
  const seen = new Set<string>();
  for (const row of rows) {
    const id = localPageOf(project, row);
    seen.add(id);
    const local = here.get(id);
    const agreed = known.get(id);
    if (!local) {
      if (!row.trashed) steps.push({ kind: "pull", id, row });
      continue;
    }
    const localChanged = !agreed || agreed.hash !== hash(local.text) || (local.trashed && !row.trashed);
    const cloudChanged = !agreed || row.version > agreed.version;
    if (row.trashed) {
      if (!local.trashed) steps.push(localChanged && agreed ? { kind: "conflict", id, row } : { kind: "trash-local", id });
      continue;
    }
    if (!agreed) steps.push({ kind: "conflict", id, row });
    else if (cloudChanged && localChanged) steps.push({ kind: "conflict", id, row });
    else if (cloudChanged) steps.push({ kind: "pull", id, row });
    else if (localChanged) steps.push(write ? { kind: "push", id, row, known: agreed } : { kind: "pull", id, row });
  }
  for (const local of locals) {
    if (seen.has(local.id)) continue;
    // Agreed once and gone from the cloud now: deleted there for good.
    if (known.has(local.id)) { if (!local.trashed) steps.push({ kind: "trash-local", id: local.id }); continue; }
    if (write && !local.trashed) steps.push({ kind: "create", id: local.id });
  }
  return steps;
}

/** The record of what this copy and the cloud now agree on. */
export const agreedOn = (record: string, version: number, localText: string, hash: (text: string) => string): Known => ({ record, version, hash: hash(localText) });

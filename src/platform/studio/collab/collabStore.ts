import { useEffect, useSyncExternalStore } from "react";
import { pb, useAuthUser, type AuthUser } from "../../auth/pocketbase";
import { accessOf, normalizeEmail, roleCeiling, type CloudAccess, type MemberRole } from "./collabModel";
import { studioStore, useStudio } from "../store";

/*
 * Zen Studio collaboration, GĐ 1 (docs/research/studio-collaboration-plan-2026-11-07.md): the signed-in person's seat
 * and the projects shared with them, read from PocketBase (tools/studio/pocketbase: studio_seats, studio_projects,
 * studio_members). The server's API rules decide every read and write; this keeps what it answered and turns its
 * refusals into words. A project you own is shared from your Studio (its local id is kept with it); one shared with you
 * reads `shared-<cloud id>` as its local id (its pages come to your Studio with GĐ 2's cloud PageMirror).
 */

export type SharedProject = { id: string; name: string; owner: string; ownerEmail: string; localId: string; access: CloudAccess };
export type Member = { id: string; email: string; role: MemberRole };
/** What the server said: not signed in, no seat, not set up yet (no collections on this server), offline, or ready. */
export type CollabStatus = "signed-out" | "loading" | "no-seat" | "unavailable" | "offline" | "ready";
export type CollabState = { status: CollabStatus; projects: SharedProject[]; error: string | null };

/** The local id a project shared with you takes in your Studio. */
export const sharedLocalId = (cloudId: string) => `shared-${cloudId}`;

let state: CollabState = { status: "signed-out", projects: [], error: null };
const listeners = new Set<() => void>();
const set = (next: Partial<CollabState>) => { state = { ...state, ...next }; listeners.forEach((listener) => listener()); };
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };

/** The Studio E2E's stand-in for the server (dev only; tools/studio/e2e sets it before the page loads): no network. */
type Fixture = { me: { id: string; email: string }; seat: boolean; projects: SharedProject[]; members: Record<string, Member[]> };
const fixture = (): Fixture | null => (import.meta.env.DEV && typeof window !== "undefined" ? ((window as { __zenStudioCollab?: Fixture }).__zenStudioCollab ?? null) : null);

/** A refusal or a failure in words, and the state it puts the Studio in. */
export function explain(error: unknown): { status: CollabStatus | null; message: string } {
  const { status, response, message } = (error ?? {}) as { status?: number; response?: { message?: string; data?: Record<string, { message?: string }> }; message?: string };
  const said = response?.message ?? message ?? "";
  if (status === 0) return { status: "offline", message: "Can't reach the sharing server. Check your connection." };
  if (status === 404 && /collection/i.test(said)) return { status: "unavailable", message: "Sharing isn't set up on this server yet." };
  if (status === 400 && response?.data && Object.values(response.data).some((field) => /unique/i.test(field?.message ?? ""))) return { status: null, message: "Already in this project." };
  if (status === 400 || status === 403) return { status: null, message: "Only the project's owner can change who is in it." };
  if (status === 401) return { status: "signed-out", message: "Sign in again to share." };
  return { status: null, message: said || "Sharing failed. Try again." };
}

const toProject = (record: Record<string, unknown>, access: CloudAccess): SharedProject => ({
  id: String(record.id), name: String(record.name ?? ""), owner: String(record.owner ?? ""), ownerEmail: String(record.owner_email ?? ""), localId: String(record.local_id ?? ""), access,
});

let loading: Promise<void> | null = null;
/** Reads the seat and the shared projects again (after sign-in, an invite, a role change). */
export function refreshCollab(user: AuthUser | null = currentUser()): Promise<void> {
  const fake = fixture();
  if (fake) {
    set({ status: fake.seat ? "ready" : "no-seat", projects: fake.seat ? fake.projects : [], error: null });
    return Promise.resolve();
  }
  if (!user) { set({ status: "signed-out", projects: [], error: null }); return Promise.resolve(); }
  loading ??= (async () => {
    set({ status: state.status === "ready" ? "ready" : "loading" });
    try {
      const seat = await pb.collection("studio_seats").getList(1, 1);
      if (!seat.items.length) { set({ status: "no-seat", projects: [], error: null }); return; }
      const email = normalizeEmail(user.email) ?? user.email;
      const [records, mine] = await Promise.all([
        pb.collection("studio_projects").getFullList({ sort: "name" }),
        pb.collection("studio_members").getFullList({ filter: pb.filter("email = {:email}", { email }) }),
      ]);
      const roles = new Map(mine.map((member) => [String(member.project), String(member.role) as MemberRole]));
      const projects = records.flatMap((record) => {
        const access = accessOf(String(record.owner), roles.has(record.id) ? [{ email, role: roles.get(record.id)! }] : [], user);
        return access ? [toProject(record, access)] : [];
      });
      set({ status: "ready", projects, error: null });
    } catch (error) {
      const { status, message } = explain(error);
      set({ status: status ?? "ready", error: status === "unavailable" ? null : message, ...(status && status !== "ready" ? { projects: [] } : {}) });
    } finally {
      loading = null;
    }
  })();
  return loading;
}

const currentUser = (): AuthUser | null => {
  const record = pb.authStore.isValid ? pb.authStore.record : null;
  return record ? { id: record.id, email: String(record.email ?? ""), name: String(record.name ?? "") } : null;
};

/** The collaboration state, read again whenever the signed-in person changes. */
export function useCollab(): CollabState {
  const user = useAuthUser();
  useEffect(() => { void refreshCollab(user); }, [user?.id]);
  return useSyncExternalStore(subscribe, () => state);
}

/** Your place in a project of your Studio: the owner of the cloud copy of a project you shared, a member of one shared
 *  with you, or null (a project only on this machine, Drafts). */
export function accessOfLocal(localId: string | null, projects: readonly SharedProject[] = state.projects): CloudAccess | null {
  if (!localId) return null;
  const shared = localId.startsWith("shared-") ? projects.find((project) => sharedLocalId(project.id) === localId) : null;
  if (shared) return shared.access;
  return projects.some((project) => project.access === "owner" && project.localId === localId) ? "owner" : null;
}

/** The cloud copy of a project you own, if you shared it. */
export const cloudProjectOf = (localId: string, projects: readonly SharedProject[] = state.projects) =>
  projects.find((project) => (project.access === "owner" && project.localId === localId) || sharedLocalId(project.id) === localId) ?? null;

/** Holds the Studio's role under the open project's ceiling (StudioApp, once): a Can view member never edits it. */
export function useRoleCeiling(localProject: string | null) {
  const { projects } = useCollab();
  // Someone else editing the open page (presence.ts soft lock) holds it too: the Studio views it meanwhile.
  const locked = useStudio((current) => Boolean(current.pageLock));
  const ceiling = locked ? "viewer" : roleCeiling(accessOfLocal(localProject, projects));
  useEffect(() => { studioStore.setState({ roleCeiling: ceiling }); }, [ceiling]);
}

/* ── The owner's actions (the server refuses them for anyone else) ── */

/** Shares a project of your Studio: its cloud copy (made once, then reused). */
export async function shareProject(project: { id: string; name: string }): Promise<SharedProject> {
  const existing = cloudProjectOf(project.id);
  if (existing) return existing;
  const fake = fixture();
  if (fake) {
    const shared: SharedProject = { id: `e2e-${project.id}`, name: project.name, owner: fake.me.id, ownerEmail: fake.me.email, localId: project.id, access: "owner" };
    fake.projects.push(shared);
    fake.members[shared.id] = [];
    await refreshCollab();
    return shared;
  }
  const user = currentUser();
  if (!user) throw Object.assign(new Error("Sign in to share."), { status: 401 });
  const record = await pb.collection("studio_projects").create({ name: project.name, owner: user.id, owner_email: normalizeEmail(user.email) ?? user.email, local_id: project.id });
  const shared = toProject(record, "owner");
  set({ projects: [...state.projects, shared] });
  return shared;
}

/** The people in a shared project (the owner is the project's own field). */
export async function listMembers(cloudId: string): Promise<Member[]> {
  const fake = fixture();
  if (fake) return [...(fake.members[cloudId] ?? [])];
  const records = await pb.collection("studio_members").getFullList({ filter: pb.filter("project = {:id}", { id: cloudId }), sort: "email" });
  return records.map((record) => ({ id: record.id, email: String(record.email), role: String(record.role) as MemberRole }));
}

/** Invites people by email as Can edit or Can view; returns the ones added and why the others were not. */
export async function inviteMembers(cloudId: string, emails: readonly string[], role: MemberRole): Promise<{ added: string[]; failed: Array<{ email: string; message: string }> }> {
  const user = currentUser();
  const added: string[] = [];
  const failed: Array<{ email: string; message: string }> = [];
  const fake = fixture();
  for (const email of emails) {
    if (fake) {
      const list = (fake.members[cloudId] ??= []);
      if (list.some((member) => member.email === email)) failed.push({ email, message: "Already in this project." });
      else { list.push({ id: `m-${email}`, email, role }); added.push(email); }
      continue;
    }
    try {
      await pb.collection("studio_members").create({ project: cloudId, email, role, ...(user ? { invited_by: user.id } : {}) });
      added.push(email);
    } catch (error) {
      failed.push({ email, message: explain(error).message });
    }
  }
  return { added, failed };
}

/** The members a stand-in server holds (E2E), found by a member's id. */
const fakeMembers = (memberId: string) => Object.values(fixture()?.members ?? {}).find((list) => list.some((member) => member.id === memberId));

export async function setMemberRole(memberId: string, role: MemberRole): Promise<void> {
  const list = fakeMembers(memberId);
  if (list) { list.forEach((member) => { if (member.id === memberId) member.role = role; }); return; }
  await pb.collection("studio_members").update(memberId, { role });
}

export async function removeMember(memberId: string): Promise<void> {
  const list = fakeMembers(memberId);
  if (list) { list.splice(list.findIndex((member) => member.id === memberId), 1); return; }
  await pb.collection("studio_members").delete(memberId);
}

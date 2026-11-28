/*
 * Zen Studio collaboration, GĐ 1 (docs/research/studio-collaboration-plan-2026-11-07.md): the pure rules the Share
 * dialog, the role menu and the store share. A project shared to the cloud (tools/studio/pocketbase, collections
 * studio_projects + studio_members) has an owner and members by email, each Can edit or Can view; the server's API
 * rules decide who reads and writes, these only say what the UI shows. No imports, so `node collabModel.selftest.mjs`
 * runs it as is.
 */

/** A person's place in a shared project: its owner, or a member who can edit or only view. */
export type CloudAccess = "owner" | "editor" | "viewer";
/** The roles an owner gives (studio_members.role). */
export type MemberRole = "editor" | "viewer";
/** The Studio's own roles (types.ts StudioRole): Can edit / Can view. */
export type StudioRoleKey = "admin" | "viewer";

/** Figma's words for each place. */
export const ACCESS_LABELS: Readonly<Record<CloudAccess, string>> = { owner: "Owner", editor: "Can edit", viewer: "Can view" };

/** An email as the server stores and compares it (trimmed, lower case), or null when it is not one. */
export function normalizeEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

/** Several emails typed in one field (commas, semicolons, spaces or new lines): the valid ones once each, and the rest. */
export function parseEmails(raw: string): { emails: string[]; invalid: string[] } {
  const emails: string[] = [];
  const invalid: string[] = [];
  for (const part of raw.split(/[\s,;]+/).filter(Boolean)) {
    const email = normalizeEmail(part);
    if (!email) invalid.push(part);
    else if (!emails.includes(email)) emails.push(email);
  }
  return { emails, invalid };
}

/** Someone's place in a project from its owner id and its members (email → role): owner, a member's role, else null. */
export function accessOf(owner: string, members: ReadonlyArray<{ email: string; role: MemberRole }>, me: { id: string; email: string } | null): CloudAccess | null {
  if (!me) return null;
  if (owner === me.id) return "owner";
  const email = normalizeEmail(me.email);
  return members.find((member) => member.email === email)?.role ?? null;
}

/** The most a place allows: a Can view member can never switch to Can edit (null: not shared, the Studio's own rules). */
export const roleCeiling = (access: CloudAccess | null): StudioRoleKey => (access === "viewer" ? "viewer" : "admin");

/** The role the Studio works in: the one the person picked, held under their project's ceiling. */
export const effectiveRole = (chosen: StudioRoleKey, ceiling: StudioRoleKey): StudioRoleKey => (ceiling === "viewer" ? "viewer" : chosen);

/** The link a member opens: the Studio home with the shared project (`?shared=<cloud id>`). */
export function shareLink(origin: string, path: string, cloudId: string): string {
  const url = new URL(path, origin);
  url.search = "";
  url.searchParams.set("shared", cloudId);
  return url.toString();
}

/** The owner first, then members by email: the Share dialog's list. */
export function sortMembers<T extends { email: string; access: CloudAccess }>(people: readonly T[]): T[] {
  return [...people].sort((a, b) => (a.access === "owner" ? -1 : b.access === "owner" ? 1 : a.email.localeCompare(b.email)));
}

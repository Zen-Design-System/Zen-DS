/*
 * Zen Studio collaboration, GĐ 3 (docs/research/studio-collaboration-plan-2026-11-07.md): who is on a page of a shared
 * project and who holds its soft lock, from the rows of studio_presence (tools/studio/pocketbase). One editor per page
 * (user 2026-11-22): the first person who opened it to edit holds it; anyone else views until they leave, or presses
 * Edit anyway (both edit then; GĐ 2's versioned saves keep the earlier save in Version history). A row not renewed for
 * PRESENCE_TTL is someone who left (a closed tab, a lost connection). No imports, so `node presenceModel.selftest.mjs`
 * runs it as is.
 */

/** How often a person renews their row, and when a row is someone who left. */
export const HEARTBEAT_MS = 15_000;
export const PRESENCE_TTL = 45_000;

export type PresenceRow = { id: string; user: string; email: string; name: string; editing: boolean; seen: number; created: number };

/** The people on the page now: rows renewed within the TTL, one per person (their latest), oldest arrival first. */
export function livePeople(rows: readonly PresenceRow[], now: number): PresenceRow[] {
  const latest = new Map<string, PresenceRow>();
  for (const row of rows) {
    if (now - row.seen > PRESENCE_TTL) continue;
    const known = latest.get(row.user);
    if (!known || row.seen > known.seen) latest.set(row.user, row);
  }
  return [...latest.values()].sort((a, b) => a.created - b.created);
}

/** Who holds the page's lock: the earliest arrival among those editing (null: nobody edits). */
export function lockHolder(rows: readonly PresenceRow[], now: number): PresenceRow | null {
  return livePeople(rows, now).find((row) => row.editing) ?? null;
}

/** Someone else who holds the lock, so this person views (null: this person may edit). Pressing Edit anyway (`forced`)
 *  lets them edit beside the holder. */
export function lockedBy(rows: readonly PresenceRow[], me: string, now: number, forced: boolean): PresenceRow | null {
  if (forced) return null;
  const holder = lockHolder(rows, now);
  return holder && holder.user !== me ? holder : null;
}

/** Whether this person's row says they edit: they can write the project and nobody else holds the lock (or they forced). */
export const claimsEdit = (canWrite: boolean, rows: readonly PresenceRow[], me: string, now: number, forced: boolean) => canWrite && !lockedBy(rows, me, now, forced);

/** The others on the page for the top bar's avatars (this person left out). */
export const othersOn = (rows: readonly PresenceRow[], me: string, now: number) => livePeople(rows, now).filter((row) => row.user !== me);

/** A person's name for the UI: their name, else the part of their email before @. */
export const personName = (row: Pick<PresenceRow, "name" | "email">) => row.name.trim() || row.email.split("@")[0];

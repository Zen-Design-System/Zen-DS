import { useEffect, useSyncExternalStore } from "react";
import { pb } from "../../auth/pocketbase";
import { studioStore, useStudio } from "../store";
import { canWritePages } from "./cloudModel";
import { cloudApi, cloudPlaceOf, useCloudPlaces } from "./cloudSync";
import { claimsEdit, HEARTBEAT_MS, lockedBy, othersOn, personName, type PresenceRow } from "./presenceModel";

/*
 * Zen Studio collaboration, GĐ 3 (docs/research/studio-collaboration-plan-2026-11-07.md): seeing each other on a page of
 * a shared project. While a page is open, this person's row in studio_presence says they are there and whether they
 * edit (renewed every 15 s, removed when they leave); the server's realtime events and each renewal read everyone's.
 * The top bar shows the others (PagePeople.tsx); someone else editing holds the page's soft lock (presenceModel.ts), so
 * the Studio views it (`state.pageLock`, the role's ceiling and the View only note) until they leave or this person
 * presses Edit anyway.
 */

type PresenceState = { page: string | null; rows: PresenceRow[]; me: string | null; forced: boolean; at: number };
let state: PresenceState = { page: null, rows: [], me: null, forced: false, at: 0 };
const listeners = new Set<() => void>();
const set = (next: Partial<PresenceState>) => { state = { ...state, ...next }; listeners.forEach((listener) => listener()); publishLock(); };
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };

/** The open page's lock in the store: the role's ceiling and the View only note read it. */
function publishLock() {
  const holder = state.me ? lockedBy(state.rows, state.me, Date.now(), state.forced) : null;
  const next = holder ? { name: personName(holder), email: holder.email } : null;
  const now = studioStore.getState().pageLock;
  if ((now?.email ?? null) !== (next?.email ?? null)) studioStore.setState({ pageLock: next });
}

/** The others on the open page, and who holds its lock (null: nobody else edits, or Edit anyway was pressed). */
export function usePresence(): { others: PresenceRow[]; holder: PresenceRow | null } {
  const now = useSyncExternalStore(subscribe, () => state);
  const at = now.at || Date.now();
  return { others: now.me ? othersOn(now.rows, now.me, at) : [], holder: now.me ? lockedBy(now.rows, now.me, at, now.forced) : null };
}

let renew: (() => Promise<void>) | null = null;
/** Edit anyway: this person edits beside the lock's holder (both may save; the later save keeps the other in Version
 *  history, GĐ 2). */
export function editAnyway() {
  set({ forced: true });
  void renew?.();
}

/** Keeps this person's row on the open page and reads everyone's (StudioApp, once). */
export function usePagePresence() {
  const page = useStudio((current) => current.localPage);
  useCloudPlaces();
  const place = cloudPlaceOf(page);
  const key = place ? `${place.project.id}/${place.pageId}/${place.project.access}` : "";
  useEffect(() => {
    if (!page || !place) { set({ page: null, rows: [], forced: false }); renew = null; return undefined; }
    const cloud = cloudApi();
    const who = cloud.me();
    if (!who) return undefined;
    let mine: string | null = null;
    let live = true;
    set({ page, rows: [], me: who.id, forced: false, at: Date.now() });
    const read = async () => {
      const rows = await cloud.listPresence(place.project.id, place.pageId).catch(() => null);
      if (live && rows) set({ rows, at: Date.now() });
    };
    renew = async () => {
      await read();
      if (!live) return;
      const editing = claimsEdit(canWritePages(place.project), state.rows, who.id, Date.now(), state.forced);
      mine = await cloud.setPresence(place.project.id, place.pageId, editing, mine).catch(() => mine);
      await read();
    };
    void renew();
    const timer = window.setInterval(() => void renew?.(), HEARTBEAT_MS);
    // Someone came, left, or started editing: read again at once.
    let stopRealtime: (() => void) | null = null;
    void cloud.subscribe((collection) => { if (collection === "studio_presence") void read(); }).then((stop) => { if (live) stopRealtime = stop; else stop(); });
    // A closed tab removes its row as it goes (the request outlives the page); a lost one ages out after 45 s.
    const leave = () => {
      if (!mine || !pb.authStore.isValid) return;
      void fetch(`${pb.baseURL}/api/collections/studio_presence/records/${mine}`, { method: "DELETE", keepalive: true, headers: { Authorization: pb.authStore.token } }).catch(() => undefined);
    };
    window.addEventListener("pagehide", leave);
    return () => {
      live = false;
      renew = null;
      window.clearInterval(timer);
      window.removeEventListener("pagehide", leave);
      stopRealtime?.();
      if (mine) void cloud.removePresence(mine);
      set({ page: null, rows: [], forced: false });
    };
    // `key` stands for the place.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, key]);
}

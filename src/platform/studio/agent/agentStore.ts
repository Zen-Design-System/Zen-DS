import { useSyncExternalStore } from "react";
import { reduceTranscript, type AgentEvent, type AgentItem } from "../../../../tools/studio/agent/transcript.mjs";
import { authorized, undoEdit } from "../api";
import { studioTabId } from "../mcp/runtime";
import { studioStore } from "../store";
import type { StudioEditRecord } from "../types";
import { pictureOf } from "./pictures";

/*
 * Zen Agent in the tab (plan docs/research/studio-vibe-agent-2026-10-18.md §4, V0; §9 V1a): the panel's state. The dev
 * server runs the turns (tools/studio/agent/session.mjs) and sends their events over the HMR socket (zen-agent:event);
 * this store folds them into the transcript with the server's own reducer, and asks GET /agent/session for the whole
 * transcript when the panel opens or the socket comes back. Dev server only: a build has no agent.
 *
 * V1a: the model the next message runs on, pictures attached to it, the person's answer to a question the turn waits on,
 * and "undo the whole turn" (the undo records a turn made, while they are still the top of the stack and all the AI's).
 */

export type AgentModel = { id: string; label: string; input?: number; output?: number };
export type AgentPicture = { id: string; mediaType: string; data: string; thumb: string };
export type AgentState = {
  open: boolean;
  /** checking: asking the server · ready · unavailable: no credentials (hint says the fix) · offline: no dev server. */
  status: "checking" | "ready" | "unavailable" | "offline";
  hint: string | null;
  models: AgentModel[];
  /** The model of this tab's conversation on the server. */
  model: string | null;
  /** The person's pick for the next message (null: the conversation's model). */
  picked: string | null;
  items: AgentItem[];
  busy: boolean;
  /** The selection goes with the next message (the context chip). */
  useSelection: boolean;
  /** Pictures for the next message (at most 4). */
  pictures: AgentPicture[];
  /** Turns the person took back with "Undo turn". */
  undone: number[];
  /** Why the last message (or answer, or picture) did not go. */
  error: string | null;
};

type SessionReply = {
  ok?: boolean;
  available?: boolean;
  hint?: string;
  error?: string;
  models?: AgentModel[];
  model?: string;
  items?: AgentItem[];
  busy?: boolean;
};

export const MAX_PICTURES = 4;

let state: AgentState = { open: false, status: "checking", hint: null, models: [], model: null, picked: null, items: [], busy: false, useSelection: true, pictures: [], undone: [], error: null };
const listeners = new Set<() => void>();
const set = (next: Partial<AgentState>) => {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
};
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };

/** Bumped by a new chat: a session answer asked for before it is dropped (it would bring the old chat back). */
let generation = 0;
/** What to tell the agent with the next message ("The person undid your turn 2 …"). */
let notes: string[] = [];

export const agentState = () => state;
export function useAgent(): AgentState {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

/** The model the next message runs on. */
export const nextModel = (current: AgentState = state) => current.picked ?? current.model;

/** Asks the server for the conversation and whether Claude can be called. */
export async function refreshAgent() {
  const asked = generation;
  const reply = await authorized<SessionReply>(`/agent/session?tab=${encodeURIComponent(studioTabId())}`);
  if (asked !== generation) return;
  const body = reply?.body;
  if (!reply || !body?.ok) {
    set({ status: "offline", hint: body?.error ?? "Zen Agent needs the Studio server — start it first", busy: false });
    return;
  }
  set({
    status: body.available ? "ready" : "unavailable",
    hint: body.available ? null : body.hint ?? null,
    models: body.models ?? [],
    model: body.model ?? null,
    items: body.items ?? [],
    busy: Boolean(body.busy),
  });
}

export function openAgent() {
  if (!state.open) set({ open: true });
  void refreshAgent();
}
export const closeAgent = () => set({ open: false });
export const toggleAgent = () => (state.open ? closeAgent() : openAgent());
export const setUseSelection = (useSelection: boolean) => set({ useSelection });
export const pickModel = (id: string) => set({ picked: id });

/* ── pictures ─────────────────────────────────────────────────────────────────────────────────────────────────── */

let pictureId = 0;
/** Scales the pictures down in the browser and keeps them for the next message. */
export async function addPictures(files: Blob[]) {
  const images = files.filter((file) => file.type.startsWith("image/"));
  if (!images.length) return;
  const room = MAX_PICTURES - state.pictures.length;
  if (room <= 0) {
    set({ error: `At most ${MAX_PICTURES} pictures per message` });
    return;
  }
  try {
    const added = await Promise.all(images.slice(0, room).map(async (file) => ({ id: `p${++pictureId}`, ...(await pictureOf(file)) })));
    set({ pictures: [...state.pictures, ...added], error: images.length > room ? `At most ${MAX_PICTURES} pictures per message` : null });
  } catch {
    set({ error: "That picture could not be read" });
  }
}
export const removePicture = (id: string) => set({ pictures: state.pictures.filter((picture) => picture.id !== id) });

/* ── messages ─────────────────────────────────────────────────────────────────────────────────────────────────── */

export async function sendToAgent(text: string) {
  const prompt = text.trim();
  if (!prompt || state.busy) return;
  const pictures = state.pictures;
  set({ busy: true, error: null });
  const reply = await authorized<{ ok?: boolean; error?: string }>("/agent/send", {
    tab: studioTabId(),
    text: prompt,
    useSelection: state.useSelection,
    ...(nextModel() ? { model: nextModel() } : {}),
    images: pictures.map(({ mediaType, data }) => ({ mediaType, data })),
    thumbs: pictures.map(({ thumb }) => thumb),
    notes,
  });
  if (!reply?.body?.ok) {
    set({ busy: false, error: reply?.body?.error ?? "The Studio dev server did not answer." });
    return;
  }
  notes = [];
  // Selection is per message, as a chip: it comes back with the next selection. The pick becomes the conversation's model.
  set({ useSelection: true, pictures: [], model: nextModel(), picked: null });
}

/** The person's answer to the question the turn waits on (a picked option, or their own words). */
export async function answerAgent(text: string, call?: string) {
  const answer = text.trim();
  if (!answer) return;
  const reply = await authorized<{ ok?: boolean; error?: string }>("/agent/answer", { tab: studioTabId(), text: answer, ...(call ? { call } : {}) });
  if (!reply?.body?.ok) set({ error: reply?.body?.error ?? "The Studio dev server did not answer." });
  else if (state.error) set({ error: null });
}

export async function stopAgent() {
  await authorized("/agent/stop", { tab: studioTabId() });
}

export async function newAgentChat() {
  generation += 1;
  notes = [];
  turnStart.clear();
  turnUndo.clear();
  set({ items: [], busy: false, error: null, undone: [] });
  await authorized("/agent/reset", { tab: studioTabId() });
}

/* ── undo the whole turn ──────────────────────────────────────────────────────────────────────────────────────── */

type TurnUndo = { depth: number; below: StudioEditRecord | null; top: StudioEditRecord | null; count: number };
const turnStart = new Map<number, { depth: number; below: StudioEditRecord | null }>();
const turnUndo = new Map<number, TurnUndo>();

/** Whether `turn`'s changes can be taken back in one go: { ok, count } or { ok: false, reason } (a tooltip). */
export function turnUndoState(turn: number, undo: readonly StudioEditRecord[], undone: readonly number[]): { ok: true; count: number } | { ok: false; reason: string } {
  const info = turnUndo.get(turn);
  if (undone.includes(turn)) return { ok: false, reason: "Undone" };
  if (!info || info.count <= 0) return { ok: false, reason: "This turn changed nothing" };
  const still = undo.length === info.depth + info.count && undo.at(-1) === info.top && (info.depth === 0 || undo[info.depth - 1] === info.below);
  if (!still) return { ok: false, reason: "The page changed after this turn: undo step by step (⌘Z)" };
  if (undo.slice(info.depth).some((record) => !record.label.startsWith("AI · "))) return { ok: false, reason: "You edited during this turn: undo step by step (⌘Z)" };
  return { ok: true, count: info.count };
}

/** Takes back every change `turn` made, newest first, as ⌘Z would; the agent hears of it with the next message. */
export async function undoTurn(turn: number) {
  const check = turnUndoState(turn, studioStore.getState().undo, state.undone);
  if (!check.ok) return;
  for (let index = 0; index < check.count; index += 1) {
    if (!(await undoEdit())) {
      set({ error: "Some changes could not be undone: use ⌘Z" });
      break;
    }
  }
  notes = [...notes, `The person undid your turn ${turn} (its ${check.count} change${check.count === 1 ? "" : "s"}): the page is as it was before it.`];
  set({ undone: [...state.undone, turn] });
}

/* ── events ───────────────────────────────────────────────────────────────────────────────────────────────────── */

/** The server's events for this tab, from the moment the Studio starts (AgentPanel); the returned function stops them. */
export function startAgentEvents(): () => void {
  const hot = import.meta.hot;
  if (!hot) return () => {};
  const onEvent = (data: { tab?: string; event?: AgentEvent }) => {
    if (!data?.event || data.tab !== studioTabId()) return;
    const event = data.event;
    // The undo stack around the turn: its records are the ones added between its prompt and its end.
    const undo = studioStore.getState().undo;
    if (event.type === "user") turnStart.set(event.turn, { depth: undo.length, below: undo.at(-1) ?? null });
    if (event.type === "end") {
      const start = turnStart.get(event.turn);
      if (start) turnUndo.set(event.turn, { ...start, top: undo.at(-1) ?? null, count: undo.length - start.depth });
    }
    set({
      items: reduceTranscript(state.items, event),
      ...(event.type === "user" ? { busy: true } : event.type === "end" ? { busy: false } : {}),
    });
  };
  // A reconnected socket may have missed events: the server's transcript is the truth.
  const onConnect = () => { if (state.open) void refreshAgent(); };
  hot.on("zen-agent:event", onEvent);
  hot.on("vite:ws:connect", onConnect);
  return () => {
    hot.off?.("zen-agent:event", onEvent);
    hot.off?.("vite:ws:connect", onConnect);
  };
}

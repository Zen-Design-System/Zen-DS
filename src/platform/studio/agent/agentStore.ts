import { useSyncExternalStore } from "react";
import { reduceTranscript, type AgentEvent, type AgentItem } from "../../../../tools/studio/agent/transcript.mjs";
import { authorized } from "../api";
import { studioTabId } from "../mcp/runtime";

/*
 * Zen Agent in the tab (plan docs/research/studio-vibe-agent-2026-10-18.md §4, V0): the panel's state. The dev server
 * runs the turns (tools/studio/agent/session.mjs) and sends their events over the HMR socket (zen-agent:event); this store
 * folds them into the transcript with the server's own reducer, and asks GET /agent/session for the whole transcript when
 * the panel opens or the socket comes back. Dev server only: a build has no agent.
 */

export type AgentModel = { id: string; label: string };
export type AgentState = {
  open: boolean;
  /** checking: asking the server · ready · unavailable: no credentials (hint says the fix) · offline: no dev server. */
  status: "checking" | "ready" | "unavailable" | "offline";
  hint: string | null;
  models: AgentModel[];
  model: string | null;
  items: AgentItem[];
  busy: boolean;
  /** The selection goes with the next message (the context chip). */
  useSelection: boolean;
  /** Why the last message did not start. */
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

let state: AgentState = { open: false, status: "checking", hint: null, models: [], model: null, items: [], busy: false, useSelection: true, error: null };
const listeners = new Set<() => void>();
const set = (next: Partial<AgentState>) => {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
};
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };

/** Bumped by a new chat: a session answer asked for before it is dropped (it would bring the old chat back). */
let generation = 0;

export const agentState = () => state;
export function useAgent(): AgentState {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

/** Asks the server for the conversation and whether Claude can be called. */
export async function refreshAgent() {
  const asked = generation;
  const reply = await authorized<SessionReply>(`/agent/session?tab=${encodeURIComponent(studioTabId())}`);
  if (asked !== generation) return;
  const body = reply?.body;
  if (!reply || !body?.ok) {
    set({ status: "offline", hint: body?.error ?? "Zen Agent runs on the Studio dev server (npm run dev).", busy: false });
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

export async function sendToAgent(text: string) {
  const prompt = text.trim();
  if (!prompt || state.busy) return;
  set({ busy: true, error: null });
  const reply = await authorized<{ ok?: boolean; error?: string }>("/agent/send", { tab: studioTabId(), text: prompt, useSelection: state.useSelection });
  if (!reply?.body?.ok) set({ busy: false, error: reply?.body?.error ?? "The Studio dev server did not answer." });
  // Selection is per message, as a chip: it comes back with the next selection.
  else set({ useSelection: true });
}

export async function stopAgent() {
  await authorized("/agent/stop", { tab: studioTabId() });
}

export async function newAgentChat() {
  generation += 1;
  set({ items: [], busy: false, error: null });
  await authorized("/agent/reset", { tab: studioTabId() });
}

/** The server's events for this tab, from the moment the Studio starts (StudioApp); the returned function stops them. */
export function startAgentEvents(): () => void {
  const hot = import.meta.hot;
  if (!hot) return () => {};
  const onEvent = (data: { tab?: string; event?: AgentEvent }) => {
    if (!data?.event || data.tab !== studioTabId()) return;
    const event = data.event;
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

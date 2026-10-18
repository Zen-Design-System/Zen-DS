import { useSyncExternalStore } from "react";
import { cachedPage } from "../builder/store/pageStore";
import { studioStore } from "../store";
import { runTool } from "./tools";

/*
 * The Studio MCP in the tab (spec docs/research/studio-mcp-canvas-2026-10-15.md §4.2–4.3, M0). AI clients call the dev
 * server's /__zen-studio/mcp (tools/studio/mcp/server.mjs); the server relays each call here over Vite's HMR socket
 * (zen-mcp:call) and this tab runs it (tools.ts) and answers (zen-mcp:result). The tab tells the server who it is and
 * what it shows (zen-mcp:hello / zen-mcp:state), so a call goes to the tab the person last used.
 * The person's switch: Stop (AiChip) refuses every call until Resume. Dev server only: a build has no HMR socket.
 */

export type AiActivity = {
  /** The person pressed Stop: every call is refused until Resume. */
  stopped: boolean;
  /** The MCP client that called last ("claude-code"), once one has called in this tab. */
  client: string | null;
  /** Calls running now. */
  busy: number;
  /** When the last call ended. */
  lastAt: number | null;
};

const TAB_KEY = "zen-studio:mcp-tab";
const STOP_KEY = "zen-studio:mcp-stopped";

const readSession = (key: string) => { try { return window.sessionStorage.getItem(key); } catch { return null; } };
const writeSession = (key: string, value: string | null) => {
  try {
    if (value === null) window.sessionStorage.removeItem(key);
    else window.sessionStorage.setItem(key, value);
  } catch {
    // Private mode: the tab gets a new id on reload, Stop is forgotten on reload.
  }
};

let activity: AiActivity = { stopped: readSession(STOP_KEY) === "1", client: null, busy: 0, lastAt: null };
const listeners = new Set<() => void>();
const setActivity = (next: Partial<AiActivity>) => {
  activity = { ...activity, ...next };
  listeners.forEach((listener) => listener());
};
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };

/** What the AI is doing in this tab (AiChip). */
export function useAiActivity(): AiActivity {
  return useSyncExternalStore(subscribe, () => activity, () => activity);
}

/** Stop (true) refuses every AI call until Resume (false); kept for this tab's session. */
export function setAiStopped(stopped: boolean) {
  writeSession(STOP_KEY, stopped ? "1" : null);
  setActivity({ stopped });
}

/** This tab's id: the same across reloads of the tab, another in a new tab (the relay's and Zen Agent's key). */
export function studioTabId(): string {
  const kept = readSession(TAB_KEY);
  if (kept) return kept;
  const id = `tab-${Math.random().toString(36).slice(2, 10)}`;
  writeSession(TAB_KEY, id);
  return id;
}

type Call = { id: number; tool: string; args?: Record<string, unknown>; client?: string | null };

/** Starts answering the relay; the returned function stops it. Nothing happens without Vite's HMR socket (a build). */
export function startMcpRuntime(): () => void {
  const hot = import.meta.hot;
  if (!hot) return () => {};
  const tab = studioTabId();
  const snapshot = () => {
    const state = studioStore.getState();
    return {
      tab,
      page: state.page,
      localPage: state.localPage,
      title: state.localPage ? cachedPage(state.localPage)?.title ?? null : null,
      role: state.role,
      stopped: activity.stopped,
      focused: document.hasFocus(),
      visible: document.visibilityState === "visible",
    };
  };
  let sent = "";
  let timer: number | undefined;
  const sendState = () => {
    const data = snapshot();
    const key = JSON.stringify(data);
    if (key === sent) return;
    sent = key;
    hot.send("zen-mcp:state", data);
  };
  const soon = () => { window.clearTimeout(timer); timer = window.setTimeout(sendState, 200); };
  const hello = () => { const data = snapshot(); sent = JSON.stringify(data); hot.send("zen-mcp:hello", data); };
  const bye = () => hot.send("zen-mcp:bye", { tab });

  const onCall = async (call: Call) => {
    if (!call || typeof call.id !== "number") return;
    if (activity.stopped) {
      hot.send("zen-mcp:result", { id: call.id, ok: false, code: "stopped", error: "The person pressed Stop on the AI chip in Zen Studio: wait until they press Resume, then call again." });
      return;
    }
    setActivity({ client: call.client ?? activity.client ?? "AI", busy: activity.busy + 1 });
    try {
      const answer = await runTool(call.tool, call.args ?? {}, { tab });
      hot.send("zen-mcp:result", { id: call.id, ...answer });
    } catch (error) {
      hot.send("zen-mcp:result", { id: call.id, ok: false, code: "error", error: `The Studio failed on this call: ${error instanceof Error ? error.message : String(error)}` });
    } finally {
      setActivity({ busy: Math.max(0, activity.busy - 1), lastAt: Date.now() });
    }
  };

  hello();
  hot.on("vite:ws:connect", hello);
  hot.on("zen-mcp:call", onCall);
  const offStore = studioStore.subscribe(soon);
  const offActivity = subscribe(soon);
  window.addEventListener("focus", soon);
  window.addEventListener("blur", soon);
  document.addEventListener("visibilitychange", soon);
  window.addEventListener("pagehide", bye);
  return () => {
    hot.off?.("vite:ws:connect", hello);
    hot.off?.("zen-mcp:call", onCall);
    offStore();
    offActivity();
    window.removeEventListener("focus", soon);
    window.removeEventListener("blur", soon);
    document.removeEventListener("visibilitychange", soon);
    window.removeEventListener("pagehide", bye);
    window.clearTimeout(timer);
    bye();
  };
}

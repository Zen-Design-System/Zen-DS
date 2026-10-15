// The Studio MCP's relay (spec docs/research/studio-mcp-canvas-2026-10-15.md §4.3): the open Studio tabs, and the calls
// sent to one of them over the dev server's HMR WebSocket (Vite's `server.ws` ↔ `import.meta.hot` in the tab).
//
//   tab → server   zen-mcp:hello  { tab, page, localPage, title, role, stopped, focused, visible }   on start and reconnect
//                  zen-mcp:state  (the same fields)                                                every change
//                  zen-mcp:result { id, ok, content } | { id, ok: false, code, error }
//                  zen-mcp:bye    { tab }                                                          on pagehide
//   server → tab   zen-mcp:call   { id, tool, args, client }
//
// The tab a call goes to: the one named by `tab`, else the most recently focused visible tab, else the most recently
// seen one. Pure apart from the timers: `attachRelay(ws, relay)` wires it to a Vite WebSocket server (or a fake one in
// mcp.selftest.mjs).

const CALL_TIMEOUT = 20_000;

export class RelayError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

export function createRelay({ timeout = CALL_TIMEOUT, now = () => Date.now() } = {}) {
  /** tab id → { tab, client, state, seenAt, focusedAt } */
  const tabs = new Map();
  /** call id → { tab, resolve, reject, timer } */
  const pending = new Map();
  let nextId = 1;

  const fail = (id, error) => {
    const call = pending.get(id);
    if (!call) return;
    pending.delete(id);
    clearTimeout(call.timer);
    call.reject(error);
  };

  const remember = (data, client) => {
    if (!data || typeof data.tab !== "string" || !data.tab) return;
    const at = now();
    const previous = tabs.get(data.tab);
    const state = { page: data.page ?? null, localPage: data.localPage ?? null, title: data.title ?? null, role: data.role ?? null, stopped: Boolean(data.stopped), focused: Boolean(data.focused), visible: data.visible !== false };
    tabs.set(data.tab, { tab: data.tab, client, state, seenAt: at, focusedAt: state.focused ? at : previous?.focusedAt ?? 0 });
  };

  const drop = (tab, reason) => {
    tabs.delete(tab);
    for (const [id, call] of pending) if (call.tab === tab) fail(id, new RelayError("tab-gone", reason));
  };

  return {
    hello: remember,
    state: remember,
    bye(data) { if (data && typeof data.tab === "string") drop(data.tab, "The Studio tab closed while it ran this call"); },
    /** A socket closed: every tab it carried is gone (a reload says hello again on its new socket). */
    disconnect(client) {
      for (const [tab, entry] of tabs) if (sameClient(entry.client, client)) drop(tab, "The Studio tab reloaded or closed while it ran this call");
    },
    result(data) {
      const call = data && pending.get(data.id);
      if (!call) return;
      pending.delete(data.id);
      clearTimeout(call.timer);
      call.resolve(data);
    },
    /** The open tabs, most recently focused first. */
    tabs() {
      return [...tabs.values()].sort((a, b) => b.focusedAt - a.focusedAt || b.seenAt - a.seenAt).map(({ tab, state, seenAt }) => ({ tab, ...state, seenAt }));
    },
    /** Which tab a call goes to (null: no Studio tab is open). */
    target(tab) {
      if (tab) return tabs.get(tab) ?? null;
      const list = [...tabs.values()];
      const visible = list.filter((entry) => entry.state.visible);
      const pick = (entries) => entries.sort((a, b) => b.focusedAt - a.focusedAt || b.seenAt - a.seenAt)[0] ?? null;
      return pick(visible) ?? pick(list);
    },
    /** Sends `tool` to a tab and waits for its answer: { ok, content } or { ok: false, code, error }. */
    call(tool, args, { tab, client } = {}) {
      const entry = this.target(tab);
      if (!entry) {
        return Promise.reject(new RelayError(tab ? "no-tab" : "no-studio", tab
          ? `No open Studio tab has id ${tab}; get_studio_state lists the open tabs`
          : "No Zen Studio tab is open. Ask the person to open the Studio (npm run dev in Zen-DS, then http://127.0.0.1:5173/studio.html) and keep the tab open."));
      }
      const id = nextId++;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => fail(id, new RelayError("timeout", `The Studio tab did not answer within ${Math.round(timeout / 1000)} s${entry.state.visible ? "" : " (the tab is in the background: the browser may have paused it)"}`)), timeout);
        pending.set(id, { tab: entry.tab, resolve, reject, timer });
        try {
          entry.client.send("zen-mcp:call", { id, tool, args: args ?? {}, client: client ?? null });
        } catch (error) {
          fail(id, new RelayError("tab-gone", `The Studio tab could not be reached: ${error?.message ?? error}`));
        }
      });
    },
    /** For the selftest: calls still waiting. */
    pendingCount: () => pending.size,
  };
}

const sameClient = (a, b) => a === b || (a?.socket !== undefined && a.socket === b?.socket);

/** Wires the relay to Vite's WebSocket server: the tab's events in, a closed socket drops its tabs. */
export function attachRelay(ws, relay) {
  ws.on("zen-mcp:hello", (data, client) => relay.hello(data, client));
  ws.on("zen-mcp:state", (data, client) => relay.state(data, client));
  ws.on("zen-mcp:result", (data) => relay.result(data));
  ws.on("zen-mcp:bye", (data) => relay.bye(data));
  ws.on("vite:client:disconnect", (_data, client) => relay.disconnect(client));
}

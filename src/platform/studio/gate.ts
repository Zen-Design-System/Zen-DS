import type { StudioState } from "./types";

/*
 * Why the Studio cannot edit right now, in one place (GĐ1 "Gate", docs/research/studio-builder-plan-2026-10-05.md).
 * Editing needs the dev server (a built site has none), the Admin role, a loopback address (the server hands its write
 * token to localhost only) and a server that can write src/. Each failing condition has a reason the toolbar's Read-only
 * chip shows (`short` is the Inspector status line), with the fix when there is one. Before the first ping answers, the gate is "connecting" (no chip).
 */

export type EditGateReason = "production" | "viewer" | "connecting" | "not-loopback" | "no-server" | "fs-readonly";
export type EditGate =
  | { ok: true }
  | { ok: false; reason: EditGateReason; title: string; detail: string; short: string };

/** The dev server's answer as the Studio keeps it (api.ts ServerState). */
type ServerView = { ready: boolean; writable: boolean; root: string | null };

const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

/** A loopback host: the dev server hands its write token only to these (vite-plugin-zen-studio.mjs loopbackHost). */
export const isLoopbackHost = (hostname: string) => LOOPBACK.has(hostname) || hostname.endsWith(".localhost");

/** The same address on 127.0.0.1 (the page, its query and hash kept). */
export function loopbackUrl(href: string): string {
  const url = new URL(href);
  url.hostname = "127.0.0.1";
  return url.toString();
}

export function editGate(state: Pick<StudioState, "role"> & Partial<Pick<StudioState, "localPage">>, server: ServerView, env: { dev: boolean; hostname: string }): EditGate {
  // A builder page lives in this browser (Studio builder GĐ2): only the role decides, on any host and in a build.
  if (state.localPage) return state.role === "viewer" ? { ok: false, reason: "viewer", short: "View only — switch to Admin to edit", title: "You are viewing as Viewer", detail: "Viewers see the page but change nothing. Switch to Admin to edit." } : { ok: true };
  if (!env.dev) return { ok: false, reason: "production", short: "Read-only — editing needs the Studio dev server", title: "This is a built site", detail: "Editing writes the source files through the Studio dev server. Run `npm run dev` in Zen-DS and open the Studio on localhost." };
  if (state.role === "viewer") return { ok: false, reason: "viewer", short: "View only — switch to Admin to edit", title: "You are viewing as Viewer", detail: "Viewers see the canvas and the drafts but change nothing. Switch to Admin to edit." };
  if (!isLoopbackHost(env.hostname)) return { ok: false, reason: "not-loopback", short: "Read-only — open the Studio on localhost or 127.0.0.1 to edit", title: `Opened on ${env.hostname}`, detail: "The Studio writes source files only when it is opened on localhost or 127.0.0.1 (the dev server keeps its write token there)." };
  if (!server.ready) return { ok: false, reason: "connecting", short: "Connecting to the Studio dev server…", title: "Connecting to the Studio dev server…", detail: "" };
  if (server.root === null) return { ok: false, reason: "no-server", short: "Read-only — no Studio dev server answers", title: "No Studio dev server answers", detail: "Start it with `npm run dev` in Zen-DS (port 5173), then reload." };
  if (!server.writable) return { ok: false, reason: "fs-readonly", short: "Read-only — the dev server cannot write src/", title: "The dev server cannot write src/", detail: "The files under Zen-DS/src are read-only for the dev server on this machine." };
  return { ok: true };
}

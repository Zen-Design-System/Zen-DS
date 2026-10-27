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
  if (state.localPage) return state.role === "viewer" ? { ok: false, reason: "viewer", short: "View only", title: "You can view only", detail: "You see the page but can't change it. Switch to Can edit to make changes." } : { ok: true };
  if (!env.dev) return { ok: false, reason: "production", short: "View only — editing needs the Studio server", title: "This is a built site", detail: "Changes can't be saved here — open the Studio on the computer that runs it." };
  if (state.role === "viewer") return { ok: false, reason: "viewer", short: "View only", title: "You can view only", detail: "You see the canvas and its unsaved changes but can't change them. Switch to Can edit to make changes." };
  if (!isLoopbackHost(env.hostname)) return { ok: false, reason: "not-loopback", short: "View only — open the Studio on localhost or 127.0.0.1 to edit", title: `Opened on ${env.hostname}`, detail: "The Studio saves changes only when it is opened on localhost or 127.0.0.1." };
  if (!server.ready) return { ok: false, reason: "connecting", short: "Connecting to the Studio server…", title: "Connecting to the Studio server…", detail: "" };
  if (server.root === null) return { ok: false, reason: "no-server", short: "View only — no Studio server answers", title: "No Studio server answers", detail: "Start the Studio server, then reload." };
  if (!server.writable) return { ok: false, reason: "fs-readonly", short: "View only — the Studio server can't save on this computer", title: "The Studio server can't save on this computer", detail: "Its files are read-only here." };
  return { ok: true };
}

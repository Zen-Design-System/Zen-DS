// Zen Studio E2E: the harness's own Vite dev server (studio.html + the Studio plugin), on a port of its own (5190–5199)
// with its own optimizer cache. The Studio plugin keeps drafts per port (node_modules/.cache/zen-studio/drafts-<port>.json),
// so the fixture drafts this server holds never reach the shared 5173 / 5180 servers, and their "Save all" never
// reaches ours. The drafts file is deleted before the server starts and after it stops: a crashed run never comes back.
import fs from "node:fs";
import net from "node:net";
import path from "node:path";

export const E2E_HOST_ALIAS = "studio-e2e.test";
const DRAFTS_DIR = "node_modules/.cache/zen-studio";

/** A free TCP port on 127.0.0.1 in [from, to], or null. */
async function freePort(from, to) {
  for (let port = from; port <= to; port += 1) {
    const ok = await new Promise((resolve) => {
      const probe = net.createServer();
      probe.once("error", () => resolve(false));
      probe.listen(port, "127.0.0.1", () => probe.close(() => resolve(true)));
    });
    if (ok) return port;
  }
  return null;
}

const draftsFileOf = (root, port) => path.join(root, DRAFTS_DIR, `drafts-${port}.json`);
/** The builder pages folder of this server (never the repo's .zen-studio/pages/), emptied before and after a run. */
export const pagesDirOf = (port) => `${DRAFTS_DIR}/e2e-pages-${port}/pages`;
/** Where this server's Promote writes templates (never the repo's src/templates/studio), emptied before a run. */
export const promoteDirOf = (port) => `${DRAFTS_DIR}/e2e-promote-${port}/src/templates/studio`;

/**
 * The watcher's `ignored` for a run that must not catch peers' edits (2026-10-08): under src/ and tools/ only the files
 * the harness writes (`watched`, repo-relative) and the folders on their way are watched; a peer's edit to a Studio
 * module no longer hot-updates (or restarts) the run's server mid-row. Drafts reach the canvas through the plugin's own
 * reload, not the watcher, so nothing the rows do needs more.
 */
export function peerIgnore(root, watched) {
  const posix = (value) => value.split(path.sep).join("/");
  const files = new Set(watched.map((rel) => posix(path.join(root, rel))));
  const dirs = new Set();
  for (const file of files) for (let dir = path.posix.dirname(file); dir.length > posix(root).length; dir = path.posix.dirname(dir)) dirs.add(dir);
  const guardedTrees = ["src", "tools"].map((top) => `${posix(root)}/${top}`);
  return (target) => {
    const abs = posix(path.resolve(target));
    if (!guardedTrees.some((tree) => abs === tree || abs.startsWith(`${tree}/`))) return false;
    return !(files.has(abs) || dirs.has(abs) || guardedTrees.includes(abs));
  };
}

/**
 * Starts the harness server. `port` pins one port (fails when busy); otherwise the first free one in 5190–5199.
 * `watchOnly` (repo-relative files): watch just those under src/ and tools/ (peerIgnore); unset: the whole tree.
 * Returns { url, port, close }.
 */
export async function startServer(root, { port: wanted, watchOnly } = {}) {
  const port = wanted ?? (await freePort(5190, 5199));
  if (!port) throw new Error("No free port in 5190–5199 for the Studio E2E server");
  fs.rmSync(draftsFileOf(root, port), { force: true });
  fs.rmSync(path.join(root, pagesDirOf(port), ".."), { recursive: true, force: true });
  process.env.ZEN_STUDIO_PAGES_DIR = pagesDirOf(port);
  fs.rmSync(path.join(root, `${DRAFTS_DIR}/e2e-promote-${port}`), { recursive: true, force: true });
  process.env.ZEN_STUDIO_PROMOTE_DIR = promoteDirOf(port);
  const { createServer, createLogger } = await import("vite");
  // Vite's errors (failed hot updates forwarded from the page included) are collected for the report, not printed.
  const errors = [];
  const base = createLogger("error", { allowClearScreen: false });
  const customLogger = { ...base, error(message, options) { errors.push(String(message).split("\n")[0].replace(/\x1b\[[0-9;]*m/g, "")); }, warn() {}, warnOnce() {}, info() {} };
  const server = await createServer({
    customLogger,
    root,
    configFile: path.join(root, "vite.studio.config.ts"),
    clearScreen: false,
    // Its own cache: re-optimizing the shared node_modules/.vite or .vite-studio would reload the other servers' pages.
    cacheDir: "node_modules/.vite-studio-e2e",
    server: {
      port,
      strictPort: true,
      host: "127.0.0.1",
      // The read-only gate row opens the Studio on a non-loopback name (mapped to 127.0.0.1 by Chromium).
      allowedHosts: [E2E_HOST_ALIAS],
      // No HMR overlay: a fixture error must show as a failed row, not cover the canvas.
      hmr: { overlay: false },
      watch: { ignored: ["**/.qa/**", "**/backups/**", "**/dist*/**", ...(watchOnly ? [peerIgnore(root, watchOnly)] : [])] },
    },
  });
  await server.listen();
  const url = `http://127.0.0.1:${port}`;
  return {
    url,
    port,
    /** Vite errors since the start (failed hot updates included). */
    errors,
    async close() {
      await server.close();
      fs.rmSync(draftsFileOf(root, port), { force: true });
      fs.rmSync(path.join(root, pagesDirOf(port), ".."), { recursive: true, force: true });
    },
  };
}

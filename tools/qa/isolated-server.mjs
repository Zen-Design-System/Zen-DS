// Build-QA gate: a private Vite dev server for the browser steps (`npm run qa -- --isolated`, and the fallback when the
// shared dev server does not answer). Port 5200–5209, its own optimizer cache, no file watcher and no HMR: the pages are
// served from the disk as it is when they load, so other sessions' edits never hot-reload a page mid-audit, and the
// Studio plugin's drafts are per port (none here), so a run never measures someone's unsaved Studio edits.
//
// The server runs in a child process of its own (`node isolated-server.mjs --serve`): the gate runs some steps with
// spawnSync, which blocks its event loop, and an in-process server could not answer the browser meanwhile.
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DRAFTS_DIR = "node_modules/.cache/zen-studio";
const SELF = fileURLToPath(import.meta.url);

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

/** In the child: start Vite, warm the app entry, print `READY <url>`, stop on SIGTERM or when the parent goes away. */
async function serve(root) {
  const port = await freePort(5200, 5209);
  if (!port) { process.stdout.write("FAIL no free port in 5200–5209\n"); process.exit(1); }
  const drafts = path.join(root, DRAFTS_DIR, `drafts-${port}.json`);
  fs.rmSync(drafts, { force: true });
  const { createServer, createLogger } = await import("vite");
  const base = createLogger("error", { allowClearScreen: false });
  const customLogger = { ...base, error() {}, warn() {}, warnOnce() {}, info() {} };
  const server = await createServer({
    customLogger,
    root,
    configFile: path.join(root, "vite.config.ts"),
    clearScreen: false,
    // Its own cache: re-optimising the shared node_modules/.vite would reload the shared server's pages.
    cacheDir: "node_modules/.vite-qa",
    server: { port, strictPort: true, host: "127.0.0.1", hmr: false, watch: null },
  });
  await server.listen();
  const url = `http://127.0.0.1:${port}`;
  try {
    await server.warmupRequest?.("/src/main.tsx");
    await server.waitForRequestsIdle?.();
  } catch { /* the first page load warms it instead */ }
  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    await server.close().catch(() => undefined);
    fs.rmSync(drafts, { force: true });
    process.exit(0);
  };
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
  process.stdin.on("end", stop); // the gate exited without stopping us
  process.stdin.resume();
  process.stdout.write(`READY ${url}\n`);
}

/** In the gate: start the child server and wait for its URL. Returns { url, close }. */
export async function startIsolatedServer(root, { timeout = 90000 } = {}) {
  const child = spawn(process.execPath, [SELF, "--serve", root], { cwd: root, stdio: ["pipe", "pipe", "ignore"] });
  const url = await new Promise((resolve, reject) => {
    let buffer = "";
    const timer = setTimeout(() => { child.kill("SIGTERM"); reject(new Error(`no answer within ${timeout / 1000}s`)); }, timeout);
    child.stdout.on("data", (chunk) => {
      buffer += chunk;
      const line = buffer.split("\n").find((l) => /^(READY|FAIL) /.test(l));
      if (!line) return;
      clearTimeout(timer);
      if (line.startsWith("READY ")) resolve(line.slice(6).trim());
      else reject(new Error(line.slice(5)));
    });
    child.once("exit", (code) => { clearTimeout(timer); reject(new Error(`server exited (${code})`)); });
  });
  return {
    url,
    async close() {
      if (child.exitCode !== null) return;
      const exited = new Promise((resolve) => child.once("exit", resolve));
      child.kill("SIGTERM");
      await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 5000))]);
      if (child.exitCode === null) child.kill("SIGKILL");
    },
  };
}

/**
 * The dev server a platform tool (platform:audit, platform:shoot, visual-diff) measures: `--url`, else the shared :5173,
 * else with `isolated` a private server like the gate's. On the shared :5173 it says so, since other sessions' hot reloads
 * and unsaved Zen Studio drafts can change what the tool sees (BACKLOG Tooling 2c, the user 2026-10-24: warn, keep the
 * default). Returns { base, close }.
 */
export async function toolServer(root, { url, isolated = false, tool }) {
  if (isolated && !url) {
    const server = await startIsolatedServer(root);
    process.stderr.write(`${tool}: private dev server ${server.url} (--isolated): no HMR from other sessions, no Studio drafts\n`);
    return { base: server.url, close: server.close };
  }
  const base = String(url ?? "http://localhost:5173").replace(/\/$/, "");
  if (/^https?:\/\/(localhost|127\.0\.0\.1):5173$/.test(base)) {
    process.stderr.write(`${tool}: measuring the shared dev server ${base}; other sessions' hot reloads and unsaved Zen Studio drafts can change what it sees. Pass --isolated for a private server (as the gate).\n`);
  }
  return { base, close: async () => {} };
}

if (process.argv[2] === "--serve") await serve(process.argv[3] ?? process.cwd());

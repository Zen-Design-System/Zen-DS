// Zen Studio E2E: the Node side of /__zen-studio/* on the harness server. It seeds and resets the fixture drafts and
// reads the source the UI wrote. It never sends an Origin header (checkOrigin lets that pass) and uses the admin role
// and the token /ping hands to a loopback caller, as the Studio page does.
import { sha1 } from "../../jsx-source.mjs";

const PREFIX = "/__zen-studio";

export function studioApi(baseUrl) {
  let token = null;

  /** A peer's edit to tools/studio/*.mjs restarts the dev server with a new token: ping again and retry once. */
  async function call(method, route, options = {}) {
    for (let tries = 0; ; tries += 1) {
      try {
        return await attempt(method, route, options);
      } catch (error) {
        // While the server restarts, requests fail at the socket ("fetch failed"): wait for it, up to ~15 s.
        if (error instanceof TypeError && tries < 30) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          token = null;
          continue;
        }
        if (error.status === 403 && /token/i.test(error.message) && tries < 2) {
          token = null;
          continue;
        }
        throw error;
      }
    }
  }

  async function attempt(method, route, { query, body, write = false } = {}) {
    const url = new URL(`${PREFIX}${route}`, baseUrl);
    for (const [key, value] of Object.entries(query ?? {})) url.searchParams.set(key, String(value));
    const headers = {};
    if (body !== undefined) headers["content-type"] = "application/json";
    if (write || route === "/drafts") {
      if (!token) await ping();
      headers["x-zen-studio-token"] = token;
      if (write) headers["x-zen-studio-role"] = "admin";
    }
    const res = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const json = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status} (not JSON)` }));
    if (!res.ok || json.ok === false) {
      const error = new Error(`${method} ${route}: ${json.error ?? res.status}`);
      error.code = json.code;
      error.status = res.status;
      throw error;
    }
    return json;
  }

  async function ping() {
    const json = await call("GET", "/ping");
    token = json.token;
    if (!token) throw new Error("The Studio server gave no token (not a loopback host?)");
    return json;
  }

  /** The effective text of a file: { content, hash, draft? }. */
  const source = (file) => call("GET", "/source", { query: { file } });

  return {
    ping,
    source,
    element: (file, loc) => call("GET", "/element", { query: { file, loc } }),
    edit: (file, loc, name, ops) => call("POST", "/edit", { body: { file, loc, name, ops }, write: true }),
    drafts: () => call("GET", "/drafts"),
    save: (files) => call("POST", "/save", { body: { files }, write: true }),
    discard: (files) => call("POST", "/discard", { body: files ? { files } : {}, write: true }),
    /** Replaces the effective text of `file` with `content` (a draft; the disk is untouched). */
    async put(file, content) {
      const current = await source(file);
      if (current.content === content) return current;
      return call("POST", "/write", { body: { file, content, expectHash: current.hash }, write: true });
    },
    sha1,
  };
}

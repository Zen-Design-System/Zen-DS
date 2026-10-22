// Open on phone (user, 2026-10-21: "có thể làm trong Studio được không?", then "Tương tác (Play)"): Play hands its page
// here (POST /__zen-studio/device/share, the Studio's token) and gets a link with a random share token; a phone on the same
// Wi-Fi opens it and plays the page on its own browser engine (device.html, src/platform/studio/device/).
//
// The dev server stays on localhost. A small proxy on this machine's network addresses forwards to it only what the
// device page needs, only to a browser that opened a live share's link (GET /d/<token> sets a cookie), and with a
// loopback Host, as Vite and the Studio API expect:
// - GET and HEAD of the module graph (/src, tools/studio's modules, /node_modules, /@vite, /@id, /@fs, /@react-refresh), device.html, and the
//   share's own route (GET /__zen-studio/device/page); Vite's HMR socket;
// - nothing that writes, no other /__zen-studio route, never the builder pages folder (.zen-studio).
// A share lives SHARE_TTL; the proxy closes once no share is left, and with the dev server.
import { randomBytes } from "node:crypto";
import http from "node:http";
import net from "node:net";
import os from "node:os";

export const DEVICE_PAGE = "/device.html";
export const DEVICE_ROUTES = new Set(["/device/share", "/device/page"]);
export const SHARE_TTL = 2 * 60 * 60 * 1000;
const MAX_SHARES = 20;
const MAX_TEXT = 2 * 1024 * 1024;
const MAX_THEME_CSS = 256 * 1024;
const MAX_UPLOAD_DATA = 6 * 1024 * 1024;
/** The project's other pages a share carries (their components' instances draw on the phone). */
const MAX_PAGES = 100;
const MAX_PAGES_TEXT = 4 * 1024 * 1024;
const PAGE_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
const COOKIE = "zen-device";
const TOKEN = /^[\w-]{16,64}$/;
/** What the device page loads, beside the share's own route (the page engine and renderer read tools/studio modules). */
const ALLOWED = [/^\/device\.html$/, /^\/src\//, /^\/tools\/studio\/[\w.-]+\.mjs$/, /^\/node_modules\//, /^\/@vite\//, /^\/@react-refresh$/, /^\/@id\//, /^\/@fs\//, /^\/__vite_ping$/, /^\/__zen-studio\/device\/page$/];

/** Shares by token, each until its `expires` (the oldest goes first past MAX_SHARES). */
export function shareStore({ now = Date.now, ttl = SHARE_TTL } = {}) {
  const shares = new Map();
  const prune = () => {
    const time = now();
    for (const [key, entry] of shares) if (entry.expires <= time) shares.delete(key);
  };
  return {
    add(payload) {
      prune();
      while (shares.size >= MAX_SHARES) shares.delete(shares.keys().next().value);
      const token = randomBytes(18).toString("base64url");
      const entry = { payload, expires: now() + ttl };
      shares.set(token, entry);
      return { token, expires: entry.expires };
    },
    get(token) {
      prune();
      return typeof token === "string" && TOKEN.test(token) ? shares.get(token) ?? null : null;
    },
    get size() {
      prune();
      return shares.size;
    },
  };
}

/** A share's body checked (the page's text, title, first Screen, preview modes, project theme, uploaded photos), or an Error. */
export function sharePayload(body) {
  const text = body?.text;
  if (typeof text !== "string" || !text.trim() || text.length > MAX_TEXT) return new Error("Send the page's `text` (up to 2 MB)");
  const string = (value, fallback = "") => (typeof value === "string" ? value : fallback);
  const themeCss = string(body.themeCss);
  if (themeCss.length > MAX_THEME_CSS) return new Error("The project theme is too large to share");
  const uploads = Array.isArray(body.uploads) ? body.uploads : [];
  let size = 0;
  const photos = [];
  for (const upload of uploads) {
    if (!upload || typeof upload.id !== "string" || typeof upload.data !== "string" || !/^image\/[\w.+-]+$/.test(String(upload.type))) return new Error("Each upload is { id, name, type, data }");
    size += upload.data.length;
    if (size > MAX_UPLOAD_DATA) return new Error("The page's photos are too large to share (over 6 MB)");
    photos.push({ id: upload.id, name: string(upload.name, upload.id), type: upload.type, data: upload.data });
  }
  const modes = body.modes && typeof body.modes === "object" && !Array.isArray(body.modes) ? Object.fromEntries(Object.entries(body.modes).filter(([, value]) => typeof value === "string")) : {};
  const id = typeof body.id === "string" && PAGE_ID.test(body.id) ? body.id : null;
  const given = body.pages && typeof body.pages === "object" && !Array.isArray(body.pages) ? Object.entries(body.pages) : [];
  if (given.length > MAX_PAGES || given.some(([page, value]) => !PAGE_ID.test(page) || typeof value !== "string")) return new Error(`pages is up to ${MAX_PAGES} page ids → their text`);
  if (given.reduce((sum, [, value]) => sum + value.length, 0) > MAX_PAGES_TEXT) return new Error("The project's pages are too large to share (over 4 MB)");
  const pages = Object.fromEntries(given);
  return { title: string(body.title, "Untitled"), text, start: typeof body.start === "string" && body.start ? body.start : null, modes, brand: string(body.brand, "zen"), themeCss, uploads: photos, ...(id ? { id } : {}), ...(given.length ? { pages } : {}) };
}

/** This machine's IPv4 addresses a phone on the same network can reach: Wi-Fi and Ethernet first, virtual adapters last. */
export function lanAddresses(interfaces = os.networkInterfaces()) {
  const found = [];
  for (const [name, list] of Object.entries(interfaces)) {
    for (const entry of list ?? []) if (entry.family === "IPv4" && !entry.internal && !entry.address.startsWith("169.254.")) found.push({ name, address: entry.address });
  }
  const rank = (name) => (/^(en|eth|wlan|wlp)\d/.test(name) ? 0 : 1);
  return found.sort((a, b) => rank(a.name) - rank(b.name)).map((entry) => entry.address);
}

/** The path and query a proxied request may reach (dot segments resolved), or null. */
export function allowedPath(raw) {
  if (typeof raw !== "string" || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\") || /%(?:2f|5c|00)/i.test(raw)) return null;
  let url;
  try {
    url = new URL(raw, "http://device.invalid");
  } catch {
    return null;
  }
  let decoded;
  try {
    decoded = decodeURIComponent(url.pathname);
  } catch {
    return null;
  }
  if (/\/\.(?:zen-studio|env)(?:[/.]|$)/.test(decoded) || decoded.split("/").includes("..")) return null;
  return ALLOWED.some((pattern) => pattern.test(url.pathname)) ? `${url.pathname}${url.search}` : null;
}

/** The share token a request's cookie carries, or null. */
export function cookieToken(header) {
  for (const part of String(header ?? "").split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === COOKIE) return rest.join("=");
  }
  return null;
}

/**
 * The network proxy (on every address, `port` or a free one) in front of the dev server on loopback `target`. GET
 * /d/<token> sets that share's cookie and opens the device page; every other request needs a live share's cookie and an
 * allowed path. Resolves { port, close }.
 */
export function startDeviceProxy({ target, shares, port = 0, host = "0.0.0.0" }) {
  const loopback = `localhost:${target}`;
  const live = (req) => Boolean(shares.get(cookieToken(req.headers.cookie)));
  // The dev server sees a page of its own: a loopback Host (Vite's allowed hosts, the Studio API's checks), its Origin.
  const headersFor = (req) => {
    const headers = { ...req.headers, host: loopback };
    if (headers.origin) headers.origin = `http://${loopback}`;
    delete headers.referer;
    return headers;
  };
  const server = http.createServer((req, res) => {
    const deny = (status, text) => {
      res.writeHead(status, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" });
      res.end(text);
    };
    const open = /^\/d\/([\w-]+)$/.exec(String(req.url ?? "").split("?")[0]);
    if (open) {
      const entry = shares.get(open[1]);
      if (!entry) return deny(404, "This link has expired. Share the page again from Zen Studio (Play, Open on phone).");
      const seconds = Math.max(1, Math.ceil((entry.expires - Date.now()) / 1000));
      res.writeHead(302, { location: `${DEVICE_PAGE}?t=${open[1]}`, "set-cookie": `${COOKIE}=${open[1]}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${seconds}`, "cache-control": "no-store" });
      return res.end();
    }
    if (req.method !== "GET" && req.method !== "HEAD") return deny(405, "Read only");
    if (!live(req)) return deny(403, "Open the link Zen Studio shows first.");
    const path = allowedPath(req.url);
    if (!path) return deny(403, "Not part of the shared page");
    const upstream = http.request({ host: "127.0.0.1", port: target, method: req.method, path, headers: headersFor(req) }, (answer) => {
      res.writeHead(answer.statusCode ?? 502, answer.headers);
      answer.pipe(res);
    });
    upstream.on("error", () => { if (!res.headersSent) deny(502, "The Zen dev server did not answer"); else res.destroy(); });
    req.pipe(upstream);
  });
  // Vite's HMR socket: without it the client keeps trying to reach the dev server.
  server.on("upgrade", (req, socket, head) => {
    const protocol = String(req.headers["sec-websocket-protocol"] ?? "");
    if (!live(req) || !/^vite-(?:hmr|ping)$/.test(protocol) || String(req.url ?? "").split("?")[0] !== "/") { socket.destroy(); return; }
    const upstream = net.connect(target, "127.0.0.1", () => {
      const lines = Object.entries(headersFor(req)).flatMap(([name, value]) => (Array.isArray(value) ? value : [value]).map((item) => `${name}: ${item}`));
      upstream.write(`GET ${req.url} HTTP/1.1\r\n${lines.join("\r\n")}\r\n\r\n`);
      if (head?.length) upstream.write(head);
      upstream.pipe(socket);
      socket.pipe(upstream);
    });
    const end = () => { upstream.destroy(); socket.destroy(); };
    upstream.on("error", end);
    socket.on("error", end);
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      const address = server.address();
      resolve({ port: typeof address === "object" && address ? address.port : port, close: () => new Promise((done) => { server.closeAllConnections?.(); server.close(() => done()); }) });
    });
  });
}

/**
 * The /device/* routes of the Studio dev server (`port()`: its own). `handle(route, body, url)` answers { status, body };
 * the plugin checks the Studio token on POST /device/share first.
 */
export function devicePreview({ port, addresses = lanAddresses, now = Date.now }) {
  const shares = shareStore({ now });
  let proxy = null;
  let sweep = null;
  const stop = async () => {
    clearInterval(sweep);
    sweep = null;
    const running = proxy;
    proxy = null;
    if (running) await (await running).close();
  };
  const ensureProxy = () => {
    proxy ??= startDeviceProxy({ target: port(), shares }).catch((error) => { proxy = null; throw error; });
    // The proxy goes once every share has expired.
    sweep ??= setInterval(() => { if (!shares.size) void stop(); }, 60_000);
    sweep.unref?.();
    return proxy;
  };
  return {
    async handle(route, body, url) {
      if (route === "POST /device/share") {
        const payload = sharePayload(body);
        if (payload instanceof Error) return { status: 400, body: { ok: false, code: "invalid", error: payload.message } };
        const { token, expires } = shares.add(payload);
        let network;
        try {
          network = await ensureProxy();
        } catch (error) {
          return { status: 200, body: { ok: true, urls: [], local: `http://localhost:${port()}${DEVICE_PAGE}?t=${token}`, expires, warning: `The network link could not open (${error?.message ?? error})` } };
        }
        const urls = addresses().map((address) => `http://${address}:${network.port}/d/${token}`);
        return { status: 200, body: { ok: true, urls, local: `http://localhost:${port()}${DEVICE_PAGE}?t=${token}`, expires } };
      }
      if (route === "GET /device/page") {
        const entry = shares.get(url.searchParams.get("t"));
        if (!entry) return { status: 404, body: { ok: false, code: "not-found", error: "This shared page has expired. Share it again from Zen Studio." } };
        return { status: 200, body: { ok: true, ...entry.payload, expires: entry.expires } };
      }
      return { status: 405, body: { ok: false, code: "invalid", error: `${route} is not allowed here` } };
    },
    close: stop,
  };
}

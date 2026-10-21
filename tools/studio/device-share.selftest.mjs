#!/usr/bin/env node
// Self-test of Open on phone's server side (tools/studio/device-share.mjs): what the network proxy lets through (paths,
// methods, the share's cookie), the share store's expiry, the share body's checks, and a real proxy in front of a stand-in
// dev server. Run: node tools/studio/device-share.selftest.mjs
import http from "node:http";
import { allowedPath, cookieToken, devicePreview, lanAddresses, sharePayload, shareStore } from "./device-share.mjs";

const failures = [];
let passed = 0;
const check = (label, actual, expected) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
};

// ── Paths ─────────────────────────────────────────────────────────────────────────────────────────────────────────
check("a module", allowedPath("/src/components/Button/Button.tsx?t=1"), "/src/components/Button/Button.tsx?t=1");
check("the device page", allowedPath("/device.html?t=abc"), "/device.html?t=abc");
check("Vite's client", allowedPath("/@vite/client"), "/@vite/client");
check("a prebundled dep", allowedPath("/node_modules/.vite/deps/react.js?v=1"), "/node_modules/.vite/deps/react.js?v=1");
check("a page engine module", allowedPath("/tools/studio/dialect.mjs?import"), "/tools/studio/dialect.mjs?import");
check("no other tools folder", allowedPath("/tools/qa/run.mjs"), null);
check("the share's route", allowedPath("/__zen-studio/device/page?t=abc"), "/__zen-studio/device/page?t=abc");
check("no other Studio route", allowedPath("/__zen-studio/ping"), null);
check("no share writes", allowedPath("/__zen-studio/device/share"), null);
check("dot segments resolve first", allowedPath("/src/../__zen-studio/ping"), null);
check("encoded dot segments resolve too", allowedPath("/src/%2e%2e/__zen-studio/ping"), null);
check("no encoded slash", allowedPath("/src%2f..%2f__zen-studio/ping"), null);
check("no backslash", allowedPath("/src\\..\\x"), null);
check("never the pages folder", allowedPath("/@fs/Users/me/Zen-DS/.zen-studio/pages/a.zen.tsx"), null);
check("never an env file", allowedPath("/@fs/Users/me/Zen-DS/.env.local"), null);
check("not the platform", allowedPath("/index.html"), null);
check("not the Studio page", allowedPath("/studio.html"), null);
check("not ai-ui", allowedPath("/ai-ui/compose"), null);
check("no protocol-relative", allowedPath("//evil.example/x"), null);
check("the cookie", cookieToken("a=1; zen-device=tok-123; b=2"), "tok-123");
check("no cookie", cookieToken(undefined), null);

// ── Shares ────────────────────────────────────────────────────────────────────────────────────────────────────────
let clock = 1_000;
const store = shareStore({ now: () => clock, ttl: 100 });
const { token } = store.add({ text: "x" });
check("a share is found by its token", Boolean(store.get(token)), true);
check("a malformed token finds nothing", store.get("../x"), null);
clock += 101;
check("a share expires", store.get(token), null);
check("the body needs text", sharePayload({}) instanceof Error, true);
check("a share body", sharePayload({ text: "<Board />", title: "Orders", start: "screen-2", modes: { theme: "dark", bad: 1 }, brand: "p-acme", uploads: [{ id: "a.png", type: "image/png", data: "AAAA" }] }), { title: "Orders", text: "<Board />", start: "screen-2", modes: { theme: "dark" }, brand: "p-acme", themeCss: "", uploads: [{ id: "a.png", name: "a.png", type: "image/png", data: "AAAA" }] });
check("an upload must be an image", sharePayload({ text: "x", uploads: [{ id: "a", type: "text/html", data: "" }] }) instanceof Error, true);
check("Wi-Fi first, virtual adapters last", lanAddresses({ bridge100: [{ family: "IPv4", internal: false, address: "192.168.64.1" }], lo0: [{ family: "IPv4", internal: true, address: "127.0.0.1" }], en0: [{ family: "IPv4", internal: false, address: "192.168.1.20" }, { family: "IPv6", internal: false, address: "fe80::1" }], en5: [{ family: "IPv4", internal: false, address: "169.254.3.4" }] }), ["192.168.1.20", "192.168.64.1"]);

// ── A real proxy in front of a stand-in dev server ────────────────────────────────────────────────────────────────
const seen = [];
const upstream = http.createServer((req, res) => {
  seen.push({ path: req.url, host: req.headers.host, origin: req.headers.origin ?? null });
  res.writeHead(200, { "content-type": "text/plain" });
  res.end("ok");
});
await new Promise((resolve) => upstream.listen(0, "127.0.0.1", resolve));
const target = upstream.address().port;
const preview = devicePreview({ port: () => target, addresses: () => ["127.0.0.1"] });
try {
  const shared = await preview.handle("POST /device/share", { text: "<Board />", title: "Orders" }, new URL("http://localhost/"));
  check("a share answers a network link", [shared.status, shared.body.urls.length], [200, 1]);
  const link = new URL(shared.body.urls[0]);
  const base = `http://${link.host}`;
  const opened = await fetch(link, { redirect: "manual" });
  const cookie = (opened.headers.get("set-cookie") ?? "").split(";")[0];
  check("the link sets the share's cookie and opens the device page", [opened.status, opened.headers.get("location")?.startsWith("/device.html?t="), cookie.startsWith("zen-device=")], [302, true, true]);
  const module = await fetch(`${base}/src/a.ts`, { headers: { cookie, origin: base } });
  check("with the cookie a module passes", module.status, 200);
  check("the dev server sees a loopback Host and its own Origin", seen.at(-1), { path: "/src/a.ts", host: `localhost:${target}`, origin: `http://localhost:${target}` });
  check("without the cookie nothing passes", (await fetch(`${base}/src/a.ts`)).status, 403);
  check("another Studio route is refused", (await fetch(`${base}/__zen-studio/ping`, { headers: { cookie } })).status, 403);
  check("the share's route passes", (await fetch(`${base}/__zen-studio/device/page?t=x`, { headers: { cookie } })).status, 200);
  check("nothing writes", (await fetch(`${base}/src/a.ts`, { method: "POST", headers: { cookie }, body: "x" })).status, 405);
  check("an unknown link is refused", (await fetch(`${base}/d/aaaaaaaaaaaaaaaaaaaaaaaa`, { redirect: "manual" })).status, 404);
  const page = await preview.handle("GET /device/page", null, new URL(`http://localhost/?t=${opened.headers.get("location").split("t=")[1]}`));
  check("the phone reads the page back", [page.status, page.body.title, page.body.text], [200, "Orders", "<Board />"]);
} finally {
  await preview.close();
  await new Promise((resolve) => upstream.close(resolve));
}

if (failures.length) {
  console.error(`device-share selftest: ${failures.length} failed, ${passed} passed\n  ✗ ${failures.join("\n  ✗ ")}`);
  process.exit(1);
}
console.log(`✓ device-share selftest: ${passed} checks pass.`);

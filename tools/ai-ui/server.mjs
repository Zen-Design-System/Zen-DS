// Where the compose loop runs: a request handler any Node server mounts (Express, Hono, a Next.js route handler, the
// platform's dev server), and a standalone `node tools/ai-ui/server.mjs` for a quick start. The model function and the
// catalog are the app's; the handler owns the contract the client talks to:
//
//   GET  /status                       → { enabled, model }
//   GET  /catalog                      → tier 1 (text) · ?component=Name → tier 2
//   POST /compose { prompt, data?, state?, history?, components? }   → composeUi's result
//   POST /edit    { prompt, spec, state?, history? }                 → composeEdit's result
//   POST /check   { spec, chrome? }                                  → judge + feedback
//
//   import { createAiUiHandler } from "@zen-ds/react/ai-ui/server";
//   const handle = createAiUiHandler({ model: anthropicModel(), catalog, data: () => ({ slots }) });
//   app.post("/api/ai-ui/:op", async (req, res) => { const r = await handle({ method: req.method, path: req.params.op, body: req.body }); res.status(r.status).json(r.body); });
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { composeEdit, composeUi, feedbackFor, judge, tier1, tier2 } from "./compose.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

/** The shipped catalog (docs/ai-ui/catalog.json), for callers that have no other. */
export function loadCatalog() {
  return JSON.parse(fs.readFileSync(path.join(here, "../../docs/ai-ui/catalog.json"), "utf8"));
}

/**
 * @param {{ model?: Function | null, catalog?: object, modelName?: string, data?: object | ((request: object) => object | Promise<object>), chrome?: boolean, experimental?: boolean, maxAttempts?: number }} options
 *   `model`: the compose loop's model function; null or missing → /compose and /edit answer 503 and /status says
 *   `enabled: false` (the client falls back). `data`: what every request may read with $ref (an object, or a function of
 *   the request body that fetches it); the request's own `data` is merged over it.
 * @returns {(request: { method: string, path: string, body?: unknown }) => Promise<{ status: number, body: unknown }>}
 */
export function createAiUiHandler({ model = null, catalog = loadCatalog(), modelName = "", data = {}, chrome = false, experimental = false, maxAttempts = 3 } = {}) {
  const dataFor = async (body) => ({ ...(typeof data === "function" ? await data(body) : data), ...(body?.data && typeof body.data === "object" ? body.data : {}) });
  return async ({ method, path: route, body }) => {
    const op = String(route ?? "").replace(/^\/+|\/+$/g, "").split("?")[0];
    const query = Object.fromEntries(new URLSearchParams(String(route ?? "").split("?")[1] ?? ""));
    try {
      if (method === "GET" && op === "status") return { status: 200, body: { enabled: Boolean(model), model: model ? modelName : null, components: Object.keys(catalog.components).length } };
      if (method === "GET" && op === "catalog") {
        if (query.component) return catalog.components[query.component] ? { status: 200, body: { component: query.component, text: tier2(catalog, [query.component]) } } : { status: 404, body: { error: `No component "${query.component}".` } };
        return { status: 200, body: { text: tier1(catalog, { chrome, experimental }) } };
      }
      if (method === "POST" && op === "check") {
        if (!body || typeof body !== "object" || !body.spec) return { status: 400, body: { error: "Send { spec }." } };
        const verdict = judge(body.spec, catalog, { chrome: Boolean(body.chrome) || chrome, experimental });
        return { status: 200, body: { ok: verdict.ok, validation: verdict.validation, lint: verdict.lint, feedback: verdict.ok ? null : feedbackFor(verdict) } };
      }
      if (method === "POST" && (op === "compose" || op === "edit")) {
        if (!model) return { status: 503, body: { enabled: false, error: "No model configured on this server." } };
        if (!body || typeof body !== "object" || typeof body.prompt !== "string" || !body.prompt.trim()) return { status: 400, body: { error: "Send { prompt }." } };
        if (op === "compose") {
          const result = await composeUi({ prompt: body.prompt, catalog, model, data: await dataFor(body), state: body.state, history: Array.isArray(body.history) ? body.history : [], components: Array.isArray(body.components) ? body.components : undefined, chrome, experimental, maxAttempts });
          const { messages: _messages, ...rest } = result;
          return { status: 200, body: rest };
        }
        if (!body.spec || typeof body.spec !== "object") return { status: 400, body: { error: "Send { prompt, spec }." } };
        const result = await composeEdit({ prompt: body.prompt, spec: body.spec, state: body.state, catalog, model, history: Array.isArray(body.history) ? body.history : [], chrome, experimental, maxAttempts });
        const { messages: _messages, ...rest } = result;
        return { status: 200, body: rest };
      }
      return { status: 404, body: { error: `No route ${method} /${op}. Routes: GET /status, GET /catalog, POST /compose, POST /edit, POST /check.` } };
    } catch (error) {
      return { status: 500, body: { error: error?.message ?? String(error) } };
    }
  };
}

/** The handler on node:http (JSON in, JSON out, CORS for a dev origin). `prefix` is stripped from the path ("/ai-ui"). */
export function createNodeListener(handle, { prefix = "", origin = "*" } = {}) {
  return async (request, response) => {
    const url = new URL(request.url ?? "/", "http://localhost");
    if (prefix && !url.pathname.startsWith(prefix)) { response.statusCode = 404; response.end(); return; }
    const route = url.pathname.slice(prefix.length) + url.search;
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Access-Control-Allow-Headers", "content-type");
    response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    if (request.method === "OPTIONS") { response.statusCode = 204; response.end(); return; }
    let body;
    if (request.method === "POST") {
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      try { body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {}; } catch { response.statusCode = 400; response.setHeader("Content-Type", "application/json"); response.end(JSON.stringify({ error: "The body is not valid JSON." })); return; }
    }
    const result = await handle({ method: request.method ?? "GET", path: route, body });
    response.statusCode = result.status;
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify(result.body));
  };
}

/** Standalone: `node tools/ai-ui/server.mjs --port=8787` with the Anthropic adapter (ANTHROPIC_API_KEY or an `ant auth` profile). */
export async function serve({ port = Number(process.env.PORT ?? 8787), model, modelName } = {}) {
  let fn = model, name = modelName ?? "";
  if (!fn) {
    const { anthropicModel, DEFAULT_MODEL } = await import("./adapters/anthropic.mjs");
    name = process.env.ZEN_AI_MODEL ?? DEFAULT_MODEL;
    fn = anthropicModel({ model: name, effort: process.env.ZEN_AI_EFFORT ?? "medium" });
  }
  const server = http.createServer(createNodeListener(createAiUiHandler({ model: fn, modelName: name })));
  await new Promise((resolve) => server.listen(port, resolve));
  console.log(`zen ai-ui server on http://localhost:${port} (model ${name}): GET /status, GET /catalog, POST /compose, POST /edit, POST /check`);
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.argv.find((arg) => arg.startsWith("--port="))?.slice(7) ?? process.env.PORT ?? 8787);
  serve({ port }).catch((error) => { console.error(error.message); process.exit(1); });
}

// The Studio MCP endpoint (spec docs/research/studio-mcp-canvas-2026-10-15.md §4.1, M0): MCP Streamable HTTP at
// /__zen-studio/mcp on the dev server, so Claude Code and other MCP clients design on the open canvas. Each tool call is
// relayed to a Studio tab (relay.mjs), which runs it as the person's own edit would (src/platform/studio/mcp/runtime.ts).
//
// Guards (every request): a loopback Host (no DNS rebinding), no Origin header (MCP clients send none; a page in a
// browser always does), and `Authorization: Bearer <token>` (token.mjs; `npm run studio:mcp` prints the command).
// Stateless: a fresh SDK server and transport per request, JSON answers (no SSE stream), so nothing is kept between
// calls but the name of the last client that said hello (shown in the tab's AI chip).
import fs from "node:fs";
import path from "node:path";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { RelayError } from "./relay.mjs";
import { bearerMatches, mcpToken } from "./token.mjs";
import { listedTools, TOOL_NAMES } from "./tools.mjs";

export const MCP_PATH = "/__zen-studio/mcp";
const MAX_BODY = 1024 * 1024;
const BODY_TIMEOUT = 10_000;
/** Characters of text per answer (as zen-ds: about 10k tokens). */
const MAX_TEXT = 40_000;
/** An image answer: at most this many base64 characters (about 3 MB of PNG). */
const MAX_IMAGE = 4_000_000;
const LOG_DIR = "node_modules/.cache/zen-studio";

const INSTRUCTIONS = [
  "Zen Studio's canvas: these tools read and change the page the person has open in Zen Studio, live in their tab.",
  "Call get_studio_state first. Read layers with get_tree / get_node; change them with update, insert, replace, move,",
  "duplicate, delete, wrap, unwrap, by layer id; use batch for several changes (one undo step). create_page and add_frame",
  "make pages and frames; select and focus show the person a layer. Every change shows at once and is one undo step.",
  "Never edit the page files (.zen-studio/pages/*.zen.tsx) with file tools: the canvas only follows them on a sync, and the",
  "person loses undo. Use only Zen components and their documented props (zen-ds MCP: get_component, search_icons, get_tokens).",
].join(" ");

/**
 * `relay`: relay.mjs createRelay(); `root`: the repo root (token and log); `port`: names the log file.
 * Returns `handle(req, res)` for requests to MCP_PATH.
 */
export function studioMcp({ root, relay, version = "0.0.0", port = () => null }) {
  let client = null;

  const log = (line) => {
    const name = `mcp-${port() ?? "dev"}.log`;
    fs.promises.mkdir(path.join(root, LOG_DIR), { recursive: true })
      .then(() => fs.promises.appendFile(path.join(root, LOG_DIR, name), `${new Date().toISOString()} ${line}\n`))
      .catch(() => {});
  };

  function mcpServer() {
    const server = new Server({ name: "zen-studio", title: "Zen Studio", version }, { capabilities: { tools: {} }, instructions: INSTRUCTIONS });
    server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: listedTools() }));
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args = {} } = request.params;
      if (!TOOL_NAMES.has(name)) return failure(`Unknown tool ${name}`);
      const started = Date.now();
      try {
        const answer = await relay.call(name, args, { client: client?.name ?? null });
        log(`${client?.name ?? "?"} ${name} ${answer.ok ? "ok" : `refused ${answer.code ?? ""}`} ${Date.now() - started}ms`);
        if (!answer.ok) return failure(String(answer.error ?? "The Studio refused the call"));
        return { content: contentOf(answer.content) };
      } catch (error) {
        log(`${client?.name ?? "?"} ${name} ${error instanceof RelayError ? error.code : "error"} ${Date.now() - started}ms`);
        return failure(error instanceof Error ? error.message : String(error));
      }
    });
    return server;
  }

  return async function handle(req, res) {
    if (!loopbackHost(req)) return refuse(res, 403, "The Studio MCP answers on localhost only");
    if (req.headers.origin !== undefined) return refuse(res, 403, "A browser page may not call the Studio MCP");
    let token;
    try {
      token = mcpToken(root);
    } catch (error) {
      return refuse(res, 500, `The Studio MCP token cannot be read: ${error?.message ?? error}`);
    }
    if (!bearerMatches(req.headers.authorization, token)) return refuse(res, 403, "Missing or wrong Authorization: Bearer token. `npm run studio:mcp` in Zen-DS prints the command that adds the Studio to Claude Code");
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.setHeader("allow", "POST");
      return res.end();
    }
    let body;
    try {
      body = JSON.parse(await readBody(req));
    } catch (error) {
      return refuse(res, error?.status ?? 400, error?.status ? error.message : "The body is not JSON", -32700);
    }
    const hello = helloOf(body);
    if (hello) client = hello;
    const server = mcpServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    res.on("close", () => { void transport.close(); void server.close(); });
    await server.connect(transport);
    await transport.handleRequest(req, res, body);
  };
}

/** The client's name and version, from an initialize request (or a 2026-07-28 request's _meta). */
function helloOf(body) {
  const message = Array.isArray(body) ? body[0] : body;
  const info = message?.method === "initialize" ? message.params?.clientInfo : message?.params?._meta?.["io.modelcontextprotocol/clientInfo"];
  return info && typeof info.name === "string" ? { name: info.name.slice(0, 80), version: String(info.version ?? "").slice(0, 40) } : null;
}

const failure = (text) => ({ isError: true, content: [{ type: "text", text }] });

/** The tab's answer, kept to text and PNG/JPEG images within the size limits. */
function contentOf(content) {
  const items = Array.isArray(content) ? content : [];
  const out = [];
  for (const item of items) {
    if (item?.type === "text" && typeof item.text === "string") {
      out.push({ type: "text", text: item.text.length > MAX_TEXT ? `${item.text.slice(0, MAX_TEXT)}\n… (cut at ${MAX_TEXT} characters: ask for a smaller part, e.g. get_tree with an id or a lower depth)` : item.text });
    } else if (item?.type === "image" && typeof item.data === "string" && /^image\/(png|jpeg)$/.test(item.mimeType ?? "")) {
      out.push(item.data.length > MAX_IMAGE ? { type: "text", text: "The picture was too large to send." } : { type: "image", data: item.data, mimeType: item.mimeType });
    }
  }
  return out.length ? out : [{ type: "text", text: "(no answer)" }];
}

/** A JSON-RPC error with an HTTP status, and no CORS header Vite's middleware may have set for another localhost port. */
function refuse(res, status, message, code = -32001) {
  if (res.headersSent || res.writableEnded) return;
  for (const name of res.getHeaderNames()) if (name.startsWith("access-control-")) res.removeHeader(name);
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify({ jsonrpc: "2.0", id: null, error: { code, message } }));
}

/** The request was addressed to this machine by a loopback name (as vite-plugin-zen-studio.mjs loopbackHost). */
export function loopbackHost(req) {
  let hostname = "";
  try {
    hostname = new URL(`http://${req.headers.host ?? ""}`).hostname;
  } catch {
    return false;
  }
  return hostname === "localhost" || hostname.endsWith(".localhost") || /^127(?:\.\d{1,3}){3}$/.test(hostname) || hostname === "[::1]";
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    const fail = (status, message) => { const error = new Error(message); error.status = status; reject(error); };
    const timer = setTimeout(() => { fail(408, "The request body did not arrive in time"); req.destroy(); }, BODY_TIMEOUT);
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size <= MAX_BODY) chunks.push(chunk);
    });
    req.on("end", () => {
      clearTimeout(timer);
      if (size > MAX_BODY) fail(413, "The request body is over 1 MB");
      else resolve(Buffer.concat(chunks).toString("utf8"));
    });
    req.on("error", (error) => { clearTimeout(timer); reject(error); });
  });
}

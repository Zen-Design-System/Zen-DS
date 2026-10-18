// Zen Agent's HTTP side on the Studio dev server (plan docs/research/studio-vibe-agent-2026-10-18.md §4). The plugin
// (vite-plugin-zen-studio.mjs) checks every request first as it checks /edit: the Origin, a loopback Host and the
// server's token, and for POSTs the admin role and a JSON body. Then:
//
//   GET  /agent/session?tab=<id>                     { available, source | reason + hint, models, model, busy, items }
//   POST /agent/send  { tab, text, useSelection?, model? }   202 { turn }: the turn reports through zen-agent:event
//   POST /agent/stop  { tab }                        { stopped }
//   POST /agent/reset { tab }                        a new conversation
import fs from "node:fs";
import path from "node:path";
import { agentClient, findCredentials } from "./credentials.mjs";
import { zenKnowledge } from "./knowledge.mjs";
import { MODELS } from "./models.mjs";
import { createAgent } from "./session.mjs";

export const AGENT_ROUTES = new Set(["/agent/session", "/agent/send", "/agent/stop", "/agent/reset"]);
const LOG_DIR = "node_modules/.cache/zen-studio";
const MAX_PROMPT = 20_000;

const fail = (status, code, error) => ({ status, body: { ok: false, code, error } });
const tabOf = (value) => (typeof value === "string" && /^[\w-]{1,64}$/.test(value) ? value : null);

/** `relay`: the Studio MCP's relay (the same tabs); `port()`: names the log file. */
export function zenAgent({ root, relay, port = () => null, env = process.env }) {
  const log = (line) => {
    const name = `agent-${port() ?? "dev"}.log`;
    fs.promises.mkdir(path.join(root, LOG_DIR), { recursive: true })
      .then(() => fs.promises.appendFile(path.join(root, LOG_DIR, name), `${new Date().toISOString()} ${line}\n`))
      .catch(() => {});
  };
  const knowledge = zenKnowledge({ root });
  // One client per kind: the scripted model while ZEN_AGENT_SCRIPT is set (checks), else the environment's credentials.
  let sdk = null;
  const client = () => {
    const kind = env.ZEN_AGENT_SCRIPT ? "script" : "api";
    if (sdk?.kind !== kind) sdk = { kind, client: agentClient(env) };
    return sdk.client;
  };
  const agent = createAgent({ relay, knowledge, client, log });

  return {
    /** `route` is "<METHOD> /agent/…"; `body` the parsed JSON of a POST. Answers { status, body }. */
    async handle(route, body, url) {
      if (route === "GET /agent/session") {
        const tab = tabOf(url.searchParams.get("tab"));
        if (!tab) return fail(400, "invalid", "Expected ?tab=<the Studio tab's id>");
        const credentials = await findCredentials(env);
        return { status: 200, body: { ok: true, ...credentials, models: MODELS.map(({ id, label }) => ({ id, label })), ...agent.session(tab) } };
      }
      const tab = tabOf(body?.tab);
      if (!tab) return fail(400, "invalid", "Expected { tab: <the Studio tab's id> }");
      if (route === "POST /agent/send") {
        const text = typeof body.text === "string" ? body.text.trim() : "";
        if (!text) return fail(400, "invalid", "Expected { tab, text }");
        if (text.length > MAX_PROMPT) return fail(413, "invalid", `A message is at most ${MAX_PROMPT} characters`);
        const credentials = await findCredentials(env);
        if (!credentials.available) return fail(409, credentials.reason, credentials.hint);
        const started = agent.send(tab, text, { useSelection: body.useSelection !== false, model: body.model });
        return started.ok ? { status: 202, body: { ok: true, turn: started.turn } } : fail(409, started.code, started.error);
      }
      if (route === "POST /agent/stop") return { status: 200, body: { ok: true, stopped: agent.stop(tab) } };
      if (route === "POST /agent/reset") {
        await agent.reset(tab);
        return { status: 200, body: { ok: true } };
      }
      return fail(404, "not-found", `Unknown endpoint ${route}`);
    },
    close: () => knowledge.close(),
  };
}

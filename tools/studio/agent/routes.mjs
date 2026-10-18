// Zen Agent's HTTP side on the Studio dev server (plan docs/research/studio-vibe-agent-2026-10-18.md §4). The plugin
// (vite-plugin-zen-studio.mjs) checks every request first as it checks /edit: the Origin, a loopback Host and the
// server's token, and for POSTs the admin role and a JSON body. Then:
//
//   GET  /agent/session?tab=<id>                     { available, source | reason + hint, models, model, busy, items }
//   POST /agent/send  { tab, text, useSelection?, model?, images?, thumbs?, notes? }   202 { turn }: the turn reports
//                     through zen-agent:event (images: ≤ 4 { mediaType, data } base64; thumbs: their small data URLs
//                     for the transcript; notes: what changed since the last turn, e.g. "The person undid turn 2")
//   POST /agent/answer { tab, call?, text }          the answer to the question the turn waits on (ask_person)
//   POST /agent/stop  { tab }                        { stopped }
//   POST /agent/reset { tab }                        a new conversation
import fs from "node:fs";
import path from "node:path";
import { agentClient, findCredentials } from "./credentials.mjs";
import { zenKnowledge } from "./knowledge.mjs";
import { MODELS } from "./models.mjs";
import { createAgent } from "./session.mjs";

export const AGENT_ROUTES = new Set(["/agent/session", "/agent/send", "/agent/answer", "/agent/stop", "/agent/reset"]);
const LOG_DIR = "node_modules/.cache/zen-studio";
const MAX_PROMPT = 20_000;
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const MAX_IMAGES = 4;
/** Base64 characters per picture (about 2.2 MB): the tab sends them already scaled down. */
const MAX_IMAGE = 3_000_000;
const MAX_THUMB = 40_000;

/** The attachments of a send body, checked: { images, thumbs, notes } or an error message. */
function attachmentsOf(body) {
  const images = Array.isArray(body.images) ? body.images : [];
  if (images.length > MAX_IMAGES) return `At most ${MAX_IMAGES} pictures per message`;
  for (const image of images) {
    if (!image || !IMAGE_TYPES.has(image.mediaType) || typeof image.data !== "string" || !/^[A-Za-z0-9+/=]+$/.test(image.data)) return "A picture is { mediaType: image/png | jpeg | webp | gif, data: base64 }";
    if (image.data.length > MAX_IMAGE) return "A picture is too large: scale it down first";
  }
  const thumbs = (Array.isArray(body.thumbs) ? body.thumbs : []).filter((thumb) => typeof thumb === "string" && thumb.startsWith("data:image/") && thumb.length <= MAX_THUMB).slice(0, MAX_IMAGES);
  const notes = (Array.isArray(body.notes) ? body.notes : []).filter((note) => typeof note === "string" && note.trim()).map((note) => note.trim().slice(0, 300)).slice(0, 5);
  return { images: images.map(({ mediaType, data }) => ({ mediaType, data })), thumbs, notes };
}

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
        return { status: 200, body: { ok: true, ...credentials, models: MODELS.map(({ id, label, input, output }) => ({ id, label, input, output })), ...agent.session(tab) } };
      }
      const tab = tabOf(body?.tab);
      if (!tab) return fail(400, "invalid", "Expected { tab: <the Studio tab's id> }");
      if (route === "POST /agent/send") {
        const text = typeof body.text === "string" ? body.text.trim() : "";
        if (!text) return fail(400, "invalid", "Expected { tab, text }");
        if (text.length > MAX_PROMPT) return fail(413, "invalid", `A message is at most ${MAX_PROMPT} characters`);
        const credentials = await findCredentials(env);
        if (!credentials.available) return fail(409, credentials.reason, credentials.hint);
        const attachments = attachmentsOf(body);
        if (typeof attachments === "string") return fail(400, "invalid", attachments);
        const started = agent.send(tab, text, { useSelection: body.useSelection !== false, model: body.model, ...attachments });
        return started.ok ? { status: 202, body: { ok: true, turn: started.turn } } : fail(409, started.code, started.error);
      }
      if (route === "POST /agent/answer") {
        const text = typeof body.text === "string" ? body.text.trim().slice(0, 2000) : "";
        if (!text) return fail(400, "invalid", "Expected { tab, text }");
        return agent.answer(tab, typeof body.call === "string" ? body.call : null, text) ? { status: 200, body: { ok: true } } : fail(409, "not-waiting", "Zen Agent is not waiting for an answer");
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

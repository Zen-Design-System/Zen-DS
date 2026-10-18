// Whether the dev server can call Claude for Zen Agent (user 2026-10-18: an API key or `ant auth login`, billed per
// token; an embedded agent may not use a claude.ai login). The key stays in the dev server: nothing here reaches the
// browser but which kind of credential was found.
import Anthropic from "@anthropic-ai/sdk";
import fs from "node:fs";
import { scriptedFetch } from "./script.mjs";

/** { available: true, source } or { available: false, reason, hint } */
export async function findCredentials(env = process.env) {
  if (env.ZEN_AGENT_SCRIPT) return { available: true, source: "script" };
  if (env.ANTHROPIC_API_KEY) return { available: true, source: "api-key" };
  if (env.ANTHROPIC_AUTH_TOKEN) return { available: true, source: "auth-token" };
  try {
    // An `ant auth login` profile (or workload identity): the SDK resolves it on the first request; wait for that here.
    const client = new Anthropic();
    await client._authState?.resolution;
    if (client.credentials) return { available: true, source: "profile" };
  } catch {
    // No profile, or one that cannot be read: no credentials.
  }
  return { available: false, reason: "no-credentials", hint: "Set ANTHROPIC_API_KEY (or run `ant auth login`) in the shell, then restart npm run dev." };
}

/** The Anthropic client of Zen Agent: the environment's credentials, or the scripted model of ZEN_AGENT_SCRIPT. */
export function agentClient(env = process.env) {
  if (env.ZEN_AGENT_SCRIPT) {
    // Read for each request, so a check can put up the next script without restarting the server (Studio E2E AG-*).
    const script = () => JSON.parse(fs.readFileSync(env.ZEN_AGENT_SCRIPT, "utf8"));
    return new Anthropic({ apiKey: "script", baseURL: "http://script.invalid", fetch: scriptedFetch(script), maxRetries: 0 });
  }
  return new Anthropic();
}

// The Studio MCP's bearer token (spec docs/research/studio-mcp-canvas-2026-10-15.md §6): one per checkout, kept in
// node_modules/.cache/zen-studio/mcp-token (owner-only), so a client set up once keeps working across dev server
// restarts. Unlike /ping's token (new on every start, handed to the Studio page), it never goes to a browser.
// `rotateToken` makes a new one: every client set up with the old one is refused from then on.
import { randomBytes, timingSafeEqual } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const TOKEN_FILE = "node_modules/.cache/zen-studio/mcp-token";
const TOKEN = /^[A-Za-z0-9_-]{32,}$/;

/** The checkout's token, made on first use. */
export function mcpToken(root) {
  const file = path.join(root, TOKEN_FILE);
  try {
    const text = fs.readFileSync(file, "utf8").trim();
    if (TOKEN.test(text)) return text;
  } catch {
    // None yet: make one below.
  }
  return rotateToken(root);
}

export function rotateToken(root) {
  const file = path.join(root, TOKEN_FILE);
  const token = randomBytes(24).toString("base64url");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${token}\n`, { mode: 0o600 });
  fs.chmodSync(file, 0o600);
  return token;
}

/** `Authorization: Bearer <token>`, compared in constant time. */
export function bearerMatches(header, token) {
  const match = /^Bearer\s+(\S+)$/i.exec(String(header ?? ""));
  if (!match) return false;
  const given = Buffer.from(match[1]);
  const wanted = Buffer.from(token);
  return given.length === wanted.length && timingSafeEqual(given, wanted);
}

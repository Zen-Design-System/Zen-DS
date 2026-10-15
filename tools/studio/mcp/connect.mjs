#!/usr/bin/env node
// Prints the command that adds the Studio MCP to Claude Code (spec docs/research/studio-mcp-canvas-2026-10-15.md §7):
//
//   npm run studio:mcp                    the dev server on 5173 (npm run dev)
//   npm run studio:mcp -- --port=5180     the Studio's own server (vite.studio.config.ts)
//   npm run studio:mcp -- --rotate        a new token: clients set up with the old one are refused from then on
//
// The token stays in this checkout (node_modules/.cache/zen-studio/mcp-token); the printed command holds it, so keep it
// out of chats, commits and screenshots.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MCP_PATH } from "./server.mjs";
import { mcpToken, rotateToken } from "./token.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const arg = (name) => process.argv.slice(2).find((value) => value === `--${name}` || value.startsWith(`--${name}=`));
const port = Number(arg("port")?.split("=")[1] ?? 5173);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error("--port must be a port number");
  process.exit(1);
}
const token = arg("rotate") ? rotateToken(root) : mcpToken(root);
const url = `http://127.0.0.1:${port}${MCP_PATH}`;

console.log(`Zen Studio MCP: ${url}${arg("rotate") ? " (new token: update every client)" : ""}\n`);
console.log("Claude Code (this machine, every project):");
console.log(`  claude mcp add --scope user --transport http zen-studio ${url} --header "Authorization: Bearer ${token}"\n`);
console.log("Then keep the Studio open in a browser tab on the same server and ask Claude to work on the canvas.");

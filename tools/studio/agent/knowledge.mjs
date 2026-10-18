// Zen Agent's knowledge tools: the zen-ds MCP server (mcp/server.mjs, the docs Zen ships for AI agents) as a child
// process the dev server talks to over stdio, so the agent reads the same component rules, props and icon names as
// Claude Code does. Started on the first turn that needs it, stopped with the dev server.
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

/** The zen-ds tools the agent gets, in a fixed order (the tool list is part of the cached prompt). */
export const KNOWLEDGE_TOOLS = ["list_components", "get_component", "search_icons", "get_tokens"];

export function zenKnowledge({ root }) {
  let ready = null;

  const connect = async () => {
    const client = new Client({ name: "zen-agent", version: "0.0.0" });
    const transport = new StdioClientTransport({ command: process.execPath, args: [path.join(root, "mcp/server.mjs")], cwd: root, stderr: "ignore" });
    await client.connect(transport);
    const { tools } = await client.listTools();
    const byName = new Map(tools.map((tool) => [tool.name, tool]));
    return { client, tools: KNOWLEDGE_TOOLS.map((name) => byName.get(name)).filter(Boolean) };
  };
  const get = () => {
    ready ??= connect().catch((error) => { ready = null; throw error; });
    return ready;
  };

  return {
    /** [{ name, description, inputSchema }] */
    async tools() {
      return (await get()).tools;
    },
    /** The MCP result: { content: [{ type: "text", text }], isError? }. */
    async call(name, args) {
      const { client } = await get();
      return client.callTool({ name, arguments: args ?? {} });
    },
    async close() {
      const pending = ready;
      ready = null;
      if (!pending) return;
      try {
        const { client } = await pending;
        await client.close();
      } catch {
        // It never started, or already stopped.
      }
    },
  };
}

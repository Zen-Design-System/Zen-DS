#!/usr/bin/env node
// Conformance test for mcp/server.mjs with the official MCP SDK client (devDependency only; the server has none):
// spawn it over stdio, list the tools and call each one with a realistic request.
//   npm run mcp:selftest
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const client = new Client({ name: "zen-ds-selftest", version: "1.0.0" });
await client.connect(new StdioClientTransport({ command: process.execPath, args: [path.join(here, "server.mjs")], stderr: "ignore" }));

const problems = [];
const expect = (ok, message) => { if (!ok) problems.push(message); };
const text = async (name, args = {}) => {
  const result = await client.callTool({ name, arguments: args });
  const body = result.content?.map((c) => c.text).join("\n") ?? "";
  return { body, isError: Boolean(result.isError) };
};

const { tools } = await client.listTools();
const names = tools.map((t) => t.name).sort();
expect(names.join() === ["check_usage", "get_component", "get_setup", "get_template", "get_tokens", "list_components", "list_templates", "map_figma_component", "search_icons"].join(), `tools: ${names.join(", ")}`);

const setup = await text("get_setup");
expect(/ZenProvider/.test(setup.body) && /styles\.css/.test(setup.body), "get_setup mentions ZenProvider and styles.css");
const list = await text("list_components", { query: "filter" });
expect(/Chip/.test(list.body), "list_components('filter') finds Chip");
for (const name of ["Button", "icon-button", "IconButton", "Table", "ChatMessage", "date-picker"]) {
  const component = await text("get_component", { name });
  expect(!component.isError && /## (Props|✅ Do)/.test(component.body), `get_component(${name})`);
}
expect((await text("get_component", { name: "NoSuchThing" })).isError, "get_component on an unknown name is an error result");
const icons = await text("search_icons", { query: "search" });
expect(/icon-search-medium-line/.test(icons.body), "search_icons('search') finds icon-search-medium-line");
const trash = await text("search_icons", { query: "delete" });
expect(/trash/.test(trash.body), "search_icons('delete') finds a trash icon (synonym)");
const tokens = await text("get_tokens", { query: "background surface" });
expect(/--zen-color-background-surface-default/.test(tokens.body), "get_tokens('background surface')");
const templates = await text("list_templates");
expect(/AdminListTemplate/.test(templates.body), "list_templates lists AdminListTemplate");
const template = await text("get_template", { name: "admin list" });
expect(/from "@zen-ds\/react"/.test(template.body), "get_template('admin list') returns the source");
const bad = await text("check_usage", { code: 'import { IconButton } from "@zen-ds/react";\nexport const A = () => <IconButton icon="icon-plus-line" />;', filename: "A.tsx" });
expect(/icon-button\/needs-name/.test(bad.body), `check_usage flags a nameless IconButton: ${bad.body.slice(0, 200)}`);
const misspelt = await text("check_usage", { source: 'import { IconButton } from "@zen-ds/react";' });
expect(misspelt.isError && /unknown argument "source"/.test(misspelt.body), `check_usage rejects a misspelt argument instead of a clean answer: ${misspelt.body.slice(0, 200)}`);
const good = await text("check_usage", { code: 'import { IconButton } from "@zen-ds/react";\nexport const A = () => <IconButton icon="icon-plus-line" aria-label="Add member" onClick={addMember} />;', filename: "A.tsx" });
expect(/No findings/.test(good.body), `check_usage passes a named IconButton: ${good.body.slice(0, 200)}`);

const mapped = await text("map_figma_component", { component: "Button/Main", properties: { Level: "Primary", Size: "Medium", State: "Default", Label: "Save changes" } });
expect(mapped.body.includes('<Button level="primary" size="md">Save changes</Button>'), `map_figma_component(Button/Main): ${mapped.body.slice(0, 200)}`);
const field = await text("map_figma_component", { component: "Input/Text-Field", properties: { Size: "Large" } });
expect(/InputField size="lg"/.test(field.body) && /input\/needs-label/.test(field.body), `map_figma_component(Input/Text-Field) flags the missing label: ${field.body.slice(0, 200)}`);

await client.close();
if (problems.length) { console.log(problems.map((p) => `✗ ${p}`).join("\n")); process.exit(1); }
console.log(`✓ MCP server: ${tools.length} tools respond as expected (SDK client over stdio).`);

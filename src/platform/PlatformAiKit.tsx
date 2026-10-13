import { useState } from "react";
import { Button } from "../components/Button";
import type { IconName } from "../components/Icon";
import { Stack } from "../components/Layout";
import { List, ListItem } from "../components/ListItem";
import { Heading, Text } from "../components/Text";

const parts: Array<{ icon: IconName; title: string; caption: string }> = [
  { icon: "icon-magic-wand-01-line", title: "Skill · zen-figma-design", caption: "How to build a screen in a Zen Figma file: setup, the hard rules, the build steps, the audit loop and the report." },
  { icon: "icon-shield-tick-line", title: "Harness · zen-figma-audit.js", caption: "A read-only script the agent runs with use_figma after every screen: unbound colours, spacing and radii, missing text styles, overrides, lost icon colours, overflow and crushed text." },
  { icon: "icon-book-open-line", title: "Markdown · rules and references", caption: "Screen rules, every Figma component's properties, the variables and styles, Plugin API gotchas and one guideline per component." },
];

const setup = [
  { agent: "Claude Code", command: "claude mcp add --transport http figma https://mcp.figma.com/mcp" },
  { agent: "Codex", command: "codex mcp add figma --url https://mcp.figma.com/mcp" },
];

/**
 * Installation › AI kit for Figma: the skill, the Figma audit harness and the Zen rules as one zip, built in the browser
 * from the repo's files (aiKit.ts, tools/ai-kit/kit.mjs), loaded only on click.
 */
export function PlatformAiKit() {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const download = async () => {
    setBusy(true);
    setStatus("Packing the kit…");
    try {
      const { downloadAiKit } = await import("./aiKit");
      const count = await downloadAiKit();
      setStatus(`Downloaded zen-figma-ai-kit.zip (${count} files). Start with its README.md.`);
    } catch (error) {
      setStatus(`The kit could not be built: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack as="section" gap="md" className="platform-example-panel" aria-labelledby="ai-kit-title" id="ai-kit">
      <Stack gap="xs">
        <Heading level={2} textStyle="Heading/4" id="ai-kit-title">AI kit for Figma</Heading>
        <Text tone="base">
          Lets Claude or ChatGPT (Codex) design screens in a Zen Figma file the way a Zen designer would: only Zen
          components and variables, Zen's screen rules, and an audit after every screen. It works through Figma's MCP
          server and is built from this repo, so it always matches the live library.
        </Text>
      </Stack>
      <List aria-label="In the kit">
        {parts.map((part) => <ListItem key={part.title} leading={part.icon} title={part.title} caption={part.caption} titleLines={2} />)}
      </List>
      <Stack direction="row" gap="sm" align="center" wrap>
        <Button level="primary" startIcon="icon-download-01-line" disabled={busy} onClick={() => { void download(); }}>
          {busy ? "Packing…" : "Download AI kit (.zip)"}
        </Button>
        <Text as="span" textStyle="Body/Small/Regular" tone="base" role="status" aria-live="polite">{status}</Text>
      </Stack>
      <Stack gap="sm">
        <Text tone="base">Connect Figma's MCP server in your agent, then add the kit's skill folder. Its README covers Claude Code, the Claude app, Codex and ChatGPT.</Text>
        {setup.map((item) => (
          <Stack key={item.agent} gap="xs">
            <Text as="span" textStyle="Body/Small/Medium" tone="base">{item.agent}</Text>
            <pre className="platform-install__command"><code>{item.command}</code></pre>
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
}

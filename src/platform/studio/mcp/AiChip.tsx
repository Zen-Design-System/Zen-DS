import { IconButton } from "../../../components/Button";
import { Icon } from "../../../components/Icon";
import { Text } from "../../../components/Text";
import { ChromeScope } from "../shell/ChromeScope";
import { AiHighlights } from "./AiHighlights";
import { setAiStopped, useAiActivity } from "./runtime";
import "./mcp.css";

/*
 * The AI chip, bottom-left of the canvas (spec docs/research/studio-mcp-canvas-2026-10-15.md §4.2, M0): shows once an AI
 * client has called the Studio MCP in this tab, says when it is changing the canvas, and holds the person's Stop
 * (every call refused until Resume; ⌘Z undoes what the AI did, one step per change).
 */

const CLIENTS: Record<string, string> = { "zen-agent": "Zen Agent", "claude-code": "Claude Code", "claude-ai": "Claude", cursor: "Cursor", "codex-mcp-client": "Codex", "gemini-cli-mcp-client": "Gemini CLI", "Visual Studio Code": "VS Code" };

export const clientLabel = (name: string) => CLIENTS[name] ?? name;

export function AiChip() {
  const ai = useAiActivity();
  // The canvas outline of what an AI just changed rides with the chip (both belong to any MCP client).
  if (!ai.client && !ai.stopped) return <AiHighlights />;
  const name = ai.client ? clientLabel(ai.client) : "AI";
  const state = ai.stopped ? "stopped" : ai.busy ? "working" : "idle";
  const label = ai.stopped ? `${name} · stopped` : ai.busy ? `${name} · editing` : name;
  return (
    <>
    <AiHighlights />
    <ChromeScope className="studio-ai" data-state={state} role="group" aria-label={`AI on this canvas: ${label}`}>
      <Icon name="icon-stars-01-line" size="sm" tone={ai.stopped ? "light" : "accent"} decorative />
      <Text as="span" textStyle="Body/Small/Medium" tone={ai.stopped ? "base" : "strongest"} aria-live="polite">{label}</Text>
      <IconButton
        appearance="flat"
        level="primary"
        size="sm"
        aria-label={ai.stopped ? `Resume ${name}` : `Stop ${name}`}
        tooltip={ai.stopped ? "Resume · let the AI change this canvas again" : "Stop · refuse the AI's next changes (⌘Z undoes what it did)"}
        icon={<Icon name={ai.stopped ? "icon-play-line" : "icon-stop-circle-line"} />}
        onClick={() => setAiStopped(!ai.stopped)}
      />
    </ChromeScope>
    </>
  );
}

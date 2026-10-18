import { useEffect, useRef } from "react";
import type { AgentItem, AgentReplyItem, AgentStep } from "../../../../tools/studio/agent/transcript.mjs";
import { AiChatBubble, AiChatField, AiChatThread } from "../../../components/AiChat";
import { Badge } from "../../../components/Badge";
import { IconButton } from "../../../components/Button";
import { Chip } from "../../../components/Chip";
import { Icon } from "../../../components/Icon";
import { Text } from "../../../components/Text";
import { ChromeScope } from "../shell/ChromeScope";
import { useStudio } from "../store";
import { closeAgent, newAgentChat, sendToAgent, setUseSelection, startAgentEvents, stopAgent, toggleAgent, useAgent } from "./agentStore";
import "./agent.css";

/*
 * Zen Agent's panel (plan docs/research/studio-vibe-agent-2026-10-18.md §3, V0; user 2026-10-18: a floating panel left of
 * the canvas, beside Pages | Layers). ⌘J or the toolbar's Zen Agent button opens it. The person writes what to design or
 * change; the dev server's agent changes the open page live (one ⌘Z step per change) and checks it with the Zen usage
 * harness. Chrome copy stays one short line; the reasons go in tooltips.
 */

const SUGGESTIONS = [
  "Add an icon to the selected button",
  "Add a row of 4 KPI cards to this screen",
  "Tighten the spacing of this section",
];

const STEP_ICON = { running: "icon-loading-01-line", ok: "icon-check-circle-line", error: "icon-alert-circle-line" } as const;

/** "Button" for a selected layer, "Frame" for a frame, null without a selection. */
function useSelectionLabel(): string | null {
  return useStudio((state) => {
    const selection = state.selection;
    if (!selection) return null;
    if (selection.kind === "node") return selection.name;
    return selection.kind === "frame" ? "Frame" : "Variant";
  });
}

const money = (cost: number) => (cost < 0.01 ? "< $0.01" : `$${cost.toFixed(2)}`);
const seconds = (ms: number) => (ms < 1000 ? "< 1 s" : `${Math.round(ms / 1000)} s`);

function Step({ step }: { step: AgentStep }) {
  return (
    <li className="studio-agent__step" data-state={step.state} title={step.detail ?? undefined}>
      <Icon name={STEP_ICON[step.state]} size="sm" tone={step.state === "error" ? "negative" : "light"} decorative />
      <Text as="span" textStyle="Caption/Regular" tone={step.state === "error" ? "negative" : "base"}>{step.summary}</Text>
    </li>
  );
}

function Reply({ item }: { item: AgentReplyItem }) {
  const working = item.state === "working";
  const check = item.check;
  return (
    <div className="studio-agent__reply">
      {item.steps.length ? <ul className="studio-agent__steps" aria-label="Steps">{item.steps.map((step) => <Step key={step.call} step={step} />)}</ul> : null}
      {item.text || working ? (
        <AiChatBubble side="ai" streaming={working && Boolean(item.text)} thinking={working && !item.text}>
          <span className="studio-agent__text">{item.text}</span>
        </AiChatBubble>
      ) : null}
      {check ? (
        <div className="studio-agent__check" data-state={check.state} title={check.findings.join("\n") || undefined}>
          <Icon name={check.state === "ok" ? "icon-check-circle-line" : check.state === "running" || check.state === "fixing" ? "icon-loading-01-line" : "icon-alert-circle-line"} size="sm" tone={check.state === "left" ? "warning" : check.state === "ok" ? "positive" : "light"} decorative />
          <Text as="span" textStyle="Caption/Regular" tone="base">
            {check.state === "ok" ? "Zen rules pass" : check.state === "running" ? "Checking Zen rules" : check.state === "fixing" ? `Fixing ${check.count} Zen rule finding${check.count === 1 ? "" : "s"}` : `${check.count} Zen rule finding${check.count === 1 ? "" : "s"} left`}
          </Text>
        </div>
      ) : null}
      {item.state === "error" ? <Text as="p" textStyle="Caption/Regular" tone="negative" className="studio-agent__note">{item.error ?? "Something went wrong."}</Text> : null}
      {item.state === "stopped" ? <Text as="p" textStyle="Caption/Regular" tone="light" className="studio-agent__note">Stopped</Text> : null}
      {!working && item.cost !== null && item.ms !== null ? (
        <Text as="p" textStyle="Caption/Regular" tone="light" className="studio-agent__note" title={item.usage ? `${item.usage.input + item.usage.cacheRead + item.usage.cacheWrite} tokens in (${item.usage.cacheRead} from cache), ${item.usage.output} out` : undefined}>
          {money(item.cost)} · {seconds(item.ms)}
        </Text>
      ) : null}
    </div>
  );
}

function Conversation({ items }: { items: AgentItem[] }) {
  const end = useRef<HTMLDivElement>(null);
  const last = items.at(-1);
  const lastLength = last?.kind === "agent" ? last.text.length + last.steps.length : 0;
  // Follow the newest message by scrolling the panel's body only (scrollIntoView would also move the clipped canvas area).
  useEffect(() => {
    const body = end.current?.closest(".studio-agent__body");
    if (body) body.scrollTop = body.scrollHeight;
  }, [items.length, lastLength]);
  return (
    <AiChatThread aria-label="Zen Agent conversation" className="studio-agent__thread">
      {items.map((item, index) => (item.kind === "user"
        ? <AiChatBubble key={`u${item.turn}-${index}`} side="you"><span className="studio-agent__text">{item.text}</span></AiChatBubble>
        : <Reply key={`a${item.turn}-${index}`} item={item} />))}
      <div ref={end} />
    </AiChatThread>
  );
}

export function AgentPanel() {
  const agent = useAgent();
  const role = useStudio((state) => state.role);
  const presenting = useStudio((state) => state.presenting);
  const selection = useSelectionLabel();

  useEffect(() => startAgentEvents(), []);
  // ⌘J / Ctrl+J: open or close the panel (free in the Studio; Figma's AI lives in its bottom toolbar too).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.isComposing || !(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey || event.key.toLowerCase() !== "j") return;
      event.preventDefault();
      toggleAgent();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);
  // A new selection goes with the next message again.
  useEffect(() => { setUseSelection(true); }, [selection]);
  // Opening the panel puts the cursor in the prompt.
  useEffect(() => {
    if (agent.open) requestAnimationFrame(() => document.querySelector<HTMLTextAreaElement>(".studio-agent textarea")?.focus());
  }, [agent.open]);

  if (!agent.open || presenting) return null;
  const viewer = role === "viewer";
  const ready = agent.status === "ready" && !viewer;

  return (
    <ChromeScope as="section" className="studio-agent" aria-label="Zen Agent" data-status={agent.status}>
      <header className="studio-agent__header">
        <Icon name="icon-stars-01-line" size="sm" tone="accent" decorative />
        <Text as="span" textStyle="Body/Small/Bold" tone="strongest" className="studio-agent__title">Zen Agent</Text>
        <IconButton appearance="flat" level="primary" size="sm" aria-label="New chat" tooltip="New chat" disabled={agent.busy || !agent.items.length} icon={<Icon name="icon-edit-01-line" />} onClick={() => void newAgentChat()} />
        <IconButton appearance="flat" level="primary" size="sm" aria-label="Close Zen Agent" aria-keyshortcuts="Meta+J" tooltip="Close (⌘J)" icon={<Icon name="icon-x-line" />} onClick={closeAgent} />
      </header>

      <div className="studio-agent__body">
        {agent.status === "checking" ? <Text as="p" textStyle="Caption/Regular" tone="light">Connecting…</Text> : null}
        {agent.status === "unavailable" || agent.status === "offline" ? (
          <div className="studio-agent__empty">
            <Text as="p" textStyle="Body/Small/Bold" tone="strongest">{agent.status === "offline" ? "No Studio dev server" : "Needs a Claude API key"}</Text>
            <Text as="p" textStyle="Caption/Regular" tone="base">{agent.hint}</Text>
          </div>
        ) : null}
        {agent.status === "ready" && !agent.items.length ? (
          <div className="studio-agent__empty">
            <Text as="p" textStyle="Body/Small/Bold" tone="strongest">What should we design?</Text>
            <div className="studio-agent__suggestions">
              {SUGGESTIONS.map((label) => <Chip key={label} variant="normal" size="small" level="secondary" disabled={!ready} onClick={() => void sendToAgent(label)}>{label}</Chip>)}
            </div>
          </div>
        ) : null}
        {agent.items.length ? <Conversation items={agent.items} /> : null}
      </div>

      <footer className="studio-agent__footer">
        {selection && agent.useSelection ? (
          <div className="studio-agent__context">
            <Badge size="sm" theme="neutral" background="subtle" leading="icon-cursor-click-line" remove removeLabel="Leave the selection out" onRemove={() => setUseSelection(false)}>{selection}</Badge>
          </div>
        ) : null}
        {agent.error ? <Text as="p" textStyle="Caption/Regular" tone="negative">{agent.error}</Text> : null}
        {viewer ? <Text as="p" textStyle="Caption/Regular" tone="light">View only — switch to Admin to edit</Text> : null}
        <AiChatField placeholder="Describe a change" busy={agent.busy} onStop={() => void stopAgent()} onSubmit={(text) => void sendToAgent(text)} disabled={!ready && !agent.busy} />
      </footer>
    </ChromeScope>
  );
}

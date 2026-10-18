import { Fragment, useEffect, useRef, type ClipboardEvent } from "react";
import { BATCH_TOOLS } from "../../../../tools/studio/mcp/tools.mjs";
import { waitingAskOf, type AgentAskPart, type AgentCheckPart, type AgentItem, type AgentPart, type AgentReplyItem, type AgentStepPart } from "../../../../tools/studio/agent/transcript.mjs";
import { AiChatBubble, AiChatField, AiChatThread } from "../../../components/AiChat";
import { Badge } from "../../../components/Badge";
import { Button, IconButton } from "../../../components/Button";
import { Chip } from "../../../components/Chip";
import { Icon } from "../../../components/Icon";
import { Thumbnail } from "../../../components/Image";
import { Menu } from "../../../components/Menu";
import { Text } from "../../../components/Text";
import { ChromeScope } from "../shell/ChromeScope";
import { useStudio } from "../store";
import {
  addPictures, answerAgent, closeAgent, MAX_PICTURES, newAgentChat, nextModel, pickModel, removePicture, sendToAgent,
  setUseSelection, startAgentEvents, stopAgent, toggleAgent, turnUndoState, undoTurn, useAgent, type AgentModel,
} from "./agentStore";
import "./agent.css";

/*
 * Zen Agent's panel (plan docs/research/studio-vibe-agent-2026-10-18.md §3, V0; §9 V1a). A floating panel left of the
 * canvas, beside Pages | Layers (user 2026-10-18); ⌘J or the toolbar's ✦ opens it. The person writes what to design or
 * change; the dev server's agent changes the open page live (one ⌘Z step per change, the whole turn undoable at once)
 * and checks it with the Zen usage harness. Its reply shows what happened in order — text, steps, the harness, questions.
 * Chrome copy stays one short line; the reasons go in tooltips.
 */

const SUGGESTIONS = [
  "Add an icon to the selected button",
  "Add a row of 4 KPI cards to this screen",
  "Tighten the spacing of this section",
];

const STEP_ICON = { running: "icon-loading-01-line", ok: "icon-check-circle-line", error: "icon-alert-circle-line" } as const;
const WRITES = new Set([...BATCH_TOOLS, "batch", "create_page", "add_frame"]);

/** "Button" for a selected layer, "Frame" for a frame, null without a selection. */
function useSelectionLabel(): string | null {
  return useStudio((state) => {
    const selection = state.selection;
    if (!selection) return null;
    if (selection.kind === "node") return selection.name;
    return selection.kind === "frame" ? "Frame" : "Variant";
  });
}

/** The index of the last item `test` accepts, or -1 (Array.prototype.findLastIndex is past this build's target). */
function lastIndex<T>(list: readonly T[], test: (item: T) => boolean): number {
  for (let index = list.length - 1; index >= 0; index -= 1) if (test(list[index])) return index;
  return -1;
}

const money = (cost: number) => (cost < 0.01 ? "< $0.01" : `$${cost.toFixed(2)}`);
const seconds = (ms: number) => (ms < 1000 ? "< 1 s" : `${Math.round(ms / 1000)} s`);
/** "$4 / $20 per M tokens": input / output price (the menu caption stays one line). */
const price = (model: AgentModel) => (model.input !== undefined && model.output !== undefined ? `$${model.input} / $${model.output} per M tokens` : "");

/** A step as one line: what a write changed (its answer without layer ids), else what the step does. */
function stepLine(step: AgentStepPart): string {
  if (step.state === "ok" && WRITES.has(step.name) && step.detail) return step.detail.replace(/ ?#n[\w-]+/g, "").replace(/\s+/g, " ").trim();
  return step.summary;
}

function Steps({ steps }: { steps: AgentStepPart[] }) {
  return (
    <ul className="studio-agent__steps" aria-label="Steps">
      {steps.map((step) => (
        <li key={step.call} className="studio-agent__step" data-state={step.state} title={step.detail ?? undefined}>
          <Icon name={STEP_ICON[step.state]} size="sm" tone={step.state === "error" ? "negative" : "light"} decorative />
          <Text as="span" textStyle="Caption/Regular" tone={step.state === "error" ? "negative" : "base"}>{stepLine(step)}</Text>
        </li>
      ))}
    </ul>
  );
}

function Check({ check }: { check: AgentCheckPart }) {
  const plural = check.count === 1 ? "" : "s";
  const label = check.state === "ok" ? "Zen rules pass" : check.state === "running" ? "Checking Zen rules" : check.state === "fixing" ? `Fixing ${check.count} Zen rule finding${plural}` : `${check.count} Zen rule finding${plural} left`;
  const icon = check.state === "ok" ? "icon-check-circle-line" : check.state === "left" ? "icon-alert-circle-line" : "icon-loading-01-line";
  return (
    <div className="studio-agent__check" data-state={check.state} title={check.findings.join("\n") || undefined}>
      <Icon name={icon} size="sm" tone={check.state === "left" ? "warning" : check.state === "ok" ? "positive" : "light"} decorative />
      <Text as="span" textStyle="Caption/Regular" tone="base">{label}</Text>
    </div>
  );
}

/** The agent's question: its answers to pick while the turn waits; then what the person answered. */
function Ask({ ask }: { ask: AgentAskPart }) {
  return (
    <div className="studio-agent__ask" data-state={ask.state} role="group" aria-label="Zen Agent asks">
      <Text as="p" textStyle="Body/Small/Bold" tone="strongest">{ask.question}</Text>
      {ask.state === "waiting" ? (
        <div className="studio-agent__options">
          {ask.options.map((option) => <Chip key={option} variant="normal" size="small" level="secondary" onClick={() => void answerAgent(option, ask.call)}>{option}</Chip>)}
        </div>
      ) : (
        <Text as="p" textStyle="Caption/Regular" tone="light">{ask.state === "answered" ? `You answered: ${ask.answer ?? ""}` : "Not answered"}</Text>
      )}
    </div>
  );
}

/** The parts of a reply in their order; steps in a row share one list. */
function Parts({ item }: { item: AgentReplyItem }) {
  const working = item.state === "working";
  const blocks: Array<{ key: string; steps?: AgentStepPart[]; part?: AgentPart }> = [];
  item.parts.forEach((part, index) => {
    const last = blocks.at(-1);
    if (part.kind === "step") {
      if (last?.steps) last.steps.push(part);
      else blocks.push({ key: `s${index}`, steps: [part] });
    } else blocks.push({ key: `p${index}`, part });
  });
  const lastPart = item.parts.at(-1);
  const waiting = waitingAskOf(item);
  return (
    <>
      {blocks.map((block, index) => {
        if (block.steps) return <Steps key={block.key} steps={block.steps} />;
        const part = block.part!;
        if (part.kind === "text") {
          const streaming = working && index === blocks.length - 1;
          return <AiChatBubble key={block.key} side="ai" streaming={streaming}><span className="studio-agent__text">{part.text.replace(/^\n+/, "")}</span></AiChatBubble>;
        }
        if (part.kind === "check") return <Check key={block.key} check={part} />;
        if (part.kind === "ask") return <Ask key={block.key} ask={part} />;
        return null;
      })}
      {working && !waiting && lastPart?.kind !== "text" ? <AiChatBubble side="ai" thinking><span /></AiChatBubble> : null}
    </>
  );
}

function Reply({ item, last }: { item: AgentReplyItem; last: boolean }) {
  const agent = useAgent();
  const undo = useStudio((state) => state.undo);
  const working = item.state === "working";
  const model = agent.models.find((entry) => entry.id === item.model)?.label ?? item.model;
  const undoState = last && !working ? turnUndoState(item.turn, undo, agent.undone) : null;
  return (
    <div className="studio-agent__reply" data-state={item.state}>
      <Parts item={item} />
      {item.state === "error" ? <Text as="p" textStyle="Caption/Regular" tone="negative" className="studio-agent__note">{item.error ?? "Something went wrong."}</Text> : null}
      {item.state === "stopped" ? <Text as="p" textStyle="Caption/Regular" tone="light" className="studio-agent__note">Stopped</Text> : null}
      {!working && item.cost !== null && item.ms !== null ? (
        <div className="studio-agent__meta">
          <Text as="span" textStyle="Caption/Regular" tone="light" title={item.usage ? `${item.usage.input + item.usage.cacheRead + item.usage.cacheWrite} tokens in (${item.usage.cacheRead} from cache), ${item.usage.output} out` : undefined}>
            {model ? `${model} · ` : ""}{money(item.cost)} · {seconds(item.ms)}
          </Text>
          {undoState?.ok ? (
            <IconButton appearance="flat" level="primary" size="sm" aria-label="Undo turn" tooltip={`Undo this turn · ${undoState.count} change${undoState.count === 1 ? "" : "s"}`} icon={<Icon name="icon-reverse-left-line" />} onClick={() => void undoTurn(item.turn)} />
          ) : undoState && undoState.reason !== "This turn changed nothing" ? (
            <Text as="span" textStyle="Caption/Regular" tone="light" title={undoState.reason}>{undoState.reason === "Undone" ? "Undone" : "Undo with ⌘Z"}</Text>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Conversation({ items }: { items: AgentItem[] }) {
  const end = useRef<HTMLDivElement>(null);
  const last = items.at(-1);
  const lastLength = last?.kind === "agent" ? last.text.length + last.parts.length : 0;
  // Follow the newest message by scrolling the panel's body only (scrollIntoView would also move the clipped canvas area).
  useEffect(() => {
    const body = end.current?.closest(".studio-agent__body");
    if (body) body.scrollTop = body.scrollHeight;
  }, [items.length, lastLength]);
  const lastAgent = lastIndex(items, (item) => item.kind === "agent");
  return (
    <AiChatThread aria-label="Zen Agent conversation" className="studio-agent__thread">
      {items.map((item, index) => (item.kind === "user" ? (
        <Fragment key={`u${item.turn}-${index}`}>
          {item.thumbs.length ? <div className="studio-agent__thumbs" data-side="you">{item.thumbs.map((thumb, n) => <Thumbnail key={n} src={thumb} alt={`Attached picture ${n + 1}`} size="md" />)}</div> : null}
          <AiChatBubble side="you"><span className="studio-agent__text">{item.text}</span></AiChatBubble>
        </Fragment>
      ) : <Reply key={`a${item.turn}-${index}`} item={item} last={index === lastAgent} />))}
      <div ref={end} />
    </AiChatThread>
  );
}

export function AgentPanel() {
  const agent = useAgent();
  const role = useStudio((state) => state.role);
  const presenting = useStudio((state) => state.presenting);
  const selection = useSelectionLabel();
  const fileRef = useRef<HTMLInputElement>(null);

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
  const lastItem = agent.items[lastIndex(agent.items, (item) => item.kind === "agent")];
  const asking = lastItem?.kind === "agent" ? waitingAskOf(lastItem) : null;
  const current = agent.models.find((model) => model.id === nextModel(agent)) ?? agent.models[0];

  // A pasted picture joins the next message (text pastes as usual).
  const onPaste = (event: ClipboardEvent<HTMLElement>) => {
    const files = [...event.clipboardData.files].filter((file) => file.type.startsWith("image/"));
    if (!files.length) return;
    event.preventDefault();
    void addPictures(files);
  };

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

      <footer className="studio-agent__footer" onPaste={onPaste}>
        {agent.pictures.length ? (
          <div className="studio-agent__thumbs" aria-label="Pictures for the next message">
            {agent.pictures.map((picture, index) => (
              <div key={picture.id} className="studio-agent__picture">
                <Thumbnail src={picture.thumb} alt={`Picture ${index + 1}`} size="md" />
                <IconButton appearance="flat" level="primary" size="2xs" aria-label={`Remove picture ${index + 1}`} tooltip="Remove" icon={<Icon name="icon-x-line" />} onClick={() => removePicture(picture.id)} />
              </div>
            ))}
          </div>
        ) : null}
        <div className="studio-agent__context">
          {selection && agent.useSelection ? (
            <Badge size="sm" theme="neutral" background="subtle" leading="icon-cursor-click-line" remove removeLabel="Leave the selection out" onRemove={() => setUseSelection(false)}>{selection}</Badge>
          ) : <span />}
          {agent.models.length && current ? (
            <Menu
              align="end"
              aria-label="Model"
              trigger={<Button appearance="flat" level="primary" size="sm" endIcon="icon-chevron-down-line" aria-label={`Model: ${current.label}`}>{current.label}</Button>}
              items={agent.models.map((model) => ({ id: model.id, label: model.label, caption: `${model.id === current.id ? "Current · " : ""}${price(model)}`, onSelect: () => pickModel(model.id) }))}
            />
          ) : null}
        </div>
        {agent.error ? <Text as="p" textStyle="Caption/Regular" tone="negative">{agent.error}</Text> : null}
        {viewer ? <Text as="p" textStyle="Caption/Regular" tone="light">View only</Text> : null}
        <AiChatField
          placeholder={asking ? "Or write your answer" : "Describe a change"}
          busy={agent.busy && !asking}
          onStop={() => void stopAgent()}
          onSubmit={(text) => void (asking ? answerAgent(text, asking.call) : sendToAgent(text))}
          onAttach={ready && agent.pictures.length < MAX_PICTURES ? () => fileRef.current?.click() : undefined}
          disabled={!ready && !agent.busy}
        />
        {/* zen-allow-raw-input: the hidden file picker behind the prompt's + (AiChatField onAttach); no visible control. */}
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple hidden onChange={(event) => { void addPictures([...(event.target.files ?? [])]); event.target.value = ""; }} />
      </footer>
    </ChromeScope>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Button } from "../../../../components/Button";
import { Icon } from "../../../../components/Icon";
import { InputField, SelectField } from "../../../../components/Input";
import { Text } from "../../../../components/Text";
import api from "../../../api.generated.json";
import { applyEdit, parseSrc } from "../../api";
import { addFrame as addBoardFrame } from "./addFrame";
import { InspectorRow, InspectorSection } from "../../inspector/Section";
import { useStudio } from "../../store";
import type { EditOp } from "../../types";
import { loadEngine } from "../engine";
import type { PageNode, PageTree, PageValue } from "../render/renderPage";
import { pageFile, usePage } from "../store/pageStore";
import { usePageTree } from "../usePageTree";
import { startPlay } from "./Player";

/*
 * The Inspector's Prototype tab on a builder page (Studio builder GĐ2 M3, spec
 * docs/research/studio-builder-pages-spec-2026-10-06.md §3 2d): the page's flow (its Screens and Overlays, Add screen,
 * Add overlay, Play) and the selected element's interactions: each trigger it takes (onClick, onSelect…) with an action
 * (navigate to a Screen, open an Overlay, close, back, show a toast, open a link). An action is written as the prop's
 * `proto.*(…)` expression (setProp), so it is code like any other prop and ⌘Z undoes it.
 */

type Action = "none" | "navigate" | "open" | "close" | "back" | "toast" | "link";
const ACTIONS: Array<{ value: Action; label: string }> = [
  { value: "none", label: "None" },
  { value: "navigate", label: "Navigate to" },
  { value: "open", label: "Open overlay" },
  { value: "close", label: "Close overlay" },
  { value: "back", label: "Back" },
  { value: "toast", label: "Show toast" },
  { value: "link", label: "Open link" },
];

type ApiEntry = { name: string; extends?: string | null; props: Array<{ name: string; type: string }> };
const API: Map<string, ApiEntry> = new Map(Object.values(api as unknown as Record<string, ApiEntry[]>).flat().map((entry) => [entry.name, entry]));

/** The event props a component takes (`on[A-Z]…` functions; onClick for one that takes the DOM element's props). */
export function triggersOf(name: string, written: string[]): string[] {
  const entry = API.get(name.split(".")[0]);
  const own = (entry?.props ?? []).filter((prop) => /^on[A-Z]/.test(prop.name) && /=>|Function|Handler/.test(prop.type)).map((prop) => prop.name);
  const dom = entry?.extends && /HTMLAttributes/.test(entry.extends) ? ["onClick"] : [];
  return [...new Set([...written.filter((prop) => /^on[A-Z]/.test(prop)), ...dom, ...own])];
}

/** The node at `loc` (props, children, list rows and element-valued props included). */
function findNode(tree: PageTree | null, loc: string): PageNode | null {
  const stack: PageNode[] = tree?.board ? [tree.board] : [];
  while (stack.length) {
    const node = stack.pop()!;
    if (node.loc === loc) return node;
    for (const child of node.children) {
      if (child.kind === "element") stack.push(child);
      else if (child.kind === "map") stack.push(child.node);
    }
    const values: PageValue[] = Object.values(node.props);
    while (values.length) {
      const value = values.pop()!;
      if (value.kind === "element") stack.push(value.node);
      else if (value.kind === "array") values.push(...value.items);
      else if (value.kind === "object") values.push(...Object.values(value.fields));
    }
  }
  return null;
}

const literalOf = (node: PageNode, prop: string) => { const value = node.props[prop]; return value?.kind === "literal" ? value.value : undefined; };

/** The Board's frames (dialect.mjs boardFrames, computed here from the tree). */
function framesOf(tree: PageTree | null) {
  return (tree?.board?.children ?? []).filter((child): child is PageNode => child.kind === "element").map((node) => ({
    kind: node.name === "Overlay" ? "overlay" as const : "screen" as const,
    id: String(literalOf(node, "id") ?? ""),
    state: literalOf(node, "state") as string | undefined,
    title: String(literalOf(node, "title") ?? literalOf(node, "id") ?? ""),
    device: (literalOf(node, "device") as string | undefined) ?? "desktop",
  }));
}

export function PrototypePanel() {
  const localPage = useStudio((state) => state.localPage);
  const selection = useStudio((state) => state.selection);
  const admin = useStudio((state) => state.role === "admin");
  const page = usePage(localPage);
  const tree = usePageTree(page?.text);
  const frames = useMemo(() => framesOf(tree), [tree]);
  if (!localPage || !page) return null;
  const file = pageFile(localPage);
  const src = selection?.kind === "node" ? parseSrc(selection.src) : null;
  const node = src && src.file === file ? findNode(tree, src.loc) : null;

  const addFrame = (kind: "screen" | "overlay") => addBoardFrame(localPage, kind);

  return (
    <div className="studio-prototype" data-e2e="prototype-panel">
      <InspectorSection
        title="Flow"
        actions={<Button appearance="main" level="primary" size="sm" startIcon={<Icon name="icon-play-line" decorative />} aria-keyshortcuts="P" onClick={() => startPlay(null)}>Play</Button>}
      >
        <ul className="studio-prototype__frames" aria-label="Screens and overlays">
          {frames.map((frame) => (
            <li key={`${frame.kind}:${frame.id}:${frame.state ?? ""}`} className="studio-prototype__frame">
              <Icon name={frame.kind === "overlay" ? "icon-layers-three-01-line" : "icon-mobile-line"} size="sm" decorative />
              <Text as="span" textStyle="Body/Small/Medium" className="studio-prototype__frame-name">{frame.title}</Text>
              <Text as="span" textStyle="Caption/Regular" tone="base">{frame.state ? `${frame.id} · ${frame.state}` : frame.id}</Text>
            </li>
          ))}
        </ul>
        <div className="studio-prototype__add">
          <Button appearance="main" level="tertiary" size="sm" disabled={!admin || !tree?.board} startIcon={<Icon name="icon-plus-line" decorative />} onClick={() => void addFrame("screen")}>Add screen</Button>
          <Button appearance="main" level="tertiary" size="sm" disabled={!admin || !tree?.board} startIcon={<Icon name="icon-plus-line" decorative />} onClick={() => void addFrame("overlay")}>Add overlay</Button>
        </div>
      </InspectorSection>
      <InspectorSection title="Interactions">
        {node && src ? <Interactions key={src.loc} node={node} file={file} loc={src.loc} frames={frames} home={selection?.kind === "node" ? selection.frameId : null} disabled={!admin} /> : (
          <Text tone="base" textStyle="Body/Small/Regular">Select a button or another control on the canvas to give it an action.</Text>
        )}
      </InspectorSection>
    </div>
  );
}

type Frame = ReturnType<typeof framesOf>[number];

/** `home`: the frame the element is on ("screen:<id>[:state]"): Navigate to picks another Screen first. */
function Interactions({ node, file, loc, frames, home, disabled }: { node: PageNode; file: string; loc: string; frames: Frame[]; home: string | null; disabled: boolean }) {
  const triggers = triggersOf(node.name, Object.keys(node.props));
  if (!triggers.length) return <Text tone="base" textStyle="Body/Small/Regular">{`<${node.name}> takes no clicks or other events.`}</Text>;
  return (
    <>
      {triggers.map((trigger) => <TriggerRow key={trigger} trigger={trigger} value={node.props[trigger]} node={node} file={file} loc={loc} frames={frames} home={home} disabled={disabled} />)}
    </>
  );
}

function TriggerRow({ trigger, value, node, file, loc, frames, home, disabled }: { trigger: string; value: PageValue | undefined; node: PageNode; file: string; loc: string; frames: Frame[]; home: string | null; disabled: boolean }) {
  const proto = value?.kind === "proto" ? value : null;
  const action: Action = proto ? (proto.action as Action) : "none";
  const arg = proto ? proto.args[0] : undefined;
  const argText = typeof arg === "string" ? arg : arg && typeof arg === "object" && "title" in arg ? String((arg as { title?: unknown }).title ?? "") : "";
  const custom = value !== undefined && !proto;
  const [draft, setDraft] = useState(argText);
  useEffect(() => setDraft(argText), [argText]);

  const write = async (next: Action, target?: string) => {
    if (next === "none") {
      await applyEdit({ file, loc, name: node.name, ops: [{ op: "removeProp", name: trigger } as EditOp] }, `${trigger} → none`);
      return;
    }
    const engine = await loadEngine();
    const homeScreen = home?.startsWith("screen:") ? home.split(":")[1] : null;
    const screenIds = frames.filter((frame) => frame.kind === "screen" && !frame.state).map((frame) => frame.id);
    const fallback = next === "navigate" ? screenIds.find((screen) => screen !== homeScreen) ?? screenIds[0] : next === "open" ? frames.find((frame) => frame.kind === "overlay")?.id : next === "toast" ? "Done" : next === "link" ? "https://" : undefined;
    const code = engine.protoCode(next, target ?? fallback ?? "");
    await applyEdit({ file, loc, name: node.name, ops: [{ op: "setProp", name: trigger, value: { kind: "expression", code } } as EditOp] }, `${trigger} → ${next}`);
  };

  const screens = frames.filter((frame) => frame.kind === "screen" && !frame.state);
  const overlays = frames.filter((frame) => frame.kind === "overlay");
  return (
    <div className="studio-prototype__trigger" data-trigger={trigger}>
      <InspectorRow label={trigger} name={`proto:${trigger}`}>
        <SelectField aria-label={`${trigger} action`} size="sm" disabled={disabled} value={custom ? "" : action} placeholder="Code" onValueChange={(next) => void write(next as Action)} options={ACTIONS} />
      </InspectorRow>
      {action === "navigate" ? (
        <InspectorRow label="Screen" name={`proto:${trigger}:target`}>
          <SelectField aria-label={`${trigger} screen`} size="sm" disabled={disabled} value={argText} placeholder="—" onValueChange={(next) => void write("navigate", next)} options={screens.map((frame) => ({ value: frame.id, label: frame.title }))} />
        </InspectorRow>
      ) : null}
      {action === "open" ? (
        <InspectorRow label="Overlay" name={`proto:${trigger}:target`}>
          <SelectField aria-label={`${trigger} overlay`} size="sm" disabled={disabled || !overlays.length} value={argText} placeholder={overlays.length ? "—" : "Add an overlay first"} onValueChange={(next) => void write("open", next)} options={overlays.map((frame) => ({ value: frame.id, label: frame.id }))} />
        </InspectorRow>
      ) : null}
      {action === "toast" || action === "link" ? (
        <InspectorRow label={action === "toast" ? "Title" : "URL"} name={`proto:${trigger}:target`}>
          <InputField
            aria-label={`${trigger} ${action === "toast" ? "toast title" : "link"}`}
            size="sm"
            disabled={disabled}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={() => { if (draft !== argText) void write(action, draft); }}
            onKeyDown={(event) => { if (event.key === "Enter" && draft !== argText) { event.preventDefault(); void write(action, draft); } }}
          />
        </InspectorRow>
      ) : null}
      {custom ? <Text as="p" tone="base" textStyle="Caption/Regular" className="studio-prototype__note">This handler is code; picking an action replaces it.</Text> : null}
    </div>
  );
}

import { useSyncExternalStore } from "react";
import { typographyStyles } from "../../../tokens/typography.generated";
import { applyEdit, parseSrc, studioApi } from "../api";
import { inspectorStatus } from "../inspector/status";
import { canEdit, studioStore } from "../store";
import type { EditOp, SourceElement } from "../types";
import { isPlainText, mergeRuns, runsCode, textOf, type Run, type RunStyle } from "./richText";
import { removeEmptyText } from "./textCreate";

/*
 * Editing a text layer's words with styles of their own (Figma's mixed styles, F6b): a Text or Heading whose words are
 * plain text and TextRuns. The editor (RichTextEditor.tsx) shows the runs over the text on the canvas; ⌘B / ⌘I / ⌘U /
 * ⇧⌘X style the selected words; leaving writes the Text again with its runs (op replaceElement: its props as written,
 * its children from the runs), one edit and one undo step. A text emptied is deleted (Figma keeps no empty text).
 */

export type RichTarget = {
  /** The Text's rendered element (hidden under the editor while it is open). */
  host: HTMLElement;
  src: string;
  element: SourceElement;
  /** The runs as the editor opens. */
  runs: Run[];
  /** The selection to start with: character offsets, or every word. */
  selection: { start: number; end: number } | "all";
  /** The runs the layer was written with (to leave it untouched when nothing changed). */
  original: Run[];
};

let session: RichTarget | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
export const richTextSession = {
  get: () => session,
  subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
};
export const useRichTextSession = () => useSyncExternalStore(richTextSession.subscribe, richTextSession.get, () => null);
export const endRichTextEdit = () => { session = null; emit(); };

/** typographyStyles' class → the style's name (a run's class back to its textStyle). */
const styleByClass = new Map<string, string>(Object.entries(typographyStyles).map(([name, className]) => [className as string, name]));

/** A rendered run's style (TextRun.tsx writes it as data attributes and a text style class). */
function styleOfElement(element: Element): RunStyle {
  if (!element.classList.contains("zen-text-run")) return {};
  const decoration = element.getAttribute("data-decoration") ?? "";
  const textStyle = [...element.classList].map((name) => styleByClass.get(name)).find(Boolean);
  return {
    ...(element.getAttribute("data-bold") === "true" ? { bold: true } : {}),
    ...(element.getAttribute("data-italic") === "true" ? { italic: true } : {}),
    ...(decoration.includes("underline") ? { underline: true } : {}),
    ...(decoration.includes("strikethrough") ? { strikethrough: true } : {}),
    ...(element.getAttribute("data-tone") ? { tone: element.getAttribute("data-tone")! } : {}),
    ...(textStyle ? { textStyle } : {}),
  };
}

/** The runs a rendered text (or the editor) shows: its words, and the style of the run each sits in. */
export function runsFromDom(root: Node): Run[] {
  const out: Run[] = [];
  const walk = (node: Node, style: RunStyle) => {
    if (node.nodeType === Node.TEXT_NODE) { out.push({ ...style, text: (node.nodeValue ?? "").replace(/​/g, "") }); return; }
    if (!(node instanceof Element)) return;
    if (node.tagName === "BR") { out.push({ ...style, text: "\n" }); return; }
    const own = { ...style, ...styleOfElement(node) };
    node.childNodes.forEach((child) => walk(child, own));
  };
  root.childNodes.forEach((child) => walk(child, {}));
  return mergeRuns(out);
}

/** Draws `runs` into the editor: words as text, a styled run as TextRun's own span (its CSS shows the style). */
export function renderRuns(editor: HTMLElement, runs: readonly Run[]) {
  editor.replaceChildren(...mergeRuns(runs).map((run) => {
    if (isPlainText([run])) return document.createTextNode(run.text);
    const span = document.createElement("span");
    span.className = ["zen-text-run", run.textStyle ? typographyStyles[run.textStyle as keyof typeof typographyStyles] : ""].filter(Boolean).join(" ");
    if (run.bold) span.setAttribute("data-bold", "true");
    if (run.italic) span.setAttribute("data-italic", "true");
    const decoration = [run.underline ? "underline" : "", run.strikethrough ? "strikethrough" : ""].filter(Boolean).join(" ");
    if (decoration) span.setAttribute("data-decoration", decoration);
    if (run.tone) span.setAttribute("data-tone", run.tone);
    span.textContent = run.text;
    return span;
  }));
}

const RICH_PARENTS = new Set(["Text", "Heading"]);

/** Whether a Text / Heading's source is words and TextRuns only (what the rich editor writes back exactly). */
export function isRichSource(element: SourceElement | null | undefined): boolean {
  if (!element || !RICH_PARENTS.has(element.name)) return false;
  return element.children.every((child) => child.kind === "text" || (child.kind === "element" && child.name === "TextRun"));
}

/**
 * Opens the rich editor on the text layer `src` rendered at `host` (its runs read from the canvas). `runs` (the plain
 * editor handing over after ⌘B…) replaces them. False when the layer cannot be edited this way.
 */
export async function startRichTextEdit(src: string, host: HTMLElement, options: { runs?: Run[]; selection?: RichTarget["selection"] } = {}): Promise<boolean> {
  if (!canEdit(studioStore.getState()) || session) return false;
  const at = parseSrc(src);
  const element = at ? await studioApi.element(at.file, at.loc).catch(() => null) : null;
  if (!element || !isRichSource(element) || !host.isConnected) return false;
  const original = runsFromDom(host);
  session = { host, src, element, runs: options.runs ?? original, selection: options.selection ?? "all", original };
  emit();
  return true;
}

const sameRuns = (a: readonly Run[], b: readonly Run[]) => JSON.stringify(mergeRuns(a)) === JSON.stringify(mergeRuns(b));

/** Leaves the rich editor keeping `runs`: the Text written again with them (one edit), or deleted when emptied. */
export async function commitRichTextEdit(target: RichTarget, runs: Run[]) {
  if (session === target) endRichTextEdit();
  const words = textOf(runs);
  if (!words.trim()) { await removeEmptyText(target.src); return; }
  if (sameRuns(runs, target.original)) return;
  const { element } = target;
  const props = element.attributes.map((attribute) => ` ${attribute.raw}`).join("");
  const code = `<${element.name}${props}>${runsCode(runs)}</${element.name}>`;
  const label = isPlainText(runs) ? `${element.name} text → "${words.length > 24 ? `${words.slice(0, 23)}…` : words}"` : `${element.name} text styles`;
  const response = await applyEdit({ file: element.file, loc: element.loc, name: element.name, ops: [{ op: "replaceElement", code } as EditOp], hash: element.hash }, label);
  if (!response.ok) inspectorStatus.set("negative", ("error" in response && response.error) || "The text was not saved");
}

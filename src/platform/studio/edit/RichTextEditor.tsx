import { useCallback, useLayoutEffect, useRef, type ClipboardEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { getViewport } from "../canvas/viewport";
import { usePendingDraft } from "../inspector/drafts";
import { toggleStyle, type ToggleKey } from "./richText";
import { commitRichTextEdit, endRichTextEdit, renderRuns, runsFromDom, useRichTextSession, type RichTarget } from "./richTextEdit";

/*
 * The canvas editor for a text layer with styles of its own (Figma's mixed styles, F6b; richTextEdit.ts). It sits over
 * the text with its font, size, line height and colour, scaled with the zoom; the text under it is hidden while it is
 * open. Keys (Figma): ⌘B bold, ⌘I italic, ⌘U underline, ⇧⌘X strikethrough on the selected words; Enter a new line (a
 * page you made; elsewhere Enter leaves); Esc, Tab or a click outside leave and keep the words.
 */

const COPIED = [
  "font-family", "font-size", "font-weight", "font-style", "font-stretch", "font-variant", "font-feature-settings",
  "font-variation-settings", "font-kerning", "letter-spacing", "word-spacing", "text-transform", "text-align", "direction",
  "text-rendering", "-webkit-font-smoothing", "tab-size", "overflow-wrap", "word-break", "hyphens", "line-height",
] as const;

const FORMAT_KEYS: Record<string, ToggleKey> = { KeyB: "bold", KeyI: "italic", KeyU: "underline" };

/** The selection inside `root` as character offsets of its words. */
function offsetsIn(root: HTMLElement): { start: number; end: number } | null {
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) return null;
  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return null;
  const offsetOf = (container: Node, offset: number) => {
    const probe = document.createRange();
    probe.selectNodeContents(root);
    probe.setEnd(container, offset);
    return probe.toString().length;
  };
  return { start: offsetOf(range.startContainer, range.startOffset), end: offsetOf(range.endContainer, range.endOffset) };
}

/** Selects the words from `start` to `end` (character offsets) inside `root`. */
function selectOffsets(root: HTMLElement, start: number, end: number) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let offset = 0;
  let startSet = false;
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    const length = node.nodeValue?.length ?? 0;
    if (!startSet && start <= offset + length) { range.setStart(node, start - offset); startSet = true; }
    if (startSet && end <= offset + length) { range.setEnd(node, end - offset); break; }
    offset += length;
  }
  if (!startSet) { range.selectNodeContents(root); range.collapse(false); }
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function Editor({ target, viewport }: { target: RichTarget; viewport: HTMLElement }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(false);

  const finish = useCallback((keep: boolean) => {
    if (doneRef.current) return;
    doneRef.current = true;
    const editor = editorRef.current;
    if (keep && editor) void commitRichTextEdit(target, runsFromDom(editor));
    else endRichTextEdit();
    if (editor && document.activeElement === editor) viewport.focus({ preventScroll: true });
  }, [target, viewport]);

  // ⌘S and a selection change commit the words first.
  usePendingDraft(() => finish(true));

  useLayoutEffect(() => {
    const editor = editorRef.current;
    if (!editor) return undefined;
    const { host } = target;
    const style = getComputedStyle(host);
    COPIED.forEach((name) => editor.style.setProperty(name, style.getPropertyValue(name)));
    editor.style.color = style.color;
    renderRuns(editor, target.runs);
    host.setAttribute("data-studio-text-editing", "");
    let frame = 0;
    const place = () => {
      frame = requestAnimationFrame(place);
      if (!host.isConnected) return;
      const zoom = getViewport().zoom || 1;
      const view = viewport.getBoundingClientRect();
      const rect = host.getBoundingClientRect();
      const lines = Math.round(rect.height / zoom / (Number.parseFloat(style.lineHeight) || rect.height / zoom));
      // A text that wraps keeps its box's width; one line grows with the words (Figma's Auto width).
      editor.style.width = lines > 1 || style.whiteSpace === "normal" && host.scrollWidth > host.clientWidth ? `${rect.width / zoom}px` : "max-content";
      editor.style.whiteSpace = lines > 1 ? "pre-wrap" : style.whiteSpace === "nowrap" || style.whiteSpace === "pre" ? "pre" : "pre-wrap";
      editor.style.transform = `translate(${rect.left - view.left}px, ${rect.top - view.top}px) scale(${zoom})`;
      editor.style.setProperty("--studio-edit-zoom", String(zoom));
    };
    place();
    editor.focus({ preventScroll: true });
    if (target.selection === "all") selectOffsets(editor, 0, editor.textContent?.length ?? 0);
    else selectOffsets(editor, target.selection.start, target.selection.end);
    return () => {
      cancelAnimationFrame(frame);
      host.removeAttribute("data-studio-text-editing");
    };
  }, [target, viewport]);

  const format = (key: ToggleKey) => {
    const editor = editorRef.current;
    const at = editor ? offsetsIn(editor) : null;
    if (!editor || !at) return;
    renderRuns(editor, toggleStyle(runsFromDom(editor), at.start, at.end, key));
    selectOffsets(editor, at.start, at.end);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    const mod = event.metaKey || event.ctrlKey;
    const key = mod && !event.altKey ? (event.shiftKey ? (event.code === "KeyX" ? "strikethrough" : null) : FORMAT_KEYS[event.code]) : null;
    if (key) { event.preventDefault(); format(key); return; }
    // Enter: a new line in a text of a page you made (Figma's); elsewhere it leaves, as the plain editor does.
    if (event.key === "Enter" && target.element.file.startsWith("local:")) { event.preventDefault(); document.execCommand("insertText", false, "\n"); return; }
    if (event.key === "Escape" || event.key === "Tab" || event.key === "Enter") { event.preventDefault(); finish(true); }
  };

  // Pasted words come in as plain text, in the style at the caret.
  const onPaste = (event: ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    document.execCommand("insertText", false, event.clipboardData.getData("text/plain"));
  };

  const onBlur = () => { if (document.hasFocus()) finish(true); };

  return (
    <div
      ref={editorRef}
      className="studio-edit__text"
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-label={`Edit ${target.element.name} text`}
      aria-multiline
      spellCheck={false}
      onKeyDown={onKeyDown}
      onPaste={onPaste}
      onBlur={onBlur}
      onPointerDown={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.stopPropagation()}
    />
  );
}

/** The rich text editor; renders nothing until a rich edit starts (richTextEdit.ts). */
export function RichTextEditor({ viewport }: { viewport: HTMLElement | null }) {
  const target = useRichTextSession();
  if (!target || !viewport) return null;
  return <Editor key={target.src} target={target} viewport={viewport} />;
}

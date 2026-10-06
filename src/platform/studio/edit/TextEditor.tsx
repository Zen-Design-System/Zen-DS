import { useCallback, useLayoutEffect, useRef, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { typographyStyles } from "../../../tokens/typography.generated";
import { usePendingDraft } from "../inspector/drafts";
import { commitTextEdit, endTextEdit, restoreText, takeTypedAhead, useTextEditSession, zoomOf, type TextTarget } from "./textEdit";

/*
 * The in-place text editor (Figma's text edit mode). It sits over the rendered text with the same font, size, weight,
 * line height, letter spacing, colour and wrap width, scaled with the canvas zoom; the rendered text itself is hidden
 * (data-studio-text-editing) but takes every keystroke, so the frame reflows live and the editor follows it each frame.
 *
 * Keys (Figma): Enter, Esc and Tab leave the editor and keep the text (⇧Enter is a line break where the text keeps
 * line breaks); a click outside keeps it too; ⌘Z inside undoes typing, after leaving it undoes the whole edit; ⌘S
 * commits the text first, then saves. An IME composition (Vietnamese Telex, CJK) is never cut short by Enter.
 */

/** Text properties the editor takes from the element that renders the text. */
const COPIED = [
  "font-family", "font-size", "font-weight", "font-style", "font-stretch", "font-variant", "font-feature-settings",
  "font-variation-settings", "font-kerning", "font-optical-sizing", "letter-spacing", "word-spacing", "text-transform",
  "text-align", "direction", "text-rendering", "-webkit-font-smoothing", "tab-size", "overflow-wrap", "word-break", "hyphens",
] as const;

const px = (value: string) => Number.parseFloat(value) || 0;

/** The box the text wraps in: the host, or its nearest ancestor that is not an inline box. */
function wrapBox(host: HTMLElement): HTMLElement {
  let box: HTMLElement = host;
  for (let guard = 0; guard < 8 && box.parentElement; guard++) {
    const display = getComputedStyle(box).display;
    if (display !== "inline" && display !== "contents") break;
    box = box.parentElement;
  }
  return box;
}

function rectsOf(node: Text): DOMRect[] {
  const range = document.createRange();
  range.selectNodeContents(node);
  return Array.from(range.getClientRects()).filter((rect) => rect.width > 0 || rect.height > 0);
}

function placeCaret(editor: HTMLElement, caret: TextTarget["caret"]) {
  const selection = window.getSelection();
  if (!selection) return;
  const range = document.createRange();
  const text = editor.firstChild;
  if (caret === "all" || !text) range.selectNodeContents(editor);
  else {
    range.setStart(text, Math.min(caret, text.textContent?.length ?? 0));
    range.collapse(true);
  }
  selection.removeAllRanges();
  selection.addRange(range);
}

function Editor({ target, viewport }: { target: TextTarget; viewport: HTMLElement }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLSpanElement>(null);
  const doneRef = useRef(false);

  const finish = useCallback((keep: boolean) => {
    if (doneRef.current) return;
    doneRef.current = true;
    const editor = editorRef.current;
    if (keep) commitTextEdit(target, editor?.textContent ?? target.original);
    else {
      restoreText(target);
      endTextEdit();
    }
    // Back to the canvas, so its keys (Enter edits again, Esc selects the parent) work at once.
    if (editor && document.activeElement === editor) viewport.focus({ preventScroll: true });
  }, [target, viewport]);

  // ⌘S (Save all) and a selection change commit the typed text first.
  usePendingDraft(() => finish(true));

  useLayoutEffect(() => {
    const editor = editorRef.current;
    if (!editor) return undefined;
    const { host, node } = target;
    const style = getComputedStyle(host);
    COPIED.forEach((name) => editor.style.setProperty(name, style.getPropertyValue(name)));
    editor.style.color = style.color;
    editor.textContent = node.nodeValue ?? target.original;
    host.setAttribute("data-studio-text-editing", "");

    let frame = 0;
    const place = () => {
      frame = requestAnimationFrame(place);
      if (!node.isConnected) return;
      const rects = rectsOf(node);
      if (!rects.length) return;
      const zoom = zoomOf(node);
      const view = viewport.getBoundingClientRect();
      const first = rects[0];
      const content = first.height / zoom;
      const lineHeight = style.lineHeight === "normal" ? content : px(style.lineHeight);
      const half = (lineHeight - content) / 2;
      let left = first.left;
      if (rects.length > 1) {
        // Wrapped: the editor takes the wrap box's content width and indents its first line like the text.
        const box = wrapBox(host);
        const boxStyle = getComputedStyle(box);
        const boxRect = box.getBoundingClientRect();
        const inLeft = px(boxStyle.paddingLeft) + px(boxStyle.borderLeftWidth);
        const inRight = px(boxStyle.paddingRight) + px(boxStyle.borderRightWidth);
        left = boxRect.left + inLeft * zoom;
        editor.style.whiteSpace = "pre-wrap";
        editor.style.width = `${Math.max(1, boxRect.width / zoom - inLeft - inRight)}px`;
        editor.style.textIndent = `${(first.left - left) / zoom}px`;
      } else {
        editor.style.whiteSpace = target.multiline ? "pre-wrap" : "pre";
        editor.style.width = "max-content";
        editor.style.textIndent = "0px";
      }
      editor.style.lineHeight = `${lineHeight}px`;
      editor.style.transform = `translate(${left - view.left}px, ${first.top - half * zoom - view.top}px) scale(${zoom})`;
      editor.style.setProperty("--studio-edit-zoom", String(zoom));
      const hint = hintRef.current;
      if (hint) hint.style.transform = `translate(${left - view.left}px, ${first.top - half * zoom - view.top}px)`;
    };
    place();
    editor.focus({ preventScroll: true });
    placeCaret(editor, target.caret);
    // Keys typed while the editor was opening replace the selection (or go in at the caret), as typing would.
    const typed = takeTypedAhead();
    if (typed) document.execCommand("insertText", false, typed);
    return () => {
      cancelAnimationFrame(frame);
      host.removeAttribute("data-studio-text-editing");
    };
  }, [target, viewport]);

  const onInput = () => {
    const editor = editorRef.current;
    if (!editor) return;
    let value = editor.textContent ?? "";
    if (!target.multiline && /\n/.test(value)) {
      // A pasted line break in a one-line text: a space, caret at the end.
      value = value.replace(/\s*\n\s*/g, " ");
      editor.textContent = value;
      placeCaret(editor, value.length);
    }
    // A zero-width space keeps an emptied text's line box, so the editor stays in place.
    if (target.node.isConnected) target.node.nodeValue = value || "​";
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    // The canvas shortcuts (Delete, arrows, V/H/I…) stay out while typing; ⌘S and ⌘K listen in the capture phase.
    event.stopPropagation();
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    if (event.key === "Enter" && event.shiftKey && target.multiline) return;
    if (event.key === "Enter" || event.key === "Escape" || event.key === "Tab") {
      event.preventDefault();
      finish(true);
    }
  };

  // Leaving the window (another app) keeps the editor open, as Figma does; any other blur commits.
  const onBlur = () => { if (document.hasFocus()) finish(true); };

  const label = target.op.kind === "prop" ? `${target.element.name} ${target.op.name}` : `${target.element.name} text`;
  return (
    <>
      {target.instances > 1 ? (
        <span ref={hintRef} className={`studio-edit__hint ${typographyStyles["Caption/Medium"]}`}>
          {`Edits all ${target.instances} places`}
        </span>
      ) : null}
      <div
        ref={editorRef}
        className="studio-edit__text"
        contentEditable="plaintext-only"
        suppressContentEditableWarning
        role="textbox"
        aria-label={`Edit ${label}`}
        aria-multiline={target.multiline}
        spellCheck={false}
        onInput={onInput}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        onPointerDown={(event) => event.stopPropagation()}
        onDoubleClick={(event) => event.stopPropagation()}
        onContextMenu={(event) => event.stopPropagation()}
      />
    </>
  );
}

/** The canvas text editor; renders nothing until a text edit starts (textEdit.ts). */
export function TextEditor({ viewport }: { viewport: HTMLElement | null }) {
  const target = useTextEditSession();
  if (!target || !viewport) return null;
  const part = target.op.kind === "prop" ? target.op.name : target.op.kind === "text" ? target.op.index : `${target.op.prop ?? target.op.child}@${target.op.row ?? ""}`;
  return <Editor key={`${target.src}|${target.op.kind}|${part}`} target={target} viewport={viewport} />;
}

import { useEffect, useState, type CSSProperties } from "react";
import { visibleThreads, type CommentAnchor, type CommentThread } from "../../../../tools/studio/page-comments.mjs";
import { canvasApi, getViewport } from "../canvas/viewport";
import { ChromeScope } from "../shell/ChromeScope";
import { studioStore, useStudio } from "../store";
import { CommentAvatar, CommentPopover } from "./CommentPopover";
import { useCommenter, usePageComments } from "./commentStore";
import { commentUi, useCommentUi } from "./commentUi";
import "./comments.css";

/*
 * Figma's comments on the canvas (the Comment tool, C; spec docs/research/studio-comments-spec-2026-10-22.md), on a
 * page you made: each thread's pin (its first author's avatar in a speech bubble whose corner is the place), a click on
 * the canvas puts a new pin there and opens its popover for the first comment, a click on a pin opens its thread. A pin
 * on a frame keeps its place in the frame (it moves with it); elsewhere it keeps its place on the board. Pins show
 * while the tool is on (Figma's), resolved ones only with "Show resolved comments" (the panel).
 */

const CHROME = ".studio-chrome, .studio-chrome-portal";
const FRAMES = ".studio-builder-board__frames";
const POPOVER_WIDTH = 320;
const PIN = 32;

const frameElement = (id: string) => document.querySelector<HTMLElement>(`[data-studio-frame="${CSS.escape(id)}"]`);

/** Where a press at (x, y) on the screen pins a comment: the frame on top there, else the board. */
export function anchorAt(clientX: number, clientY: number): CommentAnchor | null {
  const { zoom } = getViewport();
  const round = (value: number) => Math.round(value * 10) / 10;
  for (const element of document.elementsFromPoint(clientX, clientY)) {
    const frame = element.closest<HTMLElement>("[data-studio-frame]");
    const id = frame?.dataset.studioFrame;
    if (!frame || !id || id.startsWith("slice:")) continue;
    const rect = frame.getBoundingClientRect();
    return { frame: id, x: round((clientX - rect.left) / zoom), y: round((clientY - rect.top) / zoom) };
  }
  const board = document.querySelector<HTMLElement>(FRAMES);
  if (!board) return null;
  const rect = board.getBoundingClientRect();
  return { x: round((clientX - rect.left) / zoom), y: round((clientY - rect.top) / zoom) };
}

/** A pin's place on the screen, relative to the viewport; null when its frame is no longer on the board. */
export function pinPoint(anchor: CommentAnchor, view: DOMRect): { x: number; y: number } | null {
  const { zoom } = getViewport();
  const host = anchor.frame ? frameElement(anchor.frame) : document.querySelector<HTMLElement>(FRAMES);
  if (!host) return null;
  const rect = host.getBoundingClientRect();
  return { x: rect.left - view.left + anchor.x * zoom, y: rect.top - view.top + anchor.y * zoom };
}

/** The popover beside its pin: to the right, or to the left when the right has no room; inside the viewport. */
function popoverPlace(point: { x: number; y: number }, view: DOMRect): CSSProperties {
  const right = point.x + PIN + 8;
  const left = right + POPOVER_WIDTH > view.width - 8 ? Math.max(8, point.x - POPOVER_WIDTH - 8) : right;
  const top = Math.min(Math.max(8, point.y - PIN), Math.max(8, view.height - 360));
  return { transform: `translate(${left}px, ${top}px)`, width: POPOVER_WIDTH };
}

const summary = (thread: CommentThread) => {
  const first = thread.comments.find((comment) => !comment.deleted) ?? thread.comments[0];
  const replies = thread.comments.length - 1;
  return `Comment by ${first?.author.name ?? ""}: ${first?.deleted ? "deleted" : first?.text ?? ""}${replies > 0 ? `, ${replies} ${replies === 1 ? "reply" : "replies"}` : ""}${thread.resolved ? ", resolved" : ""}`;
};

export function CommentsLayer({ viewport }: { viewport: HTMLElement | null }) {
  const localPage = useStudio((state) => state.localPage);
  const on = useStudio((state) => state.tool === "comment") && Boolean(localPage);
  const doc = usePageComments(on ? localPage : null);
  const ui = useCommentUi();
  const me = useCommenter();
  const [, redraw] = useState(0);
  useEffect(() => canvasApi.onChange(() => redraw((count) => count + 1)), []);

  // A press on the canvas: a new pin there (Figma's), or, while a thread is open, closes it first.
  useEffect(() => {
    if (!on || !viewport) return undefined;
    viewport.setAttribute("data-studio-commenting", "");
    const onDown = (event: PointerEvent) => {
      if (event.button !== 0 || !(event.target instanceof Element) || !viewport.contains(event.target) || event.target.closest(CHROME)) return;
      event.preventDefault();
      event.stopPropagation();
      const current = commentUi.get();
      if (current.open || current.draft) { commentUi.set({ open: null, draft: null }); return; }
      const anchor = anchorAt(event.clientX, event.clientY);
      if (anchor) commentUi.set({ draft: anchor, open: null });
    };
    window.addEventListener("pointerdown", onDown, true);
    return () => {
      window.removeEventListener("pointerdown", onDown, true);
      viewport.removeAttribute("data-studio-commenting");
      commentUi.set({ open: null, draft: null });
    };
  }, [on, viewport]);

  // Esc with nothing open: back to Move (Figma's); an open thread closes first (its field handles Esc itself).
  useEffect(() => {
    if (!on) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      const target = event.target instanceof Element ? event.target : null;
      // A menu or list owns its Esc; so does a field outside the popover (the right panel's, Find's).
      if (target?.closest("[role='menu'], [role='listbox']") || (target?.closest("input, textarea, select") && !target.closest(".studio-comment-popover"))) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const current = commentUi.get();
      if (current.open || current.draft) { commentUi.set({ open: null, draft: null }); viewport?.focus(); }
      else studioStore.setState({ tool: "select" });
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [on, viewport]);

  if (!on || !viewport || !localPage) return null;
  const view = viewport.getBoundingClientRect();
  const threads = visibleThreads(doc, { resolved: ui.showResolved });
  const open = ui.open ? doc.threads.find((thread) => thread.id === ui.open && !thread.deleted) ?? null : null;
  const openPoint = open ? pinPoint(open.anchor, view) : ui.draft ? pinPoint(ui.draft, view) : null;
  return (
    <ChromeScope className="studio-comments" aria-label="Comments">
      {threads.map((thread) => {
        const point = pinPoint(thread.anchor, view);
        const first = thread.comments[0];
        if (!point || !first) return null;
        return (
          <button
            key={thread.id}
            type="button"
            className="studio-comment-pin"
            data-resolved={thread.resolved || undefined}
            aria-pressed={ui.open === thread.id}
            aria-label={summary(thread)}
            style={{ transform: `translate(${point.x}px, ${point.y - PIN}px)` }}
            onClick={() => commentUi.set({ open: ui.open === thread.id ? null : thread.id, draft: null })}
          >
            <CommentAvatar author={first.author} />
          </button>
        );
      })}
      {ui.draft && openPoint ? (
        <span className="studio-comment-pin" data-draft="" aria-hidden="true" style={{ transform: `translate(${openPoint.x}px, ${openPoint.y - PIN}px)` }}>
          {me ? <CommentAvatar author={me} /> : null}
        </span>
      ) : null}
      {openPoint && (open || ui.draft) ? <CommentPopover key={open?.id ?? "draft"} page={localPage} thread={open} draft={open ? null : ui.draft} style={popoverPlace(openPoint, view)} /> : null}
    </ChromeScope>
  );
}

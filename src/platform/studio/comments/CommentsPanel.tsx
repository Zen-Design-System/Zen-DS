import { Checkbox } from "../../../components/Checkbox";
import { EmptyState } from "../../../components/EmptyState";
import { Icon } from "../../../components/Icon";
import { Text } from "../../../components/Text";
import { visibleThreads, type CommentThread } from "../../../../tools/studio/page-comments.mjs";
import { canvasApi } from "../canvas/viewport";
import { InspectorSection } from "../inspector/Section";
import { CommentAvatar, commentTime } from "./CommentPopover";
import { pinPoint } from "./CommentsLayer";
import { usePageComments } from "./commentStore";
import { commentUi, useCommentUi } from "./commentUi";
import "./comments.css";

/*
 * The right panel while the Comment tool is on (Figma's comments list): the page's threads, newest first, each with
 * its first comment, author, when and replies; a click opens the thread at its pin (the canvas scrolls to it). "Show
 * resolved" adds the resolved ones (Figma's "Show resolved comments").
 */

/** Opens a thread and brings its pin and popover into view. */
function openThread(thread: CommentThread) {
  commentUi.set({ open: thread.id, draft: null });
  const viewport = canvasApi.getViewportElement();
  const point = viewport ? pinPoint(thread.anchor, viewport.getBoundingClientRect()) : null;
  if (!viewport || !point) return;
  const view = viewport.getBoundingClientRect();
  canvasApi.ensureVisible(new DOMRect(view.left + point.x, view.top + point.y - 32, 360, 320));
}

export function CommentsPanel({ localPage }: { localPage: string }) {
  const doc = usePageComments(localPage);
  const ui = useCommentUi();
  const threads = visibleThreads(doc, { resolved: ui.showResolved }).slice().sort((a, b) => (b.comments.at(-1)?.at ?? 0) - (a.comments.at(-1)?.at ?? 0));
  return (
    <InspectorSection title="Comments">
      <Checkbox label="Show resolved" checked={ui.showResolved} onCheckedChange={(checked) => commentUi.set({ showResolved: checked })} />
      {threads.length ? (
        <ul className="studio-comments-list" aria-label="Comments on this page">
          {threads.map((thread) => {
            const first = thread.comments[0];
            if (!first) return null;
            const replies = thread.comments.length - 1;
            const placed = Boolean(canvasApi.getViewportElement() && pinPoint(thread.anchor, canvasApi.getViewportElement()!.getBoundingClientRect()));
            return (
              <li key={thread.id}>
                <button type="button" className="studio-comments-list__row" aria-current={ui.open === thread.id || undefined} data-resolved={thread.resolved || undefined} onClick={() => openThread(thread)}>
                  <CommentAvatar author={first.author} />
                  <span className="studio-comments-list__body">
                    <span className="studio-comments-list__head">
                      <Text textStyle="Body/Small/Bold">{first.author.name}</Text>
                      <Text textStyle="Caption/Regular" tone="light">{commentTime(thread.comments.at(-1)?.at ?? first.at)}</Text>
                      {thread.resolved ? <Icon name="icon-check-circle-solid" size="xs" aria-label="Resolved" /> : null}
                    </span>
                    <Text textStyle="Body/Small/Regular" className="studio-comments-list__text">{first.deleted ? "Comment deleted" : first.text}</Text>
                    {replies > 0 || !placed ? (
                      <Text textStyle="Caption/Regular" tone="light">{[replies > 0 ? `${replies} ${replies === 1 ? "reply" : "replies"}` : "", placed ? "" : "Its frame was deleted"].filter(Boolean).join(" · ")}</Text>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState size="sm" title="No comments yet" headingLevel={2} compactTitle icon="icon-message-chat-circle-line">
          Click the canvas to add one.
        </EmptyState>
      )}
    </InspectorSection>
  );
}

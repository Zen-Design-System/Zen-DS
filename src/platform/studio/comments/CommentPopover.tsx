import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Avatar, avatarThemes, type AvatarTheme } from "../../../components/Avatar";
import { Button, IconButton } from "../../../components/Button";
import { InputField, TextAreaField } from "../../../components/Input";
import { Menu } from "../../../components/Menu";
import { Text } from "../../../components/Text";
import { addThread, COMMENT_COLORS, deleteComment, deleteThread, reply, resolve, shownComments, type CommentAnchor, type CommentAuthor, type CommentThread, type PageComment } from "../../../../tools/studio/page-comments.mjs";
import { announceEditStatus } from "../api";
import { useStudio } from "../store";
import { changeComments, newCommentId, setCommenter, useCommenter } from "./commentStore";
import { commentUi } from "./commentUi";

/*
 * A comment thread's popover beside its pin (Figma's): every comment with its author and when, the reply field, Resolve
 * (✓) and ⋯ (Delete thread). A new pin opens it empty, for the first comment. The first time this browser comments it
 * asks for a name (kept for the next times). Anyone who can open the page comments (a Viewer too, Figma's); the author
 * or an Admin deletes. Enter posts, ⇧Enter adds a line, Esc closes (CommentsLayer.tsx).
 */

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]?.toUpperCase() ?? "").join("") || "?";
/** When a comment was written, as Figma says it ("Just now", "5m ago", then the date). */
export const commentTime = (at: number) => {
  const minutes = Math.round((Date.now() - at) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}h ago`;
  return new Date(at).toLocaleDateString();
};

export function CommentAvatar({ author, size = "xs" }: { author: CommentAuthor; size?: "2xs" | "xs" | "sm" }) {
  return <Avatar size={size} theme={avatarThemes.includes(author.color as AvatarTheme) ? (author.color as AvatarTheme) : "violet"} alt={author.name}>{initials(author.name)}</Avatar>;
}

function CommentRow({ comment, canDelete, onDelete }: { comment: PageComment; canDelete: boolean; onDelete: () => void }) {
  return (
    <li className="studio-comment">
      <CommentAvatar author={comment.author} />
      <div className="studio-comment__body">
        <div className="studio-comment__head">
          <Text textStyle="Body/Small/Bold">{comment.author.name}</Text>
          <Text textStyle="Caption/Regular" tone="light">{commentTime(comment.at)}{comment.editedAt && !comment.deleted ? " · edited" : ""}</Text>
          {canDelete && !comment.deleted ? (
            <Menu
              align="end"
              trigger={<IconButton icon="icon-dots-horizontal-line" aria-label={`More for ${comment.author.name}'s comment`} appearance="flat" level="secondary" size="xs" />}
              items={[{ id: "delete", label: "Delete comment", icon: "icon-trash-line", danger: true, onSelect: onDelete }]}
            />
          ) : null}
        </div>
        <Text textStyle="Body/Small/Regular" tone={comment.deleted ? "light" : undefined}>{comment.deleted ? "Comment deleted" : comment.text}</Text>
      </div>
    </li>
  );
}

export function CommentPopover({ page, thread, draft, style }: { page: string; thread: CommentThread | null; draft: CommentAnchor | null; style: React.CSSProperties }) {
  const me = useCommenter();
  const admin = useStudio((state) => state.role === "admin");
  const [text, setText] = useState("");
  const [name, setName] = useState(me?.name ?? "");
  const field = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { field.current?.focus(); }, [thread?.id, draft]);
  const close = () => commentUi.set({ open: null, draft: null });
  const say = (message: string) => announceEditStatus({ kind: "unchanged", message, at: Date.now() });

  const post = () => {
    const body = text.trim();
    if (!body) return;
    let author = me;
    if (!author) {
      if (!name.trim()) { say("Add your name to comment"); return; }
      author = { name: name.trim(), color: COMMENT_COLORS[Math.floor(Math.random() * COMMENT_COLORS.length)] };
      setCommenter(author);
    }
    const comment = { id: newCommentId("c"), author, text: body, at: Date.now() };
    if (thread) {
      if (changeComments(page, (doc) => reply(doc, thread.id, comment))) setText("");
      return;
    }
    if (!draft) return;
    const id = newCommentId("t");
    // The thread opens at once (its popover takes the next words as a reply), while it is written in the background.
    if (changeComments(page, (doc) => addThread(doc, { id, anchor: draft, comment }))) {
      setText("");
      commentUi.set({ open: id, draft: null });
    }
  };
  const onKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); post(); }
  };
  const mine = (comment: PageComment) => Boolean(me && comment.author.name === me.name);

  return (
    <div className="studio-comment-popover" role="dialog" aria-label={thread ? `Comment by ${thread.comments[0]?.author.name ?? ""}` : "New comment"} style={style}>
      {thread ? (
        <header className="studio-comment-popover__head">
          <Text textStyle="Body/Small/Bold">Comment</Text>
          <span className="studio-comment-popover__actions">
            <IconButton
              icon={thread.resolved ? "icon-check-circle-solid" : "icon-check-circle-line"}
              aria-label={thread.resolved ? "Reopen" : "Resolve"}
              aria-pressed={thread.resolved}
              appearance="flat"
              level="secondary"
              size="xs"
              onClick={() => { if (changeComments(page, (doc) => resolve(doc, thread.id, !thread.resolved, Date.now())) && !thread.resolved) close(); }}
            />
            {admin || mine(thread.comments[0]) ? (
              <Menu
                align="end"
                trigger={<IconButton icon="icon-dots-horizontal-line" aria-label="More thread actions" appearance="flat" level="secondary" size="xs" />}
                items={[{ id: "delete-thread", label: "Delete thread", icon: "icon-trash-line", danger: true, onSelect: () => { if (changeComments(page, (doc) => deleteThread(doc, thread.id, Date.now()))) close(); } }]}
              />
            ) : null}
            <IconButton icon="icon-x-line" aria-label="Close" appearance="flat" level="secondary" size="xs" onClick={close} />
          </span>
        </header>
      ) : null}
      {thread ? (
        <ul className="studio-comment-popover__list">
          {shownComments(thread).map((comment) => (
            <CommentRow key={comment.id} comment={comment} canDelete={admin || mine(comment)} onDelete={() => { changeComments(page, (doc) => deleteComment(doc, thread.id, comment.id, Date.now())); }} />
          ))}
        </ul>
      ) : null}
      {me ? null : <InputField size="sm" label="Your name" value={name} maxLength={60} onValueChange={setName} placeholder="Shown with your comments" />}
      <div className="studio-comment-popover__compose">
        <TextAreaField ref={field} aria-label={thread ? "Reply" : "Add a comment"} placeholder={thread ? "Reply" : "Add a comment"} rows={2} value={text} maxLength={4000} onValueChange={setText} onKeyDown={onKey} />
        <Button level="primary" size="sm" style={{ justifySelf: "end" }} disabled={!text.trim()} onClick={() => post()}>{thread ? "Reply" : "Post"}</Button>
      </div>
    </div>
  );
}

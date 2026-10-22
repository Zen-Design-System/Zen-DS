// A page's comments (Figma's Comment tool, C; spec docs/research/studio-comments-spec-2026-10-22.md): the data kept
// beside the page file (`<page>.comments.json`), pure functions the browser and the dev server share.
//
//   emptyComments() → { format: 1, threads: [] }
//   validateComments(doc) → [message…]   (the shape and the limits; [] when it is fine)
//   addThread(doc, { id, anchor, comment }) · reply(doc, threadId, comment) · resolve(doc, threadId, resolved, at)
//   editComment(doc, threadId, commentId, text, at) · deleteComment(doc, threadId, commentId, at) · deleteThread(doc, threadId, at)
//   mergeComments(a, b) → the two copies joined: threads and comments by id, the later change winning
//   visibleThreads(doc, { resolved }) → the threads to show, newest first, without tombstones
//
// Every function returns a new document (the old one is left as it was). A deleted comment or thread stays as a
// tombstone (`deleted: true`), so a merge with an older copy never brings it back. No imports.

export const COMMENTS_FORMAT = 1;
export const COMMENT_LIMITS = { threads: 500, comments: 200, text: 4000, name: 60 };
/** The avatar colours a commenter picks from (Zen's Avatar themes). */
export const COMMENT_COLORS = ["violet", "blue", "cyan", "green", "yellow", "orange", "red", "pink"];

export const emptyComments = () => ({ format: COMMENTS_FORMAT, threads: [] });

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const finite = (value) => typeof value === "number" && Number.isFinite(value);
const changedAt = (comment) => Math.max(comment.at ?? 0, comment.editedAt ?? 0);
const threadChangedAt = (thread) => Math.max(thread.resolvedAt ?? 0, thread.deletedAt ?? 0);

/** The problems with `doc` as a comments file (shape and limits); [] when it is fine. */
export function validateComments(doc) {
  const errors = [];
  if (!isObject(doc) || doc.format !== COMMENTS_FORMAT || !Array.isArray(doc.threads)) return ["Comments are { format: 1, threads: [] }"];
  if (doc.threads.length > COMMENT_LIMITS.threads) errors.push(`At most ${COMMENT_LIMITS.threads} threads`);
  const ids = new Set();
  doc.threads.forEach((thread, index) => {
    const where = `Thread ${index + 1}`;
    if (!isObject(thread) || typeof thread.id !== "string" || !thread.id) { errors.push(`${where} needs an id`); return; }
    if (ids.has(thread.id)) errors.push(`${where}: the id ${thread.id} is used twice`);
    ids.add(thread.id);
    const anchor = thread.anchor;
    if (!isObject(anchor) || !finite(anchor.x) || !finite(anchor.y) || (anchor.frame !== undefined && typeof anchor.frame !== "string")) errors.push(`${where} needs its place { x, y } (and its frame, if on one)`);
    if (!Array.isArray(thread.comments) || !thread.comments.length) { errors.push(`${where} holds its comments`); return; }
    if (thread.comments.length > COMMENT_LIMITS.comments) errors.push(`${where}: at most ${COMMENT_LIMITS.comments} comments`);
    thread.comments.forEach((comment, at) => {
      const here = `${where}, comment ${at + 1}`;
      if (!isObject(comment) || typeof comment.id !== "string" || !comment.id) { errors.push(`${here} needs an id`); return; }
      if (typeof comment.text !== "string" || comment.text.length > COMMENT_LIMITS.text) errors.push(`${here}: text of ${COMMENT_LIMITS.text} characters at most`);
      if (!isObject(comment.author) || typeof comment.author.name !== "string" || !comment.author.name.trim() || comment.author.name.length > COMMENT_LIMITS.name) errors.push(`${here} needs its author's name (${COMMENT_LIMITS.name} characters at most)`);
      if (!finite(comment.at)) errors.push(`${here} needs its time`);
    });
  });
  return errors;
}

const withThread = (doc, threadId, change) => ({ ...doc, threads: doc.threads.map((thread) => (thread.id === threadId ? change(thread) : thread)) });

/** A new thread at `anchor` with its first comment. */
export const addThread = (doc, { id, anchor, comment }) => ({ ...doc, threads: [...doc.threads, { id, anchor: { ...anchor }, resolved: false, resolvedAt: 0, comments: [{ ...comment }] }] });
/** A reply at the end of the thread. */
export const reply = (doc, threadId, comment) => withThread(doc, threadId, (thread) => ({ ...thread, comments: [...thread.comments, { ...comment }] }));
/** Resolve (or reopen) a thread. */
export const resolve = (doc, threadId, resolved, at) => withThread(doc, threadId, (thread) => ({ ...thread, resolved, resolvedAt: at }));
/** A comment's new text. */
export const editComment = (doc, threadId, commentId, text, at) => withThread(doc, threadId, (thread) => ({ ...thread, comments: thread.comments.map((comment) => (comment.id === commentId ? { ...comment, text, editedAt: at } : comment)) }));
/** A comment gone (a tombstone: its text cleared). Deleting the first comment deletes the thread, as Figma does. */
export function deleteComment(doc, threadId, commentId, at) {
  const thread = doc.threads.find((entry) => entry.id === threadId);
  if (thread && thread.comments[0]?.id === commentId) return deleteThread(doc, threadId, at);
  return withThread(doc, threadId, (entry) => ({ ...entry, comments: entry.comments.map((comment) => (comment.id === commentId ? { ...comment, text: "", deleted: true, editedAt: at } : comment)) }));
}
/** A thread gone (a tombstone). */
export const deleteThread = (doc, threadId, at) => withThread(doc, threadId, (thread) => ({ ...thread, deleted: true, deletedAt: at, comments: thread.comments.map((comment) => ({ ...comment, text: "", deleted: true, editedAt: at })) }));

/** Two copies of one page's comments joined: threads and comments by id, the later change winning (tombstones too). */
export function mergeComments(a, b) {
  const threads = new Map();
  for (const thread of [...(a?.threads ?? []), ...(b?.threads ?? [])]) {
    const known = threads.get(thread.id);
    if (!known) { threads.set(thread.id, { ...thread, comments: [...thread.comments] }); continue; }
    const comments = new Map(known.comments.map((comment) => [comment.id, comment]));
    for (const comment of thread.comments) {
      const mine = comments.get(comment.id);
      // The later change wins; at the same moment, a deletion.
      if (!mine || changedAt(comment) > changedAt(mine) || (changedAt(comment) === changedAt(mine) && comment.deleted && !mine.deleted)) comments.set(comment.id, comment);
    }
    const later = threadChangedAt(thread) > threadChangedAt(known) ? thread : known;
    threads.set(thread.id, {
      ...known,
      anchor: later.anchor,
      resolved: later.resolved,
      resolvedAt: later.resolvedAt ?? 0,
      ...(known.deleted || thread.deleted ? { deleted: true, deletedAt: Math.max(known.deletedAt ?? 0, thread.deletedAt ?? 0) } : {}),
      comments: [...comments.values()].sort((x, y) => x.at - y.at),
    });
  }
  return { format: COMMENTS_FORMAT, threads: [...threads.values()] };
}

/** The threads to show (no tombstones; resolved ones only with `resolved`), newest first by their last comment. */
export function visibleThreads(doc, { resolved = false } = {}) {
  const last = (thread) => Math.max(...thread.comments.map(changedAt));
  return (doc?.threads ?? []).filter((thread) => !thread.deleted && (resolved || !thread.resolved)).sort((x, y) => last(y) - last(x));
}

/** A thread's comments as shown (deleted replies leave a line saying so). */
export const shownComments = (thread) => thread.comments.filter((comment, index) => index === 0 || !comment.deleted || thread.comments.slice(index + 1).some((next) => !next.deleted));

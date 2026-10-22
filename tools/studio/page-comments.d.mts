// Types for page-comments.mjs (a page's comments beside its file; docs/research/studio-comments-spec-2026-10-22.md).

export type CommentAuthor = { name: string; color: string };
export type PageComment = { id: string; author: CommentAuthor; text: string; at: number; editedAt?: number; deleted?: boolean };
/** Where a thread's pin is: a frame of the board and its place in it, or a place on the board. */
export type CommentAnchor = { frame?: string; x: number; y: number };
export type CommentThread = { id: string; anchor: CommentAnchor; resolved: boolean; resolvedAt?: number; deleted?: boolean; deletedAt?: number; comments: PageComment[] };
export type PageComments = { format: 1; threads: CommentThread[] };

export const COMMENTS_FORMAT: 1;
export const COMMENT_LIMITS: { threads: number; comments: number; text: number; name: number };
export const COMMENT_COLORS: readonly string[];
export function emptyComments(): PageComments;
export function validateComments(doc: unknown): string[];
export function addThread(doc: PageComments, thread: { id: string; anchor: CommentAnchor; comment: PageComment }): PageComments;
export function reply(doc: PageComments, threadId: string, comment: PageComment): PageComments;
export function resolve(doc: PageComments, threadId: string, resolved: boolean, at: number): PageComments;
export function editComment(doc: PageComments, threadId: string, commentId: string, text: string, at: number): PageComments;
export function deleteComment(doc: PageComments, threadId: string, commentId: string, at: number): PageComments;
export function deleteThread(doc: PageComments, threadId: string, at: number): PageComments;
export function mergeComments(a: PageComments | null | undefined, b: PageComments | null | undefined): PageComments;
export function visibleThreads(doc: PageComments | null | undefined, options?: { resolved?: boolean }): CommentThread[];
export function shownComments(thread: CommentThread): PageComment[];

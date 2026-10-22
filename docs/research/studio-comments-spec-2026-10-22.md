# Zen Studio comments (Figma's Comment tool, C) — spec card, 2026-10-22

Session C, from the parity scorecard's last ❌ in C's area. The user's decisions (2026-10-22, in Session C):
- **Where:** beside the page file, in the project (a `<page>.comments.json` next to `<page>.zen.tsx`); never in the
  page's code; **no Figma sync**.
- **Author:** a name typed once; the browser remembers it (editable).
- **Who:** anyone who can open the page comments, a Viewer too (Figma's); only the author or an Admin deletes.

## Figma's behaviour this follows (help.figma.com "Add comments to files")
- **C** (or the toolbar's Comment) turns comment mode on: the cursor becomes a comment pin. A click drops a pin there and
  opens a composer; Enter (or Post) posts the first comment of a new thread. Esc or V leaves comment mode.
- Pins show only in comment mode (⇧C shows them outside it too, a later step). A pin placed on a frame belongs to it and
  moves with it; elsewhere it stays on the canvas.
- A click on a pin opens its thread: every comment (author, when, text), a reply field, **Resolve** (✓), and ⋯ with
  **Delete thread** / **Delete comment** (author or Admin), **Edit** (author).
- The right panel in comment mode lists the threads (newest first) with **Show resolved comments**; a click on one opens it
  and brings its pin into view.

## Data — `<page>.comments.json`
```json
{ "format": 1, "threads": [ {
  "id": "t-…", "anchor": { "frame": "screen:home", "x": 120, "y": 64 } | { "x": 1880, "y": -40 },
  "resolved": false, "resolvedAt": 0,
  "comments": [ { "id": "c-…", "author": { "name": "Vu", "color": "violet" }, "text": "…", "at": 1761100000000,
                  "editedAt": 0, "deleted": false } ] } ] }
```
- Ids are random; nothing is ever renumbered. A deleted comment or thread stays as a tombstone (`deleted: true`) so a merge
  never brings it back. Limits: 500 threads, 200 comments a thread, 4000 characters a comment, 60 a name.
- **Merge** (two copies of one page's comments: this browser's and the folder's): threads and comments are joined by id;
  for one id the later change wins (`editedAt`, `resolvedAt`, a tombstone over anything older).

## Where it lives
- **This browser:** IndexedDB `zen-studio-builder` › settings `comments:<page>` (no new store, no version bump).
- **The folder:** the dev server's `.zen-studio/pages/<page>.comments.json` (`GET /pages/comments`, `POST
  /pages/comments-write`, validated, 1 MB at most), or a linked folder's file (File System Access), beside the page.
- Read on open and on focus; every change writes both (and tells other tabs). A page's comments follow it to the Trash.

## Not in this step
⇧C (show comments outside comment mode), @mentions, emoji reactions, notifications, Figma sync (the user's choice).

## Tests
`tools/studio/page-comments.selftest.mjs` (model, merge, validation); E2E FW-193…196 (place and post, reply and resolve,
delete, a Viewer comments, comments survive a reload).

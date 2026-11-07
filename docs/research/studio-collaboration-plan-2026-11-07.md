# Zen Studio: working with other accounts (plan, 2026-11-07)

Status: **plan only, saved for later (user, 2026-11-07: "lưu plan lại làm sau")**. Nothing is built. The decisions in
§3 come first; each phase in §4 is its own PR and needs its own approval (Scope lock).

User's question: "làm sao để collaborate với tài khoản khác?", then "plan để làm được chuyện đó".

## 1. Where we are: one person on one machine

| Part | Today | Why others can't join |
| --- | --- | --- |
| Where it runs | Each person's local Vite dev server (`npm run dev`) | No shared address to open |
| Sign-in | Google through PocketBase cloud (`src/platform/auth/pocketbase.ts`, collection `users`) | `AuthGate` only opens the UI; it decides nothing about who sees which page |
| Roles | Can edit / Can view (`RoleMenu.tsx`, `state.role`, ~37 `role === "admin"` checks) | Anyone picks either; not tied to an account |
| Pages, projects | IndexedDB (`builder/store/pageStore.ts`, DB v3: pages, revisions, settings, assets) + a copy in `.zen-studio/` or a linked folder | One copy per machine, never synced |
| Comments, uploaded images | IndexedDB + files beside the page (`comments/commentStore.ts`, BroadcastChannel between tabs) | Same machine only |
| Project theme | `.zen-studio/projects/<id>/project.json` + `theme.css` | Same machine only |

What helps:
- `PageMirror` in `pageStore.ts` already abstracts list, write, trash, assets and comments. A `cloud` mirror can sit
  beside the dev-folder and linked-folder mirrors without rewriting storage.
- PocketBase (already used for sign-in and the registry's licence hooks) has a database, file storage, API rules and
  realtime subscriptions: it can be the backend.

## 2. What stays local-only

Features that need the dev machine do not exist on a hosted Studio: editing the repo's source, the `/__zen-studio`
dev endpoints, the zen-studio MCP over HTTP, Open on phone over the LAN (`device-share.mjs`). The hosted Studio edits
pages and projects only.

## 3. Decisions before any phase (GĐ 0)

1. **Editing model:** phases 1–3 only (one editor per page at a time, soft lock; quicker), or real simultaneous editing
   like Figma (phase 5; much longer).
2. **Hosting:** is the current PocketBase cloud instance enough, or self-host? Which domain for Studio (for example
   `studio.dizai.studio`)?
3. **Accounts:** may any Google account sign in, or only licence holders / seats? Can tie into the existing licence
   system (Polar, member limit per company; see `BACKLOG-user-and-later.md`, private registry).

## 4. Phases

**GĐ 1 — Host Studio + sharing with real permissions**
- Build Studio as a static web app on the chosen domain; Google sign-in as today.
- PocketBase collections: `projects`, `project_members` (email + role Owner / Can edit / Can view), `pages`, `assets`,
  `comments`. Permissions live in PocketBase API rules, so the server refuses, not only the UI.
- A Figma-like **Share** dialog: invite by email, pick a role, copy link. The invitee signs in with Google and sees the
  project.
- `RoleMenu` reads the role from membership; nobody picks their own role any more.

**GĐ 2 — Pages saved to the cloud**
- A `cloud` `PageMirror`: page text + document, images, comments and project theme saved in PocketBase.
- Each save carries a version number. When someone else saved first, Studio reports the conflict and keeps both in
  Version history; it never overwrites silently.
- A migration path: move pages that live on a machine into a cloud project.

**GĐ 3 — Seeing each other**
- Realtime: when someone else saves, the open page updates.
- Avatars of the people on the page in the top bar (each person already has a colour).
- **Soft lock:** "Bích is editing this page"; the next person views until the editor leaves or they press "Edit anyway".

**GĐ 4 — Comments for the team**
- Shared cloud comments, @mentions, email notices through a PocketBase hook, resolve.

**GĐ 5 — Simultaneous editing like Figma (optional, the largest)**
- Two people on one page at once: each other's cursor and selection, changes merged per layer (a CRDT such as Yjs).
- Changes how Studio writes a page (from "edit the text, then save" to a stream of operations) and how undo works.
  Start only after GĐ 1–3 are stable.

Size: tier L overall; one PR per phase.

# Zen Studio collaboration — backend and hosting (GĐ 1–3)

Plan: `docs/research/studio-collaboration-plan-2026-11-07.md`. Decisions (user, 2026-11-22): one editor per page with a
soft lock (GĐ 1–3), the PocketBase cloud instance Studio already signs in with, the domain `studio.dizai.studio`, and
only licence holders / seats sign in.

Claude sessions write and test this folder against a local PocketBase only. **A developer applies it**: the live
instance, Polar, DNS and secrets are never touched from a session.

## What is here

| File | What |
| --- | --- |
| `pb_migrations/1795800000_studio_collab.js` | `studio_seats`, `studio_projects`, `studio_members` and their API rules |
| `pb_migrations/1795900000_studio_collab_pages.js` | GĐ 2: `studio_pages`, `studio_assets`, `studio_comments`, `studio_projects.data` |
| `pb_migrations/1796000000_studio_collab_presence.js` | GĐ 3: `studio_presence` (who is on a page, who edits) |
| `collab.test.mjs` | The rules against a throwaway local PocketBase (`npm run studio:collab-test`) |

The collections, and who may do what (the server refuses everything else):

| Collection | Read | Write |
| --- | --- | --- |
| `studio_seats` (email) | a person reads their own seat | superusers only (the developer fills it from Polar) |
| `studio_projects` (name, owner, owner_email, local_id) | its owner and its members, with a seat | a seat holder creates one as its owner; only the owner renames or deletes it; the owner never changes |
| `studio_members` (project, email, role editor/viewer, invited_by) | everyone in the project, with a seat | the owner invites, changes a role, removes; a member may leave |
| `studio_pages` (project, page_id, title, text, version, base_version, trashed, updated_by) | everyone in the project | the owner and Can edit members; a save names the version it was made on (`base_version`) and a higher `version`, so a save on an older version is refused; deleting for good is the owner's |
| `studio_assets` (project, asset_id, name, file) | everyone in the project | the owner and Can edit members upload; the owner deletes |
| `studio_comments` (project, page_id, data, version) | everyone in the project | every member (Can view too), versioned as pages |
| `studio_projects.data` (the project's theme, language, libraries) | everyone in the project | the owner |
| `studio_presence` (project, page_id, user, email, name, editing, seen) | everyone in the project | each person their own row only |

The Studio UI (src/platform/studio/collab): Share in the top bar (invite by email as Can edit / Can view, change, remove,
Copy link), "Shared with you" on the Studio home, and the role menu capped by the membership (a Can view member never
switches to Can edit). GĐ 2 (src/platform/studio/collab/cloudSync.ts): a shared project's pages, photos, comments and
theme are kept in the cloud and in each member's Studio, made to agree when the Studio opens, every 20 s and after a
change; when two people saved one page, the later save is refused, the cloud's page is taken and the other copy goes to
Version history. Members keep the project as `shared-<cloud id>` and its pages as `cloud-<record id>`. GĐ 3
(collab/presence.ts): each person on a page keeps a row in `studio_presence` (renewed every 15 s, gone after 45 s), the
Studio listens to the server's realtime events on pages, comments and presence, shows the others' avatars and holds a
page's soft lock for its first editor ("<name> is editing this page", Edit anyway). Realtime needs nothing more on the
instance: PocketBase serves it to every client the list rules allow.

## Test locally

```bash
node tools/registry/scripts/fetch-pocketbase.mjs   # the pinned PocketBase (0.39.11) into tools/registry/.bin, once
npm run studio:collab-test
```

## Apply to the live instance (developer)

1. **Collections.** Run a local PocketBase with this folder's migrations, export them, import them on the live instance:
   ```bash
   ./pocketbase serve --dir /tmp/zen-studio-pb --migrationsDir tools/studio/pocketbase/pb_migrations
   ```
   Admin UI › Settings › Export collections (every `studio_*`), then on the live instance Settings › Import
   collections. Check the five rules of each against the migration file before saving.
2. **Seats.** In `studio_seats`, one row per seat holder's Google email (lower case), from Polar's seats. Until a row
   exists for an account, the hosted Studio shows "No Zen Studio seat" and the server refuses it every shared project.
3. **Build.** `VITE_POCKETBASE_URL` only if the instance changes (the default is the current cloud instance):
   ```bash
   npm run studio:build:hosted   # → dist-studio/ (VITE_STUDIO_HOSTED=1: the seat door is on)
   ```
4. **Host** `dist-studio/` as a static site on `studio.dizai.studio` (DNS A record to the server), every path falling
   back to `index.html`, e.g. Caddy:
   ```
   studio.dizai.studio {
     root * /srv/zen-studio
     try_files {path} /index.html
     file_server
   }
   ```
5. **Google sign-in.** The popup flow redirects through the PocketBase instance (`/api/oauth2-redirect`), which Google
   already allows; no new redirect URL is needed for the new domain.

What the hosted Studio cannot do (plan §2): edit the repo's source, the `/__zen-studio` dev endpoints, the zen-studio MCP,
Open on phone over the LAN. It edits pages and projects in the browser; GĐ 2 saves them to the cloud.

# Session log 2026-10-16

## Leftovers landed: AI UI forms on a Card, doc-engine plan status (tier S, user: "OK làm 1 và 3, dọn worktree luôn")

- Sweep of every branch and worktree against main: no open PR. Two finished pieces of work had never reached main:
  - 07e51e01 (zen/feat/ai-ui-runtime-20261014, a cloud session, 2026-10-15): forms on a flat Card in the AI UI demo,
    and `docs/research/ai-ui-live-composer-ux-2026-10-15.md`. It was pushed after #74 merged, and the user had said to
    hold it. The user approved it today. Cherry-picked unchanged; its own log section is in session-log-2026-10-14.
  - The "Phần còn lại" of `docs/research/studio-doc-engine-plan-2026-10-10.md`: PR #29 was closed (its SidePanel fix had
    landed elsewhere), so the section still said Q4 / Q5 wait for approval. It now lists what is done (#24, #25, the
    layer renames, export P1–P5) and what is left (publish the library, the user's Studio → Figma try).
- Gate `--pages=ai-ui` PASS. The coverage warning ("edge cases", already there on main) is fixed at the example: the
  phone example's description now says what it shows, the time chips and actions wrapping in the narrow bubble. Contact
  sheets reviewed: the booking form sits on its flat Card at 1512 and 390.
- Checked as not missing: #47 (Performance docs stay out of git), #34 (Card / List-Box on-container already on main),
  Zen-DS-chart-grid's uncommitted chart grid (on main), feat/vibe-ready (landed 2026-09-28).
- Removed stale worktrees: Zen-DS-chart-grid, -listbox-theme, -sidepanel, -vibe, -color, -curve, -pr53.
- Still open, for the user: the UI Foundations deck branches (claude/eloquent-ptolemy-lhe433,
  claude/gallant-brown-x2gmlu) — whether they belong in this repo.

## Studio MCP M1 + live folder sync (tier M, user: "làm M1 đi", "Hiện tại claude chạy xong phải refesh lại mới thấy. Không realtime được")

- Cause of "refresh to see": `mcp-5173.log` had no `update` call — Claude read over MCP, then wrote
  `.zen-studio/pages/untitled-page.zen.tsx` with its file tools (M0 had no tool to build), and a tab only synced the
  folder on connect or "Sync with the folder". Fixed at the owner: the plugin `fs.watch`es the pages folder (Vite's
  watcher skips node_modules, where the E2E server keeps its pages) and sends `zen-studio:pages-changed`; `mirrors.ts`
  syncs at once and re-documents the open page (ids). Shown ≈ 200–300 ms after the write, no reload. Server
  instructions now tell the AI never to edit page files.
- M1 tools (branch `zen/feat/studio-mcp-m1-20261016`, worktree `../Zen-DS-mcp`): list_pages, get_node, get_code, insert,
  replace, move, duplicate, delete, wrap, unwrap, batch (`as` / `"$name"`, one undo step, refused part-way = reverted),
  create_page, add_frame, select, focus, open_page (20 in all). `api.ts` gains `squashEdits` / `revertEdits`; relay 60 s.
- E2E group `mcp` (AI-01…06, `AI-` because `MC-` is Main component's): read, update + ⌘Z, insert + HTML refused, batch +
  revert, outside file edit live, Stop. 6/6 three runs, in the baseline (AI-05 was flaky once: the tab's own rename push
  overwrote the test's write; the row now waits for the named page in the folder, as B-36). Live tab run 22/22.
- Gate found B-36 (old page → master layout) waiting for the unmigrated page after a manual Sync: with the watched
  folder the page arrives already moved (as opening it does). The row now accepts either text; 2/2.
- Not done in M1: the change highlight; the real dashboard walk with the user's Claude Code.

# Session log 2026-10-19
## AppShell rebuilt from scratch on Figma's AppShell patterns (tier L, branch zen/feat/appshell-patterns-20261019)

User: "đập appshell hiện có ra làm lại từ đầu"; answers "Phá hẳn, migrate hết" (no aliases) and "Màn hình + templates".
Then "Các example Appshell nên build như trong Figma ◇ Master-Layout · Example".

- **Library:**
  - AppShell is rewritten: `pattern` (6 desktop structures), `collapse`, the mobile pattern (`mobileTop`, `hero`,
    `backdrop`, `actionBar`), `layout` desktop | drawer | mobile.
  - New AppShellHeader (Header/AppShell) and AppShellPane.
  - ActionBar `surface="glass"`; TopNavigation `transparent` / `transparent-on-color`; Sidebar `toggleHere`.
  - Spec and migration map: `docs/research/appshell-rebuild-2026-10-19.md`.
- **Harness and docs:**
  - The app-shell rules are rewritten, and two are new: `collapse-beside-master-crumb` and `pattern-parts`.
  - Guideline entry with 2 Do/Don't visuals; component-usage-rules §17, AGENTS.consumer, the responsive skill and
    getting-started are updated.
- **Consumers migrated:** the 7 templates and HR (agents), the appLayer shell (agent), and the platform page `app-shell`.
  - That page's sections A–F (41 screens) are files under `examples/pages/app-shell/`, one agent per 3–4 screens.
  - The 16 behaviour examples stay until the sections land.
- **Studio:**
  - The Screen section's parts have a host (`screen-chrome.mjs`: shell or header).
  - `migrateAppShellProps` moves saved pages to the new props on load.
  - The phone header is derived from the AppShellHeader.
  - Figma push and pull write the AppShellHeader. The Body keeps Figma's Margin-Comfortable padding in both directions:
    no doubled padding Stack.
  - The slots registry, cloning.json (sidePanel, topNavigation), builder.css and drag selectors are updated, as are the
    E2E fixtures B-39/41/42, SP-22 and HO-10.
- **Checks so far:**
  - All 54 `studio:selftest` steps pass.
  - The app-shell interaction tests pass (38/38).
  - tsc is clean outside the example files still being written.
- **Wave 2 and component parity (afternoon):**
  - All 41 Figma screens are built (A–F) from use_figma node dumps, and compared 1:1 beside the Figma screenshots.
  - Fixed at their owners:
    - TopNavigation: a centred title with a subtitle, and the Control-Bar size.
    - BottomNavigation: the floating-glass selected tab.
    - AppShell: the media spacer and backdrop Image, the Focus stepper at 200 per step, a Transparent bar on the page
      canvas, the floating clearance in tokens.
    - Sidebar: `shadow`, and sections 8 apart.
    - MetricCard tile `iconBackground`.
    - ActionBar: the Primary keeps its label (user).
    - New AppShell `band` (user).
  - Harness: primary-in-top-bar allows a header without a Main row; pale-on-canvas reads Band-Sheet / Media sheets.
  - Studio: the push pads the Control frame as the code does; registry slot layouts follow; partProps regenerated.
  - A stale Studio admin draft of app-shell.tsx on :5262 was serving old code. Discarded; the lesson is in memory and
    in the agents' brief.
  - Checks: `npx vitest run` 1098 passed, all studio selftests, usage:selftest.
- **Open:**
  - TopNavigation large-title capline / subheading, `Top-bar=false`, Badge or Avatar in trailing (agent running),
    then the examples adopt them (D2, D3, D4, D5, E2, E5, E7, F1–F12).
  - Studio E2E groups (builder, starters, handoff), guidelines and ai-ui build, the full gate, PR.
  - `src/platform/examples/pages/progress.tsx` has two `layout="stacked"` edits of unknown origin. Left out of this
    change.

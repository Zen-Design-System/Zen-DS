# The user's items and the later phase

Split out of `BACKLOG.md` on 2026-10-25 (user, 2026-10-24 23:40: clear the BACKLOG once, then move on). These items are
not dev work a session can pick up: the first list waits on the user, the second on the next phase. Entry text is
unchanged from `BACKLOG.md` unless a line says otherwise. Questions for the designer stay in
[`QUESTIONS.md`](QUESTIONS.md).

## For the user (Việc của anh/chị)
- **P2 · LICENSE.md is a draft: legal review before selling (2026-10-08):** drafted on PR #5 (Dizai Studio, Vietnam law, subscription, apps-not-kits, per company + member limit); a lawyer must review it and remove its "Draft" note. Was: package.json has no `license` field and the repo no
  LICENSE/EULA; needed before selling (legal text from the user).
- **P2 · Private registry: the user's steps, then Phase 6 (2026-10-08; rewritten 2026-10-25):** live since 2026-10-14
  (Podman on 51.79.205.10, DNS, HTTPS, `ZEN_REGISTRY_PUBLISH_KEY`, v0.3.0 published). Left, as copy-paste steps in
  [`docs/registry-setup.md`](../registry-setup.md) (Vietnamese runbook): SSH access from the user's Mac, the R2 bucket +
  `backup.env` + Podman redeploy (no backups exist yet), an uptime check, one real `npm login` (Google + licence key),
  and `npm deprecate` of npmjs `@zen-ds/react@0.1.0` and `@zen-ds/tokens@0.1.0`. Phase 6, a payment webhook: the user
  picked Polar (2026-10-25); built as a PocketBase hook (`tools/registry/pocketbase/pb_hooks`), the developer deploys it
  (runbook Bước 5: Polar products + webhook, `POLAR_WEBHOOK_SECRET`, `pbc pocketbase hooks push`).
- **P3 · Private registry: warn on shared license keys (2026-10-08; rewritten 2026-10-24):** the usage report per
  licence exists (5afe9ea2: developers, CI keys, IPs and installs per month; `usage-report.js` sorts by IP count). Left:
  a warning when one key goes far beyond its `seats`, and the package version of each install
  (`tools/registry/plugins/verdaccio-zen-license/index.js`). Decision (user): is the monthly report enough?
- **P3 · Builder Link folder: the permission prompt of a real folder is untested (2026-10-06, GĐ2 M4):**
  `npm run studio:build-check` covers link, write, Trash (trash/ copy), Restore and the reconnect after a reload through
  an OPFS folder, which the browser always grants; a folder the person picks is usually "prompt" after a reload, so the
  Reconnect button path (`mirrors.ts` reconnectFolder → requestPermission) needs one check by hand in Chromium.
  (2026-10-25: about 2 minutes, optional; close the line if the user skips it.)

## Later phase (Giai đoạn sau)
- **Code view in other languages — on hold (user, 2026-10-08: "tạm lưu backlog, sẽ làm giai đoạn sau"):** order chosen:
  HTML/CSS → Vue → Swift → Flutter → Svelte. Plan `docs/research/code-languages-plan-2026-10-03.md`, phases P1–P9, each
  approved on its own. Still to answer when it starts: web strategy (§8.1; proposed A, native Vue/Svelte on the shared
  CSS), the dropdown meanwhile (§8.4; proposed: all six with honest states), example snippets as the render's source
  (§8.3; proposed). Examples get every language too (user, 2026-10-03). Nothing built.
- **P3 · Studio UX polish N1–N11 — deferred by the user 2026-10-08 ("để sau"):** `docs/research/studio-ux-audit-2026-10-04.md`.
  Written before the UI3 shell (#63) and F0–F10, so re-check each note in the Studio UI design check (next phase).
- **P3 · Studio panels in dark chrome and at 280px (2026-10-03; rewritten 2026-10-24):** no screenshot pass of the
  rebuilt UI3 panels in dark chrome (`chromeTheme`, `src/platform/studio/store.ts` ~21) or at their 280px minimum width
  (`inspector/inspector.css` ~3). Goes with N1–N11 (above).
- **ListItem Value in Figma — decided, not built (user, 2026-10-23: "not now"; 2026-10-13: "code first"):** code has
  `value` · `valueCaption` · `valueTone` (a right-aligned two-line amount, CHANGELOG 0.4.0 Added); Figma List-Item keeps
  the hand-built text stack in the Trailing slot. A `.Primitives/List-Item/…/Value` in `9nZv4uW2…` waits until the user
  asks for it.
- **P3 · A language setting for Studio projects (user, 2026-10-25: "Để đợt sau"; new):** Studio pages set no
  `locale`, so every page renders en-US: Table date cells (`edit: "date"`, #294) show "10/25", not "25/10", on the
  canvas, in Play and in Figma. A project (or page) setting such as "Ngôn ngữ: Tiếng Việt" would set ZenProvider
  `locale`, each frame's `lang` and the push's text.
- **P3 · Figma screens older than the 2026-10-24 rules (the designer's file; audit warnings; user 2026-10-25: "sẽ làm
  sau"):** ◇ Master-Layout · Example › B1 · Column has a 280 Search in Trailing-Slots (`search/toolbar-width`);
  ◆ HR-Platform has 6 Paid / Unpaid Badges and Master-Layout Example › B4 · Column a Draft Badge with Leading-Icon off
  (`badge/status-priority-icon`). Update them in Figma, or keep them with the user's OK. (The Metric-Card Dock-Icon
  warnings on E2, F1, F2 left with the audit check on 2026-10-25.)

# The user's items and the later phase

Split out of `BACKLOG.md` on 2026-10-25 (user, 2026-10-24 23:40: clear the BACKLOG once, then move on). These items are
not dev work a session can pick up: the first list waits on the user, the second on the next phase. Entry text is
unchanged from `BACKLOG.md` unless a line says otherwise. Questions for the designer stay in
[`QUESTIONS.md`](QUESTIONS.md).

## For the user (Việc của anh/chị)
- **P0/P1 · Studio prototype walk 2026-10-29: pick which fixes to build:** hands-on walk (4 pages, ~50 findings: 2 P0, 19
  P1) in `docs/research/studio-prototype-walk-2026-10-29.md`; §4 lists 9 fixes in order (W-47 Play status-bar band is a
  #345 regression; W-14 ⇧A on floating layers; W-35/36/41 Back + Dialog actions). Nothing built until approved.
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
- **Studio collaboration with other accounts — saved for later (user, 2026-11-07: "lưu plan lại làm sau"):** plan
  `docs/research/studio-collaboration-plan-2026-11-07.md` (GĐ 1 host + Share with PocketBase roles, GĐ 2 cloud
  `PageMirror`, GĐ 3 realtime + soft lock, GĐ 4 team comments, GĐ 5 CRDT multiplayer). To answer when it starts
  (§3): editing model, hosting + domain, who may sign in. Nothing built.
- **Code view in other languages — started (user, 2026-11-12: "Code view: HTML/CSS"; on hold since 2026-10-08):**
  order HTML/CSS → Vue → Swift → Flutter → Svelte. Plan `docs/research/code-languages-plan-2026-10-03.md`, phases
  P1–P9, each approved on its own; P1 + P2 approved. §8 answered 2026-11-12: web strategy A (native Vue/Svelte on the
  shared CSS), the dropdown lists all six with honest states, example snippets become the render's source (P2b).
  Examples get every language too (user, 2026-10-03). P1 (picker, status manifest, not-ready state, parser) built
  2026-11-13 (plan §9); P2 (HTML + CSS) next. P2b–P9 wait for approval.
- **ListItem Value in Figma — decided, not built (user, 2026-10-23: "not now"; 2026-10-13: "code first"):** code has
  `value` · `valueCaption` · `valueTone` (a right-aligned two-line amount, CHANGELOG 0.4.0 Added); Figma List-Item keeps
  the hand-built text stack in the Trailing slot. A `.Primitives/List-Item/…/Value` in `9nZv4uW2…` waits until the user
  asks for it.
- **P3 · Figma screens older than the 2026-10-24 rules (the designer's file; audit warnings; user 2026-10-25: "sẽ làm
  sau"):** ◇ Master-Layout · Example › B1 · Column has a 280 Search in Trailing-Slots (`search/toolbar-width`);
  ◆ HR-Platform has 6 Paid / Unpaid Badges and Master-Layout Example › B4 · Column a Draft Badge with Leading-Icon off
  (`badge/status-priority-icon`). Update them in Figma, or keep them with the user's OK. (The Metric-Card Dock-Icon
  warnings on E2, F1, F2 left with the audit check on 2026-10-25.)

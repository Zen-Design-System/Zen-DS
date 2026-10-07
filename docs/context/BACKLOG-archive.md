# Backlog archive

Done, closed and duplicate entries moved out of `BACKLOG.md` (text unchanged), newest batch first.

## Archived 2026-10-07 (backlog cleanup, session "Session continuation check")

  - Done (user "Có", 2026-10-05): the overlay placeholders follow Content/Placeholder to alpha 9 (live Figma had it).
  - Done (user "Có", 2026-10-05): Color Scales › Create Variables › Sync High Contrast in the plugin (toast with the
    result); in the plugin's next build (the Lục Thạch session integrates and builds overnight).
- ~~appLayer has an import cycle~~ done 2026-10-05 (session "Nested boolean không hoạt động"): the playground helpers
  moved to `appLayer/playgroundParts.tsx` and the group data exports keep their identity (`keepOnHotUpdate`), so a
  template or app-shell edit is a Fast Refresh. Adding or removing a page/example still reloads once (by design).
  Old notes: `appLayer/shared.tsx` imported `../PlatformExamples` and `../PlatformTemplate`, and
  `content.tsx` imports `option` from `shared.tsx`.
  - A hot update while a probe runs (another session editing) can throw "Cannot access 'option' before
    initialization" in `behaviour.mjs`.
  - Re-run the page: a fresh load is clean.
  - Moving the shared helpers (`option`, `Panel`) into a leaf module would end it. The owner is "Đánh giá Zen DS hiện
    tại" (appLayer).
- **Done 2026-10-07 (backlog batch 2, E2E B-19: `inspector/frames.ts` compares labels and listens to the frame registry):** ~~P2 · Builder: Inspector Frames list keeps the previous local page's frames (2026-10-06, seen during GĐ2 M2):~~
  open page A then page B (both new pages, Screen id `screen-1`): the Page panel's Frames shows A's title. Likely the
  frame registry keys `screen:screen-1` without the page. Pointer: `builder/BuilderBoard.tsx` frame ids,
  `inspector/PagePanel.tsx` Frames.
- **Closed (2026-10-07, backlog batch 5b: 3/3 alone again; the gate retries a failed row once and the E2E host-page reset between rows removed the inspector cascade):** ~~**P3 · Studio E2E I-11 is flaky too (2026-10-07, seen during GĐ3 M3):** "timed out after 20 s" once with
  `--no-retry` right after the library group; 2/2 alone. Pointer: `tools/studio/e2e/scenarios/inspector.mjs` I-11.~~
- ~~**P3 · Studio E2E I-15 is flaky**~~ done 2026-10-07 (GĐ4 M4, the user chose to fix the row: it waits for the field to
  read "sm · …" before ⌫; 5/5 alone, full matrix). Was: **(2026-10-06, session "Studio builder tool planning", seen during GĐ2 M2):** "Timed out
  waiting for ⌫ removes gap" on the first try in 2 of 3 full runs (passes on retry and alone, 2/2); the gate counts a
  failed try as a regression. Pointer: `tools/studio/e2e/scenarios/inspector.mjs` I-15, ScaleField ⌫ reset.
  2026-10-07 (GĐ4 M1): 3/5 alone, both tries failed once in a gate run. Likely race: ⌫ right after ⌘Z is planned from
  the element and hash read before the undo's refetch, so the server refuses it as stale; the row could wait for the
  field to read "sm · …" again before ⌫.
- **P3 · Emoji in alpha text (2026-10-06, session "Emoji mờ trong text alpha"):** (1) proposed harness/audit check:
  a colour emoji in text whose colour has alpha < 1 (Neutral Base/Light, captions, DescriptionList terms) — wrap it in
  an opaque span; (2) proposed DS helper (e.g. an inline `Emoji` primitive) so apps need not know the trick;
  (3) `examples/pages/chat.tsx:912` docs description "sends a 👋" renders at alpha .69; (4) `appLayer/shell.tsx:463`
  "Phone app" (HrPhoneExample) does not render on the App Shell page — `examples/pages/app-shell.tsx` wins; dead or meant? **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** (2) no `Emoji` component; the opaque-span tip goes into the guideline → batch 6 · **Done 2026-10-07 (batch 6)** (Text guideline do-line).
- **P3 · Sidebar section titles (2026-10-06, session "Khoảng trống Report và Settings"):** (1) proposed harness rule
  `sidebar/untitled-section`: a `sections` entry after the first without `label` (renders a bare 16px gap); fixtures
  in `tools/usage-guard/fixtures`. (2) Titled one-item groups await the user's call (merge or keep):
  `appLayer/navigation.tsx` "Workspace › Settings", `examples/pages/alert-banner.tsx` "Workspace › Billing",
  `appLayer/shellScreens.tsx` "Settings › Roles & access". **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** (2) one-item groups lose their title (merged) → batch 6b · **Done 2026-10-07 (batch 6b)** (navigation.tsx, alert-banner.tsx, shellScreens.tsx).
- **P3 · Sidebar rail follow-ups (2026-10-06, found by "Sidebar rail align", not changed):** (1) App Shell example
  screens (`src/platform/appLayer/shellScreens.tsx` People/Time off/Settings, `shell.tsx`) pass `brand` without
  `logoCollapsed`: their rails are 84px (fallback, centred) vs 88px on the Modules screen. (2) HR module rails turn
  the `search` slot (Back + module title) into a magnifier "Search" button that only expands the panel: a Back
  chevron (or nothing) would match what the slot holds. **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** (2) the collapsed rail shows a Back chevron → batch 6 · **Done 2026-10-07 (batch 6)** (Sidebar `searchCollapsed`; HrShell passes its Back IconButton).
- ~~**P3 · Top Navigation Modal screen placeholder contrast (2026-10-04):**~~ **closed 2026-10-07 (backlog cleanup):** the placeholder token is kept on purpose (Content/Placeholder, see the examples-rebuild RESOLVED entry), like the other placeholder 1.92:1 lines. Was: `npm run qa` warns `[contrast] top-navigation@1512/390`
  "Choose a reviewer" / "Choose a slot" 1.92:1 (SelectField placeholders); seen while gating the Studio B2 change, which does not
  touch that page.
- ~~**P3 · Flaky test (2026-10-04):** `tests/scale.test.tsx` › Rating size spellings fails now and then.~~ Done 2026-10-04:
  Rating previews stars on pointerenter and the test browser's pointer stayed where an earlier test left it; the scale
  test now renders inside `pointer-events: none` (static DOM compare). Full suite 3× green (489 tests).
- **P2 · Card Sub-Action Menu triggers in examples (2026-10-04):** a node `subAction` (a Menu) still uses IconButton
  flat **primary** ⋯, while Figma and the Card default are flat **Secondary** ⋮: card.tsx:172/585, badge.tsx:100/411,
  metric.tsx:159/532 (level only), appLayer/navigation.tsx:466/852. Switching trips `button/secondary-justified` (also
  in the code strings). Needs the user's call: exempt flat IconButtons from the rule, `zen-allow-secondary` per site, or
  a Card `subAction={{ label, items }}` that renders the Menu with the Figma trigger. **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** exempt flat IconButtons from `button/secondary-justified`; the examples switch to Figma's flat Secondary ⋮ → batch 6 · **Done 2026-10-07 (batch 6)** (check-usage.mjs; card, badge, metric, appLayer/navigation triggers).
  - **Done (checked 2026-10-07, backlog sweep: a `ListBox` now (app-shell.tsx:252), padded by breakpoint like the Cards):** ~~Home "Due this week" is a Box detached from a Card in Zen Studio (`zen-detached`), so its padding is a fixed~~
    Padding/XLarge (24px); at the mobile breakpoint the MetricCards above pad 20px (Card padding follows the
    breakpoint) and the list content sits 4px inside them (Studio app, Narrow window, Banner).
- ~~**P2 · List Item on phones (designer decision, 2026-10-03):** interactive rows put their text at Padding/XLarge
  24px while phone page margins are 20px.~~ Done 2026-10-03: Figma List-Item gained Device=Desktop/Mobile (Mobile binds
  Margin-Comfortable, 20px); code pads Margin-Comfortable by breakpoint. Left: tablet Margin-Comfortable is 24px while
  Card/Modal padding is 20px, so tablet rows sit 4px inside a Card's content (Figma has no Tablet device). **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** on tablet, rows follow the Card padding (20px); no Tablet device in Figma → batch 6 · **Done 2026-10-07 (batch 6)** (ListItem rows already sit in ListBox Card-padding-medium; the deprecated comfortable inset now follows it on tablet).
  - **Done (checked 2026-10-07, backlog batch 5b: Escape climbs to the ancestor that holds every selected layer, E2E SE-08):** ~~P3 · Escape on a multi-selection selects the primary's parent; Figma selects the layers' common parent.~~
- **Studio nested booleans follow-ups (2026-10-03, session "Boolean lồng nhau trong Studio"):**
  - ~~P3 · Props inherited from another Zen props type are not listed~~ done in the Studio 2026-10-07 (GĐ4 M1,
    `inspector/inheritedProps.ts`: AvatarStack, BadgeCounter, NumberField, TextAreaField, PopoverManualAddNew); the docs
    (build-api) still list own props only.
  - ~~P3 · Nested instances show booleans only~~ done 2026-10-07 (GĐ4 M3: every property type, Figma names).
  - ~~P3 · A nested element passed through a variable (`leading={avatar}`) is not listed~~ done 2026-10-05 (fiber ownership).
  - ~~P3 · Props inherited from another Zen props type are not listed~~ done in the Studio 2026-10-07 (GĐ4 M1,
    `inspector/inheritedProps.ts`: AvatarStack, BadgeCounter, NumberField, TextAreaField, PopoverManualAddNew); the docs
    (build-api) still list own props only.
  - ~~P3 · Nested instances show booleans only~~ done 2026-10-07 (GĐ4 M3: every property type, Figma names).
  - ~~P3 · A nested element passed through a variable (`leading={avatar}`) is not listed~~ done 2026-10-05 (fiber ownership).
  - **Closed (checked 2026-10-07, backlog sweep: the leftovers live elsewhere: Help-Text's Figma names has its own row (GĐ4 M2); Close, Toggle Subtext and characterLimit are recorded skips (session-log-2026-10-07)):** ~~P2 · Figma-model gaps (fits builder WP-E)~~ mostly done 2026-10-07 (GĐ4 M1): Input Label / Help-Text groups,
    switches for EmptyState CTA and AlertBanner / InlineMessage Action (object written as code), `icon-toggle` for
    `boolean | IconName` (Dialog, Toast, AlertBanner, InlineMessage icon; Slider / Metric icon). Left: ~~Toast Action~~
    (done 2026-10-07, batch 5a: Figma Actions is a toggle writing `{ label: "Action" }`) / Close and other handler-backed
    booleans (a no-op onClose fails interaction/no-noop-handler: the code says what closing does), Toggle Subtext (the
    Figma Toggle set has no property for it: `caption` stays a code text row), characterLimit (`ReactNode | true`: a
    text field, no switch), Help-Text's Figma names (set not in the capture: M2 read).
  - **Done (checked 2026-10-07, backlog batch 5b: ToggleRow holds an optimistic value for up to 3 s):** ~~P3 (2026-10-07, GĐ4 M1) · A layer switch (Figma boolean) reads the rendered props, so it flips ~0.3–0.5 s after the
    source changes (the canvas's hot update + a 250 ms debounce); a second press before that writes the same value again
    ("No change"). Pointer: `inspector/GroupedProperties.tsx` ToggleRow `on`; an optimistic state would fix it.~~
  - **Done 2026-10-07 (backlog batch 2: `jsx-source.mjs` setPropEdits inserts after the comment; 3 selftest checks):** ~~P3 · setProp after an attribute with a trailing `// comment` moves the comment; removeProp then leaves it on its own line.~~
  - **Closed (2026-10-07, backlog batch 5b: by design — ON brings the saved control bar back, as Figma shows a hidden layer again; the picker is for a bar the file never had):** ~~P3 · Control-Bar switch ON only opens the slot picker when the saved file has no control bar (no write until a pick).~~
  - **Done (checked 2026-10-07, backlog batch 5b: revealSection → shell/layout.ts, shortcutsOpen.ts, modKey.ts, canvas/zoomToSelection.ts; FramePanel and inspector/frames import presentFrame):** ~~P3 · Non-component exports left in component modules (Toolbar `revealSection`, ShortcutsDialog `openShortcuts`,
    ZoomControls `modKey`): an edit to those modules cascades; FramePanel.tsx and frames.ts could import
    board/presentFrame directly so Present.tsx can drop its re-export.~~
  - **Done (checked 2026-10-07, backlog batch 5b: no control until the live props arrive):** ~~P3 · A bound switch reads `false` for one render until DesignPanel's live props arrive.~~
  - **Done 2026-10-07 (batch 5a: a frame owns the module-level declarations its code names, list elements in ExampleMap / keepOnHotUpdate literals, a router's fallback statement; selftest frame-scope 23):** ~~P2 · Frame toolbar Discard (`tools/studio/frame-scope.mjs` frameRangesOf) misses edits whose JSX lives outside the
    frame's own JSX (a column const, a helper, a local component, hrDemo/HrShell): the frame shows no change and no
    Discard; only the toolbar's file-level Discard removes them. Nested groups now expose such edits ("Written in …").~~
  - **Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 1):** the three lines removed; Narrow window › Open navigation opens the drawer (Enter and click). Was: P2 · `src/platform/examples/pages/app-shell.tsx:288-291` (untracked; saved 01:38 on 2026-10-05, not by this session)
    has `defaultSidebarCollapsed={false}` `navOpen={false}` `defaultNavOpen` on the StudioApp AppShell: `navOpen={false}`
    locks the drawer, so "Narrow window" › "Open navigation" does nothing (`npm run qa -- --all` behaviour ✗ [apg]).
    Needs the user's call (remove the three lines).
  - **Done 2026-10-07 (batch 5a: every examples/pages/*.tsx exports through keepOnHotUpdate (src/platform/hotData.ts); readers re-render after React Refresh; frames keyed by place; a data edit still restarts its frame):** ~~P2 · Any Studio write to an example page remounts its examples (the page's `examples` export is not a Fast Refresh
    boundary): a view reached by interaction (Conversation › Back → Messages) jumps back to its first screen and the
    selected nested element disappears. The appLayer fix (`keepOnHotUpdate`) shows the way for example pages.~~
  - **Done (checked 2026-10-07, backlog batch 5b: rows are a .map's only; the panel header already counts the other places):** ~~P3 · The "a fixed value applies to all N rows" hint counts every rendered instance (5 frames for
    PlatformChatHeader), not only .map rows.~~
  - **Done 2026-10-07 (batch 5a: frameLocs also walks the frame's React tree, portalled content included):** ~~P3 · Frame Save/Discard: `frameLocs` reads DOM data-zen-src only, which Zen components (TopNavigation, Avatar) do
    not forward, so their edits count as "outside" the frame (same fix area as the frame Discard item above).~~
  - **Duplicate (checked 2026-10-07, backlog sweep: closed as a probe artifact in the deadclick list-item@1512 "Pending invites" row):** ~~P3 · (observed in `npm run qa`, file unchanged since 2026-10-04) list-item › Pending invites › "Revoke invite for~~
    an.vu@…" reported as a dead click.
  - **Done (checked 2026-10-07, backlog batch 5b: keepSelected applies to hover too, E2E SE-09):** ~~P3 · While a nested instance is selected, hover still outlines the outer layer that covers it (ListItem's click target).~~
  - ~~P2 · Enum/text props under a spread stay read-only~~ done 2026-10-04 (`ownValueOf`, user: "có").
  - ~~P2 · Studio edits to `PlatformExamples.tsx` reload the whole page~~ done 2026-10-04 (dead `isPlatformComponentPage` removed).
  - **Done (checked 2026-10-07, backlog batch 5b: lockBound and areaState read the live props: a spread that does not set the prop leaves it editable):** ~~P3 · (2026-10-04) Canvas resize and spacing handles still treat any prop not written on an element with a spread as read-only (`select/resize.ts`, `select/spacing.ts` call `valueOf` without live props); the inspector unlocks the ones the spread does not feed. Only 1 layout primitive in platform/templates has a spread today.~~
  - **Duplicate (checked 2026-10-07, backlog sweep: kept by the user's choice, closed in the playground Avatar row of 2026-10-05):** ~~P3 · (2026-10-04, pre-existing) `PlatformExamples.tsx:728` Sidebar playground workspace Avatar: white initials on Solid green (usage-guard `avatar/solid-initials-contrast`).~~
    - ~~Phase 2: ScaleField~~ ✅ 2026-10-05 (Studio builder session, `inspector/controls/ScaleField.tsx`, E2E I-15); left
      for later: typeahead "14" → nearest token, scrub (Phase 7).
    - ~~Phase 3 Flow/Padding, Phase 4 Alignment v2, Phase 6 Grid columns~~ ✅ 2026-10-06 (Studio builder session,
      `inspector/LayoutSection.tsx`, E2E L-01…L-08).
  - **Done 2026-10-05 (Studio builder plan GĐ1, E2E row ST-06):** **P2 · Canvas right-click menu still says "Detach component"** for non-detachable types. It should use
    isDetachableType and the label "Detach instance" (shell/CanvasMenu.tsx, Platform session).
  - **Done 2026-10-07 (backlog batch 2: the Size row is "Child size"):** ~~**P3 · Two "Children" labels:** the Size group's fillChildren row and the Slots section title both say
    "Children" on Stack/Grid/Box.~~
  - **Done 2026-10-07 (backlog batch 2: `propSchema.ts` nodeKind falls back to the engine's `zenComponents`, the src/index.ts exports):** ~~**P3 · Public exports read as "Local component":** PopoverBulkAction*, ZenPortal are missing from
    api.generated.json.~~
  - **Done 2026-10-07 (backlog batch 2: DesignPanel and FramePanel headings carry `title`):** ~~**P3 · Missing name tooltip:** a truncated node name in the header has no full-name tooltip.~~
  - **Done 2026-10-07 (backlog batch 2: `npm run studio:selftest` runs it, 33 checks):** ~~**P3 · No runner for detachable.selftest.mjs:** no test runner includes it.~~
  - **Closed (2026-10-07, user decision in backlog batch 8: keep `sm`):** ~~**P3 · Small Detach button:**~~ the option-B Detach is `sm` full width and carries `zen-allow-small-full-width`.
    Decide whether to keep it or use md.
  - **Done 2026-10-03 · examples/pages/app-shell.tsx:** Page() helper takes `maxWidth`; Projects, Invoices, People, Tasks
    and Files use "full" (+4 snippets); Home and Notifications keep lg. (The Studio draft that held it was discarded.)
  - **P3 · HR · Home** is the only HR page still capped at lg; moving Home → a table page shifts the content edge above
    ~1500px. Decide whether app shells use one width. **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** HR · Home uses `maxWidth="full"` like the other HR pages → batch 6b · **Done 2026-10-07 (batch 6b)** (HrHomeTemplate.tsx).
  - **P3 · Wide side content:** tabs › Project sections Overview DescriptionList card, My leaves Next leave card and
    Empty/Error InlineMessage now span up to ~2250px; layout › Main column and aside: the 1/3 aside grows too (fixed
    track option). Cap them if they read too wide. **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** side content is capped at `xl` → batch 6b · **Done 2026-10-07 (batch 6b)** (Box/Grid maxWidth 1440: tabs Overview card, layout Main column and aside, HR My leaves Next leave, EmptyError InlineMessage).
  - **Done 2026-10-07 (backlog batch 4: the table use case widens its stage to min(680px, 100%)):** ~~**P3 · Visually Hidden playground** table: the 520px stage + 64px star column cuts off the Archive column.~~
  - **Done 2026-10-07 (backlog batch 4):** ~~**P3 · HrPublicHolidayTemplate** section heading is `<Heading level={2}>` without textStyle Heading/4.~~
  - ~~**P2 · Classic full screen loses focus layout:**~~ Fixed 2026-10-02 by "Disable input và search từ Figma"
    (`:not([data-fullscreen="true"])`). `src/platform/platform.css` ~line 492, `.pe-card:is(:focus-within, …)`
    (specificity 0,3,0) beats `.pe-card[data-fullscreen="true"]` (0,2,0): in the classic docs a screen example's full
    screen falls back to an inline card as soon as focus enters it, so the first click on More actions / New task
    misses. The Studio's Present has its own higher-specificity rule. Fix: `:not([data-fullscreen="true"])` on the
    focus-raise rule.
  - ~~**P3 · Studio: dashed owner outline warning**~~ done 2026-10-03 (zen-allow-dashed-color note).
  - **Done (checked 2026-10-07, backlog sweep: no static or dynamic import from appLayer/* or src/templates/** reaches PlatformAppLayer, PlatformExamples or PlatformShowcases (import-graph script), and the app layer uses `keepOnHotUpdate`; not re-run as a live HMR edit):** ~~**P3 · HMR cycle in the app layer:**~~ editing `src/platform/appLayer/*` or `src/templates/*` throws
    `Cannot access 'pages' before initialization` (PlatformAppLayer ↔ appLayer ↔ PlatformExamples cycle) and Vite
    reloads the page. The Studio survives it (state in sessionStorage) but a Studio edit there costs a full reload.
  - ~~**P3 · Studio toolbar under ~900px:** the drafts group (Unsaved · Save all) leaves no room for the breadcrumb.~~ **Done (checked 2026-10-07, backlog batch 5b):** Save all leaves the toolbar below 1024px (the count button opens the panel, which has Save all); with a draft the breadcrumb keeps its last crumb at 900 and 700px (42px, parents collapsed), where it had none before.
  - **Closed (checked 2026-10-07, backlog sweep: the placeholder colour is kept on purpose (Top Navigation placeholder row); the label tooltip has a 24px hit area (input.css:482-483)):** ~~**P3 · New gate warnings seen 2026-10-03 (not from the phone centring, owner to triage):**~~ placeholder contrast
    1.92:1 on "Choose a reviewer/slot" (top-navigation Modal screen) and "Choose a client" (input Create a project),
    `button.zen-input-label__tooltip` 12×12 target (input Label parts); report `.qa/reports/2026-10-03T04-58-39-47da80c2.md`.
  - **P3 · Mobile templates take a full row:** `appLayer/templates.tsx` sets `wide: true` for every template, so the
    two phone templates (Mobile list · Orders, Mobile detail · Order) sit centred in a 1064px grey stage; `wide:
    !template.mobile` would put them two per row like the other phone examples (needs the user's OK). **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** phone templates use `wide: !template.mobile` → batch 6b · **Done 2026-10-07 (batch 6b)** (appLayer/templates.tsx).
  - ~~**P2 · Detach ListItem after the ListItem refactor (2026-10-03, session "Component List Item refactor"):**
    `tools/studio/detach.mjs` ListItem.build + listInset() still emit Padding/Small × the list inset.~~ Done 2026-10-03
    (session "Platform UI/UX redesign với canvas editor"): listRowBox; 156/156 rendered static rows match the DOM.
  - **Done (checked 2026-10-07, backlog sweep: superseded by the 2026-10-06 ListItem refactor: no side padding by default (list-item.css:11-24), and detach writes no paddingX fallback (detach.mjs:947-956)):** ~~**P2 · Detach ListItem: default inset is now Margin/Comfortable (2026-10-03, session "Component List Item refactor",
    List-Item Device=Desktop|Mobile):**~~ interactive rows pad Small × `var(--zen-margin-comfortable)` (24px desktop/tablet,
    20px mobile), not Padding/XLarge. `listRowBox` (tools/studio/detach.mjs) still falls back to paddingX xl with no note;
    the Studio measures the row, so detached output is right per frame (phone frame → lg), but the fallback and the
    approximation should say the default inset follows the breakpoint (like inset="comfortable"). Needs the user's OK.
  - **Done 2026-10-07 (backlog batch 2: the "Row inset" label is gone; the prop shows as the API marks it):** ~~**P3 · Inspector: List `inset` is @deprecated**~~ — `inspector/propSchema.ts` still labels it "Row inset" (inspector
    owner: hide it or mark it deprecated).
  - **Done (checked 2026-10-07, backlog batch 2: set then remove returns the original text; a selftest check covers the tag closed on its last line):** ~~**P3 · Studio setProp/removeProp on a multi-line self-closing tag:**~~ setting then removing a prop (e.g. `fullWidth`
    on card.tsx's Segmented) leaves `/>` on its own line instead of the original text, so the draft no longer equals the
    disk until it is discarded (found by the resize builder, 2026-10-03).
  - **Done 2026-10-07 (backlog batch 2: tsconfig.json excludes `src/platform/examples/drafts`, git ignores it; the samples' own tsconfigs set `exclude: []`):** ~~**P3 · Studio selftest temp files in src/:**~~ `tools/studio/selftest.mjs` writes detach tsc samples under
    `src/platform/examples/drafts/`, so a `tsc` run in parallel fails and the 5173 watcher sees them; write them to a temp
    dir with its own tsconfig.
  - **Closed (2026-10-07, user decision in backlog batch 8: keep it as it is):** ~~**P3 · Frame Save at mid zoom:**~~ on hover a drafted frame adds its frame tools only when the whole toolbar fits
    above it; otherwise the tools need a selected frame (by design, so Save never jumps; revisit if it confuses).
  - ~~**P2 · Token sync:** the live Figma Component Theme collection has 8 modes; the repo has 6 (no Neutral - S5, S6).~~
    Done 2026-10-02 (session "Platform UI/UX redesign với canvas editor"): Neutral - S5, S6, S7 synced from Component Theme.json.
  - **P3 · AiChatField focus ring (decision):** focus adds a 1px Border/Neutral/Subtle ring, which in S4 equals the new
    resting stroke, so only the caret changes; ChatComposer uses the standard Input ring (user-approved 2026-10-02).
    Option: give AiChatField (all three styles) the same ring. `ai-chat.css` focus-within rules. **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** all three styles take the standard Input ring → batch 6 · **Done 2026-10-07 (batch 6)** (ai-chat.css :has(> .zen-ai-field__input:focus)).
  - **Done 2026-10-02 (user: "sửa lỗi đi") · P3 · Intermittent smoke finding on chat:** a race in the audit's smoke
    layer check, not a UI bug: it sampled a popover rect read before the mouse moved, while chat demo timers re-pinned a
    thread and the portalled popover moved with its anchor. The check now samples the popover's live rect
    (`tools/platform-audit/audit.mjs`). Verified: 6 gate-flag runs clean under load, 3 genuine-overlap CSS variants still
    flagged, all 61 pages × 1512/390 old vs new: no real overlap lost, none added. It also ends the templates@390
    "HR · Home #1" flake below (old check: 5/5, new: 0/5).
    - **Done 2026-10-02 (user: "xử lý hết lần lượt") · P3 · Smoke hardening:** pointer spot kept inside the viewport,
      on-screen part sampled, 0×0/closed popovers skipped and counted in `report.smokeStats` (one summary line,
      information only), hover-revealed toolbar buttons clicked with the pointer on their row.
  - **Done 2026-10-02 (user: "xử lý hết lần lượt") · found while fixing it:**
    - **P2 · Reaction-Bar clipped at 390:** `useAnchoredPosition` now shifts a surface that fits on neither edge of
      its anchor into the viewport (`clampAnchoredLeft`, 8px margin); surfaces that fit are placed as before.
    - **P3 · ChatThread re-pins after a programmatic scroll:** the reader's input/position are refs, focus counts as
      input, and an input while the thread is away from its end unpins it (tests: chat-thread-picker.test.tsx).
    - **P3 · Docs page jumps at 390:** `.platform-phone { overflow-anchor: none }` (measured −38px → 0).
    - **P3 · React picker refocuses on every render:** focuses once per opening (Popover merges refs inline).
    - **P3 · Smoke coverage of chat hover toolbars:** covered by the smoke hardening above.
    - **Not a bug · desktop chat windows open at scrollTop 0:** every thread opens at its end on load (13/13 at
      1512 and 390); the case seen mid-smoke was the re-pin above.
    - **Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 5):** useMenuPlacement shifts a menu that fits on neither edge into the bounds (margin each side; test in input-popups). Was: ~~P2 · Menu cut off at 390:~~ Menu has its own `useMenuPlacement` (not the clamp): menu › Project actions #2 More
      opens at x −51 on a 390px window, labels cut ("opy link"). Same fix as `clampAnchoredLeft`.
    - **Done (checked 2026-10-07, backlog sweep: Menu keeps the 8px margin (Menu.tsx:146-157); at templates@390 all 7 Settings menus open between 146 and 378):** ~~**P3 · Menus at the viewport edge:**~~ templates@390 HR cards' Settings menus open at x 2 (inside the 8px margin).
    - **Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 5):** Popover autoFocus focuses with preventScroll (Switch workspace: scrollY 3316 → 3316, list on screen). Was: ~~P2 · Sidebar workspace switcher jumps the page:~~ sidebar › Switch workspace (and templates › Empty and error
      states #2) scroll the page 3250 → 602 and open the listbox off-screen (focus set before it is positioned).
  - **Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 4):** DatePicker re-opens on the applied value's month (else today's; useLayoutEffect on open; test in input-popups); the focus-after-failed-submit half was already fixed (DateField opens on focus only after Tab). Was: ~~P2 · DateField:~~ the calendar opens on today's month even when the field holds a typed date in another month;
    after a failed ModalForm submit, focus lands on the first invalid DateField and its calendar covers the dialog's
    title and first fields (HR Public holidays, My leaves).
  - **Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 1), already fixed in Toast.tsx (the action dismisses unless `keepOpen`):** ~~P2 · Toast:~~ a Toast stays visible after its Undo is pressed (HR Expense overview, Leave types).
  - **Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 4):** the trigger is `aria-labelledby="<label> <trigger>"` ("Role Editor"; an unlabelled one reads its aria-label through a hidden span); test in input-popups. Was: ~~P2 · SelectField:~~ the trigger button's accessible name is only its value; the label points at the hidden native
    select.
  - **Done (checked 2026-10-07, backlog sweep: templates@1160: all 5 Notifications panels open as modals with the header fully visible):** ~~**P2 · SidePanel in the docs frame:**~~ at ~1160px the notifications panel of Admin list / Settings opens as a modal
    with its header cut off at the top.
  - ~~P1 · Sidebar collapsed Basic width~~ — done 2026-09-30 (user: "Có"): the collapsed panel HUGs its logo like
    Figma 4081:15233 (84 with the 28px logo; HR rail 88 = 8 + 72, main at 80).
  - **Done (checked 2026-10-07, backlog sweep: at templates@390 the Segmented is 203px in a 302px card and nothing scrolls (HrExpenseOverviewTemplate.tsx:427)):** ~~**P3 · Expense Overviews at 390:**~~ the hugging range Segmented scrolls sideways (phone rule: single-choice Chips).
  - **Closed (user, 2026-10-05: "chữ trắng trên Avatar nền Solid: Giữ nguyên hết") — Figma's solid colours stay; the harness keeps warning.** ~~P2 · Solid Avatar initials contrast (designer question):~~ white initials on Solid Green / Orange / Teal / Accent /
    Cyan avatars measure 2.6–2.9:1 (gate warnings on avatar, list-item, sidebar, bottom-sheet playground, HR All Tasks
    Space "P"). Figma uses Content/On-Colors on these fills; needs a colour decision, not an example fix.
  - **Done 2026-10-05 (session 28eea406):** a 390 pass of all 61 pages found only the Input label tooltip (now a 24px
    hit area) and lone Tooltip-page links (exempt under WCAG 2.5.8's spacing exception, which the audits now apply); the
    chat items were gone since the 10-02 audit fix. ~~P3 · Gate target warnings (component level, pre-existing):~~ chat
    reactions 18×15, chat call action 129×20, input label tooltip 12×12 at 390.
  - **Done 2026-10-05 (user: "Đúng"):** Sidebar item `theme` defaults to neutral at every level (Figma Menu-Item Theme default Neutral); `theme: "accent"` keeps the pink. ~~P2 · Sidebar selected child item~~ is accent-subtle (pink); Figma HR-Platform shows it neutral grey (Time Off ›
    Configurations › Leave Types).
  - **Done (checked 2026-10-07, backlog sweep: at app-shell and templates@390 every header keeps its actions on the toggle's row (app-shell.css:44-48)):** ~~**P2 · AppShell top bar at 390:**~~ the actions wrap under the menu button (HR templates, App Shell › HR workspace).
  - **Done, verified 2026-10-05 (user: "Thử"):** MetricWidget/MetricCard `variant="title-highlight"` (Figma 7523:507049) exists and HR Home, My Leaves, My Expenses, Expense Overview and Public Holidays use it. ~~P2 · Metric has no Title-Highlight variant~~ (title on top, big number, DockIcon): HR Home, My Leaves and Expense
    Overviews compose it from Card + Heading + DockIcon.
  - **P3 · Sidebar with a custom `brand`** loses its own collapse control (flat canvas without a top bar must use
    logo/productName). **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** a custom `brand` keeps the collapse control → batch 6 · **Done 2026-10-07 (batch 6)** (Sidebar SidebarCollapseButton after the brand).
  - **Done 2026-09-30:** the Bottom Navigation and Templates screens have their h1 (Form "Mobile checkout" was already
    fixed); outline-* warnings run by default with their baseline seeded, `rhythm` re-seeded; the gate maps
    `PlatformPhone.tsx`, `PlatformTypographyHierarchy.tsx` and `PlatformMobileShowcases.tsx` helpers to their pages.
    Log: `session-log-2026-09-30.md`.
  - **Done (checked 2026-10-07, backlog batch 4: chat and side-panel pass the outline checks at 1512 and 390):** ~~**P2 · Screens still without an h1 (baselined debt, found by the default-on outline check):**~~ Chat "Desktop
    messenger", "Desktop support (Business)", "Desktop group media", "Reply to any message" (Messenger starts at h3
    "Messages"); Side Panel "Docked inspector". (Sidebar shells fixed 2026-09-30: PageHeader h1 + h2 sections.)
  - **Done 2026-10-01 (user chose option A):** EmptyState `compactTitle` gives a Card you title yourself the ChartCard
    title style (Body/Extra/Bold).
  - **Done (checked 2026-10-07, backlog sweep: the row click also selects the row (PlatformTypographyHierarchy.tsx:267)):** ~~**P3 · Typography "Emphasis inside a level":**~~ clicking a row that is already read does nothing (behaviour
    deadclick ⚠); let the row toggle read/unread or say so in the caption.
- **Closed (user, 2026-10-05: "Motion: Đóng") — the P2 motion ideas below stay as ideas, not planned work.** **Motion (2026-10-01):** P1 is done (tokens in the pipeline, reduced motion keeps fades, Popover/Menu/tooltip
  enter and exit, raw values swept, motion rules). The user's decisions: reduced motion = movement off (1A), code-owned
  tokens + Figma Motion collection (2A), productive only, no spring (3A), colour-only press feedback (4A), the Segmented
  Primary label flips at the midpoint (5A). Review: `docs/context/motion-transitions-review-2026-10-01.md`. Next:
  - **P2:** sliding Tabs indicator and Segmented thumb (label colour flips mid-slide); Checkbox/Radio/Toggle
    micro-motion; usePresence driven by animationend (then reduced motion can fade out too); Sidebar collapse with
    transform instead of width; Accordion content fade; Progress with scaleX. Each needs the full gate.
  - **Closed (2026-10-07, user decision in backlog batch 8: the Motion P3 ideas are dropped):** ~~**P3:**~~ shared add/remove motion for list rows; Toast stacking (design decision; enter/exit, timers and the shared
    layer fixed 2026-10-04, a collapsed "pile" like Sonner is still open); View Transitions on the platform.
- **Done 2026-10-05 (user: "Xử nốt"):** the parallel gate (static steps side by side, ZEN_QA_SHARDS audits) was already in; the last part is `npm run qa -- --isolated` (tools/qa/isolated-server.mjs: private Vite on 5200+, own cache, no watcher/HMR, no Studio drafts; also the fallback when the shared server is down). Was: ~~P1 · Faster QA.~~ Owner: "Quy trình kiểm tra Component build". On 28/9, 32 QA runs audited 419 pages one at a
  time, about 5 hours of browser time on an 11-core Mac.
  - **Done (checked 2026-10-07, backlog sweep: done another way under the faster-QA parent: ZEN_QA_SHARDS processes (run.mjs:179-181), parallel static steps and `--isolated`):** ~~Add `--workers=N` to `audit.mjs`, `behaviour.mjs` and `shoot.mjs`: one browser with N contexts working from a page~~
    queue.
  - Run the static gates concurrently in `tools/qa/run.mjs`.
  - Optionally audit a `vite build` preview on its own port, so other sessions' HMR never breaks a run.
  - Expected: 3–4× faster; `qa --all` from ~45 to ~12–15 min.
  - **Done 2026-09-30 (was P1, approved by the user):** concurrent contract suites overwrote the shared
    `tools/figma-contract/.out/harness.js` (18 of 23 failed on a token change). Each run now builds in its own folder,
    the gate runs 4 suites at a time (`ZEN_QA_SUITES`, 1 under `--serial`), and a token sync takes the fast path without
    `--files`. Log: `session-log-2026-09-30.md`.
- **Done 2026-10-05 (user: "Xử nốt"):** the post-edit hook warns "Shared file: …" when a session edits a file another session's ledger touched in the last 30 min (lib.recentOtherEdits, once per file per half hour); AGENTS.md "Working alongside other sessions" now states file areas, worktrees, one commit place and --isolated. Was: ~~P1 · Session setup.~~ Give each parallel session its own file area, and a worktree when two sessions touch the same
  files. Commit from one place, at agreed stable points. 8 of 32 QA runs on 28/9 failed, most of them because another
  session was mid-edit.
- **Done (checked 2026-10-07, backlog batch 4, 390 shots):** the SSO label fits; "Docked inspector" is a desktop screen example (not shown at 390); "Trailing actions" became "Pending invites" (actions fold into a More menu); the Menu table scrolls sideways to its ⋯ column by design (its description says so) and the Sidebar shells use lists; the Bulk-Action bar is one row of icon buttons. Was: ~~**P2 · Narrow-width example slips** seen in the 390 contact sheets (pre-existing):~~
  - **Done (checked 2026-10-07, backlog sweep: see the batch 4 line above; side-panel, list-item, menu, sidebar and popover audit clean at 390):** ~~Templates › Sign in: the SSO button label is cut off.~~
  - **Done (checked 2026-10-07, backlog sweep: see the batch 4 line above; side-panel, list-item, menu, sidebar and popover audit clean at 390):** ~~Side Panel › "Docked inspector": the panel is clipped.~~
  - **Done (checked 2026-10-07, backlog sweep: see the batch 4 line above; side-panel, list-item, menu, sidebar and popover audit clean at 390):** ~~List Item › "Trailing actions": captions wrap to 4 lines.~~
  - **Done (checked 2026-10-07, backlog sweep: see the batch 4 line above; side-panel, list-item, menu, sidebar and popover audit clean at 390):** ~~Tables are cut off in narrow cards: Menu › "Row actions in a table" and the Sidebar shells.~~
  - **Done (checked 2026-10-07, backlog sweep: see the batch 4 line above; side-panel, list-item, menu, sidebar and popover audit clean at 390):** ~~Popover › "Selection toolbar (Bulk-Action)": at 390 the Delete action wraps to a second row (seen 2026-09-29).~~
- **Done (checked 2026-10-07, backlog sweep: every item below is closed):** ~~**P2 · Audit warnings kept as debt:**~~
  - **Done (checked 2026-10-07, backlog batch 4: the Brand colour example is gone; color-selector and dialog audit clean):** ~~Color Selector › "Brand colour" preview text on the White swatch 2.59:1; Dialog › "Form · Half-Half" field title
    styled Heading/4 but not a heading (rhythm) — both seen 2026-09-30, pre-existing.~~
  - **Done (checked 2026-10-07, backlog sweep: no contrast finding on list-item, sidebar, bottom-sheet and top-navigation at 1512/390, light and dark; the Avatar solid colours are kept by the user's decision):** ~~Avatar initials contrast of 2.7–2.9:1 (List Item "BN" / "CT", Sidebar workspace "A", Bottom Sheet share/people~~
    avatars "DP", "DT", "HC", "RN", "PP" in light and dark, and the same people in the Top Navigation playground
    list; seen 2026-09-30).
  - **Done 2026-10-05 (see the P3 target item above).** ~~Small targets:~~ Chat reaction pills (15px tall), the Chip mobile filter row (20px), TopNavigation control-bar
    Segmented (20px; also Segmented › "Fits a phone" — Medium is already the largest size, the phone frame is scaled), the Input label tooltip button at 390 (12×12, `.zen-input-label__tooltip`; seen 2026-09-30), Bottom
    Sheet "Share sheet" / "Long content" buttons at 390 (20px tall in the scaled phone frame).
- **Done (checked 2026-10-07, backlog sweep: the coverage matrix finds every category on these pages (examples/pages)):** ~~**P2 · Example coverage gaps**~~ (qa step ④):
  - **Done (checked 2026-10-07, backlog sweep: Projects flyout long, Handbook many):** ~~sidebar: edge cases.~~
  - **Done (checked 2026-10-07, backlog sweep: Settings sections, Mobile receipt):** ~~divider: states, edge cases, mobile.~~
  - **Done (checked 2026-10-07, backlog sweep: popover "Sort on a phone", dialog "Withdraw on a phone"; side-panel has no phone example by design):** ~~side-panel, popover, dialog: mobile.~~
  - **Done (checked 2026-10-07, backlog sweep: list-item "Settings on a phone"; tooltip has no phone example on purpose):** ~~tooltip, list-item: states, mobile.~~
  - **Done (checked 2026-10-07, backlog sweep: "Reading list" empty state):** ~~link: states.~~
  - **Done (checked 2026-10-07, backlog sweep: skeleton, error and empty states, minColumnWidth, "Choose on a phone"):** ~~card: states, edge cases, mobile.~~
  - **Done (checked 2026-10-07, backlog sweep: aria-labelledby in "Unsaved changes" and "Running total"):** ~~action-bar: keyboard / a11y (seen 2026-09-30).~~
  - **Duplicate (checked 2026-10-07, backlog sweep: same as the link line above):** ~~link: states (seen 2026-09-30).~~
  - **Done (checked 2026-10-07, backlog sweep: page-header pending, empty, long title and phone; app-shell empty states):** ~~page-header: states, edge cases, mobile; app-shell: states (seen 2026-09-30).~~
  - **Done (checked 2026-10-07, backlog sweep: "Icon-only columns (narrow)", "Unread counts on a phone"):** ~~visually-hidden: edge cases, mobile (item 16 of the user's 2026-09-30 review list re-checks these examples).~~
- **Done, verified 2026-10-05:** ExampleCard's ZenProvider inherits the docs breakpoint (no `breakpoint` prop; PageHeader examples reorder at 390). ~~P2 · Example cards pin `breakpoint="desktop"`~~ (`PlatformShowcases.tsx` example card ZenProvider): responsive Grid
  columns never change in examples at 390. Layout wraps its responsive examples in `ZenProvider breakpoint="auto"`,
  Metric uses intrinsic `auto-fit` tracks / a container query. Decide at platform level (user/designer decision).
- ~~**P3 · Top Navigation scrollRef adoption:**~~ **closed 2026-10-07 (backlog cleanup):** done: Master screen · phone uses `scrollRef` + `headerOverlay screenRef` (PlatformTypographyHierarchy.tsx). Was: Typography › "Master screen · phone" (`PlatformTypographyHierarchy.tsx`
  ~161) still sets `collapsed` from an onScroll > 24 threshold; move it to `scrollRef` + `headerOverlay screenRef`.
- **Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 6):** the appLayer cycle was already gone; the one cycle left in src/platform (PlatformExamples ↔ PlatformMobilePlaygrounds) is broken — PlaygroundSlot moved to appLayer/playgroundParts.tsx (re-exported), MobilePlaygrounds imports the leaf; a Tarjan scan of src/platform (static + eager glob) finds no cycles. Was: ~~P2 · appLayer import cycle:~~ `appLayer/shared.tsx` ↔ `PlatformExamples` / `PlatformTemplate`. It can throw
  "Cannot access 'option' before initialization" under HMR. Move `option` and `Panel` into a leaf module (Open items
  has the detail).
- **Done 2026-10-05:** see `zen-ds audit` (P1 above). ~~P3 · A rendered-page check for apps~~ (a blocker from the final blind trial, score 8.5).
- **P3 · Official Inter WOFF2** (with the glyf transform, about 10% smaller than today's conversion): needs the user's
  approval to download it. **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** use the official Inter WOFF2 → batch 7 · **Done 2026-10-07 (batch 7)** (src/assets/fonts/Inter: the v4.1 release web/ files, same build 4.001 git-9221beed3, about 4% smaller, not 10%).
- **Closed (2026-10-07, user decision in backlog batch 8: recorded as out of scope (demo modes)):** ~~**P3 · Live modes that the repo does not have:**~~ Typography Configuration `Ecom-Demo` (and `Zen-Platform`, kept in
  platform.css), Base Colors (Project) `Chat`, `VT`, `Ecom-Demo`. Global Dimensions' only mode is now named `Zen`
  (repo: `Mode 1`, no effect on CSS).
- **Done (checked 2026-10-07, backlog sweep: badge.css:64, :70 pad the Small/Medium counter text with Spacing/Padding/3XSmall; the missing Badge suite is item (3) of the Sky/Mint/Bronze/Golden follow-ups):** ~~**P3 · Badge-Counter parity:**~~ the 2026-09-29 Chip/Trailing capture shows the Small badge's Text-Wrapper with
  Spacing/Padding/3XSmall side padding. There is no Badge contract suite yet to check the component.
- **Done 2026-10-02 · Audit tools** (user-approved): targets use the layout size and edges divide by the frame's
  scale (`audit.mjs`), so a 32px control in a 0.63 phone counts as 32px (chat@390: 3 targets → 0); the density
  snapshot skips `[inert]` content (collapsed Accordion panels); `behaviour.mjs` presses Escape again when the first one
  closed a popup inside the dialog; `shoot.mjs --timeout= --wait-until=` for a busy machine.
- **Done 2026-10-02 · DateField a11y:** the inputs session made the field an APG Date Picker Combobox (role=combobox,
  aria-haspopup="dialog", aria-expanded). `behaviour.mjs` comboFlow now checks that pattern: ArrowDown opens the
  calendar dialog, focus moves into it, and Escape closes it and returns focus to the field.
- **Closed (2026-10-07, user decision in backlog batch 8: the docs shell gaps and raw values stay as accepted exceptions):** ~~**P3 · Docs chrome off the spacing ladder (found 2026-10-02, needs a decision, tier L):**~~ the docs shell's own
  layout in `platform.css` keeps gaps outside the ladder. The ladder pass covered templates, the app layer and
  playgrounds only.
  - **Closed (2026-10-07, user decision in backlog batch 8: accepted with the parent):** ~~Off-ladder gaps: `.official-page` and `.official-overview__content` giant 64; `.official-intro`,~~
    `.platform-page-template__body` and `.platform-component-sections` 3xl 48; `.pg` 2xl 40; topbar breadcrumbs and
    `.pg-refs` 3xs 2.
  - **Closed (2026-10-07, user decision in backlog batch 8: accepted with the parent):** ~~Raw values: `.official-cover__body` / `.platform-page-hero__main` 30px; `.platform-phone__levels` 7px (device chrome).~~
  - Every page renders these, so `npm run qa -- --all` is needed.
  - **Done 2026-10-02 · Full screen on `screen: true` examples:** the focus raise rule in `platform.css` is now
    `.pe-card:not([data-fullscreen="true"]):is(:focus-within, …)` (fixed by "Disable input…").
  - **Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 6):** on `data-breakpoint="mobile"` the title row is display: contents and the order is title, description, actions (12px under it), tabs (custom properties in page-header.css; test). Docs phone previews still resolve desktop (P1 "Docs phones resolve desktop tokens"). Was: ~~P2 · PageHeader on phones:~~ when the actions wrap they land between the title and the description, so the one
    line that explains the title sits under the buttons (`page-header.css` 2–10). Move the description into the
    titles column or order it before the actions under the mobile breakpoint.
  - **Closed 2026-10-05 (user: "WCAG đã lỗi thời…" — keep the light border; no token change).** **Checked 2026-10-05 (backlog batch 6): code = Figma** — Checkbox/Mark and Radio-Button/Radio-Mark Default · Select=No both stroke `Checkbox/Border/Default` (#0101011D) in the captures; reaching 3:1 is a token change in Figma (designer's call, asked). **P2 · Checkbox / RadioButton unchecked outline** measures rgba(1,1,1,0.114), about 1.3:1 on white (WCAG 1.4.11
    asks 3:1 for the control boundary). Check the Figma token first.
  - **Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 5):** `DialogAction` takes `type` + `form` (SidePanel and Dialog actions; Enter in a field submits; test in input-popups). Was: ~~P2 · SidePanel `primaryAction`~~ cannot be `type="submit"` / `form` (ActionBar can), so a form in a panel calls
    `requestSubmit()` from onClick and Enter in a field does not submit.
  - **Done 2026-10-02 · Brief §3b** now says example cards inherit the docs breakpoint.
    - PageHeader `headingLevel={2}` renders Heading/2 (25px) next to the 28px h1; the house ladder says h2 = Heading/4. **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** PageHeader h2 uses Heading/4 (house ladder) → batch 6 · **Done 2026-10-07 (batch 6)** (PageHeader.tsx; typography ladder table; guideline).
    - FormActions in a narrow card (~424px) stack full width, and a dirty-only "Undo changes" makes the card grow. **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** FormActions stack by container width (< 480px) → batch 6 · **Done 2026-10-07 (batch 6)** (already so since 2026-09-30: Form.tsx STACK_BELOW measures the parent).
- **Done (checked 2026-10-07, backlog sweep: ListItem `inset` is deprecated and the container insets the rows (ListItem.tsx:13-16); chip.tsx:271-276 pads its Box paddingX lg):** ~~**P3 · Phone List inset:**~~ Chip "Mobile filter row" and Button "Mobile footer CTA" keep List at its default inset
  (Margin/Comfortable 24px) while the rest of the screen sits on Margin/Compact (20px), so rows start 4px right of the
  chips and the Back chevron. `List inset="compact"` lines them up (as in the new Segmented phone example).
- ~~**Blocked:**~~ **closed 2026-10-07 (backlog cleanup):** same blocker as the Code Connect for Description List line. Was: Code Connect needs a Figma Organization or Enterprise plan.
- **Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 5):** DateField writes the pick in DatePicker `onApply` when `datePickerActions` (Cancel/Escape keep the date; the zen-allow-date-apply exception is gone; test in input-popups). Was: ~~P2 · DateField `datePickerActions` commits on pick:~~ `handleDateChange` (onValueChange) writes the field and closes
  at once, so Cancel and Submit can never differ. Make the pick a draft and commit in the new DatePicker `onApply`
  (Cancel and Escape keep the old date). `zen-allow-date-apply` in `Input.tsx` marks the spot; session log
  2026-09-29, "The last 5 dead clicks".
  - **Done (checked 2026-10-07, backlog batch 4: the file name is part of the caption now):** ~~Templates page list at 390: the trailing file name leaves the caption column ~63px wide.~~
  - **Done (checked 2026-10-07, backlog batch 4: both examples were reworked, "Handbook with chapters" and "Pending invites" read in full at 390):** ~~Captions narrower than one word: Sidebar "Flat · knowledge base" (390) and List Item "Trailing actions" (390,
    Comfortable).~~
  - **Done (checked 2026-10-07, backlog sweep: the month label is 127.7px in the 128px button; density fit is clean at 1512 and 390):** ~~DatePicker at Comfortable (1512 and 390): "September 2026" fills the month button's padding.~~
  - **Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 2):** both Sidebar roots are `<nav>` now (same class, data-* and aria-label). Was: ~~P1 · Sidebar landmark:~~ Sidebar renders `<aside aria-label="Main navigation">` (a complementary landmark), so an
    AppShell page has no navigation landmark (`Sidebar.tsx:380, 399`). Make it `<nav>`. The user deferred Sidebar edits
    on 2026-09-29.
  - **Closed (2026-10-07, user decision in backlog batch 8: no rail shortcut, ⌘B is enough):** ~~**P3 · Keyboard shortcut for the rail toggle:**~~ Atlassian has an opt-in Ctrl+[ and Apple HIG asks for one. Needs a
    decision (it must not clash with ⌘B / Ctrl+B bold in editors).
    - **Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 3):** `figmaSidebarBrand.logo` is an inline SVG in currentColor built from the asset's own paths (dark Sidebar: #FDFDFD on #1C1C1C). Was: ~~P2 · The platform wordmark is invisible in dark mode:~~ `figmaSidebarBrand` in `PlatformSidebarBrand.tsx` draws
      the Zen logo as an `<img>` with a hard-coded #111. It sits on the dark Sidebar in every Sidebar and App Shell
      example. Use an inline SVG in currentColor.
    - ~~**P3 · PageHeader when its actions wrap:**~~ **closed 2026-10-07 (backlog cleanup):** done 2026-10-05 (backlog batch 6): on the mobile breakpoint the order is title, description, actions. Was: the order becomes title → buttons → description, so the description is
      split from its title. Example cards force `breakpoint="desktop"`, so at 390 they never show the mobile order
      (Primary first).
    - **Done (checked 2026-10-07, backlog sweep: the title sits in the ListBox header (DashboardTemplate.tsx:603-606)):** ~~**P3 · Dashboard template:**~~ the "Recent activity" title sits outside its card while "Revenue"'s sits inside, so
      the two columns start at different heights.
    - **Done (checked 2026-10-07, backlog sweep: behaviour.mjs waits for running transitions (l.58-66, :1122) and pointAt lets them finish (l.405-411); no templates@1512 baseline entries are left):** ~~**P3 · Behaviour probe clicks during a layout transition:**~~ the probe clicks the next control about 25ms after
      the previous one. After "Collapse sidebar" the page is still sliding (Sidebar width transition, 160ms), so the
      first Breadcrumb is missed and reported as a dead click. Reproduced: it works after 400ms. This gives 2 ⚠ on
      templates@1512 (Admin list "Home", Detail "Invoices"). Fix in `behaviour.mjs`: wait for running transitions
      before `pointAt`. Owner: "Quy trình kiểm tra Component build".
    - **Done (checked 2026-10-07, backlog sweep: app-shell has "Banner above the shell" and "No people match"; page-header has First use, Long title and List page phone; the coverage matrix finds all four categories):** ~~**P3 · Example coverage (qa step ④):**~~ `app-shell` has no "states" example (a loading shell, an offline
      banner, an empty notifications panel); `page-header` still lacks states, edge cases and mobile (pre-existing).
  - **Done 2026-09-29 (was P1): synced from the user's second `Global Colors.json`, gate PASS.** Apply the new Dark
    Neutral step 9, then sync tokens: Dark/Gray/9 goes #656565 (3.29:1) → #929292
    (6.16:1), Dark 9→10 now 1.16:1 like Light. Run the plugin's Check → Update in the live file, then
    `skills/zen-token-sync`. Consumers: `Color/Background|Border/Support/Neutral/Solid` (Dark) and
    `Color/Content/On-Black-Overlay/Light` (Dark/Neutral-Alpha/9).
  - ~~**P2 · Light Neutral step 10 follows the raw input lightness, not step 9**~~ **closed 2026-10-07 (backlog cleanup):** decided 2026-09-29: the user keeps Light as is. Was: (`L10_nl = L9 - 0.032`): Color Generator
    palettes get Light 9→10 anywhere from 1.08 to 1.98:1 (Slate hsl(220,10,50): 1.47; Gray at 70% makes step 10
    lighter than step 9), and Check regenerates another step 10 from the saved step 9 (Gray #828282 vs #838383).
    **Decided 2026-09-29: the user keeps Light as is, no change.** Check's ±1-per-channel tolerance treats #828282
    and #838383 as equal, so Gray is not flagged; the drift only affects new tinted palettes made in the Generator.
  - **Closed (2026-10-07, user decision in backlog batch 8: it belongs to the plugin repo's own session):** ~~**P2 · Plugin build drops the bundled component packages:**~~ `src/components/*.json` (Button_Main,
    Button_Icon-Main, Nav-Action_Main, Nav-Action_Icon-Main) were removed at 15:06, after the 15:00 build, so
    `npm run build` now writes a 0.5 MB `dist/code.js` without them. This session kept the rebuilt `dist/ui.html` and
    restored `dist/code.js` byte for byte, so the unbuilt 15:15 `code.js` change (check progress messages) is not in
    dist yet. Decide whether the packages come back before the next build.
  - **Done, verified 2026-10-05:** the 2026-10-03 Global Colors sync carries them (dark alphas are lightening overlays, e.g. `--zen-dark-yellow-alpha-3: #FF7C0024`, `--zen-dark-orange-alpha-3: #FF5C002A`). ~~P1 · Apply the new dark alphas, then sync tokens:~~ dark alphas are now lightening overlays, so steps that were
    87–96% opaque become translucent: Yellow/Orange/Golden 2–7 (step 3: #2E1D00F5 → #FF81001F, #371900EE → #FF500027,
    #2C1E00F5 → #FF91001D; on Surface-Default 1.07 → 1.20–1.22:1), Mint 2–7, Cyan/Sky/Teal 5–7, Blue/Grass 6–7,
    Tomato 7, and step 1 of every accent (unused). Solids, Light alphas and real Neutral palettes are unchanged. Run
    the plugin's Check → Update in the live file, then `skills/zen-token-sync`. Consumers: the Subtle/Flat
    background and Subtle border tokens of Warning (Yellow), Info (Blue), Positive (Grass), Negative (Tomato) and the
    Support colours.
- **Done, verified 2026-10-05:** `--zen-dark-gray-1: #121212` in tokens.css (the 2026-10-03 sync). ~~P1 · Zen Plugin Neutral Dark step 1 = 7% HSL (2026-09-29):~~ `NEUTRAL_DARK_STEP_1_LIGHTNESS` 6 → 7, so Dark/Gray/1
  #0F0F0F → #121212 and every Neutral Dark step is re-solved against it (Gray/2 #1D1D1D, /9 #939393, /12 #FDFDFD);
  accent darks and alphas follow the new canvas. Run the plugin's Check → Update, then `skills/zen-token-sync`.
  Backup `backups/zen-ds-before-neutral-dark-l7-20260929-191010.tar.gz`.
  - **Done (checked 2026-10-07, backlog sweep: ExampleCard no longer forces a breakpoint (PlatformShowcases.tsx:38-43); the comment at appLayer/layout.tsx:156 is stale):** ~~**P2 · Example cards force `breakpoint="desktop"`**~~ (ExampleCard's ZenProvider in `PlatformShowcases.tsx`), so
    `Grid columns={{ mobile, desktop }}` never collapses at 390; builders used `minColumnWidth` + clamp instead. The
    Search guideline's toolbar pattern (`columns={{ mobile: 1, desktop: "minmax(0, 320px) 1fr" }}`) fails there too.
  - **Closed (user, 2026-10-05: keep as is).** ~~P2 · Avatar solid contrast:~~ white initials on green 2.93, teal 2.70, orange 2.73, cyan 2.60 (yellow uses its
    own text) fall under 3:1 (`avatar.css` on-colors on support-*-solid). The examples' people avoid these themes.
  - **Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 4), all already fixed in code (Avatar names initials from alt, Badge remove "Remove <label>", Search filterHasPopup/filterExpanded, icon-only Segmented tooltip):** ~~P2 · Avatar initials have no accessible name~~ (alt is ignored without src), so AvatarStack initials read as
    "KB". **Badge remove** is always named "Remove" (guideline: "Remove <label>"; Tag uses `t.removeItem`).
  - **Done (checked 2026-10-07, backlog sweep: Search passes filterHasPopup / filterExpanded and the target is 24×24 (Search.tsx:57-59, :163, search.css:32-33); icon-only Segmented options use useIconTooltip (Segmented.tsx:113-116)):** ~~**P2 · Search filter trailing**~~ does not pass `aria-haspopup` / `aria-expanded`; the filter-icon target is 18×18
    at 390. **Icon-only Segmented options** have no 1s name tooltip (IconButton rule).
  - **Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 4): day names (full date) and DateField minDate/maxDate were already fixed; Time-Picker fields are now Medium when the DatePicker is `mobile` (new `DatePickerTimePicker` `device`).** ~~P2 · DatePicker:~~ day buttons are named "Day N" (no month/year, ambiguous in the dual calendar); Time-Picker
    inputs are Small even on phones; DateField does not pass `minDate` / `maxDate` to its calendar.
  - **Done (checked 2026-10-07, backlog sweep: link.css:11-14 resets `button.zen-link`; tag.css:26-38 paints aria-pressed; the placeholder colour is kept on purpose (see the RESOLVED line above)):** ~~**P3 · Link `as="button"`**~~ keeps the browser button background and border; a pressed **Tag** (aria-pressed) has
    no visual pressed state; SelectField placeholder "Choose a client" measured 1.92:1 (placeholder token).
  - **Done (checked 2026-10-07, backlog sweep: deliberate and documented (platform.css:832-839, usage rules §16)):** ~~**P3 · platform.css:767**~~ pads and paints any bare List inside an example stage (builders wrap Lists in Card).
  - **Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 6):** opt-in Chip `popoverPortal` (ZenPortal layer anchored to the chip; light dismiss checks the layer; guideline line; test in tests/interaction/backlog-fixes-2026-10-05.test.tsx). Not the default: a portal inside a Dialog/Bottom Sheet would fight its focus trap and outside click. Was: ~~P2 · Chip menus are clipped in any horizontal scroll box:~~ Chip renders its Popover inline, so a chip row that
    scrolls (the phone chip-row pattern in apps) hides every menu, as the docs topbar did. A portal mode (ZenPortal +
    useAnchoredPosition with the chip as anchor, like ChatReactors) would fix it in the library; it also needs the light
    dismiss and focus return to follow the portalled surface.
  - **Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 6), not reproducible:** at 1512 both dialogs take focus inside (the field / the safe Cancel) and give it back to the trigger on close. Was: ~~P2 · Button page dialog focus (QA ✗ at 1512):~~ "Page actions → New task" and "Delete a file → Delete Launch
    plan.pdf": focus does not move into the modal / does not return to the trigger after close. Seen under concurrent
    HMR reloads; re-check before fixing (examples in PlatformShowcases.tsx / appLayer).
  - **Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 5):** platform.css font-family-sans/button carry system-ui … sans-serif fallbacks. Was: ~~P3 · Platform text flashes in serif while Inter loads:~~ the Zen-Platform block sets `--zen-typography-font-family-*`
    to `"Inter"` with no generic fallback, so chips and body text use the browser's default serif until the font loads.
  - **Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 2), already fixed (`Dialog.tsx` useModal returns on `event.defaultPrevented`):** ~~P1 · Escape in a ModalForm closes the whole form~~ (in progress: the user approved the fix on 2026-10-01 in
    session "Disable input và search từ Figma", which owns it). It happens while a SelectField list or a DateField
    calendar is open, and
    what was typed is lost. Cause: `Dialog.tsx` `useModal` (~l.54) ignores `event.defaultPrevented`. Seen in Empty &
    error › New project, and it affects every date form.
  - **Done 2026-10-02 (user: yes) · P2 · Sidebar workspace switcher (APG):** `button.zen-sidebar__workspace-trigger` (aria-haspopup="listbox") opens
    its listbox with Enter but not with ArrowDown or ArrowUp. Seen in the gate on sidebar › Switch workspace,
    2026-10-01; it is a component issue, not that example's.
  - **Done 2026-10-07 (backlog batch 4: PlatformChatHeader takes `scrollRef`; the 5 Messenger threads and the Chat playground pass their screen):** ~~**P2 · G8 PlatformChatHeader** does not pass `scrollRef` on, so the 6 chat phones cannot follow the scroll rule (R1).~~
  - **Done 2026-10-02 with G4 · P3 · G5 `largeTitleAction`** could not be reached once the title folded. Figma's folded state shows it in Top-Trailing.
  - **Done (checked 2026-10-07, backlog sweep: Change role focuses the checked radio (Dialog.tsx:61-63, :98-103)):** ~~**P3 · RadioButton**~~ cannot take `data-autofocus`, so Change role focuses the first radio, not the checked one.
  - ~~**P3 · PageHeader**~~ **closed 2026-10-07 (backlog cleanup):** done 2026-10-05 (backlog batch 6): the description sits under the title on phones. Was: on phones puts the Primary button between the title and the description.
    - The Zen AI floating button sits over rows while the page scrolls (AppShell already keeps room for it at the end
      of the page). On phones it covers a row's ⋯ mid-scroll: consider hide-on-scroll. **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** on phones the button hides while scrolling down and comes back on scroll up → batch 6 · **Done 2026-10-07 (batch 6)** (AppShell useHideOnScroll, app-shell.css motion tokens).
  - **Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 1), already fixed in Input.tsx ("Not a <form>" group, Enter confirms):** ~~P1 · RichTextField renders a `<form>`~~ (insert-link, `Input.tsx` ~l.1419): inside any `<Form>` it is a nested form
    (React error; gate ✗ on Input › Task title and notes). Fix: a `div role="group"` with Enter → confirm.
  - **Done, verified 2026-10-05 (user: "đổi qua token Mobile"):** PlatformPhone sets `data-breakpoint="mobile"`; measured inside a phone Margin/Comfortable 20 and modal padding 20 vs 24 outside. ~~P1 · Docs phones resolve desktop tokens~~ (`PlatformPhone` sets no `data-breakpoint="mobile"`): margins and
    insets differ from a real phone; decision pending (see the Top Navigation rules R10 note in the example brief).
  - **Done (checked 2026-10-07, backlog sweep: short stages top-align (platform.css:487-489); an open control lifts over the next card (:490-493); the bare List paint is the documented stage rule (usage rules §16); the desktop chat stage scrolls sideways by design (:1175-1181)):** ~~**P2 · platform.css:**~~ top-align short example stages that share a row with a taller card or phone (13 pages);
    `.pe-card__stage .zen-list` (l.769) paints a bare List as a borderless Surface; a later card's stage covers an
    open popover of the card above; `.pe-chat-desktop` min-width 560 at ≤620px cuts desktop chats at 390.
  - **Done (checked 2026-10-07, backlog sweep: data.ts:203-249 holds the shared series, plan and leave data):** ~~**P2 · data.ts (examples):**~~ one shared monthly studio series for Metric + Chart (revenue, billable hours), one
    workspace plan (name, price per seat, seats) and one leave dataset, so pages stop carrying page-local copies.
  - **Done (checked 2026-10-07, backlog sweep: Bottom Navigation idle labels are Light by the user's decision; the placeholder colour is kept; the composer and read-only inputs have focus rings (chat.css:143, input.css:325-334); the InlineMessage action is Button sm; Pagination sm is 32px with an en dash; Accordion (accordion.css:34-40, :69-75); ModalForm focusFirstInvalidField; Dialog overlay root; BottomSheet onSubmit; DatePicker `today` and inline; Badge removeLabel; Autocomplete and Form focus; one-row scales (rating.css); Chat labels in sentence case; Business call padding (chat.css:74, :83); ListItem titleLines):** ~~**P2 · Components:**~~ Bottom Navigation idle labels 1.92:1 (Content/Placeholder; design decision); SelectField
    placeholder 1.92:1; ChatComposer textarea and read-only inputs show no focus indicator; InlineMessage action 20px
    tall on phones; Pagination prev/next stay 24px at size sm and the range uses " - " not "–"; Accordion Box theme
    hit area and non-concentric corner; ModalForm does not focus the first invalid field (Form does); Dialog has no
    device-frame (overlay root) mode; BottomSheet has no form/submit; DatePicker `today` prop and an inline mode
    without the popover shadow; Badge remove label; AutocompleteField Create row for an already-selected value and
    Form focus for an Error tag; NpsScale/OpinionScale one-row narrow layout; Chat labels in Title Case
    (labels.ts 394–399) and a ringing Business call's bottom padding; ListItem titles may wrap to 2 lines.
  - **Done 2026-10-02 · Audit tools:** see the Done line under Backlog (phone scale, inert panels, dialog Escape, shoot
    timeout).
  - **Done 2026-10-02 (smoke live-rect fix; old check 5/5, new 0/5) · P3 · Intermittent smoke finding:** "templates@390: HR · Home #1: layer zen-list-item__wrapper paints over the
    open popover" from `node tools/platform-audit/audit.mjs --pages=templates --viewports=390 --smoke`.
    - It showed up in about half the runs. Replays of the same click sequence, and a probe copy of the audit, never hit
      it.
    - The popover is absolute, z 1000, with no positioned ancestor, so it is probably state left over from an earlier
      card in the run.
    - The audit owner ("Add audit check…") is aware.
  - **Done (checked 2026-10-07, backlog sweep: every item below is closed):** ~~**P3 · Example coverage gaps flagged by the gate (2026-10-01):**~~
    - **Duplicate (checked 2026-10-07, backlog sweep: same as the action-bar line of the "Example coverage gaps" list above):** ~~action-bar: keyboard / a11y.~~
    - **Done (checked 2026-10-07, backlog sweep: 6 examples; "Icon-only columns" covers the narrow case and "Unique button names" is another edge case):** ~~visually-hidden: edge cases.~~
    - **Done (checked 2026-10-07, backlog sweep: "Long title", "First use" with an empty state, "List page" (actions wrap on a phone)):** ~~page-header: states, edge cases, mobile.~~
    - **Duplicate (checked 2026-10-07, backlog sweep: same as the side-panel line above (no phone example by design)):** ~~side-panel: mobile.~~
    - **Done (checked 2026-10-07, backlog sweep: "Counts that agree" and "Status text" (text.tsx:401, :429)):** ~~text: states.~~
    Add examples only in an approved batch.
  - **Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 2):** `scripts/build-api.mjs` resolves spreads in `as const` arrays (`dockIconThemes` was the only one), so Metric/MetricCard `iconTheme` and DockIcon `theme` list all 22 members; the `guidelines:check` union comparison stays an idea (a new check needs the user's OK). Was: ~~P1 · Props generator drops union members:~~ `iconTheme` on Metric/MetricCard is documented as neutral · accent ·
    inverse · on-color · pale · surface · emoji; the real `DockIconTheme` also has every hue (green, blue…). Check every
    `(typeof x)[number]` prop in docs/api and make `guidelines:check` compare documented unions with the TS type. **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** `guidelines:check` comparing documented unions with the TS type is approved → batch 9 · **Done 2026-10-07 (batch 9)** (tools/usage-guard/check-unions.mjs in guidelines:check: 215 unions match, 48 not resolvable) (tooling).
  - **Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 1): AGENTS.md step 3 already points at `examples/pages/<page>.tsx`; the dead example code is the separate cleanup.** ~~P1 · AGENTS.md DoD step 3~~ still sends examples to `PlatformShowcases.tsx` (dead since 2026-10-02); delete the dead
    example code (≈6,400 lines) so greps stop landing there. **Sweep 2026-10-07:** the dead example code cleanup is done too (PlatformShowcases.tsx is 118 lines).
  - **Done 2026-10-05 (user: "zen-ds-audit: Làm luôn"):** `npx zen-ds audit <url…> [--routes] [--viewports=1440,390] [--dark] [--out] [--strict] [--wcag-contrast]` (tools/zen-audit/audit.mjs + app-checks.mjs, quality-checks.mjs `regionSel: "body"`; axe-core when installed, its 4.5:1 color-contrast rule opt-in; screenshots + report.md/json; shipped in package `files`; AGENTS.consumer.md §8 and the `zen-ds init` AGENTS section mention it). Not ported: density (Comfortable) and the behaviour probes. Was: ~~P1 · No rendered check for apps (trial blocker since 2026-09-28):~~ `zen-ds` has init/doctor/check only. Port the
    platform audit (axe, overflow, fit, ladder, rhythm, surfaces, outline, 1440/390 light/dark shots) as `zen-ds audit <url>`.
  - **P2 · Missing app patterns (trial):** switch row (ListItem + Toggle), inset-grouped List section (needed an inline
    `--zen-list-inset`), single-choice Chip group with radio semantics, profile header, Metric trend formatter, a phone
    settings template. New components/templates need the user's OK. **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** approved now: a switch row (ListItem + Toggle) and a single-choice Chip group with radio semantics → batch 6 · **Done 2026-10-07 (batch 6)** (ToggleListItem + ChipGroup, composed, no Figma master yet; harness list-item/switch-row, chip/radio-is-chip-group); the profile header, trend formatter and phone settings template wait.
  - **P3 · Figma:** search_design_system sees 7 Zen libraries with the same names (Official-Sep2026, Kate, Starnest, Paid,
    Pokeslide, Archived, Glea); document `includeLibraryKeys` for the official key or archive the forks; published assets
    date from 2026-09-10. Stale counts in HANDOFF (49 slugs / 154 rules; now 62 / 157); `zen-usage --help` runs the check. **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** (a) document the official library key (`includeLibraryKeys`) → batch 7 · **Done 2026-10-07 (batch 7)** (AGENTS.md source-of-truth line + skills/zen-figma-component-audit: ZEN Kaiz (Official-Sep2026) key, via get_libraries); archiving the forks is the designer's step.
- **Closed (checked 2026-10-07, backlog sweep: the placeholder colour is kept on purpose; the label tooltip has a 24px hit area (input.css:481-483); "Activity, new" is the probe-order artifact; "Copy value" and "Retry" have 0 findings in the 2026-10-07 behaviour run):** ~~P3 (2026-10-03, gate .qa/reports/2026-10-02T18-13-34-74c53b07.md, found by "Component Size tokens and corner radius", not from its change): new ⚠ outside ai-chat — Select placeholder contrast 1.92:1 ("Choose a reviewer/slot" top-navigation@1512/390, "Choose a client" input@1512/390); input@390 `button.zen-input-label__tooltip` 12×12 target; dead clicks: app-shell "Activity, new", inline-message "Copy value", uploader "Retry desert-trail-lookbook.jpg".~~
- P3 (same session, needs a user decision): `.zen-chat-composer__field` copies the Input focus ring with
  Color/Focus/Neutral/Solid (`chat.css:142`, guideline "standard Input focus ring"); switch it to `--zen-input-border-focus`
  so Neutral-S7 matches Input? (2026-10-03 evening: `Input/Border/Focus` is now Color/Focus/Neutral/Solid in all nine
  modes, so both already render the same; only the binding name differs.) **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** the composer binds `--zen-input-border-focus` → batch 6 · **Done 2026-10-07 (batch 6)** (chat.css).
- **Duplicate (checked 2026-10-07, backlog sweep: the Hover binding question is the Search/Popover designer row under Open items; the stale contracts are the re-capture line above):** ~~P3 (2026-10-03 evening, session "Token JSON và Search component", for the designer; user chose to keep the code):~~
  live Field-Only (374:103464) Hover Container stroke is a fixed 2px, no longer bound to Emphasis/Border-Weight/Active/Primary
  (the contracts still bind it). Code keeps the variable (`input.css` Hover rule: Medium 2px, Strong 3px, Light 1px); only
  Strong/Light in the outlined themes (Neutral S4, S6) differ. Ask whether the unbinding was intended. Search/Default and
  Search/Popover contracts are still stale (48 + 18 variants per `figma-kit status`: Small radius 8 → 12 value, Focused/Typing
  → Input/Border/Focus / Popover-Search, Popover Hover 1 → 2px, this Hover binding); see the re-capture line above.
- **Duplicate (checked 2026-10-07, backlog sweep: "Chi Tran" and the 2px gap are the Structural audit warnings row; the HR · Home sibling h2s are the AiChatBlock row):** ~~P3 (2026-10-03, gate .qa/reports/2026-10-03T08-03-04-bd171ca9.md, session "Component Theme tokens update", not from its~~
  change): new ⚠ on example pages — button "Approve on a phone": "Chi Tran" styled Heading/4 but not a heading; button "Hand
  off when ready": Stack gap 2px off the spacing ladder; templates HR · Home: sibling h2 titles in Heading/1 and Heading/4
  (rhythm "8 text styles" on the HR templates is already listed above).
- ~~P3 (2026-10-03, gate .qa/reports/2026-10-03T08-38-12-bd171ca9.md, same session, not from its change):~~ **closed 2026-10-07 (backlog cleanup):** each part is tracked in its own line: Design Tokens dark nav contrast, Card playground slot corners, the chat Audio call dead click, the Templates 90 s budget. Was: design-tokens
  dark: the 11 collection headings measure 1.29:1; card playground Spacing=small: Card corner 16 vs slot 12 + inset 16
  (not concentric; card.css was being edited by "Slot Component phân biệt" during the run); chat "First message" Audio
  call dead click; templates exceeds the 90s behaviour budget.
- ~~P2 (2026-10-04, session "Cho phép edit element floating", not from its change):~~ **closed 2026-10-07 (backlog cleanup):** done 2026-10-05 (backlog batch 1): Narrow window › Open navigation opens the drawer. Was: behaviour ✗ on app-shell@1512 "Narrow
  window": "Open navigation" does not open with Enter and its click shows no visible effect (APG + dead click). Already
  in `.qa/reports/2026-10-03T17-00-38-710219c7.md` (00:00, before the AppShell measuring fix); fails every gate that
  includes app-shell. Probably the drawer inside `.px-app-shell-window` (overflow: clip) — needs a look.
- **Closed (2026-10-07, user decision in backlog batch 8: the Layout self-test step is accepted as it runs):** ~~P3 (same session): `tools/qa/run.mjs` gained the "Layout self-test" static step (user-approved); the gate's maintainer~~
  should review it. AGENTS.md Commands table does not list `npm run layout:selftest` yet.
- **Done 2026-10-07 (backlog batch 2: "Metric card · Value and trend in a card"):** ~~P3 (2026-10-03, session "Figma-like editing functionality"):~~ slots/palette.ts has two items labelled "Metric ·
  Value and trend" (ids metric and metric-card); the Assets tab and the slot picker show them as twins — label the
  card one "Metric card".
- **Done 2026-10-05 (Studio builder plan GĐ1, E2E row ST-11):** P3 (2026-10-03, session "Figma-like editing functionality"): Studio menu "Move up/down" (slots/actions.ts runMove) drops
  the selection after the swap: the new loc still shows the sibling until React re-renders and SelectionLayer's
  name check runs before awaitingWriteRender covers it; edit/arrange.ts stepLayer avoids it with expectRender(…, 1500).
- **Done (checked 2026-10-07, backlog sweep: a frame never moves sideways or to another column; only frames below it in the same column shift (board/boardLayout.ts:6-12)):** ~~P3 (2026-10-03, session "Slot Component phân biệt"): Studio board reflows frames (masonry) when a frame's height changes (e.g. Clear contents then Reset slot): example frames jump columns and the selection leaves the viewport; Figma never moves frames on content edits (board/frameLayout.ts, Studio owner).~~
- **Done 2026-10-05 (Studio builder plan GĐ1, E2E row ST-10):** P2 (2026-10-04, session "Giới hạn component trong slot"): removing, clearing or resetting a stateful slot item (Dialog, Tabs, Chip row…) leaves its `const [x, setX] = useState(…)` behind unused; tools/studio/slots.mjs has toastHookRemovals for useToast but no state counterpart (tsc passes, no noUnusedLocals).
  - **Done 2026-10-05 (Studio builder plan GĐ1, E2E row S-02):** P1 · Zoom menu (`86% ▾`, canvas/ZoomControls.tsx) opens below the screen whenever the left panel is docked
    (1280–1920: 0/7 items visible; 1024/390 flip correctly).
  - **Done 2026-10-05 (Studio builder plan GĐ1):** P1 · Studio focus ring Focus/Accent/Solid #ff66d4 is 2.42:1 on the light canvas (SC 1.4.11 needs 3:1); 12 uses in
    src/platform/studio → Focus/Neutral like the components.
  - **Done 2026-10-05 (Studio builder plan GĐ1, E2E row SE-07):** P2 · Layers search with no match: blank panel + unchanged "158 layers" count (Pages/Assets have EmptyState + Clear).
  - **Done 2026-10-05 (Studio builder plan GĐ1, Popover blur):** P2 · Quick actions (⌘/) palette: rgba(255,255,255,.898) fill with no backdrop blur → canvas text shows through.
  - **Done 2026-10-05 (Studio builder plan GĐ1, E2E row S-07):** P2 · Toolbar at 390: 690px of controls in 374px; Modes, theme, Undo/Redo, Role and Inspector are off-screen.
  - **Duplicate (checked 2026-10-07, backlog sweep: same as the "Contrast in light mode (designer decision)" row):** ~~Library-wide decisions (not Studio): Tabs inactive label and Light kickers/Table headers at 3.74–3.79:1; Danger~~
    button text 3.74:1 (Negative/Solid + On-Colors).
- **Done 2026-10-07 (backlog batch 2: a move past identical items writes nothing and says why, `slots/actions.ts` runDataItem):** ~~P3 (same session): moving one of two identical list items reports "No change" (the texts swap to the same file).~~
- **Done (checked 2026-10-07, backlog sweep: components without hand-made groups fall back to groups generated from `figmaProps.generated.ts`, about 70 components (inspector/componentGroups.ts:5-13)):** ~~P2 (2026-10-05, session "Mở lại port preview"): Figma property groups exist for TopNavigation only~~
  (`src/platform/studio/inspector/propGroups.ts`). Each other component needs its Figma set read (componentPropertyDefinitions
  + which layers each boolean hides) before it gets groups; propose the order (most-used first) to the user.
- **Done 2026-10-07 (backlog batch 2: `removeItem { all: true }` takes every item and the prop, the toast hook with them; items selftest):** ~~P3 (same session): switching a list toggle off (Top-Trailing with 2+ actions) removes the prop, so a useToast() line an
  inserted action brought can stay unused; one item, or an object prop, goes through removeItem and cleans it.~~
- ~~P3 (2026-10-05, session "Studio builder tool planning", E2E):~~ **closed 2026-10-07 (backlog cleanup):** same as (3) of the TopNavigation groups follow-ups line. Was: add harness rows for TopNavigation data-slot items (drag to reorder, drop onto another action to group, Inspector Slots `[data-item-index]` rows, "Group X with Y" / "Take X out of its group"); gestures listed by session "Dual action trên top navigation Figma". Needs a TopNavigation in `tools/studio/e2e/fixtures/host-page.tsx`.
- **Done (checked 2026-10-07, backlog sweep: a cycle scan of src finds no platform import cycle, and no "before initialization" error appears in the 2026-10-06/07 gate reports):** ~~P3 (same session): intermittent HMR error during Studio E2E runs: `[vite] ReferenceError: Cannot access 'appLayerExamples' before initialization` then "Failed to reload /src/platform/PlatformShowcases.tsx" (import cycle PlatformShowcases ↔ appLayer). Not tied to one row (D-03/D-06 pass); the report's "Vite errors" lists it.~~
- **Closed (2026-10-07, user decision in backlog batch 8: the Studio hooks are accepted as they run):** ~~P3 (same session): the QA gate owner should review the Studio hooks in `tools/qa/lib.mjs` (`uiKind` "studio", `auxKind` tools/studio, `pagesForEdit` skips studio) and `tools/qa/run.mjs` ("Studio self-tests" static step, "Studio E2E" runtime step).~~
- **Done (checked 2026-10-07, backlog batch 5b: inspector/toneRules.ts captions "Not for text (fails contrast)", "Not for titles", "Short status or help text only" on Text/Heading; its selftest compares the Lights list with the harness rule):** ~~**P3 · Studio Tone picker warnings (2026-10-05, "Token màu cho content/chữ/icon"):**~~ the picker lists all 81 tones but
  shows no inline warning for a rule the pick would break (Lights-group `*-light` on Text/Heading, colour Light on body
  copy); the harness flags it only at Save. Add a per-option "Not for text" caption like the slot palette's warnings.
- ~~**P3 · deadclick list-item@1512 "Pending invites" (2026-10-05, seen by "Token màu cho content/chữ/icon"'s gate):**~~ **closed 2026-10-07 (backlog cleanup):** a probe artifact: by hand Revoke removes the row and shows Undo (the batch 3 line below). Was: the
  "Revoke invite for an.vu@dizai.studio" Button click had no visible effect (no-op handler or a race); not caused by the
  tone change, example not touched.
- Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 1) for the Open navigation part (see the app-shell line above); ~~the example-content ⚠ below stay open.~~ (backlog sweep 2026-10-07: each is tracked in its own row: "Activity, new" and "Hana Kim" in the probe rows, the HR 8 text styles and the 90 s budget in "Gate warnings left from batch 5", "Chi Tran" and the 2px gap in "Structural audit warnings") Batch 3 note: app-shell "Activity, new" is a probe-order artifact, not a dead handler — the behaviour pass clicks the Sidebar's Activity first, so the bell then opens the page already shown (from People it navigates and clears the dot); fix in the probe (reset between clicks) if it keeps flagging. Was: P2 (2026-10-05, gate .qa/reports/2026-10-04T20-04-34-28eea406.md, found by "Dark/light mode sync và UI present", not from
  its change): app-shell "Narrow window" example (`examples/pages/app-shell.tsx` `<StudioApp narrowWindow />`): the
  "Open navigation" menu button (aria-haspopup=dialog) opens nothing on click or Enter, at 1100 and 900 px windows
  (behaviour ✗ apg + ⚠ deadclick). Same run, example content: ⚠ deadclick app-shell "Activity, new", chat "Hana Kim" inbox
  row; ⚠ rhythm 8 text styles in HR templates; button "Approve on a phone" "Chi Tran" heading-4 not a heading; button
  "Hand off when ready" Stack gap 2px; templates behaviour exceeded its 90 s budget.
- **Done (checked 2026-10-07, backlog sweep: the rest shipped in GĐ4 M3: nested instances show every property type (inspector/nestedInstances.ts:112, E2E IN-12/13)):** ~~P2 (2026-10-05, session "Studio builder tool planning", WP-E follow-ups, for GĐ4): ~~option labels in Figma words~~ done 2026-10-07 (GĐ4 M1); nested groups for generated entries: a field's Label / Help-Text done in M1, the rest (Button in Card…) is GĐ4 M3; ~~icon-presence toggles start from a fixed icon~~ done 2026-10-07 (GĐ4 M2: Figma's default icon).~~
- **Done 2026-10-07 (backlog batch 2: a chip on the size pill moves just below it, `slots/SlotLayer.tsx` clearOfPill):** ~~P3 (2026-10-05, Studio builder session): on a selected Box (layout primitive with slots) the SlotLayer "+" chip sits
  on the selection's size pill ("28 × 28") below small layers, so the size is hidden (`slots/SlotLayer.tsx` chip vs
  `.studio-resize__pill`).~~
- **Closed (checked 2026-10-07, backlog sweep: list-item@1512 has 0 behaviour findings on 2026-10-07; the card playground corners are the "Card playground slot corners" row):** ~~P3 (2026-10-05, gate .qa/reports/2026-10-05T07-49-39-28eea406.md, backlog batch 3, not from its change): behaviour ⚠~~
  deadclick list-item › Pending invites "Revoke invite for an.vu@dizai.studio" is a probe artifact — by hand it removes the
  row and shows the Undo toast; the pass revoked the row above first (the list shifts, the toast may cover the next
  button). New ⚠ in the same run, not from it: card › playground Spacing=small corners (Card 16 vs platform-slot 12 + 16).
- ~~P3 (2026-10-05, gate .qa/reports/2026-10-05T09-47-59-28eea406.md, backlog batch 6, not from its change):~~ **closed 2026-10-07 (backlog cleanup):** the playground Avatar keeps white initials on Solid green by the user's choice (Avatar colours kept; the Playground Avatar line). Was: usage ⚠
  `src/platform/PlatformExamples.tsx:635` avatar/solid-initials-contrast (white initials on Solid green in a playground);
  the same run saw one file rendering from an unsaved Studio draft on 5173 (gone a minute later, not this session's).
- P3 (2026-10-05, seen in the 390 contact sheets of session 2984c6e6, not from its token change): Table at 390 cuts the
  Assignee column without an ellipsis — Badge › Task status ("Em I", "Alex") and Button › Page actions ("Chi Trar", "Bao Ngı"). **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** the two examples are adapted for 390 → batch 6b · **Done 2026-10-07 (batch 6b)** (badge Task status and button Page actions: assignee in the task caption on a phone).
- P3 (2026-10-06, session "Canvas và surface mặc định", usage rules §16): **audit check for the default pairing** —
  proposal, needs the user's OK and the tools/qa owner: in `tools/platform-audit/audit.mjs`, warn on a Surface/Default
  box whose backdrop is the Canvas/Default stage and that carries a closed border or a drop shadow, outside phones,
  shells, Surface-in-Surface, clickable (`data-interactive`) and selected cards. Today §16 is documented only. **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** the audit check is approved → batch 9 · **Done 2026-10-07 (batch 9)** (quality-checks.mjs `roles` warn: Surface/Default box on Canvas/Default with a border or shadow; phones and shells skipped) (tooling).
- P3 (2026-10-06, same session): **playground stages** still paint Neutral/Pale
  (`.platform-example-panel--stack > .platform-input-preview`, platform.css ~369; `.platform-example-row` beside it):
  decide whether playgrounds follow §16 (Canvas/Default) like the example stages. **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** playground stages follow §16 → batch 6b · **Done 2026-10-07 (batch 6b)** (platform.css .platform-input-preview → Canvas/Default).
- P3 (2026-10-06, same session): **phone screens** paint Surface/Default (PlatformPhone), a white page, so cards in
  phones keep §11 borders (card Choose on a phone, progress Loyalty stamps, metric Drill in on a phone): decide whether
  phone examples should default to Canvas/Default too. **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** phone screens default to Canvas/Default → batch 6b · **Done 2026-10-07 (batch 6b)** (PlatformPhone default; canvas="surface" for a white screen).
- ~~P3 (2026-10-06, gate .qa/reports of session 7b329fe8, Sidebar width change, not from it):~~ **closed 2026-10-07 (backlog cleanup):** same as the 2026-10-03 Chats inbox "Hana Kim" dead-click line (a probe race on the open row). Was: behaviour ⚠ deadclick
  `chat@1512` Chats inbox — clicking the selected "Hana Kim" Conversation-List row has no visible effect (the row is
  already open; likely a false positive, or the selected row should not re-announce).
- **Done (checked 2026-10-07, backlog batch 5b: a paste or Assets insert is remembered like a slot insert (rememberInsert), E2E LB-14):** ~~P3 (2026-10-06, Studio builder session, seen on a builder page; likely on examples too): undo of an Assets / clipboard insert does not go back to the previous selection (slot-picker inserts do, `slots/actions.ts` remember); a redo within ~2 s shifts the stale selection a line, and a reload then reports "Selection lost". `edit/clipboard.ts insertCode` could remember before/after like slot inserts.~~
- **Done 2026-10-07 (backlog batch 8, item 61: run.mjs reads each page's `examples` array from examples/pages, `isExampleSource` and `pagesForEdit` map examples/pages/<page>.tsx|.css to their page; a quick gate on side-panel and tooltip now warns):** ~~P2 (2026-10-07, backlog sweep)~~ · `npm run qa` step ④ (example coverage) reads only `src/platform/*Showcases.tsx` and `src/platform/appLayer/*.tsx` (`tools/qa/run.mjs:456`, `isExampleSource` in `tools/qa/lib.mjs:227`; the map regex at run.mjs:468 also misses the `keepOnHotUpdate(…)` wrapper). Since the examples moved to `src/platform/examples/pages/*.tsx` (`keepOnHotUpdate(import.meta.hot, "examples", [ … ])`), it finds no example list for those pages and reports them as "skip: no example map entry", so the coverage matrix checks nothing. Fix: read `examples/pages/<page>.tsx` and its `examples` array. **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** approved; fix it before batch 5b.

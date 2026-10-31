# Session log 2026-10-31

## Session "Studio: prototype variables" · W-52 phase B1, code + Play (tier M; user 2026-10-31)

- Ask: the design doc `docs/research/studio-prototype-variables-2026-10-31.md` (PR #364, merged), then "Duyệt doc W-52
  B theo mọi đề xuất trong §7; bắt đầu B1."
- Built:
  - `tools/studio/proto-vars.mjs` (+ `.d.mts`, selftest 11): operands (literal, `vars.x`, a row's field, `{ kind:
    "expr" }`), `evaluate`, `operandCode`, `protoValueCode`, `resolveItems`, `withStartValues`. The doc named it
    `protoVars.ts`; it is `.mjs` so dialect, doc, compile and push (Node) share it with the Studio.
  - `dialect.mjs`: `export const vars` (text / number / boolean by identifier); props and children read `vars.x`,
    `!vars.x`, `vars.x === …` / `!==` (a literal or the row's field); `proto.set` (name checked, a literal's type
    checked), `proto.if`, `proto.run` take operands and nested actions. Selftest +11.
  - `doc.mjs` prints them (`export const vars` only when a page has some); MCP outline prints them, get_tree lists the
    page's variables.
  - Play: `playFlow.tsx` keeps what Set variable changed for the run (Navigate, Back, overlays keep it; Restart
    clears); `runtime.tsx protoHandler` runs `run` in order and `if` on the variables at that moment;
    `renderPage.tsx` reads `vars` from the render context (not the scope: the canvas cache keys on the scope), binds a
    `hidden` to a variable, and a value control bound to `vars.x` writes it back instead of Play's per-visit control
    state. `choicesOf` leaves a group or a Chip that reads a variable to the variable.
  - Canvas: the start values, in the cache env (BuilderBoard). Export to React (`compile.mjs`): `startVars` + a `vars`
    state, functional `setVars`, `if`, chained handlers, a bound control writes back, a bound visibility is a condition
    (selftest +6, tsc on the output). Figma push: the start values (`withStartValues`) until B3.
  - `protoOf` returns null for set / if / run: the Prototype tab says "Set in code" until B2.
- E2E: PT-52…PT-55 (`tools/studio/e2e/scenarios/prototype.mjs`).

## Session "Studio: prototype variables UI" · W-52 phase B2 (tier M; user 2026-10-31 "Bắt đầu B2 … theo doc §3")

- Engine: op "pageVars" on the page's Board (`tools/studio/proto-vars-edit.mjs`, selftest 16): add, set (start value),
  rename (declaration, every `vars.x`, every `proto.set("x"`), retype (literal sets converted), remove (reads take the
  start value, a condition on a row's field goes, a Set variable leaves `proto.run` or its attribute; one in a
  Conditional's branch refuses). `setText` gains `code` (`{vars.x}`) and `from` (words back).
- Prototype tab: `VariablesSection.tsx` with nothing selected (rows: name, start value, ⋯ kind / Delete with an
  inline question); `VarActionRows.tsx` Set variable (variable, value · Off/On/Flip · Figma-like expression) and
  Conditional (If variable/compare/value or an expression; Then and Else as one simple action each); Add action makes
  `proto.run(…)`, each step edited in place through `ProtoLayer.compose`. A new variable made on the way is one undo
  step with what binds it (`addVarThen`: rebaseLoc past the declaration, squashEdits).
- Inspector: `varBind.tsx` (context from DesignPanel on local pages): Bind button on text / number / boolean / choice
  fields and on a layer's words, pill + Unbind once bound; Appearance header binds Visible (`hidden={!vars.x}`).
  Layers: `{x}` on layers that use a variable (`layerMeta.ts` readsVarsSrc). Local variables: "Prototype · this page".
- Not done (the doc's §3 sketch had more): a branch of a Conditional holds one action (no list), no else-if UI.
- E2E: PT-56…PT-59.

## Session "Studio: prototype variables to Figma" · W-52 phase B3 (tier M; user 2026-10-31 "Bắt đầu B3 … doc §4")

- Zen-DS: `figma-proto.mjs` `reactionOfValue` / `variableDataOf` (Figma's EXPRESSION functions ADDITION … NOT, data by
  variable name), `figma-push.mjs` `variables` on the package, `varBind` on nodes (`text`, `visible` from
  `hidden={!vars.x}`, `props`), a layer Visible by a variable stays in the push (`hidden: true` when it starts off),
  notes for conditions / opposites / mixed words / Figma-less actions. figma-push selftest 517 (+5).
- Plugin (`~/Documents/zen-ds-figma-plugin-main`, 90bc3cd on `studio-import`): `ensurePrototypeVariables` (find or make
  the collection and each variable by name, a changed kind made anew, start value set), `applyVarBinds` (TEXT
  characters, Visible, an instance's TEXT/BOOLEAN/VARIANT property showing the start value, else nested text),
  `figmaReactionOfActions` (SET_VARIABLE, CONDITIONAL, NODE / CLOSE / BACK). `npm test` all pass, build done (dist backed
  up in backups/).
- Real Figma (Zen file, page "Studio exports — QA", use_figma): the plugin's functions verbatim on throwaway frames —
  collection of 3 (a second run reused them), characters / visible / an instance's TEXT property bound, a reaction with
  Set variable (ADDITION, NOT), Conditional (AND, GREATER_THAN) → Navigate (Push) and Else → Set variable; Figma stored
  each as sent. Cleaned up (frames, component, collection). The full importer run on a whole page was not repeated.
- Not pushed: a prop bound to a condition (the W-52 ✓), Show toast / Filter table / Change step (as before); pull
  (Figma → Studio) of variables is B4, not done.

## Session "Studio: prototype easing" · W-51a (tier S; doc studio-prototype-variables §5, §7 q10)

- `protoModel.ts`: `ProtoEasing` / `EASINGS` / `DEFAULT_EASING` ("emphasized"); `optionsOf` keeps only the four,
  `writtenOptions` leaves out Emphasized and any curve on Instant. Switching action keeps the easing.
- Prototype tab › Animation rows: "Easing" select (Standard · Emphasized · Exit · Linear) under Duration, not on Instant.
- Play: `frameMotion` sets `--studio-play-ease: var(--zen-motion-ease-<x>)`; `builder.css` reads it (fallback
  Emphasized). Reduced motion unchanged (movement 0, fades keep their curve).
- Figma: `figma-proto.mjs` `EASINGS` (the four curves, checked against motion.json); `transitionOf` sends the picked one
  (plugin already writes any curve as CUSTOM_CUBIC_BEZIER); `protoOfReaction` matches the curve to 3 decimals, drops others.
- Selftests: protoModel (+2), figma-push (+3). E2E: PT-60 (Exit written, Emphasized left out, Slow · Linear runs linear in Play).

## Session "Studio: required field" · W-58 (tier S; doc studio-prototype-variables §5, §7 q9)

- No new mechanism: Conditional + "is empty" + an Assets template, as the doc decided. `vars.x === ""` already
  round-tripped through B1's dialect (checked), so no dialect change.
- Conditional's comparison for a text: is · is not · is empty · is not empty (`TEXT_OPS`, `VarActionRows.tsx`); "is
  empty" hides the value field (`.studio-prototype__test > :only-child` spans the row). The test helpers moved to
  `protoVarsModel.ts` (`varTestOf`, `varTestOp`, `varTestCode`) for the selftest. Picking "is" on an empty test keeps
  "is" shown until a value is typed (the code reads `=== ""` meanwhile).
- Palette item `form-required-field` (Inputs): example pages get a useState version (toast); builder pages the
  `proto.if(vars.email === "", proto.set("emailError", …), proto.run(proto.set("emailError", ""), proto.toast(…)))`
  version, the one Assets item that keeps its action there (comment says why). A plain Screen has nothing to close, so
  success is a toast and clears the error.
- Declaring its variables: `PaletteItem.vars` → Insertable → op pasteCode / insertChild `vars` (click, drag into a
  frame, drop on the empty board via addFrame, InsertPicker). Server: `declareVarsEdit` (`proto-vars-edit.mjs`) joins
  the paste's edits (one undo step); refused on files that are not pages you made.
- Selftests: proto-vars-edit (+8), protoVarsModel (+4), palette (+2). E2E: PT-61 ("is empty" via the UI), PT-62 (drop,
  Play empty → error, email → toast).

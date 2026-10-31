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

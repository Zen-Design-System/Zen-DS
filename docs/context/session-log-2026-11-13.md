# Session log — 2026-11-13

## Code view in other languages, P1: the Code view base (tier M; session "Code view in other languages: base + HTML/CSS")

User, 2026-11-12: chose "Code view: HTML/CSS" → the later-phase item starts; P1 then P2, each its own PR. Plan
`docs/research/code-languages-plan-2026-10-03.md` (§9 = P1 as built).

**§8 answered (2026-11-12, AskUserQuestion):** 8.4 all six languages with honest states · 8.3 example snippets become
the render's source (P2b) · 8.1 web strategy A (native Vue/Svelte on the shared CSS).

**What changed since the plan:** the classic docs already used the Studio's `CodeView` (one highlighter), and the
"Coming Soon" picker was gone. P1 added the picker, not a highlighter.

**Built:**
- `src/platform/code/SnippetCode.tsx`: the snippet view (classic `PlatformCode`, Studio `renderCode`, the Code tab's
  example). `SelectField` sm in place of the badge (`CodeView` `languageControl`); a language without code shows a
  notice (`CodeView` `notice`: header kept, Wrap and Copy gone) with a link that routes in place (popstate) to the
  Installation page's `#languages`, focusing the heading.
- `code/preference.ts`: one choice per viewer (localStorage `zen-docs:code-language`, storage event for other tabs),
  `?code=` in the address (replaceState; React leaves it out).
- `code/languages.ts` + `src/platform/code-languages.generated.json` (`tools/code-languages/manifest.mjs`, called by
  `build-guidelines.mjs`, so `guidelines:check` covers it): per public component (229) a status per language, from
  `platforms/<language>/code-language.json` when it exists (none yet).
- `code/LanguagesSection.tsx` on the Installation page: per language, then per component (Accordion).
- `code/snippet.ts`: `@babel/parser` (lazy) → `{ imports, elements, statements }`; three snippet shapes.

**Bugs met and fixed:** three playground snippets were not valid TSX (ColorSelector and Table: a `…` placeholder;
Calendar: a `//` line after its tags). Table's snippet also imported 5 of the 11 components it uses.

**Not fixed (P2b):** example `code:` strings: 422 of 458 parse; the rest are deliberate excerpts (`…`, pseudo-code, CSS
beside TSX).

**QA:** tsc, usage:check, style:check, guidelines/tokens/styles/icons/ai-ui checks, usage + mcp self-tests ✓.
`tests/interaction/code-languages.test.tsx` 5/5 (parser 75/75 playground snippets on 68 pages). Playwright shots
(classic 1512/390, Installation link landing, Studio Code tab → Swift notice, `?code=swift`): no console errors.
`npm run qa -- --isolated --only=button,installation,dialog,badge,calendar,table,color-selector`: PASS (Vitest full
97/97, audit 1512/390/320 + dark + behaviour 0 errors, Studio E2E 461 works / 0 broken). `npm run build` ✓.

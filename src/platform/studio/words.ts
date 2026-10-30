/*
 * Design words (core-rebuild plan criterion 7, docs/research/studio-doc-engine-plan-2026-10-10.md §3): nothing a
 * designer reads in the Studio speaks code — no line numbers, no `<Tag>`, no `{expression}`, no prop / children / JSX /
 * .map. Pages made in the Studio since 2026-10-12, example and template pages too since the user's go the same day. The
 * engine's refusals and the Inspector's notes keep their developer wording in the source (and in the selftests that pin
 * them); `designWords` rewrites them on the way to the screen (`useWords` / `speak` in ./useWords.ts). A repo file keeps
 * its name (where an edit landed), a Studio page's file goes; the line lives on the Code tab.
 *
 * Glossary (Figma's words): layer (element, JSX), layers inside (children), property (prop, attribute), fixed value
 * (literal), list (.map, array), from data: person › photo (a bound `{person.photo}`), set in code (any other expression),
 * shared properties (a spread), id (a row's key).
 *
 * Pure: no React, no store (node src/platform/studio/words.selftest.mjs imports it directly).
 */

/** HTML tags in a message, by what a designer sees. */
const HTML_WORDS: Record<string, string> = {
  div: "frame", span: "text", section: "frame", article: "frame", header: "frame", footer: "frame", main: "frame",
  nav: "frame", aside: "frame", form: "form", p: "text", h1: "heading", h2: "heading", h3: "heading", h4: "heading",
  h5: "heading", h6: "heading", label: "label", strong: "text", em: "text", img: "image", picture: "image", svg: "icon",
  a: "link", button: "button", input: "field", textarea: "field", select: "select", ul: "list", ol: "list",
  li: "list item", table: "table", tr: "row", td: "cell", th: "header cell", hr: "divider", br: "line break",
};

/** The Studio's prototype actions, as the Prototype tab names them. */
const ACTIONS: Record<string, string> = { "proto.toast": "Show toast", "proto.navigate": "Navigate to", "proto.open": "Open overlay", "proto.close": "Close overlay", "proto.back": "Back", "proto.link": "Open link", "proto.filter": "Filter table", "proto.step": "Change step" };

/** "labelIcon" → "label icon", "selectedId" → "selected id". */
const spaced = (name: string) => name.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/([A-Z])([A-Z][a-z])/g, "$1 $2").toLowerCase();

/** A bound expression in design words: a plain path reads as data ("me › photo"), anything else is set in code. */
function dataOf(expression: string): string | null {
  const path = expression.trim().replace(/^\.\.\./, "");
  if (!/^[A-Za-z_$][\w$]*(?:\??\.[A-Za-z_$][\w$]*|\[\d+\])*$/.test(path)) return null;
  return path.replace(/\[(\d+)\]/g, ".$1").split(/\??\./).map((part) => (/^\d+$/.test(part) ? `#${Number(part) + 1}` : spaced(part))).join(" › ");
}

/** Phrases first (they read better whole), then the single words. Each pair: [pattern, replacement]. */
const PHRASES: Array<[RegExp, string | ((match: string) => string)]> = [
  // The UX review 2026-10-27 §6: the engine's refusals and the Studio's status lines that still spoke code.
  [/\bRestart the (?:Studio |dev )?server(?::| to)[^.;]*/g, "This needs a newer Studio — ask whoever runs it to restart it"],
  [/\bharness clean\b/g, "checks passed"],
  [/\bharness failed\b/g, "checks failed"],
  [/\bharness findings?\b/g, (match: string) => match.replace("harness", "check")],
  [/\(line \d+: ([^)]*)\)/g, "— $1"],
  [/\bis a parameter; its value comes from where the component is used\b/g, "comes from where the component is used — edit it there"],
  // (camelCase names and tags are already words here: "its use state lines", "(Card)".)
  [/\ban item with state is not copied into the example snippet \(its use ?[Ss]tate lines are not in it\); update it by hand(?: \([^)]*\))?/g, "this item is not in it (the Code tab shows it)"],
  [/\b[\w@./-]+ is not an editable example source\b/g, "This example can't be edited here"],
  [/\b[\w.]+ (?:here )?is docs chrome \(zen-studio-chrome\)(?:; edit it in the code)?\.?/g, "This is part of the docs page, not of the example"],
  [/\bBad loc "[^"]*"(?: \(expected "[^"]*"\))?\.?/g, "Select the layer again"],
  [/\bThe file does not parse\.?/g, "The page's code has an error — see the Code tab"],
  // The same two words elsewhere in the engine's refusals, with their own tails kept.
  [/\b([\w'’]+) is docs chrome\b/g, "$1 is part of the docs page, not of the example"],
  [/\bdoes not parse\b/g, "has an error in its code"],
  [/\bhas no children to drop into\b/g, "can't hold layers"],
  [/\bhas a key; a copy would repeat it\b/g, "is drawn once per row of a list; a copy would repeat that row"],
  [/\bonly an element's children can be\b/g, "only layers inside a layer can be"],
  [/\bnot one of an element's children\b/g, "not a layer inside a layer"],
  [/\bExample code not updated\b/g, "The example's code is not updated"],
  [/\bBound to code\b/g, "Set in code"],
  [/\bbound to code\b/g, "set in code"],
  [/\bJSX elements\b/g, "layers"],
  [/\bJSX element\b/g, "layer"],
  [/\bobject literals?\b/g, "group of values"],
  [/\barray literals?\b/g, "list"],
  [/\b(?:the |a )?source location\b/g, "the code location"],
  [/\bthe source file\b/g, "the code"],
  [/\bsource file\b/g, "code"],
  [/\bthe source\b/g, "the code"],
  [/\b(a|the|row's|its|their) keys?\b/g, "$1 id"],
  [/\bdata source\b/g, "data"],
  [/\bHTML (?:elements|tags)\b/g, "layers"],
  [/\bHTML (?:element|tag)\b/g, "layer"],
  // One name for the server the Studio writes through (the UX audit found three).
  [/\b(?:Zen )?(?:Studio )?dev server\b/g, "Studio server"],
];

const WORDS: Array<[RegExp, string]> = [
  [/\bchildren\b/g, "layers inside"],
  [/\bChildren\b/g, "Layers inside"],
  [/\bchild\b/g, "layer inside"],
  [/\bJSX\b/g, "layers"],
  [/\belements\b/g, "layers"],
  [/\bElements\b/g, "Layers"],
  [/\belement\b/g, "layer"],
  [/\bElement\b/g, "Layer"],
  [/\bprops\b/g, "properties"],
  [/\bProps\b/g, "Properties"],
  [/\bprop\b/g, "property"],
  [/\bProp\b/g, "Property"],
  [/\battributes\b/g, "properties"],
  [/\battribute\b/g, "property"],
  [/\bexpressions?\b/g, "value"],
  [/\bliterals?\b/g, "fixed value"],
  [/\bspreads\b/g, "takes"],
  [/\ba spread\b/g, "a shared set of properties"],
  [/\bspread\b/g, "shared set of properties"],
  [/\bsrc\b/g, "picture"],
  [/\bmarkup\b/g, "layers"],
  [/\brenders\b/g, "shows"],
  [/\brendered\b/g, "shown"],
  [/\brendering\b/g, "showing"],
  [/\brender\b/g, "show"],
  [/\bHTML\b/g, "code"],
  [/\bsource\b/g, "code"],
  // Zen's layout primitives by Figma's names: a Stack is an auto layout frame, a Box a frame.
  [/\bStacks\b/g, "auto layout frames"],
  [/\bStack\b/g, "auto layout frame"],
  [/\bBoxes\b/g, "frames"],
  [/\bBox\b/g, "frame"],
  [/\bcallbacks?\b/g, "list"],
  [/\barrays?\b/g, "list"],
  [/\bhooks?\b/g, "app logic"],
  [/\bsnippets?\b/g, "code"],
  [/\bthe recipe\b/g, "the Studio"],
  [/\brecipe\b/g, "Studio"],
  [/\bparameters?\b/g, "inputs"],
  [/\barguments?\b/g, "inputs"],
  [/\bbindings?\b/g, "data link"],
];

/** A Studio page's own file ("local:untitled-page.zen.tsx:26"): the page has a name, the file is not shown. */
const PAGE_REF = /(?:\b(?:in|at|from|to) )?local:[\w@./-]+(?::\d+)*/g;
/** A repo file with its line ("data.ts:84:6"): the file name stays (where an edit landed), the line goes to the Code tab. */
const LINE_REF = /\b([\w@./-]+\.(?:tsx|ts|jsx|js|mjs|css))(?::\d+)+/g;

/** A list drawn in code: `rows.map(…)`, `.map`, "the .map callback" — a list, as Figma has none of it. */
const LISTS: Array<[RegExp, string]> = [
  [/(?:\b(?:an?|the) )?(?:\b[\w$.]+)?\.map\((?:…|\.\.\.)?\)/g, "a list"],
  [/\b(?:an? |the )?(?<![\w])\.map (?:callback|result)(?:'s)?/g, "the list"],
  [/(?:\b(?:an?|the) )?(?<![\w$])\.map\b/g, "a list"],
  [/\bmap callback\b/g, "list"],
];

/** A file a designer names (an imported page, a picture): kept as written. */
const FILE_NAME = /\.(?:tsx|ts|jsx|js|mjs|css|json|md|png|jpe?g|webp|gif|svg|avif)$/i;

/** What must not reach a designer on a Studio page; `codeWordsIn` lists the matches (selftest, dev warnings). */
const CODE_WORDS: Array<[string, RegExp]> = [
  ["file:line", /\blocal:|\b[\w.-]+\.(?:tsx|ts|jsx|js|mjs|css)(?::\d+)+/],
  ["<Tag>", /<\/?[A-Za-z][\w.]*(?:\s[^<>]*)?\/?>/],
  ["{expression}", /\{[^{}]*\}/],
  ["`code`", /`/],
  // A word, not part of an identifier or a path (data-zen-src, src/components, Re-binding): as `guarded` reads them.
  ["code word", /(?<![-\w./])(?:JSX|jsx|props?|children|child|elements?|src|callback|spread|expression|binding|hooks?|snippet|recipe|literal|array|parameters?|arguments?|attributes?|markup|render(?:s|ed|ing)?|source|HTML)(?![-\w/]|\.\w)/],
  ["dev server", /\bdev server\b/],
  // The UX review 2026-10-27 §6: a tool's name, a restart asked of a designer, a line number, the engine's parse words.
  ["harness", /\bharness\b/],
  ["restart the server", /\bRestart the (?:Studio |dev )?server\b/],
  ["line N", /\(line \d+: /],
  ["docs chrome", /\bdocs chrome\b/],
  ["does not parse", /\bdoes not parse\b/],
  ["Bad loc", /\bBad loc\b/],
  ["Stack / Box", /(?<![-\w./])(?:Stacks?|Box(?:es)?)(?![-\w])/],
  ["line:column", /\bat \d+:\d+(?::\d+)?\b/],
  [".map", /(?<![\w$])\.map\b|\b\w+\.map\b/],
  ["key", /\b(?:has a|the|row's|its) keys?\b/],
  ["camelCase name", /\b(?!(?:iPhone|iPad|iOS|macOS)\b)[a-z]+[A-Z][A-Za-z0-9]*\b/],
  ["call", /\b[\w.]+\((?:…|\.\.\.)?\)/],
];

/**
 * A word rule that leaves identifiers alone: `src` is not a word inside `data-zen-src`, `Box` not inside `List-Box` or
 * `Zen.Box`, `source` not inside `source/path`.
 */
function guarded(pattern: RegExp): RegExp {
  return new RegExp(pattern.source.replace(/^\\b/, "(?<![-\\w./])").replace(/\\b$/, "(?![-\\w/]|\\.\\w)"), pattern.flags);
}

/** Words that sound otherwise than they are spelled (a user, an hour). Initialisms keep the article they were given. */
const SOUNDS_CONSONANT = /^(?:u[bcdfgklmnprstvz][aeiouy]|uni|use|usu|uti|one\b|once\b|eu)/i;
const SOUNDS_VOWEL = /^(?:hour|honest|honou?r|heir)/i;

/** "a" or "an" by the next word's sound, after the rules swapped the word ("an value" → "a value"). */
function articles(text: string): string {
  // "A" only where a sentence starts ("Column A is" keeps its letter).
  return text.replace(/(^|[.!?:·—]\s+|[\s(])([Aa])n? (?=([A-Za-z][\w-]*))/g, (match, lead: string, a: string, word: string) => {
    if ((a === "A" && lead.trim() === "" && lead !== "") || /^[A-Z0-9]{2,}\b/.test(word)) return match;
    const vowel = SOUNDS_VOWEL.test(word) || (/^[aeiou]/i.test(word) && !SOUNDS_CONSONANT.test(word));
    return `${lead}${a}${vowel ? "n" : ""} `;
  });
}

export function codeWordsIn(text: string): string[] {
  return CODE_WORDS.filter(([, pattern]) => pattern.test(text)).map(([name]) => name);
}

/** A message in design words (see the glossary above). Text without code words comes back unchanged. */
export function designWords(text: string): string {
  if (!text || !codeWordsIn(text).length) return text;
  let out = text;
  // Inline code: `x` → x (the rules below then read x).
  out = out.replace(/`([^`]*)`/g, "$1").replace(/`/g, "");
  for (const [pattern, replacement] of LISTS) out = out.replace(pattern, replacement);
  // Prototype actions and calls: proto.toast(…) → Show toast, with its arguments too (proto.toast({ title: "Saved" }); walk
  // 2026-10-29 W-15: the Design tab said "Set in code" where the Prototype tab said "Show toast"); (.slice()) → gone; name(…) → name.
  out = out.replace(/\b(proto\.(?:toast|navigate|open|close|back|link|filter|step))\((?:[^()]|\([^()]*\))*\)/g, (_, call: string) => ACTIONS[call]);
  out = out.replace(/\s*\((?:\.[A-Za-z_$][\w$]*\((?:…|\.\.\.)?\))+\)/g, "");
  out = out.replace(/\b([A-Za-z_$][\w$.]*)\((?:…|\.\.\.)?\)/g, "$1");
  // File references: the Code tab shows where a layer is ("is no longer at x.tsx:26" → "is no longer there").
  out = out.replace(/\bno longer at (?:local:[\w@./-]+|[\w@./-]+\.(?:tsx|ts|jsx|js|mjs|css))(?::\d+)*/g, "no longer there");
  out = out.replace(PAGE_REF, "").replace(LINE_REF, (_, file: string) => file.split("/").pop() ?? file).replace(/\bat \d+:\d+(?::\d+)?\b/g, "here");
  // The page file's header line names its format; a designer reads "the page header" alone.
  out = out.replace(/:?\s*\/\/ @zen-page \{[^{}]*\}/g, "");
  // A spread: {...rest} → shared properties.
  out = out.replace(/\{\s*\.\.\.[^{}]*\}/g, "shared properties");
  // "Bound to {me.photo}" → "From data: me › photo"; other braces → the data path, or "set in code".
  out = out.replace(/\b[Bb]ound to \{([^{}]*)\}/g, (_, expression: string) => {
    if (Object.values(ACTIONS).includes(expression.trim())) return `Prototype action: ${expression.trim()}`;
    const data = dataOf(expression);
    return data ? `From data: ${data}` : "Set in code";
  });
  out = out.replace(/\{\s*…\s*\}/g, "a group of values");
  out = out.replace(/\{([^{}]*)\}/g, (_, expression: string) => {
    const data = dataOf(expression);
    return data ? `data: ${data}` : "a value set in code";
  });
  // Tags: <Card …/> → Card; <div> → frame.
  out = out.replace(/<\/?([A-Za-z][\w.]*)(?:\s[^<>]*)?\/?>/g, (_, name: string) => (/^[a-z]/.test(name) ? HTML_WORDS[name] ?? "layer" : name));
  // Dotted names (me.photo) read as a data path; camelCase names (setProps) as words, before the glossary reads them.
  out = out.replace(/\b([a-z_$][\w$]*(?:\.[a-z_$][\w$]*)+)\b/g, (match) => (FILE_NAME.test(match) ? match : dataOf(match) ?? match));
  out = out.replace(/\b(?!(?:iPhone|iPad|iOS|macOS)\b)[a-z]+[A-Z][A-Za-z0-9]*\b/g, spaced);
  for (const [pattern, replacement] of PHRASES) out = typeof replacement === "string" ? out.replace(pattern, replacement) : out.replace(pattern, replacement);
  for (const [pattern, replacement] of WORDS) out = out.replace(guarded(pattern), replacement);
  out = articles(out);
  // Tidy what the removals leave: empty separators, a space before punctuation, doubled spaces.
  return out
    .replace(/\(\s*\)/g, "")
    .replace(/\s+([,.;:)])/g, "$1")
    .replace(/\s*·(?:\s*·)+\s*/g, " · ")
    .replace(/^\s*·\s*|\s*·\s*$/g, "")
    .replace(/:\s*(?=·|$)/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Explicit words for Figma layer names whose generic reading would still be the layer's (the UX review 2026-10-27 §6 row 23). */
const LAYER_WORDS: Record<string, string> = { "Action-Slots": "Actions", "Nav-Trailing-Block": "Trailing", "Main-Element": "Main element", "Pane-Content": "Pane content", "Child-Heading": "Child heading", "Top-Custom-Slot": "Top custom", "Control-Slot": "Control" };

/**
 * A Figma layer or slot name as a designer reads it on a label: "Top-Heading-Text" → "Top heading text", "Leading-Icon-Src"
 * → "Leading icon", "Trailing-Slots" → "Trailing". The name itself stays the key (slots, groups, Figma push); only the
 * words shown change. Pure, so the E2E harness and selftests read it too.
 */
export function layerLabel(name: string): string {
  const known = LAYER_WORDS[name];
  if (known) return known;
  if (!/^[A-Z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)+$/.test(name)) return name;
  const words = name.replace(/-(?:Src|Slots?|Block)$/, "").split("-").filter(Boolean);
  return words.map((word, index) => (index === 0 || /^[A-Z0-9]{2,}$/.test(word) ? word : word.toLowerCase())).join(" ");
}

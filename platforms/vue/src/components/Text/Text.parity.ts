import type { ParitySpec } from "../../../parity";

// The playground's copy (src/platform/appLayer/text.tsx).
const copy = "Plan the quarter with your team: goals, owners and dates in one place, so everyone knows what ships next and why it matters.";

// Sizing (Figma auto layout on a text box) and the caller's style beside the component's own custom properties.
const sizingCases = [
  { $label: "sizing: fixed and fill with limits", width: 320, height: "fill", minWidth: 120, maxWidth: 480, minHeight: 24, maxHeight: 96 },
  { $label: "sizing: hug, alignSelf", width: "hug", height: "hug", alignSelf: "end" },
  { $label: "sizing and truncate beside a style", width: 240, truncate: 2, style: { color: "red", "--zen-layout-width": "10px" } },
  { $label: "truncate beside a style", truncate: 3, style: { color: "red" } },
];

export default {
  Text: {
    base: { textStyle: "Body/Base/Regular", tone: "strongest", children: copy },
    cases: [
      ...sizingCases,
      { $label: "truncate one line", truncate: true },
      { $label: "truncate 3 lines", truncate: 3 },
      { $label: "truncate 1 line as a number", truncate: 1 },
      { $label: "truncate 2.7 lines", truncate: 2.7 },
      { $label: "truncate 0", truncate: 0 },
      { $label: "truncate false", truncate: false },
      { $label: "tone alias secondary", tone: "secondary" },
      { $label: "tone alias accent", tone: "accent" },
      { $label: "tone support blue light", tone: "support-blue-light" },
      { $label: "caption, light", textStyle: "Caption/Regular", tone: "light" },
      { $label: "heading style", textStyle: "Heading/4" },
      { $label: "label for a field", as: "label", htmlFor: "email", children: "Email" },
      { $label: "line breaks", children: "First line\nSecond line" },
      { $label: "line break in a list of strings", children: ["Line one\n", "two"] },
      { $label: "line break inside an element is not counted", children: ["One ", { $: "strong", children: "two\nthree" }] },
      { $label: "number", children: 42 },
      { $label: "inline runs", children: ["Your plan renews on ", { $: "TextRun", bold: true, children: "Nov 2" }, ". ", { $: "TextRun", tone: "negative-base", children: "2 seats" }, " are unpaid."] },
      { $label: "alignment, no wrap, tabular", align: "center", verticalAlign: "middle", wrap: false, tabularNumbers: true },
      { $label: "caller attributes", class: "lead", id: "lead", "aria-live": "polite", "data-testid": "text", "data-tone": "ignored", "data-breaks": "ignored", "data-truncate": "ignored" },
      { $label: "empty", children: undefined },
    ],
  },
  Heading: {
    base: { level: 2, children: "Quarterly planning" },
    cases: [
      ...sizingCases,
      { $label: "level 1", level: 1 },
      { $label: "level 3", level: 3 },
      { $label: "level 4", level: 4 },
      { $label: "level 5", level: 5 },
      { $label: "level 6", level: 6 },
      { $label: "a card title at level 2", level: 2, textStyle: "Heading/Subheading" },
      { $label: "kicker", level: 3, textStyle: "Body/Small/Bold", tone: "light" },
      { $label: "truncate", truncate: true },
      { $label: "truncate 2 lines", truncate: 2 },
      { $label: "tone base", tone: "base" },
      { $label: "alignment, no wrap, tabular", align: "end", verticalAlign: "bottom", wrap: false, tabularNumbers: true },
      { $label: "line breaks are not marked on a heading", children: "Two\nlines" },
      { $label: "caller attributes", class: "title", id: "title", "data-testid": "heading", "data-tone": "ignored", "data-numbers": "ignored", style: { color: "red" } },
    ],
  },
  TextRun: {
    base: { children: "Nov 2" },
    cases: [
      { $label: "tone", tone: "negative-base" },
      { $label: "tone alias", tone: "secondary" },
      { $label: "text style", textStyle: "Body/Base/Bold" },
      { $label: "underline and strikethrough", underline: true, strikethrough: true },
      { $label: "bold italic", bold: true, italic: true },
      { $label: "every style", bold: true, italic: true, underline: true, tone: "accent-base", textStyle: "Caption/Medium" },
      { $label: "nested element", children: { $: "em", children: "soon" } },
      { $label: "caller attributes", class: "price", id: "price", "data-testid": "run", "data-bold": "ignored", "data-tone": "ignored", style: { color: "red" }, title: "Old price" },
    ],
  },
} satisfies ParitySpec;

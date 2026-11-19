/* Sheet Table examples (Figma Table/Sheet, doc frame 17100:7996). The Zen docs themselves, read by Alex Duong on
   Wednesday Sep 30, 2026: each example is a reference whose rows run long — a props reference with long type unions, the
   keyboard shortcuts of a selectable card, the colour tokens of a theme, the same shortcuts on a phone, and a component
   with no props of its own yet. Every line is read in full; nothing ends in an ellipsis.
   Each example is its own file in sheet-table/ (P2b, plan docs/research/code-languages-plan-2026-10-03.md §11): the card
   renders its default export and shows its text as the snippet. */
import { PlatformPhoneApp } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import PropsReference from "./sheet-table/props-reference.example";
import propsReference from "./sheet-table/props-reference.example.tsx?raw";
import KeyboardReference from "./sheet-table/keyboard-shortcuts.example";
import keyboardReference from "./sheet-table/keyboard-shortcuts.example.tsx?raw";
import TokenReference from "./sheet-table/token-reference.example";
import tokenReference from "./sheet-table/token-reference.example.tsx?raw";
import PhoneShortcuts from "./sheet-table/shortcuts-on-a-phone.example";
import phoneShortcuts from "./sheet-table/shortcuts-on-a-phone.example.tsx?raw";
import NoProps from "./sheet-table/no-props-of-its-own.example";
import noProps from "./sheet-table/no-props-of-its-own.example.tsx?raw";

export const page: PlatformPage = "sheet-table";

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Props reference",
    wide: true,
    description: "A component's props, each with its type, its default and what it does. Long type unions and descriptions wrap and the row grows with them: a Table would cut them with an ellipsis. The sheet is named by its section heading, and below 680px it scrolls sideways instead of breaking every word.",
    render: () => <PropsReference />,
    code: exampleCode(propsReference),
  },
  {
    title: "Keyboard shortcuts",
    description: "The keys a component answers to, written as text (\"Tab / Shift + Tab\") and drawn by SheetKeys as key chips: + joins keys pressed together, / separates alternatives. Screen readers read each kbd and the separators between them.",
    render: () => <KeyboardReference />,
    code: exampleCode(keyboardReference),
  },
  {
    title: "Token reference",
    wide: true,
    description: "Long token names and their values are code; when to use each one is a sentence or two. A visible caption names the sheet (Heading/4), so it needs no aria-label.",
    render: () => <TokenReference />,
    code: exampleCode(tokenReference),
  },
  {
    title: "Shortcuts on a phone",
    description: "Two columns fit a phone without a minWidth: the keys keep their chips together and each action wraps onto as many lines as it needs, the row growing to match. The sheet sits on the page at the page margin, no box around it.",
    render: () => <PlatformPhoneApp label="Card shortcuts" app={PhoneShortcuts} />,
    code: exampleCode(phoneShortcuts),
  },
  {
    title: "No props of its own",
    description: "An empty reference keeps its header and says why there are no rows, in one full-width row, instead of an empty sheet or a missing section.",
    render: () => <NoProps />,
    code: exampleCode(noProps),
  },
]);

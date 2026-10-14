/*
 * The components Detach instance works on: the client's copy of DETACHABLE in tools/studio/detach.mjs (the dev server
 * owns the recipes). Runtime-free (no imports) so a Node selftest can import it directly; detachable.selftest.mjs keeps
 * the two lists equal, so the inspector never offers a type the server refuses or hides one it supports.
 */

/** Components a detach recipe exists for, in the order the Studio lists them. */
export const DETACHABLE = ["Card", "ListItem", "MetricCard", "Metric", "EmptyState", "DescriptionList", "InlineMessage", "Badge", "Tag"] as const;

export type DetachableType = (typeof DETACHABLE)[number];

/** The component's own name: namespace JSX (`<Zen.ListItem>`) is the same component. */
export const localName = (name: string) => name.slice(name.lastIndexOf(".") + 1);

/** Whether a component of this name can ever be detached (an instance may still be refused, e.g. a bound layout). */
export const isDetachableType = (name: string): name is DetachableType => (DETACHABLE as readonly string[]).includes(localName(name));

/** "Card, ListItem, … Badge and Tag": the list as a sentence. */
export const detachableList = () => `${DETACHABLE.slice(0, -1).join(", ")} and ${DETACHABLE[DETACHABLE.length - 1]}`;

/** Clause breaks in a server reason: "; " ": " " — " ", so " " because " ", which " and a " (" that opens a long aside. */
const clauseBreaks = ["; ", ": ", " — ", ", so ", " because ", ", which ", ", detaching "];

/**
 * The first clause of a refusal reason, for the caption under Detach (the full sentence stays in the ⌥⌘B status line).
 * Breaks count only outside quotes and {…} / (…) / […], so quoted source ({wide ? "a" : "b"}, {{ value: 3 }}, a .map
 * body) is never cut mid-expression. A one-word aside such as "(remove)" stays; a longer one is dropped. A trailing "."
 * goes. "It renders 3 times but not inside a .map callback…" reads "It renders 3 times outside a .map".
 */
export function shortReason(reason: string): string {
  const text = reason.trim();
  const outside = /^It renders (\d+|several) times but not inside a \.map callback/.exec(text);
  if (outside) return `It renders ${outside[1]} times outside a .map`;
  let depth = 0;
  let quote = "";
  let end = text.length;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (quote) {
      if (char === quote && text[index - 1] !== "\\") quote = "";
      continue;
    }
    if (char === "\"" || char === "`") { quote = char; continue; }
    if (depth === 0 && char === " " && text[index + 1] === "(") {
      // " (aside)": keep a short one-word aside ("(remove)", "(onClick={…})"), cut before a longer one.
      let close = index + 2;
      for (let inner = 1; close < text.length && inner > 0; close++) {
        if (text[close] === "(") inner++;
        else if (text[close] === ")") inner--;
      }
      const aside = text.slice(index + 2, close - 1);
      if (aside.length > 20 || /\s/.test(aside)) { end = index; break; }
    }
    if ("{([".includes(char)) depth++;
    else if ("})]".includes(char)) depth = Math.max(0, depth - 1);
    else if (depth === 0 && clauseBreaks.some((mark) => text.startsWith(mark, index))) { end = index; break; }
  }
  return text.slice(0, end).trim().replace(/[.,]$/, "");
}

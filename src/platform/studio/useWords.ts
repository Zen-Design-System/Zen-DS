import { designWords } from "./words";

/*
 * Design words where a designer reads (plan criterion 7, ./words.ts), on every page since 2026-10-12 (the user: example
 * and template pages too). The one switch: a component calls `useWords()` (or `speak` outside React) and shows `say(text)`;
 * file:line lives on the Code tab.
 */

/** `say(text)`: the text in design words. */
export function useWords(): (text: string) => string {
  return designWords;
}

/** `useWords` outside React (status lines set from event handlers). */
export const speak = designWords;

import { studioStore, useStudio } from "./store";
import { designWords } from "./words";

/*
 * Design words where they are read (plan criterion 7, ./words.ts): a page made in the Studio speaks to a designer;
 * example and template pages keep the developer wording (file:line, `{expression}`), which their users read in code.
 */

const asWritten = (text: string) => text;

/** True while the canvas shows a page made in the Studio. */
export function useStudioPage(): boolean {
  return useStudio((state) => Boolean(state.localPage));
}

/** `say(text)`: the text in design words while the canvas shows a page made in the Studio, else as written. */
export function useWords(): (text: string) => string {
  return useStudioPage() ? designWords : asWritten;
}

/** `useWords` outside React (status lines set from event handlers). */
export const speak = (text: string) => (studioStore.getState().localPage ? designWords(text) : text);

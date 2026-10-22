import type { SwatchPalette } from "../inspector/palettes";

/* Pick color asked for by a colour row (the Inspector's swatch list), kept out of edit/pickColor.ts so the Inspector does
   not import the canvas code (pickColor.ts reads the canvas and edits through edit/multi.ts, which reach the Inspector
   again). pickColor.ts provides the starter when the Studio loads it. */

/** A colour row being edited: its name, palette and options, and what it does with the one picked. */
export type PickRow = { label: string; palette: SwatchPalette; options: readonly string[]; onPick: (option: string) => void };

let starter: ((row: PickRow | null) => boolean) | null = null;

/** Starts Pick color for `row` (or the selection); false when the Studio has not loaded it. */
export const requestPickColor = (row: PickRow | null = null): boolean => (starter ? starter(row) : false);

/** pickColor.ts's own start. */
export function providePickColor(start: (row: PickRow | null) => boolean) {
  starter = start;
}

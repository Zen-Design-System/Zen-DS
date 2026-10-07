import type { ReactNode } from "react";
import type { PlatformPage } from "../PlatformExamples";

/** One example card on a component page (rendered by ComponentExamples in PlatformShowcases). */
export type ExampleDef = {
  /** What the example teaches, in product words, sentence case: "Invite by email". */
  title: string;
  /** One or two sentences: the situation and the choice it shows. No "click here". */
  description: string;
  /** Copyable source that matches what render() shows (real API, same names). */
  code: string;
  /** The card takes the whole row. Every page-like desktop example (a PageHeader, a toolbar over a table, a shell). */
  wide?: boolean;
  /** A whole desktop screen: the card fills edge to edge and offers Full screen. Implies wide. */
  screen?: boolean;
  render: () => ReactNode;
};

/** The module shape of `examples/pages/<page>.tsx`: registry.ts picks every file up by itself. */
export type ExamplePageModule = { page: PlatformPage; examples: ExampleDef[] };

/** A whole screen always takes the whole row, like a `wide` example (ExampleCard spans the row only through `wide`). */
export const isWideExample = (example: Pick<ExampleDef, "wide" | "screen">) => Boolean(example.wide || example.screen);

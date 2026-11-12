import { createContext, useContext } from "react";

/*
 * Where a snippet's specimen renders, for the HTML snippet (code/html.ts): a playground's preview row
 * (ComponentPreview), an example's stage (ExampleCard). A context, not a DOM lookup, so the snippet finds its specimen
 * from Zen Studio's inspector too, where the code is portalled away from the canvas. A leaf module: the playground
 * chrome imports it without importing the code view.
 */

/** The element whose children are the specimen, or null while it is not rendered. */
export type SpecimenSource = () => Element | null;

export const SnippetSpecimenContext = createContext<SpecimenSource | null>(null);
export const useSnippetSpecimen = () => useContext(SnippetSpecimenContext);

import { createContext } from "react";

/**
 * The selected element on the canvas (DesignPanel provides it), for controls that measure tokens where they render: a
 * ScaleField reads "md · 16" there, with the frame's density, breakpoint and mode applied. Null: no canvas element.
 */
export const InspectorHostContext = createContext<Element | null>(null);

/** The source file of the selection (DesignPanel provides it): the icon picker lists the icons that file already uses
 *  (iconSuggestions.ts). Null: none. */
export const InspectorFileContext = createContext<string | null>(null);

/** The "file:line:col" of the element whose props the controls edit (DesignPanel: the selection; a nested instance's
 *  group: that instance): a ScaleField names it on the spacing hover bus (select/spacingHover.ts). Null: none. */
export const InspectorSrcContext = createContext<string | null>(null);

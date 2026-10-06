import { createContext } from "react";

/**
 * The selected element on the canvas (DesignPanel provides it), for controls that measure tokens where they render: a
 * ScaleField reads "md · 16" there, with the frame's density, breakpoint and mode applied. Null: no canvas element.
 */
export const InspectorHostContext = createContext<Element | null>(null);

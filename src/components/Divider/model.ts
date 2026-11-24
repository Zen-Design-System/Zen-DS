/* Divider's framework-free part (the web core, src/core): its colours, shared by React's Divider and the Vue port. */

export const dividerColors = ["default", "medium", "high"] as const;
export type DividerColor = (typeof dividerColors)[number];
export type DividerOrientation = "horizontal" | "vertical";

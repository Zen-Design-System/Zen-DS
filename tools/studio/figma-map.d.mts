// Types of figma-map.mjs (the Figma ↔ code component mapping).
export type FigmaMapping = {
  sets: Map<string, { id: string; name: string; code: string; slots: string[] } & Record<string, unknown>>;
  apiProps: Record<string, Map<string, unknown>>;
  textStyles: Set<string> | null;
  iconNames: Set<string> | null;
  dataSlots: Record<string, unknown>;
  contractSets: Map<string, { id: string; name: string; props?: Array<{ name: string; type: string; default?: unknown }> }>;
};
export function figmaMapping(data: {
  figmaProps: Readonly<Record<string, unknown>>;
  contract: unknown;
  apiProps?: Record<string, Map<string, unknown>>;
  textStyles?: readonly string[] | null;
  iconNames?: readonly string[] | null;
  dataSlots?: Readonly<Record<string, unknown>>;
}): FigmaMapping;
export function apiPropsOf(components: ReadonlyArray<{ name: string; props?: ReadonlyArray<{ name: string; default?: string | null }> }>): Record<string, Map<string, unknown>>;

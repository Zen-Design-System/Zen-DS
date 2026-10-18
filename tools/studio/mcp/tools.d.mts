export type StudioMcpTool = { name: string; title: string; description: string; inputSchema: Record<string, unknown>; annotations: Record<string, unknown> };
/** The tools `batch` runs (writes on the open page). */
export const BATCH_TOOLS: string[];
export const TOOLS: StudioMcpTool[];
export const TOOL_NAMES: Set<string>;
export function listedTools(): StudioMcpTool[];

// Types of tools/studio/browser-engine.mjs for the Studio client (allowJs is off). Loose where the engine returns
// plain JSON shapes the client already types (SourceElement, EditResponse).
export type EngineError = { error: string; code: string };
export type EngineEdit = { code: string; changed: { from: number; to: number }; error?: never; [key: string]: unknown };
export function applyOps(code: string, loc: string, name: string, ops: unknown[], options?: Record<string, unknown>): EngineEdit | EngineError;
export function describeElement(code: string, file: string, loc: string): Record<string, unknown> | null;
export function sha1(text: string): string;
export function changedRange(before: string, after: string): { from: number; to: number };
export function describeSlots(code: string, file: string, loc: string, options?: { base?: string }): Record<string, unknown> | null;
export function withSlots(element: Record<string, unknown> | null, slots: Record<string, unknown> | null): Record<string, unknown> | null;
export function requiredFromApi(api: unknown): { requiredChildren: Set<string>; requiredProps: Map<string, Set<string>> };
export function dataFieldEdit(code: string, file: string, loc: string, name: string, op: unknown, options?: { read?: (rel: string) => string | null }): { file: string; code: string; source: string; changed: boolean } | EngineError;
export function originsOf(code: string, file: string, loc: string, targets: Array<{ prop: string } | { child: number } | { tableRows: true }>, options?: { read?: (rel: string) => string | null }): Array<Record<string, unknown>>;
export type DialectError = { line: number; column: number; message: string };
export function parsePage(text: string, options?: { components?: Set<string> }): { header: Record<string, unknown> | null; mock: Record<string, unknown>; board: unknown; errors: DialectError[] };
export function validateDialect(text: string, options?: { components?: Set<string> }): DialectError[];
export function newPageText(options?: { title?: string; device?: string }): string;
export function pageHeader(text: string): Record<string, unknown> | null;
export type BoardFrame = { kind: "screen" | "overlay"; id: string; state?: string; title: string; device?: string; loc: string };
export function boardFrames(tree: unknown): BoardFrame[];
export function freeFrameId(base: string, taken: Iterable<string>): string;
export function frameCode(options: { kind: "screen" | "overlay"; id: string; title?: string; device?: string }): string;
export function protoCode(action: string, arg?: string): string;

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
export type BoardFrame = { kind: "screen" | "overlay"; id: string; state?: string; title: string; device?: string; x?: number; y?: number; loc: string };
export function boardFrames(tree: unknown): BoardFrame[];
export function freeFrameId(base: string, taken: Iterable<string>): string;
export function frameCode(options: { kind: "screen" | "overlay"; id: string; title?: string; device?: string; chrome?: boolean; x?: number; y?: number; width?: number; height?: number }): string;
export function protoCode(action: string, arg?: string): string;
/** The builder page as a JSON document (doc.mjs): the dialect's neutral tree with a stable id on every element. */
export type PageDoc = { header: Record<string, unknown> | null; mock: Record<string, unknown>; board: unknown };
export const ID_PROP: string;
export function printPage(doc: PageDoc, options?: { ids?: boolean }): string;
export function elementText(node: unknown, options?: { ids?: boolean }): string;
export function docFromText(text: string, options?: { components?: Set<string>; newId?: () => string }): { doc: PageDoc | null; errors: DialectError[] };
export function locsOf(doc: PageDoc, text: string, options?: { components?: Set<string> }): { idAt: Map<string, string>; locOf: Map<string, string> };
export function newDocId(): string;
export function withoutIds(doc: PageDoc): unknown;
/** Pages made before the master layout: the Screen's `sidebar` / `header` moved into its root AppShell (screen-frame.mjs). */
export function migrateScreenFrame(text: string, options?: { file?: string }): { text: string; changed: boolean; notes: string[] };
/** Where each element of the first text is in the second, by id: "line:col" → "line:col", null when gone; null overall
 *  when no id carried over. */
export type LocMap = Record<string, string | null>;
export function locMap(before: PageDoc, beforeText: string, after: PageDoc, afterText: string, options?: { components?: Set<string> }): LocMap | null;
export function editDoc(doc: PageDoc, text: string, request: { file: string; loc: string; name: string; ops: unknown[] }, deps: { components?: Set<string>; applyOps: typeof applyOps; dataFieldEdit: typeof dataFieldEdit; sha1?: typeof sha1; options?: Record<string, unknown> }): { doc: PageDoc; text: string; answer: Record<string, unknown>; ids: boolean; locs: LocMap | null } | { error: string; code: string };

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
export function requiredFromApi(api: unknown): { requiredChildren: Set<string>; requiredProps: Map<string, Set<string>>; childless: Set<string> };
export function dataFieldEdit(code: string, file: string, loc: string, name: string, op: unknown, options?: { read?: (rel: string) => string | null }): { file: string; code: string; source: string; changed: boolean } | EngineError;
export function originsOf(code: string, file: string, loc: string, targets: Array<{ prop: string } | { child: number } | { tableRows: true }>, options?: { read?: (rel: string) => string | null }): Array<Record<string, unknown>>;
export type DialectError = { line: number; column: number; message: string };
export function parsePage(text: string, options?: { components?: Set<string> }): { header: Record<string, unknown> | null; mock: Record<string, unknown>; board: unknown; errors: DialectError[] };
export function validateDialect(text: string, options?: { components?: Set<string> }): DialectError[];
/** A Screen's phone parts drawn from its desktop AppShell (responsive-header.mjs, component-usage-rules §17). */
export const PHONE_LINKED_PROP: "phoneLinked";
export function phoneChromeCode(screen: unknown, options?: { mock?: Record<string, unknown> }): { kind: "root" | "child" | null; topNavigation: string | null; bottomNavigation: string | null; notes: string[] };
export function phoneLinkedOf(screen: unknown): Array<"topNavigation" | "bottomNavigation">;
/** The Screen edits that keep linked phone parts on the desktop header after an edit (`before` null: the page as it opens). */
export function planPhoneSync(before: string | null, after: string, options?: { components?: Set<string> }): Array<{ loc: string; name: "Screen"; ops: Array<{ op: "setProp"; name: string; value: { kind: "expression"; code: string } } | { op: "removeProp"; name: string } | { op: "insertChild"; prop: string; code: string }>; notes: string[] }>;
export function newPageText(options?: { title?: string; device?: string; layout?: string; width?: number; height?: number; chrome?: boolean; empty?: boolean }): string;
export function pageHeader(text: string): Record<string, unknown> | null;
export type BoardFrame = { kind: "screen" | "overlay"; id: string; state?: string; title: string; device?: string; x?: number; y?: number; loc: string };
export function boardFrames(tree: unknown): BoardFrame[];
export function freeFrameId(base: string, taken: Iterable<string>): string;
/** Figma's sections on the Board (dialect.mjs boardSections). */
export function boardSections(tree: unknown): Array<{ id: string; title: string; x: number; y: number; width: number; height: number; loc: string }>;
export function sectionCode(options: { id: string; title?: string; x: number; y: number; width: number; height: number }): string;
export function frameCode(options: { kind: "screen" | "overlay"; id: string; title?: string; device?: string; layout?: string; chrome?: boolean; empty?: boolean; x?: number; y?: number; width?: number; height?: number; holds?: "dialog" | "sheet" | "panel" | "card" }): string;
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

/** Figma's Add / Remove auto layout as one element's new code (relayout.mjs). */
export function relayoutCode(text: string, range: { start: number; end: number }, plan: {
  tag?: string;
  set?: Record<string, string | number | true | { code: string } | undefined>;
  remove?: string[];
  children?: Array<{ set?: Record<string, string | number | true | { code: string } | undefined>; remove?: string[]; float?: { set?: Record<string, string | number | true | { code: string }> }; unwrap?: boolean }>;
  order?: number[];
  wrap?: { tag: string; set?: Record<string, string | number | true | { code: string } | undefined> };
}): string;

/** A page's component property (dialect.mjs COMPONENT_PROPERTY_TYPES). */
export type LocalProperty = { name: string; type: "text" | "boolean" | "swap" | "slot"; default?: unknown; preferred?: unknown[] };
/** A page's main components (dialect.mjs localComponents): `<Component id name>` and the one layer it holds; a variant's set and values. */
export function localComponents(tree: unknown): Array<{ id: string | null; name: string | null; loc: string; node: { loc: string; props: Record<string, unknown> }; root: { loc: string; name: string } | null; set: string | null; variant: Record<string, string> | null; properties: LocalProperty[]; description?: string; link?: string }>;
/** A page's component sets (dialect.mjs componentSets): `<ComponentSet>`, its variants, variant properties (axes) and properties. */
export function componentSets(tree: unknown): Array<{ id: string | null; name: string | null; loc: string; node: { loc: string; props: Record<string, unknown> }; variants: Array<{ id: string | null; loc: string; name: string | null; variant: Record<string, string> | null }>; axes: Array<{ name: string; values: string[] }>; properties: LocalProperty[]; description?: string; link?: string }>;
/** What an instance draws (dialect.mjs resolveInstance): its main, set, variant values and property values. */
export function resolveInstance(tree: unknown, use: unknown): { main: { id: string | null; name: string | null }; set: { id: string | null; name: string | null } | null; variant: Record<string, string>; values: Record<string, unknown> } | null;
/** A variant's name as Figma writes it ("Size=Small, State=Default"). */
export function variantName(values: Record<string, string> | null | undefined): string;
/** Every element node of a parsed page's subtree (dialect.mjs eachElement). */
export function eachElement(node: unknown, visit: (node: { name: string; loc: string; props: Record<string, { kind: string; value?: unknown }> }, parents: unknown[]) => void): void;

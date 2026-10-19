/*
 * Figma's Find and replace (⌘F, Studio parity F10), pure: the text layers of a page whose words hold a query (case
 * ignored), and the words with every match replaced. `node findModel.selftest.mjs` runs it (type-only imports).
 */

/** A text of the page that holds the query: its element (loc, name), the words and how many matches. */
export type FindHit = { loc: string; name: string; text: string; count: number };

type Node = { kind?: string; name?: string; loc?: string; value?: string; children?: Node[]; props?: Record<string, unknown> };

const escape = (query: string) => query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** The query as a case-insensitive pattern for every match (null for an empty query). */
export const queryPattern = (query: string) => (query.trim() ? new RegExp(escape(query), "gi") : null);

/** How many times `query` is in `text`. */
export const countMatches = (text: string, query: string) => { const pattern = queryPattern(query); return pattern ? (text.match(pattern)?.length ?? 0) : 0; };

/** `text` with every match of `query` replaced by `replacement` (as typed: no patterns). */
export const replaceMatches = (text: string, query: string, replacement: string) => { const pattern = queryPattern(query); return pattern ? text.replace(pattern, () => replacement) : text; };

/**
 * The elements of a page (parsePage's board) whose own words hold `query`, in page order: one hit per element (its text
 * children joined), so a Text and each of its TextRuns are found where the words are.
 */
export function findTexts(board: unknown, query: string): FindHit[] {
  const hits: FindHit[] = [];
  if (!queryPattern(query)) return hits;
  const visit = (node: Node | null | undefined) => {
    if (!node || node.kind !== "element" && !node.name) return;
    const texts = (node.children ?? []).filter((child) => child.kind === "text" && typeof child.value === "string").map((child) => child.value as string);
    const text = texts.join("");
    const count = texts.reduce((sum, value) => sum + countMatches(value, query), 0);
    if (count && node.loc && node.name) hits.push({ loc: node.loc, name: node.name, text, count });
    for (const child of node.children ?? []) if (child.kind === "element" || (child.name && !child.kind)) visit(child);
    // A layer held in a prop (a slot's element value) is a layer too.
    for (const value of Object.values(node.props ?? {})) {
      const held = value as { kind?: string; node?: Node; children?: Node[] };
      if (held?.kind === "element") visit(held.node);
      else if (held?.kind === "fragment") for (const child of held.children ?? []) visit(child);
    }
  };
  visit(board as Node);
  return hits;
}

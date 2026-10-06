import type { PaletteItem } from "../../slots/palette";

/*
 * The Studio library's search (Studio builder GĐ3 M1, spec docs/research/studio-builder-library-spec-2026-10-06.md §3b):
 * what people type → the library items, best first. Pure and without runtime imports, so `node search.selftest.mjs` runs
 * it as is; catalog.ts feeds it the palette, the synonyms (synonyms.ts) and the guideline keywords (generated).
 *
 * Text is folded (lower case, Vietnamese marks dropped, đ → d, anything else a space). The query splits into tokens,
 * a synonym phrase ("hộp thoại", "text box") being one token. Every token must match an item (AND); an item's score is
 * the sum of its tokens' best scores:
 *   synonym, the row's first id 100 · another id of the row 60
 *   a word of the label: equal 60 (+10 when it is the first word) · starts with the token 45 (+10)
 *   a component the item uses: a word of its name equal 50, starting with the token 40; the whole name starts with it 40
 *   one typo (≥ 4 letters: a letter added, dropped, changed or two swapped) against a label word or a component 35
 *   a word of the group or caption starting with the token 15 · a guideline keyword starting with it (≥ 3 letters) 12
 * plus 40 when the whole query is the label and 20 when the label starts with it. Ties keep the palette's order.
 */

export type LibraryEntry = {
  kind: "component";
  id: string;
  label: string;
  group: string;
  caption?: string;
  root: string;
  components: readonly string[];
  /** Folded guideline words of its components. */
  keywords: readonly string[];
  /** Place in the palette: the tie-break. */
  order: number;
  item: PaletteItem;
};

/** Lower case, marks dropped (đ → d), anything but a letter or digit a single space. */
export function fold(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]+/g, " ").trim();
}

/** "InputField" → "input field" (folded). */
const nameWords = (name: string) => fold(name.replace(/([a-z0-9])([A-Z])/g, "$1 $2"));

/** At most one edit apart: a letter added, dropped, changed, or two neighbours swapped. */
export function withinOneEdit(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i += 1;
  if (a.length === b.length) {
    if (a.slice(i + 1) === b.slice(i + 1)) return true;
    return a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2);
  }
  return a.length > b.length ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
}

/** The palette as library entries; `keywords`: per component name, its guideline words (keywords.generated.ts). */
export function paletteEntries(palette: readonly PaletteItem[], keywords: Readonly<Record<string, readonly string[]>> = {}): LibraryEntry[] {
  return palette.map((item, order) => ({
    kind: "component",
    id: item.id,
    label: item.label,
    group: item.group,
    caption: item.caption,
    root: item.root,
    components: item.components,
    keywords: [...new Set(item.components.flatMap((name) => keywords[name] ?? []))],
    order,
    item,
  }));
}

/** term (folded) → ids, first one the best (synonyms.ts rows). */
export type SynonymMap = ReadonlyMap<string, readonly string[]>;

export function synonymMap(rows: ReadonlyArray<readonly [readonly string[], readonly string[]]>): SynonymMap {
  const map = new Map<string, string[]>();
  for (const [terms, ids] of rows) {
    for (const term of terms) {
      const key = fold(term);
      if (!key) continue;
      const list = map.get(key) ?? [];
      for (const id of ids) if (!list.includes(id)) list.push(id);
      map.set(key, list);
    }
  }
  return map;
}

type Token = { text: string; ids?: readonly string[] };

/** The query's tokens: the longest synonym phrase at each word first (up to 4 words), else the word. */
export function tokensOf(query: string, synonyms: SynonymMap): Token[] {
  const words = fold(query).split(" ").filter(Boolean);
  const out: Token[] = [];
  for (let i = 0; i < words.length;) {
    let taken = 0;
    for (let size = Math.min(4, words.length - i); size >= 1; size -= 1) {
      const phrase = words.slice(i, i + size).join(" ");
      const ids = synonyms.get(phrase);
      if (ids) { out.push({ text: phrase, ids }); taken = size; break; }
    }
    if (!taken) { out.push({ text: words[i] }); taken = 1; }
    i += taken;
  }
  return out;
}

type Prepared = { entry: LibraryEntry; label: string; labelWords: string[]; names: string[][]; nameJoined: string[]; groupWords: string[]; keywords: readonly string[] };

const prepared = new WeakMap<readonly LibraryEntry[], Prepared[]>();
function prepare(entries: readonly LibraryEntry[]): Prepared[] {
  let list = prepared.get(entries);
  if (!list) {
    list = entries.map((entry) => {
      const label = fold(entry.label);
      const names = entry.components.map((name) => nameWords(name).split(" "));
      return {
        entry,
        label,
        labelWords: label.split(" "),
        names,
        nameJoined: names.map((words) => words.join("")),
        groupWords: fold(`${entry.group} ${entry.caption ?? ""}`).split(" ").filter(Boolean),
        keywords: entry.keywords,
      };
    });
    prepared.set(entries, list);
  }
  return list;
}

function tokenScore(token: Token, p: Prepared): number {
  let best = 0;
  if (token.ids) {
    const at = token.ids.indexOf(p.entry.id);
    if (at === 0) best = 100;
    else if (at > 0) best = 60;
  }
  // A phrase matches the label as a phrase too ("bottom sheet").
  const word = token.text;
  if (word.includes(" ")) {
    if (p.label === word) best = Math.max(best, 70);
    else if (p.label.startsWith(word)) best = Math.max(best, 55);
    else if (p.label.includes(` ${word}`)) best = Math.max(best, 45);
    return best;
  }
  p.labelWords.forEach((labelWord, index) => {
    const first = index === 0 ? 10 : 0;
    if (labelWord === word) best = Math.max(best, 60 + first);
    else if (labelWord.startsWith(word)) best = Math.max(best, 45 + first);
  });
  if (best >= 60) return best;
  for (const [index, words] of p.names.entries()) {
    if (words.includes(word)) best = Math.max(best, 50);
    else if (words.some((part) => part.startsWith(word)) || p.nameJoined[index].startsWith(word)) best = Math.max(best, 40);
  }
  if (best < 35 && word.length >= 4 && (p.labelWords.some((labelWord) => withinOneEdit(word, labelWord)) || p.nameJoined.some((name) => withinOneEdit(word, name)) || p.names.some((words) => words.some((part) => part.length >= 4 && withinOneEdit(word, part))))) best = 35;
  if (best < 15 && p.groupWords.some((groupWord) => groupWord.startsWith(word))) best = 15;
  if (best < 12 && word.length >= 3 && p.keywords.some((keyword) => keyword.startsWith(word))) best = 12;
  return best;
}

/** The entries that match `query`, best first; every entry (in order) for an empty query. */
export function searchLibrary(entries: readonly LibraryEntry[], query: string, synonyms: SynonymMap = new Map()): LibraryEntry[] {
  const folded = fold(query);
  if (!folded) return [...entries];
  const tokens = tokensOf(folded, synonyms);
  const scored: Array<{ entry: LibraryEntry; score: number }> = [];
  for (const p of prepare(entries)) {
    let score = 0;
    let matched = true;
    for (const token of tokens) {
      const s = tokenScore(token, p);
      if (!s) { matched = false; break; }
      score += s;
    }
    if (!matched) continue;
    if (p.label === folded) score += 40;
    if (p.label.startsWith(folded)) score += 20;
    scored.push({ entry: p.entry, score });
  }
  return scored.sort((a, b) => b.score - a.score || a.entry.order - b.entry.order).map((row) => row.entry);
}

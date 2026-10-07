/*
 * Icons and photos in the Studio library (Studio builder GĐ3 M3, spec docs/research/studio-builder-library-spec-2026-10-06.md
 * §3a, §3b): the icon set as glyphs (a line and a solid style of one drawing are one glyph) and the search over glyphs and
 * photos. Pure and without runtime imports (`node search.selftest.mjs` runs it); icons.ts feeds it the generated names.
 *
 * A glyph matches every token of the query (folded as search.ts folds), each through a word of its name (equal 60, +10
 * the first word; starts with it 45, +10), a synonym (icon-synonyms rows: what people call it, in English and Vietnamese
 * → words of icon names; 50, +10 on the name's first word, +5 for the row's first word) or one typo (≥ 4 letters, 35; 45 on the first word).
 * Ties: the shorter name first, then A–Z.
 */

export type IconGlyph = {
  /** The name without "icon-" and its style: "trash-01". */
  id: string;
  /** Words of the name: "trash 01". */
  label: string;
  words: readonly string[];
  line?: string;
  solid?: string;
};

const fold = (text: string) => text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]+/g, " ").trim();

function withinOneEdit(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i += 1;
  if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1) || (a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2));
  return a.length > b.length ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
}

/** The icon names as glyphs: "icon-trash-01-line" and "icon-trash-01-solid" → trash-01 { line, solid }. A cut-only
 *  drawing ("icon-chevron-left-line-medium") takes the medium cut, else the first. */
export function iconGlyphs(names: readonly string[]): IconGlyph[] {
  const glyphs = new Map<string, IconGlyph>();
  for (const name of names) {
    const match = /^icon-(.+?)-(line|solid)(?:-(small|medium|large))?$/.exec(name);
    const id = match ? match[1] : name.replace(/^icon-/, "");
    const style = match?.[2] as "line" | "solid" | undefined;
    const cut = match?.[3];
    const glyph = glyphs.get(id) ?? { id, label: id.replace(/-/g, " "), words: id.split("-") };
    if (style && (!glyph[style] || cut === "medium")) glyph[style] = name;
    if (!style) glyph.line ??= name;
    glyphs.set(id, glyph);
  }
  return [...glyphs.values()].sort((a, b) => a.id.localeCompare(b.id));
}

/** folded term → icon-name words (what that term draws). */
export type IconSynonymMap = ReadonlyMap<string, readonly string[]>;

export function iconSynonymMap(rows: ReadonlyArray<readonly [readonly string[], readonly string[]]>): IconSynonymMap {
  const map = new Map<string, string[]>();
  for (const [terms, words] of rows) {
    for (const term of terms) {
      const key = fold(term);
      if (!key) continue;
      map.set(key, [...new Set([...(map.get(key) ?? []), ...words])]);
    }
  }
  return map;
}

type Token = { text: string; words?: readonly string[] };

function tokensOf(query: string, synonyms: IconSynonymMap): Token[] {
  const words = fold(query).split(" ").filter(Boolean);
  const out: Token[] = [];
  for (let i = 0; i < words.length;) {
    let taken = 0;
    for (let size = Math.min(3, words.length - i); size >= 1; size -= 1) {
      const phrase = words.slice(i, i + size).join(" ");
      const mapped = synonyms.get(phrase);
      if (mapped) { out.push({ text: phrase, words: mapped }); taken = size; break; }
    }
    if (!taken) { out.push({ text: words[i] }); taken = 1; }
    i += taken;
  }
  return out;
}

function wordScore(token: Token, words: readonly string[]): number {
  let best = 0;
  // A synonym: 50, +10 when it is the name's first word (x-close before annotation-x), +5 for the row's first word.
  token.words?.forEach((wanted, rank) => {
    const at = words.indexOf(wanted);
    if (at >= 0) best = Math.max(best, 50 + (at === 0 ? 10 : 0) + (rank === 0 ? 5 : 0));
  });
  const text = token.text;
  if (text.includes(" ")) return best;
  words.forEach((word, index) => {
    const first = index === 0 ? 10 : 0;
    if (word === text) best = Math.max(best, 60 + first);
    else if (word.startsWith(text)) best = Math.max(best, 45 + first);
  });
  if (best < 35 && text.length >= 4) {
    const at = words.findIndex((word) => word.length >= 4 && withinOneEdit(text, word));
    if (at >= 0) best = at === 0 ? 45 : 35;
  }
  return best;
}

/** The glyphs matching `query`, best first (all of them, A–Z, for an empty query). */
export function searchIcons(glyphs: readonly IconGlyph[], query: string, synonyms: IconSynonymMap = new Map()): IconGlyph[] {
  if (!fold(query)) return [...glyphs];
  const tokens = tokensOf(query, synonyms);
  const scored: Array<{ glyph: IconGlyph; score: number }> = [];
  for (const glyph of glyphs) {
    let score = 0;
    let matched = true;
    for (const token of tokens) {
      const s = wordScore(token, glyph.words);
      if (!s) { matched = false; break; }
      score += s;
    }
    if (matched) scored.push({ glyph, score });
  }
  return scored.sort((a, b) => b.score - a.score || a.glyph.words.length - b.glyph.words.length || a.glyph.id.localeCompare(b.glyph.id)).map((row) => row.glyph);
}

/** Photos by their alt text and key: { key, text } → matching keys, best first (every token must appear). */
export function searchPhotos<T extends { key: string; alt: string }>(photos: readonly T[], query: string, synonyms: IconSynonymMap = new Map()): T[] {
  if (!fold(query)) return [...photos];
  const tokens = tokensOf(query, synonyms);
  const scored: Array<{ photo: T; score: number; order: number }> = [];
  photos.forEach((photo, order) => {
    const words = fold(`${photo.alt} ${photo.key}`).split(" ");
    let score = 0;
    for (const token of tokens) {
      const s = wordScore(token, words);
      if (!s) return;
      score += s;
    }
    scored.push({ photo, score, order });
  });
  return scored.sort((a, b) => b.score - a.score || a.order - b.order).map((row) => row.photo);
}

import { PALETTE } from "../../slots/palette";
import { GUIDELINE_KEYWORDS } from "./keywords.generated";
import { paletteEntries, searchLibrary, synonymMap, type LibraryEntry } from "./search";
import { SYNONYM_ROWS } from "./synonyms";

/*
 * The Studio library (Studio builder GĐ3, spec docs/research/studio-builder-library-spec-2026-10-06.md §3a): the slot
 * palette's items with their guideline keywords, searched with the synonyms (search.ts). The Assets tab and Quick
 * insert read it.
 */

export const LIBRARY: readonly LibraryEntry[] = paletteEntries(PALETTE, GUIDELINE_KEYWORDS);
const SYNONYMS = synonymMap(SYNONYM_ROWS);

/** The library entries matching `query`, best first (every entry, in palette order, for an empty query). */
export const searchCatalog = (query: string): LibraryEntry[] => searchLibrary(LIBRARY, query, SYNONYMS);

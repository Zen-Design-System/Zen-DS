import { iconNames } from "../../../../icons/generated/names";
import { iconGlyphs, iconSynonymMap, searchIcons, searchPhotos, type IconGlyph } from "./iconSearch";
import { ICON_SYNONYM_ROWS } from "./iconSynonyms";
import { LIBRARY_PHOTOS, type LibraryPhoto } from "./media";

/* The library's icons and photos, searched (Studio builder GĐ3 M3; iconSearch.ts). */

export const ICON_GLYPHS: readonly IconGlyph[] = iconGlyphs(iconNames);
const SYNONYMS = iconSynonymMap(ICON_SYNONYM_ROWS);

export const searchIconGlyphs = (query: string): IconGlyph[] => searchIcons(ICON_GLYPHS, query, SYNONYMS);

const PHOTO_ROWS = LIBRARY_PHOTOS.map((entry) => ({ key: entry.key, alt: entry.photo.alt, entry }));
export const searchLibraryPhotos = (query: string): LibraryPhoto[] => searchPhotos(PHOTO_ROWS, query, SYNONYMS).map((row) => row.entry);

/** "trash 01" → "Trash 01": an inserted Icon's title. */
export const iconTitle = (glyph: IconGlyph) => glyph.label.charAt(0).toUpperCase() + glyph.label.slice(1);

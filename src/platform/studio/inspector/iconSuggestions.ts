/*
 * What the icon picker lists before the whole set (Studio builder GĐ4 M2; user 2026-10-07: Figma's preferred values hold
 * the whole icon set, so the picker leads with the swap's default in Figma, then the icons this file already uses).
 *
 * Pure (no imports): iconSuggestions.selftest.mjs imports it directly.
 */

/** At most this many "Used in this file" icons. */
export const MAX_FILE_ICONS = 12;

/** The icon names a source text writes (`"icon-heart-line"`, `'icon-x-close'`, `icon="…"`), in order, each once; only
 *  names in `known` (the icon set) count. */
export function iconsIn(text: string, known: ReadonlySet<string>): string[] {
  const seen: string[] = [];
  for (const match of text.matchAll(/["'`](icon-[a-z0-9-]+)["'`]/g)) {
    const name = match[1];
    if (known.has(name) && !seen.includes(name)) seen.push(name);
  }
  return seen;
}

export type IconGroup = { id: "default" | "file" | "all"; title: string; names: string[] };

/**
 * The picker's groups with no search: the swap's Figma default ("Default in Figma"), the file's icons without it
 * ("Used in this file", at most MAX_FILE_ICONS), then every icon (`all`, the caller's slice). An empty group is left out.
 */
export function iconGroups(all: readonly string[], defaultIcon: string | undefined, fileIcons: readonly string[]): IconGroup[] {
  const groups: IconGroup[] = [];
  if (defaultIcon) groups.push({ id: "default", title: "Default in Figma", names: [defaultIcon] });
  const used = fileIcons.filter((name) => name !== defaultIcon).slice(0, MAX_FILE_ICONS);
  if (used.length) groups.push({ id: "file", title: "Used in this file", names: used });
  groups.push({ id: "all", title: "All icons", names: [...all] });
  return groups;
}

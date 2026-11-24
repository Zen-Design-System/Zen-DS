/*
 * Link's framework-free part (the web core, src/core): tones, underlines, the new-tab attributes and how an external
 * link keeps its last word beside the glyph. React's Link and the Vue port both draw from it
 * (tools/code-languages/vue-parity.mjs).
 */

export const linkUnderlines = ["hover", "always", "none"] as const;
/** When the underline shows. */
export type LinkUnderline = (typeof linkUnderlines)[number];
export const linkTones = ["hyperlink", "inherit"] as const;
/** Link colour: the Content/Hyperlink family, or the surrounding text colour. */
export type LinkTone = (typeof linkTones)[number];

/** `rel` tokens without duplicates: the caller's own plus the ones a new tab needs. */
function mergeRel(rel: string | undefined, add: string[]) {
  return [...new Set([...(rel ?? "").split(/\s+/).filter(Boolean), ...add])].join(" ");
}

export type LinkModelInput = { external?: boolean; tone?: LinkTone; underline?: LinkUnderline; visited?: boolean; target?: string; rel?: string };

/** The root's attributes: a new tab for `external` (and `noopener noreferrer` for any `_blank`), and its `data-*` keys. */
export function linkModel({ external = false, tone = "hyperlink", underline = tone === "inherit" ? "always" : "hover", visited = false, target, rel }: LinkModelInput) {
  return {
    target: external ? "_blank" : target,
    rel: external || target === "_blank" ? mergeRel(rel, ["noopener", "noreferrer"]) : rel,
    "data-tone": tone,
    "data-underline": underline,
    "data-visited": visited && tone === "hyperlink" ? "true" : undefined,
    "data-external": external ? "true" : undefined,
  };
}

/**
 * An external link's text label as `{ lead, last }`: the last word goes in a no-wrap span with the glyph (Chrome breaks
 * before an inline SVG even after a word joiner). Null for a very long last word (a URL): the glyph follows the whole
 * label, which may wrap.
 */
export function externalLabelParts(text: string): { label: string; lead: string; last: string } | null {
  const label = text.trimEnd();
  const at = label.lastIndexOf(" ");
  const last = label.slice(at + 1);
  return last.length > 24 ? null : { label, lead: label.slice(0, at + 1), last };
}

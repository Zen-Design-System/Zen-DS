// Zen Studio ↔ Figma: a Text's words with styles of their own (TextRun, Figma's mixed styles; F6b).
// The push gives a TEXT layer `segments`: ranges of its characters and their style, for the importer's setRange… calls.
// The pull reads Figma's styled segments back the same way and writes TextRun around the words that differ from the
// layer's own style. One shape both ways:
//   { start, end, textStyle?, bold?, italic?, decoration?: "UNDERLINE" | "STRIKETHROUGH", fill? }
// textStyle is a Zen text style name, fill a Color/Content variable name; bold is the font's Bold where the text style
// has no Bold sibling (a Heading). Pure: `node text-runs.selftest.mjs` runs it as is.
import { typographyStyles } from "../../src/tokens/typography.generated.ts";

const STYLES = new Set(Object.keys(typographyStyles));

/** A text style's Bold sibling ("Body/Base/Regular" → "Body/Base/Bold"), or null when Zen has none. */
export function boldStyleOf(style) {
  if (!style) return null;
  const bold = String(style).replace(/\/[^/]+$/, "/Bold");
  return bold !== style && STYLES.has(bold) ? bold : style.endsWith("/Bold") ? style : null;
}

const literalOf = (value) => (value?.kind === "literal" ? value.value : undefined);

/**
 * The segments of a Text / Heading written with TextRun children (null when no word has a style of its own).
 * `base` is the layer's own text style; `toneToken(tone)` a content tone's Color/Content variable.
 */
export function textSegments(element, base, toneToken) {
  const segments = [];
  let at = 0;
  const walk = (node, run) => {
    for (const child of node.children ?? []) {
      if (child.kind === "text") {
        const end = at + child.value.length;
        const segment = segmentOf(run, base, toneToken);
        if (segment && end > at) segments.push({ start: at, end, ...segment });
        at = end;
      } else if (child.kind === "element") {
        const props = child.name === "TextRun" ? child.props ?? {} : {};
        const own = Object.fromEntries(["bold", "italic", "underline", "strikethrough", "tone", "textStyle"].map((name) => [name, literalOf(props[name])]).filter(([, value]) => value !== undefined && value !== false));
        walk(child, { ...run, ...own });
      }
    }
  };
  walk(element, {});
  return segments.length ? mergeSegments(segments) : null;
}

/** A run's style as a segment's fields, relative to the layer's own text style; null when it has none. */
function segmentOf(run, base, toneToken) {
  const out = {};
  const style = run.textStyle ?? base;
  if (run.bold) {
    const bold = boldStyleOf(style);
    if (bold) out.textStyle = bold;
    else out.bold = true;
  } else if (style !== base) out.textStyle = style;
  if (out.textStyle === base) delete out.textStyle;
  if (run.italic) out.italic = true;
  // Figma has one decoration per range: underline wins over strikethrough (CSS shows both).
  if (run.underline) out.decoration = "UNDERLINE";
  else if (run.strikethrough) out.decoration = "STRIKETHROUGH";
  const fill = run.tone ? toneToken(run.tone) : null;
  if (fill) out.fill = fill;
  return Object.keys(out).length ? out : null;
}

const FIELDS = ["textStyle", "bold", "italic", "decoration", "fill"];
const sameStyle = (a, b) => FIELDS.every((field) => a[field] === b[field]);

/** Neighbouring segments with one style become one. */
function mergeSegments(segments) {
  const out = [];
  for (const segment of segments) {
    const last = out.at(-1);
    if (last && last.end === segment.start && sameStyle(last, segment)) last.end = segment.end;
    else out.push({ ...segment });
  }
  return out;
}

/**
 * A pulled TEXT layer's children: its words, with TextRun around the segments whose style differs from the layer's
 * (`base` text style, `baseFill` variable). `toneOf(fill)` is a Color/Content variable's tone; `known(style)` whether a
 * text style is Zen's. Returns { children, notes } (children as the pull's element tree: text and TextRun elements).
 */
export function runsFromSegments(characters, segments, { base, baseFill = null, toneOf, known = () => true }) {
  const notes = [];
  const literal = (value) => ({ kind: "literal", value });
  const children = [];
  const words = (text) => ({ kind: "text", value: text });
  let at = 0;
  const sorted = [...(segments ?? [])].sort((a, b) => a.start - b.start);
  for (const segment of sorted) {
    const start = Math.max(at, segment.start), end = Math.min(characters.length, segment.end);
    if (end <= start) continue;
    if (start > at) children.push(words(characters.slice(at, start)));
    const props = {};
    if (segment.textStyle && segment.textStyle !== base) {
      if (segment.textStyle === boldStyleOf(base)) props.bold = literal(true);
      else if (known(segment.textStyle)) props.textStyle = literal(segment.textStyle);
      else notes.push(`text style "${segment.textStyle}" on "${characters.slice(start, end)}" is not a Zen text style`);
    }
    if (segment.bold) props.bold = literal(true);
    if (segment.italic) props.italic = literal(true);
    if (segment.decoration === "UNDERLINE") props.underline = literal(true);
    if (segment.decoration === "STRIKETHROUGH") props.strikethrough = literal(true);
    if (segment.fill && segment.fill !== baseFill) {
      const tone = toneOf(segment.fill);
      if (tone) props.tone = literal(tone);
      else notes.push(`colour "${segment.fill}" on "${characters.slice(start, end)}" is not a Color/Content tone`);
    }
    const text = characters.slice(start, end);
    const last = children.at(-1);
    if (!Object.keys(props).length) {
      if (last?.kind === "text") last.value += text;
      else children.push(words(text));
    } else children.push({ kind: "element", name: "TextRun", props, children: [words(text)] });
    at = end;
  }
  if (at < characters.length) {
    const last = children.at(-1);
    if (last?.kind === "text") last.value += characters.slice(at);
    else children.push(words(characters.slice(at)));
  }
  return { children: children.length ? children : [words(characters)], notes };
}

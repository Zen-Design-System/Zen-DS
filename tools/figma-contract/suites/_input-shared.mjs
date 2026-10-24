// Shared pieces of the Input field suites (docs/figma-contracts/input-search.json, input-search-primitives.json, read
// 2026-10-24). Every field set is Label · Field (.Primitives/Input/Field-Only) · Help-Text: the Field instance carries the
// Focused ring (3px OUTSIDE, code: the control's box-shadow), its Container the fill + Effect/Input (code: the control's
// ::before), the 1px/2px INSIDE stroke (::after; Read-Only's [2,2] dashes are an SVG rect whose 2px centred stroke shows
// 1px inside) and the padding that places the Input-Content text (code: the native control, 2px Spacing/Padding/3XSmall
// in). A FILL text is the placeholder (checked through ::placeholder), a HUG text a typed value; the case reads both
// from the variant, so a Figma edit to the copy changes the case too. Text widths that the copy decides are not asserted.
import { at, child, findAll } from "./_chart-shared.mjs";

/** Figma Size → the short code spelling. */
export const sizeOf = (vp) => ({ Small: "sm", "Medium (Base)": "md", Medium: "md", Large: "lg", XLarge: "xl" })[vp.Size];
/** Figma State → the `state` prop (same words, lower case). */
export const stateOf = (vp) => vp.State.toLowerCase();
const shown = (node) => Boolean(node) && !node.hidden;
const focusLike = (vp) => vp.State === "Focused" || vp.State === "Typing";

/** The first TEXT under the Input-Content: Content/Placeholder → `{ placeholder }`, else a typed `{ defaultValue }`. */
export function contentText(content) {
  const text = findAll(content, (node) => node.t === "TEXT")[0];
  return text?.fill?.[0]?.v === "Color/Content/Placeholder" ? { placeholder: text.txt } : { defaultValue: text.txt };
}

/** Props of a stacked field variant: width, size, state, label, the content text and the Help-Text (error) message. */
export function fieldProps(vp, spec, content = "Field > Container > Content") {
  const props = { width: spec.w, size: sizeOf(vp), state: stateOf(vp), ...contentText(at(spec, content)) };
  if (shown(child(spec, "Label"))) props.label = at(spec, "Label > Content > Label").txt;
  const help = child(spec, "Help-Text");
  if (shown(help)) props[/Negative/.test(help.main ?? "") ? "error" : "helpText"] = at(help, "Content > Message").txt;
  if (vp.State === "Read-Only") props.readOnly = true;
  if (vp.State === "Disabled") props.disabled = true;
  return props;
}

/**
 * The map of the field's own layers. `field` is the Field-Only instance path ("" when the set is Field-Only itself),
 * `content` the Input-Content path inside it; `native` the control that shows the text, `placeholder` the element that
 * renders the placeholder copy, `value` the one that renders a typed value; `cursor: false` for a control without a caret.
 */
export function fieldMap({ field = "Field", content = "Content", native = ".zen-input__native", placeholder = `${native}::placeholder`, value = native, cursor = true, label = true, textBox = ["w", "h", "x", "y"], cursorBox = ["x", "cy"] } = {}) {
  const F = (route) => [field, route].filter(Boolean).join(" > ");
  const text = F(`Container > ${content} > Text`);
  const typed = (vp, props) => props.placeholder === undefined;
  const entries = [
    { figma: "", dom: ":root", check: ["size"] },
    { figma: F(""), dom: ".zen-input__control", check: ["size", "x", "y", "radius", "stroke"], strokeVia: "shadow" },
    { figma: F("Container"), dom: ".zen-input__control", check: ["size", "x", "y", "radius"] },
    { figma: F("Container"), dom: ".zen-input__control::before", check: ["fill", "fx"] },
    { figma: F("Container"), dom: ".zen-input__control::after", check: ["stroke"], when: (vp) => vp.State !== "Read-Only" },
    { figma: F("Container"), dom: ".zen-input__dash rect", check: ["stroke", "dash"], strokeVia: "svg", strokeScale: 0.5, when: (vp) => vp.State === "Read-Only" },
    // Placeholder: the control's box is the FILL text's box (Focused: the caret sits before it, so the box starts at the Cursor).
    { figma: text, dom: native, check: textBox, when: (vp, props) => !typed(vp, props) && vp.State !== "Focused" },
    { figma: text, dom: placeholder, check: ["text"], when: (vp, props) => !typed(vp, props) },
    { figma: text, dom: value, check: ["text", ...textBox.filter((c) => c !== "w")], when: typed },
  ];
  if (cursor) {
    entries.push(
      // The caret is the line box's height (XLarge's 28), Figma's Cursor 20px centred in it: its middle compares.
      { figma: F(`Container > ${content} > Cursor`), dom: native, check: cursorBox, when: (vp) => vp.State === "Focused" },
      { figma: F(`Container > ${content} > Cursor`), dom: native, check: ["fill"], fillVia: "caret", when: focusLike },
    );
  }
  if (label) {
    entries.push(
      { figma: "Label", dom: ".zen-input-label", check: ["size", "x", "y"] },
      { figma: "Label > Content > Label", dom: ".zen-input-label__text", check: ["h", "x", "y", "text"] },
    );
  }
  return entries;
}

/** Help-Text (Theme=Negative in the error states): the row, its 12px icon and the message. */
export function helpMap({ when = (vp) => /Error/.test(vp.State) } = {}) {
  return [
    { figma: "Help-Text", dom: ".zen-input-help", check: ["size", "x", "y"] },
    { figma: "Help-Text > Content > icon-alert-octagon-line", dom: ".zen-input-help__icon > .zen-icon", check: ["size", "x", "y"], when },
    { figma: "Help-Text > Content > icon-alert-octagon-line > Vector", dom: ".zen-input-help__icon > .zen-icon", check: ["fill"], fillVia: "color", when },
    { figma: "Help-Text > Content > Message", dom: ".zen-input-help__content > span:last-child", check: ["text", "h", "x", "y"], when },
  ];
}

/**
 * Browser, not Figma: Chrome forces `line-height: initial !important` on ::placeholder (author !important cannot override
 * it), so the placeholder reports `normal`; its glyphs render on the same rows as typed text (as in input-heading). Pinned
 * per text style to the exact value code renders, for the placeholder entry at `layer`.
 */
export const placeholderLineHeight = (layer) => [
  "Inter 500 14px/normal ls=-0.14px none", // Body/Base/Medium
  "Inter 600 20px/normal ls=-0.6px none", // Heading/4 (XLarge)
  "Inter 500 12px/normal ls=-0.12px none", // Body/Small/Medium (Text-Area Small)
].map((code) => ({ vp: {}, layer, prop: "text", code, note: "Chrome forces line-height: initial on ::placeholder; the placeholder glyphs sit on the typed text's rows." }));

/**
 * Figma-side inconsistency (ask the designer): Select-, Date- and Number-Field Small bind the root gap to Spacing/Gap/XSmall
 * (8) where Text-Field and Text-Area Small bind Input/Spacing/Small/Outside-Field-Gap (4); the other sizes are 8 either way.
 * Code keeps the Input token on every field, so everything under the label sits 4px higher. `extra`: [layer, prop, code].
 */
export const smallGapExceptions = (extra = []) => [
  ["(root)", "h", 52], ["(root)", "h", 72], ["Field", "y", 20], ["Field > Container", "y", 20], ["Field > Container > Content > Text", "y", 26],
  ["Field > Container > Content > Cursor", "cy", 36], ["Help-Text", "y", 56], ["Help-Text > Content > icon-alert-octagon-line", "y", 58],
  ["Help-Text > Content > Message", "y", 56], ...extra,
].map(([layer, prop, code]) => ({ vp: { Size: "Small" }, layer, prop, code, note: "Small root gap binds Spacing/Gap/XSmall (8) here but Input/Spacing/Small/Outside-Field-Gap (4) in Text-Field/Text-Area; code keeps the Input token." }));

/**
 * Open question (QUESTIONS.md "Input / Search Disabled"): Number-Align-Left/Center Disabled still draw their steppers as
 * Button State=Default; code disables them (Button Tertiary Disabled: no fill, a Content/Disabled icon). `buttons`: the
 * Button/Icon-Main layer paths.
 */
export const disabledStepperExceptions = (buttons) => buttons.flatMap((button) => [
  ["Container", "rgba(255, 255, 255, 0)"], ["Container > Leading-Icon > Vector", "rgba(0, 0, 0, 0.267)"], ["Container > Leading-Icon > Vector", "rgba(254, 254, 254, 0.37)"],
].map(([part, code]) => ({ vp: { State: "Disabled" }, layer: `${button} > ${part}`, prop: "fill", code, note: "Disabled draws State=Default steppers (QUESTIONS.md); code disables them." })));

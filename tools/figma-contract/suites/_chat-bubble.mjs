// Shared mapping of the Figma text bubbles Chat/Bubble/Text-You 6349:59476 and Text-Others 6323:1394
// (docs/figma-contracts/chat-bubbles.json, read 2026-10-24): Domain Social · Business × Device Desktop · Mobile.
// Each case is a ChatMessage in a ChatThread of the variant's Device (cases/chat.tsx `chatTextBubble`), measured from
// `.zen-chat-bubble` (Figma Container; the root equals it while Actions is hidden). Text, time and the reaction's emoji are
// read from the variant. Besides the default case, every variant renders its Reaction property (the pill, on in a second
// case) and the Desktop variants their Hover property (the toolbar); Mobile has no hover (hold-to-react instead, QUESTIONS.md).
// - The bubble hugs its text (capped at 220 / 516 by the Device), and Inter's advances differ by a pixel or two between
//   macOS and CI's Linux, so no width or text-placed x is asserted: heights, start edges, paints, text styles, and the
//   toolbar's place in % of the bubble width (xr). The pill's x and width follow its emoji's advance, which is the emoji
//   font's (Apple Color Emoji 20px at 16px, Figma's renderer 16px), so only its height, y and paint are compared.
// - Hidden layers keep the place they had when last shown: Actions keeps x 0 / y 12 from an older layout (see exceptions).
// - Figma Message-Text (+ Padding/2XSmall) is the text element's padding box (`.zen-chat-bubble__text`, content-box
//   padding-inline 4), so its start edge is checked there; Business stacks Message and Time in it, code in the bubble.
import { at, child } from "./_chart-shared.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const contract = "docs/figma-contracts/chat-bubbles.json";
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const PILL = "Container > Chat/Reaction/Status/No";
const actionIcons = (setId) => {
  const set = JSON.parse(fs.readFileSync(path.join(repo, contract), "utf8")).find((entry) => entry.id === setId);
  return (child(set.variants[0].spec, "Actions")?.c ?? []).map((button) => at(button, "Container > Leading-Icon")?.main);
};

// Figma's Hover toolbar instances draw their icons at Element-Size/Popular/Base (20) in Content/Neutral/Base: the icon
// component's own size and colour, not the Button/Icon-Flat Small Secondary variant's Button/Icon-Size/Small (16) and
// Content/Neutral/Light (button-icon.json 234:43906), as if an icon swap dropped the button's bindings. Ask the designer;
// code renders the Icon-Flat Small Secondary the guideline names. `code` pins the button's own 16px icon, 8px in.
const iconExceptions = (count) => Array.from({ length: count }, (_, i) => `Actions > Button/Icon-Flat#${i} > Container > Leading-Icon`).flatMap((layer) => [
  ...[["w", 16], ["h", 16], ["x", 8], ["y", 8]].map(([prop, code]) => ({
    vp: { Device: "Desktop" }, layer, prop, code,
    note: "Chat Hover icons are 20px (Element-Size/Popular/Base) in Figma, the Icon-Flat Small Secondary variant 16px (Button/Icon-Size/Small): ask the designer.",
  })),
  ...["rgba(0, 0, 0, 0.486)", "rgba(255, 255, 255, 0.596)"].map((code) => ({
    vp: { Device: "Desktop" }, layer: `${layer} > Vector`, prop: "fill", code,
    note: "Chat Hover icons bind Content/Neutral/Base in Figma, the Icon-Flat Small Secondary variant Content/Neutral/Light: ask the designer.",
  })),
]);

export const chatBubbleSuite = ({ setId, side }) => {
  const icons = actionIcons(setId);
  const button = (icon) => `.zen-chat-message__hover > .zen-button:has([data-icon="${icon}"])`;
  const reacted = (vp, props) => Boolean(props.reaction);
  const hovered = (vp, props) => Boolean(props.hover);
  return {
    contract,
    setId,
    kind: "chatTextBubble",
    root: ".zen-chat-bubble",
    cases: (vp, variant) => {
      const spec = variant.spec;
      const base = {
        device: vp.Device.toLowerCase(),
        side,
        domain: vp.Domain.toLowerCase(),
        text: at(spec, "Container > Message-Text > Message").txt,
        time: at(spec, "Container > Message-Text > Time")?.txt,
      };
      const emoji = at(spec, `${PILL} > Emojis > Emoji-Items > Emoji`)?.main?.match(/Emoji=(\w+)/)?.[1].toLowerCase();
      return [base, { ...base, reaction: emoji }, ...(vp.Device === "Desktop" ? [{ ...base, hover: true }] : [])];
    },
    figmaExceptions: [
      ...iconExceptions(icons.length),
      // Hidden Actions keep a stale place. Shown, the root's auto layout (ca CENTER, Gap/XSmall) centres them on the
      // 62px Business bubble (y 15; 12 is the centre of an older 56px bubble) and, for your messages, puts them
      // 96 + 8 before the Container (x −104 from it), where Figma still stores 0 for both.
      { vp: { Domain: "Business", Device: "Desktop" }, layer: "Actions", prop: "y", code: 15, note: "Hidden Actions keep y 12 from a 56px bubble; auto layout centres them on the 62px bubble (15)." },
      ...(side === "you" ? [{ vp: { Device: "Desktop" }, layer: "Actions", prop: "x", code: -104, note: "Hidden Actions keep x 0; shown, auto layout puts them 96 + Gap/XSmall 8 before the Container (−104)." }] : []),
    ],
    map: [
      { figma: "", dom: ":root", check: ["h"] },
      // fx is not compared: the Business lifts, the pill's lift and the Social You background blur (on an opaque fill) are
      // local Figma effects, not an Effect style, which is all the checker reads (QUESTIONS.md; chat.css mirrors the lifts).
      // Fills compare as a stack (Social Others lays Neutral/Subtle over Surface/Default), radius corner by corner (the 4px
      // tail), and Business's 66px minimum width.
      { figma: "Container", dom: ":root", check: ["fills", "radius"] },
      { figma: "Container", dom: ":root", check: ["minw"], when: (vp) => vp.Domain === "Business" },
      // The text's cap (Message max 220 Mobile / 516 Desktop) and Business's 42px minimum.
      { figma: "Container > Message-Text > Message", dom: ".zen-chat-bubble__text", check: ["maxw"] },
      { figma: "Container > Message-Text > Message", dom: ".zen-chat-bubble__text", check: ["minw"], when: (vp) => vp.Domain === "Business" },
      { figma: "Container > Message-Text", dom: ".zen-chat-bubble__text", check: ["h", "x", "y"], when: (vp) => vp.Domain === "Social" },
      { figma: "Container > Message-Text", dom: ".zen-chat-bubble__text", check: ["x", "y"], when: (vp) => vp.Domain === "Business" },
      { figma: "Container > Message-Text > Message", dom: ".zen-chat-bubble__text", check: ["text", "h", "y"] },
      // Business: the time inside the bubble, Gap/3XSmall under the text (Caption/Regular; You at 56%).
      { figma: "Container > Message-Text > Time", dom: ".zen-chat-bubble__time", check: ["text", "h", "y", "opacity"], when: (vp) => vp.Domain === "Business" },
      // Reaction (hidden by default): the pill on the bubble's bottom-right corner, 16 below it.
      { figma: PILL, dom: ".zen-chat-reactions", check: ["h"], when: (vp, props) => !reacted(vp, props) },
      { figma: PILL, dom: ".zen-chat-reactions", check: ["h", "y", "fill", "radius"], forceVisible: true, when: reacted },
      // Hover (hidden by default; desktop): three Icon-Flat Small Secondary buttons, Gap/XSmall beside the bubble, centred on it.
      { figma: "Actions", dom: ".zen-chat-message__hover", check: ["h"], when: (vp, props) => !hovered(vp, props) },
      { figma: "Actions", dom: ".zen-chat-message__hover", check: ["size", "y", side === "you" ? "x" : "xr"], forceVisible: true, when: hovered },
      ...icons.flatMap((icon, i) => {
        const B = `Actions > Button/Icon-Flat#${i}`;
        return [
          { figma: B, dom: button(icon), check: ["size", "x", "y"], figmaRoot: "Actions", root: ".zen-chat-message__hover", when: hovered },
          { figma: `${B} > Container`, dom: button(icon), check: ["fill", "radius"], when: hovered },
          { figma: `${B} > Container > Leading-Icon`, dom: `${button(icon)} .zen-button__icon`, check: ["size", "x", "y"], figmaRoot: B, root: button(icon), when: hovered },
          { figma: `${B} > Container > Leading-Icon > Vector`, dom: `${button(icon)} .zen-button__icon`, check: ["fill"], fillVia: "color", when: hovered },
        ];
      }),
    ],
  };
};

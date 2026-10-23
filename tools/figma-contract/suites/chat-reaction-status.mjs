// Figma Chat/Reaction/Status/No 6263:67242 (docs/figma-contracts/chat-bubbles.json, read 2026-10-24): Counter No · Yes, the
// reactions pill (ChatReactions, read-only). Its count and emoji are read from the variant. The pill hugs a glyph: the
// count's width is Inter's (it differs between macOS and CI's Linux) and the emoji's advance is the emoji font's (Apple
// Color Emoji 20px at 16px, Figma's renderer 16px), so the pill's width and the x of anything after them are not asserted:
// height, paint, radius, the padded start edge, the count's text style and the emoji's colour are.
// Its lift is a local Figma effect (Color/Shadow/Neutral/Base), not an Effect style, which is all `fx` reads (QUESTIONS.md).
import { at } from "./_chart-shared.mjs";

const counted = (vp) => vp.Counter === "Yes";
export default {
  contract: "docs/figma-contracts/chat-bubbles.json",
  setId: "6263:67242",
  kind: "chatReactionStatus",
  root: ".zen-chat-reactions",
  cases: (vp, variant) => {
    const kind = at(variant.spec, "Emojis > Emoji-Items > Emoji").main.match(/Emoji=(\w+)/)[1].toLowerCase();
    const count = Number(at(variant.spec, "Emojis > Count")?.txt ?? 1);
    return { reactions: [{ kind, count }] };
  },
  map: [
    { figma: "", dom: ":root", check: ["h", "fill", "radius"] },
    // Figma Emojis (Padding/2XSmall; Padding/XSmall at the start with a count) is the pill's own padded row in code.
    { figma: "Emojis", dom: ":root", check: ["h", "x", "y"] },
    { figma: "Emojis > Count", dom: ".zen-chat-reactions > span:not(.zen-chat-reactions__emojis)", check: ["text", "h", "x", "y"], when: counted },
    { figma: "Emojis > Emoji-Items", dom: ".zen-chat-reactions__emojis", check: ["h", "y"] },
    { figma: "Emojis > Emoji-Items", dom: ".zen-chat-reactions__emojis", check: ["x"], when: (vp) => !counted(vp) },
    { figma: "Emojis > Emoji-Items > Emoji", dom: ".zen-chat-reactions__emojis > span", check: ["h", "y"] },
    { figma: "Emojis > Emoji-Items > Emoji > Message", dom: ".zen-chat-reactions__emojis > span", check: ["fill"], fillVia: "color" },
  ],
};

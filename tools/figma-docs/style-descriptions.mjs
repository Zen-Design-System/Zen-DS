// Descriptions of the Zen Figma text, effect and paint styles. Text styles follow the content hierarchy
// (src/platform/PlatformTypographyHierarchy.tsx, docs/context/typography-hierarchy-review-2026-09-29.md); effects follow
// the background layers and the shadow rule (usage rules §8, §9, §16). describeStyle travels to use_figma as source
// (Function#toString), so it stays self-contained.

/** The description a style should have ("TEXT" | "EFFECT" | "PAINT"), or null when there is no rule for it. */
export function describeStyle(kind, name) {
  const TONE = " Pick the colour by role (Color/Content/*), emphasise with weight, never resize a style by hand; its size follows the Typography Configuration mode (Dashboard, Popular, Mobile).";
  if (kind === "TEXT") {
    const TEXT = {
      "Display-Extra": "Oversized display type for marketing and hero moments, outside the content hierarchy: never a heading chosen for its size.",
      "Display/1": "Large display type for landing headlines and hero numbers, outside the page outline.",
      "Display/2": "Large display type for landing headlines and hero numbers, outside the page outline.",
      "Display/3": "Display type for hero numbers and statement lines, outside the page outline.",
      "Display/4": "The hero value: one per view (the main metric, a total, a price). Values are never headings; values in a grid of cards use Heading/2 or Heading/3 so the page title stays the largest heading-style text.",
      "Heading/1": "The page title (h1): the master or child page title in Header/Dashboard's Main row, and a phone's large title. Exactly one per page or screen, never in an overlay.",
      "Heading/2": "Modal/Forms titles; values in a grid of metric cards; the large title of a screen nested inside another (h2).",
      "Heading/3": "Titles of Modal/Dialog, Side-Panel and Bottom-Sheet; the large title of a screen nested two levels deep (h3).",
      "Heading/4": "The section title (h2): every sibling section on a page or screen uses it — a group of cards, a list, a table that is its own section; also a page title inside a tab and the Dialog title on phones.",
      "Heading/Subheading": "Card and widget titles (h3 under a section, h2 directly under the page title) and group titles inside a section (h3). Sections and cards are told apart by spacing and surfaces, not a new size.",
      "Body/Extra/Regular": "Larger body text: assistant answers and phone lead lines.",
      "Body/Extra/Medium": "Larger body text with medium weight: the assistant prompt field and phone emphasis.",
      "Body/Extra/Bold": "A phone's compact app-bar title (the screen's h1, kept at bar size) and a key status line under a title (Arriving Friday; not a heading).",
      "Body/Base/Regular": "Body copy and the page description, in the Base tone for descriptions.",
      "Body/Base/Medium": "Medium-weight body text: emphasis inside copy, labels that need a little more weight.",
      "Body/Base/Bold": "Row and item titles (List-Item, a table's main column), read or unread — never headings. Unread is said in text too (a dot or Badge), not by weight alone.",
      "Body/Small/Regular": "Secondary copy and meta (Base tone): captions of rows, helper lines, Body/Small descriptions.",
      "Body/Small/Medium": "Small labels with medium weight; an unread row's caption (Strongest tone).",
      "Body/Small/Bold": "The list group header (a kicker label, Light tone) one level below the nearest heading; small bold labels and field label actions.",
      "Body/Code": "Code, tokens, IDs and keyboard shortcuts (monospace).",
      Caption: "Meta only: timestamps, counters, legal lines, always in the Light tone. Primary content is Body/Small or larger.",
      "Label/Small": "Compact labels inside components: navigation labels, counters, axis ticks, small controls.",
      "Button-Label": "Button and action labels, one per button size; used by the button components.",
      "All-Caps/S": "Uppercase labels: table column headers (Light tone) and small overlines.",
      "All-Caps/M": "Uppercase labels: overlines and section markers; use sparingly.",
      "All-Caps/M-BOLD": "Bold uppercase labels: covers and section markers in documentation; use sparingly in product screens.",
    };
    const key = TEXT[name] ? name : Object.keys(TEXT).filter((prefix) => name.startsWith(prefix)).sort((a, b) => b.length - a.length)[0];
    return key ? `${TEXT[key]}${TONE}` : null;
  }
  if (kind === "EFFECT") {
    const NO_TINT = " Only on Surface/Default boxes over Canvas/Default with no border; never on Subtle, Pale or Surface-Alt fills or on a Canvas/Alt page (use a border there).";
    const level = (name.match(/Level-(\d)/) || [])[1];
    if (/^Shadow\/Bottom\//.test(name)) return `Elevation ${level} of 4, casting downward. ${level === "1" ? "Level-1 is the card shadow (Card and List-Box Theme=Shadow, beside a shadowed Sidebar)." : "Higher levels are for elements that float higher (sticky bars, floating actions)."}${NO_TINT}`;
    if (/^Shadow\/Top\//.test(name)) return `Elevation ${level} of 4, casting upward: bars pinned to the bottom of a screen (bottom navigation, action bars, sheets).${NO_TINT}`;
    if (/^Shadow\/Action\//.test(name)) return "The shadow of action controls (buttons, chips), applied by the components. Zen drops it where the control's fill is Subtle or Pale.";
    if (name === "Effect/Container") return "The effect of layer 4 panels: Modal/Dialog, Modal/Forms, Side-Panel and Bottom-Sheet. Not for boxes on the page.";
    if (name === "Effect/Popover") return "The effect of layer 5 overlays: popovers, menus, pickers, tooltips and toasts. Not for boxes on the page.";
    if (name === "Effect/Input") return "The inset effect of input fields: it acts as a border, not as elevation.";
    if (name === "Effect/Overlay") return "A background blur behind Subtle or Pale fills over rich content (not elevation).";
    if (/Glass/.test(name)) return "Glass effect (background blur) for floating glass navigation and actions over rich content.";
    if (/Neo-Brutalism/.test(name)) return "A hard offset shadow for the Neo-Brutalism style only; not part of the default Zen look.";
    return null;
  }
  if (kind === "PAINT") {
    const nth = { Primary: 1, Secondary: 2, Tertiary: 3, Quaternary: 4, Quinary: 5, Senary: 6, Septenary: 7 };
    if (name.startsWith("Color Chart Sector/")) return `Chart series colour ${nth[name.split("/")[1]] || ""}: give series these colours in order (Primary first). Chart marks keep their colours; never repaint them by hand.`;
    if (name.startsWith("Avatars/")) return "A sample avatar photo for mockups (Avatar Theme=Photo). Product screens show the person's real photo or initials.";
    if (name === "Semi-Pale") return "The gradient fill of Card Theme=Semi-Pale, for cards over imagery.";
    if (name.startsWith("Gradients/Border/")) return `The gradient stroke of glass controls over ${name.includes("White") ? "white" : "black"} overlays.`;
    if (name === "Tool/Canvas") return "The canvas of documentation and tool frames; not for product screens (use Color/Background/Canvas/*).";
    if (name === "Background/Canvas-Liquid-Glass") return "A rich backdrop to preview Liquid Glass components; not a product canvas.";
    if (name.startsWith(".")) return "Hidden sample canvas kept for older demos; not for new screens (use Color/Background/Canvas/*).";
    return null;
  }
  return null;
}

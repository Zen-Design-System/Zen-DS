// Descriptions of the Zen Figma variables, from the usage rules (§6 borders, §7 content colours, §8 background layers,
// §9 shadows, §13 spacing ladder, §16 pairing) and the token data. build.mjs sends describeVariable's own source to
// use_figma (Function#toString), so it stays self-contained: no imports, no outer references.

/**
 * The description a variable should have, or null to keep the current one.
 * Rewritten from the rules: Mode Colors (Semantic), Spacing, Corner Radius, Breakpoint & Grids, Emphasis Level and the
 * primitive Global Dimensions. Elsewhere (primitive colours, Component Theme/Size, Typography Configuration, Motion) the
 * current text stays: only HTML entities are fixed and empty ones filled.
 */
export function describeVariable(name, collection, current) {
  const text = (current || "").trim();
  const unescaped = text.replace(/&#39;/g, "'").replace(/&quot;/g, "\"").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  const keep = (fallback) => (text ? (unescaped !== text ? unescaped : null) : fallback);
  const parts = name.split("/");
  const last = parts[parts.length - 1];
  const STATE = { Default: "at rest", Hover: "on hover", Pressed: "while pressed" };
  const state = (word) => STATE[word] || word.toLowerCase();
  const FAMILY = { Accent: "Accent (brand)", Positive: "Positive (success)", Negative: "Negative (error, destructive)", Warning: "Warning", Info: "Info", Neutral: "Neutral", Inverse: "Inverse" };
  const LIGHTS = ["Yellow", "Sky", "Mint", "Golden"];

  if (collection === "Global Dimensions") return `Primitive dimension (${name.replace("dm-", "")}px). For aliasing only: bind a Spacing, Corner-Radius, Breakpoint & Grids or Component Size variable instead.`;
  if (collection === "Global Colors" || collection === "Base Colors (Project)") return keep("Primitive base token. Intended for aliasing only. Avoid applying directly to UI elements.");
  if (collection === "Component Theme") return keep(`${parts[0].replace(/-/g, " ")} ${parts.slice(1).join(" ").toLowerCase()} colour, owned by the component: it is bound inside the component and changes with the Component Theme mode. Never apply it by hand.`);
  if (collection === "Component Size") return keep(`${parts[0].replace(/-/g, " ")} ${parts.slice(1).join(" ").toLowerCase()}, owned by the component: it changes with the Component Size mode (Compact, Comfortable). Never apply it by hand.`);
  if (collection !== "Mode Colors (Semantic)" && collection !== "Spacing" && collection !== "Corner Radius" && collection !== "Breakpoint & Grids" && collection !== "Emphasis Level") return keep(null);

  if (collection === "Spacing") {
    const PX = { Gap: { "3XSmall": 2, "2XSmall": 4, XSmall: 8, Small: 12, Medium: 16, Large: 24, XLarge: 32, "2XLarge": 40, "3XLarge": 48, Giant: 64, XGiant: 88, "2XGiant": 144 }, Padding: { "3XSmall": 2, "2XSmall": 4, XSmall: 8, Small: 12, Medium: 16, Large: 20, XLarge: 24, "2XLarge": 32, "3XLarge": 40, "4XLarge": 48 } };
    const LADDER = {
      "3XSmall": "two lines of one compact item: a name or value and the caption right under it (a stat over its label, a name over its meta line)",
      "2XSmall": "pieces of one inline item: icon + text, a Badge beside a title, a cluster of Tags or Badges; a pair that belongs together",
      XSmall: "a thing and its label or description (label → field, heading → supporting line, kicker → list); controls in one toolbar row (Chips, icon buttons, Search)",
      Small: "a group acting as one: text buttons side by side, choices in a group",
      Medium: "blocks inside one surface (header → body → actions), stacked form fields, toolbar → table, cards in a grid",
      Large: "columns of a layout, groups inside one surface, and separate groups (phone sections)",
      XLarge: "sections of a page (the Content slot's sections)",
    };
    const kind = parts[1];
    const px = (PX[kind] || {})[last];
    if (kind === "Gap") {
      if (LADDER[last]) return `Gap between siblings in auto layout (itemSpacing), ${px}px. Zen spacing ladder: ${LADDER[last]}. The gap between groups is always at least one step larger than the gap inside them.`;
      return `Gap between siblings in auto layout (itemSpacing), ${px}px. Outside the Zen ladder (3XSmall–XLarge): ${px < 4 ? "micro adjustments inside a component only" : "large layout gaps (hero areas, landing sections), never between ordinary elements"}.`;
    }
    const PAD = {
      Small: " Strips inside a surface (toolbar, summary, footer) take it above and below; List-Item rows pad it above and below.",
      Large: " The phone page margin (Margin-Comfortable on phones).",
      XLarge: " The desktop page margin and the padding of medium cards (Margin-Comfortable, Card-padding-medium).",
    };
    return `Inner padding of a frame you build (paddingTop/Right/Bottom/Left), ${px}px.${PAD[last] || ""} Prefer the Breakpoint & Grids variables for page margins and card padding.`;
  }

  if (collection === "Corner Radius") {
    const USE = {
      "2XSmall": "tiny marks (progress fills, chart bars)", XSmall: "small elements: badges, small tags, checkbox marks", Small: "small controls and chart bars", Base: "controls, a clickable List-Item's fill on desktop (Interactive-List-Item-Radius) and XSmall cards (Card Spacing=XSmall)",
      Large: "small cards (Card Spacing=Small) and a clickable List-Item's fill on tablets and phones", XLarge: "medium panels and popovers", "2XLarge": "cards and List-Boxes (Card Spacing=Medium)", "3XLarge": "large panels and sheets",
      Giant: "modals on tablets and phones (Modal-Radius)", XGiant: "modals on desktop (Modal-Radius)", Rounded: "pills and circles (1000)",
    };
    if (parts[1] === "Action") return last.startsWith("Focus") ? `Corner radius of the focus ring around an action of size ${last.replace("Focus-", "")}; follows the Corner Radius mode.` : `Corner radius of buttons and chips of size ${last}: a pill in the Rounded mode, a soft corner in Smooth and Standard, square in Luxury.`;
    if (parts[1] === "Input") return `Corner radius of input fields of size ${last}; follows the Corner Radius mode (Rounded, Smooth, Standard, Luxury).`;
    return `Corner radius for ${USE[last] || last}. The value follows the Corner Radius mode (Rounded is the default; Luxury squares every corner). Concentric corners: an inner radius = the outer radius minus the padding between them.`;
  }

  if (collection === "Breakpoint & Grids") {
    const BP = {
      "Margin-Comfortable": "Side margin of pages and screens, comfortable: 24 on desktop and tablet, 20 on phones. The default page margin.",
      "Margin-Compact": "Side margin of pages and screens, compact: 20 on desktop and tablet, 16 on phones, for dense screens.",
      Gutter: "Gap between grid columns: 16 on desktop and tablet, 12 on phones.",
      "Modal-Padding": "Inner padding of Modal/Dialog and Modal/Forms: 24 on desktop, 20 on tablets and phones.",
      "Card-padding-medium": "Padding of Cards with Spacing=Medium and of List-Box slots (sideways): 24 on desktop, 20 on tablets and phones.",
      "Card-padding-small": "Padding of Cards with Spacing=Small: 16 on every device.",
      "Card-padding-xsmall": "Padding of Cards with Spacing=XSmall: Spacing/Padding/XSmall (8) on every device.",
      "Modal-Radius": "Corner radius of modal panels: Corner-Radius/XGiant on desktop, Giant on tablets and phones.",
      "Interactive-List-Item-Radius": "Corner radius of a clickable List-Item's fill: Corner-Radius/Base (12) on desktop, Large (16) on tablets and phones.",
      "List-Container-Vertical-Padding": "Padding above and below the rows inside a List-Box: 12 on desktop, 8 on tablets and phones.",
      "Viewport-Width": "Width of a screen frame in this mode: 1512 desktop, 744 tablet, 390 phone.",
      "Viewport-Height": "Height of a screen frame in this mode: 982 desktop, 1133 tablet, 844 phone.",
    };
    return `${BP[name] || "Layout value per device"} Set the screen frame's Breakpoint & Grids mode (Desktop, Tablet, Mobile) and the value follows.`;
  }

  if (collection === "Emphasis Level") {
    if (parts[1] === "Font-Weight") return `Font weight of ${last.replace("-", " ").toLowerCase()} text in the text styles; the Emphasis Level mode (Light, Medium, Strong) shifts every weight together. Emphasise with weight, never with a bigger size.`;
    return `Border weight of a selected (active) ${last.toLowerCase()} element; the Emphasis Level mode (Light, Medium, Strong) makes it thinner or thicker.`;
  }

  // Mode Colors (Semantic)
  if (name === "Darkmode") return keep(null);
  const [, group, family] = parts;
  const rest = parts.slice(3);

  if (group === "Content") {
    const NEUTRAL_ROLE = {
      Strongest: "primary role: titles, headings, values, main content and primary icons",
      Base: "secondary role: body copy, descriptions, Body/Small meta and secondary icons",
      Light: "tertiary role: captions (Caption is always Light), helper text, timestamps, list group kickers (Body/Small/Bold) and quiet icons",
      Disabled: "disabled text and icons",
      Placeholder: "placeholder text in empty fields",
    };
    if (family === "Neutral") return `Text and icons, ${NEUTRAL_ROLE[last]}. Pick the level by role; emphasise with weight, never with opacity.`;
    if (family === "Disabled") return "Text and icons of disabled controls (label, value, slot icons). Not a quieter text colour: use Neutral/Base or Light for secondary text.";
    if (family === "Placeholder") return "Placeholder text in empty fields: an example or the format, never the label.";
    if (family === "Hyperlink") return `Link text ${last === "Visited" ? "after the link was visited" : state(last)}.`;
    if (family === "On-Accent") return `Text and icons on Accent Solid fills (Primary and Accent buttons, selected marks), ${state(last)}.`;
    if (family === "On-Colors") return "Text and icons on Solid colour fills (Solid Badges, Avatars and Dock-Icons). Set by the component's variant; never painted by hand.";
    if (family === "On-Brights") return "Text and icons on bright Solid fills (Yellow, Sky, Mint, Golden), where white would be too faint.";
    if (family === "Inverse") return `Text and icons on Inverse surfaces (tooltips, inverse buttons), ${(NEUTRAL_ROLE[last] || last).split(":")[0]}.`;
    if (family === "On-Black-Overlay" || family === "On-White-Overlay") return `Text and icons on a ${family.includes("Black") ? "Black" : "White"} Overlay fill over imagery and media, ${(NEUTRAL_ROLE[last] || last.toLowerCase()).split(":")[0]}.`;
    if (family === "Support") {
      const [colour, level] = rest;
      if (level === "Light") return LIGHTS.includes(colour) ? `Support ${colour}, light step: icons and marks only. ${colour} is too light for text at this level; use Base or Strongest.` : `Support ${colour} highlight, used sparingly: short text or icons that must stand out (a category mark, a highlighted keyword). Not for body copy.`;
      return `Support ${colour} text and icons (${level === "Strongest" ? "primary" : "secondary"} level) on its Support/${colour}/Subtle background: categorical labels, tags and avatars.`;
    }
    if (FAMILY[family]) {
      if (last === "Light") return `${FAMILY[family]} highlight, used sparingly: status icons, help or error text under a field, a condition (Expires in 5 days), a ± delta, a highlighted keyword. Not for body copy.`;
      return `${FAMILY[family]} text and icons, ${last === "Strongest" ? "primary" : "secondary"} level, as regular text on the ${family} Subtle background (subtle Badge, Tag, Alert, callout).`;
    }
  }

  if (group === "Background") {
    const LAYER = {
      "Canvas/Default": "Layer 1, the page: the default page colour (light grey in light mode). Boxes on it are Surface/Default with no border and no shadow unless a rule asks for one (the Zen default pairing); a screen with a shadowed Sidebar takes Shadow cards.",
      "Canvas/Alt": "Layer 1, a white page. A Surface/Default box on it is the same colour, so it needs a closed border (Pale if static, Subtle if actionable) or a Surface/Alt fill; a shadow alone does not count.",
      "Canvas/Flat": "Layer 1 for flat designs: pair it with Surface/Flat top and bottom navigation so bar and page read as one in both modes.",
      "Surface/Default": "Layer 2: cards, panels, Sidebars and List-Boxes on the Canvas (white in light mode). On Canvas/Alt it needs a border.",
      "Surface/Alt": "Layer 2, the softer surface: cards on a white page, the background of grouped-list phone screens. Never casts a drop shadow.",
      "Surface/Flat": "Layer 2 for top and bottom navigation on a Canvas/Flat page, and the On-Container theme of Cards and List-Boxes inside a Modal, Side-Panel or Bottom-Sheet. Not for cards on the page.",
      "Surface/Glass": "Glass surface for navigation over rich content (Liquid Glass).",
      "Surface/Default-Bluring-End": "The transparent end of a blurring top bar's fade over scrolling content, on Surface/Default screens.",
      "Surface/Alt-Bluring-End": "The transparent end of a blurring top bar's fade over scrolling content, on Surface/Alt screens.",
      "Surface/Hover": "Fill of a clickable surface on hover.",
      "Surface/Pressed": "Fill of a clickable surface while pressed.",
      Container: "Layer 4: the panel fill of Modal/Dialog, Modal/Forms, Side-Panel and Bottom-Sheet only. Cards and List-Boxes inside take Theme=On-Container.",
      "Popover/Default": "Layer 5, the top layer: popovers, menus, tooltips, pickers, flyouts and toasts. Never for content in the page flow.",
      "Popover/Overlay": "Dark translucent popover fill for overlays on media and imagery.",
      Overlay: "The scrim behind modals, side panels and sheets (the Overlay component).",
      Carved: "A recessed fill for wells and tracks carved into a surface.",
    };
    const key = [family, ...rest].join("/");
    if (LAYER[key]) return LAYER[key];
    if (family === "Active") return `Fill of a selected item (${rest[0]} ${rest[1].toLowerCase()}): selected rows, options and segments.`;
    if (/-Disabled$/.test(family)) return `Fill of a disabled ${family.replace("-Disabled", "")} control (it keeps its shape; the text goes Content/Disabled).`;
    if (["White-Solid", "Black-Solid", "White-Overlay", "Black-Overlay"].includes(family)) return `${family.replace("-", " ").replace("Solid", "solid").replace("Overlay", "overlay")} fill ${state(last)}, for controls over imagery and media (Overlay buttons).`;
    if (family === "Liquid-Glass") return `Liquid Glass fill (${rest[0].replace("-", " ")}) ${state(rest[1])}, for glass navigation and actions over rich content.`;
    if (family === "Support") {
      const [colour, level] = rest;
      const LEVEL = { Solid: "high emphasis: Solid avatars, dock icons and badges, with On-Colors text", Subtle: "a tint behind Support text (Strongest or Base): subtle tags, badges and avatars; no drop shadow", Soft: "a mid step: chart areas and heatmap cells", Deep: "the darkest step: chart and heatmap highs, deep fills", Pale: "the faintest tint: backgrounds of large areas and chart lows; no drop shadow" };
      return `Support ${colour} fill, ${LEVEL[level] || level.toLowerCase()}. Support colours are categorical (people, categories, chart series), not statuses.`;
    }
    if (FAMILY[family] && rest.length === 2) {
      const [style, st] = rest;
      const STYLE = {
        Solid: "Solid is the strongest fill of the family, for high-emphasis elements (solid buttons, badges and marks); text on it uses the On-* content colours.",
        Subtle: "Subtle is a tinted fill for subtle badges, tags, chips, alerts and callouts; text on it is the family's Strongest or Base; never with a drop shadow.",
        Flat: "Flat is transparent at rest and tinted on hover and press: flat buttons and rows without a frame.",
        Ghost: "Ghost is an opaque surface at rest, tinted on hover and press: controls that must cover what is behind them.",
        Pale: "Pale is the faintest tint, for static wells, previews and pale panels; never with a drop shadow.",
      };
      return `${FAMILY[family]} ${style} fill, ${state(st)}. ${STYLE[style] || ""}`.trim();
    }
  }

  if (group === "Border") {
    const st = rest[rest.length - 1];
    if (family === "Neutral") {
      if (rest[0] === "Subtle") return `Border of actionable containers ${state(st)}: buttons, chips, tags, fields (Read-only too), clickable cards and rows, drop zones. Dashed lines step up to Subtle.`;
      if (rest[0] === "Pale") return st === "Default" ? "Border of static containers that only group or frame content (cards, panels, callouts), and the default Divider. Never on something people can act on." : `Pale border ${state(st)}, only where a component defines it; a static container's border never reacts to hover.`;
      return `Strong neutral border ${state(st)}: Divider High and emphasis lines.`;
    }
    if (family === "Disabled") return "Border of disabled actionable containers (fields, chips, buttons); not Pale.";
    if (family === "Active") return `Border of a selected item (${rest[0]} ${rest[1].toLowerCase()}): selected cards, options and marks.`;
    if (family === "Popover") return `Border of popovers, menus and pickers (layer 5), ${rest[0].toLowerCase()}.`;
    if (family === "Container") return `Border of Modal, Side-Panel and Bottom-Sheet panels (layer 4), ${rest[0].toLowerCase()}.`;
    if (family === "Inverse") return "Border on Inverse surfaces.";
    if (family === "Overlay") return `Border of controls over imagery and media, ${rest[0].toLowerCase()} ${state(st)}.`;
    if (family === "Support") return `Support ${rest[0]} border, ${rest[1] === "Subtle" ? "around Support Subtle fills" : "for emphasis"}: categorical tags, avatars and chart marks.`;
    if (FAMILY[family]) return `${FAMILY[family]} border, ${rest[0].toLowerCase()}, ${state(st)}: ${rest[0] === "Subtle" ? "the stroke around the family's Subtle fills" : "emphasis strokes of the family"}.`;
  }

  if (group === "Focus") {
    if (family === "Accent") return last === "Solid" ? "The keyboard focus ring (3px) of controls. Never removed without a replacement ring." : "The soft focus ring of fields and editable table cells.";
    return last === "Solid" ? "Neutral focus ring; also the dashes of a focused Read-only field." : "Soft neutral focus ring.";
  }
  if (group === "Shadow") return `Shadow colour (${last.toLowerCase()}) used by the Zen effect styles${family === "Inverse" ? "; it turns light in dark mode" : ""}. Apply an effect style (Shadow/Bottom|Top/Level-1…4), never this colour directly.`;
  return keep(null);
}

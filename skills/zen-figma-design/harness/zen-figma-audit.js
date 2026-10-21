// Zen Figma audit — the harness for screens built in a Zen Figma file. Read-only: it never changes the file.
//
// Run it through the Figma MCP `use_figma` tool (the whole file as `code`), after every screen, before the next one:
//   1. Put the screens to check in ROOT_IDS ("123:456", the node-id of a URL with "-" → ":"), or leave it empty to
//      check the current selection.
//   2. Fix every `error`, then look at each `warning` and fix it or say why it stays.
//   3. Run it again until `errors` is 0, then take a screenshot and review it against the Zen screen rules.
//
// It checks only what the designer (or the agent) authored: a Zen instance owns its own paints, text styles, spacing
// and layout, so the inside of an instance is checked only for overrides and for text that is crushed or sticks out.
// What sits in an instance's SLOT (a page pattern's Content, a header's Sections) is authored and checked in full.
// Rules (ids are stable; the skill's references/audit-rules.md says how to fix each one):
//   paint/unbound            error    a solid fill or stroke with no Zen colour variable and no style
//   paint/gradient-no-style  warning  a gradient with no style
//   instance/paint-override  error    a fill or stroke painted inside a Zen instance with a raw colour
//   instance/colour-changed  warning  a fill or stroke inside an instance bound to another variable than the
//                                     component's own (the icon colour lost after an icon swap, a repainted part)
//   text/no-style            error    text with no Zen text style (or a mixed one)
//   spacing/unbound          error    an auto-layout gap or padding with no Spacing/Gap or Spacing/Padding variable
//   radius/unbound           error    a corner radius with no Corner-Radius variable
//   radius/concentric        warning  a filled layer in a rounded box's corner whose radius is not the outer radius
//                                     minus the padding (a pill item in a vertical capsule must be square)
//   effect/no-style          error    a shadow or blur with no Zen effect style
//   layout/absolute          warning  a frame with 2+ children and no auto layout
//   layout/row-drift         warning  side-by-side columns of equal rows end a row at different heights (grid lines drift)
//   shape/loose              warning  a hand-drawn shape outside any component (use a Zen component or a local one)
//   component/detached       warning  a frame named like a Zen component that is not an instance (detached)
//   bounds/overflow          error    a layer sticking out of its parent (also when the parent does not clip; a centred
//                                     button bleeding out of a non-clipping icon-size wrapper, and a Large Indicator
//                                     Tab-Bar spilling evenly out of a header row, are Zen's design)
//   bounds/clipped           error    a layer cut off by a clipping parent
//   bounds/stroke-clip-gap   warning  a clipping frame with an inside stroke and a radius over a filled child that reaches
//                                     a corner: Figma clips the child 1px in with the outer radius, a gap shows at the corner
//   bounds/shadow-clipped    error    a drop shadow (also one inside an instance, like a Shadow card's) cut by a
//                                     clipping frame of the screen: frames made with createFrame/createAutoLayout clip
//   bounds/shadow-clipped-in-component  warning  the same, cut by a frame of the component itself
//   text/overflow            error    text taller than its fixed box, or sticking out of its instance
//   text/crushed             error    text squeezed into a box narrower than a few characters
//   text/shifted             error    left-aligned text with a fixed width, narrower than a centred or end-aligned
//                                     column, pushed in from its edge (a slot's default text kept after a resize)
//   copy/placeholder         warning  lorem ipsum or a bare default label left in the screen
//   list-box/footer-text-action  error  a List-Box footer action ("Open calendar", "Go to Inbox") written as text, not
//                                     a Button/Main Tertiary (fills the box on desktop and tablet, hugs on mobile)
//   list-box/footer-action-hug   error  a List-Box footer Button that hugs its label on a desktop or tablet screen
//                                     (wider than 600px): it fills the box there and hugs only on mobile
//   theme/box-on-canvas      error    a box (Card, List-Box) whose fill does not belong to the
//                                     page's Canvas: Default → Surface/Default (Flat, Shadow, Border) or, for colour,
//                                     Subtle (a Pale box fades into the grey: user rule 2026-10-17); Alt → Pale,
//                                     Surface/Default with a Pale border, Surface/Alt; Flat → Pale, Surface/Flat with a
//                                     Pale border. No gradient box (Semi-Pale, Gradient): one box per row stands out
//                                     with Solid (or Subtle on a white page)
//   theme/navigation-surface error    a header, Sidebar or top/bottom bar that does not match the Canvas (no fill, or
//                                     the Surface of the Canvas's colour); only on Canvas/Default may the Sidebar or the
//                                     Bottom-Navigation be a Surface/Default panel; a floating bar's own scrim passes
//   theme/mixed-elevation    error    a shadow on a Canvas/Alt or Canvas/Flat screen, or on Canvas/Default some of the
//                                     Sidebar, bars and boxes cast one and others do not
//   theme/mixed-boxes        warning  one screen mixes box families (Flat, Border, Pale, Subtle)
//   theme/mode-override      error    a layer inside the screen (a component, card or frame) sets its own Light/Dark
//                                     colour mode: only the screen frame does; a dark widget is Card Solid/Neutral
//   theme/on-white-solid     error    text or an icon on a Background/White-Solid fill (white in Light and Dark mode)
//                                     that is not Content/On-White-Overlay/*: Neutral and Inverse flip with the mode
//   theme/on-solid-content   error    content on a Solid fill outside the fill's family: Neutral/Solid → Content/Inverse
//                                     (Dock-Icon, Badge, Metric-Tile, Metric-Trend Inverse); Accent/Solid →
//                                     Content/On-Accent (Metric-Tile On-Accent); Yellow, Sky, Mint, Golden, Warning →
//                                     Content/On-Brights (Metric-Tile On-Bright); any other Support, Positive, Negative, Info solid →
//                                     Content/On-Colors (Metric-Tile On-Color); chips on a colour solid are On-Color
//   badge/count-uses-counter error    a Badge whose label is a number (a count): counts are Badge-Counter, the round pill
//   navigation/back-chevron  error    a left arrow (icon-arrow-left-*, icon-arrow-narrow-left-*) as Back in a Top-Navigation,
//                                     Nav-Action or Button on a phone or tablet screen: Back is icon-chevron-left-line-medium
//   button/one-primary       error    two Primary Button/Main or Icon-Main side by side (one parent); warning when a screen
//                                     has more than one Primary elsewhere (one main CTA per screen, the rest Tertiary)
//   button/secondary-justified  warning  a Secondary Button/Main or Icon-Main: rare, a pressed toggle that stays on
//   button/accent-is-promoted   warning  an Accent Button/Main or Icon-Main: only a promoted CTA (onboarding, upsell)
//   button/small-full-width  error    a Small / XSmall / 2XSmall text button stretched to Fill: small buttons hug
//   button/overlay-on-imagery   warning  a Button/Main or Icon-Main on a photo: buttons on imagery are Overlay
//   button/in-card-flat      error    a Button/Icon-Main with the ⋮/⋯ icon inside a card: the card's more menu is Icon-Flat
//   button/in-card-wrapper   warning  the card's flat ⋮/⋯ outside an Element-Size/Popular/Base Wrapper (bleed)
//   spacing/control-gap      error    a button closer than Gap/XSmall (8) to the text or button beside it
//   button/vague-label       warning  a button labelled OK, Yes, Submit or Click here
//   touch/target-spacing     error    on a phone or tablet, two controls closer than their 44px hit areas allow: the
//                                     gap is at least what each control lacks of 44 on that side (two 32px Chips → 12)
//   spacing/controls-to-content  warning  a control row (Chips, Segmented, Tabs, Search) closer than Gap/Medium (16)
//                                     to the content it controls: they are blocks, not a label pair
//   navigation/icon-style    error    a Bottom-Navigation item whose icon style does not match its selection: the
//                                     selected item shows the solid icon, every other item the line icon
//   navigation/floating-fit  error    a Floating or Floating-Glass Bottom-Navigation whose tabs leave the 64–88 range:
//                                     the capsule fills while tabs fit at 88 or less, then hugs with Fixed 88 tabs
//   navigation/status-in-bar error    a status bar placed above a Top-Navigation whose own Status-bar is hidden (it
//                                     sits on a band of its own): swap the bar's Status-bar to the device's and show it
//   empty-state/size-by-container  error/warning  an Empty State whose Size does not fit where it sits: Medium (240)
//                                     fills an empty page, Small (200) a region (card, table, pane, panel, sheet, dialog)
//   navigation/collapse-beside-master-crumb  error  the header's sidebar toggle beside a Breadcrumbs Master item (two
//                                     icons in a row): a Sub first crumb, or the toggle in the sidebar (Collapse=Sidebar)
//   spacing/section-gap      error    a screen's section stack (its Body, or a page pattern's Content slot) not spaced
//                                     by Layout-Mobile/Section-Gap on a phone (Compact 24, Comfortable 32) or
//                                     Spacing/Gap/XLarge (32) on desktop
//   section/title-apart      warning  a title row on its own in the section stack, a section gap away from its content
//   list-box/closing-list-on-phone  error  a List-Box that closes a phone screen (the last section, not in a row or grid
//                                     of widgets, not one of several grouped List-Boxes): an open section as ◆ Finance
// Content that runs on past the far end of a frame set to scroll (Figma prototype overflow: a long Body, a Chip row)
// is scroll content, not bounds/clipped.

const ROOT_IDS = [];
const MAX_PER_RULE = 25;
const TOLERANCE = 1;
const INK_TOLERANCE = 3; // glyphs (emoji, accents) may reach a little past their box

const ERROR = "error";
const WARNING = "warning";
const findings = [];
const counts = {};
const severityOf = {};
const seen = new Set();

function report(rule, severity, node, detail) {
  const key = `${rule}|${node.id}|${detail ?? ""}`;
  if (seen.has(key)) return;
  seen.add(key);
  counts[rule] = (counts[rule] ?? 0) + 1;
  severityOf[rule] = severity;
  if (counts[rule] > MAX_PER_RULE) return;
  findings.push({ rule, severity, id: node.id, name: node.name, path: pathOf(node), ...(detail ? { detail } : {}) });
}

let rootIds = new Set();
function pathOf(node) {
  const names = [];
  let current = node.parent;
  while (current && current.type !== "PAGE" && names.length < 6) {
    names.unshift(current.name);
    if (rootIds.has(current.id)) break;
    current = current.parent;
  }
  return names.join(" › ");
}

const isMixed = (value) => value === figma.mixed;
const visiblePaints = (paints) => (Array.isArray(paints) ? paints.filter((paint) => paint.visible !== false) : []);
const box = (node) => node.absoluteBoundingBox;

function hex(paint) {
  const c = paint.color;
  const to = (v) => Math.round(v * 255).toString(16).padStart(2, "0");
  return `#${to(c.r)}${to(c.g)}${to(c.b)}${paint.opacity !== undefined && paint.opacity < 1 ? ` ${Math.round(paint.opacity * 100)}%` : ""}`;
}

/** Paints of `key` that carry neither a variable nor a style. */
function unboundPaints(node, key) {
  const styleId = key === "fills" ? node.fillStyleId : node.strokeStyleId;
  if (styleId && !isMixed(styleId)) return [];
  return visiblePaints(node[key]).filter((paint) => paint.type === "SOLID" && !(paint.boundVariables && paint.boundVariables.color));
}

function checkPaints(node) {
  for (const key of ["fills", "strokes"]) {
    if (!(key in node)) continue;
    if (key === "strokes" && (!node.strokes.length || node.strokeWeight === 0)) continue;
    if (isMixed(node[key]) && node.type === "TEXT") {
      for (const segment of node.getStyledTextSegments(["fills", "fillStyleId"])) {
        if (segment.fillStyleId) continue;
        const raw = visiblePaints(segment.fills).filter((paint) => paint.type === "SOLID" && !(paint.boundVariables && paint.boundVariables.color));
        if (raw.length) report("paint/unbound", ERROR, node, `text colour ${hex(raw[0])} on “${segment.characters.slice(0, 24)}”`);
      }
      continue;
    }
    const raw = unboundPaints(node, key);
    if (raw.length) report("paint/unbound", ERROR, node, `${key === "fills" ? "fill" : "stroke"} ${hex(raw[0])}`);
    const styleId = key === "fills" ? node.fillStyleId : node.strokeStyleId;
    if (!styleId && visiblePaints(node[key]).some((paint) => paint.type.startsWith("GRADIENT"))) report("paint/gradient-no-style", WARNING, node, key);
  }
}

function checkTextStyle(node) {
  const styleId = node.textStyleId;
  if (isMixed(styleId)) {
    const bare = node.getStyledTextSegments(["textStyleId"]).filter((segment) => !segment.textStyleId);
    if (bare.length) report("text/no-style", ERROR, node, `“${bare[0].characters.slice(0, 24)}” has no text style`);
  } else if (!styleId) {
    report("text/no-style", ERROR, node, `${isMixed(node.fontSize) ? "mixed" : node.fontSize}px “${node.characters.slice(0, 24)}”`);
  }
}

function checkSpacing(node) {
  if (!("layoutMode" in node) || node.layoutMode === "NONE") return;
  const bound = node.boundVariables ?? {};
  const fields = ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft"];
  const shown = node.children.filter((child) => child.visible && child.layoutPositioning !== "ABSOLUTE").length;
  if (node.primaryAxisAlignItems !== "SPACE_BETWEEN" && shown >= 2) fields.unshift("itemSpacing");
  if (node.layoutWrap === "WRAP" && node.counterAxisSpacing) fields.push("counterAxisSpacing");
  const raw = fields.filter((field) => typeof node[field] === "number" && node[field] > 0 && !bound[field]);
  if (raw.length) report("spacing/unbound", ERROR, node, raw.map((field) => `${field} ${node[field]}`).join(", "));
}

function checkRadius(node) {
  if (!("cornerRadius" in node) || node.type === "TEXT") return;
  const bound = node.boundVariables ?? {};
  const corners = ["topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius"];
  const raw = corners.filter((corner) => typeof node[corner] === "number" && node[corner] > 0 && !bound[corner]);
  if (raw.length) report("radius/unbound", ERROR, node, `${node[raw[0]]}px${raw.length < 4 ? ` (${raw.join(", ")})` : ""}`);
}

// A rounded box and the filled layer in its corner must share one centre: the inner radius is the outer radius minus
// the padding between them. A pill (radius ≥ half the side) counts as half its short side, so a wide item in a narrow
// vertical capsule shows an oval in a circle (user 2026-10-18, iPhone Duo tab strip: "Bug bo góc trong ngoài").
function effectiveRadius(node, corner) {
  const radius = typeof node[corner] === "number" ? node[corner] : (isMixed(node.cornerRadius) ? 0 : node.cornerRadius ?? 0);
  return Math.min(radius, node.width / 2, node.height / 2);
}
/** A layer that paints a box of its own: a frame, shape or instance with a fill or a stroke (not a glyph or text). */
function drawsBox(node) {
  if (node.type === "TEXT" || node.type === "VECTOR" || node.type === "BOOLEAN_OPERATION" || node.type === "LINE") return false;
  const fill = "fills" in node && !isMixed(node.fills) && visiblePaints(node.fills).length > 0;
  const stroke = "strokes" in node && visiblePaints(node.strokes).length > 0 && typeof node.strokeWeight === "number" && node.strokeWeight > 0;
  return fill || stroke;
}
function cornerLayers(frame) {
  const out = [];
  const visit = (node) => {
    for (const child of node.children ?? []) {
      if (!child.visible || child.layoutPositioning === "ABSOLUTE") continue;
      const filled = drawsBox(child);
      const padded = "paddingTop" in child && (child.paddingTop || child.paddingRight || child.paddingBottom || child.paddingLeft);
      // An instance counts when it draws a box (its own fill or a filled frame inside, as a pill item): an icon does not.
      const boxed = child.type === "INSTANCE" && (filled || (child.children ?? []).some((inner) => (inner.type === "FRAME" || inner.type === "RECTANGLE") && inner.visible && drawsBox(inner)));
      if (filled || boxed) out.push(child);
      else if ((child.type === "FRAME" || child.type === "SLOT") && !padded) visit(child);
    }
  };
  visit(frame);
  return out;
}
// A section of screens or a component set of screen variants (an AppShell pattern): each child is a screen, checked on
// its own, and its edge is the device's (a shadow cut there is cut by the window, not by a frame).
const isScreenGroup = (node) => node.type === "SECTION" || node.type === "COMPONENT_SET";
const screensOf = (root) => (isScreenGroup(root) ? root.children.filter((child) => "findAll" in child) : [root]);
function checkConcentric(node) {
  if (node.type === "COMPONENT_SET" || !("cornerRadius" in node) || !("children" in node) || node.layoutMode === "NONE") return;
  if (!visiblePaints(node.fills).length && !visiblePaints(node.strokes).length) return;
  const frame = box(node);
  if (!frame) return;
  const corners = [
    ["topLeftRadius", "paddingTop", "paddingLeft", (b) => [b.x, b.y], (f, p) => [f.x + p.l, f.y + p.t]],
    ["topRightRadius", "paddingTop", "paddingRight", (b) => [b.x + b.width, b.y], (f, p) => [f.x + f.width - p.r, f.y + p.t]],
    ["bottomLeftRadius", "paddingBottom", "paddingLeft", (b) => [b.x, b.y + b.height], (f, p) => [f.x + p.l, f.y + f.height - p.b]],
    ["bottomRightRadius", "paddingBottom", "paddingRight", (b) => [b.x + b.width, b.y + b.height], (f, p) => [f.x + f.width - p.r, f.y + f.height - p.b]],
  ];
  const pads = { t: node.paddingTop, r: node.paddingRight, b: node.paddingBottom, l: node.paddingLeft };
  for (const layer of cornerLayers(node)) {
    const own = box(layer);
    if (!own) continue;
    for (const [corner, padA, padB, at, inner] of corners) {
      const outer = effectiveRadius(node, corner);
      const gapToEdge = Math.min(node[padA], node[padB]);
      if (outer <= 0 || node[padA] !== node[padB]) continue;
      const [lx, ly] = at(own), [ix, iy] = inner(frame, pads);
      if (Math.abs(lx - ix) > TOLERANCE || Math.abs(ly - iy) > TOLERANCE) continue;
      const expected = Math.max(0, outer - gapToEdge), actual = effectiveRadius(layer, corner);
      if (Math.abs(actual - expected) > TOLERANCE) {
        report("radius/concentric", WARNING, layer, `corner ${Math.round(actual)} inside ${node.name}'s ${Math.round(outer)} with ${gapToEdge} padding: make it ${Math.round(expected)} (outer radius minus padding; a pill item in a vertical capsule must be square)`);
        return;
      }
    }
  }
}

function checkEffects(node) {
  if (!("effects" in node)) return;
  const effects = node.effects.filter((effect) => effect.visible !== false);
  if (effects.length && !node.effectStyleId) report("effect/no-style", ERROR, node, effects.map((effect) => effect.type).join(", "));
}

const SHAPES = new Set(["RECTANGLE", "ELLIPSE", "POLYGON", "STAR", "VECTOR", "LINE", "BOOLEAN_OPERATION"]);
// A detached instance keeps its set's name ("Button/Main"); a frame named Table or Chart/… is Zen's own composition.
const ZEN_COMPONENT_NAME = /^(Button|Chip|Input|Badge|Tag|Avatar|Toggle|Checkbox|Radio-Button|Segmented|Dock-Icon|Tooltip|Toast|Inline-Message|Alert-Banner|Pagination|Breadcrumbs|Stepper|Slider|Divider|Menu-Item|Rating|Accordion|Skeleton|List-Item|Card)\//;

function checkAuthoredShape(node) {
  if (SHAPES.has(node.type)) {
    const image = visiblePaints(node.fills).some((paint) => paint.type === "IMAGE");
    if (!image) report("shape/loose", WARNING, node, node.type.toLowerCase());
  }
  if (node.type === "FRAME" && ZEN_COMPONENT_NAME.test(node.name)) report("component/detached", WARNING, node, "named like a Zen component but not an instance");
  if ((node.type === "FRAME" || node.type === "COMPONENT") && node.layoutMode === "NONE" && "children" in node) {
    const shown = node.children.filter((child) => child.visible);
    if (shown.length >= 2) report("layout/absolute", WARNING, node, `${shown.length} children positioned by hand`);
  }
}

const sticksOut = (inner, outer, tolerance = TOLERANCE) => inner && outer && (inner.x < outer.x - tolerance || inner.y < outer.y - tolerance
  || inner.x + inner.width > outer.x + outer.width + tolerance || inner.y + inner.height > outer.y + outer.height + tolerance);

function side(inner, outer, tolerance = TOLERANCE) {
  const parts = [];
  if (inner.x < outer.x - tolerance) parts.push(`left ${Math.round(outer.x - inner.x)}px`);
  if (inner.y < outer.y - tolerance) parts.push(`top ${Math.round(outer.y - inner.y)}px`);
  if (inner.x + inner.width > outer.x + outer.width + tolerance) parts.push(`right ${Math.round(inner.x + inner.width - outer.x - outer.width)}px`);
  if (inner.y + inner.height > outer.y + outer.height + tolerance) parts.push(`bottom ${Math.round(inner.y + inner.height - outer.y - outer.height)}px`);
  return parts.join(", ");
}

/**
 * Zen's bleed: a fixed icon-size wrapper that does not clip holds one larger button, centred, so the layout keeps the
 * icon's size and the hover plate spills out evenly (Sidebar Collapse: Button Small 32 in a 20 Wrapper, −6 each side;
 * AppShell toggle and flat actions). Deliberate, so not an overflow.
 */
function isBleed(node, own, frame) {
  const parent = node.parent;
  if (parent.clipsContent || node.type !== "INSTANCE" || parent.children.filter((child) => child.visible).length !== 1) return false;
  const spill = [frame.x - own.x, frame.y - own.y, own.x + own.width - frame.x - frame.width, own.y + own.height - frame.y - frame.height];
  return spill.every((value) => value > TOLERANCE && Math.abs(value - spill[0]) <= TOLERANCE);
}

/**
 * A Large Indicator Tab-Bar (64) in a header row (40) spills evenly above and below the row: its indicator sits on the
 * header's bottom border (tabs.css "the indicator sits on the bar's bottom border"; Master-Layout B3), so the row keeps
 * its height. Deliberate, so not an overflow.
 */
function isTabBleed(node, own, frame) {
  const above = frame.y - own.y, below = own.y + own.height - frame.y - frame.height;
  if (above <= TOLERANCE || Math.abs(above - below) > TOLERANCE || own.x < frame.x - TOLERANCE || own.x + own.width > frame.x + frame.width + TOLERANCE) return false;
  const tabs = node.type === "INSTANCE" ? [node] : "findAll" in node ? node.findAll((child) => child.type === "INSTANCE" && child.name === "Tab-Bar") : [];
  return tabs.some((tab) => tab.name === "Tab-Bar" && tab.variantProperties?.Style === "Indicator" && Math.abs(tab.height - own.height) <= TOLERANCE);
}

/**
 * Scroll content: a clipping frame set to scroll (Figma prototype overflow) shows the rest of its content when the
 * user scrolls, so a layer that runs on only past its far end (bottom for Vertical, right for Horizontal) is not cut.
 * A phone screen whose Body is longer than 844, or a Chip row wider than the screen, scrolls this way; so does the
 * Content of a Pattern/AppShell, whose Body (or Sheet) is set to scroll vertically in the component.
 */
function scrollsPast(node, own, frame, tolerance) {
  if (runsOnInScroll(node.parent, own, frame, tolerance)) return true;
  if (node.parent.clipsContent) return false;
  // A parent that does not clip inside a scroll area runs on with it (user 2026-10-18): a page pattern's Content slot
  // in the AppShell Body, which scrolls. The nearest clipping ancestor decides.
  for (let ancestor = node.parent.parent; ancestor && ancestor.type !== "PAGE" && ancestor.type !== "SECTION"; ancestor = ancestor.parent) {
    if ("clipsContent" in ancestor && ancestor.clipsContent) return runsOnInScroll(ancestor, own, frame, tolerance);
  }
  return false;
}
function runsOnInScroll(clipper, own, frame, tolerance = TOLERANCE) {
  const direction = clipper.overflowDirection;
  if (!clipper.clipsContent || !direction || direction === "NONE") return false;
  if (own.x < frame.x - tolerance || own.y < frame.y - tolerance) return false;
  const right = own.x + own.width > frame.x + frame.width + tolerance;
  const bottom = own.y + own.height > frame.y + frame.height + tolerance;
  if (right && !(direction === "HORIZONTAL" || direction === "BOTH")) return false;
  if (bottom && !(direction === "VERTICAL" || direction === "BOTH")) return false;
  return true;
}

/** A layer that sticks out of its frame-like parent; `clipped` when the parent clips it. */
function checkBounds(node) {
  const parent = node.parent;
  if (!parent || parent.type === "PAGE" || parent.type === "SECTION" || parent.type === "GROUP" || parent.type === "BOOLEAN_OPERATION") return;
  if (!("clipsContent" in parent)) return;
  // Text is measured by its ink: a line box taller than a fixed row is not an overflow, glyphs past the edge are.
  const own = node.type === "TEXT" ? node.absoluteRenderBounds : box(node);
  const tolerance = node.type === "TEXT" ? INK_TOLERANCE : TOLERANCE;
  const frame = box(parent);
  if (!own || !frame) return;
  if (sticksOut(own, frame, tolerance)) {
    if (isBleed(node, own, frame) || isTabBleed(node, own, frame) || scrollsPast(node, own, frame, tolerance)) return;
    report(parent.clipsContent ? "bounds/clipped" : "bounds/overflow", ERROR, node, `${side(own, frame, tolerance)} past ${parent.name}`);
    return;
  }
}

/**
 * A clipping frame with an INSIDE stroke clips its children inside the stroke but keeps the outer corner radius, so a
 * filled child that reaches a corner leaves a hairline gap between the stroke and the fill there (a colour swatch, a
 * slider fill). Fix: the fill on the stroked frame itself, or the border as a top layer with the same radius.
 */
function checkStrokeClip(node) {
  if (!("clipsContent" in node) || !node.clipsContent || !("children" in node) || node.strokeAlign !== "INSIDE") return;
  if (!visiblePaints(node.strokes).length) return;
  const weight = isMixed(node.strokeWeight) ? Math.max(node.strokeTopWeight ?? 0, node.strokeRightWeight ?? 0, node.strokeBottomWeight ?? 0, node.strokeLeftWeight ?? 0) : node.strokeWeight;
  const radius = isMixed(node.cornerRadius) ? Math.max(node.topLeftRadius ?? 0, node.topRightRadius ?? 0, node.bottomRightRadius ?? 0, node.bottomLeftRadius ?? 0) : node.cornerRadius;
  const frame = box(node);
  if (!weight || !radius || !frame) return;
  for (const child of node.children) {
    if (!child.visible || !("fills" in child) || isMixed(child.fills) || !visiblePaints(child.fills).length) continue;
    const own = box(child);
    if (!own) continue;
    const left = own.x <= frame.x + TOLERANCE, right = own.x + own.width >= frame.x + frame.width - TOLERANCE;
    const top = own.y <= frame.y + TOLERANCE, bottom = own.y + own.height >= frame.y + frame.height - TOLERANCE;
    if ((left || right) && (top || bottom)) {
      report("bounds/stroke-clip-gap", WARNING, node, `${child.name} reaches a corner under a ${weight}px inside stroke with radius ${radius}: put the fill on this frame or draw the border as a top layer`);
      return;
    }
  }
}

/** Where a layer's drop shadows reach, from the effects themselves: absoluteRenderBounds is already cut by its clipping parents. */
function shadowBounds(node) {
  const own = box(node);
  const shadows = "effects" in node ? node.effects.filter((effect) => effect.visible !== false && effect.type === "DROP_SHADOW") : [];
  if (!own || !shadows.length) return null;
  let left = own.x, top = own.y, right = own.x + own.width, bottom = own.y + own.height;
  for (const shadow of shadows) {
    const reach = (shadow.radius ?? 0) + (shadow.spread ?? 0);
    left = Math.min(left, own.x + shadow.offset.x - reach);
    top = Math.min(top, own.y + shadow.offset.y - reach);
    right = Math.max(right, own.x + own.width + shadow.offset.x + reach);
    bottom = Math.max(bottom, own.y + own.height + shadow.offset.y + reach);
  }
  return { x: left, y: top, width: right - left, height: bottom - top };
}

/** True when `node` is the screen's own (a frame you made, or anything in a slot), false when a component owns it. */
function authored(node) {
  if (node.type === "INSTANCE") return false;
  for (let current = node.parent; current && !rootIds.has(current.id); current = current.parent) {
    if (current.type === "SLOT") return true;
    if (current.type === "INSTANCE") return false;
  }
  return true;
}

/**
 * Drop shadows cut by any clipping frame above them, inside instances too (a Shadow card's shadow sits on a layer of
 * the Card instance). The screen frame itself is the viewport and does not count. A clipping frame of the screen is an
 * error (createFrame/createAutoLayout frames clip by default: set clipsContent = false); one of a component a warning.
 */
function checkShadowClips(root) {
  const stack = [[root, []]];
  while (stack.length) {
    const [node, clippers] = stack.pop();
    if (!node.visible) continue;
    const shadow = shadowBounds(node);
    if (shadow) {
      for (const clipper of clippers) {
        const frame = box(clipper);
        if (!frame || !sticksOut(shadow, frame)) continue;
        if (runsOnInScroll(clipper, shadow, frame)) break; // scroll content: the rest shows when the frame scrolls
        const cut = `shadow cut on the ${side(shadow, frame)} by ${clipper.name}`;
        if (authored(clipper)) report("bounds/shadow-clipped", ERROR, node, `${cut} (turn its Clip content off or give the shadow room)`);
        else report("bounds/shadow-clipped-in-component", WARNING, node, cut);
        break;
      }
    }
    if (!("children" in node)) continue;
    const screenEdge = node === root || (isScreenGroup(root) && node.parent === root);
    const next = !screenEdge && "clipsContent" in node && node.clipsContent ? [node, ...clippers] : clippers;
    for (const child of node.children) stack.push([child, next]);
  }
}

// ---- Theme pairing (Canvas → Surface, one elevation per screen). Read from the paints actually drawn, so overrides count.
const CANVAS_TWIN = { Default: "Surface/Alt", Alt: "Surface/Default", Flat: "Surface/Flat" }; // same colour in both modes
const OVERLAY = /^(Modal|Side-Panel|Bottom-Sheet|Popover|Dialog|Tooltip)/;
const varNames = new Map();
async function paintVar(paint) {
  const id = paint && paint.boundVariables && paint.boundVariables.color && paint.boundVariables.color.id;
  if (!id) return null;
  if (!varNames.has(id)) varNames.set(id, (await figma.variables.getVariableByIdAsync(id))?.name ?? null);
  return varNames.get(id);
}
const setOf = (node) => { const main = node.mainComponent; return main ? (main.parent && main.parent.type === "COMPONENT_SET" ? main.parent.name : main.name) : ""; };
const dropShadow = (node) => "effects" in node && node.effects.some((effect) => effect.visible !== false && effect.type === "DROP_SHADOW");
/** What a surface node draws: Pale, Subtle, Solid Neutral, Semi-Pale, Gradient, Solid, Surface/<x>, Canvas/<x>, none… */
async function surfaceKind(node) {
  if (typeof node.fillStyleId === "string" && node.fillStyleId) {
    const style = await figma.getStyleByIdAsync(node.fillStyleId);
    if (style && /Semi-Pale/.test(style.name)) return "Semi-Pale";
    if (style && /Gradients\/Card\/Gradient/.test(style.name)) return "Gradient";
  }
  const paints = visiblePaints(node.fills);
  if (!paints.length) return "none";
  if (paints.some((paint) => paint.type.startsWith("GRADIENT"))) return "Gradient";
  const name = await paintVar(paints.find((paint) => paint.type === "SOLID"));
  if (!name) return "raw";
  if (/\/Pale(\/Default)?$/.test(name)) return "Pale";
  const surface = name.match(/Background\/(Surface|Canvas)\/(Default|Alt|Flat)$/);
  if (surface) return `${surface[1]}/${surface[2]}`;
  if (/Support\/[\w-]+\/Subtle$/.test(name)) return "Subtle";
  if (/Background\/Neutral\/Solid\//.test(name)) return "Solid Neutral";
  if (/Solid/.test(name)) return "Solid";
  return name.replace("Color/Background/", "");
}
async function hasBorder(node) {
  const strokes = visiblePaints(node.strokes);
  if (!strokes.length) return false;
  const weights = [node.strokeWeight, node.strokeTopWeight, node.strokeRightWeight, node.strokeBottomWeight, node.strokeLeftWeight];
  if (!weights.some((weight) => typeof weight === "number" && weight > 0)) return false;
  return /Border\/Neutral\/(Pale|Subtle)/.test((await paintVar(strokes[0])) ?? "");
}
async function canvasOf(root) {
  for (const node of [root, ...root.children.slice(0, 3)]) {
    const kind = await surfaceKind(node);
    if (kind.startsWith("Canvas/")) return kind.slice(7);
  }
  return null;
}
async function checkThemePairing(root) {
  for (const screen of isScreenGroup(root) ? screensOf(root) : [root]) await checkThemePairingOf(screen);
}
async function checkThemePairingOf(root) {
  const canvas = await canvasOf(root);
  if (!canvas) return;
  const boxes = []; const bars = []; const families = new Set();
  const stack = [[root, false]];
  while (stack.length) {
    const [node, inOverlay] = stack.pop();
    if (!node.visible) continue;
    const set = node.type === "INSTANCE" ? setOf(node) : "";
    const overlay = inOverlay || OVERLAY.test(set) || OVERLAY.test(node.name);
    if (!overlay && (set === "Card" || set === "Component/List-Box")) boxes.push(node);
    if (node.name === "Component/Side-Bar/Placeholder") bars.push({ node, role: "Sidebar", panel: true });
    if (set === "Header/Dashboard" || set === "Primitives/Dashboard/Header") bars.push({ node, role: "Header", panel: false });
    if (/^Top-Navigation\/Mobile/.test(set)) bars.push({ node, role: "Top-Navigation", panel: false });
    if (/^Bottom-Navigation\/Mobile/.test(set)) bars.push({ node, role: "Bottom-Navigation", panel: true });
    if ("children" in node && !(node.type === "INSTANCE" && set === "Card")) for (const child of node.children) stack.push([child, overlay]);
  }
  const elevated = []; const flat = [];
  for (const box of boxes) {
    const kind = await surfaceKind(box);
    const border = await hasBorder(box);
    const shadow = dropShadow(box);
    (shadow ? elevated : flat).push(box);
    // No gradient box (user, 2026-10-14: "Giữ solid, xoá gradient"): colour is Pale, a stand-out box Solid or Subtle.
    if (kind === "Gradient" || kind === "Semi-Pale") {
      report("theme/box-on-canvas", ERROR, box, `${kind} box: no gradients, colour boxes are Pale (Subtle on Canvas/Default); to stand out use Solid`);
      continue;
    }
    if (kind === "Solid" || kind === "Solid Neutral") continue; // a highlight widget, one per row (Card rules)
    // Subtle is the colour box of Canvas/Default (user rule 2026-10-17); on a white page it is a stand-out widget.
    if (kind === "Subtle" && canvas !== "Default") continue;
    const family = kind === "Pale" || kind === "Subtle" ? kind : border ? "Border" : "Flat";
    families.add(family);
    const allowed = {
      Default: kind === "Surface/Default" || kind === "Subtle",
      Alt: kind === "Pale" || kind === "Surface/Alt" || (kind === "Surface/Default" && border),
      Flat: kind === "Pale" || (kind === "Surface/Flat" && border),
    }[canvas];
    if (!allowed) {
      const fix = { Default: kind === "Pale" ? "Theme=Subtle (Support/<Hue>/Subtle): a Pale box fades into the grey canvas" : "Surface/Default (Theme Flat, Shadow or Border), or Theme=Subtle for colour", Alt: "Pale, Surface=Alt, or Theme=Border on Surface/Default", Flat: "Pale or Theme=Border with Surface=Flat" }[canvas];
      report("theme/box-on-canvas", ERROR, box, `${kind}${border ? " with a border" : ""} on Canvas/${canvas}: use ${fix}`);
    }
  }
  for (const { node, role, panel } of bars) {
    const kind = await surfaceKind(node);
    // A bar that floats over the page (Top-Navigation Liquid-Overlay over a photo, Bottom-Navigation Floating) draws
    // its own scrim gradient: the component's fill, not one the screen painted (Master-Layout C4, D5).
    const ownScrim = kind === "Gradient" && node.type === "INSTANCE" && !(node.overrides ?? []).some((change) => change.id === node.id && change.overriddenFields.includes("fills"));
    const seamless = kind === "none" || kind === `Canvas/${canvas}` || kind === CANVAS_TWIN[canvas] || ownScrim;
    const allowedPanel = panel && canvas === "Default" && kind === "Surface/Default";
    if (!seamless && !allowedPanel) report("theme/navigation-surface", ERROR, node, `${role} is ${kind} on Canvas/${canvas}: match the canvas (no fill or ${CANVAS_TWIN[canvas]})${panel ? "; only on Canvas/Default may it be a Surface/Default panel" : ""}`);
    if (panel && kind !== "none" && !seamless) (dropShadow(node) ? elevated : flat).push(node);
    else if (dropShadow(node)) elevated.push(node);
  }
  if (canvas !== "Default") for (const node of elevated) report("theme/mixed-elevation", ERROR, node, `a shadow on Canvas/${canvas}: nothing on a Canvas/Alt or Canvas/Flat screen casts one`);
  else if (elevated.length && flat.length) for (const node of flat) report("theme/mixed-elevation", ERROR, node, `no shadow while ${elevated.length} other surface(s) on this screen cast Shadow/Bottom/Level-1: all or none`);
  if (families.size > 1) report("theme/mixed-boxes", WARNING, root, `boxes mix ${[...families].join(", ")}: keep one family per screen (colours may vary)`);
}

// Light/Dark is the screen's choice: a layer inside it that sets the colour mode mixes two palettes (user, 2026-10-14).
const colourModeSets = new Map();
async function colourModeSet(collectionId) {
  if (!colourModeSets.has(collectionId)) {
    const collection = await figma.variables.getVariableCollectionByIdAsync(collectionId);
    const names = collection ? collection.modes.map((mode) => mode.name) : [];
    colourModeSets.set(collectionId, names.includes("Light") && names.includes("Dark") ? collection : null);
  }
  return colourModeSets.get(collectionId);
}
async function checkModeOverrides(root) {
  // A section holds screens: each frame in it may pick its mode, the layers inside it may not.
  const screens = isScreenGroup(root) ? root.children : [root];
  const stack = screens.flatMap((screen) => ("children" in screen ? [...screen.children] : []));
  while (stack.length) {
    const node = stack.pop();
    for (const [collectionId, modeId] of Object.entries(node.explicitVariableModes ?? {})) {
      const collection = await colourModeSet(collectionId);
      if (!collection) continue;
      const mode = collection.modes.find((candidate) => candidate.modeId === modeId)?.name ?? modeId;
      report("theme/mode-override", ERROR, node, `sets ${collection.name} = ${mode}: only the screen frame picks Light or Dark; a dark widget is Card Theme=Solid, Color=Neutral (Background/Neutral/Solid + Inverse content)`);
    }
    if ("children" in node) stack.push(...node.children);
  }
}

// A count is a Badge-Counter, never a Badge holding a number (component-usage-rules §18, code harness
// badge/count-uses-counter; user 2026-10-18: "Luôn ghi vào harness và rule là các badge dùng số đếm luôn dùng badge counter").
async function checkBadgeCount(node) {
  const main = await node.getMainComponentAsync();
  const set = main && main.parent && main.parent.type === "COMPONENT_SET" ? main.parent.name : main && main.name;
  if (set !== "Badge") return;
  const label = node.findOne((child) => child.type === "TEXT" && child.visible !== false);
  const text = label ? label.characters.trim() : "";
  if (/^\d+\+?$/.test(text)) report("badge/count-uses-counter", ERROR, node, `Badge shows a count (“${text}”): use Badge-Counter (Size, Theme and Background as this Badge), the round pill whose width starts at its height`);
}

// Back on a phone or tablet is the left chevron, never a left arrow (component-usage-rules §10, code harness
// navigation/back-chevron; user 2026-10-17: "chúng ta có chốt rule về button back. nhưng lúc này build trong figma lại sai").
const LEFT_ARROW_ICON = /^icon-arrow(-narrow)?-left/;
const BACK_HOLDER = /Top-Leading|Leading-Slot|Nav-Action|Top-Navigation|^Button\//;
// Arrows that step through content keep theirs (§10 "Not covered").
const STEPPER = /Date-Picker|Calendar|Pagination|Carousel|Stepper/i;
function shownIn(node, screen) {
  for (let current = node; current && current !== screen; current = current.parent) if (current.visible === false) return false;
  return true;
}
async function checkBackChevron(root) {
  const screens = screensOf(root);
  for (const screen of screens) {
    const instances = screen.findAll((node) => node.type === "INSTANCE");
    const device = instances.some((node) => /^Top-Navigation\/(Mobile|Tablet)/.test(node.name));
    if (screen.width > 1024 && !device) continue; // desktop keeps its arrows (Side Panel, Modal back)
    for (const node of instances) {
      if (!shownIn(node, screen)) continue;
      const main = await node.getMainComponentAsync();
      if (!main || !LEFT_ARROW_ICON.test(main.name)) continue;
      let holder = null;
      for (let current = node.parent; current && current !== screen; current = current.parent) {
        if (STEPPER.test(current.name)) { holder = null; break; }
        if (!holder && BACK_HOLDER.test(current.name)) holder = current;
      }
      if (holder) report("navigation/back-chevron", ERROR, node, `${main.name} in ${holder.name}: Back on a phone or tablet is icon-chevron-left-line-medium (swap the icon property; never a left arrow)`);
    }
  }
}

// Button roles (component-usage-rules §1, guidelines/button.md, code harness button/*; user 2026-10-17: "Dùng button sai
// rule … Luôn luôn kiểm tra để không bị sai rule dùng button role"). Only buttons you placed are checked: one inside a
// component (not in its slot) has the level the component gives it.
const BUTTON_SET = /^Button\/(Main|Icon-Main|Flat|Icon-Flat|Overlay|Icon-Overlay)$/;
const VAGUE_LABEL = /^(ok|okay|yes|submit|click here)$/i;
function ownedByComponent(node, screen) {
  for (let current = node.parent; current && current !== screen; current = current.parent) {
    if (current.type === "SLOT") return false;
    if (current.type === "INSTANCE") return true;
  }
  return false;
}
function onImagery(node, screen) {
  for (let current = node.parent; current && current !== screen.parent; current = current.parent) {
    const paints = "fills" in current && !isMixed(current.fills) ? visiblePaints(current.fills) : [];
    if (paints.some((paint) => paint.type === "IMAGE")) return true;
    if (paints.length) return false;
  }
  return false;
}
// Card actions: the ⋮ / ⋯ more menu floating in a card's corner is Button/Icon-Flat (Zen's Card Sub-Action: Small,
// Secondary, ⋮). User 2026-10-18: "Button in card flat chỉ dành cho button ở floating ở góc cho hành động more" — every
// other icon action in a card (power, stepper, playback, call) keeps its Icon-Main role, and a ⋮ outside a card (a page
// header toolbar) stays Icon-Main Tertiary.
const MORE_ICON = /^icon-dots-(horizontal|vertical)/;
async function isMoreIcon(node) {
  const key = Object.keys(node.componentProperties ?? {}).find((name) => name.startsWith("Leading-Icon-Src"));
  const icon = key ? await figma.getNodeByIdAsync(node.componentProperties[key].value) : null;
  return MORE_ICON.test(icon?.name ?? "");
}
function inCard(node, screen) {
  for (let current = node.parent; current && current !== screen.parent; current = current.parent) {
    if (/card/i.test(current.name) || (current.type === "INSTANCE" && /^(Card|Component\/List-Box)$/.test(setOf(current)))) return true;
  }
  return false;
}
// The Card Sub-Action's Wrapper: one child, no clip, smaller than the button, width bound to an Element-Size variable.
function inSizeWrapper(node) {
  const wrapper = node.parent;
  return Boolean(wrapper && wrapper.type === "FRAME" && !wrapper.clipsContent && wrapper.children.length === 1
    && wrapper.width < node.width && wrapper.boundVariables && wrapper.boundVariables.width);
}
// Control gap (user 2026-10-17, Schedule/Day-Planner: "chữ và button sát quá"): a button sits at least Gap/XSmall (8)
// from the text or button beside it; Gap/2XSmall (4) only joins one inline item (icon + text, a Badge beside a title).
async function checkControlGap(root) {
  const isButton = async (node) => node.type === "INSTANCE" && BUTTON_SET.test(await setNameOf(node));
  for (const frame of root.findAll ? root.findAll((node) => (node.type === "FRAME" || node.type === "COMPONENT") && node.layoutMode !== "NONE") : []) {
    if (!authored(frame) || frame.primaryAxisAlignItems === "SPACE_BETWEEN" || frame.itemSpacing >= 8 - TOLERANCE) continue;
    const kids = frame.children.filter((child) => child.visible !== false && child.layoutPositioning !== "ABSOLUTE");
    for (let i = 0; i < kids.length - 1; i++) {
      const [a, b] = [kids[i], kids[i + 1]];
      const [buttonA, buttonB] = [await isButton(a), await isButton(b)];
      if (!(buttonA || buttonB) || !(buttonA || a.type === "TEXT") || !(buttonB || b.type === "TEXT")) continue;
      report("spacing/control-gap", ERROR, frame, `${a.name} and ${b.name} sit ${frame.itemSpacing}px apart: a button beside text or another button is Spacing/Gap/XSmall (8) or more; 2XSmall joins only one inline item (icon + text, a Badge beside a title)`);
      break;
    }
  }
}
async function checkButtonRoles(root) {
  const screens = screensOf(root);
  for (const screen of screens) {
    const primaries = [];
    for (const node of screen.findAll((child) => child.type === "INSTANCE")) {
      if (!shownIn(node, screen) || ownedByComponent(node, screen)) continue;
      const main = await node.getMainComponentAsync();
      const kind = BUTTON_SET.exec(main && main.parent && main.parent.type === "COMPONENT_SET" ? main.parent.name : "")?.[1];
      if (!kind) continue;
      const { Level: level, Size: size } = node.variantProperties ?? {};
      const solid = kind === "Main" || kind === "Icon-Main";
      if (solid && level === "Primary") primaries.push(node);
      if (solid && level === "Secondary") report("button/secondary-justified", WARNING, node, "Secondary is a rare highlight: a pressed toggle that stays on (a device's power while it is on). Every other action is Tertiary; say why it stays");
      if (solid && level === "Accent") report("button/accent-is-promoted", WARNING, node, "Accent is only for a promoted CTA (onboarding, upsell, the floating feedback action); an ordinary main action is Primary");
      if ((kind === "Main" || kind === "Flat") && /^(Small|XSmall|2XSmall)$/.test(size) && node.layoutSizingHorizontal === "FILL") report("button/small-full-width", ERROR, node, `a ${size} button stretched to Fill: small buttons hug their label; a full-width button is Medium or larger`);
      if (solid && onImagery(node, screen)) report("button/overlay-on-imagery", WARNING, node, "a Button/Main or Icon-Main on a photo: use Button/Overlay or Icon-Overlay (White, White Overlay, Black Overlay, Inverse)");
      const cardMore = (kind === "Icon-Main" || kind === "Icon-Flat") && inCard(node, screen) && (await isMoreIcon(node));
      if (kind === "Icon-Main" && cardMore) report("button/in-card-flat", ERROR, node, "the ⋮/⋯ more menu in a card's corner is Button/Icon-Flat (the Card Sub-Action: Small, Secondary, icon-dots-vertical-line); other icon actions in a card keep Icon-Main");
      if (kind === "Icon-Flat" && cardMore && !inSizeWrapper(node)) report("button/in-card-wrapper", WARNING, node, "the card's ⋮ more menu sits in a Wrapper sized by Element-Size/Popular/Base (20, no clip, centred), as the Card Sub-Action does: the button bleeds evenly and the row keeps the icon's size");
      const label = kind === "Main" || kind === "Flat" || kind === "Overlay" ? node.findOne((child) => child.type === "TEXT") : null;
      if (label && VAGUE_LABEL.test(label.characters.trim())) report("button/vague-label", WARNING, node, `"${label.characters}": start with a verb and name the outcome ("Save changes", "Select")`);
    }
    const byParent = new Map();
    for (const node of primaries) byParent.set(node.parent, [...(byParent.get(node.parent) ?? []), node]);
    for (const group of byParent.values()) if (group.length > 1) for (const node of group.slice(1)) report("button/one-primary", ERROR, node, "two Primary buttons side by side: pair Tertiary + Primary, Primary last");
    if (primaries.length > 1 && byParent.size > 1) for (const node of primaries.slice(1)) if ((byParent.get(node.parent) ?? []).length === 1) report("button/one-primary", WARNING, node, `${primaries.length} Primary buttons on ${screen.name}: one main CTA per screen, every other action Tertiary (one per card is fine in a pricing grid; say so)`);
  }
}

// Touch targets and control rows (component-usage-rules §13; user 2026-10-17: "Khoảng cách giữa chip và các phần dưới gần
// quá … Đang làm cho mobile nên có rule về vùng chạm tối thiểu để làm spacing cho an toàn"). A control smaller than the
// 44px hit area (Apple HIG 44pt, Zen's Nav-Action; WCAG 2.5.5) keeps the rest as free space around it.
const TOUCH = 44;
const INTERACTIVE = /^(Button\/|Chip\/|Toggle|Checkbox\/|Radio-Button\/|Segmented$|Tab-Bar$|Search\/|Input\/|Slider\/|Pagination$)/;
const CONTROL_ROW_SET = /^(Segmented|Tab-Bar|Search\/.*)$/;
const lacks = (size) => Math.max(0, TOUCH - size) / 2;
function isTouchScreen(screen, instances) {
  return screen.width <= 1024 || instances.some((node) => /^Top-Navigation\/(Mobile|Tablet)/.test(node.name));
}
async function setNameOf(node) {
  const main = await node.getMainComponentAsync();
  return main ? (main.parent && main.parent.type === "COMPONENT_SET" ? main.parent.name : main.name) : "";
}
async function isControlRow(node) {
  if (node.type === "INSTANCE") return CONTROL_ROW_SET.test(await setNameOf(node));
  if (node.type !== "FRAME" || !node.children.length) return false;
  for (const child of node.children) if (child.visible !== false && !(child.type === "INSTANCE" && /^Chip\//.test(await setNameOf(child)))) return false;
  return true;
}
async function checkTouchSpacing(root) {
  const screens = screensOf(root);
  for (const screen of screens) {
    const instances = screen.findAll((node) => node.type === "INSTANCE");
    if (!isTouchScreen(screen, instances)) continue;
    const controls = [];
    for (const node of instances) {
      if (!shownIn(node, screen) || ownedByComponent(node, screen)) continue;
      if (INTERACTIVE.test(await setNameOf(node))) controls.push({ node, b: box(node) });
    }
    const sb = box(screen);
    const inView = controls.filter(({ b }) => b && b.y >= sb.y && b.y + b.height <= sb.y + sb.height);
    for (let i = 0; i < inView.length; i++) for (let j = i + 1; j < inView.length; j++) {
      const [a, c] = [inView[i], inView[j]];
      const overlapX = Math.min(a.b.x + a.b.width, c.b.x + c.b.width) - Math.max(a.b.x, c.b.x);
      const overlapY = Math.min(a.b.y + a.b.height, c.b.y + c.b.height) - Math.max(a.b.y, c.b.y);
      if (overlapX > 0 && overlapY > 0) continue; // one sits on the other (a badge, a button on a card): not neighbours
      let gap, need;
      if (overlapX > 0) { gap = Math.max(a.b.y, c.b.y) - Math.min(a.b.y + a.b.height, c.b.y + c.b.height); need = lacks(a.b.height) + lacks(c.b.height); }
      else if (overlapY > 0) { gap = Math.max(a.b.x, c.b.x) - Math.min(a.b.x + a.b.width, c.b.x + c.b.width); need = lacks(a.b.width) + lacks(c.b.width); }
      else continue;
      if (gap + TOLERANCE < need) report("touch/target-spacing", ERROR, c.node, `${Math.round(gap)}px from ${a.node.name}: on a touch screen each control keeps a 44px hit area, so these two need ${Math.ceil(need)}px (use the ladder step at or above it)`);
    }
    for (const frame of screen.findAll((node) => node.type === "FRAME" && node.layoutMode === "VERTICAL" && node.children.length > 1)) {
      if (!shownIn(frame, screen) || ownedByComponent(frame, screen) || frame.primaryAxisAlignItems === "SPACE_BETWEEN") continue;
      const kids = frame.children.filter((child) => child.visible !== false);
      for (let k = 0; k < kids.length - 1; k++) {
        if (!(await isControlRow(kids[k])) || (await isControlRow(kids[k + 1]))) continue;
        if (frame.itemSpacing < 16 - TOLERANCE) report("spacing/controls-to-content", WARNING, kids[k + 1], `${frame.itemSpacing}px below ${kids[k].name}: a control row and the content it controls are blocks, Spacing/Gap/Medium (16) or more`);
      }
    }
  }
}

// Phone sections (user 2026-10-17: "thêm rule spacing giữa các section trong mobile tối [thiểu] ở chế độ comfortable luôn
// là 32px. Compact là 24px. tạo token để áp dụng"): the Body that stacks a phone screen's sections binds its gap to
// Component Size's Layout-Mobile/Section-Gap (Compact 24, Comfortable 32), so it follows the mode the domain picks.
// User 2026-10-21: "Spacing giữa các section trong mobile nên là 32px", "section khác với spacing trong 1 nhóm grid
// widget", "trong Desktop cũng vậy": desktop sections are Spacing/Gap/XLarge (32) apart. The section stack is the
// screen's Body / Content frame or a page pattern's Content slot (Pattern/AppShell/…), whose children are the sections;
// a widget grid inside a section keeps its own, smaller gap.
// "Các nhóm nội dung cùng nhau nên gom vào cùng 1 section", "không để title riêng, listing riêng": a section's title row
// and the content it names are one section frame, never two siblings of the stack (section/title-apart).
const SECTION_BODY = /^(Body|Content|Sections)$/i;
const TITLE_STYLE = /^(Heading\/(2|3|4|Subheading)|Body\/Small\/Bold|All-Caps)/;
const textStyleName = async (node) => (typeof node.textStyleId === "string" && node.textStyleId ? (await figma.getStyleByIdAsync(node.textStyleId))?.name ?? "" : "");
/** True when `node` holds only a title: a heading or kicker text, alone or in a row with a See all link. */
async function isLoneTitle(node) {
  if (node.type === "TEXT") return TITLE_STYLE.test(await textStyleName(node));
  if (node.type !== "FRAME" || node.layoutMode === "NONE") return false;
  const shown = node.findAll((child) => child.visible !== false);
  for (const child of shown) if (child.type === "INSTANCE" && !/^(Button\/Flat|Link)/.test(await setNameOf(child))) return false;
  const texts = shown.filter((child) => child.type === "TEXT");
  // A heading over its paragraph (a docs step, an intro) is a section of text, not a title: copy is a text after the
  // first one that runs past 60 characters or wraps (Master-Layout B5's "2. Wrap your app in ZenProvider").
  const isCopy = (text) => text.characters.length > 60 || text.height > 1.5 * (typeof text.fontSize === "number" ? text.fontSize : 16) * 1.4;
  if (texts.slice(1).some(isCopy)) return false;
  return texts.length > 0 && texts.length <= 3 && TITLE_STYLE.test(await textStyleName(texts[0]));
}
async function checkSectionGap(root) {
  const screens = screensOf(root);
  for (const screen of screens) {
    if (!("findAll" in screen)) continue;
    const phone = screen.width < 744 || screen.findAll((node) => node.type === "INSTANCE" && /^Top-Navigation\/Mobile/.test(node.name)).length > 0;
    const stacks = screen.children.filter((body) => body.type === "FRAME" && SECTION_BODY.test(body.name) && body.layoutMode === "VERTICAL" && body.visible !== false);
    for (const slot of screen.findAll((node) => node.type === "SLOT" && node.name === "Content" && node.layoutMode === "VERTICAL" && node.visible !== false)) {
      let owner = slot.parent;
      while (owner && owner.type !== "INSTANCE") owner = owner.parent;
      if (owner && PAGE_PATTERN.test(await setNameOf(owner))) stacks.push(slot);
    }
    const want = phone ? "Layout-Mobile/Section-Gap" : "Spacing/Gap/XLarge";
    for (const body of stacks) {
      const shown = body.children.filter((child) => child.visible !== false && child.layoutPositioning !== "ABSOLUTE");
      // A pane (a thread that fills down to its composer) is not a page of sections; a Divider separates, it is no section.
      if (shown.some((child) => child.layoutSizingVertical === "FILL")) continue;
      const sections = [];
      for (const child of shown) if (!(child.type === "INSTANCE" && /^Divider/.test(await setNameOf(child)))) sections.push(child);
      if (sections.length < 2) continue;
      const id = body.boundVariables?.itemSpacing?.id;
      const name = id ? await variableName(id) : null;
      if (name !== want) report("spacing/section-gap", ERROR, body, `gap ${body.itemSpacing}${name ? ` (${name})` : ""}: ${phone ? "a phone screen's sections are spaced by Layout-Mobile/Section-Gap (Component Size: Compact 24, Comfortable 32), never less" : "a desktop page's sections are spaced by Spacing/Gap/XLarge (32)"}; a widget grid keeps its own gap inside its section`);
      for (let i = 0; i < sections.length - 1; i++) {
        if (await isLoneTitle(sections[i])) report("section/title-apart", WARNING, sections[i], `“${sections[i].name}” is a title on its own, a section gap away from the content it names: put the title row and its content in one section frame (Spacing/Gap/Medium between them)`);
      }
    }
  }
}

// A list that closes a phone screen (user 2026-10-21: "nếu list-box nằm cuối trang ở mobile thì không bỏ vào list box mà
// đưa thành 1 danh sách nối thành 1 section giống example Finance"; "cuối trang nghĩa là bên dưới nó không nằm trong grid
// của các widget, mà là 1 danh sách độc lập liệt kê như task, transaction"): on a phone, a List-Box that is the last
// section of the screen's content, and not in a row or grid of widgets, is an open section instead, as ◆ Finance's
// Transactions: a Heading row (Heading/4 + See All, Margin-Comfortable sideways, Padding/Medium above and below) over the
// List-Items in a frame padded Margin-Comfortable sideways, straight on the Canvas. Grouped lists (more than one List-Box
// in the content: settings, profile, screen-rules §4) keep their boxes.
const PAGE_PATTERN = /^Pattern\/|AppShell|Master-Layout/;
const SCREEN_BAR = /^(Bottom-Navigation|Top-Navigation|Action-Bar|Status-bar|Home-Indicator|System|Tab-Bar)/;
async function checkClosingList(root) {
  for (const screen of screensOf(root)) {
    if (!("findAll" in screen)) continue;
    const phone = screen.width < 744 || screen.findAll((node) => node.type === "INSTANCE" && /^Top-Navigation\/Mobile/.test(node.name)).length > 0;
    if (!phone) continue;
    const closing = [];
    const perContent = new Map();
    for (const box of screen.findAll((node) => node.type === "INSTANCE" && node.visible !== false)) {
      if ((await setNameOf(box)) !== "Component/List-Box") continue;
      // Walk up to the screen's content (a page pattern's slot, or the screen frame): every level must end with the box.
      let current = box, content = null, last = true;
      for (let parent = box.parent; parent && parent.type !== "PAGE"; current = parent, parent = parent.parent) {
        if (parent.type === "SLOT") {
          let owner = parent.parent;
          while (owner && owner.type !== "INSTANCE") owner = owner.parent;
          if (!owner || !PAGE_PATTERN.test(await setNameOf(owner))) { last = false; break; } // in a Card, a sheet or a panel
        } else if (parent.type === "INSTANCE") { last = false; break; } // inside another component
        if (parent.layoutMode === "HORIZONTAL" || parent.layoutMode === "GRID" || parent.layoutWrap === "WRAP") { last = false; break; } // a row or grid of widgets
        // By id: layers inside an instance are new objects on every read, so indexOf misses them.
        const flow = parent.children.filter((child) => child.visible !== false && child.layoutPositioning !== "ABSOLUTE" && !SCREEN_BAR.test(child.name));
        if (flow.findIndex((child) => child.id === current.id) !== flow.length - 1) last = false; // a section follows
        if (parent.type === "SLOT" || parent.id === screen.id) { content = parent; break; }
      }
      if (!content) continue;
      perContent.set(content.id, (perContent.get(content.id) ?? 0) + 1);
      if (last) closing.push([box, content]);
    }
    for (const [box, content] of closing) {
      if (perContent.get(content.id) > 1) continue;
      report("list-box/closing-list-on-phone", ERROR, box, "the last section of a phone screen is in a List-Box: make it an open section as ◆ Finance Transactions (a Heading row with See All over the List-Items in a frame padded Margin-Comfortable, no box)");
    }
  }
}

// Navigation icons (user 2026-10-17: "Dùng icon không đồng bộ"): in a Bottom-Navigation the selected item shows the
// solid icon and every other item the line icon of the same family; an icon without a solid version is not a tab icon.
async function checkNavIcons(root) {
  for (const nav of root.findAll ? root.findAll((node) => node.type === "INSTANCE" && /^Bottom-Navigation\//.test(node.name)) : []) {
    if (nav.visible === false) continue;
    const slot = nav.findOne((node) => node.type === "SLOT");
    for (const item of slot ? slot.children : []) {
      if (item.type !== "INSTANCE" || item.visible === false) continue;
      const key = Object.keys(item.componentProperties).find((name) => name.startsWith("Icon-Src"));
      if (!key) continue;
      const icon = await figma.getNodeByIdAsync(item.componentProperties[key].value);
      const selected = item.componentProperties.Select?.value === "Yes";
      const name = icon?.name ?? "";
      if (selected && !/-solid$/.test(name)) report("navigation/icon-style", ERROR, item, `the selected item shows ${name || "a line icon"}: use its -solid version (pick an icon that has one)`);
      if (!selected && /-solid$/.test(name)) report("navigation/icon-style", ERROR, item, `an unselected item shows ${name}: use its -line version; solid marks only the current tab`);
    }
  }
}

// The status bar rides the top bar (user 2026-10-18: "lỗi tách status bar khỏi top nav của ipad"): a Top-Navigation
// draws its own Status-bar, so its background (a gradient, a colour band) runs under the clock. A separate status bar
// above a Top-Navigation whose own one is hidden sits on a band of its own: swap the bar's Status-bar to the device's
// (Status-bar/IOS/Tablet on an iPad) and remove the separate one.
// Empty State size from where it sits (user 2026-10-18: "vẫn chưa dùng rule các empty state"; code EmptyState size):
// Medium (240 illustration) fills the page's main content; Small (200) fills one region of a page that still shows
// other content: a Card or widget, a table or list, a pane, a side panel, sheet, popover or dialog, or a block beside
// other blocks. Nodes inside instances are new wrappers on each read: compare ids, never objects.
const EMPTY_REGION = /Card|Table|List-Box|Pane|Panel|Sheet|Dialog|Modal|Popover|Sidebar|Side-Bar|Widget|Tab-?Panel|Plot/i;
async function checkEmptyStateSize(root) {
  for (const screen of screensOf(root)) {
    for (const node of screen.findAll ? screen.findAll((n) => n.type === "INSTANCE" && setOf(n) === "Empty-State") : []) {
      if (!shownIn(node, screen)) continue;
      const size = node.componentProperties.Size && node.componentProperties.Size.value;
      if (!size) continue;
      const chain = [];
      for (let p = node.parent; p && p.id !== screen.id; p = p.parent) chain.push(p);
      const content = chain.find((p) => p.name === "Content" || p.name === "Body");
      const below = content ? chain.slice(0, chain.indexOf(content)) : chain;
      const region = below.some((p) => EMPTY_REGION.test(p.name) || (p.type === "INSTANCE" && EMPTY_REGION.test(setOf(p)))) || chain.some((p) => p.name === "Sheet");
      const block = below[below.length - 1] ?? node;
      const shared = Boolean(content) && content.children.some((c) => c.id !== block.id && c.visible !== false);
      if (size === "Medium" && region) report("empty-state/size-by-container", ERROR, node, `a Medium Empty State inside ${below.find((p) => EMPTY_REGION.test(p.name))?.name ?? "a sheet"}: a region of the page takes Size=Small (200)`);
      else if (size === "Medium" && shared) report("empty-state/size-by-container", WARNING, node, `a Medium Empty State beside other content in ${content.name}: it fills one region, so Size=Small (200); Medium is for an empty page`);
      else if (size === "Small" && !region && !shared && content) report("empty-state/size-by-container", WARNING, node, `a Small Empty State fills ${content.name} alone: an empty page takes Size=Medium (240)`);
    }
  }
}

// One icon at the start of the top bar (user 2026-10-18): the header's sidebar toggle beside a Breadcrumbs Master item
// (its home icon) reads as two icons in a row. With the toggle in the header the trail starts with a Sub item; to keep
// the Master item, the toggle goes to the sidebar's own header (Pattern/AppShell/Desktop Collapse=Sidebar).
async function checkCollapseBesideMasterCrumb(root) {
  for (const header of root.findAll ? root.findAll((n) => n.type === "INSTANCE" && setOf(n) === "Header/AppShell") : []) {
    if (header.visible === false) continue;
    const props = header.componentProperties;
    const on = (prefix) => { const key = Object.keys(props).find((k) => k.split("#")[0] === prefix); return key ? props[key].value !== false : true; };
    if (!on("Collapse Button") || !on("Top-Header")) continue;
    const top = header.findOne((n) => n.type === "SLOT" && n.name === "Top-Elements");
    const first = top && top.findAll((n) => n.type === "INSTANCE" && setOf(n) === ".Primitives/Breadcrumbs/Item").find((n) => { for (let p = n; p && p.id !== top.id; p = p.parent) if (p.visible === false) return false; return true; });
    if (first && /Level=Master/.test(first.mainComponent ? first.mainComponent.name : "")) report("navigation/collapse-beside-master-crumb", ERROR, first, "the sidebar toggle in the header sits beside a Master crumb (two icons in a row): start the trail with a Sub item, or keep the Master crumb and move the toggle to the sidebar (Collapse=Sidebar)");
  }
}

async function checkStatusInBar(root) {
  for (const nav of root.findAll ? root.findAll((node) => node.type === "INSTANCE" && /^Top-Navigation\/Mobile/.test(setOf(node))) : []) {
    if (nav.visible === false) continue;
    const own = nav.findOne((node) => node.type === "INSTANCE" && /^Status-bar\//.test(setOf(node)));
    if (!own || own.visible !== false) continue;
    let screen = nav;
    while (screen.parent && screen.parent.type !== "PAGE" && screen.parent.type !== "SECTION" && screen.parent.type !== "COMPONENT_SET") screen = screen.parent;
    const navBox = box(nav);
    const separate = screen.findAll((node) => node.type === "INSTANCE" && node.visible !== false && /^Status-bar\//.test(setOf(node)) && !nav.findOne((inner) => inner.id === node.id))
      .find((bar) => { const b = box(bar); return b && navBox && b.y + b.height <= navBox.y + 1 && b.y >= navBox.y - 60; });
    if (separate) report("navigation/status-in-bar", ERROR, separate, `a status bar above ${nav.name}, whose own is hidden: swap the bar's Status-bar to ${setOf(separate)}, show it and remove this one, so the bar's background runs under the clock`);
  }
}

// Floating bottom bar fit (user 2026-10-18, phone and tablet alike): a Floating or Floating-Glass Bottom-Navigation's
// tabs are 64 to 88 wide. The capsule (Container) and its Nav-Item slot fill the bar while the tabs share the room at
// 88 or less; once they would pass 88 (fewer tabs, a tablet, the Duo) both hug and every tab is Fixed 88, the capsule
// centred (Items row Center) or at the start with the action at the end (Space between).
const TAB_MIN = 64;
const TAB_MAX = 88;
const FLOATING_BAR = /^Bottom-Navigation\/Mobile\/Floating(-Glass)?$/;
async function checkFloatingBarFit(root) {
  for (const nav of root.findAll ? root.findAll((node) => node.type === "INSTANCE") : []) {
    if (nav.visible === false || !FLOATING_BAR.test(setOf(nav))) continue;
    const items = nav.findOne((node) => node.name === "Items");
    const capsule = items && items.findOne((node) => node.name === "Container");
    const slot = capsule && capsule.findOne((node) => node.type === "SLOT");
    if (!slot) continue;
    const tabs = slot.children.filter((tab) => tab.visible !== false);
    if (!tabs.length) continue;
    const action = items.children.find((node) => node.name === "Action" && node.visible !== false);
    const room = Math.min(items.width - items.paddingLeft - items.paddingRight - (action ? action.width + items.itemSpacing : 0), capsule.maxWidth || Infinity) - capsule.paddingLeft - capsule.paddingRight;
    const share = room / tabs.length;
    const fills = capsule.layoutSizingHorizontal === "FILL" || slot.layoutSizingHorizontal === "FILL";
    if (share < TAB_MIN - 1) report("navigation/floating-fit", ERROR, nav, `${tabs.length} tabs in ${Math.round(room)}px leave ${Math.round(share)} each, under ${TAB_MIN}: a floating bar holds 5 tabs on a phone, 4 beside its action (more go in More, or use Bottom-Navigation/Mobile/Default)`);
    else if (fills && share > TAB_MAX + 1) report("navigation/floating-fit", ERROR, nav, `the tabs stretch to ${Math.round(share)}, past ${TAB_MAX}: set Container and Nav-Item to Hug and each tab Fixed ${TAB_MAX} (Items row Center, or Space between with the action)`);
    else if (!fills && share <= TAB_MAX + 1) report("navigation/floating-fit", ERROR, nav, `the capsule hugs while its tabs need ${Math.round(share)} each, ${TAB_MAX} or less: set Container and Nav-Item to Fill and the tabs to Fill`);
  }
}

// Row drift (user 2026-10-17, Schedule/Resource-Grid: "Cẩn thận các lỗi này"): side-by-side columns of equal rows (a
// row header column beside a track, a gutter beside day columns) must end every row at the same height. A hug cell
// with a 1px rule grows 1px when its stroke counts in the layout (createAutoLayout's default), so the lines drift.
function checkRowDrift(root) {
  const rowsOf = (column) => column.children.filter((row) => row.visible !== false && row.layoutPositioning !== "ABSOLUTE");
  const uniform = (rows) => Math.max(...rows.map((row) => row.height)) - Math.min(...rows.map((row) => row.height)) <= TOLERANCE;
  for (const frame of root.findAll ? root.findAll((node) => node.type === "FRAME" && node.layoutMode === "HORIZONTAL") : []) {
    if (!authored(frame)) continue;
    const columns = frame.children.filter((child) => child.visible !== false && child.type === "FRAME" && child.layoutMode === "VERTICAL" && rowsOf(child).length >= 3 && uniform(rowsOf(child)));
    if (columns.length < 2) continue;
    const ends = columns.map((column) => rowsOf(column).map((row) => box(row)).filter(Boolean).map((b) => b.y + b.height));
    if (!ends.every((list) => list.length === ends[0].length)) continue;
    for (let i = 0; i < ends[0].length; i++) {
      const drift = Math.max(...ends.map((list) => list[i])) - Math.min(...ends.map((list) => list[i]));
      if (drift <= TOLERANCE) continue;
      report("layout/row-drift", WARNING, frame, `row ${i + 1} of ${columns.map((column) => column.name).join(" / ")} ends ${Math.round(drift)}px apart: one fixed row height, and strokesIncludedInLayout = false on every frame that draws a grid rule`);
      break;
    }
  }
}

const PLACEHOLDER = /lorem|ipsum|dolor sit/i;
// A List-Box footer action's label (user rule 2026-10-16, code harness listbox/footer-action-tertiary).
const ACTION_LABEL = /^(open|go to|view|see|show|manage|browse|all)\b/i;
/** True when `node` is text in a List-Box's Footer-Slot that no Button instance holds. */
function footerTextAction(node) {
  for (let current = node.parent; current && current.type !== "PAGE"; current = current.parent) {
    if (current.type === "INSTANCE" && /^Button\//.test(current.name)) return false;
    if (current.type === "SLOT" && current.name === "Footer-Slot") return true;
  }
  return false;
}
/** True when `node` is a Button instance placed in a List-Box's Footer-Slot that hugs on a screen wider than a phone. */
function footerActionHugs(node) {
  if (!/^Button\//.test(node.name) || node.parent?.type !== "SLOT" || node.parent.name !== "Footer-Slot") return false;
  if (node.layoutSizingHorizontal !== "HUG") return false;
  let screen = node;
  while (screen.parent && screen.parent.type !== "PAGE" && screen.parent.type !== "SECTION") screen = screen.parent;
  return screen.width > 600;
}
const DEFAULT_LABELS = new Set(["Text", "Label", "Title", "Heading", "Subheading", "Description", "Caption", "Button", "Value", "Placeholder text"]);

/** The line height of `node` in px (Auto ≈ 1.2 × the size). */
function lineHeightOf(node, fontSize) {
  const lineHeight = node.lineHeight;
  if (isMixed(lineHeight) || lineHeight.unit === "AUTO") return fontSize * 1.2;
  return lineHeight.unit === "PERCENT" ? (lineHeight.value / 100) * fontSize : lineHeight.value;
}

function checkText(node, instanceRoot) {
  const characters = node.characters.trim();
  const own = box(node);
  const ink = node.absoluteRenderBounds;
  if (!own || !characters) return;
  const fontSize = isMixed(node.fontSize) ? 12 : node.fontSize;
  if (characters.length >= 2 && own.width < fontSize * 1.5 && node.textAutoResize !== "WIDTH_AND_HEIGHT") {
    report("text/crushed", ERROR, node, `${Math.round(own.width)}px wide for “${characters.slice(0, 24)}”`);
  } else if (ink && node.textAutoResize !== "WIDTH_AND_HEIGHT") {
    // Lines counted from the ink, not the box: a fixed box taller than one line is not a wrap.
    const lines = 1 + Math.max(0, Math.floor((ink.height - fontSize) / lineHeightOf(node, fontSize) + 0.3));
    if (lines >= 3 && characters.length / lines < 5) report("text/crushed", ERROR, node, `${lines} lines of ~${Math.round(characters.length / lines)} characters`);
  }
  if (node.textAutoResize === "NONE" && node.textTruncation !== "ENDING" && node.absoluteRenderBounds && node.absoluteRenderBounds.height > own.height + 2) {
    report("text/overflow", ERROR, node, `text runs ${Math.round(node.absoluteRenderBounds.height - own.height)}px below its box`);
  }
  if (instanceRoot && ink && sticksOut(ink, box(instanceRoot), INK_TOLERANCE)) report("text/overflow", ERROR, node, `${side(ink, box(instanceRoot), INK_TOLERANCE)} past the ${instanceRoot.name} instance`);
  if (ACTION_LABEL.test(characters) && footerTextAction(node)) report("list-box/footer-text-action", ERROR, node, `“${characters.slice(0, 24)}” is text: use a Button/Main Tertiary (Fill on desktop and tablet, Hug on mobile)`);
  if (PLACEHOLDER.test(characters)) report("copy/placeholder", WARNING, node, `“${characters.slice(0, 24)}”`);
  else if (!instanceRoot && DEFAULT_LABELS.has(characters)) report("copy/placeholder", WARNING, node, `“${characters}”`);
}

/**
 * Left-aligned text with a fixed width in a vertical auto layout that centres (or end-aligns) its children: when the
 * column is wider than the text box, the box moves in and the text no longer lines up with its siblings. Typical case:
 * the default Heading kept in a resized List-Box's Header-Slot.
 */
function checkShiftedText(node) {
  const parent = node.parent;
  if (!parent || parent.layoutMode !== "VERTICAL" || node.layoutPositioning === "ABSOLUTE") return;
  if (node.layoutSizingHorizontal !== "FIXED" || (node.textAlignHorizontal !== "LEFT" && node.textAlignHorizontal !== "JUSTIFIED")) return;
  if (parent.counterAxisAlignItems !== "CENTER" && parent.counterAxisAlignItems !== "MAX") return;
  const shift = node.x - parent.paddingLeft;
  if (shift > TOLERANCE) report("text/shifted", ERROR, node, `starts ${Math.round(shift)}px in from the edge of ${parent.name} (fixed ${Math.round(node.width)}px in ${Math.round(parent.width)}px)`);
}

/** True when `node` belongs to `instance`'s component, false when it sits in one of its slots (authored content). */
function ownedBy(node, instance) {
  for (let current = node.parent; current && current.id !== instance.id; current = current.parent) {
    if (current.type === "SLOT") return false;
  }
  return true;
}

const boundColour = (paints) => {
  const paint = visiblePaints(paints).find((candidate) => candidate.type === "SOLID");
  return paint ? (paint.boundVariables && paint.boundVariables.color ? paint.boundVariables.color.id : null) : undefined;
};

/**
 * The colour variable the component itself gives `target`'s `field`: the same layer path in the main component of the
 * nearest instance above it that is not an icon swap (an INSTANCE_SWAP slot such as Leading-Icon re-creates its icon,
 * whose own colour is not the variant's). undefined when the layer cannot be found there.
 */
async function componentColour(target, field) {
  const names = [];
  for (let current = target; current && current.type !== "PAGE"; current = current.parent) {
    const swapped = current !== target && current.componentPropertyReferences && current.componentPropertyReferences.mainComponent;
    if (current.type === "INSTANCE" && !swapped) {
      const main = await current.getMainComponentAsync();
      let node = main;
      for (const name of names) {
        node = node && "children" in node ? node.children.find((child) => child.name === name) : null;
      }
      return node && field in node ? boundColour(node[field]) : undefined;
    }
    names.unshift(current.name);
  }
  return undefined;
}

const variableName = async (id) => (id ? (await figma.variables.getVariableByIdAsync(id))?.name ?? id : "no variable");

/** Fills and strokes painted inside a Zen instance (overrides of the component's own paints). */
async function checkInstanceOverrides(instance) {
  for (const override of instance.overrides) {
    if (override.id === instance.id && override.overriddenFields.includes("effects")) checkEffects(instance);
    const fields = override.overriddenFields.filter((field) => field === "fills" || field === "strokes");
    if (!fields.length) continue;
    const target = await figma.getNodeByIdAsync(override.id);
    if (!target || !target.visible || !ownedBy(target, instance)) continue;
    for (const field of fields) {
      const paints = visiblePaints(target[field]);
      if (isMixed(target[field])) continue;
      const raw = paints.filter((paint) => paint.type === "SOLID" && !(paint.boundVariables && paint.boundVariables.color));
      const styleId = field === "fills" ? target.fillStyleId : target.strokeStyleId;
      if (raw.length && !styleId) {
        report("instance/paint-override", ERROR, target, `${field} ${hex(raw[0])} inside ${instance.name}`);
        continue;
      }
      const actual = boundColour(target[field]);
      const expected = await componentColour(target, field);
      if (actual && expected !== undefined && actual !== expected) {
        report("instance/colour-changed", WARNING, target, `${field} ${await variableName(actual)}, the component has ${await variableName(expected)} (inside ${instance.name})`);
      }
    }
  }
}

/** The nearest painted layer above `node` is Background/White-Solid (white in both modes)? Images and other solids stop it. */
async function onWhiteSolid(node) {
  for (let current = node.parent; current && current.type !== "PAGE" && current.type !== "SECTION"; current = current.parent) {
    const paints = "fills" in current && !isMixed(current.fills) ? visiblePaints(current.fills) : [];
    const solid = paints.find((paint) => paint.type === "SOLID");
    if (solid) return /Background\/White-Solid\//.test((await paintVar(solid)) ?? "");
    if (paints.length) return false;
    if (rootIds.has(current.id)) return false;
  }
  return false;
}

/** Text (or a placed icon) on a White-Solid fill takes Content/On-White-Overlay/*: the fill stays white in Dark mode. */
async function checkOnWhiteSolid(node) {
  let paint;
  if (node.type === "TEXT") paint = isMixed(node.fills) ? null : visiblePaints(node.fills).find((candidate) => candidate.type === "SOLID");
  else {
    const vector = node.findOne((child) => child.type === "VECTOR" || child.type === "BOOLEAN_OPERATION");
    paint = vector && !isMixed(vector.fills) ? visiblePaints(vector.fills).find((candidate) => candidate.type === "SOLID") : null;
  }
  if (!paint || !(await onWhiteSolid(node))) return;
  const name = (await paintVar(paint)) ?? "a raw colour";
  if (/Content\/On-White-Overlay\//.test(name)) return;
  report("theme/on-white-solid", ERROR, node, `${name.replace("Color/", "")} on Background/White-Solid: use Content/On-White-Overlay/* (the fill stays white in Dark mode${/Neutral|Inverse/.test(name) ? ", this colour turns light there" : ""})`);
}

// Content on a Solid fill takes the fill's own family (variable descriptions, component-usage-rules §7). `tile` and
// `trend` are the Content variants of Metric-Tile and Metric-Trend; `chip` the Theme a Dock-Icon or Badge takes there.
const SOLID_FAMILIES = [
  { fill: /Background\/Neutral\/Solid\//, text: /Content\/Inverse\//, family: "Content/Inverse/*", tile: "Inverse", trend: "Inverse", chip: "Inverse" },
  { fill: /Background\/Accent\/Solid\//, text: /Content\/On-Accent\//, family: "Content/On-Accent/*", tile: "On-Accent", trend: "On-Color", chip: "On-Color" },
  { fill: /Background\/(Support\/(Yellow|Sky|Mint|Golden)\/Solid|Warning\/Solid\/)/, text: /Content\/On-Brights$/, family: "Content/On-Brights", tile: "On-Bright", trend: "On-Color", chip: "On-Color" },
  { fill: /Background\/(Support\/[^/]+\/Solid|Positive\/Solid\/|Negative\/Solid\/|Info\/Solid\/)/, text: /Content\/On-Colors$/, family: "Content/On-Colors", tile: "On-Color", trend: "On-Color", chip: "On-Color" },
];

/** The nearest painted layer above `node`, when it is a Solid fill of a SOLID_FAMILIES row: { fill, row }. */
async function solidBelow(node) {
  for (let current = node.parent; current && current.type !== "PAGE" && current.type !== "SECTION"; current = current.parent) {
    const paints = "fills" in current && !isMixed(current.fills) ? visiblePaints(current.fills) : [];
    const solid = paints.find((paint) => paint.type === "SOLID");
    if (solid) {
      const fill = (await paintVar(solid)) ?? "";
      const row = SOLID_FAMILIES.find((family) => family.fill.test(fill));
      return row ? { fill: fill.replace("Color/", ""), row } : null;
    }
    if (paints.length) return null;
    if (rootIds.has(current.id)) return null;
  }
  return null;
}

/** Text or a placed icon on a Solid fill: its colour comes from the fill's family. */
async function checkOnSolid(node) {
  let paint;
  if (node.type === "TEXT") paint = isMixed(node.fills) ? null : visiblePaints(node.fills).find((candidate) => candidate.type === "SOLID");
  else {
    const vector = node.findOne((child) => child.type === "VECTOR" || child.type === "BOOLEAN_OPERATION");
    paint = vector && !isMixed(vector.fills) ? visiblePaints(vector.fills).find((candidate) => candidate.type === "SOLID") : null;
  }
  if (!paint) return;
  const below = await solidBelow(node);
  if (!below) return;
  const name = (await paintVar(paint)) ?? "a raw colour";
  if (below.row.text.test(name)) return;
  report("theme/on-solid-content", ERROR, node, `${name.replace("Color/", "")} on ${below.fill}: use ${below.row.family}`);
}

/** Zen parts that carry their own content colours (Metric-Tile, Metric-Trend, Dock-Icon, Badge) set to the fill's family. */
async function checkSolidPairing(instance) {
  const set = setOf(instance);
  const kind = set === "Primitives/Metric/Metric-Tile" ? "tile" : set === ".Primitives/Metrics/Metric-Trend" ? "trend" : set === "Dock-Icon" || set === "Badge" ? "chip" : null;
  if (!kind) return;
  const below = await solidBelow(instance);
  if (!below) return;
  const props = instance.componentProperties;
  if (kind === "chip") {
    const theme = props.Theme && props.Theme.value;
    const wrong = below.row.chip === "Inverse" ? ["On-Color", "Neutral"] : ["Inverse", "Neutral"];
    if (wrong.includes(theme)) report("theme/on-solid-content", ERROR, instance, `${set} Theme=${theme} on ${below.fill}: use Theme=${below.row.chip}`);
    return;
  }
  const content = props.Content && props.Content.value;
  const want = below.row[kind];
  if (content === want) return;
  report("theme/on-solid-content", ERROR, instance, `${set} Content=${content} on ${below.fill}: use Content=${want}`);
}

async function walk(node, instanceRoot, isRoot) {
  if (!node.visible) return;
  const inInstance = Boolean(instanceRoot);
  if (!isRoot && !inInstance) checkBounds(node);
  if (node.type === "TEXT") {
    if (!inInstance) { checkTextStyle(node); checkPaints(node); checkShiftedText(node); await checkOnWhiteSolid(node); await checkOnSolid(node); }
    checkText(node, instanceRoot);
    return;
  }
  if (node.type === "INSTANCE") {
    if (!inInstance) await checkInstanceOverrides(node);
    if (!inInstance && /^ic(on)?-/i.test(node.name)) { await checkOnWhiteSolid(node); await checkOnSolid(node); }
    if (!inInstance) await checkSolidPairing(node);
    if (!inInstance && footerActionHugs(node)) report("list-box/footer-action-hug", ERROR, node, "the footer Button hugs on a desktop or tablet screen: set its width to Fill (Hug only on mobile)");
    if (!inInstance) await checkBadgeCount(node);
  } else if (!inInstance && node.type !== "COMPONENT_SET") {
    // A component set's own frame (its dashed stroke, padding and corner) is Figma's documentation chrome, not design.
    checkPaints(node);
    checkSpacing(node);
    checkRadius(node);
    checkEffects(node);
    checkStrokeClip(node);
    checkConcentric(node);
    if (!isRoot) checkAuthoredShape(node);
  }
  if (!("children" in node)) return;
  // A slot's children are authored again; any other child of an instance belongs to its component.
  const nextRoot = node.type === "SLOT" ? null : node.type === "INSTANCE" ? (instanceRoot ?? node) : instanceRoot;
  for (const child of node.children) await walk(child, nextRoot, false);
}

const roots = [];
for (const id of ROOT_IDS) {
  const node = await figma.getNodeByIdAsync(id);
  if (!node) throw new Error(`No node ${id} in this file (use the node-id of the frame's URL, "-" → ":")`);
  roots.push(node);
}
if (!roots.length) roots.push(...figma.currentPage.selection);
if (!roots.length) throw new Error("Nothing to check: put frame ids in ROOT_IDS or select the screens first");
const page = roots[0].type === "PAGE" ? roots[0] : (() => { let p = roots[0]; while (p && p.type !== "PAGE") p = p.parent; return p; })();
if (page && page !== figma.currentPage) await figma.setCurrentPageAsync(page);
rootIds = new Set(roots.map((root) => root.id));

for (const root of roots) await walk(root, root.type === "INSTANCE" ? root : null, true);
for (const root of roots) checkShadowClips(root);
for (const root of roots) await checkThemePairing(root);
for (const root of roots) await checkModeOverrides(root);
for (const root of roots) await checkBackChevron(root);
for (const root of roots) await checkButtonRoles(root);
for (const root of roots) await checkTouchSpacing(root);
for (const root of roots) await checkSectionGap(root);
for (const root of roots) await checkClosingList(root);
for (const root of roots) await checkNavIcons(root);
for (const root of roots) await checkFloatingBarFit(root);
for (const root of roots) await checkStatusInBar(root);
for (const root of roots) await checkEmptyStateSize(root);
for (const root of roots) await checkCollapseBesideMasterCrumb(root);
for (const root of roots) checkRowDrift(root);
for (const root of roots) await checkControlGap(root);

const total = (severity) => Object.keys(counts).filter((rule) => severityOf[rule] === severity).reduce((sum, rule) => sum + counts[rule], 0);
const result = {
  checked: roots.map((root) => `${root.name} (${root.id})`),
  errors: total(ERROR),
  warnings: total(WARNING),
  counts,
  shown: `${findings.length} findings (${MAX_PER_RULE} per rule at most; fix them and run again for the rest)`,
  findings: findings.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === ERROR ? -1 : 1)),
};
// ASCII only: use_figma answers with many non-ASCII characters get cut short.
const text = JSON.stringify(result).replace(/[\u0080-\uffff]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`);
return text.length > 18000 ? `${text.slice(0, 18000)}... (cut: lower MAX_PER_RULE or check fewer screens)` : text;

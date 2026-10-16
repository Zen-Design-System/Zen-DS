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
//   effect/no-style          error    a shadow or blur with no Zen effect style
//   layout/absolute          warning  a frame with 2+ children and no auto layout
//   shape/loose              warning  a hand-drawn shape outside any component (use a Zen component or a local one)
//   component/detached       warning  a frame named like a Zen component that is not an instance (detached)
//   bounds/overflow          error    a layer sticking out of its parent (also when the parent does not clip; a centred
//                                     button bleeding out of a non-clipping icon-size wrapper is Zen's design)
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
//                                     page's Canvas: Default → Surface/Default (Flat, Shadow, Border); Alt → Pale,
//                                     Surface/Default with a Pale border, Surface/Alt; Flat → Pale, Surface/Flat with a
//                                     Pale border. No gradient box (Semi-Pale, Gradient): one box per row stands out
//                                     with Solid or a Support/<Hue>/Subtle fill
//   theme/navigation-surface error    a header, Sidebar or top/bottom bar that does not match the Canvas (no fill, or
//                                     the Surface of the Canvas's colour); only on Canvas/Default may the Sidebar or the
//                                     Bottom-Navigation be a Surface/Default panel
//   theme/mixed-elevation    error    a shadow on a Canvas/Alt or Canvas/Flat screen, or on Canvas/Default some of the
//                                     Sidebar, bars and boxes cast one and others do not
//   theme/mixed-boxes        warning  one screen mixes box families (Flat, Border, Pale)
//   theme/mode-override      error    a layer inside the screen (a component, card or frame) sets its own Light/Dark
//                                     colour mode: only the screen frame does; a dark widget is Card Solid/Neutral
//   theme/on-white-solid     error    text or an icon on a Background/White-Solid fill (white in Light and Dark mode)
//                                     that is not Content/On-White-Overlay/*: Neutral and Inverse flip with the mode
//   navigation/back-chevron  error    a left arrow (icon-arrow-left-*, icon-arrow-narrow-left-*) as Back in a Top-Navigation,
//                                     Nav-Action or Button on a phone or tablet screen: Back is icon-chevron-left-line-medium

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
    if (isBleed(node, own, frame)) return;
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
        const cut = `shadow cut on the ${side(shadow, frame)} by ${clipper.name}`;
        if (authored(clipper)) report("bounds/shadow-clipped", ERROR, node, `${cut} (turn its Clip content off or give the shadow room)`);
        else report("bounds/shadow-clipped-in-component", WARNING, node, cut);
        break;
      }
    }
    if (!("children" in node)) continue;
    const next = node !== root && "clipsContent" in node && node.clipsContent ? [node, ...clippers] : clippers;
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
      report("theme/box-on-canvas", ERROR, box, `${kind} box: no gradients, colour boxes are Pale; to stand out use Solid or a Support/<Hue>/Subtle fill`);
      continue;
    }
    if (kind === "Subtle" || kind === "Solid" || kind === "Solid Neutral") continue; // a highlight widget, one per row (Card rules)
    const family = kind === "Pale" ? kind : border ? "Border" : "Flat";
    families.add(family);
    const allowed = {
      Default: kind === "Surface/Default",
      Alt: kind === "Pale" || kind === "Surface/Alt" || (kind === "Surface/Default" && border),
      Flat: kind === "Pale" || (kind === "Surface/Flat" && border),
    }[canvas];
    if (!allowed) {
      const fix = { Default: "Surface/Default (Theme Flat, Shadow or Border)", Alt: "Pale, Surface=Alt, or Theme=Border on Surface/Default", Flat: "Pale or Theme=Border with Surface=Flat" }[canvas];
      report("theme/box-on-canvas", ERROR, box, `${kind}${border ? " with a border" : ""} on Canvas/${canvas}: use ${fix}`);
    }
  }
  for (const { node, role, panel } of bars) {
    const kind = await surfaceKind(node);
    const seamless = kind === "none" || kind === `Canvas/${canvas}` || kind === CANVAS_TWIN[canvas];
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
  const screens = root.type === "SECTION" ? root.children : [root];
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
  const screens = root.type === "SECTION" ? root.children.filter((child) => "findAll" in child) : [root];
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

async function walk(node, instanceRoot, isRoot) {
  if (!node.visible) return;
  const inInstance = Boolean(instanceRoot);
  if (!isRoot && !inInstance) checkBounds(node);
  if (node.type === "TEXT") {
    if (!inInstance) { checkTextStyle(node); checkPaints(node); checkShiftedText(node); await checkOnWhiteSolid(node); }
    checkText(node, instanceRoot);
    return;
  }
  if (node.type === "INSTANCE") {
    if (!inInstance) await checkInstanceOverrides(node);
    if (!inInstance && /^ic(on)?-/i.test(node.name)) await checkOnWhiteSolid(node);
    if (!inInstance && footerActionHugs(node)) report("list-box/footer-action-hug", ERROR, node, "the footer Button hugs on a desktop or tablet screen: set its width to Fill (Hug only on mobile)");
  } else if (!inInstance) {
    checkPaints(node);
    checkSpacing(node);
    checkRadius(node);
    checkEffects(node);
    checkStrokeClip(node);
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

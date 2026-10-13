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
//   bounds/shadow-clipped    warning  a shadow cut off by a clipping parent
//   text/overflow            error    text taller than its fixed box, or sticking out of its instance
//   text/crushed             error    text squeezed into a box narrower than a few characters
//   copy/placeholder         warning  lorem ipsum or a bare default label left in the screen

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
  if (parent.clipsContent && node.absoluteRenderBounds && "effects" in node && node.effects.some((effect) => effect.visible !== false && effect.type === "DROP_SHADOW") && sticksOut(node.absoluteRenderBounds, frame)) {
    report("bounds/shadow-clipped", WARNING, node, `shadow cut on the ${side(node.absoluteRenderBounds, frame)} by ${parent.name}`);
  }
}

const PLACEHOLDER = /lorem|ipsum|dolor sit/i;
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
  if (PLACEHOLDER.test(characters)) report("copy/placeholder", WARNING, node, `“${characters.slice(0, 24)}”`);
  else if (!instanceRoot && DEFAULT_LABELS.has(characters)) report("copy/placeholder", WARNING, node, `“${characters}”`);
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

async function walk(node, instanceRoot, isRoot) {
  if (!node.visible) return;
  const inInstance = Boolean(instanceRoot);
  if (!isRoot && !inInstance) checkBounds(node);
  if (node.type === "TEXT") {
    if (!inInstance) { checkTextStyle(node); checkPaints(node); }
    checkText(node, instanceRoot);
    return;
  }
  if (node.type === "INSTANCE") {
    if (!inInstance) await checkInstanceOverrides(node);
  } else if (!inInstance) {
    checkPaints(node);
    checkSpacing(node);
    checkRadius(node);
    checkEffects(node);
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

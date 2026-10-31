// The Prototype tab's actions as Figma's reactions, both ways (user 2026-10-23: "push mọi Screen và Overlay thành frame,
// kèm reaction Navigate / Open / Close overlay / Back"). Pure: figma-push writes `reactions` on the nodes, the Zen plugin
// (studio-import.js applyReactions) makes them Figma's with setReactionsAsync, and figma-pull reads them back.
//
//   A node's reaction (push and pull share it):
//     { trigger: "ON_CLICK" | "ON_HOVER" | "AFTER_TIMEOUT", timeout?: seconds,
//       action: "NAVIGATE" | "OVERLAY" | "CLOSE" | "BACK", to?: "screen:<id>[:<state>]" | "overlay:<id>",
//       transition?: { type: "DISSOLVE" | "MOVE_IN" | "PUSH" | "SLIDE_IN", direction?: "LEFT" | "RIGHT" | "TOP" | "BOTTOM",
//                      duration: seconds, easing: [x1, y1, x2, y2] },
//       layer?: a nested layer's path in the instance (a Dialog's Primary button), or its names one by one }
//   With prototype variables (W-52 B3, docs/research/studio-prototype-variables-2026-10-31.md §4) a reaction holds several
//   actions instead of one: { trigger, timeout?, layer?, actions: Action[] }, Figma's several actions, Set variable and
//   Conditional:
//     Action = { action: "NAVIGATE" | "OVERLAY" | "CLOSE" | "BACK", to?, transition? }
//            | { action: "SET_VARIABLE", variable: name, value: Data }
//            | { action: "CONDITIONAL", blocks: [{ condition?: Data, actions: Action[] }] }   (the last block's no
//                                                                                            condition: else)
//     Data   = { type: "STRING" | "FLOAT" | "BOOLEAN", value } | { type: "VARIABLE", name, resolvedType }
//            | { type: "EXPRESSION", fn: Figma's ExpressionFunction, args: Data[], resolvedType }
//   The package names a variable; the plugin finds or makes it in the page's collection (figma-push `variables`).
//
// The Studio's own words (src/platform/studio/builder/proto/protoModel.ts): an action is `proto.<action>(target?,
// options?)`, its trigger the prop it sits in (onClick, whileHovering; a Screen's onDelay), its options { animation,
// direction, duration, delay }. Instant has no transition (Figma's Instant). Figma has no Show toast, Open link (here),
// Filter table or Change step: they stay in the Studio, with a note.

/** Motion/Duration (tokens/source/motion.json, ms) and the curve Play animates with (Motion/Ease/Emphasized). */
export const DURATION_MS = { fast: 120, base: 200, slow: 280 };
export const EASING = [0.16, 1, 0.3, 1];
export const DEFAULT_DELAY_MS = 800;

/** The Studio's trigger props as Figma's triggers. */
export const TRIGGERS = { onClick: "ON_CLICK", whileHovering: "ON_HOVER", onDelay: "AFTER_TIMEOUT" };
const TRANSITIONS = { dissolve: "DISSOLVE", move: "MOVE_IN", push: "PUSH", slide: "SLIDE_IN" };
const DIRECTIONS = { left: "LEFT", right: "RIGHT", up: "TOP", down: "BOTTOM" };
const ANIMATIONS = ["instant", "dissolve", "move", "push", "slide"];
const MOVES = new Set(["move", "push", "slide"]);

/** Where an action keeps its options: after its target (navigate, open), first for close and back (protoModel optionsAt). */
const optionsOf = (action, args) => {
  const raw = args?.[action === "close" || action === "back" ? 0 : 1];
  return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
};

/** A frame id the push writes (figma-clip.mjs onlyFrame): a Screen's, a Screen state's, an Overlay's. */
export const screenFrameId = (target) => `screen:${String(target)}`;
export const overlayFrameId = (target) => `overlay:${String(target)}`;

/** Figma's transition for an action's options (none for Instant). */
export function transitionOf(options = {}) {
  const animation = ANIMATIONS.includes(options.animation) ? options.animation : "dissolve";
  if (animation === "instant") return null;
  const duration = (DURATION_MS[options.duration] ?? DURATION_MS.base) / 1000;
  return {
    type: TRANSITIONS[animation],
    ...(MOVES.has(animation) ? { direction: DIRECTIONS[options.direction] ?? DIRECTIONS.left } : {}),
    duration,
    easing: [...EASING],
  };
}

/**
 * One proto action (`{ action, args }`, a prop's value) under `trigger` (the prop's name) as a node's reaction, or
 * `{ note }` saying why Figma does not take it.
 */
export function reactionOf(trigger, proto) {
  const figmaTrigger = TRIGGERS[trigger];
  const action = proto?.action;
  const args = proto?.args ?? [];
  if (!figmaTrigger) return { note: `${trigger}: Figma has no such trigger (On click, While hovering and After delay go)` };
  if (!["navigate", "open", "close", "back"].includes(action)) return { note: `${action}: Figma has no such action (it stays in the Studio's Prototype tab)` };
  if (figmaTrigger === "ON_HOVER" && action !== "open") return { note: `While hovering ${action}: Figma's While hovering opens an overlay only` };
  const options = optionsOf(action, args);
  const timing = figmaTrigger === "AFTER_TIMEOUT" ? { timeout: (typeof options.delay === "number" && options.delay >= 0 ? options.delay : DEFAULT_DELAY_MS) / 1000 } : {};
  if (action === "close") return { trigger: figmaTrigger, ...timing, action: "CLOSE" };
  if (action === "back") return { trigger: figmaTrigger, ...timing, action: "BACK" };
  const target = args[0];
  if (typeof target !== "string" || !target) return { note: `${action}: a target per item (each item its own frame) is not pushed` };
  const transition = transitionOf(options);
  return {
    trigger: figmaTrigger,
    ...timing,
    action: action === "open" ? "OVERLAY" : "NAVIGATE",
    to: action === "open" ? overlayFrameId(target) : screenFrameId(target),
    ...(transition ? { transition } : {}),
  };
}

/** Figma's expression functions by the operators of a page's expressions (proto-vars.mjs). */
export const EXPRESSION_FUNCTIONS = { "+": "ADDITION", "-": "SUBTRACTION", "*": "MULTIPLICATION", "/": "DIVISION", "===": "EQUALS", "!==": "NOT_EQUAL", "<": "LESS_THAN", "<=": "LESS_THAN_OR_EQUAL", ">": "GREATER_THAN", ">=": "GREATER_THAN_OR_EQUAL", "&&": "AND", "||": "OR", "!": "NOT" };
/** Figma's variable types by the kinds of a page's variables. */
export const RESOLVED_TYPES = { text: "STRING", number: "FLOAT", boolean: "BOOLEAN" };
const LITERAL_TYPE = (value) => (typeof value === "string" ? "STRING" : typeof value === "number" ? "FLOAT" : typeof value === "boolean" ? "BOOLEAN" : null);

/**
 * An operand of a page's expressions (proto-vars.mjs) as Figma's variable data, or null when Figma cannot hold it (a
 * .map row's field, an unknown variable). `vars`: the page's variables and their start values.
 */
export function variableDataOf(operand, vars = {}) {
  const literal = LITERAL_TYPE(operand);
  if (literal) return { type: literal, value: operand };
  if (!operand || typeof operand !== "object") return null;
  if (operand.kind === "ref") {
    const name = operand.root === "vars" ? operand.path?.[0] : null;
    const type = name && Object.hasOwn(vars, name) ? LITERAL_TYPE(vars[name]) : null;
    return type ? { type: "VARIABLE", name, resolvedType: type } : null;
  }
  if (operand.kind !== "expr" || !EXPRESSION_FUNCTIONS[operand.op]) return null;
  const args = operand.args.map((arg) => variableDataOf(arg, vars));
  if (args.includes(null)) return null;
  const typeOf = (data) => data.resolvedType ?? data.type;
  const logic = ["===", "!==", "<", "<=", ">", ">=", "&&", "||", "!"].includes(operand.op);
  const resolvedType = logic ? "BOOLEAN" : operand.op === "+" && args.some((arg) => typeOf(arg) === "STRING") ? "STRING" : "FLOAT";
  return { type: "EXPRESSION", fn: EXPRESSION_FUNCTIONS[operand.op], args, resolvedType };
}

/**
 * A trigger's action (`{ action, args }`) as Figma's reaction, Set variable, Conditional and several actions included
 * (W-52 B3): the one-action reaction (reactionOf) when it is one action Figma has, else `{ trigger, actions }`. An action
 * Figma has no word for (Show toast, Filter table…) is left out of the list and named in `skipped`; `{ note }` when
 * nothing is left.
 */
export function reactionOfValue(trigger, proto, vars = {}) {
  if (!["set", "if", "run"].includes(proto?.action)) return reactionOf(trigger, proto);
  const figmaTrigger = TRIGGERS[trigger];
  if (!figmaTrigger) return { note: `${trigger}: Figma has no such trigger (On click, While hovering and After delay go)` };
  if (figmaTrigger === "ON_HOVER") return { note: "While hovering: Figma's While hovering opens an overlay only" };
  const skipped = [];
  const actionsOf = (value) => {
    if (!value || typeof value !== "object" || value.kind !== "proto") return [];
    if (value.action === "run") return value.args.flatMap(actionsOf);
    if (value.action === "set") {
      const [name, to] = value.args;
      const data = variableDataOf(to, vars);
      if (typeof name !== "string" || !Object.hasOwn(vars, name) || !data) { skipped.push(`Set variable ${name}: its value reads a row of the page data, which Figma has not`); return []; }
      return [{ action: "SET_VARIABLE", variable: name, value: data }];
    }
    if (value.action === "if") {
      const [condition, then, otherwise] = value.args;
      const data = variableDataOf(condition, vars);
      if (!data) { skipped.push("Conditional: its condition reads a row of the page data, which Figma has not"); return []; }
      return [{ action: "CONDITIONAL", blocks: [{ condition: data, actions: actionsOf(then) }, ...(otherwise ? [{ actions: actionsOf(otherwise) }] : [])] }];
    }
    const one = reactionOf(trigger, value);
    if (one.note) { skipped.push(one.note); return []; }
    const { trigger: _trigger, timeout: _timeout, ...action } = one;
    return [action];
  };
  const actions = actionsOf(proto);
  const delay = optionsOf(proto.action, proto.args).delay;
  const timing = figmaTrigger === "AFTER_TIMEOUT" ? { timeout: (typeof delay === "number" && delay >= 0 ? delay : DEFAULT_DELAY_MS) / 1000 } : {};
  if (!actions.length) return { note: skipped.join("; ") || "no action Figma has" };
  return { trigger: figmaTrigger, ...timing, actions, ...(skipped.length ? { skipped } : {}) };
}

/** A reaction read back (figma-pull) as the Studio's trigger prop and action code, or `{ note }`. */
export function protoOfReaction(reaction) {
  const prop = Object.entries(TRIGGERS).find(([, figma]) => figma === reaction?.trigger)?.[0];
  if (!prop) return { note: `a ${String(reaction?.trigger ?? "trigger").toLowerCase().replace(/_/g, " ")} reaction: the Studio has no such trigger` };
  const options = {};
  const transition = reaction.transition;
  if (reaction.action === "NAVIGATE" || reaction.action === "OVERLAY") {
    if (!transition) options.animation = "instant";
    else {
      const animation = Object.entries(TRANSITIONS).find(([, figma]) => figma === transition.type)?.[0];
      if (animation && animation !== "dissolve") options.animation = animation;
      const direction = Object.entries(DIRECTIONS).find(([, figma]) => figma === transition.direction)?.[0];
      if (animation && MOVES.has(animation) && direction && direction !== "left") options.direction = direction;
      const ms = Math.round((transition.duration ?? 0) * 1000);
      const duration = Object.entries(DURATION_MS).find(([, value]) => value === ms)?.[0];
      if (duration && duration !== "base") options.duration = duration;
    }
  }
  if (reaction.trigger === "AFTER_TIMEOUT") {
    const ms = Math.round((reaction.timeout ?? DEFAULT_DELAY_MS / 1000) * 1000);
    options.delay = ms;
  }
  const extra = Object.keys(options).length ? options : null;
  const target = (to, kind) => {
    const match = new RegExp(`^${kind}:(.+)$`).exec(String(to ?? ""));
    return match ? match[1] : null;
  };
  if (reaction.action === "CLOSE") return { prop, action: "close", args: extra ? [extra] : [] };
  if (reaction.action === "BACK") return { prop, action: "back", args: extra ? [extra] : [] };
  if (reaction.action === "OVERLAY") {
    const id = target(reaction.to, "overlay");
    return id ? { prop, action: "open", args: extra ? [id, extra] : [id] } : { note: "Open overlay: its overlay is not a Studio frame" };
  }
  if (reaction.action === "NAVIGATE") {
    const id = target(reaction.to, "screen");
    return id ? { prop, action: "navigate", args: extra ? [id, extra] : [id] } : { note: "Navigate to: its frame is not a Studio Screen" };
  }
  return { note: `${String(reaction.action ?? "an action").toLowerCase()}: the Studio has no such action` };
}

/**
 * Where an overlay component's actions sit in its Figma instance (read in the Zen file, 2026-10-24): a reaction on
 * `primaryAction.onClick` goes on that button. Modal/Dialog and Side-Panel Type=Modal share .Primitives/Modal/Actions;
 * Bottom-Sheet Type=Modal's Footer holds two layers both named "Button/Main" (Dual, Tertiary then Primary), a name with a
 * slash, so its path is its names one by one. Any other component's actions are a note.
 */
const MODAL_ACTIONS = { primaryAction: "Container/Actions/Buttons/Container/Primary", secondaryAction: "Container/Actions/Buttons/Container/Secondary" };
const SHEET_ACTIONS = { primaryAction: ["Container", "Footer", "Buttons", "Button/Main[1]"], secondaryAction: ["Container", "Footer", "Buttons", "Button/Main[0]"] };
export const ACTION_LAYERS = { Dialog: MODAL_ACTIONS, SidePanel: MODAL_ACTIONS, BottomSheet: SHEET_ACTIONS };

/** An Overlay's own props (the Prototype tab's overlay settings; its x / y place it on the board). */
export const OVERLAY_PROPS = ["position", "background", "closeOnOutside", "x", "y"];
/** Figma's overlay positions in its words, by the Studio's (PrototypePanel POSITIONS; Center is Figma's default). */
export const OVERLAY_POSITION_WORDS = {
  manual: "Manual (next to the layer that opens it)", top: "Top center", bottom: "Bottom center",
  "top-left": "Top left", "top-right": "Top right", "bottom-left": "Bottom left", "bottom-right": "Bottom right",
};
/** What places itself in an Overlay, and where that is in Figma's words (a Dialog: Center, the default). */
export const OVERLAY_PLACES = { BottomSheet: "Bottom center", SidePanel: "Top right" };

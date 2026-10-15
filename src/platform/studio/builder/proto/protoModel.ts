import type { PageNode, PageTree, PageValue } from "../render/renderPage";

/*
 * What the Prototype tab, the canvas connections (ProtoLinks) and Play read from a builder page's tree: its frames, the
 * events a layer takes (its triggers) and the actions written on them (`proto.*(…)` props), in design words (Figma's
 * "On click", "Navigate to"). Pure: no React, no store, no API data (the triggers a component takes are in
 * protoTriggers.ts), so protoModel.selftest.mjs runs it in Node.
 *
 * A choice control (BottomNavigation, Tabs, Segmented, ChipGroup, Sidebar, Menu…) hands the chosen item to its trigger;
 * its action can lead each item somewhere else: `onValueChange={proto.navigate({ home: "screen-1", files: "screen-2" })}`
 * (an item without an entry goes nowhere; runtime.tsx protoHandler picks the entry by the value or the item's id).
 */

export type ProtoAction = "none" | "navigate" | "open" | "close" | "back" | "toast" | "link";
export const ACTIONS: ReadonlyArray<{ value: ProtoAction; label: string }> = [
  { value: "none", label: "None" },
  { value: "navigate", label: "Navigate to" },
  { value: "open", label: "Open overlay" },
  { value: "close", label: "Close overlay" },
  { value: "back", label: "Back" },
  { value: "toast", label: "Show toast" },
  { value: "link", label: "Open link" },
];

/** Figma's trigger names where a prop has one; else the prop in words ("onRowClick" → "On row click"). A phone or tablet
 *  screen is tapped. */
const TRIGGER_WORDS: Record<string, string> = {
  onClick: "On click",
  onDelay: "After delay",
  whileHovering: "While hovering",
  onValueChange: "On change",
  onCheckedChange: "On toggle",
  onOpenChange: "On open or close",
  onSelect: "On select",
  onSubmit: "On submit",
  onClose: "On close",
  onDismiss: "On dismiss",
  onBack: "On back",
};
export function triggerLabel(trigger: string, touch = false): string {
  if (trigger === "onClick" && touch) return "On tap";
  if (TRIGGER_WORDS[trigger]) return TRIGGER_WORDS[trigger];
  const words = trigger.replace(/^on/, "").replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();
  return `On ${words}`;
}

/** Pseudo triggers the Studio adds (Figma's): After delay on a Screen (Play runs it once the screen shows; `delay` in
 *  the action's options, ms) and While hovering on a layer that takes the pointer (Play opens the overlay while the
 *  pointer is over it). renderPage keeps both off the components. */
export const DELAY_TRIGGER = "onDelay";
export const HOVER_TRIGGER = "whileHovering";
/** The actions a trigger offers: While hovering shows an overlay for as long as the pointer stays. */
export const actionsFor = (trigger: string) => (trigger === HOVER_TRIGGER ? ACTIONS.filter((entry) => entry.value === "none" || entry.value === "open") : ACTIONS);

/** Figma's animations between frames (Smart animate aside): the next one fades in (Dissolve), moves in over the current
 *  one (Move in), pushes it out (Push) or slides in while the current one shifts a little (Slide in). Back plays the
 *  way in backwards. No animation written = Dissolve (Play's look before animations could be picked). */
export type ProtoAnimation = "instant" | "dissolve" | "move" | "push" | "slide";
export const ANIMATIONS: ReadonlyArray<{ value: ProtoAnimation; label: string }> = [
  { value: "instant", label: "Instant" },
  { value: "dissolve", label: "Dissolve" },
  { value: "move", label: "Move in" },
  { value: "push", label: "Push" },
  { value: "slide", label: "Slide in" },
];
export const DEFAULT_ANIMATION: ProtoAnimation = "dissolve";
/** Which way it moves (Figma's arrows); the next frame comes from the other side. */
export type ProtoDirection = "left" | "right" | "up" | "down";
export const DIRECTIONS: ReadonlyArray<ProtoDirection> = ["left", "right", "up", "down"];
export const DEFAULT_DIRECTION: ProtoDirection = "left";
/** Motion/Duration tokens (tokens/source/motion.json). */
export type ProtoDuration = "fast" | "base" | "slow";
export const DURATIONS: ReadonlyArray<ProtoDuration> = ["fast", "base", "slow"];
export const DEFAULT_DURATION: ProtoDuration = "base";
export const DEFAULT_DELAY = 800;
/** An action's options: its animation, and (After delay) how long the screen shows first. */
export type ProtoOptions = { animation?: ProtoAnimation; direction?: ProtoDirection; duration?: ProtoDuration; delay?: number };
export const moves = (animation: ProtoAnimation | undefined) => animation === "move" || animation === "push" || animation === "slide";

/** Where an action keeps its options: after its target (navigate, open, toast, link), else first (close, back). */
const optionsAt = (action: string) => (action === "close" || action === "back" ? 0 : 1);
/** An action's options (only the known ones, valid values). */
export function optionsOf(action: string, args: readonly unknown[]): ProtoOptions {
  const raw = args[optionsAt(action)];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const value = raw as Record<string, unknown>;
  const out: ProtoOptions = {};
  if (ANIMATIONS.some((entry) => entry.value === value.animation)) out.animation = value.animation as ProtoAnimation;
  if (DIRECTIONS.includes(value.direction as ProtoDirection)) out.direction = value.direction as ProtoDirection;
  if (DURATIONS.includes(value.duration as ProtoDuration)) out.duration = value.duration as ProtoDuration;
  if (typeof value.delay === "number" && Number.isFinite(value.delay) && value.delay >= 0) out.delay = value.delay;
  return out;
}

/** The options as written: defaults left out (Dissolve, left, base); direction only for an animation that moves. */
function writtenOptions(options: ProtoOptions | undefined): ProtoOptions | null {
  if (!options) return null;
  const out: ProtoOptions = {};
  if (options.animation && options.animation !== DEFAULT_ANIMATION) out.animation = options.animation;
  if (moves(options.animation) && options.direction && options.direction !== DEFAULT_DIRECTION) out.direction = options.direction;
  if (options.animation !== "instant" && options.duration && options.duration !== DEFAULT_DURATION) out.duration = options.duration;
  if (options.delay !== undefined) out.delay = options.delay;
  return Object.keys(out).length ? out : null;
}

const IDENT = /^[A-Za-z_$][\w$]*$/;
const keyCode = (key: string) => (IDENT.test(key) ? key : JSON.stringify(key));
const objectCode = (value: Record<string, unknown>) => {
  const entries = Object.entries(value).filter((entry) => entry[1] !== undefined);
  return `{${entries.length ? ` ${entries.map(([key, field]) => `${keyCode(key)}: ${JSON.stringify(field)}`).join(", ")} ` : ""}}`;
};

/** `proto.<action>(target?, options?)`: a target per item as `{ item: target }`; a toast's title as `{ title }`. */
export function protoActionCode(action: Exclude<ProtoAction, "none">, target?: string | Record<string, string | undefined>, options?: ProtoOptions): string {
  const extra = writtenOptions(options);
  const args: string[] = [];
  if (action === "toast") args.push(objectCode({ title: typeof target === "string" ? target : "" }));
  else if (action === "navigate" || action === "open" || action === "link") args.push(typeof target === "object" ? objectCode(target) : JSON.stringify(target ?? ""));
  if (extra) args.push(objectCode(extra));
  return `proto.${action}(${args.join(", ")})`;
}

/** A prop's value as a prototype action, or null (unset, or code of its own). */
export const protoOf = (value: PageValue | undefined): { action: ProtoAction; args: unknown[] } | null => (value?.kind === "proto" ? { action: value.action as ProtoAction, args: value.args } : null);

/** The trigger a drag from the layer's ⊕ writes: the one already leading to a frame, else (a choice control) the one
 *  that hands over the chosen item, else On click, else the first. */
export function connectTrigger(node: PageNode, triggers: string[]): string | null {
  // While hovering is never the ⊕'s: it shows an overlay only while the pointer stays.
  const leading = triggers.find((trigger) => {
    const proto = trigger === HOVER_TRIGGER ? null : protoOf(node.props[trigger]);
    return proto && (proto.action === "navigate" || proto.action === "open");
  });
  if (leading) return leading;
  const item = choiceItemsOf(node).length ? ITEM_TRIGGER_ORDER.find((trigger) => triggers.includes(trigger)) : undefined;
  return item ?? (triggers.includes("onClick") ? "onClick" : triggers.find((trigger) => trigger !== HOVER_TRIGGER) ?? null);
}

/** The Board's frame node a canvas frame id names ("screen:<id>[:<state>]", "overlay:<id>"), or null. */
export function frameNodeOf(tree: PageTree | null, frameId: string | null | undefined): PageNode | null {
  if (!frameId) return null;
  const [kind, id, state] = frameId.split(":");
  return (tree?.board?.children ?? []).find((child): child is PageNode => child.kind === "element" && child.name === (kind === "overlay" ? "Overlay" : "Screen") && literalOf(child, "id") === id && (kind === "overlay" || literalOf(child, "state") === (state || undefined))) ?? null;
}

/** Triggers that hand their handler the chosen item (its value, or the item with its id), most specific first. */
const ITEM_TRIGGER_ORDER = ["onValueChange", "onSelect", "onItemClick", "onNavigate", "onChange"];
const ITEM_TRIGGERS: ReadonlySet<string> = new Set(ITEM_TRIGGER_ORDER);

/** One item of a choice control: the value its trigger reports, and the label the designer reads. */
export type ChoiceItem = { value: string; label: string };

const fieldText = (value: PageValue | undefined) => (value?.kind === "literal" && (typeof value.value === "string" || typeof value.value === "number") ? String(value.value) : undefined);
const literalText = (value: unknown) => (typeof value === "string" || typeof value === "number" ? String(value) : undefined);

/** An item's value and label from its fields (`id` / `value` / `key`, `label` / `title` / `name`). */
function itemOf(read: (field: string) => string | undefined, text?: string): ChoiceItem | null {
  const value = read("id") ?? read("value") ?? read("key");
  const label = read("label") ?? read("title") ?? read("name") ?? text ?? value;
  return value !== undefined && label !== undefined ? { value, label } : null;
}

/** A choice control's items: its `items` / `options` list (objects or plain values), else its children that name an
 *  id (SidebarMenuItem, TabItem, MenuItem…). Empty for any other layer. */
export function choiceItemsOf(node: PageNode): ChoiceItem[] {
  for (const prop of ["items", "options"]) {
    const list = node.props[prop];
    if (list?.kind === "array") {
      const items = list.items.map((entry) => (entry.kind === "object" ? itemOf((field) => fieldText(entry.fields[field])) : entry.kind === "element" ? itemOf((field) => fieldText(entry.node.props[field])) : entry.kind === "literal" && literalText(entry.value) !== undefined ? { value: literalText(entry.value)!, label: literalText(entry.value)! } : null));
      if (items.length && items.every(Boolean)) return items as ChoiceItem[];
    }
    if (list?.kind === "literal" && Array.isArray(list.value)) {
      const items = list.value.map((entry) => (entry && typeof entry === "object" ? itemOf((field) => literalText((entry as Record<string, unknown>)[field])) : literalText(entry) !== undefined ? { value: literalText(entry)!, label: literalText(entry)! } : null));
      if (items.length && items.every(Boolean)) return items as ChoiceItem[];
    }
  }
  const children = node.children.filter((child): child is PageNode => child.kind === "element");
  const items = children.map((child) => {
    const text = child.children.map((part) => (part.kind === "text" ? part.value : "")).join("").trim() || undefined;
    return itemOf((field) => fieldText(child.props[field]), text);
  });
  return items.length >= 2 && items.every(Boolean) ? items as ChoiceItem[] : [];
}

/** Does `trigger` hand over the chosen item of this layer (so its action can lead each item elsewhere)? */
export const isItemTrigger = (node: PageNode, trigger: string) => ITEM_TRIGGERS.has(trigger) && choiceItemsOf(node).length > 0;

/** An action's per-item targets: a `{ item: target }` argument as a map, a single target as the same target for every
 *  item; null when it names none. */
export function targetsByItem(arg: unknown, items: ChoiceItem[]): Record<string, string> | null {
  if (typeof arg === "string") return Object.fromEntries(items.map((item) => [item.value, arg]));
  if (arg && typeof arg === "object" && !Array.isArray(arg)) return Object.fromEntries(Object.entries(arg as Record<string, unknown>).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
  return null;
}

/** `proto.navigate({ home: "screen-1", … })`: an action leading each item to its own target (items without one left out). */
export function itemActionCode(action: "navigate" | "open", targets: Record<string, string | undefined>, options?: ProtoOptions): string {
  return protoActionCode(action, targets, options);
}

/** The node at `loc` (props, children, list rows and element-valued props included). */
export function findNode(tree: PageTree | null, loc: string): PageNode | null {
  const stack: PageNode[] = tree?.board ? [tree.board] : [];
  while (stack.length) {
    const node = stack.pop()!;
    if (node.loc === loc) return node;
    for (const child of node.children) {
      if (child.kind === "element") stack.push(child);
      else if (child.kind === "map") stack.push(child.node);
    }
    const values: PageValue[] = Object.values(node.props);
    while (values.length) {
      const value = values.pop()!;
      if (value.kind === "element") stack.push(value.node);
      else if (value.kind === "array") values.push(...value.items);
      else if (value.kind === "object") values.push(...Object.values(value.fields));
    }
  }
  return null;
}

/** The layer that holds the one at `loc` (as a child or in a prop's value), or null. */
export function parentOf(tree: PageTree | null, loc: string): PageNode | null {
  const stack: PageNode[] = tree?.board ? [tree.board] : [];
  while (stack.length) {
    const node = stack.pop()!;
    const inner: PageNode[] = [];
    for (const child of node.children) {
      if (child.kind === "element") inner.push(child);
      else if (child.kind === "map") inner.push(child.node);
    }
    const values: PageValue[] = Object.values(node.props);
    while (values.length) {
      const value = values.pop()!;
      if (value.kind === "element") inner.push(value.node);
      else if (value.kind === "array") values.push(...value.items);
      else if (value.kind === "object") values.push(...Object.values(value.fields));
    }
    if (inner.some((child) => child.loc === loc)) return node;
    stack.push(...inner);
  }
  return null;
}

/** A layer that is one item of a choice control (a SidebarMenuItem in its Sidebar, an item element in a list): that
 *  control and the item's value. */
export function itemOwnerOf(tree: PageTree | null, node: PageNode): { owner: PageNode; item: string } | null {
  const owner = parentOf(tree, node.loc);
  const value = literalOf(node, "id") ?? literalOf(node, "value");
  if (!owner || (typeof value !== "string" && typeof value !== "number")) return null;
  return choiceItemsOf(owner).some((item) => item.value === String(value)) ? { owner, item: String(value) } : null;
}

export const literalOf = (node: PageNode, prop: string) => { const value = node.props[prop]; return value?.kind === "literal" ? value.value : undefined; };

/** What an Overlay is called: its layer's title (a Dialog's), else the first text it shows (a Card's "Tip"); null when it
 *  shows none (named by its id then). */
export function overlayTitleOf(node: PageNode): string | null {
  const inner = node.children.find((child): child is PageNode => child.kind === "element");
  if (!inner) return null;
  const title = literalOf(inner, "title") ?? literalOf(inner, "aria-label");
  if (typeof title === "string" && title.trim()) return title.trim();
  const stack: PageNode[] = [inner];
  while (stack.length) {
    const at = stack.shift()!;
    const text = at.children.find((child) => child.kind === "text" && child.value.trim());
    if (text && text.kind === "text") return text.value.trim();
    stack.push(...at.children.filter((child): child is PageNode => child.kind === "element"));
  }
  return null;
}

/** One of the Board's frames: a Screen (a state of it, with `state`) or an Overlay. `frameId` is its canvas frame
 *  ("screen:<id>[:<state>]", "overlay:<id>"); `title` what the designer reads (an Overlay: its overlay's title). */
export type ProtoFrame = { kind: "screen" | "overlay"; id: string; state?: string; title: string; device: string; frameId: string };

export function framesOf(tree: PageTree | null): ProtoFrame[] {
  return (tree?.board?.children ?? []).filter((child): child is PageNode => child.kind === "element").map((node) => {
    const id = String(literalOf(node, "id") ?? "");
    if (node.name === "Overlay") return { kind: "overlay" as const, id, title: overlayTitleOf(node) ?? id, device: "desktop", frameId: `overlay:${id}` };
    const state = literalOf(node, "state");
    return {
      kind: "screen" as const,
      id,
      state: typeof state === "string" ? state : undefined,
      title: String(literalOf(node, "title") ?? id),
      device: String(literalOf(node, "device") ?? "desktop"),
      frameId: `screen:${id}${typeof state === "string" ? `:${state}` : ""}`,
    };
  });
}

/** A canvas frame id as the target an action names: a Screen's id (any of its states → the Screen) or an Overlay's. */
export function targetOfFrame(frameId: string): { action: "navigate" | "open"; target: string } | null {
  const [kind, id] = frameId.split(":");
  if (!id) return null;
  if (kind === "screen") return { action: "navigate", target: id };
  if (kind === "overlay") return { action: "open", target: id };
  return null;
}

/** Every navigate / open action of the page: the layer's loc, its trigger, and the frame it leads to. `own`: the action is
 *  the trigger prop itself (a drag on its arrow can change it); else it sits inside the prop's value (a Dialog's
 *  primaryAction), changed in the code or by the Prototype tab of the layer that holds it. `item`: the choice item that
 *  leads there (an action with one target per item). */
export type ProtoLink = { loc: string; trigger: string; action: "navigate" | "open"; target: string; frameId: string; own: boolean; item?: string };
export function linksOf(tree: PageTree | null): ProtoLink[] {
  const out: ProtoLink[] = [];
  const stack: PageNode[] = tree?.board ? [tree.board] : [];
  while (stack.length) {
    const node = stack.pop()!;
    for (const [trigger, prop] of Object.entries(node.props)) {
      const values: PageValue[] = [prop];
      while (values.length) {
        const value = values.pop()!;
        if (value.kind === "proto" && (value.action === "navigate" || value.action === "open")) {
          const action = value.action;
          const kind = action === "navigate" ? "screen" : "overlay";
          const [arg] = value.args;
          if (typeof arg === "string") out.push({ loc: node.loc, trigger, action, target: arg, frameId: `${kind}:${arg}`, own: value === prop });
          else if (arg && typeof arg === "object" && !Array.isArray(arg)) {
            for (const [item, target] of Object.entries(arg as Record<string, unknown>)) {
              if (typeof target === "string") out.push({ loc: node.loc, trigger, action, target, frameId: `${kind}:${target}`, own: value === prop, item });
            }
          }
        } else if (value.kind === "element") stack.push(value.node);
        else if (value.kind === "array") values.push(...value.items);
        else if (value.kind === "object") values.push(...Object.values(value.fields));
      }
    }
    for (const child of node.children) {
      if (child.kind === "element") stack.push(child);
      else if (child.kind === "map") stack.push(child.node);
    }
  }
  return out;
}

/** The places of every layer holding an action (any `proto.*`, also inside a prop's value): Play's hotspots. Each maps to
 *  the items that lead somewhere when every action it holds leads by item, else to null (the whole layer). */
export function protoSourcesOf(tree: PageTree | null): Map<string, ChoiceItem[] | null> {
  const out = new Map<string, ChoiceItem[] | null>();
  const stack: PageNode[] = tree?.board ? [tree.board] : [];
  while (stack.length) {
    const node = stack.pop()!;
    let whole = false;
    const keys = new Set<string>();
    const values: PageValue[] = Object.values(node.props);
    while (values.length) {
      const value = values.pop()!;
      if (value.kind === "proto") {
        const [arg] = value.args;
        if (arg && typeof arg === "object" && !Array.isArray(arg) && (value.action === "navigate" || value.action === "open")) Object.keys(arg).forEach((key) => keys.add(key));
        else whole = true;
      } else if (value.kind === "element") stack.push(value.node);
      else if (value.kind === "array") values.push(...value.items);
      else if (value.kind === "object") values.push(...Object.values(value.fields));
    }
    if (whole) out.set(node.loc, null);
    else if (keys.size) out.set(node.loc, choiceItemsOf(node).filter((item) => keys.has(item.value)));
    for (const child of node.children) {
      if (child.kind === "element") stack.push(child);
      else if (child.kind === "map") stack.push(child.node);
    }
  }
  return out;
}

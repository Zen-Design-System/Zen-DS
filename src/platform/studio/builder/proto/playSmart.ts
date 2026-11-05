import { elementFiber, hitOf, walkAnnotated } from "../../select/picker";

/*
 * Play's Smart animate (W-51b, Figma's): the Screen coming in is drawn on top, where it ends; each of its layers that
 * matches one of the Screen going away (smartMatch.ts) starts where that one was, at its size and opacity, and moves to
 * its own place (FLIP: transform and opacity only, harness motion/no-layout-animation); the one going away hides. Its
 * other layers fade in, and its canvas fades in over the Screen going away, so what that one does not share fades out.
 * The keyframes are builder.css's `studio-play-smart-*`: the action's Motion/Duration and Motion/Ease, distances and
 * scale steps times --zen-motion-movement. With reduced motion (movement 0) nothing here runs: the Screen coming in fades
 * in as a whole (playMotion.ts), Dissolve.
 */

type Pair = { from: string; to: string };
type Box = { x: number; y: number; width: number; height: number };

const MOVE = "data-smart-move";
const FADE = "data-smart-fade";
const HIDE = "data-smart-hide";
const VARS = ["--studio-smart-x", "--studio-smart-y", "--studio-smart-sx", "--studio-smart-sy", "--studio-smart-opacity"] as const;

/** Every drawn instance of each wanted layer (`file:loc`) inside `root`, in document order: its DOM elements. */
function layerHosts(root: Element, wanted: ReadonlySet<string>): Map<string, Element[][]> {
  const out = new Map<string, Element[][]>();
  const fiber = elementFiber(root);
  if (!fiber || !wanted.size) return out;
  walkAnnotated(fiber.child, (current, src) => {
    if (!wanted.has(src)) return true;
    const hosts = hitOf(current)?.hosts.filter((host): host is Element => host instanceof Element) ?? [];
    if (hosts.length) out.set(src, [...(out.get(src) ?? []), hosts]);
    return true;
  });
  return out;
}

const boxOf = (element: Element): Box | null => {
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, width: rect.width, height: rect.height } : null;
};
const px = (value: number) => `${Math.round(value * 100) / 100}px`;
const ratio = (value: number) => String(Math.round(value * 10000) / 10000);

/** Whether reduced motion is on where `element` draws (Motion/Movement 0). */
export const movementOff = (element: Element) => Number.parseFloat(getComputedStyle(element).getPropertyValue("--zen-motion-movement")) === 0;

/**
 * Runs Smart animate from the Screen drawn in `leaving` to the one drawn in `entering` (Play's two frame boxes, both
 * laid out), for the layer `pairs` of the page `file` and every layer (`layers`, its locs) the Screen coming in holds.
 * Returns what puts the elements back as they were.
 */
export function smartAnimate(leaving: Element, entering: Element, file: string, pairs: readonly Pair[], layers: readonly string[]): () => void {
  if (movementOff(entering)) return () => {};
  const src = (loc: string) => `${file}:${loc}`;
  const before = layerHosts(leaving, new Set(pairs.map((pair) => src(pair.from))));
  const after = layerHosts(entering, new Set([...layers, ...pairs.map((pair) => pair.to)].map(src)));
  // The pairs drawn as one element each side (a .map row pairs with the row in its place).
  const moved = new Map<Element, { from: Element; was: Box; box: Box }>();
  for (const pair of pairs) {
    const olds = before.get(src(pair.from)) ?? [];
    const news = after.get(src(pair.to)) ?? [];
    for (let index = 0; index < Math.min(olds.length, news.length); index++) {
      const [from] = olds[index];
      const [to] = news[index];
      if (olds[index].length !== 1 || news[index].length !== 1 || !(to instanceof HTMLElement || to instanceof SVGElement) || moved.has(to)) continue;
      const was = boxOf(from);
      const box = boxOf(to);
      if (was && box) moved.set(to, { from, was, box });
    }
  }
  const touched: Element[] = [];
  const mark = (element: Element, attribute: string) => { element.setAttribute(attribute, ""); touched.push(element); };
  // Each moved layer starts where its match was, inside the moved layer that holds it (whose own start it rides).
  for (const [element, { from, was, box }] of moved) {
    let holder: { was: Box; box: Box } | undefined;
    for (let up = element.parentElement; up && up !== entering && !holder; up = up.parentElement) holder = moved.get(up);
    const scaleX = holder ? holder.was.width / holder.box.width : 1;
    const scaleY = holder ? holder.was.height / holder.box.height : 1;
    const x = holder ? (was.x - holder.was.x) / scaleX - (box.x - holder.box.x) : was.x - box.x;
    const y = holder ? (was.y - holder.was.y) / scaleY - (box.y - holder.box.y) : was.y - box.y;
    const style = (element as HTMLElement | SVGElement).style;
    style.setProperty("--studio-smart-x", px(x));
    style.setProperty("--studio-smart-y", px(y));
    style.setProperty("--studio-smart-sx", ratio(was.width / box.width / scaleX));
    style.setProperty("--studio-smart-sy", ratio(was.height / box.height / scaleY));
    style.setProperty("--studio-smart-opacity", getComputedStyle(from).opacity || "1");
    mark(element, MOVE);
    mark(from, HIDE);
  }
  // What else the Screen coming in draws fades in: whole branches that hold no moved layer, and inside a moved layer
  // only its own layers (a Card's new child), never the parts of the component.
  const holds = new Set<Element>();
  for (const element of moved.keys()) for (let up = element.parentElement; up && up !== entering && !holds.has(up); up = up.parentElement) holds.add(up);
  const own = new Set([...after.values()].flat(2));
  const walk = (parent: Element, inMoved: boolean) => {
    for (const child of parent.children) {
      if (moved.has(child)) walk(child, true);
      else if (holds.has(child)) walk(child, inMoved);
      else if (!inMoved || own.has(child)) mark(child, FADE);
      else walk(child, inMoved);
    }
  };
  walk(entering, false);
  return () => {
    for (const element of touched) {
      element.removeAttribute(MOVE);
      element.removeAttribute(FADE);
      element.removeAttribute(HIDE);
      for (const name of VARS) (element as HTMLElement).style?.removeProperty(name);
    }
  };
}

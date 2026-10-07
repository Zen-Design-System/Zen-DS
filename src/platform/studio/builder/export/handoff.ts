import type { PageChild, PageNode, PageValue } from "../render/renderPage";

/*
 * handoff.md (Studio builder GĐ5 M3, spec docs/research/studio-builder-handoff-spec-2026-10-07.md §3c; sections from
 * docs/research/studio-builder-export-2026-10-05.md §6): written from the page, its compiled React, its rendered screens
 * and the library's guidelines, never by hand. Pure (no DOM): handoff.selftest.mjs runs it in Node.
 */

export type GuidelineNotes = { purpose: string; keyboard: string[]; accessibility: string[] };
export type FocusStop = { role: string; name: string };
export type HandoffFrame = {
  /** "screen:people", "screen:people:empty", "overlay:invite" */
  frame: string;
  title: string;
  kind: "screen" | "overlay";
  device: string;
  /** In the zip: screens/<file>.png (null when it could not be drawn) and html/screens/<file>.html. */
  png: string | null;
  html: string;
  focus: FocusStop[];
};
export type HandoffAction = { frame: string | null; where: string; action: string; target: unknown };
export type HandoffInput = {
  id: string;
  title: string;
  /** The React component's name (TeamPage) and its file. */
  component: string;
  /** @zen/design-system's version. */
  version: string;
  /** The ZenProvider props of the canvas's modes (theme, density…). */
  provider: Record<string, string>;
  frames: HandoffFrame[];
  components: Array<{ name: string; slug: string | null; notes: GuidelineNotes | null }>;
  names: DesignNames;
  actions: HandoffAction[];
  /** TODO(dev) lines of the compiled code. */
  handlers: string[];
  dataType: string | null;
  /** The props the component takes (screen, state, onNavigate, onBack, data). */
  props: string[];
  media: string[];
  /** What the screen pictures could not draw. */
  pictureNotes: string[];
  date: string;
};

/** A guideline's purpose line, keyboard table rows ("Escape — Close") and accessibility bullets (docs/guidelines/<slug>.md). */
export function guidelineNotes(markdown: string): GuidelineNotes {
  const lines = markdown.split(/\r?\n/);
  const section = (heading: string) => {
    const start = lines.findIndex((line) => line.trim() === `## ${heading}`);
    if (start < 0) return [];
    const end = lines.findIndex((line, index) => index > start && /^##\s/.test(line));
    return lines.slice(start + 1, end < 0 ? undefined : end);
  };
  const importLine = lines.findIndex((line) => line.startsWith("**Import:**"));
  const purpose = lines.slice(importLine + 1).map((line) => line.trim()).find((line) => line && !line.startsWith("**") && !line.startsWith("#")) ?? "";
  const keyboard = section("Keyboard").filter((line) => line.startsWith("|") && !/^\|\s*-/.test(line) && !/^\|\s*Keys\s*\|/.test(line)).map((line) => {
    const [keys, action] = line.split("|").slice(1, -1).map((cell) => cell.trim());
    return action ? `${keys} — ${action}` : keys;
  });
  const accessibility = section("Accessibility").filter((line) => /^\s*-\s/.test(line)).map((line) => line.replace(/^\s*-\s+/, "").trim());
  return { purpose, keyboard, accessibility };
}

export type DesignNames = { textStyles: string[]; spacing: string[]; colour: string[]; shape: string[] };

const SPACING = /^(gap|rowGap|columnGap|padding|paddingX|paddingY|paddingTop|paddingRight|paddingBottom|paddingLeft|margin|marginX|marginY|marginTop|marginRight|marginBottom|marginLeft)$/;
const COLOUR = /^(tone|theme|background|level|color|surface|fill|border)$/;
const SHAPE = /^(radius|elevation|shadow)$/;

/** The token and text style names the page writes in its props (names as written, never raw values). */
export function designNames(board: PageNode | null): DesignNames {
  const sets = { textStyles: new Set<string>(), spacing: new Set<string>(), colour: new Set<string>(), shape: new Set<string>() };
  const visitValue = (value: PageValue) => {
    if (value.kind === "element") visitNode(value.node);
    else if (value.kind === "array") value.items.forEach(visitValue);
    else if (value.kind === "object") Object.values(value.fields).forEach(visitValue);
  };
  const visitNode = (node: PageNode) => {
    for (const [name, value] of Object.entries(node.props)) {
      if (value.kind === "literal" && typeof value.value === "string") {
        if (name === "textStyle") sets.textStyles.add(value.value);
        else if (SPACING.test(name)) sets.spacing.add(`${name} ${value.value}`);
        else if (COLOUR.test(name)) sets.colour.add(`${node.name} ${name} ${value.value}`);
        else if (SHAPE.test(name)) sets.shape.add(`${name} ${value.value}`);
      } else visitValue(value);
    }
    node.children.forEach(visitChild);
  };
  const visitChild = (child: PageChild) => {
    if (child.kind === "element") visitNode(child);
    else if (child.kind === "map") visitNode(child.node);
  };
  if (board) visitNode(board);
  const sorted = (set: Set<string>) => [...set].sort((a, b) => a.localeCompare(b));
  return { textStyles: sorted(sets.textStyles), spacing: sorted(sets.spacing), colour: sorted(sets.colour), shape: sorted(sets.shape) };
}

const code = (text: string) => `\`${text.replace(/`/g, "'")}\``;
const cell = (text: string) => text.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
/** `<Button> onClick` with its element as code (markdown would read the tag as HTML). */
const elementCode = (text: string) => text.replace(/<([A-Z][\w.]*)>/g, (_match, name: string) => code(`<${name}>`));
const frameName = (frame: string | null) => (frame ?? "").replace(/^screen:/, "").replace(/^overlay:/, "overlay ").replace(/:/, " · state ");

/** What a prototype action does, and its code. */
function actionText(action: HandoffAction): [string, string] {
  const target = typeof action.target === "string" ? action.target : "";
  switch (action.action) {
    case "navigate": return [`goes to screen ${code(target)}`, `navigate(${JSON.stringify(target)}) + onNavigate`];
    case "open": return [`opens overlay ${code(target)}`, `setOverlay(${JSON.stringify(target)})`];
    case "close": return ["closes the overlay", "setOverlay(null)"];
    case "back": return ["goes back", "back() + onBack on the first screen"];
    case "toast": {
      const title = action.target && typeof action.target === "object" && "title" in action.target ? String((action.target as { title?: unknown }).title ?? "") : target;
      return [`shows a toast${title ? ` “${title}”` : ""}`, "toast(…): replace it with the real outcome"];
    }
    case "link": return [`opens ${target}`, "window.open(…)"];
    default: return [action.action, ""];
  }
}

/** handoff.md for the page. */
export function handoffMarkdown(input: HandoffInput): string {
  const out: string[] = [];
  const add = (...lines: string[]) => out.push(...lines);
  const screens = input.frames.filter((frame) => frame.kind === "screen");
  const overlays = input.frames.filter((frame) => frame.kind === "overlay");
  const providerProps = Object.entries(input.provider).map(([name, value]) => `${name}="${value}"`).join(" ");

  add(`# ${input.title}: handoff`, "");
  add(`Exported by Zen Studio on ${input.date} from ${code(`${input.id}.zen.tsx`)}. The design is the source: change it in the Studio and export again. The code is one-way: edits to it do not go back to the design.`, "");

  add("## In this package", "");
  add(`- ${code(`${input.component}.tsx`)}: the page as one React component.`);
  add(`- ${code(`${input.id}.zen.tsx`)}: the design file (Zen Studio › Pages › Import).`);
  if (input.media.length) add(`- ${code("assets/")}: the photos the code imports (${input.media.map(code).join(", ")}).`);
  add(`- ${code("screens/")}: a picture of each screen and overlay as the canvas draws it (PNG, 2×).`);
  add(`- ${code("html/")}: static HTML of each screen with the Zen styles it uses (open ${code("html/index.html")}).`);
  add(`- ${code("handoff.md")}: this file.`, "");

  add("## Setup", "");
  add(`1. Install the library: ${code(`npm install @zen/design-system@^${input.version}`)}.`);
  add(`2. Import its styles once, in the app's entry: ${code('import "@zen/design-system/styles.css";')}`);
  add(`3. Wrap the app in the modes the design was drawn in: ${code(`<ZenProvider ${providerProps}>`)}.`);
  if (screens.some((frame) => frame.device === "phone")) add(`4. Phone screens are drawn in the mobile modes: on a phone, nest ${code('<ZenProvider breakpoint="mobile" typography="mobile" density="comfortable">')} around the page.`);
  add("", `Render ${code(`<${input.component} />`)}${input.props.length ? `; its props: ${input.props.map(code).join(", ")}` : ""}.`, "");

  add("## Components", "");
  // Components that share a guideline (List and ListItem) share a row.
  const guides = [...input.components.reduce((groups, component) => {
    const key = component.slug ?? component.name;
    const group = groups.get(key);
    if (group) group.names.push(component.name);
    else groups.set(key, { names: [component.name], slug: component.slug, notes: component.notes });
    return groups;
  }, new Map<string, { names: string[]; slug: string | null; notes: GuidelineNotes | null }>()).values()];
  add("| Component | What it is for | Guideline | API |", "| --- | --- | --- | --- |");
  for (const guide of guides) {
    const guideline = guide.slug ? code(`node_modules/@zen/design-system/docs/guidelines/${guide.slug}.md`) : "—";
    const api = guide.slug ? code(`node_modules/@zen/design-system/docs/api/${guide.slug}.json`) : "—";
    add(`| ${guide.names.join(", ")} | ${cell(guide.notes?.purpose ?? "")} | ${guideline} | ${api} |`);
  }
  add("");

  add("## Tokens and text styles", "", "Names as the design writes them (the library maps each to its token); no raw values.", "");
  const list = (label: string, names: string[]) => add(`- **${label}:** ${names.length ? names.map(code).join(", ") : "none"}`);
  list("Text styles", input.names.textStyles);
  list("Spacing", input.names.spacing);
  list("Colour roles and variants", input.names.colour);
  list("Shape", input.names.shape);
  add("");

  add("## Prototype flow", "");
  add("| Frame | Device | Picture | HTML |", "| --- | --- | --- | --- |");
  for (const frame of [...screens, ...overlays]) add(`| ${cell(frame.kind === "overlay" ? `Overlay ${frameName(frame.frame).replace(/^overlay /, "")}` : `${frame.title} (${frameName(frame.frame)})`)} | ${frame.kind === "overlay" ? "overlay" : frame.device} | ${frame.png ? code(frame.png) : "not drawn"} | ${code(frame.html)} |`);
  add("");
  if (input.actions.length) {
    // In the frames' order (screens, then overlays), as the board shows them.
    const order = (frame: string | null) => { const at = input.frames.findIndex((entry) => entry.frame === frame); return at < 0 ? input.frames.length : at; };
    const actions = [...input.actions].sort((a, b) => order(a.frame) - order(b.frame));
    add("| Where | Element | Does | In the code |", "| --- | --- | --- | --- |");
    for (const action of actions) {
      const [does, inCode] = actionText(action);
      add(`| ${cell(frameName(action.frame))} | ${cell(elementCode(action.where))} | ${cell(does)} | ${inCode ? code(cell(inCode)) : ""} |`);
    }
  } else add("The design has no prototype links.");
  add("");
  if (input.handlers.length) {
    add("To wire (the TODO(dev) block in the code):", "");
    for (const handler of input.handlers) add(`- ${elementCode(handler)}`);
    add("");
  }

  add("## Data contract", "");
  if (input.dataType) {
    add(`The page reads its data from the ${code("data")} prop (default: the design's sample, ${code("export const mock")} in the code). Its type:`, "");
    add("```ts", input.dataType, "```", "");
  } else add("The design shows no sample data: every text is written in place.", "");

  add("## Accessibility", "");
  add("Focus order of each frame as drawn (Tab order), with each stop's role and accessible name:", "");
  for (const frame of input.frames) {
    add(`### ${frame.kind === "overlay" ? `Overlay ${frameName(frame.frame).replace(/^overlay /, "")}` : `${frame.title} (${frameName(frame.frame)})`}`, "");
    if (!frame.focus.length) add("No focusable element.");
    frame.focus.forEach((stop, index) => add(`${index + 1}. ${stop.role} ${stop.name ? `“${stop.name}”` : "⚠ no accessible name"}`));
    add("");
  }
  const guided = guides.filter((guide) => guide.notes && (guide.notes.keyboard.length || guide.notes.accessibility.length));
  if (guided.length) {
    add("From the guidelines:", "");
    for (const guide of guided) {
      add(`- **${guide.names.join(", ")}**`);
      for (const line of guide.notes!.keyboard) add(`  - Keyboard: ${line}`);
      for (const line of guide.notes!.accessibility) add(`  - ${line}`);
    }
    add("");
  }
  add(`After wiring, run the library's usage harness on the code: ${code(`npx zen-usage ${input.component}.tsx`)}.`, "");

  if (input.pictureNotes.length) {
    add("## Picture notes", "", "What the screen pictures could not draw (the canvas and the HTML show it):", "");
    for (const note of input.pictureNotes) add(`- ${note}`);
    add("");
  }

  add("## Open questions", "", "None from the design: builder pages have no notes on the canvas yet. Ask the designer about anything this file leaves open.", "");
  return out.join("\n");
}

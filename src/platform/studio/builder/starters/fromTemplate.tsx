import { createRoot } from "react-dom/client";
import { snapshotFrame, type Snapshot } from "./snapshot";

/*
 * Start from a template (Studio builder GĐ3b M3, spec docs/research/studio-builder-starters-spec-2026-10-07.md §3c, the
 * user's Q1: both sources): the New page dialog lists the platform's page templates; the chosen one renders off screen,
 * as the Templates page shows it (its phone or desktop frame), and is copied as "New page from this frame" copies a
 * frame. No dev server needed. The templates load with the list (their own chunk), never with the Studio.
 */

export type TemplateChoice = { index: number; id: string; title: string; description: string; mobile: boolean };

type TemplatesModule = typeof import("../../../appLayer/templates");
let loading: Promise<TemplatesModule> | null = null;
const loadTemplates = () => (loading ??= import("../../../appLayer/templates"));

/** The templates New page offers, in the Templates page's order. */
export async function templateChoices(): Promise<TemplateChoice[]> {
  const { templates } = await loadTemplates();
  return templates.map((template, index) => ({ index, id: template.id, title: template.title, description: template.description, mobile: Boolean(template.mobile) }));
}

/** Width a desktop template renders at off screen (the Templates page's screen frames). */
const DESKTOP_WIDTH = 1440;

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

/** Renders template `id` off screen, as its frame on the Templates page, and copies what it shows. */
export async function snapshotTemplate(id: string): Promise<{ title: string; shot: Snapshot } | null> {
  const module = await loadTemplates();
  const index = module.templates.findIndex((template) => template.id === id);
  const example = index < 0 ? undefined : module.examples.templates?.[index];
  if (!example) return null;
  const host = document.createElement("div");
  // Off screen and out of the way: never focused, never hit, never read by assistive tech while it renders.
  host.style.cssText = `position:fixed;top:0;left:-${DESKTOP_WIDTH + 200}px;width:${DESKTOP_WIDTH}px;pointer-events:none;`;
  host.inert = true;
  document.body.append(host);
  const root = createRoot(host);
  try {
    root.render(<>{example.render()}</>);
    // Its first paint, then its effects (a measured layout, a list that fills in).
    for (let frame = 0; frame < 3; frame += 1) await nextFrame();
    await new Promise((resolve) => setTimeout(resolve, 150));
    return { title: module.templates[index].title, shot: snapshotFrame(host) };
  } finally {
    root.unmount();
    host.remove();
  }
}

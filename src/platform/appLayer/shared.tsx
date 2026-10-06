import { useContext, useRef, type ReactNode } from "react";
import { PlatformCode } from "../PlatformCode";
import { ComponentPreview, PlaygroundControls } from "./playgroundParts";
import { FullScreenBar, FullScreenButton, useFullScreen } from "../PlatformFullScreen";
import { PlatformTypographyContext } from "../PlatformTemplate";

export { PlaygroundFilterChip, PlaygroundToggle } from "./playgroundParts";
export type { AppLayerPage, AppLayerPageMeta, ExampleDef, ExampleMap } from "./types";

/** The standard playground panel: title, controls, a live preview row and the generated code. `screen` (a whole desktop
 *  screen such as the App Shell) adds Full screen: the preview alone covers the viewport like the real web app, with the
 *  current property settings, until Exit or Escape. */
export function Panel({ title, controls, children, code, previewClassName, screen = false }: { title: string; controls: ReactNode; children: ReactNode; code: string; previewClassName?: string; screen?: boolean }) {
  const previewTypography = useContext(PlatformTypographyContext);
  const openRef = useRef<HTMLButtonElement>(null);
  const exitRef = useRef<HTMLButtonElement>(null);
  const { fullScreen, enter, exit } = useFullScreen(openRef, exitRef, ".platform-example-row");
  return (
    <ComponentPreview className="platform-example-panel platform-example-panel--stack">
      <h2 className="platform-main-component__title">{title}</h2>
      {screen && !fullScreen ? <div className="platform-playground-screen"><FullScreenButton buttonRef={openRef} onEnter={enter} /></div> : null}
      <PlaygroundControls aria-label={`${title} playground controls`}>{controls}</PlaygroundControls>
      <div data-typography={previewTypography} className={["platform-example-row", previewClassName].filter(Boolean).join(" ")}
        data-fullscreen={fullScreen ? "true" : undefined} role={fullScreen ? "dialog" : undefined} aria-label={fullScreen ? `${title} playground, full screen` : undefined}>
        {children}
        {fullScreen ? <FullScreenBar title={`${title} playground`} exitRef={exitRef} onExit={exit} /> : null}
      </div>
      <PlatformCode code={code} />
    </ComponentPreview>
  );
}

/** PlaygroundFilterChip option helper. */
export const option = (id: string, label = id) => ({ id, label });

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

/** The records a data export holds (page metas, example or template defs) and its shape (keys, list lengths). */
function recordsOf(value: object): { shape: string; records: Record<string, unknown>[] } | null {
  const shape: string[] = [];
  const records: Record<string, unknown>[] = [];
  for (const [key, item] of Object.entries(value)) {
    const list: unknown[] = Array.isArray(item) ? item : [item];
    if (!list.every(isRecord)) return null;
    shape.push(`${key}:${Array.isArray(item) ? list.length : "-"}`);
    records.push(...list);
  }
  return { shape: shape.join(","), records };
}

/**
 * Dev only: a group's data export (`pages`, `examples`, `templates`) keeps its identity across hot updates, its
 * records updated in place. Fast Refresh accepts a module only if its non-component exports are unchanged; a new object
 * sent every edit of the group (or of a template it renders) up through PlatformAppLayer to PlatformApp and main.tsx, a
 * full reload of the Studio. PlatformAppLayer and PlatformShowcases copy the lists but keep the records, so they read
 * the new render and code. A new shape (a page or an example added or removed) still takes the new object: a reload.
 */
export function keepOnHotUpdate<T extends object>(hot: ImportMeta["hot"], key: string, next: T): T {
  if (!hot) return next;
  const previous = hot.data[key] as T | undefined;
  const from = previous && recordsOf(previous);
  const to = recordsOf(next);
  if (!previous || !from || !to || from.shape !== to.shape) {
    hot.data[key] = next;
    return next;
  }
  from.records.forEach((record, index) => {
    for (const field of Object.keys(record)) if (!(field in to.records[index])) delete record[field];
    Object.assign(record, to.records[index]);
  });
  return previous;
}

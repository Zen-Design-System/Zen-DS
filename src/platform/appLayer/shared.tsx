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

/** Dev only: a group's data export keeps its identity across hot updates (../hotData.ts). */
export { keepOnHotUpdate } from "../hotData";

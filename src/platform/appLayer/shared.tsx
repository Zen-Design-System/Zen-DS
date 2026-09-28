import { useContext, type ReactNode } from "react";
import { PlatformCode } from "../PlatformCode";
import { ComponentPreview } from "../PlatformExamples";
import { PlatformTypographyContext } from "../PlatformTemplate";

export { PlaygroundFilterChip, PlaygroundToggle } from "../PlatformExamples";
export type { AppLayerPage, AppLayerPageMeta, ExampleDef, ExampleMap } from "./types";

/** The standard playground panel: title, controls, a live preview row and the generated code. */
export function Panel({ title, controls, children, code, previewClassName }: { title: string; controls: ReactNode; children: ReactNode; code: string; previewClassName?: string }) {
  const previewTypography = useContext(PlatformTypographyContext);
  return (
    <ComponentPreview className="platform-example-panel platform-example-panel--stack">
      {/* zen-allow-raw-heading: platform chrome — the playground panel title takes the platform typography, like PlatformExamples. */}
      <h2 className="platform-main-component__title">{title}</h2>
      <div className="platform-playground-controls" aria-label={`${title} playground controls`}>{controls}</div>
      <div data-typography={previewTypography} className={["platform-example-row", previewClassName].filter(Boolean).join(" ")}>{children}</div>
      <PlatformCode code={code} />
    </ComponentPreview>
  );
}

/** PlaygroundFilterChip option helper. */
export const option = (id: string, label = id) => ({ id, label });

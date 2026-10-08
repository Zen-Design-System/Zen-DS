import { useEffect, useState } from "react";
import { Button } from "../../../components/Button";
import { Icon } from "../../../components/Icon";
import { Heading } from "../../../components/Text";
import { typographyStyles } from "../../../tokens/typography.generated";
import { pageLabels } from "../../PlatformApp";
import type { PlatformPage } from "../../PlatformExamples";
import { previewModeDefinitions, previewValueLabel } from "../shell/modes";
import { useStudio } from "../store";
import { focusFrame, frameIcon, useFrames } from "./frames";
import { InspectorItem, InspectorSection } from "./Section";

import { openExport } from "../builder/export/exportState";
import { pagesPersist, usePage, useStorage } from "../builder/store/pageStore";
/*
 * Inspector with nothing selected (spec §6): the page, a one-line summary of the canvas preview modes (the toolbar
 * Modes popover is the one place to change them) and the frames on the board.
 */

const pageDescriptions: Partial<Record<PlatformPage, string>> = {
  overviews: "Every Zen component on one board. Pick a page to lay it out as frames.",
  installation: "Install the package, add ZenProvider and import the styles.",
  "design-tokens": "The Figma variables behind colour, spacing, radius and type.",
  typography: "Text styles and the Dashboard, Popular and Mobile typography modes.",
  iconography: "The Zen icon set: names, cuts and sizes.",
};

/* Component pages describe themselves through the guideline index ("purpose"); loaded on demand. */
let purposes: Promise<Record<string, string>> | null = null;
function loadPurposes() {
  purposes ??= import("../../../../docs/guidelines/index.json")
    .then((module) => Object.fromEntries((module.default.components as Array<{ slug: string; purpose?: string }>).map((entry) => [entry.slug, entry.purpose ?? ""])))
    .catch(() => ({}));
  return purposes;
}

/** Design tab with nothing selected. */
export function PagePanel() {
  const page = useStudio((state) => state.page);
  const localPage = useStudio((state) => state.localPage);
  const builderPage = usePage(localPage);
  const preview = useStudio((state) => state.preview);
  const frames = useFrames(page);
  const [purpose, setPurpose] = useState<string>("");
  useEffect(() => {
    let alive = true;
    setPurpose("");
    if (!pageDescriptions[page]) void loadPurposes().then((map) => { if (alive) setPurpose(map[page] ?? ""); });
    return () => { alive = false; };
  }, [page]);
  // A builder page (Studio builder GĐ2) names itself.
  const storage = useStorage();
  const kept = storage.kind === "mirror" ? `saved in this browser and in ${storage.mirror === "dev" ? storage.label : `the folder “${storage.label}”`} as you edit.` : "saved in this browser as you edit.";
  const description = localPage ? (pagesPersist() ? `A page you made, ${kept}` : "A page you made. This browser cannot keep it: export it before closing.") : pageDescriptions[page] ?? purpose;
  const summary = previewModeDefinitions.map((mode) => previewValueLabel(mode.key, preview[mode.key])).join(" · ");

  return (
    <div className="studio-inspector__panel">
      <header className="studio-inspector__head-block">
        <p className={`studio-inspector__eyebrow ${typographyStyles["Body/Small/Medium"]}`}>Page</p>
        <Heading level={2} textStyle="Body/Small/Bold">{localPage ? builderPage?.title ?? localPage : pageLabels[page] ?? page}</Heading>
        {description ? <p className={`studio-inspector__description ${typographyStyles["Body/Small/Regular"]}`}>{description}</p> : null}
        {/* GĐ5: the page as React code or its design file. */}
        {localPage ? (
          <div className="studio-inspector__actions">
            <Button level="tertiary" size="sm" startIcon="icon-code-02-line" onClick={() => openExport(localPage)}>Export…</Button>
          </div>
        ) : null}
      </header>
      {/* Preview modes change in Play and Present only (their bar's Modes panel): the canvas shows them here. */}
      <InspectorSection title="Preview modes">
        <p className={`studio-inspector__summary ${typographyStyles["Body/Small/Regular"]}`}>{summary}</p>
      </InspectorSection>
      <InspectorSection title="Frames">
        {frames.length ? (
          <ul aria-label="Frames" className="studio-inspector__items">
            {frames.map((frame) => (
              <InspectorItem
                key={frame.id}
                icon={<Icon name={frameIcon(frame.id)} size={16} />}
                name={frame.label}
                meta={`${frame.width}px`}
                onClick={() => focusFrame(frame)}
              />
            ))}
          </ul>
        ) : <p className={`studio-inspector__empty ${typographyStyles["Body/Small/Regular"]}`}>The board is still rendering.</p>}
      </InspectorSection>
    </div>
  );
}

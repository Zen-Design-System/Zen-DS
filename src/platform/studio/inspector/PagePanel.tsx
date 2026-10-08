import { useEffect, useState } from "react";
import { Button } from "../../../components/Button";
import { Icon } from "../../../components/Icon";
import { Heading } from "../../../components/Text";
import { typographyStyles } from "../../../tokens/typography.generated";
import { pageLabels } from "../../PlatformApp";
import type { PlatformPage } from "../../PlatformExamples";
import { openModesMenu } from "../shell/ModesMenu";
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

/** Design tab with nothing selected. */
export function PagePanel() {
  const page = useStudio((state) => state.page);
  const localPage = useStudio((state) => state.localPage);
  const builderPage = usePage(localPage);
  const preview = useStudio((state) => state.preview);
  const frames = useFrames(page);
  // A builder page (Studio builder GĐ2) names itself and says where it is kept; a docs page's description is on the
  // board (its title block), not here too (user, 2026-10-07).
  const storage = useStorage();
  const kept = storage.kind === "mirror" ? `saved in this browser and in ${storage.mirror === "dev" ? storage.label : `the folder “${storage.label}”`} as you edit.` : "saved in this browser as you edit.";
  const description = localPage ? (pagesPersist() ? `A page you made, ${kept}` : "A page you made. This browser cannot keep it: export it before closing.") : null;
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
      <InspectorSection
        title="Preview modes"
        actions={(
          <>
            {/* zen-allow-compact-button: a section-heading action in a dense tool panel, sized to the 12px heading it sits beside */}
            <Button appearance="flat" level="primary" size="xs" aria-haspopup="dialog" aria-label="Change preview modes" onClick={openModesMenu}>Change</Button>
          </>
        )}
      >
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

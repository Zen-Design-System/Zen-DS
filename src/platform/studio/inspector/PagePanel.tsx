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
import { InspectorFields, InspectorItem, InspectorSection } from "./Section";

import { openExport } from "../builder/export/exportState";
import { pagesPersist, renamePage, usePage, useStorage } from "../builder/store/pageStore";
import { InputField } from "../../../components/Input";
/*
 * Inspector with nothing selected (spec §6): the page, a one-line summary of the canvas preview modes (the toolbar
 * Modes popover is the one place to change them) and the frames on the board.
 */

/** The page's name: typed, it renames the page on Enter or when the field is left (Escape puts it back); empty keeps it. */
function PageName({ id, title }: { id: string; title: string }) {
  const admin = useStudio((state) => state.role === "admin");
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    const next = draft.trim();
    setDraft(null);
    if (next && next !== title) void renamePage(id, next);
  };
  return (
    <InputField
      size="sm"
      aria-label="Page name"
      value={draft ?? title}
      disabled={!admin}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter" && !event.nativeEvent.isComposing) { event.preventDefault(); commit(); }
        else if (event.key === "Escape" && draft !== null) { event.preventDefault(); event.stopPropagation(); setDraft(null); }
      }}
    />
  );
}

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
      {/* A page you made is named here as you work (user, 2026-10-09: no title to give when it is made). */}
      {localPage && builderPage ? (
        <InspectorSection title="Page" fieldGrid>
          <InspectorFields name="title" labels={["Name"]} fields={[<PageName key="name" id={localPage} title={builderPage.title} />]} />
        </InspectorSection>
      ) : null}
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

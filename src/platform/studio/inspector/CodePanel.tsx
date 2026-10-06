import { useEffect, useState } from "react";
import { EmptyState } from "../../../components/EmptyState";
import { typographyStyles } from "../../../tokens/typography.generated";
import { parseSrc, studioApi } from "../api";
import { CodeView } from "../code/CodeView";
import { SourcePanel } from "../code/SourcePanel";
import { onSourceUpdate } from "../select/picker";
import { useStudio } from "../store";
import type { SourceElement, StudioSelection } from "../types";
import { exampleOf } from "./frames";
import { InspectorSection } from "./Section";
import { SlotHost, useSlotFilled } from "./SlotHost";

/*
 * Code tab (spec §6): the snippet a person would copy (the playground's live code or the example's code) above the
 * git-style source of the selected element's file, scrolled to and highlighting the element.
 */

/** The element's line range, re-read after edits and HMR updates. */
function useElementRange(src: string | null) {
  const [element, setElement] = useState<SourceElement | null>(null);
  const [version, setVersion] = useState(0);
  const undoCount = useStudio((state) => state.undo.length);
  const redoCount = useStudio((state) => state.redo.length);
  useEffect(() => onSourceUpdate(() => setVersion((value) => value + 1)), []);
  useEffect(() => {
    const parsed = src ? parseSrc(src) : null;
    if (!parsed) { setElement(null); return undefined; }
    let alive = true;
    void studioApi.element(parsed.file, parsed.loc).then((next) => { if (alive) setElement(next); });
    return () => { alive = false; };
  }, [src, version, undoCount, redoCount]);
  return element;
}

export function CodePanel({ selection, codeSlot }: { selection: StudioSelection | null; codeSlot: HTMLElement }) {
  const page = useStudio((state) => state.page);
  const nodeSrc = selection?.kind === "node" ? selection.src : null;
  const element = useElementRange(nodeSrc);
  const codeFilled = useSlotFilled(codeSlot);
  const parsed = nodeSrc ? parseSrc(nodeSrc) : null;
  const frameId = selection ? selection.frameId : null;
  const inPlayground = selection?.kind === "node" ? Boolean(selection.panelId) : frameId === "playground";
  const example = exampleOf(page, frameId);

  if (!selection) {
    return (
      <div className="studio-inspector__panel studio-inspector__panel--center">
        <EmptyState title="Select a layer to see its code" compactTitle icon="icon-code-02-line" headingLevel={2}>
          The playground snippet, the example code and the element&apos;s source file show here.
        </EmptyState>
      </div>
    );
  }

  const highlight = element ? { from: element.startLine, to: element.endLine } : parsed ? { from: parsed.line, to: parsed.line } : null;
  return (
    <div className="studio-inspector__panel studio-inspector__panel--code">
      {inPlayground ? (
        <div hidden={!codeFilled}>
          <InspectorSection title="Snippet">
            <SlotHost node={codeSlot} className="studio-inspector__slot studio-inspector__slot--code" />
          </InspectorSection>
        </div>
      ) : null}
      {!inPlayground && example ? (
        <InspectorSection title="Snippet">
          <CodeView code={example.code} language="tsx" maxHeight={320} />
        </InspectorSection>
      ) : null}
      {selection.kind === "frame" && !inPlayground && !example ? (
        <p className={`studio-inspector__empty ${typographyStyles["Body/Small/Regular"]}`}>This frame has no snippet. Select an element inside it to see its source.</p>
      ) : null}
      {parsed ? (
        <InspectorSection title="Source" className="studio-inspector__section--fill">
          <SourcePanel file={parsed.file} highlight={highlight} />
        </InspectorSection>
      ) : null}
    </div>
  );
}

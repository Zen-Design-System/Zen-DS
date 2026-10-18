import { useEffect, useState, useSyncExternalStore } from "react";
import { Badge } from "../../../components/Badge";
import { Button } from "../../../components/Button";
import { Icon } from "../../../components/Icon";
import { Heading, plural } from "../../../components/Text";
import { typographyStyles } from "../../../tokens/typography.generated";
import { onSourceUpdate, selectionInstances } from "../select/picker";
import { useWords } from "../useWords";
import { selectLayers, useExtraSelection, type ExtraLayer } from "../select/multiSelection";
import { useSlotServer } from "../slots/actions";
import { autoLayoutKeys, autoLayoutShortcut, frameSelectionKeys, frameSelectionShortcut, useWrapRunning, wrapCheck, wrapSelection } from "../select/wrapSelection";
import { canEdit, useStudio } from "../store";
import { MixedProperties } from "../edit/MixedProperties";
import { InspectorItem, InspectorSection } from "./Section";
import { undoShortcut } from "./status";

/*
 * The Design tab while several layers are selected (Figma's multi-selection): how many, which ones (a row selects that
 * layer alone), and Figma's Frame actions: Add auto layout (a Stack laid out as they render now, ⇧A) or Frame selection
 * (a plain Box, ⌥⌘G).
 * Layers of one component also show their shared properties (Mixed where they differ; edit/MixedProperties.tsx).
 */

export function SelectionActions() {
  const selection = useStudio((state) => state.selection);
  const say = useWords();
  const extras = useExtraSelection();
  // The role and the dev server decide whether the wrap shows (canStructurallyEdit reads them).
  useStudio((state) => state.role);
  useSlotServer();
  const running = useWrapRunning();
  // The check reads the canvas: again after a source update, and once the canvas shows the selection (after a reload).
  const [, setVersion] = useState(0);
  useEffect(() => onSourceUpdate(() => setVersion((value) => value + 1)), []);
  useSyncExternalStore(selectionInstances.subscribe, selectionInstances.get, selectionInstances.get);
  const layers: ExtraLayer[] = selection?.kind === "node" && !selection.part
    ? [{ src: selection.src, name: selection.name, frameId: selection.frameId, panelId: selection.panelId, instance: selection.instance }, ...extras]
    : [];
  if (!layers.length) return null;
  const check = wrapCheck(layers);
  const blocked = running ? "Wrapping…" : !check.ok ? check.reason : null;
  return (
    <div className="studio-inspector__panel">
      <header className="studio-inspector__head-block">
        <div className="studio-inspector__title-row">
          <span className="studio-inspector__kind-icon" aria-hidden="true"><Icon name="icon-layers-two-01-line" size={16} /></span>
          <Heading level={2} textStyle="Body/Small/Bold" truncate>{plural(layers.length, "layer")}</Heading>
          <Badge size="sm" theme="neutral" background="subtle" leadingIcon={false}>Selection</Badge>
        </div>
      </header>

      {check.ok || !check.hidden ? (
        <InspectorSection title="Frame" note="Add auto layout keeps how the layers sit now (direction, gap, alignment); Frame selection puts them in a frame.">
          <div className="studio-inspector__actions">
            <Button level="primary" size="sm" startIcon="icon-rows-01-line" aria-keyshortcuts={autoLayoutKeys} title={`Add auto layout ${autoLayoutShortcut}`} disabled={blocked !== null} onClick={() => { void wrapSelection("stack"); }}>
              Add auto layout
            </Button>
            <Button level="tertiary" size="sm" startIcon="icon-square-line" aria-keyshortcuts={frameSelectionKeys} title={`Frame selection ${frameSelectionShortcut}`} disabled={blocked !== null} onClick={() => { void wrapSelection("box"); }}>
              Frame selection
            </Button>
          </div>
          <p className={`studio-inspector__note ${typographyStyles["Body/Small/Regular"]}`} role={blocked && !running ? "status" : undefined}>
            {blocked ? say(blocked) : `Add auto layout ${autoLayoutShortcut} · Frame selection ${frameSelectionShortcut} · ${undoShortcut} to undo`}
          </p>
        </InspectorSection>
      ) : (
        <p className={`studio-inspector__note ${typographyStyles["Body/Small/Regular"]}`}>{say(check.reason)}</p>
      )}

      {/* Several layers of one component: their shared properties, "Mixed" where they differ (edit/MixedProperties). */}
      <MixedProperties layers={layers} editable={canEdit()} />

      <InspectorSection title="Selected layers">
        <ul aria-label="Selected layers" className="studio-inspector__items">
          {layers.map((layer) => (
            <InspectorItem
              key={`${layer.src}#${layer.instance}`}
              icon={<Icon name={/^[A-Z]/.test(layer.name) ? "icon-cube-line" : "icon-code-02-line"} size={16} />}
              component={/^[A-Z]/.test(layer.name)}
              name={layer.name}
              onClick={() => selectLayers(layer, [])}
            />
          ))}
        </ul>
      </InspectorSection>
    </div>
  );
}

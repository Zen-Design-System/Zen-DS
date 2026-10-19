import { IconButton } from "../../../components/Button";
import type { IconName } from "../../../icons/generated/names";
import { typographyStyles } from "../../../tokens/typography.generated";
import { InspectorSection } from "../inspector/Section";
import { useExtraSelection } from "../select/multiSelection";
import { tip } from "../shell/ShortcutTip";
import { canEdit, useStudio } from "../store";
import { alignLayers, distributeLayers, floatingItems, tidyUpLayers } from "./alignLayers";
import type { AlignEdge } from "./arrangeModel";

/*
 * Figma's alignment bar for several layers (the right panel's top row with a multi-selection; plan F2): align left /
 * horizontal centers / right / top / vertical centers / bottom to the box around them all, distribute horizontal /
 * vertical spacing, tidy up. Each is one edit (edit/alignLayers.ts). Layers in auto layout are placed by their frame:
 * the row says so instead.
 */

const mac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
const alt = mac ? "⌥" : "Alt+";
const ctrlAlt = mac ? "⌃⌥" : "Ctrl+Alt+";

const ALIGN: Array<{ edge: AlignEdge; label: string; icon: IconName; key: string }> = [
  { edge: "left", label: "Align left", icon: "icon-align-left-01-line", key: `${alt}A` },
  { edge: "hcenter", label: "Align horizontal centers", icon: "icon-align-horizontal-centre-01-line", key: `${alt}H` },
  { edge: "right", label: "Align right", icon: "icon-align-right-01-line", key: `${alt}D` },
  { edge: "top", label: "Align top", icon: "icon-align-top-01-line", key: `${alt}W` },
  { edge: "vcenter", label: "Align vertical centers", icon: "icon-align-vertical-center-01-line", key: `${alt}V` },
  { edge: "bottom", label: "Align bottom", icon: "icon-align-bottom-01-line", key: `${alt}S` },
];

export function AlignSelection() {
  const extras = useExtraSelection();
  const editable = useStudio((state) => canEdit(state));
  if (!extras.length) return null;
  const items = floatingItems();
  const reason = typeof items === "string" ? items : null;
  const count = typeof items === "string" ? 0 : items.length;
  const off = !editable || reason !== null;
  return (
    <InspectorSection title="Alignment">
      <div className="studio-align-selection" role="toolbar" aria-label="Align and distribute">
        {ALIGN.map((entry) => (
          <IconButton key={entry.edge} appearance="flat" level="primary" size="sm" icon={entry.icon} aria-label={entry.label} tooltip={tip(entry.label, entry.key)} disabled={off} onClick={() => { void alignLayers(entry.edge); }} />
        ))}
        <span className="studio-align-selection__divider" aria-hidden="true" />
        <IconButton appearance="flat" level="primary" size="sm" icon="icon-distribute-spacing-horizontal-line" aria-label="Distribute horizontal spacing" tooltip={tip("Distribute horizontal spacing", `${ctrlAlt}H`)} disabled={off || count < 3} onClick={() => { void distributeLayers("x"); }} />
        <IconButton appearance="flat" level="primary" size="sm" icon="icon-distribute-spacing-vertical-line" aria-label="Distribute vertical spacing" tooltip={tip("Distribute vertical spacing", `${ctrlAlt}V`)} disabled={off || count < 3} onClick={() => { void distributeLayers("y"); }} />
        <IconButton appearance="flat" level="primary" size="sm" icon="icon-grid-01-line" aria-label="Tidy up" tooltip={tip("Tidy up", `${ctrlAlt}T`)} disabled={off} onClick={() => { void tidyUpLayers(); }} />
      </div>
      {reason ? <p className={`studio-inspector__note ${typographyStyles["Body/Small/Regular"]}`}>{reason}</p> : null}
    </InspectorSection>
  );
}

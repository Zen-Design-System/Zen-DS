import { useId, useState } from "react";
import { Icon } from "../../../components/Icon";
import type { IconName } from "../../../icons/generated/names";
import { typographyStyles } from "../../../tokens/typography.generated";
import { FRAME_PRESET_GROUPS, screenDevice, type FramePreset, type FramePresetGroup } from "../../../../tools/studio/screen-devices.mjs";
import { InspectorItem } from "../inspector/Section";
import { studioStore } from "../store";
import { addFrame } from "./proto/addFrame";
import { placeInView, revealFrame } from "./frameMove";

/*
 * Figma's frame presets (UI3; user 2026-10-19: "Như Figma", "Đủ nhóm Figma"): while the Frame tool (F / A) is on, the
 * right panel lists the presets by group (Phone, Tablet, Desktop, Presentation, Watch, Paper, Social media; Zen's devices
 * first, tools/studio/screen-devices.mjs). A click makes an empty frame of that size beside the selected frame, else right
 * of the frames on the board, selects it and goes back to Move. A click on the canvas makes a 100 × 100 frame and a drag
 * draws one (frameMove.ts). Groups open and close as Figma's (Disclosure); what is open is kept for the session.
 */

const open = new Set(["phone", "tablet", "desktop"]);

/** Makes an empty frame from `preset` on `localPage` (one edit, one undo step) and shows it. */
export async function addPresetFrame(localPage: string, preset: FramePreset): Promise<boolean> {
  const place = placeInView(preset.width, preset.height);
  const zen = preset.zen ? screenDevice(preset.zen) : undefined;
  // Named as the row reads ("iPhone 16 2"); a Zen device by its short name ("iPad 3").
  const name = zen && zen.label === preset.label ? zen.short : preset.label;
  const ok = await addFrame(localPage, "screen", { ...(place ? { place } : {}), width: preset.width, height: preset.height, device: preset.device, ...(preset.layout ? { layout: preset.layout } : {}), name, empty: true });
  studioStore.setState({ tool: "select" });
  if (ok) revealFrame();
  return ok;
}

function PresetGroup({ group, localPage }: { group: FramePresetGroup; localPage: string }) {
  const [expanded, setExpanded] = useState(open.has(group.id));
  const listId = useId();
  const toggle = () => {
    const next = !expanded;
    if (next) open.add(group.id);
    else open.delete(group.id);
    setExpanded(next);
  };
  return (
    <section className="studio-frame-presets__group" aria-label={group.label}>
      <h3 className="studio-frame-presets__head">
        <button type="button" className="studio-frame-presets__toggle" aria-expanded={expanded} aria-controls={listId} onClick={toggle}>
          <Icon name={expanded ? "icon-chevron-down-line" : "icon-chevron-right-line"} size="xs" decorative />
          <span className={typographyStyles["Body/Small/Bold"]}>{group.label}</span>
        </button>
      </h3>
      <ul id={listId} className="studio-inspector__items" aria-label={group.label} hidden={!expanded}>
          {group.presets.map((preset) => (
            <InspectorItem
              key={preset.id}
              icon={<Icon name={group.icon as IconName} size="sm" decorative />}
              name={preset.label}
              meta={`${preset.width} × ${preset.height}`}
              onClick={() => void addPresetFrame(localPage, preset)}
            />
          ))}
      </ul>
    </section>
  );
}

/** The Design tab while the Frame tool is on, on a page you made. */
export function FramePresets({ localPage }: { localPage: string }) {
  return (
    <div className="studio-frame-presets" role="region" aria-label="Frame presets">
      <h2 className={`studio-frame-presets__title ${typographyStyles["Body/Small/Bold"]}`}>Frame</h2>
      {FRAME_PRESET_GROUPS.map((group) => <PresetGroup key={group.id} group={group} localPage={localPage} />)}
    </div>
  );
}

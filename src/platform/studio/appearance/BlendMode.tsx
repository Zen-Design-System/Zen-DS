import { Fragment, useRef, useState } from "react";
import { IconButton } from "../../../components/Button";
import { Divider } from "../../../components/Divider";
import type { ZenBlendMode } from "../../../components/Layout";
import { Popover, PopoverItem } from "../../../components/Popover";
import type { FieldApi } from "../inspector/fieldApi";

/** Figma's layer blend modes as its menu groups and names them (Appearance › blend mode). */
const BLEND_GROUPS: ReadonlyArray<ReadonlyArray<readonly [ZenBlendMode, string]>> = [
  [["pass-through", "Pass through"], ["normal", "Normal"]],
  [["darken", "Darken"], ["multiply", "Multiply"], ["plus-darker", "Plus darker"], ["color-burn", "Color burn"]],
  [["lighten", "Lighten"], ["screen", "Screen"], ["plus-lighter", "Plus lighter"], ["color-dodge", "Color dodge"]],
  [["overlay", "Overlay"], ["soft-light", "Soft light"], ["hard-light", "Hard light"]],
  [["difference", "Difference"], ["exclusion", "Exclusion"]],
  [["hue", "Hue"], ["saturation", "Saturation"], ["color", "Color"], ["luminosity", "Luminosity"]],
];
const nameOf = (mode: string) => BLEND_GROUPS.flat().find(([value]) => value === mode)?.[1] ?? mode;

/**
 * Figma UI3's blend mode in the Appearance header: a ◐ button that opens the layer blends in Figma's groups, the current
 * one checked; the button reads as on while the blend is not the layer's default. `frame`: a frame's list starts with
 * Pass through (its default); a shape's default is Normal. Picking the default removes `blendMode` (the code stays
 * short); any other writes it. One change, one ⌘Z.
 */
export function BlendModeButton({ api, frame }: { api: FieldApi; frame: boolean }) {
  const fallback: ZenBlendMode = frame ? "pass-through" : "normal";
  const value = api.valueFor("blendMode");
  const current = value.state === "literal" && typeof value.value === "string" ? value.value : fallback;
  const fixed = value.state === "bound" || value.state === "spread";
  const [open, setOpen] = useState(false);
  const [withKeys, setWithKeys] = useState(false);
  const anchor = useRef<HTMLSpanElement>(null);
  const groups = frame ? BLEND_GROUPS : [BLEND_GROUPS[0].filter(([mode]) => mode !== "pass-through"), ...BLEND_GROUPS.slice(1)];
  const pick = (mode: ZenBlendMode) => {
    setOpen(false);
    if (mode === current) return;
    void api.apply(mode === fallback ? [{ op: "removeProp", name: "blendMode" }] : [{ op: "setProp", name: "blendMode", value: { kind: "string", value: mode } }], `Blend mode → ${nameOf(mode)}`);
  };
  return (
    <span ref={anchor} className="studio-blend">
      {/* zen-allow-filter-button: Figma UI3's ◐ in the Appearance header, an icon beside the eye (no room for a Chip); not a filter */}
      <IconButton
        icon="icon-contrast-02-line"
        aria-label="Blend mode"
        tooltip={`Blend mode: ${nameOf(current)}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        appearance="flat"
        level={current !== fallback ? "secondary" : "primary"}
        size="xs"
        disabled={api.disabled || fixed}
        onClick={(event) => { setWithKeys(event.detail === 0); setOpen((shown) => !shown); }}
      />
      <Popover open={open} onOpenChange={(next) => { if (!next) setOpen(false); }} anchorRef={anchor} align="end" autoFocus={withKeys} aria-label="Blend mode">
        {groups.map((group, index) => (
          <Fragment key={group[0][0]}>
            {index ? <Divider decorative /> : null}
            {group.map(([mode, name]) => <PopoverItem key={mode} label={name} selected={mode === current} onSelect={() => pick(mode)} />)}
          </Fragment>
        ))}
      </Popover>
    </span>
  );
}

import { useEffect, useState } from "react";
import { Button, IconButton } from "../../../components/Button";
import { Icon } from "../../../components/Icon";
import { Menu, type MenuEntry } from "../../../components/Menu";
import { typographyStyles } from "../../../tokens/typography.generated";
import type { FieldApi } from "../inspector/fieldApi";
import { PropField } from "../inspector/PropField";
import type { PropSpec, PropValue } from "../inspector/propSchema";
import { InspectorRow, InspectorSection } from "../inspector/Section";
import {
  CORNERS, cornerClear, cornerLabels, cornerPick, defaultEffect, EFFECT_STYLES, effectAvailability, effectKey, effectStyleOf,
  effectWarnings, isMixed, RADIUS_STEPS, uniformClear, uniformPick, type Corner, type WrittenRadius,
} from "./appearanceModel";
import "./appearance.css";

/*
 * Figma UI3's Appearance and Effects sections for Box (and corner radius for Image): Fill (surface), Border, Corner
 * radius with independent corners, Clip content; then the Box's effect style. Token-only, one apply per gesture, the
 * canonical corner form (appearanceModel.ts). WP-D of docs/research/studio-builder-plan-2026-10-05.md; spec
 * docs/research/studio-position-effects-radius-spec-2026-10-03.md §4.2–4.3.
 */

/** The props these sections show, so DesignPanel keeps them out of Properties. */
export const appearancePropNames: Readonly<Record<string, readonly string[]>> = {
  Box: ["surface", "border", "radius", ...CORNERS, "clip", "effectStyle"],
  Image: ["radius", ...CORNERS],
};

const literalOf = (value: PropValue) => (value.state === "literal" && typeof value.value === "string" ? value.value : undefined);

function writtenRadius(api: FieldApi): WrittenRadius {
  const corners: WrittenRadius["corners"] = {};
  for (const corner of CORNERS) {
    const value = literalOf(api.valueFor(corner));
    if (value !== undefined) corners[corner] = value;
  }
  return { radius: literalOf(api.valueFor("radius")), corners };
}

/** The rendered corner radii in px ("12" or "4–20" when they differ), read from the element on the canvas. */
function measuredRadius(host: HTMLElement | null): string | null {
  if (!host) return null;
  const style = getComputedStyle(host);
  const values = [style.borderTopLeftRadius, style.borderTopRightRadius, style.borderBottomRightRadius, style.borderBottomLeftRadius].map((value) => Math.round(parseFloat(value) || 0));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const shown = (px: number) => (px >= 999 ? "full" : String(px));
  return min === max ? `${shown(min)} px` : `${shown(min)}–${shown(max)} px`;
}

const enumSpec = (base: PropSpec | undefined, name: string): PropSpec => ({
  name,
  type: base?.type ?? "string",
  description: base?.description ?? "",
  defaultValue: base?.defaultValue ?? null,
  editor: { kind: "enum", options: [...RADIUS_STEPS] },
});

/** Corner radius: the uniform token, and the four corners when "Independent corners" is on (Figma's ⛶ button). */
export function CornerRadiusField({ api, specs, host }: { api: FieldApi; specs: PropSpec[]; host: HTMLElement | null }) {
  const base = specs.find((spec) => spec.name === "radius");
  const w = writtenRadius(api);
  const anyCorner = CORNERS.some((corner) => w.corners[corner] !== undefined);
  const [open, setOpen] = useState(anyCorner);
  useEffect(() => { if (anyCorner) setOpen(true); }, [anyCorner]);
  if (!base) return null;
  const mixed = isMixed(w);
  const px = measuredRadius(host);
  const uniform: PropValue = mixed ? { state: "unset" } : api.valueFor("radius");
  const send = (ops: ReturnType<typeof uniformPick>, label: string) => { if (ops.length) void api.apply(ops, label); };
  return (
    <>
      <PropField
        spec={enumSpec(base, "radius")}
        label="Corner radius"
        value={uniform}
        disabled={api.disabled}
        hint={mixed ? `Mixed · ${px ?? "corners differ"}` : undefined}
        onSet={(next) => send(uniformPick(w, String(next)), `Corner radius → ${next}`)}
        onReset={() => send(uniformClear(w), "Corner radius → default")}
      />
      <InspectorRow label="" name="radius-corners" compact>
        <Button
          appearance="flat"
          level="primary"
          size="sm"
          startIcon={<Icon name="icon-scan-line" decorative />}
          aria-pressed={open}
          onClick={() => setOpen((value) => !value)}
        >
          Independent corners
        </Button>
      </InspectorRow>
      {open ? CORNERS.map((corner: Corner) => (
        <PropField
          key={corner}
          spec={enumSpec(specs.find((spec) => spec.name === corner), corner)}
          label={cornerLabels[corner]}
          value={w.corners[corner] !== undefined ? api.valueFor(corner) : { state: "unset" }}
          disabled={api.disabled}
          hint={w.corners[corner] === undefined && w.radius ? `From corner radius · ${w.radius}` : undefined}
          onSet={(next) => send(cornerPick(w, corner, String(next)), `${cornerLabels[corner]} radius → ${next}`)}
          onReset={() => send(cornerClear(w, corner), `${cornerLabels[corner]} radius → corner radius`)}
        />
      )) : null}
    </>
  );
}

/** Appearance: Fill, Border, Corner radius, Clip content (Box); Corner radius only (Image). */
export function AppearanceSection({ api, specs, component, host }: { api: FieldApi; specs: PropSpec[]; component: string; host: HTMLElement | null }) {
  const spec = (name: string) => specs.find((candidate) => candidate.name === name);
  const field = (name: string, label: string) => {
    const found = spec(name);
    return found ? <PropField spec={found} label={label} value={api.valueFor(name)} disabled={api.disabled} onSet={(value) => api.setProp(name, value)} onReset={() => api.removeProp(name)} /> : null;
  };
  return (
    <InspectorSection title="Appearance">
      {component === "Box" ? field("surface", "Fill") : null}
      {component === "Box" ? field("border", "Border") : null}
      <CornerRadiusField api={api} specs={specs} host={host} />
      {component === "Box" ? field("clip", "Clip content") : null}
    </InspectorSection>
  );
}

/** Effect styles hidden with the eye, per element (Studio session only: a hidden effect is not code). */
const hiddenEffects = new Map<string, string>();

/** Effects: the Box's one Figma effect style, with the eye, remove, "+" and the rule warnings with their fixes. */
export function EffectsSection({ api, src }: { api: FieldApi; src: string }) {
  const [, rerender] = useState(0);
  const effectStyle = literalOf(api.valueFor("effectStyle"));
  const surface = literalOf(api.valueFor("surface"));
  const border = literalOf(api.valueFor("border"));
  const constraintY = literalOf(api.valueFor("constraintY"));
  const hidden = effectStyle ? undefined : hiddenEffects.get(src);
  const shown = effectStyleOf(effectStyle ?? hidden);
  const add = defaultEffect(surface, constraintY);
  const write = (style: string) => { hiddenEffects.delete(src); api.setProp("effectStyle", style); };
  const items: MenuEntry[] = [];
  let group = "";
  for (const style of EFFECT_STYLES) {
    if (style.group !== group) {
      if (group) items.push({ type: "separator", id: `sep-${style.group}` });
      group = style.group;
    }
    const available = effectAvailability(style, surface);
    items.push({ id: style.name, label: style.name, caption: available.ok ? style.usage : available.reason, disabled: !available.ok && style.name !== effectStyle, onSelect: () => write(style.name) });
  }
  const warnings = effectWarnings({ effectStyle, surface, border });
  const addButton = !shown ? (
    <IconButton
      icon="icon-plus-line"
      aria-label="Add effect"
      tooltip={"style" in add ? `Add ${add.style}` : add.reason}
      appearance="flat"
      level="primary"
      size="xs"
      disabled={api.disabled || !("style" in add)}
      onClick={() => { if ("style" in add) write(add.style); }}
    />
  ) : null;
  return (
    <InspectorSection title="Effects" actions={addButton} note={!shown && !("style" in add) ? add.reason : undefined}>
      {shown ? (
        <InspectorRow
          label="Effect"
          name="effectStyle"
          hint={hidden ? "Hidden. Hidden effects aren't saved in code." : undefined}
          action={<IconButton icon="icon-minus-line" aria-label="Remove effect" appearance="flat" level="primary" size="xs" disabled={api.disabled} onClick={() => { hiddenEffects.delete(src); if (effectStyle) api.removeProp("effectStyle"); else rerender((n) => n + 1); }} />}
        >
          <div className="studio-effect" data-hidden={hidden ? "true" : undefined}>
            <Menu
              aria-label="Effect styles"
              items={items}
              trigger={(
                <Button appearance="flat" level="primary" size="md" className="studio-effect__style" disabled={api.disabled} startIcon={<span className="studio-effect__swatch" data-effect={effectKey(shown.name)} aria-hidden="true" />}>
                  {shown.name}
                </Button>
              )}
            />
            <IconButton
              icon={hidden ? "icon-eye-off-line" : "icon-eye-line"}
              aria-label={hidden ? "Show effect" : "Hide effect"}
              appearance="flat"
              level="primary"
              size="xs"
              disabled={api.disabled}
              onClick={() => {
                if (hidden) { write(hidden); return; }
                if (effectStyle) { hiddenEffects.set(src, effectStyle); api.removeProp("effectStyle"); }
              }}
            />
          </div>
        </InspectorRow>
      ) : null}
      {warnings.map((warning) => (
        <div key={warning.text} className={`studio-effect__warning ${typographyStyles["Body/Small/Regular"]}`}>
          <Icon name="icon-alert-triangle-line" size="sm" decorative />
          <span>{warning.text}</span>
          <Button appearance="flat" level="primary" size="sm" disabled={api.disabled} onClick={() => { void api.apply(warning.fix, warning.fixLabel); }}>{warning.fixLabel}</Button>
        </div>
      ))}
    </InspectorSection>
  );
}

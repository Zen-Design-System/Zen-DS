import { useEffect, useId, useState, useSyncExternalStore, type ReactNode } from "react";
import { Button, IconButton } from "../../../components/Button";
import { Icon } from "../../../components/Icon";
import { Menu, type MenuEntry } from "../../../components/Menu";
import { typographyStyles } from "../../../tokens/typography.generated";
import type { FieldApi } from "../inspector/fieldApi";
import { PropField } from "../inspector/PropField";
import type { PropSpec, PropValue } from "../inspector/propSchema";
import { InspectorFields, InspectorRow, InspectorSection } from "../inspector/Section";
import { ScaleField } from "../inspector/controls/ScaleField";
import { ScrubNumberField } from "../inspector/controls/ScrubNumberField";
import { RowSelectField } from "../inspector/rowFields";
import type { EditOp } from "../types";
import { canHideSrc, hiddenValueAt, hideShortcut, subscribeHiddenLayers, toggleLayerHidden } from "../edit/visibility";
import { tip } from "../shell/ShortcutTip";
import {
  cardThemeEffect, CORNERS, cornerClear, cornerLabels, cornerPick, defaultEffect, EFFECT_STYLES, effectAvailability, effectKey,
  effectLayers, effectStyleOf, effectWarnings, isMixed, RADIUS_STEPS, uniformClear, uniformPick, type Corner, type ManifestEffect,
  type WrittenRadius,
} from "./appearanceModel";
import { BlendModeButton } from "./BlendMode";
import { GradientFillRow } from "./GradientFillRow";
import { ImageFillRow } from "./ImageFillRow";
import "./appearance.css";

/*
 * Figma UI3's Appearance, Fill, Stroke and Effects sections for a frame (Box, Stack and Grid alike: one Figma frame is
 * one element, decision 2 of docs/research/studio-figma-design-parity-2026-10-18.md) and corner radius for Image:
 * Appearance (opacity, corner radius with independent corners), Fill (the background layer), Stroke (border, weight,
 * sides, dash), then the frame's effect style. Clip content is in the Layout section. Token-only, one apply per gesture,
 * the canonical corner form (appearanceModel.ts). Specs: docs/research/studio-position-effects-radius-spec-2026-10-03.md
 * §4.2–4.3, docs/research/studio-f5-right-panel-spec-2026-10-19.md §5.
 */

/** A frame's look: what Appearance, Fill, Stroke and Effects show (Layout appearance.ts). */
const FRAME_LOOK = ["opacity", "blendMode", "surface", "gradient", "image", "imageFit", "imageCrop", "imageScale", "border", "borderWeight", "borderSides", "borderStyle", "radius", ...CORNERS, "effectStyle"];
/** The props these sections show, so DesignPanel keeps them out of Properties. */
export const appearancePropNames: Readonly<Record<string, readonly string[]>> = {
  Box: FRAME_LOOK,
  Stack: FRAME_LOOK,
  Grid: FRAME_LOOK,
  Image: ["radius", ...CORNERS],
};
/** Box, Stack and Grid: Figma's frames, which take a fill, stroke and effect. */
export const isFrameLook = (component: string) => component === "Box" || component === "Stack" || component === "Grid";

const literalOf = (value: PropValue) => (value.state === "literal" && typeof value.value === "string" ? value.value : undefined);

function writtenRadius(api: FieldApi): WrittenRadius {
  const corners: WrittenRadius["corners"] = {};
  for (const corner of CORNERS) {
    const value = literalOf(api.valueFor(corner));
    if (value !== undefined) corners[corner] = value;
  }
  return { radius: literalOf(api.valueFor("radius")), corners };
}

/**
 * Figma UI3's Appearance fields: Opacity and Corner radius side by side on the field grid (labels above, two equal fields),
 * Independent corners (⛶) in the icon column, then the four corners two by two while it is on (user 2026-10-20:
 * "Appearance 2 ô nhập lại nằm 2 hàng khác nhau, figma đang để cùng 1 hàng"; "nếu để 2 hàng thì phải cho chiều dài bằng
 * nhau"; "nên có icon bên trong input cho corner radius"). The radius fields are token fields (ScaleField): the corners
 * glyph inside, as Figma's. `opacity`: the opacity field, or null (Image has corner radius only); `radius`: false where
 * the layer has no corners (an ellipse). One field keeps its half width, so the panel's fields stay one length.
 */
export function AppearanceFields({ api, specs, opacity, radius: withRadius = true }: { api: FieldApi; specs: PropSpec[]; opacity: ReactNode | null; radius?: boolean }) {
  const base = withRadius ? specs.find((spec) => spec.name === "radius") : undefined;
  const w = writtenRadius(api);
  const anyCorner = CORNERS.some((corner) => w.corners[corner] !== undefined);
  // Figma's Corner smoothing (0–100 %, iOS 60), beside the corners: shown with them, open while it is set.
  const smoothable = Boolean(base) && specs.some((spec) => spec.name === "cornerSmoothing");
  const smoothing = smoothable ? numberOf(api.valueFor("cornerSmoothing")) : null;
  const [open, setOpen] = useState(anyCorner || Boolean(smoothing));
  useEffect(() => { if (anyCorner || smoothing) setOpen(true); }, [anyCorner, smoothing]);
  const send = (ops: ReturnType<typeof uniformPick>, label: string) => { if (ops.length) void api.apply(ops, label); };
  const fallback = typeof base?.defaultValue === "string" ? base.defaultValue : undefined;
  const radius = base ? (
    <ScaleField
      label="Corner radius"
      prop="radius"
      scale="radius"
      options={[...RADIUS_STEPS]}
      value={isMixed(w) ? undefined : w.radius}
      fallback={fallback}
      disabled={api.disabled}
      leading="icon-maximize-02-line"
      placeholder={isMixed(w) ? "Mixed" : undefined}
      onSet={(next) => send(uniformPick(w, next), `Corner radius → ${next}`)}
      onReset={w.radius !== undefined || anyCorner ? () => send(uniformClear(w), "Corner radius → default") : undefined}
    />
  ) : null;
  // Each field keeps its prop on a wrapper (data-prop: the E2E rows and "Edit …" pointers find the field by it).
  const cell = (prop: string, field: ReactNode) => <div key={prop} className="studio-appearance-field" data-prop={prop}>{field}</div>;
  const corner = (key: Corner) => cell(key, (
    <ScaleField
      label={`${cornerLabels[key]} radius`}
      prop={key}
      scale="radius"
      options={[...RADIUS_STEPS]}
      value={w.corners[key]}
      fallback={w.radius ?? fallback}
      disabled={api.disabled}
      onSet={(next) => send(cornerPick(w, key, next), `${cornerLabels[key]} radius → ${next}`)}
      onReset={w.corners[key] !== undefined ? () => send(cornerClear(w, key), `${cornerLabels[key]} radius → corner radius`) : undefined}
    />
  ));
  const setSmoothing = (value: number) => {
    const next = Math.round(Math.min(100, Math.max(0, value)));
    // None is Figma's default: the prop goes.
    send(next === 0 ? [{ op: "removeProp", name: "cornerSmoothing" }] : [{ op: "setProp", name: "cornerSmoothing", value: { kind: "number", value: next } }], `Corner smoothing → ${next}%`);
  };
  const smooth = smoothable ? cell("cornerSmoothing", (
    <ScrubNumberField label={<Icon name="icon-maximize-02-line" size="sm" decorative />} name="Corner smoothing" suffix="%" min={0} max={100} value={smoothing ?? 0}
      disabled={api.disabled || boundOrSpread(api.valueFor("cornerSmoothing"))} onCommit={setSmoothing} />
  )) : null;
  const fields: ReactNode[] = [];
  if (opacity) fields.push(cell("opacity", opacity));
  if (radius) fields.push(cell("radius", radius));
  if (!fields.length) return null;
  return (
    <>
      <InspectorFields
        labels={[opacity ? "Opacity" : null, radius ? "Corner radius" : null].filter((label): label is string => Boolean(label))}
        // One field stays in the first column (an empty second), so it is as long as every other field.
        fields={fields.length === 1 ? [fields[0], null] : fields}
        icon={radius ? <IconButton icon="icon-maximize-02-line" aria-label="Independent corners" tooltip="Independent corners" aria-pressed={open} appearance="flat" level={open ? "secondary" : "primary"} size="xs" onClick={() => setOpen((value) => !value)} /> : undefined}
      />
      {radius && open ? (
        <>
          <InspectorFields labels={[cornerLabels.radiusTopLeft, cornerLabels.radiusTopRight]} fields={[corner("radiusTopLeft"), corner("radiusTopRight")]} />
          <InspectorFields labels={[cornerLabels.radiusBottomLeft, cornerLabels.radiusBottomRight]} fields={[corner("radiusBottomLeft"), corner("radiusBottomRight")]} />
          {smooth ? <InspectorFields labels={["Corner smoothing"]} fields={[smooth, null]} /> : null}
        </>
      ) : null}
    </>
  );
}

const numberOf = (value: PropValue) => (value.state === "literal" && typeof value.value === "number" ? value.value : null);
const boundOrSpread = (value: PropValue) => value.state === "bound" || value.state === "spread";

/** Figma UI3's eye in the Appearance header: Show / Hide the layer (⇧⌘H), on a page made in the Studio. */
function VisibilityToggle({ src, name, disabled }: { src: string; name: string; disabled: boolean }) {
  const hidden = useSyncExternalStore(subscribeHiddenLayers, () => hiddenValueAt(src) === true, () => false);
  const label = hidden ? "Show" : "Hide";
  return <IconButton icon={hidden ? "icon-eye-off-line" : "icon-eye-line"} aria-label={label} aria-pressed={hidden} tooltip={tip(label, hideShortcut)} appearance="flat" level="primary" size="xs" disabled={disabled} onClick={() => void toggleLayerHidden(src, name)} />;
}

/** Appearance (Figma UI3): the layer's opacity and its corner radius (a frame); corner radius only (Image). The header's
 *  ◐ picks the layer blend (a frame's default Pass through), its eye shows or hides the layer. */
export function AppearanceSection({ api, specs, layer }: { api: FieldApi; specs: PropSpec[]; component: string; host: HTMLElement | null; layer?: { src: string; name: string } }) {
  const opacitySpec = specs.find((candidate) => candidate.name === "opacity");
  const blend = specs.some((candidate) => candidate.name === "blendMode") ? <BlendModeButton api={api} frame /> : null;
  const eye = layer && canHideSrc(layer.src) ? <VisibilityToggle src={layer.src} name={layer.name} disabled={api.disabled} /> : null;
  const opacity = api.valueFor("opacity");
  const setOpacity = (value: number) => {
    const shown = Math.round(Math.min(100, Math.max(0, value)));
    // Back at Figma's default, the prop goes (the code stays short).
    void api.apply(shown === 100 ? [{ op: "removeProp", name: "opacity" }] : [{ op: "setProp", name: "opacity", value: { kind: "number", value: shown } }], `Opacity → ${shown}%`);
  };
  return (
    <InspectorSection title="Appearance" fieldGrid actions={blend || eye ? <>{blend}{eye}</> : undefined}>
      <AppearanceFields api={api} specs={specs} opacity={opacitySpec ? (
        <ScrubNumberField label={<Icon name="icon-drop-line" size="sm" decorative />} name="Opacity" suffix="%" min={0} max={100} value={numberOf(opacity) ?? 100}
          disabled={api.disabled || boundOrSpread(opacity)} onCommit={setOpacity} />
      ) : null} />
    </InspectorSection>
  );
}

/** The "+" (add the first one) or "−" (remove it) of a Fill or Stroke section's header, as Figma's. */
function LayerToggle({ shown, name, disabled, onAdd, onRemove }: { shown: boolean; name: string; disabled: boolean; onAdd: () => void; onRemove: () => void }) {
  return shown
    ? <IconButton icon="icon-minus-line" aria-label={`Remove ${name}`} appearance="flat" level="primary" size="xs" disabled={disabled} onClick={onRemove} />
    : <IconButton icon="icon-plus-line" aria-label={`Add ${name}`} appearance="flat" level="primary" size="xs" disabled={disabled} onClick={onAdd} />;
}

/** Fill (Figma UI3): the frame's background layer as one fill, its variable named; "+" adds Surface, "−" removes it. */
export function FillSection({ api, specs, host = null }: { api: FieldApi; specs: PropSpec[]; host?: HTMLElement | null }) {
  const spec = specs.find((candidate) => candidate.name === "surface");
  if (!spec) return null;
  const value = api.valueFor("surface");
  const shown = value.state !== "unset" && !(value.state === "literal" && value.value === "none");
  return (
    <InspectorSection title="Fill" actions={<LayerToggle shown={shown} name="fill" disabled={api.disabled || boundOrSpread(value)} onAdd={() => api.setProp("surface", "surface")} onRemove={() => api.removeProp("surface")} />}>
      {shown ? <PropField spec={spec} label="Fill" value={value} disabled={api.disabled} resettable={false} onSet={(next) => (next === "none" ? api.removeProp("surface") : api.setProp("surface", next))} onReset={() => api.removeProp("surface")} /> : null}
      {/* Figma's gradient and image fills on a frame (F8): over the fill colour, the picture on top. */}
      <GradientFillRow api={api} specs={specs} />
      <ImageFillRow api={api} specs={specs} host={host} />
    </InspectorSection>
  );
}

const SIDE_LABELS: Readonly<Record<string, string>> = { all: "All", top: "Top", right: "Right", bottom: "Bottom", left: "Left" };
/** The stroke's sides as written (all when it names none). */
const sideValue = (value: PropValue) => (value.state === "literal" && typeof value.value === "string" && value.value in SIDE_LABELS ? value.value : "all");

/**
 * Stroke (Figma UI3): the frame's border as one stroke (Pale or Subtle, inside), its weight in px, which sides it draws
 * and its dash; "+" adds Pale (Subtle is for actionable frames), "−" removes the stroke and its settings in one apply.
 */
export function StrokeSection({ api, specs }: { api: FieldApi; specs: PropSpec[] }) {
  const spec = (name: string) => specs.find((candidate) => candidate.name === name);
  const border = spec("border");
  if (!border) return null;
  const value = api.valueFor("border");
  const shown = value.state !== "unset" && !(value.state === "literal" && value.value === "none");
  const settings = ["borderWeight", "borderSides", "borderStyle"].filter((name) => api.valueFor(name).state !== "unset");
  const remove = () => { void api.apply([{ op: "removeProp", name: "border" }, ...settings.map((name): EditOp => ({ op: "removeProp", name }))], "Remove stroke"); };
  const weight = api.valueFor("borderWeight");
  const setWeight = (next: number) => {
    const px = Math.max(0, Math.round(next * 100) / 100);
    void api.apply(px === 1 ? [{ op: "removeProp", name: "borderWeight" }] : [{ op: "setProp", name: "borderWeight", value: { kind: "number", value: px } }], `Stroke weight → ${px}`);
  };
  const sides = spec("borderSides");
  const dash = spec("borderStyle");
  const subtle = value.state === "literal" && value.value === "subtle";
  return (
    <InspectorSection title="Stroke" fieldGrid={shown} actions={<LayerToggle shown={shown} name="stroke" disabled={api.disabled || boundOrSpread(value)} onAdd={() => api.setProp("border", "pale")} onRemove={remove} />}>
      {shown ? (
        <>
          <PropField spec={border} label="Stroke" value={value} disabled={api.disabled} resettable={false} onSet={(next) => (next === "none" ? remove() : api.setProp("border", next))} onReset={remove} />
          <div className="studio-shape__pair">
            <ScrubNumberField label={<Icon name="icon-line-height-line" size="sm" decorative />} name="Stroke weight" min={0} max={400} round={1} value={numberOf(weight) ?? 1}
              disabled={api.disabled || boundOrSpread(weight)} onCommit={setWeight} />
            {sides ? (
              // The pair's second field on the panel grid, as Inline-Field (the label inside), never a row of its own.
              <RowSelectField size="sm" layout="inline" label="Sides" aria-label="Sides" disabled={api.disabled}
                value={sideValue(api.valueFor("borderSides"))} options={Object.entries(SIDE_LABELS).map(([value, label]) => ({ value, label }))}
                onValueChange={(next) => (next === "all" ? api.removeProp("borderSides") : api.setProp("borderSides", next))} />
            ) : null}
          </div>
          {dash ? (
            <PropField spec={{ ...dash, defaultValue: "solid" }} label="Dash" value={api.valueFor("borderStyle")} disabled={api.disabled || !subtle} optionLabels={{ solid: "Solid", dashed: "Dashed" }}
              hint={subtle ? undefined : "Dashed strokes are Subtle"}
              onSet={(next) => (next === "solid" ? api.removeProp("borderStyle") : api.setProp("borderStyle", next))} onReset={() => api.removeProp("borderStyle")} />
          ) : null}
        </>
      ) : null}
    </InspectorSection>
  );
}

/** Effect styles hidden with the eye, per element (Studio session only: a hidden effect is not code). */
const hiddenEffects = new Map<string, string>();

/** Effects: the Box's one Figma effect style, with the eye, remove, "+" and the rule warnings with their fixes. */
export function EffectsSection({ api, src }: { api: FieldApi; src: string }) {
  const [, rerender] = useState(0);
  const [settings, setSettings] = useState(false);
  const settingsId = useId();
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
    <InspectorSection title="Effects" actions={shown ? <EffectSettingsButton open={settings} controls={settingsId} onToggle={() => setSettings((open) => !open)} /> : addButton} note={!shown && !("style" in add) ? add.reason : undefined}>
      {shown ? (
        <InspectorRow
          label="Effect"
          name="effectStyle"
          hint={hidden ? "Hidden (not saved)" : undefined}
          action={<IconButton icon="icon-minus-line" aria-label="Remove effect" appearance="flat" level="primary" size="xs" disabled={api.disabled} onClick={() => { hiddenEffects.delete(src); if (effectStyle) api.removeProp("effectStyle"); else rerender((n) => n + 1); }} />}
        >
          <div className="studio-effect" data-hidden={hidden ? "true" : undefined}>
            <Menu
              aria-label="Effect styles"
              items={items}
              trigger={(
                <Button appearance="flat" level="primary" size="md" className="studio-effect__style" title={shown.name} disabled={api.disabled} startIcon={<span className="studio-effect__swatch" data-effect={effectKey(shown.name)} aria-hidden="true" />}>
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
      {shown && settings ? <EffectSettings id={settingsId} style={shown.name} /> : null}
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

/** The effect styles' layers (style-manifest.json), read once when "Effect settings" first opens. */
let manifestLayers: Promise<Map<string, ManifestEffect[]>> | null = null;
const loadManifestLayers = () => {
  manifestLayers ??= import("../../../styles/generated/style-manifest.json").then((module) => {
    const styles = (module.default as { effectStyles?: Array<{ name: string; effects: ManifestEffect[] }> }).effectStyles ?? [];
    return new Map(styles.map((style) => [style.name, style.effects]));
  });
  return manifestLayers;
};

function EffectSettingsButton({ open, controls, onToggle }: { open: boolean; controls: string; onToggle: () => void }) {
  return <IconButton icon="icon-sliders-02-line" aria-label="Effect settings" aria-expanded={open} aria-controls={controls} appearance="flat" level="primary" size="xs" onClick={onToggle} />;
}

/** "Effect settings": the style's layers in Figma order, read-only (an effect style is a token, edited in Figma). */
function EffectSettings({ id, style }: { id: string; style: string }) {
  const [layers, setLayers] = useState<string[] | null>(null);
  useEffect(() => {
    let alive = true;
    void loadManifestLayers().then((map) => { if (alive) setLayers(effectLayers(map.get(style) ?? [])); });
    return () => { alive = false; };
  }, [style]);
  return (
    <div id={id} className="studio-effect__settings" role="group" aria-label={`${style} settings`}>
      {(layers ?? []).map((layer, index) => <p key={index} className={typographyStyles["Body/Small/Regular"]}>{layer}</p>)}
      <p className={`studio-effect__settings-note ${typographyStyles["Caption/Regular"]}`}>Edit effect styles in Figma</p>
    </div>
  );
}

/**
 * Effects of a Card, MetricCard or ChartCard: its theme draws them (shadow: the Level-1 drop shadow; pale, semi-pale: the
 * background blur; default, border and flat-border: none). One Figma effect row, no label (user, 2026-10-13: the label, a two-line
 * "From … theme" note and a floating "Edit theme" button read oddly): the style's swatch and full name, which opens the
 * effects a card can have — each picks the theme that draws it — and one short line saying the theme sets it.
 */
const CARD_EFFECT_CHOICES: ReadonlyArray<{ theme: string; label: string; caption: string }> = [
  { theme: "shadow", label: "Shadow/Bottom/Level-1", caption: "Shadow theme" },
  { theme: "pale", label: "Effect/Overlay", caption: "Pale theme" },
  { theme: "default", label: "No effect", caption: "Default theme" },
];

export function CardEffectsSection({ api, component }: { api: FieldApi; component: string }) {
  const [settings, setSettings] = useState(false);
  const settingsId = useId();
  const value = api.valueFor("theme");
  const effect = cardThemeEffect(component, value.state === "literal" && typeof value.value === "string" ? value.value : value.state === "unset" ? undefined : "");
  if (!effect) return null;
  // Flat and Border draw none: the row says so and still offers the others, as Figma's empty Effects offers its "+".
  const shown = effect.style ? effectStyleOf(effect.style) : null;
  const name = shown?.name ?? "No effect";
  const themeName = `${effect.theme.charAt(0).toUpperCase()}${effect.theme.slice(1).replace(/-/g, " ")}`;
  const items = CARD_EFFECT_CHOICES.map((choice) => ({
    id: choice.theme,
    label: choice.label,
    caption: choice.caption,
    icon: <span className="studio-effect__swatch" data-effect={choice.theme === "flat" ? undefined : effectKey(choice.label)} aria-hidden="true" />,
    onSelect: () => { if (choice.theme !== effect.theme) api.setProp("theme", choice.theme); },
  }));
  return (
    <InspectorSection title="Effects" actions={shown ? <EffectSettingsButton open={settings} controls={settingsId} onToggle={() => setSettings((open) => !open)} /> : undefined}>
      <div className="studio-effect" data-prop="effectStyle">
        <Menu
          aria-label={`${component} effect`}
          items={items}
          trigger={(
            <Button appearance="flat" level="primary" size="md" className="studio-effect__style" title={name} disabled={api.disabled} startIcon={<span className="studio-effect__swatch" data-effect={shown ? effectKey(shown.name) : undefined} aria-hidden="true" />}>
              {name}
            </Button>
          )}
        />
      </div>
      <p className={`studio-effect__from ${typographyStyles["Caption/Regular"]}`}>Set by Theme · {themeName}</p>
      {settings && shown ? <EffectSettings id={settingsId} style={shown.name} /> : null}
    </InspectorSection>
  );
}

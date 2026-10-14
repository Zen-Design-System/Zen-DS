import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type Ref, type RefObject } from "react";
import { ColorSelector, type ColorOption } from "../ColorSelector";
import { InputField, SelectField } from "../Input";
import { Slider } from "../Slider";
import { useAnchoredPosition } from "../Popover/useAnchoredPosition";
import { useExclusivePopover } from "../Popover/useExclusivePopover";
import { useMergedRefs } from "../_shared/merge-refs";
import { useControllableState } from "../_shared/use-controllable-state";
import { useZenLabels } from "../_shared/zen-context";
import { typographyStyles } from "../../tokens/typography.generated";
import { colorFormats, formatChannels, hexToHsb, hexToRgb, hsbToHex, normalizeHex, parseChannel, type ColorFormat, type Hsb } from "./color";
import "./color-picker.css";

export { colorFormats, type ColorFormat } from "./color";

export interface ColorPickerProps {
  /** The colour as a hex value (`"#1F6FEB"`; 3-digit and lowercase are read too). Controlled with onValueChange. */
  value?: string;
  /** The first colour when uncontrolled. Default `#000000`. */
  defaultValue?: string;
  /** Called with the new value as `"#RRGGBB"` on every change: dragging the area or the hue, typing a channel, picking a saved colour. */
  onValueChange?: (value: string) => void;
  /** Which channels the value fields show (Figma `Format`): `hex` (default), `rgb`, `hsl` or `hsb`. Controlled with onFormatChange. */
  format?: ColorFormat;
  defaultFormat?: ColorFormat;
  onFormatChange?: (format: ColorFormat) => void;
  /** Saved colours under the fields (Figma `Saved`), as hex values; picking one sets the value. Empty or left out: no row. */
  savedColors?: string[];
  /**
   * Popover use, as DatePicker: `open` (default true), `onOpenChange` / `onClose` for light dismiss and Escape, `anchorRef`
   * to sit under a field. Without onClose, onOpenChange and anchorRef it is an inline panel in its container.
   */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  anchorRef?: RefObject<HTMLElement | null>;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  className?: string;
  /** The panel's root `<div>`. */
  ref?: Ref<HTMLDivElement>;
}

const FORMAT_LABELS: Record<ColorFormat, string> = { hex: "Hex", rgb: "RGB", hsl: "HSL", hsb: "HSB" };
const clamp = (value: number) => Math.min(1, Math.max(0, value));

/** A hex colour's check contrast on a ColorSelector swatch: a light colour takes the dark check. */
function contrastOf(hex: string): ColorOption["contrast"] {
  const rgb = hexToRgb(hex);
  if (!rgb) return undefined;
  const luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
  return luminance > 0.6 ? "dark" : "light";
}

/** One channel of the Format (Figma: an inline Input field, the channel letter inside). Edits apply on Enter or blur. */
function ChannelField({ letter, name, value, onCommit }: { letter: string; name: string; value: string; onCommit: (text: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    onCommit(draft);
    setDraft(null);
  };
  return (
    <InputField
      layout="inline"
      size="sm"
      label={<span aria-hidden="true">{letter}</span>}
      aria-label={name}
      value={draft ?? value}
      spellCheck={false}
      autoComplete="off"
      onValueChange={setDraft}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") { event.preventDefault(); commit(); }
        // Escape drops an edit first; with nothing to drop it goes on and closes the picker.
        else if (event.key === "Escape" && draft !== null) { event.preventDefault(); event.stopPropagation(); setDraft(null); }
      }}
    />
  );
}

/**
 * Figma Color-Picker (15708:5927): pick any colour. The Saturation area (saturation → right, brightness → up), the hue on
 * a Slider (Theme=White, its track painted with the spectrum, red held half a thumb at each end so 0° and 360° sit
 * where the thumb stops), a Format select (Hex · RGB · HSL · HSB) with that format's channels as inline Input fields, and
 * the saved colours as a ColorSelector. Panel: Popover/Background, Popover/Border, Effect/Popover, Corner-Radius/Large,
 * padding Spacing/Padding/Small, gap Spacing/Gap/Small; the area is Corner-Radius/XSmall (16 − 12, concentric).
 * Keyboard: the area is a 2D slider (← → saturation, ↑ ↓ brightness, Shift for 10 steps); Escape closes the popover.
 * It opens under ColorField; inline, it is a panel in its container (no popover surface).
 */
export function ColorPicker({
  value,
  defaultValue = "#000000",
  onValueChange,
  format: formatProp,
  defaultFormat = "hex",
  onFormatChange,
  savedColors = [],
  open = true,
  onOpenChange,
  onClose,
  anchorRef,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  className,
  ref,
}: ColorPickerProps) {
  const t = useZenLabels();
  const [hex, setHex] = useControllableState<string>({
    value: value === undefined ? undefined : normalizeHex(value) ?? "#000000",
    defaultValue: () => normalizeHex(defaultValue) ?? "#000000",
    onChange: onValueChange,
    name: "ColorPicker value",
  });
  // HSB is the picker's own state: it keeps the hue of a grey and the saturation of black while you drag.
  const [hsb, setHsb] = useState<Hsb>(() => hexToHsb(hex) ?? { h: 0, s: 0, b: 0 });
  useEffect(() => {
    if (hsbToHex(hsb) === hex) return;
    const next = hexToHsb(hex);
    if (next) setHsb((current) => (next.s === 0 ? { ...next, h: current.h } : next));
  }, [hex]); // eslint-disable-line react-hooks/exhaustive-deps -- only a value set from outside resyncs
  const commit = (next: Hsb) => {
    setHsb(next);
    setHex(hsbToHex(next));
  };
  const [format, setFormat] = useControllableState<ColorFormat>({ value: formatProp, defaultValue: defaultFormat, onChange: onFormatChange, name: "ColorPicker format" });

  // Popover behaviour, as DatePicker: anchored under the field, one popover at a time, light dismiss, Escape.
  const rootRef = useRef<HTMLDivElement>(null);
  const mergedRef = useMergedRefs(rootRef, ref);
  const placement = useAnchoredPosition(rootRef, open, { anchor: () => anchorRef?.current?.querySelector<HTMLElement>(".zen-input__control") ?? anchorRef?.current ?? null });
  const closeRef = useRef<() => void>(() => undefined);
  closeRef.current = () => { onClose?.(); onOpenChange?.(false); };
  const hasClose = Boolean(onClose || onOpenChange);
  const inline = !hasClose && !anchorRef;
  useExclusivePopover(open, hasClose ? () => closeRef.current() : undefined, rootRef, anchorRef);
  useEffect(() => {
    if (!open || !hasClose) return undefined;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target || rootRef.current?.contains(target) || anchorRef?.current?.contains(target)) return;
      closeRef.current();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open, hasClose, anchorRef]);

  // The Saturation area: a 2D slider.
  const areaRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const moveTo = (event: ReactPointerEvent<HTMLDivElement>) => {
    const box = areaRef.current?.getBoundingClientRect();
    if (!box) return;
    commit({ ...hsb, s: clamp((event.clientX - box.left) / box.width), b: clamp(1 - (event.clientY - box.top) / box.height) });
  };
  const onAreaKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 0.1 : 0.01;
    const moves: Record<string, Partial<Hsb>> = {
      ArrowRight: { s: clamp(hsb.s + step) }, ArrowLeft: { s: clamp(hsb.s - step) },
      ArrowUp: { b: clamp(hsb.b + step) }, ArrowDown: { b: clamp(hsb.b - step) },
      Home: { s: 0 }, End: { s: 1 }, PageUp: { b: clamp(hsb.b + 0.1) }, PageDown: { b: clamp(hsb.b - 0.1) },
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    commit({ ...hsb, ...move });
  };
  const saturation = Math.round(hsb.s * 100);
  const brightness = Math.round(hsb.b * 100);

  const channelNames: Record<ColorFormat, [string, string][]> = {
    hex: [["#", t.hexValue]],
    rgb: [["R", t.red], ["G", t.green], ["B", t.blue]],
    hsl: [["H", t.hue], ["S", t.saturation], ["L", t.lightness]],
    hsb: [["H", t.hue], ["S", t.saturation], ["B", t.brightness]],
  };
  const channels = formatChannels(hsb, format);
  const saved = savedColors.map((color) => normalizeHex(color)).filter((color): color is string => Boolean(color));

  if (!open) return null;
  return (
    <div
      ref={mergedRef}
      className={["zen-color-picker", className].filter(Boolean).join(" ")}
      role={inline ? "group" : "dialog"}
      aria-label={ariaLabelledBy ? undefined : ariaLabel ?? t.chooseColour}
      aria-labelledby={ariaLabelledBy}
      data-placement={inline ? "inline" : "popover"}
      data-side={inline ? undefined : placement.side}
      style={inline ? undefined : placement.style}
      onKeyDown={(event) => {
        // Escape closes the popover (an inner Select list or a channel edit handles its own Escape first). The key is
        // used up here, so a Dialog or Side Panel around the field stays open.
        if (event.key !== "Escape" || event.defaultPrevented || !hasClose) return;
        event.preventDefault();
        event.stopPropagation();
        // Focus goes back to the field that opened it (a click outside keeps the focus where it landed).
        const returnTo = rootRef.current?.contains(document.activeElement) ? anchorRef?.current?.querySelector<HTMLElement>("input, button, [tabindex]:not([tabindex='-1'])") : null;
        closeRef.current();
        returnTo?.focus({ preventScroll: true });
      }}
    >
      <div
        ref={areaRef}
        className="zen-color-picker__area"
        role="slider"
        tabIndex={0}
        aria-label={t.saturationBrightness}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={saturation}
        aria-valuetext={t.saturationBrightnessValue(saturation, brightness)}
        style={{ "--zen-color-picker-hue": `hsl(${Math.round(hsb.h)} 100% 50%)` } as CSSProperties}
        onPointerDown={(event) => { dragging.current = true; event.currentTarget.setPointerCapture(event.pointerId); event.currentTarget.focus({ preventScroll: true }); moveTo(event); }}
        onPointerMove={(event) => { if (dragging.current) moveTo(event); }}
        onPointerUp={() => { dragging.current = false; }}
        onPointerCancel={() => { dragging.current = false; }}
        onKeyDown={onAreaKeyDown}
      >
        <span className="zen-color-picker__handle" aria-hidden="true" style={{ left: `${hsb.s * 100}%`, top: `${(1 - hsb.b) * 100}%` }} />
      </div>
      <Slider
        className="zen-color-picker__hue"
        theme="white"
        size="md"
        icon={false}
        min={0}
        max={360}
        value={Math.round(hsb.h)}
        onValueChange={(h) => commit({ ...hsb, h })}
        valueText={(h) => `${h}°`}
        aria-label={t.hue}
      />
      <div className="zen-color-picker__value">
        <SelectField
          layout="inline"
          size="sm"
          label={t.colourFormat}
          options={colorFormats.map((key) => ({ value: key, label: FORMAT_LABELS[key] }))}
          value={format}
          onValueChange={(next) => setFormat(next as ColorFormat)}
        />
        <div className="zen-color-picker__channels">
          {channelNames[format].map(([letter, name], index) => (
            <ChannelField key={`${format}-${letter}-${index}`} letter={letter} name={name} value={channels[index]} onCommit={(text) => { const next = parseChannel(hsb, format, index, text); if (next) commit(next); }} />
          ))}
        </div>
      </div>
      {saved.length ? (
        <div className="zen-color-picker__saved">
          <span className={`zen-color-picker__saved-label ${typographyStyles["Body/Small/Medium"]}`} aria-hidden="true">{t.savedColours}</span>
          <ColorSelector
            aria-label={t.savedColours}
            colors={saved.map((color) => ({ value: color, label: color, contrast: contrastOf(color) }))}
            value={saved.includes(hex) ? hex : undefined}
            onValueChange={(color) => { const next = hexToHsb(color); if (next) commit(next.s === 0 ? { ...next, h: hsb.h } : next); }}
          />
        </div>
      ) : null}
    </div>
  );
}

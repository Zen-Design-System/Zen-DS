import { Fragment, useRef, useState } from "react";
import { IconButton } from "../../../components/Button";
import { Divider } from "../../../components/Divider";
import { Popover, PopoverItem } from "../../../components/Popover";
import { Text } from "../../../components/Text";
import type { ZenModes } from "../../../components/_shared/zen-context";
import { tokenModeNames, tokenModes } from "../../../tokens/modes.generated";
import type { FieldApi } from "../inspector/fieldApi";

/*
 * Figma UI3's Apply variable mode in the Appearance header (Studio Variables v2, user 2026-10-23: a frame keeps its
 * modes in the code as `modes={{ … }}`): a button that lists each collection with modes, Auto (the parent's) first,
 * the frame's own one checked. Picking writes the frame's `modes` (Auto removes that axis; none left removes the prop).
 */

/** The axes in Figma's collection order, by the collection Figma names. */
const AXES: ReadonlyArray<readonly [keyof ZenModes, string]> = [
  ["theme", "Mode Colors (Semantic)"],
  ["componentTheme", "Component Theme"],
  ["density", "Component Size"],
  ["typography", "Typography Configuration"],
  ["radius", "Corner Radius"],
  ["emphasis", "Emphasis Level"],
  ["breakpoint", "Breakpoint & Grids"],
  ["brand", "Base Colors (Project)"],
];

/** The frame's modes as written: the live object, else `key: "value"` pairs read from the expression. */
export function modesOf(api: FieldApi): ZenModes {
  const value = api.valueFor("modes");
  if (value.state === "bound" && value.live && typeof value.live === "object") return value.live as ZenModes;
  if (value.state === "bound") return Object.fromEntries([...value.expression.matchAll(/(\w+)\s*:\s*["']([^"']+)["']/g)].map((m) => [m[1], m[2]])) as ZenModes;
  return {};
}

const modeCode = (modes: ZenModes) => `{ ${Object.entries(modes).map(([axis, mode]) => `${axis}: ${JSON.stringify(mode)}`).join(", ")} }`;
const modeName = (axis: keyof ZenModes, mode: string) => (tokenModeNames[axis] as Record<string, string> | undefined)?.[mode] ?? mode;

/** The frame's `modes` from the Inspector's field API: picking writes the prop (Auto everywhere removes it). */
export function VariableModesButton({ api }: { api: FieldApi }) {
  const modes = modesOf(api);
  return (
    <VariableModesPicker
      modes={modes}
      disabled={api.disabled || api.valueFor("modes").state === "spread"}
      onChange={(next, label) => { void api.apply(next ? [{ op: "setProp", name: "modes", value: { kind: "expression", code: modeCode(next) } }] : [{ op: "removeProp", name: "modes" }], label); }}
    />
  );
}

/** The `modes` prop's code for a set of modes (`{ theme: "dark" }`). */
export { modeCode };

/**
 * The picker itself (a Stack, Grid or Box's Appearance header, a Screen's section): `onChange(next | null, label)`,
 * null when every axis is back to Auto.
 */
export function VariableModesPicker({ modes, disabled, onChange }: { modes: ZenModes; disabled: boolean; onChange: (next: ZenModes | null, label: string) => void }) {
  const own = AXES.filter(([axis]) => modes[axis]);
  const [open, setOpen] = useState(false);
  const [withKeys, setWithKeys] = useState(false);
  const anchor = useRef<HTMLSpanElement>(null);
  const pick = (axis: keyof ZenModes, mode: string | null) => {
    setOpen(false);
    if ((modes[axis] ?? null) === mode) return;
    const next: ZenModes = { ...modes };
    if (mode) (next as Record<string, string>)[axis] = mode;
    else delete next[axis];
    onChange(Object.keys(next).length ? next : null, `${AXES.find(([each]) => each === axis)?.[1]} → ${mode ? modeName(axis, mode) : "Auto"}`);
  };
  const summary = own.length ? own.map(([axis]) => modeName(axis, modes[axis] as string)).join(", ") : "Auto";
  return (
    <span ref={anchor} className="studio-blend">
      {/* zen-allow-filter-button: Figma UI3's Apply variable mode in the Appearance header, an icon beside the blend; not a filter */}
      <IconButton
        icon="icon-layers-three-01-line"
        aria-label="Apply variable mode"
        tooltip={`Variable modes: ${summary}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        appearance="flat"
        level={own.length ? "secondary" : "primary"}
        size="xs"
        disabled={disabled}
        onClick={(event) => { setWithKeys(event.detail === 0); setOpen((shown) => !shown); }}
      />
      <Popover open={open} onOpenChange={(next) => { if (!next) setOpen(false); }} anchorRef={anchor} align="end" autoFocus={withKeys} aria-label="Apply variable mode">
        {AXES.filter(([axis]) => (tokenModes[axis] ?? []).filter((mode) => mode !== "studio").length > 1).map(([axis, collection], index) => (
          <Fragment key={axis}>
            {index ? <Divider decorative /> : null}
            <Text as="span" textStyle="Caption/Medium" tone="light" className="studio-modes__collection">{collection}</Text>
            <PopoverItem label="Auto" caption="The parent's" selected={!modes[axis]} onSelect={() => pick(axis, null)} />
            {tokenModes[axis].filter((mode) => mode !== "studio").map((mode) => (
              <PopoverItem key={mode} label={modeName(axis, mode)} selected={modes[axis] === mode} onSelect={() => pick(axis, mode)} />
            ))}
          </Fragment>
        ))}
      </Popover>
    </span>
  );
}

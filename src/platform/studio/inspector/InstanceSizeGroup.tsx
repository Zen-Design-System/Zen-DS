import { useId, useSyncExternalStore } from "react";
import { typographyStyles } from "../../../tokens/typography.generated";
import { instanceSizing, type InstanceAxis, type InstanceSizing } from "../select/instanceSizing";
import type { AxisView, SizingAxis, SizingInput } from "./sizingModel";
import { SizeField } from "./SizingSection";

/*
 * W / H of a Zen instance (GĐ4 M4): Hug · Fill · Fixed as in Figma's instance panel, the same fields as a Stack's Size
 * group. The canvas publishes how the selected instance resizes (select/instanceSizing.ts) and writes each choice the
 * way a drag of its handles does: its own size prop or fullWidth, else a Stack around it that it fills (the Studio wrap
 * Stack it already sits in takes later sizes; Hug takes that Stack away again). One choice = one request = one undo step.
 */

/** The selected instance's sizing while the canvas shows it (null: none, or another element). */
export function useInstanceSizing(src: string | null): InstanceSizing | null {
  const sizing = useSyncExternalStore(instanceSizing.subscribe, instanceSizing.get, instanceSizing.get);
  return sizing && src && sizing.src === src ? sizing : null;
}

const viewOf = (axis: SizingAxis, value: InstanceAxis): AxisView => {
  const px = value.mode === "fixed" ? Math.round(value.px) : null;
  const text = value.mode === "hug" ? "Hug" : value.mode === "fill" ? "Fill" : String(px);
  return { axis, mode: value.mode, px, written: value.written, editable: true, source: value.written ? "literal" : "unset", fromParent: false, text };
};

export function InstanceSizeGroup({ sizing, disabled }: { sizing: InstanceSizing; disabled: boolean }) {
  const labelId = useId();
  const axes = (["width", "height"] as const).filter((axis) => sizing[axis]);
  if (!axes.length) return null;
  const choose = (axis: SizingAxis, input: SizingInput) => {
    const measured = Math.round(sizing[axis]?.px ?? 0);
    // "Reset to auto" is the component's own size again: Hug.
    if (input.kind === "hug" || input.kind === "auto") sizing.set(axis, { kind: "hug" });
    else if (input.kind === "fill") sizing.set(axis, { kind: "fill" });
    else if (input.kind === "fixed") sizing.set(axis, { kind: "fixed", px: input.px });
    else if (input.kind === "fixed-current" && measured >= 1) sizing.set(axis, { kind: "fixed", px: measured });
  };
  return (
    <div className="studio-sizing" role="group" aria-labelledby={labelId} data-prop="width" data-instance="true" data-stacked={sizing.stacked || undefined}>
      <span id={labelId} className={`studio-sizing__label ${typographyStyles["Caption/Regular"]}`}>Resizing</span>
      <div className="studio-sizing__pair" data-single={axes.length === 1 || undefined}>
        {axes.map((axis) => (
          <SizeField
            key={axis}
            view={viewOf(axis, sizing[axis]!)}
            measured={Math.round(sizing[axis]!.px)}
            parent={sizing.parent}
            limits=""
            disabled={disabled}
            align={axis === "width" ? "start" : "end"}
            onInput={(input) => choose(axis, input)}
          />
        ))}
        <span className="studio-sizing__slot" />
      </div>
    </div>
  );
}

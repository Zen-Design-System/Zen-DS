import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { IconButton } from "../../../components/Button";
import { Checkbox } from "../../../components/Checkbox";
import { InputField, TextAreaField } from "../../../components/Input";
import { Text } from "../../../components/Text";
import { codeSyntaxOf, VARIABLE_SCOPES, type VariableMeta } from "../../../../tools/studio/variables.mjs";
import type { Variable } from "./variablesModel";

/*
 * Figma's Edit variable (a row's ⋯ › Edit variable; Studio Variables v2, docs/research/studio-variables-v2-spec-2026-10-23.md):
 * name, description, scoping ("Show in all supported properties" or the properties of its type), code syntax (Web: the
 * CSS custom property code reads, from the name, read only) and Hide from publishing. Each change is written at once, one
 * draft edit (⌘Z) of the collection, as Figma applies them; the Zen plugin's import writes them in Figma.
 */

/** Figma's scope names, as its Edit variable panel words them. */
const SCOPE_LABEL: Readonly<Record<string, string>> = {
  ALL_FILLS: "All fills", FRAME_FILL: "Frame fill", SHAPE_FILL: "Shape fill", TEXT_FILL: "Text fill", STROKE_COLOR: "Stroke", EFFECT_COLOR: "Effects",
  CORNER_RADIUS: "Corner radius", WIDTH_HEIGHT: "Width and height", GAP: "Gap", STROKE_FLOAT: "Stroke", OPACITY: "Layer opacity", EFFECT_FLOAT: "Effects",
  FONT_WEIGHT: "Font weight", FONT_SIZE: "Font size", LINE_HEIGHT: "Line height", LETTER_SPACING: "Letter spacing", PARAGRAPH_SPACING: "Paragraph spacing",
  PARAGRAPH_INDENT: "Paragraph indent", FONT_FAMILY: "Font family", FONT_STYLE: "Font style", TEXT_CONTENT: "Text content",
};
/** All fills holds the three fills: checked, they show checked and wait. */
const IN_ALL_FILLS = new Set(["FRAME_FILL", "SHAPE_FILL", "TEXT_FILL"]);

export function EditVariable({ variable, rect, disabled, onRename, onMeta, onClose }: {
  variable: Variable & VariableMeta;
  rect: DOMRect;
  disabled: boolean;
  onRename: (to: string) => void;
  onMeta: (meta: VariableMeta) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(variable.name);
  const [description, setDescription] = useState(variable.description ?? "");
  const panel = useRef<HTMLDivElement>(null);
  const scopes = VARIABLE_SCOPES[variable.type] ?? [];
  const all = variable.scopes === undefined;
  const picked = new Set(variable.scopes ?? []);
  useEffect(() => setName(variable.name), [variable.name]);
  useEffect(() => {
    const onDown = (event: PointerEvent) => { if (panel.current && !panel.current.contains(event.target as Node)) onClose(); };
    window.addEventListener("pointerdown", onDown, true);
    return () => window.removeEventListener("pointerdown", onDown, true);
  }, [onClose]);
  const commitName = () => { const to = name.trim(); if (to && to !== variable.name) onRename(to); else setName(variable.name); };
  const commitDescription = () => { if (description.trim() !== (variable.description ?? "")) onMeta({ description }); };
  const toggle = (scope: string, on: boolean) => {
    const next = new Set(all ? scopes : picked);
    if (on) next.add(scope); else next.delete(scope);
    onMeta({ scopes: scopes.filter((each) => next.has(each)) });
  };
  const onKeyDown = (event: ReactKeyboardEvent) => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); }
  };
  const top = Math.min(rect.bottom + 4, window.innerHeight - 520);
  const left = Math.min(Math.max(8, rect.left), window.innerWidth - 320);
  return (
    <div ref={panel} className="studio-vars__editor studio-vars__details" role="dialog" aria-label={`Edit variable ${variable.name}`} style={{ top, left }} onKeyDown={onKeyDown}>
      <div className="studio-vars__details-head">
        <Text as="span" textStyle="Body/Small/Bold">Edit variable</Text>
        <IconButton icon="icon-x-line" appearance="flat" size="xs" aria-label="Close" onClick={onClose} />
      </div>
      <InputField size="sm" label="Name" value={name} disabled={disabled} onValueChange={setName} onBlur={commitName}
        onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); commitName(); } }} />
      <TextAreaField size="sm" label="Description" value={description} disabled={disabled} onValueChange={setDescription} onBlur={commitDescription} />
      {scopes.length ? (
        <fieldset className="studio-vars__scopes" disabled={disabled}>
          <legend className="studio-vars__legend"><Text as="span" textStyle="Body/Small/Medium">Scoping</Text></legend>
          <Checkbox label="Show in all supported properties" checked={all} disabled={disabled}
            onCheckedChange={(on) => onMeta({ scopes: on ? ["ALL_SCOPES"] : scopes })} />
          {scopes.map((scope) => {
            const held = all || (IN_ALL_FILLS.has(scope) && picked.has("ALL_FILLS"));
            return <Checkbox key={scope} label={SCOPE_LABEL[scope] ?? scope} checked={held || picked.has(scope)} disabled={disabled || held} onCheckedChange={(on) => toggle(scope, on)} />;
          })}
        </fieldset>
      ) : null}
      <div className="studio-vars__code">
        <Text as="span" textStyle="Body/Small/Medium">Code syntax</Text>
        <Text as="span" textStyle="Body/Small/Regular" tone="base" title="From the variable's name: the CSS custom property code reads">Web · {codeSyntaxOf(variable.name)}</Text>
      </div>
      <Checkbox label="Hide from publishing" checked={variable.hiddenFromPublishing === true} disabled={disabled} onCheckedChange={(on) => onMeta({ hiddenFromPublishing: on })} />
    </div>
  );
}

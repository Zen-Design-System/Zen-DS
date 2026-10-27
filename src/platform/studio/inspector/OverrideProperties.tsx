import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { IconButton } from "../../../components/Button";
import { plural } from "../../../components/Text";
import { applyEdit, parseSrc, studioApi, useStudioServer } from "../api";
import { currentFiber, onSourceUpdate } from "../select/picker";
import type { PartHit } from "../select/parts";
import { canEdit, useStudio } from "../store";
import type { SourceElement, StudioSelection } from "../types";
import { nestedRows } from "./nestedInstances";
import { overrideOps, overrideTable, withOverride, withoutLayer, type OverrideTable } from "./overrides";
import { holds, isSetValue } from "./propGroups";
import { PropField } from "./PropField";
import type { Literal, PropValue } from "./propSchema";
import { InspectorSection } from "./Section";
import { undoShortcut } from "./status";

/*
 * Figma's nested instance, any depth: a part its owner draws as a nested layer (Card's Sub-Action, its Leading-Icon, a
 * Table row's Badge) shows its own Figma properties, and every edit is an instance override written on the owner
 * (`overrides`, src/components/_shared/nested.tsx; one setProp, one undo step). Pages made in the Studio only: hand-written
 * code changes the owner's own props instead (the user's Q2, docs/research/studio-doc-engine-plan-2026-10-10.md §8).
 */

type PartSelection = Extract<StudioSelection, { kind: "node" }>;

const literalOf = (value: unknown): Literal | undefined => (typeof value === "string" || typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value)) ? value : undefined);

export function OverrideProperties({ selection, part, path, title = "Properties", note, table: given, onWrite }: {
  selection: PartSelection; part: PartHit; path: string; title?: string; note?: ReactNode;
  /** The owner's overrides when its rendered props do not hold them (a page's own instance, `<Use overrides>`: F7b). */
  table?: OverrideTable;
  /** Writes the owner's next overrides (a page's own instance). */
  onWrite?: (next: OverrideTable, label: string) => void;
}) {
  const parsed = parseSrc(selection.src);
  const server = useStudioServer();
  const role = useStudio((state) => state.role);
  const undoCount = useStudio((state) => state.undo.length);
  const [element, setElement] = useState<SourceElement | null>(null);
  const [version, setVersion] = useState(0);
  useEffect(() => onSourceUpdate(() => setVersion((value) => value + 1)), []);
  useEffect(() => {
    if (!parsed) return undefined;
    let alive = true;
    void studioApi.element(parsed.file, parsed.loc).then((next) => { if (alive) setElement(next); });
    return () => { alive = false; };
  }, [parsed?.file, parsed?.loc, version, undoCount]);
  const owner = selection.name;
  const ownerProps = part.owner.fiber ? currentFiber(part.owner.fiber).memoizedProps ?? {} : {};
  const props: Record<string, unknown> = currentFiber(part.fiber).memoizedProps ?? {};
  const table = given ?? overrideTable(ownerProps.overrides);
  const own = table[path] ?? {};
  const editable = canEdit() && role === "admin" && server.writable && Boolean(element);
  const write = (next: OverrideTable, label: string) => {
    if (onWrite) { onWrite(next, label); return; }
    if (!element) return;
    const ops = overrideOps(table, next);
    if (ops.length) void applyEdit({ file: element.file, loc: element.loc, name: owner, ops, hash: element.hash }, label);
  };
  const valueOf = (prop: string): PropValue => {
    const value = literalOf(own[prop] ?? props[prop]);
    return value === undefined ? { state: "unset" } : { state: "literal", value, raw: JSON.stringify(value) };
  };
  /*
   * A boolean switched back to what the main component shows drops its override, as Figma's instance returns to its
   * main component (user, 2026-10-13: off left `hint: false` behind). Off removes an override that switched the layer
   * on, unless the owner passes the prop itself (MetricCard's hint reaches its Metric): then `false` hides it. On
   * removes a `false` override (it only ever hid a layer the main component shows), else writes the starting value.
   */
  const toggleOverride = (name: string, on: boolean, start: Literal): Literal | null => {
    const overridden = name in own;
    const ownerPasses = Boolean(element?.attributes.some((attr) => attr.kind !== "spread" && attr.name === name));
    if (on) return overridden && own[name] === false ? null : start;
    return overridden && own[name] !== false && !ownerPasses ? null : false;
  };
  const rows = nestedRows(part.name).filter((row) => holds(row.when, props));
  const count = Object.keys(own).length;
  const reset = count ? (
    <IconButton
      icon="icon-reverse-left-line"
      appearance="flat"
      level="primary"
      size="xs"
      aria-label="Reset all changes"
      tooltip={`Reset all changes · ${plural(count, "property", "properties")} of this ${part.name} back to ${owner}'s · ${undoShortcut} to undo`}
      disabled={!editable}
      onClick={() => write(withoutLayer(table, path), `${owner} › ${path}: reset all changes`)}
    />
  ) : null;
  return (
    <InspectorSection title={title} actions={reset} note={rows.length ? note : `${part.name} has no properties to change`}>
      {rows.map((row) => (row.kind === "toggle" ? (
        // A Figma boolean that shows a layer: on writes its starting value (Figma's default icon), off hides it.
        <PropField
          key={`toggle:${row.label}`}
          spec={{ name: row.spec.name, type: "boolean", description: `Figma boolean ${row.label}: shows the ${row.label} layer.`, defaultValue: false, editor: { kind: "boolean" } }}
          label={row.label}
          value={{ state: "literal", value: isSetValue(own[row.spec.name] ?? props[row.spec.name]), raw: "" }}
          disabled={!editable}
          resettable={row.spec.name in own}
          onSet={(on) => write(withOverride(table, path, row.spec.name, toggleOverride(row.spec.name, on === true, row.on)), `${owner} › ${path}: ${row.label} ${on === true ? "on" : "off"}`)}
          onReset={() => write(withOverride(table, path, row.spec.name, null), `${owner} › ${path}: reset ${row.label}`)}
        />
      ) : (
        <PropField
          key={row.spec.name}
          spec={row.spec}
          label={row.label}
          optionLabels={row.optionLabels}
          defaultIcon={row.defaultIcon}
          component={part.name}
          value={valueOf(row.spec.name)}
          disabled={!editable}
          resettable={row.spec.name in own}
          onSet={(value: Literal) => write(withOverride(table, path, row.spec.name, value), `${owner} › ${path}: ${row.label} → ${String(value)}`)}
          onReset={() => write(withOverride(table, path, row.spec.name, null), `${owner} › ${path}: reset ${row.label}`)}
        />
      )))}
    </InspectorSection>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Button, IconButton } from "../../../../components/Button";
import { Icon } from "../../../../components/Icon";
import { Menu } from "../../../../components/Menu";
import { Segmented } from "../../../../components/Segmented";
import { Text } from "../../../../components/Text";
import { InspectorFields, InspectorSection } from "../../inspector/Section";
import { RowInputField } from "../../inspector/rowFields";
import type { PageTree } from "../render/renderPage";
import { editVars, freeVarName, pageVarsOf, VAR_ICON, VAR_START, VAR_WORDS, varUsesOf, type PageVar } from "./protoVars";
import type { VarType } from "../../../../../tools/studio/proto-vars.mjs";

/*
 * The page's prototype variables in the Prototype tab (W-52 phase B2, docs/research/studio-prototype-variables-2026-10-31.md
 * §3.1): one row each, its kind's icon, its name and its start value (what the canvas draws and Restart goes back to);
 * + adds one of a kind, ⋯ changes its kind or deletes it (a variable in use asks first). Not the Zen tokens: those are in
 * Local variables. Every change is one edit of the page (op "pageVars"), one undo step.
 */

const TYPES: readonly VarType[] = ["text", "number", "boolean"];

export function VariablesSection({ file, tree, disabled }: { file: string; tree: PageTree | null; disabled: boolean }) {
  const vars = pageVarsOf(tree);
  const uses = useMemo(() => varUsesOf(tree), [tree]);
  // A variable just added: its name field takes the focus, as Figma's new variable does.
  const [fresh, setFresh] = useState<string | null>(null);
  const add = (type: VarType) => {
    const name = freeVarName(type, vars.map((entry) => entry.name));
    setFresh(name);
    void editVars(file, tree, { add: { name, value: VAR_START[type] } }, `Add variable ${name}`);
  };
  const addMenu = disabled || !tree?.board ? null : (
    <Menu
      align="end"
      trigger={<IconButton appearance="flat" level="primary" size="xs" icon="icon-plus-line" aria-label="Add variable" tooltip="Add variable" />}
      items={TYPES.map((type) => ({ id: type, label: VAR_WORDS[type], icon: VAR_ICON[type] }))}
      onSelect={(item) => add(item.id as VarType)}
    />
  );
  return (
    <InspectorSection title="Variables" actions={addMenu} note={vars.length ? undefined : "Variables change in Play. Layers and actions read them."}>
      <div className="studio-prototype__vars" data-e2e="prototype-variables">
        {vars.map((entry) => (
          <VariableRow key={entry.name} entry={entry} uses={uses.get(entry.name)?.size ?? 0} file={file} tree={tree} disabled={disabled} focus={fresh === entry.name} onFocused={() => setFresh(null)} />
        ))}
      </div>
    </InspectorSection>
  );
}

/** One variable: its name (Enter or leaving the field renames it everywhere) and its start value; ⋯ for the rest. */
function VariableRow({ entry, uses, file, tree, disabled, focus, onFocused }: { entry: PageVar; uses: number; file: string; tree: PageTree | null; disabled: boolean; focus: boolean; onFocused: () => void }) {
  const [name, setName] = useState(entry.name);
  useEffect(() => setName(entry.name), [entry.name]);
  const shownValue = String(entry.value);
  const [value, setValue] = useState(shownValue);
  useEffect(() => setValue(shownValue), [shownValue]);
  const [asking, setAsking] = useState(false);
  const rename = () => {
    const next = name.trim();
    if (!next || next === entry.name) { setName(entry.name); return; }
    void editVars(file, tree, { rename: { from: entry.name, to: next } }, `Rename variable ${entry.name} to ${next}`).then((ok) => { if (!ok) setName(entry.name); });
  };
  const setStart = (next: string | boolean) => {
    if (String(next) === shownValue) return;
    void editVars(file, tree, { set: { name: entry.name, value: next } }, `${entry.name} starts as ${String(next)}`);
  };
  const remove = () => {
    setAsking(false);
    void editVars(file, tree, { remove: entry.name }, `Delete variable ${entry.name}`);
  };
  const onKey = (commit: () => void, reset: () => void) => (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") { event.preventDefault(); commit(); }
    if (event.key === "Escape") reset();
  };
  const nameField = (
    <RowInputField
      aria-label={`Variable ${entry.name} name`}
      size="sm"
      leading={VAR_ICON[entry.type]}
      disabled={disabled}
      value={name}
      autoFocus={focus}
      onFocus={(event) => { if (focus) { event.currentTarget.select(); onFocused(); } }}
      onChange={(event) => setName(event.target.value.replace(/\s/g, ""))}
      onBlur={rename}
      onKeyDown={onKey(rename, () => setName(entry.name))}
    />
  );
  const valueField = entry.type === "boolean" ? (
    <Segmented
      aria-label={`${entry.name} start value`}
      size="sm"
      fullWidth
      disabled={disabled}
      value={entry.value ? "on" : "off"}
      onValueChange={(next) => setStart(next === "on")}
      options={[{ id: "off", label: "Off" }, { id: "on", label: "On" }]}
    />
  ) : (
    <RowInputField
      aria-label={`${entry.name} start value`}
      size="sm"
      inputMode={entry.type === "number" ? "decimal" : undefined}
      disabled={disabled}
      value={value}
      placeholder={entry.type === "text" ? "Empty" : "0"}
      onChange={(event) => setValue(event.target.value)}
      onBlur={() => setStart(value)}
      onKeyDown={onKey(() => setStart(value), () => setValue(shownValue))}
    />
  );
  const menu = disabled ? null : (
    <Menu
      align="end"
      trigger={<IconButton appearance="flat" level="primary" size="xs" icon="icon-dots-horizontal-line" aria-label={`${entry.name} options`} tooltip="More" />}
      items={[
        // Its kind, as Change to …; the kind it has already is not offered.
        ...TYPES.filter((type) => type !== entry.type).map((type) => ({ id: `type:${type}`, label: `Change to ${VAR_WORDS[type].toLowerCase()}`, icon: VAR_ICON[type] })),
        { type: "separator" as const, id: "separator" },
        { id: "delete", label: "Delete", icon: "icon-trash-line" },
      ]}
      onSelect={(item) => {
        if (item.id === "delete") { if (uses) setAsking(true); else remove(); return; }
        const type = item.id.slice("type:".length) as VarType;
        if (type !== entry.type) void editVars(file, tree, { retype: { name: entry.name, type } }, `${entry.name} is ${VAR_WORDS[type].toLowerCase()}`);
      }}
    />
  );
  return (
    <div className="studio-prototype__var" data-var={entry.name}>
      <InspectorFields name={`var:${entry.name}`} fields={[nameField, valueField]} icon={menu} />
      {asking ? (
        <div className="studio-prototype__var-ask" role="group" aria-label={`Delete ${entry.name}?`}>
          <Text tone="light" textStyle="Caption/Regular">{`Used by ${uses} ${uses === 1 ? "layer" : "layers"}. Delete anyway?`}</Text>
          <Button appearance="main" level="tertiary" size="sm" onClick={() => setAsking(false)}>Cancel</Button>
          <Button appearance="main" level="danger" size="sm" startIcon={<Icon name="icon-trash-line" decorative />} onClick={remove}>Delete</Button>
        </div>
      ) : null}
    </div>
  );
}

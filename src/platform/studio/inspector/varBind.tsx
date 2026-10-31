import { createContext, useContext } from "react";
import { IconButton } from "../../../components/Button";
import { Icon } from "../../../components/Icon";
import { Menu } from "../../../components/Menu";
import { typographyStyles } from "../../../tokens/typography.generated";
import type { VarType } from "../../../../tools/studio/proto-vars.mjs";
import { literalCode, VAR_ICON, VAR_MARK, type PageVar } from "../builder/proto/protoVarsModel";

/*
 * Bind a field to a prototype variable (W-52 phase B2, docs/research/studio-prototype-variables-2026-10-31.md §3.3):
 * Figma's bind control on a property. The Design panel of a layer on a page made in the Studio gives its fields the
 * page's variables and the writes (VarBindContext); a field shows its Bind button on hover and, once bound, a pill with
 * the variable and an Unbind that writes the value it showed back.
 */

export type VarBind = {
  vars: readonly PageVar[];
  /** Writes `code` (`vars.x`, `vars.x === "…"`) as the prop's value. */
  bindProp: (prop: string, code: string, label: string) => void;
  /** Adds a variable of `type` starting at `start`, and binds the prop to it (`code`: how the prop reads it, `vars.x`
   *  by default; one undo step). */
  createForProp: (prop: string, type: VarType, start: string | number | boolean, code?: (name: string) => string) => void;
  /** The `index`-th words of the layer read the variable `name` instead. */
  bindText: (index: number, name: string) => void;
  /** Adds a text variable starting at the words, and binds them to it (one undo step). */
  createForText: (index: number, words: string) => void;
  /** The words that read `code` (`vars.x`) become `words` again. */
  unbindText: (code: string, words: string) => void;
};

export const VarBindContext = createContext<VarBind | null>(null);
export const useVarBind = () => useContext(VarBindContext);

/** The variable kind a field of this editor kind takes; null for one that takes none. */
export const varKindOf = (editor: string): VarType | null => (editor === "string" || editor === "enum" || editor === "node" ? "text" : editor === "number" ? "number" : editor === "boolean" ? "boolean" : null);

const CREATE = "__create";

/** The Bind button (Figma's hexagon, here {x}): the page's variables of the field's kind, a boolean field also "is" one
 *  text variable's start value, and Create variable…. */
export function VarBindButton({ label, kind, onPick, onCreate }: { label: string; kind: VarType; onPick: (code: string, words: string) => void; onCreate: () => void }) {
  const bind = useVarBind();
  if (!bind) return null;
  const own = bind.vars.filter((entry) => entry.type === kind);
  const compared = kind === "boolean" ? bind.vars.filter((entry) => entry.type === "text" || entry.type === "number") : [];
  const items = [
    ...own.map((entry) => ({ id: `vars.${entry.name}`, label: entry.name, icon: VAR_ICON[entry.type] })),
    ...compared.map((entry) => ({ id: `vars.${entry.name} === ${literalCode(entry.value)}`, label: `${entry.name} is ${String(entry.value) || "empty"}`, icon: VAR_ICON[entry.type] })),
    ...(own.length || compared.length ? [{ type: "separator" as const, id: "separator" }] : []),
    { id: CREATE, label: "Create variable…", icon: "icon-plus-line" as const },
  ];
  return (
    <Menu
      align="end"
      trigger={<IconButton className="studio-var-bind" appearance="flat" level="primary" size="xs" icon={VAR_MARK} aria-label={`Bind ${label} to a variable`} tooltip="Bind to variable" />}
      items={items}
      onSelect={(item) => {
        if (item.id === CREATE) onCreate();
        else onPick(item.id, String((item as { label?: unknown }).label ?? item.id));
      }}
    />
  );
}

/** A bound field's value: the variable's mark and its words (`dateRange`, `dateRange is "Any time"`). */
export function VarPill({ words }: { words: string }) {
  return (
    <span className={`studio-var-pill ${typographyStyles["Body/Small/Medium"]}`} title={`Reads the variable: ${words}`}>
      <Icon name={VAR_MARK} size="2xs" decorative />
      <span className="studio-var-pill__text">{words}</span>
    </span>
  );
}

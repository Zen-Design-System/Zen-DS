import { useMemo } from "react";
import { SelectField } from "../../../components/Input";
import { tokenChoices } from "./tokens";

/*
 * The token a library component's declaration reads, as a select of existing tokens (spec §2, M2): its family first
 * (the same token at another step), then every token of its kind, each with the value it stands for now.
 */

const short = (name: string) => name.replace(/^--zen-/, "");

export function TokenField({ label, prop, token, disabled, onPick }: { label: string; prop: string; token: string; disabled: boolean; onPick: (name: string) => void }) {
  const options = useMemo(() => tokenChoices(token, prop).map((choice) => ({ value: choice.name, label: short(choice.name), meta: choice.value })), [token, prop]);
  return (
    <SelectField
      aria-label={`${label} token`}
      size="sm"
      value={token}
      disabled={disabled}
      popoverSearch
      popoverSearchPlaceholder="Search tokens"
      onValueChange={(name) => { if (name !== token) onPick(name); }}
      options={options}
    />
  );
}

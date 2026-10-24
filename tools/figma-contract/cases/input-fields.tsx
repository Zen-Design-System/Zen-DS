// Harness case kinds for the input-fields suites (tools/figma-contract/suites/input-*.mjs). cases.tsx merges every
// group's kinds. Each field renders in a box as wide as the Figma variant (its FILL / FIXED width).
import { useEffect, useRef, type ReactNode } from "react";
import { AutocompleteField, DateField, InputContent, InputField, InputLeadingTrailing, NumberField, SelectField, TextAreaField } from "../../../src/components/Input";
import { Flag } from "../../../src/components/Flag";

type Props = Record<string, any>;
const box = (width: number, node: ReactNode) => <div style={{ width }}>{node}</div>;
// Field-Only's Leading/Trailing default: Leading-Trailing Flag=Yes (Vietnam) · Label "VN" · Dropdown, at `slot` size.
const flagSlot = (slot: string) => <InputLeadingTrailing size={slot as never} flag={<Flag name="Vietnam" />} label="VN" dropdown />;
// Autocomplete Focused / Inputted-Focused: the Add Item button opened the option list (clicked once on mount).
function OpenAutocomplete(props: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.querySelector<HTMLButtonElement>(".zen-autocomplete__add .zen-button")?.click(); }, []);
  return <AutocompleteField ref={ref} {...(props as never)} />;
}

export const cases: Record<string, (props: Props) => ReactNode> = {
  inputFieldsText: ({ width, slot, ...p }) => box(width, <InputField {...p} {...(slot ? { leading: flagSlot(slot), trailing: flagSlot(slot) } : null)} />),
  inputFieldsSelect: ({ width, ...p }) => box(width, <SelectField {...(p as never)} />),
  inputFieldsDate: ({ width, ...p }) => box(width, <DateField {...p} />),
  inputFieldsNumber: ({ width, ...p }) => box(width, <NumberField {...(p as never)} />),
  inputFieldsTextArea: ({ width, ...p }) => box(width, <TextAreaField {...(p as never)} />),
  // `rowStarts` / `fragileWrap` (where Figma's tag rows break) are for the suite's map only.
  inputFieldsAutocomplete: ({ width, open, rowStarts, fragileWrap, ...p }) => box(width, open ? <OpenAutocomplete {...p} /> : <AutocompleteField {...(p as never)} />),
  inputFieldsContent: (p) => <InputContent {...p} />,
};

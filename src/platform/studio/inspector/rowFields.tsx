import { InputField, SelectField, type InputFieldProps, type SelectFieldProps } from "../../../components/Input";
import { useInlineLabel } from "./Section";

/*
 * Zen fields placed straight in an InspectorRow by panels other than PropField (Prototype, Variant, Frame, Inset, Mixed):
 * in a label-left row they draw Figma's Input/Inline-Field with the row's label inside (Section.tsx useInlineLabel), as
 * PropField's controls do; anywhere else they are the plain field.
 */

export function RowSelectField(props: SelectFieldProps) {
  const label = useInlineLabel();
  return <SelectField {...props} layout={label ? "inline" : props.layout} label={label ?? props.label} />;
}

export function RowInputField(props: InputFieldProps) {
  const label = useInlineLabel();
  return <InputField {...props} layout={label ? "inline" : props.layout} label={label ?? props.label} />;
}

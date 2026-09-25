import type { Meta, StoryObj } from "@storybook/react-vite";
import { Icon } from "../Icon";
import { InputField, SelectField, TextAreaField, inputStates } from "./Input";

const inputIconOptions = {
  none: undefined,
  user: <Icon name="icon-user-circle-line" size="sm" decorative />,
  search: <Icon name="icon-search-medium-line" size="sm" decorative />,
} as const;

const meta = {
  title: "Components/Input",
  component: InputField,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: "Input/Text-Field is the shared field primitive for Search, Select, Date, Autocomplete, Number and Rich Text compositions. Playground controls the visual contract; Effect States is the deterministic comparison surface.",
      },
    },
  },
  args: { label: "Label", placeholder: "Placeholder", size: "medium", state: "default", leading: "user" },
  argTypes: {
    size: { control: "inline-radio", options: ["small", "medium", "large", "xlarge"] },
    state: { control: "select", options: inputStates.filter((state) => state !== "error") },
    leading: { control: "select", options: Object.keys(inputIconOptions), mapping: inputIconOptions },
    trailing: { control: "select", options: ["none"], mapping: { none: undefined } },
  },
} satisfies Meta<typeof InputField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  parameters: {
    docs: {
      description: { story: "Use the controls to switch size, state and affordance. The field keeps the same Input primitive used by Search and dropdown compositions." },
      source: { type: "dynamic" },
    },
  },
};

export const FieldSet: Story = {
  render: () => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 24, maxWidth: 720 }}>
      <InputField label="Name" placeholder="Enter your name" leading={<Icon name="icon-user-circle-line" size="sm" />} />
      <InputField label="Email" state="focused" placeholder="name@example.com" leading={<Icon name="icon-mail-01-line" size="sm" />} />
      <InputField label="Project" error="This field is required." state="blank-error" />
      <InputField label="Read only" state="read-only" readOnly value="Zen Platform" />
      <InputField label="Disabled" state="disabled" disabled value="Zen Platform" />
      <TextAreaField label="Description" placeholder="Tell us more" />
      <SelectField label="Theme" options={[{ label: "Neutral - S1", value: "neutral-s1" }, { label: "Brand - S1", value: "brand-s1" }]} />
    </div>
  ),
};

export const EffectStates: Story = {
  render: () => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 24 }}>
      {inputStates.filter((state) => state !== "error").map((state) => (
        <InputField key={state} label={state} state={state} placeholder="Placeholder" helpText="Field-only effect; label and help stay outside." />
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: { story: "The state axis is intentionally rendered as a matrix so border, fill, inset shadow, focus ring and message behavior can be compared without relying on hover timing." },
    },
  },
};

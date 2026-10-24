import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { PropertyDate, PropertyField, PropertyPeople, PropertySelect, PropertyStatus, PropertyTags, PropertyText, type PropertyFieldOption } from "./PropertyField";
import type { BadgeStatusValue } from "../BadgeStatus";

const meta = {
  title: "Components/PropertyField",
  component: PropertyField,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  args: { label: "Status", icon: "icon-loading-02-line" },
} satisfies Meta<typeof PropertyField>;

export default meta;
type Story = StoryObj<typeof meta>;

const priorities: PropertyFieldOption[] = [
  { value: "urgent", label: "Urgent", icon: "icon-flag-03-solid", tone: "negative" },
  { value: "high", label: "High", icon: "icon-flag-03-solid", tone: "negative" },
  { value: "normal", label: "Normal", icon: "icon-flag-03-solid", tone: "warning" },
  { value: "low", label: "Low", icon: "icon-flag-03-solid", tone: "neutral" },
];
const people: PropertyFieldOption[] = [
  { value: "alex", label: "Alex Duong" },
  { value: "sun", label: "Sun Hung" },
  { value: "linh", label: "Linh Tran" },
];
const labels: PropertyFieldOption[] = [
  { value: "ds", label: "Design System", theme: "blue" },
  { value: "ui", label: "UI Design", theme: "orange" },
  { value: "research", label: "Research", theme: "green" },
];

/** The task properties of the Figma example: every value type in two columns. */
export const TaskProperties: Story = {
  render: () => {
    const [status, setStatus] = useState<BadgeStatusValue>("to-do");
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "4px 32px", maxWidth: 880 }}>
        <PropertyField label="Status" icon="icon-loading-02-line"><PropertyStatus value={status} onValueChange={setStatus} /></PropertyField>
        <PropertyField label="Priority" icon="icon-flag-01-line"><PropertySelect options={priorities} defaultValue="urgent" /></PropertyField>
        <PropertyField label="Start Date" icon="icon-calendar-line"><PropertyDate /></PropertyField>
        <PropertyField label="Assignee" icon="icon-users-plus-line"><PropertyPeople options={people} defaultValue={["alex"]} /></PropertyField>
        <PropertyField label="Due Date" icon="icon-calendar-line"><PropertyDate defaultValue={new Date(2026, 5, 7)} /></PropertyField>
        <PropertyField label="Reporter" icon="icon-user-left-line"><PropertyPeople single options={people} defaultValue={["sun"]} /></PropertyField>
        <PropertyField label="Labels" icon="icon-tag-line"><PropertyTags options={labels} defaultValue={["ds", "ui"]} /></PropertyField>
        <PropertyField label="Sprint" icon="icon-text-input-line"><PropertyText defaultValue="Sprint 42 · Design QA" /></PropertyField>
      </div>
    );
  },
};

/** Figma's State column, fixed: Default (empty), Inputted, Hover, Editing. */
export const States: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 4, maxWidth: 440 }}>
      {(["default", "inputted", "hover", "editing"] as const).map((state) => (
        <PropertyField key={state} label={state} icon="icon-text-input-line">
          <PropertyText state={state} defaultValue={state === "default" ? "" : "Sprint 42 · Design QA"} />
        </PropertyField>
      ))}
    </div>
  ),
};

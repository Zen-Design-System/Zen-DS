import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../Button";
import { Card } from "../Card";
import { DescriptionItem, DescriptionList, descriptionListLayouts } from "./DescriptionList";

const receipt = [
  { term: "Subtotal", description: "$311.90" },
  { term: "Shipping", description: "$10.00" },
  { term: "Tax", description: "$24.95" },
  { term: "Total", description: "$346.85", emphasis: true },
];

const meta = {
  title: "Components/DescriptionList",
  component: DescriptionList,
  tags: ["autodocs"],
  parameters: { layout: "padded", docs: { description: { component: "A semantic dl of term → description pairs: inline (term left, value right; stacks under stackBelow (280) px) or stacked, optional Pale dividers and one emphasised total row." } } },
  args: { layout: "inline", divider: false, stackBelow: 280, items: receipt },
  argTypes: { layout: { control: "inline-radio", options: descriptionListLayouts } },
  decorators: [(Story) => <div style={{ maxWidth: 420 }}><Story /></div>],
} satisfies Meta<typeof DescriptionList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OrderSummary: Story = {};

export const StackedWithActions: Story = {
  args: { layout: "stacked", divider: true, items: undefined },
  render: (args) => (
    <Card theme="border">
      <DescriptionList {...args}>
        <DescriptionItem term="Email" description="ava.chen@zen-studio.example" action={<Button level="tertiary" size="sm">Edit</Button>} />
        <DescriptionItem term="Phone" description="+84 28 3823 4567" action={<Button level="tertiary" size="sm">Edit</Button>} />
        <DescriptionItem term="Shipping address" description="12 Nguyen Hue, Ben Nghe Ward, District 1, Ho Chi Minh City 700000, Vietnam" action={<Button level="tertiary" size="sm">Edit</Button>} />
      </DescriptionList>
    </Card>
  ),
};

export const NarrowStacksItself: Story = {
  decorators: [(Story) => <div style={{ width: 260 }}><Story /></div>],
  args: { items: [{ term: "Order number", description: "#10428-VN" }, { term: "Placed on", description: "Thursday, 2 October 2026" }, { term: "Payment", description: "Visa ending 4242" }] },
};

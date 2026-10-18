import type { Meta, StoryObj } from "@storybook/react-vite";
import { Card } from "../Card";
import { ChartCard } from "../Chart";
import { Heading } from "../Text";
import { EmptyState } from "./EmptyState";

const meta = {
  title: "Components/EmptyState",
  component: EmptyState,
  tags: ["autodocs"],
  parameters: { layout: "centered", docs: { description: { component: "Figma Empty-State (16339:135): placeholder illustration, Heading/4 title, caption and full-width Primary + Tertiary CTAs. Size Medium (240 illustration) when it fills a page, Small (200) in a widget, card or section. Inside a ChartCard the title steps one level below the card title in Body/Extra/Bold and the size is Small." } } },
  args: { title: "Empty State Title", children: "Dummy caption for empty state here.", primaryAction: { label: "Call to Action" }, secondaryAction: { label: "Call to Action" } },
  argTypes: { headingLevel: { control: "inline-radio", options: [2, 3, 4, 5, 6] }, size: { control: "inline-radio", options: ["md", "sm"] } },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
/** Small: the 200 illustration for an Empty State in a widget, card, table, tab panel or side panel. */
export const Small: Story = { args: { size: "sm", secondaryAction: undefined } };

/** Inside a ChartCard: Small by default, h4 under the h3 card title, Body/Extra/Bold so it is not larger than the Heading/Subheading card title. */
export const InChartCard: Story = {
  args: { title: "No data yet", children: "Sign-ups appear here after the first day of tracking.", icon: "icon-bar-chart-up-line", primaryAction: { label: "Connect analytics" }, secondaryAction: undefined },
  render: (args) => <div style={{ width: 480 }}><ChartCard title="Weekly sign-ups"><EmptyState {...args} /></ChartCard></div>,
};

/** In a Card you title yourself (an h2 Subheading title here): size Small, headingLevel one below it and compactTitle,
 *  so the Empty State title (Body/Extra/Bold) is not larger than the card title. */
export const InTitledCard: Story = {
  args: { title: "No invoices yet", children: "Invoices you send appear here.", size: "sm", headingLevel: 3, compactTitle: true, primaryAction: { label: "Create invoice" }, secondaryAction: undefined },
  render: (args) => <div style={{ width: 480 }}><Card theme="border"><Heading level={2} textStyle="Heading/Subheading">Invoices</Heading><EmptyState {...args} /></Card></div>,
};

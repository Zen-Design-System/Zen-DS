import type { Meta, StoryObj } from "@storybook/react-vite";
import { Heading, Text, textTones } from "./Text";
import { typographyStyles, type TypographyStyleName } from "../../tokens/typography.generated";

const styles = Object.keys(typographyStyles) as TypographyStyleName[];

const meta = {
  title: "Components/Text",
  component: Text,
  tags: ["autodocs"],
  parameters: { layout: "padded", docs: { description: { component: "Figma text styles with Zen content colours. Titles use Heading (h1–h6); everything else Text." } } },
  args: { children: "Invite people to collaborate on this project.", textStyle: "Body/Base/Regular", tone: "strongest", as: "p" },
  argTypes: { textStyle: { control: "select", options: styles }, tone: { control: "select", options: textTones } },
} satisfies Meta<typeof Text>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
export const Tones: Story = { render: () => <div style={{ display: "grid", gap: 8 }}>{textTones.map((tone) => <Text key={tone} tone={tone}>{tone}: The quick brown fox</Text>)}</div> };
export const Headings: Story = { render: () => <div style={{ display: "grid", gap: 12 }}>{([1, 2, 3, 4, 5, 6] as const).map((level) => <Heading key={level} level={level}>Heading level {level}</Heading>)}</div> };
export const Truncate: Story = { render: () => <div style={{ width: 280, display: "grid", gap: 12 }}><Text truncate>A long file name that does not fit on one line — Q4 marketing plan final v3.pdf</Text><Text truncate={2}>Two lines at most: the rest of this description is clamped with an ellipsis so cards keep an even height in a grid.</Text></div> };

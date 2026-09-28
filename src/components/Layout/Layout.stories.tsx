import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../Button";
import { Heading, Text } from "../Text";
import { Box, Container, Grid, Stack } from "./Layout";

const meta = {
  title: "Components/Layout",
  component: Stack,
  tags: ["autodocs"],
  parameters: { layout: "padded", docs: { description: { component: "Stack, Grid, Box and Container: layout with the Figma spacing, padding and radius scales instead of hand-written CSS." } } },
  args: { gap: "md", direction: "column" },
  render: (args) => (
    <Stack {...args}>
      <Box surface="surface" border="pale" radius="lg" padding="md"><Text>First</Text></Box>
      <Box surface="surface" border="pale" radius="lg" padding="md"><Text>Second</Text></Box>
      <Box surface="surface" border="pale" radius="lg" padding="md"><Text>Third</Text></Box>
    </Stack>
  ),
} satisfies Meta<typeof Stack>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
export const Toolbar: Story = {
  render: () => (
    <Stack direction="row" justify="between" align="center">
      <Heading level={2} textStyle="Heading/3">Team members</Heading>
      <Stack direction="row" gap="sm"><Button level="tertiary">Export</Button><Button level="primary">Invite member</Button></Stack>
    </Stack>
  ),
};
export const CardGrid: Story = {
  render: () => (
    <Container maxWidth="md">
      <Grid minColumnWidth={200}>
        {["Design", "Engineering", "Marketing", "Sales", "Support"].map((team) => (
          <Box key={team} surface="surface" border="pale" radius="lg" padding="lg"><Stack gap="2xs"><Text textStyle="Body/Base/Bold">{team}</Text><Text textStyle="Body/Small/Regular" tone="base">12 members</Text></Stack></Box>
        ))}
      </Grid>
    </Container>
  ),
};

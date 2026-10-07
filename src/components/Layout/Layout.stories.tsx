import type { Meta, StoryObj } from "@storybook/react-vite";
import photo from "../../assets/media/site-santorini.webp";
import { Badge } from "../Badge";
import { Button } from "../Button";
import { Image } from "../Image";
import { Heading, Text } from "../Text";
import { Box, Container, Grid, Stack, boxEffectStyles } from "./Layout";

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
/** Figma auto-layout resizing: Fixed, Fill and Hug per axis, min/max, alignSelf and fillChildren. */
export const Sizing: Story = {
  render: () => (
    <Stack gap="xl">
      <Stack direction="row" gap="md" align="stretch">
        <Box width={240} surface="surface" border="pale" radius="lg" padding="md"><Text textStyle="Body/Small/Regular" tone="base">Fixed 240 — a side column</Text></Box>
        <Box width="fill" minWidth={160} surface="surface" border="pale" radius="lg" padding="md"><Text textStyle="Body/Small/Regular" tone="base">Fill — takes the rest of the row</Text></Box>
        <Box width="hug" surface="surface" border="pale" radius="lg" padding="md"><Text textStyle="Body/Small/Regular" tone="base">Hug</Text></Box>
      </Stack>
      <Stack direction="row" gap="sm" fillChildren width={360}>
        <Button level="tertiary">Cancel</Button>
        <Button level="primary">Save changes</Button>
      </Stack>
      <Stack direction="row" gap="md" height={200}>
        <Stack gap="xs" width="fill" height="fill" padding="md">
          <Box width="fill" height={48} surface="subtle" radius="md" />
          <Box width="fill" height="fill" surface="pale" radius="md" />
        </Stack>
        <Stack gap="xs" width="fill" padding="md" justify="center">
          <Heading level={3} width="hug" alignSelf="center">Centred title</Heading>
          <Text width="fill" maxWidth={320} alignSelf="center" align="center" tone="base">A Fill paragraph capped at 320px so the line stays readable.</Text>
        </Stack>
      </Stack>
    </Stack>
  ),
};
/** Figma "Ignore auto layout" + constraints: background media first, content after it, a corner badge Right/Top sm and a caption bar Left & right/Bottom. */
export const Position: Story = {
  render: () => (
    <Box surface="subtle" radius="xl" width={480} height={260} clip>
      <Box position="absolute" constraintX="left-right" constraintY="top-bottom">
        <Image src={photo} alt="Whitewashed houses above the caldera in Santorini" radius="none" ratio="16:9" />
      </Box>
      <Box position="absolute" constraintX="right" constraintY="top" insetRight="sm" insetTop="sm">
        <Badge size="sm">New</Badge>
      </Box>
      <Box position="absolute" constraintX="left-right" constraintY="bottom" surface="surface" paddingX="md" paddingY="sm">
        <Stack direction="row" justify="between">
          <Text textStyle="Body/Small/Bold">Oia, Santorini</Text>
          <Text textStyle="Body/Small/Regular" tone="base">12 photos</Text>
        </Stack>
      </Box>
      <Box position="absolute" constraintX="center" constraintY="center" surface="surface" radius="full" paddingX="sm" paddingY="2xs">
        <Text textStyle="Body/Small/Medium">Cover photo</Text>
      </Box>
    </Box>
  ),
};
/** Figma effect styles on a Box: drop shadows render on surface="surface" only; Effect/Overlay blurs behind a Pale fill. */
export const EffectStyle: Story = {
  render: () => (
    <Grid minColumnWidth={180} gap="lg" padding="lg">
      {boxEffectStyles.filter((style) => style.startsWith("Shadow/")).map((style) => (
        <Box key={style} surface="surface" radius="xl" padding="lg" effectStyle={style}><Text textStyle="Body/Small/Medium">{style}</Text></Box>
      ))}
      <Box surface="pale" radius="xl" padding="lg" effectStyle="Effect/Overlay"><Text textStyle="Body/Small/Medium">Effect/Overlay</Text></Box>
    </Grid>
  ),
};
/** Per-corner radius on the Corner-Radius tokens: a chat tail, a sheet top and top media in a card. */
export const Corners: Story = {
  render: () => (
    <Stack direction="row" gap="lg" align="start" wrap>
      <Box surface="subtle" radius="xl" radiusBottomRight="xs" paddingX="md" paddingY="sm"><Text>See you at nine</Text></Box>
      <Box surface="surface" border="pale" radiusTopLeft="3xl" radiusTopRight="3xl" width={240} height={120} padding="lg"><Text textStyle="Body/Base/Bold">Share photo</Text></Box>
      <Box surface="surface" border="pale" radius="2xl" width={240} clip>
        <Image src={photo} alt="Whitewashed houses above the caldera in Santorini" ratio="16:9" radius="none" radiusTopLeft="2xl" radiusTopRight="2xl" />
        <Box padding="md"><Text textStyle="Body/Base/Bold">Santorini</Text></Box>
      </Box>
    </Stack>
  ),
};
/** Figma "Clip content": the absolute layer is cut to the Box's rounded corners. */
export const Clip: Story = {
  render: () => (
    <Stack direction="row" gap="lg">
      {[false, true].map((clip) => (
        <Box key={String(clip)} surface="surface" border="pale" radius="2xl" width={200} height={120} clip={clip}>
          <Box position="absolute" constraintX="left-right" constraintY="top" surface="subtle" height={48} />
          <Box padding="md"><Text textStyle="Body/Small/Medium">{clip ? "Clip content" : "No clip"}</Text></Box>
        </Box>
      ))}
    </Stack>
  ),
};

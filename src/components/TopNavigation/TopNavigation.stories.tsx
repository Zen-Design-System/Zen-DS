import type { Meta, StoryObj } from "@storybook/react-vite";
import { Avatar } from "../Avatar";
import { Badge } from "../Badge";
import { TopNavigation, topNavigationTypes } from "./TopNavigation";

const meta = {
  title: "Components/TopNavigation",
  component: TopNavigation,
  tags: ["autodocs"],
  parameters: { layout: "centered", docs: { description: { component: "Figma Top-Navigation/Mobile (12014:45167): navigator bar (leading · Sub heading · trailing) + Expand-Heading + Control-Bar; 10 Types × Margin." } } },
  args: {
    type: "default",
    margin: "comfortable",
    title: "Heading",
    largeTitle: "Heading",
    leading: { icon: "icon-chevron-left-line-medium", label: "Back" },
    trailing: [{ icon: "icon-plus-line", label: "Add" }],
    largeTitleAction: { icon: "icon-plus-line", label: "New" },
  },
  argTypes: { type: { control: "select", options: topNavigationTypes } },
  decorators: [(Story) => <div style={{ width: 390 }}><Story /></div>],
} satisfies Meta<typeof TopNavigation>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
/** The screen keeps one title heading: the large title is the h1 (Heading/1) while it shows; collapsed, or with no large
 *  title, the bar title is the h1 in its own Body/Extra/Bold, so content headings start at h2. */
export const Collapsed: Story = { args: { collapsed: true } };
export const Compact: Story = { args: { type: "compact" } };

/** Figma Main-Heading-Text Capline + Subheading (◇ Master-Layout · Example F3): a brand above the large title, the room under it. */
export const CaplineAndSubheading: Story = {
  args: {
    type: "transparent",
    title: "HomePod mini",
    largeTitle: "HomePod mini",
    largeTitleCapline: "Apple",
    largeTitleSubheading: "Living room",
    largeTitleAction: undefined,
    trailing: [{ icon: "icon-dots-horizontal-line", label: "More" }],
  },
};

/** A root with a Capline (F1 15991:10116): the bar row folds into the large-title row, its actions level with the first line. */
export const RootWithCapline: Story = {
  args: {
    type: "transparent",
    title: "Home",
    largeTitle: "Hi, Mai Anh",
    largeTitleCapline: "Welcome home",
    leading: undefined,
    largeTitleAction: undefined,
    trailing: [{ icon: "icon-bell-01-line", label: "Notifications, 2 new", dot: true }, { icon: "icon-plus-line", label: "Add device" }],
  },
};

/** Figma Top-bar=false without an Expand-Heading (D2 15948:9920): only the status-bar inset; the title is for screen readers. */
export const StatusBarOnly: Story = {
  args: { type: "transparent", topBar: false, title: "Welcome to zenio", largeTitle: undefined, leading: undefined, trailing: [], largeTitleAction: undefined },
};

/** Visuals in the Trailing-Slot (D3 15950:9324): an Orange Badge and a Medium Avatar beside a root's large title. */
export const TrailingVisuals: Story = {
  args: {
    type: "transparent",
    title: "Home",
    largeTitle: "Home",
    leading: undefined,
    largeTitleAction: undefined,
    trailing: [
      // zen-allow-badge-count: a 3-day streak, not a count to clear (Figma Header-Trailing: Badge Medium Orange Solid with its zap).
      <Badge key="streak" size="md" theme="orange" background="solid" leading="icon-zap-line">3</Badge>,
      <Avatar key="me" size="md" alt="Max Rivera">MR</Avatar>,
    ],
  },
};

/** A 56 square Avatar in the bar (D4 15950:9696): it overhangs the slot padding, the bar stays 64. */
export const TrailingLargeAvatar: Story = {
  args: {
    type: "alt",
    title: "Profile",
    largeTitle: undefined,
    largeTitleAction: undefined,
    trailing: [<Avatar key="me" size="lg" shape="square" status alt="Max Rivera">MR</Avatar>],
  },
};

/** A navigation stack nested in a screen that already has its h1: `headingLevel` h2 draws the large title Heading/2
 *  (h3 → Heading/3); the bar title keeps Body/Extra/Bold at every level. */
export const NestedHeadingLevel: Story = { args: { headingLevel: "h2", title: "Members", largeTitle: "Members", largeTitleAction: undefined } };

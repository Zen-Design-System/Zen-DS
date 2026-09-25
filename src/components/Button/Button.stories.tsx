import type { Meta, StoryObj } from "@storybook/react-vite";
import { Icon } from "../Icon";
import { Button, buttonLevels, buttonSizes, buttonStates } from "./Button";
import "./button.stories.css";

const meta = {
  title: "Components/Button/Main",
  component: Button,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: "Button/Main exposes the Figma level, size, deterministic state, and icon-layout axes. Use Playground for a single implementation contract; use the matrices for visual comparison.",
      },
    },
  },
  args: {
    children: "Button",
    level: "primary",
    size: "md",
    state: "default",
    disabled: false,
  },
  argTypes: {
    level: { control: "select", options: buttonLevels },
    size: { control: "select", options: buttonSizes },
    state: { control: "select", options: buttonStates },
    startIcon: { control: false },
    endIcon: { control: false },
    onClick: { action: "clicked" },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  args: {
    endIcon: <Icon name="icon-arrow-right-line" decorative />,
  },
  parameters: {
    docs: {
      description: { story: "Controls update this single Button instance. The Code panel shows the equivalent production JSX." },
      source: { type: "dynamic" },
    },
  },
};

export const Levels: Story = {
  render: () => (
    <div className="button-story-grid button-story-grid--levels">
      {buttonLevels.map((level) => (
        <div className="button-story-cell" key={level}>
          <span>{level}</span>
          <Button level={level}>Button</Button>
        </div>
      ))}
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="button-story-stack">
      {buttonSizes.map((size) => (
        <div className="button-story-row" key={size}>
          <span>{size}</span>
          <Button
            size={size}
            startIcon={<Icon name="icon-plus-line" decorative />}
            endIcon={<Icon name="icon-arrow-right-line" decorative />}
          >
            Button
          </Button>
        </div>
      ))}
    </div>
  ),
};

export const IconLayouts: Story = {
  render: () => (
    <div className="button-story-grid">
      <Button startIcon={<Icon name="icon-plus-line" decorative />}>Leading icon</Button>
      <Button endIcon={<Icon name="icon-arrow-right-line" decorative />}>Trailing icon</Button>
      <Button
        startIcon={<Icon name="icon-download-01-line" decorative />}
        endIcon={<Icon name="icon-arrow-right-line" decorative />}
      >
        Both icons
      </Button>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="button-story-grid button-story-grid--levels">
      {buttonLevels.map((level) => (
        <div className="button-story-cell" key={level}>
          <span>{level}</span>
          <Button
            level={level}
            disabled
            startIcon={<Icon name="icon-check-line" decorative />}
          >
            Disabled
          </Button>
        </div>
      ))}
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div className="button-story-grid">
      {buttonStates.map((state) => <Button key={state} level="primary" state={state} disabled={state === "disabled"}>{state}</Button>)}
    </div>
  ),
  parameters: {
    docs: {
      description: { story: "Deterministic state props are used for documentation only; real hover, press, focus-visible, and disabled behavior remains interactive in the rendered component." },
    },
  },
};

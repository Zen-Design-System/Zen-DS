import type { Meta, StoryObj } from "@storybook/react-vite";
import { forwardRef, type AnchorHTMLAttributes } from "react";
import { Text } from "../Text";
import { Link, linkTones, linkUnderlines } from "./Link";

const meta = {
  title: "Components/Link",
  component: Link,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: { description: { component: "An inline link in the Content/Hyperlink colours (Default · Pressed · Visited). It takes the font of the text around it; `external` opens a new tab and says so; `as` renders a router link." } },
  },
  args: { href: "#billing", children: "Billing settings", underline: "hover", tone: "hyperlink", external: false, visited: false },
  argTypes: { underline: { control: "inline-radio", options: linkUnderlines }, tone: { control: "inline-radio", options: linkTones } },
  render: (args) => <Text tone="base">Invoices and receipts are in <Link {...args} />. Download them as PDF.</Text>,
} satisfies Meta<typeof Link>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** Links inside running text are always underlined, so they never rely on colour alone. */
export const InRunningText: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 12, maxWidth: 480 }}>
      <Text tone="base">If you lose your phone, sign in with one of your <Link href="#recovery" underline="always">recovery codes</Link> or ask a <Link href="#admins" underline="always">workspace admin</Link>.</Text>
      <Text textStyle="Body/Small/Regular" tone="light">The link takes the font of its paragraph: <Link href="#small" underline="always">small text</Link>.</Text>
    </div>
  ),
};

export const External: Story = {
  render: () => <Text>Send the key in the <Link href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Authorization" external>Authorization header</Link>.</Text>,
};

export const Underlines: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 8 }}>
      {linkUnderlines.map((underline) => <Text key={underline}><Link href={`#${underline}`} underline={underline}>underline=“{underline}”</Link></Text>)}
    </div>
  ),
};

/** tone="inherit" takes the surrounding colour and is underlined by default. */
export const InheritTone: Story = {
  render: () => <Text textStyle="Body/Small/Regular" tone="light">By continuing you agree to the <Link href="#terms" tone="inherit">Terms of service</Link> and the <Link href="#privacy" tone="inherit">Privacy policy</Link>.</Text>,
};

const RouterLink = forwardRef<HTMLAnchorElement, Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { to: string }>(function RouterLink({ to, ...rest }, ref) {
  return <a {...rest} ref={ref} href={`#${to}`} />;
});

/** `as` renders a router's link and forwards its own props (`to`). */
export const AsRouterLink: Story = {
  render: () => <Text>Open <Link as={RouterLink} to="/projects/atlas">Project Atlas</Link>.</Text>,
};

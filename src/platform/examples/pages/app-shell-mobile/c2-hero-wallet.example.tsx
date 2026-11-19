import { useId, useState, type RefObject } from "react";
import {
  AppShell, Avatar, BottomNavigation, Button, Card, Heading, IconButton, Link, List, ListItem, Stack, Text, TopNavigation,
  useToast, type AvatarProps, type BottomNavigationItem, type IconName,
} from "@zen-ds/react";

type AvatarTheme = NonNullable<AvatarProps["theme"]>;

const walletRoots: BottomNavigationItem[] = [
  { id: "home", label: "Home", icon: "icon-home-01-line", selectedIcon: "icon-home-01-solid" },
  { id: "cards", label: "Cards", icon: "icon-credit-card-line", selectedIcon: "icon-credit-card-solid" },
  { id: "insights", label: "Insights", icon: "icon-pie-chart-01-line", selectedIcon: "icon-pie-chart-01-solid" },
  { id: "account", label: "Account", icon: "icon-user-line", selectedIcon: "icon-user-solid" },
];
const quickActions: { id: string; icon: IconName; label: string }[] = [
  { id: "bills", icon: "icon-receipt-line", label: "Pay bills" },
  { id: "scan", icon: "icon-scan-line", label: "Scan" },
  { id: "savings", icon: "icon-piggy-bank-line", label: "Savings" },
  { id: "more", icon: "icon-dots-grid-line", label: "More" },
];
const walletTransactions: { id: string; initials: string; theme: AvatarTheme; title: string; caption: string; amount: string }[] = [
  { id: "sea", initials: "SG", theme: "blue", title: "From Sea Group", caption: "Received · Today", amount: "+40,000,000" },
  { id: "highlands", initials: "HC", theme: "orange", title: "Highlands Coffee", caption: "Card · Today", amount: "−65,000" },
  { id: "grab", initials: "GR", theme: "green", title: "Grab ride", caption: "Wallet · Yesterday", amount: "−48,000" },
];

/** C2 · Hero Wallet (Figma ◇ Master-Layout · Example, 15921:8204): AppShell/Mobile · Phone · Top=Bar · Bottom=Floating. */
// scrollRef: what scrolls the screen, so the bar follows the scroll. "window" in your app.
export default function HeroWalletPhone({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const [root, setRoot] = useState("home");
  const transactionsId = useId();
  return (
    // Bar + Floating: the number the user opens the app for sits in the one Solid Neutral hero (Inverse content and
    // buttons); the quick actions follow as Surface icon buttons, then a Flat list. The floating bar keeps the central
    // scan / pay action beside the destinations.
    <AppShell
      topNavigation={<TopNavigation title="Hi, Maya" subtitle="Personal account" scrollRef={scrollRef}
        leading={<Avatar size="md" theme="accent" alt="Maya">M</Avatar>}
        trailing={[{ icon: "icon-bell-01-line", label: "Notifications", onClick: () => toast({ title: "+40,000,000 from Sea Group", children: "Received today" }) }]} />}
      bottomNavigation={<BottomNavigation type="floating" aria-label="Wallet" value={root} onValueChange={setRoot} items={walletRoots}
        action={{ icon: "icon-plus-line", label: "Scan or pay", theme: "primary", onClick: () => toast({ title: "Scan a QR code to pay", children: "Or pick a contact to send money." }) }} />}
    >
      {/* One section per group of content (a section gap apart, from the AppShell body); the widgets inside keep md. */}
      <Stack gap="md">
        <Card theme="solid" color="neutral">
          <Stack gap="md">
            <Stack gap="2xs">
              <Text textStyle="Body/Small/Regular" tone="light">Total balance</Text>
              <Text as="p" textStyle="Display/4">₫20,089,680</Text>
              <Text textStyle="Body/Small/Medium" tone="base">+850,000 this week · 850 USD</Text>
            </Stack>
            <Stack direction="row" gap="xs" fillChildren>
              <Button appearance="overlay" level="inverse" startIcon="icon-plus-line" onClick={() => toast({ title: "Top up", children: "From a linked bank account or card." })}>Top up</Button>
              <Button appearance="overlay" level="inverse-subtle" startIcon="icon-arrow-up-line" onClick={() => toast({ title: "Transfer", children: "Send to a contact, a bank account or a phone number." })}>Transfer</Button>
            </Stack>
          </Stack>
        </Card>
        <Stack as="ul" direction="row" justify="between" align="start" gap="none" aria-label="Quick actions">
          {quickActions.map((item) => (
            <Stack as="li" key={item.id} gap="xs" align="center">
              {/* zen-allow-no-tooltip: the action's visible label sits right under the button (Figma Quick-Actions). */}
              <IconButton size="lg" level="surface" icon={item.icon} aria-label={item.label} tooltip={false} onClick={() => toast({ title: item.label })} />
              <Text as="span" textStyle="Caption/Medium" tone="base" aria-hidden="true">{item.label}</Text>
            </Stack>
          ))}
        </Stack>
      </Stack>
      <Stack as="section" gap="md" aria-labelledby={transactionsId}>
        <Stack direction="row" justify="between" align="center" gap="xs">
          <Heading level={2} id={transactionsId} textStyle="Heading/4">Transactions</Heading>
          <Text as="span" textStyle="Body/Base/Bold">
            <Link as="button" tone="inherit" onClick={() => setRoot("insights")}>See All</Link>
          </Text>
        </Stack>
        <List aria-labelledby={transactionsId}>
          {walletTransactions.map((entry) => (
            <ListItem key={entry.id} title={entry.title} caption={entry.caption} value={entry.amount}
              leading={<Avatar size="md" theme={entry.theme} background="subtle" alt="">{entry.initials}</Avatar>}
              onClick={() => toast({ title: entry.title, children: `${entry.amount} · ${entry.caption}` })} />
          ))}
        </List>
      </Stack>
    </AppShell>
  );
}

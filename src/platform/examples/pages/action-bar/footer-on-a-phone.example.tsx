import { useId, useRef, useState, type RefObject } from "react";
import {
  ActionBar, AppShell, Badge, BottomNavigation, Box, Card, DescriptionList, DockIcon, Heading, List, ListBox, ListItem, MetricCard, Stack, Text, TopNavigation,
  plural, useToast, type BottomNavigationItem, type DockIconTheme, type IconName,
} from "@zen-ds/react";
import { daysFromToday, formatDate } from "../../data";

/** The Phin & Co app's roots. */
const phinRoots: BottomNavigationItem[] = [
  { id: "home", label: "Home", icon: "icon-home-03-line", selectedIcon: "icon-home-03-solid" },
  { id: "order", label: "Order", icon: "icon-coffee-cup-line", selectedIcon: "icon-coffee-cup-solid" },
  { id: "rewards", label: "Rewards", icon: "icon-gift-01-line", selectedIcon: "icon-gift-01-solid" },
  { id: "account", label: "Account", icon: "icon-user-line", selectedIcon: "icon-user-solid" },
];
/** Gold, the next member tier, starts at 500 points. */
const GOLD_POINTS = 500;
type Reward = { id: string; name: string; points: number; where: string; about: string; icon: IconName; theme: DockIconTheme };
const rewards: Reward[] = ([
  ["sua-da", "Phin sữa đá", 120, "Any store", "Our robusta, slow-dripped over condensed milk and ice. Any size.", "icon-coffee-cup-line", "brown"],
  ["bac-xiu", "Bạc xỉu", 120, "Any store", "More milk than coffee, the way Saigon drinks it in the afternoon. Any size.", "icon-coffee-cup-line", "brown"],
  ["cold-brew", "Orange cold brew", 150, "Any store", "Cold brew steeped for 18 hours, with orange and lemongrass.", "icon-coffee-cup-line", "brown"],
  ["lotus-tea", "Golden lotus tea", 130, "Any store", "Oolong scented with West Lake lotus, hot or iced.", "icon-salad-leaf-line", "green"],
  ["banh-mi", "Bánh mì chả cá", 90, "Stores with a kitchen", "Fish cake, pickles and herbs in a baguette baked each morning.", "icon-bread-line", "orange"],
  ["upsize", "Free upsize", 40, "Any store", "Make any drink one size larger.", "icon-arrow-up-line", "blue"],
  ["affogato", "Affogato", 160, "Any store", "Coconut ice cream under a shot of phin coffee.", "icon-ice-cream-line", "pink"],
  ["off-20", "20% off an order", 200, "App orders", "Twenty percent off one app order, up to $10.", "icon-percent-01-line", "purple"],
  ["delivery", "Free delivery", 60, "App orders", "No delivery fee on one app order within 5 km.", "icon-truck-line", "teal"],
  ["tote", "Phin canvas tote", 400, "Nguyen Hue store", "A heavy cotton tote, printed in District 1.", "icon-shopping-bag-01-line", "indigo"],
  ["beans", "Robusta beans, 250 g", 480, "Any store", "Whole beans from our farm in Đắk Lắk, roasted this week.", "icon-package-line", "brown"],
  ["filter", "Phin filter set", 650, "Any store", "A stainless steel phin with two cups, to brew at home.", "icon-gift-01-line", "red"],
  ["cupping", "Weekend cupping class", 900, "Thu Duc roastery", "Two hours with our roasters, tasting this season's lots.", "icon-ticket-01-line", "violet"],
  ["gift-card", "$10 gift card", 1000, "Any store", "A card to give, loaded with $10.", "icon-gift-02-line", "golden"],
] as const).map(([id, name, points, where, about, icon, theme]) => ({ id, name, points, where, about, icon, theme }));
const pointsLabel = (n: number) => plural(n, "point");
const back = "icon-chevron-left-line-medium" as const;

/** A reward in the Phin & Co app: its main action leads the Action bar, and the summary says why it waits. */
// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function PhoneRewards({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const nowId = useId();
  const laterId = useId();
  const [balance, setBalance] = useState(340);
  const [saved, setSaved] = useState<string[]>([]);
  const [codes, setCodes] = useState<Record<string, string>>({});
  // The example opens on a reward, the screen it teaches; Back leads to the list.
  const [openId, setOpenId] = useState<string | null>("sua-da");
  const [fromId, setFromId] = useState("sua-da");
  // Focus follows the screen: a reward focuses its title, Back returns to the row it came from.
  const titleRef = useRef<HTMLSpanElement>(null);
  const rowRef = useRef<HTMLElement>(null);
  const reward = rewards.find((item) => item.id === openId);
  const open = (id: string) => {
    setOpenId(id);
    setFromId(id);
    setTimeout(() => titleRef.current?.focus());
  };
  const backToList = () => {
    setOpenId(null);
    setTimeout(() => rowRef.current?.focus());
  };
  /** A place this example does not draw: the toast says so, and the tab bar keeps this root. */
  const notHere = (label: string) => toast({ title: `${label} isn't part of this example`, children: "This screen shows the Action Bar." });

  if (!reward) {
    // What the points buy today first, then what they are saving up for; both lists follow the balance.
    const groups = [
      { id: nowId, title: "Redeem now", rows: rewards.filter((item) => item.points <= balance) },
      { id: laterId, title: "Keep collecting", rows: rewards.filter((item) => item.points > balance) },
    ].filter((group) => group.rows.length);
    return (
      // A tab root of the Phin & Co app: the large title folds as the rewards scroll under the bar, and the tab bar holds
      // the app's roots. The tab bar casts a shadow, so the points card and the lists take the same Shadow elevation.
      <AppShell key="root"
        topNavigation={<TopNavigation scrollRef={scrollRef} title="Rewards" largeTitle="Rewards" largeTitleSubheading="Phin & Co member · Silver" />}
        // The other roots are not drawn here: a toast says so, and the bar keeps Rewards (a selected tab shows its solid icon).
        bottomNavigation={<BottomNavigation aria-label="Phin & Co" showLabels items={phinRoots} value="rewards"
          onValueChange={(id) => { if (id !== "rewards") notHere(phinRoots.find((item) => item.id === id)?.label ?? id); }} />}
      >
        <MetricCard theme="shadow" type="goal-progress" label="Your points" value={pointsLabel(balance)} icon="icon-star-01-solid" iconTheme="accent"
          format={(points) => points.toLocaleString("en-US")}
          goal={{ value: balance, target: GOLD_POINTS, label: `of ${GOLD_POINTS} for Gold`, valueLabel: balance >= GOLD_POINTS ? "Gold" : `${plural(GOLD_POINTS - balance, "point")} to go` }} />
        {groups.map((group) => (
          <Stack key={group.id} as="section" gap="xs" aria-labelledby={group.id}>
            {/* A list's group title on a phone: Body/Small/Bold Light, lined up with the row text inside its ListBox. */}
            <Box paddingX="lg"><Heading level={2} id={group.id} textStyle="Body/Small/Bold" tone="light" truncate={false}>{group.title}</Heading></Box>
            <ListBox theme="shadow">
              <List aria-labelledby={group.id}>
                {group.rows.map((item) => (
                  <ListItem key={item.id} ref={item.id === fromId ? rowRef : undefined} tabIndex={item.id === fromId ? -1 : undefined}
                    title={item.name} caption={`${pointsLabel(item.points)} · ${item.where}`}
                    leading={<DockIcon icon={item.icon} theme={item.theme} background="subtle" />}
                    trailing={codes[item.id] ? <Badge theme="green" background="subtle">Redeemed</Badge> : saved.includes(item.id) ? <Badge theme="neutral" background="subtle">Saved</Badge> : undefined}
                    onClick={() => open(item.id)} />
                ))}
              </List>
            </ListBox>
          </Stack>
        ))}
      </AppShell>
    );
  }

  const code = codes[reward.id];
  const short = reward.points - balance;
  const isSaved = saved.includes(reward.id);
  const redeem = () => {
    setBalance((points) => points - reward.points);
    setCodes((all) => ({ ...all, [reward.id]: `PHIN-${4821 + Object.keys(all).length}` }));
    toast({ type: "positive", title: "Reward redeemed" });
  };
  const toggleSave = () => {
    setSaved((ids) => (isSaved ? ids.filter((id) => id !== reward.id) : [...ids, reward.id]));
    toast({ title: isSaved ? "Removed from saved" : "Reward saved" });
  };
  return (
    // A pushed screen: the compact bar with Back and the reward's name (the screen's h1), the reward's actions pinned in
    // the Action bar (Figma Bottom=Actions), no tab bar.
    <AppShell key={reward.id}
      topNavigation={<TopNavigation scrollRef={scrollRef} type="compact-alt" title={<span ref={titleRef} tabIndex={-1}>{reward.name}</span>}
        leading={{ icon: back, label: "Back", onClick: backToList }} />}
      // Vertical: one main action leads, full width on top; the alternative sits below it. The summary says what the
      // action depends on, and why it waits when it is disabled.
      actionBar={<ActionBar
        summary={<Text as="span" role="status" textStyle="Body/Base/Medium">
          {code ? `Show code ${code} at the counter` : short > 0 ? `You need ${plural(short, "more point")}` : `You have ${pointsLabel(balance)}`}
        </Text>}
        primaryAction={code ? { label: "Done", onClick: backToList } : { label: `Redeem for ${pointsLabel(reward.points)}`, disabled: short > 0, onClick: redeem }}
        secondaryAction={code ? undefined : { label: isSaved ? "Remove from saved" : "Save for later", onClick: toggleSave }} />}
    >
      {/* The price is a value of the reward, so it is a row of its facts; once redeemed, the code leads them. */}
      <Stack gap="md" align="center" justify="center" paddingY="md">
        <DockIcon icon={reward.icon} theme={reward.theme} background="subtle" size="2xl" />
        <Text tone="base" align="center">{reward.about}</Text>
      </Stack>
      <Card theme="default">
        <DescriptionList divider layout="inline" items={[
          ...(code ? [{ id: "code", term: "Your code", description: code }] : []),
          { id: "cost", term: "Cost", description: pointsLabel(reward.points) },
          { id: "where", term: "Use it at", description: reward.where },
          { id: "expires", term: "Expires", description: formatDate(daysFromToday(90)) },
          { id: "limit", term: "Limit", description: "One per visit" },
        ]} />
      </Card>
    </AppShell>
  );
}

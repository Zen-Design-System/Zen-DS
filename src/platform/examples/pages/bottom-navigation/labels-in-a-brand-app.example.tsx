import { useId, useRef, useState, type ReactNode, type RefObject } from "react";
import {
  AppShell, BottomNavigation, BottomNavigationItem, Box, DescriptionList, DockIcon, Heading, List, ListBox, ListItem, Metric, Stack, Text, TopNavigation,
  type DockIconTheme,
} from "@zen-ds/react";
import { daysFromToday, formatDate, formatMoney, formatRelative } from "../../data";

/** One group of a grouped list: a ListBox under the kicker that names it. Rows have no padding of their own, so the
    ListBox's Card-padding-medium (20px on a phone) insets them; the kicker lines up with the row text (lg). No border
    or shadow: white on the Canvas already separates it. */
function ListGroup({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <Stack as="section" gap="xs" aria-labelledby={id}>
      <Box paddingX="lg"><Heading level={2} id={id} textStyle="Body/Small/Bold" tone="light">{title}</Heading></Box>
      <ListBox>
        <List aria-labelledby={id}>{children}</List>
      </ListBox>
    </Stack>
  );
}

// Phin & Co's loyalty app (built by the studio): five destinations, the most a bar holds, each with a one-word label.
type Drink = { id: string; name: string; note: string; price: number };
const menu: { id: string; title: string; theme: DockIconTheme; drinks: Drink[] }[] = [
  { id: "coffee", title: "Coffee", theme: "brown", drinks: [
    { id: "d1", name: "Phin sữa đá", note: "Iced phin coffee with condensed milk", price: 3.2 },
    { id: "d2", name: "Phin đen đá", note: "Black phin coffee over ice", price: 2.8 },
    { id: "d3", name: "Bạc xỉu", note: "Milk first, a shot of phin on top", price: 3.4 },
    { id: "d4", name: "Egg coffee", note: "Whipped egg yolk over phin", price: 4.2 },
    { id: "d5", name: "Salted cream coffee", note: "Phin under a salted cream cap", price: 3.9 },
    { id: "d6", name: "Coconut coffee", note: "Phin over coconut cream", price: 4.1 },
    { id: "d7", name: "Cold brew", note: "Steeped for 18 hours", price: 3.8 },
    { id: "d8", name: "Orange cold brew", note: "Cold brew over fresh orange", price: 4.3 },
    { id: "d9", name: "Yoghurt coffee", note: "Phin over chilled yoghurt", price: 3.7 },
  ] },
  { id: "tea", title: "Tea and more", theme: "green", drinks: [
    { id: "d10", name: "Lotus tea", note: "Hanoi green tea with lotus", price: 3.4 },
    { id: "d11", name: "Peach lemongrass tea", note: "Black tea with fresh peach", price: 3.6 },
    { id: "d12", name: "Matcha latte", note: "Matcha with fresh milk", price: 4 },
    { id: "d13", name: "Đà Lạt cocoa", note: "Hot or iced, with fresh milk", price: 3.5 },
  ] },
];
const rewards = [
  { id: "r1", name: "Free pastry", points: 600 },
  { id: "r2", name: "Free drink, any size", points: 1500 },
  { id: "r3", name: "Phin filter set", points: 3200 },
];
const stores = [
  { id: "s1", name: "Phin & Co Lê Lợi", address: "84 Lê Lợi, District 1", distance: "0.4 km" },
  { id: "s2", name: "Phin & Co Thảo Điền", address: "12 Quốc Hương, Thủ Đức", distance: "6.1 km" },
  { id: "s3", name: "Phin & Co Nguyễn Huệ", address: "9 Nguyễn Huệ, District 1", distance: "0.9 km" },
];
// Ten points for every $1, newest visit first.
const visits = [
  { id: "v1", store: "Phin & Co Lê Lợi", at: daysFromToday(0, 8, 15), points: 32 },
  { id: "v2", store: "Phin & Co Lê Lợi", at: daysFromToday(-2, 8, 40), points: 38 },
  { id: "v3", store: "Phin & Co Thảo Điền", at: daysFromToday(-6, 15, 5), points: 64 },
  { id: "v4", store: "Phin & Co Nguyễn Huệ", at: daysFromToday(-7, 9, 20), points: 34 },
  { id: "v5", store: "Phin & Co Lê Lợi", at: daysFromToday(-8, 8, 30), points: 32 },
  { id: "v6", store: "Phin & Co Lê Lợi", at: daysFromToday(-9, 8, 45), points: 41 },
  { id: "v7", store: "Phin & Co Thảo Điền", at: daysFromToday(-13, 16, 10), points: 76 },
  { id: "v8", store: "Phin & Co Nguyễn Huệ", at: daysFromToday(-15, 12, 40), points: 58 },
  { id: "v9", store: "Phin & Co Lê Lợi", at: daysFromToday(-16, 8, 20), points: 32 },
  { id: "v10", store: "Phin & Co Lê Lợi", at: daysFromToday(-20, 8, 35), points: 38 },
  { id: "v11", store: "Phin & Co Nguyễn Huệ", at: daysFromToday(-22, 17, 15), points: 43 },
  { id: "v12", store: "Phin & Co Lê Lợi", at: daysFromToday(-23, 8, 25), points: 32 },
];
const points = 1240;
const phinTabs: BottomNavigationItem[] = [
  { id: "home", label: "Home", icon: "icon-home-smile-line", selectedIcon: "icon-home-smile-solid" },
  { id: "menu", label: "Menu", icon: "icon-coffee-cup-line", selectedIcon: "icon-coffee-cup-solid" },
  { id: "rewards", label: "Rewards", icon: "icon-gift-01-line", selectedIcon: "icon-gift-01-solid" },
  { id: "stores", label: "Stores", icon: "icon-marker-pin-01-line", selectedIcon: "icon-marker-pin-01-solid" },
  { id: "account", label: "Account", icon: "icon-user-circle-line", selectedIcon: "icon-user-circle-solid" },
];

/** Phin & Co's loyalty app: the Accent tab bar with visible one-word labels. */
// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function LabelsInABrandApp({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const shellRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState("home");
  const sectionId = useId();
  // Tapping the current destination again scrolls it back to the top; another destination opens at its top. What
  // scrolls is the scroller passed as scrollRef, or the page itself in your app.
  const open = (id: string) => {
    const behavior = id === tab ? "smooth" : "auto";
    if (scrollRef === "window") shellRef.current?.scrollIntoView({ behavior });
    else scrollRef.current?.scrollTo({ top: 0, behavior });
    setTab(id);
  };
  const current = phinTabs.find((item) => item.id === tab)!;
  return (
    // The Menu splits its drinks under kickers: a grouped list (white ListBoxes on the Canvas) with the Alt bar.
    <AppShell ref={shellRef}
      topNavigation={<TopNavigation scrollRef={scrollRef} type="alt" title={current.label} largeTitle={current.label} />}
      bottomNavigation={(
        // The destinations as BottomNavigationItem children (Figma's Nav-Items slot); an items array works the same.
        <BottomNavigation theme="accent" showLabels aria-label="Phin & Co" value={tab} onValueChange={open}>
          {phinTabs.map((item) => <BottomNavigationItem key={item.id} {...item} />)}
        </BottomNavigation>
      )}>
      {tab === "home" ? (
        <Stack gap="lg">
          <Metric size="xl" label="Your points" value={points.toLocaleString("en-US")} icon="icon-gift-01-line" iconTheme="pink" iconBackground="solid" />
          <Stack as="section" gap="xs" aria-labelledby={`${sectionId}-visits`}>
            <Heading level={2} id={`${sectionId}-visits`} textStyle="Body/Small/Bold" tone="light">Recent visits</Heading>
            <List aria-labelledby={`${sectionId}-visits`}>
              {visits.map((visit) => (
                <ListItem key={visit.id} title={visit.store} caption={formatRelative(visit.at)}
                  leading={<DockIcon icon="icon-coffee-cup-line" theme="brown" background="subtle" size="md" />}
                  trailing={<Text as="span" textStyle="Body/Base/Medium" wrap={false} tabularNumbers>{`+${visit.points} pts`}</Text>} />
              ))}
            </List>
          </Stack>
        </Stack>
      ) : null}
      {tab === "menu" ? (
        <Stack gap="lg">
          {menu.map((group) => (
            <ListGroup key={group.id} id={`${sectionId}-${group.id}`} title={group.title}>
              {group.drinks.map((drink) => (
                <ListItem key={drink.id} title={drink.name} caption={drink.note} leading={<DockIcon icon="icon-coffee-cup-line" theme={group.theme} background="subtle" size="md" />}
                  trailing={<Text as="span" textStyle="Body/Base/Medium" wrap={false} tabularNumbers>{formatMoney(drink.price, true)}</Text>} />
              ))}
            </ListGroup>
          ))}
        </Stack>
      ) : null}
      {tab === "rewards" ? (
        <List aria-label="Rewards">
          {rewards.map((reward) => (
            <ListItem key={reward.id} title={reward.name} caption={reward.points <= points ? "Ready to redeem" : `${(reward.points - points).toLocaleString("en-US")} points to go`}
              leading={<DockIcon icon="icon-gift-01-line" theme="pink" background="subtle" size="md" />}
              trailing={<Text as="span" textStyle="Body/Base/Medium" wrap={false} tabularNumbers>{`${reward.points.toLocaleString("en-US")} pts`}</Text>} />
          ))}
        </List>
      ) : null}
      {tab === "stores" ? (
        <List aria-label="Stores">
          {stores.map((store) => (
            <ListItem key={store.id} title={store.name} caption={store.address} leading={<DockIcon icon="icon-marker-pin-01-line" theme="teal" background="subtle" size="md" />}
              trailing={<Text as="span" textStyle="Body/Small/Regular" tone="base" wrap={false} tabularNumbers>{store.distance}</Text>} />
          ))}
        </List>
      ) : null}
      {tab === "account" ? (
        <DescriptionList items={[
          { term: "Name", description: "Alex Duong" },
          { term: "Member since", description: formatDate(new Date(2024, 2, 8)) },
          { term: "Tier", description: "Gold" },
          { term: "Points", description: points.toLocaleString("en-US") },
        ]} />
      ) : null}
    </AppShell>
  );
}

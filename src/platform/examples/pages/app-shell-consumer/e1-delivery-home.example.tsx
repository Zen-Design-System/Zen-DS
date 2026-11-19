import { useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import {
  AppShell, BottomNavigation, Box, Card, Chip, DockIcon, Grid, Heading, IconButton, Image, List, ListItem, Search, Stack, Text,
  TopNavigation, useToast, type BottomNavigationItem, type IconName,
} from "@zen-ds/react";
import { photos } from "../../data";

/* Figma ◇ Master-Layout · Example › E · Consumer apps › E1 · Delivery home (15991:9673): one Pattern/AppShell/Mobile,
   Top=Band on Support/Brand · Bottom=Tab-Bar. The copy, numbers, variants and pictures are the Figma screen's. */

/** The shortcut tile's button: the mark over its label, Gap/2XSmall apart, no fill at rest (nothing paints on hover). */
const tileButton: CSSProperties = {
  display: "inline-flex", flexDirection: "column", alignItems: "center", gap: "var(--zen-spacing-gap-2-xsmall, 4px)",
  padding: 0, border: 0, borderRadius: "var(--zen-corner-radius-large, 16px)", background: "none", color: "inherit", cursor: "pointer",
};

/** Figma shortcut tile: a Large mark (Dock Icon, 56) over its Body/Small label. The whole tile is the button and its
 *  visible label is the name, so the mark keeps its 56px instead of sitting in a button's icon slot. */
function ShortcutTile({ label, mark, onClick }: { label: string; mark: ReactNode; onClick: () => void }) {
  return (
    <li>
      <button type="button" style={tileButton} onClick={onClick}>
        {mark}
        <Text as="span" textStyle="Body/Small/Regular">{label}</Text>
      </button>
    </li>
  );
}

const deliveryRoots: BottomNavigationItem[] = [
  { id: "home", label: "Home", icon: "icon-home-02-line", selectedIcon: "icon-home-02-solid" },
  { id: "orders", label: "Orders", icon: "icon-package-line", selectedIcon: "icon-package-solid" },
  { id: "deals", label: "Deals", icon: "icon-ticket-01-line", selectedIcon: "icon-ticket-01-solid" },
  { id: "profile", label: "Profile", icon: "icon-user-line", selectedIcon: "icon-user-solid" },
];
const campuses = [
  { id: "riverside", label: "Riverside Campus", caption: "Dorm B · Room 214" },
  { id: "north", label: "North Campus", caption: "Library, main entrance" },
  { id: "home", label: "Home", caption: "12 Ly Tu Trong, District 1" },
];
const categories = [
  { id: "food", label: "Food", emoji: "🍜" },
  { id: "dessert", label: "Dessert", emoji: "🧁" },
  { id: "market", label: "Market", emoji: "🛒" },
  { id: "fruit", label: "Fruit", emoji: "🍎" },
  { id: "pharmacy", label: "Pharmacy", emoji: "💊" },
  { id: "coupons", label: "Coupons", emoji: "🎟️" },
  { id: "drinks", label: "Drinks", emoji: "🧋" },
  { id: "canteen", label: "Canteen", emoji: "🍱" },
  { id: "new", label: "New here", emoji: "🎓" },
  { id: "snacks", label: "Snacks", emoji: "🍿" },
];
const deals = [
  { id: "lunch-box", shelf: "Canteen", name: "Lunch box", price: "$8.60", photo: photos.food.bento },
  { id: "hot-pot", shelf: "Deals", name: "Hot pot for two", price: "$16.90", photo: photos.food.hotpot },
];
const storeFilters: { id: string; label: string; leading?: IconName }[] = [
  { id: "free", label: "Free delivery", leading: "icon-truck-line" },
  { id: "top", label: "Top rated" },
  { id: "fast", label: "20 min" },
];

/** A food delivery home: the address, a big hello and the search on a band, then shelves, deals and the nearest store. */
// scrollRef: what scrolls the screen, so the bar follows the scroll. "window" in your app.
export default function DeliveryHome({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const [root, setRoot] = useState("home");
  const [campus, setCampus] = useState(campuses[0].id);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<string[]>(["free"]);
  const [cart, setCart] = useState(0);
  const campusLabel = campuses.find((item) => item.id === campus)?.label ?? campuses[0].label;
  const toggle = (id: string) => setFilters((list) => (list.includes(id) ? list.filter((item) => item !== id) : [...list, id]));
  return (
    // Band + Tab-Bar: the band runs from the top edge with the delivery address and the bell in its bar, then the big
    // hello beside the mascot and the search. The page below: emoji shelves, two Shadow deal cards, filter chips and
    // the nearest store.
    <AppShell mobileTop="band" band="soft"
      topNavigation={<TopNavigation scrollRef={scrollRef} aria-label="Delivery address"
        leading={<Chip variant="advanced" leading="icon-marker-pin-01-solid" dropdown popoverLabel="Deliver to"
          popoverItems={campuses.map((item) => ({ ...item, selected: item.id === campus }))}
          onPopoverSelect={(item) => { setCampus(item.id); toast({ title: `Delivering to ${String(item.label)}`, children: item.caption }); }}>{campusLabel}</Chip>}
        trailing={[{ icon: "icon-bell-01-line", label: "Notifications", onClick: () => toast({ title: "Your bubble tea is on its way", children: "Magoz Coffee · arriving in 12 min" }) }]} />}
      hero={(
        <Stack gap="md">
          <Stack direction="row" justify="between" align="center" gap="md">
            <Heading level={1} textStyle="Display/2">Hi,<br />fellow!</Heading>
            {/* Figma Character: the 100 × 100 cut-out mascot (Fit), beside the greeting it illustrates; a bare image fill in
                Figma, so frame={false}: no Neutral/Pale square around it. */}
            <Box width={100}>
              <Image src={photos.food.mascot.src} alt="" ratio="1:1" fit="contain" frame={false} radius="none" loading="eager" />
            </Box>
          </Stack>
          <Search placeholder="Burgers, bubble tea, phở…" aria-label="Search food and stores" value={query} onValueChange={setQuery}
            onKeyDown={(event) => { if (event.key === "Enter" && query) toast({ title: `Searching “${query}”`, children: `Near ${campusLabel}` }); }} />
        </Stack>
      )}
      bottomNavigation={<BottomNavigation aria-label="Delivery app" value={root} onValueChange={setRoot} showLabels items={deliveryRoots} />}
    >
      <Stack gap="xl">
        <Grid as="ul" columns={5} gap="none" rowGap="md" aria-label="Categories">
          {categories.map((item) => (
            <ShortcutTile key={item.id} label={item.label} mark={<DockIcon theme="emoji" emoji={item.emoji} size="lg" />}
              onClick={() => toast({ title: item.label, children: `Stores that deliver to ${campusLabel}` })} />
          ))}
        </Grid>
        <Stack direction="row" gap="sm" fillChildren>
          {deals.map((deal) => (
            <Card key={deal.id} theme="shadow" aria-label={`${deal.shelf}: ${deal.name}, ${deal.price}`}
              onClick={() => toast({ title: `${deal.name} · ${deal.price}`, children: `From ${deal.shelf}`, action: { label: "Add", onClick: () => setCart((count) => count + 1) } })}>
              <Stack gap="xs">
                <Text textStyle="Body/Base/Bold">{deal.shelf}</Text>
                <Image src={deal.photo.src} alt="" ratio={129 / 88} radius="lg" />
                <Stack gap="2xs">
                  <Text textStyle="Body/Small/Regular">{deal.name}</Text>
                  <Text textStyle="Body/Base/Bold" tone="accent-base" tabularNumbers>{deal.price}</Text>
                </Stack>
              </Stack>
            </Card>
          ))}
        </Stack>
        <Stack as="section" gap="md" aria-label="Stores near you">
          <Stack direction="row" gap="xs" scroll="x" paddingY="3xs">
            {storeFilters.map((filter) => (
              <Chip key={filter.id} variant="normal" level="primary" leading={filter.leading} selected={filters.includes(filter.id)} onClick={() => toggle(filter.id)}>{filter.label}</Chip>
            ))}
          </Stack>
          <List aria-label="Stores near you">
            <ListItem title="Magoz Coffee" caption="★ 4.6 · 6,328 orders · 32 min"
              leading={<DockIcon theme="emoji" emoji="☕" size="lg" />}
              onClick={() => toast({ title: "Magoz Coffee", children: "Open until 22:00 · free delivery" })}
              trailing={<IconButton appearance="flat" level="primary" icon="icon-plus-line" aria-label="Quick add from Magoz Coffee"
                onClick={() => { setCart((count) => count + 1); toast({ title: "Iced latte added", children: `${cart + 1} in your basket` }); }} />} />
          </List>
        </Stack>
      </Stack>
    </AppShell>
  );
}

import { useState, type RefObject } from "react";
import {
  AppShell, BottomNavigation, Box, DescriptionList, DockIcon, EmptyState, IconButton, List, ListItem, Stack, ToastStack, TopNavigation,
  type BottomNavigationItem, type DockIconTheme, type IconName, type ToastItem,
} from "@zen-ds/react";
import { daysFromToday, formatDay } from "../../data";

type Offer = { id: string; title: string; caption: string; icon: IconName; theme: DockIconTheme };
/** This month's offers in the Phin & Co app, the ones ending soonest first. */
const offers: Offer[] = [
  { id: "o1", title: "Bánh mì combo for $3", caption: "80 points · before 10:00 am", icon: "icon-bread-line", theme: "orange" },
  { id: "o2", title: "Double points on cold brew", caption: "Every Friday in October", icon: "icon-coffee-bean-line", theme: "green" },
  { id: "o3", title: "Free cà phê sữa đá", caption: "120 points · until Oct 15", icon: "icon-coffee-cup-line", theme: "brown" },
  { id: "o4", title: "Bạc xỉu upsized for free", caption: "60 points · until Oct 18", icon: "icon-milk-line", theme: "golden" },
  { id: "o5", title: "Birthday drink on us", caption: `Your birthday week · from ${formatDay(daysFromToday(20))}`, icon: "icon-gift-01-line", theme: "pink" },
  { id: "o6", title: "Peach tea for $2", caption: "Trà đào cam sả · after 6:00 pm", icon: "icon-fruit-juice-line", theme: "crimson" },
  { id: "o7", title: "Free oat milk swap", caption: "30 points · all of October", icon: "icon-salad-leaf-line", theme: "teal" },
  { id: "o8", title: "50 bonus points", caption: "Order ahead 3 times by Oct 31", icon: "icon-zap-line", theme: "yellow" },
  { id: "o9", title: "Two for one with a friend", caption: "Weekdays 2:00–5:00 pm · until Nov 15", icon: "icon-user-plus-line", theme: "blue" },
  { id: "o10", title: "Affogato for $2.50", caption: "100 points · Nguyen Hue store only", icon: "icon-ice-cream-line", theme: "purple" },
  { id: "o11", title: "20% off whole beans", caption: "200 points · 250 g bags · until Dec 31", icon: "icon-sale-line", theme: "red" },
  { id: "o12", title: "Phin filter set for $9", caption: "300 points · while stocks last", icon: "icon-shopping-bag-01-line", theme: "plum" },
  { id: "o13", title: "$0.50 off with your own cup", caption: "Every visit · no points needed", icon: "icon-star-01-line", theme: "indigo" },
];
type Tab = "offers" | "saved" | "account";
const tabs: BottomNavigationItem[] = [
  { id: "offers", label: "Offers", icon: "icon-ticket-01-line", selectedIcon: "icon-ticket-01-solid" },
  { id: "saved", label: "Saved", icon: "icon-bookmark-line", selectedIcon: "icon-bookmark-solid" },
  { id: "account", label: "Account", icon: "icon-user-circle-line", selectedIcon: "icon-user-circle-solid" },
];
const tabTitle: Record<Tab, string> = { offers: "Offers", saved: "Saved", account: "Account" };

/** The Phin & Co loyalty app: saving an offer confirms with a toast above the tab bar. */
// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function PhoneToasts({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const [tab, setTab] = useState<Tab>("offers");
  const [saved, setSaved] = useState<string[]>([]);
  // A phone app hosts its own ToastStack: inline above the tab bar, one toast at a time.
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const show = (item: ToastItem) => setToasts([item]);
  const dismiss = (id: ToastItem["id"]) => setToasts((list) => list.filter((item) => item.id !== id));
  // A toast belongs to the tab it was shown on.
  const openTab = (next: Tab) => {
    setTab(next);
    setToasts([]);
  };
  const toggle = (offer: Offer) => {
    if (saved.includes(offer.id)) {
      setSaved((list) => list.filter((id) => id !== offer.id));
      show({ id: `removed-${offer.id}`, title: "Offer removed", action: { label: "Undo", onClick: () => setSaved((list) => [...list, offer.id]) } });
      return;
    }
    setSaved((list) => [...list, offer.id]);
    show({ id: `saved-${offer.id}`, title: "Offer saved", action: { label: "View", onClick: () => openTab("saved") } });
  };
  const list = tab === "saved" ? offers.filter((offer) => saved.includes(offer.id)) : offers;
  const title = tabTitle[tab];
  return (
    <AppShell
      topNavigation={<TopNavigation scrollRef={scrollRef} type="alt" title={title} largeTitle={title} />}
      bottomNavigation={(
        // The toast rides on the tab bar: xs above it, inside the screen margin. No toast, no gap: the tab bar's slot
        // then takes no strip of the screen above it.
        <Stack gap={toasts.length ? "xs" : "none"}>
          <Box paddingX="lg"><ToastStack inline toasts={toasts} onDismiss={dismiss} max={1} /></Box>
          <BottomNavigation aria-label="Phin & Co" items={tabs} value={tab} onValueChange={(id) => openTab(id as Tab)} showLabels />
        </Stack>
      )}
    >
      {tab === "account" ? (
        <DescriptionList items={[
          { term: "Member", description: "Lan Nguyen" },
          { term: "Tier", description: "Gold" },
          { term: "Points", description: "1,240", emphasis: true },
          { term: "Member since", description: "Mar 12, 2025" },
        ]} />
      ) : list.length ? (
        // Static rows (the only action is the Save toggle) sit in the screen margin, like the Account tab.
        <List aria-label={title}>
          {list.map((offer) => {
            const isSaved = saved.includes(offer.id);
            return (
              <ListItem key={offer.id} title={offer.title} caption={offer.caption}
                leading={<DockIcon icon={offer.icon} theme={offer.theme} background="subtle" size="md" />}
                trailing={<IconButton appearance="flat" level="primary" icon={isSaved ? "icon-bookmark-solid" : "icon-bookmark-line"}
                  aria-label={`Save ${offer.title}`} aria-pressed={isSaved} tooltip="Save" onClick={() => toggle(offer)} />} />
            );
          })}
        </List>
      ) : (
        <EmptyState headingLevel={2} icon="icon-bookmark-line" title="No saved offers yet" primaryAction={{ label: "Browse offers", onClick: () => openTab("offers") }}>
          Save an offer to find it here at the counter.
        </EmptyState>
      )}
    </AppShell>
  );
}

import { useId, useRef, useState, type RefObject } from "react";
import {
  AppShell, BottomNavigation, BottomSheet, Box, DescriptionList, Heading, List, ListBox, ListItem, Stack, Text, TopNavigation, plural, useToast,
  type BottomNavigationItem,
} from "@zen-ds/react";
import { daysFromToday, formatMoney, formatRelative } from "../../data";

// The Phin & Co app (the studio's client): what Alex ordered over the last three weeks.
const menu = {
  phinSua: { name: "Phin sữa đá", price: 2.6 },
  phinDen: { name: "Phin đen đá", price: 2.2 },
  bacXiu: { name: "Bạc xỉu", price: 2.8 },
  coconut: { name: "Cà phê dừa", price: 3.6 },
  coldBrew: { name: "Cold brew cam sả", price: 3.4 },
  traSen: { name: "Trà sen vàng", price: 3.0 },
  banhMi: { name: "Bánh mì chả cá", price: 2.4 },
  croissant: { name: "Croissant muối", price: 2.2 },
};
type MenuId = keyof typeof menu;
type Order = { id: string; at: Date; store: string; lines: [MenuId, number][]; paidWith: string; reward?: MenuId };
const order = (id: string, days: number, hour: number, minute: number, store: string, lines: Order["lines"], extra: Partial<Order> = {}): Order =>
  ({ id, at: daysFromToday(days, hour, minute), store, lines, paidWith: "Visa ending 4821", ...extra });
const orders: Order[] = [
  order("A-250", 0, 8, 12, "Phin Nguyen Hue", [["phinSua", 2], ["banhMi", 1]]),
  order("A-249", -1, 15, 40, "Phin Ly Tu Trong", [["coldBrew", 1], ["croissant", 1]], { reward: "coldBrew" }),
  order("A-248", -1, 8, 5, "Phin Nguyen Hue", [["phinSua", 1]]),
  order("A-247", -2, 8, 20, "Phin Nguyen Hue", [["bacXiu", 1], ["banhMi", 1]], { paidWith: "Phin wallet" }),
  order("A-246", -5, 14, 10, "Phin Thao Dien", [["coconut", 2], ["traSen", 1]]),
  order("A-245", -6, 8, 15, "Phin Nguyen Hue", [["phinDen", 1]]),
  order("A-244", -7, 9, 30, "Phin Ly Tu Trong", [["phinSua", 3], ["croissant", 2]], { paidWith: "Phin wallet" }),
  order("A-243", -8, 8, 10, "Phin Nguyen Hue", [["phinSua", 1], ["banhMi", 1]]),
  order("A-242", -9, 16, 45, "Phin Thao Dien", [["traSen", 2]]),
  order("A-241", -12, 8, 25, "Phin Nguyen Hue", [["bacXiu", 1]]),
  order("A-240", -13, 13, 5, "Phin Ly Tu Trong", [["coldBrew", 2], ["banhMi", 2]]),
  order("A-239", -14, 8, 0, "Phin Nguyen Hue", [["phinDen", 1], ["croissant", 1]], { paidWith: "Phin wallet" }),
  order("A-238", -16, 10, 40, "Phin Thao Dien", [["coconut", 1]]),
  order("A-237", -19, 8, 15, "Phin Nguyen Hue", [["phinSua", 2]]),
];
const lineTotal = ([item, quantity]: [MenuId, number]) => menu[item].price * quantity;
const totalOf = (o: Order) => o.lines.reduce((sum, line) => sum + lineTotal(line), 0) - (o.reward ? menu[o.reward].price : 0);
const itemsOf = (o: Order) => o.lines.map(([item, quantity]) => (quantity > 1 ? `${menu[item].name} × ${quantity}` : menu[item].name)).join(", ");

/** The Phin & Co app's roots on a phone; Orders is this screen. */
const phinRoots: BottomNavigationItem[] = [
  { id: "home", label: "Home", icon: "icon-home-03-line", selectedIcon: "icon-home-03-solid" },
  { id: "menu", label: "Menu", icon: "icon-coffee-cup-line", selectedIcon: "icon-coffee-cup-solid" },
  { id: "orders", label: "Orders", icon: "icon-receipt-line", selectedIcon: "icon-receipt-solid" },
  { id: "rewards", label: "Rewards", icon: "icon-gift-01-line", selectedIcon: "icon-gift-01-solid" },
];
/** Orders from the last 7 days, then the rest: one group each. */
const weekStart = daysFromToday(-6, 0, 0).getTime();
const orderGroups = [
  { id: "week", label: "This week", orders: orders.filter((o) => o.at.getTime() >= weekStart) },
  { id: "earlier", label: "Earlier", orders: orders.filter((o) => o.at.getTime() < weekStart) },
];

/** Phin & Co's Orders: every past order opens its receipt in a Bottom Sheet. */
// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function PhoneReceipts({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const baseId = useId();
  const [root, setRoot] = useState("orders");
  const [openId, setOpenId] = useState<string | null>(null);
  // The sheet keeps its last order while it slides away.
  const [last, setLast] = useState(orders[0]);
  // The row button the receipt was opened from (the click's currentTarget): closing hands focus back to it.
  const openerRef = useRef<HTMLElement | null>(null);
  const opened = orders.find((item) => item.id === openId);
  const open = (o: Order, opener: HTMLElement) => { openerRef.current = opener; setLast(o); setOpenId(o.id); };
  const close = () => {
    setOpenId(null);
    setTimeout(() => openerRef.current?.focus());
  };
  const total = totalOf(last);
  const spentThisWeek = orderGroups[0].orders.reduce((sum, o) => sum + totalOf(o), 0);
  return (
    <>
      {/* A tab root on the AppShell's mobile Bar: the large title folds as the orders scroll under it, and the bottom bar
          holds the app's roots. It casts a shadow, so each group of orders is a Shadow ListBox on the grey Canvas. */}
      <AppShell
        topNavigation={<TopNavigation scrollRef={scrollRef} title="Orders" largeTitle="Orders"
          trailing={[{ icon: "icon-search-medium-line", label: "Search orders", onClick: () => toast({ title: "Search orders", children: "By drink, store or date." }) }]} />}
        bottomNavigation={<BottomNavigation aria-label="Phin & Co" showLabels items={phinRoots} value={root} onValueChange={setRoot} />}
      >
        <Text as="p" textStyle="Body/Small/Regular" tone="base">{`${plural(orderGroups[0].orders.length, "order")} this week · ${formatMoney(spentThisWeek, true)}`}</Text>
        {orderGroups.map((group) => (
          // The kicker lines up with the row text: the ListBox pads its rows 20 (Card-padding-medium on a phone).
          <Stack key={group.id} as="section" gap="xs" aria-labelledby={`${baseId}-${group.id}`}>
            <Box paddingX="lg"><Heading level={2} id={`${baseId}-${group.id}`} textStyle="Body/Small/Bold" tone="light">{group.label}</Heading></Box>
            <ListBox theme="shadow">
              <List aria-labelledby={`${baseId}-${group.id}`}>
                {group.orders.map((o) => (
                  // Each value keeps its words together, so the caption wraps between the time and the store.
                  <ListItem key={o.id}
                    title={itemsOf(o)} titleLines={2} caption={[formatRelative(o.at), o.store].map((value) => value.replace(/ /g, " ")).join(" · ")}
                    trailing={<Text as="span" textStyle="Body/Base/Medium">{formatMoney(totalOf(o), true)}</Text>}
                    onClick={(event) => open(o, event.currentTarget)} />
                ))}
              </List>
            </ListBox>
          </Stack>
        ))}
      </AppShell>
      <BottomSheet inline open={Boolean(opened)} onOpenChange={(next) => { if (!next) close(); }} title={`Order ${last.id}`} actionsDirection="vertical"
        primaryAction={{ label: "Order again", onClick: () => { close(); toast({ title: "Order added to your cart", children: itemsOf(last) }); } }}
        secondaryAction={{ label: "Close" }}>
        {/* Two groups in one sheet: what was bought, closed by its total, then how it was paid. */}
        <Stack gap="lg">
          <DescriptionList items={[
            ...last.lines.map(([item, quantity]) => ({ id: item, term: `${menu[item].name} × ${quantity}`, description: formatMoney(menu[item].price * quantity, true) })),
            ...(last.reward ? [{ id: "reward", term: "Free drink · 1,500 points", description: <Text as="span" textStyle="Body/Base/Medium" tone="positive">{`−${formatMoney(menu[last.reward].price, true)}`}</Text> }] : []),
            { id: "total", term: "Total", description: formatMoney(total, true), emphasis: true },
          ]} />
          <DescriptionList divider items={[
            { id: "ordered", term: "Ordered", description: formatRelative(last.at) },
            { id: "store", term: "Store", description: last.store },
            { id: "paid", term: "Paid with", description: last.paidWith },
            { id: "points", term: "Points earned", description: plural(Math.floor(total) * 10, "point") },
          ]} />
        </Stack>
      </BottomSheet>
    </>
  );
}

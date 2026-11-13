import { useId, useRef, useState, type RefObject } from "react";
import {
  ActionBar, AppShell, BottomNavigation, Box, Card, DescriptionList, Divider, DockIcon, Heading, InputField, List, ListBox, ListItem, ModalForm, Stack, Text,
  TopNavigation, useFormState, useToast, type BottomNavigationItem,
} from "@zen-ds/react";
import { daysFromToday, formatMoney, formatRelative } from "../../data";

/** Alex's Phin & Co orders in the loyalty app the studio builds, newest first (orders are numbered A-248, A-249…). */
const menu = {
  phin: { name: "Phin sữa đá", price: 2.6 }, bacxiu: { name: "Bạc xỉu", price: 2.8 }, banhmi: { name: "Bánh mì chả cá", price: 2.4 },
  coconut: { name: "Cà phê dừa", price: 3.1 }, coldbrew: { name: "Cold brew", price: 3.2 }, salt: { name: "Cà phê muối", price: 3 },
  peach: { name: "Trà đào cam sả", price: 3.2 }, cake: { name: "Bánh bông lan trứng muối", price: 2.5 },
};
type MenuId = keyof typeof menu;
type PhinOrder = { id: string; store: string; at: Date; items: MenuId[] };
const phinOrders: PhinOrder[] = [
  { id: "A-247", store: "Phin & Co Nguyen Hue", at: daysFromToday(0, 10, 12), items: ["phin", "bacxiu", "banhmi"] },
  { id: "A-231", store: "Phin & Co Nguyen Hue", at: daysFromToday(-1, 8, 5), items: ["phin"] },
  { id: "A-219", store: "Phin & Co Thao Dien", at: daysFromToday(-3, 15, 40), items: ["coldbrew", "cake"] },
  { id: "A-204", store: "Phin & Co Nguyen Hue", at: daysFromToday(-5, 7, 52), items: ["salt"] },
  { id: "A-196", store: "Phin & Co Ben Thanh", at: daysFromToday(-6, 12, 20), items: ["peach", "banhmi"] },
  { id: "A-183", store: "Phin & Co Nguyen Hue", at: daysFromToday(-8, 8, 10), items: ["phin", "banhmi"] },
  { id: "A-170", store: "Phin & Co Thao Dien", at: daysFromToday(-10, 16, 15), items: ["coconut"] },
  { id: "A-158", store: "Phin & Co Nguyen Hue", at: daysFromToday(-12, 8, 2), items: ["bacxiu"] },
  { id: "A-141", store: "Phin & Co Ben Thanh", at: daysFromToday(-14, 13, 5), items: ["coldbrew", "phin", "cake"] },
  { id: "A-127", store: "Phin & Co Nguyen Hue", at: daysFromToday(-15, 7, 48), items: ["phin"] },
  { id: "A-112", store: "Phin & Co Thao Dien", at: daysFromToday(-17, 15, 30), items: ["salt", "banhmi"] },
  { id: "A-098", store: "Phin & Co Nguyen Hue", at: daysFromToday(-19, 8, 15), items: ["bacxiu", "banhmi"] },
  { id: "A-085", store: "Phin & Co Ben Thanh", at: daysFromToday(-22, 11, 40), items: ["peach"] },
  { id: "A-071", store: "Phin & Co Nguyen Hue", at: daysFromToday(-24, 8, 20), items: ["phin", "coconut"] },
];
/** Members get 10% off and earn 10 points per $1 paid. */
const totalsOf = (order: PhinOrder) => {
  const subtotal = order.items.reduce((sum, id) => sum + menu[id].price, 0);
  const discount = Math.round(subtotal * 10) / 100;
  return { subtotal, discount, paid: subtotal - discount, points: Math.round((subtotal - discount) * 10) };
};
/** The points balance after an order: today's 1,240 points minus what the later orders earned. */
const balanceAfter = (order: PhinOrder) => 1240 - phinOrders.slice(0, phinOrders.indexOf(order)).reduce((sum, later) => sum + totalsOf(later).points, 0);

/** The Phin & Co app's roots on a phone; Orders is the root the receipt is pushed from. */
const phinRoots: BottomNavigationItem[] = [
  { id: "home", label: "Home", icon: "icon-home-03-line", selectedIcon: "icon-home-03-solid" },
  { id: "menu", label: "Menu", icon: "icon-coffee-cup-line", selectedIcon: "icon-coffee-cup-solid" },
  { id: "orders", label: "Orders", icon: "icon-receipt-line", selectedIcon: "icon-receipt-solid" },
  { id: "rewards", label: "Rewards", icon: "icon-gift-01-line", selectedIcon: "icon-gift-01-solid" },
];
/** Orders from the last 7 days, then the rest: one group each. */
const weekStart = daysFromToday(-6, 0, 0).getTime();
const orderGroups = [
  { id: "week", label: "This week", orders: phinOrders.filter((o) => o.at.getTime() >= weekStart) },
  { id: "earlier", label: "Earlier", orders: phinOrders.filter((o) => o.at.getTime() < weekStart) },
];
/** A caption of whole values: it wraps between them, never inside a time or an order number (no-break spaces and hyphens). */
const wholeValues = (...values: string[]) => values.map((value) => value.replace(/ /g, " ").replace(/-/g, "‑")).join(" · ");
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Phone receipt, pushed from the order history: Default dividers between its blocks, a dashed tear line before the
    loyalty stub. */
// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function MobileReceipt({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const baseId = useId();
  const [root, setRoot] = useState("orders");
  const [openId, setOpenId] = useState<string | null>(phinOrders[0].id);
  const [emailing, setEmailing] = useState(false);
  const order = phinOrders.find((candidate) => candidate.id === openId);
  // Focus follows the screen: the receipt focuses its title, Back returns to the group the order sits in.
  const titleRef = useRef<HTMLSpanElement>(null);
  const groupRefs = useRef<Record<string, HTMLHeadingElement | null>>({});
  const open = (row: PhinOrder) => {
    setOpenId(row.id);
    setTimeout(() => titleRef.current?.focus());
  };
  const back = (from: PhinOrder) => {
    const group = orderGroups.find((candidate) => candidate.orders.includes(from));
    setOpenId(null);
    setTimeout(() => (group ? groupRefs.current[group.id] : null)?.focus());
  };
  const email = useFormState<{ email: string }>({
    initialValues: { email: "" },
    validate: ({ email: value }) => {
      const text = value.trim();
      return { email: !text ? "Enter an email address" : !emailPattern.test(text) ? "Enter a valid email address, like name@company.com" : undefined };
    },
    onSubmit: ({ email: value }, { reset }) => {
      setEmailing(false);
      reset();
      toast({ type: "positive", title: `Receipt sent to ${value.trim()}` });
    },
  });
  // Cancel, Escape and the scrim close it and clear the field.
  const changeEmailing = (next: boolean) => { setEmailing(next); if (!next) email.reset(); };

  // Each screen is its own AppShell (key): it opens at the top and its bar measures the fold again.
  if (!order) {
    return (
      // The Orders root: the large title folds as the orders scroll under it, and the bottom bar casts a shadow, so each
      // group is a Shadow ListBox on the grey Canvas; the kickers line up with the row text.
      <AppShell key="orders"
        topNavigation={<TopNavigation scrollRef={scrollRef} title="Orders" largeTitle="Orders"
          trailing={[{ icon: "icon-search-medium-line", label: "Search orders", onClick: () => toast({ title: "Search orders", children: "By drink, store or date." }) }]} />}
        bottomNavigation={<BottomNavigation aria-label="Phin & Co" showLabels items={phinRoots} value={root} onValueChange={setRoot} />}
      >
        {orderGroups.map((group) => (
          <Stack key={group.id} as="section" gap="xs" aria-labelledby={`${baseId}-${group.id}`}>
            <Box paddingX="lg">
              <Heading ref={(heading) => { groupRefs.current[group.id] = heading; }} tabIndex={-1} level={2} id={`${baseId}-${group.id}`} textStyle="Body/Small/Bold" tone="light">{group.label}</Heading>
            </Box>
            <ListBox theme="shadow">
              <List aria-labelledby={`${baseId}-${group.id}`}>
                {group.orders.map((row) => (
                  <ListItem key={row.id} leading={<DockIcon icon="icon-coffee-cup-line" theme="orange" background="subtle" size="medium" />}
                    title={row.store} caption={wholeValues(formatRelative(row.at), `Order ${row.id}`)}
                    trailing={<Text as="span" textStyle="Body/Base/Medium">{formatMoney(totalsOf(row).paid, true)}</Text>}
                    onClick={() => open(row)} />
                ))}
              </List>
            </ListBox>
          </Stack>
        ))}
      </AppShell>
    );
  }

  const { subtotal, discount, paid, points } = totalsOf(order);
  return (
    <>
      {/* A pushed screen: the compact bar with Back, the receipt as one flat slip on the grey Canvas, and its actions in the
          Action bar (Figma Bottom=Actions), Email receipt on top. */}
      <AppShell key={order.id}
        topNavigation={<TopNavigation scrollRef={scrollRef} type="compact-alt" title={<span ref={titleRef} tabIndex={-1}>Receipt</span>}
          leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => back(order) }} />}
        actionBar={<ActionBar primaryAction={{ label: "Email receipt", onClick: () => setEmailing(true) }}
          secondaryAction={{ label: "Order again", onClick: () => toast({ title: "Order added to your cart", children: order.items.map((id) => menu[id].name).join(", ") }) }} />}
      >
        {/* The slip: the store, the items and the stub are its groups, lg apart, with a divider between each. */}
        <Card theme="default" as="article" aria-label={`Receipt for order ${order.id}`}>
          <Stack gap="lg">
            <Stack direction="column" align="center" gap="md">
              <DockIcon icon="icon-coffee-cup-line" theme="orange" background="subtle" size="2xl" />
              <Stack gap="2xs" align="center">
                <Heading level={2} textStyle="Heading/2" truncate align="center">{order.store}</Heading>
                <Text as="span" textStyle="Body/Small/Regular" tone="light" align="center">{`${formatRelative(order.at)} · Order ${order.id}`}</Text>
              </Stack>
            </Stack>
            <Divider />
            <DescriptionList items={[
              // A no-break space keeps "× 1" with its item when a long name wraps.
              ...order.items.map((id) => ({ id, term: `${menu[id].name} × 1`, description: formatMoney(menu[id].price, true) })),
              { id: "subtotal", term: "Subtotal", description: formatMoney(subtotal, true) },
              { id: "discount", term: "Member discount (10%)", description: `−${formatMoney(discount, true)}` },
              { id: "total", term: "Paid with Phin wallet", description: formatMoney(paid, true), emphasis: true },
            ]} />
            <Divider dashed decorative />
            <Stack gap="xs">
              <Text textStyle="Body/Base/Bold">{`You earned ${points} points`}</Text>
              <Text textStyle="Body/Small/Regular" tone="base">{`Balance after this order: ${balanceAfter(order).toLocaleString("en-US")} points`}</Text>
            </Stack>
          </Stack>
        </Card>
      </AppShell>
      <ModalForm open={emailing} onOpenChange={changeEmailing} title="Email receipt" description={`Order ${order.id} at ${order.store}.`}
        onSubmit={email.handleSubmit} primaryAction={{ label: "Send receipt" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Email address" type="email" autoComplete="off" placeholder="name@company.com" data-autofocus="" {...email.field("email")} />
      </ModalForm>
    </>
  );
}

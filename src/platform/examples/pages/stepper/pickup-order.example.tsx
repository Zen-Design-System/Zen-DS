import { useId, useRef, useState, type RefObject } from "react";
import {
  ActionBar, AppShell, Badge, Box, DockIcon, Heading, List, ListBox, ListItem, Stack, Stepper, Text, TopNavigation, plural, useToast, type StepperStep,
} from "@zen-ds/react";
import { TODAY, daysFromToday, formatMoney, formatRelative, formatTime } from "../../data";

// Alex's orders in Phin & Co's app (the loyalty app the studio builds). A-248 is being made now; the past pick-ups are
// the same ones the Rating page asks Alex to rate.
const phinStores: Record<string, string> = {
  "Phin Nguyễn Huệ": "42 Nguyen Hue, District 1",
  "Phin Lê Lợi": "86 Le Loi, District 1",
  "Phin Thảo Điền": "21 Thao Dien, Thu Duc",
  "Phin Đa Kao": "15 Dinh Tien Hoang, District 1",
  "Phin Bến Thành": "3 Phan Chu Trinh, District 1",
  "Phin Phú Mỹ Hưng": "102 Ton Dat Tien, District 7",
};
const menu = {
  phin: { name: "Phin sữa đá", price: 2.6 },
  bacxiu: { name: "Bạc xỉu", price: 2.8 },
  muoi: { name: "Cà phê muối", price: 3.2 },
  sen: { name: "Trà sen vàng", price: 3 },
  banhmi: { name: "Bánh mì chả cá", price: 2.4 },
  croissant: { name: "Croissant", price: 2.2 },
};
type MenuId = keyof typeof menu;
type OrderStage = 1 | 2 | 4; // 1 Preparing · 2 Ready for pickup · 4 Picked up (every step passed)
type PickupOrder = { id: string; store: string; placed: Date; lines: Array<[MenuId, number]>; stage: OrderStage; pickedAt?: Date };
const minutesAfter = (d: Date, minutes: number) => new Date(d.getTime() + minutes * 60_000);
// An order is ready about 8 minutes after it is placed; past orders were picked up then (the times the Rating page shows).
const order = (id: string, store: string, placed: Date, lines: Array<[MenuId, number]>, stage: OrderStage = 4): PickupOrder =>
  ({ id, store, placed, lines, stage, pickedAt: stage === 4 ? minutesAfter(placed, 8) : undefined });
const pickupOrders: PickupOrder[] = [
  order("A-248", "Phin Nguyễn Huệ", daysFromToday(0, 10, 26), [["phin", 2], ["banhmi", 1]], 1),
  order("A-247", "Phin Nguyễn Huệ", daysFromToday(0, 7, 57), [["phin", 1], ["croissant", 1]]),
  order("A-239", "Phin Lê Lợi", daysFromToday(-1, 8, 4), [["bacxiu", 1]]),
  order("A-236", "Phin Thảo Điền", daysFromToday(-2, 15, 32), [["muoi", 2], ["sen", 1]]),
  order("A-231", "Phin Nguyễn Huệ", daysFromToday(-4, 9, 12), [["phin", 1], ["banhmi", 1]]),
  order("A-228", "Phin Đa Kao", daysFromToday(-5, 7, 54), [["phin", 1]]),
  order("A-224", "Phin Lê Lợi", daysFromToday(-6, 12, 37), [["sen", 2], ["muoi", 1], ["croissant", 1]]),
  order("A-219", "Phin Nguyễn Huệ", daysFromToday(-8, 8, 2), [["bacxiu", 1]]),
  order("A-215", "Phin Bến Thành", daysFromToday(-9, 17, 22), [["muoi", 1], ["banhmi", 1]]),
  order("A-209", "Phin Thảo Điền", daysFromToday(-11, 8, 52), [["phin", 2]]),
  order("A-204", "Phin Nguyễn Huệ", daysFromToday(-12, 8, 7), [["phin", 1]]),
  order("A-198", "Phin Phú Mỹ Hưng", daysFromToday(-15, 13, 57), [["sen", 1], ["bacxiu", 1], ["croissant", 1]]),
  order("A-193", "Phin Lê Lợi", daysFromToday(-16, 8, 12), [["muoi", 1]]),
  order("A-187", "Phin Nguyễn Huệ", daysFromToday(-19, 7, 52), [["phin", 1], ["banhmi", 1]]),
  order("A-182", "Phin Đa Kao", daysFromToday(-20, 10, 32), [["bacxiu", 1]]),
];
const itemCount = (o: PickupOrder) => o.lines.reduce((sum, [, qty]) => sum + qty, 0);
const totalOf = (o: PickupOrder) => o.lines.reduce((sum, [id, qty]) => sum + menu[id].price * qty, 0);
/** "Picked up at 8:09 am" · "Picked up yesterday at 8:16 am" · "Picked up Monday at 3:43 pm" · "Picked up just now". */
const pickedLine = (d: Date) => {
  const when = formatRelative(d);
  return /^\d/.test(when) ? `Picked up at ${when}` : `Picked up ${/^(Just|Yesterday)/.test(when) ? when[0].toLowerCase() + when.slice(1) : when}`;
};
const stageBadge: Record<1 | 2, { label: string; theme: "orange" | "green" }> = { 1: { label: "Preparing", theme: "orange" }, 2: { label: "Ready", theme: "green" } };

/** Phin & Co's Orders: a pickup order opens on its own screen, a vertical stepper with icons tracking it. */
// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function PickupOrders({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const activeId = useId();
  const pastId = useId();
  const linesId = useId();
  const [orders, setOrders] = useState(pickupOrders);
  const [openId, setOpenId] = useState<string | null>("A-248");
  const [fromId, setFromId] = useState("A-248");
  // Focus follows the screen: an order focuses its title, Back returns to the row it came from.
  const titleRef = useRef<HTMLSpanElement>(null);
  const rowRef = useRef<HTMLElement>(null);
  const opened = orders.find((item) => item.id === openId);
  const confirmPickup = (id: string) => setOrders((list) => list.map((item) => (item.id === id ? { ...item, stage: 4, pickedAt: TODAY } : item)));
  // The store marks an order ready after a while (5 seconds in this demo): the one being made moves on once you point
  // at or tab into the app, a new one from the moment it is placed.
  const [watching, setWatching] = useState(false);
  const readyLater = (id: string) => setTimeout(() => setOrders((list) => list.map((item) => (item.id === id && item.stage === 1 ? { ...item, stage: 2 } : item))), 5000);
  const watch = () => {
    if (watching) return;
    setWatching(true);
    orders.filter((item) => item.stage === 1).forEach((item) => readyLater(item.id));
  };
  const open = (id: string) => {
    setOpenId(id);
    setFromId(id);
    setTimeout(() => titleRef.current?.focus());
  };
  const back = () => {
    setOpenId(null);
    setTimeout(() => rowRef.current?.focus());
  };
  const orderAgain = (from: PickupOrder) => {
    const id = `A-${Math.max(...orders.map((item) => Number(item.id.slice(2)))) + 1}`;
    setOrders((list) => [order(id, from.store, TODAY, from.lines, 1), ...list]);
    readyLater(id);
    open(id);
    toast({ title: `Order ${id} placed`, children: from.store });
  };

  // Each screen is its own AppShell (key).
  if (!opened) {
    const active = orders.filter((item) => item.stage !== 4);
    const past = orders.filter((item) => item.stage === 4);
    const row = (item: PickupOrder) => (
      <ListItem key={item.id} ref={item.id === fromId ? rowRef : undefined} tabIndex={item.id === fromId ? -1 : undefined}
        title={item.store} onClick={() => open(item.id)}
        leading={<DockIcon icon="icon-coffee-cup-line" theme="orange" background="subtle" />}
        caption={`${item.id} · ${plural(itemCount(item), "item")} · ${formatRelative(item.placed)}`}
        trailing={item.stage === 4 ? <Text as="span" textStyle="Body/Small/Regular" tone="base">{formatMoney(totalOf(item), true)}</Text>
          : <Badge theme={stageBadge[item.stage].theme} background="subtle">{stageBadge[item.stage].label}</Badge>} />
    );
    return (
      // Grouped list: each group a white ListBox under its kicker, which lines up with the row content (paddingX lg,
      // 20px), with the Alt bar. Rows have no side padding of their own: the ListBox pads 20px on a phone, so their hover
      // (12px outside the row) sits 8px from every edge (2XLarge 24px = the fill's Large 16px + 8px).
      <AppShell key="root" onPointerEnter={watch} onFocus={watch}
        topNavigation={<TopNavigation scrollRef={scrollRef} type="alt" title="Orders" largeTitle="Orders" />}>
        {/* The Body pads the phone margin; groups lg apart. */}
        <Stack gap="lg">
          {active.length ? (
            <Stack as="section" gap="xs" aria-labelledby={activeId}>
              <Box paddingX="lg"><Heading level={2} id={activeId} textStyle="Body/Small/Bold" tone="light">In progress</Heading></Box>
              <ListBox>
                <List aria-labelledby={activeId}>{active.map(row)}</List>
              </ListBox>
            </Stack>
          ) : null}
          <Stack as="section" gap="xs" aria-labelledby={pastId}>
            <Box paddingX="lg"><Heading level={2} id={pastId} textStyle="Body/Small/Bold" tone="light">Past orders</Heading></Box>
            <ListBox>
              <List aria-labelledby={pastId}>{past.map(row)}</List>
            </ListBox>
          </Stack>
        </Stack>
      </AppShell>
    );
  }

  const readyAt = minutesAfter(opened.placed, 8);
  // Style=Icon: each step shows its own icon until it is passed (check).
  const steps: StepperStep[] = [
    { id: "placed", title: "Order placed", caption: formatTime(opened.placed), icon: "icon-receipt-line" },
    { id: "preparing", title: "Preparing", caption: plural(itemCount(opened), "item"), icon: "icon-coffee-cup-line" },
    { id: "ready", title: "Ready for pickup", caption: "Counter 2", icon: "icon-shopping-bag-01-line" },
    { id: "picked", title: "Picked up", caption: opened.pickedAt ? formatRelative(opened.pickedAt) : undefined, icon: "icon-package-check-line" },
  ];
  const status = opened.stage === 1 ? `Ready at about ${formatTime(readyAt)}` : opened.stage === 2 ? "Your order is ready at counter 2" : pickedLine(opened.pickedAt ?? TODAY);
  return (
    // The order is the list's child: the compact bar with Back, and the one next step pinned at the bottom.
    <AppShell key={opened.id} onPointerEnter={watch} onFocus={watch}
      topNavigation={<TopNavigation scrollRef={scrollRef} type="compact-alt" title={<span ref={titleRef} tabIndex={-1}>{`Order ${opened.id}`}</span>}
        leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: back }} />}
      // The footer holds the one next step: confirm the pickup once it is ready, then order the same again.
      actionBar={opened.stage === 2 ? <ActionBar primaryAction={{ label: "Confirm pickup", onClick: () => confirmPickup(opened.id) }} />
        : opened.stage === 4 ? <ActionBar primaryAction={{ label: "Order again", startIcon: "icon-refresh-cw-01-line", onClick: () => orderAgain(opened) }} />
        : undefined}>
      <Stack gap="lg">
        <Stack gap="xs">
          <Text role="status" textStyle="Body/Extra/Bold">{status}</Text>
          <Text textStyle="Body/Small/Regular" tone="base">{`${opened.store} · ${phinStores[opened.store]}`}</Text>
        </Stack>
        <Stepper aria-label="Order status" orientation="vertical" steps={steps} current={opened.stage} />
        <Stack as="section" gap="xs" aria-labelledby={linesId}>
          <Heading level={2} id={linesId} textStyle="Body/Small/Bold" tone="light">Your order</Heading>
          <List aria-labelledby={linesId}>
            {opened.lines.map(([id, qty]) => (
              <ListItem key={id} title={`${menu[id].name} × ${qty}`} trailing={<Text as="span" textStyle="Body/Base/Medium">{formatMoney(menu[id].price * qty, true)}</Text>} />
            ))}
          </List>
        </Stack>
      </Stack>
    </AppShell>
  );
}

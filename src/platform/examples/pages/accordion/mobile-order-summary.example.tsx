import { useId, useRef, useState, type RefObject } from "react";
import {
  Accordion, ActionBar, AppShell, DescriptionList, Divider, DockIcon, Heading, List, ListItem, Segmented, Stack, Stepper, Text, ToggleListItem, TopNavigation, useToast,
} from "@zen-ds/react";
import { formatMoney } from "../../data";

/** A Phin & Co pickup order in the loyalty app the studio builds (orders are numbered A-248, A-249…). */
const order = {
  number: "Order A-251",
  store: "Phin & Co Nguyen Hue",
  items: [
    { id: "phin", name: "Phin sữa đá", note: "Large · less ice", emoji: "☕", quantity: 2, price: 5.2 },
    { id: "banhmi", name: "Bánh mì chả cá", note: "Warmed", emoji: "🥖", quantity: 1, price: 2.4 },
    { id: "coconut", name: "Cà phê dừa", note: "Regular", emoji: "🥥", quantity: 1, price: 3.1 },
  ],
  pointsDiscount: 1.3,
};
// "× 2" only for more than one; a no-break space keeps it with its item when a long name wraps.
const lineName = (item: (typeof order.items)[number]) => (item.quantity > 1 ? `${item.name} × ${item.quantity}` : item.name);
const orderSubtotal = order.items.reduce((sum, item) => sum + item.price, 0);

/** Pickup time picked at checkout: as soon as possible (about 10 minutes from 10:30 am) or at 11:00 am. */
type Pickup = "asap" | "later";
const pickupOptions = [{ id: "asap", label: "In 10 minutes" }, { id: "later", label: "At 11:00 am" }];
const pickupWhen = (pickup: Pickup) => (pickup === "asap" ? "in about 10 minutes" : "at 11:00 am");
/** The member's points and wallet before this order. */
const pointsBalance = 1240;
const walletBalance = 24.6;
const totalWith = (points: boolean) => orderSubtotal - (points ? order.pointsDiscount : 0);

/**
 * The order as a receipt in a Box accordion. Folded, the title carries the total; open, the total moves to the receipt's
 * last row, so it is never shown twice in the box. Two groups: what was ordered (the cart's rows, with their options so
 * the customer can check them), then the calculation (Subtotal, the points when used, Total). contentWidth="full" runs
 * the prices to the box padding, under the chevron, instead of stopping before an empty column.
 */
function OrderSummary({ defaultExpanded, points }: { defaultExpanded: boolean; points: boolean }) {
  const [open, setOpen] = useState(defaultExpanded);
  const total = formatMoney(totalWith(points), true);
  return (
    <Accordion theme="box" headingLevel={2} contentWidth="full" expanded={open} onExpandedChange={setOpen}
      // The title row: the label on the left, the total at the end while folded.
      title={<span style={{ display: "flex", justifyContent: "space-between", gap: "var(--zen-spacing-gap-xsmall, 8px)" }}><span>Order summary</span>{open ? null : <span>{total}</span>}</span>}>
      <Stack gap="md">
        <List aria-label="Items in your order">
          {order.items.map((item) => (
            <ListItem key={item.id} leading={<DockIcon theme="emoji" emoji={item.emoji} size="medium" />} title={lineName(item)} caption={item.note}
              trailing={<Text as="span" textStyle="Body/Base/Medium" tone="strongest">{formatMoney(item.price, true)}</Text>} />
          ))}
        </List>
        <Divider />
        <DescriptionList items={[
          { id: "subtotal", term: "Subtotal", description: formatMoney(orderSubtotal, true) },
          ...(points ? [{ id: "points", term: "200 points redeemed", description: <Text as="span" textStyle="Body/Base/Medium" tone="positive">{`−${formatMoney(order.pointsDiscount, true)}`}</Text> }] : []),
          { id: "total", term: "Total", description: total, emphasis: true },
        ]} />
      </Stack>
    </Accordion>
  );
}

/** Phone checkout, pushed from the cart: the line items fold away, the total stays in the title and on the button. */
type CheckoutStep = "cart" | "checkout" | "placed";
type Focusable = { current: HTMLElement | null };

// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function MobileOrderSummary({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const cartId = useId();
  const rewardsId = useId();
  const pickupId = useId();
  const paymentId = useId();
  const [step, setStep] = useState<CheckoutStep>("checkout");
  const [points, setPoints] = useState(true);
  const [pickup, setPickup] = useState<Pickup>("asap");
  // Focus follows the screen: a pushed screen focuses its title; back on the cart, the total beside Check out.
  const titleRef = useRef<HTMLSpanElement>(null);
  const totalRef = useRef<HTMLElement>(null);
  const go = (next: CheckoutStep, focus: Focusable) => {
    setStep(next);
    setTimeout(() => focus.current?.focus());
  };
  const title = (text: string) => <span ref={titleRef} tabIndex={-1}>{text}</span>;
  const total = formatMoney(totalWith(points), true);
  // Open on checkout, where the customer checks the lines; folded on the confirmation, one tap away.
  const summary = <OrderSummary defaultExpanded={step === "checkout"} points={points} />;

  // Each screen is its own AppShell (key): it opens with its own state, and its bar measures the fold again.
  if (step === "cart") {
    return (
      // The cart on the white screen (Canvas/Alt, so the Box summary and the rows need no card): the lines under the
      // store they are picked up at, the points as a Toggle (it applies at once), and the total with Check out pinned
      // in the Action bar (Figma Bottom=Actions).
      <AppShell key="cart" canvas="alt"
        topNavigation={<TopNavigation type="default" title="Cart" largeTitle="Cart" scrollRef={scrollRef} />}
        actionBar={<ActionBar summary={<Text ref={totalRef} tabIndex={-1} as="span" textStyle="Body/Base/Medium">{`Total ${total}`}</Text>}
          primaryAction={{ label: "Check out", onClick: () => go("checkout", titleRef) }} />}>
        <Stack as="section" gap="xs" aria-labelledby={cartId}>
          <Heading level={2} id={cartId} textStyle="Body/Small/Bold" tone="light">{`Pickup at ${order.store}`}</Heading>
          <List aria-labelledby={cartId}>
            {order.items.map((item) => (
              <ListItem key={item.id} leading={<DockIcon theme="emoji" emoji={item.emoji} size="medium" />} title={lineName(item)} caption={item.note}
                trailing={<Text as="span" textStyle="Body/Base/Medium">{formatMoney(item.price, true)}</Text>} />
            ))}
          </List>
        </Stack>
        <Stack as="section" gap="xs" aria-labelledby={rewardsId}>
          <Heading level={2} id={rewardsId} textStyle="Body/Small/Bold" tone="light">Phin rewards</Heading>
          <List aria-labelledby={rewardsId}>
            <ToggleListItem leading={<DockIcon icon="icon-gift-01-line" theme="accent" background="subtle" size="medium" />} title="Use 200 points"
              caption={`${formatMoney(order.pointsDiscount, true)} off · ${pointsBalance.toLocaleString("en-US")} points now`} checked={points} onCheckedChange={setPoints} />
          </List>
        </Stack>
      </AppShell>
    );
  }

  if (step === "placed") {
    // An end state keeps a way out: Done starts again from the cart. The progress shows where the order is.
    return (
      <AppShell key="placed" canvas="alt"
        topNavigation={<TopNavigation type="compact" title={title("Order placed")} scrollRef={scrollRef} />}
        actionBar={<ActionBar primaryAction={{ label: "Done", onClick: () => go("cart", totalRef) }}
          secondaryAction={{ label: "Get directions", onClick: () => toast({ title: `Directions to ${order.store}`, children: "42 Nguyen Hue, District 1 · 6 minutes on foot" }) }} />}>
        <Stack gap="xs" role="status">
          <Heading level={2}>{`${order.number} is on its way`}</Heading>
          <Text tone="base">{`Pick it up at ${order.store} ${pickupWhen(pickup)}. You paid ${total}${points ? " and used 200 points" : ""}.`}</Text>
        </Stack>
        <Stepper orientation="vertical" aria-label="Order progress" current={1} steps={[
          { id: "received", title: "Order received", caption: "10:30 am" },
          { id: "preparing", title: "Preparing", caption: "Your barista has started on it" },
          { id: "ready", title: "Ready for pickup", caption: pickup === "asap" ? "About 10:40 am" : "11:00 am" },
        ]} />
        {summary}
      </AppShell>
    );
  }

  return (
    // A pushed screen: the compact bar with Back, the order to check, when and where to pick it up, how it is paid, and
    // the one action pinned in the Action bar with the total on it.
    <AppShell key="checkout" canvas="alt"
      topNavigation={<TopNavigation type="compact" title={title("Checkout")} scrollRef={scrollRef}
        leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => go("cart", totalRef) }} />}
      actionBar={<ActionBar primaryAction={{ label: `Place order · ${total}`, onClick: () => go("placed", titleRef) }} />}>
      {summary}
      <Stack as="section" gap="sm" aria-labelledby={pickupId}>
        <Heading level={2} id={pickupId} textStyle="Body/Small/Bold" tone="light">Pickup</Heading>
        <List aria-labelledby={pickupId}>
          <ListItem leading={<DockIcon icon="icon-marker-pin-01-line" theme="orange" background="subtle" size="medium" />} title={order.store} caption={`Ready ${pickupWhen(pickup)}`} />
        </List>
        <Segmented fullWidth aria-label="Pickup time" options={pickupOptions} value={pickup} onValueChange={(next) => setPickup(next as Pickup)} />
      </Stack>
      <Stack as="section" gap="xs" aria-labelledby={paymentId}>
        <Heading level={2} id={paymentId} textStyle="Body/Small/Bold" tone="light">Payment</Heading>
        <List aria-labelledby={paymentId}>
          <ListItem leading={<DockIcon icon="icon-wallet-02-line" theme="green" background="subtle" size="medium" />} title="Phin wallet"
            caption={`Balance ${formatMoney(walletBalance, true)} · ${formatMoney(walletBalance - totalWith(points), true)} after this order`} />
        </List>
      </Stack>
    </AppShell>
  );
}

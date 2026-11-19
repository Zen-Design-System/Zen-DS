import { useId, useRef, useState, type RefObject } from "react";
import { ActionBar, AppShell, DescriptionList, DockIcon, Heading, InlineMessage, List, ListItem, Slider, Stack, Text, TopNavigation } from "@zen-ds/react";
import { formatMoney } from "../../data";

/** Phin & Co's loyalty app, which the studio builds: 100 points take $1.00 off, up to the order total. */
const order = [
  { id: "coffee", name: "Iced milk coffee", note: "Large · less ice", emoji: "☕", price: 3.4 },
  { id: "croissant", name: "Butter croissant", note: "Warmed", emoji: "🥐", price: 3 },
];
const subtotal = order.reduce((sum, item) => sum + item.price, 0);
const store = { name: "Phin Lê Lợi", address: "42 Lê Lợi, District 1", ready: "10:40 am" };
const POINTS = 860;
const maxPoints = Math.min(POINTS, Math.floor((subtotal * 100) / 20) * 20);
type Step = "cart" | "checkout" | "paid";

// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function PointsAtCheckout({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const labelId = useId();
  const pickupId = useId();
  const [step, setStep] = useState<Step>("checkout");
  const [points, setPoints] = useState(320);
  const discount = points / 100;
  const total = subtotal - discount;
  // Focus follows the screen: each step focuses its title once it shows.
  const titleRef = useRef<HTMLSpanElement>(null);
  const go = (next: Step) => {
    setStep(next);
    setTimeout(() => titleRef.current?.focus());
  };
  const title = (text: string) => <span ref={titleRef} tabIndex={-1}>{text}</span>;

  if (step === "cart") {
    return (
      // One key per screen: each step opens at the top; the cart is a tab root with a large title.
      <AppShell key="cart"
        topNavigation={<TopNavigation scrollRef={scrollRef} type="alt" title="Cart" largeTitle={title("Cart")} />}
        actionBar={<ActionBar summary={<Text as="span" textStyle="Body/Base/Medium">Subtotal {formatMoney(subtotal, true)}</Text>}
          primaryAction={{ label: "Check out", onClick: () => go("checkout") }} />}>
        {/* Rows pad 0 at the sides: the screen margin insets them, so they line up with the page, as on checkout. */}
        <List aria-label="Items in your order">
          {order.map((item) => (
            <ListItem key={item.id} title={item.name} caption={item.note} leading={<DockIcon theme="emoji" emoji={item.emoji} />}
              trailing={<Text as="span" textStyle="Body/Base/Medium">{formatMoney(item.price, true)}</Text>} />
          ))}
        </List>
      </AppShell>
    );
  }
  const paid = step === "paid";
  return (
    <AppShell key={step}
      topNavigation={<TopNavigation scrollRef={scrollRef} type="compact-alt" title={title(paid ? "Order placed" : "Checkout")}
        leading={paid ? undefined : { icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => go("cart") }} />}
      actionBar={paid
        ? <ActionBar primaryAction={{ label: "Start new order", onClick: () => { setPoints(320); go("cart"); } }} />
        : <ActionBar primaryAction={{ label: total > 0 ? `Pay ${formatMoney(total, true)}` : "Place order", onClick: () => go("paid") }} />}>
      <Stack gap="lg">
        {paid ? (
          <InlineMessage theme="positive" title={`Pick up at ${store.name} at ${store.ready}`}>
            {points === 0 ? `You paid ${formatMoney(total, true)}.` : total > 0 ? `You used ${points} points and paid ${formatMoney(total, true)}.` : `Your ${points} points covered the whole order.`}
          </InlineMessage>
        ) : (
          <Stack as="section" gap="xs" aria-labelledby={pickupId}>
            <Heading level={2} id={pickupId} textStyle="Body/Small/Bold" tone="light">Pick up</Heading>
            <List aria-labelledby={pickupId}>
              <ListItem title={store.name} caption={`${store.address} · ready at ${store.ready}`}
                leading={<DockIcon icon="icon-shop-store-line" theme="orange" background="subtle" />} />
            </List>
          </Stack>
        )}
        {paid ? null : (
          <Stack gap="xs">
            <Heading level={2} id={labelId} textStyle="Body/Small/Bold" tone="light">Use Phin points</Heading>
            <Text textStyle="Body/Small/Regular" tone="base">You have {POINTS} points. 100 points take $1.00 off.</Text>
            {/* Stepped by 20 points, capped at the order total; the limits show the range, the row under it the effect. */}
            <Slider aria-labelledby={labelId} theme="accent" size="lg" min={0} max={maxPoints} step={20} showLimits
              value={points} onValueChange={setPoints} icon="icon-coins-solid"
              valueText={(value) => `${value} points, ${formatMoney(value / 100, true)} off`} />
          </Stack>
        )}
        <DescriptionList items={[
          { term: "Subtotal", description: formatMoney(subtotal, true) },
          { term: `Points (${points})`, description: `−${formatMoney(discount, true)}` },
          { term: paid ? "Paid" : "Total", description: formatMoney(total, true), emphasis: true },
        ]} />
      </Stack>
    </AppShell>
  );
}

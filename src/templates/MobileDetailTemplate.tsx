/**
 * Template: phone order detail (an order in an art-print shop's app; MobileListTemplate lists the same orders). Copy it
 * into your app, then replace the sample data and handlers. Render it inside
 * <ZenProvider typography="mobile" density="comfortable">. Uses only @zen/design-system components, no custom CSS.
 *
 * - A sticky compact TopNavigation: Back (a left chevron), the order number as the screen's h1, and Share. It follows
 *   the scroll (scrollRef), so a Pale rule separates it from the content running under it.
 * - Delivery status: the status Badge, the arrival day (h2) with the latest update, and a vertical Stepper.
 * - Prints (a List with Thumbnails), Delivery (the address, the carrier and the tracking number with Copy) and Payment
 *   (DescriptionList totals closed by the emphasised total, then Paid with). Sections are h2 in Heading/4.
 * - A sticky ActionBar: Track package (Primary) opens the carrier's updates; Get help opens an Action BottomSheet whose
 *   Report a problem continues in a pick-one sheet (List + ListItem selected).
 */
import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import {
  ActionBar,
  Badge,
  BottomSheet,
  DescriptionList,
  DockIcon,
  Heading,
  Icon,
  IconButton,
  List,
  ListItem,
  Stack,
  Stepper,
  Text,
  Thumbnail,
  TopNavigation,
  plural,
  useToast,
  type BottomSheetItem,
  type IconName,
  type StepperStep,
} from "@zen/design-system";

/* ── Sample data: replace with your own ─────────────────────────────── */
const money = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD" });
/** Sample print artwork drawn inline, so the template runs offline. Use your product image URLs instead. */
const picture = (from: string, to: string) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><linearGradient id="g" x2="1" y2="1"><stop stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient><rect width="1" height="1" fill="url(#g)"/></svg>`)}`;

/** Today is Wednesday, Sep 30, 2026; times follow the ladder (8:05 am · Monday at 2:05 pm · Sunday at 9:12 am). */
const order = { number: "1054", link: "https://prints.example/orders/1054", arriving: "Friday, Oct 2", latest: "Arrived in Ho Chi Minh City at 8:05 am" };
const steps: StepperStep[] = [
  { id: "placed", title: "Order placed", caption: "Sunday at 9:12 am", icon: "icon-receipt-line" },
  { id: "printed", title: "Printed", caption: "Monday at 11:30 am", icon: "icon-printer-line" },
  { id: "shipped", title: "Shipped", caption: "Monday at 2:05 pm", icon: "icon-truck-line" },
  { id: "delivered", title: "Delivered", caption: "Expected Friday by 6:00 pm", icon: "icon-package-check-line" },
];
const CURRENT_STEP = 2;

const items = [
  { id: "dusk", name: "Dusk gradient print", detail: "40 × 50 cm · Matte", qty: 1, price: 64, picture: picture("hsl(18 90% 72%)", "hsl(268 45% 42%)") },
  { id: "sea", name: "Sea glass print", detail: "30 × 40 cm · Matte", qty: 2, price: 42, picture: picture("hsl(172 50% 78%)", "hsl(205 60% 40%)") },
  { id: "meadow", name: "Meadow print", detail: "21 × 30 cm · Gloss", qty: 1, price: 28, picture: picture("hsl(88 45% 75%)", "hsl(140 40% 32%)") },
];
/** Orders from $100 ship free; smaller ones pay a flat rate. Tax is 8% of the prints. */
const FREE_SHIPPING_FROM = 100;
const SHIPPING_FEE = 6;
const TAX_RATE = 0.08;
const count = items.reduce((sum, item) => sum + item.qty, 0);
const subtotal = items.reduce((sum, item) => sum + item.qty * item.price, 0);
const shipping = subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_FEE;
const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
const paidWith = "Visa ending 4242";

const delivery = {
  address: ["Alex Duong", "Apt 12.04, 208 Nguyen Huu Canh", "Binh Thanh, Ho Chi Minh City"],
  carrier: "GHN Express",
  tracking: "GHN 8364 2917 4502",
};
/** The carrier's scans, newest first. */
const updates: { id: string; title: string; caption: string; icon: IconName }[] = [
  { id: "hub", title: "Arrived in Ho Chi Minh City", caption: "Sorting hub · 8:05 am", icon: "icon-building-02-line" },
  { id: "transit", title: "Left the Hanoi hub", caption: "Monday at 11:40 pm", icon: "icon-truck-line" },
  { id: "pickup", title: "Picked up in Hanoi", caption: "Monday at 2:05 pm", icon: "icon-package-line" },
];

const helpItems = [
  { id: "report", label: "Report a problem", icon: "icon-alert-circle-line" },
  { id: "chat", label: "Chat with support", icon: "icon-message-chat-circle-line" },
  // A disabled option says why in its trailing hint.
  { id: "cancel", label: "Cancel order", icon: "icon-x-circle-line", destructive: true, disabled: true, trailing: <Text as="span" textStyle="Caption/Regular" tone="light">Already shipped</Text> },
] satisfies BottomSheetItem[];
const problems = [
  { id: "tracking", label: "Tracking hasn't updated" },
  { id: "address", label: "Wrong delivery address" },
  { id: "print", label: "Wrong size or paper" },
  { id: "other", label: "Something else" },
];

type Sheet = "tracking" | "help" | "report";

/** The element that scrolls this screen (the nearest scrolling ancestor, else the window), so the bar can show its
 * scroll-edge rule once content runs under it. Unset until the screen has mounted. */
function useScroller(anchor: RefObject<HTMLElement | null>) {
  const [scroller, setScroller] = useState<RefObject<HTMLElement | null> | "window">();
  useLayoutEffect(() => {
    for (let node = anchor.current?.parentElement; node; node = node.parentElement) {
      if (/(auto|scroll)/.test(getComputedStyle(node).overflowY)) {
        setScroller({ current: node });
        return;
      }
    }
    setScroller("window");
  }, [anchor]);
  return scroller;
}

export function MobileDetailTemplate() {
  const { toast } = useToast();
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const scroller = useScroller(rootRef);

  /** Copies to the clipboard, then says whether it worked. */
  const copy = async (text: string, done: string, failed: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: done });
    } catch {
      toast({ title: failed });
    }
  };
  const sendReport = () => {
    setSheet(null);
    toast({ title: "Report sent", children: "We'll reply by email within a day" });
  };

  return (
    <Stack ref={rootRef} gap="none">
      {/* The compact bar title is the screen's h1 (in the bar style), so the content starts at h2. Your router also sets
          document.title to it: "Order #1054 · Your app". scrollRef draws the bar's Pale rule while content runs under it. */}
      <TopNavigation type="compact" sticky scrollRef={scroller} title={`Order #${order.number}`}
        leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => toast({ title: "Orders isn't part of this demo" }) /* your router: navigate(-1) */ }}
        trailing={[{ icon: "icon-share-01-line", label: "Share order", onClick: () => void copy(order.link, "Order link copied", "Couldn't copy the link") }]} />

      <Stack gap="xl" paddingX="lg" paddingY="lg">
        <Stack gap="md">
          <Stack gap="xs" align="start">
            <Badge theme="blue" background="subtle">Shipped</Badge>
            <Stack gap="2xs">
              <Heading level={2} textStyle="Heading/4">Arriving {order.arriving}</Heading>
              <Text tone="base">{order.latest}</Text>
            </Stack>
          </Stack>
          <Stepper orientation="vertical" aria-label="Delivery progress" current={CURRENT_STEP} steps={steps} />
        </Stack>

        <Stack gap="xs">
          <Heading level={2} textStyle="Heading/4">Prints</Heading>
          <List aria-label="Prints">
            {items.map((item) => (
              <ListItem key={item.id} title={item.name} caption={`${item.detail} · Qty ${item.qty}`}
                leading={<Thumbnail src={item.picture} alt="" />}
                trailing={<Text as="span" textStyle="Body/Base/Medium">{money(item.qty * item.price)}</Text>} />
            ))}
          </List>
        </Stack>

        <Stack gap="md">
          <Heading level={2} textStyle="Heading/4">Delivery</Heading>
          <DescriptionList layout="stacked" items={[
            // An address reads as a postal block: one line each for the name, the street and the city.
            { term: "Ship to", description: <Stack gap="none">{delivery.address.map((line) => <span key={line}>{line}</span>)}</Stack> },
            { term: "Carrier", description: delivery.carrier },
            { term: "Tracking number", description: delivery.tracking, action: (
              <IconButton appearance="flat" level="primary" size="sm" icon="icon-copy-line" aria-label="Copy tracking number"
                onClick={() => void copy(delivery.tracking, "Tracking number copied", "Couldn't copy the tracking number")} />
            ) },
          ]} />
        </Stack>

        {/* The receipt closes the screen: the total is the one emphasised row; how it was paid sits apart below it. */}
        <Stack gap="md">
          <Heading level={2} textStyle="Heading/4">Payment</Heading>
          <Stack gap="lg">
            <DescriptionList items={[
              { term: `Subtotal (${plural(count, "print")})`, description: money(subtotal) },
              { term: "Shipping", description: shipping ? money(shipping) : "Free" },
              { term: `Tax (${TAX_RATE * 100}%)`, description: money(tax) },
              { term: "Total", description: money(subtotal + shipping + tax), emphasis: true },
            ]} />
            <DescriptionList items={[{ term: "Paid with", description: paidWith }]} />
          </Stack>
        </Stack>
      </Stack>

      {/* Footer CTA: sticky, Large and full width, Primary on top; it clears the home indicator. */}
      <ActionBar
        primaryAction={{ label: "Track package", onClick: () => setSheet("tracking") }}
        secondaryAction={{ label: "Get help", onClick: () => setSheet("help") }} />

      <BottomSheet title="Track package" open={sheet === "tracking"} onOpenChange={(open) => setSheet(open ? "tracking" : null)}>
        <Stack gap="xs">
          <Text textStyle="Body/Small/Regular" tone="base">{delivery.carrier} · {delivery.tracking}</Text>
          <List aria-label="Package updates">
            {updates.map((update) => (
              <ListItem key={update.id} title={update.title} caption={update.caption}
                leading={<DockIcon icon={update.icon} background="subtle" size="md" />} />
            ))}
          </List>
        </Stack>
      </BottomSheet>

      {/* keepOpen: the choice decides what comes next, so Report a problem replaces this sheet instead of stacking. */}
      <BottomSheet type="action" keepOpen title="Get help" items={helpItems}
        open={sheet === "help"} onOpenChange={(open) => setSheet(open ? "help" : null)}
        onSelect={(item) => {
          if (item.id === "report") {
            setProblem(null);
            setSheet("report");
          } else {
            setSheet(null);
            toast({ title: "Support chat isn't part of this demo" });
          }
        }} />

      {/* Pick one: a List of ListItems; the selected row is marked and gets a check. The question above the choices says
          why Send report waits for one. */}
      <BottomSheet title="Report a problem" open={sheet === "report"} onOpenChange={(open) => setSheet(open ? "report" : null)}
        primaryAction={{ label: "Send report", disabled: !problem, onClick: sendReport }}>
        <Text textStyle="Body/Small/Regular" tone="base">What went wrong with this order?</Text>
        <List aria-label="What went wrong with this order?">
          {problems.map((option) => (
            <ListItem key={option.id} title={option.label} selected={option.id === problem}
              trailing={option.id === problem ? <Icon name="icon-check-line" size="base" decorative /> : undefined}
              onClick={() => setProblem(option.id)} />
          ))}
        </List>
      </BottomSheet>
    </Stack>
  );
}

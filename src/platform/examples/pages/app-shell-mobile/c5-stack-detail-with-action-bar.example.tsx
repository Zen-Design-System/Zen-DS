import { useId, useState, type RefObject } from "react";
import {
  ActionBar, AppShell, Avatar, Badge, Card, DescriptionList, DockIcon, IconButton, List, ListItem, Segmented, Stack, Text, Thumbnail, TopNavigation,
  useToast, type IconName,
} from "@zen-ds/react";
import { photos } from "../../data";

const orderLines = [
  { id: "urbas", name: "Urbas Love+ Slip On", variant: "Offwhite · EU 39", price: "$42.00", photo: photos.products.offwhite },
  { id: "vintas", name: "Vintas Soda Pop High", variant: "Red Violet · EU 39", price: "$58.00", photo: photos.products.redViolet },
];
const orderActivity: { id: string; title: string; caption: string; icon: IconName }[] = [
  { id: "ready", title: "Packed, ready to ship", caption: "Sep 30 · 16:40 · Warehouse Hanoi", icon: "icon-package-line" },
  { id: "paid", title: "Payment captured", caption: "Sep 30 · 14:06 · Visa ·· 42", icon: "icon-credit-card-line" },
  { id: "placed", title: "Order placed", caption: "Sep 30 · 14:05 · Online store", icon: "icon-shopping-bag-01-line" },
];
type OrderTab = "details" | "items" | "activity";

function OrderItemsCard() {
  const titleId = useId();
  return (
    <Card theme="pale" as="section" aria-labelledby={titleId}>
      <Stack gap="sm">
        <Text id={titleId} textStyle="All-Caps/S" tone="light">Items</Text>
        {orderLines.map((line) => (
          <Stack key={line.id} direction="row" gap="sm" align="center">
            {/* Figma Thumb: the product photo, 48 with Corner-Radius/Base (Image-Size/Large). */}
            <Thumbnail src={line.photo.src} alt="" size="lg" />
            <Stack gap="3xs" width="fill">
              <Text textStyle="Body/Base/Medium" truncate>{line.name}</Text>
              <Text textStyle="Body/Small/Regular" tone="light">{line.variant}</Text>
            </Stack>
            <Text textStyle="Body/Base/Medium" tabularNumbers>{line.price}</Text>
          </Stack>
        ))}
      </Stack>
    </Card>
  );
}

/** C5 · Stack detail + Action bar (Figma ◇ Master-Layout · Example, 15923:8404): AppShell/Mobile · Phone · Top=Bar ·
 *  Bottom=Actions, Pale groups on Canvas/Alt. */
// scrollRef: what scrolls the screen, so the bar follows the scroll. "window" in your app.
export default function OrderDetailPhone({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const [tab, setTab] = useState<OrderTab>("details");
  const [shipped, setShipped] = useState(false);
  const customerId = useId();
  const totalsId = useId();
  const activityId = useId();
  return (
    // Top=Bar, Bottom=Actions on Canvas/Alt: back, the order and More in the bar; the total large under it, Segmented
    // sections, Pale groups on white, and the next step pinned in the Action bar.
    <AppShell canvas="alt"
      topNavigation={<TopNavigation type="default" title="Order #10428" subtitle="Placed Sep 30 · Online store" scrollRef={scrollRef}
        leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => toast({ title: "Back to Orders" }) }}
        trailing={[{ icon: "icon-dots-vertical-line", label: "More for order #10428", onClick: () => toast({ title: "Print packing slip, refund or cancel the order" }) }]} />}
      actionBar={<ActionBar direction="horizontal"
        secondaryAction={{ label: "Contact", onClick: () => toast({ title: "Message to Lia Campbell", children: "lia@northwind.io" }) }}
        primaryAction={shipped
          ? { label: "Track shipment", onClick: () => toast({ title: "Parcel with GHN Express", children: "Out for delivery Thu, Oct 2" }) }
          : { label: "Mark as shipped", onClick: () => { setShipped(true); toast({ title: "Order #10428 shipped", children: "Lia gets the tracking link by email.", action: { label: "Undo", onClick: () => setShipped(false) } }); } }} />}
    >
      {/* Two sections, a section gap apart (the AppShell body spaces them): the order's total, then the Segmented with
          the groups it switches, Spacing/Gap/Medium between them (Figma C5, usage rules §13). */}
      <Stack gap="xs">
        <Badge size="sm" leadingIcon={false} theme={shipped ? "green" : "orange"}>{shipped ? "Shipped" : "Ready to ship"}</Badge>
        <Text as="p" textStyle="Display/4" tabularNumbers>$110.00</Text>
        <Text textStyle="Body/Small/Regular" tone="light">2 items · Paid with Visa ·· 42</Text>
      </Stack>
      <Stack gap="md">
        <Segmented fullWidth aria-label="Order sections" value={tab} onValueChange={(next) => setTab(next as OrderTab)}
          options={[{ id: "details", label: "Details" }, { id: "items", label: "Items" }, { id: "activity", label: "Activity" }]} />
        {tab === "details" ? (
          <>
            <Card theme="pale" as="section" aria-labelledby={customerId}>
              <Stack gap="sm">
                <Text id={customerId} textStyle="All-Caps/S" tone="light">Customer</Text>
                <Stack direction="row" gap="sm" align="center">
                  <Avatar size="md" theme="violet" background="subtle" alt="">LC</Avatar>
                  <Stack gap="3xs" width="fill">
                    <Text textStyle="Body/Base/Bold">Lia Campbell</Text>
                    <Text textStyle="Body/Small/Regular" tone="light">lia@northwind.io</Text>
                  </Stack>
                  <IconButton size="sm" level="tertiary" icon="icon-phone-line" aria-label="Call Lia Campbell" onClick={() => toast({ title: "Calling Lia Campbell…" })} />
                </Stack>
                <DescriptionList divider items={[
                  { term: "Delivery", description: "Standard · 2–4 days" },
                  { term: "Ship to", description: "Hoan Kiem, Hanoi" },
                  { term: "Payment", description: "Paid · Visa ·· 42" },
                ]} />
              </Stack>
            </Card>
            <OrderItemsCard />
          </>
        ) : null}
        {tab === "items" ? (
          <>
            <OrderItemsCard />
            <Card theme="pale" as="section" aria-labelledby={totalsId}>
              <Stack gap="sm">
                <Text id={totalsId} textStyle="All-Caps/S" tone="light">Total</Text>
                <DescriptionList divider items={[
                  { term: "Subtotal", description: "$100.00" },
                  { term: "Shipping", description: "$10.00" },
                  { term: "Paid", description: "$110.00", emphasis: true },
                ]} />
              </Stack>
            </Card>
          </>
        ) : null}
        {tab === "activity" ? (
          <Card theme="pale" as="section" aria-labelledby={activityId}>
            <Stack gap="sm">
              <Text id={activityId} textStyle="All-Caps/S" tone="light">Activity</Text>
              <List aria-labelledby={activityId}>
                {(shipped ? [{ id: "shipped", title: "Shipped with GHN Express", caption: "Today · Tracking sent to Lia", icon: "icon-truck-line" as IconName }, ...orderActivity] : orderActivity).map((event) => (
                  <ListItem key={event.id} title={event.title} caption={event.caption}
                    leading={<DockIcon icon={event.icon} theme="neutral" background="subtle" size="sm" />} />
                ))}
              </List>
            </Stack>
          </Card>
        ) : null}
      </Stack>
    </AppShell>
  );
}

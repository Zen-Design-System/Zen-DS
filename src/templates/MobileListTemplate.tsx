/**
 * Template: phone order list with filters (a customer's orders in an art-print shop's app). Copy it into your app and
 * replace the sample data and handlers. Render it inside <ZenProvider typography="mobile" density="comfortable">.
 * Uses only @zen/design-system components, no custom CSS.
 *
 * - TopNavigation: the large title "Orders" is the screen's h1, with a Search control bar. Both fold into the bar as
 *   the list scrolls, and the folded Search comes back as a Search action at the top right.
 * - Filters: one sideways-scrolling row. Date opens a Bottom Sheet to pick one range (List + ListItem selected), then
 *   single-choice status chips. The result count is announced.
 * - Rows: a Thumbnail of the first print, the order number, prints and total, when it was placed and a status Badge.
 *   Tapping a row opens the order in a Bottom Sheet: Cancel order (with Undo) while it is processing, the tracking
 *   number once shipped, Order again once delivered or cancelled.
 * - Load more adds the next page and moves focus to its first order. An EmptyState offers Clear search or Clear
 *   filters when nothing matches.
 */
import { flushSync } from "react-dom";
import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import {
  Badge,
  BottomSheet,
  Button,
  Chip,
  DescriptionList,
  EmptyState,
  Heading,
  Icon,
  IconButton,
  List,
  ListItem,
  Search,
  Stack,
  Text,
  Thumbnail,
  TopNavigation,
  VisuallyHidden,
  plural,
  useToast,
  type BadgeTheme,
} from "@zen/design-system";

/* ── Sample data: replace with your own ─────────────────────────────── */
/** "Now" for the sample timestamps: Wednesday, Sep 30, 2026 at 10:45 am. */
const NOW_ISO = "2026-09-30T10:45";
const NOW = new Date(NOW_ISO);
/** Ten orders a page: the list scrolls on any phone (so the large title folds), and Load more adds the rest. */
const PAGE_SIZE = 10;
const TAX_RATE = 0.08;
/** Orders from $100 ship free; smaller ones pay a flat rate. */
const FREE_SHIPPING_FROM = 100;
const SHIPPING_FEE = 6;

/** Sample print artwork drawn inline, so the template runs offline. Use your product image URLs instead. */
const picture = (from: string, to: string) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><linearGradient id="g" x2="1" y2="1"><stop stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient><rect width="1" height="1" fill="url(#g)"/></svg>`)}`;
const prints = {
  dusk: { name: "Dusk gradient print", detail: "40 × 50 cm · Matte", price: 64, picture: picture("hsl(18 90% 72%)", "hsl(268 45% 42%)") },
  sea: { name: "Sea glass print", detail: "30 × 40 cm · Matte", price: 42, picture: picture("hsl(172 50% 78%)", "hsl(205 60% 40%)") },
  meadow: { name: "Meadow print", detail: "21 × 30 cm · Gloss", price: 28, picture: picture("hsl(88 45% 75%)", "hsl(140 40% 32%)") },
  saffron: { name: "Saffron print", detail: "30 × 40 cm · Matte", price: 42, picture: picture("hsl(48 95% 72%)", "hsl(22 85% 52%)") },
  lotus: { name: "Lotus pond print", detail: "40 × 50 cm · Gloss", price: 64, picture: picture("hsl(335 70% 82%)", "hsl(165 35% 38%)") },
  monsoon: { name: "Monsoon print", detail: "50 × 70 cm · Matte", price: 86, picture: picture("hsl(205 25% 78%)", "hsl(225 35% 30%)") },
  terracotta: { name: "Terracotta print", detail: "30 × 40 cm · Matte", price: 42, picture: picture("hsl(24 70% 70%)", "hsl(8 55% 38%)") },
  night: { name: "Night market print", detail: "40 × 50 cm · Matte", price: 64, picture: picture("hsl(265 55% 55%)", "hsl(330 65% 32%)") },
  mist: { name: "Ha Long mist print", detail: "50 × 70 cm · Matte", price: 86, picture: picture("hsl(185 30% 88%)", "hsl(200 30% 48%)") },
};
type PrintId = keyof typeof prints;

type Status = "Processing" | "Shipped" | "Delivered" | "Cancelled";
const statuses: Status[] = ["Processing", "Shipped", "Delivered", "Cancelled"];
const statusTheme: Record<Status, BadgeTheme> = { Processing: "yellow", Shipped: "blue", Delivered: "green", Cancelled: "neutral" };

/** Times are local ISO moments ("2026-09-27T09:12"). Each status carries the step it reached; a shipped order its tracking. */
type Order = { id: string; placed: string; items: Array<{ print: PrintId; qty: number }> } & (
  | { status: "Processing" }
  | { status: "Shipped"; shipped: string; arriving: string; tracking: string }
  | { status: "Delivered"; delivered: string }
  | { status: "Cancelled"; cancelled: string }
);

const seed: Order[] = [
  { id: "1058", placed: "2026-09-30T10:32", status: "Processing", items: [{ print: "saffron", qty: 1 }, { print: "meadow", qty: 1 }] },
  { id: "1057", placed: "2026-09-29T16:15", status: "Processing", items: [{ print: "night", qty: 1 }] },
  { id: "1054", placed: "2026-09-27T09:12", status: "Shipped", shipped: "2026-09-28T14:05", arriving: "2026-10-02T18:00", tracking: "GHN 8364 2917 4502", items: [{ print: "dusk", qty: 1 }, { print: "sea", qty: 2 }, { print: "meadow", qty: 1 }] },
  { id: "1051", placed: "2026-09-24T20:48", status: "Shipped", shipped: "2026-09-26T10:20", arriving: "2026-10-01T18:00", tracking: "GHN 8351 0466 2318", items: [{ print: "lotus", qty: 2 }] },
  { id: "1047", placed: "2026-09-14T11:30", status: "Delivered", delivered: "2026-09-18T15:40", items: [{ print: "monsoon", qty: 1 }] },
  { id: "1043", placed: "2026-09-02T08:05", status: "Delivered", delivered: "2026-09-05T11:10", items: [{ print: "terracotta", qty: 1 }, { print: "saffron", qty: 1 }] },
  { id: "1040", placed: "2026-08-21T19:40", status: "Cancelled", cancelled: "2026-08-21T20:02", items: [{ print: "mist", qty: 1 }] },
  { id: "1036", placed: "2026-08-03T13:10", status: "Delivered", delivered: "2026-08-07T16:25", items: [{ print: "sea", qty: 1 }] },
  { id: "1031", placed: "2026-07-12T10:00", status: "Delivered", delivered: "2026-07-16T09:30", items: [{ print: "dusk", qty: 2 }] },
  { id: "1027", placed: "2026-06-18T15:22", status: "Delivered", delivered: "2026-06-22T14:00", items: [{ print: "meadow", qty: 3 }] },
  { id: "1022", placed: "2026-05-02T09:45", status: "Delivered", delivered: "2026-05-06T17:15", items: [{ print: "night", qty: 1 }, { print: "monsoon", qty: 1 }] },
  { id: "1016", placed: "2026-03-08T17:05", status: "Cancelled", cancelled: "2026-03-09T08:40", items: [{ print: "lotus", qty: 1 }] },
  { id: "1011", placed: "2026-01-15T12:00", status: "Delivered", delivered: "2026-01-20T10:05", items: [{ print: "terracotta", qty: 2 }] },
  { id: "1004", placed: "2025-12-20T18:30", status: "Delivered", delivered: "2025-12-24T13:45", items: [{ print: "saffron", qty: 1 }, { print: "sea", qty: 1 }, { print: "dusk", qty: 1 }] },
  { id: "1001", placed: "2025-11-28T10:15", status: "Delivered", delivered: "2025-12-02T15:30", items: [{ print: "mist", qty: 2 }] },
];

/** The Date filter: one range at a time, measured from NOW. */
const monthsAgo = (months: number) => new Date(NOW.getFullYear(), NOW.getMonth() - months, NOW.getDate());
const ranges: Array<{ id: string; label: string; includes: (date: Date) => boolean }> = [
  { id: "any", label: "Any time", includes: () => true },
  { id: "30-days", label: "Last 30 days", includes: (date) => NOW.getTime() - date.getTime() <= 30 * 86400000 },
  { id: "3-months", label: "Last 3 months", includes: (date) => date >= monthsAgo(3) },
  { id: "2026", label: "2026", includes: (date) => date.getFullYear() === 2026 },
  { id: "2025", label: "2025", includes: (date) => date.getFullYear() === 2025 },
];

/* ── Formatting ─────────────────────────────────────────────────────── */
const money = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD" });
const clock = (date: Date) => date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase();
const dayStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
/** "Oct 2, 2026". */
const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
/** The timestamp ladder: Just now · 13 minutes ago · 10:30 am · Yesterday at 10:30 am · Friday at 10:30 am ·
 * Sep 14 at 10:30 am · Sep 14, 2025. */
function stamp(iso: string) {
  const date = new Date(iso);
  const minutes = Math.floor((NOW.getTime() - date.getTime()) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${plural(minutes, "minute")} ago`;
  const days = Math.round((dayStart(NOW) - dayStart(date)) / 86400000);
  if (days === 0) return clock(date);
  if (days === 1) return `Yesterday at ${clock(date)}`;
  if (days < 7) return `${date.toLocaleDateString("en-US", { weekday: "long" })} at ${clock(date)}`;
  if (date.getFullYear() === NOW.getFullYear()) return `${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })} at ${clock(date)}`;
  return day(iso);
}
/** Prints, subtotal, shipping, tax and total of an order. */
function totals(order: Order) {
  const count = order.items.reduce((sum, item) => sum + item.qty, 0);
  const subtotal = order.items.reduce((sum, item) => sum + item.qty * prints[item.print].price, 0);
  const shipping = subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_FEE;
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  return { count, subtotal, shipping, tax, total: subtotal + shipping + tax };
}
const statusBadge = (status: Status) => <Badge size="sm" theme={statusTheme[status]} background="subtle">{status}</Badge>;

/** The element that scrolls this screen (the nearest scrolling ancestor, else the window), so the large title can fold
 * with it. Unset until the screen has mounted, so the bar never folds to another scroller's position first. */
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

export function MobileListTemplate() {
  const { toast, dismiss } = useToast();
  const [orders, setOrders] = useState(seed);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status | "all">("all");
  const [range, setRange] = useState("any");
  const [shown, setShown] = useState(PAGE_SIZE);
  const [sheet, setSheet] = useState<"date" | "order" | null>(null);
  // The order in the sheet; it stays set while the sheet slides away.
  const [orderId, setOrderId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const scroller = useScroller(rootRef);

  const term = query.trim().toLowerCase().replace(/^#/, "");
  const rangeOption = ranges.find((option) => option.id === range) ?? ranges[0];
  const matches = orders.filter((order) =>
    (status === "all" || order.status === status)
    && rangeOption.includes(new Date(order.placed))
    && (!term || order.id.includes(term) || order.items.some((item) => prints[item.print].name.toLowerCase().includes(term))));
  const opened = orders.find((order) => order.id === orderId);
  const emptyTitle = term ? `No results for “${query.trim()}”` : "No orders match";

  // A new search or filter starts again from the first page.
  const search = (value: string) => { setQuery(value); setShown(PAGE_SIZE); };
  const filterStatus = (value: Status | "all") => { setStatus(value); setShown(PAGE_SIZE); };
  const pickRange = (id: string) => { setRange(id); setShown(PAGE_SIZE); setSheet(null); };
  const clearFilters = () => { setStatus("all"); setRange("any"); setShown(PAGE_SIZE); };
  // The empty state's Clear buttons bring the rows back and leave; focus moves to the search field, the top of the list.
  const clearSearchAndFocus = () => { search(""); searchRef.current?.focus(); };
  const clearFiltersAndFocus = () => { clearFilters(); searchRef.current?.focus(); };

  // The folded Search action scrolls back to the top; once the bar has unfolded, the field takes focus.
  const openSearch = () => {
    const target = scroller === "window" ? window : scroller?.current;
    if (!target) return;
    let done = false;
    const focus = () => { if (done) return; done = true; requestAnimationFrame(() => searchRef.current?.focus({ preventScroll: true })); };
    target.addEventListener("scrollend", focus, { once: true });
    window.setTimeout(focus, 600); // browsers without scrollend
    target.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Keyboard and screen-reader users carry on at the first new order.
  const loadMore = () => {
    const first = shown;
    flushSync(() => setShown(first + PAGE_SIZE));
    listRef.current?.children[first]?.querySelector("button")?.focus();
  };

  const openOrder = (id: string) => { setOrderId(id); setSheet("order"); };
  /** Focus an order's row when the list shows it: after Undo, or when a sheet opened from a toast closes. */
  const focusOrder = (id: string) => listRef.current?.querySelector<HTMLElement>(`[data-order="${id}"] button`)?.focus();
  const replace = (next: Order) => setOrders((list) => list.map((order) => (order.id === next.id ? next : order)));
  // Cancelling acts at once; Undo in the toast puts the order back as it was, and focus back on its row.
  const cancel = (order: Order) => {
    replace({ id: order.id, placed: order.placed, items: order.items, status: "Cancelled", cancelled: NOW_ISO });
    setSheet(null);
    const toastId = toast({ title: `Order #${order.id} cancelled`, action: { label: "Undo", onClick: () => { flushSync(() => replace(order)); dismiss(toastId); focusOrder(order.id); } } });
  };
  // Order again places the same prints as a new order on top of the list; View opens it.
  const orderAgain = (order: Order) => {
    const id = String(Math.max(...orders.map((entry) => Number(entry.id))) + 1);
    setOrders((list) => [{ id, placed: NOW_ISO, status: "Processing", items: order.items }, ...list]);
    setSheet(null);
    const toastId = toast({ title: `Order #${id} placed`, action: { label: "View", onClick: () => { openOrder(id); dismiss(toastId); } } });
  };
  const copyTracking = async (tracking: string) => {
    try {
      await navigator.clipboard.writeText(tracking);
      toast({ title: "Tracking number copied" });
    } catch {
      toast({ title: "Couldn't copy the tracking number" });
    }
  };

  return (
    <Stack ref={rootRef} gap="none">
      {/* The large title is the screen's h1. Your router also sets document.title to it: "Orders · Your app". */}
      <TopNavigation sticky scrollRef={scroller} title="Orders" largeTitle="Orders"
        controlBar={<Search ref={searchRef} aria-label="Search orders" placeholder="Search orders" value={query} onValueChange={search} />}
        searchAction={{ label: "Search orders", onClick: openSearch }} />

      {/* One row that scrolls sideways: Date opens a pick-one sheet, the status chips choose one status. */}
      <Stack direction="row" gap="xs" paddingX="lg" paddingY="xs" role="group" aria-label="Filter orders" style={{ overflowX: "auto", scrollbarWidth: "none" }}>
        <Chip variant="advanced" size="medium" dropdown aria-haspopup="dialog" aria-expanded={sheet === "date"} popoverOpen={sheet === "date"}
          selected={range !== "any"} onClick={() => setSheet("date")} onClearSelection={range !== "any" ? () => pickRange("any") : undefined}>
          {range === "any" ? "Date" : rangeOption.label}
        </Chip>
        {(["all", ...statuses] as const).map((option) => (
          <Chip key={option} variant="normal" size="medium" level="primary" selected={status === option} onClick={() => filterStatus(option)}>
            {option === "all" ? "All" : option}
          </Chip>
        ))}
      </Stack>

      {/* The result count is announced as filters and search change. */}
      <Stack paddingX="lg" role="status">
        {matches.length ? <Text textStyle="Body/Small/Regular" tone="base">{plural(matches.length, "order")}</Text> : <VisuallyHidden>{emptyTitle}</VisuallyHidden>}
      </Stack>

      {matches.length ? (
        // Rows pad 0 at the sides: the screen margin (lg) insets them; xs above and below, like a List-Box on a phone.
        <Stack paddingX="lg" paddingY="xs" gap="lg" align="stretch">
          <List ref={listRef} aria-label="Orders">
            {matches.slice(0, shown).map((order) => {
              const { count, total } = totals(order);
              const cover = prints[order.items[0].print];
              return (
                <ListItem key={order.id} data-order={order.id} title={`Order #${order.id}`} caption={<>{`${plural(count, "print")} · ${money(total)}`}<br />{stamp(order.placed)}</>}
                  leading={<Thumbnail src={cover.picture} alt={cover.name} />} trailing={statusBadge(order.status)}
                  selected={sheet === "order" && orderId === order.id} onClick={() => openOrder(order.id)} />
              );
            })}
          </List>
          {matches.length > shown ? <Button level="tertiary" size="md" onClick={loadMore}>Load more orders</Button> : null}
        </Stack>
      ) : (
        <Stack paddingX="lg" paddingY="xl">
          {term ? (
            <EmptyState headingLevel={2} illustration={false} title={emptyTitle} secondaryAction={{ label: "Clear search", onClick: clearSearchAndFocus }}>
              Try an order number or a print name.
            </EmptyState>
          ) : (
            <EmptyState headingLevel={2} illustration={false} title={emptyTitle} secondaryAction={{ label: "Clear filters", onClick: clearFiltersAndFocus }}>
              Try another status or date.
            </EmptyState>
          )}
        </Stack>
      )}

      {/* Pick one range: List + ListItem, the chosen row Selected with a check; picking closes the sheet. */}
      <BottomSheet title="Date placed" open={sheet === "date"} onOpenChange={(open) => { if (!open) setSheet(null); }}>
        <List aria-label="Date placed">
          {ranges.map((option) => (
            <ListItem key={option.id} title={option.label} selected={option.id === range} onClick={() => pickRange(option.id)}
              trailing={option.id === range ? <Icon name="icon-check-line" size="base" decorative /> : undefined} />
          ))}
        </List>
      </BottomSheet>

      {opened ? (
        // The sheet returns focus to the row that opened it; one opened from a toast's View returns it to the order's row.
        <OrderSheet order={opened} open={sheet === "order"} onOpenChange={(open) => { if (!open) { setSheet(null); focusOrder(opened.id); } }}
          onCancel={cancel} onOrderAgain={orderAgain} onCopyTracking={copyTracking} />
      ) : null}
    </Stack>
  );
}

/** One order in a Bottom Sheet: the steps it reached, its prints and payment, and the one action its status allows. */
function OrderSheet({ order, open, onOpenChange, onCancel, onOrderAgain, onCopyTracking }: {
  order: Order;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancel: (order: Order) => void;
  onOrderAgain: (order: Order) => void;
  onCopyTracking: (tracking: string) => Promise<void>;
}) {
  const { count, subtotal, shipping, tax, total } = totals(order);
  const steps = order.status === "Shipped" ? [
    { id: "shipped", term: "Shipped", description: stamp(order.shipped) },
    { id: "arriving", term: "Arriving", description: day(order.arriving) },
    { id: "tracking", term: "Tracking number", description: order.tracking,
      action: <IconButton appearance="flat" level="primary" size="sm" icon="icon-copy-line" aria-label="Copy tracking number" onClick={() => void onCopyTracking(order.tracking)} /> },
  ] : order.status === "Delivered" ? [{ id: "delivered", term: "Delivered", description: stamp(order.delivered) }]
    : order.status === "Cancelled" ? [{ id: "cancelled", term: "Cancelled", description: stamp(order.cancelled) }] : [];
  return (
    <BottomSheet title={`Order #${order.id}`} open={open} onOpenChange={onOpenChange}
      primaryAction={order.status === "Processing" ? { label: "Cancel order", level: "danger-subtle", onClick: () => onCancel(order) }
        : order.status === "Shipped" ? undefined : { label: "Order again", onClick: () => onOrderAgain(order) }}>
      <DescriptionList items={[
        { id: "status", term: "Status", description: statusBadge(order.status) },
        { id: "placed", term: "Placed", description: stamp(order.placed) },
        ...steps,
      ]} />
      <Stack gap="xs">
        <Heading level={3} textStyle="Body/Small/Bold" tone="light">Prints</Heading>
        <List aria-label={`Prints in order #${order.id}`}>
          {order.items.map((item) => {
            const print = prints[item.print];
            return (
              <ListItem key={item.print} title={print.name} caption={`${print.detail} · Qty ${item.qty}`} leading={<Thumbnail src={print.picture} alt="" />}
                trailing={<Text as="span" textStyle="Body/Base/Regular">{money(print.price * item.qty)}</Text>} />
            );
          })}
        </List>
      </Stack>
      <DescriptionList items={[
        { id: "subtotal", term: `Subtotal (${plural(count, "print")})`, description: money(subtotal) },
        { id: "shipping", term: "Shipping", description: shipping ? money(shipping) : "Free" },
        { id: "tax", term: "Tax (8%)", description: money(tax) },
        { id: "total", term: "Total", description: money(total), emphasis: true },
      ]} />
    </BottomSheet>
  );
}

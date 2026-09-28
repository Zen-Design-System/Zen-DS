/**
 * Template: phone list with filters. Copy it into your app and replace the sample data.
 * Render it inside <ZenProvider typography="mobile" density="comfortable">. Uses only @zen/design-system components.
 * Mobile pattern: filter chips sit in one horizontally scrolling row and each opens an Action BottomSheet.
 */
import { useState } from "react";
import { Badge, BottomSheet, Chip, EmptyState, List, ListItem, Search, Stack, Text, TopNavigation, plural, useToast } from "@zen/design-system";

/* ── Sample data: replace with your own ─────────────────────────────── */
const orders = [
  { id: "1042", title: "Order #1042", caption: "3 items · $128.00", status: "shipped", date: "Today" },
  { id: "1041", title: "Order #1041", caption: "1 item · $24.00", status: "processing", date: "Yesterday" },
  { id: "1039", title: "Order #1039", caption: "5 items · $312.50", status: "delivered", date: "Mon" },
  { id: "1037", title: "Order #1037", caption: "2 items · $56.00", status: "cancelled", date: "Last week" },
];
const statuses = [
  { id: "all", label: "All orders" },
  { id: "processing", label: "Processing" },
  { id: "shipped", label: "Shipped" },
  { id: "delivered", label: "Delivered" },
  { id: "cancelled", label: "Cancelled" },
];
const sorts = [
  { id: "newest", label: "Newest first" },
  { id: "oldest", label: "Oldest first" },
];
const badgeTheme = { processing: "yellow", shipped: "blue", delivered: "green", cancelled: "neutral" } as const;

export function MobileListTemplate() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("newest");
  const [sheet, setSheet] = useState<"status" | "sort" | null>(null);
  const [opened, setOpened] = useState<string | null>(null);
  const { toast } = useToast();

  const shown = orders
    .filter((order) => (status === "all" || order.status === status) && order.title.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => (sort === "newest" ? Number(b.id) - Number(a.id) : Number(a.id) - Number(b.id)));

  return (
    <Stack gap="none">
      {/* A top-level list has no Back; detail screens add leading={{ icon: "icon-chevron-left-line-medium", label: "Orders", onClick }}. */}
      <TopNavigation title="Orders" trailing={[{ icon: "icon-plus-line", label: "New order", onClick: () => toast({ title: "Draft order created" }) }]} />
      <Stack gap="md" padding="md">
        <Search aria-label="Search orders" placeholder="Search orders" value={query} onValueChange={setQuery} />
        <Stack direction="row" gap="xs">
          <Chip variant="advanced" dropdown selected={status !== "all"} aria-haspopup="dialog" onClick={() => setSheet("status")}>{statuses.find((item) => item.id === status)?.label ?? "Status"}</Chip>
          <Chip variant="advanced" dropdown selected={sort !== "newest"} aria-haspopup="dialog" onClick={() => setSheet("sort")}>{sorts.find((item) => item.id === sort)?.label}</Chip>
        </Stack>
        <Text textStyle="Body/Small/Regular" tone="base">{plural(shown.length, "order")}</Text>
        {shown.length ? (
          <List aria-label="Orders">
            {shown.map((order) => (
              <ListItem key={order.id} title={order.title} caption={`${order.caption} · ${order.date}`} selected={opened === order.id} onClick={() => setOpened(order.id)}
                trailing={<Badge size="small" theme={badgeTheme[order.status as keyof typeof badgeTheme]} background="subtle">{order.status[0].toUpperCase() + order.status.slice(1)}</Badge>} />
            ))}
          </List>
        ) : (
          <EmptyState title="No orders match" illustration={false} icon="icon-search-medium-line" secondaryAction={{ label: "Clear filters", onClick: () => { setStatus("all"); setQuery(""); } }}>
            Try another status or search.
          </EmptyState>
        )}
      </Stack>

      <BottomSheet type="action" title="Status" open={sheet === "status"} onOpenChange={(open) => setSheet(open ? "status" : null)}
        items={statuses} selectedId={status} onSelect={(item) => setStatus(item.id)} />
      <BottomSheet type="action" title="Sort by" open={sheet === "sort"} onOpenChange={(open) => setSheet(open ? "sort" : null)}
        items={sorts} selectedId={sort} onSelect={(item) => setSort(item.id)} />
    </Stack>
  );
}

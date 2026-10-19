/* App Shell examples · b-desktop-1: built from Figma ◇ Master-Layout · Example (15902:109717), section
   "B · Desktop structures by domain" (15907:119279): B1 Top-nav Storefront (15907:119280), B2 Rail + List-Detail
   (15911:4944) and B3 Top-bar Analytics (15913:5643). Each card is the Figma screen's Pattern/AppShell/Desktop instance
   with its content: the same components, copy and numbers, read from the node dumps. One elevation per screen (none:
   these three are flat), no gradients, one mode. */
import { useEffect, useLayoutEffect, useState } from "react";
import { Accordion } from "../../../../components/Accordion";
import { AppShell, AppShellAccount, AppShellAction, AppShellHeader, AppShellPane } from "../../../../components/AppShell";
import { Avatar, type AvatarTheme } from "../../../../components/Avatar";
import { Badge, BadgeCounter } from "../../../../components/Badge";
import { Button, IconButton } from "../../../../components/Button";
import { ChartCard, DonutChart, LineChart, type ChartPoint, type ChartSlice } from "../../../../components/Chart";
import { ChatComposer, ChatDateDivider, ChatMessage, ChatThread, type ChatPerson, type ChatReplyTarget } from "../../../../components/Chat";
import { Checkbox } from "../../../../components/Checkbox";
import { Chip } from "../../../../components/Chip";
import { ChipGroup } from "../../../../components/ChipGroup";
import { DescriptionList } from "../../../../components/DescriptionList";
import { Divider } from "../../../../components/Divider";
import { Icon } from "../../../../components/Icon";
import { Image } from "../../../../components/Image";
import { Box, Grid, Stack } from "../../../../components/Layout";
import { List, ListItem } from "../../../../components/ListItem";
import { Menu } from "../../../../components/Menu";
import { MetricCard } from "../../../../components/MetricWidget";
import { PageHeader } from "../../../../components/PageHeader";
import { Search } from "../../../../components/Search";
import { Segmented } from "../../../../components/Segmented";
import { SidePanel } from "../../../../components/SidePanel";
import { Sidebar, SidebarMenuItem, type SidebarSection } from "../../../../components/Sidebar";
import { Tabs } from "../../../../components/Tabs";
import { Heading, Text } from "../../../../components/Text";
import { useToast } from "../../../../components/Toast";
import { VisuallyHidden } from "../../../../components/VisuallyHidden";
import { useChatDemo } from "../../../chatDemo";
import { PreviewAppFrame, StudioLogo } from "../../../PlatformFrames";
import { platformMedia, type PlatformPhoto } from "../../../PlatformMedia";
import { formatCompactMoney, formatMoney, me, studio } from "../../data";
import type { ExampleDef } from "../../types";

// ——— Shared parts ——————————————————————————————————————————————————————————————————————————————————————————————
/** The brand at the start of a top bar: Figma Brand = Avatar/Single Square Small Neutral Solid + the name in Heading/4. */
function Brand({ initial, name }: { initial: string; name: string }) {
  return (
    // Hug: the brand keeps its width beside the Tabs, which scroll when the row is short.
    <Stack direction="row" gap="xs" align="center" width="hug">
      <Avatar size="sm" shape="square" theme="neutral" background="solid" alt="">{initial}</Avatar>
      <Text as="span" textStyle="Heading/4">{name}</Text>
    </Stack>
  );
}

/** The account button at the end of the top row, in its menu (Profile, Settings, Sign out). */
function AccountMenu() {
  const { toast } = useToast();
  return (
    <Menu align="end" trigger={<AppShellAccount name={me.name} src={me.photo} />} items={[
      { id: "profile", label: "Profile", icon: "icon-user-circle-line", onSelect: () => toast({ title: me.name, children: "Your profile opens here." }) },
      { id: "settings", label: "Settings", icon: "icon-settings-01-line", onSelect: () => toast({ title: "Settings", children: "Notifications, security and billing." }) },
      { type: "separator" },
      { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line", onSelect: () => toast({ title: "Signed out", children: "See you soon." }) },
    ]} />
  );
}

const fits = (shell: string, domains: string[]) => ` Shell: ${shell}. Fits: ${domains.join(", ")}.`;

// ——— B1 · Top-nav storefront (Layout=Top-Bar, Canvas/Flat) ——————————————————————————————————————————————————————
type Product = { id: string; name: string; colour: string; price: number; was?: number; off?: string; tags: string[]; photo: PlatformPhoto };
const shoes = platformMedia.products;
/* Figma B1's grid, in its order (Sort: Newest), with the photo each Figma tile holds. */
const products: Product[] = [
  { id: "urbas-offwhite", name: "Urbas Love+ Slip On", colour: "Offwhite", price: 42, was: 49, off: "-15%", tags: ["lifestyle", "vegan"], photo: shoes.offwhite },
  { id: "urbas-sand", name: "Urbas Love+ Slip On", colour: "Warm Sand", price: 49, tags: ["lifestyle", "vegan"], photo: shoes.sand },
  { id: "vintas-soda", name: "Vintas Soda Pop High", colour: "Red Violet", price: 58, tags: ["high-tops", "lifestyle"], photo: shoes.redViolet },
  { id: "track-classic", name: "Track 6 Classic Low", colour: "Blue Ash", price: 62, was: 72, off: "-14%", tags: ["running"], photo: shoes.silver },
  { id: "pattas-olive", name: "Pattas Polka Low", colour: "Olive", price: 45, tags: ["lifestyle", "vegan"], photo: shoes.olive },
  { id: "basas-gum", name: "Basas Bumper Gum", colour: "Black Gum", price: 39, tags: ["lifestyle"], photo: shoes.black },
  { id: "vintas-mister", name: "Vintas Mister Hi", colour: "Ivory", price: 54, tags: ["high-tops"], photo: shoes.navy },
  { id: "track-earth", name: "Track 6 Earth", colour: "Mud Brown", price: 66, tags: ["running", "vegan"], photo: shoes.cap },
];
const departments = [
  { id: "new", label: "New in", title: "New arrivals" },
  { id: "women", label: "Women", title: "Women" },
  { id: "men", label: "Men", title: "Men" },
  { id: "kids", label: "Kids", title: "Kids" },
  { id: "sale", label: "Sale", title: "Sale" },
];
const quickFilters = [
  { value: "all", label: "All" },
  { value: "running", label: "Running" },
  { value: "lifestyle", label: "Lifestyle" },
  { value: "high-tops", label: "High-tops" },
  { value: "under-80", label: "Under $80" },
  { value: "vegan", label: "Vegan" },
];
const sorts = [
  { id: "newest", label: "Newest" },
  { id: "price-low", label: "Price: low to high" },
  { id: "price-high", label: "Price: high to low" },
];
/* The filter rail: Category open (Figma Expanded=Yes, Sneakers and Slip-ons ticked), the others closed. */
const filterGroups = [
  { id: "category", title: "Category", options: ["Sneakers", "Boots", "Sandals", "Slip-ons", "Accessories"] },
  { id: "size", title: "Size", options: ["EU 38", "EU 39", "EU 40", "EU 41", "EU 42", "EU 43"] },
  { id: "colour", title: "Colour", options: ["Black", "White", "Beige", "Red", "Blue", "Olive"] },
  { id: "price", title: "Price", options: ["Under $50", "$50 – $80", "Over $80"] },
  { id: "rating", title: "Rating", options: ["4 stars and up", "3 stars and up"] },
];
const dollars = (amount: number) => `$${amount}`;

function ProductTile({ product }: { product: Product }) {
  return (
    <Stack as="li" gap="sm">
      <Image src={product.photo.src} alt="" ratio="1:1" radius="lg" />
      <Stack gap="2xs">
        <Text textStyle="Body/Base/Medium">{product.name}</Text>
        <Text textStyle="Body/Small/Regular" tone="light">{product.colour}</Text>
        <Stack direction="row" gap="xs" align="center">
          <Text as="span" textStyle="Body/Base/Bold">{dollars(product.price)}</Text>
          {product.was ? <>
            <Text as="span" textStyle="Body/Small/Regular" tone="light"><VisuallyHidden>Was </VisuallyHidden><del>{dollars(product.was)}</del></Text>
            <Badge size="xs" theme="red" background="solid" leadingIcon={false}>{product.off}</Badge>
          </> : null}
        </Stack>
      </Stack>
    </Stack>
  );
}

function StorefrontApp() {
  const { toast } = useToast();
  const [department, setDepartment] = useState("new");
  const [query, setQuery] = useState("");
  const [quick, setQuick] = useState("all");
  const [sort, setSort] = useState("newest");
  const [ticked, setTicked] = useState<Record<string, boolean>>({ "category:Sneakers": true, "category:Slip-ons": true });
  const shown = products
    .filter((product) => quick === "all" || (quick === "under-80" ? product.price < 80 : product.tags.includes(quick)))
    .sort((a, b) => (sort === "price-low" ? a.price - b.price : sort === "price-high" ? b.price - a.price : 0));
  const title = departments.find((item) => item.id === department)?.title ?? "New arrivals";
  const sortLabel = sorts.find((item) => item.id === sort)?.label ?? "Newest";
  return (
    <PreviewAppFrame>
      {/* Top-Bar on Canvas/Flat: no Sidebar, the catalogue is the navigation. The header keeps only its top row
          (Figma Main=false): the brand and a Subtle Tab-Bar, then Search and the shopper's actions. */}
      <AppShell pattern="top-bar" canvas="flat"
        header={(
          <AppShellHeader
            leading={(
              <Stack direction="row" gap="xl" align="center">
                <Brand initial="N" name="Northwind" />
                <Tabs variant="subtle" aria-label="Departments" value={department} onValueChange={setDepartment}
                  items={departments.map(({ id, label }) => ({ id, label }))} />
              </Stack>
            )}
            actions={<>
              <Box width={280}><Search placeholder="Search shoes, bags, brands" aria-label="Search the store" value={query} onValueChange={setQuery} /></Box>
              <AppShellAction icon="icon-heart-line" aria-label="Wishlist" onClick={() => toast({ title: "Your wishlist is empty", children: "Save a product to keep it here." })} />
              <AppShellAction icon="icon-shopping-bag-01-line" aria-label="Bag" count={2} onClick={() => toast({ title: "2 items in your bag", children: "Basas Bumper Gum · Track 6 Earth" })} />
              <AccountMenu />
            </>}
          />
        )}
      >
        {/* The page title row comes first, so the outline starts at the h1 and the filter rail's h2 sits under it; then
            the catalogue: the filter rail (240) beside the results, Gap/XLarge apart, one ladder step more than the
            results' own Gap/Large (usage rules §13; Figma draws 48, no ladder step). In a narrow window the rail stacks
            above the results and the grid keeps two columns. */}
        <Stack gap="xl">
          <Stack direction="row" gap="md" align="center" justify="between" wrap>
            <Stack direction="row" gap="sm" align="center">
              <Heading level={1} textStyle="Display/3">{title}</Heading>
              {/* zen-allow-counter-cap: a result total, shown in full as Figma's 960 (not an unread count). */}
              <BadgeCounter size="md" theme="neutral" background="solid" value={960} />
            </Stack>
            <Chip variant="advanced" level="secondary" size="md" popoverLabel="Sort by"
              popoverItems={sorts.map((item) => ({ id: item.id, label: item.label, selected: item.id === sort }))}
              onPopoverSelect={(item) => setSort(item.id)}>
              {`Sort: ${sortLabel}`}
            </Chip>
          </Stack>
          <Grid columns="240px minmax(0, 1fr)" gap="xl" align="start" stackBelow={640}>
            <Stack as="aside" gap="md" aria-label="Filters">
              <Stack gap="2xs">
                <Heading level={2} textStyle="Heading/Subheading">Filters</Heading>
                <Text textStyle="Body/Small/Regular" tone="light">960 results</Text>
              </Stack>
              <Stack gap="none">
                {filterGroups.map((group) => (
                  <Accordion key={group.id} title={group.title} size="sm" theme="divider" contentWidth="full" defaultExpanded={group.id === "category"}>
                    <Stack gap="sm">
                      {group.options.map((option) => {
                        const key = `${group.id}:${option}`;
                        return <Checkbox key={key} label={option} checked={Boolean(ticked[key])} onCheckedChange={(checked) => setTicked((all) => ({ ...all, [key]: checked }))} />;
                      })}
                    </Stack>
                  </Accordion>
                ))}
              </Stack>
            </Stack>
            <Stack gap="lg">
              <ChipGroup aria-label="Quick filters" size="md" level="secondary" options={quickFilters} value={quick} onValueChange={setQuick} />
              {/* Product-Grid: 4 columns (2 on a phone), 24 across and 32 down; products have no box, only a Pale image tile. */}
              <Grid as="ul" columns={{ mobile: 2, desktop: 4 }} columnGap="lg" rowGap="xl" aria-label={`${title}, sorted by ${sortLabel.toLowerCase()}`}>
                {shown.map((product) => <ProductTile key={product.id} product={product} />)}
              </Grid>
            </Stack>
          </Grid>
        </Stack>
      </AppShell>
    </PreviewAppFrame>
  );
}

// ——— B2 · Rail and list-detail (Layout=List-Detail, Collapse=Sidebar, Side-Panel) ———————————————————————————————
type Message = { id: string; kind: "time"; label: string } | { id: string; kind: "message"; side: "you" | "others"; text: string; replyTo?: ChatReplyTarget };
type Conversation = {
  id: string; name: string; theme: AvatarTheme; subject: string; preview: string; time: string; unread?: boolean; mine?: boolean;
  email: string; city: string; plan: string; vip?: boolean; since: string; value: string; lastOrder: string;
  tickets: { id: string; title: string; caption: string }[]; thread: Message[];
};
const say = (id: string, side: "you" | "others", text: string): Message => ({ id, kind: "message", side, text });
const stamp = (id: string, label: string): Message => ({ id, kind: "time", label });
/* Figma B2's queue, newest first. Lia's conversation is the one open in Figma; the others open on their last message. */
const conversations: Conversation[] = [
  {
    id: "lia", name: "Lia Campbell", theme: "violet", subject: "Refund still pending", preview: "Refund for order #10428 still pending", time: "2m", mine: true,
    email: "lia@northwind.io", city: "Lisbon", plan: "Pro plan", vip: true, since: "Mar 2022", value: "$2,480", lastOrder: "#10428 · Sep 30",
    tickets: [{ id: "t1", title: "Wrong size delivered", caption: "Resolved · Aug 12" }, { id: "t2", title: "Change delivery address", caption: "Resolved · Jun 03" }],
    thread: [
      stamp("s1", "Today 09:12"),
      say("m1", "others", "Hi, I returned the sneakers last week but the refund has not arrived yet."),
      say("m2", "others", "Order #10428, paid with Visa ending 42."),
      stamp("s2", "10:05"),
      say("m3", "you", "Hi Lia, thanks for the order number. I can see the return reached our warehouse on Monday."),
      say("m4", "you", "The refund was approved today; it shows on your card within 3–5 business days."),
      stamp("s3", "10:21"),
      say("m5", "others", "Great, thank you for checking!"),
    ],
  },
  {
    id: "john", name: "John McLeod", theme: "blue", subject: "Move the kickoff", preview: "Can we move the kickoff to Thursday?", time: "14m", unread: true,
    email: "john@mcleod.studio", city: "Glasgow", plan: "Team plan", since: "Jan 2024", value: "$1,120", lastOrder: "#10391 · Sep 18",
    tickets: [], thread: [stamp("s1", "Today 10:09"), say("m1", "others", "Can we move the kickoff to Thursday?")],
  },
  {
    id: "paul", name: "Paul Rivera", theme: "green", subject: "Export fixed", preview: "Thanks! The export works now.", time: "1h", mine: true,
    email: "paul@riveracoffee.co", city: "Austin", plan: "Pro plan", since: "Jul 2023", value: "$860", lastOrder: "#10322 · Sep 02",
    tickets: [], thread: [stamp("s1", "Today 09:23"), say("m1", "others", "Thanks! The export works now.")],
  },
  {
    id: "sarah", name: "Sarah Kim", theme: "orange", subject: "Invoice address", preview: "Invoice address needs an update", time: "3h",
    email: "sarah@kimstudio.kr", city: "Seoul", plan: "Starter plan", since: "May 2025", value: "$310", lastOrder: "#10377 · Sep 14",
    tickets: [], thread: [stamp("s1", "Today 07:23"), say("m1", "others", "Invoice address needs an update")],
  },
  {
    id: "aiden", name: "Aiden Nguyen", theme: "cyan", subject: "Two seats added", preview: "Two seats added to the Team plan", time: "Yesterday", unread: true,
    email: "aiden@lumen.vn", city: "Hanoi", plan: "Team plan", since: "Nov 2023", value: "$1,940", lastOrder: "#10402 · Sep 22",
    tickets: [], thread: [stamp("s1", "Yesterday 16:40"), say("m1", "others", "Two seats added to the Team plan")],
  },
  {
    id: "maya", name: "Maya Thompson", theme: "pink", subject: "Login link expired", preview: "Login link expired again", time: "Mon", mine: true,
    email: "maya@thompsonlaw.ca", city: "Toronto", plan: "Pro plan", since: "Feb 2022", value: "$2,050", lastOrder: "#10355 · Sep 08",
    tickets: [], thread: [stamp("s1", "Mon 11:05"), say("m1", "others", "Login link expired again")],
  },
  {
    id: "ethan", name: "Ethan Kim", theme: "teal", subject: "Dark mode on mobile", preview: "Feature request: dark mode on mobile", time: "Sun",
    email: "ethan@kimrun.app", city: "Busan", plan: "Starter plan", since: "Aug 2025", value: "$140", lastOrder: "#10360 · Sep 10",
    tickets: [], thread: [stamp("s1", "Sun 18:30"), say("m1", "others", "Feature request: dark mode on mobile")],
  },
];
const inboxSections: SidebarSection[] = [{ items: [
  { id: "inbox", label: "Inbox", icon: "ic-inbox-01-line" },
  { id: "chats", label: "Chats", icon: "icon-message-chat-circle-line" },
  { id: "customers", label: "Customers", icon: "icon-user-circle-line" },
  { id: "reports", label: "Reports", icon: "icon-bar-chart-up-line" },
  { id: "files", label: "Files", icon: "icon-folder-line" },
  { id: "settings", label: "Settings", icon: "icon-settings-01-line" },
] }];
const inboxViews = [{ id: "all", label: "All" }, { id: "unread", label: "Unread" }, { id: "mine", label: "Mine" }];
const initialsOf = (name: string) => name.split(" ").map((part) => part[0]).join("").slice(0, 2);
/* The Side-Panel docks while the page keeps a Tablet width (744) beside the rail (80) and the panel (360): from 1184. */
const DOCK_MIN_WIDTH = 80 + 360 + 744;

/** The window's width, kept current: the customer panel starts open only where it docks (Figma's 1512 screen). */
function useFrameWidth() {
  const [frame, setFrame] = useState<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    if (!frame) return undefined;
    setWidth(frame.offsetWidth);
    const observer = new ResizeObserver(() => setWidth(frame.offsetWidth));
    observer.observe(frame);
    return () => observer.disconnect();
  }, [frame]);
  return [setFrame, width] as const;
}

function SupportInboxApp() {
  const { toast } = useToast();
  const [openId, setOpenId] = useState("lia");
  const [view, setView] = useState("all");
  const [query, setQuery] = useState("");
  const [threads, setThreads] = useState<Record<string, Message[]>>(() => Object.fromEntries(conversations.map((item) => [item.id, item.thread])));
  const [resolved, setResolved] = useState<Record<string, boolean>>({});
  // The customer's facts: open by default where the panel docks; in a narrower window they open on demand (as a modal).
  const [frameRef, frameWidth] = useFrameWidth();
  const [panelChoice, setPanelChoice] = useState<boolean | null>(null);
  const panelOpen = panelChoice ?? frameWidth >= DOCK_MIN_WIDTH;
  const q = query.trim().toLowerCase();
  const shown = conversations.filter((item) => (view === "unread" ? item.unread : view === "mine" ? item.mine : true)
    && (!q || `${item.name} ${item.preview}`.toLowerCase().includes(q)));
  const open = conversations.find((item) => item.id === openId) ?? conversations[0];
  const thread = threads[open.id] ?? [];
  const author: ChatPerson = { name: open.name, theme: open.theme };
  const done = Boolean(resolved[open.id]);
  const first = open.name.split(" ")[0];
  const resolve = (next: boolean) => {
    setResolved((all) => ({ ...all, [open.id]: next }));
    if (next) toast({ title: `${first}’s conversation resolved`, action: { label: "Undo", onClick: () => setResolved((all) => ({ ...all, [open.id]: false })) } });
  };
  // Every message can be held, hovered, replied to and reacted to (the platform's chat demo wiring); what an action
  // did shows as a toast.
  const chat = useChatDemo();
  useEffect(() => { if (chat.note) toast({ title: chat.note }); }, [chat.note, toast]);
  const send = (text: string) => {
    const replyTo = chat.takeReply();
    setThreads((all) => ({ ...all, [open.id]: [...(all[open.id] ?? []), { ...say(`sent-${Date.now()}`, "you", text), replyTo }] }));
  };
  const visible = thread.filter((item) => item.kind === "time" || !chat.isDeleted(`${open.id}-${item.id}`));
  const lastYou = [...visible].reverse().find((item) => item.kind === "message" && item.side === "you");
  const pageHeader = (
    <PageHeader title={open.subject} meta={done ? <Badge theme="green" background="subtle">Resolved</Badge> : undefined}
      actions={<>
        <Button level="tertiary" startIcon="icon-user-plus-line" onClick={() => toast({ title: `Assigned to ${me.name}`, children: open.subject })}>Assign</Button>
        {done
          ? <Button level="tertiary" onClick={() => resolve(false)}>Reopen</Button>
          : <Button level="primary" startIcon="icon-check-line" onClick={() => resolve(true)}>Resolve</Button>}
      </>}
      trailing={(
        <Menu align="end" trigger={<IconButton level="tertiary" icon="icon-dots-vertical-line" aria-label="Conversation actions" />} items={[
          { id: "details", label: panelOpen ? "Hide customer details" : "Show customer details", icon: "icon-user-circle-line", onSelect: () => setPanelChoice(!panelOpen) },
          { id: "snooze", label: "Snooze until tomorrow", icon: "icon-clock-line", onSelect: () => toast({ title: "Snoozed until tomorrow, 9:00" }) },
          { id: "unread", label: "Mark as unread", icon: "icon-mail-01-line", onSelect: () => toast({ title: "Marked as unread" }) },
          { id: "spam", label: "Mark as spam", icon: "icon-slash-circle-01-line", onSelect: () => toast({ title: "Moved to spam" }) },
        ]} />
      )} />
  );
  return (
    <PreviewAppFrame frameRef={frameRef}>
      {/* List-Detail on Canvas/Default: the Sidebar sits on its rail with the toggle in its own header (Collapse=Sidebar),
          the queue is the Leading-Pane (a flat white tile, never shadowed), the open conversation is the main column
          under its header, and the customer's facts are the docked Side-Panel (Standard, Small 360). */}
      <AppShell pattern="list-detail" collapse="sidebar"
        sidebar={(
          <Sidebar logo={<StudioLogo src={studio.logo} name="Northwind Support" />} logoCollapsed={<Avatar size="sm" shape="square" theme="photo" src={studio.logo} alt="Northwind Support" />}
            sections={inboxSections} selectedId="inbox" footer={<SidebarMenuItem id="preferences" label="Preferences" icon="icon-settings-01-line" />} />
        )}
        leadingPane={(
          <AppShellPane theme="flat" title={<>Inbox <BadgeCounter theme="neutral" background="solid" value={12} /></>}
            action={<IconButton level="tertiary" size="sm" icon="icon-edit-01-line" aria-label="New conversation" onClick={() => toast({ title: "New conversation", children: "Pick a customer or type an email address." })} />}>
            <Stack paddingX="xs" gap="sm">
              <Search theme="filter-icon" placeholder="Search conversations" aria-label="Search conversations" value={query} onValueChange={setQuery}
                filterActionLabel="Filter conversations" onFilterClick={() => toast({ title: "Filters", children: "Channel, status, tags and assignee." })} />
              <Segmented fullWidth aria-label="Conversations" options={inboxViews} value={view} onValueChange={setView} />
            </Stack>
            <List aria-label="Conversations">
              {shown.map((item) => (
                <ListItem key={item.id} selected={item.id === open.id} title={item.name} caption={item.preview}
                  leading={<Avatar size="md" theme={item.theme} background="subtle" alt="">{initialsOf(item.name)}</Avatar>}
                  trailing={<Text as="span" textStyle="Caption/Regular" tone="light">{item.time}</Text>}
                  onClick={() => setOpenId(item.id)} />
              ))}
            </List>
          </AppShellPane>
        )}
        header={(
          // Header/AppShell with its Main row only (Top-Header off): the conversation's title and actions, then a rule.
          <AppShellHeader main={pageHeader} sections={<Divider />} />
        )}
        sidePanel={(
          <SidePanel type="standard" size="small" open={panelOpen} onOpenChange={setPanelChoice} title={open.name} description={`${open.email} · ${open.city}`}
            headerContent={(
              <Stack direction="row" gap="2xs">
                {open.vip ? <Badge size="sm" theme="violet" background="solid" leadingIcon={false}>VIP</Badge> : null}
                <Badge size="sm" theme="neutral" background="solid" leadingIcon={false}>{open.plan}</Badge>
              </Stack>
            )}>
            <Stack gap="lg">
              <Stack gap="sm">
                <Text textStyle="All-Caps/S" tone="light">Details</Text>
                <DescriptionList layout="inline" divider items={[
                  { term: "Customer since", description: open.since },
                  { term: "Lifetime value", description: open.value },
                  { term: "Last order", description: open.lastOrder },
                ]} />
              </Stack>
              <Stack gap="xs">
                <Text textStyle="All-Caps/S" tone="light">Recent tickets</Text>
                {open.tickets.length ? (
                  <List aria-label="Recent tickets">
                    {open.tickets.map((ticket) => (
                      <ListItem key={ticket.id} title={ticket.title} caption={ticket.caption}
                        trailing={<Icon name="icon-chevron-right-line-medium" size="base" decorative />}
                        onClick={() => toast({ title: ticket.title, children: ticket.caption })} />
                    ))}
                  </List>
                ) : <Text textStyle="Body/Small/Regular" tone="base">No earlier tickets.</Text>}
              </Stack>
            </Stack>
          </SidePanel>
        )}
      >
        {/* The thread from the top, the composer at the foot of the column. */}
        <Stack height="fill" gap="md" justify="between">
          <ChatThread device="desktop" aria-label={`Messages with ${open.name}`}>
            {visible.map((item, index) => {
              if (item.kind === "time") return <ChatDateDivider key={item.id}>{item.label}</ChatDateDivider>;
              const next = visible[index + 1];
              const sameRun = next?.kind === "message" && next.side === item.side;
              return (
                <ChatMessage key={item.id} {...chat.act(`${open.id}-${item.id}`, item.side, { text: item.text, author: first })} side={item.side}
                  author={item.side === "others" ? author : undefined} replyTo={item.replyTo}
                  continued={item.side === "others" && sameRun} status={item === lastYou ? "Sent" : undefined}>
                  {item.text}
                </ChatMessage>
              );
            })}
          </ChatThread>
          {/* Figma rounds this screen's Chat-Control into a pill (Corner-Radius/Rounded on the instance); a reply bar on top
              keeps the 2XLarge corners. */}
          <Box radius={chat.composerReply.replyTo ? "2xl" : "full"} clip>
            <ChatComposer device="desktop" label={`Reply to ${open.name}`} onSend={send} {...chat.composerReply} actions={chat.composerActions} onEmoji={chat.onEmoji} />
          </Box>
        </Stack>
      </AppShell>
    </PreviewAppFrame>
  );
}

// ——— B3 · Top-bar analytics (Layout=Top-Bar, Canvas/Alt) ———————————————————————————————————————————————————————
const sections = [
  { id: "overview", label: "Overview" },
  { id: "portfolio", label: "Portfolio" },
  { id: "markets", label: "Markets" },
  { id: "transfers", label: "Transfers" },
  { id: "reports", label: "Reports" },
];
const periods = [{ id: "1d", label: "1D" }, { id: "1w", label: "1W" }, { id: "1m", label: "1M" }, { id: "1y", label: "1Y" }, { id: "all", label: "All" }];
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const weeks = ["W29", "W30", "W31", "W32", "W33", "W34", "W35", "W36", "W37", "W38", "W39", "W40"];
const pointsOf = (labels: string[], values: number[]): ChartPoint[] => labels.map((label, index) => ({ label, value: values[index] }));
/* Figma's Multi-Line-Chart reads Invoiced (the line) against Collected (dashed), Q4 at $25.9K · $22.8K. */
const netWorth: Record<string, { points: ChartPoint[]; compare: number[]; span: string }> = {
  quarterly: { span: "Q1 – Q4 2026", points: pointsOf(["Q1", "Q2", "Q3", "Q4"], [8600, 19400, 17200, 25900]), compare: [4100, 14900, 13800, 22800] },
  monthly: {
    span: "Jan – Dec 2026",
    points: pointsOf(months, [7400, 6100, 8600, 12900, 15800, 19400, 14200, 16100, 17200, 15600, 21300, 25900]),
    compare: [3600, 2900, 4100, 8800, 12100, 14900, 10900, 12600, 13800, 11900, 17400, 22800],
  },
  weekly: {
    span: "the last 12 weeks",
    points: pointsOf(weeks, [14800, 15200, 16100, 15700, 16900, 17200, 18800, 19600, 21400, 22900, 24600, 25900]),
    compare: [11300, 11900, 12800, 12200, 13500, 13800, 15200, 16400, 18100, 19800, 21500, 22800],
  },
};
const netWorthRanges = [{ id: "quarterly", label: "Quarterly" }, { id: "monthly", label: "Monthly" }, { id: "weekly", label: "Weekly" }];
/* Figma's Allocation legend and shares: 30 · 23 · 18 · 17 · 12% of $296.8K in Q3. */
const allocation: Record<string, ChartSlice[]> = {
  q3: [
    { id: "lumen", label: "Lumen Bank", value: 89040 },
    { id: "phin", label: "Phin & Co", value: 68264 },
    { id: "mekong", label: "Mekong Freight", value: 53424 },
    { id: "book-fair", label: "Hanoi Book Fair", value: 50456 },
    { id: "other", label: "Other clients", value: 35616 },
  ],
  ytd: [
    { id: "lumen", label: "Lumen Bank", value: 241900 },
    { id: "phin", label: "Phin & Co", value: 198400 },
    { id: "mekong", label: "Mekong Freight", value: 151700 },
    { id: "book-fair", label: "Hanoi Book Fair", value: 117300 },
    { id: "other", label: "Other clients", value: 96500 },
  ],
};
const allocationRanges = [{ id: "q3", label: "Q3" }, { id: "ytd", label: "Year to date" }];

function AnalyticsApp() {
  const { toast } = useToast();
  const [section, setSection] = useState("portfolio");
  const [period, setPeriod] = useState("1m");
  const [query, setQuery] = useState("");
  const [range, setRange] = useState("quarterly");
  const [share, setShare] = useState("q3");
  const series = netWorth[range];
  const more = (label: string) => ({ label: `More about ${label.toLowerCase()}`, onClick: () => toast({ title: label, children: "Open the breakdown, set an alert or pin it to Overview." }) });
  return (
    <PreviewAppFrame>
      {/* Top-Bar on Canvas/Alt: few sections, deep content. The navigation is a Large Indicator Tab-Bar in the top
          row, so the page keeps the full width for numbers; the title row holds the Heading/1 title, the period and
          the actions. Boxes are Pale with no shadow; one Subtle Brand Hero Metric-Card leads. */}
      <AppShell pattern="top-bar" canvas="alt"
        header={(
          <AppShellHeader
            leading={(
              <Stack direction="row" gap="xl" align="center">
                <Brand initial="F" name="Finlytics" />
                <Tabs size="lg" aria-label="Sections" value={section} onValueChange={setSection} items={sections} />
              </Stack>
            )}
            actions={<>
              <Box width={240}><Search placeholder="Search tickers, accounts" aria-label="Search tickers and accounts" value={query} onValueChange={setQuery} /></Box>
              <AppShellAction icon="icon-bell-01-solid" aria-label="Notifications" count={8} onClick={() => toast({ title: "8 notifications", children: "3 dividends paid · 5 price alerts" })} />
              <AccountMenu />
            </>}
            main={(
              <PageHeader title={sections.find((item) => item.id === section)?.label ?? "Portfolio"} description="All accounts · updated 2 minutes ago"
                actions={<>
                  <Segmented aria-label="Period" options={periods} value={period} onValueChange={setPeriod} />
                  <Button level="tertiary" startIcon="icon-download-01-line" onClick={() => toast({ title: "Export ready", children: "Portfolio, all accounts · CSV" })}>Export</Button>
                  <Button level="primary" startIcon="icon-plus-line" onClick={() => toast({ title: "Add funds", children: "From a linked bank account or a card." })}>Add funds</Button>
                </>} />
            )}
          />
        )}
      >
        <Stack gap="lg">
          <Grid columns="400px 1fr" stackBelow={720} gap="md">
            <MetricCard type="hero" theme="subtle" color="brand" label="Total balance" value="$248,930"
              trend={{ direction: "positive", label: "+4.2% this month" }} format={formatCompactMoney}
              series={[212400, 214800, 213900, 219200, 222600, 221100, 227900, 229400, 236200, 239800, 244300, 248930]}
              subAction={more("Total balance")}
              footer={<Button size="sm" level="tertiary" onClick={() => toast({ title: "Statement for September", children: "PDF · all accounts" })}>View statement</Button>} />
            <ChartCard theme="pale" color="neutral" headingLevel={2} title="Net worth vs. invested" description="All accounts · this year" value="$248.9k"
              onOpen={() => toast({ title: "Net worth report", children: "Opens with this year selected." })} openLabel="Open net worth report"
              ranges={netWorthRanges} range={range} onRangeChange={setRange}>
              <LineChart key={range} aria-label={`Invoiced and collected, ${series.span}`} data={series.points} label="Invoiced"
                compare={{ label: "Collected", values: series.compare }} legendPosition="top" format={formatCompactMoney} height={184} />
            </ChartCard>
          </Grid>
          <Grid columns="400px 1fr 1fr 1fr" stackBelow={720} gap="md">
            <ChartCard theme="pale" color="neutral" headingLevel={2} icon="icon-pie-chart-01-line" title="Allocation"
              ranges={allocationRanges} range={share} onRangeChange={setShare}>
              <DonutChart key={share} aria-label={`Allocation, ${share === "q3" ? "Q3 2026" : "2026 to date"}`} data={allocation[share]}
                size="small" legendPosition="start" format={formatCompactMoney} />
            </ChartCard>
            <MetricCard type="sparkline" theme="pale" color="neutral" label="Cash" value="$32,410" trend={{ direction: "positive", label: "+1.1% vs. Aug" }}
              series={[29800, 30100, 29950, 30600, 31000, 30800, 31500, 31400, 31900, 32050, 32410]} format={formatCompactMoney} subAction={more("Cash")} />
            <MetricCard type="spark-bars" theme="pale" color="neutral" label="Monthly spend" value="$4,862" trend={{ direction: "positive", label: "-6% vs. Aug" }}
              series={[4100, 4400, 4300, 4700, 4200, 4900, 4600, 4800, 4400, 5000, 5170, 4862]} format={formatCompactMoney} subAction={more("Monthly spend")} />
            <MetricCard type="sparkline" theme="pale" color="neutral" label="Dividends YTD" value={formatMoney(1284)} trend={{ direction: "positive", label: "+12% vs. 2025" }}
              series={[620, 680, 710, 760, 820, 870, 940, 1010, 1080, 1150, 1210, 1284]} format={formatCompactMoney} subAction={more("Dividends YTD")} />
          </Grid>
        </Stack>
      </AppShell>
    </PreviewAppFrame>
  );
}

export const examples: ExampleDef[] = [
  {
    title: "B1 · Top-nav storefront",
    description: "No sidebar: the catalogue is the navigation. The AppShell top bar holds the brand, a Subtle Tab-Bar, Search and the actions; its title row is off, so the Display/3 page title heads the content, above a filter rail of Accordions beside a 4-column product grid (the rail stacks above two columns in a narrow window). Products have no box: Pale image tiles on a flat white canvas."
      + fits("AppShell/Desktop · Layout=Top-Bar", ["E-commerce", "Marketplace", "Booking", "Media catalogue"]),
    wide: true,
    screen: true,
    render: () => <StorefrontApp />,
    code: `<AppShell
  pattern="top-bar"
  canvas="flat"
  header={
    <AppShellHeader
      leading={
        <Stack direction="row" gap="xl" align="center">
          <Stack direction="row" gap="xs" align="center">
            <Avatar size="sm" shape="square" theme="neutral" background="solid" alt="">N</Avatar>
            <Text as="span" textStyle="Heading/4">Northwind</Text>
          </Stack>
          <Tabs variant="subtle" aria-label="Departments" value={department} onValueChange={setDepartment} items={departments} />
        </Stack>
      }
      actions={<>
        <Box width={280}><Search placeholder="Search shoes, bags, brands" aria-label="Search the store" value={query} onValueChange={setQuery} /></Box>
        <AppShellAction icon="icon-heart-line" aria-label="Wishlist" onClick={openWishlist} />
        <AppShellAction icon="icon-shopping-bag-01-line" aria-label="Bag" count={2} onClick={openBag} />
        <Menu align="end" trigger={<AppShellAccount name="Alex Duong" src={alex.photo} />} items={accountItems} />
      </>}
    />
  }
>
  <Stack gap="xl">
    <Stack direction="row" gap="md" align="center" justify="between" wrap>
      <Stack direction="row" gap="sm" align="center">
        <Heading level={1} textStyle="Display/3">New arrivals</Heading>
        {/* zen-allow-counter-cap: a result total, shown in full. */}
        <BadgeCounter size="md" theme="neutral" background="solid" value={960} />
      </Stack>
      <Chip variant="advanced" level="secondary" size="md" popoverLabel="Sort by" popoverItems={sorts} onPopoverSelect={(item) => setSort(item.id)}>Sort: Newest</Chip>
    </Stack>
    <Grid columns="240px minmax(0, 1fr)" gap="xl" align="start" stackBelow={640}>
      <Stack as="aside" gap="md" aria-label="Filters">
        <Stack gap="2xs">
          <Heading level={2} textStyle="Heading/Subheading">Filters</Heading>
          <Text textStyle="Body/Small/Regular" tone="light">960 results</Text>
        </Stack>
        <Stack gap="none">
          <Accordion title="Category" size="sm" contentWidth="full" defaultExpanded>
            <Stack gap="sm">
              <Checkbox label="Sneakers" checked={sneakers} onCheckedChange={setSneakers} />
              …Boots, Sandals, Slip-ons, Accessories
            </Stack>
          </Accordion>
          <Accordion title="Size" size="sm" contentWidth="full">…</Accordion>
          …Colour, Price, Rating
        </Stack>
      </Stack>
      <Stack gap="lg">
        <ChipGroup aria-label="Quick filters" size="md" level="secondary" options={quickFilters} value={quick} onValueChange={setQuick} />
        <Grid as="ul" columns={{ mobile: 2, desktop: 4 }} columnGap="lg" rowGap="xl" aria-label="New arrivals, sorted by newest">
          {products.map((product) => (
            <Stack as="li" key={product.id} gap="sm">
              <Image src={product.photo.src} alt="" ratio="1:1" radius="lg" />
              <Stack gap="2xs">
                <Text textStyle="Body/Base/Medium">{product.name}</Text>
                <Text textStyle="Body/Small/Regular" tone="light">{product.colour}</Text>
                <Stack direction="row" gap="xs" align="center">
                  <Text as="span" textStyle="Body/Base/Bold">$42</Text>
                  <Text as="span" textStyle="Body/Small/Regular" tone="light"><VisuallyHidden>Was </VisuallyHidden><del>$49</del></Text>
                  <Badge size="xs" theme="red" background="solid" leadingIcon={false}>-15%</Badge>
                </Stack>
              </Stack>
            </Stack>
          ))}
        </Grid>
      </Stack>
    </Grid>
  </Stack>
</AppShell>`,
  },
  {
    title: "B2 · Rail and list-detail",
    description: "Three working panes for queues you triage all day: the Sidebar collapses to its rail, the list sits in the Leading-Pane, the detail is the main column under its header (title and actions) and the customer's facts sit in the Side-Panel. Panes are flat white tiles on the grey canvas, never shadowed."
      + fits("AppShell/Desktop · Layout=List-Detail · Collapse=Sidebar · Side-Panel", ["Support inbox", "Chat / Email", "CRM records", "Ticketing"]),
    wide: true,
    screen: true,
    render: () => <SupportInboxApp />,
    code: `<AppShell
  pattern="list-detail"
  collapse="sidebar"
  sidebar={<Sidebar logo={logo} logoCollapsed={mark} sections={sections} selectedId="inbox" footer={<SidebarMenuItem id="preferences" label="Preferences" icon="icon-settings-01-line" />} />}
  leadingPane={
    <AppShellPane theme="flat" title={<>Inbox <BadgeCounter theme="neutral" background="solid" value={12} /></>}
      action={<IconButton level="tertiary" size="sm" icon="icon-edit-01-line" aria-label="New conversation" onClick={compose} />}>
      <Stack paddingX="xs" gap="sm">
        <Search theme="filter-icon" placeholder="Search conversations" aria-label="Search conversations" value={query} onValueChange={setQuery} onFilterClick={openFilters} />
        <Segmented fullWidth aria-label="Conversations" options={[{ id: "all", label: "All" }, { id: "unread", label: "Unread" }, { id: "mine", label: "Mine" }]} value={view} onValueChange={setView} />
      </Stack>
      <List aria-label="Conversations">
        <ListItem selected title="Lia Campbell" caption="Refund for order #10428 still pending"
          leading={<Avatar size="md" theme="violet" background="subtle" alt="">LC</Avatar>}
          trailing={<Text as="span" textStyle="Caption/Regular" tone="light">2m</Text>} onClick={() => setOpenId("lia")} />
        …John McLeod, Paul Rivera, Sarah Kim, Aiden Nguyen, Maya Thompson, Ethan Kim
      </List>
    </AppShellPane>
  }
  header={
    <AppShellHeader
      main={<PageHeader title="Refund still pending"
        actions={<><Button level="tertiary" startIcon="icon-user-plus-line" onClick={assign}>Assign</Button><Button level="primary" startIcon="icon-check-line" onClick={resolve}>Resolve</Button></>}
        trailing={<Menu align="end" trigger={<IconButton level="tertiary" icon="icon-dots-vertical-line" aria-label="Conversation actions" />} items={moreItems} />} />}
      sections={<Divider />}
    />
  }
  sidePanel={
    <SidePanel type="standard" size="small" open={panelOpen} onOpenChange={setPanelOpen} title="Lia Campbell" description="lia@northwind.io · Lisbon"
      headerContent={<Stack direction="row" gap="2xs"><Badge size="sm" theme="violet" leadingIcon={false}>VIP</Badge><Badge size="sm" theme="neutral" leadingIcon={false}>Pro plan</Badge></Stack>}>
      <Stack gap="lg">
        <Stack gap="sm">
          <Text textStyle="All-Caps/S" tone="light">Details</Text>
          <DescriptionList layout="inline" divider items={[{ term: "Customer since", description: "Mar 2022" }, { term: "Lifetime value", description: "$2,480" }, { term: "Last order", description: "#10428 · Sep 30" }]} />
        </Stack>
        <Stack gap="xs">
          <Text textStyle="All-Caps/S" tone="light">Recent tickets</Text>
          <List aria-label="Recent tickets">
            <ListItem title="Wrong size delivered" caption="Resolved · Aug 12" trailing={<Icon name="icon-chevron-right-line-medium" size="base" decorative />} onClick={openTicket} />
            <ListItem title="Change delivery address" caption="Resolved · Jun 03" trailing={<Icon name="icon-chevron-right-line-medium" size="base" decorative />} onClick={openTicket} />
          </List>
        </Stack>
      </Stack>
    </SidePanel>
  }
>
  <Stack height="fill" gap="md" justify="between">
    <ChatThread device="desktop" aria-label="Messages with Lia Campbell">
      <ChatDateDivider>Today 09:12</ChatDateDivider>
      <ChatMessage side="others" author={lia} continued>Hi, I returned the sneakers last week but the refund has not arrived yet.</ChatMessage>
      <ChatMessage side="others" author={lia}>Order #10428, paid with Visa ending 42.</ChatMessage>
      <ChatDateDivider>10:05</ChatDateDivider>
      <ChatMessage side="you">Hi Lia, thanks for the order number. I can see the return reached our warehouse on Monday.</ChatMessage>
      <ChatMessage side="you" status="Sent">The refund was approved today; it shows on your card within 3–5 business days.</ChatMessage>
      <ChatDateDivider>10:21</ChatDateDivider>
      <ChatMessage side="others" author={lia}>Great, thank you for checking!</ChatMessage>
    </ChatThread>
    <Box radius="full" clip>
      <ChatComposer device="desktop" label="Reply to Lia Campbell" onSend={send} />
    </Box>
  </Stack>
</AppShell>`,
  },
  {
    title: "B3 · Top-bar analytics",
    description: "Few sections, deep content: navigation moves to a Large Indicator Tab-Bar in the AppShell top bar so the page gets the full width for numbers. Boxes are Pale on white with no shadow; the one number that matters is a Solid Hero Metric-Card, one per row. The header's title row carries the Heading/1 title, the Segmented period control and the actions."
      + fits("AppShell/Desktop · Layout=Top-Bar", ["Fintech / Banking", "Trading", "BI dashboards", "Monitoring"]),
    wide: true,
    screen: true,
    render: () => <AnalyticsApp />,
    code: `<AppShell
  pattern="top-bar"
  canvas="alt"
  header={
    <AppShellHeader
      leading={
        <Stack direction="row" gap="xl" align="center">
          <Stack direction="row" gap="xs" align="center">
            <Avatar size="sm" shape="square" theme="neutral" background="solid" alt="">F</Avatar>
            <Text as="span" textStyle="Heading/4">Finlytics</Text>
          </Stack>
          <Tabs size="lg" aria-label="Sections" value={section} onValueChange={setSection} items={sections} />
        </Stack>
      }
      actions={<>
        <Box width={240}><Search placeholder="Search tickers, accounts" aria-label="Search tickers and accounts" value={query} onValueChange={setQuery} /></Box>
        <AppShellAction icon="icon-bell-01-solid" aria-label="Notifications" count={8} onClick={openNotifications} />
        <Menu align="end" trigger={<AppShellAccount name="Alex Duong" src={alex.photo} />} items={accountItems} />
      </>}
      main={<PageHeader title="Portfolio" description="All accounts · updated 2 minutes ago" actions={<>
        <Segmented aria-label="Period" options={periods} value={period} onValueChange={setPeriod} />
        <Button level="tertiary" startIcon="icon-download-01-line" onClick={exportCsv}>Export</Button>
        <Button level="primary" startIcon="icon-plus-line" onClick={addFunds}>Add funds</Button>
      </>} />}
    />
  }
>
  <Stack gap="lg">
    <Grid columns="400px 1fr" stackBelow={720} gap="md">
      <MetricCard type="hero" theme="subtle" color="brand" label="Total balance" value="$248,930" trend={{ direction: "positive", label: "+4.2% this month" }}
        series={balance} format={formatCompactMoney} subAction={more} footer={<Button size="sm" level="tertiary" onClick={openStatement}>View statement</Button>} />
      <ChartCard theme="pale" headingLevel={2} title="Net worth vs. invested" description="All accounts · this year" value="$248.9k" onOpen={openReport}
        ranges={[{ id: "quarterly", label: "Quarterly" }, { id: "monthly", label: "Monthly" }, { id: "weekly", label: "Weekly" }]} range={range} onRangeChange={setRange}>
        <LineChart aria-label="Invoiced and collected, Q1 – Q4 2026" data={quarters} label="Invoiced" compare={{ label: "Collected", values: collected }} legendPosition="top" format={formatCompactMoney} height={184} />
      </ChartCard>
    </Grid>
    <Grid columns="400px 1fr 1fr 1fr" stackBelow={720} gap="md">
      <ChartCard theme="pale" headingLevel={2} icon="icon-pie-chart-01-line" title="Allocation" ranges={[{ id: "q3", label: "Q3" }, { id: "ytd", label: "Year to date" }]} range={share} onRangeChange={setShare}>
        <DonutChart aria-label="Allocation, Q3 2026" data={allocation} size="small" legendPosition="start" format={formatCompactMoney} />
      </ChartCard>
      <MetricCard type="sparkline" theme="pale" label="Cash" value="$32,410" trend={{ direction: "positive", label: "+1.1% vs. Aug" }} series={cash} subAction={more} />
      <MetricCard type="spark-bars" theme="pale" label="Monthly spend" value="$4,862" trend={{ direction: "positive", label: "-6% vs. Aug" }} series={spend} subAction={more} />
      <MetricCard type="sparkline" theme="pale" label="Dividends YTD" value="$1,284" trend={{ direction: "positive", label: "+12% vs. 2025" }} series={dividends} subAction={more} />
    </Grid>
  </Stack>
</AppShell>`,
  },
];

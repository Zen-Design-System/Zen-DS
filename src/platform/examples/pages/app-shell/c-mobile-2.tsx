/* App Shell examples · c-mobile-2: built from Figma ◇ Master-Layout · Example (15902:109717), section
   "C · Mobile structures by domain" (15921:7244): C5 Stack detail (15923:8404), C6 Focus flow (15923:8850) and
   C7 Greeting Home (15942:120713). Each screen is Pattern/AppShell/Mobile · Phone · Top=Bar. */
import { useId, useRef, useState } from "react";
import { ActionBar } from "../../../../components/ActionBar";
import { AppShell } from "../../../../components/AppShell";
import { Avatar, AvatarStack } from "../../../../components/Avatar";
import { Badge } from "../../../../components/Badge";
import { BottomNavigation } from "../../../../components/BottomNavigation";
import { Button, IconButton } from "../../../../components/Button";
import { Card } from "../../../../components/Card";
import { Checkbox } from "../../../../components/Checkbox";
import { DescriptionList } from "../../../../components/DescriptionList";
import { DockIcon } from "../../../../components/DockIcon";
import { Icon, type IconName } from "../../../../components/Icon";
import { DateField, InputField, SelectField } from "../../../../components/Input";
import { Thumbnail } from "../../../../components/Image";
import { Stack } from "../../../../components/Layout";
import { Link } from "../../../../components/Link";
import { List, ListItem } from "../../../../components/ListItem";
import { ProgressBar } from "../../../../components/Progress";
import { Segmented } from "../../../../components/Segmented";
import { Heading, Text } from "../../../../components/Text";
import { useToast } from "../../../../components/Toast";
import { TopNavigation } from "../../../../components/TopNavigation";
import { platformMedia } from "../../../PlatformMedia";
import { PlatformPhone } from "../../../PlatformPhone";
import { TODAY, me } from "../../data";
import type { ExampleDef } from "../../types";

// ——— C5 · Stack detail + Action bar (Top=Bar, Bottom=Actions; Pale on Canvas/Alt) ——————————————————————————————
const orderLines = [
  { id: "urbas", name: "Urbas Love+ Slip On", variant: "Offwhite · EU 39", price: "$42.00", photo: platformMedia.products.offwhite },
  { id: "vintas", name: "Vintas Soda Pop High", variant: "Red Violet · EU 39", price: "$58.00", photo: platformMedia.products.redViolet },
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

function OrderDetailPhone() {
  const { toast } = useToast();
  const [tab, setTab] = useState<OrderTab>("details");
  const [shipped, setShipped] = useState(false);
  const customerId = useId();
  const totalsId = useId();
  const activityId = useId();
  return (
    <PlatformPhone label="Orders app" canvas="alt">
      {/* Top=Bar, Bottom=Actions on Canvas/Alt: back, the order and More in the bar; the total large under it, Segmented
          sections, Pale groups on white, and the next step pinned in the Action bar. */}
      <AppShell canvas="alt"
        topNavigation={<TopNavigation type="default" title="Order #10428" subtitle="Placed Sep 30 · Online store"
          leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => toast({ title: "Back to Orders" }) }}
          trailing={[{ icon: "icon-dots-vertical-line", label: "More for order #10428", onClick: () => toast({ title: "Print packing slip, refund or cancel the order" }) }]} />}
        actionBar={<ActionBar direction="horizontal"
          secondaryAction={{ label: "Contact", onClick: () => toast({ title: "Message to Lia Campbell", children: "lia@northwind.io" }) }}
          primaryAction={shipped
            ? { label: "Track shipment", onClick: () => toast({ title: "Parcel with GHN Express", children: "Out for delivery Thu, Oct 2" }) }
            : { label: "Mark as shipped", onClick: () => { setShipped(true); toast({ title: "Order #10428 shipped", children: "Lia gets the tracking link by email.", action: { label: "Undo", onClick: () => setShipped(false) } }); } }} />}
      >
        <Stack gap="lg">
          <Stack gap="xs">
            <Badge size="sm" leadingIcon={false} theme={shipped ? "green" : "orange"}>{shipped ? "Shipped" : "Ready to ship"}</Badge>
            <Text as="p" textStyle="Display/4" tabularNumbers>$110.00</Text>
            <Text textStyle="Body/Small/Regular" tone="light">2 items · Paid with Visa ·· 42</Text>
          </Stack>
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
    </PlatformPhone>
  );
}

// ——— C6 · Focus flow (Top=Bar with the progress in the Control-Bar, Bottom=Actions with one CTA; Canvas/Alt) ——————
const nationalities = ["Vietnam", "Singapore", "Thailand", "Malaysia", "Philippines", "Indonesia", "Other"].map((name) => ({ value: name, label: name }));

function IdentityStepPhone() {
  const { toast } = useToast();
  const [idNumber, setIdNumber] = useState("");
  const [matches, setMatches] = useState(true);
  const [error, setError] = useState<string>();
  const next = () => {
    if (!/^\d{12}$/.test(idNumber)) { setError("Enter the 12 digits on the front of your ID card."); return; }
    if (!matches) { toast({ title: "Check your details", children: "Tick Matches my ID once they match your card." }); return; }
    setError(undefined);
    toast({ title: "Step 3 of 4: a photo of your ID", children: "Front first, in good light." });
  };
  return (
    <PlatformPhone label="Verify identity" canvas="alt">
      {/* A focus flow: Close instead of Back, the step in the Control-Bar, one question per screen on the white Canvas
          (fields with no card around them) and a single full-width primary action in the Action bar. */}
      <AppShell canvas="alt"
        topNavigation={<TopNavigation type="default" title="Verify identity"
          leading={{ icon: "icon-x-medium-line", label: "Close", onClick: () => toast({ title: "Saved for later", children: "Pick up where you left off from Profile." }) }}
          trailing={[{ icon: "icon-help-circle-line", label: "Help with verifying", onClick: () => toast({ title: "Why we ask", children: "The law asks us to check who opens an account." }) }]}
          controlBar={<ProgressBar value={25} label="Step 2 of 4" />} />}
        actionBar={<ActionBar primaryAction={{ label: "Continue", onClick: next }} />}
      >
        <Stack gap="lg" paddingY="sm">
          <Stack gap="xs">
            <Heading level={2} textStyle="Heading/1">Tell us about you</Heading>
            <Text as="p" tone="light">We match these details with your ID card. It takes about two minutes.</Text>
          </Stack>
          <Stack gap="md">
            <InputField label="Full name (as on your ID)" defaultValue="Chen Thi Maya" autoComplete="name" />
            <DateField label="Date of birth" defaultValue="12/04/1994" today={TODAY} maxDate={TODAY} />
            <SelectField label="Nationality" options={nationalities} defaultValue="Vietnam" />
            <InputField label="ID number" placeholder="12 digits" inputMode="numeric" maxLength={12} value={idNumber} error={error}
              onValueChange={(value) => { setIdNumber(value.replace(/\D/g, "")); setError(undefined); }} />
          </Stack>
          <Checkbox label="Matches my ID" checked={matches} onCheckedChange={setMatches} />
        </Stack>
      </AppShell>
    </PlatformPhone>
  );
}

// ——— C7 · Greeting Home (Top=Bar Liquid Glass, Bottom=Floating Glass; flat on Canvas/Default) ————————————————————
const todos = [
  { id: "power", initials: "EB", theme: "orange" as const, title: "Pay electricity bill", caption: "Due today · ₫850,000" },
  { id: "parcel", initials: "PK", theme: "violet" as const, title: "Pick up parcel", caption: "Locker 12 · until 18:00" },
];
const stats: { id: string; icon: IconName; theme: "green" | "blue"; value: string; label: string }[] = [
  { id: "steps", icon: "icon-activity-line", theme: "green", value: "6,240", label: "Steps today" },
  { id: "spent", icon: "icon-wallet-01-line", theme: "blue", value: "₫320k", label: "Spent today" },
];

function GreetingHomePhone() {
  const { toast } = useToast();
  const screenRef = useRef<HTMLDivElement>(null);
  const [root, setRoot] = useState("home");
  const [unseen, setUnseen] = useState(true);
  const todoId = useId();
  return (
    <PlatformPhone label="Personal home" canvas="default" screenRef={screenRef}>
      {/* A home that opens on the person: the account avatar leading, the bell with its dot trailing, no bar title and
          a large greeting. The day in short sits flat on the grey Canvas, under the Liquid-Glass header, with the
          Floating-Glass bar riding over it. */}
      <AppShell
        topNavigation={<TopNavigation type="liquid-glass" largeTitle="Morning Alex!" scrollRef={screenRef}
          leading={<Avatar size="md" theme="photo" src={me.photo} alt={me.name} />}
          trailing={[{ icon: "icon-bell-01-line", label: unseen ? "Notifications, 2 new" : "Notifications", dot: unseen, onClick: () => { setUnseen(false); toast({ title: "2 notifications", children: "Your parcel arrived and the standup moved to 09:30." }); } }]} />}
        bottomNavigation={<BottomNavigation type="floating-glass" aria-label="Personal app" value={root} onValueChange={setRoot}
          action={{ icon: "icon-plus-line", label: "Quick add", onClick: () => toast({ title: "Quick add", children: "A task, an expense or an event." }) }}
          items={[
            { id: "home", label: "Home", icon: "icon-home-01-line", selectedIcon: "icon-home-01-solid" },
            { id: "calendar", label: "Calendar", icon: "icon-calendar-line", selectedIcon: "icon-calendar-solid" },
            { id: "wallet", label: "Wallet", icon: "icon-wallet-01-line", selectedIcon: "icon-wallet-01-solid" },
            { id: "profile", label: "Profile", icon: "icon-user-line", selectedIcon: "icon-user-solid" },
          ]} />}
      >
        <Stack gap="md">
          <Text as="p" tone="light">Thursday, Oct 16 · 3 things need you today</Text>
          <Card theme="flat" as="section" aria-label="Up next">
            <Stack gap="sm">
              <Text textStyle="All-Caps/S" tone="light">Up next · 09:30</Text>
              <Stack gap="2xs">
                <Heading level={2} textStyle="Heading/4">Design standup</Heading>
                <Text textStyle="Body/Small/Regular" tone="light">Zoom · 15 min · 6 people</Text>
              </Stack>
              <Stack direction="row" gap="xs" align="center" justify="between">
                <AvatarStack size="sm" background="subtle" items={[
                  { theme: "accent", children: "A", alt: "Ava Chen" },
                  { theme: "blue", children: "B", alt: "Bao Nguyen" },
                  { theme: "brown", children: "C", alt: "Chi Tran" },
                ]} />
                <Button size="sm" level="primary" startIcon="icon-video-line" onClick={() => toast({ title: "Joining Design standup…", children: "Camera off, mic muted." })}>Join</Button>
              </Stack>
            </Stack>
          </Card>
          <Stack direction="row" gap="sm" fillChildren>
            {stats.map((stat) => (
              <Card key={stat.id} theme="flat" spacing="sm">
                <Stack gap="xs">
                  <DockIcon icon={stat.icon} theme={stat.theme} background="subtle" size="sm" />
                  <Stack gap="3xs">
                    <Text as="p" textStyle="Heading/3" tabularNumbers>{stat.value}</Text>
                    <Text textStyle="Body/Small/Regular" tone="light">{stat.label}</Text>
                  </Stack>
                </Stack>
              </Card>
            ))}
          </Stack>
          <Stack as="section" gap="md" aria-labelledby={todoId}>
            <Stack direction="row" gap="xs" align="center" justify="between">
              <Heading level={2} id={todoId} textStyle="Heading/4">To do today</Heading>
              <Text as="span" textStyle="Body/Base/Bold">
                <Link as="button" tone="inherit" onClick={() => toast({ title: "All to-dos", children: "3 today · 5 this week" })}>See All</Link>
              </Text>
            </Stack>
            <List aria-labelledby={todoId}>
              {todos.map((todo) => (
                <ListItem key={todo.id} title={todo.title} caption={todo.caption} onClick={() => toast({ title: todo.title, children: todo.caption })}
                  leading={<Avatar size="md" shape="square" theme={todo.theme} background="subtle" alt="">{todo.initials}</Avatar>}
                  trailing={<Icon name="icon-chevron-right-line-medium" size="lg" decorative />} />
              ))}
            </List>
          </Stack>
        </Stack>
      </AppShell>
    </PlatformPhone>
  );
}

export const examples: ExampleDef[] = [
  {
    title: "C5 · Stack detail with Action bar",
    description: "One record pushed from a list: back, title and more in the top bar, the key number large, Segmented sections, Pale groups on white, and the Action-Bar for the next step. The phone form of B2 (and of the Sidebar workspace on mobile). Shell: AppShell/Mobile · Phone · Top=Bar · Bottom=Actions. Fits: Orders / Admin, CRM records, Tickets, HR requests.",
    render: () => <OrderDetailPhone />,
    code: `<PlatformPhone canvas="alt">
  <AppShell canvas="alt"
    topNavigation={<TopNavigation type="default" title="Order #10428" subtitle="Placed Sep 30 · Online store"
      leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: back }}
      trailing={[{ icon: "icon-dots-vertical-line", label: "More for order #10428", onClick: more }]} />}
    actionBar={<ActionBar direction="horizontal"
      secondaryAction={{ label: "Contact", onClick: contact }}
      primaryAction={{ label: "Mark as shipped", onClick: ship }} />}
  >
    <Stack gap="lg">
      <Stack gap="xs">
        <Badge size="sm" leadingIcon={false} theme="orange">Ready to ship</Badge>
        <Text as="p" textStyle="Display/4">$110.00</Text>
        <Text textStyle="Body/Small/Regular" tone="light">2 items · Paid with Visa ·· 42</Text>
      </Stack>
      <Segmented fullWidth aria-label="Order sections" value={tab} onValueChange={setTab}
        options={[{ id: "details", label: "Details" }, { id: "items", label: "Items" }, { id: "activity", label: "Activity" }]} />
      <Card theme="pale" as="section" aria-labelledby="customer">
        <Stack gap="sm">
          <Text id="customer" textStyle="All-Caps/S" tone="light">Customer</Text>
          <Stack direction="row" gap="sm" align="center">
            <Avatar size="md" theme="violet" background="subtle" alt="">LC</Avatar>
            <Stack gap="3xs" width="fill">
              <Text textStyle="Body/Base/Bold">Lia Campbell</Text>
              <Text textStyle="Body/Small/Regular" tone="light">lia@northwind.io</Text>
            </Stack>
            <IconButton size="sm" level="tertiary" icon="icon-phone-line" aria-label="Call Lia Campbell" onClick={call} />
          </Stack>
          <DescriptionList divider items={[
            { term: "Delivery", description: "Standard · 2–4 days" },
            { term: "Ship to", description: "Hoan Kiem, Hanoi" },
            { term: "Payment", description: "Paid · Visa ·· 42" },
          ]} />
        </Stack>
      </Card>
      <Card theme="pale" as="section" aria-labelledby="items">
        <Stack gap="sm">
          <Text id="items" textStyle="All-Caps/S" tone="light">Items</Text>
          {lines.map((line) => (
            <Stack key={line.id} direction="row" gap="sm" align="center">
              <Thumbnail src={line.photo} alt="" size="lg" />
              <Stack gap="3xs" width="fill">
                <Text textStyle="Body/Base/Medium">{line.name}</Text>
                <Text textStyle="Body/Small/Regular" tone="light">{line.variant}</Text>
              </Stack>
              <Text textStyle="Body/Base/Medium">{line.price}</Text>
            </Stack>
          ))}
        </Stack>
      </Card>
    </Stack>
  </AppShell>
</PlatformPhone>`,
  },
  {
    title: "C6 · Focus flow",
    description: "One question set per screen: close instead of back, progress in the Control-Bar, a Heading/1 question with a short reason, fields straight on the white canvas (no card), and one full-width primary action in the Action-Bar above the home indicator. Shell: AppShell/Mobile · Phone · Top=Bar · Bottom=Actions. Fits: Onboarding / KYC, Checkout, Sign-up, Applications.",
    render: () => <IdentityStepPhone />,
    code: `<PlatformPhone canvas="alt">
  <AppShell canvas="alt"
    topNavigation={<TopNavigation type="default" title="Verify identity"
      leading={{ icon: "icon-x-medium-line", label: "Close", onClick: saveForLater }}
      trailing={[{ icon: "icon-help-circle-line", label: "Help with verifying", onClick: help }]}
      controlBar={<ProgressBar value={25} label="Step 2 of 4" />} />}
    actionBar={<ActionBar primaryAction={{ label: "Continue", onClick: next }} />}
  >
    <Stack gap="lg" paddingY="sm">
      <Stack gap="xs">
        <Heading level={2} textStyle="Heading/1">Tell us about you</Heading>
        <Text as="p" tone="light">We match these details with your ID card. It takes about two minutes.</Text>
      </Stack>
      <Stack gap="md">
        <InputField label="Full name (as on your ID)" defaultValue="Chen Thi Maya" autoComplete="name" />
        <DateField label="Date of birth" defaultValue="12/04/1994" maxDate={today} />
        <SelectField label="Nationality" options={nationalities} defaultValue="Vietnam" />
        <InputField label="ID number" placeholder="12 digits" inputMode="numeric" maxLength={12}
          value={idNumber} onValueChange={setIdNumber} error={error} />
      </Stack>
      <Checkbox label="Matches my ID" checked={matches} onCheckedChange={setMatches} />
    </Stack>
  </AppShell>
</PlatformPhone>`,
  },
  {
    title: "C7 · Greeting home",
    description: "A personal home that opens on the person: the account avatar in Top-Leading, the bell (with its dot) in Top-Trailing, no bar title, and a large H1 greeting in Expand-Heading. Below it the day in short: one \"up next\" card, two numbers and a short list, flat on the grey canvas, under a Liquid-Glass header and a Floating-Glass bar. Shell: AppShell/Mobile · Phone · Top=Bar · Bottom=Floating. Fits: Personal banking, Health / Habits, Productivity, Smart home.",
    render: () => <GreetingHomePhone />,
    code: `<PlatformPhone canvas="default" screenRef={screenRef}>
  <AppShell
    topNavigation={<TopNavigation type="liquid-glass" largeTitle="Morning Alex!" scrollRef={screenRef}
      leading={<Avatar size="md" theme="photo" src={me.photo} alt={me.name} />}
      trailing={[{ icon: "icon-bell-01-line", label: "Notifications, 2 new", dot: true, onClick: openNotifications }]} />}
    bottomNavigation={<BottomNavigation type="floating-glass" aria-label="Personal app" value={root} onValueChange={setRoot}
      action={{ icon: "icon-plus-line", label: "Quick add", onClick: quickAdd }}
      items={[
        { id: "home", label: "Home", icon: "icon-home-01-line", selectedIcon: "icon-home-01-solid" },
        { id: "calendar", label: "Calendar", icon: "icon-calendar-line", selectedIcon: "icon-calendar-solid" },
        …
      ]} />}
  >
    <Stack gap="md">
      <Text as="p" tone="light">Thursday, Oct 16 · 3 things need you today</Text>
      <Card theme="flat" as="section" aria-label="Up next">
        <Stack gap="sm">
          <Text textStyle="All-Caps/S" tone="light">Up next · 09:30</Text>
          <Stack gap="2xs">
            <Heading level={2} textStyle="Heading/4">Design standup</Heading>
            <Text textStyle="Body/Small/Regular" tone="light">Zoom · 15 min · 6 people</Text>
          </Stack>
          <Stack direction="row" gap="xs" align="center" justify="between">
            <AvatarStack size="sm" background="subtle" items={attendees} />
            <Button size="sm" level="primary" startIcon="icon-video-line" onClick={join}>Join</Button>
          </Stack>
        </Stack>
      </Card>
      <Stack direction="row" gap="sm" fillChildren>
        <Card theme="flat" spacing="sm">
          <Stack gap="xs">
            <DockIcon icon="icon-activity-line" theme="green" background="subtle" size="sm" />
            <Stack gap="3xs">
              <Text as="p" textStyle="Heading/3">6,240</Text>
              <Text textStyle="Body/Small/Regular" tone="light">Steps today</Text>
            </Stack>
          </Stack>
        </Card>
        …
      </Stack>
      <Stack as="section" gap="md" aria-labelledby="todo">
        <Stack direction="row" gap="xs" align="center" justify="between">
          <Heading level={2} id="todo" textStyle="Heading/4">To do today</Heading>
          <Text as="span" textStyle="Body/Base/Bold"><Link as="button" tone="inherit" onClick={seeAll}>See All</Link></Text>
        </Stack>
        <List aria-labelledby="todo">
          <ListItem title="Pay electricity bill" caption="Due today · ₫850,000" onClick={open}
            leading={<Avatar size="md" shape="square" theme="orange" background="subtle" alt="">EB</Avatar>}
            trailing={<Icon name="icon-chevron-right-line-medium" size="lg" decorative />} />
          …
        </List>
      </Stack>
    </Stack>
  </AppShell>
</PlatformPhone>`,
  },
];

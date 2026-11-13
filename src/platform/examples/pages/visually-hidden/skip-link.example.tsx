import { useId, useState, type MouseEvent, type ReactNode } from "react";
import {
  AppShell, AppShellAccount, AppShellHeader, Avatar, Badge, DockIcon, FileIcon, Grid, Heading, Link, List, ListBox, ListItem, Menu, MetricCard, PageHeader,
  Stack, Text, Thumbnail, fileIconFormatOf, useToast,
} from "@zen-ds/react";
import {
  TODAY, daysFromToday, formatBytes, formatCompactMoney, formatDate, formatMoney, formatRelative, initials, invoiceStatusTheme, people, projectById, studio,
  type PersonId,
} from "../../data";

const personAvatar = (id: PersonId) => {
  const person = people[id];
  return person.photo
    ? <Avatar size="md" theme="photo" src={person.photo} alt="" />
    : <Avatar size="md" theme={person.theme} alt="">{initials(person.name)}</Avatar>;
};
const minutesAgo = (m: number) => new Date(TODAY.getTime() - m * 60_000);

type PortalPage = "overview" | "designs" | "invoices" | "messages";
type Row = { id: string; title: string; caption: string; leading: ReactNode; trailing?: ReactNode; to?: PortalPage };
const receipt = <DockIcon icon="icon-receipt-line" theme="neutral" background="subtle" />;
const fileIcon = (name: string) => <FileIcon format={fileIconFormatOf(name)} size="xl" />;
/** The Phin & Co client portal: what Trang Le, their product owner, sees of the Loyalty app project. */
const portal: Record<PortalPage, { label: string; title: string; description: string; section: string; rows: Row[] }> = {
  overview: {
    label: "Overview", title: "Loyalty app", section: "Waiting for you",
    description: "Đìzai Studio is designing and building your loyalty app. Next: the store staff beta on Oct 15.",
    rows: [
      { id: "review", title: "Review the points history screen", caption: `Chi Tran shared it ${formatRelative(minutesAgo(13))}`, leading: personAvatar("chi"), to: "designs" },
      { id: "approve", title: "Approve INV-2026-0142", caption: `${formatMoney(21000, true)} · Due ${formatDate(daysFromToday(25))}`, leading: receipt, to: "invoices" },
    ],
  },
  designs: {
    label: "Designs", title: "Designs", section: "Shared with Phin & Co",
    description: "Files the studio shares with you for review. Comments go straight to the designer.",
    rows: [
      { id: "points", title: "Loyalty app – points history.fig", caption: `${formatBytes(18_400_000)} · Chi Tran · ${formatRelative(minutesAgo(13))}`, leading: fileIcon("a.fig") },
      { id: "store", title: "Store locator.fig", caption: `${formatBytes(9_800_000)} · Chi Tran · ${formatRelative(daysFromToday(-1, 15, 20))}`, leading: fileIcon("a.fig") },
      { id: "brief", title: "Loyalty brief v2.pdf", caption: `${formatBytes(1_100_000)} · Duy Le · ${formatRelative(daysFromToday(-12, 11, 0))}`, leading: fileIcon("a.pdf") },
    ],
  },
  invoices: {
    label: "Invoices", title: "Invoices", section: "Loyalty app",
    description: "What Phin & Co owes and has paid for this project, in USD.",
    rows: [
      { id: "0142", title: "INV-2026-0142", caption: `${formatMoney(21000, true)} · Due ${formatDate(daysFromToday(25))}`, leading: receipt, trailing: <Badge theme={invoiceStatusTheme.Sent} background="subtle">Sent</Badge> },
      { id: "0127", title: "INV-2026-0127", caption: `${formatMoney(18000, true)} · Paid ${formatDate(daysFromToday(-33))}`, leading: receipt, trailing: <Badge theme={invoiceStatusTheme.Paid} background="subtle">Paid</Badge> },
    ],
  },
  messages: {
    label: "Messages", title: "Messages", section: "Recent",
    description: "Your conversation with the studio team. Replies usually come within a working day.",
    rows: [
      { id: "hana", title: "Hana Kim", caption: "Beta invites for store staff go out on Oct 15.", leading: personAvatar("hana") },
      { id: "duy", title: "Duy Le", caption: "The sprint 6 report is in Designs.", leading: personAvatar("duy") },
    ],
  },
};
const portalPages = Object.keys(portal) as PortalPage[];
const loyalty = projectById("phin-loyalty");

export default function SkipLinkPortal() {
  const { toast } = useToast();
  const [current, setCurrent] = useState<PortalPage>("overview");
  const mainId = useId();
  const sectionId = useId();
  const glanceId = useId();
  const page = portal[current];
  // What your router's link does: a plain click opens the page in place; Cmd/Ctrl-click keeps the real href.
  const navigate = (event: MouseEvent<HTMLElement>, id: PortalPage) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    setCurrent(id);
  };
  return (
    // The client portal is one product without a Sidebar: AppShell Layout=Top-Bar, the brand and the portal's navigation
    // in the header's top row, Trang's account at its end, the page's PageHeader as its Main row. The shell's first
    // focusable element is its skip link (a VisuallyHidden link): hidden until it has focus, then a Surface pill at the
    // shell's top-start corner that moves focus to the main content (mainId).
    <AppShell pattern="top-bar" mainId={mainId}
      header={(
        <AppShellHeader
          leading={(
            // Brand · navigation; in a narrow window the row takes a line of its own above the account.
            <Stack direction="row" align="center" gap="xl" wrap>
              <Stack direction="row" gap="xs" align="center">
                <Thumbnail src={studio.logo} alt="" size="2xs" />
                <Text as="span" textStyle="Body/Base/Bold">{studio.name}</Text>
              </Stack>
              <Stack as="nav" aria-label="Client portal">
                <Stack as="ul" direction="row" gap="md" wrap>
                  {portalPages.map((id) => {
                    const here = id === current;
                    return (
                      <li key={id}>
                        {/* A navigation list, not links in copy: the links take the bar's neutral text colour (tone="inherit"),
                            the current page is Strongest and Bold with aria-current, and the others underline on hover. */}
                        <Text as="span" textStyle={here ? "Body/Base/Bold" : "Body/Base/Medium"} tone={here ? "strongest" : "base"}>
                          <Link href={`/portal/${id}`} tone="inherit" underline={here ? "none" : "hover"} aria-current={here ? "page" : undefined}
                            onClick={(event) => navigate(event, id)}>{portal[id].label}</Link>
                        </Text>
                      </li>
                    );
                  })}
                </Stack>
              </Stack>
            </Stack>
          )}
          actions={(
            <Menu align="end" trigger={<AppShellAccount name="Trang Le" theme="blue" />} items={[
              { id: "profile", label: "Profile", icon: "icon-user-circle-line", onSelect: () => toast({ title: "Trang Le", children: "Product owner · Phin & Co" }) },
              { type: "separator" },
              { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line", onSelect: () => toast({ title: "Signed out of the client portal", children: "See you soon, Trang." }) },
            ]} />
          )}
          main={<PageHeader title={page.title} description={page.description}
            meta={current === "overview" ? <Badge theme="blue" background="subtle">Active</Badge> : undefined} />}
        />
      )}
    >
      {/* The Body pads the page and is the skip link's target. Sections of the page sit xl apart. */}
      <Stack gap="xl">
        {current === "overview" ? (
          <Stack as="section" gap="md" aria-labelledby={glanceId}>
            <Heading level={2} id={glanceId} textStyle="Heading/4">At a glance</Heading>
            {/* No Sidebar sets an elevation: white flat boxes on the Canvas. */}
            <Grid columns="repeat(auto-fit, minmax(min(100%, 220px), 1fr))" gap="md">
              <MetricCard theme="default" size="md" icon="icon-target-04-line" iconTheme="blue" label="Progress" value={`${loyalty.progress}%`} />
              <MetricCard theme="default" size="md" icon="icon-calendar-line" iconTheme="purple" label="Store staff beta" value={formatDate(new Date(2026, 9, 15))} />
              <MetricCard theme="default" size="md" icon="icon-coins-line" iconTheme="green" label="Budget used" value={formatCompactMoney(loyalty.spent)} />
            </Grid>
          </Stack>
        ) : null}
        <Stack as="section" gap="md" aria-labelledby={sectionId}>
          <Heading level={2} id={sectionId} textStyle="Heading/4">{page.section}</Heading>
          <ListBox>
            <List aria-labelledby={sectionId}>
              {/* A row that leads to another page of the portal is a link (href); the others open in place. */}
              {page.rows.map(({ to, ...row }) => (
                <ListItem key={row.id} title={row.title} titleLines={2} caption={row.caption} leading={row.leading} trailing={row.trailing}
                  href={to ? `/portal/${to}` : undefined}
                  onClick={to ? (event) => navigate(event, to) : () => toast({ title: row.title, children: row.caption })} />
              ))}
            </List>
          </ListBox>
        </Stack>
      </Stack>
    </AppShell>
  );
}

/* A page built without AppShell adds its own skip link, as its first focusable element; the pill shows at the top-start
   of the nearest positioned box:

   const mainRef = useRef<HTMLElement>(null);
   <VisuallyHidden as="a" href="#main" focusable onClick={(event) => { event.preventDefault(); mainRef.current?.focus(); }}>
     Skip to main content
   </VisuallyHidden>
   <header><nav aria-label="Client portal">…</nav></header>
   <main ref={mainRef} id="main" tabIndex={-1}>…</main> */

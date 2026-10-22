import { useId, useLayoutEffect, useRef, useState } from "react";
import { Accordion } from "../../../components/Accordion";
import { ActionBar } from "../../../components/ActionBar";
import { AppShell, AppShellAccount, AppShellAction, AppShellHeader, AppShellPane } from "../../../components/AppShell";
import { Badge, BadgeCounter } from "../../../components/Badge";
import { Breadcrumbs } from "../../../components/Breadcrumbs";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { Checkbox } from "../../../components/Checkbox";
import { Chip } from "../../../components/Chip";
import { DescriptionList } from "../../../components/DescriptionList";
import { Divider } from "../../../components/Divider";
import { DockIcon } from "../../../components/DockIcon";
import { EmptyState } from "../../../components/EmptyState";
import { Form, FormActions } from "../../../components/Form";
import { InlineMessage } from "../../../components/InlineMessage";
import { ColorField, InputField, SelectField } from "../../../components/Input";
import { Box, Stack } from "../../../components/Layout";
import { Link } from "../../../components/Link";
import { List, ListBox, ListItem, ToggleListItem } from "../../../components/ListItem";
import { Menu } from "../../../components/Menu";
import { PageHeader } from "../../../components/PageHeader";
import { Search } from "../../../components/Search";
import { Segmented } from "../../../components/Segmented";
import { SidebarSubMenu, type SidebarSection } from "../../../components/Sidebar";
import { SliderField } from "../../../components/SliderField";
import { SidePanel } from "../../../components/SidePanel";
import { Stepper } from "../../../components/Stepper";
import { Heading, Text, plural } from "../../../components/Text";
import { useToast } from "../../../components/Toast";
import { TopNavigation } from "../../../components/TopNavigation";
import { VisuallyHidden } from "../../../components/VisuallyHidden";
import { PreviewAppFrame, StudioLogo } from "../../PlatformFrames";
import { PlatformPhone, usePhoneScreen } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { daysFromToday, formatDate, formatMoney, leaveBalance, me, people, projectStatusTheme, projects, studio, tasks, type Project } from "../data";
import type { ExampleDef } from "../types";
import { keepOnHotUpdate } from "../../hotData";
import "./accordion.css";

export const page: PlatformPage = "accordion";

// ——— Data ————————————————————————————————————————————————————————————————————————————————————

/** Questions clients ask in the studio's client portal. */
const clientFaq = [
  { id: "reviews", question: "How do design reviews work?", answer: "Every Friday we share a Figma link and a short walkthrough video. Comment by Tuesday and we fold your notes into the next round; two rounds per milestone are included." },
  { id: "invoices", question: "When are invoices due?", answer: "30 days after we send them. We invoice a milestone only once you approve it, so you never pay for work you haven't seen." },
  { id: "ownership", question: "Who owns the final files?", answer: "You do. When the final invoice is paid we hand over the Figma files, the source code and the font licences in your company's name." },
  { id: "scope", question: "Can we add work mid-project?", answer: "Yes. Your project manager writes up a change request with the extra time and cost, and nothing starts until you approve it." },
];

/** The studio's internal help center. */
const helpArticles = [
  { id: "time", title: "How do I log time on a project?", body: "Open the project, choose Log time and pick the task. Time logged before Friday at 6:00 pm shows on that week's client report." },
  { id: "leave", title: "How do I request leave?", body: "Go to Time off, choose Request leave and pick your dates. Your team lead gets the request and usually answers within 2 working days." },
  { id: "assets", title: "Where are the studio's brand assets?", body: "Logos, fonts and slide templates live in Files › Studio brand. Design can edit them; everyone else can download." },
  { id: "share", title: "How do I share a file with a client?", body: "Open the file, choose Share and add the client's email. Clients can view and comment, but never see internal notes." },
  { id: "expenses", title: "Who approves my expenses?", body: `Your team lead approves claims up to $500 and ${people.mai.name} in Finance approves anything above. Approved claims are paid with your next salary.` },
  { id: "freelancer", title: "How do I invite a freelancer?", body: "Project leads invite freelancers from the project's People tab. Freelancers only see the projects they are invited to." },
  { id: "archive", title: "How do I archive a finished project?", body: "Once the last invoice is paid, the project lead chooses Archive in the project settings. Archived projects stay searchable for 7 years." },
  { id: "quiet", title: "How do I mute notifications after work?", body: "Turn on Quiet hours in Settings › Notifications. Zen holds everything except mentions from your own team until 8:00 am." },
];
const matches = (query: string) => {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return helpArticles.filter((article) => words.every((word) => `${article.title} ${article.body}`.toLowerCase().includes(word)));
};

/** Sections of the leave policy in the People handbook. */
const leavePolicy = [
  { id: "annual", title: "Annual leave", body: ["Everyone gets 18 days of paid annual leave a year, plus 1 day for every 2 full years at the studio, up to 24 days. Days build up monthly from your start date.", "Request anything longer than 3 days at least 2 weeks ahead so your project lead can plan client cover."] },
  { id: "holidays", title: "Public holidays", body: ["Both offices close on Vietnam's 11 public holidays, including 5 days for Tết. If you work from Singapore or remotely, you follow the holidays of the country you work from; tell People Ops which one applies."] },
  { id: "sick", title: "Sick leave", body: ["Take up to 12 paid sick days a year. Tell your team lead before 10:00 am on the day.", "For more than 2 days in a row, add a doctor's note to your leave request when you are back."] },
  { id: "parental", title: "Parental leave", body: [`Birth parents get 6 months of paid leave and other parents get 4 weeks, to take within the first year. Talk to ${people.minhAnh.name} at least 2 months ahead.`] },
  { id: "carry", title: "Unused days", body: ["Up to 5 unused days carry over into the next year and expire on Mar 31. Any other unused days are paid out with your December salary."] },
];
const policyUpdated = daysFromToday(-16);

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
const lineName = (item: (typeof order.items)[number]) => (item.quantity > 1 ? `${item.name}\u00a0×\u00a0${item.quantity}` : item.name);
const orderSubtotal = order.items.reduce((sum, item) => sum + item.price, 0);

/** The facets of the project filter panel, one Accordion each. */
type Facet = "status" | "client" | "lead";
const facets: Array<{ id: Facet; label: string; options: string[]; of: (project: Project) => string }> = [
  { id: "status", label: "Status", options: ["Planning", "Active", "On hold", "Completed"], of: (project) => project.status },
  { id: "client", label: "Client", options: [...new Set(projects.map((project) => project.client))], of: (project) => project.client },
  { id: "lead", label: "Project lead", options: [...new Set(projects.map((project) => people[project.lead].name))], of: (project) => people[project.lead].name },
];
type Picks = Record<Facet, string[]>;
const noPicks: Picks = { status: [], client: [], lead: [] };
const matchesPicks = (picks: Picks) => (project: Project) => facets.every((facet) => !picks[facet.id].length || picks[facet.id].includes(facet.of(project)));
const countPicks = (picks: Picks) => facets.reduce((sum, facet) => sum + picks[facet.id].length, 0);

const clientOptions = [...new Set(projects.map((project) => project.client))].map((client) => ({ label: client, value: client }));
/** Task-key prefixes already in use (PHIN-214, LUM-088…). */
const takenKeys = [...new Set(tasks.map((task) => task.key.split("-")[0]))];

// ——— Examples ————————————————————————————————————————————————————————————————————————————————

/** Box theme: a few standalone questions on a client-portal card, each opening on its own; the first starts open. */
function ClientFaqExample() {
  const titleId = useId();
  return (
    // The Box fill (Support/Neutral/Pale) sits on the card's Surface, not straight on the grey page.
    <Card theme="default" as="section" aria-labelledby={titleId}>
      <Stack gap="md">
        <Stack gap="xs">
          <Heading level={4} id={titleId} textStyle="Heading/Subheading">Working with us</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">{`${studio.name} client portal`}</Text>
        </Stack>
        <Stack gap="sm" direction="column">
          {clientFaq.map((item, index) => (
            <Accordion key={item.id} theme="box" headingLevel={5} title={item.question} defaultExpanded={index === 0}>
              {item.answer}
            </Accordion>
          ))}
        </Stack>
      </Stack>
    </Card>
  );
}

/** Divider theme under a Search: one article open at a time, and the best match opens as you type. */
function HelpSearchExample() {
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState("");
  const results = matches(query);
  const search = (next: string) => {
    setQuery(next);
    setOpen(next.trim() ? (matches(next)[0]?.id ?? "") : "");
  };
  // Clear search leaves with the empty state, so focus goes back to the field, not to <body>.
  const clear = () => { search(""); searchRef.current?.focus(); };
  const count = plural(results.length, "article");
  return (
    <Stack gap="md">
      <Search ref={searchRef} placeholder="Search help articles" value={query} onValueChange={search} clearable />
      {/* The count labels the results under it: xs inside, md from the Search. */}
      <Stack gap="xs">
        <Text role="status" textStyle="Body/Small/Regular" tone="base">{query.trim() ? `${count} for “${query.trim()}”` : count}</Text>
        {results.length ? (
          <Stack gap="none">
            {results.map((article) => (
              <Accordion key={article.id} headingLevel={4} title={article.title}
                expanded={open === article.id} onExpandedChange={(next) => setOpen(next ? article.id : "")}>
                {article.body}
              </Accordion>
            ))}
          </Stack>
        ) : (
          <EmptyState size="sm" headingLevel={4} icon="icon-search-medium-line" title="No articles match"
            secondaryAction={{ label: "Clear search", onClick: clear }}>
            Try another word, or ask People Ops in the studio chat.
          </EmptyState>
        )}
      </Stack>
    </Stack>
  );
}

/** The People handbook's chapters: the Docs pane's navigation. Leave policy is the page this example draws. */
const handbookChapters: SidebarSection[] = [
  { label: "Welcome", items: [{ id: "how-we-work", label: "How the studio works" }, { id: "first-week", label: "Your first week" }] },
  { label: "Time off", items: [{ id: "leave", label: "Leave policy" }, { id: "holidays-2026", label: "2026 public holidays" }, { id: "remote", label: "Working remotely" }] },
  { label: "Pay and expenses", items: [{ id: "payday", label: "Payday and payslips" }, { id: "expenses", label: "Expenses" }, { id: "equipment", label: "Equipment budget" }] },
  { label: "Working together", items: [{ id: "conduct", label: "Code of conduct" }, { id: "reviews", label: "Feedback and reviews" }] },
];
const annualLeave = leaveBalance["Annual leave"]!;
const sickLeave = leaveBalance["Sick leave"]!;

/** The account button at the end of the header's top row, in its menu. */
function HandbookAccount() {
  const { toast } = useToast();
  return (
    <Menu align="end" trigger={<AppShellAccount name={me.name} src={me.photo} />} items={[
      { id: "profile", label: "Your profile", icon: "icon-user-circle-line", onSelect: () => toast({ title: me.name, children: `${me.role} · ${me.location}` }) },
      { id: "leave", label: "Your time off", icon: "icon-calendar-line", onSelect: () => toast({ title: `${annualLeave.left} days of annual leave left`, children: `Of ${annualLeave.perYear} this year.` }) },
      { type: "separator" },
      { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line", onSelect: () => toast({ title: `Signed out of ${studio.name}` }) },
    ]} />
  );
}

/** The width of the window the shell sits in, kept current: under 1024 the AppShell leaves the Docs pattern for its
 *  narrow layout, where the panes stack around the page. */
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

/**
 * The People handbook in the Docs pattern (reading): the chapters in the leading pane, the policy in the 720 reading
 * column, "On this page" and the reader's own balance in the trailing pane. Sections sit right under the page h1
 * (headingLevel 2, Large), with Expand all / Collapse all; a link in "On this page" opens its section and focuses it.
 */
function LeavePolicyExample() {
  const { toast } = useToast();
  const [open, setOpen] = useState<string[]>(["annual"]);
  const [query, setQuery] = useState("");
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  // A narrow window has no room for the chapters beside the page, and stacked above it they would push the policy off
  // the first screen: the trail leads back up instead, and the header keeps the studio and the utilities.
  const [frameRef, frameWidth] = useFrameWidth();
  const narrow = frameWidth > 0 && frameWidth < 1024;
  const allOpen = open.length === leavePolicy.length;
  const toggle = (id: string, next: boolean) => setOpen((current) => next ? [...current, id] : current.filter((openId) => openId !== id));
  // "On this page" opens the section and moves focus to its header button, so the reader lands on what they picked.
  const goTo = (id: string) => {
    setOpen((current) => (current.includes(id) ? current : [...current, id]));
    sectionRefs.current[id]?.querySelector<HTMLButtonElement>(".zen-accordion__trigger")?.focus();
  };
  const notHere = (label: string) => toast({ title: `${label} isn't part of this example`, children: "This page shows the Leave policy." });
  // The header Search filters the handbook's chapters as you type.
  const words = query.trim().toLowerCase();
  const chapters: SidebarSection[] = handbookChapters
    .map((chapter) => ({ ...chapter, items: chapter.items.filter((item) => !words || item.label.toLowerCase().includes(words)).map((item) => ({ ...item, selected: item.id === "leave" })) }))
    .filter((chapter) => chapter.items.length > 0);
  return (
    <PreviewAppFrame height={{ min: 640, max: 820 }} frameRef={frameRef}>
      {/* Docs on the Canvas: a 720 reading column between two equal Canvas panes (no box). The header keeps its top
          row (Figma Top-Header only): the handbook's name, its Search and the reader's utilities. */}
      <AppShell pattern="docs"
        header={(
          <AppShellHeader
            leading={(
              <Stack direction="row" gap="xs" align="center">
                <StudioLogo src={studio.logo} name={studio.name} />
                {narrow ? null : <Badge size="sm" theme="neutral" background="subtle" leadingIcon={false}>Handbook</Badge>}
              </Stack>
            )}
            center={narrow ? undefined : <Search placeholder="Search the handbook" aria-label="Search the handbook" value={query} onValueChange={setQuery} />}
            actions={<>
              <AppShellAction icon="icon-message-chat-circle-line" aria-label="Ask People Ops"
                onClick={() => toast({ title: `Message to ${people.minhAnh.name}`, children: "People Ops answers within a working day." })} />
              <HandbookAccount />
            </>}
          />
        )}
        leadingPane={narrow ? undefined : (
          <AppShellPane theme="canvas" aria-label="Handbook chapters">
            {chapters.length ? (
              <SidebarSubMenu sections={chapters} onItemClick={(item) => { if (item.id !== "leave") notHere(item.label); }} />
            ) : (
              <EmptyState size="sm" headingLevel={2} icon="icon-search-medium-line" title="No chapters match"
                secondaryAction={{ label: "Clear search", onClick: () => setQuery("") }}>Try “leave”, “expenses” or “remote”.</EmptyState>
            )}
          </AppShellPane>
        )}
        trailingPane={(
          <AppShellPane theme="canvas" aria-label="On this page">
            <Stack gap="lg">
              <Stack gap="sm">
                <Box paddingX="xs"><Text textStyle="All-Caps/S" tone="light">On this page</Text></Box>
                <Stack as="nav" gap="sm" paddingX="xs" aria-label="On this page">
                  {leavePolicy.map((section) => (
                    // zen-allow-link-underline: "On this page" is a list of plain Body/Small rows (as the Docs pattern draws it); the nav landmark says they are links.
                    <Text key={section.id} textStyle="Body/Small/Regular" tone={open.includes(section.id) ? "strongest" : "light"}>
                      <Link as="button" tone="inherit" underline="hover" onClick={() => goTo(section.id)}>{section.title}</Link>
                    </Text>
                  ))}
                </Stack>
              </Stack>
              <Divider />
              {/* The reader's own numbers next to the rules they read. */}
              <Stack gap="sm" paddingX="xs">
                <Text textStyle="All-Caps/S" tone="light">Your leave this year</Text>
                <DescriptionList items={[
                  { id: "annual", term: "Annual leave", description: `${annualLeave.left} of ${annualLeave.perYear} days left` },
                  { id: "sick", term: "Sick leave", description: `${sickLeave.left} of ${sickLeave.perYear} days left` },
                ]} />
                <Box>
                  <Button level="tertiary" size="sm" startIcon="icon-calendar-plus-line"
                    onClick={() => toast({ title: "Leave request started", children: "Pick your dates in Time off; your team lead gets the request." })}>Request leave</Button>
                </Box>
              </Stack>
            </Stack>
          </AppShellPane>
        )}
      >
        <Stack gap="xl">
          {/* The trail sits in the PageHeader, which turns it into Back to Time off on a phone. */}
          <PageHeader title="Leave policy"
            breadcrumbs={<Breadcrumbs master={false} items={[{ id: "handbook", label: "Handbook" }, { id: "time-off", label: "Time off" }, { id: "leave", label: "Leave policy" }]}
              onNavigate={(item, event) => { event.preventDefault(); notHere(item.id === "handbook" ? "The handbook's home" : "Time off"); }} />}
            description={`How annual, sick and parental leave work at the studio. Updated ${formatDate(policyUpdated)} by ${people.minhAnh.name}.`}
            actions={<Button level="tertiary" aria-expanded={allOpen} onClick={() => setOpen(allOpen ? [] : leavePolicy.map((section) => section.id))}>{allOpen ? "Collapse all" : "Expand all"}</Button>} />
          <InlineMessage theme="info" title="What changed in this update">
            Unused days now carry over until Mar 31 instead of Jan 31, so a Tết trip no longer costs you the days you saved.
          </InlineMessage>
          <Stack gap="none">
            {leavePolicy.map((section) => (
              <Accordion key={section.id} ref={(element) => { sectionRefs.current[section.id] = element; }} size="lg" headingLevel={2} title={section.title}
                expanded={open.includes(section.id)} onExpandedChange={(next) => toggle(section.id, next)}>
                <Stack gap="sm">{section.body.map((paragraph) => <Text key={paragraph} tone="base">{paragraph}</Text>)}</Stack>
              </Accordion>
            ))}
          </Stack>
        </Stack>
      </AppShell>
    </PreviewAppFrame>
  );
}

/** Filters in a Side Panel: one Accordion per facet, and each title carries its count so closed sections still show what is on. */
function ProjectFiltersExample() {
  const [open, setOpen] = useState(false);
  const [applied, setApplied] = useState(noPicks);
  const [draft, setDraft] = useState(noPicks);
  const [expanded, setExpanded] = useState<Facet[]>(["status"]);
  // The opened project stays set while its panel animates out.
  const [opened, setOpened] = useState<Project | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const rows = projects.filter(matchesPicks(applied));
  const draftCount = projects.filter(matchesPicks(draft)).length;
  const active = countPicks(applied);
  const openPanel = () => {
    setDraft(applied);
    // Sections with picks open by themselves; the first opens when nothing is picked yet.
    const picked = facets.filter((facet) => applied[facet.id].length).map((facet) => facet.id);
    setExpanded(picked.length ? picked : ["status"]);
    setOpen(true);
  };
  const toggle = (facet: Facet, option: string, on: boolean) =>
    setDraft((current) => ({ ...current, [facet]: on ? [...current[facet], option] : current[facet].filter((value) => value !== option) }));
  const apply = () => { setApplied(draft); setOpen(false); };
  return (
    <Stack gap="md">
      <Stack direction="row" gap="xs" align="center" justify="between">
        <Chip variant="advanced" leading="icon-filter-lines-line" aria-haspopup="dialog" aria-expanded={open}
          selected={active > 0} selectionMode="multiple" selectionCount={active}
          onClick={openPanel} onClearSelection={() => setApplied(noPicks)}>
          All filters
        </Chip>
        <Text role="status" textStyle="Body/Small/Regular" tone="base">{plural(rows.length, "project")}</Text>
      </Stack>
      {/* Clickable rows pad 0 at the sides: the ListBox's Body-Slot insets them and their fill (12px outside a row) stays inside it. */}
      <ListBox>
        <List aria-label="Projects">
          {rows.map((project) => (
            <ListItem key={project.id} leading={<DockIcon icon={project.icon} theme={project.theme} background="subtle" size="medium" />} title={project.name}
              caption={project.client} onClick={() => { setOpened(project); setDetailOpen(true); }}
              trailing={<Badge theme={projectStatusTheme[project.status]} background="subtle">{project.status}</Badge>} />
          ))}
        </List>
      </ListBox>
      {/* A row opens the project, so a name cut short on a narrow screen is always readable in full. */}
      <SidePanel type="modal" size="small" open={detailOpen} onOpenChange={setDetailOpen}
        title={opened?.name ?? ""} description={opened?.client}>
        {opened ? (
          <DescriptionList items={[
            { id: "status", term: "Status", description: <Badge theme={projectStatusTheme[opened.status]} background="subtle">{opened.status}</Badge> },
            { id: "lead", term: "Project lead", description: people[opened.lead].name },
            { id: "due", term: "Due", description: formatDate(opened.due) },
            { id: "progress", term: "Progress", description: `${opened.progress}%` },
          ]} />
        ) : null}
      </SidePanel>
      <SidePanel type="modal" size="small" open={open} onOpenChange={setOpen} title="Filters"
        primaryAction={{ label: `Show ${plural(draftCount, "project")}`, onClick: apply, disabled: draftCount === 0 }}
        secondaryAction={{ label: "Clear all", onClick: () => setDraft(noPicks) }}>
        <Stack gap="none">
          {facets.map((facet) => {
            const picked = draft[facet.id].length;
            return (
              <Accordion key={facet.id} headingLevel={3}
                title={<span className="px-accordion-facet">{facet.label}{picked ? <><BadgeCounter value={picked} aria-hidden="true" /><VisuallyHidden>{`, ${picked} selected`}</VisuallyHidden></> : null}</span>}
                expanded={expanded.includes(facet.id)}
                onExpandedChange={(next) => setExpanded((ids) => next ? [...ids, facet.id] : ids.filter((id) => id !== facet.id))}>
                <Stack gap="sm" role="group" aria-label={facet.label}>
                  {facet.options.map((option) => (
                    <Checkbox key={option} label={option} checked={draft[facet.id].includes(option)} onCheckedChange={(on) => toggle(facet.id, option, on)} />
                  ))}
                </Stack>
              </Accordion>
            );
          })}
        </Stack>
      </SidePanel>
    </Stack>
  );
}

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
      title={<span className="px-accordion-summary"><span>Order summary</span>{open ? null : <span>{total}</span>}</span>}>
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
const backButton = '.zen-top-nav__action[aria-label="Back"]';
const actionBarButton = ".zen-action-bar .zen-button";

function MobileOrderSummaryExample() {
  const { toast } = useToast();
  const screen = usePhoneScreen();
  const screenRef = useRef<HTMLDivElement>(null);
  const cartId = useId();
  const rewardsId = useId();
  const pickupId = useId();
  const paymentId = useId();
  const [step, setStep] = useState<CheckoutStep>("checkout");
  const [points, setPoints] = useState(true);
  const [pickup, setPickup] = useState<Pickup>("asap");
  // Each screen is its own PlatformPhone (key): it opens at the top and its bar measures the fold again.
  const go = (next: CheckoutStep, focus: string) => screen.go(focus, () => setStep(next));
  const total = formatMoney(totalWith(points), true);
  // Open on checkout, where the customer checks the lines; folded on the confirmation, one tap away.
  const summary = <OrderSummary defaultExpanded={step === "checkout"} points={points} />;

  if (step === "cart") {
    return (
      // The cart on the white screen (Canvas/Alt, so the Box summary and the rows need no card): the lines under the
      // store they are picked up at, the points as a Toggle (it applies at once), and the total with Check out pinned
      // in the Action bar (Figma Bottom=Actions).
      <PlatformPhone key={step} label="Phin & Co cart" canvas="surface" screenRef={screenRef}>
        <AppShell canvas="alt"
          topNavigation={<TopNavigation type="default" title="Cart" largeTitle="Cart" scrollRef={screenRef} />}
          actionBar={<ActionBar summary={<Text as="span" textStyle="Body/Base/Medium">{`Total ${total}`}</Text>}
            primaryAction={{ label: "Check out", onClick: () => go("checkout", backButton) }} />}>
          {screen.anchor}
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
      </PlatformPhone>
    );
  }

  if (step === "placed") {
    // An end state keeps a way out: Done starts again from the cart. The progress shows where the order is.
    return (
      <PlatformPhone key={step} label="Phin & Co order placed" canvas="surface" screenRef={screenRef}>
        <AppShell canvas="alt"
          topNavigation={<TopNavigation type="compact" title="Order placed" scrollRef={screenRef} />}
          actionBar={<ActionBar primaryAction={{ label: "Done", onClick: () => go("cart", actionBarButton) }}
            secondaryAction={{ label: "Get directions", onClick: () => toast({ title: `Directions to ${order.store}`, children: "42 Nguyen Hue, District 1 · 6 minutes on foot" }) }} />}>
          {screen.anchor}
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
      </PlatformPhone>
    );
  }

  return (
    // A pushed screen: the compact bar with Back, the order to check, when and where to pick it up, how it is paid, and
    // the one action pinned in the Action bar with the total on it.
    <PlatformPhone key={step} label="Phin & Co checkout" canvas="surface" screenRef={screenRef}>
      <AppShell canvas="alt"
        topNavigation={<TopNavigation type="compact" title="Checkout" scrollRef={screenRef}
          leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => go("cart", actionBarButton) }} />}
        actionBar={<ActionBar primaryAction={{ label: `Place order · ${total}`, onClick: () => go("placed", actionBarButton) }} />}>
        {screen.anchor}
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
    </PlatformPhone>
  );
}

/** Optional fields fold away in a form; a field with an error never stays hidden in a closed panel. */
function AdvancedOptionsExample() {
  const { toast } = useToast();
  const titleId = useId();
  const [name, setName] = useState("");
  const [client, setClient] = useState("Saola Outdoor");
  const [key, setKey] = useState("");
  const [budget, setBudget] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; key?: string }>({});
  const keyError = (value: string) => {
    if (!value) return undefined;
    if (!/^[A-Z]{2,5}$/.test(value)) return "Use 2–5 capital letters, like TRL";
    return takenKeys.includes(value) ? `${value} is already used by another project` : undefined;
  };
  const submit = () => {
    const next = { name: name.trim() ? undefined : "Enter a project name", key: keyError(key) };
    setErrors(next);
    // Form focuses the first invalid field once this renders, so the panel holding it opens first.
    if (next.key) setAdvanced(true);
    if (next.name || next.key) return;
    toast({ type: "positive", title: "Project created", children: `${name.trim()} for ${client}` });
    setName(""); setKey(""); setBudget(""); setAdvanced(false);
  };
  return (
    <Card theme="default">
      <Form onSubmit={submit} gap="md" aria-labelledby={titleId} noValidate>
        <Heading level={4} id={titleId} textStyle="Heading/Subheading">New project</Heading>
        <InputField label="Project name" value={name} onValueChange={setName} error={errors.name} />
        <SelectField label="Client" options={clientOptions} value={client} onValueChange={setClient} />
        <Accordion headingLevel={5} title="Advanced options" expanded={advanced} onExpandedChange={setAdvanced} defaultExpanded>
          <Stack gap="md">
            <InputField label="Project key" labelOptional value={key} onValueChange={(value) => setKey(value.toUpperCase())} error={errors.key}
              helpText="Starts every task key, like TRL-12" />
            <InputField label="Budget (USD)" labelOptional inputMode="numeric" value={budget} onValueChange={setBudget} />
          </Stack>
        </Accordion>
        <FormActions><Button level="primary" type="submit">Create project</Button></FormActions>
      </Form>
    </Card>
  );
}

// ——— Page ————————————————————————————————————————————————————————————————————————————————————

/* ───────────── Layer settings: Small sections in a panel ───────────── */

const px = (value: number) => `${value} px`;
const percent = (value: number) => `${Math.round(value * 100)}%`;

function LayerSettingsExample() {
  const titleId = useId();
  const [width, setWidth] = useState("1200 px");
  const [height, setHeight] = useState("630 px");
  const [fill, setFill] = useState("#1F6FEB");
  const [opacity, setOpacity] = useState(0.9);
  const [radius, setRadius] = useState(16);
  const [blur, setBlur] = useState(0);
  return (
    <Card theme="default" maxWidth={320} as="section" aria-labelledby={titleId}>
      <Stack gap="none">
        <Stack gap="xs" paddingY="md">
          <Heading level={4} id={titleId} textStyle="Heading/Subheading">Social banner</Heading>
          <Text tone="base" textStyle="Body/Small/Regular">Loyalty app launch · 1200 × 630</Text>
        </Stack>
        <Divider />
        {/* Small: Body/Base/Bold titles under the panel heading; Title → rows stays 12, one step above the rows' 8. */}
        <Accordion size="sm" headingLevel={5} title="Size" defaultExpanded contentWidth="full">
          <Stack gap="xs">
            <InputField layout="inline" size="sm" label="Width" value={width} onValueChange={setWidth} />
            <InputField layout="inline" size="sm" label="Height" value={height} onValueChange={setHeight} />
          </Stack>
        </Accordion>
        <Accordion size="sm" headingLevel={5} title="Fill" defaultExpanded contentWidth="full">
          <Stack gap="xs">
            <ColorField layout="inline" size="sm" label="Colour" value={fill} onValueChange={setFill} savedColors={["#1F6FEB", "#111111", "#FFFFFF"]} />
            <SliderField size="sm" label="Opacity" value={opacity} onValueChange={setOpacity} min={0} max={1} step={0.01} formatValue={percent} />
          </Stack>
        </Accordion>
        <Accordion size="sm" headingLevel={5} title="Corners and blur" contentWidth="full">
          <Stack gap="xs">
            <SliderField size="sm" label="Corner Radius" value={radius} onValueChange={setRadius} min={0} max={48} formatValue={px} />
            <SliderField size="sm" label="Background Blur" value={blur} onValueChange={setBlur} min={0} max={40} formatValue={px} />
          </Stack>
        </Accordion>
      </Stack>
    </Card>
  );
}

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Client FAQ",
    description: "A few standalone questions from the client portal in the Box theme, on a card so the Pale boxes stand out from the page. Each one opens on its own, and the first starts open so the card never looks empty.",
    render: () => <ClientFaqExample />,
    code: `<Card theme="default" as="section" aria-labelledby={titleId}>
  <Stack gap="md">
    <Heading level={4} id={titleId} textStyle="Heading/Subheading">Working with us</Heading>
    <Stack gap="sm" direction="column">
      {faq.map((item, index) => (
        <Accordion key={item.id} theme="box" headingLevel={5} title={item.question} defaultExpanded={index === 0}>
          {item.answer}
        </Accordion>
      ))}
    </Stack>
  </Stack>
</Card>`,
  },
  {
    title: "Search help articles",
    description: "A Divider list under a Search keeps one article open at a time and opens the best match as you type; when nothing matches, an Empty State offers Clear search.",
    render: () => <HelpSearchExample />,
    code: `const [query, setQuery] = useState("");
const [open, setOpen] = useState("");
const results = matches(query);
const search = (next: string) => { setQuery(next); setOpen(matches(next)[0]?.id ?? ""); };
const clear = () => { search(""); searchRef.current?.focus(); };

<Stack gap="md">
  <Search ref={searchRef} placeholder="Search help articles" value={query} onValueChange={search} clearable />
  <Stack gap="xs">
    <Text role="status" textStyle="Body/Small/Regular" tone="base">{plural(results.length, "article")}</Text>
    {results.length ? results.map((article) => (
      <Accordion key={article.id} headingLevel={4} title={article.title}
        expanded={open === article.id} onExpandedChange={(next) => setOpen(next ? article.id : "")}>
        {article.body}
      </Accordion>
    )) : (
      <EmptyState size="sm" headingLevel={4} icon="icon-search-medium-line" title="No articles match"
        secondaryAction={{ label: "Clear search", onClick: clear }}>
        Try another word, or ask People Ops in the studio chat.
      </EmptyState>
    )}
  </Stack>
</Stack>`,
  },
  {
    title: "Expand all sections",
    wide: true,
    screen: true,
    description: "The People handbook in the AppShell's Docs pattern: the chapters in the leading pane, the policy in the reading column, On this page and the reader's own balance in the trailing pane. The sections sit right under the page h1, so they are headingLevel 2 in the Large size; Expand all opens every section at once and turns into Collapse all, and a link in On this page opens its section and moves focus to it. In a narrow window the chapters step aside, and on a phone the trail turns into Back to Time off.",
    render: () => <LeavePolicyExample />,
    code: `const [open, setOpen] = useState<string[]>(["annual"]);
const allOpen = open.length === sections.length;
const goTo = (id: string) => { setOpen((ids) => ids.includes(id) ? ids : [...ids, id]); refs.current[id]?.querySelector("button")?.focus(); };

<AppShell
  pattern="docs" // reading: a 720 column between two Canvas panes
  header={<AppShellHeader leading={<StudioLogo … />} center={<Search placeholder="Search the handbook" value={query} onValueChange={setQuery} />}
    actions={<><AppShellAction icon="icon-message-chat-circle-line" aria-label="Ask People Ops" onClick={askPeopleOps} />
      <Menu align="end" trigger={<AppShellAccount name="Alex Duong" src={alex.photo} />} items={account} /></>} />}
  leadingPane={<AppShellPane theme="canvas" aria-label="Handbook chapters"><SidebarSubMenu sections={chapters} onItemClick={openChapter} /></AppShellPane>}
  trailingPane={<AppShellPane theme="canvas" aria-label="On this page">
    {/* zen-allow-link-underline: plain Body/Small rows in the On this page nav */}
    {sections.map((s) => <Link key={s.id} as="button" tone="inherit" underline="hover" onClick={() => goTo(s.id)}>{s.title}</Link>)}
    …your leave this year, Request leave…
  </AppShellPane>}
>
  <Stack gap="xl">
    <PageHeader title="Leave policy" description="How annual, sick and parental leave work at the studio."
      breadcrumbs={<Breadcrumbs master={false} items={[{ id: "handbook", label: "Handbook" }, { id: "time-off", label: "Time off" }, { id: "leave", label: "Leave policy" }]} onNavigate={go} />}
      actions={<Button level="tertiary" aria-expanded={allOpen} onClick={() => setOpen(allOpen ? [] : sections.map((s) => s.id))}>
        {allOpen ? "Collapse all" : "Expand all"}
      </Button>} />
    <Stack gap="none">
      {sections.map((section) => (
        <Accordion key={section.id} ref={(el) => { refs.current[section.id] = el; }} size="lg" headingLevel={2} title={section.title}
          expanded={open.includes(section.id)}
          onExpandedChange={(next) => setOpen((ids) => next ? [...ids, section.id] : ids.filter((id) => id !== section.id))}>
          {section.body}
        </Accordion>
      ))}
    </Stack>
  </Stack>
</AppShell>`,
  },
  {
    title: "Advanced options",
    description: "Optional fields fold away under Advanced options while the Create button stays outside. If a field inside has an error on submit, the section opens and the field takes focus.",
    render: () => <AdvancedOptionsExample />,
    code: `const [advanced, setAdvanced] = useState(false);
const submit = () => {
  const keyError = key && !/^[A-Z]{2,5}$/.test(key) ? "Use 2–5 capital letters, like TRL" : undefined;
  setErrors({ name: name ? undefined : "Enter a project name", key: keyError });
  if (keyError) setAdvanced(true); // Form then focuses the first invalid field inside it
};

<Form onSubmit={submit} gap="md">
  <InputField label="Project name" value={name} onValueChange={setName} error={errors.name} />
  <SelectField label="Client" options={clients} value={client} onValueChange={setClient} />
  <Accordion headingLevel={5} title="Advanced options" expanded={advanced} onExpandedChange={setAdvanced} defaultExpanded>
    <InputField label="Project key" labelOptional value={key} onValueChange={setKey} error={errors.key} helpText="Starts every task key, like TRL-12" />
    <InputField label="Budget (USD)" labelOptional value={budget} onValueChange={setBudget} />
  </Accordion>
  <FormActions><Button level="primary" type="submit">Create project</Button></FormActions>
</Form>`,
  },
  {
    title: "Filter sections",
    description: "Each facet of a filter panel is its own Accordion, so people open only the ones they need. The title carries a count of the picks, so a closed section still shows it is filtering, and the primary action shows how many projects will remain.",
    render: () => <ProjectFiltersExample />,
    code: `<SidePanel type="modal" size="small" open={open} onOpenChange={setOpen} title="Filters"
  primaryAction={{ label: \`Show \${plural(count, "project")}\`, onClick: apply, disabled: count === 0 }}
  secondaryAction={{ label: "Clear all", onClick: clearAll }}>
  {facets.map((facet) => (
    <Accordion key={facet.id} headingLevel={3}
      title={<span className="facet-title">{facet.label}{picked(facet) ? <BadgeCounter value={picked(facet)} /> : null}</span>}
      expanded={expanded.includes(facet.id)} onExpandedChange={(next) => toggleSection(facet.id, next)}>
      {facet.options.map((option) => (
        <Checkbox key={option} label={option} checked={isPicked(facet, option)} onCheckedChange={(on) => pick(facet, option, on)} />
      ))}
    </Accordion>
  ))}
</SidePanel>
/* .facet-title { display: inline-flex; align-items: center; gap: var(--zen-spacing-gap-2-xsmall); } */`,
  },
  {
    title: "Layer settings",
    description: "Small (size=\"sm\") is for dense panels and cards: its Body/Base/Bold titles sit under the panel heading and group short rows of inline fields and sliders. Size and Fill start open; Corners and blur, used less, waits closed.",
    render: () => <LayerSettingsExample />,
    code: `<Card theme="default" maxWidth={320} as="section" aria-labelledby={titleId}>
  <Stack gap="none">
    <Stack gap="xs" paddingY="md">
      <Heading level={4} id={titleId} textStyle="Heading/Subheading">Social banner</Heading>
      <Text tone="base" textStyle="Body/Small/Regular">Loyalty app launch · 1200 × 630</Text>
    </Stack>
    <Divider />
    <Accordion size="sm" headingLevel={5} title="Size" defaultExpanded contentWidth="full">
      <Stack gap="xs">
        <InputField layout="inline" size="sm" label="Width" value={width} onValueChange={setWidth} />
        <InputField layout="inline" size="sm" label="Height" value={height} onValueChange={setHeight} />
      </Stack>
    </Accordion>
    <Accordion size="sm" headingLevel={5} title="Fill" defaultExpanded contentWidth="full">
      <Stack gap="xs">
        <ColorField layout="inline" size="sm" label="Colour" value={fill} onValueChange={setFill} />
        <SliderField size="sm" label="Opacity" value={opacity} onValueChange={setOpacity} min={0} max={1} step={0.01} formatValue={percent} />
      </Stack>
    </Accordion>
    <Accordion size="sm" headingLevel={5} title="Corners and blur" contentWidth="full">
      <Stack gap="xs">
        <SliderField size="sm" label="Corner Radius" value={radius} onValueChange={setRadius} min={0} max={48} formatValue={px} />
        <SliderField size="sm" label="Background Blur" value={blur} onValueChange={setBlur} min={0} max={40} formatValue={px} />
      </Stack>
    </Accordion>
  </Stack>
</Card>`,
  },
  {
    title: "Mobile order summary",
    description: "Checkout opens from the cart with a Back chevron. The order sits in a Box accordion at the top, open while the customer checks it: the cart's rows with their options, then Subtotal, the points (when the cart's Toggle uses them) and Total, with the prices running to the box edge (contentWidth=\"full\"). Folded, the total moves into the title and stays on Place order, so nothing they pay for is hidden. After the order the same summary waits folded under the order's progress, and Done goes back to the cart. Each screen is the AppShell's mobile Bar with the Action bar (Figma Bottom=Actions).",
    render: () => <MobileOrderSummaryExample />,
    code: `const screenRef = useRef<HTMLDivElement>(null);

// One PlatformPhone per screen (key), so each opens at the top; the bar follows the scroll.
<PlatformPhone key="checkout" canvas="surface" screenRef={screenRef}>
  <AppShell canvas="alt"
    topNavigation={<TopNavigation type="compact" title="Checkout" scrollRef={screenRef}
      leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: backToCart }} />}
    actionBar={<ActionBar primaryAction={{ label: "Place order · $9.40", onClick: placeOrder }} />}>
    {/* The Body pads the screen and spaces its sections; folded, the title carries the total. */}
    <Accordion theme="box" headingLevel={2} contentWidth="full" expanded={open} onExpandedChange={setOpen}
      title={<span className="summary-title"><span>Order summary</span>{open ? null : <span>$9.40</span>}</span>}>
      <Stack gap="md">
        <List aria-label="Items in your order">
          <ListItem leading={<DockIcon theme="emoji" emoji="☕" size="medium" />} title="Phin sữa đá × 2" caption="Large · less ice"
            trailing={<Text as="span" textStyle="Body/Base/Medium" tone="strongest">$5.20</Text>} />
          …
        </List>
        <Divider />
        <DescriptionList items={[
          { term: "Subtotal", description: "$10.70" },
          { term: "200 points redeemed", description: <Text as="span" textStyle="Body/Base/Medium" tone="positive">−$1.30</Text> },
          { term: "Total", description: "$9.40", emphasis: true },
        ]} />
      </Stack>
    </Accordion>
    <Stack as="section" gap="sm" aria-labelledby="pickup">
      <Heading level={2} id="pickup" textStyle="Body/Small/Bold" tone="light">Pickup</Heading>
      <List aria-labelledby="pickup"><ListItem leading={pin} title="Phin & Co Nguyen Hue" caption="Ready in about 10 minutes" /></List>
      <Segmented fullWidth aria-label="Pickup time" options={pickupTimes} value={pickup} onValueChange={setPickup} />
    </Stack>
    …Payment…
  </AppShell>
</PlatformPhone>
/* .summary-title { display: flex; justify-content: space-between; gap: var(--zen-spacing-gap-xsmall); } */`
  },
]);

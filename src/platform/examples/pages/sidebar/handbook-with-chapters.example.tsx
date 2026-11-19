import { useId, useState, type ReactNode } from "react";
import {
  AppShell, AppShellAccount, AppShellAction, AppShellHeader, Avatar, Breadcrumbs, Button, Card, DescriptionList, DockIcon, EmptyState, Grid, Heading, Link,
  List, ListBox, ListItem, Menu, PageHeader, Search, Sidebar, SidebarMenuItem, SidebarMenuSection, Stack, Text, Thumbnail, plural, useToast, useZen,
  type BreadcrumbItemData, type IconName,
} from "@zen-ds/react";
import { daysFromToday, formatDate, initials, me, people, peopleList, studio, type Person, type PersonId, type Team } from "../../data";

// ——— The rows of a page ————————————————————————————————————————————————————————————————————————————————
type Row = { id: string; title: string; caption: string; leading: ReactNode; trailing?: ReactNode; onClick?: () => void };

const personAvatar = (p: Person) => p.photo
  ? <Avatar size="medium" theme="photo" src={p.photo} alt="" />
  : <Avatar size="medium" theme={p.theme} alt="">{initials(p.name)}</Avatar>;
const itemIcon = (icon: IconName) => <DockIcon icon={icon} theme="neutral" background="subtle" size="medium" />;
const firstName = (p: Person) => p.name.split(" ")[0];
const personRow = (p: Person): Row => ({ id: p.id, title: p.name, caption: `${p.role} · ${p.location}`, leading: personAvatar(p) });

/** One list in a ListBox. On the white Flat Canvas (with a Flat Sidebar) the ListBox takes the Pale border (usage rules
 *  §16). `heading`: a titled section (Heading/Subheading, its rows named by it), with an optional See all link to the
 *  page that holds the rest. */
function RowCard({ label, rows, heading = false, seeAll }: { label: string; rows: Row[]; heading?: boolean; seeAll?: () => void }) {
  const headingId = useId();
  // A list on a phone-width screen keeps the title readable: the row’s Badge waits on the page the row opens.
  const narrow = useZen()?.breakpoint === "mobile";
  return (
    <ListBox as={heading ? "section" : "div"} aria-labelledby={heading ? headingId : undefined} theme="border" header={heading ? (
      <Stack direction="row" justify="between" align="center" gap="xs">
        <Heading level={2} id={headingId} textStyle="Heading/Subheading">{label}</Heading>
        {/* A section head’s See all is underlined text, not a button. */}
        {seeAll ? <Text as="span" textStyle="Body/Small/Bold"><Link as="button" tone="inherit" onClick={seeAll}>See all</Link></Text> : null}
      </Stack>
    ) : undefined}>
      <List aria-label={heading ? undefined : label} aria-labelledby={heading ? headingId : undefined}>
        {rows.map(({ id, trailing, ...row }) => <ListItem key={id} as="li" titleLines={2} {...row} trailing={narrow ? undefined : trailing} />)}
      </List>
    </ListBox>
  );
}
/** Cards take the Pale border too, like the ListBox beside them. */
const detailsCard = (items: { term: string; description: ReactNode }[]) => <Card theme="border"><DescriptionList items={items} /></Card>;

// ——— The page in the header ——————————————————————————————————————————————————————————————————————————
/** A crumb of the header’s trail; `go` opens its page. */
type Crumb = BreadcrumbItemData & { go?: () => void };
/** What a page shows: its PageHeader (the header’s Main row), its trail (the top row) and its Body. */
type View = { title: string; description?: ReactNode; meta?: ReactNode; actions?: ReactNode; crumbs?: Crumb[]; body: ReactNode };
const pageHeader = ({ title, description, meta, actions }: View) => <PageHeader title={title} description={description} meta={meta} actions={actions} />;
/** The trail’s crumbs open their pages in place (client-side routing). */
const follow = (crumbs: Crumb[]) => (item: BreadcrumbItemData, event: { preventDefault: () => void }) => { event.preventDefault(); crumbs.find((crumb) => crumb.id === item.id)?.go?.(); };

/** The account button at the end of the header’s top row, with its menu. */
function AccountMenu({ onSettings }: { onSettings?: () => void }) {
  const { toast } = useToast();
  return (
    <Menu align="end" trigger={<AppShellAccount name={me.name} src={me.photo} />} items={[
      { id: "profile", label: "Profile", icon: "icon-user-circle-line", onSelect: () => toast({ title: me.name, children: `${me.role} · ${me.email}` }) },
      { id: "settings", label: "Settings", icon: "icon-settings-01-line", onSelect: () => (onSettings ? onSettings() : toast({ title: "Settings", children: "Notifications, security and billing." })) },
      { type: "separator" },
      { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line", onSelect: () => toast({ title: "Signed out", children: `See you soon, ${firstName(me)}.` }) },
    ]} />
  );
}

/* The studio's mark and name. The Small-Density logo slot is 20px tall: the mark is a 2xs Thumbnail that fits it, the
   name takes Body/Small/Bold; the row and the mark keep the slot's height (at Comfortable they would grow by 2px). */
const handbookLogo = <Stack direction="row" gap="xs" align="center" style={{ height: "100%" }}><Thumbnail src={studio.logo} alt="" size="2xs" style={{ width: "auto", height: "100%", aspectRatio: "1" }} /><Text as="span" textStyle="Body/Small/Bold">{studio.name}</Text></Stack>;
const handbookMark = <Thumbnail src={studio.logo} alt={studio.name} size="2xs" />;

// ——— The studio handbook ————————————————————————————————————————————————————————————————————————————
type Doc = { id: string; title: string; summary: string; owner: PersonId; updated: Date; points: string[] };
type Chapter = { id: string; label: string; icon: IconName; docs: Doc[] };
const handbook: Chapter[] = [
  { id: "start", label: "Getting started", icon: "icon-rocket-line", docs: [
    { id: "welcome", title: "Welcome to Đìzai", summary: "Who we are, how the studio is organised and the people to meet in your first week.", owner: "minhAnh", updated: daysFromToday(-12), points: ["Đìzai has 48 people in Ho Chi Minh City, Hanoi and Singapore, in five teams.", "Your first week: a studio tour on Monday, lunch with your team on Wednesday and a project to shadow on Friday.", "Your buddy comes from another team; Minh Anh pairs you before your first day."] },
    { id: "accounts", title: "Tools and accounts", summary: "Figma, Zen and the client tools you get on day one, and who to ask for access.", owner: "finn", updated: daysFromToday(-3), points: ["Google Workspace, Figma, Zen and Slack are ready on your first morning.", "Client tools (their Jira, Confluence or Figma) come from the account director on the project.", "Lost access or a new laptop? Ask in #it-help; someone answers within the hour."] },
  ] },
  { id: "work", label: "How we work", icon: "icon-layers-three-01-line", docs: [
    { id: "design-reviews", title: "Design reviews", summary: "When to ask for a review, how to prepare the file and how feedback is given.", owner: "alex", updated: daysFromToday(-1), points: ["Ask for a review when a flow works end to end, not when every screen is polished.", "Share the Figma link with the question you want answered and the decision it unblocks.", "Reviewers reply within one working day, in comments on the file: kind, specific and with a reason."] },
    { id: "code-reviews", title: "Code reviews", summary: "Pull request size, who reviews what, and how fast a review should come back.", owner: "finn", updated: daysFromToday(-9), points: ["Keep pull requests under 400 lines, and split a refactor from the feature that needs it.", "The project’s tech lead reviews; a second engineer joins for anything that touches payments or sign-in.", "A first review comes back within four working hours."] },
    { id: "client-meetings", title: "Client meetings", summary: "Agendas, notes and the follow-up email every client gets within a day.", owner: "hana", updated: daysFromToday(-21), points: ["Send the agenda a day before, with the decisions you need from the client.", "One person takes the notes in Zen while the meeting runs.", "The follow-up email with decisions and next steps goes out within a day."] },
  ] },
  { id: "people-ops", label: "People", icon: "icon-users-line", docs: [
    { id: "time-off", title: "Time off", summary: "Annual leave, sick days and how to ask for time off in Zen.", owner: "minhAnh", updated: daysFromToday(-2), points: ["Everyone gets 18 days of annual leave a year, plus the public holidays where they live.", "Ask in Zen under Time off at least two weeks ahead for more than three days in a row.", "Sick days need no approval: tell your lead, then log them when you are back."] },
    { id: "holidays", title: "Public holidays in Vietnam and Singapore", summary: "The 2026 holiday calendar for the Ho Chi Minh City, Hanoi and Singapore teams.", owner: "minhAnh", updated: daysFromToday(-30), points: ["Vietnam: Tết (five days around Feb 17), Hùng Kings’ Day, Apr 30 – May 1 and Sep 1 – 2.", "Singapore: Chinese New Year (Feb 17 – 18), Good Friday (Apr 3), National Day (Aug 9) and Christmas Day.", "Working with a client in another country? Check their holidays before you book a review."] },
  ] },
  { id: "money", label: "Expenses", icon: "icon-receipt-line", docs: [
    { id: "claims", title: "Claiming expenses", summary: "What the studio pays for, receipts, and when the money reaches your account.", owner: "mai", updated: daysFromToday(-6), points: ["The studio pays for client travel, books and courses (up to $500 a year) and one home office set-up.", "Add the receipt in Zen under Expenses within 30 days.", "Approved claims are paid with your next salary, on the 25th."] },
  ] },
];
const allDocs = handbook.flatMap((chapter) => chapter.docs.map((doc) => ({ ...doc, chapter: chapter.label, chapterId: chapter.id, icon: chapter.icon })));
const teams: { id: string; label: string; team: Team; icon: IconName }[] = [
  { id: "team-design", label: "Design", team: "Design", icon: "icon-palette-line" },
  { id: "team-engineering", label: "Engineering", team: "Engineering", icon: "icon-code-02-line" },
  { id: "team-delivery", label: "Delivery", team: "Delivery", icon: "icon-target-04-line" },
];

export default function HandbookNavigation() {
  const { toast } = useToast();
  // Opens on a handbook page: its chapter open in the Sidebar, its trail in the header.
  const [page, setPage] = useState("design-reviews");
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState("");
  const [changes, setChanges] = useState(true);

  const open = (id: string) => { setPage(id); setQuery(""); };
  const docRow = (doc: (typeof allDocs)[number]): Row => ({ id: doc.id, title: doc.title, caption: `${doc.chapter} · Updated ${formatDate(doc.updated)} by ${people[doc.owner].name}`, leading: itemIcon(doc.icon), onClick: () => open(doc.id) });
  const q = query.trim().toLowerCase();
  const doc = allDocs.find((d) => d.id === page);
  const chapter = handbook.find((c) => c.id === page);
  const team = teams.find((t) => t.id === page);
  let view: View;
  if (q) {
    const found = allDocs.filter((d) => `${d.title} ${d.summary}`.toLowerCase().includes(q));
    view = {
      title: "Search results",
      description: found.length ? `${plural(found.length, "page")} for “${query.trim()}”` : `No handbook page mentions “${query.trim()}”`,
      body: found.length ? <RowCard label="Search results" rows={found.map(docRow)} /> : (
        <EmptyState headingLevel={2} title="No pages match" icon="icon-search-medium-line" secondaryAction={{ label: "Show recent pages", onClick: () => setQuery("") }}>
          Try another word, like “leave” or “review”.
        </EmptyState>
      ),
    };
  } else if (doc) {
    const siblings = allDocs.filter((d) => d.chapterId === doc.chapterId && d.id !== doc.id);
    view = {
      // The trail names the chapter, so the page needs no eyebrow; the chapter crumb opens the chapter’s own page.
      crumbs: [{ id: doc.chapterId, label: doc.chapter, go: () => open(doc.chapterId) }, { id: doc.id, label: doc.title }],
      title: doc.title,
      description: doc.summary,
      actions: <Button level="tertiary" startIcon="icon-link-01-line" onClick={() => toast({ title: "Link copied", children: `${studio.domain}/handbook/${doc.id}` })}>Copy link</Button>,
      // The page reads in the wide column; who owns it and what else the chapter holds sit beside it.
      body: (
        <Grid columns="minmax(0, 2fr) minmax(0, 1fr)" stackBelow={720} gap="md" align="start">
          <Card theme="border">
            <Stack gap="md">
              <Heading level={2} textStyle="Heading/Subheading">In short</Heading>
              <Stack as="ol" gap="sm">
                {doc.points.map((point) => <Text key={point} as="li">{point}</Text>)}
              </Stack>
            </Stack>
          </Card>
          <Stack gap="md">
            {detailsCard([{ term: "Owner", description: people[doc.owner].name }, { term: "Updated", description: formatDate(doc.updated) }, { term: "Applies to", description: "Everyone" }])}
            {siblings.length ? <RowCard heading label={`More in ${doc.chapter}`} rows={siblings.map(docRow)} /> : null}
          </Stack>
        </Grid>
      ),
    };
  } else if (chapter) {
    view = { title: chapter.label, description: plural(chapter.docs.length, "page"), body: <RowCard label={chapter.label} rows={allDocs.filter((d) => d.chapterId === chapter.id).map(docRow)} /> };
  } else if (team) {
    const members = peopleList.filter((p) => p.team === team.team);
    view = { title: `${team.label} team`, description: plural(members.length, "person", "people"), body: <RowCard label={`${team.label} team`} rows={members.map(personRow)} /> };
  } else {
    view = { title: "Recently updated", description: "Handbook pages changed in the last month", body: <RowCard label="Recently updated" rows={[...allDocs].sort((a, b) => +b.updated - +a.updated).map(docRow)} /> };
  }

  return (
    // Canvas/Flat → Sidebar background="flat": navigation and page read as one plane.
    <AppShell canvas="flat" sidebarCollapsed={collapsed} onSidebarCollapsedChange={setCollapsed}
      sidebar={(
        <Sidebar
          variant="small-density"
          background="flat"
          logo={handbookLogo}
          logoCollapsed={handbookMark}
          search={<Search size="small" placeholder="Search handbook" aria-label="Search handbook" value={query} onValueChange={setQuery} />}
          selectedId={q ? undefined : page}
          // A chapter opens in place; on the collapsed rail it expands the Sidebar first so its pages show.
          onItemClick={(item) => { if (!handbook.some((c) => c.id === item.id)) open(item.id); else if (collapsed) setCollapsed(false); }}
        >
          {/* Figma Body-Content as children: Menu-Items and titled groups, the same rows as a sections array. */}
          <SidebarMenuItem id="recent" label="Recently updated" icon="icon-clock-line" />
          {/* Chapters open in place (one level deep); the chapter holding the open page opens by itself. */}
          <SidebarMenuSection label="Handbook">
            {handbook.map((c) => (
              <SidebarMenuItem key={c.id} id={c.id} label={c.label} icon={c.icon}>
                {c.docs.map((d) => <SidebarMenuItem key={d.id} id={d.id} label={d.title} />)}
              </SidebarMenuItem>
            ))}
          </SidebarMenuSection>
          <SidebarMenuSection label="Teams">
            {teams.map((t) => <SidebarMenuItem key={t.id} id={t.id} label={t.label} icon={t.icon} />)}
          </SidebarMenuSection>
        </Sidebar>
      )}
      header={(
        <AppShellHeader
          leading={view.crumbs ? <Breadcrumbs master={false} items={view.crumbs} onNavigate={follow(view.crumbs)} /> : undefined}
          actions={<>
            <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" dot={changes}
              onClick={() => { setChanges(false); toast({ title: "2 pages changed this week", children: "Design reviews and Time off" }); }} />
            <AccountMenu />
          </>}
          main={pageHeader(view)}
        />
      )}
    >
      {view.body}
    </AppShell>
  );
}

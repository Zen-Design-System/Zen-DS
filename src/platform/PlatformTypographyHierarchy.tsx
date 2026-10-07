import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { Badge } from "../components/Badge";
import { BottomSheet } from "../components/BottomSheet";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { DescriptionList } from "../components/DescriptionList";
import { InputField } from "../components/Input";
import { Stack } from "../components/Layout";
import { List, ListItem } from "../components/ListItem";
import { PageHeader } from "../components/PageHeader";
import { Heading, Text, plural } from "../components/Text";
import { useToast } from "../components/Toast";
import { TopNavigation } from "../components/TopNavigation";
import { VisuallyHidden } from "../components/VisuallyHidden";
import { typographyStyles } from "../tokens/typography.generated";
import type { ExampleDef } from "./appLayer/types";
import { PlatformPhone, usePhoneScreen } from "./PlatformPhone";
import { phoneMoney, phoneOrderAddress, phoneOrderPrints, phoneOrderSubtotal, phoneOrders, phonePrints, phoneShipping } from "./phoneOrders";
import { DemoFieldDialog } from "./PlatformDemoActions";

/*
 * Typography › Content hierarchy: which heading and text style each kind of content takes on each kind of page.
 * Sources: Figma Header/Dashboard Level=Master + Primitives/Dashboard/Header (Heading/1 title, Child-Heading, Body/Base/Regular
 * SubHeading), the ◆ templates (Heading/4 sections, Heading/Subheading card titles, Display/4 values, Body/Base row titles,
 * Caption meta), Top-Navigation/Mobile (Heading/1 large title, Body/Extra/Bold bar title), and Apple HIG — Typography,
 * Toolbars (large titles), VoiceOver (titles and headings). Checked against Material 3, Primer, Polaris, Carbon, Fluent,
 * GOV.UK, the WAI headings tutorial, WCAG 1.3.1 / 2.4.2 and the HTML outline rules; the verdicts and the decisions the
 * user approved are in docs/context/typography-hierarchy-review-2026-09-29.md. Font sizes are the Figma styles as they
 * are; nothing is resized. Phone examples render in the Mobile typography mode (PlatformPhone).
 */

const styleNames = Object.fromEntries(Object.entries(typographyStyles).map(([name, className]) => [className, name]));

type OutlineRow = { level: number | null; text: string; style: string };

/** Reads the real headings of the UI beside it (a phone's bar title is its h1), so every example shows its own outline. */
function OutlineReadout({ rootRef }: { rootRef: RefObject<HTMLDivElement | null> }) {
  const [rows, setRows] = useState<OutlineRow[]>([]);
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const read = () => {
      const next: OutlineRow[] = [];
      for (const el of root.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, h6, [role='heading']")) {
        if (el.closest("[aria-hidden='true']")) continue;
        // A heading that wraps its content (the TopNavigation identity button) takes the style of the text inside.
        const style = [el, ...el.querySelectorAll<HTMLElement>("[class]")].flatMap((node) => [...node.classList]).map((name) => styleNames[name]).find(Boolean) ?? "—";
        const level = /^H[1-6]$/.test(el.tagName) ? Number(el.tagName[1]) : Number(el.getAttribute("aria-level")) || 2;
        next.push({ level, text: (el.textContent ?? "").trim(), style });
      }
      setRows((current) => (JSON.stringify(current) === JSON.stringify(next) ? current : next));
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["data-visible", "class"] });
    return () => observer.disconnect();
  }, [rootRef]);
  return (
    <aside className="pth-outline" aria-label="Heading outline">
      <Text as="span" textStyle="Body/Small/Bold">Outline</Text>
      <ol className="pth-outline__list">
        {rows.map((row, index) => (
          <li key={index} className="pth-outline__row" style={{ paddingInlineStart: row.level ? (row.level - 1) * 12 : 0 }}>
            <span className={`pth-outline__tag ${typographyStyles["Body/Code/Bold"]}`}>{row.level ? `h${row.level}` : "bar"}</span>
            <span className="pth-outline__text">{row.text}</span>
            <Text as="span" textStyle="Caption/Regular" tone="light">{row.style}</Text>
          </li>
        ))}
      </ol>
    </aside>
  );
}

function Demo({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div className="pth-demo">
      <div ref={ref} className="pth-demo__ui">{children}</div>
      <OutlineReadout rootRef={ref} />
    </div>
  );
}

/** Master page (a sidebar destination): h1 Heading/1 → h2 Heading/4 sections → h3 Heading/Subheading cards. */
function MasterPageExample() {
  const { toast } = useToast();
  const [requests, setRequests] = useState(3);
  return (
    <Demo>
      <div className="pth-page">
        <PageHeader title="Workbench" description="Requests and balances for the Design team."
          actions={<><Button level="tertiary" size="sm" onClick={() => toast({ type: "positive", title: `Exported ${plural(requests, "request")} as CSV` })}>Export</Button><Button level="primary" size="sm" onClick={() => setRequests((count) => count + 1)}>New request</Button></>} />
        <section className="pth-section">
          <Heading level={2} textStyle="Heading/4">Time off</Heading>
          <div className="pth-cards">
            {[["Annual leave", "12", "days remaining"], ["Sick leave", "4", "days remaining"]].map(([title, value, meta]) => (
              <Card key={title} theme="flat" spacing="small">
                <Stack gap="2xs">
                  <Heading level={3} textStyle="Heading/Subheading">{title}</Heading>
                  {/* A value is big, but it is not a heading: Display/4 in a span. */}
                  <Text as="span" textStyle="Display/4">{value}</Text>
                  <Text as="span" textStyle="Body/Small/Regular" tone="base">{meta}</Text>
                </Stack>
              </Card>
            ))}
          </div>
        </section>
        <section className="pth-section">
          <Heading level={2} textStyle="Heading/4">Recent requests</Heading>
          {/* Rows have no side padding of their own: the page pads them (24px), so they line up with the headings. */}
          <List aria-label="Recent requests">
            {Array.from({ length: Math.min(requests, 4) }, (_, index) => (
              <ListItem key={index} title={index === 0 ? "Annual leave · 3 days" : index === 1 ? "Sick leave · 1 day" : `Remote day · Oct ${index}`} caption={index === 0 ? "Ava Chen · Approved" : "Bao Nguyen · Pending"} />
            ))}
          </List>
        </section>
      </div>
    </Demo>
  );
}

/** Child page (an item under a master page): Back named after the parent, the item's name as h1 Heading/1, same section ladder. */
function ChildPageExample() {
  const [back, setBack] = useState(false);
  // Edit changes the dates; the description and details follow.
  const [dates, setDates] = useState("Oct 14 – Oct 16, 2026");
  const [editing, setEditing] = useState(false);
  return (
    <Demo>
      <div className="pth-page">
        <PageHeader back={{ label: back ? "Time off (pressed)" : "Time off", onClick: () => setBack(true) }} title="Annual leave"
          meta={<Badge size="small" theme="green" background="subtle">Approved</Badge>} description={`Ava Chen · 3 days, ${dates}.`}
          actions={<><Button level="tertiary" size="sm" onClick={() => setEditing(true)}>Edit</Button></>} />
        <section className="pth-section">
          <Heading level={2} textStyle="Heading/4">Details</Heading>
          <DescriptionList items={[{ term: "Type", description: "Annual leave" }, { term: "Dates", description: dates }, { term: "Approver", description: "Chi Tran" }]} />
        </section>
        <section className="pth-section">
          <Heading level={2} textStyle="Heading/4">Activity</Heading>
          <List aria-label="Activity">
            <ListItem title="Chi Tran approved the request" caption="2 hours ago" />
            <ListItem title="Ava Chen submitted the request" caption="Yesterday" />
          </List>
        </section>
      </div>
      <DemoFieldDialog open={editing} onOpenChange={setEditing} title="Edit request" description="Chi Tran approves the change again."
        field={{ kind: "name", label: "Dates", placeholder: dates }} submitLabel="Save" confirm={(value) => `Dates changed to ${value}`} onSubmit={setDates} />
    </Demo>
  );
}

/** Master screen on a phone (a tab root): the TopNavigation large title is the h1 (Heading/1); once collapsed the
 *  Body/Extra/Bold bar title is the h1, so the screen has exactly one h1 before and after scrolling. */
function MasterScreenExample() {
  // The large title folds with the screen's scroll (scrollRef). New message opens a compose sheet; the new chat lands on
  // top of All chats.
  const screenRef = useRef<HTMLDivElement>(null);
  const [composing, setComposing] = useState(false);
  const [to, setTo] = useState("");
  const [started, setStarted] = useState<string[]>([]);
  const chats = [["Design team", "Chi: Standup moved to 10:30", "9:41 am"], ["Ava Chen", "Did you get the brand files?", "9:12 am"], ["Bao Nguyen", "Merged the token PR", "Yesterday"], ["Duy Le", "Can you review the icons?", "Mon"], ["Emi Sato", "Lunch at 12?", "Sun"], ["Finn Walker", "Slides are in the shared folder", "Sat"], ["Gia Pham", "Can we move the review?", "Fri"], ["Hana Kim", "Invoice sent", "Thu"], ["Ivy Tran", "See you at the launch", "Wed"], ["Khoa Vo", "The build is green", "Tue"], ["Linh Do", "Can you share the deck?", "Mon"], ["Minh Ho", "Booked the room", "Sep 12"], ["Nam Bui", "Thanks for the notes", "Sep 11"], ["Oanh Ly", "Photos from the event", "Sep 10"]];
  return (
    <Demo>
      <PlatformPhone label="Master screen" headerOverlay screenRef={screenRef} header={<TopNavigation title="Chats" largeTitle="Chats" scrollRef={screenRef} trailing={[{ icon: "icon-edit-02-line", label: "New message", onClick: () => setComposing(true) }]} />}>
        {/* Static rows (no row opens a chat in this demo) sit in the screen margin; each kicker sits xs above its list. */}
        <Stack gap="lg" padding="lg">
          <Stack as="section" gap="xs">
            <Heading level={2} textStyle="Body/Small/Bold" tone="light">Pinned</Heading>
            <List aria-label="Pinned chats">
              <ListItem title={chats[0][0]} caption={chats[0][1]} trailing={<Text as="span" textStyle="Caption/Regular" tone="light">{chats[0][2]}</Text>} />
            </List>
          </Stack>
          <Stack as="section" gap="xs">
            <Heading level={2} textStyle="Body/Small/Bold" tone="light">All chats</Heading>
            <List aria-label="All chats">
              {[...started.map((name) => [name, "You: Hi!", "Now"]), ...chats.slice(1)].map(([name, preview, time]) => <ListItem key={name} title={name} caption={preview} trailing={<Text as="span" textStyle="Caption/Regular" tone="light">{time}</Text>} />)}
            </List>
          </Stack>
        </Stack>
        <BottomSheet inline open={composing} onOpenChange={setComposing} title="New message"
          primaryAction={{ label: "Start chat", disabled: !to.trim() || started.includes(to.trim()), onClick: () => { setStarted((list) => [to.trim(), ...list]); setTo(""); setComposing(false); } }} secondaryAction={{ label: "Cancel" }}>
          <InputField label="To" placeholder="Name or email" value={to} onValueChange={setTo} data-autofocus="" />
        </BottomSheet>
      </PlatformPhone>
    </Demo>
  );
}

/** Child screen on a phone (pushed): the compact bar title is the screen's h1 in its bar style (Body/Extra/Bold); the key
 *  status is a line of text, sections are h2 Heading/4 and the groups inside a section h3 Heading/Subheading. */
function ChildScreenExample() {
  // Opens on order #1042. Back goes up to a real Orders root, and every order opens its own screen; focus lands on the
  // next screen's control. One key per screen, so each screen opens at the top.
  const [openId, setOpenId] = useState<string | null>("#1042");
  const screenRef = useRef<HTMLDivElement>(null);
  const screen = usePhoneScreen();
  const order = phoneOrders.find((item) => item.id === openId);
  return (
    <Demo>
      <PlatformPhone key={openId ?? "root"} label="Child screen" headerOverlay screenRef={screenRef} header={order
        ? <TopNavigation type="compact" title={`Order ${order.id}`} scrollRef={screenRef} leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => screen.go(`[data-order="${order.id}"] .zen-list-item__wrapper`, () => setOpenId(null)) }} />
        : <TopNavigation title="Orders" largeTitle="Orders" scrollRef={screenRef} />}>
        {screen.anchor}
        {order ? (
          <div className="pth-screen">
            {/* A key status is not a heading: Body/Extra/Bold in the strongest tone, right under the title. */}
            <Stack gap="2xs">
              <Text textStyle="Body/Extra/Bold">{order.status}</Text>
              <Text tone="base">{order.note}</Text>
            </Stack>
            <Stack as="section" gap="xs">
              <Heading level={2} textStyle="Heading/4">Items</Heading>
              {/* Rows have no side padding of their own: the screen pads them, so they line up with the headings. */}
              <List aria-label="Items">
                {order.items.map(({ print, qty }) => <ListItem key={print} title={phonePrints[print].name} caption={`${qty} × ${phoneMoney(phonePrints[print].price)}`} />)}
              </List>
            </Stack>
            {/* Sibling sections share Heading/4; the groups inside one are a level deeper (h3 Heading/Subheading), set apart by spacing:
                heading to content 8 · group to group 16 · section to section 24. */}
            <Stack as="section" gap="xs">
              <Heading level={2} textStyle="Heading/4">Delivery</Heading>
              <Stack gap="md">
                <Stack gap="2xs">
                  <Heading level={3} textStyle="Heading/Subheading">Address</Heading>
                  <Text tone="base">{phoneOrderAddress}</Text>
                </Stack>
                <Stack gap="2xs">
                  <Heading level={3} textStyle="Heading/Subheading">Courier</Heading>
                  <Text tone="base">{`GHN · tracking GHN-88${order.id.slice(1)}`}</Text>
                </Stack>
              </Stack>
            </Stack>
          </div>
        ) : (
          // The screen margin (lg, 20) insets the rows; their fill (12px outside the content) stays 8px inside the screen.
          <Stack padding="lg">
            <List aria-label="Orders">
              {phoneOrders.map((item) => (
                <ListItem key={item.id} data-order={item.id} title={`Order ${item.id}`} caption={`${item.status} · ${plural(phoneOrderPrints(item), "print")}`}
                  trailing={<Text as="span" textStyle="Body/Base/Medium">{phoneMoney(phoneOrderSubtotal(item) + phoneShipping)}</Text>}
                  onClick={() => screen.go('.zen-top-nav__action[aria-label="Back"]', () => setOpenId(item.id))} />
              ))}
            </List>
          </Stack>
        )}
      </PlatformPhone>
    </Demo>
  );
}

/** Emphasis inside one level: every row title stays Body/Base/Bold (Figma ListItem Title); unread is a Badge plus a
 *  visually hidden “Unread”, with the caption in a heavier weight and the strongest tone — never a bigger size. */
function EmphasisExample() {
  const [read, setRead] = useState<string[]>(["Bao Nguyen"]);
  // Opening a conversation selects its row and marks it read, as in an inbox.
  const [open, setOpen] = useState<string | null>(null);
  const rows = [["Ava Chen", "Did you get the brand files?", "2 min"], ["Design team", "Chi: Standup moved to 10:30", "12 min"], ["Bao Nguyen", "Thanks, merged!", "1 h"]];
  return (
    <Demo>
      <div className="pth-page">
        <Heading level={2} textStyle="Heading/4">Inbox</Heading>
        <List aria-label="Inbox">
          {rows.map(([name, preview, time]) => {
            const unread = !read.includes(name);
            // The state is also said in text (WCAG 1.3.1, G117), inside the row button so its name carries it.
            return (
              <ListItem key={name} selected={open === name} onClick={() => { setOpen(name); setRead((all) => (all.includes(name) ? all : [...all, name])); }}
                title={<>{unread ? <VisuallyHidden>Unread</VisuallyHidden> : null}{name}</>}
                caption={unread ? <Text as="span" textStyle="Body/Small/Medium" tone="strongest">{preview}</Text> : preview}
                trailing={<span className="pe-inbox-meta"><Text as="span" textStyle="Caption/Regular" tone="light">{time}</Text>{unread ? <Badge size="xsmall" theme="blue" background="subtle">New</Badge> : null}</span>} />
            );
          })}
        </List>
      </div>
    </Demo>
  );
}

type Rule = [content: string, element: string, style: string, where: string];
const ladder: Array<{ group: string; rows: Rule[] }> = [
  { group: "Desktop and web pages", rows: [
    ["Master page title — a destination in the Sidebar", "h1", "Heading/1", "PageHeader title (Figma Header/Dashboard Level=Master); document.title is the h1 text, then the app name"],
    ["Child page title — an item or sub-view of a master page", "h1", "Heading/1", "PageHeader title + Back named after the parent, or Breadcrumbs (Figma Child-Heading); document.title follows each view"],
    ["Page title inside a tab — the page's h1 sits above the tabs", "h2", "Heading/2", "PageHeader headingLevel={2}"],
    ["Page description", "p", "Body/Base/Regular · base", "PageHeader description (Figma SubHeading)"],
    ["Section title — a group of cards, a list, a table", "h2", "Heading/4 — one style for every sibling section", "<Heading level={2}> (its default look)"],
    ["Table that is its own section", "h2", "Heading/4", "A Heading above the Table, which points to it with aria-labelledby; the Table caption only names a table that already sits under a section heading"],
    ["Card or widget title", "h3 · h2", "Heading/Subheading — at any level", "Card content · ChartCard title: one level below the nearest heading above (h3 under a section, h2 directly under the page title)"],
  ] },
  { group: "Phone screens", rows: [
    ["Master screen title — a tab root", "h1", "Heading/1 large title; once collapsed, the bar title in Body/Extra/Bold", "TopNavigation largeTitle + title: exactly one h1 before and after scrolling (the bar copy is aria-hidden while the large title shows)"],
    ["Child screen title — a pushed screen", "h1", "Body/Extra/Bold — the bar style, not resized", "TopNavigation type compact + Back: the bar title is the screen's h1"],
    ["Screen in a nested navigation stack", "h2 · h3", "Heading/2 · Heading/3 large title; bar title Body/Extra/Bold", "TopNavigation headingLevel h2 / h3, only inside a screen that already has its h1"],
    ["Key status line — e.g. Arriving Friday", "p (not a heading)", "Body/Extra/Bold · strongest", "Text right under the title"],
    ["Section title in content", "h2", "Heading/4 — one style for every sibling section", "<Heading level={2}>"],
    ["Group title inside a section", "h3", "Heading/Subheading", "<Heading level={3}>"],
  ] },
  { group: "Every page and screen", rows: [
    ["Row or item title — read or not", "not a heading", "Body/Base/Bold", "ListItem title (Figma ListItem Title) · Table cell"],
    ["Unread or new row", "not a heading", "Body/Base/Bold title; the caption may go strongest", "A dot or Badge, plus a visually hidden “Unread” in the row's text (WCAG 1.3.1, G117)"],
    ["List group header — a label over a group of rows", "h2 · h3", "Body/Small/Bold · light — a kicker label", "A Heading one level below the nearest heading above, over a List; inside Menu, Popover, Select and Listbox a group label is a label, not a heading"],
    ["Body copy", "p", "Body/Base/Regular", "Text"],
    ["Secondary copy · meta", "—", "Body/Small/Regular · base", "Text tone base"],
    ["Timestamps · counters · legal", "—", "Caption/Regular · always light", "Text tone light"],
    ["Values and metrics", "not a heading", "Display/4 · Heading/2, as in the Figma templates", "Metric Widget · a Text span"],
  ] },
  { group: "Overlays — compared only with other overlay titles", rows: [
    ["Dialog title", "h2 (h1 accepted)", "Heading/3 (Heading/4 in its ≤ 480px phone layout)", "Dialog title · headingLevel"],
    ["Bottom Sheet title", "h2", "Heading/3", "BottomSheet title"],
    ["Side Panel title", "h2 (h1 accepted)", "Heading/3 · Heading/4 under the icon in the modal type", "SidePanel title · headingLevel"],
    ["Modal Form title", "h2 (h1 accepted)", "Heading/2", "ModalForm title · headingLevel"],
  ] },
];

const outlineRules = [
  "Exactly one h1 per page or screen, present at all times, naming it — and document.title matches it (the h1 text, then the app name). Where the title is shown large (PageHeader, a phone large title) it is Heading/1; a compact app bar title is the screen's h1 and keeps its bar style, Body/Extra/Bold (harness: heading/h1-is-heading-1).",
  "Going deeper, step down one level at a time (h1 → h2 → h3); going back up may jump (h4 → h2). Every page or screen starts at its h1. A component's headings take their level from where it is placed (headingLevel); fixed regions such as the Sidebar and Drawer keep the same level on every page.",
  "Inside one content area — the page body, a card, an overlay — a heading is never larger than the heading it sits under; the app bar title and overlay titles are compared only within their own layer. The same kind of content takes the same style on a page, whatever its level, and content that looks subordinate is marked up one level deeper.",
  "Sections (h2 Heading/4) and the cards or groups in them (h3 Heading/Subheading) are told apart by spacing and containment — the gap above a section, the card's surface — not by a new size.",
  "Emphasise with weight (Regular → Medium → Bold) and quiet secondary text with tone (base → light); sizes stay as they are — a Zen rule (Apple also allows size). When weight or a dot carries a state (unread, new), say it in text too.",
  "Big numbers, prices and metrics are values, not headings; a heading is chosen for its place in the outline, never for its size.",
  "A list group header is a kicker label: a heading one level below the nearest heading above, in Body/Small/Bold · light. It may be smaller than the rows under it and is not strongest. Group labels inside Menu, Popover, Select and Listbox are labels, not headings.",
  "Overlays title themselves through their title prop: an h2 by default (h1 is accepted), in the style Figma gives each overlay, never Heading/1.",
  "<Heading level> without a textStyle follows this ladder: 1 Heading/1 · 2 Heading/4 · 3 Heading/Subheading · 4 Body/Extra/Bold · 5–6 Body/Base/Bold.",
  "Titles are short and unique to the screen, in sentence case, and never the app's name.",
  "Caption is for meta only (timestamps, counters, legal) and always in the light tone; Body/Small meta is in the base tone; primary content is Body/Small or larger.",
];

/** The rules panel shown above the examples on the Typography page. */
export function TypographyHierarchyRules() {
  return (
    <section className="pe-section pth-rules" aria-labelledby="pth-rules-title">
      <header className="pe-section__head">
        <h2 id="pth-rules-title" className={typographyStyles["Heading/3"]}>Content hierarchy</h2>
        <p className={typographyStyles["Body/Base/Regular"]}>Which heading level and text style each kind of content takes on master pages, child pages, phone screens and overlays — from the Figma Master-Layout, templates and Top Navigation, checked against Apple's Human Interface Guidelines, Material 3, Primer, Polaris, Carbon, GOV.UK and WCAG. Phone rows are shown in the Mobile typography mode.</p>
      </header>
      <div className="pth-table-wrap">
        <table className="pth-table" aria-label="Heading level and text style by content">
          <thead><tr><th scope="col">Content</th><th scope="col">Element</th><th scope="col">Text style</th><th scope="col">Where it comes from</th></tr></thead>
          {ladder.map((block) => (
            <tbody key={block.group}>
              <tr><th scope="rowgroup" colSpan={4} className="pth-table__group">{block.group}</th></tr>
              {block.rows.map(([content, element, style, where]) => (
                <tr key={content}><th scope="row">{content}</th><td><code>{element}</code></td><td>{style}</td><td>{where}</td></tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
      <ol className="pth-rules__list">{outlineRules.map((rule) => <li key={rule} className={typographyStyles["Body/Base/Regular"]}>{rule}</li>)}</ol>
    </section>
  );
}

export const typographyHierarchyExamples: ExampleDef[] = [
  { title: "Master page · desktop", screen: true, wide: true, description: "A Sidebar destination: PageHeader h1 Heading/1 with its description (document.title follows it), h2 Heading/4 sections, h3 Heading/Subheading card titles; the Display/4 values are not headings.", render: () => <MasterPageExample />, code: `document.title = "Workbench · Acme"; // the h1 text, then the app name
<PageHeader title="Workbench" description="Requests and balances for the Design team." actions={…} />
<Heading level={2} textStyle="Heading/4">Time off</Heading>
<Card theme="flat"><Heading level={3} textStyle="Heading/Subheading">Annual leave</Heading>
  <Text as="span" textStyle="Display/4">12</Text></Card>
<Heading level={2} textStyle="Heading/4">Recent requests</Heading>` },
  { title: "Child page · desktop", screen: true, wide: true, description: "An item under a master page: Back named after the parent, the item's name as the h1 (Heading/1) and in document.title, then the same h2 Heading/4 sections.", render: () => <ChildPageExample />, code: `document.title = "Annual leave · Acme";
<PageHeader back={{ label: "Time off", onClick: goBack }} title="Annual leave"
  meta={<Badge theme="green">Approved</Badge>} description="Ava Chen · 3 days, Oct 14 – Oct 16, 2026." />
<Heading level={2} textStyle="Heading/4">Details</Heading>
<Heading level={2} textStyle="Heading/4">Activity</Heading>` },
  { title: "Master screen · phone", wide: true, description: "A tab root: the TopNavigation large title is the h1 (Heading/1); scroll and it folds into the Body/Extra/Bold bar title, which becomes the h1 — one h1 before and after scrolling. List group headers are h2 kicker labels in Body/Small/Bold · light.", render: () => <MasterScreenExample />, code: `<TopNavigation title="Chats" largeTitle="Chats" scrollRef={screenRef} trailing={[{ icon: "icon-edit-02-line", label: "New message", onClick: compose }]} />
<Stack gap="lg" padding="lg">
  <Stack as="section" gap="xs">
    <Heading level={2} textStyle="Body/Small/Bold" tone="light">Pinned</Heading>
    <List>…</List>
  </Stack>
</Stack>` },
  { title: "Child screen · phone", wide: true, description: "A pushed screen: the compact bar title is its h1, in the bar style (Body/Extra/Bold). The key status is a line of text (Body/Extra/Bold · strongest), sibling sections are h2 Heading/4, and the groups inside a section h3 Heading/Subheading.", render: () => <ChildScreenExample />, code: `<TopNavigation type="compact" title="Order #1042" scrollRef={screenRef} leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: goBack }} />
<Text textStyle="Body/Extra/Bold">Arriving Friday</Text>
<Heading level={2} textStyle="Heading/4">Items</Heading>
<Heading level={2} textStyle="Heading/4">Delivery</Heading>
  <Heading level={3} textStyle="Heading/Subheading">Address</Heading>` },
  { title: "Emphasis inside a level", wide: true, description: "Every row title stays Body/Base/Bold. An unread row adds a New Badge and a visually hidden “Unread” in its title, and its caption goes Body/Small/Medium in the strongest tone; read rows keep the Regular · light caption. The size never changes. Open a row to mark it read.", render: () => <EmphasisExample />, code: `<ListItem onClick={markRead}
  title={<>{unread ? <VisuallyHidden>Unread</VisuallyHidden> : null}{name}</>}
  caption={unread ? <Text as="span" textStyle="Body/Small/Medium" tone="strongest">{preview}</Text> : preview}
  trailing={<>{time}{unread ? <Badge size="xsmall" theme="blue" background="subtle">New</Badge> : null}</>} />` },
];

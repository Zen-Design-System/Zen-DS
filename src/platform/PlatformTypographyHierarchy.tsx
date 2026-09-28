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
import { typographyStyles } from "../tokens/typography.generated";
import type { ExampleDef } from "./appLayer/types";
import { PlatformPhone } from "./PlatformPhone";
import { DemoFieldDialog } from "./PlatformDemoActions";

/*
 * Typography › Content hierarchy: which heading and text style each kind of content takes on each kind of page.
 * Sources: Figma Header/Dashboard Level=Master + Primitives/Dashboard/Header (Heading/1 title, Child-Heading, Body/Base/Regular
 * SubHeading), the ◆ templates (Heading/4 sections, Heading/Subheading card titles, Display/4 values, Body/Base row titles,
 * Caption meta), Top-Navigation/Mobile (Heading/1 large title, Body/Extra/Bold bar title), and Apple HIG — Typography,
 * Toolbars (large titles), VoiceOver (titles and headings). Font sizes are the Figma styles as they are; nothing is resized.
 */

const styleNames = Object.fromEntries(Object.entries(typographyStyles).map(([name, className]) => [className, name]));

type OutlineRow = { level: number | null; text: string; style: string };

/** Reads the real headings (and a compact bar title) of the UI beside it, so every example shows its own outline. */
function OutlineReadout({ rootRef }: { rootRef: RefObject<HTMLDivElement | null> }) {
  const [rows, setRows] = useState<OutlineRow[]>([]);
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const read = () => {
      const next: OutlineRow[] = [];
      for (const el of root.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, h6, .zen-top-nav__title[data-visible='true']")) {
        const style = [...el.classList].map((name) => styleNames[name]).find(Boolean) ?? "—";
        const level = /^H[1-6]$/.test(el.tagName) ? Number(el.tagName[1]) : null;
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
              <Card key={title} spacing="small">
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
          <List aria-label="Recent requests">
            {Array.from({ length: Math.min(requests, 4) }, (_, index) => (
              <ListItem key={index} title={index === 0 ? "Annual leave · 3 days" : index === 1 ? "Sick leave · 1 day" : `Remote day · ${index} Oct`} caption={index === 0 ? "Ava Chen · Approved" : "Bao Nguyen · Pending"} />
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
  const [dates, setDates] = useState("14–16 October");
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

/** Master screen on a phone (a tab root): TopNavigation large title = h1 Heading/1, collapsing into the Body/Extra/Bold bar title. */
function MasterScreenExample() {
  const [collapsed, setCollapsed] = useState(false);
  // New message opens a compose sheet; the new chat lands on top of All chats.
  const [composing, setComposing] = useState(false);
  const [to, setTo] = useState("");
  const [started, setStarted] = useState<string[]>([]);
  const chats = [["Design team", "Chi: Standup moved to 10:30", "09:41"], ["Ava Chen", "Did you get the brand files?", "09:12"], ["Bao Nguyen", "Merged the token PR", "Yesterday"], ["Duy Le", "Can you review the icons?", "Mon"], ["Emi Sato", "Lunch at 12?", "Sun"], ["Finn Walker", "Slides are in the shared folder", "Sat"], ["Gia Pham", "Can we move the review?", "Fri"], ["Hana Kim", "Invoice sent", "Thu"], ["Ivy Tran", "See you at the launch", "Wed"], ["Khoa Vo", "The build is green", "Tue"], ["Linh Do", "Can you share the deck?", "Mon"], ["Minh Ho", "Booked the room", "12 Sep"], ["Nam Bui", "Thanks for the notes", "11 Sep"], ["Oanh Ly", "Photos from the event", "10 Sep"]];
  return (
    <Demo>
      <PlatformPhone label="Master screen" header={<TopNavigation title="Chats" largeTitle="Chats" collapsed={collapsed} trailing={[{ icon: "icon-edit-02-line", label: "New message", onClick: () => setComposing(true) }]} />}>
        <div className="pe-phone-scroll" onScroll={(event) => setCollapsed(event.currentTarget.scrollTop > 24)}>
          <Heading level={2} textStyle="Body/Small/Bold" tone="base" className="pth-list-head">Pinned</Heading>
          <List aria-label="Pinned chats">
            <ListItem title={chats[0][0]} caption={chats[0][1]} trailing={<Text as="span" textStyle="Caption/Regular" tone="light">{chats[0][2]}</Text>} />
          </List>
          <Heading level={2} textStyle="Body/Small/Bold" tone="base" className="pth-list-head">All chats</Heading>
          <List aria-label="All chats">
            {[...started.map((name) => [name, "You: Hi!", "Now"]), ...chats.slice(1)].map(([name, preview, time]) => <ListItem key={name} title={name} caption={preview} trailing={<Text as="span" textStyle="Caption/Regular" tone="light">{time}</Text>} />)}
          </List>
        </div>
        <BottomSheet inline open={composing} onOpenChange={setComposing} title="New message"
          primaryAction={{ label: "Start chat", disabled: !to.trim() || started.includes(to.trim()), onClick: () => { setStarted((list) => [to.trim(), ...list]); setTo(""); setComposing(false); } }} secondaryAction={{ label: "Cancel" }}>
          <InputField label="To" placeholder="Name or email" value={to} onValueChange={setTo} data-autofocus="" />
        </BottomSheet>
      </PlatformPhone>
    </Demo>
  );
}

/** Child screen on a phone (pushed): the compact bar title names the screen (Body/Extra/Bold, not an h1); content headings start at h2. */
function ChildScreenExample() {
  const [note, setNote] = useState("Delivery on Friday, 14:00–17:00.");
  return (
    <Demo>
      <PlatformPhone label="Child screen" header={<TopNavigation type="compact" title="Order #1042" leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => setNote("Back to Orders…") }} trailing={[{ icon: "icon-share-01-line", label: "Share order", onClick: () => setNote("Share sheet…") }]} />}>
        <div className="pe-phone-scroll pth-screen">
          <Stack gap="2xs">
            <Heading level={2} textStyle="Heading/4">Arriving Friday</Heading>
            <Text tone="base">{note}</Text>
          </Stack>
          <Stack gap="xs">
            <Heading level={2} textStyle="Heading/Subheading">Items</Heading>
            <List aria-label="Items">
              <ListItem title="Brand guidelines, print" caption="1 × $48.00" />
              <ListItem title="Icon set license" caption="1 × $120.00" />
            </List>
          </Stack>
          <Stack gap="xs">
            <Heading level={2} textStyle="Heading/Subheading">Delivery address</Heading>
            <Text tone="base">12 Nguyen Hue, District 1, Ho Chi Minh City</Text>
          </Stack>
        </div>
      </PlatformPhone>
    </Demo>
  );
}

/** Emphasis inside one level: the same row style, heavier weight and a stronger tone — never a bigger size. */
function EmphasisExample() {
  const [read, setRead] = useState<string[]>([]);
  const rows = [["Ava Chen", "Did you get the brand files?", "2 min"], ["Design team", "Chi: Standup moved to 10:30", "12 min"], ["Bao Nguyen", "Thanks, merged!", "1 h"]];
  return (
    <Demo>
      <div className="pth-page">
        <Heading level={2} textStyle="Heading/4">Inbox</Heading>
        <List aria-label="Inbox">
          {rows.map(([name, preview, time]) => {
            const unread = !read.includes(name);
            return (
              <ListItem key={name} onClick={() => setRead((all) => (all.includes(name) ? all : [...all, name]))}
                title={<Text as="span" textStyle={unread ? "Body/Base/Bold" : "Body/Base/Medium"}>{name}</Text>}
                caption={<Text as="span" textStyle={unread ? "Body/Small/Bold" : "Body/Small/Regular"} tone={unread ? "strongest" : "light"}>{preview}</Text>}
                trailing={<Text as="span" textStyle="Caption/Regular" tone="light">{time}</Text>} />
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
    ["Master page title — a destination in the Sidebar", "h1", "Heading/1", "PageHeader title (Figma Header/Dashboard Level=Master)"],
    ["Child page title — an item or sub-view of a master page", "h1", "Heading/1", "PageHeader title + Back named after the parent, or Breadcrumbs (Figma Child-Heading)"],
    ["Page description", "p", "Body/Base/Regular · base", "PageHeader description (Figma SubHeading)"],
    ["Section title — a group of cards, a table, a list", "h2", "Heading/4", "Heading level 2 · Table caption"],
    ["Card or widget title", "h3", "Heading/Subheading", "Card content · Chart Card title"],
    ["Row or item title", "—", "Body/Base/Medium (Bold when unread or primary)", "ListItem · Table cell"],
    ["Body copy", "p", "Body/Base/Regular", "Text"],
    ["Secondary copy · meta · timestamps", "—", "Body/Small/Regular · base · Caption/Regular · light", "Text tone"],
    ["Values and metrics", "not a heading", "Display/4 · Heading/2", "Metric Widget · a Text span"],
  ] },
  { group: "Phone screens", rows: [
    ["Master screen title — a tab root", "h1", "Heading/1 → bar title Body/Extra/Bold on scroll", "TopNavigation largeTitle + title"],
    ["Child screen title — a pushed screen", "bar title (not an h1)", "Body/Extra/Bold", "TopNavigation type compact + Back"],
    ["Section title in content", "h2", "Heading/4 · Heading/Subheading below it", "Heading level 2"],
    ["List group header", "h2 / h3", "Body/Small/Bold · base", "Heading above a List"],
  ] },
  { group: "Overlays", rows: [
    ["Dialog, Side Panel, Bottom Sheet title", "h2 inside the overlay", "the component's own style (never Heading/1)", "the title prop"],
  ] },
];

const outlineRules = [
  "One h1 per page — the page title — and it is always Heading/1 (harness: heading/h1-is-heading-1). A child screen on a phone has no content h1: its bar title names it.",
  "Levels go down one step at a time (h1 → h2 → h3); never skip a level to get a smaller look — choose the look with textStyle.",
  "A heading is never larger than the heading it sits under; the same kind of content takes the same style everywhere on the page.",
  "Emphasise inside a level with weight (Regular → Medium → Bold) and tone (light → base → strongest), not with a bigger style — HIG: the bold trait “adds weight to text, letting you create another level of hierarchy”.",
  "Big numbers, prices and metrics are values, not headings; a heading is chosen for its place in the outline, never for its size.",
  "Overlays title themselves through their title prop (an h2 inside the dialog or sheet); they never use Heading/1.",
  "Titles are short and unique to the screen, in sentence case, and never the app's name.",
  "Caption is for meta only (timestamps, counters, legal); primary content is Body/Small or larger.",
];

/** The rules panel shown above the examples on the Typography page. */
export function TypographyHierarchyRules() {
  return (
    <section className="pe-section pth-rules" aria-labelledby="pth-rules-title">
      <header className="pe-section__head">
        <h2 id="pth-rules-title" className={typographyStyles["Heading/3"]}>Content hierarchy</h2>
        <p className={typographyStyles["Body/Base/Regular"]}>Which heading level and text style each kind of content takes on master pages, child pages, phone screens and overlays — from the Figma Master-Layout, templates and Top Navigation, and Apple's Human Interface Guidelines.</p>
      </header>
      <div className="pth-table-wrap">
        <table className="pth-table">
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
  { title: "Master page · desktop", screen: true, wide: true, description: "A Sidebar destination: PageHeader h1 Heading/1 with its description, h2 Heading/4 sections, h3 Heading/Subheading card titles; the Display/4 values are not headings.", render: () => <MasterPageExample />, code: `<PageHeader title="Workbench" description="Requests and balances for the Design team." actions={…} />
<Heading level={2} textStyle="Heading/4">Time off</Heading>
<Card><Heading level={3} textStyle="Heading/Subheading">Annual leave</Heading>
  <Text as="span" textStyle="Display/4">12</Text></Card>
<Heading level={2} textStyle="Heading/4">Recent requests</Heading>` },
  { title: "Child page · desktop", screen: true, wide: true, description: "An item under a master page: Back named after the parent, the item's name as the h1 (Heading/1), then the same h2 Heading/4 sections.", render: () => <ChildPageExample />, code: `<PageHeader back={{ label: "Time off", onClick: goBack }} title="Annual leave"
  meta={<Badge theme="green">Approved</Badge>} description="Ava Chen · 3 days, 14–16 October." />
<Heading level={2} textStyle="Heading/4">Details</Heading>
<Heading level={2} textStyle="Heading/4">Activity</Heading>` },
  { title: "Master screen · phone", wide: true, description: "A tab root: the TopNavigation large title is the h1 (Heading/1) and folds into the Body/Extra/Bold bar title as you scroll; list group headers are h2 in Body/Small/Bold.", render: () => <MasterScreenExample />, code: `<TopNavigation title="Chats" largeTitle="Chats" collapsed={scrolled} trailing={[{ icon: "icon-edit-02-line", label: "New message", onClick: compose }]} />
<Heading level={2} textStyle="Body/Small/Bold" tone="base">Pinned</Heading>
<List>…</List>` },
  { title: "Child screen · phone", wide: true, description: "A pushed screen: the compact bar title (Body/Extra/Bold) names it, so content headings start at h2 — Heading/4 for the key status, Heading/Subheading for the sections under it.", render: () => <ChildScreenExample />, code: `<TopNavigation type="compact" title="Order #1042" leading={{ icon: "icon-chevron-left-line-medium", label: "Back" }} />
<Heading level={2} textStyle="Heading/4">Arriving Friday</Heading>
<Heading level={2} textStyle="Heading/Subheading">Items</Heading>` },
  { title: "Emphasis inside a level", wide: true, description: "Unread rows are Body/Base/Bold over Body/Small/Bold in the strongest tone; read rows drop to Medium and Regular · light. The size never changes. Open a row to mark it read.", render: () => <EmphasisExample />, code: `<ListItem title={<Text as="span" textStyle={unread ? "Body/Base/Bold" : "Body/Base/Medium"}>{name}</Text>}
  caption={<Text as="span" textStyle={unread ? "Body/Small/Bold" : "Body/Small/Regular"} tone={unread ? "strongest" : "light"}>{preview}</Text>} />` },
];

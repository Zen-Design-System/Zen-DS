/* Layout examples (brief: docs/research/example-rebuild-brief-2026-09-30.md). Đìzai Studio, signed in as Alex Duong,
   Wednesday Sep 30, 2026, 10:30 am. Each example teaches one layout decision with Stack, Grid and Box, and every gap
   comes from the spacing ladder (usage rules §13): a main column beside an aside, annotated settings at a readable
   width, cards that reflow and keep equal heights, a cluster that wraps, a panel that centres its empty state, and the
   same ladder on a phone. Two more place layers like Figma constraints and effects: a panel at the Sidebar's elevation,
   and photos with layers on a phone (a feed whose photo frames clip their corners and pin Save and a caption bar,
   opening on the AppShell's Media pattern). Two more change with the breakpoint, each shown on the page and in a phone:
   a row that stacks on phones and a panel hidden on phones (per-breakpoint props, hideOn), and one dashboard grid whose
   widgets take spans by importance (span, rowSpan; docs/research/grid-span-2026-10-26.md). The screens sit in the studio's AppShell (pattern sidebar on desktop, the
   mobile parts on a phone), whose Body pads the page, so no layout here adds a page margin of its own.
   Each example is its own file in layout/ (P2b, plan docs/research/code-languages-plan-2026-10-03.md §11): the card
   renders its default export and shows its text as the snippet. */
import { useLayoutEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { Box, Grid } from "../../../components/Layout";
import { TopNavigation } from "../../../components/TopNavigation";
import { PreviewAppFrame } from "../../PlatformFrames";
import { PlatformPhone, PlatformPhoneApp, type PhoneScrollRef } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import { studio } from "../data";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import ProjectOverview from "./layout/main-column-and-aside.example";
import projectOverviewRaw from "./layout/main-column-and-aside.example.tsx?raw";
import AnnotatedSettings from "./layout/annotated-settings.example";
import annotatedSettingsRaw from "./layout/annotated-settings.example.tsx?raw";
import TemplateGallery from "./layout/cards-that-reflow.example";
import templateGalleryRaw from "./layout/cards-that-reflow.example.tsx?raw";
import ProfileSkills from "./layout/wrapping-cluster.example";
import profileSkillsRaw from "./layout/wrapping-cluster.example.tsx?raw";
import ClientInvoices from "./layout/centred-in-a-panel.example";
import clientInvoicesRaw from "./layout/centred-in-a-panel.example.tsx?raw";
import ElevatedPanels from "./layout/elevated-panel.example";
import elevatedPanelsRaw from "./layout/elevated-panel.example.tsx?raw";
import PhoneTasks from "./layout/phone-screen.example";
import phoneTasksRaw from "./layout/phone-screen.example.tsx?raw";
import StudioEvents from "./layout/layers-over-photos.example";
import studioEventsRaw from "./layout/layers-over-photos.example.tsx?raw";
import InvoiceSummary from "./layout/a-row-that-stacks-on-phones.example";
import invoiceSummaryRaw from "./layout/a-row-that-stacks-on-phones.example.tsx?raw";
import TasksAndActivity from "./layout/a-panel-hidden-on-phones.example";
import tasksAndActivityRaw from "./layout/a-panel-hidden-on-phones.example.tsx?raw";
import DashboardGrid from "./layout/one-dashboard-grid.example";
import dashboardGridRaw from "./layout/one-dashboard-grid.example.tsx?raw";

export const page: PlatformPage = "layout";

/** Under this width inside, the Tasks card of "Main column and aside" lists title and status instead of the table. */
const TASKS_TABLE_MIN_WIDTH = 560;

/**
 * "Main column and aside" in its desktop frame. The Tasks card picks the table or a list by its own width, and in the
 * docs the card is narrower than the window (a card in the page, a thumbnail, the Sidebar collapsed or not): the page
 * measures it (the first card in the frame) and tells the example.
 */
function TasksCardFrame({ app: App }: { app: ComponentType<{ narrowTasks?: boolean }> }) {
  const [frame, setFrame] = useState<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    if (!frame) return undefined;
    // The app inside may render after the frame mounts: watch for the Tasks card, then measure it.
    let card: HTMLElement | null = null;
    const resize = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    const attach = () => {
      const next = frame.querySelector<HTMLElement>(".zen-card");
      if (!next || next === card) return;
      if (card) resize.unobserve(card);
      card = next;
      resize.observe(card);
    };
    attach();
    const mutations = new MutationObserver(attach);
    mutations.observe(frame, { childList: true, subtree: true });
    return () => { mutations.disconnect(); resize.disconnect(); };
  }, [frame]);
  // Until the card is measured the example decides by the breakpoint.
  return <PreviewAppFrame height={{ min: 640, max: 820 }} frameRef={setFrame}><App narrowTasks={width > 0 ? width < TASKS_TABLE_MIN_WIDTH : undefined} /></PreviewAppFrame>;
}

/**
 * "Layers over photos" on the phone. The event screen lays its photo under the status bar (AppShell mobileTop="media"),
 * so there the device's status bar turns light and its screen Surface, as a phone app sets them for that screen; the
 * page watches which screen shows.
 */
function EventsPhone({ app: App }: { app: ComponentType<{ scrollRef?: PhoneScrollRef }> }) {
  const screenRef = useRef<HTMLDivElement>(null);
  const [media, setMedia] = useState(false);
  useLayoutEffect(() => {
    const screen = screenRef.current;
    if (!screen) return undefined;
    const update = () => setMedia(screen.querySelector('.zen-app-shell[data-top="media"]') !== null);
    update();
    const observer = new MutationObserver(update);
    observer.observe(screen, { childList: true, subtree: true, attributeFilter: ["data-top"] });
    return () => observer.disconnect();
  }, []);
  return (
    <PlatformPhone label={studio.name} canvas={media ? "surface" : "default"} statusBar={media ? "light" : "dark"} screenRef={screenRef}>
      <App scrollRef={screenRef} />
    </PlatformPhone>
  );
}

// ——— Per breakpoint ——————————————————————————————————————————————————————————————————————————————————————
// Stack, Grid and Box take { desktop, tablet, mobile } for their structure props, resolved at the nearest
// ZenProvider's breakpoint: on the page, the window's; in PlatformPhone, mobile. A breakpoint without its own value
// takes the next wider one's, so { desktop, mobile } covers tablet too.

/** A card title's level: under the example's heading on the page; right under the bar title (h1) in the phone. */
type CardHeadingLevel = 2 | 4;

/** The same layout twice: on the page at the window's breakpoint, and in a phone at the mobile breakpoint. */
function OnPageAndPhone({ label, title, children }: { label: string; title: string; children: (headingLevel: CardHeadingLevel) => ReactNode }) {
  return (
    <Grid columns={{ mobile: 1, desktop: "minmax(0, 1fr) auto" }} gap="xl" align="center">
      <Box>{children(4)}</Box>
      {/* The phone screen has no AppShell Body here: the page margin pads it. */}
      <PlatformPhone label={label} canvas="default" header={<TopNavigation type="compact-alt" title={title} />}>
        <Box paddingX="margin-comfortable" paddingY="sm">{children(2)}</Box>
      </PlatformPhone>
    </Grid>
  );
}

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Main column and aside",
    description: "A project page in the studio's AppShell: the trail and the account in the header's top row, the PageHeader in its Main row, and the Body padding the page, so the Grid needs no Container. The Grid gives a two-thirds main column and a one-third aside, lg apart. Every widget takes the Sidebar's elevation (Shadow, no border) — Tasks (title, Status filter, the table; a List of title + status when the column is narrow) in the main column, Team and Details stacked md apart in the aside — so their tops line up and their titles share Heading/Subheading; in a narrow window the aside moves under the main column.",
    wide: true,
    screen: true,
    render: () => <TasksCardFrame app={ProjectOverview} />,
    code: exampleCode(projectOverviewRaw),
  },
  {
    title: "Annotated settings",
    description: "A long form stops at a readable width (960) however wide the window is: the AppShell's Body already pads the page, so the form starts at the page margin, in line with the PageHeader in the header's Main row. Each section is a Grid with its title and a short description in the narrow column and its fields in a Card at the Sidebar's elevation; sections sit xl apart and stack in a narrow window. Save checks the name and moves focus to it when it is empty.",
    wide: true,
    screen: true,
    render: () => <PreviewAppFrame height={{ min: 640, max: 820 }}><AnnotatedSettings /></PreviewAppFrame>,
    code: exampleCode(annotatedSettingsRaw),
  },
  {
    title: "Cards that reflow",
    description: "Grid minColumnWidth fits as many 240px columns as the width allows, four here and one on a phone, with no breakpoints. Cells stretch to the tallest card in the row and each card pushes its footer to the bottom, so the Use template buttons line up across each row.",
    wide: true,
    render: () => <TemplateGallery />,
    code: exampleCode(templateGalleryRaw),
  },
  {
    title: "Wrapping cluster",
    description: "A row Stack with wrap flows the Tags onto as many lines as they need, 2xs apart across and down. Inside the card the header and each labelled group sit lg apart; the kicker sits xs above the Skills cluster and Add skill xs below it. Removing a skill can be undone from the toast.",
    render: () => <ProfileSkills />,
    code: exampleCode(profileSkillsRaw),
  },
  {
    title: "Centred in a panel",
    description: "A panel of fixed height: the header stays at the top, the footnote at the bottom, and the middle Stack grows, so an empty state sits in the optical centre. Create invoice puts the draft at the top of the list instead; the toast's Undo brings the empty state back.",
    render: () => <ClientInvoices />,
    code: exampleCode(clientInvoicesRaw),
  },
  {
    title: "Elevated panel",
    description: "The AppShell's default Sidebar is Surface with Shadow/Bottom/Level-1 on the Canvas/Default page, so every Surface on the screen takes the same elevation: the MetricCards and ListBoxes with theme=\"shadow\" (no border). The Sidebar switches Home, Projects and Invoices; each page's PageHeader sits in the header's Main row with its one Primary.",
    wide: true,
    screen: true,
    render: () => <PreviewAppFrame height={{ min: 640, max: 820 }}><ElevatedPanels /></PreviewAppFrame>,
    code: exampleCode(elevatedPanelsRaw),
  },
  {
    title: "Phone screen",
    description: "The same ladder on a phone, inside the AppShell's mobile parts: the Body pads the screen (Margin-Comfortable, 20) and spaces its sections Layout-Mobile/Section-Gap apart. Two metrics share a fixed two-column Grid md apart, and each day is a block under its kicker; the bottom bar casts a shadow, so the blocks take the same Shadow elevation. A task opens its own screen with Back and its one action in the Action bar; New task adds one from a Bottom Sheet.",
    render: () => <PlatformPhoneApp label="Zen tasks" canvas="default" app={PhoneTasks} />,
    code: exampleCode(phoneTasksRaw),
  },
  {
    title: "Layers over photos",
    description: "In the Events feed each photo is a frame that clips to 3xl: Save pins to its top-right corner, sm in from both edges (Right / Top), and the caption bar stretches between sm insets along the bottom edge (Left & right / Bottom); the floating glass bar rides over the photos. An event opens on the AppShell's Media pattern: its photo is the backdrop behind the top of the screen, the overlay bar keeps Back and Save readable on it, and the details rise over it as the shell's sheet with only its top corners rounded, the RSVP in the Action bar. Back returns to the event you opened, and the toast can undo a save or an RSVP.",
    render: () => <EventsPhone app={StudioEvents} />,
    code: exampleCode(studioEventsRaw),
  },
  {
    title: "A row that stacks on phones",
    description: "One invoice summary for every screen: direction and align take a value per breakpoint, so the number, the amount and Send reminder share one row on desktop and tablet and go under each other on a phone, where the button takes the full width. The phone shows the same code at the mobile breakpoint; a breakpoint without its own value takes the next wider one's.",
    wide: true,
    render: () => <OnPageAndPhone label="Invoice on a phone" title="Invoice">{(level) => <InvoiceSummary headingLevel={level} />}</OnPageAndPhone>,
    code: exampleCode(invoiceSummaryRaw),
  },
  {
    title: "A panel hidden on phones",
    description: "Open tasks beside what changed since yesterday on desktop and tablet; a phone keeps only the tasks. hideOn={[\"mobile\"]} hides the aside there (display none: it stays in the DOM, so Studio still lists it), and the Grid's columns go from two to one at the same breakpoint. Hide only what is secondary, and never on every breakpoint.",
    wide: true,
    render: () => <OnPageAndPhone label="Open tasks on a phone" title="Home">{(level) => <TasksAndActivity headingLevel={level} />}</OnPageAndPhone>,
    code: exampleCode(tasksAndActivityRaw),
  },
  {
    title: "One dashboard grid",
    description: "Every widget of an overview in one Grid of 12 columns, rows md apart like the columns, sized by importance with span: four KPIs over 3 columns, the revenue trend (the hero) over 8 beside the list to act on over 4 (five rows, as tall as the hero), then three breakdowns over 4. Each span is per breakpoint, so a narrower window shows its own layout: tablet lays out 6 columns (the hero takes the row, the rest pair up), a phone 2 (KPI tiles two up, then one widget a row). Every row adds up to its columns and pairs widgets of a similar height, so nothing is left hollow; rowSpan makes a cell two rows tall when its content is that long.",
    wide: true,
    // On the page only: a dashboard needs the page's width (beside a phone frame its 12 columns would be too narrow);
    // the window's breakpoint picks the spans, so a tablet or a phone shows their own layout.
    render: () => <DashboardGrid />,
    code: exampleCode(dashboardGridRaw),
  },
]);

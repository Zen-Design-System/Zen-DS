import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { ActionBar, type ActionBarDirection, type ActionBarPosition, type ActionBarSurface } from "../../components/ActionBar";
import { Button, IconButton } from "../../components/Button";
import { Card } from "../../components/Card";
import { DescriptionList, type DescriptionListItem, type DescriptionListLayout } from "../../components/DescriptionList";
import { EmptyState } from "../../components/EmptyState";
import { Icon } from "../../components/Icon";
import { Image, Thumbnail, imageRatios, type ImageFit, type ImageRatioName, type ThumbnailShape } from "../../components/Image";
import { InlineMessage } from "../../components/InlineMessage";
import { InputField } from "../../components/Input";
import { Stack } from "../../components/Layout";
import { Table, TableActions, TableText } from "../../components/Table";
import { Heading, Text, plural } from "../../components/Text";
import { VisuallyHidden } from "../../components/VisuallyHidden";
import type { ZenCornerRadius, ZenScale } from "../../components/_shared/scale";
import { platformMedia, type PlatformPhoto } from "../PlatformMedia";
import { Panel, PlaygroundFilterChip, PlaygroundToggle, keepOnHotUpdate, option } from "./shared";
import type { AppLayerPage, AppLayerPageMeta, ExampleMap } from "./types";
import "./content.css";

/* App-layer group "content": Description List, Action Bar, Image (+ Thumbnail) and Visually Hidden. */

/* ───────────── Shared sample data and helpers ───────────── */

const money = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD" });
/** Bytes that are not an image: the browser fails to decode them without a network request, so the error state never logs a 404. */
const brokenImage = "data:image/png;base64,AAAA";

/** A print shop built on the platform photos (src/assets/media/CREDITS.md). */
type Print = { id: string; name: string; photo: PlatformPhoto; price: number; size: string; stock: number };
const prints: Print[] = [
  { id: "windmill", name: "Windmill by the sea", photo: platformMedia.site[3], price: 48, size: "40 × 30 cm", stock: 12 },
  { id: "rooftops", name: "Old town rooftops", photo: platformMedia.site[1], price: 42, size: "40 × 30 cm", stock: 4 },
  { id: "bridge", name: "Bridge at dusk", photo: platformMedia.site[4], price: 56, size: "50 × 40 cm", stock: 0 },
  { id: "courtyard", name: "College courtyard", photo: platformMedia.site[0], price: 38, size: "30 × 24 cm", stock: 21 },
  { id: "old-town", name: "Old town from the hill", photo: platformMedia.site[2], price: 44, size: "40 × 30 cm", stock: 7 },
  { id: "cafe", name: "Café corner", photo: platformMedia.site[5], price: 32, size: "30 × 24 cm", stock: 15 },
];
const printSpecs: DescriptionListItem[] = [
  { term: "Paper", description: "Cotton rag, 308 gsm" },
  { term: "Frame", description: "Oak, 2 cm" },
  { term: "Edition", description: "Open edition, signed" },
  { term: "Ships in", description: "2–3 business days" },
];

/** A flag that switches itself off again (copied / saved confirmations). */
function useTimedFlag(ms = 2000): [boolean, () => void] {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!on) return undefined;
    const timer = window.setTimeout(() => setOn(false), ms);
    return () => window.clearTimeout(timer);
  }, [on, ms]);
  return [on, () => setOn(true)];
}

const copyText = (value: string) => { void navigator.clipboard?.writeText(value).catch(() => undefined); };
const sentence = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** A row action: copies the value; the icon turns into a check and a live region says so. */
function CopyAction({ value, label }: { value: string; label: string }) {
  const [copied, flash] = useTimedFlag();
  return (
    <>
      <IconButton appearance="flat" level="primary" size="sm" aria-label={`Copy ${label}`} icon={<Icon name={copied ? "icon-check-line" : "icon-copy-line"} />} onClick={() => { copyText(value); flash(); }} />
      <VisuallyHidden role="status">{copied ? `${sentence(label)} copied` : ""}</VisuallyHidden>
    </>
  );
}

/* ───────────── Description List ───────────── */

const receiptRows: DescriptionListItem[] = [
  { term: "Subtotal", description: "$311.90" },
  { term: "Shipping", description: "$10.00" },
  { term: "Estimated tax", description: "$24.95" },
];
const contactRows = [
  { id: "email", term: "Email", description: "ava.chen@zen-studio.example", copy: "email", variable: "email" },
  { id: "phone", term: "Phone", description: "+84 28 3823 4567", copy: "phone number", variable: "phone" },
  { id: "address", term: "Shipping address", description: "12 Nguyen Hue, Ben Nghe Ward, District 1, Ho Chi Minh City 700000, Vietnam", copy: "shipping address", variable: "address" },
];

function DescriptionListPlayground() {
  const [content, setContent] = useState<"order" | "contact">("order");
  const [layout, setLayout] = useState<DescriptionListLayout>("inline");
  const [width, setWidth] = useState<"card" | "narrow">("card");
  const [divider, setDivider] = useState(false);
  const [total, setTotal] = useState(true);
  const [actions, setActions] = useState(true);
  const items: DescriptionListItem[] = content === "order"
    ? [...receiptRows, ...(total ? [{ term: "Total", description: "$346.85", emphasis: true }] : [])]
    : contactRows.map(({ id, term, description, copy }) => ({ id, term, description, action: actions ? <CopyAction value={description} label={copy} /> : undefined }));
  const itemCode = content === "order"
    ? [...receiptRows.map((row) => `    { term: "${row.term}", description: "${row.description}" },`), ...(total ? [`    { term: "Total", description: "$346.85", emphasis: true },`] : [])]
    : contactRows.map((row) => `    { term: "${row.term}", description: ${row.variable}${actions ? `,\n      action: <IconButton appearance="flat" level="primary" size="sm" aria-label="Copy ${row.copy}"\n        icon={<Icon name="icon-copy-line" />} onClick={() => copy(${row.variable})} />` : ""} },`);
  const code = `import { DescriptionList${content === "contact" && actions ? ", Icon, IconButton" : ""} } from "@zen/design-system";

<DescriptionList${layout === "stacked" ? `\n  layout="stacked"` : ""}${divider ? "\n  divider" : ""}
  items={[
${itemCode.join("\n")}
  ]}
/>`;
  return (
    <Panel
      title="Description List"
      previewClassName="pac-preview"
      controls={<>
        <PlaygroundFilterChip label="Content" value={content} onChange={(value) => setContent(value === "contact" ? "contact" : "order")} options={[option("order", "Order summary"), option("contact", "Contact details")]} />
        <PlaygroundFilterChip label="Layout" value={layout} onChange={(value) => setLayout(value === "stacked" ? "stacked" : "inline")} options={[option("inline", "Inline"), option("stacked", "Stacked")]} />
        <PlaygroundFilterChip label="Width" value={width} onChange={(value) => setWidth(value === "narrow" ? "narrow" : "card")} options={[option("card", "Card (420px)"), option("narrow", "Narrow (300px)")]} />
        <PlaygroundToggle label="Divider" selected={divider} onChange={setDivider} />
        {content === "order" ? <PlaygroundToggle label="Total row" selected={total} onChange={setTotal} /> : <PlaygroundToggle label="Copy actions" selected={actions} onChange={setActions} />}
      </>}
      code={code}
    >
      <div className="pac-dl-frame" data-width={width}>
        <Card theme="flat">
          <Stack gap="md">
            <Heading level={3} textStyle="Heading/Subheading">{content === "order" ? "Order summary" : "Contact details"}</Heading>
            <DescriptionList layout={layout} divider={divider} items={items} />
          </Stack>
        </Card>
      </div>
    </Panel>
  );
}

/* ───────────── Action Bar ───────────── */

function PrintDetails({ print, headingLevel }: { print: Print; headingLevel: 3 | 4 }) {
  return (
    <div className="pac-product">
      <Image src={print.photo.src} alt={print.photo.alt} ratio="4:3" radius="lg" loading="eager" />
      <div className="pac-product__head">
        <Heading level={headingLevel} textStyle="Heading/3">{print.name}</Heading>
        <Text textStyle="Body/Base/Medium">{money(print.price)} · {print.size}</Text>
      </div>
      <Text tone="base">A museum-grade print of the photo, made to order on cotton rag paper and framed by hand in oak.</Text>
      <DescriptionList divider items={printSpecs} />
    </div>
  );
}

function ActionBarPlayground() {
  const [device, setDevice] = useState<"phone" | "desktop">("phone");
  const [direction, setDirection] = useState<ActionBarDirection>("vertical");
  const [position, setPosition] = useState<ActionBarPosition>("sticky");
  const [surface, setSurface] = useState<ActionBarSurface>("default");
  const [summary, setSummary] = useState(true);
  const [secondary, setSecondary] = useState(true);
  const [inCart, setInCart] = useState(0);
  const [saved, setSaved] = useState(false);
  const print = prints[0];
  const summaryText = inCart ? `${plural(inCart, "print")} in your cart · ${money(inCart * print.price)}` : `${money(print.price)} · Free delivery`;
  const props = [direction !== "vertical" ? ` direction="${direction}"` : "", position !== "sticky" ? ` position="${position}"` : "", surface !== "default" ? ` surface="${surface}"` : ""].join("");
  const code = `import { ActionBar${summary ? ", Text" : ""} } from "@zen/design-system";

{/* Last child of the scrolling page */}
<ActionBar${props}${summary ? `\n  summary={<Text textStyle="Body/Small/Regular" tone="base" role="status">{summary}</Text>}` : ""}
  primaryAction={{ label: "Add to cart", onClick: addToCart }}${secondary ? `\n  secondaryAction={{ label: "Save for later", onClick: saveForLater }}` : ""}
/>`;
  return (
    <Panel
      title="Action Bar"
      previewClassName="pac-preview"
      controls={<>
        <PlaygroundFilterChip label="Device" value={device} onChange={(value) => setDevice(value === "desktop" ? "desktop" : "phone")} options={[option("phone", "Phone"), option("desktop", "Desktop")]} />
        <PlaygroundFilterChip label="Direction" value={direction} onChange={(value) => setDirection(value === "horizontal" ? "horizontal" : "vertical")} options={[option("vertical", "Vertical"), option("horizontal", "Horizontal")]} />
        <PlaygroundFilterChip label="Position" value={position} onChange={(value) => setPosition(value === "fixed" || value === "static" ? value : "sticky")} options={[option("sticky", "Sticky"), option("fixed", "Fixed"), option("static", "Static")]} />
        <PlaygroundFilterChip label="Surface" value={surface} onChange={(value) => setSurface(value === "alt" || value === "none" ? value : "default")} options={[option("default", "Default"), option("alt", "Alt"), option("none", "None")]} />
        <PlaygroundToggle label="Summary" selected={summary} onChange={setSummary} />
        <PlaygroundToggle label="Secondary action" selected={secondary} onChange={setSecondary} />
      </>}
      code={code}
    >
      <div className="pac-frame-stack">
        <div className="pac-frame" data-device={device} role="group" aria-label={`${device === "phone" ? "Phone" : "Desktop"} page preview`}>
          <div className="pac-frame__scroll">
            <div className="pac-frame__page"><PrintDetails print={print} headingLevel={3} /></div>
            <ActionBar direction={direction} position={position} surface={surface}
              summary={summary ? <Text textStyle="Body/Small/Regular" tone="base" role="status">{summaryText}</Text> : undefined}
              primaryAction={{ label: "Add to cart", onClick: () => setInCart((count) => count + 1) }}
              secondaryAction={secondary ? { label: saved ? "Saved for later" : "Save for later", onClick: () => setSaved((value) => !value) } : undefined} />
          </div>
        </div>
      </div>
    </Panel>
  );
}

/* ───────────── Image & Thumbnail ───────────── */

const radiusOptions = ["none", "sm", "md", "lg", "xl"] as const;
const thumbnailSizes: ZenScale[] = ["3xs", "2xs", "xs", "sm", "md", "lg", "xl", "2xl", "3xl"];
const thumbnailPx: Record<ZenScale, number> = { "3xs": 16, "2xs": 20, xs: 24, sm: 32, md: 40, lg: 48, xl: 56, "2xl": 80, "3xl": 112 };

function ImagePlayground() {
  const [kind, setKind] = useState<"image" | "thumbnail">("image");
  const [ratio, setRatio] = useState<ImageRatioName | "auto">("4:3");
  const [fit, setFit] = useState<ImageFit>("cover");
  const [radius, setRadius] = useState<(typeof radiusOptions)[number]>("md");
  const [size, setSize] = useState<ZenScale>("md");
  const [shape, setShape] = useState<ThumbnailShape>("rounded");
  const [state, setState] = useState<"loaded" | "loading" | "error">("loaded");
  const [caption, setCaption] = useState(false);
  const photo = platformMedia.mountainRoad;
  const src = state === "loaded" ? photo.src : state === "error" ? brokenImage : undefined;
  const srcCode = state === "loaded" ? "photo.src" : state === "error" ? "brokenUrl" : "undefined /* still fetching */";
  const code = kind === "image"
    ? `import { Image } from "@zen/design-system";

<Image
  src={${srcCode}}
  alt="${photo.alt}"${ratio !== "auto" ? `\n  ratio="${ratio}"` : ""}${fit !== "cover" ? `\n  fit="${fit}"` : ""}${radius !== "md" ? `\n  radius="${radius}"` : ""}${caption ? `\n  caption="Transfăgărășan road, Romania · photo by the travel team"` : ""}
/>`
    : `import { Thumbnail } from "@zen/design-system";

<Thumbnail src={${srcCode}} alt=""${size !== "md" ? ` size="${size}"` : ""}${shape !== "rounded" ? ` shape="${shape}"` : ""} />`;
  return (
    <Panel
      title={kind === "image" ? "Image" : "Thumbnail"}
      previewClassName="pac-preview"
      controls={<>
        <PlaygroundFilterChip label="Component" value={kind} onChange={(value) => setKind(value === "thumbnail" ? "thumbnail" : "image")} options={[option("image", "Image"), option("thumbnail", "Thumbnail")]} />
        {kind === "image" ? <>
          <PlaygroundFilterChip label="Ratio" value={ratio} onChange={(value) => setRatio((imageRatios as readonly string[]).includes(String(value)) ? (String(value) as ImageRatioName) : "auto")} options={[...imageRatios.map((id) => option(id)), option("auto", "Own ratio")]} />
          <PlaygroundFilterChip label="Fit" value={fit} onChange={(value) => setFit(value === "contain" ? "contain" : "cover")} options={[option("cover", "Cover"), option("contain", "Contain")]} />
          <PlaygroundFilterChip label="Radius" value={radius} onChange={(value) => setRadius((radiusOptions as readonly string[]).includes(String(value)) ? (String(value) as (typeof radiusOptions)[number]) : "md")} options={radiusOptions.map((id) => option(id))} />
        </> : <>
          <PlaygroundFilterChip label="Size" value={size} onChange={(value) => setSize(thumbnailSizes.includes(String(value) as ZenScale) ? (String(value) as ZenScale) : "md")} options={thumbnailSizes.map((id) => option(id, `${id} (${thumbnailPx[id]}px)`))} />
          <PlaygroundFilterChip label="Shape" value={shape} onChange={(value) => setShape(value === "circle" || value === "square" ? value : "rounded")} options={[option("rounded", "Rounded"), option("circle", "Circle"), option("square", "Square")]} />
        </>}
        <PlaygroundFilterChip label="State" value={state} onChange={(value) => setState(value === "loading" || value === "error" ? value : "loaded")} options={[option("loaded", "Loaded"), option("loading", "Loading"), option("error", "Error")]} />
        {kind === "image" ? <PlaygroundToggle label="Caption" selected={caption} onChange={setCaption} /> : null}
      </>}
      code={code}
    >
      {kind === "image" ? (
        <div className="pac-image-stage">
          <Image src={src} alt={photo.alt} ratio={ratio === "auto" ? undefined : ratio} fit={fit} radius={radius as ZenCornerRadius} loading="eager" caption={caption ? "Transfăgărășan road, Romania · photo by the travel team" : undefined} />
        </div>
      ) : (
        <div className="pac-image-stage" data-kind="thumbnail">
          <Thumbnail src={src} alt="" size={size} shape={shape} loading="eager" />
          <Text as="span" textStyle="Body/Small/Regular" tone="base">mountain-road.webp · {thumbnailPx[size]}px</Text>
        </div>
      )}
    </Panel>
  );
}

/* ───────────── Visually Hidden ───────────── */

type Invoice = { id: string; client: string; amount: number };
const invoicesInitial: Invoice[] = [
  { id: "INV-2401", client: "Hanoi Coffee Co.", amount: 1280.4 },
  { id: "INV-2402", client: "Studio Lumen", amount: 86.5 },
  { id: "INV-2403", client: "Blue Door Books", amount: 412 },
];

function InvoiceTable({ archiveNote = true }: { archiveNote?: boolean }) {
  const [rows, setRows] = useState(invoicesInitial);
  const [starred, setStarred] = useState<string[]>(["INV-2403"]);
  const [archived, setArchived] = useState<Invoice | null>(null);
  const archive = (row: Invoice) => { setRows((list) => list.filter((entry) => entry.id !== row.id)); setArchived(row); };
  const undo = () => { if (archived) setRows((list) => invoicesInitial.filter((entry) => entry.id === archived.id || list.some((item) => item.id === entry.id))); setArchived(null); };
  return (
    <Stack gap="sm">
      {archiveNote && archived ? <InlineMessage theme="neutral" title={`${archived.id} archived`} action={{ label: "Undo", onClick: undo }} onClose={() => setArchived(null)} /> : null}
      {/* A page's table sits straight on the page, no Card (usage rules §14). */}
      <Table aria-label="Invoices" rows={rows} getRowId={(row) => row.id}
        empty={<EmptyState illustration={false} title="No invoices" primaryAction={{ label: "Restore invoices", onClick: () => { setRows(invoicesInitial); setArchived(null); } }}>Archived invoices leave this list.</EmptyState>}
        columns={[
          { id: "starred", header: <VisuallyHidden>Starred</VisuallyHidden>, width: "64px", cell: (row) => {
            const on = starred.includes(row.id);
            return <IconButton appearance="flat" level="primary" size="sm" aria-label={`Star ${row.id}`} aria-pressed={on} icon={<Icon name={on ? "icon-star-01-solid" : "icon-star-01-line"} />} onClick={() => setStarred((list) => on ? list.filter((id) => id !== row.id) : [...list, row.id])} />;
          } },
          { id: "invoice", header: "Invoice", cell: (row) => <TableText bold caption={row.client}><span className="pac-nowrap">{row.id}</span></TableText> },
          { id: "amount", header: "Amount", align: "right", cell: (row) => <TableText>{money(row.amount)}</TableText> },
          { id: "actions", header: <VisuallyHidden>Actions</VisuallyHidden>, align: "right", cell: (row) => <TableActions><IconButton appearance="flat" level="primary" size="md" aria-label={`Archive ${row.id}`} icon={<Icon name="icon-archive-line" />} onClick={() => archive(row)} /></TableActions> },
        ]} />
    </Stack>
  );
}

const sitePages: Record<string, string> = {
  Overview: "12 orders to pack today, 3 prints low on stock and $1,284.00 in sales this week.",
  Prints: "6 prints in the shop. Bridge at dusk is sold out: restock it before the weekend sale.",
  Orders: "12 orders are waiting to ship; the oldest was placed on Monday morning.",
  Customers: "248 customers, 18 of them new this month. 5 have an order on the way.",
  Settings: "Store name, shipping zones and payment methods for Zen Prints.",
};

function SkipLinkSite({ skipRef }: { skipRef?: RefObject<HTMLElement | null> }) {
  const headingId = useId();
  const [page, setPage] = useState("Overview");
  const mainRef = useRef<HTMLElement>(null);
  const pagesList = Object.keys(sitePages);
  return (
    <div className="pac-site">
      <VisuallyHidden as="a" href={`#${headingId}`} focusable ref={skipRef} onClick={(event) => { event.preventDefault(); mainRef.current?.focus(); }}>Skip to main content</VisuallyHidden>
      <header className="pac-site__header">
        <Text as="span" textStyle="Body/Base/Bold">Zen Prints</Text>
        <nav className="pac-site__nav" aria-label="Zen Prints">
          <ul>
            {pagesList.map((name) => <li key={name}><a className="zen-type-body-small-medium" href={`#${name.toLowerCase()}`} aria-current={name === page ? "page" : undefined} onClick={(event) => { event.preventDefault(); setPage(name); }}>{name}</a></li>)}
          </ul>
        </nav>
      </header>
      <section ref={mainRef} className="pac-site__main" tabIndex={-1} aria-labelledby={headingId}>
        <Heading level={4} textStyle="Heading/Subheading" id={headingId}>{page}</Heading>
        <Text tone="base">{sitePages[page]}</Text>
      </section>
    </div>
  );
}

function VisuallyHiddenPlayground() {
  const [useCase, setUseCase] = useState<"header" | "skip" | "status">("header");
  const [reveal, setReveal] = useState(false);
  const skipRef = useRef<HTMLElement | null>(null);
  const [copied, flash] = useTimedFlag(2500);
  const output = useCase === "header" ? ["Column header: Starred", "Column header: Actions"] : useCase === "skip" ? ["Link: Skip to main content"] : [copied ? "Status: Link copied to the clipboard" : "Status: (nothing yet — press Copy link)"];
  const code = useCase === "header"
    ? `import { Table, VisuallyHidden } from "@zen/design-system";

<Table aria-label="Invoices" rows={invoices} getRowId={(row) => row.id} columns={[
  { id: "starred", header: <VisuallyHidden>Starred</VisuallyHidden>, cell: starToggle },
  { id: "invoice", header: "Invoice", cell: invoiceCell },
  { id: "actions", header: <VisuallyHidden>Actions</VisuallyHidden>, align: "right", cell: archiveButton },
]} />`
    : useCase === "skip"
      ? `import { VisuallyHidden } from "@zen/design-system";

{/* First element in <body>: visible only while focused */}
<VisuallyHidden as="a" href="#main" focusable>Skip to main content</VisuallyHidden>
<header>…navigation…</header>
<main id="main" tabIndex={-1}>…</main>`
      : `import { Icon, IconButton, VisuallyHidden } from "@zen/design-system";

<IconButton aria-label="Copy link" icon={<Icon name={copied ? "icon-check-line" : "icon-copy-line"} />} onClick={copy} />
{/* Rendered from the start (empty), so the change is announced */}
<VisuallyHidden role="status">{copied ? "Link copied to the clipboard" : ""}</VisuallyHidden>`;
  return (
    <Panel
      title="Visually Hidden"
      previewClassName="pac-preview"
      controls={<>
        <PlaygroundFilterChip label="Use case" value={useCase} onChange={(value) => setUseCase(value === "skip" || value === "status" ? value : "header")} options={[option("header", "Icon-only table header"), option("skip", "Skip link"), option("status", "Status message")]} />
        <PlaygroundToggle label="Reveal hidden text" selected={reveal} onChange={setReveal} />
      </>}
      code={code}
    >
      {/* The invoice table needs ~670px for its four columns: its stage widens so the Archive column shows. */}
      <div className={["pac-vh-stage", useCase === "header" ? "pac-vh-stage--table" : undefined, reveal ? "pac-vh-reveal" : undefined].filter(Boolean).join(" ")}>
        {useCase === "header" ? <InvoiceTable archiveNote={false} /> : null}
        {useCase === "skip" ? <>
          <SkipLinkSite skipRef={skipRef} />
          <Button level="tertiary" size="sm" className="pac-stack-start" onClick={() => skipRef.current?.focus()}>Focus the skip link</Button>
        </> : null}
        {useCase === "status" ? (
          <div className="pac-share">
            <InputField aria-label="Link to this print" readOnly value="https://prints.zen.example/windmill" />
            <IconButton appearance="main" level="tertiary" size="md" aria-label="Copy link" icon={<Icon name={copied ? "icon-check-line" : "icon-copy-line"} />} onClick={() => { copyText("https://prints.zen.example/windmill"); flash(); }} />
            <VisuallyHidden role="status">{copied ? "Link copied to the clipboard" : ""}</VisuallyHidden>
          </div>
        ) : null}
        <div className="pac-vh-output" aria-hidden="true">
          <Text as="span" textStyle="Label/Small/Medium" tone="light">What a screen reader announces</Text>
          {output.map((line) => <Text key={line} as="span" textStyle="Body/Small/Regular">{line}</Text>)}
        </div>
      </div>
    </Panel>
  );
}

/* ───────────── Pages and examples ───────────── */

export const pages: Partial<Record<AppLayerPage, AppLayerPageMeta>> = keepOnHotUpdate(import.meta.hot, "pages", {
  "description-list": {
    label: "Description List",
    eyebrow: "Components / Description List",
    title: "Description List",
    description: "Term → description pairs in a semantic dl: order summaries with a total, contact and profile details, specs and metadata. Inline rows (term left, value right) stack by themselves when the list is narrow.",
    playground: DescriptionListPlayground,
  },
  "action-bar": {
    label: "Action Bar",
    eyebrow: "Components / Action Bar",
    title: "Action Bar",
    description: "The footer bar for a screen’s main actions. On phones: vertical, Large full-width buttons with Primary on top, or horizontal, two Large buttons side by side (Tertiary · Primary). On desktop: Tertiary · Primary at the end. Sticky, fixed or static, on Surface with a Pale rule and safe-area padding.",
    playground: ActionBarPlayground,
  },
  image: {
    label: "Image",
    eyebrow: "Components / Image",
    title: "Image & Thumbnail",
    description: "Pictures in a ratio frame with a Skeleton while loading, a neutral placeholder when they fail and an optional caption. Thumbnail is the fixed square on the Image-Size scale for list rows and tables.",
    playground: ImagePlayground,
  },
  "visually-hidden": {
    label: "Visually Hidden",
    eyebrow: "Components / Visually Hidden",
    title: "Visually Hidden",
    description: "Content for screen readers only: names for icon-only table headers, context for repeated links, status announcements and skip links that appear on focus.",
    playground: VisuallyHiddenPlayground,
  },
});

// The examples of these pages live in src/platform/examples/pages/<page>.tsx (examples/registry.ts).
export const examples: ExampleMap = {};

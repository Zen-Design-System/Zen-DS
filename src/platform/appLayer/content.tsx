import { useEffect, useId, useRef, useState, type FormEvent, type RefObject } from "react";
import { ActionBar, type ActionBarDirection, type ActionBarPosition, type ActionBarSurface } from "../../components/ActionBar";
import { Badge } from "../../components/Badge";
import { BottomSheet } from "../../components/BottomSheet";
import { Button, IconButton } from "../../components/Button";
import { Card } from "../../components/Card";
import { DescriptionList, type DescriptionListItem, type DescriptionListLayout } from "../../components/DescriptionList";
import { EmptyState } from "../../components/EmptyState";
import { Icon } from "../../components/Icon";
import { Image, Thumbnail, imageRatios, type ImageFit, type ImageRatioName, type ThumbnailShape } from "../../components/Image";
import { InlineMessage } from "../../components/InlineMessage";
import { InputField, NumberField, SelectField, TextAreaField } from "../../components/Input";
import { Stack } from "../../components/Layout";
import { List, ListItem } from "../../components/ListItem";
import { MetricCard } from "../../components/MetricWidget";
import { Segmented } from "../../components/Segmented";
import { SkeletonText } from "../../components/Skeleton";
import { Table, TableActions, TableMedia, TableText, type TableSort } from "../../components/Table";
import { Heading, Text, plural } from "../../components/Text";
import { Toggle } from "../../components/Toggle";
import { TopNavigation } from "../../components/TopNavigation";
import { VisuallyHidden } from "../../components/VisuallyHidden";
import type { ZenCornerRadius, ZenScale } from "../../components/_shared/scale";
import { platformMedia, type PlatformPhoto } from "../PlatformMedia";
import { PlatformPhone } from "../PlatformPhone";
import { Panel, PlaygroundFilterChip, PlaygroundToggle, option } from "./shared";
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

/** Runs `done` after `ms`, restarting when called again; cancelled on unmount. */
function useDelay() {
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return (done: () => void, ms: number) => { window.clearTimeout(timer.current); timer.current = window.setTimeout(done, ms); };
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
        <Card theme="border">
          <Stack gap="md">
            <Heading level={3} textStyle="Heading/Subheading">{content === "order" ? "Order summary" : "Contact details"}</Heading>
            <DescriptionList layout={layout} divider={divider} items={items} />
          </Stack>
        </Card>
      </div>
    </Panel>
  );
}

function DlOrderSummaryExample() {
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>(undefined);
  const lines = [prints[0], prints[1], prints[4]];
  const subtotal = lines.reduce((sum, print) => sum + print.price, 0);
  const discount = applied ? Math.round(subtotal * 10) / 100 : 0;
  const shipping = 8;
  const tax = Math.round((subtotal - discount) * 8) / 100;
  const apply = (event: FormEvent) => {
    event.preventDefault();
    const value = code.trim().toUpperCase();
    if (!value) { setError("Enter a promo code, like WELCOME10."); return; }
    if (value !== "WELCOME10") { setError(`“${value}” isn’t a valid code. Check the spelling or try WELCOME10.`); return; }
    setApplied(value);
    setError(undefined);
    setCode("");
  };
  return (
    <Card theme="border" className="pac-card-fill">
      <Stack gap="lg">
        <Heading level={4} textStyle="Heading/Subheading">Order summary</Heading>
        <DescriptionList
          items={[
            { term: `Subtotal · ${plural(lines.length, "print")}`, description: money(subtotal) },
            ...(applied ? [{
              term: `Discount (${applied})`,
              description: <Text as="span" textStyle="Body/Base/Medium" tone="positive">−{money(discount)}</Text>,
              action: <IconButton appearance="flat" level="primary" size="sm" aria-label={`Remove promo code ${applied}`} icon={<Icon name="icon-x-medium-line" />} onClick={() => setApplied(null)} />,
            }] : []),
            { term: "Shipping", description: money(shipping) },
            { term: "Estimated tax", description: money(tax) },
            { term: "Total", description: money(subtotal - discount + shipping + tax), emphasis: true },
          ]}
        />
        {applied ? null : (
          <form className="pac-form" onSubmit={apply} noValidate>
            <InputField label="Promo code" placeholder="WELCOME10" value={code} error={error} onChange={(event) => { setCode(event.target.value); setError(undefined); }} />
            <Button level="tertiary" type="submit" className="pac-stack-start">Apply code</Button>
          </form>
        )}
      </Stack>
    </Card>
  );
}

function DlOrderDetailsExample() {
  return (
    <Card theme="border" className="pac-card-fill">
      <Stack gap="md">
        <Heading level={4} textStyle="Heading/Subheading">Order details</Heading>
        <DescriptionList
          divider
          items={[
            { term: "Order number", description: "#10428-VN", action: <CopyAction value="10428-VN" label="order number" /> },
            { term: "Status", description: <Badge size="small" theme="green" background="subtle">Shipped</Badge> },
            { term: "Placed on", description: "Thursday, 2 October 2026" },
            { term: "Payment", description: "Visa ending 4242" },
            { term: "Tracking number", description: "VN 2931 8830 4410", action: <CopyAction value="VN293188304410" label="tracking number" /> },
          ]}
        />
      </Stack>
    </Card>
  );
}

type ProfileField = "name" | "email" | "phone" | "address";
const profileFields: { id: ProfileField; term: string }[] = [
  { id: "name", term: "Full name" },
  { id: "email", term: "Email" },
  { id: "phone", term: "Phone" },
  { id: "address", term: "Shipping address" },
];

function DlProfileExample() {
  const [profile, setProfile] = useState<Record<ProfileField, string>>({ name: "Ava Chen", email: "ava.chen@zen-studio.example", phone: "+84 28 3823 4567", address: "12 Nguyen Hue, Ben Nghe Ward, District 1, Ho Chi Minh City 700000, Vietnam" });
  const [editing, setEditing] = useState<ProfileField | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  const save = (event: FormEvent, field: ProfileField, term: string) => {
    event.preventDefault();
    if (!draft.trim()) { setError(`Enter your ${term.toLowerCase()}.`); return; }
    setProfile((current) => ({ ...current, [field]: draft.trim() }));
    setEditing(null);
  };
  return (
    <Card theme="border" className="pac-card-fill">
      <Stack gap="md">
        <Heading level={4} textStyle="Heading/Subheading">Personal details</Heading>
        <DescriptionList
          layout="stacked"
          divider
          items={profileFields.map(({ id, term }) => editing === id ? {
            id,
            term,
            description: (
              <form className="pac-inline-edit" onSubmit={(event) => save(event, id, term)} noValidate>
                <InputField aria-label={term} value={draft} error={error} autoFocus onChange={(event) => { setDraft(event.target.value); setError(undefined); }} />
                <div className="pac-inline-edit__actions">
                  <Button level="tertiary" size="sm" onClick={() => setEditing(null)}>Cancel</Button>
                  <Button level="primary" size="sm" type="submit">Save<VisuallyHidden> {term.toLowerCase()}</VisuallyHidden></Button>
                </div>
              </form>
            ),
          } : {
            id,
            term,
            description: profile[id],
            action: editing ? undefined : <Button level="tertiary" size="sm" onClick={() => { setEditing(id); setDraft(profile[id]); setError(undefined); }}>Edit<VisuallyHidden> {term.toLowerCase()}</VisuallyHidden></Button>,
          })}
        />
      </Stack>
    </Card>
  );
}

const orders = [
  { id: "10428", date: "2 Oct", lines: [{ print: prints[0], qty: 1 }, { print: prints[1], qty: 2 }], shipping: 8 },
  { id: "10391", date: "18 Sep", lines: [{ print: prints[3], qty: 1 }], shipping: 0 },
  { id: "10355", date: "30 Aug", lines: [{ print: prints[5], qty: 3 }, { print: prints[2], qty: 1 }], shipping: 8 },
  { id: "10302", date: "12 Aug", lines: [{ print: prints[4], qty: 1 }], shipping: 8 },
  { id: "10277", date: "1 Aug", lines: [{ print: prints[1], qty: 1 }, { print: prints[0], qty: 1 }], shipping: 0 },
];
const orderCount = (order: (typeof orders)[number]) => order.lines.reduce((sum, line) => sum + line.qty, 0);
const orderTotal = (order: (typeof orders)[number]) => order.lines.reduce((sum, line) => sum + line.qty * line.print.price, 0) + order.shipping;

function DlReceiptSheetExample() {
  const [open, setOpen] = useState(false);
  const [orderId, setOrderId] = useState(orders[0].id);
  const [sent, setSent] = useState<string[]>([]);
  const order = orders.find((entry) => entry.id === orderId) ?? orders[0];
  const isSent = sent.includes(order.id);
  return (
    <PlatformPhone label="Order history" header={<TopNavigation type="compact" title="Orders" />}>
      <List aria-label="Past orders">
        {orders.map((entry) => (
          <ListItem key={entry.id} title={`Order #${entry.id}`} caption={`${entry.date} · ${plural(orderCount(entry), "print")} · ${money(orderTotal(entry))}`}
            leading={<Thumbnail src={entry.lines[0].print.photo.src} alt="" />} trailing={<Icon name="icon-chevron-right-line-small" decorative />}
            onClick={() => { setOrderId(entry.id); setOpen(true); }} />
        ))}
      </List>
      <BottomSheet inline open={open} onOpenChange={setOpen} title={`Order #${order.id}`} actionsDirection="vertical"
        primaryAction={{ label: isSent ? "Receipt sent" : "Email receipt", disabled: isSent, onClick: () => setSent((list) => [...list, order.id]) }}
        secondaryAction={{ label: "Close" }}>
        <div className="pac-sheet-body">
          <DescriptionList
            items={[
              ...order.lines.map((line) => ({ id: line.print.id, term: `${line.print.name} × ${line.qty}`, description: money(line.qty * line.print.price) })),
              { term: "Shipping", description: order.shipping ? money(order.shipping) : "Free" },
              { term: "Total", description: money(orderTotal(order)), emphasis: true },
            ]}
          />
          <DescriptionList layout="stacked" items={[{ term: "Delivered to", description: "12 Nguyen Hue, District 1, Ho Chi Minh City" }, { term: "Paid with", description: "Visa ending 4242" }]} />
          {isSent ? <InlineMessage theme="positive" title="Receipt sent">We emailed it to ava.chen@zen-studio.example.</InlineMessage> : null}
        </div>
      </BottomSheet>
    </PlatformPhone>
  );
}

function DlSkeleton({ rows }: { rows: number }) {
  return <div className="pac-dl-skeleton" aria-hidden="true">{Array.from({ length: rows }, (_, index) => <div key={index}><SkeletonText lines={1} /><SkeletonText lines={1} /></div>)}</div>;
}

function DlLoadingExample() {
  const [loading, setLoading] = useState(true);
  const [refreshed, setRefreshed] = useState(0);
  const delay = useDelay();
  useEffect(() => { if (loading) delay(() => { setLoading(false); setRefreshed((count) => count + 1); }, 1200); }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Card theme="border" className="pac-card-fill">
      <Stack gap="md">
        <Stack direction="row" justify="between" align="center" gap="sm">
          <Heading level={4} textStyle="Heading/Subheading">Shipment</Heading>
          <Button level="tertiary" size="sm" startIcon={<Icon name="icon-refresh-cw-01-line" decorative />} disabled={loading} onClick={() => setLoading(true)}>{loading ? "Refreshing…" : "Refresh"}</Button>
        </Stack>
        <div aria-busy={loading}>
          {loading ? <DlSkeleton rows={4} /> : (
            <DescriptionList
              items={[
                { term: "Carrier", description: "Giao Hàng Nhanh" },
                { term: "Tracking number", description: "GHN 5K2 7QX 931" },
                { term: "Estimated delivery", description: "Friday, 3 October" },
                { term: "Last scan", description: refreshed > 1 ? "Out for delivery · just now" : "Ho Chi Minh City hub · 2h ago" },
              ]}
            />
          )}
        </div>
        <VisuallyHidden role="status">{loading ? "Loading shipment details" : "Shipment details updated"}</VisuallyHidden>
      </Stack>
    </Card>
  );
}

function DlEdgeCasesExample() {
  const [narrow, setNarrow] = useState(false);
  return (
    <Stack gap="md">
      <Toggle label="Narrow column (280px)" selected={narrow} onSelectedChange={setNarrow} />
      <div className="pac-edge-grid" data-narrow={narrow ? "true" : undefined}>
        <Card theme="border" spacing="small">
          <Stack gap="sm">
            <Heading level={4} textStyle="Body/Base/Bold">Workspace</Heading>
            <DescriptionList
              items={[
                { term: "Workspace ID", description: "ws_01J9ZK4T7Q8M3N5B2V6C8X0Z1A" },
                { term: "Billing email", description: "accounts-payable.finance-team@zen-studio.example" },
                { term: "Plan", description: "Business · 48 seats" },
              ]}
            />
          </Stack>
        </Card>
        <Card theme="border" spacing="small">
          <Stack gap="sm">
            <Heading level={4} textStyle="Body/Base/Bold">Balance</Heading>
            <DescriptionList items={[{ term: "Available credit", description: "$0.00", emphasis: true }]} />
          </Stack>
        </Card>
      </div>
    </Stack>
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
        <PlaygroundFilterChip label="Direction" value={direction} onChange={(value) => setDirection(value === "horizontal" ? "horizontal" : "vertical")} options={[option("vertical", "Vertical (phone)"), option("horizontal", "Horizontal (desktop)")]} />
        <PlaygroundFilterChip label="Position" value={position} onChange={(value) => setPosition(value === "fixed" || value === "static" ? value : "sticky")} options={[option("sticky", "Sticky"), option("fixed", "Fixed"), option("static", "Static")]} />
        <PlaygroundFilterChip label="Surface" value={surface} onChange={(value) => setSurface(value === "alt" || value === "none" ? value : "default")} options={[option("default", "Default"), option("alt", "Alt"), option("none", "None")]} />
        <PlaygroundToggle label="Summary" selected={summary} onChange={setSummary} />
        <PlaygroundToggle label="Secondary action" selected={secondary} onChange={setSecondary} />
      </>}
      code={code}
    >
      <div className="pac-frame-stack">
        <div className="pac-frame" data-device={direction === "vertical" ? "phone" : "desktop"} role="group" aria-label="Page preview">
          <div className="pac-frame__scroll">
            <div className="pac-frame__page"><PrintDetails print={print} headingLevel={3} /></div>
            <ActionBar direction={direction} position={position} surface={surface}
              summary={summary ? <Text textStyle="Body/Small/Regular" tone="base" role="status">{summaryText}</Text> : undefined}
              primaryAction={{ label: "Add to cart", onClick: () => setInCart((count) => count + 1) }}
              secondaryAction={secondary ? { label: saved ? "Saved for later" : "Save for later", onClick: () => setSaved((value) => !value) } : undefined} />
          </div>
        </div>
        <Text className="pac-frame__note" textStyle="Body/Small/Regular" tone="light" align="center">Scroll the page: sticky settles at the end, fixed stays pinned (a spacer keeps the end reachable), static scrolls away.</Text>
      </div>
    </Panel>
  );
}

function AbPrintShopExample() {
  const [printId, setPrintId] = useState<string | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [saved, setSaved] = useState<string[]>([]);
  const print = prints.find((entry) => entry.id === printId);
  const count = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  const total = prints.reduce((sum, entry) => sum + (cart[entry.id] ?? 0) * entry.price, 0);
  return (
    <PlatformPhone label="Print shop"
      header={<TopNavigation type="compact" title={print ? print.name : "Prints"} leading={print ? { icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => setPrintId(null) } : undefined} />}
      footer={print ? (
        <ActionBar
          summary={<Text textStyle="Body/Small/Regular" tone="base" role="status">{count ? `${plural(count, "print")} in your cart · ${money(total)}` : `${money(print.price)} · Free delivery over $100`}</Text>}
          primaryAction={{ label: "Add to cart", startIcon: <Icon name="icon-shopping-cart-line" decorative />, onClick: () => setCart((current) => ({ ...current, [print.id]: (current[print.id] ?? 0) + 1 })) }}
          secondaryAction={{ label: saved.includes(print.id) ? "Saved for later" : "Save for later", onClick: () => setSaved((list) => list.includes(print.id) ? list.filter((id) => id !== print.id) : [...list, print.id]) }}
        />
      ) : undefined}>
      {print ? (
        <div className="pac-frame__page"><PrintDetails print={print} headingLevel={4} /></div>
      ) : (
        <List aria-label="Prints">
          {prints.map((entry) => (
            <ListItem key={entry.id} title={entry.name} caption={`${money(entry.price)} · ${entry.size}${saved.includes(entry.id) ? " · Saved" : ""}`}
              leading={<Thumbnail src={entry.photo.src} alt="" size="lg" />} trailing={<Icon name="icon-chevron-right-line-small" decorative />} onClick={() => setPrintId(entry.id)} />
          ))}
        </List>
      )}
    </PlatformPhone>
  );
}

const campaignInitial = { name: "Autumn print sale", owner: "ava", discount: "15", starts: "6 October 2026", notes: "Fifteen percent off every framed print for one week. Excludes gift cards." };
type Campaign = typeof campaignInitial;

function AbEditPageExample() {
  const [values, setValues] = useState<Campaign>(campaignInitial);
  const [saved, setSaved] = useState<Campaign>(campaignInitial);
  const [phase, setPhase] = useState<"idle" | "saving" | "saved">("idle");
  const delay = useDelay();
  const changed = (Object.keys(values) as (keyof Campaign)[]).filter((key) => values[key] !== saved[key]).length;
  const set = (key: keyof Campaign) => (value: string) => { setValues((current) => ({ ...current, [key]: value })); setPhase("idle"); };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!changed || phase === "saving") return;
    setPhase("saving");
    delay(() => { setSaved(values); setPhase("saved"); }, 900);
  };
  const status = phase === "saving" ? { icon: "icon-refresh-cw-01-line" as const, tone: "neutral", text: "Saving…" }
    : changed ? { icon: "icon-alert-circle-line" as const, tone: "warning", text: plural(changed, "unsaved change") }
      : phase === "saved" ? { icon: "icon-check-circle-line" as const, tone: "positive", text: "All changes saved" }
        : { icon: "icon-info-circle-line" as const, tone: "neutral", text: "No changes to save yet" };
  return (
    <div className="pac-frame" data-device="desktop" role="group" aria-label="Campaign settings page">
      <form className="pac-frame__scroll" onSubmit={submit} noValidate>
        <div className="pac-frame__page">
          <Heading level={4} textStyle="Heading/3">Campaign settings</Heading>
          <div className="pac-form">
            <InputField label="Campaign name" value={values.name} onChange={(event) => set("name")(event.target.value)} />
            <div className="pac-form__row">
              <SelectField label="Owner" value={values.owner} onChange={(event) => set("owner")(event.target.value)} options={[{ label: "Ava Chen", value: "ava" }, { label: "Bao Nguyen", value: "bao" }, { label: "Chi Tran", value: "chi" }]} />
              <InputField label="Discount (%)" inputMode="numeric" value={values.discount} onChange={(event) => set("discount")(event.target.value)} />
            </div>
            <InputField label="Starts on" value={values.starts} helpText="The sale starts at 00:00 in your store’s time zone." onChange={(event) => set("starts")(event.target.value)} />
            <TextAreaField label="Notes for the team" rows={3} value={values.notes} onChange={(event) => set("notes")(event.target.value)} />
          </div>
        </div>
        <ActionBar direction="horizontal"
          summary={<span className="pac-status" data-tone={status.tone}><Icon name={status.icon} size="sm" decorative /><Text as="span" textStyle="Body/Small/Regular" tone="base" role="status">{status.text}</Text></span>}
          secondaryAction={{ label: "Undo changes", disabled: !changed || phase === "saving", onClick: () => { setValues(saved); setPhase("idle"); } }}
          primaryAction={{ label: phase === "saving" ? "Saving…" : "Save changes", type: "submit", disabled: !changed || phase === "saving" }} />
      </form>
    </div>
  );
}

function AbResponsiveExample() {
  const [view, setView] = useState("phone");
  const [status, setStatus] = useState<"draft" | "saved" | "published">("draft");
  const summary = status === "published" ? "Published · visible to everyone" : status === "saved" ? "Draft saved · only you can see it" : "Draft · not saved yet";
  return (
    <div className="pac-frame-stack">
      <Segmented aria-label="Preview width" options={[{ id: "phone", label: "Phone" }, { id: "desktop", label: "Desktop" }]} value={view} onChange={setView} />
      <div className="pac-frame" data-device={view === "phone" ? "phone" : "desktop"} data-size="short" role="group" aria-label={`Story editor, ${view} width`}>
        <div className="pac-frame__scroll">
          <div className="pac-frame__page">
            <Heading level={4} textStyle="Heading/3">48 hours in the old town</Heading>
            <Text tone="base">Start at the café on the corner before the tour buses arrive, then climb the hill for the view over the rooftops. By noon the lanes are full, so spend the afternoon at the college courtyard.</Text>
            <Text tone="base">In the evening, walk down to the bridge for sunset and finish with dinner by the harbour.</Text>
          </div>
          <ActionBar direction={view === "phone" ? "vertical" : "horizontal"}
            summary={<Text textStyle="Body/Small/Regular" tone="base" role="status">{summary}</Text>}
            primaryAction={{ label: status === "published" ? "Published" : "Publish story", disabled: status === "published", onClick: () => setStatus("published") }}
            secondaryAction={status === "published" ? { label: "Unpublish", onClick: () => setStatus("saved") } : { label: "Save draft", onClick: () => setStatus("saved") }} />
        </div>
      </div>
    </div>
  );
}

const cartInitial = [{ id: "windmill", qty: 1 }, { id: "rooftops", qty: 2 }, { id: "courtyard", qty: 1 }];

function AbCartExample() {
  const [lines, setLines] = useState(cartInitial);
  const [placed, setPlaced] = useState(false);
  const rows = lines.map((line) => ({ ...line, print: prints.find((entry) => entry.id === line.id) ?? prints[0] }));
  const count = rows.reduce((sum, row) => sum + row.qty, 0);
  const total = rows.reduce((sum, row) => sum + row.qty * row.print.price, 0);
  return (
    <div className="pac-frame" data-device="desktop" data-size="short" role="group" aria-label="Cart page">
      <div className="pac-frame__scroll">
        <div className="pac-frame__page">
          <Heading level={4} textStyle="Heading/3">Your cart</Heading>
          {placed ? (
            <InlineMessage theme="positive" title="Order placed" action={{ label: "Start a new order", onClick: () => { setLines(cartInitial); setPlaced(false); } }}>We’ll email you when your prints ship.</InlineMessage>
          ) : rows.length ? (
            <List aria-label="Cart">
              {rows.map((row) => (
                <ListItem key={row.id} title={row.print.name} leading={<Thumbnail src={row.print.photo.src} alt="" />}
                  trailing={<IconButton appearance="flat" level="primary" size="md" aria-label={`Remove ${row.print.name}`} icon={<Icon name="icon-trash-line" />} onClick={() => setLines((current) => current.filter((line) => line.id !== row.id))} />}>
                  {/* Contents slot: title and price, then the quantity, so the row fits any width. */}
                  <Text as="span" textStyle="Body/Base/Bold" truncate>{row.print.name}</Text>
                  <Text as="span" textStyle="Body/Small/Regular" tone="light">{money(row.print.price)} each</Text>
                  <NumberField className="pac-cart-qty" aria-label={`Quantity of ${row.print.name}`} align="center" size="small" min={1} max={9} value={row.qty} onValueChange={(value) => setLines((current) => current.map((line) => line.id === row.id ? { ...line, qty: value ?? 1 } : line))} />
                </ListItem>
              ))}
            </List>
          ) : (
            <EmptyState illustration={false} title="Your cart is empty" primaryAction={{ label: "Add sample prints", onClick: () => setLines(cartInitial) }}>Prints you add appear here.</EmptyState>
          )}
        </div>
        {!placed && rows.length ? (
          <ActionBar direction="horizontal"
            summary={<Stack gap="2xs"><Text textStyle="Body/Small/Regular" tone="base">{plural(count, "print")}</Text><Text textStyle="Body/Base/Bold" role="status">Total {money(total)}</Text></Stack>}
            primaryAction={{ label: "Check out", onClick: () => setPlaced(true) }} />
        ) : null}
      </div>
    </div>
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

function ImageGalleryExample() {
  const [index, setIndex] = useState(0);
  const print = prints[index];
  const go = (delta: number) => setIndex((current) => (current + delta + prints.length) % prints.length);
  return (
    <div className="pac-gallery">
      <div className="pac-gallery__stage">
        <Image src={print.photo.src} alt={print.photo.alt} ratio="4:3" radius="xl" loading="eager" />
        <IconButton className="pac-gallery__nav" data-side="previous" appearance="overlay" level="black-overlay" size="sm" aria-label="Previous photo" icon={<Icon name="icon-chevron-left-line-medium" />} onClick={() => go(-1)} />
        <IconButton className="pac-gallery__nav" data-side="next" appearance="overlay" level="black-overlay" size="sm" aria-label="Next photo" icon={<Icon name="icon-chevron-right-line-medium" />} onClick={() => go(1)} />
      </div>
      <Text textStyle="Body/Small/Regular" tone="base" role="status">{print.name} · Photo {index + 1} of {prints.length}</Text>
      <ul className="pac-thumbs" aria-label="Photos">
        {prints.map((entry, position) => (
          <li key={entry.id}>
            <button type="button" className="pac-thumb" aria-label={`Show ${entry.name}`} aria-pressed={position === index} onClick={() => setIndex(position)}>
              <Thumbnail src={entry.photo.src} alt="" size="xl" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ImageStatesExample() {
  const photo = platformMedia.site[4];
  const [src, setSrc] = useState<string | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  const delay = useDelay();
  const load = () => { setFailed(false); setSrc(undefined); delay(() => setSrc(photo.src), 1400); };
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Card theme="border" className="pac-card-fill">
      <Stack gap="md">
        <Image src={failed ? brokenImage : src} alt={photo.alt} ratio="16:9" caption="Bridge at dusk · 50 × 40 cm print" />
        {failed ? <InlineMessage theme="negative" title="The photo couldn’t load" action={{ label: "Try again", onClick: load }}>The description stays available to screen readers.</InlineMessage> : null}
        <Stack direction="row" gap="xs" wrap>
          <Button level="tertiary" size="sm" startIcon={<Icon name="icon-refresh-cw-01-line" decorative />} onClick={load}>Reload photo</Button>
          <Button level="tertiary" size="sm" startIcon={<Icon name="icon-link-broken-01-line" decorative />} disabled={failed} onClick={() => setFailed(true)}>Break the link</Button>
        </Stack>
      </Stack>
    </Card>
  );
}

function ImageRatiosExample() {
  const [fit, setFit] = useState("cover");
  return (
    <Stack gap="md" align="start">
      <Segmented aria-label="Fit" options={[{ id: "cover", label: "Cover" }, { id: "contain", label: "Contain" }]} value={fit} onChange={setFit} />
      <div className="pac-ratio-grid">
        {imageRatios.map((ratio) => <Image key={ratio} src={platformMedia.mountainRoad.src} alt="" ratio={ratio} fit={fit === "contain" ? "contain" : "cover"} radius="md" caption={ratio} />)}
      </div>
    </Stack>
  );
}

const uploadsInitial = [
  { id: "u1", name: "windmill-by-the-sea.webp", meta: "1.2 MB · Uploaded 2 hours ago", src: platformMedia.site[3].src },
  { id: "u2", name: "old-town-rooftops.webp", meta: "940 KB · Uploaded yesterday", src: platformMedia.site[1].src },
  { id: "u3", name: "bridge-at-dusk.webp", meta: "Preview unavailable · 2.4 MB", src: brokenImage },
  { id: "u4", name: "college-courtyard.webp", meta: "1.8 MB · Uploaded 12 Sep", src: platformMedia.site[0].src },
];

function ImageUploadsExample() {
  const [uploads, setUploads] = useState(uploadsInitial);
  return (
    <Card spacing="small" className="pe-list-card pac-card-fill">
      {uploads.length ? (
        <List aria-label={`Uploads, ${plural(uploads.length, "photo")}`}>
          {uploads.map((upload) => (
            <ListItem key={upload.id} title={upload.name} caption={upload.meta} leading={<Thumbnail src={upload.src} alt="" />}
              trailing={<IconButton appearance="flat" level="primary" size="md" aria-label={`Delete ${upload.name}`} icon={<Icon name="icon-trash-line" />} onClick={() => setUploads((list) => list.filter((entry) => entry.id !== upload.id))} />} />
          ))}
        </List>
      ) : (
        <EmptyState illustration={false} title="No uploads" primaryAction={{ label: "Restore sample uploads", onClick: () => setUploads(uploadsInitial) }}>Photos you upload appear here.</EmptyState>
      )}
    </Card>
  );
}

function ImageTableExample() {
  const [sort, setSort] = useState<TableSort | null>({ columnId: "price", direction: "desc" });
  const rows = [...prints].sort((a, b) => {
    if (!sort) return 0;
    const order = sort.columnId === "name" ? a.name.localeCompare(b.name) : a.price - b.price;
    return sort.direction === "asc" ? order : -order;
  });
  return (
    <Card theme="border" spacing="small" className="pac-table-card">
    <Table aria-label="Prints" rows={rows} getRowId={(row) => row.id} sort={sort} onSortChange={setSort}
      columns={[
        { id: "name", header: "Print", sortable: true, cell: (row) => <TableMedia media={<Thumbnail src={row.photo.src} alt="" size="sm" />} caption={row.size}>{row.name}</TableMedia> },
        { id: "stock", header: "Stock", align: "right", cell: (row) => row.stock ? <TableText>{row.stock}</TableText> : <Badge size="small" theme="orange" background="subtle">Sold out</Badge> },
        { id: "price", header: "Price", align: "right", sortable: true, cell: (row) => <TableText>{money(row.price)}</TableText> },
      ]} />
    </Card>
  );
}

const feedPosts = [
  { id: "p1", photo: platformMedia.feed[0], author: "Ava Chen", when: "2h", likes: 128 },
  { id: "p2", photo: platformMedia.feed[3], author: "Bao Nguyen", when: "5h", likes: 64 },
  { id: "p3", photo: { src: brokenImage, alt: "A hot-air balloon over palm trees" }, author: "Chi Tran", when: "8h", likes: 32 },
  { id: "p4", photo: platformMedia.feed[4], author: "Duy Le", when: "1d", likes: 210 },
  { id: "p5", photo: platformMedia.feed[6], author: "Emi Sato", when: "2d", likes: 97 },
];

function ImageFeedExample() {
  const [liked, setLiked] = useState<string[]>([]);
  return (
    <PlatformPhone label="Photo feed" canvas="canvas" header={<TopNavigation type="compact" title="Explore" />}>
      <div className="pac-feed">
        {feedPosts.map((post) => {
          const isLiked = liked.includes(post.id);
          return (
            <Card key={post.id} as="article" spacing="small" className="pac-feed__card">
              <Image src={post.photo.src} alt={post.photo.alt} ratio="4:3" radius="none" />
              <div className="pac-feed__meta">
                <Stack gap="2xs">
                  <Text as="span" textStyle="Body/Base/Medium">{post.photo.alt}</Text>
                  <Text as="span" textStyle="Body/Small/Regular" tone="light">{post.author} · {post.when}</Text>
                </Stack>
                <span className="pac-feed__like">
                  <IconButton appearance="flat" level="primary" size="md" aria-label={`Like photo by ${post.author}`} aria-pressed={isLiked} icon={<Icon name={isLiked ? "icon-heart-solid" : "icon-heart-line"} />} onClick={() => setLiked((list) => isLiked ? list.filter((id) => id !== post.id) : [...list, post.id])} />
                  <Text as="span" textStyle="Body/Small/Medium" tone="base">{(post.likes + (isLiked ? 1 : 0)).toLocaleString("en-US")}</Text>
                </span>
              </div>
            </Card>
          );
        })}
      </div>
    </PlatformPhone>
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
      <Card theme="border" spacing="small" className="pac-table-card">
      <Table aria-label="Invoices" rows={rows} getRowId={(row) => row.id}
        empty={<EmptyState illustration={false} title="No invoices" primaryAction={{ label: "Restore invoices", onClick: () => { setRows(invoicesInitial); setArchived(null); } }}>Archived invoices leave this list.</EmptyState>}
        columns={[
          { id: "starred", header: <VisuallyHidden>Starred</VisuallyHidden>, icon: "icon-star-01-line", width: "64px", cell: (row) => {
            const on = starred.includes(row.id);
            return <IconButton appearance="flat" level="primary" size="sm" aria-label={`Star ${row.id}`} aria-pressed={on} icon={<Icon name={on ? "icon-star-01-solid" : "icon-star-01-line"} />} onClick={() => setStarred((list) => on ? list.filter((id) => id !== row.id) : [...list, row.id])} />;
          } },
          { id: "invoice", header: "Invoice", cell: (row) => <TableText bold caption={row.client}><span className="pac-nowrap">{row.id}</span></TableText> },
          { id: "amount", header: "Amount", align: "right", cell: (row) => <TableText>{money(row.amount)}</TableText> },
          { id: "actions", header: <VisuallyHidden>Actions</VisuallyHidden>, align: "right", cell: (row) => <TableActions><IconButton appearance="flat" level="primary" size="sm" aria-label={`Archive ${row.id}`} icon={<Icon name="icon-archive-line" />} onClick={() => archive(row)} /></TableActions> },
        ]} />
      </Card>
    </Stack>
  );
}

function SkipLinkSite({ skipRef }: { skipRef?: RefObject<HTMLElement | null> }) {
  const headingId = useId();
  const [page, setPage] = useState("Overview");
  const mainRef = useRef<HTMLElement>(null);
  const pagesList = ["Overview", "Prints", "Orders", "Customers", "Settings"];
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
        <Text tone="base">The skip link is the first stop for the Tab key: it jumps past the {plural(pagesList.length, "navigation link")} straight to this section.</Text>
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
  { id: "starred", icon: "icon-star-01-line", header: <VisuallyHidden>Starred</VisuallyHidden>, cell: starToggle },
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
      <div className={["pac-vh-stage", reveal ? "pac-vh-reveal" : undefined].filter(Boolean).join(" ")}>
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

function VhSkipLinkExample() {
  const skipRef = useRef<HTMLElement | null>(null);
  return (
    <Stack gap="sm">
      <SkipLinkSite skipRef={skipRef} />
      <Button level="tertiary" size="sm" className="pac-stack-start" onClick={() => skipRef.current?.focus()}>Focus the skip link</Button>
    </Stack>
  );
}

const articles = [
  { id: "paper", title: "Choosing a paper for photo prints", excerpt: "Cotton rag keeps deep blacks without glare.", more: " Baryta papers add a slight sheen for high-contrast scenes, and both last for decades behind glass." },
  { id: "framing", title: "How we frame by hand", excerpt: "Every oak frame is cut and joined in our studio.", more: " We mount the print on acid-free board and seal the back so dust never reaches it." },
  { id: "light", title: "Hanging prints in bright rooms", excerpt: "Keep framed prints out of direct sunlight.", more: " Museum glass cuts most UV light; a wall facing the window is still the safest spot." },
];

function VhReadMoreExample() {
  const [open, setOpen] = useState<string[]>([]);
  return (
    <div className="pac-articles">
      {articles.map((article) => {
        const expanded = open.includes(article.id);
        return (
          <Card key={article.id} as="article" theme="border" spacing="small">
            <Stack gap="xs">
              <Heading level={4} textStyle="Body/Base/Bold">{article.title}</Heading>
              <Text textStyle="Body/Small/Regular" tone="base">{article.excerpt}{expanded ? article.more : null}</Text>
              <Button level="tertiary" size="sm" className="pac-stack-start" aria-expanded={expanded} onClick={() => setOpen((list) => expanded ? list.filter((id) => id !== article.id) : [...list, article.id])}>
                {expanded ? "Show less" : "Read more"}<VisuallyHidden> about {article.title}</VisuallyHidden>
              </Button>
            </Stack>
          </Card>
        );
      })}
    </div>
  );
}

function VhStatusExample() {
  const [copied, flash] = useTimedFlag(2500);
  const url = "https://prints.zen.example/windmill";
  return (
    <Card theme="border" className="pac-card-fill">
      <Stack gap="md">
        <Heading level={4} textStyle="Heading/Subheading">Share this print</Heading>
        <div className="pac-share">
          <InputField aria-label="Link to this print" readOnly value={url} />
          <IconButton appearance="main" level="tertiary" size="md" aria-label="Copy link" icon={<Icon name={copied ? "icon-check-line" : "icon-copy-line"} />} onClick={() => { copyText(url); flash(); }} />
        </div>
        <VisuallyHidden role="status">{copied ? "Link copied to the clipboard" : ""}</VisuallyHidden>
        <Text textStyle="Body/Small/Regular" tone="light" aria-hidden="true">Screen readers hear: {copied ? "“Link copied to the clipboard”" : "nothing until the link is copied"}</Text>
      </Stack>
    </Card>
  );
}

function VhHeadingExample() {
  const headingId = useId();
  return (
    <section className="pac-metrics" aria-labelledby={headingId}>
      <VisuallyHidden as="h4" id={headingId}>Sales this week</VisuallyHidden>
      <MetricCard label="Orders" value="128" icon="icon-shopping-bag-01-line" trend={{ direction: "positive", label: "+12% vs. last week" }} />
      <MetricCard label="Revenue" value="$6,240.00" icon="icon-credit-card-line" iconTheme="green" trend={{ direction: "positive", label: "+8% vs. last week" }} />
      <MetricCard label="Returns" value="3" icon="icon-package-check-line" iconTheme="orange" trend={{ direction: "negative", label: "+1 vs. last week" }} />
    </section>
  );
}

/* ───────────── Pages and examples ───────────── */

export const pages: Partial<Record<AppLayerPage, AppLayerPageMeta>> = {
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
    description: "The footer bar for a screen’s main actions: Large full-width buttons with Primary on top on phones, Tertiary · Primary at the end on desktop. Sticky, fixed or static, on Surface with a Pale rule and safe-area padding.",
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
};

export const examples: ExampleMap = {
  "description-list": [
    { title: "Order summary", description: "An inline list with one emphasised total: Body/Base/Bold under a High rule. Try WELCOME10: the discount row gets its own remove action and the amounts stay in one column.", render: () => <DlOrderSummaryExample />, code: `<DescriptionList items={[
  { term: "Subtotal · 3 prints", description: "$134.00" },
  { term: "Discount (WELCOME10)", description: <Text as="span" textStyle="Body/Base/Medium" tone="positive">−$13.40</Text>,
    action: <IconButton appearance="flat" level="primary" size="sm" aria-label="Remove promo code WELCOME10" icon={<Icon name="icon-x-medium-line" />} onClick={removeCode} /> },
  { term: "Shipping", description: "$8.00" },
  { term: "Estimated tax", description: "$9.65" },
  { term: "Total", description: "$138.25", emphasis: true },
]} />` },
    { title: "Order details", description: "Dividers between rows, a status Badge as a value and Copy actions that confirm with a check and a live announcement.", render: () => <DlOrderDetailsExample />, code: `<DescriptionList divider items={[
  { term: "Order number", description: "#10428-VN", action: <IconButton appearance="flat" level="primary" size="sm" aria-label="Copy order number" icon={<Icon name={copied ? "icon-check-line" : "icon-copy-line"} />} onClick={copy} /> },
  { term: "Status", description: <Badge size="small" theme="green" background="subtle">Shipped</Badge> },
  { term: "Placed on", description: "Thursday, 2 October 2026" },
]} />
<VisuallyHidden role="status">{copied ? "Order number copied" : ""}</VisuallyHidden>` },
    { title: "Editable profile", description: "Stacked rows for long values; each Edit button names its row for screen readers (VisuallyHidden) and turns the value into a field with Cancel and Save.", render: () => <DlProfileExample />, code: `<DescriptionList layout="stacked" divider items={fields.map(({ id, term }) => ({
  term,
  description: editing === id ? <EditForm field={id} /> : profile[id],
  action: <Button level="tertiary" size="sm" onClick={() => edit(id)}>Edit<VisuallyHidden> {term}</VisuallyHidden></Button>,
}))} />` },
    { title: "Receipt in a bottom sheet", description: "On a phone the receipt opens from the order list in a Bottom Sheet: line items, a total row, then the address and payment stacked.", render: () => <DlReceiptSheetExample />, code: `<BottomSheet open={open} onOpenChange={setOpen} title="Order #10428" actionsDirection="vertical"
  primaryAction={{ label: "Email receipt", onClick: emailReceipt }} secondaryAction={{ label: "Close" }}>
  <DescriptionList items={[...lines, { term: "Shipping", description: "$8.00" }, { term: "Total", description: "$140.00", emphasis: true }]} />
  <DescriptionList layout="stacked" items={[{ term: "Delivered to", description: address }, { term: "Paid with", description: "Visa ending 4242" }]} />
</BottomSheet>` },
    { title: "Loading", description: "While the data loads, Skeleton bars in the same two columns hold the layout (aria-busy); a hidden status announces when the details arrive.", render: () => <DlLoadingExample />, code: `<div aria-busy={loading}>
  {loading ? <ShipmentSkeleton /> : <DescriptionList items={shipment} />}
</div>
<VisuallyHidden role="status">{loading ? "Loading shipment details" : "Shipment details updated"}</VisuallyHidden>` },
    { title: "Long values, one row, narrow", wide: true, description: "Unbreakable IDs and long emails wrap instead of overflowing; a total on its own gets no rule; switch on the narrow column and the inline rows stack under 280px.", render: () => <DlEdgeCasesExample />, code: `<DescriptionList items={[
  { term: "Workspace ID", description: "ws_01J9ZK4T7Q8M3N5B2V6C8X0Z1A" },
  { term: "Billing email", description: "accounts-payable.finance-team@zen-studio.example" },
]} />
<DescriptionList items={[{ term: "Available credit", description: "$0.00", emphasis: true }]} />` },
  ],
  "action-bar": [
    { title: "Print shop on a phone", description: "Open a print: the detail screen’s footer is an Action Bar with the Large Primary on top, one Tertiary below, a live summary and the home-indicator safe area.", render: () => <AbPrintShopExample />, code: `<PlatformPhone header={<TopNavigation type="compact" title={print.name} leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: back }} />}
  footer={<ActionBar
    summary={<Text textStyle="Body/Small/Regular" tone="base" role="status">{summary}</Text>}
    primaryAction={{ label: "Add to cart", startIcon: <Icon name="icon-shopping-cart-line" decorative />, onClick: addToCart }}
    secondaryAction={{ label: "Save for later", onClick: toggleSaved }} />}>
  <PrintDetails print={print} />
</PlatformPhone>` },
    { title: "Edit page with a sticky bar", wide: true, description: "Horizontal on desktop: the status sits at the start, Undo changes · Save changes at the end. Save submits the form and is disabled only while there is nothing to save, and the status says why.", render: () => <AbEditPageExample />, code: `<form onSubmit={save}>
  …fields…
  <ActionBar direction="horizontal"
    summary={<Text as="span" textStyle="Body/Small/Regular" tone="base" role="status">{plural(changed, "unsaved change")}</Text>}
    secondaryAction={{ label: "Undo changes", disabled: !changed, onClick: undo }}
    primaryAction={{ label: saving ? "Saving…" : "Save changes", type: "submit", disabled: !changed || saving }} />
</form>` },
    { title: "One set of actions, two widths", wide: true, description: "The same primaryAction and secondaryAction objects: vertical puts Primary on top, horizontal puts it last. Publish, then Unpublish.", render: () => <AbResponsiveExample />, code: `<ActionBar direction={isPhone ? "vertical" : "horizontal"}
  summary={<Text textStyle="Body/Small/Regular" tone="base" role="status">{status}</Text>}
  primaryAction={{ label: "Publish story", onClick: publish }}
  secondaryAction={{ label: "Save draft", onClick: saveDraft }} />` },
    { title: "Cart with a total", description: "The bar carries the running total; remove every print and the bar goes away with the cart, replaced by an Empty State that restores it.", render: () => <AbCartExample />, code: `{lines.length ? (
  <ActionBar direction="horizontal"
    summary={<Stack gap="2xs"><Text textStyle="Body/Small/Regular" tone="base">{plural(count, "print")}</Text><Text textStyle="Body/Base/Bold" role="status">Total {money(total)}</Text></Stack>}
    primaryAction={{ label: "Check out", onClick: checkOut }} />
) : <EmptyState illustration={false} title="Your cart is empty" primaryAction={{ label: "Add sample prints", onClick: restore }} />}` },
  ],
  image: [
    { title: "Print gallery", description: "A 4:3 Image with overlay Previous / Next buttons and a strip of Thumbnail toggle buttons (aria-pressed); the counter is a live status.", render: () => <ImageGalleryExample />, code: `<Image src={print.photo.src} alt={print.photo.alt} ratio="4:3" radius="xl" loading="eager" />
<ul className="thumbs" aria-label="Photos">
  {prints.map((print, index) => (
    <li key={print.id}><button type="button" aria-label={\`Show \${print.name}\`} aria-pressed={index === current} onClick={() => show(index)}>
      <Thumbnail src={print.photo.src} alt="" size="xl" />
    </button></li>
  ))}
</ul>` },
    { title: "Loading and error", description: "The Skeleton holds the 16:9 frame until the photo arrives; a broken link shows the neutral placeholder (the alt stays its name) with a Negative Inline Message and Try again.", render: () => <ImageStatesExample />, code: `<Image src={src} alt="Suspension bridge at dusk" ratio="16:9" caption="Bridge at dusk · 50 × 40 cm print" />
{failed ? <InlineMessage theme="negative" title="The photo couldn’t load" action={{ label: "Try again", onClick: reload }}>
  The description stays available to screen readers.
</InlineMessage> : null}` },
    { title: "Ratios and fit", description: "The same tall photo in every named ratio. Cover fills and crops; Contain shows the whole picture on Neutral/Pale bars.", render: () => <ImageRatiosExample />, code: `{["1:1", "4:3", "3:2", "16:9", "3:4"].map((ratio) => (
  <Image key={ratio} src={photo} alt="" ratio={ratio} fit={fit} caption={ratio} />
))}` },
    { title: "Uploads list", description: "Thumbnail (md, 40px) in the ListItem leading slot, alt=\"\" because the title names the file; a failed preview keeps the row. Delete them all to see the Empty State.", render: () => <ImageUploadsExample />, code: `<List aria-label="Uploads">
  <ListItem title="windmill-by-the-sea.webp" caption="1.2 MB · Uploaded 2 hours ago"
    leading={<Thumbnail src={url} alt="" />}
    trailing={<IconButton appearance="flat" level="primary" size="md" aria-label="Delete windmill-by-the-sea.webp" icon={<Icon name="icon-trash-line" />} onClick={remove} />} />
</List>` },
    { title: "Thumbnails in a table", description: "In a captioned media cell the Thumbnail is Small (32px), like an Avatar; sort by print name or price.", render: () => <ImageTableExample />, code: `{ id: "name", header: "Print", sortable: true,
  cell: (row) => <TableMedia media={<Thumbnail src={row.photo.src} alt="" size="sm" />} caption={row.size}>{row.name}</TableMedia> }` },
    { title: "Photo feed on a phone", description: "Lazy-loaded 4:3 Images flush to their Cards; one post fails and keeps its frame and description. Like toggles with aria-pressed.", render: () => <ImageFeedExample />, code: `<Card as="article" spacing="small" className="feed-card"> {/* padding: 0; overflow: hidden */}
  <Image src={post.photo.src} alt={post.photo.alt} ratio="4:3" radius="none" />
  …author, time and a Like IconButton (aria-pressed)…
</Card>` },
  ],
  "visually-hidden": [
    { title: "Skip link", description: "The first Tab stop of the page: invisible until focused, then a Surface pill that jumps past the navigation. The button focuses it for mouse users.", render: () => <VhSkipLinkExample />, code: `<VisuallyHidden as="a" href="#main" focusable>Skip to main content</VisuallyHidden>
<header>…navigation…</header>
<main id="main" tabIndex={-1}>…</main>` },
    { title: "Icon-only table headers", description: "The star and actions columns show no header text, yet screen readers announce “Starred” and “Actions” for every cell. Archive a row, then Undo.", render: () => <InvoiceTable />, code: `columns={[
  { id: "starred", icon: "icon-star-01-line", header: <VisuallyHidden>Starred</VisuallyHidden>, cell: starToggle },
  { id: "invoice", header: "Invoice", cell: invoiceCell },
  { id: "actions", header: <VisuallyHidden>Actions</VisuallyHidden>, align: "right", cell: archiveButton },
]}` },
    { title: "Unique link names", description: "Three “Read more” buttons would all sound the same; hidden text adds the article title (WCAG 2.4.4) while the visible label stays short.", render: () => <VhReadMoreExample />, code: `<Button level="tertiary" size="sm" aria-expanded={open} onClick={toggle}>
  {open ? "Show less" : "Read more"}<VisuallyHidden> about {article.title}</VisuallyHidden>
</Button>` },
    { title: "Announce a status", description: "The copy button only swaps its icon; a hidden role=\"status\" region, rendered empty from the start, says what happened.", render: () => <VhStatusExample />, code: `<IconButton aria-label="Copy link" icon={<Icon name={copied ? "icon-check-line" : "icon-copy-line"} />} onClick={copy} />
<VisuallyHidden role="status">{copied ? "Link copied to the clipboard" : ""}</VisuallyHidden>` },
    { title: "Hidden section heading", wide: true, description: "The layout makes the group obvious, but screen-reader users navigate by headings: a hidden h4 names the region (aria-labelledby).", render: () => <VhHeadingExample />, code: `<section aria-labelledby="sales-heading">
  <VisuallyHidden as="h2" id="sales-heading">Sales this week</VisuallyHidden>
  <MetricCard label="Orders" value="128" … />
</section>` },
  ],
};

import { useRef, useState } from "react";
import { Button } from "../../components/Button";
import { FileIcon, fileIconFormatOf } from "../../components/FileIcon";
import { Icon } from "../../components/Icon";
import { Card } from "../../components/Card";
import { Checkbox } from "../../components/Checkbox";
import { DescriptionList } from "../../components/DescriptionList";
import { Thumbnail } from "../../components/Image";
import { Grid, Stack } from "../../components/Layout";
import { List, ListItem } from "../../components/ListItem";
import { ZenProvider } from "../../components/Provider";
import { Heading, Text, contentToneGroups, plural, type HeadingLevel, type TextTone } from "../../components/Text";
import { useToast } from "../../components/Toast";
import { TopNavigation } from "../../components/TopNavigation";
import { typographyStyles, type TypographyStyleName } from "../../tokens/typography.generated";
import { PlatformPhone, usePhoneScreen } from "../PlatformPhone";
import { phoneMoney, phoneOrderAddress, phoneOrderPrints, phoneOrderSubtotal, phoneOrders, phonePrints, phoneShipping } from "../phoneOrders";
import { Panel, PlaygroundFilterChip, PlaygroundToggle, keepOnHotUpdate, option } from "./shared";
import type { AppLayerPage, AppLayerPageMeta, ExampleMap } from "./types";

const styleNames = Object.keys(typographyStyles) as TypographyStyleName[];
/** Every tone once, in token-family order (aliases such as secondary or accent left out). */
const playgroundTones = contentToneGroups.flatMap(({ tones }) => tones);
/** The Heading default per level (the Content hierarchy ladder, as in Text.tsx): the code omits textStyle when it matches. */
const headingDefault: Record<HeadingLevel, TypographyStyleName> = { 1: "Heading/1", 2: "Heading/4", 3: "Heading/Subheading", 4: "Body/Extra/Bold", 5: "Body/Base/Bold", 6: "Body/Base/Bold" };

function TextPlayground() {
  const [heading, setHeading] = useState(false);
  const [level, setLevel] = useState<HeadingLevel>(2);
  const [textStyle, setTextStyle] = useState<TypographyStyleName>("Body/Base/Regular");
  const [tone, setTone] = useState<TextTone>("strongest");
  const [truncate, setTruncate] = useState(false);
  const copy = heading ? "Quarterly planning" : "Plan the quarter with your team: goals, owners and dates in one place, so everyone knows what ships next and why it matters.";
  const styleProp = (heading ? textStyle === headingDefault[level] : textStyle === "Body/Base/Regular") ? "" : ` textStyle="${textStyle}"`;
  const toneProp = tone === "strongest" ? "" : ` tone="${tone}"`;
  return (
    <Panel
      title="Text"
      controls={<>
        <PlaygroundToggle label="Heading" selected={heading} onChange={(on) => { setHeading(on); setTextStyle(on ? headingDefault[level] : "Body/Base/Regular"); }} />
        {heading ? <PlaygroundFilterChip label="Level" value={String(level)} onChange={(value) => { const next = Number(value || 2) as HeadingLevel; setLevel(next); setTextStyle(headingDefault[next]); }} options={["1", "2", "3", "4", "5", "6"].map((id) => option(id, `h${id}`))} /> : null}
        <PlaygroundFilterChip label="Text style" value={textStyle} onChange={(value) => setTextStyle((String(value) || "Body/Base/Regular") as TypographyStyleName)} options={styleNames.map((id) => option(id))} />
        <PlaygroundFilterChip label="Tone" value={tone} onChange={(value) => setTone((String(value) || "strongest") as TextTone)} options={playgroundTones.map((id) => option(id))} />
        <PlaygroundToggle label="Truncate" selected={truncate} onChange={setTruncate} />
      </>}
      code={heading
        ? `import { Heading } from "@zen/design-system";\n\n<Heading level={${level}}${styleProp}${toneProp}${truncate ? " truncate" : ""}>${copy}</Heading>`
        : `import { Text } from "@zen/design-system";\n\n<Text${styleProp}${toneProp}${truncate ? " truncate" : ""}>${copy}</Text>`}
    >
      <div className="pat-stage">
        {heading
          ? <Heading level={level} textStyle={textStyle} tone={tone} truncate={truncate}>{copy}</Heading>
          : <Text textStyle={textStyle} tone={tone} truncate={truncate}>{copy}</Text>}
      </div>
    </Panel>
  );
}

/* ───────────── Examples ───────────── */

function PageOutlineExample() {
  return (
    <Stack gap="lg">
      <Stack gap="2xs">
        <Heading level={1}>Billing</Heading>
        <Text tone="base">Plan, payment method and invoices for Zen Studio.</Text>
      </Stack>
      <Stack gap="xs">
        <Heading level={2} textStyle="Heading/4">Current plan</Heading>
        <Text>Team · $12 per member per month · renews on Nov 1, 2026.</Text>
      </Stack>
      <Stack gap="xs">
        <Heading level={2} textStyle="Heading/4">Payment method</Heading>
        <Text>Visa ending 4242, expires 08/2028.</Text>
      </Stack>
    </Stack>
  );
}

const checks = [
  { id: "dns", label: "DNS records verified", tone: "positive" as const, icon: "icon-check-circle-line" as const },
  { id: "ssl", label: "SSL certificate expires in 5 days", tone: "warning" as const, icon: "icon-alert-triangle-line" as const },
  { id: "deploy", label: "Last deploy failed", tone: "negative" as const, icon: "icon-x-circle-line" as const },
];

function StatusTextExample() {
  const [renewed, setRenewed] = useState(false);
  return (
    <Stack gap="sm" as="ul" aria-label="Site checks">
      {checks.map((check) => {
        const done = check.id === "ssl" && renewed;
        const tone = done ? "positive" : check.tone;
        return (
          <Stack key={check.id} as="li" direction="row" gap="xs" align="center" justify="between">
            <Stack direction="row" gap="xs" align="center">
              <Text as="span" tone={tone}><Icon name={done ? "icon-check-circle-line" : check.icon} size="sm" decorative /></Text>
              <Text as="span" tone={tone}>{done ? "SSL certificate renewed" : check.label}</Text>
            </Stack>
            {check.id === "ssl" && !done ? <Button level="tertiary" size="sm" onClick={() => setRenewed(true)}>Renew now</Button> : null}
          </Stack>
        );
      })}
    </Stack>
  );
}

const files = ["Q4 marketing plan — final review with legal comments v3.pdf", "Brand guidelines 2026.fig", "Customer interviews, round two (transcripts).docx", "Budget.xlsx"];

function TruncateExample() {
  const [open, setOpen] = useState(files[0]);
  return (
    <Grid minColumnWidth={200} gap="sm">
      {files.map((name) => (
        <Card key={name} theme="border" active={open === name} onClick={() => setOpen(name)} aria-label={`Open ${name}`}>
          <Stack gap="xs">
            <FileIcon format={fileIconFormatOf(name)} />
            <Text textStyle="Body/Base/Medium" truncate title={name}>{name}</Text>
            <Text textStyle="Body/Small/Regular" tone="base" truncate={2}>Shared with the design team · last edited by Ava Chen 2 hours ago</Text>
          </Stack>
        </Card>
      ))}
    </Grid>
  );
}

const printFiles = [
  { id: "contract", name: "Northwind contract.pdf", pages: 1 },
  { id: "brief", name: "Q4 brief.pdf", pages: 12 },
  { id: "notes", name: "Interview notes.docx", pages: 4 },
  { id: "budget", name: "Budget summary.pdf", pages: 2 },
];

function PluralExample() {
  const { toast } = useToast();
  const [picked, setPicked] = useState<string[]>(["brief"]);
  const chosen = printFiles.filter((file) => picked.includes(file.id));
  const pages = chosen.reduce((sum, file) => sum + file.pages, 0);
  return (
    <Stack gap="sm" className="pat-stage">
      {/* Selection bar: every count goes through plural(), so 1 reads "1 file" and 2 reads "2 files". */}
      <Stack direction="row" justify="between" align="center" gap="sm" wrap>
        <Text textStyle="Body/Base/Medium" aria-live="polite">{chosen.length ? `${plural(chosen.length, "file")} selected · ${plural(pages, "page")}` : plural(printFiles.length, "file")}</Text>
        {chosen.length ? (
          <Stack direction="row" gap="xs">
            <Button level="tertiary" size="sm" onClick={() => setPicked([])}>Clear</Button>
            <Button level="primary" size="sm" onClick={() => toast({ title: `Downloading ${plural(chosen.length, "file")}` })}>Download</Button>
          </Stack>
        ) : <Button level="tertiary" size="sm" onClick={() => setPicked(printFiles.map((file) => file.id))}>Select all</Button>}
      </Stack>
      <Card theme="border" spacing="small" className="pe-list-card">
        <List aria-label="Files">
          {printFiles.map((file) => (
            <ListItem key={file.id} title={file.name} caption={`${plural(file.pages, "page")} · ${fileIconFormatOf(file.name) === "pdf" ? "PDF" : "Word document"}`}
              leading={<Checkbox aria-label={`Select ${file.name}`} checked={picked.includes(file.id)} onCheckedChange={(on) => setPicked((list) => (on ? [...list, file.id] : list.filter((id) => id !== file.id)))} />} />
          ))}
        </List>
      </Card>
    </Stack>
  );
}

function MobileTypographyExample() {
  // Opens on order #1042. Back goes up to the Orders root (scroll it and the large title folds); every order opens its own
  // screen, and focus lands on the next screen's control. One key per screen, so each screen opens at the top.
  const [openId, setOpenId] = useState<string | null>("#1042");
  const screenRef = useRef<HTMLDivElement>(null);
  const screen = usePhoneScreen();
  const order = phoneOrders.find((item) => item.id === openId);
  const subtotal = order ? phoneOrderSubtotal(order) : 0;
  return (
    <ZenProvider typography="mobile" paint={false} portal={false} breakpoint="mobile">
      <PlatformPhone key={openId ?? "root"} headerOverlay screenRef={screenRef} header={order
        // Child screen: the compact bar title is the screen's h1 (Body/Extra/Bold), so content starts at h2.
        ? <TopNavigation type="compact" title={`Order ${order.id}`} scrollRef={screenRef} leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => screen.go(`[data-order="${order.id}"] .zen-list-item__wrapper`, () => setOpenId(null)) }} />
        : <TopNavigation title="Orders" largeTitle="Orders" scrollRef={screenRef} />}>
        {screen.anchor}
        {order ? (
          <Stack gap="lg" padding="lg">
            <Stack gap="2xs">
              {/* A key status line is text, not a heading. */}
              <Text textStyle="Body/Extra/Bold">{order.status}</Text>
              <Text tone="base">{order.note}</Text>
            </Stack>
            <Stack gap="xs">
              <Heading level={2} textStyle="Heading/4">Items</Heading>
              <List aria-label={`Items in order ${order.id}`}>
                {order.items.map(({ print, qty }) => {
                  const item = phonePrints[print];
                  return (
                    <ListItem key={print} title={item.name} caption={`${item.size} · Qty ${qty}`} leading={<Thumbnail src={item.photo.src} alt="" />}
                      trailing={<Text as="span" textStyle="Body/Base/Medium">{phoneMoney(item.price * qty)}</Text>} />
                  );
                })}
              </List>
              <DescriptionList items={[
                { term: `Subtotal · ${plural(phoneOrderPrints(order), "print")}`, description: phoneMoney(subtotal) },
                { term: "Shipping", description: phoneMoney(phoneShipping) },
                { term: "Total", description: phoneMoney(subtotal + phoneShipping), emphasis: true },
              ]} />
            </Stack>
            <Stack gap="xs">
              <Heading level={2} textStyle="Heading/4">Delivery address</Heading>
              <Text>{phoneOrderAddress}</Text>
            </Stack>
          </Stack>
        ) : (
          <List aria-label="Orders">
            {/* Interactive rows pad themselves (Padding/XLarge), so the list runs edge to edge on the screen. */}
            {phoneOrders.map((item) => (
              <ListItem key={item.id} data-order={item.id} title={`Order ${item.id}`} caption={`${item.status} · ${plural(phoneOrderPrints(item), "print")}`}
                trailing={<Text as="span" textStyle="Body/Base/Medium">{phoneMoney(phoneOrderSubtotal(item) + phoneShipping)}</Text>}
                onClick={() => screen.go('.zen-top-nav__action[aria-label="Back"]', () => setOpenId(item.id))} />
            ))}
          </List>
        )}
      </PlatformPhone>
    </ZenProvider>
  );
}

export const pages: Partial<Record<AppLayerPage, AppLayerPageMeta>> = keepOnHotUpdate(import.meta.hot, "pages", {
  text: {
    label: "Text & Heading",
    eyebrow: "Components / Text",
    title: "Text & Heading",
    description: "Copy in the Figma text styles and Zen content colours. Heading renders a real h1–h6 whose level follows the page outline; Text covers paragraphs, labels and captions.",
    playground: TextPlayground,
  },
});

export const examples: ExampleMap = keepOnHotUpdate(import.meta.hot, "examples", {
  text: [
    { title: "Page outline", description: "One h1 per page (the page title, Heading/1) and h2 Heading/4 for its sections. The level comes from the outline; the look comes from the kind of content, never from a bigger size.", render: () => <PageOutlineExample />, code: `<Stack gap="lg">
  <Stack gap="2xs">
    <Heading level={1}>Billing</Heading>
    <Text tone="base">Plan, payment method and invoices for Zen Studio.</Text>
  </Stack>
  <Stack gap="xs">
    <Heading level={2} textStyle="Heading/4">Current plan</Heading>
    <Text>Team · $12 per member per month · renews on Nov 1, 2026.</Text>
  </Stack>
</Stack>` },
    { title: "Status text", description: "Colour families use their Base tone and always pair with an icon or wording, never colour alone.", render: () => <StatusTextExample />, code: `<Stack direction="row" gap="xs" align="center">
  <Text as="span" tone="warning"><Icon name="icon-alert-triangle-line" size="sm" decorative /></Text>
  <Text as="span" tone="warning">SSL certificate expires in 5 days</Text>
</Stack>` },
    { title: "Truncated names in cards", description: "truncate keeps a long name on one line; truncate={2} clamps a description to two lines. The full text stays in the DOM, and the Card's aria-label names the whole file.", render: () => <TruncateExample />, code: `<Card theme="border" active={open === name} onClick={() => setOpen(name)} aria-label={\`Open \${name}\`}>
  <Stack gap="xs">
    <FileIcon format={fileIconFormatOf(name)} />
    <Text textStyle="Body/Base/Medium" truncate title={name}>{name}</Text>
    <Text textStyle="Body/Small/Regular" tone="base" truncate={2}>{description}</Text>
  </Stack>
</Card>` },
    { title: "Counts with plural()", description: "plural(count, “file”) writes “1 file” and “2 files”, never “1 files”: the selection bar and every page count use it.", render: () => <PluralExample />, code: `<Text textStyle="Body/Base/Medium" aria-live="polite">
  {selected.length ? \`\${plural(selected.length, "file")} selected · \${plural(pages, "page")}\` : plural(files.length, "file")}
</Text>
<List aria-label="Files">
  {files.map((file) => (
    <ListItem key={file.id} title={file.name} caption={plural(file.pages, "page")}
      leading={<Checkbox aria-label={\`Select \${file.name}\`} checked={selected.includes(file.id)} onCheckedChange={(on) => toggle(file.id, on)} />} />
  ))}
</List>` },
    { title: "Mobile typography", description: "ZenProvider typography “mobile” resizes every text style for phones; the components don't change. On a child screen the compact bar title is the h1, so sections start at h2.", wide: true, render: () => <MobileTypographyExample />, code: `<ZenProvider typography="mobile">
  {/* The compact bar title is the screen's h1. */}
  <TopNavigation type="compact" title="Order #1042" scrollRef={screenRef}
    leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: back }} />
  <Stack gap="lg" padding="lg">
    <Stack gap="2xs">
      <Text textStyle="Body/Extra/Bold">Arriving Thursday</Text>
      <Text tone="base">Your order left the warehouse this morning.</Text>
    </Stack>
    <Stack gap="xs">
      <Heading level={2} textStyle="Heading/4">Delivery address</Heading>
      <Text>Ava Chen, 12 Nguyen Hue, District 1, Ho Chi Minh City</Text>
    </Stack>
  </Stack>
</ZenProvider>` },
  ],
});

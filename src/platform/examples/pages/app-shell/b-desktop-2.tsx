/* App Shell examples · b-desktop-2: built from Figma ◇ Master-Layout · Example (15902:109717), section "B · Desktop
   structures by domain" (15907:119279): B4 Workspace Editor (15916:6196), B5 Docs / Learning (15917:6719) and B6 Focus
   flow (15919:6907). Each screen follows its Pattern/AppShell/Desktop instance: the same parts, copy and data. */
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { AppShell, AppShellHeader, AppShellPane } from "../../../../components/AppShell";
import { Avatar, AvatarStack } from "../../../../components/Avatar";
import { Badge } from "../../../../components/Badge";
import { Breadcrumbs } from "../../../../components/Breadcrumbs";
import { Button, IconButton } from "../../../../components/Button";
import { Card } from "../../../../components/Card";
import { Chip } from "../../../../components/Chip";
import { ColorSwatch } from "../../../../components/ColorSwatch";
import { DescriptionList } from "../../../../components/DescriptionList";
import { Divider } from "../../../../components/Divider";
import { EmptyState } from "../../../../components/EmptyState";
import { Form, FormActions, FormFieldset, useFormState } from "../../../../components/Form";
import type { IconName } from "../../../../components/Icon";
import { Thumbnail } from "../../../../components/Image";
import { InlineMessage } from "../../../../components/InlineMessage";
import { InputField, NumberField, SelectField } from "../../../../components/Input";
import { Box, Grid, Stack } from "../../../../components/Layout";
import { Link } from "../../../../components/Link";
import { List, ListItem } from "../../../../components/ListItem";
import { RadioButton } from "../../../../components/RadioButton";
import { Search } from "../../../../components/Search";
import { Segmented } from "../../../../components/Segmented";
import { SidebarSubMenu, type SidebarSection } from "../../../../components/Sidebar";
import { SliderField } from "../../../../components/SliderField";
import { Stepper } from "../../../../components/Stepper";
import { TabPanel, Tabs } from "../../../../components/Tabs";
import { Heading, Text, plural } from "../../../../components/Text";
import { useToast } from "../../../../components/Toast";
import { DemoFieldDialog } from "../../../PlatformDemoActions";
import { PreviewAppFrame } from "../../../PlatformFrames";
import { platformMedia } from "../../../PlatformMedia";
import { people } from "../../data";
import type { ExampleDef } from "../../types";

/** The Figma screens are 1512 × 982 (a 14" laptop window): the preview keeps that height, so the page fits as in Figma. */
const screenHeight = { min: 982, max: 982 };
/** Tab and panel ids: a useId() without the colons React puts in it. */
const usePrefix = () => useId().replace(/[^a-zA-Z0-9_-]/g, "");
const options = (values: string[]) => values.map((value) => ({ value, label: value }));

/** Figma Leading-Slots brand: a square Small Avatar (Neutral, Solid) with the product's initial, then its name. */
function Brand({ initial, children }: { initial: string; children: ReactNode }) {
  return (
    <Stack direction="row" gap="xs" align="center">
      <Avatar size="sm" shape="square" theme="neutral" background="solid" alt="">{initial}</Avatar>
      {children}
    </Stack>
  );
}

// ——— B4 · Workspace editor (Layout=Workspace) ——————————————————————————————————————————————————————————————
type LayerId = "frame" | "title" | "email" | "country" | "card" | "pay";
type LayerProps = { width: number; height: number; variant: string; variants: string[]; flow: string; gap: number; pad: number; fill: string; swatch: string; textStyle: string; content: string; opacity: number };

const editorPages = [{ id: "cart", label: "Cart" }, { id: "checkout", label: "Checkout" }, { id: "confirmation", label: "Confirmation" }];
const editorLayers: { id: LayerId; label: string; icon: IconName }[] = [
  { id: "frame", label: "Checkout · Mobile", icon: "icon-layout-alt-03-line" },
  { id: "title", label: "Page title", icon: "icon-type-01-line" },
  { id: "email", label: "Email field", icon: "icon-text-input-line" },
  { id: "country", label: "Country select", icon: "icon-text-input-line" },
  { id: "card", label: "Card field", icon: "icon-credit-card-line" },
  { id: "pay", label: "Pay button", icon: "icon-cursor-box-line" },
];
const fieldLayer = (content: string, variant: string): LayerProps => ({
  width: 340, height: 64, variant, variants: ["Text field · Medium", "Select field · Medium", "Text field · Large"], flow: "Vertical", gap: 8, pad: 0,
  fill: "Input/Background", swatch: "var(--zen-input-background-default)", textStyle: "Body/Small/Regular", content, opacity: 100,
});
/** What the inspector shows for each layer; Content is the text the artboard draws. */
const initialLayers: Record<LayerId, LayerProps> = {
  frame: { width: 390, height: 700, variant: "Mobile · 390", variants: ["Mobile · 390", "Tablet · 744"], flow: "Vertical", gap: 16, pad: 24, fill: "Background/Surface", swatch: "var(--zen-color-background-surface-default)", textStyle: "Heading/2", content: "Checkout · Mobile", opacity: 100 },
  title: { width: 112, height: 32, variant: "Heading/2", variants: ["Heading/2", "Heading/3"], flow: "Horizontal", gap: 0, pad: 0, fill: "Content/Neutral/Strongest", swatch: "var(--zen-color-content-neutral-strongest)", textStyle: "Heading/2", content: "Checkout", opacity: 100 },
  email: fieldLayer("Email", "Text field · Medium"),
  country: fieldLayer("Country", "Select field · Medium"),
  card: fieldLayer("Card number", "Text field · Medium"),
  pay: { width: 326, height: 48, variant: "Primary · Large", variants: ["Primary · Large", "Primary · Medium", "Tertiary · Large"], flow: "Horizontal", gap: 8, pad: 16, fill: "Button-Primary/Background", swatch: "var(--zen-button-primary-background-default)", textStyle: "Button-Label/L", content: "Pay $124.00", opacity: 100 },
};
const zoomLevels = ["50%", "100%", "200%"];

/** One inspector group: a Body/Small label and its Inline-Field rows, Spacing/Gap/XSmall apart (Figma p 0/8, g 8). */
function InspectorGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Stack gap="xs" paddingX="xs">
      <Heading level={2} textStyle="Body/Small/Regular">{title}</Heading>
      {children}
    </Stack>
  );
}

function WorkspaceEditorApp() {
  const { toast } = useToast();
  const prefix = usePrefix();
  const [mode, setMode] = useState("design");
  const [leftTab, setLeftTab] = useState("layers");
  const [page, setPage] = useState("checkout");
  const [layerId, setLayerId] = useState<LayerId>("pay");
  const [layers, setLayers] = useState(initialLayers);
  const [interaction, setInteraction] = useState({ trigger: "Navigate to", destination: "Confirmation", animation: "Smart animate", duration: "300 ms" });
  const [zoom, setZoom] = useState("100%");
  const [published, setPublished] = useState(false);
  const [sharing, setSharing] = useState(false);
  const layer = layers[layerId];
  const layerLabel = editorLayers.find((item) => item.id === layerId)?.label ?? "";
  const edit = (patch: Partial<LayerProps>) => setLayers((all) => ({ ...all, [layerId]: { ...all[layerId], ...patch } }));
  const text = (id: LayerId) => layers[id].content;
  // The inspector's tabs follow the mode in the top bar (Design or Prototype), and the other way round.
  const inspectorTab = mode === "prototype" ? "prototype" : "design";
  const pageSections: SidebarSection[] = [{ label: "Pages", items: editorPages.map((item) => ({ ...item, icon: "icon-file-doc-line", selected: item.id === page })) }];
  const layerSections: SidebarSection[] = [{ label: "Layers", items: editorLayers.map((item) => ({ ...item, selected: item.id === layerId })) }];
  return (
    <PreviewAppFrame height={screenHeight}>
      {/* Workspace on Canvas/Flat: a compact top bar across, the layers and the inspector in two equal Border panes, and
          the work area between them the one Pale field, so the artboard reads as the object. */}
      <AppShell pattern="workspace" canvas="flat"
        header={(
          <AppShellHeader
            leading={(
              <Brand initial="Z">
                {/* zen-allow-h1-style: Figma B4 shows the file name in the compact bar as Body/Base/Bold; the artboard is the content. */}
                <Heading level={1} textStyle="Body/Base/Bold">Checkout flow</Heading>
                {published
                  ? <Badge size="sm" theme="green" background="subtle" leadingIcon={false}>Published</Badge>
                  : <Badge size="sm" theme="neutral" background="solid" leadingIcon={false}>Draft</Badge>}
              </Brand>
            )}
            center={(
              // Figma Center-Slots centres the Segmented at its own width.
              <Stack direction="row" justify="center">
                <Segmented aria-label="Mode" level="secondary" options={[{ id: "design", label: "Design" }, { id: "prototype", label: "Prototype" }, { id: "inspect", label: "Inspect" }]} value={mode} onValueChange={setMode} />
              </Stack>
            )}
            actions={<>
              <AvatarStack size="sm" background="subtle" items={[
                { theme: "accent", alt: people.ava.name, children: "A" },
                { theme: "blue", alt: people.bao.name, children: "B" },
                { theme: "brown", alt: people.chi.name, children: "C" },
              ]} />
              <IconButton level="tertiary" size="sm" icon="icon-play-line" aria-label="Present" onClick={() => toast({ title: "Presenting Checkout · Mobile", children: "The prototype opens in a new tab." })} />
              <Button level="tertiary" size="sm" onClick={() => setSharing(true)}>Share</Button>
              <Button level="primary" size="sm" onClick={() => { setPublished(true); toast({ type: "positive", title: "Checkout flow published", children: "The team sees this version now." }); }}>Publish</Button>
            </>}
          />
        )}
        leadingPane={(
          <AppShellPane theme="border" aria-label="Layers">
            <Stack gap="2xs">
              <Tabs aria-label="Left panel" variant="subtle" size="sm" idPrefix={`${prefix}-left`} items={[{ id: "layers", label: "Layers" }, { id: "assets", label: "Assets" }]} value={leftTab} onValueChange={setLeftTab} />
              <TabPanel idPrefix={`${prefix}-left`} id="layers" hidden={leftTab !== "layers"}>
                <Stack gap="2xs">
                  <SidebarSubMenu sections={pageSections} onItemClick={(item) => setPage(item.id)} />
                  <Divider />
                  <SidebarSubMenu sections={layerSections} onItemClick={(item) => setLayerId(item.id as LayerId)} />
                </Stack>
              </TabPanel>
              <TabPanel idPrefix={`${prefix}-left`} id="assets" hidden={leftTab !== "assets"}>
                <EmptyState size="sm" title="No local components" headingLevel={2}>This file uses the Zen library: its components are under Libraries.</EmptyState>
              </TabPanel>
            </Stack>
          </AppShellPane>
        )}
        trailingPane={(
          <AppShellPane theme="border" aria-label="Inspector">
            <Stack gap="md">
              <Tabs aria-label="Inspector" variant="subtle" size="sm" idPrefix={`${prefix}-right`} items={[{ id: "design", label: "Design" }, { id: "prototype", label: "Prototype" }]} value={inspectorTab} onValueChange={setMode} />
              <TabPanel idPrefix={`${prefix}-right`} id="design" hidden={inspectorTab !== "design"}>
                <Stack gap="md">
                  <InspectorGroup title={layerLabel}>
                    <NumberField layout="inline" size="sm" label="W" min={0} value={layer.width} onValueChange={(value) => edit({ width: value ?? 0 })} />
                    <NumberField layout="inline" size="sm" label="H" min={0} value={layer.height} onValueChange={(value) => edit({ height: value ?? 0 })} />
                    <SelectField layout="inline" size="sm" label="Variant" options={options(layer.variants)} value={layer.variant} onValueChange={(variant) => edit({ variant })} />
                  </InspectorGroup>
                  <Divider />
                  <InspectorGroup title="Auto layout">
                    <SelectField layout="inline" size="sm" label="Flow" options={options(["Horizontal", "Vertical", "Wrap"])} value={layer.flow} onValueChange={(flow) => edit({ flow })} />
                    <NumberField layout="inline" size="sm" label="Gap" min={0} value={layer.gap} onValueChange={(value) => edit({ gap: value ?? 0 })} />
                    <NumberField layout="inline" size="sm" label="Pad" min={0} value={layer.pad} onValueChange={(value) => edit({ pad: value ?? 0 })} />
                  </InspectorGroup>
                  <Divider />
                  <InspectorGroup title="Fill">
                    <InputField layout="inline" size="sm" label="Fill" value={layer.fill} onValueChange={(fill) => edit({ fill })} trailing={<ColorSwatch size="sm" color={layer.swatch} />} />
                  </InspectorGroup>
                  <Divider />
                  <InspectorGroup title="Typography">
                    <SelectField layout="inline" size="sm" label="Style" options={options(["Button-Label/L", "Button-Label/M", "Heading/2", "Body/Small/Regular"])} value={layer.textStyle} onValueChange={(textStyle) => edit({ textStyle })} />
                    <InputField layout="inline" size="sm" label="Content" value={layer.content} onValueChange={(content) => edit({ content })} />
                  </InspectorGroup>
                  <Divider />
                  <Box paddingX="xs">
                    <SliderField size="sm" label="Opacity" value={layer.opacity} onValueChange={(opacity) => edit({ opacity })} formatValue={(value) => `${value}%`} />
                  </Box>
                </Stack>
              </TabPanel>
              <TabPanel idPrefix={`${prefix}-right`} id="prototype" hidden={inspectorTab !== "prototype"}>
                <InspectorGroup title={layerLabel}>
                  <SelectField layout="inline" size="sm" label="On tap" options={options(["Navigate to", "Open overlay", "Back"])} value={interaction.trigger} onValueChange={(trigger) => setInteraction((current) => ({ ...current, trigger }))} />
                  <SelectField layout="inline" size="sm" label="Destination" options={options(editorPages.map((item) => item.label))} value={interaction.destination} onValueChange={(destination) => setInteraction((current) => ({ ...current, destination }))} />
                  <SelectField layout="inline" size="sm" label="Animation" options={options(["Smart animate", "Dissolve", "Instant"])} value={interaction.animation} onValueChange={(animation) => setInteraction((current) => ({ ...current, animation }))} />
                  <SelectField layout="inline" size="sm" label="Duration" options={options(["200 ms", "300 ms", "400 ms"])} value={interaction.duration} onValueChange={(duration) => setInteraction((current) => ({ ...current, duration }))} />
                </InspectorGroup>
              </TabPanel>
            </Stack>
          </AppShellPane>
        )}
      >
        {/* The work area: the one Pale field. Clicking a part of the artboard selects its layer. */}
        <Box surface="pale" radius="xl">
          <Stack minHeight={862} align="center" justify="center" gap="xs" padding="md">
            <Text textStyle="Caption/Medium" tone="light">{text("frame")}  390 × 700</Text>
            {/* zen-allow-box-border: Figma Artboard stroke is Border/Neutral/Subtle, the frame edge of a design on the Pale work area. */}
            <Box surface="surface" border="subtle" radius="xl" padding="xl" width={390} height={700} aria-label={`${text("frame")} artboard`} role="group">
              <Stack gap="md" height="fill">
                <Stack gap="2xs">
                  {/* zen-allow-visual-heading: the artboard is a picture of a design being edited, not a part of this page's outline. */}
                  <Text textStyle="Heading/2">{text("title")}</Text>
                  <Text textStyle="Body/Small/Regular" tone="light">Step 2 of 3 · Payment</Text>
                </Stack>
                <InputField label={text("email")} type="email" defaultValue="maya@northwind.io" onFocus={() => setLayerId("email")} />
                <SelectField label={text("country")} options={options(["Vietnam", "Singapore", "Thailand"])} defaultValue="Vietnam" onFocus={() => setLayerId("country")} />
                <InputField label={text("card")} inputMode="numeric" defaultValue="4242 4242 4242 4242" onFocus={() => setLayerId("card")} />
                <Divider />
                <Stack direction="row" justify="between" align="center">
                  <Text tone="base">Total</Text>
                  <Text textStyle="Heading/4">$124.00</Text>
                </Stack>
                <Box height="fill" />
                <Stack direction="row" fillChildren>
                  <Button level="primary" size="lg" startIcon="icon-lock-01-line" onClick={() => setLayerId("pay")}>{text("pay")}</Button>
                </Stack>
              </Stack>
            </Box>
          </Stack>
          <Box position="absolute" constraintX="right" constraintY="bottom" insetRight="md" insetBottom="md">
            <Chip variant="advanced" size="sm" level="secondary" popoverLabel="Zoom" popoverItems={zoomLevels.map((level) => ({ id: level, label: level, selected: level === zoom }))} onPopoverSelect={(item) => setZoom(item.id)}>{zoom}</Chip>
          </Box>
        </Box>
      </AppShell>
      <DemoFieldDialog open={sharing} onOpenChange={setSharing} title="Share Checkout flow" description="People you invite can view the file and comment."
        field={{ kind: "email", label: "Email", placeholder: "name@northwind.io" }} submitLabel="Send invite" confirm={(email) => `Invite sent to ${email}`} />
    </PreviewAppFrame>
  );
}

// ——— B5 · Docs / learning (Layout=Docs) ——————————————————————————————————————————————————————————————
const docsNav: { label: string; items: { id: string; label: string }[] }[] = [
  { label: "Getting started", items: [{ id: "introduction", label: "Introduction" }, { id: "installation", label: "Installation" }, { id: "theming", label: "Theming" }, { id: "ai-kit", label: "AI kit" }] },
  { label: "Foundations", items: [{ id: "colour", label: "Colour" }, { id: "typography", label: "Typography" }, { id: "spacing", label: "Spacing & layout" }] },
  { label: "Components", items: [{ id: "buttons", label: "Buttons" }, { id: "card", label: "Card" }, { id: "table", label: "Table" }] },
];
const onThisPage = [
  { id: "add", label: "Add the package" },
  { id: "wrap", label: "Wrap your app" },
  { id: "import", label: "Import a component" },
  { id: "check", label: "Check your setup" },
  { id: "next", label: "Next steps" },
];

/** Figma Code: Body/Code on Neutral/Pale, Corner-Radius/Large, padding 16 · 20. */
function CodeBlock({ lines }: { lines: string[] }) {
  return (
    <Box surface="pale" radius="lg" paddingX="lg" paddingY="md">
      <Stack gap="sm">{lines.map((line) => <Text key={line} as="code" textStyle="Body/Code/Regular">{line}</Text>)}</Stack>
    </Box>
  );
}

/** A step of the article: Heading/3, then its Body/Base copy (Spacing/Gap/Small apart). The TOC links focus it. */
function DocSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <Stack as="section" id={id} gap="sm" tabIndex={-1} aria-labelledby={`${id}-title`}>
      <Heading level={2} textStyle="Heading/3" id={`${id}-title`}>{title}</Heading>
      {children}
    </Stack>
  );
}

function DocsApp() {
  const { toast } = useToast();
  const base = usePrefix();
  const [query, setQuery] = useState("");
  const [current, setCurrent] = useState("add");
  const [noteOpen, setNoteOpen] = useState(true);
  const [feedback, setFeedback] = useState<"yes" | "no" | null>(null);
  const reopenRef = useRef<HTMLButtonElement>(null);
  const closedOnce = useRef(false);
  useEffect(() => { if (!noteOpen && closedOnce.current) reopenRef.current?.focus(); }, [noteOpen]);
  const words = query.trim().toLowerCase();
  // The header Search filters the docs navigation as you type.
  const sections: SidebarSection[] = docsNav
    .map((section) => ({ label: section.label, items: section.items.filter((item) => !words || item.label.toLowerCase().includes(words)).map((item) => ({ ...item, selected: item.id === "installation" })) }))
    .filter((section) => section.items.length > 0);
  const open = (label: string) => toast({ title: `${label} opens in the full docs`, children: "This demo shows the Installation page." });
  const goToStep = (id: string) => { setCurrent(id); document.getElementById(`${base}-${id}`)?.focus(); };
  return (
    <PreviewAppFrame height={screenHeight}>
      {/* Docs on Canvas/Flat, typography-led: a 720 reading column between two equal Canvas panes (no box); the only
          tinted surfaces are the Pale code blocks and the Info callout. */}
      <AppShell pattern="docs" canvas="flat"
        header={(
          <AppShellHeader
            leading={(
              <Brand initial="Z">
                <Text as="span" textStyle="Heading/4">Zen Docs</Text>
                <Badge size="sm" theme="neutral" background="solid" leadingIcon={false}>v0.4</Badge>
              </Brand>
            )}
            center={<Search placeholder="Search docs" aria-label="Search docs" shortcut="k" value={query} onValueChange={setQuery} />}
            actions={<>
              <Button appearance="flat" level="primary" onClick={() => open("The changelog")}>Changelog</Button>
              <Button appearance="flat" level="primary" onClick={() => open("Community")}>Community</Button>
              <Button level="primary" onClick={() => goToStep("add")}>Get started</Button>
            </>}
          />
        )}
        leadingPane={(
          <AppShellPane theme="canvas" aria-label="Documentation">
            {sections.length ? (
              <SidebarSubMenu sections={sections} onItemClick={(item) => { if (item.id !== "installation") open(item.label); }} />
            ) : (
              <EmptyState size="sm" title="No pages match" headingLevel={2} secondaryAction={{ label: "Clear search", onClick: () => setQuery("") }}>Try another word, like “tokens” or “Card”.</EmptyState>
            )}
          </AppShellPane>
        )}
        trailingPane={(
          <AppShellPane theme="canvas" aria-label="On this page">
            <Stack gap="sm">
              <Box padding="xs"><Text textStyle="All-Caps/S" tone="light">On this page</Text></Box>
              <Stack as="nav" gap="sm" aria-label="On this page">
                {onThisPage.map((item) => (
                  // zen-allow-link-underline: Figma "On this page" is a list of plain Body/Small rows; the nav landmark says they are links.
                  <Text key={item.id} textStyle={item.id === current ? "Body/Small/Medium" : "Body/Small/Regular"} tone={item.id === current ? "strongest" : "light"}>
                    <Link href={`#${base}-${item.id}`} tone="inherit" underline="hover" aria-current={item.id === current ? "location" : undefined} onClick={() => setCurrent(item.id)}>{item.label}</Link>
                  </Text>
                ))}
              </Stack>
              <Divider />
              <Text textStyle="Body/Small/Medium">Was this page helpful?</Text>
              {feedback ? (
                <Text role="status" textStyle="Body/Small/Regular" tone="light">{feedback === "yes" ? "Thanks: glad it helped." : "Thanks: we’ll make this page clearer."}</Text>
              ) : (
                <Stack direction="row" gap="xs">
                  {/* zen-allow-vague-label: Figma Yes / No answer "Was this page helpful?" right above them. */}
                  <Button level="tertiary" size="sm" onClick={() => setFeedback("yes")}>Yes</Button>
                  {/* zen-allow-vague-label: the answer to the question above. */}
                  <Button level="tertiary" size="sm" onClick={() => setFeedback("no")}>No</Button>
                </Stack>
              )}
            </Stack>
          </AppShellPane>
        )}
      >
        <Stack gap="xl">
          <Breadcrumbs items={[{ id: "docs", label: "Docs" }, { id: "getting-started", label: "Getting started" }, { id: "installation", label: "Installation" }]}
            onNavigate={(item) => open(item.id === "docs" ? "The docs home" : "Getting started")} />
          <Stack as="article" gap="lg">
            <Stack gap="sm">
              {/* zen-allow-h1-style: Figma B5 sets the article title in Display/3 ("type does the layout"). */}
              <Heading level={1} textStyle="Display/3">Install Zen in a React app</Heading>
              <Text textStyle="Body/Extra/Regular" tone="base">Zen ships as one package with its tokens, fonts and icons. Five minutes from now your app renders Zen components in light and dark, in English and Vietnamese.</Text>
              <Stack direction="row" gap="xs" align="center">
                <Avatar size="xs" theme="violet" background="subtle" alt="">M</Avatar>
                <Text textStyle="Caption/Regular" tone="light">Maya Chen · Updated Oct 16, 2026 · 4 min read</Text>
              </Stack>
            </Stack>
            <Divider />
            <DocSection id={`${base}-add`} title="1. Add the package">
              <Text tone="base">Install the library and its peer dependency. The package includes the CSS tokens, so there is nothing else to copy.</Text>
              <CodeBlock lines={["npm install @zen-ds/react react@19"]} />
            </DocSection>
            {noteOpen ? (
              <InlineMessage theme="info" title="Zen needs React 19" onClose={() => { closedOnce.current = true; setNoteOpen(false); }}>Components take ref as a prop, so React 18 apps upgrade first.</InlineMessage>
            ) : (
              <Box><Button ref={reopenRef} level="tertiary" size="sm" startIcon="icon-info-circle-line" onClick={() => setNoteOpen(true)}>Show the React 19 note</Button></Box>
            )}
            <DocSection id={`${base}-wrap`} title="2. Wrap your app in ZenProvider">
              <Text tone="base">ZenProvider sets the token modes (light or dark, density, locale) and the portal for overlays. Put it once, at the root.</Text>
            </DocSection>
            <DocSection id={`${base}-import`} title="3. Import a component">
              <Text tone="base">Every component reads the provider. Import from the package root; icons take a name or a node.</Text>
              <CodeBlock lines={[`import { Button } from "@zen-ds/react";`, `<Button icon="plus">New task</Button>`]} />
            </DocSection>
            <DocSection id={`${base}-check`} title="4. Check your setup">
              <Text tone="base">The doctor checks the provider, the fonts and the React version, and names what is missing.</Text>
              <CodeBlock lines={["npx zen-ds doctor"]} />
            </DocSection>
            <DocSection id={`${base}-next`} title="Next steps">
              <Text tone="base">Pick a theme in Theming, then build your first screen from a template.</Text>
            </DocSection>
          </Stack>
        </Stack>
      </AppShell>
    </PreviewAppFrame>
  );
}

// ——— B6 · Focus flow (Layout=Focus) ——————————————————————————————————————————————————————————————
const checkoutSteps = [
  { id: "cart", title: "Cart", caption: "2 items" },
  { id: "shipping", title: "Shipping", caption: "Address & delivery" },
  { id: "payment", title: "Payment", caption: "Card or bank" },
  { id: "review", title: "Review", caption: "Place order" },
];
/* Figma B6's Thumb: the product photo in a 56 Pale frame (Image-Size/XLarge, Corner-Radius/Base). */
const orderItems = [
  { id: "urbas", name: "Urbas Love+ Slip On", variant: "Offwhite · EU 39", price: 42, photo: platformMedia.products.offwhite },
  { id: "vintas", name: "Vintas Soda Pop High", variant: "Red Violet · EU 39", price: 58, photo: platformMedia.products.redViolet },
];
const usd = (amount: number) => amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
const countries = options(["Vietnam", "Singapore", "Thailand", "Malaysia"]);
type Shipping = { firstName: string; lastName: string; street: string; city: string; country: string; phone: string; postcode: string; delivery: "standard" | "express" };
const required: Record<Exclude<keyof Shipping, "delivery">, string> = {
  firstName: "Enter a first name", lastName: "Enter a last name", street: "Enter a street address", city: "Enter a city", country: "Choose a country", phone: "Enter a phone number", postcode: "Enter a postcode",
};

function FocusFlowApp() {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [promo, setPromo] = useState("");
  const [promoNote, setPromoNote] = useState<{ error?: string; help?: string }>({});
  const form = useFormState<Shipping>({
    initialValues: { firstName: "Maya", lastName: "Chen", street: "12 Ly Thuong Kiet, Hoan Kiem", city: "Hanoi", country: "Vietnam", phone: "+84 912 345 678", postcode: "100000", delivery: "standard" },
    validate: (values) => Object.fromEntries((Object.keys(required) as (keyof typeof required)[]).map((name) => [name, values[name].trim() ? undefined : required[name]])),
    onSubmit: () => setStep(2),
  });
  const { values } = form;
  const subtotal = orderItems.reduce((sum, item) => sum + item.price, 0);
  const shipping = values.delivery === "express" ? 9 : 0;
  const vat = subtotal * 0.1;
  const backToCart = () => toast({ title: "Back to your cart", children: "Your shipping details stay filled in." });
  const applyPromo = () => setPromoNote(promo.trim() ? { help: `${promo.trim().toUpperCase()} is checked when you place the order.` } : { error: "Enter a promo code" });
  return (
    <PreviewAppFrame height={screenHeight}>
      {/* Focus on Canvas/Default: no app navigation, the Stepper under the top bar, "Save & exit" the only way out. The
          form floats as a Shadow card in the 680 column and the summary as a Shadow pane beside it; the primary action
          ends the form, never the bar. */}
      <AppShell pattern="focus"
        header={(
          <AppShellHeader
            leading={<Brand initial="N"><Text as="span" textStyle="Heading/4">Northwind</Text></Brand>}
            actions={<>
              <IconButton level="tertiary" icon="icon-help-circle-line" aria-label="Help" onClick={() => toast({ title: "Need a hand?", children: "Support chat opens in a new tab." })} />
              <Button level="tertiary" onClick={() => toast({ title: "Checkout saved", children: "Your cart and address wait for you in your account." })}>Save & exit</Button>
            </>}
          />
        )}
        progress={<Stepper aria-label="Checkout" steps={checkoutSteps} current={step} onStepClick={(_, index) => { if (index === 0) backToCart(); else setStep(index); }} />}
        trailingPane={(
          <AppShellPane theme="shadow" aria-label="Order summary">
            <Box padding="md">
              <Stack gap="md">
                <Stack direction="row" justify="between" align="center" gap="xs">
                  <Heading level={2} textStyle="Heading/4">Order summary</Heading>
                  <Badge size="sm" theme="neutral" background="solid" leadingIcon={false}>{plural(orderItems.length, "item")}</Badge>
                </Stack>
                <List aria-label="Items in your order">
                  {orderItems.map((item) => (
                    <ListItem key={item.id} title={item.name} caption={item.variant} value={usd(item.price)}
                      leading={<Thumbnail src={item.photo.src} alt="" size="xl" />} />
                  ))}
                </List>
                <Divider />
                <DescriptionList items={[
                  { term: "Subtotal", description: usd(subtotal) },
                  { term: "Shipping", description: shipping ? usd(shipping) : "Free" },
                  { term: "VAT (10%)", description: usd(vat) },
                ]} />
                <Divider />
                <Stack direction="row" justify="between" align="center">
                  <Text textStyle="Body/Base/Bold">Total</Text>
                  <Text textStyle="Heading/3">{usd(subtotal + shipping + vat)}</Text>
                </Stack>
                <Stack direction="row" gap="xs" align="start">
                  <Box width="fill">
                    <InputField aria-label="Promo code" placeholder="Promo code" value={promo} onValueChange={(value) => { setPromo(value); setPromoNote({}); }} error={promoNote.error} helpText={promoNote.help} />
                  </Box>
                  <Button level="tertiary" onClick={applyPromo}>Apply</Button>
                </Stack>
              </Stack>
            </Box>
          </AppShellPane>
        )}
      >
        <Card theme="shadow">
          {step === 1 ? (
            <Form form={form} gap="lg">
              <Stack gap="2xs">
                {/* zen-allow-h1-style: Figma B6 titles the step card in Heading/2 (the card sits in a 680 column). */}
                <Heading level={1} textStyle="Heading/2">Shipping details</Heading>
                <Text tone="light">We deliver in 2–4 business days. You can change the address until the parcel ships.</Text>
              </Stack>
              <Grid columns={2} gap="md">
                <InputField label="First name" autoComplete="given-name" {...form.field("firstName")} />
                <InputField label="Last name" autoComplete="family-name" {...form.field("lastName")} />
              </Grid>
              <InputField label="Street address" autoComplete="street-address" {...form.field("street")} />
              <Grid columns={2} gap="md">
                <InputField label="City" autoComplete="address-level2" {...form.field("city")} />
                <SelectField label="Country" options={countries} {...form.selectField("country")} />
              </Grid>
              <Grid columns={2} gap="md">
                <InputField label="Phone" type="tel" autoComplete="tel" {...form.field("phone")} />
                <InputField label="Postcode" inputMode="numeric" autoComplete="postal-code" {...form.field("postcode")} />
              </Grid>
              <Stack gap="sm">
                <Text textStyle="Body/Base/Bold" aria-hidden="true">Delivery</Text>
                <FormFieldset legend="Delivery" hideLegend kind="radio">
                  <RadioButton label="Standard · 2–4 days · Free" {...form.radioField("delivery", "standard")} />
                  <RadioButton label="Express · next day · $9.00" {...form.radioField("delivery", "express")} />
                </FormFieldset>
              </Stack>
              <Divider />
              <FormActions align="between">
                {/* zen-allow-back-arrow: Figma B6 Back to cart is Button/Main Large Tertiary with icon-arrow-left-line, a step back in a desktop flow. */}
                <Button level="tertiary" size="lg" startIcon="icon-arrow-left-line" onClick={backToCart}>Back to cart</Button>
                <Button type="submit" level="primary" size="lg">Continue to payment</Button>
              </FormActions>
            </Form>
          ) : (
            <Stack gap="lg">
              <Stack gap="2xs">
                {/* zen-allow-h1-style: the next step's card keeps the Shipping card's Heading/2. */}
                <Heading level={1} textStyle="Heading/2">Payment</Heading>
                <Text tone="light">Card or bank</Text>
              </Stack>
              <DescriptionList items={[
                { term: "Ship to", description: `${values.firstName} ${values.lastName}, ${values.street}, ${values.city}, ${values.country} ${values.postcode}` },
                { term: "Delivery", description: values.delivery === "express" ? "Express · next day" : "Standard · 2–4 days" },
                { term: "Phone", description: values.phone },
              ]} />
              <Divider />
              <Stack direction="row">
                {/* zen-allow-back-arrow: the same step-back button as Back to cart (Figma B6). */}
                <Button level="tertiary" size="lg" startIcon="icon-arrow-left-line" onClick={() => setStep(1)}>Back to shipping</Button>
              </Stack>
            </Stack>
          )}
        </Card>
      </AppShell>
    </PreviewAppFrame>
  );
}

export const examples: ExampleDef[] = [
  {
    title: "B4 · Workspace editor",
    description: "A tool where the content is the canvas. A compact top bar, then the layers and the inspector in two equal Border panes at the sides (no shadow) on the flat white canvas; the work area between them is the one Pale field, so the artboard reads as the object. Body/Small labels, Inline-Field rows in the inspector. Shell: AppShell/Desktop · Layout=Workspace. Fits: Design / site builders, Document & slide editors, IDE / data tools, Form & workflow builders.",
    wide: true,
    screen: true,
    render: () => <WorkspaceEditorApp />,
    code: `<AppShell
  pattern="workspace"
  canvas="flat"
  header={
    <AppShellHeader
      // zen-allow-h1-style: the file name in the compact bar (Figma B4)
      leading={<><Avatar size="sm" shape="square" theme="neutral" alt="">Z</Avatar><Heading level={1} textStyle="Body/Base/Bold">Checkout flow</Heading><Badge size="sm" leadingIcon={false}>Draft</Badge></>}
      center={<Segmented aria-label="Mode" options={modes} value={mode} onValueChange={setMode} />}
      actions={<>
        <AvatarStack size="sm" background="subtle" items={editors} />
        <IconButton level="tertiary" size="sm" icon="icon-play-line" aria-label="Present" onClick={present} />
        <Button level="tertiary" size="sm" onClick={share}>Share</Button>
        <Button level="primary" size="sm" onClick={publish}>Publish</Button>
      </>}
    />
  }
  leadingPane={
    <AppShellPane theme="border" aria-label="Layers">
      <Tabs aria-label="Left panel" variant="subtle" size="sm" items={[{ id: "layers", label: "Layers" }, { id: "assets", label: "Assets" }]} value={tab} onValueChange={setTab} />
      <SidebarSubMenu sections={[{ label: "Pages", items: pages }]} onItemClick={(item) => setPage(item.id)} />
      <Divider />
      <SidebarSubMenu sections={[{ label: "Layers", items: layers }]} onItemClick={(item) => setLayer(item.id)} />
    </AppShellPane>
  }
  trailingPane={
    <AppShellPane theme="border" aria-label="Inspector">
      <Tabs aria-label="Inspector" variant="subtle" size="sm" items={[{ id: "design", label: "Design" }, { id: "prototype", label: "Prototype" }]} value={tab} onValueChange={setTab} />
      <Heading level={2} textStyle="Body/Small/Regular">Pay button</Heading>
      <NumberField layout="inline" size="sm" label="W" value={326} onValueChange={setWidth} />
      <NumberField layout="inline" size="sm" label="H" value={48} onValueChange={setHeight} />
      <SelectField layout="inline" size="sm" label="Variant" options={variants} value="Primary · Large" onValueChange={setVariant} />
      <Divider />
      …Auto layout, Fill (ColorSwatch), Typography (Style, Content)…
      <SliderField size="sm" label="Opacity" value={100} onValueChange={setOpacity} formatValue={(v) => \`\${v}%\`} />
    </AppShellPane>
  }
>
  <Box surface="pale" radius="xl">
    <Stack align="center" justify="center" gap="xs">
      <Text textStyle="Caption/Medium" tone="light">Checkout · Mobile  390 × 700</Text>
      {/* zen-allow-box-border: the artboard's frame edge (Figma Border/Neutral/Subtle) */}
      <Box surface="surface" border="subtle" radius="xl" padding="xl" width={390} height={700}>
        …the artboard: Checkout, Email, Country, Card number, Total, Pay $124.00…
      </Box>
    </Stack>
    <Box position="absolute" constraintX="right" constraintY="bottom" insetRight="md" insetBottom="md">
      <Chip variant="advanced" size="sm" popoverItems={zoomLevels} onPopoverSelect={(item) => setZoom(item.id)}>100%</Chip>
    </Box>
  </Box>
</AppShell>`,
  },
  {
    title: "B5 · Docs / learning",
    description: "Reading is the job, so type does the layout: a 720px column under a breadcrumb row, Display/3 title, Body/Extra lead, Heading/3 sections and a Body/Code block. The docs navigation and the “On this page” list sit in two equal Canvas panes (no box), and the only tinted surfaces are Pale callouts and code. Shell: AppShell/Desktop · Layout=Docs. Fits: Docs / Help centre, Knowledge base, Courses / LMS, Blog / News.",
    wide: true,
    screen: true,
    render: () => <DocsApp />,
    code: `<AppShell
  pattern="docs"
  canvas="flat"
  header={
    <AppShellHeader
      leading={<><Avatar size="sm" shape="square" theme="neutral" alt="">Z</Avatar><Text as="span" textStyle="Heading/4">Zen Docs</Text><Badge size="sm" leadingIcon={false}>v0.4</Badge></>}
      center={<Search placeholder="Search docs" aria-label="Search docs" shortcut="k" value={query} onValueChange={setQuery} />}
      actions={<>
        <Button appearance="flat" level="primary" onClick={openChangelog}>Changelog</Button>
        <Button appearance="flat" level="primary" onClick={openCommunity}>Community</Button>
        <Button level="primary" onClick={getStarted}>Get started</Button>
      </>}
    />
  }
  leadingPane={<AppShellPane theme="canvas" aria-label="Documentation"><SidebarSubMenu sections={docsNav} onItemClick={openPage} /></AppShellPane>}
  trailingPane={
    <AppShellPane theme="canvas" aria-label="On this page">
      <Text textStyle="All-Caps/S" tone="light">On this page</Text>
      <Stack as="nav" gap="sm" aria-label="On this page">{anchors /* Link tone="inherit", Body/Small */}</Stack>
      <Divider />
      <Text textStyle="Body/Small/Medium">Was this page helpful?</Text>
      {/* zen-allow-vague-label: Yes / No answer the question above (Figma B5) */}
      <Button level="tertiary" size="sm" onClick={() => setFeedback("yes")}>Yes</Button>
      {/* zen-allow-vague-label: the answer to the question above */}
      <Button level="tertiary" size="sm" onClick={() => setFeedback("no")}>No</Button>
    </AppShellPane>
  }
>
  <Breadcrumbs items={[{ id: "docs", label: "Docs" }, { id: "getting-started", label: "Getting started" }, { id: "installation", label: "Installation" }]} onNavigate={navigate} />
  <Stack as="article" gap="lg">
    {/* zen-allow-h1-style: Figma B5 sets the article title in Display/3 */}
    <Heading level={1} textStyle="Display/3">Install Zen in a React app</Heading>
    <Text textStyle="Body/Extra/Regular" tone="base">Zen ships as one package with its tokens, fonts and icons. …</Text>
    <Divider />
    <Heading level={2} textStyle="Heading/3">1. Add the package</Heading>
    <Box surface="pale" radius="lg" paddingX="lg" paddingY="md"><Text as="code" textStyle="Body/Code/Regular">npm install @zen-ds/react react@19</Text></Box>
    <InlineMessage theme="info" title="Zen needs React 19" onClose={closeNote}>Components take ref as a prop, so React 18 apps upgrade first.</InlineMessage>
    …
  </Stack>
</AppShell>`,
  },
  {
    title: "B6 · Focus flow",
    description: "One task, no way to wander: the app navigation disappears, a Stepper under the top bar shows where you are and “Save & exit” is the only way out. The form floats as a Shadow card in the column and the summary as a Shadow pane beside it on the grey canvas; the primary action sits at the end of the form, never in the bar. Shell: AppShell/Desktop · Layout=Focus. Fits: Checkout, Onboarding / KYC, Applications (loan, insurance), Booking.",
    wide: true,
    screen: true,
    render: () => <FocusFlowApp />,
    code: `<AppShell
  pattern="focus"
  header={
    <AppShellHeader
      leading={<><Avatar size="sm" shape="square" theme="neutral" alt="">N</Avatar><Text as="span" textStyle="Heading/4">Northwind</Text></>}
      actions={<>
        <IconButton level="tertiary" icon="icon-help-circle-line" aria-label="Help" onClick={openHelp} />
        <Button level="tertiary" onClick={saveAndExit}>Save & exit</Button>
      </>}
    />
  }
  progress={<Stepper aria-label="Checkout" steps={[{ id: "cart", title: "Cart", caption: "2 items" }, { id: "shipping", title: "Shipping", caption: "Address & delivery" }, …]} current={1} onStepClick={goTo} />}
  trailingPane={
    <AppShellPane theme="shadow" aria-label="Order summary">
      <Heading level={2} textStyle="Heading/4">Order summary</Heading>
      <Badge size="sm" leadingIcon={false}>2 items</Badge>
      <List aria-label="Items in your order">
        <ListItem title="Urbas Love+ Slip On" caption="Offwhite · EU 39" value="$42.00" leading={<Thumbnail src={urbas.photo} alt="" size="xl" />} />
        <ListItem title="Vintas Soda Pop High" caption="Red Violet · EU 39" value="$58.00" leading={<Thumbnail src={vintas.photo} alt="" size="xl" />} />
      </List>
      <DescriptionList items={[{ term: "Subtotal", description: "$100.00" }, { term: "Shipping", description: "Free" }, { term: "VAT (10%)", description: "$10.00" }]} />
      <Text textStyle="Body/Base/Bold">Total</Text> <Text textStyle="Heading/3">$110.00</Text>
      <InputField aria-label="Promo code" placeholder="Promo code" value={promo} onValueChange={setPromo} />
      <Button level="tertiary" onClick={applyPromo}>Apply</Button>
    </AppShellPane>
  }
>
  <Card theme="shadow">
    <Form form={form} gap="lg">
      {/* zen-allow-h1-style: Figma B6 titles the step card in Heading/2 */}
      <Heading level={1} textStyle="Heading/2">Shipping details</Heading>
      <Grid columns={2} gap="md">
        <InputField label="First name" {...form.field("firstName")} />
        <InputField label="Last name" {...form.field("lastName")} />
      </Grid>
      …Street address, City + Country, Phone + Postcode…
      <FormFieldset legend="Delivery" kind="radio">
        <RadioButton label="Standard · 2–4 days · Free" {...form.radioField("delivery", "standard")} />
        <RadioButton label="Express · next day · $9.00" {...form.radioField("delivery", "express")} />
      </FormFieldset>
      <FormActions align="between">
        {/* zen-allow-back-arrow: a step back in a desktop flow (Figma B6) */}
        <Button level="tertiary" size="lg" startIcon="icon-arrow-left-line" onClick={backToCart}>Back to cart</Button>
        <Button type="submit" level="primary" size="lg">Continue to payment</Button>
      </FormActions>
    </Form>
  </Card>
</AppShell>`,
  },
];

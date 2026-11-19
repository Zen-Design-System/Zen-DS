import { useId, useState, type ReactNode } from "react";
import {
  AppShell, AppShellHeader, AppShellPane, Avatar, AvatarStack, Badge, Box, Button, Chip, ColorSwatch, Divider, EmptyState, IconButton, InputField,
  ModalForm, NumberField, Segmented, SelectField, SidebarSubMenu, SliderField, Stack, TabPanel, Tabs, Text, VisuallyHidden, useFormState, useToast,
  useZen,
  type IconName, type SidebarSection,
} from "@zen-ds/react";
import { people } from "../../data";

const options = (values: string[]) => values.map((value) => ({ value, label: value }));
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Figma Leading-Slots brand: a square Small Avatar (Neutral, Solid) with the product's initial, then its name. */
function Brand({ initial, children }: { initial: string; children: ReactNode }) {
  return (
    <Stack direction="row" gap="xs" align="center">
      <Avatar size="sm" shape="square" theme="neutral" background="solid" alt="">{initial}</Avatar>
      {children}
    </Stack>
  );
}

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

/** One inspector group: a Body/Small label and its Inline-Field rows, Spacing/Gap/XSmall apart (Figma p 0/8, g 8). The
 *  label is a kicker over its rows, not a heading (a 12px h2 would read below its 14px fields): it names the group. */
function InspectorGroup({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <Stack gap="xs" paddingX="xs" role="group" aria-labelledby={id}>
      <Text id={id} textStyle="Body/Small/Regular">{title}</Text>
      {children}
    </Stack>
  );
}

/** A design tool where the content is the canvas (Figma ◇ Master-Layout B4, Layout=Workspace on Canvas/Flat). */
export default function WorkspaceEditorApp() {
  const { toast } = useToast();
  const phone = useZen()?.breakpoint === "mobile";
  // Tab and panel ids: a useId() without the colons React puts in it.
  const prefix = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [mode, setMode] = useState("design");
  const [leftTab, setLeftTab] = useState("layers");
  const [page, setPage] = useState("checkout");
  const [layerId, setLayerId] = useState<LayerId>("pay");
  const [layers, setLayers] = useState(initialLayers);
  const [interaction, setInteraction] = useState({ trigger: "Navigate to", destination: "Confirmation", animation: "Smart animate", duration: "300 ms" });
  const [zoom, setZoom] = useState("100%");
  const [published, setPublished] = useState(false);
  const [sharing, setSharing] = useState(false);
  // Share: one email field; a valid address closes the dialog and a toast confirms the invite.
  const invite = useFormState<{ email: string }>({
    initialValues: { email: "" },
    validate: ({ email }) => {
      const text = email.trim();
      if (!text) return { email: "Enter an email address" };
      return { email: emailPattern.test(text) ? undefined : "Enter a valid email address, like name@company.com" };
    },
    onSubmit: ({ email }, { reset }) => {
      setSharing(false);
      reset();
      toast({ type: "positive", title: `Invite sent to ${email.trim()}` });
    },
  });
  // Cancel, Escape and the scrim close the dialog and clear what was typed.
  const changeSharing = (next: boolean) => { setSharing(next); if (!next) invite.reset(); };
  const layer = layers[layerId];
  const layerLabel = editorLayers.find((item) => item.id === layerId)?.label ?? "";
  const edit = (patch: Partial<LayerProps>) => setLayers((all) => ({ ...all, [layerId]: { ...all[layerId], ...patch } }));
  const text = (id: LayerId) => layers[id].content;
  // The inspector's tabs follow the mode in the top bar (Design or Prototype), and the other way round.
  const inspectorTab = mode === "prototype" ? "prototype" : "design";
  const pageSections: SidebarSection[] = [{ label: "Pages", items: editorPages.map((item) => ({ ...item, icon: "icon-file-doc-line", selected: item.id === page })) }];
  const layerSections: SidebarSection[] = [{ label: "Layers", items: editorLayers.map((item) => ({ ...item, selected: item.id === layerId })) }];
  return (
    <>
      {/* Workspace on Canvas/Flat: a compact top bar across, the layers and the inspector in two equal Border panes, and
          the work area between them the one Pale field, so the artboard reads as the object. */}
      <AppShell pattern="workspace" canvas="flat"
        header={(
          <AppShellHeader
            leading={(
              <Brand initial="Z">
                {/* Figma B4 shows the file name in the compact bar as a small Body/Base/Bold label; an h1 is never
                    smaller than Heading/1, so the screen's h1 is a hidden one that says the same and the label beside it
                    is not read twice (as TopNavigation hides its bar copy). */}
                <VisuallyHidden as="h1">Checkout flow</VisuallyHidden>
                <Text as="span" textStyle="Body/Base/Bold" aria-hidden="true">Checkout flow</Text>
                {published
                  ? <Badge size="sm" theme="green" background="subtle">Published</Badge>
                  : <Badge size="sm" theme="neutral" background="solid">Draft</Badge>}
              </Brand>
            )}
            center={(
              // Figma Center-Slots centres the Segmented at its own width.
              <Stack direction="row" justify="center">
                <Segmented aria-label="Mode" level="secondary" options={[{ id: "design", label: "Design" }, { id: "prototype", label: "Prototype" }, { id: "inspect", label: "Inspect" }]} value={mode} onValueChange={setMode} />
              </Stack>
            )}
            actions={<>
              {/* Who else is editing; on a phone the row keeps Present, Share and Publish only. */}
              {phone ? null : (
                <AvatarStack size="sm" background="subtle" items={[
                  { theme: "accent", alt: people.ava.name, children: "A" },
                  { theme: "blue", alt: people.bao.name, children: "B" },
                  { theme: "brown", alt: people.chi.name, children: "C" },
                ]} />
              )}
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
            <Box surface="surface" border="subtle" radius="xl" padding="xl" width="fill" maxWidth={390} height={700} aria-label={`${text("frame")} artboard`} role="group">
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
      <ModalForm open={sharing} onOpenChange={changeSharing} title="Share Checkout flow" description="People you invite can view the file and comment." onSubmit={invite.handleSubmit}
        primaryAction={{ label: "Send invite" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Email" type="email" autoComplete="off" placeholder="name@northwind.io" data-autofocus="" {...invite.field("email")} />
      </ModalForm>
    </>
  );
}

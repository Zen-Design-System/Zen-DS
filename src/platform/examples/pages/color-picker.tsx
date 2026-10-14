import { useRef, useState, type CSSProperties } from "react";
import type { PlatformPage } from "../../PlatformExamples";
import type { ExampleDef } from "../types";
import { PlatformPhone } from "../../PlatformPhone";
import { Accordion } from "../../../components/Accordion";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { ColorPicker, type ColorFormat } from "../../../components/ColorPicker";
import { ColorSwatch } from "../../../components/ColorSwatch";
import { Divider } from "../../../components/Divider";
import { Form, FormActions } from "../../../components/Form";
import { ColorField, InputField, SelectField } from "../../../components/Input";
import { Box, Stack } from "../../../components/Layout";
import { List, ListItem } from "../../../components/ListItem";
import { Heading, Text } from "../../../components/Text";
import { useToast } from "../../../components/Toast";
import { TopNavigation } from "../../../components/TopNavigation";
import { keepOnHotUpdate } from "../../hotData";
import "./color-picker.css";

export const page: PlatformPage = "color-picker";

// The studio's brand palette: the colours people reuse, as hex values (what ColorField returns and stores).
const brandPalette = ["#1F6FEB", "#0E9F8E", "#2E9E4F", "#E07B12", "#E5533D", "#8E44C4"];

/* ───────────── 1. Brand colour: a form field with a live preview ───────────── */

function BrandColourExample() {
  const [brand, setBrand] = useState("#1F6FEB");
  const [saved, setSaved] = useState("#1F6FEB");
  const { toast } = useToast();
  return (
    <Card theme="flat" spacing="md">
      <Form gap="lg" onSubmit={(event) => { event.preventDefault(); setSaved(brand); toast({ type: "positive", title: "Theme saved" }); }}>
        <Stack gap="xs">
          <Heading level={3} textStyle="Heading/4">Client portal theme</Heading>
          <Text tone="base">The portal's header, buttons and links take the brand colour.</Text>
        </Stack>
        <ColorField label="Brand colour" value={brand} onValueChange={setBrand} savedColors={brandPalette} helpText="Pick from the palette, drag in the picker or type a hex value." />
        <Stack gap="xs">
          <Text as="span" textStyle="Body/Small/Medium" tone="base">Preview</Text>
          {/* The preview paints the picked value: the app's own colour, not a Zen token, so the token-scale audit skips it. */}
          <div className="px-color-picker-brand" data-audit-skip-quality style={{ "--px-color-picker-brand": brand } as CSSProperties}>
            <Text as="span" textStyle="Body/Base/Bold" tone="on-colors">Saola Outdoor</Text>
            <Text as="span" textStyle="Body/Small/Regular" tone="on-colors">Client portal</Text>
          </div>
        </Stack>
        <FormActions>
          <Button level="tertiary" disabled={brand === saved} onClick={() => setBrand(saved)}>Cancel</Button>
          <Button level="primary" type="submit" disabled={brand === saved}>Save theme</Button>
        </FormActions>
      </Form>
    </Card>
  );
}

/* ───────────── 2. Property panel: inline fields in grouped lists ───────────── */

function PropertyPanelExample() {
  const [title, setTitle] = useState("Japan");
  const [subtitle, setSubtitle] = useState("December 2025");
  const [tint, setTint] = useState("#000000");
  const [shape, setShape] = useState("portrait");
  const [border, setBorder] = useState("#FFFFFF");
  return (
    <div className="px-color-picker-panel">
      <Card theme="flat" spacing="sm">
        {/* Each group is its own stack and the panel stacks them with no gap, so every rule has 16 above and below. */}
        <Stack gap="none">
          <Stack gap="xs" paddingY="md">
            <Heading level={3} textStyle="Heading/4">Photo Stack</Heading>
          </Stack>
          <Divider />
          <Stack gap="xs" paddingY="md">
            <InputField layout="inline" label="Title" value={title} onValueChange={setTitle} />
            <InputField layout="inline" label="Subtitle" value={subtitle} onValueChange={setSubtitle} />
            <ColorField layout="inline" label="Shadow Tint" value={tint} onValueChange={setTint} savedColors={["#000000", "#1F2937", "#FFFFFF"]} />
            <SelectField layout="inline" label="Photo Shape" value={shape} onValueChange={setShape} options={[{ value: "portrait", label: "Portrait" }, { value: "landscape", label: "Landscape" }, { value: "square", label: "Square" }]} />
          </Stack>
          <Divider />
          {/* The Accordion sets Title → rows to 12, one step above the rows' 8: the rows go straight in. */}
          <Accordion title="Border" defaultExpanded contentWidth="full">
            <Stack gap="xs">
              <ColorField layout="inline" label="Colour" value={border} onValueChange={setBorder} savedColors={["#FFFFFF", "#000000"]} />
              <InputField layout="inline" label="Width" defaultValue="2 px" />
            </Stack>
          </Accordion>
        </Stack>
      </Card>
    </div>
  );
}

/* ───────────── 3. Inline picker: formats and the keyboard ───────────── */

function InlinePickerExample() {
  const [colour, setColour] = useState("#E07B12");
  const [format, setFormat] = useState<ColorFormat>("hsl");
  return (
    <Stack direction="row" gap="lg" align="start" wrap>
      {/* Inline, the picker has no surface of its own: it sits in the column of the panel it belongs to. */}
      <Box width={240}>
        <ColorPicker aria-label="Highlight colour" value={colour} onValueChange={setColour} format={format} onFormatChange={setFormat} savedColors={brandPalette} />
      </Box>
      <Stack gap="xs">
        <Text as="span" textStyle="Body/Small/Medium" tone="base">Highlight colour</Text>
        <Stack direction="row" gap="xs" align="center">
          <ColorSwatch color={colour} size="lg" />
          <Text as="span" textStyle="Body/Base/Medium">{colour}</Text>
        </Stack>
        <Text as="span" textStyle="Body/Small/Regular" tone="base">{`Format: ${format.toUpperCase()}`}</Text>
      </Stack>
    </Stack>
  );
}

/* ───────────── 4. States: error, read-only, disabled, no picker ───────────── */

function StatesExample() {
  const [accent, setAccent] = useState("#1F6FEB");
  const [typed, setTyped] = useState("");
  return (
    <Stack gap="lg" maxWidth={360}>
      <ColorField label="Accent colour" value={accent} onValueChange={setAccent} error={typed && !/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(typed) ? "Enter a hex colour like #1F6FEB." : undefined}
        onChange={(event) => setTyped(event.target.value)} onBlur={() => setTyped("")} helpText="Type a hex value; six digits apply at once." />
      <ColorField label="Workspace colour" defaultValue="#0E9F8E" readOnly helpText="Set by your organisation's admin." />
      <ColorField label="Logo background" defaultValue="#E5533D" disabled helpText="Upload a logo first." />
      <ColorField label="Chart line" defaultValue="#8E44C4" colorPicker={false} helpText="Without a picker: a hex field with its swatch." />
    </Stack>
  );
}

/* ───────────── 5. Mobile: a theme setting on a phone ───────────── */

function PhoneThemeExample() {
  const screenRef = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState("#2E9E4F");
  return (
    <PlatformPhone label="Event theme" headerOverlay screenRef={screenRef}
      header={<TopNavigation type="compact-alt" title="Event theme" scrollRef={screenRef} />}>
      <Stack gap="lg" padding="lg">
        {/* On a phone the field is Medium or larger; the picker opens under it, 240 wide, inside the 390 screen. */}
        <ColorField label="Theme colour" value={theme} onValueChange={setTheme} savedColors={brandPalette} size="lg" helpText="Tickets, the schedule and reminders take this colour." />
        <List aria-label="Where it shows">
          {["Ticket header", "Schedule highlights", "Reminder banner"].map((place) => (
            <ListItem key={place} title={place} leading={<ColorSwatch color={theme} size="md" />} />
          ))}
        </List>
      </Stack>
    </PlatformPhone>
  );
}

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Brand colour",
    description: "A ColorField in a settings form: the swatch and the hex, the brand palette as saved colours, and a preview that follows every change. Click the field or press ↓ to open the picker; Escape closes it and focus stays in the field.",
    render: () => <BrandColourExample />,
    code: `const [brand, setBrand] = useState("#1F6FEB");

<Form gap="lg" onSubmit={save}>
  <ColorField label="Brand colour" value={brand} onValueChange={setBrand}
    savedColors={["#1F6FEB", "#0E9F8E", "#2E9E4F", "#E07B12", "#E5533D", "#8E44C4"]}
    helpText="Pick from the palette, drag in the picker or type a hex value." />
  <FormActions>
    <Button level="tertiary" disabled={brand === saved} onClick={() => setBrand(saved)}>Cancel</Button>
    <Button level="primary" type="submit" disabled={brand === saved}>Save theme</Button>
  </FormActions>
</Form>`,
  },
  {
    title: "Property panel",
    description: "Inline fields (layout=\"inline\") in a dense panel: the label inside the field, the value at the end, a colour as its swatch. Each group is its own stack and the panel stacks them with no gap, so every rule has the same space above and below; the Accordion sets the title → rows gap itself.",
    render: () => <PropertyPanelExample />,
    code: `<Card theme="flat" spacing="sm">
  <Stack gap="none">
    <Stack gap="xs" paddingY="md"><Heading level={3} textStyle="Heading/4">Photo Stack</Heading></Stack>
    <Divider />
    <Stack gap="xs" paddingY="md">
      <InputField layout="inline" label="Title" value={title} onValueChange={setTitle} />
      <ColorField layout="inline" label="Shadow Tint" value={tint} onValueChange={setTint} />
      <SelectField layout="inline" label="Photo Shape" value={shape} onValueChange={setShape} options={shapes} />
    </Stack>
    <Divider />
    <Accordion title="Border" defaultExpanded contentWidth="full">
      <Stack gap="xs">
        <ColorField layout="inline" label="Colour" value={border} onValueChange={setBorder} />
      </Stack>
    </Accordion>
  </Stack>
</Card>`,
    wide: true,
  },
  {
    title: "Inline picker and formats",
    description: "An always-open ColorPicker in a panel, on HSL. Tab reaches the area (← → saturation, ↑ ↓ brightness, Shift for 10 steps), the hue slider, the Format select and the channels (each named in full: Hue, Saturation, Lightness); Enter applies a typed channel.",
    render: () => <InlinePickerExample />,
    code: `const [colour, setColour] = useState("#E07B12");
const [format, setFormat] = useState("hsl");

<ColorPicker aria-label="Highlight colour" value={colour} onValueChange={setColour}
  format={format} onFormatChange={setFormat} savedColors={palette} />`,
  },
  {
    title: "States",
    description: "Error while the typed text is not a colour (anything else goes back to the last colour on blur), Read-only for a value set elsewhere, Disabled with its reason, and colorPicker={false} for a plain hex field.",
    render: () => <StatesExample />,
    code: `<ColorField label="Accent colour" value={accent} onValueChange={setAccent}
  error={invalid ? "Enter a hex colour like #1F6FEB." : undefined} />
<ColorField label="Workspace colour" defaultValue="#0E9F8E" readOnly helpText="Set by your organisation's admin." />
<ColorField label="Logo background" defaultValue="#E5533D" disabled helpText="Upload a logo first." />
<ColorField label="Chart line" defaultValue="#8E44C4" colorPicker={false} />`,
  },
  {
    title: "Theme colour on a phone",
    description: "A Large ColorField in a phone settings screen; the picker opens under it at 240px. Swatches beside the places it applies show the change at once.",
    render: () => <PhoneThemeExample />,
    code: `<ColorField label="Theme colour" value={theme} onValueChange={setTheme} size="lg"
  savedColors={palette} helpText="Tickets, the schedule and reminders take this colour." />
<List aria-label="Where it shows">
  {places.map((place) => <ListItem key={place} title={place} leading={<ColorSwatch color={theme} />} />)}
</List>`,
    screen: true,
  },
]);

import { useState } from "react";
import { Badge, Button, Card, ColorSelector, Form, FormActions, FormFieldset, Heading, InputField, Stack, Text, useToast, type BadgeTheme, type ColorOption } from "@zen-ds/react";

/* Swatches are Support/Solid tokens, so they follow light and dark mode; the value maps back to a hue id. Ordered by hue. */
type Hue = "red" | "orange" | "yellow" | "green" | "teal" | "cyan" | "blue" | "indigo" | "purple" | "pink";
const hueNames: Record<Hue, string> = { red: "Red", orange: "Orange", yellow: "Yellow", green: "Green", teal: "Teal", cyan: "Cyan", blue: "Blue", indigo: "Indigo", purple: "Purple", pink: "Pink" };
const swatch = (hue: Hue): ColorOption => ({ value: `var(--zen-color-background-support-${hue}-solid)`, label: hueNames[hue], contrast: hue === "yellow" ? "dark" : undefined });
const hueOf = (value: string) => (Object.keys(hueNames) as Hue[]).find((hue) => swatch(hue).value === value)!;
// Labels get eight hues: enough to tell labels apart, few enough for one row.
const labelHues: Hue[] = ["red", "orange", "yellow", "green", "teal", "blue", "purple", "pink"];

type Label = { id: string; name: string; hue: Hue };
const startLabels: Label[] = [
  { id: "blocked", name: "Blocked", hue: "red" },
  { id: "client", name: "Client review", hue: "purple" },
  { id: "quick", name: "Quick win", hue: "green" },
];

/** Pick, preview, create. */
export default function LabelColour() {
  const { toast } = useToast();
  const [labels, setLabels] = useState(startLabels);
  const [name, setName] = useState("Needs copy");
  const [hue, setHue] = useState<Hue>("orange");
  const [error, setError] = useState<string>();
  const create = () => {
    const trimmed = name.trim();
    if (!trimmed) { setError("Name the label"); return; }
    setLabels([...labels, { id: `${trimmed}-${labels.length}`, name: trimmed, hue }]);
    setName("");
    // The next label starts on a colour nobody uses yet.
    setHue(labelHues.find((item) => item !== hue && !labels.some((label) => label.hue === item)) ?? "blue");
    toast({ type: "positive", title: "Label created" });
  };
  return (
    <Stack><Card theme="default" width="fill" maxWidth={440} alignSelf="center">
      {/* Two groups in one card (lg apart): the labels so far, and the form that adds one. */}
      <Stack gap="lg">
        <Stack gap="xs">
          <Heading level={4} textStyle="Heading/Subheading">Labels</Heading>
          <Stack direction="row" gap="2xs" wrap>
            {labels.map((label) => <Badge key={label.id} theme={label.hue as BadgeTheme} background="subtle">{label.name}</Badge>)}
          </Stack>
        </Stack>
        <Form onSubmit={create} gap="md">
          <InputField label="Name" value={name} error={error} onValueChange={(value) => { setName(value); setError(undefined); }} />
          <FormFieldset legend="Colour">
            <ColorSelector aria-label="Label colour" colors={labelHues.map(swatch)} value={swatch(hue).value} onValueChange={(value) => setHue(hueOf(value))} />
          </FormFieldset>
          <Stack direction="row" gap="xs" align="center">
            <Text as="span" textStyle="Body/Small/Regular" tone="base">Preview</Text>
            <Badge theme={hue as BadgeTheme} background="subtle">{name.trim() || "Label"}</Badge>
          </Stack>
          <FormActions>
            <Button level="primary" type="submit">Create label</Button>
          </FormActions>
        </Form>
      </Stack>
    </Card></Stack>
  );
}

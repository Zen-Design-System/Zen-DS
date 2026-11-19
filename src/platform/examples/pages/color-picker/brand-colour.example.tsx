import { useState } from "react";
import { Button, Card, ColorField, Form, FormActions, Heading, Stack, Text, useToast } from "@zen-ds/react";

// The studio's brand palette: the colours people reuse, as hex values (what ColorField returns and stores).
const brandPalette = ["#1F6FEB", "#0E9F8E", "#2E9E4F", "#E07B12", "#E5533D", "#8E44C4"];

/** A form field with a live preview. */
export default function BrandColour() {
  const [brand, setBrand] = useState("#1F6FEB");
  const [saved, setSaved] = useState("#1F6FEB");
  const { toast } = useToast();
  return (
    <Card theme="default" spacing="md">
      <Form gap="lg" onSubmit={(event) => { event.preventDefault(); setSaved(brand); toast({ type: "positive", title: "Theme saved" }); }}>
        <Stack gap="xs">
          <Heading level={3} textStyle="Heading/4">Client portal theme</Heading>
          <Text tone="base">The portal's header, buttons and links take the brand colour.</Text>
        </Stack>
        <ColorField label="Brand colour" value={brand} onValueChange={setBrand} savedColors={brandPalette} helpText="Pick from the palette, drag in the picker or type a hex value." />
        <Stack gap="xs">
          <Text as="span" textStyle="Body/Small/Medium" tone="base">Preview</Text>
          {/* The preview paints the picked value: the app's own colour, not a Zen token (data-audit-skip-quality: the docs'
              token-scale audit skips it). */}
          <Stack gap="2xs" padding="md" radius="md" style={{ background: brand }} data-audit-skip-quality>
            <Text as="span" textStyle="Body/Base/Bold" tone="on-colors">Saola Outdoor</Text>
            <Text as="span" textStyle="Body/Small/Regular" tone="on-colors">Client portal</Text>
          </Stack>
        </Stack>
        <FormActions>
          <Button level="tertiary" disabled={brand === saved} onClick={() => setBrand(saved)}>Cancel</Button>
          <Button level="primary" type="submit" disabled={brand === saved}>Save theme</Button>
        </FormActions>
      </Form>
    </Card>
  );
}

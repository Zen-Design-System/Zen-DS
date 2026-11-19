import { useState } from "react";
import { Box, ColorPicker, ColorSwatch, Stack, Text, type ColorFormat } from "@zen-ds/react";

// The studio's brand palette: the colours people reuse, as hex values.
const brandPalette = ["#1F6FEB", "#0E9F8E", "#2E9E4F", "#E07B12", "#E5533D", "#8E44C4"];

/** An always-open picker: formats and the keyboard. */
export default function InlinePicker() {
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

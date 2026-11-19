import { useState } from "react";
import { Accordion, Box, Card, ColorField, Divider, Heading, InputField, SelectField, Stack } from "@zen-ds/react";

/** Inline fields in grouped lists. */
export default function PropertyPanel() {
  const [title, setTitle] = useState("Japan");
  const [subtitle, setSubtitle] = useState("December 2025");
  const [tint, setTint] = useState("#000000");
  const [shape, setShape] = useState("portrait");
  const [border, setBorder] = useState("#FFFFFF");
  return (
    <Box width="fill" maxWidth={360}>
      <Card theme="default">
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
    </Box>
  );
}

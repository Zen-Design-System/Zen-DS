import { useRef, useState } from "react";
import { Button, Card, ColorSelector, Heading, Stack, Text, type ColorOption } from "@zen-ds/react";

type Highlight = "yellow" | "green" | "blue" | "pink" | "purple";
const highlightNames: Record<Highlight, string> = { yellow: "Yellow", green: "Green", blue: "Blue", pink: "Pink", purple: "Purple" };
const highlights: Highlight[] = ["yellow", "green", "blue", "pink", "purple"];
// Soft fills are light in Light mode, so the check turns dark (contrast="dark") to stay visible.
const highlightSwatch = (hue: Highlight): ColorOption => ({ value: `var(--zen-color-background-support-${hue}-soft)`, label: highlightNames[hue], contrast: "dark" });

/** Light swatches need the dark check. */
export default function HighlightColours() {
  const [value, setValue] = useState<string | undefined>(highlightSwatch("yellow").value);
  const noteRef = useRef<HTMLParagraphElement>(null);
  // Clear highlight disables itself: focus moves to the note it cleared, and Tab goes on to the swatches, where a new
  // colour can be picked.
  const clear = () => {
    setValue(undefined);
    setTimeout(() => noteRef.current?.focus());
  };
  return (
    <Stack><Card theme="default" width="fill" maxWidth={440} alignSelf="center">
      <Stack gap="md">
        <Stack gap="xs">
          <Heading level={4} textStyle="Heading/Subheading">Review notes</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">Loyalty app · points history, round 2</Text>
        </Stack>
        <Text ref={noteRef} tabIndex={-1}>
          The history list reads well on small phones.{" "}
          {/* A highlight keeps the text colour; with no colour picked it is plain text again (the browser's own yellow is off). */}
          <mark style={{
            paddingInline: "var(--zen-spacing-padding-3-xsmall, 2px)",
            borderRadius: "var(--zen-corner-radius-2-xsmall, 4px)",
            background: value ?? "transparent",
            color: "inherit",
          }}>Expired points need their own row, not a grey total</mark>
          , and the filter should remember the last month someone picked.
        </Text>
        <Stack direction="row" gap="xs" align="center" justify="between" wrap>
          <ColorSelector aria-label="Highlight colour" colors={highlights.map(highlightSwatch)} value={value} onValueChange={setValue} />
          <Button level="tertiary" disabled={!value} onClick={clear}>Clear highlight</Button>
        </Stack>
      </Stack>
    </Card></Stack>
  );
}

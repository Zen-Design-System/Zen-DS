import { useId, useState, type RefObject } from "react";
import {
  ActionBar, AppShell, Box, Card, ColorField, ColorSwatch, DescriptionList, Heading, InlineMessage, List, ListBox, ListItem, Stack, Text, TopNavigation,
  useToast,
} from "@zen-ds/react";
import { me } from "../../data";

// The event palette: the colours people reuse, as hex values (what ColorField returns and stores).
const brandPalette = ["#1F6FEB", "#0E9F8E", "#2E9E4F", "#E07B12", "#E5533D", "#8E44C4"];

/** Contrast of white text on a hex colour (WCAG 2.2 relative luminance), so the screen can warn before ticket text
 *  gets hard to read. */
function contrastWithWhite(hex: string) {
  const digits = hex.replace("#", "");
  const full = digits.length === 3 ? digits.split("").map((digit) => digit + digit).join("") : digits;
  const [r, g, b] = [0, 2, 4].map((at) => parseInt(full.slice(at, at + 2), 16) / 255)
    .map((channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return Number.isFinite(luminance) ? 1.05 / (luminance + 0.05) : 21;
}
/** Where the Hanoi Book Fair app paints the event's colour. */
const themePlaces = [
  { id: "ticket", title: "Ticket header", caption: "On every ticket and in Apple Wallet" },
  { id: "schedule", title: "Schedule highlights", caption: "The talks a visitor saved" },
  { id: "reminder", title: "Reminder banner", caption: "30 minutes before a saved talk" },
];

// scrollRef: what scrolls the screen, so the bar draws its rule once content runs under it. "window" in your app.
export default function PhoneTheme({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const previewId = useId();
  const placesId = useId();
  const [saved, setSaved] = useState("#8E44C4");
  const [theme, setTheme] = useState(saved);
  const dirty = theme.toUpperCase() !== saved.toUpperCase();
  const ratio = contrastWithWhite(theme);
  return (
    // A settings screen pushed from the event: the compact bar with Back, the field and what it paints in flat white
    // blocks on the grey Canvas, and Reset / Save theme pinned in the Action bar (Figma Bottom=Actions).
    <AppShell
      topNavigation={<TopNavigation type="compact-alt" title="Event theme" scrollRef={scrollRef}
        leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => toast({ title: "Back to Event settings", children: dirty ? "The new colour isn't saved yet." : "Hanoi Book Fair 2026" }) }} />}
      actionBar={<ActionBar direction="horizontal"
        summary={<Text as="span" textStyle="Body/Small/Regular" tone="base" role="status">{dirty ? "Not saved yet" : "Saved · visitors see this colour"}</Text>}
        secondaryAction={{ label: "Reset", disabled: !dirty, onClick: () => setTheme(saved) }}
        primaryAction={{ label: "Save theme", disabled: !dirty, onClick: () => { setSaved(theme); toast({ type: "positive", title: "Theme saved", children: "Tickets, the schedule and reminders use it now." }); } }} />}
    >
      {/* On a phone the field is Medium or larger; the picker opens under it, 240 wide, inside the 390 screen. */}
      <ColorField label="Theme colour" value={theme} onValueChange={setTheme} savedColors={brandPalette} size="lg" helpText="Pick from the event palette or type a hex value." />
      {ratio < 4.5 ? (
        <InlineMessage theme="warning" title="White text is hard to read on this colour">
          {`It reaches ${ratio.toFixed(1)}:1; ticket text needs 4.5:1. Try a darker shade.`}
        </InlineMessage>
      ) : null}
      <Stack as="section" gap="xs" aria-labelledby={previewId}>
        <Box paddingX="lg"><Heading level={2} id={previewId} textStyle="Body/Small/Bold" tone="light">Ticket preview</Heading></Box>
        <Card theme="default">
          <Stack gap="md">
            {/* The preview paints the picked value: the app's own colour, not a Zen token (data-audit-skip-quality: the
                docs' token-scale audit skips it). */}
            <Stack gap="2xs" padding="md" radius="md" style={{ background: theme }} data-audit-skip-quality>
              <Text as="span" textStyle="Body/Base/Bold" tone="on-colors">Hanoi Book Fair 2026</Text>
              <Text as="span" textStyle="Body/Small/Regular" tone="on-colors">Day pass · Thống Nhất Park</Text>
            </Stack>
            <DescriptionList items={[
              { id: "date", term: "Date", description: "Sat, Oct 31, 2026" },
              { id: "gate", term: "Gate", description: "B · opens 8:30 am" },
              { id: "holder", term: "Holder", description: me.name },
            ]} />
          </Stack>
        </Card>
      </Stack>
      <Stack as="section" gap="xs" aria-labelledby={placesId}>
        <Box paddingX="lg"><Heading level={2} id={placesId} textStyle="Body/Small/Bold" tone="light">Where it shows</Heading></Box>
        <ListBox theme="default">
          <List aria-labelledby={placesId}>
            {themePlaces.map((place) => (
              <ListItem key={place.id} title={place.title} caption={place.caption} leading={<ColorSwatch color={theme} size="md" />} />
            ))}
          </List>
        </ListBox>
      </Stack>
    </AppShell>
  );
}

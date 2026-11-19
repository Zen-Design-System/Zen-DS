import { useId, useState, type CSSProperties, type RefObject } from "react";
import {
  AppShell, Badge, BottomNavigation, Box, Card, Heading, MetricCard, ProgressBar, Segmented, Stack, Text, TopNavigation, useToast,
  type BadgeTheme,
} from "@zen-ds/react";

/* Figma ◇ Master-Layout · Example › E · Consumer apps › E7 · Big number (15991:10011): one Pattern/AppShell/Mobile,
   Top=Band-Sheet on Background/Accent/Solid · Bottom=Floating, Glass. The copy, numbers and variants are the Figma
   screen's. */

const week = [
  { day: "Mon", date: 14 },
  { day: "Tue", date: 15 },
  { day: "Wed", date: 16, today: true },
  { day: "Thu", date: 17 },
  { day: "Fri", date: 18 },
];
type HeroView = "nutrition" | "activity";
const heroViews: Record<HeroView, { value: string; label: string; tiles: { id: string; label: string; value: string }[] }> = {
  nutrition: { value: "1,644", label: "Calories eaten today", tiles: [{ id: "protein", label: "Protein", value: "32%" }, { id: "carbs", label: "Carbs", value: "44%" }, { id: "fat", label: "Fat", value: "28%" }] },
  activity: { value: "6,240", label: "Steps today", tiles: [{ id: "distance", label: "Distance", value: "4.1 km" }, { id: "active", label: "Active", value: "48 min" }, { id: "burned", label: "Burned", value: "312 kcal" }] },
};
type Update = "meals" | "advice" | "water";
type Measurement = { title: string; caption: string; value: string; progress: number; min: string; max: string; footer: string; status: { label: string; theme: BadgeTheme } };
const updates: Record<Update, Measurement> = {
  meals: { title: "Lunch: bún chả", caption: "Logged at 12:40 pm", value: "620 kcal", progress: 28, min: "0", max: "2,200 kcal", footer: "3 meals logged today", status: { label: "On track", theme: "teal" } },
  advice: { title: "Improve melatonin", caption: "Sleep hormone", value: "3 pg/ml", progress: 20, min: "0", max: "200 pg/ml", footer: "Last measured today at 7:30 pm", status: { label: "Normal", theme: "teal" } },
  water: { title: "Water", caption: "Goal 2 L a day", value: "1.2 L", progress: 60, min: "0", max: "2 L", footer: "Last glass at 3:10 pm", status: { label: "Drink more", theme: "orange" } },
};
/** Figma's Hero pads 24 · 48 where AppShell's hero pads 8 · 24, so the Stack adds Padding/Medium and this Box Padding/XSmall below. */
const heroEnd: CSSProperties = { paddingBottom: "var(--zen-spacing-padding-xsmall)" };

/** A nutrition app's day: one big number on a Solid band with the week and three tiles, then the day's updates. */
// scrollRef: what scrolls the screen, so the bar follows the scroll. "window" in your app.
export default function BigNumber({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const [root, setRoot] = useState("home");
  const [view, setView] = useState<HeroView>("nutrition");
  const [update, setUpdate] = useState<Update>("advice");
  const hero = heroViews[view];
  const card = updates[update];
  const updatesId = useId();
  return (
    // Band-Sheet on Accent/Solid: the week with today on White, a White-Overlay Segmented for the view (its labels are
    // On-White-Overlay/Light at rest, Strongest when selected, hovered or focused), one Display-Extra number and three
    // tiles on the band; the Surface sheet carries the day's updates (a Segmented and one Pale measurement card). The
    // glass bar floats over the sheet.
    <AppShell mobileTop="band-sheet" band="accent"
      // Figma Top-bar=false: only the status-bar inset; the title is the screen's h1 for screen readers.
      topNavigation={<TopNavigation scrollRef={scrollRef} topBar={false} title="Today, Wednesday 16" />}
      hero={(
        <Box style={heroEnd}>
          <Stack gap="lg" paddingY="md" align="center">
            <Stack as="ol" direction="row" justify="between" gap="none" width="fill" aria-label="This week">
              {week.map((day) => (
                <Box as="li" key={day.day} width={56} paddingY="xs" radius="md" surface={day.today ? "surface" : "none"} aria-current={day.today ? "date" : undefined}>
                  <Stack gap="none" align="center">
                    <Text as="span" textStyle="Caption/Medium" tone={day.today ? "light" : "on-accent"}>{day.day}</Text>
                    <Text as="span" textStyle="Heading/4" tone={day.today ? "strongest" : "on-accent"}>{day.date}</Text>
                  </Stack>
                </Box>
              ))}
            </Stack>
            <Segmented level="white-overlay" aria-label="View" value={view} onValueChange={(value) => setView(value as HeroView)}
              options={[{ id: "nutrition", label: "Nutrition" }, { id: "activity", label: "Activity" }]} />
            <Stack gap="2xs" align="center">
              <Text textStyle="Display-Extra/1" tone="on-accent" tabularNumbers>{hero.value}</Text>
              <Text textStyle="Body/Base/Medium" tone="on-accent">{hero.label}</Text>
            </Stack>
            <Stack direction="row" gap="sm" fillChildren width="fill">
              {hero.tiles.map((tile) => (
                <MetricCard key={tile.id} type="tile" theme="default" size="sm" icon={false} label={tile.label} value={tile.value} />
              ))}
            </Stack>
          </Stack>
        </Box>
      )}
      bottomNavigation={<BottomNavigation type="floating-glass" aria-label="Nutrition" value={root} onValueChange={setRoot} showLabels
        action={{ icon: "icon-plus-line", label: "Log a meal", onClick: () => toast({ title: "Log a meal", children: "Snap a photo or search 2 million foods." }) }}
        items={[
          { id: "home", label: "Home", icon: "icon-home-02-line", selectedIcon: "icon-home-02-solid" },
          { id: "log", label: "Log", icon: "icon-calendar-line", selectedIcon: "icon-calendar-solid" },
          { id: "alerts", label: "Alerts", icon: "icon-bell-01-line", selectedIcon: "icon-bell-01-solid" },
          { id: "profile", label: "Profile", icon: "icon-user-line", selectedIcon: "icon-user-solid" },
        ]} />}
    >
      <Stack as="section" gap="md" aria-labelledby={updatesId}>
        <Heading level={2} id={updatesId} textStyle="Heading/4">Daily updates</Heading>
        <Segmented fullWidth aria-label="Daily updates" value={update} onValueChange={(value) => setUpdate(value as Update)}
          options={[{ id: "meals", label: "Meals" }, { id: "advice", label: "Advice" }, { id: "water", label: "Water" }]} />
        <Card theme="pale">
          <Stack gap="sm">
            <Stack direction="row" justify="between" align="center" gap="sm">
              <Stack gap="none" width="fill">
                <Heading level={3} textStyle="Body/Base/Bold">{card.title}</Heading>
                <Text textStyle="Body/Small/Regular" tone="base">{card.caption}</Text>
              </Stack>
              <Text textStyle="Heading/2" wrap={false} tabularNumbers>{card.value}</Text>
            </Stack>
            <ProgressBar theme="accent" value={card.progress} aria-label={`${card.title}: ${card.value} of ${card.max}`} />
            <Stack direction="row" justify="between" gap="sm">
              <Text as="span" textStyle="Caption/Regular" tone="light">{card.min}</Text>
              <Text as="span" textStyle="Caption/Regular" tone="light">{card.max}</Text>
            </Stack>
            <Stack direction="row" justify="between" align="center" gap="sm">
              <Text textStyle="Caption/Regular" tone="light">{card.footer}</Text>
              <Badge size="sm" theme={card.status.theme} background="subtle">{card.status.label}</Badge>
            </Stack>
          </Stack>
        </Card>
      </Stack>
    </AppShell>
  );
}

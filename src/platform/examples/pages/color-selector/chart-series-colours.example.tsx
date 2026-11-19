import { useState } from "react";
import { Card, ChartCard, ColorSelector, InlineMessage, Stack, StackBarChart, Text, type ColorOption } from "@zen-ds/react";

/* Swatches are Support/Solid tokens, so they follow light and dark mode; the value maps back to a hue id. Ordered by hue. */
type Hue = "orange" | "blue" | "teal" | "purple" | "pink";
const hueNames: Record<Hue, string> = { orange: "Orange", blue: "Blue", teal: "Teal", purple: "Purple", pink: "Pink" };
const swatch = (hue: Hue): ColorOption => ({ value: `var(--zen-color-background-support-${hue}-solid)`, label: hueNames[hue] });
const hueOf = (value: string) => (Object.keys(hueNames) as Hue[]).find((hue) => swatch(hue).value === value)!;

const seriesHues: Hue[] = ["orange", "blue", "teal", "purple", "pink"];
const clientSeries = [
  { id: "phin", label: "Phin & Co" },
  { id: "lumen", label: "Lumen Bank" },
  { id: "mekong", label: "Mekong Freight" },
];
const weeklyHours = [
  { label: "Aug 31", values: { phin: 96, lumen: 120, mekong: 40 } },
  { label: "Sep 7", values: { phin: 104, lumen: 132, mekong: 36 } },
  { label: "Sep 14", values: { phin: 88, lumen: 140, mekong: 24 } },
  { label: "Sep 21", values: { phin: 112, lumen: 128, mekong: 8 } },
];

/** The chart answers every pick. */
export default function ChartSeries() {
  const [colours, setColours] = useState<Record<string, Hue>>({ phin: "orange", lumen: "blue", mekong: "blue" });
  const shared = clientSeries.filter((series, index) => clientSeries.some((other, j) => j !== index && colours[other.id] === colours[series.id]));
  return (
    <Stack><Stack gap="md" width="fill" maxWidth={440} alignSelf="center">
      <ChartCard title="Hours by client" headingLevel={4} theme="default">
        <StackBarChart aria-label="Hours by client, last four weeks" height={200} format={(value) => `${value} h`}
          series={clientSeries.map((series) => ({ ...series, color: swatch(colours[series.id]).value }))} data={weeklyHours} />
      </ChartCard>
      <Card theme="default">
        <Stack gap="md">
          {shared.length ? (
            <InlineMessage theme="warning" title="Two clients share a colour">
              {`${shared.map((series) => series.label).join(" and ")} look the same in the chart. Pick another colour for one of them.`}
            </InlineMessage>
          ) : null}
          {clientSeries.map((series) => (
            <Stack key={series.id} gap="xs">
              <Text as="span" textStyle="Body/Small/Bold" tone="base">{series.label}</Text>
              <ColorSelector aria-label={`${series.label} colour`} colors={seriesHues.map(swatch)} value={swatch(colours[series.id]).value}
                onValueChange={(value) => setColours({ ...colours, [series.id]: hueOf(value) })} />
            </Stack>
          ))}
        </Stack>
      </Card>
    </Stack></Stack>
  );
}

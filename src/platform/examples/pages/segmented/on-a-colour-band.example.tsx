import { useId, useState } from "react";
import { Box, Heading, Segmented, Stack, Text } from "@zen-ds/react";
import { formatMoney, studioMonths, studioTeamHours } from "../../data";

type BandMeasure = "hours" | "invoiced";
// September at the studio, from the shared months (the Metric and Chart pages show the same figures).
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const invoicedIn = (id: string) => sum(studioMonths.filter((month) => month.id === id).map((month) => month.invoiced));
const hoursIn = (label: string) => sum(studioTeamHours.filter((month) => month.label === label).map((month) => month.design + month.engineering + month.delivery + month.clientServices));
/** The change against August, rounded to whole percent. */
const changeLabel = (now: number, before: number) => `${Math.abs(Math.round((now / before - 1) * 100))}%`;
const september: Record<BandMeasure, { value: string; change: string }> = {
  hours: { value: `${hoursIn("Sep").toLocaleString("en-US")} h`, change: changeLabel(hoursIn("Sep"), hoursIn("Aug")) },
  invoiced: { value: formatMoney(invoicedIn("sep")), change: changeLabel(invoicedIn("sep"), invoicedIn("aug")) },
};

export default function OnAColourBand() {
  const [measure, setMeasure] = useState<BandMeasure>("hours");
  const headingId = useId();
  const kpi = september[measure];
  return (
    // Brand/Accent band (Background/Accent/Solid): the same pink in light and dark mode, so everything on it takes static
    // tones and an overlay level (here the default, Black-Overlay), never mode tokens.
    <Box as="section" surface="accent-solid" padding="lg" radius="lg" aria-labelledby={headingId}>
      <Stack gap="md">
        <Stack direction="row" justify="between" align="center" gap="sm" wrap>
          <Heading level={4} id={headingId} textStyle="Heading/Subheading" tone="on-white-overlay-strongest">September at the studio</Heading>
          <Segmented level="black-overlay" aria-label="Measure" value={measure} onValueChange={(id) => setMeasure(id as BandMeasure)} options={[
            { id: "hours", label: "Hours" },
            { id: "invoiced", label: "Invoiced" },
          ]} />
        </Stack>
        <Stack gap="2xs" role="status">
          <Text textStyle="Heading/1" tone="on-white-overlay-strongest">{kpi.value}</Text>
          <Text textStyle="Body/Small/Regular" tone="on-white-overlay-base">{kpi.change}</Text>
        </Stack>
      </Stack>
    </Box>
  );
}

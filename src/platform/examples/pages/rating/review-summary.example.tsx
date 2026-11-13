import { useState } from "react";
import { Card, Chip, Grid, Heading, Metric, ProgressBar, RatingDisplay, Stack, Text, plural } from "@zen-ds/react";

// Phin Rewards, the loyalty app the studio builds for Phin & Co, as the App Store reports it.
const appRatings = {
  all: { label: "All versions", average: 4.6, count: 1284, trend: "0.2", versus: "vs. August", shares: [68, 19, 7, 3, 3] },
  latest: { label: "Version 2.4", average: 4.8, count: 212, trend: "0.3", versus: "vs. version 2.3", shares: [81, 13, 3, 1, 2] },
} as const;
type RatingScope = keyof typeof appRatings;

export default function ReviewSummary() {
  const [scope, setScope] = useState<RatingScope>("all");
  const data = appRatings[scope];
  return (
    <Stack><Card theme="default" width="fill" maxWidth={440} alignSelf="center">
      <Stack gap="md">
        <Stack direction="row" justify="between" align="start" gap="sm" wrap>
          <Stack gap="xs">
            <Heading level={4} textStyle="Heading/Subheading">Phin Rewards on the App Store</Heading>
            <Text textStyle="Body/Small/Regular" tone="base">Loyalty app · Phin & Co</Text>
          </Stack>
          <Chip variant="advanced" popoverLabel="Version"
            popoverItems={(Object.keys(appRatings) as RatingScope[]).map((id) => ({ id, label: appRatings[id].label, selected: id === scope }))}
            onPopoverSelect={(item) => setScope(item.id as RatingScope)}>
            {data.label}
          </Chip>
        </Stack>
        {/* One value treatment: the Metric gives the number and its trend, the stars under it carry the sample size. */}
        <Stack gap="xs">
          <Metric size="md" icon={false} label="Average rating" value={data.average.toFixed(1)}
            trend={{ direction: "positive", label: data.trend, subLabel: data.versus }} />
          <Stack direction="row" gap="xs" align="center">
            <RatingDisplay value={data.average} size="md" />
            <Text as="span" textStyle="Body/Small/Regular" tone="base">{plural(data.count, "rating")}</Text>
          </Stack>
        </Stack>
        {/* One bar per star value, 5 → 1, each with its share of the ratings: a two-column grid, so the bars line up. */}
        <Grid columns="auto minmax(0, 1fr)" columnGap="sm" rowGap="xs" align="center">
          {data.shares.map((share, index) => [
            <Text key={`label-${index}`} as="span" textStyle="Body/Small/Regular" tone="base">{plural(5 - index, "star")}</Text>,
            // The percentage takes the width of "100%", so every bar ends on one line.
            <ProgressBar key={`bar-${index}`} value={share} aria-label={`${plural(5 - index, "star")}: ${share}% of ratings`}
              label={<span style={{ display: "inline-block", minWidth: "4.5ch", textAlign: "end" }}>{`${share}%`}</span>} />,
          ])}
        </Grid>
      </Stack>
    </Card></Stack>
  );
}

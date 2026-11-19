import { useState } from "react";
import { Card, Chip, Heading, Stack, Text } from "@zen-ds/react";
import { people, projectById } from "../../data";

/** Offsets in minutes on Oct 1, 2026 (daylight saving where it applies that day). */
const timeZones = [
  { id: "honolulu", city: "Honolulu", offset: -600 }, { id: "los-angeles", city: "Los Angeles", offset: -420 },
  { id: "chicago", city: "Chicago", offset: -300 }, { id: "new-york", city: "New York", offset: -240 },
  { id: "sao-paulo", city: "São Paulo", offset: -180 }, { id: "london", city: "London", offset: 60 },
  { id: "paris", city: "Paris", offset: 120 }, { id: "dubai", city: "Dubai", offset: 240 },
  { id: "mumbai", city: "Mumbai", offset: 330 }, { id: "bangkok", city: "Bangkok", offset: 420 },
  { id: "hcmc", city: "Ho Chi Minh City", offset: 420 }, { id: "singapore", city: "Singapore", offset: 480 },
  { id: "tokyo", city: "Tokyo", offset: 540 }, { id: "sydney", city: "Sydney", offset: 600 },
];
const utcLabel = (offset: number) => {
  const abs = Math.abs(offset), minutes = abs % 60;
  return `UTC${offset < 0 ? "−" : "+"}${Math.floor(abs / 60)}${minutes ? `:${String(minutes).padStart(2, "0")}` : ""}`;
};
/** The Lumen Bank review: Thursday, Oct 1, 2026, 08:00–09:00 UTC (3:00 pm in Ho Chi Minh City). */
const reviewStart = Date.UTC(2026, 9, 1, 8, 0);
const clock = (d: Date, suffix = true) => {
  const h = d.getUTCHours();
  return `${h % 12 || 12}:${String(d.getUTCMinutes()).padStart(2, "0")}${suffix ? ` ${h < 12 ? "am" : "pm"}` : ""}`;
};
const reviewIn = (offset: number) => {
  const from = new Date(reviewStart + offset * 60000), to = new Date(reviewStart + (offset + 60) * 60000);
  const sameHalf = from.getUTCHours() < 12 === to.getUTCHours() < 12;
  return {
    day: from.toLocaleString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" }),
    time: `${clock(from, !sameHalf)} – ${clock(to)}`,
  };
};

/** Fourteen time zones scroll inside a Chip's Popover, with search to narrow them; a pick shows the review's time there. */
export default function ReviewTimeZone() {
  const [zoneId, setZoneId] = useState("hcmc");
  const zone = timeZones.find((z) => z.id === zoneId)!;
  const { day, time } = reviewIn(zone.offset);
  return (
    <Card theme="default" width="fill">
      <Stack gap="md">
        <Stack gap="xs">
          <Heading level={4} textStyle="Heading/Subheading">Design review with Lumen Bank</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">{`${projectById("lumen-banking").name} · hosted by ${people.alex.name}`}</Text>
        </Stack>
        <Stack direction="row" align="center" justify="between" gap="md" wrap>
          <Stack gap="xs">
            <Text as="span" textStyle="Body/Small/Regular" tone="base">{day}</Text>
            <Text as="span" textStyle="Body/Base/Bold">{time}</Text>
          </Stack>
          <Chip variant="advanced" dropdown leading="icon-globe-01-line" popoverLabel="Time zone" popoverSearch
            popoverSearchPlaceholder="Search cities"
            popoverItems={timeZones.map((z) => ({ id: z.id, label: z.city, caption: utcLabel(z.offset), selected: z.id === zoneId }))}
            onPopoverSelect={(item) => setZoneId(item.id)}>
            {zone.city}
          </Chip>
        </Stack>
      </Stack>
    </Card>
  );
}

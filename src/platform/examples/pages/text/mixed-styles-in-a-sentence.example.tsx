import { useId, useState } from "react";
import { Button, Card, Heading, Stack, Text, TextRun, plural, useToast } from "@zen-ds/react";
import { daysFromToday, formatDate } from "../../data";

export default function PlanRenewal() {
  const { toast } = useToast();
  const [unpaid, setUnpaid] = useState(2);
  const titleId = useId();
  return (
    <Card as="section" theme="default" aria-labelledby={titleId}>
      <Stack gap="md">
        <Stack gap="xs">
          <Heading level={2} id={titleId} textStyle="Heading/Subheading">Pro plan</Heading>
          {/* One sentence, read as one: the date and the price are bold, the unpaid seats take the Negative tone. */}
          <Text role="status">
            Your plan renews on <TextRun bold>{formatDate(daysFromToday(33))}</TextRun> for <TextRun bold>$48</TextRun> a month
            {unpaid ? ". " : ", every seat paid."}
            {unpaid ? <TextRun tone="negative-base">{plural(unpaid, "seat")}</TextRun> : null}
            {unpaid ? ` ${unpaid === 1 ? "is" : "are"} unpaid.` : null}
          </Text>
          <Text textStyle="Body/Small/Regular" tone="base">
            Was <TextRun strikethrough>$60</TextRun>: the yearly discount applies from your next bill.
          </Text>
        </Stack>
        {unpaid ? (
          <Button level="primary" onClick={() => { setUnpaid(0); toast({ type: "positive", title: `${plural(unpaid, "seat")} paid` }); }}>
            {`Pay for ${plural(unpaid, "seat")}`}
          </Button>
        ) : null}
      </Stack>
    </Card>
  );
}

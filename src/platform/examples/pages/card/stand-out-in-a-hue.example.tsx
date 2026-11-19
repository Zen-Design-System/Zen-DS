import { useId, useState } from "react";
import { Button, Card, Grid, Heading, ProgressBar, Stack, Text, plural, useToast } from "@zen-ds/react";
import { daysFromToday, formatDate, formatMoney } from "../../data";

const payroll = { amount: 48200, people: 18, day: daysFromToday(2) };
const hours = { total: "1,284 h", capacity: 86 };

/** Stand out in a hue: a time-sensitive widget on Solid Yellow. */
export default function PayrollStandOut() {
  const { toast } = useToast();
  const [approved, setApproved] = useState(false);
  const payrollId = useId();
  const hoursId = useId();
  const approve = () => {
    setApproved(true);
    toast({ type: "positive", title: "Payroll approved", children: `${formatMoney(payroll.amount)} to ${plural(payroll.people, "person", "people")}`, action: { label: "Undo", onClick: () => setApproved(false) } });
  };
  return (
    <Grid minColumnWidth={220} gap="md">
      {/* The time-sensitive widget stands out in a hue: Solid Yellow keeps neutral content and a neutral Primary button. */}
      <Card as="section" theme="solid" color="yellow" aria-labelledby={payrollId}>
        <Stack gap="md">
          <Stack gap="xs" align="start">
            <Heading level={4} id={payrollId} textStyle="Heading/Subheading">Next payout</Heading>
            <Text as="span" textStyle="Heading/2">{formatMoney(payroll.amount)}</Text>
            <Text as="span" role="status" textStyle="Body/Small/Regular" tone="base">
              {approved ? `Approved · pays ${formatDate(payroll.day)}` : `${formatDate(payroll.day)} · ${plural(payroll.people, "person", "people")}`}
            </Text>
          </Stack>
          <Stack align="start">
            <Button level="primary" size="sm" disabled={approved} onClick={approve}>Approve payroll</Button>
          </Stack>
        </Stack>
      </Card>
      <Card as="section" theme="default" aria-labelledby={hoursId}>
        <Stack gap="md">
          <Stack gap="xs" align="start">
            <Heading level={4} id={hoursId} textStyle="Heading/Subheading">Hours this week</Heading>
            <Text as="span" textStyle="Heading/2">{hours.total}</Text>
            <Text as="span" textStyle="Body/Small/Regular" tone="base">Across 6 projects</Text>
          </Stack>
          <ProgressBar value={86} label layout="stacked" valueLabel="86% of capacity" aria-label="Hours of capacity" />
        </Stack>
      </Card>
    </Grid>
  );
}

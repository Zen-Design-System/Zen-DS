import { useRef, useState } from "react";
import { Button, Card, DescriptionList, Form, FormActions, Heading, Segmented, Stack, Text, plural, useToast } from "@zen-ds/react";
import { daysFromToday, formatDate, formatMoney, plans, studio, workspacePlan } from "../../data";

type Billing = "monthly" | "yearly";
// The studio's plan, from the shared price list: Business, 48 seats, billed monthly today.
const plan = plans.find((item) => item.id === workspacePlan.plan)!;
const seats = workspacePlan.seats;
const seatPrice: Record<Billing, number> = { monthly: plan.seatMonthly, yearly: plan.seatYearly };
const renewal = daysFromToday(30);

export default function BillingPeriod() {
  const { toast } = useToast();
  const [billing, setBilling] = useState<Billing>(workspacePlan.billing);
  const [period, setPeriod] = useState<Billing>(workspacePlan.billing);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const per = period === "monthly" ? "a month" : "a year";
  const saving = seatPrice.monthly * 12 * seats - seatPrice.yearly * seats;
  // The switch previews the price; the submit commits it. Focus then lands on the line that confirms it.
  const switchTo = (next: Billing, previous: Billing) => {
    setBilling(next);
    setPeriod(next);
    setTimeout(() => statusRef.current?.focus());
    toast({ type: "positive", title: "Billing period changed", action: { label: "Undo", onClick: () => { setBilling(previous); setPeriod(previous); } } });
  };
  return (
    <Stack><Card theme="default" width="fill" maxWidth={440} alignSelf="center">
      <Form onSubmit={() => switchTo(period, billing)} gap="md">
        <Stack gap="xs">
          <Heading level={4} textStyle="Heading/Subheading">{`${plan.name} plan`}</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">{`${studio.workspace} · ${plural(seats, "seat")}`}</Text>
        </Stack>
        {/* Secondary: the form's submit is this card's one Primary; the switch only previews the price. */}
        <Stack align="start">
          <Segmented level="secondary" aria-label="Billing period" value={period} onValueChange={(id) => setPeriod(id as Billing)} options={[
            { id: "monthly", label: "Monthly" },
            { id: "yearly", label: "Yearly" },
          ]} />
        </Stack>
        <DescriptionList items={[
          { term: "Per seat", description: `${formatMoney(seatPrice[period], true)} ${per}` },
          { term: "Seats", description: String(seats) },
          ...(period === "yearly" ? [{ term: "You save", description: `${formatMoney(saving, true)} a year` }] : []),
          { term: "Total", description: `${formatMoney(seatPrice[period] * seats, true)} ${per}`, emphasis: true },
        ]} />
        <Text ref={statusRef} tabIndex={-1} role="status" textStyle="Body/Small/Regular" tone="base">
          {period === billing ? `Billed ${billing}. Renews ${formatDate(renewal)}.` : `Billed ${period} from ${formatDate(renewal)}.`}
        </Text>
        {/* The actions appear once the preview differs from the plan: Cancel goes back, the submit commits. */}
        {period !== billing ? (
          <FormActions>
            <Button level="tertiary" onClick={() => { setPeriod(billing); statusRef.current?.focus(); }}>Cancel</Button>
            <Button level="primary" type="submit">{`Switch to ${period}`}</Button>
          </FormActions>
        ) : null}
      </Form>
    </Card></Stack>
  );
}

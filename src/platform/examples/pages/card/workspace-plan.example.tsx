import { useId, useState } from "react";
import { Badge, Button, Card, Dialog, Grid, Heading, Icon, ModalForm, NumberField, Segmented, Stack, Text, plural, useToast } from "@zen-ds/react";
import { daysFromToday, formatDate, formatMoney, plans, workspacePlan, type Plan, type PlanId } from "../../data";

// The shared price list (plans): Starter free · Team $12 · Business $24 per seat a month, 20% off yearly. The studio is
// on Business with 48 seats. Team stops at 20 members, so Business is the plan that fits a team of 48: the recommended one.
const planDetails: Record<PlanId, { features: string[]; seatLimit?: number }> = {
  starter: { features: ["Up to 3 members", "3 active projects", "5 GB of files"], seatLimit: 3 },
  team: { features: ["Up to 20 members", "Unlimited projects", "Client guests", "100 GB of files"], seatLimit: 20 },
  business: { features: ["Unlimited members", "Invoices and time off", "Single sign-on", "1 TB of files"] },
};
const teamSize = workspacePlan.seats;
/** The cheapest plan whose member limit holds the whole team. */
const recommended = plans.find((plan) => (planDetails[plan.id].seatLimit ?? Infinity) >= teamSize)!.id;
const nextInvoice = formatDate(daysFromToday(30));

/** Workspace plan: Active marks the current plan, an Accent Badge the one that fits the team. */
export default function WorkspacePlan() {
  const { toast } = useToast();
  const [period, setPeriod] = useState<"monthly" | "yearly">(workspacePlan.billing);
  const [current, setCurrent] = useState<PlanId>(workspacePlan.plan);
  const [seats, setSeats] = useState(workspacePlan.seats);
  const [draftSeats, setDraftSeats] = useState<number | null>(workspacePlan.seats);
  const [seatError, setSeatError] = useState<string>();
  const [switching, setSwitching] = useState<Plan | null>(null);
  const [managing, setManaging] = useState(false);
  const price = (plan: Plan) => (period === "monthly" ? plan.seatMonthly : plan.seatYearly);
  const per = period === "monthly" ? "a month" : "a year";
  const currentPlan = plans.find((plan) => plan.id === current)!;
  const limitOf = (plan: Plan) => planDetails[plan.id].seatLimit;
  const lostSeats = switching && limitOf(switching) ? Math.max(0, seats - limitOf(switching)!) : 0;
  const baseId = useId();
  const manage = () => { setDraftSeats(seats); setSeatError(undefined); setManaging(true); };
  // A blocked submit keeps the form open with the error on the field; ModalForm moves focus to it.
  const updateSeats = () => {
    const limit = limitOf(currentPlan);
    const problem = !draftSeats ? "Enter at least 1 seat." : limit && draftSeats > limit ? `${currentPlan.name} includes up to ${plural(limit, "member")}.` : undefined;
    if (problem) { setSeatError(problem); return; }
    const before = seats;
    setSeats(draftSeats!);
    setManaging(false);
    toast({ title: "Seats updated", children: `${plural(draftSeats!, "seat")} from ${nextInvoice}`, action: { label: "Undo", onClick: () => setSeats(before) } });
  };
  const switchPlan = () => {
    if (!switching) return;
    setCurrent(switching.id);
    if (lostSeats) setSeats(limitOf(switching)!);
    setSwitching(null);
    toast({ type: "positive", title: `Plan changed to ${switching.name}` });
  };
  const cta = (plan: Plan) => {
    if (plan.id === current) return <Button level="tertiary" onClick={manage}>Manage plan</Button>;
    const upgrade = price(plan) > price(currentPlan);
    return (
      <Button level={plan.id === recommended ? "primary" : "tertiary"} onClick={() => setSwitching(plan)}>
        {upgrade ? `Upgrade to ${plan.name}` : `Switch to ${plan.name}`}
      </Button>
    );
  };
  return (
    <Stack gap="md">
      <Stack direction="row" gap="xs" align="center" wrap>
        <Segmented aria-label="Billing period" value={period} onValueChange={(value) => setPeriod(value as "monthly" | "yearly")}
          options={[{ id: "monthly", label: "Monthly" }, { id: "yearly", label: "Yearly" }]} />
        <Text as="span" textStyle="Body/Small/Regular" tone="base">Yearly billing saves 20%</Text>
      </Stack>
      <Grid columns={{ mobile: 1, desktop: 3 }} stackBelow={640}>
        {plans.map((plan) => {
          const titleId = `${baseId}-${plan.id}`;
          return (
            <Card key={plan.id} as="section" theme="default" selected={plan.id === current} aria-labelledby={titleId}>
              {/* The plan fills the card (Content-Slot column) and spaces its CTA to the foot, level across the row. */}
              <Stack gap="md" height="fill" justify="between">
                <Stack gap="md">
                  <Stack gap="xs">
                    {/* Every title row keeps the Badge's height (Badge/Size/Medium follows the density: 28, 32 at
                        Comfortable), so the prices line up across the row of cards. */}
                    <Stack direction="row" gap="2xs" align="center" style={{ minHeight: "var(--zen-badge-size-medium, 28px)" }}>
                      <Heading level={4} id={titleId} textStyle="Heading/Subheading">{plan.name}</Heading>
                      {plan.id === recommended ? <Badge theme="accent" background="subtle">Recommended</Badge> : null}
                    </Stack>
                    <Text textStyle="Body/Small/Regular" tone="base">{plan.summary}</Text>
                  </Stack>
                  <Stack gap="xs">
                    <Stack direction="row" gap="2xs" align="baseline">
                      <Text as="span" textStyle="Heading/2">{price(plan) ? formatMoney(price(plan)) : "Free"}</Text>
                      {price(plan) ? <Text as="span" textStyle="Body/Small/Regular" tone="base">{`per seat ${per}`}</Text> : null}
                    </Stack>
                    <Text as="span" textStyle="Caption/Regular" tone="light">
                      {plan.id === current ? `Your plan · ${plural(seats, "seat")}` : !price(plan) ? "No card needed" : `Billed ${period}`}
                    </Text>
                  </Stack>
                  <Stack as="ul" gap="xs" aria-label={`${plan.name} includes`}>
                    {planDetails[plan.id].features.map((feature) => (
                      <Stack as="li" key={feature} direction="row" gap="2xs">
                        <Icon name="icon-check-line" size="sm" decorative />
                        <Text as="span" textStyle="Body/Small/Regular">{feature}</Text>
                      </Stack>
                    ))}
                  </Stack>
                </Stack>
                <Stack>{cta(plan)}</Stack>
              </Stack>
            </Card>
          );
        })}
      </Grid>
      {/* Members lose access on a smaller plan, so the switch asks first and says who is affected. */}
      <Dialog open={Boolean(switching)} onOpenChange={(open) => { if (!open) setSwitching(null); }}
        theme={lostSeats ? "warning" : "default"} icon={lostSeats ? true : false}
        title={switching ? (price(switching) > price(currentPlan) ? `Upgrade to ${switching.name}?` : `Switch to ${switching.name}?`) : ""}
        description={switching ? (lostSeats
          ? `${switching.name} includes up to ${plural(limitOf(switching)!, "member")}. ${plural(lostSeats, "member")} lose access on ${nextInvoice}.`
          : `${plural(seats, "seat")} at ${formatMoney(price(switching), true)} a seat: ${formatMoney(price(switching) * seats, true)} ${per} from ${nextInvoice}.`) : undefined}
        primaryAction={{ label: switching && price(switching) > price(currentPlan) ? "Upgrade plan" : "Switch plan", onClick: switchPlan }}
        secondaryAction={{ label: "Cancel" }} />
      <ModalForm open={managing} onOpenChange={setManaging} title={`Manage ${currentPlan.name} plan`}
        description={`Your next invoice is on ${nextInvoice}.`} onSubmit={updateSeats}
        primaryAction={{ label: "Update seats" }} secondaryAction={{ label: "Cancel" }}>
        <NumberField label="Seats" min={1} value={draftSeats} error={seatError}
          onValueChange={(value) => { setDraftSeats(value); setSeatError(undefined); }}
          helpText={draftSeats && price(currentPlan) ? `${formatMoney(price(currentPlan) * draftSeats, true)} ${per}` : undefined} />
      </ModalForm>
    </Stack>
  );
}

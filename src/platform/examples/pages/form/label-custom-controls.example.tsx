import { useId, useRef, useState, type Ref } from "react";
import { Button, Card, Checkbox, Form, FormActions, FormField, FormFieldset, Heading, RadioButton, Slider, Stack, Text, useFormState, useToast } from "@zen-ds/react";
import { formatMoney, people, projectById, type PersonId } from "../../data";

/** A network round trip in the demo. */
const wait = (ms: number) => new Promise<void>((resolve) => { setTimeout(resolve, ms); });

/** A card's header: its title (Heading/Subheading, h4 under the example's h3) and one supporting line (xs below). `ref`
 *  lets the title take the focus. */
function CardHeader({ id, title, ref, children }: { id: string; title: string; ref?: Ref<HTMLHeadingElement>; children: string }) {
  return (
    <Stack gap="xs">
      <Stack direction="row" gap="2xs" align="center" wrap>
        <Heading ref={ref} tabIndex={ref ? -1 : undefined} level={4} id={id} textStyle="Heading/Subheading">{title}</Heading>
      </Stack>
      <Text textStyle="Body/Small/Regular" tone="base">{children}</Text>
    </Stack>
  );
}

type AlertValues = { threshold: number; recipients: PersonId[]; repeat: "once" | "weekly" };
const lumen = projectById("lumen-banking");
const recipientIds: PersonId[] = ["alex", "hana", "mai", "finn"];
const savedAlerts: AlertValues = { threshold: 80, recipients: ["alex", "mai"], repeat: "once" };
const namesOf = (ids: PersonId[]) => {
  const names = ids.map((id) => people[id].name);
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : names[0] ?? "";
};

export default function BudgetAlerts() {
  const { toast } = useToast();
  const titleId = useId();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [saved, setSaved] = useState(savedAlerts);
  const form = useFormState<AlertValues>({
    initialValues: savedAlerts,
    validate: (values) => ({
      threshold: values.threshold >= 100 ? "Set it below 100%, so there's time to act" : undefined,
      recipients: values.recipients.length ? undefined : "Choose at least one person",
    }),
    onSubmit: async (values, { reset }) => {
      await wait(600);
      setSaved(values);
      reset(values);
      toast({ type: "positive", title: "Budget alerts saved" });
    },
  });
  const { threshold, recipients } = form.values;
  // Undo changes goes back to the saved alerts and leaves with the edits, so focus moves to the top of the form.
  const undo = () => { form.reset(); setTimeout(() => titleRef.current?.focus()); };
  const pick = (id: PersonId, on: boolean) => form.setValue("recipients", on ? recipientIds.filter((x) => x === id || recipients.includes(x)) : recipients.filter((x) => x !== id), { touch: true });
  return (
    <Card as="section" theme="default" aria-labelledby={titleId} surface="default">
      <Stack gap="md">
        <CardHeader ref={titleRef} id={titleId} title="Budget alerts">
          {`${lumen.name} · ${namesOf(saved.recipients)} hear when spending passes ${saved.threshold}%.`}
        </CardHeader>
        <Form form={form} gap="md">
          {/* Slider has no label or error of its own: FormField adds both and names it through aria-labelledby. */}
          <FormField label="Alert at" error={form.fieldError("threshold")}
            helpText={`${threshold}% of ${formatMoney(lumen.budget)}, at ${formatMoney((lumen.budget * threshold) / 100)}`}>
            <Slider min={50} max={100} step={5} icon="icon-bell-01-solid" value={threshold}
              onValueChange={(value) => form.setValue("threshold", value, { touch: true })} valueText={(value) => `${value}% of the budget`} />
          </FormField>
          <FormFieldset kind="checkbox" legend="Send the alert to" error={form.fieldError("recipients")}>
            {recipientIds.map((id) => (
              <Checkbox key={id} label={people[id].name} caption={people[id].role} checked={recipients.includes(id)} onCheckedChange={(on) => pick(id, on)} />
            ))}
          </FormFieldset>
          <FormFieldset kind="radio" legend="Repeat">
            <RadioButton label="Once" caption="When spending first passes the line" {...form.radioField("repeat", "once")} />
            <RadioButton label="Every Monday" caption="While spending stays above it" {...form.radioField("repeat", "weekly")} />
          </FormFieldset>
          {/* Undo changes appears once something differs from the saved alerts: at rest there is nothing to undo. */}
          <FormActions>
            {form.isDirty ? <Button level="tertiary" disabled={form.isSubmitting} onClick={undo}>Undo changes</Button> : null}
            <Button level="primary" type="submit">{form.isSubmitting ? "Saving…" : "Save alerts"}</Button>
          </FormActions>
        </Form>
      </Stack>
    </Card>
  );
}

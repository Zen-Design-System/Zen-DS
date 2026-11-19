import { useId, useRef, useState } from "react";
import { Button, Card, DescriptionList, Form, FormActions, Heading, NumberField, Slider, Stack, Text, useToast } from "@zen-ds/react";
import { formatMoney, people, projectById } from "../../data";

export default function BudgetAlert() {
  const { toast } = useToast();
  const labelId = useId();
  const project = projectById("lumen-banking");
  const [saved, setSaved] = useState(80);
  const [threshold, setThreshold] = useState(saved);
  const changed = threshold !== saved;
  const alertAt = Math.round((project.budget * threshold) / 100);
  const fieldRef = useRef<HTMLInputElement>(null);
  // Both actions disable themselves once used: focus goes to the number field under the slider (the same value), not
  // to the page.
  const toField = () => fieldRef.current?.focus();
  const save = () => { toField(); setSaved(threshold); toast({ type: "positive", title: "Budget alert saved" }); };
  const cancel = () => { toField(); setThreshold(saved); };
  return (
    <Stack><Card theme="default" width="fill" maxWidth={440} alignSelf="center">
      <Form onSubmit={save} gap="md">
        <Stack gap="xs">
          <Heading level={4} textStyle="Heading/Subheading">Budget alert</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">{project.name} · {project.client}</Text>
        </Stack>
        <Stack gap="xs">
          <Text as="span" id={labelId} textStyle="Body/Small/Bold">Share of the budget</Text>
          {/* The slider gets close by feel, the number field types the exact percentage: both edit one value. */}
          <Stack gap="xs" align="center">
            <Slider aria-labelledby={labelId} min={50} max={100} value={threshold} onValueChange={setThreshold}
              icon="icon-bell-01-solid" valueText={(value) => `${value}% of the budget`} />
            <Stack direction="row" fillChildren width="fill">
              <NumberField ref={fieldRef} aria-label="Share of the budget, percent" min={50} max={100}
                value={threshold} onValueChange={(value) => { if (value !== null) setThreshold(value); }} trailing="%" align="center" />
            </Stack>
          </Stack>
        </Stack>
        <DescriptionList items={[
          { term: "Budget", description: formatMoney(project.budget) },
          { term: "Spent so far", description: `${formatMoney(project.spent)} (${Math.round((project.spent / project.budget) * 100)}%)` },
          { term: "Alert at", description: formatMoney(alertAt) },
        ]} />
        <Text textStyle="Body/Small/Regular" tone="base">You and {people.duy.name} get an email when the spend passes {formatMoney(alertAt)}.</Text>
        {/* Both actions wait for a change. */}
        <FormActions>
          <Button level="tertiary" disabled={!changed} onClick={cancel}>Cancel</Button>
          <Button level="primary" type="submit" disabled={!changed}>Save alert</Button>
        </FormActions>
      </Form>
    </Card></Stack>
  );
}

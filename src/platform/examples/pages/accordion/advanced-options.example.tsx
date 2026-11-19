import { useId, useState } from "react";
import { Accordion, Button, Card, Form, FormActions, Heading, InputField, SelectField, Stack, useToast } from "@zen-ds/react";
import { projects, tasks } from "../../data";

const clientOptions = [...new Set(projects.map((project) => project.client))].map((client) => ({ label: client, value: client }));
/** Task-key prefixes already in use (PHIN-214, LUM-088…). */
const takenKeys = [...new Set(tasks.map((task) => task.key.split("-")[0]))];

/** Optional fields fold away in a form; a field with an error never stays hidden in a closed panel. */
export default function AdvancedOptions() {
  const { toast } = useToast();
  const titleId = useId();
  const [name, setName] = useState("");
  const [client, setClient] = useState("Saola Outdoor");
  const [key, setKey] = useState("");
  const [budget, setBudget] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; key?: string }>({});
  const keyError = (value: string) => {
    if (!value) return undefined;
    if (!/^[A-Z]{2,5}$/.test(value)) return "Use 2–5 capital letters, like TRL";
    return takenKeys.includes(value) ? `${value} is already used by another project` : undefined;
  };
  const submit = () => {
    const next = { name: name.trim() ? undefined : "Enter a project name", key: keyError(key) };
    setErrors(next);
    // Form focuses the first invalid field once this renders, so the panel holding it opens first.
    if (next.key) setAdvanced(true);
    if (next.name || next.key) return;
    toast({ type: "positive", title: "Project created", children: `${name.trim()} for ${client}` });
    setName(""); setKey(""); setBudget(""); setAdvanced(false);
  };
  return (
    <Card theme="default">
      <Form onSubmit={submit} gap="md" aria-labelledby={titleId} noValidate>
        <Heading level={4} id={titleId} textStyle="Heading/Subheading">New project</Heading>
        <InputField label="Project name" value={name} onValueChange={setName} error={errors.name} />
        <SelectField label="Client" options={clientOptions} value={client} onValueChange={setClient} />
        <Accordion headingLevel={5} title="Advanced options" expanded={advanced} onExpandedChange={setAdvanced} defaultExpanded>
          <Stack gap="md">
            <InputField label="Project key" labelOptional value={key} onValueChange={(value) => setKey(value.toUpperCase())} error={errors.key}
              helpText="Starts every task key, like TRL-12" />
            <InputField label="Budget (USD)" labelOptional inputMode="numeric" value={budget} onValueChange={setBudget} />
          </Stack>
        </Accordion>
        <FormActions><Button level="primary" type="submit">Create project</Button></FormActions>
      </Form>
    </Card>
  );
}

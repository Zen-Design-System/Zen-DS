import { useState } from "react";
import { Button, Card, Chip, Form, FormActions, FormFieldset, Heading, Stack, Text, plural, useToast } from "@zen-ds/react";

const topics = ["Design reviews", "Client feedback", "Invoices", "Leave requests", "New hires", "Releases", "Studio events"];

/** A weekly digest's topics: Normal chips as on/off toggles, at least one required. */
export default function DigestTopics() {
  const { toast } = useToast();
  const [picked, setPicked] = useState<string[]>(["Design reviews", "Client feedback", "Releases"]);
  const [error, setError] = useState("");
  const toggle = (topic: string) => {
    setPicked((list) => list.includes(topic) ? list.filter((item) => item !== topic) : [...list, topic]);
    setError("");
  };
  // Save stays enabled: with nothing picked, the group shows the error and Form moves focus to its first chip.
  const save = () => {
    if (!picked.length) { setError("Pick at least one topic"); return; }
    toast({ type: "positive", title: "Digest saved" });
  };
  return (
    <Stack><Card theme="default" width="fill" maxWidth={440} alignSelf="center">
      <Form onSubmit={save} gap="md">
        <Stack gap="xs">
          <Heading level={4} textStyle="Heading/Subheading">Weekly digest</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">Arrives every Monday at 8:00 am.</Text>
        </Stack>
        {/* Normal chips are toggles. Several topics can be on, so the group is Secondary (Selected = a 2px dark outline) with
            aria-pressed; one Stack holds the chips at Gap/XSmall (8px). */}
        <FormFieldset legend="Topics" error={error || undefined}
          helpText={picked.length ? `${plural(picked.length, "topic")} selected` : undefined}>
          <Stack direction="row" gap="xs" wrap>
            {topics.map((topic) => (
              <Chip key={topic} variant="normal" level="secondary" selected={picked.includes(topic)} onClick={() => toggle(topic)} size="sm">
                {topic}
              </Chip>
            ))}
          </Stack>
        </FormFieldset>
        <FormActions>
          <Button level="primary" type="submit">Save digest</Button>
        </FormActions>
      </Form>
    </Card></Stack>
  );
}

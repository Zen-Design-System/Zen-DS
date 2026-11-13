import { useId, useRef, useState } from "react";
import { Badge, Card, Chip, Heading, Stack, Text, useToast, type BadgeTheme } from "@zen-ds/react";
import { projectById, tasks } from "../../data";

type Label = { id: string; name: string; theme: BadgeTheme };

const labelSet: Label[] = [
  { id: "ios", name: "iOS", theme: "blue" },
  { id: "android", name: "Android", theme: "green" },
  { id: "rewards", name: "Rewards", theme: "orange" },
  { id: "copy", name: "Needs copy", theme: "yellow" },
  { id: "a11y", name: "Accessibility", theme: "purple" },
];
const task = tasks[0];

export default function RemovableLabels() {
  const { toast } = useToast();
  const labelsId = useId();
  const [labels, setLabels] = useState(labelSet);
  const [applied, setApplied] = useState(["ios", "rewards", "copy"]);
  const [query, setQuery] = useState("");
  const addRef = useRef<HTMLButtonElement>(null);
  const available = labels.filter((label) => !applied.includes(label.id));
  const remove = (label: Label) => {
    const before = applied;
    setApplied(before.filter((id) => id !== label.id));
    toast({ title: `${label.name} label removed`, action: { label: "Undo", onClick: () => setApplied(before) } });
    // The badge and its button are gone: focus moves to Add label, which stays.
    setTimeout(() => addRef.current?.focus());
  };
  const create = (name: string) => {
    const id = `label-${labels.length + 1}`;
    setLabels((all) => [...all, { id, name, theme: "neutral" }]);
    setApplied((ids) => [...ids, id]);
    setQuery("");
  };
  return (
    <Card theme="default">
      <Stack gap="md" align="stretch">
        <Stack gap="xs" align="stretch">
          <Heading level={4} textStyle="Heading/Subheading">{task.title}</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">{`${task.key} · ${projectById(task.project).name}`}</Text>
        </Stack>
        <Stack as="section" gap="xs" align="stretch" aria-labelledby={labelsId}>
          <Heading level={5} id={labelsId} textStyle="Body/Small/Bold" tone="light">Labels</Heading>
          <Stack direction="row" gap="xs" align="center" wrap>
            {/* The applied labels are a list; each Remove button is named after its label ("Remove iOS"). */}
            {applied.length ? (
              <Stack as="ul" direction="row" gap="2xs" align="center" wrap aria-labelledby={labelsId}>
                <Chip ref={addRef} variant="advanced" dropdown leading="icon-plus-line" popoverLabel="Add a label or create one"
                  popoverItems={available.map((label) => ({ id: label.id, label: label.name }))}
                  popoverSearchValue={query} onPopoverSearchChange={setQuery} popoverSearchPlaceholder="Label name"
                  onPopoverSelect={(item) => { setApplied((ids) => [...ids, item.id]); setQuery(""); }} onPopoverCreate={create}>Add label</Chip>
                {labels.filter((label) => applied.includes(label.id)).map((label) => (
                  <li key={label.id}><Badge theme={label.theme} background="subtle" leadingIcon={false} remove onRemove={() => remove(label)}>{label.name}</Badge></li>
                ))}
              </Stack>
            ) : <Text as="span" textStyle="Body/Small/Regular" tone="base">No labels yet</Text>}
          </Stack>
        </Stack>
      </Stack>
    </Card>
  );
}

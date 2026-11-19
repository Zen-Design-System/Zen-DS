import { useRef, useState } from "react";
import { Card, Chip, Heading, Stack, Tag, Text } from "@zen-ds/react";
import { formatDue, tasks } from "../../data";

const toggleIn = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

/** Labels are an open set: the Chip's Popover offers Manual-Add-New, and Enter creates and selects a new label. */
export default function CreateLabel() {
  const task = tasks[2];
  const [labels, setLabels] = useState(["Accessibility", "Android", "Copy", "iOS", "Motion", "Research"]);
  const [picked, setPicked] = useState<string[]>(["Android"]);
  // Manual-Add-New reads the typed value, so the search is controlled.
  const [query, setQuery] = useState("");
  const chipRef = useRef<HTMLButtonElement>(null);
  // A removed Tag takes its Remove button with it: focus moves to the Labels chip.
  const unpick = (label: string) => {
    setPicked((current) => toggleIn(current, label));
    setTimeout(() => chipRef.current?.focus());
  };
  return (
    <Card theme="default" width="fill">
      <Stack gap="md">
        <Stack gap="xs">
          <Heading level={4} textStyle="Heading/Subheading">{task.title}</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">{`${task.key} · ${formatDue(task.due)}`}</Text>
        </Stack>
        <Stack direction="row" align="center" gap="xs" wrap>
          <Chip ref={chipRef} variant="advanced" dropdown leading="icon-tag-line" popoverMultiple
            popoverLabel="Select a label or create one" popoverSearchPlaceholder="Find or create a label"
            popoverSearchValue={query} onPopoverSearchChange={setQuery}
            popoverItems={labels.map((label) => ({ id: label, label, selected: picked.includes(label) }))}
            onPopoverSelect={(item) => setPicked((current) => toggleIn(current, item.id))}
            onPopoverCreate={(value) => { setLabels((current) => [...current, value]); setPicked((current) => [...current, value]); setQuery(""); }}>
            Labels
          </Chip>
          {picked.map((label) => (
            <Tag key={label} remove onRemove={() => unpick(label)}>{label}</Tag>
          ))}
        </Stack>
      </Stack>
    </Card>
  );
}
